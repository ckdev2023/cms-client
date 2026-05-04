import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  checkSuccessCloseoutPreconditions,
  requiresSuccessCloseoutCheck,
  SUCCESS_CLOSEOUT_PRECONDITION_CODES,
} from "../cases/cases.types-residence-closeout";
import {
  BASE_INPUT,
  CASE_ID,
  PERIOD_ID,
  USER_ID,
  createService,
  happyPathQueryFn,
  makeCaseEntity,
  makeCtx,
  makeResidencePeriodRow,
  ok,
  reminderFailureQueryFn,
} from "./residencePeriods.reminder-blueprint.focused.test-support";
void describe("failure rollback: SAVEPOINT contains reminder INSERT failure", () => {
  void test("create succeeds with reminderCreated=false when reminder INSERT fails", async () => {
    const { svc } = createService(reminderFailureQueryFn());
    const result = await svc.create(makeCtx(), BASE_INPUT);
    assert.equal(
      result.reminderCreated,
      false,
      "reminderCreated should be false after SAVEPOINT rollback",
    );
    assert.equal(
      result.id,
      PERIOD_ID,
      "residence period should still be created",
    );
    assert.equal(result.validUntil, "2027-01-01");
  });
  void test("SAVEPOINT is created before and rolled back after failure", async () => {
    const savepointActions = [];
    const { svc } = createService(
      reminderFailureQueryFn({
        onSavepoint: (action) => savepointActions.push(action),
      }),
    );
    await svc.create(makeCtx(), BASE_INPUT);
    assert.ok(
      savepointActions.includes("create"),
      "should create SAVEPOINT before INSERT",
    );
    assert.ok(
      savepointActions.includes("rollback"),
      "should ROLLBACK TO SAVEPOINT after failure",
    );
    assert.ok(
      savepointActions.indexOf("create") < savepointActions.indexOf("rollback"),
      "SAVEPOINT creation must precede rollback",
    );
  });
  void test("partial failure (2nd INSERT) still rolls back all reminders via SAVEPOINT", async () => {
    const { svc } = createService(reminderFailureQueryFn({ failAtInsert: 2 }));
    const result = await svc.create(makeCtx(), BASE_INPUT);
    assert.equal(
      result.reminderCreated,
      false,
      "partial failure still results in reminderCreated=false",
    );
  });
  void test("reminder_created flag is NOT set to true after failure", async () => {
    const reminderCreatedCalls = [];
    const { svc } = createService(
      reminderFailureQueryFn({ reminderCreatedCalls }),
    );
    const result = await svc.create(makeCtx(), BASE_INPUT);
    assert.equal(result.reminderCreated, false);
    const trueUpdates = reminderCreatedCalls.filter((p) =>
      p.some((v) => v === true),
    );
    assert.equal(
      trueUpdates.length,
      0,
      "should never set reminder_created = true on failure",
    );
  });
  void test("timeline entry is still written after SAVEPOINT rollback (outer tx commits)", async () => {
    const { svc, timeline } = createService(reminderFailureQueryFn());
    await svc.create(makeCtx(), BASE_INPUT);
    assert.equal(
      timeline.writes.length,
      1,
      "timeline should still be written since outer transaction commits",
    );
    const entry = timeline.writes[0];
    assert.equal(entry.action, "residence_period.created");
    assert.equal(entry.entityId, CASE_ID);
  });
});
void describe("failure rollback: update with reminder sync failure", () => {
  void test("update succeeds with reminderCreated=false when reminder INSERT fails", async () => {
    const { svc } = createService((sql) => {
      if (sql.includes("from residence_periods") && sql.includes("for update"))
        return ok([makeResidencePeriodRow()]);
      if (
        sql.includes("update residence_periods") &&
        sql.includes("set is_current = false")
      )
        return ok([], 0);
      if (
        sql.includes("update residence_periods") &&
        sql.includes("set visa_type")
      )
        return ok([makeResidencePeriodRow({ valid_until: "2028-01-01" })]);
      if (sql.includes("from case_templates")) return ok([], 0);
      if (
        sql.includes("update reminders") &&
        sql.includes("set send_status = 'canceled'")
      )
        return ok([], 3);
      if (sql.includes("select owner_user_id"))
        return ok([{ owner_user_id: USER_ID }]);
      if (
        sql.toUpperCase().includes("SAVEPOINT") &&
        !sql.toUpperCase().includes("ROLLBACK")
      )
        return ok();
      if (sql.includes("insert into reminders"))
        return Promise.reject(new Error("Reminder sync failed"));
      if (sql.toUpperCase().includes("ROLLBACK TO SAVEPOINT")) return ok();
      if (
        sql.includes("update residence_periods") &&
        sql.includes("reminder_created")
      )
        return ok([], 1);
      return ok();
    });
    const result = await svc.update(makeCtx(), PERIOD_ID, {
      validUntil: "2028-01-01",
    });
    assert.equal(result.reminderCreated, false);
  });
  void test("update timeline is still written after SAVEPOINT rollback", async () => {
    const { svc, timeline } = createService((sql) => {
      if (sql.includes("from residence_periods") && sql.includes("for update"))
        return ok([makeResidencePeriodRow()]);
      if (
        sql.includes("update residence_periods") &&
        sql.includes("set is_current = false")
      )
        return ok([], 0);
      if (
        sql.includes("update residence_periods") &&
        sql.includes("set visa_type")
      )
        return ok([makeResidencePeriodRow({ valid_until: "2028-01-01" })]);
      if (sql.includes("from case_templates")) return ok([], 0);
      if (
        sql.includes("update reminders") &&
        sql.includes("set send_status = 'canceled'")
      )
        return ok([], 0);
      if (sql.includes("select owner_user_id"))
        return ok([{ owner_user_id: USER_ID }]);
      if (
        sql.toUpperCase().includes("SAVEPOINT") &&
        !sql.toUpperCase().includes("ROLLBACK")
      )
        return ok();
      if (sql.includes("insert into reminders"))
        return Promise.reject(new Error("Reminder sync boom"));
      if (sql.toUpperCase().includes("ROLLBACK TO SAVEPOINT")) return ok();
      if (
        sql.includes("update residence_periods") &&
        sql.includes("reminder_created")
      )
        return ok([], 1);
      return ok();
    });
    await svc.update(makeCtx(), PERIOD_ID, { validUntil: "2028-01-01" });
    assert.equal(timeline.writes.length, 1);
    assert.equal(timeline.writes[0].action, "residence_period.updated");
  });
});
void describe("failure rollback: cancel step is idempotent", () => {
  void test("cancel existing reminders succeeds even when no pending reminders exist", async () => {
    const insertedReminders = [];
    const { svc } = createService(happyPathQueryFn({ insertedReminders }));
    const result = await svc.create(makeCtx(), BASE_INPUT);
    assert.equal(insertedReminders.length, 3);
    assert.equal(result.reminderCreated, true);
  });
});
void describe("blocking feedback: RENEWAL_REMINDER_SCHEDULED precondition", () => {
  const GOOD_SUMMARY = {
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
  void test("allSatisfied=true when all three preconditions met", () => {
    const input = {
      caseEntity: makeCaseEntity({
        entryConfirmedAt: "2026-04-01T00:00:00.000Z",
      }),
      currentResidencePeriod: GOOD_SUMMARY,
    };
    assert.equal(checkSuccessCloseoutPreconditions(input).allSatisfied, true);
  });
  void test("allSatisfied=false when reminderCreated=false (reminder failure scenario)", () => {
    const input = {
      caseEntity: makeCaseEntity({
        entryConfirmedAt: "2026-04-01T00:00:00.000Z",
      }),
      currentResidencePeriod: { ...GOOD_SUMMARY, reminderCreated: false },
    };
    const result = checkSuccessCloseoutPreconditions(input);
    assert.equal(result.allSatisfied, false);
    const reminderGate = result.preconditions.find(
      (p) =>
        p.code ===
        SUCCESS_CLOSEOUT_PRECONDITION_CODES.RENEWAL_REMINDER_SCHEDULED,
    );
    assert.ok(reminderGate);
    assert.equal(reminderGate.satisfied, false);
    assert.equal(reminderGate.label, "续签提醒生成済み");
  });
  void test("only RENEWAL_REMINDER_SCHEDULED is unsatisfied when reminder failed but others OK", () => {
    const input = {
      caseEntity: makeCaseEntity({
        entryConfirmedAt: "2026-04-01T00:00:00.000Z",
      }),
      currentResidencePeriod: { ...GOOD_SUMMARY, reminderCreated: false },
    };
    const result = checkSuccessCloseoutPreconditions(input);
    assert.equal(
      result.preconditions.find(
        (p) => p.code === SUCCESS_CLOSEOUT_PRECONDITION_CODES.ENTRY_CONFIRMED,
      )?.satisfied,
      true,
      "entry confirmed should be OK",
    );
    assert.equal(
      result.preconditions.find(
        (p) =>
          p.code ===
          SUCCESS_CLOSEOUT_PRECONDITION_CODES.RESIDENCE_PERIOD_RECORDED,
      )?.satisfied,
      true,
      "residence period recorded should be OK",
    );
    assert.equal(
      result.preconditions.find(
        (p) =>
          p.code ===
          SUCCESS_CLOSEOUT_PRECONDITION_CODES.RENEWAL_REMINDER_SCHEDULED,
      )?.satisfied,
      false,
      "ONLY renewal reminder should be unsatisfied",
    );
  });
});
void describe("blocking feedback: no current residence period blocks both RP and reminder gates", () => {
  void test("null currentResidencePeriod fails both RESIDENCE_PERIOD_RECORDED and RENEWAL_REMINDER_SCHEDULED", () => {
    const input = {
      caseEntity: makeCaseEntity({
        entryConfirmedAt: "2026-04-01T00:00:00.000Z",
      }),
      currentResidencePeriod: null,
    };
    const result = checkSuccessCloseoutPreconditions(input);
    assert.equal(result.allSatisfied, false);
    assert.equal(
      result.preconditions.find(
        (p) =>
          p.code ===
          SUCCESS_CLOSEOUT_PRECONDITION_CODES.RESIDENCE_PERIOD_RECORDED,
      )?.satisfied,
      false,
    );
    assert.equal(
      result.preconditions.find(
        (p) =>
          p.code ===
          SUCCESS_CLOSEOUT_PRECONDITION_CODES.RENEWAL_REMINDER_SCHEDULED,
      )?.satisfied,
      false,
    );
  });
});
void describe("blocking feedback: requiresSuccessCloseoutCheck scope", () => {
  void test("only applies to BMV cases at S8", () => {
    assert.equal(requiresSuccessCloseoutCheck(makeCaseEntity()), true);
  });
  void test("does not apply to non-BMV case types", () => {
    assert.equal(
      requiresSuccessCloseoutCheck(
        makeCaseEntity({ caseTypeCode: "family_stay" }),
      ),
      false,
    );
  });
  void test("does not apply at stages before S8", () => {
    for (const stage of ["S1", "S2", "S3", "S4", "S5", "S6", "S7"]) {
      assert.equal(
        requiresSuccessCloseoutCheck(makeCaseEntity({ stage, status: stage })),
        false,
        `should not apply at ${stage}`,
      );
    }
  });
  void test("does not apply at S9 (already closed)", () => {
    assert.equal(
      requiresSuccessCloseoutCheck(
        makeCaseEntity({ stage: "S9", status: "S9" }),
      ),
      false,
    );
  });
});
void describe("blocking feedback: end-to-end — reminder failure leaves blocking state", () => {
  void test("reminder INSERT failure → reminderCreated=false → closeout blocked", async () => {
    const { svc } = createService(reminderFailureQueryFn());
    const created = await svc.create(makeCtx(), BASE_INPUT);
    assert.equal(created.reminderCreated, false);
    const closeoutCheck = checkSuccessCloseoutPreconditions({
      caseEntity: makeCaseEntity({
        entryConfirmedAt: "2026-04-01T00:00:00.000Z",
      }),
      currentResidencePeriod: {
        id: created.id,
        visaType: created.visaType,
        statusOfResidence: created.statusOfResidence,
        periodYears: created.periodYears,
        periodLabel: created.periodLabel,
        validFrom: created.validFrom,
        validUntil: created.validUntil,
        cardNumber: created.cardNumber,
        entryDate: created.entryDate,
        reminderCreated: created.reminderCreated,
      },
    });
    assert.equal(
      closeoutCheck.allSatisfied,
      false,
      "success closeout must be blocked when reminders failed",
    );
    assert.equal(
      closeoutCheck.preconditions.find(
        (p) =>
          p.code ===
          SUCCESS_CLOSEOUT_PRECONDITION_CODES.RENEWAL_REMINDER_SCHEDULED,
      )?.satisfied,
      false,
    );
  });
  void test("successful reminder creation → reminderCreated=true → closeout allowed", async () => {
    const insertedReminders = [];
    const { svc } = createService(happyPathQueryFn({ insertedReminders }));
    const result = await svc.create(makeCtx(), BASE_INPUT);
    assert.equal(result.reminderCreated, true);
    const closeoutCheck = checkSuccessCloseoutPreconditions({
      caseEntity: makeCaseEntity({
        entryConfirmedAt: "2026-04-01T00:00:00.000Z",
      }),
      currentResidencePeriod: {
        id: result.id,
        visaType: result.visaType,
        statusOfResidence: result.statusOfResidence,
        periodYears: result.periodYears,
        periodLabel: result.periodLabel,
        validFrom: result.validFrom,
        validUntil: result.validUntil,
        cardNumber: result.cardNumber,
        entryDate: result.entryDate,
        reminderCreated: result.reminderCreated,
      },
    });
    assert.equal(
      closeoutCheck.allSatisfied,
      true,
      "success closeout should be allowed after successful reminder creation",
    );
  });
});
void describe("blocking feedback: precondition ordering is deterministic", () => {
  void test("preconditions always ordered: ENTRY_CONFIRMED → RESIDENCE_PERIOD_RECORDED → RENEWAL_REMINDER_SCHEDULED", () => {
    const input = {
      caseEntity: makeCaseEntity({ entryConfirmedAt: null }),
      currentResidencePeriod: null,
    };
    const result = checkSuccessCloseoutPreconditions(input);
    assert.equal(result.preconditions.length, 3);
    assert.equal(
      result.preconditions[0]?.code,
      SUCCESS_CLOSEOUT_PRECONDITION_CODES.ENTRY_CONFIRMED,
    );
    assert.equal(
      result.preconditions[1]?.code,
      SUCCESS_CLOSEOUT_PRECONDITION_CODES.RESIDENCE_PERIOD_RECORDED,
    );
    assert.equal(
      result.preconditions[2]?.code,
      SUCCESS_CLOSEOUT_PRECONDITION_CODES.RENEWAL_REMINDER_SCHEDULED,
    );
  });
});
//# sourceMappingURL=residencePeriods.reminder-blueprint.flow.focused.test.js.map
