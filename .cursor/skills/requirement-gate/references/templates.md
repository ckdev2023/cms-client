# Requirement artifact templates

Use these templates exactly unless the user's project requires a stricter schema.

## requirement_summary.md

```md
# Requirement Summary

## Business Goal
<one or two sentences>

## User Story
<who does what in which context>

## In Scope
- ...

## Out of Scope
- ...

## Business Rules
- ...

## Edge Cases
- ...

## Acceptance Criteria
- ...

## Unknowns
- ...

## Risks
- ...
```

## requirement_gaps.md

```md
# Requirement Gaps

## Explicit Facts
- ...

## Inferred Assumptions
- ...

## Missing Decisions
- ...

## Conflicts
- ...

## Blockers
- ...
```

## requirement_contract.json

```json
{
  "feature_name": "coupon list page",
  "goal": "let signed-in users view their available coupons",
  "actors": ["signed-in user"],
  "must_have": [
    "show coupon title",
    "show expiry date",
    "show empty state"
  ],
  "out_of_scope": [
    "coupon creation",
    "coupon redemption"
  ],
  "business_rules": [
    "expired coupons are not clickable",
    "unauthenticated users cannot access the page"
  ],
  "edge_cases": [
    "empty response",
    "network error",
    "missing field in payload"
  ],
  "acceptance_criteria": [
    "list renders after successful load",
    "empty state renders when no coupons exist",
    "error feedback renders on failure"
  ],
  "unknowns": [
    "sorting rule is not specified"
  ],
  "blocked": true
}
```

## execution_contract.json

```json
{
  "task_type": "feature",
  "allowed_modules": [
    "src/features/coupon/",
    "src/components/coupon/",
    "tests/coupon/"
  ],
  "forbidden_modules": [
    "src/features/payment/",
    "src/admin/"
  ],
  "required_outputs": [
    "page",
    "loading state",
    "empty state",
    "tests"
  ],
  "non_goals": [
    "backend api changes",
    "tracking refactor"
  ],
  "must_verify": [
    "lint",
    "typecheck",
    "unit_test",
    "build"
  ]
}
```

## acceptance_checklist.json

```json
{
  "checks": [
    {"id": "AC-1", "desc": "render the coupon list after successful load"},
    {"id": "AC-2", "desc": "render an empty state when no coupons exist"},
    {"id": "AC-3", "desc": "render error feedback when the request fails"}
  ]
}
```

## Decision policy
- Put only confirmed requirements into `must_have` and `acceptance_criteria`.
- Put every unresolved implementation-critical question into `unknowns`.
- Set `blocked` to `true` whenever unresolved unknowns or blockers remain.
