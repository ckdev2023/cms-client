import { BadRequestException } from "@nestjs/common";

import type { Lead, LeadQueryRow } from "../../portal/model/portalEntities";
import { mapLeadRow } from "../../portal/model/portalEntities";
import type { RequestContext } from "../tenancy/requestContext";
import type { TenantDb, TenantDbTx } from "../tenancy/tenantDb";
import { isUuid } from "../tenancy/uuid";
import {
  type LeadP0Status,
  isLeadP0Status,
  LEAD_STATUS_TRANSITIONS,
} from "./leadEntities";
import {
  LEAD_COLS,
  extractCustomerName,
  type ConvertedCaseSummary,
  type ConvertedCustomerSummary,
  type LeadDedupInput,
  type LeadFollowupInput,
  type LeadListInput,
  type LeadStatusInput,
} from "./leads.admin.types";
import { resolveCustomerDisplayName } from "../customers/customerName";

/**
 * UUID フィルタ値が不正かどうかを判定する。
 * @param value 待ち受ける UUID 文字列
 * @returns 値が空でなく UUID 形式にも一致しない場合は true
 */
function hasInvalidUuidFilter(value: string | null | undefined): boolean {
  return typeof value === "string" && value.length > 0 && !isUuid(value);
}

function hasInvalidListUuidFilter(
  ctx: RequestContext,
  input: LeadListInput,
): boolean {
  return (
    (input.scope === "group" && hasInvalidUuidFilter(ctx.groupId)) ||
    hasInvalidUuidFilter(input.ownerUserId) ||
    hasInvalidUuidFilter(input.groupId)
  );
}

function pushEqualsFilter(
  where: string[],
  params: unknown[],
  column: string,
  value: string | undefined,
): void {
  if (!value) return;
  params.push(value);
  where.push(`${column} = $${String(params.length)}`);
}

function applyScopeFilter(
  ctx: RequestContext,
  input: LeadListInput,
  where: string[],
  params: unknown[],
): void {
  if (input.scope === "mine") {
    params.push(ctx.userId);
    where.push(`l.owner_user_id = $${String(params.length)}`);
    return;
  }
  if (input.scope === "group" && ctx.groupId) {
    params.push(ctx.groupId);
    where.push(`l.group_id = $${String(params.length)}`);
  }
}

function pushSearchFilter(
  where: string[],
  params: unknown[],
  search: string | undefined,
): void {
  if (!search) return;
  params.push(`%${search}%`);
  const i = params.length;
  where.push(
    `(l.name ilike $${String(i)} or l.phone ilike $${String(i)} or l.email ilike $${String(i)} or l.lead_no ilike $${String(i)})`,
  );
}

function pushCreatedAtFilter(
  where: string[],
  params: unknown[],
  value: string | undefined,
  operator: ">=" | "<=",
): void {
  if (!value) return;
  params.push(value);
  where.push(`l.created_at ${operator} $${String(params.length)}::timestamptz`);
}

function pushTagsFilter(
  where: string[],
  params: unknown[],
  tags: string[] | undefined,
): void {
  if (!tags || tags.length === 0) return;
  params.push(tags);
  where.push(`l.tags && $${String(params.length)}::text[]`);
}

/**
 * Lead 一覧検索用 WHERE 句を構築する。
 * @param ctx リクエストコンテキスト
 * @param input 検索条件
 * @param where WHERE 句の配列（破壊的に追記）
 * @param params SQL パラメータ配列（破壊的に追記）
 */
export function buildListWhere(
  ctx: RequestContext,
  input: LeadListInput,
  where: string[],
  params: unknown[],
): void {
  if (hasInvalidListUuidFilter(ctx, input)) {
    where.push("1 = 0");
    return;
  }

  applyScopeFilter(ctx, input, where, params);
  pushEqualsFilter(where, params, "l.status", input.status);
  pushEqualsFilter(where, params, "l.owner_user_id", input.ownerUserId);
  pushEqualsFilter(where, params, "l.group_id", input.groupId);
  pushEqualsFilter(where, params, "l.intended_case_type", input.businessType);
  pushSearchFilter(where, params, input.search);
  pushCreatedAtFilter(where, params, input.dateFrom, ">=");
  pushCreatedAtFilter(where, params, input.dateTo, "<=");
  pushTagsFilter(where, params, input.tags);
}

/**
 * ステータス遷移の妥当性を検証する。
 * @param current 現在の Lead
 * @param input ステータス遷移入力
 * @returns 検証済みの遷移先とソース
 */
