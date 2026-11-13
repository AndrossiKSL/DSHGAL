# 把本包交给 Agent 部署

将完整分享包解压，把下面这段发给接收方的 Agent：

> 请阅读解压后 DSHGAL 目录的 AGENTS.md 和 DEPLOY_WITH_AGENT.md，检查我已经安装的 DSH 或 Hermes，复用已有登录和模型配置，部署并验证这个工具。默认使用 DSH；我只有 Hermes 时使用 Hermes。不要重新生图，不要覆盖已有凭据、存档或其他 Agent 配置。请给出最终入口和真实验收结果。

## 1. 检查本包

完整包的 `deployment-manifest.json` 标为 `edition: complete`，包含前端、引擎、当前美术、UI 和配套工坊。需要 Node.js 22.19+ 或 24+。源码代码包不含美术和 dist，不能直接替代完整包部署。

`node deploy/install.mjs` 会逐文件核对分享包 SHA256。部署期间只写 `.local/` 和接收方指定的 DSH profile，不修改素材。已有完整包无需 `npm install`。

## 2. DSH（默认）

先找到接收方的官方 DSH CLI 入口。`dsh` 启动器可定位到 `@deepseek-ai/dsh/lib/bin.js`，若脚本未能自动识别，传 `--dsh-entry` 指定真实入口。接收方可使用自己的 profile 与端口，示例只采用常见的 web / 3080。

```sh
node deploy/install.mjs --backend dsh --profile web --dsh-entry PATH_TO_DSH_BIN_JS --dry-run
node deploy/install.mjs --backend dsh --profile web --dsh-entry PATH_TO_DSH_BIN_JS
```

脚本从预构建产物生成 npm 插件包，包含配套角色工坊，使用官方命令 `dsh plugin --profile web add <本地包> --ignore-scripts` 安装。无需从其他人的电脑路径取源码，也无需另外寻找工坊插件。

安装后 `dshRestartRequired: true` 表示 DSH 需重启加载插件。Agent 应检查该 profile 是否有进行中的工作，再安全重启；本脚本不会批量杀进程。随后验证 DSH 原端口的 `/whale-galgame-api` 和 `/character-party-api`，以及独立工具 `/health`。`--skip-plugin-install` 仅供已确认相同版本完整安装的环境使用。

## 3. Hermes

```sh
node deploy/install.mjs --backend hermes --model-url http://127.0.0.1:8645/v1 --model YOUR_MODEL --dry-run
node deploy/install.mjs --backend hermes --model-url http://127.0.0.1:8645/v1 --model YOUR_MODEL
```

工作委托使用本机 `hermes acp`；安装脚本会做实际协议握手。命令不在 PATH 时传 `--hermes-command` 指定可执行文件。

剧情生成需要 OpenAI 兼容文本接口。Agent 应先检查接收方已有的可用接口和模型；如果使用 Hermes proxy，先根据该安装版本支持的上游配置并启动，再填准确的模型名称，不能把示例 YOUR_MODEL 当成真实模型。缺少推理服务、账号权限或登录时，需要接收方补齐后才能完成联网生成验收。Key 只通过服务端环境变量 `WHG_MODEL_API_KEY` 提供，不写进本包。

## 4. 完成部署

默认入口 `http://127.0.0.1:9987/`，连接设置 `/connection`，Hermes 工作记录 `/agent`。端口冲突时传 `--port` 换端口，不终止无关程序。

脚本默认隐藏启动前端，将日志和进程信息放到 `.local/`。`--no-start` 可只安装和写配置，再前台运行 `node apps/standalone/server.mjs --port 9987`。已存在同一实例时会报告是否需要前端重启，不能把旧进程当成新配置已生效。

验收至少包括：health 后端正确、标题与角色素材可加载、模型连接成功、一次普通剧情及存读档、所选后端的 Agent 会话续接。先用空白测试存档或测试目录，不改接收方正式进度。明确区分协议握手、模型生成和真实工具执行的结果。
