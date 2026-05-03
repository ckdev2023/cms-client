import type { BusinessPhaseId } from "../constantsBusinessPhase";
import type { OverviewActions } from "../types-detail";

interface PhaseActionEntry {
  primary: { label: string; tab: string };
  secondary: { label: string; tab: string };
}

const PHASE_ACTIONS: Partial<Record<BusinessPhaseId, PhaseActionEntry>> = {
  CONSULTING: {
    primary: { label: "cases.coach.docManagement", tab: "documents" },
    secondary: { label: "cases.coach.runValidation", tab: "validation" },
  },
  CONTRACTED: {
    primary: { label: "cases.coach.docManagement", tab: "documents" },
    secondary: { label: "cases.coach.checkTasks", tab: "tasks" },
  },
  WAITING_MATERIAL: {
    primary: { label: "cases.coach.docManagement", tab: "documents" },
    secondary: { label: "cases.coach.setDeadline", tab: "deadlines" },
  },
  MATERIAL_PREPARING: {
    primary: { label: "cases.coach.docManagement", tab: "documents" },
    secondary: { label: "cases.coach.runValidation", tab: "validation" },
  },
  REVIEWING: {
    primary: { label: "cases.coach.runValidation", tab: "validation" },
    secondary: { label: "cases.coach.docManagement", tab: "documents" },
  },
  APPLYING: {
    primary: { label: "cases.coach.runValidation", tab: "validation" },
    secondary: { label: "cases.coach.docManagement", tab: "documents" },
  },
  UNDER_REVIEW: {
    primary: { label: "cases.coach.checkMessages", tab: "messages" },
    secondary: { label: "cases.coach.setDeadline", tab: "deadlines" },
  },
  NEED_SUPPLEMENT: {
    primary: { label: "cases.coach.docManagement", tab: "documents" },
    secondary: { label: "cases.coach.checkMessages", tab: "messages" },
  },
  SUPPLEMENT_PROCESSING: {
    primary: { label: "cases.coach.docManagement", tab: "documents" },
    secondary: { label: "cases.coach.runValidation", tab: "validation" },
  },
  APPROVED: {
    primary: { label: "cases.coach.registerFinalPayment", tab: "billing" },
    secondary: { label: "cases.coach.docManagement", tab: "documents" },
  },
  WAITING_PAYMENT: {
    primary: { label: "cases.coach.registerFinalPayment", tab: "billing" },
    secondary: {
      label: "cases.coach.sendCollectionReminder",
      tab: "deadlines",
    },
  },
  COE_SENT: {
    primary: { label: "cases.coach.checkMessages", tab: "messages" },
    secondary: { label: "cases.coach.setDeadline", tab: "deadlines" },
  },
  VISA_APPLYING: {
    primary: { label: "cases.coach.checkMessages", tab: "messages" },
    secondary: { label: "cases.coach.setDeadline", tab: "deadlines" },
  },
  SUCCESS: {
    primary: { label: "cases.coach.docManagement", tab: "documents" },
    secondary: { label: "cases.coach.checkBilling", tab: "billing" },
  },
  VISA_REJECTED: {
    primary: { label: "cases.coach.checkMessages", tab: "messages" },
    secondary: { label: "cases.coach.checkBilling", tab: "billing" },
  },
  RESIDENCE_PERIOD_RECORDED: {
    primary: { label: "cases.coach.setDeadline", tab: "deadlines" },
    secondary: { label: "cases.coach.docManagement", tab: "documents" },
  },
  RENEWAL_REMINDER_SCHEDULED: {
    primary: { label: "cases.coach.checkTasks", tab: "tasks" },
    secondary: { label: "cases.coach.docManagement", tab: "documents" },
  },
  CLOSED_SUCCESS: {
    primary: { label: "cases.coach.viewLog", tab: "log" },
    secondary: { label: "cases.coach.checkBilling", tab: "billing" },
  },
  CLOSED_FAILED: {
    primary: { label: "cases.coach.viewLog", tab: "log" },
    secondary: { label: "cases.coach.checkBilling", tab: "billing" },
  },
};

const DEFAULT_ACTIONS: PhaseActionEntry = {
  primary: { label: "cases.coach.docManagement", tab: "documents" },
  secondary: { label: "cases.coach.runValidation", tab: "validation" },
};

/**
 * 根据业务阶段返回概览页"下一关键动作"按钮配置。
 *
 * @param businessPhase - 当前业务阶段代码
 * @param _stageId - 管理层阶段（预留，当前未使用）
 * @returns 主/次按钮的 i18n label 与目标 tab
 */
export function nextActionsForPhase(
  businessPhase: string,
  _stageId?: string, // eslint-disable-line @typescript-eslint/no-unused-vars
): OverviewActions {
  const entry =
    PHASE_ACTIONS[businessPhase as BusinessPhaseId] ?? DEFAULT_ACTIONS;
  return {
    primary: { ...entry.primary },
    secondary: { ...entry.secondary },
  };
}
