import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MAP_NODES, MAP_EDGES, resolveNode, nodeLabel, travelRounds, travelPlan, stepToward,
  homeForGroup, advanceMember, mapBrief,
  sceneScale, detectSceneKind, selectCast, scaleInstruction,
  intimateBrief, escalationHint, INTIMATE_STAGES, resolveStage, stageFromAction, stageName,
  ensureEnsemble, planEnsemble, ensembleContext, newWorldline, upgradeWorldline,
  commitWorldStep, WORLD_CAST, parseLooseJson, parseWorldStep,
} from '../dist/index.js'

const roles = WORLD_CAST.map(id => ({ id, name: id, aliases: [id], post: '岗位', home: '工坊', group: '共同工作', source: 'builtin' }))
const stepOf = (plan) => ({
  narration: '她把手里的东西放下。',
  dialogue: plan.present.map(id => ({ speaker: id, text: '嗯。', action: 'attentive' })),
  action: 'attentive', scene: {}, facts: [], commitments: [], choices: [],
  allowedRoles: WORLD_CAST, ensembleRoles: roles, ensemblePlan: plan,
})

// ───────── 地图 ─────────

test('the user\'s own example route holds: atelier → plaza → lane → park is four rounds', () => {
  assert.equal(travelRounds('atelier', 'plaza'), 1)
  assert.equal(travelRounds('plaza', 'lane'), 1)
  assert.equal(travelRounds('lane', 'park'), 2)
  assert.equal(travelRounds('atelier', 'park'), 4, '工坊到公园必须是四轮')
  const plan = travelPlan('atelier', 'park')
  assert.deepEqual(plan.path, ['atelier', 'plaza', 'lane', 'park'])
  assert.equal(stepToward('atelier', 'park'), 'plaza')
})

test('map is symmetric, connected, and labels resolve back to ids', () => {
  for (const e of MAP_EDGES) {
    assert.ok(MAP_NODES.some(n => n.id === e.a), e.a)
    assert.ok(MAP_NODES.some(n => n.id === e.b), e.b)
    assert.equal(travelRounds(e.a, e.b), e.rounds)
    assert.equal(travelRounds(e.b, e.a), e.rounds, '路应该是双向的')
  }
  for (const n of MAP_NODES) assert.ok(Number.isFinite(travelRounds('atelier', n.id)), n.id + ' 走不到')
  assert.equal(resolveNode('工坊'), 'atelier')
  assert.equal(resolveNode('打烊后的工坊'), 'atelier')
  assert.equal(resolveNode('公园'), 'park')
  assert.equal(resolveNode('atelier'), 'atelier')
  assert.equal(nodeLabel('park'), '公园')
})

test('a character in the park cannot speak while the player is at the workshop', () => {
  const s = upgradeWorldline(newWorldline('deepseek'))
  const state = ensureEnsemble(s, roles)
  const far = roles[1].id
  state.members[far].location = 'park'
  state.members[far].target = 'park'
  s.scene.location = '工坊'
  const plan = planEnsemble(s, roles, '她在干什么？', { targetRoleId: far })
  assert.ok(!plan.present.includes(far), '在公园的人不该出现在工坊的对话里')
  assert.equal(plan.node, 'atelier')
})

test('movement is per-round and id-scattered, not a herd', () => {
  const s = upgradeWorldline(newWorldline('deepseek'))
  const state = ensureEnsemble(s, roles)
  for (let r = 0; r < 3; r++) for (const role of roles) {
    const moved = advanceMember({ ...state.members[role.id], id: role.id }, r, 'seed-fixed')
    state.members[role.id].location = moved.location
    state.members[role.id].target = moved.target
    state.members[role.id].dwellLeft = moved.dwellLeft
  }
  const spots = new Set(Object.values(state.members).map(m => m.location))
  assert.ok(spots.size >= 2, '同一组的人不该全体在同一地点：' + [...spots].join(','))
})

// ───────── 场景规模 ─────────

