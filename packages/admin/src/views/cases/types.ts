/* eslint-disable max-lines */
/**
 *
 */
export type CaseStageId =
  | "S1"
  | "S2"
  | "S3"
  | "S4"
  | "S5"
  | "S6"
  | "S7"
  | "S8"
  | "S9";

/**
 *
 */
export interface CaseStage {
  /**
   *
   */
  code: CaseStageId;
  /**
   *
   */
  label: string;
  /** 对应的 i18n key：`cases.constants.stages.<code>`。 */
  i18nKey: string;
  /**
   *
   */
  badge: string;
}

/**
 *
 */
export type CaseScope = "mine" | "group" | "all";
/**
 *
 */
export type CaseRiskStatus = "normal" | "attention" | "critical";
/**
 *
 */
export type CaseValidationStatus = "passed" | "pending" | "failed";

/** 空字符串表示"全部"（不过滤）。 */
export type CaseStageFilter = "" | CaseStageId;
/** 空字符串表示"全部"（不过滤）。 */
export type CaseOwnerFilter = "" | string;
/** 空字符串表示"全部"（不过滤）。 */
export type CaseGroupFilter = "" | string;
/** 空字符串表示"全部"（不过滤）。 */
export type CaseRiskFilter = "" | CaseRiskStatus;
/** 空字符串表示"全部"（不过滤）。 */
export type CaseValidationFilter = "" | CaseValidationStatus;

/**
 *
 */
export interface CaseListFiltersState {
  /**
   *
   */
  scope: CaseScope;
  /**
   *
   */
  search: string;
  /**
   *
   */
  stage: CaseStageFilter;
  /**
   *
   */
  owner: CaseOwnerFilter;
  /**
   *
   */
  group: CaseGroupFilter;
  /**
   *
   */
  risk: CaseRiskFilter;
  /**
   *
   */
  validation: CaseValidationFilter;
  /**
   *
   */
  phase?: string;
}

/**
 *
 */
export interface CaseListItem {
  /**
   *
   */
  id: string;
  /**
   *
   */
  name: string;
  /**
   *
   */
  type: string;
  /**
   *
   */
  applicant: string;
  /**
   *
   */
  customerId?: string;
  /**
   *
   */
  groupId: string;
  /**
   *
   */
  groupLabel: string;
  /**
   *
   */
  stageId: CaseStageId;
  /**
   *
   */
  stageLabel: string;
  /**
   *
   */
  ownerId: string;
  /** 后端下发的负责人显示名；缺失时前端回退 fixture。 */
  ownerDisplayName?: string;
  /**
   *
   */
  completionPercent: number;
  /**
   *
   */
  completionLabel: string;
  /**
   *
   */
  validationStatus: CaseValidationStatus;
  /**
   *
   */
  validationLabel: string;
  /**
   *
   */
  blockerCount: number;
  /**
   *
   */
  unpaidAmount: number;
  /**
   *
   */
  updatedAtLabel: string;
  /**
   *
   */
  dueDate: string;
  /**
   *
   */
  dueDateLabel: string;
  /**
   *
   */
  riskStatus: CaseRiskStatus;
  /**
   *
   */
  riskLabel: string;
  /**
   *
   */
  sampleKey?: string;
  /**
   *
   */
  visibleScopes: CaseScope[];
  /**
   *
   */
  batchLabel?: string;
  /**
   *
   */
  casePartySummary?: string;
  /**
   *
   */
  materialSummary?: string;
  /**
   *
   */
  caseNo?: string;
  /** 业务维度阶段（双层状态机）。NOT NULL，服务端强制写入。 */
  businessPhase: string;
  /** P1 BMV 当前业务子步骤标签（如"审查中"），非 BMV 案件为 `undefined`。 */
  workflowStepLabel?: string;
  /** P1 BMV 当前业务子步骤代码（如 `"UNDER_REVIEW"`），非 BMV 案件为 `undefined`。 */
  workflowStepCode?: string;
}

/**
 *
 */
export type CaseSummaryCardKey =
  | "activeCases"
  | "failedValidations"
  | "dueSoon"
  | "unpaidTotal";

/**
 *
 */
export interface CaseSummaryCardData {
  /**
   *
   */
  key: CaseSummaryCardKey;
  /**
   *
   */
  variant: "primary" | "info" | "warning" | "neutral";
  /**
   *
   */
  value: number;
  /**
   *
   */
  label: string;
  /** 对应的 i18n key：`cases.constants.summaryCards.<key>`。 */
  i18nKey: string;
}

/**
 *
 */
