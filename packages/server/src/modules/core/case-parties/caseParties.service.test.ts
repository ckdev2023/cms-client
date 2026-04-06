import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";

import { CasePartiesService, mapCasePartyRow } from "./caseParties.service";
import type { RequestContext } from "../tenancy/requestContext";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const CASE_ID = "case-1";
const PARTY_ID = "party-1";

function makeCtx(
  role: "staff" | "viewer" | "manager" = "staff",
): RequestContext {
  return { orgId: ORG_ID, userId: USER_ID, role };
}

const sampleRow = {
  id: PARTY_ID,
  org_id: ORG_ID,
  case_id: CASE_ID,
  party_type: "spouse",
  customer_id: "cust-1" as string | null,
  contact_person_id: null as string | null,
  relation_to_case: "配偶" as string | null,
  is_primary: false,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

type PoolClientLike = {
  query: (
    sql: string,
    params?: unknown[],
  ) => Promise<{ rows: unknown[]; rowCount: number }>;
  release: () => void;
};

function makePool(queryFn: PoolClientLike["query"]): Pool {
  const client: PoolClientLike = { query: queryFn, release: () => undefined };
  return { connect: () => Promise.resolve(client) } as unknown as Pool;
}

function makeTimeline() {
  const writes: unknown[] = [];
  return {
    service: {
      write: (_ctx: unknown, input: unknown) => {
        writes.push(input);
        return Promise.resolve();
      },
    },
    writes,
  };
}

function svc(pool: Pool, tl: { service: unknown }) {
  return new CasePartiesService(pool, tl.service as never);
}

// ── mapCasePartyRow ──

void test("mapCasePartyRow maps row to CaseParty entity", () => {
  const cp = mapCasePartyRow(sampleRow);
  assert.equal(cp.id, PARTY_ID);
  assert.equal(cp.orgId, ORG_ID);
  assert.equal(cp.caseId, CASE_ID);
  assert.equal(cp.partyType, "spouse");
  assert.equal(cp.customerId, "cust-1");
  assert.equal(cp.contactPersonId, null);
  assert.equal(cp.relationToCase, "配偶");
  assert.equal(cp.isPrimary, false);
});

void test("mapCasePartyRow handles null optional fields", () => {
  const cp = mapCasePartyRow({
    ...sampleRow,
    customer_id: null,
    contact_person_id: null,
    relation_to_case: null,
  });
  assert.equal(cp.customerId, null);
  assert.equal(cp.contactPersonId, null);
  assert.equal(cp.relationToCase, null);
});

// ── create ──

void test("CasePartiesService.create inserts row and writes timeline", async () => {
  const tl = makeTimeline();
  const pool = makePool((sql) => {
    if (sql.includes("select id from cases"))
      return Promise.resolve({ rows: [{ id: CASE_ID }], rowCount: 1 });
    if (sql.includes("insert into case_parties"))
      return Promise.resolve({ rows: [sampleRow], rowCount: 1 });
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const party = await svc(pool, tl).create(makeCtx(), {
    caseId: CASE_ID,
    partyType: "spouse",
    customerId: "cust-1",
    relationToCase: "配偶",
  });

  assert.equal(party.id, PARTY_ID);
  assert.equal(party.partyType, "spouse");
  assert.equal(tl.writes.length, 1);
  assert.deepEqual(tl.writes[0], {
    entityType: "case_party",
    entityId: PARTY_ID,
    action: "case_party.created",
    payload: { caseId: CASE_ID, partyType: "spouse" },
  });
});

void test("CasePartiesService.create throws when both customerId and contactPersonId missing", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [], rowCount: 0 }));

  await assert.rejects(
    () =>
      svc(pool, makeTimeline()).create(makeCtx(), {
        caseId: CASE_ID,
        partyType: "spouse",
      }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.equal(err.message, "customerId or contactPersonId is required");
      return true;
    },
  );
});

void test("CasePartiesService.create throws on invalid partyType", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [], rowCount: 0 }));

  await assert.rejects(
    () =>
      svc(pool, makeTimeline()).create(makeCtx(), {
        caseId: CASE_ID,
        partyType: "invalid_type",
        customerId: "cust-1",
      }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes("Invalid partyType"));
      return true;
    },
  );
});

void test("CasePartiesService.create rejects cross-tenant caseId", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("select id from cases"))
      return Promise.resolve({ rows: [], rowCount: 0 }); // RLS blocks
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  await assert.rejects(
    () =>
      svc(pool, makeTimeline()).create(makeCtx(), {
        caseId: "foreign-case",
        partyType: "spouse",
        customerId: "cust-1",
      }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes("cases"));
      return true;
    },
  );
});

void test("CasePartiesService.create throws on insert failure", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("select id from cases"))
      return Promise.resolve({ rows: [{ id: CASE_ID }], rowCount: 1 });
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  await assert.rejects(
    () =>
      svc(pool, makeTimeline()).create(makeCtx(), {
        caseId: CASE_ID,
        partyType: "spouse",
        customerId: "cust-1",
      }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.equal(err.message, "Failed to create case party");
      return true;
    },
  );
});

void test("CasePartiesService.create rejects is_primary conflict", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("select id from cases"))
      return Promise.resolve({ rows: [{ id: CASE_ID }], rowCount: 1 });
    if (sql.includes("is_primary = true"))
      return Promise.resolve({
        rows: [{ id: "existing-primary" }],
        rowCount: 1,
      });
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  await assert.rejects(
    () =>
      svc(pool, makeTimeline()).create(makeCtx(), {
        caseId: CASE_ID,
        partyType: "spouse",
        customerId: "cust-1",
        isPrimary: true,
      }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes("primary"));
      return true;
    },
  );
});

