import assert from "node:assert/strict";
import test from "node:test";
import type { Pool } from "pg";

import { PermissionsService } from "../auth/permissions.service";
import { resolveCustomerBmvProfile } from "./customers.dto-mappers";
import { CustomersService } from "./customers.service";
import type { CustomerBmvProfile } from "./customers.types";

function createCustomersService(
  pool: Pool,
  timelineService: { write?: (...args: unknown[]) => Promise<void> } = {
    write: () => Promise.resolve(),
  },
): CustomersService {
  return new CustomersService(
    pool,
    {
      canAccessCustomer: () => true,
      canEditCustomer: () => true,
    } as unknown as PermissionsService,
    timelineService as never,
  );
}

function parseBmvPatch(
  params: unknown[] | undefined,
): Partial<Omit<CustomerBmvProfile, "intakeStatus">> {
  const raw = params?.[1];
  assert.ok(typeof raw === "string");
  return JSON.parse(raw) as Partial<Omit<CustomerBmvProfile, "intakeStatus">>;
}

function readBmvProfile(
  baseProfile: Record<string, unknown>,
): CustomerBmvProfile {
  const profile = resolveCustomerBmvProfile(baseProfile);
  assert.ok(profile);
  return profile;
}

function makeCustomerRow(
  profile: Partial<Omit<CustomerBmvProfile, "intakeStatus">>,
) {
  return {
    id: "c1",
    org_id: ctx.orgId,
    type: "individual",
    base_profile: { name: "Alice", bmvProfile: profile },
    contacts: [],
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
  };
}

const ctx = {
  orgId: "00000000-0000-4000-8000-000000000000",
  userId: "00000000-0000-4000-8000-000000000001",
  role: "staff",
} as const;

void test("CustomersService.generateBmvQuote advances questionnaire and quote states", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const client = {
    query: (sql: string, params?: unknown[]) => {
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
  const timelineWrites: unknown[] = [];
  const service = createCustomersService(
    { connect: () => Promise.resolve(client) } as unknown as Pool,
    {
      write: (_ctx: unknown, input: unknown) =>
        Promise.resolve(timelineWrites.push(input)).then(() => undefined),
    },
  );

  const updated = await service.generateBmvQuote(ctx, "c1");
  const updatedProfile = readBmvProfile(updated.baseProfile);
  assert.equal(updatedProfile.questionnaireStatus, "returned");
  assert.equal(updatedProfile.quoteStatus, "generated");
  assert.equal(updatedProfile.signStatus, "pending");
  assert.equal(updatedProfile.intakeStatus, "sign_pending");
  const updateCall = calls.find((call) =>
    call.sql.includes("update customers"),
  );
  assert.ok(updateCall);
  assert.equal(parseBmvPatch(updateCall.params).quoteStatus, "generated");
  assert.equal(
    (timelineWrites[0] as { action: string }).action,
    "customer.bmv_quote_generated",
  );
});

void test("CustomersService.generateBmvQuote preserves questionnaireReturnedAt when questionnaire is already returned", async () => {
  const returnedAt = "2026-01-02T00:00:00.000Z";
  const calls: { sql: string; params?: unknown[] }[] = [];
  const client = {
    query: (sql: string, params?: unknown[]) => {
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
                  questionnaireStatus: "returned",
                  questionnaireReturnedAt: returnedAt,
                  quoteStatus: "not_started",
                  signStatus: "not_started",
                },
              },
              contacts: [],
              created_at: "2026-01-01T00:00:00.000Z",
              updated_at: "2026-01-02T00:00:00.000Z",
            },
          ],
        });
      }
      if (sql.includes("update customers")) {
        return Promise.resolve({
          rows: [makeCustomerRow(parseBmvPatch(params))],
        });
      }
      return Promise.resolve({ rows: [] });
    },
    release: () => undefined,
  };
  const timelineWrites: unknown[] = [];
  const service = createCustomersService(
    { connect: () => Promise.resolve(client) } as unknown as Pool,
    {
      write: (_ctx: unknown, input: unknown) =>
        Promise.resolve(timelineWrites.push(input)).then(() => undefined),
    },
  );

  const updated = await service.generateBmvQuote(ctx, "c1");
  const updatedProfile = readBmvProfile(updated.baseProfile);
  const updateCall = calls.find((call) =>
    call.sql.includes("update customers"),
  );
  assert.ok(updateCall);
  const patch = parseBmvPatch(updateCall.params);
  assert.equal(updatedProfile.questionnaireReturnedAt, returnedAt);
  assert.equal(patch.questionnaireReturnedAt, returnedAt);
  assert.equal(updatedProfile.quoteStatus, "generated");
  assert.equal(updatedProfile.signStatus, "pending");
  assert.equal(timelineWrites.length, 1);
});

void test("CustomersService.generateBmvQuote rejects duplicate generation before patching", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const client = {
    query: (sql: string, params?: unknown[]) => {
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
                quoteStatus: "generated",
                signStatus: "pending",
                quoteGeneratedAt: "2026-01-02T00:00:00.000Z",
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
  const timelineWrites: unknown[] = [];
  const service = createCustomersService(
    { connect: () => Promise.resolve(client) } as unknown as Pool,
    {
      write: (_ctx: unknown, input: unknown) =>
        Promise.resolve(timelineWrites.push(input)).then(() => undefined),
    },
  );

  await assert.rejects(
    () => service.generateBmvQuote(ctx, "c1"),
    (err) => {
      assert.ok(err instanceof Error);
      assert.equal(
        err.message,
        "Quote stage already completed; cannot generate quote again",
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

void test("CustomersService.generateBmvQuote rejects before questionnaire is sent", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const client = {
    query: (sql: string, params?: unknown[]) => {
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
    },
    release: () => undefined,
  };
  const timelineWrites: unknown[] = [];
  const service = createCustomersService(
    { connect: () => Promise.resolve(client) } as unknown as Pool,
    {
      write: (_ctx: unknown, input: unknown) =>
        Promise.resolve(timelineWrites.push(input)).then(() => undefined),
    },
  );

  await assert.rejects(
    () => service.generateBmvQuote(ctx, "c1"),
    (err) => {
      assert.ok(err instanceof Error);
      assert.equal(err.message, "Questionnaire must be sent before quote");
      return true;
    },
  );
  assert.equal(
    calls.filter((call) => call.sql.includes("update customers")).length,
    0,
  );
  assert.equal(timelineWrites.length, 0);
});

void test("CustomersService.generateBmvQuote rejects after sign completed", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const client = {
    query: (sql: string, params?: unknown[]) => {
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
  const timelineWrites: unknown[] = [];
  const service = createCustomersService(
    { connect: () => Promise.resolve(client) } as unknown as Pool,
    {
      write: (_ctx: unknown, input: unknown) =>
        Promise.resolve(timelineWrites.push(input)).then(() => undefined),
    },
  );

  await assert.rejects(
    () => service.generateBmvQuote(ctx, "c1"),
    (err) => {
      assert.ok(err instanceof Error);
      assert.equal(
        err.message,
        "Customer already signed; quote cannot be generated again",
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
