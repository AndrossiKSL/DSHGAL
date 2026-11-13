import React,{useEffect,useRef,useState} from 'react'
const h=React.createElement

/** Preload each whole pose; preserve the last good pose until its replacement is ready. */
function Pose({src,fallback,cut,...props}:any):any{
  const [shown,setShown]=useState(''),[previous,setPrevious]=useState(''),[error,setError]=useState(false),current=useRef('')
  useEffect(()=>{
    let live=true,timer:any;const img=new Image();setError(false)
    img.onload=()=>{if(!live)return;setPrevious(cut?'':current.current);current.current=img.src;setShown(img.src);timer=setTimeout(()=>setPrevious(''),140)}
    img.onerror=()=>{if(!live)return;if(fallback&&img.src!==fallback){img.src=fallback}else setError(true)}
    img.src=src||fallback
    return()=>{live=false;clearTimeout(timer);img.onload=null;img.onerror=null}
  },[src,fallback,cut])
  return h('div',{...props,'data-pose-error':error||undefined},previous?h('img',{className:'whdir-pose-old',src:previous,alt:'','aria-hidden':true,draggable:false}):null,shown?h('img',{key:shown,className:cut?'':'whdir-pose-in',src:shown,alt:props['aria-label']||'',draggable:false}):null)
}

export function DirectedReading({gal,busy,typing,text,input,onInput,onSend,onReveal,onChoose,onAdvance,onTool,auto,skip,hide,art,children}:any):any{
  const host=useRef<any>(null),[size,setSize]=useState({w:1664,h:936})
  useEffect(()=>{const obs=new ResizeObserver(rows=>{const r=rows[0].contentRect;setSize({w:r.width,h:r.height})});if(host.current)obs.observe(host.current);return()=>obs.disconnect()},[])
  const scale=Math.min(size.w/1664,size.h/936),stage=gal.node?.stage||gal.scenario?.stage||{},skin=gal.scenario?.uiSkin
  const cast=stage.cast||[],world=gal.world||{},speaker=gal.scenario?.availableRoles?.find((r:any)=>r.id===gal.node?.speaker)?.name||gal.scenario?.roleName
  const tool=(key:string,label:string,active=false)=>h('button',{key,type:'button','aria-pressed':['auto','skip','hide'].includes(key)?active:undefined,onClick:()=>onTool(key),disabled:busy&&['auto','skip'].includes(key)},label)
  const controls=h('div',{className:'whdir-dock',style:skin?{backgroundImage:'url("'+skin.toolbar+'")'}:undefined},tool('save','存档'),tool('load','读档'),tool('auto','自动',auto),tool('skip','快进',skip),tool('history','回想'),tool('hide','隐藏',hide),tool('settings','设置'))
  const send=h('form',{className:'whdir-input',onSubmit:(e:any)=>{e.preventDefault();onSend()}},h('input',{'aria-label':'对角色说话',value:input,placeholder:'说句话，或者描述你想做的事……',disabled:busy,onChange:(e:any)=>onInput(e.target.value),onKeyDown:(e:any)=>{if(e.key==='Enter'&&e.nativeEvent?.isComposing)e.preventDefault()}}),h('button',{type:'submit',disabled:busy||!input.trim()},busy?'等待回复…':'发送'))
  const latest=world.settlement?.changes||[]
  return h('div',{className:'whdir',ref:host,'data-world-revision':world.revision},
    h('div',{className:'whdir-stage','data-transition':stage.transition,style:{width:1664,height:936,transform:'translate(-50%,-50%) scale('+scale+')','--whdir-ink':skin?.ink||'#f5f0df','--whdir-muted':skin?.muted||'#cdd7eb','--whdir-accent':skin?.accent||'#8fe8f3'} as any},
      h('div',{key:gal.scenario?.backgroundUrl||stage.bg,className:'whdir-bg',style:{backgroundImage:'url("'+(gal.scenario?.backgroundUrl||art(stage.bg))+'")'}}),
      ...cast.map((c:any)=>h(Pose,{key:c.role,src:gal.scenario?.spriteUrls?.[c.role],fallback:art(gal.scenario?.spriteFallbacks?.[c.role]),cut:stage.transition==='cut',className:'whdir-actor'+(c.role===gal.node?.speaker?' is-speaking':' is-quiet'),'aria-label':gal.scenario?.availableRoles?.find((r:any)=>r.id===c.role)?.name||c.role,'data-action':c.action,style:{left:c.x+'%',transform:'translateX(-50%) scale('+(c.scale||1)+')'}})),
      hide?null:h(React.Fragment,null,
        h('div',{className:'whdir-hud'},h('div',null,gal.scenario?.clock?.label),h('small',null,'共创剧情 · 第 '+world.revision+' 轮')),
        h('nav',{className:'whdir-top','aria-label':'剧情系统'},tool('journal','关系与约定'),tool('assets','资产'),tool('editor','编辑布局'),tool('exit','返回')),
        h('div',{className:'whdir-choices'},...(gal.choices||[]).map((c:any)=>h('button',{type:'button',key:c.id,disabled:busy||c.disabled,title:c.reason||c.action,onClick:()=>onChoose(c)},!c.kind&&c.tag?h('small',null,c.tag):null,c.caption||c.label))),
        skin?h('div',{className:'whdir-frame','aria-hidden':true,style:{backgroundImage:'url("'+skin.panelAsset+'"),url("'+skin.frame+'")'}}):h('div',{className:'whdir-plain'}),
        h('div',{className:'whdir-speaker',style:{color:skin?.nameInk||'#fff'}},speaker),
        gal.narration?h('div',{className:'whdir-narration'},gal.narration):null,
        h('div',{className:'whdir-line',onClick:()=>typing?onReveal():!(gal.choices||[]).length&&onAdvance()},busy?'她正在想……':text),
        h('div',{className:'whdir-settlement','aria-live':'polite'},latest.map((c:any)=>c.reason+' · '+Object.entries(c.delta).filter(([,v])=>v).map(([k,v]:any)=>({affection:'好感',trust:'信任',intimacy:'亲近',nsfw:'NSFW'} as any)[k]+(v>0?'+':'')+v).join(' ')).join('　')),
        controls,send,
      ),
      hide?h('button',{className:'whdir-restore',type:'button',onClick:()=>onTool('hide')},'显示界面'):null,
    ),children,
  )
}

