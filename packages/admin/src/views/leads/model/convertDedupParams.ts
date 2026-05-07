/**
 * 转化前 dedup pre-check 的参数构造工具。
 *
 * 抽出独立函数主要为了：
 * 1) 在 dedup 入参里同时透传 lead 自身 id，让 server 端 `excludeLeadId` 能跳过自身
 *    （回归 R-FLOW5-A-4：admin 端 dedup 调用方此前丢失 leadId，导致命中 lead 自己）；
 * 2) 让 useLeadDetailModel 的 `checkDedupForConvert` 主流程保持低圈复杂度。
 */

import type { Ref } from "vue";
import type { LeadDetail } from "../types";
import type { LeadDedupParams } from "./LeadAdapterTypes";

/**
 * 根据 lead 详情构造转化 pre-check 的 dedup 入参。
 *
 * @param leadId 当前 lead id 的 ref，用于排除自身
 * @param detail lead 详情聚合
 * @returns 入参；当 phone/email 都空时返回 null（无需调用 dedup）
 */
export function buildConvertDedupParams(
  leadId: Ref<string>,
  detail: LeadDetail,
): LeadDedupParams | null {
  const phone = detail.info.phone?.trim();
  const email = detail.info.email?.trim();
  if (!phone && !email) return null;
  const id = leadId.value?.trim();
  return {
    phone: phone || undefined,
    email: email || undefined,
    ...(id ? { leadId: id } : {}),
  };
}
