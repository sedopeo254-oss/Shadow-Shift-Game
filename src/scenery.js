import {hash,random} from './content.js';
/** Stage art direction is independent of retry seeds and collision geometry. */
const DEFINITIONS = [
 ['بوابة الفجر','ruins','gate','#081522','#264556','#a8e3d0','#d3c19d','dust'],
 ['غابة السكون','forest','tree','#071821','#153e43','#7bcbbd','#d6d8ac','fireflies'],
 ['قنوات القمر','arches','aqueduct','#0b142b','#24375b','#98c4e9','#c6b6ef','mist'],
 ['المنارة البعيدة','coast','lighthouse','#10182a','#4b4656','#d6bec0','#edce9b','rain'],
 ['بستان الزجاج','crystal','crystal','#161029','#382953','#bf9eda','#f0c9cf','dust'],
 ['معبد الشمس','ruins','sun','#201821','#614438','#d8bd8b','#fde1a3','embers'],
 ['جذور الآلة','forest','roots','#091c1c','#234739','#9fc4a1','#d2b780','fireflies'],
 ['مرصد الصمت','machine','observatory','#111329','#38375c','#a3acd9','#cbbcec','mist'],
 ['ورشة التيتان','machine','wheel','#20161e','#58413b','#cfb097','#edc490','embers'],
 ['برجا الصدى','ruins','twins','#101b2c','#2d405c','#a1badb','#b4e1e2','dust'],
 ['درج السحاب','mountain','stairs','#14212a','#395a64','#b6dce0','#e9d6c1','snow'],
 ['قلب النحاس','machine','heart','#20131c','#542936','#dc9da9','#efbf9d','embers'],
 ['المحطة المغمورة','city','rail','#081b27','#194557','#86c5cd','#b4c6f2','rain'],
 ['بئر المدينة','city','shaft','#17152c','#3b355e','#afa9dd','#ecc6e4','mist'],
 ['ساحة الطيف','machine','grid','#092020','#235148','#85cbb4','#d7dbad','fireflies'],
 ['مدينة المساء','city','city','#201b32','#5a4263','#d1a7d5','#f3c8aa','rain'],
 ['كاتدرائية الزجاج','crystal','cathedral','#0c1b31','#274e6b','#9fcfe7','#cbcff6','snow'],
 ['الحارس البعيد','ruins','sentinel','#251820','#674539','#d2b59f','#e2c0aa','dust'],
 ['ساحل الوصول','space','vessel','#10182d','#314564','#a4c9e2','#d1beef','dust'],
 ['أطباق المناداة','machine','dish','#111e2b','#33596a','#a8d7d5','#e3cb9f','rain'],
 ['الحديقة المعلقة','forest','floating','#142136','#495b79','#b3d7e8','#f0d4bc','fireflies'],
 ['كسوف الأوبال','space','eclipse','#20142c','#5b3654','#d2a0ce','#efcfb0','mist'],
 ['مطر النجوم','mountain','meteor','#101a32','#344f76','#b1ccec','#c7b4f1','meteors'],
 ['انشقاق المدار','space','rift','#211a33','#594660','#d6b3d2','#cbe9de','dust'],
 ['بحيرة المرايا','mirrors','mirrors','#10242b','#3d6266','#bbdcdb','#e7c9df','mist'],
 ['الأطلال المقلوبة','ruins','inverted','#251c30','#65516b','#d1b9d8','#e2c2a4','dust'],
 ['المتاهة البيضاء','mirrors','maze','#182637','#4d6379','#c5dce6','#e9d4b3','snow'],
 ['سماء الرماد','mountain','debris','#251e27','#63505a','#d6bfc3','#f1c3a5','embers'],
 ['تاج الليل','crystal','crown','#16162d','#413b68','#b8b2e0','#e5ceb1','meteors'],
 ['آخر ضوء','space','core','#17222c','#3e5861','#c4e3d6','#f2ddae','dust']
];
export const SCENES=DEFINITIONS.map((d,i)=>Object.freeze({id:i+1,name:d[0],biome:d[1],landmark:d[2],sky:d[3],horizon:d[4],accent:d[5],light:d[6],weather:d[7],seed:hash('landscape-v1-'+(i+1))}));
export const sceneFor=id=>SCENES[Math.max(0,Math.min(29,(id|0)-1))];
export const tutorialFor=level=>level?.id===1;
export function sceneryCell(id,layer,index){
 const s=sceneFor(id),r=random(hash(`${s.seed}:${layer}:${index}`));
 return {key:`${id}:${layer}:${index}`,height:.25+r()*.65,width:.32+r()*.5,lean:(r()-.5)*.3,detail:r(),offset:r()};
}
const TAU=Math.PI*2;
function polygon(c,points,fill,stroke){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}}
function bloom(c,x,y,r,color){const g=c.createRadialGradient(x,y,1,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
function line(c,points,color,width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
/** A continuous, non-wrapping landscape. At most twelve 640px tiles stay resident. */
export class Scenery{
 constructor(){this.key='';this.tiles=new Map();this.sky=null;this.scene=SCENES[0];this.hits=0;this.misses=0;}
 configure(id,w,h,f){const key=`${id}:${w}:${h}:${f}`;if(key===this.key)return;this.key=key;this.scene=sceneFor(id);this.w=w;this.h=h;this.f=f;this.tiles.clear();this.makeSky();}
 makeSky(){
  const b=document.createElement('canvas');b.width=Math.ceil(this.w);b.height=Math.ceil(this.h);const c=b.getContext('2d'),s=this.scene;
  const g=c.createLinearGradient(0,0,0,this.f+70);g.addColorStop(0,s.sky);g.addColorStop(.65,s.horizon);g.addColorStop(1,s.sky);c.fillStyle=g;c.fillRect(0,0,b.width,b.height);
  bloom(c,this.w*.68,this.f*.6,this.w*.7,s.accent+'12');
  const r=random(s.seed);for(let i=0;i<100;i++){const x=r()*this.w,y=r()*this.f*.85;c.fillStyle=s.light+(i%11===0?'90':'36');c.fillRect(x,y,i%11===0?1.6:.8,.9);}
  // Long, quiet atmospheric bands rather than repeating cloud sprites.
  for(let i=0;i<5;i++){const y=this.f*(.25+i*.095),x=r()*this.w;c.save();c.translate(x,y);c.rotate((r()-.5)*.18);const fog=c.createLinearGradient(-this.w/2,0,this.w/2,0);fog.addColorStop(0,'transparent');fog.addColorStop(.5,s.light+'09');fog.addColorStop(1,'transparent');c.fillStyle=fog;c.beginPath();c.moveTo(-this.w*.5,14);c.bezierCurveTo(-this.w*.2,-12,this.w*.12,22,this.w*.5,0);c.bezierCurveTo(this.w*.2,42,-this.w*.2,25,-this.w*.5,14);c.fill();c.restore();}
  this.sky=b;
 }
 tile(layer,index){
  const key=layer+':'+index;if(this.tiles.has(key)){const v=this.tiles.get(key);this.tiles.delete(key);this.tiles.set(key,v);this.hits++;return v;}
  this.misses++;const b=document.createElement('canvas');b.width=640;b.height=Math.ceil(this.f+90);const c=b.getContext('2d'),s=this.scene,f=this.f;
  const color=layer===0?s.horizon:layer===1?s.sky:'#0a1721';
  const points=[[0,f+90]];
  for(let j=0;j<=10;j++){const a=sceneryCell(s.id,layer,index*10+j);points.push([j*64,f-(20+layer*14+a.height*(layer===0?160:65))]);}
  points.push([640,f+90]);polygon(c,points,color);
  const count=2+(hash(`${s.seed}:props:${layer}:${index}`)%3);
  for(let j=0;j<count;j++){
   const a=sceneryCell(s.id,layer,index*8+j),x=j*640/count+12+a.offset*55,y=f+10,ht=(65+a.height*165)*(layer===0?.92:1),ww=35+a.width*57;
   c.save();c.translate(x,y);c.lineWidth=1;
   const biome=s.biome;c.globalAlpha=.65+a.detail*.35;
   if(biome==='forest'){
    const xx=ww*.5;
    polygon(c,[[xx-8,0],[xx-5,-ht*.65],[xx+ht*a.lean,-ht],[xx+7,-ht*.45],[xx+12,0]],color);
    for(let k=0;k<5;k++){const yy=-ht*(.32+k*.12),direction=k%2?1:-1;c.strokeStyle=color;c.lineWidth=4-k*.5;c.beginPath();c.moveTo(xx,yy+20);c.quadraticCurveTo(xx+direction*ww*.3,yy+5,xx+direction*ww*.65,yy-10);c.stroke();}
    if(a.detail>.25){
     c.fillStyle=color;c.beginPath();c.moveTo(xx,-ht-10);c.bezierCurveTo(xx-ww*.9,-ht*.93,xx-ww*1.2,-ht*.5,xx-ww*.5,-ht*.47);c.bezierCurveTo(xx-ww*.1,-ht*.35,xx+ww,-ht*.45,xx+ww*.8,-ht*.7);c.quadraticCurveTo(xx+ww*.55,-ht*1.03,xx,-ht-10);c.fill();
    }
   }else if(biome==='crystal'||biome==='mirrors'){
    polygon(c,[[0,0],[6,-ht*.78],[ww*.5,-ht],[ww,-ht*.72],[ww+12,0]],color,s.accent+'14');
    line(c,[[ww*.5,-ht],[ww*.42,0]],s.accent+'18');
   }else if(biome==='arches'||biome==='coast'){
    c.strokeStyle=color;c.lineWidth=18;c.beginPath();c.moveTo(0,0);c.lineTo(0,-ht*.65);c.bezierCurveTo(0,-ht,ww,-ht,ww,-ht*.65);c.lineTo(ww,0);c.stroke();
    line(c,[[0,-ht*.65],[0,-ht*.78],[ww*.3,-ht*.95]],s.accent+'20');
   }else if(biome==='city'||biome==='machine'){
    polygon(c,[[0,0],[0,-ht],[ww*.6,-ht-9],[ww,-ht],[ww,0]],color);
    c.fillStyle=s.accent+'20';for(let k=0;k<4;k++)c.fillRect(8,-ht+18+k*22,Math.max(3,ww-16),1);
    if(a.detail>.55)line(c,[[ww*.5,-ht],[ww*.5,-ht-35],[ww*.5+15,-ht-35]],s.accent+'22');
   }else if(biome==='space'){
    polygon(c,[[0,-ht*.4],[ww*.3,-ht*.7],[ww,-ht*.64],[ww*1.3,-ht*.35],[ww*.6,-ht*.17]],color,s.accent+'10');
    line(c,[[ww*.3,-ht*.7],[ww*.6,-ht*.17]],s.accent+'12');
   }else{
    polygon(c,[[0,0],[ww*.12,-ht*.6],[ww*.48,-ht],[ww*.8,-ht*.85],[ww,0]],color);
    line(c,[[ww*.48,-ht],[ww*.54,-ht*.4],[ww*.8,-ht*.2]],s.accent+'1b');
   }
   c.restore();
  }
  this.tiles.set(key,b);while(this.tiles.size>12)this.tiles.delete(this.tiles.keys().next().value);return b;
 }
 landmark(c,x,y,size,kind,time){
  if(x<-260*size||x>this.w+260*size)return;
  const s=this.scene;c.save();c.translate(x,y);c.scale(size,size);c.lineWidth=1.2;
  const dark=s.sky,ink=s.accent+'60',pale=s.light+'8c';
  bloom(c,0,-45,170,s.accent+'0e');
  const arch=(xx,yy,w,h)=>{c.strokeStyle=ink;c.lineWidth=8;c.beginPath();c.moveTo(xx-w,yy);c.lineTo(xx-w,yy-h*.66);c.bezierCurveTo(xx-w,yy-h,xx+w,yy-h,xx+w,yy-h*.66);c.lineTo(xx+w,yy);c.stroke();};
  const disk=(xx,yy,r,col)=>{c.fillStyle=col;c.beginPath();c.arc(xx,yy,r,0,TAU);c.fill();};
  const ring=(r,ry=r,rot=0)=>{c.strokeStyle=ink;c.lineWidth=2;c.beginPath();c.ellipse(0,-70,r,ry,rot,0,TAU);c.stroke();};
  switch(kind){
   case 'gate':arch(0,55,54,180);arch(0,55,69,200);line(c,[[-40,-84],[40,-84]],pale);break;
   case 'tree':case 'roots':{
    // A filled, asymmetrical old tree, not an instructional wireframe.
    polygon(c,[[-27,100],[-9,2],[-24,-65],[5,-165],[8,-55],[21,-2],[39,100]],dark,ink);
    for(let i=0;i<7;i++){const k=i%2?1:-1,yy=30-i*21;c.strokeStyle=dark;c.lineWidth=13-i;c.beginPath();c.moveTo(2,yy+18);c.bezierCurveTo(k*40,yy,k*55,yy-25,k*(65+i*6),yy-55);c.stroke();}
    if(kind==='tree'){
     c.fillStyle=dark;c.strokeStyle=ink;c.lineWidth=.7;c.beginPath();c.moveTo(-122,-35);c.bezierCurveTo(-160,-70,-104,-134,-72,-128);c.bezierCurveTo(-94,-188,16,-201,49,-165);c.bezierCurveTo(102,-185,163,-105,131,-69);c.bezierCurveTo(168,-34,96,-5,66,-23);c.bezierCurveTo(15,5,-20,-35,-43,-24);c.quadraticCurveTo(-91,-6,-122,-35);c.fill();c.stroke();
     for(let i=0;i<13;i++){const a=i*2.4;disk(Math.sin(a)*105,-75+Math.cos(a)*54,1.3,s.light+'60');}
    }else for(let i=-2;i<=2;i++)line(c,[[0,45],[i*33,90],[i*55,103]],pale,2);
    break;
   }
   case 'aqueduct':for(let i=-2;i<=2;i++)arch(i*65,65,30,130+(i+2)*9);line(c,[[-165,-85],[165,-85]],pale,2);break;
   case 'lighthouse':polygon(c,[[-23,85],[-14,-95],[14,-95],[23,85]],dark,ink);polygon(c,[[-23,-95],[0,-119],[23,-95]],dark,pale);c.fillStyle=s.light+'20';c.fillRect(-12,-93,24,19);polygon(c,[[0,-80],[200,-110],[200,-65]],s.light+'09');break;
   case 'crystal':for(let i=-2;i<=2;i++){const xx=i*32,ht=80+(2-Math.abs(i))*45;polygon(c,[[xx-20,60],[xx-13,60-ht],[xx+3,40-ht],[xx+20,60-ht*.8],[xx+15,60]],dark,ink);}break;
   case 'sun':disk(0,-85,60,s.light+'12');ring(72);for(let i=0;i<12;i++){const a=i/12*TAU;line(c,[[Math.cos(a)*85,-70+Math.sin(a)*85],[Math.cos(a)*99,-70+Math.sin(a)*99]],pale,2);}arch(0,95,90,100);break;
   case 'observatory':c.strokeStyle=ink;c.lineWidth=2;c.beginPath();c.arc(0,0,82,Math.PI,TAU);c.fillStyle=dark;c.fill();c.stroke();line(c,[[-82,0],[-65,85],[65,85],[82,0],[-82,0]],ink,2);line(c,[[-15,-20],[45,-95],[64,-84],[5,-8]],pale,4);break;
   case 'wheel':ring(100);ring(79);for(let i=0;i<12;i++){const a=i/12*TAU+.12;line(c,[[Math.cos(a)*27,-70+Math.sin(a)*27],[Math.cos(a)*96,-70+Math.sin(a)*96]],ink,5);}disk(0,-70,25,dark);break;
   case 'twins':for(const k of [-1,1]){polygon(c,[[k*42-22,85],[k*42-12,-145],[k*42,-177],[k*42+12,-145],[k*42+22,85]],dark,ink);}line(c,[[-42,-70],[42,-70]],pale);break;
   case 'stairs':for(let i=0;i<9;i++){c.fillStyle=dark;c.fillRect(-140+i*32,45-i*18,34,20);line(c,[[-140+i*32,45-i*18],[-108+i*32,45-i*18]],ink,2);}break;
   case 'heart':ring(85,102);polygon(c,[[0,-146],[38,-74],[0,2],[-38,-74]],dark,pale);line(c,[[0,-146],[0,2]],ink);break;
   case 'rail':line(c,[[-190,20],[190,20]],ink,9);for(let i=-3;i<=3;i++)line(c,[[i*52,25],[i*52,95]],ink,5);polygon(c,[[-110,-28],[92,-28],[115,14],[-120,14]],dark,ink);for(let i=-2;i<3;i++){c.fillStyle=s.light+'35';c.fillRect(i*36,-17,23,11);}break;
   case 'shaft':for(const k of [-1,1]){line(c,[[k*64,90],[k*64,-150]],ink,8);for(let i=0;i<6;i++)line(c,[[k*64,75-i*40],[-k*64,35-i*40]],ink);}c.strokeStyle=pale;c.strokeRect(-35,-70,70,55);break;
   case 'grid':for(let i=-3;i<=3;i++){line(c,[[i*35,75],[i*35,-150]],ink);line(c,[[-105,65-(i+3)*35],[105,65-(i+3)*35]],ink);}disk(0,-45,30,s.light+'16');break;
   case 'city':for(let i=-3;i<=3;i++){const yy=-85-(3-Math.abs(i))*32;polygon(c,[[i*35-13,85],[i*35-13,yy],[i*35+10,yy-15],[i*35+15,85]],dark,ink);}break;
   case 'cathedral':arch(0,85,48,220);for(const k of [-1,1])polygon(c,[[k*85-15,90],[k*85-11,-100],[k*85,-140],[k*85+11,-100],[k*85+15,90]],dark,ink);ring(30);break;
   case 'sentinel':polygon(c,[[-50,90],[-39,-65],[-18,-90],[18,-90],[39,-65],[50,90]],dark,ink);disk(0,-119,35,dark);line(c,[[-17,-120],[17,-120]],pale,4);for(const k of [-1,1])line(c,[[k*37,-60],[k*80,-4],[k*73,55]],ink,15);break;
   case 'vessel':c.fillStyle=dark;c.beginPath();c.ellipse(0,-70,140,26,-.12,0,TAU);c.fill();c.strokeStyle=ink;c.stroke();c.beginPath();c.ellipse(-8,-90,48,32,0,Math.PI,TAU);c.fillStyle=dark;c.fill();c.stroke();line(c,[[-100,-62],[95,-78]],ink);line(c,[[-75,-53],[84,-66]],s.light+'20');for(let i=-3;i<=3;i++)disk(i*32,-58,2,s.light+'7a');break;
   case 'dish':c.strokeStyle=ink;c.lineWidth=5;c.beginPath();c.arc(0,-90,83,0,Math.PI);c.stroke();line(c,[[0,-6],[0,90]],ink,9);line(c,[[0,-6],[0,-100],[60,-135]],pale,2);break;
   case 'floating':for(let i=-1;i<=1;i++){const xx=i*85,yy=-20-Math.abs(i)*65;polygon(c,[[xx-47,yy],[xx+49,yy-8],[xx+14,yy+42],[xx-10,yy+24]],dark,ink);line(c,[[xx,yy],[xx-3,yy-44],[xx-22,yy-65]],ink,6);}break;
   case 'eclipse':bloom(c,0,-70,110,s.light+'25');disk(0,-70,73,s.light+'a0');disk(9,-76,72,dark);break;
   case 'meteor':for(let i=0;i<4;i++){const xx=-110+i*68,yy=-120+i*20;line(c,[[xx-55,yy-90],[xx,yy]],s.light+'35',2);disk(xx,yy,3,pale);}break;
   case 'rift':polygon(c,[[-28,60],[17,-5],[-10,-53],[37,-155],[8,-65],[30,-8]],s.light+'30',pale);break;
   case 'mirrors':for(let i=-2;i<=2;i++){c.save();c.translate(i*52,Math.abs(i)*16);c.rotate(i*.12);c.fillStyle=dark;c.fillRect(-16,-150,32,210);c.strokeStyle=ink;c.strokeRect(-16,-150,32,210);line(c,[[-13,-140],[13,40]],s.light+'20');c.restore();}break;
   case 'inverted':for(let i=-2;i<=2;i++){polygon(c,[[i*48-22,-140],[i*48+23,-140],[i*48+14,-10-Math.abs(i)*40],[i*48,-Math.abs(i)*40],[i*48-14,-10-Math.abs(i)*40]],dark,ink);}break;
   case 'maze':for(let i=0;i<5;i++)line(c,[[-125+i*25,70],[-125+i*25,-150+i*25],[125-i*25,-150+i*25],[125-i*25,70-i*20]],ink,4);break;
   case 'debris':for(let i=0;i<9;i++){const a=i*2.4,xx=Math.sin(a)*115,yy=-70+Math.cos(a)*80;polygon(c,[[xx-14,yy],[xx-2,yy-19],[xx+21,yy-8],[xx+12,yy+17]],dark,ink);}break;
   case 'crown':polygon(c,[[-100,30],[-120,-115],[-55,-65],[0,-170],[55,-65],[120,-115],[100,30]],dark,ink);line(c,[[-85,7],[85,7]],pale,2);break;
   case 'core':ring(100,110);ring(75,92,.2);ring(50,80,-.4);disk(0,-70,21,s.light+'af');bloom(c,0,-70,65,s.light+'30');break;
  }
  c.restore();
 }
 draw(c,{id,w,h,f,camera,length,time,reduced,low,menu=false}){
  this.configure(id,w,h,f);const s=this.scene;c.drawImage(this.sky,0,0,w,h);
  // Celestial objects travel once through the view, never wrap at a period.
  const celestialX=w*.78-camera*.012,celestialY=f*.2;
  bloom(c,celestialX,celestialY,78,s.light+'15');const radius=24+(id%6)*3,moon=c.createRadialGradient(celestialX-radius*.4,celestialY-radius*.4,1,celestialX,celestialY,radius);moon.addColorStop(0,s.light+'60');moon.addColorStop(.85,s.light+'24');moon.addColorStop(1,s.sky+'88');c.fillStyle=moon;c.beginPath();c.arc(celestialX,celestialY,radius,0,TAU);c.fill();
  if(id%3===0){c.strokeStyle=s.light+'32';c.beginPath();c.ellipse(celestialX,celestialY,64,14,-.32,0,TAU);c.stroke();}
  for(let layer=0;layer<(low?2:3);layer++){
   const factor=[.055,.13,.25][layer],scroll=camera*factor,first=Math.floor(scroll/640);
   c.globalAlpha=[.45,.65,.82][layer];for(let index=first;index<=(scroll+w)/640;index++)c.drawImage(this.tile(layer,index),index*640-scroll,0);
   c.globalAlpha=1;
   if(layer===1){
    const px=(menu?(w<h?w*.53:w*.76):w*.72)-camera*.18;
    const size=Math.min(w/840,h/580)*.9;
    this.landmark(c,px,f-80-size*100,size,s.landmark,time);
    if(!menu){
     // Secondary landmarks are different objects, each placed only once.
     this.landmark(c,w*.65+length*.47*.18-camera*.18,f-150,.7,id%2?'gate':'crystal',time);
     this.landmark(c,w*.65+length*.88*.18-camera*.18,f-152,.72,id%2?'rift':'twins',time);
    }
   }
  }
  const fog=c.createLinearGradient(0,f-100,0,f+30);fog.addColorStop(0,'transparent');fog.addColorStop(.6,s.accent+'0b');fog.addColorStop(1,'transparent');c.fillStyle=fog;c.fillRect(0,f-100,w,130);
  if(!reduced){
   const r=random(s.seed+33),n=low?12:25;
   c.strokeStyle=s.light+'30';c.fillStyle=s.accent+'60';
   for(let i=0;i<n;i++){
    const px=r()*w,py=r()*f*.9,phase=r()*6.28;
    if(s.weather==='rain'){const y=(py+time*(95+i%5*8))%(f+40);line(c,[[px,y],[px-3,y+12]],s.light+'22');}
    else if(s.weather==='meteors'){const t=(time*.14+phase)%6;if(t<1){const x=px+t*80,y=py+t*100;line(c,[[x-15,y-20],[x,y]],s.light+'50');}}
    else if(s.weather!=='mist'){const y=py+Math.sin(time*.4+phase)*14,x=px+Math.sin(time*.16+phase)*18;c.globalAlpha=s.weather==='fireflies'?.25+.5*Math.sin(time*.65+phase)**2:.45;c.beginPath();c.arc(x,y,s.weather==='snow'?1.5:1,0,TAU);c.fill();}
   }c.globalAlpha=1;
  }
 }
}
