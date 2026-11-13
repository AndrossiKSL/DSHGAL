import {mkdirSync,readFileSync,writeFileSync,openSync,writeSync,closeSync,statSync} from 'node:fs'
import {join,resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {deflateRawSync} from 'node:zlib'
import {releaseFiles,assertPublicFiles,fileHash} from './release-files.mjs'

const table=Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0})
function crc32(bytes){let crc=0xffffffff;for(const value of bytes)crc=table[(crc^value)&255]^(crc>>>8);return (crc^0xffffffff)>>>0}
export function zipFiles(file,root,files,manifest){
 const fd=openSync(file,'w'),central=[];let offset=0
 const write=bytes=>{writeSync(fd,bytes);offset+=bytes.length;if(offset>0xffffffff)throw new Error('Archive requires Zip64')}
 try{
  const entries=[...files.map(name=>({name,data:readFileSync(join(root,name))})),{name:'deployment-manifest.json',data:Buffer.from(JSON.stringify(manifest,null,2)+'\n')}]
  for(const entry of entries){
   const name=Buffer.from('DSHGAL/'+entry.name),original=entry.data,method=/\.(?:png|webp|jpg|jpeg|woff2|tgz|zip)$/i.test(entry.name)?0:8,data=method?deflateRawSync(original,{level:6}):original,crc=crc32(original),start=offset
   const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt16LE(0x800,6);local.writeUInt16LE(method,8);local.writeUInt16LE(33,12);local.writeUInt32LE(crc,14);local.writeUInt32LE(data.length,18);local.writeUInt32LE(original.length,22);local.writeUInt16LE(name.length,26)
   write(local);write(name);write(data)
   const header=Buffer.alloc(46);header.writeUInt32LE(0x02014b50);header.writeUInt16LE(20,4);header.writeUInt16LE(20,6);header.writeUInt16LE(0x800,8);header.writeUInt16LE(method,10);header.writeUInt16LE(33,14);header.writeUInt32LE(crc,16);header.writeUInt32LE(data.length,20);header.writeUInt32LE(original.length,24);header.writeUInt16LE(name.length,28);header.writeUInt32LE(start,42);central.push(header,name)
  }
  const start=offset;for(const data of central)write(data)
  const footer=Buffer.alloc(22);footer.writeUInt32LE(0x06054b50);footer.writeUInt16LE(entries.length,8);footer.writeUInt16LE(entries.length,10);footer.writeUInt32LE(offset-start,12);footer.writeUInt32LE(start,16);write(footer)
 }finally{closeSync(fd)}
}
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),pkg=JSON.parse(readFileSync(join(root,'package.json'),'utf8')),output=resolve(process.argv[2]||join(root,'artifacts'))
mkdirSync(output,{recursive:true});const artifacts=[]
for(const codeOnly of [false,true]){
 const files=releaseFiles(root,{codeOnly});assertPublicFiles(root,files)
 const manifest={schema:'dshgal-share/1',project:'DSHGAL',version:pkg.version,edition:codeOnly?'source-only':'complete',requires:{node:pkg.engines.node,backend:'DSH or Hermes',artPack:codeOnly},entry:'DEPLOY_WITH_AGENT.md',files:Object.fromEntries(files.map(file=>[file,{bytes:statSync(join(root,file)).size,sha256:fileHash(join(root,file))}]))}
 const name=`DSHGAL-${pkg.version}-${codeOnly?'code':'share'}.zip`,target=join(output,name);zipFiles(target,root,files,manifest);artifacts.push({file:name,bytes:statSync(target).size,sha256:fileHash(target),files:files.length})
}
writeFileSync(join(output,'SHA256.txt'),artifacts.map(a=>a.sha256+'  '+a.file).join('\n')+'\n')
writeFileSync(join(output,'release.json'),JSON.stringify({project:'DSHGAL',version:pkg.version,artSnapshot:'current-2.2-baseline-new-generation-excluded',artifacts},null,2)+'\n')
console.log(JSON.stringify(artifacts))
