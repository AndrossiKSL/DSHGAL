const status=document.querySelector('#status')
const showError=error=>{status.textContent=error.message||String(error)}
async function api(action,args){const response=await fetch('/app-api',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(action==='configure'?{action,config:args}:{action,args})});const data=await response.json();if(!response.ok||data.error)throw new Error(data.error||'请求失败');return data}
const page=document.body.dataset.page
if(page==='connection'){
 const form=document.querySelector('#connection-form'),toggle=()=>{const hermes=form.elements.backend.value==='hermes';document.querySelector('#dsh-fields').hidden=hermes;document.querySelector('#hermes-fields').hidden=!hermes}
 form.addEventListener('change',toggle)
 fetch('/app-api').then(r=>r.json()).then(({config})=>{for(const [key,value]of Object.entries(config))if(form.elements[key])form.elements[key].value=value;toggle()}).catch(showError)
 form.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('button');button.disabled=true;status.textContent='正在保存连接…';try{await api('configure',Object.fromEntries(new FormData(form)));location.assign('/')}catch(error){showError(error);button.disabled=false}})
}
if(page==='agent'){
 const form=document.querySelector('#agent-form'),container=document.querySelector('#threads'),labels={running:'进行中',completed:'已完成',failed:'失败',cancelled:'已取消',interrupted:'已中断，可续接','awaiting-permission':'等待你的确认'}
 const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node}
 let last='',stopped=false,inFlight=false
 async function refresh(){
  if(document.hidden||stopped||inFlight)return;inFlight=true
  try{const response=await fetch('/app-api'),data=await response.json();if(data.cast&&form.elements.role.options.length!==data.cast.length){const select=form.elements.role;select.replaceChildren(...data.cast.map(c=>{const option=el('option',c.name);option.value=c.id;return option}))}if(data.config.backend!=='hermes'){form.hidden=true;status.textContent='当前使用 DSH。请返回游戏，从「工坊委托」进入现有的 DSH 工坊。';container.replaceChildren();return}
   const signature=JSON.stringify(data.threads);if(last===signature)return;last=signature
   // Preserve unsent continuation text and keyboard focus during polling.
   const drafts=new Map([...container.querySelectorAll('textarea')].map(n=>[n.dataset.id,n.value]))
   const focused=document.activeElement?.dataset?.id,selection=document.activeElement?.selectionStart
   container.replaceChildren()
   if(!data.threads.length){const p=el('p','还没有委托。选好项目，把第一件工作交给她。');p.className='hint';container.append(p)}
   for(const row of data.threads.toReversed()){
    const article=el('article');article.className='thread';article.append(el('h3',row.role+' · '+(labels[row.status]||row.status)),el('p',row.cwd))
    if(row.sessionId)article.append(el('p','会话 '+row.sessionId))
    if(row.output)article.append(el('pre',row.output))
    if(row.error){const p=el('p',row.error);p.className='error';article.append(p)}
    if(row.permission){const box=el('div');box.className='permission';box.append(el('p',row.permission.title));for(const option of row.permission.options){const button=el('button',option.kind==='allow_once'?'允许这一次':'拒绝');button.onclick=()=>api('approve',{id:row.permission.id,optionId:option.optionId}).then(()=>{last='';refresh()}).catch(showError);box.append(button)}article.append(box)}
    if(['running','awaiting-permission'].includes(row.status)){const cancel=el('button','取消委托');cancel.onclick=()=>api('cancel',{id:row.id}).then(()=>{last='';refresh()}).catch(showError);article.append(cancel)}
    else{const input=el('textarea');input.rows=2;input.maxLength=40000;input.placeholder='补充要求，续接原会话…';input.dataset.id=row.id;input.value=drafts.get(row.id)||'';const send=el('button','续接委托');send.onclick=async()=>{try{await api('run',{id:row.id,prompt:input.value});last='';refresh()}catch(error){showError(error)}};article.append(input,send)}
    container.append(article)
   }
   if(focused){const input=[...container.querySelectorAll('textarea')].find(n=>n.dataset.id===focused);input?.focus();if(input&&selection!=null)input.setSelectionRange(selection,selection)}
  }catch(error){showError(error)}finally{inFlight=false}
 }
 form.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('button');button.disabled=true;try{await api('run',Object.fromEntries(new FormData(form)));form.elements.prompt.value='';status.textContent='委托已提交。';last='';refresh()}catch(error){showError(error)}finally{button.disabled=false}})
 const timer=setInterval(refresh,1500);window.addEventListener('pagehide',()=>{stopped=true;clearInterval(timer)},{once:true});refresh()
}
