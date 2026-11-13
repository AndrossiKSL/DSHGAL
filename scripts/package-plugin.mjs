import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,readdirSync,linkSync,copyFileSync,rmSync} from 'node:fs'
import {join,dirname,resolve} from 'node:path'
import {tmpdir} from 'node:os'
import {execFileSync} from 'node:child_process'
import {fileURLToPath,pathToFileURL} from 'node:url'

export function packageDshPlugin(root,outputDir){
 const work=mkdtempSync(join(tmpdir(),'DSHGAL-plugin-'))
 const copy=(source,dest)=>{mkdirSync(dirname(dest),{recursive:true});try{linkSync(source,dest)}catch{copyFileSync(source,dest)}}
 const tree=(source,dest)=>{for(const row of readdirSync(source,{withFileTypes:true})){if(row.isSymbolicLink())throw new Error('Plugin source contains link');if(row.isDirectory())tree(join(source,row.name),join(dest,row.name));else copy(join(source,row.name),join(dest,row.name))}}
 try{
  const stage=join(work,'package');mkdirSync(stage)
  for(const directory of ['dist','assets/default','assets/packs'])tree(join(root,directory),join(stage,directory))
  for(const file of ['LICENSE.md','NOTICE.md','THIRD_PARTY_LICENSES.md','cordis.patch.yml','README.md'])copy(join(root,file),join(stage,file))
  const pkg=JSON.parse(readFileSync(join(root,'package.json'),'utf8'))
  delete pkg.scripts;delete pkg.devDependencies;pkg.files=['dist','assets','node_modules/dsh-character-party','cordis.patch.yml','LICENSE.md','NOTICE.md','THIRD_PARTY_LICENSES.md','README.md']
  pkg.dependencies={'dsh-character-party':'0.3.0'};pkg.bundledDependencies=['dsh-character-party']
  writeFileSync(join(stage,'package.json'),JSON.stringify(pkg,null,2)+'\n')
  const party=join(root,'integrations/dsh-character-party'),target=join(stage,'node_modules/dsh-character-party')
  for(const directory of ['src','public','docs'])tree(join(party,directory),join(target,directory))
  for(const file of ['package.json','README.md','DISTRIBUTION.md'])copy(join(party,file),join(target,file))
  mkdirSync(outputDir,{recursive:true});const file=join(outputDir,`dsh-whale-galgame-${pkg.version}.tgz`)
  execFileSync('tar',['-czf',file,'-C',work,'package'],{stdio:'pipe'});return file
 }finally{const temp=resolve(tmpdir()),target=resolve(work);if(target.startsWith(temp+'\\')||target.startsWith(temp+'/'))rmSync(target,{recursive:true,force:true})}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');console.log(packageDshPlugin(root,resolve(process.argv[2]||join(root,'.local/deploy'))))
}
