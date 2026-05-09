import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseFormsTab from "./CaseFormsTab.vue";
import type { CaseDetail, FormGenerated } from "../types-detail";

const CARD_STUB = {
  template:
    "<section><header><slot name='header' /></header><slot /><footer><slot name='footer' /></footer></section>",
};

const BUTTON_STUB = {
  template: "<button v-bind='$attrs'><slot /></button>",
  props: ["variant", "tone", "size", "pill", "disabled"],
};

const CHIP_STUB = {
  template: "<span v-bind='$attrs'><slot /></span>",
  props: ["tone", "size"],
};

function makeI18n() {
  return createI18n({
    legacy: false,
    locale: "zh-CN",
    messages: {
      "zh-CN": {
        cases: {
          detail: {
            forms: {
              title: "文书管理",
              generateAction: "生成文书",
              kickerTemplates: "可用模板",
              kickerGenerated: "已生成文书",
              finalizeAction: "定稿",
              exportAction: "导出",
              exportAgainAction: "再次导出",
              versionHistoryAction: "版本历史",
              empty: "暂无可用文书模板或生成记录",
              status: {
                draft: "草稿",
                final: "已定稿",
                exporting: "导出中…",
                exported: "已导出",
                export_failed: "导出失败",
              },
              retryExportAction: "重试导出",
              placeholderBadge: "占位文件 · 待 D2 渲染落地",
              downloadAction: "下载文件",
              metaApprovedAt: "{action}：{name} · {time}",
            },
          },
        },
        shell: { topbar: { comingSoon: "即将推出" } },
      },
    },
  });
}

function buildGeneratedDoc(
  overrides: Partial<FormGenerated> = {},
): FormGenerated {
  return {
    id: "doc-1",
    name: "申請理由書",
    meta: "PDF · 2026-05-01",
    tone: "primary",
    backendStatus: "draft",
    fileUrl: null,
    fileUrlIsPlaceholder: false,
    downloadUrl: null,
    approvedBy: null,
    approvedAt: null,
    ...overrides,
  };
}

function buildDetail(generated: FormGenerated[]): CaseDetail {
  return {
    forms: { templates: [], generated },
  } as unknown as CaseDetail;
}

function mountTab(detail: CaseDetail, readonly = false) {
  return mount(CaseFormsTab, {
    props: { detail, readonly },
    global: {
      plugins: [makeI18n()],
      stubs: { Card: CARD_STUB, Button: BUTTON_STUB, Chip: CHIP_STUB },
    },
  });
}

describe("CaseFormsTab finalize/export button visibility", () => {
  it("draft 状态显示定稿按钮，不显示导出按钮", () => {
    const w = mountTab(
      buildDetail([buildGeneratedDoc({ backendStatus: "draft" })]),
    );
    expect(w.find("[data-testid='finalize-btn']").exists()).toBe(true);
    expect(w.find("[data-testid='export-btn']").exists()).toBe(false);
  });

  it("final 状态显示导出按钮，不显示定稿按钮", () => {
    const w = mountTab(
      buildDetail([buildGeneratedDoc({ backendStatus: "final" })]),
    );
    expect(w.find("[data-testid='finalize-btn']").exists()).toBe(false);
    expect(w.find("[data-testid='export-btn']").exists()).toBe(true);
    expect(w.find("[data-testid='export-btn']").text()).toContain("导出");
    expect(w.find("[data-testid='export-btn']").text()).not.toContain(
      "再次导出",
    );
  });

  it("exported 状态显示再次导出按钮，不显示定稿按钮", () => {
    const w = mountTab(
      buildDetail([buildGeneratedDoc({ backendStatus: "exported" })]),
    );
    expect(w.find("[data-testid='finalize-btn']").exists()).toBe(false);
    expect(w.find("[data-testid='export-btn']").exists()).toBe(true);
    expect(w.find("[data-testid='export-btn']").text()).toContain("再次导出");
  });

  it("readonly 模式下不显示定稿和导出按钮", () => {
    const w = mountTab(
      buildDetail([
        buildGeneratedDoc({ backendStatus: "draft" }),
        buildGeneratedDoc({ id: "doc-2", backendStatus: "final" }),
      ]),
      true,
    );
    expect(w.find("[data-testid='finalize-btn']").exists()).toBe(false);
    expect(w.find("[data-testid='export-btn']").exists()).toBe(false);
  });
});

