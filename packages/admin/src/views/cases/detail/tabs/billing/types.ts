/**
 * 收费 Tab 的类型定义。
 *
 * 位置沿革：自 `views/cases/types-detail.ts`（1759 行 / 126 处 import 的类型枢纽）
 * 按 Tab 归属拆出（B3）。归属口径沿用 B1 确立的九子域划分——以 CASE_DETAIL_TABS、
 * RefetchTag slice、seam adapter 分布、i18n 命名空间四方互证，非按文件名臆断。
 *
 * 本文件只依赖模块类型内核 `types-core.ts`，不得 import 其他 Tab 的类型
 * （「tabs 之间互不 import」，由 depcruise 的 no-circular 与后续边界规则守门）。
 */

import type { BillingStatusKey } from "../../../types-core";

/** 行类别：応収（plan）、入金（valid payment）、作废入金（voided）、冲正入金（reversed）。 */
export type PaymentRowKind = "plan" | "payment" | "voided" | "reversed";

/**
 *
 */
export interface PaymentRow {
  /**
   *
   */
  date: string;
  /**
   *
   */
  type: string;
  /**
   *
   */
  amount: string;
  /**
   *
   */
  status: BillingStatusKey | string;
  /**
   *
   */
  statusLabel: string;
  /** 行类别——用于 UI 底色区分。不提供时默认 `"plan"`（向后兼容）。 */
  kind?: PaymentRowKind;
  /** 关联的 billing plan milestone 名称（payment 行用）。 */
  milestoneName?: string;
  /** 备注文案（voided/reversed 行展示 reasonCode + 操作人）。 */
  note?: string;
  /** 金额是否带删除线（voided/reversed 行）。 */
  strikethrough?: boolean;
  /** milestone 本地化 i18n key，例如 `billing.milestone.case_fee`；未命中映射时为 `undefined`。 */
  typeI18nKey?: string;
  /** 收费计划节点 ID（`kind === "plan"` 时由适配层填入，用于 deep-link 预选节点）。 */
  billingPlanId?: string;
}

/**
 *
 */
export interface BillingData {
  /**
   *
   */
  total: string;
  /**
   *
   */
  received: string;
  /**
   *
   */
  outstanding: string;
  /**
   *
   */
  payments: PaymentRow[];
}
