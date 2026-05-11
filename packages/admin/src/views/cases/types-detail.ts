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
 * adapter 层面向 UI 的可翻译文本结构，替代裸 `key + params` 散落字段。
 */
export interface LocalizableText {
  /**
   *
   */
  key: string;
  /**
   *
   */
  params?: Record<string, unknown>;
}

/**
 * 顾客多语言名称（R27-S）。
 *
 * 来源：server deepLink 中 `customerNameZh` / `customerNameJa` / `customerNameEn`。
 * 缺失时各字段为空字符串；view 层按 `locale` 取值后 fallback 到 `detail.client`。
 */
export interface CustomerLocalizedNames {
  /** 中文名。 */
  zh: string;
  /** 日文名。 */
  ja: string;
  /** 英文名。 */
  en: string;
}

/**
 *
 */
export interface ProviderProgress {
  /**
   *
   */
  label: string;
  /**
   * 国际化键：`cases.detail.providers.${providerRole}`；
   * 经管签且 `employer` 时为 `cases.detail.providers.employerBmv`。
   */
  labelKey: string;
  /**
   * 原始 providerRole enum 值，未知时为 `"unspecified"`
   */
  providerRole: string;
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
  /** i18n — view 层用 `t(loc.key, loc.params)` 渲染阻断明细。 */
  blockingDetailLoc?: LocalizableText;
  /** i18n — view 层用 `t(loc.key)` 渲染最近校验状态。 */
  lastValidationLoc?: LocalizableText;
  /** i18n — view 层用 `t(loc.key, loc.params)` 渲染期限提醒。 */
  deadlineAlertLoc?: LocalizableText;
  /** i18n — view 层用 `t(loc.key)` 渲染欠款状态文案。 */
  arrearsStatusLoc?: LocalizableText;
  /** i18n — view 层用 `t(loc.key, loc.params)` 渲染欠款金额详情。 */
  arrearsDetailLoc?: LocalizableText;
  /**
   *
   */
  reviewStatus: string;
}

/**
 *
 */
/** timeline 事件轨道类型——概览双轨渲染使用。 */
export type TimelineTrack = "business_phase" | "stage" | "other";

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
  textParams?: Record<string, unknown>;
  /**
   *
   */
  meta: string;
  /** 数据修复 / 合成标记；值为 `"data_repair"` 时 UI 显示灰色 chip。 */
  synthesized?: string;
  /** 事件轨道——`business_phase` / `stage` / `other`；概览双轨渲染使用。 */
  track?: TimelineTrack;
  /** 桶内事件总数（≥2 时启用合并展示）。 */
  mergedCount?: number;
  /** 桶内最早 ISO 时间戳。 */
  mergedEarliestIso?: string;
  /** 桶内最新 ISO 时间戳。 */
  mergedLatestIso?: string;
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
  remainingKey?: string;
  /**
   *
   */
  remainingParams?: Record<string, unknown>;
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
  /** i18n key — view 层必须用 t() 翻译 */
  statusLabelKey: string;
  /**
   *
   */
  canWaive?: boolean;
  /** 本地归档相对路径；`null` 或 `undefined` 表示"未登记"。 */
  relativePath?: string | null;
  /** i18n key — 引用来源标记；view 层必须用 t() 翻译 */
  referenceLabelKey?: string | null;
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
  /**
   * 后端原始状态（保留 `waiting_upload` / `revision_required` 等服务端枚举），
   * 用于行内动作守卫的精确判断；前端展示仍用上面的归一化 `status`。
   */
  backendStatus?: string;
  /** 资料项类别（`standard` / `questionnaire` 等），影响"催办"等守卫。 */
  category?: string;
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
  /** 可取消豁免（状态=waived）。 */
  canUnwaive?: boolean;
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

/** 行类别：応収（plan）、入金（valid payment）、作废入金（voided）、冲正入金（reversed）。 */
export type PaymentRowKind = "plan" | "payment" | "voided" | "reversed";

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
  /** 行类别——用于 UI 底色区分。不提供时默认 `"plan"`（向后兼容）。 */
  kind?: PaymentRowKind;
  /** 关联的 billing plan milestone 名称（payment 行用）。 */
  milestoneName?: string;
  /** 备注文案（voided/reversed 行展示 reasonCode + 操作人）。 */
  note?: string;
  /** 金额是否带删除线（voided/reversed 行）。 */
  strikethrough?: boolean;
  /** milestone 本地化 i18n key，例如 `billing.milestone.case_fee`；未命中映射时为 `undefined`。 */
  typeI18nKey?: string;
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
  /** i18n key — 优先于 title；view 层存在时用 t(titleKey, titleParams) 渲染。 */
  titleKey?: string;
  /**
   *
   */
  titleParams?: Record<string, unknown>;
  /**
   *
   */
  fix?: string;
  /**
   *
   */
  note?: string;
  /** i18n key — 优先于 note；view 层存在时用 t(noteKey, noteParams) 渲染。 */
  noteKey?: string;
  /**
   *
   */
  noteParams?: Record<string, unknown>;
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
  /** 原始 ISO 时间戳；view 层可用于 locale-aware 格式化，缺失时回退 `lastTime`。 */
  lastTimeIso?: string;
  /** 关联资料/文书的最大 updatedAt ISO；用于 stale 判定（A2）。 */
  dataMaxUpdatedAt?: string;
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

