# ml-pipeline-and-invocation — 管线、门禁与调用关系

Reference for `ml-modeling-plan`. 本文件回答三件事：**管线是什么**（S0→S10 每阶段的输入、动作、出口物、门禁），
**谁调谁**（skill 工具 → SKILL.md → references；阶段 → 规则段；规划层 → `ML_BRIEF.md`；复核层 → Verifier Checklist），
**脚本与插件怎么用**（用途 / 何时调用 / 输入 / 输出 / 失败怎么办 / 不要用它做什么）。

**规则正文不在这里。** "该做什么、不该做什么"的唯一事实源是 `ml-discipline-rules.md`（文件 A，按管线阶段 P0~P10 编号）。
本文件只写**调用结构**与**顺序约束**；需要规则内容时按**阶段级引用**跳转（例：`见 ml-discipline-rules.md 的 P2 段`）。
本文件**故意不钉具体规则号** —— 规则号由文件 A 独立维护，钉号会在两文件之间产生失配，而阶段码 P0~P10 是两边共同的稳定接口。

---

## 0. 读法与适用范围

**两个模式一句话区分：**

- **ml 模式**（预设 `ml-planner`）：输入是普通数据（表格 / 图像 / 时序 / 文本），标签来自人工标注或业务系统。
- **fem-ml 模式**（预设 `fem-ml-planner`）：输入来自有限元/场求解器（Elmer `.sif` → `.vtu` → 栅格张量），标签由**网格离散化**定义。

**两模式共同适用的部分**：§2 全管线（S0~S10）、§3 全部调用关系、§4.1~4.4 与 §4.7~4.11、§7 门禁与回滚，
以及 `ml-modeling-plan` 的六项契约。**无论带不带有限元，契约先于代码这条硬约束都成立。**

**只有 fem-ml 模式额外适用的部分**：§5 差异表的 fem-ml 列、§6 全部 9 条 fem-extra 原则，以及 §4.5 的转换脚本。

**建议阅读顺序**：§1 定模式 → §2 定位当前阶段 → §3.2 查出该阶段该加载哪份 reference → §4 查出该调用哪个脚本 →
（fem 模式）§5 与 §6 逐条对照 → §7 遇门禁时的停手动作 → §8 边界。

**术语消歧（重要）。** 本文件说的"模式"指**预设**（`ml-planner` / `fem-ml-planner`，会话创建时选定）。
它和路由的**行为带**（`react` / `spec` / `weak`）是**正交的两个维度**：行为带只决定引导语气与首轮工具面
（`scripts/selftest.mjs` 的 "core: classification and guidance" 一节即验此事），
**行为带不改变管线、不改变门禁、不改变该加载哪份 reference**。不要用行为带推断模式。

---

## 1. 模式判定器：ml-planner 还是 fem-ml-planner

**按序问，命中即定。** 判定结果连同理由写进 `ML_BRIEF.md` 的"模式"栏（挂 P0 段）。

| # | 判定问句 | 命中 ⇒ 模式 | 依据类型 |
|---|---|---|---|
| Q1 | 输入是否来自求解器产物（`.vtu` / `.sif` / Elmer / Abaqus / 网格场 / 节点场 / 单元场）？ | **fem-ml** | 硬判据 |
| Q2 | 标签是否由**网格离散化**定义（在网格上取阈值 / 聚类 / 几何分段得到类别）？ | **fem-ml** | 硬判据 |
| Q3 | 是否需要方向场 / 取向场 / 轴线 / 面法向作为输入通道？ | **fem-ml** | 硬判据 |
| Q4 | 输出对象**个数**是否可变（由数据决定，不由模型结构决定）？ | 建议 fem-ml | 建议判据 |
| Q5 | 是否要求同一个模型在**小/大两档 GPU** 之间同构伸缩？ | 建议 fem-ml | 建议判据 |

**判定后各自额外加载什么：**

| 模式 | 必加载 | 追加加载 | 追加加载的内容 |
|---|---|---|---|
| ml | `skills/ml-modeling-plan/SKILL.md` + 本文件 + `ml-discipline-rules.md` | 按 §3.2 按需 | — |
| fem-ml | 同上（**全部**） | `skills/fem-ml-planning/SKILL.md` | `references/fem-algorithm-families.md`、`references/fem-dual-tier-tuning.md`、`references/fem-model-architecture.md` |

**`fem-ml-planning` 是"companion"，不是替代品**：它自己的正文要求同时加载 `ml-modeling-plan`（"Load that one too: it carries
the general discipline"）。也就是说 fem 模式 = **ml 模式 + fem 附加层**，不是另一套工作流。

> **实地核对结论（与直觉相反，必须写明）。** 我核对了两个预设的 `router-planner-core.mjs`：
> `fem` / `FEM` / `有限元` / `elmer` / `Elmer` / `vtu` **零命中**。ML 触发词表 `lib/ml-keywords.json` 里唯一与"网格"同形的是
> 中文项 `网格搜索`，它指 hyperparameter grid search，与 FEM 网格**无关**。
> 结论：**路由层不做 FEM 判定**。fem 判定只能由**预设选择**（会话创建时选 `fem-ml-planner`）+ **本节 Q1~Q5** 得出。
> 因此"当前是哪个模式"是一个**必须显式写下并记录**的判断，不能指望关键词自动分流。若 Q1~Q5 全部未命中而任务仍涉及场数据，按 ml 模式走，并在 `ML_BRIEF.md` 第 7 栏记"模式判定存疑"。

---

## 2. 管线总图（S0→S10）

```
                    ┌──────────────── fem 模式追加段 ────────────────┐
                    │  .sif → ElmerSolver → .vtu                    │
                    │        → vtu_to_tensor.py → .npz + .json       │
                    │  （VTK 解释器内跑；.npz 是唯一跨环境接口）      │
                    └───────────────────┬───────────────────────────┘
                                        │ （ml 模式从 S1 的"数据"直接进入）
S0 立项与范围 → S1 数据与标签盘点 → S2 切分设计 → S3 特征与预处理 → S4 基线与选型
   → S5 训练与调参 → S6 评估与校准 → S7 可解释性 → S8 上线口径 → S9 交付与证据 → S10 复核与回滚
                                                                          │
   任一 MUST 门禁失败 ──► 停在当前阶段 ──► 写进 ML_BRIEF.md「未测 / 冲突」栏 ──► 不前进
                                              └──（S10 回滚：回退到上一版通过门禁的出口物）
```

**出口物命名约定（本节提议，非既有工件）。** 已有工件是 `ML_BRIEF.md` / `PLAN_vN.md` / `DECISIONS.md` 与
`dsh-plans/.state/runs/<run-id>/{run.json,decisions.jsonl,subagents.jsonl,refs.jsonl}`。
本节额外用 `dsh-plans/<slug>/evidence/<阶段码>-<名称>.{md,json,png}` 存放数字与图（Verifier Checklist 的 evidence 字段指它）。
这是本文件提出的约定，评审时应作为**设计决定**核对，而不是当作既有事实。

