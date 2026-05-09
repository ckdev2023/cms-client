/**
 * 运营手册截图清单：所有要遍历的 admin 页面。
 *
 * 每条记录：
 *   - id: 文件名（不含扩展名）和章节锚点，必须唯一
 *   - hash: hash 路由路径（不含 `#`），login 用 `/login`
 *   - title: 章节标题（中文）
 *   - waitFor: 进入页面后等待的 selector（出现即认为渲染完成）
 *   - actions: 截图前要执行的额外动作（如点击 tab、滚动等）
 *   - section: 所属章节（用于排序与目录展示）
 */

const SEED_CUSTOMER_ID = "00000000-0000-4000-a000-000000000001";
const SEED_CASE_A_ID = "00000000-0000-4000-a000-000000000010";
const SEED_CASE_BMV_ID = "00000000-0000-4000-a000-000000000012";
const SEED_CONVERSATION_ID = "00000000-0000-4000-b000-000000000021";

export const SEED_IDS = {
  customerId: SEED_CUSTOMER_ID,
  caseAId: SEED_CASE_A_ID,
  caseBmvId: SEED_CASE_BMV_ID,
  conversationId: SEED_CONVERSATION_ID,
};

export const PAGES = [
  // 1. 登录与系统概览
  {
    id: "01-login",
    section: "1. 系统准入",
    title: "登录页",
    hash: "/login",
    requiresAuth: false,
    waitFor: "#login-email",
  },
  {
    id: "02-dashboard",
    section: "2. 工作台",
    title: "仪表盘 — 今日工作面板",
    hash: "/",
    waitFor: "main",
  },
  // 3. 咨询线索
  {
    id: "03-leads-list",
    section: "3. 咨询线索",
    title: "咨询线索列表",
    hash: "/leads",
    waitFor: "main",
  },
  {
    id: "03-conversations-list",
    section: "3. 咨询线索",
    title: "会话列表（与客户的来往沟通）",
    hash: "/conversations",
    waitFor: "main",
  },
  {
    id: "03-conversation-detail",
    section: "3. 咨询线索",
    title: "会话详情 — 消息与备注",
    hash: `/conversations/${SEED_CONVERSATION_ID}`,
    waitFor: "main",
  },
  // 4. 客户管理
  {
    id: "04-customers-list",
    section: "4. 客户管理",
    title: "客户列表",
    hash: "/customers",
    waitFor: "main",
  },
  {
    id: "04-customer-detail",
    section: "4. 客户管理",
    title: "客户详情 — 田中 太郎",
    hash: `/customers/${SEED_CUSTOMER_ID}`,
    waitFor: "main",
  },
  {
    id: "04-customer-detail-cases",
    section: "4. 客户管理",
    title: "客户详情 — 关联案件 Tab",
    hash: `/customers/${SEED_CUSTOMER_ID}?tab=cases`,
    waitFor: "main",
  },
  {
    id: "04-customer-detail-comms",
    section: "4. 客户管理",
    title: "客户详情 — 沟通记录 Tab",
    hash: `/customers/${SEED_CUSTOMER_ID}?tab=comms`,
    waitFor: "main",
  },
  {
    id: "04-customer-detail-log",
    section: "4. 客户管理",
    title: "客户详情 — 操作日志 Tab",
    hash: `/customers/${SEED_CUSTOMER_ID}?tab=log`,
    waitFor: "main",
  },
  // 5. 案件管理
  {
    id: "05-cases-list",
    section: "5. 案件管理",
    title: "案件列表（含阶段与负责人筛选）",
    hash: "/cases",
    waitFor: "main",
  },
  {
    id: "05-case-create",
    section: "5. 案件管理",
    title: "新建案件 — 模板选择与基础信息",
    hash: "/cases/create",
    waitFor: "main",
  },
  {
    id: "05-case-detail",
    section: "5. 案件管理",
    title: "案件详情 — 概览 / 资料 / 文书 / 任务 / 时间线",
    hash: `/cases/${SEED_CASE_A_ID}`,
    waitFor: "main",
  },
  {
    id: "05-case-detail-bmv",
    section: "5. 案件管理",
    title: "案件详情（BMV 模板）",
    hash: `/cases/${SEED_CASE_BMV_ID}`,
    waitFor: "main",
  },
  {
    id: "05-case-detail-documents",
    section: "5. 案件管理",
    title: "案件详情 — 资料清单 Tab",
    hash: `/cases/${SEED_CASE_A_ID}?tab=documents`,
    waitFor: "main",
  },
  {
    id: "05-case-detail-tasks",
    section: "5. 案件管理",
    title: "案件详情 — 任务 Tab",
    hash: `/cases/${SEED_CASE_A_ID}?tab=tasks`,
    waitFor: "main",
  },
  {
    id: "05-case-detail-forms",
    section: "5. 案件管理",
    title: "案件详情 — 文书 Tab",
    hash: `/cases/${SEED_CASE_A_ID}?tab=forms`,
    waitFor: "main",
  },
  {
    id: "05-case-detail-deadlines",
    section: "5. 案件管理",
    title: "案件详情 — 期限 Tab",
    hash: `/cases/${SEED_CASE_A_ID}?tab=deadlines`,
    waitFor: "main",
  },
  {
    id: "05-case-detail-validation",
    section: "5. 案件管理",
    title: "案件详情 — 提交前检查 Tab",
    hash: `/cases/${SEED_CASE_A_ID}?tab=validation`,
    waitFor: "main",
  },
  {
    id: "05-case-detail-billing",
    section: "5. 案件管理",
    title: "案件详情 — 收费 Tab",
    hash: `/cases/${SEED_CASE_A_ID}?tab=billing`,
    waitFor: "main",
  },
  {
    id: "05-case-detail-log",
    section: "5. 案件管理",
    title: "案件详情 — 日志 Tab",
    hash: `/cases/${SEED_CASE_A_ID}?tab=log`,
    waitFor: "main",
  },
  // 6. 资料中心
  {
    id: "06-documents-list",
    section: "6. 资料中心",
    title: "资料中心 — 资料清单与状态",
    hash: "/documents",
    waitFor: "main",
  },
  // 7. 任务与提醒
  {
    id: "07-tasks-list",
    section: "7. 任务与提醒",
    title: "任务与提醒列表",
    hash: "/tasks",
    waitFor: "main",
  },
  // 8. 收费与财务
  {
    id: "08-billing-list",
    section: "8. 收费与财务",
    title: "收费与财务总览",
    hash: "/billing",
    waitFor: "main",
  },
  // 9. 系统设置
  {
    id: "09-settings-groups",
    section: "9. 系统设置",
    title: "系统设置 — 分组管理",
    hash: "/settings?tab=group-management",
    waitFor: "main",
  },
  {
    id: "09-settings-members",
    section: "9. 系统设置",
    title: "系统设置 — 成员管理",
    hash: "/settings?tab=member-management",
    waitFor: "main",
  },
  {
    id: "09-settings-roles",
    section: "9. 系统设置",
    title: "系统设置 — 角色与权限",
    hash: "/settings?tab=role-management",
    waitFor: "main",
  },
  {
    id: "09-settings-visibility",
    section: "9. 系统设置",
    title: "系统设置 — 可见性配置",
    hash: "/settings?tab=visibility-config",
    waitFor: "main",
  },
  {
    id: "09-settings-storage",
    section: "9. 系统设置",
    title: "系统设置 — 本地资料根目录",
    hash: "/settings?tab=storage-root",
    waitFor: "main",
  },
];
