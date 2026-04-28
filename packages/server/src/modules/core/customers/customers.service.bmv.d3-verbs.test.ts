import assert from "node:assert/strict";
import test from "node:test";
import type { Pool } from "pg";

import { PermissionsService } from "../auth/permissions.service";
import type { CasesService } from "../cases/cases.service";
import { resolveCustomerBmvProfile } from "./customers.dto-mappers";
import { CustomersService } from "./customers.service";
import type { CustomerBmvProfile } from "./customers.types";

const ctx = {
  orgId: "00000000-0000-4000-8000-000000000000",
  userId: "00000000-0000-4000-8000-000000000001",
  role: "staff",
} as const;

function extractBmvProfile(
  row: Record<string, unknown>,
): Record<string, unknown> {
  const bp = row.base_profile as Record<string, unknown> | undefined;
  const profile = bp?.bmvProfile;
  return profile && typeof profile === "object"
    ? (profile as Record<string, unknown>)
    : {};
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

function makeBaseCustomerRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
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
    ...overrides,
  };
}

function makeSignedCustomerRow() {
  return makeBaseCustomerRow({
    base_profile: {
      name: "Alice",
      bmvProfile: {
        questionnaireStatus: "returned",
        quoteStatus: "confirmed",
        signStatus: "signed",
        questionnaireSentAt: "2026-01-01T00:00:00.000Z",
        questionnaireReturnedAt: "2026-01-02T00:00:00.000Z",
        quoteGeneratedAt: "2026-01-03T00:00:00.000Z",
        quoteConfirmedAt: "2026-01-04T00:00:00.000Z",
        signedAt: "2026-01-05T00:00:00.000Z",
        sourceLeadId: "lead-1",
        currentQuoteFormId: "quote-form-1",
        visaPlan: "new_1year",
        quoteAmount: 500000,
      },
    },
  });
}

type QueryCall = { sql: string; params?: unknown[] };

function createTestService(
  queryFn: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>,
  options: {
    timelineWrites?: unknown[];
    createCase?: (...args: unknown[]) => Promise<Record<string, unknown>>;
  } = {},
): { service: CustomersService; calls: QueryCall[] } {
  const calls: QueryCall[] = [];
  const client = {
    query: (sql: string, params?: unknown[]) => {
      calls.push({ sql: sql.trim(), params });
      return queryFn(sql, params);
    },
    release: () => undefined,
  };
  const pool = {
    connect: () => Promise.resolve(client),
  } as unknown as Pool;

  const timelineWrites = options.timelineWrites ?? [];
  const casesService = {
    create: options.createCase ?? (() => Promise.resolve({})),
  } as unknown as CasesService;

  const service = new CustomersService(
    pool,
    {
      canAccessCustomer: () => true,
      canEditCustomer: () => true,
    } as unknown as PermissionsService,
    {
      write: (_ctx: unknown, input: unknown) => {
        timelineWrites.push(input);
        return Promise.resolve();
      },
    } as never,
    casesService,
  );

  return { service, calls };
}

// ── saveBmvSurvey ──

void test("saveBmvSurvey updates intake_form and patches questionnaireStatus to returned", async () => {
  const timelineWrites: unknown[] = [];
  const baseRow = makeBaseCustomerRow();
  const { service, calls } = createTestService(
    (sql, params) => {
      if (sql.includes("update intake_forms")) {
        return Promise.resolve({ rows: [{ id: "intake-1" }] });
      }
      if (sql.includes("update customers")) {
        const patch = parseBmvPatch(params);
        return Promise.resolve({
          rows: [
            {
              ...baseRow,
              base_profile: {
                name: "Alice",
                bmvProfile: { ...extractBmvProfile(baseRow), ...patch },
              },
            },
          ],
        });
      }
      return Promise.resolve({ rows: [baseRow] });
    },
    { timelineWrites },
  );

  const updated = await service.saveBmvSurvey(ctx, "c1", {
    intakeFormId: "intake-1",
    formData: { companyInfo: {}, personalInfo: {}, businessPlan: {} },
  });

  const profile = readBmvProfile(updated.baseProfile);
  assert.equal(profile.questionnaireStatus, "returned");

  const intakeUpdate = calls.find((c) => c.sql.includes("update intake_forms"));
  assert.ok(intakeUpdate);
  assert.ok(intakeUpdate.sql.includes("form_kind = 'bmv_questionnaire'"));

  assert.equal(
    (timelineWrites[0] as { action: string }).action,
    "customer.bmv_survey_saved",
  );
});

