import React from 'react'
import {NARRATOR_ART} from './narrator-art.generated'
export {NARRATOR_CSS} from './narrator-frame.css'
const h=React.createElement

/** Art and type stay separate so the plaque can be localized. */
export function NarratorFrame(){return h(React.Fragment,null,
 h('img',{className:'narrator-panel narrator-desktop',src:NARRATOR_ART.panel,alt:'','aria-hidden':true}),
 h('img',{className:'narrator-panel narrator-mobile',src:NARRATOR_ART.mobilePanel,alt:'','aria-hidden':true}),
 h('img',{className:'narrator-frame narrator-desktop',src:NARRATOR_ART.frame,alt:'','aria-hidden':true}),
 h('img',{className:'narrator-frame narrator-mobile',src:NARRATOR_ART.mobileFrame,alt:'','aria-hidden':true}),
 h('div',{className:'narrator-name'},h('span',null,'旁白'),h('small',{'aria-hidden':true},'NARRATION')))}
