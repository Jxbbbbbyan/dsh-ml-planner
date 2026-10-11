# State And Config

DSH Plans stores all planning preferences and run state in the target workspace's private state directory `<workdir>/dsh-plans/.state/`. Public planning artifacts live beside it in `<workdir>/dsh-plans/`. The helper keeps `.state/` out of git by ensuring `dsh-plans/.gitignore` contains `.state/` — no other `.gitignore` edits and no git repository are required. The target workspace is the session working directory unless the user explicitly names another directory.

Do not store DSH Plans preferences in DSH settings files. DSH settings remain the host application's configuration; DSH Plans uses `dsh-plans/.state/config.json` for its own state.

## State Root Resolution

- Granularity is **per working directory**: every directory that runs the helper gets its own `dsh-plans/.state/`. State does not travel with clones or copies; committed `dsh-plans/` artifacts persist while each machine rebuilds its private state on first use.
- No git repository is needed and none is created. If the workspace is a repository, the `.gitignore` entry keeps state untracked; if not, the directory simply holds its own state.

## Directory Layout

```text
<workdir>/dsh-plans/
  .gitignore            # generated: contains ".state/"
  YYYY-MM-DD-topic/     # public planning artifacts (commit these)
    DECISIONS.md
    PLAN_v1.md
    PLAN_v1_reviewer_comments.md
    PLAN_v2.md
  .state/               # machine state (never commit)
    config.json
    active.json
    runs/
      <run-id>/
        run.json
        decisions.jsonl
        subagents.jsonl
        refs.jsonl
    tmp/
    cache/
```

Large external references should stay outside the repository by default under `~/.cache/dsh-plans/refs/<repo-slug>/<topic>/`, with metadata recorded in the run state and public artifacts.

## Config Schema

The default config is:

```json
{
  "schema": 1,
  "language": {
    "tag": null,
    "source": "unset",
    "updated_at": null
  },
  "reviewer": {
    "mode": "delegated-subagent",
    "model_selector": null,
    "confirmed_at": null
  },
  "criticizer": {
    "mode": "delegated-subagent",
    "model_selector": null,
    "confirmed_at": null
  },
  "executor": {
    "mode": "goal-loop",
    "model_selector": null,
    "confirmed_at": null
  },
  "artifact_root": "dsh-plans"
}
```

Rules:

- `schema` must be `1`.
- `language.tag` is a BCP47-style tag such as `zh-Hans`, `en`, or `zh-Hant`, or `null` before selection.
- `language.source` is `user`, `auto`, or `unset`.
- `reviewer.mode` and `criticizer.mode` are `delegated-subagent` or `current-session`.
- `executor.mode` is always `goal-loop`; the helper rejects mode edits for the executor. Execution is the DSH goal loop in the current session, never a detached engine.
- `model_selector` is `null` to inherit the current session model, or an exact model selector the user provided.
- `confirmed_at` is `null` until the user has confirmed the role's model at first use; see below.
- `artifact_root` is relative to the target workspace unless absolute.
- Unknown keys may be preserved, but do not rely on them for protocol decisions.

## Language Setting

Before the first product planning question, check the persisted config. If `language.tag` is missing or invalid, ask exactly one language choice prompt:

1. `zh-Hans` - recommend when more than 60 percent of the user's natural-language planning request is Simplified Chinese.
2. `en` - recommend when the request is mostly English or mixed without a Chinese majority.
3. `zh-Hant` - use Traditional Chinese.
4. `Other` - user provides a BCP47-style tag.
5. `Auto-complete` - select the recommended language.

Persist the result immediately:

```bash
python3 ../scripts/dsh_plans_state.py set-language --workdir <workdir> --tag <tag> --source user
```

(`--source auto` only when `Auto-complete` produced the answer.) Use the selected language for visible planning questions, answer choices, review summaries, criticizer questions, and Markdown artifacts. Keep IDs, file paths, command names, JSON keys, and protocol labels stable in English.

## Role Settings

Before running a reviewer or criticizer, read the role setting from the persisted config.

If the role's `mode` is missing or invalid, ask exactly one mode choice prompt and persist the answer:

1. `Delegated subagent` - recommended; runs a child session with isolated context via `run_plan_subagent`.
2. `Current session` - run the read-only review or criticism in the current foreground session.
3. `Other` - user provides a different role setting.
4. `Auto-complete` - select the recommended delegated subagent.

Independently, each role's **model** is confirmed once, at that role's first actual use: when `confirmed_at` is `null` and the role is about to run, ask exactly one model confirmation prompt and persist the answer:

1. `Inherit the current session model` - recommended default; stores `model_selector: null`.
2. `Choose a model` - the user supplies the exact model selector; DSH exposes no model-listing tool, so present the model names the user can read from the session's model selector UI (settings), and persist exactly what the user typed. Do not invent model names.
3. `Other` - user provides a different choice.
4. `Auto-complete` - select inherit.

Persist through the helper, which stamps the confirmation:

```bash
python3 ../scripts/dsh_plans_state.py set-role --workdir <workdir> --role <role> --model-selector <selector-or-inherit> --confirmed
```

`confirmed_at` is set only by this confirmation flow. Other `set-role` changes preserve it, and omitted flags keep stored values, so a mode-only edit never forges or discards a confirmation. A confirmed inherit is stored as `model_selector: null, confirmed_at: <timestamp>` and is distinguishable from never-confirmed.

If a persisted selector later fails at spawn time (`run_plan_subagent` reports the requested model is unavailable, unauthenticated, or expired), reset the marker and re-ask the confirmation prompt:

```bash
python3 ../scripts/dsh_plans_state.py set-role --workdir <workdir> --role <role> --reset-confirmation
```

## Spawning Role Subagents

When `mode` is `delegated-subagent`, spawn with the `run_plan_subagent` tool:

- `description`: a short label such as `<run-id>-reviewer` or `<topic>-review-a`.
- `prompt`: the complete, self-contained brief. It must say: perform read-only analysis; do not edit target files; write NO files at all (the parent writes artifacts); return a concise findings report as the final answer.
- `model`: pass the persisted selector only when it is not `null`; omit the parameter to inherit the session model.

The tool runs in the foreground and returns the child's final report; it also denies the child write tools, goal tools, user questions, and delegation tools, so read-only discipline is enforced structurally. The parent records every spawn:

```bash
python3 ../scripts/dsh_plans_state.py record-subagent --workdir <workdir> --run-id <run-id> \
  --role <reviewer|criticizer> --label <label> --model <selector-or-inherit> --status <status>
```

Record the child's result status (`completed`, `failed`, …) after it settles.

## Run State

Create one run directory per planning request:

```text
<workdir>/dsh-plans/.state/runs/<YYYYMMDDTHHMMSSZ-topic>/
```

Run ids are second-precision; the helper appends `-2`, `-3`, ... on collision instead of failing.

`run.json` should include:

- run ID;
- skill name;
- original request;
- target workspace;
- artifact directory;
- language tag;
- status;
- timestamps.

`decisions.jsonl` records every planning question, answer, answer source, and linked artifact ID. `subagents.jsonl` records reviewer and criticizer child runs. `refs.jsonl` records reference metadata for `reference-before-plan`.
