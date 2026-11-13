import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync,mkdirSync,renameSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {Readable} from 'node:stream'
import {apply,defaultSceneLayout,normalizeSceneLayout,sceneGestureRect,moveSceneLayer} from '../dist/index.js'
const pause=ms=>new Promise(r=>setTimeout(r,ms))
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN1kAAAAASUVORK5CYII='
function boot(home){let route;apply({dshHomePath:(...p)=>join(home,...p),effect:fn=>fn(),on(){},inject(){},webServer:{register(r){route=r}}},{enabled:true,imageBackend:'off'},{});return async(action,args={})=>{let text='',code;const req=Readable.from([Buffer.from(JSON.stringify({action,args}))]);req.method='POST';await route.handler(req,{writeHead(c){code=c},end(v){text=v}});const r=JSON.parse(text);if(code!==200)throw new Error(r.error);return r}}
test('drag snapping and rotated resize preserve the opposite edge',()=>{
  const e={x:100,y:100,w:100,h:100,rotation:90}
  assert.deepEqual(sceneGestureRect(e,'move',11,-9,20),{x:120,y:100})
  const resized={...e,...sceneGestureRect(e,'e',0,20,1)}
  assert.equal(resized.w,120);assert.equal(resized.h,100)
  const fixedEdge=r=>[r.x+r.w/2,r.y+r.h/2-r.w/2]
  assert.deepEqual(fixedEdge(resized),fixedEdge(e))
  const clamped=sceneGestureRect({...e,rotation:0},'w',1000,0,1)
  assert.equal(clamped.w,12);assert.equal(clamped.x+clamped.w,200)
  const scene=defaultSceneLayout(),top=moveSceneLayer(scene,'background','top')
  assert.equal(top.elements.slice().sort((a,b)=>b.z-a.z)[0].id,'background');assert.equal(scene.elements[0].z,0)
})
test('layout documents publish, restart and reject concurrent or invalid edits',async()=>{
  const home=mkdtempSync(join(tmpdir(),'scene-editor-'))
  try{
    let call=boot(home);const initial=await call('view')
    assert.equal(initial.sceneLayout,null)
    const scene=defaultSceneLayout()
    const image=await call('asset-import',{characterId:'deepseek',kind:'other',label:'装饰',dataUrl:png})
    scene.elements.push({...scene.elements[1],id:'decoration',name:'自定义装饰',binding:'',assetId:image.id,x:70,y:90,z:50})
    const created=await call('scene-layout-save',{name:'工坊演出',scene,apply:true})
    assert.equal(created.ok,true);assert.equal(created.view.sceneLayout.id,created.document.id)
    assert.equal(created.view.sceneLayout.scene.elements.find(e=>e.id==='decoration').x,70)
    const conflict=await call('scene-layout-save',{id:created.document.id,expectedRevision:0,scene,name:'旧窗口'})
    assert.equal(conflict.ok,false);assert.equal(conflict.document.revision,1)
    const modified=structuredClone(scene);modified.elements.find(e=>e.id==='line').x=430
    const saved=await call('scene-layout-save',{id:created.document.id,expectedRevision:1,scene:modified,name:'工坊演出'})
    assert.equal(saved.document.revision,2)
    call=boot(home);const view=await call('view')
    assert.equal(view.sceneLayout.revision,2);assert.equal(view.sceneLayout.scene.elements.find(e=>e.id==='line').x,430)
    assert.equal(view.level,initial.level);assert.equal(view.affection,initial.affection)
    const broken=structuredClone(scene);broken.elements=broken.elements.filter(e=>e.binding!=='input')
    const draft=await call('scene-layout-save',{scene:broken,name:'仅作草稿'})
    assert.equal(draft.ok,true)
    assert.equal((await call('scene-layout-publish',{id:draft.document.id,expectedRevision:1})).ok,false)
    const invalid=structuredClone(scene);invalid.elements[0].assetId='not-a-real-asset'
    assert.equal((await call('scene-layout-save',{name:'坏引用',scene:invalid})).ok,false)
    assert.equal((await call('scene-layout-publish',{id:''})).view.sceneLayout,null)
    assert.equal((await call('scene-layout-delete',{id:created.document.id,expectedRevision:1})).ok,false)
    assert.equal((await call('scene-layout-delete',{id:created.document.id,expectedRevision:2})).ok,true)
  }finally{await pause(100);rmSync(home,{recursive:true,force:true})}
})
test('malformed scene imports and unsafe sources never become runtime content',()=>{
  const scene=defaultSceneLayout();scene.elements[0].background='url(https://example.invalid/tracker)';scene.elements[1].assetId='../private.png'
  const clean=normalizeSceneLayout(scene)
  assert.equal(clean.elements[0].background,'transparent');assert.equal(clean.elements[1].assetId,'')
  assert.throws(()=>normalizeSceneLayout({...scene,elements:[scene.elements[0],scene.elements[0]]}),/重复/)
  assert.throws(()=>normalizeSceneLayout({...scene,elements:Array.from({length:81},()=>scene.elements[0])}),/80/)
  assert.throws(()=>normalizeSceneLayout({settings:{apiKey:'should-not-import'},elements:[]}),/格式/)
})
test('a failed disk write leaves the prior published layout intact in memory',async()=>{
  const home=mkdtempSync(join(tmpdir(),'scene-write-'))
  const file=join(home,'storages','dsh-whale-galgame','global.json'),backup=file+'.backup'
  let replaced=false
  try{
    const call=boot(home),scene=defaultSceneLayout()
    const first=await call('scene-layout-save',{name:'已保存的场景',scene,apply:true})
    renameSync(file,backup);mkdirSync(file);replaced=true
    await assert.rejects(()=>call('scene-layout-save',{id:first.document.id,expectedRevision:1,name:'不应发布',scene}),/./)
    rmSync(file,{recursive:true});renameSync(backup,file);replaced=false
    const state=await call('scene-layout-state')
    assert.equal(state.document.revision,1);assert.equal(state.document.name,'已保存的场景')
  }finally{if(replaced){rmSync(file,{recursive:true,force:true});renameSync(backup,file)}await pause(100);rmSync(home,{recursive:true,force:true})}
})
