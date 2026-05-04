import { BadRequestException, NotFoundException } from "@nestjs/common";
import { BMV_CASE_TYPE } from "../cases/cases.template-bmv";
import {
  createBmvInitialBilling,
  findBmvCaseId,
} from "./customers.bmv-billing";
import { getCurrentBmvProfile, patchBmvProfile } from "./customers.bmv-patch";
export { patchBmvProfile } from "./customers.bmv-patch";
export {
  createBmvInitialBilling,
  BMV_SIGNING_DEPOSIT_MILESTONE,
} from "./customers.bmv-billing";
export {
  saveBmvSurvey,
  modifyBmvQuote,
  transitionBmvToCase,
  getBmvAggregate,
} from "./customers.bmv-d3";
/**
 * 将经营管理签客户推进到问卷已发送状态。
 * @param root0 BMV 流程执行依赖。
 * @param root0.ctx 请求上下文。
 * @param root0.id 客户 ID。
 * @param root0.pool PostgreSQL 连接池。
 * @param root0.timelineService 用于写入 Timeline 事件的服务。
 * @param root0.getEntity 用于读取客户实体的函数。
 * @returns 更新后的客户实体。
 */
export async function sendBmvQuestionnaire({
  ctx,
  id,
  pool,
  timelineService,
  getEntity,
}) {
  const current = await getEntity(ctx, id);
  if (!current) throw new NotFoundException("Customer not found or deleted");
  const profile = getCurrentBmvProfile(current);
  if (profile.signStatus === "signed") {
    throw new BadRequestException(
      "Customer already signed; questionnaire cannot be sent again",
    );
  }
  if (profile.questionnaireStatus === "sent") {
    throw new BadRequestException(
      "Questionnaire already sent; cannot send questionnaire again",
    );
  }
  if (
    profile.questionnaireStatus === "returned" ||
    profile.quoteStatus !== "not_started" ||
    profile.signStatus === "pending"
  ) {
    throw new BadRequestException(
      "Questionnaire stage already completed; cannot send questionnaire",
    );
  }
  const questionnaireSentAt = new Date().toISOString();
  const customer = await patchBmvProfile(pool, ctx, id, profile, {
    questionnaireStatus: "sent",
    questionnaireSentAt,
  });
  await timelineService.write(ctx, {
    entityType: "customer",
    entityId: customer.id,
    action: "customer.bmv_questionnaire_sent",
    payload: {
      beforeQuestionnaireStatus: profile.questionnaireStatus,
      afterQuestionnaireStatus: "sent",
      questionnaireSentAt,
    },
  });
  return customer;
}
/**
 * 将经营管理签客户推进到报价已生成状态。
 * @param root0 BMV 流程执行依赖。
 * @param root0.ctx 请求上下文。
 * @param root0.id 客户 ID。
 * @param root0.pool PostgreSQL 连接池。
 * @param root0.timelineService 用于写入 Timeline 事件的服务。
 * @param root0.getEntity 用于读取客户实体的函数。
 * @returns 更新后的客户实体。
 */
export async function generateBmvQuote({
  ctx,
  id,
  pool,
  timelineService,
  getEntity,
}) {
  const current = await getEntity(ctx, id);
  if (!current) throw new NotFoundException("Customer not found or deleted");
  const profile = getCurrentBmvProfile(current);
  if (profile.signStatus === "signed") {
    throw new BadRequestException(
      "Customer already signed; quote cannot be generated again",
    );
  }
  if (profile.questionnaireStatus === "not_started") {
    throw new BadRequestException("Questionnaire must be sent before quote");
  }
  if (
    profile.quoteStatus === "generated" ||
    profile.quoteStatus === "confirmed" ||
    profile.signStatus === "pending"
  ) {
    throw new BadRequestException(
      "Quote stage already completed; cannot generate quote again",
    );
  }
  const now = new Date().toISOString();
  const questionnaireReturnedAt = profile.questionnaireReturnedAt ?? now;
  const customer = await patchBmvProfile(pool, ctx, id, profile, {
    questionnaireStatus: "returned",
    questionnaireReturnedAt,
    quoteStatus: "generated",
    quoteGeneratedAt: now,
    signStatus: "pending",
  });
  await timelineService.write(ctx, {
    entityType: "customer",
    entityId: customer.id,
    action: "customer.bmv_quote_generated",
    payload: {
      beforeQuestionnaireStatus: profile.questionnaireStatus,
      afterQuestionnaireStatus: "returned",
      beforeQuoteStatus: profile.quoteStatus,
      afterQuoteStatus: "generated",
      quoteGeneratedAt: now,
    },
  });
  return customer;
}
/**
 * 将经营管理签客户推进到已签约状态。
 * @param root0 BMV 流程执行依赖。
 * @param root0.ctx 请求上下文。
 * @param root0.id 客户 ID。
 * @param root0.pool PostgreSQL 连接池。
 * @param root0.timelineService 用于写入 Timeline 事件的服务。
 * @param root0.getEntity 用于读取客户实体的函数。
 * @returns 更新后的客户实体。
 */
export async function recordBmvSign({
  ctx,
  id,
  pool,
  timelineService,
  getEntity,
}) {
  const current = await getEntity(ctx, id);
  if (!current) throw new NotFoundException("Customer not found or deleted");
  const profile = getCurrentBmvProfile(current);
  if (profile.signStatus === "signed") return current;
  if (
    profile.quoteStatus !== "generated" &&
    profile.quoteStatus !== "confirmed"
  ) {
    throw new BadRequestException("Quote must be generated before signing");
  }
  const now = new Date().toISOString();
  const customer = await patchBmvProfile(pool, ctx, id, profile, {
    quoteStatus: "confirmed",
    quoteConfirmedAt: profile.quoteConfirmedAt ?? now,
    signStatus: "signed",
    signedAt: profile.signedAt ?? now,
  });
  await timelineService.write(ctx, {
    entityType: "customer",
    entityId: customer.id,
    action: "customer.bmv_signed",
    payload: {
      beforeQuoteStatus: profile.quoteStatus,
      afterQuoteStatus: "confirmed",
      beforeSignStatus: profile.signStatus,
      afterSignStatus: "signed",
      signedAt: now,
    },
  });
  const depositAmount = profile.quoteAmount;
  const existingCaseId = await findBmvCaseId(pool, ctx, id, BMV_CASE_TYPE);
  if (existingCaseId && depositAmount !== null && depositAmount > 0) {
    await createBmvInitialBilling(
      pool,
      ctx,
      existingCaseId,
      depositAmount,
      timelineService,
    );
  }
  return customer;
}
//# sourceMappingURL=customers.bmv.js.map
