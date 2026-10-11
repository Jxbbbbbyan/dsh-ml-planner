# PLAN_vN - <topic>

Status: draft | reviewed | accepted
Plan version: N
Artifact directory: `dsh-plans/YYYY-MM-DD-topic/`
State directory: `dsh-plans/.state/runs/<run-id>/`
Language: `<BCP47 tag>`

## Original Request

Summarize the user's request in one paragraph.

## Goals

- `G-001`: Goal statement.

## Non-Goals

- `NG-001`: Explicitly excluded work.

## Workspace State

- `STATE-001`: `dsh-plans/.state/config.json` language, reviewer, criticizer, and executor settings used for this run.
- `STATE-002`: `dsh-plans/.state/runs/<run-id>/run.json` and linked decision/subagent ledgers.

## Repo Evidence

- `E-REPO-001`: Path or command inspected, what it proves, and any uncertainty.

## External Evidence

- `E-EXT-001`: URL or local ref path, what it supports, and date accessed.

## Resolved Decisions

- `D-001`: Question, chosen answer, answer source, and rationale.

## Requirements

- `R-001`: Requirement tied to goals and decisions.

## Constraints

- `C-001`: Compatibility, style, interface, performance, safety, or ownership constraint.

## Implementation Items

- `I-001`: Work item with affected paths, dependencies, and expected code or doc changes.

## Acceptance Criteria

- `AC-001`: Observable result tied to one or more requirements.

## Verification Plan

- `V-001`: Command, manual check, screenshot, log review, or static inspection required after implementation.

## Verifier Checklist

- [ ] `VC-001` covers `I-001`; pass condition: describe pass condition; evidence: describe expected evidence; metric: threshold or reason not quantified.

## Risks And Mitigations

- `Risk-001`: Risk and mitigation.

## Refinement Settings

- Reviewer mode: `delegated-subagent | current-session`; model selector: `inherit | <selector>`.
- Criticizer mode: `delegated-subagent | current-session`; model selector: `inherit | <selector>`.

## DSH Goal Execution Handoff Notes

State anything the executor should know, including order of work, files to avoid, and verification commands. Execution still requires the explicit handoff question and must not offer `Auto-complete`. On approval, execution runs as a DSH goal whose objective references this plan file and this verifier checklist — keep this section concise enough to fold into the `create_goal` objective. The goal is completed with `update_goal` action complete only after every verifier checkbox passes.

## Revision Ledger

- `PLAN_v1`: Initial plan from resolved questions and evidence.
