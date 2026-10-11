# ml-model-failure-modes — per-model failure modes, and the practices that actually helped

**Provenance.** Distilled from a practitioner corpus (266 postings / **229 distinct articles**,
2026-05-01 → 2026-09-26) that was read article-by-article under `wechat-corpus/`. **Every bullet carries the
article `key`** (`3942513879_<msgid>_<itemidx>`) so any claim can be traced back to the source. Machine
indexes: `wechat-corpus/index/MODEL_LESSONS.md` (model → lesson lines), `…/EVIDENCE.md` (keyword evidence).

**This is not a benchmark.** These are **observed failure modes in a blog**, found repeatedly by independent
reading passes. Use them as a checklist of things to look for, not as rates to quote.

**How to use.** When the brief names one of these families, read its section and fold the matching items into
the `ML_BRIEF.md` contract and the Verifier Checklist. Items under *Practices* are things an article actually
implemented — not general advice.

---

## 1. Gradient-boosted trees — XGBoost / LightGBM / GBDT

**Failure modes**
- **The name in the text is not the implementation in the code.** `…1341_1`: the prose says the booster refits
  the previous round's residual and adds an L2 penalty; the code is an end-to-end MSE backprop with no penalty,
  and the "random forest" shares one dataset across 10 trees with **no bootstrap at all**. Check line by line
  before citing any "strongest combination" article.
- **The comparison does not control variables.** `…1959_1`: GBDT at `max_depth=3` on median-imputed data versus
  XGBoost at `max_depth=4` on raw NaN — two differences move together, so "XGBoost wins" cannot be attributed
  to the algorithm. Align depth, imputation, budget and iteration count.
- **`importance_type` left undeclared.** `…1959_1`: `feature_importances_` means weight/gain/cover depending on
  the version, so a "which features matter" conclusion is not reproducible without it.
- **Mechanism argued, never measured.** `…1959_1`: "XGBoost resists overfitting more strongly" rests on the
  existence of the penalty term — no train/val curves, no early stopping, no sweep.
- **A fusion or dimensionality-reduction gain with no ablation.** `…2513_1`: 79 % of importance sits in
  `y_lag1`+`y_lag2` while the PCA components contribute little, contradicting the article's own
  "PCA + XGBoost" framing. The article proposes the missing ablation and never runs it. **Any "fusion /
  reduction helps" claim must be contrasted against a same-family model without that component.**
- **One author, two standards.** `…2513_1` reports a single test RMSE with no validation, no CV and no tuning;
  `…2482_1` by the same author demands time-ordered splitting, `TimeSeriesSplit` tuning and one-touch test
  evaluation. **Write the standard into the contract — do not let it vary by mood.**
- **Warnings silenced globally.** `…0204_1`: `warnings.filterwarnings("ignore")` hides statsmodels/XGBoost
  convergence and parameter warnings.

**Practices that appeared**
- **Native missing-value direction learning** as an explicit alternative to imputation (`…1029_1`) — and
  "missingness is information" as a data-contract option for simulation data where runs fail to converge.
- **Imputation statistics from the training set only**: `X_train.fillna(X_train.median())`, then
  `X_test.fillna(X_train.median())` (`…1959_1`). No leakage.
- **A standard starting configuration**: a large learning rate to find a direction, then lower it and add trees;
  or a large `n_estimators` with early stopping (`…1029_1`).
- **`HistGradientBoostingClassifier` needs no extra dependency** — a cheap first baseline on a 12 GB single
  machine (`…2607_1`).
- **A batch discriminator** (historical = 0 / newest = 1, LightGBM + CV AUC + SHAP) as a cheap detector of
  joint-distribution shift; **strip batch id / timestamp / machine id first**, or the AUC is falsely high
  (`…2712_1`).

## 2. Random forests and single decision trees

**Failure modes**
- **The model shown in the figure is not the model that produced the reported metrics.** `…0806_1`: the
  "random forest is smoother" claim is illustrated with a 2-feature `max_features=1` model retrained in 2-D,
  not with the 8-feature model whose metrics are reported.
