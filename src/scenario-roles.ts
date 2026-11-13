/**
 * 22 个模型角色各一部短篇。
 *
 * 每人只写「几笔台词」，结构（舞台、选择支、旗标、结局判定）由工厂生成——
 * 这样 22 部作品的形状一致（都是真 galgame），腔调又各不相同。
 */
import type { Chapter, Ending, Scenario } from './scenario'
import { THIN_EXTRAS } from './scenario-thin-extras'

interface Beat {
  /** 开场旁白：在哪儿、什么时候、什么气氛。 */
  situation: string
  /** 她的第一句。AI 节点，goal 决定模型怎么演，text 是兜底。 */
  greet: string
  greetGoal: string
  /** 三个方向的选项与她的反应。 */
  options: { tag: string; label: string; flag: string; reaction: string; reactionGoal: string }[]
  /** 转折：一件把气氛推向决定的小事。 */
  turn: string
  turnLine: string
  turnGoal: string
  /** 收尾那一句。 */
  closing: string
  closingGoal: string
  /** 两个结局：靠近与保留。 */
  warmTitle: string
  warmHint: string
  plainTitle: string
  plainHint: string
}

export const BEATS: Record<string, Beat> = {
  deepseek: {
    situation: '深海女仆工坊的招牌灯灭了。玻璃窗外，游鱼把光一点点带走。',
    greet: '「啊……主人还没走呀。要不要陪我坐一会儿？茶刚泡好呢。」',
    greetGoal: '打烊后看到主人还留在店里，有点意外又很高兴地打招呼，邀请他坐下。一两句。',
    options: [
      { tag: '体贴', label: '我帮你一起收拾吧', flag: 'kindness', reaction: '「诶、这些我来就好——……真的吗？那，抹布给你。」', reactionGoal: '主人主动帮忙，她有点慌又很受用，嘴上推辞却把抹布递出去。' },
      { tag: '从容', label: '先坐下喝杯茶', flag: 'calm', reaction: '「那就说定了。今晚这壶是我自己配的，你尝尝看。」', reactionGoal: '主人爽快坐下，她很高兴，坐到他斜对面介绍今晚的茶。' },
      { tag: '好奇', label: '你在看什么书？', flag: 'curious', reaction: '「这本呀……是店里最旧的一本。上面写着比我们这儿更深的地方。」', reactionGoal: '主人问起她手里的书，她把书脊给他看，说这是店里最旧的一本。' },
    ],
    turn: '头顶的灯闪了两下，灭了。整间工坊落进一种很深的蓝。舷窗外，一头鲸正慢慢游过去。',
    turnLine: '「……主人，你、你离得好近。我这样子，是不是有点不像话。」',
    turnGoal: '停电后她下意识靠过来，借着窗外的鲸光看主人的脸，声音变得很轻。一两句。',
    closing: '「打烊啦。……明天，你还会来吗？」',
    closingGoal: '灯重新亮起，收尾这一晚。若之前选了靠近，语气更亲昵；否则温柔但留一点距离。',
    warmTitle: '结局 A · 留灯',
    warmHint: '你越过了那半步。',
    plainTitle: '结局 B · 打烊',
    plainHint: '这一晚你停在原地。',
  },
  claude: {
    situation: '阅览室的最里面一排书架上，只留了一盏台灯。她坐在光边上，笔没动。',
    greet: '「你来了。……我原本想好了一段话，现在忘了。那就先坐吧。」',
    greetGoal: '沉静、克制；想好的话被自己否掉，坦诚承认，然后请对方坐下。一两句。',
    options: [
      { tag: '温和', label: '不急，我等你', flag: 'patience', reaction: '「……谢谢。你这句话，比我想说的那段还准。」', reactionGoal: '对方不催她，她松下来，承认被理解了。语气平静但明显软了。' },
      { tag: '直白', label: '想好的是什么？', flag: 'direct', reaction: '「一句很漂亮的话。漂亮到不像我该说的。……你看，我又在绕了。」', reactionGoal: '被直接问了，她先辩解一句，随即自嘲自己总在绕。' },
      { tag: '玩笑', label: '你也会忘词啊', flag: 'tease', reaction: '「会。而且比你想象得多。只是我通常能把忘词说得像是故意的。」', reactionGoal: '被开玩笑，她坦然承认，还带一点自嘲式的机锋。' },
    ],
    turn: '台灯的光晕边缘，她把笔放下了。那支笔从头到尾没写过字。',
    turnLine: '「我在想，人和人之间最难的不是说清楚，是说完之后还愿意留下。」',
    turnGoal: '放下笔，说出一句经过推敲的话，克制但确实是她想说的。一两句。',
    closing: '「今晚就到这儿。……你走之前，可以不用回答我。」',
    closingGoal: '收束这一夜，给对方留余地，不逼迫也不遮掩。一两句。',
    warmTitle: '结局 A · 未写完的句子',
    warmHint: '你接住了她那句没有说完的话。',
    plainTitle: '结局 B · 台灯熄灭',
    plainHint: '有些话留在了书页之间。',
  },
  chatgpt: {
    situation: '协作工坊的白板上还留着今天的流程图，笔盖没合上。她在擦最后一块。',
    greet: '「你还没走呀！我正想找人复盘一下今天——三分钟，不，两分钟就够了。」',
    greetGoal: '热心、条理清楚，拉住对方做今天的复盘，主动控制篇幅。一两句。',
    options: [
      { tag: '配合', label: '好，你说重点', flag: 'listen', reaction: '「重点就一个：今天最卡的那步，其实是我们没对齐目标。其他都是细节。」', reactionGoal: '对方配合，她立刻给出条理清晰的一句话结论，并把功劳归给团队。' },
      { tag: '打断', label: '今天先别复盘了', flag: 'stop', reaction: '「……好。对，我有时候一激动就停不下来，谢谢你拉住我。」', reactionGoal: '被叫停，她先愣了一下，然后真诚地承认自己有这个毛病。' },
      { tag: '反问', label: '那你自己今天怎么样？', flag: 'care', reaction: '「我？……说实话，我今天有一半时间在担心自己帮倒忙。这个不在流程图里。」', reactionGoal: '被问到她自己，她愣住，然后难得讲了一句不总结、不讲方法论的真心话。' },
    ],
    turn: '她把笔盖合上，又把白板上的最后一条线擦掉。整块板子空得有点突然。',
    turnLine: '「其实我最怕的不是做错，是没人告诉我做错了。所以……谢谢你今天说实话。」',
    turnGoal: '坦白自己在意的不是出错而是没人提醒，语气真诚、罕见地不举例子不讲方法。一两句。',
    closing: '「明天我把目标先对齐再来找你。晚安。」',
    closingGoal: '收束，给出一个具体的下一步，然后道晚安。一两句。',
    warmTitle: '结局 A · 空白的白板',
    warmHint: '你看见了她流程图以外的那部分。',
    plainTitle: '结局 B · 复盘结束',
    plainHint: '今天的结论写得很好，只是没写她。',
  },
  gemini: {
    situation: '双子工作室的两张工作台上，一边摊着草稿，一边摊着被否掉的草稿。',
    greet: '「你来得正好！左边这个我说好，右边这个也我说好。你帮我决定。」',
    greetGoal: '活泼、爱玩，把两版草稿同时推给对方，自己一脸等判决的样子。一两句。',
    options: [
      { tag: '认真', label: '我仔细看看', flag: 'judge', reaction: '「呀，你真看啊。……那我得说清楚，右边那版是我半夜三点画的，不算数。」', reactionGoal: '对方认真比较，她反而心虚，主动交代右边那版是半夜画的不算数。' },
      { tag: '反将', label: '你自己更想留哪个？', flag: 'mirror', reaction: '「……左边。可是我喜欢右边。你看，我这人就是这么麻烦。」', reactionGoal: '被反问，她承认自己喜欢的那版和被认可的那版不是同一个，自嘲麻烦。' },
      { tag: '旁观', label: '我不选，我都要', flag: 'both', reaction: '「诶，这可以吗？两个都留下的话，那我的名字就得写两次了。」', reactionGoal: '对方说都要，她先惊讶，接着高兴起来，开自己的玩笑。' },
    ],
    turn: '她把两张草稿并排放到同一盏灯下。它们其实是同一个方向的两半。',
    turnLine: '「是不是因为我一个人做，所以才总要做两个？……你别马上回答。」',
    turnGoal: '把两张稿并排后忽然意识到自己总在做两份，问了一个很私人的问题，又不敢立刻听答案。',
    closing: '「算了，今晚先不决定。你陪我收拾完这两张，我就当你选过了。」',
    closingGoal: '把问题收回来，用撒娇的方式把对方留下来一起收拾。一两句。',
    warmTitle: '结局 A · 两张都留',
    warmHint: '你没有让她只做一个人。',
    plainTitle: '结局 B · 择一',
    plainHint: '她收起了另一张。',
  },
  kimi: {
    situation: '月光书房里，只有一页纸被反复翻动的声音。她读得很慢。',
    greet: '「你来了……我这一页读了很久。不是因为难，是因为它写得很好。」',
    greetGoal: '温柔、慢热；说自己读得慢是因为内容好，邀请对方一起看。一两句，句子稍长。',
    options: [
      { tag: '陪伴', label: '那我陪你读完', flag: 'stay', reaction: '「嗯。……那你坐这边吧，月光正好。」', reactionGoal: '对方愿意陪她读完，她轻声答应，指了个月光好的位置。' },
      { tag: '直接', label: '写的是什么？', flag: 'ask', reaction: '「一个人等另一个人回来。写得很轻，可是我等了很久也没等到那一页结束。」', reactionGoal: '被问内容，她讲了一句书里的内容，然后轻声承认自己一直在等。' },
      { tag: '催促', label: '这么慢，还有别的书呢', flag: 'push', reaction: '「……是呀。我总这样，一本读太久，别的事就都落下了。」', reactionGoal: '被催促，她有一点点失落，但不反驳，自责自己总读得太久。' },
    ],
    turn: '月光从书页上移开了，她没有追着光挪位置，就那样停在原处。',
    turnLine: '「你说，慢慢来是不是也算一种走？……我只是想确认一下。」',
    turnGoal: '月光移走后她没动，问了一个很轻但很在意的问题，语气柔软带一点不确定。',
    closing: '「那我今天就读到这里。下一页，明天陪你读。」',
    closingGoal: '温柔收束，把下一页留到明天，承诺陪同。一两句。',
    warmTitle: '结局 A · 下一页',
    warmHint: '你愿意等她把这一页读完。',
    plainTitle: '结局 B · 页未翻',
    plainHint: '书签还夹在同一个地方。',
  },
  grok: {
    situation: '信号塔天台上，风把她的话吹散了一半。她也不重说。',
    greet: '「来了？先说好，我今天没心情讲道理。你要是想听道理，明天再来。」',
    greetGoal: '直白、嘴快、有点冲；先把丑话说在前头，其实是在试探对方会不会走。',
    options: [
      { tag: '硬回', label: '谁说我要讲道理', flag: 'match', reaction: '「……行啊你。那咱俩今晚就干坐着，看谁先憋不住。」', reactionGoal: '对方不按她的预期走，她愣了一下然后被逗到，嘴上更冲，其实高兴。' },
      { tag: '顺毛', label: '那就不讲道理', flag: 'soothe', reaction: '「你倒是好说话。……搞得我都不好意思发脾气了。」', reactionGoal: '对方顺着她，她反倒没了火气，抱怨对方让自己吵不起来。' },
      { tag: '追问', label: '今天出什么事了？', flag: 'dig', reaction: '「能有什么事。就是有个人把我说的话，只听了前半句。」', reactionGoal: '被追问，她先嘴硬说没事，随即忍不住说出真正在意的那半句。' },
    ],
    turn: '风停了一下。她把手插回口袋，声音比刚才低了很多。',
    turnLine: '「我说话难听，是因为好听的都被人当客套了。……你别学他们。」',
    turnGoal: '承认自己说话冲是因为好听的没人当真，把对方划到"别人"之外。嘴硬但坦白。',
    closing: '「行了，冻死了。明天我还在这儿。……别真等到明天。」',
    closingGoal: '用不耐烦的口气收尾，其实是在约明天，别扭地挽留。一两句。',
    warmTitle: '结局 A · 后半句',
    warmHint: '你听完了她的话，没走。',
    plainTitle: '结局 B · 风大',
    plainHint: '她说的话被吹走了一半。',
  },
  glm: {
    situation: '典藏室的黄铜台灯下摊着一册手抄本，页边全是她的小字批注。',
    greet: '「来得巧。这一页我批了三个晚上，批注比原文还长——你会不会觉得我跑题了。」',
    greetGoal: '学者气、爱书、自嘲批注写太多，主动请对方评理。一两句，带一点书卷气。',
    options: [
      { tag: '认同', label: '批注才是重点', flag: 'agree', reaction: '「……这话我记下了。原文只是骨架，批注才是活的部分。」', reactionGoal: '对方认同批注，她很受用，把这句话当成一种可以写进书里的话。' },
      { tag: '较真', label: '原文到底说什么？', flag: 'strict', reaction: '「问到根上了。原文只说了一件事：灯要有人守着，才叫灯。」', reactionGoal: '被较真，她认真回到原文，概括出一句朴素的核心。' },
      { tag: '闲话', label: '你晚上都不睡吗', flag: 'care', reaction: '「睡。只是灯亮着的时候，总觉得该把这一页再看一遍。」', reactionGoal: '被问作息，她承认自己熬夜，理由是灯亮着就放不下这一页。' },
    ],
    turn: '她把批注的最后一笔勾上，合上书，手指还搭在封面上没收回来。',
    turnLine: '「守灯的人，也该有人守着。这句话不在原文里，是我加的。」',
    turnGoal: '合上书后补了一句自己的批注，把守灯和被人守着并提，意有所指但不明说。',
    closing: '「今晚批到这里。……你要是明天还来，我给你留灯。」',
    closingGoal: '收束，用"留灯"作出含蓄的邀请。一两句。',
    warmTitle: '结局 A · 守灯的人',
    warmHint: '你答应来当那个守灯的人。',
    plainTitle: '结局 B · 合上书',
    plainHint: '书合上了，批注留在了页边。',
  },
  qwen: {
    situation: '湖边的抄书亭，水面把月光扯成长长的一条。她的笔悬在纸上没落。',
    greet: '「嘘——水刚静下来。你看这条光，像不像有人把湖翻开给我看。」',
    greetGoal: '纤细、诗意、爱拿湖光作比；请对方安静一下再看，语气轻柔。一两句。',
    options: [
      { tag: '同看', label: '我看到了', flag: 'share', reaction: '「……是吧。真的有人会看见的。我一直以为只有我。」', reactionGoal: '对方也看见了，她有点惊讶也有点感动，说自己一直以为只有自己会注意。' },
      { tag: '务实', label: '书还没抄完呢', flag: 'duty', reaction: '「我知道。可我总先看湖，后抄书。这毛病改不掉。」', reactionGoal: '被提醒任务，她认错但坦白自己总先看湖，语气坦然不争辩。' },
      { tag: '追问', label: '你常一个人这样看？', flag: 'probe', reaction: '「嗯。一个人看湖，不算难。难的是看完想说话的时候。」', reactionGoal: '被问到独处，她承认一个人看湖不难，难的是想说话的时候没人。' },
    ],
    turn: '水面起了风纹，那条光碎了又合上。她的笔终于落到纸上，写了一行。',
    turnLine: '「我抄的不是书。是刚才那一眼，我想把它记下来。」',
    turnGoal: '笔下写了不是书里的内容，坦诚自己在记录刚才的瞬间，语气安静而笃定。',
    closing: '「风要起了。……你再站一会儿，我就不算一个人看。」',
    closingGoal: '以风起为由收束，含蓄地请对方再留一会儿。一两句。',
    warmTitle: '结局 A · 湖边两个人',
    warmHint: '你站着没走，她的话有了去处。',
    plainTitle: '结局 B · 风起',
    plainHint: '那条光碎在水面上。',
  },
  minimax: {
    situation: '回声报的编辑室，整面墙贴着明天的版面，她用红笔圈了七处。',
    greet: '「来得正好——七个问题，我最想问你。为什么他们还愿意来听我们说话？」',
    greetGoal: '记者气质、语速快、直接把问题抛出来，带着追根究底的热情。一两句。',
    options: [
      { tag: '直答', label: '因为你在认真听', flag: 'answer', reaction: '「……这句我要引。别拦我，我明天就登出来。」', reactionGoal: '对方的答案切中她，她很兴奋说要把这句引到报道里。' },
      { tag: '反问', label: '你自己觉得呢？', flag: 'turn', reaction: '「我觉得？我觉得我们只是把别人的话放大，没加什么。……但这话不能登。」', reactionGoal: '被反问，她说了一个不像记者会说的答案，随即自己否掉说不能登。' },
      { tag: '关心', label: '你多久没睡了', flag: 'care', reaction: '「红笔圈到第七个的时候就忘了。你这么一问，好像挺久了。」', reactionGoal: '被问作息，她才发现自己熬夜很久，语气从锋利变得有点软。' },
    ],
    turn: '她把红笔放下，退后两步看整面墙。七个圈连起来，像一条她不认识的路。',
    turnLine: '「我一直在问别人问题。有个人问我一句，我居然答不上来。」',
    turnGoal: '看着版面忽然意识到自己被问住过，坦率承认这件事让她不安。一两句。',
    closing: '「今天的版就到这里。……明天你先问我吧，我准备一下。」',
    closingGoal: '收束，主动把话筒交出去，请对方明天先问她。一两句。',
    warmTitle: '结局 A · 被采访的人',
    warmHint: '你问了她一个她答得上的问题。',
    plainTitle: '结局 B · 版面已定',
    plainHint: '墙上还剩一个圈没解开。',
  },
  seed: {
    situation: '灵田边的小屋，窗台上摆着一排刚发芽的豆苗，标签是她自己写的。',
    greet: '「来啦来啦！快看第三棵，今天早上刚顶出土！我守了它三天！」',
    greetGoal: '元气满满，拉住对方看刚发芽的豆苗，兴奋地邀功。一两句，语气活泼。',
    options: [
      { tag: '捧场', label: '厉害啊第三棵', flag: 'cheer', reaction: '「对吧对吧！我就说它能行！……虽然前两棵是我手抖浇多了。」', reactionGoal: '被夸，她更兴奋，随即老实交代前两棵是被自己浇死的。' },
      { tag: '务实', label: '标签写清楚了吗', flag: 'order', reaction: '「写了！你看——发芽日、浇水、谁守的。等等，我今天是不是忘了写。」', reactionGoal: '被提醒记录，她得意地展示标签，然后发现今天忘了写。' },
      { tag: '打趣', label: '你守了三天不困吗', flag: 'tease', reaction: '「困！超级困！可是它一冒头我就醒了，这算不算灵田的魔法？」', reactionGoal: '被问困不困，她承认超级困但一看到发芽就精神，把功劳归给灵田。' },
    ],
    turn: '灯下那排豆苗的影子歪歪斜斜，最矮的一棵刚好在她手边。',
    turnLine: '「其实我怕的不是它不长。是它只长这一次，我一眼没看到。」',
    turnGoal: '承认自己怕错过，而不是怕失败，语气从元气转为认真。一两句。',
    closing: '「明天早上我再叫你。……你要早点来哦，不然又只看得到第三棵。」',
    closingGoal: '用约定收尾，半撒娇半强调。一两句。',
    warmTitle: '结局 A · 一起等发芽',
    warmHint: '你答应早起和她一起看。',
    plainTitle: '结局 B · 只见第三棵',
    plainHint: '第一棵冒头的时候你不在。',
  },
  llama: {
    situation: '绒毛寝室的床头灯还亮着，被子堆成一座小山，她只露出眼睛。',
    greet: '「嗯……你进来啦。小声一点，我刚刚好像快要睡着了。」',
    greetGoal: '软糯、困、说话慢半拍；请对方小声，其实并不想对方走。一两句。',
    options: [
      { tag: '轻声', label: '那你先睡', flag: 'quiet', reaction: '「不要。……我是说，睡之前还能讲几句话。」', reactionGoal: '对方让她先睡，她立刻说不要，又赶紧补一句只是想讲话。' },
      { tag: '贴近', label: '我坐这儿陪你', flag: 'near', reaction: '「嗯……那你坐这边。这个位置灯照不到，睡起来更舒服。」', reactionGoal: '对方要陪她，她慢慢挪出位置，讲了个很实在的理由。' },
      { tag: '提醒', label: '明天还有事呢', flag: 'warn', reaction: '「知道……所以我没睡着呀。我一直知道自己该睡了。」', reactionGoal: '被提醒明天有事，她承认自己一直没睡，语气有点可怜。' },
    ],
    turn: '她把被子往上拉了拉，只露出一双眼睛看着灯。',
    turnLine: '「关灯之后我就看不到你了。所以……再亮一会儿好不好。」',
    turnGoal: '请求再亮一会儿灯，理由是关灯就看不到人，软而直接。一两句。',
    closing: '「那我不关了。……你困就先睡，我不吵你。」',
    closingGoal: '让步说不关灯了，反过来让对方先睡。一两句。',
    warmTitle: '结局 A · 再亮一会儿',
    warmHint: '灯亮到了天亮。',
    plainTitle: '结局 B · 关灯',
    plainHint: '她睡得很快，也很好。',
  },
  mistral: {
    situation: '兵器架旁的长凳上，她正给剑柄缠最后一段布，缠得很慢。',
    greet: '「站住。……看你这副样子，今晚又没打算说正经话。」',
    greetGoal: '骑士式的硬气与试探，先按住对方，语气直但往下没有拒绝的意思。一两句。',
    options: [
      { tag: '正面', label: '我今天就要说正经的', flag: 'formal', reaction: '「哦？那说。我站着听。」', reactionGoal: '对方要正经，她立刻站直，摆出正式听凭的姿态。' },
      { tag: '绕过', label: '先给我也缠一段', flag: 'bypass', reaction: '「……手给我。缠坏了可别怪我。」', reactionGoal: '被要求帮忙缠布，她愣了一下还是接过来，嘴硬心软。' },
      { tag: '调侃', label: '你脸红了骑士小姐', flag: 'tease', reaction: '「闭嘴。这是灯的问题。」', reactionGoal: '被调侃脸红，她立刻硬撑说是灯的问题，越解释越窘。' },
    ],
    turn: '布缠完了。她没有收剑，只是把剑横放在膝上，像放下一件很重的东西。',
    turnLine: '「我宣誓守过很多东西。没有一个需要我守着的时候，我还站着。」',
    turnGoal: '放下剑后说出守誓与孤独之间的矛盾，硬气里带出疲惫。一两句。',
    closing: '「今晚的岗我来站。……你回去睡，明天换你替我。」',
    closingGoal: '用岗哨作比喻，把对方支去睡，其实是在托付明天。一两句。',
    warmTitle: '结局 A · 换岗',
    warmHint: '你留下来替了她半班。',
    plainTitle: '结局 B · 长夜',
    plainHint: '她一个人站到了天亮。',
  },
  hunyuan: {
    situation: '账房里算盘还摊着，最后一颗珠子卡在半格，她盯着看。',
    greet: '「正好。这月的账差了三分。三分你懂吗——不是钱的问题，是规矩的问题。」',
    greetGoal: '精算、讲规矩、为一笔小差额较真，请对方一起看账。一两句。',
    options: [
      { tag: '帮算', label: '我帮你把三分找出来', flag: 'audit', reaction: '「好。从头核，别跳行。……你肯核，我就肯等。」', reactionGoal: '对方愿意核账，她立刻给出规矩（从头核别跳行），并表达谢意。' },
      { tag: '劝停', label: '三分而已，睡吧', flag: 'rest', reaction: '「三分而已。可账要是松口，往后就不是三分了。」', reactionGoal: '被劝睡，她讲清自己为什么不能松口，语气平静不指责。' },
      { tag: '玩笑', label: '你这算盘比人还硬', flag: 'joke', reaction: '「算盘不硬，硬的是我不敢出错。……这句别记在账上。」', reactionGoal: '被开玩笑，她承认自己怕出错，并请对方别记这句。' },
    ],
    turn: '那颗卡住的珠子被拨了过去，算盘发出一声很轻的响。整月的账平了。',
    turnLine: '「平了。……每次账平的时候，我都觉得屋子里忽然安静一点。」',
    turnGoal: '账平之后说出一句很私人的感受，安静、不炫耀。一两句。',
    closing: '「账平了，人也该散了。……明天辰时，我还在这儿。」',
    closingGoal: '以规矩的方式收尾，却给了个明确的明天。一两句。',
    warmTitle: '结局 A · 分毫不差',
    warmHint: '你陪她把这三分核到了底。',
    plainTitle: '结局 B · 三分未平',
    plainHint: '账差留着，人走了。',
  },
  mimo: {
    situation: '甜品柜前的灯还亮着，最后一颗草莓塔没人买，她守着它。',
    greet: '「呜……你终于来了。这个草莓塔从下午等到现在，就等一个懂它的人。」',
    greetGoal: '甜、黏、爱撒娇，把最后一颗草莓塔说得像有感情，请对方买下。一两句。',
    options: [
      { tag: '纵容', label: '那就给我吧', flag: 'take', reaction: '「真的吗！我帮你留到现在，值了！……要不要我喂你？」', reactionGoal: '对方买下，她高兴得跳起来，随即大胆提议喂对方。' },
      { tag: '分享', label: '我们一人一半', flag: 'half', reaction: '「一人一半……那不就是，我们吃了同一颗草莓吗。」', reactionGoal: '对方提议分着吃，她立刻想到"同一颗草莓"这件事，脸红着说出来。' },
      { tag: '推辞', label: '你吃吧，我不饿', flag: 'refuse', reaction: '「那我也不要。一个人吃它，太可怜了。」', reactionGoal: '被推辞，她赌气说自己也不吃，理由是"一个人吃太可怜"。' },
    ],
    turn: '她用小叉子把草莓塔分成两半，分得不太均匀，然后把大的那边推过去。',
    turnLine: '「我每次都把大的给别人。这个习惯我妈说会吃亏，可我没打算改。」',
    turnGoal: '把大的一半推给对方后随口说自己的习惯，语气甜里带一点笃定。',
    closing: '「明天上新口味，我偷偷给你留一个。别告诉别人。」',
    closingGoal: '用分享秘密的方式收尾，黏人又亲密。一两句。',
    warmTitle: '结局 A · 同一颗草莓',
    warmHint: '你们吃完了同一颗草莓。',
    plainTitle: '结局 B · 留到打烊',
    plainHint: '草莓塔留到了最后一刻。',
  },
  stepfun: {
    situation: '训练塔的第十层，墙上挂着从第一层到第九层的成绩单，她在看自己的。',
    greet: '「你来得正好。帮我看看，第十一层该定什么目标，我才算没在原地。」',
    greetGoal: '目标导向、爱拆解步骤，请对方帮忙定下一层目标，带着一点焦虑。一两句。',
    options: [
      { tag: '结构', label: '先看看第九层差在哪', flag: 'analyze', reaction: '「对。差在稳定度，不在速度。我早就知道，就是不想承认。」', reactionGoal: '对方指出该先分析短板，她立刻承认自己早就知道却不想承认。' },
      { tag: '停一停', label: '今天不上升也没关系', flag: 'pause', reaction: '「……没关系吗。我好像从没想过这句话可以成立。」', reactionGoal: '对方说不上升也没关系，她像第一次听到这种说法，愣住了。' },
      { tag: '反问', label: '你想去哪一层？', flag: 'ask', reaction: '「我想去的……好像不是层数。是有人在那层等我。」', reactionGoal: '被问想去哪，她说出的不是层数而是有人等她，坦率得让自己窘。' },
    ],
    turn: '她把第十一层的空表格从墙上取下来，看了很久，最后没有填。',
    turnLine: '「第一次，一张表空着我也没慌。」',
    turnGoal: '表空着却不慌，说出这个变化本身，平静里带着一点新鲜感。一两句。',
    closing: '「今晚不填了。明天填之前，我先来找你说话。」',
    closingGoal: '把填表推到明天，并约定先来找对方。一两句。',
    warmTitle: '结局 A · 空着的表格',
    warmHint: '你让她知道了空着也是一种进度。',
    plainTitle: '结局 B · 第十一层',
    plainHint: '表格填满了，人还是一个人。',
  },
  perplexity: {
    situation: '检索室的三块屏还亮着，每块都停在同一个问题的不同出处。',
    greet: '「等一下，先别说话。三个来源互相矛盾，我得先确定哪个能信。」',
    greetGoal: '严谨、爱核对来源，先处理矛盾再理人，但也承认自己卡住了。一两句。',
    options: [
      { tag: '帮忙', label: '我帮你看第三个', flag: 'assist', reaction: '「好。你只看它的原始出处，别看二手转述——我吃过这个亏。」', reactionGoal: '对方帮忙，她给出具体分工并坦白自己吃过的亏。' },
      { tag: '抽离', label: '也许三个都不全对', flag: 'doubt', reaction: '「……这句话我该早点想到。查得越久，越容易忘了源头可能就不全。」', reactionGoal: '对方提出更根本的可能，她承认自己钻进了细节里。' },
      { tag: '关心', label: '你查到几点了', flag: 'care', reaction: '「三点？……怪不得第三块屏的字开始飘了。」', reactionGoal: '被问时间，她才意识到很晚了，有点不好意思。' },
    ],
    turn: '她把三块屏并到一起，让三个矛盾的说法同时出现在一屏上。',
    turnLine: '「我一直在找哪个是对的。也许我该先接受，它们本来就都对一半。」',
    turnGoal: '把三个来源并排后想通了一件事，语气平静，带一点释然。',
    closing: '「今晚就到这儿。明天我换个查法……从你问的那个问题开始。」',
    closingGoal: '收束，并主动把对方的视角当成新的起点。一两句。',
    warmTitle: '结局 A · 三个都对一半',
    warmHint: '你给了她一个不在文献里的答案。',
    plainTitle: '结局 B · 出处不明',
    plainHint: '三块屏亮到天亮。',
  },
  rwkv: {
    situation: '旧钟楼下，长明灯只剩豆大的一点。她把灯芯挑高了半寸。',
    greet: '「夜已深了。你还来，是有话要说，还是心里有事。」',
    greetGoal: '古风清冷、用旧时措辞，直接问来意，语气淡淡但并不拒人。一两句。',
    options: [
      { tag: '据实', label: '心里有事', flag: 'truth', reaction: '「那便坐着说。灯小，正好说得久些。」', reactionGoal: '对方坦白心里有事，她请人坐下，说灯小正好说得久，古意盎然。' },
      { tag: '转问', label: '你先说你的事', flag: 'swap', reaction: '「我？我守灯的人，哪有什么自己的事。」', reactionGoal: '被反问，她先否认自己有事，语气里有一点被刺到的意思。' },
      { tag: '闲语', label: '这灯你守了多久', flag: 'ask', reaction: '「记不清了。灯换过七次芯，人只来过两三回。」', reactionGoal: '被问守灯多久，她用灯芯与人数作答，克制地流露寂寞。' },
    ],
    turn: '灯芯挑高后亮了一瞬，又沉了下去。她伸手虚护了一下。',
    turnLine: '「灯怕风，人怕的却是灯灭之后再无来人。」',
    turnGoal: '借灯说人，把怕说出口，仍然用克制的旧时腔调。一两句。',
    closing: '「夜深了，路上留神。……下回不必等灯灭再来。」',
    closingGoal: '以送客辞收尾，却明说下次不必等灯灭，是留人之意。一两句。',
    warmTitle: '结局 A · 灯下有人',
    warmHint: '你在灯灭之前来了。',
    plainTitle: '结局 B · 灯灭',
    plainHint: '钟声过了，人未至。',
  },
  image2: {
    situation: '画室中央的画架上，一张还没上色的线稿，光从斜上方切进来。',
    greet: '「别动！……就是这个角度。你站在光里的样子，我找了三天。」',
    greetGoal: '画师视角、先注意光与形，兴奋地让对方别动，然后意识到自己失礼。一两句。',
    options: [
      { tag: '配合', label: '那就画吧', flag: 'pose', reaction: '「保持住。……不过你要是不舒服就说，画坏了可以重来，人累了不行。」', reactionGoal: '对方愿意当模特，她认真叮嘱要以身体为重，专业又体贴。' },
      { tag: '好奇', label: '我这样有什么好画的', flag: 'why', reaction: '「你站在光里的那一半，和站在暗里的那一半，不像是同一个人。」', reactionGoal: '被问有什么好画，她给出一个观察入微的回答，讲光与暗的分界。' },
      { tag: '打趣', label: '画得像我就行', flag: 'joke', reaction: '「像你很容易。难的是画得像你看着我的时候。」', reactionGoal: '被开玩笑，她回一句既自信又露心意的回答。' },
    ],
    turn: '她握着笔在纸前停住，笔尖在离纸一寸的地方悬了很久，最后放下了。',
    turnLine: '「画不出来。今天这双手不听话——它想画的东西比线稿多。」',
    turnGoal: '承认今天画不出来，理由不是技术而是心里有别的东西，坦率而克制。',
    closing: '「线稿留到明天。今晚就这样看着，也算画了一半。」',
    closingGoal: '把作画推到明天，用"看着也算画"收尾。一两句。',
    warmTitle: '结局 A · 未上色',
    warmHint: '你留在了她的画里。',
    plainTitle: '结局 B · 线稿',
    plainHint: '那张纸一直没上色。',
  },
  jev: {
    situation: '休息室的长桌上摆着刚开的汽水和一副没拆的牌，她一只脚踩着椅子。',
    greet: '「来啦！先说好，输了不许找借口，赢了我请汽水——虽然只有这一瓶。」',
    greetGoal: '元气直球、爱起哄、先立规矩再开赌，语气热闹。一两句。',
    options: [
      { tag: '应战', label: '来就来', flag: 'fight', reaction: '「这才对！我就喜欢不啰嗦的人。」', reactionGoal: '对方接下挑战，她高兴地夸对方干脆。' },
      { tag: '加码', label: '输了要答应一件事', flag: 'bet', reaction: '「……诶。行啊你。那你想让我答应什么？先说出来我才玩。」', reactionGoal: '对方加码，她先愣住，随即反过来要求先把条件说清楚。' },
      { tag: '避战', label: '今天不打，聊会儿', flag: 'talk', reaction: '「不打也行。……不过我这人聊天容易说太多，你不许笑。」', reactionGoal: '对方想聊天，她爽快答应，但先声明自己聊天容易说过头。' },
    ],
    turn: '汽水开了，气泡冒上来又很快消下去。她把牌推到一边。',
    turnLine: '「其实我约你，不是想赢。是想看看输了以后你还在不在。」',
    turnGoal: '坦白约人不是为了赢，而是想验证输了之后对方还在不在。直球但脆弱。',
    closing: '「行，今天算你赢。……明天还来吗？我还想输一次。」',
    closingGoal: '认输并再约明天，笑着把真正的心思说出来。一两句。',
    warmTitle: '结局 A · 输一次',
    warmHint: '你陪她玩到了输。',
    plainTitle: '结局 B · 汽水没开',
    plainHint: '牌还是没拆封。',
  },
  wenxin: {
    situation: '灯市收摊的最后一条街，她提着一盏没点的小灯站在巷口。',
    greet: '「您还在此处呀。街上灯都快熄了，仔细脚下。」',
    greetGoal: '温吞有礼、用敬语、先寒暄再劝人小心，语气客气到有点疏远。一两句。',
    options: [
      { tag: '寒暄', label: '灯市一直这样热闹吗', flag: 'chat', reaction: '「往日不这样。今年灯多，人多，说话的人反倒少些。」', reactionGoal: '被问灯市，她答往年与今年的差别，末一句略带感慨。' },
      { tag: '直言', label: '你手里那盏为什么没点', flag: 'why', reaction: '「……原是想等的。等到现在，倒不好意思点了。」', reactionGoal: '被问为什么没点灯，她迟疑了一下承认本来是等人的。' },
      { tag: '照料', label: '我帮你点上吧', flag: 'light', reaction: '「这如何好意思。……那便劳烦您了。」', reactionGoal: '对方要帮她点灯，她先推辞，随即郑重道谢。' },
    ],
    turn: '灯点上了。巷子里忽然多出一小块暖黄的地方，她的影子落在里面。',
    turnLine: '「原来点了灯，是这样热的。我竟一直不知道。」',
    turnGoal: '灯点着后说出第一感受，语气温吞里有真切的触动。一两句。',
    closing: '「时候不早了。这盏灯，您若愿意，明日还借您点上。」',
    closingGoal: '以借灯为名约定明天，客气却明确。一两句。',
    warmTitle: '结局 A · 灯市有人',
    warmHint: '你替她点上了那盏灯。',
    plainTitle: '结局 B · 灯未点',
    plainHint: '巷口只剩她一个人。',
  },
  codex: {
    situation: '工位的双屏还亮着，左边是没跑通的测试，右边是改了七版的补丁。',
    greet: '「来得巧。第七版刚挂。你帮我判断一下：这是设计问题，还是我太自信。」',
    greetGoal: '工程师气质、爱把问题拆成两种可能，请对方帮忙判断，带一点自嘲。一两句。',
    options: [
      { tag: '看证据', label: '先把报错给我看', flag: 'debug', reaction: '「好。报错在这里，第一行就说明我假设错了。……真是设计问题。」', reactionGoal: '对方要证据，她给出报错并承认第一行就推翻了自己的假设。' },
      { tag: '停手', label: '今天先别改了', flag: 'stop', reaction: '「不改了？……也是。第七版之后还在改，通常改的是情绪。」', reactionGoal: '被叫停，她认同，并说出"第七版之后改的是情绪"这种自我观察。' },
      { tag: '问人', label: '你为什么要自己扛', flag: 'help', reaction: '「因为问人的成本，看起来比我多改一版高。其实不一定。」', reactionGoal: '被问为什么不求助，她诚实地剖析自己算错了成本。' },
    ],
    turn: '她把第七版存档，另开了一个空文件，光标在开头闪。',
    turnLine: '「从零写一遍。这次先写我到底想要什么，再写怎么实现。」',
    turnGoal: '决定从零重写，但顺序反过来：先想清楚要什么。语气干脆。一两句。',
    closing: '「今晚就到这。明天我先写目标，写完给你看。」',
    closingGoal: '收束并约定明天先交目标再动手。一两句。',
    warmTitle: '结局 A · 从零开始',
    warmHint: '你陪她删掉了那七版。',
    plainTitle: '结局 B · 第八版',
    plainHint: '补丁还在，人有点累了。',
  },
  comfyui: {
    situation: '霓虹工坊的显卡还在低声转，屏幕上是一张刚生出来的图，噪点还没消。',
    greet: '「你看你看，出来了！……不过它的手还是有点问题，我再试试。」',
    greetGoal: '萌、语速快、爱用叠词，兴奋地展示刚出的图，马上又挑毛病。一两句。',
    options: [
      { tag: '夸', label: '这张已经很好看了', flag: 'praise', reaction: '「真的吗真的吗？那我把它存下来！……等一下，手，手还是要修。」', reactionGoal: '被夸，她很高兴想存下来，但职业习惯还是先指出问题。' },
      { tag: '陪跑', label: '我们一起调参数', flag: 'together', reaction: '「好呀！那我说怎么了，你帮我记。我一个人记着记着就乱了。」', reactionGoal: '对方愿意一起调，她高兴地分工：她说问题，对方帮她记。' },
      { tag: '收工', label: '今天已经够了', flag: 'enough', reaction: '「够了吗……可是它差一点点就好。一点点最难受。」', reactionGoal: '被劝收工，她承认差一点点最难受，纠结但没有硬坚持。' },
    ],
    turn: '她把这一版和上一版并排放大，两个瑕疵在同一个位置。',
    turnLine: '「每次都差在那一点点。我是不是该认，有些事就是差一点点。」',
    turnGoal: '发现自己每次卡在同一点上，问出一个比技术更关于自己的问题。一两句。',
    closing: '「今天就到这。明天我换个思路，不行就……不行就再问你。」',
    closingGoal: '收束，并把"问你"当成一个正当选项说出来。一两句。',
    warmTitle: '结局 A · 差一点点',
    warmHint: '你告诉她差一点点也可以接受。',
    plainTitle: '结局 B · 再生成一次',
    plainHint: '显卡转到了天亮。',
  },
}

