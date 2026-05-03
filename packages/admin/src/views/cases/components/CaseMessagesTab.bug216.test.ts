import { describe, it, expect } from "vitest";
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

function mountTab(readonly = false) {
  return mount(CaseMessagesTab, {
    props: { detail: CASE_DETAIL_SAMPLES.work, readonly },
    global: {
      plugins: [i18n],
      stubs: { Card: CARD_STUB, Chip: CHIP_STUB },
    },
  });
}

describe("BUG-216 CaseMessagesTab publish", () => {
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

  it("composer clears after successful publish", async () => {
    const w = mountTab();
    const textarea = w.find("[data-testid='messages-composer']");
    await textarea.setValue("will be cleared");
    await w.find("[data-testid='messages-publish-btn']").trigger("click");
    expect((textarea.element as HTMLTextAreaElement).value).toBe("");
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
});
