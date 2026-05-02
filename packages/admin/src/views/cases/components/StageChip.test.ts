// ── Test Ownership ──────────────────────────────────────────────
// Owner: BUG-182 — 统一 Cases List / Customer Detail Cases tab / Case Detail header
//   三处 stage 渲染粒度，防止再次出现「一处全文 / 一处 raw code / 一处双粒度」不一致口径。
// Locks: `<StageChip>` 按 `precision` 契约输出；tone 必须从 `CASE_STAGES[code].badge`
//   派生，与 `CaseDetailView.badgeToTone(detail.statusBadge)` 链路保持一致；
//   free-text stage（如遗留 fixture 的 zh-CN/ja-JP 文案）只走 neutral + 透传。
// Does NOT test: 三个父组件的真实 mount（由各自 *.test.ts / 走查脚本覆盖）。
// ────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import StageChip from "./StageChip.vue";

const MESSAGES = {
  "en-US": {
    cases: {
      constants: {
        stages: {
          S1: "Case opened",
          S2: "Collecting documents",
          S3: "Pending / Under review",
          S4: "Drafting forms",
          S5: "Pre-submission check",
          S6: "Ready to submit",
          S7: "Submitted, awaiting receipt",
          S8: "Awaiting result",
          S9: "Archived",
        },
      },
    },
  },
  "ja-JP": {
    cases: {
      constants: {
        stages: {
          S1: "案件開始",
          S2: "資料収集中",
          S9: "アーカイブ済み",
        },
      },
    },
  },
  "zh-CN": {
    cases: {
      constants: {
        stages: {
          S1: "刚开始办案",
          S2: "资料收集中",
          S9: "已归档",
        },
      },
    },
  },
};

type Locale = keyof typeof MESSAGES;

function makeI18n(locale: Locale = "en-US") {
  return createI18n({ legacy: false, locale, messages: MESSAGES });
}

function mountChip(
  props: Parameters<typeof mount<typeof StageChip>>[1] extends undefined
    ? Record<string, unknown>
    : NonNullable<Parameters<typeof mount<typeof StageChip>>[1]>["props"],
  locale: Locale = "en-US",
) {
  return mount(StageChip, {
    props,
    global: { plugins: [makeI18n(locale)] },
  });
}

describe("StageChip", () => {
  describe("precision=full (默认): Cases List / Customer Detail Cases tab 对齐口径", () => {
    it("S9 en-US 显示 `Archived`（不得残留 raw code）", () => {
      const w = mountChip({ code: "S9" });
      expect(w.text()).toBe("Archived");
      expect(w.text()).not.toContain("S9");
    });

    it("S2 ja-JP 显示 `資料収集中`", () => {
      const w = mountChip({ code: "S2" }, "ja-JP");
      expect(w.text()).toBe("資料収集中");
    });

    it("S1 zh-CN 显示 `刚开始办案`", () => {
      const w = mountChip({ code: "S1" }, "zh-CN");
      expect(w.text()).toBe("刚开始办案");
    });

    it("precision 缺省即 `full`", () => {
      const w = mountChip({ code: "S9", precision: undefined });
      expect(w.text()).toBe("Archived");
    });
  });

  describe("precision=short: Case Detail header 备选", () => {
    it("S9 仅展示 raw code", () => {
      const w = mountChip({ code: "S9", precision: "short" });
      expect(w.text()).toBe("S9");
    });
  });

  describe("precision=both: Case Detail header 主口径", () => {
    it("S1 en-US 输出 `S1 · Case opened`（code + label 同 Chip 内并列）", () => {
      const w = mountChip({ code: "S1", precision: "both" });
      expect(w.text()).toBe("S1 · Case opened");
    });

    it("S9 ja-JP 输出 `S9 · アーカイブ済み`", () => {
      const w = mountChip({ code: "S9", precision: "both" }, "ja-JP");
      expect(w.text()).toBe("S9 · アーカイブ済み");
    });

    it("free-text stage（非 S1..S9）在 both 模式下仅透传原文", () => {
      const w = mountChip({ code: "資料収集中", precision: "both" });
      expect(w.text()).toBe("資料収集中");
      expect(w.text()).not.toContain("·");
    });
  });

  describe("tone 派生：对齐 CASE_STAGES[code].badge → BADGE_TONE_MAP", () => {
    it("S9 → neutral", () => {
      const w = mountChip({ code: "S9" });
      expect(w.classes()).toContain("ui-chip--neutral");
    });

    it("S2 → success", () => {
      const w = mountChip({ code: "S2" });
      expect(w.classes()).toContain("ui-chip--success");
    });

    it("S3 → warning", () => {
      const w = mountChip({ code: "S3" });
      expect(w.classes()).toContain("ui-chip--warning");
    });

    it("S4 → primary", () => {
      const w = mountChip({ code: "S4" });
      expect(w.classes()).toContain("ui-chip--primary");
    });

    it("未知 code 回退 neutral（不抛错）", () => {
      const w = mountChip({ code: "UNKNOWN_CODE" });
      expect(w.classes()).toContain("ui-chip--neutral");
    });
  });

  describe("empty code 兜底", () => {
    it("空字符串使用默认 fallback `—`", () => {
      const w = mountChip({ code: "" });
      expect(w.text()).toBe("—");
    });

    it("null/undefined 使用默认 fallback `—`", () => {
      const w = mountChip({ code: null });
      expect(w.text()).toBe("—");
      const w2 = mountChip({ code: undefined });
      expect(w2.text()).toBe("—");
    });

    it("显式 fallback 覆盖默认", () => {
      const w = mountChip({ code: "", fallback: "未分配" });
      expect(w.text()).toBe("未分配");
    });
  });

  describe("dot 透传：Case Detail header `#badge` 插槽要求 dot 样式", () => {
    it("dot=true 渲染 Chip 圆点", () => {
      const w = mountChip({ code: "S9", precision: "both", dot: true });
      expect(w.classes()).toContain("ui-chip--dot");
      expect(w.find(".ui-chip__dot").exists()).toBe(true);
    });

    it("dot=false 不渲染圆点（Cases List / Customer Detail 默认口径）", () => {
      const w = mountChip({ code: "S9" });
      expect(w.classes()).not.toContain("ui-chip--dot");
      expect(w.find(".ui-chip__dot").exists()).toBe(false);
    });
  });

  describe("BUG-182 口径回归：三处页面互不漂移", () => {
    it("Cases List + Customer Detail Cases tab（precision=full）对同一 S9 输出完全一致", () => {
      const list = mountChip({ code: "S9", precision: "full" });
      const tab = mountChip({ code: "S9", precision: "full" });
      expect(list.text()).toBe(tab.text());
      expect(list.classes().sort()).toEqual(tab.classes().sort());
    });

    it("Case Detail header (precision=both) 与 Cases List (precision=full) 允许文案不同但 tone 必须一致", () => {
      const header = mountChip({ code: "S9", precision: "both", dot: true });
      const list = mountChip({ code: "S9", precision: "full" });
      expect(header.text()).not.toBe(list.text());
      expect(header.classes()).toContain("ui-chip--neutral");
      expect(list.classes()).toContain("ui-chip--neutral");
    });
  });
});
