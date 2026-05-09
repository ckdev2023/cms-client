import type { DocumentFile, DocumentItem } from "./model/coreEntities";

// ────────────────────────────────────────────────────────────────
// 案件视角资料模块冻结契约
//
// 覆盖 admin detail 页面"资料"tab 的读写需求：
//   document-items（资料清单项）+ document-files（附件版本）
//
// 此类型是 admin adapter 与 controller 之间的唯一接口约定。
// P1 扩展通过追加可选字段方式叠加，不删除/改名现有属性。
//
// 权威来源：
//   - P0/03-业务规则与不变量 §2.1–§2.5、§3.2、§4.2、§7
//   - P0/07-数据模型设计 §3.9–§3.10、§4
//   - p0-authority-baseline §7
//   - P0-CONTRACT-DETAIL §4.2、§6–§8
// ────────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────────
// 写接口错误码
//
// admin adapter 映射为 i18n key，不依赖 message 文本。
// ────────────────────────────────────────────────────────────────

export const DOCUMENT_ITEM_ERROR_CODES = {
  NOT_FOUND: "DOCUMENT_ITEM_NOT_FOUND",
  ALREADY_DELETED: "DOCUMENT_ITEM_ALREADY_DELETED",
  TRANSITION_NOT_ALLOWED: "DOCUMENT_ITEM_TRANSITION_NOT_ALLOWED",
  TRANSITION_CONFLICT: "DOCUMENT_ITEM_TRANSITION_CONFLICT",
  FOLLOW_UP_STATUS_INVALID: "DOCUMENT_ITEM_FOLLOW_UP_STATUS_INVALID",
  CASE_S9_READONLY: "DOCUMENT_ITEM_CASE_S9_READONLY",
} as const;

/**
 *
 */
export type DocumentItemErrorCode =
  (typeof DOCUMENT_ITEM_ERROR_CODES)[keyof typeof DOCUMENT_ITEM_ERROR_CODES];

export const DOCUMENT_FILE_ERROR_CODES = {
  NOT_FOUND: "DOCUMENT_FILE_NOT_FOUND",
  REQUIREMENT_NOT_FOUND: "DOCUMENT_FILE_REQUIREMENT_NOT_FOUND",
  REVIEW_NOT_PENDING: "DOCUMENT_FILE_REVIEW_NOT_PENDING",
  REVIEW_CONFLICT: "DOCUMENT_FILE_REVIEW_CONFLICT",
  LOCKED_IN_SUBMISSION: "DOCUMENT_FILE_LOCKED_IN_SUBMISSION",
  UNSUPPORTED_STORAGE_TYPE: "DOCUMENT_FILE_UNSUPPORTED_STORAGE_TYPE",
  LOCAL_REGISTRATION_REJECTS_BINARY:
    "DOCUMENT_FILE_LOCAL_REGISTRATION_REJECTS_BINARY",
  BINARY_UPLOAD_REQUIRES_DATA: "DOCUMENT_FILE_BINARY_UPLOAD_REQUIRES_DATA",
  BINARY_UPLOAD_REQUIRES_CONTENT_TYPE:
    "DOCUMENT_FILE_BINARY_UPLOAD_REQUIRES_CONTENT_TYPE",
  RELATIVE_PATH_INVALID: "DOCUMENT_FILE_RELATIVE_PATH_INVALID",
  CASE_S9_READONLY: "DOCUMENT_FILE_CASE_S9_READONLY",
} as const;

/**
 *
 */
export type DocumentFileErrorCode =
  (typeof DOCUMENT_FILE_ERROR_CODES)[keyof typeof DOCUMENT_FILE_ERROR_CODES];

// ────────────────────────────────────────────────────────────────
// Document Item 状态枚举（P0 冻结 7 状态 + deleted 软删除）
//
// P0 权威：03 §3.2、07 §4 enum_document_requirement_status
//
// 注意：当前 service 初始状态为 "pending"；P0 文档使用 "not_sent"。
// 本次契约冻结 "pending" 作为 P0 初始状态，与现有实现保持一致。
// 若后续需对齐 P0 文档的 "not_sent" 命名，须通过数据迁移统一切换。
// ────────────────────────────────────────────────────────────────

export const DOCUMENT_ITEM_STATUSES = [
  "pending",
  "waiting_upload",
  "uploaded_reviewing",
  "approved",
  "revision_required",
  "waived",
  "expired",
  "deleted",
] as const;

/**
 *
 */
export type DocumentItemStatusEnum = (typeof DOCUMENT_ITEM_STATUSES)[number];

