import { LEAD_BMV_GATE_BLOCKER_CODES } from "./LeadBmvGateBinding";

/**
 * 经营管理建案闸口在客户详情中的滚动锚点（与客户承接卡 DOM id 对齐）。
 *
 * @param blockerCode - 服务端返回的 BMV 阻断码
 * @returns 以 `#bmv-intake-` 开头的片段标识符
 */
export function leadBmvCustomerIntakeFragmentForBlocker(
  blockerCode: string,
): string {
  switch (blockerCode) {
    case LEAD_BMV_GATE_BLOCKER_CODES.QUOTE_NOT_CONFIRMED:
      return "#bmv-intake-quote";
    case LEAD_BMV_GATE_BLOCKER_CODES.QUESTIONNAIRE_NOT_RETURNED:
      return "#bmv-intake-survey";
    case LEAD_BMV_GATE_BLOCKER_CODES.NOT_SIGNED:
      return "#bmv-intake-actions";
    case LEAD_BMV_GATE_BLOCKER_CODES.INTAKE_NOT_READY:
    case LEAD_BMV_GATE_BLOCKER_CODES.FEATURE_DISABLED:
    default:
      return "#bmv-intake-card";
  }
}

/**
 * 构造从线索侧跳入客户基础信息 + 承接卡深链的 hash 路由 href。
 *
 * @param customerId - 客户 ID
 * @param blockerCode - 可选闸口码，用于选择承接卡片段锚点
 * @returns 以 `#/customers/...` 开头的 hash 路由 href
 */
export function buildLeadBmvCustomerIntakeHref(
  customerId: string,
  blockerCode?: string,
): string {
  const id = customerId.trim();
  if (!id) return "#";
  const frag = blockerCode?.trim()
    ? leadBmvCustomerIntakeFragmentForBlocker(blockerCode.trim())
    : "#bmv-intake-card";
  return `#/customers/${encodeURIComponent(id)}?tab=basic${frag}`;
}