| 阶段 | 输入 | 做什么 | 出口物（必须落盘的文件） | 门禁（不满足不得前进） |
|---|---|---|---|---|
| **S0 立项与范围** | 用户请求原文；模式判定（§1） | 定任务类型、预测对象、粒度、**预测时点**；定适用工况范围与域外声明；写非目标 | `ML_BRIEF.md` 第 1 项 + 第 7 栏（模式判定）；`PLAN_vN.md` 的 Goals / Non-Goals / Risks | 第 1 项无 "TBD"；有明确的**失效域外声明**（见 A 文件 P0 段）；范围未定不得进入 S1 |
| **S1 数据与标签盘点** | 数据路径；标签定义来源；fem 追加：`.vtu` + 转换元数据 `.json` | 数样本/特征/类型；数缺失与不均衡；**追出标签的真实来源与派生链**；fem 追加：记录 `raster_peak_retention`、掩膜覆盖率、类别数组 | `ML_BRIEF.md` 第 2 项；`evidence/S1-data-inventory.json`；fem：`evidence/S1-tensor-meta.json` | 标签来源已写明且**其派生特征未进输入**（P1 段）；fem：峰值保持率与掩膜覆盖率**逐样本**已记录，缺一不得进入 S2 |
| **S2 切分设计** | 样本清单；分组键（样件 / 算例 / 患者 / 时间） | 选切分器（时间 / 分组 / 分层）并说明"测试集要模拟谁"；定义三区划分；定义 OOF 规则；**定义预处理晚于切分的落点** | `ML_BRIEF.md` 第 2 项与第 5 项；`PLAN_vN.md` 的 Constraints；`evidence/S2-split-manifest.json`（含每样本的组键与 fold 号） | 切分单元 = 样件/算例（不是 cell / 不是时间点）；三区划分已定义；fem：按网格族分组，不得按 cell 随机（P2 段） |
| **S3 特征与预处理** | 切分清单（S2 出口物） | 把尺度敏感步骤**清单化**；预处理器入 Pipeline；缺失用掩膜而非零填；fem：方向场双角域编码、类别数组最近邻 | `ML_BRIEF.md` 第 2 项（工程落点）；`evidence/S3-preprocess-pipeline.json`（含序列化路径与拟合样本数） | 断言"预处理器 `n_samples_seen_ == len(X_train)`"可复现；fem：方向编码为**成对**通道且已声明 axial / polar（P3 段 + §6） |
| **S4 基线与选型** | S3 出口物；业务现规则 | **先跑平凡基线**并并排报；对照逐项对齐（深度 / 填充 / 预算 / 迭代）；融合与降维做消融 | `ML_BRIEF.md` 第 4 项；`evidence/S4-baseline-vs-model.json` | 平凡基线的数字**已落盘**（只在正文承诺的对照不算基线）；frozen 工作行（原阈值规则）作为**必须打败的基线**保留而非删除（P4 段） |
| **S5 训练与调参** | S4 选定模型族；S2 的验证 fold | 只在训练/验证集上调参；早停回滚 best state；报最近 N 轮变化 | `evidence/S5-runs.jsonl`（每次运行的种子 / 命令 / 指标）；`PLAN_vN.md` 的 Verification Plan | 测试集**未被触碰**（触及即作废）；收敛判据是"最近 N 轮变化 < 阈值"而非话术；argmax 贴网格边界须扩界或声明不可辨识（P5 段） |
| **S6 评估与校准** | S5 的 best state；只读一次测试集 | 算指标 + 波动区间；算逐类召回与多数类基线；算校准（覆盖率 + 宽度）；fem：报计数 MAE/RMSE 与阈值 | `evidence/S6-metrics.json` + `evidence/S6-figures/<name>.png`；`PLAN_vN.md` 的 Acceptance Criteria | 指标能看见关心的失效模式（正类预测数 > 0 的退化断言；AUC 不得低于 0.5 而不报警）；报的是**区间/多次运行**而非单点最优（P6 段 + P9 段） |
| **S7 可解释性** | S6 的模型与数据 | 算重要性并**声明 `importance_type`**；附稳定性与忠实性；注意力热图标注均匀基线 `1/L`；fem：方向场显著性用圆统计 | `evidence/S7-importance.json`；`evidence/S7-figures/*.png` | 无稳定性/忠实性证据**不得**报告重要性或 SHAP；不得把重要性措辞为因果（P7 段） |
| **S8 上线口径** | S6 指标 + S3 预处理管线 | 复用训练时预处理器参数；声明适用工况范围；定校准失败告警（窄区间 + 大误差） | `ML_BRIEF.md` 第 4 项的运营口径；`evidence/S8-serving-contract.md` | 上线路径**不重新拟合**任何预处理器参数；适用工况范围已声明（P8 段） |
| **S9 交付与证据** | S0~S8 全部出口物 | 逐条把正文/图注断言指回自己的输出；图注与代码标题一致性核对；种子与库版本入产物 | `PLAN_vN.md` 的完整稿 + Revision Ledger；`evidence/S9-provenance.json`（四种子 + 库版本） | **每条正文断言可指出证据**；凡自称"改了 X"的结论优先核对；图上模型 = 报告模型（P10 段） |
| **S10 复核与回滚** | S9 交付物；Verifier Checklist | 勾完 Checklist 每一框；不过则回退到上一版通过门禁的出口物；更新 `ML_BRIEF.md` 第 7 栏 | 勾选后的 Verifier Checklist（`PLAN_vN.md`）；`dsh-plans/.state/runs/<run-id>/{run.json,decisions.jsonl,subagents.jsonl}` | 全部勾选通过才可 `update_goal` complete；任一未过则**不得**标记完成，且在"未测 / 冲突"栏留痕（§7） |

---

## 3. 调用关系图（谁调谁）

### 3.1 主调用链

| # | 调用者 | 被调用者 | 时机与载荷 |
|---|---|---|---|
| 1 | 宿主 session 事件 | `router-planner-bootstrap.mjs` | `session/event` 只**读**（暂存首条用户消息的分类结果），`agent/pre-step` 瀑布负责**写**（把引导拼进本步消息）。在观察者里直接 `inbox.append` 会被宿主拒绝，这是本预设已知的修复点 |
| 2 | bootstrap | `router-planner-core.mjs` | `classifyTask` / `personaFor` / `coreFor` / `bandFor` / `guideFor` / `isMlText`；引导文本按行为带 × 复杂度选择，ML 命中时追加 `ML_GUIDE_BLOCK` |
| 3 | 模型（受 `ML_GUIDE_BLOCK` 指令驱动） | `skill` 工具 → `skills/<name>/SKILL.md` | ML 关键词命中后，引导文本要求"写训练代码前先加载 `ml-modeling-plan`"；规划类任务由 persona 指名五个规划技能之一 |
| 4 | `skills/<name>/SKILL.md` | `references/*.md` | 按 §3.2 的表**按需**加载；SKILL.md 是路由器，不承载深度知识 |
| 5 | 规划层 | `dsh-plans/<slug>/` 工件 | `ML_BRIEF.md`（六项契约）、`PLAN_vN.md`、`DECISIONS.md`；状态在 `dsh-plans/.state/`（私有，`init` 保证 `.gitignore` 含 `.state/`） |
| 6 | 规划层 | `run_plan_subagent` → reviewer / criticizer 子代理 | 只在"精修模式问句"已答之后派发；子代理**结构性只读**（deny 列表，见 §4.7） |
| 7 | 规划层（收尾） | `create_goal` → goal 执行 → `update_goal complete` | 仅在**显式交接问句**得到"执行"答复后；Checklist 每框通过才 complete |
| 8 | 规划层 | `scripts/dsh_plans_state.py` | 语言设置、角色模型、`start-run`、`record-subagent` 的落盘入口（§4.1） |

### 3.2 SKILL.md → references 的加载表（什么情况下加载哪个）

| 情况 | 加载 |
|---|---|
| **管线、门禁、调用关系、脚本用法、两模式差异、fem-extra 原则** | **本文件** `references/ml-pipeline-and-invocation.md` |
| **规则正文：某阶段该做什么 / 不该做什么，带类别、强度与语料反例** | **`references/ml-discipline-rules.md`**（文件 A，按 P0~P10 阶段定位） |
| 指标、阈值、校准、类别不均衡、切分纪律 | `references/ml-evaluation-and-leakage.md` |
| 特征、编码、缩放、缺失数据 | `references/ml-feature-engineering.md` |
| 训练好 / 验证差（或两者都差） | `references/ml-overfit-underfit.md` |
| 任何解释、重要性或因果措辞 | `references/ml-interpretability.md` |
| 选模型 / 比较模型族 | `references/ml-algorithm-selection.md` |
| 已点名某个族（GBDT / RF / LSTM / Transformer / SVM / KNN / 聚类 / 时序 / 增强）要该族的失效模式 | `references/ml-model-failure-modes.md` |
| 时间有序数据 | `references/ml-time-series.md` |
| 带外层搜索循环的神经架构 | `references/ml-algorithm-families.md` |
| 图像场、栅格、方向 / 取向输入 | `references/ml-spatial-and-field-inputs.md` |
| 文献**不支持**什么（防止把流行说法当结论） | `references/ml-literature-gaps.md` |
| 核查本预设自身完整性 | `references/preset-integrity-manifest.md`（清单） + §4.2（校验器） |
| 改关键词触发词 | `references/ml-keywords.md`（镜像）+ §4.8（真源） |
| **fem 模式**：求解器产物→张量、编码器选型、动态数量输出、两档 GPU 伸缩 | `skills/fem-ml-planning/SKILL.md` + 其 `references/fem-*.md` 三份 |
| 规划工作流本身（工件、交接、goal 执行） | `skills/references/dsh-planning-workflow.md` |
| 状态与配置（语言、角色模型、run 账本） | `skills/references/state-and-config.md` |
| PLAN 工件骨架 | `skills/references/plan-artifact-template.md` |
| 防腐化交接 | `skills/context-handoff/SKILL.md` |

