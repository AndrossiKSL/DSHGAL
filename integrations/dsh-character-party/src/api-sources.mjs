import{readFile,writeFile,mkdir,rename}from'node:fs/promises'
import{dirname}from'node:path'
import{ApiAdapter,USER_AGENT}from'./api-adapter.mjs'
const trim=(v,n=240)=>typeof v==='string'?v.trim().slice(0,n):''
function url(value){const u=new URL(value);if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.search||u.hash)throw new Error('请输入不含密钥或查询参数的 API 地址');return u.href.replace(/\/$/,'')}
export class ApiSources{
 constructor({ctx,path,credentials}){this.ctx=ctx;this.path=path;this.credentials=credentials;this.providers=[];this.handles=new Map();this.queue=Promise.resolve();this.statuses=[]}
 async init(){try{const state=JSON.parse(await readFile(this.path,'utf8'));this.providers=state.providers||[]}catch(e){if(e.code!=='ENOENT')throw e}for(const p of this.providers)this.register(p);return this}
 persist(){const data=JSON.stringify({version:1,providers:this.providers},null,2);this.queue=this.queue.catch(()=>{}).then(async()=>{await mkdir(dirname(this.path),{recursive:true});await writeFile(this.path+'.tmp',data);await rename(this.path+'.tmp',this.path)});return this.queue}
 register(p){this.handles.get(p.id)?.();const adapter=new ApiAdapter({provider:p,credential:async ref=>(await this.credentials().resolve(ref))?.value});this.handles.set(p.id,this.ctx.llm.registerAdapter([p.id],adapter))}
 async view(){return Promise.all(this.providers.map(async p=>({id:p.id,name:p.name,kind:p.kind,baseURL:p.baseURL,catalogURL:p.catalogURL,modelCount:p.models.length,refreshedAt:p.refreshedAt,keyConfigured:(await this.credentials().describe(p.credentialRef)).configured}))) }
 async save(input){
  const id=trim(input.id,60)||'party-api-'+crypto.randomUUID().slice(0,8);if(!/^party-[\w-]+$/.test(id))throw new Error('API 标识不合法')
  const old=this.providers.find(p=>p.id===id),kind=input.kind==='opencode-go'?'opencode-go':'openai-compatible',name=trim(input.name,64);if(!name)throw new Error('请填写 API 名称')
  if(!old&&this.providers.length>=12)throw new Error('最多配置 12 个自定义 API')
  const baseURL=kind==='opencode-go'?'https://opencode.ai/inference/go/openai/v1':url(input.baseURL)
  const catalogURL=kind==='opencode-go'?'https://opencode.ai/inference/go/v1/models':url(input.catalogURL||baseURL+'/models')
  const credentialRef=old?.credentialRef||('PARTY_API_'+id.replaceAll('-','_').toUpperCase()+'_KEY')
  const key=trim(input.apiKey,2000);if(key)await this.credentials().set(credentialRef,key)
  if(!(await this.credentials().describe(credentialRef)).configured&&input.requireKey!==false)throw new Error('请填写 API Key')
  const provider={id,name,kind,baseURL,catalogURL,credentialRef,models:old?.models||[],refreshedAt:old?.refreshedAt||0}
  const index=this.providers.findIndex(p=>p.id===id);if(index>=0)this.providers[index]=provider;else this.providers.push(provider)
  this.register(provider);await this.persist();const status=await this.refresh(id);return{ok:true,provider:(await this.view()).find(p=>p.id===id),status}
 }
 async refresh(id){
  const p=this.providers.find(p=>p.id===id);if(!p)throw new Error('API 不存在')
  try{
   const key=(await this.credentials().resolve(p.credentialRef))?.value,headers={accept:'application/json','user-agent':USER_AGENT};if(key)headers.authorization='Bearer '+key
   const r=await fetch(p.catalogURL,{headers,signal:AbortSignal.timeout(15000),redirect:'error'});if(!r.ok){await r.body?.cancel();throw new Error('HTTP '+r.status)}
   const body=await r.json(),rows=Array.isArray(body)?body:body.data||body.models;if(!Array.isArray(rows))throw new Error('未找到模型列表')
   const models=rows.slice(0,1000).filter(m=>typeof m.id==='string'&&m.id.length<240).map(m=>({id:m.id,name:trim(m.name||m.id),description:trim(m.description,600),context:m.limit?.context||m.context_length||m.contextWindow||128000,output:m.limit?.output||8192,reasoningField:m.api?.['chat-completions']?.compatibility?.reasoning_field,efforts:m.capabilities?.reasoning?.effort||[]}))
   if(!models.length)throw new Error('API 返回了空模型列表')
   p.models=models;p.refreshedAt=Date.now();this.register(p);await this.persist();return{id:p.id,ok:true,count:models.length}
  }catch(e){return{id:p.id,ok:false,error:'刷新失败：'+String(e.message).slice(0,180)+'。保留上次列表和角色绑定',count:p.models.length}}
 }
 async test({id,model}){
  const p=this.providers.find(p=>p.id===id);if(!p||!p.models.some(m=>m.id===model))throw new Error('请选择已获取的测试模型')
  let reply='',usage=null;const efforts=p.models.find(m=>m.id===model).efforts||[],reasoningEffort=efforts.includes('none')?'none':efforts.includes('low')?'low':efforts[0]
  for await(const c of this.ctx.llm.stream({provider:id,model,sessionId:'party-connection-test-'+id,reasoningEffort,system:'这是编码 Agent 的 API 连通性自检。只回复 OK，不执行其他工作。',messages:[{role:'user',content:[{type:'text',text:'确认连接。'}]}],maxTokens:256,signal:AbortSignal.timeout(60000)})){if(c.type==='text-delta')reply+=c.text;if(c.type==='usage')usage=c.usage;if(c.type==='finish'&&['error','aborted'].includes(c.reason?.kind))throw new Error('测试未完成')}
  if(!reply.trim())throw new Error('模型未返回文本；可能需要更高输出上限或调整思考设置')
  return{ok:true,model,reply:reply.slice(0,120),usage}
 }
 async refreshAll(){return await Promise.all(this.providers.map(p=>this.refresh(p.id)))}
 close(){for(const handle of this.handles.values())handle();this.handles.clear()}
}
