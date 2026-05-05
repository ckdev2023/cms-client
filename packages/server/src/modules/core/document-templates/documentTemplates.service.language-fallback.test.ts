import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";

import { DocumentTemplatesService } from "./documentTemplates.service";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";

const isTxSql = (s: string) =>
  /^(begin|commit|rollback|select set_config)/.test(s.trim().toLowerCase());

type QueryFn = (
  sql: string,
  params?: unknown[],
) => Promise<{ rows: unknown[]; rowCount: number }>;

const ok = (rows: unknown[] = [], rowCount = rows.length) =>
  Promise.resolve({ rows, rowCount });

function makePool(qf: QueryFn) {
  return {
    connect: () =>
      Promise.resolve({
        query: (s: string, p?: unknown[]) => (isTxSql(s) ? ok() : qf(s, p)),
        release: () => undefined,
      }),
  } as unknown as Pool;
}

function ctx() {
  return { orgId: ORG_ID, userId: USER_ID, role: "staff" as const };
}

// ─── BCP-47 language fallback ────────────────────────────────────

void test("list normalizes 'ja' to 'ja' (no-op)", async () => {
  let capturedParams: unknown[] | undefined;
  const pool = makePool((_sql, params) => {
    capturedParams = params;
    return ok([]);
  });
  const svc = new DocumentTemplatesService(pool);
  await svc.list(ctx(), { language: "ja" });

  assert.ok(
    capturedParams?.includes("ja"),
    "base language should pass through unchanged",
  );
});

void test("list normalizes BCP-47 'ja-JP' to 'ja'", async () => {
  let capturedParams: unknown[] | undefined;
  const pool = makePool((_sql, params) => {
    capturedParams = params;
    return ok([]);
  });
  const svc = new DocumentTemplatesService(pool);
  await svc.list(ctx(), { language: "ja-JP" });

  assert.ok(
    capturedParams?.includes("ja"),
    "BCP-47 ja-JP should normalize to ja",
  );
  assert.ok(
    !capturedParams?.includes("ja-JP"),
    "raw BCP-47 should not appear in params",
  );
});

void test("list normalizes mixed-case 'JA-jp' to 'ja'", async () => {
  let capturedParams: unknown[] | undefined;
  const pool = makePool((_sql, params) => {
    capturedParams = params;
    return ok([]);
  });
  const svc = new DocumentTemplatesService(pool);
  await svc.list(ctx(), { language: "JA-jp" });

  assert.ok(
    capturedParams?.includes("ja"),
    "mixed-case BCP-47 should normalize to ja",
  );
});

void test("list normalizes BCP-47 'zh-CN' to 'zh'", async () => {
  let capturedParams: unknown[] | undefined;
  const pool = makePool((_sql, params) => {
    capturedParams = params;
    return ok([]);
  });
  const svc = new DocumentTemplatesService(pool);
  await svc.list(ctx(), { language: "zh-CN" });

  assert.ok(
    capturedParams?.includes("zh"),
    "BCP-47 zh-CN should normalize to zh",
  );
  assert.ok(
    !capturedParams?.includes("zh-CN"),
    "raw BCP-47 should not appear in params",
  );
});
