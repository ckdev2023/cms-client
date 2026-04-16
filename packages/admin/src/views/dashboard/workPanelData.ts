import type {
  DashboardPanelId,
  DashboardPanelListKey,
} from "./model/dashboardTypes";

/**
 *
 */
export type PanelListKey = DashboardPanelListKey;
/**
 *
 */
export type PanelId = DashboardPanelId;

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
