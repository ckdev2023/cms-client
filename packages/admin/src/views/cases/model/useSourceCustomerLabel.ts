import type {
  CaseCreateCustomerOption,
  CaseCreateSourceContext,
} from "../types";

/** 解析所需最小主申请人形状。 */
export interface SourceCustomerPrimaryRef {
  /** 主申请人 id。 */
  id: string;
  /** 主申请人显示名。 */
  name: string;
  /** 主申请人业务编号。 */
  customerNumber?: string;
}

/**
 * 挑选 source 标签用的客户编号：优先主申请人 ref，其次下拉命中项。
 *
 * @param id - 来源上下文中的客户 id
 * @param primary - 当前主申请人引用
 * @param fromList - 客户下拉命中的客户选项
 * @returns 客户编号（未解析时返回空串）
 */
export function pickSourceCustomerNumber(
  id: string,
  primary: SourceCustomerPrimaryRef | null,
  fromList: CaseCreateCustomerOption | undefined,
): string {
  if (primary?.id === id && primary.customerNumber)
    return primary.customerNumber;
  return fromList?.customerNumber ?? "";
}

/**
 * 挑选 source 标签用的客户显示名：优先主申请人 ref，其次下拉命中项，
 * 最后回退到 sourceContext 透传的 customerName。
 *
 * @param id - 来源上下文中的客户 id
 * @param primary - 当前主申请人引用
 * @param fromList - 客户下拉命中的客户选项
 * @param sourceContext - 建案向导来源上下文
 * @returns 客户显示名（未解析时返回空串）
 */
export function pickSourceCustomerName(
  id: string,
  primary: SourceCustomerPrimaryRef | null,
  fromList: CaseCreateCustomerOption | undefined,
  sourceContext: CaseCreateSourceContext,
): string {
  if (primary?.id === id && primary.name) return primary.name;
  if (fromList?.name) return fromList.name;
  return sourceContext.customerName ?? "";
}

/**
 * 组装 source 标签最终展示文本；任一字段为空时优雅降级；全部缺失
 * 则返回 loading 占位，避免直显 raw UUID。
 *
 * @param number - 客户编号（如 `CUS-202604-0005`）
 * @param name - 客户显示名
 * @param resolvingLabel - 未解析完成时的 loading 占位文本
 * @returns 用于 i18n `{id}` 插值的友好标签
 */
export function formatSourceCustomerLabel(
  number: string,
  name: string,
  resolvingLabel: string,
): string {
  if (number && name) return `${number} · ${name}`;
  if (name) return name;
  if (number) return number;
  return resolvingLabel;
}

/**
 * 建案向导顶部 source 区客户标签解析入口（BUG-161）。
 *
 * @param sourceContext - 建案向导来源上下文
 * @param primary - 当前主申请人引用
 * @param customers - 客户下拉列表
 * @param resolvingLabel - 未解析完成时的 loading 占位文本
 * @returns 顶部 source 行展示文本；无 customerId 时返回空串
 */
export function resolveSourceCustomerLabel(
  sourceContext: CaseCreateSourceContext,
  primary: SourceCustomerPrimaryRef | null,
  customers: readonly CaseCreateCustomerOption[],
  resolvingLabel: string,
): string {
  const id = sourceContext.customerId;
  if (!id) return "";
  const fromList = customers.find((c) => c.id === id);
  const number = pickSourceCustomerNumber(id, primary, fromList);
  const name = pickSourceCustomerName(id, primary, fromList, sourceContext);
  return formatSourceCustomerLabel(number, name, resolvingLabel);
}
