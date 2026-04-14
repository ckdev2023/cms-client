# Requirement Summary

## Business Goal
Define the P0 `案件` module page specification so the firm can manage a single case from intake to archive within one consistent internal workflow.

Freeze the UI-facing scope for lifecycle management, validation gates, submission-package handling, billing visibility, and auditability without introducing P1 workflow complexity.

## User Story
As an administrative scrivener, assistant, or finance user, I need to create, view, advance, validate, submit, bill, and archive cases in one module so the office can run the full P0 case lifecycle with clear permissions and traceable records.

## In Scope
- Case list page fields, default filters, and bulk actions
- Case detail page with 10 tabs: overview, basic info, documents, forms, tasks, deadlines, validation/submission, billing, communications, logs
- Core case actions: create case, family-case batch creation, advance stage, run Gate validation, generate submission package, upload receipt, archive, waive document item, register payment, cross-group create
- Stage model constrained to `S1-S9` in P0
- Gate-A / Gate-B / Gate-C driven progression and blocking behavior
- Document handling defined as local archive registration plus version metadata, not SaaS binary upload
- Submission package locking, correction-package linkage, arrears-risk confirmation, and archive read-only behavior
- Role, group, and owner/collaborator based visibility and edit boundaries

## Out of Scope
- Advanced reports such as correction rate, success rate, and completion duration
- Customer portal linkage
- Configurable advanced validation rules
- Globally mandatory dual review
- Batch export of case reports
- P1 business workflow step operations such as `CaseWorkflowStep`
- Case-specific `extra_fields`

## Business Rules
- P0 only exposes management stages `S1-S9`; business sub-steps stay disabled until P1
- Gate-A, Gate-B, and Gate-C remain authoritative and must not be redefined by the page spec
- Required document completion counts only approved items; waived items are removed from the denominator
- "Upload/new version" in P0 means registering a local-server document version with relative path metadata
- Submission packages lock referenced document versions, form versions, and key field snapshots; later updates require a new package
- Billing arrears are warning-mode by default and only become a continue flow after explicit risk confirmation is recorded
- After `S9`, all fields except logs are read-only
- Access is constrained by role x group x owner/collaborator visibility

## Edge Cases
- Empty case list with guided create action
- Gate validation failure with highlighted blockers and repair entry points
- Overdue document items that trigger reminders and red highlighting
- Correction notice that spawns correction tasks and links a correction submission package
- Continue submission under arrears status only after risk-confirmation trace is captured
- Archived case read-only state
- Cross-group case creation requiring reason capture and audit trail

## Acceptance Criteria
- The list page presents the specified case fields, default filters, and bulk actions for assignment, deadline adjustment, and task generation
- The detail page exposes the 10 required tabs and surfaces the fields and actions described for each tab
- Creating a case generates a `Case`, creates the template-driven document checklist, and enters `S1`
- Family batch creation creates one case per main applicant and binds required `CaseParty` relations
- Stage advancement and validation behavior align with Gate-A/B/C and produce `ValidationRun` and `SubmissionPackage` records as defined by the authority docs
- Document registration records local archive path and version metadata instead of storing SaaS file binaries
- Finance information supports total / receivable / received / outstanding views plus payment-record entry
- Visibility and editability follow the administrator, lead, assistant, and finance permission matrix

## Unknowns
- None identified from the current P0 authority set.

## Risks
- If prototypes or implementation still use "upload file" terminology, they may drift from the P0 local-archive registration rule
- If P1 workflow-step fields are accidentally surfaced in P0, operators may misread them as active scope
- If server-side Gate enforcement diverges from page behavior, users could see actions that later fail at execution time
