// ── Test Ownership ──────────────────────────────────────────────
// Owner: p1-fe-003-03 — Survey / Quote UI focused tests
//   Covers: save (updateCaseFields) lifecycle, pre-sign gate
//   error hints (isGateBlock + i18n), disabled-button guards
//   (readonly + double-submit), and isBmvCase composable computed.
// Does NOT test: adapter derivation of surveyStatus/quoteStatus/
//   preSignGate (→ CaseAdapterDetailAggregate.survey-quote.test),
//   BMV workflow steps (→ bmv-contract), repository HTTP
//   (→ CaseRepository.*.test), or Vue component rendering.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it, vi } from "vitest";
import { createWriteActions } from "./useCaseDetailWriteActions";
import { CaseRepositoryError } from "./CaseRepositorySupport";
import {
  resolveWriteErrorI18nKey,
  isGateBlockError,
} from "./CaseWriteErrorMapping";
import type { CaseRepository } from "./CaseRepository";

// ─── Helpers ──────────────────────────────────────────────────────

function stubRepo(overrides: Partial<CaseRepository> = {}): CaseRepository {
  return {
    listCases: vi.fn(),
    getSummaryCards: vi.fn(() => []),
    getDetail: vi.fn(async () => null),
    getDetailAggregate: vi.fn(async () => null),
    createCase: vi.fn(async () => ({ id: "c1", success: true })),
    updateCase: vi.fn(async () => ({ id: "c1", success: true })),
    transitionCase: vi.fn(async () => ({ id: "c1", success: true })),
    acknowledgeBillingRisk: vi.fn(async () => ({ id: "c1", success: true })),
    updatePostApprovalStage: vi.fn(async () => ({ id: "c1", success: true })),
    transitionWorkflowStep: vi.fn(async () => ({ id: "c1", success: true })),
    deleteCase: vi.fn(async () => undefined),
    getMessages: vi.fn(async () => []),
    getLogEntries: vi.fn(async () => []),
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
    getTasks: vi.fn(async () => []),
    getDeadlines: vi.fn(async () => []),
    createCaseParty: vi.fn(async () => ({ id: "cp1", success: true })),
    ...overrides,
  } as unknown as CaseRepository;
}

function makePreSignGateError(code: string): CaseRepositoryError {
  return new CaseRepositoryError({
    code: "CASE_WRITE_ERROR",
    message: `Pre-sign gate blocked: ${code}`,
    status: 400,
    serverErrorCode: code,
  });
}

// ═══════════════════════════════════════════════════════════════════
//  1. SAVE — updateCaseFields lifecycle
// ═══════════════════════════════════════════════════════════════════

