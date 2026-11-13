import {createServer,request} from 'node:http'
import {readFile,mkdir,writeFile,rename} from 'node:fs/promises'
import {createReadStream} from 'node:fs'
import {dirname,join,resolve} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {Readable} from 'node:stream'
import {randomUUID,createHash} from 'node:crypto'
import {startStandaloneGal} from '../../dist/standalone-server.js'
import {apply,workPersona,personaDefaults} from '../../dist/index.js'
import {ART_PACKS} from '../../dist/art-packs.js'
import {DEFAULT_ART_FILES} from '../../dist/default-art.js'
import {AgentWorkshop} from './agent-workshop.mjs'
import {createModelClient} from './model-client.mjs'
import {CAST} from './cast.mjs'

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..')
const packageVersion=JSON.parse(await readFile(join(root,'package.json'),'utf8')).version
const instance=createHash('sha256').update(root).digest('hex').slice(0,16)
const types={webp:'image/webp',png:'image/png',svg:'image/svg+xml',jpg:'image/jpeg',woff2:'font/woff2',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',html:'text/html; charset=utf-8'}
const json=(res,status,data)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(data))}
async function body(req,max=512000){let size=0;const chunks=[];for await(const c of req){size+=c.length;if(size>max)throw new Error('请求过大');chunks.push(c)}return Buffer.concat(chunks)}
function port(value,fallback){const n=Number(value??fallback);if(!Number.isInteger(n)||n<0||n>65535)throw new Error('端口必须是 0–65535 的整数');return n}
export function validateConfig(input){
 if(!['dsh','hermes'].includes(input.backend))throw new Error('请选择 DSH 或 Hermes')
 const dshPort=port(input.dshPort,3080);if(dshPort===0)throw new Error('DSH 端口不可为 0')
 const modelUrl=String(input.modelUrl||'http://127.0.0.1:8645/v1'),url=new URL(modelUrl)
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash)throw new Error('请输入无凭据的 HTTP(S) 模型接口地址')
 if(url.protocol==='http:'&&!['127.0.0.1','localhost','[::1]'].includes(url.hostname))throw new Error('远程模型接口需要 HTTPS')
 return {backend:input.backend,dshPort,modelUrl:modelUrl.replace(/\/$/,''),model:String(input.model||'default').slice(0,160)}
}
function proxyDsh(req,res,dshPort){
 const headers={...req.headers,host:'127.0.0.1:'+dshPort,origin:'http://127.0.0.1:'+dshPort,'sec-fetch-site':'same-origin'}
 for(const key of Object.keys(headers))if(/^(?:connection|keep-alive|transfer-encoding|upgrade|forwarded|x-forwarded-|referer)/i.test(key))delete headers[key]
 const upstream=request({host:'127.0.0.1',port:dshPort,path:req.url,method:req.method,headers},response=>{
  const result={...response.headers};for(const key of Object.keys(result))if(/^(?:connection|transfer-encoding|access-control-)/i.test(key))delete result[key]
  res.writeHead(response.statusCode||502,result);response.pipe(res);response.on('error',()=>res.destroy())
 })
 upstream.setTimeout(20*60*1000,()=>upstream.destroy(new Error('DSH 请求超时')))
 upstream.on('error',()=>{if(!res.headersSent)json(res,502,{error:'DSH 未连接；请启动 DSH 和 GAL 插件，或在后端设置修改端口。'});else res.destroy()})
 req.on('aborted',()=>upstream.destroy());res.on('close',()=>{if(!res.writableEnded)upstream.destroy()});req.pipe(upstream)
}
export async function startApp(options={}){
 const dataDir=resolve(options.dataDir||join(root,'.local')),configPath=join(dataDir,'config.json')
 let saved=null;try{saved=JSON.parse(await readFile(configPath,'utf8'))}catch(error){if(error.code!=='ENOENT')throw error}
 let config=validateConfig({...{backend:'dsh',dshPort:3080,modelUrl:'http://127.0.0.1:8645/v1',model:'default'},...saved,...options.config})
 let configured=!!saved||!!options.config?.backend
 let launcher={};try{launcher=JSON.parse(await readFile(join(dataDir,'launcher.json'),'utf8'))}catch(error){if(error.code!=='ENOENT')throw error}
 const workshop=new AgentWorkshop({dataDir,command:options.hermesCommand||process.env.WHG_HERMES_COMMAND||launcher.hermesCommand||'hermes',getPersona:async id=>{
  ensureEngine();let profile=personaDefaults(id)
  const req=Readable.from([Buffer.from(JSON.stringify({action:'profile-get',args:{characterId:id}}))]);req.method='POST'
  await routes.find(r=>r.path==='/whale-galgame-api').handler(req,{writeHead(){},end(body){const result=JSON.parse(body);if(result.effective)profile=result.effective}})
  return workPersona(id,profile)
 },...(options.createClient?{createClient:options.createClient}:{})});await workshop.init()
 const routes=[],effects=[]
 let engineStarted=false
 function ensureEngine(){
  if(engineStarted)return;engineStarted=true
  const llm=createModelClient({...config,apiKey:process.env.WHG_MODEL_API_KEY||''})
  apply({dshHomePath:(...p)=>join(dataDir,'hermes',...p),llm,webServer:{register:r=>routes.push(r)},on:()=>()=>{},inject:(deps,fn)=>{if(deps.includes('agents')||deps.includes('web'))return;fn({agentDefaultModel:{currentSelection:()=>({provider:'hermes',model:config.model})}})},effect:fn=>{const dispose=fn();if(typeof dispose==='function')effects.push(dispose)}},{enabled:true,standalonePort:0,imageBackend:'off',chatProvider:'hermes',chatModel:config.model})
 }
 const internalToken=randomUUID()
 const apiServer=createServer((req,res)=>{void (async()=>{
  if(req.headers['x-whale-internal-token']!==internalToken){json(res,403,{error:'Private backend'});return}
  delete req.headers['x-whale-internal-token']
  if(config.backend==='dsh'){proxyDsh(req,res,config.dshPort);return}
  ensureEngine()
  const path=new URL(req.url,'http://localhost').pathname
  if(path==='/whale-galgame-api'){
   const bytes=await body(req,20*1024*1024),input=bytes.length?JSON.parse(bytes):{}
   if(input.action==='party-context'){json(res,200,{ok:true,ready:true,notices:[],sessionId:null});return}
   const clone=Readable.from([bytes]);Object.assign(clone,{url:req.url,method:req.method,headers:req.headers})
   await routes.find(r=>r.path===path).handler(clone,res);return
  }
  json(res,404,{error:'接口不存在'})
 })().catch(error=>json(res,400,{error:error.message}))})
 await new Promise((resolve,reject)=>{apiServer.once('error',reject);apiServer.listen(0,'127.0.0.1',resolve)})
 const allowed=new Set(ART_PACKS.files),defaults=new Set(DEFAULT_ART_FILES)
 async function streamFile(req,res,file,type){
  const data=await readFile(file);res.writeHead(200,{'content-type':type,'content-length':data.length,'cache-control':'no-cache','x-content-type-options':'nosniff'});res.end(req.method==='HEAD'?undefined:data)
 }
 async function handleRequest(req,res){
  const path=new URL(req.url,'http://localhost').pathname
  if(path==='/health'){
   if(!['GET','HEAD'].includes(req.method)){json(res,405,{error:'仅支持 GET/HEAD'});return true}
   json(res,200,{ok:true,service:'dshgal',version:packageVersion,backend:config.backend,instance});return true
  }
  if(path==='/'&&!configured){res.writeHead(302,{location:'/connection'});res.end();return true}
  if(path==='/connection'||path==='/agent'||(config.backend==='hermes'&&(path==='/character-party/'||path==='/character-party'))){
   if(!['GET','HEAD'].includes(req.method)){json(res,405,{error:'仅支持 GET/HEAD'});return true}
   res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self'; frame-ancestors 'self'; base-uri 'none'; form-action 'self'")
   await streamFile(req,res,join(root,'apps/standalone/public',path==='/connection'?'connection.html':'agent.html'),types.html);return true
  }
  if(['/app-ui.js','/app-ui.css'].includes(path)){await streamFile(req,res,join(root,'apps/standalone/public',path==='/app-ui.js'?'ui.js':'ui.css'),path.endsWith('.js')?types.js:types.css);return true}
  if(path.startsWith('/whale-galgame-media/')){
   let file;try{file=decodeURIComponent(path.slice('/whale-galgame-media/'.length))}catch{json(res,400,{error:'无效路径'});return true}
   if(!allowed.has(file)&&!(file.startsWith('default/')&&defaults.has(file.slice(8)))){json(res,404,{error:'素材不存在'});return true}
   if(!['GET','HEAD'].includes(req.method)){json(res,405,{error:'仅支持 GET/HEAD'});return true}
   await streamFile(req,res,join(root,'assets',file.startsWith('default/')?file:'packs/'+file),types[file.split('.').at(-1)]||'application/octet-stream');return true
  }
  if(path==='/app-api'){
   try{
    if(req.method==='GET'){json(res,200,{ok:true,config,configured,cast:CAST,threads:workshop.view()});return true}
    if(req.method!=='POST'){json(res,405,{error:'仅支持 GET/POST'});return true}
    const input=JSON.parse((await body(req)).toString('utf8'))
    if(input.action==='configure'){
     if(workshop.view().some(t=>['running','awaiting-permission'].includes(t.status)))throw new Error('请先结束工坊委托再切换后端')
     const next=validateConfig(input.config)
     if(next.dshPort===handle.port||next.dshPort===apiServer.address().port)throw new Error('DSH 端口必须与本工具端口不同')
     if(engineStarted&&(next.model!==config.model||next.modelUrl!==config.modelUrl))throw new Error('修改 Hermes 模型连接后请重启工具，并使用环境变量或配置文件应用')
     await mkdir(dataDir,{recursive:true});await writeFile(configPath+'.tmp',JSON.stringify(next,null,2)+'\n',{mode:0o600});await rename(configPath+'.tmp',configPath);config=next;configured=true;json(res,200,{ok:true})
    }else if(config.backend!=='hermes')throw new Error('DSH 委托请使用游戏中的工坊委托')
    else if(input.action==='run')json(res,200,{ok:true,...await workshop.run(input.args||{})})
    else if(input.action==='approve')json(res,200,workshop.approve(input.args||{}))
    else if(input.action==='cancel'){await workshop.cancel(input.args?.id);json(res,200,{ok:true})}
    else throw new Error('未知操作')
   }catch(error){json(res,400,{error:error.message})}
   return true
  }
  return false
 }
 let handle
 try{
  handle=startStandaloneGal({port:port(options.port,9987),upstreamPort:apiServer.address().port,upstreamHeaders:{'x-whale-internal-token':internalToken},clientRoot:join(root,'dist'),getContext:()=>({sessionId:null,workspace:null,sessions:[]}),handleRequest,onError:()=>{}})
  await handle.ready
  if(config.dshPort===handle.port)throw new Error('DSH 端口必须与本工具端口不同')
 }catch(error){await handle?.close();apiServer.close();await workshop.close();throw error}
 let closed=false
 return {url:handle.url,port:handle.port,close:async()=>{if(closed)return;closed=true;await workshop.close();for(const dispose of effects)dispose();await handle.close();apiServer.closeAllConnections();await new Promise(r=>apiServer.close(r))}}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const args=process.argv.slice(2),options={config:{}}
 const fields={'--port':'port','--data-dir':'dataDir','--hermes-command':'hermesCommand'}
 const configs={'--backend':'backend','--dsh-port':'dshPort','--model-url':'modelUrl','--model':'model'}
 try{
  if(args.includes('--help')){console.log('Whale GAL 2.2\n  npm start -- [--backend dsh|hermes] [--port 9987] [--dsh-port 3080]\n  [--data-dir .local] [--hermes-command hermes] [--model-url http://127.0.0.1:8645/v1] [--model MODEL]');process.exit(0)}
  for(let i=0;i<args.length;i+=2){const key=args[i],value=args[i+1];if(!value||value.startsWith('--'))throw new Error('参数缺少值：'+key);if(fields[key])options[fields[key]]=value;else if(configs[key])options.config[configs[key]]=value;else throw new Error('未知参数：'+key)}
  const app=await startApp(options);console.log('深海女仆工坊 '+app.url+'\n后端设置：'+app.url+'/connection')
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{void app.close().then(()=>process.exit(0))})
 }catch(error){console.error(error.message);process.exitCode=1}
}
