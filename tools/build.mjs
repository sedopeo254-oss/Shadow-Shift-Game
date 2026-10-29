import {readFile,writeFile,cp,mkdir,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
for(const p of ['index.html','src','assets','manifest.webmanifest','sw.js'])await cp(p,'dist/'+p,{recursive:true});
let html=await readFile('index.html','utf8');
// Each module has a private scope except intentionally exported names.
// Build a tiny module registry rather than flattening lexical declarations.
const exports={content:['VERSION','CONTENT_VERSION','WORLD_NAMES','WORLD_EN','PALETTES','LEVELS','SKINS','LABELS','DIRECTIONS','hash','random','utcDay','dailyLevel','challengeCode','parseCode','makeLevel'],core:['STEP','SAVE_KEY','clamp','freshSave','sanitizeSave','SaveStore','Run','recordDeath','recordWin'],scenery:['SCENES','sceneFor','tutorialFor','sceneryCell','Scenery'],render:['drawHero','Renderer']};
let bundle='const SS={};\n';
for(const p of ['content','core','scenery','render','app']){
 let text=await readFile(`src/${p}.js`,'utf8');
 text=text.replace(/^import \{([^}]+)\} from '\.\/(\w+)\.js';/gm,(_,names,mod)=>`const {${names}}=SS.${mod};`).replace(/^export /gm,'');
 bundle+=`SS.${p}=(()=>{\n${text}\nreturn {${(exports[p]||[]).join(',')}};\n})();\n`;
}
const css=(await readFile('src/style.css','utf8'))+(await readFile('src/quiet.css','utf8'));
html=html.replace('<link rel="stylesheet" href="./src/quiet.css">','').replace('<link rel="stylesheet" href="./src/style.css">',`<style>${css}</style>`).replace('<link rel="manifest" href="./manifest.webmanifest">','').replace('<link rel="icon" href="./assets/icon.svg" type="image/svg+xml">','').replace('<script type="module" src="./src/app.js"></script>',`<script type="module">${bundle.replace(/<\/script/gi,'<\\/script')}</script>`);
await writeFile('dist/Shadow-Shift-Portable.html',html);
const sum=createHash('sha256').update(bundle+css).digest('hex').slice(0,12);
let sw=await readFile('dist/sw.js','utf8');sw=sw.replace("shadow-shift-0.4.0-1",'shadow-shift-0.4.0-'+sum);await writeFile('dist/sw.js',sw);
console.log(`Built dependency-free web + portable HTML. Source fingerprint: ${sum}`);
