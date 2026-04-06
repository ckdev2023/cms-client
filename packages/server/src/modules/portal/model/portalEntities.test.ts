import test from "node:test";
import assert from "node:assert/strict";

import {
  mapAppUserRow,
  mapLeadRow,
  mapConversationRow,
  mapMessageRow,
  mapUserDocumentRow,
  mapIntakeFormRow,
  isPortalTimelineEntityType,
} from "./portalEntities";

// ── mapAppUserRow ──

void test("mapAppUserRow maps DB row to AppUser", () => {
  const row = {
    id: "au1",
    preferred_language: "ja",
    name: "Taro",
    email: "taro@example.com",
    phone: "+81-90-0000-0000",
    status: "active",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
  };
  const result = mapAppUserRow(row);
  assert.equal(result.id, "au1");
  assert.equal(result.preferredLanguage, "ja");
  assert.equal(result.name, "Taro");
  assert.equal(result.email, "taro@example.com");
  assert.equal(result.phone, "+81-90-0000-0000");
  assert.equal(result.status, "active");
  assert.equal(result.createdAt, "2026-01-01T00:00:00.000Z");
  assert.equal(result.updatedAt, "2026-01-02T00:00:00.000Z");
});

void test("mapAppUserRow handles null email and phone", () => {
  const row = {
    id: "au2",
    preferred_language: "en",
    name: "Bob",
    email: null,
    phone: null,
    status: "inactive",
    created_at: new Date("2026-01-01"),
    updated_at: new Date("2026-01-02"),
  };
  const result = mapAppUserRow(row);
  assert.equal(result.email, null);
  assert.equal(result.phone, null);
  assert.ok(result.createdAt.length > 0); // Date → ISO string
});

void test("mapAppUserRow throws on invalid timestamp", () => {
  const row = {
    id: "au3",
    preferred_language: "en",
    name: "Invalid",
    email: null,
    phone: null,
    status: "active",
    created_at: null,
    updated_at: "2026-01-01T00:00:00.000Z",
  };
  assert.throws(() => mapAppUserRow(row), /Invalid timestamp: created_at/);
});

// ── mapLeadRow ──

void test("mapLeadRow maps DB row to Lead", () => {
  const row = {
    id: "l1",
    org_id: "org1",
    app_user_id: "au1",
    source: "web",
    language: "zh",
    status: "new",
    assigned_org_id: null,
    assigned_user_id: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
  const result = mapLeadRow(row);
  assert.equal(result.id, "l1");
  assert.equal(result.orgId, "org1");
  assert.equal(result.appUserId, "au1");
  assert.equal(result.source, "web");
  assert.equal(result.assignedOrgId, null);
  assert.equal(result.assignedUserId, null);
});

// ── mapConversationRow ──

void test("mapConversationRow maps DB row to Conversation", () => {
  const row = {
    id: "conv1",
    lead_id: "l1",
    app_user_id: "au1",
    org_id: null,
    channel: "chat",
    preferred_language: "en",
    status: "open",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
  const result = mapConversationRow(row);
  assert.equal(result.id, "conv1");
  assert.equal(result.leadId, "l1");
  assert.equal(result.orgId, null);
  assert.equal(result.channel, "chat");
  assert.equal(result.status, "open");
});

// ── mapMessageRow ──

void test("mapMessageRow maps DB row with translations", () => {
  const row = {
    id: "m1",
    conversation_id: "conv1",
    org_id: null,
    sender_type: "app_user",
    sender_id: "au1",
    original_language: "zh",
    original_text: "你好",
    translated_text_ja: "こんにちは",
    translated_text_zh: null,
    translated_text_en: "Hello",
    translation_status: "completed",
    created_at: "2026-01-01T00:00:00.000Z",
  };
  const result = mapMessageRow(row);
  assert.equal(result.originalText, "你好");
  assert.equal(result.translatedTextJa, "こんにちは");
  assert.equal(result.translatedTextZh, null);
  assert.equal(result.translatedTextEn, "Hello");
  assert.equal(result.translationStatus, "completed");
});

// ── mapUserDocumentRow ──

void test("mapUserDocumentRow maps DB row to UserDocument", () => {
  const row = {
    id: "doc1",
    app_user_id: "au1",
    org_id: null,
    lead_id: "l1",
    case_id: null,
    file_key: "uploads/doc1.pdf",
    file_name: "passport.pdf",
    doc_type: "passport",
    status: "uploaded",
    uploaded_at: "2026-01-01T00:00:00.000Z",
  };
  const result = mapUserDocumentRow(row);
  assert.equal(result.fileKey, "uploads/doc1.pdf");
  assert.equal(result.fileName, "passport.pdf");
  assert.equal(result.caseId, null);
});

// ── mapIntakeFormRow ──

void test("mapIntakeFormRow maps DB row with formData object", () => {
  const row = {
    id: "if1",
    app_user_id: "au1",
    lead_id: "l1",
    case_draft_id: null,
    form_data: { field1: "value1", field2: 42 },
    status: "draft",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
  const result = mapIntakeFormRow(row);
  assert.equal(result.id, "if1");
  assert.equal(result.caseDraftId, null);
  assert.deepEqual(result.formData, { field1: "value1", field2: 42 });
  assert.equal(result.status, "draft");
});

void test("mapIntakeFormRow normalizes null formData to empty object", () => {
  const row = {
    id: "if2",
    app_user_id: "au1",
    lead_id: null,
    case_draft_id: null,
    form_data: null,
    status: "submitted",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
  const result = mapIntakeFormRow(row);
  assert.deepEqual(result.formData, {});
});

void test("mapIntakeFormRow normalizes JSON string formData", () => {
  const row = {
    id: "if3",
    app_user_id: "au1",
    lead_id: null,
    case_draft_id: null,
    form_data: '{"key":"val"}',
    status: "reviewed",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
  const result = mapIntakeFormRow(row);
  assert.deepEqual(result.formData, { key: "val" });
});

// ── Date object timestamp conversion ──

void test("mapLeadRow converts Date objects to ISO strings", () => {
  const row = {
    id: "l2",
    org_id: null,
    app_user_id: "au1",
    source: "referral",
    language: "en",
    status: "assigned",
    assigned_org_id: "org2",
    assigned_user_id: "u2",
    created_at: new Date("2026-03-01T12:00:00.000Z"),
    updated_at: new Date("2026-03-02T12:00:00.000Z"),
  };
  const result = mapLeadRow(row);
  assert.equal(result.createdAt, "2026-03-01T12:00:00.000Z");
  assert.equal(result.updatedAt, "2026-03-02T12:00:00.000Z");
});

// ── isPortalTimelineEntityType ──

void test("isPortalTimelineEntityType returns true for known types", () => {
  assert.equal(isPortalTimelineEntityType("app_user"), true);
  assert.equal(isPortalTimelineEntityType("lead"), true);
  assert.equal(isPortalTimelineEntityType("conversation"), true);
  assert.equal(isPortalTimelineEntityType("message"), true);
  assert.equal(isPortalTimelineEntityType("user_document"), true);
  assert.equal(isPortalTimelineEntityType("intake_form"), true);
});

void test("isPortalTimelineEntityType returns false for unknown types", () => {
  assert.equal(isPortalTimelineEntityType("appUser"), false);
  assert.equal(isPortalTimelineEntityType("organization"), false);
  assert.equal(isPortalTimelineEntityType("case"), false);
  assert.equal(isPortalTimelineEntityType(null), false);
  assert.equal(isPortalTimelineEntityType(undefined), false);
  assert.equal(isPortalTimelineEntityType(123), false);
});
