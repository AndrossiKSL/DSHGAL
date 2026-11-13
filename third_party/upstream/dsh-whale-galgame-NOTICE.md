# Notices, asset map, and credits

## Public-distribution boundary

This public repository includes the exact 65 default image files used by the installed plugin: the original 22-file pack plus 43 added by the extended roster. It does not include a placeholder-art substitute.

It does **not** include a maintainer or user save, dialogue history, generated CG, uploaded background, uploaded character sprite, API key, or private source-art collection. Those remain local user data and are outside this distribution.

## Extended roster art

The installed plugin ships twenty-two roles. The sixteen added by the extended
roster use **third-party AI-gijinka illustrations**, not project-owned artwork;
eight of the original roles also gain alternate published appearances. Each
sprite is a cut-out of one published standing illustration (background removed,
cropped, resized, encoded to WebP — no redrawing, no design changes). Each
role's backdrop is generated from that same sprite by the pipeline described in
[`docs/extended-roster.md`](docs/extended-roster.md).

| Roles | Source | Author | Licence status |
| --- | --- | --- | --- |
| GLM, Qwen, MiniMax, Seed, Llama, Mistral, Hunyuan | `01_作者发布立绘/<role>/` standing art | ZipZipPipe — [Bilibili](https://space.bilibili.com/4168597) · [Pixiv](https://www.pixiv.net/artworks/148186519) | Author states the works are open to sharing and derivative work; no uniform standard licence was verified, so this is *not* inferred as CC0/MIT |
| Alternate appearances of the six original roles | same collection (ZipZipPipe designs) + `06_扩展角色与服装版本/deepseek/` | ZipZipPipe | as above |
| MiMo | `01_作者发布立绘/mimo/fuh-bilibili-1242097128919007239-01.png` | 甶丶 — [submission](https://www.bilibili.com/opus/1242097128919007239) | Author-declared **CC BY-NC**; no version stated, not restated as 4.0 |
| StepFun | `01_作者发布立绘/stepfun/stepfun-portrait-{lamp,umbrella}.png` | 甶丶 (AI-assisted) — [submission](https://www.bilibili.com/opus/1250303372583501829) | Author-declared **CC BY-NC**; no version stated |
| Perplexity, RWKV, Image 2, JEV, ComfyUI | `06_扩展角色与服装版本/<role>/` art, plus the ComfyUI illustration filed under `claude/` | ZipZipPipe (per the aggregator) — [opus](https://www.bilibili.com/opus/1236803362705375305) | Aggregator copy; a sharing/derivative statement is *not* a uniform commercial licence |
| Wenxin | `05_AI补全设定图_非作者原稿/wenxin/横版完整设定图_01_三视图_原图.png` | lmy414 (AI completion) over ZipZipPipe's design — [repo](https://github.com/lmy414/ai-chan-sheets) | Upstream marks **CC BY-NC-SA 4.0** (derivative work) |
| Codex | `02_作者发布三视图/codex/gpt-codex-reference.webp` | a community design (per the original post) | aggregator terms unverified, as above |
| Dialogue skins (`ui-dialogue-*`) | `gal-scene.json` inside the installed `dsh-gal-ds` plugin | dsh-gal-ds project art (ComfyUI-generated) | dsh-gal-ds is MIT and is itself a derivative of gal-view (MIT). Three label-free skins are carried over; the fourth shipped frame has its action labels painted in and is deliberately not used. |

Notes that matter before redistributing or publishing anything:

- The reference collection these files came from states plainly that it is **not** a uniform commercial licence pack. Check each author's current statement first.
- The Wenxin sprite is cut from an **AI-completed reference sheet**, not an author-confirmed original design; treat her outfit details as provisional.
- The Codex sprite is cut from a three-view board (native ≈516 × 1001) and is the lowest-resolution file in the pack by a wide margin.
- The ComfyUI illustration is filed under `claude` in the reference library, but the hard hat and tool bag read "comfyui": it is the ComfyUI mascot, so it ships as its own role rather than as a Claude outfit.
- These files are added for a local build. They do not broaden, replace or extend any original author's terms.
- `scripts/release-audit.mjs` keeps these 43 files in a separate `extensionArtKeys` list: their presence and file hygiene are verified, but they are deliberately excluded from the hash manifest that pins the 22 project images.

## Whale-girl attribution chain

The whale-girl material follows this attribution chain:

1. **上善** — creator of the original 鲸鱼娘 / whale-girl character: [Pixiv](https://www.pixiv.net/users/62155430) · [Bilibili](https://space.bilibili.com/4456176).
2. **ZipZipPipe** — creator of the maid whale-girl redesign that added DeepSeek elements: [Pixiv](https://www.pixiv.net/users/18604994) · [Bilibili](https://space.bilibili.com/4168597).
3. **Small-tailqwq / dsh-deep-whale** — publisher of the open-source `maid-atelier` skin, including the deep-sea palace background, whale-girl standing sprite, UI decorations, and the preserved attribution chain: [GitHub repository](https://github.com/Small-tailqwq/dsh-deep-whale) · [`maid-atelier` directory](https://github.com/Small-tailqwq/dsh-deep-whale/tree/main/maid-atelier).
4. **dsh-whale-galgame** — prepared eight additional expression images from the credited whale-girl material for this plugin.

This chain is distributed under CC BY-NC-SA 4.0. Preserve the full attribution, use the material only on the license's noncommercial terms, and license adaptations under the same terms. The upstream license and notice copies are preserved at [`assets/default/licenses/dsh-deep-whale-LICENSE.txt`](assets/default/licenses/dsh-deep-whale-LICENSE.txt) and [`assets/default/licenses/dsh-deep-whale-NOTICE.txt`](assets/default/licenses/dsh-deep-whale-NOTICE.txt).

## File-by-file map of the 22 bundled images

Files 1–10 and 12–22 are distributed under CC BY-NC-SA 4.0. File 11 is copied from `dsh-deepseek-girl-pet` and remains under its MIT License. For project-produced, AI-assisted images, the CC grant applies only to the extent the maintainer holds the applicable rights.

| # | File | Source and role | Modifications in this distribution |
| ---: | --- | --- | --- |
| 1 | `assets/default/maid-left.webp` | `dsh-deep-whale / maid-atelier`; DeepSeek whale-girl default standing sprite | Byte-identical export of the upstream runtime asset; filename and runtime key are documented here. |
| 2 | `assets/default/palace-night.webp` | `dsh-deep-whale / maid-atelier`; default deep-sea palace background | Byte-identical export of the upstream runtime asset; filename and runtime key are documented here. |
| 3 | `assets/default/whale-cheerful.webp` | Project-prepared cheerful expression in the whale-girl chain | Full-resolution 935 × 1682 transparent WebP (lossy q95) used by the plugin's expression system. |
| 4 | `assets/default/whale-shy.webp` | Project-prepared shy expression in the whale-girl chain | Full-resolution 935 × 1682 transparent WebP (lossy q95) used by the plugin's expression system. |
| 5 | `assets/default/whale-serious.webp` | Project-prepared serious expression in the whale-girl chain | Full-resolution 935 × 1682 transparent WebP (lossy q95) used by the plugin's expression system. |
| 6 | `assets/default/whale-confused.webp` | Project-prepared confused expression in the whale-girl chain | Full-resolution 935 × 1683 transparent WebP (lossy q95) used by the plugin's expression system. |
| 7 | `assets/default/whale-angry.webp` | Project-prepared angry expression in the whale-girl chain | Full-resolution 935 × 1683 transparent WebP (lossy q95) used by the plugin's expression system. |
| 8 | `assets/default/whale-frightened.webp` | Project-prepared frightened expression in the whale-girl chain | Full-resolution 935 × 1683 transparent WebP (lossy q95) used by the plugin's expression system. |
| 9 | `assets/default/whale-exasperated.webp` | Project-prepared exasperated expression in the whale-girl chain | Full-resolution 935 × 1682 transparent WebP (lossy q95) used by the plugin's expression system. |
| 10 | `assets/default/whale-starry.webp` | Project-prepared starry-eyed expression in the whale-girl chain | Full-resolution 935 × 1682 transparent WebP (lossy q95) used by the plugin's expression system. |
| 11 | `assets/default/pet-spritesheet.webp` | [`f0909172434/dsh-deepseek-girl-pet`](https://github.com/f0909172434/dsh-deepseek-girl-pet); 8-column × 11-row desktop-pet atlas under MIT | Byte-identical to upstream `assets/spritesheet.webp` (SHA-256 `234f24a97c18195a00c6093da0090773e675993c169e92e7e13a24c37b323fa2`); the image itself is unmodified. |
| 12 | `assets/default/claude-amber-manuscript-mediator-v5.webp` | Unofficial Claude-inspired, AI-assisted project artwork | Exported as a 1024 × 1536 runtime WebP (lossy q95) and assigned to the Claude role; it does not reproduce an official character design or exact logo. |
| 13 | `assets/default/gpt-recursive-weaver-v7.webp` | Unofficial GPT-inspired, AI-assisted project artwork | Exported as a 1024 × 1536 runtime WebP (lossy q95) and assigned to the GPT role; it does not reproduce an official character design or exact logo. |
| 14 | `assets/default/gemini-dual-prism-translator-v4.webp` | Unofficial Gemini-inspired, AI-assisted project artwork | Exported as a 1024 × 1536 runtime WebP (lossy q95) and assigned to the Gemini role; it does not reproduce an official character design or exact logo. |
| 15 | `assets/default/kimi-lunar-scroll-navigator-v5.webp` | Unofficial Kimi-inspired, AI-assisted project artwork | Exported as a 1024 × 1536 runtime WebP (lossy q95) and assigned to the Kimi role; it does not reproduce an official character design or exact logo. |
| 16 | `assets/default/grok-cosmic-signal-ranger-v5.webp` | Unofficial Grok-inspired, AI-assisted project artwork | Exported as a 1024 × 1536 runtime WebP (lossy q95) and assigned to the Grok role; it does not reproduce an official character design or exact logo. |
| 17 | `assets/default/bg-deepseek-seaside-study.webp` | New, unofficial DeepSeek whale-girl background created for this project with AI assistance | Exported as a 1586 × 992 WebP (lossy q95) and offered as the built-in seaside-study alternative to the upstream deep-sea palace. |
| 18 | `assets/default/bg-claude-writing-study.webp` | New, unofficial Claude-inspired background created for this project with AI assistance | Exported as a 1586 × 992 WebP (lossy q95) and assigned as the Claude role's built-in default background. |
| 19 | `assets/default/bg-gpt-collaboration-workshop.webp` | New, unofficial GPT-inspired background created for this project with AI assistance | Exported as a 1586 × 992 WebP (lossy q95) and assigned as the GPT role's built-in default background. |
| 20 | `assets/default/bg-gemini-twin-creative-studio.webp` | New, unofficial Gemini-inspired background created for this project with AI assistance | Exported as a 1586 × 992 WebP (lossy q95) and assigned as the Gemini role's built-in default background. |
| 21 | `assets/default/bg-kimi-moonlit-reading-study.webp` | New, unofficial Kimi-inspired background created for this project with AI assistance | Exported as a 1586 × 992 WebP (lossy q95) and assigned as the Kimi role's built-in default background. |
| 22 | `assets/default/bg-grok-electronics-studio.webp` | New, unofficial Grok-inspired background created for this project with AI assistance | Exported as a 1586 × 992 WebP (lossy q95) and assigned as the Grok role's built-in default background. |

The six role backgrounds were copied from the project's approved source-art set using this explicit allowlist. Non-visual WebP metadata chunks (`ICCP`, `EXIF`, `XMP `) are removed without recompressing their image data; no generation prompt, local path, author/software field, or other source-directory file is distributed with them.

The exported file list is reproducible from the embedded runtime data with `npm run export:art`. [`assets/default/README.md`](assets/default/README.md) records the corresponding runtime keys. The same image payloads are embedded as data URLs in `src/client/art.generated.ts` and `lib/client.js`; each payload retains the license listed here, while the surrounding program code remains under MIT.

## Galgame interface

The Galgame interface layout, frames, controls, dialogue presentation, and current React/CSS implementation were produced for this unofficial project with AI assistance and are covered by this repository's MIT license. The visual direction retains and adapts decorative ideas made available by the `dsh-deep-whale / maid-atelier` skin, while the public plugin has no separate hidden UI-image pack.

This interface is not official artwork, a product partnership, or an endorsement from DeepSeek, Claude, OpenAI, Google, Moonshot AI, xAI, or any related company.

## Desktop-pet source

[f0909172434 / dsh-deepseek-girl-pet](https://github.com/f0909172434/dsh-deepseek-girl-pet) is the direct source of this plugin's desktop-pet feature and atlas. The upstream state animation, 16-direction pointer tracking, 1.1-second reset behavior, and 8 × 11 sprite atlas were adapted for this plugin. The integration and styling were changed, and clicking the pet now opens the Galgame interface.

The upstream repository uses the MIT License, Copyright (c) 2026 f0909172434. Its text is preserved at [`assets/default/licenses/dsh-deepseek-girl-pet-LICENSE.txt`](assets/default/licenses/dsh-deepseek-girl-pet-LICENSE.txt). The atlas in this repository is byte-identical to the upstream file; no separate Hatch Pet or `dsh-pet` asset claim is made here.

## Documentation screenshots

The screenshots under `docs/screenshots/` are captures of the plugin running in DSH Web, not hand-drawn or generated interface mockups. `galgame-overview.jpg` keeps the surrounding DSH Web sidebar and top navigation in frame; no replacement UI was drawn over the capture.

- `docs/screenshots/galgame-overview.jpg` shows the running Galgame view with the default whale-girl sprite and deep-sea palace background. The pictured artwork remains under CC BY-NC-SA 4.0.
- `docs/screenshots/plugin-settings.png` shows the real DSH Web plugin-settings dialog. DSH Web and visible surrounding components remain subject to their own licenses.

Inclusion in a screenshot does not relicense any pictured work.

## Friendly links

- Star [Small-tailqwq / dsh-deep-whale](https://github.com/Small-tailqwq/dsh-deep-whale) for the open-source deep-sea palace background, whale-girl standing sprite, UI decoration work, and attribution record.
- Star [f0909172434 / dsh-deepseek-girl-pet](https://github.com/f0909172434/dsh-deepseek-girl-pet) for the open-source desktop-pet implementation and animation atlas used by this plugin.
- See [Ayase34 / gal-view](https://github.com/Ayase34/gal-view) and [Lanxing6480 / dsh-galgame](https://github.com/Lanxing6480/dsh-galgame) for two other open-source approaches to Galgame presentation in the DSH ecosystem.
- Follow 上善 on [Pixiv](https://www.pixiv.net/users/62155430) or [Bilibili](https://space.bilibili.com/4456176), and ZipZipPipe on [Pixiv](https://www.pixiv.net/users/18604994) or [Bilibili](https://space.bilibili.com/4168597).

Please send plugin installation, runtime, or compatibility reports to [dsh-whale-galgame Issues](https://github.com/JAdpp/dsh-whale-galgame/issues), not to the artists.

## Product and trademark notice

DeepSeek, DeepSeek Harness, Claude, ChatGPT, GPT, Gemini, Kimi, Grok, and all related names and marks belong to their respective owners. This community plugin is unofficial and is not endorsed by, affiliated with, or partnered with those owners.


## 工坊统一美术版（2026-11-08）

新增六主角站姿及其同源头像、六张故事 CG、工坊昼夜与湖畔背景由 Codex 内置 image_gen 创作。角色设计参考本地素材库的 ZipZipPipe 社区 AI 娘系列；DeepSeek 原型为上善无形、女仆二次设计为 ZipZipPipe。沿用已有参考设计的来源与署名链，不声称改绘消除了上游条件。旧独立设计及其 CG 继续作为可选旧版保留。运行时映射与改动见 docs/atelier-edition.md，CG 制作提示词见 docs/atelier-art-provenance.json。