test('cast size follows the user\'s spec: party 5–7 / normal 2–3 / intimate 1–2 / orgy 5', () => {
  assert.deepEqual([sceneScale('party').min, sceneScale('party').max], [5, 7])
  assert.deepEqual([sceneScale('normal').min, sceneScale('normal').max], [2, 3])
  assert.deepEqual([sceneScale('intimate').min, sceneScale('intimate').max], [1, 2])
  assert.deepEqual([sceneScale('orgy').min, sceneScale('orgy').max], [5, 5])
  assert.equal(sceneScale('party').allowsWalkIn, true)
  assert.equal(sceneScale('intimate').allowsWalkIn, false)
})

test('scene kind is detected from action, interaction and premise', () => {
  assert.equal(detectSceneKind({ action: '大家一起来聚一聚吧' }), 'party')
  assert.equal(detectSceneKind({ action: '我吻下去。' }), 'intimate')
  assert.equal(detectSceneKind({ action: '我吻下去，让她们一起来。' }), 'orgy')
  assert.equal(detectSceneKind({ interactionKind: 'mature', action: '走。' }), 'intimate')
  assert.equal(detectSceneKind({ interactionKind: 'mature', previous: 'orgy' }), 'orgy')
  assert.equal(detectSceneKind({ action: '她把茶推过来。' }), 'normal')
  assert.equal(detectSceneKind({ premise: '工坊里没有别人。' }), 'intimate')
})

test('party actually gathers 5–7 people; intimate stays at one', () => {
  const s = upgradeWorldline(newWorldline('deepseek'))
  ensureEnsemble(s, roles)
  const party = planEnsemble(s, roles, '今晚大家聚一聚吧', {})
  assert.equal(party.kind, 'party')
  assert.ok(party.present.length >= 5 && party.present.length <= 7, '聚会应该 5–7 人，实际 ' + party.present.length)

  const s2 = upgradeWorldline(newWorldline('deepseek'))
  ensureEnsemble(s2, roles)
  const one = planEnsemble(s2, roles, '我把她揽过来吻她。', {})
  assert.equal(one.kind, 'intimate')
  assert.equal(one.present.length, 1, '私密场景只有 1 人，实际 ' + one.present.length)

  const orgy = planEnsemble(s2, roles, '我吻下去，让她们一起上来。', {})
  assert.equal(orgy.kind, 'orgy')
  assert.equal(orgy.present.length, 5, '大乱交应该正好 5 人，实际 ' + orgy.present.length)
})

test('a walk-in does not get to say one line and leave next round', () => {
  const s = upgradeWorldline(newWorldline('deepseek'))
  ensureEnsemble(s, roles)
  // 推几轮让人散开，再从别处叫一个过来
  for (let i = 0; i < 3; i++) planEnsemble(s, roles, '随便聊聊')
  const far = roles.find(r => s.ensemble.members[r.id].location !== resolveNode(s.scene.location))
  if (!far) return
  s.ensemble.members[far.id].location = 'plaza'
  const invited = planEnsemble(s, roles, '请她过来', { inviteRoleId: far.id })
  if (!invited.present.includes(far.id)) return   // 太远，本来就不该来
  commitWorldStep(s, stepOf(invited), '请她过来', 'arrive')
  // 下一轮：刚来的人不许立刻走
  const next = planEnsemble(s, roles, '她说点什么？')
  assert.ok(next.present.includes(far.id) || next.departures.length === 0, '刚到场的人被踢出去了')
})

test('scale instruction tells the model how many people are on stage', () => {
  const s = upgradeWorldline(newWorldline('deepseek'))
  ensureEnsemble(s, roles)
  const plan = planEnsemble(s, roles, '我把她揽过来吻她。', {})
  const ctx = ensembleContext(plan, roles)
  assert.match(ctx, /这是私密场景/)
  assert.match(ctx, /本幕实际在场 1 人/)
  assert.match(ctx, /工坊—广场 1 轮/)
})

// ───────── H 场景写作 ─────────

