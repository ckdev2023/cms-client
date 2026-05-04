var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r =
        c < 3
          ? target
          : desc === null
            ? (desc = Object.getOwnPropertyDescriptor(target, key))
            : desc,
      d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
      r = Reflect.decorate(decorators, target, key, desc);
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i]))
          r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return (c > 3 && r && Object.defineProperty(target, key, r), r);
  };
var __metadata =
  (this && this.__metadata) ||
  function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function")
      return Reflect.metadata(k, v);
  };
var __param =
  (this && this.__param) ||
  function (paramIndex, decorator) {
    return function (target, key) {
      decorator(target, key, paramIndex);
    };
  };
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Pool } from "pg";
import { createTenantDb } from "../tenancy/tenantDb";
import { TimelineService } from "../timeline/timeline.service";
import { DOCUMENT_ITEM_ALLOWED_TRANSITIONS } from "../documents.types";
import {
  REF_COLS,
  mapRefRow,
  mapCandidateRow,
} from "./documentRequirementFileRefs.shared";
const LINK_TRANSITION_TARGET = "uploaded_reviewing";
const LINK_TRANSITION_ELIGIBLE = Object.entries(
  DOCUMENT_ITEM_ALLOWED_TRANSITIONS,
)
  .filter(([, targets]) => targets.includes(LINK_TRANSITION_TARGET))
  .map(([from]) => from);
