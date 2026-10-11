# ml-evaluation-and-leakage — metrics, thresholds, calibration, and the count trap

Reference for `ml-modeling-plan`. Read when the metric is the problem — which is more often than the model
being the problem.

---

## 1. Choose the metric from the cost structure, not from habit

| Situation | Metric | Why not the default |
|---|---|---|
| Balanced classification | accuracy, or F1 | — |
| **Imbalanced** classification | precision/recall **at a stated threshold**, PR-AUC, cost-weighted error | accuracy is dominated by the majority class; ROC-AUC can look strong while positive-class precision is useless |
| Ranking / screening | PR-AUC, recall@k | a global AUC hides what happens at the operating point |
| **Count is part of the answer** | **count MAE / RMSE** *plus* the detection metric | averaged detection metrics absorb count errors — see §4 |
| Regression, homoscedastic | MAE / RMSE | — |
| Regression with wide target range | MAPE or log-space error **plus** a scale-free check | RMSE is dominated by large targets |
| Regression with outliers | median absolute error, quantile loss | squared loss is not robust |
| Probability output used for decisions | **calibration** (reliability curve, Brier, ECE) — not accuracy | a model can rank well and be badly calibrated |

**Always report the trivial baseline** (majority class, previous value, current production rule) with the
same metric. An improvement is only meaningful relative to it.

## 2. Thresholds and calibration

- A probability threshold is a **decision variable**, not a property of the model. Choose it on validation
  data using the cost structure, then freeze it before touching test data.
- **Report the threshold with every threshold-dependent number**, and include a threshold sweep. Metrics and
  even latency move with it.
- **Detection/classification confidence is known to be poorly calibrated** on modern neural networks, and
  post-hoc calibration methods are documented to **fall short under distribution shift**. So a count or a
  decision derived by thresholding an uncalibrated score is *systematically* biased, not merely noisy.
- Report a reliability curve; if the operating point is a tail (e.g. top 1 %), report the calibration
  *there*, not on average.

## 3. Splits

- **One split, one decision.** Hyperparameter selection on a validation split; the test split is touched
  once, at the end. If you tune on test, every number you report afterwards is a best-of-N statistic.
- **Group-wise splits** when samples are not independent (same mesh, patient, machine, session, or
  simulation family). Random splitting of grouped data leaks and inflates results.
- **Time-ordered splits** for temporal data: train on the past, validate on the future, never shuffle.
- **Duplicate and near-duplicate detection before splitting** — near-duplicates across splits are the most
  common silent leak.
- **Preprocess inside the fold**: scalers, encoders, imputers, feature selection, and target encoders must
  be fitted on the training fold only.

## 4. The count trap — averaged metrics hide the wrong number of outputs

If the task's answer includes **how many** objects/components exist, an averaged detection metric will
usually not see a count error.

**Measured evidence.** In an error decomposition on a standard detection benchmark, the **duplicate-object
error was 0.2 at IoU 0.5 and 0.0 at IoU 0.6 and 0.7**, while *localisation* error rose from 6.2 to 18.1 over
the same thresholds — i.e. the metric nets duplicates away into per-threshold matching. Meanwhile the
location-precision metric family exists precisely because the averaged precision "cannot distinguish between
very different precision-recall curves".

**Consequences.**
- A model that emits the wrong *number* of boxes but localises well can keep a high averaged score.
- Any count you emit from a dense detector is a **post-hoc function of the confidence threshold and the NMS
  IoU threshold** — so the count is a hyperparameter you must own, sweep, and report.
- Suppression-based decoding (NMS) costs latency **disproportionately on small models** — a measured example
  put end-to-end latency at 6.16 ms versus 1.77 ms forward-only, i.e. suppression ≈ 3.5× the forward pass —
  and imposes a **recall ceiling in crowded scenes**.

**Required reporting for count-varying outputs.**
1. the averaged detection metric, for comparability;
2. **count error (MAE and RMSE) against ground-truth counts**;
3. a localisation-sensitive alternative metric;
4. the **threshold and suppression settings**, plus a sweep.

## 5. Intervals, seeds, and honest claims

- Report a confidence interval or the spread across seeds/folds. A single run's number is an anecdote.
- **Model rankings are fragile**: a controlled study measured rank correlation of only ≈0.48 between two
  training runs of the same search and ≈0.54 across depth settings, with individual candidates moving up to
  18 positions out of 32. So a small ranking difference between architectures is not a finding.
- Before declaring a winner, check that the margin exceeds run-to-run variance; otherwise say the comparison
  is inconclusive.
- **Label error of a few percent is enough to flip rankings.** Simulation- or annotation-derived labels
  carry an error floor; report it with the ranking.

## 6. Leakage patterns specific to simulation- and physics-derived data

- **The label is the mesh.** A finite-element output value is a function of the discretisation, so changing
  the mesh changes the ground truth. Carry a discretisation-uncertainty estimate per sample rather than
  discarding it.
- **A low-error field can still be an invalid label**: one study found that errors below 0.5 % relative to a
  high-fidelity solution could still make a turbulence closure ill-conditioned. Gate labels on conservation
  /realisability, not only on error norm.
- **Do not resample categorical arrays.** An integer geometry/region identifier resampled onto a continuous
  grid becomes non-integer garbage; carry it by nearest-neighbour or as a mask.
- **Report the provenance of every labelled sample**: solver version, input file name, and resolution.
  Samples generated months apart with different settings are otherwise silently incomparable.
- **Class boundaries must be quoted verbatim** from the source that defines them. Where a boundary was
  defined by clustering with no sensitivity study, state that, and report accuracy as a function of a
  boundary shift.

## 7. Reporting template

