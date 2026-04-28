import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  CASE_ID,
  ITEM_ID,
  createService,
  makeCtx,
  makeItemRow,
  makePool,
  makeTimeline,
} from "./documentItems.questionnaire-docs.focused.test-support";

// ────────────────────────────────────────────────────────────────
// 1. 存储契约：questionnaire 资料项 + survey_data 的创建与持久化
// ────────────────────────────────────────────────────────────────

void describe("questionnaire document storage", () => {
  void test("create: persists category=questionnaire with null survey_data", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const pool = makePool((sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("insert into document_items")) {
        return Promise.resolve({
          rows: [makeItemRow()],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const timeline = makeTimeline();
    const svc = createService(pool, timeline);
    const item = await svc.create(makeCtx(), {
      caseId: CASE_ID,
      checklistItemCode: "bmv-questionnaire",
      name: "経営管理ビザ情報表",
      category: "questionnaire",
    });

    assert.equal(item.category, "questionnaire");
    assert.equal(item.surveyData, null);
    assert.equal(timeline.writes.length, 1);

    const insertCall = calls.find((c) =>
      c.sql.includes("insert into document_items"),
    );
    assert.ok(insertCall);
    assert.ok(
      insertCall.params?.includes("questionnaire"),
      "category param passed to INSERT",
    );
  });

  void test("create: persists category=questionnaire with initial survey_data", async () => {
    const payload = {
      companyName: "株式会社テスト",
      capitalAmount: 5000000,
      businessPlan: { summary: "..." },
    };
    const calls: { sql: string; params?: unknown[] }[] = [];
    const pool = makePool((sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("insert into document_items")) {
        return Promise.resolve({
          rows: [makeItemRow({ survey_data: payload })],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const svc = createService(pool, makeTimeline());
    const item = await svc.create(makeCtx(), {
      caseId: CASE_ID,
      checklistItemCode: "bmv-questionnaire",
      name: "経営管理ビザ情報表",
      category: "questionnaire",
      surveyData: payload,
    });

    assert.deepEqual(item.surveyData, payload);

    const insertCall = calls.find((c) =>
      c.sql.includes("insert into document_items"),
    );
    assert.ok(insertCall);
    const jsonParam = insertCall.params?.find(
      (p) => typeof p === "string" && p.includes("companyName"),
    );
    assert.ok(jsonParam, "survey_data serialized as JSON in INSERT");
  });

  void test("create: rejects survey_data on non-questionnaire category", async () => {
    const pool = makePool(() => Promise.resolve({ rows: [], rowCount: 0 }));
    const svc = createService(pool, makeTimeline());

    await assert.rejects(
      () =>
        svc.create(makeCtx(), {
          caseId: CASE_ID,
          checklistItemCode: "passport",
          name: "Passport",
          category: "standard",
          surveyData: { test: true },
        }),
      (err) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes("questionnaire"));
        return true;
      },
    );
  });

  void test("create: rejects survey_data when category is omitted (null)", async () => {
    const pool = makePool(() => Promise.resolve({ rows: [], rowCount: 0 }));
    const svc = createService(pool, makeTimeline());

    await assert.rejects(
      () =>
        svc.create(makeCtx(), {
          caseId: CASE_ID,
          checklistItemCode: "passport",
          name: "Passport",
          surveyData: { test: true },
        }),
      (err) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes("questionnaire"));
        return true;
      },
    );
  });

  void test("updateSurveyData: updates existing questionnaire item", async () => {
    const newPayload = { businessPlan: { revenue: 2000000 } };
    const pool = makePool((sql, params) => {
      if (
        sql.includes("update document_items") &&
        sql.includes("survey_data")
      ) {
        return Promise.resolve({
          rows: [makeItemRow({ survey_data: newPayload })],
          rowCount: 1,
        });
      }
      if (sql.includes("from document_items") && params?.[0] === ITEM_ID) {
        return Promise.resolve({
          rows: [makeItemRow()],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const timeline = makeTimeline();
    const svc = createService(pool, timeline);
    const updated = await svc.updateSurveyData(makeCtx(), ITEM_ID, {
      surveyData: newPayload,
    });

    assert.deepEqual(updated.surveyData, newPayload);
    assert.equal(timeline.writes.length, 1);
    const action = (timeline.writes[0] as Record<string, unknown>).action;
    assert.equal(action, "document_item.survey_data_updated");
  });

  void test("updateSurveyData: clears survey_data to null", async () => {
    const pool = makePool((sql, params) => {
      if (
        sql.includes("update document_items") &&
        sql.includes("survey_data")
      ) {
        return Promise.resolve({
          rows: [makeItemRow({ survey_data: null })],
          rowCount: 1,
        });
      }
      if (sql.includes("from document_items") && params?.[0] === ITEM_ID) {
        return Promise.resolve({
          rows: [makeItemRow({ survey_data: { old: "data" } })],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const svc = createService(pool, makeTimeline());
    const updated = await svc.updateSurveyData(makeCtx(), ITEM_ID, {
      surveyData: null,
    });
    assert.equal(updated.surveyData, null);
  });

  void test("updateSurveyData: rejects on standard category item", async () => {
    const pool = makePool((sql, params) => {
      if (sql.includes("from document_items") && params?.[0] === ITEM_ID) {
        return Promise.resolve({
          rows: [makeItemRow({ category: "standard" })],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const svc = createService(pool, makeTimeline());
    await assert.rejects(
      () =>
        svc.updateSurveyData(makeCtx(), ITEM_ID, {
          surveyData: { test: true },
        }),
      (err) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes("questionnaire"));
        return true;
      },
    );
  });

  void test("updateSurveyData: rejects on null category item", async () => {
    const pool = makePool((sql, params) => {
      if (sql.includes("from document_items") && params?.[0] === ITEM_ID) {
        return Promise.resolve({
          rows: [makeItemRow({ category: null })],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const svc = createService(pool, makeTimeline());
    await assert.rejects(
      () =>
        svc.updateSurveyData(makeCtx(), ITEM_ID, {
          surveyData: { test: true },
        }),
      (err) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes("questionnaire"));
        return true;
      },
    );
  });

  void test("updateSurveyData: rejects when item not found", async () => {
    const pool = makePool(() => Promise.resolve({ rows: [], rowCount: 0 }));
    const svc = createService(pool, makeTimeline());

    await assert.rejects(
      () =>
        svc.updateSurveyData(makeCtx(), "nonexistent", {
          surveyData: { test: true },
        }),
      (err) => {
        assert.ok(err instanceof Error);
        return true;
      },
    );
  });
});

// ────────────────────────────────────────────────────────────────
// 2. 聚合契约：completion rate 的 questionnaire 分组统计
// ────────────────────────────────────────────────────────────────

void describe("questionnaire aggregation — completion rate", () => {
  void test("questionnaire items counted separately in completion rate", async () => {
    const pool = makePool((sql) => {
      if (/^(begin|commit|rollback|select set_config)/i.test(sql.trim())) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      return Promise.resolve({
        rows: [
          { status: "approved", category: null, count: "3" },
          { status: "pending", category: null, count: "2" },
          { status: "approved", category: "questionnaire", count: "1" },
          { status: "pending", category: "questionnaire", count: "1" },
        ],
        rowCount: 4,
      });
    });

    const svc = createService(pool, makeTimeline());
    const rate = await svc.getCompletionRate(makeCtx(), CASE_ID);

    assert.equal(rate.total, 7, "total includes questionnaire items");
    assert.equal(
      rate.completed,
      4,
      "completed includes questionnaire approved",
    );
    assert.equal(rate.questionnaireTotal, 2);
    assert.equal(rate.questionnaireCompleted, 1);
    assert.equal(rate.questionnaireCompletionRate, 50);
  });

  void test("questionnaire waived items count as completed", async () => {
    const pool = makePool((sql) => {
      if (/^(begin|commit|rollback|select set_config)/i.test(sql.trim())) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      return Promise.resolve({
        rows: [
          { status: "waived", category: "questionnaire", count: "1" },
          { status: "approved", category: "questionnaire", count: "1" },
        ],
        rowCount: 2,
      });
    });

    const svc = createService(pool, makeTimeline());
    const rate = await svc.getCompletionRate(makeCtx(), CASE_ID);

    assert.equal(rate.questionnaireTotal, 2);
    assert.equal(rate.questionnaireCompleted, 2);
    assert.equal(rate.questionnaireCompletionRate, 100);
  });

  void test("no questionnaire items yields zero questionnaire fields", async () => {
    const pool = makePool((sql) => {
      if (/^(begin|commit|rollback|select set_config)/i.test(sql.trim())) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      return Promise.resolve({
        rows: [
          { status: "approved", category: "standard", count: "5" },
          { status: "pending", category: null, count: "3" },
        ],
        rowCount: 2,
      });
    });

    const svc = createService(pool, makeTimeline());
    const rate = await svc.getCompletionRate(makeCtx(), CASE_ID);

    assert.equal(rate.total, 8);
    assert.equal(rate.questionnaireTotal, 0);
    assert.equal(rate.questionnaireCompleted, 0);
    assert.equal(rate.questionnaireCompletionRate, 0);
  });

  void test("empty case yields all-zero completion rate", async () => {
    const pool = makePool((sql) => {
      if (/^(begin|commit|rollback|select set_config)/i.test(sql.trim())) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const svc = createService(pool, makeTimeline());
    const rate = await svc.getCompletionRate(makeCtx(), CASE_ID);

    assert.equal(rate.total, 0);
    assert.equal(rate.completionRate, 0);
    assert.equal(rate.questionnaireTotal, 0);
    assert.equal(rate.questionnaireCompletionRate, 0);
  });

  void test("mixed categories: questionnaire + standard + null all aggregated correctly", async () => {
    const pool = makePool((sql) => {
      if (/^(begin|commit|rollback|select set_config)/i.test(sql.trim())) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      return Promise.resolve({
        rows: [
          { status: "approved", category: "questionnaire", count: "2" },
          { status: "pending", category: "questionnaire", count: "3" },
          { status: "approved", category: "standard", count: "4" },
          { status: "waived", category: null, count: "1" },
          { status: "pending", category: "standard", count: "2" },
        ],
        rowCount: 5,
      });
    });

    const svc = createService(pool, makeTimeline());
    const rate = await svc.getCompletionRate(makeCtx(), CASE_ID);

    assert.equal(rate.total, 12);
    assert.equal(rate.approved, 6);
    assert.equal(rate.waived, 1);
    assert.equal(rate.completed, 7);
    assert.equal(rate.questionnaireTotal, 5);
    assert.equal(rate.questionnaireCompleted, 2);
    assert.equal(rate.questionnaireCompletionRate, 40);
  });
});
