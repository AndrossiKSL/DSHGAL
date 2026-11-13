# Bundled default art

This directory contains the exact 65 image files embedded in
`src/client/art.generated.ts` and `lib/client.js`: the original 22-file pack plus
43 added by the extended roster (16 role sprites, 16 generated backdrops, and 11
alternate appearances of existing roles). Run `npm run export:art` from the
repository root to reproduce the files from the runtime data URLs. Only this
allowlisted set is part of the default art pack.

## Runtime assets

| Runtime key | File | Purpose |
| --- | --- | --- |
| `pet-spritesheet` | `pet-spritesheet.webp` | 8 × 11 desktop-pet animation atlas |
| `maid-left` | `maid-left.webp` | DeepSeek / whale-girl default standing sprite |
| `whale-cheerful` | `whale-cheerful.webp` | Cheerful expression variant |
| `whale-shy` | `whale-shy.webp` | Shy expression variant |
| `whale-serious` | `whale-serious.webp` | Serious expression variant |
| `whale-confused` | `whale-confused.webp` | Confused expression variant |
| `whale-angry` | `whale-angry.webp` | Angry expression variant |
| `whale-frightened` | `whale-frightened.webp` | Frightened expression variant |
| `whale-exasperated` | `whale-exasperated.webp` | Exasperated expression variant |
| `whale-starry` | `whale-starry.webp` | Starry-eyed expression variant |
| `palace-night` | `palace-night.webp` | Default deep-sea palace background |
| `bg-deepseek-seaside-study` | `bg-deepseek-seaside-study.webp` | Optional DeepSeek / whale-girl seaside-study background |
| `bg-claude-writing-study` | `bg-claude-writing-study.webp` | Claude writing-study default background |
| `bg-gpt-collaboration-workshop` | `bg-gpt-collaboration-workshop.webp` | GPT collaboration-workshop default background |
| `bg-gemini-twin-creative-studio` | `bg-gemini-twin-creative-studio.webp` | Gemini twin creative-studio default background |
| `bg-kimi-moonlit-reading-study` | `bg-kimi-moonlit-reading-study.webp` | Kimi moonlit reading-study default background |
| `bg-grok-electronics-studio` | `bg-grok-electronics-studio.webp` | Grok electronics-studio default background |
| `claude-amber-manuscript-mediator-v5` | `claude-amber-manuscript-mediator-v5.webp` | Claude-inspired role sprite |
| `gpt-recursive-weaver-v7` | `gpt-recursive-weaver-v7.webp` | GPT-inspired role sprite |
| `gemini-dual-prism-translator-v4` | `gemini-dual-prism-translator-v4.webp` | Gemini-inspired role sprite |
| `kimi-lunar-scroll-navigator-v5` | `kimi-lunar-scroll-navigator-v5.webp` | Kimi-inspired role sprite |
| `grok-cosmic-signal-ranger-v5` | `grok-cosmic-signal-ranger-v5.webp` | Grok-inspired role sprite |

## Sources and modifications

