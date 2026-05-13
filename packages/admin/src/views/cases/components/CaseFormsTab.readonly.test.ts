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
              registerAction: "登记文书",
              generateAction: "登记文书",
              kickerTemplates: "可用模板",
              kickerGenerated: "已登记文书",
              finalizeAction: "确认已就绪",
              openLinkAction: "打开链接",
              copyLinkAction: "复制链接",
              versionHistoryAction: "版本历史",
              empty: "暂无可用文书模板或登记记录",
              templatesLoading: "正在加载文书模板…",
              status: {
                draft: "草稿",
                final: "已确认",
                exporting: "导出中…",
                exported: "已导出",
                export_failed: "导出失败",
              },
              docType: {
                application_form: "申请书",
              },
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
    meta: "application_form · ja · v1",
    actionLabel: "選択して生成",
    docTypeKey: "cases.detail.forms.docType.application_form",
    docTypeRaw: "application_form",
    language: "ja",
    versionNo: 1,
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
    fileUrlIsPlaceholder: false,
    downloadUrl: null,
    resourceOpenUrl: null,
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

function mountTab(
  detail: CaseDetail,
  readonly: boolean,
  opts?: { templatesLoading?: boolean },
) {
  return mount(CaseFormsTab, {
    props: { detail, readonly, ...opts },
    global: {
      plugins: [makeI18n()],
      stubs: { Card: CARD_STUB, Button: BUTTON_STUB, Chip: CHIP_STUB },
    },
  });
}

describe("CaseFormsTab S9 readonly — write actions hidden", () => {
  it("readonly=true: header register button is not rendered", () => {
    const detail = buildDetail(
      [buildTemplate()],
      [buildGeneratedDoc({ backendStatus: "draft" })],
    );
    const w = mountTab(detail, true);

    const buttons = w.findAll("button");
    const genBtn = buttons.find((b) => b.text().includes("登记文书"));
    expect(genBtn).toBeUndefined();
  });

  it("readonly=true: template section is not rendered at all", () => {
    const detail = buildDetail(
      [buildTemplate(), buildTemplate({ id: "tpl-2", name: "雇用理由書" })],
      [buildGeneratedDoc({ backendStatus: "draft" })],
    );
    const w = mountTab(detail, true);

    const kickers = w.findAll(".forms-tab__kicker").map((el) => el.text());
    expect(kickers).not.toContain("可用模板");
  });

  it("readonly=true: finalize button is not rendered for draft docs", () => {
    const detail = buildDetail(
      [],
      [buildGeneratedDoc({ backendStatus: "draft" })],
    );
    const w = mountTab(detail, true);
    expect(w.find("[data-testid='finalize-btn']").exists()).toBe(false);
  });

  it("readonly=true: open-resource-link is still visible for final + 外链 docs", () => {
    const detail = buildDetail(
      [],
      [
        buildGeneratedDoc({
          backendStatus: "final",
          resourceOpenUrl: "https://example.com/doc.pdf",
        }),
      ],
    );
    const w = mountTab(detail, true);
    expect(w.find("[data-testid='open-resource-link']").exists()).toBe(true);
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

    const allButtons = w.findAll("button");
    const genBtn = allButtons.find((b) => b.text().includes("登记文书"));
    expect(genBtn).toBeUndefined();
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
          fileUrl: "generated-documents/org-001/doc-1/v1.docx",
          downloadUrl: "/api/generated-documents/doc-1/file",
        }),
      ],
    );
    const w = mountTab(detail, true);

    const link = w.find("[data-testid='download-link']");
    expect(link.exists()).toBe(true);
    expect(link.attributes("href")).toBe("/api/generated-documents/doc-1/file");
  });

  it("readonly=true: only templates, no generated → empty state shown", () => {
    const detail = buildDetail(
      [
        buildTemplate({ name: "申請理由書テンプレート" }),
        buildTemplate({ id: "tpl-2", name: "雇用理由書テンプレート" }),
      ],
      [],
    );
    const w = mountTab(detail, true);

    expect(w.find(".forms-tab__empty").exists()).toBe(true);
    expect(w.findAll(".forms-tab__name").length).toBe(0);
  });
});