> **落地状态说明。** 上表包含本文件与文件 A 两行，但 `skills/ml-modeling-plan/SKILL.md` 的 §3 路由表**当前尚未收录这两行**
> —— 需由主代理统一新增（本文件不自行修改 SKILL.md）。在本轮交付完成前，这两份 reference 只能被**显式路径**引用。

### 3.3 阶段 → 规则段映射表（S0~S10 × P0~P10）

S 码 = 本文件的**执行阶段**；P 码 = `ml-discipline-rules.md` 的**规则阶段**。两者一一对应，但 S 是"什么时候做"、P 是"按什么规则判"。

| 执行阶段 | 必读规则段（`ml-discipline-rules.md`） | 该段主导的类别家族 | 本阶段典型 MUST 门禁主题 |
|---|---|---|---|
| S0 | **P0 段** | `SCOPE` | 适用工况范围与失效域外声明；量纲与尺度敏感性声明 |
| S1 | **P1 段** | `SCOPE` / `ENG` | 标签即网格（评估域不能是网格）；标签来源场量不得进输入；掩膜而非零填 |
| S2 | **P2 段** | `LEAK` | 预处理晚于切分；超参只用训练/验证选；OOF；`bfill` 禁用；按谁切分的选型 |
| S3 | **P3 段** | `ENG` | 预处理器入 Pipeline 并序列化；填补统计量只来自训练集；尺度敏感步骤清单化 |
| S4 | **P4 段** | `BASE` | 先跑平凡基线并并排报；对照逐项对齐；基线必须落盘；融合/降维消融 |
| S5 | **P5 段** | `DIAG` | argmax 贴边界；报 CV 与测试差值；早停回滚 best state；收敛判定 |
| S6 | **P6 段** | `METRIC` | 指标能看见失效模式；不均衡口径；校准覆盖率 + 宽度；别只看 RMSE；显著性判定 |
| S7 | **P7 段** | `DIAG` | 重要性声明 `importance_type`；稳定性/忠实性；注意力热图 `1/L` 基线 |
| S8 | **P8 段**（+ 复用 **P6 段**校准口径） | `SCOPE` | 复用训练时预处理器参数；适用工况范围；校准失败告警 |
| S9 | **P10 段**（+ **P9 段**记录口径） | `EVIDENCE` / `REPRO` | 每条断言指向自己的输出；图上模型 = 报告模型；色标可判读；图注一致 |
| S10 | **P9 段** + **P10 段** | `REPRO` / `EVIDENCE` | 四种种子；库版本入产物；单点不算结果；改真值同步所有引用处 |

**为什么只给到"段"而不给到"号"。** 规则号（如 `P2-03`）由文件 A 独立编写并可能随精修轮变动；本文件与文件 A 由不同写手并行产出，
钉号会使交叉引用在任一侧重排时静默失配。**阶段码 P0~P10 是两边共同的稳定接口**，因此本文件引用到段为止；
需要精确到号时，以 `ml-discipline-rules.md` 的规则索引表为准。

### 3.4 规划层 → `ML_BRIEF.md`：六项契约与规则段的绑定表

`ML_BRIEF.md` 路径：`dsh-plans/<slug>/ML_BRIEF.md`。它是**契约**，不是笔记：**契约先于代码，代码是契约的下游**（§7）。
每项都必须给出具体答案，**"TBD" 不是答案**。

| ML_BRIEF 项 | 必须回答什么 | 挂哪些规则段 | 谁来读它 | 门禁后果 |
|---|---|---|---|---|
| 1. 任务类型与目标变量 | 分类/回归/排序/生成/时序？预测什么、什么粒度、**哪个时点** | **P0 段** | S0 门禁、Verifier Checklist | 未答不得进入 S1 |
| 2. 数据结构与划分 | 样本数/特征数/类型；缺失与不均衡；train/val/test 怎么形成；是否按时间或分组 | **P1 段** + **P2 段** | S1/S2/S3 门禁 | 划分不尊重时间或分组 ⇒ 直接判泄漏 |
| 3. 哪份数据选模型 + 测试集是否只碰一次 | 调参发生在哪；样本数对特征数是否够；标签可靠性 | **P2 段** + **P5 段** | S5 门禁 | 测试集被用于选型 ⇒ 之后所有数字是 best-of-N |
| 4. 指标与基线 | 哪个指标、为什么、犯错代价；平凡基线是什么、得多少分 | **P4 段** + **P6 段** | S4/S6 门禁、S8 口径 | 无基线数字落盘 ⇒ 改进不可解释 |
| 5. 泄漏与分布偏移 | 查过泄漏/重复样本/分布偏移？训练与验证分差多大 | **P2 段** | S2 门禁、S6 复核 | 分差大而先"调模型" ⇒ 停，先查泄漏 |
| 6. 可解释性要求与因果措辞 | 全局还是逐样本？哪些结论会用因果措辞？什么证据才允许那样措辞 | **P7 段** | S7 门禁 | 无稳定性/忠实性证据不得报重要性 |
| **7. 未测 / 冲突（本栏强制）** | 每条未满足的 MUST：规则段、当前阶段、为什么没测、冲突双方的证据、打算怎么解决 | **P9 段** + **P10 段** | S10 门禁、Verifier Checklist | **未测不等于"假"**；必须留痕。有未测项时**不得**声明该结论成立，也不得 `update_goal complete` |

> 第 7 栏的存在依据是 `ml-modeling-plan/SKILL.md` §2 的硬约束"Not measured is not false. Record unmeasurable items as
> unmeasured with the reason"，以及 fem 侧"label 的离散化不确定性必须随样本携带"。**它是"不测"与"测不出来"的唯一合法出口**，
> 不允许用沉默代替。

### 3.5 复核层 → Verifier Checklist（由 MUST 级规则生成）

`PLAN_vN.md` 的 Verifier Checklist 是**从 MUST 级规则机械生成**的勾选项，每框可追溯到一个 `I-xxx` 与一条 MUST 规则段。
生成规则：**文件 A 里每一条 `MUST` 规则，在同一阶段至少对应一个勾选框**；`SHOULD` 级规则只进"未测 / 冲突"栏。

| Checklist 分组（按 S 阶段） | 勾选项类型 | 通过判据的来源 |
|---|---|---|
| S0~S1 | 范围/量纲声明存在；标签来源链已写明且未进输入；fem：峰值保持率与掩膜覆盖率逐样本存在 | P0 / P1 段 |
| S2~S3 | 切分单元 = 样件/算例；预处理器拟合样本数断言；方向编码成对且已声明 axial/polar | P2 / P3 段 |
| S4~S5 | 平凡基线数字落盘；对照逐项对齐；测试集未被触碰；早停 best state 已回滚 | P4 / P5 段 |
| S6 | 退化断言（正类预测数 > 0 / AUC 不低于 0.5 而不报警）；报区间而非单点；fem：计数 MAE/RMSE + 阈值 | P6 / P9 段 |
| S7 | `importance_type` 已声明；稳定性与忠实性证据存在；热图有 `1/L` 基线 | P7 段 |
| S8 | 上线复用训练时预处理器参数；适用工况范围已声明；校准失败告警阈值存在 | P8 段 |
| S9 | 每条正文/图注断言可指出证据；图上模型 = 报告模型；色标与坐标轴可判读 | P10 段 |
| S10 | 四种子 + 库版本入产物；改真值处已同步；第 7 栏无未解释的 MUST 缺口 | P9 / P10 段 |

