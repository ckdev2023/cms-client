import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseMessagesTab from "./CaseMessagesTab.vue";
import { CASE_DETAIL_SAMPLES } from "../fixtures-detail";
import casesZhCN from "../../../i18n/messages/cases/zh-CN";
import type { MessageChannelChoice } from "../model/CaseAdapterMessageWriteBuilders";

const i18n = createI18n({
  legacy: false,
  locale: "zh-CN",
  messages: { "zh-CN": { cases: casesZhCN } },
});

const CARD_STUB = {
  template:
    "<section><header><slot name='header' /></header><slot /><footer><slot name='footer' /></footer></section>",
};
const CHIP_STUB = {
  template: "<span class='chip'><slot /></span>",
  props: ["tone"],
};

function mountTab(
  readonly = false,
  detail = CASE_DETAIL_SAMPLES.work,
  extraProps: {
    publishSuccessNonce?: number;
    writeSubmitting?: boolean;
  } = {},
) {
  return mount(CaseMessagesTab, {
    props: { readonly, detail, ...extraProps },
    global: {
      plugins: [i18n],
      stubs: { Card: CARD_STUB, Chip: CHIP_STUB },
    },
  });
}

describe("BUG-216 CaseMessagesTab publish", () => {
  beforeEach(() => {
    const proto = HTMLElement.prototype as unknown as {
      scrollIntoView?: () => void;
    };
    if (typeof proto.scrollIntoView !== "function") {
      proto.scrollIntoView = () => {};
    }
    vi.spyOn(HTMLElement.prototype, "scrollIntoView").mockImplementation(
      () => {},
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("publish button is disabled when composer is empty", () => {
    const w = mountTab();
    const btn = w.find("[data-testid='messages-publish-btn']");
    expect(btn.exists()).toBe(true);
    expect(btn.attributes("disabled")).toBeDefined();
  });

  it("publish button is enabled when composer has text", async () => {
    const w = mountTab();
    const textarea = w.find("[data-testid='messages-composer']");
    await textarea.setValue("テスト内容");
    const btn = w.find("[data-testid='messages-publish-btn']");
    expect(btn.attributes("disabled")).toBeUndefined();
  });

  it("click emits publish-message with default channel=internal", async () => {
    const w = mountTab();
    const textarea = w.find("[data-testid='messages-composer']");
    await textarea.setValue("テスト内容");
    const btn = w.find("[data-testid='messages-publish-btn']");
    await btn.trigger("click");
    const events = w.emitted("publish-message");
    expect(events).toBeTruthy();
    expect(events!.length).toBe(1);
    const payload = events![0][0] as {
      content: string;
      channelChoice: MessageChannelChoice;
    };
    expect(payload.content).toBe("テスト内容");
    expect(payload.channelChoice).toBe("internal");
  });

  it("channel select changes channelChoice in emitted payload", async () => {
    const w = mountTab();
    const textarea = w.find("[data-testid='messages-composer']");
    await textarea.setValue("電話メモ");
    const select = w.find("[data-testid='messages-channel-select']");
    await select.setValue("phone");
    const btn = w.find("[data-testid='messages-publish-btn']");
    await btn.trigger("click");
    const payload = w.emitted("publish-message")![0][0] as {
      content: string;
      channelChoice: MessageChannelChoice;
    };
    expect(payload.channelChoice).toBe("phone");
    expect(payload.content).toBe("電話メモ");
  });

  it("all 4 channel choices map correctly via select", async () => {
    const choices: MessageChannelChoice[] = [
      "internal",
      "client_visible",
      "phone",
      "meeting",
    ];
    for (const choice of choices) {
      const w = mountTab();
      await w.find("[data-testid='messages-composer']").setValue("msg");
      await w.find("[data-testid='messages-channel-select']").setValue(choice);
      await w.find("[data-testid='messages-publish-btn']").trigger("click");
      const payload = w.emitted("publish-message")![0][0] as {
        channelChoice: MessageChannelChoice;
      };
      expect(payload.channelChoice).toBe(choice);
    }
  });

  it("composer clears only after publish success (nonce bump)", async () => {
    const w = mountTab();
    const textarea = w.find("[data-testid='messages-composer']");
    await textarea.setValue("will be cleared");
    await w.find("[data-testid='messages-publish-btn']").trigger("click");
    expect((textarea.element as HTMLTextAreaElement).value).toBe(
      "will be cleared",
    );
    await w.setProps({ publishSuccessNonce: 1 });
    expect((textarea.element as HTMLTextAreaElement).value).toBe("");
  });

  it("publish stays disabled while writeSubmitting", async () => {
    const w = mountTab(false, CASE_DETAIL_SAMPLES.work, {
      writeSubmitting: true,
    });
    await w.find("[data-testid='messages-composer']").setValue("x");
    const btn = w.find("[data-testid='messages-publish-btn']");
    expect(btn.attributes("disabled")).toBeDefined();
  });

  it("readonly mode hides composer entirely", () => {
    const w = mountTab(true);
    expect(w.find("[data-testid='messages-composer']").exists()).toBe(false);
    expect(w.find("[data-testid='messages-publish-btn']").exists()).toBe(false);
  });

  it("click on disabled publish button does not emit", async () => {
    const w = mountTab();
    const btn = w.find("[data-testid='messages-publish-btn']");
    await btn.trigger("click");
    expect(w.emitted("publish-message")).toBeFalsy();
  });

  it("shows filter empty state when messages exist but none match filter", async () => {
    const w = mountTab(false, CASE_DETAIL_SAMPLES.correction);
    expect(w.find("[data-testid='messages-filter-empty']").exists()).toBe(
      false,
    );
    await w.find("#msgFilter-internal").trigger("change");
    expect(w.find("[data-testid='messages-filter-empty']").exists()).toBe(true);
    expect(w.text()).toContain("当前筛选下暂无匹配记录");
  });

  it("reply prepends quoted draft to composer and syncs channel select", async () => {
    const w = mountTab();
    const src = CASE_DETAIL_SAMPLES.work.messages.find((m) => !m.actionLabel)!;
    await w.find("[data-testid='messages-reply-btn']").trigger("click");
    const ta = w.find("[data-testid='messages-composer']")
      .element as HTMLTextAreaElement;
    expect(ta.value).toContain("Suzuki");
    expect(ta.value).toContain(`> ${src.body.split("\n")[0]}`);
    const select = w.find("[data-testid='messages-channel-select']")
      .element as HTMLSelectElement;
    expect(select.value).toBe("phone");
  });

  it("edit loads message body into composer and syncs channel select", async () => {
    const w = mountTab();
    const src = CASE_DETAIL_SAMPLES.work.messages.find((m) => !m.actionLabel)!;
    await w.find("[data-testid='messages-edit-btn']").trigger("click");
    const ta = w.find("[data-testid='messages-composer']")
      .element as HTMLTextAreaElement;
    expect(ta.value).toBe(src.body);
    const select = w.find("[data-testid='messages-channel-select']")
      .element as HTMLSelectElement;
    expect(select.value).toBe("phone");
  });
});
