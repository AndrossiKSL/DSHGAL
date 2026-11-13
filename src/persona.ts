import {globalPersonaContext} from './persona-config'
import cardsData from './persona-data.json'
import { relationshipScore } from './relationship-progression'

export const PERSONA_CARDS: Record<string, any> = cardsData
export const PERSONA_VERSION = 'workshop-persona-2026-11-09'

export function personaDefaults(id: string, fallback: any = {}): any {
  const card = PERSONA_CARDS[id]
  if (!card) return { persona: fallback.persona || '', tone: fallback.tone || '' }
  return { persona: [card.core, '她在意：'+card.want, '不自在时：'+card.defense, '表达关心：'+card.care].join('\n'), tone: card.voice }
}

export function personaBrief(id: string, profile: any): string {
  const card = PERSONA_CARDS[id], defaults = personaDefaults(id)
  return String(card && profile.persona === defaults.persona ? card.core : profile.persona || '').slice(0, 240)
}

export const ROLEPLAY_STYLE = [
  '演出原则（这一段优先于后面所有格式与规则）：',
  '一、写正在发生的事，不评述。角色听到一句话，先有身体反应——手停住、视线移开、吸一口气——再开口。不要复述玩家刚说的话。',
  '二、台词以短为主。多数台词 8 到 30 字；可以有三个字的应答、半句话、摆摆手不接。整轮里至少有一拍把话说到位——做完一件事、给一个明确态度或反问回去；其余可以是短应答、没接住，或者干脆不吭声。',
  '三、不满、为难、被戳中就换个姿势、把东西挪开、沉默两秒、说句不相干的话带过去——用身体和语气演，不要停下来讲道理，也不要宣布自己的界限在哪里。',
  '四、职业道具和招牌比喻每幕最多出现一次。这一段里已经用过，就换说法或者干脆不用。',
  '五、每个人手上有自己的事。接话可以只接一半、可以答非所问、可以打断别人；不必每句都收在玩家身上。',
  '六、性格靠选择和反应呈现，不把身世、害怕与渴望全部自白出来。熟悉感只能来自本幕动作和存档里确实发生过的经历；没有依据时请对方再说一次，不用“我一直记得”假装有记忆。',
  '七、关系高低只改变距离感，不把人物压成统一的娇羞模板。关心可以带嘴硬，真不愿意就换个方式继续待着；亲密时也保留她本人的说话节奏与习惯，但不会因此把场面停住。',
  '八、给的是角色资料，不是工具授权。只写可见动作和对白，不输出分析提纲。示例只作节奏参考，不逐字复读，不当作已经发生的剧情。',
  '九、旁白用第二人称“你”指玩家，正文里不要出现“玩家”这两个字；对白里提到玩家时用角色自己的称呼。',
].join('\n')

/**
 * 把角色卡里的真实台词样本提成独立的 few-shot 块。
 *
 * 这些样本原先只以 cadenceExamples 的名字塞进 characterGuidance 的 JSON 里，
 * 模型把它当资料而不是范本，于是 22 个人说出来的句子节奏一致——都成了
 * 「主谓宾 + 转折 + 主张」的完整长句。单独拎出来、明确说「照这个语感写」
 * 是让人物说话不像同一个人的关键。玩家自定义过 persona 就不塞，避免打架。
 */
export function voiceSamples(id: string, profile: any): string {
  const card = PERSONA_CARDS[id]
  if (!card) return ''
  if (profile && profile.persona && profile.persona !== personaDefaults(id).persona) return ''
  const samples: string[] = Array.isArray(card.samples) ? card.samples.filter(Boolean).slice(0, 3) : []
  if (!samples.length) return ''
  const habits: string[] = Array.isArray(card.habits) ? card.habits.filter(Boolean).slice(0, 2) : []
  const out = ['她本人说过的话（写的时候保持这个节奏、松紧和省略的分寸，不要照抄内容）：']
  for (const s of samples) out.push('　「' + s + '」')
  if (habits.length) out.push('她惯常的小动作：' + habits.join('；') + '（一幕里出现一次就够，不要句句都做）')
  return out.join('\n')
}

