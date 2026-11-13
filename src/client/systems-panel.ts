import React, {useEffect, useRef, useState} from 'react'
import {FolioCard} from './folio-ui'
import {GalAssetManager} from './asset-manager'
const h=React.createElement

export function GalSystemsPanel({callApi,roleId,onClose,onStory,onView,initialTab='worlds'}:any):any {
  const [tab,setTab]=useState(initialTab),[data,setData]=useState<any>({items:[],jobs:[]})
  const [worlds,setWorlds]=useState<any[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[premise,setPremise]=useState('')
  const mounted=useRef(true)
  const reload=async()=>{
    const [assets,stories]=await Promise.all([callApi('asset-list',{}),callApi('gal-world-list',{})])
    if(mounted.current){setData(assets);setWorlds(stories.items||[])}
  }
  useEffect(()=>{
    mounted.current=true;reload().catch(e=>setError(e.message))
    const timer=setInterval(()=>reload().catch(()=>{}),2500)
    return()=>{mounted.current=false;clearInterval(timer)}
  },[])
  const run=async(fn:any)=>{if(busy)return;setBusy(true);setError('');try{await fn();await reload()}catch(e:any){setError(e.message)}finally{if(mounted.current)setBusy(false)}}
  const call=async(name:string,args:any)=>{const r=await callApi(name,args);if(r?.ok===false||r?.error)throw new Error(r.error||'操作失败');return r}
  const button=(label:string,fn:any)=>h('button',{type:'button',className:'whg-gal-paper-btn',disabled:busy,onClick:()=>run(fn)},label)
  return h('div',{className:'whg-gal-panel',onClick:onClose},h(FolioCard,{className:'whg-gal-panel-card',role:'dialog','aria-modal':true,'aria-label':'世界线与资产管理',onClick:(e:any)=>e.stopPropagation(),onDismiss:onClose,resetKey:tab,toolbar:h('nav',{style:{display:'flex',gap:16,marginBottom:18}},button('世界线',()=>setTab('worlds')),button('资产管理',()=>setTab('assets')))},
    h('header',{style:{position:'sticky',top:-1,zIndex:2,background:'#0a0e15',boxShadow:'0 -32px 0 #0a0e15',display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0'}},h('h3',{style:{margin:0}},'世界线与资产管理'),h('button',{type:'button',className:'whg-gal-panel-close',onClick:onClose},'关闭 ×')),
    error?h('p',{role:'alert',style:{color:'#ffbdaf'}},error):null,
    tab==='assets'?data.groups?h(GalAssetManager,{data,callApi,roleId,onStory,onView,reload}):h('p',null,'正在读取素材库…'):h('div',null,
      h('p',null,'每条世界线保存自己的对白、场景、事实和承诺。读档后继续会产生新分支。'),
      h('textarea',{className:'whg-gal-say-input',value:premise,rows:3,'aria-label':'开局设定',placeholder:'开局设定：你们如何相遇、你是谁、这次想共同经历什么……',onChange:(e:any)=>setPremise(e.target.value),style:{width:'95%',borderRadius:0}}),
      button('新建世界线',async()=>{onStory(await call('gal-free-start',{roleId,premise,restart:true}))}),
      ...worlds.map(w=>h('div',{key:w.worldId,style:{padding:'12px 0',borderTop:'1px solid #ffffff20'}},h('span',null,(w.active?'当前 · ':'')+w.title+' · '+w.roleId+' · '+w.revision+' 轮 · '+new Date(w.updatedAt).toLocaleString('zh-CN')+' '),button('继续',async()=>onStory(await call('gal-world-select',{worldId:w.worldId}))))),
    ),
  ))
}
