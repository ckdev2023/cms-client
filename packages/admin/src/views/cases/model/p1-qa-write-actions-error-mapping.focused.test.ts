// ── Test Ownership ──────────────────────────────────────────────
// Owner: p1-qa-001-01 — P1 admin focused tests batch 1 (write actions)
//   Covers: retryReminderCreation lifecycle, failureClose lifecycle,
//   updateCaseFields for P1 fields, and complete CaseWriteErrorMapping
//   gate-block / i18n classification coverage.
// Does NOT test: adapter mapping (→ p1-qa-step-mapping-adapter),
//   COE advance + readonly guard (→ coe-residence-reminder.focused.test),
//   or Vue component rendering.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it, vi } from "vitest";
import { createWriteActions } from "./useCaseDetailWriteActions";
import { CaseRepositoryError } from "./CaseRepositorySupport";
import {
  resolveWriteErrorI18nKey,
  isGateBlockError,
  CASE_WRITE_ERROR_I18N_MAP,
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
    retryReminderCreation: vi.fn(async () => ({ id: "c1", success: true })),
    ...overrides,
  } as unknown as CaseRepository;
}

function makeRepoError(code: string): CaseRepositoryError {
  return new CaseRepositoryError({
    code: "CASE_WRITE_ERROR",
    message: `Error: ${code}`,
    status: 400,
    serverErrorCode: code,
  });
}

function makeWriteActions(
  repoOverrides: Partial<CaseRepository> = {},
  readonly = false,
) {
  const repo = stubRepo(repoOverrides);
  const onSuccess = vi.fn();
  const wa = createWriteActions({
    repo,
    getCaseId: () => "BMV-QA-01",
    getReadonly: () => readonly,
    onSuccess,
    onRiskModalClose: () => {},
  });
  return { wa, repo, onSuccess };
}

// ═══════════════════════════════════════════════════════════════════
//  1. retryReminderCreation lifecycle
// ═══════════════════════════════════════════════════════════════════

