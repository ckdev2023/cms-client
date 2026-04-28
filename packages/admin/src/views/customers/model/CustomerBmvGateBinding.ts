import type { ServerBlocker } from "./CustomerRepositorySupport";

/**
 * 服务端 BMV 建案门禁顶层错误码（对齐 CASE_BMV_GATE_ERROR_CODE）。
 */
export const BMV_GATE_ERROR_CODE = "CASE_BMV_GATE_BLOCKED" as const;

/**
 * 服务端 BMV 门禁阻断码（对齐 BMV_CASE_CREATION_GATE_CODES）。
 */
export const BMV_GATE_BLOCKER_CODES = {
  QUESTIONNAIRE_NOT_RETURNED: "BMV_QUESTIONNAIRE_NOT_RETURNED",
  QUOTE_NOT_CONFIRMED: "BMV_QUOTE_NOT_CONFIRMED",
  NOT_SIGNED: "BMV_NOT_SIGNED",
  INTAKE_NOT_READY: "BMV_INTAKE_NOT_READY",
} as const;

/**
 *
 */
export type BmvGateBlockerCode =
  (typeof BMV_GATE_BLOCKER_CODES)[keyof typeof BMV_GATE_BLOCKER_CODES];

const BLOCKER_I18N_MAP: Record<string, string> = {
  [BMV_GATE_BLOCKER_CODES.QUESTIONNAIRE_NOT_RETURNED]:
    "customers.detail.bmvIntake.errors.questionnaireRequiredForQuote",
  [BMV_GATE_BLOCKER_CODES.QUOTE_NOT_CONFIRMED]:
    "customers.detail.bmvIntake.errors.quoteRequiredForSign",
  [BMV_GATE_BLOCKER_CODES.NOT_SIGNED]:
    "customers.detail.bmvIntake.errors.signRequiredForCase",
  [BMV_GATE_BLOCKER_CODES.INTAKE_NOT_READY]:
    "customers.detail.bmvIntake.gate.signNotDone",
};

const GATE_STATUS_I18N_MAP: Record<string, string> = {
  [BMV_GATE_BLOCKER_CODES.QUESTIONNAIRE_NOT_RETURNED]:
    "customers.detail.bmvIntake.gate.questionnaireNotDone",
  [BMV_GATE_BLOCKER_CODES.QUOTE_NOT_CONFIRMED]:
    "customers.detail.bmvIntake.gate.quoteNotDone",
  [BMV_GATE_BLOCKER_CODES.NOT_SIGNED]:
    "customers.detail.bmvIntake.gate.signNotDone",
  [BMV_GATE_BLOCKER_CODES.INTAKE_NOT_READY]:
    "customers.detail.bmvIntake.gate.signNotDone",
};

/**
 * 判断服务端错误码是否为 BMV 门禁错误。
 *
 * @param serverErrorCode - 服务端返回的业务错误码
 * @returns 是否为 CASE_BMV_GATE_BLOCKED
 */
export function isBmvGateError(serverErrorCode: string | undefined): boolean {
  return serverErrorCode === BMV_GATE_ERROR_CODE;
}

/**
 * 将服务端 BMV 门禁阻断码解析为对应 i18n key。
 * 未匹配时返回 fallback key。
 *
 * @param blockerCode - 服务端阻断码（如 BMV_NOT_SIGNED）
 * @returns 对应的完整 i18n key
 */
export function resolveBmvBlockerI18nKey(blockerCode: string): string {
  return (
    BLOCKER_I18N_MAP[blockerCode] ??
    "customers.detail.bmvIntake.actionState.validationError"
  );
}

/**
 * 从服务端阻断列表中取首个阻断码对应的 i18n key。
 * 无阻断项时返回通用门禁提示。
 *
 * @param blockers - 服务端返回的阻断项列表
 * @returns 首个阻断码对应的 i18n key
 */
export function resolveFirstBlockerI18nKey(
  blockers: ServerBlocker[] | undefined,
): string {
  if (!blockers || blockers.length === 0) {
    return "customers.detail.bmvIntake.actionState.validationError";
  }
  return resolveBmvBlockerI18nKey(blockers[0].code);
}

/**
 * 将服务端 BMV 门禁阻断列表解析为状态门禁 i18n key 列表。
 *
 * @param blockers - 服务端返回的阻断项列表
 * @returns 各阻断码对应的 gate 状态 i18n key 数组
 */
export function resolveGateStatusI18nKeys(
  blockers: ServerBlocker[] | undefined,
): string[] {
  if (!blockers || blockers.length === 0) return [];
  return blockers.map(
    (b) =>
      GATE_STATUS_I18N_MAP[b.code] ??
      "customers.detail.bmvIntake.gate.signNotDone",
  );
}
