import assert from "node:assert/strict";
import test from "node:test";
void test("CaseTaskDto is constructable from a Task entity with display name enrichment", () => {
  const task = {
    id: "t-1",
    orgId: "org-1",
    caseId: "c-1",
    title: "催办：户籍誊本",
    description: null,
    taskType: "document_follow_up",
    assigneeUserId: "u-1",
    priority: "normal",
    dueAt: "2026-04-30T00:00:00Z",
    status: "pending",
    sourceType: "requirement",
    sourceId: "req-1",
    completedAt: null,
    createdAt: "2026-04-01T00:00:00Z",
    updatedAt: "2026-04-01T00:00:00Z",
  };
  const dto = {
    id: task.id,
    caseId: task.caseId,
    title: task.title,
    description: task.description,
    taskType: task.taskType,
    assigneeUserId: task.assigneeUserId,
    assigneeDisplayName: "田中太郎",
    priority: task.priority,
    dueAt: task.dueAt,
    status: task.status,
    sourceType: task.sourceType,
    sourceId: task.sourceId,
    completedAt: task.completedAt,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
  assert.equal(dto.id, "t-1");
  assert.equal(dto.assigneeDisplayName, "田中太郎");
});
void test("CaseTaskListResult wraps items and total", () => {
  const result = { items: [], total: 0 };
  assert.equal(result.items.length, 0);
  assert.equal(result.total, 0);
});
void test("CaseTaskListInput requires caseId, other fields are optional", () => {
  const minimal = { caseId: "c-1" };
  assert.equal(minimal.caseId, "c-1");
  const full = {
    caseId: "c-1",
    status: "pending",
    assigneeUserId: "u-1",
    page: 1,
    limit: 20,
  };
  assert.equal(full.status, "pending");
});
void test("CaseDeadlineDto is constructable with all P0 deadline types", () => {
  const types = [
    "residence_expiry",
    "supplement_due",
    "submission_due",
    "result_expected",
  ];
  for (const t of types) {
    const dto = {
      deadlineType: t,
      label: "test",
      dueAt: null,
      remainingDays: null,
      severity: "normal",
    };
    assert.equal(dto.deadlineType, t);
  }
});
void test("CaseDeadlineListResult wraps items", () => {
  const result = { items: [] };
  assert.equal(result.items.length, 0);
});
void test("CaseDeadlineSourceFields maps to Case entity date fields", () => {
  const source = {
    dueAt: "2026-04-30T00:00:00Z",
    residenceExpiryDate: "2027-01-15T00:00:00Z",
    submissionDate: "2026-05-10T00:00:00Z",
    resultDate: null,
  };
  assert.equal(source.dueAt, "2026-04-30T00:00:00Z");
  assert.equal(source.resultDate, null);
});
void test("CaseReminderDto is constructable from a Reminder entity", () => {
  const reminder = {
    id: "r-1",
    orgId: "org-1",
    caseId: "c-1",
    targetType: "deadline",
    targetId: "d-1",
    remindAt: "2026-04-25T09:00:00Z",
    recipientType: "user",
    recipientId: "u-1",
    channel: "in_app",
    dedupeKey: null,
    sendStatus: "pending",
    retryCount: 0,
    sentAt: null,
    payloadSnapshot: null,
    createdAt: "2026-04-01T00:00:00Z",
    updatedAt: "2026-04-01T00:00:00Z",
  };
  const dto = {
    id: reminder.id,
    caseId: reminder.caseId,
    targetType: reminder.targetType,
    targetId: reminder.targetId,
    remindAt: reminder.remindAt,
    recipientType: reminder.recipientType,
    recipientId: reminder.recipientId,
    channel: reminder.channel,
    dedupeKey: reminder.dedupeKey,
    sendStatus: reminder.sendStatus,
    retryCount: reminder.retryCount,
    sentAt: reminder.sentAt,
    payloadSnapshot: reminder.payloadSnapshot,
    createdAt: reminder.createdAt,
    updatedAt: reminder.updatedAt,
  };
  assert.equal(dto.id, "r-1");
  assert.equal(dto.targetType, "deadline");
});
void test("CaseReminderListResult wraps items and total", () => {
  const result = { items: [], total: 0 };
  assert.equal(result.items.length, 0);
  assert.equal(result.total, 0);
});
//# sourceMappingURL=cases.types-task-deadline.test.js.map
