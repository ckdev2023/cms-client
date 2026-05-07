/**
 * Lead 模块下 BMV 建案门禁错误绑定。
 *
 * 服务端 `POST /api/admin/leads/:id/convert-case` 在闸口未通过时返回
 * `{ code: "CASE_BMV_GATE_BLOCKED", blockers: [{ code, message }, ...] }`。
 * 本模块将这些错误码反解为 leads namespace 下的 i18n key，
 * 供 `LeadConvertCaseDialog` 渲染 inline 错误提示，避免 R-CONSULT-02
 * R2-B-5 描述的「弹窗静默关闭、用户感知 0」问题。
 *
 * 与 customers 模块的 `CustomerBmvGateBinding` 保持代码常量同源，
 * 但 i18n key 走 `leads.errors.bmvGate.*` 命名空间。
 */

import type { ServerBlocker } from "./LeadRepositorySupport";

/** 服务端 BMV 建案门禁顶层错误码（对齐 server `CASE_BMV_GATE_ERROR_CODE`）。 */
export const LEAD_BMV_GATE_ERROR_CODE = "CASE_BMV_GATE_BLOCKED" as const;

/** 服务端 convert-case 前置条件错误码：缺少 convertedCustomerId。 */
export const LEAD_CONVERT_CASE_REQUIRES_CUSTOMER_ERROR_CODE =
  "CONVERT_CASE_REQUIRES_CUSTOMER" as const;

/** 服务端 BMV 门禁阻断码（对齐 server `BMV_CASE_CREATION_GATE_CODES`）。 */
export const LEAD_BMV_GATE_BLOCKER_CODES = {
  QUESTIONNAIRE_NOT_RETURNED: "BMV_QUESTIONNAIRE_NOT_RETURNED",
  QUOTE_NOT_CONFIRMED: "BMV_QUOTE_NOT_CONFIRMED",
  NOT_SIGNED: "BMV_NOT_SIGNED",
  INTAKE_NOT_READY: "BMV_INTAKE_NOT_READY",
} as const;

/**
 *
 */
export type LeadBmvGateBlockerCode =
  (typeof LEAD_BMV_GATE_BLOCKER_CODES)[keyof typeof LEAD_BMV_GATE_BLOCKER_CODES];

const BLOCKER_I18N_MAP: Record<string, string> = {
  [LEAD_BMV_GATE_BLOCKER_CODES.QUESTIONNAIRE_NOT_RETURNED]:
    "leads.errors.bmvGate.questionnaireNotReturned",
  [LEAD_BMV_GATE_BLOCKER_CODES.QUOTE_NOT_CONFIRMED]:
    "leads.errors.bmvGate.quoteNotConfirmed",
  [LEAD_BMV_GATE_BLOCKER_CODES.NOT_SIGNED]: "leads.errors.bmvGate.notSigned",
  [LEAD_BMV_GATE_BLOCKER_CODES.INTAKE_NOT_READY]:
    "leads.errors.bmvGate.intakeNotReady",
  MISSING_CONVERTED_CUSTOMER: "leads.errors.bmvGate.missingConvertedCustomer",
};

const FALLBACK_BLOCKER_I18N_KEY = "leads.errors.bmvGate.unknown";

/**
 * 判断服务端错误码是否为 BMV 建案门禁阻断错误。
 *
 * @param serverErrorCode - 服务端返回的业务错误码
 * @returns 是否为 CASE_BMV_GATE_BLOCKED
 */
export function isLeadBmvGateError(
  serverErrorCode: string | undefined,
): boolean {
  return (
    serverErrorCode === LEAD_BMV_GATE_ERROR_CODE ||
    serverErrorCode === LEAD_CONVERT_CASE_REQUIRES_CUSTOMER_ERROR_CODE
  );
}

/**
 * 将单个 BMV 阻断码解析为对应 i18n key。
 *
 * @param blockerCode - 服务端返回的阻断码（如 BMV_NOT_SIGNED）
 * @returns 对应的完整 i18n key；未匹配时返回 fallback key
 */
export function resolveLeadBmvBlockerI18nKey(blockerCode: string): string {
  return BLOCKER_I18N_MAP[blockerCode] ?? FALLBACK_BLOCKER_I18N_KEY;
}

/**
 * 将服务端 BMV 门禁阻断列表解析为 i18n key 列表，保持原有顺序与去重。
 *
 * @param blockers - 服务端返回的阻断项列表
 * @returns 各阻断码对应的 i18n key 数组
 */
export function resolveLeadBmvBlockerI18nKeys(
  blockers: ServerBlocker[] | undefined,
): string[] {
  if (!blockers || blockers.length === 0) return [];
  const seen = new Set<string>();
  const keys: string[] = [];
  for (const blocker of blockers) {
    const key = resolveLeadBmvBlockerI18nKey(blocker.code);
    if (seen.has(key)) continue;
    seen.add(key);
    keys.push(key);
  }
  return keys;
}
