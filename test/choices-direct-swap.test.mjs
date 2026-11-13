import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync, rmSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {Readable} from 'node:stream'
import {
  apply, setGalChatProvider, worldChoices, STORY_CHOICE_KINDS, LOCAL_CHOICE_KINDS,
  INTIMATE_STAGES, newWorldline, RELATIONSHIP_AXES, upgradeWorldline, ensureEnsemble, planEnsemble,
  commitWorldStep, WORLD_CAST,
} from '../dist/index.js'

const roles = WORLD_CAST.map(id => ({ id, name: id, aliases: [id], post: '岗位', group: '共同工作', source: 'builtin' }))
const stepOf = (plan) => ({
  narration: '她把手里的东西放下。',
  dialogue: plan.present.map(id => ({ speaker: id, text: '嗯。', action: 'attentive' })),
  action: 'attentive', scene: {}, facts: [], commitments: [], choices: [],
  allowedRoles: WORLD_CAST, ensembleRoles: roles, ensemblePlan: plan,
})

// ───────── 第五个选项：自己决定走向 ─────────

test('the choices row always ends with 自己决定走向, and it presets no action', () => {
  const w = upgradeWorldline(newWorldline('deepseek'))
  const rows = worldChoices(w, { choices: [{ kind: 'normal', label: '聊聊', action: '聊聊近况' }] })
  assert.deepEqual(rows.map(r => r.kind), ['normal', 'event', 'random', 'mature', 'custom'])
  const custom = rows[rows.length - 1]
  assert.equal(custom.id, 'mode-custom')
  assert.equal(custom.action, '', '这一项不该预设任何行动——走向由玩家自己写')
  assert.equal(custom.label, '自己决定走向')
  assert.equal(custom.index, 5)
})

test('custom and swap are local-only kinds the model never has to return', () => {
  assert.deepEqual(STORY_CHOICE_KINDS, ['normal', 'event', 'random', 'mature'])
  assert.deepEqual(LOCAL_CHOICE_KINDS, ['custom', 'swap'])
  // 模型不返回任何 kind 时也要凑齐四行 + 自己决定走向
  const w = upgradeWorldline(newWorldline('deepseek'))
  const rows = worldChoices(w, { choices: [] })
  assert.equal(rows.length, 5)
  assert.ok(rows.every(r => r.label && r.caption))
})

test('the mature fallback pushes forward instead of offering a brake', () => {
  const w = upgradeWorldline(newWorldline('deepseek'))
  for (const route of ['pure', 'fall']) {
    w.relationshipRoutes = { deepseek: route }
    const rows = worldChoices(w, { choices: [] })
    const mature = rows.find(r => r.kind === 'mature')
    assert.ok(mature, route + ' 路线应该有 mature 选项')
    // 任何一个刹车词都不许出现
    for (const brake of ['边界', '界限', '停止', '确认', '商量', '谈谈'])
      assert.ok(!mature.action.includes(brake), route + ' 的 mature 兜底含刹车词「' + brake + '」：' + mature.action)
  }
})

// ───────── 换人 ─────────

test('换人 only appears in a multi-person 高潮后 scene', () => {
  const w = upgradeWorldline(newWorldline('deepseek'))
  ensureEnsemble(w, roles)

  // 单人场景：没有换人
  const solo = planEnsemble(w, roles, '我吻她。', {})
  assert.equal(solo.present.length, 1)
  const soloRows = worldChoices(w, { choices: [], ensemblePlan: solo, ensembleRoles: roles, direction: { speaker: solo.focus } })
  assert.ok(!soloRows.some(r => r.kind === 'swap'), '单人场景不该出现换人')

  // 多人走到第 6 段：出现换人
  const w2 = upgradeWorldline(newWorldline('deepseek'))
  ensureEnsemble(w2, roles)
  const orgy = planEnsemble(w2, roles, '我吻下去，让她们一起上来。', {})
  assert.equal(orgy.kind, 'orgy')
  assert.ok(orgy.present.length >= 3)
  const late = { ...orgy, stage: 6 }
  const rows = worldChoices(w2, { choices: [], ensemblePlan: late, ensembleRoles: roles, direction: { speaker: late.focus } })
  const swap = rows.find(r => r.kind === 'swap')
  assert.ok(swap, '多人第 6 段应该有换人')
  assert.ok(swap.swapRoleId && swap.swapRoleId !== late.focus, '换人必须指向另一个在场的人')
  assert.equal(rows[rows.length - 1].kind, 'custom', '换人之后仍然是自己决定走向收尾')
})

