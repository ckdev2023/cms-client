// ── Test Ownership ──────────────────────────────────────────────
// Owner: R27-L (T7.2) — tablist ARIA tab pattern：
//   selected tab tabindex=0 / 其他=-1 + ArrowLeft/Right/Home/End 键盘导航。
// ────────────────────────────────────────────────────────────────

import { describe, it, expect, vi } from "vitest";
import { ref } from "vue";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CASE_DETAIL_TABS } from "./constants";
import type { CaseDetailTab } from "./types";
import { isTabAccessibleInTerminal } from "./model/useCaseDetailGuard";
import { useCaseDetailModel } from "./model/useCaseDetailModel";
import type { CaseRepository } from "./model/CaseRepository";
import {
  createMockAggregate,
  createMockDetail,
  flushFetch,
  ZERO_TAB_COUNTS,
} from "./model/useCaseDetailModel.test-support";

const templatePath = resolve(__dirname, "CaseDetailView.vue");
const src = readFileSync(templatePath, "utf-8");

const TAB_KEYS = CASE_DETAIL_TABS.map((t) => t.key);

// 复现 CaseDetailView.findNextAccessibleTab 算法
function findNextAccessibleTab(
  tabs: readonly { key: CaseDetailTab }[],
  fromIdx: number,
  direction: 1 | -1,
  isAccessible: (key: CaseDetailTab) => boolean,
): number {
  const len = tabs.length;
  for (let i = 1; i <= len; i++) {
    const candidate = (fromIdx + direction * i + len) % len;
    if (isAccessible(tabs[candidate].key)) return candidate;
  }
  return -1;
}

// ── §1  Template-level ARIA attribute contract ──────────────────

