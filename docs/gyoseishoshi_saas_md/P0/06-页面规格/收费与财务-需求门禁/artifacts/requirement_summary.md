# Requirement Summary

## Business Goal
Define the frozen P0 `收费与财务` module page specification so the firm can track receivables, payments, arrears risk, and collection follow-up against cases.

Keep the finance scope limited to staged billing plans, payment recording, arrears-risk confirmation, and basic collection support without expanding into invoices, financial reporting, or auto-reconciliation.

## User Story
As a finance user or lead owner, I need to review receivables and arrears, record incoming payments, create collection follow-up tasks, and capture arrears-risk confirmation when submission continues under unpaid status.

## In Scope
- Billing list page fields, default filters, and batch collection-task generation
- Case-level billing plan view with stage-bound fee nodes, amount due, due date, and status
- Payment record list with amount, date, voucher, and linked `BillingPlan`
- Internal finance notes area
- Payment registration and payment-voucher upload
- Collection-task creation for overdue unpaid cases
- Arrears-risk confirmation flow for continuing submission under unpaid status
- Role-based visibility and editing for administrator, finance, lead owner, and assistant

## Out of Scope
- Invoice management
- Financial reports
- Auto-reconciliation
- Batch export of billing reports
- Customer-facing arrears reminders through portal or external channels
- Step-level billing hard blocking such as `gate_trigger_step=COE_SENT`

## Business Rules
- P0 does not treat arrears as a universal hard block for submission
- Billing nodes are bound to case stages and trigger internal reminders when reached
- Billing exceptions are exposed as risk signals and workbench visibility rather than universal blocking
- Continuing submission under arrears requires risk confirmation with confirmer and reason, and may include an optional voucher
- Payment recording updates outstanding amount and must remain traceable
- Finance-related exports remain controlled and auditable rather than broadly open
- Visibility and editability follow role, group, and responsible/collaborator access rules
- P0 keeps collection support internal and does not include external customer reminder delivery

## Edge Cases
- Empty state when no billing plan exists for a case
- Case fully paid and therefore marked as settled
- Overdue unpaid node highlighted in red and triggering collection reminders/tasks
- Submission attempted under arrears requiring explicit risk-confirmation trace before continuation
- Partial payment leaving a remaining outstanding balance

## Acceptance Criteria
- The list page renders case, customer, group, receivable, received, outstanding, next-node, and payment-status fields
- Default filters for payment status, group, and owner are available
- The module exposes a case-level billing-plan section and payment-record section with the specified fields
- Authorized users can register payments and upload vouchers linked to `PaymentRecord`
- Authorized users can create collection tasks for overdue billing nodes
- Arrears-risk confirmation records confirmer and reason before unpaid submission continues
- Overdue and settled states are visibly represented in the module
- P0 behavior remains limited to manual payment logging and internal risk handling without invoices, reports, auto-reconciliation, or step-level hard billing blocks

## Unknowns
- None identified from the current P0 authority set.

## Risks
- If implementation turns arrears into a universal submission block, it will violate the frozen P0 warn-mode rule
- If payment updates are not tightly linked to billing plans and audit traces, outstanding balances may become unreliable
- If finance scope expands into invoices or reconciliation in this module, it will exceed the P0 boundary
