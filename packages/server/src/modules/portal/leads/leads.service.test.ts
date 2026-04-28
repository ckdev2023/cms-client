import test from "node:test";
import assert from "node:assert/strict";

import { LeadsService } from "./leads.service";
import {
  SAMPLE_LEAD_ROW,
  makePool,
  makePoolWithClient,
} from "./leads.service.test-support";

// ── create ──

void test("LeadsService.create inserts lead with null org_id", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql, params });
    return Promise.resolve({ rows: [SAMPLE_LEAD_ROW] });
  });
  const svc = new LeadsService(pool);
  const result = await svc.create({ appUserId: "au-1" });
  assert.equal(result.id, "lead-1");
  assert.equal(result.orgId, null);
  assert.equal(result.appUserId, "au-1");
  assert.ok(calls.some((c) => c.sql.includes("insert into leads")));
});

// ── get ──

void test("LeadsService.get returns lead by id", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [SAMPLE_LEAD_ROW] }));
  const svc = new LeadsService(pool);
  const result = await svc.get("lead-1");
  assert.ok(result);
  assert.equal(result.id, "lead-1");
});

void test("LeadsService.get returns null for missing lead", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [] }));
  const svc = new LeadsService(pool);
  const result = await svc.get("missing");
  assert.equal(result, null);
});

// ── list ──

void test("LeadsService.list returns items and total", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("count(*)"))
      return Promise.resolve({ rows: [{ count: "1" }] });
    return Promise.resolve({ rows: [SAMPLE_LEAD_ROW] });
  });
  const svc = new LeadsService(pool);
  const result = await svc.list({ appUserId: "au-1" });
  assert.equal(result.total, 1);
  assert.equal(result.items.length, 1);
});

// ── update ──

void test("LeadsService.update updates lead status", async () => {
  const updatedRow = { ...SAMPLE_LEAD_ROW, status: "following" };
  const pool = makePool(() => Promise.resolve({ rows: [updatedRow] }));
  const svc = new LeadsService(pool);
  const result = await svc.update("lead-1", { status: "following" });
  assert.equal(result.status, "following");
});

// ── assign ──

void test("LeadsService.assign sets assigned_org_id and owner_user_id", async () => {
  const assignedRow = {
    ...SAMPLE_LEAD_ROW,
    org_id: "org-1",
    assigned_org_id: "org-1",
    owner_user_id: "user-1",
  };
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql, params });
    return Promise.resolve({ rows: [assignedRow] });
  });
  const svc = new LeadsService(pool);
  const result = await svc.assign("lead-1", {
    assignedOrgId: "org-1",
    assignedUserId: "user-1",
  });
  assert.equal(result.assignedOrgId, "org-1");
  assert.equal(result.ownerUserId, "user-1");
  assert.equal(result.orgId, "org-1");
  assert.ok(calls.some((c) => c.sql.includes("owner_user_id")));
});

// ── convert ──

void test("LeadsService.convert creates case, updates lead, writes audit logs in transaction", async () => {
  const leadRow = { ...SAMPLE_LEAD_ROW, assigned_org_id: "org-1" };
  const clientCalls: string[] = [];
  const pool = makePoolWithClient(
    (sql) => {
      clientCalls.push(sql);
      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK")
        return Promise.resolve({ rows: [] });
      if (sql.includes("SAVEPOINT") || sql.includes("RELEASE"))
        return Promise.resolve({ rows: [] });
      if (sql.includes("insert into cases"))
        return Promise.resolve({ rows: [{ id: "case-1" }] });
      if (sql.includes("update leads"))
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
      if (sql.includes("update customers"))
        return Promise.resolve({ rows: [], rowCount: 1 });
      if (sql.includes("update conversations"))
        return Promise.resolve({ rows: [], rowCount: 0 });
      if (sql.includes("insert into lead_logs"))
        return Promise.resolve({ rows: [] });
      if (sql.includes("insert into timeline_logs"))
        return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    },
    (sql) => {
      if (sql.includes("select") && sql.includes("from leads"))
        return Promise.resolve({ rows: [leadRow] });
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
    actorUserId: "staff-1",
  });

  assert.equal(result.lead.status, "converted_case");
  assert.equal(result.lead.convertedCustomerId, "cust-1");
  assert.equal(result.lead.convertedCaseId, "case-1");
  assert.equal(result.caseId, "case-1");
  assert.ok(clientCalls.some((s) => s.includes("insert into lead_logs")));
  assert.ok(clientCalls.some((s) => s.includes("insert into timeline_logs")));
});

