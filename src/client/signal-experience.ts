import React,{useEffect,useLayoutEffect,useRef,useState} from 'react'
import {DetailIcon} from './signal-details'
import {PortraitCameo,SaveLeafFrame} from './signal-jewelry'
import {KEEPSAKE_TICKET} from './signal-experience-art.generated'
import {memoryEntries,readSaveAnnotation,writeSaveAnnotation,belongsToCharacter} from './keepsake-data'
export {writeSaveAnnotation} from './keepsake-data'
const h=React.createElement
const PREF_KEY='whale-galgame:ui-preferences',NOTE_KEY='whale-galgame:save-annotations'
function readLocal(key:string,fallback:any){try{return JSON.parse(localStorage.getItem(key)||'null')||fallback}catch{return fallback}}
export function useAtelierExperience(root:any){
 const[prefs,setPrefs]=useState<any>(()=>({...{effects:'full',sound:false,volume:.2},...readLocal(PREF_KEY,{})})),[toast,setToast]=useState<any>(null)
 const audio=useRef<any>(null),timer=useRef<any>(null)
 useEffect(()=>{try{localStorage.setItem(PREF_KEY,JSON.stringify(prefs))}catch{}},[prefs])
 useEffect(()=>{const el=root.current;if(!el)return;const sound=(e:any)=>{if(!prefs.sound||!e.isTrusted||!e.target.closest('button:not(:disabled)'))return;try{const Audio=(window as any).AudioContext||(window as any).webkitAudioContext;if(!Audio)return;const a=audio.current||(audio.current=new Audio());a.resume();const o=a.createOscillator(),g=a.createGain();o.type='sine';o.frequency.setValueAtTime(640,a.currentTime);o.frequency.exponentialRampToValueAtTime(920,a.currentTime+.06);g.gain.setValueAtTime(Math.max(0,Math.min(1,prefs.volume))*.16,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+.09);o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+.1)}catch{}};el.addEventListener('click',sound);return()=>el.removeEventListener('click',sound)},[prefs.sound,prefs.volume])
 useEffect(()=>()=>{clearTimeout(timer.current);audio.current?.close?.()},[])
 const notify=(message:string)=>{clearTimeout(timer.current);setToast({message,key:Date.now()});timer.current=setTimeout(()=>setToast(null),3000)}
 return{prefs,setPrefs,toast,notify}
}
export function ExperienceSettings({prefs,onChange}:any){return h('section',{className:'settings-section exp-settings'},h('h3',null,h(DetailIcon,{id:'settings'}),'界面反馈',h('small',null,'INTERFACE')),h('fieldset',null,h('legend',null,'动态效果'),...([['full','完整'],['reduced','轻量'],['off','关闭']]).map(([value,label])=>h('label',{key:value},h('input',{type:'radio',name:'atelier-effects',value,checked:prefs.effects===value,onChange:()=>onChange({...prefs,effects:value})}),h('span',null,label)))),h('label',{className:'check'},h('input',{type:'checkbox',checked:prefs.sound,onChange:(e:any)=>onChange({...prefs,sound:e.target.checked})}),h('span',null,'界面音效')),prefs.sound?h('label',{className:'exp-volume'},'音效音量',h('input',{type:'range',min:0,max:100,value:Math.round(prefs.volume*100),'aria-label':'界面音效音量',onChange:(e:any)=>onChange({...prefs,volume:Number(e.target.value)/100})}),h('output',null,Math.round(prefs.volume*100)+'%')):null,h('p',{className:'signal-note'},'动态效果同时遵循系统的减少动画设置。'))}
export function AtelierToast({value}:any){return value?h('div',{className:'exp-toast',role:'status',key:value.key},h('span',{className:'exp-stamp','aria-hidden':true},h(DetailIcon,{id:'save'})),h('span',null,value.message)):null}
export function AtelierEmpty({title,detail,icon='atlas',action,onAction}:any){return h('div',{className:'exp-empty'},h(PortraitCameo,{className:'jewel-empty-cameo'},h(DetailIcon,{id:icon})),h('strong',null,title),detail?h('p',null,detail):null,action?h('button',{type:'button',className:'system-action',onClick:onAction},action):null)}
export function AtelierLoading(){return h('div',{className:'exp-loading',role:'status'},h('i',{'aria-hidden':true}),'正在翻阅档案…')}

