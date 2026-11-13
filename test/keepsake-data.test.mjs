import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {stripTypeScriptTypes} from 'node:module'
const text=readFileSync(new URL('../src/client/keepsake-data.ts',import.meta.url),'utf8')
const data=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(text)).toString('base64'))
test('keepsakes contain only actual records for the selected character',()=>{
 const world={events:[{id:'a',roleId:'deepseek',title:'旧地图',status:'completed',evidence:'已带来地图'},{id:'b',roleId:'claude',title:'别人的约定'}],journal:[{revision:3,changes:[{roleId:'deepseek',reason:'共同整理',evidence:'把书架整理好了',ranks:[{key:'trust',from:{level:1},to:{level:2,title:'相知'}}]},{roleId:'claude',reason:'另一段经历'}]}]}
 const rows=data.memoryEntries(world,'deepseek');assert.equal(rows.length,3);assert.ok(rows.every(r=>!r.title.includes('别人的')&&!r.title.includes('另一段')));assert.equal(rows[0].revision,3);assert.ok(rows.some(r=>r.kind==='milestone'&&r.title==='相知 · Lv.2'))
})
test('an initial relationship does not manufacture a meeting or milestone',()=>{
 assert.deepEqual(data.memoryEntries({relationships:{deepseek:{stage:'初识'}},events:[],journal:[]},'deepseek'),[])
 const rows=data.memoryEntries({journal:[{revision:1,changes:[{roleId:'deepseek',reason:'倾听',ranks:[{key:'trust',from:{level:1},to:{level:1,title:'试探'}},{key:'trust',to:{level:2,title:'旧格式'}}]}]}]},'deepseek');assert.equal(rows.filter(r=>r.kind==='milestone').length,0)
})
test('illustration ownership prioritizes explicit metadata over a matching key',()=>{
 assert.equal(data.belongsToCharacter({roleId:'claude',key:'cg-deepseek-evening'},'deepseek'),false)
 assert.equal(data.belongsToCharacter({key:'cg-deepseek-evening'},'deepseek'),true)
 assert.equal(data.belongsToCharacter({route:'route-gemini'},'gemini'),true)
 assert.equal(data.belongsToCharacter({key:'cg-gemini-other'},'deepseek'),false)
})
test('local save annotations expire when a slot is replaced',()=>{
 const values=new Map();globalThis.localStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)}
 data.writeSaveAnnotation({slot:2,savedAt:100},'窗边的约定','真实对白');assert.equal(data.readSaveAnnotation({slot:2,savedAt:100}).label,'窗边的约定');assert.equal(data.readSaveAnnotation({slot:2,savedAt:200}),null);assert.equal(data.readSaveAnnotation(undefined),null)
})
test('unavailable local storage does not interrupt saving or previews',()=>{
 globalThis.localStorage={getItem(){throw Error('unavailable')},setItem(){throw Error('unavailable')}};assert.doesNotThrow(()=>data.writeSaveAnnotation({slot:1,savedAt:1},'备注','对白'));assert.equal(data.readSaveAnnotation({slot:1,savedAt:1}),null)
})
