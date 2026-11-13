import {normalizeDialogue,commitEnsemble} from './ensemble-director'
import {relationshipProfile,matureAccess} from './relationship-progression'
import {ensureWorldEffects,settleWorldEffects} from './world-effects'
import {normalizeDirection} from './stage-director'
import { randomUUID } from 'node:crypto'

export const WORLD_ACTIONS = ['neutral', 'attentive', 'joy', 'shy', 'surprise', 'explain', 'annoyed', 'sad', 'thinking', 'comfort', 'proud', 'goodbye']
const text = (v: any, n = 400) => typeof v === 'string' ? v.trim().slice(0, n) : ''
export const cloneWorld = (v: any): any => JSON.parse(JSON.stringify(v))

export function newWorldline(roleId: string, premise = ''): any {
  const id = randomUUID()
  return { version: 1, worldId: id, branchId: randomUUID(), seed: randomUUID(), roleId,
    title: '与你共同书写的故事', premise: text(premise, 1000), startedAt: Date.now(), revision: 0,
    turns: [], summary: '', facts: [], commitments: [], intimateTurns: 0,
    scene: { day: 1, time: '夜晚', location: '深海女仆工坊', background: 'bg-atelier-night' }, step: null }
}

/**
 * 共创模式的开局骨架。
 *
 * 原先 premise 默认空串、标题页「开始故事」也不传 premise，模型拿到的世界状态
 * 只剩「第1天 夜晚 深海女仆工坊」加一句角色问候语，「开场情境」这一行直接被
 * filter(Boolean) 滤掉。于是每一幕都在真空里现编：每条线开头都不一样，后续对话
 * 也没有任何东西可以拴住，玩家看不懂「我们为什么在这儿、我是谁」。
 *
 * 设计契约要求「剧本给骨架、AI 给措辞」——共创模式缺的就是这块骨架。这里给的
 * 不是提示词，是已被玩家确认过的事实，模型不能推翻。
 */
export function defaultOpening(roleId: string, name = ''): string {
  const who = name || '她'
  return [
    '第 1 夜，打烊之后。',
    '工坊的招牌熄了两盏，只剩柜台那一盏还亮着。窗外在下雨，雨点打在玻璃上，街上已经没有人了。',
    '你是今晚最后一个客人，也是唯一一个还没走的人。你没说来做什么——也许只是想找个还亮着灯的地方坐一会儿。',
    who + '在收最后一批东西，抬头看见你，手上的活停了一下。',
    '你们不认识。' + who + '只知道你是刚推门进来的人，不知道你的名字、从哪来、为什么这个钟点还在这儿。你同样不知道' + who + '的事。',
    '今晚的工坊很安静，外面雨没停。接下来发生什么，由你们的对话决定。',
  ].join('\n')
}

/** 开局文本：玩家填过就用玩家的，没填用骨架。老存档不改 premise 也能拿到开局。 */
export function worldOpening(story: any, name = ''): string {
  const own = text(story?.premise, 1000)
  return own || defaultOpening(story?.roleId || 'deepseek', name)
}

/** Old saves gain identity without losing a single retained line. */
export function upgradeWorldline(story: any): any {
  if (!story) return null
  const defaults = newWorldline(story.roleId || 'deepseek')
  for (const [key, value] of Object.entries(defaults)) if (story[key] === undefined) story[key] = value
  if (!Array.isArray(story.turns)) story.turns = []
  if (!Array.isArray(story.facts)) story.facts = []
  if (!Array.isArray(story.commitments)) story.commitments = []
  ensureWorldEffects(story)
  return story
}

/** 补全未闭合的括号与字符串。 */
function closeStack(input: string): string {
  const stack: string[] = []
  let inStr = false, esc = false
  for (let i = 0; i < input.length; i++) {
    const c = input[i]
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue }
    if (c === '"') { inStr = true; continue }
    if (c === '{' || c === '[') stack.push(c === '{' ? '}' : ']')
    else if (c === '}' || c === ']') stack.pop()
  }
  let out = input
  if (inStr) out += '"'
  out = out.replace(/,\s*$/, '')
  return out + [...stack].reverse().join('')
}

/**
 * 宽容解析模型输出。
 *
 * 私密场景要求「每拍四样都得有」，输出比日常长得多，经常在半句被 max_tokens 截断，
 * 于是 JSON 不闭合、整轮直接报「未返回剧情 JSON」。玩家一推进就卡住，体验最差。
 *
 * 做法：先按原样试；不成就找出所有「可以安全截断」的位置（字符串外的逗号、
 * 字符串结束处），从后往前逐个剪掉尾巴、补全括号再试。不猜内容，只修结构。
 */