void test("saveBmvSurvey rejects when questionnaire already returned", async () => {
  const returnedRow = makeBaseCustomerRow({
    base_profile: {
      name: "Alice",
      bmvProfile: {
        questionnaireStatus: "returned",
        quoteStatus: "not_started",
        signStatus: "not_started",
      },
    },
  });
  const { service } = createTestService(() =>
    Promise.resolve({ rows: [returnedRow] }),
  );

  await assert.rejects(
    () =>
      service.saveBmvSurvey(ctx, "c1", {
        intakeFormId: "intake-1",
        formData: {},
      }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.match(err.message, /already returned/);
      return true;
    },
  );
});

void test("saveBmvSurvey projects surveyData to document_items when provided", async () => {
  const baseRow = makeBaseCustomerRow();
  const { service, calls } = createTestService((sql, params) => {
    if (
      sql.includes("update intake_forms") ||
      sql.includes("update document_items")
    ) {
      return Promise.resolve({ rows: [{ id: "doc-1" }] });
    }
    if (sql.includes("update customers")) {
      const patch = parseBmvPatch(params);
      return Promise.resolve({
        rows: [
          {
            ...baseRow,
            base_profile: {
              name: "Alice",
              bmvProfile: { ...extractBmvProfile(baseRow), ...patch },
            },
          },
        ],
      });
    }
    return Promise.resolve({ rows: [baseRow] });
  });

  await service.saveBmvSurvey(ctx, "c1", {
    intakeFormId: "intake-1",
    formData: { companyInfo: {} },
    surveyData: { companyInfo: { name: "Test Corp" } },
  });

  const docUpdate = calls.find((c) => c.sql.includes("update document_items"));
  assert.ok(docUpdate, "should project survey_data to document_items");
  assert.ok(docUpdate.sql.includes("survey_data"));
});

// ── modifyBmvQuote ──

void test("modifyBmvQuote creates new intake_form and updates currentQuoteFormId", async () => {
  const timelineWrites: unknown[] = [];
  const baseRow = makeBaseCustomerRow({
    base_profile: {
      name: "Alice",
      bmvProfile: {
        questionnaireStatus: "returned",
        quoteStatus: "generated",
        signStatus: "pending",
        currentQuoteFormId: "old-quote-form",
      },
    },
  });
  const { service, calls } = createTestService(
    (sql, params) => {
      if (sql.includes("insert into intake_forms")) {
        return Promise.resolve({ rows: [{ id: "new-quote-form" }] });
      }
      if (sql.includes("update customers")) {
        const patch = parseBmvPatch(params);
        return Promise.resolve({
          rows: [
            {
              ...baseRow,
              base_profile: {
                name: "Alice",
                bmvProfile: { ...extractBmvProfile(baseRow), ...patch },
              },
            },
          ],
        });
      }
      return Promise.resolve({ rows: [baseRow] });
    },
    { timelineWrites },
  );

  const updated = await service.modifyBmvQuote(ctx, "c1", {
    appUserId: "app-user-1",
    formData: { amount: 600000, items: [] },
    amount: 600000,
    visaPlan: "new_3year",
  });

  const profile = readBmvProfile(updated.baseProfile);
  assert.equal(profile.currentQuoteFormId, "new-quote-form");
  assert.equal(profile.quoteAmount, 600000);
  assert.equal(profile.visaPlan, "new_3year");

  const insertCall = calls.find((c) =>
    c.sql.includes("insert into intake_forms"),
  );
  assert.ok(insertCall);
  assert.ok(insertCall.sql.includes("bmv_quote"));

  assert.equal(
    (timelineWrites[0] as { action: string }).action,
    "customer.bmv_quote_modified",
  );
  assert.equal(
    (timelineWrites[0] as { payload: { previousQuoteFormId: string } }).payload
      .previousQuoteFormId,
    "old-quote-form",
  );
});

void test("modifyBmvQuote rejects when already signed", async () => {
  const signedRow = makeSignedCustomerRow();
  const { service } = createTestService(() =>
    Promise.resolve({ rows: [signedRow] }),
  );

  await assert.rejects(
    () =>
      service.modifyBmvQuote(ctx, "c1", {
        appUserId: "app-user-1",
        formData: {},
      }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.match(err.message, /already signed/);
      return true;
    },
  );
});