void test("LeadsService.convert writes bmvProfile when intended_case_type contains bmv", async () => {
  const bmvLead = {
    ...SAMPLE_LEAD_ROW,
    assigned_org_id: "org-1",
    intended_case_type: "bmv",
  };
  const clientCalls: { sql: string; params: unknown[] }[] = [];
  const pool = makePoolWithClient(
    (sql, params) => {
      clientCalls.push({ sql, params: params ?? [] });
      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK")
        return Promise.resolve({ rows: [] });
      if (sql.includes("SAVEPOINT") || sql.includes("RELEASE"))
        return Promise.resolve({ rows: [] });
      if (sql.includes("insert into cases"))
        return Promise.resolve({ rows: [{ id: "case-1" }] });
      if (sql.includes("update leads"))
        return Promise.resolve({
          rows: [
            {
              ...bmvLead,
              status: "converted_case",
              converted_customer_id: "cust-1",
              converted_case_id: "case-1",
            },
          ],
        });
      return Promise.resolve({ rows: [], rowCount: 1 });
    },
    (sql) => {
      if (sql.includes("select") && sql.includes("from leads"))
        return Promise.resolve({ rows: [bmvLead] });
      return Promise.resolve({ rows: [] });
    },
  );

  const svc = new LeadsService(pool);
  await svc.convert("lead-1", {
    customerId: "cust-1",
    caseTypeCode: "bmv",
    ownerUserId: "user-1",
    orgId: "org-1",
    confirmDedup: true,
  });

  const bmvUpdate = clientCalls.find(
    (c) => c.sql.includes("update customers") && c.sql.includes("bmvProfile"),
  );
  assert.ok(bmvUpdate, "Should update customer bmvProfile");
  const profileJson = bmvUpdate.params[1] as string;
  const profile = JSON.parse(profileJson) as Record<string, unknown>;
  assert.equal(profile.sourceLeadId, "lead-1");
  assert.equal(profile.questionnaireStatus, "not_started");
});

void test("LeadsService.convert returns 409 on dedup hit without confirmDedup", async () => {
  const leadRow = {
    ...SAMPLE_LEAD_ROW,
    assigned_org_id: "org-1",
    phone: "090-1234-5678",
  };
  const pool = makePoolWithClient(
    () => Promise.resolve({ rows: [] }),
    (sql) => {
      if (sql.includes("select") && sql.includes("from leads"))
        return Promise.resolve({ rows: [leadRow] });
      if (sql.includes("from customers"))
        return Promise.resolve({
          rows: [
            {
              id: "existing-cust",
              base_profile: {
                name: "Duplicate Customer",
                phone: "090-1234-5678",
              },
            },
          ],
        });
      if (sql.includes("from contact_persons"))
        return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    },
  );

  const svc = new LeadsService(pool);
  await assert.rejects(
    () =>
      svc.convert("lead-1", {
        customerId: "cust-1",
        caseTypeCode: "immigration",
        ownerUserId: "user-1",
        orgId: "org-1",
      }),
    (err: Error & { status?: number }) => {
      assert.equal(err.status, 409);
      return true;
    },
  );
});

