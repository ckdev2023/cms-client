/* eslint-disable jsdoc/require-jsdoc */
import {
  BadRequestException,
  HttpException,
  InternalServerErrorException,
} from "@nestjs/common";

export const TASK_WRITE_ERROR_CODES = {
  ASSIGNEE_NOT_FOUND: "TASK_ASSIGNEE_NOT_FOUND",
  CREATE_FAILED: "TASK_CREATE_FAILED",
} as const;

const PG_CLIENT_ERROR_REASONS: Readonly<Record<string, string>> = {
  "23503": "foreign key violation",
  "23505": "unique constraint violation",
  "23514": "check constraint violation",
  "23502": "not null violation",
};

export function wrapTaskCreateError(error: unknown): never {
  if (error instanceof HttpException) throw error;
  const pgCode = (error as { code?: string }).code;
  const reason = pgCode ? PG_CLIENT_ERROR_REASONS[pgCode] : undefined;
  if (pgCode && reason) {
    const constraint = (error as { constraint?: string }).constraint ?? null;
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

function rejectUnless(
  value: string,
  allowed: Set<string>,
  field: string,
): void {
  if (!allowed.has(value))
    throw new BadRequestException(
      `Invalid ${field}: ${value}. Must be one of: ${[...allowed].join(", ")}`,
    );
}

export function validateTitle(title: string): void {
  if (title.trim().length === 0)
    throw new BadRequestException("title is required");
}
export function validateTaskType(t: string): void {
  rejectUnless(t, VALID_TASK_TYPES, "taskType");
}
export function validatePriority(p: string): void {
  rejectUnless(p, VALID_PRIORITIES, "priority");
}
export function validateTaskStatus(s: string): void {
  rejectUnless(s, VALID_STATUSES, "status");
}

export function validateTimestamp(
  value: string | null | undefined,
  field: string,
): void {
  if (value === undefined || value === null) return;
  if (Number.isNaN(new Date(value).getTime()))
    throw new BadRequestException(`Invalid ${field}`);
}

export function validateMutableStatusTransition(
  from: string,
  to: string,
): void {
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

export function validateTerminalTransition(
  from: string,
  to: "completed" | "cancelled",
): void {
  if (from === "pending" || from === "in_progress") return;
  throw new BadRequestException(
    `Transition from '${from}' to '${to}' is not allowed`,
  );
}
