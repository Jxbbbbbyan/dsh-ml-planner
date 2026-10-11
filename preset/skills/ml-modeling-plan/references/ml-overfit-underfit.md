# ml-overfit-underfit — underfitting and overfitting, handled per model family

Reference for `ml-modeling-plan`. Read this when train and validation behaviour diverge, or before
choosing regularisation.

**Evidence rule.** Every row carries an evidence tag. `MEASURED` = a number measured on real data in this
project's own investigation; `LIT` = a published result; `JUDGEMENT` = engineering practice that the
investigation could **not** source, recorded so you know it is not evidence-backed.

---

## 0. Diagnose before you regularise

| Observation | Verdict | First action |
|---|---|---|
| Train error high, validation error high, both flatten | **Underfit** (bias-limited) | Add capacity / features / training time. Regularising here makes it worse. |
| Train error low, validation error much higher, gap grows with capacity | **Overfit** (variance-limited) | Regularise. But rule out leakage first (§6). |
| Train and validation both excellent, test poor | **Split/leakage/shift problem**, not overfitting | Rebuild the split; check for duplicates across splits. |
| Scores swing widely across seeds | **Evaluation underpowered** | More folds/repeats before any model decision. |
| Metric plateaus below expectation with ample data | **Label noise or wrong metric** | Audit labels; revisit the metric. |

Learning curves are the instrument: plot train and validation error against training-set size **and**
against capacity. A gap that closes with more data is variance; a floor that never drops is bias.

---

## 1. Linear / regularised models (ridge, lasso, elastic net, GLM)

**Overfit signature.** Train ≪ validation; large coefficient magnitudes; coefficients unstable across
folds; many near-collinear features.

**Levers (name them concretely).**
- L2 (ridge) penalty `α`: shrinks all coefficients smoothly. Choose `α` by cross-validation **on the
  training folds only**.
- L1 (lasso) penalty: also performs selection by zeroing coefficients.
- Elastic-net mixing `l1_ratio` between L1 and L2.
- Interaction/degree reduction; drop near-duplicate features.
- Standardise features **inside** the CV loop, fitted on the training fold.

**Underfit signature.** Both errors high and flat; residuals show structure (curvature, interactions).

**Levers.** Add interaction terms or polynomial features; add the non-linear feature the physics suggests;
reduce `α` toward 0; switch to a model class that can represent interactions (trees, GAM).

**Counter-example where the remedy hurts (LIT).** L1 under correlated features arbitrarily zeroes one of a
pair and keeps the other, so the surviving coefficient is unstable and its importance is misleading. If
features are correlated, ridge (or elastic net) is the safer regulariser, and importance must be read with
the correlated-feature caveat in `ml-interpretability.md`.

**Evidence.** `JUDGEMENT` for the lever list (standard practice); the L1-under-correlation caveat is `LIT`.

---

## 2. Tree ensembles (random forest, gradient boosting, XGBoost/LightGBM)

**Overfit signature.** Gradient boosting with too many rounds and deep trees; validation error turning
**up** while train error keeps falling; random forest much less prone than boosting but can still overfit
with deep, unconstrained trees.

**Levers (name them concretely).**
- `max_depth` / `num_leaves`: the primary capacity knob.
- `min_child_samples` (`min_child_weight`, `min_samples_leaf`): raises the evidence needed per leaf.
- L2 leaf penalty `lambda` and split-gain minimum `gamma` (XGBoost naming).
- `subsample` and `colsample_bytree`: row and column subsampling.
- `n_estimators` with **early stopping on a validation fold** — the cheapest and most reliable brake.
- Learning rate ↓ with more rounds (trades time for stability).

**Underfit signature.** Shallow stumps, high bias, training error never gets low.

**Levers.** Increase depth/leaves; increase rounds; lower the learning-rate reduction; add features the
tree cannot synthesise (trees cannot extrapolate or form smooth linear combinations cheaply).

**Counter-example (LIT).** Random-forest permutation importance on **correlated** features splits
importance between them and can understate both — a feature that matters can appear unimportant. Use
conditional permutation or tree-SHAP with the caveat in `ml-interpretability.md`. Also: trees **cannot
extrapolate** beyond the training range; for a target with trend, a tree ensemble will plateau.

**Evidence.** `JUDGEMENT` for knobs; correlated-importance caveat `LIT`.

---

## 3. Neural networks

**Overfit signature.** Train loss keeps falling while validation loss rises; gap widens with epochs and with
capacity; memorisation of individual samples.

**Levers (name them concretely).**
- **Early stopping on a validation split** — the highest value-per-effort lever.
- Weight decay (decoupled, i.e. AdamW-style).
- Dropout (rate per layer); for convolutional blocks, spatial/2-D dropout.
- Data augmentation — and note it changes the effective dataset, so re-check the split.
- Label smoothing for classification.
- Reduce width/depth; reduce input resolution if the task tolerates it.
- **Group-wise splits** when samples are not independent (see §6).

