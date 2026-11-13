/**
 * 区域地图与移动。
 *
 * 用户要求：没有地图就是胡来——「工坊→广场→小道→公园」这样明确的移动线，
 * 每回合推进一次移动。角色在公园，玩家在工坊，就得走四轮才能出现在对话里。
 *
 * 设计：加权无向图。边的权 = 走完这条路要几轮。atelier→park 取
 * atelier—plaza(1) + plaza—lane(1) + lane—park(2) = 4 轮，正好对上这个例子。
 *
 * 关键约束：**在场必须物理成立**。一个角色要么就在这里，要么还在路上。
 * 不准为了凑人数把人凭空搬过来——这正是「有人走进来说一句话又走了」的根源。
 */

export interface MapNode {
  id: string
  label: string
  /** 常驻这里的岗位组；用于给角色分配 home */
  groups?: string[]
}

export interface MapEdge {
  a: string
  b: string
  /** 走完这条路要几轮 */
  rounds: number
}

export interface TravelPlan {
  from: string
  to: string
  rounds: number
  path: string[]
}

export const MAP_NODES: readonly MapNode[] = [
  { id: 'atelier', label: '工坊', groups: ['接待'] },
  { id: 'yard', label: '后院', groups: ['庭院'] },
  { id: 'plaza', label: '广场' },
  { id: 'lane', label: '小道', groups: ['创作'] },
  { id: 'park', label: '公园' },
  { id: 'market', label: '市集', groups: ['生活'] },
  { id: 'storage', label: '仓库', groups: ['文档'] },
  { id: 'ferry', label: '渡口', groups: ['信号'] },
  { id: 'shrine', label: '祠堂' },
]

/**
 * 边权是「走这段要几轮」。刻意做成不等权：小道到公园是穿林子的长路（2 轮），
 * 工坊到广场是抬脚就到（1 轮）。全等权会让距离失去意义。
 */
export const MAP_EDGES: readonly MapEdge[] = [
  { a: 'atelier', b: 'yard', rounds: 1 },
  { a: 'atelier', b: 'plaza', rounds: 1 },
  { a: 'plaza', b: 'lane', rounds: 1 },
  { a: 'plaza', b: 'market', rounds: 1 },
  { a: 'plaza', b: 'ferry', rounds: 2 },
  { a: 'lane', b: 'park', rounds: 2 },
  { a: 'lane', b: 'shrine', rounds: 1 },
  { a: 'market', b: 'storage', rounds: 1 },
  { a: 'storage', b: 'ferry', rounds: 1 },
]

const NODE_BY_ID = new Map(MAP_NODES.map(n => [n.id, n]))
const LABEL_TO_ID = new Map(MAP_NODES.map(n => [n.label, n.id]))

export const DEFAULT_NODE = 'atelier'

/** 名称 → 节点 id。既认 id 也认中文标签，认不出就是默认点。 */
export function resolveNode(value: any): string {
  const raw = String(value || '').trim()
  if (!raw) return DEFAULT_NODE
  if (NODE_BY_ID.has(raw)) return raw
  if (LABEL_TO_ID.has(raw)) return LABEL_TO_ID.get(raw)!
  // 「打烊后的工坊」「深海女仆工坊」这类描述要能落到工坊
  for (const node of MAP_NODES) if (raw.includes(node.label)) return node.id
  if (/工坊|女仆/.test(raw)) return 'atelier'
  return DEFAULT_NODE
}

export function nodeLabel(id: string): string {
  return NODE_BY_ID.get(id)?.label || id
}

export function neighborsOf(id: string): { id: string; rounds: number }[] {
  const rows: { id: string; rounds: number }[] = []
  for (const edge of MAP_EDGES) {
    if (edge.a === id) rows.push({ id: edge.b, rounds: edge.rounds })
    else if (edge.b === id) rows.push({ id: edge.a, rounds: edge.rounds })
  }
  return rows
}

export function edgeRounds(a: string, b: string): number {
  const row = MAP_EDGES.find(e => (e.a === a && e.b === b) || (e.a === b && e.b === a))
  return row ? row.rounds : 0
}

/**
 * 最短路（按轮数）。Dijkstra 就够，图只有九点。
 * 走不过去返回 null——孤立点不该被当成 0 轮，那会让人瞬间移动。
 */
