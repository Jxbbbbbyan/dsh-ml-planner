# ml-feature-engineering — features, encoding, scaling, missing data

Reference for `ml-modeling-plan`. Read before designing features, and **always** before a claim that a
feature "matters" (see `ml-interpretability.md` §4).

---

## 1. Fitting order — the rule that prevents the most common leak

Every data-dependent transformation must be **fitted on the training fold only**, then applied to validation
and test.

Applies to: scaling/normalisation, imputation, categorical encoding, target/mean encoding, feature
selection, dimensionality reduction, outlier thresholds, binning edges, resampling.

Fitting any of these on the full dataset before splitting leaks test information and inflates every
subsequent number. The failure is silent: results look *better*, not broken.

## 2. Encoding

| Feature kind | Default | Watch out for |
|---|---|---|
| Low-cardinality categorical | one-hot | never one-hot with an unknown category at inference; reserve an "unknown" slot |
| High-cardinality categorical | target/mean encoding fitted **inside** the fold, or hashing | without smoothing, target encoding leaks the target outright |
| Ordinal with a real order | integer codes with the order preserved | do not one-hot a genuinely ordered variable unless the model cannot use the order |
| Free text | tokenise, or TF-IDF + linear model as the honest baseline | embeddings are not automatically better than TF-IDF on small data |
| Direction / orientation | **doubled-angle pair** — see `ml-spatial-and-field-inputs.md` | a scalar angle is discontinuous; never interpolate it |
| Counts | log or signed-log transform | keeps the model from chasing the tail |
| Time | cyclical encoding for hour/day-of-year; explicit lag features for sequence structure | raw timestamps as an integer imply a false ordinal scale |

**Consistency trap.** Encoding the train and test sets **separately** produces different column layouts for
the same categorical value. Fit one encoder on train and reuse it.

## 3. Scaling

- Needed for distance-based (KNN, SVM, k-means) and gradient-based models.
- Not needed for tree ensembles — they split on order, so monotone transforms change nothing.
- Use robust scaling when outliers are real.
- **Gate on unseen categories**: a scaled value from an unseen category is undefined, not zero.

## 4. Missing data

| Situation | Reasonable default | Note |
|---|---|---|
| Missing completely at random, small share | median/mode imputation **plus a missingness indicator** | the indicator is often informative by itself |
| Missing with structure | model the missingness; do not impute silently | structural missingness is information |
| Missing in a category with meaning ("not measured") | a dedicated category, not `NaN` | `NaN` and "not measured" are different facts |
| Large share missing | consider whether the feature is usable at all | report the share next to every result that uses it |

Never fill with 0 by default: zero is usually a valid value, and filling invents data. Where a sentinel is
unavoidable, keep an explicit mask column.

## 5. Feature selection and dimensionality

- **Selection is a model-fitting step**: fitting it on the full dataset leaks. Put it inside the fold.
- With correlated features, selection picks arbitrarily among near-duplicates and destabilises importance.
  Group or decorrelate before selecting.
- Dimensionality reduction (PCA and similar) helps distance-based models and hurts interpretability — the
  components are no longer features anyone can name. Prefer it when accuracy dominates, avoid it when the
  explanation must be mechanical.
- Report the correlation structure alongside any importance ranking.

## 6. Leakage-specific feature patterns

Features that are *causally downstream* of the target, or that encode the label, are the classic leak:

- an aggregate that includes the current sample;
- an identifier correlated with the label (a sample/group id, a timestamp);
- a feature derived from the same simulation run that produced the label;
- a "future" value in time-ordered data (see `ml-time-series.md`).

**Diagnostic.** If shuffling the labels still gives above-chance validation performance, a feature or the
pipeline is leaking.

## 7. What this reference does not claim

- It gives no accuracy deltas for encoding choices — no controlled A/B study for channel or encoding
  adaptation was reachable in this project's evidence work (see `ml-literature-gaps.md` §7–§8).
- It does not rank encodings against each other. The ordering here is by *risk of silent failure*, not by
  expected accuracy.
