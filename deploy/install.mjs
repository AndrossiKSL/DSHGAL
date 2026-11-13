import {readFile,writeFile,mkdir,stat,realpath,open} from 'node:fs/promises'
import {existsSync,readFileSync} from 'node:fs'
import {spawn,spawnSync} from 'node:child_process'
import {createServer} from 'node:net'
import {dirname,join,resolve,relative,isAbsolute} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
import {packageDshPlugin} from '../scripts/package-plugin.mjs'
import {HermesACP} from '../apps/standalone/hermes-acp.mjs'

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
export function parseOptions(args){
 const result={backend:'dsh',profile:'web',port:9987,dshPort:3080,modelUrl:'http://127.0.0.1:8645/v1',model:'default'}
 const fields={'--backend':'backend','--profile':'profile','--port':'port','--dsh-port':'dshPort','--dsh-entry':'dshEntry','--hermes-command':'hermesCommand','--model-url':'modelUrl','--model':'model'}
 for(let i=0;i<args.length;i++){
  const arg=args[i];if(['--dry-run','--no-start','--skip-plugin-install'].includes(arg)){result[{'--dry-run':'dryRun','--no-start':'noStart','--skip-plugin-install':'skipPluginInstall'}[arg]]=true;continue}
  if(!fields[arg]||!args[i+1]||args[i+1].startsWith('--'))throw new Error('未知参数或缺少值：'+arg)
  result[fields[arg]]=args[++i]
 }
 if(!['dsh','hermes'].includes(result.backend))throw new Error('backend 必须是 dsh 或 hermes')
 if(!/^[a-zA-Z0-9_-]+$/.test(result.profile))throw new Error('无效的 DSH profile 名称')
 for(const key of ['port','dshPort']){result[key]=Number(result[key]);if(!Number.isInteger(result[key])||result[key]<1||result[key]>65535)throw new Error('端口必须在 1–65535 之间')}
 if(result.port===result.dshPort)throw new Error('前端与 DSH 端口不可相同')
 const url=new URL(result.modelUrl);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash)throw new Error('模型接口需要无凭据的 HTTP(S) URL')
 if(url.protocol==='http:'&&!['127.0.0.1','localhost','[::1]'].includes(url.hostname))throw new Error('远程模型接口需要 HTTPS')
 return result
}
export async function verifyManifest(projectRoot){
 const path=join(projectRoot,'deployment-manifest.json')
 if(!existsSync(path))return {sourceCheckout:true}
 const manifest=JSON.parse(await readFile(path,'utf8'))
 if(manifest.schema!=='dshgal-share/1'||manifest.edition!=='complete')throw new Error('部署需要 complete 分享包；代码包需先提供素材并构建')
 for(const [file,expected]of Object.entries(manifest.files)){
  if(file.includes('\\')||file.startsWith('/')||file.split('/').includes('..'))throw new Error('校验清单路径无效')
  const full=resolve(projectRoot,file),part=relative(projectRoot,full)
  if(part.startsWith('..')||isAbsolute(part))throw new Error('校验清单路径越界')
  const info=await stat(full);if(!info.isFile()||info.size!==expected.bytes||hash(await readFile(full))!==expected.sha256)throw new Error('部署文件损坏或已修改：'+file)
 }
 return {version:manifest.version,verifiedFiles:Object.keys(manifest.files).length}
}
export async function findDshEntry(explicit){
 const candidates=[]
 if(explicit)candidates.push(resolve(explicit))
 if(process.env.DSH_ENTRY)candidates.push(resolve(process.env.DSH_ENTRY))
 if(process.env.DSH_HOME)candidates.push(join(process.env.DSH_HOME,'runtime/node_modules/@deepseek-ai/dsh/lib/bin.js'))
 const lookup=spawnSync(process.platform==='win32'?'where.exe':'which',['dsh'],{encoding:'utf8',windowsHide:true})
 for(const item of (lookup.stdout||'').trim().split(/\r?\n/).filter(Boolean)){
  candidates.push(join(dirname(item),'node_modules/@deepseek-ai/dsh/lib/bin.js'),join(dirname(item),'../@deepseek-ai/dsh/lib/bin.js'))
  try{const actual=await realpath(item);if(/\.(?:mjs|cjs|js)$/.test(actual))candidates.push(actual)}catch{}
 }
 for(const path of candidates)if(existsSync(path)&&/\.(?:js|mjs|cjs)$/.test(path))return path
 throw new Error('未找到 DSH CLI。让 Agent 通过本机 dsh 启动器定位 bin.js，再传 --dsh-entry；无需重新安装 DSH。')
}
export function pluginInstallArgs(entry,profile,file){return [entry,'plugin','--profile',profile,'add',file,'--ignore-scripts']}
async function portFree(port){return new Promise(resolve=>{const server=createServer();server.once('error',()=>resolve(false));server.listen(port,'127.0.0.1',()=>server.close(()=>resolve(true)))})}
async function health(port){try{const r=await fetch('http://127.0.0.1:'+port+'/health',{signal:AbortSignal.timeout(1500)});return r.ok?await r.json():null}catch{return null}}
export async function install(options){
 const [major,minor]=process.versions.node.split('.').map(Number);if(!(major===22&&minor>=19||major>=24))throw new Error('需要 Node.js 22.19+ 或 24+')
 const verified=await verifyManifest(root)
 const instance=hash(Buffer.from(root)).slice(0,16),existing=await health(options.port)
 if(existing&&existing.instance!==instance)throw new Error('端口已被另一实例占用，请用 --port 选择空闲端口')
 if(!existing&&!await portFree(options.port))throw new Error('端口已占用，请用 --port 选择空闲端口')
 const plan={backend:options.backend,url:'http://127.0.0.1:'+options.port,profile:options.profile,verified,installPlugin:options.backend==='dsh'&&!options.skipPluginInstall}
 if(options.backend==='dsh')plan.dshEntry=await findDshEntry(options.dshEntry)
 else{
  const command=options.hermesCommand||process.env.WHG_HERMES_COMMAND||'hermes'
  if(!options.dryRun){const client=new HermesACP({command});try{const info=await client.initialize();plan.hermesProtocol=info.protocolVersion}finally{client.close()}}
  plan.hermesCommand=command
 }
 if(options.dryRun)return {...plan,dryRun:true}
 const data=join(root,'.local');await mkdir(join(data,'deploy'),{recursive:true})
 if(plan.installPlugin){
  const file=packageDshPlugin(root,join(data,'deploy'))
  const result=spawnSync(process.execPath,pluginInstallArgs(plan.dshEntry,options.profile,file),{cwd:root,encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024})
  await writeFile(join(data,'deploy/dsh-install.log'),(result.stdout||'')+'\n'+(result.stderr||''),{mode:0o600})
  if(result.error||result.status!==0)throw new Error('DSH 插件安装失败；请检查 .local/deploy/dsh-install.log')
  plan.dshRestartRequired=true
 }
 const config={backend:options.backend,dshPort:options.dshPort,modelUrl:options.modelUrl,model:options.model}
 await writeFile(join(data,'config.json'),JSON.stringify(config,null,2)+'\n',{mode:0o600})
 if(options.backend==='hermes')await writeFile(join(data,'launcher.json'),JSON.stringify({hermesCommand:plan.hermesCommand})+'\n',{mode:0o600})
 if(options.noStart)return {...plan,started:false,next:'node apps/standalone/server.mjs --port '+options.port}
 if(existing)return {...plan,started:false,reused:true,restartFrontendRequired:true}
 await mkdir(join(data,'logs'),{recursive:true});const log=await open(join(data,'logs/server.log'),'a')
 const args=['apps/standalone/server.mjs','--port',String(options.port)]
 if(options.hermesCommand)args.push('--hermes-command',options.hermesCommand)
 const child=spawn(process.execPath,args,{cwd:root,detached:true,windowsHide:true,stdio:['ignore',log.fd,log.fd]});child.on('error',()=>{});child.unref();await log.close()
 await writeFile(join(data,'runtime.json'),JSON.stringify({pid:child.pid,port:options.port,instance})+'\n')
 for(let i=0;i<50;i++){const ready=await health(options.port);if(ready?.instance===instance)return {...plan,started:true,pid:child.pid};await new Promise(r=>setTimeout(r,200))}
 child.kill();throw new Error('前端启动未通过健康检查，请查看 .local/logs/server.log')
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{if(process.argv.includes('--help'))console.log('node deploy/install.mjs --backend dsh|hermes [--dry-run] [--no-start] [--profile web] [--dsh-entry PATH_TO_BIN_JS] [--port 9987] [--dsh-port 3080] [--model-url URL] [--model MODEL] [--hermes-command PATH] [--skip-plugin-install]')
 else console.log(JSON.stringify(await install(parseOptions(process.argv.slice(2))),null,2))}
 catch(error){console.error(error.message);process.exitCode=1}
}
