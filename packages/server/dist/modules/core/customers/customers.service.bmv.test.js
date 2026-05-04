import assert from "node:assert/strict";
import test from "node:test";
import { resolveCustomerBmvProfile } from "./customers.dto-mappers";
import { CustomersService } from "./customers.service";
function createCustomersService(
  pool,
  timelineService = {
    write: () => Promise.resolve(),
  },
) {
  return new CustomersService(
    pool,
    {
      canAccessCustomer: () => true,
      canEditCustomer: () => true,
    },
    timelineService,
    { create: () => Promise.resolve({}) },
  );
}
function parseBmvPatch(params) {
  const raw = params?.[1];
  assert.ok(typeof raw === "string");
  return JSON.parse(raw);
}
function readBmvProfile(baseProfile) {
  const profile = resolveCustomerBmvProfile(baseProfile);
  assert.ok(profile);
  return profile;
}
const ctx = {
  orgId: "00000000-0000-4000-8000-000000000000",
  userId: "00000000-0000-4000-8000-000000000001",
  role: "staff",
};
void test("CustomersService.sendBmvQuestionnaire patches bmvProfile and writes timeline", async () => {
  const calls = [];
  const client = {
    query: (sql, params) => {
      calls.push({ sql: sql.trim(), params });
      if (sql.includes("id = $1") && !sql.includes("update customers")) {
        return Promise.resolve({
          rows: [
            {
              id: "c1",
              org_id: ctx.orgId,
              type: "individual",
              base_profile: {
                name: "Alice",
                bmvProfile: {
                  questionnaireStatus: "not_started",
                  quoteStatus: "not_started",
                  signStatus: "not_started",
                },
              },
              contacts: [],
              created_at: "2026-01-01T00:00:00.000Z",
              updated_at: "2026-01-01T00:00:00.000Z",
            },
          ],
        });
      }
      if (sql.includes("update customers")) {
        const patch = parseBmvPatch(params);
        return Promise.resolve({
          rows: [
            {
              id: "c1",
              org_id: ctx.orgId,
              type: "individual",
              base_profile: {
                name: "Alice",
                bmvProfile: {
                  questionnaireStatus:
                    patch.questionnaireStatus ?? "not_started",
                  quoteStatus: "not_started",
                  signStatus: "not_started",
                  questionnaireSentAt: patch.questionnaireSentAt ?? null,
                },
              },
              contacts: [],
              created_at: "2026-01-01T00:00:00.000Z",
              updated_at: "2026-01-02T00:00:00.000Z",
            },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    },
    release: () => undefined,
  };
  const timelineWrites = [];
  const service = createCustomersService(
    { connect: () => Promise.resolve(client) },
    {
      write: (_ctx, input) => {
        timelineWrites.push(input);
        return Promise.resolve();
      },
    },
  );
  const updated = await service.sendBmvQuestionnaire(ctx, "c1");
  assert.equal(readBmvProfile(updated.baseProfile).questionnaireStatus, "sent");
  const updateCall = calls.find((call) =>
    call.sql.includes("update customers"),
  );
  assert.ok(updateCall);
  assert.equal(parseBmvPatch(updateCall.params).questionnaireStatus, "sent");
  assert.equal(timelineWrites[0].action, "customer.bmv_questionnaire_sent");
});
void test("CustomersService.sendBmvQuestionnaire rejects duplicate sends before patching", async () => {
  const calls = [];
  const client = {
    query: (sql, params) => {
      calls.push({ sql: sql.trim(), params });
      return Promise.resolve({
        rows: [
          {
            id: "c1",
            org_id: ctx.orgId,
            type: "individual",
            base_profile: {
              name: "Alice",
              bmvProfile: {
                questionnaireStatus: "sent",
                quoteStatus: "not_started",
                signStatus: "not_started",
                questionnaireSentAt: "2026-01-01T00:00:00.000Z",
              },
            },
            contacts: [],
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-01-01T00:00:00.000Z",
          },
        ],
      });
    },
    release: () => undefined,
  };
  const timelineWrites = [];
  const service = createCustomersService(
    { connect: () => Promise.resolve(client) },
    {
      write: (_ctx, input) => {
        timelineWrites.push(input);
        return Promise.resolve();
      },
    },
  );
  await assert.rejects(
    async () => {
      await service.sendBmvQuestionnaire(ctx, "c1");
    },
    (err) => {
      assert.ok(err instanceof Error);
      assert.equal(
        err.message,
        "Questionnaire already sent; cannot send questionnaire again",
      );
      return true;
    },
  );
  assert.equal(
    calls.filter((call) => call.sql.includes("update customers")).length,
    0,
  );
  assert.equal(timelineWrites.length, 0);
});
void test("CustomersService.sendBmvQuestionnaire rejects completed questionnaire stage before patching", async () => {
  const calls = [];
  const client = {
    query: (sql, params) => {
      calls.push({ sql: sql.trim(), params });
      return Promise.resolve({
        rows: [
          {
            id: "c1",
            org_id: ctx.orgId,
            type: "individual",
            base_profile: {
              name: "Alice",
              bmvProfile: {
                questionnaireStatus: "returned",
                quoteStatus: "not_started",
                signStatus: "not_started",
                questionnaireReturnedAt: "2026-01-02T00:00:00.000Z",
              },
            },
            contacts: [],
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-01-02T00:00:00.000Z",
          },
        ],
      });
    },
    release: () => undefined,
  };
  const timelineWrites = [];
  const service = createCustomersService(
    { connect: () => Promise.resolve(client) },
    {
      write: (_ctx, input) => {
        timelineWrites.push(input);
        return Promise.resolve();
      },
    },
  );
  await assert.rejects(
    async () => {
      await service.sendBmvQuestionnaire(ctx, "c1");
    },
    (err) => {
      assert.ok(err instanceof Error);
      assert.equal(
        err.message,
        "Questionnaire stage already completed; cannot send questionnaire",
      );
      return true;
    },
  );
  assert.equal(
    calls.filter((call) => call.sql.includes("update customers")).length,
    0,
  );
  assert.equal(timelineWrites.length, 0);
});
void test("CustomersService.sendBmvQuestionnaire rejects after sign completed", async () => {
  const calls = [];
  const client = {
    query: (sql, params) => {
      calls.push({ sql: sql.trim(), params });
      return Promise.resolve({
        rows: [
          {
            id: "c1",
            org_id: ctx.orgId,
            type: "individual",
            base_profile: {
              name: "Alice",
              bmvProfile: {
                questionnaireStatus: "returned",
                quoteStatus: "confirmed",
                signStatus: "signed",
                signedAt: "2026-01-03T00:00:00.000Z",
              },
            },
            contacts: [],
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-01-03T00:00:00.000Z",
          },
        ],
      });
    },
    release: () => undefined,
  };
  const timelineWrites = [];
  const service = createCustomersService(
    { connect: () => Promise.resolve(client) },
    {
      write: (_ctx, input) => {
        timelineWrites.push(input);
        return Promise.resolve();
      },
    },
  );
  await assert.rejects(
    async () => {
      await service.sendBmvQuestionnaire(ctx, "c1");
    },
    (err) => {
      assert.ok(err instanceof Error);
      assert.equal(
        err.message,
        "Customer already signed; questionnaire cannot be sent again",
      );
      return true;
    },
  );
  assert.equal(
    calls.filter((call) => call.sql.includes("update customers")).length,
    0,
  );
  assert.equal(timelineWrites.length, 0);
});
void test("CustomersService.sendBmvQuestionnaire rewrites legacy bmv_profile into canonical bmvProfile", async () => {
  const calls = [];
  const client = {
    query: (sql, params) => {
      calls.push({ sql: sql.trim(), params });
      if (sql.includes("id = $1") && !sql.includes("update customers")) {
        return Promise.resolve({
          rows: [
            {
              id: "c1",
              org_id: ctx.orgId,
              type: "individual",
              base_profile: {
                name: "Alice",
                bmv_profile: {
                  questionnaire_status: "not_started",
                  quote_status: "not_started",
                  sign_status: "not_started",
                  memo: "legacy note",
                },
              },
              contacts: [],
              created_at: "2026-01-01T00:00:00.000Z",
              updated_at: "2026-01-01T00:00:00.000Z",
            },
          ],
        });
      }
      if (sql.includes("update customers")) {
        const patch = parseBmvPatch(params);
        return Promise.resolve({
          rows: [
            {
              id: "c1",
              org_id: ctx.orgId,
              type: "individual",
              base_profile: { name: "Alice", bmvProfile: patch },
              contacts: [],
              created_at: "2026-01-01T00:00:00.000Z",
              updated_at: "2026-01-02T00:00:00.000Z",
            },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    },
    release: () => undefined,
  };
  const service = createCustomersService({
    connect: () => Promise.resolve(client),
  });
  const updated = await service.sendBmvQuestionnaire(ctx, "c1");
  const updateCall = calls.find((call) =>
    call.sql.includes("update customers"),
  );
  assert.ok(updateCall);
  assert.match(updateCall.sql, /- 'bmv_profile'/);
  const patch = parseBmvPatch(updateCall.params);
  assert.equal(patch.questionnaireStatus, "sent");
  assert.equal(patch.quoteStatus, "not_started");
  assert.equal(patch.signStatus, "not_started");
  assert.equal(patch.note, "legacy note");
  assert.equal(readBmvProfile(updated.baseProfile).note, "legacy note");
});
//# sourceMappingURL=customers.service.bmv.test.js.map
