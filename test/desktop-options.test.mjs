import test from 'node:test'
import assert from 'node:assert/strict'
import {join,resolve} from 'node:path'
import {desktopDataDirectory,isGameNavigation,desktopWindowOptions} from '../apps/desktop/options.mjs'
test('desktop preserves portable data across extraction directories and keeps development data in the project',()=>{
 assert.equal(desktopDataDirectory({packaged:false,projectRoot:'project'}),join('project','.local'))
 assert.equal(desktopDataDirectory({packaged:true,portableDirectory:'portable',systemUserData:'system'}),join('portable','DSHGAL-data'))
 assert.equal(desktopDataDirectory({packaged:true,systemUserData:'system'}),'system')
 assert.equal(desktopDataDirectory({override:'selected',packaged:true}),resolve('selected'))
})
test('desktop navigation stays inside the exact owned game origin',()=>{
 const origin='http://127.0.0.1:23456'
 assert.equal(isGameNavigation(origin+'/connection',origin),true)
 for(const url of ['https://example.com/','http://127.0.0.1:23457/','http://localhost:23456/','file:///etc/passwd','javascript:alert(1)','http://user:pass@127.0.0.1:23456/'])assert.equal(isGameNavigation(url,origin),false)
})
test('desktop renderer cannot access Node or disable its web sandbox',()=>{
 const options=desktopWindowOptions();assert.equal(options.webPreferences.nodeIntegration,false);assert.equal(options.webPreferences.contextIsolation,true);assert.equal(options.webPreferences.sandbox,true);assert.equal(options.webPreferences.webSecurity,true)
})
