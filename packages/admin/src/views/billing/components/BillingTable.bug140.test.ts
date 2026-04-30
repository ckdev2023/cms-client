import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n, setAppLocale, type AppLocale } from "../../../i18n";
import {
  clearGroupAliases,
  registerGroupAliases,
} from "../../../shared/model/useGroupOptions";
import BillingTable from "./BillingTable.vue";
import type { CaseBillingRow } from "../types";

/**
 * BUG-140 [P1][FE/data]：`BillingTable` 案件收费列表 Group 列在真实 DB
 * Group 下显示空白 / UUID。BUG-136 修复未覆盖 billing 链路；本用例锁
 * 定 row.group 为 UUID 时的渲染契约：
 * - UUID 未注册别名 → 渲染 `—` 占位，不得直显 36-char UUID。
 * - UUID 注册到 catalog 内分组（如 `tokyo-1`）→ 渲染本地化标签。
 * - UUID 注册到 catalog 外分组名（如 `MyCustomGroup`）→ 渲染服务端原名。
 * - 切换 locale 时 Group 文案随之本地化。
 * - catalog 内静态 ID 渲染保持不变（向后兼容）。
 * - alias 指向 disabled 分组时拼接 disabled 后缀。
 */

const SAMPLE_UUID = "ef21fdd2-1ffc-4a27-8b47-a640d6bd021c";

const BASE_ROW: CaseBillingRow = {
  id: "billing-bug-140",
  caseId: "case-bug-140",
  caseName: "R12 keiei probe",
  caseNo: "CASE-202604-0010",
  client: { name: "R6试探客户", type: "—" },
  group: SAMPLE_UUID as CaseBillingRow["group"],
  owner: "Local Admin",
  amountDue: 180000,
  amountReceived: 0,
  amountOutstanding: 180000,
  status: "due",
  nextNode: null,
  billingRiskAcknowledged: false,
  billingRiskAcknowledgedAt: null,
  billingRiskAcknowledgedByDisplayName: null,
};

const originalLocale = i18n.global.locale.value as AppLocale;

function mountTable(group: string) {
  return mount(BillingTable, {
    props: {
      rows: [{ ...BASE_ROW, group: group as CaseBillingRow["group"] }],
    },
    global: { plugins: [i18n] },
  });
}

function readGroupCellText(wrapper: ReturnType<typeof mountTable>): string {
  const groupCell = wrapper.find("tbody td.billing-table__col--group .ui-chip");
  expect(groupCell.exists()).toBe(true);
  return groupCell.text();
}

describe("BillingTable — BUG-140 group UUID rendering", () => {
  beforeEach(() => {
    setAppLocale("zh-CN");
    clearGroupAliases();
  });

  afterEach(() => {
    setAppLocale(originalLocale);
    clearGroupAliases();
  });

  it("hides raw UUID with `—` placeholder when no alias registered", () => {
    const wrapper = mountTable(SAMPLE_UUID);
    const text = readGroupCellText(wrapper);
    expect(text).not.toContain(SAMPLE_UUID);
    expect(text).toBe("—");
  });

  it("renders localized catalog label when alias maps UUID to catalog name", async () => {
    registerGroupAliases([{ id: SAMPLE_UUID, name: "tokyo-1" }]);
    const wrapper = mountTable(SAMPLE_UUID);
    await wrapper.vm.$nextTick();
    expect(readGroupCellText(wrapper)).toBe("东京一组");
  });

  it("renders raw server-side name when alias points outside catalog", async () => {
    registerGroupAliases([{ id: SAMPLE_UUID, name: "MyCustomGroup" }]);
    const wrapper = mountTable(SAMPLE_UUID);
    await wrapper.vm.$nextTick();
    expect(readGroupCellText(wrapper)).toBe("MyCustomGroup");
  });

  it("re-renders to localized label after alias is registered post-mount", async () => {
    const wrapper = mountTable(SAMPLE_UUID);
    expect(readGroupCellText(wrapper)).toBe("—");

    registerGroupAliases([{ id: SAMPLE_UUID, name: "tokyo-1" }]);
    await wrapper.vm.$nextTick();

    expect(readGroupCellText(wrapper)).toBe("东京一组");
  });

  it("respects locale switch when alias resolves to catalog entry", async () => {
    registerGroupAliases([{ id: SAMPLE_UUID, name: "tokyo-1" }]);
    const wrapper = mountTable(SAMPLE_UUID);
    await wrapper.vm.$nextTick();
    expect(readGroupCellText(wrapper)).toBe("东京一组");

    setAppLocale("en-US");
    await wrapper.vm.$nextTick();
    expect(readGroupCellText(wrapper)).toBe("Tokyo Team 1");

    setAppLocale("ja-JP");
    await wrapper.vm.$nextTick();
    expect(readGroupCellText(wrapper)).toBe("東京一組");
  });

  it("keeps existing static catalog id rendering unchanged", () => {
    const wrapper = mountTable("tokyo-1");
    expect(readGroupCellText(wrapper)).toBe("东京一组");
  });

  it("appends disabled suffix when alias points to a disabled catalog group", async () => {
    registerGroupAliases([{ id: SAMPLE_UUID, name: "osaka" }]);
    const wrapper = mountTable(SAMPLE_UUID);
    await wrapper.vm.$nextTick();
    expect(readGroupCellText(wrapper)).toBe("大阪组（已停用）");
  });

  it("renders `—` when row.group is empty string", () => {
    const wrapper = mountTable("");
    expect(readGroupCellText(wrapper)).toBe("—");
  });
});
