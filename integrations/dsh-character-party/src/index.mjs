import{WorkBuddy}from'./workbuddy.mjs'
import{SuperAgent}from'./superagent.mjs'
import {readFile} from 'node:fs/promises'
import{createHash}from'node:crypto'
import{scopedPath}from'./workbuddy.mjs'
import {dirname,join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {randomUUID} from 'node:crypto'
import {Party} from './party.mjs'
import{ApiSources}from'./api-sources.mjs'
import{matchRoles}from'./model-config.mjs'
import{sameOriginRequest}from'./http-origin.mjs'
import{testModelConnection}from'./model-test.mjs'
import {createDshAdapter} from './dsh-adapter.mjs'
export const name='character-party'
export const inject=['agents','subagents','llm','webServer','tools','agentDefaultModel']
export function apply(ctx,config={}){
 let credentials=null
 if(!config.adapter)ctx.inject(['credentials'],scope=>{credentials=scope.credentials})
 const sources=config.sources||(!config.adapter?new ApiSources({ctx,path:ctx.dshHomePath('storages','dsh-character-party','api-sources.json'),credentials:()=>{if(!credentials)throw new Error('DSH 凭据服务尚未就绪');return credentials}}):null)
 const workbuddy=config.adapter?null:new WorkBuddy({cliPath:config.workbuddyCliPath,onPermission:input=>party.coordinator.approval(input)})
 const adapter=config.adapter||createDshAdapter(ctx,{workbuddy}),root=join(dirname(fileURLToPath(import.meta.url)),'../public'),token=randomUUID()
 const party=new Party({path:config.storagePath||ctx.dshHomePath('storages','dsh-character-party','party.json'),roles:config.getRoles||(()=>[]),adapter}),ready=(async()=>{if(sources)await sources.init();await party.init();await new SuperAgent(party).init();return party})()
 const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data))}
 ctx.webServer.register({kind:'prefix',path:'/character-party',handler:async(req,res)=>{
  const url=new URL(req.url,'http://localhost'),file=url.pathname==='/character-party'||url.pathname==='/character-party/'?'index.html':url.pathname.slice('/character-party/'.length)
  if(!['GET','HEAD'].includes(req.method)||!['index.html','party.js','party.css','model-settings.js','superagent.js'].includes(file)){res.writeHead(404);res.end();return}
  const bytes=await readFile(join(root,file));res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:bytes)
 }})
 ctx.webServer.register({kind:'exact',path:'/character-party-artifact',handler:async(req,res)=>{try{await ready;if(req.method!=='GET'||!sameOriginRequest(req)||req.headers['x-character-party-token']!==token)return json(res,403,{ok:false,error:'请从工坊打开产物'});const id=new URL(req.url,'http://localhost').searchParams.get('id'),entry=party.state.super.threads.flatMap(t=>t.artifacts||[]).find(a=>a.id===id);if(!entry)return json(res,404,{ok:false,error:'产物不存在'});const project=party.state.projects[entry.projectId],path=await scopedPath(project.cwd,entry.path),bytes=await readFile(path);if(createHash('sha256').update(bytes).digest('hex')!==entry.sha256)return json(res,409,{ok:false,error:'文件已改变，请重新核对后再下载'});res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Disposition':'attachment; filename="artifact"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(bytes)}catch(e){json(res,400,{ok:false,error:e.message})}}})
 ctx.webServer.register({kind:'exact',path:'/character-party-api',handler:async(req,res)=>{
  try{
   await ready
   if(!sameOriginRequest(req))return json(res,403,{ok:false,error:'请求来源不匹配'})
   if(req.method==='GET')return json(res,200,{...party.view(new URL(req.url,'http://localhost').searchParams.get('project')||''),token})
   if(req.method!=='POST')return json(res,405,{ok:false,error:'Unsupported method'})
   if(req.headers['x-character-party-token']!==token)return json(res,403,{ok:false,error:'请刷新委托窗口后再试'})
   let bytes=0;const parts=[];for await(const part of req){bytes+=part.length;if(bytes>512000)return json(res,413,{ok:false,error:'请求过大'});parts.push(Buffer.from(part))}
   const {action,args={}}=JSON.parse(Buffer.concat(parts).toString('utf8')||'{}')
   const superAgent=party.coordinator
   const handlers={'workspace-open':x=>superAgent.workspace(x),'thread-open':x=>superAgent.open(x),'thread-input':x=>superAgent.input(x),'thread-pause':x=>superAgent.pause(x),'thread-resume':x=>superAgent.resume(x),'thread-cancel':x=>superAgent.cancel(x),'thread-recall':x=>superAgent.recall(x),'notice-ack':x=>superAgent.ack(x),'approval-resolve':x=>superAgent.approve(x),submit:x=>party.submit(x),cancel:x=>party.cancel(x),archive:x=>party.archive(x),settings:x=>party.settings(x),remember:x=>party.remember(x),forget:x=>party.forget(x),catalog:async(args)=>{const statuses=args.refresh&&sources?await sources.refreshAll():[];return{ok:true,models:await adapter.catalog(!!args.refresh),sources:sources?await sources.view():[],statuses}},'model-test':async args=>args.provider==='workbuddy'?adapter.test(args):testModelConnection(ctx.llm,args,await adapter.catalog()),'provider-test':async args=>{if(!sources)throw new Error('API 服务未就绪');return sources.test(args)},'provider-save':async args=>{if(!sources)throw new Error('当前环境没有 API 管理服务');const r=await sources.save(args);await adapter.catalog(true);return r},'model-match':async args=>({ok:true,...matchRoles(party.roster(),await adapter.catalog(),args.provider||'')})}
   if(!handlers[action])return json(res,400,{ok:false,error:'未知操作'})
   json(res,200,await handlers[action](args))
  }catch(e){json(res,400,{ok:false,error:e.message||String(e)})}
 }})
 ctx.on('dispose',async()=>{await party.close();sources?.close()});ready.catch(e=>console.error('Character party startup failed:',e.message))
 return{party,ready}
}
