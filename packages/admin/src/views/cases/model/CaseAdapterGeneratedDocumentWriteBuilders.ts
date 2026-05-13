/**
 * 文書登记写入请求体构造器 — UI 表单输入 → server `POST /generated-documents` 请求体。
 *
 * P0 主路径：外部文書登记（名称 + 外链）；可选 `templateId` 由模板行的登记入口填入。
 */

/**
 * 外部文書登记输入。
 * `fileUrl` 为外部资源服务器上的已有文書链接；创建时可空，定稿前必须补齐。
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
   * 外部资源 URL（`https://...`）。创建时可空，定稿前必须补齐。
   */
  fileUrl?: string | null;
  /**
   * 案件类型绑定的模板 ID；从模板行打开登记时使用，便于后端写入模板快照。
   */
  templateId?: string | null;
}

interface GeneratedDocumentPayload {
  caseId: string;
  title: string;
  fileUrl?: string | null;
  templateId?: string;
}

/**
 * 将 UI 层文書登记输入转换为 server `POST /generated-documents` 请求体。
 *
 * @param input - UI 层收集的登记参数
 * @returns 符合 server CreateBody 的请求体
 */
export function buildCreateGeneratedDocumentPayload(
  input: GeneratedDocumentCreateInput,
): GeneratedDocumentPayload {
  const payload: GeneratedDocumentPayload = {
    caseId: input.caseId,
    title: input.title,
  };
  if (input.fileUrl !== undefined && input.fileUrl !== null) {
    payload.fileUrl = input.fileUrl;
  }
  if (
    input.templateId !== undefined &&
    input.templateId !== null &&
    input.templateId.length > 0
  ) {
    payload.templateId = input.templateId;
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

/**
 * 构建 `DELETE /generated-documents/:id` URL。
 *
 * @param casesApiPath - cases API 基路径（如 `/api/cases`）
 * @param docId - 文书 ID
 * @returns 用于发起 DELETE 请求的完整 URL
 */
export function buildGeneratedDocumentDeleteUrl(
  casesApiPath: string,
  docId: string,
): string {
  return (
    casesApiPath.replace(/\/cases\/?$/, "") +
    `/generated-documents/${encodeURIComponent(docId)}`
  );
}
