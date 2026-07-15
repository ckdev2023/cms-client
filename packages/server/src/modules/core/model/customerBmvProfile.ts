/**
 * 经营管理签（BMV）承接档案的类型与解析链 —— 共享内核叶子模块。
 *
 * 位置沿革：原分散在 `core/customers/customers.types.ts`（类型与状态常量）与
 * `core/customers/customers.dto-mappers.ts`（解析链）。S5 解 cases ↔ customers
 * 模块环时移入 `core/model/` —— 该环的全部内容恰好就是本档案链：cases 侧只有
 * 两条边（`cases.service.refs-resolver` 取 `resolveCustomerBmvProfile`、
 * `cases.types-bmv-gate` 取四个状态类型），移走即解环，无需接口反转。
 *
 * 归属理由同 `residencePeriodMappers`：`Customer` 实体本就定义在同目录
 * coreEntities.ts，其 `base_profile` 子文档的解析理应与实体同处共享内核，
 * 供 customers / cases / core-leads / portal-leads 四方平等取用，而非让 cases
 * 反向依赖 customers 模块。
 *
 * 本文件保持叶子属性：除 infra 通用读取器外不得 import 任何业务模块。
 * 有状态的 BMV 写入链（问卷/报价/签约流转）仍属 customers 领地，不在此处。
 */
import {
  normalizeObject,
  pickOptionalString,
} from "../../../infra/utils/normalize";

/** 经营管理签承接问卷状态。 */
export const CUSTOMER_BMV_QUESTIONNAIRE_STATUSES = [
  "not_started",
  "sent",
  "returned",
] as const;

/**
 *
 */
export type CustomerBmvQuestionnaireStatus =
  (typeof CUSTOMER_BMV_QUESTIONNAIRE_STATUSES)[number];

/** 经营管理签报价状态。 */
export const CUSTOMER_BMV_QUOTE_STATUSES = [
  "not_started",
  "generated",
  "confirmed",
] as const;

/**
 *
 */
export type CustomerBmvQuoteStatus =
  (typeof CUSTOMER_BMV_QUOTE_STATUSES)[number];

/** 经营管理签签约状态。 */
export const CUSTOMER_BMV_SIGN_STATUSES = [
  "not_started",
  "pending",
  "signed",
] as const;

/**
 *
 */
export type CustomerBmvSignStatus = (typeof CUSTOMER_BMV_SIGN_STATUSES)[number];

/** 经营管理签整体承接状态。 */
export const CUSTOMER_BMV_INTAKE_STATUSES = [
  "not_started",
  "questionnaire_pending",
  "quote_pending",
  "sign_pending",
  "ready_for_case_creation",
] as const;

/**
 *
 */
export type CustomerBmvIntakeStatus =
  (typeof CUSTOMER_BMV_INTAKE_STATUSES)[number];

/**
 * 经营管理签承接档案。
 *
 * **冻结决策（D2）**：数据持久化于 `customers.base_profile` JSONB 的
 * `bmvProfile` 键（写入路径见 `customers.bmv.ts`）。不新增 `customers`
 * 顶层列。读路径统一通过 `CustomerSummaryDto.bmvProfile` /
 * `CustomerDetailDto.bmvProfile` / `CustomerBmvView` DTO view 暴露给
 * admin/前端，消费方不应直接解析 `base_profile` JSONB。
 *
 * @see `CustomerBmvView`（`core/customers/customers.types.ts`）—— 聚合端点使用的顶层 DTO view
 */
export type CustomerBmvProfile = {
  questionnaireStatus: CustomerBmvQuestionnaireStatus;
  quoteStatus: CustomerBmvQuoteStatus;
  signStatus: CustomerBmvSignStatus;
  intakeStatus: CustomerBmvIntakeStatus;
  questionnaireSentAt: string | null;
  questionnaireReturnedAt: string | null;
  quoteGeneratedAt: string | null;
  quoteConfirmedAt: string | null;
  signedAt: string | null;
  note: string | null;
  sourceLeadId: string | null;
  currentQuoteFormId: string | null;
  visaPlan: string | null;
  quoteAmount: number | null;
};

function isStringArrayMember<T extends string>(
  members: readonly T[],
  value: string,
): value is T {
  return members.includes(value as T);
}

function mergeBmvProfileRecord(
  baseProfile: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...normalizeObject(baseProfile.bmv_profile),
    ...normalizeObject(baseProfile.bmvProfile),
  };
}

function normalizeBmvStatus<T extends string>(
  raw: Record<string, unknown>,
  fields: readonly string[],
  allowed: readonly T[],
): T | "not_started" {
  const value = pickOptionalString(raw, fields) ?? "not_started";
  return isStringArrayMember(allowed, value) ? value : "not_started";
}

