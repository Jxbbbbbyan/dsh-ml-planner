# ML_BRIEF.md — worked example

> **What this file is.** `ML_BRIEF.md` is the contract an agent must write **before it writes one line of training
> code**. This is a **filled-in, end-to-end example** — every field has a concrete answer, no `TBD`, no
> placeholder-pile. Copy it, replace the numbers with yours, keep the shape.
>
> **Where it goes:** `dsh-plans/<slug>/ML_BRIEF.md`
>
> **Rule:** each of items 1–6 must be answered concretely; `TBD` is not an answer. **Column 7 is mandatory** — it is
> where "not measured" is recorded honestly instead of being silently dropped. *"Not measured is not false."*
>
> **Worked scenario (invented for illustration, but internally consistent and realistically sized):** a production
> line wants to know, **7 days ahead**, whether a pump will fail. Read the column-7 entries at the end first if you
> want to see what an honest brief looks like when it is *not* perfect.

---

## 1. Task type and target variable

| Field | Answer |
|---|---|
| Task type | Binary classification (with an explicit **ranking** use in production) |
| Prediction target | `failure_within_7d ∈ {0,1}` — the pump fails at any point in the 7 days following the prediction instant |
| Granularity | One row per (pump, day) |
| **Prediction time point** | **`t` = 02:00 local** on the day of the reading. All features must be computable from data with timestamp `< t`. The maintenance window opens at 06:00, so there is a 4-hour decision lead. |
| **Training envelope** (`interp_bounds`) | 14 pumps, 3 production lines, ambient 12–31 °C, load 40–95 % of rated, 2024-01-01 → 2025-06-30 |
| **Forbidden extrapolation axes** (`no_extrap_axes`) | (a) a **4th production line**; (b) ambient > 35 °C or < 5 °C; (c) any pump model not in the 14; (d) any horizon other than 7 days |
| **Out-of-domain declaration** | **Outside the envelope above, no metric in this brief is a statement about the model.** Any prediction chart drawn outside the envelope must draw the envelope boundary and be labelled "outside envelope — not trustworthy". |
| Non-goals | Predicting *which* component fails; estimating remaining useful life; replacing the 06:00 manual inspection |

**Why the envelope is in the contract and not in a footnote.** The model learns a *conditional relation on the
training distribution*, not a physical law. Change the line, the geometry or the ambient range and the error is not
"larger" — it is **unbounded**. So the envelope is the interpretation boundary for every AUC, recall and calibration
number that follows.

---

## 2. Data structure and split

### 2.1 Structure

| Field | Answer |
|---|---|
| Rows | **61,842** (pump × day), 2024-01-01 → 2025-06-30 |
| Raw features | **38** numeric, **6** categorical |
| Label prevalence | **1.71 %** positive (1,057 positives / 61,842) |
| Missingness | `vibration_rms` 4.2 % missing (sensor dropout); `oil_temp` 0.8 %; all others < 0.1 % |
| Imbalance | 1:57.5 — a degenerate all-negative model already scores **98.29 % accuracy** |
| Duplicate check | 92 exact duplicate rows found (repeat-day restarts) — **removed before splitting**, leaving 61,750 |

### 2.2 Split

| Field | Answer |
|---|---|
| Splitter | **Time-based**, grouped by pump |
| Whom must the test set simulate? | **Future pumps under the same lines** — a 7-day-ahead decision on pumps that were not in training |
| train | 2024-01-01 → 2025-01-31 (44 pumps-worth of rows, 9 pumps) |
| validation | 2025-02-01 → 2025-03-31 (5 pumps) |
| test | 2025-04-01 → 2025-06-30 (5 pumps, disjoint) — **read exactly once** |
| Group key | `pump_id` — no pump appears in two zones |
| Overlapping-window check | Feature windows are `t-30d … t-1d`; consecutive rows share 29 days of history. **Near-duplicate rows across a zone boundary were detected and dropped**: 118 rows removed where `pump_id` was stable and the 30-day window overlapped the boundary |
| **Where preprocessing happens** | **After** the split. Every scaling/encoding/imputation step lives inside a `sklearn.Pipeline` fitted on the training zone only. Order is fixed: **read → split → `fit`(train) → `transform`(val/test)**. |
| OOF rule | Any stacked/residual feature is built from **out-of-fold** predictions only. For the time-ordered case: forward-chaining OOF, never a future fold. |

---

## 3. Which data selects the model, and is the test set touched once

