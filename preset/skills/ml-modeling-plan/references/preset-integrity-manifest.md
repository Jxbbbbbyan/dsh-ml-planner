# preset-integrity-manifest — preset completeness hash manifest

**Generated file — do not edit by hand.** Regenerate with the project's generator script so the
hashes stay a truthful record of the copied baseline. The verification script reads **this file**
as the single source of truth; hashes must never be duplicated as constants in code.

## Why this file lives inside the skill

The requirement was that the hash manifest be part of the delivered skills, so that anyone holding
this preset can verify for themselves that the planning mode it was copied from is intact — without
trusting a claim in a document.

## Three-level recursive verification

| Level | Object | Rule |
|---|---|---|
| **L1 baseline** | the source preset, all files | every file hash identical, and the directory still contains exactly the same file count |
| **L2 copy fidelity** | **pure copies inside this preset** | hash identical to the corresponding source file |
| **L3 self-contained** | generated files (word list, scripts, skills) | hashes recomputed by the generator and checked idempotent |

The manifest **does not list itself** (that would be recursive). The word-list mirror is instead
checked by a term-set equality assertion, which is stronger than a hash for that file's purpose.

## L1 baseline fingerprint

```text
MANIFEST_FINGERPRINT = e17fc1907bc75db7e7992459afab4c67cec832f6fcf065c107f03917fa79db22
```

Computed as SHA-256 over the newline-joined `relative-path:lowercase-sha256` pairs. Any single-byte change to any listed file changes this fingerprint.

