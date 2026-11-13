# 开发目录与边界

```text
DSHGAL/
  apps/desktop/               Electron 主进程、原生窗口与便携数据路径
  apps/standalone/             独立 HTTP 服务、后端连接、ACP 工坊、连接页
  src/                        剧情引擎、人格、世界线、DSH 插件宿主
    client/                   React 游戏前端、阅读器与游戏 UI
  assets/
    default/                  素材键映射的角色、头像、背景与许可
    packs/                    完整动作、场景、UI、服装、媒体清单及哈希
  integrations/
    dsh-character-party/      配套 DSH 角色工坊源码与测试
  deploy/                     接收方环境检查、安装和后台启动
  dist/                       预构建产物；完整分享包可直接运行
  build/                      构建工具配置
  scripts/                    素材导入、资源准备、校验和封包工具
  test/                       主项目回归测试
  docs/                       当前架构、部署、素材同步和验收文档
    history/                  历史设计记录；不随分享包分发
  artifacts/                  ZIP、桌面 EXE、发布清单和 SHA256；不入 Git
  .local/                     本机配置、存档、日志与部署记录；不分享
```

目录已经分开源码、运行素材、构建产物、集成和用户数据。为保证旧存档与 API 兼容，没有重命名资源键和角色动作 ID。大型宿主文件仍保留现有接口；后续拆分应以回归测试与存档迁移为边界。

开发执行 `npm ci`、`npm run verify`；封包执行 `npm run package:share`。配套工坊测试也包含在 verify 中。完整分享 ZIP 带预构建文件，不需要安装开发依赖；源码二次开发则需要构建依赖。

桌面版将同一 HTTP 服务嵌入 Electron 主进程，使用独立游戏窗口加载本机地址，无需启动外部 Node 或浏览器。`tsdown.config.ts` 同时产出三个服务端辅助模块，避免依赖 Electron 直接执行 TypeScript。DSH 插件入口仍是 `dist/index.js`，桌面封包通过 extraMetadata 单独指定入口，互不替换。

便携版使用 EXE 旁的 `DSHGAL-data/`；开发桌面版和网页版使用项目 `.local/`。桌面端记住所用回环端口以保留浏览器设置；端口占用时自动选择可用端口，不中断占用它的进程。关闭窗口会关闭自有服务和 ACP 连接，已有 Agent 宿主继续运行。

2.2.1 完成布局与部署链路，2.2.2 新增 Windows 便携 EXE。开发桌面版执行 `npm run desktop`，构建执行 `npm run package:desktop`，使用与验收见 DESKTOP.md。新生成的美术不在本轮自动导入，后续按 ASSET-SYNC.md 更新。
