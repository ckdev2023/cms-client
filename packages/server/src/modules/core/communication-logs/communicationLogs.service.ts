import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Pool } from "pg";

import { communicationLogs } from "../../../infra/db/drizzle/schema";
import type { CommunicationLog } from "../model/coreEntities";
import type { RequestContext } from "../tenancy/requestContext";
import { createTenantDrizzleRepository } from "../tenancy/tenantDb";
import { TimelineService } from "../timeline/timeline.service";
import {
  mapCommunicationLogRecord,
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
  CommunicationLogUpdateInput,
} from "./communicationLogs.shared";

export { mapCommunicationLogRow } from "./communicationLogs.shared";
export type {
  CommunicationLogCreateInput,
  CommunicationLogFollowUpsInput,
  CommunicationLogListInput,
  CommunicationLogUpdateInput,
} from "./communicationLogs.shared";

/**
 * Handles CRUD access and timeline side effects for communication logs.
 */
@Injectable()
export class CommunicationLogsService {
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

    const tenantRepo = this.createTenantRepository(ctx);
    const created = await tenantRepo.transaction(async (session) => {
      await this.assertRefs(
        (table, refId) => session.assertBelongsToOrg(table, refId),
        input.caseId,
        input.customerId,
        input.companyId,
      );
      const rows = await session.db
        .insert(communicationLogs)
        .values({
          orgId: ctx.orgId,
          caseId: input.caseId ?? null,
          customerId: input.customerId ?? null,
          companyId: input.companyId ?? null,
          channelType: input.channelType,
          direction: input.direction ?? "inbound",
          subject: input.subject ?? null,
          contentSummary: input.contentSummary ?? null,
          fullContent: input.fullContent ?? null,
          visibleToClient: input.visibleToClient ?? false,
          createdBy: ctx.userId,
          followUpRequired: input.followUpRequired ?? false,
          followUpDueAt: input.followUpDueAt ?? null,
        })
        .returning();
      if (rows.length === 0) {
        throw new BadRequestException("Failed to create communication log");
      }
      return mapCommunicationLogRecord(rows[0]);
    });
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
    const tenantRepo = this.createTenantRepository(ctx);
    return tenantRepo.query(async ({ db }) => {
      const rows = await db
        .select()
        .from(communicationLogs)
        .where(eq(communicationLogs.id, id))
        .limit(1);
      if (rows.length === 0) return null;
      return mapCommunicationLogRecord(rows[0]);
    });
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
    const tenantRepo = this.createTenantRepository(ctx);
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 200);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * limit;
    return tenantRepo.query(async ({ db }) => {
      const where = this.buildRelationWhere(input);
      const [countResult] = await db
        .select({ count: sql<string>`count(*)` })
        .from(communicationLogs)
        .where(where);
      const result = await db
        .select()
        .from(communicationLogs)
        .where(where)
        .orderBy(desc(communicationLogs.createdAt), desc(communicationLogs.id))
        .limit(limit)
        .offset(offset);

      return {
        items: result.map((row) => mapCommunicationLogRecord(row)),
        total: Number.parseInt(countResult.count, 10),
      };
    });
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

    const tenantRepo = this.createTenantRepository(ctx);
    const updated = await tenantRepo.transaction(async (session) => {
      await this.assertRefs(
        (table, refId) => session.assertBelongsToOrg(table, refId),
        next.caseId,
        next.customerId,
        next.companyId,
      );
      const rows = await session.db
        .update(communicationLogs)
        .set({
          caseId: next.caseId,
          customerId: next.customerId,
          companyId: next.companyId,
          channelType: next.channelType,
          direction: next.direction,
          subject: next.subject,
          contentSummary: next.contentSummary,
          fullContent: next.fullContent,
          visibleToClient: next.visibleToClient,
          followUpRequired: next.followUpRequired,
          followUpDueAt: next.followUpDueAt,
        })
        .where(eq(communicationLogs.id, id))
        .returning();
      if (rows.length === 0) {
        throw new BadRequestException("Failed to update communication log");
      }
      return mapCommunicationLogRecord(rows[0]);
    });
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
    const tenantRepo = this.createTenantRepository(ctx);
    return tenantRepo.query(async ({ db }) => {
      const where = this.buildRelationWhere(input, [
        eq(communicationLogs.followUpRequired, true),
        isNotNull(communicationLogs.followUpDueAt),
        sql`${communicationLogs.followUpDueAt} <= now()`,
      ]);
      const result = await db
        .select()
        .from(communicationLogs)
        .where(where)
        .orderBy(
          communicationLogs.followUpDueAt,
          desc(communicationLogs.createdAt),
          desc(communicationLogs.id),
        );

      return result.map((row) => mapCommunicationLogRecord(row));
    });
  }

  /**
   * Creates a tenant-scoped Drizzle repository for communication log workflows.
   *
   * @param ctx Request context containing tenant and actor information.
   * @returns Tenant-scoped repository with relation assertion support.
   */
  private createTenantRepository(ctx: RequestContext) {
    return createTenantDrizzleRepository(this.pool, ctx.orgId, ctx.userId, [
      "cases",
      "customers",
      "companies",
    ]);
  }

  /**
   * Builds a Drizzle condition for optional relation filters plus extra predicates.
   *
   * @param input Relation filters supplied by the caller.
   * @param extra Additional predicates to append.
   * @returns Combined Drizzle condition or `undefined`.
   */
  private buildRelationWhere(
    input: CommunicationLogListInput | CommunicationLogFollowUpsInput,
    extra: SQL[] = [],
  ): SQL | undefined {
    const conditions = [...extra];
    if (input.caseId)
      conditions.push(eq(communicationLogs.caseId, input.caseId));
    if (input.customerId) {
      conditions.push(eq(communicationLogs.customerId, input.customerId));
    }
    if (input.companyId) {
      conditions.push(eq(communicationLogs.companyId, input.companyId));
    }
    return conditions.length > 0 ? and(...conditions) : undefined;
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
    assertBelongsToOrg: (table: string, id: string) => Promise<void>,
    caseId?: string | null,
    customerId?: string | null,
    companyId?: string | null,
  ): Promise<void> {
    if (caseId) await assertBelongsToOrg("cases", caseId);
    if (customerId) await assertBelongsToOrg("customers", customerId);
    if (companyId) await assertBelongsToOrg("companies", companyId);
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
