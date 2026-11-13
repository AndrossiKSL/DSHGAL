import test from 'node:test'
import assert from 'node:assert/strict'
import {createServer,request} from 'node:http'
import {mkdtemp,writeFile,rm} from 'node:fs/promises'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {startStandaloneGal} from '../src/standalone-server.ts'

function call(port,path='/',headers={},method='GET',body=''){
 return new Promise((resolve,reject)=>{const req=request({host:'127.0.0.1',port,path,headers,method},res=>{let text='';res.setEncoding('utf8');res.on('data',c=>text+=c);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,text}))});req.on('error',reject);req.end(body)})
}
async function fixture(getContext=()=>({sessionId:'same-world-session',workspace:'H:/project',sessions:[{id:'same-world-session',title:'工坊',secret:'NEVER_PUBLIC'}],key:'NEVER_PUBLIC'})){
 const root=await mkdtemp(join(tmpdir(),'gal-standalone-')),seen=[]
 await writeFile(join(root,'client.js'),'window.realGalClient=true;');await writeFile(join(root,'standalone-runtime.js'),'window.realGalRuntime=true;')
 const upstream=createServer(async(req,res)=>{let body='';for await(const c of req)body+=c;seen.push({path:req.url,headers:req.headers,body});res.setHeader('content-type','application/json');res.end(JSON.stringify({ok:true,path:req.url,body}))})
 await new Promise(r=>upstream.listen(0,'127.0.0.1',r));const upstreamPort=upstream.address().port
 const app=startStandaloneGal({port:0,upstreamPort,clientRoot:root,getContext});await app.ready
 return{app,root,seen,upstream,upstreamPort,close:async()=>{await app.close();await new Promise(r=>upstream.close(r));await rm(root,{recursive:true,force:true})}}
}
test('standalone serves the shared client and sanitized context, including no-session title startup',async()=>{
 const f=await fixture();try{const page=await call(f.app.port);assert.equal(page.status,200);assert.match(page.text,/runtime\.js/);assert.match(page.text,/client\.js/);assert.doesNotMatch(page.text,/<iframe|NEVER_PUBLIC|same-world-session/);assert.equal(page.headers['access-control-allow-origin'],undefined);const context=JSON.parse((await call(f.app.port,'/standalone-context')).text);assert.equal(context.sessionId,'same-world-session');assert.equal(context.standalone,true);assert.doesNotMatch(JSON.stringify(context),/NEVER_PUBLIC/);assert.match((await call(f.app.port,'/client.js')).text,/realGalClient/);assert.equal((await call(f.app.port,'/',{},'POST')).status,405);assert.equal((await call(f.app.port,'/',{},'HEAD')).text,'');assert.equal((await call(f.app.port,'/src/index.ts')).status,404)}finally{await f.close()}
 const empty=await fixture(()=>({}));try{assert.equal(JSON.parse((await call(empty.app.port,'/standalone-context')).text).sessionId,null)}finally{await empty.close()}
})
test('only whitelisted same-origin APIs proxy to the fixed DSH host with request body and nonce',async()=>{
 const f=await fixture();try{const port=f.app.port;for(const path of ['/whale-galgame-api','/whale-galgame-media/a.webp','/character-party/','/character-party-api','/character-party-artifact?id=known']){const r=await call(port,path,{origin:`http://127.0.0.1:${port}`,'sec-fetch-site':'same-origin','content-type':'application/json','x-character-party-token':'test-nonce'},'POST','{"action":"state"}');assert.equal(r.status,200);const receipt=f.seen.at(-1);assert.equal(receipt.headers.host,`127.0.0.1:${f.upstreamPort}`);assert.equal(receipt.headers.origin,`http://127.0.0.1:${f.upstreamPort}`);assert.equal(receipt.headers['x-character-party-token'],'test-nonce');assert.equal(receipt.body,'{"action":"state"}')}for(const path of ['/whale-galgame-api-evil','/character-party-else','/credentials','/character-party/%2e%2e/credentials','http://example.com/whale-galgame-api'])assert.ok([400,404].includes((await call(port,path)).status),path)}finally{await f.close()}
})
test('Origin must match Host; port-stripped browser compatibility requires same-origin Fetch Metadata',async()=>{
 const f=await fixture();try{const port=f.app.port;assert.equal((await call(port,'/health',{origin:`http://127.0.0.1:${port}`})).status,200);assert.equal((await call(port,'/health',{origin:'http://127.0.0.1','sec-fetch-site':'same-origin'})).status,200);for(const headers of [{origin:'http://127.0.0.1'},{origin:'null'},{origin:'https://127.0.0.1:'+port},{origin:'http://127.0.0.1:9981','sec-fetch-site':'same-origin'},{origin:`http://localhost:${port}`},{origin:'https://evil.example','sec-fetch-site':'cross-site'},{'sec-fetch-site':'same-site'},{host:'evil.example:'+port}])assert.equal((await call(port,'/health',headers)).status,403,JSON.stringify(headers));assert.equal((await call(port,'/health',{host:'127.0.0.1',origin:'http://127.0.0.1','sec-fetch-site':'same-origin'})).status,200)}finally{await f.close()}
})
test('missing build product and occupied port fail visibly without breaking the upstream plugin',async()=>{
 const f=await fixture();let other;try{await rm(join(f.root,'standalone-runtime.js'));assert.match((await call(f.app.port)).text,/role="status"/);assert.equal((await call(f.app.port,'/runtime.js')).status,404);other=startStandaloneGal({port:f.app.port,upstreamPort:f.upstreamPort,clientRoot:f.root,getContext:()=>({})});await assert.rejects(other.ready,/EADDRINUSE/);assert.equal((await call(f.app.port,'/whale-galgame-api')).status,200);await other.close();await f.app.close();assert.equal((await call(f.upstreamPort,'/whale-galgame-api')).status,200)}finally{await other?.close();await f.close()}
})
