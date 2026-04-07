import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Pool } from "pg";

import type { CommunicationLog } from "../model/coreEntities";
import type { RequestContext } from "../tenancy/requestContext";
import { createTenantDb, type TenantDbTx } from "../tenancy/tenantDb";
import { TimelineService } from "../timeline/timeline.service";
import {
  COMM_LOG_COLS,
  buildRelationWhere,
  mapCommunicationLogRow,
  resolveCommunicationLogUpdate,
  validateChannelType,
  validateDirection,
  validateRelationPresence,
  validateTimestamp,
} from "./communicationLogs.shared";
import type {
  CommunicationLogCreateInput,
  CommunicationLogFollowUpsInput,
  CommunicationLogListInput,
  CommunicationLogQueryRow,
  CommunicationLogUpdateInput,
  ResolvedCommunicationLogUpdate,
} from "./communicationLogs.shared";

export { mapCommunicationLogRow } from "./communicationLogs.shared";
export type {
  CommunicationLogCreateInput,
  CommunicationLogFollowUpsInput,
  CommunicationLogListInput,
  CommunicationLogQueryRow,
  CommunicationLogUpdateInput,
} from "./communicationLogs.shared";

/**
 * Handles CRUD access and timeline side effects for communication logs.
 */
@Injectable()
export class CommunicationLogsService {
  private static readonly ALLOWED_ASSERT_TABLES = new Set([
    "cases",
    "customers",
    "companies",
  ]);

  /**
   * Creates the service with tenant-aware database access and timeline writes.
   *
   * @param pool Postgres connection pool for tenant database sessions.
   * @param timelineService Service used to record timeline events.
   */
  constructor(
    @Inject(Pool) private readonly pool: Pool,
    @Inject(TimelineService) private readonly timelineService: TimelineService,
  ) {}

  /**
   * Creates a communication log and writes the related timeline entries.
   *
   * @param ctx Request context containing tenant and actor information.
   * @param input Communication log payload to persist.
   * @returns The newly created communication log.
   */
  async create(
    ctx: RequestContext,
    input: CommunicationLogCreateInput,
  ): Promise<CommunicationLog> {
    validateRelationPresence(
      input.caseId ?? null,
      input.customerId ?? null,
      input.companyId ?? null,
    );
    validateChannelType(input.channelType);
    validateDirection(input.direction ?? "inbound");
    validateTimestamp(input.followUpDueAt, "followUpDueAt");

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const created = await this.insertCommunicationLog(tenantDb, ctx, input);
    await this.writeCreateTimelines(ctx, created);
    return created;
  }

