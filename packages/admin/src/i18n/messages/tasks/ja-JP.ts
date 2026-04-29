const tasksJaJP = {
  workbench: {
    subtitle:
      "タスクと更新リマインダーログを確認し、ダッシュボード CTA と Step 19-20 の業務面を引き継ぎます。",
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
        hint: "pending / in_progress のタスクをまとめて確認します。",
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
      empty:
        "現在のビューには該当タスクがありません。「リマインダーログ」に切り替えて更新リマインダーが生成されているか確認できます。",
    },
    aside: {
      title: "業務面の説明",
      copy: "このページは実 `GET /api/tasks` と `GET /api/reminders` に接続済みで、プレースホルダーではありません。",
      list: {
        item1:
          "「未処理 / 本日期限 / 遅延」はタスク状態と期限に基づきリアルタイムで分類されます。",
        item2:
          "「リマインダーログ」では更新リマインダーの remindAt、送信ステータス、payload 概要を表示します。",
        item3:
          "個々のタスクは `/api/tasks/:id/complete` を直接呼び出して完了にできます。",
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
