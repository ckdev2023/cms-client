import crypto from "node:crypto";

import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Pool } from "pg";

import {
  STORAGE_ADAPTER,
  type StorageAdapter,
} from "../../../infra/storage/storageAdapter";
import type { DocumentFile } from "../model/coreEntities";
import type { RequestContext } from "../tenancy/requestContext";
import {
  createTenantDb,
  type TenantDb,
  type TenantDbTx,
} from "../tenancy/tenantDb";
import { TimelineService } from "../timeline/timeline.service";
import {
  buildStorageKey,
  DOC_FILE_COLS,
  LOCAL_STORAGE_TYPE,
  mapDecisionToReviewStatus,
  mapDocumentFileRow,
  normalizeRelativePath,
  type DocumentFileQueryRow,
  toNumberOrNull,
} from "./documentFiles.shared";

/**
 * DocumentFile 上传参数。
 */
export type DocumentFileUploadInput = {
  requirementId: string;
  fileName: string;
  data?: Buffer;
  contentType?: string;
  storageType?: string;
  relativePath?: string | null;
  expiryDate?: string | null;
};

/**
 * DocumentFile 列表查询参数。
 */
export type DocumentFileListInput = {
  requirementId: string;
  page?: number;
  limit?: number;
};

/**
 * DocumentFile 审核参数。
 */
export type DocumentFileReviewInput = {
  decision: "approve" | "reject";
};

/**
 * DocumentFile 服务，提供上传、查询、审核与删除能力。
 */
@Injectable()
export class DocumentFilesService {
  /**
   * 构造函数。
   * @param pool PostgreSQL 连接池
   * @param timelineService Timeline 服务
   * @param storage 文件存储适配器
   */
  constructor(
    @Inject(Pool) private readonly pool: Pool,
    @Inject(TimelineService) private readonly timelineService: TimelineService,
    @Inject(STORAGE_ADAPTER) private readonly storage: StorageAdapter,
  ) {}

  private async assertRequirementExists(
    tx: TenantDbTx,
    requirementId: string,
  ): Promise<void> {
    const requirementResult = await tx.query<{ id: string }>(
      `
        select id
        from document_items
        where id = $1 and status != 'deleted'
        limit 1
        for update
      `,
      [requirementId],
    );
    if (!requirementResult.rows.at(0)) {
      throw new NotFoundException("Document requirement not found");
    }
  }

  private async getNextVersionNo(
    tx: TenantDbTx,
    requirementId: string,
  ): Promise<number> {
    const versionResult = await tx.query<{ next_version: unknown }>(
      `
        select coalesce(max(version_no), 0) + 1 as next_version
        from document_files
        where requirement_id = $1
      `,
      [requirementId],
    );
    return toNumberOrNull(versionResult.rows.at(0)?.next_version) ?? 1;
  }

  private async insertDocumentFile(
    tx: TenantDbTx,
    ctx: RequestContext,
    input: DocumentFileUploadInput,
    fileUrl: string | null,
    hashValue: string | null,
    versionNo: number,
  ): Promise<DocumentFile> {
    const insertResult = await tx.query<DocumentFileQueryRow>(
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
          hash_value
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
      ],
    );

    const row = insertResult.rows.at(0);
    if (!row) throw new BadRequestException("Failed to upload document file");
    return mapDocumentFileRow(row);
  }

  private async writeUploadedTimeline(
    ctx: RequestContext,
    file: DocumentFile,
  ): Promise<void> {
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
  }

  private async deleteUploadedObject(fileUrl: string | null): Promise<void> {
    if (!fileUrl) return;
    await this.storage.remove(fileUrl).catch(() => undefined);
  }

  /**
   * 上传资料文件并创建版本记录。
   * @param ctx 请求上下文
   * @param input 上传参数
   * @returns 创建后的资料文件
   */
  async upload(
    ctx: RequestContext,
    input: DocumentFileUploadInput,
  ): Promise<DocumentFile> {
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

  private async registerLocalArchive(
    ctx: RequestContext,
    tenantDb: TenantDb,
    input: DocumentFileUploadInput,
  ): Promise<DocumentFile> {
    if (input.data || input.contentType) {
      throw new BadRequestException(
        "local_server registration does not accept binary upload fields",
      );
    }
    const localInput: DocumentFileUploadInput = {
      ...input,
      storageType: LOCAL_STORAGE_TYPE,
      relativePath: normalizeRelativePath(input.relativePath ?? ""),
    };

    const created = await tenantDb.transaction(async (tx) => {
      await this.assertRequirementExists(tx, input.requirementId);
      const versionNo = await this.getNextVersionNo(tx, input.requirementId);
      return this.insertDocumentFile(
        tx,
        ctx,
        localInput,
        null,
        null,
        versionNo,
      );
    });

    await this.writeUploadedTimeline(ctx, created);
    return created;
  }

  private async uploadBinaryFile(
    ctx: RequestContext,
    tenantDb: TenantDb,
    input: DocumentFileUploadInput,
  ): Promise<DocumentFile> {
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
      const created = await tenantDb.transaction(async (tx) => {
        await this.assertRequirementExists(tx, input.requirementId);
        const versionNo = await this.getNextVersionNo(tx, input.requirementId);
        return this.insertDocumentFile(
          tx,
          ctx,
          input,
          fileUrl,
          hashValue,
          versionNo,
        );
      });
      await this.writeUploadedTimeline(ctx, created);
      return created;
    } catch (error) {
      await this.deleteUploadedObject(fileUrl);
      throw error;
    }
  }

  /**
   * 按资料项获取文件版本列表。
   * @param ctx 请求上下文
   * @param input 查询参数
   * @returns 文件列表及总数
   */
  async list(
    ctx: RequestContext,
    input: DocumentFileListInput,
  ): Promise<{ items: DocumentFile[]; total: number }> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * limit;

    const countResult = await tenantDb.query<{ count: string }>(
      `
        select count(*)::text as count
        from document_files
        where requirement_id = $1
      `,
      [input.requirementId],
    );
    const total = Number(countResult.rows.at(0)?.count ?? "0");

    const result = await tenantDb.query<DocumentFileQueryRow>(
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

  /**
   * 根据 ID 获取资料文件。
   * @param ctx 请求上下文
   * @param id 文件 ID
   * @returns 文件详情或 null
   */
  async get(ctx: RequestContext, id: string): Promise<DocumentFile | null> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<DocumentFileQueryRow>(
      `select ${DOC_FILE_COLS} from document_files where id = $1 limit 1`,
      [id],
    );
    const row = result.rows.at(0);
    return row ? mapDocumentFileRow(row) : null;
  }

  /**
   * 审核资料文件。
   * @param ctx 请求上下文
   * @param id 文件 ID
   * @param input 审核参数
   * @returns 审核后的文件
   */
  async review(
    ctx: RequestContext,
    id: string,
    input: DocumentFileReviewInput,
  ): Promise<DocumentFile> {
    const current = await this.get(ctx, id);
    if (!current) throw new NotFoundException("Document file not found");
    if (current.reviewStatus !== "pending") {
      throw new BadRequestException(
        "Only pending document files can be reviewed",
      );
    }

    const reviewStatus = mapDecisionToReviewStatus(input.decision);
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<DocumentFileQueryRow>(
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

  /**
   * 删除资料文件及其存储对象。
   * @param ctx 请求上下文
   * @param id 文件 ID
   * @returns void
   */
  async remove(ctx: RequestContext, id: string): Promise<void> {
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

  private async assertNotLockedInSubmissionPackage(
    ctx: RequestContext,
    fileId: string,
  ): Promise<void> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<{ package_id: string }>(
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
}
