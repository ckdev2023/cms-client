/* eslint-disable max-lines */
/**
 * P1 回归矩阵 — 第三批：提醒失败、自动提醒与結案収敛
 *
 * §18 提醒失敗阻断 — reminderCreated=false 在 S8→S9 transition 被 blocking
 * §19 自動提醒链路 — blueprint resolution → 180/90/30 生成 → dedupeKey 唯一性
 * §20 結案収敛 — 成功/失败全部 5 条路径均可到达 S9，且互不干扰
 *
 * 権威来源：
 *   - P1/01 §3 M8（在留期間・自動提醒・結案収敛）
 *   - P1/03 requirement_summary（所有路径最终必须収敛到 CLOSED_SUCCESS 或 CLOSED_FAILED）
 *   - cases.types-residence-closeout.ts（成功結案前置条件）
 *   - cases.types-failure-closeout.ts（失敗結案帰因）
 *   - bmvTemplateConfig.ts（BMV_REMINDER_SCHEDULE_BLUEPRINT）
 *   - reminderBlueprintContract.ts（resolveReminderPlans / DEFAULT_REMINDER_SCHEDULE）
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";

import { CasesService } from "./cases.service";
import { CASE_WRITE_ERROR_CODES } from "./cases.types";
import {
  SUCCESS_CLOSEOUT_PRECONDITION_CODES,
  checkSuccessCloseoutPreconditions,
  requiresSuccessCloseoutCheck,
} from "./cases.types-residence-closeout";
import type {
  CaseResidencePeriodSummary,
  SuccessCloseoutCheckInput,
  SuccessCloseoutCheckResult,
} from "./cases.types-residence-closeout";
import {
  FAILURE_CLOSEOUT_REASON_CODES,
  FAILURE_OUTCOME_SET,
  resolveFailureAttribution,
  checkFailureCloseout,
  canBypassSuccessCloseoutForFailure,
} from "./cases.types-failure-closeout";
import {
  BMV_REMINDER_SCHEDULE_BLUEPRINT,
  BMV_CASE_TYPE_CODE,
} from "./bmvTemplateConfig";
import {
  DEFAULT_REMINDER_SCHEDULE,
  resolveReminderPlans,
} from "../residence-periods/reminderBlueprintContract";
import type { Case } from "../model/coreEntities";
import type { RequestContext } from "../tenancy/requestContext";

// ── shared helpers (aligned with cases.regression-p1-*.test.ts) ──

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const CASE_ID = "case-regression-3";

type QueryFn = (
  sql: string,
  params?: unknown[],
) => Promise<{ rows: unknown[]; rowCount: number }>;
const ok = (rows: unknown[] = [], rowCount = rows.length) =>
  Promise.resolve({ rows, rowCount });
const isTxSql = (s: string) =>
  /^(begin|commit|rollback|select set_config)/.test(s.trim().toLowerCase());

function makePool(qf: QueryFn) {
  return {
    connect: () =>
      Promise.resolve({
        query: (s: string, p?: unknown[]) => (isTxSql(s) ? ok() : qf(s, p)),
        release: () => undefined,
      }),
  };
}

function makeTemplates() {
  return {
    service: {
      resolve: () => Promise.resolve({ mode: "legacy", used: false }),
    },
  };
}

function svc(pool: ReturnType<typeof makePool>, tpl?: { service: unknown }) {
  return new CasesService(
    pool as unknown as Pool,
    (tpl ?? makeTemplates()).service as never,
  );
}

function makeCtx(
  role: "staff" | "viewer" | "manager" = "staff",
): RequestContext {
  return { orgId: ORG_ID, userId: USER_ID, role };
}

function makeCaseRow(overrides: Record<string, unknown> = {}) {
  const row: Record<string, unknown> = {
    id: CASE_ID,
    org_id: ORG_ID,
    customer_id: "cust-1",
    case_type_code: BMV_CASE_TYPE_CODE,
    status: "S8",
    stage: "S8",
    group_id: null,
    owner_user_id: USER_ID,
    opened_at: "2026-01-01T00:00:00.000Z",
    due_at: null,
    metadata: {},
    case_no: null,
    case_name: null,
    case_subtype: null,
    application_type: null,
    application_flow_type: null,
    visa_plan: null,
    post_approval_stage: null,
    coe_issued_at: null,
    coe_expiry_date: null,
    coe_sent_at: null,
    close_reason: null,
    supplement_count: 0,
    company_id: null,
    priority: "normal",
    risk_level: "low",
    assistant_user_id: null,
    source_channel: null,
    signed_at: null,
    accepted_at: null,
    submission_date: null,
    result_date: null,
    residence_expiry_date: null,
    archived_at: null,
    result_outcome: null,
    quote_price: null,
    deposit_paid_cached: false,
    final_payment_paid_cached: false,
    billing_unpaid_amount_cached: "0",
    billing_risk_acknowledged_by: null,
    billing_risk_acknowledged_at: null,
    billing_risk_ack_reason_code: null,
    billing_risk_ack_reason_note: null,
    billing_risk_ack_evidence_url: null,
    overseas_visa_start_at: null,
    entry_confirmed_at: "2026-03-15T00:00:00.000Z",
    current_workflow_step_code: "ENTRY_SUCCESS",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
  if (typeof overrides.status === "string" && overrides.stage === undefined)
    row.stage = overrides.status;
  if (typeof overrides.stage === "string" && overrides.status === undefined)
    row.status = overrides.stage;
  return row;
}

const RESIDENCE_PERIOD_ROW = {
  id: "rp-001",
  org_id: ORG_ID,
  case_id: CASE_ID,
  customer_id: "cust-1",
  visa_type: "business_manager",
  status_of_residence: "経営・管理",
  period_years: 1,
  period_label: "1年",
  valid_from: "2026-04-01",
  valid_until: "2027-04-01",
  card_number: "AB1234567CD",
  is_current: true,
  entry_date: "2026-03-15",
  reminder_created: true,
  notes: null,
  created_by: USER_ID,
  created_at: "2026-04-01T00:00:00.000Z",
  updated_at: "2026-04-01T00:00:00.000Z",
};

function makeCase(overrides: Partial<Case> = {}): Case {
  return {
    id: CASE_ID,
    orgId: ORG_ID,
    customerId: "cust-1",
    caseTypeCode: BMV_CASE_TYPE_CODE,
    status: "S8",
    stage: "S8",
    groupId: null,
    ownerUserId: USER_ID,
    openedAt: "2026-01-01T00:00:00.000Z",
    dueAt: null,
    metadata: {},
    caseNo: null,
    caseName: null,
    caseSubtype: null,
    applicationType: null,
    applicationFlowType: null,
    visaPlan: null,
    postApprovalStage: null,
    coeIssuedAt: null,
    coeExpiryDate: null,
    coeSentAt: null,
    closeReason: null,
    supplementCount: 0,
    companyId: null,
    priority: "normal",
    riskLevel: "low",
    assistantUserId: null,
    sourceChannel: null,
    signedAt: null,
    acceptedAt: null,
    submissionDate: null,
    resultDate: null,
    residenceExpiryDate: null,
    archivedAt: null,
    resultOutcome: null,
    quotePrice: null,
    depositPaidCached: false,
    finalPaymentPaidCached: false,
    billingUnpaidAmountCached: 0,
    billingRiskAcknowledgedBy: null,
    billingRiskAcknowledgedAt: null,
    billingRiskAckReasonCode: null,
    billingRiskAckReasonNote: null,
    billingRiskAckEvidenceUrl: null,
    overseasVisaStartAt: null,
    entryConfirmedAt: "2026-03-15T00:00:00.000Z",
    businessPhase: "SUCCESS",
    currentWorkflowStepCode: "ENTRY_SUCCESS",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const FULL_SUMMARY: CaseResidencePeriodSummary = {
  id: "rp-001",
  visaType: "business_manager",
  statusOfResidence: "経営・管理",
  periodYears: 1,
  periodLabel: "1年",
  validFrom: "2026-04-01",
  validUntil: "2027-04-01",
  cardNumber: "AB1234567CD",
  entryDate: "2026-03-15",
  reminderCreated: true,
};

function bmvS8TransitionPool(
  caseOverrides: Record<string, unknown> = {},
  residencePeriodRow: Record<string, unknown> | null = RESIDENCE_PERIOD_ROW,
) {
  return makePool((sql, p) => {
    if (sql.includes("update cases") && sql.includes("stage = $2"))
      return ok([makeCaseRow({ ...caseOverrides, status: "S9", stage: "S9" })]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow(caseOverrides)]);
    if (sql.includes("from residence_periods") && sql.includes("is_current")) {
      return residencePeriodRow ? ok([residencePeriodRow]) : ok([]);
    }
    return ok();
  });
}

function detailAggregatePool(
  caseOverrides: Record<string, unknown> = {},
  residencePeriodRow: Record<string, unknown> | null = RESIDENCE_PERIOD_ROW,
) {
  const summaryRow = {
    ...makeCaseRow(caseOverrides),
    customer_name: "Test Customer",
    group_name: null,
    owner_display_name: "Owner",
    assistant_display_name: null,
  };
  return makePool((sql) => {
    if (sql.includes("customer_name")) return ok([summaryRow]);
    if (sql.includes("document_items_total"))
      return ok([
        {
          document_items_total: "0",
          document_items_done: "0",
          case_parties: "0",
          tasks: "0",
          tasks_pending: "0",
          communication_logs: "0",
          submission_packages: "0",
          generated_documents: "0",
          validation_runs: "0",
          review_records: "0",
          billing_records: "0",
          payment_records: "0",
        },
      ]);
    if (sql.includes("from residence_periods") && sql.includes("is_current")) {
      return residencePeriodRow ? ok([residencePeriodRow]) : ok([]);
    }
    return ok([]);
  });
}

// ═══════════════════════════════════════════════════════════════
// §18 提醒失敗阻断 — reminderCreated=false blocks S8→S9
// ═══════════════════════════════════════════════════════════════

void describe("§18 reminder failure blocks success closeout: transition gate", () => {
  void test("S8→S9 blocked when period exists but reminderCreated=false", async () => {
    const pool = bmvS8TransitionPool(
      { entry_confirmed_at: "2026-03-15T00:00:00.000Z" },
      { ...RESIDENCE_PERIOD_ROW, reminder_created: false },
    );
    await assert.rejects(
      () => svc(pool).transition(makeCtx(), CASE_ID, { toStage: "S9" }),
      (err) => {
        assert.ok(err instanceof Error);
        assert.ok(
          err.message.includes(CASE_WRITE_ERROR_CODES.SUCCESS_CLOSEOUT_BLOCKED),
          `Expected ${CASE_WRITE_ERROR_CODES.SUCCESS_CLOSEOUT_BLOCKED}, got: ${err.message}`,
        );
        assert.ok(
          err.message.includes("RENEWAL_REMINDER_SCHEDULED"),
          `Expected RENEWAL_REMINDER_SCHEDULED in error, got: ${err.message}`,
        );
        return true;
      },
    );
  });

  void test("S8→S9 blocked error only mentions unsatisfied precondition (not satisfied ones)", async () => {
    const pool = bmvS8TransitionPool(
      { entry_confirmed_at: "2026-03-15T00:00:00.000Z" },
      { ...RESIDENCE_PERIOD_ROW, reminder_created: false },
    );
    await assert.rejects(
      () => svc(pool).transition(makeCtx(), CASE_ID, { toStage: "S9" }),
      (err) => {
        assert.ok(err instanceof Error);
        assert.ok(
          !err.message.includes("ENTRY_CONFIRMED("),
          "Satisfied ENTRY_CONFIRMED should NOT appear in error",
        );
        assert.ok(
          !err.message.includes("RESIDENCE_PERIOD_RECORDED("),
          "Satisfied RESIDENCE_PERIOD_RECORDED should NOT appear in error",
        );
        return true;
      },
    );
  });

  void test("S8→S9 succeeds when all three preconditions are met (reminder created)", async () => {
    const pool = bmvS8TransitionPool(
      { entry_confirmed_at: "2026-03-15T00:00:00.000Z" },
      RESIDENCE_PERIOD_ROW,
    );
    const result = await svc(pool).transition(makeCtx(), CASE_ID, {
      toStage: "S9",
    });
    assert.equal(result.stage, "S9");
  });
});

void describe("§18 reminder failure blocks success closeout: pure function check", () => {
  void test("checkSuccessCloseoutPreconditions: reminderCreated=false → RENEWAL_REMINDER_SCHEDULED unsatisfied", () => {
    const input: SuccessCloseoutCheckInput = {
      caseEntity: makeCase({ entryConfirmedAt: "2026-03-15T00:00:00.000Z" }),
      currentResidencePeriod: { ...FULL_SUMMARY, reminderCreated: false },
    };
    const result = checkSuccessCloseoutPreconditions(input);
    assert.equal(result.allSatisfied, false);

    const satisfied = Object.fromEntries(
      result.preconditions.map((p) => [p.code, p.satisfied]),
    );
    assert.equal(satisfied.ENTRY_CONFIRMED, true);
    assert.equal(satisfied.RESIDENCE_PERIOD_RECORDED, true);
    assert.equal(satisfied.RENEWAL_REMINDER_SCHEDULED, false);
  });

  void test("checkSuccessCloseoutPreconditions: reminderCreated=true → all satisfied", () => {
    const input: SuccessCloseoutCheckInput = {
      caseEntity: makeCase({ entryConfirmedAt: "2026-03-15T00:00:00.000Z" }),
      currentResidencePeriod: FULL_SUMMARY,
    };
    const result = checkSuccessCloseoutPreconditions(input);
    assert.equal(result.allSatisfied, true);
  });

  void test("no period at all → both RESIDENCE_PERIOD_RECORDED and RENEWAL_REMINDER_SCHEDULED fail", () => {
    const input: SuccessCloseoutCheckInput = {
      caseEntity: makeCase({ entryConfirmedAt: "2026-03-15T00:00:00.000Z" }),
      currentResidencePeriod: null,
    };
    const result = checkSuccessCloseoutPreconditions(input);
    assert.equal(result.allSatisfied, false);

    const unsatisfied = result.preconditions
      .filter((p) => !p.satisfied)
      .map((p) => p.code);
    assert.deepEqual(unsatisfied, [
      SUCCESS_CLOSEOUT_PRECONDITION_CODES.RESIDENCE_PERIOD_RECORDED,
      SUCCESS_CLOSEOUT_PRECONDITION_CODES.RENEWAL_REMINDER_SCHEDULED,
    ]);
  });

  void test("all three unsatisfied when entry not confirmed and no period", () => {
    const input: SuccessCloseoutCheckInput = {
      caseEntity: makeCase({ entryConfirmedAt: null }),
      currentResidencePeriod: null,
    };
    const result = checkSuccessCloseoutPreconditions(input);
    assert.equal(result.allSatisfied, false);
    assert.equal(result.preconditions.filter((p) => !p.satisfied).length, 3);
  });
});

void describe("§18 reminder failure blocks: detail aggregate read model", () => {
  void test("getDetailAggregate with reminderCreated=false shows unsatisfied gate", async () => {
    const pool = detailAggregatePool(
      { entry_confirmed_at: "2026-03-15T00:00:00.000Z" },
      { ...RESIDENCE_PERIOD_ROW, reminder_created: false },
    );
    const agg = await svc(pool).getDetailAggregate(makeCtx(), CASE_ID);
    assert.ok(agg);
    const check = (agg as Record<string, unknown>)
      .successCloseoutCheck as SuccessCloseoutCheckResult | null;
    assert.ok(check);
    assert.equal(check.allSatisfied, false);

    const reminderGate = check.preconditions.find(
      (p) => p.code === "RENEWAL_REMINDER_SCHEDULED",
    );
    assert.ok(reminderGate);
    assert.equal(reminderGate.satisfied, false);
  });

  void test("getDetailAggregate with reminderCreated=true shows all satisfied", async () => {
    const pool = detailAggregatePool(
      { entry_confirmed_at: "2026-03-15T00:00:00.000Z" },
      RESIDENCE_PERIOD_ROW,
    );
    const agg = await svc(pool).getDetailAggregate(makeCtx(), CASE_ID);
    assert.ok(agg);
    const check = (agg as Record<string, unknown>)
      .successCloseoutCheck as SuccessCloseoutCheckResult | null;
    assert.ok(check);
    assert.equal(check.allSatisfied, true);
  });

  void test("getDetailAggregate: currentResidencePeriod reflects reminderCreated flag", async () => {
    const pool = detailAggregatePool(
      { entry_confirmed_at: "2026-03-15T00:00:00.000Z" },
      { ...RESIDENCE_PERIOD_ROW, reminder_created: false },
    );
    const agg = await svc(pool).getDetailAggregate(makeCtx(), CASE_ID);
    assert.ok(agg);
    const rp = (agg as Record<string, unknown>)
      .currentResidencePeriod as CaseResidencePeriodSummary | null;
    assert.ok(rp);
    assert.equal(rp.reminderCreated, false);
  });
});

// ═══════════════════════════════════════════════════════════════
// §19 自動提醒链路 — blueprint → 180/90/30 生成
// ═══════════════════════════════════════════════════════════════

void describe("§19 auto-reminder: BMV blueprint produces 180/90/30 schedule", () => {
  void test("BMV_REMINDER_SCHEDULE_BLUEPRINT has exactly 3 entries", () => {
    assert.equal(BMV_REMINDER_SCHEDULE_BLUEPRINT.length, 3);
  });

  void test("BMV blueprint daysBefore offsets are 180, 90, 30", () => {
    const offsets = BMV_REMINDER_SCHEDULE_BLUEPRINT.map((i) => i.daysBefore);
    assert.deepEqual(offsets, [180, 90, 30]);
  });

  void test("BMV blueprint aligns with DEFAULT_REMINDER_SCHEDULE offsets", () => {
    assert.deepEqual(
      BMV_REMINDER_SCHEDULE_BLUEPRINT.map((i) => i.daysBefore),
      DEFAULT_REMINDER_SCHEDULE.map((i) => i.daysBefore),
    );
  });

  void test("all BMV blueprint entries target owner recipient", () => {
    for (const item of BMV_REMINDER_SCHEDULE_BLUEPRINT) {
      assert.equal(item.recipientType, "owner");
    }
  });

  void test("all BMV blueprint entries use in_app channel", () => {
    for (const item of BMV_REMINDER_SCHEDULE_BLUEPRINT) {
      assert.equal(item.channel, "in_app");
    }
  });

  void test("all BMV blueprint entries have non-empty labels", () => {
    for (const item of BMV_REMINDER_SCHEDULE_BLUEPRINT) {
      assert.ok(item.label.length > 0, `label must be non-empty`);
    }
  });
});

void describe("§19 auto-reminder: resolveReminderPlans date computation", () => {
  void test("180/90/30 day plans computed correctly from validUntil=2027-04-01", () => {
    const plans = resolveReminderPlans(
      DEFAULT_REMINDER_SCHEDULE,
      "rp-test",
      "2027-04-01",
    );
    assert.equal(plans.length, 3);

    const baseMs = Date.UTC(2027, 3, 1, 0, 0, 0, 0);
    for (const plan of plans) {
      const expectedMs = baseMs - plan.daysBefore * 24 * 60 * 60 * 1000;
      assert.equal(
        plan.remindAt,
        new Date(expectedMs).toISOString(),
        `daysBefore=${String(plan.daysBefore)}`,
      );
    }
  });

  void test("180-day reminder for 2027-01-01 falls in July 2026", () => {
    const plans = resolveReminderPlans(
      DEFAULT_REMINDER_SCHEDULE,
      "rp-test",
      "2027-01-01",
    );
    const r180 = plans.find((p) => p.daysBefore === 180);
    assert.ok(r180);
    const d = new Date(r180.remindAt);
    assert.equal(d.getUTCFullYear(), 2026);
    assert.equal(d.getUTCMonth(), 6);
  });

  void test("30-day reminder is closest to expiry date", () => {
    const plans = resolveReminderPlans(
      DEFAULT_REMINDER_SCHEDULE,
      "rp-test",
      "2027-06-15",
    );
    const r30 = plans.find((p) => p.daysBefore === 30);
    const r90 = plans.find((p) => p.daysBefore === 90);
    assert.ok(r30 && r90);
    assert.ok(
      new Date(r30.remindAt) > new Date(r90.remindAt),
      "30-day reminder must fire after 90-day reminder",
    );
  });

  void test("chronological order: 180-day fires first, then 90, then 30", () => {
    const plans = resolveReminderPlans(
      DEFAULT_REMINDER_SCHEDULE,
      "rp-test",
      "2027-12-31",
    );
    const sorted = [...plans].sort(
      (a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime(),
    );
    assert.equal(sorted[0]?.daysBefore, 180);
    assert.equal(sorted[1]?.daysBefore, 90);
    assert.equal(sorted[2]?.daysBefore, 30);
  });
});

void describe("§19 auto-reminder: dedupeKey uniqueness", () => {
  void test("each plan has unique dedupeKey for same period", () => {
    const plans = resolveReminderPlans(
      DEFAULT_REMINDER_SCHEDULE,
      "rp-abc",
      "2027-04-01",
    );
    const keys = plans.map((p) => p.dedupeKey);
    assert.equal(new Set(keys).size, keys.length);
  });

  void test("different periods produce different dedupeKeys", () => {
    const plansA = resolveReminderPlans(
      DEFAULT_REMINDER_SCHEDULE,
      "rp-aaa",
      "2027-04-01",
    );
    const plansB = resolveReminderPlans(
      DEFAULT_REMINDER_SCHEDULE,
      "rp-bbb",
      "2027-04-01",
    );
    for (let i = 0; i < plansA.length; i++) {
      assert.notEqual(plansA[i]?.dedupeKey, plansB[i]?.dedupeKey);
    }
  });

  void test("dedupeKey contains daysBefore for traceability", () => {
    const plans = resolveReminderPlans(
      DEFAULT_REMINDER_SCHEDULE,
      "rp-xyz",
      "2027-04-01",
    );
    for (const plan of plans) {
      assert.ok(
        plan.dedupeKey.includes(`:${String(plan.daysBefore)}`),
        `dedupeKey should contain :${String(plan.daysBefore)}`,
      );
    }
  });

  void test("dedupeKey contains periodId for traceability", () => {
    const plans = resolveReminderPlans(
      DEFAULT_REMINDER_SCHEDULE,
      "rp-xyz",
      "2027-04-01",
    );
    for (const plan of plans) {
      assert.ok(
        plan.dedupeKey.includes("rp-xyz"),
        "dedupeKey should contain periodId",
      );
    }
  });
});

void describe("§19 auto-reminder: custom blueprint override", () => {
  void test("custom 1-item blueprint produces exactly 1 reminder plan", () => {
    const custom = [
      {
        daysBefore: 365,
        channel: "in_app",
        recipientType: "owner",
        label: "1年前",
      },
    ];
    const plans = resolveReminderPlans(custom, "rp-custom", "2028-01-01");
    assert.equal(plans.length, 1);
    assert.equal(plans[0]?.daysBefore, 365);
  });

  void test("BMV blueprint and DEFAULT schedule produce identical remindAt for same validUntil", () => {
    const bmv = resolveReminderPlans(
      BMV_REMINDER_SCHEDULE_BLUEPRINT,
      "same-id",
      "2027-12-31",
    );
    const def = resolveReminderPlans(
      DEFAULT_REMINDER_SCHEDULE,
      "same-id",
      "2027-12-31",
    );
    assert.equal(bmv.length, def.length);
    for (let i = 0; i < bmv.length; i++) {
      assert.equal(bmv[i]?.remindAt, def[i]?.remindAt);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// §20 結案収敛 — 5 条路径全部可到达 S9
// ═══════════════════════════════════════════════════════════════

void describe("§20 closeout convergence: success path via service transition", () => {
  void test("S8→S9 success path: all preconditions met → stage=S9", async () => {
    const pool = bmvS8TransitionPool(
      { entry_confirmed_at: "2026-03-15T00:00:00.000Z" },
      RESIDENCE_PERIOD_ROW,
    );
    const result = await svc(pool).transition(makeCtx(), CASE_ID, {
      toStage: "S9",
    });
    assert.equal(result.stage, "S9");
  });

  void test("requiresSuccessCloseoutCheck scoping: only BMV at S8", () => {
    assert.equal(requiresSuccessCloseoutCheck(makeCase()), true);
    assert.equal(
      requiresSuccessCloseoutCheck(makeCase({ caseTypeCode: "family_stay" })),
      false,
    );
    assert.equal(
      requiresSuccessCloseoutCheck(makeCase({ stage: "S7", status: "S7" })),
      false,
    );
    assert.equal(
      requiresSuccessCloseoutCheck(makeCase({ stage: "S9", status: "S9" })),
      false,
    );
  });
});

void describe("§20 closeout convergence: failure path — resultOutcome bypass", () => {
  const FAILURE_OUTCOMES = ["rejected", "visa_rejected", "withdrawn"] as const;

  for (const outcome of FAILURE_OUTCOMES) {
    void test(`resultOutcome=${outcome} bypasses success gate (no preconditions needed)`, async () => {
      const pool = bmvS8TransitionPool(
        { entry_confirmed_at: null, result_outcome: outcome },
        null,
      );
      const result = await svc(pool).transition(makeCtx(), CASE_ID, {
        toStage: "S9",
      });
      assert.equal(result.stage, "S9");
    });
  }

  void test("all 3 failure outcomes are in FAILURE_OUTCOME_SET", () => {
    for (const outcome of FAILURE_OUTCOMES) {
      assert.ok(FAILURE_OUTCOME_SET.has(outcome));
    }
    assert.equal(FAILURE_OUTCOME_SET.size, 3);
  });
});

void describe("§20 closeout convergence: failure path — MANUAL_FAILURE_CLOSE via closeReason", () => {
  void test("closeReason present allows S8→S9 without preconditions", async () => {
    const pool = bmvS8TransitionPool(
      {
        entry_confirmed_at: null,
        result_outcome: null,
        close_reason: "client_request",
      },
      null,
    );
    const result = await svc(pool).transition(makeCtx(), CASE_ID, {
      toStage: "S9",
      closeReason: "client_request",
    });
    assert.equal(result.stage, "S9");
  });

  void test("canBypassSuccessCloseoutForFailure with closeReason → true", () => {
    assert.equal(
      canBypassSuccessCloseoutForFailure(makeCase(), "client_request"),
      true,
    );
  });

  void test("canBypassSuccessCloseoutForFailure with empty closeReason → false", () => {
    assert.equal(canBypassSuccessCloseoutForFailure(makeCase(), "  "), false);
  });
});

void describe("§20 closeout convergence: non-failure non-bypass → blocked", () => {
  void test("resultOutcome=approved still enforces success gate", async () => {
    const pool = bmvS8TransitionPool(
      { entry_confirmed_at: null, result_outcome: "approved" },
      null,
    );
    await assert.rejects(
      () => svc(pool).transition(makeCtx(), CASE_ID, { toStage: "S9" }),
      (err) => {
        assert.ok(err instanceof Error);
        assert.ok(
          err.message.includes(CASE_WRITE_ERROR_CODES.SUCCESS_CLOSEOUT_BLOCKED),
        );
        return true;
      },
    );
  });

  void test("resultOutcome=null without closeReason enforces success gate", async () => {
    const pool = bmvS8TransitionPool(
      { entry_confirmed_at: null, result_outcome: null },
      null,
    );
    await assert.rejects(
      () => svc(pool).transition(makeCtx(), CASE_ID, { toStage: "S9" }),
      (err) => {
        assert.ok(err instanceof Error);
        assert.ok(
          err.message.includes(CASE_WRITE_ERROR_CODES.SUCCESS_CLOSEOUT_BLOCKED),
        );
        return true;
      },
    );
  });
});

void describe("§20 closeout convergence: failure attribution resolution (pure)", () => {
  void test("resolveFailureAttribution priority: step > resultOutcome > closeReason", () => {
    const stepWins = resolveFailureAttribution({
      caseEntity: makeCase({
        currentWorkflowStepCode: "VISA_REJECTED",
        resultOutcome: "rejected",
      }),
    });
    assert.ok(stepWins);
    assert.equal(
      stepWins.reasonCode,
      FAILURE_CLOSEOUT_REASON_CODES.VISA_REJECTED,
    );

    const outcomeWins = resolveFailureAttribution({
      caseEntity: makeCase({ resultOutcome: "withdrawn" }),
      closeReason: "some reason",
    });
    assert.ok(outcomeWins);
    assert.equal(
      outcomeWins.reasonCode,
      FAILURE_CLOSEOUT_REASON_CODES.CLIENT_WITHDRAWN,
    );

    const closeReasonFallback = resolveFailureAttribution({
      caseEntity: makeCase({ resultOutcome: null }),
      closeReason: "manual close reason",
    });
    assert.ok(closeReasonFallback);
    assert.equal(
      closeReasonFallback.reasonCode,
      FAILURE_CLOSEOUT_REASON_CODES.MANUAL_FAILURE_CLOSE,
    );
  });

  void test("all 4 failure reason codes are represented", () => {
    assert.equal(Object.keys(FAILURE_CLOSEOUT_REASON_CODES).length, 4);
    assert.equal(FAILURE_CLOSEOUT_REASON_CODES.VISA_REJECTED, "VISA_REJECTED");
    assert.equal(
      FAILURE_CLOSEOUT_REASON_CODES.APPLICATION_REJECTED,
      "APPLICATION_REJECTED",
    );
    assert.equal(
      FAILURE_CLOSEOUT_REASON_CODES.CLIENT_WITHDRAWN,
      "CLIENT_WITHDRAWN",
    );
    assert.equal(
      FAILURE_CLOSEOUT_REASON_CODES.MANUAL_FAILURE_CLOSE,
      "MANUAL_FAILURE_CLOSE",
    );
  });

  void test("no failure signal → null attribution (indeterminate, requires action)", () => {
    const result = resolveFailureAttribution({
      caseEntity: makeCase({
        resultOutcome: null,
        currentWorkflowStepCode: "ENTRY_SUCCESS",
      }),
    });
    assert.equal(result, null);
  });
});

void describe("§20 closeout convergence: checkFailureCloseout read model", () => {
  void test("VISA_REJECTED step at S7 detected as failure path", () => {
    const result = checkFailureCloseout(
      makeCase({
        stage: "S7",
        status: "S7",
        currentWorkflowStepCode: "VISA_REJECTED",
      }),
    );
    assert.equal(result.isFailurePath, true);
    assert.ok(result.attribution);
    assert.equal(
      result.attribution.reasonCode,
      FAILURE_CLOSEOUT_REASON_CODES.VISA_REJECTED,
    );
  });

  void test("resultOutcome=rejected at S5 detected as failure path", () => {
    const result = checkFailureCloseout(
      makeCase({ stage: "S5", status: "S5", resultOutcome: "rejected" }),
    );
    assert.equal(result.isFailurePath, true);
    assert.ok(result.attribution);
    assert.equal(
      result.attribution.reasonCode,
      FAILURE_CLOSEOUT_REASON_CODES.APPLICATION_REJECTED,
    );
  });

  void test("resultOutcome=withdrawn at S3 detected as failure path", () => {
    const result = checkFailureCloseout(
      makeCase({ stage: "S3", status: "S3", resultOutcome: "withdrawn" }),
    );
    assert.equal(result.isFailurePath, true);
    assert.ok(result.attribution);
    assert.equal(
      result.attribution.reasonCode,
      FAILURE_CLOSEOUT_REASON_CODES.CLIENT_WITHDRAWN,
    );
  });

  void test("normal ENTRY_SUCCESS at S8 is NOT a failure path", () => {
    const result = checkFailureCloseout(makeCase());
    assert.equal(result.isFailurePath, false);
    assert.equal(result.attribution, null);
  });

  void test("non-BMV case is never a failure path", () => {
    const result = checkFailureCloseout(
      makeCase({ caseTypeCode: "family_stay", resultOutcome: "rejected" }),
    );
    assert.equal(result.isFailurePath, false);
  });

  void test("S9 case is not a failure path (already closed)", () => {
    const result = checkFailureCloseout(
      makeCase({ stage: "S9", status: "S9", resultOutcome: "rejected" }),
    );
    assert.equal(result.isFailurePath, false);
  });
});

void describe("§20 closeout convergence: non-BMV cases bypass gate entirely", () => {
  void test("non-BMV S8→S9 succeeds without any preconditions", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("update cases") && sql.includes("stage = $2"))
        return ok([
          makeCaseRow({
            case_type_code: "family_stay",
            status: "S9",
            stage: "S9",
          }),
        ]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([
          makeCaseRow({
            case_type_code: "family_stay",
            entry_confirmed_at: null,
          }),
        ]);
      return ok();
    });
    const result = await svc(pool).transition(makeCtx(), CASE_ID, {
      toStage: "S9",
    });
    assert.equal(result.stage, "S9");
  });
});

// ═══════════════════════════════════════════════════════════════
// §20 補足：結案路径 exhaustive coverage matrix
// ═══════════════════════════════════════════════════════════════

void describe("§20 closeout path exhaustive: 5 distinct S9 paths", () => {
  void test("path 1 — SUCCESS: entry + period + reminder → S9 (success)", async () => {
    const pool = bmvS8TransitionPool(
      { entry_confirmed_at: "2026-03-15T00:00:00.000Z", result_outcome: null },
      RESIDENCE_PERIOD_ROW,
    );
    const result = await svc(pool).transition(makeCtx(), CASE_ID, {
      toStage: "S9",
    });
    assert.equal(result.stage, "S9");
  });

  void test("path 2 — VISA_REJECTED: overseas visa rejected → S9 (failure)", async () => {
    const pool = bmvS8TransitionPool(
      { entry_confirmed_at: null, result_outcome: "visa_rejected" },
      null,
    );
    const result = await svc(pool).transition(makeCtx(), CASE_ID, {
      toStage: "S9",
    });
    assert.equal(result.stage, "S9");
  });

  void test("path 3 — APPLICATION_REJECTED: immigration review rejected → S9 (failure)", async () => {
    const pool = bmvS8TransitionPool(
      { entry_confirmed_at: null, result_outcome: "rejected" },
      null,
    );
    const result = await svc(pool).transition(makeCtx(), CASE_ID, {
      toStage: "S9",
    });
    assert.equal(result.stage, "S9");
  });

  void test("path 4 — CLIENT_WITHDRAWN: client withdraws → S9 (failure)", async () => {
    const pool = bmvS8TransitionPool(
      { entry_confirmed_at: null, result_outcome: "withdrawn" },
      null,
    );
    const result = await svc(pool).transition(makeCtx(), CASE_ID, {
      toStage: "S9",
    });
    assert.equal(result.stage, "S9");
  });

  void test("path 5 — MANUAL_FAILURE_CLOSE: operator manual close → S9 (failure)", async () => {
    const pool = bmvS8TransitionPool(
      {
        entry_confirmed_at: null,
        result_outcome: null,
        close_reason: "client_request",
      },
      null,
    );
    const result = await svc(pool).transition(makeCtx(), CASE_ID, {
      toStage: "S9",
      closeReason: "client_request",
    });
    assert.equal(result.stage, "S9");
  });

  void test("no valid path (no failure signal, no preconditions) → blocked", async () => {
    const pool = bmvS8TransitionPool(
      { entry_confirmed_at: null, result_outcome: null },
      null,
    );
    await assert.rejects(
      () => svc(pool).transition(makeCtx(), CASE_ID, { toStage: "S9" }),
      (err) => {
        assert.ok(err instanceof Error);
        assert.ok(
          err.message.includes(CASE_WRITE_ERROR_CODES.SUCCESS_CLOSEOUT_BLOCKED),
        );
        return true;
      },
    );
  });
});

void describe("§20 cross-cutting: error code stability for reminder/closeout", () => {
  void test("SUCCESS_CLOSEOUT_BLOCKED error code is stable", () => {
    assert.equal(
      CASE_WRITE_ERROR_CODES.SUCCESS_CLOSEOUT_BLOCKED,
      "CASE_SUCCESS_CLOSEOUT_BLOCKED",
    );
  });

  void test("precondition codes are stable strings", () => {
    assert.equal(
      SUCCESS_CLOSEOUT_PRECONDITION_CODES.ENTRY_CONFIRMED,
      "ENTRY_CONFIRMED",
    );
    assert.equal(
      SUCCESS_CLOSEOUT_PRECONDITION_CODES.RESIDENCE_PERIOD_RECORDED,
      "RESIDENCE_PERIOD_RECORDED",
    );
    assert.equal(
      SUCCESS_CLOSEOUT_PRECONDITION_CODES.RENEWAL_REMINDER_SCHEDULED,
      "RENEWAL_REMINDER_SCHEDULED",
    );
  });

  void test("BMV_CASE_TYPE_CODE is stable", () => {
    assert.equal(BMV_CASE_TYPE_CODE, "business_manager_visa");
  });

  void test("failure outcome set matches service bypass contract", () => {
    const expected = new Set(["rejected", "visa_rejected", "withdrawn"]);
    assert.deepEqual(FAILURE_OUTCOME_SET, expected);
  });
});
