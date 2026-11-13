import {app,BrowserWindow,Menu,dialog,shell,session,ipcMain} from 'electron'
import {mkdir,readFile,appendFile,writeFile} from 'node:fs/promises'
import {existsSync} from 'node:fs'
import {dirname,join,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {startApp} from '../standalone/server.mjs'
import {desktopDataDirectory,isGameNavigation,desktopWindowOptions} from './options.mjs'

const projectRoot=resolve(dirname(fileURLToPath(import.meta.url)),'../..')
const dataDir=desktopDataDirectory({override:process.env.DSHGAL_DATA_DIR,packaged:app.isPackaged,projectRoot,portableDirectory:process.env.PORTABLE_EXECUTABLE_DIR,systemUserData:app.getPath('userData')})
await mkdir(join(dataDir,'logs'),{recursive:true})
await mkdir(join(dataDir,'chromium'),{recursive:true})
app.setName('DSHGAL');app.setPath('userData',dataDir);app.setPath('sessionData',join(dataDir,'chromium'));app.setAppLogsPath(join(dataDir,'logs'))
const log=message=>appendFile(join(dataDir,'logs/desktop.log'),new Date().toISOString()+' '+message+'\n').catch(()=>{})
let server=null,window=null,quitting=false
const primary=app.requestSingleInstanceLock()
if(!primary){app.quit()}else{
 app.on('second-instance',()=>{if(window){if(window.isMinimized())window.restore();window.show();window.focus()}})
 app.on('before-quit',event=>{
  if(quitting)return;event.preventDefault();quitting=true
  void (async()=>{await log('Stopping owned game service');try{await server?.close()}catch(error){await log('Service shutdown failed: '+error.message)}session.defaultSession.flushStorageData();app.quit()})()
 })
 app.on('window-all-closed',()=>app.quit())
 app.whenReady().then(async()=>{
 try{
  // Reuse an available DSH backend on first launch; no model request or tool run.
  if(!existsSync(join(dataDir,'config.json'))){
   try{const response=await fetch('http://127.0.0.1:3080/whale-galgame-api',{signal:AbortSignal.timeout(1200)}),info=response.ok?await response.json():null;if(info?.service==='dsh-whale-galgame')await writeFile(join(dataDir,'config.json'),JSON.stringify({backend:'dsh',dshPort:3080,modelUrl:'http://127.0.0.1:8645/v1',model:'default'},null,2)+'\n',{mode:0o600})}catch{}
  }
  let savedPort=0
  try{const state=JSON.parse(await readFile(join(dataDir,'desktop-state.json'),'utf8'));if(Number.isInteger(state.port)&&state.port>0&&state.port<=65535)savedPort=state.port}catch{}
  try{server=await startApp({port:savedPort,dataDir})}catch(error){if(savedPort&&error.code==='EADDRINUSE')server=await startApp({port:0,dataDir});else throw error}
  await writeFile(join(dataDir,'desktop-state.json'),JSON.stringify({port:server.port})+'\n',{mode:0o600})
  const origin=server.url,icon=join(projectRoot,'assets/packs/signal/assets/labels/game-logo.png')
  const windowOptions=desktopWindowOptions(icon)
  windowOptions.webPreferences.preload=join(projectRoot,'apps/desktop/preload.cjs')
  window=new BrowserWindow(windowOptions)
  ipcMain.on('dshgal:quit',event=>{
   if(window&&event.sender===window.webContents&&event.senderFrame===window.webContents.mainFrame&&isGameNavigation(event.senderFrame.url,origin))app.quit()
  })
  window.webContents.session.setPermissionRequestHandler((_contents,_permission,answer)=>answer(false))
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}))
  window.webContents.on('will-navigate',(event,url)=>{if(!isGameNavigation(url,origin))event.preventDefault()})
  window.webContents.on('will-frame-navigate',(event)=>{if(!isGameNavigation(event.url,origin))event.preventDefault()})
  window.webContents.on('page-title-updated',event=>{event.preventDefault();window?.setTitle('深海女仆工坊 · DSHGAL')})
  window.webContents.on('before-input-event',(event,input)=>{if(input.type==='keyDown'&&input.key==='Escape'&&window.isFullScreen()){event.preventDefault();window.setFullScreen(false)}})
  window.once('ready-to-show',()=>{window.show();window.focus()})
  window.on('closed',()=>{window=null})
  window.webContents.on('render-process-gone',async()=>{
   if(quitting||!window)return
   const {response}=await dialog.showMessageBox(window,{type:'error',title:'游戏画面已停止',message:'可以重新载入游戏；已保存的进度会保留。',buttons:['重新载入','退出']})
   if(response===0)await window.loadURL(origin);else app.quit()
  })
  Menu.setApplicationMenu(Menu.buildFromTemplate([
   {label:'游戏',submenu:[{label:'返回标题',accelerator:'CmdOrCtrl+Home',click:()=>window?.loadURL(origin)},{label:'连接与后端',accelerator:'CmdOrCtrl+,',click:()=>window?.loadURL(origin+'/connection')},{type:'separator'},{label:'全屏',accelerator:'F11',click:()=>window?.setFullScreen(!window.isFullScreen())},{role:'quit',label:'退出游戏'}]},
   {label:'编辑',submenu:[{role:'undo',label:'撤销'},{role:'redo',label:'重做'},{type:'separator'},{role:'cut',label:'剪切'},{role:'copy',label:'复制'},{role:'paste',label:'粘贴'},{role:'selectAll',label:'全选'}]},
   {label:'帮助',submenu:[{label:'打开数据目录',click:()=>shell.openPath(dataDir)},{label:'打开日志目录',click:()=>shell.openPath(join(dataDir,'logs'))},{type:'separator'},{label:'关于 DSHGAL',click:()=>dialog.showMessageBox(window,{type:'info',title:'DSHGAL',message:'深海女仆工坊',detail:'桌面版 '+app.getVersion()+'\nF11 全屏 · Alt 显示菜单\nDSH / Hermes Agent 后端',buttons:['知道了']})}]}
  ]))
  await window.loadURL(origin)
  await log('Desktop ready '+origin)
 }catch(error){
  if(quitting)return
  await log('Startup failed: '+error.stack)
  dialog.showErrorBox('DSHGAL 启动失败',error.message+'\n\n日志保存在应用数据目录的 logs 中。')
  app.quit()
 }
 })
}
