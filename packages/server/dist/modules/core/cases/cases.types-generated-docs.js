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
/** 生成文书错误码 — admin adapter 映射为 i18n key。 */
export const GENERATED_DOCUMENT_ERROR_CODES = {
  GD_CASE_NOT_FOUND: "GD_CASE_NOT_FOUND",
  GD_CASE_S9_READONLY: "GD_CASE_S9_READONLY",
  GD_NOT_FOUND: "GD_NOT_FOUND",
  GD_INVALID_STATUS: "GD_INVALID_STATUS",
  GD_INVALID_OUTPUT_FORMAT: "GD_INVALID_OUTPUT_FORMAT",
  GD_TITLE_REQUIRED: "GD_TITLE_REQUIRED",
};
//# sourceMappingURL=cases.types-generated-docs.js.map
