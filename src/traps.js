import {drawFalling} from './visuals.js';
const TAU=Math.PI*2;
function shape(c,points,fill,stroke){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.stroke();}}
function circle(c,x,y,r,fill,stroke){c.beginPath();c.arc(x,y,r,0,TAU);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.stroke();}}
/** Physical silhouettes match the existing collider envelopes; trim is cosmetic. */
export function drawMachinery(c,o,run,x,f,time,reduced=false){
 c.save();c.lineJoin='round';c.lineWidth=1;
 if(o.kind==='spike'){
  const base=c.createLinearGradient(0,f-6,0,f+6);base.addColorStop(0,'#52606a');base.addColorStop(1,'#172536');
  shape(c,[[x-5,f-4],[x+o.w+5,f-4],[x+o.w+8,f+6],[x-8,f+6]],base,'#76858b');
  for(let i=0;i<3;i++){
   const xx=x+i*18,metal=c.createLinearGradient(xx,0,xx+17,0);metal.addColorStop(0,'#7e6980');metal.addColorStop(.45,'#e6c4c4');metal.addColorStop(.5,'#937887');metal.addColorStop(1,'#424056');
   shape(c,[[xx,f],[xx+8,f-32],[xx+17,f]],metal,'#e3c0c58a');
   c.strokeStyle='#ff9fae';c.beginPath();c.moveTo(xx+8,f-27);c.lineTo(xx+8,f-8);c.stroke();
   circle(c,xx+8,f+2,1.2,'#d2adb0');
  }
 }else if(o.kind==='laser'){
  for(const xx of [x,x+o.w]){
   const housing=c.createLinearGradient(xx-6,0,xx+6,0);housing.addColorStop(0,'#566070');housing.addColorStop(.45,'#303b50');housing.addColorStop(1,'#182638');
   c.fillStyle=housing;c.beginPath();c.roundRect(xx-5,f-35,10,37,2);c.fill();
   for(const yy of [f-29,f-16,f-4]){circle(c,xx,yy,2.4,'#ffa8bd');circle(c,xx,yy,1,'#fff3e8');}
   c.strokeStyle='#a2abb85a';c.beginPath();c.moveTo(xx-5,f-33);c.lineTo(xx+5,f-33);c.stroke();
  }
  const field=c.createLinearGradient(0,f-32,0,f);field.addColorStop(0,'#ff99bb18');field.addColorStop(.5,'#ee629d29');field.addColorStop(1,'#ff99bb18');c.fillStyle=field;c.fillRect(x,f-30,o.w,30);
  for(let i=0;i<3;i++){const y=f-29+i*12.5;c.strokeStyle='#ff6d9c44';c.lineWidth=5;c.beginPath();c.moveTo(x,y);c.lineTo(x+o.w,y);c.stroke();c.strokeStyle='#ffbfd1';c.lineWidth=1;c.stroke();}
  if(!reduced){for(let i=0;i<3;i++){const p=((time*.8+i/3)%1);circle(c,x+o.w*p,f-29+i*12.5,1,'#fff4ec');}}
 }else if(o.kind==='saw'){
  const sx=x+22+Math.sin(run.t*2.6+o.phase)*18,sy=f-23;
  c.strokeStyle='#32495a';c.lineWidth=6;c.beginPath();c.moveTo(x-21,sy);c.lineTo(x+o.w+21,sy);c.stroke();c.strokeStyle='#9a819088';c.lineWidth=1;c.stroke();
  for(const xx of [x-22,x+o.w+22]){circle(c,xx,sy,3,'#70828e','#b4bbc6');c.fillStyle='#263b4b';c.fillRect(xx-2,sy+4,4,18);}
  c.translate(sx,sy);c.rotate(reduced?0:time*5);const teeth=[];
  for(let i=0;i<48;i++){const a=i/48*TAU,r=i%3===0?23:i%3===1?21:16.5;teeth.push([Math.cos(a)*r,Math.sin(a)*r]);}
  const steel=c.createLinearGradient(-22,-23,22,23);steel.addColorStop(0,'#dce1e0');steel.addColorStop(.4,'#81909d');steel.addColorStop(.55,'#c6afbb');steel.addColorStop(1,'#5d6479');
  c.lineWidth=.8;shape(c,teeth,steel,'#ffe3e5');circle(c,0,0,13,'#344356','#be94a6');
  for(let i=0;i<4;i++){const a=i*Math.PI/2;circle(c,Math.cos(a)*8,Math.sin(a)*8,2.1,'#111e2b','#748b9b');}
  circle(c,0,0,5,'#eca2b5','#ffddc6');circle(c,-1,-1,1.5,'#fff4df');
 }
 c.restore();
}
/** Author-only preview: the game itself keeps no tutorial overlays on custom maps. */
export function drawDropPreview(c,o,cam,f){drawFalling(c,o,{fallBody:()=>({y:82,age:.5,landed:false,expired:false})},cam,f,true);}
