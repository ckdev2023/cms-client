import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  CASE_ID,
  CUSTOMER_ID,
  PERIOD_ID,
  USER_ID,
  createService,
  makeCtx,
  makeResidencePeriodRow,
} from "./residencePeriods.focused.test-support";

// ═══════════════════════════════════════════════════════════════
// BUG-067: syncExpiryReminders catch(err) + logger.error
// ═══════════════════════════════════════════════════════════════

function makeHappyPathQueryFn(
  hooks?: Partial<{
    onReminderInsert: (sql: string, params?: unknown[]) => void;
  }>,
) {
  return (sql: string, params?: unknown[]) => {
    if (sql.includes("case_type_code") && sql.includes("from cases"))
      return Promise.resolve({
        rows: [{ case_type_code: "business_manager_visa" }],
        rowCount: 1,
      });
    if (sql.includes("from cases") && sql.includes("customer_id"))
      return Promise.resolve({
        rows: [{ id: CASE_ID, customer_id: CUSTOMER_ID }],
        rowCount: 1,
      });
    if (sql.includes("from customers"))
      return Promise.resolve({ rows: [{ id: CUSTOMER_ID }], rowCount: 1 });
    if (
      sql.includes("update residence_periods") &&
      sql.includes("set is_current = false")
    )
      return Promise.resolve({ rows: [], rowCount: 0 });
    if (sql.includes("insert into residence_periods"))
      return Promise.resolve({
        rows: [makeResidencePeriodRow()],
        rowCount: 1,
      });
    if (sql.includes("from case_templates"))
      return Promise.resolve({ rows: [], rowCount: 0 });
    if (
      sql.includes("update reminders") &&
      sql.includes("set send_status = 'canceled'")
    )
      return Promise.resolve({ rows: [], rowCount: 0 });
    if (sql.includes("select owner_user_id") && sql.includes("from cases"))
      return Promise.resolve({
        rows: [{ owner_user_id: USER_ID }],
        rowCount: 1,
      });
    if (sql.includes("insert into reminders")) {
      hooks?.onReminderInsert?.(sql, params);
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    if (
      sql.includes("update residence_periods") &&
      sql.includes("reminder_created")
    )
      return Promise.resolve({ rows: [], rowCount: 1 });
    return Promise.resolve({ rows: [], rowCount: 0 });
  };
}

void describe("BUG-067: reminder error logging and 180/90/30 alignment", () => {
  void test("create inserts 3 reminders with remindAt = validUntil - 180/90/30 days (fixed values)", async () => {
    const reminderInserts: { sql: string; params?: unknown[] }[] = [];
    const { svc } = createService(
      makeHappyPathQueryFn({
        onReminderInsert: (sql, params) => {
          reminderInserts.push({ sql, params });
        },
      }),
    );

    const created = await svc.create(makeCtx(), {
      caseId: CASE_ID,
      customerId: CUSTOMER_ID,
      visaType: "business_manager",
      statusOfResidence: "経営・管理",
      validFrom: "2026-01-01",
      validUntil: "2027-01-01",
      isCurrent: true,
    });

    assert.equal(created.reminderCreated, true);
    assert.equal(
      reminderInserts.length,
      3,
      "should insert exactly 3 reminders",
    );

    const remindAtValues = reminderInserts.map((call) => {
      assert.ok(call.params, "reminder INSERT should have params");
      return call.params[4] as string;
    });
    assert.deepEqual(remindAtValues.sort(), [
      "2026-07-05T00:00:00.000Z",
      "2026-10-03T00:00:00.000Z",
      "2026-12-02T00:00:00.000Z",
    ]);
  });

  void test("reminder INSERT failure logs error with reason via console.error", async () => {
    const errors: string[] = [];
    // eslint-disable-next-line no-console
    const origError = console.error;
    // eslint-disable-next-line no-console
    console.error = (msg: string) => errors.push(msg);

    try {
      const { svc } = createService((sql, params) => {
        if (sql.includes("insert into reminders"))
          return Promise.reject(new Error("column type mismatch"));
        return makeHappyPathQueryFn()(sql, params);
      });

      const created = await svc.create(makeCtx(), {
        caseId: CASE_ID,
        customerId: CUSTOMER_ID,
        visaType: "business_manager",
        statusOfResidence: "経営・管理",
        validFrom: "2026-01-01",
        validUntil: "2027-01-01",
        isCurrent: true,
      });

      assert.equal(created.reminderCreated, false);
      assert.ok(
        errors.some(
          (m) =>
            m.includes("syncExpiryReminders") &&
            m.includes(PERIOD_ID) &&
            m.includes("column type mismatch"),
        ),
        "should log error with period ID and failure reason",
      );
    } finally {
      // eslint-disable-next-line no-console
      console.error = origError;
    }
  });
});
