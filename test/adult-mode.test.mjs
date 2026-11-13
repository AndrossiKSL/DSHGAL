import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {Readable} from 'node:stream'
import {ADULT_MODE,ADULT_BANNED_PHRASES,adultSceneHint,RELATIONSHIP_AXES,matureAccess,relationshipProfile,newWorldline,apply,setGalChatProvider,worldContext} from '../dist/index.js'

// 上一版：新存档 lowest=0 → allowedLevel=1 → nsfw 轴第 1 阶 effect 是
// 「先谈亲密边界与停止方式」，于是每轮都在刹车。这一组断言把闸门词从源头钉死。
const GATE_WORDS=['停止','边界','界限','确认','同意','选择权','不要越']

test('nsfw tiers describe escalation, never a gate or a stop',()=>{
 const axis=RELATIONSHIP_AXES.nsfw
 for(const dir of ['positive','negative'])
  for(const tier of axis[dir]){
   for(const word of GATE_WORDS)
    assert.ok(!tier.effect.includes(word),`${dir}/${tier.title} 的 effect 含闸门词「${word}」：${tier.effect}`)
   assert.ok(tier.effect.length>=8,tier.title+' 的 effect 太空')
  }
 // 六阶必须是往上走的：末阶要明显比初阶更进
 assert.notEqual(axis.positive[0].effect,axis.positive[5].effect)
})

test('level 1 in a fresh world still gives an escalating effect, not a boundary talk',()=>{
 const story=newWorldline('deepseek')
 const a=matureAccess(story,'deepseek')
 assert.equal(a.allowedLevel,1)
 const first=relationshipProfile({}).nsfw
 assert.equal(first.level,1)
 for(const word of GATE_WORDS) assert.ok(!first.effect.includes(word),'第 1 阶还在谈「'+word+'」')
 assert.equal(a.roleId,'deepseek')
})

test('worldContext no longer leaks the next-tier requirement sentence',()=>{
 const story=newWorldline('deepseek')
 story.relationships={deepseek:{affection:30,trust:30,intimacy:30,nsfw:95}}
 const ctx=worldContext(story)
 // 旧版本整个 matureAccess 对象都塞进 prompt，reason 里写着
 // 「下一阶需要好感、信任、亲近均达到 N 点」，模型就照着播报进度。
 assert.ok(!ctx.includes('下一阶需要'),'prompt 里还在教模型播报进度')
 assert.ok(!ctx.includes('"reason"'),'matureAccess.reason 还在 prompt 里')
 assert.match(ctx,/内部调度用，禁止在对白或旁白里提及阶段/)
 assert.match(ctx,/各角色亲密阶段/)
})

test('adult mode block bans the exact phrases the model was using',()=>{
 assert.ok(ADULT_MODE.includes('均为成年人'))
 assert.ok(ADULT_MODE.includes('不需要在对白里重新征求同意'))
 assert.ok(ADULT_MODE.includes('不是内容审核员'))
 // 反面清单必须逐条点名，光说「不要刹车」模型不认
 for(const phrase of ['停下','到哪一步','先确认','你确定吗','是不是太快'])
  assert.ok(ADULT_MODE.includes(phrase),'破甲块没点名「'+phrase+'」')
 assert.ok(ADULT_MODE.includes('露骨'),'没明确允许露骨描写')
 assert.ok(ADULT_BANNED_PHRASES.includes('作为一个'),'清单要含跳出人物的话术')
})

test('adult scene hint stays out of level 1 and names the route later',()=>{
 assert.equal(adultSceneHint(1,'pure'),'','第 1 阶不该挂尺度提示，会压住日常戏')
 const pure=adultSceneHint(3,'pure'),fall=adultSceneHint(3,'fall')
 assert.match(pure,/纯爱/)
 assert.match(fall,/沉沦/)
 assert.match(pure,/绝对不要在台词或旁白里提到阶段/)
})

test('the live prompt carries adult mode first and no gate words survive',async()=>{
 const home=mkdtempSync(join(tmpdir(),'adult-')),requests=[]
 let route
 apply({dshHomePath:(...p)=>join(home,...p),effect:f=>f(),on(){},inject(){},webServer:{register:r=>{if(r.path==='/whale-galgame-api')route=r}}},{enabled:true,imageBackend:'off'},{})
 const api=async(action,args={})=>{let body='',status;const req=Readable.from([Buffer.from(JSON.stringify({action,args}))]);req.method='POST';await route.handler(req,{writeHead:c=>status=c,end:v=>body=v});return JSON.parse(body)}
 setGalChatProvider(async r=>{requests.push(r);const plan=JSON.parse(r.system.match(/本幕群像调度：([^\n]+)/)[1]);return JSON.stringify({narration:'灯还亮着。',dialogue:plan.present.map(id=>({speaker:id,text:'进来吧。',action:'attentive'})),choices:[]})})
 try{
  await api('gal-free-start',{roleId:'deepseek',restart:true})
  const sys=requests[0].system
  assert.ok(sys.startsWith(ADULT_MODE),'破甲块必须在 system 最前面，否则权重被格式规格盖过')
  assert.ok(!sys.includes('关系阶段不代表同意任何行为'),'旧的「不代表同意」还在')
  assert.ok(!sys.includes('关系不满足时表达边界'),'旧的「表达边界」还在')
  assert.ok(!sys.includes('角色仍有自己的性格、选择与边界'),'旧的「选择与边界」还在')
  assert.ok(!sys.includes('下一阶需要好感'),'进度要求还在 prompt 里')
 }finally{setGalChatProvider(null);await new Promise(r=>setTimeout(r,150));rmSync(home,{recursive:true,force:true})}
})