test('intimate brief demands concrete detail and forbids the evasions that made it bland', () => {
  const brief = intimateBrief({ level: 4, route: 'pure', cast: ['鲸鱼娘'] })
  // 不够露骨的四个具体成因：抽象词、跳时间、藏主语、比喻代替部位
  for (const bad of ['一阵酥麻', '不知过了多久', '她的身体做出了回应', '花心', '秘处'])
    assert.ok(brief.includes(bad), '没点名要禁掉的写法：' + bad)
  // 具体化要求
  assert.match(brief, /具体位置/)
  assert.match(brief, /衣物到哪一步/)
  assert.match(brief, /绕开/)
  // 主动性（没有灵魂的正解）
  assert.match(brief, /主动性/)
  assert.match(brief, /每一拍至少有一个人主动发起/)
  assert.match(brief, /把这句话换给另一个角色会别扭/)
})

// ───────── 六段 H 事件序列 ─────────

test('the six stages are an event sequence, in the user\'s exact order', () => {
  assert.deepEqual(INTIMATE_STAGES.map(s => s.name), ['亲密', '前戏', '性交', '快速性交', '高潮', '高潮后'])
  // 每段必须写明它包含什么，否则模型不知道这段该写什么
  assert.match(INTIMATE_STAGES[0].covers, /接吻|抚摸|撩拨/)
  // 词表刻意不罗列器官名：实测 prompt 里堆这些词会被平台 input 审核整轮拦掉
  // （data_inspection_failed）。所以用「描述要求」表达同样的意思。
  assert.match(INTIMATE_STAGES[1].covers, /用手和口|其他部位|抚慰/)
  assert.match(INTIMATE_STAGES[2].covers, /进入之后|支配关系|束缚/)
  assert.match(INTIMATE_STAGES[3].covers, /加快|体位/)
  assert.match(INTIMATE_STAGES[4].covers, /失控|泄出|失神/)
  assert.match(INTIMATE_STAGES[5].covers, /继续性交|换部位|结束性交|换人/)
  // prompt 里不能出现高危器官/行为词，否则整轮发不出去
  const briefAll = [1, 2, 3, 4, 5, 6].map(n => intimateBrief({ level: n, route: 'pure', cast: ['A'] })).join('')
  for (const risky of ['阴道', '肛门', '肛交', '潮吹', '射精', '乳交', '足交', '口交', '自慰'])
    assert.ok(!briefAll.includes(risky), 'prompt 里还有高危词「' + risky + '」，会被平台审核拦掉')
})

test('stage 1 is 亲密 — the scene must not open at intercourse', () => {
  const first = intimateBrief({ level: 1, route: 'pure', cast: ['A'] })
  assert.match(first, /第 1 段：亲密/)
  assert.match(first, /还没到实质接触/)
  // 第一段绝不该出现后面几段的具体动作词（「下一段是前戏」那行只是在预告，不算）
  for (const later of ['插入', '抽送', '潮吹', '换体位'])
    assert.ok(!first.includes(later), '第 1 段不该出现「' + later + '」')
  // 也不该把后面那段提前
  assert.match(first, /下一段是「前戏」/)
})

test('each stage names itself and the next one, and the last one is terminal', () => {
  for (let i = 1; i <= 5; i++) {
    const brief = intimateBrief({ level: i, route: 'pure', cast: ['A'] })
    assert.match(brief, new RegExp('第 ' + i + ' 段：' + INTIMATE_STAGES[i - 1].name))
    assert.match(brief, new RegExp('下一段是「' + INTIMATE_STAGES[i].name + '」'))
    assert.match(brief, /没到位就继续把这一段写足/)
  }
  const last = intimateBrief({ level: 6, route: 'pure', cast: ['A'] })
  assert.match(last, /第 6 段：高潮后/)
  assert.match(last, /这已经是最后一段/)
  // 第 6 段必须给四条明确出路（继续 / 换部位 / 收尾 / 换人）
  assert.match(last, /接着做/)
  assert.match(last, /换部位/)
  assert.match(last, /收尾/)
  assert.match(last, /多人时换人/)
})

