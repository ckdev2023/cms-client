import { BadRequestException, ConflictException } from "@nestjs/common";
import type { Pool } from "pg";

import type { Lead, LeadQueryRow } from "../../portal/model/portalEntities";
import { mapLeadRow } from "../../portal/model/portalEntities";
import { hasConvertDedupHits, queryConvertDedup } from "./leads.convert-dedup";
import type { CustomersService } from "../customers/customers.service";
import type { RequestContext } from "../tenancy/requestContext";
import { createTenantDb } from "../tenancy/tenantDb";
import {
  CONVERTIBLE_STATUSES,
  LEAD_COLS,
  type LeadConvertCustomerInput,
} from "./leads.admin.types";

type ConvertDeps = {
  pool: Pool;
  customersService: CustomersService;
  getLeadOrThrow: (ctx: RequestContext, id: string) => Promise<Lead>;
  writeAudit: (
    ctx: RequestContext,
    leadId: string,
    logType: string,
    payload: Record<string, unknown>,
  ) => Promise<void>;
};

/**
 * Lead → Customer 転化を実行する。
 * @param deps サービス依存
 * @param ctx リクエストコンテキスト
 * @param leadId Lead ID
 * @param input 転化入力
 * @returns 更新後の Lead と customerId
 */
export async function convertCustomer(
  deps: ConvertDeps,
  ctx: RequestContext,
  leadId: string,
  input: LeadConvertCustomerInput,
): Promise<{ lead: Lead; customerId: string }> {
  const lead = await deps.getLeadOrThrow(ctx, leadId);

  if (!CONVERTIBLE_STATUSES.has(lead.status)) {
    throw new BadRequestException(
      `Lead status "${lead.status}" is not convertible; must be one of: following, pending_sign, signed`,
    );
  }
  if (lead.convertedCustomerId) {
    throw new BadRequestException("Lead already has a converted customer");
  }

  if (!input.confirmDedup) {
    const dedupHits = await queryConvertDedup(deps.pool, lead, ctx.orgId);
    if (hasConvertDedupHits(dedupHits)) {
      throw new ConflictException({
        statusCode: 409,
        message:
          "Duplicate customer or contact person found — confirm to proceed",
        dedupHits,
      });
    }
  }

  const customerId =
    input.customerId ??
    (await createCustomerFromLead(deps.customersService, ctx, lead, input));

  const tenantDb = createTenantDb(deps.pool, ctx.orgId, ctx.userId);
  const result = await tenantDb.query<LeadQueryRow>(
    `update leads set converted_customer_id = $2, updated_at = now() where id = $1 returning ${LEAD_COLS}`,
    [leadId, customerId],
  );
  const row = result.rows.at(0);
  if (!row) throw new BadRequestException("Failed to update lead");

  await deps.writeAudit(ctx, leadId, "converted_customer", { customerId });
  return { lead: mapLeadRow(row), customerId };
}

async function createCustomerFromLead(
  customersService: CustomersService,
  ctx: RequestContext,
  lead: Lead,
  input: LeadConvertCustomerInput,
): Promise<string> {
  const localizedNames =
    input.localizedNames ?? deriveLocalizedNames(lead.name, lead.language);
  const baseProfile: Record<string, unknown> = {};
  if (lead.phone) baseProfile.phone = lead.phone;
  if (lead.email) baseProfile.email = lead.email;

  const customer = await customersService.create(ctx, {
    type: "individual",
    baseProfile,
    localizedNames,
  });
  return customer.id;
}

function deriveLocalizedNames(
  name: string | null,
  language: string | null,
): {
  zh?: string;
  ja?: string;
  en?: string;
  defaultLocale?: "zh" | "ja" | "en";
} {
  if (!name) return { defaultLocale: "zh" };
  const locale = language === "ja" ? "ja" : language === "en" ? "en" : "zh";
  return { [locale]: name, defaultLocale: locale };
}