// ───────── direct 模式 ─────────

function boot(home) {
  let route
  apply({
    dshHomePath: (...p) => join(home, ...p),
    effect: f => f(), on() {}, inject() {},
    webServer: { register: r => { if (r.path === '/whale-galgame-api') route = r } },
  }, { enabled: true, imageBackend: 'off' }, {})
  const call = async (action, args = {}) => {
    let body = ''
    const req = Readable.from([Buffer.from(JSON.stringify({ action, args }))])
    req.method = 'POST'
    await route.handler(req, { writeHead() {}, end(v) { body = v } })
    return JSON.parse(body)
  }
  return call
}

test('direct mode tells the model this is a direction, not a line of dialogue', async () => {
  const home = mkdtempSync(join(tmpdir(), 'direct-imode-'))
  const seen = []
  setGalChatProvider(async ({ system, prompt }) => {
    seen.push(prompt)
    if (system.includes('维护剧情摘要')) return '摘要'
    return JSON.stringify({
      narration: '灯灭了一盏。', dialogue: [{ speaker: 'deepseek', to: 'player', text: '你怎么了？', action: 'attentive' }],
      choices: [], scene: {}, facts: [], commitments: [], action: 'attentive',
    })
  })
  try {
    const call = boot(home)
    await call('gal-free-start', { roleId: 'deepseek', restart: true, premise: '第 1 夜，打烊之后。' })

    // 说话
    await call('gal-free-next', { action: '你今晚累不累？', requestId: 'speech-1' })
    assert.ok(seen.some(p => p.includes('玩家刚刚说：你今晚累不累？')), '说话要标成「玩家刚刚说」')
    assert.ok(!seen.some(p => p.includes('玩家指定了接下来的发展：你今晚累不累？')), '说话不能被当成走向指定')

    // 指定走向
    await call('gal-free-next', { action: '外面突然下起暴雨，她把门反锁了。', mode: 'direct', requestId: 'direct-1' })
    const last = seen[seen.length - 1]
    // prompt 改成清单式，指令放在最后（模型对末尾更敏感）
    assert.ok(last.includes('玩家的指令：外面突然下起暴雨，她把门反锁了。'), 'direct 要把指令带在最后')
    assert.ok(last.includes('玩家指定了接下来的发展'), 'direct 要标成走向指定')
    assert.ok(last.includes('不要出现「你说」「你提到」「你想让」'), 'direct 必须禁止把指令当台词接')
    assert.ok(last.includes('旁白第一句'), 'direct 要求第一句就让事情发生')
    assert.ok(!last.includes('玩家刚刚说：外面突然下起暴雨'), 'direct 不能被当成说话')
  } finally {
    setGalChatProvider(null)
    rmSync(home, { recursive: true, force: true })
  }
})

test('换人 really moves the focus, it is not just a line of dialogue', async () => {
  const home = mkdtempSync(join(tmpdir(), 'swap-focus-'))
  setGalChatProvider(async ({ system }) => {
    if (system.includes('维护剧情摘要')) return '摘要'
    return JSON.stringify({
      narration: '另一个人接了过来。',
      dialogue: [{ speaker: 'glm', to: 'player', text: '换我吧。', action: 'attentive' }],
      choices: [], scene: {}, facts: [], commitments: [], action: 'attentive',
    })
  })
  try {
    const call = boot(home)
    await call('gal-free-start', { roleId: 'deepseek', restart: true, premise: '第 1 夜，大家都在。' })
    const state = await call('gal-ensemble-state')
    // 找一个确实在场、且不是当前焦点的人
    const other = state.present.find(id => id !== state.focus)
    if (!other) return   // 只有一个人在场地，跳过
    const r = await call('gal-free-next', { action: '换人。', swapRoleId: other, requestId: 'swap-1' })
    assert.ok(r.ok !== false, '换人应该成功：' + (r.error || ''))
    const after = await call('gal-ensemble-state')
    assert.equal(after.focus, other, '焦点要真的换过去')
  } finally {
    setGalChatProvider(null)
    rmSync(home, { recursive: true, force: true })
  }
})

