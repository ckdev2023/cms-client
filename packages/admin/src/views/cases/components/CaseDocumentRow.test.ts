import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseDocumentRow from "./CaseDocumentRow.vue";
import type { DocumentItem } from "../types-detail";
import documentsZhCN from "../../../i18n/messages/documents/zh-CN";
import documentsEnUS from "../../../i18n/messages/documents/en-US";
import documentsJaJP from "../../../i18n/messages/documents/ja-JP";

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

const ROUTER_LINK_STUB = {
  template: '<a :href="to" class="router-link-stub"><slot /></a>',
  props: ["to"],
};

const MESSAGES = {
  "zh-CN": { documents: documentsZhCN },
  "en-US": { documents: documentsEnUS },
  "ja-JP": { documents: documentsJaJP },
};

function makeI18n(locale = "zh-CN") {
  return createI18n({ legacy: false, locale, messages: MESSAGES });
}

function makeItem(overrides: Partial<DocumentItem> = {}): DocumentItem {
  return {
    name: "テスト書類",
    meta: "test.pdf · v1",
    status: "waiting_upload",
    statusLabelKey: "documents.actions.register",
    actions: { canRegister: true },
    ...overrides,
  };
}

function mountRow(
  item: DocumentItem,
  opts: {
    locale?: string;
    readonly?: boolean;
    storageRootConfigured?: boolean;
  } = {},
) {
  return mount(CaseDocumentRow, {
    props: {
      item,
      readonly: opts.readonly ?? false,
      storageRootConfigured: opts.storageRootConfigured,
    },
    global: {
      plugins: [makeI18n(opts.locale)],
      stubs: {
        Chip: CHIP_STUB,
        Button: BUTTON_STUB,
        CaseDocumentDetail: DETAIL_STUB,
        RouterLink: ROUTER_LINK_STUB,
      },
    },
  });
}

describe("CaseDocumentRow: storage root gate tooltip + settings link", () => {
  it("shows tooltip and settings link when storageRootConfigured=false", () => {
    const w = mountRow(makeItem(), { storageRootConfigured: false });

    const wrap = w.find(".doc-row__register-wrap");
    expect(wrap.exists()).toBe(true);
    expect(wrap.attributes("title")).toBe(
      documentsZhCN.storageGate.buttonTooltip,
    );

    const link = w.find(".doc-row__storage-link");
    expect(link.exists()).toBe(true);
    expect(link.attributes("href")).toBe("/settings?tab=storage-root");
    expect(link.text()).toBe(documentsZhCN.storageGate.settingsLinkText);
  });

  it("disables register button when storageRootConfigured=false", () => {
    const w = mountRow(makeItem(), { storageRootConfigured: false });
    const btn = w.find(".doc-row__register-wrap button");
    expect(btn.attributes("disabled")).toBeDefined();
  });

  it("hides settings link when storageRootConfigured=true", () => {
    const w = mountRow(makeItem(), { storageRootConfigured: true });
    expect(w.find(".doc-row__storage-link").exists()).toBe(false);
  });

  it("has no tooltip when storageRootConfigured=true", () => {
    const w = mountRow(makeItem(), { storageRootConfigured: true });
    const wrap = w.find(".doc-row__register-wrap");
    expect(wrap.attributes("title")).toBeUndefined();
  });

  it("renders tooltip in en-US locale", () => {
    const w = mountRow(makeItem(), {
      storageRootConfigured: false,
      locale: "en-US",
    });
    const wrap = w.find(".doc-row__register-wrap");
    expect(wrap.attributes("title")).toBe(
      documentsEnUS.storageGate.buttonTooltip,
    );
    const link = w.find(".doc-row__storage-link");
    expect(link.text()).toBe(documentsEnUS.storageGate.settingsLinkText);
  });

  it("renders tooltip in ja-JP locale", () => {
    const w = mountRow(makeItem(), {
      storageRootConfigured: false,
      locale: "ja-JP",
    });
    const wrap = w.find(".doc-row__register-wrap");
    expect(wrap.attributes("title")).toBe(
      documentsJaJP.storageGate.buttonTooltip,
    );
    const link = w.find(".doc-row__storage-link");
    expect(link.text()).toBe(documentsJaJP.storageGate.settingsLinkText);
  });

  it("does not render register section when canRegister=false", () => {
    const item = makeItem({ actions: { canRegister: false } });
    const w = mountRow(item, { storageRootConfigured: false });
    expect(w.find(".doc-row__register-wrap").exists()).toBe(false);
    expect(w.find(".doc-row__storage-link").exists()).toBe(false);
  });
});

describe("CaseDocumentRow: meta line", () => {
  it("omits meta wrapper when meta is empty", () => {
    const w = mountRow(makeItem({ meta: "" }));
    expect(w.find(".doc-row__meta").exists()).toBe(false);
  });
});
