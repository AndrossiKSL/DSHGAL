import {readFileSync,writeFileSync,copyFileSync,existsSync,mkdirSync,readdirSync} from 'node:fs'
import {dirname,resolve,join,basename} from 'node:path'
import {fileURLToPath} from 'node:url'
import {createHash} from 'node:crypto'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),args=process.argv.slice(2)
const option=name=>{const at=args.indexOf(name);return at<0?null:args[at+1]}
const source=option('--asset-root');if(!source)throw new Error('Usage: node scripts/sync-art-pack.mjs --asset-root <processed-art-root> [--portrait-source <native-images>] [--ui-source <native-images>]')
const read=path=>JSON.parse(readFileSync(path,'utf8').replace(/^\uFEFF/,'')),hash=bytes=>createHash('sha256').update(bytes).digest('hex')
const pack=read(join(root,'assets/packs/manifest.json')),report={schema:1,imported:[],verified:[],nativeSources:[],pending:{}}
function copy(src,dest,expected){
 const bytes=readFileSync(src),sha256=hash(bytes);if(expected&&sha256!==expected)throw new Error('Source hash mismatch: '+basename(src))
 const target=join(root,dest),same=existsSync(target)&&hash(readFileSync(target))===sha256
 if(!same){mkdirSync(dirname(target),{recursive:true});copyFileSync(src,target)}
 const record={file:dest,sha256,bytes:bytes.length};(same?report.verified:report.imported).push(record)
 if(dest.startsWith('assets/packs/')){const relative=dest.slice('assets/packs/'.length);if(!pack.files.includes(relative))pack.files.push(relative);pack.sha256[relative]=sha256}
}
for(const folder of ['six-heroines/full-actions','supporting-cast/full-actions']){
 const dir=join(source,folder),manifest=read(join(dir,'manifest.json'))
 for(const [role,character]of Object.entries(manifest.characters))for(const [action,frame]of Object.entries(character.frames)){
  const relative=`actions/${role}/${action}.webp`
  copy(resolve(dir,frame.src),'assets/packs/'+relative,frame.sha256)
  pack.actions[role]||={};pack.actions[role][action]={...pack.actions[role][action],url:'/whale-galgame-media/'+relative,label:frame.label,emotion:frame.emotion,canvas:frame.canvas,pivot:frame.pivot}
 }
}
const supporting=read(join(source,'supporting-cast/manifest.json'))
for(const [id,character]of Object.entries(supporting.characters)){
 copy(join(source,'supporting-cast',character.src),'assets/default/'+character.targetArtKey+'.webp',character.sha256)
 copy(join(source,'supporting-cast',character.avatar),'assets/default/portrait-'+id+'.webp',character.avatarSha256)
}
const covers=read(join(source,'six-heroines/ensemble-cover/manifest.json'))
for(const cover of Object.values(covers.covers))copy(join(source,'six-heroines/ensemble-cover',cover.gameSrc),'assets/default/'+cover.artKey+'.webp',cover.gameSha256)
for(const [key,flag]of [['portraits','--portrait-source'],['ui','--ui-source']]){
 const dir=option(flag);if(!dir)continue
 const images=readdirSync(dir).filter(n=>n.endsWith('.png')).map(name=>({name,sha256:hash(readFileSync(join(dir,name)))}))
 report.nativeSources.push({kind:key,session:basename(dir),count:images.length,images})
}
for(const folder of ['actions-28','wardrobe']){
 const manifest=read(join(source,folder,'manifest.json'))
 report.pending[folder]={complete:manifest.complete,available:manifest.frameCount,target:manifest.targetFrameCount||manifest.targetFrames,pending:manifest.pendingFrameCount??Math.max(0,(manifest.targetFrames||0)-(manifest.frameCount||0))}
}
writeFileSync(join(root,'assets/packs/manifest.json'),JSON.stringify(pack,null,2)+'\n')
mkdirSync(join(root,'docs'),{recursive:true})
writeFileSync(join(root,'docs/art-import.json'),JSON.stringify(report,null,2)+'\n')
console.log(`Art import: ${report.imported.length} updated, ${report.verified.length} already current; native images ${report.nativeSources.reduce((n,s)=>n+s.count,0)}. Planned images remain explicitly pending.`)
