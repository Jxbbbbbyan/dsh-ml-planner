# ARCHITECTURE — the S0→S10 pipeline, its gates, and who calls whom

> **中文摘要**：本文把 `dsh-ml-planner` 的执行管线、阶段门禁、调用关系与契约绑定写成一张可核对的图。
> 全部内容提炼自预设内的 **2 份规范文件**：`preset/skills/ml-modeling-plan/references/ml-pipeline-and-invocation.md`
> （59,206 B，管线与调用关系）与 `preset/skills/ml-modeling-plan/references/ml-discipline-rules.md`
> （193,510 B，**94 条规则**正文）。凡本文与那两份文件冲突，**以那两份文件为准**。

---

## 1. Scope and sources of truth

| Question | Authoritative file | Size |
|---|---|---|
| What happens at each stage, what gates it, what must land on disk | `preset/skills/ml-modeling-plan/references/ml-pipeline-and-invocation.md` | 59,206 B |
| The 94 rules themselves — category, strength, mechanism, engineering landing, machine-checkable criterion, consequence, counter-example with key | `preset/skills/ml-modeling-plan/references/ml-discipline-rules.md` | 193,510 B |
| The six-item contract template the agent must fill before coding | `preset/skills/ml-modeling-plan/SKILL.md` §1 | 6,730 B |
| Ledger layering, handoff template, resume protocol | `preset/skills/context-handoff/SKILL.md` | 5,887 B |

Two codes are used throughout and they are **not** the same thing:

- **S0–S10** = *when you do it* (an execution stage).
- **P0–P10** = *what rule judges it* (a rule section in `ml-discipline-rules.md`).

They map one-to-one. The pipeline file deliberately cites rules **only down to the section** (`P2 段`), never to an
individual number like `P2-03`, because the two files were written in parallel and pinning numbers would silently
break cross-references when either side reorders. **When you need an exact rule number, read
`ml-discipline-rules.md` directly.**

---

## 2. The pipeline: S0 → S10

Eleven stages. Each row gives input, action, the artifact that must land on disk, and the gate. **A stage's output
artifact is the next stage's input** — there is no side channel.

