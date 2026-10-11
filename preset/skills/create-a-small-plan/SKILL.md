---
name: create-a-small-plan
description: Create a small dsh-plans plan before implementation. Use for small scoped repo changes needing 1 to 3 planning questions and one criticizer refinement pass; exclude direct implementation-only, factual/explanation, trivial command-only, or explicit no-plan requests.
---

# Create A Small Plan

Use this skill when the user wants a compact plan before a repository change.

## DSH Setup

Read `../references/dsh-planning-workflow.md` and `../references/state-and-config.md` — both normative — and follow their setup, state, `language`, and reviewer/criticizer/executor rules. State lives in `dsh-plans/.state/` via `../scripts/dsh_plans_state.py init --workdir <target-workdir>`; spawn reviewer and criticizer roles with the `run_plan_subagent` tool.

## Depth Contract

- Inspect the target repo read-only before the first product question.
- Ask 1 to 3 planning questions, one at a time; standard choice format (recommended first, `Other` second-last, `Auto-complete` last).
- Ask the final scope confirmation, then write `PLAN_v1.md` under the artifact root (normally `dsh-plans/YYYY-MM-DD-topic/`) per `../references/plan-artifact-template.md`.
- After each plan version, ask the refinement mode question from the shared workflow — never spawn a reviewer or criticizer unless the user or `Auto-complete` selected it at that question. Default: exactly one round, recommended mode `Criticizer`; afterwards the recommended option is `Accept plan for DSH goal execution`, then the goal-based execution handoff from the shared workflow.

## Fit

A few local files, clear ownership, low risk, focused verification. Escalate to `create-a-plan` for external API semantics, dependency behavior, compatibility research, cross-module design, or more than three meaningful decisions.
