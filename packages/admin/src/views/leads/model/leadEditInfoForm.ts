import type { LeadDetail } from "../types";
import type { LeadUpdateInput } from "./LeadAdapter";
import { normalizeBusinessType } from "../../../shared/i18n/businessTypes";

/**
 * 编辑信息对话框的表单字段。
 *
 * 与服务端 `LeadDetail` / `LeadUpdateInput` 对应；
 * 所有字段统一为字符串以简化 v-model 绑定，diff 时再投影回 nullable / 必填语义。
 */
export interface LeadEditInfoFormState {
  /**
   *
   */
  name: string;
  /**
   *
   */
  phone: string;
  /**
   *
   */
  email: string;
  /**
   *
   */
  source: string;
  /**
   *
   */
  referrer: string;
  /**
   *
   */
  businessType: string;
  /**
   *
   */
  groupId: string;
  /**
   *
   */
  ownerUserId: string;
  /**
   *
   */
  language: string;
  /**
   *
   */
  note: string;
}

/**
 * 将服务端 `LeadDetail` 投影为表单初始快照，用于计算 patch diff。
 *
 * @param lead 当前线索详情
 * @returns 与表单字段一一对应的初始字符串快照
 */
export function leadEditInfoSnapshot(lead: LeadDetail): LeadEditInfoFormState {
  return {
    name: lead.info.name ?? "",
    phone: lead.info.phone ?? "",
    email: lead.info.email ?? "",
    source: lead.info.source ?? "",
    referrer: lead.info.referrer ?? "",
    businessType: normalizeIntendedCaseType(lead.intendedCaseType),
    groupId: lead.groupId ?? "",
    ownerUserId: lead.ownerId ?? "",
    language: lead.info.language ?? "",
    note: lead.info.note ?? "",
  };
}

/**
 * 将 server 返回的 `intendedCaseType` 投影为 select 可识别的 canonical kebab-case
 * 业务类型 code。
 *
 * Server 历史数据可能以 snake_case 持久化（如 `family_stay`），而下拉选项使用
 * canonical kebab-case（如 `family-stay`）。若不规范化，旧数据会导致下拉显示
 * 为空、提交后又把空值当成"未设置"误清掉服务端实际的业务类型。
 *
 * @param raw server 端原始字符串（snake_case / kebab-case / 空值）
 * @returns 规范化后可直接绑定到 select 的字符串；未识别时回落原值（保守保留）
 */
function normalizeIntendedCaseType(raw: string | null | undefined): string {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return "";
  return normalizeBusinessType(trimmed) ?? trimmed;
}

/**
 * 计算 nullable 字段（`groupId` / `ownerUserId` / `referrer` / `note`）的差量值。
 *
 * - 与初值相等：返回 `undefined`，调用方据此跳过该字段。
 * - 修改为空：返回 `null`，由调用方按显式 unset 语义提交 server。
 * - 修改为非空：返回 trim 后的字符串。
 *
 * @param value 当前表单值
 * @param base  初始值
 * @returns 差量结果（undefined/null/string）
 */
function nullableDiff(value: string, base: string): string | null | undefined {
  const trimmed = value.trim();
  const baseTrimmed = base.trim();
  if (trimmed === baseTrimmed) return undefined;
  return trimmed === "" ? null : trimmed;
}

/**
 * 计算非空字段（`name` / `phone` / `email` 等）的差量值。
 *
 * - 与初值相等：返回 `undefined`，跳过该字段。
 * - 不一致：返回 trim 后的字符串。
 *
 * @param value 当前表单值
 * @param base  初始值
 * @returns 差量结果（undefined/string）
 */
function plainDiff(value: string, base: string): string | undefined {
  const trimmed = value.trim();
  const baseTrimmed = base.trim();
  if (trimmed === baseTrimmed) return undefined;
  return trimmed;
}

/**
 * 仅采集相对初始值发生变化的字段，构造 patch 入参。
 *
 * @param form    当前表单值
 * @param initial 初始快照
 * @returns 需要提交到 server 的差量字段；若没有变化则返回空对象
 */
export function buildLeadEditInfoDiff(
  form: LeadEditInfoFormState,
  initial: LeadEditInfoFormState,
): LeadUpdateInput {
  const diff: LeadUpdateInput = {};

  const name = plainDiff(form.name, initial.name);
  if (name !== undefined) diff.name = name;

  const phone = plainDiff(form.phone, initial.phone);
  if (phone !== undefined) diff.phone = phone;

  const email = plainDiff(form.email, initial.email);
  if (email !== undefined) diff.email = email;

  const source = plainDiff(form.source, initial.source);
  if (source !== undefined) diff.source = source;

  const referrer = nullableDiff(form.referrer, initial.referrer);
  if (referrer !== undefined) diff.referrer = referrer ?? "";

  const businessType = plainDiff(form.businessType, initial.businessType);
  if (businessType !== undefined) diff.businessType = businessType;

  const groupId = nullableDiff(form.groupId, initial.groupId);
  if (groupId !== undefined) diff.groupId = groupId;

  const ownerUserId = nullableDiff(form.ownerUserId, initial.ownerUserId);
  if (ownerUserId !== undefined) diff.ownerUserId = ownerUserId;

  const language = plainDiff(form.language, initial.language);
  if (language !== undefined) diff.language = language;

  const note = nullableDiff(form.note, initial.note);
  if (note !== undefined) diff.note = note;

  return diff;
}