describe("CaseDetailView tablist — ARIA tabindex contract (R27-L)", () => {
  it("tab button 绑定 :tabindex，selected 为 0 / 其他为 -1", () => {
    expect(src).toContain(":tabindex=");
    expect(src).toMatch(/tabindex=["']?.*activeTab.*\?.*0.*:.*-1/s);
  });

  it("tab button 绑定 @keydown handler", () => {
    expect(src).toContain("@keydown=");
    expect(src).toContain("onTabKeydown");
  });

  it("tabindex 三元先判断 guard.isTabAccessible → 不可访问始终 -1", () => {
    expect(src).toMatch(/isTabAccessible.*\n?\s*\?\s*-1/s);
  });
});

describe("CaseDetailView tablist — ARIA role & attribute completeness", () => {
  it('tablist 容器声明 role="tablist"', () => {
    expect(src).toContain('role="tablist"');
  });

  it('每个 tab button 声明 role="tab"', () => {
    expect(src).toContain('role="tab"');
  });

  it("tab button 绑定 :aria-selected", () => {
    expect(src).toContain(":aria-selected=");
    expect(src).toMatch(/aria-selected=.*activeTab.*tab\.key/s);
  });

  it("tab button 绑定 :aria-controls → panel id", () => {
    expect(src).toContain(':aria-controls="`casePanel-${tab.key}`"');
  });

  it("tab button 绑定 :id → tab id", () => {
    expect(src).toContain(':id="`caseTab-${tab.key}`"');
  });

  it("tab button 绑定 :aria-disabled 对不可访问 tab", () => {
    expect(src).toContain(":aria-disabled=");
    expect(src).toMatch(/aria-disabled=.*isTabAccessible/s);
  });

  it('tabpanel 声明 role="tabpanel" 且 aria-labelledby 关联 tab id', () => {
    expect(src).toContain('role="tabpanel"');
    expect(src).toContain(':aria-labelledby="`caseTab-${activeTab}`"');
  });

  it("tablist 声明 aria-label", () => {
    expect(src).toMatch(/role="tablist"[\s\S]*?:aria-label=/);
  });
});

// ── §2  Model-level keyboard navigation ─────────────────────────

describe("CaseDetailView tablist — keyboard navigation logic (R27-L)", () => {
  function buildRepo() {
    const getDetailAggregate = vi.fn().mockResolvedValue(
      createMockAggregate(createMockDetail({ id: "CASE-TAB" }), {
        tabCounts: { ...ZERO_TAB_COUNTS },
      }),
    );

    return {
      getDetailAggregate,
      getDocumentItems: vi.fn().mockResolvedValue([]),
      getGeneratedDocuments: vi
        .fn()
        .mockResolvedValue({ templates: [], generated: [] }),
      getValidationData: vi.fn().mockResolvedValue({
        lastTime: "",
        blocking: [],
        warnings: [],
        info: [],
      }),
      getBillingData: vi.fn().mockResolvedValue({
        total: "—",
        received: "¥0",
        outstanding: "¥0",
        payments: [],
      }),
      getSubmissionPackages: vi.fn().mockResolvedValue([]),
      getDoubleReviewEntries: vi.fn().mockResolvedValue([]),
      getMessages: vi.fn().mockResolvedValue([]),
      getLogEntries: vi.fn().mockResolvedValue([]),
      getTasks: vi.fn().mockResolvedValue([]),
      getDeadlines: vi.fn().mockResolvedValue([]),
    } as unknown as CaseRepository;
  }

  it("默认 activeTab === 'overview'（第一个 tab）", async () => {
    const repo = buildRepo();
    const model = useCaseDetailModel(ref("CASE-TAB"), { repo });
    await flushFetch();

    expect(model.activeTab.value).toBe("overview");
  });

  it("switchTab 切换 activeTab", async () => {
    const repo = buildRepo();
    const model = useCaseDetailModel(ref("CASE-TAB"), { repo });
    await flushFetch();

    model.switchTab("documents");
    expect(model.activeTab.value).toBe("documents");
  });

  it("tabs 列表包含 10 个 tab 且顺序与 CASE_DETAIL_TABS 一致", () => {
    expect(CASE_DETAIL_TABS).toHaveLength(10);
    expect(TAB_KEYS).toEqual([
      "overview",
      "validation",
      "documents",
      "tasks",
      "info",
      "forms",
      "deadlines",
      "billing",
      "messages",
      "log",
    ]);
  });

  it("ArrowRight 逻辑：从 overview(idx=0) → validation(idx=1)", () => {
    const idx = findNextAccessibleTab(CASE_DETAIL_TABS, 0, 1, () => true);
    expect(CASE_DETAIL_TABS[idx].key).toBe("validation");
  });

  it("ArrowRight wrap：从 log(idx=9) → overview(idx=0)", () => {
    const idx = findNextAccessibleTab(
      CASE_DETAIL_TABS,
      CASE_DETAIL_TABS.length - 1,
      1,
      () => true,
    );
    expect(CASE_DETAIL_TABS[idx].key).toBe("overview");
  });

  it("ArrowLeft 逻辑：从 validation(idx=1) → overview(idx=0)", () => {
    const idx = findNextAccessibleTab(CASE_DETAIL_TABS, 1, -1, () => true);
    expect(CASE_DETAIL_TABS[idx].key).toBe("overview");
  });

  it("ArrowLeft wrap：从 overview(idx=0) → log(idx=9)", () => {
    const idx = findNextAccessibleTab(CASE_DETAIL_TABS, 0, -1, () => true);
    expect(CASE_DETAIL_TABS[idx].key).toBe("log");
  });

  it("Home → first tab (overview)", () => {
    const idx = findNextAccessibleTab(CASE_DETAIL_TABS, -1, 1, () => true);
    expect(CASE_DETAIL_TABS[idx].key).toBe("overview");
  });

  it("End → last tab (log)", () => {
    const idx = findNextAccessibleTab(
      CASE_DETAIL_TABS,
      CASE_DETAIL_TABS.length,
      -1,
      () => true,
    );
    expect(CASE_DETAIL_TABS[idx].key).toBe("log");
  });
});

// ── §3  Terminal-state guard skipping ───────────────────────────

describe("CaseDetailView tablist — guard-aware keyboard nav (terminal)", () => {
  const isAccessibleTerminal = (key: CaseDetailTab) =>
    isTabAccessibleInTerminal(key, true);

  it("非终态下所有 tab 均可访问", () => {
    for (const key of TAB_KEYS) {
      expect(isTabAccessibleInTerminal(key, false)).toBe(true);
    }
  });

  it("终态下仅 overview / documents / forms / log 可访问", () => {
    const accessible = TAB_KEYS.filter((k) =>
      isTabAccessibleInTerminal(k, true),
    );
    expect(accessible).toEqual(["overview", "documents", "forms", "log"]);
  });

  it("终态 ArrowRight 从 overview(0) 到 documents(2)", () => {
    const idx = findNextAccessibleTab(
      CASE_DETAIL_TABS,
      0,
      1,
      isAccessibleTerminal,
    );
    expect(CASE_DETAIL_TABS[idx].key).toBe("documents");
  });

  it("终态 ArrowRight 从 log(9) wrap 回 overview(0)", () => {
    const idx = findNextAccessibleTab(
      CASE_DETAIL_TABS,
      9,
      1,
      isAccessibleTerminal,
    );
    expect(CASE_DETAIL_TABS[idx].key).toBe("overview");
  });

  it("终态 ArrowLeft 从 log(9) 到 forms(5)", () => {
    const idx = findNextAccessibleTab(
      CASE_DETAIL_TABS,
      9,
      -1,
      isAccessibleTerminal,
    );
    expect(CASE_DETAIL_TABS[idx].key).toBe("forms");
  });

  it("终态 ArrowLeft 从 overview(0) wrap 回 log(9)", () => {
    const idx = findNextAccessibleTab(
      CASE_DETAIL_TABS,
      0,
      -1,
      isAccessibleTerminal,
    );
    expect(CASE_DETAIL_TABS[idx].key).toBe("log");
  });

  it("终态 Home → overview(0)", () => {
    const idx = findNextAccessibleTab(
      CASE_DETAIL_TABS,
      -1,
      1,
      isAccessibleTerminal,
    );
    expect(CASE_DETAIL_TABS[idx].key).toBe("overview");
  });

  it("终态 End → log(9)", () => {
    const idx = findNextAccessibleTab(
      CASE_DETAIL_TABS,
      CASE_DETAIL_TABS.length,
      -1,
      isAccessibleTerminal,
    );
    expect(CASE_DETAIL_TABS[idx].key).toBe("log");
  });

  it("全部 tab 不可访问时返回 -1", () => {
    const idx = findNextAccessibleTab(CASE_DETAIL_TABS, 0, 1, () => false);
    expect(idx).toBe(-1);
  });
});

// ── §4  Template ref binding & onTabKeydown shape ───────────────

describe("CaseDetailView tablist — template ref binding", () => {
  it("tab button 声明 ref='tabRefs' 以支持 programmatic focus", () => {
    expect(src).toContain('ref="tabRefs"');
  });

  it("script 中声明 tabRefs ref", () => {
    expect(src).toMatch(/tabRefs\s*=\s*ref/);
  });

  it("onTabKeydown 函数在 script 中定义", () => {
    expect(src).toContain("function onTabKeydown(event: KeyboardEvent)");
  });

  it("onTabKeydown 处理 ArrowLeft / ArrowRight / Home / End 四个按键", () => {
    expect(src).toContain('"ArrowRight"');
    expect(src).toContain('"ArrowLeft"');
    expect(src).toContain('"Home"');
    expect(src).toContain('"End"');
  });

  it("onTabKeydown 调用 event.preventDefault()", () => {
    expect(src).toContain("event.preventDefault()");
  });

  it("onTabKeydown 调用 tabRefs 进行 focus", () => {
    expect(src).toMatch(/tabRefs\.value\[.*\]\?\.focus\(\)/);
  });

  it("onTabKeydown 使用 findNextAccessibleTab 跳过不可访问 tab", () => {
    expect(src).toContain("findNextAccessibleTab");
  });

  it("onTabClick 守门：不可访问 tab 不切换", () => {
    expect(src).toContain("function onTabClick");
    expect(src).toMatch(/onTabClick[\s\S]*isTabAccessible/);
  });
});
