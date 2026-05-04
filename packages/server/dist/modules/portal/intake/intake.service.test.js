import test from "node:test";
import assert from "node:assert/strict";
import { IntakeService } from "./intake.service";
function makePool(qf) {
  return { query: qf };
}
const SAMPLE_FORM_ROW = {
  id: "form-1",
  app_user_id: "au-1",
  lead_id: null,
  case_draft_id: null,
  form_kind: "general",
  form_data: { fullName: "Taro" },
  status: "draft",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};
// ── create ──
void test("IntakeService.create inserts draft form", async () => {
  const calls = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql, params });
    return Promise.resolve({ rows: [SAMPLE_FORM_ROW] });
  });
  const svc = new IntakeService(pool);
  const result = await svc.create({
    appUserId: "au-1",
    formData: { fullName: "Taro" },
  });
  assert.equal(result.id, "form-1");
  assert.equal(result.status, "draft");
  assert.ok(calls.some((c) => c.sql.includes("insert into intake_forms")));
});
// ── get ──
void test("IntakeService.get returns form", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [SAMPLE_FORM_ROW] }));
  const svc = new IntakeService(pool);
  const result = await svc.get("form-1");
  assert.ok(result);
  assert.equal(result.id, "form-1");
});
// ── list ──
void test("IntakeService.list filters by appUserId", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("count(*)"))
      return Promise.resolve({ rows: [{ count: "1" }] });
    return Promise.resolve({ rows: [SAMPLE_FORM_ROW] });
  });
  const svc = new IntakeService(pool);
  const result = await svc.list({ appUserId: "au-1" });
  assert.equal(result.total, 1);
  assert.equal(result.items.length, 1);
});
// ── update ──
void test("IntakeService.update updates draft form", async () => {
  let callIdx = 0;
  const updatedRow = {
    ...SAMPLE_FORM_ROW,
    form_data: { fullName: "Jiro" },
  };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const pool = makePool((_sql) => {
    callIdx++;
    // First call: get (for ownership check)
    if (callIdx === 1) return Promise.resolve({ rows: [SAMPLE_FORM_ROW] });
    // Second call: update
    return Promise.resolve({ rows: [updatedRow] });
  });
  const svc = new IntakeService(pool);
  const result = await svc.update("form-1", "au-1", {
    formData: { fullName: "Jiro" },
  });
  assert.deepEqual(result.formData, { fullName: "Jiro" });
});
void test("IntakeService.update rejects if not owner", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [SAMPLE_FORM_ROW] }));
  const svc = new IntakeService(pool);
  await assert.rejects(
    () => svc.update("form-1", "au-other", { formData: {} }),
    /own intake form/,
  );
});
void test("IntakeService.update rejects if already submitted", async () => {
  const submittedRow = { ...SAMPLE_FORM_ROW, status: "submitted" };
  const pool = makePool(() => Promise.resolve({ rows: [submittedRow] }));
  const svc = new IntakeService(pool);
  await assert.rejects(
    () => svc.update("form-1", "au-1", { formData: {} }),
    /submitted/,
  );
});
// ── submit ──
void test("IntakeService.submit sets status to submitted", async () => {
  let callIdx = 0;
  const submittedRow = { ...SAMPLE_FORM_ROW, status: "submitted" };
  const pool = makePool(() => {
    callIdx++;
    if (callIdx === 1) return Promise.resolve({ rows: [SAMPLE_FORM_ROW] });
    return Promise.resolve({ rows: [submittedRow] });
  });
  const svc = new IntakeService(pool);
  const result = await svc.submit("form-1", "au-1");
  assert.equal(result.status, "submitted");
});
void test("IntakeService.submit rejects if already submitted", async () => {
  const submittedRow = { ...SAMPLE_FORM_ROW, status: "submitted" };
  const pool = makePool(() => Promise.resolve({ rows: [submittedRow] }));
  const svc = new IntakeService(pool);
  await assert.rejects(() => svc.submit("form-1", "au-1"), /Already submitted/);
});
void test("IntakeService.submit rejects if not owner", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [SAMPLE_FORM_ROW] }));
  const svc = new IntakeService(pool);
  await assert.rejects(
    () => svc.submit("form-1", "au-other"),
    /own intake form/,
  );
});
// ── form_kind ──
void test("IntakeService.create defaults form_kind to general", async () => {
  const calls = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql, params });
    return Promise.resolve({ rows: [SAMPLE_FORM_ROW] });
  });
  const svc = new IntakeService(pool);
  const result = await svc.create({ appUserId: "au-1" });
  assert.equal(result.formKind, "general");
  const insertCall = calls.find((c) => c.sql.includes("insert into"));
  assert.ok(insertCall);
  assert.ok(insertCall.params?.includes("general"));
});
void test("IntakeService.create accepts bmv_questionnaire form_kind", async () => {
  const bmvRow = { ...SAMPLE_FORM_ROW, form_kind: "bmv_questionnaire" };
  const pool = makePool(() => Promise.resolve({ rows: [bmvRow] }));
  const svc = new IntakeService(pool);
  const result = await svc.create({
    appUserId: "au-1",
    formKind: "bmv_questionnaire",
  });
  assert.equal(result.formKind, "bmv_questionnaire");
});
void test("IntakeService.create accepts bmv_quote form_kind", async () => {
  const quoteRow = { ...SAMPLE_FORM_ROW, form_kind: "bmv_quote" };
  const pool = makePool(() => Promise.resolve({ rows: [quoteRow] }));
  const svc = new IntakeService(pool);
  const result = await svc.create({
    appUserId: "au-1",
    formKind: "bmv_quote",
  });
  assert.equal(result.formKind, "bmv_quote");
});
void test("IntakeService.create rejects invalid form_kind", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [SAMPLE_FORM_ROW] }));
  const svc = new IntakeService(pool);
  await assert.rejects(
    () =>
      svc.create({
        appUserId: "au-1",
        formKind: "invalid_kind",
      }),
    /Invalid form_kind/,
  );
});
//# sourceMappingURL=intake.service.test.js.map
