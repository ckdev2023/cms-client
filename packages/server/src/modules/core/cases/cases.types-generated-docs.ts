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
// ── file_url 语义 ──
//   主路径（P0）：file_url 存放运营资源服务器上的外部链接（https://...），
//     由运营在系统外上传后，将 URL 登记到本系统。
//   遗留路径：status=exported 的历史行中 file_url 为内部存储 key，
//     仅供 GET :id/file 下载使用。
//   判断方式：file_url 以 http:// 或 https:// 开头 → 外链；否则 → 存储 key。
//
// 映射端点：
//   GET  /api/generated-documents?caseId=:caseId
//   GET  /api/generated-documents/:id
//   POST /api/generated-documents
//   PATCH /api/generated-documents/:id
//   POST /api/generated-documents/:id/finalize
//   DELETE /api/generated-documents/:id  ← 仅 status=draft 可删
//   POST /api/generated-documents/:id/export  ← @deprecated 弃用，不再入队导出
// ────────────────────────────────────────────────────────────────

/**
 * 生成文书状态枚举 — 对齐 validation gate 检查。
 *
 * 主路径（P0）：draft → final（终态）。
 * 遗留态：exporting / exported / export_failed 仅供历史数据只读兼容，
 *   新流程不应再产生这些状态。
 */
export type GeneratedDocumentStatus =
  | "draft"
  | "final"
  | "exporting"
  | "exported"
  | "export_failed";

/**
 * 生成文书输出格式。
 *
 * `external`：外部文书登记（主路径），文件由运营在外部资源服务器管理，
 *   系统仅记录外链 URL，不参与生成或导出。
 */
export type GeneratedDocumentOutputFormat =
  | "pdf"
  | "docx"
  | "xlsx"
  | "external";

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
 * - `status`：主路径 draft | final；遗留 exporting | exported | export_failed
 * - `outputFormat`：external（主路径）| pdf | docx | xlsx（遗留）
 * - `fileUrl`：外链 URL（主路径）或内部存储 key（遗留 exported 行）
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
  templateVersionNoSnapshot: number | null;
  templateDocType: string | null;
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
 * 主路径状态推进：draft → final（终态）。
 * 遗留路径 final → exported 不再允许通过常规 API 触发。
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
  GD_INVALID_TRANSITION: "GD_INVALID_TRANSITION",
  GD_INVALID_OUTPUT_FORMAT: "GD_INVALID_OUTPUT_FORMAT",
  GD_TITLE_REQUIRED: "GD_TITLE_REQUIRED",
  GD_TEMPLATE_NOT_FOUND: "GD_TEMPLATE_NOT_FOUND",
  GD_TEMPLATE_CASE_TYPE_MISMATCH: "GD_TEMPLATE_CASE_TYPE_MISMATCH",
  /** @deprecated 导出流水线已弃用，仅用于遗留数据兼容。 */
  GD_EXPORT_IN_PROGRESS: "GD_EXPORT_IN_PROGRESS",
  /** @deprecated 导出流水线已弃用，仅用于遗留数据兼容。 */
  GD_EXPORT_FAILED: "GD_EXPORT_FAILED",
  GD_FILE_NOT_AVAILABLE: "GD_FILE_NOT_AVAILABLE",
  GD_FILE_PLACEHOLDER_LEGACY: "GD_FILE_PLACEHOLDER_LEGACY",
  GD_FILE_USE_EXTERNAL_URL: "GD_FILE_USE_EXTERNAL_URL",
  /** finalize 时 file_url 必须为合法的 http(s) 外链。 */
  GD_EXTERNAL_URL_REQUIRED: "GD_EXTERNAL_URL_REQUIRED",
  /** @deprecated 导出端点已弃用，不再接受新的导出请求。 */
  GD_EXPORT_DEPRECATED: "GD_EXPORT_DEPRECATED",
  /** 仅草稿可通过 DELETE 移除；final/exported 等须保留审计链路。 */
  GD_DELETE_ONLY_DRAFT: "GD_DELETE_ONLY_DRAFT",
} as const;

/**
 *
 */
export type GeneratedDocumentErrorCode =
  (typeof GENERATED_DOCUMENT_ERROR_CODES)[keyof typeof GENERATED_DOCUMENT_ERROR_CODES];
