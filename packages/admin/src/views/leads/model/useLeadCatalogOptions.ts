import { computed, type ComputedRef, type Ref } from "vue";
import {
  getGroupOptions,
  type GroupSelectOption,
} from "../../../shared/model/useGroupOptions";
import { toApiOwnerOption } from "../../../shared/model/useOwnerOptions";
import { getActiveUserOptions } from "../../../shared/model/useOrgUserOptions";
import type { OwnerOption } from "../types";

interface LeadCatalogOptions {
  /**
   * 由 `/api/users` 别名表派生的负责人选项；value 始终是真实 UUID，
   * 供「新建线索」/「批量改派」等写入路径使用。
   *
   * R2-A-1: 写入路径必须用 UUID，否则 server 端 PG UUID 列 cast 失败 → 500。
   */
  apiOwnerOptions: ComputedRef<OwnerOption[]>;
  /**
   * 由 `/api/groups` 别名表派生的分组选项；value 始终是真实 UUID。
   */
  apiGroupOptions: ComputedRef<GroupSelectOption[]>;
}

/**
 * 线索模块写入路径专用的下拉选项：负责人 + 分组。
 *
 * 与基于 fixture 的 `getOwnerOptions / getActiveGroupOptions` 区别：
 * 这里返回的 value 都是来自 `/api/users` / `/api/groups` 的真实 UUID，
 * 可直接作为 `POST /admin/leads` / `POST /admin/leads/bulk/assign` 等
 * 端点的 body 字段。
 *
 * @param locale - 当前 i18n locale ref，用于 group 标签本地化
 * @returns 写入路径的负责人/分组下拉选项
 */
export function useLeadCatalogOptions(locale: Ref<string>): LeadCatalogOptions {
  const apiOwnerOptions = computed<OwnerOption[]>(() =>
    getActiveUserOptions().map((u) =>
      toApiOwnerOption({ id: u.value, displayName: u.label }),
    ),
  );
  const apiGroupOptions = computed(() =>
    getGroupOptions("write", locale.value),
  );
  return { apiOwnerOptions, apiGroupOptions };
}
