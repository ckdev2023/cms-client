#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "usage: $0 <artifacts-dir>" >&2
  exit 1
fi

ARTIFACTS="$1"
python3 "$(dirname "$0")/check_contract.py" --artifacts "$ARTIFACTS"

echo "[gate] passed: prototype contracts are ready for planning"
