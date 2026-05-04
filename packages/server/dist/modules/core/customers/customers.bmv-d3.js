import { BadRequestException, NotFoundException } from "@nestjs/common";
import { createTenantDb } from "../tenancy/tenantDb";
import {
  checkBmvCaseCreationGate,
  BMV_CASE_CREATION_GATE_CODES,
} from "../cases/cases.types-bmv-gate";
import { BMV_CASE_TYPE } from "../cases/cases.template-bmv";
import { createBmvInitialBilling } from "./customers.bmv-billing";
import { getCurrentBmvProfile, patchBmvProfile } from "./customers.bmv-patch";
import {
  fetchLeadInheritance,
  fetchQuoteAmountFromForm,
  fetchSurveyDataFromQuestionnaire,
  insertResidencePeriodPlaceholder,
  scheduleRenewalReminderPlaceholders,
} from "./customers.bmv-transition-helpers";
function requireCustomer(entity) {
  if (!entity) throw new NotFoundException("Customer not found or deleted");
}
/**
 * 保存 BMV 问卷回收数据并投影 survey_data。
 * @param deps - BMV 流程执行依赖。
 * @param input - 问卷保存参数。
 * @returns 更新后的客户实体。
 */
export async function saveBmvSurvey(deps, input) {
  const { ctx, id, pool, timelineService, getEntity } = deps;
  const current = await getEntity(ctx, id);
  requireCustomer(current);
  const profile = getCurrentBmvProfile(current);
  if (profile.questionnaireStatus === "returned") {
    throw new BadRequestException("Questionnaire already returned");
  }
  const tenantDb = createTenantDb(pool, ctx.orgId, ctx.userId);
  await tenantDb.query(
    `update intake_forms
       set status = 'submitted', form_data = $2::jsonb, updated_at = now()
     where id = $1 and form_kind = 'bmv_questionnaire'`,
    [input.intakeFormId, JSON.stringify(input.formData)],
  );
  if (input.surveyData) {
    await projectSurveyData(tenantDb, id, input.surveyData);
  }
  const now = new Date().toISOString();
  const customer = await patchBmvProfile(pool, ctx, id, profile, {
    questionnaireStatus: "returned",
    questionnaireReturnedAt: profile.questionnaireReturnedAt ?? now,
  });
  await timelineService.write(ctx, {
    entityType: "customer",
    entityId: customer.id,
    action: "customer.bmv_survey_saved",
    payload: {
      intakeFormId: input.intakeFormId,
      beforeQuestionnaireStatus: profile.questionnaireStatus,
      afterQuestionnaireStatus: "returned",
      hasSurveyData: Boolean(input.surveyData),
    },
  });
  return customer;
}
/**
 * 修改 BMV 报价（保留历史版本）。
 * @param deps - BMV 流程执行依赖。
 * @param input - 报价修改参数。
 * @returns 更新后的客户实体。
 */
export async function modifyBmvQuote(deps, input) {
  const { ctx, id, pool, timelineService, getEntity } = deps;
  const current = await getEntity(ctx, id);
  requireCustomer(current);
  const profile = getCurrentBmvProfile(current);
  if (profile.signStatus === "signed") {
    throw new BadRequestException(
      "Customer already signed; quote cannot be modified",
    );
  }
  if (
    profile.questionnaireStatus === "not_started" &&
    profile.quoteStatus === "not_started"
  ) {
    throw new BadRequestException(
      "Questionnaire must be sent before modifying quote",
    );
  }
  const tenantDb = createTenantDb(pool, ctx.orgId, ctx.userId);
  const insertResult = await tenantDb.query(
    `insert into intake_forms (app_user_id, lead_id, form_kind, form_data, status)
     values ($1, null, 'bmv_quote', $2::jsonb, 'draft') returning id`,
    [input.appUserId, JSON.stringify(input.formData)],
  );
  const newFormId = insertResult.rows.at(0)?.id;
  if (!newFormId) throw new BadRequestException("Failed to create quote form");
  const now = new Date().toISOString();
  const previousQuoteFormId = profile.currentQuoteFormId;
  const customer = await patchBmvProfile(pool, ctx, id, profile, {
    currentQuoteFormId: newFormId,
    quoteStatus: "generated",
    quoteGeneratedAt: now,
    quoteAmount: input.amount ?? profile.quoteAmount,
    visaPlan: input.visaPlan ?? profile.visaPlan,
  });
  await timelineService.write(ctx, {
    entityType: "customer",
    entityId: customer.id,
    action: "customer.bmv_quote_modified",
    payload: {
      previousQuoteFormId,
      newQuoteFormId: newFormId,
      amount: input.amount,
      visaPlan: input.visaPlan,
    },
  });
  return customer;
}
function resolveOwnerAndGroup(input, lead, fallbackUserId) {
  const ownerUserId = input?.ownerUserId ?? lead?.ownerUserId ?? fallbackUserId;
  const groupId =
    input?.groupId !== undefined ? input.groupId : (lead?.groupId ?? null);
  return { ownerUserId, groupId };
}
/**
 * D5 字段映射前準備：lead 継承 / 報価金額 / 問卷データ。
 * @param tc - 転換コンテキスト。
 * @param input - 可選覆写参数。
 * @returns 解決済みの ownerUserId / groupId / quotePrice / surveyData。
 */
