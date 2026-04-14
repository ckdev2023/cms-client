/* eslint-disable max-lines */
import type {
  BillingStatusKey,
  CaseDetailTab,
  CaseStageId,
  GateId,
  LogCategoryKey,
} from "./types";

export type { CaseRoleKey, CaseSampleKey } from "./types";

/**
 *
 */
export interface ProviderProgress {
  /**
   *
   */
  label: string;
  /**
   *
   */
  done: number;
  /**
   *
   */
  total: number;
}

/**
 *
 */
export interface RiskBlock {
  /**
   *
   */
  blockingCount: string;
  /**
   *
   */
  blockingDetail: string;
  /**
   *
   */
  arrearsStatus: string;
  /**
   *
   */
  arrearsDetail: string;
  /**
   *
   */
  deadlineAlert: string;
  /**
   *
   */
  deadlineAlertDetail: string;
  /**
   *
   */
  lastValidation: string;
  /**
   *
   */
  reviewStatus: string;
}

/**
 *
 */
export interface TimelineEntry {
  /**
   *
   */
  color: string;
  /**
   *
   */
  text: string;
  /**
   *
   */
  meta: string;
}

/**
 *
 */
export interface TeamMember {
  /**
   *
   */
  initials: string;
  /**
   *
   */
  name: string;
  /**
   *
   */
  role: string | null;
  /**
   *
   */
  subtitle: string;
  /**
   *
   */
  gradient: string;
}

/**
 *
 */
export interface RelatedParty {
  /**
   *
   */
  initials: string;
  /**
   *
   */
  name: string;
  /**
   *
   */
  role: string;
  /**
   *
   */
  detail: string;
  /**
   *
   */
  avatarStyle: string;
}

/**
 *
 */
export interface DeadlineItem {
  /**
   *
   */
  id: number | string;
  /**
   *
   */
  title: string;
  /**
   *
   */
  desc: string;
  /**
   *
   */
  date: string;
  /**
   *
   */
  remaining: string;
  /**
   *
   */
  severity: string;
}

/**
 * 附件版本记录（§7.2）。
 */
export interface DocumentFileVersion {
  /**
   *
   */
  version: number;
  /**
   *
   */
  fileName: string;
  /**
   *
   */
  relativePath: string;
  /**
   *
   */
  registeredAt: string;
  /**
   *
   */
  storageType: string;
  /**
   *
   */
  referenceSource: string;
  /** 有效期（ISO 日期），可无。 */
  expiryDate?: string | null;
}

/**
 * 审核记录（§7.3）。
 */
export interface DocumentReviewRecord {
  /**
   *
   */
  conclusion: "approved" | "rejected";
  /**
   *
   */
  conclusionLabel: string;
  /** 退回时必填原因。 */
  reason: string | null;
  /**
   *
   */
  reviewer: string;
  /**
   *
   */
  time: string;
}

/**
 * 催办记录（§7.4）。
 */
export interface DocumentReminderRecord {
  /**
   *
   */
  time: string;
  /**
   *
   */
  method: string;
  /**
   *
   */
  target: string;
  /**
   *
   */
  operator: string;
}

/**
 *
 */
export interface DocumentItem {
  /**
   *
   */
  name: string;
  /**
   *
   */
  meta: string;
  /**
   *
   */
  status: string;
  /**
   *
   */
  statusLabel: string;
  /**
   *
   */
  canWaive?: boolean;
  /** 本地归档相对路径；`null` 或 `undefined` 表示"未登记"。 */
  relativePath?: string | null;
  /** 引用来源标记（"本资料项登记" / "引用自：{来源}"）。 */
  referenceLabel?: string | null;
  /** 引用此版本的案件数（> 1 时展示多案件引用提示）。 */
  referenceCount?: number;
  /** 附件版本历史。 */
  versions?: DocumentFileVersion[];
  /** 审核记录。 */
  reviews?: DocumentReviewRecord[];
  /** 催办记录时间线。 */
  reminders?: DocumentReminderRecord[];
  /** 行内操作按钮可见标志。 */
  actions?: DocumentItemActions;
}

/**
 * 行内动作可见性（§8）。
 */
