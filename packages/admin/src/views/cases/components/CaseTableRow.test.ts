import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseTableRow from "./CaseTableRow.vue";
import type { CaseListItem } from "../types";

const MESSAGES = {
  "en-US": {
    cases: {
      list: {
        ownerUnassigned: "Unassigned",
        riskLabels: {
          normal: "Normal",
          attention: "Needs attention",
          critical: "High risk",
        },
        actions: { viewDetail: "View detail" },
      },
      constants: {
        stages: {
          S1: "Filed",
          S2: "Collecting documents",
          S3: "Pending / Under review",
          S4: "Drafting forms",
          S5: "Pre-submission check",
          S6: "Ready to submit",
          S7: "Submitted, awaiting receipt",
          S8: "Awaiting result",
          S9: "Archived",
        },
        phases: {
          CONSULTING: "Consulting",
          WAITING_MATERIAL: "Awaiting documents",
          prepare: "Preparing",
        },
        bmvSteps: {},
      },
    },
  },
  "ja-JP": {
    cases: {
      list: {
        ownerUnassigned: "未指名",
        riskLabels: {
          normal: "正常",
          attention: "要注意",
          critical: "高リスク",
        },
        actions: { viewDetail: "詳細を見る" },
      },
      constants: {
        stages: {
          S1: "案件登録済",
          S2: "資料収集中",
          S3: "資料補完待ち / 審査中",
          S9: "アーカイブ済み",
        },
        phases: {
          CONSULTING: "相談中",
          WAITING_MATERIAL: "資料待ち",
          prepare: "準備中",
        },
        bmvSteps: {},
      },
    },
  },
  "zh-CN": {
    cases: {
      list: {
        ownerUnassigned: "未指派",
        riskLabels: {
          normal: "正常",
          attention: "需关注",
          critical: "高风险",
        },
        actions: { viewDetail: "查看详情" },
      },
      constants: {
        stages: {
          S1: "已建档",
          S2: "资料收集中",
          S9: "已归档",
        },
        phases: {
          CONSULTING: "咨询中",
          WAITING_MATERIAL: "等待资料",
          prepare: "准备中",
        },
        bmvSteps: {},
      },
    },
  },
};

function makeI18n(locale: "en-US" | "ja-JP" | "zh-CN" = "en-US") {
  return createI18n({ legacy: false, locale, messages: MESSAGES });
}

function baseItem(overrides: Partial<CaseListItem> = {}): CaseListItem {
  return {
    id: "a1b2c3d4-uuid",
    name: "Test Case",
    type: "技人国",
    applicant: "田中太郎",
    groupId: "tokyo-1",
    groupLabel: "東京一組",
    stageId: "S2",
    stageLabel: "S2",
    ownerId: "suzuki",
    completionPercent: 50,
    completionLabel: "5/10",
    validationStatus: "pending",
    validationLabel: { status: "pending", blockingCount: 0 },
    blockerCount: 0,
    unpaidAmount: 0,
    updatedAtLabel: "today",
    dueDate: "2026-06-01",
    dueDateLabel: "06-01",
    riskStatus: "normal",
    riskLabel: "low",
    visibleScopes: ["all"],
    businessPhase: "WAITING_MATERIAL",
    ...overrides,
  };
}

function mountRow(
  item: CaseListItem,
  locale: "en-US" | "ja-JP" | "zh-CN" = "en-US",
) {
  return mount(CaseTableRow, {
    props: { item },
    global: {
      plugins: [makeI18n(locale)],
      stubs: { Chip: { template: "<span><slot /></span>", props: ["tone"] } },
    },
  });
}

