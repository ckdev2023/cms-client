/**
 * 概览 Tab 的类型定义。
 *
 * 位置沿革：自 `views/cases/types-detail.ts`（1759 行 / 126 处 import 的类型枢纽）
 * 按 Tab 归属拆出（B3）。归属口径沿用 B1 确立的九子域划分——以 CASE_DETAIL_TABS、
 * RefetchTag slice、seam adapter 分布、i18n 命名空间四方互证，非按文件名臆断。
 *
 * 本文件只依赖模块类型内核 `types-core.ts`，不得 import 其他 Tab 的类型
 * （「tabs 之间互不 import」，由 depcruise 的 no-circular 与后续边界规则守门）。
 */

import type {
  CaseDetailTab,
  LocalizableText,
  TimelineTrack,
} from "../../../types-core";

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
  | "final_payment_milestone_missing"
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
  /** 是否存在尾款类收费节点（名称含尾款/final/結果 关键词）。 */
  finalPaymentMilestoneMatched: boolean;
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
