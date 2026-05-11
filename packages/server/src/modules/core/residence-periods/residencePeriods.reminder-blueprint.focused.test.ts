import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_REMINDER_SCHEDULE,
  resolveReminderPlans,
  resolveRecipientType,
} from "./reminderBlueprintContract";
import {} from "../cases/cases.types-residence-closeout";
import { BMV_REMINDER_SCHEDULE_BLUEPRINT } from "../cases/bmvTemplateConfig";
import {
  BASE_INPUT,
  CASE_ID,
  CUSTOMER_ID,
  PERIOD_ID,
  USER_ID,
  createService,
  happyPathQueryFn,
  makeCtx,
  makeResidencePeriodRow,
  ok,
} from "./residencePeriods.reminder-blueprint.focused.test-support";

// ═══════════════════════════════════════════════════════════════
// 1. 生成時機 — blueprint lookup → reminders INSERT 触発条件
// ═══════════════════════════════════════════════════════════════

void describe("generation timing: isCurrent gate", () => {
  void test("create with isCurrent=true triggers reminder INSERT", async () => {
    const insertedReminders: unknown[][] = [];
    const { svc } = createService(
      happyPathQueryFn({ insertedReminders, isCurrent: true }),
    );

    const result = await svc.create(makeCtx(), {
      ...BASE_INPUT,
      isCurrent: true,
    });

    assert.equal(insertedReminders.length, 3);
    assert.equal(result.reminderCreated, true);
  });

  void test("create with isCurrent=false skips reminder INSERT entirely", async () => {
    const insertedReminders: unknown[][] = [];
    const { svc } = createService(
      happyPathQueryFn({ insertedReminders, isCurrent: false }),
    );

    const result = await svc.create(makeCtx(), {
      ...BASE_INPUT,
      isCurrent: false,
    });

    assert.equal(insertedReminders.length, 0);
    assert.equal(result.reminderCreated, false);
  });

  void test("create with isCurrent=undefined (default false) skips reminder INSERT", async () => {
    const insertedReminders: unknown[][] = [];
    const { svc } = createService(
      happyPathQueryFn({ insertedReminders, isCurrent: false }),
    );

    const inputWithoutCurrent = Object.fromEntries(
      Object.entries(BASE_INPUT).filter(([key]) => key !== "isCurrent"),
    ) as Omit<typeof BASE_INPUT, "isCurrent">;
    const result = await svc.create(makeCtx(), inputWithoutCurrent);

    assert.equal(insertedReminders.length, 0);
    assert.equal(result.reminderCreated, false);
  });
});

void describe("generation timing: blueprint resolution order", () => {
  void test("uses template blueprint when case_templates row has valid array", async () => {
    const customBlueprint = [
      {
        daysBefore: 365,
        channel: "in_app",
        recipientType: "owner",
        label: "1年前",
      },
    ];
    const insertedReminders: unknown[][] = [];
    const { svc } = createService(
      happyPathQueryFn({
        templateBlueprint: customBlueprint,
        insertedReminders,
      }),
    );

    await svc.create(makeCtx(), BASE_INPUT);

    assert.equal(insertedReminders.length, 1);
    const dedupeKey = insertedReminders[0]?.[8] as string;
    assert.ok(dedupeKey.includes(":365"), "should use custom 365-day offset");
  });

  void test("falls back to DEFAULT_REMINDER_SCHEDULE when no template row", async () => {
    const insertedReminders: unknown[][] = [];
    const { svc } = createService(
      happyPathQueryFn({ templateBlueprint: undefined, insertedReminders }),
    );

    await svc.create(makeCtx(), BASE_INPUT);

    assert.equal(insertedReminders.length, 3);
    const dedupeKeys = insertedReminders.map((p) => p[8] as string);
    assert.ok(dedupeKeys.some((k) => k.includes(":180")));
    assert.ok(dedupeKeys.some((k) => k.includes(":90")));
    assert.ok(dedupeKeys.some((k) => k.includes(":30")));
  });

  void test("falls back to DEFAULT_REMINDER_SCHEDULE when template blueprint is null", async () => {
    const insertedReminders: unknown[][] = [];
    const { svc } = createService(
      happyPathQueryFn({ templateBlueprint: null, insertedReminders }),
    );

    await svc.create(makeCtx(), BASE_INPUT);
    assert.equal(insertedReminders.length, 3);
  });

  void test("falls back to DEFAULT_REMINDER_SCHEDULE when template blueprint is empty array", async () => {
    const insertedReminders: unknown[][] = [];
    const { svc } = createService(
      happyPathQueryFn({ templateBlueprint: [], insertedReminders }),
    );

    await svc.create(makeCtx(), BASE_INPUT);
    assert.equal(
      insertedReminders.length,
      3,
      "empty array blueprint should trigger default schedule fallback",
    );
  });
});

