/**
 * 剧情引擎：章节 → 节点 → 分支 → 旗标 → 结局。
 *
 * 这一层是纯函数，不碰存档、不碰 UI、不调模型——所以能单独测。
 * 剧本骨架由作者写在这里的数据上，台词可以由 AI 填（node.ai），但**节点顺序、
 * 条件、跳转、结局判定全部确定性执行**，这样一部作品玩十次还是那部作品。
 */

export type FlagValue = boolean | number | string

export interface Condition {
  /** 旗标必须等于这个值（省略 value 视为 true）。 */
  flag?: string
  value?: FlagValue
  /** 数值旗标的下限/上限。 */
  min?: number
  max?: number
  /** 某角色好感度下限。 */
  affinity?: { role: string; min: number }
  /**
   * 只在指定章节成立。
   *
   * 多路线剧本里必须有这一条：不然 A 线的结局条件会在 B 线也成立，
   * 结局判定按顺序取第一个匹配，玩家走 B 线却收 A 线的结局。
   */
  chapter?: string
}

export type Effect =
  | { flag: string; set: FlagValue }
  /** 好感度必须写明归属角色，否则多角色剧本里不知道该加给谁。 */
  | { affinity: { role: string; amount: number } }
  | { xp?: string; dev?: string; amount: number }

export interface Choice {
  id: string
  label: string
  /** 按钮上的方向标签，例如「温柔」「强硬」。 */
  tag?: string
  when?: Condition
  effects?: Effect[]
  jumpTo?: string
}

/**
 * 台上的一个立绘。
 *
 * 只写角色 id 就够了（自动排位）；想控制位置/大小/透明度/入场方向时写对象。
 * x 是画面宽度的百分比（0 = 最左，50 = 正中，100 = 最右）。
 */
export interface ActorSpec {
  role: string
  x?: number
  /** 相对基准大小的缩放（1 = 原样）。 */
  scale?: number
  alpha?: number
  /** 从哪边走进来。 */
  enter?: 'left' | 'right' | 'fade' | 'up'
}

export interface StageSpec {
  bg?: string
  cast?: (string | ActorSpec)[]
}

export interface Node {
  id: string
  kind: 'line' | 'narration' | 'choice' | 'jump' | 'ending' | 'event'
  speaker?: string
  /** 固定台词；AI 生成失败时的兜底，也是快进/回想里显示的内容。 */
  text?: string
  /** true = 由模型按 goal 生成台词。 */
  ai?: boolean
  goal?: string
  stage?: StageSpec
  choices?: Choice[]
  when?: Condition
  effects?: Effect[]
  jumpTo?: string
  /** kind='ending' 时指向 endings 表里的 id。 */
  endingId?: string
  /** 编年史时间戳，例如 { day: 3, label: '第三日 · 夜' }。 */
  at?: NodeClock
  /**
   * 走到这一句时当场生成一张 CG（需要生图后端）。
   * 剧情 CG 因此可以是"玩家推到哪里就出哪张"，而不是预先画好。
   */
  cgGoal?: string
  /** 生成后的图鉴标题。 */
  cgTitle?: string
  /**
   * 画面特效：'shake' 震屏 / 'flash' 闪白 / 'fade' 淡入。
   * 用在"门被推开""灯突然灭""天亮"这种地方。
   */
  fx?: 'shake' | 'flash' | 'fade'
}

/** 节点上的时间戳：day 用来排序，label 用来显示。 */
export interface NodeClock {
  day: number
  label: string
}

export interface Chapter {
  id: string
  title: string
  summary: string
  nodes: Node[]
}

export interface Ending {
  id: string
  title: string
  /** 达成条件；多个结局按数组顺序取第一个满足的。 */
  when?: Condition
  /** 结局 CG 的 asset key。 */
  art?: string
  hint?: string
}

export interface Scenario {
  id: string
  title: string
  version: number
  roles: string[]
  chapters: Chapter[]
  endings: Ending[]
}

