import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseMessagesTab from "./CaseMessagesTab.vue";
import type { CaseDetail, MessageItem } from "../types-detail";
import { CASE_DETAIL_SAMPLES } from "../fixtures-detail";
import casesZhCN from "../../../i18n/messages/cases/zh-CN";
import casesJaJP from "../../../i18n/messages/cases/ja-JP";

const CARD_STUB = {
  template:
    "<section><header><slot name='header' /></header><slot /><footer><slot name='footer' /></footer></section>",
};
const CHIP_STUB = {
  template: "<span class='chip'><slot /></span>",
  props: ["tone"],
};

function makeDetail(messages: MessageItem[]): CaseDetail {
  return { ...CASE_DETAIL_SAMPLES.work, messages };
}

function makeMessage(
  overrides: Partial<MessageItem> & { type: MessageItem["type"] },
): MessageItem {
  return {
    id: `msg-${overrides.type}`,
    avatar: "TE",
    avatarStyle: "primary",
    author: "Test",
    typeLabelKey: `cases.detail.messages.types.${overrides.type}`,
    typeLabel: "DEPRECATED",
    body: "body",
    time: "2026-05-03 12:00",
    ...overrides,
  };
}

function mountTab(
  locale: string,
  messages: MessageItem[],
  casesMessages: Record<string, unknown>,
) {
  const i18n = createI18n({
    legacy: false,
    locale,
    messages: { [locale]: { cases: casesMessages } },
  });
  return mount(CaseMessagesTab, {
    props: { detail: makeDetail(messages), readonly: false },
    global: {
      plugins: [i18n],
      stubs: { Card: CARD_STUB, Chip: CHIP_STUB },
    },
  });
}

describe("CaseMessagesTab — R27-B typeLabelKey i18n chip text", () => {
  it("zh-CN: chip shows translated type labels, not raw typeLabel", () => {
    const msgs: MessageItem[] = [
      makeMessage({ type: "internal" }),
      makeMessage({ type: "phone" }),
      makeMessage({ type: "auto_email" }),
    ];
    const w = mountTab("zh-CN", msgs, casesZhCN);
    const chips = w.findAll(".chip");
    const texts = chips.map((c) => c.text());
    expect(texts).toContain("内部记录");
    expect(texts).toContain("电话记录");
    expect(texts).toContain("自动邮件");
    expect(texts).not.toContain("DEPRECATED");
  });

  it("ja-JP: chip shows Japanese type labels", () => {
    const msgs: MessageItem[] = [
      makeMessage({ type: "internal" }),
      makeMessage({ type: "client_visible" }),
      makeMessage({ type: "meeting" }),
    ];
    const w = mountTab("ja-JP", msgs, casesJaJP);
    const chips = w.findAll(".chip");
    const texts = chips.map((c) => c.text());
    expect(texts).toContain("内部メモ");
    expect(texts).toContain("顧客公開記録");
    expect(texts).toContain("対面会議");
  });

  it("zh-CN message type labels match messageFilters values", () => {
    expect(casesZhCN.detail.messages.types.internal).toBe(
      casesZhCN.constants.messageFilters.internal,
    );
    expect(casesZhCN.detail.messages.types.client_visible).toBe(
      casesZhCN.constants.messageFilters.client_visible,
    );
    expect(casesZhCN.detail.messages.types.phone).toBe(
      casesZhCN.constants.messageFilters.phone,
    );
    expect(casesZhCN.detail.messages.types.meeting).toBe(
      casesZhCN.constants.messageFilters.meeting,
    );
    expect(casesZhCN.detail.messages.types.auto_email).toBe(
      casesZhCN.constants.messageFilters.auto_email,
    );
  });

  it("all five type keys exist in all three dictionaries", () => {
    const keys = [
      "internal",
      "client_visible",
      "phone",
      "meeting",
      "auto_email",
    ] as const;
    for (const k of keys) {
      expect(casesZhCN.detail.messages.types[k]).toBeTruthy();
      expect(casesJaJP.detail.messages.types[k]).toBeTruthy();
    }
  });
});