type Bounds={x:number,y:number,w:number,h:number,cx:number}
const boundsCache=new Map<string,Bounds>()
function silhouette(img:HTMLImageElement):Bounds{
 const key=img.currentSrc||img.src,cached=boundsCache.get(key);if(cached)return cached
 const fallback={x:0,y:0,w:img.naturalWidth,h:img.naturalHeight,cx:img.naturalWidth/2}
 try{
  const canvas=document.createElement('canvas'),scale=Math.min(1,384/img.naturalWidth);canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));const c=canvas.getContext('2d',{willReadFrequently:true});if(!c)return fallback;c.drawImage(img,0,0,canvas.width,canvas.height);const a=c.getImageData(0,0,canvas.width,canvas.height).data
  let l=canvas.width,r=0,t=canvas.height,b=0;for(let y=0;y<canvas.height;y+=2)for(let x=0;x<canvas.width;x+=2)if(a[(y*canvas.width+x)*4+3]>30){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y)}
  if(r<=l||b<=t)return fallback
  let sum=0,count=0;for(let y=t;y<t+(b-t)*.24;y+=2)for(let x=l;x<=r;x+=2)if(a[(y*canvas.width+x)*4+3]>80){sum+=x;count++}
  const value={x:l/scale,y:t/scale,w:(r-l+2)/scale,h:(b-t+2)/scale,cx:(count?sum/count:(l+r)/2)/scale};if(boundsCache.size>80)boundsCache.clear();boundsCache.set(key,value);return value
 }catch{return fallback}
}
export function CropFigure({url,mode='full',alt='',className=''}:any){
 const box=useRef<any>(null),img=useRef<any>(null),[loaded,setLoaded]=useState(false),[failed,setFailed]=useState(false),[retry,setRetry]=useState(0),[style,setStyle]=useState<any>({opacity:0})
 const fit=()=>{const el=img.current,area=box.current;if(!el?.naturalWidth||!area)return;const b=silhouette(el);let x=b.x,y=b.y,w=b.w,hh=b.h
  if(mode==='half'){hh=b.h*.58;w=Math.min(b.w,hh*.92);x=b.cx-w/2;y=b.y-b.h*.015}
  if(mode==='face'){hh=b.h*.29;w=hh*.9;x=b.cx-w/2;y=b.y-b.h*.015}
  const bw=area.clientWidth,bh=area.clientHeight,s=Math.min(bw/w,bh/hh)*.94;setStyle({position:'absolute',width:el.naturalWidth*s,height:el.naturalHeight*s,left:(bw-w*s)/2-x*s,top:(bh-hh*s)/2-y*s,opacity:1,maxWidth:'none',maxHeight:'none'})}
 useLayoutEffect(()=>{fit();if(!box.current)return;const observer=new ResizeObserver(fit);observer.observe(box.current);return()=>observer.disconnect()},[mode,url,loaded])
 useEffect(()=>{setLoaded(false);setFailed(false);setStyle({opacity:0})},[url,retry])
 return h('span',{className:'exp-figure '+className,ref:box,'data-crop':mode},h('img',{key:url+'-'+retry,ref:img,src:retry&&!String(url).startsWith('data:')?url+(String(url).includes('?')?'&':'?')+'retry='+retry:url,alt,style,onLoad:()=>{setLoaded(true);setFailed(false);fit()},onError:()=>setFailed(true),draggable:false}),failed?h('span',{className:'exp-image-failure'},'图片暂未载入',h('button',{type:'button',onClick:()=>setRetry(retry+1)},'重试')):!loaded?h('span',{className:'exp-image-loading','aria-label':'图片载入中'}):null)
}
export function CropControls({value,onChange,label='查看范围'}:any){return h('div',{className:'exp-crop-controls',role:'group','aria-label':label},...([['full','全身'],['half','半身'],['face','表情']]).map(([id,text])=>h('button',{key:id,type:'button','aria-pressed':value===id,onClick:()=>onChange(id)},text)))}
export function AtelierArtViewer({image,onClose}:any){
 const rows=image.rows?.length?image.rows:[image],[index,setIndex]=useState(Math.max(0,Number(image.index)||0)),[crop,setCrop]=useState(image.crop||'full');const row=rows[index]||image,figure=row.type==='action'||row.character
 useEffect(()=>{setIndex(Math.max(0,Number(image.index)||0));setCrop(image.crop||'full')},[image])
 const move=(delta:number)=>setIndex(n=>(n+delta+rows.length)%rows.length)
 return h('div',{className:'signal-lightbox exp-viewer',role:'dialog','aria-modal':true,'aria-label':'素材大图',onKeyDown:(e:any)=>{if(rows.length>1&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();e.stopPropagation();move(e.key==='ArrowLeft'?-1:1)}}},h('header',null,h('div',null,h('b',null,row.label),rows.length>1?h('small',null,String(index+1).padStart(2,'0')+' / '+String(rows.length).padStart(2,'0')):null),h('button',{type:'button','aria-label':'关闭大图',onClick:onClose},h(DetailIcon,{id:'close'}))),h('div',{className:'exp-viewer-stage'},figure?h(CropFigure,{url:row.url,mode:crop,alt:row.label}):h('img',{src:row.url,alt:row.label}),rows.length>1?h(React.Fragment,null,h('button',{type:'button',className:'exp-viewer-prev','aria-label':'上一张',onClick:()=>move(-1)},'‹'),h('button',{type:'button',className:'exp-viewer-next','aria-label':'下一张',onClick:()=>move(1)},'›')):null),h('footer',null,figure?h(CropControls,{value:crop,onChange:setCrop}):h('span',null,'场景原图'),h('span',null,rows.length>1?'← → 切换素材 · Esc 返回':'Esc 返回')))
}

