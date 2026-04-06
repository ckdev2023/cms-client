/**
 * 根导航参数表。
 *
 * 说明：
 * - key 为路由名
 * - value 为该路由的参数类型（无参数用 undefined）
 */
export type RootStackParamList = {
  /** Auth 栈（未登录）。 */
  Auth: undefined;
  /** Main Tab 栈（已登录）。 */
  Main: undefined;
};

/**
 * Auth 栈导航参数表。
 */
export type AuthStackParamList = {
  /** 登录页面。 */
  Login: undefined;
  /** 验证码页面。 */
  VerifyCode: { contact: string };
};

/**
 * Main Tab 导航参数表。
 */
export type MainTabParamList = {
  /** Home Tab。 */
  HomeTab: undefined;
  /** Cases Tab。 */
  CasesTab: undefined;
  /** Inbox Tab。 */
  InboxTab: undefined;
  /** Todos Tab。 */
  TodosTab: undefined;
  /** Profile Tab。 */
  ProfileTab: undefined;
};

/**
 * Cases 栈导航参数表。
 */
export type CasesStackParamList = {
  /** 案件列表。 */
  CaseList: undefined;
  /** 案件详情。 */
  CaseDetail: { caseId: string };
};

/**
 * Inbox 栈导航参数表。
 */
export type InboxStackParamList = {
  /** 会话列表。 */
  InboxList: undefined;
  /** 会话详情。 */
  Conversation: { conversationId: string };
};

/**
 * Todos 栈导航参数表。
 */
export type TodosStackParamList = {
  /** 文档列表。 */
  DocumentList: undefined;
  /** 文档上传。 */
  DocumentUpload: undefined;
};
