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
// D. 180/90/30 提醒生成失败回滚 — SAVEPOINT safety
// ═══════════════════════════════════════════════════════════════
void describe("reminder rollback: SAVEPOINT isolates reminder INSERT failures", () => {
  void test("reminder INSERT failure sets reminderCreated=false, period still created", async () => {
    let savepointIssued = false;
    let rollbackIssued = false;
    const { svc } = createService((sql) => {
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
      if (
        sql.toUpperCase().includes("SAVEPOINT SP_REMINDERS") &&
        !sql.toUpperCase().includes("ROLLBACK")
      ) {
        savepointIssued = true;
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      if (sql.includes("insert into reminders")) {
        return Promise.reject(
          new Error("DB constraint violation on reminders"),
        );
      }
      if (sql.toUpperCase().includes("ROLLBACK TO SAVEPOINT SP_REMINDERS")) {
        rollbackIssued = true;
        return Promise.resolve({ rows: [], rowCount: 0 });
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
      isCurrent: true,
    });
    assert.equal(
      created.reminderCreated,
      false,
      "reminderCreated should be false after rollback",
    );
    assert.ok(savepointIssued, "SAVEPOINT should be issued before INSERT");
    assert.ok(
      rollbackIssued,
      "ROLLBACK TO SAVEPOINT should be issued on failure",
    );
  });
  void test("successful reminder INSERT releases savepoint and sets reminderCreated=true", async () => {
    let savepointReleased = false;
    const { svc } = createService((sql) => {
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
      if (
        sql.toUpperCase().includes("SAVEPOINT SP_REMINDERS") &&
        !sql.toUpperCase().includes("ROLLBACK") &&
        !sql.toUpperCase().includes("RELEASE")
      ) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      if (sql.includes("insert into reminders"))
        return Promise.resolve({ rows: [], rowCount: 1 });
      if (sql.toUpperCase().includes("RELEASE SAVEPOINT SP_REMINDERS")) {
        savepointReleased = true;
        return Promise.resolve({ rows: [], rowCount: 0 });
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
    assert.equal(
      created.reminderCreated,
      true,
      "reminderCreated should be true on success",
    );
    assert.ok(
      savepointReleased,
      "RELEASE SAVEPOINT should be issued on success",
    );
  });
  void test("update: reminder failure on update also rolls back gracefully", async () => {
    let rollbackIssued = false;
    const { svc } = createService((sql) => {
      if (sql.includes("from residence_periods") && sql.includes("for update"))
        return Promise.resolve({
          rows: [makeResidencePeriodRow({ reminder_created: true })],
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
      if (sql.includes("update reminders"))
        return Promise.resolve({ rows: [], rowCount: 0 });
      if (sql.includes("select owner_user_id"))
        return Promise.resolve({
          rows: [{ owner_user_id: USER_ID }],
          rowCount: 1,
        });
      if (
        sql.toUpperCase().includes("SAVEPOINT SP_REMINDERS") &&
        !sql.toUpperCase().includes("ROLLBACK") &&
        !sql.toUpperCase().includes("RELEASE")
      )
        return Promise.resolve({ rows: [], rowCount: 0 });
      if (sql.includes("insert into reminders"))
        return Promise.reject(new Error("DB error"));
      if (sql.toUpperCase().includes("ROLLBACK TO SAVEPOINT SP_REMINDERS")) {
        rollbackIssued = true;
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      if (
        sql.includes("update residence_periods") &&
        sql.includes("reminder_created")
      )
        return Promise.resolve({ rows: [], rowCount: 1 });
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    const updated = await svc.update(makeCtx(), PERIOD_ID, {
      validUntil: "2028-01-01",
    });
    assert.equal(
      updated.reminderCreated,
      false,
      "reminderCreated should flip to false on failure",
    );
    assert.ok(rollbackIssued, "ROLLBACK TO SAVEPOINT should be issued");
  });
});
void describe("reminder rollback: non-current period skips reminder generation entirely", () => {
  void test("isCurrent=false: no SAVEPOINT issued, no reminders inserted", async () => {
    let savepointIssued = false;
    const reminderInserts = [];
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
      if (sql.toUpperCase().includes("SAVEPOINT")) {
        savepointIssued = true;
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
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
    assert.equal(created.reminderCreated, false);
    assert.ok(
      !savepointIssued,
      "SAVEPOINT should NOT be issued for non-current",
    );
    assert.equal(reminderInserts.length, 0, "no reminders should be inserted");
  });
});
void describe("closeout: timeline integration for residence period lifecycle", () => {
  void test("create writes timeline entry with residence_period.created action", async () => {
    const { svc, timeline } = createService((sql) => {
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
    });
    assert.equal(timeline.writes.length, 1);
    const entry = timeline.writes[0];
    assert.equal(entry.entityType, "case");
    assert.equal(entry.entityId, CASE_ID);
    assert.equal(entry.action, "residence_period.created");
    const payload = entry.payload;
    assert.equal(payload.residencePeriodId, PERIOD_ID);
    assert.equal(payload.customerId, CUSTOMER_ID);
  });
  void test("update writes timeline entry with residence_period.updated action", async () => {
    const { svc, timeline } = createService((sql) => {
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
          rows: [makeResidencePeriodRow({ notes: "updated" })],
          rowCount: 1,
        });
      if (sql.includes("update reminders"))
        return Promise.resolve({ rows: [], rowCount: 0 });
      if (sql.includes("select owner_user_id"))
        return Promise.resolve({
          rows: [{ owner_user_id: USER_ID }],
          rowCount: 1,
        });
      if (sql.includes("insert into reminders"))
        return Promise.resolve({ rows: [], rowCount: 1 });
      if (
        sql.includes("update residence_periods") &&
        sql.includes("reminder_created")
      )
        return Promise.resolve({ rows: [], rowCount: 1 });
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    await svc.update(makeCtx(), PERIOD_ID, { notes: "updated" });
    assert.equal(timeline.writes.length, 1);
    const entry = timeline.writes[0];
    assert.equal(entry.action, "residence_period.updated");
    assert.equal(entry.entityId, CASE_ID);
  });
});
//# sourceMappingURL=residencePeriods.reminder-rollback.focused.test.js.map
