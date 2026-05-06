import type { LeadDetail } from "../types";
import type { LeadUpdateInput } from "./LeadAdapter";

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
    businessType: lead.intendedCaseType ?? "",
    groupId: lead.groupId ?? "",
    ownerUserId: lead.ownerId ?? "",
    language: lead.info.language ?? "",
    note: lead.info.note ?? "",
  };
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
