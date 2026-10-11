---
name: reference-before-plan
description: Research references before creating a dsh-plans plan. Use when repo-change planning needs downloaded projects, articles, papers, docs, per-reference analysis, adoption questions, language settings, and reviewer or criticizer subagents; exclude direct implementation-only, factual/explanation, trivial command-only, or explicit no-plan requests.
---

# Reference Before Plan

Use this skill when external references must shape the plan before implementation.

## DSH Setup

Read `../references/dsh-planning-workflow.md` and `../references/state-and-config.md` — both normative — and follow their setup, state, `language`, and reviewer/criticizer/executor rules. State lives in `dsh-plans/.state/` via `../scripts/dsh_plans_state.py init --workdir <target-workdir>`; spawn reviewer and criticizer roles with the `run_plan_subagent` tool.

## Required Reference Flow

1. Inspect the target Git repo read-only before external research so search terms match the actual codebase and constraints.
2. Create the `dsh-plans/.state` run state and planning artifact directory once the topic is clear.
3. Search proactively for related projects, articles, papers, docs, and prior art. Prefer the `web_search` tool; use tools such as `gh` only when already available.
4. Download or clone at least 3 credible references before writing `PLAN_v1.md`; store large downloads outside the target repo under `~/.cache/dsh-plans/refs/<repo-slug>/<topic>/`. Landing pages, README-only snapshots, abstracts, package metadata, or curl-only fragments do not count when deeper source material is available.
5. For every reference, record source metadata and local path in `REF_ANALYSIS.md` and `dsh-plans/.state/runs/<run-id>/refs.jsonl`: title, URL, kind, retrieval method, date accessed, local path, coverage, and evidence gaps.
6. For every reference, produce a structured analysis artifact before asking adoption questions. If a code-graph tool the workspace already uses is available, generate its JSON beside the local reference and record the path. If none is available, do a manual structured read and record the waiver in `REF_ANALYSIS.md`.
7. For every reference after analysis, ask at least 3 ref-specific adoption questions before using its ideas in `PLAN_v1.md`; each based on downloaded content, recommended option first, `Other` second-last, `Auto-complete` last.
8. Block rather than pad if fewer than 3 credible references exist, unless the user explicitly narrows the topic or waives the minimum. `Auto-complete` cannot grant this waiver.
9. Continue with big-plan depth: at least 10 planning questions, required web research during brainstorming and refinement, no refinement limit, at most five high-priority comments or questions per refinement round.

## REF_ANALYSIS.md

Include: original request and repo evidence that shaped the search; attempted queries and selection criteria; references selected and rejected; local download paths; structured analysis or graph JSON paths; adoption questions and recorded answers; accepted ideas, rejected ideas, and reasons; evidence gaps and user-granted waivers; language, reviewer, criticizer, and executor settings used.

Reference ideas are not eligible for `PLAN_v1.md` until their adoption question answers are recorded.
