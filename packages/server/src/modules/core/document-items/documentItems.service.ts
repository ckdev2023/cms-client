import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Pool } from "pg";

import type { DocumentItem } from "../model/coreEntities";
import type { RequestContext } from "../tenancy/requestContext";
import { createTenantDb } from "../tenancy/tenantDb";
import { TimelineService } from "../timeline/timeline.service";

/**
 * 数据库查询返回的 document_item 行类型。
 */
export type DocumentItemQueryRow = {
  id: string;
  org_id: string;
  case_id: string;
  checklist_item_code: string;
  name: string;
  status: string;
  required_flag: boolean;
  requested_at: unknown;
  received_at: unknown;
  reviewed_at: unknown;
  due_at: unknown;
  owner_side: string;
  last_follow_up_at: unknown;
  note: unknown;
  created_at: unknown;
  updated_at: unknown;
};

function toTimestampStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return null;
}

function toTimestampString(value: unknown): string {
  const s = toTimestampStringOrNull(value);
  if (!s) return "";
  return s;
}

/**
 * 将数据库行映射为 DocumentItem 实体。
 * @param row 数据库查询结果行
 * @returns DocumentItem 实体
 */
export function mapDocumentItemRow(row: DocumentItemQueryRow): DocumentItem {
  return {
    id: row.id,
    orgId: row.org_id,
    caseId: row.case_id,
    checklistItemCode: row.checklist_item_code,
    name: row.name,
    status: row.status,
    requiredFlag: row.required_flag,
    requestedAt: toTimestampStringOrNull(row.requested_at),
    receivedAt: toTimestampStringOrNull(row.received_at),
    reviewedAt: toTimestampStringOrNull(row.reviewed_at),
    dueAt: toTimestampStringOrNull(row.due_at),
    ownerSide: row.owner_side,
    lastFollowUpAt: toTimestampStringOrNull(row.last_follow_up_at),
    note: typeof row.note === "string" ? row.note : null,
    createdAt: toTimestampString(row.created_at),
    updatedAt: toTimestampString(row.updated_at),
  };
}

/** 创建资料项请求参数。 */
export type DocumentItemCreateInput = {
  caseId: string;
  checklistItemCode: string;
  name: string;
  ownerSide?: string;
  dueAt?: string | null;
  note?: string | null;
};

/** 更新资料项请求参数。 */
export type DocumentItemUpdateInput = {
  name?: string;
  ownerSide?: string;
  dueAt?: string | null;
  note?: string | null;
};

/** 列表查询请求参数。 */
export type DocumentItemListInput = {
  caseId?: string;
  status?: string;
  page?: number;
  limit?: number;
};

/** 状态变更请求参数。 */
export type DocumentItemTransitionInput = {
  toStatus: string;
};

/** 案件资料完成率汇总结果。 */
export type DocumentCompletionRate = {
  caseId: string;
  total: number;
  completed: number;
  approved: number;
  waived: number;
  completionRate: number;
};

/**
 * 合法的状态流转映射（7 状态）。
 *
 * 旧状态迁移方案（数据库 status 列为 text，无约束，旧值仍可存在）：
 *   - requested → 对应新状态 waiting_upload
 *   - received  → 对应新状态 uploaded_reviewing
 *   - reviewed  → 对应新状态 approved
 *   - rejected  → 对应新状态 revision_required
 * 已有旧状态数据需通过数据迁移脚本批量更新。
 */
export const ALLOWED_TRANSITIONS: Partial<Record<string, string[]>> = {
  pending: ["waiting_upload", "waived"],
  waiting_upload: ["uploaded_reviewing", "waived"],
  uploaded_reviewing: ["approved", "revision_required"],
  revision_required: ["waiting_upload"],
  approved: ["expired"],
  waived: ["pending"],
  expired: ["waiting_upload"],
};

const DOC_ITEM_COLS = `id, org_id, case_id, checklist_item_code, name, status, required_flag, requested_at, received_at, reviewed_at, due_at, owner_side, last_follow_up_at, note, created_at, updated_at`;

/**
 * DocumentItem 服务，提供 CRUD、状态变更、催办与软删除能力。
 */
@Injectable()
export class DocumentItemsService {
  /**
   * 构造函数。
   * @param pool PostgreSQL 连接池
   * @param timelineService Timeline 服务
   */
  constructor(
    @Inject(Pool) private readonly pool: Pool,
    @Inject(TimelineService) private readonly timelineService: TimelineService,
  ) {}

