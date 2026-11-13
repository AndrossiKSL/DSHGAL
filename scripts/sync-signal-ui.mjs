import{readFileSync,writeFileSync,mkdirSync,copyFileSync,existsSync,readdirSync}from'node:fs'
import{resolve,dirname,relative,join}from'node:path'
import{fileURLToPath}from'node:url'
import{createHash}from'node:crypto'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),source=resolve(process.argv[2]||'')
if(!process.argv[2]||!existsSync(join(source,'manifest.json')))throw new Error('Usage: node scripts/sync-signal-ui.mjs <atelier-signal-ui-directory>')
const json=p=>JSON.parse(readFileSync(join(source,p),'utf8').replace(/^\uFEFF/,''))
const manifest=json('manifest.json'),layout=json('layout.json'),skins=json('character-skins.json'),choices=json('choice-skins.json')
let css=readFileSync(join(source,'ui.css'),'utf8'),files=new Set()
const media='/whale-galgame-media/signal/'
if(existsSync(join(source,'source/supporting-ui.css')))css+='\n'+readFileSync(join(source,'source/supporting-ui.css'),'utf8')
function copy(path){if(path.includes('..')||!path.startsWith('assets/')&&path!=='asset-atlas.jpg')throw new Error('Unexpected UI asset '+path);const dest=join(root,'assets/packs/signal',path);mkdirSync(dirname(dest),{recursive:true});copyFileSync(join(source,path),dest);files.add('signal/'+path);return media+path}
css=css.replace(/url\(\s*['"]?([^)'"\s]+)['"]?\s*\)/g,(all,path)=>path.startsWith('data:')?all:'url("'+copy(path)+'")')
const fontRules=[];css=css.replace(/@font-face\s*\{[^}]+\}/g,x=>{fontRules.push(x);return ''}).replaceAll(':root',':scope')
const animationNames=new Set([...css.matchAll(/@keyframes\s+([\w-]+)/g)].map(m=>m[1]))
css=css.replace(/@keyframes\s+([\w-]+)/g,(_,name)=>'@keyframes whsig-'+name)
css=css.replace(/(\banimation(?:-name)?\s*:\s*)([^;}]+)/g,(_,property,value)=>property+value.replace(/[A-Za-z_][\w-]*/g,name=>animationNames.has(name)?'whsig-'+name:name))
css=fontRules.join('\n')+'\n@scope (.whsig) {\n'+css+'\n}\n'
const extra=['assets/details/chronicle.png','assets/system/icons.svg','assets/labels/game-logo.png','assets/icons/close.png','assets/icons/reading-icons.svg','assets/icons/reading-controls.svg','assets/fx/title-tide.svg','assets/fx/comfy-tide-aigirls.png','assets/surfaces/titlebar_normal.png','asset-atlas.jpg']
for(const f of extra)copy(f)
for(const state of manifest.states)copy('assets/surfaces/menu_'+state+'.png')
for(const[id,skin]of Object.entries(skins.characters)){
 for(const key of ['frame','panelAsset','toolbar'])copy(skin[key])
 for(const state of manifest.states){
  copy('assets/characters/'+id+'/choices/choice_'+state+'.png')
  copy('assets/characters/'+id+'/collection/frame_'+state+'.png')
 }
 copy(skin.effect)
 if(existsSync(join(source,'assets/characters',id,'collection/panel.png')))copy('assets/characters/'+id+'/collection/panel.png')
}
for(const f of readdirSync(join(source,'assets/fonts')))if(/OFL|license|source/i.test(f)){const dst=join(root,'assets/packs/signal/assets/fonts',f);mkdirSync(dirname(dst),{recursive:true});copyFileSync(join(source,'assets/fonts',f),dst)}
const packPath=join(root,'assets/packs/manifest.json'),pack=JSON.parse(readFileSync(packPath,'utf8'))
pack.files=[...new Set([...pack.files,...files])];pack.sha256 ||= {}
for(const f of files)pack.sha256[f]=createHash('sha256').update(readFileSync(join(root,'assets/packs',f))).digest('hex')
pack.signal={...pack.signal,version:manifest.artRevision,sourceCssSha256:createHash('sha256').update(readFileSync(join(source,'ui.css'))).digest('hex'),files:[...files]}
writeFileSync(packPath,JSON.stringify(pack,null,2)+'\n')
const{sha256,...runtime}=pack
writeFileSync(join(root,'src/art-packs.ts'),'/** Runtime art snapshot and strict media allowlist. */\nexport const ART_PACKS='+JSON.stringify(runtime)+' as const\n')
const theme={version:manifest.artRevision,root:media,layout,subpanels:existsSync(join(source,'subpanel-skins.json'))?json('subpanel-skins.json'):null,skins:skins.characters,choices:choices.characters,menu:manifest.menu,files:[...files]}
writeFileSync(join(root,'src/signal-theme.ts'),'/** Synchronized UI art contract. Regenerate with scripts/sync-signal-ui.mjs. */\nexport const SIGNAL_THEME='+JSON.stringify(theme)+' as const\n')
writeFileSync(join(root,'src/client/signal-theme.generated.ts'),'/** Scoped stylesheet from the approved UI preview. */\nexport const SIGNAL_THEME_CSS='+JSON.stringify(css)+'\n')
console.log(`Signal UI ${manifest.artRevision}: ${files.size} runtime assets synchronized`)
