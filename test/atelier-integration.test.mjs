import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync, rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {Readable} from 'node:stream'
import {apply} from '../dist/index.js'

function runtime(home) {
 let route
 apply({dshHomePath:(...s)=>join(home,...s),effect:fn=>fn(),on(){},inject(){},
  webServer:{register(spec){route=spec}}},{enabled:true,imageBackend:'off'}, {})
 return async (action,args={})=>{
  const request=Readable.from([Buffer.from(JSON.stringify({action,args}))]);request.method='POST'
  let body='';await route.handler(request,{writeHead(){},end(c){body=c}})
  return JSON.parse(body)
 }
}

test('revised appearances align profile, stage and legacy selection without resetting progress',async()=>{
 const home=mkdtempSync(join(tmpdir(),'atelier-integration-'))
 try {
  let call=runtime(home)
  const identities={deepseek:'鲸尾',claude:'铜橙色',chatgpt:'白龙娘',gemini:'猫娘',kimi:'银白发',grok:'金色长双马尾'}
  for(const [id,identity] of Object.entries(identities)){
   await call('settings-set',{settings:{characterMode:'manual',characterId:id}})
   await call('sprite-set-builtin',{characterId:id,variant:'A'})
   const view=await call('view')
   const before={level:view.level,affection:view.affection}
   assert.equal(view.sprite,'atelier-sprite-'+id)
   assert.ok((await call('profile-get',{characterId:id})).builtIn.visual.includes(identity))
   assert.equal((await call('gal-state')).scenario.sprites[id],view.sprite)
   assert.equal(view.spriteVariants.filter(row=>row.current).length,1)
   const legacy=view.spriteVariants.find(row=>row.id==='legacy-a')
   assert.ok(legacy&&legacy.key!==view.sprite)
   await call('sprite-set-builtin',{characterId:id,variant:'legacy-a'})
   const old=await call('view')
   assert.equal(old.sprite,legacy.key)
   assert.deepEqual({level:old.level,affection:old.affection},before)
   if(id==='chatgpt')assert.match((await call('profile-get',{characterId:id})).builtIn.visual,/黑短/)
   await call('sprite-set-builtin',{characterId:id,variant:'A'})
  }
  await call('settings-set',{settings:{characterMode:'manual',characterId:'chatgpt'}})
  await call('profile-set',{characterId:'chatgpt',overrides:{visual:'测试用自定义外观'}})
  assert.equal((await call('profile-get',{characterId:'chatgpt'})).effective.visual,'测试用自定义外观')
  call=runtime(home)
  const loaded=await call('view')
  assert.equal(loaded.current,'chatgpt')
  assert.equal(loaded.sprite,'atelier-sprite-chatgpt')
  assert.equal((await call('profile-get',{characterId:'chatgpt'})).effective.visual,'测试用自定义外观')
 } finally {rmSync(home,{recursive:true,force:true})}
})