async function resolveTransitionInputs(tc, input) {
  const { tenantDb, profile } = tc;
  const lead = profile.sourceLeadId
    ? await fetchLeadInheritance(tenantDb, profile.sourceLeadId)
    : null;
  const quoteAmountFromForm = profile.currentQuoteFormId
    ? await fetchQuoteAmountFromForm(tenantDb, profile.currentQuoteFormId)
    : null;
  const surveyData = profile.sourceLeadId
    ? await fetchSurveyDataFromQuestionnaire(tenantDb, profile.sourceLeadId)
    : null;
  return {
    ...resolveOwnerAndGroup(input, lead, tc.ctx.userId),
    resolvedQuotePrice: quoteAmountFromForm ?? profile.quoteAmount,
    surveyData,
  };
}
/**
 * D5 建案成功後の副作用（会話/線索/問卷/在留/提醒/請求）。
 * @param tc - 転換コンテキスト。
 * @param createdCase - 作成済み案件。
 * @param ownerUserId - 案件負責人 ID。
 * @param surveyData - 問卷データ（null なら投影スキップ）。
 */
async function applyTransitionSideEffects(
  tc,
  createdCase,
  ownerUserId,
  surveyData,
) {
  const { tenantDb, ctx, pool, timelineService, customerId, profile } = tc;
  if (surveyData) {
    await projectSurveyData(tenantDb, customerId, surveyData);
  }
  if (profile.sourceLeadId) {
    await tenantDb.query(
      `update conversations set case_id = $1, updated_at = now()
       where lead_id = $2 and case_id is null`,
      [createdCase.id, profile.sourceLeadId],
    );
    await tenantDb.query(
      `update leads set converted_case_id = $1, updated_at = now() where id = $2`,
      [createdCase.id, profile.sourceLeadId],
    );
  }
  await insertResidencePeriodPlaceholder(
    tenantDb,
    ctx.orgId,
    createdCase.id,
    customerId,
  );
  await scheduleRenewalReminderPlaceholders(
    tenantDb,
    ctx.orgId,
    createdCase.id,
    ownerUserId,
  );
  if (profile.quoteAmount !== null && profile.quoteAmount > 0) {
    await createBmvInitialBilling(
      pool,
      ctx,
      createdCase.id,
      profile.quoteAmount,
      timelineService,
    );
  }
}
/**
 * BMV 客户転正式案件（D5 字段映射表実装）。
 * @param deps - BMV 転案件執行依赖。
 * @param input - 可選覆写参数。
 * @returns 创建的案件実体。
 */
export async function transitionBmvToCase(deps, input) {
  const { ctx, id, pool, timelineService, getEntity, createCase } = deps;
  const current = await getEntity(ctx, id);
  requireCustomer(current);
  const profile = getCurrentBmvProfile(current);
  assertBmvTransitionReady(profile, id);
  const tenantDb = createTenantDb(pool, ctx.orgId, ctx.userId);
  const tc = {
    tenantDb,
    ctx,
    pool,
    timelineService,
    customerId: id,
    profile,
  };
  const { ownerUserId, groupId, resolvedQuotePrice, surveyData } =
    await resolveTransitionInputs(tc, input);
  const caseInput = {
    customerId: id,
    caseTypeCode: BMV_CASE_TYPE,
    ownerUserId,
    groupId,
    visaPlan: profile.visaPlan,
    quotePrice: resolvedQuotePrice,
    sourceChannel: "bmv_transition",
  };
  const createdCase = await createCase(ctx, caseInput);
  await applyTransitionSideEffects(tc, createdCase, ownerUserId, surveyData);
  await timelineService.write(ctx, {
    entityType: "customer",
    entityId: id,
    action: "customer.bmv_transitioned_to_case",
    payload: {
      caseId: createdCase.id,
      caseTypeCode: BMV_CASE_TYPE,
      ownerUserId,
      groupId,
      sourceLeadId: profile.sourceLeadId,
      quotePrice: resolvedQuotePrice,
      hasSurveyData: Boolean(surveyData),
    },
  });
  return createdCase;
}
/**
 * BMV 聚合端点 — 返回承接卡片所需的全部数据。
 * @param deps - 読路径依赖（不需要 timelineService）。
 * @returns BMV 聚合 DTO。
 */
