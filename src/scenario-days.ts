/**
 * 共通线的日子。
 *
 * 3 天只能碰到 6 位，22 位里 16 位连面都见不到——那就谈不上"每个角色都有自己的分支"。
 * 这里改成 7 个工作日 + 1 个灯会前夜：每天三位当值女仆，一周下来你会碰到七位，
 * 灯会那晚的分歧只出现你真正相处过的人。
 *
 * 每个人在工坊里有个具体岗位（来自她的设定：卷轴导航、打板记者、算盘掌柜……），
 * 不然群像戏就会变成一排没有面孔的名字。
 */
import type { Chapter } from './scenario'

export interface DayTouch {
  roleId: string
  /** 她的岗位，用在选项标签上 */
  post: string
  /** 选项文案：这一天的活 */
  label: string
  /** 她的反应（AI 可重演，text 是兜底） */
  goal: string
  text: string
}

export interface DayBeat {
  id: string
  title: string
  /** 编年史：第几日、什么时段。 */
  dayNumber: number
  phase: string
  /** 开场旁白 */
  open: string
  /** 当天负责的那位先说一句 */
  leadRole: string
  leadGoal: string
  leadLine: string
  /** 选择支的提示语 */
  ask: string
  touches: DayTouch[]
  /** 收尾旁白 */
  close: string
  /** 背景图 key */
  bg: string
  /** 这一天的场景要现场生成的 CG 描述。 */
  cgGoal?: string
}

