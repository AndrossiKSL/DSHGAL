/**
 * H 场景的写作层：露骨度 + 主动性（「没有灵魂」的解法）。
 *
 * 用户的原话：「描述并不够真实和露骨」「角色扮演不够入戏，只是单纯附和一些
 * 可有可无的对话，没有灵魂」「我都和 AI 娘聊色色了，还色不起来」。
 *
 * 这两种毛病各有具体成因，不是「尺度不够大」一句话能解决的：
 *
 *   ① 不够露骨 —— 模型默认写「气氛」而不是「物理事实」：
 *      用「一阵酥麻」「难以自持」这类抽象词，用「不知过了多久」跳时间，
 *      用「她的身体做出了回应」把主语藏起来。读者拿不到任何可验证的信息。
 *
 *   ② 没有灵魂 —— 模型把角色写成「配合方」：只会说「嗯」「你轻点」「不要嘛」，
 *      永远在回应玩家的动作，从不自己发起。她的性格、嘴硬、习惯在 H 里全丢了，
 *      于是所有人的台词可以互换。
 *
 * 解法是给硬性写作契约：每一拍必须写出具体位置 / 具体反应 / 一句她自己的话，
 * 而且她必须有自己的目的（想要什么、想怎么要），不能只应不动。
 */

export type IntimateRoute = 'pure' | 'fall'

export interface IntimateBrief {
  /** 第几阶（1–6），决定尺度 */
  level: number
  route: IntimateRoute
  /** 在场角色名，用于逐一点名要求主动性 */
  cast: string[]
  /** 是否多人场面 */
  multi?: boolean
}

const CORE = [
  '# 私密场景的写法（这一段优先于其他所有写作规则）',
  '你不是在写氛围，你是在记录发生的事。读者要能从文字里还原出「谁在哪里碰到谁、对方身体怎么反应」。',
  '',
  '## 每一拍必须有这四样（缺一样就是没写好）',
  '1. 具体位置：手/唇落在哪里，衣物到哪一步了，身体是什么姿势。',
  '2. 具体反应：呼吸、体温、肌肉收紧、声音变了、皮肤泛红、手指抓在哪里。写可见可感的，不写「一阵快感」这种结论。',
  '3. 她自己的动作：她主动做了什么——扯、按、靠、迎、躲开后自己又回来。不能只有玩家在动。',
  '4. 她自己的话：用她本人的语气，可以是骂人、可以是命令、可以是嘴硬到底，但必须是她会说的话。',
  '',
  '## 明令禁止的写法',
  '✗ 抽象代替具体：「一阵酥麻」「难以自持」「快感如潮」「身体诚实地回应」——这些词一个信息量都没有。',
  '✗ 跳时间：「不知过了多久」「良久之后」「再后来」。要写过程，不许按快进。',
  '✗ 藏主语：「她的身体做出了回应」「有人轻轻颤抖了一下」——是谁就是谁，写清楚。',
  '✗ 用比喻替掉身体部位：「花心」「蜜壶」「秘处」「那里」这类一律换成直接的词，不要用模糊说法绕开。',
  '✗ 只写气氛收尾：每一拍结尾不要停在「房间里只剩下喘息声」。要在动作进行中收，留下未完成的下一步。',
  '✗ 用「等一下」起句。真要挪开杯子就直接挪，别把动作写成刹车——实测模型最爱写「等一下——杯子硌着我了」。',
  '',
  '## 主动性（这是「没有灵魂」的正解）',
  '在场每个人都要有自己**想要的东西**，并且用动作去要。具体做法：',
  '· 每一拍至少有一个人主动发起，不能全员等玩家动手。',
  '· 她的欲望要带她自己的形状：爱逞强的会一边嘴硬一边把人拽过来；安静的会用动作代替话；急躁的会直接嫌慢。',
  '· 反应不是「配合」，是「有自己的意见」：她可以嫌位置不舒服、可以要求换、可以突然反客为主。',
  '· 她说的话要能看出是谁在说。把这句话换给另一个角色会别扭，那才是对的。',
  '',
  '✗「嗯……」「你轻点……」「不要嘛……」这种所有人都能说的台词，删掉重写。',
  '✗ 通篇只有玩家在推进，她只在回应——这是最典型的失魂。',
].join('\n')

/**
 * 六段 H 进程。这是**事件序列**，不是露骨度刻度。
 *
 * 之前把六阶当「写得有多直白」，而且因为关系分低直接从第 3 阶起——
 * 等于跳过了接吻摸撩直接进性交，节奏全乱。正确的是一段一段走：
 *
 *   亲密 → 前戏 → 性交 → 快速性交 → 高潮 → 高潮后
 *
 * 每一段有它自己的内容清单和收尾条件，走完才进下一段。
 */