export interface GameState {
  version: number
  scenarioId: string
  chapterId: string
  nodeIndex: number
  flags: Record<string, FlagValue>
  affinity: Record<string, number>
  endingsSeen: string[]
  readNodes: string[]
  /** nodeId → 实际说出的台词。AI 生成一次就固定下来，读档/回想拿到同一句。 */
  lines: Record<string, string>
  /**
   * 编年史：当前处在故事里的哪一天、哪个时段。
   * 节点上写 at:'第三日 · 夜' 就会滚到这里，界面和回想都用它。
   */
  clock?: { day: number; label: string }
  startedAt: number
  updatedAt: number
}

export const GAME_STATE_VERSION = 1

// ---------------------------------------------------------------- normalize

function asString(value: any): string {
  return typeof value === 'string' ? value : ''
}

function normalizeCondition(raw: any): Condition | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const out: Condition = {}
  if (typeof raw.flag === 'string' && raw.flag) {
    out.flag = raw.flag
    if (raw.value === true || raw.value === false || typeof raw.value === 'number' || typeof raw.value === 'string') {
      out.value = raw.value
    }
  }
  if (Number.isFinite(Number(raw.min))) out.min = Number(raw.min)
  if (Number.isFinite(Number(raw.max))) out.max = Number(raw.max)
  if (raw.affinity && typeof raw.affinity === 'object' && typeof raw.affinity.role === 'string') {
    out.affinity = { role: raw.affinity.role, min: Number(raw.affinity.min) || 0 }
  }
  if (typeof raw.chapter === 'string' && raw.chapter) out.chapter = raw.chapter
  return Object.keys(out).length ? out : undefined
}

function normalizeEffects(raw: any): Effect[] {
  if (!Array.isArray(raw)) return []
  const out: Effect[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    if (typeof item.flag === 'string' && item.flag && item.set !== undefined) {
      const set = item.set
      if (set === true || set === false || typeof set === 'number' || typeof set === 'string') {
        out.push({ flag: item.flag, set })
      }
      continue
    }
    if (Number.isFinite(Number(item.affinity && item.affinity.amount)) && typeof item.affinity.role === 'string') {
      out.push({ affinity: { role: item.affinity.role, amount: Number(item.affinity.amount) } })
      continue
    }
    if (Number.isFinite(Number(item.amount)) && (typeof item.xp === 'string' || typeof item.dev === 'string')) {
      out.push({ xp: item.xp, dev: item.dev, amount: Number(item.amount) })
    }
  }
  return out
}

function normalizeChoices(raw: any): Choice[] {
  if (!Array.isArray(raw)) return []
  const out: Choice[] = []
  raw.forEach((item, index) => {
    if (!item || typeof item !== 'object') return
    const label = asString(item.label)
    if (!label) return
    out.push({
      id: asString(item.id) || 'choice-' + index,
      label,
      tag: asString(item.tag) || undefined,
      when: normalizeCondition(item.when),
      effects: normalizeEffects(item.effects),
      jumpTo: asString(item.jumpTo) || undefined,
    })
  })
  return out
}

