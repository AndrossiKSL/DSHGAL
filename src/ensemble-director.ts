import {DIRECTOR_ACTIONS} from './stage-director'
import {resolveNode,nodeLabel,homeForGroup,advanceMember,travelRounds,mapBrief} from './region-map'
import {detectSceneKind,sceneScale,selectCast,scaleInstruction,type SceneKind} from './scene-scale'
import {resolveStage} from './intimate-prose'

export interface EnsembleRole {id:string;name:string;aliases?:string[];post?:string;home?:string;group?:string;persona?:string;tone?:string;address?:string;source?:string;dailyLife?:string[]}

const clean=(v:any,n=180)=>typeof v==='string'?v.trim().slice(0,n):''
const unique=(rows:string[])=>[...new Set(rows)]
const task=(role:EnsembleRole)=>role.post?'整理'+role.post+'的工作':'处理手边的事情'

export function ensureEnsemble(story:any,roles:EnsembleRole[]):any{
 const known=new Map(roles.map(r=>[r.id,r])),state=story.ensemble&&typeof story.ensemble==='object'?story.ensemble:{}
 state.version=2;state.members||={};state.links||={};state.log=Array.isArray(state.log)?state.log:[]
 state.present=unique((Array.isArray(state.present)?state.present:story.direction?.cast?.map((r:any)=>r.role)||[]).filter((id:string)=>known.has(id)))
 if(!state.present.length&&known.has(story.roleId))state.present=[story.roleId]
 for(const role of roles){
  const old=state.members[role.id]||{}
  // 位置必须是地图节点 id。老存档存的是「典藏室」这类岗位名，经 resolveNode 落到
  // 真实地点，否则所有人都会被算在默认点，移动线就废了。
  const home=homeForGroup(role.group||'')
  state.members[role.id]={
   ...old,
   id:role.id,
   location:old.location?resolveNode(old.location):home,
   target:old.target?resolveNode(old.target):home,
   dwellLeft:Number.isFinite(old.dwellLeft)?old.dwellLeft:0,
   arrivedAt:Number.isFinite(old.arrivedAt)?old.arrivedAt:-1,
   activity:old.activity||task(role),
   appearances:Number.isFinite(old.appearances)?old.appearances:0,
   lastSeen:Number.isFinite(old.lastSeen)?old.lastSeen:-1,
   lastSpoke:Number.isFinite(old.lastSpoke)?old.lastSpoke:-1,
   group:role.group||old.group||'',
   memory:Array.isArray(old.memory)?old.memory:(story.turns||[]).filter((row:any)=>row.speaker===role.id).slice(-6).map((row:any)=>({revision:row.revision||0,speaker:role.id,text:clean(row.text,220),to:row.to||'player'})),
  }
 }
 state.focus=state.present.includes(state.focus)?state.focus:state.present[0]||story.roleId
 story.ensemble=state;return state
}

/** 玩家在哪。AI 写的可能是「打烊后的工坊」，统一落到地图节点。 */
function playerNode(story:any):string{
 return resolveNode(story?.scene?.location||story?.premise||'')
}

/**
 * 聚会/大乱交是「约好」的场面：人本来就该在。把就近的人挪到玩家所在处，记为到场。
 * 日常和私密绝不做这件事——那才是「凭空出现」的来源。
 */
function gatherTo(state:any,ids:string[],node:string,revision:number,reasons:any,reason:string):void{
 for(const id of ids){
  const member=state.members[id]
  if(!member||member.location===node)continue
  member.location=node;member.target=node;member.dwellLeft=1;member.arrivedAt=revision+1
  reasons[id]=reason
 }
}

function priorityOf(state:any,id:string,ctx:{addressed:string;pending:any[];previous:string[];invited?:string}):number{
 const m=state.members[id]
 if(!m)return 0
 let score=0
 if(ctx.addressed===id)score+=10000
 if(ctx.invited===id)score+=9000
 if(ctx.pending.some((e:any)=>e.roleId===id))score+=3000
 if(ctx.previous.includes(id))score+=800
 // 出场少的优先露脸，避免总是同几张面孔
 score+=Math.max(0,200-(m.appearances||0)*10)
 return score
}

