import React,{useEffect,useRef,useState}from'react'
import{ART_PACKS}from'../art-packs'
const h=React.createElement,options:any=(ART_PACKS as any).signal?.covers||{},storageKey='whale-galgame:title-cover'
function remembered(){try{const id=localStorage.getItem(storageKey)||'A';return options[id]?id:'A'}catch{return'A'}}
export function SignalTitleCover({onReady}:any):any{
 const[chosen,setChosen]=useState(remembered),[shown,setShown]=useState<any>(null),[error,setError]=useState(false),sequence=useRef(0)
 useEffect(()=>{let live=true;const rev=++sequence.current;setError(false)
  const decode=(src:string)=>new Promise<void>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve();img.onerror=()=>reject(new Error('cover load failed'));img.src=src})
  const row=options[chosen];if(!row)return
  Promise.all([decode(row.src),decode(row.background)]).then(()=>{if(!live||sequence.current!==rev)return;setShown(row);onReady(row.id);try{localStorage.setItem(storageKey,row.id)}catch{}}).catch(()=>{if(live)setError(true)})
  return()=>{live=false}
 },[chosen])
 return h(React.Fragment,null,shown?h('img',{className:'ensemble-background',src:shown.background,alt:'','aria-hidden':true}):null,shown?h('div',{className:'ensemble-stage'},h('img',{className:'ensemble-group',src:shown.src,alt:'鲸鱼娘、克洛德、白龙娘、双子、月见与洛可的六人群像'})):null,
  h('nav',{className:'ensemble-picker','aria-label':'切换标题封面','aria-busy':chosen!==shown?.id},h('span',{className:'ensemble-caption'},error?'封面载入失败，可重新选择':shown?.label||'正在载入封面…'),...Object.values(options).map((row:any)=>h('button',{key:row.id,type:'button','aria-label':row.id+'：'+row.label,'aria-pressed':shown?.id===row.id,onClick:()=>{if(chosen===row.id&&error){setChosen('');queueMicrotask(()=>setChosen(row.id))}else setChosen(row.id)}},row.id))))
}
export const SIGNAL_TITLE_COVER_CSS=`@scope (.whsig){
.ensemble-background,.ensemble-stage{display:none}
.game[data-view=title][data-ensemble-cover]>.ensemble-background{display:block;position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-5;pointer-events:none}
.game[data-view=title][data-ensemble-cover]>.ensemble-stage{display:block;position:absolute;left:37%;right:0;top:5.6%;bottom:-20%;z-index:-3;pointer-events:none}
.ensemble-group{display:block;width:100%;height:100%;object-fit:contain;object-position:center bottom}
.game[data-view=title][data-ensemble-cover]>.signal-actor{visibility:hidden}
.game>.ensemble-picker{position:absolute;right:3.7%;bottom:10%;display:flex;align-items:center;gap:.55cqw;z-index:3;padding:.35cqw .55cqw;background:#071322e8;border-bottom:1px solid #99d6d13a;color:#e8d4aa}
.ensemble-caption{font:.75cqw/1.3 var(--ui-serif,serif);letter-spacing:.1em;margin-right:.3cqw}
.ensemble-picker button{border:1px solid #a8d9d447;border-radius:0;transform:skew(-14deg);background:#0b2036ba;color:#d0dbd7;min-width:2.2cqw;height:1.8cqw;padding:0 .65cqw;font:italic .9cqw/1 Georgia,serif;cursor:pointer;transition:background 140ms ease,color 140ms ease}
.ensemble-picker button[aria-pressed=true]{border-color:#f1bf5c;background:linear-gradient(135deg,#b26b13,#73400a);color:#fff0cc;box-shadow:0 0 .6cqw #f6b34033}
.ensemble-picker button:hover{border-color:#f9df9b;color:#fff4cd}.ensemble-picker button:focus-visible{outline:2px solid #92e7ed;outline-offset:3px}
.game:has(.system-window)>.ensemble-picker{visibility:hidden}
@container(max-width:720px){.game[data-view=title][data-ensemble-cover]>.ensemble-stage{left:25%;right:-5%;top:12%;bottom:-6%}.game>.ensemble-picker{right:3%;bottom:12%;gap:5px;padding:4px 7px}.ensemble-caption{font-size:10px}.ensemble-picker button{font-size:13px;min-width:27px;height:25px;padding:0 7px}}
@media(prefers-reduced-motion:reduce){.ensemble-picker button{transition:none}}
}`