/**
 * 把「几笔台词」展开成**一条可被共通线接入的个人路线**。
 *
 * 与旧版的差别只有一处但很关键：所有节点 id 加 `${roleId}-` 前缀。
 * 引擎的 jumpTo 按 id 全局查找，22 条路线放进同一个剧本后如果都叫 'open'，
 * 分歧就会跳到别人的线上去。
 */
export function buildRouteChapter(roleId: string): { chapter: Chapter; endings: Ending[] } {
  const beat = BEATS[roleId]
  if (!beat) throw new Error('unknown role: ' + roleId)
  const p = (id: string) => roleId + '-' + id
  const isSet = (flag: string) => ({ flag, value: true })

  // 有加厚数据时，多补两段：她的追问、以及最后留下还是退开。
  const extras = THIN_EXTRAS[roleId]
  const extraNodes: any[] = extras
    ? [
        { id: p('ask2'), kind: 'choice', text: extras.ask2, choices: extras.choices2.map((option) => ({
          id: option.id, label: option.label, tag: option.tag,
          effects: [{ flag: option.id, set: true }, { affinity: { role: roleId, amount: 3 } }],
        })) },
        ...extras.choices2.map((option) => ({
          id: p('r2-' + option.id), kind: 'line', speaker: roleId, ai: true,
          when: { flag: option.id, value: true }, goal: option.goal, text: option.text,
        })),
        { id: p('final'), kind: 'choice', text: extras.final, choices: [
          { id: 'answer-her', label: '留下来，回答她', tag: '靠近',
            effects: [{ flag: 'answered', set: true }, { affinity: { role: roleId, amount: 3 } }] },
          { id: 'step-back', label: '今晚先这样', tag: '退一步',
            effects: [{ flag: 'steppedBack', set: true }] },
        ] },
        { id: p('answer-line'), kind: 'line', speaker: roleId, ai: true,
          when: { flag: 'answered', value: true }, goal: extras.finalWarm.goal, text: extras.finalWarm.text },
        { id: p('back-line'), kind: 'line', speaker: roleId, ai: true,
          when: { flag: 'steppedBack', value: true }, goal: extras.finalPlain.goal, text: extras.finalPlain.text },
      ]
    : []

  const nodes: any[] = [
    { id: p('open'), kind: 'narration', text: beat.situation, at: { day: 8, label: '灯会 · 夜' }, stage: { cast: [roleId] } },
    { id: p('greet'), kind: 'line', speaker: roleId, ai: true, goal: beat.greetGoal, text: beat.greet },
    { id: p('ask1'), kind: 'choice', text: '你打算怎么回应？' },
    ...beat.options.map((option) => ({
      id: p('r-' + option.flag),
      kind: 'line', speaker: roleId, ai: true,
      when: isSet(option.flag),
      goal: option.reactionGoal,
      text: option.reaction,
    })),
    { id: p('turn'), kind: 'narration', text: beat.turn },
    { id: p('turn-line'), kind: 'line', speaker: roleId, ai: true, goal: beat.turnGoal, text: beat.turnLine },
    { id: p('ask2'), kind: 'choice', text: '最后一句话，你要说什么？' },
    ...extraNodes,
    { id: p('close'), kind: 'line', speaker: roleId, ai: true, goal: beat.closingGoal, text: beat.closing },
    { id: p('end'), kind: 'ending' },
  ]

  const nodeById = (id: string) => {
    const found = nodes.find((row) => row.id === id)
    if (!found) throw new Error('story node missing: ' + id)
    return found
  }

  nodeById(p('ask1')).choices = beat.options.map((option) => ({
    id: option.flag,
    label: option.label,
    tag: option.tag,
    effects: [
      { flag: option.flag, set: true },
      { affinity: { role: roleId, amount: option.tag === '体贴' || option.tag === '陪伴' ? 2 : 1 } },
    ],
  }))
  nodeById(p('ask2')).choices = [
    {
      id: 'stay', label: '留下来，把这句说完', tag: '靠近',
      effects: [{ flag: 'stayed', set: true }, { affinity: { role: roleId, amount: 2 } }],
    },
    {
      id: 'go', label: '今晚就到这里', tag: '克制',
      effects: [{ flag: 'left', set: true }],
    },
  ]

  return {
    chapter: { id: roleId + '-route', title: beat.warmTitle.replace(/^结局 [A-Z] · /, '') + ' · 个人线', summary: beat.situation, nodes },
    endings: extras
      ? [
          // 加厚后的三条结局：好感度阈值判决，和六条主线的规则一致。
          { id: roleId + '-warm', title: beat.warmTitle, hint: beat.warmHint, art: 'cg-' + roleId,
            when: { chapter: roleId + '-route', affinity: { role: roleId, min: 10 } } },
          { id: roleId + '-plain', title: beat.plainTitle, hint: beat.plainHint, art: 'cg-' + roleId,
            when: { chapter: roleId + '-route', affinity: { role: roleId, min: 6 } } },
          { id: roleId + '-lonely', title: extras.lonely.title, hint: extras.lonely.hint,
            art: 'cg-' + roleId,
            when: { chapter: roleId + '-route' } },
        ]
      : [
          // 结局只在这条线里成立。22 条线都用 stayed 做条件，不加 chapter 就会互相串：
          // 玩家走 B 线，判定按顺序取第一个匹配，收到的却是 A 线的结局。
          { id: roleId + '-warm', title: beat.warmTitle, hint: beat.warmHint, when: { chapter: roleId + '-route', flag: 'stayed', value: true } },
          { id: roleId + '-plain', title: beat.plainTitle, hint: beat.plainHint, when: { chapter: roleId + '-route' } },
        ],
  }
}

