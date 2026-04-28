import type { Pool } from "pg";

/** 测试用查询函数签名。 */
export type QueryFn = (
  sql: string,
  params?: unknown[],
) => Promise<{ rows: unknown[]; rowCount?: number }>;

type PoolClientLike = {
  query: (
    sql: string,
    params?: unknown[],
  ) => Promise<{ rows: unknown[]; rowCount?: number }>;
  release: () => void;
};

/**
 * 创建只暴露 query 的简易测试连接池。
 * @param qf 查询处理函数。
 * @returns 测试连接池。
 */
export function makePool(qf: QueryFn) {
  return { query: qf } as unknown as Pool;
}

export const SAMPLE_LEAD_ROW = {
  id: "lead-1",
  org_id: null,
  app_user_id: "au-1",
  source: "web",
  language: "en",
  status: "new",
  assigned_org_id: null,
  owner_user_id: null,
  lead_no: null,
  name: null,
  phone: null,
  email: null,
  source_channel: null,
  referrer: null,
  intended_case_type: null,
  group_id: null,
  next_action: null,
  next_follow_up_at: null,
  quote_amount: null,
  note: null,
  lost_reason: null,
  converted_customer_id: null,
  converted_case_id: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

/**
 * 创建支持 connect/client 流程的测试连接池。
 * @param clientQf client.query 的处理函数。
 * @param poolQf pool.query 的处理函数。
 * @returns 测试连接池。
 */
export function makePoolWithClient(clientQf: QueryFn, poolQf?: QueryFn) {
  const client: PoolClientLike = {
    query: clientQf,
    release: () => undefined,
  };
  const defaultPoolQf: QueryFn = () => Promise.resolve({ rows: [] });
  return {
    query: poolQf ?? defaultPoolQf,
    connect: () => Promise.resolve(client),
  } as unknown as Pool;
}
