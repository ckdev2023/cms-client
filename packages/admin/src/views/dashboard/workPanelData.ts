type Scope = "mine" | "group" | "all";
type StatusTone = "info" | "warn" | "danger" | "muted";

/**
 *
 */
export type PanelListKey = "todo" | "deadlines" | "submissions" | "risks";
/**
 *
 */
export type PanelId = "todayTodo" | "deadlines" | "pendingSubmission" | "risks";

/**
 *
 */
export interface WorkItemDef {
  /**
   *
   */
  id: string;
  /**
   *
   */
  metaKeys: string[];
  /**
   *
   */
  status: StatusTone;
  /**
   *
   */
  daysLeft?: number;
  /**
   * 可选跳转路由，点击动作按钮时导航到此路径。
   */
  route?: string;
}

/**
 *
 */
export interface PanelDef {
  /**
   *
   */
  id: PanelId;
  /**
   *
   */
  featured: boolean;
  /**
   *
   */
  listKey: PanelListKey;
}

export const panels: PanelDef[] = [
  {
    id: "todayTodo",
    featured: true,
    listKey: "todo",
  },
  {
    id: "deadlines",
    featured: false,
    listKey: "deadlines",
  },
  {
    id: "pendingSubmission",
    featured: false,
    listKey: "submissions",
  },
  {
    id: "risks",
    featured: false,
    listKey: "risks",
  },
];

export const workListData: Record<
  Scope,
  Record<PanelListKey, WorkItemDef[]>
> = {
  mine: {
    todo: [
      {
        id: "uploadReceipt",
        metaKeys: ["caseId", "owner", "time"],
        status: "info",
      },
      {
        id: "chaseVisaDocs",
        metaKeys: ["caseId", "owner", "time"],
        status: "warn",
      },
      {
        id: "billingReceipt",
        metaKeys: ["caseId", "owner", "time"],
        status: "danger",
        route: "/billing",
      },
    ],
    deadlines: [
      {
        id: "wangRenewal",
        metaKeys: ["caseId", "owner", "due"],
        status: "warn",
        daysLeft: 3,
      },
      {
        id: "zhangFamilyRenewal",
        metaKeys: ["caseId", "owner", "due"],
        status: "info",
        daysLeft: 7,
      },
      {
        id: "yamadaPermanent",
        metaKeys: ["caseId", "owner", "due"],
        status: "muted",
        daysLeft: 19,
      },
    ],
    submissions: [
      {
        id: "wangSubmit",
        metaKeys: ["caseId", "ready", "blocker"],
        status: "info",
      },
      {
        id: "zhangSubmit",
        metaKeys: ["caseId", "ready", "blocker"],
        status: "info",
      },
    ],
    risks: [
      {
        id: "takaRenewalRisk",
        metaKeys: ["caseId", "risk", "amount"],
        status: "danger",
      },
      {
        id: "liCorrectionRisk",
        metaKeys: ["caseId", "blocker", "due"],
        status: "danger",
      },
    ],
  },
  group: {
    todo: [
      {
        id: "groupTodoOverview",
        metaKeys: ["count", "owners", "priority"],
        status: "info",
      },
      {
        id: "submissionReview",
        metaKeys: ["count", "owners", "time"],
        status: "warn",
      },
    ],
    deadlines: [
      {
        id: "groupUrgentDue",
        metaKeys: ["count", "cases", "owners"],
        status: "danger",
        daysLeft: 3,
      },
      {
        id: "groupWeekDue",
        metaKeys: ["count", "types", "stage"],
        status: "warn",
        daysLeft: 7,
      },
      {
        id: "groupMonthDue",
        metaKeys: ["count", "schedule", "types"],
        status: "muted",
        daysLeft: 24,
      },
    ],
    submissions: [
      {
        id: "groupSubmissions",
        metaKeys: ["count", "ready", "review"],
        status: "info",
      },
    ],
    risks: [
      {
        id: "groupRisks",
        metaKeys: ["count", "blockers", "billing"],
        status: "danger",
      },
    ],
  },
  all: {
    todo: [
      {
        id: "firmTodoOverview",
        metaKeys: ["count", "groups", "scope"],
        status: "info",
      },
    ],
    deadlines: [
      {
        id: "firmWeekDue",
        metaKeys: ["count", "groups", "schedule"],
        status: "danger",
        daysLeft: 5,
      },
      {
        id: "firmMonthDue",
        metaKeys: ["count", "schedule", "priority"],
        status: "muted",
        daysLeft: 22,
      },
    ],
    submissions: [
      {
        id: "firmSubmissions",
        metaKeys: ["count", "groups", "review"],
        status: "info",
      },
    ],
    risks: [
      {
        id: "firmRisks",
        metaKeys: ["count", "highRisk", "mix"],
        status: "danger",
      },
    ],
  },
};
