const dashboardWorkItem = {
  statusLabels: {
    highPriority: "優先度：高",
    needsFollowUp: "フォロー待ち",
    scheduled: "予定済み",
    inProgress: "進行中",
    overdue: "期限超過",
    daysLeft: "残り {days} 日",
    needsRework: "差戻し対応",
    pendingReview: "再確認待ち",
    readyToSubmit: "提出可能",
    billingRisk: "請求リスク",
    validationRisk: "チェックリスク",
    highRisk: "高リスク",
  },
  actions: {
    viewCase: "案件を見る",
    viewTask: "タスクを見る",
    viewBilling: "請求を見る",
  },
  desc: {
    todo: {
      statusPriority: "ステータス：{status} · 優先度：{priority}",
    },
    deadline: {
      currentStage: "現在のフェーズ：{status}",
    },
    submission: {
      needsRework: "直近のチェックで指摘あり。修正してから提出してください。",
      pendingReview: "チェック通過済み。再確認のうえ提出に進めます。",
      approvedReady: "チェックと再確認が完了。正式提出に進めます。",
      reviewNotPassed: "再確認が未通過。追加対応のうえ提出してください。",
    },
    risk: {
      unpaidAmount: "未収金 {amount}。早めに請求対応を進めてください。",
      validationFailed: "直近のチェックが未通過。停止要因があります。",
      highRiskGeneric:
        "高リスク案件として扱われています。優先対応してください。",
    },
  },
  meta: {
    case: "案件：{caseLabel}",
    owner: "担当：{name}",
    assignee: "対応者：{name}",
    due: "期限：{date}",
    unpaid: "未収：{amount}",
  },
} as const;

export default dashboardWorkItem;
