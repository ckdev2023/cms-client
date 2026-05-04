/* eslint-disable jsdoc/require-jsdoc */
import {
  BadRequestException,
  HttpException,
  InternalServerErrorException,
} from "@nestjs/common";
export const TASK_WRITE_ERROR_CODES = {
  ASSIGNEE_NOT_FOUND: "TASK_ASSIGNEE_NOT_FOUND",
  CREATE_FAILED: "TASK_CREATE_FAILED",
};
const PG_CLIENT_ERROR_REASONS = {
  23503: "foreign key violation",
  23505: "unique constraint violation",
  23514: "check constraint violation",
  23502: "not null violation",
};
export function wrapTaskCreateError(error) {
  if (error instanceof HttpException) throw error;
  const pgCode = error.code;
  const reason = pgCode ? PG_CLIENT_ERROR_REASONS[pgCode] : undefined;
  if (pgCode && reason) {
    const constraint = error.constraint ?? null;
    const isAssigneeFk =
      pgCode === "23503" &&
      typeof constraint === "string" &&
      constraint.includes("assignee");
    throw new BadRequestException({
      errorCode: isAssigneeFk
        ? TASK_WRITE_ERROR_CODES.ASSIGNEE_NOT_FOUND
        : TASK_WRITE_ERROR_CODES.CREATE_FAILED,
      detail: { source: "pg", pgCode, constraint },
      message: `Failed to create task: ${reason}`,
    });
  }
  const errMsg = error instanceof Error ? error.message : String(error);
  throw new InternalServerErrorException({
    errorCode: TASK_WRITE_ERROR_CODES.CREATE_FAILED,
    detail: errMsg,
    message: "Failed to create task",
  });
}
const VALID_TASK_TYPES = new Set([
  "general",
  "document_follow_up",
  "client_contact",
  "submission",
  "review",
  "collection",
]);
const VALID_PRIORITIES = new Set(["low", "normal", "high", "urgent"]);
const VALID_STATUSES = new Set([
  "pending",
  "in_progress",
  "completed",
  "cancelled",
]);
function rejectUnless(value, allowed, field) {
  if (!allowed.has(value))
    throw new BadRequestException(
      `Invalid ${field}: ${value}. Must be one of: ${[...allowed].join(", ")}`,
    );
}
export function validateTitle(title) {
  if (title.trim().length === 0)
    throw new BadRequestException("title is required");
}
export function validateTaskType(t) {
  rejectUnless(t, VALID_TASK_TYPES, "taskType");
}
export function validatePriority(p) {
  rejectUnless(p, VALID_PRIORITIES, "priority");
}
export function validateTaskStatus(s) {
  rejectUnless(s, VALID_STATUSES, "status");
}
export function validateTimestamp(value, field) {
  if (value === undefined || value === null) return;
  if (Number.isNaN(new Date(value).getTime()))
    throw new BadRequestException(`Invalid ${field}`);
}
export function validateMutableStatusTransition(from, to) {
  if (from === to) return;
  if (to === "completed" || to === "cancelled") {
    throw new BadRequestException(
      "Use complete/cancel endpoints for terminal task transitions",
    );
  }
  if (from === "pending" && to === "in_progress") return;
  throw new BadRequestException(
    `Transition from '${from}' to '${to}' is not allowed`,
  );
}
export function validateTerminalTransition(from, to) {
  if (from === "pending" || from === "in_progress") return;
  throw new BadRequestException(
    `Transition from '${from}' to '${to}' is not allowed`,
  );
}
//# sourceMappingURL=tasks.errors.js.map
