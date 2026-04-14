# Requirement Summary

## Business Goal
Define the frozen P0 `客户` module page specification so the firm can manage personal customer master data, relationship links, and case-entry actions from one internal module.

Keep the customer scope limited to P0 essentials: personal-customer records, search, ownership/group governance, linked-case visibility, and case creation entry points.

## User Story
As a lead owner, assistant, or sales/front-desk user, I need to create, find, update, and relate personal customers and launch cases from the customer record so customer master data stays usable across intake and case operations.

## In Scope
- Customer list page fields, default filters, and bulk actions
- Customer detail page overview plus 5 tabs: basic info, related cases, relations, communication logs, operation logs
- Personal-customer creation from manual entry or lead conversion
- Search by name, furigana, phone, and email
- Customer information maintenance including contact info, group, and notes
- Related-case visibility with counts, summaries, and links
- One-click case creation and family-scenario batch case creation from the customer detail page
- CustomerRelation management and batch case creation for related persons
- Group adjustment with traceability and no historical case backfill
- Role/group/owner based visibility and edit boundaries

## Out of Scope
- Company customer master data
- Customer portal linkage
- Customer merge execution
- Customer-level cross-case attachment summary
- Dedicated identity-document ledger tab
- Billing-record tab on customer detail
- Batch customer export
- `ResidencePeriod` history tab

## Business Rules
- P0 treats personal customers as the main customer entity and does not introduce company customer master data
- `Lead.group -> Customer.group -> Case.group` inheritance applies, but later customer group changes do not overwrite historical cases
- Duplicate warnings are triggered primarily by phone and email matching during creation
- Related cases are a read-only overview within the customer module; case lifecycle execution remains in the case module
- Customer communication records must preserve `visible_scope` separation between internal and client-visible notes
- Customer detail does not duplicate case-owned attachments, certificates, or billing data in P0
- Batch case creation from a customer record is specifically intended for family-signing scenarios

## Edge Cases
- Empty customer list with guided entry to create the first customer or convert from leads
- Duplicate-customer prompt during creation when phone or email matches existing records
- Customer with all related cases archived and therefore no active-case flag
- Customer with multiple related cases requiring `+N` expansion from the overview name summary
- Group adjustment that requires audit trace and cannot rewrite historical case ownership snapshots

## Acceptance Criteria
- The list page presents the specified customer columns, default filters, and bulk actions
- The detail page presents the overview block and the 5 required tabs with the defined information and actions
- Creating a personal customer creates a `Customer` and, when sourced from a lead, inherits `Lead.group`
- Search supports name, furigana, phone, and email lookup
- Related cases display count, activity split, case-name summary, and navigation entry points
- One-click case creation and family batch creation launch from the customer page with the customer pre-bound
- CustomerRelation records can be created and used as an entry point for batch case creation
- Visibility and edit permissions follow the administrator, lead, assistant, and sales/front-desk matrix

## Unknowns
- None identified from the current P0 authority set.

## Risks
- If implementation exposes company-customer behavior in this page, it will exceed the frozen P0 boundary
- If customer-level tabs start duplicating case-owned attachments or billing data, source-of-truth boundaries will drift
- If group changes are implemented as backfills to historical cases, ownership auditability will break
