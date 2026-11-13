import {NarratorFrame,NARRATOR_CSS} from './narrator-frame'
import {SignalTitleCover,SIGNAL_TITLE_COVER_CSS} from './signal-title-cover'
import React,{useEffect,useLayoutEffect,useRef,useState}from'react'
import {useSignalReader} from './signal-reader'
import {SIGNAL_READING_CSS} from './signal-reading.css'
import{SIGNAL_THEME}from'../signal-theme'
import{ART_PACKS}from'../art-packs'
import{SIGNAL_THEME_CSS}from'./signal-theme.generated'
import{SIGNAL_RUNTIME_CSS}from'./signal-runtime.css'
import {SignalDetailMenu,SignalDetailAtlas,DetailIcon} from './signal-details'
import {SIGNAL_DETAILS_CSS} from './signal-details.css'
import {AtelierArtViewer,AtelierSaveSlots,AtelierToast,AtelierEmpty,AtelierLoading,ExperienceSettings,useAtelierExperience,writeSaveAnnotation} from './signal-experience'
import {SIGNAL_EXPERIENCE_CSS} from './signal-experience.css'
import {CharacterPartyEntry} from './party-panel'
import {OpeningDialog,OPENING_DIALOG_CSS} from './opening-dialog'
import {SIGNAL_JEWELRY_CSS} from './signal-jewelry.css'
const h=React.createElement,T:any=SIGNAL_THEME,P:any=ART_PACKS
const media=(p:string)=>T.root+p
const words:any={save:['保存进度','SAVE GAME'],load:['读取进度','LOAD GAME'],settings:['环境设置','SYSTEM'],gallery:['回想鉴赏','MEMORIES'],history:['对白履历','DIALOGUE LOG'],menu:['游戏菜单','MENU'],atlas:['素材图集','ART LIBRARY']}
const quicks:any=[['save','保存'],['load','读取'],['auto','自动'],['skip','快进'],['history','履历'],['hide','隐藏'],['settings','设置']]
const captions:any={start:'NEW GAME',continue:'CONTINUE',load:'LOAD GAME',gallery:'MEMORIES',settings:'SYSTEM'}
function MenuButton({id,label,index,onClick,disabled=false,current=false,onSelect}:any):any{
 const style:any={};for(const s of ['normal','hover','pressed','selected','disabled'])style['--'+s]='url("'+media('assets/surfaces/menu_'+s+'.png')+'")'
 return h('button',{type:'button',className:'art-button menu-action'+(current?' is-current':''),'aria-label':label,style,onClick,disabled,onPointerEnter:onSelect,onFocus:onSelect},h('span',{className:'menu-index','aria-hidden':true},String(index).padStart(2,'0')),h('i',{className:'menu-divider','aria-hidden':true}),h('span',{className:'menu-copy','aria-hidden':true},h('span',{className:'menu-cn'},label),h('span',{className:'menu-en'},captions[id]||id.toUpperCase())),h('svg',{className:'menu-arrow',viewBox:'0 0 24 28','aria-hidden':true},h('path',{d:'m7 4 10 10L7 24'})))
}
function SystemIcon({id}:any):any{return h('svg',{'aria-hidden':true},h('use',{href:media('assets/system/icons.svg')+'#'+id}))}
function Icon({id}:any):any{return h('svg',{'aria-hidden':true},h('use',{href:media('assets/icons/reading-icons.svg')+'#'+id}))}
function ChoiceLabel({label}:any):any{
 const ref=useRef<any>(null)
 useLayoutEffect(()=>{let live=true;const fit=()=>{const el=ref.current;if(!live||!el)return;const base=parseFloat(getComputedStyle(el.parentElement).fontSize);el.style.fontSize=base+'px';if(el.scrollWidth>el.clientWidth)el.style.fontSize=Math.max(Math.min(base,14),base*el.clientWidth/el.scrollWidth-.2)+'px'};fit();const observer=new ResizeObserver(fit);observer.observe(ref.current.parentElement);document.fonts?.ready.then(fit);return()=>{live=false;observer.disconnect()}},[label])
 return h('span',{ref,className:'choice-label',title:label},label)
}
function CastSprite({src,fallback,...props}:any):any{
 const[shown,setShown]=useState(src||fallback)
 useEffect(()=>{let live=true;const img=new Image();img.onload=()=>{if(live)setShown(img.src)};img.onerror=()=>{if(fallback&&img.src!==fallback)img.src=fallback};img.src=src||fallback;return()=>{live=false;img.onload=null;img.onerror=null}},[src,fallback])
 return h('img',{...props,src:shown||src||fallback})
}
export function SignalGame({gal,standalone,art,callApi,onStory,onCall,onTool,onExit,busy,line,nodeKey,readerController,readerBlocked,onStopSkip,input,onInput,onSend,onDirect,direct,onReveal,onAdvance,onChoose,auto,skip,settings,onSettings,onModalChange,onRoleChange,onEnterStory,onShowTitle,error,children}:any):any{
 const [expanded,setExpanded]=useState(false),[menuIndex,setMenuIndex]=useState(0),[panel,setPanel]=useState(''),[forceTitle,setForceTitle]=useState(true),[coverReady,setCoverReady]=useState(''),[role,setRole]=useState(gal.scenario?.roleId||'deepseek'),[roles,setRoles]=useState<any[]>([]),[tab,setTab]=useState('scenes'),[cg,setCg]=useState<any[]>([]),[log,setLog]=useState<any[]>([]),[loading,setLoading]=useState(false),[localError,setError]=useState(''),[working,setWorking]=useState(false),[detail,setDetail]=useState(''),[selected,setSelected]=useState(-1),[image,setImage]=useState<any>(null),[reload,setReload]=useState(0),[targetRole,setTargetRole]=useState('')
 const [partyOpen,setPartyOpen]=useState(false)
 const [openingOpen,setOpeningOpen]=useState(false)
 const hadBusy=useRef(false),root=useRef<any>(null),dialog=useRef<any>(null),imageFocus=useRef<any>(null),focusBefore=useRef<any>(null),choiceLock=useRef(false),submitted=useRef(false),choiceTimer=useRef<any>(null),request=useRef(0)
 const experience=useAtelierExperience(root)
 const title=!gal.started||forceTitle,ending=!!gal.ending&&!title,stage=gal.node?.stage||gal.scenario?.stage||{},baseSpeaker=gal.node?.speaker||role
 const name=(id:string)=>roles.find(r=>r.id===id)?.name||gal.scenario?.availableRoles?.find((r:any)=>r.id===id)?.name||T.skins[id]?.name||id
 const background=(ending?art(gal.ending.art):'')||gal.scenario?.backgroundUrl||art(stage.bg||'bg-atelier-night')||art('bg-atelier-night')
 const cast=title?[{role,action:'neutral',x:61.5,scale:1}]:stage.cast?.length?stage.cast:[{role:gal.scenario?.roleId||role,x:61.5,scale:1}]
 const allChoices=title||ending?[]:gal.choices||[],waiting=busy||working
 const reader=useSignalReader({nodeKey,narration:gal.narration,line,dialogue:gal.dialogue,active:!title&&!ending,blocked:waiting||!!panel||partyOpen||readerBlocked||settings.hideUI,speed:settings.speed,auto:auto?settings.auto:0,skip,isRead:gal.node?.isRead,hasChoices:allChoices.length>0,onAdvance,onStopSkip,controller:readerController})
 const speakerId=!title&&reader.speaker?reader.speaker:baseSpeaker
 const character=T.skins[title?role:speakerId]?title?role:speakerId:'deepseek',skin=T.skins[character],choiceSkin=T.choices[character]
 const choices=reader.complete?allChoices:[]
 useEffect(()=>{if(targetRole&&!cast.some((c:any)=>c.role===targetRole))setTargetRole('')},[gal.node?.id,targetRole])
 const api=async(action:string,args:any={})=>{const r=await callApi(action,args);if(r?.ok===false||r?.error)throw new Error(r.error||'操作失败');return r}
 useEffect(()=>{let live=true;callApi('asset-list',{}).then((r:any)=>{if(live)setRoles(r.roles||[])}).catch(()=>{});return()=>{live=false;clearTimeout(choiceTimer.current);onModalChange?.(false)}},[])
 useEffect(()=>{if(submitted.current&&!busy&&!input){submitted.current=false;setExpanded(false);root.current?.querySelector('.signal-input input')?.blur()}},[busy,input])
 useEffect(()=>{if(busy)hadBusy.current=true;else if(hadBusy.current){hadBusy.current=false;choiceLock.current=false;setSelected(-1)}},[busy])
 useEffect(()=>{choiceLock.current=false;clearTimeout(choiceTimer.current);setSelected(-1);setDetail('')},[gal.node?.id])
 useEffect(()=>{onModalChange?.(!!panel||partyOpen||openingOpen);if(!panel)return;focusBefore.current=document.activeElement;const id=setTimeout(()=>dialog.current?.querySelector('button')?.focus({preventScroll:true}),0);return()=>{clearTimeout(id);focusBefore.current?.focus?.({preventScroll:true})}},[panel,partyOpen,openingOpen])
 useEffect(()=>{if(!image)return;imageFocus.current=document.activeElement;const id=setTimeout(()=>dialog.current?.querySelector('.signal-lightbox button')?.focus({preventScroll:true}),0);return()=>{clearTimeout(id);imageFocus.current?.focus?.({preventScroll:true})}},[image])
 useEffect(()=>{
  if(!panel)return;const sequence=++request.current;setError('');setLoading(true)
  const action=panel==='gallery'?'gal-cg':panel==='history'?'gal-log':''
  if(!action){setLoading(false);return}
  api(action).then(r=>{if(request.current!==sequence)return;if(panel==='gallery')setCg(r.items||[]);else setLog(r.items||[])}).catch(e=>{if(request.current===sequence)setError(e.message)}).finally(()=>{if(request.current===sequence)setLoading(false)})
  return()=>{request.current++}
 },[panel,reload])
 useEffect(()=>{
  const key=(e:KeyboardEvent)=>{
   if(!root.current)return
   if(root.current.querySelector('.whrel'))return
   if(root.current.querySelector('.exp-confirm')&&e.key==='Escape')return
   if(e.key==='Escape'&&panel){e.preventDefault();e.stopImmediatePropagation();if(image)setImage(null);else setPanel('');return}
   if(panel&&e.key==='Tab'){
    const focusRoot=dialog.current?.querySelector('.exp-confirm')||(image?dialog.current?.querySelector('.signal-lightbox'):dialog.current)
    const nodes=[...focusRoot?.querySelectorAll('button:not(:disabled),input,select,a[href],[tabindex="0"]')||[]]as HTMLElement[]
    const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}return
   }
   if(panel)return
   const target=e.target as HTMLElement;if(['INPUT','TEXTAREA','SELECT'].includes(target?.tagName))return
   if(e.key.toLowerCase()==='h'&&!title){e.preventDefault();onSettings({...settings,hideUI:!settings.hideUI})}
  };window.addEventListener('keydown',key,true);return()=>window.removeEventListener('keydown',key,true)
 },[panel,image,title,settings])
 const open=(p:string)=>{setImage(null);setPanel(p)}
 const admin=(key:string)=>{setPanel('');if(['classic','worlds'].includes(key)){setForceTitle(false);onEnterStory?.()};onTool(key)}
 const run=async(fn:any)=>{if(waiting)return;setWorking(true);setError('');try{await fn()}catch(e:any){setError(e.message)}finally{setWorking(false)}}
 const choose=(c:any,i:number)=>{if(waiting||c.disabled||choiceLock.current)return;choiceLock.current=true;setSelected(i);const commit=()=>onChoose(c);if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)commit();else choiceTimer.current=setTimeout(commit,180)}
 const arrows=(e:any,selector:string)=>{const buttons=[...e.currentTarget.querySelectorAll(selector)]as HTMLElement[];let i=buttons.indexOf(document.activeElement as HTMLElement);if(i<0)return;const direction=e.key==='ArrowDown'?1:e.key==='ArrowUp'?-1:0;if(!direction&&!['Home','End'].includes(e.key))return;e.preventDefault();i=e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+direction+buttons.length)%buttons.length;buttons[i]?.focus({preventScroll:true})}
 const tool=(id:string)=>{if(id==='hide')onSettings({...settings,hideUI:!settings.hideUI});else if(id==='auto'||id==='skip')onTool(id);else open(id)}
 const slots=()=>h(AtelierSaveSlots,{current:gal,currentBackground:background,rows:gal.slots,mode:panel,art,name,busy:waiting,background:(id:string)=>P.backgrounds[id]?.url||art(id)||art('bg-atelier-night'),onCommit:async(row:any,label:string)=>{if(waiting)throw new Error('请等待当前操作完成');setWorking(true);try{const result=await api(panel==='save'?'gal-save':'gal-load',{slot:row.slot});if(panel==='save')writeSaveAnnotation(result.slots?.find((r:any)=>r.slot===row.slot),label,gal.node?.text||'');onEnterStory?.();onStory(result);experience.notify(panel==='save'?'故事已保存 · '+String(row.slot).padStart(2,'0'):'已回到这段故事');setPanel('');setForceTitle(false);return result}finally{setWorking(false)}}})
 const settingsBody=()=>h('div',{className:'settings-layout'},h('div',{className:'settings-main'},h('section',{className:'settings-section'},h('h3',null,h(SystemIcon,{id:'text'}),'文字 ',h('small',null,'TEXT')),...([['文字速度','speed',0,60,1,'毫秒 / 字'],['自动停留','auto',800,10000,100,'毫秒']]as any[]).map(([label,key,min,max,step,unit])=>h('label',{key,className:'setting'},h('span',{className:'setting-name'},label),h('input',{type:'range','aria-label':label,min,max,step,value:settings[key],style:{'--level':(settings[key]-min)/(max-min)*100+'%'}as any,onChange:(e:any)=>onSettings({...settings,[key]:Number(e.target.value)})}),h('output',null,settings[key]===0?'即时':settings[key]+' '+unit)))),h(ExperienceSettings,{prefs:experience.prefs,onChange:experience.setPrefs}),h('button',{type:'button',className:'system-action settings-reset',onClick:()=>onSettings({speed:22,auto:2200,hideUI:false})},h(SystemIcon,{id:'reset'}),'恢复默认')),h('aside',{className:'settings-side'},h('div',{className:'settings-sample'},h('div',{className:'sample-caption'},'对白预览'),h('div',{className:'sample-speaker'},h('img',{src:art('portrait-'+speakerId),alt:''}),h('span',null,name(speakerId))),h('p',null,String(gal.node?.text||'打烊之后，留一盏灯给你。').slice(0,180))),h('section',{className:'settings-section playback-options'},h('h3',null,h(SystemIcon,{id:'play'}),'播放 ',h('small',null,'PLAYBACK')),h('label',{className:'check'},h('input',{type:'checkbox',checked:settings.hideUI,onChange:(e:any)=>onSettings({...settings,hideUI:e.target.checked})}),h('span',null,'隐藏阅读界面')),h('p',{className:'signal-note'},'自动播放在需要你选择时停下；快进仅处理已读内容。'))))
 const gallery=()=>{
  const rows=tab==='characters'?Object.keys(P.actions).map(id=>({id,label:name(id),url:P.actions[id].neutral.url,character:true})):tab==='cg'?cg.map(r=>({id:r.key,label:r.seen?r.title:'尚未解锁',url:r.seen?r.live?r.url:art(r.art||r.key):'',locked:!r.seen})):[{id:'night',label:'夜间工坊',url:art('bg-atelier-night')},{id:'day',label:'白日工坊',url:art('bg-atelier-day')},...Object.entries(P.backgrounds).map(([id,r]:any)=>({id,label:r.label,url:r.url}))]
  const tabs=[['scenes','背景场景'],['characters','角色立绘'],['cg','剧情 CG']]
  return h(React.Fragment,null,h('div',{className:'gallery-topline'},h('div',{className:'gallery-tabs',role:'tablist','aria-label':'图鉴分类',onKeyDown:(e:any)=>{let i=tabs.findIndex(([id])=>id===tab);if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();i=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;setTab(tabs[i][0]);const target=e.currentTarget.querySelectorAll('button')[i];target?.focus({preventScroll:true})}},...tabs.map(([id,label])=>h('button',{type:'button',role:'tab',key:id,className:'gallery-tab',tabIndex:tab===id?0:-1,'aria-selected':tab===id,onClick:()=>setTab(id)},h(SystemIcon,{id:id==='characters'?'people':'scene'}),label))),h('span',{className:'collection-count'},rows.length+' 项收藏')),
  !loading&&!rows.length?h(AtelierEmpty,{title:'这一页还没有藏品',detail:'故事中解锁的插图会收录在这里。',icon:'gallery'}):h('div',{className:'gallery-grid '+(tab==='characters'?'character-grid':'scene-grid'),role:'tabpanel'},...rows.map((row:any,i:number)=>h('button',{type:'button',key:row.id,className:'gallery-item '+(row.character?'character':'scene-card'),'data-gallery-character':row.character?row.id:undefined,'aria-label':'查看'+row.label,disabled:row.locked,onClick:()=>setImage(row)},
    row.character?h(React.Fragment,null,h('img',{className:'collection-backing',src:media('assets/characters/'+row.id+'/collection/panel.png'),alt:''}),h('span',{className:'portrait-window'},h('img',{className:'collection-portrait',src:row.url,alt:row.label,loading:'lazy'})),h('img',{className:'collection-frame',src:media('assets/characters/'+row.id+'/collection/frame_normal.png'),alt:''}),h('span',{className:'collection-index','aria-hidden':true},String(i+1).padStart(2,'0')),h('b',{className:'collection-name'},row.label),h('em',{className:'collection-brand'},T.skins[row.id]?.brand||row.id)):
    h(React.Fragment,null,h('span',{className:'scene-picture'},row.url?h('img',{src:row.url,alt:row.label,loading:'lazy'}):h('span',{className:'empty-slot'},h(SystemIcon,{id:'bookmark'}))),h('img',{className:'album-frame',src:media('assets/system/album_frame_normal.png'),alt:''}),h('span',{className:'scene-stamp'},String(i+1).padStart(2,'0')),h('span',{className:'scene-copy'},h('b',null,row.label))),
  ))))
 }
 const atlas=()=>h(SignalDetailAtlas,{actions:P.actions,role,setRole,name,media,skins:T.skins,onAssets:()=>admin('assets'),onImage:setImage})
 const menuBody=()=>h(SignalDetailMenu,{exitLabel:standalone?'退出游戏':'返回聊天',onSelect:(id:string)=>{if(id==='resume')setPanel('');else if(id==='title'){setForceTitle(true);onShowTitle?.();setPanel('')}else if(id==='exit')onExit();else if(['ensemble','worlds','journal','assets','editor','tree','catalog','endings','classic'].includes(id))admin(id);else open(id)}})
 const modal=panel?h(React.Fragment,null,h('div',{className:'modal-shade',onClick:()=>setPanel('')}),h('section',{className:'system-window','data-panel':panel,role:'dialog','aria-modal':true,'aria-label':words[panel]?.[0]||'游戏菜单',ref:dialog},h('h2',{className:'window-title'},words[panel]?.[0]),h('p',{className:'window-subtitle'},words[panel]?.[1]),h('img',{className:'window-heading',src:media('assets/surfaces/titlebar_normal.png'),alt:''}),h('button',{type:'button',className:'close-window','aria-label':'关闭',onClick:()=>setPanel('')},h('img',{src:media('assets/icons/close.png'),alt:''})),h('div',{className:'window-body'},localError?h('div',{className:'exp-inline-error',role:'alert'},localError,h('button',{type:'button',onClick:()=>setReload(n=>n+1)},'重新读取')):null,loading?h(AtelierLoading):null,panel==='save'||panel==='load'?slots():panel==='settings'?settingsBody():panel==='gallery'?gallery():panel==='atlas'?atlas():panel==='history'?h('div',{className:'history-lines'},...log.map((r:any,i:number)=>h('p',{key:i},h('b',null,r.speaker),r.text))):menuBody()),h('footer',{className:'window-footer'},h('button',{type:'button',className:'system-return',onClick:()=>setPanel('')},h(SystemIcon,{id:'return'}),'返回游戏'),h('span',null,panel==='save'||panel==='load'?'自动存档 · 9 个手动槽位':'深海女仆工坊')),image?h(AtelierArtViewer,{image,onClose:()=>setImage(null)}):null)):null
 const scene=gal.world?.scene||{},clock=gal.scenario?.clock,matchTime=/^\d{1,2}:\d{2}$/.test(scene.time||'')
 return h('div',{className:'whsig',ref:root,'data-ui-effects':experience.prefs.effects,onPointerDown:(e:any)=>{if(expanded&&!e.target.closest('.signal-input'))setExpanded(false)}},h('style',null,SIGNAL_THEME_CSS+SIGNAL_RUNTIME_CSS+SIGNAL_TITLE_COVER_CSS+SIGNAL_READING_CSS+SIGNAL_DETAILS_CSS+SIGNAL_EXPERIENCE_CSS+SIGNAL_JEWELRY_CSS+NARRATOR_CSS+OPENING_DIALOG_CSS+SIGNAL_DIRECT_CSS),h('section',{className:'game character-dialogue'+(settings.hideUI&&!title?' ui-hidden':''),'data-world-revision':gal.world?.revision,'data-cast-count':cast.length,'data-narration':!!gal.narration,'data-reader-kind':title?undefined:reader.kind,style:{'--signal-panel':skin.panel}as any,'data-view':title?'title':choices.length?'choices':'reading','data-character':character,'data-ensemble-cover':title&&coverReady?coverReady:undefined,'data-signal-version':T.version,'aria-label':'深海女仆工坊'},
  h('img',{className:'scene',src:title?art('bg-atelier-night'):background,alt:''}),h('div',{className:'scene-veil'}),
  title?h('div',{className:'title-atmosphere','aria-hidden':true},h('img',{className:'title-tide',src:media('assets/fx/title-tide.svg'),alt:''}),h('img',{className:'comfy-tide',src:media('assets/fx/comfy-tide-aigirls.png'),alt:''})):null,
  title?h(SignalTitleCover,{onReady:setCoverReady}):null,
  ...cast.map((c:any,i:number)=>{
   const action=!title&&reader.speaker===c.role?reader.action||c.action:reader.reactions?.find((r:any)=>r.role===c.role)?.action||c.action||'neutral'
   const src=title?P.actions[c.role]?.neutral?.url||art(gal.scenario?.sprites?.[c.role]):gal.scenario?.poseUrls?.[c.role]?.[action]||gal.scenario?.spriteUrls?.[c.role]||art(gal.scenario?.sprites?.[c.role])||art(gal.scenario?.roleSprite)
   return h(CastSprite,{key:c.role,className:'actor signal-actor '+(c.role===speakerId?'is-speaking':'is-quiet')+(cast.length>1?' is-ensemble':''),src,fallback:art(gal.scenario?.spriteFallbacks?.[c.role]||gal.scenario?.sprites?.[c.role]),alt:name(c.role)+'立绘','data-action':action,draggable:false,style:!title&&cast.length>1?{left:(choices.length?(cast.length===2?[64,84]:[55,73,90])[i]:c.x)+'%',scale:c.scale||1,zIndex:c.role===speakerId?-2:-3,'--ensemble-mobile-x':([22,50,78][i]||50)+'%'}:undefined})
  }),
  h('div',{className:'story-brand'},h(Icon,{id:'wave'}),h('span',null,'深海女仆工坊 / STORY')),h('button',{type:'button',className:'top-menu','aria-label':'打开菜单',onClick:()=>open('menu')},h(Icon,{id:'menu'})),
  !title?h('aside',{className:'chronicle-hud','aria-label':'编年史与游戏时间'},h('div',{className:'chronicle-main'},h('span',{className:'chronicle-label'},'编年史'),h('span',{className:'chronicle-day'},'第 '+String(scene.day||clock?.day||1).padStart(2,'0')+' 日'),matchTime?h('time',{className:'chronicle-time'},scene.time):null,h('span',{className:'chronicle-phase'},matchTime?'':scene.time||clock?.label||'故事进行中')),h('div',{className:'chronicle-location'},scene.location||gal.chapter?.title||'')):null,
  title?h('section',{className:'title-screen','aria-label':'标题菜单'},h('div',{className:'title-eyebrow'},'DEEP-SEA MAID ATELIER'),h('img',{className:'game-logo',src:media('assets/labels/game-logo.png'),alt:'深海女仆工坊'}),h('p',{className:'title-line'},'打烊之后，留一盏灯给你。'),h('nav',{className:'title-menu',onKeyDown:(e:any)=>arrows(e,'button:not(:disabled)')},...['start','continue','load','gallery','settings'].map((id,i)=>h(MenuButton,{key:id,id,label:T.menu[id],index:i+1,current:i===menuIndex,onSelect:()=>setMenuIndex(i),disabled:waiting||id==='continue'&&!gal.started&&gal.slots?.[0]?.empty!==false,onClick:()=>{if(id==='start'){setOpeningOpen(true)}else if(id==='continue'){onEnterStory?.();if(gal.started)setForceTitle(false);else{setForceTitle(false);onCall('gal-load',{slot:0})}}else open(id)}}))),h('div',{className:'title-chapter'},h(Icon,{id:'wave'}),h('span',null,gal.slots?.[0]?.empty===false?'继续你的世界线 · '+(gal.slots[0].summary?.chapterTitle||'共同剧情'):'第一夜 · 打烊后的工坊')),h('button',{className:'title-exit',type:'button',onClick:onExit},'退出游戏 ',h('span',null,'EXIT')),h('label',{className:'signal-role'},'开场角色 ',h('select',{'aria-label':'开场角色',value:role,onChange:(e:any)=>{setRole(e.target.value);onRoleChange?.(e.target.value)}},...(roles.length?roles:Object.keys(T.skins).map(id=>({id,name:name(id)}))).map((r:any)=>h('option',{key:r.id,value:r.id},r.name))))):null,
  !title&&!ending?h('section',{className:'reading-screen','aria-label':'剧情画面'},
   h('div',{className:'speaker'},h('span',null,reader.kind==='narration'?'旁白':name(speakerId))),
   h('div',{className:'dialogue-box',tabIndex:0,role:'group','aria-keyshortcuts':'Space Enter','aria-label':reader.typing?'显示本页全文':'点击继续对白','aria-busy':waiting,onClick:reader.advance},
    reader.kind==='narration'?h(NarratorFrame):h(React.Fragment,null,h('img',{className:'character-panel',src:media(skin.panelAsset),alt:''}),h('img',{className:'character-decoration-fx',src:media(skin.effect),alt:''}),h('img',{className:'character-frame-art',src:media(skin.frame),alt:''})),
    h('div',{className:'signal-page-copy',ref:reader.copy,'data-kind':reader.kind},h('p',{className:'signal-line'},waiting?'正在等待回复……':reader.text)),
    h('div',{className:'signal-page-measure',ref:reader.measure,'aria-hidden':true}),
    h('div',{className:'reader-footer'},h('span',{className:'reader-kind'},waiting?'正在等待回复':reader.kind==='narration'?'旁白':reader.complete&&allChoices.length?'请选择你的回应':reader.typing?'点击显示全文':reader.to&&reader.to!=='all'&&reader.to!=='player'?'对'+name(reader.to)+'说':'点击继续'),
     h('nav',{className:'reader-page-nav','aria-label':'对白分页',onClick:(e:any)=>e.stopPropagation()},h('button',{type:'button','aria-label':'上一页',disabled:reader.index===0||waiting,onClick:reader.previous},'‹'),h('span',null,String(reader.index+1).padStart(2,'0')+' / '+String(reader.total).padStart(2,'0')),h('button',{type:'button','aria-label':reader.typing?'显示本页全文':'下一页',disabled:waiting||reader.complete&&allChoices.length>0,onClick:reader.advance},'▸')))),
   h('nav',{className:'quick-menu','aria-label':'阅读操作'},...quicks.map(([id,label]:any)=>h('button',{type:'button',key:id,className:'quick-action','data-action':id,'aria-label':label,'aria-pressed':id==='auto'?auto:id==='skip'?skip:undefined,onClick:()=>tool(id)},h(Icon,{id}),h('span',null,label)))),
   h('form',{className:'signal-input','data-expanded':expanded,onBlur:(e:any)=>{if(e.relatedTarget&&!e.currentTarget.contains(e.relatedTarget))setExpanded(false)},onSubmit:(e:any)=>{e.preventDefault();submitted.current=true;onSend(targetRole,direct?'direct':'speech')}},gal.free?h('select',{'aria-label':'回应对象',value:targetRole,onChange:(e:any)=>setTargetRole(e.target.value)},h('option',{value:''},'大家'),...cast.map((c:any)=>h('option',{key:c.role,value:c.role},name(c.role)))):null,h('input',{'aria-label':direct?'指定接下来的发展':'剧情对话输入','data-direct':direct?'1':undefined,onFocus:()=>setExpanded(true),placeholder:direct?'接下来会发生什么？写你想让事情怎么发展……':(targetRole?'对'+name(targetRole)+'说……':'对大家说点什么……'),value:input,disabled:waiting,onChange:(e:any)=>onInput(e.target.value),onKeyDown:(e:any)=>{if(e.key==='Enter'&&e.nativeEvent?.isComposing)e.preventDefault()}}),direct?h('button',{type:'button',className:'signal-direct-exit','aria-label':'退出指定走向',onClick:()=>{onInput('');onDirect&&setExpanded(false)},title:'切回说话'},'×'):null,h('button',{type:'submit',disabled:waiting||!input.trim()},waiting?'等待回复…':(direct?'让剧情这样走':'发送')))):null,
  !title&&choices.length?h('section',{className:'choice-stack','aria-label':'选择下一步',onKeyDown:(e:any)=>arrows(e,'.choice:not(:disabled)')},...choices.map((c:any,i:number)=>h('button',{type:'button',key:c.id,className:'choice'+(c.disabled?' is-locked':'')+((c.kind==='custom'||c.kind==='swap')?' is-special':''),'data-kind':c.kind,'aria-label':c.caption||c.label,title:c.reason||c.action||c.label,onPointerEnter:()=>setDetail(c.reason||c.action&&c.action!==c.caption?c.reason||c.action:''),onPointerLeave:()=>setDetail(''),onFocus:()=>setDetail(c.reason||c.action||''),onBlur:()=>setDetail(''),'aria-pressed':selected===i,disabled:waiting||selected>=0||c.disabled,style:{'--choice-order':i,'--choice-line-y':((choiceSkin?.geometry.textCenterY||64)/128*100)+'%'}as any,onClick:()=>c.kind==='custom'?(onDirect?onDirect():null):choose(c,i)},h('span',{className:'choice-index','aria-hidden':true},String(i+1).padStart(2,'0')),h(ChoiceLabel,{label:c.caption||c.label}),h('svg',{className:'choice-confirm',viewBox:'0 0 24 24','aria-hidden':true},h('path',{d:c.kind==='custom'?'m4 20 1-4 11-11 3 3-11 11-4 1zm10-13 3 3':'m8 5 7 7-7 7',stroke:'currentColor',strokeWidth:1.6,fill:'none'})))),detail?h('aside',{className:'signal-choice-detail','aria-live':'polite'},detail):null):null,
  ending?h('section',{className:'signal-ending'},h('p',null,'ENDING'),h('h2',null,gal.ending.title),h('p',null,gal.ending.hint),h('button',{type:'button',onClick:()=>{setForceTitle(true);onShowTitle?.()}},'返回标题'),h('button',{type:'button',onClick:()=>open('gallery')},'回想鉴赏')):null,
  settings.hideUI&&!title?h('button',{type:'button',className:'signal-restore',onClick:()=>onSettings({...settings,hideUI:false})},'显示界面'):null,
  !title?h('div',{className:'signal-utility'},h(CharacterPartyEntry,{callApi,onOpenChange:setPartyOpen,roleId:speakerId||role}),gal.free?h('button',{type:'button',onClick:()=>admin('ensemble')},h(DetailIcon,{id:'ensemble'}),h('span',null,'同伴')):null,h('button',{type:'button',onClick:()=>admin('journal')},h(DetailIcon,{id:'journal'}),h('span',null,'关系与约定')),h('button',{type:'button',onClick:()=>open('atlas')},h(DetailIcon,{id:'atlas'}),h('span',null,'素材图集')),h('button',{type:'button',onClick:()=>admin('editor')},h(DetailIcon,{id:'editor'}),h('span',null,'编辑布局'))):null,
  h(AtelierToast,{value:experience.toast}),error||localError&&!panel?h('div',{className:'signal-error',role:'alert'},error||localError):null,
  openingOpen?h(OpeningDialog,{roleName:name(role),callApi,onCancel:()=>setOpeningOpen(false),onStart:(premise:string)=>{setOpeningOpen(false);setForceTitle(false);onEnterStory?.();onCall('gal-free-start',{roleId:role,premise:premise||undefined,restart:true})}}):null,
  modal,children,
 ))
}

