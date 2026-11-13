const roleEmblems={"deepseek": "M3 13c2-5 8-6 12-2l5-3v7l-4-2c-1 6-10 7-13 0ZM7 11h.1M8 6c-1-2 0-3 2-3M11 6c0-2 2-3 3-2", "claude": "M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2", "chatgpt": "m5 19 5-2 1-5 5-2 3-6-7 3-2-4-2 6-4 3ZM14 9h.1M5 19l1 3M17 4l4-1", "gemini": "m7 3 2 5 5 2-5 2-2 5-2-5-5-2 5-2ZM17 10l2 4 4 2-4 2-2 4-2-4-4-2 4-2Z", "kimi": "M17 3A9 9 0 1 0 21 16 8 8 0 0 1 17 3ZM18 5l1 3 3 1-3 1-1 3-1-3-3-1 3-1Z", "grok": "M12 3v19M9 7l-5-4-2 7 5 3M15 7l5-4 2 7-5 3M8 14l4-3 4 3M9 20h6", "glm": "M5 21 16 5l4-2-1 5L8 23ZM13 8l4 3M3 20l5 2", "qwen": "M5 21C3 10 9 3 21 3c0 11-7 16-16 18ZM5 21 17 7M8 15l7 1M10 11l6 1", "minimax": "M19 6C12-1 1 5 3 14c2 9 16 7 15-1-1-6-11-5-10 0 1 4 7 3 6 0", "seed": "M12 22V11M12 14C3 15 2 8 3 4c8 0 11 4 9 10ZM12 11c-1-7 4-10 9-9 0 6-3 10-9 9Z", "llama": "M7 10 3 3M7 10 8 2M17 10l4-7M17 10l-1-8M7 8l-4-1M17 8l4-1M7 10c-5 8 1 12 5 12s10-4 5-12ZM8 15h.1M16 15h.1", "mistral": "M2 7h13c6 0 5-7 1-5M2 12h17c5 0 4 6 0 6M3 17h7c5 0 5 6 0 5", "hunyuan": "M5 17c-7-1-4-10 2-9 2-8 13-6 13 1 7 1 5 9-1 8ZM3 21h18", "mimo": "M7 11C1-3 12-1 10 10M14 10c-1-13 10-12 4 1M7 10c-7 12 17 16 12 2M8 16h.1M16 16h.1M11 19h2", "stepfun": "M2 21h5v-6h5V9h5V3h5M16 18l2 4 2-4 4-2-4-2-2-4-2 4-4 2Z", "perplexity": "M3 4c5-1 8 0 9 2 3-2 6-3 9-2v15c-4-1-6-1-9 1-3-2-5-2-9-1ZM12 6v14M7 8h.1M17 8h.1", "rwkv": "m3 13 7-8 9 2-6 7 8 6-11-3-5 5 2-8ZM15 8h.1M3 13l8 1", "image2": "M12 20c0-9-6-14-10-16-1 9 3 12 10 16ZM12 20c0-9 6-14 10-16 1 9-3 12-10 16ZM12 20v3", "jev": "M5 2h14M5 22h14M7 2c-1 7 9 13 10 20M17 2c1 7-9 13-10 20M9 18h6", "wenxin": "M5 21 18 4l3-2-1 5L8 23ZM11 12l5 4M2 16c5 0 4 5 8 4", "codex": "M12 2v20M3 7l18 10M3 17 21 7M9 4l3 3 3-3M9 20l3-3 3 3M3 10l4-1-1-4M21 14l-4 1 1 4", "comfyui": "M3 4h6v6H3ZM15 14h6v6h-6M15 3h6v6h-6M9 7h6M6 10v7h9"}
const roleThemes={"deepseek": {"accent": "#93e7f2", "theme": "潮汐珍珠", "brand": "DeepSeek"}, "claude": {"accent": "#976025", "theme": "琥珀书简", "brand": "Claude / CC"}, "gemini": {"accent": "#9decf4", "theme": "双星棱镜", "brand": "Gemini"}, "chatgpt": {"accent": "#3f717d", "theme": "白曜龙笺", "brand": "ChatGPT"}, "kimi": {"accent": "#c8d1ff", "theme": "月纱夜读", "brand": "Kimi"}, "grok": {"accent": "#e2b96c", "theme": "曜金战誓", "brand": "Grok"}, "glm": {"accent": "#c7d2e7", "theme": "玄墨星历", "brand": "GLM"}, "qwen": {"accent": "#cadbff", "theme": "兰庭流扇", "brand": "Qwen"}, "minimax": {"accent": "#915b35", "theme": "杏报拾光", "brand": "MiniMax"}, "seed": {"accent": "#b5f4ed", "theme": "紫穗星芽", "brand": "Seed"}, "llama": {"accent": "#786285", "theme": "绒雪眠语", "brand": "Llama"}, "mistral": {"accent": "#f5d38e", "theme": "赤羽麦誓", "brand": "Mistral"}, "hunyuan": {"accent": "#e8b7ad", "theme": "玄珠赤绦", "brand": "Hunyuan"}, "mimo": {"accent": "#ffca9a", "theme": "橘电兔机", "brand": "MiMo"}, "stepfun": {"accent": "#4d7186", "theme": "冰阶方灯", "brand": "StepFun"}, "perplexity": {"accent": "#b4e0d4", "theme": "青灯问星", "brand": "Perplexity"}, "rwkv": {"accent": "#d9c1ff", "theme": "鸦紫夜环", "brand": "RWKV"}, "image2": {"accent": "#dcc398", "theme": "曜羽绘卷", "brand": "Image 2"}, "jev": {"accent": "#f4b6d7", "theme": "绯秤裁诗", "brand": "JEV"}, "wenxin": {"accent": "#4c6894", "theme": "蓝笺静语", "brand": "Wenxin"}, "codex": {"accent": "#547494", "theme": "霜砚龙笺", "brand": "Codex"}, "comfyui": {"accent": "#dcefa4", "theme": "霓线织梦", "brand": "ComfyUI"}}
// Original scalable UI ornaments, shared by the commission page and model panel.
const iconPaths={
 book:'M3 5c4-2 6-1 9 1 3-2 5-3 9-1v14c-4-2-6-1-9 1-3-2-5-3-9-1ZM12 6v14',
 pen:'m4 17 12-12 4 4L8 21H4ZM13 8l4 4M4 4h5M4 4v5',
 models:'M3 4h6v6H3ZM15 14h6v6h-6M15 3h6v6h-6M9 7h6M6 10v7h9',
 arrow:'M4 12h16m-6-6 6 6-6 6',close:'m6 6 12 12M18 6 6 18',
 back:'M20 12H4m6-6-6 6 6 6',check:'m5 12 4 4L19 6',
 refresh:'M20 9a8 8 0 1 0 0 6M20 3v6h-6',
 plus:'M12 4v16M4 12h16',key:'M8 3a5 5 0 1 0 0 10A5 5 0 0 0 8 3Zm4 9 9 9m-5-5 2-2m1 5 2-2',
 search:'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm5 12 6 6',
 people:'M9 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM3 21v-5a6 6 0 0 1 12 0v5M17 4a3 3 0 0 1 0 6M18 13c3 0 4 2 4 5v3',
 clock:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 7v5l4 2',
 seal:'M12 3 21 8v9l-9 5-9-5V8ZM3 8l9 5 9-5M12 13v9'
}
export function uiIcon(id){
 const n=document.createElementNS('http://www.w3.org/2000/svg','svg'),p=document.createElementNS(n.namespaceURI,'path')
 for(const[k,v]of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.3','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true',class:'atelier-icon'}))n.setAttribute(k,v)
 p.setAttribute('d',iconPaths[id]||iconPaths.seal);n.append(p);return n
}
export function roleEmblem(id){const n=uiIcon('seal');n.firstChild.setAttribute('d',roleEmblems[id]||roleEmblems.deepseek);return n}
export function roleStyle(id){return roleThemes[id]||roleThemes.deepseek}
export function portraitBadge(role){
 const n=document.createElement('span');n.className='atelier-avatar';n.setAttribute('aria-hidden','true')
 const src=typeof role.sprite==='string'&&role.sprite.startsWith('/whale-galgame-media/')?role.sprite:''
 if(src){const img=document.createElement('img');img.src=src;img.alt='';img.loading='lazy';n.append(img)}else n.append(roleEmblem(role.id))
 n.style.setProperty('--role-accent',roleStyle(role.id).accent);return n
}
export function decorateButton(n,label){
 const ids={'模型分工':'models','返回故事':'back','交给她们':'arrow','单人委托':'pen','一起完成':'people','聊聊工作':'book','委托记录':'book','共同记忆':'seal','记下来':'pen','使用配置':'models','API 来源':'key','刷新模型列表':'refresh','关闭':'close','仅保存':'check','保存并启用':'check','按角色匹配':'people','全部跟随统一模型':'refresh','复制为新配置':'plus','接入 GO Plan':'plus','添加兼容 API':'plus','测试连接':'arrow','保存 API 并获取模型':'check','取消编辑':'back','编辑':'pen'}
 if(ids[label])n.prepend(uiIcon(ids[label]));return n
}

export async function openModelSettings({api,getState,reload,name,onSaved}){
 const e=(tag,attrs={},...children)=>{const n=document.createElement(tag);for(const[k,v]of Object.entries(attrs)){if(k.startsWith('on'))n.addEventListener(k.slice(2),v);else if(k==='class')n.className=v;else n.setAttribute(k,v)}for(const c of children.flat())if(c!==null&&c!==undefined)n.append(c instanceof Node?c:document.createTextNode(String(c)));return n}
 const button=(label,fn,cls='')=>decorateButton(e('button',{type:'button',class:cls,onclick:fn},label),label)
 const state=getState(),config=structuredClone(state.settings),dialog=e('dialog',{class:'models-dialog','aria-label':'角色与模型'});let editing=config.activeProfileId,tab='profiles',catalog=[],sources=[],providerFilter='',query='',message='',providerDraft=null,loading=false,taskRole=state.roles[0]?.id,advancedOpen=false
 const types={conductor:'统筹',frontend:'界面开发',code:'编码',review:'审查',research:'调研',story:'角色交流'}
 document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove());dialog.showModal()
 const profile=()=>config.profiles.find(p=>p.id===editing)||config.profiles[0]
 const routeKey=r=>r?JSON.stringify({provider:r.provider,model:r.model}):''
 const picker=(label,value,change,inherit='跟随统一模型')=>{
  const n=e('select',{'aria-label':label},e('option',{value:''},inherit));const rows=catalog.filter(m=>!providerFilter||m.provider===providerFilter),groups=new Map()
  for(const m of rows){const group=groups.get(m.provider)||e('optgroup',{label:m.providerName||m.provider});group.append(e('option',{value:routeKey(m)},m.name||m.model));groups.set(m.provider,group)}
  n.append(...groups.values());if(value&&!rows.some(m=>m.provider===value.provider&&m.model===value.model))n.append(e('option',{value:routeKey(value)},value.model+' · 当前绑定（列表中未获取）'))
  n.value=routeKey(value);n.addEventListener('change',()=>change(n.value?JSON.parse(n.value):null));return n
 }
 const field=(label,value,change,type='text')=>{const n=e('input',{'aria-label':label,type,value:value??''});n.addEventListener('input',()=>change(n.value));return e('label',{class:'model-field'},e('span',{},label),n)}
 const notify=msg=>{message=msg;const box=dialog.querySelector('.model-message');if(box)box.textContent=msg}
 const refresh=async()=>{if(loading)return;loading=true;notify('正在刷新模型列表……');try{const r=await api('catalog',{refresh:true});catalog=r.models;sources=r.sources||[];message=(r.statuses||[]).filter(s=>!s.ok).map(s=>s.error).join('；')||'已获取 '+catalog.length+' 个模型，角色绑定已保留';render()}catch(err){notify(err.message)}finally{loading=false}}
 const save=async activate=>{try{if(activate)config.activeProfileId=editing;await api('settings',config);await reload();onSaved?.();dialog.close()}catch(err){notify(err.message)}}
 function render(){
  const previousScroll=dialog.querySelector('.model-body')?.scrollTop||0
  const body=e('div',{class:'model-body'});dialog.replaceChildren(e('header',{},e('div',{},e('div',{class:'brand'},'CAST / MODEL ROUTING'),e('h2',{},'角色与模型')),button('关闭',()=>dialog.close(),'ghost')),e('nav',{class:'model-tabs'},button('使用配置',()=>{tab='profiles';render()},tab==='profiles'?'active':''),button('API 来源',()=>{tab='sources';render()},tab==='sources'?'active':''),button('刷新模型列表',refresh)),e('p',{class:'model-message',role:'status'},message),body)
  if(tab==='sources'){renderSources(body);return}
  const p=profile();p.limits.reasoning||='low';const providers=[...new Map(catalog.map(m=>[m.provider,m.providerName||m.provider]))]
  const rail=e('aside',{class:'profile-rail'},...config.profiles.map(row=>button(row.name+(row.id===config.activeProfileId?' · 当前':''),()=>{editing=row.id;render()},row.id===editing?'selected':'')),button('复制为新配置',()=>{if(config.profiles.length>=12){notify('最多保存 12 套配置');return}const copy=structuredClone(p);copy.id='profile-'+crypto.randomUUID().slice(0,8);copy.name=p.name+' 副本';config.profiles.push(copy);editing=copy.id;render()}))
  if(config.profiles.length>1)rail.append(button('移除此配置',()=>{config.profiles=config.profiles.filter(row=>row.id!==editing);if(config.activeProfileId===editing)config.activeProfileId=config.profiles[0].id;editing=config.profiles[0].id;message='已从草稿移除，保存后生效；进行中的任务不变';render()},'ghost'))
  const content=e('section',{class:'profile-content'}),controls=e('div',{class:'model-controls'},field('配置名称',p.name,v=>p.name=v),e('label',{class:'model-field'},e('span',{},'统一模型'),picker('统一模型',p.common,v=>{p.common=v;renderRows()},'沿用 DSH 当前模型')))
  content.append(controls,e('p',{class:'footnote'},'未单独指定的角色跟随统一模型。只调用当前交流或参与任务的角色，不会同时唤醒全部 22 位。'))
  const filter=e('select',{'aria-label':'筛选 API 来源'},e('option',{value:''},'所有 API'),providers.map(([id,label])=>e('option',{value:id},label)));filter.value=providerFilter;filter.onchange=()=>{providerFilter=filter.value;render()}
  const search=e('input',{'aria-label':'搜索角色',placeholder:'搜索角色',value:query});search.oninput=()=>{query=search.value;renderRows()}
  content.append(e('div',{class:'model-actions'},filter,search,button('按角色匹配',async()=>{try{const result=await api('model-match',{provider:providerFilter});for(const[id,route]of Object.entries(result.roles)){p.roles[id]||={};p.roles[id].default=route.default}notify('已匹配 '+Object.keys(result.roles).length+' 位角色，其他角色保留现有选择或跟随统一模型');renderRows()}catch(err){notify(err.message)}}),button('全部跟随统一模型',()=>{p.roles={};p.routes={};render();notify('全部角色已跟随统一模型；保存后生效')})))
  const table=e('div',{class:'model-roster'});content.append(e('div',{class:'model-roster-heading'},e('span',{},'角色型号'),e('small',{class:'model-roster-count'})),table)
  function renderRows(){
   const rows=state.roles.filter(r=>(r.name+' '+r.id).toLowerCase().includes(query.toLowerCase()))
   content.querySelector('.model-roster-count').textContent=rows.length+' / '+state.roles.length+' 位角色'
   table.replaceChildren(...rows.map(r=>{const selected=p.roles[r.id]?.default,effective=selected||p.common;return e('div',{class:'model-role-row','data-role':r.id,'data-bound':String(!!selected),style:'--role-accent:'+roleStyle(r.id).accent},e('div',{class:'model-role-identity'},portraitBadge(r),e('span',{},e('b',{},r.name),e('small',{},r.id))),picker('模型 · '+r.name,selected,v=>{p.roles[r.id]||={};if(v)p.roles[r.id].default=v;else delete p.roles[r.id].default;renderRows()}),e('span',{class:'effective-model'},effective?.model||'DSH 当前模型'))}))
   if(!rows.length)table.append(e('p',{class:'model-roster-empty',role:'status'},'没有找到对应角色，试试其他名字。'))
  }
  renderRows()
  const advanced=e('details',{class:'model-advanced',...(advancedOpen?{open:''}:{}),ontoggle:event=>advancedOpen=event.target.open},e('summary',{},'用量与任务类型设置'),e('p',{class:'footnote'},'DSH 输出上限按每次请求生效；WorkBuddy 按其平台规则和工具轮数计量。两者均非整项工作的费用上限，结果中会记录实际用量。'),e('div',{class:'model-controls'},field('后台任务并发',p.limits.concurrency,v=>p.limits.concurrency=Number(v),'number'),field('每次输出 Token 上限',p.limits.maxOutputTokens,v=>p.limits.maxOutputTokens=Number(v),'number'),field('携带记忆字符上限',p.limits.memoryChars,v=>p.limits.memoryChars=Number(v),'number')),e('label',{class:'model-task-row'},e('span',{},'思考强度'),(()=>{const n=e('select',{'aria-label':'思考强度'},...Object.entries({low:'节省 · 低',high:'深入 · 高',max:'最高',inherit:'沿用模型设置'}).map(([id,label])=>e('option',{value:id},label)));n.value=p.limits.reasoning;n.onchange=()=>p.limits.reasoning=n.value;return n})()),e('h3',{},'公共任务类型覆盖'),...Object.entries(types).map(([kind,label])=>e('label',{class:'model-task-row'},e('span',{},label),picker('任务模型 · '+label,p.routes[kind],v=>{if(v)p.routes[kind]=v;else delete p.routes[kind]},'跟随统一模型'))),e('p',{class:'footnote'},'单个角色的明确绑定优先于公共任务类型配置。原有角色任务专属配置会继续保留。'));content.insertBefore(advanced,content.querySelector('.model-roster-heading'))
  const rolePicker=e('select',{'aria-label':'任务专属角色'},...state.roles.map(r=>e('option',{value:r.id},r.name)));rolePicker.value=taskRole;rolePicker.onchange=()=>{taskRole=rolePicker.value;render()}
  advanced.append(e('h3',{},'角色任务专属覆盖'),rolePicker,...Object.entries(types).map(([kind,label])=>e('label',{class:'model-task-row'},e('span',{},label),picker('专属模型 · '+label,p.roles[taskRole]?.[kind],v=>{p.roles[taskRole]||={};if(v)p.roles[taskRole][kind]=v;else delete p.roles[taskRole][kind]},'跟随角色默认型号'))))
  body.append(rail,content);dialog.append(e('footer',{class:'model-footer'},e('span',{class:'footnote'},'切换配置只影响新任务，进行中的任务使用提交时的配置。'),button('仅保存',()=>save(false)),button('保存并启用',()=>save(true),'primary')));body.scrollTop=previousScroll
 }
 function renderSources(body){
  body.classList.add('sources-body');const list=e('div',{class:'api-list'})
  for(const source of sources)list.append(e('article',{},e('b',{},source.name),e('small',{},source.baseURL),e('span',{},(source.keyConfigured?'密钥已配置':'未配置密钥')+' · '+source.modelCount+' 个模型'),button('编辑',()=>{providerDraft={...source,apiKey:''};render()},'ghost')))
  body.append(e('p',{class:'footnote'},'DSH 中已有的 API 会直接出现在模型列表。这里可另外接入 GO Plan 或 OpenAI 兼容 API。密钥存入 DSH 凭据服务，不进入游戏存档。兼容连接器用于文本和工具调用；图片任务可选 DSH 已配置的多模态来源。'),list,e('div',{class:'model-actions'},button('接入 GO Plan',()=>{providerDraft={id:'party-go',name:'GO Plan',kind:'opencode-go',baseURL:'https://opencode.ai/inference/go/openai/v1',apiKey:''};render()}),button('添加兼容 API',()=>{providerDraft={name:'自定义 API',kind:'openai-compatible',baseURL:'',catalogURL:'',apiKey:''};render()})))
  for(const source of sources){const row=e('div',{class:'model-actions'}),options=catalog.filter(m=>m.provider===source.id),select=e('select',{'aria-label':'测试型号 · '+source.name},...options.map(m=>e('option',{value:m.model},m.name||m.model)));if(options.some(m=>m.model==='glm-5.3-flash'))select.value='glm-5.3-flash';row.append(e('span',{class:'footnote'},source.name),select,button('测试连接',async()=>{notify('正在发送一次简短的连接测试……');try{const result=await api('provider-test',{id:source.id,model:select.value});notify(source.name+' · '+result.model+'：'+result.reply)}catch(err){notify(err.message)}}));body.append(row)}
  if(!providerDraft)return;const draft=providerDraft,form=e('section',{class:'api-form'},e('h3',{},draft.id?'配置 API':'新增 API'),field('API 名称',draft.name,v=>draft.name=v))
  if(draft.kind!=='opencode-go')form.append(field('API Base URL',draft.baseURL,v=>draft.baseURL=v),field('模型目录 URL（留空使用 Base URL/models）',draft.catalogURL,v=>draft.catalogURL=v))
  else form.append(e('p',{class:'footnote'},'使用 GO Plan 官方接口及独立会话标识。账号的套餐与 Extra Usage 设置仍由服务端决定。'))
  form.append(field('API Key（留空保留已配置密钥）','',v=>draft.apiKey=v,'password'),e('div',{class:'model-actions'},button('保存 API 并获取模型',async()=>{try{const r=await api('provider-save',draft);draft.apiKey='';const data=await api('catalog',{refresh:true});catalog=data.models;sources=data.sources||[];providerDraft=null;message=r.status.ok?'已配置 API，获取 '+r.status.count+' 个模型':r.status.error;render()}catch(err){draft.apiKey='';notify(err.message)}},'primary'),button('取消编辑',()=>{providerDraft=null;render()})))
  body.append(form)
 }
 message='正在读取模型目录…';render()
 try{const r=await api('catalog',{});catalog=r.models;sources=r.sources||[];message='';render()}catch(err){message=err.message;render()}
}
