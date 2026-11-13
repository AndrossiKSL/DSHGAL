import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,mkdir,writeFile,rm,readFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import {parseOptions,verifyManifest,pluginInstallArgs,findDshEntry} from '../deploy/install.mjs'

test('deployment validates target backend, profile and distinct ports without changing the environment',()=>{
 const options=parseOptions(['--backend','hermes','--port','9989','--dry-run']);assert.equal(options.backend,'hermes');assert.equal(options.port,9989);assert.equal(options.dryRun,true)
 for(const args of [['--backend','other'],['--profile','../web'],['--port','3080'],['--model-url','https://token:secret@example.com/v1'],['--unknown','value']])assert.throws(()=>parseOptions(args))
})
test('complete archive manifest detects tampering and rejects code-only deployment',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'dshgal-manifest-'))
 try{
  await writeFile(join(dir,'file.txt'),'original')
  const manifest={schema:'dshgal-share/1',edition:'complete',version:'2.2.1',files:{'file.txt':{bytes:8,sha256:createHash('sha256').update('original').digest('hex')}}}
  await writeFile(join(dir,'deployment-manifest.json'),JSON.stringify(manifest));assert.equal((await verifyManifest(dir)).verifiedFiles,1)
  await writeFile(join(dir,'file.txt'),'modified');await assert.rejects(verifyManifest(dir),/损坏/)
  manifest.edition='source-only';await writeFile(join(dir,'deployment-manifest.json'),JSON.stringify(manifest));await assert.rejects(verifyManifest(dir),/complete/)
 }finally{await rm(dir,{recursive:true,force:true})}
})
test('manifest cannot read paths outside the package directory',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'dshgal-manifest-path-'))
 try{await writeFile(join(dir,'deployment-manifest.json'),JSON.stringify({schema:'dshgal-share/1',edition:'complete',files:{'../private':{bytes:0,sha256:''}}}));await assert.rejects(verifyManifest(dir),/路径/)}finally{await rm(dir,{recursive:true,force:true})}
})
test('DSH installation uses explicit Node argv and keeps paths with spaces literal',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'dshgal cli '))
 try{
  const entry=join(dir,'bin.js');await writeFile(entry,'// official CLI fixture')
  assert.equal(await findDshEntry(entry),entry)
  assert.deepEqual(pluginInstallArgs(entry,'web',join(dir,'gal package.tgz')),[entry,'plugin','--profile','web','add',join(dir,'gal package.tgz'),'--ignore-scripts'])
 }finally{await rm(dir,{recursive:true,force:true})}
})
