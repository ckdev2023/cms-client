// ─── P1 Supplement Round & Reminder Failure Adapter (p1-fe-005-01) ─
// case record → SupplementRoundInfo / ReminderFailureInfo。
// 独立ファイルに分離し max-lines を遵守。

import type {
  SupplementRoundInfo,
  SupplementRoundStatusKey,
  ReminderFailureInfo,
} from "../types-detail";
import {
  formatDate,
  readBoolean,
  readNullableString,
  readNumber,
} from "./CaseAdapterShared";

// ─── Supplement Round Info ───────────────────────────────────────

const SUPPLEMENT_STEP_CODES: ReadonlySet<string> = new Set([
  "NEED_SUPPLEMENT",
  "SUPPLEMENT_PROCESSING",
]);

function resolveSupplementRoundStatus(
  stepCode: string,
): SupplementRoundStatusKey {
  if (stepCode === "NEED_SUPPLEMENT") return "notice_received";
  return "processing";
}

const SUPPLEMENT_STATUS_TONE: Record<
  SupplementRoundStatusKey,
  "warning" | "danger" | "primary"
> = {
  notice_received: "danger",
  processing: "warning",
  resubmitted: "primary",
};

function isSupplementDeadlineUrgent(deadlineIso: string | null): boolean {
  if (!deadlineIso) return false;
  const now = new Date();
  const dl = new Date(deadlineIso);
  const daysRemaining = Math.ceil(
    (dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  return daysRemaining <= 7;
}

/**
 * 从案件记录构建补正轮次摘要。
 *
 * 当 `stepCode` 不属于补正阶段时返回 `null`。
 *
 * @param caseRecord - 服务端聚合结果中的案件记录。
 * @param isReadonly - 当前是否为 S9 只读状态。
 * @returns 补正轮次信息；不在补正阶段时返回 `null`。
 */
export function buildSupplementRoundInfo(
  caseRecord: Record<string, unknown>,
  isReadonly: boolean,
): SupplementRoundInfo | null {
  const stepCode = readNullableString(caseRecord, "currentWorkflowStepCode");
  if (!stepCode || !SUPPLEMENT_STEP_CODES.has(stepCode)) return null;

  const supplementCount = readNumber(caseRecord, "supplementCount");
  const round = supplementCount > 0 ? supplementCount : 1;
  const statusKey = resolveSupplementRoundStatus(stepCode);
  const deadlineRaw = readNullableString(caseRecord, "supplementDeadline");

  return {
    round,
    statusKey,
    statusLabel: statusKey,
    tone: SUPPLEMENT_STATUS_TONE[statusKey],
    noticeDate: formatDate(
      readNullableString(caseRecord, "lastSupplementNoticeDate"),
    ),
    reason: readNullableString(caseRecord, "lastSupplementReason") ?? "",
    deadline: formatDate(deadlineRaw),
    deadlineUrgent: isSupplementDeadlineUrgent(deadlineRaw),
    canResubmit: stepCode === "NEED_SUPPLEMENT" && !isReadonly,
  };
}

// ─── Reminder Failure Info ───────────────────────────────────────

/**
 * 从当前在留期间记录构建催办创建失败摘要。
 *
 * 当 `reminderCreated=true` 或缺少错误信息时返回 `null`。
 *
 * @param rp - 服务端聚合结果中的 `currentResidencePeriod` 切片。
 * @param isReadonly - 当前是否为 S9 只读状态。
 * @returns 催办失败信息；成功创建催办时返回 `null`。
 */
export function buildReminderFailureInfo(
  rp: Record<string, unknown> | null,
  isReadonly: boolean,
): ReminderFailureInfo | null {
  if (!rp) return null;
  const reminderCreated = readBoolean(rp, "reminderCreated");
  if (reminderCreated) return null;
  const errorMsg = readNullableString(rp, "reminderError");
  if (!errorMsg) return null;

  return {
    reason: errorMsg,
    lastAttemptDate: formatDate(
      readNullableString(rp, "reminderLastAttemptAt"),
    ),
    attemptCount: readNumber(rp, "reminderAttemptCount"),
    canRetry: !isReadonly,
  };
}
