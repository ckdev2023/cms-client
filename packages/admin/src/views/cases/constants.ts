import type {
  BillingStatusDef,
  BillingStatusKey,
  CaseDetailTab,
  CaseDetailTabDef,
  CaseGroupOption,
  CaseListFiltersState,
  CaseOwnerOption,
  CaseRiskStatus,
  CaseRoleDef,
  CaseSampleKey,
  CaseScope,
  CaseStage,
  CaseStageId,
  CaseValidationStatus,
  CreateCaseStepDef,
  GateDefinition,
  GateId,
  LogCategoryDef,
  MessageTypeKey,
} from "./types";
import { getActiveGroupOptions } from "../../shared/model/useGroupOptions";
export type { CaseListFiltersState } from "./types";

// ─── Stages ─────────────────────────────────────────────────────

export const CASE_STAGES: Record<CaseStageId, CaseStage> = {
  S1: { code: "S1", label: "刚开始办案", badge: "badge-gray" },
  S2: { code: "S2", label: "资料收集中", badge: "badge-green" },
  S3: { code: "S3", label: "资料待补 / 审核中", badge: "badge-orange" },
  S4: { code: "S4", label: "文书制作中", badge: "badge-blue" },
  S5: { code: "S5", label: "提交前检查", badge: "badge-orange" },
  S6: { code: "S6", label: "可安排提交", badge: "badge-orange" },
  S7: { code: "S7", label: "已提交待回执", badge: "badge-blue" },
  S8: { code: "S8", label: "结果待确认", badge: "badge-blue" },
  S9: { code: "S9", label: "已归档", badge: "badge-gray" },
};

export const CASE_STAGE_IDS: readonly CaseStageId[] = [
  "S1",
  "S2",
  "S3",
  "S4",
  "S5",
  "S6",
  "S7",
  "S8",
  "S9",
] as const;

// ─── Detail Tabs ────────────────────────────────────────────────

export const CASE_DETAIL_TABS: readonly CaseDetailTabDef[] = [
  { key: "overview", label: "概览", icon: "chart-bar" },
  { key: "validation", label: "提交前检查", icon: "shield-check" },
  { key: "documents", label: "资料清单", icon: "document-text" },
  { key: "tasks", label: "任务", icon: "clipboard-check" },
  { key: "info", label: "基础信息", icon: "identification" },
  { key: "forms", label: "文书", icon: "document-duplicate" },
  { key: "deadlines", label: "期限", icon: "clock" },
  { key: "billing", label: "收费", icon: "currency-yen" },
  { key: "messages", label: "沟通记录", icon: "chat-alt-2" },
  { key: "log", label: "日志", icon: "document-report" },
] as const;

export const CASE_DETAIL_TAB_KEYS: readonly CaseDetailTab[] = [
  "overview",
  "validation",
  "documents",
  "tasks",
  "info",
  "forms",
  "deadlines",
  "billing",
  "messages",
  "log",
] as const;

// ─── Gates ──────────────────────────────────────────────────────

export const CASE_GATES: Record<GateId, GateDefinition> = {
  A: {
    id: "A",
    label: "必须先处理",
    severity: "blocking",
    desc: "必须先处理的问题",
  },
  B: {
    id: "B",
    label: "建议补强",
    severity: "warning",
    desc: "建议补强的风险项",
  },
  C: {
    id: "C",
    label: "补充说明",
    severity: "informational",
    desc: "不阻断但建议了解",
  },
};

// ─── Billing Statuses ───────────────────────────────────────────

export const BILLING_STATUSES: Record<BillingStatusKey, BillingStatusDef> = {
  paid: { label: "已结清", badge: "badge-green" },
  partial: { label: "部分回款", badge: "badge-orange" },
  unpaid: { label: "应收", badge: "badge-orange" },
  arrears: { label: "欠款", badge: "badge-red" },
  waived: { label: "免除", badge: "badge-gray" },
};

// ─── Log Categories ─────────────────────────────────────────────

export const LOG_CATEGORIES: readonly LogCategoryDef[] = [
  { key: "all", label: "全部" },
  { key: "operation", label: "操作日志" },
  { key: "review", label: "审核日志" },
  { key: "status", label: "状态变更日志" },
] as const;

// ─── Badge Tone Map & Sample Labels ─────────────────────────────

export const BADGE_TONE_MAP: Record<string, string> = {
  "badge-green": "success",
  "badge-orange": "warning",
  "badge-red": "danger",
  "badge-blue": "primary",
  "badge-gray": "neutral",
};

export const SAMPLE_LABELS: Record<CaseSampleKey, string> = {
  work: "工作签证（技人国 更新）",
  family: "家族滞在（认定）",
  "gate-fail": "Gate 失败态",
  arrears: "欠款继续提交",
  correction: "补正处理中",
  archived: "S9 已归档只读",
};

