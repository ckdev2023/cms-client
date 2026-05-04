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
export interface ValidationRunResult {
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
export interface ValidationRunsRepositoryFactoryInput {
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
export interface ValidationRunsRepository {
  /**
   *
   */
  createRun(input: {
    /**
     *
     */
    caseId: string;
  }): Promise<ValidationRunResult>;
}

export const ValidationRunsRepositoryError = RepositoryError;
/**
 *
 */
export type ValidationRunsRepositoryError = RepositoryError;

function adaptValidationRunResult(body: unknown): ValidationRunResult | null {
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
  input: ValidationRunsRepositoryFactoryInput,
): RepositoryRuntime {
  return createRepositoryRuntime({
    request: input.request,
    getToken: input.getToken ?? getAdminAccessToken,
    apiPath: input.apiPath ?? "/api/validation-runs",
    writeErrorCode: "VALIDATION_RUN_WRITE_ERROR",
    entityLabel: "ValidationRun",
    errorName: "ValidationRunsRepositoryError",
  });
}

/**
 *
 * @param input
 */
/**
 * 校验运行仓储工厂——构建指向 `/api/validation-runs` 的仓储实例。
 *
 * @param input - 可选覆盖（request、getToken、apiPath）
 * @returns 包含 `createRun` 方法的仓储实例
 */
export function createValidationRunsRepository(
  input: ValidationRunsRepositoryFactoryInput = {},
): ValidationRunsRepository {
  const runtime = createRuntime(input);

  return {
    async createRun({ caseId }): Promise<ValidationRunResult> {
      return requestAndAdapt({
        runtime,
        url: runtime.apiPath,
        method: "POST",
        body: { caseId },
        adapt: adaptValidationRunResult,
        errorMessage: "Invalid validation run response",
      });
    },
  };
}
