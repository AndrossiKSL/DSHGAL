export const SCENE_TYPES = ['image','text','rect','button','container']
export const SCENE_BINDINGS = ['','background','character','speaker','line','narration','affection','clock','input','choices','tools']
export const SCENE_ACTIONS = ['','advance','history','save','load','assets','editor','exit','cg','auto','skip','story']
const string=(v:any,n=200)=>typeof v==='string'?v.slice(0,n):''
const color=(v:any,fallback='transparent')=>typeof v==='string'&&v.length<180&&!/url\s*\(|expression|[;{}<>]/i.test(v)?v:fallback
const number=(v:any,f:number,min:number,max:number)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):f
export const cloneScene=(s:any):any=>JSON.parse(JSON.stringify(s))

export function sceneElement(type='text',id='element'):any {
  return {id,type:SCENE_TYPES.includes(type)?type:'text',name:type==='image'?'图片素材':type==='rect'?'形状':type==='button'?'按钮':'文字',
    x:300,y:250,w:type==='text'?500:350,h:type==='text'?80:200,rotation:0,opacity:1,z:20,locked:false,hidden:false,
    binding:'',assetId:'',artKey:'',text:type==='text'?'双击属性中的文字进行编辑':type==='button'?'按钮':'',action:'',
    fit:'contain',background:type==='rect'?'rgba(8,15,28,.82)':'transparent',color:'#f2ede3',fontSize:30,fontFamily:'Microsoft YaHei',
    align:'left',padding:12,borderColor:'transparent',borderWidth:0,radius:0}
}

export function defaultSceneLayout():any {
  const make=(id:string,type:string,patch:any)=>({...sceneElement(type,id),padding:0,...patch})
  return {version:1,width:1920,height:1080,grid:20,snap:true,showGrid:true,elements:[
    make('background','image',{name:'背景 · 跟随场景',binding:'background',x:0,y:0,w:1920,h:1080,z:0,locked:true,fit:'cover'}),
    make('character','image',{name:'角色 · 跟随当前动作',binding:'character',x:420,y:15,w:1080,h:1120,z:10}),
    make('dialogue-frame','image',{name:'对话框美术',artKey:'ui-dialogue-classic',x:200,y:770,w:1520,h:290,z:20,fit:'fill'}),
    make('speaker','text',{name:'角色名 · 动态',binding:'speaker',x:360,y:784,w:480,h:55,z:30,fontSize:32,color:'#f2d78f'}),
    make('narration','text',{name:'旁白 · 动态',binding:'narration',x:360,y:843,w:1200,h:40,z:31,fontSize:21,color:'#bbbfcc'}),
    make('line','text',{name:'台词 · 动态',binding:'line',x:360,y:877,w:1210,h:100,z:32,fontSize:26}),
    make('input','container',{name:'输入与发送 · 动态',binding:'input',x:360,y:984,w:1210,h:42,z:35}),
    make('choices','container',{name:'剧情选项 · 动态',binding:'choices',x:1260,y:470,w:510,h:270,z:18}),
    make('tools','container',{name:'游戏菜单 · 动态',binding:'tools',x:350,y:1032,w:1240,h:34,z:40}),
    make('affection','text',{name:'好感度 · 动态',binding:'affection',x:1280,y:789,w:300,h:38,z:32,fontSize:18,align:'right',color:'#a8d1ee'}),
  ]}
}

