// ────────────────────────────────────────────────────────────────
// DocumentTemplate — 文書模板 DTO / 入参 / 错误码
//
// 映射端点：
//   GET  /api/document-templates?caseType=&active=true
//   GET  /api/document-templates/:id
//   POST /api/document-templates
//   PATCH /api/document-templates/:id
// ────────────────────────────────────────────────────────────────

/** 文書模板 DTO — admin adapter 消费此结构。 */
export type DocumentTemplateDto = {
  id: string;
  orgId: string;
  templateName: string;
  caseType: string;
  docType: string;
  language: string;
  versionNo: number;
  contentBody: string;
  variablesSchema: Record<string, unknown>;
  activeFlag: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

/** 文書模板列表响应。 */
export type DocumentTemplateListResult = {
  items: DocumentTemplateDto[];
};

/** 文書模板列表查询参数。 */
export type DocumentTemplateListInput = {
  caseType?: string;
  language?: string;
  includeInactive?: boolean;
};

/** 创建文書模板请求参数。 */
export type DocumentTemplateCreateInput = {
  templateName: string;
  caseType: string;
  docType: string;
  language?: string;
  versionNo?: number;
  contentBody?: string;
  variablesSchema?: Record<string, unknown>;
  activeFlag?: boolean;
};

/** 更新文書模板请求参数（部分更新）。 */
export type DocumentTemplateUpdateInput = {
  templateName?: string;
  caseType?: string;
  docType?: string;
  language?: string;
  contentBody?: string;
  variablesSchema?: Record<string, unknown>;
  activeFlag?: boolean;
};

/** 文書模板错误码 — admin adapter 映射为 i18n key。 */
export const DOCUMENT_TEMPLATE_ERROR_CODES = {
  DT_NOT_FOUND: "DT_NOT_FOUND",
  DT_DUPLICATE: "DT_DUPLICATE",
  DT_INVALID_PAYLOAD: "DT_INVALID_PAYLOAD",
} as const;

/** 文書模板错误码类型联合。 */
export type DocumentTemplateErrorCode =
  (typeof DOCUMENT_TEMPLATE_ERROR_CODES)[keyof typeof DOCUMENT_TEMPLATE_ERROR_CODES];
