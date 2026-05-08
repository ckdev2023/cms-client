import { BadRequestException } from "@nestjs/common";
import type { Pool } from "pg";

import type { Lead, LeadQueryRow } from "../../portal/model/portalEntities";
import { mapLeadRow } from "../../portal/model/portalEntities";
import { createDefaultCustomerBmvProfile } from "../customers/customers.dto-mappers";
import { isBmvCaseTypeCode } from "../cases/cases.template-bmv";
import { getCaseTypeLabelJa } from "../cases/caseTypeLabels.ja";
import type { CasesService } from "../cases/cases.service";
import type { RequestContext } from "../tenancy/requestContext";
import { createTenantDb } from "../tenancy/tenantDb";
import { LEAD_COLS, type LeadConvertCaseInput } from "./leads.admin.types";

export const CONVERT_CASE_REQUIRES_CUSTOMER_ERROR_CODE =
  "CONVERT_CASE_REQUIRES_CUSTOMER" as const;

type ConvertCaseDeps = {
  pool: Pool;
  casesService: CasesService;
  getLeadOrThrow: (ctx: RequestContext, id: string) => Promise<Lead>;
  writeAudit: (
    ctx: RequestContext,
    leadId: string,
    logType: string,
    payload: Record<string, unknown>,
  ) => Promise<void>;
};

/**
 * Lead → Case 転化を実行する。
 * @param deps サービス依存
 * @param ctx リクエストコンテキスト
 * @param leadId Lead ID
 * @param input 転化入力
 * @returns 更新後の Lead と caseId
 */
export async function convertCase(
  deps: ConvertCaseDeps,
  ctx: RequestContext,
  leadId: string,
  input: LeadConvertCaseInput,
): Promise<{ lead: Lead; caseId: string }> {
  const lead = await deps.getLeadOrThrow(ctx, leadId);
  const customerId = assertConvertCasePreconditions(lead);

  const isBmv = isBmvCaseTypeCode(input.caseTypeCode);
  const caseName = composeCaseName(lead, input.caseTypeCode);
  const caseEntity = await deps.casesService.create(ctx, {
    customerId,
    caseTypeCode: input.caseTypeCode,
    ownerUserId: input.ownerUserId,
    groupId: input.groupId ?? lead.groupId ?? undefined,
    caseName,
  });
  const caseId = caseEntity.id;
  const caseNo = normalizeCaseNo(caseEntity.caseNo);

  const tenantDb = createTenantDb(deps.pool, ctx.orgId, ctx.userId);
  const result = await tenantDb.query<LeadQueryRow>(
    `update leads set status = 'converted_case', converted_case_id = $2, updated_at = now() where id = $1 returning ${LEAD_COLS}`,
    [leadId, caseId],
  );
  const row = result.rows.at(0);
  if (!row) throw new BadRequestException("Failed to update lead");

  if (isBmv) {
    await initializeBmvProfile(tenantDb, customerId, leadId);
  }
  await backfillConversationCustomer(tenantDb, customerId, leadId);

  // NEW-V5-4 修复：在案件侧补一条「由线索 LEAD-XXX 转化而来」时间线，
  // 与 LEAD 侧的 `lead.converted_case` 形成双向可追溯对（避免「案件 → 线索」
  // 必须经客户三跳追溯）。
  await writeCaseConvertedFromLeadTimeline(tenantDb, ctx, {
    caseId,
    leadId,
    customerId,
    leadNo: lead.leadNo,
  });

  // R-FLOW5-A-6：caseNo / caseNumber 写入 lead_logs.payload，使日志 Tab
  // 显示 CASE-... 编号而非 8 位 UUID 前缀；caseNumber 字段保留兼容旧渲染器。
  await deps.writeAudit(ctx, leadId, "converted_case", {
    caseId,
    caseTypeCode: input.caseTypeCode,
    ownerUserId: input.ownerUserId,
    isBmv,
    ...(caseNo ? { caseNo, caseNumber: caseNo } : {}),
  });

  return { lead: mapLeadRow(row), caseId };
}

async function writeCaseConvertedFromLeadTimeline(
  db: { query: (sql: string, params: unknown[]) => Promise<unknown> },
  ctx: RequestContext,
  payload: {
    caseId: string;
    leadId: string;
    customerId: string;
    leadNo: string | null;
  },
): Promise<void> {
  const { caseId, leadId, customerId, leadNo } = payload;
  const timelinePayload: Record<string, unknown> = {
    leadId,
    customerId,
    ...(leadNo ? { leadNo } : {}),
  };
  await db.query(
    `insert into timeline_logs(org_id, entity_type, entity_id, action, actor_user_id, payload)
     values ($1, 'case', $2, 'case.converted_from_lead', $3, $4::jsonb)`,
    [ctx.orgId, caseId, ctx.userId, JSON.stringify(timelinePayload)],
  );
}

function assertConvertCasePreconditions(lead: Lead): string {
  if (!lead.convertedCustomerId) {
    throw new BadRequestException({
      code: CONVERT_CASE_REQUIRES_CUSTOMER_ERROR_CODE,
      message:
        "Lead must have converted_customer_id; run convert-customer first",
      blockers: [
        {
          code: "MISSING_CONVERTED_CUSTOMER",
          message: "Must convert to customer before creating case",
        },
      ],
    });
  }
  if (lead.status === "converted_case") {
    throw new BadRequestException("Lead is already converted to a case");
  }
  return lead.convertedCustomerId;
}

function normalizeCaseNo(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function initializeBmvProfile(
  db: { query: (sql: string, params: unknown[]) => Promise<unknown> },
  customerId: string,
  leadId: string,
): Promise<void> {
  const defaultProfile = createDefaultCustomerBmvProfile();
  const bmvProfile = { ...defaultProfile, sourceLeadId: leadId };
  await db.query(
    `update customers
     set base_profile = jsonb_set(
           coalesce(base_profile, '{}'::jsonb),
           '{bmvProfile}',
           $2::jsonb,
           true
         ),
         updated_at = now()
     where id = $1
       and (base_profile->'bmvProfile' is null
            or base_profile->'bmvProfile' = '{}'::jsonb)`,
    [customerId, JSON.stringify(bmvProfile)],
  );
}

async function backfillConversationCustomer(
  db: { query: (sql: string, params: unknown[]) => Promise<unknown> },
  customerId: string,
  leadId: string,
): Promise<void> {
  try {
    await db.query(
      "update conversations set customer_id = $1 where lead_id = $2 and customer_id is null",
      [customerId, leadId],
    );
  } catch {
    // best-effort backfill; swallow constraint errors
  }
}

/**
 * ja-JP ラベルで案件名を best-effort 合成する。
 * 前端が locale に応じて buildFallbackName で上書きするため、
 * DB 値は SQL 検索/CSV 出力/audit 用の readable baseline。
 *
 * @param lead Lead から申請者名（name）のみ参照する。
 * @param caseTypeCode 案件タイプコード（例: "permanent", "work"）。
 * @returns 合成した案件名。情報不足時は null。
 */
export function composeCaseName(
  lead: Pick<Lead, "name">,
  caseTypeCode: string,
): string | null {
  const trimmed = lead.name?.trim() ?? "";
  const applicant = trimmed.length > 0 ? trimmed : null;
  const typeLabel = getCaseTypeLabelJa(caseTypeCode) ?? null;
  const parts = [applicant, typeLabel].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}
