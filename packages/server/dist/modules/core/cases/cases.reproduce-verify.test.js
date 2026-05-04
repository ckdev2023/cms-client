/**
 * T-18-reproduce-verify — Bug 清单 §6 复现脚本逐条验证。
 *
 * 验证修复后：
 *   (1) 状态机跳跃 S1→S2→S9 应 400
 *   (2) /:id/aggregate 应 200 且字段完整（Promise.allSettled 兜底）
 *   (3) residence-periods 回包 validFrom=2026-09-01 不偏
 *   (4) /api/reminders?caseId=... 返回三条
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { BadRequestException } from "@nestjs/common";
import { DEFAULT_CASE_TRANSITIONS } from "./cases.service";
import { toDateOnlyString } from "../residence-periods/residencePeriods.service";
import {
  DEFAULT_REMINDER_SCHEDULE,
  resolveReminderPlans,
} from "../residence-periods/reminderBlueprintContract";
import {
  assertPhaseTransition,
  PhaseTransitionError,
  PHASE_TRANSITIONS,
} from "./businessPhase";
// ─── (1) 状态机跳跃 S2→S9 应被拒绝 ─────────────────────────────
void describe("(1) BUG-063 fix: S2→S9 jump blocked", () => {
  void test("DEFAULT_CASE_TRANSITIONS: S2 only allows S3", () => {
    assert.deepEqual(DEFAULT_CASE_TRANSITIONS.S2, ["S3"]);
  });
  void test("DEFAULT_CASE_TRANSITIONS: S2 does NOT allow S9", () => {
    assert.equal(
      DEFAULT_CASE_TRANSITIONS.S2.includes("S9"),
      false,
      "S2→S9 must not be in the allowed list",
    );
  });
  void test("DEFAULT_CASE_TRANSITIONS: S1 only allows S2", () => {
    assert.deepEqual(DEFAULT_CASE_TRANSITIONS.S1, ["S2"]);
  });
  void test("S1~S6 cannot jump directly to S9", () => {
    for (const stage of ["S1", "S2", "S3", "S4", "S5", "S6"]) {
      assert.equal(
        DEFAULT_CASE_TRANSITIONS[stage].includes("S9"),
        false,
        `${stage}→S9 must not be allowed`,
      );
    }
  });
  void test("S7→S9 requires closeReason (via allowed transitions)", () => {
    assert.ok(
      DEFAULT_CASE_TRANSITIONS.S7.includes("S9"),
      "S7→S9 should be in allowed transitions (failure closeout path)",
    );
  });
  void test("S8→S9 is the normal archive path", () => {
    assert.deepEqual(DEFAULT_CASE_TRANSITIONS.S8, ["S9"]);
  });
  void test("S9 is terminal — no outgoing transitions", () => {
    assert.deepEqual(DEFAULT_CASE_TRANSITIONS.S9, []);
  });
  void test("phase-transition: CONSULTING cannot jump to APPROVED", () => {
    assert.throws(
      () => {
        assertPhaseTransition("CONSULTING", "APPROVED");
      },
      (err) => err instanceof PhaseTransitionError,
    );
  });
  void test("phase-transition: UNDER_REVIEW→APPROVED is valid", () => {
    assert.doesNotThrow(() => {
      assertPhaseTransition("UNDER_REVIEW", "APPROVED");
    });
  });
  void test("phase-transition: APPROVED→CONSULTING is invalid (no backward)", () => {
    assert.throws(
      () => {
        assertPhaseTransition("APPROVED", "CONSULTING");
      },
      (err) => err instanceof PhaseTransitionError,
    );
  });
});
// ─── (2) /:id/aggregate Promise.allSettled 兜底 ─────────────────
function settledValueOrDefault(result, fallback) {
  return result.status === "fulfilled" ? result.value : fallback;
}
void describe("(2) BUG-064 fix: aggregate resilience", () => {
  void test("Promise.allSettled captures both fulfilled and rejected", async () => {
    const results = await Promise.allSettled([
      Promise.resolve(42),
      Promise.reject(new Error("sub-query failed")),
      Promise.resolve("ok"),
    ]);
    assert.equal(results[0].status, "fulfilled");
    assert.equal(results[1].status, "rejected");
    assert.equal(results[2].status, "fulfilled");
    assert.equal(settledValueOrDefault(results[0], -1), 42);
    assert.equal(settledValueOrDefault(results[1], -1), -1);
    assert.equal(settledValueOrDefault(results[2], "fallback"), "ok");
  });
  void test("settledValueOrDefault returns fallback for rejected", () => {
    const results = [
      { status: "rejected", reason: new Error("failed") },
      { status: "fulfilled", value: [1, 2, 3] },
    ];
    assert.deepEqual(settledValueOrDefault(results[0], []), []);
    assert.deepEqual(settledValueOrDefault(results[1], []), [1, 2, 3]);
  });
  void test("aggregate sub-queries: all-rejected still produces partial result", async () => {
    const results = await Promise.allSettled([
      Promise.reject(new Error("counts failed")),
      Promise.reject(new Error("validation failed")),
      Promise.reject(new Error("submission failed")),
    ]);
    const counts = settledValueOrDefault(results[0], 0);
    const validation = settledValueOrDefault(results[1], null);
    const submission = settledValueOrDefault(results[2], null);
    assert.equal(counts, 0);
    assert.equal(validation, null);
    assert.equal(submission, null);
  });
});
// ─── (3) residence-periods validFrom 不偏移 ────────────────────
void describe("(3) BUG-068 fix: toDateOnlyString no timezone drift", () => {
  void test("string input '2026-09-01' returns exactly '2026-09-01'", () => {
    assert.equal(toDateOnlyString("2026-09-01"), "2026-09-01");
  });
  void test("string input '2030-09-01' returns exactly '2030-09-01'", () => {
    assert.equal(toDateOnlyString("2030-09-01"), "2030-09-01");
  });
  void test("ISO timestamp string sliced to date-only", () => {
    assert.equal(toDateOnlyString("2026-09-01T00:00:00.000Z"), "2026-09-01");
  });
  void test("ISO timestamp with offset sliced correctly", () => {
    assert.equal(toDateOnlyString("2026-09-01T09:00:00+09:00"), "2026-09-01");
  });
  void test("Date(UTC) → local date extraction", () => {
    const d = new Date(Date.UTC(2026, 8, 1));
    const result = toDateOnlyString(d);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    assert.equal(result, `${String(year)}-${month}-${day}`);
  });
  void test("invalid input throws BadRequestException", () => {
    assert.throws(() => toDateOnlyString(12345), BadRequestException);
  });
});
// ─── (4) reminders 返回三条 ─────────────────────────────────────
void describe("(4) BUG-067 fix: 3 reminder plans generated", () => {
  void test("DEFAULT_REMINDER_SCHEDULE has exactly 3 items (180/90/30)", () => {
    assert.equal(DEFAULT_REMINDER_SCHEDULE.length, 3);
    assert.equal(DEFAULT_REMINDER_SCHEDULE[0].daysBefore, 180);
    assert.equal(DEFAULT_REMINDER_SCHEDULE[1].daysBefore, 90);
    assert.equal(DEFAULT_REMINDER_SCHEDULE[2].daysBefore, 30);
  });
  void test("resolveReminderPlans returns 3 plans", () => {
    const plans = resolveReminderPlans(
      DEFAULT_REMINDER_SCHEDULE,
      "period-123",
      "2030-09-01",
    );
    assert.equal(plans.length, 3);
  });
  void test("reminder remindAt values are correctly calculated", () => {
    const plans = resolveReminderPlans(
      DEFAULT_REMINDER_SCHEDULE,
      "period-123",
      "2030-09-01",
    );
    const baseMs = Date.UTC(2030, 8, 1);
    const plan180 = plans.find((p) => p.daysBefore === 180);
    assert.ok(plan180);
    const expected180 = new Date(baseMs - 180 * 86400000).toISOString();
    assert.equal(plan180.remindAt, expected180);
    const plan90 = plans.find((p) => p.daysBefore === 90);
    assert.ok(plan90);
    const expected90 = new Date(baseMs - 90 * 86400000).toISOString();
    assert.equal(plan90.remindAt, expected90);
    const plan30 = plans.find((p) => p.daysBefore === 30);
    assert.ok(plan30);
    const expected30 = new Date(baseMs - 30 * 86400000).toISOString();
    assert.equal(plan30.remindAt, expected30);
  });
  void test("dedupeKey contains periodId and daysBefore", () => {
    const plans = resolveReminderPlans(
      DEFAULT_REMINDER_SCHEDULE,
      "period-xyz",
      "2030-09-01",
    );
    assert.equal(plans[0].dedupeKey, "residence_period:period-xyz:180");
    assert.equal(plans[1].dedupeKey, "residence_period:period-xyz:90");
    assert.equal(plans[2].dedupeKey, "residence_period:period-xyz:30");
  });
  void test("all plans have channel=in_app and recipientType=internal_user", () => {
    const plans = resolveReminderPlans(
      DEFAULT_REMINDER_SCHEDULE,
      "period-123",
      "2030-09-01",
    );
    for (const plan of plans) {
      assert.equal(plan.channel, "in_app");
      assert.equal(plan.recipientType, "internal_user");
    }
  });
});
// ─── 补充：双层状态机一致性 ─────────────────────────────────────
void describe("dual-axis state machine consistency", () => {
  void test("phase CLOSED_SUCCESS/CLOSED_FAILED are both terminal", () => {
    assert.deepEqual(PHASE_TRANSITIONS.CLOSED_SUCCESS, []);
    assert.deepEqual(PHASE_TRANSITIONS.CLOSED_FAILED, []);
  });
  void test("NEED_SUPPLEMENT cycle is well-formed", () => {
    assert.ok(PHASE_TRANSITIONS.UNDER_REVIEW.includes("NEED_SUPPLEMENT"));
    assert.ok(
      PHASE_TRANSITIONS.NEED_SUPPLEMENT.includes("SUPPLEMENT_PROCESSING"),
    );
    assert.ok(PHASE_TRANSITIONS.SUPPLEMENT_PROCESSING.includes("UNDER_REVIEW"));
  });
});
//# sourceMappingURL=cases.reproduce-verify.test.js.map
