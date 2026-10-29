// Keep updates waiting until old clients close. Never reload an active run.
const CACHE='shadow-shift-0.5.0-1';
const FILES=['./','./index.html','./src/style.css','./src/quiet.css','./src/workshop.css','./src/workshop.js','./src/maps.js','./src/visuals.js','./src/app.js','./src/core.js','./src/content.js','./src/render.js','./src/scenery.js','./assets/icon.svg','./manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('shadow-shift-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 if(new URL(event.request.url).pathname.includes('/api/'))return;
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 event.respondWith(caches.open(CACHE).then(async cache=>{
  const match=await cache.match(event.request,{ignoreSearch:event.request.mode==='navigate'});if(match)return match;
  try{return await fetch(event.request);}catch(error){if(event.request.mode==='navigate')return cache.match('./index.html');throw error;}
 }));
});