function normalizeNode(raw: any, index: number): Node | null {
  if (!raw || typeof raw !== 'object') return null
  const kind = asString(raw.kind) || 'line'
  const allowed = ['line', 'narration', 'choice', 'jump', 'ending', 'event']
  if (!allowed.includes(kind)) return null
  const node: Node = {
    id: asString(raw.id) || 'node-' + index,
    kind: kind as Node['kind'],
  }
  if (asString(raw.speaker)) node.speaker = asString(raw.speaker)
  if (typeof raw.text === 'string') node.text = raw.text
  if (raw.ai === true) node.ai = true
  if (asString(raw.goal)) node.goal = asString(raw.goal)
  if (raw.stage && typeof raw.stage === 'object') {
    node.stage = {
      bg: asString(raw.stage.bg) || undefined,
      cast: Array.isArray(raw.stage.cast) ? raw.stage.cast.map((entry: any) => {
        if (typeof entry === 'string') return entry
        if (!entry || typeof entry !== 'object' || typeof entry.role !== 'string') return null
        const actor: any = { role: entry.role }
        if (Number.isFinite(Number(entry.x))) actor.x = Math.max(0, Math.min(100, Number(entry.x)))
        if (Number.isFinite(Number(entry.scale))) actor.scale = Math.max(0.3, Math.min(2.5, Number(entry.scale)))
        if (Number.isFinite(Number(entry.alpha))) actor.alpha = Math.max(0, Math.min(1, Number(entry.alpha)))
        if (['left', 'right', 'fade', 'up'].includes(String(entry.enter))) actor.enter = String(entry.enter)
        return actor
      }).filter(Boolean) : undefined,
    }
  }
  const choices = normalizeChoices(raw.choices)
  if (choices.length) node.choices = choices
  const when = normalizeCondition(raw.when)
  if (when) node.when = when
  const effects = normalizeEffects(raw.effects)
  if (effects.length) node.effects = effects
  if (asString(raw.jumpTo)) node.jumpTo = asString(raw.jumpTo)
  if (asString(raw.endingId)) node.endingId = asString(raw.endingId)
  return node
}

export function normalizeScenario(raw: any): Scenario {
  const source = raw && typeof raw === 'object' ? raw : {}
  const chapters: Chapter[] = []
  if (Array.isArray(source.chapters)) {
    source.chapters.forEach((chapter: any, chapterIndex: number) => {
      if (!chapter || typeof chapter !== 'object') return
      const nodes: Node[] = []
      if (Array.isArray(chapter.nodes)) {
        chapter.nodes.forEach((node: any, nodeIndex: number) => {
          const normalized = normalizeNode(node, nodeIndex)
          if (normalized) nodes.push(normalized)
        })
      }
      chapters.push({
        id: asString(chapter.id) || 'chapter-' + chapterIndex,
        title: asString(chapter.title) || ('第 ' + (chapterIndex + 1) + ' 章'),
        summary: asString(chapter.summary),
        nodes,
      })
    })
  }
  const endings: Ending[] = []
  if (Array.isArray(source.endings)) {
    source.endings.forEach((ending: any, index: number) => {
      if (!ending || typeof ending !== 'object') return
      endings.push({
        id: asString(ending.id) || 'ending-' + index,
        title: asString(ending.title) || ('结局 ' + (index + 1)),
        when: normalizeCondition(ending.when),
        art: asString(ending.art) || undefined,
        hint: asString(ending.hint) || undefined,
      })
    })
  }
  return {
    id: asString(source.id) || 'scenario',
    title: asString(source.title) || '未命名剧本',
    version: Number(source.version) || 1,
    roles: Array.isArray(source.roles) ? source.roles.filter((id: any) => typeof id === 'string') : [],
    chapters,
    endings,
  }
}

// ---------------------------------------------------------------- state

export function createState(scenario: Scenario, now = Date.now()): GameState {
  const first = scenario.chapters[0]
  return {
    version: GAME_STATE_VERSION,
    scenarioId: scenario.id,
    chapterId: first ? first.id : '',
    nodeIndex: 0,
    flags: {},
    affinity: {},
    endingsSeen: [],
    readNodes: [],
    lines: {},
    startedAt: now,
    updatedAt: now,
  }
}

