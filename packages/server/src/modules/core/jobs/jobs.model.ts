import { normalizeObject } from "../../../infra/utils/normalize";

/**
 * Job 状态机。
 */
export type JobStatus = "queued" | "running" | "succeeded" | "failed";

/**
 * Job 记录（对外返回结构）。
 */
export type Job = {
  id: string;
  orgId: string;
  type: string;
  payload: Record<string, unknown>;
  idempotencyKey: string | null;
  status: JobStatus;
  attempts: number;
  maxRetries: number;
  runAt: string;
  lockedAt: string | null;
  lockedBy: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  lastError: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

/**
 * Job 入队入参。
 */
export type JobEnqueueInput = {
  type: string;
  payload: Record<string, unknown>;
  idempotencyKey?: string;
  maxRetries?: number;
  runAt?: string;
};

/**
 * Job 列表查询入参。
 */
export type JobListInput = {
  status?: JobStatus;
  limit?: number;
};

/**
 *
 */
export type JobQueryRow = {
  id: string;
  org_id: string;
  type: string;
  payload: unknown;
  idempotency_key: string | null;
  status: JobStatus;
  attempts: number;
  max_retries: number;
  run_at: unknown;
  locked_at: unknown;
  locked_by: string | null;
  started_at: unknown;
  finished_at: unknown;
  last_error: unknown;
  created_at: unknown;
  updated_at: unknown;
};

/**
 * 将 DB 行映射为 Job。
 *
 * @param r DB 行
 * @returns Job
 */
export function mapJobRow(r: JobQueryRow): Job {
  return {
    id: r.id,
    orgId: r.org_id,
    type: r.type,
    payload: normalizeObject(r.payload),
    idempotencyKey: r.idempotency_key,
    status: r.status,
    attempts: r.attempts,
    maxRetries: r.max_retries,
    runAt: requireTimestampString(r.run_at, "run_at"),
    lockedAt: toTimestampStringOrNull(r.locked_at),
    lockedBy: r.locked_by,
    startedAt: toTimestampStringOrNull(r.started_at),
    finishedAt: toTimestampStringOrNull(r.finished_at),
    lastError: normalizeObject(r.last_error),
    createdAt: requireTimestampString(r.created_at, "created_at"),
    updatedAt: requireTimestampString(r.updated_at, "updated_at"),
  };
}

// normalizeObject 已从 ../../../infra/utils/normalize 导入

function toTimestampStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") return new Date(value).toISOString();
  if (value instanceof Date) return value.toISOString();
  return null;
}

function requireTimestampString(value: unknown, field: string): string {
  const s = toTimestampStringOrNull(value);
  if (!s) throw new Error(`Invalid timestamp: ${field}`);
  return s;
}
