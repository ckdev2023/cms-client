import type { Pool } from "pg";

import {
  ResidencePeriodsService,
  type ResidencePeriodCreateInput,
} from "./residencePeriods.service";
import type { RequestContext } from "../tenancy/requestContext";
import type { Case } from "../model/coreEntities";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
export const USER_ID = "00000000-0000-4000-8000-000000000001";
export const CASE_ID = "00000000-0000-4000-8000-000000000010";
export const CUSTOMER_ID = "00000000-0000-4000-8000-000000000020";
export const PERIOD_ID = "00000000-0000-4000-8000-000000000030";

type QueryResult = { rows: unknown[]; rowCount?: number };
type QueryFn = (sql: string, params?: unknown[]) => Promise<QueryResult>;
type MaybeQueryResult = Promise<QueryResult> | undefined;

/**
 * 生成标准查询成功结果。
 * @param rows 查询返回行。
 * @param rowCount 行数，默认取 rows.length。
 * @returns Promise 包装后的查询结果。
 */
export function ok(rows: unknown[] = [], rowCount = rows.length) {
  return Promise.resolve({ rows, rowCount });
}

/**
 * 生成 residence periods 测试用请求上下文。
 * @returns 供 ResidencePeriodsService 调用的 RequestContext。
 */
export function makeCtx(): RequestContext {
  return { orgId: ORG_ID, userId: USER_ID, role: "staff" };
}

/**
 * 生成 residence_periods 查询结果行。
 * @param overrides 需要覆盖的字段。
 * @returns residence_periods 表模拟查询结果行。
 */
