import { BadRequestException } from "@nestjs/common";
import type {
  CustomerActiveCasesFilter,
  CustomerListScope,
} from "./customers.types";

/**
 * 解析分页页码。
 * @param value - 原始输入。
 * @returns 解析后的页码或 undefined。
 */
export function parsePage(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new BadRequestException("Invalid page");
  const i = Math.floor(n);
  if (i < 1) throw new BadRequestException("Invalid page");
  return i;
}

/**
 * 解析每页条数限制。
 * @param value - 原始输入。
 * @returns 解析后的限制数或 undefined。
 */
export function parseLimit(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new BadRequestException("Invalid limit");
  const i = Math.floor(n);
  if (i < 1 || i > 200) throw new BadRequestException("Invalid limit");
  return i;
}

/**
 * 解析可选的裁剪字符串。
 * @param value - 原始输入。
 * @param field - 字段名（用于错误提示）。
 * @returns 裁剪后的字符串或 undefined。
 */
export function parseOptionalTrimmedString(
  value: unknown,
  field: string,
): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string")
    throw new BadRequestException(`Invalid ${field}`);
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * 解析必填的裁剪字符串。
 * @param value - 原始输入。
 * @param field - 字段名（用于错误提示）。
 * @returns 裁剪后的非空字符串。
 */
export function parseRequiredTrimmedString(
  value: unknown,
  field: string,
): string {
  const parsed = parseOptionalTrimmedString(value, field);
  if (!parsed) throw new BadRequestException(`${field} is required`);
  return parsed;
}

/**
 * 解析列表查询范围。
 * @param value - 原始输入。
 * @returns 校验后的 scope 字面量或 undefined。
 */
export function parseScope(value: unknown): CustomerListScope | undefined {
  if (value === undefined) return undefined;
  if (value === "mine" || value === "group" || value === "all") return value;
  throw new BadRequestException("Invalid scope");
}

/**
 * 解析活跃案件过滤器。
 * @param value - 原始输入。
 * @returns 校验后的过滤字面量或 undefined。
 */
export function parseActiveCases(
  value: unknown,
): CustomerActiveCasesFilter | undefined {
  if (value === undefined) return undefined;
  if (value === "yes" || value === "has") return "yes";
  if (value === "no" || value === "none") return "no";
  throw new BadRequestException("Invalid activeCases");
}

/**
 * 解析客户类型。
 * @param value - 原始输入。
 * @returns 校验后的类型字符串。
 */
export function parseType(value: unknown): string {
  if (typeof value !== "string" || value.length === 0)
    throw new BadRequestException("Invalid type");
  if (value !== "individual" && value !== "corporation")
    throw new BadRequestException("Invalid type enum");
  return value;
}

/**
 * 解析可选的对象字段。
 * @param value - 原始输入。
 * @returns 解析后的对象或 undefined。
 */
export function parseObject(
  value: unknown,
): Record<string, unknown> | undefined {
  if (value === undefined) return undefined;
  if (value && typeof value === "object" && !Array.isArray(value))
    return value as Record<string, unknown>;
  throw new BadRequestException("Invalid object");
}

/**
 * 解析必填的对象字段。
 * @param value - 原始输入。
 * @param field - 字段名（用于错误提示）。
 * @returns 解析后的非空对象。
 */
export function parseRequiredObject(
  value: unknown,
  field: string,
): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value))
    return value as Record<string, unknown>;
  throw new BadRequestException(`${field} is required and must be an object`);
}

/**
 * 解析可选的数值字段。
 * @param value - 原始输入。
 * @param field - 字段名（用于错误提示）。
 * @returns 解析后的数字或 undefined。
 */
export function parseOptionalNumber(
  value: unknown,
  field: string,
): number | undefined {
  if (value === undefined || value === null) return undefined;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) throw new BadRequestException(`Invalid ${field}`);
  return n;
}

/**
 * 解析联系人数组。
 * @param value - 原始输入。
 * @returns 解析后的联系人对象数组或 undefined。
 */
export function parseContacts(
  value: unknown,
): Record<string, unknown>[] | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        throw new BadRequestException("Invalid contacts item");
      }
    }
    return value as Record<string, unknown>[];
  }
  throw new BadRequestException("Invalid contacts");
}

/**
 * 解析去重后的字符串数组。
 * @param value - 原始输入。
 * @param field - 字段名（用于错误提示）。
 * @returns 去重后的非空字符串数组。
 */
export function parseStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) throw new BadRequestException(`Invalid ${field}`);
  const items = value.map((item) => {
    if (typeof item !== "string")
      throw new BadRequestException(`Invalid ${field} item`);
    const trimmed = item.trim();
    if (trimmed.length === 0)
      throw new BadRequestException(`Invalid ${field} item`);
    return trimmed;
  });
  if (items.length === 0)
    throw new BadRequestException(`${field} must contain at least one id`);
  return [...new Set(items)];
}
