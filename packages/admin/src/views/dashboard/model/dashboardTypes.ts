export const DASHBOARD_SCOPE_OPTIONS = ["mine", "group", "all"] as const;
export const DASHBOARD_GROUP_OPTIONS = [
  "all",
  "tokyo1",
  "tokyo2",
  "osaka",
] as const;
export const DASHBOARD_TIME_WINDOW_OPTIONS = [7, 30] as const;

/**
 *
 */
export type DashboardScope = (typeof DASHBOARD_SCOPE_OPTIONS)[number];
/**
 *
 */
export type DashboardGroupFilter = (typeof DASHBOARD_GROUP_OPTIONS)[number];
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
}

/**
 *
 */
export interface DashboardRepository {
  /**
   *
   */
  getSummary(input: DashboardRepositoryInput): Promise<DashboardSummaryData>;
}
