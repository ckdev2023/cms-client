import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_REMINDER_SCHEDULE,
  RECIPIENT_TYPE_MAP,
  resolveRecipientType,
  resolveReminderPlans,
} from "./reminderBlueprintContract";
import { BMV_REMINDER_SCHEDULE_BLUEPRINT } from "../cases/bmvTemplateConfig";
// ─── DEFAULT_REMINDER_SCHEDULE ─────────────────────────────────
void test("DEFAULT_REMINDER_SCHEDULE has 3 items at 180/90/30 daysBefore", () => {
  assert.equal(DEFAULT_REMINDER_SCHEDULE.length, 3);
  assert.deepEqual(
    DEFAULT_REMINDER_SCHEDULE.map((i) => i.daysBefore),
    [180, 90, 30],
  );
});
void test("DEFAULT_REMINDER_SCHEDULE uses in_app channel for all items", () => {
  for (const item of DEFAULT_REMINDER_SCHEDULE) {
    assert.equal(item.channel, "in_app");
  }
});
void test("DEFAULT_REMINDER_SCHEDULE uses owner recipientType for all items", () => {
  for (const item of DEFAULT_REMINDER_SCHEDULE) {
    assert.equal(item.recipientType, "owner");
  }
});
void test("DEFAULT_REMINDER_SCHEDULE aligns with BMV_REMINDER_SCHEDULE_BLUEPRINT offsets", () => {
  assert.deepEqual(
    DEFAULT_REMINDER_SCHEDULE.map((i) => i.daysBefore),
    BMV_REMINDER_SCHEDULE_BLUEPRINT.map((i) => i.daysBefore),
  );
});
// ─── RECIPIENT_TYPE_MAP ────────────────────────────────────────
void test("RECIPIENT_TYPE_MAP maps owner to internal_user", () => {
  assert.equal(RECIPIENT_TYPE_MAP.owner, "internal_user");
});
void test("RECIPIENT_TYPE_MAP maps assistant to internal_user", () => {
  assert.equal(RECIPIENT_TYPE_MAP.assistant, "internal_user");
});
// ─── resolveRecipientType ──────────────────────────────────────
void test("resolveRecipientType returns internal_user for owner", () => {
  assert.equal(resolveRecipientType("owner"), "internal_user");
});
void test("resolveRecipientType returns internal_user for assistant", () => {
  assert.equal(resolveRecipientType("assistant"), "internal_user");
});
void test("resolveRecipientType falls back to internal_user for unknown type", () => {
  assert.equal(resolveRecipientType("unknown_type"), "internal_user");
});
// ─── resolveReminderPlans — default schedule ───────────────────
void test("resolveReminderPlans returns 3 plans for default schedule", () => {
  const plans = resolveReminderPlans(
    DEFAULT_REMINDER_SCHEDULE,
    "period-1",
    "2027-01-01",
  );
  assert.equal(plans.length, 3);
});
void test("resolveReminderPlans dedupeKey format is residence_period:<id>:<days>", () => {
  const plans = resolveReminderPlans(
    DEFAULT_REMINDER_SCHEDULE,
    "period-abc",
    "2027-06-15",
  );
  assert.equal(plans[0]?.dedupeKey, "residence_period:period-abc:180");
  assert.equal(plans[1]?.dedupeKey, "residence_period:period-abc:90");
  assert.equal(plans[2]?.dedupeKey, "residence_period:period-abc:30");
});
void test("resolveReminderPlans computes remindAt as validUntil minus daysBefore", () => {
  const plans = resolveReminderPlans(
    DEFAULT_REMINDER_SCHEDULE,
    "p1",
    "2027-07-04",
  );
  const base = Date.UTC(2027, 6, 4, 0, 0, 0, 0);
  for (const plan of plans) {
    const expected = new Date(
      base - plan.daysBefore * 24 * 60 * 60 * 1000,
    ).toISOString();
    assert.equal(plan.remindAt, expected);
  }
});
void test("resolveReminderPlans propagates channel from blueprint items", () => {
  const plans = resolveReminderPlans(
    DEFAULT_REMINDER_SCHEDULE,
    "p1",
    "2027-01-01",
  );
  for (const plan of plans) {
    assert.equal(plan.channel, "in_app");
  }
});
void test("resolveReminderPlans resolves recipientType from blueprint items", () => {
  const plans = resolveReminderPlans(
    DEFAULT_REMINDER_SCHEDULE,
    "p1",
    "2027-01-01",
  );
  for (const plan of plans) {
    assert.equal(plan.recipientType, "internal_user");
  }
});
void test("resolveReminderPlans propagates label from blueprint items", () => {
  const plans = resolveReminderPlans(
    DEFAULT_REMINDER_SCHEDULE,
    "p1",
    "2027-01-01",
  );
  assert.equal(plans[0]?.label, "在留到期前180天提醒");
  assert.equal(plans[1]?.label, "在留到期前90天提醒");
  assert.equal(plans[2]?.label, "在留到期前30天提醒");
});
// ─── resolveReminderPlans — custom blueprint ───────────────────
void test("resolveReminderPlans uses custom blueprint offsets and channels", () => {
  const custom = [
    {
      daysBefore: 365,
      channel: "in_app",
      recipientType: "owner",
      label: "1年前",
    },
    {
      daysBefore: 60,
      channel: "in_app",
      recipientType: "assistant",
      label: "60日前",
    },
  ];
  const plans = resolveReminderPlans(custom, "p2", "2028-03-01");
  assert.equal(plans.length, 2);
  assert.equal(plans[0]?.daysBefore, 365);
  assert.equal(plans[0]?.channel, "in_app");
  assert.equal(plans[0]?.recipientType, "internal_user");
  assert.equal(plans[1]?.daysBefore, 60);
  assert.equal(plans[1]?.recipientType, "internal_user");
});
void test("resolveReminderPlans with empty blueprint returns empty array", () => {
  const plans = resolveReminderPlans([], "p3", "2027-01-01");
  assert.equal(plans.length, 0);
});
// ─── resolveReminderPlans — BMV blueprint ──────────────────────
void test("resolveReminderPlans with BMV blueprint matches default schedule semantics", () => {
  const defaultPlans = resolveReminderPlans(
    DEFAULT_REMINDER_SCHEDULE,
    "same-period",
    "2027-12-31",
  );
  const bmvPlans = resolveReminderPlans(
    BMV_REMINDER_SCHEDULE_BLUEPRINT,
    "same-period",
    "2027-12-31",
  );
  assert.equal(bmvPlans.length, defaultPlans.length);
  for (let i = 0; i < bmvPlans.length; i++) {
    assert.equal(bmvPlans[i]?.daysBefore, defaultPlans[i]?.daysBefore);
    assert.equal(bmvPlans[i]?.remindAt, defaultPlans[i]?.remindAt);
    assert.equal(bmvPlans[i]?.dedupeKey, defaultPlans[i]?.dedupeKey);
    assert.equal(bmvPlans[i]?.channel, defaultPlans[i]?.channel);
    assert.equal(bmvPlans[i]?.recipientType, defaultPlans[i]?.recipientType);
  }
});
// ─── resolveReminderPlans — error cases ────────────────────────
void test("resolveReminderPlans throws on invalid validUntil", () => {
  assert.throws(
    () => resolveReminderPlans(DEFAULT_REMINDER_SCHEDULE, "p1", "invalid"),
    /Invalid validUntil/,
  );
});
void test("resolveReminderPlans throws on empty validUntil", () => {
  assert.throws(
    () => resolveReminderPlans(DEFAULT_REMINDER_SCHEDULE, "p1", ""),
    /Invalid validUntil/,
  );
});
//# sourceMappingURL=reminderBlueprintContract.test.js.map