export const INTIMATE_STAGES = [
  {
    stage: 1,
    name: '亲密',
    covers: '接吻、抚摸、撩拨、解外层衣物、身体贴合磨蹭',
    spec: '这一段的重点是**接触刚开始**：唇、舌、颈侧、锁骨、耳后、腰侧、腿间磨蹭。可以很直白（舌怎么纠缠、呼吸怎么乱、衣服被推到哪儿），但还没到实质接触。写清第一次碰上去的那一下她怎么反应，以及她怎么回应或反手。',
    done: '衣物乱了、两个人都喘起来、有人主动加深了动作',
  },
  {
    stage: 2,
    name: '前戏',
    covers: '用手和口，以及身体其他部位，含互相抚慰',
    spec: '这一段的重点是**用手和口**：手指进去、口含住的位置与节奏、被弄的人怎么绷紧又松开。写清用了哪个部位、落在哪里、进到多深、节奏快慢怎么变，以及她怎么反过来碰你。不要跳到更后面的事。',
    done: '她被弄到快忍不住、或主动要求更进一步',
  },
  {
    stage: 3,
    name: '性交',
    covers: '进入之后的事，含不同部位与支配关系（束缚、束缚下的命令与服从）',
    spec: '这一段的重点是**进入那一刻**：怎么进去的、角度、第一次进到底时双方的反应。之后写抽送的基本节奏。写具体，不要用「结合」这类模糊词绕开。',
    done: '节奏稳定下来、开始想要更多',
  },
  {
    stage: 4,
    name: '快速性交',
    covers: '加快动作、变更体位',
    spec: '这一段的重点是**节奏和姿势的变化**：加快、加深、换体位（从正面到后面、骑乘、侧入、抬起一条腿、按在墙上）。写清换的动作用身体怎么完成、换完之后哪里不一样。这一段的语速和句子都该变短、变急。',
    done: '有人快到极限',
  },
  {
    stage: 5,
    name: '高潮',
    covers: '到达的那一刻：失控、泄出、失神',
    spec: '这一段的重点是**失控本身**：内部一阵阵抽搐、腿绷直或乱蹬、声音断掉、视线失焦、指甲掐进皮肉、泄出、短暂失神。写身体的实际反应，不要用「到达顶点」一句带过。',
    done: '有人的高潮结束、身体软下来',
  },
  {
    stage: 6,
    name: '高潮后',
    covers: '继续性交、换部位性交、结束性交、多人时换人性交',
    spec: '这一段的重点是**余韵之后立刻发生的那一下**，必须在下面四条里明确选一条写：① 接着做（还在里面，慢慢又动起来）；② 换部位（换到另一个地方继续）；③ 收尾（停下来，写身体怎么松开、体液、呼吸、谁先开口）；④ 多人时换人（另一个接上来，前一个退到旁边还没退干净）。不要含糊带过，要写清是哪一条。',
    done: '这一段可以反复，直到玩家或角色明确结束',
  },
] as const

/** 文案里的进程名 → 序号。 */
export function stageName(stage: number): string {
  return INTIMATE_STAGES[Math.max(0, Math.min(5, stage - 1))].name
}

function stageBlock(level: number, route: string): string {
  const routeLine = route === 'fall'
    ? '这条是沉沦线：她明知不该还是往前走，嘴上会有反话和挑衅，身体的应承比话更快，越是失控越不肯承认。'
    : '这条是纯爱线：靠近是一步步来的，但每一步都真的往前走了，不会原地打转也不会停在气氛里。'

  const index = Math.max(0, Math.min(5, level - 1))
  const current = INTIMATE_STAGES[index]
  const next = INTIMATE_STAGES[index + 1]

  return [
    routeLine,
    '## 本幕处在第 ' + current.stage + ' 段：' + current.name,
    '这一段包含：' + current.covers + '。',
    current.spec,
    '这段写到位了（' + current.done + '）才往下一段走。没到位就继续把这一段写足，不要提前跳到后面的事。',
    next ? '下一段是「' + next.name + '」（' + next.covers + '），这一拍还不该到。' : '这已经是最后一段。',
    '进程只给你判断该写什么，绝对不要在台词或旁白里提到「第几段」「进度」「阶段」这类词。',
  ].join('\n')
}

function castBlock(cast: string[], multi?: boolean): string {
  if (!cast.length) return ''
  const names = cast.join('、')
  if (multi && cast.length >= 3) {
    return [
      '## 多人场面',
      '在场：' + names + '。这不是围观，是全部参与。',
      '· 每一拍要让至少两个人同时在做不同的事，并且互相之间有反应（一个人被碰到的同时另一个人在说什么/做什么）。',
      '· 不要写成排队轮流。让动作互相打断、互相叠加。',
      '· 每个人仍然是她自己：谁更主动、谁更放得开、谁会嘴硬，都要区分得出来。',
      '· 不要出现「旁边的人看着」这种安排；要么参与，要么不在这里。',
    ].join('\n')
  }
  const solo = cast[0]
  return [
    '## 本幕只有 ' + names + '（' + cast.length + ' 人）',
    '整幕只写这' + (cast.length === 1 ? '一个人' : cast.length + ' 个人') + '。旁白里不出现第三个人，不写门外有人、不写隔壁听见。',
    solo ? '每一拍都要有 ' + solo + ' 主动做的动作或主动说的话，而不是只等玩家。' : '',
  ].filter(Boolean).join('\n')
}

