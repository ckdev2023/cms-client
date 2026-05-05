// ── Test Ownership ──────────────────────────────────────────────
// Owner: fe-modal — template select rendering, empty-list fallback,
//        submit payload containing templateId
// ────────────────────────────────────────────────────────────────

import { describe, it, expect, afterEach } from "vitest";
import { mount, VueWrapper } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseFormGenerateModal from "./CaseFormGenerateModal.vue";
import casesZhCN from "../../../i18n/messages/cases/zh-CN";
import type { FormTemplate } from "../types-detail";

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

const SAMPLE_TEMPLATES: FormTemplate[] = [
  {
    id: "tpl-1",
    name: "在留資格認定証明書",
    meta: "ja · v1",
    actionLabel: "生成",
  },
  { id: "tpl-2", name: "申請理由書", meta: "ja · v1", actionLabel: "生成" },
];

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
//  Template select — renders options from prop
// ═══════════════════════════════════════════════════════════════════

describe("CaseFormGenerateModal template select — with templates", () => {
  it("renders an <option> for each template", () => {
    const w = mountModal({ templates: SAMPLE_TEMPLATES });
    const select = w.find("[data-testid='form-gen-template-select']");
    const options = select.findAll("option");
    // placeholder + 2 templates
    expect(options).toHaveLength(3);
    expect(options[1].text()).toBe("在留資格認定証明書");
    expect(options[2].text()).toBe("申請理由書");
  });

  it("template select is enabled when templates are provided", () => {
    const w = mountModal({ templates: SAMPLE_TEMPLATES });
    const select = w.find("[data-testid='form-gen-template-select']");
    expect((select.element as HTMLSelectElement).disabled).toBe(false);
  });

  it("option values match template ids", () => {
    const w = mountModal({ templates: SAMPLE_TEMPLATES });
    const select = w.find("[data-testid='form-gen-template-select']");
    const options = select.findAll("option");
    expect(options[0].element.value).toBe("");
    expect(options[1].element.value).toBe("tpl-1");
    expect(options[2].element.value).toBe("tpl-2");
  });
});

// ═══════════════════════════════════════════════════════════════════
//  Template select — empty list fallback
// ═══════════════════════════════════════════════════════════════════

