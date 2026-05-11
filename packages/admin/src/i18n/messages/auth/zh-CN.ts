const authZhCN = {
  login: {
    metaTitle: "登录",
    badge: "Admin Sign In",
    title: "登录到 Gyosei OS",
    subtitle: "使用后台账号进入工作台、客户、案件与资料中心。",
    helperTitle: "登录后可继续处理",
    helperItems: {
      workspace: "今日待办、逾期和风险案件的统一看板",
      customers: "客户、咨询和案件的持续跟进入口",
      documents: "资料中心与收费相关页面",
    },
    formTitle: "后台登录",
    formDescription: "请输入邮箱和密码继续进入 admin 端。",
    emailLabel: "邮箱",
    emailPlaceholder: "name{'@'}firm.jp",
    passwordLabel: "密码",
    passwordPlaceholder: "请输入密码",
    submit: "登录",
    validation: "请输入邮箱和密码",
    invalidCredentials: "邮箱或密码错误，请重新输入。",
    serviceUnavailable:
      "服务端依赖不可用（例如数据库或未启动）。请在本机启动 Docker 与 `npm run local:dev`，或确认数据库与 Redis 已就绪后再试。",
    requestFailed: "登录请求失败，请稍后重试。",
    sessionExpiredNotice: "登录态已过期，请重新登录继续操作。",
    loggedOutNotice: "你已安全退出登录。",
    demoHint: "请使用已开通的后台账号登录。",
  },
} as const;

export default authZhCN;
