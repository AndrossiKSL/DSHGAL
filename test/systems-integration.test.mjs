import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { Readable } from 'node:stream'
import { createServer } from 'node:http'
import { apply, setGalChatProvider } from '../dist/index.js'

const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN1kAAAAASUVORK5CYII='
const pause = ms => new Promise(r => setTimeout(r, ms))
function boot(home, config = {}, extra = {}) {
  let route
  apply({dshHomePath:(...p)=>join(home,...p), effect:fn=>fn(), on(){}, inject(){}, ...extra,
    webServer:{register(spec){route=spec}}}, {enabled:true,imageBackend:'off',...config}, {})
  return async (action,args={}) => {
    let body='',status
    const req=Readable.from([Buffer.from(JSON.stringify({action,args}))]);req.method='POST'
    await route.handler(req,{writeHead(n){status=n},end(v){body=v}})
    const result=JSON.parse(body); if(status!==200) throw new Error(result.error)
    return result
  }
}
function provider(log = []) {
  return async req => {
    log.push(req)
    if(req.system.includes('维护剧情摘要')) return '玩家答应明天带旧地图来，约好在工坊门口见。'
    const action=req.prompt.match(/玩家刚刚(?:说)?：(.*)/)?.[1] || '初次相遇'
    return JSON.stringify({narration:'她放下手中的书，专注地听你说完。',line:'我记住了：'+action,
      choices:[{label:'明天带旧地图来',tag:'约定'},{label:'问她想去哪里',tag:'探索'}],
      scene:{day:2,time:'清晨',location:'工坊门口',background:'bg-atelier-day'},facts:['她喜欢旧地图'],commitments:['明天一起整理旧地图'],action:'attentive',emotion:'专注'})
  }
}
test('worldlines persist complete exchanges, memory, slots, branches and retry identity', async()=>{
  const home=mkdtempSync(join(tmpdir(),'whale-world-')), prompts=[]
  setGalChatProvider(provider(prompts))
  try {
    let call=boot(home)
    let s=await call('gal-free-start',{roleId:'kimi',premise:'我们在雨夜的旧书店相遇'})
    assert.equal(s.free,true);assert.equal(s.world.revision,1);assert.equal(s.scenario.roleId,'kimi')
    const id=s.world.worldId, branch=s.world.branchId
    assert.equal((await call('gal-log')).items.length,2,'opening includes narration AND role line')
    await Promise.all([call('gal-free-next',{action:'我明天带地图来',requestId:'same'}),call('gal-free-next',{action:'我明天带地图来',requestId:'same'})])
    s=await call('gal-free-state'); assert.equal(s.world.revision,2,'simultaneous duplicate advances exactly once')
    assert.equal((await call('gal-log')).items.filter(r=>r.speaker==='你说').length,1)
    await call('gal-save',{slot:3})
    for(let i=0;i<45;i++)await call('gal-free-next',{action:'独有行动-'+i,requestId:'turn-'+i})
    const longLog=await call('gal-log');assert.ok(longLog.items.length>120);assert.ok(longLog.items.some(r=>r.text==='我明天带地图来'))
    s=await call('gal-free-state');assert.ok(s.summary);assert.ok(prompts.some(r=>r.system.includes('我们在雨夜的旧书店相遇')))
    assert.ok(prompts.some(r=>r.system.includes('已确认事实：她喜欢旧地图')))
    call=boot(home)
    s=await call('gal-free-state');assert.equal(s.world.worldId,id);assert.equal(s.world.revision,47)
    assert.deepEqual((await call('gal-log')).items,longLog.items,'restart restores every saved turn')
    const loaded=await call('gal-load',{slot:3});assert.equal(loaded.world.revision,2)
    s=await call('gal-free-next',{action:'这次改去看海',requestId:'new-branch'});assert.equal(s.world.worldId,id);assert.notEqual(s.world.branchId,branch)
    assert.equal(s.world.revision,3);assert.equal(s.world.scene.location,'工坊门口')
    const oldCount=(await call('gal-log')).items.length
    setGalChatProvider(async()=>{throw new Error('网络暂时中断')})
    const fail=await call('gal-free-next',{action:'不可丢失的输入',requestId:'failed'});assert.equal(fail.ok,false);assert.equal(fail.retryable,true)
    assert.equal((await call('gal-log')).items.length,oldCount)
    setGalChatProvider(provider())
    const conflict=await call('gal-free-next',{action:'旧页面',revision:0});assert.equal(conflict.ok,false)
    const other=await call('gal-free-start',{roleId:'grok',restart:true});assert.notEqual(other.world.worldId,id)
    assert.equal((await call('gal-world-list')).items.length,2)
    const resumed=await call('gal-world-select',{worldId:id});assert.equal(resumed.world.revision,3)
    await call('gal-free-exit');assert.equal((await call('gal-free-state')).active,false)
    assert.equal((await call('gal-world-list')).items.length,2,'exiting archives rather than deletes history')
  } finally {setGalChatProvider(null);await pause(100);rmSync(home,{recursive:true,force:true})}
})

