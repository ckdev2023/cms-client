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
                exported: "已导出",
              },
              placeholderBadge: "占位 URL · P1 落地",
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
    isPlaceholderFile: false,
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

describe("CaseFormsTab placeholder badge & download link", () => {
  it("exported + placeholder fileUrl 显示占位徽标", () => {
    const w = mountTab(
      buildDetail([
        buildGeneratedDoc({
          backendStatus: "exported",
          tone: "primary",
          fileUrl: "placeholder://gd-01",
          isPlaceholderFile: true,
        }),
      ]),
    );
    expect(w.find("[data-testid='placeholder-badge']").exists()).toBe(true);
    expect(w.find("[data-testid='download-link']").exists()).toBe(false);
  });

  it("exported + 真实 fileUrl 显示下载链接", () => {
    const w = mountTab(
      buildDetail([
        buildGeneratedDoc({
          backendStatus: "exported",
          tone: "primary",
          fileUrl: "https://cdn.example.com/doc.pdf",
          isPlaceholderFile: false,
        }),
      ]),
    );
    expect(w.find("[data-testid='download-link']").exists()).toBe(true);
    const link = w.find("[data-testid='download-link']");
    expect(link.attributes("href")).toBe("https://cdn.example.com/doc.pdf");
    expect(link.attributes("download")).toBeDefined();
    expect(w.find("[data-testid='placeholder-badge']").exists()).toBe(false);
  });

  it("exported + null fileUrl 不显示下载链接和占位徽标", () => {
    const w = mountTab(
      buildDetail([
        buildGeneratedDoc({
          backendStatus: "exported",
          tone: "primary",
          fileUrl: null,
          isPlaceholderFile: false,
        }),
      ]),
    );
    expect(w.find("[data-testid='download-link']").exists()).toBe(false);
    expect(w.find("[data-testid='placeholder-badge']").exists()).toBe(false);
  });

  it("draft 状态不显示下载链接和占位徽标", () => {
    const w = mountTab(
      buildDetail([
        buildGeneratedDoc({
          backendStatus: "draft",
          fileUrl: "placeholder://gd-01",
          isPlaceholderFile: true,
        }),
      ]),
    );
    expect(w.find("[data-testid='download-link']").exists()).toBe(false);
    expect(w.find("[data-testid='placeholder-badge']").exists()).toBe(false);
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
