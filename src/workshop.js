import {MAP_KINDS,MAP_ENGINE,blankMap,obstacle,sanitizeMap,mapToLevel,mapKey,proofFor,MapLibrary,DEMO_MAPS} from './maps.js';
import {SCENES} from './scenery.js';
import {Run} from './core.js';
import {drawDropPreview} from './traps.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=x=>JSON.parse(JSON.stringify(x));
const $=id=>document.getElementById(id);
const buttons=(a,label,extra='')=>`<button class="secondary" data-work="${a}" ${extra}>${label}</button>`;
export class Workshop{
 constructor(app,storage){
  this.app=app;this.storage=storage;this.library=new MapLibrary(storage);this.draft=blankMap();this.proof=null;this.localId=null;this.history=[];this.future=[];this.tool='select';this.selected=-1;this.camera=0;this.source='local';this.rows=[];this.user=null;this.online=false;this.status='';this.busy=false;this.sort='popular';this.page=0;this.hasMore=false;this.activeMap=null;this.activeRemote=null;this.pendingPlay=null;
  try{const raw=storage.getItem('shadow-shift.editor.v1');if(raw)this.draft=sanitizeMap(JSON.parse(raw));}catch{}
  $('ui').addEventListener('click',e=>{const b=e.target.closest('[data-work]');if(b&&!b.disabled){e.preventDefault();this.act(b.dataset.work,b.dataset.value).catch(err=>app.toast(err.message||'تعذّر تنفيذ الإجراء'));}});
  $('ui').addEventListener('change',e=>{if(e.target.dataset.edit)this.edit(e.target.dataset.edit,e.target.value);});
  $('ui').addEventListener('input',e=>{if(e.target.id==='editor-scroll'){this.camera=+e.target.value;this.app.renderer.editorCamera=this.camera;}});
  const canvas=$('world');for(const type of ['pointerdown','pointermove','pointerup','pointercancel'])canvas.addEventListener(type,e=>this.pointer(e));
  this.input=document.createElement('input');this.input.type='file';this.input.accept='.json,.ssmap,application/json';this.input.hidden=true;document.body.append(this.input);
  this.input.addEventListener('change',async()=>{try{const f=this.input.files[0];if(!f)return;if(f.size>131072)throw Error('الملف كبير جدًا');const m=sanitizeMap(JSON.parse(await f.text()));this.openEditor(m,null);this.app.toast('تم الاستيراد؛ اختبر المرحلة قبل نشرها.');}catch(e){this.app.toast(e.message||'ملف غير صالح');}this.input.value='';});
 }
 remember(){try{this.storage.setItem('shadow-shift.editor.v1',JSON.stringify(this.draft));}catch{this.app.toast('تعذّر حفظ المسودة. استخدم تصدير.');}}
 pushHistory(){this.history.push(clone(this.draft));if(this.history.length>50)this.history.shift();this.future=[];}
 accept(next){try{const target=next.obstacles[this.selected];const clean=sanitizeMap(next);this.pushHistory();this.draft=clean;this.selected=target?clean.obstacles.findIndex(o=>o.kind===target.kind&&o.x===target.x):-1;this.proof=null;this.remember();this.preview();this.render();return true;}catch(e){this.app.toast(e.message);return false;}}
 preview(){const a=this.app;a.run=new Run(mapToLevel(this.draft));a.run.x=80;a.renderer.editorCamera=this.camera;}
 openEditor(map=null,id=null){
  const a=this.app;a.release();if(map){this.draft=sanitizeMap(map);this.localId=id;this.proof=this.library.items.find(e=>e.id===id)?.proof||null;this.history=[];this.future=[];this.camera=0;}
  this.selected=-1;a.screen='editor';a.mode='editor';a.accumulator=0;this.preview();a.render();
 }
 async api(path,method='GET',body){
  if(!['http:','https:'].includes(location.protocol))throw Error('المشاركة عبر الإنترنت تحتاج فتح اللعبة من خادم المجتمع. الملف المستقل يدعم التحرير والمشاركة كملف.');
  const r=await fetch('./api/v1/'+path,{method,credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(12000)});
  let j;try{j=await r.json();}catch{throw Error('خادم Player Maps غير متصل بهذا الموقع.');}if(!r.ok)throw Error(j.error||'تعذّر الاتصال');return j;
 }
 async gallery(source=this.source){
  this.app.release();this.app.screen='playerMaps';this.source=source;this.busy=false;this.status='';this.app.render();
  if(source==='online'){
   this.busy=true;this.render();try{const meta=await this.api('session');this.online=true;this.user=meta.user;const result=await this.api('maps?sort='+this.sort+'&page='+this.page);this.rows=result.items;this.hasMore=result.hasMore;}catch(e){this.online=false;this.rows=[];this.hasMore=false;this.status=e.message;}finally{this.busy=false;if(this.app.screen==='playerMaps')this.render();}
  }
 }
 paintOverlay(){
  if(this.app.screen!=='editor')return;const r=this.app.renderer,c=r.c,f=r.floor,w=r.w,cam=this.camera;
  c.save();c.strokeStyle='#b8ded617';c.lineWidth=1;
  for(let x=Math.ceil(cam/100)*100;x<cam+w;x+=100){c.beginPath();c.moveTo(x-cam,110);c.lineTo(x-cam,f+28);c.stroke();c.fillStyle='#c1d4d777';c.font='10px monospace';c.textAlign='center';c.fillText(String(x),x-cam,f+25);}
  // Editor previews are never gameplay hints: they are confined to authoring mode.
  this.draft.obstacles.forEach((o,i)=>{
   const x=o.x-cam;if(x+o.w<0||x>w)return;const special=['cow','meteor','crate'].includes(o.kind);
   c.strokeStyle=i===this.selected?'#f8dfab':'#beded35a';c.lineWidth=i===this.selected?2:1;c.setLineDash([4,4]);c.strokeRect(x-7,f-(special?160:90),o.w+14,special?160:90);c.setLineDash([]);c.fillStyle='#e0e9e6';c.font='12px Tahoma';c.textAlign='center';c.fillText(MAP_KINDS[o.kind],x+o.w/2,f-(special?170:100));
   if(special)drawDropPreview(c,o,cam,f);
  });
  c.fillStyle='#f5dab5';c.font='13px Tahoma';c.textAlign='left';if(cam<400)c.fillText('START',80-cam,f-90);if(this.draft.length-cam<w)c.fillText('FINISH',this.draft.length-cam-50,f-170);c.restore();
 }
 pointer(e){
  if(this.app.screen!=='editor')return;
  const a=this.app,r=a.renderer,wx=e.clientX/r.scale+this.camera;
  if(e.type==='pointerdown'){if(this.drag)return;e.preventDefault();e.target.setPointerCapture(e.pointerId);const i=this.draft.obstacles.findIndex(o=>wx>=o.x-15&&wx<=o.x+o.w+15);this.drag={startX:e.clientX,camera:this.camera,index:i,old:clone(this.draft),pointer:e.pointerId};if(this.tool==='select'){this.selected=i;this.render();}}
  if(!this.drag||e.pointerId!==this.drag.pointer)return;
  if(e.type==='pointermove'&&Math.abs(e.clientX-this.drag.startX)>6){
   this.drag.moved=true;
   if(this.tool==='pan'||(this.tool==='select'&&this.drag.index<0)){this.camera=Math.max(0,Math.min(this.draft.length-r.w,(this.drag.camera-(e.clientX-this.drag.startX)/r.scale)));r.editorCamera=this.camera;const sc=$('editor-scroll');if(sc)sc.value=this.camera;}
   else if(this.tool==='select'&&this.drag.index>=0){const o=this.draft.obstacles[this.drag.index];o.x=Math.round((this.drag.old.obstacles[this.drag.index].x+(e.clientX-this.drag.startX)/r.scale)/20)*20;try{this.preview();}catch{}}
  }
  if(e.type==='pointerup'){
   const d=this.drag;this.drag=null;
   if(this.tool==='select'&&d.index>=0&&d.moved){try{const next=sanitizeMap(this.draft);this.draft=d.old;this.accept(next);}catch(err){this.draft=d.old;this.preview();this.app.toast(err.message);}}
   else if(!d.moved&&!['select','pan'].includes(this.tool)){
    const next=clone(this.draft),x=Math.round(wx/20)*20;
    if(this.tool==='erase'){const i=next.obstacles.findIndex(o=>x>=o.x-15&&x<=o.x+o.w+15);if(i>=0)next.obstacles.splice(i,1);else next.shards=next.shards.filter(s=>Math.abs(s.x-x)>35);}
    else if(this.tool==='shard')next.shards.push({x,y:92});
    else next.obstacles.push(obstacle(this.tool,x,0));
    this.accept(next);
   }
   this.render();
  }
  if(e.type==='pointercancel'){this.draft=this.drag.old;this.drag=null;this.preview();this.render();}
 }
 edit(key,value){
  if(this.app.screen!=='editor')return;const n=clone(this.draft);
  if(['title','description'].includes(key))n[key]=value;
  else if(['length','speed','scene'].includes(key))n[key]=+value;
  else if(this.selected>=0&&n.obstacles[this.selected]){if(key==='required')n.obstacles[this.selected].required=+value;else if(key==='width')n.obstacles[this.selected].w=+value;}
  this.accept(n);
 }
 resultExtra(){
  if(!['editor-test','player-map'].includes(this.app.mode))return '';
  return `<div class="screen-actions">${buttons(this.app.mode==='editor-test'?'editor':'gallery',this.app.mode==='editor-test'?'العودة إلى المحرّر':'Player Maps')}${this.app.mode==='editor-test'&&this.app.run.status==='won'?buttons('publish','نشر المرحلة'):''}</div>`;
 }
 playMap(map,remote=null,testing=false){
  if(!this.app.save.character){this.pendingPlay={map,remote,testing};this.app.screen='characters';this.app.render();return;}
  const clean=sanitizeMap(map);this.activeMap=clean;this.activeRemote=remote;const a=this.app;
  a.release();a.mode=testing?'editor-test':'player-map';a.run=new Run(mapToLevel(clean));a.attempt=0;a.seed=null;$('sun').value='0';a.clearHint();a.renderer.particles.length=0;clearTimeout(a.toastTimer);$('toast').classList.remove('show');a.launch();
 }
 retry(){const a=this.app;a.release();a.attempt++;a.run=new Run(mapToLevel(this.activeMap));$('sun').value='0';a.renderer.particles.length=0;a.clearHint();a.launch();}
 won(run){if(this.app.mode==='editor-test'){this.proof=proofFor(run,this.draft);try{const e=this.library.save(this.draft,this.proof,this.localId);this.localId=e.id;}catch(error){this.app.toast(error.message);}}}
 async vote(id,value){if(!this.user){this.authReturn='playerMaps';this.app.screen='workLogin';this.render();return;}await this.api('maps/'+id+'/vote','PUT',{value:+value});await this.gallery('online');}
 async act(action,value){
  const a=this.app;
  switch(action){
   case 'menu':a.showMenu();break;
   case 'editor':this.openEditor();break;
   case 'gallery':this.page=0;await this.gallery();break;
   case 'tab':this.page=0;await this.gallery(value);break;
   case 'sort':this.sort=value;this.page=0;await this.gallery('online');break;
   case 'page':this.page=Math.max(0,this.page+Number(value));await this.gallery('online');break;
   case 'tool':this.tool=value;this.selected=-1;this.render();break;
   case 'undo':if(this.history.length){this.future.push(clone(this.draft));this.draft=this.history.pop();this.proof=null;this.selected=-1;this.preview();this.remember();this.render();}break;
   case 'redo':if(this.future.length){this.history.push(clone(this.draft));this.draft=this.future.pop();this.proof=null;this.selected=-1;this.preview();this.remember();this.render();}break;
   case 'delete':if(this.selected>=0){const n=clone(this.draft);n.obstacles.splice(this.selected,1);this.selected=-1;this.accept(n);}break;
   case 'new':{if(this.draft.obstacles.length){const e=this.library.save(this.draft,this.proof,this.localId);this.localId=e.id;}this.proof=null;this.localId=null;this.openEditor(blankMap());this.remember();break;}
   case 'save':{const e=this.library.save(this.draft,this.proof,this.localId);this.localId=e.id;this.remember();a.toast(this.library.warning||'حُفظت المرحلة في مكتبتي.');break;}
   case 'load-local':{const e=this.library.items.find(e=>e.id===value);if(e)this.openEditor(e.map,e.id);break;}
   case 'play-local':{const e=this.library.items.find(e=>e.id===value);if(e)this.playMap(e.map);break;}
   case 'play-demo':this.playMap(DEMO_MAPS.find(e=>e.key===value).map);break;
   case 'test':this.playMap(this.draft,null,true);break;
   case 'export':{const blob=new Blob([JSON.stringify(sanitizeMap(this.draft),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='Shadow-Shift-'+mapKey(this.draft)+'.ssmap';link.click();setTimeout(()=>URL.revokeObjectURL(url),1500);break;}
   case 'import':this.input.click();break;
   case 'remove-local':this.deleteId=value;a.screen='workDelete';this.render();break;
   case 'confirm-delete':this.library.remove(this.deleteId);await this.gallery('local');break;
   case 'play-online':{const entry=await this.api('maps/'+value);this.playMap(entry.map,value);break;}
   case 'like':case 'dislike':{const row=this.rows.find(e=>e.id===value);const v=action==='like'?1:-1;await this.vote(value,row?.myVote===v?0:v);break;}
   case 'report':await this.api('maps/'+value+'/report','POST',{reason:'محتوى غير مناسب أو مرحلة مضللة'});a.toast('وصل البلاغ للمراجعة.');break;
   case 'login':this.authReturn=a.screen;a.screen='workLogin';this.render();break;
   case 'logout':await this.api('logout','POST',{});this.user=null;await this.gallery('online');break;
   case 'auth':{
    const username=$('account-name').value,password=$('account-password').value,register=$('account-create').checked;
    this.busy=true;const button=$('account-submit');button.disabled=true;
    try{const result=await this.api(register?'register':'login','POST',{username,password});this.user=result.user;this.online=true;if(this.authReturn==='workPublish'){a.screen='workPublish';this.render();}else await this.gallery('online');}finally{this.busy=false;if($('account-submit'))$('account-submit').disabled=false;}break;
   }
   case 'publish':
    if(!this.proof||this.proof.mapKey!==mapKey(this.draft))throw Error('اختبر النسخة الحالية وأكملها من البداية أولًا.');
    if(!this.draft.obstacles.length)throw Error('أضف عقبة واحدة على الأقل قبل النشر.');
    a.screen='workPublish';this.render();
    try{const session=await this.api('session');this.user=session.user;this.online=true;this.status='';}catch(e){this.online=false;this.status=e.message;}if(a.screen==='workPublish')this.render();break;
   case 'publish-confirm':{
    if(!this.user){this.authReturn='workPublish';a.screen='workLogin';this.render();return;}
    const button=$('publish-confirm');if(button)button.disabled=true;
    try{await this.api('maps','POST',{map:this.draft,proof:this.proof});a.toast('نُشرت المرحلة على الخادم المشترك.');this.page=0;await this.gallery('online');}finally{if($('publish-confirm'))$('publish-confirm').disabled=false;}break;
   }
  }
 }
 render(){
  const a=this.app,screen=a.screen;
  $('hud').hidden=true;document.body.classList.toggle('editing',screen==='editor');document.body.classList.remove('tutorial');document.body.classList.add('quiet-play');a.clearHint();
  let html='';
  if(screen==='editor'){
   const m=this.draft,o=m.obstacles[this.selected];
   html=`<section class="editor-shell"><header class="editor-header"><div><small>SHADOW SHIFT / WORKSHOP</small><b>وضع المطور</b></div><div>${buttons('gallery','Player Maps')}${buttons('test','▶ اختبار')}${buttons('menu','×')}</div></header><div class="editor-meta"><input aria-label="اسم المرحلة" data-edit="title" value="${esc(m.title)}" maxlength="48"><select aria-label="الخلفية" data-edit="scene">${SCENES.map(s=>`<option value="${s.id}" ${s.id===m.scene?'selected':''}>${s.id} · ${s.name}</option>`).join('')}</select><label>الطول <input type="number" data-edit="length" value="${m.length}" min="2400" max="30000" step="200"></label><label>السرعة <input type="number" data-edit="speed" value="${m.speed}" min="200" max="300" step="10"></label></div><div class="editor-properties">${o?`<b>${MAP_KINDS[o.kind]}</b><span dir="ltr">x: ${o.x}</span>${['bridge','gate','ufo'].includes(o.kind)?`<label>اتجاه الضوء <select data-edit="required"><option value="-1" ${o.required===-1?'selected':''}>يسار</option><option value="0" ${o.required===0?'selected':''}>وسط</option><option value="1" ${o.required===1?'selected':''}>يمين</option></select></label>`:''}${o.kind==='bridge'?`<label>العرض <input type="number" data-edit="width" value="${o.w}" min="180" max="440" step="20"></label>`:''}${buttons('delete','حذف')}`:`<span>اختر أداة ثم المس المسار لوضعها. اسحب العنصر بأداة التحديد.</span>`}</div><footer class="editor-bottom"><div class="editor-tools">${Object.entries({select:'↖ تحديد',pan:'↔ تحريك',...MAP_KINDS,shard:'◇ شظية',erase:'⌫ محو'}).map(([k,n])=>`<button class="tool ${this.tool===k?'active':''}" data-work="tool" data-value="${k}">${n}</button>`).join('')}</div><div class="editor-ruler"><span>0</span><input id="editor-scroll" aria-label="التنقل على طول المرحلة" type="range" min="0" max="${Math.max(0,m.length-a.renderer.w)}" value="${this.camera}" step="20"><span>${m.length}</span></div><div class="editor-actions">${buttons('undo','↶',this.history.length?'':'disabled')}${buttons('redo','↷',this.future.length?'':'disabled')}${buttons('save','حفظ')}${buttons('export','تصدير')}${buttons('import','استيراد')}${buttons('new','جديدة')}${buttons('publish','نشر',this.proof?.mapKey===mapKey(m)?'':'disabled')}<small>${m.obstacles.length}/128</small></div></footer></section>`;
  }
  if(screen==='playerMaps'){
   const local=this.source==='local';
   html=a.modal(`${a.header('مراحل من صنع اللاعبين','PLAYER MAPS')}<div class="community-tabs">${buttons('tab','مكتبتي',`data-value="local"`)}${buttons('tab','المجتمع · Online','data-value="online"')}${buttons('editor','+ اصنع مرحلة')}</div>${local?`<p class="muted">المراحل المحلية على هذا الجهاز. التصويت المشترك متاح في تبويب المجتمع عند الاتصال بخادمه.</p><div class="map-cards">${this.library.items.map(e=>this.card(e.id,e.map,'local',e.proof?'اجتياز محفوظ':'مسودة')).join('')}${DEMO_MAPS.map(e=>this.card(e.key,e.map,'demo','من فريق اللعبة · مثال')).join('')}</div>`:`<div class="community-tools"><div>${buttons('sort','الأعلى تقييمًا','data-value="popular"')}${buttons('sort','الأكثر لايكًا','data-value="likes"')}${buttons('sort','الأحدث','data-value="new"')}</div><div>${this.user?`<span>${esc(this.user.username)}</span>${buttons('logout','خروج')}`:buttons('login','دخول / حساب جديد')}</div></div>${this.busy?'<p class="notice">جارٍ الاتصال بالخادم…</p>':''}${this.status?`<p class="notice">${esc(this.status)}</p>`:''}<div class="map-cards">${this.rows.map(row=>this.card(row.id,{title:row.title,scene:row.scene,length:row.length,speed:row.speed,description:row.description},'online','@'+row.author,row)).join('')}</div>${!this.busy&&!this.rows.length&&!this.status?'<p class="notice">لا توجد مراحل منشورة على هذا الخادم بعد.</p>':''}<div class="screen-actions">${buttons('page','السابق',`data-value="-1" ${this.page===0?'disabled':''}`)}<span>${this.page+1}</span>${buttons('page','التالي',`data-value="1" ${!this.hasMore?'disabled':''}`)}</div>`}`);
  }
  if(screen==='workLogin')html=a.modal(`${a.header('حساب Player Maps','تحتاج حسابًا للنشر والتصويت. لا توجد تسجيلات دخول مطلوبة للعب المحلي.')}<div class="account-form"><label>اسم المستخدم (حروف لاتينية وأرقام)<input id="account-name" autocomplete="username" maxlength="24" minlength="3" dir="ltr"></label><label>كلمة المرور (12 حرفًا على الأقل)<input id="account-password" type="password" autocomplete="current-password" minlength="12" maxlength="128" dir="ltr"></label><label class="setting">إنشاء حساب جديد<input id="account-create" type="checkbox"></label><p class="muted">اسمك سيظهر مع مراحلك. لا تكتب بيانات شخصية في الاسم. لا توجد استعادة كلمة مرور بالبريد في هذا الإصدار.</p><button id="account-submit" class="primary" data-work="auth">دخول / إنشاء</button></div>`,true);
  if(screen==='workPublish')html=a.modal(`${a.header('نشر المرحلة',esc(this.draft.title))}<p class="muted">ستظهر هذه المرحلة واسم حسابك للاعبين على الخادم المتصل. سيعيد الخادم اختبار تسجيل اجتيازك قبل قبولها.</p>${this.status?`<p class="notice">${esc(this.status)}</p>`:''}<div class="screen-actions"><button id="publish-confirm" class="primary" data-work="publish-confirm" ${!this.online?'disabled':''}>${this.user?'نشر للاعبين':'تسجيل الدخول للنشر'}</button>${buttons('editor','المحرّر')}</div>`,true);
  if(screen==='workDelete')html=a.modal(`${a.header('حذف المرحلة المحلية؟','لن تُحذف أي نسخة منشورة على خادم المجتمع.')}<div class="screen-actions">${buttons('confirm-delete','حذف')}${buttons('gallery','إلغاء')}</div>`,true);
  $('ui').innerHTML=html;
 }
 card(id,map,kind,label,stats={}){
  const s=SCENES[(map.scene||1)-1];
  return `<article class="map-card"><div class="map-art" style="--map-sky:${s.sky};--map-light:${s.accent}"><i></i><span>${String(map.scene).padStart(2,'0')}</span></div><div class="map-card-body"><small>${esc(label)}</small><h3>${esc(map.title)}</h3><p>${esc(map.description)}</p><div class="map-facts"><span>${Math.round((map.length-80)/map.speed)}s</span><span>${esc(s.name)}</span></div><div class="map-card-actions">${buttons('play-'+kind,'▶ العب',`data-value="${esc(id)}"`)}${kind==='local'?buttons('load-local','تحرير',`data-value="${esc(id)}"`)+buttons('remove-local','×',`data-value="${esc(id)}"`):''}${kind==='online'?`<button class="vote ${stats.myVote===1?'selected':''}" data-work="like" data-value="${esc(id)}" aria-label="لايك" ${stats.isMine?'disabled':''}>👍 ${stats.likes}</button><button class="vote ${stats.myVote===-1?'selected':''}" data-work="dislike" data-value="${esc(id)}" aria-label="ديس لايك" ${stats.isMine?'disabled':''}>👎 ${stats.dislikes}</button>${buttons('report','⚑',`data-value="${esc(id)}" aria-label="إبلاغ"`)}`:''}</div></div></article>`;
 }
}
