import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { computed, defineComponent, h, type PropType } from "vue";
import { i18n, setAppLocale, type AppLocale } from "../../../i18n";
import { getActiveGroupOptions } from "../../../shared/model/useGroupOptions";
import BillingFilters from "./BillingFilters.vue";
import type { BillingSegment, SelectOption, StatusOption } from "../types";

/**
 * BUG-134 [P1][FE/i18n]：`BillingListView` 收费列表「所属 Group」过滤下拉
 * 在 zh-CN / en-US 下仍显示日文 `東京一組 / 東京二組`。
 *
 * 根因：`packages/admin/src/views/billing/fixtures.ts` 的
 * `export const GROUP_OPTIONS = getActiveGroupOptions();` 在模块加载期
 * 调用，无 locale 参数 → `normalizeGroupLocale(undefined)` 回退到
 * `ja-JP`，于是固化日文标签；`BillingListView.vue` 把该常量直接传给
 * `BillingFilters` 的 `:group-options`，切换语言后不重算。
 *
 * 修复：在 `BillingListView.vue` 用
 * `computed(() => getActiveGroupOptions(locale.value))` 取代模块顶层
 * 常量；本测试以同样的 wiring 渲染 `BillingFilters`，锁定下拉文案随
 * locale 切换的契约，避免再回退到模块顶层 const。
 */

const STATUS_OPTIONS: StatusOption[] = [
  { value: "paid", label: "billing.list.status.paid", badge: "tag-green" },
  { value: "partial", label: "billing.list.status.partial", badge: "tag-blue" },
  { value: "due", label: "billing.list.status.due", badge: "tag-orange" },
  { value: "overdue", label: "billing.list.status.overdue", badge: "tag-red" },
];

const OWNER_OPTIONS: SelectOption[] = [{ value: "admin", label: "Admin" }];

const SEGMENTS: { id: BillingSegment; labelKey: string }[] = [
  { id: "billing-list", labelKey: "billing.list.segments.billingList" },
  { id: "payment-log", labelKey: "billing.list.segments.paymentLog" },
];

const HostComponent = defineComponent({
  name: "BillingFiltersBug134Host",
  props: {
    groupOptions: {
      type: Array as PropType<SelectOption[]>,
      required: true,
    },
  },
  setup(props) {
    return () =>
      h(BillingFilters, {
        activeSegment: "billing-list" as BillingSegment,
        search: "",
        statusFilter: "",
        groupFilter: "",
        ownerFilter: "",
        segments: SEGMENTS,
        statusOptions: STATUS_OPTIONS,
        groupOptions: props.groupOptions,
        ownerOptions: OWNER_OPTIONS,
        filteredCount: 0,
        isFilterActive: false,
      });
  },
});

const originalLocale = i18n.global.locale.value as AppLocale;

function readGroupOptionLabels(wrapper: ReturnType<typeof mount>): string[] {
  const selects = wrapper.findAll("select.billing-filters__select");
  expect(selects.length).toBeGreaterThanOrEqual(2);
  const groupSelect = selects[1];
  return groupSelect
    .findAll("option")
    .slice(1)
    .map((o) => o.text().trim());
}

function mountWithLocaleAwareOptions() {
  const wireLocale = computed(() =>
    getActiveGroupOptions(i18n.global.locale.value),
  );
  return mount(HostComponent, {
    props: { groupOptions: wireLocale.value },
    global: { plugins: [i18n] },
  });
}

describe("BillingFilters — BUG-134 group dropdown localization", () => {
  beforeEach(() => {
    setAppLocale("zh-CN");
  });

  afterEach(() => {
    setAppLocale(originalLocale);
  });

  it("renders zh-CN labels when wired with locale-aware computed", async () => {
    const wireLocale = computed(() =>
      getActiveGroupOptions(i18n.global.locale.value),
    );
    const wrapper = mount(HostComponent, {
      props: { groupOptions: wireLocale.value },
      global: { plugins: [i18n] },
    });
    expect(readGroupOptionLabels(wrapper)).toEqual(["东京一组", "东京二组"]);
  });

  it("renders en-US labels when locale switches before wiring", () => {
    setAppLocale("en-US");
    const wrapper = mountWithLocaleAwareOptions();
    expect(readGroupOptionLabels(wrapper)).toEqual([
      "Tokyo Team 1",
      "Tokyo Team 2",
    ]);
  });

  it("renders ja-JP labels when locale switches before wiring", () => {
    setAppLocale("ja-JP");
    const wrapper = mountWithLocaleAwareOptions();
    expect(readGroupOptionLabels(wrapper)).toEqual(["東京一組", "東京二組"]);
  });

  it("re-renders dropdown labels after parent recomputes options on locale change", async () => {
    const wrapper = mount(HostComponent, {
      props: { groupOptions: getActiveGroupOptions("zh-CN") },
      global: { plugins: [i18n] },
    });
    expect(readGroupOptionLabels(wrapper)).toEqual(["东京一组", "东京二组"]);

    setAppLocale("en-US");
    await wrapper.setProps({ groupOptions: getActiveGroupOptions("en-US") });
    expect(readGroupOptionLabels(wrapper)).toEqual([
      "Tokyo Team 1",
      "Tokyo Team 2",
    ]);

    setAppLocale("ja-JP");
    await wrapper.setProps({ groupOptions: getActiveGroupOptions("ja-JP") });
    expect(readGroupOptionLabels(wrapper)).toEqual(["東京一組", "東京二組"]);
  });

  it("regression guard: dropdown must not show ja-JP labels under zh-CN/en-US wiring", () => {
    setAppLocale("zh-CN");
    const wrapperZh = mountWithLocaleAwareOptions();
    expect(readGroupOptionLabels(wrapperZh)).not.toContain("東京一組");
    expect(readGroupOptionLabels(wrapperZh)).not.toContain("東京二組");

    setAppLocale("en-US");
    const wrapperEn = mountWithLocaleAwareOptions();
    expect(readGroupOptionLabels(wrapperEn)).not.toContain("東京一組");
    expect(readGroupOptionLabels(wrapperEn)).not.toContain("東京二組");
  });

  it("respects locale-aware groupAll placeholder text", () => {
    setAppLocale("en-US");
    const wrapperEn = mountWithLocaleAwareOptions();
    const groupSelect = wrapperEn.findAll("select.billing-filters__select")[1];
    const allOption = groupSelect.findAll("option")[0];
    expect(allOption.text()).toBe("All groups");

    setAppLocale("zh-CN");
    const wrapperZh = mountWithLocaleAwareOptions();
    const zhAllOption = wrapperZh
      .findAll("select.billing-filters__select")[1]
      .findAll("option")[0];
    expect(zhAllOption.text()).toBe("所有分组");
  });
});
