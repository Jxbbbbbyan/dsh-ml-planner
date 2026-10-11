---
name: ml-modeling-plan
description: Plan machine-learning work before writing training code. Use when a task involves training, modeling, features, labels, overfitting, underfitting, hyperparameters, cross-validation, data leakage, class imbalance, loss functions, learning rate, batch size, or reporting model evaluation metrics, AUC, F1, R², AUC, SHAP, feature importance, or interpretability. This skill is the entry point; it routes to reference guides and requires a written ML_BRIEF.md before any training code.
---

# ml-modeling-plan — Machine-Learning Modeling Planning

This is the **entry point** for machine-learning work. It is deliberately a **router**: it decides *which*
reference to load and *what must be written down first*. Deep knowledge lives in `references/` and is loaded
only when needed.

**Hard rule before anything else:** produce `dsh-plans/<slug>/ML_BRIEF.md` answering all six items in
§1\. Do **not** write training code before that file exists. The six answers are the contract; code is
downstream of them.

---

## 1. The mandatory ML brief (six items — write the file)

Create `dsh-plans/<slug>/ML_BRIEF.md` with these six sections. Each must be answered concretely; "TBD" is
not an answer.

1. **Task type and target.** Classification / regression / ranking / generative / time-series? What exactly
   is predicted, at what granularity, and at what point in time?
2. **Data structure and split.** How many samples, how many features, which types, how much missingness and
   imbalance? How are train/validation/test formed, and does the split respect time or groups to avoid
   leakage?
3. **Which data selects the model, and is the test set touched once?** Where does hyperparameter tuning
   happen? Is the sample count adequate for the feature count? How reliable are the labels?
4. **Metric and baseline.** Which metric, why, and what does a mistake cost? What is the trivial baseline
   (majority class, previous value, the current production rule) and what does it score?
5. **Leakage and shift.** Checked for leakage, duplicate samples, and distribution shift? How far apart are
   train and validation scores?
6. **Interpretability requirement.** Global explanation, or per-sample? Will any conclusion be phrased
   causally? If so, what evidence would license that wording?

## 2. Non-negotiable constraints (violating any of these invalidates the result)

- **Baseline first.** Run the trivial baseline before any complex model. Never jump to a deep model.
- **Reproducibility.** Every claimed improvement needs a reproducible protocol: split, random seed, metric
  definition, and the exact command.
- **No single-point claims.** Report an interval or a distribution across runs. A best-of-N number is not a
  result.
- **Train/validation divergence means suspect leakage or overfitting first** — not "tune the model".
- **Never report feature importance or SHAP without stability and faithfulness evidence**, and never phrase
  importance as causation. See `references/ml-interpretability.md`.
- **Not measured is not "false".** Record unmeasurable items as unmeasured with the reason.

## 3. Routing table — load only what the task needs

| Situation | Load |
|---|---|
| **Per-model failure modes** — you named a family (GBDT, RF, LSTM, Transformer, SVM/KNN, clustering, time series, augmentation) and want the failure modes observed for **that** family | `references/ml-model-failure-modes.md` |
| Choosing a model / comparing families | `references/ml-algorithm-selection.md` |
| Train score good, validation bad (or both bad) | `references/ml-overfit-underfit.md` |
| Any explanation, importance, or causal claim | `references/ml-interpretability.md` |
| Metrics, thresholds, calibration, class imbalance | `references/ml-evaluation-and-leakage.md` |
| Features, encoding, scaling, missing data | `references/ml-feature-engineering.md` |
| Time-ordered data | `references/ml-time-series.md` |
| Neural architecture with an outer search loop | `references/ml-algorithm-families.md` |
| What the literature does **not** support | `references/ml-literature-gaps.md` |
| Image fields, rasters, orientation/direction inputs | `references/ml-spatial-and-field-inputs.md` |
| Checking this preset's own integrity | `references/preset-integrity-manifest.md` |
| Modifying the keyword trigger | `references/ml-keywords.md` |
| **Pipeline order, gates, invocation map, script usage, and the ml-vs-fem difference table** | `references/ml-pipeline-and-invocation.md` |
| **Stage-by-stage discipline rule catalogue (P0–P10): category, strength, how to verify, corpus keys** | `references/ml-discipline-rules.md` |

## 4. Decision tree — diagnose before you tune

Work down this list; stop at the first branch that matches.

1. **Is train performance already poor?** → underfitting. Do **not** regularise. Add capacity, better
   features, longer training, or fix the labels. See `references/ml-overfit-underfit.md`.
2. **Is train good and validation poor, and the gap large?** → overfitting or leakage. Check leakage
   first (it looks identical to overfitting but needs the opposite fix). Then regularise.
3. **Is validation good but the metric still unsatisfying?** → the metric or the decision threshold is the
   problem, not the model. See `references/ml-evaluation-and-leakage.md`.
4. **Are scores unstable across seeds?** → the evaluation is underpowered relative to the effect size.
   Increase folds/repeats before choosing a model.
5. **Do you need to explain the result?** → `references/ml-interpretability.md` before writing the
   conclusion.
6. **Only now** tune hyperparameters, and only on a split the test set is not part of.

## 5. Red flags in machine-learning work

- A single train/test split used for both selection and final reporting.
- Preprocessing (scaling, encoding, imputation, feature selection) fitted on the full dataset before
  splitting.
- Sampling or augmenting before splitting, so near-duplicates cross the split.
- Time-series data shuffled randomly.
- Class imbalance "fixed" by resampling the test set.
- A threshold chosen on the test set.
- A metric that cannot see the failure mode that matters (a count error hidden by an averaged precision).
- Feature importance quoted as fact when features are correlated.
- Improvements smaller than run-to-run variance.

---

**Scope.** This skill plans and constrains ML work. It does not contain dataset-specific recipes, and it
does not decide your domain question. When a claim here conflicts with a measurement on your data, the
measurement wins — record the conflict.
