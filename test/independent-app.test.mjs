import test from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {startApp,validateConfig} from '../apps/standalone/server.mjs'
import {AgentWorkshop} from '../apps/standalone/agent-workshop.mjs'
import {HermesACP} from '../apps/standalone/hermes-acp.mjs'
import {PassThrough,Writable} from 'node:stream'
import {EventEmitter} from 'node:events'

const waitFor=async predicate=>{for(let i=0;i<100;i++){if(predicate())return;await new Promise(r=>setTimeout(r,10))}throw new Error('Condition not reached')}
const post=(base,action,args)=>fetch(base+'/app-api',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,args})})
test('independent Hermes engine boots, saves and exposes the latest allowlisted media without DSH',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'gal-independent-')),app=await startApp({port:0,dataDir:dir,config:{backend:'hermes'}})
 try{
  const page=await fetch(app.url);assert.equal(page.status,200);assert.match(await page.text(),/runtime\.js/)
  const call=async (action,args={})=>(await fetch(app.url+'/whale-galgame-api',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,args})})).json()
  assert.equal((await call('view')).current,'deepseek')
  assert.equal((await call('party-context')).ready,true)
  const media=await fetch(app.url+'/whale-galgame-media/default/portrait-glm.webp');assert.equal(media.status,200);assert.equal(media.headers.get('content-type'),'image/webp')
  assert.equal((await fetch(app.url+'/whale-galgame-media/default/../../package.json')).status,404)
  assert.equal((await fetch(app.url+'/app-api',{headers:{origin:'https://foreign.example'}})).status,403)
  assert.equal((await fetch(app.url+'/character-party/')).status,200)
  assert.equal((await fetch(app.url+'/app-api',{method:'DELETE'})).status,405)
  await call('settings-set',{settings:{petEnabled:false}})
  const state=await readFile(join(dir,'hermes/storages/dsh-whale-galgame/global.json'),'utf8');assert.ok(state.includes('deepseek'))
 }finally{await app.close();await new Promise(r=>setTimeout(r,100));await rm(dir,{recursive:true,force:true})}
})
test('DSH is the default, fixed upstream APIs retain request bodies and use upstream origin',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'gal-dsh-default-')),seen=[]
 const upstream=createServer(async(req,res)=>{let text='';for await(const part of req)text+=part;seen.push({url:req.url,origin:req.headers.origin,text});res.setHeader('content-type','application/json');res.end('{"ok":true}')})
 await new Promise(r=>upstream.listen(0,'127.0.0.1',r))
 const app=await startApp({port:0,dataDir:dir,config:{dshPort:upstream.address().port}})
 try{
  assert.equal((await (await fetch(app.url+'/app-api')).json()).config.backend,'dsh')
  assert.equal((await fetch(app.url,{redirect:'manual'})).headers.get('location'),'/connection')
  await fetch(app.url+'/whale-galgame-api',{method:'POST',body:'{"action":"view"}'})
  assert.equal(seen[0].text,'{"action":"view"}');assert.equal(seen[0].origin,'http://127.0.0.1:'+upstream.address().port)
  assert.equal((await fetch(app.url+'/credentials')).status,404)
 }finally{await app.close();upstream.closeAllConnections();await new Promise(r=>upstream.close(r));await rm(dir,{recursive:true,force:true})}
})
test('connection rejects unsafe endpoints, unknown backends and self-proxy loops',async()=>{
 assert.throws(()=>validateConfig({backend:'unknown'}));assert.throws(()=>validateConfig({backend:'hermes',modelUrl:'http://example.com/v1'}));assert.throws(()=>validateConfig({backend:'hermes',modelUrl:'https://key:secret@example.com/v1'}));assert.throws(()=>validateConfig({backend:'dsh',dshPort:0}))
 const dir=await mkdtemp(join(tmpdir(),'gal-config-')),app=await startApp({port:0,dataDir:dir})
 try{const response=await fetch(app.url+'/app-api',{method:'POST',body:JSON.stringify({action:'configure',config:{backend:'dsh',dshPort:app.port}})});assert.equal(response.status,400)}finally{await app.close();await rm(dir,{recursive:true,force:true})}
})
test('Hermes work persists original session IDs, waits for single-use permission and resumes after restart',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'gal-acp-work-')),calls=[]
 const createClient=({onUpdate,onPermission})=>({initialize:async()=>{},session:async(cwd,id)=>{calls.push(id);return id||'real-acp-session'},prompt:async(sessionId)=>{onUpdate({sessionId,update:{sessionUpdate:'agent_message_chunk',content:{type:'text',text:'已核对文件。'}}});const choice=await onPermission({toolCall:{title:'修改文件'},options:[{optionId:'once',kind:'allow_once',name:'Allow once'},{optionId:'forever',kind:'allow_always',name:'Always'},{optionId:'deny',kind:'reject_once',name:'Deny'}]});assert.equal(choice,'once');return {stopReason:'end_turn'}},close(){},cancel(){}})
 let workshop=new AgentWorkshop({dataDir:dir,createClient});await workshop.init()
 try{
  const {id}=await workshop.run({cwd:dir,prompt:'读取并核对'});await waitFor(()=>workshop.view()[0]?.permission)
  const row=workshop.view()[0];assert.equal(row.permission.options.length,2);assert.throws(()=>workshop.approve({id:row.permission.id,optionId:'forever'}))
  workshop.approve({id:row.permission.id,optionId:'once'});await waitFor(()=>workshop.view()[0]?.status==='completed');await workshop.save();await workshop.close()
  workshop=new AgentWorkshop({dataDir:dir,createClient});await workshop.init();await workshop.run({id,prompt:'继续核对'});await waitFor(()=>workshop.view()[0]?.permission);workshop.approve({id:workshop.view()[0].permission.id,optionId:'once'});await waitFor(()=>workshop.view()[0]?.status==='completed')
  assert.deepEqual(calls,[null,'real-acp-session']);assert.match(workshop.view()[0].output,/已核对/)
 }finally{await workshop.close();await rm(dir,{recursive:true,force:true})}
})
test('ACP transport frames requests, forwards updates and rejects pending calls when child exits',async()=>{
 const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();let frames=[]
 child.stdin=new Writable({write(chunk,_,done){frames.push(JSON.parse(chunk));done()}});child.kill=()=>{}
 const updates=[],client=new HermesACP({spawnProcess:()=>child,onUpdate:x=>updates.push(x),onPermission:async()=>null})
 try{
  const pending=client.initialize();child.stdout.write(JSON.stringify({jsonrpc:'2.0',id:1,result:{protocolVersion:1}})+'\n');assert.equal((await pending).protocolVersion,1)
  child.stdout.write(JSON.stringify({method:'session/update',params:{sessionId:'s',update:{}}})+'\n');await waitFor(()=>updates.length===1)
  const failed=client.request('session/new');child.emit('exit',1);await assert.rejects(failed,/已退出/);assert.equal(frames[0].params.clientCapabilities.terminal,false)
 }finally{client.close()}
})
test('concurrent work submissions serialize and cancellation releases a waiting permission',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'gal-cancel-'))
 const createClient=({onPermission})=>({initialize:async()=>{},session:async()=> 'cancel-session',prompt:async()=>{await onPermission({options:[{optionId:'deny',kind:'reject_once',name:'Deny'}]});return {stopReason:'cancelled'}},close(){},cancel(){}})
 const workshop=new AgentWorkshop({dataDir:dir,createClient});await workshop.init()
 try{
  const results=await Promise.allSettled([workshop.run({cwd:dir,prompt:'第一项'}),workshop.run({cwd:dir,prompt:'第二项'})]);assert.deepEqual(results.map(r=>r.status),['fulfilled','rejected'])
  await waitFor(()=>workshop.view()[0]?.permission);const permission=workshop.view()[0].permission.id
  await workshop.cancel(workshop.view()[0].id);await waitFor(()=>workshop.jobs.size===0);assert.equal(workshop.view()[0].status,'cancelled');assert.throws(()=>workshop.approve({id:permission,optionId:'deny'}))
 }finally{await workshop.close();await rm(dir,{recursive:true,force:true})}
})