// ── get ──

void test("CasePartiesService.get returns party or null", async () => {
  const pool = makePool((sql, params) => {
    if (sql.includes("from case_parties") && params?.[0] === PARTY_ID)
      return Promise.resolve({ rows: [sampleRow], rowCount: 1 });
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const found = await svc(pool, makeTimeline()).get(
    makeCtx("viewer"),
    PARTY_ID,
  );
  assert.ok(found);
  assert.equal(found.id, PARTY_ID);

  const missing = await svc(pool, makeTimeline()).get(
    makeCtx("viewer"),
    "no-exist",
  );
  assert.equal(missing, null);
});

// ── list ──

void test("CasePartiesService.list returns items and total", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("count(*)"))
      return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
    if (sql.includes("from case_parties"))
      return Promise.resolve({ rows: [sampleRow], rowCount: 1 });
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const result = await svc(pool, makeTimeline()).list(makeCtx("viewer"), {
    caseId: CASE_ID,
  });
  assert.equal(result.total, 1);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].caseId, CASE_ID);
});

void test("CasePartiesService.list filters by caseId", async () => {
  const calls: string[] = [];
  const pool = makePool((sql) => {
    calls.push(sql.trim());
    if (sql.includes("count(*)"))
      return Promise.resolve({ rows: [{ count: "0" }], rowCount: 1 });
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  await svc(pool, makeTimeline()).list(makeCtx("viewer"), { caseId: CASE_ID });
  const countSql = calls.find((s) => s.includes("count(*)"));
  assert.ok(countSql);
  assert.ok(countSql.includes("case_id = $"));
});

// ── update ──

void test("CasePartiesService.update updates and writes timeline", async () => {
  const tl = makeTimeline();
  const pool = makePool((sql, params) => {
    // get() by id
    if (
      sql.includes("select") &&
      sql.includes("from case_parties") &&
      params?.[0] === PARTY_ID &&
      !sql.includes("is_primary = true")
    )
      return Promise.resolve({ rows: [sampleRow], rowCount: 1 });
    if (sql.includes("update case_parties"))
      return Promise.resolve({
        rows: [{ ...sampleRow, party_type: "child" }],
        rowCount: 1,
      });
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const updated = await svc(pool, tl).update(makeCtx(), PARTY_ID, {
    partyType: "child",
  });
  assert.equal(updated.partyType, "child");
  assert.equal(tl.writes.length, 1);
});

void test("CasePartiesService.update throws NotFoundException when not found", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [], rowCount: 0 }));

  await assert.rejects(
    () =>
      svc(pool, makeTimeline()).update(makeCtx(), "no-exist", {
        partyType: "child",
      }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.equal(err.message, "Case party not found");
      return true;
    },
  );
});

void test("CasePartiesService.update rejects is_primary conflict", async () => {
  const pool = makePool((sql, params) => {
    // get() by id
    if (
      sql.includes("select") &&
      sql.includes("from case_parties") &&
      params?.[0] === PARTY_ID &&
      !sql.includes("is_primary = true")
    )
      return Promise.resolve({ rows: [sampleRow], rowCount: 1 });
    if (sql.includes("is_primary = true"))
      return Promise.resolve({ rows: [{ id: "other" }], rowCount: 1 });
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  await assert.rejects(
    () =>
      svc(pool, makeTimeline()).update(makeCtx(), PARTY_ID, {
        isPrimary: true,
      }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes("primary"));
      return true;
    },
  );
});

// ── hardDelete ──

void test("CasePartiesService.hardDelete deletes and writes timeline", async () => {
  const tl = makeTimeline();
  const pool = makePool((sql) => {
    if (sql.includes("from case_parties") && !sql.includes("delete"))
      return Promise.resolve({ rows: [sampleRow], rowCount: 1 });
    if (sql.includes("delete from case_parties"))
      return Promise.resolve({ rows: [], rowCount: 1 });
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  await svc(pool, tl).hardDelete(makeCtx(), PARTY_ID);
  assert.equal(tl.writes.length, 1);
  assert.deepEqual(tl.writes[0], {
    entityType: "case_party",
    entityId: PARTY_ID,
    action: "case_party.deleted",
    payload: { caseId: CASE_ID, partyType: "spouse" },
  });
});

void test("CasePartiesService.hardDelete throws NotFoundException when not found", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [], rowCount: 0 }));

  await assert.rejects(
    () => svc(pool, makeTimeline()).hardDelete(makeCtx(), "no-exist"),
    (err) => {
      assert.ok(err instanceof Error);
      assert.equal(err.message, "Case party not found");
      return true;
    },
  );
});

void test("CasePartiesService.hardDelete throws on delete failure", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("from case_parties") && !sql.includes("delete"))
      return Promise.resolve({ rows: [sampleRow], rowCount: 1 });
    if (sql.includes("delete from case_parties"))
      return Promise.resolve({ rows: [], rowCount: 0 });
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  await assert.rejects(
    () => svc(pool, makeTimeline()).hardDelete(makeCtx(), PARTY_ID),
    (err) => {
      assert.ok(err instanceof Error);
      assert.equal(err.message, "Failed to delete case party");
      return true;
    },
  );
});
