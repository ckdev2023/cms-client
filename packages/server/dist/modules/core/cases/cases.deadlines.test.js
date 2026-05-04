import assert from "node:assert/strict";
import test from "node:test";
import {
  computeRemainingDays,
  computeSeverity,
  deriveCaseDeadlines,
} from "./cases.deadlines";
const NOW = new Date("2026-04-23T10:00:00Z");
void test("computeRemainingDays returns null for null input", () => {
  assert.equal(computeRemainingDays(null, NOW), null);
});
void test("computeRemainingDays returns null for invalid date string", () => {
  assert.equal(computeRemainingDays("not-a-date", NOW), null);
});
void test("computeRemainingDays returns 0 for today", () => {
  assert.equal(computeRemainingDays("2026-04-23T00:00:00Z", NOW), 0);
});
void test("computeRemainingDays returns positive days for future dates", () => {
  assert.equal(computeRemainingDays("2026-04-30T00:00:00Z", NOW), 7);
});
void test("computeRemainingDays returns negative days for past dates", () => {
  assert.equal(computeRemainingDays("2026-04-20T00:00:00Z", NOW), -3);
});
void test("computeRemainingDays handles date-only strings", () => {
  assert.equal(computeRemainingDays("2026-05-23", NOW), 30);
});
void test("computeSeverity returns normal for null", () => {
  assert.equal(computeSeverity(null), "normal");
});
void test("computeSeverity returns danger for negative (overdue)", () => {
  assert.equal(computeSeverity(-5), "danger");
});
void test("computeSeverity returns danger for 0 (today)", () => {
  assert.equal(computeSeverity(0), "danger");
});
void test("computeSeverity returns danger for 7", () => {
  assert.equal(computeSeverity(7), "danger");
});
void test("computeSeverity returns warning for 8", () => {
  assert.equal(computeSeverity(8), "warning");
});
void test("computeSeverity returns warning for 30", () => {
  assert.equal(computeSeverity(30), "warning");
});
void test("computeSeverity returns normal for 31", () => {
  assert.equal(computeSeverity(31), "normal");
});
void test("deriveCaseDeadlines returns 4 items for all-null source", () => {
  const source = {
    dueAt: null,
    residenceExpiryDate: null,
    submissionDate: null,
    resultDate: null,
  };
  const result = deriveCaseDeadlines(source, NOW);
  assert.equal(result.length, 4);
  assert.deepEqual(
    result.map((d) => d.deadlineType),
    ["residence_expiry", "supplement_due", "submission_due", "result_expected"],
  );
  for (const item of result) {
    assert.equal(item.dueAt, null);
    assert.equal(item.remainingDays, null);
    assert.equal(item.severity, "normal");
  }
});
void test("deriveCaseDeadlines maps source fields to correct deadline types and severities", () => {
  const source = {
    dueAt: "2026-04-25T00:00:00Z",
    residenceExpiryDate: "2026-05-01T00:00:00Z",
    submissionDate: "2026-06-15T00:00:00Z",
    resultDate: null,
  };
  const result = deriveCaseDeadlines(source, NOW);
  const residency = result.find((d) => d.deadlineType === "residence_expiry");
  assert.ok(residency);
  assert.equal(residency.dueAt, "2026-05-01T00:00:00Z");
  assert.equal(residency.remainingDays, 8);
  assert.equal(residency.severity, "warning");
  const supplement = result.find((d) => d.deadlineType === "supplement_due");
  assert.ok(supplement);
  assert.equal(supplement.dueAt, "2026-04-25T00:00:00Z");
  assert.equal(supplement.remainingDays, 2);
  assert.equal(supplement.severity, "danger");
  const submission = result.find((d) => d.deadlineType === "submission_due");
  assert.ok(submission);
  assert.equal(submission.dueAt, "2026-06-15T00:00:00Z");
  assert.equal(submission.remainingDays, 53);
  assert.equal(submission.severity, "normal");
  const resultExpected = result.find(
    (d) => d.deadlineType === "result_expected",
  );
  assert.ok(resultExpected);
  assert.equal(resultExpected.dueAt, null);
  assert.equal(resultExpected.remainingDays, null);
  assert.equal(resultExpected.severity, "normal");
});
void test("deriveCaseDeadlines assigns correct labels", () => {
  const source = {
    dueAt: null,
    residenceExpiryDate: null,
    submissionDate: null,
    resultDate: null,
  };
  const result = deriveCaseDeadlines(source, NOW);
  const labels = result.map((d) => d.label);
  assert.deepEqual(labels, [
    "在留到期日",
    "补件截止日",
    "提交预約日",
    "結果予計日",
  ]);
});
void test("deriveCaseDeadlines returns correct shape for supplement_due", () => {
  const source = {
    dueAt: "2026-04-24T00:00:00Z",
    residenceExpiryDate: null,
    submissionDate: null,
    resultDate: null,
  };
  const result = deriveCaseDeadlines(source, NOW);
  const supplement = result.find((d) => d.deadlineType === "supplement_due");
  assert.deepEqual(supplement, {
    deadlineType: "supplement_due",
    label: "补件截止日",
    dueAt: "2026-04-24T00:00:00Z",
    remainingDays: 1,
    severity: "danger",
  });
});
//# sourceMappingURL=cases.deadlines.test.js.map
