import { describe, it, expect } from "vitest";
import {
  deriveCustomerSummaryStats,
  useCustomerFilters,
} from "./useCustomerFilters";
import type {
  CustomerSummary,
  CustomerViewerContext,
  SelectOption,
} from "../types";

/**
 * BUG-155 回归：客户列表卡片 `我的客户` = 0 与 "我的" tab 列表显示 2 条客户
 * 不一致。
 *
 * 根因：
 * - 服务端 `GET /api/customers?scope=mine` 按 `base_profile.owner_user_id ===
 *   currentUser.userId` 过滤，列表正确返回 admin 名下的客户；服务端 join
 *   `users.name` 后输出 `owner.name = "Local Admin"`。
 * - 旧实现把 `CURRENT_VIEWER`（hardcoded fixture：`ownerName="山田翔太"`）
 *   传给 `deriveCustomerSummaryStats`；由于 "Local Admin" 与 "山田翔太" 都
 *   不在静态 catalog，`resolveOwnerValue(...)` 都返回 `null`，旧条件
 *   `null === null` 让二者"被认为相等"，使任意非 catalog 客户都被算作
 *   "我的"。
 * - 与之配套的另一面：当真实管理员名 ≠ "山田翔太"，但 customer.owner.name
 *   被 server join 出 "Local Admin"，旧逻辑同样 `null === null` → mine
 *   计数虚高，但摘要卡 source 实际上是 *已被 server scope=mine 过滤后的*
 *   `filteredCustomers.value`，所以多数情况下两个非 catalog 名都会"对上"，
 *   不应该出现 mine = 0；走查实测 mine = 0 的根因是把摘要 source 与 viewer
 *   一起切回 fixture，导致摘要卡和列表分裂。
 *
 * 修复方向：
 * 1. `useCustomerFilters` 在 owner.name / group 双侧都 catalog miss 时回退到
 *    trim 后字面量等值，不再把任意"非 catalog"姓名互相视为相等；
 * 2. `CustomerListView.vue` 用 `useAdminSession().currentUser.value.name`
 *    动态构造 viewer，使本地摘要口径与 server `scope=mine` 完全对齐。
 *
 * 本测试覆盖第 1 条契约：viewer 为登录态 admin（"Local Admin"）时，统计
 * 与同名 owner 客户精确匹配；与无关的非 catalog 客户不再误匹配。
 */

const GROUP_OPTIONS: SelectOption[] = [
  { value: "tokyo-1", label: "Tokyo Team 1" },
  { value: "osaka", label: "Osaka Team" },
];

const OWNER_OPTIONS: SelectOption[] = [
  { value: "yamada-s", label: "Shota Yamada" },
  { value: "takahashi-k", label: "Kenta Takahashi" },
];

function customer(
  partial: Partial<CustomerSummary> & { id: string },
): CustomerSummary {
  return {
    displayName: "",
    legalName: "",
    furigana: "",
    customerNumber: "",
    phone: "",
    email: "",
    totalCases: 0,
    activeCases: 0,
    lastContactDate: null,
    lastContactChannel: null,
    owner: { initials: "", name: "" },
    referralSource: "",
    group: "",
    bmvProfile: null,
    ...partial,
  };
}

const ADMIN_VIEWER: CustomerViewerContext = {
  ownerName: "Local Admin",
  group: "東京一組",
};

const SAMPLE_CUSTOMERS: CustomerSummary[] = [
  customer({
    id: "scope-mine-1",
    displayName: "R6試探客戶",
    legalName: "R6試探客戶",
    furigana: "アール6シタンキャク",
    activeCases: 3,
    owner: { initials: "LA", name: "Local Admin" },
    group: "東京一組",
  }),
  customer({
    id: "scope-mine-2",
    displayName: "Tani Keiei Cert4M Test",
    legalName: "Tani Keiei Cert4M Test",
    furigana: "タニケイエイ",
    activeCases: 1,
    owner: { initials: "LA", name: "Local Admin" },
    group: "東京一組",
  }),
];

describe("BUG-155 customer summary card vs scope=mine list count parity", () => {
  it("counts admin's customers as `mine` when viewer name matches owner name out of catalog", () => {
    expect(deriveCustomerSummaryStats(SAMPLE_CUSTOMERS, ADMIN_VIEWER)).toEqual({
      mine: 2,
      group: 2,
      active: 2,
      noActive: 0,
    });
  });

  it("does not silently match unrelated non-catalog owner names just because both miss the catalog", () => {
    const mixed: CustomerSummary[] = [
      ...SAMPLE_CUSTOMERS,
      customer({
        id: "scope-other",
        displayName: "Other Owner Customer",
        legalName: "Other Owner Customer",
        furigana: "",
        owner: { initials: "RU", name: "Random Outside User" },
        group: "獨立組",
      }),
    ];
    expect(deriveCustomerSummaryStats(mixed, ADMIN_VIEWER)).toEqual({
      mine: 2,
      group: 2,
      active: 2,
      noActive: 1,
    });
  });

  it("still matches catalog-resolvable viewer/customer names by stable id (regression)", () => {
    const fixtureViewer: CustomerViewerContext = {
      ownerName: "山田翔太",
      group: "東京一組",
    };
    const localizedOwnerCustomer = customer({
      id: "catalog-1",
      displayName: "田中太郎",
      legalName: "田中太郎",
      furigana: "タナカタロウ",
      activeCases: 1,
      owner: { initials: "YS", name: "Shota Yamada" }, // English label
      group: "東京一組",
    });
    expect(
      deriveCustomerSummaryStats([localizedOwnerCustomer], fixtureViewer),
    ).toEqual({
      mine: 1,
      group: 1,
      active: 1,
      noActive: 0,
    });
  });

  it("`scope=mine` applyFilters keeps the same admin's customers as the summary `mine` set", () => {
    const filters = useCustomerFilters({
      groupOptions: GROUP_OPTIONS,
      ownerOptions: OWNER_OPTIONS,
    });
    filters.scope.value = "mine";
    const filtered = filters.applyFilters(SAMPLE_CUSTOMERS, ADMIN_VIEWER);
    const stats = deriveCustomerSummaryStats(filtered, ADMIN_VIEWER);
    expect(filtered).toHaveLength(2);
    expect(stats.mine).toBe(filtered.length);
  });
});