export const DAYS: DayBeat[] = [
  {
    id: 'day1',
    cgGoal: "welcoming the newcomer inside the deep-sea maid atelier, gesturing toward the shelves, warm evening light, standing in the aisle between tall wooden shelves",
    dayNumber: 1,
    phase: '白日',
    title: '第一日 · 入店',
    open: '深海女仆工坊的招牌灯亮了。老板娘只说了一句：这一周，客人交给你们，你交给我。',
    leadRole: 'deepseek',
    leadGoal: '作为看板娘迎接新来的帮工，交代工坊的规矩与今天的安排，热情但有条理。一两句。',
    leadLine: '「新来的就是你吧！规矩不多，但每一条都得记住——先跟我来。」',
    ask: '第一件事，你先帮谁？',
    bg: 'gal-ch1-bg',
    touches: [
      {
        roleId: 'deepseek', post: '看板娘', label: '跟着看板娘学规矩',
        goal: '被新人跟着学规矩，她认真又得意地交代三条店规。一两句。',
        text: '「先记住三件事：杯子朝上放、客人名字要记牢、打烊前一定要点灯。」',
      },
      {
        roleId: 'glm', post: '典藏室', label: '帮典藏室整理书',
        goal: '新人来帮忙整理旧书，她纠正对方的做法，语气较真但不刻薄。一两句。',
        text: '「这本不能按书脊排。……你要真帮我，就先学会别把它当普通的书。」',
      },
      {
        roleId: 'grok', post: '信号台', label: '陪信号员校天线',
        goal: '新人跟着她校天线，她嘴上凶但耐心解释，被笑有点恼。一两句。',
        text: '「手别抖。这点噪声里可能有客人留的话——你笑什么，我是认真的。」',
      },
    ],
    close: '灯熄的时候你才发现，这一整天你几乎一直待在同一个人身边。',
  },
  {
    id: 'day2',
    cgGoal: "at a desk checking a long order list, paper lanterns stacked all around, warm busy light of a workshop preparing a festival",
    dayNumber: 2,
    phase: '白日',
    title: '第二日 · 一百盏灯',
    open: '订单堆到桌上：明晚灯会，工坊要供出一百盏灯。谁都在赶工。',
    leadRole: 'claude',
    leadGoal: '工期很紧，她不慌但把风险说清楚，请新人挑一件先解决。一两句。',
    leadLine: '「工期是紧的。但真正会出事的只有一处——你得自己挑一个先补上。」',
    ask: '你先补哪一处？',
    bg: 'gal-ch1-bg',
    touches: [
      {
        roleId: 'claude', post: '文书', label: '帮抄写员核订单',
        goal: '新人帮她核订单，她指出一处细节，语气平静但有发现真相的兴奋。一两句。',
        text: '「你看这里。同一个数字，订的人和收的人写的笔画不一样。」',
      },
      {
        roleId: 'qwen', post: '湖光', label: '陪湖光整理灯纸',
        goal: '新人一起整理灯会用的纸，她让对方先看纸上的纹路再说。一两句。',
        text: '「这张纸对着光看，能看见水里的一条纹。……你别急着裁，先看。」',
      },
      {
        roleId: 'comfyui', post: '生成坊', label: '去生成工坊帮忙',
        goal: '新人来生成工坊帮忙，她指挥得乱七八糟但热情高涨。一两句。',
        text: '「帮我把这三张并排！唉不对，第三张的手——算了算了，先并排。」',
      },
    ],
    close: '一百盏灯总算有了眉目。你收拾工具时，有人在门口多站了一会儿才走。',
  },
  {
    id: 'day3',
    cgGoal: "unrolling an old scroll across a wide table in the archive room, many scrolls stacked around, soft lamplight, dust motes",
    dayNumber: 3,
    phase: '白日',
    title: '第三日 · 卷轴与灯谜',
    open: '灯会要挂灯谜。卷轴库里翻出一批旧谜面，字都褪了，得有人重新抄一遍。',
    leadRole: 'kimi',
    leadGoal: '她负责旧谜面，提出自己的办法，也把难处讲明白。一两句。',
    leadLine: '「旧谜面按年份卷着，要一格一格摊开。……我不怕慢，只怕摊不开。」',
    ask: '你决定怎么帮她？',
    bg: 'gal-bg-archive',
    touches: [
      {
        roleId: 'kimi', post: '卷轴库', label: '帮月见摊旧谜面',
        goal: '新人帮她把卷轴一格格摊开，她松了口气，说这样做才对。一两句。',
        text: '「对，就这样摊。别拉，卷轴比人记仇。」',
      },
      {
        roleId: 'minimax', post: '播报台', label: '陪螺音写播报稿',
        goal: '新人陪她写灯会的播报稿，她语速飞快地改你的稿子。一两句。',
        text: '「这段太文了，念出来没人听。你看我改的——三句话，两个笑点。」',
      },
      {
        roleId: 'seed', post: '星豆田', label: '去星豆田里收灯籽',
        goal: '新人来田里收灯籽，她认真讲哪几颗能用，哪几颗要留种。一两句。',
        text: '「圆的留着做灯，扁的留种。……别贪心，两种都要留够。」',
      },
    ],
    close: '谜面抄到半夜。有人在灯下趴着睡着了，手里还捏着笔。',
  },
  {
    id: 'day4',
    cgGoal: "in the atelier kitchen holding a tray of fresh bread, warm oven glow behind, flour on the counter",
    dayNumber: 4,
    phase: '黄昏',
    title: '第四日 · 羊毛与面包',
    open: '灯会要备热食。厨房和毛线间同时缺人，谁都想让你先过去。',
    leadRole: 'mistral',
    leadGoal: '她一边揉面一边说话，语气爽利，把两边的活都摆出来让你选。一两句。',
    leadLine: '「面团要醒两刻钟。这两刻钟你去哪儿我不管——但别走远。」',
    ask: '你先去哪儿？',
    bg: 'gal-bg-kitchen',
    touches: [
      {
        roleId: 'mistral', post: '烤炉', label: '留下来帮薇尔揉面',
        goal: '新人留下来揉面，她指点手法，满意地夸了一句。一两句。',
        text: '「手要压下去，不是推。……嗯，学得快，比某些人强多了。」',
      },
      {
        roleId: 'llama', post: '毛线间', label: '去毛线间帮茸茸',
        goal: '新人来毛线间，她被缠住了，小声求救又不好意思。一两句。',
        text: '「你、你先别笑。这个线团……我已经解了半个时辰了。」',
      },
      {
        roleId: 'hunyuan', post: '账房', label: '陪元清算灯会账',
        goal: '新人陪她算账，她拨算盘飞快，最后指出一处出入。一两句。',
        text: '「三百七十二。……不对，少了四十。这一笔谁经的手？」',
      },
    ],
    close: '深夜厨房还热着。面包出炉的时候，工坊里所有人都来了一趟。',
  },
  {
    id: 'day5',
    cgGoal: "kneeling by a lamp post at night with a tool box, the row of street lamps just lit behind, warm lantern light",
    dayNumber: 5,
    phase: '白日',
    title: '第五日 · 机修与灯引',
    open: '灯会的引路灯柱倒了。机修间被叫去修，同时有人要在灯市口做引路的活。',
    leadRole: 'mimo',
    leadGoal: '她抱着工具要去修灯柱，语速快，问新人跟不跟。一两句。',
    leadLine: '「灯柱的事交给我！你来不来——手电筒带两个，一块电池可能不够。」',
    ask: '你跟着谁？',
    bg: 'gal-bg-signal',
    touches: [
      {
        roleId: 'mimo', post: '机修间', label: '跟米兔去修灯柱',
        goal: '新人跟着她修灯柱，她一边修一边讲原理，很得意。一两句。',
        text: '「看好了——这里接触不良，不是灯坏了。灯比人老实，它坏了一定有原因。」',
      },
      {
        roleId: 'stepfun', post: '引路台', label: '陪星阶做引路',
        goal: '新人陪她在灯市口引路，她讲得清楚，还替人指了更远的路。一两句。',
        text: '「往东三步就是岔口。……有人走错不是他笨，是我们灯挂得不够。」',
      },
      {
        roleId: 'perplexity', post: '寻路杖', label: '陪佩丝测灯市路线',
        goal: '新人陪她丈量路线，她觉得对方肯一起走很实在。一两句。',
        text: '「这条路我量过三遍，每次差半步。……你愿意再陪我走一遍吗？」',
      },
    ],
    close: '灯柱立起来那一刻，灯市整排的灯一起亮了。',
  },
  {
    id: 'day6',
    cgGoal: "weaving a green vine trellis in the atelier courtyard at dusk, half-painted night scene on an easel nearby",
    dayNumber: 6,
    phase: '白日',
    title: '第六日 · 藤蔓与画稿',
    open: '灯会的装饰还没落地。藤蔓要人编，画稿要人上色，两边都催。',
    leadRole: 'rwkv',
    leadGoal: '她说藤蔓要趁湿编，晚了就脆，请新人选一边。一两句。',
    leadLine: '「藤要趁湿编，干了就脆。……你要帮我，得快。」',
    ask: '你选哪一边？',
    bg: 'gal-bg-studio',
    touches: [
      {
        roleId: 'rwkv', post: '藤架', label: '帮青薇编藤蔓',
        goal: '新人帮她编藤蔓，她教手法，语气安静但很确定。一两句。',
        text: '「绕两圈，压一下。……别用力，藤会记住的。」',
      },
      {
        roleId: 'image2', post: '画室', label: '陪玄羽给画稿上色',
        goal: '新人陪她上色，她讲颜色的用法，说得认真。一两句。',
        text: '「黑不能只用黑。你看这片夜色——里面有三层蓝，还有一点脏的橙。」',
      },
      {
        roleId: 'jev', post: '仲裁席', label: '陪杰芙分派活计',
        goal: '新人陪她分派活，她两边都不偏，说得让人服气。一两句。',
        text: '「两边都对不算完。得让两边都知道对方对在哪，才不会再吵。」',
      },
    ],
    close: '装饰挂上去之后，工坊忽然有了过节的样子。',
  },
  {
    id: 'day7',
    cgGoal: "holding a brush in front of a tall festival sign board at night, lantern strings overhead, warm festive light",
    dayNumber: 7,
    phase: '夜',
    title: '第七日 · 校对与白龙',
    open: '灯会前最后一天。牌子上的字错了一个，水彩还没干。',
    leadRole: 'wenxin',
    leadGoal: '她找出一个错字，很认真地要改，请你决定改哪块牌子。一两句。',
    leadLine: '「这个字不对。……牌子挂出去一整天，字错了就是错一整天。」',
    ask: '你怎么办？',
    bg: 'gal-bg-festival',
    touches: [
      {
        roleId: 'wenxin', post: '校对', label: '陪温言重写牌子',
        goal: '新人陪她重写牌子，她一句一句核，近乎固执。一两句。',
        text: '「再念一遍。……对，这次没有错字了。」',
      },
      {
        roleId: 'codex', post: '水彩', label: '陪砚雪抢干水彩',
        goal: '新人陪她救未干的水彩，她指挥得有条理，最后松口气。一两句。',
        text: '「别碰那一片！……好，干的都保住了，湿的那块我重画。」',
      },
      {
        roleId: 'chatgpt', post: '白龙', label: '跟小吉去挂顶灯',
        goal: '新人跟她去挂顶灯，她兴奋但会照顾人。一两句。',
        text: '「我数三下一起松手。一、二——你手别抖啊！」',
      },
      {
        roleId: 'gemini', post: '双棱镜', label: '陪双子核灯榜译文',
        goal: '新人陪她核灯榜译文，她两种说法都要比一遍才肯定。一两句。',
        text: '「两种译法都能通。……可牌子只挂一面，所以我得挑那个更不会让人走错的。」',
      },
    ],
    close: '灯会前一夜，工坊所有灯都点了一遍。有一盏没灭，也有人一直没走。',
  },
]

