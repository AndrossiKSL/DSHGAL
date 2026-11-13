/**
 * Single source of truth for the bundled default art pack.
 *
 * Every bundled file is `<key>.webp`, so the key alone identifies the file. This
 * matters more than it looks: embed-art, export-art and prune-art each carried
 * their own copy of this map, and a key present in one list but not another
 * silently dropped art from the build instead of failing it. One list, three
 * consumers.
 *
 * `release-audit.mjs` deliberately keeps its own independent copy (with hashes):
 * a release gate must not trust the same list it is verifying.
 */
export const DEFAULT_ART_KEYS = [
  'ensemble-cover-a',
  'ensemble-cover-b',
  'ensemble-cover-c',
  // Unified six-heroine edition; original appearances remain available.
  'legacy-cg-deepseek',
  'legacy-cg-claude',
  'legacy-cg-chatgpt',
  'legacy-cg-gemini',
  'legacy-cg-kimi',
  'legacy-cg-grok',

  'atelier-sprite-deepseek',
  'atelier-sprite-claude',
  'atelier-sprite-chatgpt',
  'atelier-sprite-gemini',
  'atelier-sprite-kimi',
  'atelier-sprite-grok',
  'bg-atelier-night',
  'bg-atelier-day',

  // Original pack.
  'pet-spritesheet',
  'maid-left',
  'whale-cheerful',
  'whale-shy',
  'whale-serious',
  'whale-confused',
  'whale-angry',
  'whale-frightened',
  'whale-exasperated',
  'whale-starry',
  'palace-night',
  'bg-deepseek-seaside-study',
  'bg-claude-writing-study',
  'bg-gpt-collaboration-workshop',
  'bg-gemini-twin-creative-studio',
  'bg-kimi-moonlit-reading-study',
  'bg-grok-electronics-studio',
  'claude-amber-manuscript-mediator-v5',
  'gemini-dual-prism-translator-v4',
  'gpt-recursive-weaver-v7',
  'grok-cosmic-signal-ranger-v5',
  'kimi-lunar-scroll-navigator-v5',

  // Extended roster. Sprites are cut from the community AI-gijinka reference
  // art; each role's backdrop is generated from her own sprite. Provenance,
  // licences and the generation pipeline are recorded in NOTICE.md.
  'glm-zodiac-archivist-v1',
  'bg-glm-fox-archive-vault',
  'qwen-lakeside-scribe-v1',
  'bg-qwen-lakeside-fan-parlor',
  'minimax-clapper-reporter-v1',
  'bg-minimax-clapper-newsroom',
  'seed-starbean-cultivator-v1',
  'bg-seed-starbean-greenhouse',
  'llama-wool-dormouse-v1',
  'bg-llama-wool-nook',
  'mistral-baguette-knight-v1',
  'bg-mistral-bakery-bastion',
  'hunyuan-abacus-keeper-v1',
  'bg-hunyuan-abacus-accounts-room',
  'mimo-bunny-mechanic-v1',
  'bg-mimo-bunny-workshop',
  'stepfun-cube-lantern-guide-v1',
  'bg-stepfun-geometry-gallery',
  'perplexity-starstaff-seeker-v1',
  'bg-perplexity-star-chart-atrium',
  'rwkv-vine-scribe-v1',
  'bg-rwkv-vine-conservatory',
  'image2-obsidian-dragon-painter-v1',
  'bg-image2-ink-dragon-studio',
  'jev-balance-arbiter-v1',
  'bg-jev-scales-tribunal',
  'wenxin-halcyon-proofreader-v1',
  'bg-wenxin-halcyon-ward',
  'codex-watercolor-dragon-v1',
  'bg-codex-watercolor-atelier',
  'comfyui-neon-rewiring-v1',
  'bg-comfyui-neon-rewiring',

  // Extra published appearances of existing roles (see each role's `sprites`
  // list in src/index.ts). A variant wears the room of the role it belongs to,
  // so none of these has its own backdrop.
  'whale-maid-short-skirt-v1',
  'whale-maid-original-dress-v1',
  'whale-maid-harness-v1',
  'claude-zipzippipe-baseline-v1',
  'gpt-white-dragon-v1',
  'gemini-twintail-catgirl-v1',
  'kimi-baseline-veil-v1',
  'grok-blonde-battleaxe-v1',
  'llama-casual-dress-v1',
  'stepfun-square-umbrella-v1',
  // GALGAME dialogue skins imported from dsh-gal-ds (the three variants whose
  // action strip is NOT painted into the artwork, so real buttons can live there).
  'ui-dialogue-classic',
  'ui-dialogue-pearltide',
  'ui-dialogue-starsea',
  // GALGAME 模式：标题画面与第一章背景（Agnes 生成，视觉复核后入库）。
  'gal-title',
  'gal-ch1-bg',
  'gal-ch2-bg',
  // 每个工作日自己的场景（背景不再全在同一个房间）。
  'gal-bg-kitchen',
  'gal-bg-archive',
  'gal-bg-signal',
  'gal-bg-lake',
  'gal-bg-studio',
  'gal-bg-festival',
  // 结局 CG：A 走仙宫云（角色在场），B 走 Agnes（空店的夜）。
  'gal-ending-warm',
  'gal-ending-plain',
  // 22 位女主角各一张专属结局 CG。
  'cg-chatgpt',
  'cg-claude',
  'cg-codex',
  'cg-comfyui',
  'cg-deepseek',
  'cg-gemini',
  'cg-glm',
  'cg-grok',
  'cg-hunyuan',
  'cg-image2',
  'cg-jev',
  'cg-kimi',
  'cg-llama',
  'cg-mimo',
  'cg-minimax',
  'cg-mistral',
  'cg-perplexity',
  'cg-qwen',
  'cg-rwkv',
  'cg-seed',
  'cg-stepfun',
  'cg-wenxin',
  // 选人格用的角色半身像：从既有模型娘立绘裁出（见 _whale-tools/crop_portraits.py）。
  'portrait-chatgpt',
  'portrait-claude',
  'portrait-codex',
  'portrait-comfyui',
  'portrait-deepseek',
  'portrait-gemini',
  'portrait-glm',
  'portrait-grok',
  'portrait-hunyuan',
  'portrait-image2',
  'portrait-jev',
  'portrait-kimi',
  'portrait-llama',
  'portrait-mimo',
  'portrait-minimax',
  'portrait-mistral',
  'portrait-perplexity',
  'portrait-qwen',
  'portrait-rwkv',
  'portrait-seed',
  'portrait-stepfun',
  'portrait-wenxin',
  'whale-maid-court-dress-v1',
]

/** File name of the bundled asset for one runtime key. */
export const artFileName = (key) => `${key}.webp`

/** Runtime key of a bundled asset file, or null for a non-art file. */
export const artKeyFromFileName = (name) => (/\.webp$/i.test(name) ? name.replace(/\.webp$/i, '') : null)
