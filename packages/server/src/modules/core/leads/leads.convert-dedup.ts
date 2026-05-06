import type { Pool } from "pg";

import type { Lead } from "../../portal/model/portalEntities";

/**
 *
 */
export type ConvertDedupHit = {
  customers: {
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
  }[];
  contactPersons: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    customerId: string | null;
  }[];
};

type DedupMatch = { phone: string | null; email: string | null };
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
 *
 * @param hits
 */
/**
 * dedup 結果に1件以上ヒットがあるか判定する。
 * @param hits dedup 検索結果
 * @returns ヒットがあれば true
 */
export function hasConvertDedupHits(hits: ConvertDedupHit): boolean {
  return hits.customers.length > 0 || hits.contactPersons.length > 0;
}

/**
 * 転化前に顧客/連絡先の重複を検索する。
 * @param pool PostgreSQL 接続プール
 * @param lead Lead エンティティ
 * @param orgId 組織 ID
 * @returns 重複候補
 */
export async function queryConvertDedup(
  pool: Pool,
  lead: Lead,
  orgId: string,
): Promise<ConvertDedupHit> {
  const match = toMatch(lead);
  if (!match) return { customers: [], contactPersons: [] };
  const [cRows, cpRows] = await Promise.all([
    queryCustomers(pool, orgId, match),
    queryContactPersons(pool, orgId, match),
  ]);
  return {
    customers: cRows.map((r) => ({
      id: r.id,
      name: extractName(r.base_profile),
      phone: extractField(r.base_profile, "phone"),
      email: extractField(r.base_profile, "email"),
    })),
    contactPersons: cpRows.map((r) => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      email: r.email,
      customerId: r.customer_id,
    })),
  };
}

function toMatch(lead: Lead): DedupMatch | null {
  if (!lead.phone && !lead.email) return null;
  return { phone: lead.phone, email: lead.email };
}

function buildFilter(
  orgId: string,
  match: DedupMatch,
  phoneCol: string,
  emailCol: string,
): { clause: string; params: unknown[] } {
  const params: unknown[] = [orgId];
  const clauses: string[] = [];
  if (match.phone) {
    params.push(match.phone);
    clauses.push(`${phoneCol} = $${String(params.length)}`);
  }
  if (match.email) {
    params.push(match.email);
    clauses.push(`${emailCol} = $${String(params.length)}`);
  }
  return { clause: clauses.join(" or "), params };
}

async function queryCustomers(
  pool: Pool,
  orgId: string,
  match: DedupMatch,
): Promise<CustomerDedupRow[]> {
  const { clause, params } = buildFilter(
    orgId,
    match,
    `base_profile->>'phone'`,
    `base_profile->>'email'`,
  );
  const r = await pool.query<CustomerDedupRow>(
    `select id, base_profile from customers where org_id = $1 and (${clause}) order by created_at desc limit 20`,
    params,
  );
  return r.rows;
}

async function queryContactPersons(
  pool: Pool,
  orgId: string,
  match: DedupMatch,
): Promise<ContactPersonDedupRow[]> {
  const { clause, params } = buildFilter(orgId, match, "phone", "email");
  const r = await pool.query<ContactPersonDedupRow>(
    `select id, name, phone, email, customer_id from contact_persons where org_id = $1 and deleted_at is null and (${clause}) order by created_at desc limit 20`,
    params,
  );
  return r.rows;
}

function extractName(profile: Record<string, unknown> | null): string | null {
  if (!profile || typeof profile !== "object") return null;
  if (typeof profile.name === "string") return profile.name;
  if (typeof profile.lastName === "string") {
    const first =
      typeof profile.firstName === "string" ? profile.firstName : "";
    return `${profile.lastName} ${first}`.trim();
  }
  return null;
}

function extractField(
  profile: Record<string, unknown> | null,
  field: string,
): string | null {
  if (!profile || typeof profile !== "object") return null;
  const value = profile[field];
  return typeof value === "string" ? value : null;
}
