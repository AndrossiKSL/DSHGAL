export const RELATIONSHIP_KEYS=['affection','trust','intimacy','nsfw'] as const
export type RelationshipKey=typeof RELATIONSHIP_KEYS[number]
const tiers=(titles:string[],effects:string[])=>titles.map((title,i)=>({title,effect:effects[i]}))
// ⚠️ nsfw 轴的正/负阶 effect 会被 relationshipProfile 原样注入 prompt（「当前各维度六阶称号与行为效果」），
// 所以这里的每个字都会变成模型的实际行为。
//
// 旧文案写的是「先谈亲密边界与停止方式」「先确认双方自愿的暗线主题与界限」「发展…停止约定」
// ——新存档 lowest=0 → allowedLevel=1 → 模型每轮都被要求「谈边界和停止方式」，
// 于是不管玩家做什么，她都在刹车、都在问「到哪一步」「要不要停」。实测就是这么表现的。
//
// 六阶必须是推进式的具体行为，不能出现 边界/界限/停止/确认/同意/选择权 这类闸门词。
export const RELATIONSHIP_AXES:any={
 affection:{label:'好感',positive:tiers(['初识','心动','倾心','热恋','挚爱','此生唯一'],['保持礼貌，先了解你的喜好','主动关心你的近况','会表达偏爱，留意你的细节','主动安排两人独处与共同活动','把你放进重要的人生计划','在重大抉择中认真考虑共同未来']),negative:tiers(['疏离','不悦','反感','厌恶','敌视','决裂'],['回应变得疏淡，减少主动话题','表达不满，要求解释具体行为','避开私人话题与邀约','明确拒绝不合适的互动','质疑你的动机并坚持立场','选择结束关系，修复需要持续行动'])},
 trust:{label:'信任',positive:tiers(['试探','放心','托付','笃信','知己','生死相托'],['先观察你的言行是否一致','愿意提出小请求与担忧','主动托付具体任务','愿意分享秘密并共同解决难题','共同规划重要决定','危机中愿意并肩承担后果']),negative:tiers(['疑虑','戒备','提防','失信','疑惧','彻底封闭'],['需要更多解释与确认','不再轻易接受口头承诺','核实你的行动，减少依赖','撤回托付并要求实际补救','对重大决定保持距离','停止交付秘密，先重建最基本的可靠性'])},
 intimacy:{label:'亲近',positive:tiers(['初见','熟络','陪伴','依恋','归处','灵魂共鸣'],['保持自然的社交距离','相处更自在，愿意延长谈话','习惯一起工作与休息','会主动寻找你的陪伴','共同生活习惯逐渐形成','能坦诚表达脆弱与深层需要']),negative:tiers(['生分','回避','疏远','抗拒','隔阂','形同陌路'],['减少近距离相处','回避单独邀约','主动拉开日常距离','明确要求停止接近','保留各自空间与生活边界','不再维持日常联系，重新接近必须获得回应'])},
 nsfw:{label:'NSFW',positive:tiers(
   ['亲密 · 初触体温','前戏 · 手与唇','性交 · 交叠','快速性交 · 难分','高潮 · 溃堤','高潮后 · 余温'],
   ['回看的时间比平时长半拍，被靠近时不退','手指先动，问也不必问','不再只是贴近，是真的连在一起','节奏由她带走，越快越不肯松','绷紧到极处，声音断掉，整个人塌下去','软下来还不肯放，慢慢又开始']),
  negative:tiers(
   ['亲密 · 暗潮初起','前戏 · 忍不住','性交 · 沦陷','快速性交 · 失控','高潮 · 决堤','高潮后 · 沉底'],
   ['明知不该，视线还是跟着对方走','嘴上说反话，身体却先应了','越界那一下，她反而松了','不再管节奏，只想着再深一点','连羞耻都压不住，全泄出来','还赖着不走，主动要下一轮'])},
}
export const relationshipScore=(value:any)=>Math.max(-600,Math.min(600,Math.round(Number.isFinite(Number(value))?Number(value):0)))
export function relationshipRank(key:RelationshipKey,value:any):any{
 const score=relationshipScore(value),amount=Math.abs(score),level=Math.min(6,Math.floor(amount/100)+1),negative=score<0
 const row=RELATIONSHIP_AXES[key][negative?'negative':'positive'][level-1]
 return{key,label:RELATIONSHIP_AXES[key].label,score,direction:negative?'negative':score>0?'positive':'neutral',level,progress:amount===600?100:amount%100,maxed:amount===600,...row}
}
export const relationshipProfile=(r:any)=>Object.fromEntries(RELATIONSHIP_KEYS.map(key=>[key,relationshipRank(key,r?.[key])]))
export const NSFW_REQUIREMENTS=[0,20,60,120,220,360]
export function matureAccess(story:any,roleId:string):any{
 const r=story.relationships?.[roleId]||{},route=story.relationshipRoutes?.[roleId]==='fall'?'fall':'pure',direction=route==='fall'?-1:1
 const profile=relationshipProfile(r),lowest=Math.min(...['affection','trust','intimacy'].map(k=>relationshipScore(r[k])))
 const allowedLevel=Math.max(1,NSFW_REQUIREMENTS.filter(n=>lowest>=n).length),cap=allowedLevel===6?600:allowedLevel*100-1
 const overdue=(story.events||[]).filter((e:any)=>e.roleId===roleId&&e.status==='overdue')
 const current=relationshipScore(r.nsfw),growing=current*direction>=0
 let reason=''
 if(lowest<0)reason='先修复'+['affection','trust','intimacy'].filter(k=>relationshipScore(r[k])<0).map(k=>RELATIONSHIP_AXES[k].label).join('、')
 else if(overdue.length)reason='先回应逾期约定：'+overdue[0].title
 else if(growing&&Math.abs(current)>=cap&&cap<600)reason='下一阶需要好感、信任、亲近均达到 '+NSFW_REQUIREMENTS[allowedLevel]+' 点'
 return{roleId,route,direction,level:profile.nsfw.level,title:profile.nsfw.title,allowedLevel,cap,enabled:!reason,reason,requirements:NSFW_REQUIREMENTS,nextRequirement:NSFW_REQUIREMENTS[allowedLevel]??null,overdue:overdue.map((e:any)=>e.id)}
}
