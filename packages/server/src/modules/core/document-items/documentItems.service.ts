/* eslint-disable max-lines */
import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { Pool } from "pg";

import type { DocumentItem } from "../model/coreEntities";
import type { RequestContext } from "../tenancy/requestContext";
import { createTenantDb } from "../tenancy/tenantDb";
import { TimelineService } from "../timeline/timeline.service";
import {
  DOCUMENT_ITEM_ALLOWED_TRANSITIONS,
  WAIVE_ALLOWED_FROM_STATUSES,
  type DocumentCompletionRate,
  type DocumentItemCreateInput,
  type DocumentItemListInput,
  type DocumentItemTransitionInput,
  type DocumentItemUnwaiveInput,
  type DocumentItemUpdateInput,
  type DocumentItemUpdateSurveyDataInput,
  type DocumentItemWaiveInput,
} from "../documents.types";
import {
  DOC_ITEM_COLS,
  buildListFilters,
  mapDocumentItemRow,
  type DocumentItemQueryRow,
} from "./documentItems.shared";

export {
  mapDocumentItemRow,
  type DocumentItemQueryRow,
} from "./documentItems.shared";

export type {
  DocumentCompletionRate,
  DocumentItemCreateInput,
  DocumentItemListInput,
  DocumentItemTransitionInput,
  DocumentItemUnwaiveInput,
  DocumentItemUpdateInput,
  DocumentItemUpdateSurveyDataInput,
  DocumentItemWaiveInput,
} from "../documents.types";

export const ALLOWED_TRANSITIONS: Partial<Record<string, string[]>> =
  DOCUMENT_ITEM_ALLOWED_TRANSITIONS as Partial<Record<string, string[]>>;

/** DocumentItem 服务，提供 CRUD、状态变更、催办、survey_data 与软删除能力。 */
@Injectable()
export class DocumentItemsService {
  /** 构造 DocumentItemsService。
   * @param pool PostgreSQL 连接池
   * @param timelineService Timeline 服务
   */
  constructor(
    @Inject(Pool) private readonly pool: Pool,
    @Inject(TimelineService) private readonly timelineService: TimelineService,
  ) {}

  /** 创建资料项。
   * @param ctx 请求上下文
   * @param input 创建参数
   * @returns 创建后的资料项
   */
  async create(
    ctx: RequestContext,
    input: DocumentItemCreateInput,
  ): Promise<DocumentItem> {
    if (
      input.surveyData !== null &&
      input.surveyData !== undefined &&
      input.category !== "questionnaire"
    ) {
      throw new BadRequestException(
        "surveyData can only be set when category is questionnaire",
      );
    }
    const surveyJson =
      input.surveyData !== null && input.surveyData !== undefined
        ? JSON.stringify(input.surveyData)
        : null;

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<DocumentItemQueryRow>(
      `insert into document_items (org_id, case_id, checklist_item_code, name, status, owner_side, due_at, note, category, survey_data)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       returning ${DOC_ITEM_COLS}`,
      [
        ctx.orgId,
        input.caseId,
        input.checklistItemCode,
        input.name,
        "pending",
        input.ownerSide ?? "applicant",
        input.dueAt ?? null,
        input.note ?? null,
        input.category ?? null,
        surveyJson,
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

  /** 根据 ID 获取资料项详情。
   * @param ctx 请求上下文
   * @param id 资料项 ID
   * @returns 资料项或 null
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

  /** 获取资料项列表。
   * @param ctx 请求上下文
   * @param input 查询参数
   * @returns 列表与总数
   */
  async list(
    ctx: RequestContext,
    input: DocumentItemListInput = {},
  ): Promise<{ items: DocumentItem[]; total: number }> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * limit;

    const { where, params } = buildListFilters(input);
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
      `select ${DOC_ITEM_COLS} from document_items ${whereClause}
       order by created_at desc, id desc
       limit ${limitParam} offset ${offsetParam}`,
      params,
    );
    return { items: result.rows.map(mapDocumentItemRow), total };
  }

  /** 统计案件资料完成率。
   * @param ctx 请求上下文
   * @param caseId 案件 ID
   * @returns 完成率汇总
   */
  async getCompletionRate(
    ctx: RequestContext,
    caseId: string,
  ): Promise<DocumentCompletionRate> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<{
      status: string;
      category: string | null;
      count: string;
    }>(
      `select status, category, count(*)::text as count
       from document_items
       where case_id = $1 and status != 'deleted'
       group by status, category`,
      [caseId],
    );
    let total = 0,
      approved = 0,
      waived = 0;
    let qTotal = 0,
      qApproved = 0,
      qWaived = 0;
    for (const row of result.rows) {
      const count = parseInt(row.count, 10) || 0;
      const isQ = row.category === "questionnaire";
      total += count;
      if (isQ) qTotal += count;
      if (row.status === "approved") {
        approved += count;
        if (isQ) qApproved += count;
      }
      if (row.status === "waived") {
        waived += count;
        if (isQ) qWaived += count;
      }
    }
    const completed = approved + waived;
    const qCompleted = qApproved + qWaived;
    return {
      caseId,
      total,
      completed,
      approved,
      waived,
      completionRate: total === 0 ? 0 : (completed / total) * 100,
      questionnaireTotal: qTotal,
      questionnaireCompleted: qCompleted,
      questionnaireCompletionRate:
        qTotal === 0 ? 0 : (qCompleted / qTotal) * 100,
    };
  }

