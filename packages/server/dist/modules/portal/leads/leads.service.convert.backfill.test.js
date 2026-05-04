import test from "node:test";
import assert from "node:assert/strict";
import { LeadsService } from "./leads.service";
import {
  SAMPLE_LEAD_ROW,
  makePool,
  makePoolWithClient,
} from "./leads.service.test-support";
void test("LeadsService.convert throws if lead not found", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [] }));
  const svc = new LeadsService(pool);
  await assert.rejects(
    () =>
      svc.convert("missing", {
        customerId: "cust-1",
        caseTypeCode: "immigration",
        ownerUserId: "user-1",
        orgId: "org-1",
        confirmDedup: true,
      }),
    /Lead not found/,
  );
});
void test("LeadsService.convert backfills conversations.customer_id via SAVEPOINT", async () => {
  const leadRow = { ...SAMPLE_LEAD_ROW, assigned_org_id: "org-1" };
  const clientCalls = [];
  const pool = makePoolWithClient(
    (sql) => {
      clientCalls.push(sql);
      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("SAVEPOINT") || sql.includes("RELEASE")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("insert into cases")) {
        return Promise.resolve({ rows: [{ id: "case-1" }] });
      }
      if (sql.includes("update leads")) {
        return Promise.resolve({
          rows: [
            {
              ...leadRow,
              status: "converted_case",
              converted_customer_id: "cust-1",
              converted_case_id: "case-1",
            },
          ],
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    },
    (sql) => {
      if (sql.includes("select") && sql.includes("from leads")) {
        return Promise.resolve({ rows: [leadRow] });
      }
      return Promise.resolve({ rows: [] });
    },
  );
  const svc = new LeadsService(pool);
  await svc.convert("lead-1", {
    customerId: "cust-1",
    caseTypeCode: "immigration",
    ownerUserId: "user-1",
    orgId: "org-1",
    confirmDedup: true,
  });
  assert.ok(clientCalls.some((sql) => sql.includes("SAVEPOINT conv_backfill")));
  assert.ok(clientCalls.some((sql) => sql.includes("update conversations")));
  assert.ok(
    clientCalls.some((sql) => sql.includes("RELEASE SAVEPOINT conv_backfill")),
  );
});
void test("LeadsService.convert tolerates missing conversations.customer_id column", async () => {
  const leadRow = { ...SAMPLE_LEAD_ROW, assigned_org_id: "org-1" };
  const pool = makePoolWithClient(
    (sql) => {
      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("SAVEPOINT conv_backfill")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("ROLLBACK TO SAVEPOINT")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("update conversations")) {
        return Promise.reject(new Error('column "customer_id" does not exist'));
      }
      if (sql.includes("insert into cases")) {
        return Promise.resolve({ rows: [{ id: "case-1" }] });
      }
      if (sql.includes("update leads")) {
        return Promise.resolve({
          rows: [
            {
              ...leadRow,
              status: "converted_case",
              converted_customer_id: "cust-1",
              converted_case_id: "case-1",
            },
          ],
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    },
    (sql) => {
      if (sql.includes("select") && sql.includes("from leads")) {
        return Promise.resolve({ rows: [leadRow] });
      }
      return Promise.resolve({ rows: [] });
    },
  );
  const svc = new LeadsService(pool);
  const result = await svc.convert("lead-1", {
    customerId: "cust-1",
    caseTypeCode: "immigration",
    ownerUserId: "user-1",
    orgId: "org-1",
    confirmDedup: true,
  });
  assert.equal(result.caseId, "case-1");
});
//# sourceMappingURL=leads.service.convert.backfill.test.js.map
