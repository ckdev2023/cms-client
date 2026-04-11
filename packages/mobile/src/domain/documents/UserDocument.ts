/**
 * P0 资料项状态枚举（§3.2）。
 */
export type DocumentRequirementStatus =
  | "not_sent"
  | "waiting_upload"
  | "uploaded_reviewing"
  | "approved"
  | "revision_required"
  | "waived"
  | "expired";

/**
 * P0 资料附件审核状态。
 */
export type DocumentFileReviewStatus = "pending" | "approved" | "rejected";

/**
 * P0 DocumentRequirement 领域实体（§3.9）。
 * 描述"需要什么材料"的要求。
 */
export type DocumentRequirement = {
  /** ID。 */
  id: string;
  /** 案件 ID。 */
  caseId: string;
  /** 分类（客户資料 / 扶養者資料 / 事務所内部）。 */
  category: string;
  /** 资料项名称。 */
  itemName: string;
  /** 模板内唯一 key。 */
  itemCode: string;
  /** 是否必交。 */
  requiredFlag: boolean;
  /** 提供方角色。 */
  providedByRole: string | null;
  /** 责任人 ID（可选）。 */
  assigneeUserId: string | null;
  /** 补件截止日。 */
  dueDate: string | null;
  /** 状态。 */
  status: DocumentRequirementStatus;
  /** 是否对客户可见。 */
  clientVisibleFlag: boolean;
  /** 是否需要客户操作。 */
  clientActionRequired: boolean;
  /** 最新版本 ID（便于查询）。 */
  latestVersionId: string | null;
  /** 最近审核意见。 */
  reviewCommentLatest: string | null;
  /** 创建时间。 */
  createdAt: string;
  /** 更新时间。 */
  updatedAt: string;
};

/**
 * P0 DocumentFileVersion 领域实体（§3.10）。
 * 每次上传生成的不可变版本记录。
 */
export type DocumentFileVersion = {
  /** ID。 */
  id: string;
  /** 所属资料项 ID。 */
  requirementId: string;
  /** 版本号（从 1 递增）。 */
  versionNo: number;
  /** 文件名。 */
  fileName: string;
  /** 存储 key 或 URL。 */
  storageKeyOrUrl: string;
  /** MIME 类型。 */
  mimeType: string;
  /** 文件大小（bytes）。 */
  fileSize: number;
  /** 上传人类型（internal_user / client_user）。 */
  uploadedByType: "internal_user" | "client_user";
  /** 上传人 ID。 */
  uploadedById: string;
  /** 上传时间。 */
  uploadedAt: string;
  /** 可见范围。 */
  visibleScope: "internal_only" | "client_visible";
  /** 审核状态。 */
  reviewStatus: DocumentFileReviewStatus;
  /** 审核人（可选）。 */
  reviewBy: string | null;
  /** 审核时间（可选）。 */
  reviewAt: string | null;
  /** 审核意见（可选）。 */
  reviewComment: string | null;
  /** 材料有效期（可选）。 */
  expiryDate: string | null;
};

/**
 * 用户文档摘要（列表用）。
 * 兼容既存 DocumentRepository / DocumentApi 接口。
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
 * 兼容既存 DocumentRepository / DocumentApi 接口。
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