  /** 更新资料项基本信息。
   * @param ctx 请求上下文
   * @param id 资料项 ID
   * @param input 更新参数
   * @returns 更新后的资料项
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
      `update document_items
       set name = $2, owner_side = $3, due_at = $4, note = $5, updated_at = now()
       where id = $1 and status != 'deleted'
       returning ${DOC_ITEM_COLS}`,
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

  /** 更新问卷资料项的 survey_data（仅限 category=questionnaire）。
   * @param ctx 请求上下文
   * @param id 资料项 ID
   * @param input survey_data 更新参数
   * @returns 更新后的资料项
   */
  async updateSurveyData(
    ctx: RequestContext,
    id: string,
    input: DocumentItemUpdateSurveyDataInput,
  ): Promise<DocumentItem> {
    const current = await this.get(ctx, id);
    if (!current) throw new NotFoundException("Document item not found");
    if (current.category !== "questionnaire") {
      throw new BadRequestException(
        "survey_data can only be updated on questionnaire items",
      );
    }

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<DocumentItemQueryRow>(
      `update document_items
       set survey_data = $2, updated_at = now()
       where id = $1 and status != 'deleted'
       returning ${DOC_ITEM_COLS}`,
      [id, input.surveyData !== null ? JSON.stringify(input.surveyData) : null],
    );
    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Failed to update survey data");
    const updated = mapDocumentItemRow(row);

    await this.timelineService.write(ctx, {
      entityType: "document_item",
      entityId: updated.id,
      action: "document_item.survey_data_updated",
      payload: { surveyData: updated.surveyData },
    });
    return updated;
  }

