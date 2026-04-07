import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";

import type {
  UserDocument,
  UserDocumentQueryRow,
} from "../model/portalEntities";
import { mapUserDocumentRow } from "../model/portalEntities";
import {
  STORAGE_ADAPTER,
  type StorageAdapter,
} from "../../../infra/storage/storageAdapter";

/** UserDocument 上传入参。 */
export type UserDocumentUploadInput = {
  appUserId: string;
  fileName: string;
  docType?: string;
  leadId?: string | null;
  caseId?: string | null;
  orgId?: string | null;
  data: Buffer;
  contentType: string;
};

/** UserDocument 列表查询入参。 */
export type UserDocumentListInput = {
  appUserId?: string;
  leadId?: string;
  caseId?: string;
  page?: number;
  limit?: number;
};

const DOC_COLS = `id, app_user_id, org_id, lead_id, case_id, file_key, file_name, doc_type, status, uploaded_at`;

function buildStorageKey(appUserId: string, fileName: string): string {
  const sanitizedFileName = fileName.replace(/[/\\]/g, "_");
  return `user-docs/${appUserId}/${String(Date.now())}_${sanitizedFileName}`;
}

/**
 * UserDocuments 服务：文件上传 + 资料管理。
 */
@Injectable()
export class UserDocumentsService {
  /**
   * 创建服务实例。
   * @param pool PostgreSQL 连接池
   * @param storage 存储适配器
   */
  constructor(
    @Inject(Pool) private readonly pool: Pool,
    @Inject(STORAGE_ADAPTER) private readonly storage: StorageAdapter,
  ) {}

  private async deleteUploadedObject(fileKey: string): Promise<void> {
    await this.storage.remove(fileKey).catch(() => undefined);
  }

  /**
   * 上传文件。
   * @param input 上传参数
   * @returns 创建的文档记录
   */
  async upload(input: UserDocumentUploadInput): Promise<UserDocument> {
    const fileKey = buildStorageKey(input.appUserId, input.fileName);
    await this.storage.upload(fileKey, input.data, input.contentType);

    try {
      const result = await this.pool.query<UserDocumentQueryRow>(
        `insert into user_documents (app_user_id, org_id, lead_id, case_id, file_key, file_name, doc_type)
         values ($1, $2, $3, $4, $5, $6, $7) returning ${DOC_COLS}`,
        [
          input.appUserId,
          input.orgId ?? null,
          input.leadId ?? null,
          input.caseId ?? null,
          fileKey,
          input.fileName,
          input.docType ?? "general",
        ],
      );
      const row = result.rows.at(0);
      if (!row) throw new BadRequestException("Failed to upload document");
      return mapUserDocumentRow(row);
    } catch (error) {
      await this.deleteUploadedObject(fileKey);
      throw error;
    }
  }

  /**
   * 列表查询。
   * @param input 查询参数
   * @returns 分页结果
   */
  async list(
    input: UserDocumentListInput = {},
  ): Promise<{ items: UserDocument[]; total: number }> {
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * limit;
    const where: string[] = [];
    const params: unknown[] = [];
    if (input.appUserId) {
      params.push(input.appUserId);
      where.push(`app_user_id = $${String(params.length)}`);
    }
    if (input.leadId) {
      params.push(input.leadId);
      where.push(`lead_id = $${String(params.length)}`);
    }
    if (input.caseId) {
      params.push(input.caseId);
      where.push(`case_id = $${String(params.length)}`);
    }
    const clause = where.length > 0 ? `where ${where.join(" and ")}` : "";
    const countResult = await this.pool.query<{ count: string }>(
      `select count(*)::text as count from user_documents ${clause}`,
      params,
    );
    const total = Number(countResult.rows.at(0)?.count ?? "0");
    params.push(limit, offset);
    const dataResult = await this.pool.query<UserDocumentQueryRow>(
      `select ${DOC_COLS} from user_documents ${clause} order by uploaded_at desc limit $${String(params.length - 1)} offset $${String(params.length)}`,
      params,
    );
    return { items: dataResult.rows.map(mapUserDocumentRow), total };
  }

  /**
   * 查看详情。
   * @param id 文档 ID
   * @returns 文档或 null
   */
  async get(id: string): Promise<UserDocument | null> {
    const result = await this.pool.query<UserDocumentQueryRow>(
      `select ${DOC_COLS} from user_documents where id = $1 limit 1`,
      [id],
    );
    const row = result.rows.at(0);
    return row ? mapUserDocumentRow(row) : null;
  }

  /**
   * 获取签名下载 URL。
   * @param id 文档 ID
   * @returns 签名 URL
   */
  async getDownloadUrl(id: string): Promise<string> {
    const doc = await this.get(id);
    if (!doc) throw new BadRequestException("Document not found");
    return this.storage.getSignedUrl(doc.fileKey, 3600);
  }

  /**
   * 删除文件。
   * @param id 文档 ID
   */
  async remove(id: string): Promise<void> {
    const doc = await this.get(id);
    if (!doc) throw new BadRequestException("Document not found");
    await this.storage.remove(doc.fileKey);
    await this.pool.query(`delete from user_documents where id = $1`, [id]);
  }
}
