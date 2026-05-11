const caseTemplatesJaJP = {
  title: "案件テンプレート",
  subtitle:
    "案件作成時に資料チェックリストを自動生成するためのブループリントテンプレートを管理します。",
  breadcrumb: "案件テンプレート",
  columns: {
    templateName: "テンプレート名",
    caseType: "案件タイプ",
    applicationType: "申請タイプ",
    blueprintItems: "チェックリスト項目数",
    reviewRequired: "レビュー必須",
    billingGate: "請求ゲート",
    active: "ステータス",
    updatedAt: "最終更新",
  },
  status: {
    active: "有効",
    inactive: "無効",
  },
  reviewFlag: {
    yes: "はい",
    no: "いいえ",
  },
  empty: {
    title: "案件テンプレートが見つかりません",
    description:
      "案件テンプレートは各案件タイプの資料チェックリストブループリントを定義します。シードスクリプトを実行するかテンプレートを作成してください。",
  },
  filters: {
    caseTypeAll: "すべての案件タイプ",
    includeInactive: "無効も表示",
  },
  state: {
    loading: "案件テンプレートを読み込み中…",
    unauthorized: "案件テンプレートを閲覧する権限がありません。",
    requestFailed:
      "案件テンプレートの読み込みに失敗しました。もう一度お試しください。",
    retry: "再読み込み",
  },
  noItems: "—",
  applicationType: {
    none: "—",
  },
  actions: {
    create: "新規テンプレート",
    toggleActive: "有効/無効の切替",
    activate: "有効にする",
    deactivate: "無効にする",
    importBlueprint: "ブループリント JSON をインポート",
  },
  createDialog: {
    title: "新規案件テンプレート",
    description:
      "テンプレート名、案件タイプを定義し、必要に応じてブループリントをインポートしてください。",
    templateNameLabel: "テンプレート名",
    templateNamePlaceholder: "例: 家族滞在（新規申請）",
    caseTypeLabel: "案件タイプコード",
    caseTypePlaceholder: "例: dependent_visa",
    applicationTypeLabel: "申請タイプ（任意）",
    applicationTypePlaceholder: "例: initial / renewal / change",
    reviewRequiredLabel: "レビュー必須",
    billingGateModeLabel: "請求ゲートモード",
    billingGateModes: {
      warn: "警告",
      block: "ブロック",
      none: "なし",
    },
    blueprintLabel: "チェックリストブループリント（JSON）",
    blueprintPlaceholder:
      '{ "items": [ { "code": "passport", "name": "パスポート" } ] }',
    blueprintFileHint: ".json ファイルをドラッグまたは選択できます",
    cancel: "キャンセル",
    submit: "作成",
    submitting: "作成中…",
  },
  writeState: {
    success: "テンプレートを保存しました。",
    unauthorized: "テンプレートを変更する権限がありません。",
    validation: "入力内容が正しくありません。フォームを確認してください。",
    requestFailed: "テンプレートの保存に失敗しました。もう一度お試しください。",
    toggleSuccess: "テンプレートのステータスを更新しました。",
  },
} as const;

export default caseTemplatesJaJP;
