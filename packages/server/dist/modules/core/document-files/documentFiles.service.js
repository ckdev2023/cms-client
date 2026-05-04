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
var DocumentFilesService_1;
import crypto from "node:crypto";
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Pool } from "pg";
import { STORAGE_ADAPTER } from "../../../infra/storage/storageAdapter";
import { createTenantDb } from "../tenancy/tenantDb";
import { TimelineService } from "../timeline/timeline.service";
import { DOCUMENT_ITEM_ALLOWED_TRANSITIONS } from "../documents.types";
import {
  buildStorageKey,
  DOC_FILE_COLS,
  insertRequirementFileRef,
  LOCAL_STORAGE_TYPE,
  mapDecisionToReviewStatus,
  mapDocumentFileRow,
  normalizeRelativePath,
  resolveAssetId,
  toNumberOrNull,
} from "./documentFiles.shared";
/** 资料文件服务。 */
let DocumentFilesService = class DocumentFilesService {
  static {
    DocumentFilesService_1 = this;
  }
  pool;
  timelineService;
  storage;
  /** 构造函数。
   * @param pool DB 连接池
   * @param timelineService Timeline 服务
   * @param storage 存储适配器 */
  constructor(pool, timelineService, storage) {
    this.pool = pool;
    this.timelineService = timelineService;
    this.storage = storage;
  }
  async assertRequirementExists(tx, requirementId) {
    const result = await tx.query(
      `select id, status, case_id, checklist_item_code from document_items
       where id = $1 and status != 'deleted' limit 1 for update`,
      [requirementId],
    );
    const row = result.rows.at(0);
    if (!row) throw new NotFoundException("Document requirement not found");
    return {
      status: row.status,
      caseId: row.case_id,
      checklistItemCode: row.checklist_item_code,
    };
  }
  static UPLOAD_TRANSITION_TARGET = "uploaded_reviewing";
  static UPLOAD_TRANSITION_ELIGIBLE = Object.entries(
    DOCUMENT_ITEM_ALLOWED_TRANSITIONS,
  )
    .filter(([, targets]) =>
      targets.includes(DocumentFilesService_1.UPLOAD_TRANSITION_TARGET),
    )
    .map(([from]) => from);
  async transitionItemAfterUpload(tx, requirementId, currentStatus) {
    if (
      !DocumentFilesService_1.UPLOAD_TRANSITION_ELIGIBLE.includes(currentStatus)
    ) {
      return { transitioned: false, from: currentStatus };
    }
    const target = DocumentFilesService_1.UPLOAD_TRANSITION_TARGET;
    const result = await tx.query(
      `update document_items
       set status = $2, received_at = now(), updated_at = now()
       where id = $1 and status = $3 and status != 'deleted'`,
      [requirementId, target, currentStatus],
    );
    return { transitioned: (result.rowCount ?? 0) > 0, from: currentStatus };
  }
  async getNextVersionNo(tx, requirementId) {
    const r = await tx.query(
      `select coalesce(max(version_no), 0) + 1 as next_version
       from document_files where requirement_id = $1`,
      [requirementId],
    );
    return toNumberOrNull(r.rows.at(0)?.next_version) ?? 1;
  }
  async insertDocumentFile(
    tx,
    ctx,
    input,
    fileUrl,
    hashValue,
    versionNo,
    assetId = null,
  ) {
    const insertResult = await tx.query(
      `
        insert into document_files (
          org_id,
          requirement_id,
          file_name,
          file_url,
          file_type,
          file_size,
          version_no,
          uploaded_by,
          storage_type,
          relative_path,
          expiry_date,
          hash_value,
          asset_id
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        returning ${DOC_FILE_COLS}
      `,
      [
        ctx.orgId,
        input.requirementId,
        input.fileName,
        fileUrl,
        input.contentType ?? null,
        input.data?.length ?? null,
        versionNo,
        ctx.userId,
        input.storageType ?? LOCAL_STORAGE_TYPE,
        input.relativePath ?? null,
        input.expiryDate ?? null,
        hashValue,
        assetId,
      ],
    );
    const row = insertResult.rows.at(0);
    if (!row) throw new BadRequestException("Failed to upload document file");
    return mapDocumentFileRow(row);
  }
  async writePostUploadTimelines(ctx, file, requirementId, transition) {
    await this.timelineService.write(ctx, {
      entityType: "document_file",
      entityId: file.id,
      action: "document_file.uploaded",
      payload: {
        requirementId: file.requirementId,
        versionNo: file.versionNo,
        hashValue: file.hashValue,
      },
    });
    if (transition.transitioned) {
      await this.timelineService.write(ctx, {
        entityType: "document_item",
        entityId: requirementId,
        action: "document_item.transitioned",
        payload: {
          from: transition.from,
          to: DocumentFilesService_1.UPLOAD_TRANSITION_TARGET,
          trigger: "file_upload",
        },
      });
    }
  }
  async executeUploadTx(tx, ctx, input, fileUrl, hashValue) {
    const requirement = await this.assertRequirementExists(
      tx,
      input.requirementId,
    );
    const versionNo = await this.getNextVersionNo(tx, input.requirementId);
    const assetId = await resolveAssetId(tx, ctx, input, requirement);
    const file = await this.insertDocumentFile(
      tx,
      ctx,
      input,
      fileUrl,
      hashValue,
      versionNo,
      assetId,
    );
    await insertRequirementFileRef(
      tx,
      input.requirementId,
      file.id,
      ctx.userId,
    );
    const transition = await this.transitionItemAfterUpload(
      tx,
      input.requirementId,
      requirement.status,
    );
    return { file, transition };
  }
  /** 上传资料文件并创建版本记录。
   * @param ctx 请求上下文
   * @param input 上传参数
   * @returns 创建后的资料文件 */
  async upload(ctx, input) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    if (input.storageType && input.storageType !== LOCAL_STORAGE_TYPE) {
      throw new BadRequestException(
        `Unsupported storageType: ${input.storageType}`,
      );
    }
    const isLocalArchiveRegistration = input.relativePath !== undefined;
    if (isLocalArchiveRegistration) {
      return this.registerLocalArchive(ctx, tenantDb, input);
    }
    return this.uploadBinaryFile(ctx, tenantDb, input);
  }
  async registerLocalArchive(ctx, tenantDb, input) {
    if (input.data || input.contentType) {
      throw new BadRequestException(
        "local_server registration does not accept binary upload fields",
      );
    }
    const localInput = {
      ...input,
      storageType: LOCAL_STORAGE_TYPE,
      relativePath: normalizeRelativePath(input.relativePath ?? ""),
    };
    const { file, transition } = await tenantDb.transaction((tx) =>
      this.executeUploadTx(tx, ctx, localInput, null, null),
    );
    await this.writePostUploadTimelines(
      ctx,
      file,
      input.requirementId,
      transition,
    );
    return file;
  }
  async uploadBinaryFile(ctx, tenantDb, input) {
    if (!input.data) {
      throw new BadRequestException("data is required");
    }
    if (!input.contentType) {
      throw new BadRequestException("contentType is required");
    }
    const fileUrl = buildStorageKey(input.requirementId, input.fileName);
    const hashValue = crypto
      .createHash("sha256")
      .update(input.data)
      .digest("hex");
    await this.storage.upload(fileUrl, input.data, input.contentType);
    try {
      const { file, transition } = await tenantDb.transaction((tx) =>
        this.executeUploadTx(tx, ctx, input, fileUrl, hashValue),
      );
      await this.writePostUploadTimelines(
        ctx,
        file,
        input.requirementId,
        transition,
      );
      return file;
    } catch (error) {
      await this.storage.remove(fileUrl).catch(() => undefined);
      throw error;
    }
  }
  /** 按资料项获取文件版本列表。
   * @param ctx 请求上下文
   * @param input 查询参数
   * @returns 文件列表及总数 */
  async list(ctx, input) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * limit;
    const countResult = await tenantDb.query(
      `
        select count(*)::text as count
        from document_files
        where requirement_id = $1
      `,
      [input.requirementId],
    );
    const total = Number(countResult.rows.at(0)?.count ?? "0");
    const result = await tenantDb.query(
      `
        select ${DOC_FILE_COLS}
        from document_files
        where requirement_id = $1
        order by version_no desc, uploaded_at desc, id desc
        limit $2 offset $3
      `,
      [input.requirementId, limit, offset],
    );
    return { items: result.rows.map(mapDocumentFileRow), total };
  }
  /** 根据 ID 获取资料文件。
   * @param ctx 请求上下文
   * @param id 文件 ID
   * @returns 文件详情或 null */
  async get(ctx, id) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query(
      `select ${DOC_FILE_COLS} from document_files where id = $1 limit 1`,
      [id],
    );
    const row = result.rows.at(0);
    return row ? mapDocumentFileRow(row) : null;
  }
  /** 审核资料文件。
   * @param ctx 请求上下文
   * @param id 文件 ID
   * @param input 审核参数
   * @returns 审核后的文件 */
  async review(ctx, id, input) {
    const current = await this.get(ctx, id);
    if (!current) throw new NotFoundException("Document file not found");
    if (current.reviewStatus !== "pending") {
      throw new BadRequestException(
        "Only pending document files can be reviewed",
      );
    }
    const reviewStatus = mapDecisionToReviewStatus(input.decision);
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query(
      `
        update document_files
        set review_status = $2,
            review_by = $3,
            review_at = now()
        where id = $1 and review_status = 'pending'
        returning ${DOC_FILE_COLS}
      `,
      [id, reviewStatus, ctx.userId],
    );
    const row = result.rows.at(0);
    if (!row) {
      throw new BadRequestException(
        "Failed to review document file or status changed concurrently",
      );
    }
    const updated = mapDocumentFileRow(row);
    await this.timelineService.write(ctx, {
      entityType: "document_file",
      entityId: updated.id,
      action: "document_file.reviewed",
      payload: { decision: input.decision, reviewStatus: updated.reviewStatus },
    });
    return updated;
  }
  /** 删除资料文件及其存储对象。
   * @param ctx 请求上下文
   * @param id 文件 ID */
  async remove(ctx, id) {
    const current = await this.get(ctx, id);
    if (!current) throw new NotFoundException("Document file not found");
    await this.assertNotLockedInSubmissionPackage(ctx, id);
    if (current.fileUrl) {
      await this.storage.remove(current.fileUrl);
    }
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query(
      `delete from document_files where id = $1`,
      [id],
    );
    if (!result.rowCount || result.rowCount === 0) {
      throw new BadRequestException("Failed to delete document file");
    }
    await this.timelineService.write(ctx, {
      entityType: "document_file",
      entityId: id,
      action: "document_file.deleted",
      payload: {
        requirementId: current.requirementId,
        versionNo: current.versionNo,
      },
    });
  }
  async assertNotLockedInSubmissionPackage(ctx, fileId) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query(
      `
        select spi.submission_package_id as package_id
        from submission_package_items spi
        join submission_packages sp on sp.id = spi.submission_package_id
        where sp.org_id = $1
          and spi.item_type = 'document_file_version'
          and spi.ref_id = $2
        limit 1
      `,
      [ctx.orgId, fileId],
    );
    if ((result.rowCount ?? 0) > 0) {
      throw new BadRequestException(
        "Document file is locked in a submission package and cannot be deleted",
      );
    }
  }
};
DocumentFilesService = DocumentFilesService_1 = __decorate(
  [
    Injectable(),
    __param(0, Inject(Pool)),
    __param(1, Inject(TimelineService)),
    __param(2, Inject(STORAGE_ADAPTER)),
    __metadata("design:paramtypes", [Pool, TimelineService, Object]),
  ],
  DocumentFilesService,
);
export { DocumentFilesService };
//# sourceMappingURL=documentFiles.service.js.map
