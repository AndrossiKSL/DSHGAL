import {useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react'
import {graphemes,paginateText} from '../reading-pages'
export function useSignalReader({nodeKey,narration,line,dialogue,active,blocked,speed,auto,skip,isRead,hasChoices,onAdvance,onStopSkip,controller}:any){
 const copy=useRef<any>(null),measure=useRef<any>(null)
 const docKey=JSON.stringify([nodeKey,narration,line,dialogue])
 const [plan,setPlan]=useState<any>({key:'',pages:[]}),[position,setPosition]=useState({key:'',offset:0}),[reveal,setReveal]=useState({key:'',count:0})
 useLayoutEffect(()=>{
  if(!active||!copy.current||!measure.current)return
  let live=true
  const reflow=()=>{
   if(!live)return
   const box=copy.current,probe=measure.current;if(!box||!probe||box.clientWidth<1||box.clientHeight<1)return
   probe.style.width=box.clientWidth+'px'
   const fits=(value:string)=>{probe.textContent=value;return probe.getBoundingClientRect().height<=box.clientHeight-.5}
   let offset=0;const pages:any[]=[]
   const blocks=[...(narration?[{kind:'narration',text:String(narration)}]:[]),...(dialogue?.length?dialogue.map((row:any)=>({...row,kind:'dialogue'})):[{kind:'dialogue',text:String(line||'')}])]
   for(const block of blocks)for(const text of paginateText(block.text,fits)){pages.push({...block,text,start:offset,end:offset+text.length});offset+=text.length}
   if(!pages.length)pages.push({kind:'dialogue',text:'',start:0,end:0})
   setPlan((old:any)=>old.key===docKey&&JSON.stringify(old.pages)===JSON.stringify(pages)?old:{key:docKey,pages})
  }
  reflow();const observer=new ResizeObserver(reflow);observer.observe(copy.current)
  document.fonts?.ready.then(reflow)
  return()=>{live=false;observer.disconnect()}
 },[docKey,active])
 const ready=plan.key===docKey&&plan.pages.length>0,offset=position.key===docKey?position.offset:0
 const index=ready?Math.max(0,plan.pages.findIndex((p:any,i:number)=>p.end>offset||i===plan.pages.length-1)):0
 const page=ready?plan.pages[index]:{kind:narration?'narration':'dialogue',text:'',start:0,end:0}
 const pageKey=docKey+':'+page.start,chars=useMemo(()=>graphemes(page.text),[page.text]),count=reveal.key===pageKey?reveal.count:0
 const typing=ready&&speed>0&&count<chars.length,complete=ready&&index===plan.pages.length-1&&!typing
 const show=()=>setReveal({key:pageKey,count:chars.length})
 const previous=()=>{if(index>0&&!blocked)setPosition({key:docKey,offset:plan.pages[index-1].start})}
 const advance=()=>{if(!ready||blocked)return;if(typing){show();return}if(index<plan.pages.length-1)setPosition({key:docKey,offset:plan.pages[index+1].start});else if(!hasChoices)onAdvance()}
 useLayoutEffect(()=>{if(controller)controller.current={advance,reveal:show};return()=>{if(controller)controller.current=null}})
 useEffect(()=>{
  if(!active||blocked||!typing)return
  const timer=setTimeout(()=>setReveal({key:pageKey,count:Math.min(chars.length,count+1)}),Math.max(1,speed))
  return()=>clearTimeout(timer)
 },[active,blocked,typing,pageKey,count,speed])
 useEffect(()=>{
  if(!active||blocked||!ready||!auto&&!skip)return
  if(skip&&!isRead){onStopSkip?.();return}
  if(typing&&!skip||complete&&hasChoices)return
  const timer=setTimeout(advance,skip?120:auto)
  return()=>clearTimeout(timer)
 },[active,blocked,ready,auto,skip,isRead,typing,complete,hasChoices,pageKey,index])
 return{copy,measure,ready,index,total:ready?plan.pages.length:1,kind:page.kind,speaker:page.speaker,action:page.action,to:page.to,reactions:page.reactions||[],text:ready?(typing?chars.slice(0,count).join(''):page.text):'',typing,complete,advance,previous,reveal:show}
}
