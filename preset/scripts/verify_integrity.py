#!/usr/bin/env python3
"""verify_integrity.py - three-level preset integrity verification.

Reads `skills/ml-modeling-plan/references/preset-integrity-manifest.md` as the SINGLE SOURCE OF TRUTH
(hashes must never be duplicated as constants in this file, or the copy drifts).

Levels
  L1  baseline   the UPSTREAM source preset: every listed hash identical, file count identical,
                 fingerprint identical. REQUIRES an upstream baseline (`--source`). A fresh clone of
                 this repository does not ship the upstream preset, so L1 prints
                 `SKIP (no upstream baseline)` and does NOT affect the exit code. Pass
                 `--strict` to turn a missing baseline into a fatal error instead.
  L2  copy       `pure-copy` rows inside THIS preset must hash-identically to the manifest values
                 (which record the upstream bytes). Portable: needs the manifest and this preset
                 only, so it always runs.
  L2' edits      `intentional-edit` rows are NOT hash-checked; their presence is verified (portable)
                 and, when an upstream baseline is supplied, the composition guard also reports
                 deleted lines against it.
  L3  generated  generated artifacts are counted and reported.
  manifest       the rows are re-hashed and compared with the recorded MANIFEST_FINGERPRINT
                 (self-consistency; portable, always runs).

Exit codes
  0  every applicable level passed (SKIPped levels never affect the exit code)
  1  a real comparison failed
  2  fatal: manifest missing / unusable arguments / --strict without an upstream baseline

Portability
  `--preset` defaults to the preset directory that contains this script's parent, so a bare
  `python scripts/verify_integrity.py` works from any checkout and from any install location.
  No personal absolute path is baked in. Standard library only.

Usage:
  python verify_integrity.py                        # portable: manifest, L2, L2', L3
  python verify_integrity.py --source <upstream>    # + strict L1 against the upstream baseline
  python verify_integrity.py --strict --source ..   # require that baseline
  python verify_integrity.py --verbose
"""
from __future__ import annotations

import argparse
import hashlib
import re
import sys
from pathlib import Path

# The preset root is the parent of the directory holding this script
# (<preset>/scripts/verify_integrity.py -> <preset>). No absolute path is hard-coded.
DEFAULT_PRESET = Path(__file__).resolve().parent.parent
MANIFEST_REL = Path("skills/ml-modeling-plan/references/preset-integrity-manifest.md")

FINGERPRINT_RE = re.compile(r"MANIFEST_FINGERPRINT\s*=\s*([0-9a-f]{64})")
ROW_RE = re.compile(r"^\|\s*(\d+)\s*\|\s*`([^`]+)`\s*\|\s*([\d,]+)\s*\|\s*`([0-9a-f]{64})`\s*\|\s*([a-z-]+)\s*\|")


def make_output_robust() -> None:
    """Never let one undecodable glyph kill the run.

    The manifest and the composition file carry CJK text and arrows such as U+21D2; a GBK console
    (or a redirected pipe with a non-UTF-8 codec) raises UnicodeEncodeError while printing them.
    """
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(errors="replace")  # type: ignore[union-attr]
        except (AttributeError, ValueError, OSError):
            pass


def sha256(p: Path) -> str:
    h = hashlib.sha256()
    with p.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def parse_manifest(text: str):
    """Return (fingerprint, rows) where rows = [(n, relpath, size, sha, classification)]."""
    m = FINGERPRINT_RE.search(text)
    fingerprint = m.group(1) if m else None
    rows = []
    for line in text.splitlines():
        mm = ROW_RE.match(line.strip())
        if mm:
            rows.append((int(mm.group(1)), mm.group(2), int(mm.group(3).replace(",", "")),
                         mm.group(4), mm.group(5)))
    return fingerprint, rows


def order_key(rel: str) -> str:
    """Case-insensitive ordering - part of the fingerprint definition (see the manifest)."""
    return rel.lower()


def compute_fingerprint(rows) -> str:
    joined = "\n".join(f"{rel}:{sha}" for _, rel, _, sha, _ in sorted(rows, key=lambda r: order_key(r[1])))
    return hashlib.sha256(joined.encode("utf-8")).hexdigest()


