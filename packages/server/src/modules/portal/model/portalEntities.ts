/**
 * Portal 域实体类型定义与 DB 行映射函数。
 */

// ── Portal Timeline Entity Type ──

/**
 * Portal 侧的 timeline entity type。
 */
export type PortalTimelineEntityType =
  | "app_user"
  | "lead"
  | "conversation"
  | "message"
  | "user_document"
  | "intake_form";

// ── Entity Types ──

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

/** Lead 核心对象（线索/咨询）。 */
export type Lead = {
  id: string;
  orgId: string | null;
  appUserId: string;
  source: string;
  language: string;
  status: string;
  assignedOrgId: string | null;
  assignedUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Conversation 核心对象（会话）。 */
export type Conversation = {
  id: string;
  leadId: string | null;
  appUserId: string;
  orgId: string | null;
  channel: string;
  preferredLanguage: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

/** Message 核心对象（消息，含多语翻译）。 */
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
  formData: Record<string, unknown>;
  status: string;
  createdAt: string;
  updatedAt: string;
};

// ── DB Row Types ──

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

/** 数据库查询返回的 Lead 行类型。 */
export type LeadQueryRow = {
  id: string;
  org_id: string | null;
  app_user_id: string;
  source: string;
  language: string;
  status: string;
  assigned_org_id: string | null;
  assigned_user_id: string | null;
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
  form_data: unknown;
  status: string;
  created_at: unknown;
  updated_at: unknown;
};

// ── Timestamp Helpers ──

function toTimestampStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return null;
}

function requireTimestampString(value: unknown, field: string): string {
  const s = toTimestampStringOrNull(value);
  if (!s) throw new Error(`Invalid timestamp: ${field}`);
  return s;
}

// ── Map Functions ──

/**
 * 将 DB 行映射为 AppUser。
 * @param r DB 行
 * @returns AppUser
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
 * @param r DB 行
 * @returns Lead
 */
export function mapLeadRow(r: LeadQueryRow): Lead {
  return {
    id: r.id,
    orgId: r.org_id,
    appUserId: r.app_user_id,
    source: r.source,
    language: r.language,
    status: r.status,
    assignedOrgId: r.assigned_org_id,
    assignedUserId: r.assigned_user_id,
    createdAt: requireTimestampString(r.created_at, "created_at"),
    updatedAt: requireTimestampString(r.updated_at, "updated_at"),
  };
}

/**
 * 将 DB 行映射为 Conversation。
 * @param r DB 行
 * @returns Conversation
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
    createdAt: requireTimestampString(r.created_at, "created_at"),
    updatedAt: requireTimestampString(r.updated_at, "updated_at"),
  };
}

/**
 * 将 DB 行映射为 Message。
 * @param r DB 行
 * @returns Message
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
    createdAt: requireTimestampString(r.created_at, "created_at"),
  };
}

/**
 * 将 DB 行映射为 UserDocument。
 * @param r DB 行
 * @returns UserDocument
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
 * 将 DB 行映射为 IntakeForm。
 * @param r DB 行
 * @returns IntakeForm
 */
export function mapIntakeFormRow(r: IntakeFormQueryRow): IntakeForm {
  return {
    id: r.id,
    appUserId: r.app_user_id,
    leadId: r.lead_id,
    caseDraftId: r.case_draft_id,
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

/**
 * 判断输入是否为 PortalTimelineEntityType。
 * @param value 待判断值
 * @returns 是否为 PortalTimelineEntityType
 */
export function isPortalTimelineEntityType(
  value: unknown,
): value is PortalTimelineEntityType {
  if (value === "app_user") return true;
  if (value === "lead") return true;
  if (value === "conversation") return true;
  if (value === "message") return true;
  if (value === "user_document") return true;
  if (value === "intake_form") return true;
  return false;
}
