#!/usr/bin/env python3
"""Manage dsh-plans workspace state under <workdir>/dsh-plans/.state/.

dsh-plans adapts the prime-plans workflow (https://github.com/Optim-Agent/prime-plans)
to the DeepSeek Harness. Public planning artifacts live in the committed
`<workdir>/dsh-plans/` directory; machine state lives beside them in the
private `<workdir>/dsh-plans/.state/` directory, which `init` keeps out of git
by ensuring `dsh-plans/.gitignore` contains `.state/`. No git repository is
required and none is created: state is simply per working directory.

The script is standard-library Python and intentionally small; the agent runs
it through the bash tool. `show` is strictly read-only.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
from pathlib import Path
from typing import Any

ARTIFACT_DIRNAME = "dsh-plans"
PRIVATE_DIRNAME = ".state"
SLUG_RE = re.compile(r"[^a-z0-9]+")

DEFAULT_CONFIG: dict[str, Any] = {
    "schema": 1,
    "language": {
        "tag": None,
        "source": "unset",
        "updated_at": None,
    },
    "reviewer": {
        "mode": "delegated-subagent",
        "model_selector": None,
        "confirmed_at": None,
    },
    "criticizer": {
        "mode": "delegated-subagent",
        "model_selector": None,
        "confirmed_at": None,
    },
    "executor": {
        "mode": "goal-loop",
        "model_selector": None,
        "confirmed_at": None,
    },
    "artifact_root": ARTIFACT_DIRNAME,
}

VALID_ROLES = {"reviewer", "criticizer", "executor"}
VALID_ROLE_MODES = {"delegated-subagent", "current-session"}


def utc_now() -> str:
    return (
        dt.datetime.now(dt.timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


def normalize_workdir(value: str) -> Path:
    return Path(value).expanduser().resolve()


def artifact_root_for(workdir: Path, config: dict[str, Any]) -> Path:
    root = Path(config.get("artifact_root", ARTIFACT_DIRNAME))
    return root if root.is_absolute() else workdir / root


def state_root_for(workdir: Path, config: dict[str, Any]) -> Path:
    return artifact_root_for(workdir, config) / PRIVATE_DIRNAME


def atomic_write_json(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(
        json.dumps(data, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    tmp.replace(path)


def deep_merge_defaults(data: dict[str, Any], defaults: dict[str, Any]) -> dict[str, Any]:
    merged = dict(data)
    for key, value in defaults.items():
        if key not in merged:
            merged[key] = value
        elif isinstance(value, dict) and isinstance(merged[key], dict):
            merged[key] = deep_merge_defaults(merged[key], value)
    return merged


def load_config(state: Path) -> dict[str, Any]:
    path = state / "config.json"
    if not path.exists():
        return json.loads(json.dumps(DEFAULT_CONFIG))
    data = json.loads(path.read_text(encoding="utf-8"))
    return deep_merge_defaults(data, DEFAULT_CONFIG)


def ensure_gitignored(artifact_root: Path) -> None:
    """Keep `.state/` out of git without touching anything else."""
    ignore = artifact_root / ".gitignore"
    entry = PRIVATE_DIRNAME + "/"
    raw = ""
    if ignore.exists():
        raw = ignore.read_text(encoding="utf-8")
        if any(line.strip().rstrip("/") == PRIVATE_DIRNAME for line in raw.splitlines()):
            return
    raw_ends_with_newline = raw.endswith("\n")
    with ignore.open("a", encoding="utf-8") as handle:
        if ignore.exists() and not raw_ends_with_newline:
            handle.write("\n")
        handle.write(f"# dsh-plans machine state; never commit\n{entry}\n")


def _ensure(workdir: Path) -> tuple[dict[str, Any], Path]:
    config = load_config(workdir / ARTIFACT_DIRNAME / PRIVATE_DIRNAME)
    artifact_root = artifact_root_for(workdir, config)
    state = state_root_for(workdir, config)
    artifact_root.mkdir(parents=True, exist_ok=True)
    state.mkdir(parents=True, exist_ok=True)
    for sub in ("runs", "tmp", "cache"):
        (state / sub).mkdir(parents=True, exist_ok=True)
    ensure_gitignored(artifact_root)
    atomic_write_json(state / "config.json", config)
    return config, state


def ensure_state(workdir: Path) -> dict[str, Any]:
    return _ensure(workdir)[0]


def show_state(workdir: Path) -> dict[str, Any]:
    state = workdir / ARTIFACT_DIRNAME / PRIVATE_DIRNAME
    config_file = state / "config.json"
    if not config_file.is_file():
        raise SystemExit(
            "no dsh-plans state found; run `dsh_plans_state.py init` first"
        )
    return load_config(state)


def set_language(workdir: Path, tag: str, source: str) -> dict[str, Any]:
    if source not in {"user", "auto"}:
        raise SystemExit("--source must be user or auto")
    config, state = _ensure(workdir)
    config["language"] = {
        "tag": tag,
        "source": source,
        "updated_at": utc_now(),
    }
    atomic_write_json(state / "config.json", config)
    return config


def set_role(
    workdir: Path,
    role: str,
    mode: str | None,
    model_selector: str | None,
    confirmed: bool,
    reset_confirmation: bool,
) -> dict[str, Any]:
    if role not in VALID_ROLES:
        raise SystemExit("--role must be one of " + ", ".join(sorted(VALID_ROLES)))
    if mode is not None and role == "executor":
        raise SystemExit(
            "--mode is not valid for the executor role; execution always runs as "
            "the DSH goal loop in the current session"
        )
    if mode is not None and mode not in VALID_ROLE_MODES:
        raise SystemExit(f"--mode must be one of {sorted(VALID_ROLE_MODES)}")
    if confirmed and reset_confirmation:
        raise SystemExit("--confirmed and --reset-confirmation are mutually exclusive")
    config, state = _ensure(workdir)
    role_config = dict(config.get(role, {}))
    for key, value in DEFAULT_CONFIG[role].items():
        role_config.setdefault(key, value)
    if mode is not None:
        role_config["mode"] = mode
    if model_selector is not None:
        role_config["model_selector"] = (
            None if model_selector == "inherit" else model_selector
        )
    if confirmed:
        role_config["confirmed_at"] = utc_now()
    if reset_confirmation:
        role_config["confirmed_at"] = None
    config[role] = role_config
    atomic_write_json(state / "config.json", config)
    return config


def slugify(topic: str) -> str:
    slug = SLUG_RE.sub("-", topic.lower()).strip("-")
    return slug[:80] or "planning-run"


def start_run(workdir: Path, topic: str, skill: str, request_text: str) -> dict[str, Any]:
    config, state = _ensure(workdir)
    now = utc_now()
    stamp = now.replace("-", "").replace(":", "").replace("Z", "Z")
    topic_slug = slugify(topic)
    base_run_id = f"{stamp}-{topic_slug}"
    run_id = base_run_id
    suffix = 2
    while (state / "runs" / run_id).exists():
        run_id = f"{base_run_id}-{suffix}"
        suffix += 1
    artifact_root = artifact_root_for(workdir, config)
    date_slug = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d")
    artifact_dir = artifact_root / f"{date_slug}-{topic_slug}"
    run_dir = state / "runs" / run_id
    run_dir.mkdir(parents=True, exist_ok=False)
    artifact_dir.mkdir(parents=True, exist_ok=True)
    run = {
        "schema": 1,
        "run_id": run_id,
        "skill": skill,
        "topic": topic_slug,
        "request_text": request_text,
        "workdir": str(workdir),
        "artifact_dir": str(artifact_dir),
        "language_tag": config.get("language", {}).get("tag"),
        "status": "planning",
        "created_at": now,
        "updated_at": now,
    }
    atomic_write_json(run_dir / "run.json", run)
    for name in ("decisions.jsonl", "subagents.jsonl", "refs.jsonl"):
        (run_dir / name).touch(exist_ok=True)
    atomic_write_json(
        state / "active.json",
        {"run_id": run_id, "run_dir": str(run_dir), "artifact_dir": str(artifact_dir)},
    )
    return run


def record_subagent(
    workdir: Path,
    run_id: str,
    role: str,
    label: str,
    model: str | None,
    status: str | None,
) -> dict[str, Any]:
    if role not in {"reviewer", "criticizer"}:
        raise SystemExit("--role must be reviewer or criticizer")
    _, state = _ensure(workdir)
    path = state / "runs" / run_id / "subagents.jsonl"
    if not path.parent.is_dir():
        raise SystemExit(f"run does not exist: {run_id}")
    entry = {
        "role": role,
        "label": label,
        "model": model,
        "status": status,
        "recorded_at": utc_now(),
    }
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(entry, sort_keys=True) + "\n")
    return entry


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Manage dsh-plans workspace state for the DeepSeek Harness: "
        "planning artifacts in dsh-plans/, machine state in dsh-plans/.state/"
    )
    sub = parser.add_subparsers(dest="command", required=True)

    init = sub.add_parser("init", help="ensure artifact dir + state under <workdir>/dsh-plans/.state")
    init.add_argument("--workdir", default=".")

    show = sub.add_parser("show", help="print config JSON (read-only; never creates state)")
    show.add_argument("--workdir", default=".")

    language = sub.add_parser("set-language", help="persist language setting")
    language.add_argument("--workdir", default=".")
    language.add_argument("--tag", required=True)
    language.add_argument("--source", choices=["user", "auto"], required=True)

    role = sub.add_parser(
        "set-role", help="persist reviewer, criticizer, or executor setting "
        "(omitted flags keep stored values)"
    )
    role.add_argument("--workdir", default=".")
    role.add_argument("--role", choices=sorted(VALID_ROLES), required=True)
    role.add_argument(
        "--mode",
        choices=sorted(VALID_ROLE_MODES),
        help="reviewer/criticizer only; the executor mode is always goal-loop",
    )
    role.add_argument(
        "--model-selector",
        help="exact model selector, or 'inherit' to reset to the inherited session model",
    )
    role.add_argument(
        "--confirmed", action="store_true", help="stamp confirmed_at=now (used by the confirmation flow)"
    )
    role.add_argument(
        "--reset-confirmation", action="store_true", help="clear confirmed_at (re-triggers the first-use question)"
    )

    run = sub.add_parser("start-run", help="create run state and artifact directory")
    run.add_argument("--workdir", default=".")
    run.add_argument("--topic", required=True)
    run.add_argument("--skill", required=True)
    run.add_argument("--request-text", required=True)

    subagent = sub.add_parser("record-subagent", help="append a reviewer or criticizer child record")
    subagent.add_argument("--workdir", default=".")
    subagent.add_argument("--run-id", required=True)
    subagent.add_argument("--role", choices=["reviewer", "criticizer"], required=True)
    subagent.add_argument("--label", required=True)
    subagent.add_argument("--model", help="exact selector, or 'inherit'")
    subagent.add_argument("--status", help="e.g. completed, failed, skipped")

    return parser


def main() -> int:
    args = build_parser().parse_args()
    workdir = normalize_workdir(args.workdir)
    if args.command == "init":
        result = ensure_state(workdir)
    elif args.command == "show":
        result = show_state(workdir)
    elif args.command == "set-language":
        result = set_language(workdir, args.tag, args.source)
    elif args.command == "set-role":
        result = set_role(
            workdir, args.role, args.mode, args.model_selector, args.confirmed, args.reset_confirmation
        )
    elif args.command == "start-run":
        result = start_run(workdir, args.topic, args.skill, args.request_text)
    elif args.command == "record-subagent":
        result = record_subagent(workdir, args.run_id, args.role, args.label, args.model, args.status)
    else:
        raise AssertionError(args.command)
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
