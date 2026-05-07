import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { LEAD_STATUS_TRANSITIONS, type LeadP0Status } from "./leadEntities";
import {
  GROUP_A,
  LEAD_ID,
  ORG_A,
  ORG_B,
  USER_A,
  leadRow,
  makeCtx,
  makePool,
  svc,
} from "./leads.admin.service.test-support";

// ── list ──

void describe("LeadsAdminService.list", () => {
  void test("returns items and total from DB with join columns", async () => {
    const pool = makePool((sql) => {
      if (sql.includes("count(*)")) {
        return Promise.resolve({ rows: [{ count: "3" }], rowCount: 1 });
      }
      return Promise.resolve({
        rows: [
          { ...leadRow(), owner_display_name: "Admin A", group_name: "Sales" },
          {
            ...leadRow({ id: "lead-2" }),
            owner_display_name: null,
            group_name: null,
          },
          {
            ...leadRow({ id: "lead-3" }),
            owner_display_name: "Admin B",
            group_name: null,
          },
        ],
        rowCount: 3,
      });
    });

    const result = await svc(pool).list(makeCtx(), {});
    assert.equal(result.total, 3);
    assert.equal(result.items.length, 3);
    assert.equal(result.items[0].id, LEAD_ID);
    assert.equal(result.items[0].ownerDisplayName, "Admin A");
    assert.equal(result.items[0].groupName, "Sales");
    assert.equal(result.items[1].ownerDisplayName, null);
    assert.equal(result.items[1].groupName, null);
  });

  void test("list SQL uses left join users and groups", async () => {
    const calls: string[] = [];
    const pool = makePool((sql) => {
      calls.push(sql);
      if (sql.includes("count(*)")) {
        return Promise.resolve({ rows: [{ count: "0" }], rowCount: 1 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    await svc(pool).list(makeCtx(), {});
    const selectSql = calls.find(
      (s) => s.includes("from leads l") && !s.includes("count(*)"),
    );
    assert.ok(selectSql, "SELECT query must exist");
    assert.ok(selectSql.includes("left join users u"), "must join users");
    assert.ok(selectSql.includes("left join groups g"), "must join groups");
    assert.ok(
      selectSql.includes("owner_display_name"),
      "must select owner_display_name",
    );
    assert.ok(selectSql.includes("group_name"), "must select group_name");
  });

  void test("scope=mine filters by l.owner_user_id = ctx.userId", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const pool = makePool((sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("count(*)")) {
        return Promise.resolve({ rows: [{ count: "0" }], rowCount: 1 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    await svc(pool).list(makeCtx(), { scope: "mine" });
    const selectCall = calls.find(
      (c) => c.sql.includes("from leads l") && !c.sql.includes("count(*)"),
    );
    assert.ok(selectCall);
    assert.ok(selectCall.sql.includes("l.owner_user_id = $"));
    assert.ok(selectCall.params?.includes(USER_A));
  });

  void test("scope=group filters by l.group_id = ctx.groupId", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const pool = makePool((sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("count(*)")) {
        return Promise.resolve({ rows: [{ count: "0" }], rowCount: 1 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    await svc(pool).list(makeCtx({ groupId: GROUP_A }), { scope: "group" });
    const selectCall = calls.find(
      (c) => c.sql.includes("from leads l") && !c.sql.includes("count(*)"),
    );
    assert.ok(selectCall);
    assert.ok(selectCall.sql.includes("l.group_id = $"));
    assert.ok(selectCall.params?.includes(GROUP_A));
  });

  void test("scope=all does not add owner/group filter", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const pool = makePool((sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("count(*)")) {
        return Promise.resolve({ rows: [{ count: "0" }], rowCount: 1 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    await svc(pool).list(makeCtx(), { scope: "all" });
    const selectCall = calls.find(
      (c) => c.sql.includes("from leads l") && !c.sql.includes("count(*)"),
    );
    assert.ok(selectCall);
    assert.equal(selectCall.sql.includes("l.owner_user_id = $"), false);
    assert.equal(selectCall.sql.includes("l.group_id = $"), false);
  });

  void test("invalid ownerUserId filter returns empty without querying invalid uuid", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const pool = makePool((sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("count(*)")) {
        return Promise.resolve({ rows: [{ count: "0" }], rowCount: 1 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const result = await svc(pool).list(makeCtx(), { ownerUserId: "owner-a" });
    assert.equal(result.total, 0);
    assert.equal(result.items.length, 0);

    const selectCall = calls.find(
      (c) => c.sql.includes("from leads l") && !c.sql.includes("count(*)"),
    );
    assert.ok(selectCall);
    assert.ok(selectCall.sql.includes("where 1 = 0"));
  });

  void test("invalid groupId filter returns empty without querying invalid uuid", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const pool = makePool((sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("count(*)")) {
        return Promise.resolve({ rows: [{ count: "0" }], rowCount: 1 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const result = await svc(pool).list(makeCtx(), { groupId: "group-a" });
    assert.equal(result.total, 0);
    assert.equal(result.items.length, 0);

    const selectCall = calls.find(
      (c) => c.sql.includes("from leads l") && !c.sql.includes("count(*)"),
    );
    assert.ok(selectCall);
    assert.ok(selectCall.sql.includes("where 1 = 0"));
  });

  void test("list SQL uses LEFT JOIN users/groups and selects display columns", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const pool = makePool((sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("count(*)")) {
        return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
      }
      return Promise.resolve({
        rows: [
          {
            ...leadRow(),
            owner_display_name: "Local Admin",
            group_name: "Tokyo-1",
          },
        ],
        rowCount: 1,
      });
    });

    const result = await svc(pool).list(makeCtx(), {});
    const selectCall = calls.find(
      (c) => c.sql.includes("from leads") && !c.sql.includes("count(*)"),
    );
    assert.ok(selectCall, "select query must exist");
    assert.ok(
      selectCall.sql.includes("left join users u"),
      "must LEFT JOIN users",
    );
    assert.ok(
      selectCall.sql.includes("left join groups g"),
      "must LEFT JOIN groups",
    );
    assert.ok(
      selectCall.sql.includes("owner_display_name"),
      "must select owner_display_name",
    );
    assert.ok(selectCall.sql.includes("group_name"), "must select group_name");
    assert.equal(result.items[0].ownerDisplayName, "Local Admin");
    assert.equal(result.items[0].groupName, "Tokyo-1");
  });

  void test("page and limit are clamped", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const pool = makePool((sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("count(*)")) {
        return Promise.resolve({ rows: [{ count: "0" }], rowCount: 1 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    await svc(pool).list(makeCtx(), { page: -1, limit: 999 });
    const selectCall = calls.find(
      (c) => c.sql.includes("from leads l") && c.sql.includes("limit"),
    );
    assert.ok(selectCall);
    assert.ok(selectCall.params?.includes(200), "limit clamped to 200");
    assert.ok(selectCall.params?.includes(0), "offset=0 for page 1");
  });
});

// ── transitionStatus — whitelist ──

void describe("LeadsAdminService.transitionStatus — whitelist", () => {
  for (const [from, allowedSet] of LEAD_STATUS_TRANSITIONS) {
    for (const to of allowedSet) {
      void test(`${from} → ${to} is allowed`, async () => {
        const pool = makePool((sql) => {
          if (sql.includes("from leads") && sql.includes("limit 1")) {
            return Promise.resolve({
              rows: [leadRow({ status: from })],
              rowCount: 1,
            });
          }
          if (sql.includes("update leads set status")) {
            return Promise.resolve({
              rows: [leadRow({ status: to })],
              rowCount: 1,
            });
          }
          if (sql.includes("insert into lead_logs")) {
            return Promise.resolve({ rows: [], rowCount: 1 });
          }
          if (sql.includes("insert into timeline_logs")) {
            return Promise.resolve({ rows: [], rowCount: 1 });
          }
          return Promise.resolve({ rows: [], rowCount: 0 });
        });

        const lostReason = to === "lost" ? "Not interested" : undefined;
        const result = await svc(pool).transitionStatus(makeCtx(), LEAD_ID, {
          status: to,
          lostReason,
        });
        assert.equal(result.status, to);
      });
    }
  }

  const FORBIDDEN_TRANSITIONS: [LeadP0Status, LeadP0Status][] = [
    ["new", "pending_sign"],
    ["new", "signed"],
    ["new", "converted_case"],
    ["following", "new"],
    ["following", "signed"],
    ["following", "converted_case"],
    ["pending_sign", "new"],
    ["pending_sign", "following"],
    ["pending_sign", "converted_case"],
    ["signed", "new"],
    ["signed", "following"],
    ["signed", "pending_sign"],
    ["converted_case", "new"],
    ["converted_case", "following"],
    ["converted_case", "pending_sign"],
    ["converted_case", "signed"],
    ["converted_case", "lost"],
    ["lost", "new"],
    ["lost", "pending_sign"],
    ["lost", "signed"],
    ["lost", "converted_case"],
    ["lost", "lost"],
  ];

  for (const [from, to] of FORBIDDEN_TRANSITIONS) {
    void test(`${from} → ${to} is forbidden`, async () => {
      const pool = makePool((sql) => {
        if (sql.includes("from leads") && sql.includes("limit 1")) {
          return Promise.resolve({
            rows: [leadRow({ status: from })],
            rowCount: 1,
          });
        }
        return Promise.resolve({ rows: [], rowCount: 0 });
      });

      await assert.rejects(
        () => svc(pool).transitionStatus(makeCtx(), LEAD_ID, { status: to }),
        (err: Error) => {
          assert.ok(
            err.message.includes("not allowed") ||
              err.message.includes("lost_reason is required"),
            `Expected rejection for ${from} → ${to}, got: ${err.message}`,
          );
          return true;
        },
      );
    });
  }
});

// ── lost → following revival ──

void describe("LeadsAdminService — lost → following revival", () => {
  void test("lost → following succeeds and clears lost_reason", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const pool = makePool((sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("from leads") && sql.includes("limit 1")) {
        return Promise.resolve({
          rows: [leadRow({ status: "lost", lost_reason: "Not interested" })],
          rowCount: 1,
        });
      }
      if (sql.includes("update leads set status")) {
        return Promise.resolve({
          rows: [leadRow({ status: "following", lost_reason: null })],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const result = await svc(pool).transitionStatus(makeCtx(), LEAD_ID, {
      status: "following",
    });
    assert.equal(result.status, "following");
    assert.equal(result.lostReason, null);

    const updateCall = calls.find((c) => c.sql.includes("update leads set"));
    assert.ok(updateCall);
    assert.ok(
      updateCall.sql.includes("lost_reason = null"),
      "SQL must clear lost_reason on revival",
    );
  });
});

// ── lost_reason mandatory ──

void describe("LeadsAdminService — lost_reason mandatory", () => {
  void test("transition to lost without lostReason throws", async () => {
    const pool = makePool((sql) => {
      if (sql.includes("from leads") && sql.includes("limit 1")) {
        return Promise.resolve({
          rows: [leadRow({ status: "new" })],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    await assert.rejects(
      () =>
        svc(pool).transitionStatus(makeCtx(), LEAD_ID, {
          status: "lost",
        }),
      (err: Error) => {
        assert.ok(err.message.includes("lost_reason is required"));
        return true;
      },
    );
  });

  void test("transition to lost with empty lostReason throws", async () => {
    const pool = makePool((sql) => {
      if (sql.includes("from leads") && sql.includes("limit 1")) {
        return Promise.resolve({
          rows: [leadRow({ status: "new" })],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    await assert.rejects(
      () =>
        svc(pool).transitionStatus(makeCtx(), LEAD_ID, {
          status: "lost",
          lostReason: "   ",
        }),
      (err: Error) => {
        assert.ok(err.message.includes("lost_reason is required"));
        return true;
      },
    );
  });

  void test("transition to lost with valid lostReason succeeds", async () => {
    const pool = makePool((sql) => {
      if (sql.includes("from leads") && sql.includes("limit 1")) {
        return Promise.resolve({
          rows: [leadRow({ status: "new" })],
          rowCount: 1,
        });
      }
      if (sql.includes("update leads set status")) {
        return Promise.resolve({
          rows: [leadRow({ status: "lost", lost_reason: "Too expensive" })],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const result = await svc(pool).transitionStatus(makeCtx(), LEAD_ID, {
      status: "lost",
      lostReason: "Too expensive",
    });
    assert.equal(result.status, "lost");
  });
});

// ── dedup — cross-tenant isolation ──

void describe("LeadsAdminService.dedup — cross-tenant isolation", () => {
  void test("dedup queries force org_id = ctx.orgId", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const pool = makePool((sql, params) => {
      calls.push({ sql, params });
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    await svc(pool).dedup(makeCtx({ orgId: ORG_A }), {
      phone: "090-1234-5678",
    });

    for (const call of calls) {
      if (
        call.sql.includes("from leads") ||
        call.sql.includes("from customers")
      ) {
        assert.ok(
          call.sql.includes("org_id = $"),
          `Dedup query must filter by org_id: ${call.sql.slice(0, 80)}`,
        );
        assert.ok(
          call.params?.includes(ORG_A),
          "Dedup query must pass ctx.orgId as param",
        );
        assert.equal(
          call.params?.includes(ORG_B),
          false,
          "Must not contain other org_id",
        );
      }
    }
  });

  void test("dedup with neither phone nor email returns empty", async () => {
    const pool = makePool(() => {
      throw new Error("Should not query DB");
    });
    const result = await svc(pool).dedup(makeCtx(), {});
    assert.deepEqual(result, { leads: [], customers: [] });
  });
});
