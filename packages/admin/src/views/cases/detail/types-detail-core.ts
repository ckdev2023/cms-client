/**
 * 案件详情的聚合根与骨架类型。
 *
 * 位置沿革：自 `views/cases/types-detail.ts`（1759 行 / 126 处 import 的类型枢纽）
 * 拆出（B3）。Tab 类型散入 `detail/tabs/*\/types.ts`，通用原语上收 `types-core.ts`，
 * P1 与建案段各自成文件待 B5 迁出，本文件只留「公共骨架」：聚合根 `CaseDetail`
 * 及其直接附属类型。
 *
 * 分层（由 depcruise 的 no-circular 守门，B2 开启 tsPreCompilationDeps 后 type 环可见）：
 *   types-core.ts（叶子内核）← detail/tabs/*\/types.ts ← 本文件
 * 聚合根引用全部 Tab 类型是其职责所在（六路详情聚合的类型投影），方向单一，无环。
 */

import type {
  BillingStatusKey,
  CaseStageId,
  CustomerLocalizedNames,
  LocalizableText,
} from "../types-core";
import type {
  FailureCloseoutInfo,
  FinalPaymentGateInfo,
  OverviewActions,
  PostApprovalFlow,
  ProviderProgress,
  ReminderFailureInfo,
  ReminderSchedule,
  ResidencePeriod,
  RiskBlock,
  SuccessCloseoutInfo,
  SupplementRoundInfo,
  TeamMember,
  TimelineEntry,
} from "./tabs/overview/types";
import type { RelatedParty } from "./tabs/info/types";
import type { DeadlineItem } from "./tabs/deadlines/types";
import type { DocumentGroup } from "./tabs/documents/types";
import type { BillingData } from "./tabs/billing/types";
import type {
  CorrectionPackage,
  DoubleReviewEntry,
  RiskConfirmationRecord,
  SubmissionPackage,
  ValidationData,
} from "./tabs/validation/types";
import type { FormsData } from "./tabs/forms/types";
import type { TaskItem } from "./tabs/tasks/types";
import type { LogEntry, MessageItem } from "./tabs/comms/types";
import type {
  PreSignGateInfo,
  SurveyQuoteStatus,
  WorkflowStepSummary,
} from "./types-detail-p1";

/**
 * 阶段流转门禁原因——popover 用 `t(key, params)` 渲染 disabled tooltip。
 */
export interface TransitionGuardReason {
  /** 国际化键。 */
  key: string;
  /** 国际化插值参数。 */
  params?: Record<string, unknown>;
}

/**
 * 案件类型流程特征——基于 caseTypeCode 解析，控制 COE、尾款门禁、
 * 问卷报价等 section 的条件渲染。
 */
export interface CaseTypeFlowProfile {
  /** 是否走 COE / 海外贴签 / 返签流程（仅 BMV 认定类）。 */
  hasCoeFlow: boolean;
  /** 是否有尾款门禁（BMV 全系列）。 */
  hasFinalPaymentGate: boolean;
  /** 是否有问卷回收与报价确认流程（BMV 全系列）。 */
  hasSurveyQuote: boolean;
}

/**
 * adapter 暴露的标题兜底原料——view 层结合 i18n 翻译 caseTypeCode 后
 * 调用 `buildFallbackName` / `isFallbackTitle` 生成一致的 heading。
 */
export interface TitleFallbackParts {
  /** 申请人名称。 */
  applicant: string;
  /** 案件类型代码（view 层需通过 getCaseTypeI18nKey + t() 翻译）。 */
  caseTypeCode: string;
  /** 案件业务编号。 */
  caseNo: string | undefined;
  /** 案件 UUID。 */
  id: string;
}

/**
 *
 */
