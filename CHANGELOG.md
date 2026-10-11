# Changelog

All notable changes to this project are documented in this file.
本文件记录本项目的重要变更。

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-10-12

First published release. / 首次发布。

### Added

- **Repository layout** — `preset/` carries the installable DSH agent preset verbatim
  (36 files); `scripts/` holds the install and verification tooling; `docs/` holds the
  documentation; `examples/` holds a filled-in ML brief.
- **Preset** — the `ml-planner` agent preset: the dsh-plans planning workflow (5 planning skills,
  PLAN artifacts, reviewer/criticizer rounds, explicit handoff to goal execution) plus the
  machine-learning skill `ml-modeling-plan` and its 14 reference documents, including
  `ml-discipline-rules.md`.
- **`ml-discipline-rules.md`** — 94 pipeline rules organised by stage P0–P10
  (**85 `MUST` + 9 `SHOULD`**; P0 6 / P1 10 / P2 11 / P3 7 / P4 7 / P5 9 / P6 12 / P7 10 /
  P8 7 / P9 7 / P10 8; by category DIAG 19 / SCOPE 16 / METRIC 13 / ENG 11 / LEAK 11 /
  EVIDENCE 10 / REPRO 7 / BASE 7). Every rule carries a mechanism, an engineering landing
  instruction, a machine-checkable verdict, the consequence of violating it, and corpus
  counter-examples with a source key. (Counts verified by counting rule headings, not copied
  from a summary.)
- **`scripts/install.ps1` / `scripts/install.sh`** — install `preset/` into a DSH agent-presets
  directory. An existing installation is never overwritten unless `-Force` / `--force` is given,
  and a forced upgrade keeps a timestamped backup first.
- **`scripts/verify.ps1`** — runs the three bundled validators and prints each one's real exit
  code: `validate_preset.py`, `selftest.mjs`, `verify_integrity.py`. It verifies the installed copy
  by default, states on every run which copy it is testing, and falls back to the repository's own
  `preset/` directory when nothing is installed — so a fresh clone can be verified before
  installing (and it reports a non-zero exit code only when a validator really fails).
- **`scripts/push-to-github.ps1`** — creates the GitHub repository when a token is available,
  sets the topics, and pushes the branch plus tags. Without a token it still attempts a plain
  `git push` (Git Credential Manager usually holds the credential), and on failure prints the
  one-click repository-creation URL and the exact command to re-run.
- **`.gitattributes`** — repo-authored files are normalised to LF; `preset/**` is marked `-text`
  so the preset bytes ship unchanged (five of them are CRLF upstream and are hash-verified).
- **`.gitignore`** — excludes DSH runtime state (`.state/`), `__pycache__/`, `node_modules/`,
  `*.log`, and a local-only `ignored-skills/` scratch directory.
- **`LICENSE`** — MIT.

### Changed

- **`preset/scripts/verify_integrity.py`** — one of the three preset files that deliberately differ
  from the upstream original, in three ways, all of them required for the repository to be usable
  after a fresh clone:
  1. the two hard-coded personal absolute paths (`--preset`, `--source` defaults) were replaced by
     auto-location: `--preset` now defaults to the preset directory that contains this script's
     parent, and `--source` defaults to empty. A bare clone can run the verifier with no
     arguments.
  2. the three levels now distinguish PASS / FAIL / SKIP. A level that is not applicable (the
     upstream `router-planner` baseline preset is not shipped here) prints `SKIP (no upstream
     baseline)` and does not affect the exit code; a level that is not applicable is never
     reported as a pass. Only a real comparison failure returns non-zero.
  3. the crash on non-UTF-8 consoles was fixed: the composition file carries CJK text and arrows
     such as U+21D2, and printing one raised `UnicodeEncodeError` under a GBK code page, which
     killed a run that would otherwise have reported its verdict. Output streams now use
     `errors="replace"` and the remaining non-ASCII literals were made ASCII.
  The L1 file/label matching was also made path-keyed instead of positional, so it compares the
  files the manifest actually names instead of whichever file happens to sort into the same slot.

