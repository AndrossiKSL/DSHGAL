import {PersonaEditor} from './persona-editor'
import {PERSONA_EDITOR_CSS} from './persona-editor.css'
import React,{useEffect,useState} from 'react'
import {FolioCard,ControlTrim} from './folio-ui'
import {DetailIcon} from './signal-details'
import {CharacterEmblem,AtelierLoading,AtelierEmpty,roleThemeStyle} from './signal-experience'
import {PortraitCameo} from './signal-jewelry'
import {SIGNAL_THEME} from '../signal-theme'
const h=React.createElement

export function CastPanel({callApi,art,onClose,onInvite,busy,onProfileSaved}:any):any{
 const [editRole,setEditRole]=useState(''),[revision,setRevision]=useState(0)
 const [data,setData]=useState<any>(null),[query,setQuery]=useState(''),[error,setError]=useState('')
 useEffect(()=>{let live=true;callApi('gal-ensemble-state',{}).then((r:any)=>{if(live){if(r.ok===false)setError(r.error);else setData(r)}}).catch((e:any)=>{if(live)setError(e.message)});return()=>{live=false}},[revision])
 if(editRole)return h(PersonaEditor,{characterId:editRole,callApi,art,onSaved:onProfileSaved,onClose:()=>{const previous=editRole;setEditRole('');setRevision(v=>v+1);setTimeout(()=>document.querySelector<HTMLElement>('.whcast-person[data-role="'+previous+'"] .persona-editor-entry')?.focus(),0)}})
 const people=(data?.roles||[]).filter((r:any)=>(r.name+r.post+r.location).toLowerCase().includes(query.toLowerCase()))
 const toolbar=h(React.Fragment,null,
  h('p',{className:'whcast-intro'},'她们各有手边的事，也记得与你相处过的经历。可以加入眼前的谈话，或请一位同伴过来。'),
  data?h('div',{className:'folio-cast-tools'},
   h('label',{className:'folio-search'},h(DetailIcon,{id:'search'}),h('input',{type:'search',className:'whcast-search','aria-label':'寻找同伴',placeholder:'按名字、岗位或地点寻找…',value:query,onChange:(e:any)=>setQuery(e.target.value)})),
   h('div',{className:'whcast-count','aria-live':'polite'},h('b',null,query?people.length+' / '+data.roles.length:data.roles.length),'位同伴',h('span',null,data.present.length+' 位在场'))):null)
 return h('div',{className:'whg-gal-panel',onClick:onClose},h('style',null,PERSONA_EDITOR_CSS),
  h(FolioCard,{className:'whg-gal-panel-card whcast',role:'dialog','aria-modal':true,'aria-label':'工坊同伴',onClick:(e:any)=>e.stopPropagation(),onDismiss:onClose,toolbar,resetKey:query},
   h('div',{className:'whg-gal-panel-head'},h('span',null,'工坊同伴'),h('button',{type:'button',className:'whg-gal-panel-close',onClick:onClose},'关闭 ×')),
   error?h('p',{role:'alert'},error):null,
   !data?h(AtelierLoading):!people.length?h(AtelierEmpty,{title:'没有找到这位同伴',detail:'试试其他名字、岗位或地点。',action:'查看所有同伴',onAction:()=>setQuery('')}):
   h('div',{className:'whcast-grid'},...people.map((r:any)=>{
    const present=data.present.includes(r.id),skin=(SIGNAL_THEME as any).skins[r.id]||{}
    return h('article',{className:'whcast-person',key:r.id,'data-role':r.id,'data-present':present,style:roleThemeStyle(skin)},
     h(ControlTrim),h('span',{className:'folio-cast-emblem'},h(CharacterEmblem,{id:r.id})),
     h(PortraitCameo,{src:art('portrait-'+r.id)}),
     h('div',null,h('h4',null,r.name),h('small',{className:'whcast-post'},present?'在场 · '+r.post:r.post)),
     h('p',null,r.activity),
     h('div',{className:'folio-cast-bottom'},h('span',{className:'folio-cast-location'},h(DetailIcon,{id:'worlds'}),r.location),
      h('button',{type:'button',className:'persona-editor-entry',disabled:busy,'aria-label':'编辑'+r.name+'的人设',onClick:()=>setEditRole(r.id)},h(DetailIcon,{id:'editor'}),'人设编辑'),
      h('button',{type:'button',disabled:busy,'aria-label':(present?'问问':'请来')+r.name,onClick:()=>onInvite(r)},h(ControlTrim),present?'问问她':'请她过来',h(DetailIcon,{id:'arrow'}))))
   }))))
}
