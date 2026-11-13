export const KINDS=['conductor','frontend','code','review','research','story']
const clone=x=>structuredClone(x)
export const DEFAULT_LIMITS={daily:{concurrency:1,maxOutputTokens:1600,memoryChars:12000,reasoning:'low'},engineering:{concurrency:3,maxOutputTokens:8000,memoryChars:40000,reasoning:'high'}}
export function normalizeSettings(raw={}){
 if(raw.schema===2&&raw.profiles?.length)return clone(raw)
 const legacy={routes:raw.routes||{},roles:raw.roles||{}}
 return{schema:2,activeProfileId:'daily',profiles:[{id:'daily',name:'日常省量',common:null,...clone(legacy),limits:clone(DEFAULT_LIMITS.daily)},{id:'engineering',name:'工程分工',common:null,...clone(legacy),limits:clone(DEFAULT_LIMITS.engineering)}]}
}
export function activeProfile(settings){const s=normalizeSettings(settings);return s.profiles.find(p=>p.id===s.activeProfileId)||s.profiles[0]}
export function profileRoute(profile,roleId,kind,parentRoute){return profile.roles?.[roleId]?.[kind]||profile.roles?.[roleId]?.default||profile.routes?.[kind]||profile.common||parentRoute}
export function validateSettings(input,models,roles,previous){
 const s=normalizeSettings(input),old=normalizeSettings(previous),valid=new Set(models.map(m=>m.provider+'\0'+m.model)),known=new Set(roles.map(r=>r.id)),ids=new Set()
 const oldRoutes=new Set();for(const p of old.profiles){for(const r of [p.common,...Object.values(p.routes||{}),...Object.values(p.roles||{}).flatMap(v=>Object.values(v))])if(r?.provider&&r?.model)oldRoutes.add(r.provider+'\0'+r.model)}
 const route=r=>{if(!r)return null;if(typeof r.provider!=='string'||typeof r.model!=='string'||(!valid.has(r.provider+'\0'+r.model)&&!oldRoutes.has(r.provider+'\0'+r.model)))throw new Error('请选择已获取的模型；刷新失败时原有绑定会保留');return{provider:r.provider,model:r.model}}
 if(s.profiles.length>12)throw new Error('最多保存 12 套配置')
 const profiles=s.profiles.map(p=>{
  if(!/^[\w-]{1,60}$/.test(p.id)||ids.has(p.id))throw new Error('配置标识不合法或重复');ids.add(p.id)
  const name=String(p.name||'').trim().slice(0,32);if(!name)throw new Error('请填写配置名称')
  const next={id:p.id,name,common:route(p.common),routes:{},roles:{},limits:{}}
  for(const[k,r]of Object.entries(p.routes||{})){if(!KINDS.includes(k))throw new Error('未知任务类型');const v=route(r);if(v)next.routes[k]=v}
  for(const[id,v]of Object.entries(p.roles||{})){if(!known.has(id))throw new Error('未知角色');next.roles[id]={};for(const[k,r]of Object.entries(v)){if(k!=='default'&&!KINDS.includes(k))throw new Error('未知角色配置');const value=route(r);if(value)next.roles[id][k]=value}}
  for(const[k,min,max,fallback]of [['concurrency',1,6,1],['maxOutputTokens',256,65536,1600],['memoryChars',2000,80000,12000]]){const n=Number(p.limits?.[k]??fallback);if(!Number.isInteger(n)||n<min||n>max)throw new Error('用量设置 '+k+' 超出范围');next.limits[k]=n}
  const reasoning=p.limits?.reasoning||'low';if(!['inherit','low','high','max'].includes(reasoning))throw new Error('思考档位不合法');next.limits.reasoning=reasoning
  return next
 })
 if(!ids.has(s.activeProfileId))throw new Error('请选择有效的当前配置')
 return{schema:2,activeProfileId:s.activeProfileId,profiles}
}
export const ROLE_MATCH={deepseek:['deepseek-v4.1-flash','deepseek-v4-pro'],kimi:['kimi-k3.1-pro','kimi-k3'],grok:['grok-4.7'],hunyuan:['hy4','hy4-preview','hy3'],qwen:['qwen3.8-max','qwen3.8-flash'],glm:['glm-5.3','glm-5.3-flash'],claude:['claude-haiku-5-5'],gemini:['gemini-4-argon'],chatgpt:['gpt-6-luna','gpt-5.6-luna'],minimax:['minimax-m3.1-flash','minimax-m3'],mimo:['mimo-v2.6-pro','mimo-v2.6-flash'],stepfun:['step-5-preview']}
export function matchRoles(roles,models,provider=''){
 const result={},unmatched=[]
 for(const role of roles){const preferred=ROLE_MATCH[role.id]||[],candidates=models.filter(m=>!provider||m.provider===provider);let selected;for(const id of preferred){selected=candidates.find(m=>m.model===id||m.model.endsWith('/'+id));if(selected)break}if(selected)result[role.id]={default:{provider:selected.provider,model:selected.model}};else unmatched.push(role.id)}
 return{roles:result,unmatched}
}