- **`preset/skills/ml-modeling-plan/references/ml-pipeline-and-invocation.md`** — the second
  deliberate deviation, an **editorial cleanup** applied for publication. The file is not in the
  integrity manifest's L1 table and is not a `pure-copy` row, so no guarded byte changes:
  1. five author-machine absolute paths (`C:\Users\...`, `D:\miniconda3\...`) were replaced by
     placeholders (`<USERPROFILE>\...`) or environment-independent wording. Two of them documented
     `verify_integrity.py`'s *old* hard-coded defaults, which the fix above made obsolete, so
     leaving them in place would have been actively wrong.
  2. `scripts/vtu_to_tensor.py` belongs to the finite-element preset `fem-ml-planner` and is not
     shipped here. The document now says so at every mention (pipeline-figure note, §4 preamble,
     §4.5 heading, §6.1 and §8) instead of telling the reader that both presets share one script
     set — a reader no longer goes looking for a file that does not exist.
  3. the self-test count was stated as 46 in three places; the measured value is **45**
     (45 PASS / 0 FAIL), so all three now read 45.
- **`preset/skills/ml-modeling-plan/references/preset-integrity-manifest.md`** — a new
  append-only addendum records the cleaned file's current bytes and sha256
  (60,098 B / `c14bdaa5b471b693b242b291d1b7b0560868a4eba49a86958ef41e24648b7f2a`) and states that L1
  and L2 are unaffected. The generator-time L3 table and the earlier addenda are left untouched, per
  the file's own append-only discipline.

### Not included

Deliberately out of scope for this repository (the published set is ML planning only):

- `skills/chatgpt-sidebar-bridge/SKILL.md`, `skills/chatgpt-sidebar-delivery/SKILL.md`,
  `skills/gui-input-hard-rules/SKILL.md` — browser-sidebar delivery and native GUI automation.
  Removing them does not affect the preset: `agent.cordis.yml` discovers skills through
  `customSkillDirs: skills/` and never names them, `validate_preset.py` checks only the five
  planning skills, and `selftest.mjs` imports only `router-planner-core.mjs`,
  `router-planner-bootstrap.mjs` and `lib/plan-subagents.js`. Verified by running both validators
  on the reduced preset: `validate_preset.py` exits 0 and `selftest.mjs` reports 45 PASS / 0 FAIL.
- `scripts/vtu_to_tensor.py` — a VTU (finite-element visualisation) reader, part of the separate
  FEM preset, not of ML planning.
- The `fem-ml-planner` preset itself.

### Verification status at release

Measured on the release commit, all from a fresh `git clone` into a temporary directory, then
`scripts/install.ps1 -Target <temp>` and the three validators against that temporary install:

| validator | result |
|---|---|
| `validate_preset.py` | exit 0 — `preset validation OK` |
| `selftest.mjs` | exit 0 — 45 PASS / 0 FAIL |
| `verify_integrity.py` (portable mode) | exit 0 — manifest 17 rows hashing to the recorded fingerprint; L2 pure copies identical 11/11; L1 and the L2' deleted-lines guard reported `SKIP (no upstream baseline)` |

- Manifest fingerprint: `e17fc1907bc75db7e7992459afab4c67cec832f6fcf065c107f03917fa79db22`
  (recomputed from the manifest's own rows; this is a snapshot for v0.1.0, the manifest stays the
  single source of truth).
- `preset/` is byte-identical to the upstream preset for **33 of its 36 files**. All three
  deliberate exceptions are listed under **Changed** above: two content changes
  (`verify_integrity.py`, `ml-pipeline-and-invocation.md`) and the integrity manifest, which only
  records the second one.
- No npm dependencies: the preset ships no `package.json`, so the Node modules run on a bare
  Node.js install. Python side is standard library only (`validate_preset.py` additionally uses
  `PyYAML` when present and skips the composition check when it is not).

### Provenance

- The planning workflow derives from [Optim-Agent/dsh-plans](https://github.com/Opt-Agent/dsh-plans).
- The routing layer derives from the `router-standard` preset of
  [yjh051108/dsh-routing-suite](https://github.com/yjh051108/dsh-routing-suite), customised here.
- The command set was verified against first-party sources (papers, official documentation,
  source code) rather than second-hand summaries; where a claim rests on the curated corpus of
  researched articles, the rule carries the source key inline.

[0.1.0]: https://github.com/Jxbbbbbyan/dsh-ml-planner/releases/tag/v0.1.0
