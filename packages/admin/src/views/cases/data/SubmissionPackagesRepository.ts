import { getAdminAccessToken } from "../../../auth/model/adminSession";
import {
  createRepositoryRuntime,
  RepositoryError,
  requestAndAdapt,
  type RepositoryRuntime,
} from "../../../shared/api/repositoryRuntime";

/**
 *
 */
export interface SubmissionPackageResult {
  /**
   *
   */
  id: string;
  /**
   *
   */
  caseId: string;
}

/**
 *
 */
export interface SubmissionPackageCreateInput {
  /**
   *
   */
  caseId: string;
  /**
   *
   */
  submissionKind?: "initial" | "supplement";
  /**
   *
   */
  validationRunId?: string | null;
  /**
   *
   */
  reviewRecordId?: string | null;
  /**
   *
   */
  items: Array<{
    /**
     *
     */
    itemType: string;
    /**
     *
     */
    refId: string;
    /**
     *
     */
    snapshotPayload?: Record<string, unknown> | null;
  }>;
}

/**
 *
 */
export interface SubmissionPackagesRepositoryFactoryInput {
  /**
   *
   */
  request?: typeof fetch;
  /**
   *
   */
  getToken?: () => string | null;
  /**
   *
   */
  apiPath?: string;
}

/**
 *
 */
export interface SubmissionPackagesRepository {
  /**
   *
   */
  create(input: SubmissionPackageCreateInput): Promise<SubmissionPackageResult>;
}

export const SubmissionPackagesRepositoryError = RepositoryError;
/**
 *
 */
export type SubmissionPackagesRepositoryError = RepositoryError;

function adaptResult(body: unknown): SubmissionPackageResult | null {
  if (!body || typeof body !== "object") return null;
  const rec = body as Record<string, unknown>;
  if (typeof rec.id !== "string") return null;
  return {
    id: rec.id as string,
    caseId: (rec.caseId as string) ?? "",
  };
}

function buildPayload(
  input: SubmissionPackageCreateInput,
): Record<string, unknown> {
  return {
    caseId: input.caseId,
    submissionKind: input.submissionKind ?? "initial",
    validationRunId: input.validationRunId,
    reviewRecordId: input.reviewRecordId,
    items: input.items,
  };
}

function createRuntime(
  input: SubmissionPackagesRepositoryFactoryInput,
): RepositoryRuntime {
  return createRepositoryRuntime({
    request: input.request,
    getToken: input.getToken ?? getAdminAccessToken,
    apiPath: input.apiPath ?? "/api/submission-packages",
    writeErrorCode: "CASE_WRITE_ERROR",
    entityLabel: "SubmissionPackage",
    errorName: "SubmissionPackagesRepositoryError",
  });
}

/**
 *
 * @param input
 */
/**
 * 创建基于 HTTP 请求的提交包仓储。
 *
 * @param input - 可选的 fetch、令牌提供者和 API 路径覆盖
 * @returns 实现提交包创建操作的仓储实例
 */
export function createSubmissionPackagesRepository(
  input: SubmissionPackagesRepositoryFactoryInput = {},
): SubmissionPackagesRepository {
  const runtime = createRuntime(input);

  return {
    async create(
      createInput: SubmissionPackageCreateInput,
    ): Promise<SubmissionPackageResult> {
      return requestAndAdapt({
        runtime,
        url: runtime.apiPath,
        method: "POST",
        body: buildPayload(createInput),
        adapt: adaptResult,
        errorMessage: "Invalid create submission package response",
      });
    },
  };
}
