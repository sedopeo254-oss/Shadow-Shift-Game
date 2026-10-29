"""Alpha 0.4 browser regression suite.
Uses the exact portable build with an in-memory inspection/storage adapter.
URL navigation is blocked in this environment: no hosting/SW/device claims.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import hashlib,json,os,shutil
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'playtest-output';OUT.mkdir(exist_ok=True)
BASE=(ROOT/'dist/Shadow-Shift-Portable.html').read_text(encoding='utf-8')
QA=BASE.replace('const app=new ShadowShift();','const app=new ShadowShift();window.__shadowShift=app;window.__qaSS=SS;')
# Only the test harness replaces the unavailable opaque-origin storage backend.
MEMORY=QA.replace("const storage={getItem:k=>window.localStorage.getItem(k),setItem:(k,v)=>window.localStorage.setItem(k,v)};", "const mem=new Map();const storage={getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v)};")
checks=[];errors=[]
def check(name,condition):
 assert condition,name
 checks.append(name)
def capture(page,name):
 page.screenshot(path=str(OUT/name))
def frozen_scene(page,level,x=400,viewport=None):
 if viewport:page.set_viewport_size(viewport)
 page.evaluate('''([id,x])=>{const a=__shadowShift;a.prepare(id,'challenge',123);a.run.x=x;a.run.y=0;a.run.vy=0;a.run.grounded=true;const bridge=a.run.level.obstacles.find(o=>o.kind==='bridge'&&x>=o.x&&x<=o.x+o.w);if(bridge)a.run.setSun(bridge.required);a.run.status='ready';a.screen='play';a.render();}''',[level,x])
 page.wait_for_timeout(60)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE') or shutil.which('chromium') or shutil.which('chromium-browser'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(MEMORY);page.wait_for_timeout(150)
 check('Menu boots without runtime errors',not errors)
 check('No public mutation marketing copy', 'THE STAGE REMEMBERS' not in page.locator('body').inner_text())
 capture(page,'01-menu.png')
 page.locator('[data-action=continue]').click()
 page.locator('[data-action=character][data-value=girl]').click()
 page.locator('[data-action=character-done]').click()
 check('First stage alone shows teaching screen',page.evaluate('__shadowShift.screen')=='ready')
 capture(page,'02-tutorial-brief.png')
 page.locator('[data-action=launch]').click();page.wait_for_timeout(100)
 check('Level 1 contextual teaching visible',page.locator('#context-hint').is_visible())
 page.keyboard.down('Space');page.wait_for_timeout(130)
 check('Keyboard jump remains functional',page.evaluate('__shadowShift.run.y')>10)
 page.keyboard.up('Space')
 page.locator('#pause').click();t=page.evaluate('__shadowShift.run.t');page.wait_for_timeout(100)
 check('Pause freezes simulation time',page.evaluate('__shadowShift.run.t')==t)
 page.locator('.primary[data-action=resume]').click()
 # Finish a sampled tutorial run with the reference controller through real simulation.
 page.evaluate('''()=>{const a=__shadowShift,r=a.run;r.x=80;r.y=0;r.vy=0;r.grounded=true;r.status='running';r.t=0;let n=0;while(r.status==='running'&&n++<26000){const o=r.level.obstacles.find(o=>o.x+o.w>r.x-12&&['bridge','ufo','gate'].includes(o.kind));if(o&&o.x-r.x<500)r.setSun(o.required);const h=r.level.obstacles.find(o=>['spike','laser','saw'].includes(o.kind)&&o.x+o.w>r.x-15);if(r.grounded&&h&&h.x-r.x<67&&h.x>r.x-10)r.pressJump();r.update();}a.processEvents();}''')
 check('Winning tutorial unlocks stage 2',page.evaluate('__shadowShift.save.unlocked')==2)
 page.locator('[data-action=next]').click()
 check('Stage 2 starts directly, without ready modal',page.evaluate('__shadowShift.screen')=='play')
 check('No stage 2 context hints',not page.locator('#context-hint').is_visible() and page.locator('#context-hint').inner_text()=='')
 check('No stage 2 control instructions',not page.locator('.sun-control label').is_visible() and not page.locator('.jump-button small').is_visible())
 check('Minimal HUD removes progress/attempt guidance',not page.locator('.run-progress').is_visible() and not page.locator('#attempt-label').is_visible())
 page.evaluate('''()=>{const a=__shadowShift;a.__texts=[];const c=a.renderer.c;const f=c.fillText.bind(c);c.fillText=(text,...args)=>{a.__texts.push(text);return f(text,...args);};}''')
 frozen_scene(page,2,700)
 check('No canvas solution labels after tutorial',page.evaluate('__shadowShift.__texts.length')==0)
 capture(page,'03-stage02-silent.png')
 # Death preserves silent reset and full start, never a partial retry.
 page.evaluate("()=>{const a=__shadowShift;a.run.status='running';a.run.die('spike');a.processEvents();}")
 death=page.locator('#ui').inner_text()
 check('Death screen gives no cause or next-trap hints',all(t not in death for t in ['سبب الخسارة','التحوّل','أشواك','حاذِ','اقفز','تغير','تغيّر']))
 capture(page,'04-quiet-retry.png')
 old=page.evaluate('__shadowShift.run.level.obstacles[1].kind')
 page.locator('[data-action=retry]').click()
 check('Retry returns to complete start',page.evaluate('__shadowShift.run.x')<150 and page.evaluate('__shadowShift.run.collected.size')==0)
 check('Actual traps still change between retries',page.evaluate('__shadowShift.run.level.obstacles[1].kind')!=old)
 check('Retry shows no mutation toast',not page.locator('#toast').evaluate("e=>e.classList.contains('show')"))
 check('Retry remains hint-free',page.locator('#context-hint').inner_text()=='' and not page.locator('#context-hint').is_visible())
 # All stage transitions, including returning to tutorial, obey the same policy.
 page.evaluate("__shadowShift.prepare(1,'challenge',123)")
 check('Revisiting stage 1 restores tutorial',page.evaluate('__shadowShift.screen')=='ready')
 page.locator('[data-action=launch]').click()
 check('Tutorial hint returns after a silent stage',page.locator('#context-hint').is_visible())
 page.evaluate("__shadowShift.prepare(19,'challenge',123)")
 check('Later challenge stages skip all briefings',page.evaluate('__shadowShift.screen')=='play')
 page.evaluate('''()=>{const a=__shadowShift,o=a.run.level.obstacles.find(o=>o.kind==='ufo');a.run.x=o.x+20;a.run.setSun(o.required===0?1:0);a.run.update();a.processEvents();}''')
 check('UFO still causes a full failure',page.evaluate('__shadowShift.run.cause')=='ufo')
 check('UFO death does not reveal the countermeasure','درع' not in page.locator('#ui').inner_text())
 page.locator('[data-action=retry]').click()
 check('UFO retry restarts from beginning',page.evaluate('__shadowShift.run.x')<150)
 # Gallery and deterministic cache evidence.
 hashes=[]
 for id in range(1,31):
  frozen_scene(page,id,900)
  # Background-only rendering supplies a visual uniqueness check without HUD differences.
  data=page.evaluate('''()=>{const a=__shadowShift,r=a.renderer,c=r.c;c.setTransform(r.ratio,0,0,r.ratio,0,0);r.background(c,0,a.run.level.id,0,false,a.run.level.length);return r.canvas.toDataURL();}''')
  hashes.append(hashlib.sha256(data.encode()).hexdigest())
  if id in [1,2,4,8,13,19,22,25,30]:
   page.evaluate('__shadowShift.renderer.paint(__shadowShift.run,"play",0,__shadowShift.save,16)')
   capture(page,f'stage-{id:02}.png')
 check('All 30 rendered background fingerprints differ',len(set(hashes))==30)
 page.evaluate('''()=>{const a=__shadowShift,r=a.renderer;for(let x=0;x<42000;x+=1379)r.background(r.c,0,30,x,false,42640); }''')
 check('Continuous scenery cache remains bounded',page.evaluate('__shadowShift.renderer.scenery.tiles.size')<=12)
 cells=page.evaluate('[...__shadowShift.renderer.scenery.tiles.keys()]')
 check('Background uses absolute non-wrapped tile indices',any(int(x.split(':')[1])>10 for x in cells))
 for size,name in [({'width':430,'height':932},'05-portrait.png'),({'width':932,'height':430},'06-landscape.png'),({'width':360,'height':640},'07-small-phone.png')]:
  frozen_scene(page,13,850,size)
  capture(page,name)
  check('Controls inside viewport '+name,page.locator('#jump').evaluate('e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight;}'))
  check('No hints after resize '+name,not page.locator('#context-hint').is_visible())
 # Actual touch injection and two simultaneously held contacts.
 mobile=browser.new_context(viewport={'width':932,'height':430},device_scale_factor=1,has_touch=True,is_mobile=True)
 m=mobile.new_page();m.on('pageerror',lambda e:errors.append(str(e)));m.set_content(MEMORY)
 m.locator('[data-action=continue]').tap();m.locator('[data-action=character][data-value=boy]').tap();m.locator('[data-action=character-done]').tap();m.locator('[data-action=launch]').tap()
 m.evaluate("__shadowShift.prepare(2,'challenge',123)")
 box=m.locator('#jump').bounding_box();sun=m.locator('#sun').bounding_box();cdp=mobile.new_cdp_session(m)
 touch=[{'x':box['x']+box['width']/2,'y':box['y']+box['height']/2,'id':1},{'x':sun['x']+sun['width']*.9,'y':sun['y']+sun['height']/2,'id':2}]
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':touch});m.wait_for_timeout(150)
 check('Touch jump works on stage 2',m.evaluate('__shadowShift.run.y')>10)
 check('Sun responds during held touch jump',m.evaluate('__shadowShift.run.sun')==1)
 cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
 check('Touch release clears held jump',not m.evaluate('__shadowShift.run.jumpHeld'))
 m.locator('#pause').tap();m.locator('[data-action=settings]').tap();m.locator('[data-setting=leftHand]').check();m.locator('[data-setting=reduced]').check()
 check('Left handed and reduced motion settings remain functional',m.evaluate('document.body.classList.contains("left-handed")&&document.body.classList.contains("reduce")'))
 m.locator('[data-action=close-settings]').tap();m.locator('.primary[data-action=resume]').tap()
 check('Resume does not reintroduce tutorial',not m.locator('#context-hint').is_visible())
 # Unmodified storage adapter fails gracefully in an opaque origin.
 denied=browser.new_page();denied.on('pageerror',lambda e:errors.append(str(e)));denied.set_content(QA)
 check('Storage-denied fallback still boots',denied.locator('[data-action=continue]').is_visible())
 check('Storage limitation is reported',bool(denied.evaluate('__shadowShift.store.warning')))
 check('No JavaScript page errors',not errors)
 report={'version':'0.4.0','browser':browser.version,'checks':checks,'count':len(checks),'errors':errors,'background_hashes':hashes,'test_mode':'Exact portable HTML via set_content. An in-memory storage backend and inspection handle are injected for UI tests only. Scene captures use controlled positions/frozen simulation. A separate page tests the original storage-denied fallback. HTTP URL navigation is blocked by environment policy. No physical phone, hosting, service-worker, real-origin persistence, battery or FPS claims.'}
 (OUT/'browser-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print(json.dumps({'checks':len(checks),'errors':errors,'browser':browser.version},indent=2))
 browser.close()