export interface CaseDetail {
  /**
   *
   */
  id: string;
  /**
   *
   */
  caseNo?: string;
  /**
   *
   */
  title: string;
  /** 标题兜底原料——详情 heading 需与列表行保持一致口径。 */
  titleFallbackParts: TitleFallbackParts;
  /**
   *
   */
  client: string;
  /**
   *
   */
  owner: string;
  /**
   *
   */
  agency: string;
  /**
   *
   */
  stage: string;
  /**
   *
   */
  stageCode: CaseStageId;
  /**
   *
   */
  stageMeta: string;
  /**
   *
   */
  statusBadge: string;
  /**
   *
   */
  deadline: string;
  /**
   *
   */
  deadlineMeta: string;
  /** i18n — view 层用 `t(loc.key, loc.params)` 渲染期限元信息。 */
  deadlineMetaLoc?: LocalizableText;
  /**
   *
   */
  deadlineDanger: boolean;
  /**
   *
   */
  progressPercent: number;
  /**
   *
   */
  progressCount: string;
  /**
   *
   */
  billingAmount: string;
  /**
   *
   */
  billingMeta: string;
  /**
   *
   */
  billingMetaKey?: string;
  /**
   *
   */
  billingMetaParams?: Record<string, string>;
  /**
   *
   */
  billingStatusKey: BillingStatusKey | string;
  /**
   *
   */
  docsCounter: string;
  /**
   *
   */
  readonly: boolean;

  /**
   *
   */
  customerId: string;
  /**
   *
   */
  groupId: string;
  /**
   *
   */
  groupName: string;

  /**
   *
   */
  caseType: string;
  /**
   *
   */
  applicationType: string;
  /** 业务维度阶段（双层状态机）。NOT NULL，服务端强制写入。 */
  businessPhase: string;
  /**
   *
   */
  acceptedDate: string;
  /** `YYYY-MM-DD` 格式，供 date input 回填。 */
  acceptedDateInput: string;
  /**
   *
   */
  targetDate: string;
  /** `YYYY-MM-DD` 格式，供 date input 回填。 */
  targetDateInput: string;

  /**
   *
   */
  priority: string;
  /**
   *
   */
  riskLevel: string;
  /**
   *
   */
  ownerUserId: string;
  /**
   *
   */
  assistantUserId: string;
  /**
   *
   */
  jurisdictionAuthority: string;
  /**
   *
   */
  remark: string;

  /**
   *
   */
  providerProgress: ProviderProgress[];
  /**
   *
   */
  risk: RiskBlock;
  /**
   *
   */
  nextAction: string;
  /**
   *
   */
  validationHint: string;
  /** i18n — view 层用 `t(loc.key, loc.params)` 渲染校验提示。 */
  validationHintLoc?: LocalizableText;
  /**
   *
   */
  overviewActions: OverviewActions;
  /**
   *
   */
  timeline: TimelineEntry[];
  /**
   *
   */
  team: TeamMember[];
  /**
   *
   */
  relatedParties: RelatedParty[];
  /**
   *
   */
  deadlines: DeadlineItem[];
  /**
   *
   */
  billing: BillingData;
  /**
   *
   */
  validation: ValidationData;
  /**
   *
   */
  submissionPackages: SubmissionPackage[];
  /**
   *
   */
  correctionPackage: CorrectionPackage | null;
  /**
   *
   */
  doubleReview: DoubleReviewEntry[];
  /** 事务所是否启用双人复核策略。 */
  reviewEnabled: boolean;
  /**
   *
   */
  riskConfirmationRecord: RiskConfirmationRecord | null;
  /**
   *
   */
  documents: DocumentGroup[];
  /** 服务端指示该案件的签证类型是否缺少资料模板配置。 */
  documentTemplateMissing: boolean;
  /** 资料为空时可一键从激活模板补生成清单（S1/S2 且模板有可解析条目）。 */
  checklistBootstrapAvailable: boolean;
  /**
   *
   */
  forms: FormsData;
  /**
   *
   */
  tasks: TaskItem[];
  /**
   *
   */
  logEntries: LogEntry[];
  /**
   *
   */
  messages: MessageItem[];
  /**
   *
   */
  postApprovalFlow?: PostApprovalFlow | null;
  /**
   *
   */
  residencePeriod?: ResidencePeriod | null;
  /**
   *
   */
  reminderSchedule?: ReminderSchedule | null;

