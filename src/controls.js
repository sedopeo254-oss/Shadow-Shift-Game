/** A held action may belong to several fingers/keys. Release only its owner. */
export class ActionLatch {
 constructor(onPress,onRelease){this.sources=new Set();this.onPress=onPress;this.onRelease=onRelease;}
 press(source){if(this.sources.has(source))return;const first=this.sources.size===0;this.sources.add(source);if(first)this.onPress();}
 release(source){if(source===undefined){const held=this.sources.size>0;this.sources.clear();if(held)this.onRelease();return;}if(!this.sources.delete(source))return;if(!this.sources.size)this.onRelease();}
 get held(){return this.sources.size>0;}
}
/** Normalize screen-space sunlight input while retaining a real accessible range. */
export function sunlightAt(clientX,rect){if(!Number.isFinite(clientX)||rect.width<=0)return 0;return Math.max(-1,Math.min(1,Math.round((clientX-rect.left)/rect.width*2)-1));}
/** Visual interpolation never changes simulation, replays, collisions or rewards. */
export function visualPosition(run,fraction=1){const a=Math.max(0,Math.min(1,Number.isFinite(fraction)?fraction:1));return {x:run.prevX+(run.x-run.prevX)*a,y:run.prevY+(run.y-run.prevY)*a};}