export function validateTransition(
  current: Lead,
  input: LeadStatusInput,
): { target: LeadP0Status; currentStatus: LeadP0Status } {
  if (!isLeadP0Status(input.status)) {
    throw new BadRequestException(`Invalid target status: ${input.status}`);
  }
  const currentStatus = current.status as LeadP0Status;
  if (!isLeadP0Status(currentStatus)) {
    throw new BadRequestException(
      `Current lead status "${current.status}" is not a valid P0 status`,
    );
  }
  const allowed = LEAD_STATUS_TRANSITIONS.get(currentStatus);
  if (!allowed?.has(input.status)) {
    throw new BadRequestException(
      `Transition from "${currentStatus}" to "${input.status}" is not allowed`,
    );
  }
  if (input.status === "lost" && !input.lostReason?.trim()) {
    throw new BadRequestException(
      "lost_reason is required when transitioning to lost",
    );
  }
  return { target: input.status, currentStatus };
}

/**
 * フォローアップ追加後に Lead の next_action / next_follow_up_at を同期する。
 * @param tx テナントDBトランザクション
 * @param leadId Lead ID
 * @param input フォローアップ入力
 */
export async function syncLeadNextFields(
  tx: TenantDbTx,
  leadId: string,
  input: LeadFollowupInput,
): Promise<void> {
  const parts: string[] = ["updated_at = now()"];
  const params: unknown[] = [leadId];
  if (input.nextAction !== undefined) {
    params.push(input.nextAction);
    parts.push(`next_action = $${String(params.length)}`);
  }
  if (input.nextFollowUpAt !== undefined) {
    params.push(input.nextFollowUpAt);
    parts.push(`next_follow_up_at = $${String(params.length)}::timestamptz`);
  }
  if (parts.length > 1) {
    await tx.query(
      `update leads set ${parts.join(", ")} where id = $1`,
      params,
    );
  }
}

/**
 * 重複候補 Lead を検索する（org_id 強制フィルタ）。
 * @param tenantDb テナントDB
 * @param orgId 組織 ID
 * @param input 重複検索入力
 * @param excludeLeadId 除外する Lead ID
 * @returns 候補 Lead 一覧
 */
export async function queryDedupLeads(
  tenantDb: TenantDb,
  orgId: string,
  input: LeadDedupInput,
  excludeLeadId?: string,
): Promise<Lead[]> {
  const where = [`org_id = $1`];
  const params: unknown[] = [orgId];
  if (excludeLeadId) {
    params.push(excludeLeadId);
    where.push(`id != $${String(params.length)}`);
  }
  const or: string[] = [];
  if (input.phone) {
    params.push(input.phone);
    or.push(`phone = $${String(params.length)}`);
  }
  if (input.email) {
    params.push(input.email);
    or.push(`email = $${String(params.length)}`);
  }
  if (or.length > 0) where.push(`(${or.join(" or ")})`);
  const r = await tenantDb.query<LeadQueryRow>(
    `select ${LEAD_COLS} from leads where ${where.join(" and ")} order by created_at desc limit 20`,
    params,
  );
  return r.rows.map(mapLeadRow);
}

/**
 * 重複候補 Customer を検索する（org_id 強制フィルタ）。
 * @param tenantDb テナントDB
 * @param orgId 組織 ID
 * @param input 重複検索入力
 * @param excludeCustomerId 除外する Customer ID
 * @returns 候補 Customer の ID/名前一覧
 */
export async function queryDedupCustomers(
  tenantDb: TenantDb,
  orgId: string,
  input: LeadDedupInput,
  excludeCustomerId?: string,
): Promise<{ id: string; name: string | null }[]> {
  const where = [`org_id = $1`];
  const params: unknown[] = [orgId];
  if (excludeCustomerId) {
    params.push(excludeCustomerId);
    where.push(`id != $${String(params.length)}`);
  }
  const or: string[] = [];
  if (input.phone) {
    params.push(input.phone);
    or.push(`base_profile->>'phone' = $${String(params.length)}`);
  }
  if (input.email) {
    params.push(input.email);
    or.push(`base_profile->>'email' = $${String(params.length)}`);
  }
  if (or.length === 0) return [];
  where.push(`(${or.join(" or ")})`);
  const r = await tenantDb.query<{ id: string; base_profile: unknown }>(
    `select id, base_profile from customers where ${where.join(" and ")} order by created_at desc limit 20`,
    params,
  );
  return r.rows.map((row) => ({
    id: row.id,
    name: extractCustomerName(row.base_profile),
  }));
}

/**
 * Lead 詳細用の重複候補ヒントを構築する。自身の Lead と既に転化された Customer を除外する。
 * @param tenantDb テナント DB
 * @param orgId 組織 ID
 * @param lead 対象 Lead
 * @returns 重複候補（自分自身を除外済み）
 */
