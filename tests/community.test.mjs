import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {createCommunityServer} from '../server/index.mjs';
import {blankMap,obstacle,mapToLevel,proofFor} from '../src/maps.js';
import {Run} from '../src/core.js';
import {oracle} from './oracle.mjs';
function sample(title='Test map'){const map={...blankMap(),title,length:2400,obstacles:[obstacle('spike',900)]},r=new Run(mapToLevel(map));r.start();while(r.status==='running'){oracle(r);r.update();}assert.equal(r.status,'won');return {map,proof:proofFor(r,map)};}
test('Shared service: auth, verified publishing, persistent cross-account votes, ranking, reports and CSRF',async t=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'shadow-community-')),dbPath=path.join(dir,'test.sqlite');
 let svc=createCommunityServer({dbPath,rateLimits:false});svc.server.listen(0,'127.0.0.1');await once(svc.server,'listening');let base='http://127.0.0.1:'+svc.server.address().port;
 const cookies={};
 async function call(url,{method='GET',body,as,origin=base}={}){const r=await fetch(base+'/api/v1/'+url,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),Origin:origin,...(as&&cookies[as]?{Cookie:cookies[as]}:{})},body:body?JSON.stringify(body):undefined});const cookie=r.headers.get('set-cookie');if(cookie&&as)cookies[as]=cookie.split(';')[0];return {status:r.status,headers:r.headers,data:await r.json()};}
 try{
  await t.test('Anonymous cannot publish or vote',async()=>{assert.equal((await call('maps',{method:'POST',body:sample()})).status,401);});
  await t.test('Registration uses HttpOnly SameSite cookie; passwords are not plaintext',async()=>{for(const name of ['maker','runner','other']){const r=await call('register',{method:'POST',body:{username:name,password:'test-only-password-'+name},as:name});assert.equal(r.status,201);assert.match(r.headers.get('set-cookie'),/HttpOnly/);assert.match(r.headers.get('set-cookie'),/SameSite=Strict/);}assert.ok(!svc.db.prepare('SELECT password FROM users LIMIT 1').get().password.includes('test-only'));});
  await t.test('Duplicate usernames and incorrect passwords fail',async()=>{assert.equal((await call('register',{method:'POST',body:{username:'MAKER',password:'test-only-password-maker'}})).status,409);assert.equal((await call('login',{method:'POST',body:{username:'maker',password:'incorrect-but-long'}})).status,401);});
  await t.test('Cross-origin writes are denied',async()=>{assert.equal((await call('maps',{method:'POST',body:sample(),as:'maker',origin:'https://evil.invalid'})).status,403);});
  await t.test('Forged proof rejected by worker',async()=>{const b=sample();b.proof.inputs=[];assert.equal((await call('maps',{method:'POST',body:b,as:'maker'})).status,422);});
  const first=await call('maps',{method:'POST',body:sample('First map'),as:'maker'});assert.equal(first.status,201);const id=first.data.id;
  const second=await call('maps',{method:'POST',body:sample('Second map'),as:'maker'});assert.equal(second.status,201);
  await t.test('Published maps are visible to another account',async()=>{const r=await call('maps',{as:'runner'});assert.equal(r.data.items.length,2);assert.equal((await call('maps/'+id)).data.map.title,'First map');});
  await t.test('Self votes forbidden, duplicate like is idempotent, dislike replaces like',async()=>{
   assert.equal((await call('maps/'+id+'/vote',{method:'PUT',body:{value:1},as:'maker'})).status,403);
   for(let i=0;i<2;i++){const r=await call('maps/'+id+'/vote',{method:'PUT',body:{value:1},as:'runner'});assert.equal(r.data.likes,1);}
   let r=await call('maps/'+id+'/vote',{method:'PUT',body:{value:-1},as:'runner'});assert.equal(r.data.likes,0);assert.equal(r.data.dislikes,1);
   r=await call('maps/'+id+'/vote',{method:'PUT',body:{value:0},as:'runner'});assert.equal(r.data.likes+r.data.dislikes,0);
  });
  await t.test('More likes improve discovery in shared list',async()=>{for(const as of ['runner','other'])await call('maps/'+id+'/vote',{method:'PUT',body:{value:1},as});const r=await call('maps?sort=popular',{as:'runner'});assert.equal(r.data.items[0].id,id);assert.equal(r.data.items[0].likes,2);assert.equal(r.data.items[0].myVote,1);});
  await t.test('Reports unique per account; private paths cannot expose database',async()=>{for(let i=0;i<2;i++)assert.equal((await call('maps/'+id+'/report',{method:'POST',body:{reason:'test report'},as:'runner'})).status,200);assert.equal(svc.db.prepare('SELECT COUNT(*) n FROM reports').get().n,1);assert.equal((await fetch(base+'/server/index.mjs')).status,404);assert.equal((await fetch(base+'/data/test.sqlite')).status,404);});
  await t.test('Data and sessions survive server restart',async()=>{await new Promise(r=>svc.server.close(r));svc=createCommunityServer({dbPath,rateLimits:false});svc.server.listen(0,'127.0.0.1');await once(svc.server,'listening');base='http://127.0.0.1:'+svc.server.address().port;const r=await call('maps?sort=popular',{as:'runner'});assert.equal(r.data.items[0].likes,2);assert.equal(r.data.items[0].myVote,1);assert.equal((await call('session',{as:'runner'})).data.user.username,'runner');});
  await t.test('Moderator-hidden map is unavailable in lists and play',async()=>{svc.db.prepare('UPDATE maps SET hidden=1 WHERE id=?').run(id);assert.equal((await call('maps/'+id)).status,404);assert.equal((await call('maps')).data.items.length,1);});
  await t.test('Logout invalidates the server-side session',async()=>{const old=cookies.runner;await call('logout',{method:'POST',body:{},as:'runner'});cookies.runner=old;assert.equal((await call('session',{as:'runner'})).data.user,null);});
 }finally{await new Promise(r=>svc.server.close(r));await rm(dir,{recursive:true,force:true});}
});
