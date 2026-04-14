import customerDetail from "./customers/ja-JP";
import billing from "./billing/ja-JP";
import cases from "./cases/ja-JP";
import documents from "./documents/ja-JP";
import leads from "./leads/ja-JP";
import dashboardWorkItems from "./work-items/ja-JP";

const jaJP = {
  shell: {
    topbar: {
      openNavigation: "ナビゲーションを開く",
      globalSearch: "グローバル検索",
      searchPlaceholder: "検索: 顧客 / 案件 / 資料 / 書類...",
      localeLabel: "表示言語",
      createLead: "相談を新規作成",
      createCase: "案件を新規作成",
    },
    nav: {
      asideLabel: "サイドナビゲーション",
      mainLabel: "メインナビゲーション",
      closeNavigation: "ナビゲーションを閉じる",
      brandChip: "事務所管理",
      groups: {
        workspace: "ワークスペース",
        business: "業務",
        content: "コンテンツ",
        finance: "財務",
        system: "システム",
      },
      items: {
        dashboard: "ダッシュボード",
        leads: "相談・会話",
        customers: "顧客",
        cases: "案件",
        tasks: "タスク・リマインド",
        documents: "資料センター",
        billing: "請求・財務",
        settings: "設定",
      },
    },
  },
  foundation: {
    title: "Foundation",
    subtitle: "Shell と shared UI primitives の参照ページ",
    button: "Button",
    buttons: {
      primary: "主要",
      outlined: "アウトライン",
      ghost: "ゴースト",
    },
    chip: "Chip",
    chips: {
      default: "標準",
      primary: "Primary",
      success: "成功",
      warning: "警告",
      danger: "危険",
    },
    searchField: "SearchField",
    searchPlaceholder: "検索サンプル…",
  },
  sectionPlaceholder: {
    badge: "準備中",
    subtitle:
      "{section} のルートは登録済みで、今後ここに正式な業務画面を実装します。",
    cardTitle: "ページ状態",
    description:
      "{section} のサイドバー遷移を有効に保ち、正式モジュール実装まで未一致ルート警告を出さないためのプレースホルダーです。",
    pathLabel: "現在のパス",
  },
  customers: {
    list: {
      title: "顧客",
      subtitle: "顧客プロフィール、連絡先、関連案件を管理します。",
      placeholderMessage: "顧客一覧は準備中です。",
      addCustomer: "顧客を追加",
      summaryTitle: "顧客ワーク概要",
      summarySubtitle:
        "担当者が手持ちの顧客と案件の負荷を素早く把握できるサマリーカードです。",
      summary: {
        mine: {
          label: "自分の顧客",
          hint: "ログイン中のユーザーに割り当てられた顧客数です。今日フォローすべき対象を確認できます。",
        },
        group: {
          label: "組の顧客",
          hint: "組全体の顧客数です。割当や転派の判断材料として活用できます。",
        },
        active: {
          label: "活動中案件あり",
          hint: "進行中の案件がある顧客数です。直近の連絡や補件を優先確認できます。",
        },
        noActive: {
          label: "活動中案件なし",
          hint: "未起案または完了済みの顧客数です。再訪問・再契約推進の対象です。",
        },
      },
      scopeLabel: "データ範囲",
      scope: {
        mine: "自分",
        group: "所属組",
        all: "全所（管理者）",
      },
      searchPlaceholder: "検索：顧客名 / フリガナ / 電話 / メール",
      filters: {
        groupAll: "所属グループ：全部",
        ownerAll: "担当者：全部",
        activeCasesAll: "活動中案件：全部",
        activeCasesYes: "活動中案件あり",
        activeCasesNo: "活動中案件なし",
        reset: "リセット",
      },
      filterSummary: "現在の表示：{scope} · {count} 件",
      columns: {
        customer: "顧客",
        furigana: "フリガナ",
        cases: "案件",
        lastContact: "最終連絡",
        owner: "担当者",
        referral: "紹介元",
        group: "所属グループ",
        actions: "操作",
      },
      selectAll: "すべて選択",
      selectRow: "{name} を選択",
      casesSummary: "累計 {total} · 活動中 {active}",
      bulk: {
        label: "一括操作",
        selected: "{count} 件選択中",
        clear: "クリア",
        assignOwner: "担当者を割当",
        selectOwner: "担当者を選択",
        changeGroup: "グループを変更",
        selectGroup: "グループを選択",
        apply: "適用",
      },
      empty: {
        title: "条件に一致する顧客がありません",
        description:
          "データ範囲を切り替えるか、検索条件をリセットしてください。",
      },
      pagination: {
        summary: "{start}〜{end} 件目（全 {total} 件）",
        prev: "前へ",
        next: "次へ",
      },
      actions: {
        viewDetail: "顧客詳細を開く",
        createCase: "この顧客で案件を開始",
      },
      toast: {
        customerCreated: {
          title: "顧客を作成しました（デモ）",
          description: "顧客ファイルを作成済みです。案件を開始できます",
        },
        draftSaved: {
          title: "下書きを保存しました",
          description: "顧客一覧の「続ける」から登録を完了できます",
        },
        draftLoaded: {
          title: "下書きを読み込みました",
          description: "入力を完了して顧客を作成してください",
        },
        bulkAssign: {
          title: "一括割当（デモ）",
          description: "{count} 件選択中、担当者：{owner}",
        },
        bulkGroup: {
          title: "一括グループ変更（デモ）",
          description: "{count} 件選択中、グループ：{group}（記録必須）",
        },
      },
      draft: {
        rowLabel: "下書き",
        continue: "続ける",
        remove: "削除",
      },
      createModal: {
        title: "個人顧客を新規作成",
        description:
          "基本情報を入力して顧客を登録します。重複防止のため電話またはメールの入力が必要です。",
        fields: {
          displayName: "表示名（社内用）",
          displayNamePlaceholder: "例：王伟（就労）",
          group: "所属グループ",
          groupPlaceholder: "グループを選択",
          legalName: "氏名（法定）",
          legalNamePlaceholder: "氏名を入力",
          kana: "フリガナ",
          kanaPlaceholder: "例：ワン ウェイ",
          gender: "性別",
          genderDefault: "指定なし",
          genderMale: "男",
          genderFemale: "女",
          birthDate: "生年月日",
          nationality: "国籍",
          nationalityPlaceholder: "例：中国 / 日本",
          phone: "電話",
          phonePlaceholder: "携帯 / 固定電話",
          phoneHint: "電話またはメールが必須です（重複防止・連絡用）",
          email: "メール",
          emailPlaceholder: "メールアドレス",
          referrer: "紹介元 / 来源",
          referrerPlaceholder: "例：紹介 / 広告",
          avatar: "アバター",
          note: "備考（検索可）",
          notePlaceholder: "例：引継ぎ事項、注意点...",
        },
        dedupe: {
          title: "重複の可能性があります",
          description:
            "同一人物かどうか確認してください。保存前にグローバル検索で照合もできます。",
        },
        cancel: "キャンセル",
        saveDraft: "下書き保存",
        create: "顧客を作成",
      },
    },
    detail: customerDetail,
  },
  billing,
  cases,
  documents,
  leads,
  dashboard: {
    hero: {
      kicker: "Dashboard",
      title: "おはようございます、{name} ・ {role}",
      role: "担当者",
      subtitle:
        "今日は、今日中の対応、期限超過・期限接近、提出待ち、リスク案件から優先して確認しましょう。",
    },
    filters: {
      scopeLabel: "表示範囲",
      groupLabel: "グループ絞り込み",
      groups: {
        all: "全グループ",
        tokyo1: "東京一組",
        tokyo2: "東京二組",
        osaka: "大阪組",
      },
    },
    scope: {
      mine: "自分",
      group: "所属組",
      all: "事務所全体",
    },
    scopeSummary: {
      mine: "自分が担当または関与している案件とタスクを表示します。カードと一覧が同時に更新されます。",
      group:
        "所属組の案件とタスクを表示します。今日の優先順位と期限圧力を一緒に調整できます。",
      all: "事務所全体を表示します。対応事項、期限、提出待ち、リスク分布を素早く確認できます。",
    },
    quickActions: {
      title: "クイックアクション",
      subtitle: "まずは「次の一手」をクリック可能で追跡可能な状態にします。",
      viewMyTasks: "自分のタスクを見る",
      timeRange: "期間",
      dayUnit: "{count}日",
      cards: {
        createLead: {
          title: "相談リードを作成",
          desc: "まず相談を受け付け、その後に顧客や案件へ転換します",
        },
        createCustomer: {
          title: "顧客を作成",
          desc: "個人顧客の基本情報をすばやく登録します",
        },
        createCase: {
          title: "案件を作成",
          desc: "テンプレートから初期チェックリストを自動生成します",
        },
        dueSoon: {
          title: "期限対応へ進む",
          desc: "不足資料、補正、期限を一箇所に集約します",
        },
      },
      inlineActions: {
        createFollowUp: "フォローアップタスクを作成",
        completeToday: "今日のタスクを一括完了",
        goSubmit: "確認・提出へ進む",
        addReceipt: "入金登録 / 受領書アップロード",
      },
    },
    summary: {
      cards: {
        todayTasks: {
          label: "本日の対応",
          statusLabel: "主要アクション",
          helper: "本日中に処理すべきタスク、フォロー、督促です。",
          meta: "本日対応分",
          action: "一括完了",
        },
        upcomingCases: {
          label: "期限超過 / 期限接近",
          statusLabel: "期限優先",
          helper:
            "まず期限超過案件を解消し、その後 7 日 / 30 日以内に期限が来る案件を整理します。",
          meta: "期限ウィンドウ集計",
          action: "期限接近案件を見る",
        },
        pendingSubmissions: {
          label: "提出待ち案件",
          statusLabel: "提出可能",
          helper:
            "資料とチェックが完了しており、そのまま再確認と提出に進めます。",
          meta: "提出待ち",
          action: "提出へ進む",
        },
        riskCases: {
          label: "リスク案件",
          statusLabel: "優先対応",
          helper:
            "まずは停止要因、補正期限接近、不足資料、未入金リスクを解消します。",
          meta: "要修正の詰まり",
          action: "リスク項目を修正",
        },
      },
    },
    panels: {
      todayTodo: {
        tag: "Top Priority",
        title: "本日の対応",
        subtitle:
          "本日中に完了が必要な督促、受領書アップロード、不足資料、請求確認を優先します。",
        action: "一括完了",
        emptyMessage:
          "本日の対応はありません。全案件一覧へ進み、次の優先事項を確認してください。",
      },
      deadlines: {
        tag: "Deadlines",
        title: "期限超過 / 期限接近",
        subtitle:
          "まず期限超過を解消し、その後 7 日 / 30 日以内の案件を確認します。",
        action: "期限接近案件を見る",
        emptyMessage:
          "この期間内に期限超過または期限接近の案件はありません。30日表示へ切り替えて確認できます。",
      },
      pendingSubmission: {
        tag: "Submission",
        title: "提出待ち案件",
        subtitle:
          "再確認、提出、受領書アップロードをまとめて処理しやすい状態です。",
        action: "確認・提出へ進む",
        emptyMessage:
          "提出待ち案件はありません。案件一覧に戻って前段工程を進めてください。",
      },
      risks: {
        tag: "Risks",
        title: "リスク案件",
        subtitle:
          "進行を止める要因を先にまとめて解消し、その後提出を再開します。",
        action: "リスク項目を修正",
        emptyMessage:
          "現在の表示範囲にリスク案件はありません。期限と提出待ちの状況を引き続き確認してください。",
      },
    },
    visibility: {
      current: {
        label: "権限と表示範囲",
        title: "現在の視点",
        notes: {
          mine: {
            note1:
              "担当者 / アシスタントは既定で「自分」から開始し、自身が担当または協力中の案件に集中します。",
            note2:
              "ホームでは本日の対応、期限超過 / 期限接近、提出待ち、リスク案件を固定表示します。",
            note3:
              "まず本日必須の作業を片付け、その後に期限接近案件や詰まり案件へ進むのに適しています。",
          },
          group: {
            note1:
              "組表示は担当者やアシスタントがチーム全体の対応、期限圧力、提出ペースを確認するのに適しています。",
            note2:
              "フォローアップタスクの一括作成、担当割当、提出前レビューや詰まり解消の推進に向いています。",
            note3:
              "視点を切り替えるとカード数値と一覧が同時に更新され、固定レイアウトは維持されます。",
          },
          all: {
            note1:
              "事務所全体表示は管理者のみ利用し、全体の対応、期限、提出待ち、リスク圧力を確認します。",
            note2:
              "組長や管理者が全体進捗と優先対応課題を素早く把握するのに適しています。",
            note3:
              "さらに深く処理する場合は案件一覧に入り、絞り込みやフォローを続けてください。",
          },
        },
      },
      tips: {
        label: "補足",
        title: "利用ヒント",
        items: {
          tip1: "カード件数が 0 でもカードは残し、非表示にはしません。",
          tip2: "範囲や期間を切り替えると、先にスケルトンを表示してからカードと一覧を更新します。",
          tip3: "ここでは最優先の 4 種類の作業を先に見せ、今日何から着手すべきかを判断しやすくします。",
          tip4: "資料、請求、案件詳細をさらに処理したい場合は、各入口から次の画面へ進んでください。",
        },
      },
    },
    workItems: dashboardWorkItems,
  },
} as const;

export default jaJP;
