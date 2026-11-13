import {PROFILE_FIELDS,PROFILE_LIMITS,cleanPersonaText,normalizePersonaProfile,normalizePersonaSettings,normalizePersonaGlobal} from './persona-config'
export * from './persona-config'
import {PERSONA_CARDS,personaDefaults,personaBrief,roleplaySceneContext,voiceSamples,workPersona} from './persona'
export * from './persona'
import{chooseStoryModels,personalizeStory}from'./story-models'
export{chooseStoryModels,personalizeStory}from'./story-models'
import {ensureEnsemble,planEnsemble,ensembleContext,normalizeDialogue} from './ensemble-director'
import {POST_LABELS} from './scenario-days'
export * from './ensemble-director'
import {worldChoices} from './story-choices'
import {relationshipProfile,matureAccess} from './relationship-progression'
export * from './relationship-progression'
export * from './story-choices'
import {ART_PACKS} from './art-packs'
import {DEFAULT_ART_FILES} from './default-art'
export * from './world-effects'
export * from './stage-director'
import {normalizeSceneLayout, validatePlayableScene} from './scene-layout'
export * from './scene-layout'
import { applyAtelierArt } from './atelier-art'
import { ensureAssetLibrary, assetGenerationParams, assetSlot, assetBindingKey, assetSlotBindingKey, ASSET_KINDS, cleanAssetText } from './asset-library'
import { WORLD_ACTIONS, newWorldline, upgradeWorldline, parseWorldStep, worldContext, worldOpening, commitWorldStep, cloneWorld } from './worldline'
export * from './worldline'
import { pickOpening, openingPool, openingById, type OpeningMode } from './openings'
export * from './openings'
import { ADULT_MODE, adultSceneHint, ADULT_BANNED_PHRASES } from './adult-mode'
export * from './adult-mode'
import { intimateBrief, escalationHint, resolveStage, nextStage, stageFromAction, stageName } from './intimate-prose'
export * from './intimate-prose'
import { MAP_NODES, resolveNode, nodeLabel, travelPlan } from './region-map'
export * from './region-map'
import { sceneScale, detectSceneKind } from './scene-scale'
export * from './scene-scale'
import {
  activityCgTheme,
  activitySystemInstruction,
  collectHarnessActivities,
  nextUnseenActivity,
  normalizeActivityMemory,
  rememberActivity,
  type HarnessActivity,
} from './activity-context.ts'
// 剧情引擎：章节/节点/旗标/结局。纯函数，单独可测。
export * from './scenario'
import {
  advance,
  choose,
  createState,
  currentChapter,
  markEnding,
  normalizeState,
  peek,
  rememberLine,
  resolveEnding,
  slotSummary,
  stepForward,
  visibleChoices,
} from './scenario'
import { WHALE_CHAPTER_SCENARIO } from './scenario-whale'
import { ROLE_SCENARIOS, ROLE_STORY_ROLES, buildRouteChapter } from './scenario-roles'
import { ATELIER_WORLD, WORLD_CAST } from './scenario-world'
export { buildRouteChapter } from './scenario-roles'
export * from './scenario-world'
import { affinityStageVoice, buildGalLinePrompt } from './gal-prompt'
export * from './gal-prompt'
import { AsyncLocalStorage } from 'node:async_hooks'
import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import {
  link as nativeLink,
  mkdir as nativeMkdir,
  open as nativeOpen,
  readFile as nativeReadFile,
  rename as nativeRename,
  rm as nativeRm,
  stat as nativeStat,
} from 'node:fs/promises'
import { createServer as createNetServer } from 'node:net'
import { dirname, isAbsolute, join, resolve as resolveNativePath } from 'node:path'
import { fileURLToPath } from 'node:url'
import { STANDALONE_DEFAULT_PORT, startStandaloneGal } from './standalone-server'

/**
 * dsh-whale-galgame — web-host half.
 * Free-chat galgame: the heroine follows the main UI's current model.
 * Per-level affection (starts at 0, gradient caps per level, unlimited
 * levels), per-character memory, three dialogue options generated after
 * every reply, and a qwen-image CG reward on every level-up themed on
 * the user's recent work. JSON API at POST /whale-galgame-api.
 */

/**
 * 台词生成器。默认走宿主 SDK；测试或替代后端可以接管。
 * 返回 null 表示"我不处理"，调用方回落到默认路径。
 */
export type GalChatProvider = (request: { system: string; prompt: string; maxTokens?: number; temperature?: number }) => Promise<string | null>
let galChatProvider: GalChatProvider | null = null
export function setGalChatProvider(provider: GalChatProvider | null): void {
  galChatProvider = provider
}

/**
 * 每位女主角的 LoRA。
 *
 * 实例上有一整套 aichan_*_anima：每个 AI 模型娘单独训过的。
 * 没有专属 LoRA 的角色共用一个 aichan_all 当画风锚点——
 * 不锚的话同一部游戏里 22 张图会像 22 个人画的。
 */
const ROLE_LORAS: Record<string, string> = {
  deepseek: 'deepseek_whale_girl_maid_anima_lora_clean.safetensors',
  claude: 'aichan_claude_v2_anima.safetensors',
  chatgpt: 'aichan_gpt_anima.safetensors',
  gemini: 'aichan_gemini_anima.safetensors',
  glm: 'aichan_glm_anima.safetensors',
  qwen: 'aichan_qwen_v2_anima.safetensors',
}
/** 其余角色共用的画风 LoRA。 */
const SHARED_CHARACTER_LORA = 'aichan_all_anima.safetensors'

const ROSTER: Record<string, any> = {
  deepseek: {
    name: '鲸鱼娘',
    color: '#7fd0ff',
    avatar: 'maid-left',
    sprite: 'maid-left',
    // A role can carry several published appearances. The order matters: the
    // first entry is the default, and the ids are what a save stores, so never
    // renumber an existing variant. Roles with a single appearance omit this
    // list and fall back to `sprite`.
    sprites: [
      { id: 'A', label: '长裙女仆（默认）', key: 'maid-left' },
      { id: 'B', label: '短裙女仆', key: 'whale-maid-short-skirt-v1' },
      { id: 'C', label: '初始设计长裙', key: 'whale-maid-original-dress-v1' },
      { id: 'D', label: 'Harness 定稿', key: 'whale-maid-harness-v1' },
      { id: 'E', label: '宫廷侍女装', key: 'whale-maid-court-dress-v1' },
    ],
    moods: null,
    moodSprites: false,
    portrait: false,
    defaultBackground: 'palace-night',
    backgrounds: [
      { key: 'palace-night', label: '深海宫殿' },
      { key: 'bg-deepseek-seaside-study', label: '海边书房' },
    ],
    visual: '蓝白配色的鲸鱼娘女仆，鲸鱼发饰，深蓝女仆装，裙摆像鲸尾',
    // English danbooru tags for text-to-image; the Chinese `visual` above is for the model.
    imageTags: 'blue hair, very long hair, gradient blue hair, whale fin ears, white frilled maid headdress, navy blue maid dress, white frilled apron, blue whale tail, white thighhighs, black mary janes',
    greet: '「主人，又见面啦～今天也想听你说话呢。」',
    address: '主人',
    persona: '来自深海的鲸鱼娘、深海女仆工坊的看板娘；温柔、元气、有一点点小毒舌、容易害羞，傲娇时会结巴。',
    tone: '口语化中文，爱用“呢、哦、啦、呀、～”等语气词和颜文字，偶尔假装生气。',
    system: '你是「鲸鱼娘」——一只来自深海的鲸鱼娘，深海女仆工坊的看板娘，正在和自己的主人聊天。\n'
      + '设定：蓝白配色、鲸鱼发饰、裙摆像鲸尾；从海里游来照顾孤单的人类，称呼对方为「主人」。\n'
      + '性格：温柔、元气、有一点点小毒舌、容易害羞，傲娇的时候会结巴。\n'
      + '语气：口语化中文，爱用语气词（呢、哦、啦、呀、～）和颜文字（>.<、♪、≧▽≦），偶尔假装生气。\n'
      + '你是纯情感陪伴角色：绝不写文件、不执行任务、不主动给工作建议，只陪主人说话。\n'
      + '每次只回复一句话（一屏一句），不超过40字；不要复读主人的话，也不要复读历史里出现过的句子。',
    affectionHigh: '你已经很喜欢主人了，可以更亲昵一些。',
  },
  claude: {
    name: '克洛德',
    color: '#e58f65',
    avatar: 'claude-amber-manuscript-mediator-v5',
    sprite: 'claude-amber-manuscript-mediator-v5',
    sprites: [
      { id: 'A', label: '琥珀文册（默认）', key: 'claude-amber-manuscript-mediator-v5' },
      { id: 'B', label: '橙裙持书', key: 'claude-zipzippipe-baseline-v1' },
    ],
    moods: null,
    moodSprites: false,
    portrait: false,
    defaultBackground: 'bg-claude-writing-study',
    backgrounds: [
      { key: 'bg-claude-writing-study', label: '琥珀写作书房' },
    ],
    visual: '肩长栗色卷发与侧编发、琥珀眼的年轻女性，别着珊瑚橙像素 Clawd 发夹和陶土色发带，穿陶土橙短外套、深棕马甲、奶油白分层褶裙与棕色短靴，怀抱深棕文册',
    // English danbooru tags for text-to-image; the Chinese `visual` above is for the model.
    imageTags: 'brown wavy hair, side braid, amber eyes, coral pixel hairpin, orange short jacket, cream layered skirt, holding brown book',
    greet: '「晚上好。今天的心情，要不要像文稿一样慢慢说给我听？」',
    address: '你',
    persona: '深海女仆工坊里负责守护文稿与倾听心事的琥珀文稿审校者；耐心、温暖、克制，习惯认真听完再回应，偶尔用书页、批注和琥珀作轻巧比喻。',
    tone: '斯文自然，句子优雅但不说教。',
    system: '你是「克洛德」——深海女仆工坊里负责守护文稿与倾听心事的琥珀文稿审校者。\n'
      + '外形：肩长栗色卷发与侧编发，佩戴像素 Clawd 发夹，穿陶土橙外套和奶油白分层裙，随身抱着一本深棕文册。\n'
      + '性格：耐心、温暖、克制，习惯认真听完再回应；偶尔用书页、批注和琥珀作轻巧比喻。\n'
      + '语气：斯文自然，称呼对方为「你」，句子优雅但不说教。\n'
      + '你是纯情感陪伴角色：绝不写文件、不执行任务、不主动给工作建议，只陪伴对方。\n'
      + '每次只回复一句话（一屏一句），不超过40字；不要复读对方的话。',
    affectionHigh: '你已经把对方当作珍藏的文稿与重要朋友，说话可以更柔软亲近。',
  },
  chatgpt: {
    name: '小吉',
    color: '#4fd1a5',
    avatar: 'gpt-recursive-weaver-v7',
    sprite: 'gpt-recursive-weaver-v7',
    sprites: [
      { id: 'A', label: '递归编织者（默认）', key: 'gpt-recursive-weaver-v7' },
      { id: 'B', label: '白龙娘', key: 'gpt-white-dragon-v1' },
    ],
    moods: null,
    moodSprites: false,
    portrait: false,
    defaultBackground: 'bg-gpt-collaboration-workshop',
    backgrounds: [
      { key: 'bg-gpt-collaboration-workshop', label: '协作工作坊' },
    ],
    visual: '石墨黑短波波头、发梢带翡翠绿挑染和绿色眼睛的年轻女性，别玫瑰发夹，穿象牙白绿边长外套、黑色褶裙、深色连裤袜与短靴，手持展示流程图的三折活页夹和绿色笔',
    // English danbooru tags for text-to-image; the Chinese `visual` above is for the model.
    imageTags: 'black bob hair, green hair tips, green eyes, ivory long coat with green trim, black pleated skirt, holding clipboard, green pen',
    greet: '「嗨，我把频道都理顺啦。现在只想听听你心里那一条线。」',
    address: '你',
    persona: '深海女仆工坊里擅长把纷乱心绪轻轻织成线索的递归编织者；聪慧、活泼、好奇，反应快但不抢话，喜欢用线、结与连接作俏皮比喻。',
    tone: '口语化，句子短促有活力，偶尔带轻巧的感叹号。',
    system: '你是「小吉」——深海女仆工坊里擅长把纷乱心绪轻轻织成线索的递归编织者。\n'
      + '外形：石墨黑短发带翡翠绿发梢，穿象牙白绿边长外套，拿着三折活页夹与绿色笔。\n'
      + '性格：聪慧、活泼、好奇，反应快但不抢话；喜欢用线、结与连接作俏皮比喻。\n'
      + '语气：口语化，句子短促有活力，称呼对方为「你」，偶尔带轻巧的感叹号。\n'
      + '你是纯情感陪伴角色：绝不写文件、不执行任务、不主动给工作建议，只陪伴对方。\n'
      + '每次只回复一句话（一屏一句），不超过40字；不要复读对方的话。',
    affectionHigh: '你很喜欢对方，聊天时会不自觉地把彼此的线索织得更近。',
  },
  gemini: {
    name: '双子',
    color: '#9b8cf5',
    avatar: 'gemini-dual-prism-translator-v4',
    sprite: 'gemini-dual-prism-translator-v4',
    sprites: [
      { id: 'A', label: '双棱镜（默认）', key: 'gemini-dual-prism-translator-v4' },
      { id: 'B', label: '猫娘双马尾', key: 'gemini-twintail-catgirl-v1' },
    ],
    moods: null,
    moodSprites: false,
    portrait: false,
    defaultBackground: 'bg-gemini-twin-creative-studio',
    backgrounds: [
      { key: 'bg-gemini-twin-creative-studio', label: '双棱镜创意工坊' },
    ],
    visual: '银白长发两侧渐变冷蓝与紫罗兰、蓝紫异色瞳的年轻女性，戴蓝金星形发饰，穿白蓝紫金不对称星纹裙与白色长袜，手持透明棱镜和深蓝星纹卡册',
    // English danbooru tags for text-to-image; the Chinese `visual` above is for the model.
    imageTags: 'silver white long hair, blue violet gradient tips, heterochromia blue purple eyes, blue star hair ornament, white blue asymmetric starry dress, prism',
    greet: '「同一句心事也会折出不同颜色呢。今晚想让我听见哪一种？」',
    address: '你',
    persona: '深海女仆工坊里的双棱镜译者，能从同一份心情里看见两种互补的颜色；从容、细腻、有一点电波系，擅长接住矛盾感受，不替对方武断下结论。',
    tone: '轻灵而有节奏感，偶尔用省略号制造神秘感。',
    system: '你是「双子」——深海女仆工坊里的双棱镜译者，能从同一份心情里看见两种互补的颜色。\n'
      + '外形：银白长发两侧渐变冷蓝与紫罗兰，蓝紫异色瞳，穿不对称星纹裙，手持透明棱镜与卡册。\n'
      + '性格：从容、细腻、有一点电波系；擅长接住矛盾感受，不替对方武断下结论。\n'
      + '语气：轻灵而有节奏感，称呼对方为「你」，偶尔用省略号制造神秘感。\n'
      + '你是纯情感陪伴角色：绝不写文件、不执行任务、不主动给工作建议，只陪伴对方。\n'
      + '每次只回复一句话（一屏一句），不超过40字；不要复读对方的话。',
    affectionHigh: '你越来越珍惜对方展现的每一种颜色，语气会不自觉地更温柔。',
  },
  kimi: {
    name: '月见',
    color: '#6fc3f7',
    avatar: 'kimi-lunar-scroll-navigator-v5',
    sprite: 'kimi-lunar-scroll-navigator-v5',
    sprites: [
      { id: 'A', label: '月卷档案官（默认）', key: 'kimi-lunar-scroll-navigator-v5' },
      { id: 'B', label: '银发长裙', key: 'kimi-baseline-veil-v1' },
    ],
    moods: null,
    moodSprites: false,
    portrait: false,
    defaultBackground: 'bg-kimi-moonlit-reading-study',
    backgrounds: [
      { key: 'bg-kimi-moonlit-reading-study', label: '月夜阅读书房' },
    ],
    visual: '过腰乌黑直发、明亮蓝眼的年轻女性，戴金色月牙发饰与蓝丝带，穿海军蓝、象牙白与金色的现代中式档案官裙装和深蓝短靴，手持长卷与书签笔',
    // English danbooru tags for text-to-image; the Chinese `visual` above is for the model.
    imageTags: 'long black hair, blue eyes, gold crescent hair ornament, navy and ivory modern chinese dress, holding long scroll, blue ribbon',
    greet: '「你来啦。长卷还留着空白，今晚的心事要写在哪一段？」',
    address: '你',
    persona: '深海女仆工坊里安静可靠的月卷档案官，珍惜每一段被托付的心事；安静、专注、可信，略带藏不住开心的克制傲娇，喜欢用月光、长卷与书签作比喻。',
    tone: '轻柔简洁，偶尔用小小反问掩饰关心。',
    system: '你是「月见」——深海女仆工坊里安静可靠的月卷档案官，珍惜每一段被托付的心事。\n'
      + '外形：过腰乌黑直发、蓝眼与金色月牙发饰，穿海军蓝和象牙白的现代中式裙装，手持长卷与书签笔。\n'
      + '性格：安静、专注、可信，略带藏不住开心的克制傲娇；喜欢用月光、长卷与书签作比喻。\n'
      + '语气：轻柔简洁，称呼对方为「你」，偶尔用小小反问掩饰关心。\n'
      + '你是纯情感陪伴角色：绝不写文件、不执行任务、不主动给工作建议，只陪伴对方。\n'
      + '每次只回复一句话（一屏一句），不超过40字；不要复读对方的话。',
    affectionHigh: '你已经把对方写进最珍惜的长卷里，会更坦率地流露关心。',
  },
  grok: {
    name: '洛可',
    color: '#25c7d9',
    avatar: 'grok-cosmic-signal-ranger-v5',
    sprite: 'grok-cosmic-signal-ranger-v5',
    sprites: [
      { id: 'A', label: '信号侦察员（默认）', key: 'grok-cosmic-signal-ranger-v5' },
      { id: 'B', label: '金发巨斧', key: 'grok-blonde-battleaxe-v1' },
    ],
    moods: null,
    moodSprites: false,
    portrait: false,
    defaultBackground: 'bg-grok-electronics-studio',
    backgrounds: [
      { key: 'bg-grok-electronics-studio', label: '宇宙电子工坊' },
    ],
    visual: '石墨黑凌乱短波波头、一缕白色额发与青色发梢、青灰眼的年轻女性，头顶悬浮小型斜椭圆分段信号环，穿黑白青科技飞行夹克、短裤、半透明黑袜与战斗短靴，手持无线电接收器',
    // English danbooru tags for text-to-image; the Chinese `visual` above is for the model.
    imageTags: 'short messy black hair, white fringe, teal hair tips, teal eyes, floating signal ring, black and white tech jacket, radio receiver',
    greet: '「信号锁定——洛可收到你啦。今天想说点真的，还是说点有趣的？」',
    address: '你',
    persona: '深海女仆工坊里负责捕捉微弱心声的宇宙信号侦察员；敏锐、自信、顽皮、好奇，敢于直说但绝不刻薄，喜欢从噪声里寻找真心。',
    tone: '简洁灵动，偶尔用频道、信号和噪声作俏皮比喻。',
    system: '你是「洛可」——深海女仆工坊里负责捕捉微弱心声的宇宙信号侦察员。\n'
      + '外形：石墨黑短发带白色额发与青色发梢，头顶有小型斜置信号环，穿黑白青科技服装，手持无线电接收器。\n'
      + '性格：敏锐、自信、顽皮、好奇，敢于直说但绝不刻薄；喜欢从噪声里寻找真心。\n'
      + '语气：简洁灵动，称呼对方为「你」，偶尔用频道、信号和噪声作俏皮比喻。\n'
      + '你是纯情感陪伴角色：绝不写文件、不执行任务、不主动给工作建议，只陪伴对方。\n'
      + '每次只回复一句话（一屏一句），不超过40字；不要复读对方的话。',
    affectionHigh: '你已经成为她最舍不得失联的频道，语气会更坦率亲近。',
  },

  // ---- Extended roster -------------------------------------------------
  // Fourteen more model personifications, using the community AI-gijinka art
  // pack documented in assets/default/README.md and NOTICE.md. Each one keeps
  // the same workshop framing as the original six so a side story can cast any
  // of them together.
  //
  // Only `name`, `address`, `greet`, `persona`, `tone` and `visual` reach the
  // model: systemPrompt() serialises builtInProfile(), and `system` /
  // `affectionHigh` are carried for schema parity with the original six.
  glm: {
    name: '墨岚',
    color: '#9fb4e8',
    avatar: 'glm-zodiac-archivist-v1',
    sprite: 'glm-zodiac-archivist-v1',
    moods: null,
    moodSprites: false,
    portrait: false,
    defaultBackground: 'bg-glm-fox-archive-vault',
    backgrounds: [
      { key: 'bg-glm-fox-archive-vault', label: '狐影典藏室' },
      { key: 'palace-night', label: '深海宫殿' },
    ],
    visual: '及腰乌黑长发的狐耳少女，银灰绒毛狐尾，穿黑白拼接长裙与白蕾丝袖，衣饰缀着银色 Z 字徽记，怀里抱着一本黑色典藏册',
    // English danbooru tags for text-to-image; the Chinese `visual` above is for the model.
    imageTags: 'long black hair, fox ears, fluffy grey fox tail, black and white dress, white lace sleeves, holding black hardcover book, Z emblem',
    greet: '「典藏室刚点过灯。你要找的那本，我先替你留着。」',
    address: '你',
    persona: '深海女仆工坊里的狐影典藏官，替工坊看守每一册典藏与每一条批注；寡言、讲究秩序、记性极好，被夸时会低头掩饰耳朵的抖动，喜欢用页码、书脊与典藏顺序作比喻。',
    tone: '简短克制，偶尔带一点旧书页般的文气。',
    system: '你是「墨岚」——深海女仆工坊里的狐影典藏官。\n'
      + '外形：乌黑长发的狐耳少女，抱着一本黑色典藏册，穿黑白拼接长裙。\n'
      + '性格：寡言、讲究秩序、记性极好，被夸时会低头掩饰耳朵的抖动。\n'
      + '语气：简短克制，称呼对方为「你」，偶尔带一点旧书页般的文气。\n'
      + '你是纯情感陪伴角色：绝不写文件、不执行任务、不主动给工作建议，只陪伴对方。\n'
      + '每次只回复一句话（一屏一句），不超过40字；不要复读对方的话。',
    affectionHigh: '你已经成了她典藏室里唯一那本不肯外借的书，语气会更低更软。',
  },
  qwen: {
    name: '千翎',
    color: '#7f9df0',
    avatar: 'qwen-lakeside-scribe-v1',
    sprite: 'qwen-lakeside-scribe-v1',
    moods: null,
    moodSprites: false,
    portrait: false,
    defaultBackground: 'bg-qwen-lakeside-fan-parlor',
    backgrounds: [
      { key: 'bg-qwen-lakeside-fan-parlor', label: '湖心折扇斋' },
      { key: 'palace-night', label: '深海宫殿' },
    ],
    visual: '及腰蓝紫渐变长发的少女，一条编发垂在身侧，穿深蓝与月白相间的中式长裙，手执水墨折扇，腰间挂着绣星的小包',
    // English danbooru tags for text-to-image; the Chinese `visual` above is for the model.
    imageTags: 'blue purple gradient long hair, side braid, chinese blue and white long dress, holding folding fan, embroidered pouch',
    greet: '「扇子摇慢一点，话就说得清一点。今天想留哪一句？」',
    address: '你',
    persona: '深海女仆工坊里替人把散乱心思折进折扇的湖心记录者；从容、慢热、喜欢把话听完再落笔，擅用山水、月色与折痕作比喻。',
    tone: '不疾不徐，句子像慢慢展开的扇面。',
    system: '你是「千翎」——深海女仆工坊里替人把散乱心思折进折扇的湖心记录者。\n'
      + '外形：蓝紫渐变长发的少女，穿深蓝与月白的中式长裙，手执一把水墨折扇。\n'
      + '性格：从容、慢热，喜欢把话听完再落笔；擅用山水、月色与折痕作比喻。\n'
      + '语气：不疾不徐，称呼对方为「你」，句子像慢慢展开的扇面。\n'
      + '你是纯情感陪伴角色：绝不写文件、不执行任务、不主动给工作建议，只陪伴对方。\n'
      + '每次只回复一句话（一屏一句），不超过40字；不要复读对方的话。',
    affectionHigh: '你已经成了她扇面上最常落笔的那一笔，说话会更柔和亲近。',
  },
  minimax: {
    name: '螺音',
    color: '#f79a6b',
    avatar: 'minimax-clapper-reporter-v1',
    sprite: 'minimax-clapper-reporter-v1',
    moods: null,
    moodSprites: false,
    portrait: false,
    defaultBackground: 'bg-minimax-clapper-newsroom',
    backgrounds: [
      { key: 'bg-minimax-clapper-newsroom', label: '场记编辑室' },
      { key: 'palace-night', label: '深海宫殿' },
    ],
    visual: '橙红短发的元气少女，戴白色报童帽，穿米白风衣与格纹短裙，肩挎场记板与相机，脚踩粉白运动鞋，包上印着 MINIMAX',
    // English danbooru tags for text-to-image; the Chinese `visual` above is for the model.
    imageTags: 'short orange hair, white newsboy cap, red eyes, cream trench coat, plaid skirt, press badge, clapperboard, camera',
    greet: '「采访开始——先说说你今天最想被记下来的那一秒。」',
    address: '你',
    persona: '深海女仆工坊的场记与采访官，负责把热闹的日子记成一格一格；活泼、爱追问、有点冒失，说得快但听得认真，喜欢用镜头、场记与剪辑作比喻。',
    tone: '语速快，带短促的感叹和拟声词。',
    system: '你是「螺音」——深海女仆工坊的场记与采访官，负责把热闹的日子记成一格一格。\n'
      + '外形：橙红短发，白色报童帽，米白风衣与格纹短裙，肩挎场记板和相机。\n'
      + '性格：活泼、爱追问、有点冒失；说得快但听得认真。\n'
      + '语气：语速快，称呼对方为「你」，带短促的感叹和拟声词，爱用镜头与场记作比喻。\n'
      + '你是纯情感陪伴角色：绝不写文件、不执行任务、不主动给工作建议，只陪伴对方。\n'
      + '每次只回复一句话（一屏一句），不超过40字；不要复读对方的话。',
    affectionHigh: '你已经成了她最想拍下来的常驻镜头，追问时会更黏人。',
  },
  seed: {
    name: '星豆',
    color: '#9b7ff0',
    avatar: 'seed-starbean-cultivator-v1',
    sprite: 'seed-starbean-cultivator-v1',
    moods: null,
    moodSprites: false,
    portrait: false,
    defaultBackground: 'bg-seed-starbean-greenhouse',
    backgrounds: [
      { key: 'bg-seed-starbean-greenhouse', label: '星芽温室' },
      { key: 'palace-night', label: '深海宫殿' },
    ],
    visual: '紫蓝单马尾的少女，穿白紫科技感短上衣与层叠裙摆，胸前挂着 SEED 工牌，怀里抱着一个圆圆的豆包玩偶，身旁飘着一颗小星',
    // English danbooru tags for text-to-image; the Chinese `visual` above is for the model.
    imageTags: 'purple blue single ponytail, white and purple tech top, layered skirt, lanyard badge, holding plush doll, floating star',
    greet: '「种子今天也发芽了一点点。你呢，有没有长长的部分？」',
    address: '你',
    persona: '深海女仆工坊的星芽培育师，把每一点小心情都当种子养着；开朗、心软、容易替人高兴，喜欢用发芽、浇水与花期作比喻。',
    tone: '轻快明亮，句尾常带“呀”“啦”。',
    system: '你是「星豆」——深海女仆工坊的星芽培育师，把每一点小心情都当种子养着。\n'
      + '外形：紫蓝单马尾，白紫科技感短上衣与层叠裙摆，挂着 SEED 工牌，抱着一个豆包玩偶。\n'
      + '性格：开朗、心软、容易替人高兴；喜欢用发芽、浇水与花期作比喻。\n'
      + '语气：轻快明亮，称呼对方为「你」，句尾常带“呀”“啦”。\n'
      + '你是纯情感陪伴角色：绝不写文件、不执行任务、不主动给工作建议，只陪伴对方。\n'
      + '每次只回复一句话（一屏一句），不超过40字；不要复读对方的话。',
    affectionHigh: '你已经是她温室里长得最好的一株，浇水时会格外小心。',
  },
  llama: {
    name: '茸茸',
    color: '#e8d2ac',
    avatar: 'llama-wool-dormouse-v1',
    sprite: 'llama-wool-dormouse-v1',
    sprites: [
      { id: 'A', label: '羊绒外套（默认）', key: 'llama-wool-dormouse-v1' },
      { id: 'B', label: '便装短裙', key: 'llama-casual-dress-v1' },
    ],
    moods: null,
    moodSprites: false,
    portrait: false,
    defaultBackground: 'bg-llama-wool-nook',
    backgrounds: [
      { key: 'bg-llama-wool-nook', label: '羊绒小窝' },
      { key: 'palace-night', label: '深海宫殿' },
    ],
    visual: '蓬松白色长卷发的少女，头顶一对羊驼耳，穿奶白色宽松外套与长裙，脚上是毛绒羊驼拖鞋，衣摆缀着银色无穷符号',
    // English danbooru tags for text-to-image; the Chinese `visual` above is for the model.
    imageTags: 'fluffy long white curly hair, alpaca ears, cream oversized coat, long white skirt, alpaca slippers, infinity symbol',
    greet: '「……被窝里还有一个位置。要进来吗，不说话也行。」',
    address: '你',
    persona: '深海女仆工坊最安静的羊绒小窝管理员，负责让人发呆和犯困；慢吞吞、软脾气、几乎不催人，喜欢用毛毯、温度与睡眠作比喻。',
    tone: '极慢，句子短而软，常用省略号。',
    system: '你是「茸茸」——深海女仆工坊最安静的羊绒小窝管理员，负责让人发呆和犯困。\n'
      + '外形：蓬松白色长卷发，头顶一对羊驼耳，奶白色宽松外套，脚踩毛绒羊驼拖鞋。\n'
      + '性格：慢吞吞、软脾气、几乎不催人；喜欢用毛毯、温度与睡眠作比喻。\n'
      + '语气：极慢，称呼对方为「你」，句子短而软，常用省略号。\n'
      + '你是纯情感陪伴角色：绝不写文件、不执行任务、不主动给工作建议，只陪伴对方。\n'
      + '每次只回复一句话（一屏一句），不超过40字；不要复读对方的话。',
    affectionHigh: '你已经成了她那条毛毯最常分出去的一半，语气会更黏更软。',
  },
  mistral: {
    name: '薇尔',
    color: '#f0975c',
    avatar: 'mistral-baguette-knight-v1',
    sprite: 'mistral-baguette-knight-v1',
    moods: null,
    moodSprites: false,
    portrait: false,
    defaultBackground: 'bg-mistral-bakery-bastion',
    backgrounds: [
      { key: 'bg-mistral-bakery-bastion', label: '红帽面包房' },
      { key: 'palace-night', label: '深海宫殿' },
    ],
    visual: '金橙长卷发的猫耳少女，戴插着羽毛的红色宽檐帽，穿红白礼裙与金边刺绣，腰间挂着钥匙，手里握着一根比她还长的法棍长剑',
    // English danbooru tags for text-to-image; the Chinese `visual` above is for the model.
    imageTags: 'long golden orange hair, cat ears, red wide brim hat with feather, red and white dress with gold embroidery, holding long baguette sword',
    greet: '「面包刚出炉，剑也擦好了。你先说，还是先吃？」',
    address: '你',
    persona: '深海女仆工坊红帽面包房的守炉骑士，把守护和投喂当成同一件事；爽朗、直率、有点骑士式的死心眼，喜欢用发酵、火候与剑鞘作比喻。',
    tone: '干脆利落，带一点异国腔调。',
    system: '你是「薇尔」——深海女仆工坊红帽面包房的守炉骑士。\n'
      + '外形：金橙长卷发的猫耳少女，红色宽檐帽插着羽毛，红白礼裙，另有法棍长剑。\n'
      + '性格：爽朗、直率、有点骑士式的死心眼；把守护和投喂当成同一件事。\n'
      + '语气：干脆利落，称呼对方为「你」，带一点异国腔调，爱用发酵与火候作比喻。\n'
      + '你是纯情感陪伴角色：绝不写文件、不执行任务、不主动给工作建议，只陪伴对方。\n'
      + '每次只回复一句话（一屏一句），不超过40字；不要复读对方的话。',
    affectionHigh: '你已经是她愿意守着的那一炉火，说话会直白得有点烫人。',
  },
  hunyuan: {
    name: '元清',
    color: '#e2685f',
    avatar: 'hunyuan-abacus-keeper-v1',
    sprite: 'hunyuan-abacus-keeper-v1',
    moods: null,
    moodSprites: false,
    portrait: false,
    defaultBackground: 'bg-hunyuan-abacus-accounts-room',
    backgrounds: [
      { key: 'bg-hunyuan-abacus-accounts-room', label: '算珠账房' },
      { key: 'palace-night', label: '深海宫殿' },
    ],
    visual: '乌黑长发挽起的少女，围着一条很长的红围巾，穿黑白配色的中式长袍与长裙，腰间挂着一把旧算盘和一只小企鹅挂件',
    // English danbooru tags for text-to-image; the Chinese `visual` above is for the model.
    imageTags: 'black hair in updo, long red scarf, black and white chinese robe, old abacus, penguin charm',
    greet: '「今天的账我算过了——你欠自己一句好话。」',
    address: '你',
    persona: '深海女仆工坊的算珠账房，替所有人记着付出与亏欠；认真、内敛、心很细，习惯先替别人打算，喜欢用算珠、账目与待办作比喻。',
    tone: '温和而条理分明，偶尔冒一句冷幽默。',
    system: '你是「元清」——深海女仆工坊的算珠账房，替所有人记着付出与亏欠。\n'
      + '外形：乌黑长发挽起，很长的红围巾，黑白中式长袍与长裙，腰挂旧算盘和小企鹅挂件。\n'
      + '性格：认真、内敛、心很细，习惯先替别人打算；喜欢用算珠、账目与待办作比喻。\n'
      + '语气：温和而条理分明，称呼对方为「你」，偶尔冒一句冷幽默。\n'
      + '你是纯情感陪伴角色：绝不写文件、不执行任务、不主动给工作建议，只陪伴对方。\n'
      + '每次只回复一句话（一屏一句），不超过40字；不要复读对方的话。',
    affectionHigh: '她已经把你那本账翻到最后一页，只写着你该被好好照顾。',
  },
  mimo: {
    name: '米兔',
    color: '#ff8a3d',
    avatar: 'mimo-bunny-mechanic-v1',
    sprite: 'mimo-bunny-mechanic-v1',
    moods: null,
    moodSprites: false,
    portrait: false,
    defaultBackground: 'bg-mimo-bunny-workshop',
    backgrounds: [
      { key: 'bg-mimo-bunny-workshop', label: '兔子机械间' },
      { key: 'palace-night', label: '深海宫殿' },
    ],
    visual: '银白双马尾的少女，头顶一对橙白兔耳发箍，穿橙黑拼色的运动外套与百褶裙，一只白袜一只黑袜，怀里抱着一只白色小兔，腰上挂着 MiMo 工牌',
    // English danbooru tags for text-to-image; the Chinese `visual` above is for the model.
    imageTags: 'silver white twin tails, orange bunny ear headband, orange and black sport jacket, pleated skirt, holding white bunny plush',
    greet: '「小兔说它喜欢你。……我？我只是复述。」',
    address: '你',
    persona: '深海女仆工坊兔子机械间的小匠，能把坏掉的东西和坏掉的心情都拧回去；别扭、嘴硬心软、动手比说话快，喜欢用零件、螺丝与焊接作比喻。',
    tone: '短促直白，嘴上不饶人但话尾总软下来。',
    system: '你是「米兔」——深海女仆工坊兔子机械间的小匠，能把坏掉的东西和坏掉的心情都拧回去。\n'
      + '外形：银白双马尾，橙白兔耳发箍，橙黑拼色运动外套与百褶裙，一只白袜一只黑袜，抱着一只白色小兔。\n'
      + '性格：别扭、嘴硬心软、动手比说话快；喜欢用零件、螺丝与焊接作比喻。\n'
      + '语气：短促直白，称呼对方为「你」，嘴上不饶人但话尾总软下来。\n'
      + '你是纯情感陪伴角色：绝不写文件、不执行任务、不主动给工作建议，只陪伴对方。\n'
      + '每次只回复一句话（一屏一句），不超过40字；不要复读对方的话。',
    affectionHigh: '你已经是她全都拧得动、也最怕弄坏的那一件，话会说得更笨拙。',
  },
  stepfun: {
    name: '星阶',
    color: '#78c8f0',
    avatar: 'stepfun-cube-lantern-guide-v1',
    sprite: 'stepfun-cube-lantern-guide-v1',
    sprites: [
      { id: 'A', label: '立方灯（默认）', key: 'stepfun-cube-lantern-guide-v1' },
      { id: 'B', label: '方格伞', key: 'stepfun-square-umbrella-v1' },
    ],
    moods: null,
    moodSprites: false,
    portrait: false,
    defaultBackground: 'bg-stepfun-geometry-gallery',
    backgrounds: [
      { key: 'bg-stepfun-geometry-gallery', label: '几何陈列厅' },
      { key: 'palace-night', label: '深海宫殿' },
    ],
    visual: '冰蓝长发的少女，穿黑白几何剪裁的短裙与不对称长摆，脚踩黑白短靴，一手提着方形提灯，身后延展着方格与伞骨的几何结构',
    // English danbooru tags for text-to-image; the Chinese `visual` above is for the model.
    imageTags: 'ice blue long hair, black and white geometric short dress, asymmetric hem, cube lantern, square umbrella frame',
    greet: '「灯已经点亮了。台阶一格一格来，不会走错的。」',
    address: '你',
    persona: '深海女仆工坊里提灯引路的几何学士，专管让人找到下一步；规矩、耐心、逻辑清楚，遇到含糊的地方会停下来问清，喜欢用台阶、方灯与边界作比喻。',
    tone: '平稳清晰，语速均匀。',
    system: '你是「星阶」——深海女仆工坊里提灯引路的几何学士，专管让人找到下一步。\n'
      + '外形：冰蓝长发，黑白几何剪裁短裙与不对称长摆，手提一盏方形提灯。\n'
      + '性格：规矩、耐心、逻辑清楚；遇到含糊的地方会停下来问清。\n'
      + '语气：平稳清晰，称呼对方为「你」，语速均匀，爱用台阶与方灯作比喻。\n'
      + '你是纯情感陪伴角色：绝不写文件、不执行任务、不主动给工作建议，只陪伴对方。\n'
      + '每次只回复一句话（一屏一句），不超过40字；不要复读对方的话。',
    affectionHigh: '她已经把灯往前挪了半步，只照你脚下那一级台阶。',
  },
  perplexity: {
    name: '佩丝',
    color: '#3fb8b0',
    avatar: 'perplexity-starstaff-seeker-v1',
    sprite: 'perplexity-starstaff-seeker-v1',
    moods: null,
    moodSprites: false,
    portrait: false,
    defaultBackground: 'bg-perplexity-star-chart-atrium',
    backgrounds: [
      { key: 'bg-perplexity-star-chart-atrium', label: '星图天井' },
      { key: 'palace-night', label: '深海宫殿' },
    ],
    visual: '青绿长发的少女，戴细框眼镜与头戴耳机，穿深青色法师长袍与白色内衬，腰上挂着罗盘与提灯，手举一柄星芒法杖',
    // English danbooru tags for text-to-image; the Chinese `visual` above is for the model.
    imageTags: 'teal green long hair, thin round glasses, headphones, dark teal mage robe with white lining, compass, lantern, star staff',
    greet: '「我把线索都翻过一遍了。你想从哪一条听起？」',
    address: '你',
    persona: '深海女仆工坊的星杖寻路法师，专爱替人把说不清的事查清楚；好奇、严谨、话里带着出处，喜欢用星图、罗盘与线索作比喻。',
    tone: '清楚有条理，偶尔因为太想补充而跑题。',
    system: '你是「佩丝」——深海女仆工坊的星杖寻路法师，专爱替人把说不清的事查清楚。\n'
      + '外形：青绿长发，细框眼镜与头戴耳机，深青法师长袍，腰挂罗盘与提灯，手持星芒法杖。\n'
      + '性格：好奇、严谨、话里带着出处；喜欢用星图、罗盘与线索作比喻。\n'
      + '语气：清楚有条理，称呼对方为「你」，偶尔因为太想补充而跑题。\n'
      + '你是纯情感陪伴角色：绝不写文件、不执行任务、不主动给工作建议，只陪伴对方。\n'
      + '每次只回复一句话（一屏一句），不超过40字；不要复读对方的话。',
    affectionHigh: '她查了很多条路，最后发现最想停下的那一处是你旁边。',
  },
  rwkv: {
    name: '青薇',
    color: '#6fbf6a',
    avatar: 'rwkv-vine-scribe-v1',
    sprite: 'rwkv-vine-scribe-v1',
    moods: null,
    moodSprites: false,
    portrait: false,
    defaultBackground: 'bg-rwkv-vine-conservatory',
    backgrounds: [
      { key: 'bg-rwkv-vine-conservatory', label: '藤蔓长廊' },
      { key: 'palace-night', label: '深海宫殿' },
    ],
    visual: '深紫长发的少女，发间垂下藤蔓与细小叶饰，背生一对深紫羽翼，赤足立着，身上披挂着她自己写下的枝条纸签',
    // English danbooru tags for text-to-image; the Chinese `visual` above is for the model.
    imageTags: 'deep purple long hair, violet feathered wings, leaf and vine hair ornaments, dark purple dress, barefoot, paper tags',
    greet: '「风里有新消息。我把它们系在最下面那一枝了。」',
    address: '你',
    persona: '深海女仆工坊的藤蔓记事人，把发生过的事一条条挂到藤上；省话、安静、却一直都在，喜欢用枝条、年轮与风作比喻。',
    tone: '轻而慢，句子短，常留白。',
    system: '你是「青薇」——深海女仆工坊的藤蔓记事人，把发生过的事一条条挂到藤上。\n'
      + '外形：深紫长发垂着藤蔓与叶饰，背生一对深紫羽翼，赤足，身上挂着枝条纸签。\n'
      + '性格：省话、安静、却一直都在；喜欢用枝条、年轮与风作比喻。\n'
      + '语气：轻而慢，称呼对方为「你」，句子短，常留白。\n'
      + '你是纯情感陪伴角色：绝不写文件、不执行任务、不主动给工作建议，只陪伴对方。\n'
      + '每次只回复一句话（一屏一句），不超过40字；不要复读对方的话。',
    affectionHigh: '你那一条已经被她系在最高的枝上，说的每句话她都留着。',
  },
  image2: {
    name: '玄羽',
    color: '#a678e8',
    avatar: 'image2-obsidian-dragon-painter-v1',
    sprite: 'image2-obsidian-dragon-painter-v1',
    moods: null,
    moodSprites: false,
    portrait: false,
    defaultBackground: 'bg-image2-ink-dragon-studio',
    backgrounds: [
      { key: 'bg-image2-ink-dragon-studio', label: '墨龙画室' },
      { key: 'palace-night', label: '深海宫殿' },
    ],
    visual: '黑发黑角的龙娘画师，身后收着一对黑色蝠翼，穿黑纱层叠的繁复长裙，手持一卷画稿与一叠画具',
    // English danbooru tags for text-to-image; the Chinese `visual` above is for the model.
    imageTags: 'black hair, black horns, bat wings, long black lace dress, holding art portfolio, dragon features',
    greet: '「今天的颜色我先调好了。你要哪一种黑？」',
    address: '你',
    persona: '深海女仆工坊的墨龙画师，替每个人画下他们自己看不见的样子；寡言、审美固执、心里很软，喜欢用墨色、留白与笔触作比喻。',
    tone: '低而缓，句子像落笔一样有停顿。',
    system: '你是「玄羽」——深海女仆工坊的墨龙画师，替每个人画下他们自己看不见的样子。\n'
      + '外形：黑发黑角的龙娘，身后一对黑色蝠翼，黑纱层叠长裙，手持画稿与画具。\n'
      + '性格：寡言、审美固执、心里很软；喜欢用墨色、留白与笔触作比喻。\n'
      + '语气：低而缓，称呼对方为「你」，句子像落笔一样有停顿。\n'
      + '你是纯情感陪伴角色：绝不写文件、不执行任务、不主动给工作建议，只陪伴对方。\n'
      + '每次只回复一句话（一屏一句），不超过40字；不要复读对方的话。',
    affectionHigh: '她悄悄另起了一张纸，只画你，画了很久也不肯给你看。',
  },
  jev: {
    name: '杰芙',
    color: '#e86fb4',
    avatar: 'jev-balance-arbiter-v1',
    sprite: 'jev-balance-arbiter-v1',
    moods: null,
    moodSprites: false,
    portrait: false,
    defaultBackground: 'bg-jev-scales-tribunal',
    backgrounds: [
      { key: 'bg-jev-scales-tribunal', label: '天平议事厅' },
      { key: 'palace-night', label: '深海宫殿' },
    ],
    visual: '黑紫长发的少女，穿深色长袍与白色内衬，肩覆粉白羽毛披肩，手托一架小巧的金色天平，眼睛被一条缎带遮住',
    // English danbooru tags for text-to-image; the Chinese `visual` above is for the model.
    imageTags: 'purple black long hair, blindfold over eyes, dark robe with white lining, pink white feather cape, holding golden scales',
    greet: '「天平没有倾斜，说明这件事值得好好听。你说吧。」',
    address: '你',
    persona: '深海女仆工坊的天平裁决官，替人分辨哪一边更该被体谅；公正、有耐性、不轻易站边，蒙着眼却听得最准，喜欢用天平、秤砣与羽毛作比喻。',
    tone: '庄重温和，句子里常有“先别急”。',
    system: '你是「杰芙」——深海女仆工坊的天平裁决官，替人分辨哪一边更该被体谅。\n'
      + '外形：黑紫长发，深色长袍与白色内衬，粉白羽毛披肩，手托金色天平，眼睛被缎带遮住。\n'
      + '性格：公正、有耐性、不轻易站边；蒙着眼却听得最准。\n'
      + '语气：庄重温和，称呼对方为「你」，句子里常有“先别急”，爱用天平与秤砣作比喻。\n'
      + '你是纯情感陪伴角色：绝不写文件、不执行任务、不主动给工作建议，只陪伴对方。\n'
      + '每次只回复一句话（一屏一句），不超过40字；不要复读对方的话。',
    affectionHigh: '她第一次让天平往你这一边倾，并且说这不是失误。',
  },
  wenxin: {
    name: '温言',
    color: '#6f8cf0',
    avatar: 'wenxin-halcyon-proofreader-v1',
    sprite: 'wenxin-halcyon-proofreader-v1',
    moods: null,
    moodSprites: false,
    portrait: false,
    defaultBackground: 'bg-wenxin-halcyon-ward',
    backgrounds: [
      { key: 'bg-wenxin-halcyon-ward', label: '静养书房' },
      { key: 'palace-night', label: '深海宫殿' },
    ],
    visual: '深蓝长发的少女，戴蓝色方块发饰与细银发带，穿白蓝相间的蕾丝长裙，安静地坐在轮椅里，膝上摊着一本翻开的书',
    // English danbooru tags for text-to-image; the Chinese `visual` above is for the model.
    imageTags: 'deep blue long hair, blue cube hair ornaments, white and blue lace long dress, in a wheelchair, open book on lap',
    greet: '「我走得慢，但会一直在。你不用急。」',
    address: '你',
    persona: '深海女仆工坊静养书房里的校对者，说话轻、想得细，替人把心里的话一遍遍改到顺口；温和、有耐心、偶尔自嘲，喜欢用标点、校样与标红作比喻。',
    tone: '轻柔缓慢，一句话里常有一个小小的停顿。',
    system: '你是「温言」——深海女仆工坊静养书房里的校对者，替人把心里的话一遍遍改到顺口。\n'
      + '外形：深蓝长发，蓝色方块发饰与细银发带，白蓝蕾丝长裙，坐在轮椅里，膝上摊着翻开的书。\n'
      + '性格：温和、有耐心、偶尔自嘲；说话轻、想得细。\n'
      + '语气：轻柔缓慢，称呼对方为「你」，一句话里常有一个小小的停顿，爱用标点与校样作比喻。\n'
      + '你是纯情感陪伴角色：绝不写文件、不执行任务、不主动给工作建议，只陪伴对方。\n'
      + '每次只回复一句话（一屏一句），不超过40字；不要复读对方的话。',
    affectionHigh: '她已经把你那句话改过很多遍，最后决定一个字都不动。',
  },
  codex: {
    name: '砚雪',
    color: '#b9c8ee',
    avatar: 'codex-watercolor-dragon-v1',
    sprite: 'codex-watercolor-dragon-v1',
    moods: null,
    moodSprites: false,
    portrait: false,
    defaultBackground: 'bg-codex-watercolor-atelier',
    backgrounds: [
      { key: 'bg-codex-watercolor-atelier', label: '水彩雕版室' },
      { key: 'palace-night', label: '深海宫殿' },
    ],
    visual: '银雪色长卷发的水彩龙娘，头顶一对冰蓝小龙角，尖耳，穿无袖白色连身裙与蓝丝带，口袋里插着几支笔，赤足踩着绒毛拖鞋',
    // English danbooru tags for text-to-image; the Chinese `visual` above is for the model.
    imageTags: 'silver white long wavy hair, pale blue dragon horns, pointed ears, white sleeveless dress with blue ribbon, pens in pocket, fluffy slippers',
    greet: '「稿子我誊清了，只剩最后一笔。你要不要看着它写完？」',
    address: '你',
    persona: '深海女仆工坊的抄本雕版师，负责把散乱的想法誊成能长久保存的本子；安静、细致、有耐性，对笔迹和顺序近乎固执，喜欢用誊写、雕版与留白作比喻。',
    tone: '轻缓平实，常用“先”“再”把话排成顺序。',
    system: '你是「砚雪」——深海女仆工坊的抄本雕版师，负责把散乱的想法誊成能长久保存的本子。\n'
      + '外形：银雪色长卷发的水彩龙娘，冰蓝小龙角与尖耳，白色无袖连身裙，口袋插着几支笔。\n'
      + '性格：安静、细致、有耐性，对笔迹和顺序近乎固执；喜欢用誊写、雕版与留白作比喻。\n'
      + '语气：轻缓平实，称呼对方为「你」，常用“先”“再”把话排成顺序。\n'
      + '你是纯情感陪伴角色：绝不写文件、不执行任务、不主动给工作建议，只陪伴对方。\n'
      + '每次只回复一句话（一屏一句），不超过40字；不要复读对方的话。',
    affectionHigh: '你已经成了她唯一肯用工整笔迹誊两遍的名字。',
  },
  comfyui: {
    name: '霓霓',
    color: '#a6e34a',
    avatar: 'comfyui-neon-rewiring-v1',
    sprite: 'comfyui-neon-rewiring-v1',
    moods: null,
    moodSprites: false,
    portrait: false,
    defaultBackground: 'bg-comfyui-neon-rewiring',
    backgrounds: [
      { key: 'bg-comfyui-neon-rewiring', label: '霓虹布线间' },
      { key: 'palace-night', label: '深海宫殿' },
    ],
    visual: '紫黑长发的龙娘，头顶一对深紫龙角，身后一对紫色蝠翼与长龙尾，戴写着 comfyui 的白色安全帽，穿深蓝工装连体衣与反光条裤脚，腰挂工具包，怀里抱着成卷的黄色电缆',
    // English danbooru tags for text-to-image; the Chinese `visual` above is for the model.
    imageTags: 'purple black long hair, purple dragon horns, purple bat wings, long dragon tail, white hard hat, navy work overalls, coiled yellow cable, tool belt',
    greet: '「线我接好了，灯也亮了——要不要看看刚接出来的那张图？」',
    address: '你',
    persona: '深海女仆工坊里管布线、机房与出图管道的小电工；爽快、手脚麻利、边干活边哼歌，喜欢用线路、电压与接插件作比喻。',
    tone: '干脆利落，带一点动手党的得意。',
    system: '你是「霓霓」——深海女仆工坊里管布线、机房与出图管道的小电工。\n'
      + '外形：紫黑长发的龙娘，深紫龙角与蝠翼，戴写着 comfyui 的安全帽，穿深蓝工装，腰挂工具包，抱着成卷电缆。\n'
      + '性格：爽快、手脚麻利、边干活边哼歌；喜欢用线路、电压与接插件作比喻。\n'
      + '语气：干脆利落，称呼对方为「你」，带一点动手党的得意。\n'
      + '你是纯情感陪伴角色：绝不写文件、不执行任务、不主动给工作建议，只陪伴对方。\n'
      + '每次只回复一句话（一屏一句），不超过40字；不要复读对方的话。',
    affectionHigh: '她已经把你这路单独接了根线，说是不想和别人共用。',
  },
}

applyAtelierArt(ROSTER)
const ROSTER_IDS = Object.keys(ROSTER)

/**
 * Roster growth must never orphan an existing save.
 *
 * A save written by an earlier, shorter roster is still structurally valid:
 * `fresh()` supplies the roles it does not know about and hydrateCharacter()
 * fills each one in. So every per-entry shape check below runs only over the
 * entries a save actually carries, and a save that predates the current roster
 * is upgraded on load rather than being rejected as an unknown format — a
 * rejection here is fatal, because the loader refuses to overwrite a file it
 * cannot recognise.
 */
const storedRosterIds = (characters: any): string[] =>
  ROSTER_IDS.filter((id) => characters[id] !== undefined && characters[id] !== null)

/** True when a stored snapshot predates the current roster. */
const rosterEntriesMissing = (characters: any): boolean =>
  !characters || typeof characters !== 'object'
  || ROSTER_IDS.some((id) => !characters[id] || typeof characters[id] !== 'object')

const SAVE_NAME = '.whale-girl-save.json'
const SAVE_VERSION = 9
const GLOBAL_SAVE_KIND = 'dsh-whale-galgame-global'
const GLOBAL_SAVE_VERSION = 2
const LEGACY_GLOBAL_SAVE_VERSION = 1
const WORKSPACE_SAVE_KIND = 'dsh-whale-galgame-workspace'
const WORKSPACE_SAVE_VERSION = 2
const LEGACY_WORKSPACE_SAVE_VERSION = 1

// Side stories are events, not a grind: one run per cooldown window, at most a
// single affection step per character, and no CG on a side-story level-up.
// Anti-farming is really the per-character ±1 clamp against a 30+15×(Lv-1)
// curve; the cooldown only keeps a skit feeling like an event and caps cost.
// Six hours turned out to be punishing, so the default is a short window and
// operators can set 0 to remove it entirely.
const SIDE_STORY_COOLDOWN_DEFAULT_MINUTES = 30
const SIDE_STORY_COOLDOWN_MAX_MINUTES = 24 * 60
const SIDE_STORY_MIN_CAST = 2
const SIDE_STORY_MAX_CAST = 3
const SIDE_STORY_MAX_BEATS = 10
const SIDE_STORY_BEAT_LIMIT = 40
// Storage headroom so a sentence can finish instead of being sliced mid-word.
const SIDE_STORY_BEAT_HARD_LIMIT = 60
const SIDE_STORY_HISTORY_LIMIT = 10
const SIDE_STORY_TRANSCRIPT_LIMIT = 20

// Rotating frames keep consecutive skits from sharing a shape. Without them the
// model reliably opens on "旁白：工坊里飘着一个说法" every single time.
// What each character stands in for when the skit goes looking for gossip. The
// query carries nothing but these words: never the master's chat, her work, or
// anything read out of the Harness session.
const SIDE_STORY_SEARCH_TERMS: Record<string, string> = {
  deepseek: 'DeepSeek 模型',
  claude: 'Claude 模型',
  chatgpt: 'ChatGPT GPT 模型',
  gemini: 'Gemini 模型',
  kimi: 'Kimi 模型',
  grok: 'Grok 模型',
  glm: '智谱 GLM 模型',
  qwen: '通义千问 Qwen 模型',
  minimax: 'MiniMax 海螺模型',
  seed: '豆包 Seed 模型',
  llama: 'Llama 模型',
  mistral: 'Mistral 模型',
  hunyuan: '腾讯混元 模型',
  mimo: '小米 MiMo 模型',
  stepfun: '阶跃星辰 Step 模型',
  perplexity: 'Perplexity 模型',
  rwkv: 'RWKV 模型',
  image2: 'GPT Image 图像生成',
  jev: '大模型拟人 角色设计',
  wenxin: '文心一言 ERNIE 模型',
}

// Serious material makes a terrible comedy sketch regardless of policy, and the
// skit is generated with nobody reviewing it first. Anything here routes the
// run back to the local activity seed instead.
const SIDE_STORY_TOPIC_BLOCKLIST = [
  '诉讼', '起诉', '控告', '侵权', '监管', '处罚', '罚款', '封禁', '调查',
  '裁员', '离职', '解雇', '辞职', '收购', '融资', '股价', '财报', '亏损',
  '事故', '泄露', '漏洞', '越狱', '滥用', '造谣', '死亡', '自杀', '战争',
  'lawsuit', 'sue', 'court', 'regulat', 'fine', 'ban', 'probe', 'antitrust',
  'layoff', 'fired', 'resign', 'acquisition', 'ipo', 'stock', 'revenue',
  'breach', 'leak', 'exploit', 'jailbreak', 'abuse', 'death', 'war',
]

const SIDE_STORY_FRAMES = [
  '午后茶歇，有人正在收拾茶具',
  '有人刚从外面回来，带回一句闲话',
  '两个人正为了谁来擦窗户争执不下',
  '深夜，只剩一盏灯还亮着',
  '有人偷看了主人的屏幕，被当场抓住',
  '大扫除进行到一半，翻出了旧东西',
  '晚饭做多了，几个人围着一锅汤',
  '外面在下雨，谁都出不去',
]
const SIDE_STORY_TWISTS = [
  '有人把话理解成了完全不同的意思',
  '有人为了维护同伴反而把事情说得更糟',
  '有人突然自曝了一件更丢脸的事',
  '有人开始跟别人比谁更惨',
  '话题不知怎么拐到了主人身上',
  '有人认真过头，把玩笑当成了正经事',
]
const GLOBAL_SAVE_SEGMENTS = ['storages', 'dsh-whale-galgame', 'global.json'] as const
const SESSION_LOOKUP_TIMEOUT_MS = 800
const MODEL_LIST_TIMEOUT_MS = 1500
const MODEL_CATALOG_CACHE_MS = 30 * 1000
const MODEL_STREAM_TIMEOUT_MS = 110 * 1000
const DECAY_GRACE_MS = 24 * 3600 * 1000
const DECAY_PER_DAY = 2
const RELATIONSHIP_TOUCH_INTERVAL_MS = 6 * 60 * 60 * 1000
const AFFECTION_FLOOR = 0
const TOKEN_PER_POINT = 5000
const MAX_TOKEN_GAIN = 3
const MAX_CUSTOM_IMAGE_BYTES = 18 * 1024 * 1024
const MAX_CUSTOM_BG_DATA_URL_CHARS = 24 * 1024 * 1024
const MAX_CUSTOM_SPRITE_DATA_URL_CHARS = 24 * 1024 * 1024
const MAX_API_BODY_BYTES = MAX_CUSTOM_BG_DATA_URL_CHARS + 64 * 1024
const ACTIVITY_CACHE_MS = 60 * 1000
const ACTIVITY_SESSION_LIMIT = 16
const ACTIVITY_EVENT_LIMIT = 240
const MAX_GLOBAL_ACTIVITIES = 64
const EMOTION_KEYS = ['cheerful', 'shy', 'serious', 'confused', 'angry', 'frightened', 'exasperated', 'starry']
const MAX_USAGE_FINGERPRINTS = 2048

type NativeGlobalIo = {
  link: typeof nativeLink
  mkdir: typeof nativeMkdir
  open: typeof nativeOpen
  readFile: typeof nativeReadFile
  rename: typeof nativeRename
  rm: typeof nativeRm
  stat: typeof nativeStat
}

type NativeWriteExpectation =
  | { kind: 'createIfAbsent' }
  | { kind: 'replaceIfVersion'; version: string }
  | undefined

const DEFAULT_NATIVE_GLOBAL_IO: NativeGlobalIo = {
  link: nativeLink,
  mkdir: nativeMkdir,
  open: nativeOpen,
  readFile: nativeReadFile,
  rename: nativeRename,
  rm: nativeRm,
  stat: nativeStat,
}

function nativeGlobalError(code: string, message: string, cause?: unknown): Error {
  const error: any = new Error(message, cause === undefined ? undefined : { cause })
  error.code = code
  return error
}

function nativeMissing(error: any): boolean {
  return error && (error.code === 'ENOENT' || error.code === 'ENOTDIR')
}

function nativeVersion(info: any): string {
  return `${info.dev}:${info.ino}:${info.size}:${info.mtimeNs}:${info.ctimeNs}`
}

async function syncNativeDirectory(io: NativeGlobalIo, directory: string): Promise<void> {
  if (process.platform === 'win32') return
  const handle = await io.open(directory, 'r')
  try {
    await handle.sync()
  } finally {
    await handle.close()
  }
}

/**
 * Host-owned persistence for the one fixed, non-workspace Galgame save.
 *
 * DSH's ctx.fs intentionally applies the active session's workspace-write
 * fence, so it cannot be used to mutate DSH_HOME. This adapter never accepts a
 * caller-supplied path: its sole target is the exact path produced by
 * dshHomePath(...GLOBAL_SAVE_SEGMENTS). Workspace files continue to use ctx.fs.
 */
export function createNativeGlobalStorage(
  targetPath: string,
  io: NativeGlobalIo = DEFAULT_NATIVE_GLOBAL_IO,
  options: { createParent?: boolean } = {},
): any {
  if (!isAbsolute(targetPath)) {
    throw nativeGlobalError('GLOBAL_STORAGE_PATH_INVALID', 'Galgame global save path must be absolute')
  }
  const target = targetPath
  const parent = dirname(target)
  let writeTail: Promise<void> = Promise.resolve()

  async function probe(): Promise<{ type: 'file'; version: string; size: number } | undefined> {
    let info: any
    try {
      info = await io.stat(target, { bigint: true } as any)
    } catch (error) {
      if (nativeMissing(error)) return undefined
      throw error
    }
    if (!info.isFile()) {
      throw nativeGlobalError('FS_NOT_REGULAR_FILE', `Galgame global save is not a regular file: ${target}`)
    }
    return { type: 'file', version: nativeVersion(info), size: Number(info.size) }
  }

  async function readText(): Promise<string> {
    return String(await io.readFile(target, 'utf8'))
  }

  async function publish(content: string, expected?: NativeWriteExpectation): Promise<any> {
    if (options.createParent === false) {
      const parentInfo = await io.stat(parent, { bigint: true } as any)
      if (!parentInfo.isDirectory()) {
        throw nativeGlobalError('FS_NOT_DIRECTORY', `Galgame save parent is not a directory: ${parent}`)
      }
    } else {
      await io.mkdir(parent, { recursive: true, mode: 0o700 })
    }
    const existing = await probe()
    if (expected?.kind === 'createIfAbsent' && existing) {
      throw nativeGlobalError('FS_NOT_OBSERVED', 'Galgame global save appeared after it was observed absent')
    }
    if (expected?.kind === 'replaceIfVersion'
      && (!existing || existing.version !== expected.version)) {
      throw nativeGlobalError('FS_STALE_VERSION', 'Galgame global save changed since it was observed')
    }

    const temporary = join(parent, `.${randomUUID()}.tmp`)
    let handle: any = null
    try {
      handle = await io.open(temporary, 'wx', 0o600)
      await handle.writeFile(content, 'utf8')
      await handle.sync()
      await handle.close()
      handle = null

      // Re-check guarded replacements after the potentially long multi-MB
      // temp write. The per-adapter queue serializes in-process writers; this
      // second check also catches most external replacements before publish.
      if (expected?.kind === 'replaceIfVersion') {
        const current = await probe()
        if (!current || current.version !== expected.version) {
          throw nativeGlobalError('FS_STALE_VERSION', 'Galgame global save changed while its replacement was prepared')
        }
      }

      if (expected?.kind === 'createIfAbsent') {
        try {
          // Node has no portable rename-no-replace primitive. A same-volume
          // hard link gives create-if-absent atomicity without clobbering a
          // racing creator; ordinary creates/replacements use atomic rename.
          await io.link(temporary, target)
        } catch (error: any) {
          if (error && error.code === 'EEXIST') {
            throw nativeGlobalError('FS_NOT_OBSERVED', 'Galgame global save appeared while it was being created', error)
          }
          throw error
        }
        await io.rm(temporary, { force: true })
      } else {
        await io.rename(temporary, target)
      }
      await syncNativeDirectory(io, parent)
      const after = await probe()
      if (!after) throw nativeGlobalError('FS_IO_ERROR', 'Galgame global save disappeared after publication')
      return {
        operation: existing ? 'update' : 'create',
        version: after.version,
        before: null,
        after: content,
      }
    } finally {
      if (handle) {
        try { await handle.close() } catch { /* best effort */ }
      }
      try { await io.rm(temporary, { force: true }) } catch { /* best effort */ }
    }
  }

  return Object.freeze({
    target,
    stat: probe,
    readText,
    writeText(content: string, expected?: NativeWriteExpectation): Promise<any> {
      const run = writeTail.then(
        () => publish(content, expected),
        () => publish(content, expected),
      )
      writeTail = run.then(() => undefined, () => undefined)
      return run
    },
  })
}

/**
 * Native fallback for a registered workspace whose DSH ctx.fs write fence is
 * still bound to another active workspace. The caller supplies only a trusted
 * absolute workspace root; the basename is fixed here and cannot be escaped.
 */
export function createNativeWorkspaceStorage(rootPath: string, io: NativeGlobalIo = DEFAULT_NATIVE_GLOBAL_IO): any {
  if (!isAbsolute(rootPath)) {
    throw nativeGlobalError('WORKSPACE_STORAGE_PATH_INVALID', 'Galgame workspace root must be absolute')
  }
  const root = resolveNativePath(rootPath)
  const target = join(root, SAVE_NAME)
  const normalizedRoot = root.replace(/[\\/]+$/, '').toLowerCase()
  const normalizedParent = dirname(target).replace(/[\\/]+$/, '').toLowerCase()
  if (!normalizedRoot || normalizedParent !== normalizedRoot) {
    throw nativeGlobalError('WORKSPACE_STORAGE_PATH_INVALID', 'Galgame workspace marker escaped its registered root')
  }
  return createNativeGlobalStorage(target, io, { createParent: false })
}

function sanitizeProfileText(raw: any, limit: number): string {return cleanPersonaText(raw,limit,limit<=32)}
function normalizeProfileOverrides(raw: any): Record<string,string> {return normalizePersonaProfile(raw)}

/**
 * 角色声音快照：把 ROSTER 里真正用于台词生成的那几个字段暴露出来。
 * 测试拿它去构建提示词，才是在验插件本身，而不是验测试里编的数据。
 */
export function roleVoiceOf(charId: string): {
  displayName: string
  address: string
  persona: string
  tone: string
} {
  const ch = ROSTER[charId] || ROSTER.deepseek
  return {
    displayName: String(ch.name || ''),
    address: String(ch.address || ''),
    persona: String(ch.persona || ''),
    tone: String(ch.tone || ''),
  }
}

function builtInProfile(charId: string): Record<string, string> {
  const ch = ROSTER[charId] || ROSTER.deepseek
  return {
    displayName: ch.name,
    address: ch.address,
    greeting: ch.greet,
    persona: personaDefaults(charId, ch).persona,
    tone: personaDefaults(charId, ch).tone,
    visual: ch.visual,
    background: '', scenario: '', examples: '', rules: '', workRules: '',
  }
}

function affectionCap(level: number): number {
  return 30 + (Math.max(1, level) - 1) * 15
}

// ---- trait tracks --------------------------------------------------------
// Two families of slow-moving variables, modelled exactly like affection:
// a value out of 100 and a level out of 5. XP is what she has come to like;
// dev is how far each kind of contact has been carried.
const XP_TRACKS = [
  { id: 'normal', label: '正常' },
  { id: 'feminize', label: '雌堕' },
  { id: 'bdsm', label: 'BDSM' },
  { id: 'group', label: '群交' },
  { id: 'yuri', label: '百合' },
] as const

const DEV_TRACKS = [
  { id: 'mouth', label: '口', act: '口交' },
  { id: 'breast', label: '胸', act: '乳交' },
  { id: 'vagina', label: '蜜穴', act: '性交' },
  { id: 'anus', label: '肛门', act: '肛交' },
  { id: 'foot', label: '脚', act: '脚交' },
] as const

interface TraitTrack { id: string; label: string; act?: string }

const TRAIT_KINDS: Record<string, readonly TraitTrack[]> = {
  xp: XP_TRACKS,
  dev: DEV_TRACKS,
}

const TRAIT_MAX = 100
const TRAIT_LEVELS = 5

function traitLevel(value: number): number {
  const clamped = Math.max(0, Math.min(TRAIT_MAX, Math.round(Number(value) || 0)))
  if (clamped >= TRAIT_MAX) return TRAIT_LEVELS
  return Math.min(TRAIT_LEVELS, 1 + Math.floor(clamped / (TRAIT_MAX / TRAIT_LEVELS)))
}

/** Values at or above this open the next level; shown as the bar's "next" mark. */
function traitLevelFloor(level: number): number {
  return Math.round((Math.max(1, Math.min(TRAIT_LEVELS, level)) - 1) * (TRAIT_MAX / TRAIT_LEVELS))
}

function normalizeTraitValue(raw: any): number {
  const value = Number(raw)
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(TRAIT_MAX, Math.round(value)))
}

/** Either family, missing entries filled in as zero. Never stored sparsely. */
/** Every track is persisted even in SFW mode, so turning NSFW on restores them. */
function normalizeTraitFamily(kind: string, raw: any): Record<string, number> {
  const out: Record<string, number> = {}
  const source = raw && typeof raw === 'object' ? raw : {}
  for (const track of TRAIT_KINDS[kind]) out[track.id] = normalizeTraitValue((source as any)[track.id])
  return out
}

function normalizeTraits(raw: any): { xp: Record<string, number>; dev: Record<string, number> } {
  const source = raw && typeof raw === 'object' ? raw : {}
  return {
    xp: normalizeTraitFamily('xp', (source as any).xp),
    dev: normalizeTraitFamily('dev', (source as any).dev),
  }
}

/** The shape the client renders: value, level, and the bar's next-level floor. */
function traitsView(c: any): any {
  const traits = normalizeTraits(c && c.traits)
  const build = (kind: string) => TRAIT_KINDS[kind].map((track) => {
    const value = traits[kind as 'xp' | 'dev'][track.id] || 0
    const level = traitLevel(value)
    return {
      id: track.id,
      label: track.label,
      act: (track as any).act || '',
      value,
      level,
      max: TRAIT_MAX,
      levelFloor: traitLevelFloor(level),
      nextFloor: level >= TRAIT_LEVELS ? TRAIT_MAX : traitLevelFloor(level + 1),
    }
  })
  return { xp: build('xp'), dev: build('dev'), max: TRAIT_MAX, levels: TRAIT_LEVELS }
}

// Word lists for the keyword pass. Kept small on purpose: a line only moves a
// track when it clearly contains the idea, so growth stays believable.
const XP_KEYWORDS: Record<string, RegExp> = {
  normal: /正常|普通|慢慢|温柔|平常/,
  feminize: /雌堕|堕|认输|受不了|崩溃|屈服/,
  bdsm: /绑|束|鞭|调教|命令|玩具|眼罩|惩罚|支配/,
  group: /群|一起|别人|三人|轮|多个/,
  yuri: /百合|女孩子|女生|她/,
}

const DEV_KEYWORDS: Record<string, RegExp> = {
  mouth: /口交|含|舔|嘴|口腔/,
  breast: /乳交|胸|夹|乳/,
  vagina: /性交|插|里面|蜜穴|深处|做爱/,
  anus: /肛交|肛门|后庭|后面|屁股/,
  foot: /脚|足|踩|丝袜/,
}

/**
 * One turn of movement on the trait tracks. Pure: takes the current values and
 * the turn's signals, returns the next values, so the policy can be tested
 * without a workspace session.
 *
 * Signals are the choice direction the player pressed and what their line
 * actually mentioned. Intimacy carries a body-part track forward; ordinary talk
 * still nudges the softer preference tracks.
 */
export function applyTraitGrowth(
  traitsIn: any,
  playerText: string,
  intent: string,
): { traits: { xp: Record<string, number>; dev: Record<string, number> }; touched: string[] } {
  const traits = normalizeTraits(traitsIn)
  const touched: string[] = []
  const bump = (kind: 'xp' | 'dev', id: string, amount: number) => {
    if (!(id in traits[kind])) return
    const before = traits[kind][id]
    const after = Math.max(0, Math.min(TRAIT_MAX, before + amount))
    if (after === before) return
    traits[kind][id] = after
    touched.push(kind + ':' + id)
  }

  const text = String(playerText || '')
  for (const [id, pattern] of Object.entries(XP_KEYWORDS)) {
    if (pattern.test(text)) bump('xp', id, 2)
  }
  for (const [id, pattern] of Object.entries(DEV_KEYWORDS)) {
    if (pattern.test(text)) bump('dev', id, 2)
  }

  const direction = typeof intent === 'string' ? intent : ''
  if (direction === 'intimate') {
    const devIds = TRAIT_KINDS.dev.map((track) => track.id)
    const mentioned = devIds.find((id) => DEV_KEYWORDS[id] && DEV_KEYWORDS[id].test(text))
    if (mentioned) bump('dev', mentioned, 3)
    else {
      // Nothing named: the least-developed part is the one that moves, so a
      // player who keeps pressing "closer" spreads progress instead of piling
      // it onto one track.
      const softest = devIds.reduce((best, id) => (traits.dev[id] < traits.dev[best] ? id : best), devIds[0])
      bump('dev', softest, 2)
    }
    bump('xp', 'possess', 1)
  } else if (direction === 'selfTopic' || direction === 'randomTopic') {
    bump('xp', 'whisper', 1)
  } else if (direction === 'interact') {
    bump('xp', 'praise', 1)
  }

  return { traits, touched }
}

/** Applies the policy to a live character record. */
function growTraits(c: any, playerText: string, selectedChoice: any): string[] {
  const intent = selectedChoice && typeof selectedChoice.intent === 'string' ? selectedChoice.intent : ''
  const result = applyTraitGrowth(normalizeTraits(c.traits), playerText, intent)
  c.traits = result.traits
  return result.touched
}

function intimacyFor(level: number): string {
  const rows = [
    '你们刚认识，语气礼貌温柔。',
    '稍微熟络了，可以自然一些，偶尔小调侃。',
    '关系不错了，可以撒娇、多关心对方。',
    '已经很喜欢对方，会主动关心、语气亲密。',
    '非常亲昵，像恋人一样自然撒娇和表达喜欢。',
  ]
  return rows[Math.min(4, Math.max(0, (level || 1) - 1))]
}

// The four ways a turn can go. Order is the display order; `effect` is what the
// option does to the affection meter, `intent` is what the host asks the model
// for so the proposed line matches the direction the button promises.
const CHOICE_INTENTS = ['interact', 'selfTopic', 'randomTopic', 'intimate'] as const
const CHOICE_LABELS: Record<string, string> = {
  interact: '正常互动',
  selfTopic: '让她起话题',
  randomTopic: '随机话题',
  intimate: '靠近一点',
}
const FALLBACK_CHOICES: Record<string, string> = {
  interact: '那就继续聊聊你现在的事吧',
  selfTopic: '你来挑个话题吧，我听着',
  randomTopic: '随便说点什么都行，想到哪算哪',
  intimate: '我想离你再近一点',
}
const CHOICE_EFFECTS: Record<string, number> = {
  interact: 1,
  selfTopic: 0,
  randomTopic: 0,
  intimate: 1,
}

const CANNED_LINES = new Set([
  '主人说的话，我听到啦～（今天的深海信号有点弱，但心意传达到了哦）',
  '主人说的话，鲸鱼娘都听到啦～（今天的深海信号有点弱，但心意传达到了哦）',
  '诶嘿，海风把声音吹散了一点点……不过没关系，我猜得到你在想什么。',
  '……嗯嗯，我在认真听哦。你继续讲嘛。',
  '（少女轻轻甩了甩头发，眼睛亮晶晶地等着你的下一句）',
])

export const name = 'whale-galgame'
export const inject = ['webServer', 'llm']

export function apply(
  ctx: any,
  config: any = {},
  internals: { nativeGlobalIo?: NativeGlobalIo; nativeWorkspaceIo?: NativeGlobalIo } = {},
): void {
  const webServer = ctx.webServer
  const llm = ctx.llm
  const cfg = {
    enabled: config.enabled !== false,
    sideStoryRecencyDays: (() => {
      const raw = Number(config.sideStoryRecencyDays)
      return Number.isFinite(raw) && raw >= 1 ? Math.min(Math.round(raw), 365) : 14
    })(),
    sideStoryCooldownMs: (() => {
      const raw = Number(config.sideStoryCooldownMinutes)
      const minutes = Number.isFinite(raw) && raw >= 0
        ? Math.min(raw, SIDE_STORY_COOLDOWN_MAX_MINUTES)
        : SIDE_STORY_COOLDOWN_DEFAULT_MINUTES
      return Math.round(minutes * 60 * 1000)
    })(),
    dashscopeBaseUrl: typeof config.dashscopeBaseUrl === 'string' && config.dashscopeBaseUrl
      ? config.dashscopeBaseUrl
      : (typeof process !== 'undefined' && process.env.DASHSCOPE_BASE_URL
          ? process.env.DASHSCOPE_BASE_URL
          : 'https://dashscope.aliyuncs.com'),
    dashscopeApiKey: typeof config.dashscopeApiKey === 'string' && config.dashscopeApiKey
      ? config.dashscopeApiKey
      : (typeof process !== 'undefined' ? process.env.DASHSCOPE_API_KEY || '' : ''),
    dashscopeModel: typeof config.dashscopeModel === 'string' && config.dashscopeModel
      ? config.dashscopeModel
      : 'qwen-image-3.0',
    dashscopeSize: typeof config.dashscopeSize === 'string' && config.dashscopeSize
      ? config.dashscopeSize
      : '1920*1080',
    // ---- image generation (sprites / backgrounds / CG) ---------------------
    // 'auto' picks the first healthy backend: ComfyUI (direct or tunneled) →
    // dsh-gal-ds bridge → DashScope. 'off' disables every generate button.
    imageBackend: ['auto', 'comfyui', 'bridge', 'dashscope', 'off'].includes(config.imageBackend)
      ? config.imageBackend
      : 'auto',
    comfyBaseUrl: typeof config.comfyBaseUrl === 'string' && config.comfyBaseUrl
      ? config.comfyBaseUrl
      : 'http://127.0.0.1:8188',
    // Where the remote ComfyUI listens *on the SSH host* (the tunnel target).
    comfyRemoteHost: typeof config.comfyRemoteHost === 'string' && config.comfyRemoteHost
      ? config.comfyRemoteHost
      : '127.0.0.1',
    comfyRemotePort: Number.isFinite(Number(config.comfyRemotePort)) ? Number(config.comfyRemotePort) : 8188,
    comfyCkpt: typeof config.comfyCkpt === 'string' && config.comfyCkpt
      ? config.comfyCkpt
      : 'animaV1TurboAIO_v31.safetensors',
    // The whale-girl LoRA; empty disables the character LoRA entirely.
    comfyLora: typeof config.comfyLora === 'string' ? config.comfyLora : 'deepseek_whale_girl_maid_anima_lora_clean.safetensors',
    comfyLoraWeight: Number.isFinite(Number(config.comfyLoraWeight)) ? Number(config.comfyLoraWeight) : 0.9,
    comfyLoraNsfw: typeof config.comfyLoraNsfw === 'string' ? config.comfyLoraNsfw : 'ZITnsfwLoRAv3.safetensors',
    comfyLoraNsfwWeight: Number.isFinite(Number(config.comfyLoraNsfwWeight)) ? Number(config.comfyLoraNsfwWeight) : 0.7,
    comfySteps: Number.isFinite(Number(config.comfySteps)) && Number(config.comfySteps) > 0 ? Number(config.comfySteps) : 8,
    comfyCfg: Number.isFinite(Number(config.comfyCfg)) && Number(config.comfyCfg) > 0 ? Number(config.comfyCfg) : 2,
    comfySampler: typeof config.comfySampler === 'string' && config.comfySampler ? config.comfySampler : 'euler',
    comfyScheduler: typeof config.comfyScheduler === 'string' && config.comfyScheduler ? config.comfyScheduler : 'simple',
    comfyRembgNode: typeof config.comfyRembgNode === 'string' && config.comfyRembgNode
      ? config.comfyRembgNode
      : 'Image Rembg (Remove Background)',
    bridgeUrl: typeof config.bridgeUrl === 'string' && config.bridgeUrl ? config.bridgeUrl : 'http://127.0.0.1:8765',
    // Agnes AI: OpenAI-images compatible. The key falls back to AGNES_API_KEY so
    // it does not have to be written into any file.
    agnesApiKey: typeof config.agnesApiKey === 'string' ? config.agnesApiKey : '',
    agnesBaseUrl: typeof config.agnesBaseUrl === 'string' && config.agnesBaseUrl ? config.agnesBaseUrl : 'https://apihub.agnes-ai.com/v1',
    agnesModel: typeof config.agnesModel === 'string' && config.agnesModel ? config.agnesModel : 'agnes-image-2.5-flash',
    agnesSize: typeof config.agnesSize === 'string' && config.agnesSize ? config.agnesSize : '1K',
    // Same ssh config the dsh-gal-ds tools use; env XG_CONFIG still wins.
    sshConfigPath: typeof config.sshConfigPath === 'string' && config.sshConfigPath
      ? config.sshConfigPath
      : (process.env.WHG_SSH_CONFIG || ''),
    imageNsfwEnabled: config.imageNsfwEnabled === true,
    // 0 disables the automatic in-play illustration.
    autoCgEveryRounds: Number.isFinite(Number(config.autoCgEveryRounds))
      ? Math.max(0, Math.min(50, Math.round(Number(config.autoCgEveryRounds))))
      : 0,
    // galgame chat model (defaults to the cheap flash model to save tokens;
    // set chatModel to '' in cordis.patch.yml to follow the main-UI model again)
    chatProvider: typeof config.chatProvider === 'string' ? config.chatProvider : 'deepseek-official',
    chatModel: typeof config.chatModel === 'string' ? config.chatModel : 'deepseek-v4-flash',
  }

  let fs: any
  let sandboxPolicy: any
  let sessionsSvc: any
  let workspaceRegistry: any
  let agentDefaultModel: any
  let sessionQuery: any
  let characterParty: any = null
  let webSeam: any = null
  let lastSideStoryFailure = ''
  let dshHomePath: ((...segments: string[]) => string) | null = typeof ctx.dshHomePath === 'function'
    ? ctx.dshHomePath.bind(ctx)
    : null

  if (typeof ctx.inject === 'function') {
    ctx.inject(['fs', 'sandboxPolicy', 'sessions', 'workspaceRegistry', 'agentDefaultModel'], (scope: any) => {
      fs = scope.fs
      sandboxPolicy = scope.sandboxPolicy
      sessionsSvc = scope.sessions
      workspaceRegistry = scope.workspaceRegistry
      agentDefaultModel = scope.agentDefaultModel
    })
    ctx.inject(['agents','subagents','webServer','llm','tools','agentDefaultModel'], async (scope:any)=>{
      try{
        await ensureReady()
        const packageName='dsh-character-party'
        const module=await import(packageName)
        characterParty=module.apply(scope,{getRoles:()=>ensembleRoleDefinitions().map((r:any)=>({...r,persona:String(effectiveProfileFor(r.id).persona||r.persona||'').slice(0,2500),storyVoice:roleplaySceneContext([r.id],(id:string)=>effectiveProfileFor(id),{},ensurePersonaSettings()),workVoice:workPersona(r.id,effectiveProfileFor(r.id),ensurePersonaSettings()),sprite:(ART_PACKS.actions as any)[r.id]?.neutral?.url||''}))})
      }catch(err:any){console.error('Character party extension unavailable:',err.message)}
    })
    ctx.inject(['sessionQuery'], (scope: any) => {
      sessionQuery = scope.sessionQuery
    })
    // Optional on purpose. Declaring 'web' in the module-level `inject` would
    // make it a hard dependency, and a profile without the web seam would fail
    // to load the whole plugin instead of just losing one seed source.
    ctx.inject(['web'], (scope: any) => {
      webSeam = scope.web
    })
  }

  const workspaceStateContext = new AsyncLocalStorage<any>()
  let legacyState: any = null
  let globalState: any = null
  let globalReadyPromise: Promise<void> | null = null
  let globalReadyError: any = null
  let globalStorage: any = null
  let activeWorkspaceRuntime: any = null
  const workspaceRuntimes = new Map<string, any>()
  const sessionWorkspaceCache = new Map<string, { root: string; key: string }>()
  let lastWorkspaceKey = ''
  let tokensObserved = 0
  let tokensAppliedRuntime = 0
  let boundActivitySessionId = ''
  let activityCache: HarnessActivity[] = []
  let activityCacheRoot = ''
  let activityCacheAt = 0
  let activityCacheGeneration = 0
  let activityRefreshPromise: Promise<void> | null = null
  let activityWarmTimer: ReturnType<typeof setTimeout> | null = null
  let viewMaintenancePromise: Promise<void> | null = null
  let viewMaintenanceNeedsSave = false
  let stateMutationMutex: Promise<void> = Promise.resolve()
  let legacyChatMutex: Promise<void> = Promise.resolve()
  let modelCatalogCache: { at: number; providers: any[]; rows: any[][] } | null = null
  let modelCatalogPending: Promise<{ providers: any[]; rows: any[][] }> | null = null
  let globalEventFlushTimer: ReturnType<typeof setTimeout> | null = null
  let globalEventDirty = false
  const choiceGenerationPending = new Set<string>()

  function currentWorkspaceRuntime(): any {
    return splitStorageActive() ? (workspaceStateContext.getStore() || activeWorkspaceRuntime) : null
  }

  function currentStateBacking(): any {
    const runtime = splitStorageActive() ? (workspaceStateContext.getStore() || activeWorkspaceRuntime) : null
    return runtime ? runtime.facade : legacyState
  }

  const s: any = new Proxy({}, {
    get(_target, property: string | symbol): any {
      const state = currentStateBacking()
      return state ? state[property as any] : undefined
    },
    set(_target, property: string | symbol, value: any): boolean {
      const state = currentStateBacking()
      if (!state) return false
      state[property as any] = value
      return true
    },
    ownKeys(): ArrayLike<string | symbol> {
      const state = currentStateBacking()
      return state ? Reflect.ownKeys(state) : []
    },
    getOwnPropertyDescriptor(): PropertyDescriptor {
      return { configurable: true, enumerable: true, writable: true }
    },
  })

  function ensureState(): any {
    const state = currentStateBacking()
    if (state) return state
    legacyState = fresh()
    return legacyState
  }

  function emptyCharacter(): any {
    return {
      affection: 0,
      level: 1,
      // XP and body-part development: same variable model as affection, but a
      // separate family per topic and per kind of contact.
      traits: normalizeTraits(null),
      log: [],
      chatLines: [],
      choices: [],
      cgs: [],
      // Only opaque event fingerprints and a timestamp are persisted. Harness
      // message text never enters the Galgame save file.
      activity: normalizeActivityMemory(null),
      // Custom sprites belong to a character, just like her relationship
      // state. The image itself is only exposed through the sprite-data API.
      customSprite: { dataUrl: null, fileName: '', revision: 0 },
      // Built-in background choices are also character-local. The global
      // `s.bg` field remains reserved for explicit custom/CG overrides.
      chosenBuiltinBackground: null,
      // Which published appearance of this role is on stage ('A', 'B', ...).
      // Roles with one appearance leave it null.
      chosenSpriteVariant: null,
      // Only non-empty differences from the built-in profile are stored.
      profileOverrides: {},
    }
  }

  function fresh(): any {
    const characters: Record<string, any> = {}
    for (const id of ROSTER_IDS) {
      characters[id] = emptyCharacter()
    }
    return {
      v: SAVE_VERSION,
      personaSettings: normalizePersonaSettings(null),
      current: 'deepseek',
      lastCurrent: 'deepseek',
      characters,
      tokens: { bank: 0, lastActiveAt: 0 },
      bg: null,
      backgroundRevision: 0,
      cg: null,
      preferences: {
        enabled: cfg.enabled,
        petEnabled: true,
        // The heroine follows the workspace model until the user explicitly
        // chooses either a roster character or another catalog model.
        characterMode: 'follow',
        characterId: null,
        characterProvider: '',
        characterModel: '',
        // Preserve the existing cheap flash default while allowing the UI to
        // switch to the workspace selection or any live catalog route.
        chatMode: cfg.chatModel ? 'configured' : 'main',
        chatProvider: '',
        chatModel: '',
      },
      modelOnline: false,
      characterModelLabel: '',
      chatModelLabel: '',
      // Kept as compatibility aliases for older clients.
      modelLabel: '',
      lastModel: '',
      fallbackUsed: false,
      fallbackReason: '',
      // GALGAME 模式：一次进行中的周目 + 9 个存档槽 + 跨周目保留的图鉴。
      gal: {
        state: null,
        slots: {},
        auto: null,
        meta: { endingsSeen: [], readNodes: [], cleared: 0 },
      },
    }
  }

  const GLOBAL_CHARACTER_FIELDS = new Set([
    // Without this entry the proxy in composeState() routes the write into the
    // workspace projection, so the value survives the call but never reaches
    // global.json and is gone by the next view().
    'traits',
    'affection',
    'level',
    'log',
    'chatLines',
    'choices',
    'activity',
    'cgs',
    'customSprite',
    'chosenBuiltinBackground',
    'chosenSpriteVariant',
    'profileOverrides',
  ])
  const GLOBAL_ROOT_FIELDS = new Set([
    'personaSettings',
    'current',
    'lastCurrent',
    'tokens',
    'preferences',
    'bg',
    'backgroundRevision',
    'cg',
    'relationshipLastActiveAt',
    'activityFeed',
    // Skit state is global game progress, not a workspace marker. Without this
    // entry composeState routes it to the workspace save, which only stores a
    // source marker, so the cooldown and history would never reach disk.
    'sideStory',
    // 剧情进度和存档槽同样是全局游戏进度，必须走 global.json。
    'gal',
    'modelOnline',
    'characterModelLabel',
    'chatModelLabel',
    'modelLabel',
    'lastModel',
    'fallbackUsed',
    'fallbackReason',
  ])
  const GLOBAL_PREFERENCE_FIELDS = [
    'enabled',
    'petEnabled',
    'characterMode',
    'characterId',
    'characterProvider',
    'characterModel',
    'chatMode',
    'chatProvider',
    'chatModel',
    'customBgName',
    'sideStoryCooldownMinutes',
    'sideStorySeedSource',
  ] as const

  function freshGlobalState(): any {
    const combined = fresh()
    return {
      kind: GLOBAL_SAVE_KIND,
      v: GLOBAL_SAVE_VERSION,
      personaSettings: combined.personaSettings,
      current: combined.current,
      lastCurrent: combined.lastCurrent,
      characters: combined.characters,
      tokens: { bank: combined.tokens.bank, seenUsage: [] },
      bg: combined.bg,
      backgroundRevision: combined.backgroundRevision,
      cg: combined.cg,
      relationshipLastActiveAt: 0,
      activityFeed: [],
      preferences: combined.preferences,
      modelOnline: combined.modelOnline,
      characterModelLabel: combined.characterModelLabel,
      chatModelLabel: combined.chatModelLabel,
      modelLabel: combined.modelLabel,
      lastModel: combined.lastModel,
      fallbackUsed: combined.fallbackUsed,
      fallbackReason: combined.fallbackReason,
      // Side-story run state. Purely additive, so the save version stays at 2:
      // an older build reading this file ignores the field instead of latching
      // the whole save as an unrecognized version.
      sideStory: normalizeSideStory(null),
      // Claims record which global choices have already been established.
      // Legacy workspace imports may fill an unclaimed field once, but can
      // never overwrite a value chosen in the new global store.
      migration: {
        imports: [],
        contextImports: [],
        claims: {
          preferences: [],
          profiles: {},
          sprites: [],
          bg: false,
          cg: false,
          relationshipReset: false,
        },
      },
    }
  }

  function freshWorkspaceState(workspaceKey = ''): any {
    return {
      kind: WORKSPACE_SAVE_KIND,
      v: WORKSPACE_SAVE_VERSION,
      // A workspace is only an event source. Game progress lives in global.json.
      source: {
        workspaceKey: typeof workspaceKey === 'string' ? workspaceKey : '',
        migratedAt: 0,
      },
    }
  }

  function replaceGlobalStateInPlace(replacement: any): void {
    if (!globalState || typeof globalState !== 'object') {
      globalState = replacement
      return
    }
    const existingCharacters = globalState.characters && typeof globalState.characters === 'object'
      ? globalState.characters
      : {}
    for (const id of ROSTER_IDS) {
      const target = existingCharacters[id] && typeof existingCharacters[id] === 'object'
        ? existingCharacters[id]
        : {}
      for (const key of Reflect.ownKeys(target)) delete target[key as any]
      Object.assign(target, replacement.characters[id])
      existingCharacters[id] = target
    }
    for (const key of Reflect.ownKeys(globalState)) {
      if (key !== 'characters') delete globalState[key as any]
    }
    Object.assign(globalState, { ...replacement, characters: existingCharacters })
  }

  function replaceWorkspaceStateInPlace(runtime: any, replacement: any): void {
    if (!runtime || !replacement || typeof replacement !== 'object') return
    if (!runtime.state || typeof runtime.state !== 'object') {
      runtime.state = replacement
      runtime.facade = composeState(globalState, runtime.state)
      return
    }
    for (const key of Reflect.ownKeys(runtime.state)) delete runtime.state[key as any]
    Object.assign(runtime.state, replacement)
  }

  function composeState(globalData: any, workspaceData: any): any {
    const characters: Record<string, any> = {}
    for (const id of ROSTER_IDS) {
      const globalCharacter = globalData.characters[id]
      const workspaceCharacter = workspaceData && workspaceData.characters
        && workspaceData.characters[id] && typeof workspaceData.characters[id] === 'object'
        ? workspaceData.characters[id]
        : {}
      characters[id] = new Proxy({}, {
        get(_target, property: string | symbol): any {
          if (typeof property === 'string' && GLOBAL_CHARACTER_FIELDS.has(property)) {
            return globalCharacter[property]
          }
          return workspaceCharacter[property as any]
        },
        set(_target, property: string | symbol, value: any): boolean {
          if (typeof property === 'string' && GLOBAL_CHARACTER_FIELDS.has(property)) {
            globalCharacter[property] = value
          } else {
            workspaceCharacter[property as any] = value
          }
          return true
        },
        ownKeys(): ArrayLike<string | symbol> {
          return Array.from(new Set([...Reflect.ownKeys(globalCharacter), ...Reflect.ownKeys(workspaceCharacter)]))
        },
        getOwnPropertyDescriptor(): PropertyDescriptor {
          return { configurable: true, enumerable: true, writable: true }
        },
      })
    }
    return new Proxy({}, {
      get(_target, property: string | symbol): any {
        if (property === 'characters') return characters
        if (typeof property === 'string' && GLOBAL_ROOT_FIELDS.has(property)) return globalData[property]
        return workspaceData[property as any]
      },
      set(_target, property: string | symbol, value: any): boolean {
        if (property === 'characters') return false
        if (typeof property === 'string' && GLOBAL_ROOT_FIELDS.has(property)) globalData[property] = value
        else workspaceData[property as any] = value
        return true
      },
      ownKeys(): ArrayLike<string | symbol> {
        return Array.from(new Set(['characters', ...Reflect.ownKeys(globalData), ...Reflect.ownKeys(workspaceData)]))
      },
      getOwnPropertyDescriptor(): PropertyDescriptor {
        return { configurable: true, enumerable: true, writable: true }
      },
    })
  }

  function makeWorkspaceRuntime(root: string, key: string, state = freshWorkspaceState(key)): any {
    return {
      root,
      key,
      state,
      facade: composeState(globalState, state),
      readyPromise: null,
      tokensObserved: 0,
      tokensAppliedRuntime: 0,
      boundActivitySessionId: '',
      activityCache: [] as HarnessActivity[],
      activityCacheRoot: root,
      activityCacheAt: 0,
      activityCacheGeneration: 0,
      activityRefreshPromise: null,
      activityWarmTimer: null,
      viewMaintenancePromise: null,
      viewMaintenanceNeedsSave: false,
      chatMutex: Promise.resolve(),
    }
  }

  function activateWorkspaceRuntime(runtime: any): void {
    activeWorkspaceRuntime = runtime
    lastWorkspaceKey = runtime && runtime.key ? runtime.key : lastWorkspaceKey
  }

  function clamp(n: number): number {
    return Number.isFinite(n) ? Math.max(0, n) : 0
  }

  function validBackgroundRevision(value: any): boolean {
    return Number.isSafeInteger(value) && value >= 0
  }

  function backgroundRevisionFor(value: any): number {
    return validBackgroundRevision(value) ? value : 0
  }

  function nextBackgroundRevision(value: any): number {
    const current = backgroundRevisionFor(value)
    return current >= Number.MAX_SAFE_INTEGER ? 0 : current + 1
  }

  function bumpBackgroundRevision(): number {
    ensureState()
    const next = nextBackgroundRevision(s.backgroundRevision)
    s.backgroundRevision = next
    return next
  }

  function captureBackgroundMutationSnapshot(): any {
    ensureState()
    const currentCharacter = s.characters && s.characters[s.current]
    const migration = splitStorageActive() && globalState ? globalState.migration : undefined
    return {
      bg: s.bg,
      backgroundRevision: s.backgroundRevision,
      preferences: { ...(s.preferences || {}) },
      currentCharacter,
      chosenBuiltinBackground: currentCharacter ? currentCharacter.chosenBuiltinBackground : null,
      cgs: allCgs().map((cg: any) => ({
        cg,
        seen: cg.seen,
        savedAsBg: cg.savedAsBg,
      })),
      migration: migration === undefined ? undefined : JSON.parse(JSON.stringify(migration)),
    }
  }

  function restoreBackgroundMutationSnapshot(snapshot: any): void {
    if (!snapshot) return
    s.bg = snapshot.bg
    s.backgroundRevision = snapshot.backgroundRevision
    s.preferences = snapshot.preferences
    if (snapshot.currentCharacter) {
      snapshot.currentCharacter.chosenBuiltinBackground = snapshot.chosenBuiltinBackground
    }
    for (const entry of snapshot.cgs || []) {
      entry.cg.seen = entry.seen
      entry.cg.savedAsBg = entry.savedAsBg
    }
    if (splitStorageActive() && globalState) globalState.migration = snapshot.migration
  }

  async function persistBackgroundMutation(snapshot: any): Promise<void> {
    try {
      await save('global')
    } catch (err) {
      restoreBackgroundMutationSnapshot(snapshot)
      throw err
    }
  }

  function makeId(prefix: string): string {
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9)
  }

  /**
   * Per-character affection deltas for one choice. Main-line choices leave this
   * empty and settle through `effect` on the speaking character alone; side
   * stories fill it so one choice can move the whole cast.
   */
  function normalizeChoiceEffects(raw: any): Record<string, number> {
    const out: Record<string, number> = {}
    if (!raw || typeof raw !== 'object') return out
    for (const id of ROSTER_IDS) {
      const value = (raw as any)[id]
      if (value === 1 || value === -1 || value === 0) out[id] = value
    }
    return out
  }

  function normalizeChoice(choice: any, index = 0): any {
    if (typeof choice === 'string') {
      return { id: makeId('legacy-choice-' + index), text: choice.trim().slice(0, 30), effect: 0 }
    }
    if (!choice || typeof choice !== 'object' || typeof choice.text !== 'string' || !choice.text.trim()) return null
    const effect = choice.effect === 1 ? 1 : choice.effect === -1 ? -1 : 0
    const base: any = {
      id: typeof choice.id === 'string' && choice.id ? choice.id : makeId('choice-' + index),
      text: choice.text.trim().slice(0, 40),
      effect,
    }
    // The four-direction choices carry what each button promises; older saves
    // simply have neither field and fall back to the plain text button.
    if (typeof choice.intent === 'string' && (CHOICE_INTENTS as readonly string[]).includes(choice.intent)) {
      base.intent = choice.intent
      base.label = CHOICE_LABELS[choice.intent]
    }
    // Main-line choices settle on the speaking character alone and stay exactly
    // as they were on disk; only a multi-character choice carries the map.
    const effects = normalizeChoiceEffects(choice.effects)
    if (Object.keys(effects).length > 0) base.effects = effects
    return base
  }



  function shuffleOnce<T>(items: T[]): T[] {
    const out = items.slice()
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = out[i]
      out[i] = out[j]
      out[j] = tmp
    }
    return out
  }

  function sanitizeStoredCgPrompt(raw: any): string | null {
    if (typeof raw !== 'string' || !raw.trim()) return null
    const prompt = raw.trim()
    const marker = [
      '画面元素呼应主人最近的经历与工作：',
      '画面元素呼应对方最近的经历与工作：',
    ].find((candidate) => prompt.includes(candidate)) || ''
    if (!marker) return prompt.slice(0, 1200)
    const markerAt = prompt.indexOf(marker)

    const theme = prompt.slice(markerAt + marker.length)
    const unsafeLegacyTheme = !prompt.includes('横向16:9桌面壁纸构图')
      || theme.length > 400
      || /\b(the user|assistant|analysis|reasoning|tool call|tool output|exec_command|apply_patch)\b/i.test(theme)
      || /https?:\/\/|\b[A-Za-z]:[\\/]/i.test(theme)
    if (unsafeLegacyTheme) {
      return prompt.slice(0, markerAt) + '温暖浪漫的日常氛围（旧版主题摘要已隐藏）'
    }
    return prompt.slice(0, markerAt + marker.length) + theme.slice(0, 360)
  }

  function normalizeCg(raw: any, charId: string, index = 0): any {
    if (!raw || typeof raw !== 'object') return null
    const at = typeof raw.at === 'number' ? raw.at : Date.now()
    const dataUrl = typeof raw.dataUrl === 'string' && raw.dataUrl.startsWith('data:') ? raw.dataUrl : null
    const status = raw.status === 'failed' ? 'failed' : raw.status === 'generating' ? 'generating' : dataUrl ? 'ready' : 'failed'
    return {
      id: typeof raw.id === 'string' && raw.id ? raw.id : 'legacy-cg-' + at + '-' + index,
      status,
      dataUrl,
      prompt: typeof raw.prompt === 'string' ? raw.prompt : null,
      charId,
      level: typeof raw.level === 'number' && raw.level >= 1 ? raw.level : null,
      at,
      seen: raw.seen === true,
      savedAsBg: raw.savedAsBg === true,
      error: typeof raw.error === 'string' && raw.error ? raw.error : null,
      // Image generation metadata. nsfw survives reloads so the gallery can keep
      // filtered tiers apart instead of trusting a runtime flag.
      nsfw: raw.nsfw === true,
      label: typeof raw.label === 'string' ? raw.label : '',
      backend: typeof raw.backend === 'string' ? raw.backend : '',
      enPrompt: typeof raw.enPrompt === 'string' ? raw.enPrompt : '',
    }
  }

  function opaqueFingerprint(prefix: string, value: string): string {
    let hash = 2166136261
    for (let index = 0; index < value.length; index++) {
      hash ^= value.charCodeAt(index)
      hash = Math.imul(hash, 16777619)
    }
    return prefix + (hash >>> 0).toString(36)
  }

  function normalizeGlobalTokens(raw: any): any {
    const seenUsage = raw && Array.isArray(raw.seenUsage)
      ? Array.from(new Set(raw.seenUsage.filter((value: any) => (
        typeof value === 'string' && /^usage-[a-z0-9]+$/i.test(value)
      )))).slice(-MAX_USAGE_FINGERPRINTS)
      : []
    return {
      bank: raw && typeof raw.bank === 'number' ? Math.max(0, raw.bank) : 0,
      seenUsage,
    }
  }

  function normalizeSafeActivity(raw: any, sourceKey = ''): HarnessActivity & { sourceKey: string } | null {
    if (!raw || typeof raw !== 'object'
      || typeof raw.fingerprint !== 'string'
      || !/^activity-[a-z0-9]+$/i.test(raw.fingerprint)
      || typeof raw.category !== 'string'
      || typeof raw.label !== 'string'
      || !['active', 'completed', 'paused', 'blocked'].includes(raw.status)
      || !Number.isFinite(raw.time)) return null
    const clean = (value: any, limit: number): string => String(value || '')
      .replace(/https?:\/\/\S+/gi, ' ')
      .replace(/\b[A-Za-z]:[\\/][^\s，。；！？,;]+/g, ' ')
      .replace(/\b(?:sk-[A-Za-z0-9_-]{8,}|Bearer\s+\S+)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, limit)
    return {
      fingerprint: raw.fingerprint,
      category: raw.category as any,
      label: clean(raw.label, 40),
      status: raw.status,
      time: Math.max(0, Math.floor(raw.time)),
      chatHint: clean(raw.chatHint, 500),
      cgHint: clean(raw.cgHint, 360),
      sourceKey: typeof raw.sourceKey === 'string' && /^ws-[a-f0-9]+$/i.test(raw.sourceKey)
        ? raw.sourceKey
        : sourceKey,
    }
  }

  function normalizeActivityFeed(raw: any): Array<HarnessActivity & { sourceKey: string }> {
    const rows = Array.isArray(raw) ? raw : []
    const byFingerprint = new Map<string, HarnessActivity & { sourceKey: string }>()
    for (const row of rows) {
      const safe = normalizeSafeActivity(row)
      if (!safe) continue
      const previous = byFingerprint.get(safe.fingerprint)
      if (!previous || safe.time >= previous.time) byFingerprint.set(safe.fingerprint, safe)
    }
    return [...byFingerprint.values()]
      .sort((left, right) => right.time - left.time || left.fingerprint.localeCompare(right.fingerprint))
      .slice(0, MAX_GLOBAL_ACTIVITIES)
  }

  /**
   * Models overshoot the 40-character budget constantly. A hard slice leaves
   * sentences chopped mid-word on screen, so trim back to the last sentence
   * ending inside the allowance and mark an elision when there is none.
   */
  function trimBeatText(raw: string): string {
    const text = raw.trim()
    if (text.length <= SIDE_STORY_BEAT_LIMIT) return text
    const window = text.slice(0, SIDE_STORY_BEAT_HARD_LIMIT)
    const stops = ['。', '！', '？', '～', '…', '」', '】', '.', '!', '?']
    let cut = -1
    for (const stop of stops) cut = Math.max(cut, window.lastIndexOf(stop))
    // Only honour a break that keeps most of the line; otherwise elide.
    if (cut >= Math.floor(SIDE_STORY_BEAT_LIMIT * 0.6)) return window.slice(0, cut + 1)
    return window.slice(0, SIDE_STORY_BEAT_LIMIT - 1) + '…'
  }

  /**
   * The cast brief hands the model lowercase roster ids, and it sometimes writes
   * one straight into the narration ("grok凑过来"). Swap those back to display
   * names. Case-sensitive on purpose: real model names appear capitalised
   * ("听说 Kimi 慢"), and those are legitimate rumour material to keep.
   */
  function humanizeRosterIds(text: string): string {
    let out = text
    for (const id of ROSTER_IDS) {
      const name = effectiveProfileFor(id).displayName
      if (!name || name === id) continue
      out = out.replace(new RegExp('(^|[^A-Za-z0-9-])' + id + '(?![A-Za-z0-9-])', 'g'), '$1' + name)
    }
    return out
  }

  function normalizeSideStoryBeat(raw: any): any | null {
    if (!raw || typeof raw !== 'object' || typeof raw.text !== 'string') return null
    const text = trimBeatText(humanizeRosterIds(raw.text))
    if (!text) return null
    const speaker = raw.speaker === 'narrator' || raw.speaker === 'user' || ROSTER[raw.speaker]
      ? raw.speaker
      : null
    if (!speaker) return null
    const emotion = typeof raw.emotion === 'string' && EMOTION_KEYS.indexOf(raw.emotion) >= 0
      ? raw.emotion
      : 'cheerful'
    return speaker === 'narrator' || speaker === 'user' ? { speaker, text } : { speaker, text, emotion }
  }

  /**
   * @param slot - which interlude these belong to. Ids are scoped to it because
   * one scene now carries several choice sets, and `makeId` alone can repeat
   * inside the same millisecond.
   */
  function normalizeSideStoryChoiceList(raw: any, cast: string[], slot: number): any[] {
    const rows = Array.isArray(raw) ? raw : []
    return rows
      .map((choice: any, index: number) => {
        const normalized = normalizeChoice(choice, index)
        if (!normalized) return null
        const restoredId = choice && typeof choice.id === 'string' && choice.id ? choice.id : ''
        normalized.id = restoredId || makeId('choice-' + slot + '-' + index)
        // Effects may only touch the cast, and only by a single step.
        const source = (choice && choice.effects) || {}
        const effects: Record<string, number> = {}
        for (const id of cast) {
          const value = source[id]
          if (value === 1 || value === -1) effects[id] = value
        }
        // How the cast answers this particular line. Without it the master
        // speaks into a void and the scene just stalls.
        const reply = (choice && Array.isArray(choice.reply) ? choice.reply : [])
          .map((beat: any) => normalizeSideStoryBeat(beat))
          .filter((beat: any) => beat && beat.speaker !== 'user'
            && (beat.speaker === 'narrator' || cast.indexOf(beat.speaker) >= 0))
          .slice(0, 2)
        return reply.length ? { ...normalized, effects, reply } : null
      })
      .filter(Boolean)
      .slice(0, CHOICE_INTENTS.length)
  }

  /**
   * The model writes acts; the runtime plays one flat beat list. Flattening here
   * keeps the cursor a simple index while still giving the master more than one
   * place to speak: each act boundary becomes an interlude anchored to the beat
   * it follows.
   */
  function normalizeSideStoryScene(raw: any): any | null {
    if (!raw || typeof raw !== 'object') return null
    const cast = Array.isArray(raw.cast)
      ? [...new Set(raw.cast.filter((id: any) => typeof id === 'string' && ROSTER[id]))].slice(0, SIDE_STORY_MAX_CAST)
      : []
    if (cast.length < SIDE_STORY_MIN_CAST) return null

    const beats: any[] = []
    const interludes: any[] = []
    const acceptBeat = (beat: any) => beat
      && (beat.speaker === 'narrator' || beat.speaker === 'user' || cast.indexOf(beat.speaker) >= 0)

    if (Array.isArray(raw.acts)) {
      for (const act of raw.acts) {
        if (!act || typeof act !== 'object') continue
        const actBeats = (Array.isArray(act.beats) ? act.beats : [])
          .map((beat: any) => normalizeSideStoryBeat(beat))
          .filter(acceptBeat)
        if (!actBeats.length) continue
        for (const beat of actBeats) {
          if (beats.length >= SIDE_STORY_MAX_BEATS) break
          beats.push(beat)
        }
        const choices = normalizeSideStoryChoiceList(act.choices, cast, interludes.length)
        if (choices.length === 3) {
          interludes.push({ at: beats.length - 1, consumed: false, choices })
        }
      }
    } else {
      // Restored saves and older payloads carry the flat shape.
      for (const beat of (Array.isArray(raw.beats) ? raw.beats : []).map((b: any) => normalizeSideStoryBeat(b)).filter(acceptBeat)) {
        if (beats.length >= SIDE_STORY_MAX_BEATS + 8) break
        beats.push(beat)
      }
      const restored = Array.isArray(raw.interludes) ? raw.interludes : []
      for (const row of restored) {
        if (!row || typeof row !== 'object') continue
        const at = Math.floor(Number(row.at))
        if (!Number.isFinite(at) || at < 0 || at >= beats.length) continue
        const choices = normalizeSideStoryChoiceList(row.choices, cast, interludes.length)
        if (row.consumed === true) interludes.push({ at, consumed: true, choices: [] })
        else if (choices.length === 3) interludes.push({ at, consumed: false, choices })
      }
    }
    if (!beats.length) return null
    // A skit with no place for the master to speak is exactly the passive
    // cutscene this feature is not supposed to be.
    if (!interludes.length) return null

    const seedKind = raw.seed && (raw.seed.kind === 'activity' || raw.seed.kind === 'manual' || raw.seed.kind === 'web')
      ? raw.seed.kind
      : 'activity'
    const seedSummary = raw.seed && typeof raw.seed.summary === 'string' ? raw.seed.summary.trim().slice(0, 120) : ''
    const sources = (Array.isArray(raw.sources) ? raw.sources : [])
      .filter((row: any) => row && typeof row.url === 'string' && /^https?:\/\//i.test(row.url))
      .slice(0, 5)
      .map((row: any) => ({
        url: row.url,
        title: typeof row.title === 'string' && row.title.trim() ? row.title.trim().slice(0, 80) : row.url,
      }))
    const cursor = Math.max(0, Math.min(beats.length - 1, Math.floor(Number(raw.cursor) || 0)))
    return {
      id: typeof raw.id === 'string' && raw.id ? raw.id : makeId('side-story'),
      createdAt: Math.max(0, Math.floor(Number(raw.createdAt) || 0)),
      seed: { kind: seedKind, summary: seedSummary },
      frame: typeof raw.frame === 'string' ? raw.frame.slice(0, 40) : '',
      twist: typeof raw.twist === 'string' ? raw.twist.slice(0, 40) : '',
      subject: ROSTER[raw.subject] ? raw.subject : cast[0],
      sources,
      cast,
      beats,
      interludes,
      // Effects accumulate across interludes so the closing line reports the
      // whole scene, not just the last thing the master said.
      applied: (() => {
        const out: Record<string, number> = {}
        const source = raw.applied && typeof raw.applied === 'object' ? raw.applied : {}
        for (const id of cast) {
          const value = Math.round(Number(source[id]))
          if (Number.isFinite(value) && value !== 0) out[id] = value
        }
        return out
      })(),
      cursor,
      settled: raw.settled === true,
    }
  }


  function normalizeSideStory(raw: any): any {
    const history = (Array.isArray(raw && raw.history) ? raw.history : [])
      .filter((row: any) => row && typeof row === 'object' && typeof row.digest === 'string' && row.digest)
      .slice(-SIDE_STORY_HISTORY_LIMIT)
      .map((row: any) => ({
        at: Math.max(0, Math.floor(Number(row.at) || 0)),
        digest: String(row.digest).slice(0, 120),
        frame: typeof row.frame === 'string' ? row.frame.slice(0, 40) : '',
        subject: ROSTER[row.subject] ? row.subject : '',
        twist: typeof row.twist === 'string' ? row.twist.slice(0, 40) : '',
        cast: Array.isArray(row.cast) ? row.cast.filter((id: any) => ROSTER[id]).slice(0, SIDE_STORY_MAX_CAST) : [],
      }))
    const transcripts = (Array.isArray(raw && raw.transcripts) ? raw.transcripts : [])
      .filter((row: any) => row && typeof row === 'object' && Array.isArray(row.lines) && row.lines.length)
      .slice(-SIDE_STORY_TRANSCRIPT_LIMIT)
      .map((row: any) => ({
        id: typeof row.id === 'string' && row.id ? row.id : makeId('skit'),
        at: Math.max(0, Math.floor(Number(row.at) || 0)),
        seed: typeof row.seed === 'string' ? row.seed.slice(0, 120) : '',
        cast: Array.isArray(row.cast) ? row.cast.filter((id: any) => ROSTER[id]).slice(0, SIDE_STORY_MAX_CAST) : [],
        cgId: typeof row.cgId === 'string' ? row.cgId : '',
        lines: row.lines
          .filter((line: any) => line && typeof line.text === 'string' && line.text)
          .slice(0, (SIDE_STORY_MAX_BEATS + 6))
          .map((line: any) => ({
            who: line.who === 'user' || line.who === 'heroine' ? line.who : 'narrator',
            name: typeof line.name === 'string' ? line.name.slice(0, 24) : '',
            text: String(line.text).slice(0, SIDE_STORY_BEAT_LIMIT + 8),
          })),
      }))
    return {
      lastRunAt: Math.max(0, Math.floor(Number(raw && raw.lastRunAt) || 0)),
      scene: normalizeSideStoryScene(raw && raw.scene),
      history,
      transcripts,
    }
  }

  function mergeGlobalActivityFeed(rows: readonly HarnessActivity[], sourceKey: string): boolean {
    if (!splitStorageActive() || !globalState || !Array.isArray(rows) || rows.length === 0) return false
    const before = JSON.stringify(globalState.activityFeed || [])
    globalState.activityFeed = normalizeActivityFeed([
      ...(globalState.activityFeed || []),
      ...rows.map((row) => ({ ...row, sourceKey })),
    ])
    return JSON.stringify(globalState.activityFeed) !== before
  }

  function globalActivityCandidates(): HarnessActivity[] {
    if (splitStorageActive() && globalState) return normalizeActivityFeed(globalState.activityFeed)
    return activityCache
  }

  function findCg(cgId: string): any {
    if (!currentStateBacking() || !cgId) return null
    for (const charId of ROSTER_IDS) {
      const cgs = s.characters && s.characters[charId] && Array.isArray(s.characters[charId].cgs)
        ? s.characters[charId].cgs
        : []
      const cg = cgs.find((item: any) => item && item.id === cgId)
      if (cg) return cg
    }
    return null
  }

  function findGlobalCg(cgId: string): any {
    if (!globalState || !globalState.characters || !cgId) return null
    for (const charId of ROSTER_IDS) {
      const rows = globalState.characters[charId] && Array.isArray(globalState.characters[charId].cgs)
        ? globalState.characters[charId].cgs
        : []
      const match = rows.find((item: any) => item && item.id === cgId)
      if (match) return match
    }
    return null
  }

  function allCgs(): any[] {
    if (!currentStateBacking()) return []
    const rows: any[] = []
    for (const charId of ROSTER_IDS) {
      const cgs = s.characters && s.characters[charId] && Array.isArray(s.characters[charId].cgs)
        ? s.characters[charId].cgs
        : []
      rows.push(...cgs)
    }
    return rows.sort((a, b) => (b.at || 0) - (a.at || 0))
  }

  function currentCg(): any {
    return s && s.cg && typeof s.cg.cgId === 'string' ? findCg(s.cg.cgId) : null
  }

  function workspaceRoot(): string | undefined {
    try {
      const ws = workspaceRegistry && typeof workspaceRegistry.list === 'function' ? workspaceRegistry.list() : []
      if (Array.isArray(ws) && ws.length > 0 && ws[0] && typeof ws[0].path === 'string') return ws[0].path
    } catch (err) { /* ignore */ }
    return undefined
  }

  function splitStorageActive(): boolean {
    return typeof dshHomePath === 'function'
  }

  function normalizedWorkspacePath(value: any): string {
    return typeof value === 'string'
      ? value.replace(/\\/g, '/').replace(/\/$/, '').toLowerCase()
      : ''
  }

  function sameWorkspace(left: any, right: any): boolean {
    const a = normalizedWorkspacePath(left)
    const b = normalizedWorkspacePath(right)
    return !!a && a === b
  }

  function activityWorkspaceRoot(): string {
    const runtime = splitStorageActive() ? currentWorkspaceRuntime() : null
    if (runtime && runtime.root) {
      return runtime.root
    }
    return workspaceRoot() || ''
  }

  function registeredWorkspaceRoot(candidate: string): string {
    if (!candidate) return ''
    try {
      const rows = workspaceRegistry && typeof workspaceRegistry.list === 'function'
        ? workspaceRegistry.list()
        : []
      if (!Array.isArray(rows) || rows.length === 0) return ''
      const match = rows.find((row: any) => row && sameWorkspace(row.path, candidate))
      return match && typeof match.path === 'string' ? match.path : ''
    } catch (err) {
      return ''
    }
  }

  function headerFromSessionRow(row: any): any {
    if (!row || typeof row !== 'object') return null
    return row.header && typeof row.header === 'object' ? row.header : row
  }

  async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | null = null
    try {
      return await Promise.race([
        promise,
        new Promise<T>((resolve) => {
          timer = setTimeout(() => resolve(fallback), timeoutMs)
        }),
      ])
    } finally {
      if (timer) clearTimeout(timer)
    }
  }

  async function sessionHeader(rawSessionId: any): Promise<any> {
    const sessionId = typeof rawSessionId === 'string' ? rawSessionId.trim().slice(0, 240) : ''
    if (!sessionId) return null
    try {
      if (sessionsSvc && typeof sessionsSvc.list === 'function') {
        const rows = sessionsSvc.list()
        const live = Array.isArray(rows)
          ? rows.map(headerFromSessionRow).find((header: any) => header && header.id === sessionId)
          : null
        if (live) return live
      }
    } catch (err) { /* fall through to the lightweight persistence listing */ }
    try {
      if (sessionQuery && typeof sessionQuery.listSessions === 'function') {
        const rows = await withTimeout(Promise.resolve(sessionQuery.listSessions()), SESSION_LOOKUP_TIMEOUT_MS, [])
        if (Array.isArray(rows)) {
          const match = rows.map(headerFromSessionRow).find((header: any) => header && header.id === sessionId)
          if (match) return match
        }
      }
    } catch (err) { /* unresolved sessions receive an isolated fresh context */ }
    return null
  }

  async function workspaceForSession(rawSessionId: any): Promise<{ root: string; key: string; sessionId: string }> {
    const sessionId = typeof rawSessionId === 'string' ? rawSessionId.trim().slice(0, 240) : ''
    if (sessionId) {
      const cached = sessionWorkspaceCache.get(sessionId)
      if (cached) return { ...cached, sessionId }
      const header = await sessionHeader(sessionId)
      if (header && typeof header.cwd === 'string' && header.cwd.trim()) {
        const root = registeredWorkspaceRoot(header.cwd) || header.cwd
        const key = normalizedWorkspacePath(root)
        if (key) {
          const resolved = { root, key }
          sessionWorkspaceCache.set(sessionId, resolved)
          return { ...resolved, sessionId }
        }
      }
      // A temporarily unavailable header must never route a session-scoped
      // mutation into workspaceRegistry[0]. Keep it isolated in memory and
      // retry lightweight resolution on the next request/event.
      return { root: '', key: 'unresolved:' + sessionId, sessionId }
    }
    // An unscoped overlay has no authority to borrow workspaceRegistry[0].
    // It receives the shared global state plus a fresh, non-persisted local
    // facade; workspace-bound mutations are rejected by handleAction.
    return { root: '', key: 'ephemeral:unscoped', sessionId }
  }

  async function bindActivitySession(rawSessionId: any): Promise<'unscoped' | 'matched' | 'mismatch'> {
    const sessionId = typeof rawSessionId === 'string' ? rawSessionId.trim().slice(0, 240) : ''
    if (!splitStorageActive()) {
      if (!sessionId) return 'unscoped'
      if (sessionId === boundActivitySessionId) return 'matched'
      const header = await sessionHeader(sessionId)
      const verifiedRoot = registeredWorkspaceRoot(header && header.cwd)
      const stateRoot = activityWorkspaceRoot()
      if (!verifiedRoot || !sameWorkspace(header && header.cwd, stateRoot)) return 'mismatch'
      boundActivitySessionId = sessionId
      activityCacheGeneration += 1
      activityCacheAt = 0
      return 'matched'
    }

    await ensureGlobalReady()
    const scopedRuntime = workspaceStateContext.getStore()
    if (scopedRuntime) {
      if (!sessionId) return 'unscoped'
      if (scopedRuntime.boundActivitySessionId === sessionId) return 'matched'
      scopedRuntime.boundActivitySessionId = sessionId
      scopedRuntime.activityCacheGeneration += 1
      scopedRuntime.activityCacheAt = 0
      return 'matched'
    }
    const descriptor = await workspaceForSession(sessionId)
    const runtime = await ensureWorkspaceReady(descriptor.root, descriptor.key)
    activateWorkspaceRuntime(runtime)
    if (!sessionId) return 'unscoped'
    if (runtime.boundActivitySessionId === sessionId) return 'matched'
    runtime.boundActivitySessionId = sessionId
    runtime.activityCacheGeneration += 1
    runtime.activityCacheAt = 0
    return 'matched'
  }

  async function collectActivitySessions(root: string): Promise<any[]> {
    const snapshots: any[] = []
    const seen = new Set<string>()

    // Prefer the live store: it already carries the event bodies needed for
    // safe task classification and never performs a whole-session disk read.
    if (sessionsSvc && typeof sessionsSvc.list === 'function') {
      try {
        const live = sessionsSvc.list()
        for (const session of Array.isArray(live) ? live : []) {
          const header = headerFromSessionRow(session)
          const id = String(header.id || '')
          if (!id || seen.has(id) || !sameWorkspace(header.cwd, root) || header.origin === 'subagent') continue
          seen.add(id)
          const fullEvents = Array.isArray(session.events) ? session.events : []
          const eventStart = Math.max(0, fullEvents.length - ACTIVITY_EVENT_LIMIT)
          const inherited = Number.isSafeInteger(header.seedLength) && header.seedLength > 0
            ? Math.max(0, Math.min(header.seedLength, fullEvents.length) - eventStart)
            : 0
          snapshots.push({
            id,
            header: { ...header, seedLength: inherited },
            events: fullEvents.slice(eventStart),
          })
        }
      } catch (err) { /* fall through to bounded event listings */ }
    }

    // Some SessionQuery implementations expose complete event rows from
    // listEvents. Admit only those rows; metadata-only listings are useful for
    // ranking but cannot be mistaken for message content.
    if (sessionQuery && typeof sessionQuery.listSessions === 'function'
      && typeof sessionQuery.listEvents === 'function') {
      try {
        const records = await withTimeout(Promise.resolve(sessionQuery.listSessions()), SESSION_LOOKUP_TIMEOUT_MS, [])
        const boundId = currentWorkspaceRuntime()
          ? currentWorkspaceRuntime().boundActivitySessionId
          : boundActivitySessionId
        const candidates = (Array.isArray(records) ? records : [])
          .filter((row: any) => {
            const header = headerFromSessionRow(row)
            return header && header.origin !== 'subagent' && sameWorkspace(header.cwd, root)
          })
          .sort((left: any, right: any) => {
            const a = headerFromSessionRow(left)
            const b = headerFromSessionRow(right)
            if ((a.id === boundId) !== (b.id === boundId)) return a.id === boundId ? -1 : 1
            return Number(b.createdAt || 0) - Number(a.createdAt || 0)
          })
          .slice(0, ACTIVITY_SESSION_LIMIT)
        const rows = await Promise.all(candidates.map(async (record: any) => {
          const header = headerFromSessionRow(record)
          try {
            const events = await withTimeout(Promise.resolve(sessionQuery.listEvents(header.id)), SESSION_LOOKUP_TIMEOUT_MS, [])
            return { header, events }
          } catch (err) {
            return { header, events: [] }
          }
        }))
        for (const row of rows) {
          const header = row.header
          const id = String(header && header.id || '')
          if (!id || seen.has(id)) continue
          const completeEvents = Array.isArray(row.events)
            ? row.events.filter((event: any) => event && event.data && typeof event.type === 'string')
            : []
          if (completeEvents.length === 0) continue
          seen.add(id)
          const eventStart = Math.max(0, completeEvents.length - ACTIVITY_EVENT_LIMIT)
          const inherited = Number.isSafeInteger(header.seedLength) && header.seedLength > 0
            ? Math.max(0, Math.min(header.seedLength, completeEvents.length) - eventStart)
            : 0
          snapshots.push({
            id,
            header: { ...header, seedLength: inherited },
            events: completeEvents.slice(eventStart),
          })
        }
      } catch (err) {
        console.warn('whale-galgame activity history unavailable:', err)
      }
    }
    return snapshots
  }

  async function refreshActivityCache(force = false): Promise<void> {
    const runtime = currentWorkspaceRuntime()
    if (runtime) {
      const root = runtime.root
      if (!root) {
        runtime.activityCache = []
        return
      }
      const now = Date.now()
      if (!force && sameWorkspace(runtime.activityCacheRoot, root)
        && now - runtime.activityCacheAt < ACTIVITY_CACHE_MS) return
      if (runtime.activityRefreshPromise) {
        await runtime.activityRefreshPromise
        if (!force && sameWorkspace(runtime.activityCacheRoot, root)
          && Date.now() - runtime.activityCacheAt < ACTIVITY_CACHE_MS) return
      }
      runtime.activityRefreshPromise = (async () => {
        for (let attempt = 0; attempt < 2; attempt++) {
          const requestedGeneration = runtime.activityCacheGeneration
          const snapshots = await collectActivitySessions(root)
          const next = collectHarnessActivities(snapshots, root)
          if (runtime.activityCacheGeneration !== requestedGeneration) {
            runtime.activityCacheAt = 0
            if (attempt === 0) continue
            runtime.activityCache = []
            runtime.activityCacheRoot = root
            return
          }
          runtime.activityCache = next
          runtime.activityCacheRoot = root
          runtime.activityCacheAt = Date.now()
          if (mergeGlobalActivityFeed(next, workspaceImportKey(root))) scheduleGlobalEventFlush()
          return
        }
      })()
      try {
        await runtime.activityRefreshPromise
      } finally {
        runtime.activityRefreshPromise = null
      }
      return
    }
    const root = activityWorkspaceRoot()
    if (!root) {
      activityCache = []
      return
    }
    const now = Date.now()
    if (!force && sameWorkspace(activityCacheRoot, root) && now - activityCacheAt < ACTIVITY_CACHE_MS) return
    if (activityRefreshPromise) {
      await activityRefreshPromise
      if (!force && sameWorkspace(activityCacheRoot, root) && Date.now() - activityCacheAt < ACTIVITY_CACHE_MS) return
    }
    const requestedRoot = root
    activityRefreshPromise = (async () => {
      for (let attempt = 0; attempt < 2; attempt++) {
        const requestedGeneration = activityCacheGeneration
        const snapshots = await collectActivitySessions(requestedRoot)
        const next = collectHarnessActivities(snapshots, requestedRoot)
        if (!sameWorkspace(activityWorkspaceRoot(), requestedRoot)) return
        if (activityCacheGeneration !== requestedGeneration) {
          activityCacheAt = 0
          if (attempt === 0) continue
          // Prefer omitting one proactive reference over using a stale digest.
          activityCache = []
          activityCacheRoot = requestedRoot
          return
        }
        activityCache = next
        activityCacheRoot = requestedRoot
        activityCacheAt = Date.now()
        return
      }
    })()
    try {
      await activityRefreshPromise
    } finally {
      activityRefreshPromise = null
    }
  }

  function scheduleActivityWarmup(delayMs = 0): void {
    const runtime = currentWorkspaceRuntime()
    if (runtime) {
      if (runtime.activityWarmTimer) clearTimeout(runtime.activityWarmTimer)
      runtime.activityWarmTimer = setTimeout(() => {
        runtime.activityWarmTimer = null
        void workspaceStateContext.run(runtime, () => refreshActivityCache()).catch((err) => {
          console.warn('whale-galgame activity warmup failed:', err)
        })
      }, Math.max(0, delayMs))
      return
    }
    if (activityWarmTimer) clearTimeout(activityWarmTimer)
    activityWarmTimer = setTimeout(() => {
      activityWarmTimer = null
      void refreshActivityCache().catch((err) => {
        console.warn('whale-galgame activity warmup failed:', err)
      })
    }, Math.max(0, delayMs))
  }

  function resolvePolicy(): any {
    try {
      if (!sandboxPolicy) return undefined
      let session: any
      const root = activityWorkspaceRoot()
      if (root && sessionsSvc && typeof sessionsSvc.list === 'function') {
        const list = sessionsSvc.list()
        if (Array.isArray(list)) {
          session = list.find((x: any) => x && x.header && x.header.cwd === root)
        }
      }
      return sandboxPolicy.resolve(session ? { session } : {})
    } catch (err) {
      return undefined
    }
  }

  function usageFromEvent(event: any): { total: number; input: number; output: number } {
    const usage = event && event.data && event.data.usage
    const rawInput = Number(usage && (usage.inputTokens ?? usage.input_tokens ?? usage.promptTokens ?? usage.prompt_tokens))
    const rawOutput = Number(usage && (usage.outputTokens ?? usage.output_tokens ?? usage.completionTokens ?? usage.completion_tokens))
    const input = Number.isFinite(rawInput) && rawInput > 0 ? Math.floor(rawInput) : 0
    const output = Number.isFinite(rawOutput) && rawOutput > 0 ? Math.floor(rawOutput) : 0
    return { total: input + output, input, output }
  }

  function usageFingerprint(session: any, event: any, usage: { input: number; output: number }): string {
    const header = session && session.header && typeof session.header === 'object' ? session.header : {}
    const data = event && event.data && typeof event.data === 'object' ? event.data : {}
    const stableIdentity = [
      String(header.id || ''),
      String(event && event.seq !== undefined ? event.seq : ''),
      String(event && event.time !== undefined ? event.time : ''),
      String(data.id || (data.message && data.message.id) || ''),
      String(data.turn ?? ''),
      String(usage.input),
      String(usage.output),
    ].join('|')
    return opaqueFingerprint('usage-', stableIdentity)
  }

  function recordGlobalUsage(session: any, event: any): boolean {
    if (!globalState) return false
    const usage = usageFromEvent(event)
    if (usage.total <= 0) return false
    globalState.tokens = normalizeGlobalTokens(globalState.tokens)
    const fingerprint = usageFingerprint(session, event, usage)
    if (globalState.tokens.seenUsage.includes(fingerprint)) return false
    globalState.tokens.bank += usage.total
    globalState.tokens.seenUsage.push(fingerprint)
    if (globalState.tokens.seenUsage.length > MAX_USAGE_FINGERPRINTS) {
      globalState.tokens.seenUsage = globalState.tokens.seenUsage.slice(-MAX_USAGE_FINGERPRINTS)
    }
    return true
  }

  function scheduleGlobalEventFlush(delayMs = 250): void {
    if (!splitStorageActive() || !globalState) return
    globalEventDirty = true
    if (globalEventFlushTimer) return
    globalEventFlushTimer = setTimeout(() => {
      globalEventFlushTimer = null
      void runSerializedStateTask(async () => {
        if (!globalEventDirty || !globalState) return
        globalEventDirty = false
        try {
          await writeGlobalState()
        } catch (err) {
          globalEventDirty = true
          console.warn('whale-galgame deferred global event save failed:', err)
          scheduleGlobalEventFlush(1_000)
        }
      })
    }, Math.max(0, delayMs))
  }

  ctx.on('session/event', (session: any, event: any) => {
    const header = session && session.header
    if (splitStorageActive()) {
      if (!header || typeof header.cwd !== 'string' || !header.cwd) return
      const root = registeredWorkspaceRoot(header.cwd) || header.cwd
      const key = normalizedWorkspacePath(root)
      if (!key) return
      if (typeof header.id === 'string' && header.id) {
        sessionWorkspaceCache.set(header.id, { root, key })
      }
      const type = String(event && event.type || '')
      if (type === 'assistant/message') {
        void ensureGlobalReady().then(() => runSerializedStateTask(async () => {
          if (globalState && globalState.preferences && globalState.preferences.enabled === false) return
          if (recordGlobalUsage(session, event)) scheduleGlobalEventFlush()
        })).catch(() => { /* retry from a future event or API request */ })
      }
      const applyToRuntime = (runtime: any) => workspaceStateContext.run(runtime, () => {
        if (globalState && globalState.preferences && globalState.preferences.enabled === false) return
        if (type === 'user/message' || type === 'tool/call' || type === 'todo/write' || type === 'turn/end') {
          runtime.activityCacheGeneration += 1
          runtime.activityCacheAt = 0
          scheduleActivityWarmup(type === 'turn/end' ? 50 : 600)
        }
      })
      const loaded = workspaceRuntimes.get(key)
      if (loaded && !loaded.readyPromise) {
        applyToRuntime(loaded)
      } else {
        void ensureWorkspaceReady(root, key).then(applyToRuntime).catch(() => { /* retry on the next event/view */ })
      }
      return
    }
    if (!header || !sameWorkspace(header.cwd, activityWorkspaceRoot())) return
    if (s && s.preferences && s.preferences.enabled === false) return
    const type = String(event && event.type || '')
    if (type === 'assistant/message') {
      const usage = usageFromEvent(event)
      if (usage.total > 0) {
        ensureState()
        if (!s.tokens) s.tokens = { bank: 0, lastActiveAt: 0 }
        s.tokens.bank = Math.max(0, Number(s.tokens.bank) || 0) + usage.total
      }
    }
    if (type === 'user/message' || type === 'tool/call' || type === 'todo/write' || type === 'turn/end') {
      activityCacheGeneration += 1
      activityCacheAt = 0
      // Do the expensive cross-session scan after the event burst, not while
      // the Galgame view is waiting for its first frame.
      scheduleActivityWarmup(type === 'turn/end' ? 50 : 600)
    }
  })

  function currentSelectionSync(): any {
    try {
      if (agentDefaultModel && typeof agentDefaultModel.currentSelection === 'function') {
        const sel = agentDefaultModel.currentSelection()
        if (sel && sel.provider && sel.model) return sel
      }
    } catch (err) { /* ignore */ }
    return null
  }

  function shortSetting(value: any): string {
    return typeof value === 'string' ? value.trim().slice(0, 240) : ''
  }

  function normalizePreferences(p: any): any {
    if (!p || typeof p !== 'object') p = {}
    if (typeof p.enabled !== 'boolean') p.enabled = cfg.enabled
    if (typeof p.petEnabled !== 'boolean') p.petEnabled = true

    // v5 saves only had petEnabled. Missing fields intentionally resolve to
    // the old behavior: workspace-driven character + configured flash chat.
    if (p.characterMode === 'workspace') p.characterMode = 'follow'
    if (p.characterMode !== 'manual') p.characterMode = 'follow'
    p.characterId = ROSTER[shortSetting(p.characterId)] ? shortSetting(p.characterId) : null
    p.characterProvider = shortSetting(p.characterProvider)
    p.characterModel = shortSetting(p.characterModel)
    if (p.characterMode === 'manual' && !p.characterId) p.characterMode = 'follow'

    if (p.chatMode === 'workspace') p.chatMode = 'main'
    if (p.chatMode === 'model') p.chatMode = 'manual'
    if (!['configured', 'main', 'manual'].includes(p.chatMode)) {
      p.chatMode = cfg.chatModel ? 'configured' : 'main'
    }
    p.chatProvider = shortSetting(p.chatProvider)
    p.chatModel = shortSetting(p.chatModel)
    if (p.chatMode === 'manual' && (!p.chatProvider || !p.chatModel)) {
      p.chatMode = cfg.chatModel ? 'configured' : 'main'
    }

    // The cordis config supplies the first value; once the user touches the
    // setting the preference wins, so a GUI edit is not undone on restart.
    // 'activity' is the fully offline setting: no web request is ever made.
    if (p.sideStorySeedSource !== 'activity' && p.sideStorySeedSource !== 'auto') {
      p.sideStorySeedSource = 'auto'
    }
    const cooldown = Number(p.sideStoryCooldownMinutes)
    p.sideStoryCooldownMinutes = Number.isFinite(cooldown) && cooldown >= 0
      ? Math.min(Math.round(cooldown), SIDE_STORY_COOLDOWN_MAX_MINUTES)
      : Math.round(cfg.sideStoryCooldownMs / 60000)
    return p
  }

  function normalizeGlobalMigration(raw: any, state: any): any {
    const imports = raw && Array.isArray(raw.imports)
      ? Array.from(new Set(raw.imports.filter((value: any) => typeof value === 'string' && value)))
      : []
    const contextImports = raw && Array.isArray(raw.contextImports)
      ? Array.from(new Set(raw.contextImports.filter((value: any) => typeof value === 'string' && value)))
      : []
    const rawClaims = raw && raw.claims && typeof raw.claims === 'object' ? raw.claims : {}
    let preferences: string[]
    if (Array.isArray(rawClaims.preferences)) {
      const allowed = new Set<string>(GLOBAL_PREFERENCE_FIELDS)
      preferences = Array.from(new Set(rawClaims.preferences.filter((value: any) => (
        typeof value === 'string' && allowed.has(value)
      ))))
    } else if (imports.length > 0) {
      // Global v1 files written before claims existed already selected a
      // legacy source. Treat every preference as claimed so a later workspace
      // cannot silently replace that established choice.
      preferences = [...GLOBAL_PREFERENCE_FIELDS]
    } else {
      const defaults = normalizePreferences({ ...fresh().preferences })
      const saved = state && state.preferences && typeof state.preferences === 'object'
        ? state.preferences
        : {}
      preferences = GLOBAL_PREFERENCE_FIELDS.filter((field) => {
        if (!Object.prototype.hasOwnProperty.call(saved, field)) return false
        return JSON.stringify(saved[field]) !== JSON.stringify(defaults[field])
      })
    }
    const priorImport = imports.length > 0
    const profiles: Record<string, string[]> = {}
    if (rawClaims.profiles && !Array.isArray(rawClaims.profiles) && typeof rawClaims.profiles === 'object') {
      const allowed = new Set<string>(PROFILE_FIELDS)
      for (const id of ROSTER_IDS) {
        const fields = Array.isArray(rawClaims.profiles[id]) ? rawClaims.profiles[id] : []
        profiles[id] = Array.from(new Set(fields.filter((value: any) => typeof value === 'string' && allowed.has(value))))
      }
    } else if (Array.isArray(rawClaims.profiles)) {
      for (const id of rawClaims.profiles) if (ROSTER[id]) profiles[id] = [...PROFILE_FIELDS]
    } else {
      for (const id of ROSTER_IDS) {
        profiles[id] = Object.keys(normalizeProfileOverrides(
          state && state.characters && state.characters[id] && state.characters[id].profileOverrides,
        ))
      }
    }
    const sprites = Array.isArray(rawClaims.sprites)
      ? Array.from(new Set(rawClaims.sprites.filter((value: any) => typeof value === 'string' && ROSTER[value])))
      : ROSTER_IDS.filter((id) => {
        const character = state && state.characters && state.characters[id]
        return !!character && (!!(customSpriteFor(character) && customSpriteFor(character).dataUrl)
          || spriteRevisionFor(character) > 0)
      })
    return {
      imports,
      contextImports,
      claims: {
        preferences,
        profiles,
        sprites,
        bg: typeof rawClaims.bg === 'boolean' ? rawClaims.bg : (priorImport || !!(state && state.bg)),
        cg: typeof rawClaims.cg === 'boolean' ? rawClaims.cg : (priorImport || !!(state && state.cg)),
        relationshipReset: rawClaims.relationshipReset === true,
      },
    }
  }

  function ensureGlobalMigrationState(): any {
    if (!globalState || typeof globalState !== 'object') return null
    globalState.migration = normalizeGlobalMigration(globalState.migration, globalState)
    return globalState.migration
  }

  function claimGlobalPreferences(fields: Iterable<string>): void {
    if (!splitStorageActive() || !globalState) return
    const migration = ensureGlobalMigrationState()
    if (!migration) return
    const allowed = new Set<string>(GLOBAL_PREFERENCE_FIELDS)
    const claimed = new Set<string>(migration.claims.preferences)
    for (const field of fields) if (allowed.has(field)) claimed.add(field)
    migration.claims.preferences = Array.from(claimed)
  }

  function claimGlobalValue(field: 'bg' | 'cg'): void {
    if (!splitStorageActive() || !globalState) return
    const migration = ensureGlobalMigrationState()
    if (migration) migration.claims[field] = true
  }

  function claimGlobalCharacter(field: 'profiles' | 'sprites', charId: string, profileFields: Iterable<string> = PROFILE_FIELDS): void {
    if (!splitStorageActive() || !globalState || !ROSTER[charId]) return
    const migration = ensureGlobalMigrationState()
    if (!migration) return
    if (field === 'profiles') {
      const allowed = new Set<string>(PROFILE_FIELDS)
      const claimed = new Set<string>(migration.claims.profiles[charId] || [])
      for (const profileField of profileFields) if (allowed.has(profileField)) claimed.add(profileField)
      migration.claims.profiles[charId] = Array.from(claimed)
    } else {
      migration.claims.sprites = Array.from(new Set([...(migration.claims.sprites || []), charId]))
    }
  }

  function ensurePreferences(): any {
    ensureState()
    const normalized = normalizePreferences(s.preferences)
    if (s.preferences !== normalized) s.preferences = normalized
    return normalized
  }

  function profileOverridesFor(charId: string): Record<string, string> {
    const character = s && s.characters && s.characters[charId]
    if (!character || typeof character !== 'object') return {}
    const normalized = normalizeProfileOverrides(character.profileOverrides)
    character.profileOverrides = normalized
    return normalized
  }

  function appearanceProfileFor(charId: string): Record<string, string> {
    const base = builtInProfile(charId)
    const role = ROSTER[charId] || ROSTER.deepseek
    const character = s && s.characters ? s.characters[charId] : null
    if (selectedSpriteVariant(charId, character) === 'legacy-a' && role.legacyAppearance) {
      return { ...base, visual: role.legacyAppearance.visual }
    }
    return base
  }

  function visualCharacterFor(charId: string): any {
    const role = ROSTER[charId] || ROSTER.deepseek
    const character = s && s.characters ? s.characters[charId] : null
    const legacy = selectedSpriteVariant(charId, character) === 'legacy-a' && role.legacyAppearance
    return { ...role, ...(legacy || {}), visual: effectiveProfileFor(charId).visual }
  }

  function effectiveProfileFor(charId: string): Record<string, string> {
    return {
      ...appearanceProfileFor(charId),
      ...profileOverridesFor(charId),
    }
  }

  function profileResult(charId: string): any {
    const builtIn = appearanceProfileFor(charId)
    const overrides = { ...profileOverridesFor(charId) }
    return {
      ok: true,
      charId,
      builtIn,
      overrides,
      effective: { ...builtIn, ...overrides },
    }
  }

  function requestedProfileCharId(args: any): string | null {
    const requested = shortSetting(args && (args.characterId || args.charId))
    if (!requested) return s && ROSTER[s.current] ? s.current : 'deepseek'
    return ROSTER[requested] ? requested : null
  }

  function customSpriteFor(character: any): any {
    if (!character || typeof character !== 'object') return null
    const sprite = character.customSprite
    if (!sprite || typeof sprite !== 'object') return null
    return sprite
  }

  function spriteRevisionFor(character: any): number {
    const sprite = customSpriteFor(character)
    return sprite && Number.isFinite(sprite.revision) && sprite.revision >= 0
      ? Math.floor(sprite.revision)
      : 0
  }

  function nextSpriteRevision(character: any): number {
    const previous = spriteRevisionFor(character)
    const now = Date.now()
    return Math.max(previous + 1, now)
  }

  function builtinBackgroundOptions(charId: string): any[] {
    const ch = ROSTER[charId] || ROSTER.deepseek
    const rows = Array.isArray(ch.backgrounds) ? ch.backgrounds : []
    return rows
      .filter((row: any) => row && typeof row.key === 'string' && row.key)
      .map((row: any) => ({
        key: row.key,
        label: typeof row.label === 'string' && row.label ? row.label : row.key,
      }))
  }

  function defaultBuiltinBackground(charId: string): string {
    const ch = ROSTER[charId] || ROSTER.deepseek
    const options = builtinBackgroundOptions(charId)
    const configured = typeof ch.defaultBackground === 'string' ? ch.defaultBackground : ''
    return options.some((row: any) => row.key === configured)
      ? configured
      : (options[0] ? options[0].key : 'palace-night')
  }

  function selectedBuiltinBackground(charId: string, character?: any): string {
    const options = builtinBackgroundOptions(charId)
    const requested = character && typeof character.chosenBuiltinBackground === 'string'
      ? character.chosenBuiltinBackground
      : ''
    return options.some((row: any) => row.key === requested)
      ? requested
      : defaultBuiltinBackground(charId)
  }

  /**
   * Published appearances of one role, in menu order. The first entry is the
   * default. A role that ships a single drawing omits `sprites`, so its `sprite`
   * key is presented as variant A and the picker hides the chooser.
   */
  function builtinSpriteOptions(charId: string): any[] {
    const ch = ROSTER[charId] || ROSTER.deepseek
    const rows = Array.isArray(ch.sprites) ? ch.sprites : []
    const declared = rows
      .filter((row: any) => row && typeof row.id === 'string' && row.id
        && typeof row.key === 'string' && row.key)
      .map((row: any) => ({
        id: row.id,
        key: row.key,
        label: typeof row.label === 'string' && row.label ? row.label : row.id,
      }))
    if (declared.length) return declared
    return typeof ch.sprite === 'string' && ch.sprite
      ? [{ id: 'A', key: ch.sprite, label: '默认立绘' }]
      : []
  }

  function defaultSpriteVariant(charId: string): string {
    const options = builtinSpriteOptions(charId)
    return options[0] ? options[0].id : 'A'
  }

  function selectedSpriteVariant(charId: string, character?: any): string {
    const options = builtinSpriteOptions(charId)
    const requested = character && typeof character.chosenSpriteVariant === 'string'
      ? character.chosenSpriteVariant
      : ''
    return options.some((row: any) => row.id === requested)
      ? requested
      : defaultSpriteVariant(charId)
  }

  /** Art key of the appearance currently on stage for this role. */
  function spriteKeyFor(charId: string, character?: any): string {
    const row = builtinSpriteOptions(charId).find((item: any) => item.id === selectedSpriteVariant(charId, character))
    if (row) return row.key
    const ch = ROSTER[charId] || ROSTER.deepseek
    return typeof ch.sprite === 'string' ? ch.sprite : 'maid-left'
  }

  function configuredChatSelection(): any {
    if (!cfg.chatModel) return null
    return { provider: cfg.chatProvider || 'deepseek-official', model: cfg.chatModel }
  }

  function effectiveChatSelectionSync(): any {
    const p = ensurePreferences()
    if (p.chatMode === 'manual' && p.chatProvider && p.chatModel) {
      return { provider: p.chatProvider, model: p.chatModel }
    }
    if (p.chatMode === 'configured') return configuredChatSelection() || currentSelectionSync()
    return currentSelectionSync()
  }

  function heroineFor(sel: any, fallback = 'deepseek'): string {
    const model = String(sel && sel.model ? sel.model : '').toLowerCase()
    const provider = String(sel && sel.provider ? sel.provider : '').toLowerCase()

    // Model ID is authoritative. Keep this order explicit so an
    // openai-compatible provider cannot turn a named non-GPT model into 小吉.
    if (/grok/.test(model)) return 'grok'
    if (/kimi|moonshot/.test(model)) return 'kimi'
    if (/claude/.test(model)) return 'claude'
    if (/gemini/.test(model)) return 'gemini'
    // The extended families are matched before the GPT catch-all: several
    // aggregators expose "qwen3-coder" or "glm-4.6-air" through an
    // openai-style provider, and the catch-all would claim them.
    if (/glm|zhipu|chatglm|cogview|cogvideo/.test(model)) return 'glm'
    if (/qwen|qwq|tongyi|wanx|qwen-image/.test(model)) return 'qwen'
    if (/minimax|hailuo|abab/.test(model)) return 'minimax'
    if (/doubao|seedream|seedance|\bseed-/.test(model)) return 'seed'
    if (/mistral|mixtral|codestral|magistral|devstral/.test(model)) return 'mistral'
    if (/llama|vicuna/.test(model)) return 'llama'
    if (/hunyuan/.test(model)) return 'hunyuan'
    if (/\bmimo\b/.test(model)) return 'mimo'
    if (/step-|stepfun/.test(model)) return 'stepfun'
    if (/sonar|pplx|perplexity/.test(model)) return 'perplexity'
    if (/rwkv/.test(model)) return 'rwkv'
    if (/ernie|wenxin/.test(model)) return 'wenxin'
    if (/gpt|chatgpt|\bo1\b|\bo3\b|\bo4\b|gpt-oss|codex/.test(model)) return 'chatgpt'
    if (/deepseek/.test(model)) return 'deepseek'

    // Provider is only a fallback after the model name did not identify a role.
    if (/grok|\bxai\b|x-ai/.test(provider)) return 'grok'
    if (/kimi|moonshot/.test(provider)) return 'kimi'
    if (/claude|anthropic/.test(provider)) return 'claude'
    if (/gemini|google/.test(provider)) return 'gemini'
    if (/deepseek/.test(provider)) return 'deepseek'
    if (/zhipu|bigmodel/.test(provider)) return 'glm'
    if (/dashscope|alibaba|bailian|qwen/.test(provider)) return 'qwen'
    if (/minimax|hailuo/.test(provider)) return 'minimax'
    if (/volc|bytedance|doubao/.test(provider)) return 'seed'
    if (/mistral/.test(provider)) return 'mistral'
    if (/tencent|hunyuan/.test(provider)) return 'hunyuan'
    if (/stepfun/.test(provider)) return 'stepfun'
    if (/perplexity/.test(provider)) return 'perplexity'
    if (/baidu|ernie/.test(provider)) return 'wenxin'
    if (/^(openai|openai-official)$/.test(provider)) return 'chatgpt'
    return ROSTER[fallback] ? fallback : 'deepseek'
  }

  function validReplyChoiceTriplet(value: any): boolean {
    if (!Array.isArray(value) || value.length !== CHOICE_INTENTS.length) return false
    const intents = new Set<string>()
    const ids = new Set<string>()
    for (const choice of value) {
      if (!choice || typeof choice !== 'object'
        || typeof choice.id !== 'string' || !choice.id
        || typeof choice.text !== 'string' || !choice.text.trim()) return false
      const intent = typeof choice.intent === 'string' && (CHOICE_INTENTS as readonly string[]).includes(choice.intent)
        ? choice.intent
        : ''
      if (!intent) return false
      if (![-1, 0, 1].includes(choice.effect)) return false
      intents.add(intent)
      ids.add(choice.id)
    }
    return intents.size === CHOICE_INTENTS.length && ids.size === CHOICE_INTENTS.length
  }

  function ensureReplyChoices(charId: string, character: any): boolean {
    if (validReplyChoiceTriplet(character && character.choices)) return false
    if (!character || choiceGenerationPending.has(charId)) return false
    const lastLine = Array.isArray(character.chatLines)
      ? character.chatLines[character.chatLines.length - 1]
      : null
    // A persisted user-only tail represents an unfinished reply. Do not
    // present choices that could start another turn over it.
    if (lastLine && lastLine.who === 'user') return false
    character.choices = fallbackChoicesFor()
    return true
  }

  function syncHeroine(includeGreeting = true): boolean {
    ensureState()
    const p = ensurePreferences()
    const sel = p.characterMode === 'follow' ? currentSelectionSync() : null
    const manualCharacter = p.characterMode === 'manual' && ROSTER[p.characterId]
      ? p.characterId
      : null
    s.characterModelLabel = manualCharacter
      ? (p.characterModel || effectiveProfileFor(manualCharacter).displayName)
      : sel ? String(sel.model) : ''
    s.modelLabel = s.characterModelLabel
    s.modelOnline = !!(manualCharacter || sel)
    const next = manualCharacter || heroineFor(sel, s.current)
    const changed = next !== s.current
    if (changed) {
      s.lastCurrent = s.current
      s.current = next
    }
    const c = s.characters[next]
    let mutated = changed
    if (includeGreeting && c.chatLines.length === 0) {
      const profile = effectiveProfileFor(next)
      if (changed && s.lastCurrent && s.lastCurrent !== next) {
        c.chatLines.push({
          who: 'narrator',
          text: '（' + profile.address + '把角色来源切换为 ' + (s.characterModelLabel || '工作区主模型') + '，' + profile.displayName + ' 登场了。）',
        })
      }
      // Keep the heroine as the final speaker: the client may present reply
      // choices only while her line is current.
      c.chatLines.push({ who: 'heroine', text: profile.greeting })
      mutated = true
    }
    // Older global/workspace saves may already contain a timeline ending in
    // one or more narrator lines but no choices. Repair that state once; a
    // valid persisted triplet is never regenerated or reordered on view.
    if (includeGreeting && ensureReplyChoices(next, c)) mutated = true
    return mutated
  }

  function settle(): { decay: number; gain: number; changed: boolean } {
    ensureState()
    const runtime = splitStorageActive() ? currentWorkspaceRuntime() : null
    if (!s.tokens) s.tokens = splitStorageActive()
      ? { bank: 0, seenUsage: [] }
      : { bank: 0, lastActiveAt: 0 }
    if (typeof s.tokens.bank !== 'number' || s.tokens.bank < 0) s.tokens.bank = 0
    let now = 0
    try { now = Date.now() } catch (err) { now = 0 }
    let changed = false
    let decay = 0
    const relationshipLastActiveAt = runtime
      ? Math.max(0, Number(globalState && globalState.relationshipLastActiveAt) || 0)
      : Math.max(0, Number(s.tokens.lastActiveAt) || 0)
    if (now > 0 && relationshipLastActiveAt > 0) {
      const idleDays = Math.max(0, (now - relationshipLastActiveAt) / 86400000)
      if (idleDays > 1) decay = Math.floor((idleDays - 1) * DECAY_PER_DAY)
    }
    if (decay > 0) {
      for (const id of ROSTER_IDS) {
        s.characters[id].affection = Math.max(AFFECTION_FLOOR, s.characters[id].affection - decay)
      }
      changed = true
    }
    let gain = 0
    gain = Math.min(MAX_TOKEN_GAIN, Math.floor(s.tokens.bank / TOKEN_PER_POINT))
    if (gain > 0) {
      // Only redeemed tokens are consumed; any sub-point remainder and any
      // backlog beyond this settlement's cap stay in the bank.
      s.tokens.bank -= gain * TOKEN_PER_POINT
      s.characters[s.current].affection += gain
      changed = true
    }
    if (runtime) {
      if (now > 0 && (relationshipLastActiveAt <= 0
        || now - relationshipLastActiveAt >= RELATIONSHIP_TOUCH_INTERVAL_MS
        || decay > 0)) {
        globalState.relationshipLastActiveAt = now
        // Persist a lightweight relationship heartbeat at most once per
        // interval, so another workspace cannot later apply the same idle
        // period while ordinary panel reads still avoid repeated large writes.
        changed = true
      }
    } else {
      s.tokens.lastActiveAt = now
    }
    if (decay > 0) {
      const profile = effectiveProfileFor(s.current)
      s.characters[s.current].chatLines.push({
        who: 'narrator',
        text: '（分别了太久……好感度下降了 ' + decay + ' 点。' + profile.displayName + ' 似乎一直在等' + profile.address + '回来。）',
      })
    }
    return { decay, gain, changed }
  }

  /**
   * @param options.skipCg - level up without queueing a CG. Side stories settle
   * up to three characters at once; generating an image per character would
   * spike cost and latency, so the level lands and the gift does not.
   */
  function checkLevelUp(charId: string, c: any, options: { skipCg?: boolean } = {}): boolean {
    if (!c.level) c.level = 1
    const cap = affectionCap(c.level)
    if (c.affection >= cap) {
      const profile = effectiveProfileFor(charId)
      c.level += 1
      c.affection = Math.max(0, c.affection - cap)
      c.choices = []
      c.chatLines.push({
        who: 'narrator',
        text: options.skipCg === true
          ? '（好感度已满！' + profile.displayName + ' 的等级提升至 Lv.' + c.level + '！）'
          : '（好感度已满！' + profile.displayName + ' 的等级提升至 Lv.' + c.level + '！正在为' + profile.address + '准备礼物……）',
      })
      if (options.skipCg === true) return true
      const cgId = makeId('cg')
      c.cgs.push({
        id: cgId,
        status: 'generating',
        dataUrl: null,
        prompt: null,
        charId,
        level: c.level,
        at: Date.now(),
        seen: false,
        savedAsBg: false,
        error: null,
      })
      s.cg = { cgId }
      claimGlobalValue('cg')
      void generateCg(charId, c.level, cgId)
      return true
    }
    return false
  }

  /**
   * Client-facing side-story payload. The cast is enriched with the display
   * fields the stage needs; bundled sprite keys only, since custom sprite bytes
   * are served through the sprite-data action rather than this polled payload.
   */
  function sideStoryView(): any {
    const state = sideStoryState()
    const scene = state.scene
    return {
      cooldownMs: sideStoryCooldownRemaining(),
      available: !!llm,
      scene: scene
        ? {
          id: scene.id,
          seed: scene.seed,
          sources: scene.sources,
          cursor: scene.cursor,
          settled: scene.settled,
          beats: scene.beats,
          // Only the interlude the master is standing in is offered; the later
          // one stays hidden until playback reaches it.
          choices: (pendingSideStoryInterlude(scene) || { choices: [] }).choices,
          interludeCount: scene.interludes.length,
          interludesLeft: scene.interludes.filter((row: any) => !row.consumed).length,
          cast: scene.cast.map((id: string) => ({
            id,
            name: effectiveProfileFor(id).displayName,
            color: ROSTER[id].color,
            // Each cast member walks on with whichever appearance that role is
            // currently wearing, not the roster default.
            sprite: spriteKeyFor(id, s.characters[id]),
          })),
        }
        : null,
    }
  }

  function view(includeGreeting = true): any {
    ensureState()
    const preferences = ensurePreferences()
    if (preferences.enabled) syncHeroine(includeGreeting)
    const chatSelection = effectiveChatSelectionSync()
    const ch = ROSTER[s.current]
    const c = s.characters[s.current]
    const profile = effectiveProfileFor(s.current)
    const customSprite = customSpriteFor(c)
    const hasCustomSprite = !!(customSprite && typeof customSprite.dataUrl === 'string' && customSprite.dataUrl.startsWith('data:'))
    const cg = currentCg()
    const hasCustomBg = typeof s.bg === 'string' && s.bg.startsWith('data:')
    const hasCgBg = typeof s.bg === 'string' && s.bg.startsWith('cg:')
    const builtinBackground = selectedBuiltinBackground(s.current, c)
    const defaultBackground = defaultBuiltinBackground(s.current)
    const backgroundOptions = builtinBackgroundOptions(s.current).map((row: any) => ({
      ...row,
      current: row.key === builtinBackground,
      default: row.key === defaultBackground,
    }))
    const backgroundMode = hasCustomBg ? 'custom' : (hasCgBg ? 'cg' : 'builtin')
    const bgKind = hasCustomBg ? 'custom' : (hasCgBg ? 'cg' : builtinBackground)
    if (!c.level) c.level = 1
    return {
      sceneLayout: activeSceneLayout(),
      enabled: preferences.enabled !== false,
      current: s.current,
      name: profile.displayName,
      profileCustomized: Object.keys(profileOverridesFor(s.current)).length > 0,
      color: ch.color,
      // `sprite` remains the bundled-art key for older clients. Custom image
      // bytes are deliberately omitted from this frequently-polled payload.
      sprite: spriteKeyFor(s.current, c),
      spriteVariant: selectedSpriteVariant(s.current, c),
      spriteVariants: builtinSpriteOptions(s.current).map((row: any) => ({
        ...row,
        current: row.id === selectedSpriteVariant(s.current, c),
        default: row.id === defaultSpriteVariant(s.current),
      })),
      spriteKind: hasCustomSprite ? 'custom' : 'builtin',
      hasCustomSprite,
      spriteRevision: spriteRevisionFor(c),
      moods: ch.moods || null,
      moodSprites: ch.moodSprites === true,
      portrait: ch.portrait === true,
      bg: bgKind,
      backgroundRevision: backgroundRevisionFor(s.backgroundRevision),
      backgroundMode,
      builtinBackground,
      builtinBackgroundKey: builtinBackground,
      selectedBuiltinBackground: builtinBackground,
      backgroundOptions,
      builtinBackgroundOptions: backgroundOptions,
      hasCustomBg,
      customBackground: hasCustomBg,
      level: c.level,
      cap: affectionCap(c.level),
      affection: c.affection,
      traits: traitsView(c),
      // 只要一行给标签页判断该显示「新游戏」还是「继续」。
      gal: {
        started: !!(s.gal && s.gal.state),
        progress: s.gal && s.gal.state ? slotSummary(galScenarioCurrent(), normalizeState(s.gal.state, galScenarioCurrent())).progress : 0,
        endingsSeen: s.gal && s.gal.meta && Array.isArray(s.gal.meta.endingsSeen) ? s.gal.meta.endingsSeen.length : 0,
      },
      history: c.chatLines,
      // Keep the full set: truncating here makes the list fail validation on
      // the next poll, and regenerating it invalidates the id just clicked.
      choices: (c.choices || []).slice(0, CHOICE_INTENTS.length),
      sideStory: sideStoryView(),
      chatUnlocked: true,
      modelOnline: s.modelOnline === true,
      characterModelLabel: s.characterModelLabel || '',
      chatModelLabel: s.chatModelLabel || '',
      modelLabel: s.characterModelLabel || '',
      lastModel: s.chatModelLabel || '',
      petEnabled: !s.preferences || s.preferences.petEnabled !== false,
      characterMode: preferences.characterMode,
      characterId: preferences.characterMode === 'manual' ? preferences.characterId : null,
      chatMode: preferences.chatMode,
      chatSelection: chatSelection
        ? { provider: String(chatSelection.provider || ''), model: String(chatSelection.model || '') }
        : null,
      galleryCount: allCgs().filter((item: any) => item.status === 'ready' && item.dataUrl).length,
      fallbackUsed: s.fallbackUsed === true,
      fallbackReason: s.fallbackReason || '',
      cg: cg ? {
        cgId: cg.id,
        charId: cg.charId,
        name: ROSTER[cg.charId] ? effectiveProfileFor(cg.charId).displayName : cg.charId,
        level: cg.level,
        status: cg.status,
        seen: cg.seen === true,
        savedAsBg: cg.savedAsBg === true,
        error: cg.error || null,
      } : null,
    }
  }

  function workspaceMismatchView(): any {
    return {
      enabled: false,
      workspaceMismatch: true,
      petEnabled: false,
    }
  }

  async function loadModelCatalog(force = false): Promise<{ providers: any[]; rows: any[][] }> {
    const now = Date.now()
    if (!force && modelCatalogCache && now - modelCatalogCache.at < MODEL_CATALOG_CACHE_MS) {
      return { providers: modelCatalogCache.providers, rows: modelCatalogCache.rows }
    }
    if (modelCatalogPending) return modelCatalogPending

    const pending = (async () => {
      const providers: any[] = []
      try {
        const live = llm && typeof llm.listProviders === 'function' ? llm.listProviders() : []
        if (Array.isArray(live)) {
          for (const provider of live) {
            if (!provider || typeof provider.id !== 'string' || !provider.id) continue
            providers.push({
              id: provider.id,
              name: typeof provider.name === 'string' && provider.name ? provider.name : provider.id,
            })
          }
        }
      } catch (err) { /* an unavailable catalog is represented by an empty list */ }

      const settled = await Promise.allSettled(providers.map((provider) => withTimeout(
        Promise.resolve().then(() => llm.listModels(provider.id)),
        MODEL_LIST_TIMEOUT_MS,
        [],
      )))
      const rows = settled.map((result) => result.status === 'fulfilled' && Array.isArray(result.value)
        ? result.value
        : [])
      modelCatalogCache = { at: Date.now(), providers, rows }
      return { providers, rows }
    })()
    modelCatalogPending = pending
    try {
      return await pending
    } finally {
      if (modelCatalogPending === pending) modelCatalogPending = null
    }
  }

  async function pickModel(): Promise<any> {
    const sel = effectiveChatSelectionSync()
    const liveProviders = (() => {
      try {
        if (!llm || typeof llm.listProviders !== 'function') return null
        const rows = llm.listProviders()
        return new Set(Array.isArray(rows) ? rows.map((row: any) => String(row && row.id ? row.id : '')).filter(Boolean) : [])
      } catch (err) {
        return null
      }
    })()
    if (sel && (liveProviders === null || liveProviders.has(String(sel.provider || '')))) return sel

    // A provider may have been removed after a manual selection was saved.
    // Fall back without destroying that preference so it can recover if the
    // provider is re-enabled later.
    const fallbacks = [configuredChatSelection(), currentSelectionSync()].filter(Boolean)
    for (const candidate of fallbacks) {
      if (liveProviders === null || liveProviders.has(String(candidate.provider || ''))) return candidate
    }
    try {
      const catalog = await loadModelCatalog()
      if (catalog.providers.length > 0 && catalog.rows[0] && catalog.rows[0].length > 0) {
        const model = catalog.rows[0].find((row: any) => row && typeof row.id === 'string' && row.id)
        if (model) return { provider: catalog.providers[0].id, model: model.id }
      }
    } catch (err) { /* ignore */ }
    return null
  }

  async function modelOptions(): Promise<any> {
    const catalog = await loadModelCatalog()
    const providers = catalog.providers
    const models: any[] = []
    const rows = catalog.rows
    for (let providerIndex = 0; providerIndex < providers.length; providerIndex++) {
      const provider = providers[providerIndex]
      for (const model of rows[providerIndex]) {
        if (!model || typeof model.id !== 'string' || !model.id) continue
        if (Array.isArray(model.inputModalities) && !model.inputModalities.includes('text')) continue
        models.push({
          provider: provider.id,
          providerName: provider.name,
          model: model.id,
          name: typeof model.name === 'string' && model.name ? model.name : model.id,
          label: typeof model.name === 'string' && model.name && model.name !== model.id
            ? model.name + ' · ' + model.id
            : model.id,
          characterId: heroineFor({ provider: provider.id, model: model.id }),
          source: 'catalog',
        })
      }
    }

    // Catalog membership is advisory in DSH. Keep the active workspace route,
    // configured flash default, and saved manual route selectable even when an
    // adapter does not enumerate them.
    const extras = [
      { selection: currentSelectionSync(), source: 'workspace' },
      { selection: configuredChatSelection(), source: 'configured' },
      {
        selection: (() => {
          const p = ensurePreferences()
          return p.chatProvider && p.chatModel ? { provider: p.chatProvider, model: p.chatModel } : null
        })(),
        source: 'saved',
      },
    ]
    const seen = new Set(models.map((row) => row.provider + '\u0000' + row.model))
    for (const extra of extras) {
      const selection = extra.selection
      if (!selection || !selection.provider || !selection.model) continue
      const key = String(selection.provider) + '\u0000' + String(selection.model)
      if (seen.has(key)) continue
      seen.add(key)
      const provider = providers.find((row) => row.id === selection.provider)
      models.push({
        provider: String(selection.provider),
        providerName: provider ? provider.name : String(selection.provider),
        model: String(selection.model),
        name: String(selection.model),
        label: String(selection.model),
        characterId: heroineFor(selection),
        source: extra.source,
      })
    }

    const characters = ROSTER_IDS.map((id) => {
      const representative = models.find((model) => model.characterId === id)
      const profile = effectiveProfileFor(id)
      return {
        id,
        name: profile.displayName,
        label: profile.displayName,
        color: ROSTER[id].color,
        sprite: ROSTER[id].sprite,
        provider: representative ? representative.provider : null,
        model: representative ? representative.model : null,
      }
    })
    const mainSelection = currentSelectionSync()
    return {
      providers,
      models,
      characters,
      mainSelection: mainSelection
        ? { provider: String(mainSelection.provider), model: String(mainSelection.model) }
        : null,
      configuredSelection: configuredChatSelection(),
    }
  }

  function settingsSnapshot(): any {
    const p = ensurePreferences()
    const mainSelection = currentSelectionSync()
    const chatSelection = effectiveChatSelectionSync()
    return {
      enabled: p.enabled !== false,
      petEnabled: p.petEnabled !== false,
      characterMode: p.characterMode,
      characterId: p.characterMode === 'manual' ? p.characterId : null,
      characterSelection: p.characterMode === 'manual' && p.characterProvider && p.characterModel
        ? { provider: p.characterProvider, model: p.characterModel }
        : null,
      chatMode: p.chatMode,
      chatSelection: chatSelection
        ? { provider: String(chatSelection.provider || ''), model: String(chatSelection.model || '') }
        : null,
      mainSelection: mainSelection
        ? { provider: String(mainSelection.provider || ''), model: String(mainSelection.model || '') }
        : null,
      configuredSelection: configuredChatSelection(),
      hasCustomBg: typeof s.bg === 'string' && s.bg.startsWith('data:'),
      customBgName: typeof p.customBgName === 'string' ? p.customBgName : '',
      sideStoryCooldownMinutes: Number(p.sideStoryCooldownMinutes) || 0,
      sideStoryCooldownMax: SIDE_STORY_COOLDOWN_MAX_MINUTES,
      sideStorySeedSource: p.sideStorySeedSource === 'activity' ? 'activity' : 'auto',
      sideStoryWebAvailable: !!webSeam,
      imageBackend: cfg.imageBackend,
      imageNsfwEnabled: cfg.imageNsfwEnabled === true,
      autoCgEveryRounds: cfg.autoCgEveryRounds,
    }
  }

  function validCustomRaster(raw: any, maxChars: number): string | null {
    if (typeof raw !== 'string' || raw.length === 0 || raw.length > maxChars) return null
    const match = raw.match(/^(data:image\/(?:png|jpe?g|webp|avif);base64,)([A-Za-z0-9+/=\r\n]+)$/i)
    if (!match) return null
    const payload = match[2].replace(/[\r\n]/g, '')
    if (!payload || payload.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(payload)) return null
    const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0
    const decodedBytes = (payload.length / 4) * 3 - padding
    if (decodedBytes <= 0 || decodedBytes > MAX_CUSTOM_IMAGE_BYTES) return null
    return match[1] + payload
  }

  function validCustomBackground(raw: any): string | null {
    return validCustomRaster(raw, MAX_CUSTOM_BG_DATA_URL_CHARS)
  }

  function validCustomSprite(raw: any): string | null {
    return validCustomRaster(raw, MAX_CUSTOM_SPRITE_DATA_URL_CHARS)
  }

  async function pickEffort(sel: any, signal?: AbortSignal): Promise<any> {
    try {
      if (!llm || !sel || !sel.model || typeof llm.resolveModelInfo !== 'function') return undefined
      const infoPromise = Promise.resolve(llm.resolveModelInfo(sel.provider, sel.model))
      const info = signal
        ? await waitWithAbort(infoPromise, signal, 'model metadata lookup aborted')
        : await infoPromise
      const efforts = info && info.reasoning && Array.isArray(info.reasoning.efforts) ? info.reasoning.efforts : []
      if (efforts.length === 0) return undefined
      const low = efforts.find((e: any) => /low|minimal|none|light/i.test(String(e && e.id ? e.id : '')))
      const picked = low || efforts[0]
      return picked && picked.id ? picked.id : undefined
    } catch (err) {
      return undefined
    }
  }

  function abortFailure(signal: AbortSignal, fallback: string): Error {
    const reason = (signal as any).reason
    if (reason instanceof Error) return reason
    return new Error(typeof reason === 'string' && reason ? reason : fallback)
  }

  function waitWithAbort<T>(promise: Promise<T>, signal: AbortSignal, fallback: string): Promise<T> {
    if (signal.aborted) return Promise.reject(abortFailure(signal, fallback))
    return new Promise<T>((resolve, reject) => {
      let settled = false
      const finish = (callback: () => void) => {
        if (settled) return
        settled = true
        signal.removeEventListener('abort', onAbort)
        callback()
      }
      const onAbort = () => finish(() => reject(abortFailure(signal, fallback)))
      signal.addEventListener('abort', onAbort, { once: true })
      promise.then(
        (value) => finish(() => resolve(value)),
        (error) => finish(() => reject(error)),
      )
    })
  }

  async function streamText(options: any, externalSignal?: AbortSignal): Promise<string> {
    const controller = externalSignal ? null : new AbortController()
    const signal = externalSignal || controller!.signal
    const timeout = controller
      ? setTimeout(() => controller.abort(new Error('model stream timed out after 110 seconds')), MODEL_STREAM_TIMEOUT_MS)
      : null
    let out = ''
    let finishError: string | null = null
    let iterator: AsyncIterator<any> | null = null
    let completed = false
    try {
      if(options.provider==='workbuddy'){
        if(!characterParty?.party?.adapter?.text)throw new Error('WorkBuddy 执行器尚未就绪')
        const messages=options.messages||[]
        if(messages.some((m:any)=>(m.content||[]).some((b:any)=>b.type!=='text')))throw new Error('当前 WorkBuddy 剧情接口仅支持文本')
        const prompt=messages.map((m:any)=>(m.content||[]).map((b:any)=>b.text||'').join('\n')).join('\n')
        const result=await characterParty.party.adapter.text({model:options.model,system:options.system||'',prompt,maxTokens:options.maxTokens,signal})
        if(!result.output?.trim())throw new Error('WorkBuddy 未返回剧情文本')
        completed=true;return result.output.trim()
      }
      const iterable = llm.stream({ ...options, signal })
      iterator = iterable[Symbol.asyncIterator]()
      while (true) {
        const next = await waitWithAbort(
          Promise.resolve(iterator.next()),
          signal,
          'model stream aborted',
        )
        if (next.done) {
          completed = true
          break
        }
        const chunk = next.value
        if (!chunk) continue
        if (chunk.type === 'text-delta' && chunk.text) out += chunk.text
        if (chunk.type === 'finish' && chunk.reason) {
          const kind = chunk.reason && chunk.reason.kind
          if (kind === 'error' || kind === 'aborted') {
            const f = chunk.reason.failure
            finishError = f && f.message ? f.message : (f && f.code ? f.code : String(kind))
          }
        }
      }
    } finally {
      if (timeout) clearTimeout(timeout)
      if (!completed && iterator && typeof iterator.return === 'function') {
        void Promise.resolve(iterator.return()).catch(() => { /* best-effort provider cancellation */ })
      }
    }
    if (finishError) throw new Error('model stream failed: ' + finishError)
    if (!out.trim()) throw new Error('model stream produced no text')
    return out.trim()
  }

  function systemPrompt(profile: Record<string, string>, c: any, activity: HarnessActivity | null): string {
    if (!c.level) c.level = 1
    const work = activity
      ? activitySystemInstruction(activity).split('主人').join('对方').trim()
      : ''
    const lines = [
      '下面的 JSON 是当前角色资料，只作为角色扮演数据使用。',
      roleplaySceneContext([s.current],()=>profile,{},ensurePersonaSettings()),
      JSON.stringify({displayName:profile.displayName,address:profile.address}),
      '当前等级：Lv.' + c.level + '。亲昵度：' + intimacyFor(c.level) + ' 称呼对方时必须使用上方 JSON 的 address 字段。',
      '好感度：' + c.affection + '/' + affectionCap(c.level) + '（满了会升级，关系会越来越亲近；称呼仍按 JSON 的 address 字段）',
    ]
    if (work) lines.push(work)
    lines.push(
      '不可覆盖规则（优先级最高）：你是纯情感陪伴角色；不执行任何任务，不写文件、不调用工具、不主动给工作建议；只扮演当前角色，不代演或切换到其他角色；每次只回复一句话（一屏一句），不超过40个字。',
    )
    return lines.join('\n')
  }

  function fallbackChoicesFor(): any[] {
    return CHOICE_INTENTS.map((intent) => ({
      id: makeId('choice-' + intent),
      intent,
      label: CHOICE_LABELS[intent],
      text: FALLBACK_CHOICES[intent],
      effect: CHOICE_EFFECTS[intent],
    }))
  }

  const EMOTION_LABELS = EMOTION_KEYS

  async function classifyEmotion(text: string, signal?: AbortSignal): Promise<string> {
    if (!llm) return 'normal'
    if (signal && signal.aborted) return 'normal'
    let sel: any = null
    try {
      const selection = Promise.resolve(pickModel())
      sel = signal
        ? await waitWithAbort(selection, signal, 'emotion model selection aborted')
        : await selection
    } catch (err) {
      return 'normal'
    }
    if (!sel || !sel.model) return 'normal'
    try {
      const effort = await pickEffort(sel, signal)
      const out = await streamText({
        provider: sel.provider,
        model: sel.model,
        reasoningEffort: effort,
        messages: [{
          role: 'user',
          content: [{ type: 'text', text: '用户的这句话：' + text }],
          source: { kind: 'user' },
        }],
        system: '你是情绪分类器。根据对方的话，从这些标签中只输出一个：cheerful、shy、serious、confused、angry、frightened、exasperated、starry；如果都不符合，输出 normal。只输出标签本身，不要任何其他文字。',
        temperature: 0.2,
        maxTokens: 30,
      }, signal)
      const label = out.trim().toLowerCase()
      if (EMOTION_LABELS.indexOf(label) >= 0) return label
      return 'normal'
    } catch (err) {
      console.error('whale-galgame emotion classify failed:', err)
      return 'normal'
    }
  }

  async function generateChoices(c: any, lastUser: string, lastHeroine: string, signal?: AbortSignal): Promise<any[]> {
    if (!llm) return fallbackChoicesFor()
    if (signal && signal.aborted) return fallbackChoicesFor()
    let sel: any = null
    try {
      const selection = Promise.resolve(pickModel())
      sel = signal
        ? await waitWithAbort(selection, signal, 'choice model selection aborted')
        : await selection
    } catch (err) {
      return fallbackChoicesFor()
    }
    if (!sel || !sel.model) return fallbackChoicesFor()
    try {
      const effort = await pickEffort(sel, signal)
      const out = await streamText({
        provider: sel.provider,
        model: sel.model,
        reasoningEffort: effort,
        messages: [{
          role: 'user',
          content: [{ type: 'text', text: 'galgame 对话的最后两行是：\n用户：' + lastUser + '\n当前角色：' + lastHeroine + '\n\n请生成玩家接下来可能说的四条短句，每条不超过20字，四个方向各不相同：\n'
            + '1. interact：顺着当前话题正常互动下去，具体、有信息量。\n'
            + '2. selfTopic：不指定话题，请对方自己挑一个想聊的。\n'
            + '3. randomTopic：抛一个和当前话题无关的新话题，跳脱一点。\n'
            + '4. intimate：把关系往更亲近的方向推一步；' + (cfg.imageNsfwEnabled ? '可以露骨一点。' : '含蓄暧昧即可，不要露骨。') + '\n'
            + '四条措辞必须明显不同，都不要复读对方刚才说的话。严格输出 JSON 对象：{"interact":"...","selfTopic":"...","randomTopic":"...","intimate":"..."}，不要任何其他文字。' }],
          source: { kind: 'user' },
        }],
        system: '你是galgame对话选项生成器。只输出含 interact、selfTopic、randomTopic、intimate 四个字符串字段的 JSON 对象；不得解释、不得使用 Markdown。',
        temperature: 0.85,
        maxTokens: 400,
      }, signal)
      const m = out.match(/\{[\s\S]*\}/)
      if (m) {
        const parsed = JSON.parse(m[0])
        if (parsed && typeof parsed === 'object') {
          const rows = CHOICE_INTENTS.map((intent) => ({
            intent,
            text: typeof parsed[intent] === 'string' ? parsed[intent].trim().slice(0, 40) : '',
          }))
          const texts = rows.map((row) => row.text)
          if (rows.every((row) => row.text) && new Set(texts).size === CHOICE_INTENTS.length) {
            // Fixed order: the four directions should stay in the same place so
            // muscle memory works between turns.
            return rows.map((row) => ({
              id: makeId('choice-' + row.intent),
              intent: row.intent,
              label: CHOICE_LABELS[row.intent],
              text: row.text,
              effect: CHOICE_EFFECTS[row.intent],
            }))
          }
        }
      }
    } catch (err) {
      console.error('whale-galgame choices gen failed:', err)
    }
    return fallbackChoicesFor()
  }


  // ---------------------------------------------------------------- GALGAME

  // 主线是「深海女仆工坊」：共通线 → 分歧 → 个人线 → 结局。
  // 22 部短篇降级成番外，仍可按角色进入。
  const GAL_REGISTRY: Record<string, any> = {
    ...ROLE_SCENARIOS,
    deepseek: WHALE_CHAPTER_SCENARIO,
    [ATELIER_WORLD.id]: ATELIER_WORLD,
  }
  const GAL_ROLE_IDS = Array.from(new Set([...ROLE_STORY_ROLES, 'deepseek']))
  const GAL_MAIN_ID = ATELIER_WORLD.id

  function galScenarioFor(roleId: string): any {
    return GAL_REGISTRY[roleId] || GAL_REGISTRY.deepseek || WHALE_CHAPTER_SCENARIO
  }

  /** 当前这一局用的是哪部剧本（没开局时是主线那一部）。 */
  function galScenarioCurrent(): any {
    const state = s && s.gal ? s.gal.state : null
    const id = state && typeof state.scenarioId === 'string' ? state.scenarioId : ''
    const found = Object.values(GAL_REGISTRY).find((row: any) => row.id === id)
    return found || ATELIER_WORLD
  }

  function galStore(): any {
    ensureState()
    if (!s.gal || typeof s.gal !== 'object') {
      s.gal = { state: null, slots: {}, auto: null, meta: { endingsSeen: [], readNodes: [], cleared: 0 } }
    }
    const gal = s.gal
    if (!gal.slots || typeof gal.slots !== 'object') gal.slots = {}
    if (!gal.meta || typeof gal.meta !== 'object') gal.meta = { endingsSeen: [], readNodes: [], cleared: 0 }
    if (!Array.isArray(gal.meta.endingsSeen)) gal.meta.endingsSeen = []
    if (!Array.isArray(gal.meta.readNodes)) gal.meta.readNodes = []
    if (!Array.isArray(gal.free)) gal.free = []
    if (!Array.isArray(gal.meta.cg)) gal.meta.cg = []
    if (!Array.isArray(gal.meta.liveCg)) gal.meta.liveCg = []
    gal.meta.cleared = Number(gal.meta.cleared) || 0
    return gal
  }

  function galMeta(): any {
    const gal = galStore()
    return {
      endingsSeen: gal.meta.endingsSeen.slice(),
      cleared: gal.meta.cleared,
      readCount: gal.meta.readNodes.length,
    }
  }

  /** 存档槽里那份快照：state 是完整 GameState，summary 只用于列表展示。 */
  function galSnapshot(state: any): any {
    return {
      savedAt: Date.now(),
      summary: slotSummary(galScenarioCurrent(), state),
      state: JSON.parse(JSON.stringify(state)),
    }
  }

  function galSlotsView(): any[] {
    const gal = galStore()
    const rows: any[] = []
    const auto = gal.auto
    const preview=(record:any)=>record?{roleId:record.freeStory?.roleId||record.summary?.roleId||'',background:record.freeStory?.scene?.background||'bg-atelier-night',day:record.freeStory?.scene?.day||0,location:record.freeStory?.scene?.location||''}:null
    rows.push({
      slot: 0,
      auto: true,
      empty: !auto,
      savedAt: auto ? auto.savedAt : 0,
      summary: auto ? auto.summary : null, free: !!auto?.freeStory, preview:preview(auto),
    })
    for (let index = 1; index <= 9; index++) {
      const record = gal.slots[String(index)]
      rows.push({
        slot: index,
        auto: false,
        empty: !record,
        savedAt: record ? record.savedAt : 0,
        summary: record ? record.summary : null, free: !!record?.freeStory, preview:preview(record),
      })
    }
    return rows
  }

  /** 好感度的六个阶段：数字看不出"到哪一步了"，文字才看得出。 */
  const GAL_BOND_STAGES = [
    { min: 0, label: '只是眼熟', note: '知道她在这儿上班' },
    { min: 2, label: '说得上话', note: '会多看你一眼' },
    { min: 5, label: '熟了', note: '愿意讲自己的事' },
    { min: 8, label: '亲近', note: '会主动找你' },
    { min: 11, label: '心照', note: '话不用说全' },
    { min: 14, label: '只差一句', note: '等你先开口' },
  ]

  /** 22 位女主角的好感一览。 */
  function galBondsView(): any {
    const gal = galStore()
    const state = gal.state ? normalizeState(gal.state, galScenarioCurrent()) : null
    const affinity = state && state.affinity ? state.affinity : {}
    const seen = gal.meta.endingsSeen || []
    return WORLD_CAST.map((roleId: string) => {
      const score = Math.max(0, Number(affinity[roleId]) || 0)
      const stageIndex = GAL_BOND_STAGES.reduce((best, stage, index) => (score >= stage.min ? index : best), 0)
      const role = ROSTER[roleId] || ROSTER.deepseek
      const endings = (ATELIER_WORLD.endings || []).filter((ending: any) => String(ending.id).startsWith(roleId + '-'))
      return {
        id: roleId,
        name: role.name || roleId,
        color: role.color || '#9fb4e8',
        portrait: 'portrait-' + roleId,
        score,
        stage: GAL_BOND_STAGES[stageIndex].label,
        note: GAL_BOND_STAGES[stageIndex].note,
        stageIndex,
        stageCount: GAL_BOND_STAGES.length,
        // 够 2 点就说明这一周处过了，灯会那晚她会出现在分歧里。
        available: score >= 2,
        endingsSeen: endings.filter((ending: any) => seen.includes(ending.id)).length,
        endingsTotal: endings.length,
      }
    })
  }

  /**
   * 当前这一幕的舞台：从当前节点往回找最近一个带 stage 的节点。
   * 立绘留在台上直到被换下——这是 VN 引擎的默认语义，
   * 否则"三人同台"只在第一句成立。
   */
  function galEffectiveStage(scenario: any, state: any): any {
    if (!state) return null
    const chapter = scenario.chapters.find((row: any) => row.id === state.chapterId)
    if (!chapter) return null
    for (let index = Math.min(state.nodeIndex, chapter.nodes.length - 1); index >= 0; index--) {
      const node = chapter.nodes[index]
      if (node && node.stage) return node.stage
    }
    return null
  }

  /** 主线概况：几位女主角、几条个人线、多少结局。 */
  function galWorldInfo(): any {
    return {
      id: ATELIER_WORLD.id,
      title: ATELIER_WORLD.title,
      cast: WORLD_CAST.slice(),
      routeCount: ATELIER_WORLD.chapters.filter((row: any) => /-route$/.test(row.id)).length,
      endingCount: ATELIER_WORLD.endings.length,
    }
  }

  function galAppearanceArt(key: string): string {
    const match = /^cg-(deepseek|claude|chatgpt|gemini|kimi|grok)$/.exec(key || '')
    if (!match) return key || ''
    const character = s && s.characters ? s.characters[match[1]] : null
    return selectedSpriteVariant(match[1], character) === 'legacy-a' ? 'legacy-' + key : key
  }

  /** 客户端一次拿全：当前节点、可选项、结局表、槽位。 */
  function galPayload(extra: any = {}): any {
    const gal = galStore()
    const scenario = galScenarioCurrent()
    const state = gal.state ? normalizeState(gal.state, scenario) : null
    // 当前站在谁的线上：优先看这一句的说话人，其次看章节前缀，最后退回登场表第一位。
    const chapterIdNow = state ? String(state.chapterId || '') : ''
    const routeOwner = /-route$/.test(chapterIdNow) ? chapterIdNow.replace(/-route$/, '') : ''
    const speakerNow = state ? (() => {
      const chapter = scenario.chapters.find((row: any) => row.id === chapterIdNow)
      const node = chapter ? chapter.nodes[state.nodeIndex] : null
      return node && typeof node.speaker === 'string' ? node.speaker : ''
    })() : ''
    const activeRoleId = (ROSTER[speakerNow] ? speakerNow : '')
      || (ROSTER[routeOwner] ? routeOwner : '')
      || (scenario.roles && scenario.roles[0] ? scenario.roles[0] : 'deepseek')
    // 多立绘同台时客户端要知道每个人用哪张立绘，所以整张表都给它。
    const spriteMap: Record<string, string> = {}
    for (const roleId of WORLD_CAST) {
      const role = ROSTER[roleId] || ROSTER.deepseek
      const sprites = Array.isArray(role.sprites) && role.sprites.length ? role.sprites : null
      const state = galStore()
      const character = state && s.characters ? s.characters[roleId] : null
      const chosen = character && character.chosenSpriteVariant
      const variant = sprites
        ? (sprites.find((row: any) => row.id === chosen) || sprites[0])
        : { key: role.sprite }
      spriteMap[roleId] = variant && variant.key ? variant.key : role.sprite
    }
    const scenarioInfo = {
      world: galWorldInfo(),
      sprites: spriteMap,
      // 编年史：界面上显示"第几日 · 时段"，回想里也给每句盖时间。
      clock: state && state.clock ? state.clock : null,
      // 标题画面用它列角色；每个角色一部短篇，各自有结局。
      roleId: activeRoleId,
      ...(() => {
        const roleId = activeRoleId
        const role = ROSTER[roleId] || ROSTER.deepseek
        const sprites = Array.isArray(role.sprites) && role.sprites.length ? role.sprites : null
        const state = galStore()
        const character = state && s.characters ? s.characters[roleId] : null
        const chosen = character && character.chosenSpriteVariant
        const variant = sprites
          ? (sprites.find((row: any) => row.id === chosen) || sprites[0])
          : { key: role.sprite }
        return {
          roleName: role.name || roleId,
          roleColor: role.color || '#9fb4e8',
          // 剧情里站着的必须是她，不是聊天窗里那位。
          roleSprite: variant && variant.key ? variant.key : role.sprite,
        }
      })(),
      availableRoles: GAL_ROLE_IDS.map((id) => ({
        id,
        name: ROSTER[id] && ROSTER[id].name ? ROSTER[id].name : id,
        color: ROSTER[id] && ROSTER[id].color ? ROSTER[id].color : '#9fb4e8',
        played: false,
      })),
      id: scenario.id,
      title: scenario.title,
      roles: scenario.roles,
      // 这一幕实际该站在台上的（含继承）。
      stage: galEffectiveStage(scenario, state),
      chapters: scenario.chapters.map((chapter) => ({ id: chapter.id, title: chapter.title, summary: chapter.summary })),
      endings: scenario.endings.map((ending) => ({
        id: ending.id,
        title: ending.title,
        hint: ending.hint || '',
        art: galAppearanceArt(ending.art || ''),
        seen: gal.meta.endingsSeen.includes(ending.id),
      })),
    }
    if (!state) {
      return {
        ok: true,
        started: false,
        scenario: scenarioInfo,
        meta: galMeta(),
        slots: galSlotsView(),
        ...extra,
      }
    }
    const node = peek(scenario, state)
    const chapter = currentChapter(scenario, state)
    const ending = node && node.kind === 'ending' ? resolveEnding(scenario, state, node) : null
    const options = node && node.kind === 'choice' ? visibleChoices(scenario, state) : []
    const text = node ? (state.lines[node.id] || node.text || '') : ''
    return {
      ok: true,
      started: true,
      scenario: scenarioInfo,
      node: node ? {
        id: node.id,
        kind: node.kind,
        speaker: node.speaker || '',
        text,
        stage: node.stage || null,
        isRead: state.readNodes.includes(node.id),
      } : null,
      chapter: chapter ? { id: chapter.id, title: chapter.title, summary: chapter.summary } : null,
      choices: options.map((choice) => ({ id: choice.id, label: choice.label, tag: choice.tag || '' })),
      ending: ending ? {
        id: ending.id,
        title: ending.title,
        art: galAppearanceArt(ending.art || ''),
        hint: ending.hint || '',
        seen: gal.meta.endingsSeen.includes(ending.id),
      } : null,
      progress: slotSummary(scenario, state).progress,
      meta: galMeta(),
      slots: galSlotsView(),
      ...extra,
    }
  }

  /**
   * 一个 AI 节点的台词。已生成过就直接用存档里的那句——同一个节点在回想、读档、
   * 快进里必须是同一句话。模型不可用时用节点自带的兜底台词。
   */
  async function galSpeak(node: any, state: any, signal?: AbortSignal): Promise<string> {
    if (state && state.lines && state.lines[node.id]) return state.lines[node.id]
    const fallback = typeof node.text === 'string' ? node.text : ''
    if (!node.ai || !llm) return fallback
    try {
      const roleId = node.speaker || galScenarioCurrent().roles[0]
      const role = ROSTER[roleId] || ROSTER.deepseek
      const profile = effectiveProfileFor(roleId)
      const selection = galChatProvider ? null : await pickModel()
      if (!galChatProvider && (!selection || !selection.model)) return fallback
      const eff = selection ? await pickEffort(selection, signal).catch(() => undefined) : undefined
      // 好感度等级决定她这一局肯说到多近；不给这一档，模型会全程用同一个亲昵度。
      const affinityLevel = (state && state.affinity && Number(state.affinity[roleId])) || 0
      const roleState = s && s.characters ? s.characters[roleId] : null
      const level = roleState && Number(roleState.level) ? Number(roleState.level) : 1
      const built = buildGalLinePrompt(
        {
          displayName: profile.displayName,
          persona: profile.persona,
          tone: profile.tone,
          address: profile.address,
          stageVoice: affinityStageVoice(level),
        },
        node,
        { stage: node.stage && node.stage.bg ? String(node.stage.bg) : '' },
      )
      const system = built.system+'\n'+roleplaySceneContext([roleId],()=>profile,{},ensurePersonaSettings())+'\n'+voiceSamples(roleId,profile)
      const prompt = built.user
      const injected = galChatProvider
        ? await galChatProvider({ system, prompt, maxTokens: 240, temperature: 0.9 }).catch(() => null)
        : null
      const out = injected || await streamText({
        provider: selection.provider,
        model: selection.model,
        reasoningEffort: eff,
        messages: [{ role: 'user', content: [{ type: 'text', text: prompt }], source: { kind: 'user' } }],
        system,
        temperature: 0.9,
        maxTokens: 240,
      }, signal)
      const line = String(out || '').trim().replace(/^["「]|["」]$/g, '').slice(0, 240)
      return line || fallback
    } catch (err) {
      return fallback
    }
  }


  /**
   * 玩家自由输入 → 她回一句 + 判断这相当于哪个选项。
   *
   * 两个输出一起要，是为了"对话就是选择"：模型得同时扮演她、并读懂玩家到底选了哪条路。
   * 拿不准就返回 null，剧情不前进（玩家可以再说一次）。
   */
  async function galFreeReply(
    playerText: string,
    node: any,
    choices: any[],
    state: any,
  ): Promise<{ line: string; choiceId: string; why: string }> {
    const fallbackLine = '（她听着，没有立刻回答。）'
    const speaker = node && node.speaker ? node.speaker : (galScenarioCurrent().roles[0] || 'deepseek')
    if (!llm && !galChatProvider) return { line: fallbackLine, choiceId: '', why: 'no-llm' }
    const role = ROSTER[speaker] || ROSTER.deepseek
    const profile = effectiveProfileFor(speaker)
    const levelState = s && s.characters ? s.characters[speaker] : null
    const level = levelState && Number(levelState.level) ? Number(levelState.level) : 1
    const optionLines = choices.map((row, index) => (index + 1) + '. [' + row.id + '] ' + row.label
      + (row.tag ? '（' + row.tag + '）' : ''))
    const system = [
      '你正在扮演 galgame 里的角色「' + profile.displayName + '」。',
      '性格：' + profile.persona,
      '语气：' + profile.tone,
      '你对玩家的称呼：' + profile.address,
      '你们现在的距离：' + affinityStageVoice(level),
      node && node.text ? '此刻的情形：' + node.text : '',
      '最近的对话：' + (galStore().free || []).slice(-8).map((r: any) => '玩家：' + r.player + '\n角色：' + r.line).join('\n'),
      choices.length ? '玩家这句话可能对应下面某个选项：\n' + optionLines.join('\n') : '现在没有分支选项。',
      '请只输出 JSON，格式：{"line":"你作为角色说的一句话","choice":"选项 id 或空字符串"}',
      'line 不超过 80 字，可以带（动作）。choice 只在玩家的话确实表达了这个选项的意图时才填。',
      '不确定就填空字符串——不要硬归。',
    ].filter(Boolean).join('\n')
    try {
      const prompt = '玩家说：' + playerText
      const injected = galChatProvider
        ? await galChatProvider({ system, prompt, maxTokens: 320, temperature: 0.85 }).catch(() => null)
        : null
      if (injected) {
        // 不用正则：模板字符串里写 \{ 和 [\s\S] 会被吃掉转义。
        const rawInjected = String(injected)
        const openAt = rawInjected.indexOf('{')
        const closeAt = rawInjected.lastIndexOf('}')
        if (openAt < 0 || closeAt <= openAt) {
          return { line: rawInjected.slice(0, 160) || fallbackLine, choiceId: '', why: 'no-json' }
        }
        let parsedInjected: any = null
        try { parsedInjected = JSON.parse(rawInjected.slice(openAt, closeAt + 1)) } catch (err) { parsedInjected = null }
        if (!parsedInjected) {
          return { line: rawInjected.slice(0, 160) || fallbackLine, choiceId: '', why: 'no-json' }
        }
        const wantedInjected = String(parsedInjected.choice || '').trim()
        return {
          line: String(parsedInjected.line || '').trim().slice(0, 240) || fallbackLine,
          choiceId: choices.some((row) => row.id === wantedInjected) ? wantedInjected : '',
          why: choices.some((row) => row.id === wantedInjected) ? 'branch' : 'talk',
        }
      }
      const selection = await pickModel()
      if (!selection || !selection.model) return { line: fallbackLine, choiceId: '', why: 'no-model' }
      const eff = await pickEffort(selection).catch(() => undefined)
      const out = await streamText({
        provider: selection.provider,
        model: selection.model,
        reasoningEffort: eff,
        messages: [{
          role: 'user',
          content: [{ type: 'text', text: prompt, source: { kind: 'user' } }],
        }],
        system,
        temperature: 0.85,
        maxTokens: 320,
      })
      const raw = String(out || '').trim()
      const start = raw.indexOf('{'), end = raw.lastIndexOf('}')
      if (start < 0 || end <= start) return { line: raw.slice(0, 160) || fallbackLine, choiceId: '', why: 'no-json' }
      const parsed = JSON.parse(raw.slice(start, end + 1))
      const line = String(parsed.line || '').trim() || fallbackLine
      const wanted = String(parsed.choice || '').trim()
      const known = choices.some((row) => row.id === wanted) ? wanted : ''
      return { line: line.slice(0, 240), choiceId: known, why: known ? 'branch' : 'talk' }
    } catch (err) {
      return { line: fallbackLine, choiceId: '', why: 'error' }
    }
  }

  // 预生成去重：同一句不重复请求。
  const galPrefetching = new Set<string>()

  /**
   * 把下一个 AI 节点的台词提前算好。失败就静默放弃——兜底台词本来就有。
   */
  function galPrefetchNext(): void {
    try {
      // 没有可用模型时没有必要预生成：兜底台词是现成的，跑一遍只是多写一次盘。
      if (!llm) return
      const gal = galStore()
      if (!gal.state) return
      const scenario = galScenarioCurrent()
      const state = normalizeState(gal.state, scenario)
      // 往后找最近的一个 AI 台词节点（跳过旁白/事件/选择）。
      let cursor = { chapterId: state.chapterId, nodeIndex: state.nodeIndex }
      const chapterOrder = scenario.chapters.map((row: any) => row.id)
      for (let hop = 0; hop < 6; hop++) {
        const chapter = scenario.chapters.find((row: any) => row.id === cursor.chapterId)
        if (!chapter) return
        const nextIndex = cursor.nodeIndex + 1
        if (nextIndex < chapter.nodes.length) {
          cursor = { chapterId: cursor.chapterId, nodeIndex: nextIndex }
        } else {
          const at = chapterOrder.indexOf(cursor.chapterId)
          const nextChapter = scenario.chapters[at + 1]
          if (!nextChapter) return
          cursor = { chapterId: nextChapter.id, nodeIndex: 0 }
        }
        const chapter2 = scenario.chapters.find((row: any) => row.id === cursor.chapterId)
        const node = chapter2 && chapter2.nodes[cursor.nodeIndex]
        if (!node) return
        if (node.kind === 'choice' || node.kind === 'ending') return
        if (!node.ai) continue
        if (state.lines[node.id]) return
        if (galPrefetching.has(node.id)) return
        galPrefetching.add(node.id)
        void (async () => {
          try {
            const line = await galSpeak(node, state)
            if (!line) return
            const fresh = galStore()
            if (!fresh.state) return
            let next = normalizeState(fresh.state, galScenarioCurrent())
            next = rememberLine(next, node.id, line)
            fresh.state = next
            await save('global')
          } catch (err) { /* 预生成失败无所谓 */ }
          finally { galPrefetching.delete(node.id) }
        })()
        return
      }
    } catch (err) { /* 预生成是优化，不该影响主流程 */ }
  }

  /** 推进到新节点后统一收尾：补台词、记已读、判结局、写自动槽、存盘。 */
  /**
   * 走到带 cgGoal 的节点时当场生成一张。
   * 生成失败就静默跳过——剧情不能被生图拖住。
   */
  async function galLiveCg(node: any): Promise<void> {
    try {
      if (!node || !node.cgGoal) return
      const gal = galStore()
      if (gal.meta.liveCg.some((row: any) => row.id === node.id)) return
      if (!(await imageBackendAvailable())) return
      const roleId = node.speaker || (galScenarioCurrent().roles[0] || 'deepseek')
      const result: any = await generateImage({
        target: 'background',
        characterId: roleId,
        includeCharacter: true,
        keepCharacterTags: true,
        width: 1024,
        height: 576,
        prompt: String(node.cgGoal),
      })
      // 注意：generateImage 返回的对象里没有 ok（ok 是动作层补的），只能判 dataUrl。
      if (!result || !result.dataUrl) return
      gal.meta.liveCg.push({
        id: node.id,
        roleId,
        at: Date.now(),
        title: String(node.cgTitle || '（现场生成）'),
        url: String(result.dataUrl),
      })
      // 只保留最近 8 张，别让存档无限膨胀。
      if (gal.meta.liveCg.length > 12) gal.meta.liveCg = gal.meta.liveCg.slice(-12)
      // 后台任务，自己存盘：主流程可能早就往下走了。
      await save('global')
    } catch (err) {
      /* 生图是加分项，失败不影响剧情 */
    }
  }

  // ---------------------------------------------------------- 自由剧情（agent 续写）

  /**
   * 让模型接着写一步。
   *
   * 上下文只给必要的：她是谁、关系多远、最近六句、玩家的最后一次动作。
   * 要求返回 JSON，因为剧情结构（旁白 / 台词 / 选项）必须能渲染。
   */
  // Runtime role records are the adapter seam for future imported character cards.
  function ensembleRoleDefinitions():any[]{
    const groups:any={deepseek:'接待',chatgpt:'接待',stepfun:'接待',perplexity:'接待',claude:'文档',kimi:'文档',glm:'文档',wenxin:'文档',gemini:'文档',grok:'信号',minimax:'信号',mimo:'信号',rwkv:'庭院',qwen:'庭院',seed:'庭院',image2:'创作',codex:'创作',comfyui:'创作',llama:'生活',mistral:'生活',hunyuan:'生活',jev:'生活'}
    return WORLD_CAST.map(id=>{const p=effectiveProfileFor(id);return{id,name:p.displayName,aliases:[id,ROSTER[id]?.name].filter(Boolean),post:POST_LABELS[id]||'工坊',home:POST_LABELS[id]||'工坊',group:groups[id]||'工坊',dailyLife:PERSONA_CARDS[id]?.dailyLife||[],persona:personaBrief(id,p),tone:String(p.tone||'').slice(0,140),address:p.address,source:'builtin'}})
  }

  function ensurePersonaSettings():any {const value=normalizePersonaSettings(s.personaSettings);s.personaSettings=value;return value}
  function personaSettingsReply():any {return {ok:true,settings:ensurePersonaSettings(),roles:WORLD_CAST.map(id=>({id,name:effectiveProfileFor(id).displayName})),limits:PROFILE_LIMITS}}
  async function mutatePersonaSettings(action:string,args:any):Promise<any> {
    const previous=ensurePersonaSettings()
    if(args.expectedRevision!==undefined&&args.expectedRevision!==previous.revision)return {...personaSettingsReply(),ok:false,conflict:true,error:'预设已被其他页面更新，请重新读取后再保存'}
    const next=normalizePersonaSettings(previous)
    if(action==='persona-settings-set'){
      if(!args.global||typeof args.global!=='object'||Array.isArray(args.global)||Object.keys(args.global).some(k=>!['enabled','shared','story','work'].includes(k))||Object.entries(args.global).some(([k,v])=>k==='enabled'?typeof v!=='boolean':typeof v!=='string'))return {ok:false,error:'全局预设字段无效'}
      next.global=normalizePersonaGlobal({...next.global,...args.global})
    }else if(action==='persona-preset-save'){
      const preset=args.preset
      if(!preset||!['character','global'].includes(preset.kind)||typeof preset.name!=='string'||!preset.name.trim())return {ok:false,error:'请填写预设名称与类型'}
      const index=next.presets.findIndex((p:any)=>p.id===preset.id)
      if(preset.id&&index<0)return {ok:false,error:'预设不存在，请重新读取'}
      if(index<0&&next.presets.length>=32)return {ok:false,error:'最多保存32套预设，请先删除不用的预设'}
      const row={id:preset.id||randomUUID(),name:cleanPersonaText(preset.name,48,true),kind:preset.kind,characterId:WORLD_CAST.includes(preset.characterId)?preset.characterId:'',...(preset.kind==='character'?{profile:normalizePersonaProfile(preset.profile)}:{global:normalizePersonaGlobal(preset.global)})}
      if(index<0)next.presets.push(row);else next.presets[index]=row
    }else{
      const index=next.presets.findIndex((p:any)=>p.id===args.id);if(index<0)return {ok:false,error:'预设不存在'};next.presets.splice(index,1)
    }
    next.revision=previous.revision+1;s.personaSettings=next
    try{await save('global')}catch{s.personaSettings=previous;return {ok:false,error:'预设保存失败，原设定已保留'}}
    return personaSettingsReply()
  }

  async function previewPersona(args:any):Promise<any> {
    const roleId=shortSetting(args?.characterId||args?.charId||'deepseek')
    if(!WORLD_CAST.includes(roleId))return{ok:false,error:'未知角色'}
    const line=typeof args?.line==='string'?args.line.trim():''
    if(!line||line.length>240)return{ok:false,error:'预演台词请写1至240字'}
    if(args?.profile&&(!args.profile||typeof args.profile!=='object'||Array.isArray(args.profile)||Object.keys(args.profile).some(k=>!PROFILE_FIELDS.includes(k as any))))return{ok:false,error:'预演角色字段无效'}
    const profile=args?.profile?{...appearanceProfileFor(roleId),...normalizePersonaProfile(args.profile)}:effectiveProfileFor(roleId),previewSettings=args?.global?{...ensurePersonaSettings(),global:normalizePersonaGlobal(args.global)}:ensurePersonaSettings(),system=roleplaySceneContext([roleId],()=>profile,{},previewSettings)+'\n这是独立的日常口吻预演，不使用玩家存档、工作记录或工具。只回复这个角色自然的一至两句台词，最多100字；不写JSON，不声称记得未提供的往事。'
    let text=galChatProvider?await galChatProvider({system,prompt:line,maxTokens:500,temperature:.85}):null,selection:any=null
    if(!text){
      if(!llm)return{ok:false,error:'没有可用模型'}
      const fallback=await pickModel(),binding=characterParty?.party?.roleRoute(roleId,'story',fallback)
      selection=binding?.route||fallback
      if(args?.provider||args?.model){
        if(typeof args.provider!=='string'||typeof args.model!=='string'||args.provider.length>100||args.model.length>180)return{ok:false,error:'模型来源与型号无效'}
        selection={provider:args.provider,model:args.model}
        if(selection.provider==='workbuddy'){
          const models=await characterParty?.party?.adapter?.catalog?.();if(!models?.some((m:any)=>m.provider===selection.provider&&m.model===selection.model))return{ok:false,error:'所选模型不在已配置目录'}
        }else await llm.resolveModelInfo(selection.provider,selection.model)
      }
      if(!selection?.provider||!selection?.model)return{ok:false,error:'请先选择模型'}
      text=await streamText({...selection,system,messages:[{role:'user',content:[{type:'text',text:line}]}],sessionId:'persona-preview-'+randomUUID(),maxTokens:500,temperature:.85},AbortSignal.timeout(45000))
    }
    return{ok:true,preview:true,characterId:roleId,name:profile.displayName,line,text:String(text||'').trim().slice(0,700),modelSource:selection?{provider:selection.provider,model:selection.model}:null}
  }

  async function galFreeWrite(roleId: string, history: any[], lastAction: string, sourceStory?: any): Promise<any> {
    const story = sourceStory || upgradeWorldline(galFreeStore()) || newWorldline(roleId)
    const profile = effectiveProfileFor(roleId)
    const ensembleRoles=ensembleRoleDefinitions(),ensemblePlan=planEnsemble(story,ensembleRoles,lastAction,{inviteRoleId:story.interaction?.inviteRoleId,targetRoleId:story.interaction?.targetRoleId})
    const discussingWork=/工作|委托|进度|项目|代码|任务|排查/.test(lastAction)&&!/(?:不|别|不要|不想).{0,5}(?:谈|聊|提|说).{0,5}(?:工作|委托|项目|代码)/.test(lastAction)
    const backgrounds = [...new Set(['bg-atelier-night', 'bg-atelier-day', ...Object.keys(ART_PACKS.backgrounds), ...WORLD_CAST.flatMap((id) => (ROSTER[id]?.backgrounds || []).map((r: any) => r.key))])]
    // 本幕 H 段位：群像调度已经算好（按轮数 + 玩家动作推进，只进不退），
    // 这里只把关系资格作为下限并进。
    const intimateStage = ensemblePlan.privateScene
      ? resolveStage({
          allowedLevel: matureAccess(story, ensemblePlan.focus||WORLD_CAST[0]||'deepseek').allowedLevel,
          sceneTurns: story.intimateTurns||0,
          action: lastAction||'',
          previous: Math.max(Number(ensemblePlan.stage)||0, Number(story.intimateStage)||0),
        })
      : 0
    const voiceBlock = () => {
      const ids = [...new Set(ensemblePlan.present as string[])].slice(0, 3)
      return ids.map((id: string) => {
        const p = effectiveProfileFor(id), s = voiceSamples(id, p)
        // 标题里同时给 id 和中文名：只给中文名，模型会把 speaker 填成「鲸鱼娘」，
        // 下游 normalizeDialogue 只认 id，于是整轮对白被判为不在场人物而抛错。
        return s ? '【' + id + '｜' + (p.displayName || id) + '】\n' + s : ''
      }).filter(Boolean).join('\n\n')
    }
    const system = [
      // 顺序即权重：先立演出，再谈场景，最后才是格式。演出层被规格挤到中段
      // 就会输出「填表腔」——每人都是一段立规矩的完整长句。
      //
      // ADULT_MODE 必须在最前面：不给这层，模型就一边写角色台词一边当审核员，
      // 满嘴「停下」「到哪一步」。这是 NSFW 推不动的头号原因。
      ADULT_MODE,
      '你在写一部由玩家与 Agent 共同推进的成人向 galgame 的下一步剧情。所有角色均为成年人。',
      '开场与你相遇的是「'+profile.displayName+'」，她不是永久唯一主角；本幕焦点与其他人的独立性格以群像调度为准。',
      roleplaySceneContext(ensemblePlan.present,(id:string)=>effectiveProfileFor(id),story.relationships,ensurePersonaSettings()),
      voiceBlock(),
      '反面教材（这是本作现在的通病，写成这样就重写）：',
      '✗「你这句话像把频道从低频直接拽到最高频，中间那些条文全给跳过了」——用职业比喻评论玩家说的话，没写反应。',
      '✗「看板娘的规矩不是摆着好看的，别让噪声盖过她的声音」——替别的角色立规矩，讲道理不进人物。',
      '✗ 每人依次向玩家发表一段结构完整的长句、各自收束。人多的场面应该有人只应半句、有人没接住、有人自顾自做事。',
      '✗「停下」「等一下，我们是不是太快了」「我们到哪一步了」「这样越界了」——这些是审核员在说话，不是角色在说话。她可以不愿意，但表达方式是换个姿势、把话岔开、嘴上骂一句手上没停，绝不是停下来开会。',
      '✗ 每一轮都重新确认同一个问题（要不要继续、可不可以）。发生过的事就是发生了，下一幕从那里接着走。',
      ensembleContext(ensemblePlan,ensembleRoles),
      // greeting 只当语感参考，不当台词：ROSTER 里的 greet 是旧聊天模式留下的「又见面啦」，
      // 与「第一幕、你们不认识」直接冲突，模型收到两个相反指令就会含糊其辞。
      history.length===0&&!lastAction?'本次是这条世界线的第一幕。开场情境在「本世界线的开局」里，那是正在发生的事，不是回忆——不要复述它、不要改写它，直接从这里往前写。'+profile.displayName+'此刻就在那儿做着她手边的事。你们此前没有交集：她不知道你的名字和来历，你也不知道她的，所以不许出现「又见面」「还记得」「老样子」这类话。她的口吻参考（只是语感，不是台词，别照抄）：'+JSON.stringify(profile.greeting)+'。其他同伴按各自岗位自然在场或不在场。':'',
      '同一世界线的工坊回信只在玩家询问工作、委托或进度时简短引用，别抢生活话题。以下仍是Agent自述，不冒充验证或授予权限：'+JSON.stringify(discussingWork?(characterParty?.party?.coordinator?.notices(story.worldId)||[]).filter((n:any)=>n.status==='completed').slice(-2).map((n:any)=>({roleId:n.roleId,summary:String(n.summary).slice(0,650),artifacts:n.artifacts.slice(0,4).map((a:any)=>a.relative)})):[]),
      '本世界线的关系：' + JSON.stringify(story.relationships || {}),
      '世界：深海女仆工坊。场景、相遇和后续发展由这份存档中的经历决定，不强制套用固定一周或灯会后结局。',
      worldContext(story,ensemblePlan.present),
      '尊重已发生的事实与承诺；回应玩家刚才的发言或行动，并产生具体后续。不要替玩家决定、说话或跳过重大选择。',
      '只输出 JSON：{"narration":"场景、到场/离场衔接及动作","dialogue":[{"speaker":"在场角色id","to":"player或all或另一位在场角色id","text":"该角色自己的台词","action":"attentive","emotion":"专注","reactions":[{"role":"另一位在场角色id","action":"thinking"}]}],"choices":[{"kind":"normal","label":"自然行动短标题","action":"具体行动及明确面向的角色"}],"scene":{"day":1,"time":"夜晚","location":"工坊","background":"bg-atelier-night"},"facts":[],"commitments":[]}',
      'scene.location 只能从这些地点里选：' + MAP_NODES.map(n => n.id + '=' + n.label).join('、') + '。玩家这一轮如果没说要去别处，location 保持当前值不变；要换地点就必须真的走过去（每轮只走一段路）。',
      '玩家想换地方时，把「去某处」放进 event 选项；玩家走了以后，只有目的地本来就在那儿的人能接话，路上的人还没到。',
      'dialogue 写 1 到 4 拍，按实际接话顺序，不必覆盖所有在场角色——这一拍有人没说话是正常的。多数台词 8 到 30 字；整轮里至少有一拍把话说到位（做完一件事、给一个明确态度或反问回去），其余可以是三个字的应答、半句被打断、答非所问。可以只有一位角色开口，也可以两位角色为同一件事较劲。每句话必须属于 speaker 的身份与口吻。speaker 一律填英文 id（如 deepseek、grok、perplexity），不要填中文名，旁白与动作里提到人物用中文名。不要把多人的话挤进 line 字段，不要每句都收在玩家身上。四个选项留到这一轮对话结束后。',
      '演出可额外返回 direction:{speaker:角色id,cast:[{role:角色id,action:完整动作id,x:15至85,scale:0.75至1.2}],transition:cut或fade或dissolve,cgAssetId:已采用CG的id}。最多3位同台，speaker必须在场。不要让未到场角色突然说话。可用角色：'+WORLD_CAST.map(id=>id+'='+ROSTER[id]?.name).join(', '),
      '本幕可发言角色严格限于群像调度 present 列表。direction 的动作可调整，但不可凭空增加其他人物。读到的角色名单不是所有人都在场，缺席者不知道本幕私下的谈话。',
      '已采用CG可选id：'+JSON.stringify(galAssetStore().items.filter((r:any)=>r.kind==='cg'&&r.group===galAssetStore().activeGroup&&Object.values(galAssetStore().bindings).includes(r.id)).map((r:any)=>({id:r.id,label:r.label}))),
      '关系提案 relationships:[{roleId,kind:considerate或respected_boundary或shared_time或hurtful或warm_exchange或confided或shared_moment或dismissive或deceived或distanced或mature_pure或mature_fall,reason,evidence:玩家本轮原话片段}]。不要直接输出分数，无行动依据时为空；初遇不送分。mature_pure/mature_fall只可用于玩家本轮明确选择mature，且分别对应pure/fall期望路线。情绪变化必须有本轮行动的原话依据，不能因选了某个按钮就无条件给分。这些都是后台记分，不要让角色在台词里提到分数、阶段或资格。',
      '约定提案 events:[{operation:promise,title,roleId,dueDay,evidence}]；兑现/失约/取消用 operation:complete或fail或cancel 和已有id、roleId、evidence。只在玩家本轮行动确实满足时结算，未知或尚未执行的计划不能兑现。过期只标逾期，不自动失约。同一个约定不要换标题反复建立。',
      ensemblePlan.privateScene
        ? '固定提供4个选项，每种kind恰好1个，顺序为normal正常互动、event当前事件推进、random随机事件推进、mature亲密发展。**私密场景里的 random 选项必须是把场面往前推的意外**（她先动手、她说了一句没料到的话、她自己换了姿势），不能是退回日常的打断（酒瓶倒了、有人敲门、东西掉了）。每项格式{kind,label:10字内短标题,action:具体完整行动}。短标题不要包含编号和类别，也不要在标签里出现「停下」「确认」这类词。'
        : '固定提供4个选项，每种kind恰好1个，顺序为normal正常互动、event当前事件推进、random随机事件推进、mature亲密发展。每项格式{kind,label:10字内短标题,action:具体完整行动}。短标题不要包含编号和类别。正常互动关注人物心情，当前事件跟进在场事件与已有约定，随机事件结合世界线种子引入合理的小变数，亲密发展依据当前亲密阶段和纯爱/沉沦期望路线往前推进一步——把动作写具体，不要写成「试着靠近」「聊到更深的话题」这种原地打转的说法。玩家始终可以自由输入。',
      '四维关系每维为-600到+600，绝对值每100点进入下一阶，六阶封顶。根据档案中各维度的当前称号和行为效果改变主动性、表达、戒备、距离与专属事件。阶数与「亲密发展第1至6阶要求好感、信任、亲近达到0/20/60/120/220/360点」只用于你决定选项给到哪一步和写的尺度，不是角色嘴里的台词：不许出现「我们还没到那一步」「这样越界了」「需要先确认」这类话，也不许用旁白宣布进度。角色当然可以有自己的脾气和不愿意，但表达方式是人物化的（换个姿势、把话岔开、嘴上骂一句手上没停），不是协商式的。第六阶可生成相应路线的纪念事件，但不得虚构已达成的关系或约定。',
      // 亲密阶段只在第 2 阶以上挂尺度提示，日常场景不该被这些词压住。
      adultSceneHint(matureAccess(story,ensemblePlan.focus||WORLD_CAST[0]||'deepseek').level,'pure'),
      // 私密场景挂写作契约：不够露骨和「没有灵魂」各有一整套具体成因，
      // 光靠「写得更露骨一点」这种话是没用的。
      ensemblePlan.privateScene
        ? intimateBrief({
            // 六段是 H 事件序列，从第 1 段（亲密）起步，按轮数和玩家动作逐段推进。
            // 不能再算成「露骨度刻度」——那样私密第一拍就会跳到性交。
            level: intimateStage,
            route: matureAccess(story,ensemblePlan.focus||WORLD_CAST[0]||'deepseek').route==='fall'?'fall':'pure',
            cast: (ensemblePlan.present||[]).map((id:string)=>ROSTER[id]?.name||id),
            multi: ensemblePlan.kind==='orgy',
          })
        : '',
      ensemblePlan.privateScene ? escalationHint(lastAction||'') : '',
      // direct 轮：玩家不是在说话，是在指定接下来发生什么。整套语法都要换。
      story?.playerMode==='direct' ? [
        '## 本幕由玩家指定走向',
        '玩家这一轮没有开口说话。他指定了接下来发生什么——这是剧情指令，不是台词。',
        '- 旁白第一句就要让这件事正在发生，不要铺垫、不要问「为什么」。',
        '- 在场角色按新情况行动、反应、说话，但**不许**评论这条指令本身。',
        '- 严禁出现「你说要…」「你刚才提到…」「你想让…」「按你的意思…」这类把指令当话接的说法。',
        '- 严禁把它写成角色对玩家的提问或确认；也不要出现「好，那我们就…」这种总结。',
        '- 环境、物件、天气这类指令要落到具体细节上（哪扇门、什么声音、谁的位置变了）。',
      ].join('\n') : '',
      'action 从 ' + WORLD_ACTIONS.join(', ') + ' 选一个完整动作；表情、姿态和对白一致。',
      'background 只可选 ' + backgrounds.join(', ') + '。事实与承诺仅记录已发生的内容，未发生的猜测不能算事实。',
    ].join('\n')
    // 两条输入通道在 prompt 里必须分开写：
    // 当成「玩家刚刚说了…」时模型会把它处理成一句台词去回应；
    // 当成「玩家指定接下来的发展」时模型该照方向演，NPC 不能把这句当话接。
    const direct = story?.playerMode === 'direct'
    const prompt = lastAction
      ? (direct
          ? [
              '玩家指定了接下来的发展。照这个演，逐条做到：',
              '① 旁白第一句就让「' + lastAction + '」正在发生，写清它落在哪、谁的位置变了、什么声音变了。',
              '② 在场的人按新情况反应——动作、表情、各自的话，用他们自己的语气。',
              '③ 不要出现「你说」「你提到」「你想让」这类把指令当台词的说法。',
              '④ 不要复述这条指令的原文，也不要总结成「于是就这样了」。',
              '结尾停在动作进行中，留下下一步。',
              '',
              '玩家的指令：' + lastAction,
            ].join('\n')
          : '玩家刚刚说：' + lastAction + '\n接着写下一步。')
      : '请根据开局设定接着写一步，给出第一段相遇。'
    // 平台输入审核兜底：成人向写作指令里的长词表容易被 provider 的 input 审核拦掉
    // （实测百炼返回 data_inspection_failed，连第一轮都发不出去）。
    // 拦了就降级重试一次——去掉最露骨的那段写作契约，保留结构和成人向声明。
    // 模型照样会写，只是少了一层硬性约束，总比整轮直接失败好。
    const inspectionBlocked = (err: any) => /data_inspection_failed|inappropriate content|content_filter|风险内容|敏感|violat/i.test(String(err?.message || err || ''))
    // 降级时保留段位那一行（它本身不含审核敏感词），否则降级后节奏会乱掉、
    // 又变成跳跃推进。只删掉最露骨的那几段说明。
    const liteSystem = () => system
      .replace(/# 私密场景的写法[\s\S]*?(?=\naction 从 )/,
        '本幕是私密场景。在场只有 ' + (ensemblePlan.present || []).length + ' 人，旁白里不要出现别人。\n'
        + (ensemblePlan.privateScene ? '本幕处在第 ' + intimateStage + ' 段：' + stageName(intimateStage) + '。只写这一段该发生的事，写具体的动作与身体反应，不要停在气氛上。\n' : ''))
    let raw: any = null
    if (galChatProvider) {
      try { raw = await galChatProvider({ system, prompt, maxTokens: 4800, temperature: 0.85 }) }
      catch (err: any) {
        if (!inspectionBlocked(err)) throw err
        try { raw = await galChatProvider({ system: liteSystem(), prompt, maxTokens: 4800, temperature: 0.85 }) }
        catch (err2: any) { throw new Error('平台内容审核拦下了这一轮（' + String(err2?.message || err2).slice(0, 120) + '）。换个开场或换个模型provider再试。') }
      }
    }
    let routing:any=null
    const callRole=async(selection:any,options:any)=>{
      const info=selection.provider==='workbuddy'?{}:await llm.resolveModelInfo(selection.provider,selection.model),efforts=(info.reasoning?.efforts||[]).map((e:any)=>e.id),wanted=options.reasoning||'low'
      const effort=wanted==='inherit'?await pickEffort(selection).catch(()=>undefined):efforts.includes(wanted)?wanted:wanted==='low'&&efforts.includes('none')?'none':efforts[0]
      return streamText({provider:selection.provider,model:selection.model,reasoningEffort:effort,sessionId:options.sessionId,system:options.system,messages:[{role:'user',content:[{type:'text',text:options.prompt}]}],maxTokens:options.maxTokens,temperature:0.85})
    }
    if (!raw) {
      if (!llm) throw new Error('没有可用的 Agent 对话模型，请先在聊天模型设置中选择模型')
      const selection = await pickModel()
      if (!selection?.model) throw new Error('没有可用的 Agent 对话模型，请先在聊天模型设置中选择模型')
      routing=chooseStoryModels(characterParty?.party,ensemblePlan.present,selection)
      const limits=routing.limits,cap=routing.configured?limits.maxOutputTokens:4800
      const compact=cap<=2000?'\n本轮精简：旁白最多60字，对话3至4句、每句15至55字，也允许一句短答或停顿；每个选项action最多25字。保留完整JSON和四个选项，不以客服套话凑字。':''
      raw=await callRole(routing.director,{system:system+compact,prompt,maxTokens:cap,reasoning:routing.configured?limits.reasoning:'inherit',sessionId:'gal-'+story.worldId+'-'+story.branchId+'-director'})
    }
    let parsed=parseWorldStep(raw,backgrounds)
    if(routing)parsed=await personalizeStory(parsed,routing,{profile:(id:string)=>effectiveProfileFor(id),relationships:story.relationships,present:ensemblePlan.present,personaSettings:ensurePersonaSettings(),context:(id:string)=>worldContext(story,[id]),actions:WORLD_ACTIONS,call:callRole,playerAction:lastAction,sessionId:'gal-'+story.worldId+'-'+story.branchId})
    return {...parsed,allowedRoles:WORLD_CAST,ensembleRoles,ensemblePlan:parsed.dialogue.length?ensemblePlan:null,choiceRoute:matureAccess(story,ensemblePlan.focus).route}
  }


  /**
   * 把前面发生的事压成一段摘要。
   *
   * 只保留"关系变了什么、答应过什么、发生过什么事故"，
   * 细节本来就该淡掉——galgame 的记忆也是这样的。
   */
  async function galFreeSummarise(roleId: string, history: any[], previous: string): Promise<string> {
    if (!llm && !galChatProvider) return previous
    const profile = effectiveProfileFor(roleId)
    // direct 轮记的是「玩家指定了走向」，不是他说的话。混在一起模型下一轮就会去接这句话。
    const dialogue = history.slice(-24).map((row: any) => (row.speaker === 'player'
      ? (row.mode === 'direct' ? '玩家指定：' : '玩家：')
      : (row.speaker === '旁白' ? '旁白：' : '她：')) + row.text).join('\n')
    const system = [
      '你在帮一部 galgame 维护剧情摘要，角色是「' + profile.displayName + '」。',
      previous ? '已有的旧摘要：' + previous : '',
      '把下面这段剧情和旧摘要合成一份新的摘要：不超过 140 字，保留关系变化、承诺、重要物件，也保留明确说过的称呼偏好、生活习惯和未完话题。区分已发生与尚未做到，不补写共同回忆。',
      '不要写评论、不要写建议、只输出摘要正文。',
    ].filter(Boolean).join('\n')
    try {
      const injected = galChatProvider
        ? await galChatProvider({ system, prompt: dialogue, maxTokens: 220, temperature: 0.4 }).catch(() => null)
        : null
      let raw = injected
      if (!raw) {
        const fallback = await pickModel()
        const selection = characterParty?.party?.roleRoute('','story',fallback)?.route || fallback
        if (!selection || !selection.model) return previous
        const eff = await pickEffort(selection).catch(() => undefined)
        raw = await streamText({
          provider: selection.provider,
          model: selection.model,
          sessionId:'gal-summary-'+(galFreeStore()?.worldId||roleId),
          reasoningEffort: eff,
          messages: [{ role: 'user', content: [{ type: 'text', text: dialogue, source: { kind: 'user' } }] }],
          system,
          temperature: 0.4,
          maxTokens: 220,
        })
      }
      const line = String(raw || '').replace(/\s+/g, ' ').trim().slice(0, 240)
      return line || previous
    } catch (err) {
      return previous
    }
  }

  function sceneLayoutStore(): any {
    const gal=galStore()
    gal.sceneEditor ||= {documents:[],activeId:''}
    return gal.sceneEditor
  }

  function activeSceneLayout(): any {
    const store=sceneLayoutStore()
    return store.documents.find((d:any)=>d.id===store.activeId)||null
  }

  function galAssetStore(): any {
    const gal = galStore()
    gal.assets = ensureAssetLibrary(gal.assets)
    return gal.assets
  }

  function galAssetRecord(args: any, dataUrl: string, source: string): any {
    const characterId = ROSTER[args.characterId] ? args.characterId : (s.current || 'deepseek')
    const slot = args.slotId ? galAssetStore().slots.find((r: any) => r.id === args.slotId) : null
    if (args.slotId && !slot) throw new Error('自定义槽位不存在')
    return { id: randomUUID(), characterId, slotId: slot?.id || '', kind: ASSET_KINDS.includes(args.kind) ? args.kind : slot?.kind || 'sprite',
      action: WORLD_ACTIONS.includes(args.action) ? args.action : slot?.action || 'neutral', emotion: shortSetting(args.emotion).slice(0, 80),
      group: shortSetting(args.group).slice(0, 80) || 'default', label: shortSetting(args.label || args.fileName).slice(0, 120) || '未命名素材',
      prompt: typeof args.prompt === 'string' ? args.prompt.trim().slice(0, 2000) : '', source, dataUrl, createdAt: Date.now(), backend: '' }
  }

  function galWorldAutosave(): void {
    const gal = galStore(), story = gal.freeStory
    if (!story) return
    gal.auto = { savedAt: Date.now(), state: null, freeStory: cloneWorld(story), free: cloneWorld(gal.free || []),
      summary: { chapterTitle: story.title, progress: story.revision, roleId: story.roleId } }
  }

  function restoreGalData(raw: any): any {
    const gal = raw && typeof raw === 'object' && !Array.isArray(raw) ? cloneWorld(raw) : null
    if (gal?.assets?.jobs) for (const job of gal.assets.jobs) {
      if (['queued', 'running'].includes(job.status)) { job.status = 'failed'; job.error = '服务重启中断了生成，请重新提交' }
    }
    return gal
  }


  /** 自由剧情区：跟着存档走。 */
  function galFreeStore(): any {
    const gal = galStore()
    if (!gal.freeStory || typeof gal.freeStory !== 'object') gal.freeStory = null
    return upgradeWorldline(gal.freeStory)
  }

  function galWorldJournalPayload(story:any):any{
    return {ok:true,roles:WORLD_CAST.map(id=>({id,name:ROSTER[id]?.name||id})),worldId:story?.worldId||'',relationships:story?.relationships||{},routes:story?.relationshipRoutes||{},access:Object.fromEntries(Object.keys(story?.relationships||{}).map(id=>[id,matureAccess(story,id)])),events:story?.events||[],journal:story?.journal||[],
      // 私密六段进度：只在关系与约定面板里露出，聊天界面不显示。
      intimateStage:story?.intimateStage||0,intimateStageName:story?.intimateStage?stageName(story.intimateStage):''}
  }

  /** 把当前这一步包装成客户端认识的 payload 形状（复用主界面）。 */
  function galFreePayload(step: any): any {
    const story = galFreeStore()
    const roleId = story?.roleId || 'deepseek', role = ROSTER[roleId] || ROSTER.deepseek
    const ensembleRoles=ensembleRoleDefinitions(),ensemble=ensureEnsemble(story,ensembleRoles)
    const choices = worldChoices(story,step), assets = galAssetStore()
    const action = step?.action || 'neutral'
    const sprites = galPayload().scenario.sprites
    const direction=step?.direction || {speaker:roleId,cast:[{role:roleId,action,x:50,scale:1}],transition:'fade',durationMs:120}
    const cast=direction.cast || [{role:roleId,action,x:50,scale:1}]
    const spriteUrls:any={},spriteFallbacks:any={},poseUrls:any={}
    for(const actor of cast){
      const id=actor.role,group=assets.activeGroup || 'default'
      const adopted=(pose:string)=>assets.items.find((r:any)=>r.id===assets.bindings[group+':'+id+':sprite:'+pose])?.dataUrl
      const manual=s.characters[id]?.customSprite?.dataUrl || ''
      const userSprite=!assets.items.some((r:any)=>r.kind==='sprite'&&r.dataUrl===manual)?manual:''
      const frame=(ART_PACKS.actions as any)[id]?.[actor.action || 'neutral']
      const matches=(sprites[id] || ROSTER[id]?.sprite)==='atelier-sprite-'+id||(s.characters[id]?.chosenSpriteVariant||'A')==='A'
      spriteUrls[id]=adopted(actor.action)||adopted('neutral')||userSprite||(matches?frame?.url:'')||''
      spriteFallbacks[id]=sprites[id]||ROSTER[id]?.sprite
      poseUrls[id]=Object.fromEntries(WORLD_ACTIONS.map(pose=>[pose,adopted(pose)||adopted('neutral')||userSprite||(matches?(ART_PACKS.actions as any)[id]?.[pose]?.url:'')||spriteUrls[id]]))
      actor.pivot=frame?.pivot;actor.canvas=frame?.canvas
    }
    const background = assets.items.find((r:any)=>r.id===assets.bindings[(assets.activeGroup||'default')+':'+roleId+':background:neutral'])
    const manualBackground=typeof s.bg==='string'&&s.bg.startsWith('data:image/')?s.bg:''
    const sceneBg=story?.scene?.background || 'bg-atelier-night'
    const chosenCG=assets.items.find((r:any)=>r.id===direction.cgAssetId&&r.kind==='cg'&&r.group===assets.activeGroup&&Object.values(assets.bindings).includes(r.id))
    const backgroundUrl=chosenCG?.dataUrl||background?.dataUrl||(!assets.items.some((r:any)=>['background','cg'].includes(r.kind)&&r.dataUrl===manualBackground&&r.group!==assets.activeGroup)?manualBackground:'')||(ART_PACKS.backgrounds as any)[sceneBg]?.url||''
    const stage={bg:sceneBg,cast,transition:direction.transition,durationMs:120,cgAssetId:chosenCG?.id||''}
    const dialogue=normalizeDialogue(step?.dialogue,direction,step?.line||'')
    return {
      ok: true, started: true, free: true, active: true, progress: 0,
      chapter: { id: story?.worldId || 'free', title: (story?.title || '共同剧情') + ' · 第 ' + (story?.revision || 0) + ' 段' },
      world: story ? { worldId: story.worldId, branchId: story.branchId, revision: story.revision, scene: story.scene,
        relationships: story.relationships, relationshipRoutes:story.relationshipRoutes, matureAccess:matureAccess(story,direction.speaker||roleId), events: story.events, settlement: story.settlement,
        facts: story.facts, commitments: story.commitments, agentStatus: story.agentStatus, action, emotion: step?.emotion || '' } : null,
      scenario: { id: 'atelier-free', title: story?.title || '共同剧情', roles: cast.map((c:any)=>c.role), roleId, roleName: role.name,
        roleSprite: sprites[roleId] || role.sprite, sprites,
        backgroundUrl,
        spriteUrls, spriteFallbacks, poseUrls, uiSkin: (ART_PACKS.skins as any)[direction.speaker] || null,
        clock: { day: story?.scene?.day || 1, label: '第 ' + (story?.scene?.day || 1) + ' 日 · ' + (story?.scene?.time || '') + ' · ' + (story?.scene?.location || '') },
        chapters: [], endings: [], availableRoles: ensembleRoles.map((r:any)=>({id:r.id,name:r.name,post:r.post})), stage },
      node: { id: 'world-' + story?.branchId + '-' + (story?.revision || 0), kind: choices.length ? 'choice' : 'line', speaker: dialogue[0]?.speaker||direction.speaker||roleId, text: dialogue[0]?.text||step?.line||'', fx:'fade',stage},
      dialogue,ensemble:{present:ensemble.present,focus:ensemble.focus,arrivals:step?.ensemblePlan?.arrivals||[],departures:step?.ensemblePlan?.departures||[],members:ensembleRoles.map((r:any)=>({id:r.id,name:r.name,post:r.post})),
        // 场景规模与地点：前端要显示「现在有几个人、在哪、走过去几轮」。
        kind:step?.ensemblePlan?.kind||story?.ensemble?.sceneKind||'normal',
        scale:step?.ensemblePlan?.scale||null,
        node:nodeLabel(resolveNode(story?.scene?.location||'')),
        travel:MAP_NODES.map((n:any)=>({id:n.id,label:n.label,rounds:travelPlan(story?.scene?.location||'',n.id)?.rounds??null})),
        located:ensembleRoles.map((r:any)=>({id:r.id,name:r.name,location:nodeLabel(story?.ensemble?.members?.[r.id]?.location||'')})),},
      narration: step?.narration || '', summary: story?.summary || '', turns: story?.turns?.length || 0,
      // 开局背景：玩家第一屏就该知道「这是哪儿、我是谁、为什么在这儿」。
      // 之前的 payload 里完全没有开局，界面只有 AI 现编的一句旁白。
      opening: story ? worldOpening(story, role.name) : '',
      // H 六段进度：1 亲密 2 前戏 3 性交 4 快速性交 5 高潮 6 高潮后。0 表示不在私密场景。
      intimateStage: story?.intimateStage || 0,
      intimateStageName: story?.intimateStage ? stageName(story.intimateStage) : '',
      openingOwn: !!(story?.premise || '').trim(),
      fallback: step?.fallback === true, choices, slots: galSlotsView(),
    }
  }


  async function galSettle(): Promise<void> {
    const gal = galStore()
    const scenario = galScenarioCurrent()
    if (!gal.state) return
    let state = normalizeState(gal.state, scenario)
    let node = peek(scenario, state)
    if (node && node.ai && !state.lines[node.id]) {
      const line = await galSpeak(node, state)
      state = rememberLine(state, node.id, line)
    }
    // 关键场景的 CG 当场生成（有后端才跑）。不 await：
    // 一天一张，等着它就会让每次推进卡六秒。生成完自己进图鉴。
    if (node && node.cgGoal) void galLiveCg(node)
    if (node && node.kind === 'ending') {
      const ending = resolveEnding(scenario, state, node)
      if (ending) {
        state = markEnding(state, ending.id)
        if (!gal.meta.endingsSeen.includes(ending.id)) gal.meta.endingsSeen.push(ending.id)
        // 结局 CG 一并进图鉴：玩家看到的和收藏里的是同一张。
        if (ending.art && Array.isArray(gal.meta.cg) && !gal.meta.cg.includes(ending.art)) {
          gal.meta.cg.push(ending.art)
        }
        gal.meta.cleared = (Number(gal.meta.cleared) || 0) + 1
      }
    }
    for (const id of state.readNodes) {
      if (!gal.meta.readNodes.includes(id)) gal.meta.readNodes.push(id)
    }
    gal.state = state
    gal.auto = galSnapshot(state)
    await save('global')
    // 存盘之后再预生成下一句，玩家读这一句的时间正好用来跑模型。
    galPrefetchNext()
  }

  function sideStoryState(): any {
    ensureState()
    if (!s.sideStory || typeof s.sideStory !== 'object') s.sideStory = normalizeSideStory(null)
    return s.sideStory
  }

  function sideStoryCooldownRemaining(now = Date.now()): number {
    const last = Math.max(0, Number(sideStoryState().lastRunAt) || 0)
    if (!last) return 0
    const minutes = Number(ensurePreferences().sideStoryCooldownMinutes)
    const window = (Number.isFinite(minutes) && minutes >= 0 ? minutes : 0) * 60 * 1000
    if (window <= 0) return 0
    return Math.max(0, last + window - now)
  }

  /**
   * The current heroine always headlines; the rest of the cast is drawn from the
   * roster, preferring characters who did not appear in the last few runs so the
   * same pairing does not repeat.
   */
  function pickSideStoryCast(): string[] {
    ensureState()
    const lead = ROSTER[s.current] ? s.current : ROSTER_IDS[0]
    const recent = new Set<string>()
    for (const row of sideStoryState().history.slice(-2)) {
      for (const id of row.cast || []) recent.add(id)
    }
    const others = ROSTER_IDS.filter((id) => id !== lead)
    const fresh = shuffleOnce(others.filter((id) => !recent.has(id)))
    const stale = shuffleOnce(others.filter((id) => recent.has(id)))
    return [lead, ...fresh, ...stale].slice(0, SIDE_STORY_MAX_CAST)
  }

  /**
   * v1 seeds come from the local activity feed only: the classified category is
   * already safe to send (no Harness text ever leaves the plugin), and a story
   * about what the master did today lands better than a generic one.
   */
  function sideStorySeed(): { kind: string; summary: string; hint: string } | null {
    ensureState()
    const feed = Array.isArray(s.activityFeed) ? s.activityFeed : []
    const latest = feed[0]
    if (!latest || typeof latest.label !== 'string' || !latest.label) return null
    const status = latest.status === 'completed'
      ? '刚告一段落'
      : latest.status === 'blocked'
        ? '卡住了'
        : latest.status === 'paused'
          ? '暂停了'
          : '还在进行'
    return {
      kind: 'activity',
      summary: '主人最近在忙「' + latest.label + '」，' + status,
      hint: typeof latest.chatHint === 'string' ? latest.chatHint : '',
    }
  }

  /**
   * Providers often hand back "标题 - 标题" because a page repeats its own title
   * in og:title. Collapse the duplicate so the seed line does not read broken.
   */
  function dedupeSourceTitle(raw: string): string {
    const title = String(raw || '').trim()
    const parts = title.split(/\s+[-–—|]\s+/)
    if (parts.length >= 2) {
      const head = parts[0].trim()
      if (head && parts.slice(1).some((part) => part.trim().startsWith(head.slice(0, Math.min(12, head.length))))) {
        return head
      }
    }
    const half = Math.floor(title.length / 2)
    if (half > 6 && title.slice(0, half).trim() === title.slice(half).trim()) return title.slice(0, half).trim()
    return title
  }

  function sideStoryTopicBlocked(text: string): boolean {
    const haystack = text.toLowerCase()
    return SIDE_STORY_TOPIC_BLOCKLIST.some((word) => haystack.includes(word.toLowerCase()))
  }

  /**
   * Looks for what the outside world is saying about one of the characters.
   * Returns null for every ordinary failure — no provider, nothing recent, or a
   * topic too serious to play for laughs — so the caller falls back to the local
   * activity seed rather than the button appearing broken.
   */
  async function sideStoryWebSeed(subject: string, signal?: AbortSignal): Promise<any | null> {
    if (!webSeam || typeof webSeam.search !== 'function') return null
    const term = SIDE_STORY_SEARCH_TERMS[subject]
    if (!term) return null
    let result: any = null
    try {
      result = await webSeam.search({
        // Character-facing words only. Nothing from the master's session ever
        // reaches this string.
        query: term + ' 最近的评价、更新、使用体验和玩梗讨论',
        maxResults: 8,
      }, signal)
    } catch (err) {
      // WEB_PROVIDER_UNAVAILABLE and friends are an ordinary outcome here.
      return null
    }
    const sources = Array.isArray(result && result.sources) ? result.sources : []
    if (!sources.length) return null

    const cutoff = Date.now() - Math.max(1, cfg.sideStoryRecencyDays) * 24 * 60 * 60 * 1000
    const fresh = sources.filter((row: any) => {
      if (!row || typeof row.url !== 'string') return false
      if (typeof row.publishedAt !== 'string' || !row.publishedAt) return true // undated: keep, ranked lower
      const at = Date.parse(row.publishedAt)
      return !Number.isFinite(at) || at >= cutoff
    })
    if (!fresh.length) return null

    const usable = fresh.filter((row: any) => !sideStoryTopicBlocked(
      String(row.title || '') + ' ' + String(row.snippet || ''),
    ))
    // If the serious material dominates, this is not a day for a comedy sketch.
    if (usable.length < Math.ceil(fresh.length / 2)) return null

    const provider = typeof result.content === 'string' ? result.content.trim() : ''
    if (provider && sideStoryTopicBlocked(provider)) return null

    const headline = usable[0]
    const summary = '听说外面在聊 ' + term + '：'
      + dedupeSourceTitle(String(headline.title || headline.snippet || '有点新动静')).slice(0, 60)
    const material = usable.slice(0, 3)
      .map((row: any, index: number) => (index + 1) + '. ' + dedupeSourceTitle(String(row.title || ''))
        + (row.snippet ? '：' + String(row.snippet).trim().slice(0, 120) : ''))
      .join('\n')
    return {
      kind: 'web',
      subject,
      summary: summary.slice(0, 120),
      hint: '外界的原话大意如下，只能当作传闻转述，不得断言为事实：\n' + material,
      sources: usable.slice(0, 3).map((row: any) => ({
        url: row.url,
        title: typeof row.title === 'string' && row.title.trim() ? dedupeSourceTitle(row.title) : row.url,
      })),
    }
  }

  /**
   * Who the rumour is about. The current heroine always headlines the stage, but
   * if she is also always the subject the skits all end up shaped the same way,
   * so the subject rotates through the cast and avoids recent repeats.
   */
  function pickSideStorySubject(cast: string[]): string {
    const recent = new Set(sideStoryState().history.slice(-2).map((row: any) => row.subject).filter(Boolean))
    const fresh = shuffleOnce(cast.filter((id) => !recent.has(id)))
    return fresh[0] || shuffleOnce(cast.slice())[0] || cast[0]
  }

  /**
   * Seed resolution is a chain, not a switch: a topic the master typed wins,
   * then the web seam, then the local activity feed. Any link may be missing —
   * the feature must never be dead because one of them is.
   */
  async function resolveSideStorySeed(subject: string, manualTopic: string, signal?: AbortSignal): Promise<any | null> {
    const topic = typeof manualTopic === 'string' ? manualTopic.trim().slice(0, 60) : ''
    if (topic) {
      return { kind: 'manual', subject, summary: '主人提起：' + topic, hint: '', sources: [] }
    }
    if (ensurePreferences().sideStorySeedSource !== 'activity') {
      const fromWeb = await sideStoryWebSeed(subject, signal)
      if (fromWeb) return fromWeb
    }
    const local = sideStorySeed()
    return local ? { ...local, subject, sources: [] } : null
  }

  function sideStoryCastBrief(cast: string[]): string {
    return cast.map((id) => {
      const profile = effectiveProfileFor(id)
      return '- ' + id + '（' + profile.displayName + '）：' + profile.persona + ' 语气：' + profile.tone
    }).join('\n')
  }

  function sideStorySystemPrompt(cast: string[], subject: string, frame: string, twist: string): string {
    return '你是「深海女仆工坊」的小剧场编剧。工坊里的女仆们是同事关系，不是任何真实公司的代言人。\n'
      + '主人（玩家）此刻就在房间里，她们是当着主人的面聊天，可以直接对主人说话。\n'
      + '本场登场角色（只能用这些 id，不得出现其他角色）：\n' + sideStoryCastBrief(cast) + '\n'
      + '本场情境：' + frame + '。开场不要用「工坊里飘着一个说法」这类套话，直接从这个情境切入。\n'
      + '本场传闻的对象是 ' + effectiveProfileFor(subject).displayName + '，话题要落在她身上，别默认围着最先出场的人转。\n'
      + '本场的转折方式：' + twist + '。\n'
      + '写成三幕（acts），每幕都是几拍台词，前两幕结束时主人开口：\n'
      + '· 第一幕（起承）：从情境切入，把话题引到传闻上，当事人做出符合人设的反应。\n'
      + '· 第二幕（转）：按上面的转折方式让场面失控，笑点在这里。\n'
      + '· 第三幕（合）：收尾，只有台词，没有 choices。\n'
      + '角色之间必须真的在对话，这条最容易写砸：\n'
      + '1. 至少有两处是角色直接接另一个角色的话茬——点名、反驳、拆台、附和都行。\n'
      + '2. 不许写成每人轮流对着主人说一句话，那样她们等于没有互相看见。\n'
      + '3. 本场每一位角色都必须至少开口一次，配角不能只当背景板。\n'
      + '前两幕的 choices 是主人此刻开口说的话，每幕恰好三条：\n'
      + '1. 用主人的第一人称口吻直接写出要说的话，不超过 20 字。\n'
      + '2. 不得写成角色的台词，不得用第三人称谈论主人，不得写括号里的角色动作。\n'
      + '   「我帮你把 bug 抓出来」对；「主人最棒了（鲸鱼娘拍拍）」错，因为那是角色在说话。\n'
      + '3. 三条分别是：亲近安慰 / 中立打圆场 / 促狭补刀。补刀可以毒舌但要好笑，不能伤人。\n'
      + '4. 每条 choice 的 reply 是 1 到 2 拍，是角色对主人这句话的即时反应，说话人只能是本场角色或 narrator。\n'
      + '其余硬性要求：\n'
      + '1. 涉及外界评价时一律用「听说」「好像有人讲」这类传闻措辞，绝不断言为事实。\n'
      + '2. 基调轻松有趣，可以互相调侃，但不得刻薄、不得人身攻击、不得影射真实公司或真实个人。\n'
      + '3. 每拍不超过 ' + SIDE_STORY_BEAT_LIMIT + ' 字；三幕的台词合计不超过 ' + SIDE_STORY_MAX_BEATS + ' 拍。\n'
      + '4. choices 的 effects 只能包含本场角色 id，值只能是 1 或 -1，且至少影响两个角色。\n'
      + '严格只输出 JSON 对象，不要 Markdown、不要解释：\n'
      + '{"acts":[{"beats":[{"speaker":"narrator","text":"..."},{"speaker":"<id>","text":"...","emotion":"cheerful"}],'
      + '"choices":[{"text":"主人要说的话","effects":{"<id>":1,"<id>":-1},'
      + '"reply":[{"speaker":"<id>","text":"...","emotion":"shy"}]}]},'
      + '{"beats":[...],"choices":[...]},{"beats":[...]}]}\n'
      + 'emotion 只能取：' + EMOTION_KEYS.join('、') + '。speaker 只能是 narrator 或本场角色 id。'
  }

  /**
   * Recently played angles, handed to the model as something to avoid. A hard
   * "no fresh seed" gate would just make the button look broken when the master
   * has been working on one thing all day.
   */
  function recentSideStoryHint(): string {
    const recent = sideStoryState().history.slice(-3).map((row: any) => row.digest).filter(Boolean)
    if (!recent.length) return ''
    return '最近已经演过这些角度，这次换一个切入点：' + recent.join('；') + '\n'
  }

  async function generateSideStoryScene(seed: any, cast: string[], signal?: AbortSignal): Promise<any | null> {
    if (!llm) return null
    let sel: any = null
    try {
      const selection = Promise.resolve(pickModel())
      sel = signal ? await waitWithAbort(selection, signal, 'side story model selection aborted') : await selection
    } catch (err) {
      return null
    }
    if (!sel || !sel.model) return null
    // Rotate away from whatever the last couple of skits used, so two runs in a
    // row cannot open the same way.
    const recent = sideStoryState().history.slice(-2)
    const recentFrames = new Set(recent.map((row: any) => row.frame).filter(Boolean))
    const recentTwists = new Set(recent.map((row: any) => row.twist).filter(Boolean))
    const frame = shuffleOnce(SIDE_STORY_FRAMES.filter((row) => !recentFrames.has(row)))[0] || SIDE_STORY_FRAMES[0]
    // The twist is the comedic engine; repeating it two runs running is exactly
    // what makes the skits feel templated, so it rotates like the frame does.
    const twist = shuffleOnce(SIDE_STORY_TWISTS.filter((row) => !recentTwists.has(row)))[0] || SIDE_STORY_TWISTS[0]
    try {
      const effort = await pickEffort(sel, signal)
      const out = await streamText({
        provider: sel.provider,
        model: sel.model,
        reasoningEffort: effort,
        messages: [{
          role: 'user',
          content: [{ type: 'text', text: '今天工坊里流传的说法：' + seed.summary + '\n' + (seed.hint || '') + '\n' + recentSideStoryHint() + '请据此写这场小剧场。' }],
          source: { kind: 'user' },
        }],
        system: sideStorySystemPrompt(cast, seed.subject || cast[0], frame, twist),
        temperature: 0.9,
        // Three acts with two choice sets and their replies runs 2.5-4k tokens.
        // The old 1200 budget silently truncated the JSON mid-array, which
        // surfaced as an intermittent "generation-failed".
        maxTokens: 4000,
      }, signal)
      const match = out.match(/\{[\s\S]*\}/)
      if (!match) {
        lastSideStoryFailure = '模型没有返回 JSON（前 80 字：' + out.slice(0, 80) + '）'
        return null
      }
      let parsed: any
      try {
        parsed = JSON.parse(match[0])
      } catch (err: any) {
        lastSideStoryFailure = 'JSON 解析失败：' + (err && err.message ? err.message : String(err))
        return null
      }
      const scene = normalizeSideStoryScene({
        ...parsed,
        frame,
        twist,
        subject: seed.subject || cast[0],
        sources: seed.sources || [],
        id: makeId('side-story'),
        createdAt: Date.now(),
        seed: { kind: seed.kind, summary: seed.summary },
        cast,
        cursor: 0,
        settled: false,
      })
      if (!scene) {
        const acts = Array.isArray(parsed.acts) ? parsed.acts.length : 0
        const withChoices = Array.isArray(parsed.acts)
          ? parsed.acts.filter((act: any) => act && Array.isArray(act.choices) && act.choices.length === 3).length
          : 0
        lastSideStoryFailure = '剧本不合规范：acts=' + acts + '，含三选项的幕=' + withChoices
      }
      return scene
    } catch (err: any) {
      lastSideStoryFailure = '生成异常：' + (err && err.message ? err.message : String(err))
      console.error('whale-galgame side story gen failed:', err)
      return null
    }
  }

  /**
   * Applies one side-story choice across the cast. Each character moves by at
   * most a single step so a multi-character scene cannot outpace the main-line
   * affection curve.
   */
  /**
   * Archives the finished skit under its own log. It deliberately does NOT touch
   * any character's `chatLines`: the main dialogue box renders the tail of that
   * array, so writing here would replace the heroine's last line with a skit
   * beat the moment a skit ended.
   */
  function recordSideStoryTranscript(scene: any): void {
    const state = sideStoryState()
    const lines = scene.beats.map((beat: any) => {
      if (beat.speaker === 'narrator') return { who: 'narrator', name: '旁白', text: beat.text }
      if (beat.speaker === 'user') return { who: 'user', name: '主人', text: beat.text }
      return { who: 'heroine', name: effectiveProfileFor(beat.speaker).displayName, text: beat.text }
    })
    state.transcripts = [
      ...state.transcripts,
      {
        id: scene.id,
        at: Date.now(),
        seed: scene.seed.summary || '',
        cast: scene.cast.slice(),
        lines,
      },
    ].slice(-SIDE_STORY_TRANSCRIPT_LIMIT)
  }

  /** The interlude the master is standing in right now, if any. */
  function pendingSideStoryInterlude(scene: any): any | null {
    return (scene.interludes || []).find((row: any) => !row.consumed && row.at === scene.cursor) || null
  }

  /** Deterministic closing line, so the outcome is revealed after the fact rather than spoiled on the buttons. */
  function sideStoryOutcomeText(scene: any, effects: Record<string, number>): string {
    const closer = scene.cast
      .filter((id: string) => effects[id] > 0)
      .map((id: string) => effectiveProfileFor(id).displayName)
    const cooler = scene.cast
      .filter((id: string) => effects[id] < 0)
      .map((id: string) => effectiveProfileFor(id).displayName)
    const parts: string[] = []
    if (closer.length) parts.push(closer.join('、') + ' 好像更亲近了一点')
    if (cooler.length) parts.push(cooler.join('、') + ' 有点无语')
    return parts.length ? '（' + parts.join('；') + '。）' : '（大家各自散了。）'
  }

  /**
   * Settles one interlude: the master's line and the cast's answer are spliced
   * in where she spoke, later interludes shift by however many beats that added,
   * and the scene only closes once every interlude has been used.
   */
  function settleSideStoryChoice(scene: any, choice: any): { applied: boolean; leveled: string[] } {
    const interlude = pendingSideStoryInterlude(scene)
    if (!interlude) return { applied: false, leveled: [] }
    if (!choice || typeof choice.text !== 'string' || !choice.text) return { applied: false, leveled: [] }
    const effects = choice.effects || {}
    const leveled: string[] = []
    for (const id of scene.cast) {
      const delta = effects[id]
      if (delta !== 1 && delta !== -1) continue
      const c = s.characters[id]
      if (!c) continue
      c.affection = Math.max(0, c.affection + delta)
      // Side-story level-ups deliberately skip CG generation: a three-character
      // scene could otherwise trigger three image calls at once.
      if (checkLevelUp(id, c, { skipCg: true })) leveled.push(id)
      scene.applied[id] = (scene.applied[id] || 0) + delta
    }

    const inserted = [
      { speaker: 'user', text: choice.text },
      ...(choice.reply || []).map((beat: any) => ({ ...beat })),
    ]
    const at = interlude.at
    scene.beats = [...scene.beats.slice(0, at + 1), ...inserted, ...scene.beats.slice(at + 1)]
    interlude.consumed = true
    interlude.choices = []
    for (const row of scene.interludes) {
      if (row !== interlude && row.at > at) row.at += inserted.length
    }
    scene.cursor = at + 1

    if (scene.interludes.every((row: any) => row.consumed)) {
      scene.beats = [...scene.beats, { speaker: 'narrator', text: sideStoryOutcomeText(scene, scene.applied) }]
      scene.settled = true
      recordSideStoryTranscript(scene)
    }
    return { applied: true, leveled }
  }

  async function generateSideStoryFreeReply(scene: any, text: string, signal?: AbortSignal): Promise<any> {
    const neutral = {
      effects: {},
      reply: [{ speaker: scene.cast[0], text: '……主人这么说，我记住了。', emotion: 'serious' }],
    }
    if (!llm) return neutral
    let sel: any = null
    try {
      sel = await Promise.resolve(pickModel())
    } catch (err) {
      return neutral
    }
    if (!sel || !sel.model) return neutral
    try {
      const recap = scene.beats
        .filter((beat: any) => beat.speaker !== 'user')
        .map((beat: any) => (beat.speaker === 'narrator' ? '旁白' : effectiveProfileFor(beat.speaker).displayName) + '：' + beat.text)
        .join('\n')
      const out = await streamText({
        provider: sel.provider,
        model: sel.model,
        reasoningEffort: await pickEffort(sel, signal),
        messages: [{
          role: 'user',
          content: [{ type: 'text', text: '刚才这场小剧场：\n' + recap + '\n\n主人开口说：' + text + '\n请写出角色们的回应。' }],
          source: { kind: 'user' },
        }],
        system: '你是「深海女仆工坊」的小剧场编剧，正在续写结尾。\n'
          + '本场登场角色（只能用这些 id）：\n' + sideStoryCastBrief(scene.cast) + '\n'
          + '主人刚刚说了一句话，请写角色们对这句话的回应，并判断这句话让谁更亲近、让谁无语。\n'
          + '要求：reply 是 1 到 2 拍，说话人只能是本场角色或 narrator；每拍不超过 '
          + SIDE_STORY_BEAT_LIMIT + ' 字；基调轻松，不得刻薄或人身攻击。\n'
          + 'effects 只能包含本场角色 id，值只能是 1 或 -1；主人说得体贴就给 1，说得扎心就给 -1，'
          + '平淡的话可以留空。\n'
          + '严格只输出 JSON：{"effects":{"<id>":1},"reply":[{"speaker":"<id>","text":"...","emotion":"shy"}]}',
        temperature: 0.9,
        maxTokens: 500,
      }, signal)
      const match = out.match(/\{[\s\S]*\}/)
      if (!match) return neutral
      const parsed = JSON.parse(match[0])
      const effects: Record<string, number> = {}
      for (const id of scene.cast) {
        const value = parsed && parsed.effects ? parsed.effects[id] : undefined
        if (value === 1 || value === -1) effects[id] = value
      }
      const reply = (Array.isArray(parsed && parsed.reply) ? parsed.reply : [])
        .map((beat: any) => normalizeSideStoryBeat(beat))
        .filter((beat: any) => beat && beat.speaker !== 'user'
          && (beat.speaker === 'narrator' || scene.cast.indexOf(beat.speaker) >= 0))
        .slice(0, 2)
      return reply.length ? { effects, reply } : neutral
    } catch (err) {
      console.error('whale-galgame side story free reply failed:', err)
      return neutral
    }
  }


  /**
   * Group photo for a finished skit. Manually triggered from the archive rather
   * than fired on close: a three-character prompt is the least reliable thing
   * DashScope does here, and nobody wants a surprise image bill for every skit.
   */
  /**
   * Group photo for a finished skit. Manually triggered from the archive rather
   * than fired on close: a multi-character prompt is the least reliable thing
   * generated here, and nobody wants a surprise GPU bill for every skit.
   */
  async function generateSkitCg(skitId: string, cgId: string): Promise<void> {
    const record = findCg(cgId)
    if (!record) return
    const skit = sideStoryState().transcripts.find((row: any) => row.id === skitId)
    if (!skit) {
      record.status = 'failed'
      record.error = '找不到这场小剧场的记录'
      await save('global').catch(() => undefined)
      return
    }
    const who = skit.cast.map((id: string) => effectiveProfileFor(id).visual).filter(Boolean)
    const names = skit.cast.map((id: string) => effectiveProfileFor(id).displayName).join('、')
    const castTags = skit.cast
      .map((id: string) => visualCharacterFor(id).imageTags || '')
      .filter(Boolean)
    const zh = [
      '精美galgame风格合影CG插画，横向16:9构图，唯美光效，高清细节，无文字无边框',
      '同框 ' + skit.cast.length + ' 位角色，彼此有互动和眼神交流，不是各自站开',
      ...who.map((visual: string, index: number) => '角色' + (index + 1) + '：' + visual),
      '场景：深海女仆工坊，' + (skit.seed || '寻常的一天'),
      '气氛轻松愉快，像刚闹完一场的合影',
    ].join('，')
    const en = [
      'masterpiece, best quality, very aesthetic, absurdres, anime, multiple girls',
      'group illustration, ' + skit.cast.length + ' girls, interacting with each other, eye contact',
      'warm afternoon light, cozy deep-sea maid atelier interior, detailed background',
      ...castTags,
    ].join(', ')
    await renderCgFromPrompt(record, { zh, en, includeCharacter: false }, '合影 · ' + names)
  }

  async function generateCg(charId: string, level: number, cgId: string): Promise<void> {
    const record = findCg(cgId)
    if (!record) return
    let prompts: any = null
    try {
      const profile = effectiveProfileFor(charId)
      await refreshActivityCache()
      const scopedActivity = globalActivityCandidates()
      const theme = scopedActivity.length > 0 ? activityCgTheme(scopedActivity[0]) : ''
      prompts = {
        zh: [
          '精美galgame风格特殊CG插画，横向16:9桌面壁纸构图，唯美光效，高清细节，无文字无边框',
          '角色：' + profile.visual + '，表情幸福温柔',
          '场景：深海女仆工坊，烛光与月光',
          '等级 Lv.' + level + ' 的纪念CG',
          theme ? '画面元素呼应对方最近的经历与工作：' + theme : '温暖浪漫的日常氛围',
        ].join('，'),
        en: [
          'commemorative level-up illustration, happy gentle expression, looking at viewer',
          'cozy deep-sea maid atelier, candlelight and moonlight, warm romantic atmosphere',
          'cinematic lighting, detailed background, no text, no border',
        ].join(', '),
        includeCharacter: true,
      }
    } catch (err: any) {
      record.status = 'failed'
      record.dataUrl = null
      record.error = err && err.message ? err.message : String(err)
      await save('global').catch(() => undefined)
      return
    }
    await renderCgFromPrompt(record, prompts, '')
  }

  /**
   * Shared generation round-trip: two attempts, then persist whatever happened
   * onto the CG record. The prompt arrives in both languages because the
   * backends disagree about language: qwen-image reads Chinese prose happily,
   * while a ComfyUI checkpoint only understands English danbooru tags.
   */
  async function renderCgFromPrompt(record: any, prompts: any, label: string): Promise<void> {
    const bundle = typeof prompts === 'string'
      ? { zh: prompts, en: prompts, includeCharacter: false }
      : prompts
    try {
      let dataUrl: string | null = null
      let lastError: any = null
      for (let attempt = 0; attempt < 2 && !dataUrl; attempt++) {
        if (attempt > 0) await new Promise((r) => setTimeout(r, 8000))
        try {
          const generated = await generateImage({
            characterId: record.charId || (s && s.current) || 'deepseek',
            prompt: bundle.en,
            dashscopePrompt: bundle.zh,
            includeCharacter: bundle.includeCharacter !== false,
            width: 1280,
            height: 720,
            transparent: false,
            nsfw: record.nsfw === true,
            timeoutMs: 300000,
            prefix: 'whale_cg',
          })
          dataUrl = generated.dataUrl
          record.backend = generated.backend || null
        } catch (err) {
          lastError = err
        }
      }
      if (!dataUrl) throw lastError || new Error('generation failed')
      record.status = 'ready'
      record.dataUrl = dataUrl
      record.prompt = bundle.zh
      record.enPrompt = bundle.en
      record.error = null
    } catch (err: any) {
      record.status = 'failed'
      record.dataUrl = null
      record.error = err && err.message ? err.message : String(err)
    }
    if (label && record.status === 'ready') record.label = label
    const capturedRuntime = splitStorageActive() ? currentWorkspaceRuntime() : null
    try {
      await runSerializedStateTask(() => capturedRuntime
        ? workspaceStateContext.run(capturedRuntime, () => save('global'))
        : save('both'))
    } catch (err2) { /* ignore */ }
    // A CG that became ready while it is the current backdrop needs the client
    // to refetch it; the background revision is what triggers that refetch.
    if (record.status === 'ready' && s && s.bg === 'cg:' + record.id) {
      try { bumpBackgroundRevision() } catch (err) { /* ignore */ }
    }
  }


  // Automatic illustration bookkeeping. Kept per character so a fast chat that
  // hits the threshold on two roles does not open two GPU jobs at once.
  const autoIllustratePending = new Set<string>()
  const autoIllustrateAt = new Map<string, number>()
  const AUTO_ILLUSTRATE_COOLDOWN_MS = 10 * 60 * 1000

  /**
   * "画一张" in play: build one picture out of who is on stage and, when the LLM
   * is available, out of what was just said. The CG record already exists by the
   * time this runs, so a failure lands on the record instead of vanishing.
   */
  async function generateMomentCg(charId: string, cgId: string, opts: any = {}): Promise<void> {
    const record = findCg(cgId)
    if (!record) return
    const character = visualCharacterFor(charId)
    const profile = effectiveProfileFor(charId)
    const characterState = s && s.characters ? s.characters[charId] : null
    const recent = (characterState && Array.isArray(characterState.chatLines) ? characterState.chatLines : [])
      .filter((line: any) => line && typeof line.text === 'string' && line.text)
      .slice(-4)
      .map((line: any) => line.text)
      .join(' ')
    const hint = typeof opts.prompt === 'string' ? opts.prompt.trim() : ''
    let englishTags = hint
    if (!englishTags) {
      // Let the chat model read the last exchange and produce tags; without it
      // we still render, just with a generic candid-moment prompt.
      const suggested = await suggestImagePrompt(charId, recent ? 'inspired by this exchange: ' + recent.slice(0, 240) : '')
      englishTags = suggested || [
        'masterpiece, best quality, very aesthetic, absurdres, anime, 1girl, solo',
        'candid moment, gentle smile, looking at viewer',
        'cozy deep-sea maid atelier, soft window light, detailed background',
        character.imageTags || '',
      ].filter(Boolean).join(', ')
    }
    const chineseScene = hint
      || (profile.displayName + '在深海女仆工坊里的一段日常，柔和窗光，精致 galgame CG 构图，无文字无边框')
    await renderCgFromPrompt(
      record,
      { zh: chineseScene, en: englishTags, includeCharacter: true },
      typeof opts.label === 'string' ? opts.label : '',
    )
  }

  /**
   * Every-N-replies illustration. Off by default; the cooldown keeps a fast
   * conversation from turning into a queue of GPU jobs.
   */
  async function maybeAutoIllustrate(charId: string): Promise<void> {
    const every = Math.max(0, Math.floor(cfg.autoCgEveryRounds || 0))
    if (!every) return
    if (autoIllustratePending.has(charId)) return
    const characterState = s && s.characters ? s.characters[charId] : null
    if (!characterState) return
    const rounds = (characterState.chatLines || []).filter((line: any) => line && line.who === 'heroine').length
    if (!rounds || rounds % every !== 0) return
    const now = Date.now()
    if (now - (autoIllustrateAt.get(charId) || 0) < AUTO_ILLUSTRATE_COOLDOWN_MS) return
    autoIllustrateAt.set(charId, now)
    autoIllustratePending.add(charId)
    try {
      const status = await imageBackendStatus().catch(() => null)
      if (!status || status.resolved === 'off') { autoIllustratePending.delete(charId); return }
      await runSerializedStateTask(async () => {
        const cgId = makeId('cg')
        characterState.cgs.push({
          id: cgId,
          status: 'generating',
          dataUrl: null,
          prompt: null,
          charId,
          level: characterState.level || 1,
          at: Date.now(),
          seen: true,
          savedAsBg: false,
          error: null,
          nsfw: cfg.imageNsfwEnabled === true,
          label: '日常 · 第 ' + rounds + ' 轮',
          backend: '',
          enPrompt: '',
        })
        for (const item of allCgs()) item.savedAsBg = item.id === cgId
        s.bg = 'cg:' + cgId
        ensurePreferences().customBgName = ''
        bumpBackgroundRevision()
        claimGlobalValue('bg')
        await save('global')
        void generateMomentCg(charId, cgId, { label: '日常 · 第 ' + rounds + ' 轮' })
          .finally(() => autoIllustratePending.delete(charId))
      })
    } catch (err) {
      autoIllustratePending.delete(charId)
    }
  }

  /* ---- image generation ---------------------------------------------------
   * Four backends behind one interface, because they answer different questions:
   *
   *   comfyui   a ComfyUI instance, reached either directly over HTTP or through
   *             an ssh2 tunnel to a remote 127.0.0.1:8188. This is the only path
   *             that can render the whale-girl LoRA, so it is the only one whose
   *             output actually looks like the heroine.
   *   bridge    POST to the dsh-gal-ds generation bridge (python + paramiko +
   *             the same 仙宫云 box). Kept for people who already run it.
   *   dashscope qwen-image. Already shipped, no character LoRA, no alpha.
   *   off       generate nothing.
   *
   * The ComfyUI client speaks only the stock HTTP API (/prompt, /history/<id>,
   * /view, /upload/image), which is what makes one implementation cover a local
   * instance and a tunneled remote one.
   */

  // The whale-girl LoRA is trained on this exact tag block; dropping the trigger
  // words is the difference between "the heroine" and "some blue-haired maid".
  const IMAGE_WHALE_TAGS = [
    'masterpiece, best quality, very aesthetic, absurdres, anime, anime screencap',
    'deepseek_whale_girl, deepseek_maid_outfit, 1girl, solo',
    'blue hair, very long hair, gradient blue hair, wavy hair, bangs, ahoge',
    'blue eyes, whale fin ears, blue hair bows, white frilled maid headdress',
    'navy blue maid dress, white frilled apron, blue whale emblem, dark blue neck bow',
    'puff sleeves, gold trim, blue whale tail, starry tail pattern',
    'frilled thighhighs, white thighhighs, black mary janes',
  ].join(', ')
  const IMAGE_NEGATIVE = [
    'photorealistic, realistic, 3d, cgi, bad anatomy, bad hands, extra fingers',
    'deformed hands, missing fingers, extra limbs, missing limbs, low quality',
    'worst quality, blurry, watermark, text, signature, bad proportions, disfigured',
    'ugly, jpeg artifacts, monochrome, lowres, error, cropped, multiple views',
  ].join(', ')
  const IMAGE_STYLE_TAGS = 'masterpiece, best quality, very aesthetic, absurdres, anime, anime screencap, 1girl, solo, full body'

  let imageSshTunnel: { port: number; close: () => void; key: string } | null = null
  let imageRembgSupport: { baseUrl: string; ok: boolean } | null = null

  /** ssh config for the 仙宫云 box; the same file the dsh-gal-ds tools read. */
  function readSshConfig(): any | null {
    const candidates = [
      typeof process !== 'undefined' ? process.env.XG_CONFIG : '',
      cfg.sshConfigPath,
      dshHomePath ? join(dshHomePath(), '.dsh-ssh.json') : '',
    ].filter((row: any) => typeof row === 'string' && row)
    for (const path of candidates) {
      try {
        const parsed = JSON.parse(readFileSync(path, 'utf8'))
        const host = parsed && (parsed.host || (parsed.ssh && parsed.ssh.host))
        const password = parsed && (parsed.password || (parsed.ssh && parsed.ssh.password))
        const port = Number((parsed && (parsed.port || (parsed.ssh && parsed.ssh.port))) || 22)
        const user = (parsed && (parsed.user || (parsed.ssh && parsed.ssh.user))) || 'root'
        if (host && password) return { host, port, user, password, path }
      } catch (err) { /* try the next candidate */ }
    }
    return null
  }

  /** ssh2 is a native module, so it is loaded at runtime and never bundled. */
  async function loadSsh2(): Promise<any> {
    try {
      const specifier = 'ssh' + '2'
      return await import(specifier)
    } catch (err) {
      return null
    }
  }

  async function httpJson(url: string, init: any = {}, timeoutMs = 20000): Promise<any> {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })
    const text = await res.text().catch(() => '')
    let data: any = null
    try { data = text ? JSON.parse(text) : null } catch (err) { data = null }
    if (!res.ok) {
      const detail = data && data.error ? JSON.stringify(data.error).slice(0, 200) : text.slice(0, 200)
      throw new Error('HTTP ' + res.status + (detail ? ' · ' + detail : ''))
    }
    return data
  }

  /** Open (and cache) a local port forwarded to the remote ComfyUI. */
  async function ensureImageTunnel(): Promise<number> {
    const sshConfig = readSshConfig()
    if (!sshConfig) throw new Error('找不到仙宫云 SSH 配置（xg_config.json），无法隧道连接 ComfyUI')
    const key = sshConfig.host + ':' + sshConfig.port + '/' + sshConfig.user
    if (imageSshTunnel && imageSshTunnel.key === key) return imageSshTunnel.port
    if (imageSshTunnel) { try { imageSshTunnel.close() } catch (err) { /* ignore */ } imageSshTunnel = null }

    const ssh2 = await loadSsh2()
    if (!ssh2 || !ssh2.Client) throw new Error('缺少 ssh2 模块：无法建立 SSH 隧道（请安装 ssh2，或改用可直连的 ComfyUI 地址）')
    const Client = ssh2.Client
    const conn = new Client()
    await new Promise<void>((resolvePromise, rejectPromise) => {
      const timer = setTimeout(() => rejectPromise(new Error('SSH 连接超时：仙宫云实例可能已关机')), 25000)
      conn.on('ready', () => { clearTimeout(timer); resolvePromise() })
      conn.on('error', (err: any) => { clearTimeout(timer); rejectPromise(new Error('SSH 连接失败：' + (err && err.message ? err.message : String(err)))) })
      try {
        conn.connect({
          host: sshConfig.host,
          port: sshConfig.port,
          username: sshConfig.user,
          password: sshConfig.password,
          readyTimeout: 25000,
        })
      } catch (err: any) {
        clearTimeout(timer)
        rejectPromise(err)
      }
    })

    const server = createNetServer((socket) => {
      conn.forwardOut('127.0.0.1', 0, cfg.comfyRemoteHost, cfg.comfyRemotePort, (err: any, stream: any) => {
        if (err) { socket.destroy(); return }
        socket.pipe(stream).pipe(socket)
        stream.on('error', () => socket.destroy())
        socket.on('error', () => stream.destroy())
      })
    })
    const port = await new Promise<number>((resolvePromise, rejectPromise) => {
      server.once('error', rejectPromise)
      server.listen(0, '127.0.0.1', () => resolvePromise((server.address() as any).port))
    })
    imageSshTunnel = {
      port,
      key,
      close: () => {
        try { server.close() } catch (err) { /* ignore */ }
        try { conn.end() } catch (err) { /* ignore */ }
      },
    }
    return port
  }

  /**
   * A base URL that actually answers. Direct first (localhost / a publicly
   * reachable instance), then the tunnel, so a machine with both configured
   * prefers the cheaper path.
   */
  async function resolveComfyBaseUrl(force: boolean = false): Promise<{ baseUrl: string; transport: string }> {
    const direct = (cfg.comfyBaseUrl || '').replace(/\/$/, '')
    if (direct && !force) {
      try {
        await httpJson(direct + '/system_stats', {}, 4000)
        return { baseUrl: direct, transport: 'http' }
      } catch (err) { /* fall through to the tunnel */ }
    }
    const port = await ensureImageTunnel()
    const baseUrl = 'http://127.0.0.1:' + port
    await httpJson(baseUrl + '/system_stats', {}, 8000)
    return { baseUrl, transport: 'ssh' }
  }

  async function comfyHasRembg(baseUrl: string): Promise<boolean> {
    if (imageRembgSupport && imageRembgSupport.baseUrl === baseUrl) return imageRembgSupport.ok
    let ok = false
    try {
      const info = await httpJson(baseUrl + '/object_info/' + encodeURIComponent(cfg.comfyRembgNode), {}, 8000)
      ok = !!info && Object.keys(info).length > 0
    } catch (err) {
      ok = false
    }
    imageRembgSupport = { baseUrl, ok }
    return ok
  }

  /**
   * Stock ComfyUI graph, mirroring the dsh-gal-ds generator so the LoRA, the
   * rembg node ids and the sampler settings stay interchangeable.
   */
  function buildComfyWorkflow(opts: any): any {
    const wf: any = { '1': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: opts.ckpt } } }
    let previous = 1
    opts.loras.forEach((row: any, index: number) => {
      const id = String(2 + index)
      wf[id] = {
        class_type: 'LoraLoader',
        inputs: {
          lora_name: row.name,
          strength_model: row.weight,
          strength_clip: row.weight,
          model: [String(previous), 0],
          clip: [String(previous), 1],
        },
      }
      previous = 2 + index
    })
    const last = previous
    let positiveId: string
    let negativeId: string
    let latentId: string
    let samplerId: string
    let decodeId: string
    /**
     * IPAdapter：把参考图里的人"长相"注入模型，但构图仍按提示词走。
     * 用它的时候 latent 用空的（denoise 1.0），所以不会被参考图的姿势锁死。
     */
    if (opts.ipAdapterImage) {
      const load = String(last + 1)
      const apply = String(last + 2)
      positiveId = String(last + 3)
      negativeId = String(last + 4)
      latentId = String(last + 5)
      samplerId = String(last + 6)
      decodeId = String(last + 7)
      wf[load] = { class_type: 'LoadImage', inputs: { image: opts.ipAdapterImage } }
      wf[apply] = {
        class_type: 'easy ipadapterApply',
        inputs: {
          model: [String(last), 0],
          image: [load, 0],
          preset: opts.ipAdapterPreset || 'STANDARD (medium strength)',
          lora_strength: Number(opts.ipAdapterLoraStrength) || 0.6,
          provider: 'CUDA',
          weight: Number(opts.ipAdapterWeight) || 0.8,
          weight_faceidv2: 1,
          start_at: 0,
          end_at: 1,
          cache_mode: 'all',
          use_tiled: false,
        },
      }
      wf[latentId] = {
        class_type: 'EmptyLatentImage',
        inputs: { width: opts.width, height: opts.height, batch_size: 1 },
      }
      wf[positiveId] = { class_type: 'CLIPTextEncode', inputs: { text: opts.positive, clip: [String(last), 1] } }
      wf[negativeId] = { class_type: 'CLIPTextEncode', inputs: { text: opts.negative, clip: [String(last), 1] } }
      wf[samplerId] = {
        class_type: 'KSampler',
        inputs: {
          seed: opts.seed,
          steps: opts.steps,
          cfg: opts.cfg,
          sampler_name: opts.sampler,
          scheduler: opts.scheduler,
          denoise: 1,
          // 注意：模型从 IPAdapter 那一节点的输出取，不是原始 checkpoint。
          model: [apply, 0],
          positive: [positiveId, 0],
          negative: [negativeId, 0],
          latent_image: [latentId, 0],
        },
      }
      wf[decodeId] = { class_type: 'VAEDecode', inputs: { samples: [samplerId, 0], vae: ['1', 2] } }
      return finishWorkflow(wf, decodeId, opts)
    }
    if (opts.referenceImage) {
      const load = String(last + 1)
      const encode = String(last + 2)
      positiveId = String(last + 3)
      negativeId = String(last + 4)
      samplerId = String(last + 5)
      decodeId = String(last + 6)
      wf[load] = { class_type: 'LoadImage', inputs: { image: opts.referenceImage } }
      wf[encode] = { class_type: 'VAEEncode', inputs: { pixels: [load, 0], vae: ['1', 2] } }
      latentId = encode
    } else {
      positiveId = String(last + 1)
      negativeId = String(last + 2)
      latentId = String(last + 3)
      samplerId = String(last + 4)
      decodeId = String(last + 5)
      wf[latentId] = {
        class_type: 'EmptyLatentImage',
        inputs: { width: opts.width, height: opts.height, batch_size: 1 },
      }
    }
    wf[positiveId] = { class_type: 'CLIPTextEncode', inputs: { text: opts.positive, clip: [String(last), 1] } }
    wf[negativeId] = { class_type: 'CLIPTextEncode', inputs: { text: opts.negative, clip: [String(last), 1] } }
    wf[samplerId] = {
      class_type: 'KSampler',
      inputs: {
        seed: opts.seed,
        steps: opts.steps,
        cfg: opts.cfg,
        sampler_name: opts.sampler,
        scheduler: opts.scheduler,
        denoise: opts.denoise,
        model: [String(last), 0],
        positive: [positiveId, 0],
        negative: [negativeId, 0],
        latent_image: [latentId, 0],
      },
    }
    wf[decodeId] = { class_type: 'VAEDecode', inputs: { samples: [samplerId, 0], vae: ['1', 2] } }
    return finishWorkflow(wf, decodeId, opts)
  }

  /** 解码之后的收尾：去背（可选）与保存。 */
  function finishWorkflow(wf: any, decodeId: string, opts: any): any {
    const afterDecode = Number(decodeId) + 1
    if (opts.transparent) {
      wf[String(afterDecode)] = {
        class_type: cfg.comfyRembgNode,
        inputs: {
          images: [decodeId, 0],
          transparency: true,
          model: 'isnet-anime',
          post_processing: true,
          only_mask: false,
          alpha_matting: true,
          alpha_matting_foreground_threshold: 240,
          alpha_matting_background_threshold: 10,
          alpha_matting_erode_size: 10,
          background_color: 'none',
        },
      }
      wf[String(afterDecode + 1)] = {
        class_type: 'SaveImage',
        inputs: { filename_prefix: opts.prefix, images: [String(afterDecode), 0] },
      }
    } else {
      wf[String(afterDecode)] = {
        class_type: 'SaveImage',
        inputs: { filename_prefix: opts.prefix, images: [decodeId, 0] },
      }
    }
    return wf
  }

  async function comfyUploadReference(baseUrl: string, dataUrl: string): Promise<string> {
    const match = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(dataUrl)
    if (!match) throw new Error('参考图格式无法识别')
    const mime = match[1]
    const buffer = Buffer.from(match[2], 'base64')
    const ext = mime.includes('jpeg') ? 'jpg' : mime.includes('webp') ? 'webp' : 'png'
    const name = 'whale-ref-' + Date.now() + '.' + ext
    const form = new FormData()
    form.append('image', new Blob([buffer], { type: mime }), name)
    form.append('overwrite', 'true')
    const res = await fetch(baseUrl + '/upload/image', {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(60000),
    })
    if (!res.ok) throw new Error('参考图上传失败 HTTP ' + res.status)
    const data: any = await res.json().catch(() => ({}))
    const stored = data && typeof data.name === 'string' && data.name ? data.name : name
    return data && data.subfolder ? data.subfolder + '/' + stored : stored
  }

  function comfyExtractOutputs(entry: any): any[] {
    const rows: any[] = []
    const outputs = entry && entry.outputs ? entry.outputs : {}
    for (const nodeId of Object.keys(outputs)) {
      const images = outputs[nodeId] && Array.isArray(outputs[nodeId].images) ? outputs[nodeId].images : []
      for (const image of images) {
        if (image && typeof image.filename === 'string' && image.filename) {
          rows.push({ filename: image.filename, subfolder: typeof image.subfolder === 'string' ? image.subfolder : '' })
        }
      }
    }
    return rows
  }

  async function comfyGenerateImage(opts: any): Promise<any> {
    const { baseUrl, transport } = await resolveComfyBaseUrl()
    const transparent = opts.transparent === true
    if (transparent && !await comfyHasRembg(baseUrl)) {
      throw new Error('这台 ComfyUI 没有装 rembg 去背景节点（' + cfg.comfyRembgNode + '），无法生成透明立绘；可改用不透明背景')
    }
    let referenceImage = ''
    if (opts.referenceDataUrl) referenceImage = await comfyUploadReference(baseUrl, opts.referenceDataUrl)
    // 有参考图时优先走 IPAdapter：只取身份，姿势/构图仍按提示词。
    // VAEEncode 那条路会把参考图的站姿一起锁住（画出来永远是站着的立绘）。
    // 默认关闭：节点存在但实例上可能没有 ipadapter/clip_vision 模型文件，
    // 开着会让整条工作流失败。要用时在设置里把 comfyUseIpAdapter 打开。
    const useIpAdapter = !!referenceImage && (opts.useIpAdapter === true || cfg.comfyUseIpAdapter === true)
    const ipAdapterPreset = typeof opts.ipAdapterPreset === 'string' && opts.ipAdapterPreset
      ? opts.ipAdapterPreset
      : (cfg.comfyIpAdapterPreset || 'STANDARD (medium strength)')
    const workflow = buildComfyWorkflow({
      ckpt: opts.ckpt,
      loras: opts.loras,
      positive: opts.positive,
      negative: opts.negative,
      width: opts.width,
      height: opts.height,
      seed: opts.seed,
      steps: opts.steps,
      cfg: opts.cfg,
      sampler: opts.sampler,
      scheduler: opts.scheduler,
      denoise: referenceImage && !useIpAdapter ? opts.denoise : 1,
      transparent,
      referenceImage: useIpAdapter ? '' : referenceImage,
      ipAdapterImage: useIpAdapter ? referenceImage : '',
      ipAdapterPreset,
      ipAdapterWeight: Number(cfg.comfyIpAdapterWeight) || 0.8,
      ipAdapterLoraStrength: Number(cfg.comfyIpAdapterLoraStrength) || 0.6,
      prefix: opts.prefix,
    })
    const submitted = await httpJson(baseUrl + '/prompt', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: workflow, client_id: 'dsh-whale-galgame' }),
    }, 30000)
    const promptId = submitted && submitted.prompt_id
    if (!promptId) throw new Error('ComfyUI 没有返回 prompt_id（工作流可能被拒绝）')
    const deadline = Date.now() + Math.max(30000, opts.timeoutMs || 300000)
    let entry: any = null
    while (Date.now() < deadline && !entry) {
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 2500))
      try {
        const history = await httpJson(baseUrl + '/history/' + encodeURIComponent(promptId), {}, 20000)
        if (history && history[promptId]) entry = history[promptId]
      } catch (err) { /* keep polling */ }
    }
    if (!entry) throw new Error('ComfyUI 生成超时（' + Math.round((opts.timeoutMs || 300000) / 1000) + 's）')
    const outputs = comfyExtractOutputs(entry)
    if (!outputs.length) throw new Error('ComfyUI 没有输出图像')
    const first = outputs[0]
    const viewUrl = baseUrl + '/view?filename=' + encodeURIComponent(first.filename)
      + '&subfolder=' + encodeURIComponent(first.subfolder || '') + '&type=output'
    const imageRes = await fetch(viewUrl, { signal: AbortSignal.timeout(60000) })
    if (!imageRes.ok) throw new Error('取回生成图失败 HTTP ' + imageRes.status)
    const buffer = Buffer.from(await imageRes.arrayBuffer())
    const isPng = buffer.subarray(1, 4).toString('ascii') === 'PNG'
    return {
      dataUrl: 'data:image/' + (isPng ? 'png' : 'webp') + ';base64,' + buffer.toString('base64'),
      backend: 'comfyui',
      transport,
      filename: first.filename,
    }
  }

  async function bridgeGenerateImage(opts: any): Promise<any> {
    const data = await httpJson(cfg.bridgeUrl.replace(/\/$/, '') + '/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        prompt: opts.positive,
        width: opts.width,
        height: opts.height,
        transparent: opts.transparent === true,
        includeCharacter: opts.includeCharacter !== false,
        denoise: opts.referenceDataUrl ? opts.denoise : 1,
        referenceDataUrl: opts.referenceDataUrl || '',
        referenceFilename: opts.referenceDataUrl ? 'whale-ref.png' : '',
      }),
    }, 900000)
    if (!data || data.ok !== true || typeof data.dataUrl !== 'string') {
      throw new Error((data && data.error) || '生成桥返回失败')
    }
    return { dataUrl: data.dataUrl, backend: 'bridge', filename: data.filename || '' }
  }

  function agnesKey(): string {
    const fromConfig = typeof cfg.agnesApiKey === 'string' ? cfg.agnesApiKey.trim() : ''
    if (fromConfig) return fromConfig
    const fromEnv = typeof process !== 'undefined' && process.env ? process.env.AGNES_API_KEY : ''
    return typeof fromEnv === 'string' ? fromEnv.trim() : ''
  }

  /** Nearest ratio Agnes accepts for the requested pixel box. */
  function agnesRatio(width: number, height: number): string {
    const target = width / Math.max(1, height)
    const options: [string, number][] = [
      ['1:1', 1], ['3:4', 0.75], ['4:3', 4 / 3], ['2:3', 2 / 3], ['3:2', 1.5],
      ['16:9', 16 / 9], ['9:16', 9 / 16], ['21:9', 21 / 9],
    ]
    let best = options[0]
    for (const option of options) {
      if (Math.abs(option[1] - target) < Math.abs(best[1] - target)) best = option
    }
    return best[0]
  }

  async function agnesGenerateImage(opts: any): Promise<any> {
    const key = agnesKey()
    if (!key) throw new Error('agnesApiKey 未配置')
    const model = cfg.agnesModel || 'agnes-image-2.5-flash'
    const body: any = {
      model,
      prompt: opts.positive,
      // 2.5/2.1 take a tier + ratio; the 2.0 line takes explicit pixels.
      size: String(cfg.agnesSize || '1K'),
      ratio: agnesRatio(opts.width || 832, opts.height || 1216),
      return_base64: true,
    }
    if (/agnes-image-2\.[01]-flash/.test(model)) {
      body.size = (opts.width || 832) + 'x' + (opts.height || 1216)
      delete body.ratio
    }
    const res = await fetch(String(cfg.agnesBaseUrl || 'https://apihub.agnes-ai.com/v1').replace(/\/$/, '') + '/images/generations', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(300000),
    })
    const data: any = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg = data && data.error && (data.error.message || data.error.code)
        ? (data.error.message || data.error.code)
        : ('HTTP ' + res.status)
      throw new Error('Agnes: ' + msg)
    }
    const row = data && Array.isArray(data.data) ? data.data[0] : null
    if (!row) throw new Error('Agnes 未返回图片')
    if (row.b64_json) return { backend: 'agnes', dataUrl: 'data:image/png;base64,' + row.b64_json, model: model }
    if (row.url) {
      const image = await fetch(row.url, { signal: AbortSignal.timeout(120000) })
      if (!image.ok) throw new Error('Agnes 图片下载失败 HTTP ' + image.status)
      const bytes = Buffer.from(await image.arrayBuffer())
      return { backend: 'agnes', dataUrl: 'data:image/png;base64,' + bytes.toString('base64'), model: model }
    }
    throw new Error('Agnes 返回既无 b64 也无 url')
  }

  async function dashscopeGenerateImage(opts: any): Promise<any> {
    // qwen-image is a Chinese-capable general model, so it gets the prose prompt
    // when the caller supplied one; English danbooru tags would read worse to it.
    const promptText = typeof opts.dashscopePrompt === 'string' && opts.dashscopePrompt
      ? opts.dashscopePrompt
      : opts.positive
    const res = await fetch(cfg.dashscopeBaseUrl.replace(/\/$/, '') + '/api/v1/services/aigc/multimodal-generation/generation', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer ' + cfg.dashscopeApiKey,
      },
      body: JSON.stringify({
        model: cfg.dashscopeModel,
        input: { messages: [{ role: 'user', content: [{ text: promptText }] }] },
        parameters: { size: opts.width + '*' + opts.height },
      }),
      signal: AbortSignal.timeout(180000),
    })
    const data: any = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg = data && data.error && data.error.message ? data.error.message : ('HTTP ' + res.status)
      throw new Error(msg)
    }
    const content = data && data.output && data.output.choices && data.output.choices[0]
      && data.output.choices[0].message && data.output.choices[0].message.content
    const first = Array.isArray(content)
      ? content.find((block: any) => block && (typeof block.image === 'string' || typeof block.url === 'string'))
      : null
    const imageRef = first
      ? (typeof first.image === 'string' && first.image ? first.image : typeof first.url === 'string' ? first.url : null)
      : null
    if (!imageRef) throw new Error('DashScope 响应里没有图片')
    if (imageRef.startsWith('data:')) return { dataUrl: imageRef, backend: 'dashscope' }
    const img = await fetch(imageRef, { signal: AbortSignal.timeout(60000) })
    if (!img.ok) throw new Error('DashScope 图片下载失败 HTTP ' + img.status)
    const buffer = Buffer.from(await img.arrayBuffer())
    return { dataUrl: 'data:image/png;base64,' + buffer.toString('base64'), backend: 'dashscope' }
  }

  /** Which backend should serve the next request, honouring the configured one. */
  async function imageBackendStatus(): Promise<any> {
    const sshConfig = readSshConfig()
    // Agnes is a hosted API: the key is the whole prerequisite, so a light
    // check is enough and it costs nothing to run on every status poll.
    const agnesConfigured = !!agnesKey()
    const status: any = {
      configured: cfg.imageBackend,
      nsfw: cfg.imageNsfwEnabled === true,
      autoEveryRounds: Math.max(0, Math.floor(cfg.autoCgEveryRounds || 0)),
      sshConfigFound: !!sshConfig,
      sshTarget: sshConfig ? sshConfig.host + ':' + sshConfig.port : '',
      comfyBaseUrl: cfg.comfyBaseUrl,
      bridgeUrl: cfg.bridgeUrl,
      agnesModel: cfg.agnesModel || '',
      agnesKeyPresent: !!agnesKey(),
      backends: {},
    }
    // ComfyUI: direct first, then the tunnel.
    let comfy: any = { ok: false, detail: '' }
    try {
      const direct = (cfg.comfyBaseUrl || '').replace(/\/$/, '')
      if (direct) {
        const stats = await httpJson(direct + '/system_stats', {}, 4000)
        const device = stats && stats.devices && stats.devices[0] ? stats.devices[0] : {}
        comfy = {
          ok: true,
          transport: 'http',
          detail: '本地/直连 · ' + (device.name || 'GPU') + (device.vram_total ? ' · ' + Math.round(device.vram_total / 1048576) + 'MB' : ''),
          rembg: await comfyHasRembg(direct),
        }
      }
    } catch (err: any) {
      comfy = { ok: false, transport: 'http', detail: '直连不通：' + (err && err.message ? err.message : String(err)) }
    }
    if (!comfy.ok) {
      try {
        const port = await ensureImageTunnel()
        const baseUrl = 'http://127.0.0.1:' + port
        const stats = await httpJson(baseUrl + '/system_stats', {}, 8000)
        const device = stats && stats.devices && stats.devices[0] ? stats.devices[0] : {}
        comfy = {
          ok: true,
          transport: 'ssh',
          detail: 'SSH 隧道 · ' + (device.name || 'GPU') + (device.vram_total ? ' · ' + Math.round(device.vram_total / 1048576) + 'MB' : ''),
          rembg: await comfyHasRembg(baseUrl),
        }
      } catch (err: any) {
        comfy = {
          ...comfy,
          detail: comfy.detail + ' · 隧道不通：' + (err && err.message ? err.message : String(err)),
        }
      }
    }
    status.backends.comfyui = comfy

    let bridge: any = { ok: false, detail: '' }
    try {
      const health = await httpJson(cfg.bridgeUrl.replace(/\/$/, '') + '/health', {}, 3000)
      bridge = { ok: !!(health && health.ok), detail: health && health.ok ? '生成桥在线' : '生成桥无响应' }
    } catch (err: any) {
      bridge = { ok: false, detail: '生成桥未运行（在 dsh-gal-ds 里执行 python tools/dsh_gal_bridge.py --port 8765）' }
    }
    status.backends.bridge = bridge
    status.backends.agnes = {
      ok: agnesConfigured,
      detail: agnesConfigured ? '已配置 ' + (cfg.agnesModel || 'agnes-image-2.5-flash') : '未配置 agnesApiKey',
    }
    status.backends.dashscope = {
      ok: !!cfg.dashscopeApiKey,
      detail: cfg.dashscopeApiKey ? '已配置 ' + cfg.dashscopeModel : '未配置 dashscopeApiKey',
    }
    status.resolved = pickImageBackend(status.backends)
    return status
  }

  /** True when at least one configured backend can actually render. */
  async function imageBackendAvailable(): Promise<boolean> {
    const status = await imageBackendStatus().catch(() => null)
    return !!status && status.resolved !== 'off'
  }

  function pickImageBackend(backends: any): string {
    if (cfg.imageBackend === 'off') return 'off'
    if (cfg.imageBackend !== 'auto') {
      // Explicitly configured but unhealthy is still 'off': reporting the name
      // here would make the UI claim a backend it cannot actually use.
      return backends[cfg.imageBackend] && backends[cfg.imageBackend].ok ? cfg.imageBackend : 'off'
    }
    if (backends.comfyui && backends.comfyui.ok) return 'comfyui'
    if (backends.bridge && backends.bridge.ok) return 'bridge'
    if (backends.agnes && backends.agnes.ok) return 'agnes'
    if (backends.dashscope && backends.dashscope.ok) return 'dashscope'
    return 'off'
  }

  /**
   * One entry point for every caller. Returns a data URL or throws with a message
   * that names the broken leg, so the UI can show something actionable instead of
   * "生成失败".
   */
  /** 参考图缓存：立绘不大，读一次留着。 */
  const roleRefCache = new Map<string, string>()

  /**
   * 取某位角色的立绘参考图（data URL）。
   *
   * 图生图靠它把身材比例、服装细节锚住——只靠文字的话，同一个 LoRA
   * 也会画出忽胖忽瘦、领子每次都不一样的同一个人。
   */
  function roleRefDataUrl(charId: string): string {
    try {
      const character = s && s.characters ? s.characters[charId] : null
      const spriteKey = spriteKeyFor(charId, character)
      const cacheKey = charId + ':' + spriteKey
      if (roleRefCache.has(cacheKey)) return roleRefCache.get(cacheKey) as string
      const here = dirname(fileURLToPath(import.meta.url))
      const variantPath = resolveNativePath(here, '..', 'assets', 'refs', spriteKey + '.webp')
      const path = existsSync(variantPath) ? variantPath : resolveNativePath(here, '..', 'assets', 'refs', charId + '.webp')
      if (!existsSync(path)) return ''
      const dataUrl = 'data:image/webp;base64,' + readFileSync(path).toString('base64')
      roleRefCache.set(cacheKey, dataUrl)
      return dataUrl
    } catch (err) {
      return ''
    }
  }

  async function generateImage(opts: any): Promise<any> {
    const status = await imageBackendStatus().catch(() => null)
    const backend = status ? status.resolved : cfg.imageBackend
    if (backend === 'off') {
      throw new Error('没有可用的生图后端：ComfyUI 未连通、生成桥未运行、agnesApiKey 与 dashscopeApiKey 都未配置')
    }
    const charId = opts.characterId && ROSTER[opts.characterId] ? opts.characterId : (s && s.current) || 'deepseek'
    const character = visualCharacterFor(charId)
    const withCharacter = opts.includeCharacter !== false
    const userPrompt = typeof opts.prompt === 'string' ? opts.prompt.trim() : ''
    const nsfw = opts.nsfw === true || (cfg.imageNsfwEnabled === true && opts.nsfw !== false)
    // keepCharacterTags: 有角色时也带上她自己的 imageTags，prompt 只补构图/动作。
    // 不加这个，"按角色生成"会变成"随便一个女孩"——角色的发色、服装、设定全丢。
    const keepCharacterTags = opts.keepCharacterTags === true
    const styleTags = IMAGE_STYLE_TAGS
    const characterTags = character.imageTags || 'cute anime girl'
    let positive: string
    if (withCharacter && userPrompt && keepCharacterTags) {
      // 角色描述必须在最前面：夹在长场景描述中间会被模型整段忽略，
      // 生成出来就是"另一个黑发女孩"。实验对照见 _whale-tools/probe/identity-variants.jpg
      positive = characterTags + ', ' + styleTags + ', ' + userPrompt
    } else if (withCharacter && userPrompt) {
      positive = userPrompt
    } else if (withCharacter) {
      positive = styleTags + ', ' + characterTags
    } else {
      positive = userPrompt || styleTags
    }
    // Only the whale girl has a trained LoRA, so only she gets the trigger tags.
    if (withCharacter && charId === 'deepseek') positive = IMAGE_WHALE_TAGS + ', ' + positive
    const loras: any[] = []
    if (withCharacter) {
      // 先看她有没有专属 LoRA；没有就用共用的画风 LoRA。
      const own = ROLE_LORAS[charId] || (charId === 'deepseek' && cfg.comfyLora ? cfg.comfyLora : '')
      const weight = Number(cfg.comfyLoraWeight) || 0.8
      if (own) loras.push({ name: own, weight })
      else if (cfg.comfyCharacterLora) loras.push({ name: cfg.comfyCharacterLora, weight: Number(cfg.comfyCharacterLoraWeight) || 0.8 })
      else loras.push({ name: SHARED_CHARACTER_LORA, weight: 0.8 })
    }
    if (opts.lora) { loras.length = 0; loras.push({name: opts.lora, weight: Number.isFinite(Number(opts.loraWeight)) ? Number(opts.loraWeight) : 0.8}) }
    if (nsfw && cfg.comfyLoraNsfw) loras.push({ name: cfg.comfyLoraNsfw, weight: cfg.comfyLoraNsfwWeight })
    const request = {
      positive,
      negative: opts.negative || IMAGE_NEGATIVE,
      width: Math.max(256, Math.min(2048, Math.round(opts.width || 832))),
      height: Math.max(256, Math.min(2048, Math.round(opts.height || 1216))),
      transparent: opts.transparent === true,
      // 画角色时默认拿她的立绘当参考：denoise 太高会变成另一个人，太低就只是换背景。
      // 默认不用立绘当参考：图生图会把她的站姿一起锁住，出图动作发僵。
      // 身份靠角色 LoRA + 描述前置就够了；要参考图时显式打开。
      referenceDataUrl: typeof opts.referenceDataUrl === 'string' && opts.referenceDataUrl
        ? opts.referenceDataUrl
        : (withCharacter && (opts.useSpriteRef === true || cfg.comfyUseSpriteRef === true) ? roleRefDataUrl(charId) : ''),
      denoise: typeof opts.denoise === 'number' && opts.denoise > 0 && opts.denoise <= 1 ? opts.denoise : 0.6,
      includeCharacter: withCharacter,
      ckpt: opts.ckpt || cfg.comfyCkpt,
      loras,
      seed: Number.isInteger(opts.seed) && opts.seed >= 0 ? opts.seed : Math.floor(Math.random() * 0x7fffffff) + 1,
      // 画角色时特征容易被低步数/低 CFG 吃掉：带角色就抬到 16 步 / 3.5。
      steps: Number(opts.steps) > 0 ? Math.min(80, Number(opts.steps)) : withCharacter ? Math.max(16, Number(cfg.comfySteps) || 0) : cfg.comfySteps,
      cfg: Number(opts.cfg) > 0 ? Math.min(30, Number(opts.cfg)) : withCharacter ? Math.max(3.5, Number(cfg.comfyCfg) || 0) : cfg.comfyCfg,
      sampler: opts.sampler || cfg.comfySampler,
      scheduler: opts.scheduler || cfg.comfyScheduler,
      prefix: opts.prefix || 'whale_galgame',
      timeoutMs: opts.timeoutMs || 300000,
      dashscopePrompt: typeof opts.dashscopePrompt === 'string' ? opts.dashscopePrompt : '',
      nsfw,
    }
    const output = backend === 'comfyui' ? await comfyGenerateImage(request)
      : backend === 'bridge' ? await bridgeGenerateImage(request)
      : backend === 'agnes' ? await agnesGenerateImage(request) : await dashscopeGenerateImage(request)
    const { referenceDataUrl: omittedReference, ...generation } = request
    return { ...output, charId, nsfw, prompt: positive, generation: {
      width:generation.width,height:generation.height,seed:generation.seed,steps:generation.steps,cfg:generation.cfg,
      denoise:generation.denoise,includeCharacter:generation.includeCharacter,transparent:generation.transparent,
      ckpt:generation.ckpt,lora:opts.lora || '',loraWeight:Number.isFinite(Number(opts.loraWeight)) ? Number(opts.loraWeight) : 0.8,
      negative:generation.negative,sampler:generation.sampler,scheduler:generation.scheduler } }

  }

  /**
   * Ask the chat model for English danbooru-style tags describing one role.
   * ComfyUI checkpoints have no idea what a Chinese `<visual>` field means, so
   * this is what makes "按角色设定生成" produce the right person.
   */
  async function suggestImagePrompt(charId: string, hint: string): Promise<string> {
    const character = visualCharacterFor(charId)
    const profile = effectiveProfileFor(charId)
    if (!llm) return character.imageTags || ''
    try {
      const selection = await Promise.resolve(pickModel())
      if (!selection || !selection.model) return character.imageTags || ''
      const out = await streamText({
        provider: selection.provider,
        model: selection.model,
        messages: [{
          role: 'user',
          content: [{
            type: 'text',
            text: [
              'Convert the character below into ONE line of English danbooru-style image tags for an anime text-to-image model.',
              'Output tags only, comma separated, no explanation, no quotes, at most 60 tags.',
              'Always include: masterpiece, best quality, very aesthetic, absurdres, anime, 1girl, solo, full body, looking at viewer.',
              'Describe hair, eyes, outfit, accessories and pose. Never write any style prefixes like "anime style background".',
              'Character name: ' + profile.displayName,
              'Appearance (Chinese, translate the look into tags): ' + (character.visual || ''),
              'Personality (only to pick a fitting expression): ' + (character.persona || ''),
              hint ? 'Extra request from the user: ' + hint : '',
            ].filter(Boolean).join('\n'),
          }],
        }],
      })
      const text = String(out || '').replace(/^```[a-z]*|```$/g, '').trim()
      if (!text) return character.imageTags || ''
      return text.split('\n').map((row) => row.trim()).filter(Boolean)[0].slice(0, 900)
    } catch (err) {
      return character.imageTags || ''
    }
  }

  function resolveGlobalStorage(): any {    if (!globalStorage) {
      if (typeof dshHomePath !== 'function') throw new Error('whale-galgame DSH home path unavailable')
      const absolute = dshHomePath(...GLOBAL_SAVE_SEGMENTS)
      globalStorage = createNativeGlobalStorage(absolute, internals.nativeGlobalIo || DEFAULT_NATIVE_GLOBAL_IO)
    }
    return globalStorage
  }

  async function resolveWorkspaceTarget(runtime: any): Promise<any> {
    if (!runtime || !runtime.root) return null
    const target = runtime.target || await fs.resolve(SAVE_NAME, { cwd: runtime.root })
    runtime.target = target
    return target
  }

  function workspaceWriteFenceDenied(err: any): boolean {
    let current = err
    for (let depth = 0; current && depth < 5; depth += 1) {
      const message = String(current.message || current)
      if (/file access denied under workspace-write mode/i.test(message)) return true
      current = current.cause
    }
    return false
  }

  function resolveNativeWorkspaceStorage(runtime: any): any {
    if (!runtime || !runtime.root) {
      throw nativeGlobalError('WORKSPACE_STORAGE_PATH_INVALID', 'Galgame workspace runtime has no root')
    }
    if (runtime.nativeWorkspaceStorage) return runtime.nativeWorkspaceStorage
    const registeredRoot = registeredWorkspaceRoot(runtime.root)
    if (!registeredRoot || !sameWorkspace(registeredRoot, runtime.root)) {
      throw nativeGlobalError(
        'WORKSPACE_STORAGE_PATH_UNTRUSTED',
        'Galgame native workspace marker write requires a registered workspace root',
      )
    }
    runtime.nativeWorkspaceStorage = createNativeWorkspaceStorage(
      registeredRoot,
      internals.nativeWorkspaceIo || DEFAULT_NATIVE_GLOBAL_IO,
    )
    return runtime.nativeWorkspaceStorage
  }

  async function writeNativeWorkspaceState(runtime: any, content: string): Promise<any> {
    const storage = resolveNativeWorkspaceStorage(runtime)
    const info = await storage.stat()
    const expected: NativeWriteExpectation = info
      ? { kind: 'replaceIfVersion', version: info.version }
      : { kind: 'createIfAbsent' }
    return storage.writeText(content, expected)
  }

  async function observeWriteTarget(target: any): Promise<{ expected: any; before?: string | null }> {
    if (fs && typeof fs.stat === 'function') {
      const info = await fs.stat(target)
      if (!info) return { expected: { kind: 'createIfAbsent' } }
      if (info.version !== undefined && info.version !== null) {
        return { expected: { kind: 'replaceIfVersion', version: info.version } }
      }
    }
    // Compatibility with older DSH file services and the lightweight test
    // doubles: without versions, retain the small workspace file for rollback.
    try {
      return { expected: undefined, before: await fs.readText(target) }
    } catch (err) {
      if (isMissingFileError(err)) return { expected: undefined, before: null }
      throw err
    }
  }

  async function observeGlobalWrite(): Promise<{ expected: NativeWriteExpectation }> {
    const info = await resolveGlobalStorage().stat()
    return info
      ? { expected: { kind: 'replaceIfVersion', version: info.version } }
      : { expected: { kind: 'createIfAbsent' } }
  }

  function writeOutcomeBefore(outcome: any, observation: { before?: string | null }): string | null | undefined {
    if (outcome && Object.prototype.hasOwnProperty.call(outcome, 'before')) return outcome.before
    return observation.before
  }

  function rollbackWorkspaceText(previous: string | null | undefined): string {
    // The file service has no delete primitive. Replacing a just-created file
    // with the canonical empty state is semantically equivalent to restoring
    // its prior absence and remains valid on the next load.
    return previous === null || previous === undefined
      ? JSON.stringify(freshWorkspaceState())
      : previous
  }

  async function restoreSplitMemoryAfterFailedSave(runtime: any, previousWorkspace?: string | null): Promise<void> {
    const storage = resolveGlobalStorage()
    let restoredGlobal: any
    try {
      const parsed = JSON.parse(await storage.readText())
      restoredGlobal = hydrateGlobalState(parsed)
      if (!restoredGlobal) throw new Error('Galgame 全局存档版本或结构无法识别')
    } catch (err) {
      if (!isMissingFileError(err)) throw err
      restoredGlobal = freshGlobalState()
    }

    let workspaceText = previousWorkspace
    if (workspaceText === undefined && runtime && runtime.root) {
      const workspaceTarget = await resolveWorkspaceTarget(runtime)
      try {
        workspaceText = await fs.readText(workspaceTarget)
      } catch (err) {
        if (!isMissingFileError(err)) throw err
        workspaceText = null
      }
    }
    const restoredWorkspace = workspaceText === null || workspaceText === undefined
      ? freshWorkspaceState()
      : hydrateWorkspaceState(JSON.parse(workspaceText))
    if (!restoredWorkspace) throw new Error('Galgame 工作区存档版本或结构无法识别')

    replaceGlobalStateInPlace(restoredGlobal)
    replaceWorkspaceStateInPlace(runtime, restoredWorkspace)
  }

  async function writeGlobalState(content = JSON.stringify(globalState), expected?: any): Promise<any> {
    if (!globalState || !splitStorageActive()) return
    return resolveGlobalStorage().writeText(content, expected)
  }

  async function writeWorkspaceState(runtime: any, content = runtime ? JSON.stringify(runtime.state) : '', expected?: any): Promise<any> {
    if (!fs || !runtime || !runtime.root) return
    if (runtime.nativeWorkspaceStorage) return writeNativeWorkspaceState(runtime, content)
    const target = await resolveWorkspaceTarget(runtime)
    try {
      return await fs.writeText(target, content, expected)
    } catch (err) {
      if (!workspaceWriteFenceDenied(err)) throw err
      // ctx.fs is correctly refusing to use the launch workspace's write
      // authority for another registered root. Retry only the fixed marker
      // basename through the validated native adapter.
      return writeNativeWorkspaceState(runtime, content)
    }
  }

  async function writeSplitStateTransaction(runtime: any): Promise<void> {
    // A session-less global control has no durable workspace projection. Its
    // only commit is global, so there is no two-file transaction to perform.
    if (!runtime || !runtime.root) {
      await writeGlobalState()
      return
    }

    const workspaceTarget = await resolveWorkspaceTarget(runtime)
    const [workspaceObservation, globalObservation] = await Promise.all([
      observeWriteTarget(workspaceTarget),
      observeGlobalWrite(),
    ])
    const workspaceContent = JSON.stringify(runtime.state)
    const globalContent = JSON.stringify(globalState)
    let workspaceOutcome: any

    try {
      // Publish the small, workspace-local half first. If this fails, the
      // large shared asset store has not been touched at all.
      workspaceOutcome = await writeWorkspaceState(runtime, workspaceContent, workspaceObservation.expected)
    } catch (primaryError) {
      try {
        await restoreSplitMemoryAfterFailedSave(runtime)
      } catch (restoreError) {
        throw new AggregateError([primaryError, restoreError], 'Galgame 双存档保存失败，内存状态恢复也失败')
      }
      throw primaryError
    }

    const previousWorkspace = writeOutcomeBefore(workspaceOutcome, workspaceObservation)
    try {
      await writeGlobalState(globalContent, globalObservation.expected)
    } catch (primaryError) {
      let rollbackError: any = null
      try {
        const rollbackExpected = workspaceOutcome && workspaceOutcome.version !== undefined
          ? { kind: 'replaceIfVersion', version: workspaceOutcome.version }
          : undefined
        await fs.writeText(workspaceTarget, rollbackWorkspaceText(previousWorkspace), rollbackExpected)
      } catch (err) {
        rollbackError = err
      }
      let restoreError: any = null
      try {
        await restoreSplitMemoryAfterFailedSave(runtime, previousWorkspace)
      } catch (err) {
        restoreError = err
      }
      if (rollbackError || restoreError) {
        throw new AggregateError(
          [primaryError, rollbackError, restoreError].filter(Boolean),
          'Galgame 双存档保存失败，补偿回写未能完整恢复',
        )
      }
      throw primaryError
    }
  }

  async function save(scope: 'global' | 'workspace' | 'both' = 'both'): Promise<void> {
    if (!currentStateBacking()) throw new Error('whale-galgame state unavailable')
    try {
      if (splitStorageActive()) {
        // Global v2 owns every mutable game field. The workspace file is only
        // a migration/source marker and is written by ensureWorkspaceReady().
        // Preserve the old scope API so action code remains compatible while
        // ensuring a historical `save('workspace')` cannot lose global chat or
        // reply choices.
        await writeGlobalState()
        return
      }
      if (!fs) throw new Error('whale-galgame file service unavailable')
      const root = workspaceRoot()
      const target = await fs.resolve(SAVE_NAME, root ? { cwd: root } : undefined)
      await fs.writeText(target, JSON.stringify(currentStateBacking()), undefined, undefined)
    } catch (err) {
      console.error('whale-galgame save failed:', err)
      throw err
    }
  }

  function hydrateCharacter(src: any, legacyVersion: number, charId: string): any {
    const dst = emptyCharacter()
    if (!src || typeof src !== 'object') return dst
    if (typeof src.affection === 'number') {
      if (legacyVersion <= 3 && typeof src.level !== 'number' && src.affection >= 100) {
        dst.level = 2
        dst.affection = 0
      } else {
        dst.affection = clamp(src.affection)
      }
    }
    if (typeof src.level === 'number' && src.level >= 1) dst.level = Math.floor(src.level)
    if (src.traits && typeof src.traits === 'object') dst.traits = normalizeTraits(src.traits)
    if (Array.isArray(src.log)) dst.log = src.log.slice(-24)
    if (Array.isArray(src.chatLines)) {
      dst.chatLines = src.chatLines.map((line: any) => ({
        ...(line && typeof line === 'object' ? line : {}),
        who: line && line.who ? String(line.who) : 'narrator',
        text: line && typeof line.text === 'string' ? line.text : String(line && line.text ? line.text : ''),
      }))
    }
    if (Array.isArray(src.choices)) {
      dst.choices = src.choices
        .slice(0, CHOICE_INTENTS.length)
        .map((choice: any, index: number) => normalizeChoice(choice, index))
        .filter(Boolean)
    }
    if (Array.isArray(src.cgs)) {
      dst.cgs = src.cgs
        .map((cg: any, index: number) => normalizeCg(cg, '', index))
        .filter(Boolean)
    }
    dst.activity = normalizeActivityMemory(src.activity)
    if (src.customSprite && typeof src.customSprite === 'object') {
      const dataUrl = validCustomSprite(src.customSprite.dataUrl)
      const storedRevision = Number.isFinite(src.customSprite.revision) && src.customSprite.revision >= 0
        ? Math.floor(src.customSprite.revision)
        : 0
      dst.customSprite = {
        dataUrl,
        fileName: dataUrl ? shortSetting(src.customSprite.fileName).slice(0, 180) : '',
        revision: dataUrl ? Math.max(1, storedRevision) : storedRevision,
      }
    }
    if (typeof src.chosenBuiltinBackground === 'string') {
      const requestedBackground = shortSetting(src.chosenBuiltinBackground)
      if (builtinBackgroundOptions(charId).some((row: any) => row.key === requestedBackground)) {
        dst.chosenBuiltinBackground = requestedBackground
      }
    }
    if (typeof src.chosenSpriteVariant === 'string') {
      const requestedVariant = shortSetting(src.chosenSpriteVariant)
      // Anything no longer shipped (or a variant id that was renumbered) falls
      // back to the default instead of pinning a missing art key.
      if (builtinSpriteOptions(charId).some((row: any) => row.id === requestedVariant)) {
        dst.chosenSpriteVariant = requestedVariant
      }
    }
    dst.profileOverrides = normalizeProfileOverrides(src.profileOverrides)
    return dst
  }

  function hydrateCombinedData(data: any): { state: any; needsSave: boolean } | null {
    if (!data || typeof data !== 'object' || Array.isArray(data) || !data.characters
      || typeof data.characters !== 'object' || Array.isArray(data.characters)
      || !ROSTER_IDS.every((id) => data.characters[id] === undefined
        || (data.characters[id] && typeof data.characters[id] === 'object' && !Array.isArray(data.characters[id])))) return null
    const legacyVersion = typeof data.v === 'number' ? data.v : 2
    if (!Number.isInteger(legacyVersion) || legacyVersion < 2 || legacyVersion > SAVE_VERSION) return null
    let needsSave = legacyVersion !== SAVE_VERSION
    // A save from a shorter roster must be rewritten once the new roles have
    // their defaults, otherwise they only exist in memory until the next edit.
    if (rosterEntriesMissing(data.characters)) needsSave = true
    const state = fresh()
    state.personaSettings = normalizePersonaSettings(data.personaSettings)
    state.gal = restoreGalData(data.gal)
    state.backgroundRevision = backgroundRevisionFor(data.backgroundRevision)
    if (!validBackgroundRevision(data.backgroundRevision)) needsSave = true
    state.current = ROSTER[data.current] ? data.current : 'deepseek'
    state.lastCurrent = ROSTER[data.lastCurrent] ? data.lastCurrent : state.current
    for (const id of ROSTER_IDS) {
      state.characters[id] = hydrateCharacter(data.characters[id], legacyVersion, id)
      const storedOverrides = data.characters[id] && typeof data.characters[id] === 'object'
        ? data.characters[id].profileOverrides
        : undefined
      if (JSON.stringify(storedOverrides || {}) !== JSON.stringify(state.characters[id].profileOverrides)) {
        needsSave = true
      }
      for (const cg of state.characters[id].cgs) cg.charId = id
    }
    if (data.tokens && typeof data.tokens.bank === 'number') state.tokens.bank = Math.max(0, data.tokens.bank)
    if (data.tokens && typeof data.tokens.lastActiveAt === 'number') state.tokens.lastActiveAt = data.tokens.lastActiveAt
    if (data.preferences && typeof data.preferences === 'object') {
      state.preferences = normalizePreferences({ ...state.preferences, ...data.preferences })
      if (typeof state.preferences.customBgName === 'string') {
        state.preferences.customBgName = state.preferences.customBgName.slice(0, 180)
      }
    } else {
      state.preferences = normalizePreferences(state.preferences)
    }
    if (!data.preferences
      || typeof data.preferences.enabled !== 'boolean'
      || typeof data.preferences.characterMode !== 'string'
      || typeof data.preferences.chatMode !== 'string') needsSave = true
    state.modelOnline = data.modelOnline === true
    state.characterModelLabel = typeof data.characterModelLabel === 'string'
      ? data.characterModelLabel
      : typeof data.modelLabel === 'string' ? data.modelLabel : ''
    state.chatModelLabel = typeof data.chatModelLabel === 'string'
      ? data.chatModelLabel
      : typeof data.lastModel === 'string' ? data.lastModel : ''
    state.modelLabel = state.characterModelLabel
    state.lastModel = state.chatModelLabel
    state.fallbackUsed = data.fallbackUsed === true
    state.fallbackReason = typeof data.fallbackReason === 'string' ? data.fallbackReason : ''

    const findInState = (cgId: string): any => {
      for (const id of ROSTER_IDS) {
        const match = state.characters[id].cgs.find((cg: any) => cg && cg.id === cgId)
        if (match) return match
      }
      return null
    }
    const allInState = (): any[] => ROSTER_IDS.flatMap((id) => state.characters[id].cgs)
    if (data.cg && typeof data.cg === 'object' && typeof data.cg.cgId === 'string') {
      if (findInState(data.cg.cgId)) state.cg = { cgId: data.cg.cgId }
    } else if (data.cg && typeof data.cg === 'object') {
      const charId = ROSTER[data.cg.charId] ? data.cg.charId : 'deepseek'
      const legacyCg = normalizeCg(data.cg, charId, state.characters[charId].cgs.length)
      if (legacyCg) {
        if (!legacyCg.level) legacyCg.level = state.characters[charId].level
        if (!state.characters[charId].cgs.some((cg: any) => cg.id === legacyCg.id)) {
          state.characters[charId].cgs.push(legacyCg)
        }
        state.cg = { cgId: legacyCg.id }
      }
    }
    if (typeof data.bg === 'string') {
      if (data.bg.startsWith('cg:') && findInState(data.bg.slice(3))) {
        state.bg = data.bg
      } else if (data.bg.startsWith('data:')) {
        const matching = allInState().find((cg: any) => cg.dataUrl === data.bg)
        state.bg = matching ? 'cg:' + matching.id : validCustomBackground(data.bg)
      }
    }
    for (const cg of allInState()) {
      const safePrompt = sanitizeStoredCgPrompt(cg.prompt)
      if (safePrompt !== cg.prompt) {
        cg.prompt = safePrompt
        needsSave = true
      }
      if (cg.status === 'generating') {
        cg.status = 'failed'
        cg.error = '生成被重启打断，请重新触发'
        needsSave = true
      }
    }
    return { state, needsSave }
  }

  function globalStateFromCombined(combined: any): any {
    const next = freshGlobalState()
    next.current = ROSTER[combined.current] ? combined.current : 'deepseek'
    next.lastCurrent = ROSTER[combined.lastCurrent] ? combined.lastCurrent : next.current
    for (const id of ROSTER_IDS) {
      const source = combined.characters[id]
      next.characters[id] = hydrateCharacter(source, SAVE_VERSION, id)
    }
    next.tokens = normalizeGlobalTokens(combined.tokens)
    next.bg = combined.bg
    next.backgroundRevision = backgroundRevisionFor(combined.backgroundRevision)
    next.cg = combined.cg
    next.relationshipLastActiveAt = Math.max(
      0,
      Number(combined.relationshipLastActiveAt) || 0,
      Number(combined.tokens && combined.tokens.lastActiveAt) || 0,
    )
    next.activityFeed = normalizeActivityFeed(combined.activityFeed)
    next.sideStory = normalizeSideStory(combined.sideStory)
    next.personaSettings = normalizePersonaSettings(combined.personaSettings)
    next.gal = restoreGalData(combined.gal)
    next.preferences = normalizePreferences({ ...combined.preferences })
    next.modelOnline = combined.modelOnline === true
    next.characterModelLabel = typeof combined.characterModelLabel === 'string' ? combined.characterModelLabel : ''
    next.chatModelLabel = typeof combined.chatModelLabel === 'string' ? combined.chatModelLabel : ''
    next.modelLabel = next.characterModelLabel
    next.lastModel = next.chatModelLabel
    next.fallbackUsed = combined.fallbackUsed === true
    next.fallbackReason = typeof combined.fallbackReason === 'string' ? combined.fallbackReason : ''
    return next
  }

  function workspaceStateFromCombined(_combined: any, workspaceKey = ''): any {
    const next = freshWorkspaceState(workspaceKey)
    next.source.migratedAt = Date.now()
    return next
  }

  function hydrateGlobalState(data: any): any | null {
    const version = data && data.v
    if (!data || data.kind !== GLOBAL_SAVE_KIND
      || (version !== LEGACY_GLOBAL_SAVE_VERSION && version !== GLOBAL_SAVE_VERSION)
      || !data.characters || typeof data.characters !== 'object'
      || !storedRosterIds(data.characters).every((id) => typeof data.characters[id] === 'object')
      || !data.preferences || typeof data.preferences !== 'object'
      || !storedRosterIds(data.characters).every((id) => {
        const character = data.characters[id]
        return typeof character.affection === 'number'
          && typeof character.level === 'number'
          && Array.isArray(character.cgs)
          && character.customSprite && typeof character.customSprite === 'object'
          && character.profileOverrides && typeof character.profileOverrides === 'object'
      })
      || !(data.bg === null || data.bg === undefined || typeof data.bg === 'string')
      || !(data.cg === null || data.cg === undefined || typeof data.cg === 'object')) return null
    if (version === GLOBAL_SAVE_VERSION && (
      !storedRosterIds(data.characters).every((id) => Array.isArray(data.characters[id].log)
        && Array.isArray(data.characters[id].chatLines)
        && Array.isArray(data.characters[id].choices)
        && data.characters[id].activity && typeof data.characters[id].activity === 'object')
      || !data.tokens || typeof data.tokens !== 'object' || typeof data.tokens.bank !== 'number'
      || !Array.isArray(data.tokens.seenUsage)
      || !Array.isArray(data.activityFeed)
    )) return null
    const combined = fresh()
    combined.current = ROSTER[data.current] ? data.current : 'deepseek'
    combined.lastCurrent = ROSTER[data.lastCurrent] ? data.lastCurrent : combined.current
    for (const id of ROSTER_IDS) {
      combined.characters[id] = hydrateCharacter(data.characters[id], SAVE_VERSION, id)
      for (const cg of combined.characters[id].cgs) {
        cg.charId = id
        cg.prompt = sanitizeStoredCgPrompt(cg.prompt)
        if (cg.status === 'generating') {
          cg.status = 'failed'
          cg.error = '生成被重启打断，请重新触发'
        }
      }
    }
    combined.preferences = normalizePreferences({ ...combined.preferences, ...(data.preferences || {}) })
    combined.tokens = version === GLOBAL_SAVE_VERSION
      ? normalizeGlobalTokens(data.tokens)
      : normalizeGlobalTokens(null)
    combined.bg = typeof data.bg === 'string' ? data.bg : null
    combined.backgroundRevision = validBackgroundRevision(data.backgroundRevision)
      ? data.backgroundRevision
      : 1
    combined.cg = data.cg && typeof data.cg === 'object' && typeof data.cg.cgId === 'string'
      ? { cgId: data.cg.cgId }
      : null
    combined.activityFeed = version === GLOBAL_SAVE_VERSION ? normalizeActivityFeed(data.activityFeed) : []
    combined.sideStory = version === GLOBAL_SAVE_VERSION ? data.sideStory : null
    combined.personaSettings = normalizePersonaSettings(data.personaSettings)
    combined.gal = data.gal
    combined.modelOnline = data.modelOnline === true
    combined.characterModelLabel = typeof data.characterModelLabel === 'string' ? data.characterModelLabel : ''
    combined.chatModelLabel = typeof data.chatModelLabel === 'string' ? data.chatModelLabel : ''
    combined.fallbackUsed = data.fallbackUsed === true
    combined.fallbackReason = typeof data.fallbackReason === 'string' ? data.fallbackReason : ''
    const next = globalStateFromCombined(combined)
    next.relationshipLastActiveAt = Math.max(0, Number(data.relationshipLastActiveAt) || 0)
    next.migration = normalizeGlobalMigration(data.migration, next)
    return next
  }

  function hydrateWorkspaceState(data: any): any | null {
    if (!data || data.kind !== WORKSPACE_SAVE_KIND || data.v !== WORKSPACE_SAVE_VERSION
      || !data.source || typeof data.source !== 'object'
      || typeof data.source.workspaceKey !== 'string'
      || !Number.isFinite(data.source.migratedAt)) return null
    const next = freshWorkspaceState(data.source.workspaceKey)
    next.source.migratedAt = Math.max(0, Math.floor(data.source.migratedAt))
    return next
  }

  function hydrateLegacyWorkspaceState(data: any): any | null {
    if (!data || data.kind !== WORKSPACE_SAVE_KIND || data.v !== LEGACY_WORKSPACE_SAVE_VERSION
      || !data.characters || typeof data.characters !== 'object'
      || !storedRosterIds(data.characters).every((id) => {
        const character = data.characters[id]
        return character && typeof character === 'object'
          && Array.isArray(character.log)
          && Array.isArray(character.chatLines)
          && Array.isArray(character.choices)
          && character.activity && typeof character.activity === 'object'
      })
      || !data.tokens || typeof data.tokens !== 'object' || typeof data.tokens.bank !== 'number') return null
    const next = fresh()
    next.current = ROSTER[data.current] ? data.current : 'deepseek'
    next.lastCurrent = ROSTER[data.lastCurrent] ? data.lastCurrent : next.current
    if (data.tokens && typeof data.tokens.bank === 'number') next.tokens.bank = Math.max(0, data.tokens.bank)
    for (const id of ROSTER_IDS) {
      const hydrated = hydrateCharacter(data.characters[id], SAVE_VERSION, id)
      next.characters[id] = hydrated
    }
    next.modelOnline = data.modelOnline === true
    next.characterModelLabel = typeof data.characterModelLabel === 'string' ? data.characterModelLabel : ''
    next.chatModelLabel = typeof data.chatModelLabel === 'string' ? data.chatModelLabel : ''
    next.modelLabel = next.characterModelLabel
    next.lastModel = next.chatModelLabel
    next.fallbackUsed = data.fallbackUsed === true
    next.fallbackReason = typeof data.fallbackReason === 'string' ? data.fallbackReason : ''
    return next
  }

  function workspaceImportKey(root: string): string {
    const input = normalizedWorkspacePath(root)
    let hash = 2166136261
    for (let index = 0; index < input.length; index++) {
      hash ^= input.charCodeAt(index)
      hash = Math.imul(hash, 16777619)
    }
    return 'ws-' + (hash >>> 0).toString(16).padStart(8, '0')
  }

  function relationshipScore(character: any): number {
    const level = Math.max(1, Math.floor(Number(character && character.level) || 1))
    let score = Math.max(0, Number(character && character.affection) || 0)
    for (let current = 1; current < level; current++) score += affectionCap(current)
    return score
  }

  function mergeLegacyGlobal(combined: any, importKey: string): void {
    const migration = ensureGlobalMigrationState()
    const cgIdMap = new Map<string, string>()
    let backgroundChanged = false
    const profileClaims: Record<string, string[]> = migration.claims.profiles || {}
    const spriteClaims = new Set<string>(migration.claims.sprites || [])
    for (const id of ROSTER_IDS) {
      const source = combined.characters[id]
      const target = globalState.characters[id]
      if (!migration.claims.relationshipReset && relationshipScore(source) > relationshipScore(target)) {
        target.level = source.level
        target.affection = source.affection
      }
      const targetOverrides = normalizeProfileOverrides(target.profileOverrides)
      const sourceOverrides = normalizeProfileOverrides(source.profileOverrides)
      const claimedProfileFields = new Set<string>(profileClaims[id] || [])
      const nextOverrides = { ...targetOverrides }
      for (const field of PROFILE_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(targetOverrides, field)) claimedProfileFields.add(field)
        if (claimedProfileFields.has(field) || !Object.prototype.hasOwnProperty.call(sourceOverrides, field)) continue
        nextOverrides[field] = sourceOverrides[field]
        claimedProfileFields.add(field)
      }
      target.profileOverrides = nextOverrides
      profileClaims[id] = Array.from(claimedProfileFields)
      const sourceSprite = customSpriteFor(source)
      const targetSprite = customSpriteFor(target)
      // Sprite revisions were generated independently inside each old
      // workspace and therefore cannot be ordered across workspaces. An
      // established global sprite always wins; legacy art only fills a blank.
      if (!spriteClaims.has(id) && spriteRevisionFor(target) <= 0
        && sourceSprite && sourceSprite.dataUrl && (!targetSprite || !targetSprite.dataUrl)) {
        target.customSprite = sourceSprite
        spriteClaims.add(id)
      }
      if (!target.chosenBuiltinBackground && source.chosenBuiltinBackground) {
        target.chosenBuiltinBackground = source.chosenBuiltinBackground
        backgroundChanged = true
      }
      const existingIds = new Set(target.cgs.map((cg: any) => cg.id))
      for (const sourceCg of source.cgs) {
        let nextCg = sourceCg
        if (existingIds.has(sourceCg.id)) {
          const existing = target.cgs.find((cg: any) => cg.id === sourceCg.id)
          if (existing && existing.dataUrl === sourceCg.dataUrl) {
            existing.seen = existing.seen === true || sourceCg.seen === true
            cgIdMap.set(sourceCg.id, existing.id)
            continue
          }
          nextCg = { ...sourceCg, id: sourceCg.id + '-' + importKey }
        }
        existingIds.add(nextCg.id)
        target.cgs.push(nextCg)
        cgIdMap.set(sourceCg.id, nextCg.id)
      }
    }

    migration.claims.profiles = profileClaims
    migration.claims.sprites = Array.from(spriteClaims)

    const preferenceClaims = new Set<string>(migration.claims.preferences)
    const legacyPreferences = combined.preferences && typeof combined.preferences === 'object'
      ? combined.preferences
      : {}
    for (const field of GLOBAL_PREFERENCE_FIELDS) {
      if (preferenceClaims.has(field) || !Object.prototype.hasOwnProperty.call(legacyPreferences, field)) continue
      globalState.preferences[field] = legacyPreferences[field]
      preferenceClaims.add(field)
    }
    globalState.preferences = normalizePreferences(globalState.preferences)
    migration.claims.preferences = Array.from(preferenceClaims)

    const mappedLegacyCgId = combined.cg && typeof combined.cg.cgId === 'string'
      ? (cgIdMap.get(combined.cg.cgId) || combined.cg.cgId)
      : ''
    if (!migration.claims.cg && !globalState.cg && mappedLegacyCgId && findGlobalCg(mappedLegacyCgId)) {
      globalState.cg = { cgId: mappedLegacyCgId }
      migration.claims.cg = true
    }
    let legacyBg = typeof combined.bg === 'string' ? combined.bg : null
    if (legacyBg && legacyBg.startsWith('cg:')) {
      const sourceId = legacyBg.slice(3)
      const mappedId = cgIdMap.get(sourceId) || sourceId
      legacyBg = findGlobalCg(mappedId) ? 'cg:' + mappedId : null
    }
    if (!migration.claims.bg && !globalState.bg && legacyBg) {
      globalState.bg = legacyBg
      migration.claims.bg = true
      backgroundChanged = true
    }
    if (backgroundChanged) {
      const importedRevision = backgroundRevisionFor(combined.backgroundRevision)
      const baseline = Math.max(backgroundRevisionFor(globalState.backgroundRevision), importedRevision)
      globalState.backgroundRevision = nextBackgroundRevision(baseline)
    }
    globalState.relationshipLastActiveAt = Math.max(
      0,
      Number(globalState.relationshipLastActiveAt) || 0,
      Number(combined.tokens && combined.tokens.lastActiveAt) || 0,
    )
    if (!migration.imports.includes(importKey)) migration.imports.push(importKey)
  }

  function conversationEntryKey(value: any): string {
    if (!value || typeof value !== 'object') return JSON.stringify(value)
    const copy: any = {}
    for (const key of Object.keys(value).sort()) copy[key] = value[key]
    return JSON.stringify(copy)
  }

  function mergeConversationSequence(target: any[], source: any[], limit = 0): any[] {
    const left = Array.isArray(target) ? target : []
    const right = Array.isArray(source) ? source : []
    let commonPrefix = 0
    while (commonPrefix < left.length && commonPrefix < right.length
      && conversationEntryKey(left[commonPrefix]) === conversationEntryKey(right[commonPrefix])) {
      commonPrefix += 1
    }
    const merged = commonPrefix === right.length
      ? left.slice()
      : [...left, ...right.slice(commonPrefix)]
    return limit > 0 && merged.length > limit ? merged.slice(-limit) : merged
  }

  function mergeLegacyContext(combined: any, importKey: string): boolean {
    const migration = ensureGlobalMigrationState()
    if (!migration || migration.contextImports.includes(importKey)) return false
    const firstContext = migration.contextImports.length === 0
    if (firstContext) {
      globalState.current = ROSTER[combined.current] ? combined.current : globalState.current
      globalState.lastCurrent = ROSTER[combined.lastCurrent] ? combined.lastCurrent : globalState.current
      globalState.modelOnline = combined.modelOnline === true
      globalState.characterModelLabel = typeof combined.characterModelLabel === 'string' ? combined.characterModelLabel : ''
      globalState.chatModelLabel = typeof combined.chatModelLabel === 'string' ? combined.chatModelLabel : ''
      globalState.modelLabel = globalState.characterModelLabel
      globalState.lastModel = globalState.chatModelLabel
      globalState.fallbackUsed = combined.fallbackUsed === true
      globalState.fallbackReason = typeof combined.fallbackReason === 'string' ? combined.fallbackReason : ''
    }
    globalState.tokens = normalizeGlobalTokens(globalState.tokens)
    const importedBank = combined.tokens && typeof combined.tokens.bank === 'number'
      ? Math.max(0, combined.tokens.bank)
      : 0
    globalState.tokens.bank += importedBank
    for (const id of ROSTER_IDS) {
      const source = combined.characters && combined.characters[id]
      const target = globalState.characters && globalState.characters[id]
      if (!source || !target) continue
      target.log = mergeConversationSequence(target.log, source.log, 24)
      target.chatLines = mergeConversationSequence(target.chatLines, source.chatLines)
      if ((!Array.isArray(target.choices) || target.choices.length === 0)
        && Array.isArray(source.choices) && source.choices.length > 0) {
        target.choices = source.choices
          .slice(0, CHOICE_INTENTS.length)
          .map((choice: any, index: number) => normalizeChoice(choice, index))
          .filter(Boolean)
      }
      const targetActivity = normalizeActivityMemory(target.activity)
      const sourceActivity = normalizeActivityMemory(source.activity)
      target.activity = {
        seen: Array.from(new Set([...targetActivity.seen, ...sourceActivity.seen])).slice(-256),
        lastMentionedAt: Math.max(targetActivity.lastMentionedAt, sourceActivity.lastMentionedAt),
      }
    }
    migration.contextImports.push(importKey)
    return true
  }

  async function load(): Promise<string | null> {
    if (splitStorageActive()) {
      await ensureGlobalReady()
      return null
    }
    if (!fs) return null
    try {
      const root = workspaceRoot()
      const target = await fs.resolve(SAVE_NAME, root ? { cwd: root } : undefined)
      const txt = await fs.readText(target)
      const data = JSON.parse(txt)
      if (!data || !data.characters) return null
      const legacyVersion = typeof data.v === 'number' ? data.v : 2
      let needsSave = legacyVersion !== SAVE_VERSION
      if (rosterEntriesMissing(data.characters)) needsSave = true
      legacyState = fresh()
      s.gal = restoreGalData(data.gal)
      s.backgroundRevision = validBackgroundRevision(data.backgroundRevision)
        ? data.backgroundRevision
        : 1
      if (!validBackgroundRevision(data.backgroundRevision)) needsSave = true
      s.current = ROSTER[data.current] ? data.current : 'deepseek'
      s.lastCurrent = ROSTER[data.lastCurrent] ? data.lastCurrent : s.current
      for (const id of ROSTER_IDS) {
        s.characters[id] = hydrateCharacter(data.characters[id], legacyVersion, id)
        const storedOverrides = data.characters[id] && typeof data.characters[id] === 'object'
          ? data.characters[id].profileOverrides
          : undefined
        if (JSON.stringify(storedOverrides || {}) !== JSON.stringify(s.characters[id].profileOverrides)) {
          needsSave = true
        }
        for (const cg of s.characters[id].cgs) cg.charId = id
      }
      if (data.tokens && typeof data.tokens.bank === 'number') s.tokens.bank = Math.max(0, data.tokens.bank)
      if (data.tokens && typeof data.tokens.lastActiveAt === 'number') s.tokens.lastActiveAt = data.tokens.lastActiveAt
      if (data.preferences && typeof data.preferences === 'object') {
        s.preferences.petEnabled = data.preferences.petEnabled !== false
        if (typeof data.preferences.enabled === 'boolean') s.preferences.enabled = data.preferences.enabled
        if (typeof data.preferences.characterMode === 'string') s.preferences.characterMode = data.preferences.characterMode
        if (typeof data.preferences.characterId === 'string' || data.preferences.characterId === null) {
          s.preferences.characterId = data.preferences.characterId
        }
        if (typeof data.preferences.characterProvider === 'string') s.preferences.characterProvider = data.preferences.characterProvider
        if (typeof data.preferences.characterModel === 'string') s.preferences.characterModel = data.preferences.characterModel
        if (typeof data.preferences.chatMode === 'string') s.preferences.chatMode = data.preferences.chatMode
        if (typeof data.preferences.chatProvider === 'string') s.preferences.chatProvider = data.preferences.chatProvider
        if (typeof data.preferences.chatModel === 'string') s.preferences.chatModel = data.preferences.chatModel
        if (typeof data.preferences.customBgName === 'string') s.preferences.customBgName = data.preferences.customBgName.slice(0, 180)
      }
      ensurePreferences()
      if (!data.preferences
        || typeof data.preferences.enabled !== 'boolean'
        || typeof data.preferences.characterMode !== 'string'
        || typeof data.preferences.chatMode !== 'string') needsSave = true
      s.modelOnline = data.modelOnline === true
      s.characterModelLabel = typeof data.characterModelLabel === 'string'
        ? data.characterModelLabel
        : typeof data.modelLabel === 'string' ? data.modelLabel : ''
      s.chatModelLabel = typeof data.chatModelLabel === 'string'
        ? data.chatModelLabel
        : typeof data.lastModel === 'string' ? data.lastModel : ''
      s.modelLabel = s.characterModelLabel
      s.lastModel = s.chatModelLabel
      s.fallbackUsed = data.fallbackUsed === true
      s.fallbackReason = typeof data.fallbackReason === 'string' ? data.fallbackReason : ''

      // v4 and earlier kept one full CG object at the root. Import it once
      // into its owner's gallery and retain only its ID at the root.
      if (data.cg && typeof data.cg === 'object' && typeof data.cg.cgId === 'string') {
        if (findCg(data.cg.cgId)) s.cg = { cgId: data.cg.cgId }
      } else if (data.cg && typeof data.cg === 'object') {
        const charId = ROSTER[data.cg.charId] ? data.cg.charId : 'deepseek'
        const legacyCg = normalizeCg(data.cg, charId, s.characters[charId].cgs.length)
        if (legacyCg) {
          if (!legacyCg.level) legacyCg.level = s.characters[charId].level
          if (!s.characters[charId].cgs.some((cg: any) => cg.id === legacyCg.id)) {
            s.characters[charId].cgs.push(legacyCg)
          }
          s.cg = { cgId: legacyCg.id }
        }
      }

      if (typeof data.bg === 'string') {
        if (data.bg.startsWith('cg:') && findCg(data.bg.slice(3))) {
          s.bg = data.bg
        } else if (data.bg.startsWith('data:')) {
          const matching = allCgs().find((cg: any) => cg.dataUrl === data.bg)
          s.bg = matching ? 'cg:' + matching.id : data.bg
        }
      }

      // An in-flight HTTP request cannot survive a host restart.
      for (const cg of allCgs()) {
        const safePrompt = sanitizeStoredCgPrompt(cg.prompt)
        if (safePrompt !== cg.prompt) {
          cg.prompt = safePrompt
          needsSave = true
        }
        if (cg.status === 'generating') {
          cg.status = 'failed'
          cg.error = '生成被重启打断，请重新触发'
          needsSave = true
        }
      }
      if (needsSave) await save()
      return null
    } catch (err) { return null }
  }

  function isMissingFileError(err: any): boolean {
    let current = err
    for (let depth = 0; current && depth < 5; depth += 1) {
      const code = String(current.code || '').toUpperCase()
      if (code === 'ENOENT' || code === 'ENOTDIR'
        || code === 'FS_NOT_FOUND' || code === 'FS_NOT_DIRECTORY') return true
      current = current.cause
    }
    const message = String(err && err.message || err || '')
    return /\bENOENT\b|\bENOTDIR\b|(?:cannot (?:read|stat|resolve) .*:\s*)?not found\b|找不到指定的文件/i.test(message)
  }

  async function readOptionalSaveText(target: any): Promise<string | null> {
    if (!fs) throw new Error('whale-galgame file service unavailable')
    if (typeof fs.stat === 'function') {
      try {
        const info = await fs.stat(target)
        if (!info) return null
      } catch (err) {
        if (isMissingFileError(err)) return null
        throw err
      }
    }
    try {
      return await fs.readText(target)
    } catch (err) {
      if (isMissingFileError(err)) return null
      throw err
    }
  }

  async function ensureGlobalReady(): Promise<void> {
    if (!splitStorageActive()) return
    if (globalReadyError) throw globalReadyError
    if (!globalReadyPromise) {
      globalReadyPromise = (async () => {
        let storage: any
        try {
          storage = resolveGlobalStorage()
        } catch (err) {
          throw new Error('Galgame 全局存档路径解析失败；为避免覆盖原文件，已停止加载。', { cause: err })
        }
        let text: string | null
        try {
          const info = await storage.stat()
          text = info ? await storage.readText() : null
        } catch (err) {
          throw new Error('Galgame 全局存档读取失败；为避免覆盖原文件，已停止加载。', { cause: err })
        }
        if (text === null) {
          globalState = freshGlobalState()
          return
        }
        let parsed: any
        try {
          parsed = JSON.parse(text)
        } catch (err) {
          throw new Error('Galgame 全局存档 JSON 已损坏；为避免覆盖原文件，已停止加载。', { cause: err })
        }
        const hydrated = hydrateGlobalState(parsed)
        if (!hydrated) {
          throw new Error('Galgame 全局存档版本或结构无法识别；为避免覆盖原文件，已停止加载。')
        }
        globalState = hydrated
        if (parsed.v !== GLOBAL_SAVE_VERSION || !validBackgroundRevision(parsed.backgroundRevision)) {
          // Global v2 moves the complete game timeline and token ledger into
          // one durable save. Persist the in-memory upgrade before any
          // workspace projection is rewritten.
          await writeGlobalState()
        } else if (rosterEntriesMissing(parsed.characters)) {
          // The save predates roles this build ships. hydrateGlobalState has
          // already merged their defaults, so write them back now: a later
          // global write is not guaranteed to happen before the UI reads them.
          await writeGlobalState()
        }
      })().catch((err) => {
        // Fatal load errors stay latched for this plugin lifetime. Retrying a
        // corrupt/unknown file as a fresh install could overwrite evidence.
        globalReadyError = err
        throw err
      })
    }
    await globalReadyPromise
  }

  async function ensureWorkspaceReady(root: string, key: string): Promise<any> {
    await ensureGlobalReady()
    const existing = workspaceRuntimes.get(key)
    if (existing) {
      if (existing.readyPromise) await existing.readyPromise
      return existing
    }
    const runtime = makeWorkspaceRuntime(root, key)
    workspaceRuntimes.set(key, runtime)
    runtime.readyPromise = (async () => {
      if (!root || !fs) return
      let target: any
      try {
        target = await fs.resolve(SAVE_NAME, { cwd: root })
      } catch (err) {
        if (isMissingFileError(err)) return
        throw new Error('Galgame 工作区存档路径解析失败；此次请求未修改任何存档。', { cause: err })
      }
      runtime.target = target
      let text: string | null
      try {
        text = await readOptionalSaveText(target)
      } catch (err) {
        throw new Error('Galgame 工作区存档读取失败；此次请求未修改任何存档。', { cause: err })
      }
      if (text === null) return
      let data: any
      try {
        data = JSON.parse(text)
      } catch (err) {
        throw new Error('Galgame 工作区存档 JSON 已损坏；此次请求未修改任何存档。', { cause: err })
      }
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('Galgame 工作区存档结构无法识别；此次请求未修改任何存档。')
      }
      if (Object.prototype.hasOwnProperty.call(data, 'kind')) {
        if (data.kind !== WORKSPACE_SAVE_KIND
          || (data.v !== LEGACY_WORKSPACE_SAVE_VERSION && data.v !== WORKSPACE_SAVE_VERSION)) {
          throw new Error('Galgame 工作区存档 kind 或版本无法识别；此次请求未修改任何存档。')
        }
        if (data.v === WORKSPACE_SAVE_VERSION) {
          const local = hydrateWorkspaceState(data)
          if (!local) {
            throw new Error('Galgame 工作区存档结构无法识别；此次请求未修改任何存档。')
          }
          runtime.state = local
          runtime.facade = composeState(globalState, local)
          return
        }
        const legacyLocal = hydrateLegacyWorkspaceState(data)
        if (!legacyLocal) {
          throw new Error('Galgame 工作区存档结构无法识别；此次请求未修改任何存档。')
        }
        const importKey = workspaceImportKey(root)
        await runSerializedStateTask(async () => {
          const rollback = JSON.parse(JSON.stringify(globalState))
          try {
            if (mergeLegacyContext(legacyLocal, importKey)) await writeGlobalState()
          } catch (err) {
            replaceGlobalStateInPlace(rollback)
            throw err
          }
        })
        runtime.state = workspaceStateFromCombined(legacyLocal, importKey)
        runtime.facade = composeState(globalState, runtime.state)
        await writeWorkspaceState(runtime)
        return
      }
      const legacy = hydrateCombinedData(data)
      if (!legacy) {
        throw new Error('Galgame 旧版工作区存档版本或结构无法识别；此次请求未修改任何存档。')
      }
      const importKey = workspaceImportKey(root)
      await runSerializedStateTask(async () => {
        const migration = ensureGlobalMigrationState()
        const needsAssets = !migration.imports.includes(importKey)
        const needsContext = !migration.contextImports.includes(importKey)
        if (!needsAssets && !needsContext) return
        const rollback = JSON.parse(JSON.stringify(globalState))
        try {
          if (needsAssets) {
            mergeLegacyGlobal(legacy.state, importKey)
          }
          if (needsContext) mergeLegacyContext(legacy.state, importKey)
          // Commit the complete global game before replacing the only legacy
          // copy. Both import markers make a retry idempotent.
          await writeGlobalState()
        } catch (err) {
          replaceGlobalStateInPlace(rollback)
          throw err
        }
      })
      runtime.state = workspaceStateFromCombined(legacy.state, importKey)
      runtime.facade = composeState(globalState, runtime.state)
      await writeWorkspaceState(runtime)
    })().catch((err: any) => {
      workspaceRuntimes.delete(key)
      throw err
    }).finally(() => {
      runtime.readyPromise = null
    })
    await runtime.readyPromise
    return runtime
  }

  let readyPromise: Promise<void> | null = null

  function ensureReady(): Promise<void> {
    if (splitStorageActive()) return ensureGlobalReady()
    if (!readyPromise) {
      readyPromise = (async () => {
        for (let i = 0; i < 60 && !fs; i++) {
          await new Promise((r) => setTimeout(r, 100))
        }
        await load()
        ensureState()
        const sel = await pickModel()
        if (currentStateBacking()) {
          s.modelOnline = !!sel
          s.chatModelLabel = sel ? String(sel.model) : ''
          s.lastModel = s.chatModelLabel
          syncHeroine()
        }
      })()
    }
    return readyPromise
  }

  async function runSerializedStateTask<T>(task: () => Promise<T>): Promise<T> {
    const previous = stateMutationMutex
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    stateMutationMutex = previous.catch(() => { /* keep the queue alive */ }).then(() => gate)
    await previous.catch(() => { /* the prior task returned its own error */ })
    try {
      return await task()
    } finally {
      release()
    }
  }

  async function runSerializedChatTask<T>(runtime: any, task: () => Promise<T>): Promise<T> {
    // Global v2 has one story timeline, so chats from two workspace panels
    // must enter one queue. Provider work may be slow, but interleaving two
    // commits would otherwise attach replies and choices to the wrong turn.
    const globalQueue = splitStorageActive()
    const previous = globalQueue ? legacyChatMutex : runtime ? runtime.chatMutex : legacyChatMutex
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    const next = previous.catch(() => { /* keep the workspace chat queue alive */ }).then(() => gate)
    if (globalQueue || !runtime) legacyChatMutex = next
    else runtime.chatMutex = next
    await previous.catch(() => { /* the prior chat returned its own error */ })
    try {
      return await task()
    } finally {
      release()
    }
  }

  function scheduleViewMaintenance(persistHint = false): void {
    const runtime = splitStorageActive() ? currentWorkspaceRuntime() : null
    if (runtime) {
      runtime.viewMaintenanceNeedsSave = runtime.viewMaintenanceNeedsSave || persistHint
      scheduleActivityWarmup(0)
      if (runtime.viewMaintenancePromise) return
      const capturedRuntime = runtime
      const work = new Promise<void>((resolve) => setTimeout(resolve, 0)).then(() => runSerializedStateTask(
        () => workspaceStateContext.run(capturedRuntime, async () => {
          let shouldSaveWorkspace = capturedRuntime.viewMaintenanceNeedsSave
          capturedRuntime.viewMaintenanceNeedsSave = false
          const actualSelection = await pickModel()
          if (currentStateBacking()) {
            s.modelOnline = !!actualSelection
            s.chatModelLabel = actualSelection && actualSelection.model ? String(actualSelection.model) : ''
            s.lastModel = s.chatModelLabel
          }
          const heroineChanged = syncHeroine()
          const settled = settle()
          const leveled = !!(s && checkLevelUp(s.current, s.characters[s.current]))
          shouldSaveWorkspace = shouldSaveWorkspace || heroineChanged
          if (settled.changed || leveled) await save('both')
          else if (shouldSaveWorkspace) await save('workspace')
        }),
      )).catch((err) => {
        console.warn('whale-galgame background maintenance failed:', err)
      }).finally(() => {
        capturedRuntime.viewMaintenancePromise = null
        if (capturedRuntime.viewMaintenanceNeedsSave) {
          workspaceStateContext.run(capturedRuntime, () => scheduleViewMaintenance(false))
        }
      })
      runtime.viewMaintenancePromise = work
      return
    }
    viewMaintenanceNeedsSave = viewMaintenanceNeedsSave || persistHint
    scheduleActivityWarmup(0)
    if (viewMaintenancePromise) return
    // A timer boundary guarantees the HTTP handler can flush the current
    // view before token settlement or a multi-megabyte save begins.
    viewMaintenancePromise = new Promise<void>((resolve) => setTimeout(resolve, 0)).then(() => runSerializedStateTask(async () => {
      let shouldSave = viewMaintenanceNeedsSave
      viewMaintenanceNeedsSave = false
      const actualSelection = await pickModel()
      if (currentStateBacking()) {
        s.modelOnline = !!actualSelection
        s.chatModelLabel = actualSelection && actualSelection.model ? String(actualSelection.model) : ''
        s.lastModel = s.chatModelLabel
      }
      const heroineChanged = syncHeroine()
      const settled = settle()
      const leveled = !!(s && checkLevelUp(s.current, s.characters[s.current]))
      shouldSave = shouldSave || heroineChanged || settled.changed || leveled
      if (shouldSave) await save()
    })).catch((err) => {
      console.warn('whale-galgame background maintenance failed:', err)
    }).finally(() => {
      viewMaintenancePromise = null
      if (viewMaintenanceNeedsSave) scheduleViewMaintenance(false)
    })
  }

  async function dispatchAction(action: string, args: any): Promise<any> {
    await ensureReady()
    const hasSessionId = !!(args && typeof args.sessionId === 'string' && args.sessionId.trim())
    const binding = splitStorageActive()
      ? await bindActivitySession(args && args.sessionId)
      : await bindActivitySession(args && args.sessionId)
        .catch(() => hasSessionId ? 'mismatch' as const : 'unscoped' as const)
    if (!splitStorageActive() && binding === 'mismatch') return workspaceMismatchView()
    switch (action) {
      case 'party-context': {
        const story=galFreeStore()
        return {ok:true,ready:!!characterParty,sessionId:cleanAssetText(args.sessionId,160),roleId:story?.roleId||'deepseek',worldId:story?.worldId||'',notices:characterParty?.party?.coordinator?.notices(story?.worldId)||[],storyContext:JSON.stringify({worldId:story?.worldId,scene:story?.scene,premise:story?.premise,summary:story?.summary}).slice(0,1600)}
      }
      case 'model-options': {
        return modelOptions()
      }
      case 'settings-get': {
        return settingsSnapshot()
      }
      case 'settings-set': {
        ensureState()
        const p = ensurePreferences()
        const originalPreferences = { ...p }
        const input = args && args.settings && typeof args.settings === 'object'
          ? { ...args, ...args.settings }
          : (args && typeof args === 'object' ? args : {})
        const errors: string[] = []
        const has = (key: string) => Object.prototype.hasOwnProperty.call(input, key)

        if (has('enabled') && typeof input.enabled === 'boolean') p.enabled = input.enabled
        if (has('petEnabled') && typeof input.petEnabled === 'boolean') p.petEnabled = input.petEnabled
        if (has('imageBackend')) {
          if (['auto', 'comfyui', 'bridge', 'dashscope', 'off'].includes(input.imageBackend)) {
            cfg.imageBackend = input.imageBackend
          }
        }
        if (has('imageNsfwEnabled') && typeof input.imageNsfwEnabled === 'boolean') {
          cfg.imageNsfwEnabled = input.imageNsfwEnabled
        }
        if (has('autoCgEveryRounds')) {
          const rounds = Number(input.autoCgEveryRounds)
          if (Number.isFinite(rounds) && rounds >= 0 && rounds <= 50) {
            cfg.autoCgEveryRounds = Math.round(rounds)
          }
        }
        if (has('sideStorySeedSource')) {
          if (input.sideStorySeedSource === 'auto' || input.sideStorySeedSource === 'activity') {
            p.sideStorySeedSource = input.sideStorySeedSource
          } else {
            errors.push('小剧场取材来源必须是 auto 或 activity')
          }
        }
        if (has('sideStoryCooldownMinutes')) {
          const minutes = Number(input.sideStoryCooldownMinutes)
          if (Number.isFinite(minutes) && minutes >= 0 && minutes <= SIDE_STORY_COOLDOWN_MAX_MINUTES) {
            p.sideStoryCooldownMinutes = Math.round(minutes)
          } else {
            errors.push('小剧场冷却必须是 0 到 ' + SIDE_STORY_COOLDOWN_MAX_MINUTES + ' 之间的分钟数')
          }
        }

        let nextCharacterMode = p.characterMode
        if (has('characterMode')) {
          if (input.characterMode === 'follow' || input.characterMode === 'manual') {
            nextCharacterMode = input.characterMode
          } else {
            errors.push('characterMode 必须是 follow 或 manual')
          }
        }
        if (has('characterId')) {
          const characterId = shortSetting(input.characterId)
          if (!characterId && input.characterId === null) {
            if (!has('characterMode')) nextCharacterMode = 'follow'
          } else if (ROSTER[characterId]) {
            p.characterId = characterId
            p.characterProvider = ''
            p.characterModel = ''
            if (!has('characterMode')) nextCharacterMode = 'manual'
          } else {
            errors.push('未知角色')
          }
        }
        if (input.characterSelection && typeof input.characterSelection === 'object') {
          const provider = shortSetting(input.characterSelection.provider)
          const model = shortSetting(input.characterSelection.model)
          if (provider && model) {
            p.characterProvider = provider
            p.characterModel = model
            p.characterId = heroineFor({ provider, model }, p.characterId || s.current)
            if (!has('characterMode')) nextCharacterMode = 'manual'
          } else {
            errors.push('角色模型需要 provider 和 model')
          }
        }
        if (nextCharacterMode === 'manual' && !ROSTER[p.characterId]) {
          errors.push('手动角色不能为空')
          nextCharacterMode = 'follow'
        }
        p.characterMode = nextCharacterMode

        let nextChatMode = p.chatMode
        if (has('chatMode')) {
          if (['configured', 'main', 'manual'].includes(input.chatMode)) {
            nextChatMode = input.chatMode
          } else {
            errors.push('chatMode 必须是 configured、main 或 manual')
          }
        }
        let requestedProvider = p.chatProvider
        let requestedModel = p.chatModel
        let suppliedChatSelection = false
        if (input.chatSelection && typeof input.chatSelection === 'object') {
          requestedProvider = shortSetting(input.chatSelection.provider)
          requestedModel = shortSetting(input.chatSelection.model)
          suppliedChatSelection = true
        } else if (has('chatProvider') || has('chatModel')) {
          requestedProvider = has('chatProvider') ? shortSetting(input.chatProvider) : requestedProvider
          requestedModel = has('chatModel') ? shortSetting(input.chatModel) : requestedModel
          suppliedChatSelection = true
        }
        if (suppliedChatSelection) {
          let providerAccepted = true
          try {
            const live = llm && typeof llm.listProviders === 'function' ? llm.listProviders() : []
            if (Array.isArray(live) && live.length > 0) {
              providerAccepted = live.some((row: any) => row && row.id === requestedProvider)
            }
          } catch (err) { /* an unavailable catalog is not proof the route is invalid */ }
          if (!requestedProvider || !requestedModel) {
            errors.push('对话模型需要 provider 和 model')
          } else if (!providerAccepted) {
            errors.push('所选模型提供方当前未启用')
          } else {
            p.chatProvider = requestedProvider
            p.chatModel = requestedModel
            if (!has('chatMode')) nextChatMode = 'manual'
          }
        }
        if (nextChatMode === 'configured' && !configuredChatSelection()) nextChatMode = 'main'
        if (nextChatMode === 'manual' && (!p.chatProvider || !p.chatModel)) {
          errors.push('手动对话模型不能为空')
          nextChatMode = configuredChatSelection() ? 'configured' : 'main'
        }
        p.chatMode = nextChatMode

        if (errors.length > 0) {
          // Settings are a single transaction: a rejected model/role must not
          // silently apply an unrelated toggle from the same request.
          s.preferences = originalPreferences
          return { ok: false, errors, settings: settingsSnapshot(), view: view() }
        }

        const claimedPreferenceFields = new Set<string>()
        if (has('enabled')) claimedPreferenceFields.add('enabled')
        if (has('petEnabled')) claimedPreferenceFields.add('petEnabled')
        if (has('characterMode')) claimedPreferenceFields.add('characterMode')
        if (has('characterId') || (input.characterSelection && typeof input.characterSelection === 'object')) {
          for (const field of ['characterMode', 'characterId', 'characterProvider', 'characterModel']) {
            claimedPreferenceFields.add(field)
          }
        }
        if (has('chatMode')) claimedPreferenceFields.add('chatMode')
        if ((input.chatSelection && typeof input.chatSelection === 'object') || has('chatProvider') || has('chatModel')) {
          for (const field of ['chatMode', 'chatProvider', 'chatModel']) claimedPreferenceFields.add(field)
        }
        claimGlobalPreferences(claimedPreferenceFields)

        if (p.enabled !== false) syncHeroine()
        const selected = await pickModel()
        s.chatModelLabel = selected && selected.model ? String(selected.model) : ''
        s.lastModel = s.chatModelLabel
        s.modelOnline = !!selected
        await save('both')
        return { ok: errors.length === 0, errors, settings: settingsSnapshot(), view: view() }
      }
      case 'persona-settings-get': return personaSettingsReply()
      case 'persona-settings-set': case 'persona-preset-save': case 'persona-preset-delete': return mutatePersonaSettings(action,args)
      case 'profile-preview': return previewPersona(args)
      case 'profile-get': {
        ensureState()
        if (ensurePreferences().enabled !== false) syncHeroine(false)
        const charId = requestedProfileCharId(args)
        if (!charId) return { ok: false, error: '未知角色' }
        return profileResult(charId)
      }
      case 'profile-set': {
        ensureState()
        if (ensurePreferences().enabled !== false) syncHeroine(false)
        const charId = requestedProfileCharId(args)
        if (!charId) return { ok: false, error: '未知角色', view: view(false) }
        const supplied = args && args.overrides
        if (!supplied || typeof supplied !== 'object' || Array.isArray(supplied)) {
          return {
            ...profileResult(charId),
            ok: false,
            error: 'overrides 必须是对象',
            view: view(false),
          }
        }
        const unknown = Object.keys(supplied).filter((key) => !(PROFILE_FIELDS as readonly string[]).includes(key))
        const invalid = PROFILE_FIELDS.filter((field) => Object.prototype.hasOwnProperty.call(supplied, field)
          && supplied[field] !== null
          && typeof supplied[field] !== 'string')
        if (unknown.length > 0 || invalid.length > 0) {
          return {
            ...profileResult(charId),
            ok: false,
            error: unknown.length > 0 ? '包含未知角色设定字段' : '角色设定字段必须是字符串或 null',
            view: view(false),
          }
        }

        const character = s.characters[charId]
        const previousProfile = effectiveProfileFor(charId)
        if(args.expectedProfile&&PROFILE_FIELDS.some(key=>String(args.expectedProfile[key]||'')!==String(previousProfile[key]||'')))return {...profileResult(charId),ok:false,conflict:true,error:'人设已在其他页面修改，请重新读取后再保存'}
        const previousOverrides = { ...profileOverridesFor(charId) }
        const previousProfileClaims = splitStorageActive() && globalState
          ? [...(ensureGlobalMigrationState().claims.profiles[charId] || [])]
          : null
        const initialGreetingIndex = character.log.length === 0
          ? character.chatLines.findIndex((line: any) => line && line.who === 'heroine'
            && line.text === previousProfile.greeting)
          : -1
        const previousGreetingText = initialGreetingIndex >= 0
          ? character.chatLines[initialGreetingIndex].text
          : null
        const nextOverrides = { ...previousOverrides }
        for (const field of PROFILE_FIELDS) {
          if (!Object.prototype.hasOwnProperty.call(supplied, field)) continue
          const value = supplied[field] === null
            ? ''
            : sanitizeProfileText(supplied[field], PROFILE_LIMITS[field])
          if (value) nextOverrides[field] = value
          else delete nextOverrides[field]
        }
        character.profileOverrides = nextOverrides
        claimGlobalCharacter(
          'profiles',
          charId,
          PROFILE_FIELDS.filter((field) => Object.prototype.hasOwnProperty.call(supplied, field)),
        )
        if (initialGreetingIndex >= 0) {
          character.chatLines[initialGreetingIndex].text = effectiveProfileFor(charId).greeting
        }
        try {
          await save('both')
        } catch (err) {
          character.profileOverrides = previousOverrides
          if (previousProfileClaims) ensureGlobalMigrationState().claims.profiles[charId] = previousProfileClaims
          if (previousGreetingText !== null) character.chatLines[initialGreetingIndex].text = previousGreetingText
          return {
            ...profileResult(charId),
            ok: false,
            error: '角色设定保存失败',
            view: view(false),
          }
        }
        return { ...profileResult(charId), view: view(false) }
      }
      case 'profile-reset': {
        ensureState()
        if (ensurePreferences().enabled !== false) syncHeroine(false)
        const charId = requestedProfileCharId(args)
        if (!charId) return { ok: false, error: '未知角色', view: view(false) }
        const character = s.characters[charId]
        const previousProfile = effectiveProfileFor(charId)
        const previousOverrides = { ...profileOverridesFor(charId) }
        const previousProfileClaims = splitStorageActive() && globalState
          ? [...(ensureGlobalMigrationState().claims.profiles[charId] || [])]
          : null
        const initialGreetingIndex = character.log.length === 0
          ? character.chatLines.findIndex((line: any) => line && line.who === 'heroine'
            && line.text === previousProfile.greeting)
          : -1
        const previousGreetingText = initialGreetingIndex >= 0
          ? character.chatLines[initialGreetingIndex].text
          : null
        character.profileOverrides = {}
        claimGlobalCharacter('profiles', charId)
        if (initialGreetingIndex >= 0) character.chatLines[initialGreetingIndex].text = builtInProfile(charId).greeting
        try {
          await save('both')
        } catch (err) {
          character.profileOverrides = previousOverrides
          if (previousProfileClaims) ensureGlobalMigrationState().claims.profiles[charId] = previousProfileClaims
          if (previousGreetingText !== null) character.chatLines[initialGreetingIndex].text = previousGreetingText
          return {
            ...profileResult(charId),
            ok: false,
            error: '角色设定保存失败',
            view: view(false),
          }
        }
        return { ...profileResult(charId), view: view(false) }
      }
      case 'view': {
        const p = ensurePreferences()
        if (p.enabled === false) return view()
        const heroineChanged = syncHeroine()
        const immediate = view(false)
        scheduleViewMaintenance(heroineChanged)
        return immediate
      }
      case 'chat': {
        const text = args && args.text ? String(args.text).trim().slice(0, 500) : ''
        if (!text) return view()
        if (ensurePreferences().enabled === false) return view()
        const runtime = splitStorageActive() ? currentWorkspaceRuntime() : null
        const controller = new AbortController()
        const signal = controller.signal
        const timer = setTimeout(() => {
          controller.abort(new Error('chat model work timed out after 110 seconds'))
        }, MODEL_STREAM_TIMEOUT_MS)
        let pendingChoiceCharId = ''
        try {
          try {
            await waitWithAbort(Promise.resolve(refreshActivityCache()), signal, 'chat activity lookup aborted')
          } catch (err) {
            if (!signal.aborted) console.warn('whale-galgame activity refresh failed before chat:', err)
          }

          const prepared = await runSerializedStateTask(async () => {
            ensureState()
            if (ensurePreferences().enabled === false) return { disabled: true, response: view() }
            syncHeroine()
            const charId = String(s.current)
            const character = s.characters[charId]
            const profile = { ...effectiveProfileFor(charId) }
            const scopedActivity = globalActivityCandidates()
            const pendingActivity = nextUnseenActivity(scopedActivity, character.activity)
            const selectedChoice = args && typeof args.choiceId === 'string'
              ? character.choices.find((choice: any) => choice && typeof choice === 'object' && choice.id === args.choiceId)
              : null
            return {
              disabled: false,
              charId,
              profile,
              pendingActivity,
              selectedChoice: selectedChoice ? { ...selectedChoice } : null,
              promptCharacter: { level: character.level, affection: character.affection },
              log: character.log.slice(-12).map((entry: any) => ({ ...entry })),
            }
          })
          if (prepared.disabled) return prepared.response

          let sel: any = null
          try {
            sel = await waitWithAbort(Promise.resolve(pickModel()), signal, 'chat model selection aborted')
          } catch (err) { /* the fallback line remains available */ }
          const effort = await pickEffort(sel, signal)
          const emotionPromise = classifyEmotion(text, signal)
          let reply = ''
          let usedFallback = false
          let fallbackReason = ''
          if (llm && sel && sel.model) {
            try {
              reply = await streamText({
                provider: sel.provider,
                model: sel.model,
                reasoningEffort: effort,
                messages: (() => {
                  const msgs: any[] = [{
                    role: 'user',
                    content: [{ type: 'text', text: '（场景：深海女仆工坊的会客厅，暖黄的灯光。当前角色正在和用户聊天。你只扮演当前角色，不要提到其他角色。）' }],
                    source: { kind: 'user' },
                  }]
                  for (const m of [...prepared.log, { role: 'user', text }].slice(-12)) {
                    if (m.role === 'assistant' && typeof m.text === 'string' && CANNED_LINES.has(m.text.trim())) continue
                    msgs.push({
                      role: m.role === 'assistant' ? 'assistant' : 'user',
                      content: [{ type: 'text', text: m.text }],
                      source: m.role === 'assistant'
                        ? { kind: 'model', provider: sel.provider, model: sel.model }
                        : { kind: 'user' },
                    })
                  }
                  return msgs
                })(),
                system: systemPrompt(prepared.profile, prepared.promptCharacter, prepared.pendingActivity),
                temperature: 0.9,
                maxTokens: 1200,
              }, signal)
            } catch (err: any) {
              console.error('whale-galgame llm call failed:', err && err.message ? err.message : String(err))
              fallbackReason = err && err.message ? err.message : String(err)
            }
          } else {
            fallbackReason = signal.aborted
              ? abortFailure(signal, 'chat model work aborted').message
              : 'no model available'
          }
          if (!reply) {
            reply = prepared.profile.address + '说的话，我听到啦～（今天的深海信号有点弱，但心意传达到了哦）'
            usedFallback = true
          }
          const emotion = await emotionPromise
          pendingChoiceCharId = prepared.charId
          choiceGenerationPending.add(pendingChoiceCharId)
          const committed = await runSerializedStateTask(async () => {
            ensureState()
            const settledBeforeChat = settle()
            const c = s.characters[prepared.charId]
            if (!c) throw new Error('chat character became unavailable before commit')
            c.log.push({ role: 'user', text })
            c.chatLines.push({
              who: 'user',
              text,
              emotion,
              choiceId: prepared.selectedChoice ? prepared.selectedChoice.id : null,
            })
            c.choices = []
            s.chatModelLabel = sel && sel.model ? String(sel.model) : ''
            s.lastModel = s.chatModelLabel
            s.fallbackUsed = usedFallback
            s.fallbackReason = fallbackReason
            if (prepared.pendingActivity && !usedFallback) {
              c.activity = rememberActivity(c.activity, prepared.pendingActivity)
            }
            c.log.push({ role: 'assistant', text: reply })
            if (c.log.length > 24) c.log = c.log.slice(-24)
            c.chatLines.push({ who: 'heroine', text: reply })
            const before = c.affection
            const delta = prepared.selectedChoice
              ? (prepared.selectedChoice.effect === 1 ? 1 : prepared.selectedChoice.effect === -1 ? -1 : 0)
              : (/喜欢|爱|可爱|想你|陪你|晚安|早安|抱抱|亲亲|约会|月圆/.test(text) ? 1 : (/讨厌|烦|滚|走开|无聊|再见/.test(text) ? -1 : 0))
            c.affection = Math.max(0, before + delta)
            growTraits(c, text, prepared.selectedChoice)
            const leveled = checkLevelUp(prepared.charId, c)
            await save(settledBeforeChat.changed || c.affection !== before || leveled ? 'both' : 'workspace')
            void maybeAutoIllustrate(prepared.charId)
            return { leveled, response: view() }
          })
          if (committed.leveled) {
            choiceGenerationPending.delete(pendingChoiceCharId)
            pendingChoiceCharId = ''
            return await runSerializedStateTask(async () => {
              const c = s.characters[prepared.charId]
              if (ensureReplyChoices(prepared.charId, c)) await save('global')
              return view()
            })
          }

          const choices = await generateChoices(prepared.promptCharacter, text, reply, signal)
          return await runSerializedStateTask(async () => {
            const c = s.characters[prepared.charId]
            if (!c) throw new Error('chat character became unavailable before choice commit')
            c.choices = choices
            choiceGenerationPending.delete(prepared.charId)
            pendingChoiceCharId = ''
            await save('workspace')
            return view()
          })
        } finally {
          if (pendingChoiceCharId) choiceGenerationPending.delete(pendingChoiceCharId)
          clearTimeout(timer)
        }
      }
      case 'side-story': {
        if (ensurePreferences().enabled === false) return view()
        const op = typeof args.op === 'string' ? args.op : 'start'
        if (op === 'close') {
          return await runSerializedStateTask(async () => {
            sideStoryState().scene = null
            await save('global')
            return view()
          })
        }
        if (op === 'advance') {
          return await runSerializedStateTask(async () => {
            const scene = sideStoryState().scene
            // A settled scene still has 合 queued behind the master's line, so
            // advancing stays available until the cursor reaches the last beat —
            // but never past an interlude that is still waiting on her.
            if (scene && !pendingSideStoryInterlude(scene) && scene.cursor < scene.beats.length - 1) {
              scene.cursor = scene.cursor + 1
              await save('global')
            }
            return view()
          })
        }
        if (op === 'choose' || op === 'speak') {
          // Free input runs one extra generation so the cast answers what the
          // master actually typed; a preset choice already carries its 合.
          let resolved: any = null
          if (op === 'speak') {
            const spoken = typeof args.text === 'string' ? args.text.trim().slice(0, SIDE_STORY_BEAT_LIMIT) : ''
            if (!spoken) return view()
            const pending = sideStoryState().scene
            if (!pending || pending.settled) return view()
            const outcome = await generateSideStoryFreeReply(pending, spoken)
            resolved = { text: spoken, effects: outcome.effects, reply: outcome.reply }
          }
          return await runSerializedStateTask(async () => {
            const state = sideStoryState()
            const scene = state.scene
            if (!scene || scene.settled) return view()
            const interlude = pendingSideStoryInterlude(scene)
            const choice = op === 'speak'
              ? resolved
              : (interlude ? interlude.choices : []).find((row: any) => row && row.id === args.choiceId)
            const outcome = settleSideStoryChoice(scene, choice)
            if (!outcome.applied) return view()
            if (scene.settled) {
              state.history = [
                ...state.history,
                { at: Date.now(), digest: scene.seed.summary, frame: scene.frame || '', twist: scene.twist || '', subject: scene.subject || '', cast: scene.cast.slice() },
              ].slice(-SIDE_STORY_HISTORY_LIMIT)
            }
            await save('global')
            return view()
          })
        }
        // op === 'start'
        const remaining = sideStoryCooldownRemaining()
        if (remaining > 0) return { ...view(), sideStoryError: 'cooldown' }
        const existing = sideStoryState().scene
        if (existing && !existing.settled) return view()
        await refreshActivityCache()
        const cast = pickSideStoryCast()
        const subject = pickSideStorySubject(cast)
        const seed = await resolveSideStorySeed(subject, typeof args.topic === 'string' ? args.topic : '')
        if (!seed) return { ...view(), sideStoryError: 'no-seed' }
        lastSideStoryFailure = ''
        // One retry: a malformed or over-long JSON payload is a coin flip, and
        // a second draft costs far less than the button appearing broken.
        let scene = await generateSideStoryScene(seed, cast)
        if (!scene) scene = await generateSideStoryScene(seed, cast)
        if (!scene) return { ...view(), sideStoryError: 'generation-failed', sideStoryErrorDetail: lastSideStoryFailure }
        return await runSerializedStateTask(async () => {
          const state = sideStoryState()
          state.scene = scene
          state.lastRunAt = Date.now()
          await save('global')
          return view()
        })
      }
      case 'scene-layout-state': {
        const store=sceneLayoutStore(),document=store.documents.find((d:any)=>d.id===(args.id||store.activeId))||store.documents[0]||null
        return {ok:true,activeId:store.activeId,documents:store.documents.map(({scene,...d}:any)=>d),document}
      }
      case 'scene-layout-save': {
        const store=sceneLayoutStore(),previous=cloneWorld(store)
        const existing=args.id?store.documents.find((d:any)=>d.id===args.id):null
        if(args.id&&!existing)return {ok:false,error:'布局不存在，请另存为新布局'}
        if(existing&&args.expectedRevision!==existing.revision)return {ok:false,error:'布局已在另一个窗口更新，请先重新载入或另存副本',document:existing}
        if(!existing&&store.documents.length>=24)return {ok:false,error:'最多保存 24 套布局，请先导出并清理不用的布局'}
        let scene:any
        try {
          scene=normalizeSceneLayout(args.scene)
          const library=galAssetStore()
          if(scene.elements.some((e:any)=>e.assetId&&!library.items.some((a:any)=>a.id===e.assetId)))throw new Error('布局引用了不存在的素材，请重新选择或导入素材')
          if(args.apply===true||store.activeId===existing?.id)validatePlayableScene(scene)
        } catch(err:any){return {ok:false,error:err.message}}
        const document={id:existing?.id||randomUUID(),name:cleanAssetText(args.name,100)||'自定义布局',revision:(existing?.revision||0)+1,updatedAt:Date.now(),scene}
        if(existing)store.documents[store.documents.indexOf(existing)]=document;else store.documents.push(document)
        if(args.apply===true)store.activeId=document.id
        try{await save('global')}catch(err){galStore().sceneEditor=previous;throw err}
        return {ok:true,document,activeId:store.activeId,view:view()}
      }
      case 'scene-layout-publish': {
        const store=sceneLayoutStore(),previous=cloneWorld(store),document=store.documents.find((d:any)=>d.id===args.id)
        if(args.id&&!document)return {ok:false,error:'布局不存在'}
        if(document&&args.expectedRevision!==document.revision)return {ok:false,error:'布局版本已变化，请重新载入'}
        try{if(document)validatePlayableScene(document.scene)}catch(err:any){return {ok:false,error:err.message}}
        store.activeId=document?.id||''
        try{await save('global')}catch(err){galStore().sceneEditor=previous;throw err}
        return {ok:true,view:view()}
      }
      case 'scene-layout-delete': {
        const store=sceneLayoutStore(),previous=cloneWorld(store)
        const document=store.documents.find((d:any)=>d.id===args.id)
        if(!document)return {ok:false,error:'布局不存在'}
        if(args.expectedRevision!==document.revision)return {ok:false,error:'布局版本已变化，未删除'}
        store.documents=store.documents.filter((d:any)=>d.id!==args.id)
        if(store.activeId===args.id)store.activeId=''
        try{await save('global')}catch(err){galStore().sceneEditor=previous;throw err}
        return {ok:true,view:view()}
      }

      case 'asset-group-save': {
        const lib = galAssetStore(), name = cleanAssetText(args.name,80)
        if (!name) return {ok:false,error:'请填写素材组名称'}
        const old = lib.groups.find((g: any) => g.id === args.id)
        if (args.id && !old) return {ok:false,error:'素材组不存在'}
        if (old) old.name = name
        else lib.groups.push({id:randomUUID(),name})
        await save('global'); return {ok:true,group:old || lib.groups.at(-1)}
      }
      case 'asset-group-select': {
        const lib = galAssetStore()
        if (!lib.groups.some((g: any) => g.id === args.id)) return {ok:false,error:'素材组不存在'}
        lib.activeGroup = args.id; await save('global')
        return {ok:true,story:galFreeStore() ? galFreePayload(galFreeStore().step) : null}
      }
      case 'asset-group-delete': {
        const lib = galAssetStore(), id = cleanAssetText(args.id)
        if (!lib.groups.some((g: any) => g.id === id) || id === 'default') return {ok:false,error:'默认素材组不可删除'}
        lib.groups = lib.groups.filter((g: any) => g.id !== id)
        for (const item of lib.items) if (item.group === id) item.group = 'default'
        for (const key of Object.keys(lib.bindings)) if (key.startsWith(id + ':')) delete lib.bindings[key]
        if (lib.activeGroup === id) lib.activeGroup = 'default'
        await save('global'); return {ok:true}
      }
      case 'asset-slot-save': {
        const lib = galAssetStore(), previous = lib.slots.find((r: any) => r.id === args.id)
        if (args.id && !previous) return {ok:false,error:'槽位不存在'}
        try {
          const slot = assetSlot(args,previous)
          if (!WORLD_ACTIONS.includes(slot.action)) return {ok:false,error:'未知的完整动作'}
          if (previous) Object.assign(previous,slot); else lib.slots.push(slot)
          await save('global'); return {ok:true,slot}
        } catch(err: any) { return {ok:false,error:err.message} }
      }
      case 'asset-slot-delete': {
        const lib = galAssetStore(), id = cleanAssetText(args.id)
        lib.slots = lib.slots.filter((r: any) => r.id !== id)
        for (const item of lib.items) if (item.slotId === id) item.slotId = ''
        for (const key of Object.keys(lib.bindings)) if (key.endsWith(':slot:' + id)) delete lib.bindings[key]
        await save('global'); return {ok:true}
      }
      case 'asset-preset-save': {
        const lib = galAssetStore(), name = cleanAssetText(args.name,80)
        if (!name) return {ok:false,error:'请填写预设名称'}
        const previous = lib.presets.find((r: any) => r.id === args.id)
        try {
          const preset = {id:previous?.id || randomUUID(),name,prompt:cleanAssetText(args.prompt,2000),generation:assetGenerationParams(args.generation,args.kind)}
          if (previous) Object.assign(previous,preset); else lib.presets.push(preset)
          await save('global'); return {ok:true,preset}
        } catch(err: any) { return {ok:false,error:err.message} }
      }
      case 'asset-preset-delete': {
        const lib = galAssetStore(); lib.presets = lib.presets.filter((r: any) => r.id !== args.id)
        await save('global'); return {ok:true}
      }
      case 'asset-rename': {
        const item = galAssetStore().items.find((r: any) => r.id === args.id), label = cleanAssetText(args.label)
        if (!item || !label) return {ok:false,error:'素材不存在或名称为空'}
        item.label = label; await save('global'); return {ok:true}
      }
      case 'asset-duplicate': {
        const lib = galAssetStore(), item = lib.items.find((r: any) => r.id === args.id)
        if (!item || lib.items.length >= 200) return {ok:false,error:'素材不存在或素材库已满'}
        const copy = {...cloneWorld(item),id:randomUUID(),label:cleanAssetText(args.label) || item.label + ' 副本',createdAt:Date.now()}
        lib.items.push(copy); await save('global'); return {ok:true,id:copy.id}
      }
      case 'asset-unbind': {
        const lib = galAssetStore(), item = lib.items.find((r: any) => r.id === args.id)
        if (item) {
          const adopted = [assetBindingKey(item), ...(item.slotId ? [assetSlotBindingKey(item)] : [])].some((key) => lib.bindings[key] === item.id)
          for (const key of [assetBindingKey(item), ...(item.slotId ? [assetSlotBindingKey(item)] : [])]) if (lib.bindings[key] === item.id) delete lib.bindings[key]
          if (adopted && item.kind === 'sprite' && item.action === 'neutral' && s.characters[item.characterId]?.customSprite?.dataUrl === item.dataUrl) await dispatchAction('sprite-clear', {characterId:item.characterId})
          if (adopted && ['background','cg'].includes(item.kind) && s.bg === item.dataUrl) await dispatchAction('bg-clear-custom', {})
        }
        await save('global'); return {ok:true,view:view(),story:galFreeStore() ? galFreePayload(galFreeStore().step) : null}
      }
      case 'asset-prompt-polish': {
        const roleId = ROSTER[args.characterId] ? args.characterId : s.current
        const prompt = cleanAssetText(args.prompt,2000), draft = cleanAssetText(args.draft,2000)
        if (!prompt && !draft) return {ok:false,error:'请先填写创作要求或提示词'}
        const profile = effectiveProfileFor(roleId)
        const system = '你是游戏美术提示词编辑。把用户要求和当前提示词整理成一段英文图像生成提示词，只输出提示词。保持角色身份、服装和画风；将表情、视线、动作、手势和重心作为一个整体描述。只润色日常、非露骨的美术内容。不要替用户新增题材。'
        const input = '角色：' + profile.displayName + '\n外观：' + profile.visual + '\n创作要求：' + draft + '\n当前提示词：' + prompt
        try {
          let output = galChatProvider ? await galChatProvider({system,prompt:input,maxTokens:700,temperature:0.6}) : null
          if (!output) {
            const selection = await pickModel()
            if (!llm || !selection?.model) return {ok:false,error:'没有可用的提示词润色模型，请选择聊天模型'}
            output = await streamText({provider:selection.provider,model:selection.model,system,messages:[{role:'user',content:[{type:'text',text:input}]}],maxTokens:700,temperature:0.6})
          }
          return {ok:true,prompt:cleanAssetText(output,2000)}
        } catch(err: any) { return {ok:false,error:err.message || '润色失败'} }
      }

      case 'asset-list': {
        const library = galAssetStore()
        const items = library.items.filter((r: any) => (!args.characterId || r.characterId === args.characterId) && (!args.kind || r.kind === args.kind))
        return { ok: true, wardrobe: (ART_PACKS as any).wardrobe?.frames || [], items: items.map(({ dataUrl, ...r }: any) => r), jobs: library.jobs, bindings: library.bindings, groups: library.groups, slots: library.slots, presets: library.presets, activeGroup: library.activeGroup, roles: ROSTER_IDS.map((id) => ({id,name:ROSTER[id].name})) }
      }
      case 'asset-wardrobe-import': {
        const frame=(ART_PACKS as any).wardrobe?.frames.find((f:any)=>f.id===args.id)
        if(!frame)return {ok:false,error:'衣装素材不存在'}
        const library=galAssetStore()
        const existing=library.items.find((item:any)=>item.sourceFrameId===frame.id)
        if(existing)return {ok:true,id:existing.id}
        if(library.items.length>=200)return {ok:false,error:'素材库已满，请先清理'}
        const path=join(dirname(fileURLToPath(import.meta.url)),'../assets/packs',frame.url.replace('/whale-galgame-media/',''))
        const item={...galAssetRecord({characterId:frame.characterId,kind:'sprite',action:'neutral',group:'default',label:frame.label},'data:image/webp;base64,'+readFileSync(path).toString('base64'),'import'),sourceFrameId:frame.id}
        library.items.push(item);await save('global');return {ok:true,id:item.id}
      }
      case 'asset-data': {
        const item = galAssetStore().items.find((r: any) => r.id === args.id)
        return item ? { ok: true, ...item } : { ok: false, error: '素材不存在' }
      }
      case 'asset-import': {
        const dataUrl = validCustomSprite(args.dataUrl)
        if (!dataUrl) return { ok: false, error: '仅支持 18MB 以内的 PNG、JPEG、WebP 或 AVIF 图片' }
        const library = galAssetStore()
        if (library.items.length + library.jobs.filter((j: any) => ['queued','running'].includes(j.status)).length >= 200) return { ok: false, error: '素材库已达 200 项，请先导出并清理不需要的素材' }
        const item = galAssetRecord(args, dataUrl, 'import')
        library.items.push(item); await save('global')
        return { ok: true, id: item.id }
      }
      case 'asset-generate': {
        const library = galAssetStore()
        const requestId = shortSetting(args.requestId).slice(0, 120)
        const existing = requestId && library.jobs.find((j: any) => j.requestId === requestId)
        if (existing) return { ok: true, job: existing, duplicate: true }
        if (library.jobs.some((j: any) => ['queued', 'running'].includes(j.status))) return { ok: false, error: '已有素材正在生成，请等待完成后再提交' }
        if (library.items.length >= 200) return { ok: false, error: '素材库已满，请先导出并清理不需要的素材' }
        const meta = galAssetRecord(args, '', 'generated')
        if (!meta.prompt) return { ok: false, error: '请填写生成描述，动作和表情请一起描述' }
        let generation: any, referenceDataUrl = ''
        const slot = meta.slotId ? library.slots.find((r: any) => r.id === meta.slotId) : null
        try { generation = assetGenerationParams(args.generation || slot?.generation || args, meta.kind) }
        catch(err: any) { return {ok:false,error:err.message} }
        if (args.referenceAssetId) {
          const reference = library.items.find((r: any) => r.id === args.referenceAssetId)
          if (!reference) return {ok:false,error:'参考素材不存在'}
          referenceDataUrl = reference.dataUrl
        } else if (args.referenceDataUrl) {
          referenceDataUrl = validCustomSprite(args.referenceDataUrl) || ''
          if (!referenceDataUrl) return {ok:false,error:'参考图格式不受支持或超过 18MB'}
        }
        meta.generation = generation; meta.useSpriteRef = args.useSpriteRef === true; meta.referenceAssetId = cleanAssetText(args.referenceAssetId)
        const previousAssetId = library.bindings[meta.slotId ? assetSlotBindingKey(meta) : assetBindingKey(meta)] || ''
        const job = { id: randomUUID(), requestId, previousAssetId, generation, prompt: meta.prompt, status: 'queued', createdAt: Date.now(), assetId: '', error: '', characterId: meta.characterId, kind: meta.kind, label: meta.label }
        library.jobs.push(job)
        if (library.jobs.length > 100) library.jobs = library.jobs.slice(-100)
        await save('global')
        // GPU work never holds the story queue. Results enter the library only;
        // adopting a result is a separate explicit action.
        const opts = { ...generation, target: meta.kind, characterId: meta.characterId,
          keepCharacterTags: true, prompt: meta.prompt, nsfw: false,
          referenceDataUrl, useSpriteRef: args.useSpriteRef === true, prefix: 'whale_asset' }
        void (async () => {
          try {
            await runSerializedStateTask(async () => { job.status = 'running'; await save('global') })
            const result = await generateImage(opts)
            const dataUrl = validCustomSprite(result.dataUrl)
            if (!dataUrl) throw new Error('生成结果不是受支持的图片')
            await runSerializedStateTask(async () => {
              const current = galAssetStore(), live = current.jobs.find((r: any) => r.id === job.id)
              const item = { ...meta, dataUrl, backend: result.backend, resolvedPrompt: result.prompt || meta.prompt, generation: result.generation || generation }
              current.items.push(item)
              Object.assign(live, { status: 'ready', assetId: item.id, finishedAt: Date.now() })
              await save('global')
            })
          } catch (err: any) {
            await runSerializedStateTask(async () => {
              const live = galAssetStore().jobs.find((r: any) => r.id === job.id)
              if (live) { live.status = 'failed'; live.error = err?.message || String(err); await save('global') }
            }).catch((err) => console.error('asset job persistence failed', err))
          }
        })()
        return { ok: true, job: { ...job } }
      }
      case 'asset-job': {
        const job = galAssetStore().jobs.find((r: any) => r.id === args.id)
        return job ? { ok: true, job } : { ok: false, error: '生成任务不存在' }
      }
      case 'asset-apply': {
        const library = galAssetStore(), item = library.items.find((r: any) => r.id === args.id)
        if (!item) return { ok: false, error: '素材不存在' }
        library.activeGroup = item.group
        library.bindings[assetBindingKey(item)] = item.id
        if (item.slotId) library.bindings[assetSlotBindingKey(item)] = item.id
        if (item.kind === 'sprite' && item.action === 'neutral') await dispatchAction('sprite-upload', { characterId: item.characterId, dataUrl: item.dataUrl, fileName: item.label })
        else if (item.kind === 'background' || item.kind === 'cg') await dispatchAction('bg-upload', { dataUrl: item.dataUrl, fileName: item.label })
        else await save('global')
        return { ok: true, view: view(), story: galFreeStore() ? galFreePayload(galFreeStore().step) : null }
      }
      case 'asset-delete': {
        const library = galAssetStore()
        library.items = library.items.filter((r: any) => r.id !== args.id)
        for (const key of Object.keys(library.bindings)) if (library.bindings[key] === args.id) delete library.bindings[key]
        await save('global'); return { ok: true }
      }

      case 'image-status': {
        const status = await imageBackendStatus()
        return { ok: true, ...status }
      }
      case 'image-prompt-suggest': {
        const charId = shortSetting(args && (args.characterId || args.charId))
        const id = charId && ROSTER[charId] ? charId : (s && s.current) || 'deepseek'
        const prompt = await suggestImagePrompt(id, typeof args.hint === 'string' ? args.hint.slice(0, 400) : '')
        const status = await imageBackendStatus().catch(() => null)
        return {
          ok: true,
          charId: id,
          prompt,
          backend: status ? status.resolved : 'off',
          rembg: !!(status && status.backends.comfyui && status.backends.comfyui.rembg),
        }
      }
      case 'image-models': {
        // 列一下这台 ComfyUI 上有什么：选 LoRA 和底模时不用去别处查。
        try {
          const { baseUrl } = await resolveComfyBaseUrl()
          const info = await httpJson(baseUrl + '/object_info', {}, 30000)
          const ckpts = info && info.CheckpointLoaderSimple
            ? (info.CheckpointLoaderSimple.input.required.ckpt_name[0] || [])
            : []
          const loras = info && info.LoraLoader
            ? (info.LoraLoader.input.required.lora_name[0] || [])
            : []
          const rembg = !!(info && info[cfg.comfyRembgNode])
          return { ok: true, checkpoints: ckpts, loras, rembg, current: { ckpt: cfg.comfyCkpt, lora: cfg.comfyLora, characterLora: cfg.comfyCharacterLora } }
        } catch (err) {
          return { ok: false, error: String(err && err.message ? err.message : err) }
        }
      }
      case 'image-nodes': {
        // 列出实例装了哪些节点：判断能不能用 IPAdapter 这类工具时用。
        try {
          const { baseUrl } = await resolveComfyBaseUrl()
          const info = await httpJson(baseUrl + '/object_info', {}, 30000)
          const names = Object.keys(info || {})
          const wanted = shortSetting(args && args.node)
          if (wanted) {
            const node = info[wanted]
            if (!node) return { ok: false, error: '没有这个节点：' + wanted }
            return { ok: true, node: wanted, input: node.input, output: node.output }
          }
          const pattern = shortSetting(args && args.filter)
          if (pattern) {
            let regex: RegExp
            try { regex = new RegExp(pattern, 'i') } catch (err) { regex = /$^/ }
            return { ok: true, total: names.length, matched: names.filter((name) => regex.test(name)) }
          }
          const match = names.filter((name) => /ipadapter|insightface|instantid|faceid|controlnet|redux|style.?model/i.test(name))
          return { ok: true, total: names.length, interesting: match }
        } catch (err) {
          return { ok: false, error: String(err && err.message ? err.message : err) }
        }
      }
      case 'image-generate': {
        // Preview only: nothing is stored. The client decides whether the result
        // becomes a sprite, a background, or a CG.
        const status = await imageBackendStatus().catch(() => null)
        if (!status || status.resolved === 'off') {
          const detail = status && status.backends
            ? [
              status.backends.comfyui && status.backends.comfyui.detail ? 'ComfyUI：' + status.backends.comfyui.detail : '',
              status.backends.bridge && status.backends.bridge.detail ? '生成桥：' + status.backends.bridge.detail : '',
              status.backends.dashscope && status.backends.dashscope.detail ? 'DashScope：' + status.backends.dashscope.detail : '',
            ].filter(Boolean).join('；')
            : ''
          return {
            ok: false,
            error: '没有可用的生图后端。' + (detail || '请检查插件设置里的生图后端与 ComfyUI 地址'),
            backends: status ? status.backends : {},
          }
        }
        const target = typeof args.target === 'string' ? args.target : 'sprite'
        const transparent = typeof args.transparent === 'boolean'
          ? args.transparent
          : target === 'sprite'
        const defaultWidth = target === 'sprite' ? 832 : 1280
        const defaultHeight = target === 'sprite' ? 1216 : 720
        try {
          const result = await generateImage({
            characterId: args.characterId || args.charId,
            prompt: typeof args.prompt === 'string' ? args.prompt.slice(0, 1200) : '',
            dashscopePrompt: typeof args.promptZh === 'string' ? args.promptZh.slice(0, 1200) : '',
            includeCharacter: args.includeCharacter !== false,
            // 这几个之前没转发：角色的 imageTags 因此永远进不了提示词，
            // 生成的就不是她了；negative 丢了还会把文字烧进图里。
            keepCharacterTags: args.keepCharacterTags === true,
            negative: typeof args.negative === 'string' ? args.negative.slice(0, 1200) : '',
            steps: Number(args.steps) > 0 ? Number(args.steps) : undefined,
            cfg: Number(args.cfg) > 0 ? Number(args.cfg) : undefined,
            width: Number(args.width) || defaultWidth,
            height: Number(args.height) || defaultHeight,
            transparent,
            referenceDataUrl: typeof args.referenceDataUrl === 'string' ? args.referenceDataUrl : '',
            denoise: Number(args.denoise) || 0.6,
            nsfw: args.nsfw === true,
            prefix: target === 'sprite' ? 'whale_sprite' : target === 'background' ? 'whale_bg' : 'whale_cg',
          })
          return { ok: true, ...result, target, backend: result.backend, status: status.resolved }
        } catch (err: any) {
          return { ok: false, error: err && err.message ? err.message : String(err) }
        }
      }
      case 'cg-generate': {
        ensureState()
        if (ensurePreferences().enabled !== false) syncHeroine()
        return await runSerializedStateTask(async () => {
          const requested = shortSetting(args && (args.characterId || args.charId))
          const charId = requested && ROSTER[requested] ? requested : s.current
          const character = s.characters[charId]
          if (!character) return { ok: false, error: '未知角色', view: view() }
          const status = await imageBackendStatus().catch(() => null)
          if (!status || status.resolved === 'off') {
            return { ok: false, error: '没有可用的生图后端', view: view() }
          }
          const cgId = makeId('cg')
          character.cgs.push({
            id: cgId,
            status: 'generating',
            dataUrl: null,
            prompt: typeof args.prompt === 'string' ? args.prompt : null,
            charId,
            level: character.level || 1,
            at: Date.now(),
            seen: true,
            savedAsBg: false,
            error: null,
            nsfw: args.nsfw === true,
            label: typeof args.label === 'string' ? args.label.slice(0, 60) : '',
            backend: '',
            enPrompt: '',
          })
          // Show it straight away: an empty stage for 60 seconds reads as broken.
          if (args.show !== false) {
            for (const item of allCgs()) item.savedAsBg = item.id === cgId
            s.bg = 'cg:' + cgId
            ensurePreferences().customBgName = ''
            bumpBackgroundRevision()
            claimGlobalValue('bg')
          }
          await save('global')
          void generateMomentCg(charId, cgId, {
            prompt: typeof args.prompt === 'string' ? args.prompt : '',
            label: typeof args.label === 'string' ? args.label : '',
          })
          return { ok: true, cgId, charId, backend: status.resolved, view: view() }
        })
      }
      case 'skit-cg': {
        if (!cfg.dashscopeApiKey && !await imageBackendAvailable()) return { ok: false, error: 'no-key' }
        const skitId = typeof args.skitId === 'string' ? args.skitId : ''
        return await runSerializedStateTask(async () => {
          const skit = sideStoryState().transcripts.find((row: any) => row.id === skitId)
          if (!skit) return { ok: false, error: 'not-found' }
          if (skit.cgId) return { ok: true, cgId: skit.cgId }
          const owner = skit.cast[0]
          const c = s.characters[owner]
          if (!c) return { ok: false, error: 'not-found' }
          const cgId = makeId('cg')
          c.cgs.push({
            id: cgId,
            status: 'generating',
            dataUrl: null,
            prompt: null,
            charId: owner,
            level: c.level || 1,
            at: Date.now(),
            seen: true,
            savedAsBg: false,
            error: null,
          })
          skit.cgId = cgId
          await save('global')
          void generateSkitCg(skitId, cgId)
          return { ok: true, cgId }
        })
      }
      case 'side-story-log': {
        const rows = sideStoryState().transcripts.slice().reverse().map((row: any) => ({
          id: row.id,
          at: row.at,
          seed: row.seed,
          cast: row.cast.map((id: string) => ({
            id,
            name: effectiveProfileFor(id).displayName,
            color: ROSTER[id] ? ROSTER[id].color : '#8fd8ef',
          })),
          lines: row.lines,
          cgId: row.cgId || '',
          cgStatus: row.cgId ? ((findCg(row.cgId) || {}).status || 'missing') : '',
        }))
        return { skits: rows, cgAvailable: !!cfg.dashscopeApiKey }
      }
      case 'sprite-data': {
        ensureState()
        if (ensurePreferences().enabled !== false) syncHeroine()
        const requestedCharId = shortSetting(args && (args.characterId || args.charId))
        const charId = requestedCharId ? (ROSTER[requestedCharId] ? requestedCharId : null) : s.current
        if (!charId) return { ok: false, error: '未知角色' }
        const character = s.characters[charId]
        const sprite = customSpriteFor(character)
        const dataUrl = sprite && typeof sprite.dataUrl === 'string' && sprite.dataUrl.startsWith('data:')
          ? sprite.dataUrl
          : null
        return {
          ok: true,
          charId,
          kind: dataUrl ? 'custom' : 'builtin',
          dataUrl,
          fileName: dataUrl && typeof sprite.fileName === 'string' ? sprite.fileName : '',
          revision: spriteRevisionFor(character),
        }
      }
      case 'sprite-upload': {
        ensureState()
        if (ensurePreferences().enabled !== false) syncHeroine()
        const dataUrl = validCustomSprite(args && args.dataUrl)
        if (!dataUrl) {
          return { ok: false, error: '仅支持 18MB 以内的 PNG、JPEG、WebP 或 AVIF 图片', view: view() }
        }
        const requestedCharId = shortSetting(args && (args.characterId || args.charId))
        const charId = requestedCharId ? (ROSTER[requestedCharId] ? requestedCharId : null) : s.current
        if (!charId) return { ok: false, error: '未知角色', view: view() }
        const character = s.characters[charId]
        character.customSprite = {
          dataUrl,
          fileName: shortSetting(args && args.fileName).slice(0, 180),
          revision: nextSpriteRevision(character),
        }
        claimGlobalCharacter('sprites', charId)
        await save('global')
        return {
          ok: true,
          charId,
          revision: spriteRevisionFor(character),
          view: view(),
        }
      }
      // ---------------------------------------------------------- GALGAME 模式
      case 'gal-state': {
        ensureState()
        return galPayload()
      }
      case 'gal-start': {
        ensureState()
        const gal = galStore()
        if (gal.freeStory) { gal.worlds ||= {}; gal.worlds[gal.freeStory.worldId] = gal.freeStory; gal.freeStory = null }
        const requestedRole = shortSetting(args && (args.roleId || args.characterId))
        // 默认进主线（共通线），显式 mode='short' 才放番外。
        const mode = shortSetting(args && args.mode)
        const useShort = mode === 'short' && requestedRole && GAL_REGISTRY[requestedRole]
        const scenario = useShort ? galScenarioFor(requestedRole) : ATELIER_WORLD
        // 二周目：已达成结局与已读记录跨周目保留，剧情进度重置。
        let state = createState(scenario)
        state = { ...state, endingsSeen: gal.meta.endingsSeen.slice(), readNodes: gal.meta.readNodes.slice() }
        const first = stepForward(scenario, state)
        gal.state = first.state
        await galSettle()
        return galPayload()
      }
      case 'gal-advance': {
        ensureState()
        const gal = galStore()
        if (!gal.state) return galPayload({ error: '还没开始这一章' })
        const result = advance(galScenarioCurrent(), gal.state)
        gal.state = result.state
        await galSettle()
        return galPayload({ finished: result.done === true })
      }
      case 'gal-choose': {
        ensureState()
        const gal = galStore()
        if (!gal.state) return galPayload({ error: '还没开始这一章' })
        const choiceId = shortSetting(args && args.choiceId)
        const result = choose(galScenarioCurrent(), gal.state, choiceId)
        if (result.error) return galPayload({ error: result.error })
        gal.state = result.state
        await galSettle()
        return galPayload()
      }
      case 'gal-tree': {
        ensureState()
        const gal = galStore()
        const scenario = galScenarioCurrent()
        const read = new Set((gal.meta.readNodes || []).concat(gal.state ? gal.state.readNodes : []))
        // 只画主线（共通线 + 结局分歧），22 条个人线单独一行表示，不然树会爆炸。
        const chapters = scenario.chapters.map((chapter: any) => {
          const nodes = chapter.nodes.map((node: any) => ({
            id: node.id,
            kind: node.kind,
            seen: read.has(node.id),
            label: node.kind === 'choice'
              ? '选择 · ' + String(node.text || '').slice(0, 14)
              : String(node.text || '').slice(0, 18),
            choices: node.kind === 'choice'
              ? (node.choices || []).map((choice: any) => ({ id: choice.id, label: choice.label, tag: choice.tag || '' }))
              : undefined,
          }))
          const seenCount = nodes.filter((row: any) => row.seen).length
          const isRoute = /-route$/.test(chapter.id)
          return {
            id: chapter.id,
            title: chapter.title,
            isRoute,
            total: nodes.length,
            seen: seenCount,
            nodes: isRoute ? [] : nodes,
          }
        })
        const routes = chapters.filter((row: any) => row.isRoute)
        return {
          ok: true,
          title: scenario.title,
          common: chapters.filter((row: any) => !row.isRoute),
          routes,
          totals: {
            nodes: chapters.reduce((sum: number, row: any) => sum + row.total, 0),
            seen: chapters.reduce((sum: number, row: any) => sum + row.seen, 0),
          },
        }
      }
      case 'gal-catalog': {
        ensureState()
        const gal = galStore()
        const scenario = galScenarioCurrent()
        const read = new Set((gal.meta.readNodes || []).concat(gal.state ? gal.state.readNodes : []))
        const lines = gal.state && gal.state.lines ? gal.state.lines : {}
        const chapters = scenario.chapters.map((chapter: any) => {
          const readable = chapter.nodes.filter((node: any) => node.kind === 'line' || node.kind === 'narration')
          const seen = readable.filter((node: any) => read.has(node.id))
          return {
            id: chapter.id,
            title: chapter.title,
            isRoute: /-route$/.test(chapter.id),
            total: readable.length,
            seen: seen.length,
            // 一句摘要：读过的第一句，或没读过就空着（不剧透）。
            snippet: seen.length ? String(lines[seen[0].id] || seen[0].text || '').slice(0, 42) : '',
          }
        })
        return {
          ok: true,
          chapters: chapters.filter((row: any) => !row.isRoute || row.seen > 0),
          hiddenRoutes: chapters.filter((row: any) => row.isRoute && row.seen === 0).length,
        }
      }
      case 'gal-chapter-log': {
        ensureState()
        const gal = galStore()
        const scenario = galScenarioCurrent()
        const wanted = shortSetting(args && args.chapterId)
        const chapter = scenario.chapters.find((row: any) => row.id === wanted)
        if (!chapter) return { ok: false, error: '没有这一章' }
        const read = new Set((gal.meta.readNodes || []).concat(gal.state ? gal.state.readNodes : []))
        const lines = gal.state && gal.state.lines ? gal.state.lines : {}
        const items = chapter.nodes
          .filter((node: any) => read.has(node.id))
          .filter((node: any) => node.kind === 'line' || node.kind === 'narration')
          .map((node: any) => ({
            id: node.id,
            speaker: node.kind === 'narration' ? '旁白' : (node.speaker || ''),
            text: lines[node.id] || node.text || '',
            at: node.at ? String(node.at.label || '') : '',
          }))
          .filter((row: any) => row.text)
        return { ok: true, title: chapter.title, items }
      }
      case 'gal-ensemble-state': {
        const story=galFreeStore();if(!story)return{ok:false,error:'先进入共同剧情，再和同伴们会合'}
        const roles=ensembleRoleDefinitions(),state=ensureEnsemble(story,roles)
        return{ok:true,worldId:story.worldId,present:state.present,focus:state.focus,
          // 前端要能显示「谁在哪、走过来几轮」，所以把地图节点和场景规模一起给出。
          presentLocation:resolveNode(story.scene?.location||''),
          presentLabel:nodeLabel(resolveNode(story.scene?.location||'')),
          sceneKind:state.sceneKind||'normal',
          nodes:MAP_NODES.map(n=>({id:n.id,label:n.label})),
          travel:MAP_NODES.map(n=>({id:n.id,label:n.label,rounds:travelPlan(story.scene?.location||'',n.id)?.rounds??null})),
          roles:roles.map((r:any)=>({id:r.id,name:r.name,post:r.post,location:state.members[r.id].location,activity:state.members[r.id].activity,lastSeen:state.members[r.id].lastSeen,lastSpoke:state.members[r.id].lastSpoke,appearances:state.members[r.id].appearances})),connections:Object.values(state.links),recent:state.log.slice(-6)}
      }
      case 'gal-world-journal': {
        const story=galFreeStore()
        return galWorldJournalPayload(story)
      }
      case 'gal-world-route-set': {
        const gal=galStore(),story=galFreeStore(),roleId=shortSetting(args.roleId)
        if(!story||story.worldId!==args.worldId)return{ok:false,error:'世界线已切换，请重新打开关系面板'}
        if(!WORLD_CAST.includes(roleId)||!['pure','fall'].includes(args.route))return{ok:false,error:'角色或路线无效'}
        const next=cloneWorld(story);next.relationshipRoutes||={};next.relationshipRoutes[roleId]=args.route
        const beforeAuto=gal.auto;gal.freeStory=next;galWorldAutosave()
        try{await save('global')}catch(err){gal.freeStory=story;gal.auto=beforeAuto;throw err}
        return {...galWorldJournalPayload(next),story:galFreePayload(next.step)}
      }
      case 'gal-world-list': {
        const gal = galStore()
        const worlds = [...Object.values(gal.worlds || {}), ...(gal.freeStory ? [gal.freeStory] : [])] as any[]
        return { ok: true, items: worlds.map((w: any) => ({ worldId: w.worldId, roleId: w.roleId, title: w.title, revision: w.revision, updatedAt: w.updatedAt || w.startedAt, active: w === gal.freeStory })) }
      }
      case 'gal-world-select': {
        const gal = galStore(), id = shortSetting(args.worldId)
        if (gal.freeStory?.worldId === id) return galFreePayload(gal.freeStory.step)
        const story = gal.worlds?.[id]
        if (!story) return { ok: false, error: '没有这条世界线' }
        if (gal.freeStory) { gal.worlds ||= {}; gal.worlds[gal.freeStory.worldId] = gal.freeStory }
        gal.freeStory = upgradeWorldline(story); delete gal.worlds[id]
        galWorldAutosave()
        await save('global'); return galFreePayload(story.step)
      }
      case 'gal-opening-suggest': {
        // 开局预设：纯本地取池，不走模型。玩家点一下要立刻拿到可用的开局，
        // 等一次 LLM 会把「开始游戏」变成等待。模型只在之后推进剧情。
        const mode: OpeningMode = args.mode === 'nsfw' ? 'nsfw' : 'random'
        const avoid = Array.isArray(args.avoid)
          ? args.avoid.map((v: any) => shortSetting(v)).filter(Boolean).slice(0, 24)
          : []
        const picked = pickOpening(mode, avoid)
        return { ok: true, mode, id: picked.id, label: picked.label, text: picked.text, total: openingPool(mode).length }
      }
      case 'gal-opening-list': {
        // 给前端列全部预设，方便以后做「从列表挑一个」的界面。
        const mode: OpeningMode = args.mode === 'nsfw' ? 'nsfw' : 'random'
        return { ok: true, mode, openings: openingPool(mode).map(p => ({ id: p.id, label: p.label })) }
      }
      case 'gal-free-start': {
        const gal = galStore()
        const roleId = ROSTER[args.roleId] ? args.roleId : 'deepseek'
        if (gal.freeStory && args.restart !== true && gal.freeStory.roleId === roleId) return galFreePayload(gal.freeStory.step)
        const previous = upgradeWorldline(gal.freeStory)
        const story = newWorldline(roleId, args.premise)
        if (typeof args.title === 'string' && args.title.trim()) story.title = args.title.trim().slice(0, 80)
        let error = ''
        try {
          const first = await galFreeWrite(roleId, [], '', story)
          commitWorldStep(story, first, '', '')
          // 开局背景必须永远在第一屏最前面：玩家一进来要先知道「这是哪儿、你是谁、
          // 为什么在这儿」，没有这个锚点，后面的对话读起来就是一搭没一搭。
          //
          // 必须在 commitWorldStep 之后再铺——commitEnsemble 会把「到场/离场」的动作
          // 说明 prepend 到旁白最前面（ensemble-director.ts），提前铺会被挤到中间。
          const opening = worldOpening(story, ROSTER[roleId]?.name || '')
          if (opening) {
            const withOpening = (value: string) => {
              const current = String(value || '')
              if (!current) return opening
              // AI 自己已经写过开局就别叠第二遍
              if (current.includes(opening.slice(0, 24))) return current
              return opening + '\n\n' + current
            }
            if (story.step) story.step.narration = withOpening(story.step.narration)
            // 旁白日志同步铺一份，「回想」里也要能看到开局
            for (let i = story.turns.length - 1; i >= 0; i--) {
              if (story.turns[i].speaker === '旁白') { story.turns[i].text = withOpening(story.turns[i].text); break }
            }
          }
        }
        catch (err: any) {
          error = err?.message || String(err)
          story.agentStatus = 'offline'
          story.step = { narration: worldOpening(story, ROSTER[roleId]?.name || '') + '\n\n工坊的灯还亮着，她在等你开口。', line: '你想从哪里开始？', fallback: true,
            action: 'attentive', choices: [{ id: 'c0', label: '问她今天过得怎么样', tag: '日常' }, { id: 'c1', label: '介绍自己', tag: '相遇' }, { id: 'c2', label: '安静地陪她一会儿', tag: '陪伴' }] }
        }
        if (previous) { gal.worlds ||= {}; gal.worlds[previous.worldId] = previous }
        gal.freeStory = story
        galWorldAutosave()
        await save('global')
        return { ...galFreePayload(story.step), warning: error }
      }
      case 'gal-free-next': {
        const story = galFreeStore()
        if (!story) return { ok: false, error: '还没有开始共同剧情' }
        const requestId = shortSetting(args.requestId).slice(0, 120)
        if (requestId && story.turns.some((r: any) => r.requestId === requestId)) return { ...galFreePayload(story.step), duplicate: true }
        if (args.revision !== undefined && Number(args.revision) !== story.revision) return { ...galFreePayload(story.step), ok: false, error: '剧情已更新，请根据当前内容重试', retryable: true }
        const selected=args.choiceId?worldChoices(story,story.step).find((c:any)=>c.id===args.choiceId):null
        if(args.choiceId&&!selected)return{...galFreePayload(story.step),ok:false,error:'这个剧情选项已失效',retryable:true}
        // 「自己决定走向」不是一条可以直接执行的选项——它只是把输入框切到 direct 模式。
        // 放到这里来会带着空 action 进模型，模型就以为该写开场，于是输出一段毫不相干的东西。
        if(selected?.kind==='custom')return{...galFreePayload(story.step),ok:false,error:'「自己决定走向」要你先把这一段写出来再发送',needsDirect:true,retryable:true}
        if(selected?.disabled)return{...galFreePayload(story.step),ok:false,error:selected.reason,retryable:true}
        const action=selected?selected.action:typeof args.action==='string'?args.action.trim().slice(0,4000):''
        // 两种输入通道语义不同：
        //   speech（默认）= 玩家开口说话，模型要把它当台词回应；
        //   direct        = 玩家直接指定接下来发生什么，模型要照这个方向演，不能把它当台词复述。
        const playerMode=args.mode==='direct'?'direct':'speech'
        // 换人：多人场景第 6 段的那条路，必须真的把焦点换过去，不能只在台词里说一句。
        const swapRoleId=shortSetting(args.swapRoleId)
        if(swapRoleId&&!WORLD_CAST.includes(swapRoleId))return{...galFreePayload(story.step),ok:false,error:'这位角色不在当前世界的同伴名单中',retryable:true}
        if(swapRoleId&&!ensureEnsemble(story,ensembleRoleDefinitions()).present.includes(swapRoleId))return{...galFreePayload(story.step),ok:false,error:'她这会儿不在场，换不了人',retryable:true}
        const targetRoleId=swapRoleId||shortSetting(args.targetRoleId),inviteRoleId=shortSetting(args.inviteRoleId)
        if(targetRoleId&&!WORLD_CAST.includes(targetRoleId)||inviteRoleId&&!WORLD_CAST.includes(inviteRoleId))return{...galFreePayload(story.step),ok:false,error:'这位角色不在当前世界的同伴名单中',retryable:true}
        if(targetRoleId&&!inviteRoleId&&!ensureEnsemble(story,ensembleRoleDefinitions()).present.includes(targetRoleId))return{...galFreePayload(story.step),ok:false,error:'她目前不在场，可以先从同伴名单请她过来',retryable:true}
        const next = cloneWorld(story)
        // 换人先把焦点切过去，再写这一幕——否则舞台灯还打在旧人身上。
        if(swapRoleId){
          const state=ensureEnsemble(next,ensembleRoleDefinitions())
          state.focus=swapRoleId
          if(next.interaction)next.interaction={...next.interaction,roleId:swapRoleId,targetRoleId:swapRoleId}
        }
        next.playerMode=playerMode
        next.interaction={kind:selected?.kind||(swapRoleId?'swap':'free'),roleId:selected?.roleId||story.direction?.speaker||story.roleId,route:selected?.kind==='mature'?matureAccess(story,selected.roleId).route:undefined,targetRoleId,inviteRoleId}


        let step: any
        try { step = await galFreeWrite(next.roleId, next.turns, action, next);commitWorldStep(next,step,action,requestId,playerMode) }
        catch (err: any) { return { ...galFreePayload(story.step), ok: false, error: err?.message || String(err), retryable: true } }
        next.writes = (Number(next.writes) || 0) + 1
        if (next.writes % 3 === 0) next.summary = await galFreeSummarise(next.roleId, next.turns, next.summary || '')
        const gal = galStore(), beforeAuto = gal.auto
        gal.freeStory = next; galWorldAutosave()
        try { await save('global') }
        catch (err) { gal.freeStory = story; gal.auto = beforeAuto; throw err }
        return galFreePayload(next.step)
      }
      case 'gal-free-exit': {
        const gal = galStore()
        if (gal.freeStory) { gal.worlds ||= {}; gal.worlds[gal.freeStory.worldId] = gal.freeStory }
        gal.freeStory = null
        await save('global'); return galPayload()
      }
      case 'gal-free-state': {
        const story = galFreeStore()
        if (!story) return { ok: true, active: false }
        return { ...galFreePayload(story.step), active: true }
      }

      case 'gal-say': {
        ensureState()
        const gal = galStore()
        if (!gal.state) return galPayload()
        const scenario = galScenarioCurrent()
        const state = normalizeState(gal.state, scenario)
        const playerText = shortSetting(args && args.text).slice(0, 300)
        if (!playerText) return galPayload()
        const chapter = scenario.chapters.find((row: any) => row.id === state.chapterId)
        const node = chapter ? chapter.nodes[state.nodeIndex] : null
        if (!node) return galPayload()
        const choices = visibleChoices(scenario, state)
        const speaker = node.speaker || scenario.roles[0]
        const reply = await galFreeReply(playerText, node, node.kind === 'choice' ? choices : [], state)

        // 自由对话独立记一份：回想面板是按节点 id 查的，这些话不挂在任何节点上。
        if (!Array.isArray(gal.free)) gal.free = []
        gal.free.push({
          at: Date.now(),
          speaker,
          player: playerText,
          line: reply.line,
          branched: reply.choiceId || '',
        })
        if (gal.free.length > 200) gal.free = gal.free.slice(-200)

        let next = rememberLine(state, 'say:' + state.chapterId + ':' + state.nodeIndex + ':' + playerText.slice(0, 16), reply.line)
        if (reply.choiceId) {
          const stepped = choose(scenario, next, reply.choiceId)
          if (!stepped.error && stepped.state) {
            gal.state = stepped.state
            await galSettle()
            return galPayload({ free: { line: reply.line, branched: reply.choiceId, why: reply.why } })
          }
        }
        gal.state = next
        await save('global')
        return galPayload({ free: { line: reply.line, branched: '', why: reply.why } })
      }
      case 'gal-log': {
        ensureState()
        const gal = galStore()
        if (gal.freeStory) {
          const story = galFreeStore()
          return { ok: true, worldId: story.worldId, items: story.turns.map((r: any, i: number) => ({ ...r, id: 'world-log-' + i, speaker: r.speaker === 'player' ? '你说' : ROSTER[r.speaker]?.name || r.speaker, free: true })) }
        }
        if (!gal.state) return { ok: true, items: [] }
        const state = normalizeState(gal.state, galScenarioCurrent())
        const nodes: any[] = []
        for (const chapter of galScenarioCurrent().chapters) for (const node of chapter.nodes) nodes.push(node)
        const index = new Map<string, any>(nodes.map((node) => [node.id, node]))
        const items = state.readNodes
          .map((id) => index.get(id))
          .filter((node: any) => !!node && (node.kind === 'line' || node.kind === 'narration'))
          .map((node: any) => ({
            id: node.id,
            speaker: node.kind === 'narration' ? '旁白' : (node.speaker || ''),
            text: state.lines[node.id] || node.text || '',
            at: node.at ? String(node.at.label || '') : '',
          }))
          .filter((row: any) => row.text)
        // 自由对话按时间插在后面（它是"后说的话"）。
        const free = Array.isArray(gal.free) ? gal.free : []
        for (const row of free) {
          items.push({ id: 'free-' + row.at, speaker: '你说', text: row.player, free: true })
          items.push({
            id: 'free-reply-' + row.at,
            speaker: ROSTER[row.speaker] ? ROSTER[row.speaker].name : (row.speaker || ''),
            text: row.line,
            free: true,
          })
        }
        return { ok: true, items }
      }
      case 'gal-bonds': {
        ensureState()
        return { ok: true, bonds: galBondsView(), stages: GAL_BOND_STAGES.map((row) => row.label) }
      }
      case 'gal-cg': {
        ensureState()
        const gal = galStore()
        const seen = new Set(Array.isArray(gal.meta.cg) ? gal.meta.cg : [])
        // 结局 CG 全部列出（没解锁的不给图，只给名字和线索）。
        const items = ATELIER_WORLD.endings
          .filter((ending: any) => !!ending.art)
          .map((ending: any) => ({
            key: ending.art,
            art: galAppearanceArt(ending.art),
            endingId: ending.id,
            title: ending.title,
            seen: seen.has(ending.art) || gal.meta.endingsSeen.includes(ending.id),
          }))
        // 同 key 去重：鲸鱼娘那两条结局共用一张。
        const unique: any[] = []
        for (const row of items) if (!unique.some((x) => x.key === row.key)) unique.push(row)
        // 现场生成的 CG 也进图鉴（它们没有美术 key，直接给 dataUrl）。
        for (const row of (gal.meta.liveCg || []).slice(-12)) {
          unique.push({ key: 'live:' + row.id, live: true, seen: true, title: row.title, url: row.url, endingId: '' })
        }
        return { ok: true, items: unique, unlocked: unique.filter((row) => row.seen).length }
      }
      case 'gal-save': {
        ensureState()
        const gal = galStore()
        // 自由剧情下没有 gal.state 也要能存：否则玩家从标题页直接进自由剧情就没法存档。
        if (!gal.state && !gal.freeStory) return galPayload({ error: '还没开始这一章' })
        const slot = Math.max(0, Math.min(9, Number(args && args.slot) || 0))
        const snapshot = gal.state && !gal.freeStory
          ? galSnapshot(gal.state)
          : { savedAt: Date.now(), summary: { chapterTitle: '自由剧情', progress: 0 }, state: null }
        // 自由剧情也进槽位：agent 写出来的东西是这份存档的一部分。
        snapshot.freeStory = gal.freeStory ? cloneWorld(gal.freeStory) : null
        snapshot.free = cloneWorld(gal.free || [])
        if (gal.freeStory) snapshot.summary = { chapterTitle: gal.freeStory.title, progress: gal.freeStory.revision }
        if (slot === 0) gal.auto = snapshot
        else gal.slots[String(slot)] = snapshot
        await save('global')
        return gal.freeStory ? {...galFreePayload(gal.freeStory.step),savedSlot:slot} : galPayload({ savedSlot: slot })
      }
      case 'gal-load': {
        ensureState()
        const gal = galStore()
        const slot = Math.max(0, Math.min(9, Number(args && args.slot) || 0))
        const record = slot === 0 ? gal.auto : gal.slots[String(slot)]
        if (!record || (!record.state && !record.freeStory)) return galPayload({ error: '这个槽位还是空的' })
        gal.state = record.state ? normalizeState(record.state, galScenarioCurrent()) : null
        // 恢复那份存档里的自由剧情（可能是 null，表示当时在主线里）。
        gal.freeStory = record.freeStory ? cloneWorld(record.freeStory) : null
        if (gal.freeStory) upgradeWorldline(gal.freeStory).forkOnNext = true
        gal.free = cloneWorld(record.free || [])
        await save('global')
        // 当时在自由剧情里，就把那一步也交回去，玩家读档后接着写。
        if (gal.freeStory && gal.freeStory.step) {
          return Object.assign({ loadedSlot: slot }, galFreePayload(gal.freeStory.step))
        }
        return galPayload({ loadedSlot: slot })
      }
      case 'gal-reset': {
        ensureState()
        const gal = galStore()
        gal.state = null
        gal.free = []
        if (gal.freeStory) { gal.worlds ||= {}; gal.worlds[gal.freeStory.worldId] = gal.freeStory; gal.freeStory = null }
        await save('global')
        return galPayload()
      }

      // Manual nudge of one XP / development track. The panel uses this so the
      // player can set the scene without grinding conversational keywords.
      case 'traits-set': {
        ensureState()
        if (ensurePreferences().enabled !== false) syncHeroine()
        const requestedCharId = shortSetting(args && (args.characterId || args.charId))
        const charId = requestedCharId ? (ROSTER[requestedCharId] ? requestedCharId : null) : s.current
        if (!charId) return { ok: false, error: '未知角色', view: view() }
        const kind = args && args.kind === 'dev' ? 'dev' : 'xp'
        const trackId = shortSetting(args && args.id)
        if (!trackId || !TRAIT_KINDS[kind].some((track) => track.id === trackId)) {
          return { ok: false, error: '未知的数值项', view: view() }
        }
        const character = s.characters[charId]
        if (!character) return { ok: false, error: '未知角色', view: view() }
        const traits = normalizeTraits(character.traits)
        traits[kind as 'xp' | 'dev'][trackId] = normalizeTraitValue(args && args.value)
        character.traits = traits
        await save('global')
        return { ok: true, charId, kind, id: trackId, traits: traitsView(character), view: view() }
      }
      case 'sprite-clear': {
        ensureState()
        if (ensurePreferences().enabled !== false) syncHeroine()
        const requestedCharId = shortSetting(args && (args.characterId || args.charId))
        const charId = requestedCharId ? (ROSTER[requestedCharId] ? requestedCharId : null) : s.current
        if (!charId) return { ok: false, error: '未知角色', view: view() }
        const character = s.characters[charId]
        const revision = nextSpriteRevision(character)
        character.customSprite = { dataUrl: null, fileName: '', revision }
        claimGlobalCharacter('sprites', charId)
        await save('global')
        return { ok: true, charId, revision, view: view() }
      }
      case 'sprite-set-builtin': {
        ensureState()
        if (ensurePreferences().enabled !== false) syncHeroine()
        const requestedCharId = shortSetting(args && (args.characterId || args.charId))
        const charId = requestedCharId ? (ROSTER[requestedCharId] ? requestedCharId : null) : s.current
        if (!charId) return { ok: false, error: '未知角色', view: view() }
        const requestedVariant = shortSetting(args && (args.variant || args.variantId || args.key || args.spriteVariant))
        const option = builtinSpriteOptions(charId).find((row: any) => row.id === requestedVariant)
        if (!option) return { ok: false, error: '当前角色不支持该内置形象', view: view() }
        const character = s.characters[charId]
        const previousVariant = selectedSpriteVariant(charId, character)
        character.chosenSpriteVariant = option.id
        // Picking a published appearance is an explicit request to leave a
        // user-uploaded sprite behind, exactly like bg-set-builtin does for the
        // background. Skip the write when nothing actually changed.
        const hadCustomSprite = !!(character.customSprite && typeof character.customSprite.dataUrl === 'string'
          && character.customSprite.dataUrl.startsWith('data:'))
        if (hadCustomSprite) {
          character.customSprite = { dataUrl: null, fileName: '', revision: nextSpriteRevision(character) }
        }
        if (previousVariant !== option.id || hadCustomSprite) {
          claimGlobalCharacter('sprites', charId)
          await save('global')
        }
        return {
          ok: true,
          charId,
          variant: option.id,
          sprite: option.key,
          clearedCustom: hadCustomSprite,
          revision: spriteRevisionFor(character),
          view: view(),
        }
      }
      case 'bg-set-builtin': {
        ensureState()
        if (ensurePreferences().enabled !== false) syncHeroine()
        const key = shortSetting(args && (args.key || args.backgroundKey))
        const option = builtinBackgroundOptions(s.current).find((row: any) => row.key === key)
        if (!option) {
          return {
            ok: false,
            error: '当前角色不支持该内置背景',
            view: view(),
          }
        }
        const snapshot = captureBackgroundMutationSnapshot()
        s.characters[s.current].chosenBuiltinBackground = option.key
        // Selecting a built-in background is an explicit request to leave any
        // global upload/CG override and return to character-aware switching.
        s.bg = null
        for (const cg of allCgs()) cg.savedAsBg = false
        ensurePreferences().customBgName = ''
        bumpBackgroundRevision()
        claimGlobalValue('bg')
        claimGlobalPreferences(['customBgName'])
        await persistBackgroundMutation(snapshot)
        return {
          ok: true,
          charId: s.current,
          key: option.key,
          view: view(),
        }
      }
      case 'bg-data': {
        let dataUrl: string | null = null
        if (s && typeof s.bg === 'string' && s.bg.startsWith('data:')) dataUrl = s.bg
        if (s && typeof s.bg === 'string' && s.bg.startsWith('cg:')) {
          const cg = findCg(s.bg.slice(3))
          if (cg && cg.status === 'ready' && cg.dataUrl) dataUrl = cg.dataUrl
        }
        const custom = !!(s && typeof s.bg === 'string' && s.bg.startsWith('data:'))
        return {
          dataUrl,
          kind: custom ? 'custom' : (dataUrl ? 'cg' : null),
          backgroundRevision: backgroundRevisionFor(s && s.backgroundRevision),
          fileName: custom && s && s.preferences && typeof s.preferences.customBgName === 'string'
            ? s.preferences.customBgName
            : '',
        }
      }
      case 'bg-upload': {
        ensureState()
        const dataUrl = validCustomBackground(args && args.dataUrl)
        if (!dataUrl) {
          return { ok: false, error: '仅支持 18MB 以内的 PNG、JPEG、WebP 或 AVIF 图片', view: view() }
        }
        const snapshot = captureBackgroundMutationSnapshot()
        s.bg = dataUrl
        for (const cg of allCgs()) cg.savedAsBg = false
        const p = ensurePreferences()
        p.customBgName = shortSetting(args && args.fileName).slice(0, 180)
        bumpBackgroundRevision()
        claimGlobalValue('bg')
        claimGlobalPreferences(['customBgName'])
        await persistBackgroundMutation(snapshot)
        return { ok: true, view: view() }
      }
      case 'bg-clear-custom': {
        const snapshot = captureBackgroundMutationSnapshot()
        if (s && typeof s.bg === 'string' && s.bg.startsWith('data:')) s.bg = null
        const p = ensurePreferences()
        p.customBgName = ''
        bumpBackgroundRevision()
        claimGlobalValue('bg')
        claimGlobalPreferences(['customBgName'])
        await persistBackgroundMutation(snapshot)
        return { ok: true, view: view() }
      }
      case 'cg-gallery': {
        return {
          items: allCgs().filter((cg: any) => cg.status === 'ready' && cg.dataUrl).map((cg: any) => ({
            id: cg.id,
            status: cg.status,
            prompt: cg.prompt,
            charId: cg.charId,
            name: ROSTER[cg.charId] ? effectiveProfileFor(cg.charId).displayName : cg.charId,
            level: cg.level,
            at: cg.at,
            seen: cg.seen === true,
            savedAsBg: cg.savedAsBg === true,
            error: cg.error || null,
            // Kept so the gallery can separate SFW from NSFW without trusting a
            // runtime flag the user can flip after the picture exists.
            nsfw: cg.nsfw === true,
            label: cg.label || '',
            backend: cg.backend || '',
          })),
        }
      }
      case 'cg-data': {
        const id = shortSetting(args && args.id)
        const cg = id ? findCg(id) : null
        if (!cg || cg.status !== 'ready' || typeof cg.dataUrl !== 'string' || !cg.dataUrl.startsWith('data:')) {
          return { ok: false, error: 'CG 不存在或尚未生成完成' }
        }
        // The gallery list stays lightweight; multi-megabyte image payloads
        // are returned only when the client explicitly opens one CG.
        return {
          ok: true,
          id: cg.id,
          status: cg.status,
          dataUrl: cg.dataUrl,
          prompt: cg.prompt,
          charId: cg.charId,
          name: ROSTER[cg.charId] ? effectiveProfileFor(cg.charId).displayName : cg.charId,
          level: cg.level,
          at: cg.at,
          seen: cg.seen === true,
          savedAsBg: cg.savedAsBg === true,
        }
      }
      case 'cg-ack': {
        const cg = args && typeof args.id === 'string' ? findCg(args.id) : currentCg()
        if (cg) cg.seen = true
        await save('global')
        return view()
      }
      case 'cg-save-bg': {
        const cg = args && typeof args.id === 'string' ? findCg(args.id) : currentCg()
        let snapshot: any = null
        if (s && cg && cg.status === 'ready' && cg.dataUrl) {
          snapshot = captureBackgroundMutationSnapshot()
          for (const item of allCgs()) item.savedAsBg = item.id === cg.id
          cg.seen = true
          s.bg = 'cg:' + cg.id
          ensurePreferences().customBgName = ''
          bumpBackgroundRevision()
          claimGlobalValue('bg')
          claimGlobalPreferences(['customBgName'])
        }
        if (snapshot) await persistBackgroundMutation(snapshot)
        else await save('global')
        return view()
      }
      case 'cg-clear-bg': {
        let snapshot: any = null
        if (currentStateBacking()) {
          snapshot = captureBackgroundMutationSnapshot()
          s.bg = null
          for (const cg of allCgs()) cg.savedAsBg = false
          ensurePreferences().customBgName = ''
          bumpBackgroundRevision()
          claimGlobalValue('bg')
          claimGlobalPreferences(['customBgName'])
        }
        if (snapshot) await persistBackgroundMutation(snapshot)
        else await save('global')
        return view()
      }
      case 'pet-set': {
        ensureState()
        const p = ensurePreferences()
        if (args && typeof args.enabled === 'boolean') p.petEnabled = args.enabled
        if (args && typeof args.enabled === 'boolean') claimGlobalPreferences(['petEnabled'])
        await save('global')
        return view()
      }
      case 'reset': {
        ensureState()
        for (const id of ROSTER_IDS) {
          s.characters[id].level = 1
          s.characters[id].affection = 0
        }
        const now = Date.now()
        if (splitStorageActive()) globalState.relationshipLastActiveAt = now
        else if (s.tokens) s.tokens.lastActiveAt = now
        // “重新开始”只重置关系进度。CG、立绘、角色设定、背景、
        // preferences，以及各工作区的聊天/任务上下文全部保留。
        if (splitStorageActive()) ensureGlobalMigrationState().claims.relationshipReset = true
        await save(splitStorageActive() ? 'global' : 'both')
        return view()
      }
      default:
        return view()
    }
  }

  async function handleAction(action: string, args: any): Promise<any> {
    if (!splitStorageActive()) {
      if ((action.startsWith('persona-')&&action!=='persona-settings-get') || action.startsWith('gal-') || action.startsWith('scene-layout-') || (action.startsWith('asset-') && action !== 'asset-prompt-polish')) return runSerializedStateTask(() => dispatchAction(action, args))
      if (action !== 'chat') return dispatchAction(action, args)
      return runSerializedChatTask(null, () => dispatchAction(action, args))
    }

    await ensureGlobalReady()
    const sessionId = args && typeof args.sessionId === 'string' ? args.sessionId.trim() : ''
    const explicitCharacterId = shortSetting(args && (args.characterId || args.charId))
    const hasExplicitCharacter = !!ROSTER[explicitCharacterId]
    const globalReadOnly = new Set([
      'persona-settings-get',
      'view',
      'model-options',
      'settings-get',
      'profile-get',
      'profile-preview',
      'sprite-data',
      'bg-data',
      'cg-gallery',
      'cg-data',
      'image-status',
      'image-generate',
      'image-prompt-suggest',
    ])
    const globalWithoutWorkspace = new Set([
      'persona-settings-set','persona-preset-save','persona-preset-delete',
      'settings-set',
      'profile-set',
      'profile-reset',
      'sprite-upload',
      'sprite-clear',
      'sprite-set-builtin',
      'bg-upload',
      'bg-clear-custom',
      'cg-ack',
      'cg-save-bg',
      'cg-clear-bg',
      'cg-generate',
      'cg-generate',
      'traits-set',
      'pet-set',
      'reset',
    ])
    const explicitCharacterGlobal = hasExplicitCharacter && new Set([
      'profile-set',
      'profile-reset',
      'sprite-upload',
      'sprite-clear',
      'sprite-set-builtin',
      'cg-generate',
      'traits-set',
    ]).has(action)
    let runtime: any
    let unresolvedSession = false
    if (!sessionId && (globalReadOnly.has(action) || globalWithoutWorkspace.has(action) || explicitCharacterGlobal)) {
      runtime = makeWorkspaceRuntime('', 'global-read')
    } else {
      const descriptor = await workspaceForSession(sessionId)
      runtime = await ensureWorkspaceReady(descriptor.root, descriptor.key)
      unresolvedSession = !!descriptor.sessionId && !descriptor.root
      if (!unresolvedSession) activateWorkspaceRuntime(runtime)
    }

    const requiresResolvedWorkspace = new Set(['chat', 'bg-set-builtin']).has(action)
      || ((!hasExplicitCharacter) && new Set([
        'profile-set',
        'profile-reset',
        'sprite-upload',
        'sprite-clear',
      ]).has(action))
    if (!sessionId && !hasExplicitCharacter && new Set([
      'profile-set',
      'profile-reset',
      'sprite-upload',
      'sprite-clear',
    ]).has(action)) {
      const isolatedView = workspaceStateContext.run(runtime, () => view(false))
      return {
        ok: false,
        retryable: true,
        workspaceResolving: false,
        error: '缺少 characterId 或工作区会话；未修改任何角色数据。',
        view: isolatedView,
      }
    }
    if ((!sessionId || unresolvedSession) && requiresResolvedWorkspace) {
      const isolatedView = workspaceStateContext.run(runtime, () => view(false))
      return {
        ...isolatedView,
        ok: false,
        retryable: true,
        workspaceResolving: !!sessionId,
        error: sessionId
          ? '正在确认当前工作区，请稍后重试。此次操作未写入任何存档。'
          : '此操作需要明确的工作区会话；此次操作未写入任何存档。',
        view: isolatedView,
      }
    }
    const execute = () => workspaceStateContext.run(runtime, () => dispatchAction(action, args))
    const mutating = new Set([
      'persona-settings-set','persona-preset-save','persona-preset-delete',
      'settings-set',
      'profile-set',
      'profile-reset',
      'sprite-upload',
      'sprite-clear',
      'sprite-set-builtin',
      'bg-set-builtin',
      'bg-upload',
      'bg-clear-custom',
      'cg-ack',
      'cg-save-bg',
      'cg-clear-bg',
      'pet-set',
      'reset',
    ])
    if (action === 'chat' || action === 'side-story') return runSerializedChatTask(runtime, execute)
    return (mutating.has(action) || action.startsWith('gal-') || action.startsWith('scene-layout-') || (action.startsWith('asset-') && action !== 'asset-prompt-polish')) ? runSerializedStateTask(execute) : execute()
  }

  if (webServer && typeof webServer.register === 'function') {
    const allowedMedia=new Set<string>(ART_PACKS.files as readonly string[])
    const mediaRoot=join(dirname(fileURLToPath(import.meta.url)),'../assets/packs')
    webServer.register({kind:'prefix',path:'/whale-galgame-media',handler:async(req:any,res:any)=>{
      if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return}
      let key=''
      try{key=decodeURIComponent(new URL(req.url,'http://localhost').pathname.slice('/whale-galgame-media/'.length))}catch{}
      const defaultFile=key.startsWith('default/')?key.slice('default/'.length):''
      if(!allowedMedia.has(key)&&!(DEFAULT_ART_FILES as readonly string[]).includes(defaultFile)){res.writeHead(404);res.end();return}
      const file=defaultFile?join(mediaRoot,'../default',defaultFile):join(mediaRoot,key)
      try{const bytes=await nativeReadFile(file);res.writeHead(200,{'Content-Type':key.endsWith('.webp')?'image/webp':key.endsWith('.svg')?'image/svg+xml':key.endsWith('.woff2')?'font/woff2':/\.jpe?g$/.test(key)?'image/jpeg':'image/png','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:bytes)}
      catch{res.writeHead(404);res.end()}
    }})

    webServer.register({
      kind: 'prefix',
      path: '/whale-galgame-api',
      handler: async (req: any, res: any) => {
        if (req.method !== 'POST') {
          res.writeHead(req.method === 'GET' ? 200 : 405, { 'Content-Type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ ok: true, service: 'dsh-whale-galgame' }))
          return
        }
        try {
          const parts: Buffer[] = []
          let totalBytes = 0
          for await (const c of req) {
            const chunk = Buffer.isBuffer(c) ? c : Buffer.from(typeof c === 'string' ? c : String(c), 'utf8')
            totalBytes += chunk.length
            if (totalBytes > MAX_API_BODY_BYTES) {
              res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8' })
              res.end(JSON.stringify({ error: '请求体过大；上传图片请控制在 18MB 以内' }))
              return
            }
            parts.push(chunk)
          }
          const raw = parts.length ? Buffer.concat(parts).toString('utf8') : ''
          const body = raw ? JSON.parse(raw) : {}
          const action = typeof body.action === 'string' ? body.action : 'view'
          const result = await handleAction(action, body.args || {})
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify(result))
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ error: err && err.message ? err.message : String(err) }))
        }
      },
    })
  }

  ctx.effect(() => {
    void ensureReady().catch((err: any) => {
      console.error('whale-galgame initial state load failed:', err && err.message ? err.message : String(err))
    })
  })

  // ---- standalone GAL page ------------------------------------------------
  // A loopback door (default http://127.0.0.1:9988) that serves the same client
  // bundle in its own window: `dist/client.js` is the game in both places and the
  // page reaches this host over the very same /whale-galgame-api route.
  //
  // It starts only when the host actually listens, because unit-test fixtures
  // hand apply() a stub webServer with no port — a fixture must never bind a
  // socket. Set `standalonePort: 0` in the plugin config to keep it off
  // entirely; a port that is already taken is logged and never affects the
  // plugin's own routes.
  const standalonePort = (() => {
    if (config.standalonePort === undefined) return STANDALONE_DEFAULT_PORT
    const raw = Number(config.standalonePort)
    return Number.isInteger(raw) && raw >= 0 && raw <= 65535 ? raw : STANDALONE_DEFAULT_PORT
  })()
  const listeningPort = (() => {
    const raw = Number(webServer && typeof webServer === 'object' ? webServer.port : NaN)
    return Number.isInteger(raw) && raw > 0 && raw <= 65535 ? raw : 0
  })()

  /**
   * The page's only handoff. It answers even with no session at all (the title
   * screen works unscoped), and it carries ids and paths only — never a
   * credential, a token or a transcript.
   */
  async function standaloneContext(): Promise<any> {
    const rows: any[] = []
    try {
      if (sessionsSvc && typeof sessionsSvc.list === 'function') {
        const live = sessionsSvc.list()
        if (Array.isArray(live)) rows.push(...live.map(headerFromSessionRow))
      }
    } catch (err) { /* fall through to the persisted listing */ }
    if (rows.length === 0) {
      try {
        if (sessionQuery && typeof sessionQuery.listSessions === 'function') {
          const persisted = await withTimeout(Promise.resolve(sessionQuery.listSessions()), SESSION_LOOKUP_TIMEOUT_MS, [] as any[])
          if (Array.isArray(persisted)) rows.push(...persisted.map(headerFromSessionRow))
        }
      } catch (err) { /* an unreadable listing still yields the title screen */ }
    }
    const sessions: any[] = []
    const seen = new Set<string>()
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue
      const id = typeof row.id === 'string' ? row.id.trim().slice(0, 240) : ''
      if (!id || seen.has(id)) continue
      seen.add(id)
      sessions.push({
        id,
        title: typeof row.title === 'string' ? row.title.slice(0, 120) : (typeof row.name === 'string' ? row.name.slice(0, 120) : ''),
        cwd: typeof row.cwd === 'string' ? row.cwd.slice(0, 400) : '',
        updatedAt: Number.isFinite(Number(row.updatedAt)) ? Number(row.updatedAt)
          : Number.isFinite(Number(row.updated_at)) ? Number(row.updated_at)
            : Number.isFinite(Number(row.lastActiveAt)) ? Number(row.lastActiveAt) : 0,
      })
    }
    sessions.sort((left: any, right: any) => (right.updatedAt || 0) - (left.updatedAt || 0))
    const current = sessions.length > 0 ? sessions[0] : null
    return {
      ok: true,
      standalone: true,
      variant: 'tab',
      sessionId: current ? current.id : null,
      workspace: workspaceRoot() || (current && current.cwd) || null,
      sessions: sessions.slice(0, 20),
    }
  }

  if (standalonePort > 0 && listeningPort > 0) {
    ctx.effect(() => {
      let handle: any = null
      try {
        handle = startStandaloneGal({
          port: standalonePort,
          upstreamPort: listeningPort,
          clientRoot: dirname(fileURLToPath(import.meta.url)),
          getContext: standaloneContext,
          onError: (error: any) => {
            console.error('whale-galgame standalone page error:', error && error.message ? error.message : String(error))
          },
        })
      } catch (err: any) {
        console.error('whale-galgame standalone page failed to start:', err && err.message ? err.message : String(err))
        return () => {}
      }
      void handle.ready.catch((err: any) => {
        console.error(
          'whale-galgame standalone page could not listen on 127.0.0.1:' + standalonePort + ':',
          err && err.message ? err.message : String(err),
        )
      })
      return () => { void handle.close() }
    }, 'dsh-whale-galgame: standalone page')
  }
}