describe("CaseFormsTab templates loading", () => {
  it("templatesLoading=true and empty forms → loading region (not empty state)", () => {
    const detail = buildDetail([], []);
    const w = mountTab(detail, false, { templatesLoading: true });

    const el = w.find('[data-testid="forms-templates-loading"]');
    expect(el.exists()).toBe(true);
    expect(el.attributes("role")).toBe("status");
    expect(el.text()).toContain("加载文书模板");
    expect(
      w.find(".forms-tab__empty:not(.forms-tab__empty--loading)").exists(),
    ).toBe(false);
  });

  it("templatesLoading=true but generated docs exist → main content (not loading)", () => {
    const detail = buildDetail(
      [],
      [buildGeneratedDoc({ backendStatus: "draft" })],
    );
    const w = mountTab(detail, false, { templatesLoading: true });

    expect(w.find('[data-testid="forms-templates-loading"]').exists()).toBe(
      false,
    );
    expect(w.find(".forms-tab__empty").exists()).toBe(false);
    expect(w.findAll(".forms-tab__name").length).toBeGreaterThan(0);
  });

  it("templatesLoading=true readonly and empty → empty state (not loading)", () => {
    const detail = buildDetail([], []);
    const w = mountTab(detail, true, { templatesLoading: true });

    expect(w.find('[data-testid="forms-templates-loading"]').exists()).toBe(
      false,
    );
    expect(w.find(".forms-tab__empty").exists()).toBe(true);
  });
});

describe("CaseFormsTab R40-B — lazy docType translation via t()", () => {
  it("template meta renders translated docType when docTypeKey resolves", () => {
    const detail = buildDetail(
      [
        buildTemplate({
          docTypeKey: "cases.detail.forms.docType.application_form",
          docTypeRaw: "application_form",
          language: "ja",
          versionNo: 1,
        }),
      ],
      [buildGeneratedDoc()],
    );
    const w = mountTab(detail, false);

    const meta = w.find(".forms-tab__meta");
    expect(meta.text()).toContain("申请书");
    expect(meta.text()).toContain("ja");
    expect(meta.text()).toContain("v1");
  });

  it("template meta falls back to raw key when docTypeKey is unresolved", () => {
    const detail = buildDetail(
      [
        buildTemplate({
          docTypeKey: "cases.detail.forms.docType.unknown_type",
          docTypeRaw: "unknown_type",
          language: "en",
          versionNo: undefined,
        }),
      ],
      [buildGeneratedDoc()],
    );
    const w = mountTab(detail, false);

    const meta = w.find(".forms-tab__meta");
    expect(meta.text()).toContain("cases.detail.forms.docType.unknown_type");
    expect(meta.text()).toContain("en");
    expect(meta.text()).not.toContain("v");
  });

  it("template meta shows only docTypeRaw when docTypeKey is absent", () => {
    const detail = buildDetail(
      [
        buildTemplate({
          docTypeKey: undefined,
          docTypeRaw: "raw_doc_type",
          language: undefined,
          versionNo: undefined,
        }),
      ],
      [buildGeneratedDoc()],
    );
    const w = mountTab(detail, false);

    const meta = w.find(".forms-tab__meta");
    expect(meta.text()).toContain("raw_doc_type");
  });

  it("template meta is empty when all structured fields are absent", () => {
    const detail = buildDetail(
      [
        buildTemplate({
          docTypeKey: undefined,
          docTypeRaw: undefined,
          language: undefined,
          versionNo: undefined,
        }),
      ],
      [buildGeneratedDoc()],
    );
    const w = mountTab(detail, false);

    const meta = w.find(".forms-tab__meta");
    expect(meta.text().trim()).toBe("");
  });
});
