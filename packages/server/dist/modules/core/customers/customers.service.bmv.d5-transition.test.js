import assert from "node:assert/strict";
import test from "node:test";
import { CustomersService } from "./customers.service";
const ctx = {
  orgId: "00000000-0000-4000-8000-000000000000",
  userId: "00000000-0000-4000-8000-000000000001",
  role: "staff",
};
function requireCapturedInput(input) {
  assert.ok(input);
  return input;
}
function makeBaseRow(overrides = {}) {
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
  return makeBaseRow({
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
function transitionQueryFn(signedRow) {
  return (sql) => {
    if (sql.includes("from leads where"))
      return Promise.resolve({
        rows: [{ group_id: "grp-1", owner_user_id: "owner-lead-1" }],
      });
    if (sql.includes("from intake_forms where id"))
      return Promise.resolve({
        rows: [{ form_data: { amount: 550000 } }],
      });
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
function createTestService(queryFn, options = {}) {
  const calls = [];
  const client = {
    query: (sql, params) => {
      calls.push({ sql: sql.trim(), params });
      return queryFn(sql, params);
    },
    release: () => undefined,
  };
  const pool = {
    connect: () => Promise.resolve(client),
  };
  const timelineWrites = options.timelineWrites ?? [];
  const casesService = {
    create: options.createCase ?? (() => Promise.resolve({})),
  };
  const service = new CustomersService(
    pool,
    {
      canAccessCustomer: () => true,
      canEditCustomer: () => true,
    },
    {
      write: (_ctx, input) => {
        timelineWrites.push(input);
        return Promise.resolve();
      },
    },
    casesService,
  );
  return { service, calls };
}
// ── D5: lead field inheritance ──
void test("transitionBmvToCase inherits group_id and owner_user_id from lead", async () => {
  const signedRow = makeSignedCustomerRow();
  let capturedInput = null;
  const { service } = createTestService(transitionQueryFn(signedRow), {
    createCase: (_ctx, input) => {
      capturedInput = input;
      return Promise.resolve({
        id: "case-1",
        caseTypeCode: "business_manager_visa",
      });
    },
  });
  await service.transitionBmvToCase(ctx, "c1");
  const transitionInput = requireCapturedInput(capturedInput);
  assert.equal(transitionInput.ownerUserId, "owner-lead-1");
  assert.equal(transitionInput.groupId, "grp-1");
});
void test("transitionBmvToCase allows input to override lead inheritance", async () => {
  const signedRow = makeSignedCustomerRow();
  let capturedInput = null;
  const { service } = createTestService(transitionQueryFn(signedRow), {
    createCase: (_ctx, input) => {
      capturedInput = input;
      return Promise.resolve({
        id: "case-1",
        caseTypeCode: "business_manager_visa",
      });
    },
  });
  await service.transitionBmvToCase(ctx, "c1", {
    ownerUserId: "override-owner",
    groupId: "override-group",
  });
  const transitionInput = requireCapturedInput(capturedInput);
  assert.equal(transitionInput.ownerUserId, "override-owner");
  assert.equal(transitionInput.groupId, "override-group");
});
void test("transitionBmvToCase falls back to ctx.userId when lead has no owner", async () => {
  const signedRow = makeSignedCustomerRow();
  let capturedInput = null;
  const { service } = createTestService(
    (sql) => {
      if (sql.includes("from leads where"))
        return Promise.resolve({
          rows: [{ group_id: null, owner_user_id: null }],
        });
      if (sql.includes("from intake_forms where id"))
        return Promise.resolve({ rows: [{ form_data: {} }] });
      if (
        sql.includes("from intake_forms") &&
        sql.includes("bmv_questionnaire")
      )
        return Promise.resolve({ rows: [] });
      if (
        sql.includes("update") ||
        sql.includes("insert into residence_periods") ||
        sql.includes("insert into reminders")
      )
        return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [signedRow] });
    },
    {
      createCase: (_ctx, input) => {
        capturedInput = input;
        return Promise.resolve({
          id: "case-1",
          caseTypeCode: "business_manager_visa",
        });
      },
    },
  );
  await service.transitionBmvToCase(ctx, "c1");
  const transitionInput = requireCapturedInput(capturedInput);
  assert.equal(transitionInput.ownerUserId, ctx.userId);
});
// ── D5: quote amount from intake form ──
void test("transitionBmvToCase uses quote amount from intake_forms form_data.amount", async () => {
  const signedRow = makeSignedCustomerRow();
  let capturedInput = null;
  const { service } = createTestService(transitionQueryFn(signedRow), {
    createCase: (_ctx, input) => {
      capturedInput = input;
      return Promise.resolve({
        id: "case-1",
        caseTypeCode: "business_manager_visa",
      });
    },
  });
  await service.transitionBmvToCase(ctx, "c1");
  const transitionInput = requireCapturedInput(capturedInput);
  assert.equal(transitionInput.quotePrice, 550000);
});
void test("transitionBmvToCase falls back to profile.quoteAmount when form has no amount", async () => {
  const signedRow = makeSignedCustomerRow();
  let capturedInput = null;
  const { service } = createTestService(
    (sql) => {
      if (sql.includes("from leads where"))
        return Promise.resolve({
          rows: [{ group_id: null, owner_user_id: null }],
        });
      if (sql.includes("from intake_forms where id"))
        return Promise.resolve({ rows: [{ form_data: { items: [] } }] });
      if (
        sql.includes("from intake_forms") &&
        sql.includes("bmv_questionnaire")
      )
        return Promise.resolve({ rows: [] });
      if (
        sql.includes("update") ||
        sql.includes("insert into residence_periods") ||
        sql.includes("insert into reminders")
      )
        return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [signedRow] });
    },
    {
      createCase: (_ctx, input) => {
        capturedInput = input;
        return Promise.resolve({
          id: "case-1",
          caseTypeCode: "business_manager_visa",
        });
      },
    },
  );
  await service.transitionBmvToCase(ctx, "c1");
  const transitionInput = requireCapturedInput(capturedInput);
  assert.equal(transitionInput.quotePrice, 500000);
});
// ── D5: survey data projection ──
void test("transitionBmvToCase projects survey data to document_items", async () => {
  const signedRow = makeSignedCustomerRow();
  const { service, calls } = createTestService(transitionQueryFn(signedRow), {
    createCase: () =>
      Promise.resolve({
        id: "case-1",
        caseTypeCode: "business_manager_visa",
      }),
  });
  await service.transitionBmvToCase(ctx, "c1");
  const docUpdate = calls.find(
    (c) =>
      c.sql.includes("update document_items") && c.sql.includes("survey_data"),
  );
  assert.ok(docUpdate, "should project survey_data to document_items");
});
// ── D5: ResidencePeriod placeholder ──
void test("transitionBmvToCase inserts residence_periods placeholder row", async () => {
  const signedRow = makeSignedCustomerRow();
  const { service, calls } = createTestService(transitionQueryFn(signedRow), {
    createCase: () =>
      Promise.resolve({
        id: "case-1",
        caseTypeCode: "business_manager_visa",
      }),
  });
  await service.transitionBmvToCase(ctx, "c1");
  const rpInsert = calls.find((c) =>
    c.sql.includes("insert into residence_periods"),
  );
  assert.ok(rpInsert, "should insert residence_periods placeholder");
  assert.ok(rpInsert.params?.includes("case-1"), "should use created case id");
  assert.ok(rpInsert.params?.includes("c1"), "should use customer id");
  assert.ok(rpInsert.params?.includes(ctx.orgId), "should use org id");
});
// ── D5: renewal reminder placeholders ──
void test("transitionBmvToCase schedules renewal reminder placeholders from blueprint", async () => {
  const signedRow = makeSignedCustomerRow();
  const { service, calls } = createTestService(transitionQueryFn(signedRow), {
    createCase: () =>
      Promise.resolve({
        id: "case-1",
        caseTypeCode: "business_manager_visa",
      }),
  });
  await service.transitionBmvToCase(ctx, "c1");
  const reminderInserts = calls.filter((c) =>
    c.sql.includes("insert into reminders"),
  );
  assert.equal(
    reminderInserts.length,
    3,
    "should insert 3 reminder placeholders (180/90/30 days)",
  );
  const dedupeKeys = reminderInserts.map((c) =>
    c.params?.find(
      (p) => typeof p === "string" && p.startsWith("bmv_renewal_"),
    ),
  );
  assert.ok(
    dedupeKeys.some((k) => typeof k === "string" && k.includes("180d")),
  );
  assert.ok(dedupeKeys.some((k) => typeof k === "string" && k.includes("90d")));
  assert.ok(dedupeKeys.some((k) => typeof k === "string" && k.includes("30d")));
});
// ── D5: lead.converted_case_id update ──
void test("transitionBmvToCase updates lead.converted_case_id", async () => {
  const signedRow = makeSignedCustomerRow();
  const { service, calls } = createTestService(transitionQueryFn(signedRow), {
    createCase: () =>
      Promise.resolve({
        id: "case-1",
        caseTypeCode: "business_manager_visa",
      }),
  });
  await service.transitionBmvToCase(ctx, "c1");
  const leadUpdate = calls.find(
    (c) =>
      c.sql.includes("update leads") && c.sql.includes("converted_case_id"),
  );
  assert.ok(leadUpdate, "should update leads with converted_case_id");
  assert.ok(leadUpdate.params?.includes("case-1"));
  assert.ok(leadUpdate.params?.includes("lead-1"));
});
// ── D5: timeline payload enrichment ──
void test("transitionBmvToCase timeline payload includes D5 enriched fields", async () => {
  const timelineWrites = [];
  const signedRow = makeSignedCustomerRow();
  const { service } = createTestService(transitionQueryFn(signedRow), {
    timelineWrites,
    createCase: () =>
      Promise.resolve({
        id: "case-1",
        caseTypeCode: "business_manager_visa",
      }),
  });
  await service.transitionBmvToCase(ctx, "c1");
  const event = timelineWrites[0];
  assert.equal(event.action, "customer.bmv_transitioned_to_case");
  assert.equal(event.payload.sourceLeadId, "lead-1");
  assert.equal(event.payload.groupId, "grp-1");
  assert.equal(event.payload.quotePrice, 550000);
  assert.equal(event.payload.hasSurveyData, true);
});
// ── getBmvAggregate ──
void test("getBmvAggregate returns profile with empty collections when no case exists", async () => {
  const baseRow = makeBaseRow();
  const { service } = createTestService((sql) => {
    if (sql.includes("case_type_code")) return Promise.resolve({ rows: [] });
    if (sql.includes("from intake_forms")) return Promise.resolve({ rows: [] });
    if (sql.includes("from reminders")) return Promise.resolve({ rows: [] });
    return Promise.resolve({ rows: [baseRow] });
  });
  const result = await service.getBmvAggregate(ctx, "c1");
  assert.equal(result.customerId, "c1");
  assert.ok(result.bmvProfile);
  assert.equal(result.bmvProfile.questionnaireStatus, "sent");
  assert.deepEqual(result.quoteHistory, []);
  assert.equal(result.currentCase, null);
  assert.deepEqual(result.reminders, []);
});
void test("getBmvAggregate returns case summary and reminders when case exists", async () => {
  const signedRow = makeSignedCustomerRow();
  const caseRow = {
    id: "case-1",
    stage: "S3",
    post_approval_stage: null,
    coe_issued_at: null,
    coe_expiry_date: null,
    coe_sent_at: null,
    status: "open",
  };
  const reminderRow = {
    id: "rem-1",
    remind_at: "2026-06-01T00:00:00.000Z",
    send_status: "pending",
    channel: "in_app",
  };
  const quoteRow = {
    id: "quote-form-1",
    form_data: { amount: 500000 },
    status: "draft",
    created_at: "2026-01-03T00:00:00.000Z",
  };
  const { service } = createTestService((sql) => {
    if (sql.includes("case_type_code"))
      return Promise.resolve({ rows: [caseRow] });
    if (sql.includes("from reminders"))
      return Promise.resolve({ rows: [reminderRow] });
    if (sql.includes("from intake_forms"))
      return Promise.resolve({ rows: [quoteRow] });
    return Promise.resolve({ rows: [signedRow] });
  });
  const result = await service.getBmvAggregate(ctx, "c1");
  assert.ok(result.currentCase);
  assert.equal(result.currentCase.id, "case-1");
  assert.equal(result.currentCase.stage, "S3");
  assert.equal(result.reminders.length, 1);
  assert.equal(result.reminders[0].id, "rem-1");
  assert.equal(result.quoteHistory.length, 1);
  assert.equal(result.quoteHistory[0].id, "quote-form-1");
});
void test("getBmvAggregate throws when customer not found", async () => {
  const { service } = createTestService(() => Promise.resolve({ rows: [] }));
  await assert.rejects(
    () => service.getBmvAggregate(ctx, "nonexistent"),
    (err) => {
      assert.ok(err instanceof Error);
      assert.match(err.message, /not found/);
      return true;
    },
  );
});
//# sourceMappingURL=customers.service.bmv.d5-transition.test.js.map