describe("retryReminderCreation write action (p1-qa-001-01)", () => {
  it("calls repo.retryReminderCreation with correct case id", async () => {
    const retryReminderCreation = vi.fn(async () => ({
      id: "c1",
      success: true,
    }));
    const { wa } = makeWriteActions({ retryReminderCreation });
    const ok = await wa.retryReminderCreation();
    expect(ok).toBe(true);
    expect(retryReminderCreation).toHaveBeenCalledWith("BMV-QA-01");
  });

  it("submitting lifecycle: true during in-flight, false after", async () => {
    let resolve!: () => void;
    const retryReminderCreation = vi.fn(
      () =>
        new Promise<{ id: string; success: boolean }>((r) => {
          resolve = () => r({ id: "c1", success: true });
        }),
    );
    const { wa } = makeWriteActions({ retryReminderCreation });
    const p = wa.retryReminderCreation();
    expect(wa.writeFeedback.value.submitting).toBe(true);
    resolve();
    await p;
    expect(wa.writeFeedback.value.submitting).toBe(false);
    expect(wa.writeFeedback.value.errorMessage).toBeNull();
  });

  it("error feedback on CASE_REMINDER_CREATION_FAILED", async () => {
    const { wa } = makeWriteActions({
      retryReminderCreation: vi.fn(async () => {
        throw makeRepoError("CASE_REMINDER_CREATION_FAILED");
      }),
    });
    const ok = await wa.retryReminderCreation();
    expect(ok).toBe(false);
    expect(wa.writeFeedback.value.errorI18nKey).toBe(
      "cases.writeErrors.reminderCreationFailed",
    );
    expect(wa.writeFeedback.value.isGateBlock).toBe(false);
  });

  it("returns false when readonly", async () => {
    const retryReminderCreation = vi.fn(async () => ({
      id: "c1",
      success: true,
    }));
    const { wa } = makeWriteActions({ retryReminderCreation }, true);
    const ok = await wa.retryReminderCreation();
    expect(ok).toBe(false);
    expect(retryReminderCreation).not.toHaveBeenCalled();
  });

  it("onSuccess fires after successful retry", async () => {
    const { wa, onSuccess } = makeWriteActions();
    await wa.retryReminderCreation();
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  2. failureClose lifecycle
// ═══════════════════════════════════════════════════════════════════

describe("failureClose write action (p1-qa-001-01)", () => {
  it("calls repo.transitionCase with toStage=S9", async () => {
    const transitionCase = vi.fn(async () => ({ id: "c1", success: true }));
    const { wa } = makeWriteActions({ transitionCase });
    const ok = await wa.failureClose();
    expect(ok).toBe(true);
    expect(transitionCase).toHaveBeenCalledWith("BMV-QA-01", {
      toStage: "S9",
      closeReason: undefined,
    });
  });

  it("passes closeReason when provided", async () => {
    const transitionCase = vi.fn(async () => ({ id: "c1", success: true }));
    const { wa } = makeWriteActions({ transitionCase });
    await wa.failureClose("客户主动撤回");
    expect(transitionCase).toHaveBeenCalledWith("BMV-QA-01", {
      toStage: "S9",
      closeReason: "客户主动撤回",
    });
  });

  it("CASE_FAILURE_CLOSEOUT_ATTRIBUTION_REQUIRED is a gate block", async () => {
    const { wa } = makeWriteActions({
      transitionCase: vi.fn(async () => {
        throw makeRepoError("CASE_FAILURE_CLOSEOUT_ATTRIBUTION_REQUIRED");
      }),
    });
    const ok = await wa.failureClose();
    expect(ok).toBe(false);
    expect(wa.writeFeedback.value.isGateBlock).toBe(true);
    expect(wa.writeFeedback.value.errorI18nKey).toBe(
      "cases.writeErrors.failureCloseoutAttributionRequired",
    );
  });

  it("returns false when readonly", async () => {
    const transitionCase = vi.fn(async () => ({ id: "c1", success: true }));
    const { wa } = makeWriteActions({ transitionCase }, true);
    const ok = await wa.failureClose("reason");
    expect(ok).toBe(false);
    expect(transitionCase).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════
//  3. updateCaseFields for P1 fields
// ═══════════════════════════════════════════════════════════════════

describe("updateCaseFields for P1 fields (p1-qa-001-01)", () => {
  it("calls repo.updateCase with P1 field payload", async () => {
    const updateCase = vi.fn(async () => ({ id: "c1", success: true }));
    const { wa } = makeWriteActions({ updateCase });
    const ok = await wa.updateCaseFields({
      visaPlan: "branch_office",
      quotePrice: 800000,
    });
    expect(ok).toBe(true);
    expect(updateCase).toHaveBeenCalledWith("BMV-QA-01", {
      visaPlan: "branch_office",
      quotePrice: 800000,
    });
  });

  it("error feedback on CASE_SURVEY_UPDATE_FAILED", async () => {
    const { wa } = makeWriteActions({
      updateCase: vi.fn(async () => {
        throw makeRepoError("CASE_SURVEY_UPDATE_FAILED");
      }),
    });
    const ok = await wa.updateCaseFields({ visaPlan: "x" });
    expect(ok).toBe(false);
    expect(wa.writeFeedback.value.errorI18nKey).toBe(
      "cases.writeErrors.surveyUpdateFailed",
    );
  });

  it("error feedback on CASE_QUOTE_UPDATE_FAILED", async () => {
    const { wa } = makeWriteActions({
      updateCase: vi.fn(async () => {
        throw makeRepoError("CASE_QUOTE_UPDATE_FAILED");
      }),
    });
    const ok = await wa.updateCaseFields({ quotePrice: 100000 });
    expect(ok).toBe(false);
    expect(wa.writeFeedback.value.errorI18nKey).toBe(
      "cases.writeErrors.quoteUpdateFailed",
    );
  });

  it("readonly blocks field update", async () => {
    const updateCase = vi.fn(async () => ({ id: "c1", success: true }));
    const { wa } = makeWriteActions({ updateCase }, true);
    const ok = await wa.updateCaseFields({ visaPlan: "x" });
    expect(ok).toBe(false);
    expect(updateCase).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════
//  4. COMPLETE ERROR MAPPING — all mapped codes
// ═══════════════════════════════════════════════════════════════════

describe("CaseWriteErrorMapping complete coverage (p1-qa-001-01)", () => {
  it("every mapped code resolves to a non-unknown i18n key", () => {
    for (const code of Object.keys(CASE_WRITE_ERROR_I18N_MAP)) {
      const resolved = resolveWriteErrorI18nKey(code);
      expect(resolved, `${code} resolved to unknown`).not.toBe(
        "cases.writeErrors.unknown",
      );
      expect(resolved).toMatch(/^cases\.writeErrors\.\w+$/);
    }
  });

  it("unknown code → cases.writeErrors.unknown", () => {
    expect(resolveWriteErrorI18nKey("TOTALLY_UNKNOWN_CODE")).toBe(
      "cases.writeErrors.unknown",
    );
  });

  it("undefined → cases.writeErrors.unknown", () => {
    expect(resolveWriteErrorI18nKey(undefined)).toBe(
      "cases.writeErrors.unknown",
    );
  });

  it("gate block codes classified correctly", () => {
    const gateBlockCodes = [
      "CASE_GATE_A_MISSING_PRIMARY_PARTY",
      "CASE_GATE_B_INCOMPLETE_REQUIRED_ITEMS",
      "CASE_GATE_VALIDATION_RUN_MISSING",
      "CASE_GATE_VALIDATION_RUN_NOT_PASSED",
      "CASE_GATE_VALIDATION_RUN_STALE",
      "CASE_GATE_REVIEW_NOT_APPROVED",
      "CASE_GATE_C_BILLING_RISK_UNACKNOWLEDGED",
      "CASE_PRE_SIGN_GATE_SURVEY_INCOMPLETE",
      "CASE_PRE_SIGN_GATE_QUOTE_UNCONFIRMED",
      "CASE_WF_STEP_BILLING_GATE_BLOCKED",
      "CASE_WF_STEP_NOT_ALLOWED",
      "CASE_POST_APPROVAL_BILLING_BLOCKED",
      "CASE_POST_APPROVAL_BILLING_RISK_UNACKNOWLEDGED",
      "CASE_SUCCESS_CLOSEOUT_BLOCKED",
      "CASE_FAILURE_CLOSEOUT_ATTRIBUTION_REQUIRED",
    ];
    for (const code of gateBlockCodes) {
      expect(isGateBlockError(code), `${code} should be gate block`).toBe(true);
    }
  });

  it("non-gate block codes classified correctly", () => {
    const nonGateBlockCodes = [
      "CASE_S9_READONLY",
      "CASE_TRANSITION_NOT_ALLOWED",
      "CASE_TRANSITION_CONFLICT",
      "CASE_BILLING_RISK_ACK_FAILED",
      "CASE_POST_APPROVAL_STAGE_INVALID",
      "CASE_CROSS_GROUP_REASON_REQUIRED",
      "CASE_GROUP_TRANSFER_REASON_REQUIRED",
      "CASE_GROUP_NOT_FOUND",
      "CASE_INVALID_ENUM",
      "CASE_NOT_FOUND",
      "CASE_REF_NOT_FOUND",
      "CASE_PARTY_PARENT_NOT_FOUND",
      "CASE_PARTY_NOT_FOUND",
      "CASE_PARTY_INVALID_TYPE",
      "CASE_SURVEY_UPDATE_FAILED",
      "CASE_QUOTE_UPDATE_FAILED",
      "CASE_REMINDER_CREATION_FAILED",
    ];
    for (const code of nonGateBlockCodes) {
      expect(isGateBlockError(code), `${code} should NOT be gate block`).toBe(
        false,
      );
    }
  });

  it("undefined and empty string are not gate blocks", () => {
    expect(isGateBlockError(undefined)).toBe(false);
    expect(isGateBlockError("")).toBe(false);
  });

  it("P1-specific error codes all have i18n mappings", () => {
    const p1Codes = [
      "CASE_PRE_SIGN_GATE_SURVEY_INCOMPLETE",
      "CASE_PRE_SIGN_GATE_QUOTE_UNCONFIRMED",
      "CASE_SURVEY_UPDATE_FAILED",
      "CASE_QUOTE_UPDATE_FAILED",
      "CASE_WF_STEP_BILLING_GATE_BLOCKED",
      "CASE_WF_STEP_NOT_ALLOWED",
      "CASE_SUCCESS_CLOSEOUT_BLOCKED",
      "CASE_FAILURE_CLOSEOUT_ATTRIBUTION_REQUIRED",
      "CASE_REMINDER_CREATION_FAILED",
    ];
    for (const code of p1Codes) {
      expect(
        CASE_WRITE_ERROR_I18N_MAP[code],
        `${code} missing i18n mapping`,
      ).toBeDefined();
    }
  });
});
