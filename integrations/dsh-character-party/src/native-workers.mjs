import{randomUUID,createHash}from'node:crypto'
import{createRequire}from'node:module'
import{pathToFileURL}from'node:url'
import{stat,realpath}from'node:fs/promises'
import{resolve,isAbsolute}from'node:path'

export function parseReport(value,schema){
 if(!schema)return undefined
 let result;const fenced=[...String(value).matchAll(/```(?:json)?\s*([\s\S]*?)```/g)].at(-1)?.[1],raw=fenced||String(value)
 try{result=JSON.parse(raw.trim())}catch{try{result=JSON.parse(raw.slice(raw.indexOf('{'),raw.lastIndexOf('}')+1))}catch{throw new Error('角色未提供有效的结构化汇报，请在原委托中补充要求后继续')}}
 if(schema.properties?.steps){if(!Array.isArray(result.steps))throw new Error('统筹未返回任务计划')}
 else if(!['completed','blocked','failed'].includes(result?.status)||typeof result.summary!=='string'||!Array.isArray(result.evidence))throw new Error('角色未提供有效的交付状态与证据')
 return result
}
export class NativeWorkers{
 constructor(ctx,{native}={}){this.ctx=ctx;this.native=native;this.running=new Set();this.guards=new Map();this.carriers=new Map();this.known=new Map();this.off=ctx.on('agent/created',value=>{const agent=value.agent||value;const record=this.known.get(agent.id);if(record)this.guard(agent,record)})}
 async modules(){if(this.native)return this.native;const require=createRequire(pathToFileURL(process.argv[1]));const sub=await import(pathToFileURL(require.resolve('@deepseek-ai/dsh-subagent')).href),agent=await import(pathToFileURL(require.resolve('@deepseek-ai/dsh-agent')).href);return this.native={...sub,...agent}}
 guard(agent,record){const previous=this.guards.get(agent.id);if(previous?.agent===agent)return;previous?.off();const allowed=['read','read_image','glob','grep','web_search','web_fetch','session_query'];const off=agent.ctx.tools.guard(exec=>{if(exec.name==='run_code')return;if(/^(spawn|fork|send_message|.*subagent.*)$/.test(exec.name))return'角色分工由工坊总控负责';if(record.kind==='story'||record.mode==='team')return'本轮统筹与交流不执行工具';if(['review','research'].includes(record.kind)&&!allowed.includes(exec.name))return'本轮只允许读取与检索'});this.guards.set(agent.id,{agent,off})}
 async releaseIdle(parent,except){const own=[...this.known.entries()].filter(([id,r])=>r.parentId===parent.id&&id!==except&&!this.running.has(id)&&this.ctx.agents.get(id)?.status==='idle');if(own.length){const[id]=own[0];await this.ctx.subagents.drainContinuableChildren(parent,[id]);this.guards.get(id)?.off();this.guards.delete(id)}}
 async workspace({cwd,parentId}){
  if(typeof cwd!=='string'||!isAbsolute(cwd))throw new Error('请输入项目的绝对目录')
  const path=await realpath(resolve(cwd));if(!(await stat(path)).isDirectory())throw new Error('项目目录不存在')
  const id='party-workspace-'+createHash('sha256').update(process.platform==='win32'?path.toLowerCase():path).digest('hex').slice(0,20)
  const existing=this.ctx.agents.get(id);if(existing)return{id,cwd:path,route:existing.options,status:existing.status}
  const source=this.ctx.agents.get(parentId)||this.ctx.agents.roots().find(a=>!a.id.startsWith('party-workspace-'))
  const native=await this.modules(),presets=this.ctx.get?.('agentPresets'),options=source?.options||this.ctx.agentDefaultModel?.currentSelection?.()||{},setup=async(scope,agent)=>{if(source){native.applyChildComposition(scope,source,{});native.appendDelegatedPolicyOverrides(agent.session,native.captureDelegatedPolicyOverrides(source))}else if(presets){const previous=this.ctx.get?.('sessionProjections')?.stateOf(agent.session,'agentPreset');await presets.mount(scope,previous||presets.defaultId)}else throw new Error('DSH 默认智能体预设尚未就绪')}
  let handle
  try{handle=await this.ctx.agents.resume({resumeSessionId:id,agentOptions:options,setup})}catch(e){if(!/not found|不存在|ENOENT|unknown session/i.test(e.message))throw e;handle=await this.ctx.agents.create({sessionId:id,meta:{cwd:path,agentPreset:source?.session.meta?.agentPreset||presets?.defaultId},agentOptions:options,setup})}
  this.carriers.set(id,handle);return{id,cwd:path,route:handle.agent.options,status:handle.agent.status}
 }
 async run({task,role,route,prompt,schema,signal,onEvent,onStarted,worker,onCheckpoint}){
  const ctx=this.ctx,parent=ctx.agents.get(task.parentId);if(!parent)throw new Error('工作项目的 DSH 会话已关闭，请重新连接项目')
  const provider=ctx.subagents.list().map(id=>ctx.subagents.getProvider(id)).find(p=>p.prepareContinuable&&p.capabilities?.persona&&p.capabilities?.agentOptions&&!p.inheritsParentContext)
  if(!provider)throw new Error('DSH 没有可续接的原生 spawn 提供器')
  const native=await this.modules(),id=worker.sessionId||randomUUID();worker.sessionId=id;worker.backend='dsh';worker.parentId=parent.id;this.known.set(id,{kind:task.kind,mode:task.mode,parentId:parent.id});await onCheckpoint();onStarted(id)
  const persona='你是深海女仆工坊的成年角色 '+role.name+'（'+role.id+'）。'+(role.persona||'')+'\n语气：'+(role.tone||'')+(task.kind==='story'&&task.phase!=='report'?'\n本轮是无工具的角色日常交流。自然回应眼前的话，尊重已有事实与相处距离，不索要工程目标、不生成工作报告。':'\n你是长期工作同伴，当前任务必须以真实工作与验证交付。只执行当前分工，不扩大范围或重复已完成实现。玩家可以在原工作线程继续补充要求，及时简短汇报实际结果。')+'\n继承并遵守 DSH 权限，不得递归分工；角色设定不授予额外工具能力。'
  const format=schema?'\n最终返回格式以上下文后附的本结构为准。审查通过使用 status=completed，需修改或受阻使用 blocked，执行失败使用 failed。最终回答必须是一个 JSON 对象，不使用 structured_output 工具，严格符合：'+JSON.stringify(schema):''
  const marker='[party-execution:'+String(task.executionId||task.id)+']',content=[{type:'text',text:marker+'\n'+prompt+format}],attempts=new Map();let child,boundary=0,offUsage,offTool
  const abort=()=>ctx.subagents.interruptByParent(id,parent.id,'continuable')
  try{
   this.running.add(id);signal.throwIfAborted()
   const previous=(await ctx.subagents.listChildren(parent.id)).some(r=>r.id===id&&r.mode==='continuable')
   child=ctx.agents.get(id);boundary=child?.session.snapshotEvents().length||0
   offUsage=ctx.on('agent/assistant-stream',({agent,frame})=>{if(agent.id!==id)return;if(frame.type==='chunk'&&frame.chunk?.type==='usage')attempts.set(frame.attemptId,frame.chunk.usage);if(frame.type==='start')onEvent('heartbeat','正在处理本轮委托')})
   offTool=ctx.on('tools/result',(exec,result)=>{if(exec.agent?.id===id)onEvent('tool',exec.name+(result.isError?' · 失败':' · 完成'))})
   const admit=async()=>{if(previous)return ctx.subagents.prompt({requestId:task.executionId||task.id,parentSessionId:parent.id,childSessionId:id,mode:'continuable',delivery:'queue',content},signal);return ctx.subagents.startContinuable({provider:provider.name,label:role.name+' · '+task.kind,childId:id,request:{parent,prompt:content,persona,agentOptions:route,maxDepth:1,toolFilter:task.kind==='story'||task.mode==='team'?{allow:[]}:{deny:['subagent','spawn_agent','fork_agent','subagent_start','subagent_control'].filter(n=>ctx.tools.get(n))}},signal})}
   try{await admit()}catch(e){if(!/capacity|容量|maximum|limit/i.test(e.message))throw e;await this.releaseIdle(parent,id);await admit()}
   child=ctx.agents.get(id);if(!child)throw new Error('原生工作会话未能激活')
   if(previous&&boundary===0){const all=child.session.snapshotEvents(),found=all.findIndex(e=>JSON.stringify(e).includes(marker));if(found<0)throw new Error('无法定位本轮原生输入边界，拒绝复用旧成果');boundary=Math.max(0,found-1)}
   this.guard(child,this.known.get(id));signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort()
   await child.whenIdle();signal.throwIfAborted()
   const events=child.session.snapshotEvents(boundary),end=native.foldConsumedWork(events).end,blocks=native.finalAssistantOutput(events)||[],output=blocks.filter(b=>b.type==='text').map(b=>b.text).join('\n'),reason=end?.data?.reason
   const usage={inputTokens:0,outputTokens:0,cacheReadTokens:0};for(const row of attempts.values())for(const key of Object.keys(usage))usage[key]+=row[key]||0
   if(reason?.kind!=='completed'){const error=new Error(reason?.error?.message||reason?.failure?.message||reason?.diagnostic||'原生工作轮次未完成：'+reason?.kind);error.usage=usage;throw error}
   worker.turns=(worker.turns||0)+1;worker.lastUsedAt=Date.now();await onCheckpoint()
   try{return{stopReason:'completed',output,structured:parseReport(output,schema),usage}}catch(error){error.usage=usage;throw error}
  }finally{signal.removeEventListener('abort',abort);offUsage?.();offTool?.();this.running.delete(id)}
 }
 async steer(task,worker,text,requestId){return this.ctx.subagents.prompt({requestId,parentSessionId:task.parentId,childSessionId:worker.sessionId,mode:'continuable',delivery:'steer',content:[{type:'text',text:'玩家补充要求：'+text}]},new AbortController().signal)}
 async close(){this.off?.();for(const record of this.guards.values())record.off();for(const h of this.carriers.values())await h.dispose();this.guards.clear();this.carriers.clear()}
}
