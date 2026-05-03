// ── Test Ownership ──────────────────────────────────────────────
// Owner: BUG-R27-I — CaseEditModal 负责人/协办人/分组升级为 picker。
// Locks: 三个外键字段均为 <select>，不再是 type=text；
//   UUID alias 注册后 select 显示 displayName / 分组名；
//   未知 UUID 兜底显示 "—"。
// ────────────────────────────────────────────────────────────────

import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseEditModal from "./CaseEditModal.vue";
import casesZhCN from "../../../i18n/messages/cases/zh-CN";
import casesJaJP from "../../../i18n/messages/cases/ja-JP";
import casesEnUS from "../../../i18n/messages/cases/en-US";
import {
  registerUserAliases,
  clearUserAliases,
} from "../../../shared/model/useOrgUserOptions";
import {
  registerGroupAliases,
  clearGroupAliases,
} from "../../../shared/model/useGroupOptions";

const UUID_OWNER = "ef21fdd2-1ffc-4a27-8b47-a640d6bd021c";
const UUID_ASSISTANT = "11111111-2222-3333-4444-555555555555";
const UUID_GROUP = "aabbccdd-1111-2222-3333-444455556666";
const UUID_UNKNOWN = "99999999-0000-1111-2222-333344445555";

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
  return mount(CaseEditModal, {
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

afterEach(() => {
  clearUserAliases();
  clearGroupAliases();
});

describe("CaseEditModal FK picker upgrade (BUG-R27-I)", () => {
  it("ownerUserId is a <select>, not type=text", () => {
    const w = mountModal();
    const el = w.find("#case-edit-ownerUserId");
    expect(el.exists()).toBe(true);
    expect(el.element.tagName).toBe("SELECT");
  });

  it("assistantUserId is a <select>, not type=text", () => {
    const w = mountModal();
    const el = w.find("#case-edit-assistantUserId");
    expect(el.exists()).toBe(true);
    expect(el.element.tagName).toBe("SELECT");
  });

  it("groupId is a <select>, not type=text", () => {
    const w = mountModal();
    const el = w.find("#case-edit-groupId");
    expect(el.exists()).toBe(true);
    expect(el.element.tagName).toBe("SELECT");
  });

  it("ownerUserId select shows displayName when alias is registered", () => {
    registerUserAliases([{ id: UUID_OWNER, displayName: "Local Admin" }]);
    const w = mountModal({ ownerUserId: UUID_OWNER });
    const select = w.find("#case-edit-ownerUserId");
    const options = select.findAll("option");
    const matched = options.find((o) => o.element.value === UUID_OWNER);
    expect(matched).toBeTruthy();
    expect(matched!.text()).toBe("Local Admin");
  });

  it("assistantUserId select shows displayName when alias is registered", () => {
    registerUserAliases([{ id: UUID_ASSISTANT, displayName: "Staff User" }]);
    const w = mountModal({ assistantUserId: UUID_ASSISTANT });
    const select = w.find("#case-edit-assistantUserId");
    const options = select.findAll("option");
    const matched = options.find((o) => o.element.value === UUID_ASSISTANT);
    expect(matched).toBeTruthy();
    expect(matched!.text()).toBe("Staff User");
  });

  it('ownerUserId shows "—" for unknown UUID', () => {
    const w = mountModal({ ownerUserId: UUID_UNKNOWN });
    const select = w.find("#case-edit-ownerUserId");
    const options = select.findAll("option");
    const fallback = options.find((o) => o.element.value === UUID_UNKNOWN);
    expect(fallback).toBeTruthy();
    expect(fallback!.text()).toBe("—");
  });

  it("groupId select resolves UUID alias to localized group name (zh-CN)", () => {
    registerGroupAliases([{ id: UUID_GROUP, name: "東京一組" }]);
    const w = mountModal({ groupId: UUID_GROUP }, "zh-CN");
    const select = w.find("#case-edit-groupId");
    const selectedValue = (select.element as HTMLSelectElement).value;
    expect(selectedValue).toBe("tokyo-1");
    const selectedOption = select
      .findAll("option")
      .find((o) => o.element.value === "tokyo-1");
    expect(selectedOption).toBeTruthy();
    expect(selectedOption!.text()).toBe("东京一组");
  });

  it("groupId shows fallback label (not raw UUID) for unknown group", () => {
    const w = mountModal({ groupId: UUID_UNKNOWN }, "zh-CN");
    const select = w.find("#case-edit-groupId");
    const options = select.findAll("option");
    const fallback = options.find((o) => o.element.value === UUID_UNKNOWN);
    expect(fallback).toBeTruthy();
    expect(fallback!.text()).toBe("—");
  });

  it("save emits selected user UUID for ownerUserId", async () => {
    registerUserAliases([{ id: UUID_OWNER, displayName: "Admin" }]);
    const w = mountModal({ ownerUserId: UUID_OWNER });

    const saveBtn = w.findAll("button").find((b) => b.text().includes("保存"));
    await saveBtn!.trigger("click");

    const payload = w.emitted("save")![0][0] as Record<string, string>;
    expect(payload.ownerUserId).toBe(UUID_OWNER);
  });

  it("save emits resolved group value (catalog key)", async () => {
    registerGroupAliases([{ id: UUID_GROUP, name: "東京一組" }]);
    const w = mountModal({ groupId: UUID_GROUP }, "zh-CN");

    const saveBtn = w.findAll("button").find((b) => b.text().includes("保存"));
    await saveBtn!.trigger("click");

    const payload = w.emitted("save")![0][0] as Record<string, string>;
    expect(payload.groupId).toBe("tokyo-1");
  });

  it("jurisdictionAuthority remains a text input", () => {
    const w = mountModal();
    const el = w.find("#case-edit-jurisdictionAuthority");
    expect(el.exists()).toBe(true);
    expect(el.element.tagName).toBe("INPUT");
    expect((el.element as HTMLInputElement).type).toBe("text");
  });
});