---

## 4. 插件与脚本调用逻辑

**说明**：以下路径按 `C:\Users\Admin\.dsh\.agent-presets\ml-planner\` 为根，均已逐个 `Test-Path` 实测存在（见文件末核对表）。
规格书 §1 文件 B 的候选清单中列出的项**全部存在且名称一致**；候选清单外另有 `scripts/validate_preset.py` 真实存在，一并收录。
两个预设（ml-planner / fem-ml-planner）**共享同一套脚本**，差异在技能层而非脚本层 —— 包括 `vtu_to_tensor.py` 在两边的都存在。

### 4.1 `scripts/dsh_plans_state.py`（plan 状态读写）

| 字段 | 内容 |
|---|---|
| **用途** | `dsh-plans/` 工作区状态管理器：语言设置、reviewer/criticizer 角色模型、run 账本、子代理记录 |
| **何时调用** | 会话开始（确认语言）→ 每个角色**首次使用前**（确认模型）→ 规划启动（`start-run`）→ 每轮评审后（`record-subagent`） |
| **输入** | `--workdir`（默认 `.`）+ 子命令参数；子命令：`init` / `show` / `set-language --tag --source` / 角色设置 `--role --mode --model-selector` / `start-run --topic --skill --request-text` / `record-subagent --run-id --role --label --model --status` |
| **输出** | `dsh-plans/.state/config.json`、`dsh-plans/.state/active.json`、`dsh-plans/.state/runs/<run-id>/run.json` + `decisions.jsonl` + `subagents.jsonl` + `refs.jsonl`；并保证 `dsh-plans/.gitignore` 含 `.state/` |
| **失败怎么办** | 只在标准库 Python 上运行（无第三方依赖），因此失败基本都是解释器解析问题而非依赖问题；`show` 报 "no dsh-plans state found; run init first" 时先跑 `init`。**状态丢失不阻断规划**：`ML_BRIEF.md` / `PLAN_vN.md` 是公开工件，仍可继续，但必须在第 7 栏记"状态账本缺失" |
| **不要用它做什么** | 不要用它写 PLAN 正文或 `ML_BRIEF.md`（那些是 Markdown 工件，不是状态）；不要期待它建 git 仓库（**它明确不建、也不需要**）；不要并发跑同一 `--workdir` 的写子命令 |

### 4.2 `scripts/verify_integrity.py`（预设完整性；三层判据；只读）

| 字段 | 内容 |
|---|---|
| **用途** | 三级完整性校验：预设是否还是它自称的那个预设。以 `skills/ml-modeling-plan/references/preset-integrity-manifest.md` 为**唯一真源**（哈希不在代码里重复） |
| **何时调用** | 任何改动**预设自身文件**之后（本轮新增 reference 之后即应跑一次）；交付前的自证；怀疑某文件被误改时 |
| **输入** | `--preset`（默认 `C:\Users\Admin\.dsh\.agent-presets\ml-planner`）、`--source`（默认 `…\router-planner`）、`--verbose`。**默认值是本机绝对路径**，换机器必须显式传参 |
| **输出** | 只读诊断到 stdout：L1 源基线（文件数 + 逐文件 sha256 + 指纹）、L2 纯拷贝逐字节一致数、L2' 有意编辑项的结构守卫（**仅报告不强制**）、L3 生成文件计数。**不写任何文件** |
| **失败怎么办** | 退出码 0 = L1+L2 通过；1 = 有 FAILURES（逐条列出）；2 = FATAL（清单缺失 / 源预设缺失 / 清单零行）。修复方向是**回退被改动的纯拷贝文件**，不是改清单——清单的 L3 表按设计是生成时快照。⚠ 本机会话里裸 `python` **不可解析**（WindowsApps 桩，exit 9009），必须用显式解释器（如 `D:\miniconda3\python.exe`）调用 |
| **不要用它做什么** | **不要**把它当"新文件合法性检查"：它只校验清单里列出的文件，**本轮新增的 reference 不在清单里，因此不影响 L1/L2**（实测 RESULT: PASS）。不要手改清单里的 L1/L2 行来"让校验通过"；不要指望它校验关键词表（那是 §4.3 的三方漂移断言），也不要指望它校验 `scripts/fixtures/` 的语料（见 §4.6） |

**实测记录（本节能被独立复现）**：`L1 files=17 hash-mismatches=0`、`fingerprint OK (e17fc1907bc75db7…)`、
`live-source fingerprint matches`、`L2 pure copies identical: 11/11`、`L3 generated files present: 30`、`RESULT: PASS`、exit 0。

### 4.3 `scripts/selftest.mjs`（路由 / 分带自检）

| 字段 | 内容 |
|---|---|
| **用途** | 不启动 DSH 宿主即可自检：分类与引导、会话日志读取（新 `seq`/`eventAt` API 与旧 `events` 数组两种形状）、按行为带裁剪首轮工具面、首次持久 tool/call 后放开完整目录、首条消息即生效的引导注入、`lib/plan-subagents.js` 的注册与只读 deny 过滤 |
| **何时调用** | 改动 `router-planner-core.mjs` / `router-planner-bootstrap.mjs` / `lib/*` / 关键词表之后；`.mjs` 的 ESM 缓存特性意味着**改完必须重启 DSH 宿主**才生效，故自检是唯一无需宿主的前置验证 |
| **输入** | 无参数；用真实 Node 模块加载本预设的两个本地模块与 `lib/plan-subagents.js` |
| **输出** | 6 个 section 的 `PASS` / `FAIL` 行 + 末尾 OK 行；退出码 0 = 全通过，否则 1 |
| **失败怎么办** | 任一 `FAIL` 都指向它相邻的修复点（分类、引导注入点、工具面裁剪、deny 列表）；修完重跑。若因 `_comment` 与代码不符而怀疑，**以脚本实际输出为准** |
| **不要用它做什么** | 不要把它当完整性校验（它不读清单，§4.2 才做）；不要把它当 ML 纪律检查（它只验路由与插件装配）；不要用它的通过代替 §3.5 的 Checklist。⚠ 各处对"多少项检查"的记述已陈旧：`agent.cordis.yml` 注释写 38、`README.md` 写 40、**实测 46 PASS / 0 FAIL**，以实测为准 |

### 4.4 `scripts/validate_preset.py`（原作者结构校验；候选清单外但实际存在）

| 字段 | 内容 |
|---|---|
| **用途** | 校验预设**结构**而非内容：五个规划 `SKILL.md` 存在且带 `name` 与非空 `description`；共享 references 与状态脚本存在；状态脚本可解析且 `--help` 可答；组合文件可被 YAML 解析且含预期行 |
| **何时调用** | 增删技能目录 / 共享 references / 组合行之后 |
| **输入** | 无参数（根目录由脚本位置推导） |
| **输出** | 校验结论到 stdout；退出码表示通过与否 |
| **失败怎么办** | 报"缺某个 `SKILL.md` / 某份共享 reference"时，按提示补文件或改组合；它是**结构**校验，不判断内容质量 |
| **不要用它做什么** | 不要当关键词校验器 —— `scripts/fixtures/ml-band-cases.json` 的 `_comment` 声称"read by … the keyword validator"，但**磁盘上不存在关键词校验器**：`validate_preset.py` 只做结构校验，`ml-band-cases.json` 也不被任何脚本读取（见 §4.6）。不要用它校验哈希（那是 §4.2） |

### 4.5 `scripts/vtu_to_tensor.py`（**FEM 专用**：求解器 VTU → 栅格张量）

| 字段 | 内容 |
|---|---|
| **用途** | 把 Elmer `ResultOutputSolver` 产出的 `.vtu` 转成训练用 `.npz`（图像通道 / 掩膜 / 方向场 / 类别数组 / 归一化坐标）+ 一份元数据 `.json`。脚本内建 C-018/C-019/C-021 三条设计规则：极值·位置·间断·方向·网格属性**禁止**取自栅格；方向场编码成对且**逐分量重采样**；每个样本携带离散化不确定性代理与溯源 |
| **何时调用** | fem 模式 S1 的第一动作，在"数据与标签盘点"之前；每次换网格、换分辨率、换 `.sif` 后**必须重跑**（网格即标签） |
| **输入** | `--vtu`（必填）、`--out`（必填 `.npz`）、`--field-kind {axial,polar}`（**必填**）、`--meta-out`、`--nx`（默认 256）、`--ny`（默认 320）、`--field`、`--direction`、`--keep-boundary-cells`、`--sif` |
| **输出** | `.npz`（`image` / `mask` / 可选 `field` = cos/sin 对 + magnitude、`cat_*` 类别数组）+ `.json` 元数据，含 `grid` / `bbox` / `cell_type_counts` / `boundary_cells_stripped` / `true_nodal_max` / `raster_max` / **`raster_peak_retention`** / `mask_coverage` / `dropped_dead_components` / `categorical_arrays` / `direction.{field_kind,channels,double_angle_mean_deg,double_angle_resultant_R}` / `provenance`；stdout 打印网格、包围盒、掩膜覆盖率、峰值保持率 |
| **失败怎么办** | **必须在带 `vtk` 的解释器里跑**（预设文档给的是 `D:\miniconda3\envs\dsh-elmer\python.exe`）；缺 `vtk` 立即失败——此时**不要**改脚本去 `import torch` 绕过，改成换解释器。`--field-kind` 是必填项，漏传即报错，因为脚本无法替你判断轴向/极向；这一步要按 §6 判定后显式传入。若某数组名不存在，运行时按实际名查（向量变量到达时是**小写**） |
| **不要用它做什么** | 不要在训练解释器里跑它（该环境没有 `vtk`）；不要在转换脚本里 `import torch`（`.npz` 是**唯一**跨环境接口，两解释器职责必须分开）；不要用它替代网格上的计算 —— 极值、位置、间断、方向、网格属性（单元尺寸/连通性/质量/缺陷类别）必须在网格上算，栅格只能作辅助输入；不要把 `raster_peak_retention` 当作可省略的装饰字段 |

### 4.6 `scripts/fixtures/ml-band-cases.json`（分带夹具；**离线证据，未接线**）

| 字段 | 内容 |
|---|---|
| **用途** | 关键词触发的判据夹具：10 条 positive（含真实语料标题）+ 7 条 negative（含三条计划指定的陷阱：`feature flag to the model router`、`shape of the frame`、中文"回归测试"） |
| **何时调用** | **当前没有任何脚本在运行时调用它**（实测：全预设内只有 `ml-keywords.md` 与 `preset-integrity-manifest.md` 两处**文档**引用它，`selftest.mjs` 与 `validate_preset.py` 都不读它）。因此它现在是**冻结时的证据快照**，供人工回归与未来接线使用 |
| **输入** | 无（数据文件） |
| **输出** | 内含 `_results_measured_2026_09_22`：负例 7/7 通过、正例 10/10 通过、误触发率 0.0 %、召回 100 % |
| **失败怎么办** | 若改了关键词表，**必须**手工用这份夹具重跑正负例并在第 7 栏记录结果；因为无自动化接线，漏跑不会报错——这是本条最需要注意的失败模式 |
| **不要用它做什么** | 不要以为"夹具在，断言就在"：它**不参与**任何自动校验，`verify_integrity.py` 与 `selftest.mjs` 的通过**不覆盖**它；不要把它当语料真源（它是 17 条精选样本，语料真源是 `wechat-corpus/`） |

### 4.7 `lib/plan-subagents.js`（planning 子代理派发的约束面）

| 字段 | 内容 |
|---|---|
| **用途** | 注册宿主工具 `run_plan_subagent`：给 stock `subagent` 补一个**运行时可传 `model`** 的参数（dsh-plans 有按工作区持久化的每角色模型选择），并把子代理做成**结构性只读** |
| **何时调用** | 每个 reviewer / criticizer 轮；**只有**在"精修模式问句"已得到答复之后 |
| **输入** | 组合行 `config`：`toolName`（默认 `run_plan_subagent`）、`provider`（默认 `spawn`）、`deny`（只读过滤器，**当前 15 个工具名**：`write`/`edit`/`todo_write`/`create_goal`/`get_goal`/`update_goal`/`ask_user_question`/`run_plan_subagent`/`subagent`/`subagent_fork`/`send_message`/`interrupt_agent`/`list_agents`/`workflow`/`ralph`）；调用参数 `description` / `prompt` / `model` |
| **输出** | 子代理的**最终报告**（前台返回）；prompt 必须自包含（含 PLAN 绝对路径、只读指令、工件目录、要求的发现报告格式），因为子代理**看不到本会话上下文** |
| **失败怎么办** | `deny` 里出现**本预设目录不存在的工具名**时 `tools.restrict` 会拒绝——只列目录里真实存在的名字；delegation 组下被 `disabled` 的产品提供者行不在目录里，故不要往里加。传 `model` 时必须传 `.state/config.json` 里**已确认的**精确选择器，或省略以继承当前模型 |
| **不要用它做什么** | 不要用它派发实现类工作（子代理写不了文件，会直接失败）；不要跳过精修模式问句就派发；不要指望它做独立评估——它只做评审轮 |

### 4.8 `lib/ml-keywords.json`（ML 触发词真源）

| 字段 | 内容 |
|---|---|
| **用途** | ML 关键词词表真源（`version` / `guard` / `terms` / `ambiguous`）；由 `router-planner-core.mjs` 经 `new URL('./lib/ml-keywords.json', import.meta.url)` 读取，读取失败**静默回退**到代码内嵌词表 |
| **何时调用** | 每条用户消息的分类时（`isMlText`），以及 ML 引导块是否追加的判定时 |
| **输入** | 无（数据文件）；schema：`{ pattern, kind: 'literal'|'regex', lang: 'zh'|'en' }`，拉丁模式按词边界锚定且大小写不敏感，中文按字面子串 |
| **输出** | 被 `isMlText` 消费；命中 `terms` ≥ 1（`guard.requireTerms = 1`）才判定为 ML 任务 |
| **失败怎么办** | 三方（json / 内嵌兜底 / `references/ml-keywords.md` 镜像）**词集必须相等**，由 `selftest.mjs` 断言；改一处必须同步三处。只命中 `ambiguous` 时**不得**改变行为带，只在既有带上追加一行软提示 |
| **不要用它做什么** | 不要把它当 FEM 探测器（实测 `fem|有限元|elmer` 零命中；唯一同形项是 `网格搜索` = hyperparameter grid search）；不要在这里加"命中即改变行为带"的规则（ML 判定是**正交**的，`bandOf` 不接受它）；不要手工编辑内嵌兜底词表而不同步 json 与 md 镜像 |

### 4.9 `router-planner-bootstrap.mjs` + `router-planner-core.mjs`（路由插件）

| 字段 | 内容 |
|---|---|
| **用途** | bootstrap 是路由插件（`config.routerMode: planner`）：在 `system-prompt/assemble` 上按行为带裁剪首轮工具面并保留 persona，在 `session/event` 只**读**，在 `agent/pre-step` 瀑布上**写**引导。core 提供 `classifyTask` / `bandOf` / `personaFor` / `coreFor` / `bandFor` / `testinessFor` / `guideFor` / `isMlText` / `mlKeywordTerms` |
| **何时调用** | 每次 system-prompt assembly；每条用户消息之后一次引导注入；首次持久 tool/call 之后放开完整工具目录 |
| **输入** | 用户消息文本；`session` 的 `seq` / `eventAt()`（新版）或 `events` 数组（旧版）；模型 id（weak 带按模型选人设） |
| **输出** | 裁剪后的 `sections` 与 `tools`；追加在既有带引导之后的 `ML_GUIDE_BLOCK`（要求先加载 `ml-modeling-plan` 并把六项答案落盘为 `ML_BRIEF.md`，未逐项回答前不写训练代码） |
| **失败怎么办** | 已知宿主时序：每条消息的**第一个** assembly 发生在用户消息落盘前，故那一轮首个工具面**永远是 weak 带**，分类后的带从下一个 step 生效——这是宿主行为，不是缺陷，不要"修"它。改这两个 `.mjs` 后必须**重启 DSH 宿主**（ESM 缓存），并跑 `node scripts/selftest.mjs` |
| **不要用它做什么** | 不要用路由替换 persona（规划纪律由 persona 驱动，实测换人设会翻转轨迹）；不要在 `session/event` 观察者里 `inbox.append`（会被宿主拒绝，且裸 `catch {}` 会静默吞掉）；不要让 ML 判定进入 `bandOf`（`clamp01('ml')=0` 会误判成 spec 带） |

### 4.10 `skills/*/SKILL.md`（技能入口与相互路由）

| 字段 | 内容 |
|---|---|
| **用途** | 技能入口。ml-planner 有 **7** 个 `SKILL.md`：五个规划技能（`create-a-small-plan` / `create-a-plan` / `create-a-big-plan` / `diagnose-before-plan` / `reference-before-plan`）、`ml-modeling-plan`（ML 入口与 references 路由）、`context-handoff`（防腐化交接）。fem-ml-planner 有 **8** 个（多 `fem-ml-planning`） |
| **何时调用** | 由 persona 指名的规划技能；ML 任务由 `ML_GUIDE_BLOCK` 指名 `ml-modeling-plan`；fem 模式追加 `fem-ml-planning` |
| **输入** | `skill` 工具的技能名；技能自身的 `description` 决定选型 |
| **输出** | 技能正文指令 + 指向 `references/` 的路由要求 |
| **失败怎么办** | 规划技能的**顺序问题**（先问语言、再定角色模型、再问精修模式）由工作流决定，不由便利性决定；技能注册表在宿主组合（`skill-filesystem` 的 `customSkillDirs` 指向本预设 `skills/`），新技能目录需重启宿主才被发现 |
| **不要用它做什么** | 不要绕过 SKILL.md 直接读 reference 去做规划决策（路由意图会丢）；不要把 `ml-modeling-plan` 当 fem 技能的替代（fem 模式两者都要加载） |

### 4.11 组合行（本预设声明、但由宿主/产品包提供的插件）

| 字段 | 内容 |
|---|---|
| **用途** | `agent.cordis.yml` 声明的其余行：`persona`（`prefix` 字段）、`agent-instructions`、shell（`tool-pwsh`，Windows 下启用 / `tool-bash` 在 Windows 下 `disabled`）、`tool-fs` / `tool-fs-search` / `tool-str-replace-editor` / `tool-jobs`、`tool-skill` + `skill-filesystem`（`customSkillDirs`）、`tool-goal`、`tool-ask-user`、`tool-todo`、`tool-web`（`fetch:false`）、delegation 组（`tool-subagent` = `subagent`、`tool-subagent-fork` = `subagent_fork`、`tool-workflow`、`tool-ralph`（`maxRounds: 64`），codex / claude-code 提供者行 `disabled`）、compaction 组（`compaction-basic` 冻结 `thresholdRatio 0.8` / `retainRatio 0.25` 并对 `deepseek-official/deepseek-v4-flash-vision-exp` 钉死策略、`command-compact`、`tool-result-pruner` 阈值 8192/4096/1024） |
| **何时调用** | 按各自触发条件；`tool-goal` 只在交接批准后驱动执行；`tool-ask-user` 每次只问一个问题；`tool-todo` 允许多个 `in_progress`（`allowParallelInProgress: true`） |
| **输入 / 输出** | 见宿主产品文档；本预设只声明与配置，不实现 |
| **失败怎么办** | **不要改组合文件**：`verify_integrity.py` 对它做结构守卫（对比源预设的"零删除行"检查）。plan mode 组按设计 `disabled`（工件规划替代它） |
| **不要用它做什么** | 不要"顺手修" `agent.cordis.yml` 里的路径或字段；不要在这里新增行来实现 ML 纪律（纪律应落在 references 与门禁里） |

### 4.12 MCP 服务器

| 字段 | 内容 |
|---|---|
| **用途** | **本预设不注册任何 MCP 服务器。** 实测 `agent.cordis.yml` 中无 `mcp` 相关行 |
| **何时调用** | — |
| **输入 / 输出** | — |
| **失败怎么办** | 若某个会话里出现了 `mcp__*` 工具（例如文件系统或记忆服务器），那是**宿主或其他预设**提供的，不是本预设计约的一部分；用它会引入本预设无法保证的副作用 |
| **不要用它做什么** | 不要把 MCP 工具的可用性写进 ML 管线或门禁判据 —— 管线必须在"没有 MCP"的前提下也能走完 |

### 4.13 预设根的只读参考文件（不改，但要读对）

| 字段 | 内容 |
|---|---|
| **用途** | `preset.yml`（选择器显示名与简介，**模式判定的第一手依据**：`机器学习规划模式 (ML Planner)` vs `有限元机器学习规划模式 (FEM ML Planner)`）、`README.md`（安装、兼容补丁表、自检命令与已知宿主时序）、`skills/references/{dsh-planning-workflow,state-and-config,plan-artifact-template}.md`（工作流、状态、PLAN 骨架） |
| **何时调用** | 会话开局（读 `preset.yml`/`README.md` 确认模式）与规划启动（读工作流参考与 PLAN 骨架） |
| **输入 / 输出** | 只读；`README.md` 的"已知行为"节解释了首轮 assembly 的宿主时序 |
| **失败怎么办** | README 中的计数与注释可能陈旧（已实测：自检项 40/38 两说，真值 46）；冲突时以**实测**为准并在第 7 栏记录 |
| **不要用它做什么** | 不要改 `preset.yml` / `README.md`（均在 L1 表的 `intentional-edit` 分类下，改动会改变指纹并触发 L1 FAIL） |

---

## 5. 两模式的差异表（逐项对照）

| 环节 | 不带有限元（ml） | 带有限元（fem-ml） | 差异的机理 |
|---|---|---|---|
| **标签来源** | 人工标注 / 业务系统 / 规则派生的目标列 | 求解器输出经**离散化**定义（网格上取阈值、聚类或几何分段） | 标签不再是"观测到的事实"，而是"在某离散化下算出来的值"；变换网格 ⇒ 真值本身改变，故误差不可与网格无关地声明 |
| **切分单元** | 样本 / 患者 / 会话 / 时间点 | **样件或算例**（一个 solve 的全部 cell 是一组） | 同一 solve 的相邻单元是近似重复样本；按 cell 随机切分会让测试集与训练集在数值上相似，虚高指标 |
| **输入编码（方向量）** | 一般不涉及；若涉及则按普通数值通道处理 | 轴向量 `(cos2θ, sin2θ)`、极向量 `(cosθ, sinθ)`，幅值**单独一通道**；**逐分量**重采样后再归一化 | 角度是周期量：5° 与 175° 描述的是同一条线，算术平均 90° 是伪造方向；插值角度再编码会重建编码本要消除的全部失效 |
| **输入编码（类别量）** | 类别列用 one-hot / 目标编码 / 有序整数，按语义定 | 整数 id 数组用**最近邻**重采样并保持整数，绝不与连续通道混用 | 连续插值会把区域 id 变成非整数垃圾（语料实测：整数类别数组被静默重采样成非整数） |
| **缺失与掩膜** | 缺失多为"没测到"，可用填补（统计量只来自训练集）或在树模型下容忍 | 掩膜语义是**空域掩掉**，不是零填 | 仿真里"空"通常意味着域不在包围盒内（实测 49.6 %–51.3 % 体素为空），而零常常是**合法物理值**——方向编码里 `(0,0)` 对应 45° 轴，零填会造出一个不存在的方向 |
| **输出结构** | 输出维度固定（类别数 / 标量 / 序列长度） | 个数可变时用**固定槽位 + 存在标志**；存在度检查不得退化为 one-hot | 用软分配表达"存在度"时，模型可以学到恒等于 one-hot 的退化解而指标看不出来；固定槽位让输出形状恒定同时把"数量"读出来 |
| **极端值处理** | 可直接在样本上取极值，或作为目标回归 | 极值 / 位置 / 间断 / 方向 / 网格属性**必须在网格上算**；栅格只作辅助输入 | 栅格化保留峰值仅 17.4 %–30.4 %（随分辨率变化），取栅格极值等于系统性低估真极值；分辨率越高保留越多，模型可能学到网格而非物理 |
| **验证方式** | 交叉验证 + 独立测试集；按组长 | 同上，**并且**标签敏感性实验（阈值/边界扰动后结论是否翻转）+ 跨物理量一致性验证 | 离散化设定的边界是人为的：边界一移标签就变，若结论随边界翻转，那它不是结果；跨物理量的一致不是 ground truth，只能叫一致性验证 |
| **上线口径** | 复用训练时预处理器参数；声明适用工况 | 同上，**并且**声明适用工况范围 + 随样本携带网格分辨率与求解器溯源 | 换网格/换分辨率/换求解器即换真值域，模型在训练网格上学到的可能正是那个网格；上线时必须能说明"输入来自哪次离散化" |
| **解释器与运行环境** | 一个环境（训练栈） | **两个环境**：`vtk` 在 VTK 解释器（实测路径 `D:\miniconda3\envs\dsh-elmer\python.exe`），训练栈在 ML 解释器 | 两边都不装对方的库，一个脚本同时需要两者必然失败；职责必须按环境切开 |
| **环境间接口** | — | `.npz` + 元数据 `.json` 是**唯一**接口；转换脚本不 `import torch` | 进程内共享对象在跨环境时不存在；文件是唯一能同时满足两个解释器的载体 |
| **离散化不确定性** | 一般不作为样本字段（除非标注误差已知） | 每个样本携带 `raster_peak_retention` 与 `mask_coverage`，异常/缺失记入第 7 栏 | 不确定性是随样本变化的，只报一个总体误差会让高分辨率样本与低分辨率样本混为一谈 |
| **溯源字段** | 数据版本、抽样时间 | 追加 `.sif` 名、`.vtu` sha256、求解器版本、网格分辨率、被丢弃的死分量、被剥离的边界单元 | "名值纪律"要求：仿真量不是 ground truth，样本没有溯源就无法判断两个样本是否可比（语料：相隔数月、设置不同的样本静默不可比） |
| **规模伸缩** | 按参数量 / 数据量 / batch 调 | 追加**四旋钮同构伸缩**且**注意力变体必须两档一致** | 小档换近似注意力会改变函数类，小档实测的结论不再描述大档要训的模型 |
| **失败停止口径** | MUST 失败 ⇒ 停在本阶段 + 记第 7 栏 | 同 ml，**并且**§6 的 9 条各自带停止条件（如掩膜或峰值保持率缺失即不得进入 S2） | fem 侧的"未测"更贵：离散化不确定性无法事后补算，只能在转换时记录，因此它的门禁位置比 ml 更靠前 |

---

## 6. 带有限元的额外原则（fem-extra，逐条给机理与落地）

以下 9 条**只在 fem 模式生效**。每条给出：机理 → 落地 → 判定 → 反例（或失败模式）。

### 6.1 标签即网格：离散化即标签定义

- **机理**：求解器输出是离散化的函数。网格一改，节点值、梯度、阈值穿越位置全变，所以**改变网格改变真值本身**，不是"同真值的更精确观测"。
- **落地**：`vtu_to_tensor.py` 的元数据里 `grid` / `bbox` / `points` / `cells` / `cell_type_counts` 随样本落盘；每个样本携带离散化不确定性代理；把这三件事写进 `ML_BRIEF.md` 第 2 项与第 7 栏。
- **判定**：任取两个样本，能说出它们各自的网格分辨率与来源 `.vtu` sha256；若要做收敛性声明，必须给出跨至少两档网格的对照。
- **失败模式**：把不同分辨率的样本混成一个训练集而不作分组或加权 ⇒ 模型学到分辨率与标签的相关性，指标不可比。

### 6.2 双角域编码：mod π 与 mod 2π 必须先判定再编码

- **机理**：轴向量（取向、轴线、线、差一个符号的法向）对称性为 mod π；极向量（真实方向）对称性为 mod 2π。用错类别会**静默删掉符号**。
- **落地**：`--field-kind {axial,polar}` 是转换脚本的**必填项**；编码成对（`(cos2θ, sin2θ)` 或 `(cosθ, sinθ)`），幅值**单独一通道**，使"此处无取向"与"此处取向明确"可区分；类别声明写入样本元数据与 `ML_BRIEF.md` 第 2 项。
- **判定**：通道名出现在 `name_field` 里且与 `field_kind` 一致（脚本已写入）；抽查一段 5°/175° 的场，两半应编成**同一**码。
- **反例（实测）**：5° 与 175° 各占一半的 director 场描述的**是同一条线**。朴素算术平均给出 **90.0000°**（伪造方向）；双角平均给出 **0.0000°**，合矢量 **R = 0.9848**；均匀满圆场给出 **R ≈ 9.0e-17**，正确地报告均值**未定义**。

### 6.3 方向场的统计必须用圆统计（这是显著性检验的唯一合法口径）

- **机理**：周期量的算术统计在跨越 π/2π 边界时产生伪值；`R` 是集中度，`R → 0` 意味着"均值无意义"而非"均值是 0"。
- **落地**：报告任何平均方向时**同时报 `R`**（脚本已计算 `double_angle_mean_deg` 与 `double_angle_resultant_R`）；显著性检验用圆均值、合矢量长度 `R`、`R → κ` 的小样本修正、`±2π` 圆 KDE、bootstrap CI 与组间 p 值；这些数字落 `evidence/S6-metrics.json` 或 `evidence/S7-importance.json`。
- **判定**：任何"方向 A 与方向 B 显著不同"的断言，必须能指出临界值 / 自由度 / p 值；只给均值差即判不合格。
- **失败模式**：用 t 检验比较两组角度均值 ⇒ 边界附近的分组差异被系统性地夸大或掩盖。

### 6.4 栅格化信息损失：峰值保持率必须与结论并列报告

- **机理**：把节点值重采样到规则栅格是**低通**操作，极值被平均掉；损失随分辨率单调变化，于是分辨率成为一个隐藏自变量。
- **落地**：记录网格分辨率、包围盒与 `raster_peak_retention`（脚本每次运行都算并打印）；把该值写进 `evidence/S1-tensor-meta.json`，并在交付物中与结论**并列**出现（不是附录）。
- **判定**：每个用栅格得出的结论旁边能指出其样本的峰值保持率；目标是极值或位置时，该结论**必须**来自网格计算而非栅格。
- **反例（实测）**：同一真实 Elmer 场在 32×40 / 64×80 / 128×160 / 256×320 下分别只保留 **17.4 % / 19.1 % / 27.8 % / 30.4 %** 的真实节点峰值。

### 6.5 可变数量输出：固定槽位 + 存在标志

- **机理**：个数可变时输出维度无法恒定，而"存在度"这种软分配可以被优化器推到恒等于 one-hot 的退化解，指标（平均精度类）通常看不出来。
- **落地**：输出形状固定（固定槽位），存在的对象数由**存在标志**读出；计数口径必须写清（密集检测器里计数是置信度阈值与抑制阈值的**后验函数**，是人拥有的超参）；报告**计数 MAE/RMSE** 与所用阈值。
- **判定**：检查存在度分布——若退化为 one-hot，该设计没有实现"软数量"，必须改口径或声明；计数误差必须与检测指标并列出现。
- **反例（实测）**：一次误差分解里**重复对象误差在 IoU 0.5 处为 0.2、在 0.6 与 0.7 处为 0.0**，而定位误差同期从 6.2 升到 18.1 —— 平均指标把重复对象"吸收"掉了。

### 6.6 掩膜语义：空域掩掉，不零填

- **机理**：域往往不是包围盒（实测 **49.6 %–51.3 %** 体素为空）；而零在物理与编码里都可能是**合法值**——方向编码中 `(0,0)` 对应 45° 轴。零填把"无数据"变成"一个具体的方向"，模型会学到这个伪值。
- **落地**：转换脚本始终发出 `mask` 通道（`mask_coverage` 落盘）；下游损失函数与指标只在掩膜内计算；`ML_BRIEF.md` 第 2 项写明掩膜语义。
- **判定**：断言掩膜通道存在且 `mask_coverage > 0`；对掩膜外区域填的是"不参与计算"而不是任何数值。
- **失败模式**：零填 + 均匀权重 ⇒ 近一半体素在教模型"这里是 45° 轴"，且该误差随域形状变化而变化。

### 6.7 按样件/算例划分 + 三区划分

- **机理**：同一次 solve 的单元之间高度相关（共享网格、边界条件、载荷），它们不是独立样本。随机切分让测试集在数值上"见过"。此外"未标注"通常不是"负类"，而是"没人标/不确定"。
- **落地**：切分键 = 样件 / 算例 / 网格族；按组切分，绝不按 cell；采用三区划分：**确定正 / 确定负 / 未标注且不参与训练**；切分清单落 `evidence/S2-split-manifest.json`（含每样本的组键与 fold 号）。
- **判定**：能从清单里指认任一测试样本的组键，且该组键**未**出现在训练集；未标注样本确实未进入训练。
- **失败模式**：语料中同一域按 cell 随机切分导致指标虚高（`3942513879_2247501933_1` 同域证据）；把未标注当负类会同时虚增负类样本与抬高精度。

### 6.8 名值纪律：跨物理量一致性验证不叫 ground truth

- **机理**：标签来自与输入**不同的物理量**时，它验证的是"两个物理量在给定工况下是否一致"，不是"真值是否被预测对"。名字决定断言的边界。
- **落地**：在 `ML_BRIEF.md` 第 1 与第 4 项、以及所有图注中，把这类目标命名为**跨物理量一致性目标 / 一致性验证**，禁用 "ground truth" 措辞；同时把产生标签的阈值规则**降级为必须打败的基线**，而不是删除。
- **判定**：全文检索标签的命名；凡出现 ground truth 的地方都能指向真正的测量真值，否则改写。
- **失败模式**：把一致性验证当精度验证 ⇒ 结论被过度外推（"模型预测正确了物理真值"），而在换工况后失效。

### 6.9 求解器溯源：版本 / 输入文件 / 分辨率随样本记录

- **机理**：相隔数月、设置不同的样本若无声明的可比性假设，其差异会被模型当作信号；求解器版本与 `.sif` 决定了物理模型本身。
- **落地**：每个样本元数据含 `source_vtu` + `source_vtu_sha256` + `source_kind` + `.sif` 名 + 网格 + `solve` 相关的 `cell_type_counts` / `boundary_cells_stripped` / `dropped_dead_components`；求解器版本从 VTU 头部注释读、求解器 flag 从 banner 的链接行读（脚本已在 `provenance` 中留位）。数组名在运行时查（向量变量到达时是**小写**，不要硬编码）。
- **判定**：随机抽一个样本，能给出上述字段；无法给出则在第 7 栏记"溯源不完整"，并**不得**据此样本做跨批次比较。
- **失败模式**：把两个版本的求解结果混训而不记录版本 ⇒ 模型学到的差异无法归因，任何改进都无法定位来源。

---

## 7. 门禁与回滚

### 7.1 MUST 失败时的强制动作（照序执行，不得跳步）

| 步 | 动作 | 落点 |
|---|---|---|
| 1 | **停在本阶段** | 不前进到下一 S 阶段；不写下一阶段的出口物 |
| 2 | 记录失败事实 | `ML_BRIEF.md` 第 7 栏（未测 / 冲突）：规则段、当前阶段、为什么没测、冲突双方的证据 |
| 3 | 区分"未测"与"不成立" | 未测按未测记录；**不得**写成"该结论成立"，也**不得**写成"该结论为假" |
| 4 | 决定处置 | 三条路：补测（回到该阶段）、收窄声明（把结论限定在已测范围）、回滚到上一版通过门禁的出口物 |
| 5 | 同步 | `PLAN_vN.md` 的 Revision Ledger 追加一条；`dsh-plans/.state/runs/<run-id>/decisions.jsonl` 记一行 |
| 6 | 才能继续 | 处置完成且第 2~5 步落盘后，才允许重新进入该阶段或前进 |

- `SHOULD` 级规则失败：不阻断，但**必须在产物里显式声明**违反（"违反须在产物里显式声明"是 SHOULD 的定义）。
- **测试集被触碰**属于不可逆失败：不能靠"再切一次"补救，必须重新开始该 run 的 S5~S6。
- **`update_goal complete` 的前置**：Verifier Checklist 每一框通过。任一未过即不得 complete，改记第 7 栏。

### 7.2 与"先写契约再写代码"的关系

**契约先于代码，代码是契约的下游。** 顺序是硬约束，不是风格偏好：

```
S0 写 ML_BRIEF.md 六项  →  S1~S3 把数据/切分/预处理决策写进契约  →  S4~S8 训练与评估（代码在这里才出现）
                      ↘  第 7 栏「未测 / 冲突」← 任一 MUST 失败在此留痕
