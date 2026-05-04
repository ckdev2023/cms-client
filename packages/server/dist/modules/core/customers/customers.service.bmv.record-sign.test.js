import assert from "node:assert/strict";
import test from "node:test";
import { resolveCustomerBmvProfile } from "./customers.dto-mappers";
import { CustomersService } from "./customers.service";
const ctx = {
  orgId: "00000000-0000-4000-8000-000000000000",
  userId: "00000000-0000-4000-8000-000000000001",
  role: "staff",
};
function createService(pool, timelineService = {}) {
  return new CustomersService(
    pool,
    {
      canAccessCustomer: () => true,
      canEditCustomer: () => true,
    },
    { write: () => Promise.resolve(), ...timelineService },
    { create: () => Promise.resolve({}) },
  );
}
function parsePatch(params) {
  const raw = params?.[1];
  assert.ok(typeof raw === "string");
  return JSON.parse(raw);
}
function readProfile(baseProfile) {
  const profile = resolveCustomerBmvProfile(baseProfile);
  assert.ok(profile);
  return profile;
}
function row(bmvProfile) {
  return {
    id: "c1",
    org_id: ctx.orgId,
    type: "individual",
    base_profile: { name: "Alice", bmvProfile },
    contacts: [],
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
  };
}
void test("CustomersService.recordBmvSign confirms quote, marks signed and writes timeline", async () => {
  const calls = [];
  const timelineWrites = [];
  const client = {
    query: (sql, params) => {
      calls.push({ sql: sql.trim(), params });
      if (sql.includes("update customers"))
        return Promise.resolve({ rows: [row(parsePatch(params))] });
      return Promise.resolve({
        rows: [
          row({
            questionnaireStatus: "returned",
            quoteStatus: "generated",
            signStatus: "pending",
          }),
        ],
      });
    },
    release: () => undefined,
  };
  const service = createService(
    { connect: () => Promise.resolve(client) },
    {
      write: (_ctx, input) =>
        Promise.resolve(timelineWrites.push(input)).then(() => undefined),
    },
  );
  const updated = await service.recordBmvSign(ctx, "c1");
  const profile = readProfile(updated.baseProfile);
  const updateCall = calls.find((call) =>
    call.sql.includes("update customers"),
  );
  assert.ok(updateCall);
  const patch = parsePatch(updateCall.params);
  assert.equal(profile.quoteStatus, "confirmed");
  assert.equal(profile.signStatus, "signed");
  assert.equal(profile.intakeStatus, "ready_for_case_creation");
  assert.ok(patch.quoteConfirmedAt);
  assert.ok(patch.signedAt);
  assert.equal(timelineWrites[0].action, "customer.bmv_signed");
});
void test("CustomersService.recordBmvSign preserves quoteConfirmedAt when quote is already confirmed", async () => {
  const confirmedAt = "2026-01-02T00:00:00.000Z";
  const calls = [];
  const client = {
    query: (sql, params) => {
      calls.push({ sql: sql.trim(), params });
      if (sql.includes("update customers"))
        return Promise.resolve({ rows: [row(parsePatch(params))] });
      return Promise.resolve({
        rows: [
          row({
            questionnaireStatus: "returned",
            quoteStatus: "confirmed",
            signStatus: "pending",
            quoteConfirmedAt: confirmedAt,
          }),
        ],
      });
    },
    release: () => undefined,
  };
  const updated = await createService({
    connect: () => Promise.resolve(client),
  }).recordBmvSign(ctx, "c1");
  const profile = readProfile(updated.baseProfile);
  const updateCall = calls.find((call) =>
    call.sql.includes("update customers"),
  );
  assert.ok(updateCall);
  const patch = parsePatch(updateCall.params);
  assert.equal(profile.quoteConfirmedAt, confirmedAt);
  assert.equal(patch.quoteConfirmedAt, confirmedAt);
  assert.ok(patch.signedAt);
});
void test("CustomersService.recordBmvSign is idempotent for already signed customers", async () => {
  const calls = [];
  const signedAt = "2026-01-03T00:00:00.000Z";
  const timelineWrites = [];
  const client = {
    query: (sql, params) => {
      calls.push({ sql: sql.trim(), params });
      return Promise.resolve({
        rows: [
          row({
            questionnaireStatus: "returned",
            quoteStatus: "confirmed",
            signStatus: "signed",
            quoteConfirmedAt: "2026-01-02T00:00:00.000Z",
            signedAt,
          }),
        ],
      });
    },
    release: () => undefined,
  };
  const service = createService(
    { connect: () => Promise.resolve(client) },
    {
      write: (_ctx, input) =>
        Promise.resolve(timelineWrites.push(input)).then(() => undefined),
    },
  );
  const updated = await service.recordBmvSign(ctx, "c1");
  const profile = readProfile(updated.baseProfile);
  assert.equal(profile.signStatus, "signed");
  assert.equal(profile.signedAt, signedAt);
  assert.equal(
    calls.filter((call) => call.sql.includes("update customers")).length,
    0,
  );
  assert.equal(timelineWrites.length, 0);
});
void test("CustomersService.recordBmvSign rejects when quote is not ready", async () => {
  const client = {
    query: () =>
      Promise.resolve({
        rows: [
          row({
            questionnaireStatus: "sent",
            quoteStatus: "not_started",
            signStatus: "not_started",
          }),
        ],
      }),
    release: () => undefined,
  };
  const service = createService({
    connect: () => Promise.resolve(client),
  });
  await assert.rejects(
    () => service.recordBmvSign(ctx, "c1"),
    (err) => {
      assert.ok(err instanceof Error);
      assert.equal(err.message, "Quote must be generated before signing");
      return true;
    },
  );
});
//# sourceMappingURL=customers.service.bmv.record-sign.test.js.map
