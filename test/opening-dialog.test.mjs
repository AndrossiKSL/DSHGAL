import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {Readable} from 'node:stream'
import {RANDOM_OPENINGS,NSFW_OPENINGS,openingPool,pickOpening,openingById,apply,setGalChatProvider,worldOpening,newWorldline} from '../dist/index.js'

function boot(home){let route;apply({dshHomePath:(...p)=>join(home,...p),effect:f=>f(),on(){},inject(){},webServer:{register:r=>{if(r.path==='/whale-galgame-api')route=r}}},{enabled:true,imageBackend:'off'},{});return async(action,args={})=>{let body='',status;const req=Readable.from([Buffer.from(JSON.stringify({action,args}))]);req.method='POST';await route.handler(req,{writeHead:c=>status=c,end:v=>body=v});assert.equal(status,200);return JSON.parse(body)}}
const close=home=>new Promise(r=>setTimeout(()=>{rmSync(home,{recursive:true,force:true});r()},120))

test('opening presets are complete multi-line premises, not one-liners',()=>{
 assert.ok(RANDOM_OPENINGS.length>=8,RANDOM_OPENINGS.length)
 assert.ok(NSFW_OPENINGS.length>=4,NSFW_OPENINGS.length)
 const ids=new Set([...RANDOM_OPENINGS,...NSFW_OPENINGS].map(p=>p.id))
 assert.equal(ids.size,RANDOM_OPENINGS.length+NSFW_OPENINGS.length,'id 必须唯一')
 for(const p of [...RANDOM_OPENINGS,...NSFW_OPENINGS]){
  assert.ok(p.id&&p.label&&p.text,p.id)
  // 开局要撑得住第一屏：至少三行，且写到「你是谁/在哪儿」
  assert.ok(p.text.split('\n').length>=3,p.id+' 行数不足')
  assert.ok(p.text.length>=60,p.id+' 太短')
 }
})

test('pickOpening never repeats the id just used and always stays in its own pool',()=>{
 const first=pickOpening('random',[])
 assert.ok(RANDOM_OPENINGS.some(p=>p.id===first.id))
 for(let i=0;i<40;i++){
  const next=pickOpening('random',[first.id],()=>Math.random())
  assert.notEqual(next.id,first.id,'连点随机不该拿到同一条')
 }
 const nsfw=pickOpening('nsfw',[])
 assert.ok(NSFW_OPENINGS.some(p=>p.id===nsfw.id),'nsfw 模式不能串到常规池')
 // 全池都避让时退回全池，不能返回 undefined
 const allIds=RANDOM_OPENINGS.map(p=>p.id)
 assert.ok(pickOpening('random',allIds).id)
 assert.equal(openingPool('nsfw'),NSFW_OPENINGS)
 assert.equal(openingById(first.id)?.id,first.id)
})

test('suggest action hands back a usable premise and honours avoid',async()=>{
 const home=mkdtempSync(join(tmpdir(),'opening-api-'))
 try{
  const api=boot(home)
  const a=await api('gal-opening-suggest',{mode:'random'})
  assert.equal(a.ok,true);assert.ok(a.text.length>=60);assert.ok(a.label)
  assert.equal(a.total,RANDOM_OPENINGS.length)
  const b=await api('gal-opening-suggest',{mode:'random',avoid:[a.id]})
  assert.notEqual(b.id,a.id)
  const c=await api('gal-opening-suggest',{mode:'nsfw'})
  assert.ok(NSFW_OPENINGS.some(p=>p.id===c.id))
  const list=await api('gal-opening-list',{mode:'nsfw'})
  assert.equal(list.openings.length,NSFW_OPENINGS.length)
  // 未知 mode 一律落回普通池，不报错
  const d=await api('gal-opening-suggest',{mode:'whatever'})
  assert.ok(RANDOM_OPENINGS.some(p=>p.id===d.id))
 }finally{await close(home)}
})

test('a typed opening becomes the world premise and reaches the model',async()=>{
 const home=mkdtempSync(join(tmpdir(),'opening-start-')),requests=[]
 setGalChatProvider(async r=>{requests.push(r);const plan=JSON.parse(r.system.match(/本幕群像调度：([^\n]+)/)[1]);return JSON.stringify({narration:'灯还亮着。',dialogue:plan.present.map(id=>({speaker:id,text:'进来吧。',action:'attentive'})),choices:[]})})
 try{
  const api=boot(home)
  const mine='第 3 日，雪停了。你带着一张旧地图来找她，地图上标着工坊原来的位置。你们三个月前见过一次。'
  const started=await api('gal-free-start',{roleId:'deepseek',premise:mine,restart:true})
  assert.equal(started.ok,true)
  // 玩家写的内容必须原样进 prompt，且被标成已成事实
  assert.ok(requests[0].system.includes(mine),'自定义开局没进 prompt')
  assert.ok(requests[0].system.includes('本世界线的开局（已成事实'),'开局没被标成已成事实')
  // 第一屏的旁白要以开局打头，玩家才知道自己在哪儿
  assert.ok(String(started.narration).includes('第 3 日，雪停了'))
 }finally{setGalChatProvider(null);await close(home)}
})

test('leaving the box empty falls back to the built-in opening instead of nothing',async()=>{
 const home=mkdtempSync(join(tmpdir(),'opening-empty-')),requests=[]
 setGalChatProvider(async r=>{requests.push(r);const plan=JSON.parse(r.system.match(/本幕群像调度：([^\n]+)/)[1]);return JSON.stringify({narration:'她把杯子放下。',dialogue:plan.present.map(id=>({speaker:id,text:'还没走？',action:'attentive'})),choices:[]})})
 try{
  const api=boot(home)
  const started=await api('gal-free-start',{roleId:'deepseek',restart:true})
  assert.equal(started.ok,true)
  const opening=worldOpening(newWorldline('deepseek'),'鲸鱼娘')
  assert.ok(opening.includes('第 1 夜，打烊之后'))
  assert.ok(requests[0].system.includes('第 1 夜，打烊之后'),'留空时默认开局没进 prompt')
  assert.ok(String(started.narration).startsWith('第 1 夜，打烊之后'),'第一屏没有开局背景')
  assert.equal(started.openingOwn,false)
 }finally{setGalChatProvider(null);await close(home)}
})

test('custom opening is not replayed as a narration prefix on later turns',async()=>{
 const home=mkdtempSync(join(tmpdir(),'opening-once-')),requests=[]
 setGalChatProvider(async r=>{requests.push(r);const plan=JSON.parse(r.system.match(/本幕群像调度：([^\n]+)/)[1]);return JSON.stringify({narration:'她笑了一下。',dialogue:plan.present.map(id=>({speaker:id,text:'嗯。',action:'joy'})),choices:[]})})
 try{
  const api=boot(home)
  const mine='第 5 夜，屋顶修好了。你们算是熟人。'
  await api('gal-free-start',{roleId:'deepseek',premise:mine,restart:true})
  assert.ok(String(requests[0].system).includes(mine))
  const next=await api('gal-free-next',{action:'坐下来说话。'})
  assert.equal(next.ok,true)
  // 开局是「已成事实」要一直带着，但第一幕的「第一幕」指令不该重复
  assert.doesNotMatch(requests.at(-1).system,/本次是这条世界线的第一幕/)
  // 旁白不能被开局反复打头
  assert.ok(!String(next.narration).includes(mine),'后续旁白不该复述开局原文')
 }finally{setGalChatProvider(null);await close(home)}
})
