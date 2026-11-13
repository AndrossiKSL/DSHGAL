import React from 'react'
import {CAMEO_FRAME,SAVE_FRAME} from './signal-jewelry-art.generated'
const h=React.createElement
export function PortraitCameo({src,children,className=''}:any){return h('span',{className:'jewel-cameo '+className,'aria-hidden':true},src?h('span',{className:'jewel-cameo-photo'},h('img',{src,alt:''})):h('span',{className:'jewel-cameo-icon'},children),h('img',{className:'jewel-cameo-art',src:CAMEO_FRAME,alt:''}))}
export function SaveLeafFrame(){return h('img',{className:'jewel-slot-art',src:SAVE_FRAME,alt:'','aria-hidden':true})}
