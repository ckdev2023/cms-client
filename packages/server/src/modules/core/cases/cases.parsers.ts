import { BadRequestException } from "@nestjs/common";

/**
 * Validates that value is a non-empty string; throws on invalid input.
 * @param value - raw request input
 * @param field - field name used in error message
 * @returns the validated string
 */
export function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new BadRequestException(`Invalid ${field}`);
  }
  return value;
}

/**
 * Parses an optional string field; returns undefined when absent.
 * @param value - raw request input
 * @param field - field name used in error message
 * @returns the validated string or undefined
 */
export function parseOptionalString(
  value: unknown,
  field: string,
): string | undefined {
  if (value === undefined) return undefined;
  return requireString(value, field);
}

/**
 * Parses an optional nullable string field; preserves null/undefined semantics.
 * @param value - raw request input
 * @param field - field name used in error message
 * @returns the validated string, null, or undefined
 */
export function parseOptionalNullableString(
  value: unknown,
  field: string,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return requireString(value, field);
}

/**
 * Parses an optional nullable number field; throws on non-finite values.
 * @param value - raw request input
 * @param field - field name used in error message
 * @returns the validated number, null, or undefined
 */
export function parseOptionalNullableNumber(
  value: unknown,
  field: string,
): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new BadRequestException(`Invalid ${field}`);
  return n;
}

/**
 * Validates that value is a plain object; returns undefined when absent.
 * @param value - raw request input
 * @returns the validated record or undefined
 */
export function parseObject(
  value: unknown,
): Record<string, unknown> | undefined {
  if (value === undefined) return undefined;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new BadRequestException("Invalid object");
}

/**
 * Parses a page number (1-based); returns undefined when absent.
 * @param value - raw request input
 * @returns the validated page number or undefined
 */
export function parsePage(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  const n = typeof value === "string" ? Number(value) : Number(value);
  if (!Number.isFinite(n)) throw new BadRequestException("Invalid page");
  const i = Math.floor(n);
  if (i < 1) throw new BadRequestException("Invalid page");
  return i;
}

/**
 * Parses a limit value (1–200); returns undefined when absent.
 * @param value - raw request input
 * @returns the validated limit or undefined
 */
export function parseLimit(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  const n = typeof value === "string" ? Number(value) : Number(value);
  if (!Number.isFinite(n)) throw new BadRequestException("Invalid limit");
  const i = Math.floor(n);
  if (i < 1 || i > 200) throw new BadRequestException("Invalid limit");
  return i;
}
