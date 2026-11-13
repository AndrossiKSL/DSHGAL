import {releaseFiles,assertPublicFiles} from './release-files.mjs'
import {readFileSync,readdirSync,statSync,existsSync} from 'node:fs'
import {resolve,dirname,extname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {DEFAULT_ART_KEYS,artFileName} from './art-manifest.mjs'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),hash=b=>createHash('sha256').update(b).digest('hex')
const pack=JSON.parse(readFileSync(resolve(root,'assets/packs/manifest.json'),'utf8'))
let bytes=0
for(const file of pack.files){
 if(!/^(?:actions|scenery|ui|signal|wardrobe|embedded)\/[a-zA-Z0-9/_-]+\.(?:webp|png|jpg|svg|woff2)$/.test(file))throw new Error('Invalid media path: '+file)
 const data=readFileSync(resolve(root,'assets/packs',file));bytes+=data.length
 if(hash(data)!==pack.sha256[file])throw new Error('Media hash mismatch: '+file)
}
if(Object.keys(pack.actions).length!==22)throw new Error('Incomplete cast')
for(const [role,frames]of Object.entries(pack.actions)){
 if(Object.keys(frames).length<12)throw new Error('Incomplete actions: '+role)
 for(const frame of Object.values(frames))if(frame.canvas?.join(',')!=='1024,1536'||frame.pivot?.join(',')!=='512,1500')throw new Error('Sprite anchor mismatch: '+role)
}
const generated=readFileSync(resolve(root,'src/client/art.generated.ts'),'utf8')
if(/data:image/.test(generated))throw new Error('Default art is still embedded')
for(const key of DEFAULT_ART_KEYS){const file=artFileName(key);if(!generated.includes('/default/'+file)||!existsSync(resolve(root,'assets/default',file)))throw new Error('Missing default art: '+file)}
const paths=releaseFiles(root)
assertPublicFiles(root,paths)
for(const required of ['dist/index.js','dist/client.js','dist/standalone-runtime.js','apps/standalone/server.mjs','deploy/install.mjs','AGENTS.md','DEPLOY_WITH_AGENT.md','integrations/dsh-character-party/src/index.mjs','assets/default/licenses/dsh-deep-whale-LICENSE.txt','LICENSE.md','NOTICE.md'])if(!paths.includes(required))throw new Error('Missing release file: '+required)
if(statSync(resolve(root,'dist/client.js')).size>3*1024*1024)throw new Error('Client JavaScript exceeds 3 MiB')
console.log(`Public audit passed: ${paths.length} files, ${pack.files.length} runtime media, ${bytes} media bytes.`)
