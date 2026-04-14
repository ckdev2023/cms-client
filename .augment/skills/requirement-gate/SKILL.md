---
name: requirement-gate
description: parse raw requirement or prd documents into structured execution artifacts with hard gates, ambiguity tracking, and acceptance checklists. use when chatgpt needs to understand a feature request, product requirement, rfc, ticket, or markdown spec without drifting, especially before planning or implementation.
---

Build requirement artifacts before any planning or coding. Treat the raw PRD as source material, not as the direct implementation contract.

## Workflow
1. Run `scripts/init_requirement_artifacts.sh <path-to-prd>` to initialize artifact templates and copy source metadata.
2. Read the source requirement document and produce these files:
   - `artifacts/requirement_summary.md`
   - `artifacts/requirement_contract.json`
   - `artifacts/requirement_gaps.md`
   - `artifacts/execution_contract.json`
   - `artifacts/acceptance_checklist.json`
3. Run `python3 scripts/check_contract.py`.
4. Run `scripts/gate.sh`.
5. Only after both checks pass, continue to planning or implementation.

## Rules
- Do not implement directly from the raw PRD.
- Separate explicit facts from assumptions and examples.
- Always fill `out_of_scope` and `acceptance_criteria`.
- If unknowns or blockers remain unresolved, keep the task blocked.
- Use `references/templates.md` for exact output structure.

## Output requirements
`requirement_contract.json` must include at least:
- `feature_name`
- `goal`
- `actors`
- `must_have`
- `out_of_scope`
- `business_rules`
- `edge_cases`
- `acceptance_criteria`
- `unknowns`
- `blocked`

`execution_contract.json` must include at least:
- `task_type`
- `allowed_modules`
- `forbidden_modules`
- `required_outputs`
- `non_goals`
- `must_verify`

`acceptance_checklist.json` must contain a `checks` array with stable ids like `AC-1`.

## Failure handling
- If `check_contract.py` fails, repair the artifacts instead of moving on.
- If `gate.sh` fails because of unresolved unknowns, stop and report the blocking decisions needed.
- Never silently convert examples into requirements.

## References
- For artifact formats and examples, read `references/templates.md`.
