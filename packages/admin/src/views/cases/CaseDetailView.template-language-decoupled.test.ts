import { describe, it, expect, vi } from "vitest";
import { ref } from "vue";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { useCaseDetailModel } from "./model/useCaseDetailModel";
import type { CaseRepository } from "./model/CaseRepository";
import {
  createMockAggregate,
  createMockDetail,
  flushFetch,
  ZERO_TAB_COUNTS,
} from "./model/useCaseDetailModel.test-support";

function createRepoStub() {
  const listDocumentTemplates = vi.fn().mockResolvedValue([]);
  const getDetailAggregate = vi.fn().mockResolvedValue(
    createMockAggregate(createMockDetail({ id: "CASE-LANG" }), {
      tabCounts: { ...ZERO_TAB_COUNTS },
    }),
  );

  const repo = {
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
    listDocumentTemplates,
  } as unknown as CaseRepository;

  return { repo, listDocumentTemplates };
}

describe("R39-A: template language decoupled from UI locale", () => {
  it("listDocumentTemplates receives language=undefined when locale is not injected", async () => {
    const { repo, listDocumentTemplates } = createRepoStub();

    useCaseDetailModel(ref("CASE-LANG"), { repo });
    await flushFetch();

    expect(listDocumentTemplates).toHaveBeenCalled();
    const callArgs = listDocumentTemplates.mock.calls[0][0] as {
      language?: string;
    };
    expect(callArgs.language).toBeUndefined();
  });

  it("listDocumentTemplates receives the injected templateLanguage when explicitly provided", async () => {
    const { repo, listDocumentTemplates } = createRepoStub();

    useCaseDetailModel(ref("CASE-LANG"), {
      repo,
      templateLanguage: ref("ja"),
    });
    await flushFetch();

    expect(listDocumentTemplates).toHaveBeenCalled();
    const callArgs = listDocumentTemplates.mock.calls[0][0] as {
      language?: string;
    };
    expect(callArgs.language).toBe("ja");
  });
});

describe("R39-A: CaseDetailView static scan — locale not passed as templateLanguage", () => {
  const templatePath = resolve(__dirname, "CaseDetailView.vue");
  const src = readFileSync(templatePath, "utf-8");

  function getDepsBlock(): string {
    const callPattern =
      /useCaseDetailModel\s*\(\s*caseId\s*,\s*\{([\s\S]*?)\}\s*\)/;
    const match = callPattern.exec(src);
    expect(
      match,
      "useCaseDetailModel call not found in CaseDetailView.vue",
    ).toBeTruthy();
    return match![1];
  }

  it("useCaseDetailModel call must NOT pass vue-i18n locale as templateLanguage", () => {
    const argsBlock = getDepsBlock();

    const passesTemplateLanguageLocale = /templateLanguage\s*:\s*locale\b/.test(
      argsBlock,
    );
    const hasShorthandTemplateLanguage = /\btemplateLanguage\s*[,}]/.test(
      argsBlock,
    );

    expect(
      passesTemplateLanguageLocale || hasShorthandTemplateLanguage,
      "CaseDetailView must not pass vue-i18n locale to useCaseDetailModel as " +
        "templateLanguage — use a dedicated templateLanguage ref if content-" +
        "language filtering is needed. Display locale should go through " +
        "displayLocale instead.",
    ).toBe(false);
  });

  it("useI18n locale is still destructured for other UI purposes", () => {
    expect(src).toContain("const { t, locale } = useI18n()");
  });
});
