/**
 * 六位女主角的「厚」个人线。
 *
 * 和原来那些短篇的区别：
 *   4 场戏 / 3 个选择支 / 3 个结局（好・普通・疏远）。
 *   结局由好感度阈值判决，而不是单个旗标——这样"你一路怎么对她"才有累积感。
 *
 * 每条线都从灯会那晚接上，围绕她自己那件放不下的小事展开：
 *   鲸鱼娘＝只为你留的那盏灯；墨岚＝被撕掉的一页批注；洛可＝一段没人发过的信号；
 *   克洛德＝一封没寄出的信；千翎＝放到水里的一盏灯；霓霓＝一张永远差一点的图。
 */
import type { Chapter, Ending } from './scenario'

interface RouteChoice {
  id: string
  label: string
  tag: string
  /** 选择后她的一句反应（AI 可重演，text 是兜底）。 */
  reactionGoal: string
  reaction: string
  amount: number
}

interface RouteBeat {
  roleId: string
  /** 收束场景要现场生成的 CG 描述。 */
  cgGoal?: string
  /** 个人线章节标题 */
  title: string
  /** 开场旁白 */
  open: string
  /** 第一次她开口 */
  greetGoal: string
  greet: string
  /** 第一场戏的选择 */
  ask1: string
  choices1: RouteChoice[]
  /** 转折旁白 */
  turn: string
  turnGoal: string
  turnLine: string
  /** 第二场戏的选择 */
  ask2: string
  choices2: RouteChoice[]
  /** 第二夜：共处的一场戏 */
  midNarration: string
  midGoal: string
  midLine: string
  midAsk: string
  midChoices: { id: string; label: string; tag: string; goal: string; text: string; amount: number }[]

  /** 收束旁白 */
  close: string
  closeGoal: string
  closeLine: string
  /** 最后一个选择：正面回应 / 退一步 */
  final: string
  /** 她的回应（依赖好感度条件） */
  warmLineGoal: string
  warmLine: string
  plainLineGoal: string
  plainLine: string
  endings: { warm: string; warmHint: string; plain: string; plainHint: string; lonely: string; lonelyHint: string }
}

