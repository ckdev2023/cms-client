import { normalizeObject } from "../../../infra/utils/normalize";
/**
 * 将 DB 行映射为 Job。
 *
 * @param r DB 行
 * @returns Job
 */
export function mapJobRow(r) {
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
function toTimestampStringOrNull(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") return new Date(value).toISOString();
  if (value instanceof Date) return value.toISOString();
  return null;
}
function requireTimestampString(value, field) {
  const s = toTimestampStringOrNull(value);
  if (!s) throw new Error(`Invalid timestamp: ${field}`);
  return s;
}
//# sourceMappingURL=jobs.model.js.map
