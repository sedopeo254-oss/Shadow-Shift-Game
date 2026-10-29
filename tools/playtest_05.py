"""Portable UI tests. URL navigation is policy-blocked in this environment.
An in-memory storage/inspection adapter is injected ONLY into test pages.
An HTTP bridge exercises the real optional service; it does not test browser cookies/CORS.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, urllib.request, urllib.error, http.cookiejar, time, os, tempfile, socket, subprocess, atexit, shutil
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'playtest-output-0.5';OUT.mkdir(exist_ok=True)
html=(ROOT/'dist/Shadow-Shift-Portable.html').read_text()
html=html.replace('const app=new ShadowShift();','const app=new ShadowShift();window.__shadowShift=app;window.__SS=SS;')
html=html.replace("const storage={getItem:k=>window.localStorage.getItem(k),setItem:(k,v)=>window.localStorage.setItem(k,v)};", "const mem=new Map();const storage={getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v)};")
# Isolated test database: no prior votes or accounts can affect this run.
tmp=tempfile.mkdtemp(prefix='ss-browser-')
with socket.socket() as sock:
 sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
API_BASE='http://127.0.0.1:'+str(port)
server=subprocess.Popen(['node','server/index.mjs'],cwd=ROOT,env={**os.environ,'PORT':str(port),'HOST':'127.0.0.1','DB_PATH':tmp+'/community.sqlite'},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
def cleanup():
 server.terminate()
 try:server.wait(timeout=3)
 except subprocess.TimeoutExpired:server.kill()
 shutil.rmtree(tmp,ignore_errors=True)
atexit.register(cleanup)
for _ in range(40):
 try:
  urllib.request.urlopen(API_BASE+'/api/v1/session',timeout=.3);break
 except Exception:time.sleep(.05)
checks=[];errors=[]
def ck(label,value):
 assert value,label
 checks.append(label)
def shot(p,name):p.screenshot(path=str(OUT/name))
def boot(browser,size,bridge=False,touch=False):
 ctx=browser.new_context(viewport=size,device_scale_factor=1,has_touch=touch,is_mobile=touch)
 p=ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)))
 if bridge:
  jar=http.cookiejar.CookieJar();opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
  def api(source,arg):
   route,method,body=arg;req=urllib.request.Request(API_BASE+'/api/v1/'+route,method=method,data=json.dumps(body).encode() if body is not None else None,headers={'Origin':API_BASE,**({'Content-Type':'application/json'} if body is not None else {})})
   try:
    with opener.open(req,timeout=10) as r:return {'ok':True,'data':json.load(r)}
   except urllib.error.HTTPError as e:return {'ok':False,'data':json.load(e)}
  p.expose_binding('__apiBridge',api)
 p.set_content(html);p.wait_for_timeout(100)
 if bridge:p.evaluate("()=>{__shadowShift.workshop.api=async(path,method='GET',body)=>{const r=await __apiBridge([path,method,body??null]);if(!r.ok)throw Error(r.data.error);return r.data;};}")
 return p
def solve(p):
 return p.evaluate('''()=>{const a=__shadowShift,r=a.run;let n=0;while(r.status==='running'&&n++<24000){const o=r.level.obstacles.find(o=>o.x+o.w>r.x-12&&['bridge','ufo','gate'].includes(o.kind));if(o&&o.x-r.x<500)r.setSun(o.required);const h=r.level.obstacles.find(o=>['spike','laser','saw','cow','meteor','crate'].includes(o.kind)&&o.x+o.w>r.x-15);if(r.grounded&&h&&h.x-r.x<r.level.speed*.29&&h.x>r.x-10)r.pressJump();r.update();}a.processEvents();return r.status;}''')
with sync_playwright() as w:
 b=w.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 p=boot(b,{'width':1440,'height':900},True)
 ck('New menu includes Workshop and Player Maps',p.locator('[data-action=workshop]').is_visible() and p.locator('[data-action=playerMaps]').is_visible())
 shot(p,'01-menu.png')
 p.locator('[data-action=continue]').click();p.locator('[data-action=character][data-value=girl]').click();p.locator('[data-action=character-done]').click()
 ck('Tutorial remains exclusive to stage one',p.evaluate('__shadowShift.screen')=='ready')
 p.locator('[data-action=launch]').click();p.wait_for_timeout(90)
 ck('Tutorial hint is visible',p.locator('#context-hint').is_visible())
 ck('Tutorial remains completable',solve(p)=='won');p.locator('[data-action=next]').click()
 ck('Stage two starts directly with no hints',p.evaluate('__shadowShift.screen')=='play' and not p.locator('#context-hint').is_visible())
 p.evaluate("__shadowShift.run.die('spike');__shadowShift.processEvents()")
 ck('Death screen does not announce mutation','تغي' not in p.locator('#ui').inner_text())
 p.locator('[data-action=retry]').click()
 ck('Retry is a full reset',p.evaluate('__shadowShift.run.x')<200 and p.evaluate('__shadowShift.run.falling.size')==0)
 ck('Retry emits no hint toast',not p.locator('#toast').evaluate("e=>e.classList.contains('show')"))
 p.evaluate('__shadowShift.showMenu()');p.locator('[data-action=workshop]').click()
 ck('Workshop opens and stops simulation',p.evaluate('__shadowShift.screen')=='editor' and p.evaluate('__shadowShift.run.t')==0)
 # Mouse placement on the visible world, not direct scene injection.
 p.locator('[data-work=tool][data-value=spike]').click()
 pos=p.evaluate('({x:850*__shadowShift.renderer.scale,y:(__shadowShift.renderer.floor-55)*__shadowShift.renderer.scale})')
 p.mouse.click(pos['x'],pos['y'])
 ck('Mouse placement creates a spike',p.evaluate('__shadowShift.workshop.draft.obstacles.length')==1)
 p.locator('[data-work=undo]').click();ck('Undo removes placement',p.evaluate('__shadowShift.workshop.draft.obstacles.length')==0)
 p.locator('[data-work=redo]').click();ck('Redo restores placement',p.evaluate('__shadowShift.workshop.draft.obstacles.length')==1)
 p.locator('[data-work=tool][data-value=select]').click();p.mouse.move(pos['x'],pos['y']);p.mouse.down();p.mouse.move(pos['x']+70,pos['y'],steps=5);p.mouse.up()
 ck('Drag moves selected object on the grid',p.evaluate('__shadowShift.workshop.draft.obstacles[0].x')>850)
 p.locator('[data-edit=title]').fill('Workshop QA');p.locator('[data-edit=title]').press('Tab')
 p.locator('[data-edit=length]').fill('3600');p.locator('[data-edit=length]').press('Tab')
 p.locator('[data-work=save]').click()
 ck('Map saves in local library',p.evaluate('__shadowShift.workshop.library.items.length')==1)
 p.locator('[data-work=test]').click();ck('Custom map starts without a tutorial',p.evaluate('__shadowShift.mode')=='editor-test' and not p.locator('#context-hint').is_visible())
 ck('Editor map test can be won',solve(p)=='won')
 ck('Won editor test creates a replay certificate',p.evaluate('!!__shadowShift.workshop.proof'))
 ck('Editor win does not unlock campaign',p.evaluate('__shadowShift.save.unlocked')==2)
 p.evaluate('''()=>{const a=__shadowShift;for(let i=0;i<6;i++)a.run.collected.add(i);a.updateHUD();}''');ck('Custom HUD tolerates more than three collected shards', '6/' in p.locator('#shard-count').inner_text())
 p.locator('[data-work=editor]').click();ck('Return restores editable map',p.locator('[data-edit=title]').input_value()=='Workshop QA')
 ck('Publish enabled after test win',p.locator('[data-work=publish]').is_enabled())
 # Export can be triggered by UI; check generated download rather than disk side effects.
 with p.expect_download() as d:p.locator('[data-work=export]').click()
 file=d.value;file.save_as(str(OUT/'exported-map.ssmap'));ck('Export is bounded declarative JSON',json.loads((OUT/'exported-map.ssmap').read_text())['title']=='Workshop QA')
 p.locator('[data-work=publish]').click();p.wait_for_timeout(100)
 ck('Publish confirmation discloses shared publication',p.locator('#publish-confirm').is_visible())
 p.locator('#publish-confirm').click()
 ck('Publishing requires login',p.locator('#account-name').is_visible())
 name='maker'+str(int(time.time()))[-8:]
 p.locator('#account-name').fill(name);p.locator('#account-password').fill('qa-password-not-for-production');p.locator('#account-create').check();p.locator('#account-submit').click()
 p.wait_for_selector('#publish-confirm');p.locator('#publish-confirm').click();p.wait_for_selector('[data-work=play-online]')
 ck('Published map visible in shared gallery',p.locator('.map-card h3').filter(has_text='Workshop QA').count()>0)
 # Another browser context, another authenticated account, same real server.
 p2=boot(b,{'width':1280,'height':800},True);p2.locator('[data-action=playerMaps]').click();p2.locator('[data-work=tab][data-value=online]').click();p2.wait_for_selector('[data-work=play-online]')
 ck('Another context sees the published map',p2.locator('.map-card h3').filter(has_text='Workshop QA').count()>0)
 p2.locator('[data-work=login]').click();p2.locator('#account-name').fill('voter'+str(int(time.time()))[-8:]);p2.locator('#account-password').fill('qa-password-not-for-production');p2.locator('#account-create').check();p2.locator('#account-submit').click();p2.wait_for_selector('[data-work=like]')
 p2.locator('[data-work=like]').first.click();p2.wait_for_timeout(150)
 ck('Like updates from server', '1' in p2.locator('[data-work=like]').first.inner_text())
 p.locator('[data-work=tab][data-value=online]').click();p.wait_for_timeout(150)
 ck('Vote is visible to map author', '1' in p.locator('[data-work=like]').first.inner_text())
 p2.locator('[data-work=dislike]').first.click();p2.wait_for_timeout(150)
 ck('Dislike replaces like, not a second vote','0' in p2.locator('[data-work=like]').first.inner_text() and '1' in p2.locator('[data-work=dislike]').first.inner_text())
 p2.locator('[data-work=like]').first.click();p2.wait_for_timeout(100)
 shot(p2,'02-player-maps-server-test.png')
 # Authoring screenshot: all props are real editor entries, not a mock UI.
 p.evaluate("__shadowShift.workshop.openEditor(__SS.maps.DEMO_MAPS[0].map)")
 p.evaluate("__shadowShift.workshop.camera=1150;__shadowShift.renderer.editorCamera=1150")
 p.wait_for_timeout(80);shot(p,'03-editor-desktop.png')
 # A falling cow is captured from an active simulation state.
 p.evaluate("__shadowShift.workshop.playMap(__SS.maps.DEMO_MAPS[0].map)")
 p.evaluate('''()=>{const a=__shadowShift,r=a.run,o=r.level.obstacles.find(o=>o.kind==='cow');r.x=o.x-230;r.falling.set(o.id,{at:r.t-.45,impact:false});r.status='ready';}''')
 p.wait_for_timeout(100);shot(p,'04-cow-gameplay.png')
 ck('Falling cow uses a simulated falling body',p.evaluate("__shadowShift.run.fallBody(__shadowShift.run.level.obstacles.find(o=>o.kind==='cow')).y")>50)
 p.evaluate("__shadowShift.workshop.playMap(__SS.maps.DEMO_MAPS[1].map)")
 p.evaluate('''()=>{const a=__shadowShift,r=a.run,o=r.level.obstacles.find(o=>o.kind==='meteor');r.x=o.x-200;r.falling.set(o.id,{at:r.t-.55,impact:false});r.status='ready';}''')
 p.wait_for_timeout(100);shot(p,'05-meteor-gameplay.png')
 # Mobile editor placement plus input resizing.
 m=boot(b,{'width':430,'height':932},False,True);m.locator('[data-action=workshop]').tap()
 m.locator('[data-work=tool][data-value=spike]').tap()
 pos=m.evaluate('({x:600*__shadowShift.renderer.scale,y:(__shadowShift.renderer.floor-50)*__shadowShift.renderer.scale})')
 m.touchscreen.tap(pos['x'],pos['y']);ck('Touch places an editor obstacle',m.evaluate('__shadowShift.workshop.draft.obstacles.length')==1)
 shot(m,'06-editor-portrait.png')
 m.set_viewport_size({'width':932,'height':430});m.wait_for_timeout(80);shot(m,'07-editor-landscape.png')
 ck('Editor actions stay inside landscape viewport',m.locator('.editor-actions').evaluate('e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight;}'))
 m.locator('[data-work=test]').tap();m.locator('[data-action=character][data-value=boy]').tap();m.locator('[data-action=character-done]').tap()
 ck('Character selection resumes the pending custom test',m.evaluate('__shadowShift.mode')=='editor-test')
 j=m.locator('#jump').bounding_box();sun=m.locator('#sun').bounding_box();cdp=m.context.new_cdp_session(m)
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':j['x']+j['width']/2,'y':j['y']+j['height']/2,'id':1},{'x':sun['x']+sun['width']*.9,'y':sun['y']+sun['height']/2,'id':2}]});m.wait_for_timeout(100)
 ck('Two-touch jump and sunlight work together',m.evaluate('__shadowShift.run.y')>15 and m.evaluate('__shadowShift.run.sun')==1)
 cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
 m.locator('#pause').tap();tt=m.evaluate('__shadowShift.run.t');m.wait_for_timeout(100);ck('Pause freezes new falling system and movement',m.evaluate('__shadowShift.run.t')==tt)
 m.locator('[data-action=menu]').tap();m.locator('[data-action=playerMaps]').tap();m.locator('[data-work=tab][data-value=online]').tap();m.wait_for_timeout(100)
 ck('Standalone build never invents online map votes',m.locator('[data-work=like]').count()==0 and 'خادم' in m.locator('#ui').inner_text())
 ck('Zero JavaScript page errors',not errors)
 report={'version':'0.5.0','browser':b.version,'checks':checks,'count':len(checks),'errors':errors,'real_shared_server_test':True,'limits':'set_content + test-only memory storage and HTTP bridge to localhost service. Browser URL navigation blocked. Server HTTP/session headers tested separately by Node tests. No real browser hosting, cookie persistence, SW upgrades, real Android device, frame-time, battery, public hosting or revenue verification.'}
 (OUT/'browser-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps({'count':len(checks),'errors':errors,'browser':b.version},indent=2));b.close()
