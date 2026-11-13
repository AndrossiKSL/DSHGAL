import test from 'node:test'
import assert from 'node:assert/strict'
import{mkdtempSync,rmSync,readFileSync}from'node:fs'
import{tmpdir}from'node:os'
import{join}from'node:path'
import{Readable}from'node:stream'
import{apply,setGalChatProvider}from'../dist/index.js'
function boot(home){const routes=[];apply({dshHomePath:(...p)=>join(home,...p),effect:fn=>fn(),on(){},inject(){},webServer:{register:r=>routes.push(r)}},{enabled:true,imageBackend:'off'},{});return{routes,call:async(action,args={})=>{let body='',status;const req=Readable.from([Buffer.from(JSON.stringify({action,args}))]);req.method='POST';await routes.find(r=>r.path==='/whale-galgame-api').handler(req,{writeHead(n){status=n},end(v){body=v}});const r=JSON.parse(body);if(status!==200)throw new Error(r.error);return r}}}
const pause=ms=>new Promise(r=>setTimeout(r,ms))
test('theme media serves correct image/font MIME types from the packaged whitelist',async()=>{
 const home=mkdtempSync(join(tmpdir(),'signal-media-'))
 try{
  const{routes,call}=boot(home);await call('view');const route=routes.find(r=>r.path==='/whale-galgame-media')
  const samples=[['signal/assets/fonts/atelier-serif-ui.woff2','font/woff2'],['signal/assets/icons/reading-icons.svg','image/svg+xml'],['signal/assets/surfaces/menu_selected.png','image/png'],['signal/asset-atlas.jpg','image/jpeg']]
  for(const[path,mime]of samples){let status,headers,body;await route.handler({url:'/whale-galgame-media/'+path,method:'GET'},{writeHead(n,h){status=n;headers=h},end(v){body=v}});assert.equal(status,200);assert.equal(headers['Content-Type'],mime);assert.ok(body.length>100)}
  for(const url of ['/whale-galgame-media/signal/../../cordis.patch.yml','/whale-galgame-media/signal/assets/fonts/OFL.txt','/whale-galgame-media/signal/unknown.svg']){let status;await route.handler({url,method:'GET'},{writeHead(n){status=n},end(){}});assert.equal(status,404)}
  const manifest=JSON.parse(readFileSync(new URL('../assets/packs/manifest.json',import.meta.url),'utf8'));assert.equal(manifest.signal.version,'1.7');assert.ok(manifest.signal.files.length>=140)
  for(const id of ['deepseek','claude','chatgpt','gemini','kimi','grok','glm','qwen','minimax','seed','llama','mistral','hunyuan','mimo','stepfun','perplexity','rwkv','image2','jev','wenxin','codex','comfyui']){
   for(const state of ['normal','hover','pressed','selected','disabled']){
    assert.ok(manifest.files.includes('signal/assets/characters/'+id+'/choices/choice_'+state+'.png'))
    assert.ok(manifest.files.includes('signal/assets/characters/'+id+'/collection/frame_'+state+'.png'))
   }
  }
  assert.ok(manifest.files.includes('signal/assets/details/chronicle.png'))
  const css=JSON.parse(readFileSync(new URL('../src/client/signal-theme.generated.ts',import.meta.url),'utf8').split('export const SIGNAL_THEME_CSS=')[1].trim());assert.ok(css.includes('.continue-cue{'));assert.ok(css.includes('@keyframes whsig-continue-cue'))
 }finally{await pause(100);rmSync(home,{recursive:true,force:true})}
})
test('slot preview follows the saved world scene and remains stable after further play',async()=>{
 const home=mkdtempSync(join(tmpdir(),'signal-slots-'));let day=1
 setGalChatProvider(async()=>JSON.stringify({line:'旧地图就放在这里吧。',scene:{day,time:'清晨',location:'海洋档案馆',background:'scenery-marine-archive'},action:'attentive',choices:[]}))
 try{
  const{call}=boot(home);await call('gal-free-start',{roleId:'kimi'});const save=await call('gal-save',{slot:2})
  const row=save.slots.find(s=>s.slot===2);assert.equal(row.free,true);assert.deepEqual(row.preview,{roleId:'kimi',background:'scenery-marine-archive',day:1,location:'海洋档案馆'})
  day=2;await call('gal-free-next',{action:'明天再继续',requestId:'next'});assert.equal((await call('gal-free-state')).slots.find(s=>s.slot===2).preview.day,1)
  const loaded=await call('gal-load',{slot:2});assert.equal(loaded.world.scene.day,1);assert.equal(loaded.slots.find(s=>s.slot===2).summary.progress,1)
 }finally{setGalChatProvider(null);await pause(100);rmSync(home,{recursive:true,force:true})}
})
