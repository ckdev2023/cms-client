import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  LEAD_ID,
  ORG_A,
  USER_A,
  USER_B,
  followupRow,
  isTxSql,
  leadRow,
  logRow,
  makeCtx,
  makePool,
  makeTimeline,
  svc,
} from "./leads.admin.service.test-support";
void describe("LeadsAdminService.bulkAssign — per-item audit", () => {
  void test("bulkAssign writes one audit log per lead", async () => {
    const timeline = makeTimeline();
    const leadIds = ["lead-1", "lead-2", "lead-3"];
    const auditInserts = [];
    const pool = makePool((sql, params) => {
      if (sql.includes("update leads set owner_user_id")) {
        return Promise.resolve({
          rows: [leadRow({ id: params?.[0] })],
          rowCount: 1,
        });
      }
      if (sql.includes("insert into lead_logs")) {
        auditInserts.push(params?.[0]);
        return Promise.resolve({ rows: [], rowCount: 1 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    const result = await svc(pool, timeline).bulkAssign(makeCtx(), {
      leadIds,
      ownerUserId: USER_B,
    });
    assert.equal(result.updatedCount, 3);
    assert.equal(auditInserts.length, 3);
    assert.equal(timeline.calls.length, 3);
    for (const lid of leadIds) {
      assert.ok(
        auditInserts.includes(lid),
        `lead_logs must include entry for ${lid}`,
      );
      assert.ok(
        timeline.calls.some((call) => call.entityId === lid),
        `timeline_logs must include entry for ${lid}`,
      );
    }
  });
});
void describe("LeadsAdminService.bulkFollowup — per-item audit", () => {
  void test("bulkFollowup writes one audit log per lead", async () => {
    const timeline = makeTimeline();
    const leadIds = ["lead-1", "lead-2"];
    const auditInserts = [];
    const pool = makePool((sql, params) => {
      if (sql.includes("insert into lead_followups")) {
        return Promise.resolve({
          rows: [followupRow({ lead_id: params?.[0] })],
          rowCount: 1,
        });
      }
      if (sql.includes("insert into lead_logs")) {
        auditInserts.push(params?.[0]);
        return Promise.resolve({ rows: [], rowCount: 1 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    const result = await svc(pool, timeline).bulkFollowup(makeCtx(), {
      leadIds,
      channel: "phone",
      summary: "Follow up call",
    });
    assert.equal(result.updatedCount, 2);
    assert.equal(auditInserts.length, 2);
    assert.equal(timeline.calls.length, 2);
  });
});
void describe("LeadsAdminService.bulkExport — per-item audit", () => {
  void test("bulkExport writes one audit log per lead", async () => {
    const timeline = makeTimeline();
    const leadIds = ["lead-1", "lead-2", "lead-3"];
    const auditInserts = [];
    const pool = makePool((sql, params) => {
      if (sql.includes("from leads") && sql.includes("any($1")) {
        return Promise.resolve({
          rows: leadIds.map((id) => leadRow({ id })),
          rowCount: leadIds.length,
        });
      }
      if (sql.includes("insert into lead_logs")) {
        auditInserts.push(params?.[0]);
        return Promise.resolve({ rows: [], rowCount: 1 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    const result = await svc(pool, timeline).bulkExport(makeCtx(), leadIds);
    assert.equal(result.length, 3);
    assert.equal(auditInserts.length, 3);
    assert.equal(timeline.calls.length, 3);
  });
});
void describe("LeadsAdminService.update — audit trail", () => {
  void test("update writes field_change audit with from/to diff", async () => {
    const timeline = makeTimeline();
    const auditPayloads = [];
    const pool = makePool((sql, params) => {
      if (sql.includes("from leads") && sql.includes("limit 1")) {
        return Promise.resolve({
          rows: [leadRow({ name: "Old Name" })],
          rowCount: 1,
        });
      }
      if (sql.includes("update leads set")) {
        return Promise.resolve({
          rows: [leadRow({ name: "New Name" })],
          rowCount: 1,
        });
      }
      if (sql.includes("insert into lead_logs")) {
        auditPayloads.push(JSON.parse(params?.[2]));
        return Promise.resolve({ rows: [], rowCount: 1 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    await svc(pool, timeline).update(makeCtx(), LEAD_ID, { name: "New Name" });
    assert.equal(auditPayloads.length, 1);
    const payload = auditPayloads[0];
    assert.ok(payload.name, "Audit payload must contain changed field");
    assert.deepEqual(payload.name, { from: "Old Name", to: "New Name" });
  });
  void test("update with no actual changes skips audit", async () => {
    const timeline = makeTimeline();
    const pool = makePool((sql) => {
      if (sql.includes("from leads") && sql.includes("limit 1")) {
        return Promise.resolve({
          rows: [leadRow({ name: "Same Name" })],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    await svc(pool, timeline).update(makeCtx(), LEAD_ID, {});
    assert.equal(timeline.calls.length, 0, "No audit for no-op update");
  });
});
void describe("LeadsAdminService.addFollowup", () => {
  void test("rejects invalid channel", async () => {
    const pool = makePool((sql) => {
      if (sql.includes("from leads") && sql.includes("limit 1")) {
        return Promise.resolve({ rows: [leadRow()], rowCount: 1 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    await assert.rejects(
      () =>
        svc(pool).addFollowup(makeCtx(), LEAD_ID, {
          channel: "carrier_pigeon",
        }),
      (err) => {
        assert.ok(err.message.includes("Invalid followup channel"));
        return true;
      },
    );
  });
  void test("syncs next_action to lead after followup", async () => {
    const calls = [];
    const pool = makePool((sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("from leads") && sql.includes("limit 1")) {
        return Promise.resolve({ rows: [leadRow()], rowCount: 1 });
      }
      if (sql.includes("insert into lead_followups")) {
        return Promise.resolve({ rows: [followupRow()], rowCount: 1 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    await svc(pool).addFollowup(makeCtx(), LEAD_ID, {
      channel: "phone",
      nextAction: "Call back next week",
      nextFollowUpAt: "2026-05-04T10:00:00.000Z",
    });
    const syncCall = calls.find(
      (call) =>
        call.sql.includes("update leads set") &&
        call.sql.includes("next_action"),
    );
    assert.ok(syncCall, "Must sync next_action on the lead row");
  });
});
void describe("LeadsAdminService.getDetail", () => {
  void test("returns aggregate with followups, logs, and dedupHints", async () => {
    const pool = makePool((sql) => {
      if (sql.includes("from leads") && sql.includes("limit 1")) {
        return Promise.resolve({ rows: [leadRow()], rowCount: 1 });
      }
      if (sql.includes("from lead_followups")) {
        return Promise.resolve({ rows: [followupRow()], rowCount: 1 });
      }
      if (sql.includes("from lead_logs")) {
        return Promise.resolve({ rows: [logRow()], rowCount: 1 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    const result = await svc(pool).getDetail(makeCtx(), LEAD_ID);
    assert.equal(result.lead.id, LEAD_ID);
    assert.equal(result.followups.length, 1);
    assert.equal(result.logs.length, 1);
    assert.ok(result.dedupHints);
    assert.equal(result.convertedCustomer, null);
    assert.equal(result.convertedCase, null);
  });
  void test("throws NotFoundException for missing lead", async () => {
    const pool = makePool(() => Promise.resolve({ rows: [], rowCount: 0 }));
    await assert.rejects(
      () => svc(pool).getDetail(makeCtx(), LEAD_ID),
      (err) => {
        assert.ok(err.message.includes("Lead not found"));
        return true;
      },
    );
  });
});
void describe("LeadsAdminService — tenantDb RLS path", () => {
  void test("every query goes through createTenantDb with set_config for org_id", async () => {
    const setConfigCalls = [];
    const pool = {
      connect: () =>
        Promise.resolve({
          query: (sql, params) => {
            if (sql.includes("set_config")) {
              setConfigCalls.push(`${sql} — ${JSON.stringify(params)}`);
              return Promise.resolve({ rows: [], rowCount: 0 });
            }
            if (isTxSql(sql)) return Promise.resolve({ rows: [], rowCount: 0 });
            if (sql.includes("count(*)")) {
              return Promise.resolve({ rows: [{ count: "0" }], rowCount: 1 });
            }
            return Promise.resolve({ rows: [], rowCount: 0 });
          },
          release: () => undefined,
        }),
    };
    await svc(pool).list(makeCtx(), {});
    const orgIdSetCalls = setConfigCalls.filter((call) =>
      call.includes("app.org_id"),
    );
    assert.ok(
      orgIdSetCalls.length > 0,
      "Must call set_config('app.org_id', ...) via tenantDb",
    );
    assert.ok(orgIdSetCalls.some((call) => call.includes(ORG_A)));
  });
  void test("createTenantDb is called with ctx.userId for actor audit trail", async () => {
    const setConfigCalls = [];
    const pool = {
      connect: () =>
        Promise.resolve({
          query: (sql, params) => {
            if (sql.includes("set_config")) {
              setConfigCalls.push(`${sql} — ${JSON.stringify(params)}`);
              return Promise.resolve({ rows: [], rowCount: 0 });
            }
            if (isTxSql(sql)) return Promise.resolve({ rows: [], rowCount: 0 });
            if (sql.includes("count(*)")) {
              return Promise.resolve({ rows: [{ count: "0" }], rowCount: 1 });
            }
            return Promise.resolve({ rows: [], rowCount: 0 });
          },
          release: () => undefined,
        }),
    };
    await svc(pool).list(makeCtx(), {});
    const actorCalls = setConfigCalls.filter((call) =>
      call.includes("app.actor_user_id"),
    );
    assert.ok(
      actorCalls.length > 0,
      "Must call set_config('app.actor_user_id', ...) for staff role RLS",
    );
    assert.ok(actorCalls.some((call) => call.includes(USER_A)));
  });
});
//# sourceMappingURL=leads.admin.service.audit.test.js.map
