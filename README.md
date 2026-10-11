# dsh-ml-planner

> ### Force an agent to write an ML contract before it writes a single line of training code.
> ### 让 AI 写训练代码之前，先把六项契约写清楚。

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![DSH preset](https://img.shields.io/badge/DSH-preset-6f42c1.svg)](preset/preset.yml)
[![Skills](https://img.shields.io/badge/skills-7-informational.svg)](preset/skills)
[![Discipline rules](https://img.shields.io/badge/discipline%20rules-94%20(85%20MUST%20%2B%209%20SHOULD)-critical.svg)](preset/skills/ml-modeling-plan/references/ml-discipline-rules.md)
[![Self-test](https://img.shields.io/badge/selftest-45%2F45%20PASS-brightgreen.svg)](scripts/verify.ps1)

A **DeepSeek Harness (DSH) preset** for machine-learning work. It turns ML practice into a
**plan-first, contract-gated workflow**: an agent must fill in a six-item `ML_BRIEF.md` — task and target,
data and split, what selects the model, metric and baseline, leakage and shift, interpretability — **before any
training code exists.** Around that contract sit **94 discipline rules**, **17 reference documents**, and a
**7-skill** planning workflow, all traceable back to a **266-post source corpus**.

一个 **DSH 预设**，把"用 AI 做机器学习"变成**先写契约、过门禁、再写代码**的流程。契约没过，不写训练代码。

---

## §4.0 What you are actually downloading · 你下载的到底是什么

> **The valuable part of this repository is not the code. It is the 24 knowledge files under `preset/skills/`.**
> **这个仓库真正值钱的不是代码，是 `preset/skills/` 底下的 24 个知识文件。**

Most repositories in this space ship a script and a hope. Here the code is a thin router: its job is to decide
*which* knowledge document to load, and *what must be written down before anything is trained.*

**A knowledge file** means one Markdown file under `preset/skills/` — **7** `SKILL.md` (the routers) plus
**17** `references/*.md` (the knowledge they route to): **24 files**, and those are what you are downloading.

| Layer | Path | Files | Bytes | Share of `preset/` |
|---|---|---:|---:|---:|
| **Knowledge** — 7 `SKILL.md` + 17 references | `preset/skills/**` | **24** | **418,546** | **77.6 %** |
| Non-knowledge — router, verifier, routing data, preset README | `preset/` minus `skills/` | 12 | 120,769 | 22.4 % |
| | **`preset/` total** | **36** | **539,315** | 100 % |

The exact split depends on where you draw the line, and every version of it points the same way. Count the
routing keyword data as knowledge too (`preset/lib/ml-keywords.json`, 10,349 B) and it becomes **25 files /
428,895 B / 79.5 %**; narrow the denominator to program code (`.mjs` / `.js` / `.py` — 7 files, 87,809 B) and
the knowledge layer is **4.8×** larger. Even if you count *every* non-knowledge file as "code" — including the
keyword data and the preset's own README — it is still **3.5× larger**.

The sharpest single number:

> `ml-discipline-rules.md` — one file, **193,510 B**, 94 rules — is **2.2× larger than all the program code in
> this repository combined**, and larger than all 12 non-knowledge files in `preset/` put together.

<details>
<summary><b>All 24 knowledge files, by size</b></summary>

| File (under `preset/skills/`) | Bytes | What it gives you |
|---|---:|---|
| `ml-modeling-plan/references/ml-discipline-rules.md` | 193,510 | 94 rules, P0–P10 by pipeline stage, 85 MUST + 9 SHOULD |
| `ml-modeling-plan/references/ml-pipeline-and-invocation.md` | 60,190 | the S0→S10 stage table, gates, who calls whom |
| `ml-modeling-plan/references/preset-integrity-manifest.md` | 18,889 | what every preset file is, and how integrity is checked |
| `ml-modeling-plan/references/ml-model-failure-modes.md` | 17,408 | 8 model families, each with its observed failure modes |
| `references/dsh-planning-workflow.md` | 15,508 | the planning discipline the six planning skills share |
| `ml-modeling-plan/references/ml-evaluation-and-leakage.md` | 12,945 | metrics, thresholds, calibration, leakage patterns |
| `ml-modeling-plan/references/ml-spatial-and-field-inputs.md` | 10,962 | direction fields, rasterisation loss, circular statistics |
| `ml-modeling-plan/references/ml-overfit-underfit.md` | 10,396 | diagnose before you regularise; §6 leakage impersonating overfitting |
| `ml-modeling-plan/references/ml-interpretability.md` | 9,281 | method families and how they fail; wording rules |
| `ml-modeling-plan/references/ml-algorithm-families.md` | 7,998 | architectures with an outer optimisation loop |
| `references/state-and-config.md` | 7,783 | language, role, and executor settings; state layout |
| `ml-modeling-plan/references/ml-literature-gaps.md` | 7,582 | 12 documented gaps — what the literature does *not* support |
| `ml-modeling-plan/SKILL.md` | 6,730 | the entry skill: which reference to load, what must be written first |
| `context-handoff/SKILL.md` | 5,887 | the ten-section handoff that survives context loss |
| `ml-modeling-plan/references/ml-keywords.md` | 4,642 | the trigger words and the ambiguous ones |
| `ml-modeling-plan/references/ml-time-series.md` | 4,609 | splitting, stationarity, where the leakage happens |
| `ml-modeling-plan/references/ml-feature-engineering.md` | 4,609 | fitting order — the rule that prevents the most common leak |
| `ml-modeling-plan/references/ml-algorithm-selection.md` | 4,357 | choosing a model before tuning one |
| `reference-before-plan/SKILL.md` | 3,313 | finding and verifying external references first |
| `diagnose-before-plan/SKILL.md` | 3,067 | root-cause discipline before planning a fix |
| `references/plan-artifact-template.md` | 2,470 | the required shape of a reviewable plan |
| `create-a-big-plan/SKILL.md` | 2,433 | 10+ questions, three independent reviewers |
| `create-a-plan/SKILL.md` | 2,153 | 5–10 questions, reviewer then criticizer |
| `create-a-small-plan/SKILL.md` | 1,824 | 1–3 questions, one criticizer round |

</details>

### Check the numbers yourself

From the repository root. Both count the same thing — one from the working tree, one from the git objects —
and both are byte counts as stored in git (`preset/**` is `-text`, so git never rewrites its line endings):

```bash
python -c "import pathlib;f=[p for p in pathlib.Path('preset/skills').rglob('*') if p.is_file()];print(len(f), sum(p.stat().st_size for p in f))"
# 24 418546

python -c "import subprocess;o=subprocess.run(['git','ls-tree','-r','HEAD','--long','preset/skills/'],capture_output=True,text=True).stdout.splitlines();r=[l.split() for l in o];print(len(r), sum(int(x[3]) for x in r))"
# 24 418546
```

Swap `preset/skills/` for `preset/` and both give `36 539315`. No count above is asserted without a command
that reproduces it.

---

## §4.1 Before / After — the 3-second version

**Before** — what an unconstrained agent does:

```
写训练代码 → 跑起来 → 发现 AUC 0.152（比随机猜还差）→ 回头查泄漏 → 发现预处理用了全量数据
                                                        → 重来 → 不记得上次改了什么
```

**After** — what this preset forces:

```
先写 ML_BRIEF.md（六项契约） → 契约不过不写代码
   ├─ 暴露：预处理 fit 在切分之前 ⇒ P2-01 规则拦下，pipeline 重排
   ├─ 暴露：测试集被用来选模型 ⇒ P2 段判定"此后所有数字是 best-of-N"
   └─ 暴露：无平凡基线 ⇒ P4-01 要求先跑基线并落盘
→ 一次性避开 94 类问题中与本任务相关的那一批
```

The `AUC 0.152` in the Before block is **not invented**. It is measured corpus item
`3942513879_2247500069_1`: a degenerate all-negative model scoring **99.8 % accuracy** with
a confusion matrix of `[[499,0],[1,0]]` — **positive-class recall 0** — and two models with **AUC 0.152 / 0.421**,
both below the random line, while the article reported it as a result. That incident is rule **P6-01**.

### Who this is for · 给谁看

- **People who use AI to write ML code** and want the result to be checkable, not just runnable.
- **Anyone who has been burned by "it ran"** — a number that looked fine and turned out to be leakage,
  a degenerate model, or a best-of-N fluke.
- **Anyone who needs reproducible experiments** — split discipline, seeds, library versions, and an evidence
  trail that a reviewer can follow.
- **Not for you if** you want a one-line model-fitting snippet. This preset's core move is to *interrupt* the
  path from prompt to training code, and that interruption is the product.

---

## §4.2 Advantage 1 — all of machine learning, made into skills

> 优势一：**把机器学习的全部内容做成了 skills**。分三层：常见模型层 / 处理办法层 / 组合的防坑方法层。

Most "ML agents" are one prompt with a few tips. This preset is a **knowledge base with a router**. The entry
skill `ml-modeling-plan` decides *which* reference to load and *what must be written down first*; deep knowledge
stays in `references/` and is loaded only when needed.

Measured inventory of the shipped material:

| Component | Count | Location |
|---|---|---|
| Skills | **7** | `preset/skills/*/SKILL.md` |
| Reference documents | **17** | `preset/skills/references/` (3) + `preset/skills/ml-modeling-plan/references/` (14) |
| **Discipline rules** | **94** | `preset/skills/ml-modeling-plan/references/ml-discipline-rules.md` (193,510 B) |
| Keyword triggers | **118** terms + **19** ambiguous | `preset/lib/ml-keywords.json` |

### Layer 1 — 常见模型层 · the model families

| Reference | Size | What it gives you |
|---|---|---|
| `ml-algorithm-selection.md` | 4,357 B | Choosing a model **before** tuning one — start from the data, not the model; a practical selection checklist; how to compare candidates honestly |
| `ml-algorithm-families.md` | 7,998 B | Neural architectures with an **outer optimisation loop** — 4 families (Bayesian/GP over RL, heuristic search over tree structure, heuristics driving RL, CNN/Transformer + GNN backbones), cross-family rules, and how to scale a search from a laptop tier to a cloud tier |
| `ml-model-failure-modes.md` | 17,408 B | **8 model families**, each with the failure modes actually observed for *that* family, and the practices that helped |

The **8 families** in `ml-model-failure-modes.md`, in order:

1. Gradient-boosted trees — XGBoost / LightGBM / GBDT
2. Random forests and single decision trees
3. Sequence models — LSTM / GRU / TCN
4. Transformer / attention
5. Margins and distances — SVM / SVR / KNN
6. Clustering, mixtures and dimensionality reduction
7. Time series, filters and state space
8. Augmentation and resampling

Plus a **cross-cutting rule** section and an explicit *"What this reference does not claim"* section.

### Layer 2 — 处理办法层 · the handling recipes

Each situation routes to a specific document, not to a general prompt:

| Situation | Reference | Highlights |
|---|---|---|
| Features, encoding, scaling, missing data | `ml-feature-engineering.md` (4,609 B) | §1 **Fitting order — the rule that prevents the most common leak**; §4 missing data; §6 leakage-specific feature patterns |
| Train good / validation bad | `ml-overfit-underfit.md` (10,396 B) | **Diagnose before you regularise**; per-family sections (linear, tree ensembles, neural nets, KNN, time series); **§6 leakage — the failure that impersonates overfitting**; §7 the six levers ranked by cost |
| Metrics, thresholds, calibration, imbalance | `ml-evaluation-and-leakage.md` (12,945 B) | §1 choose the metric from the cost structure; §2 thresholds and calibration; **§4 the count trap — averaged metrics hide the wrong number of outputs**; §6 leakage patterns specific to simulation/physics-derived data; §8 field evidence from the corpus |
| Any explanation, importance or causal claim | `ml-interpretability.md` (9,281 B) | §2 method families **and how they fail**; §3 faithfulness and stability; §4 correlated features; §5 correlation is not causation — **wording rules**; §6 per-family method choice |
| Time-ordered data | `ml-time-series.md` (4,609 B) | §1 splitting and validation; §2 where the leakage actually happens; §3 stationarity and differencing |
| Images, rasters, direction/orientation fields | `ml-spatial-and-field-inputs.md` (10,962 B) | §1 direction is not a scalar (doubled-angle / vector form); §2 **rasterising loses extrema — measure the loss, do not assume**; §3 masks are semantics, not decoration; §6 circular statistics |
| Pipeline order, gates, invocation, ml-vs-fem difference table | `ml-pipeline-and-invocation.md` (59,206 B) | the S0→S10 stage table, gates, who calls whom, script usage |
| **What the literature does *not* support** | `ml-literature-gaps.md` (7,582 B) | **12 documented literature gaps** — including the honest entries: *"No paper reported the heuristic losing to a simple baseline"* and *"One frequently-cited paper does not appear to exist"* |

That last one deserves emphasis: a reference file whose job is to say **what is not known** is rare, and it is what
stops a model from confidently citing literature that does not say what it is claimed to say.

### Layer 3 — ⭐ 组合的防坑方法层 · the composed anti-pitfall layer

**This is the layer that does not exist elsewhere.** Not a model list, not a recipe list — a **rule catalogue**
where every rule is a complete inference chain.

#### `ml-discipline-rules.md` — 94 rules, organised by pipeline stage P0–P10

Every rule carries, in a fixed order, **all eight fields**:

```
类别 / 强度 / 适用模式   →   机理   →   工程落地   →   判定方式（可机检）
      →   违反的后果   →   语料反例（带 key）   →   正例（带 key，有则写）   →   关联
```

| Audit of the shipped file | Measured |
|---|---|
| Rules | **94** |
| Rules carrying all six mandatory fields | **94 / 94** |
| Rules carrying **at least one** corpus key | **94 / 94** |
| Rules carrying a `语料反例 (counter-example)` field | **94 / 94** |
| Rules carrying a `正例 (positive example)` field | **39 / 94** |
| Key occurrences in the file | **291** |
| Distinct corpus keys referenced | **114** |

**Strength split — 94 = 85 `MUST` + 9 `SHOULD`.**
`MUST` = violating it makes the conclusion **invalid**. `SHOULD` = violating it must be **explicitly declared**
in the artifact.

**Distribution by pipeline stage:**

| P0 | P1 | P2 | P3 | P4 | P5 | P6 | P7 | P8 | P9 | P10 |
|---|---|---|---|---|---|---|---|---|---|---|
| 6 | 10 | 11 | 7 | 7 | 9 | 12 | 10 | 7 | 7 | 8 |

*(scope · data & labels · splits & leakage · preprocessing & features · baseline & selection · training & tuning ·
evaluation & calibration · interpretability · serving · reproducibility · delivery & evidence)*

**Distribution by category — 8 categories, each rule labelled exactly one:**

| `DIAG` | `SCOPE` | `METRIC` | `LEAK` | `ENG` | `EVIDENCE` | `BASE` | `REPRO` |
|---|---|---|---|---|---|---|---|
| 19 | 16 | 13 | 11 | 11 | 10 | 7 | 7 |

#### These 94 rules were not invented — they were extracted

They come from a systematic close reading of a **266-post corpus** (2026-05-01 → 2026-09-26, **2,275,172
characters**, **1,348 code blocks**, **1,056 images**), which resolves to **229 distinct articles** once
duplicate reposts are removed. **Every rule cites the corpus item it came from, by key** — the format is
`3942513879_<msgid>_<itemidx>`, resolvable back to the source. The reading is credited in §4.10.

#### Five rules, shown in full

These are five of the most load-bearing rules in the catalogue, quoted from the shipped file. Note that each one
gives a **machine-checkable criterion** and names the **real incident** behind it.

**① `P2-01 · 一切预处理必须晚于切分`** — `LEAK` · `MUST`

> **机理**：`fit` 是**信息提取**动作：均值/方差/分位数/主成分方向都会把全部样本（含测试样本）的分布信息
> 编码进变换参数……泛化误差被系统性低估。
> **判定方式**：可机检 —— 断言 `X_scaler.n_samples_seen_ == len(X_train)`；断言脚本中不存在
> `fit_transform(X)`（括号内为全量变量名）形式的调用。
> **语料反例**：`3942513879_2247500038_1` —— 原文把错误写法直接贴出来（`X_scaled = scaler.fit_transform(X)`
> 然后才 `train_test_split`）。

**② `P2-03 · 堆叠/残差/校正器的输入特征必须 OOF`** — `LEAK` · `MUST`

> **机理**：第二层模型的特征若来自第一层的**样本内**预测，则该特征几乎贴合标签（残差≈0），二层学到的是
> "样本内残差有多大"；推理时二层面对的却是真实预测误差……一层的过拟合被原样传递。
> **判定方式**：可机检 —— 断言 `corr(oof, y) < corr(in_sample, y)`；断言 OOF 向量的构造日志里折数 ≥ 2。
> **违反的后果**：**指标虚高**，且融合/堆叠的收益方向可能反转。

**③ `P5-01 · argmax 贴在搜索网格边界时必须扩界或声明不可辨识`** — `DIAG` · `MUST`

> **机理**：最优值落在搜索区间端点上，说明真实最优可能在区间之外 —— 此时报告的"最优超参"只是**网格的边界**，
> 不是数据的最优。
> **判定方式**：可机检 —— 断言 `argmin/argmax` 的索引不在网格首尾；或结果对象带 `boundary_hit: true`
> 与 `unidentifiable: <param>` 字段。
> **语料反例**：`3942513879_2247500642_1` —— LML 最优落在 `length_scale` 的上端且仍单调上升，原文把该端点当作结果呈现。

**④ `P6-01 · 指标必须能看到关心的失效模式（退化断言可机检）`** — `METRIC` · `MUST`

> **工程落地**：在评估脚本末尾写退化断言并接入验收：`assert (y_pred_pos.sum() > 0)`、`assert auc >= 0.5`
> （AUC < 0.5 即报警）、`assert len(set(y_pred)) > 1`（分类）、`assert y_pred.std() > 0`（回归）。
> 断言失败时脚本以非零状态退出。
> **语料反例**：`3942513879_2247500069_1` —— 标签极度不平衡下模型退化成"全预测 0"，正类召回 = 0、
> 准确率 99.8%、混淆矩阵 `[[499,0],[1,0]]`，两套模型的 AUC 都在随机线以下（0.152 / 0.421），
> **而文章对此毫无察觉**。

**⑤ `P7-03 · 注意力热图必须标注均匀基线 1/L`** — `DIAG` · `MUST`

> **机理**：注意力权重是 softmax 输出，天然被约束在区间内且求和为 1。色标把最大值映射到最亮，因此
> **即使权重全部接近均匀值，热图也会呈现出强烈的明暗反差**。不标基线，读者会把"色标对比度"读成"模型找到了重点"。
> **语料反例**：`3942513879_2247500364_1` —— 节点注意力 30 个权重全部在 0.0317~0.0357 之间，而均匀值
> 1/30 = 0.0333；最大最小只差约 12%……**它没有识别出任何"枢纽"，图上之所以看起来反差强烈是因为色标把极小差异放大了**。

Two more worth naming, because they combine a metric with a business decision:
`P6-03` requires coverage **and** interval width to be reported together (either alone can be gamed), and
`P6-06` requires a threshold to be tied to the cost direction with the shifted confusion matrix reported.

#### The cross-domain lesson — "the mechanism has a name" ≠ "the mechanism is on"

The rule catalogue's sharpest single finding came from putting two corpora side by side: a **21-chapter /
exactly-200-item algorithm catalogue**, and an article about **LightGBM's internal heuristics** (GOSS, EFB,
histogram binning, leaf-wise growth). Reading them together surfaced a failure mode neither documents alone:

> An article presented GOSS and EFB as accelerators, while **the example code enables neither**.
> A reader who trusts the prose spends hours wondering why their speedup never materialised.

Recorded at `chatdump/extract_A1.md:224` as finding **A31**, one of **5 technical errors** the project
established against the article by checking the **LightGBM source code** and **official release notes** rather
than other blogs. The transferable rule: **read the configuration, not the description.** This is exactly why
every rule in this catalogue must supply an *engineering landing* that can be *checked*, instead of a mechanism
that can only be *named*.

---

## §4.3 Advantage 2 — it does not rot: the layered ledger

> 优势二：**不会有上下文腐化**。下面是机制，不是口号。

A long session degrades in a specific way: early facts blur, decisions get re-litigated, and an automatic
compaction can summarise away exactly the detail that mattered. This preset replaces memory with **files** and
replaces re-reading a transcript with a **restatement step**.

### ① The L0 → L3 layered ledger, with a one-way citation rule

| Layer | File | Holds | Rule |
|---|---|---|---|
| **L0** | `event.log` | append-only raw events, one per line: `<ISO time> \| <phase> \| <event>` | **never edit a historical line** |
| L1 | *(turn summaries)* | per-turn compression | may cite L0 |
| **L2** | `decisions.md`, `todo.md` | every decision with the options offered, the answer, and who chose; outstanding steps with their done-definitions | may cite L0/L1 |
| **L3** | `HANDOFF.md` | the handoff itself | may cite lower layers |

> **Layering rule: a higher layer may only *cite* a lower layer; it must never *overwrite* one.**

That single sentence is what makes context rot structurally impossible rather than merely discouraged: the raw
record cannot be rewritten by a summary, so a later reader can always descend from a confident conclusion back to
the primitive event that produced it. (`preset/skills/context-handoff/SKILL.md` §2)

### ② Two thresholds that are different things — 70 % / 80 %

| Threshold | What happens | Why they are separate |
|---|---|---|
| **70 %** of the context window | **the agent** externalises: writes/refreshes the handoff, the decision log, the event log, the state snapshot | **you** choose what to preserve |
| **80 %** of the context window | **the harness compacts automatically** | the harness reclaims space |

Externalise **before** compaction, not after — compaction keeps only a summary, and a compaction that fails
mid-transaction can leave a lock that blocks later compaction. The handoff must exist first.

### ③ The handoff template is a **ten-section** document

`HANDOFF-<task id> <date>`: **0** Meta · **1** Goal and acceptance · **2** Current status · **3** Key decisions
(ADR) · **4** Keyword facts · **5** Tests and evidence · **6** Open / assumptions / risks · **7** Next steps ·
**8** Rollback plan · **9** Original-context index · **10** Handoff confirmation.

Section 4 is named "**Keyword facts**" and the writing rule is strict: paths, commands, APIs, error codes,
versions, config keys and thresholds are copied **verbatim** — *do not rewrite facts*. Section 10 is the
**successor's restatement**, which is the part that actually catches failures.

### ④ The resume protocol — six steps, and step 2 is mandatory

1. Load **only** `HANDOFF.md`, `decisions.md`, `todo.md` and the code files actually needed. **Do not** dump the
   previous transcript into the new session.
2. **Restate first:** goal, acceptance criteria, constraints, current status, next step — **in your own words,
   before touching anything.**
3. List what is uncertain or missing. **Reading is allowed; acting is not.**
4. **Run the verification commands recorded in the handoff** and confirm the environment still matches.
5. **Only then** continue the work.
6. Afterwards, update the handoff, the decision log, and the event log.

Step 4 is the one that catches real failures: a dependency that moved, a driver that changed, a file that no
longer exists.

### ⑤ Subagents hold a self-contained brief — the main context is never polluted

Reviewer and criticizer subagents run through `run_plan_subagent`. A subagent **cannot see the main
conversation**; it receives a written brief and returns a written report. Its entire intermediate reasoning —
wrong turns, discarded attempts, long file dumps — never enters the main context at all. They are also
**read-only by construction** (the tool passes a `deny` filter for `write` / `edit` / `subagent`), so a reviewer
cannot "helpfully" fix the thing it is reviewing. This is asserted by the shipped self-test.

### ⑥ State lives on disk, not in the context

`preset/scripts/dsh_plans_state.py` reads and writes `dsh-plans/.state/` (run records, `decisions.jsonl`,
`subagents.jsonl`, `refs.jsonl`). Every decision is written to `DECISIONS.md` with the options that were offered
and the answer that was given. The plan artifacts are `PLAN_vN.md` — **versioned files**, so a revision is a new
file rather than a mutation of the old one.

### ⑦ "Write to disk, then take the next step" — an engineering fact, not a slogan

Every unit of work lands on disk the moment it is done. This discipline has been tested on this project in the
harshest way available: during one round, **seven subagents were killed simultaneously mid-flight**. Because each
had already written its findings to disk, the recovered state was intact — the continuation only had to fill the
gaps, not redo the work. *Reported as a first-hand engineering observation from this project's own run history.*

> **What this skill does not do** (stated by the skill itself): it does not compress the context; no
> keyword-frequency or extractive compression exists in this harness. It does not reduce the system prompt, tool
> schemas or session prefix — those count toward pressure and compaction cannot shrink them. And it does not make
> a resumed session *equivalent* to the original: it makes it **traceable**, which is the achievable goal.

---

## §4.4 Advantage 3 — it does not invent things: 8 anti-hallucination mechanisms

> 优势三：**尽量减少了 AI 幻觉**。下面 8 条机制，每条配**本项目真实发生过的案例** —— 都带源文件与行号，可回源核。

**This is the section that separates this project from prompt collections.** Each mechanism exists because
something actually went wrong first; the case is quoted from the project's own evidence files.

📄 **Full write-up with verbatim quotes: [`docs/ANTI-HALLUCINATION.md`](docs/ANTI-HALLUCINATION.md)**

| # | Mechanism | The real incident |
|---|---|---|
| **1** | **Never guess content from a title or abstract — open the artifact** | An article titled *"讲透200个机器学习模型：随机森林、XGBoost、LSTM、Transformer"* measures **2,511 characters, 0 formulas, 0 code blocks**. The four named models appear **only as bare entries inside a promotional list** — never explained. Write the brief from the title and you credit it with teaching four algorithms it never explains. |
| **2** | **⭐ To settle a suspicion, count in the source — do not reason harder** | The project wrote **13 dedicated `check_*` / `probe_*` / `verify_*` scripts** in `recon/`. `where_did_the_space_go.py` re-fetched the raw HTML to determine whether missing whitespace was the source's doing or the extractor's — and stated the consequence first: **if the source really has no space, then "fixing" it is fabricating content.** `check_duplicates.py` turned "266 articles" into **266 postings / 229 distinct**. `repair_sha_typos.py` proved image-hash corruption was note-layer transcription error (`f→1`, `5→c`), **not** an extraction defect — using a strict three-condition test where all three must hold before anything is changed. |
| **3** | **Separate "the source claims" from "externally measured"** | Settled a LightGBM article's claims against **LightGBM's own source code** and **official release notes**, establishing **5 technical errors** — including a gain formula that is XGBoost's (with a `1/2` factor LightGBM's `GetLeafGain` does not use) and an API **removed in v4.0** that the article still taught. The project also **declared its own limit**: static evidence only, which "does **not** establish runtime behaviour". |
| **4** | **A partial read cannot license a universal conclusion** | A subagent asserted *"the text contains no Transformer anywhere"* after reading **118 of 200 items** — chapter 21, item 11 **is** `Transformer`. Separately, a correct boundary was mistaken for complete coverage: figures 1–7 cover chapters 1–11, but **the last 6 items of chapter 11 are not in them** (clipped by the footer bar). |
| **5** | **A successful download is not a successful read — open it** | A paper ID guessed from memory downloaded fine and turned out to be **a completely different paper** (*Hyperspectral Super-Resolution* instead of a PSO survey) → deleted, **not counted**. Another PDF downloaded at **1,043,224 B with a correct `%PDF-` magic number and 6 pages** — and rendered as **pure blank white pages** (a blank scan) → deleted. Magic-number validation caught **3 fake downloads** whose `.pdf` files were actually HTML. |
| **6** | **Subagents must self-check their tooling before concluding** | Batches of subagents had **no vision channel** or OCR only. They **reported the missing capability** instead of inventing figure captions — and the follow-up round **tested the channel before using it** ("先真的调了一次 `read_image` 看到像素"). Re-reading found real corrections: one note's figure list had **5 of 8 items belonging to a different article**. |
| **7** | **Machine checks outrank self-reports** | The project's own progress scripts judged "has this been read?" by whether the note file **existed** — so a **0-byte empty note was counted as read**. The fix was a content-based integrity check (`recon/check_note_integrity.py`), and it found a **second instance of the same class of error** elsewhere. This is why all 94 rules carry a **machine-checkable** criterion where one is possible. |
| **8** | **Provenance discipline: every claim carries a key** | **94 / 94 rules** cite at least one corpus key — **291** key occurrences, **114** distinct keys, resolvable back to `wechat-corpus/`. The rule is absolute: **no scale claim may appear without a key.** |

> **One correction, made in public.** The project's internal spec recorded the `*{` suspicion as "1 out of 6,034".
> Re-checked against the corpus, **that figure is not reproducible** — measured across the 266 article files there
> are **6,120** `[[TEX:` markers and **10** occurrences of `*{`, confined to **3 posting files (2 distinct
> articles)**. The **mechanism** it illustrated is real and independently documented; the **number** was not
> supported, so it is not repeated here. *That is mechanism 8 applied to this very README.*

---

## §4.5 Advantage 4 — the reference-finding methodology

> 优势四：**找论文的方法论**。这是一套可复制的流程。

`preset/skills/reference-before-plan/SKILL.md` is the skill that runs **before** a plan is written. Its method is
a hard, ordered pipeline, not advice:

**① Read-only reconnaissance first, then choose search terms.**
Inspect the target repository **read-only before any external research**, *so that search terms match the actual
codebase and constraints* — instead of matching your imagination of them.

**② At least 3 credible references must be *actually downloaded* before `PLAN_v1.md` exists.**
Explicitly **not counting**: landing pages, README-only snapshots, abstracts, package metadata, curl-only
fragments — *"do not count when deeper source material is available."* Large downloads go **outside** the target
repo, under `~/.cache/dsh-plans/refs/<repo-slug>/<topic>/`.

**③ Every reference records metadata + a local path** in `REF_ANALYSIS.md` and
`dsh-plans/.state/runs/<run-id>/refs.jsonl`: **title · URL · kind · retrieval method · date accessed · local path ·
coverage · evidence gaps.**

**④ Every reference gets a structured analysis artifact *before* any adoption question is asked.**

**⑤ Every reference gets at least 3 reference-specific adoption questions** — each grounded in the **downloaded
content** — with the recommended option **first**, `Other` **second-last**, and `Auto-complete` **last**. The
governing rule:

> **A reference's ideas are not eligible for `PLAN_v1.md` until its adoption-question answers are recorded.**

**⑥ Block rather than pad.** If fewer than 3 credible references exist, **block** — unless the user explicitly
narrows the topic or waives the minimum. **`Auto-complete` cannot grant this waiver.**

**⑦ Verify after download** — see §4.4 mechanism 5 for what this catches in practice (a wrong paper, a blank
scan, and 3 HTML files wearing a `.pdf` extension).

**⑧ Confidence-tier the sources, and declare bounded reading.**

| Confidence | Source type |
|---|---|
| **High** | primary paper · official specification · **source code** · official release notes |
| **Medium** | survey · textbook chapter · maintained documentation |
| **Low** | lecture slides · tutorial blog |

and state the bound honestly — the project's own logs record readings like *"only the table of contents and the
specified pages of a 454-page book were read."*

---

## §4.6 The pipeline S0 → S10 and its gates

> **Contract precedes code; code is downstream of the contract.**

📄 **Full stage table with inputs, outputs and gates: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)**

```
S0 立项与范围 → S1 数据与标签 → S2 切分设计 → S3 特征与预处理 → S4 基线与选型
  → S5 训练与调参 → S6 评估与校准 → S7 可解释性 → S8 上线口径 → S9 交付与证据 → S10 复核与回滚
                                                        │
              任一 MUST 门禁失败 ──► 停在本阶段 ──► 写进 ML_BRIEF.md「未测/冲突」栏 ──► 不前进
```

**11 stages. Each has an input, an action, an artifact that must land on disk, and a gate.** A few of the gates,
verbatim from the pipeline reference:

| Stage | Gate — do not advance unless |
|---|---|
| **S0** | item 1 contains no `TBD`; an explicit **out-of-domain invalidity** statement exists |
| **S1** | label provenance is written down **and none of its derived features entered the inputs** |
| **S2** | split unit = specimen/case (**not** a cell, **not** a time point); three-zone partition defined |
| **S4** | the trivial baseline's number **is on disk** — a comparison merely promised in prose is not a baseline |
| **S5** | the test set is **untouched** (touching it voids the run); `argmax` pinned to the grid edge must be extended or declared unidentifiable |
| **S6** | the metric can see the failure mode you care about; **AUC must not sit below 0.5 without an alarm** |
| **S7** | **without stability/faithfulness evidence you may not report importance or SHAP** |
| **S8** | the serving path **re-fits nothing** |
| **S10** | **all boxes ticked** before `update_goal complete` |

### The six-item contract, and which rules bind to each item

`ML_BRIEF.md` lives at `dsh-plans/<slug>/ML_BRIEF.md`. **"TBD" is not an answer.**

| # | Item | Binds to |
|---|---|---|
| 1 | Task type and target variable | **P0** |
| 2 | Data structure and split | **P1 + P2** |
| 3 | Which data selects the model, and is the test set touched once | **P2 + P5** |
| 4 | Metric and baseline | **P4 + P6** |
| 5 | Leakage and distribution shift | **P2** |
| 6 | Interpretability requirement and causal wording | **P7** |
| **7** | **Unmeasured / conflicting — mandatory column** | **P9 + P10** |

Column 7 is the only legitimate exit for "did not measure" and "could not measure". Its governing principle:
***"Not measured is not false."*** With an unexplained gap in column 7, the conclusion **may not be asserted** and
the goal **may not be marked complete**.

📄 **A complete, filled-in contract you can copy: [`examples/ML_BRIEF.example.md`](examples/ML_BRIEF.example.md)** —
six items fully answered, plus a column 7 with **7 honest open items** showing what partial success actually
looks like.

### The Verifier Checklist is generated, not invented

Every one of the **85 `MUST`** rules must correspond to **at least one checkbox** in its own stage
(`SHOULD`-level rules go only into column 7). The checklist's size is therefore a function of the rule set, not
of the author's optimism.

### When a MUST fails — six ordered steps

| Step | Action |
|---|---|
| 1 | **Stop at the current stage.** Do not advance; do not write the next stage's artifact. |
| 2 | Record the failure in `ML_BRIEF.md` column 7: rule section, stage, why unmeasured, evidence on both sides. |
| 3 | Distinguish **"unmeasured"** from **"does not hold"** — you may write neither "it holds" nor "it is false". |
| 4 | Choose a disposition: re-measure · narrow the claim · roll back. |
| 5 | Synchronise: one line in the Revision Ledger, one line in `decisions.jsonl`. |
| 6 | **Only now** may you continue. |

**Touching the test set is irreversible** — it cannot be repaired by "splitting again"; the run's S5–S6 restart.
A failed `SHOULD` does not block, but **must be explicitly declared** in the artifact.

---

## §4.7 Quick start

```powershell
git clone https://github.com/Jxbbbbbyan/dsh-ml-planner.git
cd dsh-ml-planner
pwsh -File scripts/install.ps1          # installs preset/ into $env:USERPROFILE\.dsh\.agent-presets\ml-planner
pwsh -File scripts/verify.ps1           # one-shot self-check (3 validators, real exit codes)
```

```bash
# bash / macOS / Linux
git clone https://github.com/Jxbbbbbyan/dsh-ml-planner.git
cd dsh-ml-planner
bash scripts/install.sh
```

**Verify a checkout without installing anything:**

```powershell
pwsh -File scripts/verify.ps1 -Preset ./preset
```

Measured output of exactly that command, on the machine this README was written on:

```
validator                  exit   result
validate_preset.py            0   PASS
selftest.mjs                  0   PASS (45 PASS / 0 FAIL)
verify_integrity.py           0   PASS (portable mode, L1 not applicable)

OVERALL: PASS (3 validator(s), all exit codes 0; 2 SKIP line(s) reported by the integrity verifier)
```

### Dependencies — measured, not guessed

| Dependency | Requirement | Evidence |
|---|---|---|
| **Node.js** | **Required** (for `selftest.mjs`, `router-planner-*.mjs`, `lib/plan-subagents.js`). Measured working on **Node v26.9.0**; the modules are plain ESM with no version-pinned syntax, so any current Node LTS should run them. | `preset/scripts/selftest.mjs` runs standalone |
| **Python** | **Required** for `dsh_plans_state.py`, `validate_preset.py`, `verify_integrity.py`. Measured on **Python 3.13.13**. **Standard library only** — the scripts use `pathlib`, `subprocess`, `hashlib`, `re`, `argparse`. | `import` blocks in all three scripts |
| **npm dependencies** | **Zero runtime npm dependencies.** There is **no `package.json` anywhere in the preset** — verified by an exhaustive search. `install.sh` / `install.ps1` copy files; they do not run `npm install`. | exhaustive `package.json` search returns nothing |
| **`PyYAML`** | **Optional.** `validate_preset.py` imports `yaml` inside a `try`, and prints `SKIP: composition YAML check (PyYAML not installed)` if it is absent. With it, it additionally validates `agent.cordis.yml`'s structure. Measured present: **PyYAML 6.0.3**. | `preset/scripts/validate_preset.py` |
| **DSH (DeepSeek Harness)** | **Required to actually use it** as a preset — the preset is discovered from `~/.dsh/.agent-presets/`. **Not required to verify it**: `selftest.mjs` exercises the router modules with **no host running**, and the README's numbers were produced that way. | `selftest.mjs` header: *"在不启动 DSH 宿主的前提下"* |
| **PowerShell** | **7.x** for `install.ps1` / `verify.ps1` (measured on **7.6.6**). `install.sh` covers bash environments. | `scripts/*.ps1` use `[CmdletBinding()]` and PowerShell 7 syntax |
| **Platform** | Windows path handling appears in the install scripts; the preset content itself is path-agnostic Markdown/JSON/Python/ESM. | — |

`verify.ps1` auto-detects a usable Python, deliberately **skipping the Microsoft Store stub** on `PATH` (it tests
the candidate by running `print(7*6)` and checking for `42`). Override with `-Python` / `-Node`, or set
`$env:ML_PLANNER_PYTHON` / `$env:ML_PLANNER_NODE`.

### What this repository does **not** include

- ❌ **No finite-element / FEM material.** The sibling preset `fem-ml-planner` and its
  `scripts/vtu_to_tensor.py` (solver `.vtu` → raster tensor) are **not** part of this repository. Those files are
  present in the author's environment but were deliberately **excluded** — this repo ships only machine-learning
  planning content.
- ❌ **No GUI automation or ChatGPT-sidebar skills.** The author's preset also contains skills for driving a
  browser's ChatGPT sidebar and for real-OS GUI input automation. They are **not included here** and are not
  referenced, because they are unrelated to ML planning.
- ❌ **No dataset, no pre-trained model, no training script, no API key, no cloud config.** This is a *planning and
  discipline* layer. It constrains how ML work is done; it does not do the ML for you.
- ❌ **No `package.json`, no `node_modules`, no Python virtualenv.** Nothing to install beyond Node and Python.

---

## §4.8 Repository structure

```
dsh-ml-planner/
├─ README.md                    ← this file
├─ LICENSE                      ← MIT
├─ CHANGELOG.md                 ← v0.1.0 first release
├─ .gitignore  .gitattributes   ← .state/, __pycache__, node_modules, *.log; forced LF
├─ docs/
│  ├─ ARCHITECTURE.md           ← S0–S10 pipeline, gates, invocation, contract binding
│  ├─ ANTI-HALLUCINATION.md     ← the 8 mechanisms with verbatim source quotes
│  ├─ FILE-INDEX.md             ← one line per file
│  └─ PRESET-README.original.md ← the preset's original README, preserved
├─ preset/                      ← the preset itself (36 files, 539,315 B) — copy this to ~/.dsh/.agent-presets/ml-planner
│  ├─ agent.cordis.yml  preset.yml  README.md
│  ├─ router-planner-bootstrap.mjs  router-planner-core.mjs
│  ├─ lib/                      ← ml-keywords.json (118 terms + 19 ambiguous), plan-subagents.js
│  ├─ scripts/                  ← dsh_plans_state.py · selftest.mjs · validate_preset.py · verify_integrity.py
│  │  └─ fixtures/              ← ml-band-cases.json (10 positives / 7 negatives)
│  └─ skills/
│     ├─ ml-modeling-plan/      ← the ML entry point + references/ (14 documents)
│     ├─ create-a-small-plan/  create-a-plan/  create-a-big-plan/
│     ├─ diagnose-before-plan/  reference-before-plan/
│     ├─ context-handoff/       ← the anti-rot handoff skill
│     └─ references/            ← 3 shared normative references
├─ scripts/
│  ├─ install.ps1  install.sh   ← copy preset/ into ~/.dsh/.agent-presets/ml-planner
│  ├─ verify.ps1                ← runs all three validators, prints real exit codes
│  └─ push-to-github.ps1        ← create the remote and push (reads $env:GH_TOKEN)
└─ examples/
   └─ ML_BRIEF.example.md       ← a filled-in six-item contract
```

📄 **One line for every file and directory: [`docs/FILE-INDEX.md`](docs/FILE-INDEX.md)**

The **7 skills** and what each is for:

| Skill | Purpose |
|---|---|
| `ml-modeling-plan` | **ML entry point.** A router: decides which reference to load and what must be written first. Requires `ML_BRIEF.md` before any training code. |
| `create-a-small-plan` | Plan a small, scoped repository change (1–3 planning questions, one criticizer pass). |
| `create-a-plan` | Plan a broad or risky change (5–10 planning questions, web research, bounded refinement). |
| `create-a-big-plan` | Plan an open-ended, high-risk effort (10+ questions, reviewer **and** criticizer rounds, refinement to convergence). |
| `diagnose-before-plan` | Root-cause a failure — bug, CI break, regression, incident — **before** deciding whether to plan. |
| `reference-before-plan` | Research external references **before** planning: ≥3 downloaded credible references, per-reference analysis, adoption questions. |
| `context-handoff` | Keep a long session from rotting: the 70 %/80 % thresholds, the ten-section handoff, the six-step resume protocol. |

---

## §4.9 Self-check and integrity

Three validators ship inside the preset. They check different things, and **one of them cannot run without an
upstream baseline** — which is stated plainly rather than hidden.

| Validator | Checks | In a fresh clone |
|---|---|---|
| `selftest.mjs` | **45 checks** in 6 sections: behaviour-band classification, guidance text, session-log reading under **both** Session API shapes (`seq`/`eventAt` and legacy `events`), the narrowed first-turn tool face per band, promotion to the full catalog after the first `tool/call`, the three `dev_*` tools, and `run_plan_subagent`'s read-only deny filter | ✅ **Runs.** Measured **45 PASS / 0 FAIL**, exit **0** |
| `validate_preset.py` | Structure: the 5 planning skills exist with matching `name:` and a `description:`; the 3 shared references exist; `dsh_plans_state.py --help` executes; `agent.cordis.yml` parses and names rows `tool-skill` / `tool-goal` / `plan-subagents-tool` / `tool-ask-user` | ✅ **Runs.** Measured `preset validation OK`, exit **0**. The YAML half **SKIPs with a message** if `PyYAML` is absent |
| `verify_integrity.py` | Manifest self-consistency + copy fidelity + generated files, against `preset-integrity-manifest.md` (**17 rows**, manifest 124,693 B, fingerprint `e17fc190…`). One level needs an upstream baseline that a clone does not have | ✅ **Mostly** — see below |

### What each integrity level actually checks, and whether a clone can run it

| Level | Object | Runs in a fresh clone? | Measured on this checkout |
|---|---|---|---|
| **manifest** | self-consistency: do the 17 recorded rows hash to the recorded fingerprint? | ✅ **Yes** — the layer genuinely verifiable by anyone | **PASS** — `17 rows hash to the recorded fingerprint (e17fc1907bc75db7e7992459afab4c67cec832f6fcf065c107f03917fa79db22)` |
| **L2** | copy fidelity: this preset's **11** pure copies hashed against the manifest's recorded hashes | ✅ **Yes** — it hashes the preset's own files against the manifest, so it needs no upstream | **pure copies identical: 11/11** |
| **L2'** | intentional edits present (6 files) | ✅ presence yes · ⚠️ the *deleted-lines* guard compares against upstream | **6 present**; deleted-lines guard **SKIP** |
| **L3** | generated files present | ✅ Yes | **generated files present: 31** |
| **L1** | the **upstream** `router-planner` baseline — every hash and the file count | ❌ **Not applicable** — the upstream preset is not part of this repository | **SKIP** (`no upstream baseline`) |

**So the honest summary is:** a clone can verify the **manifest, L2, L2'-presence and L3** — which is the substance
of the check — while **L1 is reported as SKIP rather than as a pass**, because a level that cannot be evaluated is
not a level that succeeded.

`verify_integrity.py` now reports **PASS / FAIL / SKIP** separately, and **a SKIP is not counted as a pass** — the
run prints `SKIPPED (2): L1, L2'-deleted-lines` and `RESULT: PASS (every applicable level)`. The overall
`verify.ps1` summary says so explicitly. If you *do* have the upstream preset installed:

```powershell
pwsh -File scripts/verify.ps1 -BasePreset "$env:USERPROFILE\.dsh\.agent-presets\router-planner"
```

> **A documented deviation, disclosed here.** To make this preset usable by someone who is *not* its author, three
> parameterisation patches were applied to `preset/scripts/verify_integrity.py`:
> **(1)** removed two hard-coded absolute personal paths, so `--preset` auto-locates and `--source` is optional;
> **(2)** separated PASS / FAIL / **SKIP** and excluded a missing baseline from the exit code;
> **(3)** fixed a crash on non-UTF-8 consoles — the script printed `⇒` (U+21D2), which died with
> `UnicodeEncodeError` under a GBK console before it could report a verdict; `verify.ps1` now forces
> `PYTHONIOENCODING=utf-8` / `PYTHONUTF8=1` for the child interpreter.
>
> **These are the only deviations from a byte-identical copy, and they are declared rather than hidden.** The
> consequence is that `preset/scripts/verify_integrity.py` is **not** byte-identical to its upstream counterpart;
> every other shipped file is.

---

## §4.10 Provenance and credits

### Where the rules came from

The **94 rules** in `ml-discipline-rules.md` were extracted by systematic close reading of a practitioner corpus:

| Corpus property | Measured |
|---|---|
| Window | **2026-05-01 → 2026-09-26** |
| Postings harvested | **266** |
| **Distinct articles** after de-duplication | **229** |
| Total characters | **2,275,172** |
| Code blocks | **1,348** |
| Images (unique / referenced) | **1,056 / 1,056** |
| Per month | 2026-05: 38 · 06: 41 · 07: 55 · 08: 63 · 09: 69 |
| Formula-bearing articles | **191** of 266 |

**Scope stated honestly.** 266 harvests resolved to 229 distinct articles — the difference is duplicate and
revised reposts, measured by `recon/check_duplicates.py` and recorded in `CANONICAL.json`
(`total_postings: 266`, `distinct_canonical: 229`, with thresholds `near_exact 0.99` / `revised 0.8` /
`image_jaccard 0.5`). The corpus is a **single practitioner account**, not a peer-reviewed survey: it is a source
of **failure modes and their frequency**, not of theoretical guarantees. Where a rule asserts something
mechanistic, it was settled against the **primary source** — the paper, the official documentation, or the source
code — and not against the blog post. The five technical errors found in one LightGBM article (§4.2) are the
concrete product of that distinction.

**Nothing here was taken on trust from the corpus alone.** Every corpus number used to justify a rule is
reproducible from the files listed in §4.4; where a claim could not be reproduced, it was corrected in public.

### External material referenced while establishing the rules

- **LightGBM** — Ke et al., *LightGBM: A Highly Efficient Gradient Boosting Decision Tree* (NeurIPS 2017); plus
  the **LightGBM source** (`GetLeafGain`, `CalculateSplittedLeafOutput`) and the **official v4.0.0 Release Notes**,
  which settled the `1/2`-factor and `early_stopping_rounds` findings.
- **XGBoost** — Chen & Guestrin, *XGBoost: A Scalable Tree Boosting System* (KDD 2016), whose exact gain formula
  (with the `1/2` and `−γ`) is what the article under review had mislabelled as LightGBM's.
- **Hidden Technical Debt in Machine Learning Systems** — Sculley et al. (NeurIPS 2015), the standard reference for
  why ML systems fail at the boundary rather than in the model.
- **The ML Test Score** — Breck et al., *The ML Test Score: A Rubric for ML Production Readiness and Technical
  Debt Reduction* (IEEE BigData 2017), the closest prior art for turning ML practice into *checkable* items — and
  the direct intellectual ancestor of a rule catalogue with machine-checkable criteria.
- **Conformal prediction / calibration** — Vovk et al. and the split-conformal literature, which is why `P6-03`
  requires coverage **and** interval width to be reported together rather than either alone.
- **Sensitivity analysis** — Saltelli et al., *Sensitivity analysis. A coming of age?* — noted because the project
  records that **one download attempt returned an HTML anti-bot page instead of the PDF and was deleted**, and the
  analysis was re-sourced elsewhere. That failure is documented rather than papered over.
- **DSH planning workflow** — the base planning mode is adapted from
  [Optim-Agent/dsh-plans](https://github.com/Optim-Agent/dsh-plans), and the routing layer from
  [yjh051108/dsh-routing-suite](https://github.com/yjh051108/dsh-routing-suite)'s `router-standard`.

Citation of a work means it was consulted as a **primary or comparative source**. It does not imply the author
endorses this project.

---

## §4.11 Closing

### Find it by topic

Searchable GitHub topics for this repository:

```
dsh · llm-agent · ai-agent · agent-skills · machine-learning · mlops
planning · prompt-engineering · data-leakage · reproducible-research
python · pytorch · scikit-learn
```

*(Set these in the repository's About → Topics settings.)*

### License

**MIT** — see [`LICENSE`](LICENSE). The preset's own `preset.yml` carries no conflicting license declaration.

### Contributing

The highest-value contributions, in order:

1. **A new rule, with a key.** If you have a real ML incident with a reproducible trace, `ml-discipline-rules.md`
   is designed for it: category · strength · mechanism · engineering landing · **machine-checkable criterion** ·
   consequence · counter-example. Rules without a traceable source do not fit the format and cannot be merged.
2. **A correction.** If a number in this README or in the rule files does not reproduce, open an issue with the
   command you ran and the output you got. **The measurement wins** — that is the rule this repository is built on,
   and it applies to the repository itself (§4.4 correction, §4.9 deviation).
3. **A counter-example.** A documented case where one of the 94 rules was wrong, or where following it made
   things worse. The catalogue currently carries `SHOULD` rules without a positive example and **39 / 94 rules
   carry a positive example** — raising that number by finding cases where a rule *helped* is genuinely useful.
4. **A port.** The rule catalogue is ML-specific; the *shape* — contract before code, machine-checkable criteria,
   provenance keys — is not. Adapting it to another engineering domain is a welcome fork.

### Roadmap

1. **Wire the keyword fixture into an automated check.** `preset/scripts/fixtures/ml-band-cases.json` carries 10
   positive and 7 negative trigger cases — including three deliberate traps — with a recorded result of 10/10 and
   7/7, but **no script reads it**: `selftest.mjs`, `validate_preset.py` and `verify_integrity.py` all ignore it, so
   a keyword-table edit can regress trigger behaviour while every automated check still reports green. The data
   file's own `_comment` says it is "Read by scripts/selftest.mjs and by the keyword validator" — neither reader
   exists: `selftest.mjs` never opens it, and there is no keyword validator on disk.
2. **Make `verify_integrity.py` able to evaluate every level offline.** L1 is the one level that needs the
   upstream `router-planner` preset, which ships in nobody else's clone, so today it reports **SKIP**. Vendoring
   the upstream baseline rows as a fixture would let a reader verify all levels from a bare checkout instead of
   everything except L1.
3. **Add a second worked `ML_BRIEF` example in a different domain** — the shipped example is tabular
   time-series classification. A physics/simulation-field example would exercise `ml-spatial-and-field-inputs.md`
   and the doubled-angle encoding rules, which are currently documented but not demonstrated end to end.

---

> **The one-line summary.** This preset does not make an agent smarter at machine learning. It makes an agent
> **write down what it is about to do, and why, before it does it** — and it ships the rules, the checks and the
> provenance to hold that promise up to inspection.
>
> 它不承诺模型更准。它承诺：**在你写下第一行训练代码之前，契约已经在盘上了。**
