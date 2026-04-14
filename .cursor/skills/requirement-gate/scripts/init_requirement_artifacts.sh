#!/usr/bin/env bash
set -euo pipefail

SRC_PATH="${1:-docs/prd.md}"
mkdir -p artifacts

if [ ! -f "$SRC_PATH" ]; then
  echo "source requirement file not found: $SRC_PATH"
  exit 1
fi

cat > artifacts/requirement_summary.md <<'MD'
# Requirement Summary

## Business Goal

## User Story

## In Scope
- 

## Out of Scope
- 

## Business Rules
- 

## Edge Cases
- 

## Acceptance Criteria
- 

## Unknowns
- 

## Risks
- 
MD

cat > artifacts/requirement_gaps.md <<'MD'
# Requirement Gaps

## Explicit Facts
- 

## Inferred Assumptions
- 

## Missing Decisions
- 

## Conflicts
- 

## Blockers
- 
MD

cat > artifacts/requirement_contract.json <<'JSON'
{
  "feature_name": "",
  "goal": "",
  "actors": [],
  "must_have": [],
  "out_of_scope": [],
  "business_rules": [],
  "edge_cases": [],
  "acceptance_criteria": [],
  "unknowns": [],
  "blocked": true
}
JSON

cat > artifacts/execution_contract.json <<'JSON'
{
  "task_type": "feature",
  "allowed_modules": [],
  "forbidden_modules": [],
  "required_outputs": [],
  "non_goals": [],
  "must_verify": []
}
JSON

cat > artifacts/acceptance_checklist.json <<'JSON'
{
  "checks": []
}
JSON

printf '%s
' "$SRC_PATH" > artifacts/requirement_source.txt

echo "initialized requirement artifacts from $SRC_PATH"