/** 「自己决定走向」模式：输入框变样，一眼看出这不是在说话。 */
export const SIGNAL_DIRECT_CSS = `
.whsig .signal-input[data-direct] input,
.whsig .signal-input:has(input[data-direct]) input {
  color: var(--whsig-accent, #d9b877);
  letter-spacing: .02em;
}
.whsig .signal-input:has(input[data-direct]) {
  border-color: color-mix(in srgb, var(--whsig-accent, #d9b877) 55%, transparent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--whsig-accent, #d9b877) 30%, transparent),
              0 0 18px color-mix(in srgb, var(--whsig-accent, #d9b877) 18%, transparent);
}
.whsig .signal-input:has(input[data-direct])::before {
  content: '指定走向';
  position: absolute;
  top: -.9em; left: .8em;
  padding: 0 .4em;
  font-size: clamp(9px, 1.1cqw, 12px);
  letter-spacing: .12em;
  color: var(--whsig-accent, #d9b877);
  background: var(--signal-panel, #0d1620);
  border-radius: 2px;
}
.whsig .signal-direct-exit {
  flex: 0 0 auto;
  width: 2.2em; height: 2.2em;
  padding: 0;
  font-size: clamp(12px, 1.5cqw, 16px);
  line-height: 1;
  color: var(--whsig-accent, #d9b877);
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--whsig-accent, #d9b877) 40%, transparent);
  border-radius: 50%;
  cursor: pointer;
}
.whsig .signal-direct-exit:hover { background: color-mix(in srgb, var(--whsig-accent, #d9b877) 16%, transparent); }
/* 「自己决定走向」选项本身也换个语气 */
.whsig .choice[data-kind="custom"] .choice-index { opacity: .55; }
.whsig .choice[data-kind="custom"] { font-style: italic; }
`