void test("modifyBmvQuote rejects when questionnaire not started and quote not started", async () => {
  const freshRow = makeBaseCustomerRow({
    base_profile: {
      name: "Alice",
      bmvProfile: {
        questionnaireStatus: "not_started",
        quoteStatus: "not_started",
        signStatus: "not_started",
      },
    },
  });
  const { service } = createTestService(() =>
    Promise.resolve({ rows: [freshRow] }),
  );

  await assert.rejects(
    () =>
      service.modifyBmvQuote(ctx, "c1", {
        appUserId: "app-user-1",
        formData: {},
      }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.match(err.message, /Questionnaire must be sent/);
      return true;
    },
  );
});

// ── transitionBmvToCase ──

function transitionQueryFn(signedRow: Record<string, unknown>) {
  return (sql: string) => {
    if (sql.includes("from leads where"))
      return Promise.resolve({
        rows: [{ group_id: "grp-1", owner_user_id: "owner-lead-1" }],
      });
    if (sql.includes("from intake_forms where id"))
      return Promise.resolve({ rows: [{ form_data: { amount: 550000 } }] });
    if (sql.includes("from intake_forms") && sql.includes("bmv_questionnaire"))
      return Promise.resolve({
        rows: [{ form_data: { companyName: "Test" } }],
      });
    if (
      sql.includes("update conversations") ||
      sql.includes("update leads") ||
      sql.includes("update document_items") ||
      sql.includes("insert into residence_periods") ||
      sql.includes("insert into reminders")
    )
      return Promise.resolve({ rows: [] });
    return Promise.resolve({ rows: [signedRow] });
  };
}

void test("transitionBmvToCase creates case when signed with all gates passed", async () => {
  const timelineWrites: unknown[] = [];
  const signedRow = makeSignedCustomerRow();
  const createdCase = {
    id: "case-1",
    caseTypeCode: "business_manager_visa",
    status: "open",
    stage: "S1",
  };
  const { service } = createTestService(transitionQueryFn(signedRow), {
    timelineWrites,
    createCase: () => Promise.resolve(createdCase),
  });
  const result = await service.transitionBmvToCase(ctx, "c1", {
    ownerUserId: ctx.userId,
  });
  assert.equal(result.id, "case-1");
  assert.equal(
    (timelineWrites[0] as { action: string }).action,
    "customer.bmv_transitioned_to_case",
  );
});

void test("transitionBmvToCase rejects when not signed", async () => {
  const unsignedRow = makeBaseCustomerRow({
    base_profile: {
      name: "Alice",
      bmvProfile: {
        questionnaireStatus: "returned",
        quoteStatus: "generated",
        signStatus: "pending",
      },
    },
  });
  const { service } = createTestService(() =>
    Promise.resolve({ rows: [unsignedRow] }),
  );

  await assert.rejects(
    () => service.transitionBmvToCase(ctx, "c1"),
    (err) => {
      assert.ok(err instanceof Error);
      const response = (err as { response?: { code?: string } }).response;
      assert.equal(response?.code, "BMV_NOT_SIGNED");
      return true;
    },
  );
});

void test("transitionBmvToCase rejects when gate blockers exist (signed but questionnaire not returned)", async () => {
  const badStateRow = makeBaseCustomerRow({
    base_profile: {
      name: "Alice",
      bmvProfile: {
        questionnaireStatus: "sent",
        quoteStatus: "not_started",
        signStatus: "signed",
        signedAt: "2026-01-05T00:00:00.000Z",
      },
    },
  });
  const { service } = createTestService(() =>
    Promise.resolve({ rows: [badStateRow] }),
  );

  await assert.rejects(
    () => service.transitionBmvToCase(ctx, "c1"),
    (err) => {
      assert.ok(err instanceof Error);
      const response = (
        err as { response?: { code?: string; blockers?: unknown[] } }
      ).response;
      assert.ok(response, "Expected structured error response");
      assert.equal(response.code, "CASE_BMV_GATE_BLOCKED");
      assert.ok(response.blockers && response.blockers.length > 0);
      return true;
    },
  );
});

void test("transitionBmvToCase syncs conversation case_id when sourceLeadId exists", async () => {
  const signedRow = makeSignedCustomerRow();
  const { service, calls } = createTestService(transitionQueryFn(signedRow), {
    createCase: () =>
      Promise.resolve({ id: "case-1", caseTypeCode: "business_manager_visa" }),
  });
  await service.transitionBmvToCase(ctx, "c1");
  const convUpdate = calls.find((c) => c.sql.includes("update conversations"));
  assert.ok(convUpdate, "should update conversations with case_id");
  assert.ok(convUpdate.params?.includes("case-1"));
  assert.ok(convUpdate.params?.includes("lead-1"));
});
