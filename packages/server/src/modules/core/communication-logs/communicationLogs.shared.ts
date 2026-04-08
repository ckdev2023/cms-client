import { BadRequestException } from "@nestjs/common";

import { communicationLogs } from "../../../infra/db/drizzle/schema";
import type { CommunicationLog } from "../model/coreEntities";

/**
 * Database row shape for `communication_logs` queries.
 */
export type CommunicationLogQueryRow = {
  id: string;
  org_id: string;
  case_id: string | null;
  customer_id: string | null;
  company_id: string | null;
  channel_type: string;
  direction: string;
  subject: string | null;
  content_summary: string | null;
  full_content: string | null;
  visible_to_client: boolean;
  created_by: string | null;
  follow_up_required: boolean;
  follow_up_due_at: unknown;
  created_at: unknown;
};

/**
 * Payload used to create a communication log.
 */
export type CommunicationLogCreateInput = {
  caseId?: string | null;
  customerId?: string | null;
  companyId?: string | null;
  channelType: string;
  direction?: string;
  subject?: string | null;
  contentSummary?: string | null;
  fullContent?: string | null;
  visibleToClient?: boolean;
  followUpRequired?: boolean;
  followUpDueAt?: string | null;
};

/**
 * Payload used to update a communication log.
 */
export type CommunicationLogUpdateInput = {
  caseId?: string | null;
  customerId?: string | null;
  companyId?: string | null;
  channelType?: string;
  direction?: string;
  subject?: string | null;
  contentSummary?: string | null;
  fullContent?: string | null;
  visibleToClient?: boolean;
  followUpRequired?: boolean;
  followUpDueAt?: string | null;
};

/**
 * Filters and pagination for listing communication logs.
 */
export type CommunicationLogListInput = {
  caseId?: string;
  customerId?: string;
  companyId?: string;
  page?: number;
  limit?: number;
};

/**
 * Filters for due communication log follow-ups.
 */
export type CommunicationLogFollowUpsInput = {
  caseId?: string;
  customerId?: string;
  companyId?: string;
};

/**
 * Fully resolved update payload after fallback to existing values.
 */
export type ResolvedCommunicationLogUpdate = {
  caseId: string | null;
  customerId: string | null;
  companyId: string | null;
  channelType: string;
  direction: string;
  subject: string | null;
  contentSummary: string | null;
  fullContent: string | null;
  visibleToClient: boolean;
  followUpRequired: boolean;
  followUpDueAt: string | null;
};

export const COMM_LOG_COLS =
  "id, org_id, case_id, customer_id, company_id, channel_type, direction, subject, content_summary, full_content, visible_to_client, created_by, follow_up_required, follow_up_due_at, created_at";

/**
 * Drizzle `communication_logs` select row shape.
 */
export type CommunicationLogDrizzleRow = typeof communicationLogs.$inferSelect;

const VALID_CHANNEL_TYPES = new Set([
  "phone",
  "email",
  "meeting",
  "line",
  "wechat",
  "other",
]);
const VALID_DIRECTIONS = new Set(["inbound", "outbound"]);

function toTimestampStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return null;
}

/**
 * Maps a database row into the domain communication log shape.
 *
 * @param row Communication log row returned from Postgres.
 * @returns Communication log in API/domain format.
 */
export function mapCommunicationLogRow(
  row: CommunicationLogQueryRow,
): CommunicationLog {
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
    createdAt: String(row.created_at),
  };
}

/**
 * Maps a Drizzle select row into the domain communication log shape.
 *
 * @param row Communication log row returned from Drizzle.
 * @returns Communication log in API/domain format.
 */
export function mapCommunicationLogRecord(
  row: CommunicationLogDrizzleRow,
): CommunicationLog {
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
export function buildRelationWhere(
  input: CommunicationLogListInput | CommunicationLogFollowUpsInput,
  initial: string[] = [],
): { whereClause: string; params: unknown[] } {
  const where = [...initial];
  const params: unknown[] = [];
  const filters: [string, string | undefined][] = [
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
export function resolveCommunicationLogUpdate(
  current: CommunicationLog,
  input: CommunicationLogUpdateInput,
): ResolvedCommunicationLogUpdate {
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
export function validateRelationPresence(
  caseId: string | null,
  customerId: string | null,
  companyId: string | null,
): void {
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
export function validateChannelType(channelType: string): void {
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
export function validateDirection(direction: string): void {
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
export function validateTimestamp(
  value: string | null | undefined,
  field: string,
): void {
  if (value === undefined || value === null) return;
  if (Number.isNaN(new Date(value).getTime())) {
    throw new BadRequestException(`Invalid ${field}`);
  }
}
