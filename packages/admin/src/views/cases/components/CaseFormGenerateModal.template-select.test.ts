// ── Test Ownership ──────────────────────────────────────────────
// Owner: fe-modal — fileUrl field rendering, submit payload containing fileUrl
// ────────────────────────────────────────────────────────────────

import { describe, it, expect, afterEach } from "vitest";
import { mount, VueWrapper } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseFormGenerateModal from "./CaseFormGenerateModal.vue";
import casesZhCN from "../../../i18n/messages/cases/zh-CN";

const BUTTON_STUB = {
  template:
    "<button @click='$emit(\"click\")' :disabled='disabled'><slot /></button>",
  emits: ["click"],
  props: ["variant", "tone", "size", "disabled"],
};

function makeI18n() {
  return createI18n({
    legacy: false,
    locale: "zh-CN",
    messages: { "zh-CN": { cases: casesZhCN } },
  });
}

let wrapper: VueWrapper | null = null;

function mountModal(overrides: Record<string, unknown> = {}) {
  const w = mount(CaseFormGenerateModal, {
    global: {
      plugins: [makeI18n()],
      stubs: { Teleport: true, Button: BUTTON_STUB },
    },
    props: { open: true, submitting: false, ...overrides },
    attachTo: document.body,
  });
  wrapper = w;
  return w;
}

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
});

// ═══════════════════════════════════════════════════════════════════
//  fileUrl field — renders input
// ═══════════════════════════════════════════════════════════════════

describe("CaseFormGenerateModal fileUrl field", () => {
  it("renders a fileUrl input field", () => {
    const w = mountModal();
    const input = w.find("[data-testid='form-gen-file-url-input']");
    expect(input.exists()).toBe(true);
    expect(input.attributes("type")).toBe("url");
  });

  it("fileUrl input is empty on first open", () => {
    const w = mountModal({ caseName: "Test Case" });
    const input = w.find("[data-testid='form-gen-file-url-input']")
      .element as HTMLInputElement;
    expect(input.value).toBe("");
  });

  it("displays hint text below fileUrl input", () => {
    const w = mountModal();
    const hint = w.find("[data-testid='form-gen-file-url-hint']");
    expect(hint.exists()).toBe(true);
    expect(hint.text()).toBeTruthy();
  });

  it("fileUrl input is disabled when submitting", () => {
    const w = mountModal({ submitting: true });
    const input = w.find("[data-testid='form-gen-file-url-input']");
    expect((input.element as HTMLInputElement).disabled).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  Submit payload — fileUrl included
// ═══════════════════════════════════════════════════════════════════

describe("CaseFormGenerateModal submit — fileUrl in payload", () => {
  it("payload includes fileUrl when user fills in a URL", async () => {
    const w = mountModal({ caseName: "Test Case" });
    const urlInput = w.find("[data-testid='form-gen-file-url-input']");
    await urlInput.setValue("https://example.com/doc.pdf");

    const submitBtn = w.find("[data-testid='form-gen-submit-btn']");
    await submitBtn.trigger("click");

    const events = w.emitted("submit")!;
    expect(events).toHaveLength(1);
    expect(events[0][0]).toMatchObject({
      title: "Test Case",
      fileUrl: "https://example.com/doc.pdf",
    });
  });

  it("payload includes empty fileUrl when user leaves it blank", async () => {
    const w = mountModal({ caseName: "Test Case" });
    const submitBtn = w.find("[data-testid='form-gen-submit-btn']");
    await submitBtn.trigger("click");

    const events = w.emitted("submit")!;
    expect(events).toHaveLength(1);
    expect(events[0][0]).toMatchObject({
      title: "Test Case",
      fileUrl: "",
    });
  });

  it("resets fileUrl when modal reopens", async () => {
    const w = mountModal({ caseName: "Test Case" });
    const urlInput = w.find("[data-testid='form-gen-file-url-input']");
    await urlInput.setValue("https://example.com/doc.pdf");

    await w.setProps({ open: false });
    await w.setProps({ open: true });

    const submitBtn = w.find("[data-testid='form-gen-submit-btn']");
    await submitBtn.trigger("click");

    const events = w.emitted("submit")!;
    const lastPayload = events[events.length - 1][0];
    expect(lastPayload).toMatchObject({ fileUrl: "" });
  });
});

// ═══════════════════════════════════════════════════════════════════
//  Title field — pre-fills from caseName
// ═══════════════════════════════════════════════════════════════════

describe("CaseFormGenerateModal title field", () => {
  it("title pre-fills with caseName", () => {
    const w = mountModal({ caseName: "テスト案件" });
    const input = w.find("[data-testid='form-gen-title-input']")
      .element as HTMLInputElement;
    expect(input.value).toBe("テスト案件");
  });

  it("title resets to caseName on reopen", async () => {
    const w = mountModal({ caseName: "Test Case" });
    const input = w.find("[data-testid='form-gen-title-input']");
    await input.setValue("Custom Title");

    await w.setProps({ open: false });
    await w.setProps({ open: true });

    const titleInput = w.find("[data-testid='form-gen-title-input']")
      .element as HTMLInputElement;
    expect(titleInput.value).toBe("Test Case");
  });
});

describe("CaseFormGenerateModal presetTemplate", () => {
  it("title pre-fills from presetTemplate.name over caseName", () => {
    const w = mountModal({
      caseName: "Parent Case Title",
      presetTemplate: { id: "tpl-a", name: "履歴書" },
    });
    const input = w.find("[data-testid='form-gen-title-input']")
      .element as HTMLInputElement;
    expect(input.value).toBe("履歴書");
  });

  it("submit payload includes templateId when presetTemplate is set", async () => {
    const w = mountModal({
      caseName: "Ignored",
      presetTemplate: { id: "tpl-99", name: "申請理由書" },
    });
    const submitBtn = w.find("[data-testid='form-gen-submit-btn']");
    await submitBtn.trigger("click");

    const events = w.emitted("submit")!;
    expect(events[0][0]).toMatchObject({
      title: "申請理由書",
      fileUrl: "",
      templateId: "tpl-99",
    });
  });

  it("omit templateId when no presetTemplate", async () => {
    const w = mountModal({ caseName: "Only Case" });
    await w.find("[data-testid='form-gen-submit-btn']").trigger("click");
    const payload = (w.emitted("submit") as unknown[][])[0]![0] as Record<
      string,
      unknown
    >;
    expect(payload).not.toHaveProperty("templateId");
    expect(payload.title).toBe("Only Case");
  });
});
