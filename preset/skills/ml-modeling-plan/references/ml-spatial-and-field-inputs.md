# ml-spatial-and-field-inputs — images, rasters, and direction/orientation fields

Reference for `ml-modeling-plan`. Read when inputs are spatial **and** one of them encodes a direction: a
normal field, a flow direction, a crystal orientation, a gradient direction, or a mesh-derived vector field.

The distinction between a *direction* (mod 2π) and an *axis/orientation* (mod π) is the single most
consequential decision in this file. Getting it wrong destroys information silently.

---

## 1. Direction and orientation are not scalars — encode them in a doubled-angle or vector form

**Never feed a bare angle channel to a convolution or a dense layer, and never interpolate an angle.**

Two independent failure modes:

1. **Wraparound discontinuity.** A scalar angle jumps at ±π. A smooth kernel averaging across that cut
   averages values that are numerically far apart but physically adjacent, producing a smear along a
   branch cut. The doubled-angle pair `(cos 2θ, sin 2θ)` is continuous and 2π-periodic in θ, so averaging
   behaves correctly.
2. **Mod-π ambiguity collapse.** For an axis, θ and θ+π are the same feature. A scalar-angle regressor will
   average them into a meaningless mid-value at every 180° ambiguity. The doubled-angle representation
   represents θ and θ+π identically *by construction* — which is exactly the axial symmetry.

**Measured demonstration (this project).** Take a director field that is 5° on one half of the domain and
175° on the other half. These describe **the same line**. The naive arithmetic mean of the angles is
**90.0000°** — a direction that exists nowhere in the data. The doubled-angle mean returns **0.0000°** with
resultant length **R = 0.9848**. For a field that is uniformly distributed over the full circle, the
doubled-angle resultant is **R ≈ 9.0e-17**, which correctly signals *"the mean direction is undefined"* — a
validity flag a scalar-angle pipeline cannot produce.

### Choose the encoding from the ambiguity class — and declare it

| The quantity is | Symmetry | Encode as |
|---|---|---|
| A **direction** (arrow, flow, displacement, polarity matters) | mod 2π | `(cos θ, sin θ)` |
| An **orientation / axis** (line, fibre, crack, grain, normal-up-to-sign) | mod π | `(cos 2θ, sin 2θ)` |

**You must decide which one you have and record it.** Using `2θ` for a genuinely polar quantity **deletes
the sign** and does so silently. Record the class in the sample metadata (e.g. a `field_kind: axial|polar`
field) so the choice is reviewable.

### Always carry magnitude as a separate channel

Add a third channel for magnitude/anisotropy/confidence. Without it, an isotropic region (no orientation at
all) is indistinguishable from a confidently oriented one, because `(cos 2θ, sin 2θ)` will happily encode
something for noise.

**Recommended channel layout:** `[cos 2θ, sin 2θ, magnitude]` for axial, `[cos θ, sin θ, magnitude]` for
polar.

## 2. Rasterising a field loses extrema — measure the loss, do not assume it

Rasterisation is a reconstruction-filter choice, not a neutral resample. Whether it is acceptable depends
entirely on the quantity you need.

**Measured on a real finite-element field (this project).** Resampling a nodal pressure field onto uniform
grids retained only these fractions of the true nodal maximum:

| Grid | Retained peak |
|---|---|
| 32 × 40 | **17.4 %** |
| 64 × 80 | **19.1 %** |
| 128 × 160 | **27.8 %** |
| 256 × 320 | **30.4 %** |

That is **69.6 %–82.6 % of the peak lost, and the loss depends on the grid you picked.** Two further
measured facts:

- **About half the raster was empty** (50.17 %–51.30 % of voxels) because the domain occupied only half its
  bounding box. Any unmasked mean, percentile, or descriptor was therefore computed half on nothing.
- **An integer categorical array was silently resampled into non-integers** (values like 1, 100, 101, 102
  became 0…1 and 0…100). Any region/geometry label carried as a categorical field is destroyed by the
  raster step.

**Point-sampling a discontinuity does not improve with resolution.** Sampling a step field onto a raster gave
a worst-pixel error of **0.4734 at 128 px — 47 % of full range** — and the error *does not shrink with
resolution*, because it is a straddling-pixel effect, not a sampling-rate effect. A prefilter (or an
integrated/area-aware encoding) is required; point-sampling your way out is not possible.

**Peak retention versus feature width.** For a Gaussian feature of width σ, sampled maxima were
0.2950 / 0.7370 / 0.9265 / 0.9811 / 0.9952 at dx = 1/16 … 1/256. **To hold a sampled peak within 2 % of
truth you need dx ≲ 0.4 σ.** State your feature width and your grid spacing together, or the number is
meaningless.

### Where rasterisation must not be used

- The target is an **extremum** or its **location**.
- The field is **discontinuous** (crack, phase interface, shock, contact, per-element output).
- The quantity is a **direction or orientation**.
- The **mesh itself** is the object of interest (element size, connectivity, quality, defect class).
- The **domain is not the bounding box** and you are not carrying a mask.

