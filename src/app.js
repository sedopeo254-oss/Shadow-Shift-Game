import {VERSION,LEVELS,WORLD_NAMES,WORLD_EN,SKINS,LABELS,DIRECTIONS,makeLevel,dailyLevel,utcDay,parseCode,challengeCode,hash} from './content.js';
import {Run,STEP,SaveStore,recordDeath,recordWin,sanitizeSave} from './core.js';
import {Renderer,drawHero} from './render.js';
const $=id=>document.getElementById(id);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
class AudioEngine{
 constructor(){this.ctx=null;this.lastMusic=0;}
 unlock(){try{if(!this.ctx)this.ctx=new (window.AudioContext||window.webkitAudioContext)();if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});}catch{}}
 tone(hz,duration=.15,type='sine',volume=.035,delay=0){if(!this.ctx||this.ctx.state!=='running')return;const at=this.ctx.currentTime+delay,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(hz,at);g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(volume,at+.02);g.gain.exponentialRampToValueAtTime(.0001,at+duration);o.connect(g);g.connect(this.ctx.destination);o.start(at);o.stop(at+duration+.05);o.onended=()=>{o.disconnect();g.disconnect();};}
 effect(name,settings){if(!settings.sound)return;const tones={jump:[330,.12,'sine'],land:[100,.08,'sine'],shard:[880,.28,'sine'],death:[75,.32,'triangle'],win:[660,.4,'sine'],shift:[220,.22,'triangle']};const a=tones[name];if(a)this.tone(...a);if(name==='win')this.tone(990,.5,'sine',.025,.18);}
 music(time,enabled){if(!enabled||time-this.lastMusic<6)return;this.lastMusic=time;for(const [i,n] of [130.81,196,261.63].entries())this.tone(n,3.5,'sine',.006,i*.33);}
 suspend(){this.ctx?.suspend().catch(()=>{});}
}
class ShadowShift{
 constructor(){
  const storage={getItem:k=>window.localStorage.getItem(k),setItem:(k,v)=>window.localStorage.setItem(k,v)};
  this.store=new SaveStore(storage);this.save=this.store.data;
  if(!this.save.character&&matchMedia('(prefers-reduced-motion: reduce)').matches)this.save.settings.reduced=true;
  this.renderer=new Renderer($('world'));this.audio=new AudioEngine();this.screen='menu';this.run=null;this.mode='campaign';this.attempt=0;this.seed=null;this.worldTab=Math.floor((this.save.unlocked-1)/6);this.accumulator=0;this.last=0;this.uiClock=0;this.lastHint='';this.toastTimer=0;this.selectedSkin=this.save.skin;this.pendingImport=null;this.settingsReturn='menu';this.result=null;
  this.bind();this.applySettings();this.showMenu();requestAnimationFrame(t=>this.frame(t));this.registerOffline();
 }
 applySettings(){document.body.classList.toggle('left-handed',this.save.settings.leftHand);document.body.classList.toggle('reduce',this.save.settings.reduced);this.renderer.configure(this.save.settings);}
 persist(){this.store.data=this.save;const ok=this.store.save();this.save=this.store.data;if(!ok)this.toast(this.store.warning);}
 toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3000);}
 modal(body,small=false){return `<div class="modal-backdrop"><section class="panel ${small?'small':''}">${body}</section></div>`;}
 header(title,subtitle='',back='menu'){return `<div class="panel-header"><div><div class="kicker">SHADOW SHIFT</div><h2>${title}</h2><p>${subtitle}</p></div><button class="close" data-action="${back}" aria-label="إغلاق">×</button></div>`;}
 topbar(){return `<header class="topbar"><div class="brand"><i></i> SHADOW SHIFT</div><div class="top-actions"><span class="build">V${VERSION} / PLAYABLE ALPHA</span><button class="icon-button" data-action="settings" aria-label="الإعدادات">☷</button></div></header>`;}
 showMenu(){this.screen='menu';this.run=null;this.accumulator=0;this.release();this.render();}
 render(){
  const s=this.save;document.body.classList.toggle('playing',['play','ready','pause','result'].includes(this.screen));$('hud').hidden=!['play','pause','ready','result'].includes(this.screen);$('controls').style.visibility=this.screen==='play'?'visible':'hidden';$('pause').disabled=this.screen!=='play';
  const stars=Object.values(s.completed).reduce((a,c)=>a+c.stars,0);
  let html='';
  if(this.screen==='menu')html=`${this.topbar()}<section class="hero-copy"><p class="eyebrow">THE STAGE REMEMBERS</p><h1>SHADOW<em>SHIFT</em><small>EVERY DEATH CHANGES EVERYTHING.</small></h1><p class="hero-description">اصنع الطريق بالضوء.<br>كل خسارة تُغيّر العالم… ولا تُعيدك إلا إلى البداية.</p><div class="play-actions"><button class="primary" data-action="continue">${s.unlocked>1?'أكمل الرحلة':'ابدأ الرحلة'} <span>↗</span></button><button class="secondary" data-action="daily">تحدّي اليوم ◇</button></div></section><footer class="menu-footer"><nav class="footer-nav"><button class="nav-item" data-action="map"><small>01 / WORLDS</small><b>العوالم · ${Object.keys(s.completed).length}/30</b></button><button class="nav-item" data-action="characters"><small>02 / YOUR ECHO</small><b>اختر صداك</b></button><button class="nav-item" data-action="challenge"><small>03 / REMIX LAB</small><b>مختبر التحوّل</b></button></nav><div class="rule">NO CHECKPOINTS. NO SHORTCUTS.<br><strong>${stars} / 90 STARS · OFFLINE FIRST</strong></div></footer>${this.store.warning?`<div class="storage-note">${escape(this.store.warning)}</div>`:''}`;
  if(this.screen==='map'){
   const world=this.worldTab;
   html=this.modal(`${this.header('اختر مسارك','خمسة عوالم. كل مرحلة تُعاد بالكامل عند الخسارة.')}<div class="world-tabs">${WORLD_NAMES.map((n,i)=>`<button class="world-tab ${world===i?'active':''}" data-action="world" data-value="${i}" aria-label="${n}">${String(i+1).padStart(2,'0')}</button>`).join('')}</div><div class="world-heading"><b class="world-number">0${world+1}</b><div><h3>${WORLD_NAMES[world]}</h3><small>${WORLD_EN[world]}</small></div></div><div class="levels">${LEVELS.filter(l=>l.world===world).map(l=>`<button class="level ${l.id===s.unlocked?'current':''}" data-action="level" data-value="${l.id}" ${l.id>s.unlocked?'disabled':''}><b>${l.id>s.unlocked?'⌑':String(l.id).padStart(2,'0')}</b><span>${l.name}</span><small>${'★'.repeat(s.completed[l.id]?.stars||0)}${'☆'.repeat(3-(s.completed[l.id]?.stars||0))}</small></button>`).join('')}</div><div class="map-bottom"><span class="progress-summary">${stars}/90 نجمة · ${s.credits} شظية تجميلية<br>المسارات الحالية مركّبة من وحدات قابلة للتوسّع.</span><button class="secondary" data-action="continue">المرحلة ${s.unlocked} ←</button></div>`);
  }
  if(this.screen==='characters')html=this.modal(`${this.header('اختر صداك','نفس القفزة والسرعة والتصادم. الاختلاف في المظهر فقط.')}<div class="characters">${['boy','girl'].map((kind,i)=>`<button class="character ${s.character===kind?'selected':''}" data-action="character" data-value="${kind}"><canvas data-portrait="${kind}" width="300" height="200" aria-label="${i?'البنت':'الولد'}"></canvas><b>${i?'البنت':'الولد'}</b><small>${i?'ECHO / NOVA':'ECHO / ORION'}</small></button>`).join('')}</div><div class="credit-bar"><span>ألوان الوشاح · دون أي قوة إضافية</span><b>◇ ${s.credits}</b></div><div class="wardrobe">${SKINS.map(k=>`<button class="skin ${this.selectedSkin===k.id?'selected':''} ${s.owned.includes(k.id)?'':'locked'}" style="--swatch:${k.color}" data-action="skin" data-value="${k.id}" aria-label="${k.name}"><i></i></button>`).join('')}</div><div class="skin-name">${SKINS[this.selectedSkin].name} ${s.owned.includes(this.selectedSkin)?'· مفتوح':`· ${SKINS[this.selectedSkin].price} شظية`}</div>${!s.owned.includes(this.selectedSkin)?`<button class="secondary" data-action="buy-skin" ${s.credits<SKINS[this.selectedSkin].price?'disabled':''}>افتح اللون بالشظايا</button>`:''}<div class="screen-actions"><button class="primary" data-action="character-done" ${!s.character?'disabled':''}>${this.pendingStart?'دخول المرحلة':'اعتماد المظهر'} ↗</button></div>`);
  if(this.screen==='settings')html=this.modal(`${this.header('اضبط تجربتك','التأثيرات لا تغيّر القواعد أو مستوى الصعوبة.','close-settings')}<label class="setting">المؤثرات الصوتية<input type="checkbox" data-setting="sound" ${s.settings.sound?'checked':''}></label><label class="setting">موسيقى محيطية هادئة<input type="checkbox" data-setting="music" ${s.settings.music?'checked':''}></label><label class="setting">تقليل الحركة والوميض<input type="checkbox" data-setting="reduced" ${s.settings.reduced?'checked':''}></label><label class="setting">عكس مكان أزرار اللمس<input type="checkbox" data-setting="leftHand" ${s.settings.leftHand?'checked':''}></label><label class="setting">دقة الرسم<select data-setting="quality"><option value="auto" ${s.settings.quality==='auto'?'selected':''}>تلقائية</option><option value="high" ${s.settings.quality==='high'?'selected':''}>عالية</option><option value="low" ${s.settings.quality==='low'?'selected':''}>اقتصادية</option></select></label><div class="notice">يحفظ الجهاز المراحل المكتملة والمظاهر فقط، وليس مكانك داخل المرحلة. تصدير الحفظ يحمي تقدمك عند تغيير الجهاز أو مسح بيانات المتصفح.</div><div class="settings-actions"><button class="secondary" data-action="export">تصدير الحفظ</button><button class="secondary" data-action="import">استيراد الحفظ</button><button class="secondary" data-action="fullscreen">ملء الشاشة</button></div><p class="muted" style="margin-top:15px">دون حساب، أو تتبّع إعلاني، أو إحياء مدفوع. النسخة ${VERSION}.</p>` ,true);
  if(this.screen==='challenge')html=this.modal(`${this.header('مختبر التحوّل','جرّب عائلة تحديات وشارك رمزها. لا تُفتح مراحل الحملة من هذا الوضع.')}<p class="muted">نفس الرمز يعطي نفس سلسلة التحوّلات لكل لاعب؛ كل خسارة تغيّر المحاولة التالية. النتائج محلية، وليست ترتيبًا عالميًا.</p><input class="challenge-input" id="challenge-code" maxlength="24" autocomplete="off" spellcheck="false" placeholder="SS1-19-5A17C0DE" aria-label="رمز التحدي"><div id="challenge-error" class="challenge-error"></div><div class="screen-actions"><button class="primary" data-action="load-code">ابدأ التحدّي</button><button class="secondary" data-action="new-code">رمز جديد</button></div><div class="section-line"></div><p class="muted">تجارب مفتوحة دون تغيير تقدم الحملة</p><div class="screen-actions"><button class="secondary" data-action="sample" data-value="8">بوابات الضوء</button><button class="secondary" data-action="sample" data-value="19">المركبة الفضائية</button></div><div class="notice">التحوّلات هنا لا تعتمد على سجل لعبك الخاص، لكي يمكن إعادة اختبار الرموز نفسها.</div>`);
  if(this.screen==='ready'){
   const l=this.run.level;
   html=this.modal(`${this.header(l.name,`${WORLD_NAMES[l.world]} · ${l.duration} ثانية تقريبًا · لا نقاط حفظ`)}<ul class="brief-list"><li><b>☀</b><span>اسحب الشمس يسارًا أو وسطًا أو يمينًا، وفق رمز الجسر.</span></li><li><b>↑</b><span>اقفز فوق الفخاخ. اضغط باستمرار لقفزة أعلى.</span></li><li><b>◇</b><span>اجمع الشظايا الثلاث لثلاث نجوم. الخسارة تعيد كل شيء.</span></li>${l.world>=1?'<li><b>⊙</b><span>حاذِ الضوء لفتح البوابات وتشكيل درع ضد المركبة.</span></li>':''}</ul><div class="notice">${this.mode==='daily'?'تحدّي يوم '+this.dailyDate+' (UTC). المكافأة مرة واحدة في اليوم.':this.mode==='challenge'?'وضع تدريب بالرمز. لا يفتح مراحل ولا يمنح شظايا دائمة.':l.change}</div><div class="screen-actions"><button class="primary" data-action="launch">انطلق ↗</button></div><p class="orientation-note">الوضع الأفقي يمنحك مساحة أفضل للرؤية والتحكم.</p>`,true);
  }
  if(this.screen==='pause')html=this.modal(`${this.header('المحاولة متوقفة','الإيقاف مؤقت فقط. الخروج يلغي المحاولة.','resume')}<div class="screen-actions"><button class="primary" data-action="resume">استئناف</button><button class="secondary" data-action="settings">الإعدادات</button></div><div class="screen-actions"><button class="secondary" data-action="share-code">انسخ رمز المرحلة</button><button class="quiet" data-action="menu">خروج إلى البداية</button></div>`,true);
  if(this.screen==='result'){
   const won=this.run.status==='won',r=this.result;
   html=this.modal(`<div class="center"><div class="kicker">${won?'SIGNAL RESTORED':'THE STAGE REMEMBERS'}</div><div class="outcome-glyph ${won?'success':''}">${won?'◇':'↺'}</div><h2 class="outcome-title">${won?'عبرتَ الظل.':this.run.cause==='ufo'?'أعادتك المركبة للبداية.':'العالم تعلّم شيئًا جديدًا.'}</h2><p class="muted">${won?'محاولة كاملة، من أول خطوة إلى آخر بوابة.':`سبب الخسارة: ${LABELS[this.run.cause]||'الهاوية'}. ستبدأ من صفر في تشكيل جديد.`}</p>${won?`<div class="result-stars">${'★'.repeat(r.stars)}${'☆'.repeat(3-r.stars)}</div><div class="result-metrics"><div><b>${r.score}</b><span>النقاط</span></div><div><b>${r.time.toFixed(1)}s</b><span>الزمن</span></div><div><b>+${r.reward}</b><span>شظايا دائمة</span></div></div>`:`<div class="result-metrics"><div><b>${Math.min(99,Math.floor(this.run.x/this.run.level.length*100))}%</b><span>المسافة السابقة</span></div><div><b>${this.attempt+1}</b><span>المحاولة</span></div><div><b>0</b><span>نقاط الحفظ</span></div></div><p class="muted">التحوّل التالي: ${LABELS[['laser','spike','saw'][(this.attempt+1)%3]]} وزوايا ظل مختلفة.</p>`}<div class="screen-actions"><button class="primary" data-action="${won&&this.mode==='campaign'&&this.run.level.id<30?'next':'retry'}">${won&&this.mode==='campaign'&&this.run.level.id<30?'المرحلة التالية ↗':won?'حسّن نتيجتك ↗':'أعد من البداية ↺'}</button><button class="secondary" data-action="menu">القائمة</button></div>${won&&this.run.level.id===30?'<div class="notice">أكملت مسارات النسخة الأولى. تحدّيات اليوم والرموز تفتح تشكيلات جديدة؛ الفصول القصصية الإضافية ليست منشورة بعد.</div>':''}</div>`,true);
  }
  if(this.screen==='confirm-import')html=this.modal(`${this.header('استبدال الحفظ؟','سيحل الملف المختار محل تقدمك على هذا المتصفح.','settings')}<p class="save-summary">المراحل المكتملة في الملف: ${Object.keys(this.pendingImport.completed).length}<br>الشظايا: ${this.pendingImport.credits}<br>لن يتم استيراد أي موضع داخل مرحلة.</p><div class="screen-actions"><button class="primary" data-action="confirm-import">استبدال الحفظ</button><button class="secondary" data-action="settings">إلغاء</button></div>`,true);
  $('ui').innerHTML=html;
  if(this.screen==='characters')document.querySelectorAll('[data-portrait]').forEach(canvas=>{const c=canvas.getContext('2d');drawHero(c,160,184,2.1,0,canvas.dataset.portrait,SKINS[this.selectedSkin].color);});
  if(this.run)this.updateHUD();
 }
 prepare(id,mode='campaign',seed=null){
  if(mode==='campaign'&&id>this.save.unlocked)return;
  if(!this.save.character){this.pendingStart={id,mode,seed};this.screen='characters';this.render();return;}
  clearTimeout(this.toastTimer);$('toast').classList.remove('show');this.pendingStart=null;this.mode=mode;this.seed=seed;this.attempt=mode==='campaign'?(this.save.failures[id]?.count||0):0;
  this.run=new Run(makeLevel(id,this.attempt,this.save.failures[id]||{},seed));this.screen='ready';this.accumulator=0;$('sun').value='0';this.renderer.ghost=null;this.render();
 }
 launch(){if(!this.run)return;this.audio.unlock();this.run.start();this.screen='play';this.accumulator=0;this.last=performance.now();this.render();}
 retry(){if(!this.run)return;const id=this.run.level.id;this.renderer.ghost=this.run.trace;this.attempt++;this.run=new Run(makeLevel(id,this.attempt,this.save.failures[id]||{},this.seed));$('sun').value='0';this.launch();this.audio.effect('shift',this.save.settings);this.toast(this.run.level.change);}
 pause(){if(this.screen!=='play')return;this.screen='pause';this.release();this.audio.suspend();this.accumulator=0;this.render();}
 resume(){if(!this.run)return;this.screen='play';this.audio.unlock();this.accumulator=0;this.last=performance.now();this.render();}
 release(){this.run?.releaseJump();$('jump').classList.remove('held');}
 jump(){if(this.screen!=='play')return;this.audio.unlock();this.run.pressJump();$('jump').classList.add('held');}
 setSun(value){if(!['play','ready'].includes(this.screen)||!this.run)return;this.run.setSun(value);$('sun').value=String(Math.round(this.run.sun));}
 updateHUD(){
  if(!this.run)return;const r=this.run,l=r.level;
  $('stage-label').textContent=`${this.mode==='campaign'?'STAGE':this.mode==='daily'?'DAILY':'REMIX'} ${String(l.id).padStart(2,'0')}`;$('stage-name').textContent=l.name;
  const pct=Math.min(100,Math.max(0,(r.x-80)/(l.length-80)*100));$('progress-bar').style.width=pct+'%';$('progress-text').textContent=Math.floor(pct)+'%';
  $('shard-count').textContent='◆ '.repeat(r.collected.size)+'◇ '.repeat(3-r.collected.size);$('attempt-label').textContent=`ATTEMPT ${this.attempt+1} · NO CHECKPOINTS`;
  const next=l.obstacles.find(o=>o.x+o.w>r.x-12&&o.x-r.x<560);
  let hint='';
  if(r.t<4)hint='الجري تلقائي · حرّك الضوء ثم اقفز';
  if(next){if(['bridge','gate','ufo'].includes(next.kind))hint=`${next.kind==='ufo'?'المركبة تقترب! درع الظل':next.kind==='gate'?'افتح البوابة بالضوء':'الجسر القادم'}: ${DIRECTIONS[next.required+1]} ${r.aligned(next)?'✓':'☀'}`;else if(next.kind==='gravity')hint='مجال جاذبية خفيفة · قفزتك أعلى هنا';else if(next.x-r.x<350)hint=`${LABELS[next.kind]} أمامك · اقفز ↑`;}
  if(hint!==this.lastHint){$('context-hint').textContent=hint;$('context-hint').hidden=!hint;this.lastHint=hint;}
 }
 processEvents(){const r=this.run;while(r?.events.length){const e=r.events.shift();this.audio.effect(e.type,this.save.settings);
  if(e.type==='jump'||e.type==='land')this.renderer.burst(r.x,this.renderer.floor,SKINS[this.save.skin].color,5);
  if(e.type==='shard')this.renderer.burst(r.x,this.renderer.floor-r.y-25,'#ffe0a3',16);
  if(e.type==='death'){
   recordDeath(this.save,r,this.mode);this.persist();this.release();this.renderer.burst(r.x,this.renderer.floor-r.y-25,'#ffd4dd',38);this.screen='result';this.result=null;this.render();
  }
  if(e.type==='win'){this.result=recordWin(this.save,r,this.mode,this.dailyDate);this.persist();this.release();this.screen='result';this.render();}
 }}
 frame(now){const delta=this.last?Math.min(100,now-this.last):16;this.last=now;
  if(this.screen==='play'&&this.run){this.accumulator+=delta/1000;let steps=0;while(this.accumulator>=STEP&&steps++<12&&this.screen==='play'){this.run.update(STEP);this.accumulator-=STEP;this.processEvents();}
   this.uiClock+=delta;if(this.uiClock>70){this.updateHUD();this.uiClock=0;}
  }else this.accumulator=0;
  this.renderer.paint(this.run,this.screen,now/1000,this.save,delta);
  if(!document.hidden&&['menu','play'].includes(this.screen))this.audio.music(now/1000,this.save.settings.music);
  requestAnimationFrame(t=>this.frame(t));
 }
 async action(action,value){
  this.audio.unlock();
  switch(action){
   case 'menu':this.pendingStart=null;this.showMenu();break;
   case 'continue':this.prepare(this.save.unlocked);break;
   case 'level':this.prepare(+value);break;
   case 'next':this.prepare(this.run.level.id+1);break;
   case 'map':this.screen='map';this.worldTab=Math.floor((this.save.unlocked-1)/6);this.render();break;
   case 'world':this.worldTab=+value;this.render();break;
   case 'characters':this.pendingStart=null;this.screen='characters';this.render();break;
   case 'character':this.save.character=value;this.persist();this.render();break;
   case 'skin':this.selectedSkin=+value;if(this.save.owned.includes(+value)){this.save.skin=+value;this.persist();}this.render();break;
   case 'buy-skin':{const k=SKINS[this.selectedSkin];if(k&&!this.save.owned.includes(k.id)&&this.save.credits>=k.price){this.save.credits-=k.price;this.save.owned.push(k.id);this.save.skin=k.id;this.persist();this.render();}break;}
   case 'character-done':if(this.pendingStart){const {id,mode,seed}=this.pendingStart;this.prepare(id,mode,seed);}else this.showMenu();break;
   case 'settings':if(this.screen==='play')this.pause();if(this.screen==='pause')this.settingsReturn='pause';else if(this.screen!=='confirm-import')this.settingsReturn='menu';this.screen='settings';this.render();break;
   case 'close-settings':if(this.settingsReturn==='pause'&&this.run){this.screen='pause';this.render();}else this.showMenu();break;
   case 'launch':this.launch();break;
   case 'resume':this.resume();break;
   case 'retry':this.retry();break;
   case 'daily':{const d=dailyLevel();this.dailyDate=d.date;this.prepare(d.id,'daily',d.seed);break;}
   case 'challenge':this.screen='challenge';this.render();break;
   case 'sample':this.prepare(+value,'challenge',hash('showcase-'+value));break;
   case 'new-code':$('challenge-code').value=challengeCode(1+Math.floor(Math.random()*30),crypto.getRandomValues(new Uint32Array(1))[0]);break;
   case 'load-code':{const c=parseCode($('challenge-code').value);if(c)this.prepare(c.id,'challenge',c.seed);else $('challenge-error').textContent='رمز غير صحيح. مثال: SS1-19-5A17C0DE';break;}
   case 'share-code':{const code=this.run?.level.signatureCode;if(!code)break;try{await navigator.clipboard.writeText(code);this.toast('تم نسخ الرمز: '+code);}catch{this.toast(code);}break;}
   case 'fullscreen':try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{this.toast('ملء الشاشة غير متاح هنا؛ جرّب الوضع الأفقي.');}break;
   case 'export':{const blob=new Blob([this.store.export()],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='Shadow-Shift-save-'+utcDay()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);break;}
   case 'import':$('import-file').click();break;
   case 'confirm-import':this.save=this.store.import(JSON.stringify(this.pendingImport));this.pendingImport=null;this.applySettings();this.showMenu();this.toast('تم استيراد التقدم المكتمل فقط.');break;
  }
 }
 bind(){
  $('ui').addEventListener('click',e=>{const button=e.target.closest('[data-action]');if(button&&!button.disabled)this.action(button.dataset.action,button.dataset.value).catch(err=>{console.error(err);this.toast('تعذّر تنفيذ الإجراء. لم يتم تخطي أي مرحلة.');});});
  $('ui').addEventListener('change',e=>{const key=e.target.dataset.setting;if(!key)return;this.save.settings[key]=e.target.type==='checkbox'?e.target.checked:e.target.value;this.persist();this.applySettings();});
  $('pause').addEventListener('click',()=>this.pause());$('sun').addEventListener('input',e=>this.setSun(e.target.value));
  $('jump').addEventListener('pointerdown',e=>{e.preventDefault();$('jump').setPointerCapture(e.pointerId);this.jump();});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])$('jump').addEventListener(event,()=>this.release());
  window.addEventListener('keydown',e=>{
   if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)&&document.activeElement?.type!=='range')return;
   if(['Space','ArrowUp','ArrowLeft','ArrowRight','Escape','KeyP','Digit1','Digit2','Digit3','KeyA','KeyD'].includes(e.code))e.preventDefault();
   if(e.repeat)return;
   if(['Space','ArrowUp','KeyW'].includes(e.code))this.jump();
   if(e.code==='Digit1')this.setSun(-1);if(e.code==='Digit2')this.setSun(0);if(e.code==='Digit3')this.setSun(1);
   if(['ArrowLeft','KeyA'].includes(e.code))this.setSun(Math.round(this.run?.sun||0)-1);if(['ArrowRight','KeyD'].includes(e.code))this.setSun(Math.round(this.run?.sun||0)+1);
   if(['Escape','KeyP'].includes(e.code)){if(this.screen==='play')this.pause();else if(this.screen==='pause')this.resume();}
   if(e.code==='Enter'&&this.screen==='ready')this.launch();if(e.code==='KeyR'&&this.screen==='result')this.retry();
  });
  window.addEventListener('keyup',e=>{if(['Space','ArrowUp','KeyW'].includes(e.code))this.release();});
  window.addEventListener('blur',()=>this.pause());document.addEventListener('visibilitychange',()=>{if(document.hidden){this.pause();this.audio.suspend();}});
  window.addEventListener('resize',()=>{this.renderer.resize();});
  $('import-file').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>65536)throw new Error('ملف كبير جدًا');this.pendingImport=sanitizeSave(JSON.parse(await file.text()));this.screen='confirm-import';this.render();}catch{this.toast('تعذّر قراءة الملف. حفظك الحالي لم يتغير.');}e.target.value='';});
 }
 async registerOffline(){if(!('serviceWorker'in navigator)||!['https:','http:'].includes(location.protocol)||new URLSearchParams(location.search).has('qa'))return;try{const reg=await navigator.serviceWorker.register('./sw.js');reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)this.toast('تحديث جاهز. أغلق تبويبات اللعبة وافتحها لتطبيقه.');});});}catch(err){console.info('Offline installation unavailable',err.message);}}
}
const app=new ShadowShift();
// Inspection seam is restricted to a local development host, never a public build cheat.
if(['localhost','127.0.0.1'].includes(location.hostname)&&new URLSearchParams(location.search).has('qa')){window.__shadowShift=app;const badge=document.createElement('span');badge.className='qa-label';badge.textContent='LOCAL QA';document.body.append(badge);}
