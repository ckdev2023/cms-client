/**
 * billing 模块对外输出的 DTO —— 由本模块的 service 生产（拆分批次 S5）。
 *
 * 这三个类型原本住在 `cases/cases.types-billing.ts`，却只被 billing 的
 * service 生产、并被 billing 反向 import，构成 cases ↔ billing 模块环。
 * 按「DTO 归生产者所有」归位到 billing：
 *   - CaseBillingPlanDto     ← billingPlans.service
 *   - CasePaymentRecordDto   ← paymentRecords.service
 *   - BillingListSummaryDto  ← billingSummary.service
 *
 * 名字里的 `Case` 前缀表示「作用于某个案件」，不表示归属 cases 模块。
 * cases 侧的 `CaseBillingTabAggregate` 仍持有前两者（cases → billing 单向）。
 */
import type {
  BillingGateEffectMode,
  BillingPlanStatus,
  PaymentMethod,
  PaymentRecordStatus,
} from "../model/billingEntities";

/**
 * 案件视角收费计划 DTO — 与 `BillingPlan` 核心实体同构。
 *
 * admin adapter 消费此结构映射为收费 tab 的节点行。
 * 字段语义：
 * - `milestoneName`：收费节点名称（签约金 / 尾款 / 结果后报酬 等）
 * - `status`：due | partial | paid | overdue
 * - `gateEffectMode`：off | warn | block
 *   P0 HTTP 层限制 off | warn；block 由 P1 解锁（DB CHECK 已就绪）。
 * - `amountDue`：应收金额（≥ 0）
 * - `dueDate`：预定收费日（YYYY-MM-DD 或 null）
 * - `paidAmount`：已收金额（聚合自关联 valid PaymentRecord）
 * - `unpaidAmount`：未收金额（amountDue - paidAmount，≥ 0）
 *
 * 列表场景扩展字段（org-wide list 端点 mapper 注入，详情场景不携带）：
 * - `caseNo` / `caseName` / `customerName`：关联案件/客户冗余展示
 * - `groupId` / `ownerUserId` / `ownerDisplayName`：负责人/分组冗余展示
 */
export type CaseBillingPlanDto = {
  id: string;
  caseId: string;
  milestoneName: string | null;
  amountDue: number;
  dueDate: string | null;
  status: BillingPlanStatus;
  gateEffectMode: BillingGateEffectMode;
  remark: string | null;
  paidAmount: number;
  unpaidAmount: number;
  createdAt: string;
  updatedAt: string;

  caseNo?: string | null;
  caseName?: string | null;
  customerName?: string | null;
  groupId?: string | null;
  ownerUserId?: string | null;
  ownerDisplayName?: string | null;
};

/**
 * 案件视角回款记录 DTO — 与 `PaymentRecord` 核心实体同构。
 *
 * admin adapter 消费此结构映射为收费 tab 的回款行。
 * 字段语义：
 * - `recordStatus`：valid | voided | reversed
 * - `paymentMethod`：bank_transfer | cash | credit_card | other
 * - `recordedByDisplayName`：登记人展示名（聚合查询追加）
 * - `voidedBy` / `voidedByDisplayName` / `voidedAt`：
 *   当 `recordStatus='voided'` 时表示作废操作人/时间；
 *   当 `recordStatus='reversed'` 时复用同一列表示冲正操作人/时间（D10 决议：
 *   方案 A 复用 voided_* 列承载 voided/reversed 两态，不新增独立列）。
 *   前端 PaymentLogTable 应按 `recordStatus` 分支渲染标签与颜色。
 *
 * 列表场景扩展字段（org-wide list 端点 mapper 注入，详情场景不携带）：
 * - `caseNo` / `caseName`：关联案件冗余展示
 * - `milestoneName`：关联收费节点名称冗余展示
 */
export type CasePaymentRecordDto = {
  id: string;
  billingPlanId: string;
  caseId: string;
  amountReceived: number;
  receivedAt: string;
  paymentMethod: PaymentMethod | null;
  recordStatus: PaymentRecordStatus;
  receiptStorageType: string | null;
  receiptRelativePathOrKey: string | null;
  note: string | null;
  voidReasonCode: string | null;
  voidReasonNote: string | null;
  /**
   * 作废/冲正操作人 ID。
   * `recordStatus='reversed'` 时表示冲正操作人（D10 复用语义）。
   */
  voidedBy: string | null;
  /**
   * 作废/冲正操作人展示名。
   * `recordStatus='reversed'` 时表示冲正操作人展示名（D10 复用语义）。
   */
  voidedByDisplayName: string | null;
  /**
   * 作废/冲正时间。
   * `recordStatus='reversed'` 时表示冲正时间（D10 复用语义）。
   */
  voidedAt: string | null;
  reversedFromPaymentRecordId: string | null;
  recordedBy: string | null;
  recordedByDisplayName: string | null;
  createdAt: string;

  caseNo?: string | null;
  caseName?: string | null;
  milestoneName?: string | null;
};

/**
 * 全组织收费列表汇总 DTO。
 *
 * 映射端点：`GET /api/billing-summary` 返回值。
 *
 * 字段语义：
 * - `totalDue`：命中过滤条件的各 billing 计划行「有效应收」之和——
 *   若该行 `amount_due > 0` 则取 `amount_due`，否则回退为该行的 valid 回款合计（避免计划金额未录入但已登记回款时汇总卡显示总应收为 0）
 * - `totalReceived`：命中过滤条件的 valid payment_records.amount_received 之和
 * - `totalOutstanding`：max(totalDue - totalReceived, 0)
 * - `overdueAmount`：实时计算（D2 决议）——
 *   `sum(br.amount_due - paid) where br.due_date < now()
 *    and br.status in ('due','partial','overdue')`，
 *   paid 子聚合仅计入 record_status='valid'，不依赖 status='overdue' 是否被人工标过
 */
export type BillingListSummaryDto = {
  totalDue: number;
  totalReceived: number;
  totalOutstanding: number;
  overdueAmount: number;
};
