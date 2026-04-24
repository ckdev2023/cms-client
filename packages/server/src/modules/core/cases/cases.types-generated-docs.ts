// ────────────────────────────────────────────────────────────────
// Generated-Documents 案件视角读写模型 — 冻结契约
//
// 案件详情 forms tab 消费 generated-documents 列表端点。
// validation-runs 校验 generated_documents_present /
// generated_documents_finalized 门禁条件。
// submission-packages 引用 itemType=generated_document_version。
//
// 以下类型描述 admin adapter 消费的 DTO 形状，
// 与 REST 端点的返回值一一对应。
//
// 映射端点：
//   GET  /api/generated-documents?caseId=:caseId
//   GET  /api/generated-documents/:id
//   POST /api/generated-documents
//   PATCH /api/generated-documents/:id
// ────────────────────────────────────────────────────────────────

/** 生成文书状态枚举 — 对齐 validation gate 检查。 */
export type GeneratedDocumentStatus = "draft" | "final" | "exported";

/** 生成文书输出格式。 */
export type GeneratedDocumentOutputFormat = "pdf" | "docx" | "xlsx";

/**
 * 案件视角生成文书查询参数。
 *
 * 映射端点：`GET /api/generated-documents?caseId=:caseId`
 */
export type GeneratedDocumentListInput = {
  caseId: string;
  status?: string;
  page?: number;
  limit?: number;
};

/**
 * 案件视角生成文书 DTO — 与 `GeneratedDocument` 核心实体同构。
 *
 * admin adapter 消费此结构映射为 `FormGenerated`。
 * 字段语义：
 * - `status`：draft | final | exported
 * - `outputFormat`：pdf | docx | xlsx
 * - `versionNo`：版本号（同一 template 多次生成时递增）
 * - `generatedByDisplayName`：生成人展示名（server 端 join 填充）
 * - `approvedByDisplayName`：审批人展示名（server 端 join 填充）
 */
export type GeneratedDocumentDto = {
  id: string;
  caseId: string;
  templateId: string | null;
  title: string;
  versionNo: number;
  outputFormat: string;
  fileUrl: string | null;
  status: string;
  generatedBy: string | null;
  generatedByDisplayName: string | null;
  approvedBy: string | null;
  approvedByDisplayName: string | null;
  generatedAt: string;
  approvedAt: string | null;
};

/**
 * 案件视角生成文书列表响应。
 */
export type GeneratedDocumentListResult = {
  items: GeneratedDocumentDto[];
  total: number;
};

/**
 * 创建生成文书请求参数。
 *
 * 最小必填：caseId + title。
 * templateId 可选（手动生成时不关联模板）。
 */
export type GeneratedDocumentCreateInput = {
  caseId: string;
  templateId?: string | null;
  title: string;
  outputFormat?: string;
  fileUrl?: string | null;
  status?: string;
};

/**
 * 更新生成文书请求参数（部分更新）。
 *
 * 状态推进：draft → final → exported。
 * 审批：当 status 变为 final 时 server 自动填充 approvedBy / approvedAt。
 */
export type GeneratedDocumentUpdateInput = {
  title?: string;
  outputFormat?: string;
  fileUrl?: string | null;
  status?: string;
};

/** 生成文书错误码 — admin adapter 映射为 i18n key。 */
export const GENERATED_DOCUMENT_ERROR_CODES = {
  GD_CASE_NOT_FOUND: "GD_CASE_NOT_FOUND",
  GD_CASE_S9_READONLY: "GD_CASE_S9_READONLY",
  GD_NOT_FOUND: "GD_NOT_FOUND",
  GD_INVALID_STATUS: "GD_INVALID_STATUS",
  GD_INVALID_OUTPUT_FORMAT: "GD_INVALID_OUTPUT_FORMAT",
  GD_TITLE_REQUIRED: "GD_TITLE_REQUIRED",
} as const;

/**
 *
 */
export type GeneratedDocumentErrorCode =
  (typeof GENERATED_DOCUMENT_ERROR_CODES)[keyof typeof GENERATED_DOCUMENT_ERROR_CODES];
