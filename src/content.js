/** Content is data, not renderer code. Distances use world units; times use seconds. */
export const VERSION = '0.5.0';
export const CONTENT_VERSION = 2;
export const WORLD_NAMES = ['الظل الأول','الفخاخ الحية','أطلال النيون','التشوّه الكوني','كابوس الصدى'];
export const WORLD_EN = ['THE FIRST SHADE','LIVING TRAPS','NEON RUINS','COSMIC DISTORTION','ECHO NIGHTMARE'];
export const PALETTES = [
 ['#070d1c','#192c48','#75f2d0','#b7a0ff'],
 ['#100b20','#352042','#e7adfa','#ffb887'],
 ['#070d20','#172d50','#6ce8ff','#fa99d8'],
 ['#110e29','#32274e','#c0b1ff','#f2cf8e'],
 ['#180d22','#3f2038','#ffb8b2','#c6a6ff']
];
const names = ['أول شعاع','قفزة لا تراها','المدينة التي تومض','الباب الذي يتراجع','الأشواك الصامتة','اختبار الضوء','ذاكرة الأرض','المعبر الذي يراك','حلبة المناشير','الظل المقلّد','الطابق المقلوب','القلب المتبدّل','مترو بلا قطار','مصعد إلى الأسفل','غرفة تحفظ القفز','شارع الإشارات الكاذبة','الأبراج الزجاجية','مطاردة الحارس','أول تماس','الشعاع الراجع','حديقة الجاذبية','القمر المزيّف','المطر المعكوس','عملية الاختطاف','أصداء الأمس','المرحلة التي تكذب','بوابة الاحتمالات','الانهيار المتسلسل','ألف فخ وفخ','آخر تحوّل'];
const durations = [48,54,60,66,72,80,85,90,95,100,105,112,115,118,122,126,132,138,135,140,145,150,156,162,156,162,168,174,182,190];
export const LEVELS = names.map((name,i)=>({id:i+1,name,world:Math.floor(i/6),duration:durations[i],speed:i===0?212:240+Math.floor(i/6)*12,signature:i%6}));
export const SKINS = [
 {id:0,name:'الصدى الأصلي',color:'#83f8da',price:0},
 {id:1,name:'شروق ذهبي',color:'#ffd68a',price:140},
 {id:2,name:'نبض الأوركيد',color:'#d5a5ff',price:240},
 {id:3,name:'الجليد الكوني',color:'#9de3ff',price:350},
 {id:4,name:'آخر شرارة',color:'#ff9f9a',price:500}
];
export const LABELS = {spike:'أشواك',laser:'حقل ليزر',saw:'منشار',gate:'بوابة ضوئية',ufo:'شعاع الاختطاف',bridge:'جسر ظل',gravity:'مجال جاذبية',void:'الهاوية',cow:'بقرة ساقطة',meteor:'نيزك',crate:'حمولة ساقطة'};
export const DIRECTIONS = ['يسار','وسط','يمين'];
export function hash(text){let h=2166136261;for(const c of String(text)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
export function random(seed){let t=seed>>>0;return ()=>{t+=0x6D2B79F5;let r=Math.imul(t^t>>>15,t|1);r^=r+Math.imul(r^r>>>7,r|61);return ((r^r>>>14)>>>0)/4294967296;};}
export function utcDay(date=new Date()){return date.toISOString().slice(0,10);}
export function dailyLevel(date=utcDay()){return {id:7+hash(date)%24,seed:hash('SS2:'+date),date};}
export function challengeCode(id,seed){return `SS2-${String(id).padStart(2,'0')}-${(seed>>>0).toString(16).padStart(8,'0').toUpperCase()}`;}
export function parseCode(code){const m=/^SS2-(\d{2})-([0-9A-F]{8})$/i.exec(String(code).trim());if(!m||+m[1]<1||+m[1]>30)return null;return {id:+m[1],seed:parseInt(m[2],16)>>>0};}

/** Disjoint challenge cells make collision envelopes independently testable. */
export function makeLevel(id,attempt=0,profile={},seedOverride=null){
 const definition=LEVELS[id-1];if(!definition)throw new RangeError('Unknown level');
 const {world,speed,duration}=definition;
 const seed=seedOverride===null?hash(`campaign-v${CONTENT_VERSION}-${id}`):seedOverride>>>0;
 const rng=random(seed);const variant=Math.max(0,Math.floor(attempt))%3;
 const length=80+speed*duration;const cells=Math.floor((length-1200)/780);
 const obstacles=[];const shards=[];const sectors=[];
 const shardCells=new Set([Math.floor(cells*.23),Math.floor(cells*.53),Math.floor(cells*.83)]);
 const first=['laser','spike','saw'][variant];
 for(let i=0;i<cells;i++){
  const x=780+i*780+Math.round(rng()*100);
  if(shardCells.has(i)){shards.push({x:x+140,y:92,id:shards.length});continue;}
  const motif=Math.floor(rng()*3);
  const required=((i+variant+id+motif)%3)-1;
  let kind;
  if(i===0)kind='bridge';
  else if(i===1)kind=first;
  else if(id>1&&i>2&&i%5===2)kind=['cow','meteor','crate'][(i+variant+id)%3];
  else if(world>=3&&i%7===5)kind='ufo';
  else if(world>=1&&i%8===6)kind='gate';
  else if(world>=2&&i%9===7)kind='gravity';
  else if(i%3===0||i%5===4)kind='bridge';
  else kind=['spike','laser','saw'][(i+variant+definition.signature+motif)%3];
  // Adapt only between attempts; challenge/daily series never use private history.
  let bias=0;
  if(seedOverride===null && attempt>0 && i>2){bias=profile.early>profile.late?36:profile.late>profile.early?-30:0;}
  const base={id:i,x:x+bias,kind,required,phase:rng()*Math.PI*2};
  if(['cow','meteor','crate'].includes(kind))Object.assign(base,{w:kind==='cow'?86:62,h:kind==='cow'?58:40});
  else if(kind==='bridge')Object.assign(base,{w:235+world*14+Math.round(rng()*45),fake:world>0&&i%2===0});
  else if(kind==='ufo')Object.assign(base,{w:120});
  else if(kind==='gate')Object.assign(base,{w:34});
  else if(kind==='gravity')Object.assign(base,{w:350});
  else Object.assign(base,{w:kind==='saw'?44:54,h:kind==='saw'?45:32});
  obstacles.push(base);
  if(world>=2&&i%3===2&&['spike','laser','saw'].includes(kind)){
   const pairKind=['spike','laser','saw'][(variant+motif+1)%3];
   obstacles.push({id:i+0.5,x:base.x+300,kind:pairKind,w:pairKind==='saw'?44:54,h:pairKind==='saw'?45:32,required:0,phase:rng()*6.28});
  }
 }
 for(let i=1;i<3;i++)sectors.push(length*i/3);
 return {...definition,seed,variant,attempt,length,obstacles,shards,sectors,signatureCode:challengeCode(id,seed),tutorial:id===1};
}