  /**
   * Retrieves a communication log by id for the current tenant.
   *
   * @param ctx Request context containing tenant and actor information.
   * @param id Communication log identifier.
   * @returns The communication log when found, otherwise `null`.
   */
  async get(ctx: RequestContext, id: string): Promise<CommunicationLog | null> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<CommunicationLogQueryRow>(
      `select ${COMM_LOG_COLS} from communication_logs where id = $1 limit 1`,
      [id],
    );
    const row = result.rows.at(0);
    return row ? mapCommunicationLogRow(row) : null;
  }

  /**
   * Lists communication logs for the current tenant with relation filters.
   *
   * @param ctx Request context containing tenant and actor information.
   * @param input Optional relation filters and pagination settings.
   * @returns A paginated result containing matching items and total count.
   */
  async list(
    ctx: RequestContext,
    input: CommunicationLogListInput = {},
  ): Promise<{ items: CommunicationLog[]; total: number }> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 200);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * limit;

    const { whereClause, params } = buildRelationWhere(input);
    const countResult = await tenantDb.query<{ count: string }>(
      `select count(*) as count from communication_logs ${whereClause}`,
      params,
    );
    const total = Number.parseInt(countResult.rows[0]?.count ?? "0", 10);

    const listParams = [...params, limit, offset];
    const result = await tenantDb.query<CommunicationLogQueryRow>(
      `select ${COMM_LOG_COLS} from communication_logs ${whereClause}
       order by created_at desc, id desc
       limit $${String(listParams.length - 1)} offset $${String(listParams.length)}`,
      listParams,
    );

    return { items: result.rows.map(mapCommunicationLogRow), total };
  }

  /**
   * Updates a communication log and writes the related timeline entries.
   *
   * @param ctx Request context containing tenant and actor information.
   * @param id Communication log identifier.
   * @param input Partial communication log fields to update.
   * @returns The updated communication log.
   */
  async update(
    ctx: RequestContext,
    id: string,
    input: CommunicationLogUpdateInput,
  ): Promise<CommunicationLog> {
    const current = await this.get(ctx, id);
    if (!current) throw new NotFoundException("Communication log not found");

    const next = resolveCommunicationLogUpdate(current, input);
    validateRelationPresence(next.caseId, next.customerId, next.companyId);
    validateChannelType(next.channelType);
    validateDirection(next.direction);
    validateTimestamp(next.followUpDueAt, "followUpDueAt");

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const updated = await this.updateCommunicationLog(tenantDb, id, next);
    await this.writeUpdateTimelines(ctx, current, updated);
    return updated;
  }

  /**
   * Lists follow-up items that are due for the current tenant.
   *
   * @param ctx Request context containing tenant and actor information.
   * @param input Optional relation filters used to narrow follow-ups.
   * @returns Communication logs whose follow-up is due.
   */
  async followUps(
    ctx: RequestContext,
    input: CommunicationLogFollowUpsInput = {},
  ): Promise<CommunicationLog[]> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const { whereClause, params } = buildRelationWhere(input, [
      "follow_up_required = true",
      "follow_up_due_at is not null",
      "follow_up_due_at <= now()",
    ]);

    const result = await tenantDb.query<CommunicationLogQueryRow>(
      `select ${COMM_LOG_COLS} from communication_logs ${whereClause}
       order by follow_up_due_at asc, created_at desc, id desc`,
      params,
    );

    return result.rows.map(mapCommunicationLogRow);
  }

  private async insertCommunicationLog(
    tenantDb: ReturnType<typeof createTenantDb>,
    ctx: RequestContext,
    input: CommunicationLogCreateInput,
  ): Promise<CommunicationLog> {
    return tenantDb.transaction(async (tx) => {
      await this.assertRefs(
        tx,
        input.caseId,
        input.customerId,
        input.companyId,
      );
      const result = await tx.query<CommunicationLogQueryRow>(
        `insert into communication_logs (org_id, case_id, customer_id, company_id, channel_type, direction, subject, content_summary, full_content, visible_to_client, created_by, follow_up_required, follow_up_due_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         returning ${COMM_LOG_COLS}`,
        [
          ctx.orgId,
          input.caseId ?? null,
          input.customerId ?? null,
          input.companyId ?? null,
          input.channelType,
          input.direction ?? "inbound",
          input.subject ?? null,
          input.contentSummary ?? null,
          input.fullContent ?? null,
          input.visibleToClient ?? false,
          ctx.userId,
          input.followUpRequired ?? false,
          input.followUpDueAt ?? null,
        ],
      );

      const row = result.rows.at(0);
      if (!row)
        throw new BadRequestException("Failed to create communication log");
      return mapCommunicationLogRow(row);
    });
  }

  private async updateCommunicationLog(
    tenantDb: ReturnType<typeof createTenantDb>,
    id: string,
    next: ResolvedCommunicationLogUpdate,
  ): Promise<CommunicationLog> {
    return tenantDb.transaction(async (tx) => {
      await this.assertRefs(tx, next.caseId, next.customerId, next.companyId);
      const result = await tx.query<CommunicationLogQueryRow>(
        `update communication_logs
         set case_id = $2,
             customer_id = $3,
             company_id = $4,
             channel_type = $5,
             direction = $6,
             subject = $7,
             content_summary = $8,
             full_content = $9,
             visible_to_client = $10,
             follow_up_required = $11,
             follow_up_due_at = $12
         where id = $1
         returning ${COMM_LOG_COLS}`,
        [
          id,
          next.caseId,
          next.customerId,
          next.companyId,
          next.channelType,
          next.direction,
          next.subject,
          next.contentSummary,
          next.fullContent,
          next.visibleToClient,
          next.followUpRequired,
          next.followUpDueAt,
        ],
      );

      const row = result.rows.at(0);
      if (!row)
        throw new BadRequestException("Failed to update communication log");
      return mapCommunicationLogRow(row);
    });
  }

  private async writeCreateTimelines(
    ctx: RequestContext,
    created: CommunicationLog,
  ): Promise<void> {
    await this.timelineService.write(ctx, {
      entityType: "communication_log",
      entityId: created.id,
      action: "communication_log.created",
      payload: {
        caseId: created.caseId,
        customerId: created.customerId,
        companyId: created.companyId,
        channelType: created.channelType,
        direction: created.direction,
      },
    });
    if (!created.caseId) return;
    await this.writeCaseTimeline(
      ctx,
      created.caseId,
      "communication_log.created",
      {
        communicationLogId: created.id,
        channelType: created.channelType,
        direction: created.direction,
      },
    );
  }

  private async writeUpdateTimelines(
    ctx: RequestContext,
    current: CommunicationLog,
    updated: CommunicationLog,
  ): Promise<void> {
    await this.timelineService.write(ctx, {
      entityType: "communication_log",
      entityId: updated.id,
      action: "communication_log.updated",
      payload: { before: current, after: updated },
    });
    await this.writeCaseTimelinesForUpdate(ctx, current, updated);
  }

  private async writeCaseTimeline(
    ctx: RequestContext,
    caseId: string,
    action: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.timelineService.write(ctx, {
      entityType: "case",
      entityId: caseId,
      action,
      payload,
    });
  }

  private async assertRefs(
    tx: TenantDbTx,
    caseId?: string | null,
    customerId?: string | null,
    companyId?: string | null,
  ): Promise<void> {
    if (caseId) await this.assertBelongsToOrg(tx, "cases", caseId);
    if (customerId) await this.assertBelongsToOrg(tx, "customers", customerId);
    if (companyId) await this.assertBelongsToOrg(tx, "companies", companyId);
  }

  private async assertBelongsToOrg(
    tx: TenantDbTx,
    table: string,
    id: string,
  ): Promise<void> {
    if (!CommunicationLogsService.ALLOWED_ASSERT_TABLES.has(table)) {
      throw new Error(`assertBelongsToOrg: disallowed table "${table}"`);
    }
    const result = await tx.query<{ id: string }>(
      `select id from ${table} where id = $1 limit 1`,
      [id],
    );
    if (result.rows.length === 0) {
      throw new BadRequestException(
        `Referenced ${table} record not found in current organization`,
      );
    }
  }

  private async writeCaseTimelinesForUpdate(
    ctx: RequestContext,
    current: CommunicationLog,
    updated: CommunicationLog,
  ): Promise<void> {
    const caseIds = new Set<string>();
    if (current.caseId) caseIds.add(current.caseId);
    if (updated.caseId) caseIds.add(updated.caseId);
    for (const caseId of caseIds) {
      await this.writeCaseTimeline(ctx, caseId, "communication_log.updated", {
        communicationLogId: updated.id,
        before: current,
        after: updated,
      });
    }
  }
}
