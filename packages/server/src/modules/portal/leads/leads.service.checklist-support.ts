import { Logger } from "@nestjs/common";
import type { Pool, PoolClient } from "pg";

import type { TemplatesResolver } from "../../core/cases/cases.service.types-internal";
import { resolveChecklistItems } from "../../core/cases/cases.service.create-flow";
import { findActiveCaseTemplateByCaseType } from "../../core/cases/cases.template.repository";
import type { ChecklistItem } from "../../core/cases/cases.service.write-ops";
import type { RequestContext } from "../../core/tenancy/requestContext";
import type { LeadConvertInput } from "./leads.service";

const logger = new Logger("LeadsService");

/**
 * 线索转化时解析对应案件类型的资料清单。
 *
 * 与 CasesService.create 使用同一 resolveChecklistItems 路径，
 * 确保「管理端建案」与「线索转化建案」生成一致的 document_items。
 *
 * @param pool PostgreSQL 连接池
 * @param templatesResolver 模板解析服务
 * @param input 转化入参
 * @returns 资料清单条目
 */
export async function resolveChecklistForConversion(
  pool: Pool,
  templatesResolver: TemplatesResolver | undefined,
  input: LeadConvertInput,
): Promise<ChecklistItem[]> {
  if (!templatesResolver) {
    logger.warn(
      `TemplatesResolver not injected — skipping checklist bootstrap for caseType="${input.caseTypeCode}"`,
    );
    return [];
  }
  const ctx: RequestContext = {
    orgId: input.orgId,
    userId: input.actorUserId ?? input.ownerUserId,
    role: "staff",
  };
  const caseTemplateResolver = (rCtx: RequestContext, code: string) =>
    findActiveCaseTemplateByCaseType(pool, rCtx, code);
  return resolveChecklistItems(
    templatesResolver,
    ctx,
    input.caseTypeCode,
    caseTemplateResolver,
  );
}

/**
 * 事务内批量插入资料清单条目（与 cases.service.write-ops.insertDocumentItems 逻辑一致）。
 *
 * @param client 事务连接
 * @param orgId 组织 ID
 * @param caseId 案件 ID
 * @param items 清单条目
 */
export async function insertDocumentItemsInTx(
  client: PoolClient,
  orgId: string,
  caseId: string,
  items: ChecklistItem[],
): Promise<void> {
  for (const item of items) {
    await client.query(
      `insert into document_items (org_id, case_id, checklist_item_code, name, status, owner_side, category, required_flag, provided_by_role)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        orgId,
        caseId,
        item.code,
        item.name,
        "pending",
        item.ownerSide ?? "applicant",
        item.category ?? null,
        item.requiredFlag ?? false,
        item.providedByRole ?? null,
      ],
    );
  }
}

/**
 * 事务内写入 case.created timeline（标记 source 为 lead_conversion）。
 *
 * @param client 事务连接
 * @param input 转化入参
 * @param caseId 案件 ID
 */
export async function writeCaseCreatedTimelineInTx(
  client: PoolClient,
  input: LeadConvertInput,
  caseId: string,
): Promise<void> {
  const actorUserId = input.actorUserId ?? input.ownerUserId;
  await client.query(
    `insert into timeline_logs (org_id, entity_type, entity_id, action, actor_user_id, payload)
     values ($1, 'case', $2, 'case.created', $3, $4::jsonb)`,
    [
      input.orgId,
      caseId,
      actorUserId,
      JSON.stringify({
        caseTypeCode: input.caseTypeCode,
        stage: "open",
        status: "open",
        source: "lead_conversion",
      }),
    ],
  );
}