describe("CaseFormsTab finalize/export event dispatch", () => {
  it("点击定稿按钮 emit finalize 事件并携带 docId", async () => {
    const w = mountTab(
      buildDetail([
        buildGeneratedDoc({ id: "doc-fin-1", backendStatus: "draft" }),
      ]),
    );
    await w.find("[data-testid='finalize-btn']").trigger("click");
    expect(w.emitted("finalize")).toHaveLength(1);
    expect(w.emitted("finalize")![0]).toEqual(["doc-fin-1"]);
  });

  it("点击导出按钮 emit export 事件并携带 docId", async () => {
    const w = mountTab(
      buildDetail([
        buildGeneratedDoc({ id: "doc-exp-1", backendStatus: "final" }),
      ]),
    );
    await w.find("[data-testid='export-btn']").trigger("click");
    expect(w.emitted("export")).toHaveLength(1);
    expect(w.emitted("export")![0]).toEqual(["doc-exp-1"]);
  });

  it("多行各自 emit 正确的 docId", async () => {
    const w = mountTab(
      buildDetail([
        buildGeneratedDoc({ id: "d1", backendStatus: "draft" }),
        buildGeneratedDoc({ id: "d2", backendStatus: "final" }),
        buildGeneratedDoc({ id: "d3", backendStatus: "exported" }),
      ]),
    );
    const finBtns = w.findAll("[data-testid='finalize-btn']");
    const expBtns = w.findAll("[data-testid='export-btn']");

    expect(finBtns).toHaveLength(1);
    expect(expBtns).toHaveLength(2);

    await finBtns[0].trigger("click");
    expect(w.emitted("finalize")![0]).toEqual(["d1"]);

    await expBtns[0].trigger("click");
    expect(w.emitted("export")![0]).toEqual(["d2"]);

    await expBtns[1].trigger("click");
    expect(w.emitted("export")![1]).toEqual(["d3"]);
  });
});

describe("CaseFormsTab download link & exporting/export_failed UI", () => {
  it("exported + downloadUrl 显示下载链接（指向 server 流式接口）", () => {
    const w = mountTab(
      buildDetail([
        buildGeneratedDoc({
          backendStatus: "exported",
          tone: "primary",
          fileUrl: "generated-documents/org-001/doc-1/v1.docx",
          downloadUrl: "/api/generated-documents/doc-1/file",
        }),
      ]),
    );
    expect(w.find("[data-testid='download-link']").exists()).toBe(true);
    const link = w.find("[data-testid='download-link']");
    expect(link.attributes("href")).toBe("/api/generated-documents/doc-1/file");
    expect(link.attributes("download")).toBeDefined();
  });

  it("exported + null downloadUrl 不显示下载链接", () => {
    const w = mountTab(
      buildDetail([
        buildGeneratedDoc({
          backendStatus: "exported",
          tone: "primary",
          fileUrl: null,
          downloadUrl: null,
        }),
      ]),
    );
    expect(w.find("[data-testid='download-link']").exists()).toBe(false);
  });

  it("fileUrl='placeholder://...' 时不渲染下载链接，显示占位徽章", () => {
    const w = mountTab(
      buildDetail([
        buildGeneratedDoc({
          backendStatus: "exported",
          tone: "primary",
          fileUrl: "placeholder://gen-doc-001/output.pdf",
          fileUrlIsPlaceholder: true,
          downloadUrl: null,
        }),
      ]),
    );
    expect(w.find("[data-testid='download-link']").exists()).toBe(false);
    expect(w.find("[data-testid='placeholder-badge']").exists()).toBe(true);
    expect(w.find("[data-testid='placeholder-badge']").text()).toContain(
      "占位文件",
    );
  });

  it("正常 fileUrl 不显示占位徽章", () => {
    const w = mountTab(
      buildDetail([
        buildGeneratedDoc({
          backendStatus: "exported",
          tone: "primary",
          fileUrl: "generated-documents/org-001/doc-1/v1.docx",
          fileUrlIsPlaceholder: false,
          downloadUrl: "/api/generated-documents/doc-1/file",
        }),
      ]),
    );
    expect(w.find("[data-testid='placeholder-badge']").exists()).toBe(false);
    expect(w.find("[data-testid='download-link']").exists()).toBe(true);
  });

  it("exporting 状态显示导出中指示器", () => {
    const w = mountTab(
      buildDetail([
        buildGeneratedDoc({
          backendStatus: "exporting",
          tone: "warning",
        }),
      ]),
    );
    expect(w.find("[data-testid='exporting-indicator']").exists()).toBe(true);
    expect(w.find("[data-testid='export-btn']").exists()).toBe(false);
  });

  it("export_failed 状态显示重试按钮", () => {
    const w = mountTab(
      buildDetail([
        buildGeneratedDoc({
          backendStatus: "export_failed",
          tone: "danger",
        }),
      ]),
    );
    expect(w.find("[data-testid='retry-export-btn']").exists()).toBe(true);
    expect(w.find("[data-testid='export-btn']").exists()).toBe(false);
  });
});

describe("CaseFormsTab approval meta refresh", () => {
  it("approvedBy + approvedAt 时 meta 行显示审批信息", () => {
    const w = mountTab(
      buildDetail([
        buildGeneratedDoc({
          backendStatus: "final",
          tone: "success",
          approvedBy: "鈴木花子",
          approvedAt: "2026/04/15 14:30",
        }),
      ]),
    );
    const meta = w.find(".forms-tab__meta");
    expect(meta.text()).toContain("鈴木花子");
    expect(meta.text()).toContain("2026/04/15 14:30");
  });

  it("approvedBy/approvedAt 为 null 时不显示审批信息后缀", () => {
    const w = mountTab(
      buildDetail([
        buildGeneratedDoc({
          backendStatus: "draft",
          approvedBy: null,
          approvedAt: null,
        }),
      ]),
    );
    const metaText = w.find(".forms-tab__meta").text();
    expect(metaText).toBe("PDF · 2026-05-01");
  });
});
