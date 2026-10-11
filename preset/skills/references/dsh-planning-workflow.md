# DSH Planning Workflow

This reference is shared by the `dsh-plans` skills. It is a planning workflow only. Implementation after acceptance uses normal DeepSeek Harness behavior, driven by a DSH goal.

## Required DSH Context

This skill set is written for the DeepSeek Harness behaviors its preset composes:

- Skills are loaded with the `skill` tool. Each skill announces its own base directory; shared references live at `../references/` and helper scripts at `../scripts/` relative to a skill's base directory. Read them with the `read` tool.
- Shell runs through the `bash` tool. Every call is a fresh shell: no state persists between calls, so pass absolute paths or `workdir` explicitly.
- Planning questions are asked through the `ask_user_question` tool: one question per call, choices rendered as labeled options. A question with no `options` is free text.
- Reviewer and criticizer subagents are spawned with the `run_plan_subagent` tool (foreground, returns the child's final report). It accepts an optional `model` selector; it denies the child write tools, goal tools, user questions, and delegation tools automatically.
- Web research uses the `web_search` tool; cite sources in the plan.
- Execution after handoff runs as a DSH goal: `create_goal`, `get_goal`, `update_goal`. The goal loop re-prompts the session across turns until `update_goal` complete.
- `todo_write` tracks implementation items during the goal-driven execution phase — never during planning itself.
- `dsh-plans` presets disable built-in plan mode: the workflow below is the planning discipline, and its `PLAN_vN.md` artifacts are the reviewable plans.

## Planning Boundary

- Treat the user's request as a planning target, not as write authorization.
- Before the explicit execution handoff, do not edit target source files, docs, configs, package metadata, generated assets, or tests outside the planning artifact directory and the dsh-plans state.
- The normal pre-handoff writes are `dsh-plans/.state/` state plus planning artifacts in `dsh-plans/YYYY-MM-DD-topic/`.
- Large downloaded references belong outside the target repository by default, under `~/.cache/dsh-plans/refs/<repo-slug>/<topic>/`; record their paths and evidence in `REF_ANALYSIS.md`.
- After the user explicitly approves execution, leave this planning workflow and execute as a DSH goal (see DSH Goal Execution Handoff).

## State And Settings

Before the first planning question, read `../references/state-and-config.md` and initialize the target workspace state. State lives in `<workdir>/dsh-plans/.state/` (kept out of git by the helper) and artifacts in `<workdir>/dsh-plans/`. The target workspace is the session working directory unless the user explicitly names another directory.

Use the helper script from the skill set:

```bash
python3 ../scripts/dsh_plans_state.py init --workdir <target-workdir>
```

If language is missing from the workspace's `dsh-plans/.state/config.json`, ask the language setting question before any product question. Persist the answer; this language question does not count against the planning-question limit.

Use `dsh-plans/.state/config.json` for reviewer, criticizer, and executor settings. If a role's `mode` is missing or invalid, or its `confirmed_at` is `null` when the role is about to run, ask the matching role-setting or model-confirmation question from `../references/state-and-config.md`, persist the answer, and then spawn or run the selected role.

## First-Turn Contract

1. Inspect the target repository read-only before asking product questions. Prefer `rg` when available, then ordinary focused file reads, `git status`, `git log`, existing tests, and user-provided logs.
2. If a question can be answered from the repo, answer it from evidence instead of asking the user.
3. After required language setup, the first user-facing planning response must be one choice question, not a completed plan or implementation.
4. Ask one question per message. Do not batch multiple decisions into one prompt.

## Evidence Ladder

Resolve unknowns in this order:

1. Codebase evidence.
2. Cited web or reference evidence.
3. User choice.

When the recommended option depends on a web-verifiable claim, search first and cite the source in the eventual plan. Do not present a recommendation backed only by an unchecked assumption.

## Choice Prompt Format

Every user-facing planning or refinement question is a numbered choice prompt:

1. Recommended option, with a short concrete reason.
2. Other real alternatives, each with the tradeoff that matters.
3. `Other` for free-form input, second-last.
4. `Auto-complete`, last.

`Auto-complete` may choose the recommended planning or refinement option. It must never approve goal execution, destructive cleanup, install waivers, publishing, deployment, merge, push, credential use, or anything that changes external state.

## Required Artifact Directory

Create a run directory only after initial read-only inspection makes the topic clear. The default public artifact path is:

```text
dsh-plans/YYYY-MM-DD-topic/
```

The matching private state path is:

```text
dsh-plans/.state/runs/<run-id>/
```

Use a short lowercase slug for `topic`. Keep paths stable once written. The helper stores the active run pointer in `dsh-plans/.state/active.json`.

Create or update `DECISIONS.md` in the artifact directory and `decisions.jsonl` in the private run state. Record:

- original request;
- repository evidence inspected;
- each question asked;
- options presented;
- selected answer and whether it came from the user or `Auto-complete`;
- assumptions still open;
- external sources consulted;
- language, reviewer, criticizer, and executor settings used.

## Final Scope Confirmation

Before writing `PLAN_v1.md`, ask the mandatory final scope confirmation. It does not count against the skill's planning-question limit.

Recommended prompt shape:

1. `No more requirements` - the scope is ready for `PLAN_v1.md`.
2. `Add more requirements` - capture additional constraints before drafting.
3. `Other`.
4. `Auto-complete`.

If the user adds requirements, resolve only the necessary follow-up questions, then repeat the final scope confirmation before writing `PLAN_v1.md`.

## Plan Artifact Requirements

Every `PLAN_vN.md` must include stable IDs that are never recycled across revisions:

- goals and non-goals;
- requirements and constraints;
- implementation items;
- affected paths or ownership boundaries;
- dependencies and sequencing;
- risks and mitigations;
- acceptance criteria;
- verification steps;
- repo evidence and external evidence;
- resolved decisions;
- revision ledger.

Every plan version must include a dedicated `## Verifier Checklist` section. Each checklist item is a Markdown checkbox and includes:

- criterion ID;
- covered implementation item IDs;
- pass condition;
- expected evidence;
- a metric threshold, or a short reason the criterion is not quantified.

Use `../references/plan-artifact-template.md` when drafting a plan.

## Refinement

After each plan version, ask one refinement mode question. The recommended (first) option follows the skill level's default sequence; the user may always pick a different mode or keep refining:

- `create-a-small-plan`: recommend `Criticizer` for the first (and only default) round; at the next refinement question, recommend `Accept plan for DSH goal execution`.
- `create-a-plan`: recommend `Reviewer` for the first round, then `Criticizer` for the second; at the next refinement question, recommend `Accept plan for DSH goal execution`.
- `create-a-big-plan`: recommend `Reviewer` for the first round as three concurrent independent reviewers (see below), then `Criticizer` for the second; at the next refinement question, recommend `Accept plan for DSH goal execution`.

The question format is:

1. The recommended option from the level's sequence above.
2. The other refinement modes, each with the tradeoff that matters.
3. `Accept plan for DSH goal execution` - stop planning and move to the explicit execution handoff (this is itself the recommended option once the level's sequence is complete).
4. `Auto-complete`.

If the user selects `Reviewer` or `Criticizer`, apply the persisted role settings from `dsh-plans/.state/config.json`. The recommended role mode is `delegated-subagent`, which uses the `run_plan_subagent` tool. `current-session` is available when the user explicitly prefers it or subagent spawning is unavailable.

Reviewer output should record findings with IDs, severity, affected plan IDs, evidence, impact, recommended fix, and disposition. Revise the next plan only for findings that are accepted with evidence.

### Concurrent Reviewers (big plans)

A big-plan reviewer round spawns three independent reviewer subagents so blind spots do not correlate:

- Make three `run_plan_subagent` tool calls in ONE assistant message. Each gets a distinct short description (for example `<topic>-review-a`, `-b`, `-c`) and the same read-only reviewer brief, but is instructed to form its own priorities independently.
- Each reviewer returns its findings in its final report; it writes no files (write tools are denied by the tool).
- After all three settle, the main agent merges and dedupes their findings into one consolidated `PLAN_vN_reviewer_comments.md`, keeping each finding's source reviewer, severity, evidence, and disposition, and surfaces at most five high-priority comments to the user.
- Treat agreement between independent reviewers as stronger evidence, not as authority; every accepted finding still needs repo or reference evidence.

Criticizer output should ask up to five adaptive questions per round. Before presenting a criticizer question, summarize the original criticism in at most three sentences and highlight the most important point. Do not revise the plan until every criticizer question has a recorded answer or an `Auto-complete` answer.

### Round Lifecycle

A refinement round's results are complete when every spawned reviewer has replied (three for big plans) or, for a criticizer round, when every question has a recorded or `Auto-complete` answer. In the same turn, the main agent must:

1. Consolidate the results (merge reviewer findings; collect criticizer answers).
2. Accept or reject each finding on repo or reference evidence and record dispositions; acceptance is the main agent's evidence-based call, and the user may override any disposition.
3. Revise the plan (`PLAN_v(N+1).md`) when accepted items require it.
4. Immediately ask the next refinement mode question — recommended: the next step in the level's sequence, or `Accept plan for DSH goal execution` once the sequence is complete.

Never end a turn merely because a round completed. The only user-waiting points are the refinement mode question itself and unanswered criticizer questions.

To revise a plan, copy `PLAN_vN.md` to `PLAN_v(N+1).md`, edit only the new version, and update the revision ledger plus verifier checklist.

## DSH Goal Execution Handoff

After the plan is accepted or refinement converges, ask an explicit execution handoff question without `Auto-complete`:

1. `Execute this plan now as a DSH goal`.
2. `Stop after planning`.
3. `Other`.

If approved, stop applying this planning workflow and connect execution to the DSH goal loop:

- Call `get_goal` first. Corner case: if a goal is still pending (active or paused), do not create or replace a goal — the executor simply implements the plan with normal DSH tools and no goal tracking. A completed goal may be replaced by the new one.
- If the executor role's `confirmed_at` is `null`, ask the executor model confirmation question from `../references/state-and-config.md` before creating the goal. The goal loop runs in the CURRENT session, so the confirmed executor model is the session model: when the user picks a specific model that differs from the current session model, ask them to switch the session model in the model selector before answering the handoff question, then proceed.
- Start execution with `create_goal(objective)`. The objective is a compact brief: the absolute path of the accepted `PLAN_vN.md`, an instruction to implement its implementation items in dependency order, the verification commands to run, and the requirement that every `## Verifier Checklist` box passes before calling `update_goal` complete. Set `max_goal_rounds` only when the user explicitly requested a round cap.
- The goal loop re-prompts the session across turns until `update_goal` complete arrives, so execution persists instead of ending with the first reply. The executor is the current session using normal DSH tools; do not create a separate execution engine.
- During goal rounds, track implementation items with `todo_write` in dependency order.
- When the plan is fully implemented and verified, call `update_goal` with action complete and report the result.
- If a blocking condition persists across at least three consecutive goal rounds, call `update_goal` with action blocked and report the concrete blocking condition; do not mark blocked for difficulty or uncertainty.

### Execution Discipline: ponytail and MVP tests

Execute with `ponytail` discipline so token consumption stays controlled:

- For each implementation item, climb the ponytail ladder before writing anything: does it need to exist at all; is it already in this codebase; is it in the standard library; is it a native platform feature; is an already-installed dependency; is it one line. Take the highest rung that holds, and mark deliberate simplifications with a `# ponytail: <ceiling>, <upgrade path>` comment instead of building the full version speculatively.
- Keep tests to the MINIMUM set that proves the core logic works:
  1. You are building the MINIMUM test set that proves the core logic works — nothing else.
  2. Trivial one-liners (getters, pure field access, simple passthrough wrappers): WRITE NO TEST at all.
  3. Non-trivial logic (branches, parsing, money/security/critical path): write EXACTLY ONE minimal check — one assert, one `main()` self-check, or one tiny `test_*.py`/`it(...)` block. Red light = broken; green light = enough.
  4. Prefer reusing an existing test runner in the repo. If none exists and it is MVP, a `if __name__ == "__main__": assert ...` or a single script is acceptable instead of installing a framework.
  5. When unsure whether a test is needed: SKIP it, and emit one line: `[test skipped: <name>, add when <trigger condition>]`.
- Gate `update_goal` complete on every `## Verifier Checklist` box passing, with the evidence the checklist asked for.

## Red Flags

Stop and return to the workflow if any of these happen:

- implementing before the explicit execution handoff;
- spawning a reviewer or criticizer without first asking the refinement mode question;
- ending a turn after a completed refinement round without asking the next refinement mode question;
- storing planning settings outside the target workspace's `dsh-plans/.state/` directory;
- asking multiple planning questions in one message;
- asking a planning or refinement question without `Other` second-last and `Auto-complete` last;
- writing `PLAN_v1.md` before final scope confirmation;
- accepting vague answers that contradict repo or reference evidence;
- treating a reviewer, criticizer, or verifier subagent as authority instead of evidence;
- offering `Auto-complete` for goal execution, install, deploy, merge, push, or destructive cleanup approval.
