/**
 * CaseRepositorySupport — 案件仓储 wrapper。
 *
 * 基于 `shared/api/repositoryRuntime` 提供案件默认值：
 * - `apiPath` 默认 `"/api/cases"`
 * - `getToken` 默认 `getAdminAccessToken`
 * - `writeErrorCode` 固定 `"CASE_WRITE_ERROR"`
 * - `entityLabel` 固定 `"Case"`
 */

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
export type CaseRepositoryErrorCode =
  | "NETWORK"
  | "UNAUTHORIZED"
  | "BAD_RESPONSE"
  | "VALIDATION_ERROR"
  | "CASE_WRITE_ERROR";

/**
 *
 */
export interface CaseRepositoryFactoryInput {
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
export type CaseRepositoryRuntime = RepositoryRuntime;

/**
 *
 */
export const CaseRepositoryError = RepositoryError;
/**
 *
 */
export type CaseRepositoryError = RepositoryError;

/**
 * 根据工厂输入构建案件运行时上下文。
 * 默认 `apiPath: "/api/cases"`、`getToken: getAdminAccessToken`。
 *
 * @param input - request、getToken 和 apiPath 的可选覆盖
 * @returns 包含所有必要依赖的运行时上下文
 */
export function createRuntime(
  input: CaseRepositoryFactoryInput,
): CaseRepositoryRuntime {
  return createRepositoryRuntime({
    request: input.request,
    getToken: input.getToken ?? getAdminAccessToken,
    apiPath: input.apiPath ?? "/api/cases",
    writeErrorCode: "CASE_WRITE_ERROR",
    entityLabel: "Case",
    errorName: "CaseRepositoryError",
  });
}

export { requestAndAdapt };
