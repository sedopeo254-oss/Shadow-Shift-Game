import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {SCENES,sceneFor,sceneryCell,tutorialFor} from '../src/scenery.js';
import {makeLevel} from '../src/content.js';
import {sanitizeSave,freshSave} from '../src/core.js';
test('Only level one enables onboarding in every mode/attempt',()=>{
 for(let id=1;id<=30;id++)for(let attempt=0;attempt<4;attempt++){
  const l=makeLevel(id,attempt);assert.equal(tutorialFor(l),id===1);assert.equal(l.tutorial,id===1);
 }
 assert.equal(tutorialFor(null),false);assert.equal(tutorialFor(undefined),false);
});
test('Every stage has its own named scene, signature landmark, palette and seed',()=>{
 assert.equal(SCENES.length,30);for(const key of ['name','landmark','seed','horizon'])assert.equal(new Set(SCENES.map(s=>s[key])).size,30);
});
test('Scenery is stable across attempts but changes between adjacent stages',()=>{
 for(let id=1;id<=30;id++){
  const a=sceneFor(makeLevel(id,0).id),b=sceneFor(makeLevel(id,8).id);assert.deepEqual(a,b);
  if(id<30)assert.notDeepEqual(a,sceneFor(id+1));
 }
});
test('World-space scenery cells do not wrap at the old periodic tile offsets',()=>{
 const seen=new Set();for(let index=-4;index<200;index++){
  const v=sceneryCell(13,1,index);assert.deepEqual(v,sceneryCell(13,1,index));assert.ok(!seen.has(JSON.stringify(v)));seen.add(JSON.stringify(v));
  assert.notEqual(v.height,sceneryCell(13,1,index+1).height);
 }
});
test('Presentation contains no retry mutation announcement payload',async()=>{
 const src=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
 for(const text of ['العالم تعلّم','التحوّل التالي','THE STAGE REMEMBERS','EVERY DEATH CHANGES','toast(this.run.level.change)','renderer.ghost','كل خسارة تغيّر'])assert.equal(src.includes(text),false,text);
 const retry=src.slice(src.indexOf(' retry(){'),src.indexOf('\n pause(){'));
 assert.ok(!retry.includes('this.toast('));assert.ok(!retry.includes('audio.effect('));
});
test('Legacy 0.3 completion saves remain valid and position-free',()=>{
 const s=freshSave();s.character='girl';s.completed[1]={stars:3,score:100,time:48};s.credits=70;s.skin=1;s.owned=[0,1];
 const migrated=sanitizeSave(JSON.parse(JSON.stringify(s)));assert.equal(migrated.unlocked,2);assert.equal(migrated.credits,70);assert.equal(migrated.skin,1);assert.equal('x' in migrated,false);
});
test('Service worker and portable bundler include the new scenery module',async()=>{
 const sw=await readFile(new URL('../sw.js',import.meta.url),'utf8'),build=await readFile(new URL('../tools/build.mjs',import.meta.url),'utf8');
 assert.ok(sw.includes('./src/scenery.js'));assert.ok(build.includes("'scenery'"));assert.ok(sw.includes('0.5.0'));
});
