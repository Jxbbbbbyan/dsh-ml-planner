# FILE-INDEX — one line per file

> **中文摘要**：本仓库每个文件与目录的**一句话用途**。全部数字（文件数、字节数）均为实测。
> `preset/` 下 **36 个文件 / 539,315 B**；仓库总计 **49 个文件**（不含 `.git/`，含本文件为 50）。

Legend: **[R]** = repository-level file (not part of the installable preset) · **[P]** = ships inside `preset/`
and is installed into `~/.dsh/.agent-presets/ml-planner`

---

## Repository root

| Path | Bytes | Purpose |
|---|---|---|
| `README.md` **[R]** | 55,885 | The front page: what you are actually downloading (§4.0), positioning, the four advantages, pipeline and gates, quick start, dependencies, self-check results, provenance. |
| `LICENSE` **[R]** | 1,084 | MIT license text. |
| `CHANGELOG.md` **[R]** | 9,827 | Version history; `v0.1.0` is the first release. |
| `.gitignore` **[R]** | 1,770 | Ignores `.state/`, `__pycache__/`, `node_modules/`, `*.log` — keeps run ledgers and caches out of the repository. |
| `.gitattributes` **[R]** | 846 | Forces LF line endings, so a Windows checkout does not pollute the tree with CRLF diffs. |

## `docs/` — the written documentation

| Path | Bytes | Purpose |
|---|---|---|
| `docs/ARCHITECTURE.md` **[R]** | 23,840 | The S0–S10 pipeline with input/action/artifact/gate per stage, the invocation map, the six-item contract to rule-section binding, the six-step MUST-failure procedure, and what each shipped script checks. |
| `docs/ANTI-HALLUCINATION.md` **[R]** | 24,474 | The eight anti-hallucination mechanisms, each expanded as **mechanism + verbatim real incident + file:line + a practice you can copy**. |
| `docs/FILE-INDEX.md` **[R]** | *(this file)* | One line per file, with measured byte counts. |
| `docs/PRESET-README.original.md` **[R]** | 5,055 | The preset's original README, preserved so the pre-existing documentation is not lost when the repository README took the root slot. Note: the same bytes also remain at `preset/README.md`. |

## `examples/`

| Path | Bytes | Purpose |
|---|---|---|
| `examples/ML_BRIEF.example.md` **[R]** | 15,343 | A **fully filled-in** six-item `ML_BRIEF.md` — every field answered with concrete numbers, plus a column 7 carrying **7 honest open items** so a reader can see what partial success looks like. |

## `scripts/` — repository tooling (not installed)

| Path | Bytes | Purpose |
|---|---|---|
| `scripts/install.ps1` **[R]** | 4,920 | Copies `preset/` into `$env:USERPROFILE\.dsh\.agent-presets\ml-planner`. |
| `scripts/install.sh` **[R]** | 4,100 | The same install, for bash environments. |
| `scripts/verify.ps1` **[R]** | 12,085 | Runs all three validators against an installed preset or a checkout, prints **real exit codes**, auto-detects a usable Python (skipping the Microsoft Store stub) and forces UTF-8 for the child interpreter. |
| `scripts/push-to-github.ps1` **[R]** | 14,200 | Creates the remote repository and pushes; reads `$env:GH_TOKEN` and prints instructions when no token is present. |

## `preset/` — the installable preset (36 files, 539,315 B)

### Composition and metadata

| Path | Bytes | Purpose |
|---|---|---|
| `preset/agent.cordis.yml` **[P]** | 14,214 | The composition file: declares the DSH rows that make up the planning mode and the routing plugin (`tool-skill`, `tool-goal`, `plan-subagents-tool`, `tool-ask-user`). |
| `preset/preset.yml` **[P]** | 614 | The preset's display name and description shown in the DSH preset selector. |
| `preset/README.md` **[P]** | 5,055 | The preset's own README — install steps, and the 5 host-compatibility patches applied for DSH 0.1.5-rc.2. |

### Router plugin

| Path | Bytes | Purpose |
|---|---|---|
| `preset/router-planner-bootstrap.mjs` **[P]** | 15,428 | The routing plugin: narrows the first-turn tool face by behaviour band, injects the band's planner guidance via the `agent/pre-step` waterfall, restores the full catalog after the first persistent `tool/call`, and registers the three `dev_*` tools. |
| `preset/router-planner-core.mjs` **[P]** | 22,133 | The routing core: task classification into behaviour bands, band-specific guidance text, and session-log reading that works under **both** the `seq`/`eventAt` and legacy `events` Session shapes. |

