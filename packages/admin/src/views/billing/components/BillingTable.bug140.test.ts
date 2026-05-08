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
 * - UUID 注册到 catalog 内 slug（如 `tokyo-1`）→ 渲染 DB name 原文（R2-B-3）。
 * - UUID 注册到 catalog 外分组名（如 `MyCustomGroup`）→ 渲染服务端原名。
 * - alias 路径下切换 locale 不改变显示（DB name 为权威值，R2-B-3）。
 * - catalog 内静态 ID 渲染保持本地化（fixture 路径向后兼容）。
 * - alias 指向 disabled 分组时拼接 disabled 后缀（catalog 仅提供 status）。
 *
 * R-CONSULT-02 R2-B-3 调整：原契约「alias UUID → catalog 三语本地化」已
 * 被废弃；现在 alias 路径以 `/api/groups` 返回的 `name` 为权威值。
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
  const groupCell = wrapper.find("tbody td.bt__col--group .ui-chip");
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

  it("B-0: renders localized catalog label when alias maps UUID to catalog slug", async () => {
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

  it("re-renders to localized label after alias is registered post-mount (B-0)", async () => {
    const wrapper = mountTable(SAMPLE_UUID);
    expect(readGroupCellText(wrapper)).toBe("—");

    registerGroupAliases([{ id: SAMPLE_UUID, name: "tokyo-1" }]);
    await wrapper.vm.$nextTick();

    expect(readGroupCellText(wrapper)).toBe("东京一组");
  });

  it("B-0: alias-path display is locale-dependent when DB name matches catalog", async () => {
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

  it("keeps existing static catalog slug rendering localized (fixture path BC)", () => {
    const wrapper = mountTable("tokyo-1");
    expect(readGroupCellText(wrapper)).toBe("东京一组");
  });

  it("appends disabled suffix to localized label when alias points to a disabled catalog group (B-0)", async () => {
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
