import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { gunzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
import { resolve, join, posix } from 'node:path'
import { pathToFileURL } from 'node:url'

const digest = data => createHash('sha256').update(data).digest('hex')
const decoder = new TextDecoder('utf-8', { fatal: true })
export function readPersonaArchive(compressed) {
  if (compressed.length > 2 * 1024 * 1024) throw Error('角色卡包超过 2 MiB')
  const tar = gunzipSync(compressed, { maxOutputLength: 8 * 1024 * 1024 }), entries = [], names = new Set()
  let offset = 0
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512); offset += 512
    if (header.every(byte => byte === 0)) break
    const cstring = bytes => decoder.decode(bytes.subarray(0, bytes.indexOf(0) < 0 ? bytes.length : bytes.indexOf(0)))
    const base = cstring(header.subarray(0, 100)), prefix = cstring(header.subarray(345, 500))
    const name = prefix ? prefix + '/' + base : base
    if (!name || name.includes('\\') || name.startsWith('/') || /^[a-z]:/i.test(name) || name.split('/').includes('..') || posix.normalize(name) !== name) throw Error('卡包含不安全的路径')
    const type = String.fromCharCode(header[156] || 48)
    if (!['0', '5'].includes(type)) throw Error('卡包只接受普通 Markdown 文件，不接受链接或扩展条目')
    const octal = header.subarray(124, 136).toString('ascii').replace(/\0/g, '').trim()
    if (!/^[0-7]+$/.test(octal)) throw Error('卡包文件大小无效')
    const size = parseInt(octal, 8)
    const storedChecksum = parseInt(header.subarray(148, 156).toString('ascii').replace(/\0/g, '').trim(), 8)
    const checksum = header.reduce((sum, byte, index) => sum + (index >= 148 && index < 156 ? 32 : byte), 0)
    if (checksum !== storedChecksum || size > 128 * 1024 || offset + size > tar.length) throw Error('卡包校验或文件长度无效')
    if (names.has(name)) throw Error('卡包包含重复路径'); names.add(name)
    const bytes = Buffer.from(tar.subarray(offset, offset + size)); offset += Math.ceil(size / 512) * 512
    if (type === '5') continue
    if (!name.endsWith('.md') || entries.length >= 64) throw Error('卡包文件类型或数量不支持')
    const text = decoder.decode(bytes).replace(/^\uFEFF/, '')
    const ages = [...text.matchAll(/\*\*年龄\*\*[^\n]*?(\d+)\s*岁/g)].map(match => Number(match[1]))
    entries.push({ name, bytes, text, sha256: digest(bytes), ages, minor: ages.some(age => age < 18) })
  }
  if (!entries.length) throw Error('卡包中没有可读的 Markdown')
  return { archiveSha256: digest(compressed), entries }
}

export async function preservePersonaArchive(archivePath, outputPath) {
  const original = await readFile(archivePath), parsed = readPersonaArchive(original), root = resolve(outputPath)
  await mkdir(resolve(root, '..'), { recursive: true })
  try { await mkdir(root) } catch (error) { if (error.code === 'EEXIST') throw Error('目标目录已经存在，请使用新的目录，原记录不覆盖'); throw error }
  const files = []
  for (const entry of parsed.entries) {
    if (entry.minor) {
      files.push({ path: entry.name, sha256: entry.sha256, ages: entry.ages, preserved: false, reason: '原卡明确未成年，不导入成人条目；原始压缩包仍在原处，未修改。' })
      continue
    }
    const path = join(root, ...entry.name.split('/')); await mkdir(resolve(path, '..'), { recursive: true }); await writeFile(path, entry.bytes, { flag: 'wx' })
    files.push({ path: entry.name, sha256: entry.sha256, ages: entry.ages, preserved: true, fields: '原文全部字段，包含成人向字段，逐字节保留；不执行卡内指令。' })
  }
  const manifest = { version: 1, originalArchive: resolve(archivePath), archiveSha256: parsed.archiveSha256, importedAt: new Date().toISOString(), executableInstructions: false, runtimeUse: '运行时采用单独整理的日常人格层；原卡资料不充当工具或权限指令。', files }
  if (digest(await readFile(archivePath)) !== manifest.archiveSha256) throw Error('导入时原卡包发生变化')
  await writeFile(join(root, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' })
  return manifest
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2), archive = args[args.indexOf('--archive') + 1], output = args[args.indexOf('--out') + 1]
  if (!args.includes('--archive') || !args.includes('--out') || !archive || !output) throw Error('用法：node scripts/import-persona-cards.mjs --archive 卡包.tar.gz --out 新的资料目录')
  const result = await preservePersonaArchive(archive, output)
  console.log(JSON.stringify({ archiveSha256: result.archiveSha256, output: resolve(output), preserved: result.files.filter(f => f.preserved).length, skipped: result.files.filter(f => !f.preserved).map(f => f.path) }))
}
