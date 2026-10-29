import test from 'node:test';
import assert from 'node:assert/strict';
import {makeLevel,LEVELS,parseCode,challengeCode,dailyLevel} from '../src/content.js';
import {Run,STEP,SaveStore,SAVE_KEY,sanitizeSave,freshSave,recordDeath,recordWin} from '../src/core.js';
import {oracle} from './oracle.mjs';
function complete(level){const run=new Run(level);run.start();let ticks=0;while(run.status==='running'&&ticks++<26000){oracle(run);run.update(STEP);}return run;}
for(const level of LEVELS)test(`Level ${level.id}: four deterministic variants have a traversable route`,()=>{
 for(let attempt=0;attempt<4;attempt++){
  const l=makeLevel(level.id,attempt,{early:9,late:2});const r=complete(l);
  assert.equal(r.status,'won',`${level.id}/${attempt}: ${r.cause} at ${r.x.toFixed(2)} / ${l.length}`);
  assert.ok(Math.abs(r.t-level.duration)<.03);
  assert.equal(l.shards.length,3);
 }
});
test('Every death changes the first trap and bridge angle',()=>{for(let id=1;id<=30;id++){const a=makeLevel(id,0),b=makeLevel(id,1);assert.notDeepEqual(a.obstacles,b.obstacles);assert.notEqual(a.obstacles[1].kind,b.obstacles[1].kind);assert.notEqual(a.obstacles[0].required,b.obstacles[0].required);}});
test('Seeded levels are repeatable and challenge profiles are ignored',()=>{assert.deepEqual(makeLevel(19,2,{early:5},123),makeLevel(19,2,{late:7},123));assert.deepEqual(makeLevel(1,0),makeLevel(1,0));});
test('Challenge codes roundtrip and reject invalid versions',()=>{assert.deepEqual(parseCode(challengeCode(19,0xffffffff)),{id:19,seed:0xffffffff});for(const s of ['SS2-01-00000000','SS1-00-00000000','SS1-31-12345678','<script>'])assert.equal(parseCode(s),null);});
test('Daily series is deterministic and changes by UTC day',()=>{assert.deepEqual(dailyLevel('2026-10-29'),dailyLevel('2026-10-29'));assert.notEqual(dailyLevel('2026-10-29').seed,dailyLevel('2026-10-30').seed);});
test('UFO capture is a failure, never a checkpoint',()=>{const l=makeLevel(19),o=l.obstacles.find(o=>o.kind==='ufo');const r=new Run(l);r.start();r.x=o.x;r.sun=o.required===0?1:0;r.update();assert.equal(r.status,'dead');assert.equal(r.cause,'ufo');const retry=new Run(makeLevel(19,1));assert.equal(retry.x,80);assert.equal(retry.t,0);assert.equal(retry.collected.size,0);});
test('Matching sunlight blocks UFO capture',()=>{const l=makeLevel(19),o=l.obstacles.find(o=>o.kind==='ufo');const r=new Run(l);r.start();r.x=o.x;r.setSun(o.required);r.update();assert.equal(r.status,'running');});
test('Unaligned shadow gap is fatal; aligned gap supports the player',()=>{const l=makeLevel(1),o=l.obstacles[0];let r=new Run(l);r.start();r.x=o.x+5;r.sun=-o.required||1;for(let i=0;i<100;i++)r.update();assert.equal(r.status,'dead');r=new Run(l);r.start();r.x=o.x+5;r.setSun(o.required);for(let i=0;i<100;i++)r.update();assert.equal(r.status,'running');assert.equal(r.y,0);});
test('No simulation progress outside running state',()=>{const r=new Run(makeLevel(1));for(let i=0;i<120;i++)r.update();assert.equal(r.x,80);assert.equal(r.t,0);r.start();r.die('spike');const x=r.x;for(let i=0;i<120;i++)r.update();assert.equal(r.x,x);});
test('Save allowlist excludes all run coordinates and transient rewards',()=>{const s=freshSave();s.x=999;s.y=88;s.checkpoint=100;s.run={x:900,time:45};s.collected=[1,2,3];const clean=sanitizeSave(s);for(const k of ['x','y','checkpoint','run','collected'])assert.equal(k in clean,false);});
test('Save derives unlocked stages from contiguous completed results',()=>{const s=freshSave();s.unlocked=30;s.completed[1]={stars:2,score:12,time:48};assert.equal(sanitizeSave(s).unlocked,2);});
test('Malformed imports cannot replace current save',()=>{const m=new Map();const store=new SaveStore({getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v)});store.data.credits=25;store.save();assert.throws(()=>store.import('{'));assert.equal(store.data.credits,25);assert.throws(()=>store.import(JSON.stringify({version:99})));assert.throws(()=>store.import('x'.repeat(66000)));});
test('Storage failures do not crash gameplay',()=>{const store=new SaveStore({getItem(){throw Error('denied');},setItem(){throw Error('denied');}});assert.ok(store.warning);assert.equal(store.save(),false);assert.equal(store.data.version,1);});
test('Corrupt primary save recovers validated backup',()=>{const m=new Map([[SAVE_KEY,'invalid'],[SAVE_KEY+'.backup',JSON.stringify({...freshSave(),credits:81})]]);const store=new SaveStore({getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v)});assert.equal(store.data.credits,81);});
test('Only completed campaign runs award permanent resources',()=>{const s=freshSave(),r=new Run(makeLevel(1));r.start();r.collected.add(0);recordDeath(s,r,'campaign');assert.equal(s.credits,0);assert.equal(s.unlocked,1);const win=complete(makeLevel(1));recordWin(s,win,'campaign');const credits=s.credits;recordWin(s,win,'campaign');assert.equal(s.credits,credits);assert.equal(s.unlocked,2);});
test('Daily reward is claimable only once per date',()=>{const s=freshSave(),r=complete(makeLevel(7));recordWin(s,r,'daily','2026-10-29');recordWin(s,r,'daily','2026-10-29');assert.equal(s.credits,45);assert.equal(s.unlocked,1);});
test('Shared challenge cannot unlock campaign or award currency',()=>{const s=freshSave();recordWin(s,complete(makeLevel(19)),'challenge');assert.equal(s.credits,0);assert.equal(s.unlocked,1);});
test('Both character choices use identical physics',()=>{const a=new Run(makeLevel(1)),b=new Run(makeLevel(1));a.character='boy';b.character='girl';a.start();b.start();for(let i=0;i<200;i++){oracle(a);oracle(b);a.update();b.update();}assert.equal(a.x,b.x);assert.equal(a.y,b.y);});
test('Adversarial save properties are rejected or bounded',()=>{const s=sanitizeSave({...freshSave(),credits:Infinity,owned:[0,999,'__proto__'],settings:{quality:'unbounded',leftHand:'yes'},failures:{1:{count:NaN,early:Infinity,cause:'script'}},daily:JSON.parse('{"__proto__":{"score":123}}')});assert.equal(s.credits,0);assert.deepEqual(s.owned,[0]);assert.equal(s.settings.quality,'auto');assert.equal(s.failures[1].count,0);assert.equal(s.daily.score,undefined);});

test('Incomplete runs cannot earn a win reward',()=>{assert.throws(()=>recordWin(freshSave(),new Run(makeLevel(1)),'campaign'));});

for(const seed of [0,42,4294967295])test(`Shared seed ${seed}: late-world variants remain traversable`,()=>{
 for(const id of [8,19,24,30])for(let variant=0;variant<3;variant++)assert.equal(complete(makeLevel(id,variant,{},seed)).status,'won');
});
test('Obstacle envelopes do not overlap and stay within level bounds',()=>{
 for(let id=1;id<=30;id++)for(let attempt=0;attempt<3;attempt++){
  const l=makeLevel(id,attempt);let right=0;
  for(const o of l.obstacles){assert.ok(o.x-right>=150);assert.ok(o.x+o.w<l.length-200);right=o.x+o.w;}
 }
});
