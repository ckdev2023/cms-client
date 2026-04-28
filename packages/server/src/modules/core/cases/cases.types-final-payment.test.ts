// ────────────────────────────────────────────────────────────────
// P1 final_payment 节点契約 focused tests
//
// 覆盖三条契约线：
//   1. 読模型（FinalPaymentNodeReadModel）字段完整性
//   2. 計费真相源（FinalPaymentSourceOfTruth）数据来源口径
//   3. 守卫输入口径：decideFinalPaymentGuard 决策矩阵
// ────────────────────────────────────────────────────────────────

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  FINAL_PAYMENT_MILESTONE,
  FINAL_PAYMENT_GATE_TRIGGER_STEP,
  FINAL_PAYMENT_DEFAULT_GATE_MODE,
  FINAL_PAYMENT_MILESTONE_KEYWORDS,
  DEPOSIT_MILESTONE_KEYWORDS,
  FINAL_PAYMENT_SOURCE_OF_TRUTH,
  FINAL_PAYMENT_GUARD_ERROR_CODES,
  decideFinalPaymentGuard,
} from "./cases.types-final-payment";
import type {
  FinalPaymentNodeReadModel,
  FinalPaymentPlanSummary,
  FinalPaymentSourceOfTruth,
  FinalPaymentGuardInput,
  FinalPaymentGuardOutput,
  FinalPaymentGuardCheckResult,
  FinalPaymentGuardDecision,
} from "./cases.types-final-payment";
import { CASE_WRITE_ERROR_CODES } from "./cases.types";
import { BMV_WORKFLOW_STEPS_BLUEPRINT } from "./bmvTemplateConfig";

// ── helpers ──

function makeSettledGuard(): FinalPaymentGuardCheckResult {
  return { settled: true };
}

function makeUnsettledGuard(
  mode: "block" | "warn",
  unpaid = 200000,
): FinalPaymentGuardCheckResult {
  return { settled: false, unpaid, gateEffectMode: mode };
}

