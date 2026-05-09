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

  await runPostCreateBookkeeping(tenantDb, ctx, {
    caseId,
    customerId,
    leadId,
    leadNo: lead.leadNo,
    isBmv,
  });

  await deps.writeAudit(ctx, leadId, "converted_case", {
    caseId,
    caseTypeCode: input.caseTypeCode,
    ownerUserId: input.ownerUserId,
    isBmv,
    ...(caseNo ? { caseNo, caseNumber: caseNo } : {}),
  });

  return { lead: mapLeadRow(row), caseId };
}

type PostCreateBookkeepingPayload = {
  caseId: string;
  customerId: string;
  leadId: string;
  leadNo: string | null;
  isBmv: boolean;
};

async function runPostCreateBookkeeping(
  db: { query: (sql: string, params: unknown[]) => Promise<unknown> },
  ctx: RequestContext,
  payload: PostCreateBookkeepingPayload,
): Promise<void> {
  const { caseId, customerId, leadId, leadNo, isBmv } = payload;
  await ensurePrimaryApplicantCaseParty(db, ctx, caseId, customerId);
  if (isBmv) {
    await initializeBmvProfile(db, customerId, leadId);
  }
  await backfillConversationLinks(db, { customerId, caseId, leadId });
  await writeCaseConvertedFromLeadTimeline(db, ctx, {
    caseId,
    leadId,
    customerId,
    leadNo,
  });
}

/**
 * 主申請人 case_party を best-effort で作成する。
 *
 * Gate-A（S3→S4）が is_primary=true の case_party を要求するため、
 * 转化时点で linked customer を主申請人として自動登録する。
 * 既に同一 case に対して is_primary=true の party が存在する場合は何もしない（idempotent）。
 *
 * @param db - tenantDb / tx
 * @param db.query - SQL 実行関数（query メソッドのみ利用）
 * @param ctx - リクエストコンテキスト
 * @param caseId - 案件 ID
 * @param customerId - 主申請人として登録する customer ID
 */
async function ensurePrimaryApplicantCaseParty(
  db: { query: (sql: string, params: unknown[]) => Promise<unknown> },
  ctx: RequestContext,
  caseId: string,
  customerId: string,
): Promise<void> {
  await db.query(
    `insert into case_parties
       (org_id, case_id, party_type, customer_id, contact_person_id, relation_to_case, is_primary)
     select $1, $2, 'applicant', $3, null, '主申請人', true
     where not exists (
       select 1 from case_parties
       where org_id = $1 and case_id = $2 and is_primary = true
     )`,
    [ctx.orgId, caseId, customerId],
  );
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

/**
 * Lead → Case 转化后，对该 Lead 关联的 conversations best-effort 回填 customer_id 与 case_id。
 *
 * - customer_id：仅在原值为 NULL 时写入（避免覆盖管理员手动选择的客户）
 * - case_id：仅在原值为 NULL 时写入（同上）
 *
 * 任一字段已有值的会话仍可能匹配 WHERE 条件并仅更新另一字段；
 * 若两字段都已写入则不会被更新。
 *
 * @param db tenantDb / tx
 * @param db.query SQL 实行関数（query メソッドのみ利用）
 * @param payload 回填参数
 * @param payload.customerId 关联的 customer ID
 * @param payload.caseId 新建的 case ID
 * @param payload.leadId 来源 lead ID
 */
async function backfillConversationLinks(
  db: { query: (sql: string, params: unknown[]) => Promise<unknown> },
  payload: { customerId: string; caseId: string; leadId: string },
): Promise<void> {
  const { customerId, caseId, leadId } = payload;
  try {
    await db.query(
      `update conversations
         set customer_id = coalesce(customer_id, $1),
             case_id = coalesce(case_id, $2),
             updated_at = now()
       where lead_id = $3
         and (customer_id is null or case_id is null)`,
      [customerId, caseId, leadId],
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