**Underfit signature.** Both losses high and flat; the network cannot even fit a small subset.

**Levers.** Increase capacity; improve the optimiser schedule (warmup + cosine); check the learning rate is
not too small; verify inputs are normalised; verify labels are wired correctly (a surprising share of
"underfitting" is a label/loss bug).

**Evidence-backed notes (LIT).**
- Normalisation interacts with batch size: BatchNorm degrades sharply at small batch sizes, while GroupNorm
  is batch-size independent. A controlled comparison measured GroupNorm at **10.6 % lower error than
  BatchNorm on ResNet-50/ImageNet at batch size 2**. If your micro-batch is small, switch normalisation on
  **all** tiers rather than only the constrained one — changing it on one tier breaks comparability.
- Batch size cannot be raised indefinitely: beyond the **critical batch size** `B_crit = E_min / S_min`,
  larger effective batches buy **no** reduction in steps. Enlarging the effective batch by gradient
  accumulation past `B_crit` is wasted effort — spend the time on more steps instead.
- Learning-rate scaling when batch size changes: linear (`lr ∝ batch`) with warmup is the common rule; the
  square-root rule (`lr ∝ sqrt(batch)`) is the more conservative fallback. At extreme batch sizes the
  linear rule alone is documented to diverge.
- **No sourced rule exists for scaling weight decay with batch size.** Treat any such scaling as
  `JUDGEMENT` and re-tune at the new batch size.

---

## 4. K-Nearest Neighbours

**Overfit signature.** `k = 1` — zero training error by construction, poor validation.
**Underfit signature.** Very large `k` — predictions approach the global mean.

**Levers.** `k`; distance metric; distance weighting; **dimensionality reduction** (the curse of
dimensionality makes distances meaningless in high dimension); feature scaling (distance-based methods are
scale-sensitive — always standardise).

**Counter-example.** A model with **no training phase** can still overfit: `k = 1` memorises. "It wasn't
trained, so it can't overfit" is false — the complexity is in `k`, not in a fitted parameter set.

---

## 5. Time-series models (ARIMA-family, gradient-boosted lag models, sequence networks)

**Overfit signature.** Excellent in-sample fit, poor out-of-sample; validation error rises as lags are
added; the model has effectively memorised the last value.

**Levers.**
- **Walk-forward / rolling-origin cross-validation.** Never shuffle time-ordered data.
- Reduce lag count; require each lag to earn its place.
- Differencing / detrending for stationarity.
- Regularise the lag-feature model as in §1/§2.

**Underfit signature.** Model output is essentially the mean or the previous value; residual
autocorrelation remains.

**Levers.** Add seasonal structure, exogenous variables, or a longer memory; check stationarity first.

**Counter-example (JUDGEMENT, flagged as unsourced).** Adding a feature that is only known *after* the
prediction time creates leakage that looks exactly like a strong model. In time-series work the leakage risk
is the dominant failure mode, not overfitting.

---

## 6. Leakage — the failure that impersonates overfitting

Leakage and overfitting both show "train great, validation poor". They need **opposite** responses, so
distinguish them before regularising. The shapes that matter most in this project:

- **Split by group, not by sample.** If several samples share a mesh, a patient, a machine, or a session,
  splitting randomly puts near-duplicates on both sides. Split by the group.
- **Preprocessing fitted before splitting** (scalers, encoders, imputers, feature selection, target
  encoding) leaks test information into training. Fit inside the fold.
- **One solve used for both a feature and its own target.**
- **Duplicate or augmented copies** crossing the split.
- **Thresholds or model choices made on the test set** — a leakage of *decisions* rather than of rows.

**Diagnostic.** If shuffling the labels still yields above-chance validation performance, suspect leakage.

---

## 7. Quick reference — the six levers ranked by cost

| Lever | Cost | Applies to |
|---|---|---|
| Early stopping on a validation fold | lowest | NN, boosting, any iterative fit |
| More/cleaner data; better split | low | all |
| Regularisation strength (`α`, `lambda`, `gamma`, `min_child_samples`) | low | linear, trees |
| Capacity (`max_depth`, width, `k` ↓, lags) | low | trees, NN, KNN, TS |
| Augmentation | medium | NN (and only with a group-safe split) |
| Architecture change | high | NN |

## 8. What this reference does **not** claim

- It gives no accuracy deltas for regularisation choices — no controlled A/B study for most of these levers
  was reachable in this project's evidence work (`LIT` gap, recorded in `ml-literature-gaps.md`).
- Per-family knob **lists** are `JUDGEMENT`; only the specific results marked `LIT` are sourced.
- The "counter-example" rows are the part most often missing from advice: a remedy that helps in general can
  hurt on correlated features, on non-extrapolating models, or when leakage rather than variance is the
  real cause.
