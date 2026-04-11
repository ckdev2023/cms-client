import type {
  UserDocumentSummary,
  UserDocument,
  FileInput,
  DocMetadata,
  DocumentRequirement,
  DocumentFileVersion,
  DocumentFileReviewStatus,
} from "./UserDocument";

/** 登记附件版本的输入参数。 */
export type RegisterVersionInput = {
  /**
   *
   */
  requirementId: string;
  /**
   *
   */
  fileName: string;
  /**
   *
   */
  relativePath: string;
  /**
   *
   */
  mimeType: string;
  /**
   *
   */
  fileSize: number;
};

/**
 * Document 领域仓库接口。
 */
export type DocumentRepository = {
  /** P0：获取资料项列表（DocumentRequirement）。 */
  listRequirements(filters?: {
    caseId?: string;
  }): Promise<DocumentRequirement[]>;

  /** P0：获取资料项的附件版本历史。 */
  getRequirementVersions(requirementId: string): Promise<DocumentFileVersion[]>;

  /** P0：登记一个新的附件版本（本地归档路径登记）。 */
  registerVersion(input: RegisterVersionInput): Promise<DocumentFileVersion>;

  /** P0：审核附件版本。 */
  reviewFileVersion(
    versionId: string,
    decision: DocumentFileReviewStatus,
    comment?: string,
  ): Promise<DocumentFileVersion>;

  /** 获取文档列表（legacy — 保留以兼容既有客户端上传流程）。 */
  listMyDocuments(filters?: {
    caseId?: string;
  }): Promise<UserDocumentSummary[]>;

  /** 上传文档（legacy）。 */
  uploadDocument(file: FileInput, metadata: DocMetadata): Promise<UserDocument>;

  /** 获取下载 URL。 */
  getDownloadUrl(docId: string): Promise<string>;
};
