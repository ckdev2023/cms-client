// ─── Pre-Sign Gate (p1-fe-003-02) ───────────────────────────────
// BMV 经营管理签建案四前提门禁（客户端预检，与 server checkBmvCaseCreationGate 对齐）。
// 门禁仅在 templateId === "bmv" 时激活；非 BMV 模板直接放行。

import { computed, type ComputedRef, type Ref } from "vue";
import type {
  CaseCreateCustomerOption,
  CaseTemplateId,
  CreateCaseDraftState,
} from "../types";

/** 签约前门禁阻断码（与 server BMV_CASE_CREATION_GATE_CODES 对齐）。 */
export const PRE_SIGN_GATE_BLOCKER_CODES = {
  QUESTIONNAIRE_NOT_RETURNED: "questionnaire_not_returned",
  QUOTE_NOT_CONFIRMED: "quote_not_confirmed",
  NOT_SIGNED: "not_signed",
  INTAKE_NOT_READY: "intake_not_ready",
} as const;

/** 签约前门禁阻断码联合类型。 */
export type PreSignGateBlockerCode =
  (typeof PRE_SIGN_GATE_BLOCKER_CODES)[keyof typeof PRE_SIGN_GATE_BLOCKER_CODES];

/** 建案门禁单个阻断项。 */
export interface CreatePreSignGateBlocker {
  /** 阻断代码。 */
  code: PreSignGateBlockerCode;
  /** 阻断原因 i18n key。 */
  i18nKey: string;
  /** 恢复路径 i18n key。 */
  recoveryI18nKey: string;
}

/** 建案签约前门禁检查结果。 */
export interface CreatePreSignGateResult {
  /** 门禁是否适用（BMV 模板时为 true）。 */
  active: boolean;
  /** 门禁是否通过。 */
  passed: boolean;
  /** 阻断原因列表（门禁未通过时非空）。 */
  blockers: CreatePreSignGateBlocker[];
}

const GATE_INACTIVE: CreatePreSignGateResult = {
  active: false,
  passed: true,
  blockers: [],
};

const GATE_PASSED: CreatePreSignGateResult = {
  active: true,
  passed: true,
  blockers: [],
};

/**
 * 检查 BMV 建案签约前门禁 — 纯函数，不依赖外部状态。
 *
 * 当 `templateId !== "bmv"` 时直接返回 inactive（不阻断）。
 * 当 `customer` 为 null（尚未选择客户）时返回 active + blocked（四前提均未满足）。
 *
 * @param templateId - 当前选中的模板 ID
 * @param customer - 当前选中的主申请人客户
 * @returns 门禁检查结果
 */
export function checkCreatePreSignGate(
  templateId: CaseTemplateId,
  customer: CaseCreateCustomerOption | null,
): CreatePreSignGateResult {
  const bmvIds: readonly CaseTemplateId[] = [
    "bmv",
    "biz_mgmt_cert_4m",
    "biz_mgmt_cert_1y",
    "biz_mgmt_renewal",
  ];
  if (!bmvIds.includes(templateId)) return GATE_INACTIVE;

  const blockers: CreatePreSignGateBlocker[] = [];

  if (customer?.bmvQuestionnaireStatus !== "returned") {
    blockers.push({
      code: PRE_SIGN_GATE_BLOCKER_CODES.QUESTIONNAIRE_NOT_RETURNED,
      i18nKey: "cases.create.preSignGate.blockerQuestionnaire",
      recoveryI18nKey: "cases.create.preSignGate.recoveryQuestionnaire",
    });
  }

  if (customer?.bmvQuoteStatus !== "confirmed") {
    blockers.push({
      code: PRE_SIGN_GATE_BLOCKER_CODES.QUOTE_NOT_CONFIRMED,
      i18nKey: "cases.create.preSignGate.blockerQuote",
      recoveryI18nKey: "cases.create.preSignGate.recoveryQuote",
    });
  }

  if (customer?.bmvSignStatus !== "signed") {
    blockers.push({
      code: PRE_SIGN_GATE_BLOCKER_CODES.NOT_SIGNED,
      i18nKey: "cases.create.preSignGate.blockerSign",
      recoveryI18nKey: "cases.create.preSignGate.recoverySign",
    });
  }

  if (customer?.bmvIntakeStatus !== "ready_for_case_creation") {
    blockers.push({
      code: PRE_SIGN_GATE_BLOCKER_CODES.INTAKE_NOT_READY,
      i18nKey: "cases.create.preSignGate.blockerIntake",
      recoveryI18nKey: "cases.create.preSignGate.recoveryIntake",
    });
  }

  if (blockers.length === 0) return GATE_PASSED;

  return { active: true, passed: false, blockers };
}

/**
 * 创建响应式的签约前门禁检查结果。
 *
 * @param draft - 草稿状态
 * @param primaryCustomer - 主申请人 ref
 * @returns 响应式门禁结果
 */
export function createPreSignGateComputed(
  draft: CreateCaseDraftState,
  primaryCustomer: Ref<CaseCreateCustomerOption | null>,
): ComputedRef<CreatePreSignGateResult> {
  return computed(() =>
    checkCreatePreSignGate(draft.templateId, primaryCustomer.value),
  );
}
