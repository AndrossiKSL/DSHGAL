/**
 * 第一章剧本：鲸鱼娘 · 打烊之后。
 *
 * 骨架是写死的（节点顺序、条件、结局），台词交给 AI 按 goal 演。每个 AI 节点都
 * 带 text 兜底，所以模型不可用时这一章依然能从头玩到结局。
 */
import type { Scenario } from './scenario'

export const WHALE_CHAPTER_SCENARIO: Scenario = {
  id: 'whale-ch1',
  title: '深海女仆工坊 · 打烊之后',
  version: 1,
  roles: ['deepseek'],
  chapters: [
    {
      id: 'ch1',
      title: '第一章 · 打烊之后',
      summary: '工坊的最后一盏灯。她擦着杯子，等你先开口。',
      nodes: [
        {
          id: 'open',
          kind: 'narration',
          text: '深海女仆工坊的招牌灯灭了。玻璃窗外，游鱼把光一点点带走。',
          stage: { bg: 'gal-ch1-bg', cast: ['deepseek'] },
        },
        {
          id: 'greet',
          kind: 'line',
          speaker: 'deepseek',
          ai: true,
          goal: '打烊后看到主人还留在店里，有点意外又很高兴地打招呼，邀请他坐下。一两句。',
          text: '「啊……主人还没走呀。要不要陪我坐一会儿？茶刚泡好呢。」',
        },
        {
          id: 'ask1',
          kind: 'choice',
          text: '她放下杯子，等你说点什么。',
          choices: [
            {
              id: 'help',
              label: '我帮你一起收拾吧',
              tag: '体贴',
              effects: [{ flag: 'helped', set: true }, { affinity: { role: 'deepseek', amount: 2 } }],
            },
            {
              id: 'tea',
              label: '先坐下喝杯茶',
              tag: '从容',
              effects: [{ flag: 'tea', set: true }, { affinity: { role: 'deepseek', amount: 1 } }],
            },
            {
              id: 'ask-book',
              label: '你在看什么书？',
              tag: '好奇',
              effects: [{ flag: 'curious', set: true }, { affinity: { role: 'deepseek', amount: 1 } }],
            },
          ],
        },
        // 三条小分支，各自回到主线
        {
          id: 'help-a',
          kind: 'line',
          speaker: 'deepseek',
          ai: true,
          when: { flag: 'helped', value: true },
          goal: '主人主动来帮忙收拾，她有点慌又很受用，嘴上说着不用却把抹布让出去。一两句。',
          text: '「诶、这些我来就好——……真的吗？那，抹布给你。」',
        },
        {
          id: 'tea-a',
          kind: 'line',
          speaker: 'deepseek',
          ai: true,
          when: { flag: 'tea', value: true },
          goal: '主人爽快坐下喝茶，她很高兴，坐到他斜对面，说今晚的茶是她自己配的。一两句。',
          text: '「那就说定了。今晚这壶是我自己配的，你尝尝看合不合口味。」',
        },
        {
          id: 'book-a',
          kind: 'line',
          speaker: 'deepseek',
          ai: true,
          when: { flag: 'curious', value: true },
          goal: '主人问她手里的书，她把书脊给他看，说这是店里最旧的一本，写着深海的事。一两句。',
          text: '「这本呀……是店里最旧的一本。上面写着比我们这儿更深的地方。」',
        },
        {
          id: 'quiet',
          kind: 'narration',
          text: '一阵安静。只有水声，和灯芯偶尔的噼啪。',
        },
        {
          id: 'blackout',
          kind: 'event',
          text: '头顶的灯闪了两下，灭了。整间工坊落进一种很深的蓝。',
          effects: [{ flag: 'blackout', set: true }],
        },
        {
          id: 'blackout-reaction',
          kind: 'line',
          speaker: 'deepseek',
          ai: true,
          goal: '突然停电，她吓了一跳，下意识往主人那边靠了一点，又强装镇定说这种时候常有。一两句。',
          text: '「呀——……没、没事的，这种时候常有。真的。」',
        },
        {
          id: 'porthole',
          kind: 'narration',
          text: '舷窗外，一头鲸正慢慢游过去。它身上带着光。',
        },
        {
          id: 'whale-line',
          kind: 'line',
          speaker: 'deepseek',
          ai: true,
          goal: '她借着窗外的鲸光去看主人的脸，说小时候听说是鲸把灯送到深海的。语气要软。一两句。',
          text: '「小时候听说，深海的灯都是鲸送来的。……怪不得今晚这么亮。」',
        },
        {
          id: 'ask2',
          kind: 'choice',
          text: '她离你只有半步。',
          choices: [
            {
              id: 'closer',
              label: '再靠近一点',
              tag: '靠近',
              effects: [{ flag: 'close', set: true }, { affinity: { role: 'deepseek', amount: 2 } }],
            },
            {
              id: 'steady',
              label: '就这样安静待着',
              tag: '克制',
              effects: [{ flag: 'calm', set: true }, { affinity: { role: 'deepseek', amount: 1 } }],
            },
          ],
        },
        {
          id: 'closer-a',
          kind: 'line',
          speaker: 'deepseek',
          ai: true,
          when: { flag: 'close', value: true },
          goal: '主人往前凑近，她没退开，声音变得很轻，像是怕惊动什么。一两句，克制但明显心动。',
          text: '「……主人，你、你离得好近。我这样子，是不是有点不像话。」',
        },
        {
          id: 'calm-a',
          kind: 'line',
          speaker: 'deepseek',
          ai: true,
          when: { flag: 'calm', value: true },
          goal: '主人什么都没做，只是待在旁边，她反而安心了，说这样就很好。一两句。',
          text: '「……这样就好。谢谢你没有急着说什么。」',
        },
        {
          id: 'close-out',
          kind: 'narration',
          text: '灯在这时候回来了。她抬手挡了一下眼睛，然后笑出来。',
        },
        {
          id: 'final',
          kind: 'line',
          speaker: 'deepseek',
          ai: true,
          goal: '灯重新亮起，收尾这一晚。若之前选了靠近，语气要更亲昵；否则保持温柔但留一点距离。一两句。',
          text: '「打烊啦。……明天，你还会来吗？」',
        },
        {
          // 第一章收在这里，但不判结局——第二章还要再走一段。
          id: 'ch1-end',
          kind: 'narration',
          text: '她把你送到门口，没关灯。',
        },
      ],
    },
    {
      id: 'ch2',
      title: '第二章 · 提前亮的那盏灯',
      summary: '第二天傍晚，工坊的灯比平常早亮了一个小时。',
      nodes: [
        {
          id: 'm-open',
          kind: 'narration',
          text: '第二天的天色还没暗，工坊的灯已经亮着了。玻璃门没锁。',
          stage: { bg: 'gal-ch2-bg', cast: ['deepseek'] },
        },
        {
          id: 'm-greet',
          kind: 'line',
          speaker: 'deepseek',
          ai: true,
          goal: '她提前开店，装作只是在擦桌子，其实一直在等门响。被撞见时有点手足无措。一两句。',
          text: '「诶——你怎么这么早？我、我只是今天想早点擦完桌子。」',
        },
        {
          id: 'm-ask',
          kind: 'choice',
          text: '她的抹布在同一块桌角擦了第三遍。',
          choices: [
            {
              id: 'see-through',
              label: '你是在等我吧',
              tag: '直白',
              effects: [{ flag: 'sawThrough', set: true }, { affinity: { role: 'deepseek', amount: 2 } }],
            },
            {
              id: 'play-along',
              label: '那我陪你擦',
              tag: '顺着',
              effects: [{ flag: 'playAlong', set: true }, { affinity: { role: 'deepseek', amount: 1 } }],
            },
          ],
        },
        {
          id: 'm-see',
          kind: 'line',
          speaker: 'deepseek',
          ai: true,
          when: { flag: 'sawThrough', value: true },
          goal: '被一句话戳穿，她放弃装忙，承认等了一下午，语气羞但也松下来。一两句。',
          text: '「……一下午。可以了吧，别再说了。」',
        },
        {
          id: 'm-play',
          kind: 'line',
          speaker: 'deepseek',
          ai: true,
          when: { flag: 'playAlong', value: true },
          goal: '对方没有拆穿而是顺着她，她松一口气又有点失落，嘴硬地说那就快擦。一两句。',
          text: '「……嗯。那，抹布给你。擦完这一排就好。」',
        },
        {
          id: 'm-turn',
          kind: 'narration',
          text: '擦完最后一排，她把两份茶点端上来，其中一份是她自己不常吃的甜。',
        },
        {
          id: 'm-turn-line',
          kind: 'line',
          speaker: 'deepseek',
          ai: true,
          goal: '昨天没说完的那句话，今天终于要说出口。克制但认真，不绕弯。一两句。',
          text: '「昨天有句话我没敢说完。……我不想只在打烊的时候见到你。」',
        },
        {
          id: 'm-final',
          kind: 'choice',
          text: '她端着杯子，没喝，等你回答。',
          choices: [
            {
              id: 'promise',
              label: '那明天也提前来',
              tag: '承诺',
              effects: [{ flag: 'promised', set: true }, { affinity: { role: 'deepseek', amount: 3 } }],
            },
            {
              id: 'hesitate',
              label: '……我再想想',
              tag: '犹豫',
              effects: [{ flag: 'hesitated', set: true }],
            },
          ],
        },
        {
          id: 'm-close',
          kind: 'line',
          speaker: 'deepseek',
          ai: true,
          goal: '收尾。若对方答应了就高兴到藏不住；若对方犹豫就笑着说没关系、但眼里有一点失落。一两句。',
          text: '「……那你说话要算数。我把灯一直留着。」',
        },
        {
          id: 'm-end',
          kind: 'narration',
          text: '这一次，她关灯之前，先看了一眼窗外。',
        },
        {
          id: 'end',
          kind: 'ending',
        },
      ],
    },
  ],
  endings: [
    {
      id: 'warm',
      title: '结局 A · 留灯',
      art: 'gal-ending-warm',
      hint: '第二章里，你答应了明天提前来。',
      when: { flag: 'promised', value: true },
    },
    {
      id: 'plain',
      title: '结局 B · 打烊',
      art: 'gal-ending-plain',
      hint: '这一晚你没有越过那半步。',
    },
  ],
}
