import React,{useEffect,useRef,useState}from'react'
import{SIGNAL_THEME}from'../signal-theme'
const h=React.createElement,T:any=SIGNAL_THEME
const media=(p:string)=>T.root+p

/**
 * 开始游戏前的「开局设定」对话框。
 *
 * 为什么要有这一步：共创模式原先点「开始故事」直接开局，`premise` 是空串，
 * 模型拿不到任何背景，每条线第一屏都在真空里现编。玩家看不到「我是谁、
 * 为什么在这儿」，后续对话自然读成一搭没一搭。
 *
 * 三种用法对应三个按钮：自己写（textarea）、随机填（random）、成人向填（nsfw）。
 * 留空 = 服务器用默认开局（雨夜打烊），所以这一步不强迫任何人。
 */
export function OpeningDialog({roleName,callApi,onStart,onCancel,startLabel='开始游戏'}:any):any{
 const[text,setText]=useState('')
 const[label,setLabel]=useState('')
 const[seen,setSeen]=useState<string[]>([])
 const[pending,setPending]=useState('')
 const[error,setError]=useState('')
 const[armed,setArmed]=useState(false)
 const area=useRef<any>(null),panel=useRef<any>(null)

 useEffect(()=>{area.current?.focus({preventScroll:true})},[])
 // 成人向预设要点两下才生效：误触不该把成人内容塞进输入框。
 useEffect(()=>{if(!armed)return;const id=setTimeout(()=>setArmed(false),4000);return()=>clearTimeout(id)},[armed])

 const suggest=async(mode:'random'|'nsfw')=>{
  if(pending)return
  if(mode==='nsfw'&&!armed){setArmed(true);setError('再点一次「成人向开局」确认。');return}
  setArmed(false);setPending(mode);setError('')
  try{
   const r=await callApi('gal-opening-suggest',{mode,avoid:seen})
   if(r?.ok===false||r?.error)throw new Error(r?.error||'取不到预设')
   setText(r.text||'');setLabel(r.label||'')
   if(r.id)setSeen(v=>[...v,r.id].slice(-12))
   area.current?.focus({preventScroll:true})
  }catch(e:any){setError(e?.message||'取不到预设')}
  finally{setPending('')}
 }

 const start=()=>{if(pending)return;onStart(text.trim())}
 const clear=()=>{setText('');setLabel('');setError('')}

 useEffect(()=>{
  const onKey=(e:any)=>{
   if(e.key==='Escape'){e.stopPropagation();onCancel()}
   else if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();start()}
  }
  const node=panel.current
  node?.addEventListener('keydown',onKey)
  return()=>node?.removeEventListener('keydown',onKey)
 })

 return h(React.Fragment,null,
  h('div',{className:'modal-shade',onClick:onCancel}),
  h('section',{className:'system-window opening-window',role:'dialog','aria-modal':true,'aria-label':'开局设定',ref:panel},
   h('h2',{className:'window-title'},'开局设定'),
   h('p',{className:'window-subtitle'},'NEW WORLD · OPENING'),
   h('img',{className:'window-heading',src:media('assets/surfaces/titlebar_normal.png'),alt:''}),
   h('button',{type:'button',className:'close-window','aria-label':'取消',onClick:onCancel},h('img',{src:media('assets/icons/close.png'),alt:''})),
   h('div',{className:'window-body opening-body'},
    h('p',{className:'opening-note'},
     '这是这条世界线的开头。写清楚',h('b',null,'这是哪儿、你是谁、你和'+roleName+'是什么关系'),'，之后所有对话都会从这里长出来。'),
    h('textarea',{
     ref:area,className:'opening-text',value:text,rows:9,spellCheck:false,
     'aria-label':'开局背景','aria-describedby':'opening-hint',
     placeholder:'例：第 1 夜，打烊之后。你在街上躲雨，看见工坊的灯还亮着。推门进去，她正在收最后一批东西……\n\n（留空则使用默认开局：雨夜打烊，你们互不相识。）',
     onChange:(e:any)=>{setText(e.target.value);setLabel('')},
    }),
    h('div',{className:'opening-chips'},
     h('button',{type:'button',className:'opening-chip'+(pending==='random'?' is-busy':''),disabled:!!pending,onClick:()=>suggest('random')},
      pending==='random'?'取用中…':'随机开局'),
     h('button',{type:'button',className:'opening-chip'+(pending==='nsfw'?' is-busy':'')+(armed?' is-armed':''),disabled:!!pending,onClick:()=>suggest('nsfw')},
      pending==='nsfw'?'取用中…':armed?'确认成人向？':'成人向开局'),
     h('button',{type:'button',className:'opening-chip opening-chip-quiet',disabled:!!pending||!text,onClick:clear},'清空'),
     h('span',{className:'opening-count'},String(text.length)+' / 1000'),
    ),
    label?h('p',{className:'opening-picked'},'当前预设：'+label):null,
    h('p',{id:'opening-hint',className:'opening-hint'},text?'这一局会以你写的内容作为开局事实，模型不能推翻它。':'留空 = 默认开局（雨夜打烊，你们互不相识）。也可以点上面的按钮快速填一份再改。'),
    error?h('p',{className:'opening-error',role:'alert'},error):null,
   ),
   h('footer',{className:'window-footer'},
    h('button',{type:'button',className:'opening-cancel',onClick:onCancel},'取消'),
    h('button',{type:'button',className:'system-return opening-start',disabled:!!pending,onClick:start},
     text.trim()?'用这段开局':'开始游戏'),
   ),
  ),
 )
}

