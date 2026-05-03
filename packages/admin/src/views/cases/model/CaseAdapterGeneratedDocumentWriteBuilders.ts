/**
 * 生成文書写入请求体构造器 — UI 表单输入 → server `POST /generated-documents` 请求体。
 */

/**
 *
 */
export interface GeneratedDocumentCreateInput {
  /**
   *
   */
  caseId: string;
  /**
   *
   */
  title: string;
  /**
   *
   */
  templateId?: string | null;
  /**
   *
   */
  outputFormat?: string;
}

interface GeneratedDocumentPayload {
  caseId: string;
  title: string;
  templateId?: string | null;
  outputFormat?: string;
}

/**
 * 将 UI 层生成文書输入转换为 server `POST /generated-documents` 请求体。
 *
 * @param input - UI 层收集的生成参数
 * @returns 符合 server CreateBody 的请求体
 */
export function buildCreateGeneratedDocumentPayload(
  input: GeneratedDocumentCreateInput,
): GeneratedDocumentPayload {
  const payload: GeneratedDocumentPayload = {
    caseId: input.caseId,
    title: input.title,
  };
  if (input.templateId !== undefined) {
    payload.templateId = input.templateId;
  }
  if (input.outputFormat) {
    payload.outputFormat = input.outputFormat;
  }
  return payload;
}

/**
 * 构建 generated-documents POST URL。
 *
 * @param casesApiPath - cases API 基路径（如 `/api/cases`）
 * @returns POST URL，如 `/api/generated-documents`
 */
export function buildGeneratedDocumentsPostUrl(casesApiPath: string): string {
  return casesApiPath.replace(/\/cases\/?$/, "") + "/generated-documents";
}
