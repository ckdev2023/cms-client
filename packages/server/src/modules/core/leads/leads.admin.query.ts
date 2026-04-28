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
  type LeadDedupInput,
  type LeadFollowupInput,
  type LeadListInput,
  type LeadStatusInput,
} from "./leads.admin.types";

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
    where.push(`owner_user_id = $${String(params.length)}`);
    return;
  }
  if (input.scope === "group" && ctx.groupId) {
    params.push(ctx.groupId);
    where.push(`group_id = $${String(params.length)}`);
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
    `(name ilike $${String(i)} or phone ilike $${String(i)} or email ilike $${String(i)} or lead_no ilike $${String(i)})`,
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
  where.push(`created_at ${operator} $${String(params.length)}::timestamptz`);
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
  pushEqualsFilter(where, params, "status", input.status);
  pushEqualsFilter(where, params, "owner_user_id", input.ownerUserId);
  pushEqualsFilter(where, params, "group_id", input.groupId);
  pushEqualsFilter(where, params, "intended_case_type", input.businessType);
  pushSearchFilter(where, params, input.search);
  pushCreatedAtFilter(where, params, input.dateFrom, ">=");
  pushCreatedAtFilter(where, params, input.dateTo, "<=");
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
 * @returns 候補 Lead 一覧
 */
export async function queryDedupLeads(
  tenantDb: TenantDb,
  orgId: string,
  input: LeadDedupInput,
): Promise<Lead[]> {
  const where = [`org_id = $1`];
  const params: unknown[] = [orgId];
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
 * @returns 候補 Customer の ID/名前一覧
 */
export async function queryDedupCustomers(
  tenantDb: TenantDb,
  orgId: string,
  input: LeadDedupInput,
): Promise<{ id: string; name: string | null }[]> {
  const where = [`org_id = $1`];
  const params: unknown[] = [orgId];
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
