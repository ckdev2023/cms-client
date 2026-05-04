import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { shouldIncrementSupplementCount } from "./cases.service";
import {
  CASE_ID,
  makeCaseRow,
  makeCtx,
  makePool,
  makeTemplates,
  ok,
  svc,
} from "./cases.final-payment-coe-guard.focused.test-support";
// ════════════════════════════════════════════════════════════════
// BUG-099 / BUG-118: supplement_count 真相源收口
//
// 业务规范：
//   - supplement_count 的真相源是 submission_packages 表中
//     submission_kind='supplement' 的记录数
//   - phase-transition 路径（path1）和补正包创建路径（path2）
//     都通过 recalcSupplementCount 重算回写
//   - shouldIncrementSupplementCount 仅作为是否触发 recalc 的门控
// ════════════════════════════════════════════════════════════════
void describe("shouldIncrementSupplementCount: 触发条件 (BUG-099)", () => {
  void test("UNDER_REVIEW → NEED_SUPPLEMENT 触发递增", () => {
    assert.equal(
      shouldIncrementSupplementCount("UNDER_REVIEW", "NEED_SUPPLEMENT"),
      true,
    );
  });
  void test("其他来源进入 NEED_SUPPLEMENT 不递增（防御）", () => {
    assert.equal(
      shouldIncrementSupplementCount("APPLYING", "NEED_SUPPLEMENT"),
      false,
    );
    assert.equal(
      shouldIncrementSupplementCount("REVIEWING", "NEED_SUPPLEMENT"),
      false,
    );
  });
  void test("NEED_SUPPLEMENT → SUPPLEMENT_PROCESSING 不递增", () => {
    assert.equal(
      shouldIncrementSupplementCount(
        "NEED_SUPPLEMENT",
        "SUPPLEMENT_PROCESSING",
      ),
      false,
    );
  });
  void test("SUPPLEMENT_PROCESSING → UNDER_REVIEW 不递增", () => {
    assert.equal(
      shouldIncrementSupplementCount("SUPPLEMENT_PROCESSING", "UNDER_REVIEW"),
      false,
    );
  });
  void test("APPROVED / REJECTED 等其他流转不递增", () => {
    for (const [from, to] of [
      ["UNDER_REVIEW", "APPROVED"],
      ["UNDER_REVIEW", "REJECTED"],
      ["WAITING_PAYMENT", "COE_SENT"],
      ["COE_SENT", "VISA_APPLYING"],
    ]) {
      assert.equal(
        shouldIncrementSupplementCount(from, to),
        false,
        `${from} → ${to} 不应触发 supplement 递增`,
      );
    }
  });
});
void describe("transitionPhase: recalcSupplementCount (BUG-118)", () => {
  void test("UNDER_REVIEW → NEED_SUPPLEMENT 触发 recalc 查询", async () => {
    const calls = [];
    const pool = makePool((sql, p) => {
      calls.push({ sql: sql.trim(), params: p });
      if (sql.includes("update cases") && sql.includes("business_phase = $2"))
        return ok([
          makeCaseRow({
            business_phase: "NEED_SUPPLEMENT",
            supplement_count: 0,
          }),
        ]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([
          makeCaseRow({
            business_phase: "UNDER_REVIEW",
            supplement_count: 0,
          }),
        ]);
      if (
        sql.includes("FROM submission_packages") &&
        sql.includes("submission_kind = 'supplement'")
      )
        return ok([{ cnt: "1" }]);
      if (sql.includes("UPDATE cases") && sql.includes("supplement_count = $2"))
        return ok();
      return ok();
    });
    const updated = await svc(pool, makeTemplates()).transitionPhase(
      makeCtx(),
      CASE_ID,
      { toPhase: "NEED_SUPPLEMENT" },
    );
    assert.equal(updated.businessPhase, "NEED_SUPPLEMENT");
    assert.equal(updated.supplementCount, 1);
    const countCall = calls.find(
      (c) =>
        c.sql.includes("submission_packages") &&
        c.sql.includes("submission_kind = 'supplement'"),
    );
    assert.ok(
      countCall,
      "should issue count query against submission_packages",
    );
    assert.deepEqual(countCall.params, [CASE_ID]);
    const recalcUpdate = calls.find(
      (c) =>
        c.sql.includes("UPDATE cases") &&
        c.sql.includes("supplement_count = $2"),
    );
    assert.ok(recalcUpdate, "should issue recalc UPDATE for supplement_count");
    assert.deepEqual(recalcUpdate.params, [CASE_ID, 1]);
  });
  void test("NEED_SUPPLEMENT → SUPPLEMENT_PROCESSING 不触发 recalc", async () => {
    const calls = [];
    const pool = makePool((sql, p) => {
      calls.push({ sql: sql.trim(), params: p });
      if (sql.includes("update cases") && sql.includes("business_phase = $2"))
        return ok([
          makeCaseRow({
            business_phase: "SUPPLEMENT_PROCESSING",
            supplement_count: 1,
          }),
        ]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([
          makeCaseRow({
            business_phase: "NEED_SUPPLEMENT",
            supplement_count: 1,
          }),
        ]);
      return ok();
    });
    await svc(pool, makeTemplates()).transitionPhase(makeCtx(), CASE_ID, {
      toPhase: "SUPPLEMENT_PROCESSING",
    });
    const countCall = calls.find(
      (c) =>
        c.sql.includes("submission_packages") &&
        c.sql.includes("submission_kind = 'supplement'"),
    );
    assert.equal(
      countCall,
      undefined,
      "should NOT issue count query for non-increment transition",
    );
  });
  void test("SUPPLEMENT_PROCESSING → UNDER_REVIEW 不触发 recalc", async () => {
    const calls = [];
    const pool = makePool((sql, p) => {
      calls.push({ sql: sql.trim(), params: p });
      if (sql.includes("update cases") && sql.includes("business_phase = $2"))
        return ok([
          makeCaseRow({
            business_phase: "UNDER_REVIEW",
            supplement_count: 1,
          }),
        ]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([
          makeCaseRow({
            business_phase: "SUPPLEMENT_PROCESSING",
            supplement_count: 1,
          }),
        ]);
      return ok();
    });
    await svc(pool, makeTemplates()).transitionPhase(makeCtx(), CASE_ID, {
      toPhase: "UNDER_REVIEW",
    });
    const countCall = calls.find(
      (c) =>
        c.sql.includes("submission_packages") &&
        c.sql.includes("submission_kind = 'supplement'"),
    );
    assert.equal(countCall, undefined);
  });
  void test("两轮 NEED_SUPPLEMENT 各触发 recalc（真相源对齐）", async () => {
    const calls = [];
    let currentPhase = "UNDER_REVIEW";
    let supplementPkgCount = 0;
    const pool = makePool((sql, p) => {
      calls.push({ sql: sql.trim(), params: p });
      if (sql.includes("update cases") && sql.includes("business_phase = $2")) {
        const toPhase = String(p?.[1]);
        currentPhase = toPhase;
        return ok([
          makeCaseRow({
            business_phase: toPhase,
            supplement_count: supplementPkgCount,
          }),
        ]);
      }
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([
          makeCaseRow({
            business_phase: currentPhase,
            supplement_count: supplementPkgCount,
          }),
        ]);
      if (
        sql.includes("FROM submission_packages") &&
        sql.includes("submission_kind = 'supplement'")
      ) {
        supplementPkgCount += 1;
        return ok([{ cnt: String(supplementPkgCount) }]);
      }
      if (sql.includes("UPDATE cases") && sql.includes("supplement_count = $2"))
        return ok();
      return ok();
    });
    const cases = svc(pool, makeTemplates());
    for (let i = 1; i <= 2; i += 1) {
      const r1 = await cases.transitionPhase(makeCtx(), CASE_ID, {
        toPhase: "NEED_SUPPLEMENT",
      });
      assert.equal(r1.businessPhase, "NEED_SUPPLEMENT");
      assert.equal(r1.supplementCount, i, `cycle ${String(i)}: recalc`);
      const r2 = await cases.transitionPhase(makeCtx(), CASE_ID, {
        toPhase: "SUPPLEMENT_PROCESSING",
      });
      assert.equal(
        r2.supplementCount,
        supplementPkgCount,
        `cycle ${String(i)}: keep on prep`,
      );
      const r3 = await cases.transitionPhase(makeCtx(), CASE_ID, {
        toPhase: "UNDER_REVIEW",
      });
      assert.equal(
        r3.supplementCount,
        supplementPkgCount,
        `cycle ${String(i)}: keep on resubmit`,
      );
    }
  });
  void test("timeline payload 在递增时携带 supplementCount 字段", async () => {
    const calls = [];
    const pool = makePool((sql, p) => {
      calls.push({ sql: sql.trim(), params: p });
      if (sql.includes("update cases") && sql.includes("business_phase = $2"))
        return ok([
          makeCaseRow({
            business_phase: "NEED_SUPPLEMENT",
            supplement_count: 2,
          }),
        ]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([
          makeCaseRow({
            business_phase: "UNDER_REVIEW",
            supplement_count: 2,
          }),
        ]);
      if (
        sql.includes("FROM submission_packages") &&
        sql.includes("submission_kind = 'supplement'")
      )
        return ok([{ cnt: "3" }]);
      if (sql.includes("UPDATE cases") && sql.includes("supplement_count = $2"))
        return ok();
      return ok();
    });
    await svc(pool, makeTemplates()).transitionPhase(makeCtx(), CASE_ID, {
      toPhase: "NEED_SUPPLEMENT",
    });
    const timelineCall = calls.find((c) =>
      c.sql.includes("insert into timeline_logs"),
    );
    assert.ok(timelineCall);
    const payloadJson = (timelineCall.params ?? [])[5];
    const payload = JSON.parse(String(payloadJson));
    assert.equal(payload.from, "UNDER_REVIEW");
    assert.equal(payload.to, "NEED_SUPPLEMENT");
    assert.equal(payload.supplementCount, 3);
  });
  void test("非补资料 phase 流转不在 timeline payload 写入 supplementCount", async () => {
    const calls = [];
    const pool = makePool((sql, p) => {
      calls.push({ sql: sql.trim(), params: p });
      if (sql.includes("update cases") && sql.includes("business_phase = $2"))
        return ok([
          makeCaseRow({
            business_phase: "WAITING_MATERIAL",
            supplement_count: 0,
          }),
        ]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([
          makeCaseRow({
            business_phase: "CONTRACTED",
            supplement_count: 0,
          }),
        ]);
      return ok();
    });
    await svc(pool, makeTemplates()).transitionPhase(makeCtx(), CASE_ID, {
      toPhase: "WAITING_MATERIAL",
    });
    const timelineCall = calls.find((c) =>
      c.sql.includes("insert into timeline_logs"),
    );
    assert.ok(timelineCall);
    const payloadJson = (timelineCall.params ?? [])[5];
    const payload = JSON.parse(String(payloadJson));
    assert.equal(payload.supplementCount, undefined);
  });
  void test("UPDATE SQL 不再包含 supplement_count 内联递增", async () => {
    const calls = [];
    const pool = makePool((sql, p) => {
      calls.push({ sql: sql.trim(), params: p });
      if (sql.includes("update cases") && sql.includes("business_phase = $2"))
        return ok([
          makeCaseRow({
            business_phase: "NEED_SUPPLEMENT",
            supplement_count: 0,
          }),
        ]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([
          makeCaseRow({
            business_phase: "UNDER_REVIEW",
            supplement_count: 0,
          }),
        ]);
      if (sql.includes("FROM submission_packages")) return ok([{ cnt: "1" }]);
      if (sql.includes("UPDATE cases") && sql.includes("supplement_count = $2"))
        return ok();
      return ok();
    });
    await svc(pool, makeTemplates()).transitionPhase(makeCtx(), CASE_ID, {
      toPhase: "NEED_SUPPLEMENT",
    });
    const phaseUpdateCall = calls.find(
      (c) =>
        c.sql.includes("update cases") && c.sql.includes("business_phase = $2"),
    );
    assert.ok(phaseUpdateCall);
    assert.doesNotMatch(
      phaseUpdateCall.sql,
      /supplement_count\s*=\s*case/,
      "phase UPDATE SQL must not contain inline supplement_count logic",
    );
    assert.doesNotMatch(
      phaseUpdateCall.sql,
      /supplement_count\s*\+\s*1/,
      "phase UPDATE SQL must not contain supplement_count + 1",
    );
  });
});
//# sourceMappingURL=cases.phase-transition-supplement-count.focused.test.js.map
