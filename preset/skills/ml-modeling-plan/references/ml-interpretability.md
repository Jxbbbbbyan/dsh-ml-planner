# ml-interpretability — explanation that survives scrutiny

Reference for `ml-modeling-plan`. Read this **before** writing any sentence that explains a model, ranks a
feature, or implies a cause.

**Governing rule.** An explanation is a *claim about the model*, not a claim about the world. Attribution
methods can be unstable, can disagree with each other on the same model, and can be actively misleading
under correlated features. Report an explanation only with the evidence that licenses it.

---

## 1. Decide the question type first (global vs local)

| Question | Axis | Admissible method class |
|---|---|---|
| "Which inputs drive predictions overall?" | **Global** | Tree SHAP, conditional permutation importance, accumulated local effects (ALE), surrogate tree on a sample |
| "Why this one prediction?" | **Local** | SHAP values, integrated gradients, LIME, counterfactual/contrastive explanations |
| "What would change the outcome?" | **Counterfactual** | Counterfactual search, actionable recourse |
| "Does the model rely on the right mechanism?" | **Diagnostic** | Faithfulness tests, sanity checks, ablation |
| "Can I state a cause?" | **Causal** | Requires an identification strategy, not an attribution method — see §5 |

Choosing global when the decision is local (or vice versa) is the most common structural mistake and no
method choice repairs it.

## 2. Method families, their assumptions, and how they fail

**Attribution by gradient / saliency.** Assumption: the local gradient is a meaningful importance.
Failure: saturates (zero gradient where the model is confidently right), noisy for non-smooth models,
sensitive to input scaling. Mitigations: integrated gradients (path integral), SmoothGrad (average over
noisy copies and **report the variance**).

**Attention weights.** Assumption: attention mass equals importance. Failure: attention is a routing
quantity; high attention does not imply causal influence on the output, and attention rollout makes further
distributional assumptions. Treat as a hypothesis, then test by ablation.

**SHAP / additive attribution.** Assumption: a cooperative-game value with a chosen background distribution.
Failure modes: (a) the background/reference distribution changes the answer and is often left unspecified;
(b) SHAP's independence assumption is violated by correlated features, so the values split and can
**understate** a genuinely important feature; (c) for tree models the tree-SHAP path-dependent variant
differs from the interventional variant — say which one you used. Interventional SHAP is the safer choice
under correlation; path-dependent is faster but bakes in the training distribution.

**LIME / local surrogates.** Assumption: a sparse linear model is faithful in the sampled neighbourhood.
Failure: the neighbourhood definition and kernel width dominate the result; results vary run to run with the
same input unless the seed and sample size are fixed.

**Permutation importance.** Assumption: shuffling a column breaks only that column's information. Failure:
under correlated features, shuffling creates implausible rows, and importance is split or **negative** for a
feature that matters. Conditional permutation (permute within groups of correlated features) is the
corrected version.

**ALE / PDP.** PDP assumes feature independence and shows an average effect that may not exist for any
individual; ALE is the accumulation-based alternative and is preferred when features interact.

**Inherently interpretable models.** For tabular problems with modest interaction structure, a regularised
linear model, a shallow tree, or a GAM is often competitive and needs no post-hoc explanation at all.
Choosing one first is legitimate engineering, not a concession.

## 3. Faithfulness and stability — the evidence an explanation needs

Report these alongside any importance claim.

**Faithfulness (does the explanation reflect the model?).**
- **Deletion / insertion curves**: remove the top-k attributed features and measure the drop; a faithful
  attribution drops the output fast. Compare against a random-feature baseline.
- **Comprehensiveness vs sufficiency**: the attributed set should be both necessary and enough.
- A **randomised-label control** — retrain on shuffled labels and re-run the explainer. If the explanation
  looks just as confident, the method is not measuring what you think.

