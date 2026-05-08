/* eslint-disable max-lines */
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
  S1: {
    code: "S1",
    label: "已建档",
    i18nKey: "cases.constants.stages.S1",
    badge: "badge-gray",
  },
  S2: {
    code: "S2",
    label: "资料收集中",
    i18nKey: "cases.constants.stages.S2",
    badge: "badge-green",
  },
  S3: {
    code: "S3",
    label: "资料待补 / 审核中",
    i18nKey: "cases.constants.stages.S3",
    badge: "badge-orange",
  },
  S4: {
    code: "S4",
    label: "文书制作中",
    i18nKey: "cases.constants.stages.S4",
    badge: "badge-blue",
  },
  S5: {
    code: "S5",
    label: "提交前检查",
    i18nKey: "cases.constants.stages.S5",
    badge: "badge-orange",
  },
  S6: {
    code: "S6",
    label: "可安排提交",
    i18nKey: "cases.constants.stages.S6",
    badge: "badge-orange",
  },
  S7: {
    code: "S7",
    label: "已提交待回执",
    i18nKey: "cases.constants.stages.S7",
    badge: "badge-blue",
  },
  S8: {
    code: "S8",
    label: "结果待确认",
    i18nKey: "cases.constants.stages.S8",
    badge: "badge-blue",
  },
  S9: {
    code: "S9",
    label: "已归档",
    i18nKey: "cases.constants.stages.S9",
    badge: "badge-gray",
  },
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

// ─── Business Phases (双層状態機) ─
export {
  BUSINESS_PHASES,
  BUSINESS_PHASE_MAP,
  getPhaseLabel,
  getPhaseI18nKey,
  getPhaseBadge,
  type BusinessPhaseId,
  type BusinessPhaseDef,
} from "./constantsBusinessPhase";

// ─── Detail Tabs ────────────────────────────────────────────────