void describe("generation timing: cancel-before-create cycle", () => {
  void test("existing pending reminders are canceled before new ones are created", async () => {
    const callOrder: string[] = [];
    const { svc } = createService((sql) => {
      if (sql.includes("case_type_code") && sql.includes("from cases"))
        return ok([{ case_type_code: "business_manager_visa" }]);
      if (sql.includes("from cases") && sql.includes("customer_id"))
        return ok([{ id: CASE_ID, customer_id: CUSTOMER_ID }]);
      if (sql.includes("from customers")) return ok([{ id: CUSTOMER_ID }]);
      if (
        sql.includes("update residence_periods") &&
        sql.includes("set is_current = false")
      )
        return ok([], 0);
      if (sql.includes("insert into residence_periods"))
        return ok([makeResidencePeriodRow()]);
      if (sql.includes("from case_templates")) return ok([], 0);
      if (
        sql.includes("update reminders") &&
        sql.includes("set send_status = 'canceled'")
      ) {
        callOrder.push("cancel");
        return ok([], 2);
      }
      if (sql.includes("select owner_user_id"))
        return ok([{ owner_user_id: USER_ID }]);
      if (sql.includes("insert into reminders")) {
        callOrder.push("insert");
        return ok([], 1);
      }
      if (
        sql.includes("update residence_periods") &&
        sql.includes("reminder_created")
      )
        return ok([], 1);
      return ok();
    });

    await svc.create(makeCtx(), BASE_INPUT);

    const cancelIdx = callOrder.indexOf("cancel");
    const firstInsertIdx = callOrder.indexOf("insert");
    assert.ok(cancelIdx >= 0, "should have cancel call");
    assert.ok(firstInsertIdx >= 0, "should have insert call");
    assert.ok(
      cancelIdx < firstInsertIdx,
      "cancel must happen before first insert",
    );
  });

  void test("cancel targets correct dedupe_key pattern", async () => {
    let cancelParams: unknown[] | undefined;
    const { svc } = createService((sql, params) => {
      if (sql.includes("case_type_code") && sql.includes("from cases"))
        return ok([{ case_type_code: "business_manager_visa" }]);
      if (sql.includes("from cases") && sql.includes("customer_id"))
        return ok([{ id: CASE_ID, customer_id: CUSTOMER_ID }]);
      if (sql.includes("from customers")) return ok([{ id: CUSTOMER_ID }]);
      if (
        sql.includes("update residence_periods") &&
        sql.includes("set is_current = false")
      )
        return ok([], 0);
      if (sql.includes("insert into residence_periods"))
        return ok([makeResidencePeriodRow()]);
      if (sql.includes("from case_templates")) return ok([], 0);
      if (
        sql.includes("update reminders") &&
        sql.includes("set send_status = 'canceled'")
      ) {
        cancelParams = params;
        return ok([], 0);
      }
      if (sql.includes("select owner_user_id"))
        return ok([{ owner_user_id: USER_ID }]);
      if (sql.includes("insert into reminders")) return ok([], 1);
      if (
        sql.includes("update residence_periods") &&
        sql.includes("reminder_created")
      )
        return ok([], 1);
      return ok();
    });

    await svc.create(makeCtx(), BASE_INPUT);

    assert.ok(cancelParams, "cancel query should have been called");
    const keyParams = cancelParams.slice(1);
    for (const key of keyParams) {
      assert.ok(
        (key as string).startsWith(`residence_period:${PERIOD_ID}:`),
        `dedupe key should start with residence_period:${PERIOD_ID}:`,
      );
    }
  });
});

void describe("generation timing: owner resolution", () => {
  void test("reminder recipient_id is set to case owner_user_id", async () => {
    const OWNER_ID = "00000000-0000-4000-8000-000000000099";
    const insertedReminders: unknown[][] = [];
    const { svc } = createService((sql, params) => {
      if (sql.includes("case_type_code") && sql.includes("from cases"))
        return ok([{ case_type_code: "business_manager_visa" }]);
      if (sql.includes("from cases") && sql.includes("customer_id"))
        return ok([{ id: CASE_ID, customer_id: CUSTOMER_ID }]);
      if (sql.includes("from customers")) return ok([{ id: CUSTOMER_ID }]);
      if (
        sql.includes("update residence_periods") &&
        sql.includes("set is_current = false")
      )
        return ok([], 0);
      if (sql.includes("insert into residence_periods"))
        return ok([makeResidencePeriodRow()]);
      if (sql.includes("from case_templates")) return ok([], 0);
      if (
        sql.includes("update reminders") &&
        sql.includes("set send_status = 'canceled'")
      )
        return ok([], 0);
      if (sql.includes("select owner_user_id") && sql.includes("from cases"))
        return ok([{ owner_user_id: OWNER_ID }]);
      if (sql.includes("insert into reminders")) {
        insertedReminders.push(params ?? []);
        return ok([], 1);
      }
      if (
        sql.includes("update residence_periods") &&
        sql.includes("reminder_created")
      )
        return ok([], 1);
      return ok();
    });

    await svc.create(makeCtx(), BASE_INPUT);

    assert.equal(insertedReminders.length, 3);
    for (const rp of insertedReminders) {
      assert.equal(rp[6], OWNER_ID, "recipient_id should be case owner");
    }
  });

  void test("returns false (no reminders) when case owner cannot be resolved", async () => {
    const insertedReminders: unknown[][] = [];
    const { svc } = createService((sql, params) => {
      if (sql.includes("case_type_code") && sql.includes("from cases"))
        return ok([{ case_type_code: "business_manager_visa" }]);
      if (sql.includes("from cases") && sql.includes("customer_id"))
        return ok([{ id: CASE_ID, customer_id: CUSTOMER_ID }]);
      if (sql.includes("from customers")) return ok([{ id: CUSTOMER_ID }]);
      if (
        sql.includes("update residence_periods") &&
        sql.includes("set is_current = false")
      )
        return ok([], 0);
      if (sql.includes("insert into residence_periods"))
        return ok([makeResidencePeriodRow()]);
      if (sql.includes("from case_templates")) return ok([], 0);
      if (
        sql.includes("update reminders") &&
        sql.includes("set send_status = 'canceled'")
      )
        return ok([], 0);
      if (sql.includes("select owner_user_id") && sql.includes("from cases"))
        return ok([], 0);
      if (sql.includes("insert into reminders")) {
        insertedReminders.push(params ?? []);
        return ok([], 1);
      }
      return ok();
    });

    const result = await svc.create(makeCtx(), BASE_INPUT);

    assert.equal(
      insertedReminders.length,
      0,
      "no reminders when owner missing",
    );
    assert.equal(result.reminderCreated, false);
  });
});

