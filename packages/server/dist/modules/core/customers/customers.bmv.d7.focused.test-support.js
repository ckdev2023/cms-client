import assert from "node:assert/strict";
import { CustomersService } from "./customers.service";
/** D7 テスト共有リクエストコンテキスト。 */
export const ctx = {
  orgId: "00000000-0000-4000-8000-000000000000",
  userId: "00000000-0000-4000-8000-000000000001",
  role: "staff",
};
/**
 * 基本顧客行ファクトリ。
 * @param overrides - 上書きフィールド。
 * @returns テスト用顧客行。
 */
export function makeBaseCustomerRow(overrides = {}) {
  return {
    id: "c1",
    org_id: ctx.orgId,
    type: "individual",
    base_profile: {
      name: "Alice",
      bmvProfile: {
        questionnaireStatus: "sent",
        quoteStatus: "not_started",
        signStatus: "not_started",
        questionnaireSentAt: "2026-01-01T00:00:00.000Z",
      },
    },
    contacts: [],
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}
/**
 * 署名済み顧客行ファクトリ。
 * @returns 全ゲート通過可能な顧客行。
 */
export function makeSignedCustomerRow() {
  return makeBaseCustomerRow({
    base_profile: {
      name: "Alice",
      bmvProfile: {
        questionnaireStatus: "returned",
        quoteStatus: "confirmed",
        signStatus: "signed",
        questionnaireSentAt: "2026-01-01T00:00:00.000Z",
        questionnaireReturnedAt: "2026-01-02T00:00:00.000Z",
        quoteGeneratedAt: "2026-01-03T00:00:00.000Z",
        quoteConfirmedAt: "2026-01-04T00:00:00.000Z",
        signedAt: "2026-01-05T00:00:00.000Z",
        sourceLeadId: "lead-1",
        currentQuoteFormId: "quote-form-1",
        visaPlan: "new_1year",
        quoteAmount: 500000,
      },
    },
  });
}
/**
 * SQL params から bmvProfile パッチを抽出。
 * @param params - SQL パラメータ配列。
 * @returns パース済みパッチ。
 */
export function parseBmvPatch(params) {
  const raw = params?.[1];
  assert.ok(typeof raw === "string");
  return JSON.parse(raw);
}
function extractBmvProfile(row) {
  const bp = row.base_profile;
  const profile = bp?.bmvProfile;
  return profile && typeof profile === "object" ? profile : {};
}
/**
 * テスト用 CustomersService ファクトリ。
 * @param queryFn - SQL ルーティング関数。
 * @param options - タイムライン・ケース作成オプション。
 * @param options.timelineWrites - タイムライン書き込み配列。
 * @param options.createCase - ケース作成スタブ。
 * @returns サービスと SQL 呼び出し記録。
 */
export function createTestService(queryFn, options = {}) {
  const calls = [];
  const client = {
    query: (sql, params) => {
      calls.push({ sql: sql.trim(), params });
      return queryFn(sql, params);
    },
    release: () => undefined,
  };
  const pool = {
    connect: () => Promise.resolve(client),
  };
  const timelineWrites = options.timelineWrites ?? [];
  const casesService = {
    create: options.createCase ?? (() => Promise.resolve({})),
  };
  const service = new CustomersService(
    pool,
    {
      canAccessCustomer: () => true,
      canEditCustomer: () => true,
    },
    {
      write: (_ctx, input) => {
        timelineWrites.push(input);
        return Promise.resolve();
      },
    },
    casesService,
  );
  return { service, calls };
}
function routeLeadAndForms(sql) {
  if (sql.includes("from leads where"))
    return { rows: [{ group_id: "grp-1", owner_user_id: "owner-lead-1" }] };
  if (sql.includes("from intake_forms where id"))
    return { rows: [{ form_data: { amount: 550000 } }] };
  if (sql.includes("from intake_forms") && sql.includes("bmv_questionnaire"))
    return { rows: [{ form_data: { companyName: "Test" } }] };
  return null;
}
function routeWriteOps(sql) {
  if (
    sql.includes("update conversations") ||
    sql.includes("update leads") ||
    sql.includes("update document_items") ||
    sql.includes("insert into residence_periods") ||
    sql.includes("insert into reminders")
  )
    return { rows: [] };
  return null;
}
function routeBillingOps(sql) {
  if (sql.includes("from billing_records") && sql.includes("milestone_name"))
    return { rows: [] };
  if (sql.includes("insert into billing_records"))
    return { rows: [{ id: "bp-1" }] };
  if (sql.includes("insert into payment_records"))
    return { rows: [{ id: "pr-1" }] };
  if (sql.includes("update billing_records") && sql.includes("status = 'paid'"))
    return { rows: [] };
  return null;
}
/**
 * transition テスト用 SQL ルーター。
 * @param signedRow - 顧客行フィクスチャ。
 * @returns SQL ルーティング関数。
 */
export function transitionQueryFn(signedRow) {
  return (sql, params) => {
    const leadResult = routeLeadAndForms(sql);
    if (leadResult) return Promise.resolve(leadResult);
    const writeResult = routeWriteOps(sql);
    if (writeResult) return Promise.resolve(writeResult);
    const billingResult = routeBillingOps(sql);
    if (billingResult) return Promise.resolve(billingResult);
    if (sql.includes("update customers")) {
      const patch = parseBmvPatch(params);
      return Promise.resolve({
        rows: [
          {
            ...signedRow,
            base_profile: {
              name: "Alice",
              bmvProfile: { ...extractBmvProfile(signedRow), ...patch },
            },
          },
        ],
      });
    }
    return Promise.resolve({ rows: [signedRow] });
  };
}
//# sourceMappingURL=customers.bmv.d7.focused.test-support.js.map