const ROUTES: RouteBeat[] = [
  {
    roleId: 'deepseek',
    midNarration: "你们把剩下的灯纸摊在地板上。她跪坐着折，你负责裁，谁都没提晚饭。",
    midGoal: "两个人一起准备灯会，她说着手上的活，语气比平时松。一两句。",
    midLine: "「纸边要对齐，不然点起来会歪。……你看，这样。」",
    midAsk: "她把折好的一盏推到你面前。",
    midChoices: [{"id":"mid-try","label":"让我自己折一盏","tag":"上手","amount":3,"goal":"对方要自己折，她凑近看着，忍不住伸手纠正。一两句。","text":"「这里要压下去——不是那样，我帮你。」"},{"id":"mid-watch","label":"我就看着你折","tag":"安静","amount":1,"goal":"对方说就看着她折，她手上不停，耳根有点红。一两句。","text":"「一直看？……那你至少帮我递纸。」"}],

    cgGoal: "the whale maid standing under a warm paper lantern in the atelier at night, holding the lantern, looking at the viewer with a hopeful shy smile, candles and shelves behind her",
    title: '个人线 · 只为你留的那盏灯',
    open: '灯会散场，工坊里只剩你和看板娘。她把最后一盏没挂的灯抱在怀里，没有点亮。',
    greetGoal: '灯会结束后只剩两个人，她说这盏灯她本来不打算挂出去，语气轻但认真。一两句。',
    greet: '「这盏我本来不挂的。……但今晚剩下来了，就有点舍不得收回去。」',
    ask1: '她把灯递到你面前。',
    choices1: [
      {
        id: 'light-it', label: '那就点上吧', tag: '纵容', amount: 3,
        reactionGoal: '对方让你把灯点上，她愣了一下然后松下来，承认自己想点。一两句。',
        reaction: '「……你也这么想啊。那我点了。」',
      },
      {
        id: 'keep-it', label: '留着，明天再点', tag: '体贴', amount: 1,
        reactionGoal: '对方说留着明天点，她觉得被照顾到了，安静地高兴。一两句。',
        reaction: '「明天。……嗯，那明天我等你来再点。」',
      },
    ],
    turn: '灯点上之后她忽然说起第一天的事：你进门时她把杯子摆反了，一直没好意思讲。',
    turnGoal: '她坦白第一天的一个小失误，有点不好意思但觉得现在可以说。一两句。',
    turnLine: '「第一天我把杯子都摆反了。你没说，我也没敢提——今天说出来好像就没什么了。」',
    ask2: '她说完，等着你的反应。',
    choices2: [
      {
        id: 'tease', label: '我早看见了', tag: '逗她', amount: 3,
        reactionGoal: '被拆穿了自己也没发现的事，她又羞又笑，反而更放松。一两句。',
        reaction: '「你、你早看见了？那你还装作不知道——你这人真是。」',
      },
      {
        id: 'reassure', label: '第一次都会这样', tag: '安抚', amount: 1,
        reactionGoal: '被宽慰，她小声说那下次不会再错了，语气认真。一两句。',
        reaction: '「那下次不会了。……我是说，你还来的话。」',
      },
    ],
    close: '灯在两人之间亮着，她一直没关店。',
    closeGoal: '夜很深了，她没有关店的意思，把话说得很轻，等他接。一两句。',
    closeLine: '「打烊的钟早过了。……我今晚不想关这盏灯。」',
    final: '灯还亮着。',
    warmLineGoal: '对方留下了，她松了口气，说这盏灯以后就归他管，语气幸福但嘴硬。一两句。',
    warmLine: '「那这盏灯就归你管了。……不许让它灭。」',
    plainLineGoal: '对方说明天还要早起，她笑着说也是，把灯留着，有点落寞。一两句。',
    plainLine: '「也是。那你早点睡——灯我给你留着。」',
    endings: {
      warm: '结局 · 只为你留的灯', warmHint: '灯会那晚你没有走，灯一直亮到早上。',
      plain: '结局 · 明天再点', plainHint: '你们约了明天，但都清楚明天会不太一样。',
      lonely: '结局 · 熄了的灯', lonelyHint: '那盏灯最后还是收了起来。',
    },
  },
  {
    roleId: 'glm',
    midNarration: "她把那张撕下来的纸压在灯下，纸边卷起来，谁都没去按平。",
    midGoal: "她说起自己为什么留着这一页，语气比之前坦白一些。一两句。",
    midLine: "「我一直以为留着它是在替别人记事。今晚才发现，是我不想忘。」",
    midAsk: "灯芯爆了一下。",
    midChoices: [{"id":"mid-name","label":"那你也该写一句","tag":"催她","amount":3,"goal":"对方让她自己也写一句，她握笔很久，最后真的写了。一两句。","text":"「写什么……好。就写今晚有个人陪我读到这里。」"},{"id":"mid-hold","label":"先别急着写","tag":"等她","amount":1,"goal":"对方说不急，她放下笔，反而说了些没写下来的话。一两句。","text":"「那就先欠着。……欠着的话，好像还会再见一次。」"}],

    cgGoal: "the archivist girl sitting at a lamp-lit desk with an old book open, slipping a loose page into the flyleaf, warm amber light, dust motes, quiet night",
    title: '个人线 · 被撕掉的那一页',
    open: '典藏室的灯只开了一半。墨岚坐在抄本前，桌角压着一张被撕下来的纸。',
    greetGoal: '被撞见她在看一张撕下来的纸，她先解释这是批注，语气里有一点藏不住。一两句。',
    greet: '「这不是正文。是一页批注——原作者写的，被后人撕掉了。」',
    ask1: '她没有把那张纸递过来。',
    choices1: [
      {
        id: 'ask-read', label: '写了什么', tag: '追问', amount: 3,
        reactionGoal: '对方追问内容，她犹豫一下还是念了一句，念完自己先沉默。一两句。',
        reaction: '「他写：这本书我看过三遍，第三遍是和一个不该忘的人一起。」',
      },
      {
        id: 'ask-why', label: '为什么被撕', tag: '在意', amount: 1,
        reactionGoal: '对方问为什么被撕，她解释是因为有人不想让别人看到，语气很平静。一两句。',
        reaction: '「因为有人不希望别人知道他也动过心。撕书的人，比写批注的人更在意。」',
      },
    ],
    turn: '她把纸翻过来。背面有一行更小的字，是另一个人的笔迹。',
    turnGoal: '她发现背面还有一行不同笔迹的字，念出来的时候声音变了。一两句。',
    turnLine: '「背面有字，不是他的笔迹。……写的是"那天我也没忘"。有人回答过他。」',
    ask2: '她抬头看你。',
    choices2: [
      {
        id: 'say-you', label: '那你呢', tag: '直接', amount: 3,
        reactionGoal: '被反问自己有没有想回答的人，她第一次没有用书当挡箭牌。一两句。',
        reaction: '「我……一直在替别人整理这类话，自己一句都没写过。」',
      },
      {
        id: 'stay-quiet', label: '先别说话', tag: '安静', amount: 1,
        reactionGoal: '对方让她先别说，她觉得被理解，安静地坐了一会儿。一两句。',
        reaction: '「……好。这样坐着，好像也不需要马上说什么。」',
      },
    ],
    close: '她把那一页夹回书里，没有放回原处，而是夹在了扉页。',
    closeGoal: '她把那页夹进扉页而不是原位，说这样后面的人更容易看到。一两句。',
    closeLine: '「夹在这里，下一个人翻开就能看见。……我不想再让它被撕一次。」',
    final: '书合上了。',
    warmLineGoal: '对方说要陪她把这本书抄完，她把笔递过去，难得笑得没有戒心。一两句。',
    warmLine: '「那你抄后半本。手会酸，但我不换人。」',
    plainLineGoal: '对方说明天再来，她点头，客气但已经不那么客气。一两句。',
    plainLine: '「好。明天我给你留一盏小灯，别摸黑进来。」',
    endings: {
      warm: '结局 · 夹在扉页里的那一页', warmHint: '你们把那本书抄完了，扉页多了一行新字。',
      plain: '结局 · 留一盏小灯', plainHint: '她留了灯，但那句话你们都没再提。',
      lonely: '结局 · 又一页撕痕', lonelyHint: '那页纸最后还是不在书里。',
    },
  },
  {
    roleId: 'grok',
    midNarration: "信号台的风把记录纸吹起来。她压住纸，另一只手还搭在旋钮上。",
    midGoal: "一夜没睡，她难得说了句不逞强的话，语气疲惫但近。一两句。",
    midLine: "「你要是不来，我大概会一直听到天亮。……然后跟自己说这是工作。」",
    midAsk: "她把耳机摘下来，递向你。",
    midChoices: [{"id":"mid-listen","label":"我也听一会儿","tag":"陪她","amount":3,"goal":"对方戴上耳机陪她听，她把自己的外套递过去。一两句。","text":"「冷吧。……披上，别客气，我不常借人东西。」"},{"id":"mid-rest","label":"眯一会儿吧，我盯着","tag":"照顾","amount":1,"goal":"对方让她睡一会儿，她嘴上说不困，还是靠在了椅背上。一两句。","text":"「就十分钟。……到点叫我，真的。」"}],

    cgGoal: "the signal operator girl taking off her headphones on a small tower platform before dawn, antennas and dials behind her, deep blue sky turning pale, tired but softly smiling",
    title: '个人线 · 没人发过的信号',
    open: '信号台的灯是暗的。洛可把耳机摘下来挂在脖子上，天线还对着海的方向。',
    greetGoal: '她说自己收到一段不该存在的信号，嘴上逞强但心里在意。一两句。',
    greet: '「凌晨三点有一段信号。没有发信人，也没有收信人。……你说这是不是有人在乱按。」',
    ask1: '耳机还挂在她脖子上。',
    choices1: [
      {
        id: 'listen', label: '让我听听', tag: '一起', amount: 3,
        reactionGoal: '对方要一起听，她嘴上说吵但把另一半耳机递过去。一两句。',
        reaction: '「吵得很。……喏，这边，别扯着线。」',
      },
      {
        id: 'trust', label: '你听出来是什么了吗', tag: '信她', amount: 1,
        reactionGoal: '被问听出来是什么，她说不是人声，像有人一直在等回话。一两句。',
        reaction: '「不是人声。像有人在一直问"在吗"，问了很久。」',
      },
    ],
    turn: '你们一起听的时候，信号停了。三秒后，又响了一次，比刚才短。',
    turnGoal: '信号停了又响，变短了，她说这是对方在回应你们。一两句。',
    turnLine: '「它停了三秒才回。……它听得见我们。」',
    ask2: '她看着你，耳机线还连在你们之间。',
    choices2: [
      {
        id: 'answer', label: '那我们回一句', tag: '回应', amount: 3,
        reactionGoal: '对方说要回一句，她又兴奋又紧张，问回什么。一两句。',
        reaction: '「回什么？……别乱说啊，这东西真有人听。」',
      },
      {
        id: 'wait', label: '先别回，听着', tag: '克制', amount: 1,
        reactionGoal: '对方说先听，她安静下来，第一次不提意见。一两句。',
        reaction: '「……行。听你的。」',
      },
    ],
    close: '天亮前信号彻底安静了。她摘耳机的时候手有点抖。',
    closeGoal: '信号消失后她说这段信号可能是冲她来的，语气难得不逞强。一两句。',
    closeLine: '「我在这个台子待了三年，第一次觉得有人在找我。」',
    final: '天要亮了。',
    warmLineGoal: '对方说以后每天陪她守这一段，她别过脸但答应了。一两句。',
    warmLine: '「……说好了。凌晨三点，别让我一个人听。」',
    plainLineGoal: '对方说该睡了，她笑骂一句把耳机收起来。一两句。',
    plainLine: '「滚去睡。……明天别迟到。」',
    endings: {
      warm: '结局 · 凌晨三点的回话', warmHint: '你每晚都在信号台，那段信号再没断过。',
      plain: '结局 · 信号静默', plainHint: '那段信号后来再没出现过。',
      lonely: '结局 · 空频道', lonelyHint: '耳机挂在那里，没有人接。',
    },
  },
  {
    roleId: 'claude',
    midNarration: "蜡烛只剩半指。她把信纸换成一张新的，重新蘸墨。",
    midGoal: "她开始写一封新的信，边写边说这次不写\"等你回来\"了。一两句。",
    midLine: "「这次我写\"这里还亮着灯\"。他回不回来都听得见。」",
    midAsk: "笔停在落款处。",
    midChoices: [{"id":"mid-sign","label":"落款写你的名字","tag":"署名","amount":3,"goal":"对方让她署自己的名，她写下，说这是第一次署得下去。一两句。","text":"「以前我都写\"工坊\"。今晚……我写我自己的名字。」"},{"id":"mid-joint","label":"两个人一起署","tag":"一起","amount":1,"goal":"对方提议一起署，她把笔递过去，位置让出来。一两句。","text":"「你签在下面。……我不改。」"}],

    cgGoal: "the scribe girl at a desk with a candle burnt down to a finger, holding an unfinished letter, calm quiet expression, warm candlelight, dark room",
    title: '个人线 · 没寄出的那封信',
    open: '文书房的蜡烛快烧完了。克洛德在信封上写了地址，又用指甲把它刮掉。',
    greetGoal: '被看见在写信又刮掉地址，她解释这是草稿，语气平静但有点不自然。一两句。',
    greet: '「这封不用寄。……我只是想看看，写下来会是什么样子。」',
    ask1: '信封上是刮花的名字。',
    choices1: [
      {
        id: 'ask-who', label: '写给谁的', tag: '直问', amount: 3,
        reactionGoal: '被问写给谁，她沉默一下才说是一个走了的人，语气克制。一两句。',
        reaction: '「一个把工坊留给我、自己走了的人。他走之前说，会写信回来。」',
      },
      {
        id: 'ask-why', label: '为什么不寄', tag: '体贴', amount: 1,
        reactionGoal: '被问为什么不寄，她说了个很实在的理由，没有煽情。一两句。',
        reaction: '「因为我不知道他现在住哪。写不出地址的信，寄出去只会退回来。」',
      },
    ],
    turn: '她把信纸翻过来，背面是她自己的笔迹，写了三遍同一句话又都划掉了。',
    turnGoal: '她承认背面那句话写了三遍都划掉，念出最后留下的版本。一两句。',
    turnLine: '「背面我写了三遍。前两遍都太像在怪他。第三遍我只写：这里还亮着灯。」',
    ask2: '信纸在她手里。',
    choices2: [
      {
        id: 'keep-file', label: '留着，当档案', tag: '郑重', amount: 3,
        reactionGoal: '对方说要把它当档案留着，她意外又受用，说那得按规矩编号。一两句。',
        reaction: '「档案要编号的。……那你来编，我信你的字。」',
      },
      {
        id: 'burn-it', label: '烧了吧', tag: '决断', amount: 1,
        reactionGoal: '对方说烧掉，她犹豫但点了头，说那就烧，语气里有放下。一两句。',
        reaction: '「烧了也好。留在抽屉里，它每年都要问我一次。」',
      },
    ],
    close: '蜡烛只剩一指高。她把信按在桌上，等你说话。',
    closeGoal: '灯快灭了，她说这一页想留给还没写的人，抬眼看他。一两句。',
    closeLine: '「这封寄不出去了。但纸还有——你想让我写给谁，我就写。」',
    final: '烛火晃了一下。',
    warmLineGoal: '对方说写给我，她认真地问要怎么称呼，声音比平时轻。一两句。',
    warmLine: '「那……我该怎么称呼你？我不想在开头就写错。」',
    plainLineGoal: '对方说改天再说，她点头，把纸收好，客气里有一点失落。一两句。',
    plainLine: '「改天。……纸我留着，你要的时候说一声。」',
    endings: {
      warm: '结局 · 有了收信人的信', warmHint: '那封信最后寄出去了，地址就在工坊二楼。',
      plain: '结局 · 空白的信封', plainHint: '信封一直空着，她每年换一次新的。',
      lonely: '结局 · 退回的信', lonelyHint: '信被退回，压在抽屉最底下。',
    },
  },
  {
    roleId: 'qwen',
    midNarration: "第二盏灯糊了一半，两人蹲在岸边修补。湖水凉，她把外套垫在地上。",
    midGoal: "一起修灯时她说，其实每年放的灯都没写过字。一两句。",
    midLine: "「灯上从来不写字。写了也看不见，水会泡掉。」",
    midAsk: "她递给你一支笔。",
    midChoices: [{"id":"mid-write","label":"那就写一句","tag":"写","amount":3,"goal":"对方真的写了，她凑过来看，看完没说话但笑了。一两句。","text":"「你写这么直白……泡掉了也是我看见了。」"},{"id":"mid-keepword","label":"不写，说给我听","tag":"说","amount":1,"goal":"对方说不写、说出来，她低声讲了一句，很快又改口。一两句。","text":"「说给你听啊……那，明年还想跟你来。就这一句。」"}],

    cgGoal: "the lake girl crouching at the water edge at night, releasing a paper lantern onto the dark lake, reeds and distant lights, its glow on the water",
    title: '个人线 · 放到水里的那盏灯',
    open: '湖边的风把灯纸吹得哗哗响。千翎蹲在水边，手里那只灯还没点。',
    greetGoal: '她说这盏灯是要放到水里给一个人的，语气安静，不肯说清是谁。一两句。',
    greet: '「这盏要放到水里。放给谁我不说——你要听，就先别笑我。」',
    ask1: '水面上漂着别人放的灯。',
    choices1: [
      {
        id: 'ask-water', label: '水会把它带到哪', tag: '顺她', amount: 3,
        reactionGoal: '被问水会带到哪，她认真地讲湖水的流向，像在讲一件很重要的事。一两句。',
        reaction: '「往东，绕着岸走一圈，天亮之前会到闸口。……他就住在那底下。」',
      },
      {
        id: 'ask-light', label: '先点上吧', tag: '动手', amount: 1,
        reactionGoal: '对方让她先点上，她说还差一点——要有个人陪她一起放。一两句。',
        reaction: '「点了就得放。……一个人放，灯会晃。」',
      },
    ],
    turn: '她把灯放进水里，风一来，灯被推回岸边，撞在石头上。',
    turnGoal: '灯被风吹回来撞在石头上，她把灯捞起来，很轻地说没事。一两句。',
    turnLine: '「撞一下就撞一下。灯是纸的，本来就撑不了多久。」',
    ask2: '灯还在她手里，湿了一角。',
    choices2: [
      {
        id: 'fix-light', label: '我帮你修好', tag: '一起', amount: 3,
        reactionGoal: '对方要帮她修灯，她递过来，说明明是纸做的还这么上心。一两句。',
        reaction: '「你会修纸？……那给你。别弄疼它。」',
      },
      {
        id: 'let-go', label: '让它再漂一次', tag: '放手', amount: 1,
        reactionGoal: '对方说再放一次，她点头，说这次要看着它走远。一两句。',
        reaction: '「再放一次。这回我要看着它到闸口。」',
      },
    ],
    close: '灯第二次下水，慢慢往东去了。她一直蹲着没起身。',
    closeGoal: '灯飘远后她说自己每年都来放，但从来没跟人一起放过。一两句。',
    closeLine: '「我放了好几年了。第一次有人陪我蹲在这儿。」',
    final: '风小了些。',
    warmLineGoal: '对方说明年还陪她来，她低头笑，说那明年要放两盏。一两句。',
    warmLine: '「那明年放两盏。……一盏他的，一盏我们的。」',
    plainLineGoal: '对方说风大回去，她起身拍了拍裙子，说也是。一两句。',
    plainLine: '「也是，蹲久了腿麻。……谢谢你陪我这一会儿。」',
    endings: {
      warm: '结局 · 第二年湖上的两盏灯', warmHint: '第二年你们真的放了两盏，一起看着它们到闸口。',
      plain: '结局 · 一年一盏', plainHint: '你还是路过湖边，但没停下来。',
      lonely: '结局 · 沉进水里的纸', lonelyHint: '灯没撑到闸口就沉了。',
    },
  },
  {
    roleId: 'comfyui',
    midNarration: "屏幕的光把她的脸照得很白。桌子底下堆着十七张打样的纸。",
    midGoal: "她翻出第一张，问你觉得它哪里不像。一两句。",
    midLine: "「别管构图。你就看这盏灯——它像是在等人，还是在等不来？」",
    midAsk: "她把那张纸递给你。",
    midChoices: [{"id":"mid-waiting","label":"在等人","tag":"看见","amount":3,"goal":"对方说\"在等人\"，她一下子安静下来，然后点头。一两句。","text":"「……对。我要的就是这个。有人会来。我一直在画\"会来\"。」"},{"id":"mid-alone","label":"像是在等不来","tag":"诚实","amount":1,"goal":"对方说\"等不来\"，她愣了一下，说也许这才是她一直在躲的。一两句。","text":"「等不来。……可能我画了十八遍，就是在躲这个。」"}],

    cgGoal: "the generator girl asleep on her desk at dawn, screen glow on her face, prints of the same picture scattered around, head resting on her arms",
    title: '个人线 · 永远差一点的那张图',
    open: '生成工坊的屏幕上并排着十七张图。霓霓盯着第十七张，指节敲着桌沿。',
    greetGoal: '她说十七张都差一点，说得很急，其实是想让人看看她到底在追什么。一两句。',
    greet: '「你看这张——手是好的，光也是好的，可就是差一点。我说不上来差在哪。」',
    ask1: '第十七张和第一张几乎一样。',
    choices1: [
      {
        id: 'ask-diff', label: '你想要的到底是哪一点', tag: '追问', amount: 3,
        reactionGoal: '被追问到底要什么，她第一次说清楚——不是好看，是"像真的有人在那里"。一两句。',
        reaction: '「我要的不是好看。是让人看一眼就觉得，屋里真的有人在等他。」',
      },
      {
        id: 'ask-first', label: '第一张哪里不行', tag: '回溯', amount: 1,
        reactionGoal: '被问第一张哪里不行，她愣了一下，说第一张其实最接近。一两句。',
        reaction: '「第一张……其实是第一张最接近。后面十七张是我在躲它。」',
      },
    ],
    turn: '她把第一张调出来放大。画面里没有人，只有一盏灯和一个空着的椅子。',
    turnGoal: '她放大第一张，说这张她一直不敢用，因为太像某天的工坊。一两句。',
    turnLine: '「这张我没敢用。灯的位置、椅子的角度——太像某一天了。」',
    ask2: '屏光照着她的脸。',
    choices2: [
      {
        id: 'use-it', label: '那就用它', tag: '拍板', amount: 3,
        reactionGoal: '对方说就用这张，她犹豫后按下确认，手有点抖但笑了。一两句。',
        reaction: '「用它？……好。就用这张，不改了。」',
      },
      {
        id: 'keep-going', label: '再试一版', tag: '陪她', amount: 1,
        reactionGoal: '对方说再试一版，她立刻来了精神，说那这次要一起定参数。一两句。',
        reaction: '「再一版！那你来定光——我按你的来。」',
      },
    ],
    close: '窗外开始亮了。她趴在桌上，屏幕还亮着。',
    closeGoal: '天亮了她说自己其实一直在做一张没人要的图，语气疲惫但不后悔。一两句。',
    closeLine: '「做了一整年，其实没人要这张图。……但我想让它存在。」',
    final: '屏幕的光很淡。',
    warmLineGoal: '对方说我要，她一下子坐直，问真的吗，眼睛红了。一两句。',
    warmLine: '「你要？……真的？那我印出来，第一张给你。」',
    plainLineGoal: '对方说去睡吧，她哦了一声，把屏幕调暗。一两句。',
    plainLine: '「哦。……那你先回去，我把这一版存了就来。」',
    endings: {
      warm: '结局 · 印出来的第一张', warmHint: '那张图印出来挂在工坊门口，署名两个人。',
      plain: '结局 · 存进文件夹', plainHint: '第十八张也存进了文件夹，和前面十七张一样。',
      lonely: '结局 · 第无数次生成', lonelyHint: '屏幕上永远差一点。',
    },
  },
]