/**
 * 合法的资料项状态流转矩阵（P0 冻結）。
 *
 * P0 権威：03 §3.2
 * - `pending` → `waiting_upload`（已发出请求）、`uploaded_reviewing`（登记后待审核）
 * - `waiting_upload` → `uploaded_reviewing`（已登记/已上传）
 * - `uploaded_reviewing` → `approved`（审核通过）、`revision_required`（退回补正）
 * - `revision_required` → `waiting_upload`（重新登记）、`uploaded_reviewing`（重新提交后待审核）
 * - `approved` → `expired`（过期）
 * - `expired` → `waiting_upload`（重新请求有效版本）
 *
 * 注意：
 * - `*→waived` 路径已关闭，豁免必须走专用端点 `POST /:id/waive`。
 * - `waived` 状态出度仅由 `POST /:id/unwaive` 提供（与 `*→waived` 已关闭对称）。
 */
export const DOCUMENT_ITEM_ALLOWED_TRANSITIONS: Readonly<
  Partial<Record<DocumentItemStatusEnum, readonly DocumentItemStatusEnum[]>>
> = {
  pending: ["waiting_upload", "uploaded_reviewing"],
  waiting_upload: ["uploaded_reviewing"],
  uploaded_reviewing: ["approved", "revision_required"],
  revision_required: ["waiting_upload", "uploaded_reviewing"],
  approved: ["expired"],
  expired: ["waiting_upload"],
} as const;

// ────────────────────────────────────────────────────────────────
// Document Item 提供方角色（owner_side）
//
// P0 权威：07 §3.9（provided_by_role / owner_side）
// ────────────────────────────────────────────────────────────────

export const DOCUMENT_ITEM_OWNER_SIDES = [
  "applicant",
  "customer",
  "office",
] as const;

/**
 *
 */
export type DocumentItemOwnerSideEnum =
  (typeof DOCUMENT_ITEM_OWNER_SIDES)[number];

// ────────────────────────────────────────────────────────────────
// Document File 审核状态
//
// P0 权威：07 §4 enum_document_file_review_status
// ────────────────────────────────────────────────────────────────

export const DOCUMENT_FILE_REVIEW_STATUSES = [
  "pending",
  "approved",
  "rejected",
] as const;

/**
 *
 */
export type DocumentFileReviewStatusEnum =
  (typeof DOCUMENT_FILE_REVIEW_STATUSES)[number];

// ────────────────────────────────────────────────────────────────
// 本地归档登记口径 — P0 冻结
//
// P0 权威：03 §2.1–§2.3、p0-authority-baseline §7
//
// P0 资料处理以事务所本地资料服务器为主。
// "上传/新增版本"在 P0 语义下是**登记资料版本**：
//   - 系统不保存文件二进制；保存"版本元数据 + 状态流转 + 审核/催办留痕"
//   - 每个版本至少记录：storage、relative_path、file_name、uploaded_by、uploaded_at
//   - 本地根目录在事务所设置中配置（OrgSetting）；系统仅存相对路径
//
// storage_type 取值：
//   - P0 仅允许 "local_server"（本地资料服务器）
//   - P1+ 可扩展 "cloud_s3"、"cloud_gcs" 等（追加，不删除现有值）
//
// relative_path 规范：
//   - 必须是相对路径（不含盘符、根斜杠、波浪号）
//   - 禁止包含 ".."（防止目录穿越）
//   - 禁止包含空段或 "." 段
//   - 反斜杠统一替换为正斜杠
//   - 前后空白裁剪
//
// 文案约束（admin 侧）：
//   - 主入口：统一使用"登记资料（本地归档）"
//   - 行内说明："已登记" / "待登记" / "本地归档相对路径"
//   - 页头 CTA：避免"上传资料"，统一改为"登记资料"
//   - 成功反馈：避免"上传成功"，改为"登记成功"
//   - 仅"上传回执"等提交后动作允许使用上传类表述
// ────────────────────────────────────────────────────────────────

export const LOCAL_STORAGE_TYPE = "local_server" as const;

export const DOCUMENT_STORAGE_TYPES = [LOCAL_STORAGE_TYPE] as const;

/**
 *
 */
export type DocumentStorageType = (typeof DOCUMENT_STORAGE_TYPES)[number];

// ────────────────────────────────────────────────────────────────
// Waive 原因码 — P0 产品决策
//
// 仅用于 POST /document-items/:id/waive 端点。
// 不走 DOCUMENT_ITEM_ALLOWED_TRANSITIONS 矩阵。
// ────────────────────────────────────────────────────────────────

export const WAIVE_REASON_CODES = [
  "visa_type_exempt",
  "guarantor_family_exempt",
  "equivalent_in_other_case",
  "immigration_confirmed_exempt",
  "other",
] as const;

/**
 *
 */
export type WaiveReasonCode = (typeof WAIVE_REASON_CODES)[number];

export const WAIVE_ALLOWED_FROM_STATUSES: readonly DocumentItemStatusEnum[] = [
  "pending",
  "waiting_upload",
  "revision_required",
  "approved",
  "expired",
];

// ────────────────────────────────────────────────────────────────
// 写接口请求参数 — 冻结契约
// ────────────────────────────────────────────────────────────────

