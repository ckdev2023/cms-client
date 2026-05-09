import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";

import { useCaseDetailModel } from "./useCaseDetailModel";
import type { CaseRepository } from "./CaseRepository";
import {
  createMockAggregate,
  createMockDetail,
  flushFetch,
  ZERO_TAB_COUNTS,
} from "./useCaseDetailModel.test-support";

function makeRepo(): {
  repo: CaseRepository;
  getMessages: ReturnType<typeof vi.fn>;
  getGeneratedDocuments: ReturnType<typeof vi.fn>;
  listDocumentTemplates: ReturnType<typeof vi.fn>;
} {
  const detail = createMockDetail({ id: "CASE-LOCALE" });
  const aggregate = createMockAggregate(detail, {
    tabCounts: { ...ZERO_TAB_COUNTS },
  });
  const getMessages = vi.fn().mockResolvedValue([]);
  const getGeneratedDocuments = vi
    .fn()
    .mockResolvedValue({ templates: [], generated: [] });
  const listDocumentTemplates = vi.fn().mockResolvedValue([]);

  const repo = {
    getDetailAggregate: vi.fn().mockResolvedValue(aggregate),
    getDocumentItems: vi.fn().mockResolvedValue([]),
    getGeneratedDocuments,
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
    getMessages,
    getLogEntries: vi.fn().mockResolvedValue([]),
    getTasks: vi.fn().mockResolvedValue([]),
    getDeadlines: vi.fn().mockResolvedValue([]),
    listDocumentTemplates,
  } as unknown as CaseRepository;

  return { repo, getMessages, getGeneratedDocuments, listDocumentTemplates };
}

describe("R39-A 続編: displayLocale を templateLanguage と切り離して整形 locale として配線", () => {
  it("displayLocale を渡すと getMessages と getGeneratedDocuments の locale 引数に流れる", async () => {
    const { repo, getMessages, getGeneratedDocuments } = makeRepo();

    useCaseDetailModel(ref("CASE-LOCALE"), {
      repo,
      displayLocale: ref("zh-CN"),
    });
    await flushFetch();
    await flushFetch();

    expect(getMessages).toHaveBeenCalledWith("CASE-LOCALE", "zh-CN");
    expect(getGeneratedDocuments).toHaveBeenCalledWith("CASE-LOCALE", "zh-CN");
  });

  it("displayLocale を渡しても listDocumentTemplates の language には流れない（コンテンツ言語と分離）", async () => {
    const { repo, listDocumentTemplates } = makeRepo();

    useCaseDetailModel(ref("CASE-LOCALE"), {
      repo,
      displayLocale: ref("ja-JP"),
    });
    await flushFetch();

    expect(listDocumentTemplates).toHaveBeenCalled();
    const callArgs = listDocumentTemplates.mock.calls[0][0] as {
      language?: string;
    };
    expect(callArgs.language).toBeUndefined();
  });

  it("displayLocale 未指定時は templateLanguage に後方互換でフォールバック", async () => {
    const { repo, getMessages } = makeRepo();

    useCaseDetailModel(ref("CASE-LOCALE"), {
      repo,
      templateLanguage: ref("ja"),
    });
    await flushFetch();
    await flushFetch();

    expect(getMessages).toHaveBeenCalledWith("CASE-LOCALE", "ja");
  });

  it("displayLocale と templateLanguage を同時に指定すると displayLocale が整形 locale を上書き", async () => {
    const { repo, getMessages, listDocumentTemplates } = makeRepo();

    useCaseDetailModel(ref("CASE-LOCALE"), {
      repo,
      displayLocale: ref("en-US"),
      templateLanguage: ref("ja"),
    });
    await flushFetch();
    await flushFetch();

    expect(getMessages).toHaveBeenCalledWith("CASE-LOCALE", "en-US");
    const callArgs = listDocumentTemplates.mock.calls[0][0] as {
      language?: string;
    };
    expect(callArgs.language).toBe("ja");
  });
});
