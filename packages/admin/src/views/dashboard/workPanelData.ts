import type {
  DashboardPanelId,
  DashboardPanelListKey,
} from "./model/dashboardTypes";
import type { RouteLocationRaw } from "vue-router";

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
  /**
   *
   */
  route?: RouteLocationRaw;
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
    route: { name: "cases" },
  },
  {
    id: "pendingSubmission",
    featured: false,
    listKey: "submissions",
    route: { name: "cases", query: { stage: "S6" } },
  },
  {
    id: "risks",
    featured: false,
    listKey: "risks",
    route: { name: "cases", query: { risk: "critical" } },
  },
];