describe("updateCaseFields save lifecycle (p1-fe-003-03)", () => {
  it("calls repo.updateCase with correct caseId and fields", async () => {
    const updateCase = vi.fn(async () => ({ id: "BMV-001", success: true }));
    const repo = stubRepo({ updateCase });
    const onSuccess = vi.fn();
    const wa = createWriteActions({
      repo,
      getCaseId: () => "BMV-001",
      getReadonly: () => false,
      onSuccess,
      onRiskModalClose: () => {},
    });

    await wa.updateCaseFields({
      visaPlan: "change_status",
      quotePrice: 300000,
    });
    expect(updateCase).toHaveBeenCalledWith("BMV-001", {
      visaPlan: "change_status",
      quotePrice: 300000,
    });
  });

  it("submitting = true during in-flight, false after success", async () => {
    let resolve!: () => void;
    const updateCase = vi.fn(
      () =>
        new Promise<{ id: string; success: boolean }>((r) => {
          resolve = () => r({ id: "c1", success: true });
        }),
    );
    const repo = stubRepo({ updateCase });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    const p = wa.updateCaseFields({ quotePrice: 500000 });
    expect(wa.writeFeedback.value.submitting).toBe(true);
    resolve();
    await p;
    expect(wa.writeFeedback.value.submitting).toBe(false);
    expect(wa.writeFeedback.value.errorMessage).toBeNull();
  });

  it("onSuccess callback fires after successful save", async () => {
    const repo = stubRepo();
    const onSuccess = vi.fn();
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => false,
      onSuccess,
      onRiskModalClose: () => {},
    });

    const ok = await wa.updateCaseFields({ visaPlan: "new_establishment" });
    expect(ok).toBe(true);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("feedback cleared on success", async () => {
    const repo = stubRepo();
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    await wa.updateCaseFields({ quotePrice: 100000 });
    expect(wa.writeFeedback.value).toMatchObject({
      submitting: false,
      errorMessage: null,
      errorI18nKey: null,
      serverErrorCode: null,
      isGateBlock: false,
    });
  });

  it("error feedback populated on failure", async () => {
    const err = new CaseRepositoryError({
      code: "CASE_WRITE_ERROR",
      message: "Survey update failed",
      status: 400,
      serverErrorCode: "CASE_SURVEY_UPDATE_FAILED",
    });
    const repo = stubRepo({
      updateCase: vi.fn(async () => {
        throw err;
      }),
    });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    const ok = await wa.updateCaseFields({ visaPlan: "new_establishment" });
    expect(ok).toBe(false);
    expect(wa.writeFeedback.value.submitting).toBe(false);
    expect(wa.writeFeedback.value.errorMessage).toBe("Survey update failed");
    expect(wa.writeFeedback.value.serverErrorCode).toBe(
      "CASE_SURVEY_UPDATE_FAILED",
    );
    expect(wa.writeFeedback.value.errorI18nKey).toBe(
      "cases.writeErrors.surveyUpdateFailed",
    );
  });

  it("clearWriteFeedback resets error state", async () => {
    const err = new CaseRepositoryError({
      code: "CASE_WRITE_ERROR",
      message: "fail",
      status: 400,
      serverErrorCode: "CASE_QUOTE_UPDATE_FAILED",
    });
    const repo = stubRepo({
      updateCase: vi.fn(async () => {
        throw err;
      }),
    });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    await wa.updateCaseFields({ quotePrice: 0 });
    expect(wa.writeFeedback.value.errorMessage).not.toBeNull();

    wa.clearWriteFeedback();
    expect(wa.writeFeedback.value).toMatchObject({
      submitting: false,
      errorMessage: null,
      errorI18nKey: null,
      serverErrorCode: null,
      isGateBlock: false,
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
//  2. GATE HINTS — pre-sign gate error classification
// ═══════════════════════════════════════════════════════════════════

describe("pre-sign gate error mapping (p1-fe-003-03)", () => {
  it("CASE_PRE_SIGN_GATE_SURVEY_INCOMPLETE → gate block + correct i18n", () => {
    const code = "CASE_PRE_SIGN_GATE_SURVEY_INCOMPLETE";
    expect(isGateBlockError(code)).toBe(true);
    expect(resolveWriteErrorI18nKey(code)).toBe(
      "cases.writeErrors.preSignGateSurveyIncomplete",
    );
  });

  it("CASE_PRE_SIGN_GATE_QUOTE_UNCONFIRMED → gate block + correct i18n", () => {
    const code = "CASE_PRE_SIGN_GATE_QUOTE_UNCONFIRMED";
    expect(isGateBlockError(code)).toBe(true);
    expect(resolveWriteErrorI18nKey(code)).toBe(
      "cases.writeErrors.preSignGateQuoteUnconfirmed",
    );
  });

  it("CASE_SURVEY_UPDATE_FAILED → NOT a gate block (ordinary error)", () => {
    expect(isGateBlockError("CASE_SURVEY_UPDATE_FAILED")).toBe(false);
    expect(resolveWriteErrorI18nKey("CASE_SURVEY_UPDATE_FAILED")).toBe(
      "cases.writeErrors.surveyUpdateFailed",
    );
  });

  it("CASE_QUOTE_UPDATE_FAILED → NOT a gate block (ordinary error)", () => {
    expect(isGateBlockError("CASE_QUOTE_UPDATE_FAILED")).toBe(false);
    expect(resolveWriteErrorI18nKey("CASE_QUOTE_UPDATE_FAILED")).toBe(
      "cases.writeErrors.quoteUpdateFailed",
    );
  });

  it("undefined/null error code → fallback i18n + not gate block", () => {
    expect(isGateBlockError(undefined)).toBe(false);
    expect(resolveWriteErrorI18nKey(undefined)).toBe(
      "cases.writeErrors.unknown",
    );
  });

  it("unrecognized code → fallback i18n + not gate block", () => {
    expect(isGateBlockError("SOME_RANDOM_CODE")).toBe(false);
    expect(resolveWriteErrorI18nKey("SOME_RANDOM_CODE")).toBe(
      "cases.writeErrors.unknown",
    );
  });
});

describe("pre-sign gate writeFeedback integration (p1-fe-003-03)", () => {
  it("survey incomplete error → isGateBlock true in writeFeedback", async () => {
    const err = makePreSignGateError("CASE_PRE_SIGN_GATE_SURVEY_INCOMPLETE");
    const repo = stubRepo({
      updateCase: vi.fn(async () => {
        throw err;
      }),
    });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    await wa.updateCaseFields({ visaPlan: "new_establishment" });
    expect(wa.writeFeedback.value.isGateBlock).toBe(true);
    expect(wa.writeFeedback.value.serverErrorCode).toBe(
      "CASE_PRE_SIGN_GATE_SURVEY_INCOMPLETE",
    );
    expect(wa.writeFeedback.value.errorI18nKey).toBe(
      "cases.writeErrors.preSignGateSurveyIncomplete",
    );
  });

  it("quote unconfirmed error → isGateBlock true in writeFeedback", async () => {
    const err = makePreSignGateError("CASE_PRE_SIGN_GATE_QUOTE_UNCONFIRMED");
    const repo = stubRepo({
      updateCase: vi.fn(async () => {
        throw err;
      }),
    });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    await wa.updateCaseFields({ quotePrice: 500000 });
    expect(wa.writeFeedback.value.isGateBlock).toBe(true);
    expect(wa.writeFeedback.value.errorI18nKey).toBe(
      "cases.writeErrors.preSignGateQuoteUnconfirmed",
    );
  });

  it("ordinary write error → isGateBlock false in writeFeedback", async () => {
    const err = new CaseRepositoryError({
      code: "CASE_WRITE_ERROR",
      message: "fail",
      status: 400,
      serverErrorCode: "CASE_SURVEY_UPDATE_FAILED",
    });
    const repo = stubRepo({
      updateCase: vi.fn(async () => {
        throw err;
      }),
    });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    await wa.updateCaseFields({ visaPlan: "new_establishment" });
    expect(wa.writeFeedback.value.isGateBlock).toBe(false);
    expect(wa.writeFeedback.value.errorI18nKey).toBe(
      "cases.writeErrors.surveyUpdateFailed",
    );
  });

  it("non-CaseRepositoryError → no serverErrorCode, fallback i18n", async () => {
    const repo = stubRepo({
      updateCase: vi.fn(async () => {
        throw new Error("Network timeout");
      }),
    });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    await wa.updateCaseFields({ quotePrice: 100000 });
    expect(wa.writeFeedback.value.serverErrorCode).toBeNull();
    expect(wa.writeFeedback.value.isGateBlock).toBe(false);
    expect(wa.writeFeedback.value.errorI18nKey).toBe(
      "cases.writeErrors.unknown",
    );
    expect(wa.writeFeedback.value.errorMessage).toBe("Network timeout");
  });
});

// ═══════════════════════════════════════════════════════════════════
//  3. DISABLED BUTTONS — readonly & double-submit guards
// ═══════════════════════════════════════════════════════════════════
