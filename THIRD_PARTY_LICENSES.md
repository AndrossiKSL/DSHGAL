# 第三方许可索引

主程序沿用 [JAdpp 原项目](https://github.com/JAdpp/dsh-whale-galgame) 的 MIT，完整主许可见 [LICENSE.md](LICENSE.md)。本文件仅是索引，不能覆盖其他组件或图片的条件。

| 分类 | 证据 |
| --- | --- |
| 插件、宿主、设计作者与具体修改 | [CREDITS.md](CREDITS.md) |
| 原 GAL 项目许可与原素材来源表 | [third_party/upstream](third_party/upstream) |
| 鲸鱼娘链 CC BY-NC-SA 4.0 与桌宠 MIT | [assets/default/licenses](assets/default/licenses) |
| 三套对话框的 dsh-gal-ds MIT | [原许可](third_party/upstream/dsh-gal-ds-LICENSE.txt) |
| dsh-gal-ds 的上游 gal-view MIT | [原许可](third_party/upstream/gal-view-LICENSE.txt) |
| 字体 SIL OFL 1.1 | [OFL.txt](assets/packs/signal/assets/fonts/OFL.txt)、[font-source.json](assets/packs/signal/assets/fonts/font-source.json) |
| 精确版本的直接与传递依赖 | [DEPENDENCIES.md](third_party/DEPENDENCIES.md)、[机器可读清单](third_party/dependencies.json) |
| 当地已安装依赖随附的版权文本 | [third_party/npm](third_party/npm) |
| Electron / Chromium 运行时随附声明 | [third_party/runtime](third_party/runtime)；同样放入桌面包的 resources/licenses |
| 配套工坊的独立许可边界 | [DISTRIBUTION.md](integrations/dsh-character-party/DISTRIBUTION.md)，保留 UNLICENSED |

用 `node scripts/collect-third-party.mjs` 从锁文件和已安装包更新依赖清单；没有本机副本的平台可选包会明确说明来源缺口，不伪造版权人或许可证。外部 DSH / Hermes 宿主不随 EXE 整体打包，但仍列出对接来源。