export function normalizeState(raw: any, scenario: Scenario, now = Date.now()): GameState {
  const base = createState(scenario, now)
  if (!raw || typeof raw !== 'object') return base
  const flags: Record<string, FlagValue> = {}
  if (raw.flags && typeof raw.flags === 'object') {
    for (const [key, value] of Object.entries(raw.flags)) {
      if (value === true || value === false || typeof value === 'number' || typeof value === 'string') flags[key] = value
    }
  }
  const affinity: Record<string, number> = {}
  if (raw.affinity && typeof raw.affinity === 'object') {
    for (const [key, value] of Object.entries(raw.affinity)) {
      const number = Number(value)
      if (Number.isFinite(number)) affinity[key] = number
    }
  }
  const chapterId = scenario.chapters.some((chapter) => chapter.id === raw.chapterId)
    ? String(raw.chapterId)
    : base.chapterId
  const chapter = scenario.chapters.find((row) => row.id === chapterId)
  // 上界是 nodes.length 而不是 length-1：多出来那一格就是「本章已走完」，
  // stepForward 靠它翻到下一章。夹到 length-1 会让 advance 永远卡在章末。
  const nodeIndex = Math.max(0, Math.min(
    chapter ? chapter.nodes.length : 0,
    Number.isFinite(Number(raw.nodeIndex)) ? Math.floor(Number(raw.nodeIndex)) : 0,
  ))
  const lines: Record<string, string> = {}
  if (raw.lines && typeof raw.lines === 'object') {
    for (const [key, value] of Object.entries(raw.lines)) {
      if (typeof value === 'string' && value) lines[key] = value
    }
  }
  // 编年史：读档要能回到同一天同一时段，否则界面上会跳回"第一日"。
  let clock: { day: number; label: string } | undefined
  if (raw.clock && typeof raw.clock === 'object' && typeof raw.clock.label === 'string' && raw.clock.label) {
    clock = { day: Number(raw.clock.day) || 0, label: raw.clock.label }
  }
  return {
    version: GAME_STATE_VERSION,
    scenarioId: scenario.id,
    chapterId,
    nodeIndex,
    flags,
    affinity,
    ...(clock ? { clock } : {}),
    endingsSeen: Array.isArray(raw.endingsSeen) ? raw.endingsSeen.filter((id: any) => typeof id === 'string') : [],
    readNodes: Array.isArray(raw.readNodes) ? raw.readNodes.filter((id: any) => typeof id === 'string') : [],
    lines,
    startedAt: Number(raw.startedAt) || now,
    updatedAt: Number(raw.updatedAt) || now,
  }
}

// ---------------------------------------------------------------- conditions

export function conditionHolds(condition: Condition | undefined, state: GameState): boolean {
  if (!condition) return true
  if (condition.chapter && state.chapterId !== condition.chapter) return false
  if (condition.flag) {
    const actual = state.flags[condition.flag]
    if (condition.value === undefined) {
      if (actual !== true) return false
    } else if (actual !== condition.value) return false
  }
  if (condition.min !== undefined || condition.max !== undefined) {
    const numeric = Number(state.flags[condition.flag || '']) || 0
    if (condition.min !== undefined && numeric < condition.min) return false
    if (condition.max !== undefined && numeric > condition.max) return false
  }
  if (condition.affinity) {
    const value = Number(state.affinity[condition.affinity.role]) || 0
    if (value < condition.affinity.min) return false
  }
  return true
}

/** 施加效果，返回**新的** state（纯函数，方便测）。 */
export function applyEffects(state: GameState, effects: Effect[] | undefined, now = Date.now()): GameState {
  if (!effects || effects.length === 0) return { ...state, updatedAt: now }
  const flags = { ...state.flags }
  const affinity = { ...state.affinity }
  for (const effect of effects) {
    if ('flag' in effect) { flags[effect.flag] = effect.set; continue }
    if ('affinity' in effect) {
      const role = effect.affinity.role
      affinity[role] = Math.max(0, (Number(affinity[role]) || 0) + effect.affinity.amount)
      continue
    }
    // xp/dev 由宿主层处理（它才知道角色与数值表），引擎只记录旗标式的累计值。
    const key = 'trait:' + (effect.xp || effect.dev || '')
    if (key !== 'trait:') flags[key] = (Number(flags[key]) || 0) + effect.amount
  }
  return { ...state, flags, affinity, updatedAt: now }
}

// ---------------------------------------------------------------- traversal

export interface Located { chapter: Chapter; node: Node; index: number }

