import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseDocumentRow from "./CaseDocumentRow.vue";
import type { DocumentItem } from "../types-detail";
import casesZhCN from "../../../i18n/messages/cases/zh-CN";
import casesJaJP from "../../../i18n/messages/cases/ja-JP";
import casesEnUS from "../../../i18n/messages/cases/en-US";

const CHIP_STUB = {
  template: '<span class="chip-stub"><slot /></span>',
  props: ["tone", "dot"],
};

const BUTTON_STUB = {
  template:
    "<button @click='$emit(\"click\")' :disabled='disabled'><slot /></button>",
  emits: ["click"],
  props: ["variant", "tone", "size", "disabled"],
};

const DETAIL_STUB = { template: "<div />" };

const MESSAGES = {
  "zh-CN": { cases: casesZhCN },
  "ja-JP": { cases: casesJaJP },
  "en-US": { cases: casesEnUS },
};

function makeI18n(locale = "zh-CN") {
  return createI18n({ legacy: false, locale, messages: MESSAGES });
}

function makeItem(overrides: Partial<DocumentItem> = {}): DocumentItem {
  return {
    name: "テスト書類",
    meta: "test.pdf · v1",
    status: "pending",
    statusLabelKey: "cases.detail.documents.docStatus.pending",
    ...overrides,
  };
}

function mountRow(
  item: DocumentItem,
  opts: { locale?: string; readonly?: boolean } = {},
) {
  return mount(CaseDocumentRow, {
    props: { item, readonly: opts.readonly ?? false },
    global: {
      plugins: [makeI18n(opts.locale)],
      stubs: {
        Chip: CHIP_STUB,
        Button: BUTTON_STUB,
        CaseDocumentDetail: DETAIL_STUB,
      },
    },
  });
}

describe("CaseDocumentRow (BUG-229): status chip uses t()", () => {
  it("renders translated status label via t(statusLabelKey)", () => {
    const w = mountRow(makeItem());
    const chipText = w.find(".chip-stub").text();
    expect(chipText).toBe(casesZhCN.detail.documents.docStatus.pending);
    expect(chipText).not.toBe("cases.detail.documents.docStatus.pending");
  });

  it("approved status renders correctly in ja-JP", () => {
    const item = makeItem({
      status: "approved",
      statusLabelKey: "cases.detail.documents.docStatus.approved",
    });
    const w = mountRow(item, { locale: "ja-JP" });
    expect(w.find(".chip-stub").text()).toBe(
      casesJaJP.detail.documents.docStatus.approved,
    );
  });

  it("all known statuses have i18n keys in all 3 locales", () => {
    const statuses = [
      "pending",
      "waitingUpload",
      "uploadedReviewing",
      "approved",
      "revisionRequired",
      "waived",
      "expired",
      "notSent",
      "rejected",
    ] as const;

    for (const locale of ["zh-CN", "ja-JP", "en-US"] as const) {
      const i18n = makeI18n(locale);
      for (const key of statuses) {
        const fullKey = `cases.detail.documents.docStatus.${key}`;
        const translated = i18n.global.t(fullKey);
        expect(translated, `${locale}/${key}`).not.toBe(fullKey);
        expect(translated.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("CaseDocumentRow (BUG-229): reference label uses t()", () => {
  it("renders translated reference label via t(referenceLabelKey)", () => {
    const item = makeItem({
      referenceLabelKey: "cases.detail.documents.referenceSelf",
    });
    const w = mountRow(item);
    const refEl = w.find(".doc-row__ref");
    expect(refEl.exists()).toBe(true);
    expect(refEl.text()).toContain(casesZhCN.detail.documents.referenceSelf);
  });

  it("hides reference block when referenceLabelKey is null", () => {
    const item = makeItem({ referenceLabelKey: null });
    const w = mountRow(item);
    expect(w.find(".doc-row__ref").exists()).toBe(false);
  });

  it("shows reference count when referenceCount > 1", () => {
    const item = makeItem({
      referenceLabelKey: "cases.detail.documents.referenceSelf",
      referenceCount: 3,
    });
    const w = mountRow(item);
    const refCount = w.find(".doc-row__ref-count");
    expect(refCount.exists()).toBe(true);
    expect(refCount.text()).toContain("3");
  });
});