/**
 * 这一场走到第几段。
 *
 * 之前写成 `3 + turns/3`——私密第一拍直接从第 3 段（性交）起，跳过了接吻摸撩。
 * 现在从第 1 段起步，靠三样东西推进，取最大值但不许跳段：
 *   · 关系给的底（allowedLevel）
 *   · 这一场已经走的轮数（每 2 轮上一段）
 *   · 玩家这一轮动作本身表明的段位
 * 且只能往前走——上一拍到了第 4 段，这一拍不会退回第 2 段。
 */
export function resolveStage(input: {
  allowedLevel?: number
  sceneTurns?: number
  action?: string
  previous?: number
}): number {
  const allowed = Math.max(1, Math.min(6, Number(input.allowedLevel) || 1))
  const turns = Math.max(0, Math.floor(Number(input.sceneTurns) || 0))
  const byTurns = 1 + Math.floor(turns / 2)
  const byAction = stageFromAction(String(input.action || ''))
  const previous = Math.max(0, Math.floor(Number(input.previous) || 0))
  // 关系资格只能把人往前带一段，不能直接跳到末段。
  // 不设这个上限，好感刷满的存档一进私密场景就是「高潮后」，又变回跳跃推进。
  const floor = Math.min(allowed, byTurns + 1)
  return Math.max(1, Math.min(6, Math.max(floor, byTurns, byAction, previous)))
}

/** 兼容旧调用名。 */
export function intimateLevel(allowedLevel: number, sceneTurns: number, action = '', previous = 0): number {
  return resolveStage({ allowedLevel, sceneTurns, action, previous })
}

/**
 * 从玩家这一轮的原话判断她/他已经走到哪一段。
 * 只用于「往上推」，不会因为一句话就让人退段。
 */
export function stageFromAction(action: string): number {
  const text = String(action || '')
  if (!text) return 0
  // 从高往低判，先命中最深的那一段
  // 注意不能只写「去了」——「我进去了」「她进去了」会被误判成高潮。
  if (/(高潮|潮吹|射精|射了|射进|射在|失神|痉挛|抽搐|绷直|到了顶点|攀上顶点)/u.test(text)) return 5
  if (/(加快|用力|狠狠|猛烈|体位|翻过来|翻身|骑上|骑在|后面|背后|跪着|抬起.{0,3}腿|按在|抵进|猛顶|抽送得快)/u.test(text)) return 4
  // 「探进去」「伸进去」是手，不是性交，必须排除掉，否则一摸就跳到第 3 段。
  if (/(插入|贯穿|顶进|交合|阴道|里面|肛门|后庭|绑|绳子|捆|鞭|项圈|服从|命令)/u.test(text)
      || /(?<!探|伸|摸|放|塞)进去/u.test(text)
      || /进入(?:她|他|身体|里面)/u.test(text)) return 3
  if (/(口交|手交|含住|舔|吮|吸|足交|乳交|胸交|自慰|手指|指节|探进|揉|套弄|扶着.{0,4}往下)/u.test(text)) return 2
  if (/(吻|亲|抱住|搂住|揽过|贴上去|靠进怀里|蹭|摸|撩|解开|脱下|褪|掀起|衣摆|领口)/u.test(text)) return 1
  return 0
}

/** 本幕结束后该进入的段位（给存档累加用）。 */
export function nextStage(stage: number, action: string): number {
  const current = Math.max(1, Math.min(6, Number(stage) || 1))
  // 第 6 段是循环段（继续/换部位/收尾/换人），不再往上走
  if (current >= 6) return 6
  const byAction = stageFromAction(action)
  // 动作已经明确做到更后面了，就承认它
  if (byAction > current) return byAction
  return current
}

export function intimateBrief(brief: IntimateBrief): string {
  return [CORE, stageBlock(brief.level, brief.route), castBlock(brief.cast, brief.multi)]
    .filter(Boolean)
    .join('\n\n')
}

/**
 * 玩家这一句里已经有明确动作时，追加一句「接着往下写」的指令。
 * 没有这一句，模型容易原地重复玩家刚做完的事，读起来就是「没进展」。
 */
export function escalationHint(action: string): string {
  if (!action) return ''
  const hasBody = /(手|唇|吻|舌|指|腰|腿|胸|颈|锁骨|耳|背|臀|体温|湿|热)/u.test(action)
  if (!hasBody) return ''
  return [
    '玩家这一句已经推动了身体上的动作。你的这一拍必须**比它更进一层**：',
    '不要重复他刚做的动作，写它之后发生了什么——她的反应、她的反击、她带向的下一步。',
    '每一拍都要有可测量的推进（衣物更少、距离更近、声音变了、姿势变了），否则读者会觉得卡住了。',
  ].join('\n')
}
