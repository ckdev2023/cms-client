import { BadRequestException } from "@nestjs/common";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * オプショナル UUID クエリパラメータをパースする。
 * undefined → undefined、正規 UUID → そのまま返却、不正 → BadRequestException。
 * @param v パース対象の値
 * @param f エラーメッセージに含めるフィールド名
 * @returns 正規化した UUID 文字列、または undefined
 */
export function optUuid(v: unknown, f: string): string | undefined {
  if (v === undefined) return undefined;
  if (typeof v !== "string") throw new BadRequestException(`Invalid ${f}`);
  const t = v.trim();
  if (t.length === 0) return undefined;
  if (!UUID_RE.test(t))
    throw new BadRequestException(`${f} must be a valid UUID`);
  return t;
}

/**
 * 必須 UUID パラメータをパースする。
 * 未指定/空白/不正 → BadRequestException。
 * R2-A-1: フロントが catalog short-code（例 "suzuki"）を送ってきた場合、
 * 早期に 400 で返してサービス層の PG 22P02（500）を防ぐ。
 * @param v パース対象の値
 * @param f エラーメッセージに含めるフィールド名
 * @returns 正規化した UUID 文字列
 */
export function reqUuid(v: unknown, f: string): string {
  const r = optUuid(v, f);
  if (!r) throw new BadRequestException(`${f} is required`);
  return r;
}