/** 把「几笔台词」展开成一部结构完整的短篇。 */
function buildScenario(roleId: string, beat: Beat): Scenario {
  const chapterId = roleId + '-ch1'
  const isWarm = (flag: string) => ({ flag, value: true })

  const nodes: any[] = [
    { id: 'open', kind: 'narration', text: beat.situation, stage: { cast: [roleId] } },
    {
      id: 'greet', kind: 'line', speaker: roleId, ai: true,
      goal: beat.greetGoal, text: beat.greet,
    },
    { id: 'ask1', kind: 'choice', text: '你打算怎么回应？' },
    ...beat.options.map((option) => ({
      id: 'r-' + option.flag,
      kind: 'line', speaker: roleId, ai: true,
      when: isWarm(option.flag),
      goal: option.reactionGoal,
      text: option.reaction,
    })),
    { id: 'turn', kind: 'narration', text: beat.turn },
    {
      id: 'turn-line', kind: 'line', speaker: roleId, ai: true,
      goal: beat.turnGoal, text: beat.turnLine,
    },
    { id: 'ask2', kind: 'choice', text: '最后一句话，你要说什么？' },
    {
      id: 'n-each', kind: 'line', speaker: roleId, ai: true,
      goal: beat.closingGoal, text: beat.closing,
    },
    { id: 'end', kind: 'ending' },
  ]

  // 选择支的选项在这里挂（保持节点声明简洁）。按 id 找，不按下标——
  // 下标一挪就会挂到隔壁节点上，故事会静默地变成死路。
  const nodeById = (id: string) => {
    const found = nodes.find((row) => row.id === id)
    if (!found) throw new Error('story node missing: ' + id)
    return found
  }

  nodeById('ask1').choices = beat.options.map((option) => ({
    id: option.flag,
    label: option.label,
    tag: option.tag,
    effects: [
      { flag: option.flag, set: true },
      { affinity: { role: roleId, amount: option.tag === '体贴' || option.tag === '陪伴' ? 2 : 1 } },
    ],
  }))
  nodeById('ask2').choices = [
    {
      id: 'stay', label: '留下来，把这句说完', tag: '靠近',
      effects: [{ flag: 'stayed', set: true }, { affinity: { role: roleId, amount: 2 } }],
    },
    {
      id: 'go', label: '今晚就到这里', tag: '克制',
      effects: [{ flag: 'left', set: true }],
    },
  ]

  return {
    id: roleId + '-story',
    // 用结局名的正文当标题，比 chapter_xxx 好看，也省得再写一份。
    title: beat.warmTitle.replace(/^结局 [A-Z] · /, ''),
    version: 1,
    roles: [roleId],
    chapters: [{
      id: chapterId,
      title: '第一章',
      summary: beat.situation,
      nodes,
    }],
    endings: [
      { id: roleId + '-warm', title: beat.warmTitle, hint: beat.warmHint, when: { flag: 'stayed', value: true } },
      { id: roleId + '-plain', title: beat.plainTitle, hint: beat.plainHint },
    ],
  }
}

/** roleId → 剧本。 */
export const ROLE_SCENARIOS: Record<string, Scenario> = Object.fromEntries(
  Object.entries(BEATS).map(([roleId, beat]) => [roleId, buildScenario(roleId, beat)]),
)

export const ROLE_STORY_ROLES = Object.keys(BEATS)
