# Requirement Gaps

## Explicit Facts
- The P0 billing module tracks billing plans, payment records, collection reminders, and arrears-risk traces
- The list page requires fields for case, customer, group, receivable, received, outstanding, next collection node, and payment status
- The module includes case-level billing-plan and payment-record sections plus internal finance notes
- Payment registration, voucher upload, collection-task creation, and arrears-risk confirmation are the key actions
- P0 uses arrears warning mode and does not make unpaid status a universal hard submission block
- Overdue nodes should be highlighted and trigger collection reminders
- P0 explicitly excludes invoices, financial reports, auto-reconciliation, batch billing export, customer-facing arrears reminders, and step-level hard billing blocking

## Inferred Assumptions
- "回款状态（已结清/部分回款/未回款/逾期）" is a UI-facing aggregation over billing-plan and payment-record data rather than a separate finance process
- Voucher upload is attached to the payment record and is part of the traceability requirement for finance actions
- Finance notes are internal-only and not intended as a customer-visible communication channel
- Collection-task creation is expected to integrate with the existing task module rather than define a separate workflow system here

## Missing Decisions
- None identified that block requirement gating for the current P0 billing page-spec baseline

## Conflicts
- No direct conflicts identified between the billing page spec and the cited P0 rule/process documents used for this gate

## Blockers
- 
