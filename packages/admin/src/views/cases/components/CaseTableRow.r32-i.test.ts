import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseTableRow from "./CaseTableRow.vue";
import type { CaseListItem } from "../types";

const BASE_MESSAGES = {
  cases: {
    list: {
      ownerUnassigned: "—",
      riskLabels: { normal: "", attention: "", critical: "" },
      actions: { viewDetail: "" },
    },
    constants: {
      stages: { S2: "S2" },
      phases: { WAITING_MATERIAL: "WAITING_MATERIAL" },
      caseTypes: { biz_mgmt: "经营管理签" },
      bmvSteps: {},
    },
  },
};

function makeI18n() {
  return createI18n({
    legacy: false,
    locale: "zh-CN",
    fallbackLocale: "zh-CN",
    messages: { "zh-CN": BASE_MESSAGES },
  });
}

function baseItem(overrides: Partial<CaseListItem> = {}): CaseListItem {
  return {
    id: "uuid-001",
    name: "田中太郎の経営管理案件",
    type: "biz_mgmt",
    applicant: "田中太郎",
    groupId: "g1",
    groupLabel: "東京一組",
    stageId: "S2",
    stageLabel: "S2",
    ownerId: "owner1",
    completionPercent: 0,
    completionLabel: "",
    validationStatus: "pending",
    validationLabel: { status: "pending", blockingCount: 0 },
    blockerCount: 0,
    unpaidAmount: 0,
    updatedAtLabel: "",
    dueDate: "",
    dueDateLabel: "",
    riskStatus: "normal",
    riskLabel: "",
    visibleScopes: ["all"],
    businessPhase: "WAITING_MATERIAL",
    caseNo: "CASE-2026-0001",
    ...overrides,
  };
}

function mountRow(overrides: Partial<CaseListItem> = {}) {
  return mount(CaseTableRow, {
    props: { item: baseItem(overrides) },
    global: {
      plugins: [makeI18n()],
      stubs: { Chip: { template: "<span><slot /></span>", props: ["tone"] } },
    },
  });
}

function getDisplayName(w: ReturnType<typeof mountRow>) {
  return w.find(".case-row__name").text();
}

describe("R32-I: CaseTableRow displayName fallback", () => {
  it("shows item.name when it differs from caseNo and id", () => {
    const w = mountRow({ name: "田中太郎の経営管理案件" });
    expect(getDisplayName(w)).toBe("田中太郎の経営管理案件");
  });

  it("falls back to applicant · typeLabel when name === caseNo", () => {
    const w = mountRow({
      name: "CASE-2026-0001",
      caseNo: "CASE-2026-0001",
      applicant: "田中太郎",
      type: "biz_mgmt",
    });
    expect(getDisplayName(w)).toBe("田中太郎 · 经营管理签");
  });

  it("falls back to applicant · typeLabel when name === id", () => {
    const w = mountRow({
      name: "uuid-001",
      caseNo: "CASE-2026-0001",
      applicant: "佐藤花子",
      type: "biz_mgmt",
    });
    expect(getDisplayName(w)).toBe("佐藤花子 · 经营管理签");
  });

  it("falls back to applicant only when typeLabel is empty", () => {
    const w = mountRow({
      name: "CASE-2026-0001",
      caseNo: "CASE-2026-0001",
      applicant: "田中太郎",
      type: "",
    });
    expect(getDisplayName(w)).toBe("田中太郎");
  });

  it("falls back to typeLabel only when applicant is empty", () => {
    const w = mountRow({
      name: "CASE-2026-0001",
      caseNo: "CASE-2026-0001",
      applicant: "",
      type: "biz_mgmt",
    });
    expect(getDisplayName(w)).toBe("经营管理签");
  });

  it("falls back to caseNo when both applicant and typeLabel are empty", () => {
    const w = mountRow({
      name: "CASE-2026-0001",
      caseNo: "CASE-2026-0001",
      applicant: "",
      type: "",
    });
    expect(getDisplayName(w)).toBe("CASE-2026-0001");
  });

  it("falls back to id when caseNo is also missing", () => {
    const w = mountRow({
      name: "uuid-001",
      caseNo: undefined,
      applicant: "",
      type: "",
    });
    expect(getDisplayName(w)).toBe("uuid-001");
  });

  it("identityMeta still shows caseNo regardless of displayName", () => {
    const w = mountRow({
      name: "CASE-2026-0001",
      caseNo: "CASE-2026-0001",
      applicant: "田中太郎",
      type: "biz_mgmt",
    });
    const meta = w.find(".case-row__meta");
    expect(meta.text()).toBe("CASE-2026-0001");
  });
});
