# ml-algorithm-selection — choosing a model before tuning one

Reference for `ml-modeling-plan`. Read when selecting or comparing model families.

**Rule.** Choose by the *structure of the problem and the data*, then tune. Choosing by fashion, or tuning a
model family that cannot represent the relationship, wastes the most time.

---

## 1. Start from the data, not from the model

| Evidence about the data | Implication |
|---|---|
| Fewer samples than features, or `n` in the tens | Start linear/regularised. A deep model will memorise. |
| `n` large, tabular, mixed types, some missing | Gradient-boosted trees are the strong default. |
| Monotone / physically constrained relationships | Constrain explicitly (monotone constraints, physics penalties) rather than hoping the fit absorbs it. |
| Strong interactions known from domain theory | Add them explicitly; do not rely on a linear model to discover them. |
| Spatial or field structure with translation invariance | Convolutional or graph-based; see `ml-spatial-and-field-inputs.md`. |
| Sequences with long-range dependency | Attention-based or recurrent; check the memory ceiling first. |
| Time-ordered with trend/seasonality | Time-series family; see `ml-time-series.md`. |
| Output count is unknown or large | Dense detection-style head; a fixed-query head hard-caps the count. |

## 2. Reference scale (parameters vs accuracy, ImageNet-scale image classification)

These are official single-crop numbers and are quoted only to make one point: **"lightweight" is not the
same as "familiar".**

| Backbone | Params | Top-1 |
|---|---|---|
| ResNet-18 (widely used baseline) | 11.69 M | 69.75 % |
| ResNet-34 | 21.80 M | 73.30 % |
| ResNet-50 (bottleneck) | 25.56 M | 76.16 % |
| ConvNeXt-atto | **3.70 M** | **75.67 %** |
| ConvNeXt-femto | 5.22 M | 77.50 % |
| MobileNetV4-conv-small | 3.77 M | 74.53 % |
| EfficientNet-B0 | 5.29 M | 78.57 % |

**ResNet-18 is Pareto-dominated on this table**: a 3.70 M model reaches a higher score. So if ResNet-18/34 is
chosen, the honest justification is *familiarity, documentation, and available pretrained weights* — **not**
that it is the lightweight option.

**Training recipe often beats architecture.** The same ResNet-50 improved by 5.1 points at identical
parameter count purely from a better recipe (improved stem, cosine schedule, label smoothing, mixup,
stronger augmentation). Apply the recipe before swapping the architecture.

## 3. Practical selection checklist

- [ ] State the trivial baseline and its score first.
- [ ] Pick the **simplest** family that can represent the relationship.
- [ ] Check the sample-to-feature ratio before reaching for a large model.
- [ ] For images, decide **input resolution and output stride** before the backbone — those bound memory and
      token count more than the variant does.
- [ ] For detection-style output, decide how the **count** is produced (threshold + suppression, or fixed
      queries) and whether the count can exceed the budget.
- [ ] Prefer a model whose **explanation method** you can defend (see `ml-interpretability.md`).
- [ ] Only then compare candidates, with a pre-declared metric and an interval over seeds.

## 4. Comparing candidates honestly

- Fix the split and the metric **before** looking at results.
- Run at least **three seeds** per candidate; report the interval, not the best run.
- Compare against **random search / the trivial baseline at equal budget**, not only against other
  sophisticated methods.
- Treat margins smaller than run-to-run variance as **inconclusive**, not as a ranking. Model rankings are
  documented to be fragile: one controlled study measured rank correlation of only ≈0.48 between two runs of
  the same search and ≈0.54 across depth settings, with candidates moving up to 18 positions out of 32.
- If two candidates are within noise, prefer the simpler, cheaper, more explainable one.

## 5. What this reference does not claim

- No universal ranking of model families. The right choice depends on the data structure, and the table in
  §2 is one benchmark at one input size.
- No accuracy deltas for switching families on your task. Measure on your own data.
- The "recipe beats architecture" result is a language/vision finding, quoted as a **mechanism** — apply the
  recipe first — not as a guaranteed magnitude.
