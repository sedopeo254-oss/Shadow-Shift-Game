/** Reference controller for geometry regression tests, never enabled in the game. */
export function oracle(run){
 const next=run.level.obstacles.find(o=>o.x+o.w>run.x-12&&['bridge','ufo','gate'].includes(o.kind));
 if(next&&next.x-run.x<500)run.setSun(next.required);
 const hazard=run.level.obstacles.find(o=>['spike','laser','saw','cow','meteor','crate'].includes(o.kind)&&o.x+o.w>run.x-15);
 const shard=run.level.shards.find(s=>!run.collected.has(s.id)&&s.x>run.x);
 if(run.grounded&&((hazard&&hazard.x-run.x<run.level.speed*.29&&hazard.x>run.x-10)||(shard&&shard.x-run.x<run.level.speed*.29&&shard.x>run.x)))run.pressJump();
}