describe("CaseTableRow", () => {
  describe("BUG-070: Stage column uses i18n instead of raw code", () => {
    it("renders i18n stage label in en-US", () => {
      const w = mountRow(baseItem({ stageId: "S2" }), "en-US");
      const stageCell = w.findAll("td")[1];
      expect(stageCell.text()).toContain("Collecting documents");
    });

    it("renders i18n stage label in ja-JP", () => {
      const w = mountRow(baseItem({ stageId: "S2" }), "ja-JP");
      const stageCell = w.findAll("td")[1];
      expect(stageCell.text()).toContain("資料収集中");
    });

    it("renders i18n stage label in zh-CN", () => {
      const w = mountRow(baseItem({ stageId: "S2" }), "zh-CN");
      const stageCell = w.findAll("td")[1];
      expect(stageCell.text()).toContain("资料收集中");
    });
  });

  describe("BUG-071: Owner column shows Unassigned for unknown owner", () => {
    it("shows resolved owner name for known owner", () => {
      const w = mountRow(baseItem({ ownerId: "suzuki" }), "en-US");
      const ownerCell = w.findAll("td")[4];
      expect(ownerCell.text()).toContain("Suzuki");
    });

    it("shows Unassigned for unknown UUID owner in en-US", () => {
      const w = mountRow(baseItem({ ownerId: "unknown-uuid-value" }), "en-US");
      const ownerCell = w.findAll("td")[4];
      expect(ownerCell.text()).toBe("Unassigned");
      expect(ownerCell.text()).not.toContain("unknown-uuid-value");
    });

    it("shows 未指名 for unknown owner in ja-JP", () => {
      const w = mountRow(baseItem({ ownerId: "unknown-uuid-value" }), "ja-JP");
      const ownerCell = w.findAll("td")[4];
      expect(ownerCell.text()).toBe("未指名");
    });

    it("shows 未指派 for unknown owner in zh-CN", () => {
      const w = mountRow(baseItem({ ownerId: "unknown-uuid-value" }), "zh-CN");
      const ownerCell = w.findAll("td")[4];
      expect(ownerCell.text()).toBe("未指派");
    });
  });

  describe("BUG-102: Owner column prefers backend ownerDisplayName", () => {
    it("renders backend ownerDisplayName when present", () => {
      const w = mountRow(
        baseItem({ ownerId: "suzuki", ownerDisplayName: "Local Admin" }),
      );
      const ownerCell = w.findAll("td")[4];
      expect(ownerCell.text()).toContain("Local Admin");
      expect(ownerCell.find(".case-row__na").exists()).toBe(false);
    });

    it("falls back to fixture when ownerDisplayName is absent and ownerId matches", () => {
      const w = mountRow(
        baseItem({ ownerId: "suzuki", ownerDisplayName: undefined }),
        "en-US",
      );
      const ownerCell = w.findAll("td")[4];
      expect(ownerCell.text()).toContain("Suzuki");
    });

    it("shows Unassigned when ownerDisplayName is absent and ownerId is unknown", () => {
      const w = mountRow(
        baseItem({
          ownerId: "unknown-uuid-value",
          ownerDisplayName: undefined,
        }),
        "zh-CN",
      );
      const ownerCell = w.findAll("td")[4];
      expect(ownerCell.text()).toBe("未指派");
    });

    it("treats whitespace-only ownerDisplayName as missing", () => {
      const w = mountRow(
        baseItem({ ownerId: "suzuki", ownerDisplayName: "   " }),
        "en-US",
      );
      const ownerCell = w.findAll("td")[4];
      expect(ownerCell.text()).toContain("Suzuki");
    });

    it("preserves backend string as-is regardless of locale", () => {
      const w = mountRow(
        baseItem({ ownerId: "suzuki", ownerDisplayName: "管理者A" }),
        "en-US",
      );
      const ownerCell = w.findAll("td")[4];
      expect(ownerCell.text()).toContain("管理者A");
    });
  });

  describe("BUG-072: Risk column uses i18n labels", () => {
    it("shows Normal for normal risk in en-US", () => {
      const w = mountRow(baseItem({ riskStatus: "normal" }), "en-US");
      const riskCell = w.findAll("td")[8];
      expect(riskCell.text()).toBe("Normal");
    });

    it("shows Needs attention for attention risk", () => {
      const w = mountRow(baseItem({ riskStatus: "attention" }), "en-US");
      const riskCell = w.findAll("td")[8];
      expect(riskCell.text()).toBe("Needs attention");
    });

    it("shows High risk for critical risk", () => {
      const w = mountRow(baseItem({ riskStatus: "critical" }), "en-US");
      const riskCell = w.findAll("td")[8];
      expect(riskCell.text()).toBe("High risk");
    });

    it("shows localized risk labels in ja-JP", () => {
      const w = mountRow(baseItem({ riskStatus: "critical" }), "ja-JP");
      const riskCell = w.findAll("td")[8];
      expect(riskCell.text()).toBe("高リスク");
    });
  });

  describe("BUG-073: Identity uses caseNo, UUID in hover", () => {
    it("shows caseNo as meta when available", () => {
      const w = mountRow(baseItem({ id: "a1b2-uuid", caseNo: "CASE-001" }));
      const identityCell = w.findAll("td")[0];
      expect(identityCell.find(".case-row__meta").text()).toBe("CASE-001");
    });

    it("falls back to id when caseNo is absent", () => {
      const w = mountRow(baseItem({ id: "a1b2-uuid", caseNo: undefined }));
      const identityCell = w.findAll("td")[0];
      expect(identityCell.find(".case-row__meta").text()).toBe("a1b2-uuid");
    });

    it("puts UUID in title attribute for hover", () => {
      const w = mountRow(baseItem({ id: "a1b2-uuid", caseNo: "CASE-001" }));
      const identity = w.find(".case-row__identity");
      expect(identity.attributes("title")).toBe("a1b2-uuid");
    });

    it("renders case name as the link text", () => {
      const w = mountRow(baseItem({ name: "Test Case Name" }));
      expect(w.find(".case-row__name").text()).toBe("Test Case Name");
    });
  });

  describe("P2-12: prepare phase renders i18n label instead of raw key", () => {
    it("renders 'Preparing' for businessPhase=prepare in en-US", () => {
      const w = mountRow(baseItem({ businessPhase: "prepare" }), "en-US");
      const stageCell = w.findAll("td")[1];
      expect(stageCell.text()).toContain("Preparing");
      expect(stageCell.text()).not.toContain("prepare");
    });

    it("renders '準備中' for businessPhase=prepare in ja-JP", () => {
      const w = mountRow(baseItem({ businessPhase: "prepare" }), "ja-JP");
      const stageCell = w.findAll("td")[1];
      expect(stageCell.text()).toContain("準備中");
    });

    it("renders '准备中' for businessPhase=prepare in zh-CN", () => {
      const w = mountRow(baseItem({ businessPhase: "prepare" }), "zh-CN");
      const stageCell = w.findAll("td")[1];
      expect(stageCell.text()).toContain("准备中");
    });
  });

  describe("P2-12: DEV badge for CASE-DEV-* case numbers", () => {
    it("shows DEV chip when caseNo starts with CASE-DEV-", () => {
      const w = mountRow(baseItem({ caseNo: "CASE-DEV-001" }), "en-US");
      const identityCell = w.findAll("td")[0];
      expect(identityCell.text()).toContain("DEV");
    });

    it("does not show DEV chip for regular caseNo", () => {
      const w = mountRow(baseItem({ caseNo: "CASE-202605-0010" }), "en-US");
      const identityCell = w.findAll("td")[0];
      expect(identityCell.text()).not.toContain("DEV");
    });
  });
});
