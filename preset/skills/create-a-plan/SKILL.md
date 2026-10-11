---
name: create-a-plan
description: Create a researched dsh-plans plan before implementation. Use for broad or risky repo changes needing 5 to 10 planning questions, web research, reviewer or criticizer settings, and bounded refinement; exclude direct implementation-only, factual/explanation, trivial command-only, or explicit no-plan requests.
---

# Create A Plan

Use this skill when the user wants a substantive plan before a repository change.

## DSH Setup

Read `../references/dsh-planning-workflow.md` and `../references/state-and-config.md` — both normative — and follow their setup, state, `language`, and reviewer/criticizer/executor rules. State lives in `dsh-plans/.state/` via `../scripts/dsh_plans_state.py init --workdir <target-workdir>`; spawn reviewer and criticizer roles with the `run_plan_subagent` tool.

## Depth Contract

- Inspect the target Git repo read-only before the first product question.
- Ask 5 to 10 planning questions, one at a time; standard choice format (recommended first, `Other` second-last, `Auto-complete` last).
- Use web research whenever outside library behavior, ecosystem precedent, UX convention, protocol semantics, or compatibility affects the recommendation.
- Ask the final scope confirmation, then write `PLAN_v1.md` per `../references/plan-artifact-template.md`.
- After each plan version, ask the refinement mode question from the shared workflow — never spawn a reviewer or criticizer unless the user or `Auto-complete` selected it at that question. Default sequence: one `Reviewer` round, then one `Criticizer` round; afterwards the recommended option is `Accept plan for DSH goal execution`. Up to five rounds total, continuing only for high-priority findings or unresolved criticizer questions; surface at most five per round. Then the goal-based execution handoff from the shared workflow.

## Fit

Multi-file changes, architecture boundaries, user-facing workflows, external APIs, dependency upgrades, compatibility risk, or web-evidence-shaped plans. Escalate to `create-a-big-plan` when open-ended, cross-system, strategically ambiguous, or likely beyond ten planning decisions.