export function parseLooseJson(raw: any): any {
  const source = String(raw || '')
  const start = source.indexOf('{')
  if (start < 0) return null
  let body = source.slice(start)

  const tryParse = (candidate: string): any => {
    try {
      const value = JSON.parse(candidate)
      return value && typeof value === 'object' ? value : null
    } catch { return null }
  }

  const direct = tryParse(body)
  if (direct) return direct

  // 去掉代码围栏
  const fence = body.indexOf('```')
  if (fence > 0) { body = body.slice(0, fence); const v = tryParse(body); if (v) return v }

  // 收集安全的截断点：字符串外的逗号、闭合引号之后
  const cuts: number[] = []
  let inStr = false, esc = false
  for (let i = 0; i < body.length; i++) {
    const c = body[i]
    if (inStr) {
      if (esc) esc = false
      else if (c === '\\') esc = true
      else if (c === '"') { inStr = false; cuts.push(i + 1) }
      continue
    }
    if (c === '"') { inStr = true; continue }
    if (c === ',' || c === '}' || c === ']') cuts.push(i + 1)
  }

  // 从后往前剪：越靠后的截断点丢掉的尾部越少
  for (let k = cuts.length - 1; k >= 0; k--) {
    const head = body.slice(0, cuts[k])
    for (const candidate of [closeStack(head), closeStack(head).replace(/,\s*([}\]])/g, '$1')]) {
      const value = tryParse(candidate)
      if (value) return value
    }
  }
  return null
}

export function parseWorldStep(raw: any, backgrounds: string[]): any {
  const source = String(raw || '').trim()
  const open = source.indexOf('{'), close = source.lastIndexOf('}')
  if (open < 0) throw new Error('Agent 未返回剧情 JSON，请重试')
  // 先按原样解析（最严格），失败再走补全——输出被 max_tokens 截断时靠这一步救回来。
  let value: any = null
  try { value = JSON.parse(source.slice(open, close > open ? close + 1 : undefined)) }
  catch { value = parseLooseJson(source) }
  if (!value) throw new Error('Agent 未返回剧情 JSON，请重试')
  if(!text(value.line,500)&&!(Array.isArray(value.dialogue)&&value.dialogue.some((r:any)=>text(r?.text,700))))throw new Error('Agent 没有返回角色对白，请重试')
  const choices = (Array.isArray(value.choices) ? value.choices : []).slice(0, 4)
    .map((c: any, i: number) => ({ id: 'c' + i, kind:['normal','event','random','mature'].includes(c?.kind)?c.kind:'',label: text(c?.label, 100),action:text(c?.action,1000),tag: text(c?.tag, 12) })).filter((c: any) => c.label)
  const scene: any = {}
  for (const key of ['location', 'time', 'weather']) if (text(value.scene?.[key], 80)) scene[key] = text(value.scene[key], 80)
  if (Number.isInteger(value.scene?.day) && value.scene.day > 0 && value.scene.day < 100000) scene.day = value.scene.day
  if (backgrounds.includes(value.scene?.background)) scene.background = value.scene.background
  const list = (rows: any) => (Array.isArray(rows) ? rows : []).slice(0, 8).map((row: any) => text(row, 240)).filter(Boolean)
  return { narration: text(value.narration, 500), line: text(value.line, 800), dialogue:Array.isArray(value.dialogue)?value.dialogue.slice(0,8):[], choices, scene,
    facts: list(value.facts), commitments: list(value.commitments),
    relationships: Array.isArray(value.relationships) ? value.relationships.slice(0,3) : [], events: Array.isArray(value.events) ? value.events.slice(0,4) : [],
    direction: value.direction && typeof value.direction === 'object' ? value.direction : null,
    action: WORLD_ACTIONS.includes(value.action) ? value.action : 'neutral', emotion: text(value.emotion, 40), fallback: false }
}