void describe("generation timing: remindAt computation from validUntil", () => {
  void test("remindAt is validUntil minus daysBefore for each blueprint item", () => {
    const plans = resolveReminderPlans(
      DEFAULT_REMINDER_SCHEDULE,
      PERIOD_ID,
      "2027-06-15",
    );
    const baseMs = Date.UTC(2027, 5, 15, 0, 0, 0, 0);

    for (const plan of plans) {
      const expectedMs = baseMs - plan.daysBefore * 24 * 60 * 60 * 1000;
      assert.equal(plan.remindAt, new Date(expectedMs).toISOString());
    }
  });

  void test("180-day reminder for 2027-01-01 falls in mid-July 2026", () => {
    const plans = resolveReminderPlans(
      DEFAULT_REMINDER_SCHEDULE,
      PERIOD_ID,
      "2027-01-01",
    );
    const r180 = plans.find((p) => p.daysBefore === 180);
    assert.ok(r180);
    const remindDate = new Date(r180.remindAt);
    assert.equal(remindDate.getUTCMonth(), 6, "July = month index 6");
    assert.equal(remindDate.getUTCFullYear(), 2026);
  });
});

void describe("generation timing: dedupeKey uniqueness", () => {
  void test("each blueprint item produces unique dedupeKey per period", () => {
    const plans = resolveReminderPlans(
      DEFAULT_REMINDER_SCHEDULE,
      "period-xyz",
      "2027-01-01",
    );
    const keys = plans.map((p) => p.dedupeKey);
    const uniqueKeys = new Set(keys);
    assert.equal(uniqueKeys.size, keys.length, "all dedupeKeys must be unique");
  });

  void test("different periodIds produce different dedupeKeys for same daysBefore", () => {
    const plansA = resolveReminderPlans(
      DEFAULT_REMINDER_SCHEDULE,
      "period-AAA",
      "2027-01-01",
    );
    const plansB = resolveReminderPlans(
      DEFAULT_REMINDER_SCHEDULE,
      "period-BBB",
      "2027-01-01",
    );

    for (let i = 0; i < plansA.length; i++) {
      assert.notEqual(
        plansA[i]?.dedupeKey,
        plansB[i]?.dedupeKey,
        "dedupeKeys must differ across periods",
      );
    }
  });
});

void describe("generation timing: recipientType resolution", () => {
  void test("owner maps to internal_user", () => {
    assert.equal(resolveRecipientType("owner"), "internal_user");
  });

  void test("assistant maps to internal_user", () => {
    assert.equal(resolveRecipientType("assistant"), "internal_user");
  });

  void test("unknown recipientType degrades to internal_user", () => {
    assert.equal(resolveRecipientType("customer"), "internal_user");
    assert.equal(resolveRecipientType(""), "internal_user");
  });
});

void describe("generation timing: BMV blueprint alignment with defaults", () => {
  void test("BMV blueprint daysBefore offsets match DEFAULT_REMINDER_SCHEDULE", () => {
    assert.deepEqual(
      BMV_REMINDER_SCHEDULE_BLUEPRINT.map((i) => i.daysBefore),
      DEFAULT_REMINDER_SCHEDULE.map((i) => i.daysBefore),
    );
  });

  void test("BMV blueprint produces identical remindAt as default for same validUntil", () => {
    const bmv = resolveReminderPlans(
      BMV_REMINDER_SCHEDULE_BLUEPRINT,
      "same",
      "2027-12-31",
    );
    const def = resolveReminderPlans(
      DEFAULT_REMINDER_SCHEDULE,
      "same",
      "2027-12-31",
    );

    assert.equal(bmv.length, def.length);
    for (let i = 0; i < bmv.length; i++) {
      assert.equal(bmv[i]?.remindAt, def[i]?.remindAt);
    }
  });
});
