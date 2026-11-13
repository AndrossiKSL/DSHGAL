/** Story inference only; tool execution lives in the separate ACP workshop. */
export function createModelClient(config){
 return {
  listProviders:()=>[{id:'hermes',name:'Hermes 模型接口'}],
  listModels:async()=>[{id:config.model,name:config.model}],
  resolveModelInfo:async()=>({reasoning:{efforts:[]}}),
  async *stream(options){
   const messages=[{role:'system',content:options.system||''},...(options.messages||[]).map(m=>({role:m.role,content:Array.isArray(m.content)?m.content.filter(b=>b.type==='text').map(b=>b.text).join('\n'):m.content}))]
   const response=await fetch(config.modelUrl.replace(/\/$/,'')+'/chat/completions',{
    method:'POST',headers:{'content-type':'application/json',...(config.apiKey?{authorization:'Bearer '+config.apiKey}:{})},
    body:JSON.stringify({model:config.model,messages,max_tokens:options.maxTokens||4800,temperature:options.temperature??.8,stream:false}),
    signal:options.signal||AbortSignal.timeout(110000)
   })
   if(!response.ok)throw new Error('剧情模型连接失败（HTTP '+response.status+'）；请在后端设置核对接口。')
   const data=await response.json(),text=data.choices?.[0]?.message?.content
   if(typeof text!=='string'||!text.trim())throw new Error('剧情模型没有返回文本')
   yield {type:'text-delta',text}
  }
 }
}
