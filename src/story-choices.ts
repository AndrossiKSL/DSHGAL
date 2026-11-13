import {matureAccess} from './relationship-progression'

/** 模型可以返回的四种剧情走向。custom / swap 由本地生成，不指望模型给。 */
export const STORY_CHOICE_KINDS=['normal','event','random','mature']
/** 本地追加的两种：自己决定走向、多人场景换人。 */
export const LOCAL_CHOICE_KINDS=['custom','swap']
export const STORY_CHOICE_LABELS:any={normal:'正常互动',event:'当前事件推进',random:'随机事件推进',mature:'NSFW发展',custom:'自己决定走向',swap:'换人'}

const clean=(v:any,n=4000)=>typeof v==='string'?v.trim().slice(0,n):''

export function worldChoices(story:any,step:any):any[]{
 const roleId=step?.direction?.speaker||story?.direction?.speaker||story?.roleId||'deepseek',access=matureAccess(story||{},roleId)
 const pending=(story?.events||[]).find((e:any)=>e.roleId===roleId&&['pending','overdue'].includes(e.status))
 const topics=['留意门外的脚步声','看看新到的便笺','听听窗边的动静','查看走廊里的来客']
 const hash=Array.from(String(story?.seed||'')+':'+(story?.revision||0)).reduce((n:number,c:string)=>(n*31+c.charCodeAt(0))>>>0,0)
 const fallback:any={
  normal:{label:'聊聊她的近况',action:'聊聊你此刻的心情和近况。'},
  event:pending?{label:'跟进已有约定',action:'和你讨论约定「'+pending.title+'」的下一步。'}:{label:'继续眼前的话题',action:'接着眼前正在发生的事，和你商量下一步。'},
  random:{label:topics[hash%topics.length],action:topics[hash%topics.length]+'，了解是否有新的小事件。'},
  // 这里以前摆的是「先谈清楚再动手」那类选项，等于每轮递给玩家一个刹车。
  // 改成往前推一小步。
  mature:access.route==='fall'
   ?{label:'再往前一点',action:'凑近她，把刚才没做完的那一下接着做下去。'}
   :{label:'靠近她',action:'坐得离她近一些，把话说到她跟前。'},
 }
 const raw=Array.isArray(step?.choices)?step.choices:[],used=new Set<any>()
 const rows:any[]=STORY_CHOICE_KINDS.map((kind,i)=>{
  let row=kind==='mature'&&step?.choiceRoute!==access.route?null:raw.find((c:any)=>c?.kind===kind&&!used.has(c))
  if(!row&&kind==='normal')row=raw.find((c:any)=>c&&!c.kind)
  if(row)used.add(row)
  const action=clean(row?.action)||clean(row?.label)||fallback[kind].action
  let caption=clean(row?.label,100)||fallback[kind].label
  caption=caption.replace(new RegExp('^'+STORY_CHOICE_LABELS[kind]+'[ ·：:]*'),'')||fallback[kind].label
  const targetName=step?.ensembleRoles?.find((r:any)=>r.id===roleId)?.name
  if(kind==='mature'&&step?.ensemblePlan?.present?.length>1&&targetName)caption='和'+targetName+caption
  const chars=Array.from(caption);if(chars.length>12)caption=chars.slice(0,11).join('')+'…'
  return{id:'mode-'+kind,kind,tag:STORY_CHOICE_LABELS[kind],label:STORY_CHOICE_LABELS[kind]+' · '+caption,caption,action:kind==='mature'&&targetName?targetName+'，'+action:action,roleId,disabled:kind==='mature'&&!access.enabled,reason:kind==='mature'?access.reason:'',index:i+1}
 })

 // ——换人：多人场景走到第 6 段（高潮后）时才出现——
 // 这一段本来就该有「换人继续」这条路，否则多人场面写到高潮就写不下去了。
 const plan=step?.ensemblePlan,cast:any[]=Array.isArray(plan?.present)?plan.present:[]
 const stage=Math.max(Number(plan?.stage)||0,Number(story?.intimateStage)||0)
 const focus=plan?.focus||roleId
 const swapTargets=cast.filter((id:string)=>id!==focus)
 if(swapTargets.length&&stage>=6){
  const who=swapTargets[0],whoName=step?.ensembleRoles?.find((r:any)=>r.id===who)?.name||who
  const prevName=step?.ensembleRoles?.find((r:any)=>r.id===focus)?.name||focus
  rows.push({
   id:'mode-swap',kind:'swap',tag:STORY_CHOICE_LABELS.swap,
   label:STORY_CHOICE_LABELS.swap+' · 换成'+whoName,
   caption:'换成'+whoName,
   action:whoName+'接上来，'+prevName+'退到旁边还没退干净。',
   swapRoleId:who,roleId,disabled:false,reason:'',index:rows.length+1,
  })
 }

 // ——自己决定走向：永远最后一个——
 // 和对话框不一样：对话框是你开口说话，这一项是你直接指定接下来发生什么。
 rows.push({
  id:'mode-custom',kind:'custom',tag:STORY_CHOICE_LABELS.custom,
  label:STORY_CHOICE_LABELS.custom,caption:'自己写这一段',
  action:'',roleId,disabled:false,reason:'',index:rows.length+1,
 })

 return rows
}
