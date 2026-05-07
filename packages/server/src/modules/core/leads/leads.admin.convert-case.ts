import { BadRequestException } from "@nestjs/common";
import type { Pool } from "pg";

import type { Lead, LeadQueryRow } from "../../portal/model/portalEntities";
import { mapLeadRow } from "../../portal/model/portalEntities";
import { createDefaultCustomerBmvProfile } from "../customers/customers.dto-mappers";
import { isBmvCaseTypeCode } from "../cases/cases.template-bmv";
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
  const isBmv = isBmvCaseTypeCode(input.caseTypeCode);
  const caseEntity = await deps.casesService.create(ctx, {
    customerId: lead.convertedCustomerId,
    caseTypeCode: input.caseTypeCode,
    ownerUserId: input.ownerUserId,
    groupId: input.groupId ?? lead.groupId ?? undefined,
  });
  const caseId = caseEntity.id;

  const tenantDb = createTenantDb(deps.pool, ctx.orgId, ctx.userId);

  const result = await tenantDb.query<LeadQueryRow>(
    `update leads set status = 'converted_case', converted_case_id = $2, updated_at = now() where id = $1 returning ${LEAD_COLS}`,
    [leadId, caseId],
  );
  const row = result.rows.at(0);
  if (!row) throw new BadRequestException("Failed to update lead");

  if (isBmv) {
    await initializeBmvProfile(tenantDb, lead.convertedCustomerId, leadId);
  }
  await backfillConversationCustomer(
    tenantDb,
    lead.convertedCustomerId,
    leadId,
  );

  await deps.writeAudit(ctx, leadId, "converted_case", {
    caseId,
    caseTypeCode: input.caseTypeCode,
    ownerUserId: input.ownerUserId,
    isBmv,
  });

  return { lead: mapLeadRow(row), caseId };
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
