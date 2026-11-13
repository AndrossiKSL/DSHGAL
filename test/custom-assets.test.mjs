import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {Readable} from 'node:stream'
import {createServer} from 'node:http'
import {apply,setGalChatProvider} from '../dist/index.js'
const pause=ms=>new Promise(r=>setTimeout(r,ms))
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN1kAAAAASUVORK5CYII='
function boot(home,config={}){let route;apply({dshHomePath:(...p)=>join(home,...p),effect:fn=>fn(),on(){},inject(){},webServer:{register(r){route=r}}},{enabled:true,imageBackend:'off',...config},{});return async(action,args={})=>{let text='',code;const req=Readable.from([Buffer.from(JSON.stringify({action,args}))]);req.method='POST';await route.handler(req,{writeHead(c){code=c},end(v){text=v}});const r=JSON.parse(text);if(code!==200)throw new Error(r.error);return r}}
test('custom groups, slots, copies and presets survive restart without erasing source assets',async()=>{
  const home=mkdtempSync(join(tmpdir(),'asset-custom-'))
  try{
    let call=boot(home)
    const group=(await call('asset-group-save',{name:'雨夜服装'})).group
    const slot=(await call('asset-slot-save',{label:'撑伞倾听',category:'日常/雨天',kind:'sprite',action:'attentive',prompt:'adult whale maid holding umbrella, attentive gaze',generation:{width:768,height:1152,seed:123,steps:18}})).slot
    const imported=await call('asset-import',{characterId:'deepseek',kind:'sprite',action:'attentive',group:group.id,slotId:slot.id,label:'旧图',dataUrl:png})
    await call('asset-apply',{id:imported.id})
    const copy=await call('asset-duplicate',{id:imported.id})
    await call('asset-rename',{id:copy.id,label:'候选新图'})
    await call('asset-preset-save',{name:'雨夜预设',kind:'sprite',prompt:'umbrella, evening',generation:{width:768,height:1152,seed:123,steps:18}})
    call=boot(home)
    let lib=await call('asset-list')
    assert.equal(lib.slots[0].label,'撑伞倾听');assert.equal(lib.presets[0].generation.seed,123)
    assert.ok(lib.groups.some(g=>g.id===group.id));assert.equal(lib.items.length,2)
    assert.equal(lib.bindings[group.id+':deepseek:slot:'+slot.id],imported.id)
    await call('asset-unbind',{id:copy.id})
    lib=await call('asset-list');assert.equal(lib.bindings[group.id+':deepseek:slot:'+slot.id],imported.id,'unbinding unused candidate must preserve adopted image')
    await call('asset-slot-save',{...slot,label:'雨中认真倾听'})
    await call('asset-group-save',{id:group.id,name:'雨天日常'})
    await call('asset-group-delete',{id:group.id})
    lib=await call('asset-list');assert.equal(lib.items.length,2);assert.ok(lib.items.every(i=>i.group==='default'))
    assert.equal((await call('asset-group-delete',{id:'default'})).ok,false)
    await call('asset-slot-delete',{id:slot.id});assert.ok((await call('asset-list')).items.every(i=>!i.slotId))
  }finally{await pause(100);rmSync(home,{recursive:true,force:true})}
})
test('reference generation forwards saved parameters to the actual ComfyUI workflow',async()=>{
  const home=mkdtempSync(join(tmpdir(),'asset-reference-'));let workflow,upload=false
  const server=createServer(async(req,res)=>{
    res.setHeader('content-type','application/json')
    if(req.url==='/upload/image'){upload=true;for await(const _ of req){}res.end(JSON.stringify({name:'ref.png'}))}
    else if(req.url==='/prompt'){let body='';for await(const c of req)body+=c;workflow=JSON.parse(body).prompt;res.end(JSON.stringify({prompt_id:'ref-job'}))}
    else if(req.url.startsWith('/history/'))res.end(JSON.stringify({'ref-job':{outputs:{'9':{images:[{filename:'result.png'}]}}}}))
    else if(req.url.startsWith('/view?')){res.setHeader('content-type','image/png');res.end(Buffer.from(png.split(',')[1],'base64'))}
    else res.end(JSON.stringify({'Image Rembg (Remove Background)':{input:{}},system:{},devices:[]}))
  });await new Promise(r=>server.listen(0,'127.0.0.1',r))
  try{
    const call=boot(home,{imageBackend:'comfyui',comfyBaseUrl:'http://127.0.0.1:'+server.address().port})
    const old=await call('asset-import',{characterId:'deepseek',kind:'sprite',action:'attentive',label:'原图',dataUrl:png})
    await call('asset-apply',{id:old.id})
    const before=(await call('asset-list')).jobs.length
    const bad=await call('asset-generate',{prompt:'test',generation:{width:777}})
    assert.equal(bad.ok,false);assert.equal((await call('asset-list')).jobs.length,before)
    const result=await call('asset-generate',{characterId:'deepseek',kind:'sprite',action:'attentive',prompt:'fully clothed adult whale maid, shy pose',label:'新图',referenceAssetId:old.id,generation:{width:768,height:1152,seed:42,steps:13,cfg:2.4,denoise:0.45,transparent:true,ckpt:'custom.safetensors',lora:'custom-lora.safetensors',loraWeight:0,negative:'text, watermark'}})
    let job
    for(let i=0;i<50;i++){job=(await call('asset-job',{id:result.job.id})).job;if(['failed','ready'].includes(job.status))break;await pause(150)}
    assert.equal(job.status,'ready',job.error);assert.equal(job.previousAssetId,old.id);assert.equal(upload,true)
    const nodes=Object.values(workflow), sampler=nodes.find(n=>n.class_type==='KSampler')
    assert.equal(sampler.inputs.seed,42);assert.equal(sampler.inputs.steps,13);assert.equal(sampler.inputs.cfg,2.4);assert.equal(sampler.inputs.denoise,0.45)
    assert.ok(nodes.some(n=>n.class_type==='LoadImage'));assert.ok(nodes.some(n=>n.class_type==='VAEEncode'))
    assert.equal(nodes.find(n=>n.class_type==='CheckpointLoaderSimple').inputs.ckpt_name,'custom.safetensors')
    assert.equal(nodes.find(n=>n.class_type==='LoraLoader').inputs.strength_model,0)
    const stored=await call('asset-data',{id:job.assetId});assert.equal(stored.referenceAssetId,old.id);assert.equal(stored.generation.seed,42)
    assert.equal((await call('asset-list')).bindings['default:deepseek:sprite:attentive'],old.id,'result must not auto replace original')
    await call('asset-apply',{id:job.assetId});assert.equal((await call('asset-list')).bindings['default:deepseek:sprite:attentive'],job.assetId)
  }finally{server.closeAllConnections();await new Promise(r=>server.close(r));await pause(100);rmSync(home,{recursive:true,force:true})}
})
test('prompt polishing uses chosen role and preserves the authored requirement',async()=>{
  const home=mkdtempSync(join(tmpdir(),'asset-polish-'));let captured
  setGalChatProvider(async r=>{captured=r;return 'adult whale maid, umbrella, attentive gaze, relaxed shoulders'})
  try{const call=boot(home);const r=await call('asset-prompt-polish',{characterId:'deepseek',draft:'她撑伞认真听我说话',prompt:'blue hair'});assert.equal(r.ok,true);assert.ok(captured.prompt.includes('撑伞'));assert.ok(r.prompt.includes('umbrella'))}
  finally{setGalChatProvider(null);await pause(100);rmSync(home,{recursive:true,force:true})}
})
