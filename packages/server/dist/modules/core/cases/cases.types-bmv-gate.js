// ────────────────────────────────────────────────────────────────
// P1 BMV 建案門禁契約 — 冻结接口边界
//
// 定义经营管理签案件创建前的门禁检查逻辑（纯函数）。
// 当 caseTypeCode === "business_manager_visa" 时，
// cases.service.create() 的 assertCreateRefs 应调用此门禁。
//
// 权威来源：
//   - P1/01 §2 Step 3–5（问卷 → 报价 → 签约 → 建案）
//   - p1-sv-000-01 §2.4（签约前建案限制）
//   - leads.types checkLeadConvertGate（lead 转化门禁）
//   - intake.types requiresBmvCaseCreationGate（intake 门禁标识）
//
// 设计决策：
//   - 门禁在 cases.service.create() 中执行，不在 leads 或 intake 模块中
//   - lead convert 路径应先通过 checkLeadConvertGate，再通过此门禁
//   - 直接创建（POST /cases）路径也须通过此门禁
//   - 非 BMV 案件不受此门禁约束
// ────────────────────────────────────────────────────────────────
import { isBmvCaseTypeCode } from "./cases.template-bmv";
export const BMV_CASE_CREATION_GATE_CODES = {
  QUESTIONNAIRE_NOT_RETURNED: "BMV_QUESTIONNAIRE_NOT_RETURNED",
  QUOTE_NOT_CONFIRMED: "BMV_QUOTE_NOT_CONFIRMED",
  NOT_SIGNED: "BMV_NOT_SIGNED",
  INTAKE_NOT_READY: "BMV_INTAKE_NOT_READY",
};
/**
 * BMV 建案门禁 — 纯逻辑，不访问 DB。
 *
 * 经营管理签建案四前提（全部满足才放行）：
 *   1. 问卷已回收（questionnaireStatus === "returned"）
 *   2. 报价已确认（quoteStatus === "confirmed"）
 *   3. 客户已签约（signStatus === "signed"）
 *   4. 承接状态就绪（intakeStatus === "ready_for_case_creation"）
 *
 * 非 BMV caseTypeCode 直接放行。
 * @param input - 建案门禁校验输入。
 * @returns 门禁校验结果，包含是否允许建案与阻断原因列表。
 */
export function checkBmvCaseCreationGate(input) {
  if (!isBmvCaseTypeCode(input.caseTypeCode)) {
    return { allowed: true, blockers: [] };
  }
  const blockers = [];
  if (input.bmvQuestionnaireStatus !== "returned") {
    blockers.push({
      code: BMV_CASE_CREATION_GATE_CODES.QUESTIONNAIRE_NOT_RETURNED,
      message: "BMV questionnaire must be returned before case creation",
    });
  }
  if (input.bmvQuoteStatus !== "confirmed") {
    blockers.push({
      code: BMV_CASE_CREATION_GATE_CODES.QUOTE_NOT_CONFIRMED,
      message: "BMV quote must be confirmed before case creation",
    });
  }
  if (input.bmvSignStatus !== "signed") {
    blockers.push({
      code: BMV_CASE_CREATION_GATE_CODES.NOT_SIGNED,
      message: "Customer must sign contract before BMV case creation",
    });
  }
  if (input.bmvIntakeStatus !== "ready_for_case_creation") {
    blockers.push({
      code: BMV_CASE_CREATION_GATE_CODES.INTAKE_NOT_READY,
      message: "BMV intake process must reach ready_for_case_creation status",
    });
  }
  return { allowed: blockers.length === 0, blockers };
}
// ────────────────────────────────────────────────────────────────
// cases.service.create() 集成契約
//
// assertCreateRefs 应增加以下逻辑（P1 落地时实现）：
//
//   if (requiresBmvCaseCreationGate(input.caseTypeCode)) {
//     const customer = await getCustomer(tx, input.customerId);
//     const bmvProfile = resolveCustomerBmvProfile(customer.baseProfile);
//     const gate = checkBmvCaseCreationGate({
//       caseTypeCode: input.caseTypeCode,
//       customerId: input.customerId,
//       bmvQuestionnaireStatus: bmvProfile?.questionnaireStatus ?? null,
//       bmvQuoteStatus: bmvProfile?.quoteStatus ?? null,
//       bmvSignStatus: bmvProfile?.signStatus ?? null,
//       bmvIntakeStatus: bmvProfile?.intakeStatus ?? null,
//     });
//     if (!gate.allowed) {
//       throw new BadRequestException({
//         code: "CASE_BMV_GATE_BLOCKED",
//         blockers: gate.blockers,
//       });
//     }
//   }
// ────────────────────────────────────────────────────────────────
/**
 * Cases WRITE_ERROR_CODES 中应追加的 BMV 门禁错误码。
 *
 * 在 cases.types.ts CASE_WRITE_ERROR_CODES 中追加：
 *   BMV_GATE_BLOCKED: "CASE_BMV_GATE_BLOCKED"
 */
export const CASE_BMV_GATE_ERROR_CODE = "CASE_BMV_GATE_BLOCKED";
//# sourceMappingURL=cases.types-bmv-gate.js.map