export function planEnsemble(story:any,roles:EnsembleRole[],action:string,options:any={}):any{
 const state=ensureEnsemble(story,roles),known=new Map(roles.map(r=>[r.id,r])),revision=story.revision||0
 const node=playerNode(story),seed=String(story.seed||'')
 const kind:SceneKind=detectSceneKind({
  action,
  premise:String(story?.premise||''),
  interactionKind:String(story?.interaction?.kind||''),
  previous:story?.ensemble?.sceneKind,
 })
 const scale=sceneScale(kind)
 const privateScene=kind==='intimate'||kind==='orgy'

 // ——每轮推进一次移动——
 // 只有非私密场景才让人走动；正在跟你说话的人（state.present）不会突然走开，
 // 否则你刚点名要跟她说话，下一句就「她还在路上」，体验会崩。
 // 私密场景里没人会在门外溜达，否则下一轮就会「恰好路过」，又变成闯进来。
 if(!privateScene)for(const role of roles){
  if(state.present.includes(role.id))continue
  const member=state.members[role.id]
  if(!member)continue
  // 太久没露面的人往自己那块地方走——否则他们会在远处反复打转，
  // 玩家永远等不到人，22 个人里只会见到固定的几个。
  if(revision-(Number.isFinite(member.lastSeen)?member.lastSeen:-99)>8)member.target=homeForGroup(member.group||'')
  const moved=advanceMember({...member,id:role.id},revision,seed)
  member.location=moved.location;member.target=moved.target;member.dwellLeft=moved.dwellLeft
 }

 const previous=state.present.slice()
 const requested=known.has(options.inviteRoleId)?options.inviteRoleId:''
 const addressed=known.has(options.targetRoleId)?options.targetRoleId:previous.find((id:string)=>[known.get(id)!.name,...known.get(id)!.aliases||[]].some(alias=>alias.length>=2&&action.toLowerCase().includes(alias.toLowerCase())))||''
 const explicit=roles.find(r=>[r.name,...r.aliases||[]].some(alias=>alias.length>=2&&action.toLowerCase().includes(alias.toLowerCase()))&&/(?:邀请|叫来|喊来|请.{0,12}过来|找.{0,12}一起|去找|拜访|联系|喊.{0,12}来)/u.test(action))?.id
 const invitation=requested||explicit||''
 const reasons:any={}
 const pending=(story.events||[]).filter((e:any)=>['pending','overdue'].includes(e.status))

 // ——在场候选：必须物理上就在这里——
 const here=roles.filter(r=>state.members[r.id]?.location===node).map(r=>r.id)
 let focus=addressed&&here.includes(addressed)?addressed:state.focus
 let blocked=''

 // 被邀请的人若在别处，得先走过来——不许瞬移。
 if(invitation&&!here.includes(invitation)){
  const walker=state.members[invitation]
  const rounds=walker?travelRounds(walker.location,node):Number.MAX_SAFE_INTEGER
  if(walker&&rounds<=1){walker.location=node;walker.target=node;walker.arrivedAt=revision+1;here.push(invitation);reasons[invitation]='应你的邀请赶过来'}
  else if(walker){blocked='还在'+nodeLabel(resolveNode(walker.location))+'，要 '+rounds+' 轮才能到';reasons[invitation]=blocked}
 }

 let present:string[]
 if(privateScene){
  focus=story.interaction?.kind==='mature'?story.interaction.roleId||focus:addressed||invitation||focus
  if(!here.includes(focus))focus=here.includes(previous[0])?previous[0]:here[0]||focus
  if(kind==='orgy'){
   // 大乱交是约好的多人场面：把就近的人召集过来，容量 5。
   if(here.length<scale.min){
    const need=scale.min-here.length
    const nearby=roles.filter(r=>!here.includes(r.id))
     .sort((a,b)=>travelRounds(state.members[a.id]?.location||node,node)-travelRounds(state.members[b.id]?.location||node,node))
    const pulled=nearby.slice(0,need).map(r=>r.id)
    gatherTo(state,pulled,node,revision,reasons,'已经到了，没走')
    here.push(...pulled)
   }
   present=selectCast(here,scale,id=>priorityOf(state,id,{addressed,pending,previous}))
   focus=present.includes(focus)?focus:present[0]
  }else{
   // 一对一默认只有一个人；第二个人只在你明确叫了她、而她恰好也在这里时才进来。
   present=[focus]
   if(scale.max>=2&&invitation&&invitation!==focus&&here.includes(invitation))present.push(invitation)
  }
 }else if(kind==='party'){
  if(here.length<scale.min){
   const need=scale.min-here.length
   const nearby=roles.filter(r=>!here.includes(r.id))
    .sort((a,b)=>travelRounds(state.members[a.id]?.location||node,node)-travelRounds(state.members[b.id]?.location||node,node))
   const pulled=nearby.slice(0,need).map(r=>r.id)
   gatherTo(state,pulled,node,revision,reasons,'受邀前来')
   here.push(...pulled)
  }
  present=selectCast(here,scale,id=>priorityOf(state,id,{addressed,pending,previous}))
  focus=present.includes(focus)?focus:present[0]
 }else{
  present=selectCast(here,scale,id=>priorityOf(state,id,{addressed,pending,previous}))
  // 被点名、或刚被叫过来的人必须在场。否则「请她过来」会静默失败——
  // 人已经走到门口却被容量裁掉，玩家看到的就是「我叫了她但她没来，也没说为什么」。
  for(const must of [addressed,invitation]){
   if(!must||!here.includes(must)||present.includes(must))continue
   const drop=present.filter(id=>id!==focus).sort((a,b)=>priorityOf(state,a,{addressed:'',pending,previous})-priorityOf(state,b,{addressed:'',pending,previous}))[0]
   present=drop?present.map(id=>id===drop?must:id):[...present.slice(0,Math.max(0,scale.max-1)),must]
  }
  // 轮换：present 里的人不会走开，如果从不换人，永远是同一张脸。
  // 每三轮让一个没露过面的人顶替说话最久的那位。
  if(revision>0&&revision%3===0){
   const fresh=here.filter(id=>!previous.includes(id)&&!present.includes(id))
   if(fresh.length){
    const incoming=fresh.sort((a,b)=>priorityOf(state,b,{addressed,pending,previous})-priorityOf(state,a,{addressed,pending,previous}))[0]
    const drop=present.filter(id=>id!==focus&&id!==addressed).sort((a,b)=>state.members[a].lastSpoke-state.members[b].lastSpoke)[0]
    if(incoming&&drop)present=present.map(id=>id===drop?incoming:id)
   }
  }
  if(!present.length&&known.has(story.roleId)){
   // 玩家一个人待着也合法——但至少让开场角色在场，否则没有对话。
   present=[story.roleId]
   const m=state.members[story.roleId]
   if(m)m.location=node
  }
  if(!addressed){
   const due=present.filter(id=>pending.some((e:any)=>e.roleId===id))
   focus=(story.interaction?.kind==='event'&&due[0])||present.slice().sort((a,b)=>state.members[a].lastSpoke-state.members[b].lastSpoke)[0]||present[0]
  }else focus=present.includes(addressed)?addressed:present[0]
 }

 // ——不许「说一句就走」——
 // 刚到场的人至少留到下一轮；上一轮才到的人这一轮不许离场。
 // 这正是用户抱怨的「加入进来，说句出戏的话就走了」——干脆不让它发生。
 const arrivals=present.filter(id=>!previous.includes(id)).map(id=>({
  role:id,name:known.get(id)?.name||id,
  reason:reasons[id]||(privateScene?'就在这儿':'过来了'),
  post:known.get(id)?.post||'工坊',
 }))
 for(const id of previous){
  if(present.includes(id))continue
  const member=state.members[id]
  if(!member)continue
  // arrivedAt 默认 -1 表示「从来不是刚到的」。漏掉 >=0 判断时，
  // revision 为 0 的第一轮会让 -1 >= -1 成立，把所有人都当成刚到场而强行留场，
  // 私密场景就会多出一个人。
  const justArrived=Number.isFinite(member.arrivedAt)&&member.arrivedAt>=0&&member.arrivedAt>=revision-1
  if(justArrived&&(privateScene||kind==='party'))present.push(id)
 }
 const departures=previous.filter((id:string)=>{
  if(present.includes(id))return false
  const member=state.members[id]
  if(!member)return true
  return !(Number.isFinite(member.arrivedAt)&&member.arrivedAt>=revision)
 }).map((id:string)=>({role:id,name:known.get(id)?.name||id,reason:'先回去处理'+(known.get(id)?.post||'手边')+'的事情'}))

 const roster=present.slice(0,Math.max(scale.max,present.length))
 return{
  version:2,revision:revision+1,previous,present:roster,focus,privateScene,kind,
  // H 段位：从第 1 段起步，按轮数和玩家动作推进，只进不退。
  stage:privateScene?resolveStage({allowedLevel:1,sceneTurns:Number(story.intimateTurns)||0,action,previous:Number(story.intimateStage)||0}):0,
  scale:{kind:scale.kind,min:scale.min,max:scale.max,label:scale.label},
  node,nodeLabel:nodeLabel(node),
  arrivals:arrivals.filter(r=>roster.includes(r.role)),
  departures:departures.filter(r=>!roster.includes(r.role)),
  blocked,
  map:mapBrief(roles.map(r=>({name:r.name,location:state.members[r.id]?.location||node})),node),
  roles:roster.map(id=>({id,name:known.get(id)?.name||id,post:known.get(id)?.post||'工坊',memory:state.members[id]?.memory.slice(-4)||[],activity:state.members[id]?.activity||''})),
  reasons,
 }
}

