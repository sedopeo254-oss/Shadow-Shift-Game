import {sceneFor,sceneryCell} from './scenery.js';
const TAU=Math.PI*2;
function poly(c,p,fill,stroke){c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}}
export function drawTerrain(c,left,right,f,height,sceneId,cam=0){
 if(right<=left)return;
 const s=sceneFor(sceneId),forest=s.biome==='forest',metal=['city','machine'].includes(s.biome),glass=['crystal','mirrors'].includes(s.biome);
 c.save();c.beginPath();c.rect(left,f,right-left,height-f);c.clip();
 const face=c.createLinearGradient(0,f,0,f+210);face.addColorStop(0,forest?'#334a43':metal?'#304252':glass?'#37465d':'#354352');face.addColorStop(.13,s.sky);face.addColorStop(1,'#060e18');c.fillStyle=face;c.fillRect(left,f,right-left,height-f);
 // Absolute-world seams and details move with the floor, never slide under the hero.
 const first=Math.floor((left+cam)/112);
 for(let i=first;i<=(right+cam)/112;i++){
  const x=i*112-cam,d=sceneryCell(sceneId,7,i),depth=48+d.height*110;
  if(metal){
   poly(c,[[x+2,f+14],[x+105,f+14],[x+105,f+51],[x+90,f+66],[x+2,f+66]],'#192b3a','#5d7a8533');
   c.fillStyle='#98b0bc55';for(const xx of [x+10,x+97]){c.beginPath();c.arc(xx,f+22,1.5,0,TAU);c.fill();}
   c.fillStyle=s.accent+'32';c.fillRect(x+20,f+47,36,2);c.fillStyle='#091623';c.fillRect(x+65,f+20,24,27);
  }else{
   poly(c,[[x,f+10],[x+55+d.offset*30,f+10],[x+112,f+depth*.55],[x+69,f+depth],[x+5,f+depth*.8]],glass?'#27344955':'#24364377','#71859218');
   c.strokeStyle=s.accent+'25';c.lineWidth=1;c.beginPath();c.moveTo(x+22,f+9);c.lineTo(x+35+d.lean*20,f+36);c.lineTo(x+62,f+43);c.lineTo(x+48,f+depth*.7);c.stroke();
   if(glass)poly(c,[[x+70,f+20],[x+88,f+67],[x+77,f+93],[x+63,f+52]],s.accent+'18',s.light+'22');
   if(forest){c.strokeStyle='#5c706044';c.lineWidth=2;c.beginPath();c.moveTo(x+8,f+5);c.bezierCurveTo(x+10,f+38,x+28,f+34,x+17,f+80);c.stroke();}
  }
 }
 const lip=c.createLinearGradient(0,f,0,f+11);lip.addColorStop(0,forest?'#b1c5a3':glass?'#b6cbdc':'#a8b9bf');lip.addColorStop(.22,forest?'#647f68':'#516b78');lip.addColorStop(1,'#192b3b');c.fillStyle=lip;c.fillRect(left,f,right-left,10);
 c.fillStyle=s.accent+'44';c.fillRect(left,f+10,right-left,1);
 for(let i=first;i<=(right+cam)/112;i++){
  const x=i*112-cam,d=sceneryCell(sceneId,8,i);
  if(forest){c.fillStyle='#829d7955';c.beginPath();c.ellipse(x+30,f+4,18+d.width*21,3,0,0,TAU);c.fill();}
  else{c.fillStyle='#d7e5e321';c.fillRect(x+12,f+2,50+d.width*20,1);c.fillStyle='#0a1928aa';c.fillRect(x+2,f+1,2,7);}
 }
 c.restore();
 // Lit cut edges make gaps distinct without giving away their required direction.
 for(const x of [left,right]){c.strokeStyle=s.accent+'45';c.lineWidth=1;c.beginPath();c.moveTo(x,f+2);c.lineTo(x,f+28);c.stroke();}
}
export function drawCow(c,x,y,rotation=0,alpha=1){
 c.save();c.translate(x,y);c.rotate(rotation);c.globalAlpha=alpha;
 c.strokeStyle='#e7e6da';c.lineWidth=5;c.lineCap='round';
 c.beginPath();c.moveTo(-31,-31);c.quadraticCurveTo(-50,-43,-45,-54);c.stroke();c.strokeStyle='#454e59';c.lineWidth=4;c.beginPath();c.moveTo(-45,-54);c.lineTo(-49,-52);c.stroke();
 for(const lx of [-23,18]){c.fillStyle='#e0dfd3';c.fillRect(lx-4,-17,8,17);c.fillStyle='#354151';c.fillRect(lx-5,-5,10,5);}
 const coat=c.createLinearGradient(0,-53,0,-9);coat.addColorStop(0,'#fff9e8');coat.addColorStop(.55,'#e9e9de');coat.addColorStop(1,'#a9bdc0');c.fillStyle=coat;c.beginPath();c.ellipse(-5,-30,33,21,0,0,TAU);c.fill();c.strokeStyle='#b2bfc252';c.lineWidth=.8;c.stroke();
 c.fillStyle='#344355';c.beginPath();c.ellipse(-19,-33,11,14,-.5,0,TAU);c.fill();c.beginPath();c.ellipse(8,-25,10,8,.6,0,TAU);c.fill();
 c.fillStyle='#f4f0df';c.beginPath();c.ellipse(29,-37,16,19,-.2,0,TAU);c.fill();
 c.fillStyle='#aabbbd';c.beginPath();c.ellipse(12,-49,9,4,.4,0,TAU);c.fill();c.beginPath();c.ellipse(43,-49,8,4,-.5,0,TAU);c.fill();
 c.strokeStyle='#eed29f';c.lineWidth=3;c.beginPath();c.moveTo(22,-52);c.lineTo(20,-60);c.moveTo(35,-53);c.lineTo(38,-60);c.stroke();
 const muzzle=c.createLinearGradient(0,-34,0,-16);muzzle.addColorStop(0,'#f3c6b9');muzzle.addColorStop(1,'#bc8c8e');c.fillStyle=muzzle;c.beginPath();c.ellipse(32,-25,15,9,0,0,TAU);c.fill();
 c.fillStyle='#1a2938';for(const xx of [24,35]){c.beginPath();c.arc(xx,-40,2,0,TAU);c.fill();}for(const xx of [28,37]){c.beginPath();c.arc(xx,-24,1.4,0,TAU);c.fill();}
 c.restore();
}
export function drawFalling(c,o,run,cam,f,reduced=false){
 const b=run.fallBody(o);if(!b||b.expired)return;
 const x=o.x-cam+o.w/2,y=f-b.y,alpha=b.age>4?(4.5-b.age)*2:1;
 c.save();c.globalAlpha=alpha;
 if(!b.landed&&!reduced&&b.age>.2){c.strokeStyle='#d5e8eb36';c.lineWidth=1;for(const offset of [-o.w*.37,o.w*.38]){c.beginPath();c.moveTo(x+offset,y-65);c.lineTo(x+offset,y-105);c.stroke();}}
 c.fillStyle=o.kind==='meteor'?'#e4a0702e':'#080d1980';c.beginPath();c.ellipse(x,f+2,15+(350-b.y)/350*29,5,0,0,TAU);c.fill();
 if(o.kind==='cow')drawCow(c,x,y,!b.landed&&!reduced?Math.sin(b.age*4)*.22:0,alpha);
 else if(o.kind==='meteor'){
  if(!b.landed){const heat=c.createRadialGradient(x,y-30,1,x,y-30,63);heat.addColorStop(0,'#ffd29f3a');heat.addColorStop(1,'#ffc07a00');c.fillStyle=heat;c.fillRect(x-63,y-93,126,126);const flame=c.createLinearGradient(0,y-170,0,y);flame.addColorStop(0,'#f7be5e00');flame.addColorStop(.65,'#df865c55');flame.addColorStop(1,'#ffcd8999');poly(c,[[x-26,y-14],[x-19,y-90],[x-6,y-175],[x+10,y-95],[x+29,y-12]],flame);}
  poly(c,[[x-29,y-9],[x-28,y-30],[x-8,y-44],[x+19,y-37],[x+31,y-15],[x+20,y],[x-17,y]],'#584747','#efa773');
  poly(c,[[x-23,y-26],[x-8,y-40],[x+8,y-29],[x-4,y-15]],'#86746a');poly(c,[[x-4,y-15],[x+8,y-29],[x+26,y-16],[x+18,y-2]],'#433740');c.fillStyle='#2e3037';for(const v of [[-16,-16,4],[15,-24,3]]){c.beginPath();c.ellipse(x+v[0],y+v[1],v[2],v[2]*.7,-.3,0,TAU);c.fill();}
  c.strokeStyle='#ffc282';c.lineWidth=2;c.beginPath();c.moveTo(x+5,y-37);c.lineTo(x+1,y-18);c.lineTo(x+15,y-5);c.stroke();
 }else{
  c.fillStyle='#314958';c.fillRect(x-31,y-40,62,40);c.strokeStyle='#d3b891';c.lineWidth=3;c.strokeRect(x-29,y-38,58,36);c.beginPath();c.moveTo(x-28,y-37);c.lineTo(x+28,y-3);c.moveTo(x+28,y-37);c.lineTo(x-28,y-3);c.stroke();
 }
 if(b.landed&&b.age<1.2&&!reduced){const r=(b.age-.75)*130;c.strokeStyle='#c6b39233';c.lineWidth=2;c.beginPath();c.ellipse(x,f+2,Math.max(5,r),Math.max(2,r*.12),0,0,TAU);c.stroke();}
 c.restore();
}