void test("LeadsService.convert skips dedup when confirmDedup is true", async () => {
  const leadRow = {
    ...SAMPLE_LEAD_ROW,
    assigned_org_id: "org-1",
    phone: "090-1234-5678",
  };
  const pool = makePoolWithClient(
    (sql) => {
      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK")
        return Promise.resolve({ rows: [] });
      if (sql.includes("SAVEPOINT") || sql.includes("RELEASE"))
        return Promise.resolve({ rows: [] });
      if (sql.includes("insert into cases"))
        return Promise.resolve({ rows: [{ id: "case-1" }] });
      if (sql.includes("update leads"))
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
      return Promise.resolve({ rows: [], rowCount: 1 });
    },
    (sql) => {
      if (sql.includes("select") && sql.includes("from leads"))
        return Promise.resolve({ rows: [leadRow] });
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

void test("LeadsService.convert rejects already converted lead", async () => {
  const convertedRow = { ...SAMPLE_LEAD_ROW, status: "converted_case" };
  const pool = makePool(() => Promise.resolve({ rows: [convertedRow] }));
  const svc = new LeadsService(pool);
  await assert.rejects(
    () =>
      svc.convert("lead-1", {
        customerId: "cust-1",
        caseTypeCode: "immigration",
        ownerUserId: "user-1",
        orgId: "org-1",
        confirmDedup: true,
      }),
    /already converted/,
  );
});

void test("LeadsService.convert rejects mismatched orgId", async () => {
  const assignedRow = {
    ...SAMPLE_LEAD_ROW,
    assigned_org_id: "org-correct",
  };
  const pool = makePool(() => Promise.resolve({ rows: [assignedRow] }));
  const svc = new LeadsService(pool);
  await assert.rejects(
    () =>
      svc.convert("lead-1", {
        customerId: "cust-1",
        caseTypeCode: "immigration",
        ownerUserId: "user-1",
        orgId: "org-wrong",
        confirmDedup: true,
      }),
    /orgId does not match/,
  );
});

// ── Edge cases: create ──

void test("LeadsService.create uses default source='web' and language='en'", async () => {
  const calls: { sql: string; params: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql, params: params ?? [] });
    return Promise.resolve({ rows: [SAMPLE_LEAD_ROW] });
  });
  const svc = new LeadsService(pool);
  await svc.create({ appUserId: "au-1" });
  const insertCall = calls.find((c) => c.sql.includes("insert"));
  assert.ok(insertCall);
  assert.equal(insertCall.params[1], "web");
  assert.equal(insertCall.params[2], "en");
});

void test("LeadsService.create throws if insert returns no rows", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [] }));
  const svc = new LeadsService(pool);
  await assert.rejects(
    () => svc.create({ appUserId: "au-1" }),
    /Failed to create lead/,
  );
});

// ── Edge cases: list ──

void test("LeadsService.list defaults to page=1, limit=50", async () => {
  const calls: { sql: string; params: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql, params: params ?? [] });
    if (sql.includes("count(*)"))
      return Promise.resolve({ rows: [{ count: "0" }] });
    return Promise.resolve({ rows: [] });
  });
  const svc = new LeadsService(pool);
  await svc.list();
  const dataCall = calls.find((c) => c.sql.includes("order by"));
  assert.ok(dataCall);
  assert.equal(dataCall.params[0], 50); // limit
  assert.equal(dataCall.params[1], 0); // offset
});

void test("LeadsService.list clamps limit to max 200", async () => {
  const calls: { sql: string; params: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql, params: params ?? [] });
    if (sql.includes("count(*)"))
      return Promise.resolve({ rows: [{ count: "0" }] });
    return Promise.resolve({ rows: [] });
  });
  const svc = new LeadsService(pool);
  await svc.list({ limit: 999 });
  const dataCall = calls.find((c) => c.sql.includes("order by"));
  assert.ok(dataCall);
  assert.equal(dataCall.params[0], 200);
});

void test("LeadsService.list with page=2 applies correct offset", async () => {
  const calls: { sql: string; params: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql, params: params ?? [] });
    if (sql.includes("count(*)"))
      return Promise.resolve({ rows: [{ count: "0" }] });
    return Promise.resolve({ rows: [] });
  });
  const svc = new LeadsService(pool);
  await svc.list({ page: 2, limit: 10 });
  const dataCall = calls.find((c) => c.sql.includes("order by"));
  assert.ok(dataCall);
  assert.equal(dataCall.params[0], 10); // limit
  assert.equal(dataCall.params[1], 10); // offset = (2-1)*10
});

// ── Edge cases: update ──

void test("LeadsService.update with empty input returns existing lead", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [SAMPLE_LEAD_ROW] }));
  const svc = new LeadsService(pool);
  const result = await svc.update("lead-1", {});
  assert.equal(result.id, "lead-1");
});

void test("LeadsService.update throws if lead not found", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [] }));
  const svc = new LeadsService(pool);
  await assert.rejects(
    () => svc.update("missing", { status: "following" }),
    /Lead not found/,
  );
});

// ── Edge cases: assign ──

void test("LeadsService.assign throws if lead not found", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [] }));
  const svc = new LeadsService(pool);
  await assert.rejects(
    () =>
      svc.assign("missing", {
        assignedOrgId: "org-1",
        assignedUserId: "user-1",
      }),
    /Lead not found/,
  );
});