export const OPENING_DIALOG_CSS=`
/* 全部规则都带 .opening-window 前缀：主题里有 .whsig button{font:inherit} 这类
   两段选择器，单类名规则会被它压掉，字号不生效（实测输入框 11px 生效、按钮还是 6.9px）。 */
.opening-window .opening-body{display:flex;flex-direction:column;gap:.7cqw}
.opening-window .window-title{color:#5b4a63}
.opening-window .opening-note{margin:0;font:clamp(10px,.95cqw,14px)/1.75 "SimSun",serif;color:#6c5b72}
.opening-window .opening-note b{font-weight:700;color:#4a3a54}
.opening-window .opening-text{width:100%;flex:1 1 auto;min-height:11cqw;resize:vertical;padding:1cqw 1.1cqw;border:1px solid #d8c2cf;border-radius:3px;background:#fffcfa;color:#3f3448;font:clamp(11px,1.05cqw,17px)/1.85 "SimSun",serif;letter-spacing:.01em;outline:none;scrollbar-width:thin;scrollbar-color:#c8a1b8 transparent}
.opening-window .opening-text::placeholder{color:#b7a7b8}
.opening-window .opening-text:focus{border-color:#c07fa0;box-shadow:0 0 0 2px #e7bdd280}
.opening-window .opening-chips{display:flex;align-items:center;gap:.55cqw;flex-wrap:wrap}
.opening-window .opening-chip{border:1px solid #cfb3c3;background:#fdf6f9;color:#6a5069;font-family:"SimSun",serif;font-size:clamp(9px,.9cqw,13px);padding:.42cqw 1cqw;border-radius:2px;cursor:pointer;transition:background 120ms ease,border-color 120ms ease,color 120ms ease}
.opening-window .opening-chip:hover:not(:disabled){background:#fff;border-color:#bb8ba6;color:#4b3450}
.opening-window .opening-chip:disabled{opacity:.55;cursor:default}
.opening-window .opening-chip.is-armed{border-color:#c0607f;background:#ffe9f0;color:#8d3355;font-weight:700}
.opening-window .opening-chip.is-busy{opacity:.7}
.opening-window .opening-chip-quiet{margin-left:auto}
.opening-window .opening-count{font-family:"Segoe UI",sans-serif;font-size:clamp(8px,.78cqw,11px);line-height:1;letter-spacing:.08em;color:#a893a5;padding-left:.4cqw}
.opening-window .opening-picked{margin:0;font:clamp(9px,.84cqw,12px)/1 "SimSun",serif;color:#8d6b86;letter-spacing:.02em}
.opening-window .opening-hint{margin:0;font:clamp(9px,.82cqw,12px)/1.7 "SimSun",serif;color:#9a8798}
.opening-window .opening-error{margin:0;font:clamp(9px,.86cqw,12px)/1.7 "SimSun",serif;color:#a83350}
.opening-window .window-footer{display:flex;align-items:center;justify-content:flex-end;gap:.7cqw}
.opening-window .opening-cancel{border:1px solid #cfb3c3;background:transparent;color:#7b6377;font-family:"SimSun",serif;font-size:clamp(9px,.92cqw,13px);padding:.5cqw 1.3cqw;border-radius:2px;cursor:pointer;white-space:nowrap}
.opening-window .opening-cancel:hover{background:#fff6fa;border-color:#bb8ba6;color:#4b3450}
.opening-window .opening-start{white-space:nowrap;font-size:clamp(9px,.95cqw,14px)}
.opening-window .opening-start[disabled]{opacity:.55;cursor:default}
@media(max-width:720px){
 .opening-window .opening-note,.opening-window .opening-hint,.opening-window .opening-error{font-size:11px}
 .opening-window .opening-text{font-size:12px;min-height:120px;line-height:1.7}
 .opening-window .opening-chip{font-size:10px;padding:5px 9px}
 .opening-window .opening-count{font-size:9px}
 .opening-window .window-footer{gap:6px}
 .opening-window .opening-cancel,.opening-window .opening-start{font-size:11px;padding:6px 12px}
}
`
