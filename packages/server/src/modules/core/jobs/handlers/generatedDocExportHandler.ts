/**
 * @deprecated 导出流水线已弃用。外部文书登记主路径为 draft → final，
 * file_url 存放运营资源服务器上的外链，不再提供系统内导出。
 * 此模块仅保留以兼容遗留数据和已有引用，不再注册新 worker。
 */
import type { Pool } from "pg";
import crypto from "node:crypto";

import { RedisQueue, type QueueJob } from "../../../../infra/queue/redisQueue";
import type { StorageAdapter } from "../../../../infra/storage/storageAdapter";
import { createTenantDb } from "../../tenancy/tenantDb";

/** @deprecated 队列名常量保留以兼容外部引用，worker 不再消费此队列。 */
export const GENERATED_DOC_EXPORT_QUEUE = "generated_doc_export_jobs";

const NOTIFICATION_QUEUE = "notification_jobs";
const JOB_TIMEOUT_MS = Number(process.env.GD_EXPORT_TIMEOUT_MS ?? "120000");

/** generated_doc_export_jobs 队列任务载荷。 */
export type GeneratedDocExportJobPayload = {
  orgId: string;
  userId: string;
  generatedDocumentId: string;
  caseId: string;
  templateId: string | null;
  templateVersionNo: number | null;
  outputFormat: string;
  title: string;
};

function buildStorageKey(
  orgId: string,
  generatedDocumentId: string,
  versionNo: number,
  ext: string,
): string {
  return `generated-documents/${orgId}/${generatedDocumentId}/v${String(versionNo)}.${ext}`;
}

/**
 * 处理生成文書导出任务：幂等检查 → 渲染 → 上传 → 状态更新。
 *
 * @param pool - PostgreSQL 连接池
 * @param storageAdapter - 文件存储适配器
 * @param queue - Redis 队列实例
 * @param job - 队列任务
 */
export async function handleGeneratedDocExportJob(
  pool: Pool,
  storageAdapter: StorageAdapter,
  queue: RedisQueue,
  job: QueueJob<GeneratedDocExportJobPayload>,
): Promise<void> {
  const { orgId, userId, generatedDocumentId } = job.payload;
  const tenantDb = createTenantDb(pool, orgId, userId);

  const current = await tenantDb.query<{ status: string; version_no: number }>(
    `select status, version_no from generated_documents where id = $1 and org_id = $2 limit 1`,
    [generatedDocumentId, orgId],
  );
  const row = current.rows.at(0);
  if (row?.status !== "exporting") return;

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, JOB_TIMEOUT_MS);
  try {
    await executeExport(
      tenantDb,
      storageAdapter,
      queue,
      job.payload,
      row.version_no,
      controller.signal,
    );
  } catch (err: unknown) {
    await markExportFailed(tenantDb, job.payload, err);
  } finally {
    clearTimeout(timeout);
  }
}

async function executeExport(
  tenantDb: ReturnType<typeof createTenantDb>,
  storageAdapter: StorageAdapter,
  queue: RedisQueue,
  payload: GeneratedDocExportJobPayload,
  versionNo: number,
  signal: AbortSignal,
): Promise<void> {
  const {
    orgId,
    userId,
    generatedDocumentId,
    caseId,
    templateId,
    outputFormat,
    title,
  } = payload;
  const ext = resolveExtension(outputFormat);
  const fileBuffer = renderDocument(
    tenantDb,
    { orgId, templateId, title, outputFormat },
    signal,
  );

  const storageKey = buildStorageKey(
    orgId,
    generatedDocumentId,
    versionNo,
    ext,
  );
  await storageAdapter.upload(storageKey, fileBuffer, resolveContentType(ext));

  await tenantDb.query(
    `update generated_documents set status = 'exported', file_url = $3, updated_at = now() where id = $1 and org_id = $2`,
    [generatedDocumentId, orgId, storageKey],
  );

  await writeTimeline(tenantDb, orgId, userId, caseId, generatedDocumentId, {
    action: "generated_document.exported",
    extra: { title, storageKey },
  });
  await enqueueNotification(queue, orgId, userId, generatedDocumentId, title);
}

async function markExportFailed(
  tenantDb: ReturnType<typeof createTenantDb>,
  payload: GeneratedDocExportJobPayload,
  err: unknown,
): Promise<void> {
  const { orgId, generatedDocumentId, caseId, userId, title } = payload;
  const message = err instanceof Error ? err.message : String(err);

  await tenantDb.query(
    `update generated_documents set status = 'export_failed', updated_at = now() where id = $1 and org_id = $2`,
    [generatedDocumentId, orgId],
  );
  await writeTimeline(tenantDb, orgId, userId, caseId, generatedDocumentId, {
    action: "generated_document.export_failed",
    extra: { title, error: message },
  });
}