// ─── Message Type Filters ────────────────────────────────────────

/**
 *
 */
export interface MessageFilterDef {
  /**
   *
   */
  key: "all" | MessageTypeKey;
  /**
   *
   */
  label: string;
}

export const MESSAGE_FILTERS: readonly MessageFilterDef[] = [
  { key: "all", label: "所有记录" },
  { key: "internal", label: "内部记录" },
  { key: "client_visible", label: "客户可见记录" },
  { key: "phone", label: "电话记录" },
  { key: "meeting", label: "线下会议" },
  { key: "auto_email", label: "自动邮件" },
] as const;

// ─── Roles (demo-only) ─────────────────────────────────────────

export const CASE_ROLES: readonly CaseRoleDef[] = [
  {
    key: "admin",
    label: "管理员",
    scope: "全所案件",
    canEdit: "全部字段",
    canExport: true,
    auditRequired: true,
  },
  {
    key: "owner",
    label: "主办人",
    scope: "本组 + 负责/协作案件",
    canEdit: "负责案件全部字段",
    canExport: true,
    auditRequired: true,
  },
  {
    key: "assistant",
    label: "助理",
    scope: "操作字段",
    canEdit: "资料、沟通、任务",
    canExport: false,
    auditRequired: false,
  },
  {
    key: "finance",
    label: "财务",
    scope: "仅收费相关",
    canEdit: "收费 Tab",
    canExport: true,
    auditRequired: true,
  },
] as const;

// ─── Enum Value Lists ───────────────────────────────────────────

export const CASE_SCOPES: readonly CaseScope[] = [
  "mine",
  "group",
  "all",
] as const;

export const CASE_RISK_STATUSES: readonly CaseRiskStatus[] = [
  "normal",
  "attention",
  "critical",
] as const;

export const CASE_VALIDATION_STATUSES: readonly CaseValidationStatus[] = [
  "passed",
  "pending",
  "failed",
] as const;

export const CASE_SAMPLE_KEYS: readonly CaseSampleKey[] = [
  "work",
  "family",
  "gate-fail",
  "arrears",
  "correction",
  "archived",
] as const;

// ─── Create Steps ───────────────────────────────────────────────

export const CREATE_CASE_STEPS: readonly CreateCaseStepDef[] = [
  { step: 1, label: "业务信息" },
  { step: 2, label: "关联人与资料" },
  { step: 3, label: "分派与期限" },
  { step: 4, label: "完成创建" },
] as const;

// ─── Owner / Group Options (sample data, to be replaced by API) ─

export const CASE_OWNER_OPTIONS: readonly CaseOwnerOption[] = [
  {
    value: "suzuki",
    label: "Suzuki",
    initials: "S",
    avatarClass: "bg-sky-100 text-sky-700",
  },
  {
    value: "tanaka",
    label: "Tanaka",
    initials: "T",
    avatarClass: "bg-emerald-100 text-emerald-700",
  },
  {
    value: "li",
    label: "Li",
    initials: "L",
    avatarClass: "bg-violet-100 text-violet-700",
  },
  {
    value: "sato",
    label: "Sato",
    initials: "Sa",
    avatarClass: "bg-amber-100 text-amber-700",
  },
] as const;

export const CASE_GROUP_OPTIONS: readonly CaseGroupOption[] =
  getActiveGroupOptions();

// ─── Default Filters ────────────────────────────────────────────

export const DEFAULT_CASE_LIST_FILTERS: CaseListFiltersState = {
  scope: "mine",
  search: "",
  stage: "",
  owner: "",
  group: "",
  risk: "",
  validation: "",
};

// ─── Label Helpers ──────────────────────────────────────────────

/**
 * 根据阶段 ID 获取中文标签。
 *
 * @param stageId - 阶段 ID（S1–S9）或自由文本
 * @returns 中文标签；未匹配时返回原始值
 */
export function getStageLabel(stageId: CaseStageId | string): string {
  return CASE_STAGES[stageId as CaseStageId]?.label ?? stageId;
}

/**
 * 根据收费状态键获取中文标签。
 *
 * @param key - 收费状态键或自由文本
 * @returns 中文标签；未匹配时返回原始值
 */
export function getBillingStatusLabel(key: BillingStatusKey | string): string {
  return BILLING_STATUSES[key as BillingStatusKey]?.label ?? key;
}

/**
 * 根据 Gate ID 获取中文标签。
 *
 * @param gateId - Gate ID（A/B/C）或自由文本
 * @returns 中文标签；未匹配时返回原始值
 */
export function getGateLabel(gateId: GateId | string): string {
  return CASE_GATES[gateId as GateId]?.label ?? gateId;
}