function locate(scenario: Scenario, chapterId: string, index: number): Located | null {
  const chapter = scenario.chapters.find((row) => row.id === chapterId)
  if (!chapter) return null
  if (index < 0 || index >= chapter.nodes.length) return null
  return { chapter, node: chapter.nodes[index], index }
}

function locateById(scenario: Scenario, nodeId: string): Located | null {
  for (const chapter of scenario.chapters) {
    const index = chapter.nodes.findIndex((node) => node.id === nodeId)
    if (index >= 0) return { chapter, node: chapter.nodes[index], index }
  }
  return null
}

export interface StepResult {
  state: GameState
  /** 当前可显示的节点；剧本走完则为 null。 */
  node: Node | null
  chapter: Chapter | null
  /** true = 剧本结束（没有更多节点）。 */
  done: boolean
  /** 走过的节点 id（用于已读记录）。 */
  visited: string[]
}

/**
 * 从 state 指向的节点开始前进，跳过条件不满足的节点、跟随 jump，
 * 停在第一个可显示的节点上。已读/效果在途中累积。
 */
export function stepForward(scenario: Scenario, state: GameState, now = Date.now()): StepResult {
  let current = normalizeState(state, scenario, now)
  const visited: string[] = []
  let guard = 0

  // 先处理 state 指向节点的效果与条件，再往后找。
  while (guard++ < 2000) {
    const here = locate(scenario, current.chapterId, current.nodeIndex)
    if (!here) {
      // 本章走完 → 下一章
      const index = scenario.chapters.findIndex((chapter) => chapter.id === current.chapterId)
      const next = scenario.chapters[index + 1]
      if (!next) return { state: current, node: null, chapter: null, done: true, visited }
      current = { ...current, chapterId: next.id, nodeIndex: 0, updatedAt: now }
      continue
    }
    if (!conditionHolds(here.node.when, current)) {
      current = { ...current, nodeIndex: current.nodeIndex + 1, updatedAt: now }
      continue
    }
    if (!visited.includes(here.node.id)) visited.push(here.node.id)
    // 进入带时间戳的节点就把编年史往前推。
    if (here.node.at) {
      const label = String(here.node.at.label || '')
      const day = Number(here.node.at.day) || 0
      if (label && (!current.clock || current.clock.label !== label)) {
        current = { ...current, clock: { day, label }, updatedAt: now }
      }
    }
    if (here.node.effects) current = applyEffects(current, here.node.effects, now)
    if (here.node.kind === 'jump' && here.node.jumpTo) {
      const target = locateById(scenario, here.node.jumpTo)
      if (!target) { current = { ...current, nodeIndex: current.nodeIndex + 1, updatedAt: now }; continue }
      current = { ...current, chapterId: target.chapter.id, nodeIndex: target.index, updatedAt: now }
      continue
    }
    const readNodes = current.readNodes.includes(here.node.id)
      ? current.readNodes
      : [...current.readNodes, here.node.id]
    return {
      state: { ...current, readNodes, updatedAt: now },
      node: here.node,
      chapter: here.chapter,
      done: false,
      visited,
    }
  }
  return { state: current, node: null, chapter: null, done: true, visited }
}

/** 推进到下一个节点。 */
export function advance(scenario: Scenario, state: GameState, now = Date.now()): StepResult {
  const current = normalizeState(state, scenario, now)
  const moved: GameState = { ...current, nodeIndex: current.nodeIndex + 1, updatedAt: now }
  return stepForward(scenario, moved, now)
}

