import {resolve,join} from 'node:path'

export function desktopDataDirectory({override,packaged,projectRoot,portableDirectory,systemUserData}){
 if(override)return resolve(override)
 if(!packaged)return join(projectRoot,'.local')
 if(portableDirectory)return join(portableDirectory,'DSHGAL-data')
 return systemUserData
}
export function isGameNavigation(target,origin){
 try{const url=new URL(target);return url.origin===origin&&url.protocol==='http:'&&!url.username&&!url.password}catch{return false}
}
export function desktopWindowOptions(icon){return {width:1440,height:900,minWidth:880,minHeight:620,show:false,backgroundColor:'#071a26',title:'深海女仆工坊 · DSHGAL',autoHideMenuBar:true,...(icon?{icon}:{}),webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,allowRunningInsecureContent:false}}}
