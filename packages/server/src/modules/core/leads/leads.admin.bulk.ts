import { BadRequestException } from "@nestjs/common";

import type { Lead, LeadQueryRow } from "../../portal/model/portalEntities";
import { mapLeadRow } from "../../portal/model/portalEntities";
import type { RequestContext } from "../tenancy/requestContext";
import type { TenantDb } from "../tenancy/tenantDb";
import type { TimelineService } from "../timeline/timeline.service";
import {
  isLeadFollowupChannel,
  type LeadFollowupQueryRow,
} from "./leadEntities";
import {
  FOLLOWUP_COLS,
  LEAD_COLS,
  type LeadBulkAssignInput,
  type LeadBulkFollowupInput,
  type LeadBulkStatusInput,
  type LeadBulkTagsInput,
} from "./leads.admin.types";

type AuditWriter = (
  ctx: RequestContext,
  leadId: string,
  logType: string,
  payload: Record<string, unknown>,
) => Promise<void>;

type BulkDeps = {
  ctx: RequestContext;
  tenantDb: TenantDb;
  writeAuditLogs: AuditWriter;
};

type StatusTransitioner = (
  ctx: RequestContext,
  leadId: string,
  input: { status: string; lostReason?: string },
) => Promise<Lead>;

/**
 * 一括担当者変更を実行する。
 * @param deps 依存注入コンテキスト
 * @param input 一括担当者変更入力
 * @returns 更新件数
 */
export async function bulkAssign(
  deps: BulkDeps,
  input: LeadBulkAssignInput,
): Promise<{ updatedCount: number }> {
  let updatedCount = 0;
  for (const leadId of input.leadIds) {
    const result = await deps.tenantDb.query<LeadQueryRow>(
      `update leads set owner_user_id = $2, updated_at = now() where id = $1 returning ${LEAD_COLS}`,
      [leadId, input.ownerUserId],
    );
    if (result.rowCount && result.rowCount > 0) {
      updatedCount++;
      await deps.writeAuditLogs(deps.ctx, leadId, "owner_assigned", {
        ownerUserId: input.ownerUserId,
      });
    }
  }
  return { updatedCount };
}

/**
 * 一括フォローアップ追加を実行する。
 * @param deps 依存注入コンテキスト
 * @param input 一括フォローアップ入力
 * @returns 更新件数
 */
export async function bulkFollowup(
  deps: BulkDeps,
  input: LeadBulkFollowupInput,
): Promise<{ updatedCount: number }> {
  if (!isLeadFollowupChannel(input.channel)) {
    throw new BadRequestException(`Invalid followup channel: ${input.channel}`);
  }
  let updatedCount = 0;
  for (const leadId of input.leadIds) {
    const result = await deps.tenantDb.query<LeadFollowupQueryRow>(
      `insert into lead_followups (lead_id, channel, summary, created_by) values ($1, $2, $3, $4) returning ${FOLLOWUP_COLS}`,
      [leadId, input.channel, input.summary ?? null, deps.ctx.userId],
    );
    if (result.rowCount && result.rowCount > 0) {
      updatedCount++;
      await deps.writeAuditLogs(deps.ctx, leadId, "followup_added", {
        channel: input.channel,
        summary: input.summary ?? null,
        bulk: true,
      });
    }
  }
  return { updatedCount };
}

/**
 * 一括ステータス変更を実行する。
 * @param deps 依存注入コンテキスト
 * @param input 一括ステータス変更入力
 * @param transitionFn ステータス遷移関数
 * @returns 更新件数とエラー一覧
 */
export async function bulkStatus(
  deps: BulkDeps,
  input: LeadBulkStatusInput,
  transitionFn: StatusTransitioner,
): Promise<{
  updatedCount: number;
  errors: { leadId: string; error: string }[];
}> {
  let updatedCount = 0;
  const errors: { leadId: string; error: string }[] = [];
  for (const leadId of input.leadIds) {
    try {
      await transitionFn(deps.ctx, leadId, {
        status: input.status,
        lostReason: input.lostReason,
      });
      updatedCount++;
    } catch (e) {
      errors.push({
        leadId,
        error: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }
  return { updatedCount, errors };
}

/**
 * 一括タグ更新を実行する。
 * @param deps 依存注入コンテキスト
 * @param input 一括タグ入力
 * @returns 更新件数
 */
export async function bulkTags(
  deps: BulkDeps,
  input: LeadBulkTagsInput,
): Promise<{ updatedCount: number }> {
  let updatedCount = 0;
  for (const leadId of input.leadIds) {
    const result = await deps.tenantDb.query(
      `update leads set tags = (select array(select distinct unnest(tags || $2::text[]))), updated_at = now() where id = $1`,
      [leadId, input.tags],
    );
    if (result.rowCount && result.rowCount > 0) {
      updatedCount++;
      await deps.writeAuditLogs(deps.ctx, leadId, "tags_updated", {
        tags: input.tags,
      });
    }
  }
  return { updatedCount };
}

/**
 * 一括エクスポート用データ取得と監査ログ書き込み。
 * @param deps 依存注入コンテキスト
 * @param leadIds エクスポート対象 Lead ID 群
 * @returns Lead 一覧
 */
export async function bulkExport(
  deps: BulkDeps,
  leadIds: string[],
): Promise<Lead[]> {
  const result = await deps.tenantDb.query<LeadQueryRow>(
    `select ${LEAD_COLS} from leads where id::text = any($1::text[]) order by created_at desc`,
    [leadIds],
  );
  for (const leadId of leadIds) {
    await deps.writeAuditLogs(deps.ctx, leadId, "exported", {});
  }
  return result.rows.map(mapLeadRow);
}

/**
 * TimelineService を AuditWriter 互換関数でラップする。
 * @param timelineService タイムラインサービス
 * @param tenantDb テナントDB
 * @returns 監査ログ書き込み関数
 */
export function createAuditWriter(
  timelineService: TimelineService,
  tenantDb: TenantDb,
): AuditWriter {
  return async (
    ctx: RequestContext,
    leadId: string,
    logType: string,
    payload: Record<string, unknown>,
  ) => {
    await Promise.all([
      tenantDb.query(
        `insert into lead_logs (lead_id, log_type, payload, created_by) values ($1, $2, $3::jsonb, $4)`,
        [leadId, logType, JSON.stringify(payload), ctx.userId],
      ),
      timelineService.write(ctx, {
        entityType: "lead",
        entityId: leadId,
        action: `lead.${logType}`,
        payload,
      }),
    ]);
  };
}
