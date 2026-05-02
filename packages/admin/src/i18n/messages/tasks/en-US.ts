const tasksEnUS = {
  workbench: {
    subtitle:
      "Review the task pool and renewal reminder log; this is the workbench picked up from the dashboard CTA and Step 19-20.",
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
        hint: "Review pending and in-progress tasks together.",
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
      empty:
        "No tasks match this view. Switch to the reminder log to confirm renewal reminders have been generated.",
    },
    aside: {
      title: "Workbench notes",
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
