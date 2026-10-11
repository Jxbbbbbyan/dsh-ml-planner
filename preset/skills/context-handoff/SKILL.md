---
name: context-handoff
description: Keep a long session from rotting. Use when the context is approaching its limit, when a task will outlive one session, when switching model or session, when a contradiction appears, after a long tool output, or when resuming work from a previous session. Produces a handoff checklist, externalised decision and event logs, and a resume protocol with a mandatory restatement step.
---

# context-handoff — externalise before you forget

A long session degrades: early facts blur, decisions get re-litigated, and a compaction can summarise away
exactly the detail that mattered. This skill replaces memory with **files**, and replaces re-reading a
transcript with a **restatement step**.

## 0. The two thresholds (they are different things)

| Threshold | What happens | Why separate |
|---|---|---|
| **70 %** of the context window | **You** externalise: write/refresh the handoff, the decision log, the event log, the state snapshot | you choose what to preserve |
| **80 %** of the context window | The harness **compacts automatically** | the harness reclaims space |

Externalise **before** compaction, not after. Compaction keeps only a summary; and a compaction that fails
mid-transaction can leave a lock that blocks later compaction — so the handoff must exist first.

## 1. Trigger conditions — any one of these

- a sub-task completes;
- switching model or session;
- context above 70 %;
- a contradiction appears between records;
- after a long tool output that will not be re-read.

## 2. The externalised file set

| File | Layer | Holds |
|---|---|---|
| `event.log` | **L0** | append-only raw events, one per line: `<ISO time> | <phase> | <event>` |
| `decisions.md` | **L2** | every decision with options offered, the answer, and who chose |
| `todo.md` | L2 | outstanding steps with their done-definitions |
| `state.json` | machine | frozen parameters, flags, sub-agent status |
| `HANDOFF.md` | **L3** | the handoff itself (template in §3) |

**Layering rule.** L0 raw events → L1 turn summaries → L2 phase summaries → L3 handoff. **A higher layer may
only cite a lower layer; it must never overwrite one.** L0 is append-only: never edit a historical line.

## 3. The handoff template (ten sections)

```markdown
# HANDOFF-<task id> <date>

## 0. Meta
- repo / branch / commit:
- environment / dependency lock:
- owner / permissions:
- last checkpoint:

## 1. Goal and acceptance
- goal:
- acceptance criteria:
- non-goals:
- hard constraints:

## 2. Current status
- status: in-progress / blocked / awaiting-verification
- done:
- in progress:
- blocked:

## 3. Key decisions (ADR)
| ID | decision | reason | alternatives | status | source |

## 4. Keyword facts
- file paths:
- interfaces / APIs:
- data tables / fields:
- config / environment variables:
- versions / images / commits:
- commands:
- error codes / logs:

## 5. Tests and evidence
- verification commands:
- actual results:
- log / report locations:

## 6. Open / assumptions / risks
- open:
- assumptions:
- risks:

## 7. Next steps
- [ ] task: input / output / command / definition-of-done

## 8. Rollback plan

## 9. Original-context index
- event.log line numbers / turn numbers / links:

## 10. Handoff confirmation
- successor restatement:
- missing information:
```

## 4. Writing rules (these are what make the file useful)

- **Do not rewrite facts.** Paths, commands, APIs, error codes, versions, config keys, thresholds, and
  decisions are copied **verbatim**.
- **Every conclusion carries a source and a confidence.** Say which turn or which file it came from.
- **Missing information is written as "missing".** Never guess to fill a gap.
- **Preserve contradictions.** If two records disagree, list both and flag it — do not silently pick one.
- **Prefer line-level anchors** (file + line) over prose descriptions.

## 5. The resume protocol (six steps — all six, in order)

1. **Load only** `HANDOFF.md`, `decisions.md`, `todo.md`, and the code files actually needed. **Do not**
   dump the previous transcript into the new session.
2. **Restate first:** goal, acceptance criteria, constraints, current status, next step — in your own words,
   before touching anything.
3. **List what is uncertain or missing.** Reading is allowed; acting is not. Do not start changing code yet.
4. **Run the verification commands recorded in the handoff** and confirm the environment still matches.
5. **Only then** continue the work.
6. **Afterwards, update the handoff, the decision log, and the event log.**

Step 4 is the one that catches the real failures: a dependency that moved, a driver that changed, a file
that no longer exists.

## 6. Compaction prompt (copy this to generate the next handoff)

```text
Compress the following conversation into a HANDOFF. Rules: keep all file paths, commands, APIs, error
codes, versions, config keys, thresholds, decisions and open questions, verbatim — do not paraphrase.
Tag each conclusion with its source turn and a confidence level. Write "missing" for absent information;
do not guess. Output Markdown with: meta, goal/acceptance/non-goals, constraints, current status, decision
record, keyword facts, test evidence, open/assumptions/risks, next steps, rollback, original index.
```

## 7. What this skill does not do

- It does not compress the context by itself. **No keyword-frequency or extractive compression exists in this
  harness** — compaction is a summarisation call, and only the summary survives on the transcript (the raw
  log remains on disk). So the handoff is the only mechanism under your control.
- It does not reduce the system prompt, tool schemas, or the session prefix — compaction cannot shrink those,
  and they count toward pressure.
- It does not make a resumed session equivalent to the original. It makes it **traceable**, which is the
  achievable goal.
