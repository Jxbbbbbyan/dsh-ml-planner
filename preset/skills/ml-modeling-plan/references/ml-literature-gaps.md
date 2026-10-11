# ml-literature-gaps — what the evidence does **not** support

Reference for `ml-modeling-plan`. Read before writing any sentence of the form "studies show", "best
practice is", or "the standard approach is".

**Purpose.** An evidence chain is defined as much by what it failed to find as by what it found. This file
lists the gaps so that a later reader cannot mistake absence of evidence for evidence of absence — or, worse,
inherit an unsupported claim as established practice.

**Evidence-depth labels used below.**
- `FULL-TEXT` — the paper's own body was read.
- `ABSTRACT-ONLY` — only the abstract was available; the claim cannot be checked further.
- `IDENTIFIER-ONLY` — the paper's identity was verified, its content was **not** read.
- `NOT-FOUND` — targeted search returned nothing; this is a **search** result, not proof of non-existence.

---

## 1. The outer-loop budget is systematically absent from the literature

`ABSTRACT-ONLY` (63 papers reviewed; 60 of them abstract-only, 3 full-text). **No reviewed paper stated its
own total outer-loop budget** — function-evaluation count, generation count, or wall-clock. Two partial
exceptions existed: one paper's *per-generation evaluation protocol* (which is a reporting convention, not a
budget) and one paper's field-level cost framing ("up to 22,400 GPU-days" for early architecture search,
down to "a few GPU-days" with weight sharing).

**Wording discipline.** This is an **abstract-level non-finding**. It does **not** support "no paper in the
literature reports its budget" — the full texts were largely unread. It supports: *do not expect to find a
budget to copy; budget from first principles.*

## 2. No paper combining CNN + Transformer + GNN under one heuristic outer loop

`NOT-FOUND`. Targeted searches did not surface such a work. `ABSTRACT-ONLY` coverage of the fourth family
found CNN+heuristic and Transformer+heuristic well populated, GNN+heuristic thin, and no triple combination.
**Do not present this combination as established practice.**

## 3. No tree-grammar / grammatical-evolution representation for decision-tree search

`NOT-FOUND`. Three encodings were documented (rule/covering sequences, real-valued tree vectors, semantic
tree mutation); a grammar-based representation was not among them.

## 4. Reward shaping and action-space search are absent from the heuristic-RL literature reviewed

`NOT-FOUND` / `ABSTRACT-ONLY`. The third family's reachable literature optimises policy weights,
hyperparameters, or topology — not reward shaping and not the action space. Both are natural fits, which
makes their absence notable.

## 5. No paper reported the heuristic losing to a simple baseline

`ABSTRACT-ONLY`, and this is the weakest dimension of the reviewed set. Across the four families, **no
abstract reported a case where the heuristic method lost to a simple baseline**, and **no statistical
significance test could be extracted from any of the 63 papers**. Treat every reported gain in this
literature as unquantified with respect to run-to-run variance until the full text says otherwise.

## 6. One frequently-cited paper does not appear to exist

`NOT-FOUND`. "Multifidelity Bayesian optimization for hyperparameter tuning of deep reinforcement learning
algorithms" (identifier `10.59400/cai2923`) appeared in a Crossref search listing but returned **HTTP 404**
on direct DOI resolution. **Do not cite it.**

## 7. No accuracy A/B for direction/orientation input encodings

`NOT-FOUND`. No study measuring scalar angle versus doubled-angle versus signed encodings on the same task
was reachable. The recommendation to use a doubled-angle representation rests on **mathematical
well-posedness** and the equivariance literature — a scalar angle is a discontinuous function of the field
direction — **not** on a benchmark delta. State it that way.

## 8. No A/B study for non-RGB stem channel adaptation

`NOT-FOUND`, and the source explicitly flagged this as its weakest axis. No reachable study compares
{sum weights / replicate channels / random init / new learned stem} × {1-channel, N-channel} on a common
task with accuracy deltas. Available evidence is two verified library code paths plus one abstract-level
precedent. Any specific accuracy delta claimed for channel adaptation is unsupported.

## 9. No official FLOPs table, and no measured activation memory for any backbone

`NOT-FOUND` for both. The canonical ImageNet results table carries parameters and accuracy only — **no FLOPs
column** — so any backbone FLOPs figure is a derivation from the architecture, not a measurement. No source
provides measured activation memory at any resolution, and the environment used for this work had no GPU
visible, so **no activation-memory number could be produced locally**. Any megabyte budget must be
**measured on the target device** before a recipe is frozen.

## 10. No controlled rasterisation-versus-mesh comparison for simulation fields

`NOT-FOUND`. The literature offers two well-supported poles — rasterise to a grid, or learn on the mesh —
but no single study measures the trade-off on field data. The choice is engineering judgement informed by
two literatures, not a settled empirical result.

## 11. No end-to-end vision two-tier transfer experiment, and no measured cost of switching attention variants across scales

`NOT-FOUND` for both. Most scaling-transfer evidence is language-domain; no reachable study ran a vision
two-tier transfer end to end, and none quantified the accuracy cost of changing attention variant between
training scales. This is precisely why the guidance is to **keep the attention variant identical across
tiers** — not because sameness is proven best, but because the cost of differing is unmeasured.

## 12. No public dataset pairs mesh-quality/defect labels with field outputs

`NOT-FOUND`. Defect-labelled mesh collections exist without physics; mesh-quality indicator collections
exist without fields. Nothing pairs the two. If such a pair is needed, it must be generated.

---

## Additional measured-in-this-project gaps (not literature gaps)

These are things **this environment** could not measure. They are not claims about the world.

- **No GPU was visible to the agent's session.** `torch.cuda.is_available()` was `False`, `nvcuda.dll`
  failed to load, and device enumeration showed only a virtual display adapter. Therefore **every VRAM,
  throughput, and batch-size number in this project is either user-reported or derived** — none was measured
  here. Any GPU-dependent acceptance criterion must be executed on a real device.
- **No activation-memory profiling was possible**, for the same reason.
- **Two-thirds of the detector-family sources were read at abstract or identifier level only**; a claim
  attributed to those sources cannot be traced past the abstract without re-reading the full text.
- **A large share of paywalled sources had no verified open-access full text.** Landing-page links returned
  by bibliographic APIs are sometimes staging endpoints rather than genuine open access; where that was
  detected, the entry was recorded as "no open-access copy located" rather than passed through.

## How to use this file

1. Before asserting that something is established, check whether it appears above.
2. When a gap blocks a decision, say so explicitly in the plan and choose the option that degrades most
   gracefully — or measure it.
3. Never upgrade an `ABSTRACT-ONLY` or `NOT-FOUND` entry into an assertion of fact in a delivered document.
   Quote the label.
