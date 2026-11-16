#!/usr/bin/env bash
# Start MediaVault. The first run creates .venv and installs the app into it.
# shortcut: dependencies are installed once; after a dependency change, delete .venv.
set -euo pipefail
cd "$(dirname "$0")"
if [ ! -f .venv/.installed ]; then
    echo "Erster Start: richte .venv ein ..."
    python3 -m venv .venv
    .venv/bin/python -m pip install -e .
    touch .venv/.installed
fi
exec .venv/bin/python -m mediavault "$@"
