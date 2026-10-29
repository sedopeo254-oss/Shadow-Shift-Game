import {SKINS,DIRECTIONS} from './content.js';
import {Scenery,tutorialFor} from './scenery.js';
const TAU=Math.PI*2;
const round=(c,x,y,w,h,r)=>{c.beginPath();c.roundRect(x,y,w,h,r);};
function poly(c,points,fill,stroke){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}}
function glow(c,x,y,r,color){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
export function drawHero(c,x,y,scale,time,character='boy',accent='#83f8da',running=false,air=false,alpha=1){
 c.save();c.translate(x,y);c.scale(scale,scale);c.globalAlpha=alpha;
 const stride=running&&!air?Math.sin(time*18):0,bob=running&&!air?Math.abs(Math.sin(time*18))*2:Math.sin(time*2)*1.3;
 c.translate(0,-bob);c.lineCap='round';c.lineJoin='round';
 // Two ribbons follow the same spine; no independent sprite flicker.
 c.fillStyle=accent;c.globalAlpha=alpha*.8;c.beginPath();c.moveTo(-6,-43);c.bezierCurveTo(-27,-42,-39,-29+Math.sin(time*5)*6,-53,-40);c.bezierCurveTo(-40,-17,-24,-22,-5,-33);c.fill();
 c.globalAlpha=alpha*.32;c.beginPath();c.moveTo(-7,-40);c.bezierCurveTo(-31,-22,-35,-27,-62,-20+Math.sin(time*4)*5);c.lineTo(-38,-14);c.quadraticCurveTo(-20,-17,0,-31);c.fill();c.globalAlpha=alpha;
 // Legs and boots use the exact same collision scale for both characters.
 for(let i=0;i<2;i++){const sign=i?1:-1,dx=air?(i?9:-13):stride*12*sign;
  c.strokeStyle=i?'#162333':'#0c1524';c.lineWidth=8;c.beginPath();c.moveTo(sign*5,-20);c.lineTo(dx,-9);c.lineTo(dx+(air?7:sign*3),-3);c.stroke();
  c.strokeStyle='#d3e7ea';c.lineWidth=3;c.beginPath();c.moveTo(dx-2,-2);c.lineTo(dx+8,-2);c.stroke();
 }
 poly(c,[[-12,-42],[9,-43],[16,-18],[2,-22],[-14,-17]],'#17283a','#3a5360');
 poly(c,[[0,-41],[9,-43],[16,-18],[3,-23]],'#0a1627');
 c.strokeStyle=accent;c.lineWidth=2;c.beginPath();c.moveTo(-7,-36);c.lineTo(-4,-26);c.stroke();
 c.strokeStyle='#243a4d';c.lineWidth=7;c.beginPath();c.moveTo(8,-37);c.lineTo(11-stride*8,-27);c.lineTo(16-stride*8,-26);c.stroke();
 c.fillStyle='#cddfe4';c.beginPath();c.arc(16-stride*8,-26,3,0,TAU);c.fill();
 // Hood silhouette, porcelain visor, and asymmetric hair lock.
 c.fillStyle='#102133';c.beginPath();c.ellipse(0,-51,17,18,-.12,0,TAU);c.fill();
 c.strokeStyle='#456078';c.lineWidth=1;c.stroke();
 c.fillStyle='#d9ebef';c.beginPath();c.ellipse(4,-51,12.5,12.8,-.12,0,TAU);c.fill();
 poly(c,[[-11,-59],[-2,-68],[11,-65],[14,-59],[4,-61],[-2,-54]],character==='girl'?'#a2b8db':'#e1eef4');
 if(character==='girl'){
  c.fillStyle='#a2b8db';c.beginPath();c.moveTo(-12,-58);c.bezierCurveTo(-30,-64,-31,-40,-38,-42+Math.sin(time*6)*4);c.quadraticCurveTo(-14,-37,-12,-58);c.fill();
 }
 c.fillStyle='#102235';round(c,-2,-53,16,7,3);c.fill();
 c.fillStyle=accent;round(c,0,-52,4,3,1);c.fill();round(c,8,-52,4,3,1);c.fill();
 c.fillStyle=accent;round(c,-12,-42,24,5,2);c.fill();
 c.fillStyle='#f8dba3';c.beginPath();c.arc(6,-39,2.5,0,TAU);c.fill();c.restore();
}
export class Renderer{
 constructor(canvas){this.canvas=canvas;this.c=canvas.getContext('2d',{alpha:false});this.w=960;this.h=600;this.floor=420;this.particles=[];this.world=-1;this.bg=null;this.settings={};this.frames=0;this.mean=16;this.cap=1.75;this.scenery=new Scenery();this.tutorial=false;this.resize();}
 resize(){const rect=this.canvas.getBoundingClientRect();this.cssW=Math.max(1,rect.width);this.cssH=Math.max(1,rect.height);this.w=this.cssW<this.cssH?660:Math.max(960,Math.min(1360,this.cssW/this.cssH*600));this.scale=this.cssW/this.w;this.h=this.cssH/this.scale;this.floor=this.h*(this.cssW<this.cssH?.65:.76);const dpr=Math.min(devicePixelRatio||1,this.settings.quality==='low'?1:this.cap);this.canvas.width=Math.round(this.cssW*dpr);this.canvas.height=Math.round(this.cssH*dpr);this.ratio=this.canvas.width/this.w;this.bg=null;}
 configure(settings){const old=this.settings.quality;this.settings={...settings};if(old!==settings.quality)this.resize();}
 burst(x,y,color,n=14){if(this.settings.reduced)return;for(let i=0;i<n&&this.particles.length<100;i++){const a=Math.random()*TAU;this.particles.push({x,y,vx:Math.cos(a)*100,vy:Math.sin(a)*130,life:.7,max:.7,color});}}
 background(c,time,id,camera,menu,length=12000){
  this.scenery.draw(c,{id,w:this.w,h:this.h,f:this.floor,camera,length,time,reduced:this.settings.reduced,low:this.settings.quality==='low',menu});
 }
 platform(c,left,right,f,accent){
 if(right<=left)return;const w=right-left;
 const g=c.createLinearGradient(0,f,0,f+170);g.addColorStop(0,'#243a4a');g.addColorStop(.12,'#132638');g.addColorStop(1,'#070e1b');
 c.fillStyle=g;c.fillRect(left,f,w,this.h-f);c.fillStyle='#456171';c.fillRect(left,f,w,3);c.fillStyle=accent+'77';c.fillRect(left,f+3,w,1);
 c.fillStyle='#0a1826';for(let x=Math.floor(left/82)*82;x<right;x+=82){if(x>=left){c.fillRect(x,f+17,1,36);poly(c,[[x+5,f+11],[Math.min(x+72,right),f+11],[Math.min(x+60,right),f+30],[x+5,f+30]],'#192d3c');}}
 c.strokeStyle='#2a4252';c.lineWidth=1;c.beginPath();c.moveTo(left,f+44);c.lineTo(right,f+44);c.stroke();
 c.fillStyle=accent+'99';for(let x=left+24;x<right-10;x+=160)c.fillRect(x,f+47,18,2);
 }
 bridge(c,o,x,f,active,t,accent){
 c.strokeStyle=active?accent:'#74798c';c.lineWidth=active?3:1;c.setLineDash(active?[]:[7,7]);c.beginPath();c.moveTo(x,f);c.lineTo(x+o.w,f);c.stroke();c.setLineDash([]);
 if(active){const g=c.createLinearGradient(0,f,0,f+42);g.addColorStop(0,accent+'37');g.addColorStop(1,accent+'00');c.fillStyle=g;c.fillRect(x,f,o.w,42);c.strokeStyle=accent+'30';c.lineWidth=1;
  for(let i=0;i<o.w;i+=24){c.beginPath();c.moveTo(x+i,f+3);c.lineTo(x+i+12,f+20);c.lineTo(Math.min(x+i+24,x+o.w),f+3);c.stroke();}
 }else if(this.tutorial){c.fillStyle='#a7b4cc55';c.font='10px Tahoma';c.textAlign='center';c.fillText('ظل غير مكتمل',x+o.w/2,f+30);}
 for(const a of [x-12,x+o.w+12]){poly(c,[[a-8,f],[a-5,f-26],[a,f-34],[a+5,f-26],[a+8,f]],'#192c43',accent+'55');glow(c,a,f-26,22,accent+'30');}
 if(o.fake){c.strokeStyle='#f4ce8555';c.setLineDash([3,10]);c.beginPath();c.moveTo(x,f-35);c.lineTo(x+o.w,f-35);c.stroke();c.setLineDash([]);}
 }
 marker(c,x,y,text,color){if(!this.tutorial)return;c.font='bold 13px Tahoma';c.textAlign='center';const width=c.measureText(text).width+24;c.fillStyle='#07101de6';round(c,x-width/2,y-18,width,29,9);c.fill();c.strokeStyle=color+'55';c.lineWidth=1;c.stroke();c.fillStyle=color;c.fillText(text,x,y+1);}
 obstacle(c,o,run,cam,t,accent){
 const x=o.x-cam,f=this.floor,active=run.aligned(o),danger='#ff8d9c',distance=o.x-run.x;
 if(x+o.w<-70||x>this.w+70)return;
 if(o.kind==='bridge'){
  this.bridge(c,o,x,f,active,t,accent);
  this.marker(c,x+o.w/2,f-66,`${['◀','◆','▶'][o.required+1]} ${DIRECTIONS[o.required+1]}`,active?accent:'#f4ce85');return;
 }
 if(o.kind==='gravity'){
  const g=c.createLinearGradient(0,f-220,0,f);g.addColorStop(0,'#afa7ff00');g.addColorStop(1,'#afa7ff19');c.fillStyle=g;c.fillRect(x,f-220,o.w,220);
  c.strokeStyle='#bdb2ff44';c.setLineDash([5,8]);c.strokeRect(x,f-220,o.w,220);c.setLineDash([]);
  c.fillStyle='#bdb2ff44';for(let i=0;i<6;i++){const yy=f-35-((t*20+i*27)%150);c.fillRect(x+25+i*55,yy,1,8);}
  this.marker(c,x+o.w/2,f-237,'جاذبية خفيفة','#c3b7ff');return;
 }
 if(o.kind==='ufo'){
  const mid=x+o.w/2,top=f-220,col=active?accent:'#b5a0ff';
  const beam=c.createLinearGradient(0,top+10,0,f);beam.addColorStop(0,col+'66');beam.addColorStop(1,col+'0a');
  poly(c,[[mid-16,top+8],[mid+16,top+8],[x+o.w,f],[x,f]],beam);
  c.strokeStyle=col+'66';c.setLineDash([6,8]);c.beginPath();c.moveTo(x,f);c.lineTo(mid-16,top+8);c.moveTo(x+o.w,f);c.lineTo(mid+16,top+8);c.stroke();c.setLineDash([]);
  glow(c,mid,top,100,col+'44');c.fillStyle='#1f2946';c.beginPath();c.ellipse(mid,top,86,19,0,0,TAU);c.fill();c.strokeStyle='#9ba8d8';c.lineWidth=2;c.stroke();
  c.fillStyle='#345272';c.beginPath();c.ellipse(mid,top-12,34,24,0,Math.PI,TAU);c.fill();c.strokeStyle='#adc0f0';c.stroke();
  for(let i=-2;i<=2;i++){c.fillStyle=col;c.beginPath();c.ellipse(mid+i*28,top+5,5,2,0,0,TAU);c.fill();}
  c.strokeStyle=col;c.lineWidth=2;c.beginPath();c.ellipse(mid,f,o.w/2,10,0,0,TAU);c.stroke();
  if(active){c.strokeStyle=accent;c.lineWidth=4;c.beginPath();c.ellipse(mid,f-80,o.w*.7,20,0,Math.PI,TAU);c.stroke();glow(c,mid,f-90,90,accent+'22');}
  this.marker(c,mid,top-55,`${active?'درع الظل':'اختطاف'} · ${DIRECTIONS[o.required+1]}`,active?accent:'#f0bcff');return;
 }
 if(o.kind==='gate'){
  c.fillStyle='#223249';c.fillRect(x-9,f-162,8,162);c.fillRect(x+o.w+2,f-162,8,162);c.fillStyle=active?accent:danger;c.fillRect(x-10,f-164,o.w+21,4);
  if(!active){c.fillStyle=danger+'55';c.fillRect(x,f-158,o.w,158);c.fillStyle=danger;c.fillRect(x+o.w/2-1,f-158,2,158);glow(c,x+o.w/2,f-80,48,danger+'22');}
  else{c.strokeStyle=accent+'66';c.setLineDash([3,8]);c.strokeRect(x,f-158,o.w,158);c.setLineDash([]);}
  this.marker(c,x+o.w/2,f-187,`${active?'مفتوحة':'حاذِ الضوء'} · ${DIRECTIONS[o.required+1]}`,active?accent:'#f4ce85');return;
 }
 glow(c,x+o.w/2,f,70,danger+'16');
 if(o.kind==='spike'){
  c.fillStyle='#3b2437';c.fillRect(x-6,f-5,o.w+12,9);
  for(let i=0;i<3;i++){const xx=x+i*18;poly(c,[[xx,f],[xx+8,f-32],[xx+17,f]],'#f48b9a','#ffc3c4');poly(c,[[xx+8,f-32],[xx+8,f],[xx+17,f]],'#a34c72');}
 }else if(o.kind==='laser'){
  for(const xx of [x,x+o.w]){c.fillStyle='#2c2a40';round(c,xx-5,f-35,10,36,3);c.fill();c.fillStyle=danger;c.fillRect(xx-3,f-32,6,4);}
  c.fillStyle=danger+'38';c.fillRect(x,f-28,o.w,26);c.fillStyle='#ffc2d0';c.fillRect(x,f-28,o.w,2);c.fillStyle='#ff6988';c.fillRect(x,f-15,o.w,2);c.fillRect(x,f-4,o.w,2);
 }else if(o.kind==='saw'){
  const sx=x+22+Math.sin(run.t*2.6+o.phase)*18,sy=f-23;
  c.strokeStyle='#ac6179';c.lineWidth=2;c.beginPath();c.moveTo(x-22,f-22);c.lineTo(x+o.w+22,f-22);c.stroke();
  c.save();c.translate(sx,sy);c.rotate(t*5);const points=[];for(let i=0;i<32;i++){const a=i/32*TAU,r=i%2?17:23;points.push([Math.cos(a)*r,Math.sin(a)*r]);}poly(c,points,'#ca758e','#ffd7df');c.fillStyle='#302740';c.beginPath();c.arc(0,0,10,0,TAU);c.fill();c.fillStyle='#ffc3c4';c.beginPath();c.arc(0,0,3,0,TAU);c.fill();c.restore();
 }
 if(this.tutorial&&distance<380&&distance>-60){c.strokeStyle=danger+'80';c.setLineDash([4,5]);c.beginPath();c.moveTo(x-22,f+10);c.lineTo(x+o.w+22,f+10);c.stroke();c.setLineDash([]);}
 }
 paint(run,screen,time,save,delta=16){
 this.mean=this.mean*.97+delta*.03;this.frames++;
 if(this.settings.quality==='auto'&&this.frames===300&&this.mean>23&&this.cap>1.25){this.cap=1.25;this.resize();}
 const c=this.c;c.setTransform(this.ratio,0,0,this.ratio,0,0);
 const playing=['play','pause','result','ready','settings','confirm-import'].includes(screen)&&run;this.tutorial=tutorialFor(playing?run.level:null);
 const stage=playing?run.level.id:1,accent=SKINS[save.skin]?.color||'#83f8da';
 const cam=playing?Math.max(0,run.x-this.w*.24):0,t=this.settings.reduced?0:time;
 this.background(c,t,stage,cam,!playing,run?.level.length);
 if(!playing){
  const px=this.w<this.h?this.w*.56:this.w*.76,py=this.floor;
  this.platform(c,px-135,px+175,py,accent);
  poly(c,[[px-135,py+48],[px+175,py+48],[px+105,py+115],[px+60,py+150],[px+16,py+112],[px-75,py+120]],'#0d1b2b');
  glow(c,px,py-32,140,accent+'18');drawHero(c,px,py,2.15,t,save.character||'boy',accent);
  c.strokeStyle=accent+'55';c.lineWidth=1;c.beginPath();c.ellipse(px,py+2,75,10,0,0,TAU);c.stroke();return;
 }
 const f=this.floor,w=this.w;let from=0;
 const gaps=run.level.obstacles.filter(o=>o.kind==='bridge'&&o.x+o.w>cam&&o.x<cam+w);
 for(const o of gaps){this.platform(c,from,Math.max(0,o.x-cam),f,accent);from=Math.max(from,o.x+o.w-cam);}this.platform(c,from,w,f,accent);
 // Sun is deliberately small; its projection previews the next required bridge.
 const sunX=w*.48+run.sun*w*.19,sunY=Math.max(95,Math.min(f-240,this.h*.24));
 glow(c,sunX,sunY,55,'#ffdc8540');c.fillStyle='#ffe3a6';c.beginPath();c.arc(sunX,sunY,12,0,TAU);c.fill();c.strokeStyle='#ffe7ae66';c.lineWidth=1;c.beginPath();c.arc(sunX,sunY,19,0,TAU);c.stroke();
 const next=run.level.obstacles.find(o=>['bridge','gate','ufo'].includes(o.kind)&&o.x+o.w>run.x);
 if(this.tutorial&&next&&next.x-cam<w){c.strokeStyle='#ffe3a61c';c.lineWidth=1;c.beginPath();c.moveTo(sunX,sunY);c.lineTo(next.x-cam-12,f-30);c.stroke();}
 for(const o of run.level.obstacles)this.obstacle(c,o,run,cam,t,accent);
 for(const s of run.level.shards){const x=s.x-cam,y=f-s.y;if(x<-30||x>w+30||run.collected.has(s.id))continue;glow(c,x,y,32,'#ffe0a842');c.save();c.translate(x,y+Math.sin(t*3+s.id)*3);poly(c,[[0,-13],[9,0],[0,13],[-9,0]],'#ffe5a7','#fff3d4');poly(c,[[0,-13],[0,13],[9,0]],'#ce9c66');c.restore();}

 const endX=run.level.length-cam;if(endX<w+90){glow(c,endX,f-75,110,accent+'33');c.strokeStyle=accent;c.lineWidth=4;c.beginPath();c.ellipse(endX,f-70,32,70,0,0,TAU);c.stroke();c.strokeStyle='#f5e0b2';c.lineWidth=1;c.beginPath();c.ellipse(endX,f-70,40,78,0,0,TAU);c.stroke();this.marker(c,endX,f-170,'الخروج',accent);}
 const heroX=run.x-cam,heroY=f-run.y;
 c.fillStyle='#00000044';c.beginPath();c.ellipse(heroX,f+3,17+run.y*.015,4,0,0,TAU);c.fill();
 if(run.status!=='dead')drawHero(c,heroX,heroY,1,t,save.character||'boy',accent,run.status==='running',!run.grounded);
 for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i],dt=Math.min(delta/1000,.03);p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=180*dt;if(p.life<=0){this.particles.splice(i,1);continue;}c.globalAlpha=p.life/p.max;c.fillStyle=p.color;c.fillRect(p.x-cam,p.y,3,3);}c.globalAlpha=1;
 if(run.status==='dead'){c.fillStyle='#13091a33';c.fillRect(0,0,w,this.h);}
 }
}
