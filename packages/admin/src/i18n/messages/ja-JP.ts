import customerDetail from "./customers/ja-JP";
import customerList from "./customers/ja-JP-list";
import billing from "./billing/ja-JP";
import cases from "./cases/ja-JP";
import conversations from "./conversations/ja-JP";
import documents from "./documents/ja-JP";
import leads from "./leads/ja-JP";
import settings from "./settings/ja-JP";
import tasks from "./tasks/ja-JP";
import dashboardWorkItems from "./work-items/ja-JP";
import dashboardWorkItem from "./dashboard-work-item/ja-JP";
import { shellSearchJaJP } from "./shell-search/ja-JP";

const jaJP = {
  shell: {
    skipToContent: "コンテンツへスキップ",
    topbar: {
      openNavigation: "ナビゲーションを開く",
      globalSearch: "グローバル検索",
      searchPlaceholder: "検索: 顧客 / 案件 / 資料 / 書類...",
      searchUnavailablePlaceholder: "グローバル検索は準備中です",
      comingSoon: "準備中",
      localeLabel: "表示言語",
      createLead: "相談を新規作成",
      createCase: "案件を新規作成",
      logout: "ログアウト",
    },
    search: shellSearchJaJP,
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
        conversations: "会話",
        customers: "顧客",
        cases: "案件",
        tasks: "タスク・リマインド",
        documents: "資料センター",
        billing: "請求・財務",
        settings: "システム設定",
      },
    },
  },
  shared: {
    group: {
      disabledSuffix: "（停止）",
    },
    breadcrumbsLabel: "パンくずリスト",
    loading: "読み込み中…",
    submitting: "送信中…",
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
  auth: {
    login: {
      metaTitle: "ログイン",
      badge: "Admin Sign In",
      title: "Gyosei OS にログイン",
      subtitle:
        "管理画面アカウントでワークスペース、顧客、案件、資料センターへ進みます。",
      helperTitle: "ログイン後に続けられる作業",
      helperItems: {
        workspace: "今日のタスク、期限超過、リスク案件をまとめて確認",
        customers: "顧客・相談・案件の継続フォロー",
        documents: "資料センターと請求関連ページの確認",
      },
      formTitle: "管理画面ログイン",
      formDescription:
        "メールアドレスとパスワードを入力して admin アプリへ進んでください。",
      emailLabel: "メールアドレス",
      emailPlaceholder: "name{'@'}firm.jp",
      passwordLabel: "パスワード",
      passwordPlaceholder: "パスワードを入力",
      submit: "ログイン",
      validation: "メールアドレスとパスワードを入力してください",
      invalidCredentials: "メールアドレスまたはパスワードが正しくありません。",
      requestFailed:
        "ログインに失敗しました。しばらくしてから再試行してください。",
      sessionExpiredNotice:
        "セッションの有効期限が切れました。もう一度ログインしてください。",
      loggedOutNotice: "ログアウトしました。",
      demoHint: "有効な管理画面アカウントでログインしてください。",
    },
  },
  customers: {
    list: customerList,
    detail: customerDetail,
  },
  billing,
  cases,
  conversations,
  documents,
  leads,
  settings,
  tasks,
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
    state: {
      loading: "ダッシュボードデータを読み込み中です…",
      refreshing: "ダッシュボードデータを更新中です…",
      unauthorized:
        "現在のログイン状態ではダッシュボードにアクセスできません。再ログインしてからお試しください。",
      requestFailed:
        "ダッシュボードデータの読み込みに失敗しました。しばらくしてから再試行してください。",
      retry: "再読み込み",
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
    workItem: dashboardWorkItem,
  },
} as const;
export default jaJP;