  // ─── 案件类型流程特征 ────────────────────────────────────────────

  /** 基于 caseTypeCode 解析的流程特征集合；未提供时各标志视为 false。 */
  flowProfile?: CaseTypeFlowProfile;

  // ─── P1 BMV 专属读模型字段 ──────────────────────────────────────

  /** 当前业务子步骤摘要（仅 BMV 案件有值）。 */
  workflowStep?: WorkflowStepSummary | null;
  /** 失败结案路径信息（仅 BMV 案件有值）。 */
  failureCloseout?: FailureCloseoutInfo | null;
  /** 签证方案。 */
  visaPlan?: string | null;
  /** 报价金额（数值，由 billing slice 传递）。 */
  quotePriceRaw?: number;
  /** 报价金额（格式化展示用）。 */
  quotePriceLabel?: string;
  /** 补正次数。 */
  supplementCount?: number;
  /** 结果（`approved` / `rejected` / `visa_rejected` / `withdrawn` 等）。 */
  resultOutcome?: string | null;
  /** 下签后子阶段（`waiting_final_payment` / `coe_sent` / `overseas_visa_applying` / `entry_success`）。 */
  postApprovalStage?: string | null;
  /** COE 签发日期（格式化后）。 */
  coeIssuedDate?: string;
  /** COE 有效期限（格式化后）。 */
  coeExpiryDate?: string;
  /** 海外返签开始日期（格式化后）。 */
  overseasVisaStartDate?: string;
  /** 入境确认日期（格式化后）。 */
  entryConfirmedDate?: string;

  // ─── P1 Survey / Quote / Pre-Sign Gate ─────────────────────────

  /** 问卷状态摘要（仅 BMV 案件有值）。 */
  surveyStatus?: SurveyQuoteStatus | null;
  /** 报价确认状态摘要（仅 BMV 案件有值）。 */
  quoteStatus?: SurveyQuoteStatus | null;
  /** 签约前门禁状态（仅 BMV 案件有值）。 */
  preSignGate?: PreSignGateInfo | null;

  // ─── P1 Final Payment & COE Gate (p1-fe-004-01) ─────────────────

  /** 尾款门禁与 COE 节点状态（仅 BMV 案件下签后有值）。 */
  finalPaymentGate?: FinalPaymentGateInfo | null;

  // ─── P1 Success Closeout Gate (p1-fe-004-02) ───────────────────

  /** 成功结案前置条件检查（仅 BMV 案件在 S8 时有值）。 */
  successCloseout?: SuccessCloseoutInfo | null;

  // ─── P1 Supplement & Reminder Failure (p1-fe-005-01) ──────────

  /** 补正多轮状态摘要（仅 BMV 案件处于补正循环时有值）。 */
  supplementRound?: SupplementRoundInfo | null;
  /** 提醒创建失败信息（仅 BMV 案件有在留期间且提醒失败时有值）。 */
  reminderFailure?: ReminderFailureInfo | null;

  // ─── Terminal / Closeout 概要（R28-E） ───────────────────────────

  /** 结案原因文本（free-text，由 transition 时提供）。 */
  closeReason?: string | null;
  /** 归档时间（格式化后）。 */
  closedAt?: string | null;
  /** 归档操作人显示名（暂回退至 owner，后续由 stage_history 补充）。 */
  closedBy?: string | null;

  // ─── R27-S 顾客名多语言（I3） ─────────────────────────────────

  /** 顾客多语言名称；server deepLink 未提供时为 null。 */
  customerLocalizedNames?: CustomerLocalizedNames | null;

  // ─── Transition Guards (R35-E) ─────────────────────────────────

  /** 目标阶段 → 门禁原因；popover 据此 disable 不可选项。 */
  transitionGuards?: Record<string, TransitionGuardReason>;
}
