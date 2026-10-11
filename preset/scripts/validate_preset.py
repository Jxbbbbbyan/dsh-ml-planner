#!/usr/bin/env python3
"""Validate the dsh-plans preset structure.

Checks (stdlib only):
- the five SKILL.md files exist and carry a `name` and a non-empty `description`;
- the shared references and the state helper exist;
- the state helper parses and its CLI answers `--help`;
- the composition file parses as YAML and names the expected rows.
"""

from __future__ import annotations

import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

EXPECTED_SKILLS = {
    "create-a-small-plan",
    "create-a-plan",
    "create-a-big-plan",
    "diagnose-before-plan",
    "reference-before-plan",
}

EXPECTED_REFERENCES = {
    "dsh-planning-workflow.md",
    "state-and-config.md",
    "plan-artifact-template.md",
}

EXPECTED_ROWS = {
    "tool-skill",
    "tool-goal",
    "plan-subagents-tool",
    "tool-ask-user",
}


def fail(message: str) -> None:
    print(f"FAIL: {message}", file=sys.stderr)
    global failed
    failed = True


failed = False

# Skills ---------------------------------------------------------------------
for skill in sorted(EXPECTED_SKILLS):
    skill_file = ROOT / "skills" / skill / "SKILL.md"
    if not skill_file.is_file():
        fail(f"missing {skill_file.relative_to(ROOT)}")
        continue
    text = skill_file.read_text(encoding="utf-8")
    if "name: " + skill not in text:
        fail(f"{skill_file.relative_to(ROOT)} frontmatter name mismatch")
    if "description:" not in text:
        fail(f"{skill_file.relative_to(ROOT)} frontmatter missing description")

# References and helper -------------------------------------------------------
for ref in sorted(EXPECTED_REFERENCES):
    if not (ROOT / "skills" / "references" / ref).is_file():
        fail(f"missing skills/references/{ref}")

helper = ROOT / "scripts" / "dsh_plans_state.py"
if not helper.is_file():
    fail("missing scripts/dsh_plans_state.py")
else:
    try:
        subprocess.run(
            [sys.executable, str(helper), "--help"],
            check=True,
            capture_output=True,
            text=True,
        )
    except subprocess.CalledProcessError as error:
        fail(f"dsh_plans_state.py --help failed: {error.stderr.strip()}")
    except OSError as error:
        fail(f"cannot run dsh_plans_state.py: {error}")

# Composition ----------------------------------------------------------------
composition = ROOT / "agent.cordis.yml"
if not composition.is_file():
    fail("missing agent.cordis.yml")
else:
    try:
        import yaml  # type: ignore
    except ImportError:
        print("SKIP: composition YAML check (PyYAML not installed)", file=sys.stderr)
    else:
        try:
            yaml.SafeLoader.add_constructor(
                "tag:yaml.org,2002:js",
                lambda loader, node: "__js_expr__",
            )
            rows = yaml.safe_load(composition.read_text(encoding="utf-8"))
        except yaml.YAMLError as error:
            fail(f"agent.cordis.yml does not parse: {error}")
            rows = None
        if isinstance(rows, list):
            ids = {
                str(row.get("id"))
                for row in rows
                if isinstance(row, dict) and row.get("id") is not None
            }
            for expected in sorted(EXPECTED_ROWS):
                if expected not in ids:
                    fail(f"agent.cordis.yml missing row id {expected!r}")
        elif rows is not None:
            fail("agent.cordis.yml is not a list of rows")

if failed:
    print("preset validation FAILED", file=sys.stderr)
    raise SystemExit(1)
print("preset validation OK")
