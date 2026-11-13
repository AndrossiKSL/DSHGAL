import {readdirSync,readFileSync,statSync} from 'node:fs'
import {join,relative,resolve} from 'node:path'
import {createHash} from 'node:crypto'

export const RELEASE_ROOTS=['apps/desktop','apps/standalone','assets/default','assets/packs','build','deploy','dist','integrations/dsh-character-party','scripts','src','test','docs/media','third_party']
export const RELEASE_DOCUMENTS=['README.md','README.en.md','README.ja.md','README.ko.md','LICENSE.md','NOTICE.md','THIRD_PARTY_LICENSES.md','SECURITY.md','AGENTS.md','DEPLOY_WITH_AGENT.md','assets/README.md','docs/DESKTOP.md','electron-builder.cjs','docs/STANDALONE.md','docs/ARCHITECTURE.md','docs/ASSET-SYNC.md','docs/ASSET-LICENSES.md','docs/REVIEW-2.2.md','docs/MIGRATION-2.2.1.md','docs/UPDATING.md','docs/PUBLISHING.md','CREDITS.md','docs/art-import.json','package.json','package-lock.json','tsdown.config.ts','cordis.patch.yml','.editorconfig','.gitattributes','.gitignore','start.cmd','start.sh']
const omitted=/(?:^|\/)(?:\.git|node_modules|\.local|DSHGAL-data|artifacts|releases|history|screenshots|previews)(?:\/|$)|\.map$|(?:^|\/)\.env(?:\.|$)/i
export function releaseFiles(root,{codeOnly=false}={}){
 const files=new Set()
 const walk=dir=>{for(const row of readdirSync(join(root,dir),{withFileTypes:true})){const name=dir+'/'+row.name;if(omitted.test(name))continue;if(row.isSymbolicLink())throw new Error('Release cannot contain links: '+name);if(row.isDirectory())walk(name);else files.add(name)}}
 for(const dir of RELEASE_ROOTS)walk(dir)
 for(const file of RELEASE_DOCUMENTS){statSync(join(root,file));files.add(file)}
 return [...files].filter(file=>!codeOnly||(!file.startsWith('dist/')&&!/\.(?:png|webp|jpg|jpeg|svg|woff2?|ttf|otf|tgz|zip|mp4|wav|mp3)$/i.test(file))).sort()
}
export function fileHash(file){return createHash('sha256').update(readFileSync(file)).digest('hex')}
export function assertPublicFiles(root,files){
 const patterns=[/sk-[A-Za-z0-9_-]{28,}/,/sk-proj-[A-Za-z0-9_-]{12,}/,/(?:ghp|gho|github_pat)_[A-Za-z0-9_]{20,}/,/AKIA[0-9A-Z]{16}/,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/[A-Z]:[\\/]Users[\\/][^\\/\r\n]+/i,/[A-Z]:[\\/](?:AIGC|AGENT|dsh)[\\/](?:tools|projects|zahuo)[\\/]/i]
 for(const file of files){
  const full=resolve(root,file);if(relative(root,full).startsWith('..'))throw new Error('Release path escapes root')
  if(omitted.test(file)||/(?:^|\/)(?:credentials?|brain\.env|ab-result)(?:[./]|$)/i.test(file))throw new Error('Private release path: '+file)
  if(/\.(?:[cm]?js|ts|json|md|yml|yaml|txt|html|svg|cmd|sh)$/i.test(file)){
   const text=readFileSync(full,'utf8').replace(/\\\\/g,'\\').replace(/\\u005c/gi,'\\').replace(/\\\//g,'/')
   if(patterns.some(pattern=>pattern.test(text)))throw new Error('Potential secret or personal path: '+file)
   const telephone=/(?<!\d)1[3-9]\d{9}(?!\d)/
   const githubOwners=[...text.matchAll(/(?:https?:\/\/|git@)github\.com[/:]([a-z\d-]+)/gi)].map(match=>match[1])
   const githubEmails=[...text.matchAll(/([a-z\d+_-]+)@users\.noreply\.github\.com/gi)].map(match=>match[1].split('+').at(-1))
   if([...githubOwners,...githubEmails].some(identity=>telephone.test(identity)))throw new Error('Potential personal identifier in GitHub identity: '+file)
  }
 }
}
