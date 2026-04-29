import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { resolvePhaseStampEffects } from "./cases.service";
import {
  CASE_ID,
  billingRow,
  makeCaseRow,
  makeCtx,
  makePool,
  makeTemplates,
  ok,
  svc,
} from "./cases.final-payment-coe-guard.focused.test-support";

// ════════════════════════════════════════════════════════════════
// BUG-098: businessPhase 推进必须自动 stamp 操作时间戳
//
// 业务规范：
//   - 进入 COE_SENT → 写 coe_sent_at（首次写入）
//   - 进入 VISA_APPLYING → 写 overseas_visa_start_at（首次写入）
//   - 进入 SUCCESS → 写 entry_confirmed_at（首次写入）
//
// 与 cases.regression-p1-coe-visa-residence.test 区别：
//   - 那一组覆盖 transitionWorkflowStep（workflow_step 维度）
//   - 此处覆盖 transitionPhase（businessPhase 维度）
// ════════════════════════════════════════════════════════════════

void describe("resolvePhaseStampEffects: stamp matrix (BUG-098)", () => {
  void test("COE_SENT stamps coe_sent_at when null, skips when already set", () => {
    const fx1 = resolvePhaseStampEffects(
      makeCaseEntity({ coeSentAt: null }),
      "COE_SENT",
    );
    assert.equal(fx1.stampCoeSent, true);
    assert.equal(fx1.stampOverseasVisa, false);
    assert.equal(fx1.stampEntryConfirmed, false);

    const fx2 = resolvePhaseStampEffects(
      makeCaseEntity({ coeSentAt: "2026-04-10T00:00:00.000Z" }),
      "COE_SENT",
    );
    assert.equal(fx2.stampCoeSent, false);
  });

  void test("VISA_APPLYING stamps overseas_visa_start_at when null", () => {
    const fx = resolvePhaseStampEffects(
      makeCaseEntity({ overseasVisaStartAt: null }),
      "VISA_APPLYING",
    );
    assert.equal(fx.stampCoeSent, false);
    assert.equal(fx.stampOverseasVisa, true);
    assert.equal(fx.stampEntryConfirmed, false);
  });

  void test("VISA_APPLYING does NOT re-stamp overseas_visa_start_at if already set", () => {
    const fx = resolvePhaseStampEffects(
      makeCaseEntity({ overseasVisaStartAt: "2026-04-15T00:00:00.000Z" }),
      "VISA_APPLYING",
    );
    assert.equal(fx.stampOverseasVisa, false);
  });

  void test("SUCCESS stamps entry_confirmed_at when null", () => {
    const fx = resolvePhaseStampEffects(
      makeCaseEntity({ entryConfirmedAt: null }),
      "SUCCESS",
    );
    assert.equal(fx.stampEntryConfirmed, true);
    assert.equal(fx.stampCoeSent, false);
    assert.equal(fx.stampOverseasVisa, false);
  });

  void test("SUCCESS does NOT re-stamp entry_confirmed_at if already set", () => {
    const fx = resolvePhaseStampEffects(
      makeCaseEntity({ entryConfirmedAt: "2026-05-01T00:00:00.000Z" }),
      "SUCCESS",
    );
    assert.equal(fx.stampEntryConfirmed, false);
  });

  void test("non-stamping phases produce no effects", () => {
    for (const phase of [
      "CONSULTING",
      "WAITING_PAYMENT",
      "RESIDENCE_PERIOD_RECORDED",
      "RENEWAL_REMINDER_SCHEDULED",
      "CLOSED_SUCCESS",
      "CLOSED_FAILED",
      "VISA_REJECTED",
      "REJECTED",
    ]) {
      const fx = resolvePhaseStampEffects(makeCaseEntity(), phase);
      assert.equal(fx.stampCoeSent, false, `${phase}: stampCoeSent`);
      assert.equal(fx.stampOverseasVisa, false, `${phase}: stampOverseasVisa`);
      assert.equal(
        fx.stampEntryConfirmed,
        false,
        `${phase}: stampEntryConfirmed`,
      );
    }
  });
});

