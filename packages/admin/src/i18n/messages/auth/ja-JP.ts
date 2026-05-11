const authJaJP = {
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
    serviceUnavailable:
      "サーバー側の依存（PostgreSQL など）に接続できません。Docker を起動し `npm run local:dev` でローカル環境を立ち上げてから再度お試しください。",
    requestFailed:
      "ログインに失敗しました。しばらくしてから再試行してください。",
    sessionExpiredNotice:
      "セッションの有効期限が切れました。もう一度ログインしてください。",
    loggedOutNotice: "ログアウトしました。",
    demoHint: "有効な管理画面アカウントでログインしてください。",
  },
} as const;

export default authJaJP;
