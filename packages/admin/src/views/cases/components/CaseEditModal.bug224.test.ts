// ── Test Ownership ──────────────────────────────────────────────
// Owner: BUG-224 — CaseEditModal 扩展到 server 支持的 7 字段，
//   删除 agency/memo（无 server 支持），保留 caseName。
// Locks: 所有 8 字段提交后都进入 save 事件的 payload，
//   agency/memo 不再出现在表单或事件中。
// Does NOT test: CaseDetailView 整体挂载、updateCaseFields 链路。
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseEditModal from "./CaseEditModal.vue";
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

const ALL_FIELD_IDS = [
  "case-edit-caseName",
  "case-edit-dueAt",
  "case-edit-acceptedAt",
  "case-edit-riskLevel",
  "case-edit-ownerUserId",
  "case-edit-assistantUserId",
  "case-edit-groupId",
  "case-edit-priority",
] as const;

const REMOVED_FIELD_IDS = ["case-edit-agency", "case-edit-memo"] as const;

describe("CaseEditModal (BUG-224)", () => {
  it("renders all 8 server-supported fields when open", () => {
    const w = mountModal();
    for (const id of ALL_FIELD_IDS) {
      expect(w.find(`#${id}`).exists(), `expected #${id} to exist`).toBe(true);
    }
  });

  it("does not render removed agency/memo fields", () => {
    const w = mountModal();
    for (const id of REMOVED_FIELD_IDS) {
      expect(w.find(`#${id}`).exists(), `expected #${id} to NOT exist`).toBe(
        false,
      );
    }
  });

  it("does not render when open is false", () => {
    const w = mountModal({ open: false });
    expect(w.find("[data-testid='case-edit-modal-backdrop']").exists()).toBe(
      false,
    );
  });

  it("pre-fills caseName from prop", () => {
    const w = mountModal({ caseName: "テスト案件" });
    const input = w.find("#case-edit-caseName");
    expect((input.element as HTMLInputElement).value).toBe("テスト案件");
  });

  it("pre-fills groupId from prop", () => {
    const w = mountModal({ groupId: "tokyo" });
    const input = w.find("#case-edit-groupId");
    expect((input.element as HTMLInputElement).value).toBe("tokyo");
  });

  it("emits save with all 8 fields in payload", async () => {
    const w = mountModal();

    await w.find("#case-edit-caseName").setValue("新案件名");
    await w.find("#case-edit-dueAt").setValue("2026-07-01");
    await w.find("#case-edit-acceptedAt").setValue("2026-01-15");
    await w.find("#case-edit-riskLevel").setValue("high");
    await w.find("#case-edit-ownerUserId").setValue("user-001");
    await w.find("#case-edit-assistantUserId").setValue("user-002");
    await w.find("#case-edit-groupId").setValue("osaka");
    await w.find("#case-edit-priority").setValue("urgent");

    const buttons = w.findAll("button");
    const saveBtn = buttons.find(
      (b) => !b.attributes("disabled") && b.text().includes("保存"),
    );
    expect(saveBtn).toBeTruthy();
    await saveBtn!.trigger("click");

    const emitted = w.emitted("save");
    expect(emitted).toBeTruthy();
    expect(emitted!.length).toBe(1);

    const payload = emitted![0][0] as Record<string, string>;
    expect(payload).toEqual({
      caseName: "新案件名",
      dueAt: "2026-07-01",
      acceptedAt: "2026-01-15",
      riskLevel: "high",
      ownerUserId: "user-001",
      assistantUserId: "user-002",
      groupId: "osaka",
      priority: "urgent",
    });
  });

  it("payload does not contain agency or memo keys", async () => {
    const w = mountModal();
    await w.find("#case-edit-caseName").setValue("test");

    const buttons = w.findAll("button");
    const saveBtn = buttons.find((b) => b.text().includes("保存"));
    await saveBtn!.trigger("click");

    const payload = w.emitted("save")![0][0] as Record<string, unknown>;
    expect("agency" in payload).toBe(false);
    expect("memo" in payload).toBe(false);
  });

  it("trims whitespace in emitted values", async () => {
    const w = mountModal();
    await w.find("#case-edit-caseName").setValue("  spaced  ");
    await w.find("#case-edit-ownerUserId").setValue("  user-001  ");

    const saveBtn = w.findAll("button").find((b) => b.text().includes("保存"));
    await saveBtn!.trigger("click");

    const payload = w.emitted("save")![0][0] as Record<string, string>;
    expect(payload.caseName).toBe("spaced");
    expect(payload.ownerUserId).toBe("user-001");
  });

  it("disables all inputs while submitting", () => {
    const w = mountModal({ submitting: true });
    for (const id of ALL_FIELD_IDS) {
      const el = w.find(`#${id}`).element as HTMLInputElement;
      expect(el.disabled, `expected #${id} to be disabled`).toBe(true);
    }
  });

  describe("i18n field labels", () => {
    for (const locale of ["zh-CN", "ja-JP", "en-US"] as const) {
      it(`all field labels are translated in ${locale}`, () => {
        const w = mountModal({}, locale);
        const labels = w
          .findAll(".case-edit-modal__label")
          .map((l) => l.text());
        expect(labels.length).toBe(8);
        for (const label of labels) {
          expect(label.length).toBeGreaterThan(0);
          expect(label).not.toContain("cases.detail.editModal.fields.");
        }
      });
    }
  });
});