| Field | Answer |
|---|---|
| What selects the model | **Validation zone only** (2025-02-01 → 2025-03-31) |
| Hyperparameter tuning | 5-fold **time-series** CV *inside* the training zone, then confirm on validation. Test zone is not involved in any selection step. |
| Sample-to-feature adequacy | 61,750 rows × 44 features = **1,403 rows per feature**; positives = 1,057, i.e. **24 positives per feature** — adequate for tree ensembles, **marginal** for the 3-layer MLP, which is recorded as a risk in column 7 |
| Label reliability | Label = maintenance work-order completion. **Work orders are entered up to 36 h after the fact** ⇒ the last 7 days of any zone have **incomplete labels** and are **truncated from all three zones** (463 rows removed). |
| Label provenance chain | Work-order table → `failure_code ∈ {E04, E11}` → `failure_within_7d`. **None of the work-order columns (`cost`, `technician`, `repair_minutes`) are features** — they are consequences of the failure, not causes. |
| Test set touched how many times | **Once** (S6). If it is touched again, the run is void and S5–S6 restart. |

---

## 4. Metric and baseline

| Field | Answer |
|---|---|
| Primary metric | **PR-AUC** (average precision). At 1.71 % prevalence, ROC-AUC flatters a model that is useless in the top decile the maintenance team actually works from. |
| Secondary metric | **Recall @ top-5 % of days** — the team can service ~5 % of pump-days per week |
| What a mistake costs | A **false negative** = an unplanned line stop: ≈ 6 h downtime. A **false positive** = one wasted inspection: ≈ 25 min. Cost ratio ≈ **14:1**, which is why the threshold is tuned on the validation zone rather than left at 0.5 |
| **Trivial baseline** | **Always predict "no failure"**: accuracy 98.29 %, PR-AUC = 0.0171 (equal to prevalence), Recall@top-5 % = 0.0 %. **Secondary baseline: the current production rule** (vibration `rms > 4.5 mm/s`), which scores **PR-AUC 0.091**, Recall@top-5 % **0.19**. The production rule is kept as a baseline to beat — it is **not deleted** from the comparison. |
| Degeneracy assertions (machine-checked) | `assert y_pred_pos.sum() > 0`; `assert pr_auc >= 0.0171` (not below the trivial baseline); `assert len(set(y_pred)) > 1`; `assert roc_auc >= 0.5`. Non-zero exit on failure. |
| Calibration (because the threshold is a business decision) | Reliability curve with the perfect-calibration reference line; coverage at nominal q = 0.5 / 0.8 / 0.9; interval mean width; **and** `max |actual − nominal|`. Acceptance: `max |actual − nominal| ≤ 0.05`. **Coverage and width are reported together** — a narrow interval guarantees low coverage, a wide one achieves coverage with zero information, so either alone can be gamed. |
| Significance | Paired **Wilcoxon signed-rank** over 10 seeds (model vs production rule), reporting test name, statistic, p-value and win rate |

---

## 5. Leakage and distribution shift

| Check | Result |
|---|---|
| Preprocessing fitted on full data? | **No** — `Pipeline` inside the split; `assert scaler.n_samples_seen_ == len(X_train)` holds (44,102) |
| Target encoding / stacked features OOF? | **Yes** — forward-chaining OOF; `corr(oof, y) = 0.14` vs `corr(in_sample, y) = 0.61` |
| `bfill` anywhere? | **Forbidden** — forward-fill only (30-day causal limit). Backward fill would import the future. |
| Duplicate / near-duplicate samples crossing the split? | Removed (see §2.2) |
| Sampling or augmentation before splitting? | No augmentation is used |
| Label-derived features in inputs? | **No** — asserted by column allow-list; `repair_minutes`, `cost`, `failure_code` are excluded |
| **Train / validation gap** | PR-AUC train **0.71** vs validation **0.28** — a **large** gap. **Disposition: leakage and shift are investigated BEFORE any regularisation or tuning.** Root cause found: 2025-02 ambient dropped to 9–14 °C, outside the lower part of the training range, so `oil_temp` shifted. Recorded in column 7 as a **shift**, not treated as overfitting. |
| Distribution shift measured how | PSI on each feature, train vs validation; `oil_temp` PSI = **0.31** (flagged > 0.25), all others < 0.08 |

---

## 6. Interpretability requirement and causal wording

| Field | Answer |
|---|---|
| Global or per-sample? | **Global** for the maintenance-planning report; **per-sample (local)** for the shift-handover screen shown to a technician |
| Method | Global: permutation importance **with `importance_type` declared**, plus SHAP on a 2,000-row sample. Local: SHAP force plot for the flagged day. |
| `importance_type` declared as | `permutation` (sklearn), `n_repeats = 10`, scoring = PR-AUC, **computed on the validation zone** |
| Stability evidence | Importance ranking across **10 seeds**: Spearman ρ between seed rankings, **min ρ = 0.83**; top-5 feature set identical in 9/10 seeds |
| Faithfulness evidence | Retrain without the top-3 features: PR-AUC 0.28 → **0.19**, i.e. the ranking has measurable consequences |
| Correlated features warning | `vibration_rms` / `vibration_peak` / `vibration_kurtosis` are correlated at ρ > 0.8 — importance is **split** among them and must not be read as "rms matters, peak does not" |
| **Causal wording policy** | This is an **observational** dataset with no intervention. Therefore: **"associated with" / "predictive of" only.** The words **"causes", "leads to", "because of"** are forbidden in this report. Any use requires a controlled intervention study, which does not exist here. |
| What evidence would license causal wording | A randomised or designed intervention on the load setpoint, or an instrumental-variable / difference-in-differences design with a stated identification assumption. **Neither exists.** |