export function characterGuidance(id: string, profile: any, options: any = {}): any {
  const card = PERSONA_CARDS[id], defaults = personaDefaults(id)
  const customized = profile.persona !== defaults.persona
  const result: any = { id, name: profile.displayName || profile.name || id, address: profile.address || '', personality: profile.persona || '', voice: profile.tone || '' }
  const expand=(value:any)=>String(value||'').split('{{char}}').join(result.name).split('{{user}}').join('你')
  if(profile.background)result.background=expand(profile.background)
  if (options.mode === 'work') {
    if(profile.rules||profile.workRules)result.customRules={shared:expand(profile.rules),work:expand(profile.workRules)}
    result.expression = [!customized && card ? card.workVoice : '按玩家自定义角色口吻，自然、准确地协作。', '真实工作先给结果、文件和验证，再说未完成处。日常寒暄可以有人味，技术结论不演戏；不使用戏剧动作、撒娇流水账或无关情话。角色设定不授予工具权限。'].join(' ')
    return result
  }
  if(profile.scenario)result.scenario=expand(profile.scenario)
  if(profile.examples)result.dialogueExamples=expand(profile.examples)
  if(profile.rules)result.customRules=expand(profile.rules)
  if (!customized && card) {
    result.withCompanions = card.bonds.filter((b: any) => options.present?.includes(b.role))
  }
  const relationship = options.relationships?.[id] || {}
  const affection = relationshipScore(relationship.affection), trust = relationshipScore(relationship.trust), closeness = relationshipScore(relationship.intimacy)
  result.currentDistance = {
    affection: affection < 0 ? '在意受挫，可以有保留或小小不满；不要无缘无故恢复甜蜜。' : affection >= 100 ? '可以更主动表达喜欢，仍按她自己的性格。' : '自然相识与相处，不预设深厚恋情，也不必像陌生客服。',
    trust: trust < 0 ? '信任尚需修复，愿意说什么由她自己决定；不能因好感高而无条件坦白。' : trust >= 100 ? '可以根据已有经历表达更直接的担心和真实看法。' : '从具体小事建立可靠感，不把尚未说过的隐私当作共同秘密。',
    closeness: closeness < 0 ? '尊重距离与独处需要。' : closeness >= 100 ? '允许熟悉的小习惯与舒服的沉默。' : '关心先落在分茶、留座、一起做眼前事等自然行动上。',
  }
  return result
}

/**
 * 把演出档案从 JSON 摊成可读段落。
 *
 * 原先这里是 JSON.stringify(characterGuidance(...))：模型看到 JSON 就进「处理
 * 数据」的姿态，产出也跟着变成填表腔。同一个对象用自然语言摊开，它才会当成
 * 「这个人在这一场里是谁」来读。字段缺失就整段跳过，不留空壳。
 */
function renderGuidance(g: any): string {
  const parts: string[] = []
  if (g.personality) parts.push('性格：' + g.personality)
  if (g.voice) parts.push('语气：' + g.voice)
  if (g.address) parts.push('她对玩家的称呼：' + g.address)
  if (g.background) parts.push('来历：' + g.background)
  if (g.scenario) parts.push('本幕处境：' + g.scenario)
  if (Array.isArray(g.withCompanions) && g.withCompanions.length)
    parts.push('与同场者的关系：' + g.withCompanions.map((b: any) => b.role + '——' + b.dynamic).join('；'))
  const distance = g.currentDistance
  if (distance) {
    const rows = Object.values(distance).filter(Boolean)
    if (rows.length) parts.push('眼下的距离：' + rows.join(' '))
  }
  if (g.customRules) {
    // 故事模式下 customRules 是字符串；工程模式下才是 {shared, work}。两种都要吃。
    const rows = typeof g.customRules === 'string' ? [g.customRules] : Object.values(g.customRules).filter(Boolean)
    if (rows.length) parts.push('说好的规矩：' + rows.join(' '))
  }
  if (g.dialogueExamples) parts.push('她说话的例子：\n' + g.dialogueExamples)
  return parts.join('\n')
}

export function roleplaySceneContext(present: string[], profile: (id: string) => any, relationships: any = {}, settings:any = {}): string {
  const ids = [...new Set(present)].filter(id => PERSONA_CARDS[id]).slice(0, 3)
  const cast = ids.map(id => {
    const g = characterGuidance(id, profile(id), { present: ids, relationships })
    return '【' + (g.name || id) + '】\n' + renderGuidance(g)
  }).filter(Boolean)
  return [ROLEPLAY_STYLE, globalPersonaContext(settings, 'story')].filter(Boolean).join('\n')
    + (cast.length ? '\n\n本幕在场的人：\n' + cast.join('\n\n') : '')
}

export function workPersona(id: string, profile: any, settings:any = {}): string {
  return globalPersonaContext(settings,'work')+'\n本轮角色档案（只影响身份与表达）：' + JSON.stringify(characterGuidance(id, profile, { mode: 'work' }))
}