export function makeResidencePeriodRow(
  overrides: Record<string, unknown> = {},
) {
  return {
    id: PERIOD_ID,
    org_id: ORG_ID,
    case_id: CASE_ID,
    customer_id: CUSTOMER_ID,
    visa_type: "business_manager",
    status_of_residence: "経営・管理",
    period_years: 1,
    period_label: "1年",
    valid_from: "2026-01-01",
    valid_until: "2027-01-01",
    card_number: "AB1234567CD",
    is_current: true,
    entry_date: "2026-01-15",
    reminder_created: false,
    notes: null,
    created_by: USER_ID,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

/**
 * 生成连接池 stub。
 * @param queryFn 用于拦截 SQL 的 query 实现。
 * @returns 供 ResidencePeriodsService 注入的 Pool stub。
 */
export function makePool(queryFn: QueryFn): Pool {
  return {
    connect: () =>
      Promise.resolve({ query: queryFn, release: () => undefined }),
  } as unknown as Pool;
}

/**
 * 生成 timeline service stub。
 * @returns 含 write 记录数组的 timeline 夹具。
 */
export function makeTimeline() {
  const writes: unknown[] = [];
  return {
    service: {
      write: (_ctx: unknown, input: unknown) => {
        writes.push(input);
        return Promise.resolve();
      },
    },
    writes,
  };
}

/**
 * 创建注入 queryFn 的 ResidencePeriodsService。
 * @param queryFn 数据库 query stub。
 * @returns 含 service 与 timeline 的测试夹具。
 */
export function createService(queryFn: QueryFn) {
  const timeline = makeTimeline();
  const svc = new ResidencePeriodsService(
    makePool(queryFn),
    timeline.service as never,
  );
  return { svc, timeline };
}

export const BASE_INPUT: ResidencePeriodCreateInput = {
  caseId: CASE_ID,
  customerId: CUSTOMER_ID,
  visaType: "business_manager",
  statusOfResidence: "経営・管理",
  validFrom: "2026-01-01",
  validUntil: "2027-01-01",
  isCurrent: true,
};

function routeCaseAndCustomerLookups(sql: string): MaybeQueryResult {
  if (sql.includes("case_type_code") && sql.includes("from cases")) {
    return ok([{ case_type_code: "business_manager_visa" }]);
  }
  if (sql.includes("from cases") && sql.includes("customer_id")) {
    return ok([{ id: CASE_ID, customer_id: CUSTOMER_ID }]);
  }
  if (sql.includes("from customers")) return ok([{ id: CUSTOMER_ID }]);
}

function routeResidencePeriodWrite(
  sql: string,
  rowCount: number,
  row: Record<string, unknown>,
): MaybeQueryResult {
  if (
    sql.includes("update residence_periods") &&
    sql.includes("set is_current = false")
  ) {
    return ok([], rowCount);
  }
  if (sql.includes("insert into residence_periods")) return ok([row]);
}

function routeTemplateBlueprintLookup(
  sql: string,
  templateBlueprint: unknown,
  emptyRowCount: number,
): MaybeQueryResult {
  if (!sql.includes("from case_templates")) return undefined;
  if (templateBlueprint === undefined) return ok([], emptyRowCount);
  return ok([{ reminder_schedule_blueprint: templateBlueprint }]);
}

function routeReminderLifecycle(
  sql: string,
  params: unknown[] | undefined,
  opts: {
    cancelRowCount: number;
    ownerRow: { owner_user_id: string } | null;
    onReminderInsert?: () => Promise<QueryResult>;
    reminderCreatedCalls?: unknown[][];
  },
): MaybeQueryResult {
  if (
    sql.includes("update reminders") &&
    sql.includes("set send_status = 'canceled'")
  ) {
    return ok([], opts.cancelRowCount);
  }
  if (sql.includes("select owner_user_id") && sql.includes("from cases")) {
    return opts.ownerRow ? ok([opts.ownerRow]) : ok([], 0);
  }
  if (sql.includes("insert into reminders")) return opts.onReminderInsert?.();
  if (
    sql.includes("update residence_periods") &&
    sql.includes("reminder_created")
  ) {
    opts.reminderCreatedCalls?.push(params ?? []);
    return ok([], 1);
  }
}

function routeSavepoint(sql: string, onSavepoint?: (action: string) => void) {
  const upperSql = sql.toUpperCase();
  if (upperSql.includes("SAVEPOINT") && !upperSql.includes("ROLLBACK")) {
    onSavepoint?.("create");
    return ok();
  }
  if (upperSql.includes("ROLLBACK TO SAVEPOINT")) {
    onSavepoint?.("rollback");
    return ok();
  }
}

/**
 * Standard query router for happy-path tests.
 * @param opts happy-path 查询路由参数。
 * @param opts.templateBlueprint 注入的 reminder blueprint；`undefined` 表示无模板行。
 * @param opts.insertedReminders 收集 reminders INSERT 参数的数组。
 * @param opts.isCurrent 模拟插入在留期间记录时的 `is_current` 值。
 * @returns 供 `createService` 使用的查询函数。
 */
export function happyPathQueryFn(opts: {
  templateBlueprint?: unknown;
  insertedReminders?: unknown[][];
  isCurrent?: boolean;
}): QueryFn {
  const insertedReminders = opts.insertedReminders ?? [];
  const isCurrent = opts.isCurrent ?? true;
  return (sql, params) =>
    routeCaseAndCustomerLookups(sql) ??
    routeResidencePeriodWrite(
      sql,
      1,
      makeResidencePeriodRow({ is_current: isCurrent }),
    ) ??
    routeTemplateBlueprintLookup(sql, opts.templateBlueprint, 0) ??
    routeReminderLifecycle(sql, params, {
      cancelRowCount: 0,
      ownerRow: { owner_user_id: USER_ID },
      onReminderInsert: () => {
        insertedReminders.push(params ?? []);
        return ok([], 1);
      },
    }) ??
    ok();
}

/**
 * Query router that simulates reminder INSERT failure.
 * The SAVEPOINT mechanism in the service catches the failure and continues.
 * @param opts reminder 失败场景的查询路由配置。
 * @param opts.failAtInsert 第几次 reminders INSERT 开始失败。
 * @param opts.onSavepoint 记录 SAVEPOINT / ROLLBACK 时机的回调。
 * @param opts.reminderCreatedCalls 收集 reminder_created 更新参数的数组。
 * @returns 供 `createService` 使用的查询函数。
 */
export function reminderFailureQueryFn(
  opts: {
    failAtInsert?: number;
    onSavepoint?: (action: string) => void;
    reminderCreatedCalls?: unknown[][];
  } = {},
): QueryFn {
  const failAt = opts.failAtInsert ?? 1;
  let insertCount = 0;
  return (sql, params) =>
    routeCaseAndCustomerLookups(sql) ??
    routeResidencePeriodWrite(sql, 0, makeResidencePeriodRow()) ??
    routeTemplateBlueprintLookup(sql, undefined, 0) ??
    routeReminderLifecycle(sql, params, {
      cancelRowCount: 0,
      ownerRow: { owner_user_id: USER_ID },
      onReminderInsert: () => {
        insertCount += 1;
        if (insertCount >= failAt) {
          return Promise.reject(new Error("Reminder INSERT failed"));
        }
        return ok([], 1);
      },
      reminderCreatedCalls: opts.reminderCreatedCalls,
    }) ??
    routeSavepoint(sql, opts.onSavepoint) ??
    ok();
}

/**
 * 生成成功结案检查用的 case entity。
 * @param overrides 需要覆盖的字段。
 * @returns 满足 Case 结构的测试实体。
 */
export function makeCaseEntity(overrides: Partial<Case> = {}): Case {
  return {
    id: CASE_ID,
    orgId: ORG_ID,
    customerId: CUSTOMER_ID,
    caseTypeCode: "business_manager_visa",
    status: "S8",
    stage: "S8",
    groupId: null,
    ownerUserId: USER_ID,
    openedAt: "2026-01-01T00:00:00.000Z",
    dueAt: null,
    metadata: {},
    caseNo: null,
    caseName: null,
    caseSubtype: null,
    applicationType: null,
    applicationFlowType: null,
    visaPlan: null,
    postApprovalStage: null,
    coeIssuedAt: null,
    coeExpiryDate: null,
    coeSentAt: null,
    closeReason: null,
    supplementCount: 0,
    companyId: null,
    priority: "normal",
    riskLevel: "normal",
    assistantUserId: null,
    sourceChannel: null,
    signedAt: null,
    acceptedAt: null,
    submissionDate: null,
    resultDate: null,
    residenceExpiryDate: null,
    archivedAt: null,
    resultOutcome: null,
    quotePrice: null,
    depositPaidCached: false,
    finalPaymentPaidCached: false,
    billingUnpaidAmountCached: 0,
    billingRiskAcknowledgedBy: null,
    billingRiskAcknowledgedAt: null,
    billingRiskAckReasonCode: null,
    billingRiskAckReasonNote: null,
    billingRiskAckEvidenceUrl: null,
    overseasVisaStartAt: null,
    entryConfirmedAt: "2026-04-01T00:00:00.000Z",
    currentWorkflowStepCode: "ENTRY_SUCCESS",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as Case;
}
