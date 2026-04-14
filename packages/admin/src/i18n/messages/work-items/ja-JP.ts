const dashboardWorkItems = {
  mine: {
    todo: {
      uploadReceipt: {
        title: "李美玲 家族滞在の補完受領書をアップロード",
        meta: {
          caseId: "CASE-2409",
          owner: "担当: 陳静",
          time: "本日 11:00",
        },
        desc: "受領書をアップロードすると補完待ち状態を解除でき、担当者に再確認継続を通知できます。",
        statusLabel: "本日必須対応",
        action: "受領書をアップロード",
      },
      chaseVisaDocs: {
        title: "佐藤健の在留資格変更資料を督促",
        meta: {
          caseId: "CASE-2416",
          owner: "協力: アシスタント A",
          time: "本日 14:30",
        },
        desc: "在職証明書と住民票が未提出のため、まず督促タスクを作成しリマインド送信を推奨します。",
        statusLabel: "督促中",
        action: "督促を作成",
      },
      billingReceipt: {
        title: "高桥优の請求証憑の着金確認",
        meta: {
          caseId: "CASE-2398",
          owner: "請求タイミング",
          time: "本日 17:00",
        },
        desc: "未着金のままなら、入金待ち一覧に督促タスクを登録する必要があります。",
        statusLabel: "入金に影響",
        action: "入金を記録",
      },
    },
    deadlines: {
      wangRenewal: {
        title: "王欣 技人国更新",
        meta: {
          caseId: "CASE-2421",
          owner: "担当: 陳静",
          due: "期限: 4/12",
        },
        desc: "提出期限まで残り 3 日です。資料は揃っているため、早めに確認・提出へ進めるのが安全です。",
        statusLabel: "3日以内に期限",
        action: "フォローを作成",
      },
      zhangFamilyRenewal: {
        title: "张宁 家族滞在更新",
        meta: {
          caseId: "CASE-2411",
          owner: "担当: 陳静",
          due: "期限: 4/16",
        },
        desc: "補完資料は揃っており、主申請者と関連者の資料整合性を再確認する必要があります。",
        statusLabel: "7日以内に期限",
        action: "案件を見る",
      },
      yamadaPermanent: {
        title: "山田翔 永住申請",
        meta: {
          caseId: "CASE-2389",
          owner: "担当: 陳静",
          due: "期限: 4/28",
        },
        desc: "今月中に審査表と費用説明の準備を前倒しで進める必要があります。",
        statusLabel: "今後1か月",
        action: "フォローを作成",
      },
    },
    submissions: {
      wangSubmit: {
        title: "王欣 技人国更新",
        meta: {
          caseId: "CASE-2421",
          ready: "資料完備",
          blocker: "阻害項目: 0",
        },
        desc: "資料は揃っており、そのまま提出フローへ進んで提出パックを生成できます。",
        statusLabel: "提出可能",
        action: "提出へ進む",
      },
      zhangSubmit: {
        title: "张宁 家族滞在更新",
        meta: {
          caseId: "CASE-2411",
          ready: "資料完備",
          blocker: "要再確認: 配偶者資料",
        },
        desc: "レビュー工程を有効にしている場合は、先にレビュアーを割り当ててから提出できます。",
        statusLabel: "提出可能",
        action: "提出パックを生成",
      },
    },
    risks: {
      takaRenewalRisk: {
        title: "高桥优 高度人才更新",
        meta: {
          caseId: "CASE-2398",
          risk: "未入金リスク",
          amount: "未収金額: JPY 180,000",
        },
        desc: "請求タイミングは到来していますが未清算のため、督促登録と不要な進行停止が必要です。",
        statusLabel: "高リスク",
        action: "入金を記録",
      },
      liCorrectionRisk: {
        title: "李美玲 家族滞在補正",
        meta: {
          caseId: "CASE-2409",
          blocker: "阻害項目: 1",
          due: "期限: 4/15",
        },
        desc: "補正資料の欠落は提出を止めるため、すぐに資料一覧で該当箇所を特定する必要があります。",
        statusLabel: "強い阻害",
        action: "阻害項目を確認",
      },
    },
  },
  group: {
    todo: {
      groupTodoOverview: {
        title: "東京一組の本日対応サマリー",
        meta: {
          count: "14 件のアクション",
          owners: "担当者: 3 名",
          priority: "本日タスクの解消を優先",
        },
        desc: "本日のタスク量が多いため、まず補完受領書と期限前督促の解消を優先すると効果的です。",
        statusLabel: "組内サマリー",
        action: "一括完了",
      },
      submissionReview: {
        title: "提出待ち案件の集中レビュー",
        meta: {
          count: "5 件の案件",
          owners: "担当者: 2 名",
          time: "本日中にレビュー配置",
        },
        desc: "レビュー時間帯をまとめて確保し、案件が締切直前に集中しないようにします。",
        statusLabel: "要調整",
        action: "提出へ進む",
      },
    },
    deadlines: {
      groupUrgentDue: {
        title: "東京一組の 3 日以内期限案件",
        meta: {
          count: "2 件の案件",
          cases: "CASE-2421 / CASE-2430",
          owners: "担当: 陳静 / 小林",
        },
        desc: "提出資料と受領書を同期させるため、即時にフォロータスク作成が必要です。",
        statusLabel: "高優先度",
        action: "一括フォロー",
      },
      groupWeekDue: {
        title: "組内の直近 7 日期限案件",
        meta: {
          count: "6 件の案件",
          types: "家族滞在 / 技人国 を含む",
          stage: "多くが補完終盤",
        },
        desc: "本日中に担当者確定と補完督促を完了させるのが望ましいです。",
        statusLabel: "直近7日",
        action: "タスクを作成",
      },
      groupMonthDue: {
        title: "組内の今後 1 か月期限案件",
        meta: {
          count: "追加 4 件",
          schedule: "前倒しで日程調整",
          types: "永住申請を含む",
        },
        desc: "1か月表示に切り替えると、今後のスケジュールをより早く組み立てられます。",
        statusLabel: "今後1か月",
        action: "案件を見る",
      },
    },
    submissions: {
      groupSubmissions: {
        title: "組内の提出待ち案件",
        meta: {
          count: "5 件の案件",
          ready: "提出継続可能",
          review: "レビュー統一推奨",
        },
        desc: "テンプレートで提出パックをまとめて生成し、繰り返し作業を減らせます。",
        statusLabel: "一括推進可能",
        action: "提出パックを生成",
      },
    },
    risks: {
      groupRisks: {
        title: "東京一組のリスク案件",
        meta: {
          count: "4 件の案件",
          blockers: "強い阻害 2 件",
          billing: "未入金リスク 2 件",
        },
        desc: "まず各案件に明確な担当者を割り当て、その後にタスクを分解するのが有効です。",
        statusLabel: "担当割当が必要",
        action: "一括割当",
      },
    },
  },
  all: {
    todo: {
      firmTodoOverview: {
        title: "事務所全体の本日対応量",
        meta: {
          count: "41 件のアクション",
          groups: "5 組を対象",
          scope: "事務所全体表示",
        },
        desc: "ログイン直後に本日の緊急度分布を素早く把握するのに適しています。",
        statusLabel: "全体サマリー",
        action: "タスクを見る",
      },
    },
    deadlines: {
      firmWeekDue: {
        title: "事務所全体の 7 日以内期限案件",
        meta: {
          count: "19 件の案件",
          groups: "3 組に集中",
          schedule: "統一日程調整が必要",
        },
        desc: "まず期限圧力を把握し、その後案件一覧でさらに調整する流れに向いています。",
        statusLabel: "全体の期限接近",
        action: "フォローを作成",
      },
      firmMonthDue: {
        title: "事務所全体の今後 1 か月期限案件",
        meta: {
          count: "追加 11 件",
          schedule: "長期日程の注意喚起",
          priority: "前倒し調整推奨",
        },
        desc: "今後1か月で補完または提出段階へ入る案件を前倒しで把握できます。",
        statusLabel: "今後1か月",
        action: "案件を見る",
      },
    },
    submissions: {
      firmSubmissions: {
        title: "事務所全体の提出待ち案件",
        meta: {
          count: "10 件の案件",
          groups: "組単位で分割推進可能",
          review: "レビュー時間の統一推奨",
        },
        desc: "案件一覧と組み合わせて担当者や工程別にさらに絞り込めます。",
        statusLabel: "全体の提出待ち",
        action: "提出へ進む",
      },
    },
    risks: {
      firmRisks: {
        title: "事務所全体のリスク案件",
        meta: {
          count: "9 件の案件",
          highRisk: "高リスク 4 件",
          mix: "未入金と阻害が重複",
        },
        desc: "まず阻害解消、補正期限接近、入金督促の 3 種に分けて対応すると整理しやすいです。",
        statusLabel: "管理重点",
        action: "阻害項目を確認",
      },
    },
  },
} as const;

export default dashboardWorkItems;
