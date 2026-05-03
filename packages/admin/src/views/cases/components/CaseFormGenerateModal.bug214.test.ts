import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseFormGenerateModal from "./CaseFormGenerateModal.vue";
import casesZhCN from "../../../i18n/messages/cases/zh-CN";

const i18n = createI18n({
  legacy: false,
  locale: "zh-CN",
  messages: { "zh-CN": { cases: casesZhCN } },
});

function mountModal(props: Record<string, unknown> = {}) {
  return mount(CaseFormGenerateModal, {
    props: { open: true, caseName: "テスト案件", ...props },
    global: {
      plugins: [i18n],
      stubs: {
        Button: {
          template:
            "<button v-bind='$attrs' :disabled='disabled'><slot /></button>",
          props: ["variant", "tone", "size", "disabled"],
        },
        Teleport: true,
      },
    },
  });
}

describe("BUG-214 CaseFormGenerateModal", () => {
  it("renders when open=true", () => {
    const w = mountModal();
    expect(w.find("[data-testid='form-generate-modal']").exists()).toBe(true);
  });

  it("does not render when open=false", () => {
    const w = mountModal({ open: false });
    expect(w.find("[data-testid='form-generate-modal']").exists()).toBe(false);
  });

  it("pre-fills title with caseName", () => {
    const w = mountModal();
    const input = w.find("[data-testid='form-gen-title-input']");
    expect((input.element as HTMLInputElement).value).toBe("テスト案件");
  });

  it("submit button is disabled when title is empty", async () => {
    const w = mountModal();
    const input = w.find("[data-testid='form-gen-title-input']");
    await input.setValue("");
    const btn = w.find("[data-testid='form-gen-submit-btn']");
    expect(btn.attributes("disabled")).toBeDefined();
  });

  it("submit button is enabled when title has text", () => {
    const w = mountModal();
    const btn = w.find("[data-testid='form-gen-submit-btn']");
    expect(btn.attributes("disabled")).toBeUndefined();
  });

  it("emits submit with correct payload on click", async () => {
    const w = mountModal();
    const input = w.find("[data-testid='form-gen-title-input']");
    await input.setValue("生成テスト");
    const btn = w.find("[data-testid='form-gen-submit-btn']");
    await btn.trigger("click");

    const events = w.emitted("submit");
    expect(events).toBeTruthy();
    expect(events!.length).toBe(1);
    const payload = events![0][0] as {
      title: string;
      templateId: string | null;
      outputFormat: string;
    };
    expect(payload.title).toBe("生成テスト");
    expect(payload.templateId).toBeNull();
    expect(payload.outputFormat).toBe("pdf");
  });

  it("emits close when cancel is clicked", async () => {
    const w = mountModal();
    const buttons = w.findAll("button");
    const cancelBtn = buttons.find((b) => b.text().includes("取消"));
    expect(cancelBtn).toBeTruthy();
    await cancelBtn!.trigger("click");
    expect(w.emitted("close")).toBeTruthy();
  });

  it("template select is disabled (placeholder flow)", () => {
    const w = mountModal();
    const select = w.find("[data-testid='form-gen-template-select']");
    expect(select.attributes("disabled")).toBeDefined();
  });

  it("submit is disabled when submitting=true", () => {
    const w = mountModal({ submitting: true });
    const btn = w.find("[data-testid='form-gen-submit-btn']");
    expect(btn.attributes("disabled")).toBeDefined();
  });

  it("format select defaults to pdf", () => {
    const w = mountModal();
    const select = w.find("[data-testid='form-gen-format-select']");
    expect((select.element as HTMLSelectElement).value).toBe("pdf");
  });
});