export async function getBmvAggregate(deps) {
  const { ctx, id, pool, getEntity } = deps;
  const current = await getEntity(ctx, id);
  requireCustomer(current);
  const profile = getCurrentBmvProfile(current);
  const tenantDb = createTenantDb(pool, ctx.orgId, ctx.userId);
  const quoteHistory = await fetchQuoteHistory(tenantDb, profile);
  const currentCase = await fetchBmvCase(tenantDb, id);
  const reminders = currentCase
    ? await fetchReminders(tenantDb, currentCase.id)
    : [];
  return {
    customerId: id,
    bmvProfile: profile,
    quoteHistory,
    currentCase,
    reminders,
  };
}
// ── private helpers ──
function assertBmvTransitionReady(profile, customerId) {
  if (profile.signStatus !== "signed") {
    throw new BadRequestException({
      code: BMV_CASE_CREATION_GATE_CODES.NOT_SIGNED,
      message: "Customer must sign contract before BMV case creation",
    });
  }
  const gate = checkBmvCaseCreationGate({
    caseTypeCode: BMV_CASE_TYPE,
    customerId,
    bmvQuestionnaireStatus: profile.questionnaireStatus,
    bmvQuoteStatus: profile.quoteStatus,
    bmvSignStatus: profile.signStatus,
    bmvIntakeStatus: profile.intakeStatus,
  });
  if (!gate.allowed) {
    throw new BadRequestException({
      code: "CASE_BMV_GATE_BLOCKED",
      blockers: gate.blockers,
    });
  }
}
async function projectSurveyData(tenantDb, customerId, surveyData) {
  await tenantDb.query(
    `update document_items
       set survey_data = $2::jsonb, updated_at = now()
     where case_id in (
       select id from cases
       where customer_id = $1 and case_type_code = '${BMV_CASE_TYPE}'
       order by created_at desc limit 1
     ) and category = 'questionnaire'`,
    [customerId, JSON.stringify(surveyData)],
  );
}
async function fetchQuoteHistory(tenantDb, profile) {
  if (!profile.sourceLeadId) return [];
  const result = await tenantDb.query(
    `select id, form_data, status, created_at::text as created_at from intake_forms
     where form_kind = 'bmv_quote' and lead_id = $1
     order by created_at desc`,
    [profile.sourceLeadId],
  );
  return result.rows.map((r) => ({
    id: r.id,
    formData: r.form_data && typeof r.form_data === "object" ? r.form_data : {},
    status: r.status,
    createdAt: r.created_at,
  }));
}
async function fetchBmvCase(tenantDb, customerId) {
  const result = await tenantDb.query(
    `select id, stage, post_approval_stage, coe_issued_at,
            coe_expiry_date, coe_sent_at, status
     from cases
     where customer_id = $1 and case_type_code = $2
     order by created_at desc limit 1`,
    [customerId, BMV_CASE_TYPE],
  );
  const row = result.rows.at(0);
  if (!row) return null;
  return {
    id: row.id,
    stage: row.stage,
    postApprovalStage: row.post_approval_stage,
    coeIssuedAt: row.coe_issued_at,
    coeExpiryDate: row.coe_expiry_date,
    coeSentAt: row.coe_sent_at,
    status: row.status,
  };
}
async function fetchReminders(tenantDb, caseId) {
  const result = await tenantDb.query(
    `select id, remind_at, send_status, channel from reminders
     where case_id = $1 order by remind_at asc`,
    [caseId],
  );
  return result.rows.map((r) => ({
    id: r.id,
    remindAt: r.remind_at,
    sendStatus: r.send_status,
    channel: r.channel,
  }));
}
//# sourceMappingURL=customers.bmv-d3.js.map
