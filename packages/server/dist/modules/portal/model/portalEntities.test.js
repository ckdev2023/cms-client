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
function readLegacyAssignedUserId(value) {
  return Reflect.get(value, "assignedUserId");
}
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
void test("mapLeadRow maps DB row to Lead (pre-migration minimal row)", () => {
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
  assert.equal(result.ownerUserId, null);
  assert.equal(readLegacyAssignedUserId(result), null);
  assert.equal(result.leadNo, null);
  assert.equal(result.name, null);
  assert.equal(result.phone, null);
  assert.equal(result.email, null);
  assert.equal(result.sourceChannel, null);
  assert.equal(result.referrer, null);
  assert.equal(result.intendedCaseType, null);
  assert.equal(result.groupId, null);
  assert.equal(result.nextAction, null);
  assert.equal(result.nextFollowUpAt, null);
  assert.equal(result.quoteAmount, null);
  assert.equal(result.note, null);
  assert.equal(result.lostReason, null);
  assert.equal(result.convertedCustomerId, null);
  assert.equal(result.convertedCaseId, null);
});
void test("mapLeadRow maps full P0 row with owner_user_id", () => {
  const row = {
    id: "l10",
    org_id: "org1",
    app_user_id: "au1",
    source: "web",
    language: "ja",
    status: "following",
    assigned_org_id: "org1",
    owner_user_id: "u5",
    lead_no: "LD-00042",
    name: "Tanaka Taro",
    phone: "+81-90-1234-5678",
    email: "tanaka@example.com",
    source_channel: "partner",
    referrer: "行政太郎",
    intended_case_type: "business_manager_visa",
    group_id: "grp-1",
    next_action: "send_questionnaire",
    next_follow_up_at: "2026-05-01T09:00:00.000Z",
    quote_amount: "350000.00",
    note: "BMV initial consultation",
    lost_reason: null,
    converted_customer_id: null,
    converted_case_id: null,
    created_at: "2026-04-01T00:00:00.000Z",
    updated_at: "2026-04-10T00:00:00.000Z",
  };
  const result = mapLeadRow(row);
  assert.equal(result.ownerUserId, "u5");
  assert.equal(readLegacyAssignedUserId(result), "u5");
  assert.equal(result.leadNo, "LD-00042");
  assert.equal(result.name, "Tanaka Taro");
  assert.equal(result.phone, "+81-90-1234-5678");
  assert.equal(result.email, "tanaka@example.com");
  assert.equal(result.sourceChannel, "partner");
  assert.equal(result.referrer, "行政太郎");
  assert.equal(result.intendedCaseType, "business_manager_visa");
  assert.equal(result.groupId, "grp-1");
  assert.equal(result.nextAction, "send_questionnaire");
  assert.equal(result.nextFollowUpAt, "2026-05-01T09:00:00.000Z");
  assert.equal(result.quoteAmount, 350000);
  assert.equal(result.note, "BMV initial consultation");
  assert.equal(result.lostReason, null);
});
void test("mapLeadRow owner_user_id takes precedence over assigned_user_id", () => {
  const row = {
    id: "l11",
    org_id: "org1",
    app_user_id: "au1",
    source: "web",
    language: "en",
    status: "new",
    assigned_org_id: null,
    owner_user_id: "u-owner",
    assigned_user_id: "u-legacy",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
  const result = mapLeadRow(row);
  assert.equal(result.ownerUserId, "u-owner");
  assert.equal(readLegacyAssignedUserId(result), "u-owner");
});
void test("mapLeadRow falls back to assigned_user_id when owner_user_id absent", () => {
  const row = {
    id: "l12",
    org_id: null,
    app_user_id: "au1",
    source: "web",
    language: "en",
    status: "assigned",
    assigned_org_id: "org2",
    assigned_user_id: "u-legacy",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
  const result = mapLeadRow(row);
  assert.equal(result.ownerUserId, "u-legacy");
  assert.equal(readLegacyAssignedUserId(result), "u-legacy");
});
void test("mapLeadRow parses numeric quote_amount from string", () => {
  const row = {
    id: "l13",
    org_id: null,
    app_user_id: "au1",
    source: "web",
    language: "en",
    status: "new",
    assigned_org_id: null,
    quote_amount: "123456.78",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
  const result = mapLeadRow(row);
  assert.equal(result.quoteAmount, 123456.78);
});
void test("mapLeadRow handles null quote_amount", () => {
  const row = {
    id: "l14",
    org_id: null,
    app_user_id: "au1",
    source: "web",
    language: "en",
    status: "new",
    assigned_org_id: null,
    quote_amount: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
  const result = mapLeadRow(row);
  assert.equal(result.quoteAmount, null);
});
void test("mapLeadRow converts next_follow_up_at Date to ISO string", () => {
  const row = {
    id: "l15",
    org_id: null,
    app_user_id: "au1",
    source: "web",
    language: "en",
    status: "new",
    assigned_org_id: null,
    next_follow_up_at: new Date("2026-06-15T10:00:00.000Z"),
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
  const result = mapLeadRow(row);
  assert.equal(result.nextFollowUpAt, "2026-06-15T10:00:00.000Z");
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
    owner_user_id: "u1",
    last_message_at: "2026-01-02T00:00:00.000Z",
    unread_count_staff_tenant: 3,
    unread_count_staff_owner: 1,
    unread_count_user: 0,
    customer_id: "cust1",
    case_id: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
  const result = mapConversationRow(row);
  assert.equal(result.id, "conv1");
  assert.equal(result.leadId, "l1");
  assert.equal(result.orgId, null);
  assert.equal(result.channel, "chat");
  assert.equal(result.status, "open");
  assert.equal(result.ownerUserId, "u1");
  assert.equal(result.lastMessageAt, "2026-01-02T00:00:00.000Z");
  assert.equal(result.unreadCountStaffTenant, 3);
  assert.equal(result.unreadCountStaffOwner, 1);
  assert.equal(result.unreadCountUser, 0);
  assert.equal(result.customerId, "cust1");
  assert.equal(result.caseId, null);
});
void test("mapConversationRow defaults new fields when absent", () => {
  const row = {
    id: "conv2",
    lead_id: null,
    app_user_id: "au1",
    org_id: null,
    channel: "web",
    preferred_language: "ja",
    status: "open",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
  const result = mapConversationRow(row);
  assert.equal(result.ownerUserId, null);
  assert.equal(result.lastMessageAt, null);
  assert.equal(result.unreadCountStaffTenant, 0);
  assert.equal(result.unreadCountStaffOwner, 0);
  assert.equal(result.unreadCountUser, 0);
  assert.equal(result.customerId, null);
  assert.equal(result.caseId, null);
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
    kind: "text",
    visible_scope: "client_visible",
    created_at: "2026-01-01T00:00:00.000Z",
  };
  const result = mapMessageRow(row);
  assert.equal(result.originalText, "你好");
  assert.equal(result.translatedTextJa, "こんにちは");
  assert.equal(result.translatedTextZh, null);
  assert.equal(result.translatedTextEn, "Hello");
  assert.equal(result.translationStatus, "completed");
  assert.equal(result.kind, "text");
  assert.equal(result.visibleScope, "client_visible");
});
void test("mapMessageRow defaults kind and visibleScope when absent", () => {
  const row = {
    id: "m2",
    conversation_id: "conv1",
    org_id: null,
    sender_type: "staff",
    sender_id: "u1",
    original_language: "ja",
    original_text: "はい",
    translated_text_ja: null,
    translated_text_zh: null,
    translated_text_en: null,
    translation_status: "pending",
    created_at: "2026-01-01T00:00:00.000Z",
  };
  const result = mapMessageRow(row);
  assert.equal(result.kind, "text");
  assert.equal(result.visibleScope, "client_visible");
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
//# sourceMappingURL=portalEntities.test.js.map
