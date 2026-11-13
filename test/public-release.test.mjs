import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join,dirname} from 'node:path'
import {releaseFiles,assertPublicFiles,RELEASE_ROOTS,RELEASE_DOCUMENTS} from '../scripts/release-files.mjs'

test('public snapshot excludes portable data and nested environments while retaining attribution',async()=>{
 const root=await mkdtemp(join(tmpdir(),'dshgal-public-'))
 const put=async(file,text='')=>{await mkdir(dirname(join(root,file)),{recursive:true});await writeFile(join(root,file),text)}
 try{
  for(const folder of RELEASE_ROOTS)await mkdir(join(root,folder),{recursive:true})
  for(const file of RELEASE_DOCUMENTS)await put(file)
  await put('apps/desktop/DSHGAL-data/config.json','personal configuration')
  await put('apps/desktop/.env','personal environment')
  await put('third_party/upstream/NOTICE.txt','copyright preserved')
  const files=releaseFiles(root)
  assert.ok(files.includes('CREDITS.md'))
  assert.ok(files.includes('third_party/upstream/NOTICE.txt'))
  assert.ok(!files.some(file=>file.includes('DSHGAL-data')||file.endsWith('.env')))
  assert.doesNotThrow(()=>assertPublicFiles(root,files))
 }finally{await rm(root,{recursive:true,force:true})}
})

test('CommonJS desktop files are checked for credentials before publication',async()=>{
 const root=await mkdtemp(join(tmpdir(),'dshgal-public-cjs-'))
 try{
  await writeFile(join(root,'main.cjs'),"const key='"+'sk-proj-'+'x'.repeat(40)+"'")
  assert.throws(()=>assertPublicFiles(root,['main.cjs']),/Potential secret/)
 }finally{await rm(root,{recursive:true,force:true})}
})

test('JSON-escaped personal Windows paths are rejected before publication',async()=>{
 const root=await mkdtemp(join(tmpdir(),'dshgal-public-path-'))
 try{
  const path=['C:','Users','example-person','private-config'].join(String.fromCharCode(92))
  await writeFile(join(root,'config.json'),JSON.stringify({path}))
  assert.throws(()=>assertPublicFiles(root,['config.json']),/Potential secret or personal path/)
 }finally{await rm(root,{recursive:true,force:true})}
})

test('GitHub usernames and noreply identities containing telephone-shaped values are rejected',async()=>{
 const root=await mkdtemp(join(tmpdir(),'dshgal-public-identity-'))
 try{
  const phone=['138','0013','8000'].join(''),username='demo'+phone+'-example'
  for(const value of ['https://github.com/'+username+'/example','123+'+username+'@users.noreply.github.com']){
   await writeFile(join(root,'identity.json'),JSON.stringify({value}))
   assert.throws(()=>assertPublicFiles(root,['identity.json']),/Potential personal identifier/)
  }
 }finally{await rm(root,{recursive:true,force:true})}
})

test('a numeric GitHub account id is allowed when the username contains no telephone',async()=>{
 const root=await mkdtemp(join(tmpdir(),'dshgal-public-account-id-'))
 try{
  const numericId=['138','0013','8000'].join('')
  await writeFile(join(root,'identity.json'),JSON.stringify({value:numericId+'+SafeAlias@users.noreply.github.com'}))
  assert.doesNotThrow(()=>assertPublicFiles(root,['identity.json']))
 }finally{await rm(root,{recursive:true,force:true})}
})