/** DocumentRequirementFileRefs 服务：跨案件引用的 link / unlink / candidates。 */
let DocumentRequirementFileRefsService = class DocumentRequirementFileRefsService {
  pool;
  timelineService;
  /**
   * 构造函数。
   * @param pool PostgreSQL 连接池
   * @param timelineService Timeline 服务
   */
  constructor(pool, timelineService) {
    this.pool = pool;
    this.timelineService = timelineService;
  }
  /**
   * 引用既有文件版本（cross_case_link）。
   *
   * 事务内同时推进 requirement 状态（与 A3 语义对齐）。
   *
   * @param ctx 请求上下文
   * @param input 引用参数
   * @returns 创建的引用记录
   */
  async link(ctx, input) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const { ref, transition } = await tenantDb.transaction(async (tx) => {
      const requirement = await this.assertRequirementExists(
        tx,
        input.requirementId,
      );
      await this.assertFileVersionExists(tx, input.fileVersionId);
      const createdRef = await this.insertRef(tx, ctx, input);
      const transitionResult = await this.transitionItemAfterLink(
        tx,
        input.requirementId,
        requirement.status,
      );
      return { ref: createdRef, transition: transitionResult };
    });
    await this.writePostLinkTimelines(ctx, ref, input, transition);
    return ref;
  }
  /**
   * 撤销引用。须先通过 submission package 锁定守卫。
   *
   * @param ctx 请求上下文
   * @param refId 引用记录 ID
   */
  async unlink(ctx, refId) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const existing = await this.getInternal(tenantDb, refId);
    if (!existing) throw new NotFoundException("Reference not found");
    await this.assertNotLockedInSubmissionPackage(tenantDb, ctx, existing);
    const result = await tenantDb.query(
      "DELETE FROM document_requirement_file_refs WHERE id = $1",
      [refId],
    );
    if (!result.rowCount || result.rowCount === 0) {
      throw new BadRequestException("Failed to delete reference");
    }
    await this.timelineService.write(ctx, {
      entityType: "document_item",
      entityId: existing.requirementId,
      action: "document_requirement_file_ref.unlinked",
      payload: {
        refId: existing.id,
        fileVersionId: existing.fileVersionId,
        refMode: existing.refMode,
      },
    });
  }
  /**
   * 按 ID 获取引用记录。
   * @param ctx 请求上下文
   * @param id 引用 ID
   * @returns 引用记录或 null
   */
  async get(ctx, id) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    return this.getInternal(tenantDb, id);
  }
  /**
   * 按资料项列出所有引用记录。
   * @param ctx 请求上下文
   * @param requirementId 资料项 ID
   * @returns 引用记录列表
   */
  async listByRequirement(ctx, requirementId) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query(
      `SELECT ${REF_COLS}
       FROM document_requirement_file_refs
       WHERE requirement_id = $1
       ORDER BY created_at DESC, id DESC`,
      [requirementId],
    );
    return result.rows.map(mapRefRow);
  }
  /**
   * 列出跨案件可引用的文件版本候选。
   *
   * 按 checklist_item_code 匹配同材料类型、排除本案件的文件版本。
   *
   * @param ctx 请求上下文
   * @param requirementId 当前资料项 ID
   * @param limit 返回上限
   * @returns 候选文件版本列表
   */
  async listCandidates(ctx, requirementId, limit = 50) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query(
      `SELECT
         df.id,
         df.requirement_id,
         df.file_name,
         df.file_url,
         df.file_type,
         df.file_size,
         df.version_no,
         df.uploaded_by,
         df.uploaded_at,
         df.storage_type,
         df.relative_path,
         df.review_status,
         df.expiry_date,
         di.case_id AS source_case_id,
         di.name AS source_requirement_name
       FROM document_files df
       JOIN document_items di ON di.id = df.requirement_id
       WHERE di.checklist_item_code = (
         SELECT checklist_item_code
         FROM document_items
         WHERE id = $1 AND status != 'deleted'
       )
       AND di.case_id != (
         SELECT case_id FROM document_items WHERE id = $1
       )
       AND di.status != 'deleted'
       ORDER BY df.uploaded_at DESC, df.version_no DESC
       LIMIT $2`,
      [requirementId, Math.min(limit, 200)],
    );
    return result.rows.map(mapCandidateRow);
  }
  // ── private helpers ──
  async insertRef(tx, ctx, input) {
    const result = await tx.query(
      `INSERT INTO document_requirement_file_refs
         (requirement_id, file_version_id, ref_mode, linked_from_requirement_id, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${REF_COLS}`,
      [
        input.requirementId,
        input.fileVersionId,
        "cross_case_link",
        input.linkedFromRequirementId ?? null,
        ctx.userId,
      ],
    );
    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Failed to create reference link");
    return mapRefRow(row);
  }
  async writePostLinkTimelines(ctx, ref, input, transition) {
    await this.timelineService.write(ctx, {
      entityType: "document_item",
      entityId: input.requirementId,
      action: "document_requirement_file_ref.linked",
      payload: {
        refId: ref.id,
        fileVersionId: input.fileVersionId,
        refMode: "cross_case_link",
        linkedFromRequirementId: input.linkedFromRequirementId ?? null,
      },
    });
    if (transition.transitioned) {
      await this.timelineService.write(ctx, {
        entityType: "document_item",
        entityId: input.requirementId,
        action: "document_item.transitioned",
        payload: {
          from: transition.from,
          to: LINK_TRANSITION_TARGET,
          trigger: "cross_case_link",
        },
      });
    }
  }
  async getInternal(tenantDb, id) {
    const result = await tenantDb.query(
      `SELECT ${REF_COLS} FROM document_requirement_file_refs WHERE id = $1 LIMIT 1`,
      [id],
    );
    const row = result.rows.at(0);
    return row ? mapRefRow(row) : null;
  }
  async assertRequirementExists(tx, requirementId) {
    const result = await tx.query(
      `SELECT id, status, case_id FROM document_items
       WHERE id = $1 AND status != 'deleted' LIMIT 1 FOR UPDATE`,
      [requirementId],
    );
    const row = result.rows.at(0);
    if (!row) throw new NotFoundException("Document requirement not found");
    return { status: row.status, caseId: row.case_id };
  }
  async assertFileVersionExists(tx, fileVersionId) {
    const result = await tx.query(
      "SELECT id FROM document_files WHERE id = $1 LIMIT 1",
      [fileVersionId],
    );
    if (result.rows.length === 0) {
      throw new NotFoundException("File version not found");
    }
  }
  async transitionItemAfterLink(tx, requirementId, currentStatus) {
    if (!LINK_TRANSITION_ELIGIBLE.includes(currentStatus)) {
      return { transitioned: false, from: currentStatus };
    }
    const result = await tx.query(
      `UPDATE document_items
       SET status = $2, received_at = now(), updated_at = now()
       WHERE id = $1 AND status = $3 AND status != 'deleted'`,
      [requirementId, LINK_TRANSITION_TARGET, currentStatus],
    );
    return { transitioned: (result.rowCount ?? 0) > 0, from: currentStatus };
  }
  async assertNotLockedInSubmissionPackage(tenantDb, ctx, ref) {
    const result = await tenantDb.query(
      `SELECT spi.submission_package_id AS package_id
       FROM submission_package_items spi
       JOIN submission_packages sp ON sp.id = spi.submission_package_id
       WHERE sp.org_id = $1
         AND spi.item_type = 'document_file_version'
         AND spi.ref_id = $2
       LIMIT 1`,
      [ctx.orgId, ref.fileVersionId],
    );
    if ((result.rowCount ?? 0) > 0) {
      throw new BadRequestException(
        "File version is locked in a submission package and cannot be unlinked",
      );
    }
  }
};
DocumentRequirementFileRefsService = __decorate(
  [
    Injectable(),
    __param(0, Inject(Pool)),
    __param(1, Inject(TimelineService)),
    __metadata("design:paramtypes", [Pool, TimelineService]),
  ],
  DocumentRequirementFileRefsService,
);
export { DocumentRequirementFileRefsService };
//# sourceMappingURL=documentRequirementFileRefs.service.js.map
