// ── Test Ownership ──────────────────────────────────────────────
// Owner: BUG-153 — `CaseDetailView` 头部 phase chip 与 `CaseOverviewSidebar`
//   "业务阶段" 卡片 chip 同时渲染导致 `.ui-chip` 列表里 phase 文案重复 2 次
//   （chrome-devtools-mcp evidence: ["资料收集中","等待资料","等待资料"]）。
// Locks: `CaseOverviewSidebar` 不再渲染 phase chip；
//   1) phase 文案不出现在 sidebar HTML 里；
//   2) sidebar 不再消费 `cases.detail.overview.sidebar.phaseTitle` i18n key；
//   3) sidebar HTML 不再包含 `.ui-chip` 元素（其它信息走 `.overview-sidebar__*`）。
// Does NOT test: 头部 chip 视觉/tone（→ BUG-132 / BUG-141），亦不重复
//   `phaseDisplayLabel` 的 i18n 解析（→ BUG-133）。
// Rationale: 第十二轮走查 chrome-devtools-mcp 取证发现概览页 `.ui-chip`
//   片段里 phase 文案出现 2 次。源头是 sidebar 顶部一张 "业务阶段" Card
//   单独再套了一个 phase Chip，与 header phase Chip 重复展示。修复方向为
//   删除 sidebar 那张 Card；header chip 已经承担 phase 视觉表达。
// ────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseOverviewSidebar from "./CaseOverviewSidebar.vue";
import casesZhCN from "../../../i18n/messages/cases/zh-CN";
import casesJaJP from "../../../i18n/messages/cases/ja-JP";
import casesEnUS from "../../../i18n/messages/cases/en-US";
import { CASE_DETAIL_SAMPLES } from "../fixtures-detail";
import { getPhaseLabel } from "../constants";
import type { CaseDetail } from "../types-detail";

type Locale = "zh-CN" | "ja-JP" | "en-US";

const FULL_MESSAGES = {
  "zh-CN": { cases: casesZhCN },
  "ja-JP": { cases: casesJaJP },
  "en-US": { cases: casesEnUS },
};

function makeI18n(locale: Locale) {
  return createI18n({ legacy: false, locale, messages: FULL_MESSAGES });
}

function mountSidebar(detail: CaseDetail, locale: Locale = "zh-CN") {
  return mount(CaseOverviewSidebar, {
    props: { detail },
    global: {
      plugins: [makeI18n(locale)],
      stubs: {
        Card: { template: '<section class="stub-card"><slot /></section>' },
        Button: { template: "<button><slot /></button>" },
      },
    },
  });
}

describe("CaseOverviewSidebar BUG-153 — phase chip 不再二次渲染", () => {
  it("sidebar HTML 不包含任何 `.ui-chip` 元素（phase chip 已下线）", () => {
    const w = mountSidebar(CASE_DETAIL_SAMPLES.work);
    expect(w.find(".ui-chip").exists()).toBe(false);
  });

  it("sidebar HTML 不再含 `overview-sidebar__phase-row` 样式占位", () => {
    const w = mountSidebar(CASE_DETAIL_SAMPLES.work);
    expect(w.html()).not.toContain("overview-sidebar__phase-row");
  });

  for (const locale of ["zh-CN", "en-US", "ja-JP"] as const) {
    it(`${locale}: sidebar HTML 不含业务阶段 phaseTitle 文案`, () => {
      const w = mountSidebar(CASE_DETAIL_SAMPLES.work, locale);
      const i18n = makeI18n(locale);
      const phaseTitleText = i18n.global.t.bind(i18n.global)(
        "cases.detail.overview.sidebar.phaseTitle",
      );
      expect(w.html()).not.toContain(phaseTitleText);
    });
  }

  it("sidebar HTML 不直接展示 phase 业务标签（避免与 header chip 重复 2 次）", () => {
    const detail = CASE_DETAIL_SAMPLES.work;
    const phaseLabel = getPhaseLabel(detail.businessPhase);
    const w = mountSidebar(detail, "zh-CN");
    expect(w.html()).not.toContain(phaseLabel);
  });

  it("sidebar 仍渲染 risk / team / validation 三张 Card（仅删除 phase Card）", () => {
    const w = mountSidebar(CASE_DETAIL_SAMPLES.work);
    expect(w.findAll(".stub-card")).toHaveLength(3);
  });
});
