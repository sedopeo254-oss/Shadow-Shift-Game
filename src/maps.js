import {hash} from './content.js';
import {Run,STEP} from './core.js';
export const MAP_VERSION=1;
export const MAP_ENGINE='0.5';
export const MAP_KINDS=Object.freeze({bridge:'جسر ظل',spike:'أشواك',laser:'ليزر',saw:'منشار',gate:'بوابة',gravity:'جاذبية خفيفة',ufo:'مركبة',cow:'بقرة',meteor:'نيزك',crate:'صندوق ساقط'});
export const MAP_LIMIT=128;
const integer=(v,a,b,label)=>{if(!Number.isInteger(v)||v<a||v>b)throw new Error(label);return v;};
const text=(v,max)=>String(v??'').normalize('NFKC').replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g,'').trim().slice(0,max);
export function blankMap(){return {version:1,engine:MAP_ENGINE,title:'رحلتي الأولى',description:'',scene:2,length:6000,speed:240,obstacles:[],shards:[]};}
export function obstacle(kind,x,required=0,w){
 if(!Object.hasOwn(MAP_KINDS,kind))throw new Error('نوع عنصر غير صالح');
 const widths={bridge:260,spike:54,laser:54,saw:44,gate:34,gravity:350,ufo:120,cow:86,meteor:62,crate:62};
 return {kind,x:Math.round(x/20)*20,w:kind==='bridge'?Math.round((w||260)/20)*20:widths[kind],required};
}
/** Canonical JSON allowlist shared by the editor, importer, replay worker and server. */
export function sanitizeMap(raw){
 if(!raw||raw.version!==MAP_VERSION||raw.engine!==MAP_ENGINE)throw new Error('ملف المرحلة غير متوافق مع هذا الإصدار');
 const title=text(raw.title,48);if(title.length<2)throw new Error('اكتب اسمًا للمرحلة من حرفين على الأقل');
 const m={version:1,engine:MAP_ENGINE,title,description:text(raw.description,160),scene:integer(raw.scene,1,30,'الخلفية غير صالحة'),length:integer(raw.length,2400,30000,'طول المرحلة بين 2400 و30000'),speed:integer(raw.speed,200,300,'السرعة بين 200 و300'),obstacles:[],shards:[]};
 if(!Array.isArray(raw.obstacles)||raw.obstacles.length>MAP_LIMIT)throw new Error('الحد الأقصى 128 عقبة');
 for(const o of raw.obstacles){
  if(!o||!Object.hasOwn(MAP_KINDS,o.kind))throw new Error('عقبة غير مدعومة');
  const x=integer(o.x,560,m.length-350,'اترك مساحة آمنة للبداية والنهاية');
  const required=integer(o.required??0,-1,1,'اتجاه ضوء غير صالح');
  const next=obstacle(o.kind,x,required,o.w);next.x=x;
  if(o.kind==='bridge')next.w=integer(o.w,180,440,'عرض الجسر بين 180 و440');
  if(next.x+next.w>m.length-300)throw new Error('العقبة قريبة جدًا من النهاية');
  m.obstacles.push(next);
 }
 m.obstacles.sort((a,b)=>a.x-b.x);
 for(let i=1;i<m.obstacles.length;i++)if(m.obstacles[i].x<m.obstacles[i-1].x+m.obstacles[i-1].w+90)throw new Error('اترك 90 وحدة على الأقل بين العقبات');
 if(!Array.isArray(raw.shards)||raw.shards.length>12)throw new Error('الحد الأقصى 12 شظية');
 for(const shard of raw.shards){
  const s={x:integer(shard.x,400,m.length-250,'موضع الشظية خارج المرحلة'),y:integer(shard.y,40,145,'ارتفاع الشظية غير صالح')};
  if(m.shards.some(v=>Math.abs(v.x-s.x)<50))throw new Error('الشظايا متقاربة جدًا');
  m.shards.push(s);
 }
 m.shards.sort((a,b)=>a.x-b.x);return m;
}
export function mapKey(map){return hash(JSON.stringify(sanitizeMap(map))).toString(16).padStart(8,'0');}
export function mapToLevel(input){
 const m=sanitizeMap(input);
 const heights={spike:32,laser:32,saw:45,cow:58,meteor:40,crate:40};
 return {id:0,custom:true,sceneId:m.scene,name:m.title,world:Math.floor((m.scene-1)/6),duration:(m.length-80)/m.speed,speed:m.speed,length:m.length,seed:hash(JSON.stringify(m)),variant:0,attempt:0,obstacles:m.obstacles.map((o,i)=>({...o,id:i,h:heights[o.kind]||0,phase:i*.7,fake:false})),shards:m.shards.map((s,i)=>({...s,id:i})),sectors:[],tutorial:false};
}
export function proofFor(run,map){if(run.status!=='won')throw new Error('أكمل المرحلة من بدايتها قبل النشر');return {engine:MAP_ENGINE,mapKey:mapKey(map),ticks:run.ticks,inputs:run.inputs.map(v=>[...v])};}
/** Never trust a client-side win flag: re-simulate bounded input events from x=80. */
export function verifyProof(map,proof){
 const m=sanitizeMap(map);if(!proof||proof.engine!==MAP_ENGINE||proof.mapKey!==mapKey(m))throw new Error('شهادة الفوز لا تطابق هذه المرحلة');
 integer(proof.ticks,1,24000,'مدة التسجيل غير صالحة');
 if(!Array.isArray(proof.inputs)||proof.inputs.length>6000)throw new Error('تسجيل أكبر من الحد المسموح');
 let prev=-1;
 for(const event of proof.inputs){
  if(!Array.isArray(event)||event.length!==3)throw new Error('تسجيل غير صالح');
  const [tick,action,value]=event;integer(tick,0,proof.ticks,'توقيت إدخال غير صالح');
  if(tick<prev||!['s','j'].includes(action)||!(action==='s'?[-1,0,1]:[0,1]).includes(value))throw new Error('إدخال غير صالح');prev=tick;
 }
 const r=new Run(mapToLevel(m));r.replaying=true;r.start();let cursor=0;
 for(let tick=0;tick<proof.ticks&&r.status==='running';tick++){
  while(cursor<proof.inputs.length&&proof.inputs[cursor][0]===tick){const [,a,v]=proof.inputs[cursor++];if(a==='s')r.setSun(v);else if(v)r.pressJump();else r.releaseJump();}
  r.update(STEP);r.events.length=0;
 }
 if(r.status!=='won'||r.ticks!==proof.ticks||cursor!==proof.inputs.length)throw new Error('لم ينجح اجتياز المرحلة عند إعادة التحقق');
 return {ticks:r.ticks,time:r.t,engine:MAP_ENGINE};
}
export function mapRank(likes,dislikes){
 const n=likes+dislikes;if(!n)return 0;
 const z=1.281551565545,phat=likes/n;
 return (phat+z*z/(2*n)-z*Math.sqrt((phat*(1-phat)+z*z/(4*n))/n))/(1+z*z/n);
}
export class MapLibrary{
 constructor(storage){this.storage=storage;this.items=[];this.warning='';try{const raw=storage.getItem('shadow-shift.maps.v1');if(raw){const data=JSON.parse(raw);if(!Array.isArray(data)||data.length>50)throw Error();this.items=data.map(e=>({id:text(e.id,64),map:sanitizeMap(e.map),proof:e.proof||null,updated:Number(e.updated)||0}));}}catch{this.warning='تعذّر قراءة مكتبة المراحل؛ استورد نسخة محفوظة.';}}
 save(map,proof=null,id=null){const clean=sanitizeMap(map),entry={id:id||'local-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),map:clean,proof:proof?.mapKey===mapKey(clean)?proof:null,updated:Date.now()};const i=this.items.findIndex(e=>e.id===entry.id);if(i>=0)this.items[i]=entry;else{if(this.items.length>=50)throw Error('المكتبة ممتلئة؛ احذف مرحلة أو صدّرها');this.items.unshift(entry);}this.flush();return entry;}
 remove(id){this.items=this.items.filter(m=>m.id!==id);this.flush();}
 flush(){try{this.storage.setItem('shadow-shift.maps.v1',JSON.stringify(this.items));this.warning='';}catch{this.warning='لم يُحفظ على الجهاز. صدّر المرحلة قبل المغادرة.';}}
}
export const DEMO_MAPS=[
 {key:'cow-courier',map:{...blankMap(),title:'البريد البقري',description:'تجربة من فريق اللعبة · ليست مرحلة منشورة من لاعب',scene:7,length:5200,obstacles:[obstacle('spike',900),obstacle('cow',1600),obstacle('bridge',2300,1),obstacle('meteor',3100),obstacle('crate',3900)],shards:[{x:4400,y:92}]}},
 {key:'meteor-garden',map:{...blankMap(),title:'حديقة الشهب',description:'تجربة من فريق اللعبة · ليست مرحلة منشورة من لاعب',scene:23,length:6400,obstacles:[obstacle('meteor',900),obstacle('bridge',1700,-1),obstacle('meteor',2500),obstacle('cow',3300),obstacle('gate',4100,1),obstacle('crate',4900)],shards:[{x:5500,y:92}]}}
];
