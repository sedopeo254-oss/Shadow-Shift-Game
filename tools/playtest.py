"""Optional Chromium smoke tests. Requires Python Playwright and a Chromium executable.
Loads the built portable file with set_content; does not validate hosting or service workers.
Run npm run build first, then: python tools/playtest.py
"""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json
import os
import shutil
ROOT=Path(__file__).resolve().parents[1]
out=ROOT/'playtest-output'
out.mkdir(exist_ok=True)
html=(ROOT/'dist/Shadow-Shift-Portable.html').read_text(encoding='utf-8').replace('const app=new ShadowShift();','const app=new ShadowShift(); window.__shadowShift=app;')
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE') or shutil.which('chromium') or shutil.which('chromium-browser'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    errors=[]
    page=browser.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
    page.on('pageerror',lambda err:errors.append(str(err)))
    page.set_content(html); page.wait_for_timeout(800)
    page.screenshot(path=str(out/'01-desktop-menu.png'))
    page.locator('[data-action="continue"]').click()
    page.screenshot(path=str(out/'02-character-select.png'))
    page.locator('[data-action="character"][data-value="girl"]').click()
    page.locator('[data-action="character-done"]').click()
    page.locator('[data-action="launch"]').click()
    page.keyboard.down('Space');page.wait_for_timeout(200)
    assert page.evaluate('window.__shadowShift.run.y')>10
    page.keyboard.up('Space')
    page.wait_for_timeout(800)
    page.screenshot(path=str(out/'03-first-stage.png'))
    # Freeze for an exact pause check.
    page.locator('#pause').click()
    t=page.evaluate('window.__shadowShift.run.t');page.wait_for_timeout(300)
    assert page.evaluate('window.__shadowShift.run.t')==t
    page.locator('.primary[data-action="resume"]').click()
    # Reproduce a shadow-gap failure using a controlled placement, not invincibility.
    page.evaluate('''() => {const a=__shadowShift,o=a.run.level.obstacles[0];a.run.x=o.x+20;a.run.y=0;a.run.vy=0;a.run.grounded=true;a.setSun(o.required===0?1:0);}''')
    page.wait_for_timeout(650)
    assert page.evaluate('__shadowShift.screen')=='result'
    assert page.evaluate('__shadowShift.run.cause')=='void'
    old=page.evaluate('__shadowShift.run.level.obstacles[1].kind')
    page.screenshot(path=str(out/'04-failure.png'))
    page.locator('[data-action="retry"]').click()
    assert page.evaluate('__shadowShift.run.x')<180
    assert page.evaluate('__shadowShift.run.level.obstacles[1].kind')!=old
    page.locator('#pause').click();page.locator('[data-action="menu"]').click()
    page.locator('[data-action="challenge"]').click()
    page.locator('[data-action="sample"][data-value="19"]').click()
    page.locator('[data-action="launch"]').click()
    page.evaluate('''() => {const a=__shadowShift,o=a.run.level.obstacles.find(o=>o.kind==='ufo');a.run.x=o.x-230;a.setSun(o.required);}''')
    page.wait_for_timeout(100)
    page.screenshot(path=str(out/'05-ufo-stage.png'))
    # Actual collision with wrong sunlight.
    page.evaluate('''() => {const a=__shadowShift,o=a.run.level.obstacles.find(o=>o.kind==='ufo');a.run.x=o.x+20;a.setSun(o.required===0?1:0);}''')
    page.wait_for_timeout(100)
    assert page.evaluate('__shadowShift.run.cause')=='ufo'
    page.locator('[data-action="retry"]').click()
    assert page.evaluate('__shadowShift.run.x')<180
    mobile=browser.new_context(viewport={'width':430,'height':932},device_scale_factor=2,is_mobile=True,has_touch=True)
    m=mobile.new_page();m.on('pageerror',lambda err:errors.append(str(err)))
    m.set_content(html);m.wait_for_timeout(500)
    m.screenshot(path=str(out/'06-mobile-menu.png'))
    m.locator('[data-action="continue"]').tap();m.locator('[data-action="character"][data-value="boy"]').tap();m.locator('[data-action="character-done"]').tap();m.locator('[data-action="launch"]').tap()
    m.locator('#jump').tap();m.wait_for_timeout(120)
    assert m.evaluate('__shadowShift.run.y')>5
    m.wait_for_timeout(600);m.screenshot(path=str(out/'07-mobile-stage.png'))
    # Resize through landscape during a run.
    m.set_viewport_size({'width':932,'height':430});m.wait_for_timeout(200)
    m.screenshot(path=str(out/'08-landscape-stage.png'))
    # Input and pause must still work after orientation changes.
    m.locator('#pause').tap();m.locator('[data-action="settings"]').tap();m.locator('[data-setting="leftHand"]').check();m.locator('[data-setting="reduced"]').check()
    m.screenshot(path=str(out/'09-landscape-settings.png'))
    assert m.evaluate('document.body.classList.contains("left-handed")')
    # In-memory portable build must boot without loading external game assets.
    portable=browser.new_page(viewport={'width':1100,'height':720})
    portable.on('pageerror',lambda err:errors.append(str(err)))
    portable.set_content(html)
    portable.wait_for_timeout(400)
    assert portable.locator('[data-action="continue"]').is_visible()
    portable.locator('[data-action="continue"]').click()
    portable.locator('[data-action="character"][data-value="boy"]').click()
    portable.locator('[data-action="character-done"]').click()
    portable.locator('[data-action="launch"]').click()
    portable.wait_for_timeout(200)
    assert portable.locator('#hud').is_visible()
    assert not errors, errors
    report={'environment_note':'Original build environment blocked browser URL navigation. This harness tests the exact portable HTML using Playwright set_content with an inspection handle. HTTPS service-worker installation and real-origin storage/reload are not browser-verified here. Save serialization is covered by Node tests.','browser':'Chromium '+browser.version,'errors':errors,'checks':['desktop boot','boy/girl selection','keyboard jump','pause freezes physics','void failure','full restart','visible trap mutation','UFO shield scene','UFO failure','UFO full reset','portrait touch jump','landscape resize','left handed controls','reduced motion','portable HTML injected boot and play'],'screenshots':sorted(x.name for x in out.glob('*.png'))}
    (out/'browser-report.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report,indent=2))
    browser.close()