export function AtelierSaveSlots({rows=[],mode,art,background,name,onCommit,busy,current,currentBackground}:any){
 const [selected,setSelected]=useState(()=>rows.find((r:any)=>mode==='load'?!r.empty:!r.auto)?.slot??1),[confirm,setConfirm]=useState(false),[label,setLabel]=useState(''),[error,setError]=useState(''),[pending,setPending]=useState(false)
 const confirmRef=useRef<any>(null),before=useRef<any>(null);const row=rows.find((r:any)=>r.slot===selected)||rows[0],note=row?readSaveAnnotation(row):null,saving=mode==='save',disabled=busy||pending||!row||saving&&row.auto||!saving&&row.empty
 useEffect(()=>{setLabel(note?.label||'');setError('')},[selected,row?.savedAt])
 useEffect(()=>{if(!confirm)return;before.current=document.activeElement;const id=setTimeout(()=>confirmRef.current?.querySelector('input')?.focus(),0);return()=>{clearTimeout(id);before.current?.focus?.()}},[confirm])
 const commit=async()=>{if(disabled)return;setPending(true);setError('');try{await onCommit(row,label)}catch(e:any){setError(e.message||'操作未完成，请重试')}finally{setPending(false)}}
 const upcoming=!!(saving&&row?.empty&&current?.started),scene=current?.world?.scene||{}
 const shown=upcoming?{...row,empty:false,free:!!current.free,preview:{roleId:current.world?.roleId||current.scenario?.roleId||'deepseek',background:scene.background||current.node?.stage?.bg||'bg-atelier-night',day:scene.day||current.scenario?.clock?.day||1,location:scene.location||current.chapter?.title||''},summary:{chapterTitle:current.world?.title||current.chapter?.title||'当前故事',progress:current.world?.revision||current.progress||0}}:row
 const quote=upcoming?String(current.node?.text||'').slice(0,200):note?.quote
 const thumbnail=upcoming?currentBackground||background(shown.preview?.background):row&&!row.empty?background(row.preview?.background):''
 return h('div',{className:'exp-save-layout'},h('div',{className:'exp-slot-grid'},...rows.map((r:any)=>h('button',{type:'button',key:r.slot,className:'exp-slot'+(r.empty?' is-empty':''),'aria-pressed':selected===r.slot,'aria-label':(r.auto?'自动存档':'存档 '+r.slot)+(r.empty?' · 空白':''),disabled:busy||pending||saving&&r.auto,onClick:()=>setSelected(r.slot)},h(SaveLeafFrame),h('span',{className:'exp-slot-top'},h('b',null,r.auto?'A':String(r.slot).padStart(2,'0')),h('small',null,r.auto?'AUTO':'MANUAL'),h('i',{'aria-hidden':true},selected===r.slot?'◆':'◇')),h('span',{className:'exp-slot-picture'},r.empty?h(DetailIcon,{id:'atlas'}):h('img',{src:background(r.preview?.background),alt:''})),h('strong',null,r.empty?'空白书页':readSaveAnnotation(r)?.label||r.summary?.chapterTitle||'故事记录'),h('small',{className:'exp-slot-date'},r.empty?'等待一段新的故事':new Date(r.savedAt).toLocaleString('zh-CN',{hour12:false}))))),h('aside',{className:'exp-save-preview'},h('div',{className:'exp-save-preview-picture'},thumbnail?h('img',{src:thumbnail,alt:shown.preview?.location||'存档场景'}):h(AtelierEmpty,{title:'故事尚未写下',detail:'选择这个位置，留下此刻的旅程。',icon:'save'})),h('p',{className:'exp-save-caption'},(upcoming?'待保存 · ':'')+(row?.auto?'自动存档':('手动存档 '+String(selected).padStart(2,'0')))),shown&&!shown.empty?h(React.Fragment,null,h('h3',null,note?.label||shown.summary?.chapterTitle||'故事记录'),h('div',{className:'exp-save-role'},art('portrait-'+shown.preview?.roleId)?h('img',{src:art('portrait-'+shown.preview.roleId),alt:''}):null,h('span',null,name(shown.preview?.roleId||''))),h('dl',null,h('div',null,h('dt',null,'时间'),h('dd',null,shown.preview?.day?'第 '+String(shown.preview.day).padStart(2,'0')+' 日':'—')),h('div',null,h('dt',null,'地点'),h('dd',null,shown.preview?.location||'共同剧情')),h('div',null,h('dt',null,'进度'),h('dd',null,shown.free?'第 '+(shown.summary?.progress||0)+' 轮':(shown.summary?.progress||0)+'%'))),quote?h('blockquote',null,quote):null):null,error&&!confirm?h('p',{role:'alert',className:'exp-inline-error'},error):null,h('button',{type:'button',className:'system-action exp-save-primary',disabled,onClick:()=>saving?setConfirm(true):commit()},h(DetailIcon,{id:saving?'save':'load'}),h('span',null,pending?'正在'+(saving?'保存':'读取')+'…':saving?'保存到此处':'读取这段故事')),h('p',{className:'exp-save-hint'},saving&&row?.auto?'自动存档由游戏维护。':'点击左侧书页查看详情。')),
 confirm?h('div',{className:'exp-confirm-shade',onKeyDown:(e:any)=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();if(!pending)setConfirm(false)}if(e.key==='Tab'){const els=[...confirmRef.current?.querySelectorAll('button:not(:disabled),input')||[]]as HTMLElement[];if(e.shiftKey&&document.activeElement===els[0]){e.preventDefault();els.at(-1)?.focus()}else if(!e.shiftKey&&document.activeElement===els.at(-1)){e.preventDefault();els[0]?.focus()}}}},h('section',{className:'exp-confirm',ref:confirmRef,role:'alertdialog','aria-modal':true,'aria-label':row.empty?'保存这段故事':'覆盖已有存档'},h('span',{className:'exp-confirm-seal','aria-hidden':true},h(DetailIcon,{id:'save'})),h('h3',null,row.empty?'留下此刻的故事':'覆盖这页故事？'),h('p',null,row.empty?'保存到第 '+String(selected).padStart(2,'0')+' 个手动位置。':'这个位置已有记录，保存后将替换原来的进度。'),h('label',null,'存档备注（本机）',h('input',{value:label,maxLength:40,disabled:pending,'aria-label':'存档备注',placeholder:'例如：窗边的约定',onChange:(e:any)=>setLabel(e.target.value)})),error?h('p',{role:'alert',className:'exp-inline-error'},error):null,h('div',{className:'exp-confirm-actions'},h('button',{type:'button',disabled:pending,onClick:()=>setConfirm(false)},'再想想'),h('button',{type:'button',className:'system-action',disabled:pending,onClick:commit},pending?'正在保存…':'确认保存')))):null)
}