In those cases compute the target **on the mesh**, and use the raster only as an auxiliary input. If you do
rasterise, **record the grid resolution in the sample metadata** — otherwise a model can learn the grid
rather than the physics.

## 3. Masks are semantics, not decoration

- Carry the validity mask as an explicit channel and keep it through every downstream step.
- **Mask empty regions; do not zero-fill them.** Zero is often a *legitimate value* — in direction encoding,
  `(cos 2θ, sin 2θ) = (0, 0)` corresponds to a 45° axis, so zero-filling empty voxels silently invents
  geometry. Use the mask, or a NaN sentinel, and assert on it in tests.
- Compute normalisation statistics **from the mesh data**, not from the raster, so statistics do not shift
  when you change the grid.

## 4. Mesh-native alternatives, and when they are worth it

Learning directly on the mesh (graph/message-passing, point-cloud convolutions, continuous field
representations) removes the rasterisation step. Reported cost evidence is strong — one mesh-graph approach
ran at 19–37 ms per step against a solver's 4166–11015 ms — and point-cloud networks were reported at ~141×
fewer FLOPs than a volumetric CNN baseline.

**But** the trade is data, accuracy, and physics, not raw speed: some mesh-native models hit a single-GPU
memory ceiling; tabulated memory for point transformers reached 1.7–4.3 GB for 10k–80k points; and one
method reports *higher* per-epoch wall-clock than a U-Net despite far fewer parameters. A convolutional model
on a modest raster is much cheaper per forward pass.

**Honest counter-evidence to keep in view:** physics-informed neural networks were reported **not** to beat
the finite-element method on one class of problem, so "mesh-native is better" is not a universal claim.

## 5. Practical pipeline checklist

- [ ] Decide and record axial (mod π) versus polar (mod 2π) **before** building channels.
- [ ] Encode direction as a pair (plus magnitude), never a scalar angle.
- [ ] Resample each direction component **separately**, then renormalise — never interpolate the angle.
- [ ] Keep the validity mask as a channel; assert its semantics in a test.
- [ ] Record grid resolution, bounding box, and the peak-retention fraction with every sample.
- [ ] Carry categorical/region labels by nearest-neighbour or separately; never through a continuous resample.
- [ ] Compute normalisation statistics from the mesh, not the raster.
- [ ] If the target is an extremum / location / discontinuity / direction / mesh property, compute it on the
      mesh.
- [ ] Measure peak retention for your own field and grid, and report it next to any conclusion drawn from
      the raster.

## 6. Circular statistics for direction fields — the inference half that was missing

The pipeline had an encoding and a retention number, but no test for "do these two orientation fields
actually differ?". A corpus article (`3942513879_2247500619_1`, re-posted as `3942513879_2247501560_1`)
supplies the standard toolbox, and it transfers directly onto the doubled-angle channel:

- **Circular mean** and **resultant length `R`** per group — `R` is the same quantity already reported as
  0.9848.
- **`R → κ`** via the empirical relation **with small-sample correction**. This is the step that turns a
  retention number into a concentration parameter you can quote with an interval.
- **Circular KDE with ±2π replication** to remove the wrap-around edge artifact. A naive KDE on an angle
  degenerates into a uniform ring.
- **Bootstrap CI on the circular mean**, and **between-group bootstrap p-values** for "field A ≠ field B".
- Assumptions to state: axial (mod π) versus polar (mod 2π) — the same distinction §2 already forces for the
  encoding. Any group test must respect it.

**Two cautions carried from the same article.** Its `log10(BF10)` trajectory stays below 0 across ~10 000
observations, while the prose presents the figure as a positive demonstration; and it never writes the numbers
into the text. So: **read the axis, not the caption, and report the value you actually obtained.**

## 7. Window-boundary extension for transform-based features

`3942513879_2247502927_1` (wavelet + LSTM) exposes a defect that transfers to any windowed transform:
`pywt.swt` uses **periodic (circular) extension** by default, so coefficients at the *end* of a window are
contaminated by samples from the *start* of the same window. That article calls it "boundary effects"
generically; its figure shows the actual signature — spikes in the last few indices, immediately adjacent to
the prediction target.

- Record and state the **extension mode** of every windowed transform (wavelet, STFT, convolution).
- Inspect the last few indices of every coefficient channel before using them as features. A boundary spike
  sitting next to the target is a leakage-shaped artifact even when nothing is technically leaked.
- The causal-convolution analogue is left-padding followed by right-truncation
  (`3942513879_2247500115_1`).

## 8. What this reference does not claim

- It gives no accuracy comparison between raster and mesh pipelines for field data — no controlled study was
  reachable (see `ml-literature-gaps.md` §10).
- It gives no accuracy delta for direction encodings — the doubled-angle recommendation rests on
  well-posedness, not on a benchmark (see `ml-literature-gaps.md` §7).
- The retention figures are from one field and one resampler. Use them as a **warning order of magnitude**
  and re-measure for your own data.
