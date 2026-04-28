import type { Pool } from "pg";

import type { Lead } from "../model/portalEntities";
import type { ConvertDedupHit } from "./leads.service";

type LeadDedupMatch = {
  phone: string | null;
  email: string | null;
};

type CustomerDedupRow = {
  id: string;
  base_profile: Record<string, unknown> | null;
};

type ContactPersonDedupRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  customer_id: string | null;
};

/**
 * 判断 dedup 查询结果是否命中。
 * @param dedupHits dedup 查询结果。
 * @returns 是否存在任一命中。
 */
export function hasConvertDedupHits(dedupHits: ConvertDedupHit): boolean {
  return dedupHits.customers.length > 0 || dedupHits.contactPersons.length > 0;
}

/**
 * 判断线索是否属于 BMV 意向。
 * @param lead Lead 实体。
 * @returns 是否为 BMV 线索。
 */
export function isBmvLead(lead: Lead): boolean {
  return lead.intendedCaseType?.toLowerCase().includes("bmv") ?? false;
}

/**
 * 查询线索转化前的 dedup 命中结果。
 * @param pool PostgreSQL 连接池。
 * @param lead Lead 实体。
 * @param orgId 目标组织 ID。
 * @returns 标准化后的 dedup 命中结果。
 */
export async function queryConvertDedup(
  pool: Pool,
  lead: Lead,
  orgId: string,
): Promise<ConvertDedupHit> {
  const match = toLeadDedupMatch(lead);
  if (!match) return { customers: [], contactPersons: [] };
  const [customerRows, contactPersonRows] = await Promise.all([
    queryDedupCustomers(pool, orgId, match),
    queryDedupContactPersons(pool, orgId, match),
  ]);
  return {
    customers: customerRows.map((row) => ({
      id: row.id,
      name: extractNameFromProfile(row.base_profile),
      phone: extractFieldFromProfile(row.base_profile, "phone"),
      email: extractFieldFromProfile(row.base_profile, "email"),
    })),
    contactPersons: contactPersonRows.map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      customerId: row.customer_id,
    })),
  };
}

function toLeadDedupMatch(lead: Lead): LeadDedupMatch | null {
  if (!lead.phone && !lead.email) return null;
  return { phone: lead.phone, email: lead.email };
}

async function queryDedupCustomers(
  pool: Pool,
  orgId: string,
  match: LeadDedupMatch,
): Promise<CustomerDedupRow[]> {
  const { clause, params } = buildDedupFilter(
    orgId,
    match,
    `base_profile->>'phone'`,
    `base_profile->>'email'`,
  );
  const result = await pool.query<CustomerDedupRow>(
    `select id, base_profile from customers where org_id = $1 and (${clause}) order by created_at desc limit 20`,
    params,
  );
  return result.rows;
}

async function queryDedupContactPersons(
  pool: Pool,
  orgId: string,
  match: LeadDedupMatch,
): Promise<ContactPersonDedupRow[]> {
  const { clause, params } = buildDedupFilter(orgId, match, "phone", "email");
  const result = await pool.query<ContactPersonDedupRow>(
    `select id, name, phone, email, customer_id from contact_persons where org_id = $1 and deleted_at is null and (${clause}) order by created_at desc limit 20`,
    params,
  );
  return result.rows;
}

function buildDedupFilter(
  orgId: string,
  match: LeadDedupMatch,
  phoneColumn: string,
  emailColumn: string,
): { clause: string; params: unknown[] } {
  const params: unknown[] = [orgId];
  const clauses: string[] = [];
  if (match.phone) {
    params.push(match.phone);
    clauses.push(`${phoneColumn} = $${String(params.length)}`);
  }
  if (match.email) {
    params.push(match.email);
    clauses.push(`${emailColumn} = $${String(params.length)}`);
  }
  return { clause: clauses.join(" or "), params };
}

function extractNameFromProfile(
  profile: Record<string, unknown> | null,
): string | null {
  if (!profile || typeof profile !== "object") return null;
  if (typeof profile.name === "string") return profile.name;
  if (typeof profile.lastName === "string") {
    const first =
      typeof profile.firstName === "string" ? profile.firstName : "";
    return `${profile.lastName} ${first}`.trim();
  }
  return null;
}

function extractFieldFromProfile(
  profile: Record<string, unknown> | null,
  field: string,
): string | null {
  if (!profile || typeof profile !== "object") return null;
  const value = profile[field];
  return typeof value === "string" ? value : null;
}
