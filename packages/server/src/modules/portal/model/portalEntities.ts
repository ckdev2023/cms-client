/**
 * Portal 域实体类型定义与 DB 行映射函数。
 */

/** Portal 侧的 timeline entity type。 */
export type PortalTimelineEntityType =
  | "app_user"
  | "lead"
  | "conversation"
  | "message"
  | "user_document"
  | "intake_form";

/** AppUser 核心对象（用户端账号）。 */
export type AppUser = {
  id: string;
  preferredLanguage: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * Lead 核心对象（线索/咨询）。
 *
 * P0 扩展（027 migration）：owner_user_id 为单一负责人字段。
 * 旧 assigned_user_id 在 DB 侧保留为 view alias 一个版本。
 */
export type Lead = {
  id: string;
  orgId: string | null;
  appUserId: string;
  source: string;
  language: string;
  status: string;
  assignedOrgId: string | null;
  /** @deprecated Use {@link ownerUserId}. Kept as alias during migration 027. */
  assignedUserId: string | null;
  leadNo: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  sourceChannel: string | null;
  referrer: string | null;
  intendedCaseType: string | null;
  groupId: string | null;
  /** 单一负责人。027 migration 中由 assigned_user_id rename 而来。 */
  ownerUserId: string | null;
  nextAction: string | null;
  nextFollowUpAt: string | null;
  quoteAmount: number | null;
  note: string | null;
  lostReason: string | null;
  convertedCustomerId: string | null;
  convertedCaseId: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};
/** Conversation 核心对象（会話）。 */
export type Conversation = {
  id: string;
  leadId: string | null;
  appUserId: string;
  orgId: string | null;
  channel: string;
  preferredLanguage: string;
  status: string;
  ownerUserId: string | null;
  lastMessageAt: string | null;
  unreadCountStaffTenant: number;
  unreadCountStaffOwner: number;
  unreadCountUser: number;
  customerId: string | null;
  caseId: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Message 核心对象（消息，含多語翻訳）。 */
export type Message = {
  id: string;
  conversationId: string;
  orgId: string | null;
  senderType: string;
  senderId: string;
  originalLanguage: string;
  originalText: string;
  translatedTextJa: string | null;
  translatedTextZh: string | null;
  translatedTextEn: string | null;
  translationStatus: string;
  kind: string;
  visibleScope: string;
  createdAt: string;
};
/** UserDocument 核心对象（用户上传文件）。 */
export type UserDocument = {
  id: string;
  appUserId: string;
  orgId: string | null;
  leadId: string | null;
  caseId: string | null;
  fileKey: string;
  fileName: string;
  docType: string;
  status: string;
  uploadedAt: string;
};
/** IntakeForm 核心对象（信息采集表单）。 */
export type IntakeForm = {
  id: string;
  appUserId: string;
  leadId: string | null;
  caseDraftId: string | null;
  formKind: string;
  formData: Record<string, unknown>;
  status: string;
  createdAt: string;
  updatedAt: string;
};
/** 数据库查询返回的 AppUser 行类型。 */
export type AppUserQueryRow = {
  id: string;
  preferred_language: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  created_at: unknown;
  updated_at: unknown;
};
/**
 * 数据库查询返回的 Lead 行类型。
 *
 * P0 新列在 027 migration 后可用；标记为可选以兼容迁移前查询。
 * owner_user_id 为 canonical 列；assigned_user_id 为 view alias（一版本过渡）。
 */
export type LeadQueryRow = {
  id: string;
  org_id: string | null;
  app_user_id: string;
  source: string;
  language: string;
  status: string;
  assigned_org_id: string | null;
  /** @deprecated View alias; prefer owner_user_id. */
  assigned_user_id?: string | null;
  lead_no?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  source_channel?: string | null;
  referrer?: string | null;
  intended_case_type?: string | null;
  group_id?: string | null;
  owner_user_id?: string | null;
  next_action?: string | null;
  next_follow_up_at?: unknown;
  quote_amount?: unknown;
  note?: string | null;
  lost_reason?: string | null;
  converted_customer_id?: string | null;
  converted_case_id?: string | null;
  tags?: string[] | null;
  created_at: unknown;
  updated_at: unknown;
};

/** 数据库查询返回的 Conversation 行类型。 */
export type ConversationQueryRow = {
  id: string;
  lead_id: string | null;
  app_user_id: string;
  org_id: string | null;
  channel: string;
  preferred_language: string;
  status: string;
  owner_user_id?: string | null;
  last_message_at?: unknown;
  unread_count_staff_tenant?: unknown;
  unread_count_staff_owner?: unknown;
  unread_count_user?: unknown;
  customer_id?: string | null;
  case_id?: string | null;
  created_at: unknown;
  updated_at: unknown;
};
/** 数据库查询返回的 Message 行类型。 */
export type MessageQueryRow = {
  id: string;
  conversation_id: string;
  org_id: string | null;
  sender_type: string;
  sender_id: string;
  original_language: string;
  original_text: string;
  translated_text_ja: string | null;
  translated_text_zh: string | null;
  translated_text_en: string | null;
  translation_status: string;
  kind?: string;
  visible_scope?: string;
  created_at: unknown;
};
/** 数据库查询返回的 UserDocument 行类型。 */
export type UserDocumentQueryRow = {
  id: string;
  app_user_id: string;
  org_id: string | null;
  lead_id: string | null;
  case_id: string | null;
  file_key: string;
  file_name: string;
  doc_type: string;
  status: string;
  uploaded_at: unknown;
};
/** 数据库查询返回的 IntakeForm 行类型。 */
export type IntakeFormQueryRow = {
  id: string;
  app_user_id: string;
  lead_id: string | null;
  case_draft_id: string | null;
  form_kind?: string;
  form_data: unknown;
  status: string;
  created_at: unknown;
  updated_at: unknown;
};
function toTimestampStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return null;
}

function toNullableString(value: string | null | undefined): string | null {
  return value ?? null;
}

function parseNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function requireTimestampString(value: unknown, field: string): string {
  const s = toTimestampStringOrNull(value);
  if (!s) throw new Error(`Invalid timestamp: ${field}`);
  return s;
}

type LeadQueryRowWithLegacyAlias = Omit<LeadQueryRow, "assigned_user_id"> & {
  assigned_user_id?: string | null;
};

function readLegacyAssignedUserId(r: LeadQueryRow): string | null {
  const legacyRow = r as LeadQueryRowWithLegacyAlias;
  return toNullableString(legacyRow.assigned_user_id);
}

function resolveLeadOwnerUserId(r: LeadQueryRow): string | null {
  return r.owner_user_id ?? readLegacyAssignedUserId(r);
}

function mapLeadIdentityFields(
  r: LeadQueryRow,
): Pick<
  Lead,
  | "leadNo"
  | "name"
  | "phone"
  | "email"
  | "sourceChannel"
  | "referrer"
  | "intendedCaseType"
  | "groupId"
> {
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

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v) => typeof v === "string");
  return [];
}