export type CaseDetailTab =
  | "overview"
  | "validation"
  | "documents"
  | "tasks"
  | "info"
  | "forms"
  | "deadlines"
  | "billing"
  | "messages"
  | "log";

/**
 *
 */
export interface CaseDetailTabDef {
  /**
   *
   */
  key: CaseDetailTab;
  /**
   *
   */
  label: string;
  /** 对应的 i18n key：`cases.constants.detailTabs.<key>`。 */
  i18nKey: string;
  /**
   *
   */
  icon: string;
}

/**
 *
 */
export type GateId = "A" | "B" | "C";
/**
 *
 */
export type GateSeverity = "blocking" | "warning" | "informational";

/**
 *
 */
export interface GateDefinition {
  /**
   *
   */
  id: GateId;
  /**
   *
   */
  label: string;
  /** 对应的 i18n key：`cases.constants.gates.<id>.label`。 */
  i18nKey: string;
  /**
   *
   */
  severity: GateSeverity;
  /**
   *
   */
  desc: string;
  /** 对应的 i18n key：`cases.constants.gates.<id>.desc`。 */
  descI18nKey: string;
}

/**
 *
 */
export type BillingStatusKey =
  | "paid"
  | "partial"
  | "unpaid"
  | "arrears"
  | "waived"
  | "due"
  | "overdue";

/**
 *
 */
export interface BillingStatusDef {
  /**
   *
   */
  label: string;
  /** 对应的 i18n key：`cases.constants.billingStatuses.<key>`。 */
  i18nKey: string;
  /**
   *
   */
  badge: string;
}

/**
 *
 */
export type LogCategoryKey = "all" | "operation" | "review" | "status";

/**
 *
 */
export interface LogCategoryDef {
  /**
   *
   */
  key: LogCategoryKey;
  /**
   *
   */
  label: string;
  /** 对应的 i18n key：`cases.constants.logCategories.<key>`。 */
  i18nKey: string;
}

/**
 *
 */
export type CaseSampleKey =
  | "work"
  | "family"
  | "gate-fail"
  | "arrears"
  | "correction"
  | "archived";

/**
 *
 */
export type CaseRoleKey = "admin" | "owner" | "assistant" | "finance";

/**
 *
 */
export interface CaseRoleDef {
  /**
   *
   */
  key: CaseRoleKey;
  /**
   *
   */
  label: string;
  /**
   *
   */
  scope: string;
  /**
   *
   */
  canEdit: string;
  /**
   *
   */
  canExport: boolean;
  /**
   *
   */
  auditRequired: boolean;
}

/**
 *
 */
export interface CaseOwnerOption {
  /**
   *
   */
  value: string;
  /**
   *
   */
  label: string;
  /**
   *
   */
  initials: string;
  /**
   *
   */
  avatarClass: string;
  /** 所属分组 ID；`null` 表示 Local Admin（无组归属，跨组豁免）。 */
  group?: string | null;
}

/**
 *
 */
export interface CaseGroupOption {
  /**
   *
   */
  value: string;
  /**
   *
   */
  label: string;
}

export type {
  CaseTemplateId,
  ApplicationType,
  CaseTemplateRequirementItem,
  CaseTemplateRequirementSection,
  CaseTemplateDef,
  CreateCaseStep,
  CreateCaseStepDef,
  CreateCaseDraftState,
  CaseCreateSelectedRelation,
  CaseCreateSourceContext,
  CreateCaseRelatedParty,
} from "./types-create";

export type {
  ProviderProgress,
  RiskBlock,
  TimelineEntry,
  TeamMember,
  RelatedParty,
  DeadlineItem,
  DocumentItem,
  DocumentGroup,
  PaymentRow,
  BillingData,
  GateItem,
  ValidationData,
  SubmissionPackage,
  CorrectionPackage,
  DoubleReviewEntry,
  RiskConfirmationRecord,
  FormTemplate,
  FormGenerated,
  FormsData,
  TaskItem,
  MessageTypeKey,
  MessageItem,
  LogEntry,
  OverviewActions,
  PostApprovalFlow,
  ResidencePeriod,
  ReminderSchedule,
  SurveyQuoteStatusKey,
  SurveyQuoteStatus,
  PreSignGateInfo,
  PreSignBlocker,
  WorkflowStepSummary,
  FailureCloseoutInfo,
  CaseDetail,
  CaseCreateCustomerOption,
  FamilyDraftParty,
  FamilyScenario,
  DocumentFileVersion,
  DocumentReviewRecord,
  DocumentReminderRecord,
  DocumentItemActions,
  SupplementRoundInfo,
  SupplementRoundStatusKey,
  ReminderFailureInfo,
} from "./types-detail";