**Ordering rule (part of the fingerprint's definition).** Entries are sorted by relative path
**case-insensitively**, matching PowerShell's `Sort-Object`, which places `README.md` before
`agent.cordis.yml`. A case-sensitive sort (Python's default) orders them the other way and yields a
different fingerprint for identical content. The rule is pinned so two implementations cannot
disagree about the same files.

## L1 file table (17 files, 124693 bytes)

| # | relative path | bytes | sha256 | classification |
|---|---|---|---|---|
| 1 | `agent.cordis.yml` | 12,918 | `869bacef3ffffef116e193b127688bf1b5ca0c524bac20473b1bc0ae3ad079e5` | intentional-edit |
| 2 | `lib\plan-subagents.js` | 6,066 | `283945f4353092f4dada8fe132e044b81eab00f7d4403644e4bda4da4a80cf02` | pure-copy |
| 3 | `preset.yml` | 440 | `b9704d7c7a82c43e077b73b8b33f2049739e39ed761f0fc5d36241de5120a85c` | intentional-edit |
| 4 | `README.md` | 5,055 | `0583b0faff3c92a6b1e0ff1688ced9faf845512c220fc84078a386fbaa21bdb2` | intentional-edit |
| 5 | `router-planner-bootstrap.mjs` | 15,428 | `78afed88bc6f6b09ed94e1fe70b78e55f8180d7d14a640b8978c6b70aaf37526` | intentional-edit |
| 6 | `router-planner-core.mjs` | 14,909 | `944795e3b6e336ce0fec657f2854d7ce81f313ef54dd4d8bd9940501ee22201b` | intentional-edit |
| 7 | `scripts\dsh_plans_state.py` | 12,410 | `cf06dfb163d502356e35866d2712d6894defe3cb51a3932cfc2aedab57bf7439` | pure-copy |
| 8 | `scripts\selftest.mjs` | 15,314 | `fc5780d60bbf10802142ec6807f5621ae971fe75539be87b0fcb3f0dbc3585f7` | intentional-edit |
| 9 | `scripts\validate_preset.py` | 3,602 | `1a9805d54825cdb6e329c59a85ef1187e860f8c4a4ed90d3ba7ef7b2fbd7f276` | pure-copy |
| 10 | `skills\create-a-big-plan\SKILL.md` | 2,433 | `93b92f31a127c9af8ab44ce73379783201e871c43d9ae2815a06491c9d6387d2` | pure-copy |
| 11 | `skills\create-a-plan\SKILL.md` | 2,153 | `0e1103e2c4fa59f100fc157f84cc04267308fe7a5e80fcd9563438818b03680e` | pure-copy |
| 12 | `skills\create-a-small-plan\SKILL.md` | 1,824 | `1f268c652b159b8ddc2de2d001692da606190b175b9a54f69f46e5da42bfd5e0` | pure-copy |
| 13 | `skills\diagnose-before-plan\SKILL.md` | 3,067 | `5254e5fc06841ebd80f39c099662f1a51766606139f887f3e8ec56557e172117` | pure-copy |
| 14 | `skills\reference-before-plan\SKILL.md` | 3,313 | `9363677f37226e829bfcc06593a4a00f87dfbed8684c86fa1f359bc43bfcd662` | pure-copy |
| 15 | `skills\references\dsh-planning-workflow.md` | 15,508 | `23e757cc367741ae5a8b918c642895d516912dc04ce0745cd9034fae39da2cb9` | pure-copy |
| 16 | `skills\references\plan-artifact-template.md` | 2,470 | `78e4ca05bf7f0f7447dfd07296c1c9c1542cffccd02c42ff6675b6a83baf0297` | pure-copy |
| 17 | `skills\references\state-and-config.md` | 7,783 | `a52cba147d1ebf9a0343e858baf2e173a12de6f401bef599efed30e4be225cae` | pure-copy |

### Arithmetic check

- pure copies: **11**
- intentional edits: **6**
- total: **17** (must equal 17)

## L2 rules for the intentional edits

Intentional edits are **not** hash-equality checked. Each is guarded by a structural diff instead:

| file | guard |
|---|---|
| composition file | row-id set is a superset of the baseline; the subagent deny-list is item-wise equal; the persona prefix is byte-equal; **zero deleted lines** relative to the source |
| display metadata | only the name/description may differ (the directory name *is* the preset id) |
| README | free content |
| routing core | existing samples evaluate identically; the three band guide strings are byte-identical; the ML trigger is additive only |
| bootstrap | may add one delimited block; the first-message capture, mode resolution, guide consumption, pre-step injection and the `dev_*` tools must be untouched |
| selftest | its PASS-line set must be a superset of the recorded baseline |

## L3 generated files

Hashes for generated files are recorded here **after generation** and checked idempotent. This
section is filled by the generator on each run.

| relative path | bytes | sha256 |
|---|---|---|
| `lib\ml-keywords.json` | 10,349 | `bfe51e9e31a22c6f714653c73f325045d397f708cb125a1536c676a11c7747b5` |
| `lib\plan-subagents.js` | 6,066 | `283945f4353092f4dada8fe132e044b81eab00f7d4403644e4bda4da4a80cf02` |
| `scripts\dsh_plans_state.py` | 12,410 | `cf06dfb163d502356e35866d2712d6894defe3cb51a3932cfc2aedab57bf7439` |
| `scripts\fixtures\ml-band-cases.json` | 2,728 | `3971daf015057f5bd23cc7ee5d3b67594a5c600b8c410f3ac8463bed6ba8093f` |
| `scripts\selftest.mjs` | 15,314 | `fc5780d60bbf10802142ec6807f5621ae971fe75539be87b0fcb3f0dbc3585f7` |
| `scripts\validate_preset.py` | 3,602 | `1a9805d54825cdb6e329c59a85ef1187e860f8c4a4ed90d3ba7ef7b2fbd7f276` |
| `skills\create-a-big-plan\SKILL.md` | 2,433 | `93b92f31a127c9af8ab44ce73379783201e871c43d9ae2815a06491c9d6387d2` |
| `skills\create-a-plan\SKILL.md` | 2,153 | `0e1103e2c4fa59f100fc157f84cc04267308fe7a5e80fcd9563438818b03680e` |
| `skills\create-a-small-plan\SKILL.md` | 1,824 | `1f268c652b159b8ddc2de2d001692da606190b175b9a54f69f46e5da42bfd5e0` |
| `skills\diagnose-before-plan\SKILL.md` | 3,067 | `5254e5fc06841ebd80f39c099662f1a51766606139f887f3e8ec56557e172117` |
| `skills\ml-modeling-plan\references\ml-algorithm-families.md` | 7,998 | `96ac893766b0cf458bb3e8d9aabf27f5789d674b2445b7646a8b79b3e8afe1a8` |
| `skills\ml-modeling-plan\references\ml-evaluation-and-leakage.md` | 7,434 | `3c831afe8b2f782d02c890d5d134d30e79ff0bfaaf2c04fb8fa3265bf3017bff` |
| `skills\ml-modeling-plan\references\ml-interpretability.md` | 9,281 | `fbe4e965f2edf3f6b8e8c039c3c36e1427d90a6983aa691550869c35e12c5bac` |
| `skills\ml-modeling-plan\references\ml-keywords.md` | 4,642 | `931a9db3acc997fadcabd9f6a8f7455077e0d568619a66698c34a7230cf28dec` |
| `skills\ml-modeling-plan\references\ml-literature-gaps.md` | 7,582 | `ffe9e369fbed4520d0bbb54c06ad636261f3a650acf687025c0ac2535aeb2a2f` |
| `skills\ml-modeling-plan\references\ml-overfit-underfit.md` | 10,396 | `90dd28b3577548fe548270e073f61bec86348b848b35f2ddcc3ca65805554f90` |
| `skills\ml-modeling-plan\references\ml-spatial-and-field-inputs.md` | 8,440 | `14732bd3acd66269d3c6dbeab5d875f55e0c27aa7cc76777210ddab376a017da` |
| `skills\ml-modeling-plan\references\preset-integrity-manifest.md` | 8,628 | `ea57f01196befa2b58816b5108bef941d8e8dd4547f62de2e72dd37c43f368c4` |
| `skills\ml-modeling-plan\SKILL.md` | 6,112 | `6f4b749b69e22407b79cc2df263b87766a948f08761a8382a6d08ec0d6649a6f` |
| `skills\reference-before-plan\SKILL.md` | 3,313 | `9363677f37226e829bfcc06593a4a00f87dfbed8684c86fa1f359bc43bfcd662` |
| `skills\references\dsh-planning-workflow.md` | 15,508 | `23e757cc367741ae5a8b918c642895d516912dc04ce0745cd9034fae39da2cb9` |
| `skills\references\plan-artifact-template.md` | 2,470 | `78e4ca05bf7f0f7447dfd07296c1c9c1542cffccd02c42ff6675b6a83baf0297` |
| `skills\references\state-and-config.md` | 7,783 | `a52cba147d1ebf9a0343e858baf2e173a12de6f401bef599efed30e4be225cae` |

## How to use this file

1. Verify L1: recompute every hash in the table against the source preset, and confirm the file
   count and the fingerprint match.
2. Verify L2: recompute the pure-copy hashes inside this preset and compare row by row.
3. Verify L2' for edits: run the structural guards above.
4. Verify L3: rerun the generator and confirm this section is unchanged.

If L1 fails, the source preset was modified — the pure copies here can serve as a recovery
source, but the intentional edits cannot.

---

## N5 addendum — corpus-evidenced additions (2026-09-26)

**读 L3 表之前先读这一节。**

本文件的 L3 表是**生成时的快照**。`2026-09-25-wechat-corpus-skill` 轮（N5）在生成之后**扩写了两份 reference**，因此那两行**已陈旧**。**L1 与 L2 不受影响**：源预设与全部纯拷贝逐字节未变，指纹 `e17fc1907bc75db7…` 不变。

| relative path | bytes（生成时 → 现在） | sha256（现在） |
|---|---|---|
| `skills\ml-modeling-plan\references\ml-evaluation-and-leakage.md` | 7434 → **12945** | `b911f446d283792f94da0a512a1ec46ad2360bef285c8786fa14295b3ed98196` |
| `skills\ml-modeling-plan\references\ml-spatial-and-field-inputs.md` | 8440 → **10962** | `542d9f28cb2e520ebdaad81f9484d12674bd7a752b8de8a453f6f16c289024ab` |

**为什么没有直接重写 L3 表。** 本文件写着「Generated file — do not edit by hand. Regenerate with the project's generator script.」，但**本预设与 `router-planner` 里都不存在生成器** —— 只有 `scripts/verify_integrity.py`（校验器）。该指令**按原文无法执行**，这是一处**已登记的可复现性缺口**：上一轮是临时生成该清单的，没有把生成工具留下。因此采用**追加说明**而非改写历史行，与 `event.log` 的「只追加不修改」纪律一致。

**加了什么**（每条都带 `wechat-corpus/` 的文章 `key`，可逐条回源）：

- `ml-evaluation-and-leakage.md` **§8**：预处理先于切分、用测试集选超参、缺 OOF、winner's curse、最优落在网格边界、退化模型被当成成果、只报 accuracy 掩盖多数类基线、**声称有帮助的干预实测反而变差**，以及「图注每条断言必须能在图上指出证据」的硬性检查。**§9**：按样件（而非像素/网格）切分、三区划分（含未标注不参与训练）、标签敏感性实验、标签派生特征禁止入输入、跨物理量目标的名值纪律。
- `ml-spatial-and-field-inputs.md` **§6**：圆统计工具箱（圆均值、`R`、`R→κ` 含小样本修正、±2π 复制的圆 KDE、bootstrap 置信区间与组间 p 值）—— 补上方向场「怎么对方向量做显著性检验」这缺失的一半。**§7**：窗口化变换的**延拓方式**（`pywt.swt` 默认周期延拓会让窗口末端的系数被窗口开头污染）。

**今后的来源纪律**：这些 reference 里凡声称「语料支持」之处，**必须给出文章 `key`**。本次更正的错误恰好是反面 —— 一个没有 key、也没有真正阅读支撑的规模声明（「来自 258 篇文章的交叉提炼」）。见 `dsh-plans/2026-09-22-ml-planning-mode-skill/ERRATA-2026-09-26-G-002-provenance.md`。

### N5 addendum (2) — new reference added (2026-09-26)

skills\ml-modeling-plan\references\ml-model-failure-modes.md 是**新增文件**（L3 表里**完全没有它**）：

| relative path | bytes | sha256 |
|---|---|---|
| skills\ml-modeling-plan\references\ml-model-failure-modes.md | **17408** | 801c9de7e27654320d57f238a45165ac6f8367d9b1473f4010eab88d7fbd59fb |

**内容**：按**模型族**归拢「该族实测出现过的失效模式 + 确实被用到的优化做法」，每条都带语料文章 key（3942513879_<msgid>_<itemidx>）可回源。含 GBDT 系、随机森林/决策树、LSTM/GRU/TCN、Transformer/注意力、SVM/SVR/KNN、聚类与降维、时序与状态空间、数据增强与重采样八族，以及一条跨族硬规则（**正文/图注每条断言必须能在自己的输出里指出证据**）。

**同时**：SKILL.md 的路由表新增一行指向该文件。
L3 表的「generated files present: 29」计数因此**同样已陈旧**（现为 30）。

来源：语料 wechat-corpus/（266 投放 / 229 独立正本），机器索引 wechat-corpus/index/MODEL_LESSONS.md 与 …/EVIDENCE.md。

---

## 灌注轮附注（2026-09-26）

本预设的 `ml-modeling-plan` 技能在本轮被**灌注**（语料 2026-05..09，266 投放 / 229 独立正本）。
**L1/L2 不受影响**：源预设 `router-planner` 与全部纯拷贝逐字节未变，指纹不变。
下表是这几个文件**当前**的 L3 记录值；上方 L3 表是**生成时快照**，对这几行已陈旧。

| relative path | bytes（现在） | sha256 |
|---|---|---|
| `skills\ml-modeling-plan\references\ml-pipeline-and-invocation.md` | 59206 | `3b0890138499d24bc410d98336baf88cbd9fd76423c305aa8a4f841a322072d7` |
| `skills\ml-modeling-plan\references\ml-model-failure-modes.md` | 17408 | `801c9de7e27654320d57f238a45165ac6f8367d9b1473f4010eab88d7fbd59fb` |
| `skills\ml-modeling-plan\references\ml-evaluation-and-leakage.md` | 12945 | `b911f446d283792f94da0a512a1ec46ad2360bef285c8786fa14295b3ed98196` |
| `skills\ml-modeling-plan\references\ml-spatial-and-field-inputs.md` | 10962 | `542d9f28cb2e520ebdaad81f9484d12674bd7a752b8de8a453f6f16c289024ab` |

**生成器缺口**：本文件写着「Regenerate with the project's generator script」，但**整棵预设树里没有生成器**（只有 `scripts/verify_integrity.py` 校验器）。该指令按原文无法执行，故采用**追加说明**而非改写历史行。

**来源纪律**：这些 reference 里凡声称「语料支持」之处**必须给出文章 `key`**（`3942513879_<msgid>_<itemidx>`），不得再出现无 key 的规模声明。

**补记（文件 A 于本轮稍后交付）**：

| relative path | bytes | sha256 |
|---|---|---|
| `skills\ml-modeling-plan\references\ml-discipline-rules.md` | 193510 | `76a3ab3ca184f6913c7ecc16e0bb30cc2675030ef3ed6c174f5aae13ef095c25` |

> **更正（时序）**：文件 A 在本附注首次写入后又被修正两处（§13 里一段自相矛盾的草稿计数改为脚本复算值、一处拼写），
> 字节数与 sha256 已就地更新为**当前值**（193,672 → **193,510**），fem 侧镜像已同步重做并逐字节比对一致。
> 上方 L3 表是**生成时快照**，未改动。文件 A 的规则数为 **94**（P0~P10），**每条都带语料 `key`**。
