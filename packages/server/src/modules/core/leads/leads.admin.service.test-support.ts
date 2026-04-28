import type { Pool, QueryResultRow } from "pg";

import type { RequestContext } from "../tenancy/requestContext";
import type { TimelineService } from "../timeline/timeline.service";
import { LeadsAdminService } from "./leads.admin.service";

export const ORG_A = "00000000-0000-4000-8000-000000000001";
export const ORG_B = "00000000-0000-4000-8000-000000000002";
export const USER_A = "00000000-0000-4000-8000-00000000000a";
export const USER_B = "00000000-0000-4000-8000-00000000000b";
export const GROUP_A = "00000000-0000-4000-8000-00000000a001";
export const LEAD_ID = "00000000-0000-4000-8000-1ead00000001";

const NOW = "2026-04-27T00:00:00.000Z";

/**
 * 创建默认 staff 请求上下文。
 * @param overrides 需要覆写的上下文字段。
 * @returns 测试请求上下文。
 */
export function makeCtx(overrides?: Partial<RequestContext>): RequestContext {
  return {
    orgId: ORG_A,
    userId: USER_A,
    role: "staff",
    ...overrides,
  };
}

/**
 * 判断 SQL 是否属于事务或 RLS 预热语句。
 * @param sql 待判断的 SQL 语句。
 * @returns 是否属于事务/RLS 语句。
 */
export function isTxSql(sql: string): boolean {
  return /^(begin|commit|rollback|select set_config)/i.test(sql.trim());
}

/** 测试 stub 需要满足的最小查询结果形状。 */
type QueryResultLike<T extends QueryResultRow = QueryResultRow> = {
  rows: T[];
  rowCount?: number;
};

/** 测试用查询函数签名。 */
export type QueryFn = (
  sql: string,
  params?: unknown[],
) => Promise<QueryResultLike>;

/**
 * 创建带事务短路的测试连接池。
 * @param queryFn 非事务 SQL 的处理函数。
 * @returns 测试连接池。
 */
export function makePool(queryFn: QueryFn): Pool {
  return {
    connect: () =>
      Promise.resolve({
        query: (sql: string, params?: unknown[]) =>
          isTxSql(sql)
            ? Promise.resolve({ rows: [], rowCount: 0 })
            : queryFn(sql, params),
        release: () => undefined,
      }),
  } as unknown as Pool;
}

/**
 * 创建可观测调用记录的 Timeline stub。
 * @returns 带调用记录的 Timeline stub。
 */
export function makeTimeline(): TimelineService & {
  calls: { action: string; entityId: string; payload: unknown }[];
} {
  const calls: { action: string; entityId: string; payload: unknown }[] = [];
  return {
    calls,
    write: (_ctx: unknown, input: TimelineInput) => {
      calls.push(input);
      return Promise.resolve();
    },
    list: () => Promise.resolve([]),
  } as unknown as TimelineService & {
    calls: { action: string; entityId: string; payload: unknown }[];
  };
}

type TimelineInput = { action: string; entityId: string; payload: unknown };

/**
 * 生成 Lead 行 fixture。
 * @param overrides 需要覆写的字段。
 * @returns Lead 查询行 fixture。
 */
export function leadRow(overrides?: Record<string, unknown>) {
  return {
    id: LEAD_ID,
    org_id: ORG_A,
    app_user_id: "app-user-1",
    source: "web",
    language: "ja",
    status: "new",
    assigned_org_id: ORG_A,
    owner_user_id: USER_A,
    lead_no: "L-001",
    name: "Test Lead",
    phone: "090-1234-5678",
    email: "test@example.com",
    source_channel: "web",
    referrer: null,
    intended_case_type: "bmv",
    group_id: GROUP_A,
    next_action: null,
    next_follow_up_at: null,
    quote_amount: null,
    note: null,
    lost_reason: null,
    converted_customer_id: null,
    converted_case_id: null,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

/**
 * 生成 followup 行 fixture。
 * @param overrides 需要覆写的字段。
 * @returns Followup 查询行 fixture。
 */
export function followupRow(overrides?: Record<string, unknown>) {
  return {
    id: "fu-001",
    lead_id: LEAD_ID,
    channel: "phone",
    summary: "Called customer",
    conclusion: null,
    next_action: null,
    next_follow_up_at: null,
    created_by: USER_A,
    created_at: NOW,
    ...overrides,
  };
}

/**
 * 生成 lead_log 行 fixture。
 * @param overrides 需要覆写的字段。
 * @returns Lead log 查询行 fixture。
 */
export function logRow(overrides?: Record<string, unknown>) {
  return {
    id: "log-001",
    lead_id: LEAD_ID,
    log_type: "field_change",
    payload: JSON.stringify({ name: { from: "Old", to: "New" } }),
    created_by: USER_A,
    created_at: NOW,
    ...overrides,
  };
}

/**
 * 创建 LeadsAdminService 测试实例。
 * @param pool 测试连接池。
 * @param timeline 可选 Timeline stub。
 * @returns LeadsAdminService 实例。
 */
export function svc(pool: Pool, timeline?: TimelineService) {
  return new LeadsAdminService(pool, timeline ?? makeTimeline());
}
