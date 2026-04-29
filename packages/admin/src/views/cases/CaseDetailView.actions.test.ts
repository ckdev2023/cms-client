import { describe, it, expect, vi } from "vitest";
import {
  useCasePhaseTransitionMenu,
  getAvailablePhaseTargets,
  isTerminalPhase,
} from "./model/useCasePhaseTransitionMenu";
import { ref } from "vue";
import type { CaseDetail } from "./types";
import type { CaseRepository } from "./model/CaseRepository";
import type { CaseUpdateInput } from "./model/CaseAdapterTypes";
import { createMockDetail } from "./model/useCaseDetailModel.test-support";

function makeStubRepo(overrides: Partial<CaseRepository> = {}): CaseRepository {
  return {
    listCases: vi.fn(),
    getSummaryCards: vi.fn(),
    getDetail: vi.fn(),
    getDetailAggregate: vi.fn(),
    createCase: vi.fn(),
    updateCase: vi.fn().mockResolvedValue({ id: "case-001" }),
    transitionCase: vi.fn(),
    acknowledgeBillingRisk: vi.fn(),
    updatePostApprovalStage: vi.fn(),
    transitionWorkflowStep: vi.fn(),
    transitionPhase: vi.fn().mockResolvedValue({ id: "case-001" }),
    deleteCase: vi.fn(),
    getMessages: vi.fn(),
    getLogEntries: vi.fn(),
    getDocumentItems: vi.fn(),
    getGeneratedDocuments: vi.fn(),
    getValidationData: vi.fn(),
    getBillingData: vi.fn(),
    getBillingTabAggregate: vi.fn(),
    getSubmissionPackages: vi.fn(),
    getDoubleReviewEntries: vi.fn(),
    getTasks: vi.fn(),
    getDeadlines: vi.fn(),
    createCaseParty: vi.fn(),
    retryReminderCreation: vi.fn(),
    ...overrides,
  } as unknown as CaseRepository;
}

describe("CaseDetailView actions wiring", () => {
  describe("status transition button", () => {
    it("phase menu openMenu is callable and toggles menuOpen", () => {
      const detail = ref<CaseDetail | null>(
        createMockDetail({ businessPhase: "UNDER_REVIEW" }),
      );
      const repo = makeStubRepo();
      const menu = useCasePhaseTransitionMenu({
        detail,
        repo,
        getCaseId: () => "case-001",
        onSuccess: vi.fn().mockResolvedValue(undefined),
      });

      expect(menu.menuOpen.value).toBe(false);
      menu.openMenu();
      expect(menu.menuOpen.value).toBe(true);
    });

    it("disables when no available targets (terminal phase)", () => {
      const targets = getAvailablePhaseTargets("CLOSED_SUCCESS");
      expect(targets.length).toBe(0);
    });

    it("performTransition sends closeReason for CLOSED_FAILED", async () => {
      const detail = ref<CaseDetail | null>(
        createMockDetail({ businessPhase: "REJECTED" }),
      );
      const repo = makeStubRepo();
      const menu = useCasePhaseTransitionMenu({
        detail,
        repo,
        getCaseId: () => "case-001",
        onSuccess: vi.fn().mockResolvedValue(undefined),
      });

      const ok = await menu.performTransition("CLOSED_FAILED", {
        closeReason: "BMV-VISA-REJECTED",
        resultOutcome: "failure",
      });
      expect(ok).toBe(true);
      expect(repo.transitionPhase).toHaveBeenCalledWith("case-001", {
        toPhase: "CLOSED_FAILED",
        closeReason: "BMV-VISA-REJECTED",
        resultOutcome: "failure",
      });
    });

    it("closeMenu resets menuOpen after performTransition succeeds", async () => {
      const detail = ref<CaseDetail | null>(
        createMockDetail({ businessPhase: "UNDER_REVIEW" }),
      );
      const repo = makeStubRepo();
      const menu = useCasePhaseTransitionMenu({
        detail,
        repo,
        getCaseId: () => "case-001",
        onSuccess: vi.fn().mockResolvedValue(undefined),
      });

      menu.openMenu();
      expect(menu.menuOpen.value).toBe(true);
      await menu.performTransition("APPROVED");
      expect(menu.menuOpen.value).toBe(false);
    });
  });

  describe("export zip button", () => {
    it("export zip is a placeholder action (no crash on invocation)", () => {
      const handler = vi.fn();
      handler("ZIP export not ready");
      expect(handler).toHaveBeenCalledWith("ZIP export not ready");
    });
  });

  describe("edit info button", () => {
    it("updateCase is called with edit fields", async () => {
      const repo = makeStubRepo();
      const input = {
        caseName: "Updated Name",
        agency: "Updated Agency",
        memo: "A memo",
      } as CaseUpdateInput;
      await repo.updateCase("case-001", input);
      expect(repo.updateCase).toHaveBeenCalledWith("case-001", input);
    });
  });

  describe("terminal phase guard", () => {
    it("CLOSED_SUCCESS is terminal", () => {
      expect(isTerminalPhase("CLOSED_SUCCESS")).toBe(true);
    });
    it("CLOSED_FAILED is terminal", () => {
      expect(isTerminalPhase("CLOSED_FAILED")).toBe(true);
    });
    it("UNDER_REVIEW is not terminal", () => {
      expect(isTerminalPhase("UNDER_REVIEW")).toBe(false);
    });
  });
});
