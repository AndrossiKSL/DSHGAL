import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync,readFileSync,renameSync,mkdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {Readable} from 'node:stream'
import {RELATIONSHIP_KEYS,RELATIONSHIP_AXES,relationshipRank,relationshipScore,matureAccess,newWorldline,upgradeWorldline,commitWorldStep,worldChoices,apply,setGalChatProvider} from '../dist/index.js'
const pause=ms=>new Promise(r=>setTimeout(r,ms))
const step=(kind='warm_exchange')=>({line:'我们慢慢来。',scene:{},choices:[],facts:[],commitments:[],action:'attentive',allowedRoles:['deepseek'],relationships:[{roleId:'deepseek',kind,evidence:'认真回应',reason:'认真回应她'}]})
test('all four axes have six signed ranks, exact thresholds and a 100% final cap',()=>{
 for(const key of RELATIONSHIP_KEYS){
  for(const direction of ['positive','negative']){assert.equal(RELATIONSHIP_AXES[key][direction].length,6);assert.equal(new Set(RELATIONSHIP_AXES[key][direction].map(r=>r.title)).size,6);assert.ok(RELATIONSHIP_AXES[key][direction].every(r=>r.effect))}
  for(const sign of [1,-1])for(let level=1;level<=6;level++){
   const rank=relationshipRank(key,sign*((level-1)*100+42));assert.equal(rank.level,level);assert.equal(rank.progress,42)
  }
  for(const value of [600,-600,900,-900]){const p=relationshipRank(key,value);assert.equal(p.level,6);assert.equal(p.progress,100);assert.equal(p.maxed,true)}
  assert.equal(relationshipRank(key,99).level,1);assert.equal(relationshipRank(key,100).level,2);assert.equal(relationshipRank(key,-100).level,2)
 }
 assert.equal(relationshipScore(Infinity),0)
})
test('legacy world migration preserves old values, text and independent negative progress',()=>{
 const old={roleId:'deepseek',turns:[{text:'不能丢失的旧对白'}],facts:['旧事实'],relationships:{deepseek:{affection:24,trust:8,intimacy:2}}}
 upgradeWorldline(old);assert.equal(old.relationships.deepseek.nsfw,0);assert.equal(old.relationships.deepseek.affection,24);assert.equal(old.turns[0].text,'不能丢失的旧对白')
 old.relationships.deepseek.trust=-103;old.relationships.deepseek.nsfw=-242;upgradeWorldline(old)
 assert.equal(old.relationships.deepseek.trust,-103);assert.equal(old.relationships.deepseek.nsfw,-242);assert.equal(upgradeWorldline(newWorldline('deepseek')).relationships.deepseek.nsfw,0)
})
test('evidence settles signed changes once and records rank reversal',()=>{
 const w=upgradeWorldline(newWorldline('deepseek'));w.relationships.deepseek.affection=100
 commitWorldStep(w,step('hurtful'),'认真回应','hurt');assert.equal(w.relationships.deepseek.affection,98)
 assert.ok(w.settlement.changes[0].ranks.some(r=>r.key==='affection'&&r.from.level===2&&r.to.level===1))
 w.relationships.deepseek.affection=0;commitWorldStep(w,step('dismissive'),'认真回应','negative');assert.equal(w.relationships.deepseek.affection,-8)
 commitWorldStep(w,step('dismissive'),'认真回应','negative');assert.equal(w.relationships.deepseek.affection,-8)
 commitWorldStep(w,step('warm_exchange'),'没有对应的原话','invalid');assert.equal(w.relationships.deepseek.affection,-8)
})
test('mature gains require selected direction, relation thresholds and resolved overdue promises',()=>{
 const w=upgradeWorldline(newWorldline('deepseek'))
 commitWorldStep(w,step('mature_pure'),'认真回应','free');assert.equal(w.relationships.deepseek.nsfw,0)
 w.interaction={kind:'mature',roleId:'deepseek'};commitWorldStep(w,step('mature_pure'),'认真回应','pure');assert.equal(w.relationships.deepseek.nsfw,6)
 w.relationships.deepseek.nsfw=98;w.relationships.deepseek.affection=0;w.relationships.deepseek.trust=0;w.relationships.deepseek.intimacy=0
 commitWorldStep(w,step('mature_pure'),'认真回应','cap');assert.equal(w.relationships.deepseek.nsfw,99);assert.equal(matureAccess(w,'deepseek').enabled,false)
 Object.assign(w.relationships.deepseek,{affection:20,trust:20,intimacy:20});assert.equal(matureAccess(w,'deepseek').enabled,true)
 commitWorldStep(w,step('mature_pure'),'认真回应','promote');assert.equal(relationshipRank('nsfw',w.relationships.deepseek.nsfw).level,2)
 w.events.push({id:'pending',roleId:'deepseek',status:'overdue',title:'带地图',createdRevision:0});assert.match(matureAccess(w,'deepseek').reason,/逾期/)
 const prior=w.relationships.deepseek.nsfw;commitWorldStep(w,step('mature_pure'),'认真回应','blocked');assert.equal(w.relationships.deepseek.nsfw,prior)
 w.events[0].status='completed';w.relationships.deepseek.trust=-1;assert.match(matureAccess(w,'deepseek').reason,/信任/)
})
test('pure and fall are signed intent, reversing existing progress before changing route',()=>{
 const w=upgradeWorldline(newWorldline('deepseek'));w.relationshipRoutes.deepseek='fall';w.interaction={kind:'mature',roleId:'deepseek'}
 w.relationships.deepseek.nsfw=6;commitWorldStep(w,step('mature_fall'),'认真回应','zero');assert.equal(w.relationships.deepseek.nsfw,0)
 commitWorldStep(w,step('mature_fall'),'认真回应','fall');assert.equal(w.relationships.deepseek.nsfw,-6)
 commitWorldStep(w,step('mature_pure'),'认真回应','wrong');assert.equal(w.relationships.deepseek.nsfw,-6)
 const choices=worldChoices(w,{choices:[{kind:'normal',label:'聊聊心情',action:'仔细询问她此刻的心情'}]});// 选项系统扩到 5 个：模型给的四种 + 本地的「自己决定走向」。
 // swap 只在多人场景第 6 段出现，这里单人所以没有。
 assert.deepEqual(choices.map(c=>c.kind),['normal','event','random','mature','custom'])
 // mature 的兜底以前写「商量暗线的边界」，那是刹车，现在是往前推一小步
 assert.ok(!/暗线|边界|界限/.test(choices[3].action),'mature 兜底不该再是刹车：'+choices[3].action)
 assert.match(choices[3].action,/凑近|接着/)
 assert.equal(choices[4].id,'mode-custom')
 assert.equal(choices[4].action,'','自己决定走向不该预设行动')
 assert.ok(choices[0].action.includes('仔细询问'))
})
function boot(home){let route;apply({dshHomePath:(...p)=>join(home,...p),effect:fn=>fn(),on(){},inject(){},webServer:{register:r=>{if(r.path==='/whale-galgame-api')route=r}}},{enabled:true,imageBackend:'off'},{});return async(action,args={})=>{let status,body;const req=Readable.from([Buffer.from(JSON.stringify({action,args}))]);req.method='POST';await route.handler(req,{writeHead(n){status=n},end(v){body=v}});const r=JSON.parse(body);if(status!==200)throw new Error(r.error);return r}}
test('host canonical choices, route saves, retry identity and failed writes remain atomic',async()=>{
 const home=mkdtempSync(join(tmpdir(),'relationship-ranks-'));let generations=0
 setGalChatProvider(async({system,prompt})=>{generations++;if(system.includes('维护剧情摘要'))return '他们在确认彼此的边界。';const action=prompt.match(/玩家刚刚(?:说)?：(.*)/)?.[1]||'',mature=system.includes('"kind":"mature"'),fall=system.includes('"route":"fall"');return JSON.stringify({line:'我们可以先把边界说清楚。',choices:[{kind:'normal',label:'聊聊近况',action:'聊聊你今天的近况'},{kind:'event',label:'跟进手头的事',action:'问问你手头这件事的下一步'},{kind:'random',label:'看看门外',action:'留意门外的新动静'},{kind:'mature',label:'谈谈亲密边界',action:'认真回应你提出的亲密边界'}],relationships:action?[{kind:action==='冷淡回应'?'dismissive':mature?fall?'mature_fall':'mature_pure':'warm_exchange',evidence:action}]:[]})})
 try{
  let call=boot(home),s=await call('gal-free-start',{roleId:'deepseek'});const id=s.world.worldId
  // 5 个：四种模型走向 + 自己决定走向
  assert.equal(s.choices.length,5)
  let j=await call('gal-world-route-set',{worldId:id,roleId:'deepseek',route:'fall'});assert.equal(j.routes.deepseek,'fall');assert.match(j.story.choices[3].action,/凑近|接着/,  'fall 路线的 mature 兜底也要往前推')
  const args={choiceId:'mode-mature',action:'恶意替换行动',requestId:'mature-1',revision:1}
  s=await call('gal-free-next',args);assert.equal(s.world.relationships.deepseek.nsfw,-6)
  assert.ok(s.world.revision===2);const raw=JSON.parse(readFileSync(join(home,'storages/dsh-whale-galgame/global.json'),'utf8'));assert.ok(raw.gal.freeStory.turns.some(t=>t.speaker==='player'&&t.text.includes('接着做下去')));assert.ok(!raw.gal.freeStory.turns.some(t=>t.text==='恶意替换行动'))
  const duplicate=await call('gal-free-next',args);assert.equal(duplicate.duplicate,true);assert.equal(duplicate.world.relationships.deepseek.nsfw,-6)
  await call('gal-free-next',{action:'冷淡回应',requestId:'cold'});const locked=await call('gal-free-state');assert.equal(locked.choices[3].disabled,true);const generated=generations;const denied=await call('gal-free-next',{choiceId:'mode-mature',action:'伪造通过条件',requestId:'denied'});assert.equal(denied.ok,false);assert.equal(generations,generated);assert.equal((await call('gal-free-state')).world.revision,locked.world.revision)
  await call('gal-save',{slot:1});await call('gal-world-route-set',{worldId:id,roleId:'deepseek',route:'pure'});s=await call('gal-load',{slot:1});assert.equal(s.world.relationshipRoutes.deepseek,'fall');assert.equal(s.world.relationships.deepseek.nsfw,-6)
  await pause(100);const save=join(home,'storages/dsh-whale-galgame/global.json'),backup=save+'.test-backup';renameSync(save,backup);mkdirSync(save)
  await assert.rejects(()=>call('gal-world-route-set',{worldId:id,roleId:'deepseek',route:'pure'}),/regular file/);rmSync(save,{recursive:true});renameSync(backup,save)
  j=await call('gal-world-journal');assert.equal(j.routes.deepseek,'fall')
  call=boot(home);s=await call('gal-free-state');assert.equal(s.world.relationshipRoutes.deepseek,'fall');assert.equal(s.world.relationships.deepseek.nsfw,-6)
  const other=await call('gal-free-start',{roleId:'kimi',restart:true});assert.equal(other.world.relationships.kimi.nsfw,0);assert.equal(other.world.relationshipRoutes.kimi,undefined)
  const stale=await call('gal-world-route-set',{worldId:id,roleId:'deepseek',route:'pure'});assert.equal(stale.ok,false)
 }finally{setGalChatProvider(null);await pause(120);rmSync(home,{recursive:true,force:true})}
})
