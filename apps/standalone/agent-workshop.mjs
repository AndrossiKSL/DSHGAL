import {readFile,mkdir,writeFile,rename,stat} from 'node:fs/promises'
import {join,resolve} from 'node:path'
import {randomUUID} from 'node:crypto'
import {HermesACP} from './hermes-acp.mjs'
import {CAST} from './cast.mjs'

export class AgentWorkshop {
 constructor({dataDir,command='hermes',createClient=options=>new HermesACP(options),getPersona=async()=>''}){
  this.path=join(dataDir,'agent-threads.json');this.command=command;this.createClient=createClient;this.getPersona=getPersona
  this.threads=[];this.clients=new Map();this.approvals=new Map();this.saveQueue=Promise.resolve();this.runQueue=Promise.resolve();this.jobs=new Set();this.closed=false
 }
 async init(){
  try{const rows=JSON.parse(await readFile(this.path,'utf8'));if(!Array.isArray(rows))throw new Error('Invalid agent thread data');this.threads=rows}
  catch(error){if(error.code!=='ENOENT')throw error}
  for(const row of this.threads)if(['running','awaiting-permission'].includes(row.status)){row.status='interrupted';row.permission=null}
 }
 save(){const data=JSON.stringify(this.threads,null,2)+'\n';this.saveQueue=this.saveQueue.catch(()=>{}).then(async()=>{await mkdir(resolve(this.path,'..'),{recursive:true});await writeFile(this.path+'.tmp',data,{mode:0o600});await rename(this.path+'.tmp',this.path)});return this.saveQueue}
 view(){return this.threads.map(({id,cwd,role,status,sessionId,output,error,permission,updatedAt})=>({id,cwd,role,status,sessionId,output,error,permission,updatedAt}))}
 run(input){const next=this.runQueue.then(()=>this.start(input));this.runQueue=next.catch(()=>{});return next}
 async start({id,cwd,role='鲸鱼娘',prompt}){
  if(this.closed)throw new Error('工坊正在关闭')
  if(typeof prompt!=='string'||!prompt.trim()||prompt.length>40000)throw new Error('请输入 1–40000 字的委托')
  let row=id?this.threads.find(t=>t.id===id):null
  if(id&&!row)throw new Error('委托不存在')
  if(this.threads.some(t=>['running','awaiting-permission'].includes(t.status)))throw new Error('当前委托结束后可继续提交')
  if(!row){
   if(typeof cwd!=='string'||!cwd.trim())throw new Error('请选择已有的项目目录')
   cwd=resolve(cwd);if(!(await stat(cwd)).isDirectory())throw new Error('项目目录不存在')
   if(this.threads.length>=200)throw new Error('委托记录已达 200 项，请先归档')
   const character=CAST.find(c=>c.id===role||c.name===role);if(!character)throw new Error('请选择已有角色')
   row={id:randomUUID(),cwd,role:character.name,roleId:character.id,sessionId:null,output:'',status:'idle'};this.threads.push(row)
  }
  row.status='running';row.error='';row.output='';row.permission=null;row.updatedAt=Date.now();await this.save()
  const job=this.execute(row,prompt).catch(error=>{if(!this.closed){row.status='failed';row.error=error.message;return this.save()}})
  this.jobs.add(job);void job.then(()=>this.jobs.delete(job),()=>this.jobs.delete(job))
  return {id:row.id}
 }
 async execute(row,prompt){
  let client
  const onUpdate=({sessionId,update}={})=>{
   if(sessionId!==row.sessionId)return
   if(update?.sessionUpdate==='agent_message_chunk'&&update.content?.type==='text')row.output=(row.output+update.content.text).slice(-120000)
   row.updatedAt=Date.now()
  }
  const onPermission=async params=>{
   if(row.status==='cancelled'||this.closed)return null
   const permission={id:randomUUID(),title:String(params.toolCall?.title||'Hermes 工具请求').slice(0,2000),options:(params.options||[]).filter(o=>['allow_once','reject_once'].includes(o.kind)).map(o=>({optionId:o.optionId,name:o.name,kind:o.kind}))}
   const answer=new Promise(resolve=>this.approvals.set(permission.id,{resolve,row,permission}))
   row.status='awaiting-permission';row.permission||=permission
   await this.save()
   if(this.closed||row.status==='cancelled')this.resolvePending(row)
   return answer
  }
  try{
   client=this.createClient({command:this.command,onUpdate,onPermission});this.clients.set(row.id,client)
   await client.initialize();row.sessionId=await client.session(row.cwd,row.sessionId);await this.save()
   if(row.status==='cancelled'||this.closed){client.cancel(row.sessionId);return}
   const persona=await this.getPersona(row.roleId||CAST.find(c=>c.name===row.role)?.id||'deepseek')
   const identity=`你是 GAL 工坊的成年角色「${row.role}」。准确汇报真实工作、文件和验证；不得假称已执行。遵守 Hermes 权限审批，不递归派生其他 Agent。当前项目：${row.cwd}。\n${persona}\n玩家委托：\n`
   const result=await client.prompt(row.sessionId,identity+prompt)
   if(row.status!=='cancelled')row.status=result?.stopReason==='cancelled'?'cancelled':'completed'
  }catch(error){if(row.status!=='cancelled'&&!this.closed){row.status='failed';row.error=error.message}}
  finally{this.resolvePending(row);row.permission=null;row.updatedAt=Date.now();this.clients.delete(row.id);client?.close();await this.save()}
 }
 resolvePending(row){for(const [id,a]of this.approvals)if(a.row===row){this.approvals.delete(id);a.resolve(null)}}
 approve({id,optionId}){
  const pending=this.approvals.get(id);if(!pending)throw new Error('请求已结束，请刷新')
  if(!pending.permission.options.some(o=>o.optionId===optionId))throw new Error('无效的权限选项')
  this.approvals.delete(id);pending.row.permission=[...this.approvals.values()].find(p=>p.row===pending.row)?.permission||null;pending.row.status=pending.row.permission?'awaiting-permission':'running';pending.resolve(optionId);return {ok:true}
 }
 cancel(id){const row=this.threads.find(t=>t.id===id);if(!row)throw new Error('委托不存在');row.status='cancelled';this.resolvePending(row);row.permission=null;const client=this.clients.get(id);if(row.sessionId)client?.cancel(row.sessionId);if(client){const timer=setTimeout(()=>client.close(),2000);timer.unref?.()}return this.save()}
 async close(){this.closed=true;for(const row of this.threads){this.resolvePending(row);if(['running','awaiting-permission'].includes(row.status))row.status='interrupted'}for(const client of this.clients.values())client.close();await Promise.allSettled(this.jobs);await this.save()}
}
