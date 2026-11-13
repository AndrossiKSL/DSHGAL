export const PROFILE_FIELDS = ['displayName','address','greeting','persona','tone','visual','background','scenario','examples','rules','workRules'] as const
export const PROFILE_LIMITS:Record<string,number> = {displayName:32,address:24,greeting:1200,persona:6000,tone:1000,visual:1500,background:6000,scenario:3000,examples:4000,rules:3000,workRules:2000}
export const GLOBAL_RULE_FIELDS = ['shared','story','work'] as const
export const GLOBAL_RULE_LIMIT = 3000

export function cleanPersonaText(raw:any,limit:number,singleLine=false):string {
 if(typeof raw!=='string')return ''
 let text=raw.replace(/\r\n?/g,'\n').replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g,'').replace(/\t/g,'  ').trim()
 if(singleLine)text=text.replace(/\s+/g,' ')
 return Array.from(text).slice(0,limit).join('')
}
export function normalizePersonaProfile(raw:any):Record<string,string> {
 const out:Record<string,string>={}
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return out
 for(const key of PROFILE_FIELDS){const value=cleanPersonaText(raw[key],PROFILE_LIMITS[key],key==='displayName'||key==='address');if(value)out[key]=value}
 return out
}
export function normalizePersonaGlobal(raw:any):any {
 return {enabled:raw?.enabled!==false,...Object.fromEntries(GLOBAL_RULE_FIELDS.map(k=>[k,cleanPersonaText(raw?.[k],GLOBAL_RULE_LIMIT)]))}
}
export function normalizePersonaSettings(raw:any):any {
 const seen=new Set<string>(),presets:any[]=[]
 for(const row of Array.isArray(raw?.presets)?raw.presets:[]){
  if(presets.length>=32)break
  if(!row||!['character','global'].includes(row.kind)||typeof row.id!=='string'||!/^[\w-]{1,80}$/.test(row.id)||seen.has(row.id))continue
  const name=cleanPersonaText(row.name,48,true);if(!name)continue;seen.add(row.id)
  presets.push({id:row.id,name,kind:row.kind,characterId:cleanPersonaText(row.characterId,60,true),...(row.kind==='character'?{profile:normalizePersonaProfile(row.profile)}:{global:normalizePersonaGlobal(row.global)})})
 }
 return {version:1,revision:Math.max(0,Math.floor(Number(raw?.revision)||0)),global:normalizePersonaGlobal(raw?.global),presets}
}
export function globalPersonaContext(raw:any,mode:'story'|'work'='story'):string {
 const config=normalizePersonaGlobal(raw?.global||raw)
 if(!config.enabled||(!config.shared&&!config[mode]))return ''
 return '玩家的全局表达预设：'+JSON.stringify({shared:config.shared,[mode]:config[mode]})+'\n角色专属的表达要求优先于全局和默认风格；设定不改变已发生事实、剧情协议、模型能力或工具审批。'
}
export function parsePersonaImport(text:string):any {
 if(typeof text!=='string'||text.length>160000)throw Error('角色文件需小于160000字')
 const trimmed=text.replace(/^\uFEFF/,'').trim();if(!trimmed)throw Error('文件没有内容')
 if(!trimmed.startsWith('{')&&!trimmed.startsWith('['))return {kind:'character',profile:normalizePersonaProfile({background:trimmed}),warnings:trimmed.length>PROFILE_LIMITS.background?['文本较长，背景仅保留前6000字；原文件未修改。']:[]}
 let raw:any;try{raw=JSON.parse(trimmed)}catch{throw Error('JSON格式无效，请检查文件')}
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('没有找到角色卡字段')
 if(raw.kind==='whale-persona-global')return {kind:'global',global:normalizePersonaGlobal(raw.global),warnings:[]}
 const data=raw.data&&typeof raw.data==='object'?raw.data:raw
 const own=data.extensions?.whale_galgame?.profile||raw.profile
 const known=['name','description','personality','scenario','first_mes','mes_example','system_prompt','post_history_instructions']
 if(!own&&!known.some(k=>typeof data[k]==='string'))throw Error('没有找到支持的角色卡字段')
 const fields=own||{displayName:data.name,background:data.description,persona:data.personality,scenario:data.scenario,greeting:data.first_mes,examples:data.mes_example,rules:[data.system_prompt,data.post_history_instructions].filter(x=>typeof x==='string'&&x.trim()).join('\n\n')}
 const warnings=[]
 if(data.character_book)warnings.push('世界书未自动导入；本次读取角色文本字段。')
 if(known.some(k=>data[k]!==undefined&&typeof data[k]!=='string'))warnings.push('非文本字段已跳过。')
 for(const key of PROFILE_FIELDS)if(typeof fields[key]==='string'&&Array.from(fields[key]).length>PROFILE_LIMITS[key])warnings.push(key+'超过长度限制，已截取；原文件未修改。')
 return {kind:'character',profile:Object.fromEntries(PROFILE_FIELDS.filter(k=>typeof fields[k]==='string').map(k=>[k,cleanPersonaText(fields[k],PROFILE_LIMITS[k],k==='displayName'||k==='address')])),warnings}
}
export function exportPersonaCard(profile:any,characterId:string):any {
 const p=normalizePersonaProfile(profile)
 return {spec:'chara_card_v2',spec_version:'2.0',data:{name:p.displayName||characterId,description:p.background||'',personality:p.persona||'',scenario:p.scenario||'',first_mes:p.greeting||'',mes_example:p.examples||'',system_prompt:p.rules||'',post_history_instructions:'',creator_notes:'工坊角色文本导出；美术、模型密钥、存档与世界书不在此文件中。',tags:[],creator:'深海女仆工坊',character_version:'1',alternate_greetings:[],extensions:{whale_galgame:{characterId,profile:Object.fromEntries(PROFILE_FIELDS.map(k=>[k,p[k]||'']))}}}}
}
