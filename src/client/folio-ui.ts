import React,{useEffect,useRef} from 'react'
import {FOLIO_CSS} from './folio-ui.css'
const h=React.createElement

export function FolioStyles(){return h('style',null,FOLIO_CSS)}

/** The decoration belongs to the stationary shell; only this inner viewport scrolls. */
export const FolioCard=React.forwardRef<HTMLElement,any>(function FolioCard({children,className='',toolbar,onDismiss,resetKey,...props},forwardedRef){
 const shell=useRef<HTMLElement|null>(null),scroll=useRef<HTMLDivElement|null>(null),dismiss=useRef(onDismiss);dismiss.current=onDismiss
 const nodes=React.Children.toArray(children),heading=nodes.shift()
 const title=(heading as any)?.props?.children?.[0]?.props?.children
 useEffect(()=>{if(scroll.current)scroll.current.scrollTop=0},[resetKey])
 useEffect(()=>{
  if(!dismiss.current)return
  const previous=document.activeElement as HTMLElement
  const fallback=shell.current?.closest('.whsig')?.querySelector<HTMLElement>('.top-menu')
  const timer=setTimeout(()=>shell.current?.querySelector<HTMLElement>('button')?.focus(),0)
  const key=(e:KeyboardEvent)=>{
   if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();dismiss.current?.();return}
   if(e.key!=='Tab')return
   const nodes=[...shell.current?.querySelectorAll<HTMLElement>('button:not(:disabled),select,input,textarea,summary,[tabindex="0"]')||[]].filter(n=>n.getClientRects().length>0)
   if(e.shiftKey&&document.activeElement===nodes[0]){e.preventDefault();nodes.at(-1)?.focus()}
   else if(!e.shiftKey&&document.activeElement===nodes.at(-1)){e.preventDefault();nodes[0]?.focus()}
  }
  window.addEventListener('keydown',key,true)
  return()=>{clearTimeout(timer);window.removeEventListener('keydown',key,true);if(previous?.isConnected&&previous!==document.body)previous.focus();else if(fallback?.isConnected)fallback.focus()}
 },[])
 return h('section',{role:'dialog','aria-modal':true,'aria-label':typeof title==='string'?title:'游戏面板',...props,className:className+' folio-card',ref:(el:HTMLElement|null)=>{shell.current=el;if(typeof forwardedRef==='function')forwardedRef(el);else if(forwardedRef)forwardedRef.current=el}},
  h(FolioStyles),h('div',{className:'folio-fixed'},heading,toolbar),
  h('div',{className:'folio-scroll',ref:scroll,tabIndex:0,'aria-label':'面板内容'},...nodes))
})

/** Original, scalable brass inlay. Vector strokes stay crisp at every panel size. */
export function ControlTrim(){return h('svg',{className:'folio-control-art',viewBox:'0 0 360 84',preserveAspectRatio:'none',fill:'none','aria-hidden':true},
 h('path',{d:'M17 3H343L357 17V67L343 81H17L3 67V17Z',stroke:'currentColor',strokeWidth:.85,vectorEffect:'non-scaling-stroke'}),
 h('path',{d:'M25 8H335L352 25V59L335 76H25L8 59V25ZM3 26C17 26 26 17 26 3M334 3C334 17 343 26 357 26M3 58C17 58 26 67 26 81M334 81C334 67 343 58 357 58',stroke:'currentColor',strokeWidth:.55,opacity:.55,vectorEffect:'non-scaling-stroke'}),
 h('path',{d:'m180 2 4 3-4 3-4-3Zm0 74 4 3-4 3-4-3ZM16 39l3 3-3 3-3-3ZM344 39l3 3-3 3-3-3Z',fill:'currentColor',opacity:.75}))}

export function ChapterCrest(){return h('svg',{className:'folio-chapter-art',viewBox:'0 0 360 64',preserveAspectRatio:'none',fill:'none','aria-hidden':true},
 h('path',{d:'M2 52H110C135 52 141 39 155 39C167 39 173 47 180 53C187 47 193 39 205 39C219 39 225 52 250 52H358M2 56H104C130 56 136 48 151 48M209 48C224 48 230 56 256 56H358',stroke:'currentColor',strokeWidth:.8,vectorEffect:'non-scaling-stroke'}),
 h('path',{d:'M180 53C168 43 157 31 160 17C166 20 173 25 180 35C187 25 194 20 200 17C203 31 192 43 180 53ZM180 35V10M174 11l6-8 6 8-6 7Z',stroke:'currentColor',strokeWidth:1,vectorEffect:'non-scaling-stroke'}),
 h('path',{d:'m100 49 4 3-4 3-4-3Zm160 0 4 3-4 3-4-3Z',fill:'currentColor'}))}
