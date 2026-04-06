import type { Pool } from "pg";
import crypto from "node:crypto";

import { RedisQueue, type QueueJob } from "../../../../infra/queue/redisQueue";
import type { StorageAdapter } from "../../../../infra/storage/storageAdapter";
import { createTenantDb } from "../../tenancy/tenantDb";

/* ------------------------------------------------------------------ */
/*  类型定义                                                           */
/* ------------------------------------------------------------------ */

/**
 * 导出类型。
 */
export type ExportType = "cases" | "customers" | "document_items";

/**
 * 导出格式。
 */
export type ExportFormat = "csv" | "excel";

/**
 * Export job payload 类型。
 */
export type ExportJobPayload = {
  orgId: string;
  userId: string;
  exportType: ExportType;
  format: ExportFormat;
  filters?: Record<string, unknown>;
};

/* ------------------------------------------------------------------ */
/*  常量                                                               */
/* ------------------------------------------------------------------ */

/**
 * 单次导出最大行数。
 */
const MAX_EXPORT_ROWS = 10_000;

/**
 * notification_jobs 队列名。
 */
const NOTIFICATION_QUEUE = "notification_jobs";

/* ------------------------------------------------------------------ */
/*  SQL 查询                                                           */
/* ------------------------------------------------------------------ */

const QUERY_MAP: Record<ExportType, string> = {
  cases: `select id, org_id, customer_id, case_type_code, status, owner_user_id, opened_at, due_at, created_at, updated_at
          from cases
          where coalesce(metadata->>'_status', '') is distinct from 'deleted'
          order by created_at desc
          limit $1`,
  customers: `select id, org_id, type, base_profile, contacts, created_at, updated_at
              from customers
              where coalesce(base_profile->>'status', '') is distinct from 'deleted'
              order by created_at desc
              limit $1`,
  document_items: `select id, org_id, case_id, checklist_item_code, name, status, requested_at, received_at, reviewed_at, due_at, owner_side, last_follow_up_at, note, created_at, updated_at
                   from document_items
                   where status != 'deleted'
                   order by created_at desc
                   limit $1`,
};

/* ------------------------------------------------------------------ */
/*  CSV 生成                                                           */
/* ------------------------------------------------------------------ */

/**
 * 转义 CSV 字段值。
 *
 * @param value 原始值
 * @returns 转义后的字段
 */
function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  let str: string;
  switch (typeof value) {
    case "string":
      str = value;
      break;
    case "number":
    case "boolean":
    case "bigint":
      str = value.toString();
      break;
    default:
      str = JSON.stringify(value);
      break;
  }
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * 将行数组生成 CSV Buffer。
 *
 * @param rows 数据行
 * @returns CSV Buffer
 */
function generateCsv(rows: Record<string, unknown>[]): Buffer {
  if (rows.length === 0) return Buffer.from("");
  const firstRow = rows[0];
  const headers = Object.keys(firstRow);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsvField(row[h])).join(","));
  }
  return Buffer.from(lines.join("\n"), "utf-8");
}

/* ------------------------------------------------------------------ */
/*  文件 key 构造                                                      */
/* ------------------------------------------------------------------ */

/**
 * 构造存储 key。
 *
 * @param orgId 组织 ID
 * @param exportType 导出类型
 * @param ext 文件扩展名
 * @returns 存储 key
 */
function buildFileKey(
  orgId: string,
  exportType: ExportType,
  ext: string,
): string {
  const timestamp = String(Date.now());
  return `exports/${orgId}/${timestamp}_${exportType}.${ext}`;
}

/* ------------------------------------------------------------------ */
/*  Handler                                                            */
/* ------------------------------------------------------------------ */

/**
 * 处理 export_jobs 队列任务：
 * 1. 根据 exportType 查询数据
 * 2. 根据 format 生成文件（CSV）
 * 3. 调用 storageAdapter.upload() 存储文件
 * 4. 入队 notification_job 通知用户下载链接
 * 5. 写 Timeline（action: "export_completed"）
 *
 * @param pool PostgreSQL 连接池
 * @param storageAdapter 文件存储适配器
 * @param queue Redis 队列
 * @param job 队列任务
 */
