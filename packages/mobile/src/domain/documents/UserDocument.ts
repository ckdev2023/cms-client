/**
 * 用户文档摘要（列表用）。
 */
export type UserDocumentSummary = {
  /** 文档 ID。 */
  id: string;
  /** 文件名。 */
  fileName: string;
  /** 文档类型。 */
  docType: string;
  /** 状态。 */
  status: string;
  /** 上传时间。 */
  uploadedAt: string;
};

/**
 * 完整用户文档。
 */
export type UserDocument = UserDocumentSummary & {
  /** 文件 Key（存储引用）。 */
  fileKey: string;
};

/**
 * 文件上传输入参数。
 */
export type FileInput = {
  /** 文件名。 */
  fileName: string;
  /** 文件 MIME 类型。 */
  contentType: string;
  /** Base64 编码的文件数据。 */
  data: string;
};

/**
 * 文档元数据。
 */
export type DocMetadata = {
  /** 文档类型（可选）。 */
  docType?: string;
  /** 关联案件 ID（可选）。 */
  caseId?: string;
};