export function normalizeDialogue(value:any,direction:any,line:string):any[]{
 const allowed=new Set(direction.cast.map((c:any)=>c.role)),rows:any[]=[]
 for(const row of (Array.isArray(value)?value:[]).slice(0,8)){
  if(!allowed.has(row?.speaker)||!clean(row.text,700))continue
  const action=DIRECTOR_ACTIONS.includes(row.action)?row.action:direction.cast.find((c:any)=>c.role===row.speaker)?.action||'attentive'
  const to=row.to==='player'||row.to==='all'||allowed.has(row.to)?row.to:'all'
  const reactions=(Array.isArray(row.reactions)?row.reactions:[]).filter((r:any)=>allowed.has(r?.role)&&DIRECTOR_ACTIONS.includes(r.action)).slice(0,3).map((r:any)=>({role:r.role,action:r.action}))
  rows.push({speaker:row.speaker,text:clean(row.text,700),action,to,emotion:clean(row.emotion,40),reactions})
 }
 if(!rows.length&&clean(line,800))rows.push({speaker:direction.speaker,text:clean(line,800),action:direction.cast.find((c:any)=>c.role===direction.speaker)?.action||'attentive',to:'player',emotion:'',reactions:[]})
 return rows
}

export function commitEnsemble(story:any,step:any,action:string,roles:EnsembleRole[]):void{
 const state=ensureEnsemble(story,roles),plan=step.ensemblePlan,revision=story.revision+1,known=new Map(roles.map(r=>[r.id,r]))
 if(plan){
  const notes=[...plan.departures.map((r:any)=>r.name+r.reason+'。'),...plan.arrivals.filter((r:any)=>!String(step.narration||'').includes(r.name)).map((r:any)=>r.name+r.reason+'。')]
  if(notes.length)step.narration=[notes.join(''),step.narration].filter(Boolean).join('\n')
  state.log.push({revision,arrivals:plan.arrivals,departures:plan.departures});state.log=state.log.slice(-80)
  state.sceneKind=plan.kind
  // 私密场景的推进深度：用来决定这一幕该写到多直白。
  // 只靠关系阶数会让「好感 0 分但玩家已经动手」的场面一直停在试探。
  if(plan.privateScene){
   story.intimateTurns=Math.max(0,Number(story.intimateTurns)||0)+1
   story.intimateStage=Math.max(1,Math.min(6,Number(plan.stage)||Number(story.intimateStage)||1))
  }else if(plan.kind==='normal'||plan.kind==='party'){
   story.intimateTurns=0;story.intimateStage=0
  }
  for(const row of plan.arrivals)if(state.members[row.role])state.members[row.role].arrivedAt=revision
 }
 state.present=step.direction.cast.map((r:any)=>r.role);state.focus=plan?.focus||step.direction.speaker
 const node=resolveNode(step.scene?.location||story.scene?.location||'')
 for(const id of state.present){
  story.relationships||={};story.relationships[id]||={affection:0,trust:0,intimacy:0,nsfw:0,stage:'初识'}
  const m=state.members[id];if(!m)continue
  m.appearances++;m.lastSeen=revision;m.location=node;m.activity='和大家一起交谈'
 }
 for(const row of plan?.departures||[]){const member=state.members[row.role],def=known.get(row.role);if(member){member.location=homeForGroup(def?.group||'');member.target=member.location;member.activity=task(def||{id:row.role,name:row.name})}}
 const addMemory=(id:string,entry:any)=>{const m=state.members[id];if(m){m.memory.push(entry);m.memory=m.memory.slice(-20)}}
 // A role learns only what she actually heard in the shared scene, not the whole world log.
 for(const id of state.present){if(action&&(!plan?.arrivals.some((r:any)=>r.role===id)||story.interaction?.targetRoleId===id||story.interaction?.inviteRoleId===id))addMemory(id,{revision,speaker:'player',text:clean(action,220)});for(const row of step.dialogue)addMemory(id,{revision,speaker:row.speaker,text:clean(row.text,220),to:row.to})}
 for(const def of roles)if(!state.present.includes(def.id)){const m=state.members[def.id],phase=(Math.floor(revision/4)+roles.indexOf(def))%3;m.activity=(def.dailyLife?.length?def.dailyLife:[task(def),'准备'+(def.post||'工坊')+'的下一次交接','核对'+(def.post||'工坊')+'尚未完成的事项'])[phase%Math.max(1,def.dailyLife?.length||3)]}
 for(const row of step.dialogue){const m=state.members[row.speaker];if(m)m.lastSpoke=revision;if(row.to!=='player'&&row.to!=='all'&&row.to!==row.speaker){const ids=[row.speaker,row.to].sort(),key=ids.join(':');const link=state.links[key]||{roles:ids,exchanges:0};link.exchanges++;link.lastRevision=revision;link.lastTopic=clean(row.text,100);state.links[key]=link}}
}

