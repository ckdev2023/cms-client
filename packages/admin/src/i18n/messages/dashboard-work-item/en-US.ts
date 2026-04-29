const dashboardWorkItem = {
  statusLabels: {
    highPriority: "High priority",
    needsFollowUp: "Needs follow-up",
    scheduled: "Scheduled",
    inProgress: "In progress",
    overdue: "Overdue",
    daysLeft: "{days} days left",
    needsRework: "Needs rework",
    pendingReview: "Pending review",
    readyToSubmit: "Ready to submit",
    billingRisk: "Billing risk",
    validationRisk: "Validation risk",
    highRisk: "High risk",
  },
  actions: {
    viewCase: "View case",
    viewTask: "View task",
    viewBilling: "View billing",
  },
  desc: {
    todo: {
      statusPriority: "Status: {status} · Priority: {priority}",
    },
    deadline: {
      currentStage: "Current phase: {status}",
    },
    submission: {
      needsRework:
        "The latest validation did not pass. Fix issues before submitting.",
      pendingReview:
        "Validation passed. Awaiting reviewer confirmation before submission.",
      approvedReady: "Validation and review are complete. Ready to submit.",
      reviewNotPassed:
        "Review has not passed yet. Address feedback before submission.",
    },
    risk: {
      unpaidAmount: "Unpaid amount {amount}. Follow up on billing soon.",
      validationFailed:
        "The latest validation failed. There are blocking issues.",
      highRiskGeneric:
        "This case is flagged as high risk. Please handle it first.",
    },
  },
  meta: {
    case: "Case: {caseLabel}",
    owner: "Owner: {name}",
    assignee: "Assignee: {name}",
    due: "Due: {date}",
    unpaid: "Unpaid: {amount}",
  },
} as const;

export default dashboardWorkItem;
