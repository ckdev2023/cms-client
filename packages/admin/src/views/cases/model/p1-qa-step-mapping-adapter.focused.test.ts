// ── Test Ownership ──────────────────────────────────────────────
// Owner: p1-qa-001-01 — P1 admin focused tests batch 1 (adapter)
//   Covers: step mapping isolation (buildFinalPaymentGate,
//   buildSupplementRoundInfo, buildReminderFailureInfo).
// Does NOT test: button guard matrix (→ p1-qa-button-guard-matrix),
//   write actions (→ p1-qa-write-actions-error-mapping),
//   adapter aggregate internals (→ bmv-contract.test),
//   step data constants (→ constantsBmvSteps.focused.test),
//   or Vue component rendering.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { buildFinalPaymentGate } from "./CaseAdapterFinalPaymentGate";
import {
  buildSupplementRoundInfo,
  buildReminderFailureInfo,
} from "./CaseAdapterSupplementReminder";

// ═══════════════════════════════════════════════════════════════════
//  1. buildFinalPaymentGate — isolated unit tests
// ═══════════════════════════════════════════════════════════════════

describe("buildFinalPaymentGate isolation (p1-qa-001-01)", () => {
  const cleared = {
    finalPaymentPaid: true,
    finalPaymentMilestoneMatched: true,
    unpaidAmount: 0,
    billingRiskAck: false,
  };
  const outstanding = {
    finalPaymentPaid: false,
    finalPaymentMilestoneMatched: true,
    unpaidAmount: 200000,
    billingRiskAck: false,
  };

  it("returns null for non-BMV case", () => {
    expect(buildFinalPaymentGate("APPROVED", false, cleared)).toBeNull();
  });

  it("returns null when stepCode is null", () => {
    expect(buildFinalPaymentGate(null, true, cleared)).toBeNull();
  });

  it("returns null for irrelevant steps", () => {
    for (const step of [
      "REVIEWING",
      "COE_SENT",
      "ENTRY_SUCCESS",
      "VISA_APPLYING",
    ]) {
      expect(buildFinalPaymentGate(step, true, cleared)).toBeNull();
    }
  });

  it("active for APPROVED step", () => {
    const gate = buildFinalPaymentGate("APPROVED", true, cleared);
    expect(gate).not.toBeNull();
    expect(gate!.canAdvanceToCoe).toBe(true);
  });

  it("active for WAITING_PAYMENT step", () => {
    const gate = buildFinalPaymentGate("WAITING_PAYMENT", true, cleared);
    expect(gate).not.toBeNull();
    expect(gate!.canAdvanceToCoe).toBe(true);
  });

  it("blocked with final_payment_outstanding when not paid", () => {
    const gate = buildFinalPaymentGate("WAITING_PAYMENT", true, outstanding);
    expect(gate!.paymentCleared).toBe(false);
    expect(gate!.canAdvanceToCoe).toBe(false);
    expect(
      gate!.blockers.some((b) => b.code === "final_payment_outstanding"),
    ).toBe(true);
  });

  it("blocked with billing_risk_unacknowledged when unpaid + not ack'd", () => {
    const gate = buildFinalPaymentGate("WAITING_PAYMENT", true, {
      finalPaymentPaid: false,
      finalPaymentMilestoneMatched: true,
      unpaidAmount: 100000,
      billingRiskAck: false,
    });
    expect(
      gate!.blockers.some((b) => b.code === "billing_risk_unacknowledged"),
    ).toBe(true);
  });

  it("no billing_risk blocker when unpaidAmount is 0", () => {
    const gate = buildFinalPaymentGate("WAITING_PAYMENT", true, {
      finalPaymentPaid: false,
      finalPaymentMilestoneMatched: true,
      unpaidAmount: 0,
      billingRiskAck: false,
    });
    expect(gate!.blockers).toHaveLength(1);
    expect(gate!.blockers[0].code).toBe("final_payment_outstanding");
  });

  it("no billing_risk blocker when risk is acknowledged", () => {
    const gate = buildFinalPaymentGate("WAITING_PAYMENT", true, {
      finalPaymentPaid: false,
      finalPaymentMilestoneMatched: true,
      unpaidAmount: 50000,
      billingRiskAck: true,
    });
    expect(gate!.blockers).toHaveLength(1);
    expect(gate!.blockers[0].code).toBe("final_payment_outstanding");
  });

  it("outstandingLabel formatted when unpaid > 0", () => {
    expect(
      buildFinalPaymentGate("WAITING_PAYMENT", true, outstanding)!
        .outstandingLabel,
    ).toBe("¥200,000");
  });

  it("blocked with final_payment_milestone_missing when no final milestone row", () => {
    const gate = buildFinalPaymentGate("WAITING_PAYMENT", true, {
      finalPaymentPaid: false,
      finalPaymentMilestoneMatched: false,
      unpaidAmount: 0,
      billingRiskAck: false,
    })!;
    expect(gate.blockers).toHaveLength(1);
    expect(gate.blockers[0].code).toBe("final_payment_milestone_missing");
    expect(gate.finalPaymentMilestoneMatched).toBe(false);
  });

  it("outstandingLabel empty when paid", () => {
    expect(
      buildFinalPaymentGate("WAITING_PAYMENT", true, cleared)!.outstandingLabel,
    ).toBe("");
  });
});