export function ensembleContext(plan:any,roles:EnsembleRole[]):string{
 const scale=sceneScale(plan.kind||'normal')
 return[
  '共同生活的角色名单：'+JSON.stringify(roles.map(r=>({id:r.id,name:r.name,post:r.post}))),
  // 地图是硬约束：不在同一地点的人不能开口，走过来按轮数算。
  '地点与行动线（不在同一地点的人不能开口；这条线也约束着不在场的人）：\n'+String(plan.map||''),
  '本幕群像调度：'+JSON.stringify({present:plan.present,focus:plan.focus,kind:plan.kind,arrivals:plan.arrivals,departures:plan.departures,node:plan.nodeLabel}),
  '本幕每位在场角色的独立设定：'+JSON.stringify(roles.filter(r=>plan.present.includes(r.id))),
  scaleInstruction(scale,plan.present.length),
  // 「说一句就走」是用户明确抱怨过的：到场的人必须真的参与。
  (plan.arrivals?.length||plan.departures?.length)
   ? '有人到场或离场。到场的人这一整幕都要在场并真的参与对话——不是打个招呼就消失；离场的人这一幕之后不要再出现。'
   : '',
  '让近期少说话者得到参与机会。角色只知道她亲历或被明确告知的内容。',
 ].filter(Boolean).join('\n')
}
