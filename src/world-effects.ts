import {RELATIONSHIP_KEYS,relationshipScore,relationshipProfile,matureAccess} from './relationship-progression'
import {createHash} from 'node:crypto'

const clean=(v:any,n=160)=>typeof v==='string'?v.trim().slice(0,n):''
const score=relationshipScore
const evidenceIn=(quote:any,action:string)=>clean(quote,240).length>=2&&action.includes(clean(quote,240))
export const RELATION_RULES:Record<string,any>={
  considerate:{affection:2,trust:1,intimacy:0,label:'体贴'},
  respected_boundary:{affection:1,trust:3,intimacy:0,label:'尊重界限'},
  shared_time:{affection:1,trust:1,intimacy:1,label:'共同经历'},
  hurtful:{affection:-2,trust:-3,intimacy:0,label:'伤害'},
  warm_exchange:{affection:8,trust:2,intimacy:2,label:'真诚关心'},
  confided:{affection:2,trust:8,intimacy:2,label:'坦诚相待'},
  shared_moment:{affection:2,trust:2,intimacy:8,label:'共同陪伴'},
  dismissive:{affection:-8,trust:-2,intimacy:-2,label:'冷落'},
  deceived:{affection:-2,trust:-8,intimacy:-2,label:'欺瞒'},
  distanced:{affection:-2,trust:-2,intimacy:-8,label:'疏远'},
  mature_pure:{affection:2,trust:1,intimacy:2,nsfw:6,label:'纯爱发展'},
  mature_fall:{affection:0,trust:0,intimacy:2,nsfw:-6,label:'沉沦发展'},
}
export function relationshipStage(r:any):string {
  if(r.trust<0)return '信任待修复';if(r.affection<0)return '关系紧张';if(r.intimacy<0)return '保持距离'
  const level=Math.min(...['affection','trust','intimacy'].map(k=>relationshipProfile(r)[k].level));return ['初识','熟悉','亲近','信赖','依恋','挚爱'][level-1]
}
export function ensureWorldEffects(story:any):void {
  story.relationships ||= {};story.events=Array.isArray(story.events)?story.events:[]
  story.journal=Array.isArray(story.journal)?story.journal:[]
  if(!story.relationships[story.roleId])story.relationships[story.roleId]={affection:0,trust:0,intimacy:0,nsfw:0}
  story.relationshipRoutes ||= {};story.relationshipVersion=2
  for(const r of Object.values(story.relationships) as any[]){for(const k of RELATIONSHIP_KEYS)r[k]=score(r[k]);r.stage=relationshipStage(r)}
}

/** The Agent proposes evidence; only the engine awards fixed, bounded consequences. */
export function settleWorldEffects(story:any,step:any,action:string,requestId:string,roles:string[]):void {
  ensureWorldEffects(story)
  const changes:any[]=[],events:any[]=[],rejected:string[]=[],used=new Set<string>()
  const revision=story.revision+1,at=Date.now(),cast=new Set(roles)
  const apply=(roleId:string,delta:any,reason:string,evidence:string,source:string)=>{
    const r=story.relationships[roleId] ||= {affection:0,trust:0,intimacy:0,nsfw:0}
    const prior=relationshipProfile(r),actual:any={}
    for(const key of RELATIONSHIP_KEYS){const before=score(r[key]);let next=score(before+(delta[key]||0));if(key==='nsfw'&&delta[key]){const gate=matureAccess(story,roleId);if(next*gate.direction>0)next=gate.direction*Math.min(Math.abs(next),gate.cap)};r[key]=next;actual[key]=r[key]-before}
    const after=relationshipProfile(r),ranks=RELATIONSHIP_KEYS.filter(k=>prior[k].level!==after[k].level||prior[k].direction!==after[k].direction).map(k=>({key:k,from:prior[k],to:after[k]}))
    r.stage=relationshipStage(r);changes.push({roleId,delta:actual,reason,evidence,source,stage:r.stage,ranks})
  }
  // Opening has no player action: it cannot mint relationships or fulfilled promises.
  for(const p of (Array.isArray(step.events)?step.events:[]).slice(0,4)){
    if(!p||typeof p!=='object')continue
    const roleId=clean(p.roleId)||story.roleId,evidence=clean(p.evidence,240)
    if(!action||!cast.has(roleId)||!evidenceIn(evidence,action)){rejected.push('事件缺少本轮行动依据');continue}
    if(p.operation==='promise'){
      const title=clean(p.title),key=createHash('sha256').update(roleId+':'+title.replace(/\s/g,'')).digest('hex').slice(0,16)
      if(!title||story.events.some((e:any)=>e.id==='event-'+key))continue
      if(story.events.filter((e:any)=>['pending','overdue'].includes(e.status)).length>=32){rejected.push('待办约定已满');continue}
      const dueDay=Number.isInteger(p.dueDay)&&p.dueDay>=story.scene.day&&p.dueDay<=story.scene.day+30?p.dueDay:null
      const event={id:'event-'+key,roleId,title,status:'pending',dueDay,createdRevision:revision,evidence}
      story.events.push(event);events.push({...event});continue
    }
    const event=story.events.find((e:any)=>e.id===p.id&&e.roleId===roleId)
    if(!event||!['pending','overdue'].includes(event.status)||!['complete','fail','cancel'].includes(p.operation)){rejected.push('约定不存在或已结算');continue}
    // A just-created promise must survive until a later turn before settlement.
    if(event.createdRevision===revision){rejected.push('不能当轮创建并兑现约定');continue}
    event.status=({complete:'completed',fail:'failed',cancel:'cancelled'} as any)[p.operation]
    Object.assign(event,{settledRevision:revision,settledEvidence:evidence,settledAt:at});events.push({...event})
    if(p.operation!=='cancel'&&!used.has(roleId)){apply(roleId,p.operation==='complete'?{affection:2,trust:3,intimacy:1}:{affection:-2,trust:-3,intimacy:0},p.operation==='complete'?'兑现约定：'+event.title:'失约：'+event.title,evidence,event.id);used.add(roleId)}
  }
  for(const proposal of (Array.isArray(step.relationships)?step.relationships:[]).slice(0,3)){
    if(!proposal||typeof proposal!=='object')continue
    const roleId=clean(proposal.roleId)||story.roleId,rule=Object.hasOwn(RELATION_RULES,proposal.kind)?RELATION_RULES[proposal.kind]:null
    if(!action||!cast.has(roleId)||!rule||!evidenceIn(proposal.evidence,action)){rejected.push('关系变化缺少有效类型或行动依据');continue}
    if(rule.nsfw){const gate=matureAccess(story,roleId);if(story.interaction?.kind!=='mature'||story.interaction.roleId!==roleId||!gate.enabled||Math.sign(rule.nsfw)!==gate.direction){rejected.push('亲密发展需对应选项、关系条件与所选路线');continue}}
    if(used.has(roleId))continue
    used.add(roleId);apply(roleId,rule,clean(proposal.reason)||rule.label,clean(proposal.evidence,240),proposal.kind)
  }
  const day=step.scene?.day||story.scene.day
  for(const event of story.events)if(event.status==='pending'&&event.dueDay&&day>event.dueDay){event.status='overdue';events.push({...event})}
  const settlement={revision,requestId,at,changes,events,rejected}
  story.settlement=settlement
  if(changes.length||events.length)story.journal.push(settlement)
}
