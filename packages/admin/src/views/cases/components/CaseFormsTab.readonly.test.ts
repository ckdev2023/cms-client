import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseFormsTab from "./CaseFormsTab.vue";
import type { CaseDetail, FormGenerated, FormTemplate } from "../types-detail";

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

function buildTemplate(overrides: Partial<FormTemplate> = {}): FormTemplate {
  return {
    id: "tpl-1",
    name: "申請理由書テンプレート",
    meta: "PDF · 理由書",
    actionLabel: "選択して生成",
    ...overrides,
  };
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

function buildDetail(
  templates: FormTemplate[],
  generated: FormGenerated[],
): CaseDetail {
  return {
    forms: { templates, generated },
  } as unknown as CaseDetail;
}

function mountTab(detail: CaseDetail, readonly: boolean) {
  return mount(CaseFormsTab, {
    props: { detail, readonly },
    global: {
      plugins: [makeI18n()],
      stubs: { Card: CARD_STUB, Button: BUTTON_STUB, Chip: CHIP_STUB },
    },
  });
}

describe("CaseFormsTab S9 readonly — write actions hidden", () => {
  it("readonly=true: header generate button is not rendered", () => {
    const detail = buildDetail(
      [buildTemplate()],
      [buildGeneratedDoc({ backendStatus: "draft" })],
    );
    const w = mountTab(detail, true);

    const buttons = w.findAll("button");
    const genBtn = buttons.find((b) => b.text().includes("生成文书"));
    expect(genBtn).toBeUndefined();
  });

  it("readonly=true: template row generate button is not rendered", () => {
    const detail = buildDetail(
      [buildTemplate(), buildTemplate({ id: "tpl-2", name: "雇用理由書" })],
      [],
    );
    const w = mountTab(detail, true);

    const templateSection = w.findAll(".forms-tab__row");
    for (const row of templateSection) {
      const btn = row
        .findAll("button")
        .find((b) => b.text().includes("選択して生成"));
      expect(btn).toBeUndefined();
    }
  });

  it("readonly=true: finalize button is not rendered for draft docs", () => {
    const detail = buildDetail(
      [],
      [buildGeneratedDoc({ backendStatus: "draft" })],
    );
    const w = mountTab(detail, true);
    expect(w.find("[data-testid='finalize-btn']").exists()).toBe(false);
  });

  it("readonly=true: export button is not rendered for final docs", () => {
    const detail = buildDetail(
      [],
      [buildGeneratedDoc({ backendStatus: "final" })],
    );
    const w = mountTab(detail, true);
    expect(w.find("[data-testid='export-btn']").exists()).toBe(false);
  });

  it("readonly=true: re-export button is not rendered for exported docs", () => {
    const detail = buildDetail(
      [],
      [buildGeneratedDoc({ backendStatus: "exported" })],
    );
    const w = mountTab(detail, true);
    expect(w.find("[data-testid='export-btn']").exists()).toBe(false);
  });

  it("readonly=true: all write buttons hidden across mixed statuses", () => {
    const detail = buildDetail(
      [buildTemplate()],
      [
        buildGeneratedDoc({ id: "d1", backendStatus: "draft" }),
        buildGeneratedDoc({ id: "d2", backendStatus: "final" }),
        buildGeneratedDoc({ id: "d3", backendStatus: "exported" }),
      ],
    );
    const w = mountTab(detail, true);

    expect(w.find("[data-testid='finalize-btn']").exists()).toBe(false);
    expect(w.find("[data-testid='export-btn']").exists()).toBe(false);

    const allButtons = w.findAll("button");
    const genBtn = allButtons.find((b) => b.text().includes("生成文书"));
    expect(genBtn).toBeUndefined();

    const tplActionBtn = allButtons.find((b) =>
      b.text().includes("選択して生成"),
    );
    expect(tplActionBtn).toBeUndefined();
  });

  it("readonly=true: no open-generate-modal / finalize / export events emittable", () => {
    const detail = buildDetail(
      [buildTemplate()],
      [
        buildGeneratedDoc({ id: "d1", backendStatus: "draft" }),
        buildGeneratedDoc({ id: "d2", backendStatus: "final" }),
      ],
    );
    const w = mountTab(detail, true);

    expect(w.emitted("open-generate-modal")).toBeUndefined();
    expect(w.emitted("finalize")).toBeUndefined();
    expect(w.emitted("export")).toBeUndefined();
  });
});

describe("CaseFormsTab S9 readonly — read-only content still visible", () => {
  it("readonly=true: generated doc names and status chips are rendered", () => {
    const detail = buildDetail(
      [],
      [
        buildGeneratedDoc({
          id: "d1",
          name: "申請理由書",
          backendStatus: "final",
          tone: "success",
        }),
        buildGeneratedDoc({
          id: "d2",
          name: "雇用理由書",
          backendStatus: "exported",
          tone: "primary",
        }),
      ],
    );
    const w = mountTab(detail, true);

    const names = w.findAll(".forms-tab__name");
    expect(names.length).toBeGreaterThanOrEqual(2);
    expect(names.map((n) => n.text())).toContain("申請理由書");
    expect(names.map((n) => n.text())).toContain("雇用理由書");
  });

  it("readonly=true: download link is still visible for exported real-URL docs", () => {
    const detail = buildDetail(
      [],
      [
        buildGeneratedDoc({
          backendStatus: "exported",
          fileUrl: "https://cdn.example.com/doc.pdf",
          isPlaceholderFile: false,
        }),
      ],
    );
    const w = mountTab(detail, true);

    const link = w.find("[data-testid='download-link']");
    expect(link.exists()).toBe(true);
    expect(link.attributes("href")).toBe("https://cdn.example.com/doc.pdf");
  });

  it("readonly=true: template names are still listed", () => {
    const detail = buildDetail(
      [
        buildTemplate({ name: "申請理由書テンプレート" }),
        buildTemplate({ id: "tpl-2", name: "雇用理由書テンプレート" }),
      ],
      [],
    );
    const w = mountTab(detail, true);

    const names = w.findAll(".forms-tab__name");
    expect(names.map((n) => n.text())).toContain("申請理由書テンプレート");
    expect(names.map((n) => n.text())).toContain("雇用理由書テンプレート");
  });
});
