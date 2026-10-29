import {makeLevel,LABELS,LEVELS,SKINS} from './content.js';
export const STEP=1/120;
export const SAVE_KEY='shadow-shift.save.v1';
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const cleanNumber=(v,a,b,d=0)=>Number.isFinite(v)?clamp(v,a,b):d;
export function freshSave(){return {version:1,character:null,skin:0,owned:[0],credits:0,unlocked:1,completed:{},failures:{},totalDeaths:0,daily:{},settings:{sound:true,music:false,reduced:false,leftHand:false,quality:'auto'}};}
/** Allowlist serializer. No position, partial inventory, or run timer can enter a save. */
export function sanitizeSave(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||value.version!==1)throw new Error('ملف حفظ غير متوافق');
 const s=freshSave();s.character=['boy','girl'].includes(value.character)?value.character:null;
 s.credits=Math.floor(cleanNumber(value.credits,0,1000000));s.totalDeaths=Math.floor(cleanNumber(value.totalDeaths,0,10000000));
 s.owned=Array.isArray(value.owned)?[...new Set([0,...value.owned.filter(n=>Number.isInteger(n)&&SKINS[n])])]:[0];
 s.skin=s.owned.includes(value.skin)?value.skin:0;
 for(const k of ['sound','music','reduced','leftHand'])if(typeof value.settings?.[k]==='boolean')s.settings[k]=value.settings[k];
 if(['auto','low','high'].includes(value.settings?.quality))s.settings.quality=value.settings.quality;
 for(let id=1;id<=30;id++){
  const c=value.completed?.[id];
  if(c&&typeof c==='object'&&c.stars>=1)s.completed[id]={stars:Math.floor(cleanNumber(c.stars,1,3,1)),score:Math.floor(cleanNumber(c.score,0,1000000)),time:cleanNumber(c.time,1,600,600)};
  const f=value.failures?.[id];
  if(f&&typeof f==='object')s.failures[id]={count:Math.floor(cleanNumber(f.count,0,1000000)),early:Math.floor(cleanNumber(f.early,0,100000)),late:Math.floor(cleanNumber(f.late,0,100000)),cause:Object.hasOwn(LABELS,f.cause)?f.cause:'void'};
 }
 let unlocked=1;while(unlocked<30&&s.completed[unlocked])unlocked++;s.unlocked=unlocked;
 if(value.daily&&typeof value.daily==='object')for(const key of Object.keys(value.daily).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x)).sort().slice(-14)){
  const d=value.daily[key];if(d&&typeof d==='object')s.daily[key]={score:Math.floor(cleanNumber(d.score,0,1000000)),stars:Math.floor(cleanNumber(d.stars,0,3)),claimed:d.claimed===true};
 }
 return s;
}
export class SaveStore{
 constructor(storage){this.storage=storage;this.warning='';this.data=freshSave();this.load();}
 load(){try{const raw=this.storage.getItem(SAVE_KEY);if(raw)this.data=sanitizeSave(JSON.parse(raw));}catch{
  try{const b=this.storage.getItem(SAVE_KEY+'.backup');if(b){this.data=sanitizeSave(JSON.parse(b));this.warning='استُعيدت النسخة الاحتياطية المحلية.';}else this.warning='تعذّر قراءة الحفظ؛ يمكنك استيراد نسخة احتياطية.';}catch{this.warning='الحفظ المحلي غير متاح. صدّر تقدمك قبل المغادرة.';}
 }}
 save(){this.data=sanitizeSave(this.data);try{const old=this.storage.getItem(SAVE_KEY);if(old){try{sanitizeSave(JSON.parse(old));this.storage.setItem(SAVE_KEY+'.backup',old);}catch{}}
 this.storage.setItem(SAVE_KEY,JSON.stringify(this.data));return true;}catch{this.warning='الحفظ المحلي غير متاح. صدّر تقدمك قبل المغادرة.';return false;}}
 export(){return JSON.stringify(sanitizeSave(this.data),null,2);}
 import(text){if(typeof text!=='string'||text.length>65536)throw new Error('ملف الحفظ أكبر من الحد المسموح');const next=sanitizeSave(JSON.parse(text));this.data=next;this.save();return next;}
}
export class Run{
 constructor(level){this.level=level;this.ticks=0;this.inputs=[];this.replaying=false;this.falling=new Map();this.vx=level.speed*.72;this.motionTime=0;this.prevX=80;this.prevY=0;this.x=80;this.y=0;this.vy=0;this.t=0;this.sun=0;this.grounded=true;this.coyote=.1;this.buffer=0;this.hold=0;this.jumpHeld=false;this.jumps=0;this.sunChanges=0;this.collected=new Set();this.status='ready';this.cause=null;this.events=[];this.trace=[];this.traceTick=0;this.lastJumpX=-9999;this.early=0;this.late=0;}
 start(){if(this.status==='ready')this.status='running';}
 record(action,value){if(!this.replaying&&this.status==='running'&&this.inputs.length<6000)this.inputs.push([this.ticks,action,value]);}
 setSun(value){const v=clamp(Math.round(Number(value)||0),-1,1);if(v!==this.sun)this.record('s',v);if(Math.round(v)!==Math.round(this.sun))this.sunChanges++;this.sun=v;}
 pressJump(){this.record('j',1);this.buffer=.14;this.jumpHeld=true;}
 releaseJump(){if(this.jumpHeld)this.record('j',0);this.jumpHeld=false;if(this.vy>245)this.vy=245;}
 aligned(obstacle){return Math.abs(this.sun-obstacle.required)<.32;}
 supportAt(x){return !this.level.obstacles.some(o=>o.kind==='bridge'&&x>o.x&&x<o.x+o.w&&!this.aligned(o));}
 die(cause){if(this.status!=='running')return;this.status='dead';this.cause=cause;const d=this.x-this.lastJumpX;if(d>140)this.early++;else this.late++;this.events.push({type:'death',cause});}
 fallBody(o){
  const st=this.falling.get(o.id);if(!st)return null;
  const age=this.t-st.at,delay=.13,fall=Math.max(0,age-delay);
  const y=Math.max(0,350-900*fall*fall);
  return {y,age,landed:y===0,expired:age>4.5};
 }
 updateFalls(){
  for(const o of this.level.obstacles){
   if(!['cow','meteor','crate'].includes(o.kind))continue;
   if(!this.falling.has(o.id)&&this.x>=o.x-this.level.speed*1.45)this.falling.set(o.id,{at:this.t,impact:false});
   const body=this.fallBody(o),state=this.falling.get(o.id);
   if(body?.landed&&!state.impact){state.impact=true;this.events.push({type:'impact',x:o.x+o.w/2,kind:o.kind});}
  }
 }
 update(dt=STEP){
  if(this.status!=='running')return;
  // Caller uses an accumulator. Clamping here is a safety net, not a variable timestep.
  dt=clamp(dt,0,1/30);this.prevX=this.x;this.prevY=this.y;this.t+=dt;this.ticks++;this.vx+=(this.level.speed-this.vx)*(1-Math.exp(-dt*12));this.x+=this.vx*dt;this.motionTime+=this.vx*dt/240;this.buffer-=dt;this.updateFalls();
  const ground=this.supportAt(this.x);if(this.grounded&&!ground){this.grounded=false;this.coyote=.08;}
  if(this.grounded)this.coyote=.08;else this.coyote-=dt;
  if(this.buffer>0&&(this.grounded||this.coyote>0)){
   this.vy=500;this.grounded=false;this.coyote=0;this.buffer=0;this.hold=.18;this.jumps++;this.lastJumpX=this.x;this.events.push({type:'jump'});
  }
  if(!this.grounded){
   const low=this.level.obstacles.some(o=>o.kind==='gravity'&&this.x>o.x&&this.x<o.x+o.w);
   let gravity=low?810:1450;if(this.jumpHeld&&this.hold>0&&this.vy>0)gravity*=.45;
   if(this.vy<0&&!low)gravity*=1.16;this.hold-=dt;this.vy-=gravity*dt;const prev=this.y;this.y+=this.vy*dt;
   if(this.y<=0&&prev>=-.01&&this.vy<=0&&ground){this.y=0;this.vy=0;this.grounded=true;this.events.push({type:'land'});}
  }
  if(this.y < -125){this.die('void');return;}
  for(const o of this.level.obstacles){
   if(o.x>this.x+90||o.x+o.w<this.x-90)continue;
   if(['bridge','gravity'].includes(o.kind))continue;
   let left=o.x;if(o.kind==='saw')left+=Math.sin(this.t*2.6+o.phase)*18;
   if(this.x+10<left||this.x-10>left+o.w)continue;
   if(['cow','meteor','crate'].includes(o.kind)){const body=this.fallBody(o);if(body&&!body.expired&&this.y<body.y+o.h-3&&this.y+54>body.y+3){this.die(o.kind);return;}continue;}
   if(o.kind==='ufo'||o.kind==='gate'){if(!this.aligned(o)&&this.y<(o.kind==='gate'?164:220)){this.die(o.kind);return;}}
   else if(this.y<o.h-1){this.die(o.kind);return;}
  }
  for(const s of this.level.shards)if(!this.collected.has(s.id)&&Math.abs(this.x-s.x)<27&&Math.abs(this.y+26-s.y)<39){this.collected.add(s.id);this.events.push({type:'shard'});}
  this.traceTick+=dt;if(this.traceTick>.09){this.traceTick=0;if(this.trace.length<2400)this.trace.push([this.x,this.y]);}
  if(this.x>=this.level.length){this.status='won';this.events.push({type:'win'});}
 }
 result(){const total=this.level.shards.length;return {stars:this.level.custom?(1+(this.collected.size>0?1:0)+(total>0&&this.collected.size===total?1:0)):(1+(this.collected.size>=2?1:0)+(this.collected.size>=3?1:0)),score:Math.max(100,Math.round(1000+this.collected.size*300+this.level.id*20-this.jumps*3-this.sunChanges*2)),time:Math.round(this.t*100)/100};}
}
export function recordDeath(save,run,mode){
 save.totalDeaths++;
 if(mode==='campaign'){const p=save.failures[run.level.id]||{count:0,early:0,late:0,cause:'void'};p.count++;p.early+=run.early;p.late+=run.late;p.cause=run.cause;save.failures[run.level.id]=p;}
}
export function recordWin(save,run,mode,date){
 if(run.status!=='won')throw new Error('Cannot reward an incomplete run');
 const r=run.result();let reward=0;
 if(mode==='campaign'){
  const old=save.completed[run.level.id];reward=old?Math.max(0,r.stars-old.stars)*10:40+r.stars*10;
  save.completed[run.level.id]={stars:Math.max(old?.stars||0,r.stars),score:Math.max(old?.score||0,r.score),time:Math.min(old?.time||Infinity,r.time)};
  save.unlocked=Math.min(30,Math.max(save.unlocked,run.level.id+1));
 }else if(mode==='daily'){
  const old=save.daily[date];reward=old?.claimed?0:45;
  save.daily[date]={score:Math.max(old?.score||0,r.score),stars:Math.max(old?.stars||0,r.stars),claimed:true};
 }
 save.credits+=reward;return {...r,reward};
}