export function normalizeSceneLayout(raw:any):any {
  if(!raw||typeof raw!=='object'||raw.version!==1||!Array.isArray(raw.elements))throw new Error('场景格式无法识别，请导入本编辑器导出的场景 JSON')
  if(raw.elements.length>80)throw new Error('每个布局最多 80 个元素')
  if(!Number.isFinite(Number(raw.width))||!Number.isFinite(Number(raw.height)))throw new Error('舞台尺寸无效')
  const ids=new Set<string>()
  const elements=raw.elements.map((r:any,i:number)=>{
    if(!r||!SCENE_TYPES.includes(r.type)||!r.id||!/^[a-zA-Z0-9_.:-]{1,100}$/.test(r.id)||ids.has(r.id))throw new Error('元素类型或 ID 无效，或存在重复 ID')
    ids.add(r.id)
    const type=r.type,binding=SCENE_BINDINGS.includes(r.binding)?r.binding:''
    if(binding&&((['background','character'].includes(binding)&&type!=='image')||(['input','choices','tools'].includes(binding)&&type!=='container')||(['speaker','line','narration','affection','clock'].includes(binding)&&type!=='text')))throw new Error('动态绑定与元素类型不匹配')
    return {...sceneElement(type,r.id),name:string(r.name,100)||r.id,x:number(r.x,0,-7680,7680),y:number(r.y,0,-7680,7680),w:number(r.w,100,12,7680),h:number(r.h,100,12,7680),
      rotation:number(r.rotation,0,-360,360),opacity:number(r.opacity,1,0,1),z:number(r.z,i,-1000,1000),locked:r.locked===true,hidden:r.hidden===true,binding,
      assetId:/^[a-zA-Z0-9_.:-]{0,120}$/.test(r.assetId||'')?r.assetId||'':'',artKey:/^[a-zA-Z0-9_.:-]{0,120}$/.test(r.artKey||'')?r.artKey||'':'',
      text:string(r.text,5000),action:SCENE_ACTIONS.includes(r.action)?r.action:'',fit:['contain','cover','fill'].includes(r.fit)?r.fit:'contain',
      background:color(r.background),color:color(r.color,'#f2ede3'),fontSize:number(r.fontSize,30,8,240),fontFamily:string(r.fontFamily,160)||'Microsoft YaHei',
      align:['left','center','right'].includes(r.align)?r.align:'left',padding:number(r.padding,12,0,160),borderColor:color(r.borderColor),borderWidth:number(r.borderWidth,0,0,40),radius:number(r.radius,0,0,500)}
  })
  return {version:1,width:Math.round(number(raw.width,1920,320,3840)),height:Math.round(number(raw.height,1080,240,2160)),grid:Math.round(number(raw.grid,20,1,200)),snap:raw.snap!==false,showGrid:raw.showGrid!==false,elements}
}

export function validatePlayableScene(scene:any):void {
  for(const binding of ['line','input'])if(!scene.elements.some((e:any)=>e.binding===binding&&!e.hidden&&e.opacity>0&&e.x<scene.width&&e.y<scene.height&&e.x+e.w>0&&e.y+e.h>0))throw new Error('应用布局前需要保留可见的'+(binding==='line'?'动态台词':'输入与发送')+'元素')
}

export function moveSceneLayer(scene:any,id:string,direction:string):any {
  const next=cloneScene(scene),ordered=next.elements.slice().sort((a:any,b:any)=>a.z-b.z),i=ordered.findIndex((e:any)=>e.id===id)
  if(i<0)return next
  const [element]=ordered.splice(i,1)
  const target=direction==='top'?ordered.length:direction==='bottom'?0:direction==='up'?Math.min(i+1,ordered.length):Math.max(0,i-1)
  ordered.splice(target,0,element);ordered.forEach((e:any,index:number)=>{e.z=index})
  return next
}

export function sceneGestureRect(element:any,mode:string,dx:number,dy:number,grid=1):any {
  const snap=(n:number)=>Math.round(n/grid)*grid
  if(mode==='move')return {x:snap(element.x+dx),y:snap(element.y+dy)}
  // Resize in the element's own axes, so handles remain useful after rotation.
  const radians=element.rotation*Math.PI/180,lx=dx*Math.cos(radians)+dy*Math.sin(radians),ly=-dx*Math.sin(radians)+dy*Math.cos(radians)
  const left=mode.includes('w'),top=mode.includes('n')
  let w=element.w,h=element.h
  if(mode.includes('e')||left)w=Math.max(12,snap(element.w+(left?-lx:lx)))
  if(mode.includes('s')||top)h=Math.max(12,snap(element.h+(top?-ly:ly)))
  const shiftX=left?(element.w-w)/2:(w-element.w)/2,shiftY=top?(element.h-h)/2:(h-element.h)/2
  const cx=element.x+element.w/2+shiftX*Math.cos(radians)-shiftY*Math.sin(radians)
  const cy=element.y+element.h/2+shiftX*Math.sin(radians)+shiftY*Math.cos(radians)
  return {x:cx-w/2,y:cy-h/2,w,h}
}
