export async function testModelConnection(llm,{provider,model},catalog){
 if(!catalog.some(m=>m.provider===provider&&m.model===model))throw new Error('请选择已获取的模型')
 const info=await llm.resolveModelInfo(provider,model),efforts=(info.reasoning?.efforts||[]).map(e=>e.id)
 const reasoningEffort=efforts.includes('none')?'none':efforts.includes('low')?'low':efforts[0]
 const options={provider,model,sessionId:'party-isolated-probe-'+crypto.randomUUID(),system:'编码 Agent 模型连接自检。仅回复 OK，不执行任何工作。',messages:[{role:'user',content:[{type:'text',text:'确认连接，只回复 OK。'}]}],maxTokens:256,signal:AbortSignal.timeout(45000),...(reasoningEffort?{reasoningEffort}:{})}
 let reply='',usage=null
 for await(const chunk of llm.stream(options)){if(chunk.type==='text-delta')reply+=chunk.text;if(chunk.type==='usage')usage=chunk.usage;if(chunk.type==='finish'&&['error','aborted'].includes(chunk.reason?.kind))throw new Error(chunk.reason.failure?.message||chunk.reason.message||'模型测试未完成')}
 if(!reply.trim())throw new Error('未收到文本回复，不能确认连通')
 return{ok:true,provider,model,reply:reply.slice(0,160),usage,scope:'fixed-prompt-no-user-context'}
}