function resolveExtension(outputFormat: string): string {
  if (outputFormat === "docx" || outputFormat === "xlsx") return outputFormat;
  return "pdf";
}

function resolveContentType(ext: string): string {
  switch (ext) {
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    default:
      return "application/pdf";
  }
}

function renderDocument(
  _tenantDb: ReturnType<typeof createTenantDb>,
  opts: {
    orgId: string;
    templateId: string | null;
    title: string;
    outputFormat: string;
  },
  signal: AbortSignal,
): Buffer {
  if (signal.aborted) throw new Error("Export job timed out");

  if (opts.outputFormat === "pdf") {
    return buildMinimalPdf(opts.title);
  }

  return buildMinimalDocx(opts.title);
}

function buildMinimalDocx(title: string): Buffer {
  const escaped = title
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const contentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<pkg:package xmlns:pkg="http://schemas.microsoft.com/office/2006/xmlPackage">
  <pkg:part pkg:name="/word/document.xml" pkg:contentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml">
    <pkg:xmlData>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p><w:r><w:t>${escaped}</w:t></w:r></w:p>
        </w:body>
      </w:document>
    </pkg:xmlData>
  </pkg:part>
</pkg:package>`;

  return Buffer.from(contentXml, "utf-8");
}

/**
 * 生成最小有效 PDF 1.4 文件作为 D2 渲染落地前的占位输出。
 *
 * - 单页空白 A4-ish (612×792)，附带 Helvetica 字体描述与 ASCII fallback 标题
 * - 非 ASCII 字符（中日韩）替换为 `?`，避免 WinAnsiEncoding 兼容问题
 * - 输出可被任意 PDF reader 打开；后续 D2 真正模板渲染落地后无缝替换
 *
 * @param title 文書标题（用于 PDF Info /Title 与正文绘制）
 * @returns 二进制 PDF 文件内容（latin1 编码字节）
 */
function buildMinimalPdf(title: string): Buffer {
  const asciiTitle = title.replace(/[^\x20-\x7e]/g, "?").slice(0, 200);
  const escapedTitle = asciiTitle
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Count 1 /Kids [3 0 R] >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  ];

  const contentStream = `BT /F1 14 Tf 72 720 Td (${escapedTitle}) Tj ET`;
  objects.push(
    `<< /Length ${String(contentStream.length)} >>\nstream\n${contentStream}\nendstream`,
  );
  objects.push(`<< /Title (${escapedTitle}) /Producer (CMS Client D2 stub) >>`);

  let body = "%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n";
  const offsets: number[] = [];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(body, "latin1"));
    body += `${String(i + 1)} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(body, "latin1");
  const totalObjects = objects.length + 1;
  body += "xref\n";
  body += `0 ${String(totalObjects)}\n`;
  body += "0000000000 65535 f \n";
  for (const off of offsets) {
    body += `${String(off).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${String(totalObjects)} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${String(xrefOffset)}\n%%EOF\n`;

  return Buffer.from(body, "latin1");
}

async function writeTimeline(
  tenantDb: ReturnType<typeof createTenantDb>,
  orgId: string,
  userId: string,
  caseId: string,
  generatedDocumentId: string,
  opts: { action: string; extra: Record<string, unknown> },
): Promise<void> {
  await tenantDb.query(
    `insert into timeline_logs(org_id, entity_type, entity_id, action, actor_user_id, payload)
     values ($1, $2, $3, $4, $5, $6::jsonb)`,
    [
      orgId,
      "case",
      caseId,
      opts.action,
      userId,
      JSON.stringify({ generatedDocumentId, ...opts.extra }),
    ],
  );
}

async function enqueueNotification(
  queue: RedisQueue,
  orgId: string,
  userId: string,
  generatedDocumentId: string,
  title: string,
): Promise<void> {
  await queue.enqueue(NOTIFICATION_QUEUE, {
    id: crypto.randomUUID(),
    name: "generated_doc_export_ready",
    payload: {
      orgId,
      channel: "in_app",
      to: userId,
      body: `Document "${title}" export completed.`,
      entityType: "case",
      entityId: generatedDocumentId,
      metadata: { generatedDocumentId, title },
    },
    createdAt: new Date().toISOString(),
  });
}
