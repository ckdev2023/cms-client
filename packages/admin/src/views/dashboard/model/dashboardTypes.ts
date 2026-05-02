export const DASHBOARD_SCOPE_OPTIONS = ["mine", "group", "all"] as const;
export const DASHBOARD_TIME_WINDOW_OPTIONS = [7, 30] as const;

/**
 *
 */
export type DashboardScope = (typeof DASHBOARD_SCOPE_OPTIONS)[number];
/**
 *
 */
export type DashboardTimeWindow =
  (typeof DASHBOARD_TIME_WINDOW_OPTIONS)[number];
/**
 *
 */
export type DashboardStatusTone = "info" | "warn" | "danger" | "muted";
/**
 *
 */
export type DashboardPanelListKey =
  | "todo"
  | "deadlines"
  | "submissions"
  | "risks";
/**
 *
 */
export type DashboardPanelId =
  | "todayTodo"
  | "deadlines"
  | "pendingSubmission"
  | "risks";

/**
 *
 */
export interface DashboardWorkItem {
  /**
   *
   */
  id: string;
  /**
   *
   */
  title: string;
  /**
   *
   */
  meta: string[];
  /**
   *
   */
  desc: string;
  /**
   *
   */
  status: DashboardStatusTone;
  /**
   *
   */
  statusLabel: string;
  /**
   *
   */
  action: string;
  /**
   *
   */
  route?: string;
  /**
   *
   */
  daysLeft?: number;
  /**
   *
   */
  statusLabelKey?: string;
  /**
   *
   */
  statusLabelParams?: Record<string, unknown>;
  /**
   *
   */
  descKey?: string;
  /**
   *
   */
  descParams?: Record<string, unknown>;
  /**
   *
   */
  actionKey?: string;
  /**
   *
   */
  metaKeys?: { key: string; params?: Record<string, unknown> }[];
}

/**
 *
 */
export interface DashboardSummaryData {
  /**
   *
   */
  scope: DashboardScope;
  /**
   *
   */
  timeWindow: DashboardTimeWindow;
  /**
   *
   */
  summary: {
    /**
     *
     */
    todayTasks: number;
    /**
     *
     */
    upcomingCases: number;
    /**
     *
     */
    pendingSubmissions: number;
    /**
     *
     */
    riskCases: number;
  };
  /**
   *
   */
  panels: Record<DashboardPanelListKey, DashboardWorkItem[]>;
}

/**
 * 仪表盘用的可见分组选项。
 */
export interface DashboardGroupOption {
  /** 分组 ID。 */
  id: string;
  /** 显示名称。 */
  name: string;
  /** 是否为用户的主分组。 */
  isPrimary: boolean;
}

/**
 *
 */
export interface DashboardRepositoryInput {
  /**
   *
   */
  scope: DashboardScope;
  /**
   *
   */
  timeWindow: DashboardTimeWindow;
  /** 当 scope 为 group 时发送的分组 ID。 */
  groupId?: string;
}

/**
 *
 */
export interface DashboardRepository {
  /**
   *
   */
  getSummary(input: DashboardRepositoryInput): Promise<DashboardSummaryData>;
  /** 获取当前用户可见的 active 分组列表。 */
  listGroups(): Promise<DashboardGroupOption[]>;
}
