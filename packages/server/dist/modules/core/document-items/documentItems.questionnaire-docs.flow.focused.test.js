import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { mapDocumentItemRow } from "./documentItems.service";
import {
  CASE_ID,
  ITEM_ID,
  createService,
  makeCtx,
  makeItemRow,
  makePool,
  makeTimeline,
} from "./documentItems.questionnaire-docs.focused.test-support";
void describe("questionnaire follow-up preconditions", () => {
  void test("followUp: allowed on questionnaire item in pending status", async () => {
    const pool = makePool((sql, params) => {
      if (sql.includes("last_follow_up_at = now()")) {
        return Promise.resolve({
          rows: [
            makeItemRow({
              status: "pending",
              last_follow_up_at: "2026-02-01T00:00:00.000Z",
            }),
          ],
          rowCount: 1,
        });
      }
      if (sql.includes("from document_items") && params?.[0] === ITEM_ID) {
        return Promise.resolve({
          rows: [makeItemRow({ status: "pending" })],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    const timeline = makeTimeline();
    const svc = createService(pool, timeline);
    const result = await svc.followUp(makeCtx(), ITEM_ID);
    assert.equal(result.lastFollowUpAt, "2026-02-01T00:00:00.000Z");
    assert.equal(result.category, "questionnaire");
    assert.equal(timeline.writes.length, 1);
    assert.equal(timeline.writes[0].action, "document_item_follow_up");
  });
  void test("followUp: allowed on questionnaire item in waiting_upload status", async () => {
    const pool = makePool((sql, params) => {
      if (sql.includes("last_follow_up_at = now()")) {
        return Promise.resolve({
          rows: [
            makeItemRow({
              status: "waiting_upload",
              last_follow_up_at: "2026-02-01T00:00:00.000Z",
            }),
          ],
          rowCount: 1,
        });
      }
      if (sql.includes("from document_items") && params?.[0] === ITEM_ID) {
        return Promise.resolve({
          rows: [makeItemRow({ status: "waiting_upload" })],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    const svc = createService(pool, makeTimeline());
    const result = await svc.followUp(makeCtx(), ITEM_ID);
    assert.equal(result.status, "waiting_upload");
    assert.ok(result.lastFollowUpAt);
  });
  void test("followUp: allowed on questionnaire item in revision_required status", async () => {
    const pool = makePool((sql, params) => {
      if (sql.includes("last_follow_up_at = now()")) {
        return Promise.resolve({
          rows: [
            makeItemRow({
              status: "revision_required",
              last_follow_up_at: "2026-02-01T00:00:00.000Z",
            }),
          ],
          rowCount: 1,
        });
      }
      if (sql.includes("from document_items") && params?.[0] === ITEM_ID) {
        return Promise.resolve({
          rows: [makeItemRow({ status: "revision_required" })],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    const svc = createService(pool, makeTimeline());
    const result = await svc.followUp(makeCtx(), ITEM_ID);
    assert.equal(result.status, "revision_required");
    assert.ok(result.lastFollowUpAt);
  });
  void test("followUp: rejected on non-questionnaire item in pending status", async () => {
    const pool = makePool((sql, params) => {
      if (sql.includes("from document_items") && params?.[0] === ITEM_ID) {
        return Promise.resolve({
          rows: [makeItemRow({ status: "pending", category: null })],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    const svc = createService(pool, makeTimeline());
    await assert.rejects(
      () => svc.followUp(makeCtx(), ITEM_ID),
      (err) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes("Cannot follow up"));
        return true;
      },
    );
  });
  void test("followUp: rejected on questionnaire item in approved status", async () => {
    const pool = makePool((sql, params) => {
      if (sql.includes("from document_items") && params?.[0] === ITEM_ID) {
        return Promise.resolve({
          rows: [makeItemRow({ status: "approved" })],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    const svc = createService(pool, makeTimeline());
    await assert.rejects(
      () => svc.followUp(makeCtx(), ITEM_ID),
      (err) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes("Cannot follow up"));
        return true;
      },
    );
  });
  void test("followUp: rejected on questionnaire item in waived status", async () => {
    const pool = makePool((sql, params) => {
      if (sql.includes("from document_items") && params?.[0] === ITEM_ID) {
        return Promise.resolve({
          rows: [makeItemRow({ status: "waived" })],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    const svc = createService(pool, makeTimeline());
    await assert.rejects(
      () => svc.followUp(makeCtx(), ITEM_ID),
      (err) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes("Cannot follow up"));
        return true;
      },
    );
  });
});
void describe("questionnaire list filtering", () => {
  void test("list: filters by category=questionnaire", async () => {
    const calls = [];
    const pool = makePool((sql, params) => {
      calls.push({ sql: sql.trim(), params });
      if (sql.includes("count(*)")) {
        return Promise.resolve({ rows: [{ count: "2" }], rowCount: 1 });
      }
      return Promise.resolve({
        rows: [
          makeItemRow({ id: "q-1" }),
          makeItemRow({ id: "q-2", name: "Additional Questionnaire" }),
        ],
        rowCount: 2,
      });
    });
    const svc = createService(pool, makeTimeline());
    const result = await svc.list(makeCtx(), {
      caseId: CASE_ID,
      category: "questionnaire",
    });
    assert.equal(result.total, 2);
    assert.equal(result.items.length, 2);
    for (const item of result.items) {
      assert.equal(item.category, "questionnaire");
    }
    const countCall = calls.find((c) => c.sql.includes("count(*)"));
    assert.ok(countCall);
    assert.ok(countCall.sql.includes("category = $"));
  });
  void test("list: combined caseId + category + status filter", async () => {
    const calls = [];
    const pool = makePool((sql, params) => {
      calls.push({ sql: sql.trim(), params });
      if (sql.includes("count(*)")) {
        return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
      }
      return Promise.resolve({
        rows: [makeItemRow({ status: "approved" })],
        rowCount: 1,
      });
    });
    const svc = createService(pool, makeTimeline());
    const result = await svc.list(makeCtx(), {
      caseId: CASE_ID,
      category: "questionnaire",
      status: "approved",
    });
    assert.equal(result.total, 1);
    const countCall = calls.find((c) => c.sql.includes("count(*)"));
    assert.ok(countCall);
    assert.ok(countCall.sql.includes("case_id = $"));
    assert.ok(countCall.sql.includes("status = $"));
    assert.ok(countCall.sql.includes("category = $"));
  });
});
void describe("questionnaire row mapping", () => {
  void test("maps survey_data from JSON string", () => {
    const row = makeItemRow({
      survey_data:
        '{"companyName":"株式会社テスト","directors":[{"name":"田中"}]}',
    });
    const item = mapDocumentItemRow(row);
    assert.equal(item.category, "questionnaire");
    assert.deepEqual(item.surveyData, {
      companyName: "株式会社テスト",
      directors: [{ name: "田中" }],
    });
  });
  void test("maps survey_data from already-parsed object", () => {
    const row = makeItemRow({
      survey_data: { capitalAmount: 5000000, businessType: "食品販売" },
    });
    const item = mapDocumentItemRow(row);
    assert.deepEqual(item.surveyData, {
      capitalAmount: 5000000,
      businessType: "食品販売",
    });
  });
  void test("maps null survey_data", () => {
    const item = mapDocumentItemRow(makeItemRow({ survey_data: null }));
    assert.equal(item.surveyData, null);
  });
  void test("maps undefined survey_data to null", () => {
    const item = mapDocumentItemRow(makeItemRow({ survey_data: undefined }));
    assert.equal(item.surveyData, null);
  });
  void test("maps invalid JSON string survey_data to null", () => {
    const item = mapDocumentItemRow(
      makeItemRow({ survey_data: "not-valid-json{" }),
    );
    assert.equal(item.surveyData, null);
  });
  void test("maps array survey_data to null (arrays rejected)", () => {
    const item = mapDocumentItemRow(makeItemRow({ survey_data: [1, 2, 3] }));
    assert.equal(item.surveyData, null);
  });
  void test("preserves category field", () => {
    for (const category of [
      "questionnaire",
      "standard",
      "company",
      "personal",
      null,
    ]) {
      const item = mapDocumentItemRow(makeItemRow({ category }));
      assert.equal(item.category, category);
    }
  });
});
//# sourceMappingURL=documentItems.questionnaire-docs.flow.focused.test.js.map
