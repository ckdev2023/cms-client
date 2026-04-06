import type {
  UserDocumentSummary,
  UserDocument,
  FileInput,
  DocMetadata,
} from "./UserDocument";

/**
 * Document 领域仓库接口。
 */
export type DocumentRepository = {
  /**
   * 获取文档列表。
   *
   * @param filters 筛选条件
   * @returns 文档摘要列表
   */
  listMyDocuments(filters?: {
    caseId?: string;
  }): Promise<UserDocumentSummary[]>;

  /**
   * 上传文档。
   *
   * @param file 文件输入
   * @param metadata 文档元数据
   * @returns 上传的文档
   */
  uploadDocument(file: FileInput, metadata: DocMetadata): Promise<UserDocument>;

  /**
   * 获取下载 URL。
   *
   * @param docId 文档 ID
   * @returns 签名下载 URL
   */
  getDownloadUrl(docId: string): Promise<string>;
};
