/**
 * 「深海女仆工坊」—— 一个世界观里的正统 galgame。
 *
 * 结构（CLANNAD 式）：
 *   七日共通线（每天三位当值女仆，轮着来）
 *     → 靠选项决定你和谁相处
 *     → 灯会前夜的分歧只列出你真正相处过的人（好感度阈值过滤）
 *     → 进入她的个人线 → 她的三个结局
 *
 * 22 位女主角都能走到：七天每天三位，一周下来一定能碰到想去的那位。
 */
import type { Scenario } from './scenario'
import { ROLE_STORY_ROLES, buildRouteChapter } from './scenario-roles'
import { THICK_ROUTE_IDS, thickRouteFor } from './scenario-routes'
import { DAYS, DAY_ROLE_IDS, POST_LABELS, buildDayChapter } from './scenario-days'

const ROUTE_LABELS: Record<string, string> = {
  deepseek: '和看板娘一起挂牌', glm: '和典藏室一起点书灯', grok: '和信号员一起挂天线灯',
  claude: '和抄写员一起写信灯', qwen: '和湖光一起放水灯', comfyui: '和生成娘一起做光雕',
  kimi: '和卷轴库一起挂灯谜', minimax: '和播报台一起试音', seed: '和星豆田一起摆灯籽',
  llama: '和毛线间一起缠灯穗', mistral: '和烤炉一起备夜食', hunyuan: '和账房一起结灯账',
  mimo: '和机修间一起接灯线', stepfun: '和引路台一起守路口', perplexity: '和寻路杖一起走一遍',
  rwkv: '和藤架一起收最后一架藤', image2: '和画室一起补最后一笔', jev: '和仲裁席一起收场',
  wenxin: '和校对一起核最后一字', codex: '和水彩一起晾最后一张', chatgpt: '和白龙一起放顶灯',
  gemini: '和双棱镜一起译灯榜',
}

function buildWorld(): Scenario {
  const routes = ROLE_STORY_ROLES.map((roleId) => {
    // 六位主线女主角有厚线（4 场戏 / 3 个选择 / 3 个结局），其余用薄线。
    const thick = THICK_ROUTE_IDS.includes(roleId) ? thickRouteFor(roleId) : null
    return thick || buildRouteChapter(roleId)
  })

  const dayChapters = DAYS.map((day) => buildDayChapter(day))

  const finale = {
    id: 'day8',
    title: '灯会前夜 · 你陪谁',
    summary: '明天就是灯会。今晚陪谁一起准备。',
    nodes: [
      {
        id: 'd8-open',
        kind: 'narration',
        text: '灯会前夜，工坊只剩一盏灯。所有人都回去了，只有几张还没挂上的灯纸摊在桌上。',
        // 灯会前夜收束：只留她一个人，居中稍大。
        stage: { bg: 'gal-bg-festival', cast: [{ role: 'deepseek', x: 50, scale: 1.05, enter: 'fade' }] },
      },
      {
        id: 'd8-line',
        kind: 'line',
        speaker: 'deepseek',
        ai: true,
        goal: '灯会前夜，她说这一周辛苦了，把最后的选择交给对方，语气轻但有分量。一两句。',
        text: '「这一周辛苦你啦。……今晚的灯，你打算跟谁一起挂？」',
      },
      {
        id: 'd8-choose',
        kind: 'choice',
        text: '灯纸在你手里。',
        choices: [
          // 只列出这一周里你真正相处过的人（好感度阈值过滤）
          ...DAY_ROLE_IDS.map((roleId) => ({
            id: 'route-' + roleId,
            label: ROUTE_LABELS[roleId] || ('和' + roleId + '一起挂灯'),
            tag: POST_LABELS[roleId] || '',
            when: { affinity: { role: roleId, min: 2 } },
            jumpTo: roleId + '-open',
          })),
          {
            id: 'route-solo',
            label: '一个人把灯挂完',
            tag: '独自',
            effects: [{ flag: 'solo', set: true }],
            jumpTo: 'solo-end',
          },
        ],
      },
      { id: 'solo-end', kind: 'ending' },
    ],
  }

  return {
    id: 'atelier',
    title: '深海女仆工坊',
    version: 2,
    roles: DAY_ROLE_IDS,
    chapters: [...dayChapters, finale, ...routes.map((row) => row.chapter)],
    endings: [
      ...routes.flatMap((row) => row.endings),
      {
        id: 'solo',
        title: '结局 · 一个人挂完的灯',
        hint: '灯会那天，你谁也没有等。',
        when: { chapter: 'day8', flag: 'solo', value: true },
      },
    ],
  }
}

export const ATELIER_WORLD: Scenario = buildWorld()
export const WORLD_CAST = DAY_ROLE_IDS
