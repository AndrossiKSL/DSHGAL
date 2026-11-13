import{openSuperAgent}from'./superagent.js'
import{openModelSettings,uiIcon,roleEmblem,roleStyle,portraitBadge,decorateButton}from'./model-settings.js'
const $=s=>document.querySelector(s),types={conductor:'统筹',frontend:'界面开发',code:'编码',review:'审查',research:'调研',story:'角色交流'},statuses={queued:'等待开始',running:'正在处理',completed:'已完成',failed:'未完成',cancelled:'已取消',blocked:'等待前置任务',interrupted:'需要重新委托'}
let state,token,roleId='deepseek',parentId=new URLSearchParams(location.search).get('session')||'',projectId='',mode='single',tab='tasks',models=[],context='',busy=false,requestId='',revision='',refreshing=false,pendingContext=null
const selected=new Set(['deepseek','codex','gemini'])
function e(tag,attrs={},...children){const n=document.createElement(tag);for(const[k,v]of Object.entries(attrs)){if(k.startsWith('on'))n.addEventListener(k.slice(2),v);else if(k==='class')n.className=v;else if(k==='text')n.textContent=v;else if(k==='checked')n.checked=v;else n.setAttribute(k,v)}for(const c of children.flat()){if(c!==null&&c!==undefined)n.append(c instanceof Node?c:document.createTextNode(String(c)))}return n}
const name=id=>state?.roles.find(r=>r.id===id)?.name||id
const currentProject=()=>state.projects.find(p=>p.cwd===state.sessions.find(s=>s.id===parentId)?.cwd)
const btn=(label,fn,cls='')=>decorateButton(e('button',{type:'button',class:cls,onclick:fn},label),label)
const safeSprite=src=>typeof src==='string'&&src.startsWith('/whale-galgame-media/')?src:''
async function api(action,args={},retry=true){const response=await fetch('/character-party-api',{method:'POST',headers:{'Content-Type':'application/json','X-Character-Party-Token':token},body:JSON.stringify({action,args})}),r=await response.json();if(!r.ok){if(retry&&response.status===403&&r.error==='请刷新委托窗口后再试'){const next=await(await fetch('/character-party-api',{cache:'no-store'})).json();if(next.ok){token=next.token;return api(action,args,false)}}throw new Error(r.error||'操作失败')}return r}
function error(value){$('#error').textContent=value?.message||String(value||'')}
async function load(initial=false){
 if(refreshing){await new Promise(r=>setTimeout(r,40));return load(initial)}refreshing=true
 try{
  const r=await(await fetch('/character-party-api',{cache:'no-store',signal:AbortSignal.timeout(10000)})).json();if(!r.ok)throw new Error(r.error);state=r;token=r.token
  if(!state.sessions.some(s=>s.id===parentId))parentId=state.sessions[0]?.id||''
  projectId=currentProject()?.id||''
  if(initial){build();if(pendingContext){applyContext(pendingContext);pendingContext=null}}else{
   const next=JSON.stringify([state.tasks,state.memory,state.sessions,state.settings,state.superAgent]);if(next!==revision){renderTasks();renderMemory();updateSessionPath();renderProfileSwitch();revision=next}
  }
 }catch(err){if(!state)$('#app').replaceChildren(e('p',{class:'boot'},'委托系统暂未就绪：'+err.message));else error(err)}finally{refreshing=false}
}
function build(){
 const cast=e('div',{class:'cast-list','aria-label':'工坊同伴'},state.roles.map(r=>btn('',()=>choose(r.id))))
 const session=e('select',{'aria-label':'工作会话',onchange:event=>{parentId=event.target.value;projectId=currentProject()?.id||'';updateSessionPath();renderTasks();renderMemory()}},state.sessions.map(s=>e('option',{value:s.id},(s.cwd?.split(/[\\/]/).pop()||'工作会话')+' · '+s.id.slice(-6))))
 session.value=parentId
 const team=e('div',{class:'team-picker',id:'team'});team.hidden=true
 team.replaceChildren(...state.roles.map(r=>e('label',{},e('input',{type:'checkbox',value:r.id,...(selected.has(r.id)?{checked:true}:{}),onchange:event=>{if(event.target.checked)selected.add(r.id);else selected.delete(r.id)}}),r.name)))
 const kind=e('select',{'aria-label':'委托类型',id:'kind'},Object.entries(types).filter(([id])=>id!=='conductor'&&id!=='story').map(([id,label])=>e('option',{value:id},label)));kind.value='code'
 const composer=e('div',{class:'composer'},e('div',{class:'composer-heading'},uiIcon('pen'),'委托笺',e('span',{},'COMMISSION LETTER')),e('div',{class:'modes'},...[['single','单人委托'],['team','一起完成'],['story','聊聊工作']].map(([id,label])=>btn(label,()=>{mode=id;document.querySelectorAll('.modes button').forEach((n,i)=>{const active=['single','team','story'][i]===id;n.classList.toggle('active',active);n.setAttribute('aria-pressed',String(active))});team.hidden=id!=='team';kind.hidden=id!=='single';updateRouteHint();$('#prompt').placeholder=id==='story'?'想和她聊什么？':'告诉同伴目标、要求和交付物……'},id==='single'?'active':''))),team,e('textarea',{id:'prompt',rows:4,maxlength:12000,'aria-label':'委托内容',placeholder:'告诉同伴目标、要求和交付物……'}),e('div',{class:'form-row'},kind,e('span',{class:'footnote',id:'route-hint'},'模型沿用所选 DSH 会话'),btn('交给她们',submit,'primary push')))
 $('#app').replaceChildren(e('div',{class:'shell'},e('aside',{class:'companions'},e('div',{class:'brand'},'DEEP-SEA MAID ATELIER'),e('h2',{},'今天，也一起完成。'),e('p',{class:'companion-subtitle'},state.roles.length+' 位工坊同伴'),cast),e('section',{class:'workspace'},e('header',{class:'masthead'},e('div',{},e('div',{class:'brand'},'WORKSHOP / COMMISSIONS'),e('h1',{},'工坊委托'),e('p',{},'把想做的事，交给熟悉的同伴。')),e('div',{class:'top-actions'},btn('长期委托',()=>openLongTerm()),btn('模型分工',openSettings),window.parent!==window?btn('返回故事',()=>parent.postMessage({type:'character-party-close'},location.origin),'ghost'):null)),e('div',{class:'session'},uiIcon('book'),session,e('span',{class:'path',id:'workspace-path'})),e('section',{class:'hero'},e('div',{class:'portrait'},e('div',{class:'portrait-halo',id:'role-halo'}),e('img',{id:'portrait',alt:''}),e('span',{class:'portrait-plaque',id:'role-plaque'})),e('div',{class:'hero-copy'},e('p',{class:'hello serif',id:'hello'}),e('p',{class:'hero-post',id:'role-post'}),composer)),e('p',{class:'error',id:'error',role:'alert'}),e('nav',{class:'tabs'},btn('委托记录',()=>switchTab('tasks'),'active'),btn('共同记忆',()=>switchTab('memory'))),e('section',{id:'tasks',class:'tasks'}),e('section',{id:'memory',hidden:''}))))
 choose(roleId);updateSessionPath();renderTasks();renderMemory();renderProfileSwitch();document.querySelectorAll('.modes button').forEach((n,i)=>n.setAttribute('aria-pressed',String(i===0)));window.render_game_to_text=()=>JSON.stringify({mode:'character-party',roleId,parentId,projectId,tab,tasks:visibleTasks().map(t=>({id:t.id,roleId:t.roleId,status:t.status,kind:t.kind}))});window.advanceTime=()=>{}
}
function choose(id){roleId=id;const role=state.roles.find(r=>r.id===id)||state.roles[0];if(!role)return;roleId=role.id;$('#hello').textContent=role.name+'在这里。';$('#portrait').src=safeSprite(role.sprite);$('#portrait').alt=role.name;document.querySelectorAll('.cast-person').forEach(n=>{n.classList.toggle('selected',n.dataset.role===id);n.setAttribute('aria-pressed',String(n.dataset.role===id))});document.documentElement.style.setProperty('--role-accent',roleStyle(role.id).accent);$('#role-halo').replaceChildren(roleEmblem(role.id));$('#role-post').textContent=role.post+' · '+roleStyle(role.id).theme;$('#role-plaque').textContent=roleStyle(role.id).brand
 const list=$('.cast-list');if(!list.firstChild?.dataset.role){list.replaceChildren(...state.roles.map(r=>{const n=btn('',()=>choose(r.id),'cast-person'+(r.id===id?' selected':''));n.dataset.role=r.id;n.setAttribute('aria-label',r.name);n.setAttribute('aria-pressed',String(r.id===id));n.append(portraitBadge(r),e('span',{},r.name,e('small',{},r.post||r.id)));return n}))}
 updateRouteHint()
}
function updateRouteHint(){if(!$('#route-hint'))return;const kind=mode==='team'?'conductor':mode==='story'?'story':$('#kind').value;const p=currentProfile(),route=p.roles[roleId]?.[kind]||p.roles[roleId]?.default||p.routes[kind]||p.common||state.sessions.find(s=>s.id===parentId)?.route;$('#route-hint').textContent=route?.model||'先选择工作会话'}
function updateSessionPath(){const select=$('[aria-label="工作会话"]');if(select){const old=[...select.options].map(o=>o.value).join(),next=state.sessions.map(s=>s.id).join();if(old!==next)select.replaceChildren(...state.sessions.map(s=>e('option',{value:s.id},(s.cwd?.split(/[\\/]/).pop()||'工作会话')+' · '+s.id.slice(-6))));select.value=parentId}$('#workspace-path').textContent=state.sessions.find(s=>s.id===parentId)?.cwd||'请先在 DSH 打开项目会话';updateRouteHint()}
function switchTab(id){tab=id;$('#tasks').hidden=id!=='tasks';$('#memory').hidden=id!=='memory';document.querySelectorAll('.tabs button').forEach((n,i)=>n.classList.toggle('active',['tasks','memory'][i]===id))}
function visibleTasks(){return state.tasks.filter(t=>projectId?t.projectId===projectId:t.parentId===parentId)}
async function submit(){if(busy)return;busy=true;error('');const prompt=$('#prompt').value;requestId||=crypto.randomUUID();const button=$('.composer .primary');button.disabled=true
 try{let worldId='';try{worldId=JSON.parse(context||'{}').worldId||''}catch{};const result=await api('thread-open',{parentId,roleId,profileId:state.settings.activeProfileId,kind:mode==='story'?'story':$('#kind').value,mode:mode==='team'?'team':'single',goal:prompt,teamRoles:[...selected],requestId,worldId});$('#prompt').value='';requestId='';await load();projectId=currentProject()?.id||'';renderTasks();switchTab('tasks');await openLongTerm(result.thread.id)}catch(err){error(err)}finally{busy=false;button.disabled=false}
}
$('#app').addEventListener('input',event=>{if(event.target.id==='prompt')requestId=''})
$('#app').addEventListener('change',event=>{if(event.target.id==='kind')updateRouteHint()})
function renderTasks(){
 if(!$('#tasks'))return;const tasks=visibleTasks(),top=tasks.filter(t=>!t.teamId).reverse(),ordered=top.flatMap(t=>[t,...tasks.filter(s=>s.teamId===t.id)])
 if(!ordered.length){$('#tasks').replaceChildren(e('p',{class:'empty'},uiIcon('book'),'这里还没有委托。选一位同伴，写下你们要一起完成的事。'));return}
 $('#tasks').replaceChildren(...ordered.map(t=>{
  const children=tasks.filter(s=>s.teamId===t.id),open=children.some(s=>['queued','running'].includes(s.status)),label=open?'同伴正在协作':t.mode==='team'&&t.status==='completed'&&children.some(s=>s.status!=='completed')?'部分任务未完成':statuses[t.status]
  const head=e('div',{class:'task-head'},uiIcon('pen'),e('b',{},name(t.roleId)),e('span',{class:'status '+(open?'running':t.status)},label),e('span',{class:'task-time'},uiIcon('clock'),new Date(t.createdAt).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})),['running','queued'].includes(t.status)||open?btn('取消',async()=>{try{await api('cancel',{id:t.id});await load()}catch(err){error(err)}},'ghost'):null)
  if(!t.teamId&&!['queued','running'].includes(t.status)&&!open)head.append(btn('收起',async()=>{try{await api('archive',{id:t.id});await load()}catch(err){error(err)}},'ghost'))
  const trace=e('details',{},e('summary',{},'查看进展与来源'),e('div',{class:'trace'},t.route?t.route.provider+' / '+t.route.model:'尚未分配模型',e('br'),t.sessionId?'DSH 会话：'+t.sessionId:'',...(t.evidence||[]).flatMap(v=>[e('br'),'验证记录 · '+v]),...(t.events||[]).flatMap(v=>[e('br'),new Date(v.at).toLocaleTimeString()+' · '+v.text])))
  const usage=t.usage?e('div',{class:'task-usage'},(t.modelConfig?.name||'')+' · 输入 '+t.usage.inputTokens+' / 输出 '+t.usage.outputTokens+' Token'+(t.usage.cacheReadTokens?' · 缓存命中 '+t.usage.cacheReadTokens:'')):null
  return e('article',{class:'task'+(t.teamId?' child':''),'data-task-id':t.id},head,e('p',{class:'task-prompt'},t.prompt),t.output?e('div',{class:'result'},t.output):null,t.error?e('p',{class:'error'},t.error):null,usage,trace)
 }))
}
function renderMemory(){
 if(!$('#memory'))return;const draft=$('[aria-label="添加共同记忆"]')?.value||'',rows=state.memory.filter(m=>m.projectId===projectId).reverse(),field=e('input',{'aria-label':'添加共同记忆',placeholder:'记下项目约定、要求或已确认的事实……',maxlength:4000})
 field.value=draft
 const add=btn('记下来',async()=>{try{await api('remember',{parentId,content:field.value});field.value='';await load();projectId=currentProject()?.id||'';renderMemory()}catch(err){error(err)}})
 $('#memory').replaceChildren(e('p',{class:'footnote'},'这份记忆属于当前项目，所有同伴共享。工作成果保留角色与会话来源；剧情中的私人记忆仍留在原世界线。'),e('div',{class:'memory-input'},field,add),...rows.map(m=>e('article',{class:'memory-row'},btn('移除',async()=>{try{await api('forget',{id:m.id});await load()}catch(err){error(err)}},'ghost'),e('small',{},(m.roleId==='user'?'你':name(m.roleId))+' · '+(m.source==='user'?'已确认约定':'同伴记录')+' · '+new Date(m.createdAt).toLocaleString()),e('p',{},m.content))))
}
async function openLongTerm(threadId){let worldId='';try{worldId=JSON.parse(context||'{}').worldId||''}catch{};await openSuperAgent({api,getState:()=>state,reload:()=>load(),parentId,roleId,worldId,threadId,onParentChange:id=>{parentId=id;projectId=currentProject()?.id||'';updateSessionPath()}})}
async function openSettings(){await openModelSettings({api,getState:()=>state,reload:()=>load(),name,onSaved:()=>{updateRouteHint();renderProfileSwitch()}})}
function currentProfile(){return state.settings.profiles.find(p=>p.id===state.settings.activeProfileId)||state.settings.profiles[0]}
function renderProfileSwitch(){const existing=$('#model-profile-switch');if(existing)existing.remove();const select=e('select',{id:'model-profile-switch',class:'model-profile-select','aria-label':'当前模型配置'},...state.settings.profiles.map(p=>e('option',{value:p.id},p.name)));select.value=state.settings.activeProfileId;select.onchange=async()=>{try{await api('settings',{...state.settings,activeProfileId:select.value});await load();updateRouteHint()}catch(err){error(err);select.value=state.settings.activeProfileId}};$('.top-actions').prepend(select)}

function applyContext(data){parentId=data.sessionId||parentId;context=String(data.storyContext||'').slice(0,1600);if(data.roleId&&state.roles.some(r=>r.id===data.roleId))choose(data.roleId);const selectedThread=state.superAgent?.threads.find(t=>t.id===data.focusThreadId);if(selectedThread)parentId=selectedThread.parentId;projectId=currentProject()?.id||'';updateSessionPath();renderTasks();renderMemory();if(selectedThread)void openLongTerm(selectedThread.id)}
window.addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==window.parent||event.data?.type!=='character-party-context')return;if(!state){pendingContext=event.data;return}applyContext(event.data)})
await load(true);setInterval(()=>{if(!document.hidden&&!document.querySelector('dialog'))void load()},1800)
