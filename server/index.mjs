/** Optional same-origin Player Maps service. No external runtime dependencies.
 * Public deployment requires HTTPS, persistent storage, backups and moderation.
 */
import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,randomUUID,createHash,scrypt as rawScrypt,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {mkdirSync} from 'node:fs';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Worker} from 'node:worker_threads';
import {sanitizeMap,mapRank,MAP_ENGINE} from '../src/maps.js';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const scrypt=promisify(rawScrypt);
const digest=s=>createHash('sha256').update(s).digest('hex');
const fail=(status,message)=>Object.assign(new Error(message),{status});
export function openDatabase(file){
 if(file!==':memory:')mkdirSync(path.dirname(file),{recursive:true});
 const db=new DatabaseSync(file);db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,username TEXT NOT NULL COLLATE NOCASE UNIQUE,salt TEXT NOT NULL,password TEXT NOT NULL,created INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires INTEGER NOT NULL,created INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS maps(id TEXT PRIMARY KEY,author_id TEXT NOT NULL REFERENCES users(id),digest TEXT NOT NULL,title TEXT NOT NULL,description TEXT NOT NULL,scene INTEGER NOT NULL,length INTEGER NOT NULL,speed INTEGER NOT NULL,data TEXT NOT NULL,proof TEXT NOT NULL,created INTEGER NOT NULL,likes INTEGER NOT NULL DEFAULT 0,dislikes INTEGER NOT NULL DEFAULT 0,rank REAL NOT NULL DEFAULT 0,hidden INTEGER NOT NULL DEFAULT 0,UNIQUE(author_id,digest));
 CREATE TABLE IF NOT EXISTS votes(map_id TEXT NOT NULL REFERENCES maps(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,value INTEGER NOT NULL CHECK(value IN (-1,1)),PRIMARY KEY(map_id,user_id));
 CREATE TABLE IF NOT EXISTS reports(map_id TEXT NOT NULL REFERENCES maps(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,reason TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(map_id,user_id));
 CREATE INDEX IF NOT EXISTS maps_rank ON maps(hidden,rank DESC,created DESC);
 CREATE INDEX IF NOT EXISTS sessions_expire ON sessions(expires);
 PRAGMA user_version=1;`);return db;
}
function replayCheck(map,proof){return new Promise((resolve,reject)=>{
 const w=new Worker(new URL('./verify-worker.mjs',import.meta.url),{workerData:{map,proof},resourceLimits:{maxOldGenerationSizeMb:64}});
 const t=setTimeout(()=>{w.terminate();reject(fail(422,'تجاوز التحقق المهلة؛ أعد الاختبار.'));},4000);
 w.once('message',m=>{clearTimeout(t);w.terminate();m.ok?resolve(m.result):reject(fail(422,m.error));});w.once('error',()=>{clearTimeout(t);reject(fail(422,'فشل التحقق من تسجيل الاجتياز.'));});
});}
export function createCommunityServer({dbPath=path.join(ROOT,'data/community.sqlite'),staticRoot=path.join(ROOT,'dist'),publicOrigin='',rateLimits=true}={}){
 const db=openDatabase(dbPath),limits=new Map();let inflightAuth=0,inflightVerify=0;
 const configured=publicOrigin?new URL(publicOrigin):null;
 if(configured&&configured.protocol!=='https:'&&!['localhost','127.0.0.1','[::1]'].includes(configured.hostname))throw Error('PUBLIC_ORIGIN must use HTTPS outside localhost');
 function rate(key,max,ms){
  if(!rateLimits)return;const now=Date.now();let bucket=limits.get(key);if(!bucket||bucket.until<now){bucket={count:0,until:now+ms};limits.set(key,bucket);}bucket.count++;if(limits.size>10000){for(const [k,v] of limits)if(v.until<now)limits.delete(k);if(limits.size>10000)throw fail(503,'الخدمة مشغولة.');}if(bucket.count>max)throw fail(429,'طلبات كثيرة. حاول لاحقًا.');
 }
 function current(req){const token=(req.headers.cookie||'').match(/(?:^|;\s*)ss_session=([a-f0-9]{64})(?:;|$)/)?.[1];if(!token)return null;return db.prepare('SELECT u.id,u.username FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires>?').get(digest(token),Date.now())||null;}
 function requireUser(req){const u=current(req);if(!u)throw fail(401,'سجّل الدخول أولًا.');return u;}
 function visible(id){const m=db.prepare('SELECT * FROM maps WHERE id=? AND hidden=0').get(id);if(!m)throw fail(404,'المرحلة غير متاحة.');return m;}
 function sessionCookie(res,user){
  const token=randomBytes(32).toString('hex'),now=Date.now();
  db.prepare('DELETE FROM sessions WHERE expires<?').run(now);
  db.prepare('DELETE FROM sessions WHERE user_id=? AND token NOT IN (SELECT token FROM sessions WHERE user_id=? ORDER BY created DESC LIMIT 11)').run(user.id,user.id);
  db.prepare('INSERT INTO sessions(token,user_id,expires,created) VALUES(?,?,?,?)').run(digest(token),user.id,now+30*86400000,now);
  res.setHeader('Set-Cookie',`ss_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000${configured?.protocol==='https:'?'; Secure':''}`);
 }
 function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
 async function body(req){
  if(!String(req.headers['content-type']||'').startsWith('application/json'))throw fail(415,'أرسل JSON فقط.');
  let total=0,chunks=[];for await(const chunk of req){total+=chunk.length;if(total>262144)throw fail(413,'الطلب أكبر من الحد المسموح.');chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw fail(400,'JSON غير صالح.');}
 }
 const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');
  const ip=req.socket.remoteAddress||'unknown';
  try{
   const host=req.headers.host||'localhost';if(!/^[a-zA-Z0-9.:[\]-]+$/.test(host))throw fail(400,'Host غير صالح.');
   const origin=configured?.origin||`http://${host}`;
   if(configured&&host!==configured.host)throw fail(403,'Host غير مسموح.');
   if(!configured&&!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host))throw fail(403,'اضبط PUBLIC_ORIGIN قبل النشر.');
   const url=new URL(req.url,origin),p=url.pathname;
   if(p.startsWith('/api/')){
    rate('all:'+ip,240,60000);
    if(!['GET','HEAD'].includes(req.method)&&req.headers.origin!==origin)throw fail(403,'Origin غير مسموح.');
    if(p==='/api/v1/session'&&req.method==='GET'){return json(res,200,{engine:MAP_ENGINE,user:current(req)});}
    if(['/api/v1/register','/api/v1/login'].includes(p)&&req.method==='POST'){
     rate('auth:'+ip,20,3600000);if(inflightAuth>=4)throw fail(503,'المصادقة مشغولة.');
     const b=await body(req),username=typeof b.username==='string'?b.username.trim():'',password=b.password;
     if(!/^[A-Za-z0-9_]{3,24}$/.test(username)||typeof password!=='string'||password.length<12||password.length>128)throw fail(400,'اسم من 3–24 حرفًا لاتينيًا أو رقمًا، وكلمة مرور من 12–128 حرفًا.');
     const isNew=p.endsWith('register');if(isNew)rate('signup:'+ip,5,86400000);
     inflightAuth++;
     try{
      let user=db.prepare('SELECT * FROM users WHERE username=? COLLATE NOCASE').get(username);
      if(isNew){
       if(user)throw fail(409,'اسم المستخدم غير متاح.');
       const salt=randomBytes(16).toString('hex'),pw=Buffer.from(await scrypt(password,salt,64)).toString('hex');
       user={id:randomUUID(),username};
       try{db.prepare('INSERT INTO users(id,username,salt,password,created) VALUES(?,?,?,?,?)').run(user.id,username,salt,pw,Date.now());}catch{throw fail(409,'اسم المستخدم غير متاح.');}
      }else{
       const computed=Buffer.from(await scrypt(password,user?.salt||'nonexistent-dummy-salt',64));
       if(!user||!timingSafeEqual(computed,Buffer.from(user.password,'hex')))throw fail(401,'بيانات الدخول غير صحيحة.');
      }
      sessionCookie(res,user);return json(res,isNew?201:200,{user:{id:user.id,username:user.username}});
     }finally{inflightAuth--;}
    }
    if(p==='/api/v1/logout'&&req.method==='POST'){
     await body(req);const token=(req.headers.cookie||'').match(/ss_session=([a-f0-9]{64})/)?.[1];if(token)db.prepare('DELETE FROM sessions WHERE token=?').run(digest(token));res.setHeader('Set-Cookie',`ss_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${configured?.protocol==='https:'?'; Secure':''}`);return json(res,200,{ok:true});
    }
    if(p==='/api/v1/maps'&&req.method==='GET'){
     const user=current(req),page=Math.max(0,Math.min(1000,parseInt(url.searchParams.get('page'))||0)),sort=url.searchParams.get('sort');
     const order=sort==='new'?'m.created DESC':sort==='likes'?'m.likes DESC,m.dislikes ASC,m.created DESC':'m.rank DESC,m.likes DESC,m.created DESC';
     const rows=db.prepare(`SELECT m.id,m.title,m.description,m.scene,m.length,m.speed,m.likes,m.dislikes,m.created,u.username AS author,m.author_id,COALESCE(v.value,0) AS myVote FROM maps m JOIN users u ON u.id=m.author_id LEFT JOIN votes v ON v.map_id=m.id AND v.user_id=? WHERE m.hidden=0 ORDER BY ${order} LIMIT 13 OFFSET ?`).all(user?.id||'',page*12);
     return json(res,200,{items:rows.slice(0,12).map(({author_id,...r})=>({...r,isMine:author_id===user?.id})),hasMore:rows.length>12,page});
    }
    if(p==='/api/v1/maps'&&req.method==='POST'){
     const user=requireUser(req);rate('publish:'+user.id,6,3600000);
     const b=await body(req);let map;try{map=sanitizeMap(b.map);}catch(e){throw fail(400,e.message);}
     if(!map.obstacles.length)throw fail(400,'أضف عقبة واحدة على الأقل.');
     if(db.prepare('SELECT COUNT(*) n FROM maps WHERE author_id=?').get(user.id).n>=150)throw fail(409,'بلغت حد النشر لهذا الحساب.');
     if(inflightVerify>=2)throw fail(503,'التحقق مشغول؛ حاول مرة أخرى.');
     inflightVerify++;try{await replayCheck(map,b.proof);}finally{inflightVerify--;}
     const data=JSON.stringify(map),sum=digest(data),existing=db.prepare('SELECT id FROM maps WHERE author_id=? AND digest=?').get(user.id,sum);
     if(existing)return json(res,200,{id:existing.id,existing:true});
     const id=randomUUID();
     db.prepare('INSERT INTO maps(id,author_id,digest,title,description,scene,length,speed,data,proof,created) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(id,user.id,sum,map.title,map.description,map.scene,map.length,map.speed,data,JSON.stringify(b.proof),Date.now());
     return json(res,201,{id});
    }
    const match=/^\/api\/v1\/maps\/([a-f0-9-]{36})(?:\/(vote|report))?$/.exec(p);
    if(match){const id=match[1],action=match[2],m=visible(id);
     if(!action&&req.method==='GET')return json(res,200,{id,map:JSON.parse(m.data)});
     if(action==='vote'&&req.method==='PUT'){
      const user=requireUser(req);rate('vote:'+user.id,60,60000);if(m.author_id===user.id)throw fail(403,'لا يمكنك التصويت على مرحلتك.');
      const {value}=await body(req);if(![-1,0,1].includes(value))throw fail(400,'تصويت غير صالح.');
      db.exec('BEGIN IMMEDIATE');try{
       if(value===0)db.prepare('DELETE FROM votes WHERE map_id=? AND user_id=?').run(id,user.id);
       else db.prepare('INSERT INTO votes(map_id,user_id,value) VALUES(?,?,?) ON CONFLICT(map_id,user_id) DO UPDATE SET value=excluded.value').run(id,user.id,value);
       const n=db.prepare('SELECT COALESCE(SUM(value=1),0) likes,COALESCE(SUM(value=-1),0) dislikes FROM votes WHERE map_id=?').get(id);
       db.prepare('UPDATE maps SET likes=?,dislikes=?,rank=? WHERE id=?').run(n.likes,n.dislikes,mapRank(n.likes,n.dislikes),id);db.exec('COMMIT');return json(res,200,{...n,myVote:value});
      }catch(e){db.exec('ROLLBACK');throw e;}
     }
     if(action==='report'&&req.method==='POST'){
      const user=requireUser(req);rate('report:'+user.id,12,3600000);const b=await body(req),reason=String(b.reason||'Review requested').slice(0,160);
      db.prepare('INSERT INTO reports(map_id,user_id,reason,created) VALUES(?,?,?,?) ON CONFLICT(map_id,user_id) DO NOTHING').run(id,user.id,reason,Date.now());return json(res,200,{ok:true});
     }
    }
    throw fail(404,'المسار غير موجود.');
   }
   if(!['GET','HEAD'].includes(req.method))throw fail(405,'طريقة غير مدعومة.');
   // Serve only built public assets, never repository files, database or server code.
   const decoded=decodeURIComponent(p);if(decoded.includes('\0'))throw fail(400,'مسار غير صالح.');
   let file=path.resolve(staticRoot,'.'+decoded);if(file!==path.resolve(staticRoot)&&!file.startsWith(path.resolve(staticRoot)+path.sep))throw fail(403,'مسار غير مسموح.');
   if((await stat(file)).isDirectory())file=path.join(file,'index.html');
   const ext=path.extname(file),types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.png':'image/png','.json':'application/json'};
   if(!types[ext])throw fail(404,'غير موجود.');
   const content=await readFile(file);res.writeHead(200,{'Content-Type':types[ext],'Cache-Control':'no-cache','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'"});res.end(req.method==='HEAD'?undefined:content);
  }catch(e){if(!res.headersSent)json(res,e.status|| (e.code==='ENOENT'?404:500),{error:e.status?e.message:e.code==='ENOENT'?'غير موجود.':'خطأ داخلي في الخادم.'});else res.end();}
 });
 server.requestTimeout=15000;server.headersTimeout=10000;
 server.on('close',()=>db.close());return {server,db};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const port=Number(process.env.PORT||4173),host=process.env.HOST||'127.0.0.1';
 const {server}=createCommunityServer({dbPath:process.env.DB_PATH||path.join(ROOT,'data/community.sqlite'),publicOrigin:process.env.PUBLIC_ORIGIN||''});
 server.listen(port,host,()=>console.log(`Shadow Shift + Player Maps: ${process.env.PUBLIC_ORIGIN||'http://localhost:'+port}`));
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
}
