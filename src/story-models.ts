import {globalPersonaContext} from './persona-config'
import {ROLEPLAY_STYLE,characterGuidance,voiceSamples} from './persona'
import {ADULT_MODE} from './adult-mode'
const key=(r:any)=>r?.provider+'\0'+r?.model
export function chooseStoryModels(party:any,roles:string[],parent:any):any{
 if(!party?.roleRoute)return{director:parent,bindings:{},configured:false}
 const common=party.roleRoute('','story',parent),bindings=Object.fromEntries(roles.map(id=>[id,party.roleRoute(id,'story',common.route)])),rows=Object.values(bindings)as any[]
 const uniform=rows.length&&rows.every(r=>key(r.route)===key(rows[0].route))
 return{director:uniform?rows[0].route:common.route,bindings,configured:uniform?rows.some(r=>r.configured):common.configured,limits:common.limits}
}
export async function personalizeStory(step:any,plan:any,options:any):Promise<any>{
 const groups=new Map<string,any[]>()
 for(const[lineIndex,line]of step.dialogue.entries()){const binding=plan.bindings[line.speaker];if(binding?.configured&&key(binding.route)!==key(plan.director)){const rows=groups.get(line.speaker)||[];rows.push({...line,lineIndex});groups.set(line.speaker,rows)}}
 if(!groups.size)return step
 const results:any[]=[];const count=Math.max(1,Math.min(6,plan.limits?.concurrency||1)),entries=[...groups]
 for(let offset=0;offset<entries.length;offset+=count)results.push(...await Promise.all(entries.slice(offset,offset+count).map(async([role,lines])=>{
  const binding=plan.bindings[role],profile=options.profile(role),context=options.context(role)
  const system=[ADULT_MODE,'你正在以成年角色「'+profile.displayName+'」的身份接续一幕 GAL 对话。',String(profile.persona||''),String(profile.tone||''),ROLEPLAY_STYLE,voiceSamples(role,profile),globalPersonaContext(options.personaSettings,'story'),'你的本幕演出档案：'+JSON.stringify(characterGuidance(role,profile,{present:options.present||[],relationships:options.relationships||{}})),'只改写你本人的对白、完整动作和表情。保留本幕的事实、约定与回应意图；不改变其他角色、场景和选项，不替玩家作决定。','改写的重点是让她像她本人开口：多数台词 8 到 30 字，允许半句、停顿、答非所问；不要把原句扩写成结构完整的长段，也不要把玩家的意思复述一遍。原文已经自然的地方就照原样留着。原文已经露骨的地方照原样保留，不要改得含蓄。','只返回JSON：{"lines":[{"lineIndex":原编号,"text":"你的对白","action":"完整动作id","emotion":"表情"}]}。必须覆盖提供的每个编号，不能增加编号。可用动作：'+options.actions.join(',')].join('\n')
  const raw=await options.call(binding.route,{system,prompt:JSON.stringify({scene:step.scene,narration:step.narration,playerAction:options.playerAction,publicDialogue:step.dialogue.map((r:any)=>({speaker:r.speaker,to:r.to,text:r.text})),yourKnowledge:context,yourLines:lines}),sessionId:options.sessionId+'-'+role,maxTokens:binding.limits.maxOutputTokens,reasoning:binding.limits.reasoning})
  let parsed;try{parsed=JSON.parse(raw.slice(raw.indexOf('{'),raw.lastIndexOf('}')+1))}catch{throw new Error(profile.displayName+' 的模型未返回有效对白；本轮剧情未推进')}
  if(!Array.isArray(parsed.lines)||parsed.lines.length!==lines.length)throw new Error(profile.displayName+' 的模型漏了对白；本轮剧情未推进')
  const used=new Set();return parsed.lines.map((row:any)=>{if(!lines.some(l=>l.lineIndex===row.lineIndex)||used.has(row.lineIndex)||typeof row.text!=='string'||!row.text.trim())throw new Error(profile.displayName+' 的对白编号或内容无效');used.add(row.lineIndex);const original=step.dialogue[row.lineIndex];return{lineIndex:row.lineIndex,line:{...original,text:row.text.trim().slice(0,700),action:options.actions.includes(row.action)?row.action:original.action,emotion:typeof row.emotion==='string'?row.emotion.slice(0,40):original.emotion,modelSource:{provider:binding.route.provider,model:binding.route.model}}}})
 })))
 const dialogue=step.dialogue.map((line:any)=>({...line}));for(const rows of results)for(const row of rows)dialogue[row.lineIndex]=row.line
 return{...step,dialogue}
}