describe("CaseFormGenerateModal template select — empty list fallback", () => {
  it("shows templateEmpty copy when templates is empty", () => {
    const w = mountModal({ templates: [] });
    const select = w.find("[data-testid='form-gen-template-select']");
    const options = select.findAll("option");
    expect(options).toHaveLength(1);
    expect(options[0].text()).toBe("尚未配置可选模板，将创建无模板草稿");
  });

  it("select is NOT disabled when templates is empty (R39-D)", () => {
    const w = mountModal({ templates: [] });
    const select = w.find("[data-testid='form-gen-template-select']");
    expect((select.element as HTMLSelectElement).disabled).toBe(false);
  });

  it("select is NOT disabled when templates prop is not provided (R39-D)", () => {
    const w = mountModal();
    const select = w.find("[data-testid='form-gen-template-select']");
    expect((select.element as HTMLSelectElement).disabled).toBe(false);
  });

  it("select is disabled when submitting, regardless of templates (R39-D)", () => {
    const w = mountModal({ templates: [], submitting: true });
    const select = w.find("[data-testid='form-gen-template-select']");
    expect((select.element as HTMLSelectElement).disabled).toBe(true);
  });

  it("shows only the placeholder when templates prop is not provided", () => {
    const w = mountModal();
    const select = w.find("[data-testid='form-gen-template-select']");
    const options = select.findAll("option");
    expect(options).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  Submit payload — templateId included
// ═══════════════════════════════════════════════════════════════════

describe("CaseFormGenerateModal submit — templateId in payload", () => {
  it("payload includes templateId=null when no template selected", async () => {
    const w = mountModal({
      templates: SAMPLE_TEMPLATES,
      caseName: "Test Case",
    });
    const submitBtn = w.find("[data-testid='form-gen-submit-btn']");
    await submitBtn.trigger("click");

    const events = w.emitted("submit")!;
    expect(events).toHaveLength(1);
    expect(events[0][0]).toMatchObject({
      title: "Test Case",
      templateId: null,
      outputFormat: "pdf",
    });
  });

  it("payload includes selected templateId after selection", async () => {
    const w = mountModal({
      templates: SAMPLE_TEMPLATES,
      caseName: "Test Case",
    });
    const select = w.find("[data-testid='form-gen-template-select']");
    await select.setValue("tpl-2");

    const submitBtn = w.find("[data-testid='form-gen-submit-btn']");
    await submitBtn.trigger("click");

    const events = w.emitted("submit")!;
    expect(events).toHaveLength(1);
    expect(events[0][0]).toMatchObject({
      title: "Test Case",
      templateId: "tpl-2",
      outputFormat: "pdf",
    });
  });

  it("payload includes templateId=null when empty list and placeholder is shown", async () => {
    const w = mountModal({ templates: [], caseName: "Test Case" });
    const submitBtn = w.find("[data-testid='form-gen-submit-btn']");
    await submitBtn.trigger("click");

    const events = w.emitted("submit")!;
    expect(events).toHaveLength(1);
    expect(events[0][0]).toMatchObject({
      templateId: null,
    });
  });

  it("resets templateId when modal reopens", async () => {
    const w = mountModal({
      templates: SAMPLE_TEMPLATES,
      caseName: "Test Case",
    });
    const select = w.find("[data-testid='form-gen-template-select']");
    await select.setValue("tpl-1");

    // Close and reopen
    await w.setProps({ open: false });
    await w.setProps({ open: true });

    const submitBtn = w.find("[data-testid='form-gen-submit-btn']");
    await submitBtn.trigger("click");

    const events = w.emitted("submit")!;
    const lastPayload = events[events.length - 1][0];
    expect(lastPayload).toMatchObject({ templateId: null });
  });
});

// ═══════════════════════════════════════════════════════════════════
//  placeholder copy — two-state: templatePlaceholder vs templateEmpty
// ═══════════════════════════════════════════════════════════════════

describe("CaseFormGenerateModal — placeholder copy two-state", () => {
  it("shows templatePlaceholder when templates are provided", () => {
    const w = mountModal({ templates: SAMPLE_TEMPLATES });
    const select = w.find("[data-testid='form-gen-template-select']");
    const placeholder = select.findAll("option")[0];
    expect(placeholder.text()).toBe("请选择模板（可留空创建空白草稿）");
  });

  it("shows templateEmpty when templates array is empty", () => {
    const w = mountModal({ templates: [] });
    const select = w.find("[data-testid='form-gen-template-select']");
    const placeholder = select.findAll("option")[0];
    expect(placeholder.text()).toBe("尚未配置可选模板，将创建无模板草稿");
  });

  it("shows templateEmpty when templates prop is not provided", () => {
    const w = mountModal();
    const select = w.find("[data-testid='form-gen-template-select']");
    const placeholder = select.findAll("option")[0];
    expect(placeholder.text()).toBe("尚未配置可选模板，将创建无模板草稿");
  });
});

// ═══════════════════════════════════════════════════════════════════
//  initialTemplateId — pre-selects template on open (R37-K)
// ═══════════════════════════════════════════════════════════════════

describe("CaseFormGenerateModal — initialTemplateId prop (R37-K)", () => {
  it("pre-selects the template matching initialTemplateId on open", () => {
    const w = mountModal({
      templates: SAMPLE_TEMPLATES,
      initialTemplateId: "tpl-2",
      caseName: "Test",
    });
    const select = w.find("[data-testid='form-gen-template-select']")
      .element as HTMLSelectElement;
    expect(select.value).toBe("tpl-2");
  });

  it("submit payload contains the pre-selected templateId", async () => {
    const w = mountModal({
      templates: SAMPLE_TEMPLATES,
      initialTemplateId: "tpl-1",
      caseName: "Test",
    });
    const submitBtn = w.find("[data-testid='form-gen-submit-btn']");
    await submitBtn.trigger("click");

    const events = w.emitted("submit")!;
    expect(events).toHaveLength(1);
    expect(events[0][0]).toMatchObject({ templateId: "tpl-1" });
  });

  it("falls back to null when initialTemplateId is not provided", () => {
    const w = mountModal({
      templates: SAMPLE_TEMPLATES,
      caseName: "Test",
    });
    const select = w.find("[data-testid='form-gen-template-select']")
      .element as HTMLSelectElement;
    expect(select.value).toBe("");
  });

  it("resets to initialTemplateId (not previous selection) on reopen", async () => {
    const w = mountModal({
      templates: SAMPLE_TEMPLATES,
      initialTemplateId: "tpl-1",
      caseName: "Test",
    });
    const select = w.find("[data-testid='form-gen-template-select']");
    await select.setValue("tpl-2");

    await w.setProps({ open: false });
    await w.setProps({ open: true, initialTemplateId: "tpl-1" });

    const selectEl = w.find("[data-testid='form-gen-template-select']")
      .element as HTMLSelectElement;
    expect(selectEl.value).toBe("tpl-1");
  });
});

// ═══════════════════════════════════════════════════════════════════
//  R39-D — optionalHint visibility & empty-template submit
// ═══════════════════════════════════════════════════════════════════

describe("CaseFormGenerateModal — optionalHint (R39-D)", () => {
  it("displays optionalHint text when templates are provided", () => {
    const w = mountModal({ templates: SAMPLE_TEMPLATES });
    const hint = w.find("[data-testid='form-gen-optional-hint']");
    expect(hint.exists()).toBe(true);
    expect(hint.text()).toBe("未选择模板时将创建空白草稿");
  });

  it("displays optionalHint text when templates list is empty", () => {
    const w = mountModal({ templates: [] });
    const hint = w.find("[data-testid='form-gen-optional-hint']");
    expect(hint.exists()).toBe(true);
    expect(hint.text()).toBe("未选择模板时将创建空白草稿");
  });

  it("submit with empty templates sends templateId=null", async () => {
    const w = mountModal({ templates: [], caseName: "R39-D" });
    const submitBtn = w.find("[data-testid='form-gen-submit-btn']");
    await submitBtn.trigger("click");

    const events = w.emitted("submit")!;
    expect(events).toHaveLength(1);
    expect(events[0][0]).toMatchObject({ templateId: null });
  });
});
