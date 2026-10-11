---
name: create-a-big-plan
description: Create a large dsh-plans plan before implementation. Use for open-ended or high-risk repo efforts needing 10 or more planning questions, web research, reviewer or criticizer subagents, and refinement until convergence; exclude direct implementation-only, factual/explanation, trivial command-only, or explicit no-plan requests.
---

# Create A Big Plan

Use this skill when the user wants a large, high-risk, or open-ended plan before a repository change.

## DSH Setup

Read `../references/dsh-planning-workflow.md` and `../references/state-and-config.md` — both normative — and follow their setup, state, `language`, and reviewer/criticizer/executor rules. State lives in `dsh-plans/.state/` via `../scripts/dsh_plans_state.py init --workdir <target-workdir>`; spawn reviewer and criticizer roles with the `run_plan_subagent` tool.

## Depth Contract

- Inspect the target Git repo read-only before the first product question.
- Ask at least 10 planning questions, one at a time; no maximum — stop only when the decision tree is genuinely resolved. Standard choice format: recommended first, `Other` second-last, `Auto-complete` last.
- Use web research during both brainstorming and refinement when outside facts, patterns, or ecosystem constraints matter.
- Ask the final scope confirmation, then write `PLAN_v1.md` per `../references/plan-artifact-template.md`.
- After each plan version, ask the refinement mode question from the shared workflow — never spawn a reviewer or criticizer unless the user or `Auto-complete` selected it at that question. Default sequence: one `Reviewer` round as three concurrent independent reviewers consolidated by the main agent (protocol in the shared workflow), then one `Criticizer` round; afterwards the recommended option is `Accept plan for DSH goal execution`. Beyond the default sequence, refine until convergence on high-priority findings, unresolved questions, or evidence gaps; surface at most five per round. Then the goal-based execution handoff from the shared workflow.

## Fit

New systems, large feature surfaces, cross-repository or cross-service work, open-ended architecture, safety-sensitive changes, unclear user workflows, or plans whose shape is not yet known. Use `reference-before-plan` instead when external projects, papers, articles, or documentation must be downloaded and studied before planning choices are safe.
