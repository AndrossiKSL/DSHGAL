# 本机 Agent 路由核查

核查日期：2026-11-09。只读检查本机安装、提供器代码及官方文档；测试提示固定，不读取用户文件或会话。实际连接结果与可选目录分开。

## 当前实测

- DSH 的 ChatGPT (Codex) 分组来自原生 `openai-codex` 提供器。其目录由已安装模型清单生成，可以在推理失败时仍显示。GPT-6 Sol 的独立测试失败，原生提供器返回 `fetch failed`；尚未定位为具体的网络、代理或服务端问题，未改动系统代理、Codex 代理或用户模型配置。
- GO Plan 先前 K3.1 Pro、Grok 4.7、HY4、Qwen3.8 Max 的真实连接，以及 K3.1 Pro 工具往返通过；这不证明 Codex 分组和其他所有型号都通。
- 本机 WorkBuddy 5.4.4 随附官方 CLI，支持 `--acp`、`--print`、`--output-format stream-json` 与 `--serve`。本次使用 ACP 连接官方 CLI，完成初始化和临时会话创建。
- WorkBuddy 内置 Auto 实际返回 OK，stopReason=end_turn，服务端报告 prompt_tokens=3385、completion_tokens=3、credit=0.05。未查询赠送/付费积分明细或剩余余额。关闭了文件工具、MCP、用户/项目设置与会话持久化，使用固定系统和用户提示。

- 补充指定型号实测：`kimi-k3.1-pro` 与 `hy4std`（HY4）均以该模型作为会话 currentModel 返回 OK/end_turn，没有回退 Auto；本次固定提示调用分别报告 1.15 和 0.6 积分。这是具体测试用量，不是每次请求的固定单价。证明 WorkBuddy 后端可逐角色指定型号；其他目录项仍需分别验证。

## 接入方式

0.3 已注册 WorkBuddy 执行后端。WorkBuddy 是完整 Agent 执行器，不应把 ACP 地址当成 OpenAI `/chat/completions` 接口填入。

角色配置分为角色身份、执行后端（DSH 原生 / 本机 WorkBuddy）和后端模型三层。角色与项目共享记忆仍由工坊按任务最小范围注入；WorkBuddy 会话 ID、取消、进展和成果按 ACP 映射；权限请求需交给用户或拒绝，不能默认放行。固定提示连通验证与实际工作权限验证分别进行。

WorkBuddy 内置 Auto/平台模型使用其账号积分。`custom-local:` 等自定义模型走用户配置的外部服务；选择它们不表示可用 WorkBuddy 赠送积分抵扣第三方账单。已经注册为模型目录的 workbuddy 来源，可指定给任意角色。

## 官方参考

- [ACP 集成](https://www.workbuddy.cn/docs/cli/acp)
- [Headless 模式](https://www.workbuddy.cn/docs/cli/headless)
- [HTTP API](https://www.workbuddy.cn/docs/cli/http-api)
- [WorkBuddy 自定义模型](https://www.workbuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Model)

未部署逆向网关、未导出桌面账号凭据、未做自动积分任务或后台轮询领取。

## 0.3 实际工作验证

DSH 原生 K3.1 Pro 及 WorkBuddy Auto 均完成真实项目 README 读取和第二轮原会话续接。WorkBuddy 第二轮通过 session/load 恢复原会话，未静默退回新会话。双方来源、用量、工作线程和回信均写入工坊记录。权限受工作区边界、只读任务限制和单次工具审批约束。
