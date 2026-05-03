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

const USER_PICKER_STUB = {
  template:
    '<input :id="id" :name="name" :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  props: ["modelValue", "disabled", "id", "name", "placeholder"],
  emits: ["update:modelValue"],
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
      stubs: {
        Teleport: true,
        Button: BUTTON_STUB,
        UserPicker: USER_PICKER_STUB,
      },
    },
    props: {
      open: true,
      submitting: false,
      ...overrides,
    },
  });
}

describe("CaseTaskCreateModal (BUG-R27-E) error bar", () => {
  it("shows role=alert error bar when errorMessageKey is set", () => {
    const w = mountModal({
      errorMessageKey: "cases.writeErrors.taskInvalidAssigneeId",
    });
    const alert = w.find("[role='alert']");
    expect(alert.exists()).toBe(true);
    expect(alert.text()).toBe("负责人 ID 格式无效，请选择有效的负责人。");
  });

  it("does not show error bar when errorMessageKey is null", () => {
    const w = mountModal({ errorMessageKey: null });
    expect(w.find("[role='alert']").exists()).toBe(false);
  });

  it("does not show error bar when errorMessageKey is not provided", () => {
    const w = mountModal();
    expect(w.find("[role='alert']").exists()).toBe(false);
  });

  it("renders taskCreateFailed message in zh-CN", () => {
    const w = mountModal({
      errorMessageKey: "cases.writeErrors.taskCreateFailed",
    });
    const alert = w.find("[role='alert']");
    expect(alert.text()).toBe("任务创建失败，请稍后重试。");
  });

  it("renders taskAssigneeNotFound message in zh-CN", () => {
    const w = mountModal({
      errorMessageKey: "cases.writeErrors.taskAssigneeNotFound",
    });
    const alert = w.find("[role='alert']");
    expect(alert.text()).toBe("指定的负责人不存在，请重新选择。");
  });

  it("renders error message in ja-JP locale", () => {
    const w = mountModal(
      { errorMessageKey: "cases.writeErrors.taskCreateFailed" },
      "ja-JP",
    );
    const alert = w.find("[role='alert']");
    expect(alert.exists()).toBe(true);
    expect(alert.text().length).toBeGreaterThan(0);
  });

  it("renders error message in en-US locale", () => {
    const w = mountModal(
      { errorMessageKey: "cases.writeErrors.taskCreateFailed" },
      "en-US",
    );
    const alert = w.find("[role='alert']");
    expect(alert.exists()).toBe(true);
    expect(alert.text()).toBe("Failed to create task. Please try again later.");
  });

  it("keeps form field values when error is shown (submitting=false)", async () => {
    const w = mountModal();

    await w.find("#task-create-title").setValue("テスト用タスク");
    await w.find("#task-create-description").setValue("説明文");
    await w.find("#task-create-priority").setValue("high");
    await w.find("#task-create-dueAt").setValue("2026-06-01");
    await w.find("#task-create-assigneeUserId").setValue("user-abc");

    await w.setProps({
      errorMessageKey: "cases.writeErrors.taskInvalidAssigneeId",
      submitting: false,
    });

    expect(
      (w.find("#task-create-title").element as HTMLInputElement).value,
    ).toBe("テスト用タスク");
    expect(
      (w.find("#task-create-description").element as HTMLTextAreaElement).value,
    ).toBe("説明文");
    expect(
      (w.find("#task-create-priority").element as HTMLSelectElement).value,
    ).toBe("high");
    expect(
      (w.find("#task-create-dueAt").element as HTMLInputElement).value,
    ).toBe("2026-06-01");
    expect(
      (w.find("#task-create-assigneeUserId").element as HTMLInputElement).value,
    ).toBe("user-abc");

    const alert = w.find("[role='alert']");
    expect(alert.exists()).toBe(true);
  });

  it("has data-testid on the error element", () => {
    const w = mountModal({
      errorMessageKey: "cases.writeErrors.taskCreateFailed",
    });
    expect(w.find("[data-testid='task-create-server-error']").exists()).toBe(
      true,
    );
  });

  it("error bar disappears when errorMessageKey is cleared", async () => {
    const w = mountModal({
      errorMessageKey: "cases.writeErrors.taskCreateFailed",
    });
    expect(w.find("[role='alert']").exists()).toBe(true);

    await w.setProps({ errorMessageKey: null });
    expect(w.find("[role='alert']").exists()).toBe(false);
  });
});