  /**
   * 创建资料项。
   * @param ctx 请求上下文
   * @param input 创建参数
   * @returns 创建成功的 DocumentItem 实体
   */
  async create(
    ctx: RequestContext,
    input: DocumentItemCreateInput,
  ): Promise<DocumentItem> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<DocumentItemQueryRow>(
      `
        insert into document_items (org_id, case_id, checklist_item_code, name, status, owner_side, due_at, note)
        values ($1, $2, $3, $4, $5, $6, $7, $8)
        returning ${DOC_ITEM_COLS}
      `,
      [
        ctx.orgId,
        input.caseId,
        input.checklistItemCode,
        input.name,
        "pending",
        input.ownerSide ?? "applicant",
        input.dueAt ?? null,
        input.note ?? null,
      ],
    );

    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Failed to create document item");
    const created = mapDocumentItemRow(row);

    await this.timelineService.write(ctx, {
      entityType: "document_item",
      entityId: created.id,
      action: "document_item.created",
      payload: { caseId: created.caseId, name: created.name },
    });

    return created;
  }

  /**
   * 根据 ID 获取资料项详情。
   * @param ctx 请求上下文
   * @param id 资料项 ID
   * @returns DocumentItem 或 null
   */
  async get(ctx: RequestContext, id: string): Promise<DocumentItem | null> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<DocumentItemQueryRow>(
      `select ${DOC_ITEM_COLS} from document_items where id = $1 and status != 'deleted' limit 1`,
      [id],
    );
    const row = result.rows.at(0);
    return row ? mapDocumentItemRow(row) : null;
  }

  /**
   * 获取资料项列表（支持 caseId / status 筛选 + 分页）。
   * @param ctx 请求上下文
   * @param input 查询参数
   * @returns 列表和总数
   */
  async list(
    ctx: RequestContext,
    input: DocumentItemListInput = {},
  ): Promise<{ items: DocumentItem[]; total: number }> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * limit;

    const where: string[] = ["status != 'deleted'"];
    const params: unknown[] = [];

    if (input.caseId) {
      params.push(input.caseId);
      where.push("case_id = $" + String(params.length));
    }
    if (input.status) {
      params.push(input.status);
      where.push("status = $" + String(params.length));
    }

    const whereClause = `where ${where.join(" and ")}`;

    const countResult = await tenantDb.query<{ count: string }>(
      `select count(*) as count from document_items ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0]?.count ?? "0", 10);

    params.push(limit);
    const limitParam = "$" + String(params.length);
    params.push(offset);
    const offsetParam = "$" + String(params.length);

    const result = await tenantDb.query<DocumentItemQueryRow>(
      `
        select ${DOC_ITEM_COLS}
        from document_items
        ${whereClause}
        order by created_at desc, id desc
        limit ${limitParam} offset ${offsetParam}
      `,
      params,
    );

    return { items: result.rows.map(mapDocumentItemRow), total };
  }

  /**
   * 统计案件资料完成率：(approved + waived) / total * 100。
   * @param ctx 请求上下文
   * @param caseId 案件 ID
   * @returns 完成率汇总结果
   */
  async getCompletionRate(
    ctx: RequestContext,
    caseId: string,
  ): Promise<DocumentCompletionRate> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<{ status: string; count: string }>(
      `select status, count(*)::text as count from document_items where case_id = $1 and status != 'deleted' group by status`,
      [caseId],
    );
    let total = 0;
    let approved = 0;
    let waived = 0;
    for (const row of result.rows) {
      const count = parseInt(row.count, 10) || 0;
      total += count;
      if (row.status === "approved") approved = count;
      if (row.status === "waived") waived = count;
    }
    const completed = approved + waived;
    return {
      caseId,
      total,
      completed,
      approved,
      waived,
      completionRate: total === 0 ? 0 : (completed / total) * 100,
    };
  }

  /**
   * 更新资料项基本信息。
   * @param ctx 请求上下文
   * @param id 资料项 ID
   * @param input 更新参数
   * @returns 更新后的 DocumentItem
   */
  async update(
    ctx: RequestContext,
    id: string,
    input: DocumentItemUpdateInput,
  ): Promise<DocumentItem> {
    const current = await this.get(ctx, id);
    if (!current) throw new NotFoundException("Document item not found");

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const nextName = input.name ?? current.name;
    const nextOwnerSide = input.ownerSide ?? current.ownerSide;
    const nextDueAt = input.dueAt !== undefined ? input.dueAt : current.dueAt;
    const nextNote = input.note !== undefined ? input.note : current.note;

    const result = await tenantDb.query<DocumentItemQueryRow>(
      `
        update document_items
        set name = $2, owner_side = $3, due_at = $4, note = $5, updated_at = now()
        where id = $1 and status != 'deleted'
        returning ${DOC_ITEM_COLS}
      `,
      [id, nextName, nextOwnerSide, nextDueAt, nextNote],
    );

    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Failed to update document item");
    const updated = mapDocumentItemRow(row);

    await this.timelineService.write(ctx, {
      entityType: "document_item",
      entityId: updated.id,
      action: "document_item.updated",
      payload: { before: current, after: updated },
    });

    return updated;
  }

  /**
   * 状态变更（校验合法流转）。
   * @param ctx 请求上下文
   * @param id 资料项 ID
   * @param input 变更参数
   * @returns 变更后的 DocumentItem
   */
  async transition(
    ctx: RequestContext,
    id: string,
    input: DocumentItemTransitionInput,
  ): Promise<DocumentItem> {
    const current = await this.get(ctx, id);
    if (!current) throw new NotFoundException("Document item not found");

    const fromStatus = current.status;
    const toStatus = input.toStatus;

    if (!ALLOWED_TRANSITIONS[fromStatus]?.includes(toStatus)) {
      throw new BadRequestException(
        `Transition from '${fromStatus}' to '${toStatus}' is not allowed`,
      );
    }

    // 根据目标状态设置对应时间戳
    // waiting_upload → requestedAt, uploaded_reviewing → receivedAt, approved → reviewedAt
    const timestampUpdates: string[] = [];
    if (toStatus === "waiting_upload")
      timestampUpdates.push("requested_at = now()");
    if (toStatus === "uploaded_reviewing")
      timestampUpdates.push("received_at = now()");
    if (toStatus === "approved") timestampUpdates.push("reviewed_at = now()");

    const extraSets =
      timestampUpdates.length > 0 ? ", " + timestampUpdates.join(", ") : "";

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<DocumentItemQueryRow>(
      `
        update document_items
        set status = $2, updated_at = now()${extraSets}
        where id = $1 and status = $3 and status != 'deleted'
        returning ${DOC_ITEM_COLS}
      `,
      [id, toStatus, fromStatus],
    );

    const row = result.rows.at(0);
    if (!row)
      throw new BadRequestException(
        "Failed to transition document item or status changed concurrently",
      );
    const updated = mapDocumentItemRow(row);

    await this.timelineService.write(ctx, {
      entityType: "document_item",
      entityId: updated.id,
      action: "document_item.transitioned",
      payload: { from: fromStatus, to: toStatus },
    });

    return updated;
  }

  /**
   * 催办：更新 lastFollowUpAt + 写 Timeline。
   * @param ctx 请求上下文
   * @param id 资料项 ID
   * @returns 更新后的 DocumentItem
   */
  async followUp(ctx: RequestContext, id: string): Promise<DocumentItem> {
    const current = await this.get(ctx, id);
    if (!current) throw new NotFoundException("Document item not found");

    if (
      current.status !== "waiting_upload" &&
      current.status !== "revision_required"
    ) {
      throw new BadRequestException(
        `Cannot follow up on a document item with status '${current.status}'`,
      );
    }

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<DocumentItemQueryRow>(
      `
        update document_items
        set last_follow_up_at = now(), updated_at = now()
        where id = $1 and status != 'deleted'
        returning ${DOC_ITEM_COLS}
      `,
      [id],
    );

    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Failed to follow up");
    const updated = mapDocumentItemRow(row);

    await this.timelineService.write(ctx, {
      entityType: "document_item",
      entityId: updated.id,
      action: "document_item_follow_up",
      payload: { lastFollowUpAt: updated.lastFollowUpAt },
    });

    return updated;
  }

  /**
   * 软删除资料项（设置 status = 'deleted'）。
   * @param ctx 请求上下文
   * @param id 资料项 ID
   */
  async softDelete(ctx: RequestContext, id: string): Promise<void> {
    const current = await this.get(ctx, id);
    if (!current)
      throw new NotFoundException("Document item not found or already deleted");

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<DocumentItemQueryRow>(
      `
        update document_items
        set status = 'deleted', updated_at = now()
        where id = $1
        returning ${DOC_ITEM_COLS}
      `,
      [id],
    );

    if (!result.rowCount || result.rowCount === 0)
      throw new BadRequestException("Failed to soft delete document item");

    await this.timelineService.write(ctx, {
      entityType: "document_item",
      entityId: id,
      action: "document_item.deleted",
      payload: { status: "deleted" },
    });
  }
}
