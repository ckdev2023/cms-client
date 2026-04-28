/**
 * BillingRepositorySupport — 账单仓储 wrapper。
 *
 * 基于 `shared/api/repositoryRuntime` 提供账单默认值：
 * - `apiPath` 默认 `"/api"`
 * - `getToken` 默认 `getAdminAccessToken`
 * - `writeErrorCode` 固定 `"BILLING_WRITE_ERROR"`
 * - `entityLabel` 固定 `"Billing"`
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
export interface BillingRepositoryFactoryInput {
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
export type BillingRepositoryRuntime = RepositoryRuntime;

/**
 *
 */
export const BillingRepositoryError = RepositoryError;
/**
 *
 */
export type BillingRepositoryError = RepositoryError;

/**
 * 根据工厂输入构建账单运行时上下文。
 * 默认 `apiPath: "/api"`、`getToken: getAdminAccessToken`。
 *
 * @param input - request、getToken 和 apiPath 的可选覆盖
 * @returns 包含所有必要依赖的运行时上下文
 */
export function createBillingRepositoryRuntime(
  input: BillingRepositoryFactoryInput = {},
): BillingRepositoryRuntime {
  return createRepositoryRuntime({
    request: input.request,
    getToken: input.getToken ?? getAdminAccessToken,
    apiPath: input.apiPath ?? "/api",
    writeErrorCode: "BILLING_WRITE_ERROR",
    entityLabel: "Billing",
    errorName: "BillingRepositoryError",
  });
}

export { requestAndAdapt };
