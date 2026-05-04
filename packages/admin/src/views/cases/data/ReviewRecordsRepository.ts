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
export interface ReviewRecordResult {
  /**
   *
   */
  id: string;
  /**
   *
   */
  caseId: string;
  /**
   *
   */
  status: string;
}

/**
 *
 */
export interface ReviewRecordsRepositoryFactoryInput {
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
export interface ReviewRecordsRepository {
  /**
   *
   */
  createReviewRequest(input: {
    /**
     *
     */
    caseId: string;
  }): Promise<ReviewRecordResult>;
}

export const ReviewRecordsRepositoryError = RepositoryError;
/**
 *
 */
export type ReviewRecordsRepositoryError = RepositoryError;

function adaptResult(body: unknown): ReviewRecordResult | null {
  if (!body || typeof body !== "object") return null;
  const rec = body as Record<string, unknown>;
  if (typeof rec.id !== "string") return null;
  return {
    id: rec.id as string,
    caseId: (rec.caseId as string) ?? "",
    status: (rec.status as string) ?? "unknown",
  };
}

function createRuntime(
  input: ReviewRecordsRepositoryFactoryInput,
): RepositoryRuntime {
  return createRepositoryRuntime({
    request: input.request,
    getToken: input.getToken ?? getAdminAccessToken,
    apiPath: input.apiPath ?? "/api/review-records",
    writeErrorCode: "CASE_WRITE_ERROR",
    entityLabel: "ReviewRecord",
    errorName: "ReviewRecordsRepositoryError",
  });
}

/**
 * 复核记录仓储工厂——构建指向 `/api/review-records` 的仓储实例。
 *
 * @param input - 可选覆盖（request、getToken、apiPath）
 * @returns 包含 `createReviewRequest` 方法的仓储实例
 */
export function createReviewRecordsRepository(
  input: ReviewRecordsRepositoryFactoryInput = {},
): ReviewRecordsRepository {
  const runtime = createRuntime(input);

  return {
    async createReviewRequest({ caseId }): Promise<ReviewRecordResult> {
      return requestAndAdapt({
        runtime,
        url: runtime.apiPath,
        method: "POST",
        body: { caseId },
        adapt: adaptResult,
        errorMessage: "Invalid review record response",
      });
    },
  };
}
