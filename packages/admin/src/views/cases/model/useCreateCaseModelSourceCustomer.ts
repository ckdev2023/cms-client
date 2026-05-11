import type {
  CaseCreateCustomerOption,
  CaseCreateSourceContext,
} from "../types";

/**
 * 当 `sourceContext.customerId` 存在且客户不在 create customer list 中时，
 * 从 source context 携带的默认值合成一个 `CaseCreateCustomerOption`，
 * 确保 group 继承、标题派生与主申请人预选正常工作。
 *
 * 至少需要 `customerId` 与 `customerName`；缺少 name 则返回 `null`。
 *
 * @param ctx - 来源上下文
 * @returns 合成的客户选项；缺少 name 时返回 `null`
 */
export function synthesizeCustomerFromSourceContext(
  ctx: CaseCreateSourceContext,
): CaseCreateCustomerOption | null {
  if (!ctx.customerId || !ctx.customerName) return null;
  return {
    id: ctx.customerId,
    name: ctx.customerName,
    kana: ctx.customerKana ?? "",
    group: ctx.customerGroup ?? "",
    groupLabel: ctx.customerGroupLabel ?? "",
    roleHint: "cases.create.step2.primaryRole",
    summary: "",
    contact: ctx.customerContact ?? "",
    bmvQuestionnaireStatus: ctx.bmvQuestionnaireStatus ?? null,
    bmvQuoteStatus: ctx.bmvQuoteStatus ?? null,
    bmvSignStatus: ctx.bmvSignStatus ?? null,
    bmvIntakeStatus: ctx.bmvIntakeStatus ?? null,
  };
}
