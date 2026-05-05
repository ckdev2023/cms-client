/**
 * BUG-159 [P2][BE/FE] fix-with-data 闭环锁：server `resolveCustomerGroupId` /
 * `resolveExplicitGroupId` 把 `cases.group_id` 持久化为有效 UUID 后，
 * admin BillingTable Group 列能正确展示本地化标签。
 *
 * 与 BUG-140 (`BillingTable.bug140.test.ts`) 的区别：
 * - BUG-140 = **fix-no-data**：alias 未注册 / UUID 裸露 → `—` 占位兜底。
 * - BUG-159 = **fix-with-data**：server 已持久化 `group_id`，App.vue
 *   `refreshGroupAliases` 完成注册 → Group cell 展示三语 catalog 名。
 *
 * R13 v2 服务端补强摘要（对照 `cases.service.bug159-group-inheritance.focused.test.ts`）：
 * - `resolveCustomerGroupId`：`g.name = cv.group_val OR g.id::text = cv.group_val`
 *   双路径 SQL，customer 无 group 时不抛错、返回 `undefined`。
 * - `resolveExplicitGroupId`：UUID/slug/name 归一化为 `groups.id`，
 *   无法解析时抛 `BadRequestException(CASE_GROUP_NOT_FOUND)`。
 * - migration 037：历史 `cases.group_id IS NULL` 行二次回填。
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n, setAppLocale, type AppLocale } from "../../../i18n";
import {
  clearGroupAliases,
  registerGroupAliases,
} from "../../../shared/model/useGroupOptions";
import BillingTable from "./BillingTable.vue";
import type { CaseBillingRow } from "../types";

const GROUP_UUID = "a1b2c3d4-5678-4def-abcd-111122223333";

const BASE_ROW: CaseBillingRow = {
  id: "billing-bug-159",
  caseId: "case-bug-159",
  caseName: "BMV-CERT-4M data-closed",
  caseNo: "CASE-202604-0159",
  client: { name: "BUG-159 probe client", type: "—" },
  group: GROUP_UUID as CaseBillingRow["group"],
  owner: "Local Admin",
  amountDue: 250000,
  amountReceived: 0,
  amountOutstanding: 250000,
  status: "due",
  nextNode: null,
  billingRiskAcknowledged: false,
  billingRiskAcknowledgedAt: null,
  billingRiskAcknowledgedByDisplayName: null,
};

const originalLocale = i18n.global.locale.value as AppLocale;

function mountTable(rows: CaseBillingRow[]) {
  return mount(BillingTable, {
    props: { rows },
    global: { plugins: [i18n] },
  });
}

function readGroupCellText(wrapper: ReturnType<typeof mountTable>): string {
  const groupCell = wrapper.find("tbody td.bt__col--group .ui-chip");
  expect(groupCell.exists()).toBe(true);
  return groupCell.text();
}

describe("BillingTable — BUG-159 fix-with-data closure", () => {
  beforeEach(() => {
    setAppLocale("zh-CN");
    clearGroupAliases();
  });

  afterEach(() => {
    setAppLocale(originalLocale);
    clearGroupAliases();
  });

  it("renders zh-CN catalog label when server-persisted UUID is alias-registered to catalog name", async () => {
    registerGroupAliases([{ id: GROUP_UUID, name: "tokyo-1" }]);
    const wrapper = mountTable([{ ...BASE_ROW }]);
    await wrapper.vm.$nextTick();
    expect(readGroupCellText(wrapper)).toBe("东京一组");
  });

  it("renders en-US catalog label after locale switch", async () => {
    registerGroupAliases([{ id: GROUP_UUID, name: "tokyo-1" }]);
    const wrapper = mountTable([{ ...BASE_ROW }]);
    await wrapper.vm.$nextTick();

    setAppLocale("en-US");
    await wrapper.vm.$nextTick();
    expect(readGroupCellText(wrapper)).toBe("Tokyo Team 1");
  });

  it("renders ja-JP catalog label after locale switch", async () => {
    registerGroupAliases([{ id: GROUP_UUID, name: "tokyo-1" }]);
    const wrapper = mountTable([{ ...BASE_ROW }]);
    await wrapper.vm.$nextTick();

    setAppLocale("ja-JP");
    await wrapper.vm.$nextTick();
    expect(readGroupCellText(wrapper)).toBe("東京一組");
  });

  it("cycles through all three locales for the same alias-registered UUID", async () => {
    registerGroupAliases([{ id: GROUP_UUID, name: "tokyo-1" }]);
    const wrapper = mountTable([{ ...BASE_ROW }]);
    await wrapper.vm.$nextTick();
    expect(readGroupCellText(wrapper)).toBe("东京一组");

    setAppLocale("en-US");
    await wrapper.vm.$nextTick();
    expect(readGroupCellText(wrapper)).toBe("Tokyo Team 1");

    setAppLocale("ja-JP");
    await wrapper.vm.$nextTick();
    expect(readGroupCellText(wrapper)).toBe("東京一組");
  });

  it("renders `—` placeholder when row.group is null-equivalent (data not persisted by server)", () => {
    // cases.group_id 必须由 server 持久化；未持久化时 row.group 为空，
    // BillingTable 应展示 `—` 占位而非 undefined / 空白。
    const nullRow: CaseBillingRow = {
      ...BASE_ROW,
      id: "billing-bug-159-null",
      group: "" as CaseBillingRow["group"],
    };
    const wrapper = mountTable([nullRow]);
    expect(readGroupCellText(wrapper)).toBe("—");
  });
});
