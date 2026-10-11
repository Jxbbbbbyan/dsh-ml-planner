#!/usr/bin/env bash
# install.sh - install the dsh-ml-planner preset into a DSH agent-presets directory.
#
# Copies preset/ from this repository into TARGET (default ~/.dsh/.agent-presets/ml-planner).
# An existing installation is NEVER overwritten unless --force is given; with --force the previous
# directory is first moved to a timestamped sibling (TARGET.bak-<UTC>) so an upgrade can be rolled
# back.
#
# Exit codes
#   0  installed, or an existing installation was reported and left untouched
#   1  error (preset source missing, nothing to copy, copy failed)
#   2  usage error
#
# Usage:
#   ./scripts/install.sh
#   ./scripts/install.sh --target "$HOME/.dsh/.agent-presets/ml-planner" --force
#   DSH_PRESET_DIR=/opt/presets/ml-planner ./scripts/install.sh

set -euo pipefail

TARGET="${DSH_PRESET_DIR:-$HOME/.dsh/.agent-presets/ml-planner}"
SOURCE=""
FORCE=0

usage() {
    cat <<'EOF'
install.sh - install the dsh-ml-planner preset

Options:
  -t, --target <dir>   install into <dir> (default: ~/.dsh/.agent-presets/ml-planner)
  -s, --source <dir>   install from <dir> (default: <repo>/preset)
  -f, --force          replace an existing installation (keeps a timestamped backup)
  -h, --help           show this help

Environment:
  DSH_PRESET_DIR       default target directory
EOF
}

while [ $# -gt 0 ]; do
    case "$1" in
        -t|--target)  [ $# -ge 2 ] || { echo "install.sh: --target needs a value" >&2; exit 2; }; TARGET="$2"; shift 2 ;;
        -s|--source)  [ $# -ge 2 ] || { echo "install.sh: --source needs a value" >&2; exit 2; }; SOURCE="$2"; shift 2 ;;
        -f|--force)   FORCE=1; shift ;;
        -h|--help)    usage; exit 0 ;;
        *)            echo "install.sh: unknown argument: $1" >&2; usage >&2; exit 2 ;;
    esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
[ -n "$SOURCE" ] || SOURCE="$REPO_ROOT/preset"

echo "dsh-ml-planner - preset installer"
echo "  source : $SOURCE"
echo "  target : $TARGET"
echo ""

if [ ! -d "$SOURCE" ]; then
    echo "ERROR: preset source directory not found: $SOURCE" >&2
    exit 1
fi
if [ ! -f "$SOURCE/agent.cordis.yml" ]; then
    echo "ERROR: not a preset directory (agent.cordis.yml is missing): $SOURCE" >&2
    exit 1
fi

source_count="$(find "$SOURCE" -type f | wc -l | tr -d ' ')"
if [ "$source_count" -eq 0 ]; then
    echo "ERROR: preset source is empty: $SOURCE" >&2
    exit 1
fi

if [ -d "$TARGET" ]; then
    existing_count="$(find "$TARGET" -type f 2>/dev/null | wc -l | tr -d ' ')"
else
    existing_count=0
fi

if [ -d "$TARGET" ] && [ "$existing_count" -gt 0 ] && [ "$FORCE" -ne 1 ]; then
    echo "SKIP: an installation already exists - nothing was written."
    echo "  $existing_count file(s) at $TARGET"
    echo ""
    echo "  To replace it, re-run with --force (the current directory is moved to a"
    echo "  timestamped .bak-<UTC> sibling first):"
    echo "      ./scripts/install.sh --force"
    echo ""
    echo "  To check the existing installation instead:"
    echo "      pwsh -File scripts/verify.ps1 -Preset \"$TARGET\""
    exit 0
fi

if [ -d "$TARGET" ]; then
    stamp="$(date -u +%Y%m%dT%H%M%SZ)"
    backup="$TARGET.bak-$stamp"
    n=1
    while [ -e "$backup" ]; do backup="$TARGET.bak-$stamp-$n"; n=$((n + 1)); done
    echo "backing up the existing installation -> $backup"
    mv "$TARGET" "$backup"
fi

mkdir -p "$TARGET"
cp -R "$SOURCE/." "$TARGET/"

copied_count="$(find "$TARGET" -type f | wc -l | tr -d ' ')"
if [ "$copied_count" -ne "$source_count" ]; then
    echo "ERROR: copy mismatch: expected $source_count file(s), found $copied_count" >&2
    exit 1
fi

echo ""
echo "OK: installed $copied_count file(s) into $TARGET"
echo ""
echo "Next steps"
echo "  1. self-check this installation:"
echo "         pwsh -File scripts/verify.ps1 -Preset \"$TARGET\"   # PowerShell, any OS with pwsh"
echo "  2. restart DSH and pick the preset in the session picker."
echo "     (.mjs files are loaded through Node's ESM cache, so an already-running host keeps"
echo "      the old module in memory until it is restarted.)"