function mapLeadLifecycleFields(
  r: LeadQueryRow,
): Pick<
  Lead,
  | "nextAction"
  | "nextFollowUpAt"
  | "quoteAmount"
  | "note"
  | "lostReason"
  | "convertedCustomerId"
  | "convertedCaseId"
  | "tags"
> {
  return {
    nextAction: toNullableString(r.next_action),
    nextFollowUpAt: toTimestampStringOrNull(r.next_follow_up_at),
    quoteAmount: parseNullableNumber(r.quote_amount),
    note: toNullableString(r.note),
    lostReason: toNullableString(r.lost_reason),
    convertedCustomerId: toNullableString(r.converted_customer_id),
    convertedCaseId: toNullableString(r.converted_case_id),
    tags: parseStringArray(r.tags),
  };
}

/**
 * DB 行→AppUser。
 * @param r DB 行
 * @returns 映射結果
 */
export function mapAppUserRow(r: AppUserQueryRow): AppUser {
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
export function mapLeadRow(r: LeadQueryRow): Lead {
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
export function mapConversationRow(r: ConversationQueryRow): Conversation {
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
export function mapMessageRow(r: MessageQueryRow): Message {
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
export function mapUserDocumentRow(r: UserDocumentQueryRow): UserDocument {
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
export function mapIntakeFormRow(r: IntakeFormQueryRow): IntakeForm {
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

function normalizeFormData(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return {};
    } catch {
      return {};
    }
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
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
export function isPortalTimelineEntityType(
  value: unknown,
): value is PortalTimelineEntityType {
  return typeof value === "string" && PORTAL_ENTITY_TYPES.has(value);
}
