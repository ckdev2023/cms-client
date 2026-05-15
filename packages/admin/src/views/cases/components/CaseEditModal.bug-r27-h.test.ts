// ── Test Ownership ──────────────────────────────────────────────
// Owner: R27-H — CaseEditModal 优先级/风险等级 option 文案 i18n 化
// Locks: priority <option> 显示 i18n 翻译文案而非硬编码英文；
//   risk level <option> 同理；urgent 选项可用。
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

function mountModal(locale = "zh-CN") {
  return mount(CaseEditModal, {
    global: {
      plugins: [makeI18n(locale)],
      stubs: { Teleport: true, Button: BUTTON_STUB },
    },
    props: { open: true, submitting: false },
  });
}

function getPriorityOptionTexts(wrapper: ReturnType<typeof mountModal>) {
  return wrapper
    .find("#case-edit-priority")
    .findAll("option")
    .map((o) => ({ value: o.element.value, text: o.text().trim() }));
}

function getRiskOptionTexts(wrapper: ReturnType<typeof mountModal>) {
  return wrapper
    .find("#case-edit-riskLevel")
    .findAll("option")
    .map((o) => ({ value: o.element.value, text: o.text().trim() }));
}

beforeEach(() => {
  registerUserAliases([{ id: "u1", displayName: "U1" }]);
  registerGroupAliases([{ id: "g1", name: "G1" }]);
});

afterEach(() => {
  clearUserAliases();
  clearGroupAliases();
});

describe("CaseEditModal priority/risk i18n (R27-H)", () => {
  describe("zh-CN", () => {
    it("priority options show Chinese labels", () => {
      const w = mountModal("zh-CN");
      const opts = getPriorityOptionTexts(w);
      expect(opts).toEqual([
        { value: "", text: "--" },
        { value: "low", text: "低" },
        { value: "normal", text: "普通" },
        { value: "high", text: "高" },
        { value: "urgent", text: "紧急" },
      ]);
    });

    it("risk options show Chinese labels", () => {
      const w = mountModal("zh-CN");
      const opts = getRiskOptionTexts(w);
      expect(opts).toEqual([
        { value: "", text: "--" },
        { value: "low", text: "低风险" },
        { value: "none", text: "正常" },
        { value: "medium", text: "需关注" },
        { value: "high", text: "高风险" },
      ]);
    });
  });

  describe("ja-JP", () => {
    it("priority options show Japanese labels", () => {
      const w = mountModal("ja-JP");
      const opts = getPriorityOptionTexts(w);
      expect(opts).toEqual([
        { value: "", text: "--" },
        { value: "low", text: "低" },
        { value: "normal", text: "通常" },
        { value: "high", text: "高" },
        { value: "urgent", text: "緊急" },
      ]);
    });

    it("risk options show Japanese labels", () => {
      const w = mountModal("ja-JP");
      const opts = getRiskOptionTexts(w);
      expect(opts).toEqual([
        { value: "", text: "--" },
        { value: "low", text: "低リスク" },
        { value: "none", text: "正常" },
        { value: "medium", text: "要注意" },
        { value: "high", text: "高リスク" },
      ]);
    });
  });

  describe("en-US", () => {
    it("priority options show English labels", () => {
      const w = mountModal("en-US");
      const opts = getPriorityOptionTexts(w);
      expect(opts).toEqual([
        { value: "", text: "--" },
        { value: "low", text: "Low" },
        { value: "normal", text: "Normal" },
        { value: "high", text: "High" },
        { value: "urgent", text: "Urgent" },
      ]);
    });

    it("risk options show English labels", () => {
      const w = mountModal("en-US");
      const opts = getRiskOptionTexts(w);
      expect(opts).toEqual([
        { value: "", text: "--" },
        { value: "low", text: "Low" },
        { value: "none", text: "Normal" },
        { value: "medium", text: "Needs attention" },
        { value: "high", text: "High risk" },
      ]);
    });
  });

  it("no option contains raw i18n key path", () => {
    for (const locale of ["zh-CN", "ja-JP", "en-US"] as const) {
      const w = mountModal(locale);
      const allTexts = [
        ...getPriorityOptionTexts(w).map((o) => o.text),
        ...getRiskOptionTexts(w).map((o) => o.text),
      ];
      for (const text of allTexts) {
        expect(text).not.toContain("cases.detail.editModal.priorityOptions.");
        expect(text).not.toContain("cases.detail.editModal.riskOptions.");
      }
    }
  });

  it("priority select includes urgent option (aligned with CaseTaskCreateModal)", () => {
    const w = mountModal("zh-CN");
    const urgentOpt = getPriorityOptionTexts(w).find(
      (o) => o.value === "urgent",
    );
    expect(urgentOpt).toBeDefined();
    expect(urgentOpt!.text).toBe("紧急");
  });

  describe("cross-modal consistency: editModal.priorityOptions === tasks.createModal.priorities", () => {
    const PRIORITY_KEYS = ["low", "normal", "high", "urgent"] as const;

    const localeMap = {
      "zh-CN": casesZhCN,
      "ja-JP": casesJaJP,
      "en-US": casesEnUS,
    } as const;

    for (const [locale, dict] of Object.entries(localeMap)) {
      for (const key of PRIORITY_KEYS) {
        it(`${locale} — "${key}" label matches between editModal and taskCreateModal`, () => {
          const editLabel = dict.detail.editModal.priorityOptions[key];
          const taskLabel = dict.detail.tasks.createModal.priorities[key];
          expect(editLabel).toBe(taskLabel);
        });
      }
    }
  });
});
