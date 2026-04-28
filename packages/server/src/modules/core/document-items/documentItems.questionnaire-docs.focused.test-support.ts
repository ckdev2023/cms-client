import type { Pool } from "pg";

import { DocumentItemsService } from "./documentItems.service";
import type { RequestContext } from "../tenancy/requestContext";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
export const ITEM_ID = "item-q-1";
export const CASE_ID = "case-q-1";

type QueryFn = (
  sql: string,
  params?: unknown[],
) => Promise<{ rows: unknown[]; rowCount: number }>;

/**
 * 生成 document item 测试用请求上下文。
 * @param role 请求上下文角色。
 * @returns 供 service 调用的 RequestContext。
 */
export function makeCtx(
  role: "staff" | "viewer" | "manager" = "staff",
): RequestContext {
  return { orgId: ORG_ID, userId: USER_ID, role };
}

/**
 * 生成 questionnaire document item 查询结果行。
 * @param overrides 需要覆盖的字段。
 * @returns document_items 查询模拟行。
 */
export function makeItemRow(overrides: Record<string, unknown> = {}) {
  return {
    id: ITEM_ID,
    org_id: ORG_ID,
    case_id: CASE_ID,
    checklist_item_code: "bmv-questionnaire",
    name: "経営管理ビザ情報表",
    status: "pending",
    required_flag: true,
    requested_at: null,
    received_at: null,
    reviewed_at: null,
    due_at: null,
    owner_side: "customer",
    last_follow_up_at: null,
    note: null,
    category: "questionnaire",
    survey_data: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

/**
 * 生成数据库连接池 stub。
 * @param queryFn 用于拦截 SQL 的 query 实现。
 * @returns 供 service 注入的 Pool stub。
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
 * 创建注入 pool 与 timeline stub 的 DocumentItemsService。
 * @param pool 数据库连接池 stub。
 * @param timeline timeline service 夹具。
 * @returns 配置完成的 DocumentItemsService。
 */
export function createService(
  pool: Pool,
  timeline: ReturnType<typeof makeTimeline>,
) {
  return new DocumentItemsService(pool, timeline.service as never);
}