function makeReadModel(
  overrides?: Partial<FinalPaymentNodeReadModel>,
): FinalPaymentNodeReadModel {
  return {
    milestoneMatched: true,
    planCount: 1,
    totalDue: 200000,
    totalReceived: 0,
    unpaidAmount: 200000,
    settled: false,
    gateEffectMode: "block",
    plans: [
      {
        id: "bp-1",
        milestoneName: "尾款",
        amountDue: 200000,
        status: "due",
        gateEffectMode: "block",
        dueDate: "2026-07-01",
      },
    ],
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════
// 1. 常量冻結
// ═══════════════════════════════════════════════════════════

void describe("final_payment constants freeze", () => {
  void test("FINAL_PAYMENT_MILESTONE is 'final_payment'", () => {
    assert.equal(FINAL_PAYMENT_MILESTONE, "final_payment");
  });
  void test("FINAL_PAYMENT_GATE_TRIGGER_STEP is 'COE_SENT'", () => {
    assert.equal(FINAL_PAYMENT_GATE_TRIGGER_STEP, "COE_SENT");
  });
  void test("FINAL_PAYMENT_DEFAULT_GATE_MODE is 'block'", () => {
    assert.equal(FINAL_PAYMENT_DEFAULT_GATE_MODE, "block");
  });
  void test("milestone keywords: 尾款, final, 結果", () => {
    assert.deepEqual(
      [...FINAL_PAYMENT_MILESTONE_KEYWORDS],
      ["尾款", "final", "結果"],
    );
  });
  void test("deposit keywords: 签约, deposit, 着手", () => {
    assert.deepEqual(
      [...DEPOSIT_MILESTONE_KEYWORDS],
      ["签约", "deposit", "着手"],
    );
  });
  void test("milestone and deposit keywords are disjoint", () => {
    const ms = new Set<string>(FINAL_PAYMENT_MILESTONE_KEYWORDS);
    for (const kw of DEPOSIT_MILESTONE_KEYWORDS) assert.ok(!ms.has(kw), kw);
  });
});

// ═══════════════════════════════════════════════════════════
// 2. 読模型
// ═══════════════════════════════════════════════════════════

void describe("FinalPaymentNodeReadModel: field completeness", () => {
  void test("all required fields present", () => {
    const m = makeReadModel();
    assert.equal(typeof m.milestoneMatched, "boolean");
    assert.equal(typeof m.planCount, "number");
    assert.equal(typeof m.totalDue, "number");
    assert.equal(typeof m.unpaidAmount, "number");
    assert.equal(typeof m.settled, "boolean");
    assert.ok(Array.isArray(m.plans));
  });
  void test("unpaidAmount = totalDue - totalReceived (≥ 0)", () => {
    const m = makeReadModel({
      totalDue: 300000,
      totalReceived: 100000,
      unpaidAmount: 200000,
    });
    assert.equal(m.unpaidAmount, m.totalDue - m.totalReceived);
  });
  void test("settled=true when all plans paid", () => {
    const m = makeReadModel({
      settled: true,
      totalDue: 200000,
      totalReceived: 200000,
      unpaidAmount: 0,
      plans: [
        {
          id: "bp-1",
          milestoneName: "尾款",
          amountDue: 200000,
          status: "paid",
          gateEffectMode: "block",
          dueDate: null,
        },
      ],
    });
    assert.equal(m.settled, true);
    assert.equal(m.unpaidAmount, 0);
  });
  void test("milestoneMatched=false when no matching records", () => {
    const m = makeReadModel({
      milestoneMatched: false,
      planCount: 0,
      plans: [],
    });
    assert.equal(m.milestoneMatched, false);
  });
});

void describe("FinalPaymentPlanSummary: shape", () => {
  void test("has all required fields", () => {
    const p: FinalPaymentPlanSummary = {
      id: "bp-1",
      milestoneName: "尾款",
      amountDue: 200000,
      status: "due",
      gateEffectMode: "block",
      dueDate: "2026-07-01",
    };
    assert.equal(p.status, "due");
  });
  void test("allows null milestoneName and dueDate", () => {
    const p: FinalPaymentPlanSummary = {
      id: "bp-1",
      milestoneName: null,
      amountDue: 200000,
      status: "due",
      gateEffectMode: "warn",
      dueDate: null,
    };
    assert.equal(p.milestoneName, null);
  });
});

// ═══════════════════════════════════════════════════════════
// 3. 計费真相源
// ═══════════════════════════════════════════════════════════

void describe("FinalPaymentSourceOfTruth: data source", () => {
  void test("primary table is billing_records", () => {
    assert.equal(FINAL_PAYMENT_SOURCE_OF_TRUTH.primaryTable, "billing_records");
  });
  void test("milestone match strategy is keyword_like", () => {
    assert.equal(
      FINAL_PAYMENT_SOURCE_OF_TRUTH.milestoneMatchStrategy,
      "keyword_like",
    );
  });
  void test("keywords match FINAL_PAYMENT_MILESTONE_KEYWORDS", () => {
    assert.deepEqual(
      [...FINAL_PAYMENT_SOURCE_OF_TRUTH.milestoneMatchKeywords],
      [...FINAL_PAYMENT_MILESTONE_KEYWORDS],
    );
  });
  void test("only valid payments participate", () => {
    assert.equal(FINAL_PAYMENT_SOURCE_OF_TRUTH.paymentStatusFilter, "valid");
  });
});

void describe("FinalPaymentSourceOfTruth: cache sync", () => {
  void test("cache target is cases", () => {
    assert.equal(FINAL_PAYMENT_SOURCE_OF_TRUTH.cacheTarget, "cases");
  });
  void test("cache fields map to DB columns", () => {
    assert.equal(
      FINAL_PAYMENT_SOURCE_OF_TRUTH.cacheFields.finalPaymentPaid,
      "final_payment_paid_cached",
    );
    assert.equal(
      FINAL_PAYMENT_SOURCE_OF_TRUTH.cacheFields.unpaidAmount,
      "billing_unpaid_amount_cached",
    );
  });
  void test("sync function is billingGuards.syncBillingCacheForCase", () => {
    assert.equal(
      FINAL_PAYMENT_SOURCE_OF_TRUTH.syncFunction,
      "billingGuards.syncBillingCacheForCase",
    );
  });
});

void describe("FinalPaymentSourceOfTruth: settled & precedence", () => {
  void test("settled = all matched billing_records.status = paid", () => {
    assert.equal(
      FINAL_PAYMENT_SOURCE_OF_TRUTH.settledCondition,
      "all matched billing_records.status = 'paid'",
    );
  });
  void test("gate mode precedence: block > warn > off", () => {
    assert.equal(
      FINAL_PAYMENT_SOURCE_OF_TRUTH.gateModePrecedence,
      "block > warn > off",
    );
  });
});

void describe("FinalPaymentSourceOfTruth: billingGuards alignment", () => {
  void test("keywords align with isFinalPaymentMilestone heuristic", () => {
    for (const kw of ["尾款", "final", "結果"]) {
      assert.ok(
        FINAL_PAYMENT_MILESTONE_KEYWORDS.includes(
          kw as (typeof FINAL_PAYMENT_MILESTONE_KEYWORDS)[number],
        ),
      );
    }
  });
  void test("type shape structurally complete", () => {
    const sot: FinalPaymentSourceOfTruth = FINAL_PAYMENT_SOURCE_OF_TRUTH;
    for (const k of [
      "primaryTable",
      "milestoneMatchStrategy",
      "milestoneMatchKeywords",
      "paymentTable",
      "paymentStatusFilter",
      "cacheTarget",
      "cacheFields",
      "syncFunction",
      "settledCondition",
      "gateModePrecedence",
    ]) {
      assert.ok(k in sot, `missing ${k}`);
    }
  });
});

// ═══════════════════════════════════════════════════════════
// 4. 守卫输入
// ═══════════════════════════════════════════════════════════

void describe("FinalPaymentGuardInput: trigger source", () => {
  void test("workflow_step_transition trigger", () => {
    const input: FinalPaymentGuardInput = {
      caseId: "case-1",
      triggerSource: "workflow_step_transition",
      targetStepCode: "COE_SENT",
      targetPostApprovalStage: null,
    };
    assert.equal(input.triggerSource, "workflow_step_transition");
  });
  void test("post_approval_stage trigger", () => {
    const input: FinalPaymentGuardInput = {
      caseId: "case-1",
      triggerSource: "post_approval_stage",
      targetStepCode: null,
      targetPostApprovalStage: "coe_sent",
    };
    assert.equal(input.triggerSource, "post_approval_stage");
  });
});

// ═══════════════════════════════════════════════════════════
// 5. 守卫決策：decideFinalPaymentGuard
// ═══════════════════════════════════════════════════════════

void describe("decideFinalPaymentGuard: decision matrix", () => {
  void test("null → pass (no guard)", () => {
    const d = decideFinalPaymentGuard(null, false);
    assert.equal(d.decision, "pass");
    assert.equal(d.reason, "no_final_payment_guard");
  });
  void test("settled → pass", () => {
    assert.equal(
      decideFinalPaymentGuard(makeSettledGuard(), false).decision,
      "pass",
    );
  });
  void test("settled + riskAcked → pass (settled priority)", () => {
    assert.equal(
      decideFinalPaymentGuard(makeSettledGuard(), true).reason,
      "settled",
    );
  });
  void test("unsettled block → block regardless of risk ack", () => {
    const d = decideFinalPaymentGuard(
      makeUnsettledGuard("block", 200000),
      true,
    );
    assert.equal(d.decision, "block");
    assert.equal((d as { unpaid: number }).unpaid, 200000);
  });
  void test("unsettled block without ack → block", () => {
    assert.equal(
      decideFinalPaymentGuard(makeUnsettledGuard("block"), false).decision,
      "block",
    );
  });
  void test("unsettled warn + acked → pass", () => {
    const d = decideFinalPaymentGuard(makeUnsettledGuard("warn"), true);
    assert.equal(d.decision, "pass");
    assert.equal(d.reason, "risk_acknowledged");
  });
  void test("unsettled warn + NOT acked → warn_requires_ack", () => {
    const d = decideFinalPaymentGuard(
      makeUnsettledGuard("warn", 100000),
      false,
    );
    assert.equal(d.decision, "warn_requires_ack");
    assert.equal((d as { unpaid: number }).unpaid, 100000);
  });
});

void describe("decideFinalPaymentGuard: edge cases", () => {
  void test("block with zero unpaid → still blocks", () => {
    assert.equal(
      decideFinalPaymentGuard(makeUnsettledGuard("block", 0), false).decision,
      "block",
    );
  });
  void test("warn with zero unpaid, no ack → warn", () => {
    assert.equal(
      decideFinalPaymentGuard(makeUnsettledGuard("warn", 0), false).decision,
      "warn_requires_ack",
    );
  });
  void test("consistent FinalPaymentGuardDecision shape", () => {
    const all: FinalPaymentGuardDecision[] = [
      decideFinalPaymentGuard(null, false),
      decideFinalPaymentGuard(makeSettledGuard(), false),
      decideFinalPaymentGuard(makeUnsettledGuard("block"), false),
      decideFinalPaymentGuard(makeUnsettledGuard("warn"), false),
      decideFinalPaymentGuard(makeUnsettledGuard("warn"), true),
    ];
    for (const d of all) {
      assert.ok("decision" in d);
      assert.ok("reason" in d);
    }
  });
});

// ═══════════════════════════════════════════════════════════
// 6. エラーコード整合
// ═══════════════════════════════════════════════════════════

void describe("error codes: CASE_WRITE_ERROR_CODES alignment", () => {
  void test("BILLING_BLOCKED matches", () => {
    assert.equal(
      FINAL_PAYMENT_GUARD_ERROR_CODES.BILLING_BLOCKED,
      CASE_WRITE_ERROR_CODES.POST_APPROVAL_BILLING_BLOCKED,
    );
  });
  void test("BILLING_RISK_UNACKNOWLEDGED matches", () => {
    assert.equal(
      FINAL_PAYMENT_GUARD_ERROR_CODES.BILLING_RISK_UNACKNOWLEDGED,
      CASE_WRITE_ERROR_CODES.POST_APPROVAL_BILLING_RISK_UNACKNOWLEDGED,
    );
  });
  void test("WORKFLOW_STEP_BILLING_BLOCKED matches", () => {
    assert.equal(
      FINAL_PAYMENT_GUARD_ERROR_CODES.WORKFLOW_STEP_BILLING_BLOCKED,
      CASE_WRITE_ERROR_CODES.WORKFLOW_STEP_BILLING_BLOCKED,
    );
  });
  void test("all guard error codes unique", () => {
    const vals = Object.values(FINAL_PAYMENT_GUARD_ERROR_CODES);
    assert.equal(new Set(vals).size, vals.length);
  });
});

// ═══════════════════════════════════════════════════════════
// 7. BMV 蓝图対齐
// ═══════════════════════════════════════════════════════════

void describe("BMV blueprint alignment: COE_SENT", () => {
  void test("COE_SENT exists in blueprint", () => {
    assert.ok(
      BMV_WORKFLOW_STEPS_BLUEPRINT.find((s) => s.stepCode === "COE_SENT"),
    );
  });
  void test("COE_SENT milestone matches FINAL_PAYMENT_MILESTONE", () => {
    const step = BMV_WORKFLOW_STEPS_BLUEPRINT.find(
      (s) => s.stepCode === "COE_SENT",
    );
    assert.equal(step?.billingGate?.milestone, FINAL_PAYMENT_MILESTONE);
  });
  void test("COE_SENT mode matches FINAL_PAYMENT_DEFAULT_GATE_MODE", () => {
    const step = BMV_WORKFLOW_STEPS_BLUEPRINT.find(
      (s) => s.stepCode === "COE_SENT",
    );
    assert.equal(step?.billingGate?.mode, FINAL_PAYMENT_DEFAULT_GATE_MODE);
  });
  void test("trigger step matches FINAL_PAYMENT_GATE_TRIGGER_STEP", () => {
    assert.ok(
      BMV_WORKFLOW_STEPS_BLUEPRINT.find(
        (s) => s.stepCode === FINAL_PAYMENT_GATE_TRIGGER_STEP,
      ),
    );
  });
});

// ═══════════════════════════════════════════════════════════
// 8. FinalPaymentGuardOutput 類型契約
// ═══════════════════════════════════════════════════════════

void describe("FinalPaymentGuardOutput: type contract", () => {
  void test("no_guard has two reasons", () => {
    const o1: FinalPaymentGuardOutput = {
      result: "no_guard",
      reason: "no_final_payment_plans",
    };
    const o2: FinalPaymentGuardOutput = {
      result: "no_guard",
      reason: "all_off",
    };
    assert.equal(o1.result, "no_guard");
    assert.equal(o2.result, "no_guard");
  });
  void test("blocked carries unpaid and error code", () => {
    const o: FinalPaymentGuardOutput = {
      result: "blocked",
      gateEffectMode: "block",
      unpaid: 200000,
      errorCode: "CASE_POST_APPROVAL_BILLING_BLOCKED",
    };
    assert.equal(o.unpaid, 200000);
  });
  void test("warn carries requiresRiskAck", () => {
    const o: FinalPaymentGuardOutput = {
      result: "warn",
      gateEffectMode: "warn",
      unpaid: 100000,
      requiresRiskAck: true,
      errorCode: "CASE_POST_APPROVAL_BILLING_RISK_UNACKNOWLEDGED",
    };
    assert.equal(o.requiresRiskAck, true);
  });
});
