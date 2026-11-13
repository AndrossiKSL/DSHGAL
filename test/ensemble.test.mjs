import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync,readFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {Readable} from 'node:stream'
import {apply,setGalChatProvider,WORLD_CAST,newWorldline,upgradeWorldline,ensureEnsemble,planEnsemble,normalizeDialogue,commitWorldStep,parseWorldStep} from '../dist/index.js'
const roles=WORLD_CAST.map(id=>({id,name:id,aliases:[id],post:'工坊岗位',home:'工坊',group:'共同工作',source:'builtin'}))
const step=(plan,overrides={})=>({narration:'大家把手边的东西放好。',dialogue:plan.present.map((id,i)=>({speaker:id,to:plan.present[(i+1)%plan.present.length],text:id+'说出自己的想法。',action:i%2?'thinking':'explain'})),action:'attentive',scene:{},facts:[],commitments:[],choices:[],allowedRoles:WORLD_CAST,ensembleRoles:roles,ensemblePlan:plan,...overrides})
const pause=ms=>new Promise(r=>setTimeout(r,ms))
test('default roster remains 22 while scenes rotate naturally with at most three participants',()=>{
 const w=upgradeWorldline(newWorldline('deepseek')),seen=new Set()
 for(let i=0;i<90;i++){
  w.interaction={kind:'normal'};const plan=planEnsemble(w,roles,'继续一起聊聊')
  // 曾经断言 >=2：旧逻辑每轮强行补满 3 人，这正是「接吻时有人进来聊典藏目录」的根源。
  // 现在允许只有一两个人，上限仍是 3。
  assert.ok(plan.present.length>=1&&plan.present.length<=3)
  for(const arrival of plan.arrivals)assert.ok(arrival.reason)
  commitWorldStep(w,step(plan),'继续一起聊聊','round-'+i);for(const id of w.ensemble.present)seen.add(id)
 }
 assert.equal(Object.keys(w.ensemble.members).length,22);assert.equal(seen.size,22)
 assert.ok(Object.values(w.ensemble.members).every(m=>m.memory.length<=20));assert.ok(Object.keys(w.ensemble.links).length>0)
 const before=JSON.stringify(w.ensemble);ensureEnsemble(w,roles);assert.equal(JSON.stringify(w.ensemble),before,'read-only roster view must not rotate cast')
})
test('explicit invitation and addressed replies respect presence; mentions do not teleport people',()=>{
 const w=upgradeWorldline(newWorldline('deepseek'));const opening=planEnsemble(w,roles,'');commitWorldStep(w,step(opening),'','open')
 w.revision=2;w.interaction={kind:'normal'}
 // 有地图以后「不在场」要看地点：不在玩家当前位置的人才算真的不在场。
 // 只是口头提到她，不该把人凭空搬过来。
 // 第一轮大家还在原地挑目的地，之后才真正动身——多推几轮再找不在场的人。
 let node=planEnsemble(w,roles,'').node,absent=roles.find(r=>w.ensemble.members[r.id]?.location!==node)
 for(let i=0;i<6&&!absent;i++){node=planEnsemble(w,roles,'').node;absent=roles.find(r=>w.ensemble.members[r.id]?.location!==node)}
 assert.ok(absent,'至少要有一个人不在同一地点')
 const mentioned=planEnsemble(w,roles,'昨天听说过'+absent.name);assert.ok(!mentioned.present.includes(absent.id))
 const invited=planEnsemble(w,roles,'请她过来',{inviteRoleId:absent.id})
 if(invited.present.includes(absent.id)){assert.equal(invited.focus,absent.id);assert.ok(invited.arrivals.some(r=>r.role===absent.id))}
 else assert.ok(invited.blocked,'叫不到人时必须说明还要几轮，不能静默失败')
 commitWorldStep(w,step(invited),'请她过来','invite');const addressed=w.ensemble.present[1]
 const reply=planEnsemble(w,roles,'你有什么想法',{targetRoleId:addressed});assert.equal(reply.focus,addressed)
 w.interaction={kind:'free'};assert.deepEqual(planEnsemble(w,roles,'想私下聊聊',{targetRoleId:addressed}).present,[addressed]);w.interaction={kind:'mature',roleId:addressed};const privatePlan=planEnsemble(w,roles,'谈谈彼此的边界');assert.deepEqual(privatePlan.present,[addressed]);assert.equal(privatePlan.arrivals.length,0)
})
test('multi-speaker parser rejects phantom voices and preserves ordered dialogue and heard memories',()=>{
 const w=upgradeWorldline(newWorldline('deepseek')),plan=planEnsemble(w,roles,'')
 const outsider=roles.find(r=>!plan.present.includes(r.id)).id
 const raw=JSON.stringify({dialogue:[{speaker:plan.present[0],text:'只在这间屋子里说的秘密。',action:'explain'},{speaker:plan.present[1],text:'我听到了。',action:'thinking'}],narration:'她们围着桌子坐下。'})
 const parsed=parseWorldStep(raw,[]);assert.equal(parsed.dialogue.length,2)
 const forged=normalizeDialogue([{speaker:outsider,text:'伪造的插话'},{speaker:plan.present[0],text:'合法台词',to:'unknown',action:'javascript'}],{speaker:plan.focus,cast:plan.present.map(role=>({role,action:'attentive'}))},'');assert.equal(forged.length,1);assert.equal(forged[0].to,'all');assert.equal(forged[0].action,'attentive')
 commitWorldStep(w,step(plan,{...parsed}),'','secrets')
 assert.equal(w.turns.filter(r=>r.speaker!=='旁白').length,2);assert.ok(w.turns.every(r=>!r.heardBy.includes(outsider)))
 assert.equal(w.ensemble.members[outsider].memory.length,0)
 const invitation=planEnsemble(w,roles,'请你过来',{inviteRoleId:outsider});commitWorldStep(w,step(invitation),'请你过来','later')
 assert.ok(!w.ensemble.members[outsider].memory.some(r=>r.text.includes('秘密')))
 const before=w.turns.length;commitWorldStep(w,step(invitation),'请你过来','later');assert.equal(w.turns.length,before,'retry must not duplicate a multi-line round')
})
function boot(home){let route;apply({dshHomePath:(...p)=>join(home,...p),effect:fn=>fn(),on(){},inject(){},webServer:{register:r=>{if(r.path==='/whale-galgame-api')route=r}}},{enabled:true,imageBackend:'off'},{});return async(action,args={})=>{let code,body;const req=Readable.from([Buffer.from(JSON.stringify({action,args}))]);req.method='POST';await route.handler(req,{writeHead(n){code=n},end(v){body=v}});const result=JSON.parse(body);if(code!==200)throw new Error(result.error);return result}}
test('host runs multi-voice worlds with target validation, 22-person invites, saves and independent memories',async()=>{
 const home=mkdtempSync(join(tmpdir(),'ensemble-'));let bad=false,calls=0
 setGalChatProvider(async({system,prompt})=>{calls++;if(system.includes('维护剧情摘要'))return '几位同伴各自回应，并一起安排下一步。';const plan=JSON.parse(system.match(/本幕群像调度：([^\n]+)/)[1]);const ids=[plan.focus,...plan.present.filter(id=>id!==plan.focus)];return JSON.stringify({narration:'她们在工坊里交换各自的想法。',dialogue:bad?[{speaker:'unknown',text:'错误台词'}]:ids.map((speaker,i)=>({speaker,to:ids[(i+1)%ids.length],text:speaker+'：这是我自己的回应。',action:i%2?'thinking':'joy'})),scene:{location:'深海女仆工坊'},choices:[{kind:'normal',label:'继续听大家说',action:'认真听每一位同伴的想法。'}]})})
 try{
  let call=boot(home),s=await call('gal-free-start',{roleId:'deepseek'});assert.ok(s.dialogue.length>=1&&s.dialogue.length<=3);assert.equal(new Set(s.dialogue.map(r=>r.speaker)).size,s.dialogue.length);assert.equal(s.scenario.availableRoles.length,22)
  assert.ok(s.ensemble.arrivals.length>=0&&s.ensemble.arrivals.length<=2);assert.ok(s.scenario.poseUrls[s.dialogue[0].speaker][s.dialogue[0].action])
  let roster=await call('gal-ensemble-state');assert.equal(roster.roles.length,22)
  // 有地图以后「叫得过来」要看距离：只有同一地点、不在场上的人才可能当轮到场。
  const outsider=(roster.roles.find(r=>!roster.present.includes(r.id)&&r.location===roster.presentLocation)||roster.roles.find(r=>!roster.present.includes(r.id))).id
  const beforeCalls=calls,revision=s.world.revision;const invalid=await call('gal-free-next',{action:'向缺席者说话',targetRoleId:outsider});assert.equal(invalid.ok,false);assert.equal(calls,beforeCalls)
  s=await call('gal-free-next',{action:'请她加入',inviteRoleId:outsider,targetRoleId:outsider,requestId:'invite'});if(s.ensemble.present.includes(outsider)){assert.equal(s.ensemble.focus,outsider);assert.equal(s.world.revision,revision+1)}
  else assert.ok(s.ensemble.blocked||s.ensemble.reasons,'叫不到人时必须说明原因')
  const args={action:'我想听你的看法',targetRoleId:outsider,requestId:'addressed',revision:s.world.revision};s=await call('gal-free-next',args)
  if(s.ensemble.present.includes(outsider))assert.equal(s.dialogue[0].speaker,outsider)
  const duplicate=await call('gal-free-next',args);assert.equal(duplicate.duplicate,true)
  const saved=JSON.parse(readFileSync(join(home,'storages/dsh-whale-galgame/global.json'),'utf8')).gal.freeStory;assert.equal(saved.turns.filter(r=>r.revision===s.world.revision&&r.speaker!=='player'&&r.speaker!=='旁白').length,s.dialogue.length)
  await call('gal-save',{slot:3});await call('gal-free-next',{action:'后来大家又聊了些事',requestId:'later'});s=await call('gal-load',{slot:3});assert.equal(s.world.revision,saved.revision);assert.ok(s.dialogue.length>=1&&s.dialogue.length<=3)
  const before=s.world.revision;bad=true;const failed=await call('gal-free-next',{action:'输出故障测试',requestId:'failed'});assert.equal(failed.ok,false);assert.equal(failed.retryable,true);assert.equal((await call('gal-free-state')).world.revision,before);bad=false
  await pause(100);call=boot(home);s=await call('gal-free-state');assert.ok(s.dialogue.length>=1&&s.dialogue.length<=3);assert.ok((await call('gal-ensemble-state')).present.includes(outsider))
  await call('gal-free-start',{roleId:'kimi',restart:true});const other=await call('gal-ensemble-state');assert.equal(other.roles.length,22);assert.ok(other.roles.every(r=>r.appearances<=1))
 }finally{setGalChatProvider(null);await pause(150);rmSync(home,{recursive:true,force:true})}
})
