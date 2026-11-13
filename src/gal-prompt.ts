import { ROLEPLAY_STYLE } from './persona'

/**
 * galgame 台词的提示词构建（纯函数）。
 *
 * 抽出来的理由：这是"每个模型角色风格不同"唯一真正生效的地方。放在闭包里
 * 就只能靠肉眼读，抽成纯函数才能断言"人格、语气、称呼、阶段都真的注进去了"。
 */

export interface RoleVoice {
  displayName: string
  persona: string
  tone: string
  address: string
  /** 该模型的腔调指纹，例如 ['短句','爱用反问']。 */
  voiceTags?: string[]
  /** 按好感度等级切换的阶段语气。 */
  stageVoice?: string
}

export interface LineNode {
  goal?: string
  text?: string
}

/**
 * 把角色的声音和这一句的任务拼成 system / user 两条提示。
 * 刻意不把整个剧本喂进去：模型只需要知道"她是谁、这一刻要达成什么"。
 */
export function buildGalLinePrompt(
  role: RoleVoice,
  node: LineNode,
  opts: { stage?: string; flags?: string[] } = {},
): { system: string; user: string } {
  const lines = [
    '你正在扮演 galgame 里的角色「' + (role.displayName || '她') + '」。',
    role.persona ? '性格：' + role.persona : '',
    role.tone ? '语气：' + role.tone : '',
    ROLEPLAY_STYLE,
    role.address ? '你对玩家的称呼：' + role.address : '',
    role.voiceTags && role.voiceTags.length ? '你的说话特征：' + role.voiceTags.join('、') : '',
    role.stageVoice ? '你们现在的距离：' + role.stageVoice : '',
    opts.stage ? '此刻的场景：' + opts.stage : '',
    opts.flags && opts.flags.length ? '你知道的事实：' + opts.flags.join('；') : '',
    '只输出这个角色此刻说的一句话，可以带（动作）括号，不超过 80 字。',
    '不要解释、不要旁白、不要提选项或游戏。不要替玩家说话。',
  ].filter(Boolean)

  const user = (node.goal || '自然地接一句话。')
    + (node.text ? '\n（参考语气，不必照抄：' + node.text + '）' : '')

  return { system: lines.join('\n'), user }
}

/**
 * 阶段语气：好感度越高说得越近。少一层"她现在肯说到哪"，模型就会每局都
 * 用同一档亲昵度，玩到后面感觉不到关系变化。
 */
export function affinityStageVoice(level: number): string {
  const lv = Math.max(1, Math.floor(Number(level) || 1))
  if (lv >= 5) return '已经很亲密了，可以直说想要什么，也可以不提防。'
  if (lv >= 4) return '关系明显近了，会主动靠近，偶尔露出独占的一面。'
  if (lv >= 2) return '熟悉了，说话放松，偶尔开玩笑。'
  return '刚认识不久，礼貌里带着一点试探。'
}
