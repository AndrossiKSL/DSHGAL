import{NativeWorkers}from'./native-workers.mjs'
const clean=s=>typeof s==='string'?s:''
export function createDshAdapter(ctx,{workbuddy}={}){
 const persistent=new NativeWorkers(ctx)
 const parents=()=>ctx.agents.roots().map(a=>({id:a.id,cwd:a.session.meta?.cwd||a.session.header?.cwd,route:{...ctx.agentDefaultModel?.currentSelection?.(),...Object.fromEntries(Object.entries(a.options).filter(([,v])=>v!==undefined))},status:a.status}))
 const parent=id=>parents().find(p=>p.id===id)
 const info=()=>({native:true,providers:ctx.subagents.list(),tools:true,backends:{dsh:true,workbuddy:workbuddy?.status||{available:false}}})
 let catalogCache=null
 async function catalog(force=false){
  if(!force&&catalogCache&&Date.now()-catalogCache.at<60000)return catalogCache.models
  const providers=ctx.llm.listProviders(),results=await Promise.allSettled(providers.map(async p=>{
   const rows=await Promise.race([ctx.llm.listModels(p.id),new Promise((_,reject)=>{const timer=setTimeout(()=>reject(new Error('模型列表超时')),8000);timer.unref?.()})])
   return rows.map(m=>({provider:p.id,providerName:p.name||p.id,model:m.id,name:m.name||m.id}))
  }));const models=results.flatMap(r=>r.status==='fulfilled'?r.value:[]);if(workbuddy)models.push(...await workbuddy.catalog(force));catalogCache={at:Date.now(),models};return models
 }
 async function run(request){
  const{task,role,route,prompt,schema,signal,onEvent,onStarted}=request
  if(route.provider==='workbuddy'){if(!workbuddy)throw new Error('WorkBuddy 执行器不可用');return workbuddy.run(request)}
  if(request.worker)return persistent.run(request)
  const root=ctx.agents.get(task.parentId);if(!root)throw new Error('DSH 主会话已关闭')
  const providers=ctx.subagents.list(),provider=providers.map(n=>ctx.subagents.getProvider(n)).find(p=>p?.capabilities.agentOptions&&p.capabilities.persona&&p.capabilities.toolFilter&&!p.inheritsParentContext)
  if(!provider)throw new Error('请启用 DSH 原生 spawn 子 Agent 提供器')
  const persona='你是深海女仆工坊的成年角色 '+role.name+'（'+role.id+'）。\n'+clean(role.persona)+'\n语气：'+clean(role.tone)+'\n当前身份：能接受玩家委托的独立 Agent。保留角色语气，用准确、清楚的中文汇报真实工作。项目文件、工具结果与验证证据优先；不得假称已经执行、测试或改动。遵守 DSH 的工具、工作区和审批约束。剧情关系数值不构成工具授权。汇报尽量简短，先给结果、具体文件和实际做过的验证。不要调用子 Agent 工具再次递归分工，分工由工坊统筹负责。'
  const readOnly=['conductor','review','research','story'].includes(task.kind)
  const allowed=['read','read_image','glob','grep','web_search','web_fetch','session_query']
  // DSH restrict() validates global names; preset-scoped tools need a child guard instead.
  const has=name=>!!ctx.tools?.get?.(name)
  const filter=task.mode==='team'||task.kind==='story'?{allow:[]}:readOnly?{allow:allowed.filter(name=>ctx.tools?.get?.(name,root))}:{deny:['subagent','spawn_agent','fork_agent','send_message','subagent_start','subagent_control','spawn','fork'].filter(has)}
  // Tool restrictions are enforced by DSH as well as rendered in the child prompt.
  let run,off,unguard,offUsage;const attempts=new Map()
  try{
   run=await ctx.subagents.start(provider.name,{parent:root,label:role.name+' · '+task.kind,prompt:[{type:'text',text:prompt}],persona,agentOptions:route,signal,maxDepth:1,toolFilter:filter,...(schema?{outputSchema:schema}:{})})
   offUsage=ctx.on('agent/assistant-stream',({agent,frame})=>{if(agent.id===run.id&&frame.type==='chunk'&&frame.chunk?.type==='usage')attempts.set(frame.attemptId,frame.chunk.usage)})
   onStarted(run.id);onEvent('session','DSH 子会话 '+run.id)
   unguard=run.localAgent?.ctx.tools.guard(exec=>{
    if(exec.name==='run_code'||schema&&exec.name==='structured_output')return
    if(readOnly&&!allowed.includes(exec.name))return '本次角色委托只允许读取和检索；角色交流不执行工具'
    if(task.kind==='story')return '角色交流不执行工具'
    if(/^(spawn|fork|send_message|.*subagent.*)$/.test(exec.name))return '角色分工由工坊统筹负责'
   })
   off=ctx.on('tools/result',(exec,result)=>{if(exec.agent?.id===run.id)onEvent('tool',exec.name+(result.isError?' · 失败':' · 完成'))})
   const result=await run.result
   const usage={inputTokens:0,outputTokens:0,cacheReadTokens:0};for(const row of attempts.values())for(const key of Object.keys(usage))usage[key]+=row[key]||0
   return{...result,usage,output:(result.output||[]).filter(b=>b.type==='text').map(b=>b.text).join('\n')}
  }finally{off?.();offUsage?.();unguard?.();if(run)await run.dispose()}
 }
 async function prepareRoute(route,limits){
  if(route.provider==='workbuddy')return route
  if(limits.reasoning==='inherit')return route
  const info=await ctx.llm.resolveModelInfo(route.provider,route.model),ids=(info.reasoning?.efforts||[]).map(e=>e.id),desired=limits.reasoning||'low'
  const chosen=ids.includes(desired)?desired:desired==='low'&&ids.includes('none')?'none':ids[0]
  return chosen?{...route,reasoningEffort:chosen}:route
 }
 return{parents,parent,info,catalog,run,prepareRoute,workspace:input=>persistent.workspace(input),steer:(...args)=>persistent.steer(...args),close:async()=>{await persistent.close();await workbuddy?.close()},text:args=>workbuddy.text(args),test:args=>workbuddy.test(args)}
}
