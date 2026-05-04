import test from "node:test";
import assert from "node:assert/strict";
import { CasePartiesService } from "./caseParties.service";
import { VALID_PARTY_TYPES } from "./caseParties.types";
const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const CASE_ID = "case-1";
function makeCtx() {
  return { orgId: ORG_ID, userId: USER_ID, role: "staff" };
}
function makePool(queryFn) {
  const client = { query: queryFn, release: () => undefined };
  return { connect: () => Promise.resolve(client) };
}
function makeTimeline() {
  return {
    service: {
      write: () => Promise.resolve(),
    },
  };
}
function svc(pool, tl) {
  return new CasePartiesService(pool, tl.service);
}
function makeRow(partyType) {
  return {
    id: `party-${partyType}`,
    org_id: ORG_ID,
    case_id: CASE_ID,
    party_type: partyType,
    customer_id: "cust-1",
    contact_person_id: null,
    relation_to_case: null,
    is_primary: false,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}
const ALL_PARTY_TYPES = [
  "applicant",
  "spouse",
  "child",
  "family",
  "guarantor",
  "representative",
  "supporter",
  "other",
];
void test("VALID_PARTY_TYPES contains exactly the 8 expected values", () => {
  assert.equal(VALID_PARTY_TYPES.size, 8);
  for (const pt of ALL_PARTY_TYPES) {
    assert.ok(VALID_PARTY_TYPES.has(pt), `missing: ${pt}`);
  }
});
for (const pt of ALL_PARTY_TYPES) {
  void test(`create accepts partyType="${pt}"`, async () => {
    const pool = makePool((sql) => {
      if (sql.includes("select id from cases"))
        return Promise.resolve({ rows: [{ id: CASE_ID }], rowCount: 1 });
      if (sql.includes("insert into case_parties"))
        return Promise.resolve({ rows: [makeRow(pt)], rowCount: 1 });
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    const party = await svc(pool, makeTimeline()).create(makeCtx(), {
      caseId: CASE_ID,
      partyType: pt,
      customerId: "cust-1",
    });
    assert.equal(party.partyType, pt);
  });
}
void test('create with partyType="applicant" + isPrimary=true succeeds', async () => {
  const pool = makePool((sql) => {
    if (sql.includes("select id from cases"))
      return Promise.resolve({ rows: [{ id: CASE_ID }], rowCount: 1 });
    if (sql.includes("is_primary = true"))
      return Promise.resolve({ rows: [], rowCount: 0 });
    if (sql.includes("insert into case_parties"))
      return Promise.resolve({
        rows: [{ ...makeRow("applicant"), is_primary: true }],
        rowCount: 1,
      });
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const party = await svc(pool, makeTimeline()).create(makeCtx(), {
    caseId: CASE_ID,
    partyType: "applicant",
    customerId: "cust-1",
    isPrimary: true,
  });
  assert.equal(party.partyType, "applicant");
  assert.equal(party.isPrimary, true);
});
void test("duplicate primary applicant on same case is rejected", async () => {
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
        partyType: "applicant",
        customerId: "cust-1",
        isPrimary: true,
      }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.ok(
        err.message.includes(
          "A primary applicant already exists for this case",
        ),
      );
      return true;
    },
  );
});
void test("create rejects unknown partyType", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [], rowCount: 0 }));
  await assert.rejects(
    () =>
      svc(pool, makeTimeline()).create(makeCtx(), {
        caseId: CASE_ID,
        partyType: "bogus",
        customerId: "cust-1",
      }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes("Invalid partyType"));
      return true;
    },
  );
});
//# sourceMappingURL=caseParties.service.bug177.focused.test.js.map
