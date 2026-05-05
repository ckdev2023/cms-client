// ── Test Ownership ──────────────────────────────────────────────
// Owner: BUG-236 — 终态「下一关键动作」区增加入口按钮：
//   - CLOSED_SUCCESS: 「查看结案记录」→ log tab + 「查看收费详情」→ billing tab
//   - CLOSED_FAILED:  「查看关闭原因」→ log tab + 「处理退款」→ billing tab
// ────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("BUG-236: CaseOverviewTab terminal action buttons", () => {
  const nextActionSrc = readFileSync(
    resolve(__dirname, "components/CaseOverviewNextAction.vue"),
    "utf-8",
  );
  const overviewSrc = readFileSync(
    resolve(__dirname, "components/CaseOverviewTab.vue"),
    "utf-8",
  );

  it("template contains terminal action buttons section", () => {
    expect(nextActionSrc).toContain(
      'data-testid="terminal-next-action-buttons"',
    );
  });

  it("has a viewCloseReason / viewResult button that opens close reason modal", () => {
    expect(nextActionSrc).toContain('data-testid="terminal-view-close-reason"');
    expect(nextActionSrc).toContain("emit('openCloseReason')");
    expect(overviewSrc).toContain("closeReasonModalOpen = true");
  });

  it("has a handleRefund / viewBilling button wired to switchTab('billing')", () => {
    expect(nextActionSrc).toContain('data-testid="terminal-view-billing"');
    expect(nextActionSrc).toContain("emit('switchTab', 'billing')");
  });

  it("uses correct i18n keys for CLOSED_SUCCESS actions", () => {
    expect(nextActionSrc).toContain("cases.detail.terminalActions.viewResult");
    expect(nextActionSrc).toContain("cases.detail.terminalActions.viewBilling");
  });

  it("uses correct i18n keys for CLOSED_FAILED actions", () => {
    expect(nextActionSrc).toContain(
      "cases.detail.terminalActions.viewCloseReason",
    );
    expect(nextActionSrc).toContain(
      "cases.detail.terminalActions.handleRefund",
    );
  });
});

describe("BUG-236: i18n key presence", () => {
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

  const REQUIRED_KEYS = [
    "viewCloseReason",
    "viewResult",
    "handleRefund",
    "viewBilling",
  ];

  for (const key of REQUIRED_KEYS) {
    it(`zh-CN has terminalActions.${key}`, () => {
      expect(zhSrc).toContain(key);
    });

    it(`en-US has terminalActions.${key}`, () => {
      expect(enSrc).toContain(key);
    });

    it(`ja-JP has terminalActions.${key}`, () => {
      expect(jaSrc).toContain(key);
    });
  }
});
