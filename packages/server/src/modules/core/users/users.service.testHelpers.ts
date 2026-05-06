import type { Pool, QueryResult, QueryResultRow } from "pg";

import type { EffectivePermissionsService } from "../auth/effective-permissions.service";
import type { RequestContext } from "../tenancy/requestContext";
import type { TimelineService } from "../timeline/timeline.service";

export const ORG_ID = "00000000-0000-4000-8000-000000000001";
export const ACTOR_ID = "00000000-0000-4000-8000-00000000000a";
export const TARGET_ID = "00000000-0000-4000-8000-00000000000b";
export const NEW_USER_ID = "00000000-0000-4000-8000-00000000000c";

/** SQL クエリ呼び出し記録。 */
export type QueryCall = { sql: string; params: unknown[] };

/**
 * owner ロールのテスト用リクエストコンテキストを生成する。
 *
 * @param overrides - 上書きフィールド
 * @returns RequestContext
 */
export function ownerCtx(overrides?: Partial<RequestContext>): RequestContext {
  return { orgId: ORG_ID, userId: ACTOR_ID, role: "owner", ...overrides };
}

/**
 * manager ロールのテスト用リクエストコンテキストを生成する。
 *
 * @param overrides - 上書きフィールド
 * @returns RequestContext
 */
export function managerCtx(
  overrides?: Partial<RequestContext>,
): RequestContext {
  return { orgId: ORG_ID, userId: ACTOR_ID, role: "manager", ...overrides };
}

/**
 * staff ロールのテスト用リクエストコンテキストを生成する。
 *
 * @returns RequestContext
 */
export function staffCtx(): RequestContext {
  return { orgId: ORG_ID, userId: ACTOR_ID, role: "staff" };
}

/** SQL ルーター型：テスト用 Pool に差し込むクエリハンドラ。 */
export type RowRouter = (sql: string, params: unknown[]) => { rows: unknown[] };

/**
 * テスト用 Pool スタブを生成する。
 *
 * @param router - SQL に応じて返却行を決めるハンドラ
 * @returns pool スタブとクエリ呼び出し記録
 */
export function createTestPool(router: RowRouter): {
  pool: Pool;
  calls: QueryCall[];
} {
  const calls: QueryCall[] = [];

  type ClientLike = {
    query: (
      sql: string,
      params?: unknown[],
    ) => Promise<QueryResult<QueryResultRow>>;
    release: () => void;
  };

  const client: ClientLike = {
    query: (sql: string, params: unknown[] = []) => {
      calls.push({ sql: sql.trim(), params });
      const result = router(sql, params);
      return Promise.resolve(result as QueryResult<QueryResultRow>);
    },
    release: () => undefined,
  };

  const pool = { connect: () => Promise.resolve(client) };
  return { pool: pool as unknown as Pool, calls };
}

/**
 * テスト用 TimelineService スタブを生成する。
 *
 * @returns service スタブと記録されたエントリ配列
 */
export function stubTimeline(): {
  service: TimelineService;
  entries: unknown[];
} {
  const entries: unknown[] = [];
  const service = {
    write: (_ctx: unknown, entry: unknown) => {
      entries.push(entry);
      return Promise.resolve();
    },
  } as unknown as TimelineService;
  return { service, entries };
}

/**
 * テスト用ユーザー詳細 DB 行を生成する。
 *
 * @param overrides - 上書きフィールド
 * @returns DB 行オブジェクト
 */
export function makeUserDetailRow(overrides?: Record<string, unknown>) {
  return {
    id: TARGET_ID,
    name: "田中太郎",
    email: "tanaka@example.com",
    role: "staff",
    role_id: "00000000-0000-4000-8000-0000000000r1",
    status: "active",
    created_by: ACTOR_ID,
    disabled_at: null,
    password_set_at: "2026-01-01T00:00:00.000Z",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

/**
 * テスト用 EffectivePermissionsService スタブを生成する。
 *
 * @param permissions - 返却する権限コード
 * @returns service スタブ
 */
export function stubEffectivePermissions(
  permissions: string[] = [],
): EffectivePermissionsService {
  return {
    resolve: () => Promise.resolve(new Set(permissions)),
    invalidate: () => undefined,
    invalidateAll: () => undefined,
  } as unknown as EffectivePermissionsService;
}
