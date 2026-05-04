import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { checkSuccessCloseoutPreconditions } from "./cases.types-residence-closeout";
import {
  CASE_ID,
  RESIDENCE_PERIOD_ROW,
  detailAggregatePool,
  makeCase,
  makeCtx,
  makeTemplates,
  svc,
} from "./cases.closeout-rules.focused.test-support";
void describe("getDetailAggregate: successCloseoutCheck contract", () => {
  void test("BMV S8 with all preconditions met → allSatisfied = true", async () => {
    const pool = detailAggregatePool(
      { entry_confirmed_at: "2026-03-15T00:00:00.000Z" },
      RESIDENCE_PERIOD_ROW,
    );
    const result = await svc(pool, makeTemplates()).getDetailAggregate(
      makeCtx(),
      CASE_ID,
    );
    assert.ok(result);
    assert.ok(
      result.successCloseoutCheck,
      "BMV S8 should have successCloseoutCheck",
    );
    assert.equal(result.successCloseoutCheck.allSatisfied, true);
    assert.equal(result.successCloseoutCheck.preconditions.length, 3);
    for (const p of result.successCloseoutCheck.preconditions) {
      assert.equal(p.satisfied, true, `${p.code} should be satisfied`);
    }
  });
  void test("BMV S8 with no preconditions met → allSatisfied = false, reasons populated", async () => {
    const pool = detailAggregatePool({ entry_confirmed_at: null }, null);
    const result = await svc(pool, makeTemplates()).getDetailAggregate(
      makeCtx(),
      CASE_ID,
    );
    assert.ok(result);
    assert.ok(result.successCloseoutCheck);
    assert.equal(result.successCloseoutCheck.allSatisfied, false);
    const unsatisfied = result.successCloseoutCheck.preconditions
      .filter((p) => !p.satisfied)
      .map((p) => p.code);
    assert.deepEqual(unsatisfied, [
      "ENTRY_CONFIRMED",
      "RESIDENCE_PERIOD_RECORDED",
      "RENEWAL_REMINDER_SCHEDULED",
    ]);
  });
  void test("BMV S8 partial satisfaction — reminder not created", async () => {
    const pool = detailAggregatePool(
      { entry_confirmed_at: "2026-03-15T00:00:00.000Z" },
      { ...RESIDENCE_PERIOD_ROW, reminder_created: false },
    );
    const result = await svc(pool, makeTemplates()).getDetailAggregate(
      makeCtx(),
      CASE_ID,
    );
    assert.ok(result);
    assert.ok(result.successCloseoutCheck);
    assert.equal(result.successCloseoutCheck.allSatisfied, false);
    const statuses = Object.fromEntries(
      result.successCloseoutCheck.preconditions.map((p) => [
        p.code,
        p.satisfied,
      ]),
    );
    assert.equal(statuses.ENTRY_CONFIRMED, true);
    assert.equal(statuses.RESIDENCE_PERIOD_RECORDED, true);
    assert.equal(statuses.RENEWAL_REMINDER_SCHEDULED, false);
  });
  void test("BMV S8 preconditions include human-readable labels", async () => {
    const pool = detailAggregatePool({ entry_confirmed_at: null }, null);
    const result = await svc(pool, makeTemplates()).getDetailAggregate(
      makeCtx(),
      CASE_ID,
    );
    assert.ok(result?.successCloseoutCheck);
    const labels = result.successCloseoutCheck.preconditions.map(
      (p) => p.label,
    );
    for (const label of labels) {
      assert.ok(
        label.length > 0,
        "Each precondition should have a non-empty label",
      );
    }
    assert.ok(
      labels.some((l) => l.includes("入境")),
      "Should have entry-related label",
    );
    assert.ok(
      labels.some((l) => l.includes("在留")),
      "Should have residence period label",
    );
    assert.ok(
      labels.some((l) => l.includes("提醒")),
      "Should have reminder label",
    );
  });
  void test("non-BMV case at S8 → successCloseoutCheck is null", async () => {
    const pool = detailAggregatePool({ case_type_code: "family_stay" }, null);
    const result = await svc(pool, makeTemplates()).getDetailAggregate(
      makeCtx(),
      CASE_ID,
    );
    assert.ok(result);
    assert.equal(result.successCloseoutCheck, null);
  });
  void test("BMV case at S7 → successCloseoutCheck is null", async () => {
    const pool = detailAggregatePool({ stage: "S7", status: "S7" }, null);
    const result = await svc(pool, makeTemplates()).getDetailAggregate(
      makeCtx(),
      CASE_ID,
    );
    assert.ok(result);
    assert.equal(result.successCloseoutCheck, null);
  });
  void test("BMV case at S9 → successCloseoutCheck is null", async () => {
    const pool = detailAggregatePool({ stage: "S9", status: "S9" }, null);
    const result = await svc(pool, makeTemplates()).getDetailAggregate(
      makeCtx(),
      CASE_ID,
    );
    assert.ok(result);
    assert.equal(result.successCloseoutCheck, null);
  });
  void test("currentResidencePeriod is surfaced independently of closeout check", async () => {
    const pool = detailAggregatePool(
      { entry_confirmed_at: "2026-03-15T00:00:00.000Z" },
      RESIDENCE_PERIOD_ROW,
    );
    const result = await svc(pool, makeTemplates()).getDetailAggregate(
      makeCtx(),
      CASE_ID,
    );
    assert.ok(result);
    assert.ok(result.currentResidencePeriod);
    assert.equal(result.currentResidencePeriod.id, "rp-001");
    assert.equal(result.currentResidencePeriod.reminderCreated, true);
  });
  void test("currentResidencePeriod is null when no current period exists", async () => {
    const pool = detailAggregatePool(
      { entry_confirmed_at: "2026-03-15T00:00:00.000Z" },
      null,
    );
    const result = await svc(pool, makeTemplates()).getDetailAggregate(
      makeCtx(),
      CASE_ID,
    );
    assert.ok(result);
    assert.equal(result.currentResidencePeriod, null);
  });
});
void describe("closeout precondition label stability", () => {
  void test("labels are non-empty and distinct", () => {
    const input = {
      caseEntity: makeCase({ entryConfirmedAt: null }),
      currentResidencePeriod: null,
    };
    const result = checkSuccessCloseoutPreconditions(input);
    const labels = result.preconditions.map((p) => p.label);
    assert.equal(labels.length, 3);
    for (const l of labels) {
      assert.ok(l.length > 0, "Label must be non-empty");
    }
    const uniqueLabels = new Set(labels);
    assert.equal(uniqueLabels.size, 3, "All labels must be distinct");
  });
  void test("codes and labels pair up correctly", () => {
    const input = {
      caseEntity: makeCase({ entryConfirmedAt: null }),
      currentResidencePeriod: null,
    };
    const result = checkSuccessCloseoutPreconditions(input);
    const map = Object.fromEntries(
      result.preconditions.map((p) => [p.code, p.label]),
    );
    assert.equal(map.ENTRY_CONFIRMED, "入境確認済み");
    assert.equal(map.RESIDENCE_PERIOD_RECORDED, "在留期間記録済み");
    assert.equal(map.RENEWAL_REMINDER_SCHEDULED, "续签提醒生成済み");
  });
});
//# sourceMappingURL=cases.closeout-rules.aggregate.focused.test.js.map