/** 用 beat 造一条完整的个人线章节 + 三个结局。 */
export function buildThickRoute(beat: RouteBeat): { chapter: Chapter; endings: Ending[] } {
  const roleId = beat.roleId
  const p = (id: string) => roleId + '-' + id
  const isSet = (flag: string) => ({ flag, value: true })
  const chapterId = roleId + '-route'

  const reaction = (choice: RouteChoice) => ({
    id: p('r-' + choice.id),
    kind: 'line',
    speaker: roleId,
    ai: true,
    when: isSet(choice.id),
    goal: choice.reactionGoal,
    text: choice.reaction,
  })

  const nodes: any[] = [
    {
      id: p('open'), kind: 'narration', text: beat.open,
      at: { day: 8, label: '灯会 · 夜' },
      // 个人线开场：她从右边一个人走进来。
      stage: { cast: [{ role: roleId, x: 56, scale: 1.02, enter: 'right' }] },
    },
    { id: p('greet'), kind: 'line', speaker: roleId, ai: true, goal: beat.greetGoal, text: beat.greet },
    { id: p('ask1'), kind: 'choice', text: beat.ask1, choices: beat.choices1.map((choice) => ({
      id: choice.id, label: choice.label, tag: choice.tag,
      effects: [{ flag: choice.id, set: true }, { affinity: { role: roleId, amount: choice.amount } }],
    })) },
    ...beat.choices1.map(reaction),
    { id: p('turn'), kind: 'narration', text: beat.turn, fx: 'flash', at: { day: 8, label: '灯会 · 深夜' } },
    { id: p('turn-line'), kind: 'line', speaker: roleId, ai: true, goal: beat.turnGoal, text: beat.turnLine },
    { id: p('ask2'), kind: 'choice', text: beat.ask2, choices: beat.choices2.map((choice) => ({
      id: choice.id, label: choice.label, tag: choice.tag,
      effects: [{ flag: choice.id, set: true }, { affinity: { role: roleId, amount: choice.amount } }],
    })) },
    ...beat.choices2.map(reaction),
    // 第二夜：转折之后、收束之前的一场共处（不然关系升温得太快）。
    { id: p('mid'), kind: 'narration', text: beat.midNarration },
    { id: p('mid-line'), kind: 'line', speaker: roleId, ai: true, goal: beat.midGoal, text: beat.midLine },
    {
      id: p('mid-ask'), kind: 'choice', text: beat.midAsk,
      choices: beat.midChoices.map((choice) => ({
        id: p(choice.id),
        label: choice.label,
        tag: choice.tag,
        effects: [
          { flag: choice.id, set: true },
          { affinity: { role: roleId, amount: choice.amount } },
        ],
      })),
    },
    ...beat.midChoices.map((choice) => ({
      id: p('r-' + choice.id), kind: 'line', speaker: roleId, ai: true,
      when: { flag: choice.id, value: true }, goal: choice.goal, text: choice.text,
    })),
    {
      id: p('close'), kind: 'narration', text: beat.close, fx: 'fade',
      at: { day: 9, label: '次日 · 天亮' },
      cgGoal: beat.cgGoal,
      cgTitle: beat.endings.warm,
    },
    { id: p('close-line'), kind: 'line', speaker: roleId, ai: true, goal: beat.closeGoal, text: beat.closeLine },
    { id: p('final'), kind: 'choice', text: beat.final, choices: [
      {
        id: 'answer-her', label: '留下来，回答她', tag: '靠近',
        effects: [{ flag: 'answered', set: true }, { affinity: { role: roleId, amount: 3 } }],
      },
      {
        id: 'step-back', label: '今晚先这样', tag: '退一步',
        effects: [{ flag: 'steppedBack', set: true }],
      },
    ] },
    {
      id: p('answer-line'), kind: 'line', speaker: roleId, ai: true,
      when: isSet('answered'), goal: beat.warmLineGoal, text: beat.warmLine,
    },
    {
      id: p('back-line'), kind: 'line', speaker: roleId, ai: true,
      when: isSet('steppedBack'), goal: beat.plainLineGoal, text: beat.plainLine,
    },
    { id: p('end'), kind: 'ending' },
  ]

  return {
    chapter: { id: chapterId, title: beat.title, summary: beat.open.slice(0, 40), nodes },
    endings: [
      {
        id: roleId + '-warm', title: beat.endings.warm, hint: beat.endings.warmHint, art: 'cg-' + roleId,
        // 好结局要一路都靠近她：她只出现在共通线的一天（+2），个人线四个选择全选强项（+12）才够。
        when: { chapter: chapterId, affinity: { role: roleId, min: 14 } },
      },
      {
        id: roleId + '-plain', title: beat.endings.plain, hint: beat.endings.plainHint, art: 'cg-' + roleId,
        // 有强有弱、或者最后一刻退开，落在 8~11，收普通结局；全弱只有 5，落到疏远结局。
        when: { chapter: chapterId, affinity: { role: roleId, min: 8 } },
      },
      {
        id: roleId + '-lonely', title: beat.endings.lonely, hint: beat.endings.lonelyHint,
        art: 'cg-' + roleId,
        when: { chapter: chapterId },
      },
    ],
  }
}

export const THICK_ROUTES = ROUTES
export const THICK_ROUTE_IDS = ROUTES.map((row) => row.roleId)
export function thickRouteFor(roleId: string) {
  const beat = ROUTES.find((row) => row.roleId === roleId)
  return beat ? buildThickRoute(beat) : null
}
