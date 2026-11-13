# 独立运行

Node.js 22.19+。源码开发执行 `npm ci`；带 dist 的本地发布包解压后可直接 `npm start`，无生产 npm 依赖。

```sh
npm start
npm start -- --backend dsh --dsh-port 3080 --port 9987
npm start -- --backend hermes --model-url http://127.0.0.1:8645/v1 --model YOUR_MODEL
```

首次打开 `http://127.0.0.1:9987/connection` 选择后端。9987 为独立工具端口，保留原 DSH 插件的 9988。只有回环监听；不支持直接开放公网。

## DSH（默认）

先启动已安装 GAL 和角色工坊插件的 DSH。独立工具只反代固定游戏接口与工坊接口，使用本项目自己的前端和美术。游戏存档和 Agent 执行均由 DSH 持有，原插件页面可以继续使用。连接失败会显示错误，不会伪造生成结果。

完整分享包已在 integrations/dsh-character-party 保存配套工坊源码。部署脚本将它装入本地 GAL 插件包的 bundledDependencies；接收方无需另找源码。其原许可元数据保持不变，详见组件 DISTRIBUTION.md。

## Hermes（可选）

游戏逻辑和存档在本工具内运行，不需要 DSH 进程。工作委托通过 `hermes acp`：创建或加载原生会话、接收文本更新、展示一次性权限选项、取消和续接。编辑保持 Hermes 默认确认模式，不切换到自动授权模式。Hermes 的工具权限由 Hermes 执行；本工具不把项目目录视为额外文件沙箱。

剧情生成独立使用 OpenAI 兼容文本接口（不发送工具定义）。可用已配置的 Hermes proxy，或自行指定模型接口。`hermes proxy` 是订阅推理转发器，不提供 Agent 工具；可用上游取决于 Hermes 安装版本。需要 API key 时只设置服务端环境变量 `WHG_MODEL_API_KEY`，不在连接页、浏览器或源码写 key。

Agent 工坊入口是阅读页「工坊委托」，也可访问 `/agent`。选择已有项目、角色并提交委托。服务重启后未完成记录标为中断，用户提交续接才加载原会话，不自动重放工具写入。

## 数据位置

默认项目 `.local/`，可用 `--data-dir` 改到自己的数据目录：

- `config.json`：后端、端口、剧情模型接口与模型名称，无 key。
- `hermes/storages/dsh-whale-galgame/global.json`：Hermes 模式游戏存档。
- `agent-threads.json`：Agent 会话 ID、输出和委托状态，包含用户工作信息，不应分享。

DSH 模式仍由原 DSH 数据目录持有存档。本工具不会复制原存档、凭据或历史对话。切换后端会看到各自的进度。更换已启动的 Hermes 模型连接需要重启进程。

## 美术导入与验证

```sh
npm run import:art -- --asset-root PATH_TO_PROCESSED_ART --portrait-source PATH_TO_NATIVE_PORTRAITS --ui-source PATH_TO_NATIVE_UI
node scripts/sync-signal-ui.mjs PATH_TO_APPROVED_UI
npm run verify
```

原始生图用于来源索引，运行只导入经 manifest 验证的 WebP/UI 资产。计划中的未生成素材不会被计为成品。保留原始动作 ID、透明通道及 1024×1536 / (512,1500) 锚点。

`WHG_HERMES_COMMAND` 或 `--hermes-command` 可指定 Hermes 可执行文件。`WHG_SSH_CONFIG` 可指定个人生图 SSH 配置；独立版默认关闭生图，启用由用户配置服务。开发需要 sourcemap 时设置 `WHG_SOURCEMAP=1`，发布包拒绝 map 文件。
