/**
 * billing 所需的「案件可编辑」最小守门接口（拆分批次 S5 解环）。
 *
 * 为什么存在：`BillingCollectionsService` 催收前必须断言当前用户可编辑该案件，
 * 但若直接 import `cases` 的 `CaseAccessService`，就会与 `cases → billing`
 * （收费引擎与 DTO）形成模块级双向依赖。
 *
 * 解法沿用本仓库既有范式 —— `cases.service.types-internal.ts` 的
 * `TEMPLATES_RESOLVER`（"TemplatesService 的最小接口，避免 core → templates
 * 直接依赖"）：由**消费方**声明它真正需要的窄接口与注入令牌，实现方在
 * `app.module` 用 `useExisting` 绑定。billing 因此不再 import cases。
 */
import type { RequestContext } from "../tenancy/requestContext";

/** 案件可编辑守门：case 不存在抛 NotFound，无权限抛 Forbidden。 */
export type CaseEditGuard = {
  assertCanEditCase(ctx: RequestContext, caseId: string): Promise<void>;
};

/** CaseEditGuard 注入令牌（app.module 绑定到 cases 的 CaseAccessService）。 */
export const CASE_EDIT_GUARD = Symbol("CASE_EDIT_GUARD");
