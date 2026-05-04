import { describe, it, expect, vi } from "vitest";
import { ref, nextTick } from "vue";
import {
  useCaseValidationActions,
  type BillingRiskAckRepo,
} from "./useCaseValidationActions";
import type { ValidationRunsRepository } from "../data/ValidationRunsRepository";
import { RepositoryError } from "../../../shared/api/repositoryRuntime";

function createMockRepo(
  overrides: Partial<ValidationRunsRepository> = {},
): ValidationRunsRepository {
  return {
    createRun: vi.fn(async () => ({
      id: "vr-001",
      caseId: "case-1",
      status: "completed",
    })),
    ...overrides,
  };
}

describe("useCaseValidationActions — acknowledgeBillingRisk", () => {
  function createMockRiskAckRepo(
    overrides: Partial<BillingRiskAckRepo> = {},
  ): BillingRiskAckRepo {
    return {
      acknowledgeBillingRisk: vi.fn(async () => ({
        id: "case-1",
        success: true,
      })),
      ...overrides,
    };
  }

  const PAYLOAD = {
    reason: "customer confirmed",
    person: "Taro Yamada",
    evidence: "https://example.com/proof.pdf",
  };

  it("starts with loading=false and no error", () => {
    const riskAckRepo = createMockRiskAckRepo();
    const { riskAckLoading, riskAckError, riskAckErrorI18nKey } =
      useCaseValidationActions({
        caseId: ref("case-1"),
        repo: createMockRepo(),
        riskAckRepo,
      });

    expect(riskAckLoading.value).toBe(false);
    expect(riskAckError.value).toBeNull();
    expect(riskAckErrorI18nKey.value).toBeNull();
  });

  it("sets loading during ack and clears on success", async () => {
    let resolveAck!: (v: unknown) => void;
    const riskAckRepo = createMockRiskAckRepo({
      acknowledgeBillingRisk: vi.fn(
        () =>
          new Promise((r) => {
            resolveAck = r;
          }),
      ),
    });

    const { riskAckLoading, acknowledgeBillingRisk } = useCaseValidationActions(
      {
        caseId: ref("case-1"),
        repo: createMockRepo(),
        riskAckRepo,
      },
    );

    const promise = acknowledgeBillingRisk(PAYLOAD);
    await nextTick();
    expect(riskAckLoading.value).toBe(true);

    resolveAck({ id: "case-1", success: true });
    await promise;

    expect(riskAckLoading.value).toBe(false);
  });

  it("calls repo with caseId and mapped input", async () => {
    const riskAckRepo = createMockRiskAckRepo();
    const caseId = ref("case-42");

    const { acknowledgeBillingRisk } = useCaseValidationActions({
      caseId,
      repo: createMockRepo(),
      riskAckRepo,
    });

    await acknowledgeBillingRisk(PAYLOAD);
    expect(riskAckRepo.acknowledgeBillingRisk).toHaveBeenCalledWith("case-42", {
      reasonCode: "manager_override",
      reasonNote: "customer confirmed",
      evidenceUrl: "https://example.com/proof.pdf",
    });
  });

  it("invokes onRiskAckSuccess callback after success", async () => {
    const riskAckRepo = createMockRiskAckRepo();
    const onSuccess = vi.fn();

    const { acknowledgeBillingRisk } = useCaseValidationActions({
      caseId: ref("case-1"),
      repo: createMockRepo(),
      riskAckRepo,
      onRiskAckSuccess: onSuccess,
    });

    await acknowledgeBillingRisk(PAYLOAD);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("sets error and i18n key on failure", async () => {
    const riskAckRepo = createMockRiskAckRepo({
      acknowledgeBillingRisk: vi.fn(async () => {
        throw new RepositoryError({
          code: "CASE_WRITE_ERROR",
          message: "Risk ack failed",
          serverErrorCode: "CASE_BILLING_RISK_ACK_FAILED",
        });
      }),
    });
    const onSuccess = vi.fn();

    const {
      riskAckLoading,
      riskAckError,
      riskAckErrorI18nKey,
      acknowledgeBillingRisk,
    } = useCaseValidationActions({
      caseId: ref("case-1"),
      repo: createMockRepo(),
      riskAckRepo,
      onRiskAckSuccess: onSuccess,
    });

    await acknowledgeBillingRisk(PAYLOAD);

    expect(riskAckLoading.value).toBe(false);
    expect(riskAckError.value).toBe("Risk ack failed");
    expect(riskAckErrorI18nKey.value).toBe(
      "cases.writeErrors.billingRiskAckFailed",
    );
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("ignores concurrent calls while loading", async () => {
    let resolveAck!: (v: unknown) => void;
    const ackFn = vi.fn(
      () =>
        new Promise((r) => {
          resolveAck = r;
        }),
    );
    const riskAckRepo = createMockRiskAckRepo({
      acknowledgeBillingRisk: ackFn,
    });

    const { acknowledgeBillingRisk } = useCaseValidationActions({
      caseId: ref("case-1"),
      repo: createMockRepo(),
      riskAckRepo,
    });

    const p1 = acknowledgeBillingRisk(PAYLOAD);
    void acknowledgeBillingRisk(PAYLOAD);

    expect(ackFn).toHaveBeenCalledTimes(1);

    resolveAck({ id: "case-1", success: true });
    await p1;
  });

  it("clears previous error on retry", async () => {
    let callCount = 0;
    const riskAckRepo = createMockRiskAckRepo({
      acknowledgeBillingRisk: vi.fn(async () => {
        callCount++;
        if (callCount === 1) throw new Error("First failure");
        return { id: "case-1", success: true };
      }),
    });

    const { riskAckError, acknowledgeBillingRisk } = useCaseValidationActions({
      caseId: ref("case-1"),
      repo: createMockRepo(),
      riskAckRepo,
    });

    await acknowledgeBillingRisk(PAYLOAD);
    expect(riskAckError.value).toBe("First failure");

    await acknowledgeBillingRisk(PAYLOAD);
    expect(riskAckError.value).toBeNull();
  });
});
