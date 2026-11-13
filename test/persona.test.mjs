import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {Readable} from 'node:stream'
import {PERSONA_CARDS,WORLD_CAST,personaDefaults,characterGuidance,roleplaySceneContext,workPersona,apply,setGalChatProvider} from '../dist/index.js'

const profile=id=>({displayName:id,address:'你',...personaDefaults(id)})
test('22 existing roles retain differentiated motives, voice and everyday lives',()=>{
 assert.deepEqual(Object.keys(PERSONA_CARDS).sort(),[...WORLD_CAST].sort())
 assert.equal(new Set(Object.values(PERSONA_CARDS).map(c=>c.core)).size,22)
 for(const card of Object.values(PERSONA_CARDS)){assert.ok(card.want&&card.defense&&card.care&&card.workVoice);assert.equal(card.dailyLife.length,3);assert.ok(card.samples.length>=2)}
 assert.match(PERSONA_CARDS.mimo.source,/export-minor-card-not-imported/)
 assert.match(PERSONA_CARDS.comfyui.source,/not-present-in-export/)
})
test('custom personality wins and default samples do not overwrite it',()=>{
 const custom={...profile('kimi'),persona:'自定义：爽朗的旅行者',tone:'只用直白短句'}
 const note=characterGuidance('kimi',custom,{present:['kimi','glm']})
 assert.equal(note.personality,custom.persona);assert.equal(note.voice,custom.tone);assert.equal(note.cadenceExamples,undefined);assert.equal(note.withCompanions,undefined)
 assert.match(workPersona('kimi',custom),/爽朗的旅行者/)
})
test('scene persona context is scoped to the present cast and independently respects trust and closeness',()=>{
 const note=characterGuidance('kimi',profile('kimi'),{present:['kimi','grok'],relationships:{kimi:{affection:220,trust:-30,intimacy:160}}})
 assert.match(note.currentDistance.affection,/更主动/);assert.match(note.currentDistance.trust,/信任尚需修复/);assert.match(note.currentDistance.closeness,/舒服的沉默/)
 assert.deepEqual(note.withCompanions,[])
 const scene=roleplaySceneContext(['kimi','grok'],profile)
 assert.ok(scene.includes('本幕在场的人'));assert.ok(scene.includes('不用“我一直记得”'));assert.equal((scene.match(/^【/gm)||[]).length,2)
})

function boot(home){let route;apply({dshHomePath:(...p)=>join(home,...p),effect:f=>f(),on(){},inject(){},webServer:{register:r=>{if(r.path==='/whale-galgame-api')route=r}}},{enabled:true,imageBackend:'off'},{});return async(action,args={})=>{let body='',status;const req=Readable.from([Buffer.from(JSON.stringify({action,args}))]);req.method='POST';await route.handler(req,{writeHead:c=>status=c,end:v=>body=v});assert.equal(status,200);return JSON.parse(body)}}
test('host preview uses the effective persona without creating or advancing a game world',async()=>{
 const home=mkdtempSync(join(tmpdir(),'persona-host-')),requests=[];setGalChatProvider(async r=>{requests.push(r);return '今天就先坐一会儿。茶还温着。'})
 try{const call=boot(home),before=await call('gal-world-list');await call('profile-set',{characterId:'kimi',overrides:{persona:'自定义：很爱笑的旅人',tone:'自然短句',address:'朋友'}});const reply=await call('profile-preview',{characterId:'kimi',line:'今天能不能陪我坐一会儿？'});assert.equal(reply.preview,true);assert.match(reply.text,/坐一会儿/);assert.match(requests[0].system,/很爱笑的旅人/);assert.match(requests[0].system,/不使用玩家存档/);assert.doesNotMatch(requests[0].system,/这件事我这儿没有记清/);assert.deepEqual(await call('gal-world-list'),before);assert.equal((await call('profile-preview',{characterId:'unknown',line:'hello'})).ok,false);assert.equal((await call('profile-preview',{characterId:'kimi',line:'x'.repeat(241)})).ok,false);assert.equal(requests.length,1)}finally{setGalChatProvider(null);await new Promise(r=>setTimeout(r,100));rmSync(home,{recursive:true,force:true})}
})
test('uniform-model story director receives active role personalities and natural dialogue rules',async()=>{
 const home=mkdtempSync(join(tmpdir(),'persona-scene-')),requests=[];setGalChatProvider(async r=>{requests.push(r);const plan=JSON.parse(r.system.match(/本幕群像调度：([^\n]+)/)[1]);return JSON.stringify({narration:'灯下，几个人放下手边的东西。',dialogue:plan.present.map(id=>({speaker:id,text:'坐这边，茶还温着。',action:'attentive'})),choices:[]})})
 try{const call=boot(home),reply=await call('gal-free-start',{roleId:'deepseek'});assert.equal(reply.ok,true);assert.equal(requests.length,1);assert.match(requests[0].system,/本幕在场的人/);assert.match(requests[0].system,/不把人物压成统一的娇羞模板/);assert.match(requests[0].system,/她本人说过的话/);const _plan=JSON.parse(requests[0].system.match(/本幕群像调度：([^\n]+)/)[1]);assert.equal((requests[0].system.match(/^【/gm)||[]).length,_plan.present.length*2,'每个在场角色各出一次档案块和一次语感块')}finally{setGalChatProvider(null);await new Promise(r=>setTimeout(r,100));rmSync(home,{recursive:true,force:true})}
})

// 语感样本必须真的进 prompt。之前 cadenceExamples 只作为 JSON 字段存在，
// 模型从不当范本用，22 个人说话节奏一致、全是「主谓宾+转折+主张」的完整长句。
test('every role ships its own voice samples as a few-shot block, not buried in JSON',async()=>{
 const {voiceSamples}=await import('../dist/index.js')
 const s=voiceSamples('deepseek',profile('deepseek'))
 assert.match(s,/她本人说过的话/)
 assert.match(s,/累倒还好/)
 assert.doesNotMatch(s,/\{|\}/)
 // 自定义人格的角色不该被默认样本覆盖
 assert.equal(voiceSamples('deepseek',{...profile('deepseek'),persona:'我自己写的性格'}),'')
 // 短句与不评述这两条是最容易被改回去的，锁住
 const {ROLEPLAY_STYLE}=await import('../dist/index.js')
 assert.match(ROLEPLAY_STYLE,/写正在发生的事，不评述/)
 assert.match(ROLEPLAY_STYLE,/8 到 30 字/)
 assert.match(ROLEPLAY_STYLE,/不要停下来讲道理/)
 assert.match(ROLEPLAY_STYLE,/正文里不要出现“玩家”这两个字/)
 // 演出原则里绝不能出现闸门词：上一版写了「不满、边界、为难都用行为表达」
 // 和「亲密戏也保留…边界」，结果模型每轮都在刹车。这两条是 NSFW 推不动的元凶。
 for(const gate of ['用行为表达边界','后退半步、沉默两秒、换个话题','选择和边界'])
  assert.ok(!ROLEPLAY_STYLE.includes(gate),'演出原则里还有闸门词：'+gate)
})
