import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  LEAD_ID,
  ORG_A,
  USER_A,
  USER_B,
  leadRow,
  makeCtx,
  makePool,
  makeTimeline,
  svc,
} from "./leads.admin.service.test-support";

void describe("LeadsAdminService.create", () => {
  void test("happy-path: auto lead_no, org_id, assigned_org_id, default owner", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const pool = makePool((sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("max_seq")) {
        return Promise.resolve({ rows: [{ max_seq: "5" }], rowCount: 1 });
      }
      if (sql.includes("insert into leads")) {
        return Promise.resolve({
          rows: [
            leadRow({
              name: "New Lead",
              lead_no: "LEAD-202605-0006",
              org_id: ORG_A,
              assigned_org_id: ORG_A,
              owner_user_id: USER_A,
              status: "new",
            }),
          ],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const timeline = makeTimeline();
    const result = await svc(pool, timeline).create(makeCtx(), {
      name: "New Lead",
      phone: "090-0000-0000",
      email: "new@example.com",
    });

    assert.equal(result.name, "New Lead");
    assert.equal(result.status, "new");
    assert.equal(result.orgId, ORG_A);
    assert.equal(result.assignedOrgId, ORG_A);
    assert.equal(result.ownerUserId, USER_A);

    const ins = calls.find((c) => c.sql.includes("insert into leads"));
    assert.ok(ins, "must insert into leads");
    const p = ins.params ?? [];
    assert.equal(p[0], ORG_A, "org_id = ctx.orgId");
    assert.equal(p[1], ORG_A, "assigned_org_id = ctx.orgId");
    assert.ok((p[2] as string).startsWith("LEAD-"), "lead_no auto-generated");
    assert.equal(p[10], USER_A, "owner_user_id defaults to ctx.userId");

    assert.equal(timeline.calls.length, 1);
    assert.equal(timeline.calls[0].action, "lead.created");
  });

  void test("uses explicit ownerUserId when provided", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const pool = makePool((sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("max_seq")) {
        return Promise.resolve({ rows: [{ max_seq: "0" }], rowCount: 1 });
      }
      if (sql.includes("insert into leads")) {
        return Promise.resolve({
          rows: [leadRow({ owner_user_id: USER_B })],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    await svc(pool).create(makeCtx(), {
      name: "Lead With Owner",
      ownerUserId: USER_B,
    });

    const ins = calls.find((c) => c.sql.includes("insert into leads"));
    assert.ok(ins);
    assert.equal(
      (ins.params ?? [])[10],
      USER_B,
      "owner_user_id = explicit value",
    );
  });

  void test("retries once on lead_no unique conflict", async () => {
    let insertAttempts = 0;
    const pool = makePool((sql) => {
      if (sql.includes("max_seq")) {
        return Promise.resolve({ rows: [{ max_seq: "1" }], rowCount: 1 });
      }
      if (sql.includes("insert into leads")) {
        insertAttempts += 1;
        if (insertAttempts === 1) {
          const err = new Error("unique violation") as Error & {
            code: string;
            constraint: string;
          };
          err.code = "23505";
          err.constraint = "uq_leads_lead_no";
          return Promise.reject(err);
        }
        return Promise.resolve({
          rows: [leadRow({ lead_no: "LEAD-202605-0003" })],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const result = await svc(pool).create(makeCtx(), { name: "Retry Lead" });
    assert.equal(insertAttempts, 2, "should have retried once");
    assert.ok(result.leadNo);
  });

  void test("throws on non-conflict insert error", async () => {
    const pool = makePool((sql) => {
      if (sql.includes("max_seq")) {
        return Promise.resolve({ rows: [{ max_seq: "0" }], rowCount: 1 });
      }
      if (sql.includes("insert into leads")) {
        return Promise.reject(new Error("some other DB error"));
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    await assert.rejects(
      () => svc(pool).create(makeCtx(), { name: "Fail Lead" }),
      (err: Error) => {
        assert.ok(err.message.includes("some other DB error"));
        return true;
      },
    );
  });

  void test("writes dual audit (lead_logs + timeline)", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const pool = makePool((sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("max_seq")) {
        return Promise.resolve({ rows: [{ max_seq: "0" }], rowCount: 1 });
      }
      if (sql.includes("insert into leads")) {
        return Promise.resolve({ rows: [leadRow()], rowCount: 1 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const timeline = makeTimeline();
    await svc(pool, timeline).create(makeCtx(), { name: "Audit Lead" });

    const audit = calls.find((c) => c.sql.includes("insert into lead_logs"));
    assert.ok(audit, "must write to lead_logs");
    assert.equal((audit.params ?? [])[1], "created");

    assert.equal(timeline.calls.length, 1);
    assert.equal(timeline.calls[0].action, "lead.created");
    assert.equal(timeline.calls[0].entityId, LEAD_ID);
  });
});
