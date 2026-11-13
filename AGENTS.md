# DSHGAL Agent 工作指南

本目录是 DSHGAL 的开发与部署根目录。收到「部署」请求时先读 `DEPLOY_WITH_AGENT.md`；收到开发请求时先读 `docs/ARCHITECTURE.md`。

- 默认后端 DSH，可选 Hermes。复用用户已有的安装、登录、凭据和模型配置，不重新安装或升级整个 Agent。
- 完整分享包已包含当前美术和 `dist/`，部署无需 npm install、重新生图或源码构建。
- 使用 `node deploy/install.mjs --help` 查看部署参数。先 dry-run，核对目标 profile、端口和后端，再执行同一组参数。
- 只允许通过 DSH 官方 plugin 管理命令安装附带插件。不要覆盖已有 profile 配置、用户凭据、游戏存档或 Agent 记忆，不使用跳过权限的开关。
- 模型 key 仅来自接收方已有凭据或服务端环境变量；不得输出、打包或写进 Git。需要额外登录或模型权限时，明确说明缺少哪一项，不虚构成功。
- DSH 正在执行其他工作时不强制终止。安装后需要重启时，先核对该 profile 的工作状态，只重启目标服务。
- 本地配置、存档、日志和进程信息保存在 `.local/`；分享包和 Git 都排除它。临时脚本放到当前环境指定的临时目录。
- 当前美术是冻结快照。新生产素材之后另行同步；本次部署不得自动扫描、替换或重新生成美术。
- 保留存档使用的角色、动作、素材与 API 标识。素材通过 `assets/packs/manifest.json` 和 SHA256 校验后接入，不再内嵌大段图片。
- 开发后执行 `npm run verify`。生成分享包执行 `npm run package:share`，交付 `artifacts/` 中的完整 ZIP 和校验文件。
- 桌面窗口在 `apps/desktop`，开发使用 `npm run desktop`，制作 Windows 便携版使用 `npm run package:desktop`。Electron 只载入本应用地址，保持渲染器隔离、沙箱开启和 Node 权限关闭。
- 便携版用户数据在 EXE 旁的 `DSHGAL-data/`；不提交、不封包。桌面应用退出仅关闭自有服务，不结束已有 DSH/Hermes 宿主。发布前检查真实 EXE 启动、全屏、设置持久化和窗口关闭。
- 配套工坊源码位于 `integrations/dsh-character-party`，原许可声明保留；不要把所有代码和图片统一改标为 MIT。
- 不读取或修改本仓库以外的新美术生产目录。以当前目录为后续二次开发基线。
- 公开上传按 docs/PUBLISHING.md 创建白名单快照，保留 CREDITS.md 和 third_party 中的原署名，不把本机完整 Git 历史或 DSHGAL-data 上传。EXE 与完整 ZIP 作为 Release 附件。
- 新素材或代码进入桌面版需要重新封包；README 更新本身不需要。素材许可变更必须进入下一份分发物。完整流程见 docs/UPDATING.md。
- GitHub 用户名、提交署名和 noreply 邮箱也要检查个人信息；含旧身份的历史或发布附件只保留在私有归档。公开前同时检查提交对象和实际 EXE/ZIP，不能只修改最新 README。
