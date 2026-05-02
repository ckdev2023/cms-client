import { describe, expect, it, afterEach, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n, setAppLocale, type AppLocale } from "../../../i18n";
import BillingCollectionDrawer from "./BillingCollectionDrawer.vue";
import type { CollectionResult } from "../types";

const originalLocale = i18n.global.locale.value as AppLocale;

function mountDrawer(result: CollectionResult | null) {
  return mount(BillingCollectionDrawer, {
    props: { open: true, result },
    global: { plugins: [i18n] },
    attachTo: document.body,
  });
}

function querySection(section: "success" | "skipped" | "failed"): Element[] {
  return Array.from(
    document.body.querySelectorAll(`[data-section="${section}"] li`),
  );
}

describe("BillingCollectionDrawer — caseNo fallback & key uniqueness", () => {
  beforeEach(() => {
    setAppLocale("zh-CN");
  });

  afterEach(() => {
    setAppLocale(originalLocale);
    document.body.innerHTML = "";
  });

  it("renders 'unknownCase' fallback when caseNo is null", () => {
    const result: CollectionResult = {
      success: 0,
      skipped: 1,
      failed: 0,
      details: [{ caseNo: null, result: "skipped", reason: "case-not-found" }],
    };
    mountDrawer(result);
    const items = querySection("skipped");
    expect(items).toHaveLength(1);
    expect(items[0].textContent).toContain("案件信息缺失");
    expect(items[0].textContent).toContain("案件不存在或已删除");
  });

  it("renders multiple skipped rows with null caseNo without v-for key collision (BUG-fix)", () => {
    const result: CollectionResult = {
      success: 0,
      skipped: 3,
      failed: 0,
      details: [
        { caseNo: null, result: "skipped", reason: "case-not-found" },
        { caseNo: null, result: "skipped", reason: "no-permission" },
        { caseNo: null, result: "skipped", reason: "case-not-found" },
      ],
    };
    mountDrawer(result);
    const items = querySection("skipped");
    expect(items).toHaveLength(3);
    expect(items[0].textContent).toContain("案件不存在或已删除");
    expect(items[1].textContent).toContain("无权限编辑该案件");
    expect(items[2].textContent).toContain("案件不存在或已删除");
  });

  it("preserves caseNo when present (positive path: success row)", () => {
    const result: CollectionResult = {
      success: 1,
      skipped: 0,
      failed: 0,
      details: [
        { caseNo: "CASE-202604-0015", result: "success", taskId: "task-x" },
      ],
    };
    mountDrawer(result);
    const items = querySection("success");
    expect(items).toHaveLength(1);
    expect(items[0].textContent).toContain("CASE-202604-0015");
    expect(items[0].textContent).toContain("task-x");
  });

  it("renders failed rows with null caseNo using fallback", () => {
    const result: CollectionResult = {
      success: 0,
      skipped: 0,
      failed: 2,
      details: [
        { caseNo: null, result: "failed", reason: "system-error" },
        { caseNo: "CAS-X", result: "failed", reason: "system-error" },
      ],
    };
    mountDrawer(result);
    const items = querySection("failed");
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain("案件信息缺失");
    expect(items[1].textContent).toContain("CAS-X");
  });
});