### `preset/lib/`

| Path | Bytes | Purpose |
|---|---|---|
| `preset/lib/ml-keywords.json` **[P]** | 10,349 | The ML trigger-word source of truth: **118** strong terms plus **19** ambiguous entries that never trigger alone (`guard.requireTerms = 1`). |
| `preset/lib/plan-subagents.js` **[P]** | 6,066 | Registers `run_plan_subagent` — dispatches a reviewer or criticizer subagent with a **read-only** tool deny filter, so a reviewer cannot edit what it reviews. |

### `preset/scripts/`

| Path | Bytes | Purpose |
|---|---|---|
| `preset/scripts/selftest.mjs` **[P]** | 15,314 | The **45-check** self-test: verifies classification, guidance delivery, both Session API shapes, per-band tool-face narrowing, catalog promotion, the `dev_*` tools and `run_plan_subagent` — **without starting the DSH host**. |
| `preset/scripts/validate_preset.py` **[P]** | 3,602 | Structural validation: the five planning skills carry matching `name:` and a `description:`; the three shared references exist; `dsh_plans_state.py --help` runs; `agent.cordis.yml` parses and names the four expected rows. Stdlib only; the YAML half **SKIPs with a message** if `PyYAML` is absent. |
| `preset/scripts/verify_integrity.py` **[P]** | 12,856 | Three-level integrity verification against the manifest below: **manifest self-consistency**, **L2** copy fidelity of the 11 pure copies, **L2'** intentional-edit presence, **L3** generated files, and **L1** the upstream baseline (SKIP when absent — *a skip is never counted as a pass*). |
| `preset/scripts/dsh_plans_state.py` **[P]** | 12,410 | Reads and writes the `dsh-plans/.state/` run ledger — run records, `decisions.jsonl`, `subagents.jsonl`, `refs.jsonl`. State on disk, not in the context. |
| `preset/scripts/fixtures/ml-band-cases.json` **[P]** | 2,728 | The band-classification fixture: **10 positives / 7 negatives**, with a measured result of 100 % / 100 % and a 0.0 % false-trigger rate (dated 2026-09-22); includes the four traps `shape` / `reshape` / `modeling` / `classify`. |

### `preset/skills/` — the 7 skills

| Path | Bytes | Purpose |
|---|---|---|
| `preset/skills/ml-modeling-plan/SKILL.md` **[P]** | 6,730 | **The ML entry point.** A router, not an encyclopedia: it states the hard rule (*produce `ML_BRIEF.md` answering all six items before writing training code*), the six non-negotiable constraints, and the routing table to the 14 references. |
| `preset/skills/create-a-small-plan/SKILL.md` **[P]** | 1,824 | Plan a small, scoped repository change — 1–3 planning questions, one criticizer refinement pass. |
| `preset/skills/create-a-plan/SKILL.md` **[P]** | 2,153 | Plan a broad or risky change — 5–10 planning questions, web research, reviewer/criticizer settings, bounded refinement. |
| `preset/skills/create-a-big-plan/SKILL.md` **[P]** | 2,433 | Plan an open-ended, high-risk effort — 10+ planning questions, reviewer **and** criticizer rounds, refinement until convergence. |
| `preset/skills/diagnose-before-plan/SKILL.md` **[P]** | 3,067 | Root-cause a failure — bug, CI break, regression, incident — **before** deciding whether to plan; preserves language, reviewer and executor settings in `dsh-plans/.state/config.json`. |
| `preset/skills/reference-before-plan/SKILL.md` **[P]** | 3,313 | The research-before-planning pipeline: read-only recon first, then **≥3 actually downloaded** credible references, per-reference structured analysis, **≥3 adoption questions each**, and **block rather than pad**. |
| `preset/skills/context-handoff/SKILL.md` **[P]** | 5,887 | The anti-context-rot skill: the **70 % / 80 %** thresholds, the **L0→L3** layered ledger with the one-way citation rule, the **ten-section** handoff template, and the **six-step** resume protocol with its mandatory restatement step. |

### `preset/skills/ml-modeling-plan/references/` — the 14 ML references