export function roleThemeStyle(skin:any={}){return{'--role-panel':skin.panel||'#163048','--role-ink':skin.ink||'#eee1c9','--role-accent':skin.accent||'#d4b784','--role-name':skin.nameInk||'#d4b784','--role-muted':skin.muted||'#b2c1ca'}as any}

const emblems:Record<string,string>={
 deepseek:'M3 13c2-5 8-6 12-2l5-3v7l-4-2c-1 6-10 7-13 0ZM7 11h.1M8 6c-1-2 0-3 2-3M11 6c0-2 2-3 3-2',
 claude:'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2',
 chatgpt:'m5 19 5-2 1-5 5-2 3-6-7 3-2-4-2 6-4 3ZM14 9h.1M5 19l1 3M17 4l4-1',
 gemini:'m7 3 2 5 5 2-5 2-2 5-2-5-5-2 5-2ZM17 10l2 4 4 2-4 2-2 4-2-4-4-2 4-2Z',
 kimi:'M17 3A9 9 0 1 0 21 16 8 8 0 0 1 17 3ZM18 5l1 3 3 1-3 1-1 3-1-3-3-1 3-1Z',
 grok:'M12 3v19M9 7l-5-4-2 7 5 3M15 7l5-4 2 7-5 3M8 14l4-3 4 3M9 20h6',
 glm:'M5 21 16 5l4-2-1 5L8 23ZM13 8l4 3M3 20l5 2',
 qwen:'M5 21C3 10 9 3 21 3c0 11-7 16-16 18ZM5 21 17 7M8 15l7 1M10 11l6 1',
 minimax:'M19 6C12-1 1 5 3 14c2 9 16 7 15-1-1-6-11-5-10 0 1 4 7 3 6 0',
 seed:'M12 22V11M12 14C3 15 2 8 3 4c8 0 11 4 9 10ZM12 11c-1-7 4-10 9-9 0 6-3 10-9 9Z',
 llama:'M7 10 3 3M7 10 8 2M17 10l4-7M17 10l-1-8M7 8l-4-1M17 8l4-1M7 10c-5 8 1 12 5 12s10-4 5-12ZM8 15h.1M16 15h.1',
 mistral:'M2 7h13c6 0 5-7 1-5M2 12h17c5 0 4 6 0 6M3 17h7c5 0 5 6 0 5',
 hunyuan:'M5 17c-7-1-4-10 2-9 2-8 13-6 13 1 7 1 5 9-1 8ZM3 21h18',
 mimo:'M7 11C1-3 12-1 10 10M14 10c-1-13 10-12 4 1M7 10c-7 12 17 16 12 2M8 16h.1M16 16h.1M11 19h2',
 stepfun:'M2 21h5v-6h5V9h5V3h5M16 18l2 4 2-4 4-2-4-2-2-4-2 4-4 2Z',
 perplexity:'M3 4c5-1 8 0 9 2 3-2 6-3 9-2v15c-4-1-6-1-9 1-3-2-5-2-9-1ZM12 6v14M7 8h.1M17 8h.1',
 rwkv:'m3 13 7-8 9 2-6 7 8 6-11-3-5 5 2-8ZM15 8h.1M3 13l8 1',
 image2:'M12 20c0-9-6-14-10-16-1 9 3 12 10 16ZM12 20c0-9 6-14 10-16 1 9-3 12-10 16ZM12 20v3',
 jev:'M5 2h14M5 22h14M7 2c-1 7 9 13 10 20M17 2c1 7-9 13-10 20M9 18h6',
 wenxin:'M5 21 18 4l3-2-1 5L8 23ZM11 12l5 4M2 16c5 0 4 5 8 4',
 codex:'M12 2v20M3 7l18 10M3 17 21 7M9 4l3 3 3-3M9 20l3-3 3 3M3 10l4-1-1-4M21 14l-4 1 1 4',
 comfyui:'M3 4h6v6H3ZM15 14h6v6h-6M15 3h6v6h-6M9 7h6M6 10v7h9'
}
export function CharacterEmblem({id}:any){return h('svg',{viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.15,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true},h('path',{d:emblems[id]||emblems.deepseek}))}
export function RoleDossierHeader({id,name,stage,portrait,skin={}}:any){return h('div',{className:'exp-role-banner',style:roleThemeStyle(skin),'data-role':id,'data-light':!!skin.light},portrait?h(PortraitCameo,{src:portrait}):null,h('div',null,h('small',null,skin.brand||''),h('h4',null,name),h('p',null,stage||'共同的故事')),h('span',{className:'exp-role-emblem','aria-hidden':true},h(CharacterEmblem,{id})),h('span',{className:'exp-role-theme'},skin.theme||''))}
const statusText:any={pending:'待兑现',overdue:'待处理',completed:'已兑现',failed:'已失约',cancelled:'已取消'}
export function CharacterKeepsakes({data,roleId,name,callApi,art,skin}:any){
 const [filter,setFilter]=useState('all'),[cg,setCg]=useState<any[]>([]),[expanded,setExpanded]=useState(''),[failed,setFailed]=useState(false)
 useEffect(()=>{let live=true;setFailed(false);callApi('gal-cg',{}).then((r:any)=>{if(live){if(r?.ok===false||r?.error)setFailed(true);else setCg(r.items||[])}}).catch(()=>{if(live)setFailed(true)});return()=>{live=false}},[callApi])
 const entries=memoryEntries(data,roleId),pictures=cg.filter(r=>r.seen&&belongsToCharacter(r,roleId)).map(r=>({id:'cg-'+r.key,kind:'illustration',title:r.title,detail:'已解锁插图',url:r.live?r.url:art(r.art||r.key),revision:0})),all=[...entries,...pictures],rows=filter==='all'?all:all.filter(r=>r.kind===filter)
 return h('section',{className:'exp-keepsakes',style:roleThemeStyle(skin),'aria-label':name+'的角色纪念册'},h('div',{className:'exp-album-intro'},h('span',null,name+'的纪念册'),h('small',null,all.length+' 份记录')),h('div',{className:'exp-album-filters',role:'group','aria-label':'纪念类型'},...([['all','全部'],['promise','约定'],['memory','经历'],['milestone','里程碑'],['illustration','插图']]).map(([id,label])=>h('button',{key:id,type:'button','aria-pressed':filter===id,onClick:()=>setFilter(id)},label))),failed?h('p',{className:'exp-inline-error',role:'status'},'插图暂未载入，约定与经历仍可翻阅。'):null,!rows.length?h(AtelierEmpty,{title:all.length?'这一页尚未收录':'你们的纪念册，才刚翻开',detail:'约定、关系变化和已解锁的插图，会在这里留下记录。',icon:'atlas'}):h('div',{className:'exp-memory-list'},...rows.map((r:any)=>h('article',{key:r.id,className:'exp-memory-ticket','data-kind':r.kind,'data-status':r.status},h('img',{className:'exp-memory-ticket-art',src:KEEPSAKE_TICKET,alt:'','aria-hidden':true}),h('div',{className:'exp-memory-kind'},h(DetailIcon,{id:r.kind==='promise'?'journal':r.kind==='milestone'?'endings':r.kind==='illustration'?'gallery':'atlas'}),h('span',null,r.kind==='promise'?'约定':r.kind==='milestone'?'里程碑':r.kind==='illustration'?'插图':'共同经历'),h('small',null,r.revision?'第 '+r.revision+' 轮':r.day?'第 '+r.day+' 日':'')),h('h4',null,r.title),r.url?h('img',{className:'exp-memory-picture',src:r.url,alt:r.title,loading:'lazy'}):null,h('p',{'data-expanded':expanded===r.id},r.detail),r.detail.length>100?h('button',{type:'button',className:'exp-memory-expand','aria-expanded':expanded===r.id,onClick:()=>setExpanded(expanded===r.id?'':r.id)},expanded===r.id?'收起':'展开全文'):null,r.status?h('span',{className:'exp-memory-status'},statusText[r.status]||r.status):null))))
}
