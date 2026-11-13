# 原作、作者与二次魔改记录

DSHGAL 是个人学习性质的二次魔改，主要基于 JAdpp 的 dsh-whale-galgame。独立窗口、现有素材整合、后端适配与工程整理是本仓库的后续改动；不把上游引擎、角色设计或依赖库宣称为从零原创。后续维护与公开整理账号：[AndrossiKSL](https://github.com/AndrossiKSL)。

## 程序、插件和宿主

| 来源 | 作者 / 版权记录 | 使用与修改 | 许可证据 |
| --- | --- | --- | --- |
| [dsh-whale-galgame](https://github.com/JAdpp/dsh-whale-galgame) | JAdpp | GAL 引擎、角色与阅读器基础；本仓库增加独立桌面窗口、素材整合与宿主适配 | [原声明副本](third_party/upstream/dsh-whale-galgame-LICENSE.md)、[原素材来源记录](third_party/upstream/dsh-whale-galgame-NOTICE.md)；程序主体 MIT |
| [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) | DeepSeek | 默认宿主，通过官方插件接口对接；不附带整个宿主或凭据 | [MIT 副本](third_party/upstream/deepseek-harness-LICENSE.txt) |
| [Hermes Agent](https://github.com/NousResearch/hermes-agent) | Nous Research | 可选后端，通过 ACP 对接；接收方自行安装与登录 | [MIT 副本](third_party/upstream/hermes-agent-LICENSE.txt) |
| [dsh-deep-whale / maid-atelier](https://github.com/Small-tailqwq/dsh-deep-whale/tree/main/maid-atelier) | Small-tailqwq；角色链见下文 | 鲸鱼娘与深海宫殿等素材，保留抠图、表情及导出说明 | [原许可](assets/default/licenses/dsh-deep-whale-LICENSE.txt)、[原署名链](assets/default/licenses/dsh-deep-whale-NOTICE.txt) |
| [dsh-deepseek-girl-pet](https://github.com/Chih-Kai-Wang/dsh-deepseek-girl-pet) | 历史账号 f0909172434；现仓库 Chih-Kai-Wang；原版权行保持 f0909172434 | 桌宠动画、跟随与图集；修改集成和点击行为 | [MIT 原文](assets/default/licenses/dsh-deepseek-girl-pet-LICENSE.txt) |
| dsh-gal-ds | 安装包署名 dsh-gal-ds contributors；未附可核实的独立公开仓库地址 | 只复用三套无文字对话框图，不分发该插件的其他本机素材 | [安装包 MIT 原文](third_party/upstream/dsh-gal-ds-LICENSE.txt) |
| [gal-view](https://github.com/Ayase34/gal-view) | Ayase34；本次获取的上游 LICENSE 版权行为 Yunicon，按原文保存 | dsh-gal-ds 的上游，保留间接来源；不混写为本仓库原创 | [上游 MIT 原文](third_party/upstream/gal-view-LICENSE.txt) |
| [配套 dsh-character-party](integrations/dsh-character-party/README.md) | 现有本地工作项目的后续配套工坊 | 独立保存的工坊集成；保留原 package 元数据和来源说明 | [DISTRIBUTION.md](integrations/dsh-character-party/DISTRIBUTION.md)；UNLICENSED，主项目 MIT 不覆盖它 |

## 角色、插画与背景

鲸鱼娘完整链：**[上善](https://www.pixiv.net/users/62155430) → [ZipZipPipe](https://www.pixiv.net/users/18604994) → [Small-tailqwq](https://github.com/Small-tailqwq/dsh-deep-whale)**。不能省掉原始角色作者。原作和衍生素材按 CC BY-NC-SA 4.0 保留署名、非商业与相同方式共享条件。

| 人物或素材 | 署名与出处 | 说明 |
| --- | --- | --- |
| DeepSeek 鲸鱼娘 | 上述完整署名链 | 包含沿用、抠图、表情与 AI 辅助改绘，处理不改变上游条件 |
| Claude、GPT、Gemini、Kimi、Grok 默认图 | JAdpp 项目原有非官方 AI 辅助素材；当前包的后续生成与整理 | 保留上游默认图的 CC BY-NC-SA 4.0 边界，不冒称厂商官方人物 |
| GLM、Qwen、MiniMax、Seed、Llama、Mistral、Hunyuan 及多个人物扩展 | [ZipZipPipe](https://space.bilibili.com/4168597)、[发布动态](https://www.bilibili.com/opus/1236803362705375305) | 当前部分图为后续 AI 改绘；未核实到统一标准授权，不能据此改标 CC0/MIT 或授予商用权 |
| MiMo、StepFun 原始人物资料 | 甶丶：[MiMo](https://www.bilibili.com/opus/1242097128919007239)、[StepFun](https://www.bilibili.com/opus/1250303372583501829) | 导入记录中的作者声明为 CC BY-NC，未注明版本；保留该记录，不擅自改写为 4.0 |
| 文心设定补全 | [lmy414 / ai-chan-sheets](https://github.com/lmy414/ai-chan-sheets)，基础人物设计来源按其版权记录 | AI 补全参考并非原作者确认的完整设定；上游记录为非商业 CC BY-NC-SA 4.0 |
| Perplexity、RWKV、Image 2、JEV、ComfyUI 与 Codex 扩展设计 | ZipZipPipe / 社区资料整理，具体导入记录见 [历史来源表](third_party/upstream/dsh-whale-galgame-NOTICE.md) | Codex 原始社区设计署名未完整核实；明确保留这一缺口，不臆造作者或统一许可 |
| 动作、服装、三套群像、场景与潮汐信号 UI | 本地已完成素材的 AI 辅助生成与整理；原生文件名与哈希见 [art-import.json](docs/art-import.json) | 复用当前冻结快照，不上传个人生产目录；人物设计沿用上述来源边界 |
| 三套旧对话框 | dsh-gal-ds contributors → Ayase34 / gal-view | MIT 版权原文见程序表 |

## 字体与库

- 字体：Google / Adobe 的 [Noto Serif SC](https://github.com/google/fonts/tree/main/ofl/notoserifsc)，当前 UI 使用其改名子集 Atelier Serif UI。保留 [SIL OFL 1.1](assets/packs/signal/assets/fonts/OFL.txt) 与 [处理来源](assets/packs/signal/assets/fonts/font-source.json)。
- React / React DOM：Meta / Facebook 及 React contributors，负责界面和渲染，按安装版本的 MIT 文本保存。
- Electron：Electron contributors，桌面运行时；同时包含 Chromium、Node.js 及其各自第三方组件。运行时原有许可证不被本项目替换。
- electron-builder、tsdown / Rolldown、Lightning CSS 等：版本、仓库、用途和许可见 [完整锁定依赖清单](third_party/DEPENDENCIES.md)。构建依赖和运行依赖明确标注。
- 原始许可证文件保存在 [third_party](third_party/)，不能仅用一句“感谢开源”替代需要随包保留的版权文本。

上述记录描述本仓库实际的来源与改动范围，不代表原作者为本次二次魔改背书。若有署名遗漏或来源错误，请联系本仓库维护者更正。
