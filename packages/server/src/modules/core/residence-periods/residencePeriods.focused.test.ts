import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { mapResidencePeriodRow } from "./residencePeriods.service";
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
// A. 聚合 — create / list / update aggregation edges
// ═══════════════════════════════════════════════════════════════

void describe("aggregation: isCurrent uniqueness per customer", () => {
  void test("create with isCurrent=true clears previous current periods for same customer", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const { svc } = createService((sql, params) => {
      calls.push({ sql, params });
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
        return Promise.resolve({ rows: [], rowCount: 2 });
      if (sql.includes("insert into residence_periods"))
        return Promise.resolve({
          rows: [makeResidencePeriodRow()],
          rowCount: 1,
        });
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
      if (sql.includes("insert into reminders"))
        return Promise.resolve({ rows: [], rowCount: 1 });
      if (
        sql.includes("update residence_periods") &&
        sql.includes("reminder_created = true")
      )
        return Promise.resolve({ rows: [], rowCount: 1 });
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    await svc.create(makeCtx(), {
      caseId: CASE_ID,
      customerId: CUSTOMER_ID,
      visaType: "business_manager",
      statusOfResidence: "経営・管理",
      validFrom: "2026-01-01",
      validUntil: "2027-01-01",
      isCurrent: true,
    });

    const clearCall = calls.find(
      (call) =>
        call.sql.includes("update residence_periods") &&
        call.sql.includes("set is_current = false"),
    );
    assert.ok(clearCall, "should clear previous current periods");
    assert.ok(Array.isArray(clearCall.params));
    assert.ok(
      clearCall.params.includes(CUSTOMER_ID),
      "clear should target same customer",
    );
  });

  void test("create with isCurrent=false does NOT clear previous current periods", async () => {
    const calls: { sql: string }[] = [];
    const { svc } = createService((sql) => {
      calls.push({ sql });
      if (sql.includes("from cases") && sql.includes("customer_id"))
        return Promise.resolve({
          rows: [{ id: CASE_ID, customer_id: CUSTOMER_ID }],
          rowCount: 1,
        });
      if (sql.includes("from customers"))
        return Promise.resolve({ rows: [{ id: CUSTOMER_ID }], rowCount: 1 });
      if (sql.includes("insert into residence_periods"))
        return Promise.resolve({
          rows: [makeResidencePeriodRow({ is_current: false })],
          rowCount: 1,
        });
      if (sql.includes("update reminders"))
        return Promise.resolve({ rows: [], rowCount: 0 });
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    await svc.create(makeCtx(), {
      caseId: CASE_ID,
      customerId: CUSTOMER_ID,
      visaType: "business_manager",
      statusOfResidence: "経営・管理",
      validFrom: "2026-01-01",
      validUntil: "2027-01-01",
      isCurrent: false,
    });

    const clearCall = calls.find(
      (call) =>
        call.sql.includes("update residence_periods") &&
        call.sql.includes("set is_current = false"),
    );
    assert.ok(!clearCall, "should NOT clear when isCurrent=false");
  });
});

void describe("aggregation: 180/90/30 reminder scheduling", () => {
  void test("create with isCurrent=true generates exactly 3 reminders", async () => {
    const reminderInserts: { sql: string; params?: unknown[] }[] = [];
    const { svc } = createService((sql, params) => {
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
      if (sql.includes("update reminders"))
        return Promise.resolve({ rows: [], rowCount: 0 });
      if (sql.includes("select owner_user_id"))
        return Promise.resolve({
          rows: [{ owner_user_id: USER_ID }],
          rowCount: 1,
        });
      if (sql.includes("insert into reminders")) {
        reminderInserts.push({ sql, params });
        return Promise.resolve({ rows: [], rowCount: 1 });
      }
      if (
        sql.includes("update residence_periods") &&
        sql.includes("reminder_created")
      )
        return Promise.resolve({ rows: [], rowCount: 1 });
      return Promise.resolve({ rows: [], rowCount: 0 });
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

    assert.equal(reminderInserts.length, 3, "should insert 3 reminders");
    assert.equal(created.reminderCreated, true);

    const dedupeKeys = reminderInserts.map((reminder) => {
      const idx = reminder.params?.findIndex(
        (param) =>
          typeof param === "string" && param.startsWith("residence_period:"),
      );
      return idx !== undefined && idx >= 0
        ? (reminder.params?.[idx] as string)
        : null;
    });
    assert.ok(
      dedupeKeys.some((key) => key?.includes(":180")),
      "should have 180-day reminder",
    );
    assert.ok(
      dedupeKeys.some((key) => key?.includes(":90")),
      "should have 90-day reminder",
    );
    assert.ok(
      dedupeKeys.some((key) => key?.includes(":30")),
      "should have 30-day reminder",
    );
  });

  void test("create with isCurrent=false generates zero reminders", async () => {
    const reminderInserts: unknown[] = [];
    const { svc } = createService((sql) => {
      if (sql.includes("from cases") && sql.includes("customer_id"))
        return Promise.resolve({
          rows: [{ id: CASE_ID, customer_id: CUSTOMER_ID }],
          rowCount: 1,
        });
      if (sql.includes("from customers"))
        return Promise.resolve({ rows: [{ id: CUSTOMER_ID }], rowCount: 1 });
      if (sql.includes("insert into residence_periods"))
        return Promise.resolve({
          rows: [makeResidencePeriodRow({ is_current: false })],
          rowCount: 1,
        });
      if (sql.includes("update reminders"))
        return Promise.resolve({ rows: [], rowCount: 0 });
      if (sql.includes("insert into reminders")) {
        reminderInserts.push(1);
        return Promise.resolve({ rows: [], rowCount: 1 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const created = await svc.create(makeCtx(), {
      caseId: CASE_ID,
      customerId: CUSTOMER_ID,
      visaType: "business_manager",
      statusOfResidence: "経営・管理",
      validFrom: "2026-01-01",
      validUntil: "2027-01-01",
      isCurrent: false,
    });

    assert.equal(reminderInserts.length, 0, "should NOT insert reminders");
    assert.equal(created.reminderCreated, false);
  });

  void test("update: changing validUntil cancels old reminders and creates new ones", async () => {
    let canceledReminders = false;
    const newReminderInserts: unknown[] = [];

    const { svc } = createService((sql) => {
      if (sql.includes("from residence_periods") && sql.includes("for update"))
        return Promise.resolve({
          rows: [makeResidencePeriodRow()],
          rowCount: 1,
        });
      if (
        sql.includes("update residence_periods") &&
        sql.includes("set is_current = false")
      )
        return Promise.resolve({ rows: [], rowCount: 0 });
      if (
        sql.includes("update residence_periods") &&
        sql.includes("set visa_type")
      )
        return Promise.resolve({
          rows: [makeResidencePeriodRow({ valid_until: "2028-01-01" })],
          rowCount: 1,
        });
      if (
        sql.includes("update reminders") &&
        sql.includes("set send_status = 'canceled'")
      ) {
        canceledReminders = true;
        return Promise.resolve({ rows: [], rowCount: 3 });
      }
      if (sql.includes("select owner_user_id"))
        return Promise.resolve({
          rows: [{ owner_user_id: USER_ID }],
          rowCount: 1,
        });
      if (sql.includes("insert into reminders")) {
        newReminderInserts.push(1);
        return Promise.resolve({ rows: [], rowCount: 1 });
      }
      if (
        sql.includes("update residence_periods") &&
        sql.includes("reminder_created")
      )
        return Promise.resolve({ rows: [], rowCount: 1 });
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    await svc.update(makeCtx(), PERIOD_ID, { validUntil: "2028-01-01" });

    assert.ok(canceledReminders, "should cancel old reminders");
    assert.equal(
      newReminderInserts.length,
      3,
      "should create 3 new reminders for updated validUntil",
    );
  });
});

void describe("aggregation: list filtering", () => {
  void test("list with expiringBefore filters correctly", async () => {
    const listCalls: { sql: string; params?: unknown[] }[] = [];
    const { svc } = createService((sql, params) => {
      if (sql.includes("count(*)::text")) {
        listCalls.push({ sql, params });
        return Promise.resolve({ rows: [{ count: "2" }], rowCount: 1 });
      }
      if (sql.includes("from residence_periods")) {
        listCalls.push({ sql, params });
        return Promise.resolve({
          rows: [
            makeResidencePeriodRow({ valid_until: "2026-06-01" }),
            makeResidencePeriodRow({
              id: "period-2",
              valid_until: "2026-09-01",
            }),
          ],
          rowCount: 2,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const result = await svc.list(makeCtx(), {
      caseId: CASE_ID,
      expiringBefore: "2027-01-01",
    });

    assert.equal(result.total, 2);
    assert.ok(
      listCalls.some((call) => call.sql.includes("valid_until <=")),
      "should apply expiringBefore filter",
    );
  });

  void test("list orders by valid_until asc, created_at desc", async () => {
    const listCalls: { sql: string }[] = [];
    const { svc } = createService((sql) => {
      listCalls.push({ sql });
      if (sql.includes("count(*)::text"))
        return Promise.resolve({ rows: [{ count: "0" }], rowCount: 1 });
      if (sql.includes("from residence_periods"))
        return Promise.resolve({ rows: [], rowCount: 0 });
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    await svc.list(makeCtx(), { caseId: CASE_ID });

    const selectCall = listCalls.find(
      (call) =>
        call.sql.includes("from residence_periods") &&
        call.sql.includes("order by"),
    );
    assert.ok(selectCall, "should have order by clause");
    assert.ok(
      selectCall.sql.includes("valid_until asc"),
      "should order by valid_until ascending",
    );
  });
});

void describe("aggregation: row mapping completeness", () => {
  void test("maps all extended fields including entryDate and reminderCreated", () => {
    const row = makeResidencePeriodRow({
      entry_date: "2026-04-15",
      reminder_created: true,
      period_years: 3,
      period_label: "3年",
      card_number: "XY9876543ZW",
    });
    const mapped = mapResidencePeriodRow(row);

    assert.equal(mapped.entryDate, "2026-04-15");
    assert.equal(mapped.reminderCreated, true);
    assert.equal(mapped.periodYears, 3);
    assert.equal(mapped.periodLabel, "3年");
    assert.equal(mapped.cardNumber, "XY9876543ZW");
    assert.equal(mapped.isCurrent, true);
    assert.equal(mapped.caseId, CASE_ID);
    assert.equal(mapped.customerId, CUSTOMER_ID);
  });

  void test("maps null entry_date correctly", () => {
    const mapped = mapResidencePeriodRow(
      makeResidencePeriodRow({ entry_date: null }),
    );
    assert.equal(mapped.entryDate, null);
  });

  void test("maps null period_years to null (not 0)", () => {
    const mapped = mapResidencePeriodRow(
      makeResidencePeriodRow({ period_years: null }),
    );
    assert.equal(mapped.periodYears, null);
  });
});

void describe("aggregation: date validation", () => {
  void test("create rejects validFrom > validUntil", async () => {
    const { svc } = createService(() =>
      Promise.resolve({ rows: [], rowCount: 0 }),
    );

    await assert.rejects(
      () =>
        svc.create(makeCtx(), {
          caseId: CASE_ID,
          customerId: CUSTOMER_ID,
          visaType: "business_manager",
          statusOfResidence: "経営・管理",
          validFrom: "2027-06-01",
          validUntil: "2026-01-01",
        }),
      /validFrom must be earlier than or equal to validUntil/,
    );
  });

  void test("create rejects negative periodYears", async () => {
    const { svc } = createService(() =>
      Promise.resolve({ rows: [], rowCount: 0 }),
    );

    await assert.rejects(
      () =>
        svc.create(makeCtx(), {
          caseId: CASE_ID,
          customerId: CUSTOMER_ID,
          visaType: "business_manager",
          statusOfResidence: "経営・管理",
          validFrom: "2026-01-01",
          validUntil: "2027-01-01",
          periodYears: -1,
        }),
      /periodYears must be a non-negative integer/,
    );
  });
});

void describe("aggregation: case-customer mismatch guard", () => {
  void test("create rejects when customerId does not match case owner customer", async () => {
    const { svc } = createService((sql) => {
      if (sql.includes("from cases") && sql.includes("customer_id"))
        return Promise.resolve({
          rows: [{ id: CASE_ID, customer_id: "other-customer" }],
          rowCount: 1,
        });
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    await assert.rejects(
      () =>
        svc.create(makeCtx(), {
          caseId: CASE_ID,
          customerId: CUSTOMER_ID,
          visaType: "business_manager",
          statusOfResidence: "経営・管理",
          validFrom: "2026-01-01",
          validUntil: "2027-01-01",
        }),
      /customerId does not match case owner customer/,
    );
  });
});
