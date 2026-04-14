# Requirement Gaps

## Explicit Facts
- The P0 customer module manages personal customer master data and does not introduce company customer master data
- The list page requires specific columns, default filters, and two bulk actions
- The detail page requires an overview section plus 5 tabs for basic info, related cases, relations, communications, and logs
- The module must support one-click case creation and family-scenario batch case creation from the customer record
- Duplicate prompts are based on phone/email matching during creation
- Group inheritance and change behavior are governed by the lead-to-customer-to-case chain, and customer group updates do not rewrite historical cases
- P0 explicitly excludes customer portal linkage, merge execution, customer-level attachment summaries, separate ID-ledger tab, billing tab, batch export, and `ResidencePeriod` tab

## Inferred Assumptions
- The customer page acts as a master-data and navigation surface, while case execution remains owned by the case module
- "销售/前台" is treated as a limited-scope operational role with access only to basic customer information in its group
- The related-cases summary in the overview is intended to reduce list hopping rather than add new case-management behavior
- The `ResidencePeriod` exclusion implies P0 keeps only the single current-expiry field in customer data rather than a historical timeline UI

## Missing Decisions
- None identified that block requirement gating for the current P0 customer page-spec baseline

## Conflicts
- No direct conflicts identified between the customer page spec and the cited P0 rule/process documents used for this gate

## Blockers
- 
