import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n, setAppLocale, type AppLocale } from "../../../i18n";
import { formatDateTime } from "../../../shared/model/formatDateTime";
import StorageRootPanel from "./StorageRootPanel.vue";
import type { OrgSettings } from "../types";

const ISO_TIMESTAMP = "2026-03-20T14:30:00.000Z";

const storageRoot: OrgSettings["storageRoot"] = {
  rootLabel: "案件資料総盤",
  rootPath: "\\\\fileserver\\gyosei-docs",
  updatedBy: "Admin",
  updatedAt: ISO_TIMESTAMP,
};

const originalLocale = i18n.global.locale.value as AppLocale;

function mountPanel(overrides?: Partial<OrgSettings["storageRoot"]>) {
  return mount(StorageRootPanel, {
    props: {
      storageRoot: { ...storageRoot, ...overrides },
      isConfigured: true,
      preview: "\\\\fileserver\\gyosei-docs\\CASE-001",
    },
    global: { plugins: [i18n] },
  });
}

function readUpdatedAtCell(wrapper: ReturnType<typeof mount>): string {
  const metaItems = wrapper.findAll(".storage-panel__meta-item");
  const updatedAtItem = metaItems.at(-1);
  const dd = updatedAtItem?.find(".storage-panel__meta-value");
  return dd?.text() ?? "";
}

describe("StorageRootPanel — R32-K updatedAt formatting", () => {
  beforeEach(() => {
    setAppLocale("zh-CN");
  });

  afterEach(() => {
    setAppLocale(originalLocale);
  });

  it("renders zh-CN formatted date instead of raw ISO", () => {
    const wrapper = mountPanel();
    const text = readUpdatedAtCell(wrapper);

    const expected = formatDateTime(ISO_TIMESTAMP, "zh-CN");
    expect(expected).not.toBe("");
    expect(text).toBe(expected);
    expect(text).not.toContain("T14:30:00");
  });

  it("renders en-US formatted date after locale switch", async () => {
    setAppLocale("en-US");
    const wrapper = mountPanel();
    await wrapper.vm.$nextTick();

    const text = readUpdatedAtCell(wrapper);
    const expected = formatDateTime(ISO_TIMESTAMP, "en-US");
    expect(expected).not.toBe("");
    expect(text).toBe(expected);
    expect(text).not.toContain("T14:30:00");
  });

  it("renders ja-JP formatted date after locale switch", async () => {
    setAppLocale("ja-JP");
    const wrapper = mountPanel();
    await wrapper.vm.$nextTick();

    const text = readUpdatedAtCell(wrapper);
    const expected = formatDateTime(ISO_TIMESTAMP, "ja-JP");
    expect(expected).not.toBe("");
    expect(text).toBe(expected);
    expect(text).not.toContain("T14:30:00");
  });

  it("does not render raw ISO string in any locale", async () => {
    const wrapper = mountPanel();

    for (const loc of ["zh-CN", "en-US", "ja-JP"] as AppLocale[]) {
      setAppLocale(loc);
      await wrapper.vm.$nextTick();
      const text = readUpdatedAtCell(wrapper);
      expect(text).not.toContain("2026-03-20T14:30:00");
      expect(text).not.toBe(ISO_TIMESTAMP);
    }
  });

  it("hides updatedAt row when value is null", () => {
    const wrapper = mountPanel({ updatedAt: null });
    const metaItems = wrapper.findAll(".storage-panel__meta-item");
    expect(metaItems).toHaveLength(1);
  });
});
