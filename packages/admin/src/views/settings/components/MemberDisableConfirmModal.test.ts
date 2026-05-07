import { describe, expect, it } from "vitest";
import { shallowMount } from "@vue/test-utils";
import MemberDisableConfirmModal from "./MemberDisableConfirmModal.vue";
import { i18n, setAppLocale } from "../../../i18n";

function mountModal(props: { open: boolean; memberName: string }) {
  return shallowMount(MemberDisableConfirmModal, {
    props,
    global: {
      plugins: [i18n],
      stubs: { teleport: true },
    },
  });
}

describe("MemberDisableConfirmModal", () => {
  beforeEach(() => {
    setAppLocale("zh-CN");
  });

  it("does not render dialog when closed", () => {
    const wrapper = mountModal({ open: false, memberName: "Alice" });
    expect(wrapper.find("[role='alertdialog']").exists()).toBe(false);
  });

  it("renders dialog with member name when open", () => {
    const wrapper = mountModal({ open: true, memberName: "Alice" });
    expect(wrapper.find("[role='alertdialog']").exists()).toBe(true);
    expect(wrapper.text()).toContain("Alice");
  });

  it("emits close when cancel button is clicked", async () => {
    const wrapper = mountModal({ open: true, memberName: "Alice" });
    const closeBtn = wrapper.find(".mdcm-header__close");
    await closeBtn.trigger("click");
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("emits confirm when confirm button is clicked", async () => {
    const wrapper = mountModal({ open: true, memberName: "Bob" });
    const buttons = wrapper.findAllComponents({ name: "Button" });
    const dangerBtn = buttons.find((b) => b.props("tone") === "danger");
    expect(dangerBtn).toBeDefined();
    await dangerBtn!.vm.$emit("click");
    expect(wrapper.emitted("confirm")).toHaveLength(1);
  });

  it("emits close on overlay click", async () => {
    const wrapper = mountModal({ open: true, memberName: "Alice" });
    await wrapper.find(".mdcm-overlay").trigger("click");
    expect(wrapper.emitted("close")).toHaveLength(1);
  });
});