export async function buildDedupHints(
  tenantDb: TenantDb,
  orgId: string,
  lead: Lead,
): Promise<{
  leads: Lead[];
  customers: { id: string; name: string | null }[];
}> {
  if (!lead.phone && !lead.email) return { leads: [], customers: [] };
  const input: LeadDedupInput = {
    phone: lead.phone ?? undefined,
    email: lead.email ?? undefined,
  };
  const [leads, customers] = await Promise.all([
    queryDedupLeads(tenantDb, orgId, input, lead.id),
    queryDedupCustomers(
      tenantDb,
      orgId,
      input,
      lead.convertedCustomerId ?? undefined,
    ),
  ]);
  return { leads, customers };
}

/** 転化先 Customer サマリを取得する（customerNo / displayName / group / convertedAt 含む）。
 * @param db テナント DB
 * @param cid Customer ID
 * @returns 転化先 Customer サマリ
 */
export async function queryCustomerSummary(
  db: TenantDb,
  cid: string,
): Promise<ConvertedCustomerSummary | null> {
  const r = await db.query<{
    id: string;
    base_profile: unknown;
    group_id: string | null;
    group_name: string | null;
    created_at: unknown;
  }>(
    `select c.id, c.base_profile, c.created_at,
            g.id as group_id, g.name as group_name
     from customers c
     left join groups g on g.id::text = coalesce(
       c.base_profile->>'groupId',
       c.base_profile->>'group_id',
       c.base_profile->>'group'
     )
     where c.id = $1 limit 1`,
    [cid],
  );
  const row = r.rows.at(0);
  if (!row) return null;

  const bp =
    row.base_profile && typeof row.base_profile === "object"
      ? (row.base_profile as Record<string, unknown>)
      : null;

  const readStr = (key: string): string | null => {
    if (!bp) return null;
    const v = bp[key];
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };

  // displayName 必须尊重 `name_default_locale`，并保持与 `customers.dto-mappers`
  // / `customerNameExpr` 一致的兜底顺序（name_cn → name_en → name_jp）；
  // 否则会出现 admin 端「线索转化记录卡」与「客户详情页」展示名不一致
  // （前者显示日文，后者显示中文）的语言漂移。
  const displayName = resolveCustomerDisplayName(row.base_profile);

  return {
    id: row.id,
    name: displayName ?? extractCustomerName(row.base_profile),
    customerNo: readStr("customerNumber"),
    displayName,
    group: row.group_id
      ? { id: row.group_id, name: row.group_name ?? "" }
      : null,
    convertedAt: row.created_at
      ? new Date(row.created_at as string | number).toISOString()
      : null,
  };
}

/** 案件サマリを取得する（caseNo / caseTypeCode / group / convertedAt 含む / R-FLOW5-A-8）。
 * @param db テナント DB
 * @param caseId Case ID
 * @returns 案件サマリ
 */
export async function queryCaseSummary(
  db: TenantDb,
  caseId: string,
): Promise<ConvertedCaseSummary | null> {
  const r = await db.query<{
    id: string;
    case_no: string | null;
    case_name: string | null;
    case_type_code: string | null;
    base_profile: unknown;
    group_id: string | null;
    group_name: string | null;
    created_at: unknown;
  }>(
    `select ca.id, ca.case_no, ca.case_name, ca.case_type_code,
            c.base_profile,
            g.id as group_id, g.name as group_name,
            ca.created_at
     from cases ca
     left join customers c on c.id = ca.customer_id
     left join groups g on g.id = ca.group_id
     where ca.id = $1 limit 1`,
    [caseId],
  );
  const row = r.rows.at(0);
  if (!row) return null;
  return {
    id: row.id,
    caseNo: row.case_no,
    caseTypeCode: row.case_type_code,
    title: row.case_name ?? null,
    applicantName: extractApplicantName(row.base_profile),
    group: row.group_id
      ? { id: row.group_id, name: row.group_name ?? "" }
      : null,
    convertedAt: row.created_at
      ? new Date(row.created_at as string | number).toISOString()
      : null,
  };
}

/**
 * base_profile から申請者名を抽出する（name_jp → name_cn → name_en の優先順）。
 *
 * @param baseProfile Customer の base_profile JSONB（形式は不定）。
 * @returns 抽出した申請者名。値が無い / 不正な場合は null。
 */
function extractApplicantName(baseProfile: unknown): string | null {
  if (!baseProfile || typeof baseProfile !== "object") return null;
  const bp = baseProfile as Record<string, unknown>;
  for (const key of ["name_jp", "name_cn", "name_en"]) {
    const v = bp[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}
