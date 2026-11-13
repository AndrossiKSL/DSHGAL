import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,readFile,writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {Party,resolveRoute,validatePlan} from '../src/party.mjs'
import {createDshAdapter} from '../src/dsh-adapter.mjs'
const roles=[{id:'deepseek',name:'鲸鱼娘'},{id:'codex',name:'砚雪'},{id:'gemini',name:'双子'}]
const until=async fn=>{for(let i=0;i<400;i++){if(fn())return;await new Promise(r=>setTimeout(r,10))}throw new Error('Timed out')}
async function fixture(run,parents=[{id:'root',cwd:join(tmpdir(),'party-project'),route:{provider:'dsh',model:'base'}}]){
 const path=join(await mkdtemp(join(tmpdir(),'party-test-')),'party.json'),started=[]
 const adapter={parents:()=>parents,parent:id=>parents.find(p=>p.id===id),info:()=>({native:true}),catalog:async()=>[{provider:'dsh',model:'base'},{provider:'plan',model:'fast'}],run:async request=>{started.push(request);request.onStarted('native-'+request.task.id);const result=run?await run(request):{output:'已完成 '+request.task.prompt,stopReason:'completed'};if(request.task.mode!=='team'&&request.schema&&!result.structured)result.structured={status:'completed',summary:result.output,evidence:[]};return result}}
 const party=await new Party({path,roles:()=>roles,adapter}).init();party.state.settings.profiles[0].limits.concurrency=3;return{party,path,started,adapter}
}
test('role routes override workload defaults; unknown models never save',async()=>{
 const {party}=await fixture();await party.settings({routes:{code:{provider:'plan',model:'fast'}},roles:{codex:{default:{provider:'dsh',model:'base'}}}})
 assert.equal(resolveRoute(party.state.settings,'codex','code',{}).model,'base');assert.equal(resolveRoute(party.state.settings,'deepseek','code',{}).model,'fast')
 await assert.rejects(party.settings({routes:{code:{provider:'fake',model:'missing'}}}),/已获取/);assert.equal(party.state.settings.profiles[0].routes.code.model,'fast');await party.close()
})
test('two independent readers run concurrently and a writer waits for both',async()=>{
 const completions=new Map();const {party,started}=await fixture(r=>new Promise(resolve=>completions.set(r.task.id,()=>resolve({output:'verified',stopReason:'completed'}))))
 const submit=(roleId,kind,prompt)=>party.submit({parentId:'root',roleId,kind,prompt})
 const a=(await submit('deepseek','research','read A')).task,b=(await submit('gemini','review','read B')).task,c=(await submit('codex','code','write C')).task
 await until(()=>started.length===2);assert.deepEqual(new Set(started.map(r=>r.task.id)),new Set([a.id,b.id]));completions.get(a.id)();await until(()=>a.status==='completed');assert.equal(c.status,'queued');completions.get(b.id)();await until(()=>started.length===3);assert.equal(c.status,'running');completions.get(c.id)();await until(()=>c.status==='completed');await party.close()
})
test('team planner produces native dependent jobs and shares attributed results',async()=>{
 const {party,started}=await fixture(async r=>r.task.mode==='team'?{stopReason:'completed',output:'',structured:{steps:[{id:'implement',roleId:'codex',kind:'code',prompt:'deliver file',dependsOn:[]},{id:'check',roleId:'gemini',kind:'review',prompt:'verify file',dependsOn:['implement']}]}}:{stopReason:'completed',output:r.task.roleId+' verified'})
 await party.remember({parentId:'root',content:'约定：使用原项目字体'})
 const {task}=await party.submit({parentId:'root',roleId:'deepseek',prompt:'build this',mode:'team',teamRoles:roles.map(r=>r.id)})
 await until(()=>party.state.tasks.length===3&&party.state.tasks.every(t=>t.status==='completed'))
 assert.deepEqual(started.map(r=>r.role.id),['deepseek','codex','gemini']);assert.match(started[2].prompt,/codex verified/);assert.match(started[1].prompt,/使用原项目字体/)
 assert.equal(party.state.memory.filter(m=>m.source==='agent-reported').length,3);assert.equal(party.state.tasks.find(t=>t.teamId===task.id).cwd,task.cwd);await party.close()
})
test('invalid or cyclic planner output cannot schedule work',async()=>{
 assert.throws(()=>validatePlan({steps:[{id:'a',roleId:'codex',kind:'code',prompt:'x',dependsOn:['a']}]},roles),/不能循环/)
 assert.throws(()=>validatePlan({steps:[{id:'a',roleId:'unknown',kind:'code',prompt:'x',dependsOn:[]}]},roles),/不合法/)
 const {party}=await fixture(async()=>({stopReason:'completed',output:'',structured:{steps:[{id:'bad',roleId:'codex',kind:'code',prompt:'x',dependsOn:['not-yet']}]}}));const {task}=await party.submit({parentId:'root',roleId:'deepseek',prompt:'x',mode:'team'});await until(()=>task.status==='failed');assert.equal(party.state.tasks.length,1);await party.close()
})
test('cancel prevents dependent work and failed runs never enter shared memory',async()=>{
 const {party,started}=await fixture(r=>new Promise((resolve,reject)=>r.signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true})))
 const {task}=await party.submit({parentId:'root',roleId:'codex',prompt:'long work',requestId:'one'})
 assert.equal((await party.submit({parentId:'root',roleId:'codex',prompt:'long work',requestId:'one'})).task.id,task.id)
 await until(()=>started.length===1);await party.cancel({id:task.id});await until(()=>task.status==='cancelled');assert.equal(party.state.memory.length,0);await party.close()
})
test('restart preserves memory, interrupts pending work and does not replay writes',async()=>{
 const {party,path,adapter}=await fixture();await party.remember({parentId:'root',content:'durable fact'});await party.close()
 const saved=JSON.parse(await readFile(path));saved.tasks.push({id:'unfinished',status:'running',projectId:'p',events:[]});await writeFile(path,JSON.stringify(saved))
 let calls=0;const restored=await new Party({path,roles:()=>roles,adapter:{...adapter,run:async()=>{calls++}}}).init();assert.equal(restored.state.memory[0].content,'durable fact');assert.equal(restored.state.tasks[0].status,'interrupted');assert.equal(calls,0);await restored.close()
})
test('project facts never leak between different workspaces',async()=>{
 const {party,started}=await fixture(undefined,[{id:'root',cwd:join(tmpdir(),'first'),route:{provider:'dsh',model:'base'}},{id:'other',cwd:join(tmpdir(),'second'),route:{provider:'dsh',model:'base'}}]);await party.remember({parentId:'root',content:'private-project-a-marker'});const {task}=await party.submit({parentId:'other',roleId:'codex',prompt:'read other project'});await until(()=>task.status==='completed');assert.doesNotMatch(started[0].prompt,/private-project-a-marker/);await party.close()
})
test('native adapter supplies persona, model, no story tools and guaranteed disposal',async()=>{
 let received,disposed=false;const root={id:'root',session:{header:{cwd:tmpdir()}},options:{provider:'native',model:'main'}}
 const ctx={agents:{roots:()=>[root],get:()=>root},subagents:{list:()=>['spawn'],getProvider:()=>({name:'spawn',capabilities:{agentOptions:true,persona:true,toolFilter:true},inheritsParentContext:false}),start:async(_,request)=>{received=request;return{id:'child',result:Promise.resolve({stopReason:'completed',output:[{type:'text',text:'actual result'}]}),dispose:async()=>{disposed=true}}}},tools:{get:()=>undefined},on:()=>()=>{},llm:{}}
 const adapter=createDshAdapter(ctx),controller=new AbortController(),out=await adapter.run({task:{parentId:'root',kind:'story'},role:roles[1],route:{provider:'plan',model:'fast'},prompt:'talk',signal:controller.signal,onStarted:()=>{},onEvent:()=>{}})
 assert.equal(received.agentOptions.model,'fast');assert.match(received.persona,/砚雪/);assert.deepEqual(received.toolFilter,{allow:[]});assert.equal(received.parent,root);assert.equal(out.output,'actual result');assert.equal(disposed,true)
})
test('a completed model turn with a blocked objective remains blocked and does not become memory',async()=>{
 const {party}=await fixture(async()=>({stopReason:'completed',output:'',structured:{status:'blocked',summary:'缺少只读工具，不能核对',evidence:[]}}));const {task}=await party.submit({parentId:'root',roleId:'gemini',kind:'review',prompt:'verify'});await until(()=>task.status==='blocked');assert.equal(party.state.memory.length,0);assert.match(task.error,/不能核对/);await party.close()
})

