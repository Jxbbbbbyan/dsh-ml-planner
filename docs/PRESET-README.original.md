# 智能规划模式（router-planner）

**智能路由 × 规划模式（dsh-plans）合二为一**的 DSH 代理预设。

## 组成

- **规划工作流**（源自 [Optim-Agent/dsh-plans](https://github.com/Optim-Agent/dsh-plans)）：
  planning-first persona、五个规划技能（create-a-small-plan / create-a-plan /
  create-a-big-plan / diagnose-before-plan / reference-before-plan）、
  `dsh-plans/` 下的 Markdown 计划工件（PLAN_vN.md / DECISIONS.md）、
  reviewer/criticizer 子代理轮（`run_plan_subagent`，只读）、显式交接后以
  DSH goal 执行（ponytail + MVP 最小测试 + Verifier Checklist）。内置
  plan mode 保持禁用（工件规划替代它）。
- **智能路由**（源自 [dsh-routing-suite](https://github.com/yjh051108/dsh-routing-suite)
  的 router-standard，本预设为定制版）：任务自动分类（构建→react 执行带 /
  修复→spec 规划带 / 模糊→weak 内路由），每条真实用户消息后注入对应行为带
  的**规划向近距离引导**（深度自适应：简单快收敛、复杂深思考），首轮工具面
  = 行为带核心 ∪ {skill, ask_user_question}，首次持久 tool/call 后放开完整
  Standard 目录。路由**不替换 persona**（规划纪律由 persona 驱动）。

## 目录

```
router-planner/
├── agent.cordis.yml                # 组合（dsh-plans 底座 + 路由行）
├── preset.yml                      # 选择器显示名/简介
├── router-planner-bootstrap.mjs    # 路由插件（planner 模式）
├── router-planner-core.mjs         # 路由核心（分类 + 三带引导）
├── lib/plan-subagents.js           # run_plan_subagent（评审子代理）
├── scripts/                        # dsh_plans_state.py 等状态脚本
└── skills/                         # 五个规划技能 + 规范参考
```

## 安装

1. 解压本目录到 `~/.dsh/.agent-presets/router-planner`（Windows：
   `%USERPROFILE%\.dsh\.agent-presets\router-planner`）；
2. （可选）重启 DSH 后新建会话，选择器里选择「智能规划模式 (Smart Planner)」；
3. 发任务即走：规划技能 → PLAN 工件 → 评审轮 → 人在回路批准 → goal 执行。
   对会话说 `dev_router_status` 可查看路由状态。

> 预设即装即用、无需重启（roster 即时发现）。配套注入器
> （dsh-super-injector，提供 dev_* 生产线工具）如需安装见其官方 Release。

## 本机兼容补丁（针对 DSH 0.1.5-rc.2）

本目录中的 `agent.cordis.yml` / `router-planner-core.mjs` /
`router-planner-bootstrap.mjs` 在安装时做过兼容修正。原始包在本机 DSH 上
**无法产生任何一轮对话**，修正点如下：

| # | 位置 | 问题 | 修正 |
|---|------|------|------|
| 1 | `agent.cordis.yml` persona 行 | `dsh-persona` 已不接受 `text` 字段（要求 `prefix`），挂载直接被拒 | 改用 `prefix`，人设文本原样保留 |
| 2 | `router-planner-core.mjs` `sessionMode()` / `router-planner-bootstrap.mjs` 首轮裁剪 | 当前 `Session` 只暴露 `seq` / `eventAt()` / `snapshotEvents()`，没有 `events` 数组；旧代码每次 assembly 都读 `session.events`，抛 `TypeError`，会话连一轮都跑不起来 | 新增版本兼容的日志读取（`firstUserTextOf`）与增量 `createToolCallTracker()` |
| 3 | `router-planner-bootstrap.mjs` `firstUserText` | 把**原始用户文本**当 mode 用（`bandOf(text)` → `clamp01` → 0），首条消息之后所有 assembly 都退化成 spec 带，智能路由实际失效 | 改存 `classifyTask(text)` 的分类结果 |
| 4 | `router-planner-bootstrap.mjs` 引导注入 | 在 `session/event` 观察者里 `inbox.append` 会被 `session append cannot reenter while another append is being published` 拒绝，而裸 `catch {}` 把它吞掉了——近距离引导从未生效 | 改为 `session/event` 只暂存、`agent/pre-step` 瀑布负责注入（与 stock model-switch notice 同一机制） |
| 5 | `agent.cordis.yml` | `coreFor('weak')` 声明 `str_replace_editor`，但组合里没有这一行；每条消息的首个 assembly 发生在用户消息落盘之前，必然是 weak 带，于是首轮工具面只剩 `skill/ask_user_question/pwsh` | 补上 `@deepseek-ai/dsh-tool-str-replace-editor` 行 |

安装/更新过本目录的文件后**需要重启 DSH 宿主**：`.mjs` 走 Node 的 ESM
缓存，进程内重新挂载不会重新加载改动过的模块。

自检（不需要启动宿主）：

```bash
node scripts/selftest.mjs           # 40 项检查：分类、引导、assembly、工具面、评审子代理
python scripts/validate_preset.py   # 原作者的结构校验
```

> 已知行为：每条消息的**第一个** assembly 跑在用户消息写入会话日志之前
> （事件顺序 `step/start → 消息落盘 → assembly`），因此那一轮的首个工具面
> 永远是 weak 带；分类后的行为带工具面与近距离引导从该轮的下一个 step 生效。
> 这是宿主时序，不是本预设的缺陷。

