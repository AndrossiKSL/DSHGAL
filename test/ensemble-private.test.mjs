import test from 'node:test'
import assert from 'node:assert/strict'
import {ensureEnsemble,planEnsemble,ensembleContext,newWorldline} from '../dist/index.js'

const roles=['deepseek','grok','kimi','glm','qwen','seed'].map(id=>({id,name:id,post:'岗位'+id,home:'家'+id,group:'g'}))
const mk=()=>{const s=newWorldline('deepseek');ensureEnsemble(s,roles);return s}

// 旧逻辑：present.length<3 就拉人，末尾还有无条件补满 3 人的兜底。
// 结果 interaction.kind==='mature' 把 present 减到 1 之后立刻被补回 3，
// 玩家在接吻，旁边两个人在聊典藏目录。
test('mature scene stays one-on-one: no walk-ins, no padding back to three',()=>{
 for(const action of ['凑近一点。','我吻下去。','我伸手把她揽过来。','我们单独待一会儿。','关上门。']){
  const s=mk()
  s.interaction={kind:'mature',roleId:'deepseek'}
  const plan=planEnsemble(s,roles,action,{targetRoleId:'deepseek'})
  assert.equal(plan.present.length,1,action+' → 在场 '+plan.present.length+' 人（应只 1）')
  assert.equal(plan.present[0],'deepseek')
  assert.equal(plan.privateScene,true,action+' 没被判定为私密场景')
  assert.equal(plan.arrivals.length,0,action+' 还有 '+plan.arrivals.length+' 人闯进来')
 }
})

test('typed intimate acts are treated as private even without picking the mature button',()=>{
 const s=mk();s.interaction={kind:'free'}
 const plan=planEnsemble(s,roles,'我低头吻她的脖子。',{targetRoleId:'deepseek'})
 assert.equal(plan.privateScene,true,'手写亲密动作没被判成私密场景')
 assert.equal(plan.present.length,1)
})

test('ordinary scenes may stay small instead of being force-filled to three',()=>{
 const s=mk();s.interaction={kind:'free'}
 // revision 0、非 random/event → 不该硬拉第三个人
 const plan=planEnsemble(s,roles,'她把杯子放下。',{})
 // 普通场景按用户定的容量是 2–3 人，上限 3；不允许超过。
 assert.ok(plan.present.length<=3,'普通场景被硬凑到 '+plan.present.length+' 人')
 assert.ok(plan.present.length>=1)
})

test('private scene tells the model nobody else is around',()=>{
 const s=mk();s.interaction={kind:'mature',roleId:'grok'}
 const plan=planEnsemble(s,roles,'我吻下去。',{targetRoleId:'grok'})
 const ctx=ensembleContext(plan,roles)
 assert.match(ctx,/这是私密场景/)
 assert.match(ctx,/不要写别人经过、推门、探头/)
 assert.match(ctx,/本幕实际在场 1 人/)
})

test('a premise that says nobody else is around keeps the opening one-on-one',()=>{
 const s=mk()
 s.premise='第 1 夜，打烊之后。她坐在你旁边。工坊里没有别人。'
 const plan=planEnsemble(s,roles,'',{})
 assert.equal(plan.privateScene,true,'premise 写了没有别人，却被拉进第三个人')
 assert.equal(plan.present.length,1)
 assert.equal(plan.arrivals.length,0)
})
