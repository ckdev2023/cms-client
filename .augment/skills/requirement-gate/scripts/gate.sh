#!/usr/bin/env bash
set -euo pipefail

python3 scripts/check_contract.py >/dev/null

python3 - <<'PY'
import json
from pathlib import Path

contract = json.loads(Path('artifacts/requirement_contract.json').read_text())
gaps = Path('artifacts/requirement_gaps.md').read_text() if Path('artifacts/requirement_gaps.md').exists() else ''

unknowns = contract.get('unknowns', [])
blocked = contract.get('blocked', True)

if blocked:
    raise SystemExit('gate failed: contract is still blocked')
if unknowns:
    raise SystemExit('gate failed: unresolved unknowns remain')
if '## Blockers' in gaps:
    lines = [line.strip() for line in gaps.splitlines()]
    blocker_section = False
    blockers = []
    for line in lines:
        if line.startswith('## '):
            blocker_section = (line == '## Blockers')
            continue
        if blocker_section and line.startswith('-') and line.strip() != '-':
            blockers.append(line)
    if blockers:
        raise SystemExit('gate failed: blockers remain in requirement_gaps.md')

print('requirement gate passed')
PY