test('queued work and team children retain the submitted model profile after switching',async()=>{
 const releases=[];const {party,started}=await fixture(r=>new Promise(resolve=>releases.push(()=>resolve({stopReason:'completed',output:'done'}))))
 const settings=structuredClone(party.state.settings);settings.profiles[0].common={provider:'dsh',model:'base'};settings.profiles[0].limits.concurrency=1;settings.profiles[0].limits.maxOutputTokens=700;settings.profiles[1].common={provider:'plan',model:'fast'};await party.settings(settings)
 const a=(await party.submit({parentId:'root',roleId:'codex',prompt:'first'})).task;const b=(await party.submit({parentId:'root',roleId:'gemini',prompt:'second'})).task
 await until(()=>started.length===1);settings.activeProfileId='engineering';await party.settings(settings);releases[0]();await until(()=>started.length===2);assert.equal(started[1].route.model,'base');assert.equal(started[1].route.maxTokens,700);assert.equal(b.modelConfig.id,'daily');releases[1]();await until(()=>b.status==='completed');await party.close()
})

test('explicit task profile does not switch the default daily configuration',async()=>{const {party,started}=await fixture();const config=structuredClone(party.state.settings);config.profiles[1].common={provider:'plan',model:'fast'};await party.settings(config);const {task}=await party.submit({parentId:'root',roleId:'codex',prompt:'quick check',profileId:'engineering'});await until(()=>task.status==='completed');assert.equal(party.state.settings.activeProfileId,'daily');assert.equal(started[0].route.model,'fast');await assert.rejects(party.submit({parentId:'root',roleId:'codex',prompt:'x',profileId:'removed'}),/已不存在/);await party.close()})
