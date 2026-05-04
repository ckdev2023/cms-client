// ── Test Ownership ──────────────────────────────────────────────
// Owner: R30-N — close reason modal data backfill rendering.
// Covers: modal shows closeReason even when failureCloseout is null,
//   fallback text when neither is available, closedAt display.
// ────────────────────────────────────────────────────────────────

import { describe, it, expect, afterEach } from "vitest";
import { mount, VueWrapper } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseCloseReasonModal from "./CaseCloseReasonModal.vue";
import casesZhCN from "../../../i18n/messages/cases/zh-CN";
import casesEnUS from "../../../i18n/messages/cases/en-US";
import casesJaJP from "../../../i18n/messages/cases/ja-JP";

const BUTTON_STUB = {
  template: '<button v-bind="$attrs"><slot /></button>',
  inheritAttrs: true,
};

function makeI18n(locale = "zh-CN") {
  return createI18n({
    legacy: false,
    locale,
    messages: {
      "zh-CN": { cases: casesZhCN },
      "en-US": { cases: casesEnUS },
      "ja-JP": { cases: casesJaJP },
    },
  });
}

let wrapper: VueWrapper | null = null;

function mountModal(overrides: Record<string, unknown> = {}, locale = "zh-CN") {
  const w = mount(CaseCloseReasonModal, {
    global: {
      plugins: [makeI18n(locale)],
      stubs: { Teleport: true, Button: BUTTON_STUB },
    },
    props: {
      open: true,
      businessPhase: "CLOSED_FAILED",
      ...overrides,
    },
    attachTo: document.body,
  });
  wrapper = w;
  return w;
}

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
});

describe("CaseCloseReasonModal data backfill (R30-N)", () => {
  describe("failure section with closeReason only (no failureCloseout)", () => {
    it("shows failure section when closeReason is present even without failureCloseout", () => {
      const w = mountModal({
        failureCloseout: null,
        closeReason: "顧客都合による中止",
      });
      const section = w.find("[data-testid='close-reason-modal-failure']");
      expect(section.exists()).toBe(true);
      expect(section.text()).toContain("顧客都合による中止");
    });

    it("does not show failureCloseout reason code when failureCloseout is null", () => {
      const w = mountModal({
        failureCloseout: null,
        closeReason: "テスト理由",
      });
      const section = w.find("[data-testid='close-reason-modal-failure']");
      const dds = section.findAll("dd");
      expect(dds.length).toBe(1);
      expect(dds[0].text()).toBe("テスト理由");
    });
  });

  describe("failure section with both failureCloseout and closeReason", () => {
    it("shows both reason code and close reason text", () => {
      const w = mountModal({
        failureCloseout: {
          isFailurePath: true,
          reasonCode: "VISA_REJECTED",
          reasonLabel: "签证拒否",
          canDirectClose: true,
          closeReasonRequired: false,
        },
        closeReason: "入管から拒否通知受領",
      });
      const section = w.find("[data-testid='close-reason-modal-failure']");
      expect(section.exists()).toBe(true);
      const dds = section.findAll("dd");
      expect(dds.length).toBe(2);
    });
  });

  describe("fallback when no data", () => {
    it("shows noCloseReasonRecorded when neither failureCloseout nor closeReason exist", () => {
      const w = mountModal({
        failureCloseout: null,
        closeReason: null,
      });
      const empty = w.find(".close-reason-modal__empty");
      expect(empty.exists()).toBe(true);
      expect(empty.text()).toBe("未记录关闭原因。");
    });

    it("does not show failure section when both are null", () => {
      const w = mountModal({
        failureCloseout: null,
        closeReason: null,
      });
      const section = w.find("[data-testid='close-reason-modal-failure']");
      expect(section.exists()).toBe(false);
    });
  });

  describe("closedAt display", () => {
    it("shows closedAt when provided", () => {
      const w = mountModal({
        closedAt: "2026/04/20 10:30",
        closeReason: "テスト",
      });
      const metaItems = w.findAll(".close-reason-modal__meta-item dd");
      expect(metaItems[0].text()).toBe("2026/04/20 10:30");
    });

    it("shows dash when closedAt is null", () => {
      const w = mountModal({
        closedAt: null,
        closeReason: "テスト",
      });
      const metaItems = w.findAll(".close-reason-modal__meta-item dd");
      expect(metaItems[0].text()).toBe("—");
    });
  });

  describe("i18n: noCloseReasonRecorded across locales", () => {
    it("en-US", () => {
      const w = mountModal(
        { failureCloseout: null, closeReason: null },
        "en-US",
      );
      const empty = w.find(".close-reason-modal__empty");
      expect(empty.text()).toBe("No close reason was recorded.");
    });

    it("ja-JP", () => {
      const w = mountModal(
        { failureCloseout: null, closeReason: null },
        "ja-JP",
      );
      const empty = w.find(".close-reason-modal__empty");
      expect(empty.text()).toBe("クローズ理由は記録されていません。");
    });
  });

  describe("success closeout fallback", () => {
    it("shows noCloseReasonRecorded when successCloseout is null for CLOSED_SUCCESS", () => {
      const w = mountModal({
        businessPhase: "CLOSED_SUCCESS",
        successCloseout: null,
        failureCloseout: null,
        closeReason: null,
      });
      const empty = w.find(".close-reason-modal__empty");
      expect(empty.exists()).toBe(true);
      expect(empty.text()).toBe("未记录关闭原因。");
    });
  });
});