export const CASE_DETAIL_TABS: readonly CaseDetailTabDef[] = [
  {
    key: "overview",
    label: "概览",
    i18nKey: "cases.constants.detailTabs.overview",
    icon: "chart-bar",
  },
  {
    key: "validation",
    label: "提交前检查",
    i18nKey: "cases.constants.detailTabs.validation",
    icon: "shield-check",
  },
  {
    key: "documents",
    label: "资料清单",
    i18nKey: "cases.constants.detailTabs.documents",
    icon: "document-text",
  },
  {
    key: "tasks",
    label: "任务",
    i18nKey: "cases.constants.detailTabs.tasks",
    icon: "clipboard-check",
  },
  {
    key: "info",
    label: "基础信息",
    i18nKey: "cases.constants.detailTabs.info",
    icon: "identification",
  },
  {
    key: "forms",
    label: "文书",
    i18nKey: "cases.constants.detailTabs.forms",
    icon: "document-duplicate",
  },
  {
    key: "deadlines",
    label: "期限",
    i18nKey: "cases.constants.detailTabs.deadlines",
    icon: "clock",
  },
  {
    key: "billing",
    label: "收费",
    i18nKey: "cases.constants.detailTabs.billing",
    icon: "currency-yen",
  },
  {
    key: "messages",
    label: "沟通记录",
    i18nKey: "cases.constants.detailTabs.messages",
    icon: "chat-alt-2",
  },
  {
    key: "log",
    label: "日志",
    i18nKey: "cases.constants.detailTabs.log",
    icon: "document-report",
  },
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

export const CASE_DETAIL_TAB_ALIASES: Readonly<Record<string, CaseDetailTab>> =
  {
    timeline: "log",
  } as const;

// ─── Gates ──────────────────────────────────────────────────────

export const CASE_GATES: Record<GateId, GateDefinition> = {
  A: {
    id: "A",
    label: "必须先处理",
    i18nKey: "cases.constants.gates.A.label",
    severity: "blocking",
    desc: "必须先处理的问题",
    descI18nKey: "cases.constants.gates.A.desc",
  },
  B: {
    id: "B",
    label: "建议补强",
    i18nKey: "cases.constants.gates.B.label",
    severity: "warning",
    desc: "建议补强的风险项",
    descI18nKey: "cases.constants.gates.B.desc",
  },
  C: {
    id: "C",
    label: "补充说明",
    i18nKey: "cases.constants.gates.C.label",
    severity: "informational",
    desc: "不阻断但建议了解",
    descI18nKey: "cases.constants.gates.C.desc",
  },
};

// ─── Billing Statuses ───────────────────────────────────────────

export const BILLING_STATUSES: Record<BillingStatusKey, BillingStatusDef> = {
  paid: {
    label: "已结清",
    i18nKey: "cases.constants.billingStatuses.paid",
    badge: "badge-green",
  },
  partial: {
    label: "部分回款",
    i18nKey: "cases.constants.billingStatuses.partial",
    badge: "badge-orange",
  },
  unpaid: {
    label: "应收",
    i18nKey: "cases.constants.billingStatuses.unpaid",
    badge: "badge-orange",
  },
  arrears: {
    label: "欠款",
    i18nKey: "cases.constants.billingStatuses.arrears",
    badge: "badge-red",
  },
  waived: {
    label: "免除",
    i18nKey: "cases.constants.billingStatuses.waived",
    badge: "badge-gray",
  },
  // BUG-186：server billing_records 原始 status 取值为 due / overdue，
  // admin 需要对齐以便三语渲染；语义分别对应「应收（未到结算期）」与「已欠款」。
  due: {
    label: "应收",
    i18nKey: "cases.constants.billingStatuses.due",
    badge: "badge-orange",
  },
  overdue: {
    label: "欠款",
    i18nKey: "cases.constants.billingStatuses.overdue",
    badge: "badge-red",
  },
};

// ─── Log Categories ─────────────────────────────────────────────

export const LOG_CATEGORIES: readonly LogCategoryDef[] = [
  { key: "all", label: "全部", i18nKey: "cases.constants.logCategories.all" },
  {
    key: "operation",
    label: "操作日志",
    i18nKey: "cases.constants.logCategories.operation",
  },
  {
    key: "review",
    label: "审核日志",
    i18nKey: "cases.constants.logCategories.review",
  },
  {
    key: "status",
    label: "状态变更日志",
    i18nKey: "cases.constants.logCategories.status",
  },
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

/** 消息类型筛选项定义 */
export interface MessageFilterDef {
  /** 筛选键 */
  key: "all" | MessageTypeKey;
  /** 中文 fallback 标签 */
  label: string;
  /** 对应的 i18n key：`cases.constants.messageFilters.<key>`。 */
  i18nKey: string;
}

export const MESSAGE_FILTERS: readonly MessageFilterDef[] = [
  {
    key: "all",
    label: "所有记录",
    i18nKey: "cases.constants.messageFilters.all",
  },
  {
    key: "internal",
    label: "内部记录",
    i18nKey: "cases.constants.messageFilters.internal",
  },
  {
    key: "client_visible",
    label: "客户可见记录",
    i18nKey: "cases.constants.messageFilters.client_visible",
  },
  {
    key: "phone",
    label: "电话记录",
    i18nKey: "cases.constants.messageFilters.phone",
  },
  {
    key: "meeting",
    label: "线下会议",
    i18nKey: "cases.constants.messageFilters.meeting",
  },
  {
    key: "auto_email",
    label: "自动邮件",
    i18nKey: "cases.constants.messageFilters.auto_email",
  },
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
  { step: 1, label: "业务信息", i18nKey: "cases.create.steps.step1" },
  { step: 2, label: "关联人与资料", i18nKey: "cases.create.steps.step2" },
  { step: 3, label: "分派与期限", i18nKey: "cases.create.steps.step3" },
  { step: 4, label: "完成创建", i18nKey: "cases.create.steps.step4" },
] as const;

// ─── Owner / Group Options (sample data, to be replaced by API) ─

export const CASE_OWNER_OPTIONS: readonly CaseOwnerOption[] = [
  {
    value: "suzuki",
    label: "Suzuki",
    initials: "S",
    avatarClass: "bg-sky-100 text-sky-700",
    group: "tokyo-1",
  },
  {
    value: "tanaka",
    label: "Tanaka",
    initials: "T",
    avatarClass: "bg-emerald-100 text-emerald-700",
    group: "tokyo-2",
  },
  {
    value: "li",
    label: "Li",
    initials: "L",
    avatarClass: "bg-violet-100 text-violet-700",
    group: "tokyo-2",
  },
  {
    value: "sato",
    label: "Sato",
    initials: "Sa",
    avatarClass: "bg-amber-100 text-amber-700",
    group: "osaka",
  },
  {
    value: "admin-global",
    label: "Global Admin",
    initials: "GA",
    avatarClass: "bg-rose-100 text-rose-700",
    group: null,
  },
] as const;

export const CASE_GROUP_OPTIONS: readonly CaseGroupOption[] =
  getActiveGroupOptions();

// ─── Pagination ─────────────────────────────────────────────────

export const DEFAULT_CASE_PAGE_SIZE = 20;

// ─── Default Filters ────────────────────────────────────────────

export const DEFAULT_CASE_LIST_FILTERS: CaseListFiltersState = {
  scope: "mine",
  search: "",
  stage: "",
  owner: "",
  group: "",
  risk: "",
  validation: "",
  phase: "",
};

// ─── Label / i18n Helpers ────────────────────────────────────────

/**
 * 根据阶段 ID 获取 i18n key。
 *
 * @param stageId - 阶段 ID 或自由文本
 * @returns i18n key；未匹配时返回 `""`
 */
export function getStageI18nKey(stageId: CaseStageId | string): string {
  return CASE_STAGES[stageId as CaseStageId]?.i18nKey ?? "";
}
/**
 * 阶段 ID → fallback 标签。
 * @param stageId 阶段 ID 或自由文本
 * @returns fallback 标签；未匹配时返回原始值
 */
export function getStageLabel(stageId: CaseStageId | string): string {
  return CASE_STAGES[stageId as CaseStageId]?.label ?? stageId;
}
/**
 * 收费状态 → i18n key。
 * @param key 收费状态键或自由文本
 * @returns i18n key；未匹配时返回 `""`
 */
export function getBillingStatusI18nKey(
  key: BillingStatusKey | string,
): string {
  return BILLING_STATUSES[key as BillingStatusKey]?.i18nKey ?? "";
}
/**
 * 收费状态 → fallback 标签。
 * @param key 收费状态键或自由文本
 * @returns fallback 标签；未匹配时返回原始值
 */
export function getBillingStatusLabel(key: BillingStatusKey | string): string {
  return BILLING_STATUSES[key as BillingStatusKey]?.label ?? key;
}
/**
 * 门禁 ID 转 i18n 键。
 * @param gateId Gate ID 或自由文本
 * @returns i18n key；未匹配时返回 `""`
 */
export function getGateI18nKey(gateId: GateId | string): string {
  return CASE_GATES[gateId as GateId]?.i18nKey ?? "";
}
/**
 * 门禁 ID 转回退标签。
 * @param gateId Gate ID 或自由文本
 * @returns fallback 标签；未匹配时返回原始值
 */
export function getGateLabel(gateId: GateId | string): string {
  return CASE_GATES[gateId as GateId]?.label ?? gateId;
}

/**
 * 将案件类型代码转为 i18n key（`cases.constants.caseTypes.<code>`）。
 * @param code - 案件类型代码
 * @returns i18n key；未匹配时返回 `""`
 */
export function getCaseTypeI18nKey(code: string): string {
  if (!code) return "";
  return `cases.constants.caseTypes.${code}`;
}