/** 选择某个选项：施加效果 → 跳转（若指定）→ 推进到下一个可显示节点。 */
export function choose(scenario: Scenario, state: GameState, choiceId: string, now = Date.now()): StepResult & { error?: string } {
  const current = normalizeState(state, scenario, now)
  const here = locate(scenario, current.chapterId, current.nodeIndex)
  if (!here || here.node.kind !== 'choice') return { state: current, node: null, chapter: null, done: false, visited: [], error: '当前节点不是选择支' }
  const options = (here.node.choices || []).filter((choice) => conditionHolds(choice.when, current))
  const picked = options.find((choice) => choice.id === choiceId)
  if (!picked) return { state: current, node: null, chapter: null, done: false, visited: [], error: '选项不可用' }

  let next = applyEffects(current, picked.effects, now)
  if (picked.jumpTo) {
    const target = locateById(scenario, picked.jumpTo)
    if (target) {
      next = { ...next, chapterId: target.chapter.id, nodeIndex: target.index, updatedAt: now }
      return stepForward(scenario, next, now)
    }
  }
  next = { ...next, nodeIndex: next.nodeIndex + 1, updatedAt: now }
  return stepForward(scenario, next, now)
}

/** 当前节点可显示的选项（已按条件过滤）。 */
export function visibleChoices(scenario: Scenario, state: GameState): Choice[] {
  const here = locate(scenario, state.chapterId, state.nodeIndex)
  if (!here || here.node.kind !== 'choice') return []
  return (here.node.choices || []).filter((choice) => conditionHolds(choice.when, state))
}

/** 查看 state 当前指向的节点（不推进）。stepForward 会把游标停在显示中的节点上。 */
export function peek(scenario: Scenario, state: GameState): Node | null {
  const here = locate(scenario, state.chapterId, state.nodeIndex)
  return here ? here.node : null
}

/** 当前章节对象。 */
export function currentChapter(scenario: Scenario, state: GameState): Chapter | null {
  return scenario.chapters.find((chapter) => chapter.id === state.chapterId) || null
}

// ---------------------------------------------------------------- endings

/**
 * 判定结局：显式 ending 节点优先，否则按 endings 数组顺序取第一个满足条件的。
 */
export function resolveEnding(scenario: Scenario, state: GameState, node?: Node | null): Ending | null {
  if (node && node.kind === 'ending' && node.endingId) {
    return scenario.endings.find((ending) => ending.id === node.endingId) || null
  }
  for (const ending of scenario.endings) {
    if (conditionHolds(ending.when, state)) return ending
  }
  return null
}

/** 记下这个节点最终说出的台词（纯函数）。 */
export function rememberLine(state: GameState, nodeId: string, text: string, now = Date.now()): GameState {
  if (!nodeId || !text) return state
  if (state.lines[nodeId] === text) return state
  return { ...state, lines: { ...state.lines, [nodeId]: text }, updatedAt: now }
}

/** 记录一个已达成结局（纯函数）。 */
export function markEnding(state: GameState, endingId: string, now = Date.now()): GameState {
  if (state.endingsSeen.includes(endingId)) return state
  return { ...state, endingsSeen: [...state.endingsSeen, endingId], updatedAt: now }
}

// ---------------------------------------------------------------- 存档摘要

export interface SlotSummary {
  chapterTitle: string
  chapterId: string
  nodeIndex: number
  updatedAt: number
  flags: number
  endings: number
  progress: number
}

/** 存档槽里显示的那几行字。 */
export function slotSummary(scenario: Scenario, state: GameState): SlotSummary {
  const chapter = scenario.chapters.find((row) => row.id === state.chapterId)
  const totalNodes = scenario.chapters.reduce((sum, row) => sum + row.nodes.length, 0)
  const before = scenario.chapters
    .slice(0, Math.max(0, scenario.chapters.findIndex((row) => row.id === state.chapterId)))
    .reduce((sum, row) => sum + row.nodes.length, 0)
  return {
    chapterTitle: chapter ? chapter.title : '未开始',
    chapterId: state.chapterId,
    nodeIndex: state.nodeIndex,
    updatedAt: state.updatedAt,
    flags: Object.keys(state.flags).length,
    endings: state.endingsSeen.length,
    progress: totalNodes ? Math.min(100, Math.round(((before + state.nodeIndex) / totalNodes) * 100)) : 0,
  }
}
