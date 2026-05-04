/**
 * Portal 域实体类型定义与 DB 行映射函数。
 */
function toTimestampStringOrNull(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return null;
}
function toNullableString(value) {
  return value ?? null;
}
function parseNullableNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
function requireTimestampString(value, field) {
  const s = toTimestampStringOrNull(value);
  if (!s) throw new Error(`Invalid timestamp: ${field}`);
  return s;
}
function readLegacyAssignedUserId(r) {
  const legacyRow = r;
  return toNullableString(legacyRow.assigned_user_id);
}
function resolveLeadOwnerUserId(r) {
  return r.owner_user_id ?? readLegacyAssignedUserId(r);
}
function mapLeadIdentityFields(r) {
  return {
    leadNo: toNullableString(r.lead_no),
    name: toNullableString(r.name),
    phone: toNullableString(r.phone),
    email: toNullableString(r.email),
    sourceChannel: toNullableString(r.source_channel),
    referrer: toNullableString(r.referrer),
    intendedCaseType: toNullableString(r.intended_case_type),
    groupId: toNullableString(r.group_id),
  };
}
function mapLeadLifecycleFields(r) {
  return {
    nextAction: toNullableString(r.next_action),
    nextFollowUpAt: toTimestampStringOrNull(r.next_follow_up_at),
    quoteAmount: parseNullableNumber(r.quote_amount),
    note: toNullableString(r.note),
    lostReason: toNullableString(r.lost_reason),
    convertedCustomerId: toNullableString(r.converted_customer_id),
    convertedCaseId: toNullableString(r.converted_case_id),
  };
}
/**
 * DB 行→AppUser。
 * @param r DB 行
 * @returns 映射結果
 */
export function mapAppUserRow(r) {
  return {
    id: r.id,
    preferredLanguage: r.preferred_language,
    name: r.name,
    email: r.email,
    phone: r.phone,
    status: r.status,
    createdAt: requireTimestampString(r.created_at, "created_at"),
    updatedAt: requireTimestampString(r.updated_at, "updated_at"),
  };
}
/**
 * 将 DB 行映射为 Lead。
 *
 * owner_user_id 优先；若缺失则回退到兼容视图中的 assigned_user_id。
 * assignedUserId（deprecated）与 ownerUserId 会保持同一值。
 * @param r Lead 查询结果行。
 * @returns 映射后的 Lead 实体。
 */
export function mapLeadRow(r) {
  const ownerUserId = resolveLeadOwnerUserId(r);
  return {
    id: r.id,
    orgId: r.org_id,
    appUserId: r.app_user_id,
    source: r.source,
    language: r.language,
    status: r.status,
    assignedOrgId: r.assigned_org_id,
    assignedUserId: ownerUserId,
    ...mapLeadIdentityFields(r),
    ownerUserId,
    ...mapLeadLifecycleFields(r),
    createdAt: requireTimestampString(r.created_at, "created_at"),
    updatedAt: requireTimestampString(r.updated_at, "updated_at"),
  };
}
/**
 * DB 行→Conversation。
 * @param r DB 行
 * @returns 映射結果
 */
export function mapConversationRow(r) {
  return {
    id: r.id,
    leadId: r.lead_id,
    appUserId: r.app_user_id,
    orgId: r.org_id,
    channel: r.channel,
    preferredLanguage: r.preferred_language,
    status: r.status,
    ownerUserId: toNullableString(r.owner_user_id),
    lastMessageAt: toTimestampStringOrNull(r.last_message_at),
    unreadCountStaffTenant:
      parseNullableNumber(r.unread_count_staff_tenant) ?? 0,
    unreadCountStaffOwner: parseNullableNumber(r.unread_count_staff_owner) ?? 0,
    unreadCountUser: parseNullableNumber(r.unread_count_user) ?? 0,
    customerId: toNullableString(r.customer_id),
    caseId: toNullableString(r.case_id),
    createdAt: requireTimestampString(r.created_at, "created_at"),
    updatedAt: requireTimestampString(r.updated_at, "updated_at"),
  };
}
/**
 * DB 行→Message。
 * @param r DB 行
 * @returns 映射結果
 */
export function mapMessageRow(r) {
  return {
    id: r.id,
    conversationId: r.conversation_id,
    orgId: r.org_id,
    senderType: r.sender_type,
    senderId: r.sender_id,
    originalLanguage: r.original_language,
    originalText: r.original_text,
    translatedTextJa: r.translated_text_ja,
    translatedTextZh: r.translated_text_zh,
    translatedTextEn: r.translated_text_en,
    translationStatus: r.translation_status,
    kind: r.kind ?? "text",
    visibleScope: r.visible_scope ?? "client_visible",
    createdAt: requireTimestampString(r.created_at, "created_at"),
  };
}
/**
 * DB 行→UserDocument。
 * @param r DB 行
 * @returns 映射結果
 */
export function mapUserDocumentRow(r) {
  return {
    id: r.id,
    appUserId: r.app_user_id,
    orgId: r.org_id,
    leadId: r.lead_id,
    caseId: r.case_id,
    fileKey: r.file_key,
    fileName: r.file_name,
    docType: r.doc_type,
    status: r.status,
    uploadedAt: requireTimestampString(r.uploaded_at, "uploaded_at"),
  };
}
/**
 * DB 行→IntakeForm。
 * @param r DB 行
 * @returns 映射結果
 */
export function mapIntakeFormRow(r) {
  return {
    id: r.id,
    appUserId: r.app_user_id,
    leadId: r.lead_id,
    caseDraftId: r.case_draft_id,
    formKind: r.form_kind ?? "general",
    formData: normalizeFormData(r.form_data),
    status: r.status,
    createdAt: requireTimestampString(r.created_at, "created_at"),
    updatedAt: requireTimestampString(r.updated_at, "updated_at"),
  };
}
function normalizeFormData(value) {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
      return {};
    } catch {
      return {};
    }
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  return {};
}
const PORTAL_ENTITY_TYPES = new Set([
  "app_user",
  "lead",
  "conversation",
  "message",
  "user_document",
  "intake_form",
]);
/**
 * 判定是否为 PortalTimelineEntityType。
 * @param value 待判断値
 * @returns 判定結果
 */
export function isPortalTimelineEntityType(value) {
  return typeof value === "string" && PORTAL_ENTITY_TYPES.has(value);
}
//# sourceMappingURL=portalEntities.js.map