```

- `ML_BRIEF.md` 不存在时**不得**写训练代码（`ML_GUIDE_BLOCK` 明文要求；SKILL.md 也是"Hard rule before anything else"）。
- 契约的每一处改动都必须**先改 `ML_BRIEF.md` 再改代码**；代码与契约冲突时，**以契约为准并回到契约**，不允许"代码跑通了就默认契约作废"。
- 例外通道只有一条：测不出来的项进第 7 栏，**仍然要写在契约里**（"Not measured is not false"）。

### 7.3 回滚

- 回滚目标是**上一版通过门禁的出口物**（`ML_BRIEF.md` / `PLAN_vN.md` / `evidence/*` 的上一版），不是"删除失败尝试"。
- 工件目录里失败的证据保留（`event.log` 式只追加不改写），以便区分"没试"与"试了不行"。
- 状态账本 `dsh-plans/.state/` 是私有目录（`init` 保证 `.gitignore` 含 `.state/`），回滚**不涉及**它；状态与工件各自一致即可。

---

## 8. 本文件不声称什么

1. **不声称规则内容。** 本文件不重复 `ml-discipline-rules.md` 的规则正文，也不判定某条规则的强度或类别；引用只到**阶段段**（P0~P10），不到规则号。两文件若在措辞上冲突，规则以文件 A 为准，调用顺序以本文件为准。
2. **不声称管线是唯一正确的建模流程。** S0~S10 是本预设强制的**纪律顺序**（先契约、先基线、测试集只用一次），不是性能最优流程；它约束的是"不许跳过什么"，不是"必须按某个顺序调参"。
3. **不声称已实测全部脚本的行为。** 本文件的路径核对、`verify_integrity.py` 的 PASS 结果、`selftest.mjs` 的 46 项通过、`vtu_to_tensor.py` 的字段清单均在本机实测；但 **`vtu_to_tensor.py` 未在本轮对真实 `.vtu` 重跑**（其设计意图与字段来自脚本源码与既有文档），且 §6 的数值（17.4 %–30.4 % 峰值保持、49.6 %–51.3 % 空体素、90.0000°/R=0.9848、重复对象误差 0.2 vs 0.0）是**语料中的实测值**，应按"警示量级"使用，不得当作你自己数据的常数。
4. **不声称 `scripts/fixtures/ml-band-cases.json` 的断言仍在被自动检查。** 实测它不被任何脚本读取（§4.6）；它在文档里被描述为"read by scripts/selftest.mjs and by the keyword validator"，但磁盘上既无该接线也无该校验器。
5. **不声称本文件的 9 条 fem-extra 是全部 fem 知识。** 求解器操作层（Elmer 安装、Gmsh→Elmer 网格转换、`.sif` 校验、异步求解）与网格缺陷诊断属于相邻技能（`elmer-fem`、`mesh-quality`），不在本文件范围。