/** 生成文書の後端ステータス（三態）。 */
export type GeneratedDocumentBackendStatus =
  | "draft"
  | "final"
  | "exporting"
  | "exported"
  | "export_failed";

/**
 *
 */
export interface FormTemplate {
  /** server 側レコード ID。 */
  id: string;
  /**
   *
   */
  name: string;
  /**
   * 兜底用メタ文字列（構造化フィールドが利用できない場合のフォールバック）。
   */
  meta: string;
  /**
   *
   */
  actionLabel: string;
  /** i18n key — `cases.detail.forms.docType.<rawDocType>`；view 層で `t()` 翻訳。 */
  docTypeKey?: string;
  /** 後端原始 docType 文字列（i18n 未命中時のフォールバック）。 */
  docTypeRaw?: string;
  /** テンプレートの言語コード（ISO 639-1）。 */
  language?: string;
  /** テンプレートのバージョン番号。 */
  versionNo?: number;
}

/**
 *
 */
export interface FormGenerated {
  /** server 側レコード ID。 */
  id: string;
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
  /** 後端ステータス — finalize / export ボタン判定用。 */
  backendStatus: GeneratedDocumentBackendStatus;
  /** 生成ファイルの URL（`null` = 未生成）。 */
  fileUrl: string | null;
  /** `true` のとき fileUrl は placeholder プロトコルであり、ダウンロード不可。 */
  fileUrlIsPlaceholder: boolean;
  /**
   * ブラウザでダウンロード可能な URL — server `/generated-documents/:id/file` 経由のストリーミング。
   * status=`exported` かつ fileUrl 有効時のみ非 null。
   */
  downloadUrl: string | null;
  /** 確定/出力操作者の表示名。 */
  approvedBy: string | null;
  /** 確定/出力日時（フォーマット済み表示用文字列）。 */
  approvedAt: string | null;
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
  id: string;
  /**
   *
   */
  label: string;
  /**
   * 优先于 `label` 展示（如建案自动任务按 `taskType` 本地化）。
   */
  labelI18nKey?: string;
  /**
   *
   */
  done: boolean;
  /**
   * 服务端原始状态（`"pending"` / `"in_progress"` / `"completed"` / `"cancelled"`）。
   */
  status: string;
  /**
   *
   */
  due: string;
  /**
   * 首字母头像（大写首字符或 "—"）。
   */
  assignee: string;
  /**
   * 负责人全名；用于 tooltip / title 属性。
   */
  assigneeFullName: string;
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
  /** i18n key — view 层必须用 t() 翻译。 */
  typeLabelKey: string;
  /**
   * @deprecated T2.6 完成后删除，改用 typeLabelKey + t()。
   */
  typeLabel: string;
  /**
   *
   */
  body: string;
  /** 已格式化的展示时间（locale 敏感）。 */
  time: string;
  /** 原始 ISO 8601 时间戳；adapter 未传 locale 时可能为 undefined。 */
  timeIso?: string;
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
  textParams?: Record<string, unknown>;
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
  /** 数据修复 / 合成标记；值为 `"data_repair"` 时 UI 显示灰色 chip。 */
  synthesized?: string;
  /** 事件轨道——`business_phase` / `stage` / `other`。 */
  track?: TimelineTrack;
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

// ─── P1 Survey / Quote / Pre-Sign Gate ───────────────────────────
// 问卷回收、报价确认与签约前建案门禁。
// 来源：CaseDetailAggregateDto.counts（questionnaireItemsTotal/Done）
//       + billing（quotePrice）+ case record（visaPlan, signedAt）。
// P0 案件此字段为 null。

/** 问卷/报价完成度状态键。 */
export type SurveyQuoteStatusKey = "not_started" | "in_progress" | "completed";

/**
 * 问卷或报价的完成状态摘要。
 */
export interface SurveyQuoteStatus {
  /** 状态键。 */
  statusKey: SurveyQuoteStatusKey;
  /** 展示标签（已翻译）。 */
  statusLabel: string;
  /** 语义色调（用于 badge 展示）。 */
  tone: "muted" | "warning" | "success";
  /** 进度文案（如 "1/3" 或 "已确认"）。 */
  progressLabel: string;
}

/**
 * 签约前门禁状态 — 问卷回收与报价确认前不得签约建案成功。
 */
export interface PreSignGateInfo {
  /** 门禁是否通过（问卷已完成 + 报价已确认）。 */
  passed: boolean;
  /** 阻断原因列表（门禁未通过时展示）。 */
  blockers: PreSignBlocker[];
}

/**
 * 签约前门禁的单个阻断项。
 */
export interface PreSignBlocker {
  /** 阻断代码（`survey_incomplete` / `quote_unconfirmed`）。 */
  code: string;
  /** 阻断原因展示标签。 */
  label: string;
}

// ─── P1 BMV Workflow Step Summary ─────────────────────────────────
// 经营管理签业务子步骤摘要 — 与 S1-S9 管理层阶段并行显示。
// 来源：CaseDetailAggregateDto.case.currentWorkflowStepCode
//       + BMV_WORKFLOW_STEPS_BLUEPRINT 蓝图。
// P0 案件此字段为 null（无 workflow step）。

/**
 * 经营管理签当前业务子步骤摘要。
 */
export interface WorkflowStepSummary {
  /** 步骤代码（如 `"WAITING_MATERIAL"`）。 */
  stepCode: string;
  /** 步骤展示标签（如 `"等待资料"`）。 */
  stepLabel: string;
  /** 所属管理层阶段（如 `"S2"`）。 */
  parentStage: string;
  /** 管理层阶段展示标签（如 `"资料收集中"`）。 */
  parentStageLabel: string;
  /** 蓝图排序号。 */
  sortOrder: number;
  /** 是否为失败终态步骤（`VISA_REJECTED`）。 */
  isFailureStep: boolean;
}

// ─── P1 Final Payment & COE Gate ──────────────────────────────────
// 尾款门禁与 COE 节点前端反馈。
// gate_trigger_step=COE_SENT + gate_effect_mode=block：
// 未结清尾款不得推进 COE_SENT。
// 来源：CaseDetailAggregateDto.billing（finalPaymentPaid, unpaidAmount, billingRiskAcknowledged）
//       + case record（currentWorkflowStepCode, postApprovalStage）。
// 非 BMV 案件或未到下签后阶段时此字段为 null。

/** 尾款门禁阻断项代码。 */
export type FinalPaymentBlockerCode =
  | "final_payment_outstanding"
  | "billing_risk_unacknowledged";

/**
 * 尾款门禁阻断项。
 */
export interface FinalPaymentBlocker {
  /** 阻断代码。 */
  code: FinalPaymentBlockerCode;
  /** 阻断原因展示标签（占位，由 UI 层翻译）。 */
  label: string;
}

/**
 * 尾款门禁与 COE 节点状态 — 控制 COE_SENT 推进按钮的可用性。
 */
export interface FinalPaymentGateInfo {
  /** 尾款是否已全额结清。 */
  paymentCleared: boolean;
  /** 未结清金额展示标签（如 "¥50,000"），已结清时为空。 */
  outstandingLabel: string;
  /** 是否可推进到 COE_SENT（尾款已清 + 无未确认欠款风险）。 */
  canAdvanceToCoe: boolean;
  /** 阻断原因列表（canAdvanceToCoe=false 时展示）。 */
  blockers: FinalPaymentBlocker[];
}

// ─── P1 Success Closeout Info (p1-fe-004-02) ──────────────────────
// 成功结案前置条件検査 — admin detail がチェックリストとして表示。
// 来源：CaseDetailAggregateDto.successCloseoutCheck。
// 非 BMV 案件または S8 以外の案件では null。

/**
 * 成功結案前置条件の単項。
 */
export interface SuccessCloseoutPrecondition {
  /** 条件コード（`ENTRY_CONFIRMED` / `RESIDENCE_PERIOD_RECORDED` / `RENEWAL_REMINDER_SCHEDULED`）。 */
  code: string;
  /** 条件の表示ラベル。 */
  label: string;
  /** 条件が満たされたか。 */
  satisfied: boolean;
}

/**
 * 成功結案前置条件検査結果 — 全条件が satisfied でなければ成功結案不可。
 */
export interface SuccessCloseoutInfo {
  /** すべての前提条件が満たされたか。 */
  allSatisfied: boolean;
  /** 前提条件リスト。 */
  preconditions: SuccessCloseoutPrecondition[];
}

// ─── P1 Supplement Round Info (p1-fe-005-01) ─────────────────────
// 补正多轮异常态摘要 — 当案件处于 NEED_SUPPLEMENT / SUPPLEMENT_PROCESSING 时展示。
// 来源：case record（supplementCount, currentWorkflowStepCode, lastSupplementNoticeDate,
//       lastSupplementReason, supplementDeadline）。
// 非 BMV 案件或不在补正循环中时此字段为 null。

/** 补正循环状态键。 */
export type SupplementRoundStatusKey =
  | "notice_received"
  | "processing"
  | "resubmitted";

/**
 * 补正多轮状态摘要 — 展示补正轮次、原因与重试入口。
 */
export interface SupplementRoundInfo {
  /** 当前补正轮次（1-based）。 */
  round: number;
  /** 补正状态键。 */
  statusKey: SupplementRoundStatusKey;
  /** 状态展示标签（已翻译）。 */
  statusLabel: string;
  /** 语义色调。 */
  tone: "warning" | "danger" | "primary";
  /** 补正通知日期（格式化后）。 */
  noticeDate: string;
  /** 补正原因。 */
  reason: string;
  /** 补正提交期限（格式化后），无期限时为空。 */
  deadline: string;
  /** 期限是否紧急（≤7天）。 */
  deadlineUrgent: boolean;
  /** 是否可以重新提交（当前步骤 = NEED_SUPPLEMENT 且案件非只读）。 */
  canResubmit: boolean;
}

// ─── P1 Reminder Failure Info (p1-fe-005-01) ─────────────────────
// 提醒创建失败状态 — 当 reminderCreated=false 且 reminderError 有值时展示。
// 来源：currentResidencePeriod（reminderCreated, reminderError, reminderLastAttemptAt）。
// 非 BMV 案件或无在留期间记录时此字段为 null。

/**
 * 提醒创建失败信息 — 展示失败原因与重试入口。
 */
export interface ReminderFailureInfo {
  /** 失败原因。 */
  reason: string;
  /** 最近一次尝试时间（格式化后）。 */
  lastAttemptDate: string;
  /** 重试次数。 */
  attemptCount: number;
  /** 是否可以重试。 */
  canRetry: boolean;
}

// ─── P1 Failure Closeout Info ─────────────────────────────────────
// 失败结案路径摘要 — admin detail 根据此信息展示失败结案提示与操作按钮。
// 来源：CaseDetailAggregateDto.failureCloseoutCheck。
// 非 BMV 案件或已归档案件此字段为 null。

/**
 * 失败结案路径信息。
 */
export interface FailureCloseoutInfo {
  /** 当前是否处于失败结案路径。 */
  isFailurePath: boolean;
  /** 失败帰因代码（`VISA_REJECTED` / `APPLICATION_REJECTED` / `CLIENT_WITHDRAWN` / `MANUAL_FAILURE_CLOSE`），帰因未确定时为 null。 */
  reasonCode: string | null;
  /** 失败帰因展示标签，帰因未确定时为 null。 */
  reasonLabel: string | null;
  /** 是否可直接结案（无需额外确认）。 */
  canDirectClose: boolean;
  /** 是否必须提供 closeReason。 */
  closeReasonRequired: boolean;
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
 * 在留期間面板の表示モデル — server `CaseResidencePeriodSummary` から適応。
 */
export interface ResidencePeriod {
  /** server 側レコード ID。 */
  id: string;
  /** 語義色調（`"success"` / `"warning"` / `"danger"` / `"neutral"`）。 */
  tone: string;
  /** ステータスラベル（「有効」「期限 90 日以内」「期限切れ」等）。 */
  statusLabel: string;
  /** 在留資格名。 */
  residenceStatus: string;
  /** ビザ種別コード。 */
  visaType: string;
  /** 在留期間ラベル（「5年」「3年」等）。null の場合未登録。 */
  periodLabel: string | null;
  /** `validFrom` を `YYYY-MM-DD` でフォーマットした値。 */
  startDate: string;
  /** `validUntil` を `YYYY-MM-DD` でフォーマットした値。 */
  endDate: string;
  /** 在留カード番号（表示用）。null の場合未登録。 */
  cardNumber: string | null;
  /** 入国日（フォーマット済み）。null の場合未登録。 */
  entryDate: string | null;
  /** 180/90/30 日リマインダーが生成済みか。 */
  reminderCreated: boolean;
  /** メタ情報行（カード番号、入国日等のサマリ文字列）。 */
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

/**
 *
 */
export interface CaseCreateCustomerOption {
  /**
   *
   */
  id: string;
  /** 客户业务编号，例如 `CUS-202604-0005`；部分合成/旧数据可能缺失。 */
  customerNumber?: string;
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

  // ─── P1 BMV Pre-Sign Gate Profile (p1-fe-003-02) ──────────────
  // 仅 BMV 顾客有值；创建案件时用于客户端预检签约前门禁。

  /** BMV 问卷回收状态。 */
  bmvQuestionnaireStatus?: string | null;
  /** BMV 报价确认状态。 */
  bmvQuoteStatus?: string | null;
  /** BMV 签约状态。 */
  bmvSignStatus?: string | null;
  /** BMV 承接就绪状态。 */
  bmvIntakeStatus?: string | null;
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
