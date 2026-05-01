const billingJaJP = {
  list: {
    title: "請求・財務",
    registerPayment: "入金登録",
    summaryLabel: "請求サマリー",
    segments: {
      billingList: "案件請求一覧",
      paymentLog: "入金履歴",
    },
    segmentAriaLabel: "リスト表示切替",
    searchPlaceholder: "検索：案件名 / 顧客名 / 案件番号",
    filters: {
      statusAll: "すべての入金状態",
      statusAriaLabel: "入金状態で絞り込み",
      groupAll: "すべてのグループ",
      groupAriaLabel: "グループで絞り込み",
      ownerAll: "すべての担当者",
      ownerAriaLabel: "担当者で絞り込み",
      reset: "リセット",
      recordCount: "全 {count} 件",
    },
    summary: {
      totalDue: "総請求額 (JPY)",
      totalReceived: "総入金額 (JPY)",
      totalOutstanding: "総未入金額 (JPY)",
      overdueAmount: "期限超過 (JPY)",
    },
    columns: {
      selectAll: "全案件を選択",
      selectRow: "{name} を選択",
      caseName: "案件名",
      client: "顧客",
      group: "グループ",
      amountDue: "請求額(¥)",
      amountReceived: "入金額(¥)",
      amountOutstanding: "未入金額(¥)",
      nextNode: "次の請求ノード",
      status: "入金状態",
      actions: "操作",
    },
    actions: {
      registerPayment: "入金登録",
    },
    status: {
      overdue: "期限超過",
      partial: "一部入金",
      due: "未入金",
      paid: "入金済み",
    },
    groups: {
      "tokyo-1": "東京一組",
      "tokyo-2": "東京二組",
      osaka: "大阪組",
    },
    nodeEmpty: "なし（入金済み）",
    empty: {
      title: "請求レコードがありません",
      description: "案件で請求プランを設定してください。",
      noData: "請求レコードがありません",
      noResultForFilters: "現在の条件に該当する結果がありません",
    },
    bulk: {
      ariaLabel: "一括操作",
      selected: "選択中",
      count: "{count}",
      unit: "件",
      clear: "クリア",
      collect: "一括督促タスク作成",
    },
    pagination: {
      summary: "{start}〜{end} 件目（全 {total} 件）",
      prev: "前へ",
      next: "次へ",
    },
    toast: {
      bulkCollect: {
        title: "督促タスクを作成しました",
        description:
          "成功 {success} 件、スキップ {skipped} 件、失敗 {failed} 件",
      },
      paymentRegistered: {
        title: "入金を登録しました",
        description: "入金の登録が完了しました。",
      },
      voided: {
        title: "無効化しました",
        description: "明細 {id} を無効にしました",
      },
      reversed: {
        title: "取消処理しました",
        description: "明細 {id} を取消処理しました",
      },
    },
    error: {
      loadFailed: "データの読み込みに失敗しました。再度お試しください。",
      retry: "再試行",
    },
  },
  bulkCollect: {
    skipReason: {
      "no-permission": "案件の編集権限がありません",
      "duplicate-task": "未完了の督促タスクが既に存在します",
      "not-overdue": "期限超過の請求ノードがありません",
      "no-assignee": "案件に担当者が設定されていません",
      "system-error": "システムエラー",
    },
    drawer: {
      title: "督促タスク作成結果",
      empty: "明細なし",
      details: "明細",
      successLabel: "成功",
      skippedLabel: "スキップ",
      failedLabel: "失敗",
    },
  },
  paymentLog: {
    columns: {
      amount: "入金額(¥)",
      date: "入金日",
      caseName: "関連案件",
      node: "関連請求ノード",
      receipt: "証憑",
      recordStatus: "記録状態",
      operator: "操作者",
      note: "備考",
      actions: "操作",
    },
    receiptYes: "あり",
    receiptNo: "なし",
    recordStatus: {
      valid: "有効",
      voided: "無効",
      reversed: "取消済み",
    },
    actionVoid: "無効化",
    actionReverse: "取消処理",
    toast: {
      voided: {
        title: "無効化しました",
        description: "明細 {id} を無効にしました",
      },
      reversed: {
        title: "取消処理しました",
        description: "明細 {id} を取消処理しました",
      },
    },
    row: {
      voidedBy: "{name} が無効化",
      reversedBy: "{name} が取消処理",
    },
    empty: {
      title: "入金履歴がありません",
      description: "入金登録後、履歴がここに表示されます。",
    },
  },
  riskAck: {
    modal: {
      title: "請求リスク確認",
      submit: "確認",
      cancel: "キャンセル",
    },
    reasonCode: {
      customer_promise: "顧客が1週間以内の支払いを約束",
      internal_review: "事務所内部審査通過",
      partial_settled: "一部入金済み、残額のリスクは許容範囲",
      other: "その他",
    },
    reasonNote: {
      placeholder: "理由を入力してください（「その他」の場合は必須）",
    },
    evidenceUrl: {
      placeholder: "証拠URL（任意）",
    },
    chip: {
      acknowledged: "リスク確認済み（{date}）",
      notAcknowledged: "リスク未確認",
    },
  },
  paymentModal: {
    title: "入金登録",
    closeAriaLabel: "閉じる",
    hint: "入金情報を入力してください。金額と日付は必須です。",
    fields: {
      amount: "金額 (¥)",
      amountPlaceholder: "入金額を入力",
      amountWarning:
        "金額がノードの未入金残高を超えています。複数に分割して登録することを推奨します。",
      date: "日付",
      node: "関連請求ノード",
      nodePlaceholder: "請求ノードを選択",
      nodeError: "複数の未入金ノードがあります。まずノードを選択してください。",
      receipt: "支払証憑",
      receiptPlaceholder: "証憑番号またはファイル名（後補可）",
      receiptHint: "画像またはPDF対応。後から追加可能です。",
      note: "備考",
      notePlaceholder: "任意：補足説明",
    },
    cancel: "キャンセル",
    submit: "入金登録",
    submitting: "送信中…",
    loadingNodes: "請求ノードを読み込み中…",
    submitError: "入金の登録に失敗しました。再度お試しください。",
  },
  milestone: {
    down_payment: "着手金",
    final_payment: "残金",
    balance: "残額",
    interim_payment: "中間金",
    installment: "分割払い",
  },
} as const;

export default billingJaJP;