// ═══════════════════════════════════════════════════════════════════
//  2. buildSupplementRoundInfo — isolated unit tests
// ═══════════════════════════════════════════════════════════════════

describe("buildSupplementRoundInfo isolation (p1-qa-001-01)", () => {
  function rec(
    stepCode: string | null,
    count = 1,
    extra: Record<string, unknown> = {},
  ): Record<string, unknown> {
    return {
      currentWorkflowStepCode: stepCode,
      supplementCount: count,
      lastSupplementNoticeDate: "2026-04-20",
      lastSupplementReason: "追加書類が必要",
      supplementDeadline: null,
      ...extra,
    };
  }

  it("null when stepCode is null", () => {
    expect(buildSupplementRoundInfo(rec(null), false)).toBeNull();
  });

  it("null for non-supplement steps", () => {
    for (const s of ["UNDER_REVIEW", "APPROVED", "COE_SENT"]) {
      expect(buildSupplementRoundInfo(rec(s), false)).toBeNull();
    }
  });

  it("active for NEED_SUPPLEMENT (notice_received / danger)", () => {
    const info = buildSupplementRoundInfo(rec("NEED_SUPPLEMENT"), false)!;
    expect(info.statusKey).toBe("notice_received");
    expect(info.tone).toBe("danger");
  });

  it("active for SUPPLEMENT_PROCESSING (processing / warning)", () => {
    const info = buildSupplementRoundInfo(rec("SUPPLEMENT_PROCESSING"), false)!;
    expect(info.statusKey).toBe("processing");
    expect(info.tone).toBe("warning");
  });

  it("round defaults to 1 when supplementCount is 0", () => {
    expect(
      buildSupplementRoundInfo(rec("NEED_SUPPLEMENT", 0), false)!.round,
    ).toBe(1);
  });

  it("round reflects supplementCount when > 0", () => {
    expect(
      buildSupplementRoundInfo(rec("NEED_SUPPLEMENT", 3), false)!.round,
    ).toBe(3);
  });

  it("reason maps from lastSupplementReason", () => {
    expect(
      buildSupplementRoundInfo(rec("NEED_SUPPLEMENT"), false)!.reason,
    ).toBe("追加書類が必要");
  });

  it("reason falls back to empty string when null", () => {
    expect(
      buildSupplementRoundInfo(
        rec("NEED_SUPPLEMENT", 1, { lastSupplementReason: null }),
        false,
      )!.reason,
    ).toBe("");
  });

  it("canResubmit true for NEED_SUPPLEMENT + non-readonly", () => {
    expect(
      buildSupplementRoundInfo(rec("NEED_SUPPLEMENT"), false)!.canResubmit,
    ).toBe(true);
  });

  it("canResubmit false for NEED_SUPPLEMENT + readonly", () => {
    expect(
      buildSupplementRoundInfo(rec("NEED_SUPPLEMENT"), true)!.canResubmit,
    ).toBe(false);
  });

  it("canResubmit false for SUPPLEMENT_PROCESSING", () => {
    expect(
      buildSupplementRoundInfo(rec("SUPPLEMENT_PROCESSING"), false)!
        .canResubmit,
    ).toBe(false);
  });

  it("deadlineUrgent false when no deadline", () => {
    expect(
      buildSupplementRoundInfo(rec("NEED_SUPPLEMENT"), false)!.deadlineUrgent,
    ).toBe(false);
  });

  it("deadlineUrgent true when deadline within 7 days", () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 3);
    const info = buildSupplementRoundInfo(
      rec("NEED_SUPPLEMENT", 1, { supplementDeadline: soon.toISOString() }),
      false,
    )!;
    expect(info.deadlineUrgent).toBe(true);
  });

  it("deadlineUrgent false when deadline > 7 days", () => {
    const later = new Date();
    later.setDate(later.getDate() + 30);
    const info = buildSupplementRoundInfo(
      rec("NEED_SUPPLEMENT", 1, { supplementDeadline: later.toISOString() }),
      false,
    )!;
    expect(info.deadlineUrgent).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  3. buildReminderFailureInfo — isolated unit tests
// ═══════════════════════════════════════════════════════════════════

describe("buildReminderFailureInfo isolation (p1-qa-001-01)", () => {
  it("null when rp is null", () => {
    expect(buildReminderFailureInfo(null, false)).toBeNull();
  });

  it("null when reminderCreated is true", () => {
    expect(
      buildReminderFailureInfo({ reminderCreated: true }, false),
    ).toBeNull();
  });

  it("null when reminderCreated=false but no error", () => {
    expect(
      buildReminderFailureInfo(
        { reminderCreated: false, reminderError: null },
        false,
      ),
    ).toBeNull();
  });

  it("populated when reminder failed with error", () => {
    const info = buildReminderFailureInfo(
      {
        reminderCreated: false,
        reminderError: "SMTP failed",
        reminderLastAttemptAt: "2026-04-25T10:00:00.000Z",
        reminderAttemptCount: 2,
      },
      false,
    )!;
    expect(info.reason).toBe("SMTP failed");
    expect(info.attemptCount).toBe(2);
    expect(info.canRetry).toBe(true);
  });

  it("canRetry false when readonly", () => {
    const info = buildReminderFailureInfo(
      {
        reminderCreated: false,
        reminderError: "timeout",
        reminderAttemptCount: 1,
      },
      true,
    )!;
    expect(info.canRetry).toBe(false);
  });

  it("attemptCount defaults to 0 when missing", () => {
    const info = buildReminderFailureInfo(
      { reminderCreated: false, reminderError: "error" },
      false,
    )!;
    expect(info.attemptCount).toBe(0);
  });

  it("lastAttemptDate formatted from timestamp", () => {
    const info = buildReminderFailureInfo(
      {
        reminderCreated: false,
        reminderError: "e",
        reminderLastAttemptAt: "2026-04-25",
      },
      false,
    )!;
    expect(info.lastAttemptDate).toContain("2026");
  });

  it("lastAttemptDate empty when no timestamp", () => {
    const info = buildReminderFailureInfo(
      {
        reminderCreated: false,
        reminderError: "e",
        reminderLastAttemptAt: null,
      },
      false,
    )!;
    expect(info.lastAttemptDate).toBe("");
  });
});
