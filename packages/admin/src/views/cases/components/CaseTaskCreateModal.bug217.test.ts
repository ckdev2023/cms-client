import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseTaskCreateModal from "./CaseTaskCreateModal.vue";
import casesZhCN from "../../../i18n/messages/cases/zh-CN";
import casesJaJP from "../../../i18n/messages/cases/ja-JP";
import casesEnUS from "../../../i18n/messages/cases/en-US";

const BUTTON_STUB = {
  template:
    "<button @click='$emit(\"click\")' :disabled='disabled'><slot /></button>",
  emits: ["click"],
  props: ["variant", "tone", "size", "disabled"],
};

function makeI18n(locale = "zh-CN") {
  return createI18n({
    legacy: false,
    locale,
    messages: {
      "zh-CN": { cases: casesZhCN },
      "ja-JP": { cases: casesJaJP },
      "en-US": { cases: casesEnUS },
    },
  });
}

function mountModal(overrides: Record<string, unknown> = {}, locale = "zh-CN") {
  return mount(CaseTaskCreateModal, {
    global: {
      plugins: [makeI18n(locale)],
      stubs: { Teleport: true, Button: BUTTON_STUB },
    },
    props: {
      open: true,
      submitting: false,
      ...overrides,
    },
  });
}

describe("CaseTaskCreateModal (BUG-217)", () => {
  it("renders all form fields when open", () => {
    const w = mountModal();
    expect(w.find("#task-create-title").exists()).toBe(true);
    expect(w.find("#task-create-description").exists()).toBe(true);
    expect(w.find("#task-create-priority").exists()).toBe(true);
    expect(w.find("#task-create-dueAt").exists()).toBe(true);
    expect(w.find("#task-create-assigneeUserId").exists()).toBe(true);
  });

  it("does not render when open is false", () => {
    const w = mountModal({ open: false });
    expect(w.find("[data-testid='task-create-modal']").exists()).toBe(false);
  });

  it("shows validation error when submitting with empty title", async () => {
    const w = mountModal();
    const buttons = w.findAll("button");
    const submitBtn = buttons.find((b) => b.text().includes("创建"));
    expect(submitBtn).toBeTruthy();
    await submitBtn!.trigger("click");

    expect(w.find(".task-create-modal__error").exists()).toBe(true);
    expect(w.emitted("submit")).toBeFalsy();
  });

  it("emits submit with correct payload including caseId-independent fields", async () => {
    const w = mountModal();

    const titleInput = w.find("#task-create-title");
    await titleInput.setValue("テスト用タスク");

    const descInput = w.find("#task-create-description");
    await descInput.setValue("タスクの説明");

    const prioritySelect = w.find("#task-create-priority");
    await prioritySelect.setValue("high");

    const dueInput = w.find("#task-create-dueAt");
    await dueInput.setValue("2026-06-01");

    const assigneeInput = w.find("#task-create-assigneeUserId");
    await assigneeInput.setValue("user-abc");

    const buttons = w.findAll("button");
    const submitBtn = buttons.find((b) => b.text().includes("创建"));
    await submitBtn!.trigger("click");

    const emitted = w.emitted("submit");
    expect(emitted).toBeTruthy();
    expect(emitted![0]![0]).toEqual({
      title: "テスト用タスク",
      description: "タスクの説明",
      priority: "high",
      dueAt: "2026-06-01",
      assigneeUserId: "user-abc",
    });
  });

  it("emits close when close button is clicked", async () => {
    const w = mountModal();
    const closeBtn = w.find(".task-create-modal__close");
    await closeBtn.trigger("click");
    expect(w.emitted("close")).toBeTruthy();
  });

  it("emits close when cancel button is clicked", async () => {
    const w = mountModal();
    const buttons = w.findAll("button");
    const cancelBtn = buttons.find((b) => b.text().includes("取消"));
    expect(cancelBtn).toBeTruthy();
    await cancelBtn!.trigger("click");
    expect(w.emitted("close")).toBeTruthy();
  });

  it("priority select defaults to 'normal'", () => {
    const w = mountModal();
    const select = w.find<HTMLSelectElement>("#task-create-priority");
    expect(select.element.value).toBe("normal");
  });

  it("renders 4 priority options", () => {
    const w = mountModal();
    const options = w.findAll("#task-create-priority option");
    expect(options.length).toBe(4);
  });

  it("clears validation error on title input", async () => {
    const w = mountModal();
    const buttons = w.findAll("button");
    const submitBtn = buttons.find((b) => b.text().includes("创建"));
    await submitBtn!.trigger("click");
    expect(w.find(".task-create-modal__error").exists()).toBe(true);

    const titleInput = w.find("#task-create-title");
    await titleInput.setValue("a");
    expect(w.find(".task-create-modal__error").exists()).toBe(false);
  });

  it("renders correctly in ja-JP locale", () => {
    const w = mountModal({}, "ja-JP");
    const title = w.find(".task-create-modal__title");
    expect(title.text()).toBe("タスクを追加");
  });

  it("renders correctly in en-US locale", () => {
    const w = mountModal({}, "en-US");
    const title = w.find(".task-create-modal__title");
    expect(title.text()).toBe("Add Task");
  });

  it("every input has id, name, and a matching label[for]", () => {
    const w = mountModal();
    const ids = [
      "task-create-title",
      "task-create-description",
      "task-create-priority",
      "task-create-dueAt",
      "task-create-assigneeUserId",
    ];
    for (const id of ids) {
      const control = w.find(`#${id}`);
      expect(control.exists(), `control #${id} should exist`).toBe(true);
      expect(control.attributes("name")).toBeTruthy();

      const label = w.find(`label[for="${id}"]`);
      expect(label.exists(), `label[for="${id}"] should exist`).toBe(true);
    }
  });
});
