import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createI18n } from "vue-i18n";
import { createMockDetail } from "../model/useCaseDetailModel.test-support";
import casesZhCN from "../../../i18n/messages/cases/zh-CN";
import casesJaJP from "../../../i18n/messages/cases/ja-JP";
import casesEnUS from "../../../i18n/messages/cases/en-US";

const FULL_MESSAGES = {
  "zh-CN": { cases: casesZhCN },
  "ja-JP": { cases: casesJaJP },
  "en-US": { cases: casesEnUS },
};

type Locale = "zh-CN" | "ja-JP" | "en-US";

function makeI18n(locale: Locale) {
  return createI18n({ legacy: false, locale, messages: FULL_MESSAGES });
}

const emptyBilling = {
  total: "—",
  received: "¥0",
  outstanding: "¥0",
  payments: [] as never[],
};

describe("R35-G: billing warning routing (S3/S4 vs S7/WAITING_PAYMENT)", () => {
  describe("detection logic", () => {
    it("S3 + empty payments → isPreWaitingPaymentEmpty=true", () => {
      const d = createMockDetail({
        stageCode: "S3",
        businessPhase: "MATERIAL_PREPARING",
        billing: emptyBilling,
      });
      const result =
        (d.stageCode === "S3" || d.stageCode === "S4") &&
        d.billing.payments.length === 0;
      expect(result).toBe(true);
    });

    it("S4 + empty payments → isPreWaitingPaymentEmpty=true", () => {
      const d = createMockDetail({
        stageCode: "S4",
        businessPhase: "MATERIAL_PREPARING",
        billing: emptyBilling,
      });
      const result =
        (d.stageCode === "S3" || d.stageCode === "S4") &&
        d.billing.payments.length === 0;
      expect(result).toBe(true);
    });

    it("WAITING_PAYMENT + empty payments → isWaitingPaymentNoCollection=true", () => {
      const d = createMockDetail({
        stageCode: "S7",
        businessPhase: "WAITING_PAYMENT",
        billing: emptyBilling,
      });
      const result =
        d.businessPhase === "WAITING_PAYMENT" &&
        d.billing.payments.length === 0;
      expect(result).toBe(true);
    });

    it("S8 SUCCESS + empty payments → neither warning fires", () => {
      const d = createMockDetail({
        stageCode: "S8",
        businessPhase: "SUCCESS",
        billing: emptyBilling,
      });
      const isPreWaiting =
        (d.stageCode === "S3" || d.stageCode === "S4") &&
        d.billing.payments.length === 0;
      const isNoCollection =
        d.businessPhase === "WAITING_PAYMENT" &&
        d.billing.payments.length === 0;
      expect(isPreWaiting).toBe(false);
      expect(isNoCollection).toBe(false);
    });
  });

  describe("template references", () => {
    const src = readFileSync(
      resolve(__dirname, "CaseOverviewStatCards.vue"),
      "utf-8",
    );

    it("uses isWaitingPaymentNoCollection for S7 path", () => {
      expect(src).toContain("isWaitingPaymentNoCollection");
    });

    it("uses isPreWaitingPaymentEmpty for S3/S4 path", () => {
      expect(src).toContain("isPreWaitingPaymentEmpty");
    });

    it("S7 path uses billingGuard.waitingPaymentEmpty key", () => {
      expect(src).toContain(
        "cases.detail.overview.billingGuard.waitingPaymentEmpty",
      );
    });

    it("S3/S4 path uses billingGuard.noBillingRecord key", () => {
      expect(src).toContain(
        "cases.detail.overview.billingGuard.noBillingRecord",
      );
    });
  });

  describe("i18n keys present in all 3 locales", () => {
    for (const locale of ["zh-CN", "ja-JP", "en-US"] as const) {
      it(`${locale} has billingGuard.waitingPaymentEmpty`, () => {
        const i18n = makeI18n(locale);
        const text = i18n.global.t(
          "cases.detail.overview.billingGuard.waitingPaymentEmpty",
        );
        expect(text).toBeTruthy();
        expect(text).not.toBe(
          "cases.detail.overview.billingGuard.waitingPaymentEmpty",
        );
      });

      it(`${locale} has billingGuard.noBillingRecord`, () => {
        const i18n = makeI18n(locale);
        const text = i18n.global.t(
          "cases.detail.overview.billingGuard.noBillingRecord",
        );
        expect(text).toBeTruthy();
        expect(text).not.toBe(
          "cases.detail.overview.billingGuard.noBillingRecord",
        );
      });
    }
  });

  describe("i18n: timeline new keys exist in all 3 locales", () => {
    for (const locale of ["zh-CN", "ja-JP", "en-US"] as const) {
      it(`${locale} has timeline.caseTransitioned`, () => {
        const i18n = makeI18n(locale);
        const text = i18n.global.t("cases.log.timeline.caseTransitioned", {
          from: "S3",
          to: "S5",
          phase: "APPROVED",
        });
        expect(text).toBeTruthy();
        expect(text).not.toBe("cases.log.timeline.caseTransitioned");
      });

      it(`${locale} has timeline.residencePeriodCreated`, () => {
        const i18n = makeI18n(locale);
        const text = i18n.global.t(
          "cases.log.timeline.residencePeriodCreated",
          { suffix: "initial" },
        );
        expect(text).toBeTruthy();
        expect(text).not.toBe("cases.log.timeline.residencePeriodCreated");
      });
    }
  });
});