void describe("transitionPhase: SQL 写入操作时间戳 (BUG-098)", () => {
  void test("WAITING_PAYMENT → COE_SENT stamps coe_sent_at via SQL", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const stampedAt = "2026-04-29T11:00:00.000Z";
    const pool = makePool((sql, p) => {
      calls.push({ sql: sql.trim(), params: p });
      // BUG-111 default-deny：用 gate=off 的尾款节点关闭 gate，专注 stamp 行为
      if (sql.includes("from billing_records") && sql.includes("尾款"))
        return ok([billingRow("off", "due", "0")]);
      if (sql.includes("update cases") && sql.includes("business_phase = $2"))
        return ok([
          makeCaseRow({
            business_phase: "COE_SENT",
            coe_sent_at: stampedAt,
          }),
        ]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([
          makeCaseRow({
            business_phase: "WAITING_PAYMENT",
            coe_sent_at: null,
          }),
        ]);
      return ok();
    });

    const updated = await svc(pool, makeTemplates()).transitionPhase(
      makeCtx(),
      CASE_ID,
      { toPhase: "COE_SENT" },
    );

    assert.equal(updated.businessPhase, "COE_SENT");
    assert.equal(updated.coeSentAt, stampedAt);

    const updateCall = calls.find(
      (c) => c.sql.includes("update cases") && c.sql.includes("business_phase"),
    );
    assert.ok(updateCall, "should issue update cases statement");
    assert.deepEqual(updateCall.params, [
      CASE_ID,
      "COE_SENT",
      "WAITING_PAYMENT",
      true,
      false,
      false,
      null,
      null,
    ]);
  });

  void test("COE_SENT → VISA_APPLYING stamps overseas_visa_start_at via SQL", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const stampedAt = "2026-04-29T12:00:00.000Z";
    const pool = makePool((sql, p) => {
      calls.push({ sql: sql.trim(), params: p });
      if (sql.includes("update cases") && sql.includes("business_phase = $2"))
        return ok([
          makeCaseRow({
            business_phase: "VISA_APPLYING",
            coe_sent_at: "2026-04-20T00:00:00.000Z",
            overseas_visa_start_at: stampedAt,
          }),
        ]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([
          makeCaseRow({
            business_phase: "COE_SENT",
            coe_sent_at: "2026-04-20T00:00:00.000Z",
            overseas_visa_start_at: null,
          }),
        ]);
      return ok();
    });

    const updated = await svc(pool, makeTemplates()).transitionPhase(
      makeCtx(),
      CASE_ID,
      { toPhase: "VISA_APPLYING" },
    );

    assert.equal(updated.businessPhase, "VISA_APPLYING");
    assert.equal(updated.overseasVisaStartAt, stampedAt);

    const updateCall = calls.find(
      (c) => c.sql.includes("update cases") && c.sql.includes("business_phase"),
    );
    assert.ok(updateCall);
    assert.deepEqual(updateCall.params, [
      CASE_ID,
      "VISA_APPLYING",
      "COE_SENT",
      false,
      true,
      false,
      null,
      null,
    ]);
  });

  void test("VISA_APPLYING → SUCCESS stamps entry_confirmed_at via SQL", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const stampedAt = "2026-05-01T00:00:00.000Z";
    const pool = makePool((sql, p) => {
      calls.push({ sql: sql.trim(), params: p });
      if (sql.includes("update cases") && sql.includes("business_phase = $2"))
        return ok([
          makeCaseRow({
            business_phase: "SUCCESS",
            entry_confirmed_at: stampedAt,
          }),
        ]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([
          makeCaseRow({
            business_phase: "VISA_APPLYING",
            overseas_visa_start_at: "2026-04-25T00:00:00.000Z",
            entry_confirmed_at: null,
          }),
        ]);
      return ok();
    });

    const updated = await svc(pool, makeTemplates()).transitionPhase(
      makeCtx(),
      CASE_ID,
      { toPhase: "SUCCESS" },
    );

    assert.equal(updated.businessPhase, "SUCCESS");
    assert.equal(updated.entryConfirmedAt, stampedAt);

    const updateCall = calls.find(
      (c) => c.sql.includes("update cases") && c.sql.includes("business_phase"),
    );
    assert.ok(updateCall);
    assert.deepEqual(updateCall.params, [
      CASE_ID,
      "SUCCESS",
      "VISA_APPLYING",
      false,
      false,
      true,
      null,
      null,
    ]);
  });

  void test("non-stamping phase does not set any stamp flag", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const pool = makePool((sql, p) => {
      calls.push({ sql: sql.trim(), params: p });
      if (sql.includes("update cases") && sql.includes("business_phase = $2"))
        return ok([makeCaseRow({ business_phase: "WAITING_MATERIAL" })]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([makeCaseRow({ business_phase: "CONTRACTED" })]);
      return ok();
    });

    await svc(pool, makeTemplates()).transitionPhase(makeCtx(), CASE_ID, {
      toPhase: "WAITING_MATERIAL",
    });

    const updateCall = calls.find(
      (c) => c.sql.includes("update cases") && c.sql.includes("business_phase"),
    );
    assert.ok(updateCall);
    assert.deepEqual(updateCall.params, [
      CASE_ID,
      "WAITING_MATERIAL",
      "CONTRACTED",
      false,
      false,
      false,
      null,
      null,
    ]);
  });

  void test("re-entering COE_SENT does not overwrite existing coe_sent_at", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const existingStamp = "2026-04-15T00:00:00.000Z";
    const pool = makePool((sql, p) => {
      calls.push({ sql: sql.trim(), params: p });
      if (sql.includes("from billing_records") && sql.includes("尾款"))
        return ok([billingRow("off", "due", "0")]);
      if (sql.includes("update cases") && sql.includes("business_phase = $2"))
        return ok([
          makeCaseRow({
            business_phase: "COE_SENT",
            coe_sent_at: existingStamp,
          }),
        ]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([
          makeCaseRow({
            business_phase: "WAITING_PAYMENT",
            coe_sent_at: existingStamp,
          }),
        ]);
      return ok();
    });

    await svc(pool, makeTemplates()).transitionPhase(makeCtx(), CASE_ID, {
      toPhase: "COE_SENT",
    });

    const updateCall = calls.find(
      (c) => c.sql.includes("update cases") && c.sql.includes("business_phase"),
    );
    assert.ok(updateCall);
    const stampCoeSentParam = (updateCall.params ?? [])[3];
    assert.equal(
      stampCoeSentParam,
      false,
      "should not re-stamp coe_sent_at when already set",
    );
  });

  void test("timeline payload includes stamped timestamps for COE_SENT", async () => {
    const stampedAt = "2026-04-29T11:00:00.000Z";
    const calls: { sql: string; params?: unknown[] }[] = [];
    const pool = makePool((sql, p) => {
      calls.push({ sql: sql.trim(), params: p });
      if (sql.includes("from billing_records") && sql.includes("尾款"))
        return ok([billingRow("off", "due", "0")]);
      if (sql.includes("update cases") && sql.includes("business_phase = $2"))
        return ok([
          makeCaseRow({
            business_phase: "COE_SENT",
            coe_sent_at: stampedAt,
          }),
        ]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([
          makeCaseRow({
            business_phase: "WAITING_PAYMENT",
            coe_sent_at: null,
          }),
        ]);
      return ok();
    });

    await svc(pool, makeTemplates()).transitionPhase(makeCtx(), CASE_ID, {
      toPhase: "COE_SENT",
    });

    const timelineCall = calls.find((c) =>
      c.sql.includes("insert into timeline_logs"),
    );
    assert.ok(timelineCall, "should write phase_transitioned timeline log");
    const payloadJson = (timelineCall.params ?? [])[5];
    assert.equal(typeof payloadJson, "string");
    const payload = JSON.parse(String(payloadJson)) as Record<string, unknown>;
    assert.equal(payload.from, "WAITING_PAYMENT");
    assert.equal(payload.to, "COE_SENT");
    assert.equal(payload.coeSentAt, stampedAt);
    assert.equal(payload.overseasVisaStartAt, null);
    assert.equal(payload.entryConfirmedAt, null);
  });
});

type CaseEntityOverrides = {
  coeSentAt?: string | null;
  overseasVisaStartAt?: string | null;
  entryConfirmedAt?: string | null;
};

function makeCaseEntity(overrides: CaseEntityOverrides = {}) {
  return {
    coeSentAt: overrides.coeSentAt ?? null,
    overseasVisaStartAt: overrides.overseasVisaStartAt ?? null,
    entryConfirmedAt: overrides.entryConfirmedAt ?? null,
  } as never;
}