| Stage | Input | What you do | Output that must land on disk | Gate (do not advance unless) |
|---|---|---|---|---|
| **S0 Scope** | the raw user request; mode resolution | Fix task type, prediction target, granularity, **prediction time point**; fix the applicability envelope and the out-of-domain declaration; write non-goals | `ML_BRIEF.md` item 1 + column 7 (mode resolution); `PLAN_vN.md` Goals / Non-Goals / Risks | Item 1 contains no `TBD`; an explicit **out-of-domain invalidity** statement exists; scope unresolved ⇒ do not enter S1 |
| **S1 Data & labels** | data path; label provenance; *(fem mode:)* `.vtu` + conversion metadata `.json` | Count samples/features/types; count missingness and imbalance; **trace where the label really comes from and how it was derived**; *(fem:)* record `raster_peak_retention`, mask coverage, class arrays | `ML_BRIEF.md` item 2; `evidence/S1-data-inventory.json`; *(fem:)* `evidence/S1-tensor-meta.json` | Label provenance is written down **and none of its derived features entered the inputs**; *(fem:)* peak-retention and mask coverage recorded **per sample** — missing either ⇒ do not enter S2 |
| **S2 Splits** | sample list; group keys (specimen / case / patient / time) | Choose the splitter (time / group / stratified) and state *whom the test set must simulate*; define the three-zone partition; define the OOF rule; **define where "preprocessing later than splitting" lands** | `ML_BRIEF.md` items 2 and 5; `PLAN_vN.md` Constraints; `evidence/S2-split-manifest.json` (group key and fold id per sample) | Split unit = specimen/case (**not** a cell, **not** a time point); three-zone partition defined; *(fem:)* group by mesh family — random per-cell splitting is forbidden |
| **S3 Features & preprocessing** | the S2 split manifest | List the scale-sensitive steps explicitly; put the preprocessor inside a `Pipeline`; impute with masks not zeros; *(fem:)* doubled-angle direction encoding, nearest-neighbour class arrays | `ML_BRIEF.md` item 2 (engineering landing); `evidence/S3-preprocess-pipeline.json` (serialisation path + number of fitted samples) | The assertion `preprocessor.n_samples_seen_ == len(X_train)` is reproducible; *(fem:)* direction is encoded as a **pair** of channels and declared `axial` / `polar` |
| **S4 Baseline & selection** | S3 artifacts; the business's current rule | **Run the trivial baseline first** and report it side by side; align every comparison item-wise (depth / imputation / budget / iterations); ablate fusion and dimensionality reduction | `ML_BRIEF.md` item 4; `evidence/S4-baseline-vs-model.json` | The trivial baseline's number **is on disk** (a comparison merely promised in prose is not a baseline); the frozen production rule is kept as a **baseline to beat**, not deleted |
| **S5 Training & tuning** | the S4 model family; the S2 validation folds | Tune only on train/validation; roll back to best state on early stop; report the last-N-round change | `evidence/S5-runs.jsonl` (seed / command / metric per run); `PLAN_vN.md` Verification Plan | The test set is **untouched** (touching it voids the run); convergence is judged by "last-N-round change < threshold", not by wording; `argmax` pinned to the grid edge must be extended or declared unidentifiable |
| **S6 Evaluation & calibration** | the S5 best state; the test set, read once | Metrics + dispersion interval; per-class recall and majority-class baseline; calibration (coverage **and** width); *(fem:)* count MAE/RMSE and thresholds | `evidence/S6-metrics.json` + `evidence/S6-figures/<name>.png`; `PLAN_vN.md` Acceptance Criteria | The metric can see the failure mode you care about (degeneracy assertion that positive predictions > 0; **AUC must not sit below 0.5 without an alarm**); what is reported is an **interval / multiple runs**, not a single best point |
| **S7 Interpretability** | the S6 model and data | Compute importance **and declare `importance_type`**; attach stability and faithfulness evidence; attention heatmaps annotated with the uniform baseline `1/L`; *(fem:)* circular statistics for direction fields | `evidence/S7-importance.json`; `evidence/S7-figures/*.png` | **Without stability/faithfulness evidence you may not report importance or SHAP**; importance must not be worded as causation |
| **S8 Serving contract** | the S6 metrics + the S3 preprocessing pipeline | Reuse the training-time preprocessor parameters; declare the applicability envelope; define the calibration-failure alarm (narrow interval + large error) | the operational wording of `ML_BRIEF.md` item 4; `evidence/S8-serving-contract.md` | The serving path **re-fits nothing**; the applicability envelope is declared |
| **S9 Delivery & evidence** | every S0–S8 artifact | Point every sentence/figure-caption assertion back at your own output; check caption ↔ code-title consistency; put seeds and library versions into the artifact | the full `PLAN_vN.md` + Revision Ledger; `evidence/S9-provenance.json` (four seeds + library versions) | **Every prose assertion can be pointed at its evidence**; anything claiming "I changed X" is checked first; the model in the figure = the model in the report |
| **S10 Review & rollback** | the S9 deliverable; the Verifier Checklist | Tick every box of the Verifier Checklist; if it fails, roll back to the last gate-passing artifact; update `ML_BRIEF.md` column 7 | the ticked Verifier Checklist (`PLAN_vN.md`); `dsh-plans/.state/runs/<run-id>/{run.json,decisions.jsonl,subagents.jsonl}` | **All boxes ticked** before `update_goal complete`; any box unticked ⇒ must not mark complete, and must leave a trace in the "unmeasured / conflicting" column |

### 2.1 Artifact naming

Already-existing artifacts are `ML_BRIEF.md`, `PLAN_vN.md`, `DECISIONS.md` and the run ledger
`dsh-plans/.state/runs/<run-id>/{run.json,decisions.jsonl,subagents.jsonl,refs.jsonl}`.