export function worldContext(story: any, audience?:string[]): string {
  return [
    '独立世界线：' + story.worldId + '；创作种子：' + story.seed + '；分支：' + story.branchId + '；已完成轮次：' + story.revision,
    // 开局永远不空：玩家没填 premise 时用骨架。第 1 轮模型就知道「这是哪儿、你是谁、为什么在这儿」，
    // 而不是在真空里现编。放在最前面，因为它是所有后续对话的锚点。
    '本世界线的开局（已成事实，不要推翻；也不要当作回忆复述）：\n' + worldOpening(story),
    '关系档案（仅当前世界线）：' + JSON.stringify(story.relationships || {}),
    '当前各维度六阶称号与行为效果：'+JSON.stringify(Object.fromEntries(Object.entries(story.relationships||{}).map(([id,r])=>[id,relationshipProfile(r)]))),
    // 只给阶数与路线，不给 reason。原来整个 matureAccess 对象都塞进去，里面带
    // 「下一阶需要好感、信任、亲近均达到 N 点」，模型读成任务提示，于是每轮都在
    // 汇报进度、宣告「我们还没到那一步」——这是「到哪一步」的直接来源。
    '各角色亲密阶段（内部调度用，禁止在对白或旁白里提及阶段、进度、资格）：'+JSON.stringify(Object.fromEntries(Object.keys(story.relationships||{}).map(id=>{const a=matureAccess(story,id);return [id,{route:a.route,level:a.level,title:a.title}]}))),
    '本轮选择方向：'+JSON.stringify(story.interaction||{kind:'opening'}),
    '约定状态（引用已有 id 结算）：' + JSON.stringify([...(story.events||[]).filter((e:any)=>['pending','overdue'].includes(e.status)),...(story.events||[]).filter((e:any)=>!['pending','overdue'].includes(e.status)).slice(-8)]),
    '上一幕演出：' + JSON.stringify(story.direction || {}),
    '当前场景：' + JSON.stringify(story.scene),
    '已确认事实：' + story.facts.slice(-60).join('；')+(audience?'（这是玩家确认的事实，各角色仅知道各自亲历或获告知的部分）':''),
    '尚需记住的承诺：' + story.commitments.slice(-40).join('；'),
    story.summary ? (audience?'玩家的经历回顾（角色知识以各自记忆为准）：':'你们之前经历过：') + story.summary : '',
    '最近发生的事：\n' + story.turns.slice(-36).filter((row:any)=>!audience||(row.heardBy||[row.speaker]).some((id:string)=>audience.includes(id))).slice(-18).map((row: any) => (row.speaker === 'player' ? '玩家' : row.speaker) + '：' + row.text+(audience?'（当时在场：'+(row.heardBy||[row.speaker]).join('、')+'）':'')).join('\n'),
  ].filter(Boolean).join('\n')
}

export function commitWorldStep(story: any, step: any, action: string, requestId: string, mode = ''): any {
  if (requestId && story.turns.some((r:any)=>r.requestId===requestId)) return story
  ensureWorldEffects(story)
  const plan=step.ensemblePlan
  if(plan){
    const raw=step.direction||{},cast=plan.present.map((id:string)=>{const proposed=(Array.isArray(raw.cast)?raw.cast:[]).find((c:any)=>c?.role===id);return{...proposed,role:id,action:proposed?.action||step.dialogue?.find((r:any)=>r.speaker===id)?.action||(id===plan.focus?step.action:'attentive')}})
    step.direction=normalizeDirection({...raw,cast,speaker:plan.focus},plan.focus,step.action,plan.present)
  }else step.direction=normalizeDirection(step.direction,story.roleId,step.action,step.allowedRoles || [story.roleId])
  step.dialogue=normalizeDialogue(step.dialogue,step.direction,step.line)
  if(!step.dialogue.length)throw new Error('Agent 的角色台词不属于当前在场人物，请重试')
  step.line=step.dialogue[0].text
  story.direction=step.direction
  if(step.scene?.day)step.scene.day=Math.max(story.scene.day,Math.min(story.scene.day+1,step.scene.day))
  settleWorldEffects(story,step,action,requestId,step.direction.cast.map((c:any)=>c.role))
  if (story.forkOnNext) {
    story.parentBranchId = story.branchId; story.forkedAtRevision = story.revision
    story.branchId = randomUUID(); delete story.forkOnNext
  }
  if(step.ensembleRoles)commitEnsemble(story,step,action,step.ensembleRoles)
  const at = Date.now(), revision = story.revision + 1
  if (action) story.turns.push({ speaker: 'player', text: action, mode: mode === 'direct' ? 'direct' : 'speech', at, revision, requestId, branchId: story.branchId,heardBy:step.ensemblePlan?.previous||step.direction.cast.map((r:any)=>r.role) })
  if (step.narration) story.turns.push({ speaker: '旁白', text: step.narration, at, revision, requestId, branchId: story.branchId,heardBy:step.direction.cast.map((r:any)=>r.role) })
  step.dialogue.forEach((row:any,sequence:number)=>story.turns.push({speaker:row.speaker,text:row.text,to:row.to,action:row.action,sequence,at,revision,requestId,branchId:story.branchId,heardBy:step.direction.cast.map((r:any)=>r.role)}))
  for (const field of ['facts', 'commitments']) for (const item of step[field] || []) if (!story[field].includes(item)) story[field].push(item)
  story.scene = { ...story.scene, ...step.scene }; story.step = step; story.revision = revision
  story.updatedAt = at; story.agentStatus = step.fallback ? 'offline' : 'ready'
  return story
}
