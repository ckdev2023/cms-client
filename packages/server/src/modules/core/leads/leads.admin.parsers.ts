import { BadRequestException, UnauthorizedException } from "@nestjs/common";

import type { RequestContext } from "../tenancy/requestContext";
import type { LeadListScope } from "./leads.admin.types";

type HttpRequest = { requestContext?: RequestContext };

/** リクエストコンテキストを取得（未認証時例外）。
 * @param req HTTP リクエスト
 * @returns リクエストコンテキスト
 */
export function requireCtx(req: HttpRequest): RequestContext {
  const ctx = req.requestContext;
  if (!ctx) throw new UnauthorizedException("Missing request context");
  return ctx;
}

/** ページ番号をパースする。
 * @param v 生値
 * @returns ページ番号
 */
export function parsePage(v: unknown): number | undefined {
  if (v === undefined) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new BadRequestException("Invalid page");
  const i = Math.floor(n);
  if (i < 1) throw new BadRequestException("Invalid page");
  return i;
}

/** リミット値をパースする。
 * @param v 生値
 * @returns リミット値
 */
export function parseLimit(v: unknown): number | undefined {
  if (v === undefined) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new BadRequestException("Invalid limit");
  const i = Math.floor(n);
  if (i < 1 || i > 200) throw new BadRequestException("Invalid limit");
  return i;
}

/** 任意文字列をパースする。
 * @param v 生値
 * @param f フィールド名
 * @returns トリム済み文字列
 */
export function optStr(v: unknown, f: string): string | undefined {
  if (v === undefined) return undefined;
  if (typeof v !== "string") throw new BadRequestException(`Invalid ${f}`);
  const t = v.trim();
  return t.length > 0 ? t : undefined;
}

/** 必須文字列をパースする。
 * @param v 生値
 * @param f フィールド名
 * @returns トリム済み文字列
 */
export function reqStr(v: unknown, f: string): string {
  const r = optStr(v, f);
  if (!r) throw new BadRequestException(`${f} is required`);
  return r;
}

/** 任意数値をパースする。
 * @param v 生値
 * @param f フィールド名
 * @returns 数値
 */
export function optNum(v: unknown, f: string): number | undefined {
  if (v === undefined) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new BadRequestException(`Invalid ${f}`);
  return n;
}

/** Lead 一覧スコープをパースする。
 * @param v 生値
 * @returns スコープ
 */
export function parseScope(v: unknown): LeadListScope | undefined {
  if (v === undefined) return undefined;
  if (v === "mine" || v === "group" || v === "all") return v;
  throw new BadRequestException("Invalid scope");
}

/** 文字列配列をパースする。
 * @param v 生値
 * @param f フィールド名
 * @returns 重複排除済み配列
 */
export function strArr(v: unknown, f: string): string[] {
  if (!Array.isArray(v)) throw new BadRequestException(`Invalid ${f}`);
  const items = v.map((item) => {
    if (typeof item !== "string")
      throw new BadRequestException(`Invalid ${f} item`);
    const t = item.trim();
    if (t.length === 0) throw new BadRequestException(`Invalid ${f} item`);
    return t;
  });
  if (items.length === 0)
    throw new BadRequestException(`${f} must contain at least one id`);
  return [...new Set(items)];
}

/** 任意 boolean をパースする。
 * @param v 生値
 * @param f フィールド名
 * @returns boolean
 */
export function optBool(v: unknown, f: string): boolean | undefined {
  if (v === undefined) return undefined;
  if (typeof v === "boolean") return v;
  throw new BadRequestException(`Invalid ${f}`);
}

/** localizedNames オブジェクトをパースする。
 * @param v 生値
 * @returns パース済みオブジェクト
 */
export function parseLocalizedNames(v: unknown):
  | {
      zh?: string;
      ja?: string;
      en?: string;
      defaultLocale?: "zh" | "ja" | "en";
    }
  | undefined {
  if (v === undefined) return undefined;
  if (typeof v !== "object" || v === null || Array.isArray(v)) {
    throw new BadRequestException("Invalid localizedNames");
  }
  const raw = v as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const key of ["zh", "ja", "en"] as const) {
    const val = raw[key];
    if (val !== undefined) {
      if (typeof val !== "string")
        throw new BadRequestException(`Invalid localizedNames.${key}`);
      result[key] = val;
    }
  }
  if (raw.defaultLocale !== undefined) {
    if (
      raw.defaultLocale !== "zh" &&
      raw.defaultLocale !== "ja" &&
      raw.defaultLocale !== "en"
    ) {
      throw new BadRequestException("Invalid localizedNames.defaultLocale");
    }
    result.defaultLocale = raw.defaultLocale;
  }
  return result as {
    zh?: string;
    ja?: string;
    en?: string;
    defaultLocale?: "zh" | "ja" | "en";
  };
}
