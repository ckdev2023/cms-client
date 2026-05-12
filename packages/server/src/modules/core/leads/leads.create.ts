import { BadRequestException } from "@nestjs/common";

import type { LeadQueryRow } from "../../portal/model/portalEntities";
import { mapLeadRow } from "../../portal/model/portalEntities";
import type { Lead } from "../../portal/model/portalEntities";
import type { RequestContext } from "../tenancy/requestContext";
import type { TenantDbTx } from "../tenancy/tenantDb";

import {
  FOLLOWUP_COLS,
  LEAD_COLS,
  type LeadCreateInput,
} from "./leads.admin.types";
import {
  mapLeadSourceChannelToFollowupChannel,
  type LeadFollowupQueryRow,
} from "./leadEntities";
import {
  generateNextLeadNumber,
  isLeadNumberConflict,
} from "./leads.numbering";

async function insertInitialLeadFollowupIfNeeded(
  tx: TenantDbTx,
  ctx: RequestContext,
  leadId: string,
  input: LeadCreateInput,
): Promise<void> {
  const nextAction = input.nextAction?.trim() ?? "";
  const nextAtRaw = input.nextFollowUpAt?.trim() ?? "";
  const nextAt = nextAtRaw || null;
  if (!nextAction && !nextAt) return;

  const summary = nextAction || "已约定下次跟进时间（创建线索时）";
  const channel = mapLeadSourceChannelToFollowupChannel(input.sourceChannel);
  await tx.query<LeadFollowupQueryRow>(
    `insert into lead_followups (lead_id, channel, summary, conclusion, next_action, next_follow_up_at, created_by)
     values ($1, $2, $3, null, $4, $5::timestamptz, $6) returning ${FOLLOWUP_COLS}`,
    [leadId, channel, summary, nextAction || null, nextAt, ctx.userId],
  );
}

const INSERT_SQL = `insert into leads (
  org_id, assigned_org_id, lead_no, name, phone, email,
  source_channel, referrer, intended_case_type, group_id,
  owner_user_id, next_action, next_follow_up_at, quote_amount,
  language, note, status, source, app_user_id
) values (
  $1, $2, $3, $4, $5, $6,
  $7, $8, $9, $10,
  $11, $12, $13::timestamptz, $14,
  $15, $16, 'new', 'admin', null
) returning ${LEAD_COLS}`;

function buildInsertParams(
  ctx: RequestContext,
  input: LeadCreateInput,
  ownerUserId: string,
  leadNo: string,
): unknown[] {
  return [
    ctx.orgId,
    ctx.orgId,
    leadNo,
    input.name,
    input.phone ?? null,
    input.email ?? null,
    input.sourceChannel ?? null,
    input.referrer ?? null,
    input.intendedCaseType ?? null,
    input.groupId ?? null,
    ownerUserId,
    input.nextAction ?? null,
    input.nextFollowUpAt ?? null,
    input.quoteAmount ?? null,
    input.language ?? "ja",
    input.note ?? null,
  ];
}

/**
 * 事务内创建 Lead 行并自动编号，唯一索引冲突时重试一次。
 * @param tx - 当前租户事务对象。
 * @param ctx - リクエストコンテキスト。
 * @param input - Lead 作成入力。
 * @param ownerUserId - 担当者 ID。
 * @returns 作成された Lead エンティティ。
 */
export async function insertLeadWithNumbering(
  tx: TenantDbTx,
  ctx: RequestContext,
  input: LeadCreateInput,
  ownerUserId: string,
): Promise<Lead> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const leadNo = await generateNextLeadNumber(tx, ctx.orgId);
    try {
      const result = await tx.query<LeadQueryRow>(
        INSERT_SQL,
        buildInsertParams(ctx, input, ownerUserId, leadNo),
      );
      const row = result.rows.at(0);
      if (!row) throw new BadRequestException("Failed to create lead");
      const lead = mapLeadRow(row);
      await insertInitialLeadFollowupIfNeeded(tx, ctx, lead.id, input);
      return lead;
    } catch (error) {
      if (attempt === 0 && isLeadNumberConflict(error)) continue;
      throw error;
    }
  }
  throw new BadRequestException("Failed to generate unique lead number");
}