test('independent installations create distinct world identities',async()=>{
  const homes=[mkdtempSync(join(tmpdir(),'whale-a-')),mkdtempSync(join(tmpdir(),'whale-b-'))]
  setGalChatProvider(provider())
  try {const a=await boot(homes[0])('gal-free-start'),b=await boot(homes[1])('gal-free-start');assert.notEqual(a.world.worldId,b.world.worldId)}
  finally {setGalChatProvider(null);await pause(100);for(const h of homes)rmSync(h,{recursive:true,force:true})}
})

test('ComfyUI asset job performs real HTTP protocol and keeps preview separate from adoption',async()=>{
  const home=mkdtempSync(join(tmpdir(),'whale-assets-')), requests=[]
  const server=createServer(async(req,res)=>{
    requests.push(req.url)
    res.setHeader('content-type','application/json')
    if(req.url==='/prompt') {let body='';for await(const c of req)body+=c;requests.push(JSON.parse(body));res.end(JSON.stringify({prompt_id:'mock-output'}))}
    else if(req.url.startsWith('/history/'))res.end(JSON.stringify({'mock-output':{outputs:{'9':{images:[{filename:'garden.png',subfolder:'',type:'output'}]}}}}))
    else if(req.url.startsWith('/view?')){res.setHeader('content-type','image/png');res.end(Buffer.from(png.split(',')[1],'base64'))}
    else res.end(JSON.stringify({system:{},devices:[], 'Image Rembg (Remove Background)':{input:{}},name:'reference.png'}))
  })
  await new Promise(r=>server.listen(0,'127.0.0.1',r))
  setGalChatProvider(provider())
  try {
    let call=boot(home,{imageBackend:'comfyui',comfyBaseUrl:'http://127.0.0.1:'+server.address().port})
    const before=await call('bg-data')
    const first=await call('asset-generate',{characterId:'deepseek',kind:'background',label:'清晨花园',prompt:'quiet garden at dawn, no people',requestId:'one-job'})
    assert.equal(first.ok,true);assert.ok(first.job.id)
    assert.equal((await call('asset-generate',{requestId:'one-job'})).duplicate,true)
    let job
    for(let i=0;i<50;i++){job=(await call('asset-job',{id:first.job.id})).job;if(['ready','failed'].includes(job.status))break;await pause(150)}
    assert.equal(job.status,'ready',job.error)
    assert.ok(requests.some(r=>r==='/prompt'));assert.ok(requests.some(r=>typeof r==='string'&&r.startsWith('/history/')))
    const submission=requests.find(r=>typeof r==='object');assert.ok(submission.prompt);assert.ok(JSON.stringify(submission).includes('quiet garden'))
    assert.deepEqual(await call('bg-data'),before,'generation must never adopt automatically')
    const list=await call('asset-list');assert.equal(list.items.length,1);assert.equal(list.items[0].dataUrl,undefined)
    assert.equal((await call('asset-data',{id:job.assetId})).dataUrl,png)
    await call('asset-apply',{id:job.assetId});assert.equal((await call('bg-data')).dataUrl,png)
    const imported=await call('asset-import',{characterId:'deepseek',kind:'sprite',action:'attentive',group:'test',label:'倾听完整动作',dataUrl:png})
    await call('asset-apply',{id:imported.id})
    const story=await call('gal-free-start',{roleId:'deepseek'});assert.equal(story.scenario.spriteUrls.deepseek,png)
    call=boot(home,{imageBackend:'off'})
    assert.equal((await call('asset-list')).items.length,2,'library survives restart')
    assert.equal((await call('gal-free-state')).scenario.spriteUrls.deepseek,png)
    assert.equal((await call('asset-import',{dataUrl:'data:image/svg+xml;base64,AAAA'})).ok,false)
  }finally{setGalChatProvider(null);server.closeAllConnections();await new Promise(r=>server.close(r));await pause(100);rmSync(home,{recursive:true,force:true})}
})

test('host SDK stream replies parse JSON and advance a scripted choice', async()=>{
  const home=mkdtempSync(join(tmpdir(),'whale-sdk-'))
  let captured=[]
  const llm={stream: async function* (request) {
    captured.push(request)
    const json=request.system.includes('玩家这句话可能对应')
      ? JSON.stringify({line:'那就一起整理旧书吧。',choice:'day1-glm'})
      : '我把书放到这里。'
    yield {type:'text-delta',text:json.slice(0,10)}
    yield {type:'text-delta',text:json.slice(10)}
    yield {type:'finish',reason:{kind:'stop'}}
  }}
  try {
    const call=boot(home,{}, {llm})
    let s=await call('gal-start')
    for(let i=0;i<30&&s.node?.kind!=='choice';i++)s=await call('gal-advance')
    assert.equal(s.node.kind,'choice')
    const reply=await call('gal-say',{text:'我想帮她整理旧书'})
    assert.equal(reply.free.branched,'day1-glm')
    assert.ok(captured.some(r=>r.system.includes('[day1-glm]')))
  }finally{await pause(200);rmSync(home,{recursive:true,force:true})}
})