export interface DocumentItemActions {
  /** 可审核通过（状态=uploaded_reviewing）。 */
  canApprove?: boolean;
  /** 可退回补正（状态=uploaded_reviewing）。 */
  canReject?: boolean;
  /** 可发送催办（状态∈{pending, rejected}）。 */
  canRemind?: boolean;
  /** 可标记 waived。 */
  canWaive?: boolean;
  /** 可登记资料（本地归档）。 */
  canRegister?: boolean;
  /** 可引用既有版本。 */
  canReference?: boolean;
}

/**
 *
 */
export interface DocumentGroup {
  /**
   *
   */
  group: string;
  /**
   *
   */
  count: string;
  /**
   *
   */
  items: DocumentItem[];
}

/**
 *
 */
export interface PaymentRow {
  /**
   *
   */
  date: string;
  /**
   *
   */
  type: string;
  /**
   *
   */
  amount: string;
  /**
   *
   */
  status: BillingStatusKey | string;
  /**
   *
   */
  statusLabel: string;
}

/**
 *
 */
export interface BillingData {
  /**
   *
   */
  total: string;
  /**
   *
   */
  received: string;
  /**
   *
   */
  outstanding: string;
  /**
   *
   */
  payments: PaymentRow[];
}

/**
 *
 */
export interface GateItem {
  /**
   *
   */
  gate: GateId | string;
  /**
   *
   */
  title: string;
  /**
   *
   */
  fix?: string;
  /**
   *
   */
  note?: string;
  /**
   *
   */
  assignee?: string;
  /**
   *
   */
  deadline?: string;
  /**
   *
   */
  actionLabel?: string;
  /**
   *
   */
  actionTab?: CaseDetailTab | string;
}

/**
 *
 */
export interface ValidationData {
  /**
   *
   */
  lastTime: string;
  /**
   *
   */
  blocking: GateItem[];
  /**
   *
   */
  warnings: GateItem[];
  /**
   *
   */
  info: GateItem[];
  /**
   *
   */
  retriggerNote?: string;
}

/**
 *
 */
export interface SubmissionPackage {
  /**
   *
   */
  id: string;
  /**
   *
   */
  status: string;
  /**
   *
   */
  locked: boolean;
  /**
   *
   */
  date: string;
  /**
   *
   */
  summary: string;
}

/**
 *
 */
export interface CorrectionPackage {
  /**
   *
   */
  id: string;
  /**
   *
   */
  status: string;
  /**
   *
   */
  noticeDate: string;
  /**
   *
   */
  relatedSub: string;
  /**
   *
   */
  corrDeadline: string;
  /**
   *
   */
  items: string;
  /**
   *
   */
  note: string;
}

/**
 *
 */
export interface DoubleReviewEntry {
  /**
   *
   */
  initials: string;
  /**
   *
   */
  name: string;
  /**
   *
   */
  verdict: string;
  /**
   *
   */
  verdictBadge: string;
  /**
   *
   */
  time: string;
  /**
   *
   */
  comment: string | null;
  /**
   *
   */
  rejectReason: string | null;
}

/**
 *
 */
export interface RiskConfirmationRecord {
  /**
   *
   */
  confirmedBy: string;
  /**
   *
   */
  reason: string;
  /**
   *
   */
  evidence: string;
  /**
   *
   */
  time: string;
  /**
   *
   */
  amount: string;
}

/**
 *
 */
export interface FormTemplate {
  /**
   *
   */
  name: string;
  /**
   *
   */
  meta: string;
  /**
   *
   */
  actionLabel: string;
}

/**
 *
 */
export interface FormGenerated {
  /**
   *
   */
  name: string;
  /**
   *
   */
  meta: string;
  /**
   *
   */
  tone: string;
  /**
   *
   */
  statusLabel: string;
}

/**
 *
 */
export interface FormsData {
  /**
   *
   */
  templates: FormTemplate[];
  /**
   *
   */
  generated: FormGenerated[];
}

/**
 *
 */
export interface TaskItem {
  /**
   *
   */
  label: string;
  /**
   *
   */
  done: boolean;
  /**
   *
   */
  due: string;
  /**
   *
   */
  assignee: string;
  /**
   *
   */
  color: string;
  /**
   *
   */
  dueColor: string;
}

