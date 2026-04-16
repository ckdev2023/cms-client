/**
 * P0 DocumentAsset（资料资产 — 可跨案复用的逻辑材料层）。
 */
export type DocumentAsset = {
  id: string;
  orgId: string;
  /** 归一化资料语义码。 */
  materialCode: string;
  /** 资产所有者类型。 */
  ownerSubjectType: string;
  /** 客户 ID（当 owner_subject_type=customer）。 */
  ownerCustomerId: string | null;
  /** 雇主身份键（当 owner_subject_type=employer）。 */
  ownerEmployerIdentityKey: string | null;
  /** 首次登记来源案件。 */
  originCaseId: string | null;
  /** 首次登记来源资料项。 */
  sourceRequirementId: string | null;
  /** 是否有效。 */
  activeFlag: boolean;
  createdAt: string;
  updatedAt: string;
};

/**
 * P0 DocumentRequirementFileRef（资料项-附件版本引用）。
 */
export type DocumentRequirementFileRef = {
  id: string;
  requirementId: string;
  fileVersionId: string;
  /** 引用模式（direct_register / reuse）。 */
  refMode: string;
  /** 复用时的来源资料项 ID。 */
  linkedFromRequirementId: string | null;
  createdBy: string | null;
  createdAt: string;
};

/**
 * P0 ValidationRun（校验执行记录）。
 */
export type ValidationRun = {
  id: string;
  orgId: string;
  caseId: string;
  /** 执行规则集引用。 */
  rulesetRef: Record<string, unknown> | null;
  /** 执行结果：pending / failed / passed。 */
  resultStatus: string;
  /** 阻断项数量。 */
  blockingCount: number;
  /** 警告项数量。 */
  warningCount: number;
  /** 校验报告载荷。 */
  reportPayload: Record<string, unknown>;
  executedBy: string | null;
  executedAt: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * P0 ReviewRecord（人工复核记录）。
 */
export type ReviewRecord = {
  id: string;
  orgId: string;
  caseId: string;
  validationRunId: string;
  /** 复核决定：approved / rejected。 */
  decision: string;
  comment: string | null;
  reviewerUserId: string | null;
  reviewedAt: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * P0 SubmissionPackage（提交包 — 不可变快照）。
 */
export type SubmissionPackage = {
  id: string;
  orgId: string;
  caseId: string;
  /** 提交序号。 */
  submissionNo: number;
  /** 提交类型：initial / supplement。 */
  submissionKind: string;
  /** 提交时间。 */
  submittedAt: string;
  /** 关联的 Gate-C 校验记录 ID。 */
  validationRunId: string | null;
  /** 审核记录 ID。 */
  reviewRecordId: string | null;
  /** 受理机关名称。 */
  authorityName: string | null;
  /** 受理编号。 */
  acceptanceNo: string | null;
  /** 回执存储类型。 */
  receiptStorageType: string | null;
  /** 回执引用路径。 */
  receiptRelativePathOrKey: string | null;
  /** 补正包关联的原始提交包 ID。 */
  relatedSubmissionId: string | null;
  createdBy: string | null;
  createdAt: string;
};

/**
 * P0 SubmissionPackageItem（提交包锁定引用）。
 */
export type SubmissionPackageItem = {
  id: string;
  submissionPackageId: string;
  /** 引用类型。 */
  itemType: string;
  /** 被引用对象 ID。 */
  refId: string;
  /** 关键字段快照。 */
  snapshotPayload: Record<string, unknown> | null;
  createdAt: string;
};
