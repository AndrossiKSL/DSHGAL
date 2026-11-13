import React,{useEffect,useRef,useState} from 'react'
import {SceneCanvas} from './scene-canvas'
import {defaultSceneLayout,sceneElement,cloneScene,normalizeSceneLayout,moveSceneLayer,sceneGestureRect} from '../scene-layout'
const h=React.createElement,storageKey='whg-scene-layout-drafts-v1'
const id=()=>globalThis.crypto?.randomUUID?.()||'element-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)
const bindingNames:any={background:'跟随场景背景',character:'跟随角色与动作',speaker:'动态角色名',line:'动态台词',narration:'动态旁白',affection:'动态好感度',clock:'动态时间',input:'输入与发送',choices:'剧情选项',tools:'游戏菜单'}

export function SceneEditor({callApi,art,context,onClose,onSaved,onPreview,onAssets,hidden=false}:any):any{
  const [scene,setScene]=useState<any>(defaultSceneLayout()),[meta,setMeta]=useState<any>({id:'',name:'新布局',revision:0}),[documents,setDocuments]=useState<any[]>([])
  const [selected,setSelected]=useState('character'),[assets,setAssets]=useState<any>({items:[],roles:[]}),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('')
  const [historyCounts,setHistoryCounts]=useState({undo:0,redo:0}),[recovery,setRecovery]=useState<any>(null),[assetSearch,setAssetSearch]=useState('')
  const current=useRef(scene),metaRef=useRef(meta),undos=useRef<any[]>([]),redos=useRef<any[]>([]),gesture=useRef<any>(null),alive=useRef(true),saved=useRef(''),propertyStart=useRef<any>(null)
  current.current=scene;metaRef.current=meta
  const call=async(action:string,args:any={})=>{const r=await callApi(action,args);if(r?.ok===false||r?.error)throw new Error(r.error||'操作失败');return r}
  const history=()=>setHistoryCounts({undo:undos.current.length,redo:redos.current.length})
  const set=(next:any)=>{current.current=next;setScene(next)}
  const push=(before:any)=>{if(JSON.stringify(before)===JSON.stringify(current.current))return;undos.current=[...undos.current.slice(-59),before];redos.current=[];history()}
  const edit=(fn:any)=>{const before=cloneScene(current.current);set(fn(cloneScene(current.current)));push(before)}
  const patch=(key:string,fields:any)=>edit((s:any)=>({...s,elements:s.elements.map((e:any)=>e.id===key?{...e,...fields}:e)}))
  const writeDraft=()=>{if(!loaded)return;try{const all=JSON.parse(localStorage.getItem(storageKey)||'{}');all[metaRef.current.id||'new']={...metaRef.current,scene:current.current};localStorage.setItem(storageKey,JSON.stringify(all))}catch{}}
  const loadDocument=(document:any,restore=true)=>{
    const m=document?{id:document.id,name:document.name,revision:document.revision}:{id:'',name:'新布局',revision:0}
    let next=document?.scene||defaultSceneLayout();saved.current=JSON.stringify({name:m.name,scene:next});setRecovery(null)
    if(restore)try{const draft=JSON.parse(localStorage.getItem(storageKey)||'{}')[m.id||'new'];if(draft){if(draft.revision===m.revision){next=normalizeSceneLayout(draft.scene);m.name=draft.name;setMessage('已恢复浏览器中的布局草稿')}else setRecovery(draft)}}catch{}
    setMeta(m);metaRef.current=m;set(next);undos.current=[];redos.current=[];history();setSelected(next.elements[0]?.id||'')
  }
  const reloadList=async()=>{const r=await call('scene-layout-state');if(alive.current)setDocuments(r.documents);return r}
  useEffect(()=>{alive.current=true;void Promise.all([call('scene-layout-state'),call('asset-list')]).then(([state,library])=>{if(alive.current){setDocuments(state.documents);setAssets(library);loadDocument(state.document);setLoaded(true)}}).catch(e=>setError(e.message));return()=>{alive.current=false}},[])
  useEffect(()=>{if(!loaded)return;const timer=setTimeout(writeDraft,350);return()=>clearTimeout(timer)},[scene,meta,loaded])
  const run=async(fn:any)=>{if(busy)return;setBusy(true);setError('');try{await fn()}catch(e:any){if(alive.current)setError(e.message)}finally{if(alive.current)setBusy(false)}}
  const save=async(apply=false,copy=false)=>{
    const r=await call('scene-layout-save',{id:copy?'':metaRef.current.id,name:metaRef.current.name,expectedRevision:copy?undefined:metaRef.current.revision,scene:current.current,apply})
    const oldKey=metaRef.current.id||'new';setMeta({id:r.document.id,name:r.document.name,revision:r.document.revision});metaRef.current=r.document
    saved.current=JSON.stringify({name:r.document.name,scene:r.document.scene});set(r.document.scene)
    try{const drafts=JSON.parse(localStorage.getItem(storageKey)||'{}');delete drafts[oldKey];localStorage.setItem(storageKey,JSON.stringify(drafts))}catch{}
    onSaved(r.view);await reloadList();setMessage(apply?'布局已保存并应用到游戏':'布局已保存')
  }
  const add=(type:string,binding='')=>{const e={...sceneElement(type,id()),binding,name:bindingNames[binding]||sceneElement(type).name,z:Math.max(0,...current.current.elements.map((r:any)=>r.z))+1};if(type==='container'){e.w=700;e.h=binding==='input'?64:180}edit((s:any)=>({...s,elements:[...s.elements,e]}));setSelected(e.id)}
  const duplicate=()=>{const e=current.current.elements.find((r:any)=>r.id===selected);if(!e)return;const copy={...e,id:id(),name:e.name+' 副本',x:e.x+20,y:e.y+20,z:Math.max(...current.current.elements.map((r:any)=>r.z))+1};edit((s:any)=>({...s,elements:[...s.elements,copy]}));setSelected(copy.id)}
  const remove=()=>{const e=current.current.elements.find((r:any)=>r.id===selected);if(!e||e.locked)return;edit((s:any)=>({...s,elements:s.elements.filter((r:any)=>r.id!==selected)}));setSelected('')}
  const undo=()=>{if(!undos.current.length)return;redos.current.push(cloneScene(current.current));set(undos.current.pop());history()}
  const redo=()=>{if(!redos.current.length)return;undos.current.push(cloneScene(current.current));set(redos.current.pop());history()}
  const reorder=(direction:string)=>edit((s:any)=>moveSceneLayer(s,selected,direction))
  const begin=(event:any,e:any,scale:number,mode='move')=>{
    if(e.locked||event.button!==0)return;event.preventDefault();propertyStart.current=null
    gesture.current={element:cloneScene(e),scene:cloneScene(current.current),scale,mode,x:event.clientX,y:event.clientY,pointer:event.pointerId}
    const stage=event.currentTarget.closest('.whse-stage')?.getBoundingClientRect()
    if(stage){gesture.current.cx=stage.left+(e.x+e.w/2)*scale;gesture.current.cy=stage.top+(e.y+e.h/2)*scale;gesture.current.angle=Math.atan2(event.clientY-gesture.current.cy,event.clientX-gesture.current.cx)}
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }
  useEffect(()=>{
    const move=(ev:PointerEvent)=>{const g=gesture.current;if(!g||ev.pointerId!==g.pointer)return;const snap=ev.altKey?1:current.current.snap?current.current.grid:1;let fields:any
      if(g.mode==='rotate'){let rotation=g.element.rotation+(Math.atan2(ev.clientY-g.cy,ev.clientX-g.cx)-g.angle)*180/Math.PI;if(ev.shiftKey)rotation=Math.round(rotation/15)*15;fields={rotation}}
      else fields=sceneGestureRect(g.element,g.mode,(ev.clientX-g.x)/g.scale,(ev.clientY-g.y)/g.scale,snap)
      set({...current.current,elements:current.current.elements.map((e:any)=>e.id===g.element.id?{...e,...fields}:e)})}
    const finish=(ev:PointerEvent)=>{const g=gesture.current;if(g&&ev.pointerId===g.pointer){gesture.current=null;push(g.scene)}}
    const cancel=(ev:PointerEvent)=>{const g=gesture.current;if(g&&ev.pointerId===g.pointer){set(g.scene);gesture.current=null}}
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',finish);window.addEventListener('pointercancel',cancel)
    return()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',finish);window.removeEventListener('pointercancel',cancel)}
  },[])
  useEffect(()=>{if(hidden)return;const key=(ev:KeyboardEvent)=>{
    const target=ev.target as HTMLElement,typing=['INPUT','TEXTAREA','SELECT'].includes(target?.tagName)||target?.isContentEditable,mod=ev.ctrlKey||ev.metaKey
    if(mod&&ev.key.toLowerCase()==='s'){ev.preventDefault();void run(()=>save(false));return}if(typing)return
    if(mod&&ev.key.toLowerCase()==='z'){ev.preventDefault();ev.shiftKey?redo():undo()}
    else if(mod&&ev.key.toLowerCase()==='y'){ev.preventDefault();redo()}
    else if(mod&&ev.key.toLowerCase()==='d'){ev.preventDefault();duplicate()}
    else if(ev.key==='Delete'||ev.key==='Backspace'){ev.preventDefault();remove()}
    else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(ev.key)){const e=current.current.elements.find((r:any)=>r.id===selected);if(e&&!e.locked){ev.preventDefault();const n=ev.shiftKey?10:1;patch(selected,{x:e.x+(ev.key==='ArrowLeft'?-n:ev.key==='ArrowRight'?n:0),y:e.y+(ev.key==='ArrowUp'?-n:ev.key==='ArrowDown'?n:0)})}}
  };window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[hidden,selected,meta,busy])
  const upload=async(files:FileList|null)=>{if(!files)return;for(const file of Array.from(files)){if(file.size>18*1024*1024)throw new Error('图片超过 18MB');const dataUrl=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(new Error('图片读取失败'));r.readAsDataURL(file)});const r=await call('asset-import',{characterId:context.roleId,kind:'other',label:file.name,dataUrl});const element={...sceneElement('image',id()),name:file.name,assetId:r.id,x:120,y:120,z:Math.max(...current.current.elements.map((e:any)=>e.z))+1};edit((s:any)=>({...s,elements:[...s.elements,element]}));setSelected(element.id)}setAssets(await call('asset-list'))}
  const exportFile=async()=>{const ids=[...new Set(current.current.elements.map((e:any)=>e.assetId).filter(Boolean))];const embedded=[];for(const assetId of ids){const a=await call('asset-data',{id:assetId});embedded.push({id:a.id,label:a.label,dataUrl:a.dataUrl,kind:a.kind})}const blob=new Blob([JSON.stringify({format:'whale-scene-layout',version:1,name:metaRef.current.name,scene:current.current,assets:embedded},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=metaRef.current.name+'.gal-scene.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  const importFile=async(file:File|undefined)=>{if(!file)return;if(file.size>100*1024*1024)throw new Error('场景文件超过 100MB');const raw=JSON.parse(await file.text());const next=normalizeSceneLayout(raw.scene||raw),map:any={};if(raw.assets){if(!Array.isArray(raw.assets)||raw.assets.length>80)throw new Error('场景内嵌素材清单无效');for(const a of raw.assets){const r=await call('asset-import',{characterId:context.roleId,kind:a.kind||'other',label:a.label||'导入素材',dataUrl:a.dataUrl});map[a.id]=r.id}for(const e of next.elements)if(map[e.assetId])e.assetId=map[e.assetId]}edit(()=>next);setMeta({id:'',name:raw.name||'导入布局',revision:0});setAssets(await call('asset-list'));setMessage('场景已导入为新布局，保存并应用后用于游戏')}
  const button=(name:string,fn:any,disabled=false,primary=false)=>h('button',{type:'button',disabled:busy||!loaded||disabled,className:primary?'primary':'',onClick:()=>run(fn)},name)
  const e=scene.elements.find((r:any)=>r.id===selected)
  const field=(name:string,key:string,type='text')=>h('label',null,h('span',null,name),h('input',{'aria-label':name,type,value:e?.[key]??'',disabled:!e||e.locked,onFocus:()=>{propertyStart.current=cloneScene(current.current)},onChange:(ev:any)=>{const value=type==='number'?Number(ev.target.value):ev.target.value;if(type==='number'&&!Number.isFinite(value))return;set({...current.current,elements:current.current.elements.map((r:any)=>r.id===selected?{...r,[key]:value}:r)})},onBlur:()=>{if(propertyStart.current){push(propertyStart.current);propertyStart.current=null}}}))
  const choose=(name:string,key:string,options:any[])=>h('label',null,h('span',null,name),h('select',{'aria-label':name,value:e?.[key]||'',disabled:!e||e.locked,onChange:(ev:any)=>patch(selected,{[key]:ev.target.value})},...options.map(([key,label])=>h('option',{key,value:key},label))))
  const bindingOptions=e?.type==='image'?['background','character']:e?.type==='text'?['speaker','line','narration','affection','clock']:e?.type==='container'?['input','choices','tools']:[]
  const dirty=JSON.stringify({name:meta.name,scene})!==saved.current
  return h('section',{className:'whse-editor',style:hidden?{display:'none'}:undefined,role:'dialog','aria-label':'GAL 场景编辑器','aria-modal':true},
    h('header',{className:'whse-header'},h('strong',null,'GAL 场景编辑器'),h('input',{'aria-label':'布局名称',value:meta.name,onChange:(ev:any)=>setMeta({...meta,name:ev.target.value}),style:{background:'#101c2c',border:'1px solid #ffffff30',padding:5,maxWidth:180}}),h('span',null,dirty?'未保存 · 草稿保留在浏览器':meta.id?'已保存':'默认布局 · 尚未另存'),h('div',{className:'whse-right'},button('保存布局',()=>save()),' ',button('保存并应用',()=>save(true),false,true),' ',button('预览游戏',()=>{writeDraft();onPreview({id:meta.id,scene})}),' ',h('button',{type:'button',onClick:()=>{writeDraft();onClose()}},'关闭编辑器'))),
    h('div',{className:'whse-toolbar',role:'toolbar','aria-label':'场景编辑工具'},
      h('select',{'aria-label':'载入布局',value:meta.id,onChange:(ev:any)=>run(async()=>{writeDraft();if(!ev.target.value)loadDocument(null,false);else loadDocument((await call('scene-layout-state',{id:ev.target.value})).document)})},h('option',{value:''},'新布局'),...documents.map(d=>h('option',{key:d.id,value:d.id},d.name))),
      button('另存为新布局',()=>save(false,true)),button('删除布局',async()=>{if(window.confirm('删除这套布局？素材和剧情存档会保留。')){const r=await call('scene-layout-delete',{id:meta.id,expectedRevision:meta.revision});onSaved(r.view);loadDocument(null,false);await reloadList()}},!meta.id),button('添加文字',()=>add('text')),button('添加图片',()=>add('image')),button('添加形状',()=>add('rect')),button('添加按钮',()=>add('button')),
      h('select',{'aria-label':'添加动态元素',value:'',onChange:(ev:any)=>{const v=ev.target.value;if(v)add(['input','choices','tools'].includes(v)?'container':['background','character'].includes(v)?'image':'text',v)}},h('option',{value:''},'添加动态元素'),...Object.entries(bindingNames).map(([key,value]:any)=>h('option',{key,value:key},value))),
      button('复制',duplicate,!e),button('删除',remove,!e||e.locked),button('上移',()=>reorder('up'),!e),button('下移',()=>reorder('down'),!e),button('置顶',()=>reorder('top'),!e),button('置底',()=>reorder('bottom'),!e),
      button('撤销',undo,!historyCounts.undo),button('重做',redo,!historyCounts.redo),
      h('label',null,h('input',{type:'checkbox',checked:scene.showGrid,onChange:(ev:any)=>edit((s:any)=>({...s,showGrid:ev.target.checked}))}),'网格'),h('label',null,h('input',{type:'checkbox',checked:scene.snap,onChange:(ev:any)=>edit((s:any)=>({...s,snap:ev.target.checked}))}),'吸附'),
      h('label',null,'导入图片',h('input',{type:'file','aria-label':'导入编辑素材',accept:'image/png,image/webp,image/jpeg,image/avif',multiple:true,style:{width:80},onChange:(ev:any)=>{const files=Array.from(ev.target.files||[]);ev.target.value='';run(()=>upload(files as any))}})),
      h('label',null,'导入场景',h('input',{type:'file','aria-label':'导入场景 JSON',accept:'.json,application/json',style:{width:80},onChange:(ev:any)=>{const f=ev.target.files?.[0];ev.target.value='';run(()=>importFile(f))}})),button('导出场景',exportFile),button('资产管理 / 生成',()=>{writeDraft();onAssets()}),button('恢复默认布局',async()=>{const r=await call('scene-layout-publish',{id:''});onSaved(r.view);setMessage('游戏已恢复默认布局，编辑中的内容仍保留')}),
    ),
    h('div',{className:'whse-body'},
      h('aside',{className:'whse-side'},h('h4',null,'图层 · '+scene.elements.length),...scene.elements.slice().sort((a:any,b:any)=>b.z-a.z).map((r:any)=>h('div',{key:r.id,className:'whse-tree-row'+(r.id===selected?' is-selected':'')+(r.hidden?' is-hidden':'')},h('button',{type:'button','data-layer-id':r.id,onClick:()=>setSelected(r.id)},r.name),h('button',{type:'button','aria-label':(r.locked?'解锁 ':'锁定 ')+r.name,onClick:()=>patch(r.id,{locked:!r.locked})},r.locked?'锁':'开'),h('button',{type:'button','aria-label':(r.hidden?'显示 ':'隐藏 ')+r.name,onClick:()=>patch(r.id,{hidden:!r.hidden})},r.hidden?'隐':'显'))),
        h('h4',null,'舞台'),...(['width','height','grid']as string[]).map((key,index)=>h('label',{key,style:{display:'grid',gap:5,margin:'10px 0'}},['舞台宽度','舞台高度','网格尺寸'][index],h('input',{type:'number','aria-label':['舞台宽度','舞台高度','网格尺寸'][index],value:scene[key],style:{width:'100%',background:'#121e2f',border:'1px solid #ffffff28',padding:5},onChange:(ev:any)=>{const n=Number(ev.target.value);if(n>0)edit((s:any)=>({...s,[key]:n}))}})))),
      h('main',{className:'whse-workspace'},loaded?h(SceneCanvas,{scene,art,callApi,context,editing:true,selectedId:selected,onSelect:setSelected,onElementPointer:begin,onHandlePointer:begin}):h('p',null,'正在读取布局和素材…')),
      h('aside',{className:'whse-side whse-properties'},h('h4',null,e?'属性 · '+e.name:'选择一个元素'),e?h(React.Fragment,null,
        field('元素名称','name'),field('X','x','number'),field('Y','y','number'),field('宽度','w','number'),field('高度','h','number'),field('旋转','rotation','number'),field('透明度','opacity','number'),field('层级','z','number'),
        choose('动态绑定','binding',[['','静态内容'],...bindingOptions.map(key=>[key,bindingNames[key]])]),
        e.type==='image'?h(React.Fragment,null,choose('图片素材','assetId',[['','使用内置图或动态绑定'],...assets.items.filter((a:any)=>!assetSearch||a.label.includes(assetSearch)).map((a:any)=>[a.id,a.label])]),h('label',null,'筛选素材',h('input',{'aria-label':'筛选素材',value:assetSearch,onChange:(ev:any)=>setAssetSearch(ev.target.value)})),field('内置美术键','artKey'),choose('适配方式','fit',[['contain','完整显示'],['cover','填满裁切'],['fill','拉伸填满']])):null,
        e.type==='text'||e.type==='button'?h(React.Fragment,null,h('label',null,'静态文字',h('textarea',{'aria-label':'静态文字',value:e.text,disabled:e.locked,onFocus:()=>{propertyStart.current=cloneScene(current.current)},onChange:(ev:any)=>set({...current.current,elements:current.current.elements.map((r:any)=>r.id===selected?{...r,text:ev.target.value}:r)}),onBlur:()=>{if(propertyStart.current){push(propertyStart.current);propertyStart.current=null}}})),field('字号','fontSize','number'),choose('字体','fontFamily',[['Microsoft YaHei','微软雅黑'],['SimSun','宋体'],['SimHei','黑体'],['KaiTi','楷体'],['Georgia','Georgia'],['serif','系统衬线']]),choose('对齐','align',[['left','左对齐'],['center','居中'],['right','右对齐']]),field('文字颜色','color')):null,
        e.type==='button'?choose('按钮动作','action',[['','仅作装饰'],['advance','继续剧情'],['history','历史'],['save','存档'],['load','读档'],['assets','资产管理'],['editor','编辑布局'],['exit','返回'],['cg','CG 鉴赏'],['auto','自动'],['skip','快进'],['story','进入剧情']]):null,
        field('背景颜色','background'),field('边框颜色','borderColor'),field('边框宽度','borderWidth','number'),field('圆角','radius','number'),field('内边距','padding','number'),
        h('div',{className:'whse-property-actions'},button('水平居中',()=>patch(selected,{x:(scene.width-e.w)/2}),e.locked),button('垂直居中',()=>patch(selected,{y:(scene.height-e.h)/2}),e.locked)),
      ):null),
    ),
    h('footer',{className:'whse-status'+(error?' whse-error':'')},error||message||'拖动移动 · 手柄缩放 / 旋转 · Alt 临时关闭吸附 · Shift 旋转按 15° · 方向键微调 · Ctrl+Z / Y 撤销重做'),
    recovery?h('div',{className:'whse-status'},'检测到较旧版本的浏览器草稿。',button('恢复草稿为新布局',()=>{loadDocument({id:'',name:recovery.name+' 恢复副本',revision:0,scene:normalizeSceneLayout(recovery.scene)},false);setRecovery(null)})):null,
  )
}