/**
 *
 */
export type MessageTypeKey =
  | "internal"
  | "client_visible"
  | "phone"
  | "meeting"
  | "auto_email";

/**
 *
 */
export interface MessageItem {
  /**
   *
   */
  id: string;
  /**
   *
   */
  avatar: string;
  /**
   *
   */
  avatarStyle: string;
  /**
   *
   */
  author: string;
  /**
   *
   */
  type: MessageTypeKey;
  /**
   *
   */
  typeLabel: string;
  /**
   *
   */
  body: string;
  /**
   *
   */
  time: string;
  /**
   *
   */
  actionLabel?: string;
}

/**
 *
 */
export interface LogEntry {
  /**
   *
   */
  type: LogCategoryKey | string;
  /**
   *
   */
  avatar: string;
  /**
   *
   */
  avatarStyle: string;
  /**
   *
   */
  text: string;
  /**
   *
   */
  category: string;
  /**
   *
   */
  categoryChip: string;
  /**
   *
   */
  objectType: string;
  /**
   *
   */
  time: string;
  /**
   *
   */
  dotColor: string;
}

/**
 *
 */
export interface OverviewActions {
  /**
   *
   */
  primary: {
    /**
     *
     */
    label: string; /**
     *
     */
    tab: CaseDetailTab | string;
  };
  /**
   *
   */
  secondary: {
    /**
     *
     */
    label: string; /**
     *
     */
    tab: CaseDetailTab | string;
  };
}

/**
 *
 */
export interface PostApprovalFlowRow {
  /**
   *
   */
  label: string;
  /**
   *
   */
  value: string;
}

/**
 *
 */
export interface PostApprovalFlow {
  /**
   *
   */
  statusLabel: string;
  /**
   *
   */
  tone: string;
  /**
   *
   */
  rows: PostApprovalFlowRow[];
  /**
   *
   */
  note: string;
  /**
   *
   */
  actions: {
    /**
     *
     */
    label: string;
  }[];
}

/**
 *
 */
export interface ResidencePeriod {
  /**
   *
   */
  tone: string;
  /**
   *
   */
  statusLabel: string;
  /**
   *
   */
  residenceStatus: string;
  /**
   *
   */
  startDate: string;
  /**
   *
   */
  endDate: string;
  /**
   *
   */
  recordMeta: string;
}

/**
 *
 */
export interface ReminderSchedule {
  /**
   *
   */
  tone: string;
  /**
   *
   */
  statusLabel: string;
  /**
   *
   */
  reminderDate: string;
  /**
   *
   */
  reminders: {
    /**
     *
     */
    label: string; /**
     *
     */
    date: string; /**
     *
     */
    severity: string;
  }[];
  /**
   *
   */
  recordMeta: string;
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
  title: string;
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
  caseType: string;
  /**
   *
   */
  applicationType: string;
  /**
   *
   */
  acceptedDate: string;
  /**
   *
   */
  targetDate: string;

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
  /**
   *
   */
  riskConfirmationRecord: RiskConfirmationRecord | null;
  /**
   *
   */
  documents: DocumentGroup[];
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
}

/**
 *
 */
export interface CaseCreateCustomerOption {
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
  kana: string;
  /**
   *
   */
  group: string;
  /**
   *
   */
  groupLabel: string;
  /**
   *
   */
  roleHint: string;
  /**
   *
   */
  summary: string;
  /**
   *
   */
  contact: string;
}

/**
 *
 */
export interface FamilyDraftParty {
  /**
   *
   */
  name: string;
  /**
   *
   */
  role: string;
  /**
   *
   */
  relation: string;
  /**
   *
   */
  contact: string;
  /**
   *
   */
  note: string;
  /**
   *
   */
  reuseDocs: string[];
  /**
   *
   */
  staleDocWarning?: string;
}

/**
 *
 */
export interface FamilyScenario {
  /**
   *
   */
  title: string;
  /**
   *
   */
  summary: string;
  /**
   *
   */
  roles: string[];
  /**
   *
   */
  defaultDraftParties: FamilyDraftParty[];
  /**
   *
   */
  reuseNotes: string[];
  /**
   *
   */
  gateChecks: string[];
}