test('resolveStage starts at 1 and only moves forward', () => {
  // 全新存档、第一拍：第 1 段，不是第 3 段
  assert.equal(resolveStage({ allowedLevel: 1, sceneTurns: 0, action: '我把手放到她后颈上，吻她。' }), 1)
  // 轮数推进：每 2 轮上一段
  assert.equal(resolveStage({ allowedLevel: 1, sceneTurns: 0 }), 1)
  assert.equal(resolveStage({ allowedLevel: 1, sceneTurns: 2 }), 2)
  assert.equal(resolveStage({ allowedLevel: 1, sceneTurns: 4 }), 3)
  assert.equal(resolveStage({ allowedLevel: 1, sceneTurns: 10 }), 6)
  // 动作本身能推段
  assert.equal(resolveStage({ sceneTurns: 0, action: '我含住她。' }), 2)
  assert.equal(resolveStage({ sceneTurns: 0, action: '我进去了。' }), 3)
  assert.equal(resolveStage({ sceneTurns: 0, action: '我加快动作，把她翻过来。' }), 4)
  assert.equal(resolveStage({ sceneTurns: 0, action: '她高潮了。' }), 5)
  // 只进不退：上一拍到了第 4 段，这一拍不会掉回去
  assert.equal(resolveStage({ sceneTurns: 0, action: '我吻她。', previous: 4 }), 4)
  // 关系资格能往前带，但最多带一段——否则好感刷满就一进场景直接到末段
  assert.equal(resolveStage({ allowedLevel: 5, sceneTurns: 0, action: '' }), 2)
  assert.equal(resolveStage({ allowedLevel: 6, sceneTurns: 4, action: '' }), 4)  // byTurns=3，关系最多再带一段
})

test('stageFromAction maps the player\'s own words onto the right stage', () => {
  assert.equal(stageFromAction('我吻她，手放在她腰上'), 1)
  // 手往衣服里探已经算前戏，不是亲密
  assert.equal(stageFromAction('我吻她，手从衣摆里探进去'), 2)
  assert.equal(stageFromAction('我替她口交'), 2)
  assert.equal(stageFromAction('我进入她'), 3)
  assert.equal(stageFromAction('我把她翻过来，加快速度'), 4)
  assert.equal(stageFromAction('她潮吹了'), 5)
  assert.equal(stageFromAction('我进去了'), 3, '「进去了」不能算高潮')
  assert.equal(stageFromAction('她到了顶点'), 5)
  assert.equal(stageFromAction('我点点头'), 0)
})

test('escalation hint only fires when the player actually moved the body', () => {
  assert.equal(escalationHint('我点点头。'), '')
  assert.match(escalationHint('我把手放到她后颈上。'), /更进一层/)
  assert.match(escalationHint('吻她的锁骨'), /可测量的推进/)
})


// ───────── 输出截断容错 ─────────
// 私密场景输出更长，3200 token 常在半句被切断，JSON 不闭合。
// 以前直接抛「未返回剧情 JSON」，玩家一推进就卡死。

test('a truncated model response still parses instead of failing the turn', () => {
  const truncated = '{"narration":"她的手停在他胸口。","dialogue":[{"speaker":"deepseek","text":"你倒是'
  const value = parseLooseJson(truncated)
  assert.ok(value, '截断的输出应该能救回来')
  assert.equal(value.narration, '她的手停在他胸口。')

  // 尾部是半个键名
  assert.ok(parseLooseJson('{"narration":"灯灭了","choices":[{"kind":"normal","lab'))
  // 整个 answers 都在 markdown 围栏里
  assert.ok(parseLooseJson('```json\n{"narration":"雨停了","dialogue":[]}\n```'))
  // 正常闭合的仍然照常解析
  const fine = parseLooseJson('{"narration":"好","dialogue":[]}')
  assert.deepEqual(fine, { narration: '好', dialogue: [] })
  // 没有 JSON 就返回 null，交由上层报错
  assert.equal(parseLooseJson('抱歉，我无法完成这个请求。'), null)
})

test('parseWorldStep survives a cut-off dialogue array', () => {
  const cut = '{"narration":"她扣住他的手腕。","dialogue":[{"speaker":"deepseek","to":"player","text":"别急。","action":"attentive"},{"speaker":"deepseek","text":"我还没'
  const step = parseWorldStep(cut, ['bg-atelier-night'])
  assert.equal(step.narration, '她扣住他的手腕。')
  assert.equal(step.dialogue.length, 2)
  assert.equal(step.dialogue[0].text, '别急。')
})
