const tasksEnUS = {
  workbench: {
    subtitle:
      "All your pending tasks, due-today items, overdue follow-ups, and renewal reminders in one place. The dashboard 'View to-dos' and 'Fix risk items' links bring you here.",
    refresh: "Refresh",
    reload: "Retry",
    loading: "Loading…",
    errorTitle: "Loading error",
    placeholder: "—",
    lastUpdated: "Last refreshed: {time}",
    notLoaded: "Not loaded yet",
    panelCount: "Showing {visible} / {total}",
    views: {
      pending: {
        title: "Pending tasks",
        hint: "See tasks that are not started yet and currently in progress in one list.",
        panelTitle: "Pending tasks",
      },
      today: {
        title: "Due today",
        hint: "Clear actions that must close today first.",
        panelTitle: "Tasks due today",
      },
      overdue: {
        title: "Overdue",
        hint: "Pull out overdue chasers and missing-document follow-ups.",
        panelTitle: "Overdue tasks",
      },
      reminders: {
        title: "Reminder log",
        hint: "Verify renewal reminders have been generated and queued.",
        panelTitle: "Reminder log",
      },
    },
    reminderTable: {
      headerTitle: "Reminder",
      headerTime: "Remind at",
      headerStatus: "Status",
      headerMeta: "Details",
      empty:
        "No reminder logs yet. Once renewal reminders are generated, the 180 / 90 / 30 day records will appear here.",
    },
    taskTable: {
      headerTask: "Task",
      headerCase: "Case / Owner",
      headerDue: "Due",
      headerStatus: "Status",
      headerPriority: "Priority",
      headerActions: "Actions",
      unassigned: "Unassigned",
      complete: "Mark complete",
      overdueBadge: "Overdue",
      overdueA11yLabel: "This task is overdue",
      empty:
        "No tasks match this view. Switch to the reminder log to confirm renewal reminders have been generated.",
    },
    toast: {
      completedTitle: "Task completed",
      completedDescription:
        "'{title}' has been closed; dashboard counts and case progress will update accordingly.",
      completedFallbackTitle: "Task",
      failedTitle: "Could not complete task",
      failedDescription:
        "The action did not go through. Please refresh and try again.",
    },
    aside: {
      title: "How to use this page",
      copy: "This page is connected directly to your live task list and renewal reminder records — what you see here is real, ongoing office data, not a sample.",
      list: {
        item1:
          "The four cards above (Pending / Due today / Overdue / Reminder log) sort tasks automatically by status and due date — no manual filtering needed.",
        item2:
          "Reminder log shows, for each renewal reminder, when it should fire, whether it has been sent, and which case and applicant it is about.",
        item3:
          "Press 'Mark complete' on any row, and the task is closed across the whole office system — dashboard counts and case progress update automatically.",
      },
    },
  },
  taskStatus: {
    pending: "Pending",
    in_progress: "In progress",
    completed: "Completed",
    cancelled: "Cancelled",
  },
  priority: {
    low: "Low",
    normal: "Normal",
    high: "High",
    urgent: "Urgent",
  },
  reminderStatus: {
    pending: "Queued",
    sent: "Sent",
    failed: "Failed",
    canceled: "Canceled",
  },
  reminderTitle: {
    daysBefore: "{visa}Renewal reminder {days} days before expiry",
    daysBeforeNoVisa: "Renewal reminder {days} days before expiry",
    pendingCoeDate: "Renewal reminder waiting for COE date",
    case: "Case {caseNo} · {title}",
    fallback: "{type} · {id}",
  },
  reminderMeta: {
    case: "Case {id}",
    recipient: "Recipient {id}",
    dedupeKey: "Dedupe key {key}",
    empty: "—",
  },
} as const;

export default tasksEnUS;
