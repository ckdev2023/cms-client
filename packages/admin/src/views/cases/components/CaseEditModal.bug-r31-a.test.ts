// ── Test Ownership ──────────────────────────────────────────────
// Owner: R31-A — riskLevel="low" 选项扩展与回填
// Locks: riskOptions 包含 low/normal/attention/high 四级；
//   props.riskLevel="low" 回填后 select.value 为 "low"；
//   save payload 正确携带 riskLevel="low"。
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

beforeEach(() => {
  registerUserAliases([{ id: "u1", displayName: "U1" }]);
  registerGroupAliases([{ id: "g1", name: "G1" }]);
});

afterEach(() => {
  clearUserAliases();
  clearGroupAliases();
});

describe("CaseEditModal riskLevel='low' backfill (R31-A)", () => {
  it("risk select includes low option with value='low'", () => {
    const w = mountModal();
    const opts = w
      .find("#case-edit-riskLevel")
      .findAll("option")
      .map((o) => o.element.value);
    expect(opts).toContain("low");
  });

  it("riskOptions has exactly 4 levels: low, normal, attention, high", () => {
    const w = mountModal();
    const opts = w
      .find("#case-edit-riskLevel")
      .findAll("option")
      .map((o) => o.element.value)
      .filter((v) => v !== "");
    expect(opts).toEqual(["low", "normal", "attention", "high"]);
  });

  for (const locale of ["zh-CN", "ja-JP", "en-US"] as const) {
    it(`props.riskLevel='low' pre-fills select.value in ${locale}`, () => {
      const w = mountModal({ riskLevel: "low" }, locale);
      const el = w.find("#case-edit-riskLevel").element as HTMLSelectElement;
      expect(el.value).toBe("low");
    });
  }

  it("save payload carries riskLevel='low' when pre-filled", async () => {
    const w = mountModal({ riskLevel: "low" });

    const saveBtn = w.findAll("button").find((b) => b.text().includes("保存"));
    expect(saveBtn).toBeTruthy();
    await saveBtn!.trigger("click");

    const emitted = w.emitted("save");
    expect(emitted).toBeTruthy();
    const payload = emitted![0][0] as Record<string, string>;
    expect(payload.riskLevel).toBe("low");
  });

  it("save payload carries riskLevel='low' when user selects low", async () => {
    const w = mountModal();

    await w.find("#case-edit-riskLevel").setValue("low");

    const saveBtn = w.findAll("button").find((b) => b.text().includes("保存"));
    await saveBtn!.trigger("click");

    const emitted = w.emitted("save");
    expect(emitted).toBeTruthy();
    const payload = emitted![0][0] as Record<string, string>;
    expect(payload.riskLevel).toBe("low");
  });

  it("re-opening modal with riskLevel='low' resets select to 'low'", async () => {
    const w = mountModal({ riskLevel: "low" });

    await w.find("#case-edit-riskLevel").setValue("high");
    expect(
      (w.find("#case-edit-riskLevel").element as HTMLSelectElement).value,
    ).toBe("high");

    await w.setProps({ open: false });
    await w.setProps({ open: true, riskLevel: "low" });

    expect(
      (w.find("#case-edit-riskLevel").element as HTMLSelectElement).value,
    ).toBe("low");
  });
});
