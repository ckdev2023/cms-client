import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseTaskCreateModal from "./CaseTaskCreateModal.vue";
import {
  registerUserAliases,
  clearUserAliases,
} from "../../../shared/model/useOrgUserOptions";
import casesZhCN from "../../../i18n/messages/cases/zh-CN";

const BUTTON_STUB = {
  template:
    "<button @click='$emit(\"click\")' :disabled='disabled'><slot /></button>",
  emits: ["click"],
  props: ["variant", "tone", "size", "disabled"],
};

const UUID_ALICE = "ef21fdd2-1ffc-4a27-8b47-a640d6bd021c";
const UUID_BOB = "11111111-2222-3333-4444-555555555555";

function makeI18n() {
  return createI18n({
    legacy: false,
    locale: "zh-CN",
    messages: { "zh-CN": { cases: casesZhCN } },
  });
}

function mountModal(overrides: Record<string, unknown> = {}) {
  return mount(CaseTaskCreateModal, {
    global: {
      plugins: [makeI18n()],
      stubs: { Teleport: true, Button: BUTTON_STUB },
    },
    props: {
      open: true,
      submitting: false,
      ...overrides,
    },
  });
}

afterEach(() => {
  clearUserAliases();
});

describe("CaseTaskCreateModal (BUG-R27-Q) assignee picker", () => {
  it("renders assignee field as a <select>, not <input type=text>", () => {
    registerUserAliases([{ id: UUID_ALICE, displayName: "Alice" }]);
    const w = mountModal();
    const assigneeInput = w.find(
      "input[data-testid='task-assignee-input'][type='text']",
    );
    expect(assigneeInput.exists()).toBe(false);

    const assigneeSelect = w.find("[data-testid='task-assignee-input']");
    expect(assigneeSelect.exists()).toBe(true);
    expect(assigneeSelect.element.tagName).toBe("SELECT");
  });

  it("shows registered user options in the assignee select", () => {
    registerUserAliases([
      { id: UUID_ALICE, displayName: "Alice" },
      { id: UUID_BOB, displayName: "Bob" },
    ]);
    const w = mountModal();
    const options = w
      .find("[data-testid='task-assignee-input']")
      .findAll("option");
    expect(options.some((o) => o.text() === "Alice")).toBe(true);
    expect(options.some((o) => o.text() === "Bob")).toBe(true);
  });

  it("emits submit with assigneeUserId when a user is selected", async () => {
    registerUserAliases([{ id: UUID_ALICE, displayName: "Alice" }]);
    const w = mountModal();

    await w.find("#task-create-title").setValue("Test Task");
    await w.find("[data-testid='task-assignee-input']").setValue(UUID_ALICE);

    await w.find("[data-testid='task-submit-btn']").trigger("click");

    const submitted = w.emitted("submit");
    expect(submitted).toBeTruthy();
    expect(submitted![0][0]).toMatchObject({ assigneeUserId: UUID_ALICE });
  });

  it("emits submit without assigneeUserId when no user is selected", async () => {
    registerUserAliases([{ id: UUID_ALICE, displayName: "Alice" }]);
    const w = mountModal();

    await w.find("#task-create-title").setValue("Test Task");

    await w.find("[data-testid='task-submit-btn']").trigger("click");

    const submitted = w.emitted("submit");
    expect(submitted).toBeTruthy();
    expect(submitted![0][0]).not.toHaveProperty("assigneeUserId");
  });

  it("has id and name attributes on the select element", () => {
    const w = mountModal();
    const select = w.find("[data-testid='task-assignee-input']");
    expect(select.attributes("id")).toBe("task-create-assigneeUserId");
    expect(select.attributes("name")).toBe("assigneeUserId");
  });
});