- **A comparison that exists only in the prose.** `…1118_1`: the title promises RF vs Extra Trees; only Extra
  Trees is trained. **A baseline named only in prose is not a baseline.**
- **"Looks good" with no number attached.** `…2998_1`: the article prints `Test Accuracy` and `OOB Score` and
  quotes neither, while calling the boundary "reasonable". **Any quality adjective must be bound to a number.**
- **Undiscussed diagnostics.** `…0069_1`: a 0.89 collinearity pair appears in the heatmap with zero comment;
  derived features leak into the training set.
- **Illustrative numbers read as results.** `…0069_1` argues with hypothetical miss rates ("if income is 20 %
  missing") against measured ones (12.3 %) — **example numbers in a planning document must be labelled as
  examples.**

**Practices that appeared**
- **`oob_score=True`** to judge overfitting without spending samples, and decision-boundary plots to compare
  one tree against an ensemble (`…0806_1`). *Caveat carried by the same article: OOB does not replace a
  held-out test set.*
- **A model-family comparison table with a "why this one" column** (`…1959_1`, GBDT vs XGBoost across nine
  axes) — a good template for the "selection and rationale" field, which must answer *why*, not *because it is
  strong*.
- **Explicit limitations.** `…0496_1` repeatedly asks "what are its limitations / when does it not apply?"
  Making "state the inapplicable regime" a fixed field of the brief is worth copying.
- **「A tree model needing no scaling does not mean the whole pipeline is scale-free」** (`…2535_1`). This is
  the sharpest warning for feature grids: inserting any scale-sensitive step (a PDE-residual penalty,
  distance-based interpolation, a neighbourhood operator) breaks the claim. **The contract must declare which
  steps are scale-sensitive.**

## 3. Sequence models — LSTM / GRU / TCN

**Failure modes**
- **A missing out-of-fold (OOF) stage in residual-corrected and stacked designs.** `…0118_1`: the residual
  corrector consumes the base model's *in-sample* prediction as a feature, so it learns the in-sample error
  level while inference faces the larger out-of-sample error. The same defect recurs in `…0204_1` and
  `…0104_1`.
- **A module labelled with a role it does not play.** `…0364_1`: the time-attention and node-attention run
  independently — the temporal module never sees other nodes — yet the prose describes them as one joint
  decision. **State which axis is mixed and which axis is treated as batch**; this is the easiest thing to get
  wrong when reproducing, and raster tensors face exactly the same "node as batch or as channel" choice.
- **A depth or capacity decision made before anything simpler was measured.** `…0364_1` gives a clean
  division of labour worth copying instead: GNN = space, LSTM = short-term memory, Transformer = long-range
  dependence, attention = selecting what matters; plus the failure of each alone.

**Practices that appeared**
- **"Check the residual before reaching for a deep model."** `…0589_1`: use ACF/PACF on the residual of a
  Prophet+ETS fit — **only go to LSTM if structure remains**. In that article all 40 lags exceed the confidence
  band and PACF cuts off at order 2, so the evidence chain is complete. **This is a falsifiable entry condition
  and belongs in the brief** in place of "try an LSTM first".
- **A single-architecture responsibility table** as the argument for the structure (`…0364_1`).
- **Fix four seeds and restore best state**: `random`, `numpy`, `torch`, `torch.cuda`, with early stopping and
  gradient clipping (`…0676_1`).

## 4. Transformer / attention

**Failure modes**
- **Validation loss rising while the text says loss should fall — and the article supplied the very criterion
  it violates.** `…0971_1`: val loss 2.31 → 2.42, and the article itself states "train down + val up ⇒
  overfitting".
- **A model that barely learned, described as having learned.** `…0971_1`: training loss reaches 2.17 against a
  random baseline of ln 10 ≈ 2.30 after 8 epochs, while the text claims it "learned to aggregate global
  information".
- **An attention map taken from the first batch** (near random initialisation) and presented as evidence for
  "multi-head = multiple views" (`…0971_1`).
- **`return_train_score=True` computed and never used** while the text discusses overfitting three times
  (`…1064_1`) — **no empirical evidence for the claim.**

**Practices that appeared**
- Head count proportional to `d_model` (64 → 4–8 heads); scaled dot-product to keep softmax out of the
  saturated region; a stated trade-off between sinusoidal and learned position encodings; future masking or
  causal attention for strongly causal series (`…1612_1`).

## 5. Margins and distances — SVM / SVR / KNN

**Failure modes**
- **A figure that does not support its own caption.** `…0415_1`: the caption claims "smoother, more stable
  boundary after standardisation" while the standardised panel is visibly more jagged — and it is **not a
  clean ablation**: both panels use `gamma='scale'` while the variance changes by orders of magnitude, and `C`
  is never retuned.
- **A hyperparameter dimension with no discriminating power.** `…0442_1`: `p=1` and `p=2` CV curves nearly
  coincide (Δ ≲ 0.005) while the text says the curve tells you which to choose.
- **Synthetic data that cannot support the point being made.** `…0442_1` generates both features from the same
  uniform distribution, so standardisation cannot change any distance ordering — the conclusion is right, the
  demonstration is inert.
- **An optimum parked on the grid boundary.** `…1064_1`: best CV at `γ = 1.0`, the largest value searched;
  `…0642_1`: LML optimum at the upper `length_scale` edge, still increasing. **Widen the grid or declare the
  parameter unidentifiable inside it.**
- **Only accuracy, on imbalanced data.** `…1064_1` (5 classes, majority class 22.6 %) and `…1051_1` (3 classes,
  majority ≈ 65.8 %).

**Practices that appeared**
- **Kernel/distance-matrix heatmaps as a separability diagnostic** (`…1064_1`) — a cheap way to see whether
  classes are separable before tuning.
- **A median-distance heuristic for `γ`**, and a `StratifiedKFold(shuffle, seed) + GridSearchCV` skeleton
  (`…1064_1`).
- **Cost accounting of exact kernels** — O(n²) memory and O(n³) time — which matters directly on a 12 GB GPU
  (`…1064_1`).

## 6. Clustering, mixtures and dimensionality reduction

**Failure modes**
- **A "soft assignment" that is one-hot almost everywhere.** `…0488_1`: the responsibility map is saturated
  pure colour over most of the area, with transitions only in narrow bands between clusters — the claimed
  advantage holds only at the boundary.
- **Outliers absorbed rather than identified.** `…0488_1`: the text says the outliers belong to no
  high-density region, but in the fitted map all 60 are recoloured into one of the three clusters — a mixture
  has no "reject" output space.
- **Model selection overestimating K under contamination.** `…0488_1`: true K = 3, but AIC prefers 5 and BIC
  prefers 4.
- **Inconsistent colour semantics between panels** — class identity encoded with different channels in two
  figures of the same article (`…0488_1`), and a swapped palette so the same colour means opposite classes in
  two panels (`…0302_1`). Readers mis-map categories.
- **Preprocessing fitted on the full frame** (`fit_transform` before splitting) in a scikit-learn scaling
  example (`…0991_1`), and `KernelPCA.fit_transform(vstack([train, test]))` — transductive (`…1064_1`).
- **A clustering-quality claim refuted by the article's own silhouette numbers** — `…0609_1`'s figure shows RAW
  0.880 > Min-Max 0.746 while the prose says Min-Max improved clustering.

**Practices that appeared**
- **`eigh` eigen-decomposition with covariance ellipses and an exact 95 % contour at `z = 2.4477`**
  (`…0488_1`) — a precise, cheap visualisation.
- **Soft assignment as an "existence degree" output** (`…0488_1`) — the same shape of problem as a fixed-slot
  output with a presence flag.
- **A symmetric colourbar on error heatmaps** so sign is readable (`…0442_1`).

## 7. Time series, filters and state space

**Failure modes**
- **A baseline built by mixing incompatible regimes.** `…2911_1`: the "pre-season baseline" averages
  2010–2019 (January peak) with 2023–2024 (March peak) by calendar month, contradicting the article's own
  warning that post-pandemic seasonality must be re-validated; the reported MAE = 2.01 is an artifact of the
  mismatch.
- **Different information budgets across the models being compared.** `…0893_1`: SARIMA uses conditional
  prediction over the whole validation window while LSTM/XGBoost recur step by step, so the fused "gain" may
  come from one arm seeing more.
- **Non-causal transforms applied before splitting.** EMD and wavelets are fitted on the whole series.
- **Boundary artefacts presented generically.** `…2927_1`: `pywt.swt` uses periodic extension by default, so
  the final coefficients of each window are contaminated by the window's own opening samples — visible as
  spikes adjacent to the prediction target. **Record the extension mode of every windowed transform and
  inspect the last few indices.**
- **A recursive filter fed parameters equal to the simulator's.** `…2947_1`: the baseline uses oracle basis
  functions structurally identical to the data generator, and `q = 0.05²`, `rho = 0.985` equal the true
  simulator values — the parameters contain the answer, contradicting the article's own claim that they should
  be estimated from train/validation data.
- **A moving-average filter whose figure refutes its title** (`…1001_1`: the two spectra nearly coincide, so no
  high-frequency suppression is visible — most likely because the axis is blown out by a DC spike).

**Practices that appeared**
- **Rolling-origin backtesting** and per-horizon MAE reporting (`…2947_1`: baseline MAE h1 ≈ 0.34 → h15 ≈ 0.375,
  corrected ≈ 0.125 → 0.195, relative gain shrinking 63 % → 48 % as the horizon lengthens).
- **A window × step error heatmap** as the basis for choosing hyperparameters (`…1001_1`).
- **"Don't look at RMSE alone"** — add peak error and top-K extreme recall (`…1001_1`).
- **Validate the residual's structure before adding a model** (`…0589_1`, see §3).

## 8. Augmentation and resampling

**Failure modes**
- **An intervention that measurably hurts while the text claims it helped.** `…2936_1`: test accuracy
  88.9 % → 88.3 % → 87.8 % and minority-class recall 43.8 % → 31.3 % → 18.8 % monotonically worsening as
  augmentation strengthens, while the prose claims both improve. The mechanism is in the article's own title:
  augmentation acts in **input space** while the class identity is a sector of polar angle, so rotating ±45°
  crosses class boundaries.
- **A resampling/weighting intervention that lowers average precision.** `…0302_1`: SMOTE and class weighting
  both give AP below the untransformed baseline (0.260 / 0.264 vs 0.363) — the article reports it as a win.
- **Threshold direction described backwards.** `…0302_1`: moving the threshold 0.5 → 0.88 *lowers* FP
  (486 → 21) and *raises* FN (28 → 60), the opposite of the text; recall falls 0.65 → 0.25.
- **A synthetic imbalance figure that cannot show what it claims.** `…2936_1`: the bar chart is
  `orig_counts * 3`, so the proportions are unchanged and it cannot support "the imbalance was mitigated".
- **Panel titles invisible** (`set_title(color="white")` on a white background), so the reader cannot tell
  which panel is which strategy (`…2936_1`).

**Practices that appeared**
- **Split before resampling**, and report the trivial baseline next to any resampling result.

## 9. Cross-cutting rule

Nine of the items above share one shape: **a claim in the prose that the article's own figure, code or
output does not support** (`…0609_1`, `…0642_1`, `…0676_1`, `…0875_1`, `…0971_1`, `…1001_1`, `…1064_1`,
`…1341_1`, `…2936_1`). The corpus therefore supports one hard Verifier-Checklist item:

> **Every assertion in the text or in a figure caption must be pointable-to — a number, a curve, or a visible
> structure in the run's own output. If it cannot be pointed at, rewrite the sentence. Any "better / smoother /
> reasonable / more stable" adjective must be bound to a specific metric value.**

## What this reference does not claim

- It reports **observed failure modes in one practitioner blog**, not measured frequencies in the field. The
  item counts come from a keyword index over ~240 notes; treat them as a checklist, not a statistic.
- It is not a hyperparameter guide: where a range or a default is quoted, it is what one article used.
- It does not replace `ml-evaluation-and-leakage.md` §8–§9 (split and leakage discipline) or
  `ml-overfit-underfit.md` (the diagnosis tree). This file is the **per-family** layer under them.
