import{readFileSync}from'node:fs'
export const USER_AGENT='dsh-character-party/'+JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8')).version
import{randomUUID}from'node:crypto'
export function chatMessages(options,reasoningField){
 const messages=[];if(options.system)messages.push({role:'system',content:options.system})
 for(const m of options.messages||[]){
  const blocks=Array.isArray(m.content)?m.content:[{type:'text',text:String(m.content||'')}]
  if(blocks.some(b=>b.type==='image'||b.type==='file'))throw new Error('当前兼容连接器使用文本通道；请换用 DSH 的多模态提供器处理附件')
  const content=blocks.filter(b=>b.type==='text').map(b=>b.text).join('\n')
  if(m.role==='tool'){messages.push({role:'tool',tool_call_id:m.source?.callId||m.callId,content});continue}
  const row={role:m.role,content:content||null},calls=blocks.filter(b=>b.type==='tool-call')
  if(calls.length)row.tool_calls=calls.map(b=>({id:b.id,type:'function',function:{name:b.name,arguments:typeof b.arguments==='string'?b.arguments:JSON.stringify(b.arguments)}}))
  if(reasoningField&&m.role==='assistant'){const reasoning=blocks.filter(b=>b.type==='reasoning').map(b=>b.text).join('');if(reasoning)row[reasoningField]=reasoning}
  const replay=m.source?.replayState?.response||m.source?.replayState;if(replay?.kind==='party-chat-v1'){Object.assign(row,replay.assistantExtras||{});for(const call of row.tool_calls||[])Object.assign(call,replay.toolExtras?.[call.id]||{})}
  if(row.content!==null||calls.length)messages.push(row)
 }
 return messages
}
async function* sse(response){
 let buffer='';const decoder=new TextDecoder()
 for await(const chunk of response.body){buffer=(buffer+decoder.decode(chunk,{stream:true})).replaceAll('\r\n','\n');let i;while((i=buffer.indexOf('\n\n'))>=0){const event=buffer.slice(0,i);buffer=buffer.slice(i+2);const data=event.split('\n').filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trimStart()).join('\n');if(data)yield data}}
 buffer+=decoder.decode();if(buffer.trim().startsWith('data:'))yield buffer.trim().slice(5).trim()
}
export class ApiAdapter{
 constructor({provider,credential,fetcher=fetch}){this.provider=provider;this.credential=credential;this.fetcher=fetcher}
 providerInfo(){return{id:this.provider.id,name:this.provider.name}}
 providerRetryPolicy(){return undefined}
 imageRequestPricing(){return undefined}
 async listModels(){return(this.provider.models||[]).map(m=>({provider:this.provider.id,id:m.id,name:m.name||m.id,description:m.description||'',inputModalities:['text']}))}
 async resolveModel(_provider,id){const m=this.provider.models.find(m=>m.id===id);if(!m)throw new Error('该 API 的模型列表中没有 '+id);return{provider:this.provider.id,id,name:m.name||id,inputModalities:['text'],context:{contextWindow:m.context||128000},defaultMaxTokens:Math.min(m.output||8192,8192),...(m.efforts?.length?{reasoning:{efforts:m.efforts.map(id=>({id,name:id}))}}:{})}}
 async prepareCall(provider,model){return{model:await this.resolveModel(provider,model),stream:options=>this.stream(options)}}
 async *stream(options){
  const p=this.provider,key=await this.credential(p.credentialRef);if(!key)throw new Error('请先配置 '+p.name+' 的 API Key')
  if(p.kind==='opencode-go'&&!options.sessionId)throw new Error('GO 请求缺少稳定会话标识，未发送请求')
  const m=p.models.find(m=>m.id===options.model);if(!m)throw new Error('请刷新模型列表并重新选择')
  const headers={'content-type':'application/json',authorization:'Bearer '+key,'user-agent':USER_AGENT}
  if(options.sessionId)headers['x-opencode-session']='ses_'+String(options.sessionId).replace(/[^\w-]/g,'_')
  const body={model:options.model,messages:chatMessages(options,m.reasoningField),stream:true,stream_options:{include_usage:true},max_tokens:options.maxTokens||1600}
  if(options.tools?.length)body.tools=options.tools.map(t=>({type:'function',function:{name:t.name,description:t.description,parameters:t.parameters}}))
  if(options.temperature!==undefined)body.temperature=options.temperature
  if(options.stop)body.stop=options.stop
  if(m.efforts?.includes(options.reasoningEffort))body.reasoning_effort=options.reasoningEffort
  const response=await this.fetcher(p.baseURL.replace(/\/$/,'')+'/chat/completions',{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.any([...(options.signal?[options.signal]:[]),AbortSignal.timeout(180000)]),redirect:'error'})
  if(!response.ok){await response.body?.cancel();throw new Error(p.name+' 请求失败（HTTP '+response.status+'）；请检查模型权限、额度或 API 配置')}
  const blocks=new Map(),tools=new Map();let index=0,finish=null,usage,done=false;const assistantExtras={}
  const ensure=type=>{let b=blocks.get(type);if(!b){b={index:index++,type,text:'',new:true};blocks.set(type,b)}return b}
  for await(const data of sse(response)){
   if(data==='[DONE]'){done=true;break}
   let packet;try{packet=JSON.parse(data)}catch{throw new Error(p.name+' 返回了无效流数据')}
   if(packet.error)throw new Error(p.name+' 返回接口错误，请检查模型权限和配额')
   if(packet.usage)usage=packet.usage
   for(const choice of packet.choices||[]){
    if(choice.index&&choice.index!==0)continue
    const delta=choice.delta||{}
    if(delta.extra_content)assistantExtras.extra_content={...assistantExtras.extra_content,...delta.extra_content};if(delta.reasoning_details)(assistantExtras.reasoning_details||=[]).push(...delta.reasoning_details)
    for(const[type,value]of [['reasoning',delta.reasoning_content||delta.reasoning],['text',delta.content]])if(typeof value==='string'&&value){const b=ensure(type);if(b.new){yield{type:'block-start',index:b.index,blockType:type};b.new=false}b.text+=value;yield{type:type==='text'?'text-delta':'reasoning-delta',index:b.index,text:value}}
    for(const call of delta.tool_calls||[]){let t=tools.get(call.index);if(!t){t={index:index++,id:'',name:'',arguments:''};tools.set(call.index,t)}for(const[k,v]of Object.entries(call))if(!['index','id','type','function'].includes(k))(t.extras||={})[k]=v;if(call.id)t.id=call.id;if(call.function?.name)t.name+=call.function.name;if(call.function?.arguments)t.arguments+=call.function.arguments}
    if(choice.finish_reason)finish=choice.finish_reason
   }
  }
  if(!finish)throw new Error(p.name+' 的回复中断，未收到结束状态')
  for(const b of blocks.values())yield{type:'block-end',index:b.index,block:{type:b.type,text:b.text}}
  for(const t of tools.values()){if(!t.name)throw new Error('模型返回了缺少名称的工具调用');t.id||='call_'+randomUUID();yield{type:'block-start',index:t.index,blockType:'tool-call'};yield{type:'tool-call-delta',index:t.index,id:t.id,name:t.name,argumentsDelta:t.arguments||'{}'};yield{type:'block-end',index:t.index,block:{type:'tool-call',id:t.id,name:t.name,arguments:t.arguments||'{}'}}}
  if(usage)yield{type:'usage',usage:{inputTokens:usage.prompt_tokens||0,outputTokens:usage.completion_tokens||0,totalTokens:usage.total_tokens||0,cacheReadTokens:usage.prompt_tokens_details?.cached_tokens||usage.prompt_cache_hit_tokens||0,reasoningTokens:usage.completion_tokens_details?.reasoning_tokens||0}}
  if(!['stop','tool_calls','length'].includes(finish))throw new Error(p.name+' 未正常完成回复：'+finish)
  const replayState={response:{kind:'party-chat-v1',assistantExtras,toolExtras:Object.fromEntries([...tools.values()].filter(t=>t.extras).map(t=>[t.id,t.extras]))}}
  yield{type:'finish',replayState,reason:{kind:finish==='tool_calls'?'tool-calls':finish==='length'?'max-tokens':'stop'}}
 }
}