/** 资料项豁免请求参数。 */
export type DocumentItemWaiveInput = {
  reasonCode: WaiveReasonCode;
  note?: string | null;
};

/** 取消豁免请求参数。 */
export type DocumentItemUnwaiveInput = {
  note?: string | null;
};

/** 创建资料项请求参数。 */
export type DocumentItemCreateInput = {
  caseId: string;
  checklistItemCode: string;
  name: string;
  ownerSide?: string;
  dueAt?: string | null;
  note?: string | null;
  category?: string;
  surveyData?: Record<string, unknown> | null;
};

/** 更新资料项请求参数。 */
export type DocumentItemUpdateInput = {
  name?: string;
  ownerSide?: string;
  dueAt?: string | null;
  note?: string | null;
};

/** 更新问卷资料项 survey_data 请求参数（P1 扩展）。 */
export type DocumentItemUpdateSurveyDataInput = {
  surveyData: Record<string, unknown> | null;
};

/** 资料项状态变更请求参数。 */
export type DocumentItemTransitionInput = {
  toStatus: string;
};

/**
 * 资料文件登记/上传请求参数。
 *
 * P0 主路径（本地归档登记）：
 *   提供 `relativePath`，不提供 `data` / `contentType`。
 *   系统写入 `storage_type=local_server` + `relative_path`，不保存文件二进制。
 *
 * 二进制上传路径（预留，回执等场景）：
 *   提供 `data`（base64）+ `contentType`，不提供 `relativePath`。
 *   系统上传至对象存储，写入 `file_url` + `hash_value`。
 *
 * 两条路径互斥，由 `relativePath` 是否存在决定分支。
 */
export type DocumentFileUploadInput = {
  requirementId: string;
  fileName: string;
  data?: Buffer;
  contentType?: string;
  storageType?: string;
  relativePath?: string | null;
  expiryDate?: string | null;
  /** D3: 前端传入的 material_code（优先）；缺省时回退到 requirement 的 checklist_item_code。 */
  materialCode?: string | null;
  /** D3: asset owner_subject_type（缺省 'customer'）。 */
  ownerSubjectType?: string | null;
  /** D3: asset owner_customer_id（缺省从 case.customer_id 取得）。 */
  ownerCustomerId?: string | null;
  /** D3: asset owner_employer_identity_key（缺省 null）。 */
  ownerEmployerIdentityKey?: string | null;
};

/** 资料文件审核请求参数。 */
export type DocumentFileReviewInput = {
  decision: "approve" | "reject";
};

// ────────────────────────────────────────────────────────────────
// 列表查询请求参数 — 冻结契约
// ────────────────────────────────────────────────────────────────

/** 资料项列表查询请求参数（案件维度）。 */
export type DocumentItemListInput = {
  caseId?: string;
  status?: string;
  /** 多状态过滤（数组）。支持虚拟值 "missing"→['pending','revision_required']、"expired"→派生查询。 */
  statusIn?: string[];
  ownerSide?: string;
  category?: string;
  page?: number;
  limit?: number;
};

/**
 * 资料文件列表查询请求参数。
 *
 * `requirementId` 是必填项 — 资料文件始终从属于资料项，
 * 不支持跨资料项的全量列表（防止数据泄漏）。
 */
export type DocumentFileListInput = {
  requirementId: string;
  page?: number;
  limit?: number;
};

// ────────────────────────────────────────────────────────────────
// 案件资料完成率汇总 — 冻结契约
//
// P0 权威：P0-CONTRACT-DETAIL §4.2
//   done = status ∈ {approved, waived}
//   total = 排除 status='deleted'
// ────────────────────────────────────────────────────────────────

/**
 *
 */
export type DocumentCompletionRate = {
  caseId: string;
  total: number;
  completed: number;
  approved: number;
  waived: number;
  completionRate: number;
  /** P1: questionnaire 类资料项总数（含在 total 内）。0 when no questionnaire items. */
  questionnaireTotal: number;
  /** P1: questionnaire 类已完成项数（含在 completed 内）。 */
  questionnaireCompleted: number;
  /** P1: questionnaire 类完成率。 */
  questionnaireCompletionRate: number;
};

// ────────────────────────────────────────────────────────────────
// 响应 DTO — 冻结契约
//
// controller 在返回 DocumentFile 时统一附加 `fileKey` 字段，
// 供 admin 作为路径/地址的展示标识。
//   - 本地归档：fileKey = relativePath
//   - 二进制上传：fileKey = fileUrl
//   - 兜底：fileKey = ""
// ────────────────────────────────────────────────────────────────

/**
 *
 */
export type DocumentFileResponseDto = DocumentFile & {
  fileKey: string;
};

/**
 * 资料项列表响应。
 */
export type DocumentItemListResultDto = {
  items: DocumentItem[];
  total: number;
};

/**
 * 资料文件列表响应。
 */
export type DocumentFileListResultDto = {
  items: DocumentFileResponseDto[];
  total: number;
};
