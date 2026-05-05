import { describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";
import { useCaseDetailModel } from "./useCaseDetailModel";
import type { CaseRepository } from "./CaseRepository";
import type { CaseDetailAggregate } from "./CaseAdapterDetailContracts";
import {
  createMockAggregate,
  createMockDetail,
  flushFetch,
  ZERO_TAB_COUNTS,
} from "./useCaseDetailModel.test-support";

const BMV_DETAIL = createMockDetail({
  id: "CASE-BMV",
  caseType: "biz_mgmt_cert_4m",
  readonly: false,
});
const FAMILY_READONLY_DETAIL = createMockDetail({
  id: "CASE-FAMILY",
  caseType: "family",
  readonly: true,
  stage: "S9",
  stageCode: "S9",
  statusBadge: "archived",
});

const AGG_BMV = createMockAggregate(BMV_DETAIL, {
  tabCounts: { ...ZERO_TAB_COUNTS },
});
const AGG_FAMILY_READONLY = createMockAggregate(FAMILY_READONLY_DETAIL, {
  tabCounts: { ...ZERO_TAB_COUNTS },
});

function createRepoWithTemplateSpy(map: Record<string, CaseDetailAggregate>) {
  const listDocumentTemplates = vi.fn(async () => []);
  const repo = {
    getDetailAggregate: vi.fn(async (id: string) => map[id] ?? null),
    listDocumentTemplates,
    getDocumentItems: vi.fn(async () => []),
    getGeneratedDocuments: vi.fn(async () => ({
      templates: [],
      generated: [],
    })),
    getValidationData: vi.fn(async () => ({
      lastTime: "",
      blocking: [],
      warnings: [],
      info: [],
    })),
    getBillingData: vi.fn(async () => ({
      total: "—",
      received: "¥0",
      outstanding: "¥0",
      payments: [],
    })),
    getSubmissionPackages: vi.fn(async () => []),
    getDoubleReviewEntries: vi.fn(async () => []),
    getMessages: vi.fn(async () => []),
    getLogEntries: vi.fn(async () => []),
    getTasks: vi.fn(async () => []),
    getDeadlines: vi.fn(async () => []),
  } as unknown as CaseRepository;

  return { repo, listDocumentTemplates };
}

describe("readonly fetch gate for formTemplates (R41-C)", () => {
  it("calls listDocumentTemplates when detail is not readonly", async () => {
    const { repo, listDocumentTemplates } = createRepoWithTemplateSpy({
      "CASE-BMV": AGG_BMV,
    });

    useCaseDetailModel(ref("CASE-BMV"), { repo });
    await flushFetch();
    await flushFetch();

    expect(listDocumentTemplates).toHaveBeenCalled();
    expect(listDocumentTemplates).toHaveBeenCalledWith(
      expect.objectContaining({ caseType: "biz_mgmt_cert_4m" }),
    );
  });

  it("does NOT call listDocumentTemplates when detail is readonly", async () => {
    const { repo, listDocumentTemplates } = createRepoWithTemplateSpy({
      "CASE-FAMILY": AGG_FAMILY_READONLY,
    });

    useCaseDetailModel(ref("CASE-FAMILY"), { repo });
    await flushFetch();
    await flushFetch();

    expect(listDocumentTemplates).not.toHaveBeenCalled();
  });

  it("triggers first fetch when switching from readonly to non-readonly", async () => {
    const { repo, listDocumentTemplates } = createRepoWithTemplateSpy({
      "CASE-FAMILY": AGG_FAMILY_READONLY,
      "CASE-BMV": AGG_BMV,
    });

    const caseId = ref("CASE-FAMILY");
    useCaseDetailModel(caseId, { repo });
    await flushFetch();
    await flushFetch();
    expect(listDocumentTemplates).not.toHaveBeenCalled();

    caseId.value = "CASE-BMV";
    await flushFetch();
    await flushFetch();
    await nextTick();

    expect(listDocumentTemplates).toHaveBeenCalled();
    expect(listDocumentTemplates).toHaveBeenCalledWith(
      expect.objectContaining({ caseType: "biz_mgmt_cert_4m" }),
    );
  });
});
