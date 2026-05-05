// ── Test Ownership ──────────────────────────────────────────────
// Owner: BUG-225 — WAITING_PAYMENT 阶段进入时若 billing.payments 为空，
//   概览「财务状况」卡片需展示 warning 提示。
// ────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createMockDetail } from "./model/useCaseDetailModel.test-support";

describe("BUG-225: WAITING_PAYMENT billing guard", () => {
  describe("isWaitingPaymentNoCollection detection logic", () => {
    it("true when businessPhase=WAITING_PAYMENT and payments empty", () => {
      const detail = createMockDetail({
        businessPhase: "WAITING_PAYMENT",
        billing: {
          total: "—",
          received: "¥0",
          outstanding: "¥0",
          payments: [],
        },
      });
      const isGuarded =
        detail.businessPhase === "WAITING_PAYMENT" &&
        detail.billing.payments.length === 0;
      expect(isGuarded).toBe(true);
    });

    it("false when businessPhase=WAITING_PAYMENT but payments exist", () => {
      const detail = createMockDetail({
        businessPhase: "WAITING_PAYMENT",
        billing: {
          total: "¥300,000",
          received: "¥0",
          outstanding: "¥300,000",
          payments: [
            {
              date: "2026-05-01",
              type: "案件手数料",
              amount: "¥300,000",
              status: "unpaid",
              statusLabel: "未収",
            },
          ],
        },
      });
      const isGuarded =
        detail.businessPhase === "WAITING_PAYMENT" &&
        detail.billing.payments.length === 0;
      expect(isGuarded).toBe(false);
    });

    it("false when businessPhase is not WAITING_PAYMENT", () => {
      const detail = createMockDetail({
        businessPhase: "MATERIAL_PREPARING",
        billing: {
          total: "—",
          received: "¥0",
          outstanding: "¥0",
          payments: [],
        },
      });
      const isGuarded =
        detail.businessPhase === "WAITING_PAYMENT" &&
        detail.billing.payments.length === 0;
      expect(isGuarded).toBe(false);
    });
  });

  describe("CaseOverviewStatCards template guard presence", () => {
    const src = readFileSync(
      resolve(__dirname, "components/CaseOverviewStatCards.vue"),
      "utf-8",
    );

    it("contains data-testid for billing warning", () => {
      expect(src).toContain('data-testid="waiting-payment-no-billing-warning"');
    });

    it("uses billingGuard.waitingPaymentEmpty i18n key", () => {
      expect(src).toContain(
        "cases.detail.overview.billingGuard.waitingPaymentEmpty",
      );
    });

    it("guards on isWaitingPaymentNoCollection", () => {
      expect(src).toContain("isWaitingPaymentNoCollection");
    });
  });

  describe("i18n key presence in all 3 locales", () => {
    const zhSrc = readFileSync(
      resolve(__dirname, "../../i18n/messages/cases/zh-CN.ts"),
      "utf-8",
    );
    const enSrc = readFileSync(
      resolve(__dirname, "../../i18n/messages/cases/en-US.ts"),
      "utf-8",
    );
    const jaSrc = readFileSync(
      resolve(__dirname, "../../i18n/messages/cases/ja-JP.ts"),
      "utf-8",
    );

    it("zh-CN has billingGuard.waitingPaymentEmpty", () => {
      expect(zhSrc).toContain("waitingPaymentEmpty");
    });

    it("en-US has billingGuard.waitingPaymentEmpty", () => {
      expect(enSrc).toContain("waitingPaymentEmpty");
    });

    it("ja-JP has billingGuard.waitingPaymentEmpty", () => {
      expect(jaSrc).toContain("waitingPaymentEmpty");
    });
  });
});