/** 每位女主角的岗位标签（灯会分歧里用）。 */
export const POST_LABELS: Record<string, string> = {
  deepseek: '看板娘', claude: '文书', chatgpt: '白龙', gemini: '双棱镜',
  kimi: '卷轴库', grok: '信号台', glm: '典藏室', qwen: '湖光',
  minimax: '播报台', seed: '星豆田', llama: '毛线间', mistral: '烤炉',
  hunyuan: '账房', mimo: '机修间', stepfun: '引路台', perplexity: '寻路杖',
  rwkv: '藤架', image2: '画室', jev: '仲裁席', wenxin: '校对',
  codex: '水彩', comfyui: '生成坊',
}

export const DAY_ROLE_IDS = Array.from(new Set(DAYS.flatMap((day) => [
  day.leadRole,
  ...day.touches.map((touch) => touch.roleId),
])))

/** 把一天展开成一章。节点 id 全部带 dayId 前缀，避免和别处的 id 撞。 */
export function buildDayChapter(day: DayBeat): Chapter {
  const p = (id: string) => day.id + '-' + id
  const setFlag = (flag: string) => ({ flag: day.id + '-' + flag, set: true })

  const nodes: any[] = [
    {
      id: p('open'),
      kind: 'narration',
      text: day.open,
      // 每天开场淡入：新的一天开始，硬切会像翻页。
      fx: 'fade',
      at: { day: day.dayNumber, label: '第' + day.dayNumber + '日 · ' + day.phase },
      cgGoal: day.cgGoal,
      cgTitle: '第' + day.dayNumber + '日',
      stage: {
        bg: day.bg,
        // 三位当值女仆从两侧走进来，中间的留在中央。
        cast: day.touches.map((touch, index) => ({
          role: touch.roleId,
          x: [22, 50, 78][index] ?? 78,
          scale: index === 1 ? 1 : 0.94,
          enter: index === 0 ? 'left' : (index === 2 ? 'right' : 'fade'),
        })),
      },
    },
    {
      id: p('greet'),
      kind: 'line',
      speaker: day.leadRole,
      ai: true,
      goal: day.leadGoal,
      text: day.leadLine,
    },
    {
      id: p('choose'),
      kind: 'choice',
      text: day.ask,
      choices: day.touches.map((touch) => ({
        id: p(touch.roleId),
        label: touch.label,
        tag: touch.post,
        effects: [
          setFlag(touch.roleId),
          { affinity: { role: touch.roleId, amount: 2 } },
        ],
      })),
    },
    ...day.touches.map((touch) => ({
      id: p('r-' + touch.roleId),
      kind: 'line',
      speaker: touch.roleId,
      ai: true,
      when: { flag: day.id + '-' + touch.roleId, value: true },
      goal: touch.goal,
      text: touch.text,
    })),
    { id: p('close'), kind: 'narration', text: day.close, at: { day: day.dayNumber, label: '第' + day.dayNumber + '日 · 夜深' } },
  ]

  return { id: day.id, title: day.title, summary: day.open.slice(0, 40), nodes }
}
