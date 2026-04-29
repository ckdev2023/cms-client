const dashboardWorkItem = {
  statusLabels: {
    highPriority: "高优先",
    needsFollowUp: "待跟进",
    scheduled: "已排期",
    inProgress: "进行中",
    overdue: "已到期",
    daysLeft: "剩余 {days} 天",
    needsRework: "需返工",
    pendingReview: "待复核",
    readyToSubmit: "可提交",
    billingRisk: "收费风险",
    validationRisk: "检查风险",
    highRisk: "高风险",
  },
  actions: {
    viewCase: "查看案件",
    viewTask: "查看任务",
    viewBilling: "查看收费",
  },
  desc: {
    todo: {
      statusPriority: "状态：{status} · 优先级：{priority}",
    },
    deadline: {
      currentStage: "当前阶段：{status}",
    },
    submission: {
      needsRework: "最新检查未通过，需先修正问题后再提交。",
      pendingReview: "检查已通过，待复核确认后可正式提交。",
      approvedReady: "检查与复核均已完成，可安排正式提交。",
      reviewNotPassed: "复核尚未通过，需补充处理后再提交。",
    },
    risk: {
      unpaidAmount: "待收金额 {amount}，需尽快跟进收费。",
      validationFailed: "最新检查未通过，存在阻断项。",
      highRiskGeneric: "案件已被标记为高风险，请优先处理。",
    },
  },
  meta: {
    case: "案件：{caseLabel}",
    owner: "负责人：{name}",
    assignee: "执行人：{name}",
    due: "期限：{date}",
    unpaid: "待收：{amount}",
  },
} as const;

export default dashboardWorkItem;