The `dsh-plans/<slug>/evidence/<stage-code>-<name>.{md,json,png}` convention in the table above is **proposed by the
pipeline file itself, not a pre-existing artifact** — it is stated there as a design decision to be reviewed, and you
should read it the same way. The Verifier Checklist's `evidence` field points at it.

The fem-mode extra segment (`.sif → ElmerSolver → .vtu → vtu_to_tensor.py → .npz + .json`) is **out of scope for this
repository**: `fem-ml-planner` and `vtu_to_tensor.py` are not shipped here. See `README.md` §4.7.

---

## 3. Invocation relations — who calls whom

### 3.1 Mode resolution

A keyword trigger decides whether the ML layer is active at all. The trigger is `preset/lib/ml-keywords.json`:
**118 terms** plus **19 ambiguous entries** that never trigger alone, with `guard.requireTerms = 1`.
The human-readable mirror is `preset/skills/ml-modeling-plan/references/ml-keywords.md`; the mirror is checked by a
term-set equality assertion rather than a hash (stronger for that file's purpose).

Measured discriminating power, recorded in `preset/scripts/fixtures/ml-band-cases.json` and dated 2026-09-22:

| Metric | Value |
|---|---|
| positives passing | **10 / 10 = 100 %** |
| negatives passing | **7 / 7 = 100 %** |
| false-trigger rate | **0.0 %** |
| recall | **100 %** |
| trap checks (`shape` / `reshape` / `modeling` / `classify`) | all non-matching |

> The fixture's own `_comment` still says "the 258-article corpus". **That number is stale** — the corpus on disk is
> **266 postings / 229 distinct articles** (see `README.md` §4.10). The fixture contains **10 positives / 7 negatives**.

### 3.2 The main chain

```
user message
   │
   ├─ router-planner-bootstrap.mjs   ← classifies the message into a behaviour band
   │     (first-turn tool face is narrowed by band; the full catalog is restored
   │      after the first persistent tool/call)
   │
   ├─ skill: ml-modeling-plan        ← the entry point; a ROUTER, not an encyclopedia
   │     │
   │     ├─ HARD RULE: write dsh-plans/<slug>/ML_BRIEF.md answering all six items
   │     │              before any training code exists
   │     │
   │     └─ routes to → preset/skills/ml-modeling-plan/references/*.md   (14 files)
   │
   ├─ dsh-plans planning workflow    ← PLAN_vN.md / DECISIONS.md / run ledger
   │     ├─ create-a-small-plan / create-a-plan / create-a-big-plan
   │     ├─ diagnose-before-plan      (failures, before planning)
   │     ├─ reference-before-plan     (≥3 downloaded credible references, before planning)
   │     └─ run_plan_subagent         ← reviewer / criticizer rounds, READ-ONLY by construction
   │
   ├─ context-handoff                ← externalise at 70 % of the window, before the 80 % auto-compaction
   │
   └─ ... only after explicit handoff approval: DSH goal execution
          + Verifier Checklist (mechanically generated from the MUST-level rules)
```

### 3.3 `skills/ml-modeling-plan/SKILL.md` → references load table

The entry skill loads **only what the task needs**. 14 reference files:

| Situation | Load |
|---|---|
| Pipeline, gates, invocation, script usage, ml-vs-fem difference table | `ml-pipeline-and-invocation.md` |
| **The rule catalogue itself: what to do / not do at a stage, with category, strength and corpus counter-examples** | `ml-discipline-rules.md` |
| Metrics, thresholds, calibration, class imbalance, split discipline | `ml-evaluation-and-leakage.md` |
| Features, encoding, scaling, missing data | `ml-feature-engineering.md` |
| Train good / validation bad (or both bad) | `ml-overfit-underfit.md` |
| Any explanation, importance, or causal wording | `ml-interpretability.md` |
| Choosing a model / comparing families | `ml-algorithm-selection.md` |
| A family is already named (GBDT / RF / LSTM / Transformer / SVM / KNN / clustering / time series / augmentation) and you want **that** family's failure modes | `ml-model-failure-modes.md` |
| Time-ordered data | `ml-time-series.md` |
| Neural architecture with an outer search loop | `ml-algorithm-families.md` |
| Image fields, rasters, orientation / direction inputs | `ml-spatial-and-field-inputs.md` |
| **What the literature does *not* support** | `ml-literature-gaps.md` |
| Checking this preset's own integrity | `preset-integrity-manifest.md` |
| Changing the keyword trigger | `ml-keywords.md` |

> **Landing note.** The pipeline file records that `SKILL.md`'s own §3 routing table does **not** yet list
> `ml-pipeline-and-invocation.md` and `ml-discipline-rules.md`; until that row is added they can only be reached by
> explicit path. Treat this as a known, documented gap rather than discovering it by surprise.

### 3.4 Stage → rule section

| Execution stage | Rule section to read | Dominant category family | Typical MUST gate topic |
|---|---|---|---|
| S0 | **P0** | `SCOPE` | applicability envelope + out-of-domain invalidity; dimensional and scale-sensitivity declaration |
| S1 | **P1** | `SCOPE` / `ENG` | label is the grid (the evaluation domain must not be the grid); label-source field must not enter inputs; mask not zero-fill |
| S2 | **P2** | `LEAK` | preprocessing after splitting; hyperparameters chosen on train/val only; OOF; `bfill` forbidden; splitter chosen by "whom must the test set simulate" |
| S3 | **P3** | `ENG` | preprocessor in a serialised `Pipeline`; imputation statistics from the training set only; scale-sensitive steps listed |
| S4 | **P4** | `BASE` | trivial baseline first and reported side by side; comparisons aligned item-wise; baseline on disk; fusion/reduction ablation |
| S5 | **P5** | `DIAG` | `argmax` on the grid edge; report the CV-vs-test gap; early stop rolls back best state; convergence criterion |
| S6 | **P6** | `METRIC` | metric can see the failure mode; imbalance wording; calibration coverage **+** width; not RMSE alone; significance |
| S7 | **P7** | `DIAG` | declare `importance_type`; stability/faithfulness; attention heatmap `1/L` baseline |
| S8 | **P8** (+ reuse **P6** calibration wording) | `SCOPE` | reuse frozen preprocessor parameters; applicability envelope; calibration-failure alarm |
| S9 | **P10** (+ **P9** recording wording) | `EVIDENCE` / `REPRO` | every assertion points at its own output; figure model = reported model; readable colour scale; caption consistency |
| S10 | **P9** + **P10** | `REPRO` / `EVIDENCE` | four seeds; library versions in the artifact; a single point is not a result; changed ground truth propagated everywhere |

---

## 4. The six-item contract, and which rules bind to each item

`ML_BRIEF.md` lives at `dsh-plans/<slug>/ML_BRIEF.md`. It is a **contract, not notes**: every item must be answered
concretely and **`TBD` is not an answer**.

| # | Item | What must be answered | Rule sections bound | Who reads it | Gate consequence |
|---|---|---|---|---|---|
| **1** | Task type and target variable | classification / regression / ranking / generative / time-series? What is predicted, at what granularity, **at which point in time** | **P0** | S0 gate, Verifier Checklist | unanswered ⇒ cannot enter S1 |
| **2** | Data structure and split | samples / features / types; missingness and imbalance; how train/val/test are formed; whether time or groups are respected | **P1** + **P2** | S1/S2/S3 gates | a split that ignores time or groups ⇒ judged leaked immediately |
| **3** | Which data selects the model, and is the test set touched once | where tuning happens; whether samples outnumber features adequately; label reliability | **P2** + **P5** | S5 gate | test set used for selection ⇒ every number after that is best-of-N |
| **4** | Metric and baseline | which metric, why, what a mistake costs; what the trivial baseline is and what it scores | **P4** + **P6** | S4/S6 gates, S8 wording | no baseline number on disk ⇒ improvement is uninterpretable |
| **5** | Leakage and distribution shift | leakage / duplicate samples / shift checked? how far apart are train and validation | **P2** | S2 gate, S6 review | large gap and you tune the model first ⇒ **stop, chase leakage** |
| **6** | Interpretability requirement and causal wording | global or per-sample? which conclusions will be phrased causally? what evidence licenses that wording | **P7** | S7 gate | no stability/faithfulness evidence ⇒ cannot report importance |
| **7** | **Unmeasured / conflicting (mandatory column)** | for every unmet MUST: rule section, current stage, why it was not measured, the evidence on both sides of a conflict, and the plan to resolve it | **P9** + **P10** | S10 gate, Verifier Checklist | **"unmeasured" ≠ "false"**; it must leave a trace. With unmeasured items you **may not** assert the conclusion and **may not** `update_goal complete` |

> The seventh column exists because `SKILL.md` §2 states the hard constraint *"Not measured is not false. Record
> unmeasurable items as unmeasured with the reason."* It is **the only legitimate exit** for "did not measure" and
> "could not measure" — silence is not an option.

### 4.1 The Verifier Checklist is generated, not invented

The `PLAN_vN.md` Verifier Checklist is **mechanically generated from the MUST-level rules**. Generation rule:
**every single `MUST` rule in `ml-discipline-rules.md` must correspond to at least one checkbox in its own stage**
(`SHOULD`-level rules go only into column 7). With **85 MUST rules and 9 SHOULD rules**, the checklist's size is
therefore a function of the rule set, not of the author's mood.

Checklist groups, with pass-criteria provenance:

| Group | What is checked | Source section |
|---|---|---|
| S0–S1 | scope/dimensional declaration exists; label provenance chain written and absent from inputs; *(fem:)* peak retention + mask coverage per sample | P0 / P1 |
| S2–S3 | split unit = specimen/case; preprocessor fitted-sample-count assertion; direction encoded as a pair with `axial`/`polar` declared | P2 / P3 |
| S4–S5 | trivial baseline number on disk; comparisons aligned; test set untouched; early-stop best state rolled back | P4 / P5 |
| S6 | degeneracy assertions (positive predictions > 0 / AUC not below 0.5 without an alarm); intervals not single points; *(fem:)* count MAE/RMSE + thresholds | P6 / P9 |
| S7 | `importance_type` declared; stability and faithfulness evidence present; heatmap has the `1/L` baseline | P7 |
| S8 | serving reuses training-time preprocessor parameters; applicability envelope declared; calibration-failure alarm threshold exists | P8 |
| S9 | every prose/caption assertion points at evidence; figure model = reported model; colour scale and axes readable | P10 |
| S10 | four seeds + library versions in the artifact; changed ground truth propagated; column 7 has no unexplained MUST gap | P9 / P10 |

---

## 5. When a MUST fails

**Contract precedes code; code is downstream of the contract.** That is a hard ordering constraint, not a style
preference:

```
S0 write ML_BRIEF.md items 1-6  →  S1-S3 write data/split/preprocessing decisions into the contract
                                →  S4-S8 training and evaluation (code appears only here)
                     ↘  column 7 "unmeasured / conflicting"  ← any MUST failure leaves its trace here
```

When a MUST fails, execute these six steps **in order, skipping none**:

| Step | Action | Where it lands |
|---|---|---|
| 1 | **Stop at the current stage** | do not advance to the next S stage; do not write the next stage's artifact |
| 2 | Record the failure fact | `ML_BRIEF.md` column 7: rule section, current stage, why unmeasured, evidence on both sides of the conflict |
| 3 | Distinguish "unmeasured" from "does not hold" | record unmeasured as unmeasured; you **may not** write "the conclusion holds", and you **may not** write "the conclusion is false" |
| 4 | Decide the disposition | three routes: re-measure (go back to that stage), narrow the claim (confine the conclusion to what was measured), or roll back to the last gate-passing artifact |
| 5 | Synchronise | append one line to `PLAN_vN.md`'s Revision Ledger; append one line to `dsh-plans/.state/runs/<run-id>/decisions.jsonl` |
| 6 | Only now continue | after steps 2–5 are on disk, you may re-enter that stage or advance |

- A failed **`SHOULD`** rule does not block, but **must be explicitly declared** in the artifact. (That *is* the
  definition of `SHOULD`: "a violation must be explicitly declared".)
- **Touching the test set is irreversible.** It cannot be repaired by "splitting again" — you must restart that run's
  S5–S6.
- **Precondition for `update_goal complete`**: every box of the Verifier Checklist passes. Any unticked box ⇒ no
  completion; record it in column 7 instead.

### 5.1 Rollback

The rollback target is **the previous gate-passing artifact** (`ML_BRIEF.md` / `PLAN_vN.md` / `evidence/*`), not
"delete the failed attempt". Failed evidence is **kept** — `event.log` is append-only, so you can always distinguish
"never tried" from "tried and it did not work". The state ledger `dsh-plans/.state/` is private
(`init` guarantees `.gitignore` contains `.state/`); rollback does not touch it, and state and artifacts need only be
consistent with themselves.

---

## 6. Scripts, and exactly what each one tells you

| Script | Language | What it checks | Runnable in a fresh clone? |
|---|---|---|---|
| `preset/scripts/selftest.mjs` | Node ESM | **45 checks** across 6 sections: behaviour-band classification, guidance text, session-log reading under both the new (`seq`/`eventAt`) and legacy (`events`) Session shapes, the narrowed first-turn tool face per band, promotion to the full catalog after the first `tool/call`, the three `dev_*` tools, and `run_plan_subagent`'s read-only deny filter | **Yes.** Measured 45/45 PASS, exit 0 |
| `preset/scripts/validate_preset.py` | Python, stdlib only | The five planning skills exist with matching `name:` and a `description:`; the three shared references exist; `dsh_plans_state.py --help` runs; `agent.cordis.yml` parses and names rows `tool-skill` / `tool-goal` / `plan-subagents-tool` / `tool-ask-user` | **Yes.** Measured `preset validation OK`, exit 0. The YAML half **SKIPs with a message** if `PyYAML` is absent (import is guarded) |
| `preset/scripts/verify_integrity.py` | Python, stdlib only | Three levels against `preset-integrity-manifest.md` (17 rows, fingerprint `e17fc190…`): **L1** the upstream `router-planner` baseline, **L2** the 11 pure copies inside this preset, **L3** generated files present | **Only L3/manifest self-consistency.** L1 and L2 both need the upstream `router-planner` preset, which a clone does not contain — see `README.md` §4.9 |
| `preset/scripts/dsh_plans_state.py` | Python, stdlib only | Reads and writes the `dsh-plans/.state/` run ledger (`init`, `--help`, run/decision/subagent/ref records) | Yes |

Measured toolchain on the machine these numbers were taken on: **Node v26.9.0**, **Python 3.13.13**,
**PowerShell 7.6.6**. No `package.json` exists anywhere in the preset — **zero runtime npm dependencies**.

---

## 7. What this document does not claim

- It does not re-derive the fem-mode principles (the `fem-extra` per-rule mechanisms); that material is in the
  pipeline file §6 and is **not part of this repository's scope**.
- It does not assert that `vtu_to_tensor.py` was re-run against a real `.vtu`. The pipeline file states plainly that
  it was **not**, and that its field list comes from source and existing documentation.
- It does not claim the numbers in the corpus-derived tables are yours. They are **warning magnitudes** measured on a
  specific corpus, not constants for your data.
- Where this document and the two source files disagree, **the source files win** — and you should record the
  conflict rather than silently picking one.
