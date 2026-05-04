import test from "node:test";
import assert from "node:assert/strict";
import { JobsService } from "./jobs.service";
void test("JobsService.enqueue uses idempotencyKey conflict target", async () => {
  const calls = [];
  const client = {
    query: (sql, params) => {
      calls.push({ sql: sql.trim(), params });
      if (sql.includes("insert into jobs")) {
        return Promise.resolve({
          rows: [
            {
              id: "j1",
              org_id: "00000000-0000-4000-8000-000000000000",
              type: "timeline.write",
              payload: { a: 1 },
              idempotency_key: "k1",
              status: "queued",
              attempts: 0,
              max_retries: 3,
              run_at: "2026-01-01T00:00:00.000Z",
              locked_at: null,
              locked_by: null,
              started_at: null,
              finished_at: null,
              last_error: {},
              created_at: "2026-01-01T00:00:00.000Z",
              updated_at: "2026-01-01T00:00:00.000Z",
            },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    },
    release: () => undefined,
  };
  const pool = { connect: () => Promise.resolve(client) };
  const service = new JobsService(pool);
  const created = await service.enqueue(
    {
      orgId: "00000000-0000-4000-8000-000000000000",
      userId: "00000000-0000-4000-8000-000000000001",
      role: "staff",
    },
    {
      type: "timeline.write",
      payload: { a: 1 },
      idempotencyKey: "k1",
      maxRetries: 3,
      runAt: "2026-01-01T00:00:00.000Z",
    },
  );
  assert.equal(created.id, "j1");
  assert.equal(created.idempotencyKey, "k1");
  const insertCall = calls.find((c) => c.sql.includes("insert into jobs"));
  if (!insertCall) throw new Error("missing insert call");
  assert.equal(
    insertCall.sql.includes(
      "on conflict (org_id, type, idempotency_key) where idempotency_key is not null",
    ),
    true,
  );
  assert.deepEqual(insertCall.params?.slice(0, 6), [
    "00000000-0000-4000-8000-000000000000",
    "timeline.write",
    JSON.stringify({ a: 1 }),
    "k1",
    3,
    "2026-01-01T00:00:00.000Z",
  ]);
});
//# sourceMappingURL=jobs.service.test.js.map
