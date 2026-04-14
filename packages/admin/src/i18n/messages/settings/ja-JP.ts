const settingsJaJP = {
  title: "システム設定",
  subnav: {
    groupManagement: "グループ管理",
    visibilityConfig: "可視性設定",
    storageRoot: "ローカル資料ルートディレクトリ",
  },
  group: {
    filter: {
      all: "すべて",
      active: "有効",
      disabled: "停止",
    },
    status: {
      active: "有効",
      disabled: "停止",
    },
    columns: {
      name: "グループ名",
      status: "ステータス",
      createdAt: "作成日",
      activeCases: "稼働中案件",
      members: "メンバー",
    },
    empty: {
      title: "グループがありません",
      description: "最初のチームを作成しましょう。",
      createFirst: "最初のグループを作成",
    },
    createButton: "グループを作成",
    detail: {
      backToList: "一覧に戻る",
      groupNo: "グループ番号",
      status: "ステータス",
      members: "メンバー",
      membersEmpty: "メンバーがいません",
      stats: "関連統計",
      customerCount: "関連顧客数",
      activeCaseCount: "関連稼働案件数",
    },
    modal: {
      createTitle: "グループを作成",
      renameTitle: "グループ名を変更",
      nameLabel: "グループ名",
      namePlaceholder: "グループ名を入力",
      cancel: "キャンセル",
      create: "作成",
      rename: "変更",
    },
    disableModal: {
      title: "グループを停止",
      confirmSimple:
        "「{name}」を停止しますか？停止後、新しいオブジェクトでこのグループを選択できなくなります。",
      confirmReferenced:
        "「{name}」は {customerCount} 件の顧客 / {caseCount} 件の案件に関連しています。停止後、新しいオブジェクトでこのグループを選択できなくなりますが、既存の関連は影響を受けません。",
      cancel: "キャンセル",
      confirm: "停止する",
    },
    actions: {
      rename: "名前を変更",
      disable: "停止する",
    },
    memberColumns: {
      name: "氏名",
      role: "ロール",
      joinedAt: "参加日",
    },
  },
  visibility: {
    crossGroupCase: {
      label: "グループ間の案件作成を許可",
      description:
        "有効にすると、担当者は所属グループ以外のグループで案件を作成できます。",
    },
    crossGroupView: {
      label: "担当者がグループ間の協力案件を閲覧可能",
      description:
        "有効にすると、担当者は自分のグループ以外の協力案件を閲覧できます。",
    },
    saveButton: "保存",
  },
  storageRoot: {
    fields: {
      rootLabel: {
        label: "ルートディレクトリ名",
        placeholder: "例: 案件資料総盤",
      },
      rootPath: {
        label: "ルートディレクトリパス / マウントポイント",
        placeholder: "例: \\\\fileserver\\gyosei-docs",
        hint: "管理者のみ閲覧可能",
      },
    },
    pathStrategy:
      "システムは relative_path のみ保存します。業務オブジェクトに絶対パスを記録することは禁止されています。",
    preview: "パスプレビュー",
    previewTemplate: "{root}/{relative_path}",
    updatedBy: "最終更新者",
    updatedAt: "最終更新日時",
    notConfigured: {
      title: "ルートディレクトリ未設定",
      description:
        "ローカル資料ルートディレクトリを設定してください。未設定の場合、資料登録時にローカル帰档は利用できません。",
    },
    saveButton: "保存",
  },
  toast: {
    groupCreated: {
      title: "グループを作成しました（デモ）",
      description: "グループ「{name}」を作成しました",
    },
    groupRenamed: {
      title: "グループ名を変更しました（デモ）",
      description: "「{oldName}」→「{newName}」",
    },
    groupDisabled: {
      title: "グループを停止しました（デモ）",
      description: "「{name}」を停止しました。新規選択不可",
    },
    visibilityUpdated: {
      title: "可視性設定を更新しました（デモ）",
      description: "{item} を{state}しました",
    },
    storageRootUpdated: {
      title: "ルートディレクトリを更新しました（デモ）",
      description: "ルートディレクトリを「{name}」に更新しました",
    },
  },
  permission: {
    denied: "アクセス権限がありません。管理者にお問い合わせください。",
  },
} as const;

export default settingsJaJP;
