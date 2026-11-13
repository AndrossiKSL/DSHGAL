import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {Readable} from 'node:stream'
import {sameOriginRequest} from '../src/http-origin.mjs'
import {apply} from '../src/index.mjs'

const request=(origin,site='same-origin',host='127.0.0.1:3080',remoteAddress='127.0.0.1')=>({headers:{host,...(origin===undefined?{}:{origin}),'sec-fetch-site':site},socket:{remoteAddress}})
test('ordinary exact origins and local API callers continue to work',()=>{
 for(const origin of [undefined,'http://127.0.0.1:3080','https://127.0.0.1:3080'])assert.equal(sameOriginRequest(request(origin)),true)
})
test('port-stripped local browser origins require genuine same-origin metadata',()=>{
 assert.equal(sameOriginRequest(request('http://127.0.0.1')),true)
 assert.equal(sameOriginRequest(request('http://localhost','same-origin','localhost:3080','::1')),true)
 assert.equal(sameOriginRequest(request('http://[::1]','same-origin','[::1]:3080','::1')),true)
 for(const site of ['same-site','cross-site','none',undefined]){const r=request('http://127.0.0.1');r.headers['sec-fetch-site']=site;assert.equal(sameOriginRequest(r),false)}
 assert.equal(sameOriginRequest(request('http://127.0.0.1','same-origin','127.0.0.1:3080','192.168.1.10')),false)
 assert.equal(sameOriginRequest(request('https://127.0.0.1')),false)
})
test('foreign, opaque, mismatched ports and malformed origins remain blocked',()=>{
 for(const origin of ['null','https://foreign.invalid','http://127.0.0.1:80','http://127.0.0.1:8913','http://localhost','http://127.0.0.1.evil.invalid','http://user@127.0.0.1','http://127.0.0.1/path','http://127.0.0.1/?q=x']){
  // An explicit default port is normalized to no port; only valid browser-owned
  // same-origin metadata allows the omitted-port form.
  assert.equal(sameOriginRequest(request(origin,'same-site')),false,origin)
 }
 assert.equal(sameOriginRequest(request('http://example.test','same-origin','example.test:3080')),false)
})
test('HTTP entry permits the real browser variant and still enforces the mutation nonce',async()=>{
 const routes=[],disposers=[],path=join(await mkdtemp(join(tmpdir(),'party-origin-')),'party.json')
 const adapter={parents:()=>[],info:()=>({native:true}),catalog:async()=>[]}
 const {ready}=apply({webServer:{register:r=>routes.push(r)},on:(_,fn)=>disposers.push(fn),dshHomePath:()=>path},{adapter,storagePath:path,getRoles:()=>[]})
 await ready
 const route=routes.find(r=>r.path==='/character-party-api')
 async function call(headers,method='GET',body={action:'catalog'}){
  const req=Readable.from([Buffer.from(JSON.stringify(body))]);Object.assign(req,request('http://127.0.0.1'));req.headers={...req.headers,...headers};req.method=method;req.url='/character-party-api'
  const response={status:0,writeHead(s){this.status=s},end(body){this.body=JSON.parse(body)}}
  await route.handler(req,response);return response
 }
 try{
  const state=await call({});assert.equal(state.status,200);assert.equal(state.body.roles.length,0)
  assert.equal((await call({},'POST')).status,403)
  assert.equal((await call({'x-character-party-token':state.body.token},'POST')).status,200)
  assert.equal((await call({origin:'http://127.0.0.1:8913','sec-fetch-site':'same-site','x-character-party-token':state.body.token},'POST')).status,403)
  assert.equal((await call({origin:'null','sec-fetch-site':'same-origin'})).status,403)
 }finally{for(const dispose of disposers)await dispose()}
})
