import React, {useEffect,useLayoutEffect,useRef,useState} from 'react'
const h=React.createElement
const imageCache=new Map<string,Promise<string>>()

export function SceneCanvas({scene,art,callApi,context={},slots={},editing=false,selectedId='',onSelect,onElementPointer,onHandlePointer,onAction,onAdvance}:any):any {
  const host=useRef<HTMLDivElement|null>(null),[size,setSize]=useState({width:960,height:540}),[images,setImages]=useState<any>({}),[error,setError]=useState('')
  useLayoutEffect(()=>{const el=host.current;if(!el)return;const update=()=>setSize({width:el.clientWidth,height:el.clientHeight});update();const observer=new ResizeObserver(update);observer.observe(el);return()=>observer.disconnect()},[])
  const ids=Array.from(new Set(scene.elements.filter((e:any)=>!e.hidden&&e.assetId).map((e:any)=>e.assetId))).join('|')
  useEffect(()=>{
    let live=true;const found:any={};setError('')
    const fetchOne=async(id:string)=>{
      if(!imageCache.has(id)){
        const request=callApi('asset-data',{id}).then((r:any)=>{if(!r.ok||!r.dataUrl)throw new Error(r.error||'素材读取失败');return r.dataUrl}).catch((e:any)=>{imageCache.delete(id);throw e})
        imageCache.set(id,request);if(imageCache.size>48)imageCache.delete(imageCache.keys().next().value!)
      }
      found[id]=await imageCache.get(id)
    }
    void(async()=>{const wanted=ids?ids.split('|'):[];for(let i=0;i<wanted.length;i+=4)await Promise.all(wanted.slice(i,i+4).map(fetchOne));if(live)setImages(found)})().catch((e:any)=>{if(live)setError(e.message)})
    return()=>{live=false}
  },[ids])
  const scale=Math.max(.05,Math.min(size.width/scene.width,size.height/scene.height))
  const preview:any={speaker:'鲸鱼娘',line:'布局会保留真实台词和输入。试着拖动角色、文字与对话框，找到你喜欢的构图。',narration:'窗外的海水映着灯光，她合上书，转向你。',affection:'Lv. 1 · 好感 0 / 30',clock:'第一夜 · 打烊后的工坊'}
  const placeholder=(binding:string)=>binding==='input'?h('div',{className:'whse-input'},h('input',{readOnly:true,placeholder:'这里绑定真实的对话输入'}),h('button',{type:'button',disabled:true},'发送')):binding==='choices'?h('div',{className:'whse-choices'},h('button',{type:'button'},'陪她整理旧书'),h('button',{type:'button'},'聊聊窗外的海')):h('div',{className:'whse-tools'},'历史　存档　读取　资产　编辑布局')
  return h('div',{ref:host,className:'whse-canvas-host','data-editor':editing},
    h('div',{className:'whse-stage','data-scale':scale,style:{width:scene.width,height:scene.height,left:'50%',top:'50%',transform:'translate(-50%,-50%) scale('+scale+')',transformOrigin:'center'}},
      ...scene.elements.filter((e:any)=>!e.hidden).slice().sort((a:any,b:any)=>a.z-b.z).map((e:any)=>{
        const source=e.assetId?images[e.assetId]:e.artKey?art(e.artKey):e.binding==='character'?(e.roleId?context.characters?.[e.roleId]:context.character):e.binding==='background'?context.background:''
        const style:any={position:'absolute',left:e.x,top:e.y,width:e.w,height:e.h,transform:'rotate('+e.rotation+'deg)',opacity:e.opacity,zIndex:e.z,background:e.background,color:e.color,
          border:e.borderWidth+'px solid '+e.borderColor,borderRadius:e.radius,boxSizing:'border-box',fontSize:e.fontSize,fontFamily:e.fontFamily,textAlign:e.align,padding:e.type==='image'?0:e.padding,
          pointerEvents:editing?'auto':e.type==='button'||e.type==='container'||e.binding==='line'?'auto':'none',cursor:editing?(e.locked?'default':'move'):e.type==='button'||e.binding==='line'?'pointer':'default'}
        let body:any
        if(e.type==='image')body=source?h('img',{src:source,alt:e.name,draggable:false,style:{width:'100%',height:'100%',objectFit:e.fit,display:'block',borderRadius:'inherit',pointerEvents:'none'}}):editing?h('div',{className:'whse-placeholder'},e.name):null
        else if(e.type==='container')body=editing?placeholder(e.binding):(slots[e.binding]||null)
        else if(e.type==='button')body=h('button',{type:'button',className:'whse-action',onClick:()=>!editing&&onAction?.(e.action),style:{color:'inherit',font:'inherit',textAlign:e.align}},e.text||e.name)
        else if(e.type==='text')body=h('div',{className:'whse-text',style:e.binding==='line'&&!editing?{overflowY:'auto',userSelect:'text'}:undefined,onClick:()=>!editing&&e.binding==='line'&&onAdvance?.()},e.binding?(context[e.binding]??preview[e.binding]??''):e.text)
        const selected=editing&&selectedId===e.id
        return h(React.Fragment,{key:e.id},h('div',{style,className:'whse-element'+(selected?' is-selected':''),'data-element-id':e.id,'data-binding':e.binding,
          onPointerDown:editing?(ev:any)=>{ev.stopPropagation();onSelect?.(e.id);if(!e.locked)onElementPointer?.(ev,e,scale)}:undefined},body),
          selected?h('div',{className:'whse-element whse-selection-overlay',style:{...style,zIndex:3000,background:'transparent',border:0,padding:0,opacity:1,pointerEvents:'none'}},
          selected?h('div',{className:'whse-selection',style:{borderWidth:1.5/scale},'aria-hidden':true}):null,
          selected&&!e.locked?['nw','n','ne','e','se','s','sw','w'].map(dir=>h('button',{key:dir,type:'button',className:'whse-handle whse-handle-'+dir,'aria-label':'缩放 '+dir,'data-handle':dir,style:{width:10/scale,height:10/scale,margin:-5/scale,pointerEvents:'auto'},onPointerDown:(ev:any)=>{ev.preventDefault();ev.stopPropagation();onHandlePointer?.(ev,e,scale,dir)}})):null,
          selected&&!e.locked?h('button',{type:'button',className:'whse-rotate','aria-label':'旋转元素',style:{top:-34/scale,width:16/scale,height:16/scale,marginLeft:-8/scale,pointerEvents:'auto'},onPointerDown:(ev:any)=>{ev.preventDefault();ev.stopPropagation();onHandlePointer?.(ev,e,scale,'rotate')}},'↻'):null,
          ):null,
        )
      }),
      editing&&scene.showGrid?h('div',{className:'whse-grid',style:{backgroundSize:scene.grid+'px '+scene.grid+'px'}}):null,
    ),
    error?h('div',{className:'whse-image-error',role:'status'},error):null,
  )
}
