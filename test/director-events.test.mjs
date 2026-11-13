import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync,mkdirSync,renameSync,readFileSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {Readable} from 'node:stream'
import {apply,setGalChatProvider,newWorldline,upgradeWorldline,commitWorldStep,normalizeDirection} from '../dist/index.js'
const wait=ms=>new Promise(r=>setTimeout(r,ms))
function boot(home){const routes=[];apply({dshHomePath:(...p)=>join(home,...p),effect:fn=>fn(),on(){},inject(){},webServer:{register(r){routes.push(r)}}},{enabled:true,imageBackend:'off'},{});return {routes,call:async(action,args={})=>{let body='',code;const req=Readable.from([Buffer.from(JSON.stringify({action,args}))]);req.method='POST';await routes.find(r=>r.path==='/whale-galgame-api').handler(req,{writeHead(c){code=c},end(v){body=v}});const data=JSON.parse(body);if(code!==200)throw new Error(data.error);return data}}}
const step=(overrides={})=>({line:'我会记得这件事。',narration:'她把书放下。',action:'attentive',scene:{},choices:[],facts:[],commitments:[],allowedRoles:['deepseek','kimi'],...overrides})
test('evidence rules reject unsupported awards, settle promises once and isolate worlds',()=>{
 const w=newWorldline('deepseek');commitWorldStep(w,step({relationships:[{kind:'considerate',evidence:'你好'}]}),'','')
 assert.equal(w.relationships.deepseek.affection,0,'opening cannot award points')
 commitWorldStep(w,step({relationships:[null,{roleId:'kimi',kind:'considerate',evidence:'你好'},{kind:'__proto__',evidence:'你好'},{kind:'considerate',evidence:'不存在'}],events:[null,{operation:'complete',id:'invented',evidence:'你好'}]}),'你好','bad')
 assert.equal(w.relationships.deepseek.affection,0);assert.equal(w.relationships.kimi,undefined)
 commitWorldStep(w,step({relationships:[{kind:'respected_boundary',evidence:'尊重你的决定',reason:'尊重她的决定'}],events:[{operation:'promise',title:'明天带旧地图',roleId:'deepseek',dueDay:2,evidence:'明天带旧地图'}]}),'我尊重你的决定，我会明天带旧地图','promise')
 assert.equal(w.relationships.deepseek.trust,3);assert.equal(w.events.length,1)
 const id=w.events[0].id
 commitWorldStep(w,step({events:[{id,operation:'complete',evidence:'带来了旧地图'}],relationships:[{kind:'considerate',evidence:'带来了旧地图'}]}),'我带来了旧地图','complete')
 assert.equal(w.events[0].status,'completed');assert.equal(w.relationships.deepseek.trust,6);assert.equal(w.relationships.deepseek.affection,3,'no stacked award after fulfillment')
 const revision=w.revision
 commitWorldStep(w,step({events:[{id,operation:'complete',evidence:'带来了旧地图'}]}),'我带来了旧地图','complete')
 assert.equal(w.revision,revision,'pure commit also deduplicates request')
 commitWorldStep(w,step({events:[{id,operation:'complete',evidence:'带来了旧地图'}]}),'我带来了旧地图','again')
 assert.equal(w.relationships.deepseek.trust,6,'settled event cannot award again')
 const other=upgradeWorldline(newWorldline('deepseek'));assert.equal(other.relationships.deepseek.trust,0);assert.equal(other.events.length,0)
})
test('overdue remains pending resolution, cancelled events give no reward and cast is validated',()=>{
 const w=newWorldline('deepseek')
 commitWorldStep(w,step({events:[{operation:'promise',title:'今晚送书',dueDay:1,evidence:'今晚送书'}]}),'今晚送书','p')
 commitWorldStep(w,step({scene:{day:9999}}),'等到明天','day')
 assert.equal(w.scene.day,2);assert.equal(w.events[0].status,'overdue');assert.equal(w.relationships.deepseek.trust,0)
 commitWorldStep(w,step({events:[{operation:'cancel',id:w.events[0].id,evidence:'取消约定'}]}),'我们取消约定吧','cancel')
 assert.equal(w.events[0].status,'cancelled');assert.equal(w.relationships.deepseek.trust,0)
 const d=normalizeDirection({speaker:'unknown',cast:[null,{role:'unknown'},{role:'kimi',action:'invalid',x:999,scale:999},{role:'kimi'},{role:'deepseek',action:'joy'}],transition:'javascript'},'deepseek','attentive',['deepseek','kimi'])
 for(const cast of [{},'invalid',null])assert.equal(normalizeDirection({cast},'deepseek','attentive',['deepseek']).cast.length,1)
 assert.equal(d.cast.length,2);assert.equal(d.speaker,'deepseek');assert.equal(d.cast[0].action,'neutral');assert.equal(d.cast[0].x,85);assert.equal(d.cast[0].scale,1.2);assert.equal(d.transition,'fade')
})
test('failed promises have one bounded consequence and old saves gain empty ledgers',()=>{
 const w=upgradeWorldline({roleId:'deepseek',turns:[{speaker:'deepseek',text:'旧对白'}],facts:['旧事实'],commitments:['旧承诺']})
 assert.equal(w.turns[0].text,'旧对白');assert.equal(w.relationships.deepseek.trust,0);assert.deepEqual(w.events,[])
 w.relationships.deepseek={affection:10,trust:10,intimacy:2}
 commitWorldStep(w,step({events:[{operation:'promise',title:'一起看海',evidence:'一起看海'}]}),'答应一起看海','promise')
 const id=w.events[0].id
 commitWorldStep(w,step({events:[{operation:'fail',id,evidence:'我不去了'}]}),'我不去了','fail')
 assert.equal(w.events[0].status,'failed');assert.equal(w.relationships.deepseek.trust,7);assert.equal(w.relationships.deepseek.affection,8)
 commitWorldStep(w,step({events:[{operation:'fail',id,evidence:'我不去了'}]}),'我不去了','fail-again')
 assert.equal(w.relationships.deepseek.trust,7)
 commitWorldStep(w,step({events:[{operation:'promise',title:'送书',evidence:'送书'},{operation:'promise',title:'带茶',evidence:'带茶'}]}),'送书和带茶','two-promises')
 const pending=w.events.filter(e=>e.status==='pending')
 commitWorldStep(w,step({events:pending.map(e=>({operation:'complete',id:e.id,evidence:'送书和带茶'}))}),'送书和带茶都完成了','two-done')
 assert.equal(w.relationships.deepseek.trust,10,'multiple event results remain bounded to one award per role and turn')
 assert.equal(w.settlement.changes.length,1);assert.equal(w.settlement.events.length,2)
})
test('host saves atomic relationships, retries, branches, legacy appearance and adopted action precedence',async()=>{
 const home=mkdtempSync(join(tmpdir(),'director-host-'));let fail=false
 setGalChatProvider(async({system,prompt})=>{
  if(system.includes('维护剧情摘要'))return '两人约好带地图。'
  if(fail)throw new Error('临时离线')
  const action=prompt.match(/玩家刚刚(?:说)?：(.*)/)?.[1]||''
  const events=JSON.parse(system.match(/约定状态（引用已有 id 结算）：([^\n]+)/)?.[1]||'[]')
  return JSON.stringify(step({direction:{speaker:'kimi',cast:[{role:'deepseek',action:'attentive'},{role:'kimi',action:'joy'}]},
    relationships:action?[{roleId:'kimi',kind:'considerate',evidence:action,reason:'照顾同行的人'}]:[],
    events:action==='约好带地图'?[{operation:'promise',title:'带地图',roleId:'kimi',evidence:action}]:action==='我带来了地图'?[{operation:'complete',roleId:'kimi',id:events[0]?.id,evidence:action}]:[]}))
 })
 try{
  let {call,routes}=boot(home),s=await call('gal-free-start')
  assert.equal(s.node.speaker,'kimi');assert.equal(s.scenario.stage.cast.length,2);assert.ok(s.scenario.spriteUrls.kimi.endsWith('/kimi/joy.webp'));assert.ok(s.scenario.uiSkin.frame.endsWith('/kimi/frame.png'))
  assert.equal(s.scenario.stage.cast[0].pivot[1],1500)
  await Promise.all([call('gal-free-next',{action:'约好带地图',requestId:'promise'}),call('gal-free-next',{action:'约好带地图',requestId:'promise'})])
  let j=await call('gal-world-journal');assert.equal(j.relationships.kimi.affection,2);assert.equal(j.events.length,1)
  assert.equal((await call('gal-save',{slot:2})).free,true,'saving stays in the world reading screen');s=await call('gal-free-next',{action:'我带来了地图',requestId:'done'});const branch=s.world.branchId
  assert.equal(s.world.relationships.kimi.trust,4);assert.equal(s.world.events[0].status,'completed')
  const before=await call('gal-world-journal');fail=true
  assert.equal((await call('gal-free-next',{action:'再试试',requestId:'offline'})).ok,false);assert.deepEqual(await call('gal-world-journal'),before);fail=false
  ;({call,routes}=boot(home));assert.deepEqual(await call('gal-world-journal'),before)
  await call('gal-load',{slot:2});j=await call('gal-world-journal');assert.equal(j.events[0].status,'pending')
  s=await call('gal-free-next',{action:'我带来了地图',requestId:'other-done'});assert.notEqual(s.world.branchId,branch);assert.equal(s.world.relationships.kimi.trust,4)
  const world=s.world.worldId;await call('gal-free-start',{roleId:'deepseek',restart:true});assert.equal((await call('gal-world-journal')).events.length,0)
  await call('gal-world-select',{worldId:world});assert.equal((await call('gal-world-journal')).events[0].status,'completed')
  await call('sprite-set-builtin',{characterId:'deepseek',variant:'legacy-a'})
  assert.equal((await call('gal-free-state')).scenario.spriteUrls.deepseek,'','legacy appearance does not mix with a new identity pose')
  await call('sprite-set-builtin',{characterId:'deepseek',variant:'A'})
  const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN1kAAAAASUVORK5CYII='
  const imported=await call('asset-import',{characterId:'kimi',kind:'sprite',action:'joy',dataUrl:png});await call('asset-apply',{id:imported.id});assert.equal((await call('gal-free-state')).scenario.spriteUrls.kimi,png)
  const route=routes.find(r=>r.path==='/whale-galgame-media')
  assert.ok('/whale-galgame-media/actions/kimi/joy.webp'.startsWith(route.path+'/'),'matches DSH segment-prefix routing')
  for(const [url,expected] of [['/whale-galgame-media/actions/kimi/joy.webp',200],['/whale-galgame-media/..%2f..%2fcordis.patch.yml',404],['/whale-galgame-media/%zz',404]]){let code,bytes;await route.handler({method:'GET',url},{writeHead(n){code=n},end(v){bytes=v}});assert.equal(code,expected);if(expected===200)assert.ok(bytes.length>1000)}
  // Force an actual write failure after generation; no half-settled state can survive in memory.
  const save=join(home,'storages/dsh-whale-galgame/global.json');renameSync(save,save+'.bak');mkdirSync(save)
  const prior=await call('gal-world-journal');await assert.rejects(call('gal-free-next',{action:'写盘失败',requestId:'disk'}));assert.deepEqual(await call('gal-world-journal'),prior)
 }finally{setGalChatProvider(null);await wait(100);rmSync(home,{recursive:true,force:true})}
})
