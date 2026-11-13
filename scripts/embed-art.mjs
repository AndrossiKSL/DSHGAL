import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DEFAULT_ART_KEYS, artFileName } from './art-manifest.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourceDir = resolve(root, 'assets/default')
const target = resolve(root, 'src/client/art.generated.ts')

const entries = DEFAULT_ART_KEYS.map((key) => {
  const fileName = artFileName(key)
  const subtype = fileName.slice(fileName.lastIndexOf('.') + 1).toLowerCase()
  if (subtype !== 'png' && subtype !== 'webp') throw new Error(`Unsupported art type: ${fileName}`)
  // Check at build time; transfer image bytes only when a scene needs them.
  readFileSync(resolve(sourceDir, fileName))
  return `  '${key}': '/whale-galgame-media/default/${fileName}',`
})

const output = `// Generated media URLs; image licenses remain file-specific.\nexport const WHALE_ART: Record<string, string> = {\n${entries.join('\n')}\n}\n`
writeFileSync(target, output, 'utf8')

console.log(`Embedded ${entries.length} allowlisted default art files from assets/default.`)
