# Requirement Summary

## Business Goal
Define the frozen P0 `任务与提醒` module page specification so the firm can manage individual and team tasks plus internal reminders that help drive case progression.

Limit the scope to task CRUD, status tracking, internal due-date reminders, and basic auto-generated follow-up tasks without introducing configurable reminder engines or external channels.

## User Story
As a lead owner or assistant, I need to see my pending work, handle overdue tasks, create follow-up tasks, complete assigned work, and review reminder history so case operations continue moving on time.

## In Scope
- Task list page fields, default filters, and bulk actions
- Workbench views for my tasks, due today, and overdue tasks
- Task detail showing description, related case, assignee, due date, and operation record
- Reminder log for internal notifications with send time, recipient, and status
- Task creation, assignment, completion, due-date adjustment, and cancellation
- System auto-generation of tasks from template-based case creation and correction notices
- Internal reminder behavior for key due dates and escalation from client non-response to responsible owner reminder
- Permission model for administrator, lead owner, and assistant visibility/editability

## Out of Scope
- Custom reminder-rule configuration
- External channels such as email, IM, or SMS
- Advanced multi-level escalation chains
- This-week due view
- Kanban-style or advanced workbench views

## Business Rules
- P0 uses internal notifications as the primary reminder channel and does not depend on external delivery
- Tasks support the states `todo`, `doing`, `done`, and `canceled`
- Canceling a task requires a reason and must leave an audit record
- Overdue unfinished tasks are highlighted and surfaced as dashboard risk signals
- System-generated tasks after template case creation or correction notice must avoid duplicate generation
- Key reminder categories are residence expiry, supplement due date, submission due date, and billing milestone
- Basic escalation is limited to "client did not respond -> remind responsible owner"
- All reminder delivery attempts must leave traces in the reminder log/audit trail
- Task visibility and editability are constrained by role, group, and case context

## Edge Cases
- Empty task state with guided "暂无待办" feedback
- Overdue tasks highlighted in red and counted into risk exposure
- Duplicate prevention for bulk auto-generated tasks after template creation or supplement notice
- Reminder delivery failure with failure reason captured in reminder log
- Batch cancel action requiring reasons

## Acceptance Criteria
- The list page renders the required task fields, default filters, and bulk actions
- The module exposes workbench views for my tasks, due today, and overdue tasks
- Task detail shows description, related case link, assignee, due date, and operation record
- Reminder log records internal notification send time, recipient, and status
- Users with the right role can create, assign, complete, adjust due date, and cancel tasks according to the permission matrix
- Auto-generated tasks are created from template case creation and correction notice flows without unwanted duplicates
- Overdue tasks and reminder failures are visibly represented in the module
- P0 behavior remains limited to internal reminders and excludes configurable rules and external channels

## Unknowns
- None identified from the current P0 authority set.

## Risks
- If implementation adds external reminders or configurable reminder logic here, it will exceed the frozen P0 boundary
- If system-generated tasks are not deduplicated, users may receive repeated operational work items
- If reminder traces are not preserved, the module will drift from the audit-first requirement set
