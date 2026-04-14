import { describe, it, expect } from "vitest";
import { ref } from "vue";
import { useCaseDetailModel } from "./useCaseDetailModel";
import { createMockCaseRepository } from "../repository";
import { CASE_DETAIL_TABS } from "../constants";

const repo = createMockCaseRepository();

function idWithSampleKey(key = "work"): string {
  const item = repo
    .listCases({
      scope: "all",
      search: "",
      stage: "",
      owner: "",
      group: "",
      risk: "",
      validation: "",
    })
    .find((c) => c.sampleKey === key);
  return item!.id;
}

describe("useCaseDetailModel", () => {
  it("loads detail for a known list-item ID (via sampleKey bridge)", () => {
    const caseId = ref(idWithSampleKey());
    const { detail, notFound } = useCaseDetailModel(caseId, { repo });

    expect(notFound.value).toBe(false);
    expect(detail.value).not.toBeNull();
    expect(detail.value!.id).toBe(caseId.value);
  });

  it("returns notFound for unknown ID", () => {
    const caseId = ref("UNKNOWN-ID");
    const { detail, notFound } = useCaseDetailModel(caseId, { repo });

    expect(notFound.value).toBe(true);
    expect(detail.value).toBeNull();
  });

  it("defaults activeTab to overview", () => {
    const caseId = ref(idWithSampleKey());
    const { activeTab } = useCaseDetailModel(caseId, { repo });

    expect(activeTab.value).toBe("overview");
  });

  it("switchTab changes the active tab", () => {
    const caseId = ref(idWithSampleKey());
    const { activeTab, switchTab } = useCaseDetailModel(caseId, { repo });

    switchTab("billing");
    expect(activeTab.value).toBe("billing");

    switchTab("documents");
    expect(activeTab.value).toBe("documents");
  });

  it("exposes the full tab definitions", () => {
    const caseId = ref(idWithSampleKey());
    const { tabs } = useCaseDetailModel(caseId, { repo });

    expect(tabs).toBe(CASE_DETAIL_TABS);
    expect(tabs.length).toBe(10);
  });

  it("isReadonly reflects the detail's readonly flag", () => {
    const archivedId = idWithSampleKey("archived");
    const caseId = ref(archivedId);
    const { isReadonly } = useCaseDetailModel(caseId, { repo });

    expect(isReadonly.value).toBe(true);
  });

  it("isReadonly is false for active cases", () => {
    const caseId = ref(idWithSampleKey());
    const { isReadonly } = useCaseDetailModel(caseId, { repo });

    expect(isReadonly.value).toBe(false);
  });

  it("reacts to caseId changes", () => {
    const caseId = ref(idWithSampleKey());
    const { detail, notFound } = useCaseDetailModel(caseId, { repo });

    expect(detail.value).not.toBeNull();

    caseId.value = "NONEXISTENT";
    expect(notFound.value).toBe(true);
    expect(detail.value).toBeNull();
  });

  describe("tabCounters", () => {
    it("returns empty when detail is null", () => {
      const caseId = ref("UNKNOWN-ID");
      const { tabCounters } = useCaseDetailModel(caseId, { repo });

      expect(tabCounters.value).toEqual({});
    });

    it("includes docsCounter for documents tab", () => {
      const caseId = ref(idWithSampleKey("work"));
      const { tabCounters } = useCaseDetailModel(caseId, { repo });

      expect(tabCounters.value.documents).toBeDefined();
      expect(tabCounters.value.documents!.label).toBe("8/16");
      expect(tabCounters.value.documents!.tone).toBe("default");
    });

    it("shows validation blocking count when present", () => {
      const caseId = ref(idWithSampleKey("work"));
      const { tabCounters } = useCaseDetailModel(caseId, { repo });

      expect(tabCounters.value.validation).toBeDefined();
      expect(tabCounters.value.validation!.label).toBe("卡点2");
      expect(tabCounters.value.validation!.tone).toBe("danger");
    });

    it("omits validation counter when no blocking items", () => {
      const caseId = ref(idWithSampleKey("family"));
      const { tabCounters } = useCaseDetailModel(caseId, { repo });

      expect(tabCounters.value.validation).toBeUndefined();
    });

    it("shows pending tasks count", () => {
      const caseId = ref(idWithSampleKey("work"));
      const { tabCounters } = useCaseDetailModel(caseId, { repo });

      expect(tabCounters.value.tasks).toBeDefined();
      expect(tabCounters.value.tasks!.tone).toBe("warning");
      expect(tabCounters.value.tasks!.label).toMatch(/^待办\d+$/);
    });

    it("omits tasks counter when all done (archived)", () => {
      const caseId = ref(idWithSampleKey("archived"));
      const { tabCounters } = useCaseDetailModel(caseId, { repo });

      expect(tabCounters.value.tasks).toBeUndefined();
    });

    it("shows urgent deadlines count", () => {
      const caseId = ref(idWithSampleKey("work"));
      const { tabCounters } = useCaseDetailModel(caseId, { repo });

      expect(tabCounters.value.deadlines).toBeDefined();
      expect(tabCounters.value.deadlines!.tone).toBe("warning");
      expect(Number(tabCounters.value.deadlines!.label)).toBeGreaterThan(0);
    });

    it("omits deadlines counter when no urgent deadlines", () => {
      const caseId = ref(idWithSampleKey("archived"));
      const { tabCounters } = useCaseDetailModel(caseId, { repo });

      expect(tabCounters.value.deadlines).toBeUndefined();
    });
  });

  describe("currentSampleKey", () => {
    it("returns sample key for known case", () => {
      const caseId = ref(idWithSampleKey("work"));
      const { currentSampleKey } = useCaseDetailModel(caseId, { repo });

      expect(currentSampleKey.value).toBe("work");
    });

    it("returns null for unknown case", () => {
      const caseId = ref("UNKNOWN-ID");
      const { currentSampleKey } = useCaseDetailModel(caseId, { repo });

      expect(currentSampleKey.value).toBeNull();
    });
  });

  describe("showRiskModal", () => {
    it("defaults to false", () => {
      const caseId = ref(idWithSampleKey());
      const { showRiskModal } = useCaseDetailModel(caseId, { repo });

      expect(showRiskModal.value).toBe(false);
    });

    it("openRiskModal sets to true, closeRiskModal resets to false", () => {
      const caseId = ref(idWithSampleKey());
      const { showRiskModal, openRiskModal, closeRiskModal } =
        useCaseDetailModel(caseId, { repo });

      openRiskModal();
      expect(showRiskModal.value).toBe(true);

      closeRiskModal();
      expect(showRiskModal.value).toBe(false);
    });
  });

  describe("getSampleCaseId", () => {
    it("returns case ID for a valid sample key", () => {
      const caseId = ref(idWithSampleKey());
      const { getSampleCaseId } = useCaseDetailModel(caseId, { repo });

      const familyId = getSampleCaseId("family");
      expect(familyId).toBeDefined();
      expect(familyId).toBe(idWithSampleKey("family"));
    });

    it("returns undefined for non-existent sample key", () => {
      const caseId = ref(idWithSampleKey());
      const { getSampleCaseId } = useCaseDetailModel(caseId, { repo });

      const result = getSampleCaseId("nonexistent" as never);
      expect(result).toBeUndefined();
    });
  });
});
