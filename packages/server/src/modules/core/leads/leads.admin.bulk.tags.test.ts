import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  LEAD_ID,
  leadRow,
  makeCtx,
  makePool,
  svc,
} from "./leads.admin.service.test-support";

void describe("LeadsAdminService.bulkTags — tags persistence", () => {
  void test("bulkTags persists tags to leads table via merge SQL", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const pool = makePool((sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("update leads set tags")) {
        return Promise.resolve({ rows: [], rowCount: 1 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const result = await svc(pool).bulkTags(makeCtx(), {
      leadIds: [LEAD_ID],
      tags: ["VIP", "urgent"],
    });

    assert.equal(result.updatedCount, 1);

    const updateCall = calls.find((c) =>
      c.sql.includes("update leads set tags"),
    );
    assert.ok(updateCall, "must execute tags update SQL");
    assert.ok(
      updateCall.sql.includes("unnest"),
      "SQL must use unnest for merge-dedup",
    );
    assert.deepEqual(updateCall.params?.[0], LEAD_ID);
    assert.deepEqual(updateCall.params?.[1], ["VIP", "urgent"]); // eslint-disable-line @typescript-eslint/no-unnecessary-condition -- params may be undefined per type
  });

  void test("bulkTags merges with existing tags (SQL-level dedup)", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const pool = makePool((sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("update leads set tags")) {
        return Promise.resolve({ rows: [], rowCount: 1 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    await svc(pool).bulkTags(makeCtx(), {
      leadIds: [LEAD_ID],
      tags: ["new-tag"],
    });

    const updateCall = calls.find((c) =>
      c.sql.includes("update leads set tags"),
    );
    assert.ok(updateCall);
    assert.ok(
      updateCall.sql.includes("tags || $"),
      "SQL must concat existing tags with new tags",
    );
    assert.ok(
      updateCall.sql.includes("distinct"),
      "SQL must deduplicate via distinct",
    );
  });

  void test("bulkTags returns updatedCount=0 when no rows matched", async () => {
    const pool = makePool((sql) => {
      if (sql.includes("update leads set tags")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const result = await svc(pool).bulkTags(makeCtx(), {
      leadIds: ["nonexistent-id"],
      tags: ["tag1"],
    });

    assert.equal(result.updatedCount, 0);
  });

  void test("bulkTags updates multiple leads", async () => {
    const pool = makePool((sql) => {
      if (sql.includes("update leads set tags")) {
        return Promise.resolve({ rows: [], rowCount: 1 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const result = await svc(pool).bulkTags(makeCtx(), {
      leadIds: [LEAD_ID, "00000000-0000-4000-8000-1ead00000002"],
      tags: ["bulk-tag"],
    });

    assert.equal(result.updatedCount, 2);
  });
});

void describe("LeadsAdminService.list — tags filter", () => {
  void test("list filters by tags intersection", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const pool = makePool((sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("count(*)")) {
        return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
      }
      return Promise.resolve({
        rows: [leadRow({ tags: ["VIP", "urgent"] })],
        rowCount: 1,
      });
    });

    const result = await svc(pool).list(makeCtx(), { tags: ["VIP"] });
    assert.equal(result.total, 1);

    const selectCall = calls.find(
      (c) => c.sql.includes("from leads") && !c.sql.includes("count(*)"),
    );
    assert.ok(selectCall);
    assert.ok(
      selectCall.sql.includes("l.tags && $"),
      "SQL must use && (overlap) operator for tags filter",
    );
  });

  void test("list without tags filter does not add tags clause", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const pool = makePool((sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("count(*)")) {
        return Promise.resolve({ rows: [{ count: "0" }], rowCount: 1 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    await svc(pool).list(makeCtx(), {});
    const selectCall = calls.find(
      (c) => c.sql.includes("from leads") && !c.sql.includes("count(*)"),
    );
    assert.ok(selectCall);
    assert.equal(
      selectCall.sql.includes("l.tags &&"),
      false,
      "No tags clause when filter absent",
    );
  });

  void test("list response includes tags array from mapLeadRow", async () => {
    const pool = makePool((sql) => {
      if (sql.includes("count(*)")) {
        return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
      }
      return Promise.resolve({
        rows: [leadRow({ tags: ["VIP", "urgent"] })],
        rowCount: 1,
      });
    });

    const result = await svc(pool).list(makeCtx(), {});
    assert.deepEqual(result.items[0].tags, ["VIP", "urgent"]);
  });

  void test("list response defaults tags to empty array when column is null", async () => {
    const pool = makePool((sql) => {
      if (sql.includes("count(*)")) {
        return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
      }
      return Promise.resolve({
        rows: [leadRow({ tags: null })],
        rowCount: 1,
      });
    });

    const result = await svc(pool).list(makeCtx(), {});
    assert.deepEqual(result.items[0].tags, []);
  });
});