| Path | Bytes | Purpose |
|---|---|---|
| `ml-discipline-rules.md` | **193,510** | **The rule catalogue: 94 rules (85 `MUST` + 9 `SHOULD`) organised by pipeline stage P0–P10**, each with category, strength, mechanism, engineering landing, machine-checkable criterion, consequence, a counter-example **with a corpus key**, and related rules. 94/94 carry at least one key. |
| `ml-pipeline-and-invocation.md` | 59,206 | The S0→S10 stage table with gates, the invocation map, the SKILL→reference load table, the stage→rule-section mapping, the six-item contract binding, the ml-vs-fem difference table, and script usage. |
| `ml-model-failure-modes.md` | 17,408 | Failure modes for **8 model families** (GBDT · RF/trees · LSTM/GRU/TCN · Transformer/attention · SVM/SVR/KNN · clustering & dimensionality reduction · time series/filters · augmentation & resampling), plus a cross-cutting rule. |
| `preset-integrity-manifest.md` | 15,119 | The integrity manifest — **17 rows** with sizes and SHA-256 hashes (124,693 B total) plus the fingerprint `e17fc190…`. Generated; never hand-edited. |
| `ml-evaluation-and-leakage.md` | 12,945 | Metrics chosen from the cost structure, thresholds and calibration, splits, **the count trap**, intervals and seeds, simulation/physics-specific leakage patterns, and the corpus's field evidence. |
| `ml-spatial-and-field-inputs.md` | 10,962 | Images, rasters and direction/orientation fields: doubled-angle encoding, **rasterisation loss must be measured**, masks as semantics, and circular statistics for direction fields. |
| `ml-overfit-underfit.md` | 10,396 | **Diagnose before you regularise** — per-family sections (linear, tree ensembles, neural nets, KNN, time series), the leakage failure that impersonates overfitting, and the six levers ranked by cost. |
| `ml-interpretability.md` | 9,281 | Method families **and how they fail**, faithfulness and stability evidence, the correlated-features warning, and explicit wording rules for correlation versus causation. |
| `ml-algorithm-families.md` | 7,998 | Neural networks with an outer optimisation loop — 4 families, cross-family practical rules, and scaling a search from a laptop tier to a cloud tier. |
| `ml-literature-gaps.md` | 7,582 | **What the evidence does not support** — 12 documented literature gaps, including two honest negatives: no paper reported the heuristic losing to a baseline, and one frequently-cited paper does not appear to exist. |
| `ml-keywords.md` | 4,642 | The human-readable mirror of the trigger word list, with strong terms, ambiguous entries, known traps, and measured discriminating power. |
| `ml-feature-engineering.md` | 4,609 | **Fitting order — the rule that prevents the most common leak** — plus encoding, scaling, missing data, feature selection, and leakage-specific feature patterns. |
| `ml-time-series.md` | 4,609 | Time-ordered data done without leaking: splitting and validation, where the leakage actually happens, stationarity and differencing. |
| `ml-algorithm-selection.md` | 4,357 | Choosing a model **before** tuning one — start from the data, a reference scale, a practical selection checklist, and honest comparison of candidates. |

### `preset/skills/references/` — the 3 shared normative references

| Path | Bytes | Purpose |
|---|---|---|
| `dsh-planning-workflow.md` | 15,508 | The normative planning workflow: plan artifact versions, the reviewer/criticizer rounds, the explicit handoff, and goal execution. |
| `state-and-config.md` | 7,783 | The normative state and configuration rules — `dsh-plans/.state/` layout, the `language` setting, and per-role model selection. |
| `plan-artifact-template.md` | 2,470 | The `PLAN_vN.md` skeleton — goals, non-goals, risks, constraints, verification plan, acceptance criteria, Revision Ledger, Verifier Checklist. |

---

## Notes on this index

**Counts.** `preset/` holds **36 files / 539,315 B**. The repository holds **49 files** excluding `.git/`
(**50** including this file). The preset contained 40 files in the author's environment; **4 were deliberately
excluded** from this repository — the three unrelated GUI / ChatGPT-sidebar skills, and the FEM-only
`scripts/vtu_to_tensor.py`. See `README.md` §4.7 ("What this repository does not include").

**One known duplication.** `docs/PRESET-README.original.md` and `preset/README.md` currently hold **the same 5,055
bytes**. The original intent was to move the preset's README to `docs/` when the new repository README took the
root slot; the copy inside `preset/` was kept because the preset is installed as a self-contained directory and its
own README describes the host-compatibility patches. If you prefer a single copy, delete `preset/README.md` — note
that `verify_integrity.py` lists `README.md` under `intentional-edit`, so it is checked for **presence**, not for
hash equality, and removing it would make that L2' line report `MISSING`.

**Byte counts** are measured on this checkout and will drift as files change. Where a count is load-bearing for a
claim in `README.md`, the claim states the number it was measured at.
