/**
 * 场景规模：按场景类型决定该有几个人。
 *
 * 用户的规则：
 *   聚会 5–7 人 / 普通 2–3 人 / H 场景 1–2 人 / 特殊 H（大乱交）5 人
 *
 * 之前是「无脑补到 3 人」，于是接吻时旁边两个人聊典藏目录。规模必须有类型，
 * 而不是一个常数。
 */

export type SceneKind = 'party' | 'normal' | 'intimate' | 'orgy'

export interface SceneScale {
  kind: SceneKind
  min: number
  max: number
  label: string
  /** 这类场景能不能收下「顺路过来」的人 */
  allowsWalkIn: boolean
}

const SCALES: Record<SceneKind, SceneScale> = {
  party: { kind: 'party', min: 5, max: 7, label: '聚会', allowsWalkIn: true },
  normal: { kind: 'normal', min: 2, max: 3, label: '日常', allowsWalkIn: true },
  intimate: { kind: 'intimate', min: 1, max: 2, label: '私密', allowsWalkIn: false },
  orgy: { kind: 'orgy', min: 5, max: 5, label: '大乱交', allowsWalkIn: false },
}

export function sceneScale(kind: SceneKind): SceneScale {
  return SCALES[kind] || SCALES.normal
}

const PARTY = /(聚会|派对|宴会|庆祝|开张|祭典|灯会|热闹|大家一起|全体|所有人|聚一聚|喝一轮|茶会|晚宴)/u
const ORGY = /(一起|三个人|四人|多人|轮着|全都来|大乱交|群|一起上|一起来|都加入|都过来)/u
const INTIMATE = /(吻|亲上|抱住|搂住|揽过|贴上去|靠进怀里|解开|脱下|抚摸|舔|含住|坐上来|躺下|床上|锁骨|大腿|胸口|腰侧|喘息|呻吟|单独|私下|只有.{0,4}(?:我们|两个)|没有别人|没别人|关上门|拉上帘)/u

/**
 * 判定本幕是什么场景。
 *
 * 顺序很重要：先看有没有明确的互动类型，再看玩家这一轮的原话，
 * 最后看开局写定的事实。私密要压过聚会——玩家在聚会上把人拉进里屋，
 * 那就该是私密，不能还按 5–7 人算。
 */
export function detectSceneKind(input: {
  action?: string
  premise?: string
  interactionKind?: string
  /** 上一幕已经是私密/大乱交时保持，避免一句话没说清就掉回日常 */
  previous?: SceneKind
}): SceneKind {
  const action = String(input.action || '')
  const premise = String(input.premise || '')
  const kind = String(input.interactionKind || '')

  const intimateAction = INTIMATE.test(action)
  const intimatePremise = INTIMATE.test(premise)

  if (kind === 'mature') {
    // 私密场景里出现「一起/多人」，或上一幕已经是大乱交 → 大乱交
    if (input.previous === 'orgy') return 'orgy'
    if (ORGY.test(action)) return 'orgy'
    return 'intimate'
  }
  if (intimateAction) return ORGY.test(action) ? 'orgy' : 'intimate'
  if (input.previous === 'orgy') return 'orgy'
  if (input.previous === 'intimate' && intimatePremise) return 'intimate'
  if (PARTY.test(action) || (kind === 'event' && PARTY.test(action))) return 'party'
  if (intimatePremise) return 'intimate'
  return 'normal'
}

/** 大乱交至少要有人愿意——只靠玩家一句话不算。 */
export function orgyViable(story: any, roles: string[]): boolean {
  const willing = roles.filter(id => {
    const r = story?.relationships?.[id] || {}
    const score = (k: string) => Math.max(-600, Math.min(600, Math.round(Number(r[k]) || 0)))
    return Math.min(score('affection'), score('trust'), score('intimacy')) >= 60
  })
  return willing.length >= 3
}

/**
 * 按容量裁人。优先保留：被点名的 > 有逾期约定的 > 上一幕就在场的 > 出场少的。
 * 不需要凑满 min——人不在就是不在，硬凑就是「凭空出现」。
 */
export function selectCast(
  candidates: string[],
  scale: SceneScale,
  priority: (id: string) => number,
): string[] {
  const sorted = [...new Set(candidates)].sort((a, b) => priority(b) - priority(a))
  return sorted.slice(0, Math.max(1, scale.max))
}

/** 场景规模该怎么写给模型。 */
export function scaleInstruction(scale: SceneScale, count: number): string {
  const base: Record<SceneKind, string> = {
    party: '这是一场聚会，场面该是热闹的：多人在场，各自和不同的人说话，有人起头有人附和，也有两人小声交谈。',
    normal: '这是日常场景。有两三个人在场就够，不必凑满。',
    intimate: '这是私密场景。只有眼前这一两个人，旁白里不要出现第三个人。',
    orgy: '这是多人的场面。所有人都在场且都参与，不是围观——每一拍都要有好几个人在动作、在说话、在互相影响。',
  }
  return [
    base[scale.kind],
    '本幕实际在场 ' + count + ' 人（' + scale.label + '场景，容量 ' + scale.min + '–' + scale.max + '）。',
    scale.kind === 'intimate'
      ? '不要写别人经过、推门、探头、听见，也不要让不在场的人对这一幕发表评论。'
      : '不要把不在场的人写进这一拍；在场的人一旦开口就要留在场上，不许说一句就走。',
  ].join('\n')
}
