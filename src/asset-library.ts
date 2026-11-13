import { randomUUID } from 'node:crypto'

export const ASSET_KINDS = ['sprite', 'background', 'avatar', 'cg', 'other']
export const cleanAssetText = (value: any, max = 120): string => typeof value === 'string' ? value.trim().slice(0, max) : ''

export function assetGenerationParams(value: any = {}, kind = 'sprite'): any {
  const number = (key: string, fallback: number, min: number, max: number) => {
    const n = value[key] === '' || value[key] === undefined ? fallback : Number(value[key])
    if (!Number.isFinite(n) || n < min || n > max) throw new Error('生成参数 ' + key + ' 必须在 ' + min + ' 到 ' + max + ' 之间')
    return n
  }
  const landscape = ['background','cg'].includes(kind)
  const width = number('width', landscape ? 1280 : 1024, 256, 2048)
  const height = number('height', landscape ? 720 : 1536, 256, 2048)
  const seed = number('seed', -1, -1, 4294967295)
  if (!Number.isInteger(number('steps',20,1,80))) throw new Error('采样步数必须是整数')
  if (![width,height,seed].every(Number.isInteger) || width % 8 || height % 8) throw new Error('尺寸必须是 8 的整数倍，种子必须是整数')
  return { width, height, seed, steps: number('steps', 20, 1, 80), cfg: number('cfg', 4, 0.1, 30),
    denoise: number('denoise', 0.6, 0.01, 1), includeCharacter: typeof value.includeCharacter === 'boolean' ? value.includeCharacter : kind !== 'background' && kind !== 'other',
    transparent: typeof value.transparent === 'boolean' ? value.transparent : ['sprite','avatar'].includes(kind),
    negative: cleanAssetText(value.negative, 2000), ckpt: cleanAssetText(value.ckpt, 240), lora: cleanAssetText(value.lora, 240),
    loraWeight: number('loraWeight', 0.8, -2, 2), sampler: cleanAssetText(value.sampler,80) || 'euler', scheduler: cleanAssetText(value.scheduler,80) || 'simple' }
}

export function ensureAssetLibrary(raw: any): any {
  const lib = raw && typeof raw === 'object' ? raw : {}
  lib.items ||= []; lib.jobs ||= []; lib.bindings ||= {}; lib.groups ||= []; lib.slots ||= []; lib.presets ||= []
  const names = new Set(['default', ...lib.items.map((r: any) => r.group || 'default'), lib.activeGroup || 'default'])
  for (const id of names) if (!lib.groups.some((g: any) => g.id === id)) lib.groups.push({id, name:id === 'default' ? '默认素材组' : id})
  lib.activeGroup ||= 'default'
  return lib
}

export function assetSlot(raw: any, previous?: any): any {
  const label = cleanAssetText(raw.label)
  if (!label) throw new Error('请填写槽位名称')
  const kind = ASSET_KINDS.includes(raw.kind) ? raw.kind : previous?.kind || 'other'
  return { id: previous?.id || randomUUID(), label, kind, category: cleanAssetText(raw.category,80) || '自定义资产',
    action: cleanAssetText(raw.action,40) || 'neutral', prompt: cleanAssetText(raw.prompt,2000),
    generation: assetGenerationParams(raw.generation || previous?.generation, kind) }
}

export function assetBindingKey(item: any): string {
  return item.group + ':' + item.characterId + ':' + item.kind + ':' + item.action
}

export function assetSlotBindingKey(item: any): string {
  return item.group + ':' + item.characterId + ':slot:' + item.slotId
}