- `maid-left.webp` and `palace-night.webp` are redistributed from the
  [`dsh-deep-whale / maid-atelier`](https://github.com/Small-tailqwq/dsh-deep-whale/tree/main/maid-atelier)
  skin. They are byte-identical to the upstream standing sprite and night
  background.
- The eight `whale-*.webp` files are full-resolution transparent expression
  variants (935 × 1682/1683) created from the credited maid whale-girl design
  for this plugin.
- `pet-spritesheet.webp` is a byte-identical copy of
  [`f0909172434/dsh-deepseek-girl-pet`](https://github.com/f0909172434/dsh-deepseek-girl-pet)'s
  `assets/spritesheet.webp` (SHA-256
  `234f24a97c18195a00c6093da0090773e675993c169e92e7e13a24c37b323fa2`).
  It remains under the upstream MIT License. This plugin modifies the pet's
  integration and interaction, not the atlas image itself.
- The Claude-, GPT-, Gemini-, Kimi-, and Grok-inspired standing sprites are
  unofficial, AI-assisted concept art created for this project. They do not
  contain or reproduce official model-company artwork or exact logos.
- The six `bg-*.webp` role backgrounds are new, AI-assisted project artwork.
  Claude, GPT, Gemini, Kimi, and Grok use their matching background by default.
  DeepSeek keeps the upstream deep-sea palace as its default, with the new
  seaside-study scene available as a built-in alternative. A user-uploaded
  background or a saved CG overrides the current role's built-in background
  until the user restores a built-in choice.
- The Galgame interface itself is React/CSS source under `src/client/index.ts`;
  there is no separate hidden UI image pack.

## Extended roster art

This local build adds sixteen more roles and gives eight existing roles a second
(or fourth) published appearance. Their sprites and backdrops also live here, and
they are **not** project-owned artwork: each sprite is cut from a third-party
AI-gijinka illustration and each backdrop is generated from that same sprite. See
[`docs/extended-roster.md`](../../docs/extended-roster.md) for the per-file
source, author, licence status and the generation pipeline, and `NOTICE.md` for
the summary.

Sprites (transparent, height-normalised to 1700 px):

| Runtime key | Role |
| --- | --- |
| `glm-zodiac-archivist-v1` | GLM · 墨岚 |
| `qwen-lakeside-scribe-v1` | Qwen · 千翎 |
| `minimax-clapper-reporter-v1` | MiniMax · 螺音 |
| `seed-starbean-cultivator-v1` | Seed · 星豆 |
| `llama-wool-dormouse-v1` | Llama · 茸茸 |
| `mistral-baguette-knight-v1` | Mistral · 薇尔 |
| `hunyuan-abacus-keeper-v1` | 混元 · 元清 |
| `mimo-bunny-mechanic-v1` | MiMo · 米兔 |
| `stepfun-cube-lantern-guide-v1` | StepFun · 星阶 |
| `perplexity-starstaff-seeker-v1` | Perplexity · 佩丝 |
| `rwkv-vine-scribe-v1` | RWKV · 青薇 |
| `image2-obsidian-dragon-painter-v1` | GPT Image 2 · 玄羽 |
| `jev-balance-arbiter-v1` | JEV · 杰芙 |
| `wenxin-halcyon-proofreader-v1` | 文心一言 · 温言 |
| `codex-watercolor-dragon-v1` | Codex · 砚雪 |
| `comfyui-neon-rewiring-v1` | ComfyUI · 霓霓 |

Backdrops (1586 × 992, generated from the role's own default sprite):

| Runtime key | Room label |
| --- | --- |
| `bg-glm-fox-archive-vault` | 狐影典藏室 |
| `bg-qwen-lakeside-fan-parlor` | 湖心折扇斋 |
| `bg-minimax-clapper-newsroom` | 场记编辑室 |
| `bg-seed-starbean-greenhouse` | 星芽温室 |
| `bg-llama-wool-nook` | 羊绒小窝 |
| `bg-mistral-bakery-bastion` | 红帽面包房 |
| `bg-hunyuan-abacus-accounts-room` | 算珠账房 |
| `bg-mimo-bunny-workshop` | 兔子机械间 |
| `bg-stepfun-geometry-gallery` | 几何陈列厅 |
| `bg-perplexity-star-chart-atrium` | 星图天井 |
| `bg-rwkv-vine-conservatory` | 藤蔓长廊 |
| `bg-image2-ink-dragon-studio` | 墨龙画室 |
| `bg-jev-scales-tribunal` | 天平议事厅 |
| `bg-wenxin-halcyon-ward` | 静养书房 |
| `bg-codex-watercolor-atelier` | 水彩雕版室 |
| `bg-comfyui-neon-rewiring` | 霓虹布线间 |

All added roles also list the shared `palace-night` hall as a second built-in
background option.

Alternate appearances (`sprites` variants A/B/C/D — sprite only, no backdrop,
see the role's `sprites` list in `src/index.ts`):

| Runtime key | Role · slot |
| --- | --- |
| `whale-maid-short-skirt-v1` | 鲸鱼娘 · B |
| `whale-maid-original-dress-v1` | 鲸鱼娘 · C |
| `whale-maid-harness-v1` | 鲸鱼娘 · D |
| `whale-maid-court-dress-v1` | 鲸鱼娘 · E |
| `claude-zipzippipe-baseline-v1` | 克洛德 · B |
| `gpt-white-dragon-v1` | 小吉 · B |
| `gemini-twintail-catgirl-v1` | 双子 · B |
| `kimi-baseline-veil-v1` | 月见 · B |
| `grok-blonde-battleaxe-v1` | 洛可 · B |
| `llama-casual-dress-v1` | 茸茸 · B |
| `stepfun-square-umbrella-v1` | 星阶 · B |

A variant wears the room of the role it belongs to, so it ships no backdrop of
its own.

`scripts/art-manifest.mjs` is the single list of bundled keys; `embed:art`,
`export:art` and `prune:art` all read it, so the three cannot drift apart.
`scripts/release-audit.mjs` keeps an independent copy on purpose: it hash-pins
the 22 original project images and separately asserts that the 43 extension files
are present and carry no WebP metadata, without claiming them as project assets.

The whale-girl attribution chain is 上善 → ZipZipPipe → Small-tailqwq. Twenty-one
bundled default images are released under CC BY-NC-SA 4.0, with project-made
assets covered to the extent the maintainer holds applicable rights. The pet
atlas remains under its upstream MIT License. Code, UI source, and documentation
remain under MIT. See [`NOTICE.md`](../../NOTICE.md),
[`LICENSE.md`](../../LICENSE.md), and the preserved upstream texts in
[`licenses/`](licenses/) before redistributing or modifying these files.


### 工坊统一美术版

137 项清单中新增 atelier-sprite-* 六角色、bg-atelier-night/day；portrait-* 六主角头像与 cg-* 六主角 CG 更新为统一人物设计，旧 CG 保存在 legacy-cg-*。其余核心文件保留原字节。新默认 A、旧 A 与原有其他外观的兼容处理见 ../../docs/atelier-edition.md。
