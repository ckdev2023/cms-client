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
    throw new BadRequestException({
      statusCode: 400,
      message: "Lead already has a converted customer",
      code: "CUSTOMER_ALREADY_CONVERTED",
    });
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

  const resolved = await resolveTargetCustomer(deps, ctx, lead, input);

  const tenantDb = createTenantDb(deps.pool, ctx.orgId, ctx.userId);
  const result = await tenantDb.query<LeadQueryRow>(
    `update leads set converted_customer_id = $2, updated_at = now() where id = $1 returning ${LEAD_COLS}`,
    [leadId, resolved.id],
  );
  const row = result.rows.at(0);
  if (!row) throw new BadRequestException("Failed to update lead");

  const customerNo =
    resolved.customerNo ?? (await fetchCustomerNoById(tenantDb, resolved.id));

  // R-FLOW5-A-6：customerNo 写入 lead_logs.payload，使日志 Tab 显示 CUS-... 编号而非 8 位 UUID 前缀。
  await deps.writeAudit(ctx, leadId, "converted_customer", {
    customerId: resolved.id,
    ...(customerNo ? { customerNo } : {}),
  });
  return { lead: mapLeadRow(row), customerId: resolved.id };
}

async function resolveTargetCustomer(
  deps: ConvertDeps,
  ctx: RequestContext,
  lead: Lead,
  input: LeadConvertCustomerInput,
): Promise<{ id: string; customerNo: string | null }> {
  if (input.customerId) {
    return { id: input.customerId, customerNo: null };
  }
  return createCustomerFromLead(deps.customersService, ctx, lead, input);
}

function readCustomerNumberFromBaseProfile(
  baseProfile: Record<string, unknown> | undefined,
): string | null {
  if (!baseProfile) return null;
  const value = baseProfile.customerNumber;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function fetchCustomerNoById(
  tenantDb: {
    query: (
      sql: string,
      params: unknown[],
    ) => Promise<{ rows: { customer_no: string | null }[] }>;
  },
  customerId: string,
): Promise<string | null> {
  const r = await tenantDb.query(
    `select base_profile->>'customerNumber' as customer_no from customers where id = $1 limit 1`,
    [customerId],
  );
  const value = r.rows.at(0)?.customer_no;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function createCustomerFromLead(
  customersService: CustomersService,
  ctx: RequestContext,
  lead: Lead,
  input: LeadConvertCustomerInput,
): Promise<{ id: string; customerNo: string | null }> {
  const localizedNames =
    input.localizedNames ?? deriveLocalizedNames(lead.name, lead.language);
  const baseProfile: Record<string, unknown> = {};
  if (lead.phone) baseProfile.phone = lead.phone;
  if (lead.email) baseProfile.email = lead.email;

  const owner = lead.ownerUserId;
  if (owner) baseProfile.ownerUserId = owner;
  if (lead.groupId) baseProfile.groupId = lead.groupId;
  if (lead.sourceChannel) baseProfile.sourceChannel = lead.sourceChannel;

  const visa = mapIntendedCaseTypeToCustomerVisaType(lead.intendedCaseType);
  if (visa) baseProfile.visaType = visa;

  if (lead.name) {
    baseProfile.name_jp = lead.name;
    baseProfile.name_cn = lead.name;
  }

  const customer = await customersService.create(ctx, {
    type: "individual",
    baseProfile,
    localizedNames,
  });
  return {
    id: customer.id,
    customerNo: readCustomerNumberFromBaseProfile(customer.baseProfile),
  };
}

/**
 * Lead の intendedCaseType を Customer の visaType にマッピングする。
 * @param intended Lead 側の案件種別文字列
 * @returns 対応する visaType。マッピングなしの場合は `undefined`
 */
export function mapIntendedCaseTypeToCustomerVisaType(
  intended: string | null,
): string | undefined {
  if (!intended) return undefined;

  switch (intended) {
    case "business_manager_visa":
    case "business-management-visa":
      return "business_manager";
    case "work":
    case "work-visa":
      return "engineer_specialist";
    case "dependent_visa":
    case "family-stay":
      return "dependent";
    case "permanent":
      return "permanent_resident";
    default:
      if (intended.startsWith("biz_mgmt")) return "business_manager";
      return undefined;
  }
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
  return { ja: name, zh: name, defaultLocale: locale };
}