export const DIRECTED_CSS=`
.whdir{position:absolute;inset:0;overflow:hidden;background:#050b15;container-type:inline-size}
.whdir-stage{position:absolute;left:50%;top:50%;transform-origin:center;overflow:hidden;font-family:'Noto Serif SC','Microsoft YaHei',serif;color:var(--whdir-ink)}
.whdir-bg{position:absolute;inset:0;background-position:center;background-size:cover;animation:whdirFade 140ms ease-out}
.whdir-stage[data-transition=cut] .whdir-bg{animation:none}
.whdir-actor{position:absolute;bottom:-34%;height:128%;width:800px;transform-origin:50% 97.65625%;pointer-events:none;transition:filter 140ms ease;filter:drop-shadow(0 10px 15px #0002)}
.whdir-actor img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;object-position:center bottom}
.whdir-actor.is-quiet{filter:brightness(.72) saturate(.85)}
.whdir-pose-in{animation:whdirFade 140ms ease-out}.whdir-pose-old{animation:whdirOut 140ms ease-out forwards}
.whdir-hud{position:absolute;left:32px;top:32px;padding:12px 18px;background:#071527a8;border-left:2px solid #8fe8f3;color:#f2e8d5;font-size:20px;line-height:1.6}.whdir-hud small{font-size:14px;color:#b6cbd9}
.whdir-top{position:absolute;right:30px;top:35px;display:flex;gap:10px}.whdir button{cursor:pointer;font:inherit}.whdir-top button,.whdir-restore{border:1px solid #bddce64a;background:#061526c9;color:#eae2cf;padding:9px 15px;font-size:16px}.whdir button:hover{filter:brightness(1.18)}.whdir button:focus-visible{outline:2px solid #9af4ff;outline-offset:3px}.whdir button:disabled{opacity:.5;cursor:wait}
.whdir-frame{position:absolute;left:27px;top:602px;width:1610px;height:320px;background-size:100% 100%;pointer-events:none}
.whdir-plain{position:absolute;left:27px;top:640px;width:1610px;height:282px;background:#0c1c34ef;border:1px solid #8fe8f34d}
.whdir-speaker{position:absolute;left:210px;top:640px;width:235px;text-align:center;font-size:28px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.whdir-narration{position:absolute;left:233px;top:685px;right:245px;height:29px;overflow-y:auto;font:16px/28px 'Microsoft YaHei',sans-serif;color:var(--whdir-muted)}
.whdir-line{position:absolute;left:233px;top:720px;width:1185px;max-height:94px;overflow:auto;font-size:28px;line-height:1.65;letter-spacing:1px;cursor:pointer;white-space:pre-wrap;scrollbar-width:thin}
.whdir-dock{position:absolute;left:690px;top:820px;width:735px;height:44px;background-size:100% 100%;display:flex;align-items:center;justify-content:center;gap:0}.whdir-dock button{font-size:16px;color:var(--whdir-ink);background:transparent;border:0;border-right:1px solid #9fb6c44a;padding:5px 17px;line-height:1.1}.whdir-dock button:last-child{border-right:0}.whdir-dock button[aria-pressed=true]{color:#ffcf7d;box-shadow:inset 0 -2px #ffcf7d}
.whdir-settlement{position:absolute;left:240px;top:822px;max-width:420px;max-height:40px;overflow:auto;font:13px/1.5 'Microsoft YaHei',sans-serif;color:var(--whdir-accent)}
.whdir-input{position:absolute;left:233px;top:871px;width:1185px;height:34px;display:flex;gap:12px}.whdir-input input{min-width:0;flex:1;background:#05132344;border:0;border-bottom:1px solid #a6cbdb55;color:var(--whdir-ink);font:17px 'Microsoft YaHei',sans-serif;padding:5px 10px}.whdir-input input::placeholder{color:var(--whdir-muted)}.whdir-input button{background:#0c263e;border:1px solid #9ebcc84d;color:#fff5d5;padding:0 20px;font-size:16px}
.whdir-choices{position:absolute;right:60px;top:340px;display:flex;flex-direction:column;gap:12px;max-width:500px}.whdir-choices button{background:linear-gradient(100deg,#071c36ed,#0c2948e8);border:1px solid #9fdde85a;border-left:3px solid #d5bb81;color:#f6ebd2;padding:16px 24px;text-align:left;font-size:22px;line-height:1.45}.whdir-choices small{display:block;font-size:13px;color:#d9bc82;margin-bottom:5px}
.whdir-restore{position:absolute;right:30px;bottom:30px}
@keyframes whdirFade{from{opacity:0}to{opacity:1}}@keyframes whdirOut{to{opacity:0}}
@media(prefers-reduced-motion:reduce){.whdir *{animation:none!important;transition:none!important}.whdir-pose-old{display:none}}
@container(max-width:720px){
.whdir-stage{width:100%!important;height:100%!important;left:0;top:0;transform:none!important}
.whdir-actor{height:82%;bottom:16%;width:90%}.whdir-hud{left:12px;top:12px;padding:8px 10px;font-size:12px}.whdir-hud small{font-size:10px}.whdir-top{right:12px;top:74px;gap:5px}.whdir-top button{font-size:11px;padding:7px}
.whdir-frame,.whdir-plain{left:8px;top:54%;right:8px;width:auto;height:calc(46% - 8px);background-image:none!important;background:#09192eeb;border:1px solid #9bbac14d;backdrop-filter:blur(10px)}
.whdir-speaker{top:56%;left:20px;width:auto;color:#eee4d0!important;text-align:left;font-size:16px}.whdir-narration{left:20px;top:61%;right:20px;height:33px;font-size:11px;line-height:1.5}.whdir-line{left:20px;top:67%;width:calc(100% - 40px);max-height:15%;font-size:16px;line-height:1.7;letter-spacing:0}
.whdir-dock{left:16px;top:88%;width:calc(100% - 32px);height:30px;background-image:none!important;justify-content:space-between}.whdir-dock button{font-size:11px;padding:7px 8px}.whdir-input{left:20px;top:94%;width:calc(100% - 40px);height:30px;gap:6px}.whdir-input input{font-size:12px;padding:4px}.whdir-input button{font-size:12px;padding:0 10px}
.whdir-settlement{left:20px;top:83%;max-width:calc(100% - 40px);max-height:30px;font-size:10px}.whdir-choices{left:12px;right:12px;top:auto;bottom:calc(46% + 10px);max-width:none;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.whdir-choices button{font-size:11px;padding:8px;min-height:70px}.whdir-choices small{font-size:10px;margin-bottom:2px}.whdir-restore{right:16px;bottom:16px;font-size:12px}
}
`