export async function handleExportJob(
  pool: Pool,
  storageAdapter: StorageAdapter,
  queue: RedisQueue,
  job: QueueJob<ExportJobPayload>,
): Promise<void> {
  const { orgId, userId, exportType, format, filters } = job.payload;
  void filters; // TODO: 应用筛选条件

  // eslint-disable-next-line no-console
  console.info(
    `[exportJobHandler] Starting export: jobId=${job.id} type=${exportType} format=${format}`,
  );

  const tenantDb = createTenantDb(pool, orgId, userId);

  // 1. 查询数据
  const rows = await queryExportData(tenantDb, exportType);

  // 2. 生成文件
  const { fileBuffer, contentType, ext } = buildExportFile(rows, format);

  // 3. 上传文件
  const fileKey = buildFileKey(orgId, exportType, ext);
  await storageAdapter.upload(fileKey, fileBuffer, contentType);

  // eslint-disable-next-line no-console
  console.info(
    `[exportJobHandler] File uploaded: key=${fileKey} rows=${String(rows.length)}`,
  );

  // 4. 入队 notification_job
  await enqueueNotification(
    queue,
    orgId,
    userId,
    exportType,
    format,
    fileKey,
    rows.length,
  );

  // 5. 写 Timeline
  await writeTimeline(
    tenantDb,
    orgId,
    userId,
    exportType,
    format,
    fileKey,
    rows.length,
  );

  // eslint-disable-next-line no-console
  console.info(
    `[exportJobHandler] Export completed: jobId=${job.id} rows=${String(rows.length)}`,
  );
}

/**
 * 查询导出数据。
 *
 * @param tenantDb 租户 DB
 * @param exportType 导出类型
 * @returns 数据行
 */
async function queryExportData(
  tenantDb: ReturnType<typeof createTenantDb>,
  exportType: ExportType,
): Promise<Record<string, unknown>[]> {
  const sql = QUERY_MAP[exportType];
  const result = await tenantDb.query<Record<string, unknown>>(sql, [
    MAX_EXPORT_ROWS,
  ]);
  return result.rows;
}

/**
 * 构建导出文件。
 *
 * @param rows 数据行
 * @param format 导出格式
 * @returns 文件信息
 */
function buildExportFile(
  rows: Record<string, unknown>[],
  format: ExportFormat,
): { fileBuffer: Buffer; contentType: string; ext: string } {
  if (format === "csv") {
    return {
      fileBuffer: generateCsv(rows),
      contentType: "text/csv",
      ext: "csv",
    };
  }
  // TODO: Excel 生成（需 exceljs 依赖）— 暂时回退为 CSV
  return { fileBuffer: generateCsv(rows), contentType: "text/csv", ext: "csv" };
}

/**
 * 入队通知。
 *
 * @param queue 队列
 * @param orgId 组织 ID
 * @param userId 用户 ID
 * @param exportType 导出类型
 * @param format 格式
 * @param fileKey 文件 key
 * @param rowCount 行数
 */
async function enqueueNotification(
  queue: RedisQueue,
  orgId: string,
  userId: string,
  exportType: ExportType,
  format: ExportFormat,
  fileKey: string,
  rowCount: number,
): Promise<void> {
  const entityType =
    exportType === "cases"
      ? "case"
      : exportType === "customers"
        ? "customer"
        : "document_item";

  await queue.enqueue(NOTIFICATION_QUEUE, {
    id: crypto.randomUUID(),
    name: "export_ready",
    payload: {
      orgId,
      channel: "in_app",
      to: userId,
      body: `Your ${exportType} export is ready for download.`,
      entityType,
      entityId: fileKey,
      metadata: { fileKey, exportType, format, rowCount },
    },
    createdAt: new Date().toISOString(),
  });
}

/**
 * 写 Timeline。
 *
 * @param tenantDb 租户 DB
 * @param orgId 组织 ID
 * @param userId 用户 ID
 * @param exportType 导出类型
 * @param format 格式
 * @param fileKey 文件 key
 * @param rowCount 行数
 */
async function writeTimeline(
  tenantDb: ReturnType<typeof createTenantDb>,
  orgId: string,
  userId: string,
  exportType: ExportType,
  format: ExportFormat,
  fileKey: string,
  rowCount: number,
): Promise<void> {
  await tenantDb.query(
    `insert into timeline_logs(org_id, entity_type, entity_id, action, actor_user_id, payload)
     values ($1, $2, $3, $4, $5, $6::jsonb)`,
    [
      orgId,
      "organization",
      orgId,
      "export_completed",
      userId,
      JSON.stringify({ exportType, format, fileKey, rowCount }),
    ],
  );
}
