const tasksJaJP = {
  workbench: {
    subtitle:
      "今日対応すべきタスクや期限切れ・更新リマインダーをまとめて確認できます。ダッシュボードの「未処理を見る」「リスク項目を修正」からもここに来られます。",
    refresh: "更新",
    reload: "再読み込み",
    loading: "読み込み中…",
    errorTitle: "読み込みエラー",
    placeholder: "—",
    lastUpdated: "最終更新: {time}",
    notLoaded: "未読み込み",
    panelCount: "{visible} / {total} 件を表示",
    views: {
      pending: {
        title: "未処理タスク",
        hint: "未着手のタスクと対応中のタスクをまとめて確認します。",
        panelTitle: "未処理タスク",
      },
      today: {
        title: "本日期限",
        hint: "本日中に終わらせるべきアクションを優先します。",
        panelTitle: "本日期限のタスク",
      },
      overdue: {
        title: "遅延",
        hint: "期限超過の催促や追加資料を先に取り出します。",
        panelTitle: "遅延中のタスク",
      },
      reminders: {
        title: "リマインダーログ",
        hint: "更新リマインダーが生成され、キューに入ったか確認します。",
        panelTitle: "リマインダーログ",
      },
    },
    reminderTable: {
      headerTitle: "リマインダー内容",
      headerTime: "リマインダー時刻",
      headerStatus: "ステータス",
      headerMeta: "付加情報",
      empty:
        "現在リマインダーログはありません。更新リマインダーが生成されると、180 / 90 / 30 日前のリマインダーがここに表示されます。",
    },
    taskTable: {
      headerTask: "タスク",
      headerCase: "案件 / 担当者",
      headerDue: "期限",
      headerStatus: "ステータス",
      headerPriority: "優先度",
      headerActions: "操作",
      unassigned: "未割当",
      complete: "完了にする",
      overdueBadge: "遅延",
      overdueA11yLabel: "このタスクは期限を超過しています",
      empty:
        "現在のビューには該当タスクがありません。「リマインダーログ」に切り替えて更新リマインダーが生成されているか確認できます。",
    },
    toast: {
      completedTitle: "タスクを完了しました",
      completedDescription:
        "「{title}」を締め、ダッシュボードと案件進捗も同期更新されます。",
      completedFallbackTitle: "タスク",
      failedTitle: "タスク完了に失敗しました",
      failedDescription:
        "操作が反映されていません。再読み込み後に再試行してください。",
    },
    aside: {
      title: "このページの使い方",
      copy: "このページは「タスク台帳」と「更新リマインダー台帳」に直接つながっており、表示されているのは事務所で実際に進行中のデータです。サンプルではありません。",
      list: {
        item1:
          "上部4枚のカード（未処理 / 本日期限 / 遅延 / リマインダーログ）は、タスクの状態と期限日に基づき自動で振り分けられます。手作業でのフィルタは不要です。",
        item2:
          "「リマインダーログ」では、各更新リマインダーについて、いつ通知すべきか・送信済みか・どの案件のどの申請者宛か、を一目で確認できます。",
        item3:
          "各タスク右側の「完了にする」を押すと、その案件は事務所全体のシステムで一括して締められ、ダッシュボードの未処理件数や案件詳細の進捗も自動で 1 件減ります。",
      },
    },
  },
  taskStatus: {
    pending: "未処理",
    in_progress: "対応中",
    completed: "完了",
    cancelled: "キャンセル",
  },
  priority: {
    low: "低",
    normal: "通常",
    high: "高",
    urgent: "緊急",
  },
  reminderStatus: {
    pending: "未送信",
    sent: "送信済",
    failed: "送信失敗",
    canceled: "キャンセル",
  },
  reminderTitle: {
    daysBefore: "{visa}期限の {days} 日前リマインダー",
    daysBeforeNoVisa: "期限の {days} 日前リマインダー",
    pendingCoeDate: "COE 日付の入力待ち更新リマインダー",
    case: "案件 {caseNo} · {title}",
    fallback: "{type} · {id}",
  },
  reminderMeta: {
    case: "案件 {id}",
    recipient: "宛先 {id}",
    dedupeKey: "重複防止キー {key}",
    empty: "—",
  },
} as const;

export default tasksJaJP;
