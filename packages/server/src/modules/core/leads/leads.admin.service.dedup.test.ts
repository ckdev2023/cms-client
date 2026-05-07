import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  LEAD_ID,
  leadRow,
  makeCtx,
  makePool,
  svc,
} from "./leads.admin.service.test-support";

// ── dedup — exclude self (R4-F-1) ──

void describe("LeadsAdminService.getDetail — dedup excludes self", () => {
  void test("buildDedupHints excludes own lead id and convertedCustomerId", async () => {
    const CONVERTED_CID = "00000000-0000-4000-8000-cccc00000001";
    const calls: { sql: string; params?: unknown[] }[] = [];
    const pool = makePool((sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("from leads") && sql.includes("limit 1")) {
        return Promise.resolve({
          rows: [
            leadRow({
              converted_customer_id: CONVERTED_CID,
              phone: "090-1234-5678",
            }),
          ],
          rowCount: 1,
        });
      }
      if (sql.includes("from lead_followups")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      if (sql.includes("from lead_logs")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    await svc(pool).getDetail(makeCtx(), LEAD_ID);

    const dedupLeadCall = calls.find(
      (c) =>
        c.sql.includes("from leads") &&
        !c.sql.includes("limit 1") &&
        c.sql.includes("id !="),
    );
    assert.ok(dedupLeadCall, "dedup leads query must contain id != clause");
    assert.ok(
      dedupLeadCall.params?.includes(LEAD_ID),
      "dedup leads query must exclude own lead id",
    );

    const dedupCustCall = calls.find(
      (c) => c.sql.includes("from customers") && c.sql.includes("id !="),
    );
    assert.ok(dedupCustCall, "dedup customers query must contain id != clause");
    assert.ok(
      dedupCustCall.params?.includes(CONVERTED_CID),
      "dedup customers query must exclude convertedCustomerId",
    );
  });
});

// ── dedup — customer name extraction (R4-F-2) ──

void describe("LeadsAdminService.getDetail — dedup customer name extraction", () => {
  void test("dedup_returns_customer_name_from_givenName_familyName", async () => {
    const CUST_ID = "00000000-0000-4000-8000-cccc00000002";
    const pool = makePool((sql) => {
      if (sql.includes("from leads") && sql.includes("limit 1")) {
        return Promise.resolve({
          rows: [leadRow({ phone: "090-1234-5678" })],
          rowCount: 1,
        });
      }
      if (sql.includes("from lead_followups")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      if (sql.includes("lead_logs")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      if (sql.includes("from customers")) {
        return Promise.resolve({
          rows: [
            {
              id: CUST_ID,
              base_profile: { familyName: "田中", givenName: "太郎" },
            },
          ],
          rowCount: 1,
        });
      }
      if (sql.includes("from leads")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const result = await svc(pool).getDetail(makeCtx(), LEAD_ID);
    assert.ok(
      result.dedupHints.customers.length > 0,
      "should have dedup customer matches",
    );
    assert.equal(result.dedupHints.customers[0].id, CUST_ID);
    assert.equal(result.dedupHints.customers[0].name, "田中 太郎");
  });

  void test("dedup_returns_customer_name_from_lastName_firstName_fallback", async () => {
    const CUST_ID = "00000000-0000-4000-8000-cccc00000003";
    const pool = makePool((sql) => {
      if (sql.includes("from leads") && sql.includes("limit 1")) {
        return Promise.resolve({
          rows: [leadRow({ email: "a@b.com" })],
          rowCount: 1,
        });
      }
      if (sql.includes("from lead_followups")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      if (sql.includes("lead_logs")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      if (sql.includes("from customers")) {
        return Promise.resolve({
          rows: [
            {
              id: CUST_ID,
              base_profile: { lastName: "佐藤", firstName: "花子" },
            },
          ],
          rowCount: 1,
        });
      }
      if (sql.includes("from leads")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const result = await svc(pool).getDetail(makeCtx(), LEAD_ID);
    assert.ok(
      result.dedupHints.customers.length > 0,
      "should have dedup customer matches",
    );
    assert.equal(result.dedupHints.customers[0].name, "佐藤 花子");
  });

  void test("dedup_returns_customer_name_from_fullName_when_only_fullName_present", async () => {
    const CUST_ID = "00000000-0000-4000-8000-cccc00000005";
    const pool = makePool((sql) => {
      if (sql.includes("from leads") && sql.includes("limit 1")) {
        return Promise.resolve({
          rows: [leadRow({ phone: "090-9999-8888" })],
          rowCount: 1,
        });
      }
      if (sql.includes("from lead_followups")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      if (sql.includes("lead_logs")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      if (sql.includes("from customers")) {
        return Promise.resolve({
          rows: [
            {
              id: CUST_ID,
              base_profile: { fullName: "山田 花子" },
            },
          ],
          rowCount: 1,
        });
      }
      if (sql.includes("from leads")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const result = await svc(pool).getDetail(makeCtx(), LEAD_ID);
    assert.ok(
      result.dedupHints.customers.length > 0,
      "should have dedup customer matches",
    );
    assert.equal(result.dedupHints.customers[0].name, "山田 花子");
  });

  void test("dedup_returns_null_name_when_base_profile_empty", async () => {
    const CUST_ID = "00000000-0000-4000-8000-cccc00000004";
    const pool = makePool((sql) => {
      if (sql.includes("from leads") && sql.includes("limit 1")) {
        return Promise.resolve({
          rows: [leadRow({ phone: "090-0000-0000" })],
          rowCount: 1,
        });
      }
      if (sql.includes("from lead_followups")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      if (sql.includes("lead_logs")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      if (sql.includes("from customers")) {
        return Promise.resolve({
          rows: [{ id: CUST_ID, base_profile: {} }],
          rowCount: 1,
        });
      }
      if (sql.includes("from leads")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const result = await svc(pool).getDetail(makeCtx(), LEAD_ID);
    assert.ok(result.dedupHints.customers.length > 0);
    assert.equal(result.dedupHints.customers[0].name, null);
  });
});