def main() -> int:
    make_output_robust()

    ap = argparse.ArgumentParser(description="Verify three-level preset integrity from the manifest.")
    ap.add_argument("--preset", default=str(DEFAULT_PRESET),
                    help="preset root (default: the directory containing this script's parent)")
    ap.add_argument("--source", default="",
                    help="upstream baseline preset to compare L1 against; omit to SKIP L1")
    ap.add_argument("--strict", action="store_true",
                    help="treat a missing upstream baseline as a fatal error instead of a SKIP")
    ap.add_argument("--verbose", action="store_true")
    args = ap.parse_args()

    preset = Path(args.preset)
    source = Path(args.source) if args.source else None
    manifest_path = preset / MANIFEST_REL
    fails: list[str] = []
    warns: list[str] = []
    skipped: list[str] = []

    print("=" * 72)
    print("preset integrity verification")
    print("=" * 72)
    print(f"  preset  : {preset}")
    print(f"  source  : {source if source is not None else '(none supplied)'}")
    print(f"  manifest: {manifest_path}")
    print()

    if not manifest_path.is_file():
        print(f"FATAL: manifest not found: {manifest_path}")
        return 2

    fingerprint, rows = parse_manifest(manifest_path.read_text(encoding="utf-8"))
    if not rows:
        print("FATAL: no file rows parsed from the manifest (format changed?)")
        return 2
    print(f"manifest: {len(rows)} rows, fingerprint {fingerprint}")

    # -------- manifest self-consistency (portable) --------
    print("\n[manifest] self-consistency (rows -> fingerprint)")
    if fingerprint is None:
        warns.append("manifest records no MANIFEST_FINGERPRINT line")
        print("       SKIP (the manifest records no fingerprint)")
        skipped.append("manifest-fingerprint")
    else:
        recomputed = compute_fingerprint(rows)
        if recomputed != fingerprint:
            fails.append(f"manifest fingerprint: manifest says {fingerprint}, rows hash to {recomputed}")
            print(f"       FAIL rows hash to {recomputed}")
        else:
            print(f"       PASS {len(rows)} rows hash to the recorded fingerprint")
            print(f"            ({fingerprint})")

    # -------- L1: upstream source baseline (needs --source) --------
    print("\n[L1] source baseline")
    have_source = source is not None and source.is_dir()
    if source is not None and not source.is_dir():
        fails.append(f"L1 upstream baseline not found: {source}")
        print(f"       FAIL upstream baseline not found: {source}")
    elif not have_source:
        if args.strict:
            print("       FATAL: --strict was given but no upstream baseline was supplied")
            print("              pass --source <path to the upstream preset>")
            return 2
        print("       SKIP (no upstream baseline)")
        print("            the upstream preset is not part of this repository; L1 compares the")
        print("            shipped bytes against it. Pass --source <dir> to enable this level.")
        skipped.append("L1")
    else:
        src_files = sorted([p for p in source.rglob("*") if p.is_file()],
                           key=lambda p: order_key(str(p.relative_to(source))))
        src_by_rel = {str(p.relative_to(source)).replace("/", "\\"): p for p in src_files}
        rows_by_rel = {rel: (size, sha) for _, rel, size, sha, _ in rows}

        if len(src_files) != len(rows):
            fails.append(f"L1 file count: source has {len(src_files)}, manifest lists {len(rows)}")

        for rel in rows_by_rel:
            if rel not in src_by_rel:
                fails.append(f"L1 missing in source: {rel}")

        mism = 0
        for rel, (size, sha) in rows_by_rel.items():
            p = src_by_rel.get(rel)
            if p is None:
                continue
            if p.stat().st_size != size:
                fails.append(f"L1 size: {rel} {p.stat().st_size} != {size}")
            got = sha256(p)
            if got != sha:
                mism += 1
                fails.append(f"L1 hash: {rel} -> {got} (manifest {sha})")
            elif args.verbose:
                print(f"       ok {rel}")

        extra = sorted(rel for rel in src_by_rel if rel not in rows_by_rel)
        if extra:
            print(f"       note: {len(extra)} source file(s) are not listed in the manifest")
            if args.verbose:
                for rel in extra:
                    print(f"         - {rel}")
            else:
                print("             (run --verbose to list them; informational only)")
        print(f"       files={len(src_files)} hash-mismatches={mism}")

        if fingerprint:
            live = [(0, str(p.relative_to(source)), p.stat().st_size, sha256(p), "pure-copy")
                    for p in src_files]
            live_fp = compute_fingerprint(live)
            if live_fp != fingerprint:
                fails.append(f"L1 live fingerprint: source files hash to {live_fp}, expected {fingerprint}")
                print(f"       live-source fingerprint MISMATCH ({live_fp})")
            else:
                print("       live-source fingerprint matches")

    # -------- L2: pure copies inside this preset (portable) --------
    print("\n[L2] copy fidelity (pure copies)")
    pure = [r for r in rows if r[4] == "pure-copy"]
    edits = [r for r in rows if r[4] == "intentional-edit"]
    pure_ok = 0
    for _, rel, _size, sha, _cls in pure:
        target = preset / rel.replace("\\", "/")
        if not target.is_file():
            fails.append(f"L2 missing: {rel}")
            continue
        got = sha256(target)
        if got == sha:
            pure_ok += 1
            if args.verbose:
                print(f"       ok {rel}")
        else:
            fails.append(f"L2 hash: {rel} -> {got} (expected {sha})")
    print(f"       pure copies identical: {pure_ok}/{len(pure)}")

    # -------- L2': intentional edits (presence portable; deleted-lines guard needs the baseline) --
    print("\n[L2'] intentional edits (structural guards)")
    for _, rel, _s, _h, _c in edits:
        target = preset / rel.replace("\\", "/")
        status = "present" if target.is_file() else "MISSING"
        if status == "MISSING":
            fails.append(f"L2' missing edited file: {rel}")
        print(f"       {status:8} {rel}")

    comp_rel = next((r[1] for r in edits if r[1].endswith("agent.cordis.yml")), None)
    if comp_rel is None:
        skipped.append("L2'")
    elif not have_source:
        print("       SKIP     composition deleted-lines guard (no upstream baseline)")
        skipped.append("L2'-deleted-lines")
    else:
        a = (source / comp_rel.replace("\\", "/")).read_text(encoding="utf-8", errors="replace").splitlines()
        b = (preset / comp_rel.replace("\\", "/")).read_text(encoding="utf-8", errors="replace").splitlines()
        set_a = set(l.strip() for l in a if l.strip())
        set_b = set(l.strip() for l in b if l.strip())
        deleted = [l for l in a if l.strip() and l.strip() not in set_b]
        printable = ["".join(ch if ch.isprintable() else "?" for ch in l)[:60] for l in deleted[:3]]
        print(f"       composition deleted-lines vs source: {len(deleted)}")
        if deleted:
            print(f"         first: {printable}")
            warns.append(f"composition removed {len(deleted)} line(s) present in source")

    # -------- L3: generated files present (portable) --------
    print("\n[L3] generated files")
    gen_ok = 0
    for sub in ("lib", "scripts", "skills"):
        d = preset / sub
        if d.is_dir():
            for p in d.rglob("*"):
                if p.is_file() and "__pycache__" not in str(p):
                    gen_ok += 1
    print(f"       generated files present: {gen_ok} (hashes listed by the generator)")

    # -------- summary --------
    print("\n" + "=" * 72)
    if skipped:
        print(f"SKIPPED ({len(skipped)}): {', '.join(skipped)}")
    if warns:
        print(f"WARNINGS ({len(warns)}):")
        for w in warns:
            print(f"  - {w}")
    if fails:
        print(f"FAILURES ({len(fails)}):")
        for f in fails:
            print(f"  - {f}")
        print("\nRESULT: FAIL")
        return 1
    print("RESULT: PASS  (every applicable level)")
    if skipped:
        print(f"        ({len(skipped)} level(s) SKIPPED - not counted as a pass)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
