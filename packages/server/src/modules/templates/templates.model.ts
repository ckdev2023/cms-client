import { isInRollout } from "../../infra/utils/rollout";

/**
 * 支持的模板类型标识列表。
 */
export const templateKinds = [
  "case_type",
  "state_flow",
  "document_checklist",
  "reminder_rule_set",
  "document_template",
] as const;

/**
 * 模板类型标识。
 */
export type TemplateKind = (typeof templateKinds)[number];

/**
 * 判断值是否为 TemplateKind。
 *
 * @param v 待校验值
 * @returns 是否为 TemplateKind
 */
export function isTemplateKind(v: unknown): v is TemplateKind {
  return (
    typeof v === "string" && (templateKinds as readonly string[]).includes(v)
  );
}

/**
 * 模板灰度发布规则。
 */
export type TemplateRollout =
  | { type: "all" }
  | { type: "percentage"; percentage: number; salt: string };

/**
 * 模板发布模式。
 */
export type TemplateReleaseMode = "legacy" | "template";

/**
 * 模板版本记录（DB 读取后映射为驼峰）。
 */
export type TemplateVersionRow = {
  id: string;
  orgId: string;
  kind: TemplateKind;
  key: string;
  version: number;
  config: Record<string, unknown>;
  createdByUserId: string | null;
  createdAt: string;
};

/**
 * 模板发布记录（DB 读取后映射为驼峰）。
 */
export type TemplateReleaseRow = {
  id: string;
  orgId: string;
  kind: TemplateKind;
  key: string;
  mode: TemplateReleaseMode;
  currentVersion: number | null;
  previousVersion: number | null;
  rollout: TemplateRollout;
  updatedByUserId: string | null;
  updatedAt: string;
};

/**
 * 基于 rollout 与 entityId 判断本次是否使用模板配置。
 *
 * @param rollout 灰度规则
 * @param entityId 用于灰度分桶的实体 ID（缺失时 percentage 视为不命中）
 * @returns 是否使用模板
 */
export function shouldUseTemplateByRollout(
  rollout: TemplateRollout,
  entityId: string | undefined,
): boolean {
  return isInRollout(rollout, entityId);
}
