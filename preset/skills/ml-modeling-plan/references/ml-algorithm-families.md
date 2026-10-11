# ml-algorithm-families — neural networks with an outer optimisation loop

Reference for `ml-modeling-plan`. Read when the architecture is fixed but an **outer loop** searches over
structure, hyperparameters, or policy. Covers the four families that combine deep networks with
metaheuristic / Bayesian / evolutionary outer loops.

**Read `ml-literature-gaps.md` alongside this file.** Several things commonly claimed about these families
are not supported by the evidence this project assembled.

---

## The common shape

Every family is `outer loop (proposes) → inner trainer (evaluates) → objective (scored)`. The design
questions are identical across families, and the first one is almost always answered badly:

1. **What is optimised?** Architecture, hyperparameters, initial weights, policy weights, reward shaping, or
   the action space? These behave completely differently and must not be conflated.
2. **What is the search space and its representation?** Real-valued vector, bit string, tree grammar,
   graph, or a weight-sharing supernet. The representation determines which optimiser is even applicable.
3. **What is the outer-loop budget in evaluations, generations, and wall-clock?** This is the question the
   literature most often leaves unanswered — see the gap in `ml-literature-gaps.md`.
4. **What is the baseline the outer loop must beat?** Random search at equal budget is the honest baseline;
   a greedy default is the other common one.
5. **What is the reported failure mode?** Where did it lose, and what did it cost?

## Family 1 — Bayesian / Gaussian-process-driven outer loops over reinforcement learning

- Optimises **training hyperparameters** in the overwhelming majority of the literature (learning rate,
  rollout length, reward coefficients, curriculum), not policy weights or architecture.
- Representation is a **real-valued or mixed discrete/continuous hyperparameter vector**. When the space is
  hierarchical and conditional, flat Gaussian-process priors are misspecified — a dedicated method exists
  precisely because of that.
- **Two distinct topologies are routinely conflated**: Bayesian optimisation *as the outer loop over RL*,
  versus RL *as the inner solver for the acquisition function*. Only the first reduces your tuning burden.
- Objective is normally expected return; one line of work adds **outcome variance** and argues the standard
  homoscedastic assumption is wrong. If your runs are high-variance, that argument matters.
- Theory support is real but narrow: regret bounds for GP-UCB are expressed via maximal information gain in
  low-dimensional spaces, which says nothing about the conditional spaces these papers actually use.

## Family 2 — heuristic search over decision-tree structure

- Optimises **the tree itself** — split structure, split geometry (**oblique** splits in particular), or an
  ensemble of trees — not a hyperparameter vector bolted onto a greedy learner.
- Three documented encodings: **rule/covering sequences** (ant-colony lineage, well documented over
  2007–2013); **real-valued tree vectors** (explicitly chosen so generic continuous optimisers apply); and
  **semantic/genetic-programming-style tree mutation**.
- The honest motivation throughout is that **greedy induction is suboptimal**. That is a real argument.
- **No verified tree-grammar representation** was found — see `ml-literature-gaps.md`.
- This family is **CPU-bound and cheap per evaluation** (dataset-sized, not GPU-sized). For a laptop budget
  it is the most affordable family here.

## Family 3 — heuristic algorithms driving reinforcement learning

- Three distinct objects get optimised and must be distinguished: **policy network weights** (pure
  neuroevolution), **RL hyperparameters**, and **topology + weights jointly**.
- The dominant hybrid pattern is **evolution proposes, gradient refines** — an evolutionary population
  generates candidates and an off-policy learner refines them.
- The clearest honest statement available: neuroevolution is "widely applicable and rather stable, but
  suffers from low sample efficiency", while the most sample-efficient RL variants are "rather unstable and
  highly sensitive to hyper-parameter setting". That tension is why the family exists.
- **Scaling axis is parallel CPU, not the GPU.** Evolution-strategy methods scale with CPU count; weight
  evolution of deep networks on a single modest GPU is not supported by the evidence assembled here.
- **Reward shaping and action-space search are effectively absent** from the reachable literature despite
  being natural fits — a genuine gap, recorded in `ml-literature-gaps.md`.

## Family 4 — CNN/Transformer and GNN/Transformer backbones with a heuristic outer loop

- **Asymmetric coverage**: CNN+heuristic and Transformer+heuristic are well populated;
  **GNN+heuristic is thin and mostly title-level**; and **no paper combining all three backbones under one
  heuristic outer loop was found**.
- Representation is the richest here: indirect/**cellular (gene-expression-programming) encoding**, whose
  stated justification is that direct encodings "do not scale well on large architectures"; **real-valued
  Cartesian genetic programming** for continuous multi-objective search; and **weight-sharing supernets**.
- **The only family with hard cost numbers**: field-reported search costs run from "up to 22,400 GPU-days"
  for early architecture search down to "a few GPU-days" with weight sharing or differentiable search.
  Treat those as *cost of a research programme*, not of your run.
- Honest failure modes are quotable: manual graph-Transformer design is admitted to need expert knowledge
  and laborious trials; evolved classifiers were admitted **inferior to hand-crafted ones** before
  regularised evolution.

## Cross-family practical rules

1. **Budget the outer loop in evaluations before you start.** If the inner evaluation is a full training run,
   the number of runs you can afford *is* the search budget. Count it first.
2. **Beat random search at equal budget, or do not promote the winner.** This is the standard the family
   itself is measured against.
3. **Run at least three seeds per candidate.** Rankings are fragile (see `ml-evaluation-and-leakage.md` §5),
   and a single-seed search winner is indistinguishable from noise.
4. **Prefer the cheapest outer loop that tests your actual hypothesis.** For hyperparameters, a modest
   Bayesian search beats a full evolutionary programme. Reserve the expensive loop for structural questions
   a hyperparameter search cannot express.
5. **Rank the hypothesis, not the score.** If two candidates differ by less than run-to-run variance, record
   the comparison as inconclusive rather than picking the higher number.

## Scaling a search from a laptop tier to a cloud tier

- **Keep the model definition and the attention variant identical across tiers.** Switching to an
  approximate attention only on the small tier changes the function class, so the transferred configuration
  no longer describes the model you later train. Scale via **parameter count, dataset size, batch size, and
  input resolution/sequence length** — not by swapping attention implementations.
- **Resolution is the strongest memory lever, and it is not a parameter.** Activation memory is dominated by
  the attention term, which grows with the square of the token count. Halving the attention stage's sequence
  length reduces that term roughly fourfold. A parameter-count-only scaling story misses the binding
  constraint.
- **Gradient accumulation past the critical batch size buys nothing** — spend the time on more steps.
- **Re-verify the winner at the large tier.** Hyperparameter transfer across scale is achievable but not
  automatic; at least one study finds that the standard parameterisation with a per-layer learning-rate
  prescription can outperform the transfer-oriented parameterisation. Treat transfer as something to test.
