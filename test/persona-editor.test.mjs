import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {Readable} from 'node:stream'
import {apply,setGalChatProvider,parsePersonaImport,exportPersonaCard,roleplaySceneContext,workPersona,personaDefaults,personalizeStory} from '../dist/index.js'
function boot(home){let route;apply({dshHomePath:(...p)=>join(home,...p),effect:f=>f(),on(){},inject(){},webServer:{register:r=>{if(r.path==='/whale-galgame-api')route=r}}},{enabled:true,imageBackend:'off',standalonePort:0},{});return async(action,args={})=>{let text='',status;const req=Readable.from([Buffer.from(JSON.stringify({action,args}))]);req.method='POST';await route.handler(req,{writeHead:c=>status=c,end:v=>text=v});assert.equal(status,200);return JSON.parse(text)}}
const close=async home=>{setGalChatProvider(null);await new Promise(r=>setTimeout(r,100));rmSync(home,{recursive:true,force:true})}
test('multiline role edits and global presets survive restart without changing another role or game progress',async()=>{
 const home=mkdtempSync(join(tmpdir(),'persona-editor-'));try{
  let api=boot(home);const before=await api('gal-world-list'),other=await api('profile-get',{characterId:'grok'}),original=await api('profile-get',{characterId:'kimi'})
  const saved=await api('profile-set',{characterId:'kimi',expectedProfile:original.effective,overrides:{persona:'测试人格第一行\n第二行',background:'背景段落\n\n新的段落',rules:'角色约定',workRules:'先验收再汇报',examples:'{{user}}：你好\n{{char}}：坐这边。'}});assert.equal(saved.effective.background,'背景段落\n\n新的段落')
  let config=(await api('persona-settings-get')).settings
  config=(await api('persona-settings-set',{expectedRevision:config.revision,global:{shared:'共用要求',story:'日常要求',work:'工程要求',enabled:true}})).settings
  const preset=(await api('persona-preset-save',{expectedRevision:config.revision,preset:{kind:'character',name:'月见测试预设',characterId:'kimi',profile:saved.effective}})).settings.presets[0]
  api=boot(home);assert.equal((await api('profile-get',{characterId:'kimi'})).effective.persona,saved.effective.persona);assert.deepEqual((await api('persona-settings-get')).settings.presets[0],preset);assert.equal((await api('persona-settings-get')).settings.global.story,'日常要求');assert.deepEqual((await api('profile-get',{characterId:'grok'})).overrides,other.overrides);assert.deepEqual(await api('gal-world-list'),before)
  assert.equal((await api('profile-set',{characterId:'kimi',expectedProfile:original.effective,overrides:{persona:'过期内容'}})).conflict,true)
  await api('profile-reset',{characterId:'kimi'});assert.equal((await api('profile-get',{characterId:'kimi'})).effective.rules,'');assert.equal((await api('persona-settings-get')).settings.presets.length,1)
 }finally{await close(home)}
})
test('preset revisions reject lost updates, named copies stay independent and delete leaves active rules alone',async()=>{
 const home=mkdtempSync(join(tmpdir(),'persona-presets-'));try{
  const api=boot(home),first=(await api('persona-settings-get')).settings
  const saved=await api('persona-settings-set',{expectedRevision:first.revision,global:{shared:'保留的全局规则'}})
  assert.equal((await api('persona-settings-set',{expectedRevision:first.revision,global:{shared:'过期覆盖'}})).conflict,true)
  const library=await api('persona-preset-save',{expectedRevision:saved.settings.revision,preset:{kind:'global',name:'备用',global:{shared:'另一套规则'}}}),id=library.settings.presets[0].id
  assert.equal(library.settings.global.shared,'保留的全局规则');await api('persona-preset-delete',{id,expectedRevision:library.settings.revision});assert.equal((await api('persona-settings-get')).settings.global.shared,'保留的全局规则');assert.equal((await api('persona-preset-save',{preset:{kind:'global',name:'',global:{}}})).ok,false)
 }finally{await close(home)}
})
test('draft voice preview reads unsaved role and global rules but never persists them or advances a world',async()=>{
 const home=mkdtempSync(join(tmpdir(),'persona-preview-')),calls=[];setGalChatProvider(async r=>{calls.push(r);return '坐吧，这里还有一点茶。'})
 try{const api=boot(home),before=await api('gal-world-list'),old=await api('profile-get',{characterId:'kimi'});await api('profile-preview',{characterId:'kimi',line:'陪我坐坐？',profile:{...old.effective,persona:'尚未保存的人格',examples:'示例只供参考'},global:{enabled:true,story:'尚未保存的全局规则'}});assert.equal(calls.length,1);assert.match(calls[0].system,/尚未保存的人格/);assert.match(calls[0].system,/尚未保存的全局规则/);assert.deepEqual((await api('profile-get',{characterId:'kimi'})).overrides,old.overrides);assert.equal((await api('persona-settings-get')).settings.global.story,'');assert.deepEqual(await api('gal-world-list'),before);await api('profile-set',{characterId:'kimi',overrides:{persona:'应被草稿清空的旧人格'}});await api('profile-preview',{characterId:'kimi',line:'你好',profile:{...old.effective,persona:''}});assert.doesNotMatch(calls.at(-1).system,/应被草稿清空的旧人格/);assert.match(calls.at(-1).system,/安静而有主见/);assert.equal((await api('profile-get',{characterId:'kimi'})).effective.persona,'应被草稿清空的旧人格')}finally{await close(home)}
})
test('mode rules reach director, distinct role models and worker voices without leaking story-only examples into work',async()=>{
 const profile={displayName:'月见',address:'你',...personaDefaults('kimi'),background:'人物背景',scenario:'仅限日常情境',examples:'仅限对白示例',rules:'角色共用',workRules:'角色工程'},settings={global:{enabled:true,shared:'全局共用',story:'全局日常',work:'全局工程'}}
 const scene=roleplaySceneContext(['kimi'],()=>profile,{},settings),work=workPersona('kimi',profile,settings)
 for(const word of ['人物背景','仅限日常情境','仅限对白示例','角色共用','全局共用','全局日常'])assert.ok(scene.includes(word),word)
 assert.doesNotMatch(scene,/全局工程|角色工程/);for(const word of ['全局共用','全局工程','角色共用','角色工程'])assert.ok(work.includes(word));assert.doesNotMatch(work,/仅限对白示例|仅限日常情境|全局日常/)
 assert.doesNotMatch(roleplaySceneContext(['kimi'],()=>profile,{}, {global:{...settings.global,enabled:false}}),/全局日常/)
 let system;await personalizeStory({dialogue:[{speaker:'kimi',text:'你好',action:'neutral'}]},{director:{provider:'p',model:'a'},bindings:{kimi:{configured:true,route:{provider:'p',model:'b'},limits:{maxOutputTokens:500}}}},{profile:()=>profile,context:()=>'',actions:['neutral'],personaSettings:settings,call:async(_,r)=>{system=r.system;return JSON.stringify({lines:[{lineIndex:0,text:'坐吧',action:'neutral'}]})}});assert.match(system,/全局日常/);assert.match(system,/角色共用/)
})
test('ST JSON/text imports are reviewable data, keep multiline fields, round-trip blanks and reject unsupported files',()=>{
 const parsed=parsePersonaImport(JSON.stringify({spec:'chara_card_v2',data:{name:'测试角色',description:'第一段\n\n第二段',personality:'自己的主张',scenario:'下雨的工坊',first_mes:'你来了。',mes_example:'{{char}}：坐吧。',system_prompt:'说短句',post_history_instructions:'回应眼前话题',character_book:{entries:[]},extensions:{script:'NOT_EXECUTED'}}}))
 assert.equal(parsed.profile.background,'第一段\n\n第二段');assert.equal(parsed.profile.rules,'说短句\n\n回应眼前话题');assert.equal(parsed.warnings.length,1);assert.equal(parsed.profile.script,undefined)
 const card=exportPersonaCard({...parsed.profile,workRules:'校验文件',background:''},'kimi'),again=parsePersonaImport(JSON.stringify(card));assert.equal(again.profile.background,'');assert.equal(again.profile.workRules,'校验文件');assert.equal(parsePersonaImport('# 文本\n背景设定').profile.background,'# 文本\n背景设定');assert.throws(()=>parsePersonaImport('{broken'),/JSON/);assert.throws(()=>parsePersonaImport('{"unrelated":true}'),/字段/)
})

test('custom first message is supplied on a new opening and does not repeat as an instruction on later turns',async()=>{
 const home=mkdtempSync(join(tmpdir(),'persona-opening-')),requests=[];setGalChatProvider(async r=>{requests.push(r);const plan=JSON.parse(r.system.match(/本幕群像调度：([^\n]+)/)[1]);return JSON.stringify({narration:'茶杯旁留了一张椅子。',dialogue:plan.present.map(id=>({speaker:id,text:'坐这边吧。',action:'attentive'})),choices:[]})})
 try{const api=boot(home);await api('profile-set',{characterId:'deepseek',overrides:{greeting:'测试用的特别开场白'}});const opening=await api('gal-free-start',{roleId:'deepseek'});assert.equal(opening.ok,true);assert.match(requests[0].system,/测试用的特别开场白/);assert.match(requests[0].system,/本次是这条世界线的第一幕/);assert.match(requests[0].system,/本世界线的开局/);await api('gal-free-next',{action:'坐下来喝茶。'});assert.doesNotMatch(requests.at(-1).system,/第一幕/)}finally{await close(home)}
})