  /** 状态变更（校验合法流转）。
   * @param ctx 请求上下文
   * @param id 资料项 ID
   * @param input 变更参数
   * @returns 变更后的资料项
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
    if (toStatus === "waived") {
      throw new BadRequestException("Use POST /:id/waive instead");
    }
    if (!ALLOWED_TRANSITIONS[fromStatus]?.includes(toStatus)) {
      throw new BadRequestException(
        `Transition from '${fromStatus}' to '${toStatus}' is not allowed`,
      );
    }

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
      `update document_items
       set status = $2, updated_at = now()${extraSets}
       where id = $1 and status = $3 and status != 'deleted'
       returning ${DOC_ITEM_COLS}`,
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

  /** 豁免资料项（专用端点，独立白名单校验）。
   * @param ctx 请求上下文
   * @param id 资料项 ID
   * @param input 豁免参数
   * @returns 更新后的资料项
   */
  async waive(
    ctx: RequestContext,
    id: string,
    input: DocumentItemWaiveInput,
  ): Promise<DocumentItem> {
    const current = await this.get(ctx, id);
    if (!current) throw new NotFoundException("Document item not found");

    if (!WAIVE_ALLOWED_FROM_STATUSES.includes(current.status as never)) {
      throw new BadRequestException(
        `Cannot waive a document item with status '${current.status}'`,
      );
    }
    if (input.reasonCode === "other" && !input.note) {
      throw new BadRequestException(
        "note is required when reasonCode is 'other'",
      );
    }

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<DocumentItemQueryRow>(
      `update document_items
       set status = 'waived',
           waive_reason_code_latest = $2,
           waive_reason_latest = $3,
           waived_by_user_id_latest = $4,
           waived_at_latest = now(),
           updated_at = now()
       where id = $1 and status = $5 and status != 'deleted'
       returning ${DOC_ITEM_COLS}`,
      [id, input.reasonCode, input.note ?? null, ctx.userId, current.status],
    );
    const row = result.rows.at(0);
    if (!row)
      throw new BadRequestException(
        "Failed to waive document item or status changed concurrently",
      );
    const updated = mapDocumentItemRow(row);

    await this.timelineService.write(ctx, {
      entityType: "document_item",
      entityId: updated.id,
      action: "document_item.waived",
      payload: {
        from: current.status,
        reasonCode: input.reasonCode,
        note: input.note ?? null,
      },
    });
    return updated;
  }

  /** 取消豁免：status → pending、清空 4 个 waive latest 字段、重置 requested_at。
   * @param ctx 请求上下文
   * @param id 资料项 ID
   * @param input 取消豁免参数
   * @returns 更新后的资料项
   */
  async unwaive(
    ctx: RequestContext,
    id: string,
    input: DocumentItemUnwaiveInput,
  ): Promise<DocumentItem> {
    const current = await this.get(ctx, id);
    if (!current) throw new NotFoundException("Document item not found");

    if (current.status !== "waived") {
      throw new BadRequestException(
        `Cannot unwaive a document item with status '${current.status}'`,
      );
    }

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<DocumentItemQueryRow>(
      `update document_items
       set status = 'pending',
           waive_reason_code_latest = null,
           waive_reason_latest = null,
           waived_by_user_id_latest = null,
           waived_at_latest = null,
           requested_at = now(),
           updated_at = now()
       where id = $1 and status = 'waived' and status != 'deleted'
       returning ${DOC_ITEM_COLS}`,
      [id],
    );
    const row = result.rows.at(0);
    if (!row)
      throw new BadRequestException(
        "Failed to unwaive document item or status changed concurrently",
      );
    const updated = mapDocumentItemRow(row);

    await this.timelineService.write(ctx, {
      entityType: "document_item",
      entityId: updated.id,
      action: "document_item.unwaived",
      payload: { from: "waived", note: input.note ?? null },
    });
    return updated;
  }

  /** 催办：更新 lastFollowUpAt + 写 Timeline。
   * @param ctx 请求上下文
   * @param id 资料项 ID
   * @returns 更新后的资料项
   */
  async followUp(ctx: RequestContext, id: string): Promise<DocumentItem> {
    const current = await this.get(ctx, id);
    if (!current) throw new NotFoundException("Document item not found");

    const allowedStatuses = ["waiting_upload", "revision_required"];
    if (current.category === "questionnaire") allowedStatuses.push("pending");
    if (!allowedStatuses.includes(current.status)) {
      throw new BadRequestException(
        `Cannot follow up on a document item with status '${current.status}'`,
      );
    }

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<DocumentItemQueryRow>(
      `update document_items
       set last_follow_up_at = now(), updated_at = now()
       where id = $1 and status != 'deleted'
       returning ${DOC_ITEM_COLS}`,
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

  /** 软删除资料项（设置 status = 'deleted'）。
   * @param ctx 请求上下文
   * @param id 资料项 ID
   */
  async softDelete(ctx: RequestContext, id: string): Promise<void> {
    const current = await this.get(ctx, id);
    if (!current)
      throw new NotFoundException("Document item not found or already deleted");

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<DocumentItemQueryRow>(
      `update document_items
       set status = 'deleted', updated_at = now()
       where id = $1
       returning ${DOC_ITEM_COLS}`,
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