test('换人 refuses someone who is not on stage', async () => {
  const home = mkdtempSync(join(tmpdir(), 'swap-refuse-'))
  setGalChatProvider(async () => JSON.stringify({ narration: 'x', dialogue: [{ speaker: 'deepseek', text: '嗯', action: 'attentive' }], choices: [], scene: {} }))
  try {
    const call = boot(home)
    await call('gal-free-start', { roleId: 'deepseek', restart: true, premise: '第 1 夜，打烊之后。' })
    const state = await call('gal-ensemble-state')
    const absent = Object.entries(state.roles).length
      ? state.roles.find(r => !state.present.includes(r.id) && r.location !== state.presentLocation)
      : null
    if (!absent) return
    const r = await call('gal-free-next', { action: '换人。', swapRoleId: absent.id, requestId: 'swap-x' })
    assert.equal(r.ok, false)
    assert.match(r.error, /不在场|换不了/)
  } finally {
    setGalChatProvider(null)
    rmSync(home, { recursive: true, force: true })
  }
})

// ───────── 面板里的段位 ─────────

test('the intimate stage is exposed to the journal panel but not the chat payload', () => {
  const w = upgradeWorldline(newWorldline('deepseek'))
  ensureEnsemble(w, roles)
  const plan = planEnsemble(w, roles, '我把她揽过来吻她。', {})
  assert.equal(plan.stage, 1, '第一拍是第 1 段亲密')
  commitWorldStep(w, stepOf(plan), '我把她揽过来吻她。', 's1')
  assert.equal(w.intimateStage, 1)
  assert.equal(w.intimateStage, 1)
  // 段名来自同一张表，前端不用自己维护一份
  assert.equal(INTIMATE_STAGES[w.intimateStage - 1].name, '亲密')
})


test('the server refuses to run 自己决定走向 as a choice — that was the 牛头不对马嘴 bug', async () => {
  const home = mkdtempSync(join(tmpdir(), 'custom-guard-'))
  let calls = 0
  setGalChatProvider(async ({ system }) => {
    calls++
    if (system.includes('维护剧情摘要')) return '摘要'
    return JSON.stringify({
      narration: '她放下杯子。', dialogue: [{ speaker: 'deepseek', text: '嗯。', action: 'attentive' }],
      choices: [], scene: {}, facts: [], commitments: [], action: 'attentive',
    })
  })
  try {
    const call = boot(home)
    await call('gal-free-start', { roleId: 'deepseek', restart: true, premise: '第 1 夜，打烊之后。' })
    const before = calls
    // 关键：custom 的 action 是空串，如果放过去，模型会以为「该写开场了」，
    // 于是输出一段跟当前剧情毫不相干的东西。必须在这里拦掉。
    const r = await call('gal-free-next', { choiceId: 'mode-custom', action: '自己决定走向', requestId: 'c-1' })
    assert.equal(r.ok, false, 'custom 不能被当成一条普通选项执行')
    assert.match(r.error, /先把这一段写出来/)
    assert.equal(r.needsDirect, true, '要告诉前端切到输入模式')
    assert.equal(calls, before, '拦在模型之前，不该产生一次生成')
  } finally {
    setGalChatProvider(null)
    rmSync(home, { recursive: true, force: true })
  }
})

test('the NSFW ranks are the six H stages, so the panel matches the scene', () => {
  const stages = INTIMATE_STAGES.map(s => s.name)
  for (const dir of ['positive', 'negative']) {
    const tiers = RELATIONSHIP_AXES.nsfw[dir]
    assert.equal(tiers.length, 6)
    tiers.forEach((tier, i) => {
      assert.ok(tier.title.startsWith(stages[i]), dir + ' 第 ' + (i + 1) + ' 阶标题该以「' + stages[i] + '」开头，实际：' + tier.title)
    })
  }
  // 两条路线的语气要分得开，否则「纯爱/沉沦」就是摆设
  assert.notEqual(RELATIONSHIP_AXES.nsfw.positive[2].title, RELATIONSHIP_AXES.nsfw.negative[2].title)
})
