import { BadRequestException } from "@nestjs/common";
import {
  requireTimestampString,
  toTimestampStringOrNull,
} from "../model/timestamps";
export const COMM_LOG_COLS =
  "id, org_id, case_id, customer_id, company_id, channel_type, direction, subject, content_summary, full_content, visible_to_client, created_by, follow_up_required, follow_up_due_at, created_at";
const VALID_CHANNEL_TYPES = new Set([
  "phone",
  "email",
  "meeting",
  "line",
  "wechat",
  "other",
  "internal_note",
  "client_note",
]);
const VALID_DIRECTIONS = new Set(["inbound", "outbound"]);
/**
 * Maps a database row into the domain communication log shape.
 *
 * @param row Communication log row returned from Postgres.
 * @returns Communication log in API/domain format.
 */
export function mapCommunicationLogRow(row) {
  return {
    id: row.id,
    orgId: row.org_id,
    caseId: row.case_id,
    customerId: row.customer_id,
    companyId: row.company_id,
    channelType: row.channel_type,
    direction: row.direction,
    subject: row.subject,
    contentSummary: row.content_summary,
    fullContent: row.full_content,
    visibleToClient: row.visible_to_client,
    createdBy: row.created_by,
    followUpRequired: row.follow_up_required,
    followUpDueAt: toTimestampStringOrNull(row.follow_up_due_at),
    createdAt: requireTimestampString(row.created_at, "created_at"),
  };
}
/**
 * Maps a Drizzle select row into the domain communication log shape.
 *
 * @param row Communication log row returned from Drizzle.
 * @returns Communication log in API/domain format.
 */
export function mapCommunicationLogRecord(row) {
  return {
    id: row.id,
    orgId: row.orgId,
    caseId: row.caseId,
    customerId: row.customerId,
    companyId: row.companyId,
    channelType: row.channelType,
    direction: row.direction,
    subject: row.subject,
    contentSummary: row.contentSummary,
    fullContent: row.fullContent,
    visibleToClient: row.visibleToClient,
    createdBy: row.createdBy,
    followUpRequired: row.followUpRequired,
    followUpDueAt: row.followUpDueAt,
    createdAt: row.createdAt,
  };
}
/**
 * Builds a SQL `where` clause and parameter list for relation filters.
 *
 * @param input Relation filter payload.
 * @param initial Pre-seeded SQL predicates.
 * @returns SQL clause text with positional parameters.
 */
export function buildRelationWhere(input, initial = []) {
  const where = [...initial];
  const params = [];
  const filters = [
    ["case_id", input.caseId],
    ["customer_id", input.customerId],
    ["company_id", input.companyId],
  ];
  for (const [column, value] of filters) {
    if (!value) continue;
    params.push(value);
    where.push(`${column} = $${String(params.length)}`);
  }
  return {
    whereClause: where.length > 0 ? `where ${where.join(" and ")}` : "",
    params,
  };
}
/**
 * Merges a partial update payload with the current communication log state.
 *
 * @param current Existing communication log values.
 * @param input Partial fields supplied for update.
 * @returns Fully resolved update payload.
 */
export function resolveCommunicationLogUpdate(current, input) {
  return {
    caseId: input.caseId !== undefined ? input.caseId : current.caseId,
    customerId:
      input.customerId !== undefined ? input.customerId : current.customerId,
    companyId:
      input.companyId !== undefined ? input.companyId : current.companyId,
    channelType: input.channelType ?? current.channelType,
    direction: input.direction ?? current.direction,
    subject: input.subject !== undefined ? input.subject : current.subject,
    contentSummary:
      input.contentSummary !== undefined
        ? input.contentSummary
        : current.contentSummary,
    fullContent:
      input.fullContent !== undefined ? input.fullContent : current.fullContent,
    visibleToClient: input.visibleToClient ?? current.visibleToClient,
    followUpRequired: input.followUpRequired ?? current.followUpRequired,
    followUpDueAt:
      input.followUpDueAt !== undefined
        ? input.followUpDueAt
        : current.followUpDueAt,
  };
}
/**
 * Ensures at least one related entity id is present.
 *
 * @param caseId Related case id.
 * @param customerId Related customer id.
 * @param companyId Related company id.
 */
export function validateRelationPresence(caseId, customerId, companyId) {
  if (!caseId && !customerId && !companyId) {
    throw new BadRequestException(
      "caseId, customerId or companyId is required",
    );
  }
}
/**
 * Validates that the channel type is supported.
 *
 * @param channelType Communication channel value.
 */
export function validateChannelType(channelType) {
  if (!VALID_CHANNEL_TYPES.has(channelType)) {
    throw new BadRequestException(
      `Invalid channelType: ${channelType}. Must be one of: ${[...VALID_CHANNEL_TYPES].join(", ")}`,
    );
  }
}
/**
 * Validates that the communication direction is supported.
 *
 * @param direction Direction value to validate.
 */
export function validateDirection(direction) {
  if (!VALID_DIRECTIONS.has(direction)) {
    throw new BadRequestException(
      `Invalid direction: ${direction}. Must be one of: ${[...VALID_DIRECTIONS].join(", ")}`,
    );
  }
}
/**
 * Validates an optional timestamp field.
 *
 * @param value Timestamp string to validate.
 * @param field Field name used in validation errors.
 */
export function validateTimestamp(value, field) {
  if (value === undefined || value === null) return;
  if (Number.isNaN(new Date(value).getTime())) {
    throw new BadRequestException(`Invalid ${field}`);
  }
}
//# sourceMappingURL=communicationLogs.shared.js.map
