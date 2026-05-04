// ── Test Ownership ──────────────────────────────────────────────
// Owner: R30-K — CaseEditModal date fields backfill YYYY-MM-DD
// Locks: dueAt / acceptedAt props in YYYY-MM-DD format correctly
//   populate the DateInput values; re-opening the modal resyncs.
// ────────────────────────────────────────────────────────────────

import { afterEach, beforeEach, describe, expect, it } from "vitest";
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

function mountModal(props: Record<string, unknown> = {}, locale = "zh-CN") {
  return mount(CaseEditModal, {
    global: {
      plugins: [makeI18n(locale)],
      stubs: { Teleport: true, Button: BUTTON_STUB },
    },
    props: { open: true, submitting: false, ...props },
  });
}

beforeEach(() => {
  registerUserAliases([{ id: "u1", displayName: "U1" }]);
  registerGroupAliases([{ id: "g1", name: "G1" }]);
});

afterEach(() => {
  clearUserAliases();
  clearGroupAliases();
});

describe("CaseEditModal date backfill (R30-K)", () => {
  it("populates dueAt DateInput with YYYY-MM-DD value", () => {
    const w = mountModal({ dueAt: "2026-09-01" });
    const input = w.find("#case-edit-dueAt");
    expect(input.exists()).toBe(true);
    expect((input.element as HTMLInputElement).value).toBe("2026-09-01");
  });

  it("populates acceptedAt DateInput with YYYY-MM-DD value", () => {
    const w = mountModal({ acceptedAt: "2026-04-15" });
    const input = w.find("#case-edit-acceptedAt");
    expect(input.exists()).toBe(true);
    expect((input.element as HTMLInputElement).value).toBe("2026-04-15");
  });

  it("handles empty dueAt gracefully", () => {
    const w = mountModal({ dueAt: "" });
    const input = w.find("#case-edit-dueAt");
    expect((input.element as HTMLInputElement).value).toBe("");
  });

  it("handles empty acceptedAt gracefully", () => {
    const w = mountModal({ acceptedAt: "" });
    const input = w.find("#case-edit-acceptedAt");
    expect((input.element as HTMLInputElement).value).toBe("");
  });

  it("re-opening the modal resyncs date values from props", async () => {
    const w = mountModal({ dueAt: "2026-09-01", acceptedAt: "2026-04-15" });

    expect((w.find("#case-edit-dueAt").element as HTMLInputElement).value).toBe(
      "2026-09-01",
    );

    await w.setProps({ open: false });
    await w.setProps({
      open: true,
      dueAt: "2027-01-10",
      acceptedAt: "2026-12-25",
    });

    expect((w.find("#case-edit-dueAt").element as HTMLInputElement).value).toBe(
      "2027-01-10",
    );
    expect(
      (w.find("#case-edit-acceptedAt").element as HTMLInputElement).value,
    ).toBe("2026-12-25");
  });

  it("emitted save payload contains YYYY-MM-DD values", async () => {
    const w = mountModal({ dueAt: "2026-09-01", acceptedAt: "2026-04-15" });
    const footerButtons = w.findAll(".case-edit-modal__footer button");
    const lastBtn = footerButtons[footerButtons.length - 1];
    await lastBtn.trigger("click");

    const saveEvents = w.emitted("save");
    expect(saveEvents).toBeDefined();
    expect(saveEvents!.length).toBe(1);
    const [fields] = saveEvents![0] as [Record<string, string>];
    expect(fields.dueAt).toBe("2026-09-01");
    expect(fields.acceptedAt).toBe("2026-04-15");
  });
});
