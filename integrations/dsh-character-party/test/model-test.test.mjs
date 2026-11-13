import test from 'node:test'
import assert from 'node:assert/strict'
import {testModelConnection} from '../src/model-test.mjs'
const route={provider:'native',model:'sample'},catalog=[route]
test('native model probe sends only fixed synthetic messages and no work or story context',async()=>{
 let received
 const llm={resolveModelInfo:async()=>({reasoning:{efforts:[{id:'low'}]}}),stream:async function*(options){received=options;yield{type:'text-delta',text:'OK'};yield{type:'usage',usage:{inputTokens:10,outputTokens:1}}}}
 const result=await testModelConnection(llm,{...route,prompt:'PRIVATE WORLD',storyContext:'PRIVATE MEMORY',tools:[{}]},catalog)
 assert.equal(result.reply,'OK');assert.equal(received.maxTokens,256);assert.equal(received.reasoningEffort,'low')
 assert.deepEqual(Object.keys(received).sort(),['provider','model','sessionId','system','messages','maxTokens','signal','reasoningEffort'].sort())
 assert.doesNotMatch(JSON.stringify(received),/PRIVATE|storyContext|tools/);assert.equal(received.messages.length,1)
})
test('unknown models and failed streams never become a successful model verification',async()=>{
 await assert.rejects(testModelConnection({},route,[]),/已获取/)
 const llm={resolveModelInfo:async()=>({}),stream:async function*(){yield{type:'finish',reason:{kind:'error',failure:{message:'not configured'}}}}}
 await assert.rejects(testModelConnection(llm,route,catalog),/not configured/)
})
