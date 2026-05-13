import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseFormsTab from "./CaseFormsTab.vue";
import { canFinalizeDraftGeneratedDoc } from "./CaseFormsTab.helpers";
import type { CaseDetail, FormGenerated } from "../types-detail";

const CARD_STUB = {
  template:
    "<section><header><slot name='header' /></header><slot /><footer><slot name='footer' /></footer></section>",
};

const BUTTON_STUB = {
  template: "<button v-bind='$attrs' :disabled='disabled'><slot /></button>",
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
              finalizeRequiresExternalUrlHint:
                "请先在登记表单中填写有效的文书外部链接（https:// 或 http://），再确认已就绪。",
              submissionGateHint: "hint",
              deleteDraftAction: "删除草稿",
              deleteDraftConfirm: "确认删除？",
              openLinkAction: "打开链接",
              copyLinkAction: "复制链接",
              versionHistoryAction: "版本历史",
              empty: "暂无可用文书模板或登记记录",
              status: {
                draft: "草稿",
                final: "已确认",
                exporting: "导出中…",
                exported: "已导出",
                export_failed: "导出失败",
              },
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
    resourceOpenUrl: null,
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

describe("CaseFormsTab finalize button visibility", () => {
  it("draft 状态显示「确认已就绪」按钮；无外链时禁用", () => {
    const w = mountTab(
      buildDetail([buildGeneratedDoc({ backendStatus: "draft" })]),
    );
    const btn = w.find("[data-testid='finalize-btn']");
    expect(btn.exists()).toBe(true);
    expect(btn.attributes("disabled")).toBeDefined();
  });

  it("draft + 有效 https 外链时「确认已就绪」按钮可点", () => {
    const w = mountTab(
      buildDetail([
        buildGeneratedDoc({
          backendStatus: "draft",
          fileUrl: "https://drive.example.com/doc",
        }),
      ]),
    );
    const btn = w.find("[data-testid='finalize-btn']");
    expect(btn.exists()).toBe(true);
    expect(btn.attributes("disabled")).toBeUndefined();
  });

  it("final 状态不显示「确认已就绪」按钮", () => {
    const w = mountTab(
      buildDetail([buildGeneratedDoc({ backendStatus: "final" })]),
    );
    expect(w.find("[data-testid='finalize-btn']").exists()).toBe(false);
  });

  it("final + 外链显示打开链接", () => {
    const w = mountTab(
      buildDetail([
        buildGeneratedDoc({
          backendStatus: "final",
          resourceOpenUrl: "https://example.com/doc.pdf",
        }),
      ]),
    );
    const link = w.find("[data-testid='open-resource-link']");
    expect(link.exists()).toBe(true);
    expect(link.attributes("href")).toBe("https://example.com/doc.pdf");
    expect(link.attributes("target")).toBe("_blank");
  });

  it("final + 外链显示复制链接按钮", () => {
    const w = mountTab(
      buildDetail([
        buildGeneratedDoc({
          backendStatus: "final",
          resourceOpenUrl: "https://example.com/doc.pdf",
        }),
      ]),
    );
    expect(w.find("[data-testid='copy-resource-link']").exists()).toBe(true);
  });

  it("readonly 模式下不显示「确认已就绪」按钮", () => {
    const w = mountTab(
      buildDetail([
        buildGeneratedDoc({ backendStatus: "draft" }),
        buildGeneratedDoc({ id: "doc-2", backendStatus: "final" }),
      ]),
      true,
    );
    expect(w.find("[data-testid='finalize-btn']").exists()).toBe(false);
  });
});

describe("CaseFormsTab finalize event dispatch", () => {
  it("点击「确认已就绪」按钮 emit finalize 事件并携带 docId", async () => {
    const w = mountTab(
      buildDetail([
        buildGeneratedDoc({
          id: "doc-fin-1",
          backendStatus: "draft",
          fileUrl: "https://example.com/doc.pdf",
        }),
      ]),
    );
    await w.find("[data-testid='finalize-btn']").trigger("click");
    expect(w.emitted("finalize")).toHaveLength(1);
    expect(w.emitted("finalize")![0]).toEqual(["doc-fin-1"]);
  });

  it("多行各自 emit 正确的 docId", async () => {
    const w = mountTab(
      buildDetail([
        buildGeneratedDoc({
          id: "d1",
          backendStatus: "draft",
          fileUrl: "https://a.example/x",
        }),
        buildGeneratedDoc({
          id: "d2",
          backendStatus: "draft",
          fileUrl: "https://b.example/y",
        }),
      ]),
    );
    const finBtns = w.findAll("[data-testid='finalize-btn']");

    expect(finBtns).toHaveLength(2);

    await finBtns[0].trigger("click");
    expect(w.emitted("finalize")![0]).toEqual(["d1"]);

    await finBtns[1].trigger("click");
    expect(w.emitted("finalize")![1]).toEqual(["d2"]);
  });
});

describe("CaseFormsTab download link & resource open UI", () => {
  it("exported + downloadUrl 显示下载链接（指向 server 流式接口 — legacy）", () => {
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

  it("final + 外链 resourceOpenUrl 显示打开链接而非下载链接", () => {
    const w = mountTab(
      buildDetail([
        buildGeneratedDoc({
          backendStatus: "final",
          tone: "success",
          fileUrl: "https://drive.google.com/doc-1",
          resourceOpenUrl: "https://drive.google.com/doc-1",
        }),
      ]),
    );
    expect(w.find("[data-testid='open-resource-link']").exists()).toBe(true);
    expect(w.find("[data-testid='copy-resource-link']").exists()).toBe(true);
    expect(w.find("[data-testid='download-link']").exists()).toBe(false);
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

describe("canFinalizeDraftGeneratedDoc", () => {
  it("draft + https 外链 → true", () => {
    expect(
      canFinalizeDraftGeneratedDoc(
        buildGeneratedDoc({
          fileUrl: "https://x.example/a",
        }),
      ),
    ).toBe(true);
  });

  it("draft + http 外链 → true", () => {
    expect(
      canFinalizeDraftGeneratedDoc(
        buildGeneratedDoc({ fileUrl: "http://intranet.local/a" }),
      ),
    ).toBe(true);
  });

  it("draft + 内部 storage key → false", () => {
    expect(
      canFinalizeDraftGeneratedDoc(
        buildGeneratedDoc({
          fileUrl: "generated-documents/org/a/v1.pdf",
        }),
      ),
    ).toBe(false);
  });

  it("draft + null fileUrl → false", () => {
    expect(canFinalizeDraftGeneratedDoc(buildGeneratedDoc())).toBe(false);
  });

  it("draft + placeholder fileUrl → false", () => {
    expect(
      canFinalizeDraftGeneratedDoc(
        buildGeneratedDoc({
          fileUrl: "placeholder://x",
          fileUrlIsPlaceholder: true,
        }),
      ),
    ).toBe(false);
  });

  it("final 状态 → false", () => {
    expect(
      canFinalizeDraftGeneratedDoc(
        buildGeneratedDoc({
          backendStatus: "final",
          fileUrl: "https://x.example/a",
        }),
      ),
    ).toBe(false);
  });
});

describe("CaseFormsTab delete draft button", () => {
  it("草稿且非只读时渲染删除草稿按钮", () => {
    const w = mountTab(buildDetail([buildGeneratedDoc()]));
    expect(w.find("[data-testid='delete-draft-btn']").exists()).toBe(true);
  });

  it("只读时不渲染删除草稿按钮", () => {
    const w = mountTab(buildDetail([buildGeneratedDoc()]), true);
    expect(w.find("[data-testid='delete-draft-btn']").exists()).toBe(false);
  });

  it("已确认文书不渲染删除草稿按钮", () => {
    const w = mountTab(
      buildDetail([buildGeneratedDoc({ backendStatus: "final" })]),
    );
    expect(w.find("[data-testid='delete-draft-btn']").exists()).toBe(false);
  });
});