---

## 7. Unmeasured / conflicting — **mandatory column**

> Every unmet MUST is recorded here: rule section, current stage, why it was not measured, the evidence on both
> sides of any conflict, and the resolution plan. **"Unmeasured" is written as unmeasured — never as "holds", never
> as "false".** With an unexplained gap in this column, the conclusion may not be asserted and the goal may not be
> marked complete.

| # | Rule section / ID | Stage | Why not measured | Evidence on each side | Resolution plan | Status |
|---|---|---|---|---|---|---|
| 1 | **P6-03** calibration | S6 | Only **one** calibration curve was produced (the model's). The reference line is present, so the assertion passes structurally, but there is no second model curve to compare against. | Left: reliability curve exists and is plotted. Right: the pipeline file says that when only one curve exists the reason must be identified and recorded truthfully. | Add the production-rule curve as a second series in the next run | **Open** |
| 2 | **P5-01** grid boundary | S5 | `min_samples_leaf` optimum landed on **`8`**, the **lower** edge of the searched grid `[8, 16, 32, 64]`. | Left: 8 is the grid's edge, so the true optimum may lie below. Right: extending to 2 would make the model unusable at 1,057 positives. | Extend to `[2, 4, 8]` in a follow-up run and report whether PR-AUC moves; until then the claim is confined to "best within the searched range" | **Open — claim narrowed** |
| 3 | **P5-08** uncertainty magnitudes | S5 | The model is a LightGBM ensemble; it has **no** aleatoric/epistemic split out of the box. Quantile regression was not fitted. | Left: PR-AUC and a bootstrap interval exist. Right: the two uncertainty types are not separately distinguishable, which P5-08 requires for probabilistic models. | Fit `objective="quantile"` at q = 0.1 / 0.5 / 0.9 in a follow-up | **Open** |
| 4 | **P3-04** preprocessing benefit | S3 | The gain from the `oil_temp` imputation change (median → linear interpolation within pump) was **not** ablated. | Left: interpolation is defensible on physical grounds. Right: "defensible" is not a measurement, and predictive phrasing is forbidden. | Run the ablation in the next run | **Open** |
| 5 | **P1-xx** label incompleteness | S1 | The last 7 days of each zone were **truncated** (463 rows) rather than completed by waiting for late work orders. | Left: truncation is conservative and removes a known bias. Right: it also removes the most recent, most informative rows. | Backfill the work-order table after 36 h and re-run to confirm the metric is stable | **Open** |
| 6 | **P9-03** multi-seed interval | S9 | The headline number is **one seed** (seed 17), not a multi-seed interval. | Left: seed 17 was fixed before the run and is documented. Right: a single point is not a result, and best-of-N is not a result either. | Report a 10-seed interval; the significance test in §4 already uses 10 seeds, the headline does not | **Open — must fix before publication** |
| 7 | **Conflict** (env, drift) | S5/S6 | Ambient in validation dropped outside the training range (9–14 °C vs training 12–31 °C), so `oil_temp` shifted (PSI 0.31). | Left: the validation zone is temporally later and therefore the honest forward test. Right: it is also partly out of the declared training envelope, which per §1 makes the metric not fully a statement about the model. | Either (a) narrow the applicability envelope for the validation claim, or (b) re-split so validation sits inside the envelope and report the later zone separately as a shift study | **Open — affects the §1 envelope wording** |

**Net status: the contract is NOT fully satisfied.** Seven items are open. The result may be reported **only** with
the narrowings in rows 2, 6 and 7 applied — *"best within the searched grid, single seed, on a validation zone partly
outside the training ambient envelope"*. It may not be reported as a finished improvement, and the goal may not be
marked complete.

---

## How to reuse this template

1. Copy this file to `dsh-plans/<your-slug>/ML_BRIEF.md`.
2. Fill items **1 → 6** in order. Every table cell gets a concrete value. If you genuinely cannot answer, the answer
   is **not** `TBD` — it is an entry in column 7 with the reason.
3. **Replace every number with a number you measured on your own data.** The numbers here are illustrative. The
   pipeline reference is explicit that corpus values are warning magnitudes, not constants for your dataset.
4. Keep column 7. It is the only place where "did not measure" and "could not measure" are allowed to exist, and its
   presence is what makes the rest of the document trustworthy rather than merely confident.
5. When a MUST rule fails, do not delete the row — add one and stop at that stage.

> Reminder of the ordering constraint: **the contract precedes the code, and code is downstream of the contract.**
> If the code and the contract disagree, the contract wins and you go back to the contract. There is exactly one
> exception channel: items that cannot be measured go into column 7 — **still written in the contract**.
