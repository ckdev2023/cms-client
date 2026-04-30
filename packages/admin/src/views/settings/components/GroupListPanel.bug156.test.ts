/**
 * BUG-156 [P3][FE] Settings → Group 管理表格 `创建时间` 列显示 raw ISO
 * `2026-04-27T11:40:49.675Z` 回归契约。
 *
 * 走查现象：admin Settings → Group 管理面板第三列直显
 * `2026-04-27T11:40:49.675Z`，未做 locale 化格式化。
 *
 * 修复方向（来自 R12 §1）：`GroupListPanel.vue` 由 `{{ group.createdAt }}`
 * 改为 `{{ fmtCreatedAt(group.createdAt) }}`，调用 `formatDateTime` 并按当前
 * locale 输出。
 */
import { beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import GroupListPanel from "./GroupListPanel.vue";
import type { GroupSummary } from "../types";
import { i18n, setAppLocale } from "../../../i18n";
import { formatDateTime } from "../../../shared/model/formatDateTime";

const ISO_TIMESTAMP = "2026-04-27T11:40:49.675Z";

const SAMPLE_GROUPS: GroupSummary[] = [
  {
    id: "g-1",
    name: "東京一組",
    status: "active",
    createdAt: ISO_TIMESTAMP,
    activeCaseCount: 3,
    memberCount: 4,
  },
  {
    id: "g-2",
    name: "東京二組",
    status: "active",
    createdAt: "",
    activeCaseCount: 0,
    memberCount: 1,
  },
];

function mountPanel() {
  return mount(GroupListPanel, {
    props: {
      groups: SAMPLE_GROUPS,
      filteredGroups: SAMPLE_GROUPS,
      statusFilter: "" as const,
      selectedGroupId: null,
      isEmpty: false,
    },
    global: {
      plugins: [i18n],
    },
  });
}

describe("GroupListPanel BUG-156 createdAt formatting", () => {
  beforeEach(() => {
    setAppLocale("zh-CN");
  });

  it("does NOT render the raw ISO timestamp string", () => {
    const wrapper = mountPanel();

    expect(wrapper.text()).not.toContain(ISO_TIMESTAMP);
    expect(wrapper.text()).not.toContain("2026-04-27T11:40:49");
  });

  it("renders createdAt formatted via formatDateTime with current locale (zh-CN)", () => {
    setAppLocale("zh-CN");
    const wrapper = mountPanel();

    const expected = formatDateTime(ISO_TIMESTAMP, "zh-CN");
    expect(expected).not.toBe("");
    expect(wrapper.text()).toContain(expected);
  });

  it("respects locale switch (en-US output differs from raw ISO)", () => {
    setAppLocale("en-US");
    const wrapper = mountPanel();

    const expected = formatDateTime(ISO_TIMESTAMP, "en-US");
    expect(expected).not.toBe("");
    expect(expected).not.toContain("T11:40:49");
    expect(wrapper.text()).toContain(expected);
  });

  it("renders ja-JP locale formatted output", () => {
    setAppLocale("ja-JP");
    const wrapper = mountPanel();

    const expected = formatDateTime(ISO_TIMESTAMP, "ja-JP");
    expect(expected).not.toBe("");
    expect(wrapper.text()).toContain(expected);
  });

  it("falls back to em-dash placeholder when createdAt is empty", () => {
    const wrapper = mountPanel();
    const rows = wrapper.findAll("tbody tr");

    expect(rows).toHaveLength(2);
    expect(rows[1]!.text()).toContain("—");
  });
});
