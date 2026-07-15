/**
 * 迁移垫片（admin 拆分 B3）：本文件原为 1759 行 / 126 处 import 的类型枢纽，
 * 已按 Tab 归属拆解——任何 Tab 的类型改动不再波及全模块。
 *
 * 新代码请直接从归属处引用：
 * - 各 Tab 类型    → `detail/tabs/<tab>/types.ts`
 * - 聚合根与骨架   → `detail/types-detail-core.ts`
 * - 通用原语与枚举 → `types-core.ts`
 * - P1 / 建案段    → `detail/types-detail-p1.ts` / `detail/types-detail-create.ts`（B5 迁出）
 *
 * 本垫片在 codemod 迁完消费方后删除，旧路径由 ESLint no-restricted-imports 封禁。
 * 只做 re-export，不承载任何定义。
 */

// ── 类型内核（B2 建，B3 上收详情链原语）──────────────────────────
export type { CaseRoleKey, CaseSampleKey } from "./types-core";
export type {
  CustomerLocalizedNames,
  LocalizableText,
  TimelineTrack,
} from "./types-core";

// ── overview Tab ──
export type {
  FailureCloseoutInfo,
  FinalPaymentBlocker,
  FinalPaymentBlockerCode,
  FinalPaymentGateInfo,
  OverviewActions,
  PostApprovalFlow,
  PostApprovalFlowRow,
  ProviderProgress,
  ReminderFailureInfo,
  ReminderSchedule,
  ResidencePeriod,
  RiskBlock,
  SuccessCloseoutInfo,
  SuccessCloseoutPrecondition,
  SupplementRoundInfo,
  SupplementRoundStatusKey,
  TeamMember,
  TimelineEntry,
} from "./detail/tabs/overview/types";

// ── info Tab ──
export type { RelatedParty } from "./detail/tabs/info/types";

// ── deadlines Tab ──
export type { DeadlineItem } from "./detail/tabs/deadlines/types";

// ── documents Tab ──
export type {
  DocumentFileVersion,
  DocumentGroup,
  DocumentItem,
  DocumentItemActions,
  DocumentReminderRecord,
  DocumentReviewRecord,
} from "./detail/tabs/documents/types";

// ── billing Tab ──
export type {
  BillingData,
  PaymentRow,
  PaymentRowKind,
} from "./detail/tabs/billing/types";

// ── validation Tab ──
export type {
  CorrectionPackage,
  DoubleReviewEntry,
  GateItem,
  RiskConfirmationRecord,
  SubmissionPackage,
  ValidationData,
} from "./detail/tabs/validation/types";

// ── forms Tab ──
export type {
  FormGenerated,
  FormTemplate,
  FormsData,
  GeneratedDocumentBackendStatus,
} from "./detail/tabs/forms/types";

// ── tasks Tab ──
export type { TaskItem } from "./detail/tabs/tasks/types";

// ── comms Tab ──
export type {
  LogEntry,
  MessageItem,
  MessageTypeKey,
} from "./detail/tabs/comms/types";

// ── 聚合根与骨架 ──
export type {
  CaseDetail,
  CaseTypeFlowProfile,
  TitleFallbackParts,
  TransitionGuardReason,
} from "./detail/types-detail-core";

// ── P1 / BMV（B5 迁 bmv/） ──
export type {
  PreSignBlocker,
  PreSignGateInfo,
  SurveyQuoteStatus,
  SurveyQuoteStatusKey,
  WorkflowStepSummary,
} from "./detail/types-detail-p1";

// ── 建案（B5 迁 create/） ──
export type {
  CaseCreateCustomerOption,
  FamilyDraftParty,
  FamilyScenario,
} from "./detail/types-detail-create";
