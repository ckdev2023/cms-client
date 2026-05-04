/**
 * 判断 dedup 查询结果是否命中。
 * @param dedupHits dedup 查询结果。
 * @returns 是否存在任一命中。
 */
export function hasConvertDedupHits(dedupHits) {
  return dedupHits.customers.length > 0 || dedupHits.contactPersons.length > 0;
}
/**
 * 判断线索是否属于 BMV 意向。
 * @param lead Lead 实体。
 * @returns 是否为 BMV 线索。
 */
export function isBmvLead(lead) {
  return lead.intendedCaseType?.toLowerCase().includes("bmv") ?? false;
}
/**
 * 查询线索转化前的 dedup 命中结果。
 * @param pool PostgreSQL 连接池。
 * @param lead Lead 实体。
 * @param orgId 目标组织 ID。
 * @returns 标准化后的 dedup 命中结果。
 */
export async function queryConvertDedup(pool, lead, orgId) {
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
function toLeadDedupMatch(lead) {
  if (!lead.phone && !lead.email) return null;
  return { phone: lead.phone, email: lead.email };
}
async function queryDedupCustomers(pool, orgId, match) {
  const { clause, params } = buildDedupFilter(
    orgId,
    match,
    `base_profile->>'phone'`,
    `base_profile->>'email'`,
  );
  const result = await pool.query(
    `select id, base_profile from customers where org_id = $1 and (${clause}) order by created_at desc limit 20`,
    params,
  );
  return result.rows;
}
async function queryDedupContactPersons(pool, orgId, match) {
  const { clause, params } = buildDedupFilter(orgId, match, "phone", "email");
  const result = await pool.query(
    `select id, name, phone, email, customer_id from contact_persons where org_id = $1 and deleted_at is null and (${clause}) order by created_at desc limit 20`,
    params,
  );
  return result.rows;
}
function buildDedupFilter(orgId, match, phoneColumn, emailColumn) {
  const params = [orgId];
  const clauses = [];
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
function extractNameFromProfile(profile) {
  if (!profile || typeof profile !== "object") return null;
  if (typeof profile.name === "string") return profile.name;
  if (typeof profile.lastName === "string") {
    const first =
      typeof profile.firstName === "string" ? profile.firstName : "";
    return `${profile.lastName} ${first}`.trim();
  }
  return null;
}
function extractFieldFromProfile(profile, field) {
  if (!profile || typeof profile !== "object") return null;
  const value = profile[field];
  return typeof value === "string" ? value : null;
}
//# sourceMappingURL=leads.service.convert-support.js.map