```
Metric:               <name> (definition)
Operating threshold:  <value>  [swept over <range>]
Baseline:             <trivial baseline> = <score>
Model:                <score> ± <interval over N runs/folds>
Count error:          MAE <..>, RMSE <..>            # if the count matters
Calibration:          <reliability curve summary at the operating point>
Split:                <size>, <group/time-aware?>, <preprocessing fitted inside fold?>
Label error floor:    <estimate or "unmeasured">
Known limitations:    <what this metric cannot see>
```

## 8. Field evidence from a practitioner corpus (2026-05..09, 266 postings / 229 distinct articles)

Source: `wechat-corpus/` — per-article notes with `key = 3942513879_<msgid>_<itemidx>`, plus a
machine-extracted evidence table at `wechat-corpus/index/EVIDENCE.md`. This is a practitioner blog, **not a
benchmark**: treat the items below as *observed failure modes to check against*, not as rates to quote. They
are listed because **several independent reading passes found the same failures**, not because they were
measured in a study.

**8.1 Preprocessing fitted before the split was the most frequent single defect.** Whole-frame
`StandardScaler` then split (`3942513879_2247500038_1`); `fit_transform` on the full frame before splitting
(`3942513879_2247500991_1`). §4 states the rule; the corpus shows it is the *default* mistake, not a rare one.

**8.2 Test-set selection, and missing out-of-fold predictions.** `3942513879_2247501925_1` selects a
configuration by 5-fold CV and then reports a test AUC that is **+0.031 higher than any configuration's CV
mean** — impossible if selection and reporting share one protocol, and consistent with a silently dropped
`max_depth=None` grid row (`pivot_table` drops NaN keys). Stacked or residual-corrector designs that use
**in-sample** base-model outputs as training features recurred across three articles
(`…104_1`, `…118_1`, `…204_1`).

**8.3 A tuned model compared against one default is a winner's-curse comparison.**
`3942513879_2247501925_1` compares a single default baseline against the argmax of 324 configurations chosen
on the *same* `X_train`. That margin is not interpretable without a nested protocol.

**8.4 An optimum on the search-grid boundary means the grid is truncated.**
`3942513879_2247500642_1` (LML optimum sits at the upper `length_scale` edge, still monotonically increasing)
and `3942513879_2247501064_1` (best CV at `γ = 1.0`, the largest value searched). Both present the optimum as
a result. **Widen the grid, or declare the parameter unidentifiable within it.**

**8.5 Degenerate models reported as results.** Both arms below random AUC (0.152 / 0.421), confusion matrix
`[[499, 0], [1, 0]]`, accuracy 99.8 %, **positive-class recall 0** — and the article is unaware
(`3942513879_2247500069_1`). A "winning" encoding whose matrix has **TP = 0** (positive class ≈ 4.4 %),
unremarked (`3942513879_2247500875_1`).

**8.6 Accuracy-only reporting hides a majority-class floor.** Three classes where constantly predicting the
outer ring already scores ≈65.8 % (`3942513879_2247501051_1`); a five-class task reporting accuracy with no
mention of the ≈22.6 % majority-class baseline (`3942513879_2247501064_1`). **Always print the trivial
baseline beside the model.**

**8.7 An intervention intended to help can measurably hurt while the text still claims it helped.**
`3942513879_2247500302_1`: SMOTE and class weighting both *lower* average precision versus the untransformed
baseline (0.260 / 0.264 vs 0.363). `3942513879_2247502936_1`: stronger augmentation moves test accuracy
88.9 % → 88.3 % → 87.8 % and minority-class recall 43.8 % → 31.3 % → 18.8 %, monotonically down, while the
text claims it improves both. The mechanism is in that article's own title — input-space augmentation can
destroy the label's meaning.

**8.8 Verify that every quantitative claim in the prose exists in the run's own output.** Two recurring
forms: an improvement that exists only in a figure caption (`3942513879_2247501084_1` — loss pinned at ln2
and accuracy 0.49–0.55, while the text claims LSTM/GRU beat RNN), and metrics computed but never quoted
(`3942513879_2247500875_1`, `3942513879_2247501064_1`).

**8.9 Rule.** Because 9.5–9.8 are *text-versus-its-own-figure* failures rather than modelling failures, the
corpus supports one hard check: **every assertion in a figure caption must be pointable-to in that figure —
a number or a visible structure. If it is not, rewrite the caption.** Add this to the Verifier Checklist.

## 9. Split discipline when samples are spatially or temporally correlated

*(Evidence: `3942513879_2247501933_1` — same domain as mesh/raster labels.)*

- **Split by specimen, not by pixel or cell.** Neighbouring cells in a field are near-duplicates; splitting
  them at random inflates F1 because test cells resemble training cells. Group by physical object (specimen,
  part, simulation case) and split on the group.
- Prefer a **three-way** scheme: confirmed positive / confirmed negative / **unlabelled and excluded from
  training**. Unlabelled is not "negative".
- **Run a label-sensitivity study** — perturb the labelling threshold and the region boundaries, then report
  whether the conclusion survives. A conclusion that flips under a small boundary shift is not a result.
- **A label derived from a feature forbids that feature as input.** If the labels come from a peak-to-peak
  map, the input must not contain the peak-to-peak map; and the threshold rule that produced the labels is
  demoted to a **baseline you must beat**, not deleted.
- **Name it honestly.** When the target comes from a different physical quantity than the input, do not call
  it a ground-truth label — call it a **cross-quantity consistency target**. The naming keeps the claim
  bounded.

## 10. What this reference does not claim

- It gives no universal metric ranking, and deliberately: the right metric depends on the cost structure.
- The count-trap numbers are from a specific benchmark and are cited as a **mechanism**, not as a
  transferable magnitude for your task. Re-measure the error decomposition on your own data.