function normalizeOptionalNumber(raw: Record<string, unknown>): number | null {
  for (const key of ["quoteAmount", "quote_amount"]) {
    const v = raw[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

/**
 * 从客户 `baseProfile` 中解析经营管理签档案。
 *
 * @param baseProfile - 客户档案 JSONB 对象
 * @returns 规范化后的经营管理签档案；空缺时返回 `not_started` 默认值
 */
export function resolveCustomerBmvProfile(
  baseProfile: Record<string, unknown>,
): CustomerBmvProfile {
  return normalizeCustomerBmvProfile(mergeBmvProfileRecord(baseProfile));
}

/**
 * 创建经营管理签档案默认值。
 *
 * @returns 初始状态下的经营管理签档案
 */
export function createDefaultCustomerBmvProfile(): CustomerBmvProfile {
  return {
    questionnaireStatus: "not_started",
    quoteStatus: "not_started",
    signStatus: "not_started",
    intakeStatus: resolveCustomerBmvIntakeStatus({
      questionnaireStatus: "not_started",
      quoteStatus: "not_started",
      signStatus: "not_started",
    }),
    questionnaireSentAt: null,
    questionnaireReturnedAt: null,
    quoteGeneratedAt: null,
    quoteConfirmedAt: null,
    signedAt: null,
    note: null,
    sourceLeadId: null,
    currentQuoteFormId: null,
    visaPlan: null,
    quoteAmount: null,
  };
}

/**
 * 根据经营管理签子步骤推导整体 intakeStatus。
 *
 * @param profile - 经营管理签承接流程当前子步骤状态
 * @param profile.questionnaireStatus - 问卷阶段状态
 * @param profile.quoteStatus - 报价阶段状态
 * @param profile.signStatus - 签约阶段状态
 * @returns 由问卷 → 报价 → 签约门禁推导出的整体 intakeStatus
 */
export function resolveCustomerBmvIntakeStatus(profile: {
  questionnaireStatus: CustomerBmvQuestionnaireStatus;
  quoteStatus: CustomerBmvQuoteStatus;
  signStatus: CustomerBmvSignStatus;
}): CustomerBmvIntakeStatus {
  if (
    profile.questionnaireStatus === "not_started" &&
    profile.quoteStatus === "not_started" &&
    profile.signStatus === "not_started"
  ) {
    return "not_started";
  }
  if (profile.signStatus === "signed") return "ready_for_case_creation";
  if (profile.questionnaireStatus !== "returned")
    return "questionnaire_pending";
  if (
    profile.quoteStatus === "generated" ||
    profile.quoteStatus === "confirmed" ||
    profile.signStatus === "pending"
  ) {
    return "sign_pending";
  }
  return "quote_pending";
}

/**
 * 规范化经营管理签承接档案。
 *
 * @param value - 客户基础档案中的 bmvProfile 原始值
 * @returns 规范化后的经营管理签承接档案；空对象时返回 `not_started` 默认值
 */
export function normalizeCustomerBmvProfile(
  value: unknown,
): CustomerBmvProfile {
  const raw = normalizeObject(value);
  if (Object.keys(raw).length === 0) return createDefaultCustomerBmvProfile();

  const questionnaireStatus = normalizeBmvStatus(
    raw,
    ["questionnaireStatus", "questionnaire_status"],
    CUSTOMER_BMV_QUESTIONNAIRE_STATUSES,
  );
  const quoteStatus = normalizeBmvStatus(
    raw,
    ["quoteStatus", "quote_status"],
    CUSTOMER_BMV_QUOTE_STATUSES,
  );
  const signStatus = normalizeBmvStatus(
    raw,
    ["signStatus", "sign_status"],
    CUSTOMER_BMV_SIGN_STATUSES,
  );

  return {
    questionnaireStatus,
    quoteStatus,
    signStatus,
    intakeStatus: resolveCustomerBmvIntakeStatus({
      questionnaireStatus,
      quoteStatus,
      signStatus,
    }),
    questionnaireSentAt: pickOptionalString(raw, [
      "questionnaireSentAt",
      "questionnaire_sent_at",
    ]),
    questionnaireReturnedAt: pickOptionalString(raw, [
      "questionnaireReturnedAt",
      "questionnaire_returned_at",
    ]),
    quoteGeneratedAt: pickOptionalString(raw, [
      "quoteGeneratedAt",
      "quote_generated_at",
    ]),
    quoteConfirmedAt: pickOptionalString(raw, [
      "quoteConfirmedAt",
      "quote_confirmed_at",
    ]),
    signedAt: pickOptionalString(raw, ["signedAt", "signed_at"]),
    note: pickOptionalString(raw, ["note", "memo"]),
    sourceLeadId: pickOptionalString(raw, ["sourceLeadId", "source_lead_id"]),
    currentQuoteFormId: pickOptionalString(raw, [
      "currentQuoteFormId",
      "current_quote_form_id",
    ]),
    visaPlan: pickOptionalString(raw, ["visaPlan", "visa_plan"]),
    quoteAmount: normalizeOptionalNumber(raw),
  };
}
