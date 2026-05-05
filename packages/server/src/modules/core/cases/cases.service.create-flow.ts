/* eslint-disable jsdoc/require-param-description, jsdoc/require-returns, jsdoc/require-description */
/**
 * 案件创建流程编排（事务体）。
 *
 * 拆分自 `cases.service.ts`：负责单次建案的事务内副作用编排，
 * 不持有 NestJS 注入依赖，仅消费传入的 `tx` / `ctx` / `checklistItems`。
 *
 * 业务步骤：
 * 1. 归一化 ownerUserId（resolveOwnerUserId）。
 * 2. 校验外部引用（assertCreateRefs）。
 * 3. 解析归属组 + 跨组校验（resolveCreateGroup）。
 * 4. 写入 cases 主表（auto case_no 重试）。
 * 5. 写入 document_items / timeline / 初始报价计费方案 / 跨组 timeline / 初始任务。
 */
import { BadRequestException } from "@nestjs/common";

import type { Case } from "../model/coreEntities";
import type { CaseCreateInput } from "./cases.types";
import { CASE_WRITE_ERROR_CODES } from "./cases.types";
import type { RequestContext } from "../tenancy/requestContext";
import type { TenantDbTx } from "../tenancy/tenantDb";
import { requiresBmvCaseCreationGate } from "../../portal/intake/intake.types";

import {
  assertBelongsToOrg,
  assertBmvCaseCreationGate,
  resolveCustomerGroupId,
  resolveExplicitGroupId,
  resolveOwnerUserId,
} from "./cases.service.refs-resolver";
import {
  type ChecklistItem,
  insertCaseWithAutoNumber,
  insertDocumentItems,
  insertInitialTasks,
} from "./cases.service.write-ops";
import {
  insertInitialBillingPlanFromQuote,
  writeCrossGroupTimeline,
  writeTimelineInTx,
} from "./cases.service.timeline";
import type { TemplatesResolver } from "./cases.service.types-internal";

/**
 * 预解析 `document_checklist` 模板配置；legacy/无模板时返回空数组。
 * @param resolver
 * @param ctx
 * @param caseTypeCode
 */
export async function resolveChecklistItems(
  resolver: TemplatesResolver,
  ctx: RequestContext,
  caseTypeCode: string,
): Promise<ChecklistItem[]> {
  let resolved = await resolver.resolve(ctx, {
    kind: "document_checklist",
    key: caseTypeCode,
  });

  if (resolved.mode !== "template" || !resolved.used) {
    resolved = await resolver.resolve(ctx, {
      kind: "case_type",
      key: caseTypeCode,
    });
  }

  if (resolved.mode !== "template" || !resolved.used) return [];

  const rawItems = Array.isArray(resolved.config.items)
    ? (resolved.config.items as Record<string, unknown>[])
    : Array.isArray(resolved.config.requirementBlueprint)
      ? (resolved.config.requirementBlueprint as Record<string, unknown>[])
      : [];

  return rawItems.map((item) => {
    const code =
      typeof item.code === "string"
        ? item.code
        : typeof item.itemCode === "string"
          ? item.itemCode
          : typeof item.checklistItemCode === "string"
            ? item.checklistItemCode
            : "";

    return {
      code,
      name: typeof item.name === "string" ? item.name : "",
      ownerSide:
        typeof item.ownerSide === "string" ? item.ownerSide : "applicant",
      category: typeof item.category === "string" ? item.category : null,
      requiredFlag:
        typeof item.requiredFlag === "boolean" ? item.requiredFlag : false,
      providedByRole:
        typeof item.providedByRole === "string" ? item.providedByRole : null,
    };
  });
}

/**
 *
 * @param tx
 * @param ctx
 * @param input
 * @param checklistItems
 */
export async function runCreateCaseTransaction(
  tx: TenantDbTx,
  ctx: RequestContext,
  input: CaseCreateInput,
  checklistItems: ChecklistItem[],
): Promise<Case> {
  const inputWithOwner: CaseCreateInput = {
    ...input,
    ownerUserId: await resolveOwnerUserId(tx, input.ownerUserId, ctx.userId),
  };
  await assertCreateRefs(tx, inputWithOwner);
  const { resolvedGroupId, isCrossGroup, customerGroupId } =
    await resolveCreateGroup(tx, ctx, inputWithOwner);

  const created = await insertCaseWithAutoNumber(tx, ctx, {
    ...inputWithOwner,
    groupId: resolvedGroupId,
  });
  await insertDocumentItems(tx, ctx.orgId, created.id, checklistItems);
  await writeTimelineInTx(tx, ctx, {
    entityType: "case",
    entityId: created.id,
    action: "case.created",
    payload: {
      caseTypeCode: created.caseTypeCode,
      stage: created.stage,
      status: created.status,
    },
  });
  await insertInitialBillingPlanFromQuote(
    tx,
    ctx,
    created.id,
    created.quotePrice,
  );
  if (isCrossGroup) {
    await writeCrossGroupTimeline(
      tx,
      ctx,
      created.id,
      customerGroupId,
      resolvedGroupId,
      input.crossGroupReason,
    );
  }
  await insertInitialTasks(tx, ctx, created);
  return created;
}

async function assertCreateRefs(
  tx: TenantDbTx,
  input: CaseCreateInput,
): Promise<void> {
  await assertBelongsToOrg(tx, "customers", input.customerId);
  // ownerUserId 在 create() 入口已通过 resolveOwnerUserId 归一化为真实
  // users.id（UUID），并校验存在性；此处无需重复 assertBelongsToOrg。
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  if (input.companyId) {
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    await assertBelongsToOrg(tx, "companies", input.companyId);
  }
  if (input.assistantUserId) {
    await assertBelongsToOrg(tx, "users", input.assistantUserId);
  }

  if (requiresBmvCaseCreationGate(input.caseTypeCode)) {
    await assertBmvCaseCreationGate(tx, input);
  }
}

async function resolveCreateGroup(
  tx: TenantDbTx,
  ctx: RequestContext,
  input: CaseCreateInput,
): Promise<{
  resolvedGroupId: string | null;
  isCrossGroup: boolean;
  customerGroupId: string | null;
}> {
  const customerGroupId = await resolveCustomerGroupId(tx, input.customerId);
  const explicitGroupId = await resolveExplicitGroupId(
    tx,
    ctx.orgId,
    input.groupId,
  );
  const resolvedGroupId = explicitGroupId ?? customerGroupId;
  const isCrossGroup =
    resolvedGroupId !== null &&
    customerGroupId !== null &&
    resolvedGroupId !== customerGroupId;

  if (isCrossGroup && !input.crossGroupReason?.trim()) {
    throw new BadRequestException(
      CASE_WRITE_ERROR_CODES.CROSS_GROUP_REASON_REQUIRED +
        ": crossGroupReason is required when creating a case in a different group than the customer",
    );
  }
  return { resolvedGroupId, isCrossGroup, customerGroupId };
}