**Stability (would a rerun say the same thing?).**
- Repeat the explanation across `N` seeds / bootstrap resamples of the background set and **report the
  variance** of the top-k feature set (e.g. rank stability, Jaccard overlap of the top-k). A single
  explanation with no `N` is not evidence.
- For local methods, report the spread across repeated samples of the neighbourhood.

**Agreement across methods.** Compute at least two method families. When they disagree, that disagreement is
the finding — do not silently report the more flattering one.

## 4. Correlated features — the specific warning

Under correlated features:
- Permutation importance can **underestimate** a genuinely important feature and can go negative.
- SHAP's independence assumption gives a misleading split of credit; the interventional variant is required
  to interpret it.
- L1 regularisation arbitrarily keeps one of a correlated pair, so the surviving coefficient's sign and
  magnitude do not identify the causal feature.
- PDP's average effect can be extrapolated through regions with no data.

**Required practice.** Before reporting importance: compute the feature correlation matrix, group features
with `|r|` above a stated threshold, apply conditional permutation or grouped SHAP, and **state the
correlation structure in the same document as the importance ranking**.

## 5. Correlation is not causation — wording rules

An attribution method answers "the model used this", never "this causes that".

| Do not write | Write instead |
|---|---|
| "X drives Y" | "X is associated with Y in this dataset" |
| "Increasing X raises Y by k" | "Within the observed range, the model's prediction increases with X" |
| "X is the most important factor" | "Under this attribution method and this background distribution, X ranks first" |
| "Removing X would improve Y" | "Counterfactually, setting X to v changes the prediction to p (model-internal)" |
| "We identified the cause" | "A causal claim would require an identification strategy (randomisation, instrument, or explicit assumptions)" |

To license causal wording you need: a stated causal graph or identification assumption, a design that
supports it (randomisation, instrumental variable, difference-in-differences, or explicit adjustment), and a
sensitivity analysis. An attribution method provides none of these.

## 6. Per-model-family method choice

| Model family | Preferred global | Preferred local | Do not |
|---|---|---|---|
| Linear / regularised | coefficients **with** standard errors and the correlation caveat | contribution decomposition | read coefficients as causal, or as importance when features are collinear |
| Tree ensembles | tree-SHAP (state the variant) or conditional permutation importance | tree-SHAP | raw permutation importance under correlation |
| Neural networks (CNN/Transformer) | ablation studies; ALE on engineered inputs if available | integrated gradients / SmoothGrad **with reported variance** | present attention maps as importance |
| Graph networks | subgraph/edge attribution; message-passing ablation | edge/node attribution | treat message weights as importance |
| Reinforcement learning | value/policy visualisation over state space; reward decomposition | counterfactual action comparison | explain a policy by a single trajectory |
| Any model | randomised-label control; deletion curves | stability across `N` seeds | report importance without stability or faithfulness evidence |

## 7. Checklist before publishing an explanation

- [ ] The question type (global / local / counterfactual) is stated, and the method matches it.
- [ ] The background or reference distribution is stated (for SHAP/LIME).
- [ ] The variant of the method is named (e.g. interventional vs path-dependent tree SHAP).
- [ ] `N` and the run-to-run variance are reported.
- [ ] At least two method families are compared, and disagreement is reported.
- [ ] The feature correlation structure is reported next to the importance ranking.
- [ ] A faithfulness test (deletion curve or randomised-label control) is reported.
- [ ] Causal wording is either absent, or licensed by a stated identification strategy.
- [ ] Inherently interpretable alternatives were considered and the trade-off is stated.

## 8. What this reference does not claim

- It does not rank the methods against each other by accuracy; no reachable study establishes a general
  ranking, and the literature's own surveys present a heterogeneous taxonomy rather than a validated order.
- It does not claim any attribution method is correct. The point of §3 and §4 is that correctness must be
  *tested* per model, and that its absence is the normal case, not the exception.
- Faithfulness and stability are the load-bearing requirements; method choice is secondary. A well-tested
  simple method beats an untested sophisticated one.