export function travelPlan(from: string, to: string): TravelPlan | null {
  const start = resolveNode(from), goal = resolveNode(to)
  if (start === goal) return { from: start, to: goal, rounds: 0, path: [start] }
  const dist = new Map<string, number>([[start, 0]])
  const prev = new Map<string, string>()
  const done = new Set<string>()
  while (true) {
    let current = ''
    let best = Infinity
    for (const [id, cost] of dist) if (!done.has(id) && cost < best) { best = cost; current = id }
    if (!current) break
    if (current === goal) break
    done.add(current)
    for (const next of neighborsOf(current)) {
      const cost = best + next.rounds
      if (cost < (dist.get(next.id) ?? Infinity)) { dist.set(next.id, cost); prev.set(next.id, current) }
    }
  }
  const total = dist.get(goal)
  if (total === undefined) return null
  const path = [goal]
  let cursor = goal
  while (cursor !== start) {
    const before = prev.get(cursor)
    if (!before) return null
    path.unshift(before); cursor = before
  }
  return { from: start, to: goal, rounds: total, path }
}

/** 从 a 到 b 要几轮。走不通时给一个大数，表示「这轮来不了」。 */
export function travelRounds(from: string, to: string): number {
  return travelPlan(from, to)?.rounds ?? Number.MAX_SAFE_INTEGER
}

/** 上一跳（沿最短路往前走一格）。已经到达就返回自身。 */
export function stepToward(from: string, to: string): string {
  const plan = travelPlan(from, to)
  if (!plan || plan.path.length < 2) return resolveNode(from)
  return plan.path[1]
}

/** 角色的常驻点，由岗位组决定。用来初始化 home，也用来让她们走回自己的地方。 */
export function homeForGroup(group: string): string {
  const node = MAP_NODES.find(n => (n.groups || []).includes(group))
  return node?.id || DEFAULT_NODE
}

/**
 * 每轮移动一步。返回新位置。
 *
 * 规则刻意保守：到了目的地就先待着（dwellLeft），待够了再挑下一站。
 * 这样存档可复现——同样的 seed + revision 一定走出同样的路线，
 * 读档不会让所有人瞬移。
 */
export function advanceMember(
  member: { location?: string; target?: string; dwellLeft?: number; group?: string; id?: string },
  revision: number,
  seed: string,
): { location: string; target: string; dwellLeft: number } {
  const location = resolveNode(member.location)
  let target = member.target ? resolveNode(member.target) : ''
  let dwellLeft = Number.isFinite(member.dwellLeft) ? Number(member.dwellLeft) : 0
  // id 必须参与散列。只用「组 + revision」时，同一组的十几个人会算出同一个目的地，
  // 整群人一起从工坊挪到广场再一起挪到渡口，看起来像集体行军。
  const who = member.id || ''

  if (!target) target = pickDestination(member.group || '', location, revision, seed, who)

  if (location === target) {
    if (dwellLeft <= 0) {
      dwellLeft = 1
      target = pickDestination(member.group || '', location, revision + 1, seed, who)
      return { location, target, dwellLeft }
    }
    return { location, target, dwellLeft: dwellLeft - 1 }
  }

  const next = stepToward(location, target)
  return { location: next === location ? target : next, target, dwellLeft }
}

function pickDestination(group: string, from: string, revision: number, seed: string, who = ''): string {
  const home = homeForGroup(group)
  // 七成时间在自己那块地方，三成出去转。太爱乱走会让人永远在路上，
  // 玩家每次开局都凑不到人。
  const hash = hashOf(seed + '|' + group + '|' + revision + '|' + who)
  if (hash % 10 < 3) {
    const pool = MAP_NODES.filter(n => n.id !== from && n.id !== home)
    return pool[hash % Math.max(1, pool.length)]?.id || home
  }
  return home
}

function hashOf(text: string): number {
  let n = 0
  for (let i = 0; i < text.length; i++) n = (n * 31 + text.charCodeAt(i)) >>> 0
  return n
}

/** 给 prompt 用的一行地图摘要：谁在哪、离玩家几轮。 */
export function mapBrief(entries: { name: string; location: string }[], playerNode: string): string {
  const here: string[] = []
  const away: string[] = []
  for (const row of entries) {
    const rounds = travelRounds(row.location, playerNode)
    if (rounds === 0) here.push(row.name)
    else if (Number.isFinite(rounds)) away.push(row.name + '在' + nodeLabel(resolveNode(row.location)) + '（过来要 ' + rounds + ' 轮）')
    else away.push(row.name + '在' + nodeLabel(resolveNode(row.location)) + '（走不过来）')
  }
  return [
    '玩家所在：' + nodeLabel(playerNode),
    here.length ? '同一地点的人：' + here.join('、') : '同一地点暂时没有别人',
    away.length ? '在别处的人：' + away.join('；') : '',
    '路线：工坊—广场 1 轮，广场—小道 1 轮，小道—公园 2 轮，广场—市集 1 轮，市集—仓库 1 轮，仓库—渡口 1 轮，广场—渡口 2 轮，工坊—后院 1 轮，小道—祠堂 1 轮。',
  ].filter(Boolean).join('\n')
}
