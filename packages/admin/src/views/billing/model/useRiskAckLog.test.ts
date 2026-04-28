import { describe, it, expect, vi } from "vitest";
import { useRiskAckLog, type RiskAckDataSource } from "./useRiskAckLog";
import type {
  BillingMutationResult,
  BillingRiskAckStatus,
} from "./BillingAdapters";

function makeDataSource(
  overrides?: Partial<RiskAckDataSource>,
): RiskAckDataSource {
  return {
    acknowledgeBillingRisk: vi
      .fn<
        (
          caseId: string,
          input: {
            reasonCode: string;
            reasonNote?: string;
            evidenceUrl?: string;
          },
        ) => Promise<BillingMutationResult>
      >()
      .mockResolvedValue({ id: "case-1" }),
    getCaseBillingRiskAck: vi
      .fn<(caseId: string) => Promise<BillingRiskAckStatus | null>>()
      .mockResolvedValue(null),
    ...overrides,
  };
}

describe("useRiskAckLog", () => {
  it("opens and closes modal with correct caseId", () => {
    const ds = makeDataSource();
    const hook = useRiskAckLog({ dataSource: ds });

    expect(hook.modalOpen.value).toBe(false);
    expect(hook.targetCaseId.value).toBeNull();

    hook.openModal("case-123");
    expect(hook.modalOpen.value).toBe(true);
    expect(hook.targetCaseId.value).toBe("case-123");

    hook.closeModal();
    expect(hook.modalOpen.value).toBe(false);
    expect(hook.targetCaseId.value).toBeNull();
  });

  it("acknowledge calls dataSource and returns result on success", async () => {
    const ds = makeDataSource();
    const hook = useRiskAckLog({ dataSource: ds });

    const result = await hook.acknowledge("case-1", {
      reasonCode: "customer_promise",
    });

    expect(ds.acknowledgeBillingRisk).toHaveBeenCalledWith("case-1", {
      reasonCode: "customer_promise",
    });
    expect(result).toEqual({ id: "case-1" });
    expect(hook.submitting.value).toBe(false);
    expect(hook.error.value).toBeNull();
  });

  it("acknowledge with full input forwards reasonNote and evidenceUrl", async () => {
    const ds = makeDataSource();
    const hook = useRiskAckLog({ dataSource: ds });

    await hook.acknowledge("case-2", {
      reasonCode: "other",
      reasonNote: "special reason",
      evidenceUrl: "https://example.com/evidence",
    });

    expect(ds.acknowledgeBillingRisk).toHaveBeenCalledWith("case-2", {
      reasonCode: "other",
      reasonNote: "special reason",
      evidenceUrl: "https://example.com/evidence",
    });
  });

  it("acknowledge sets error on failure and returns null", async () => {
    const ds = makeDataSource({
      acknowledgeBillingRisk: vi
        .fn()
        .mockRejectedValue(new Error("Network error")),
    });
    const hook = useRiskAckLog({ dataSource: ds });

    const result = await hook.acknowledge("case-1", {
      reasonCode: "internal_review",
    });

    expect(result).toBeNull();
    expect(hook.error.value).toBe("Network error");
    expect(hook.submitting.value).toBe(false);
  });

  it("getCaseBillingRiskAck returns status and stores it", async () => {
    const ackStatus: BillingRiskAckStatus = {
      acknowledged: true,
      acknowledgedAt: "2026-04-01T00:00:00Z",
      acknowledgedByDisplayName: "Admin",
      reasonCode: "customer_promise",
      reasonNote: null,
      evidenceUrl: null,
    };
    const ds = makeDataSource({
      getCaseBillingRiskAck: vi.fn().mockResolvedValue(ackStatus),
    });
    const hook = useRiskAckLog({ dataSource: ds });

    const result = await hook.getCaseBillingRiskAck("case-1");

    expect(result).toEqual(ackStatus);
    expect(hook.ackStatus.value).toEqual(ackStatus);
  });

  it("getCaseBillingRiskAck returns null on error without throwing", async () => {
    const ds = makeDataSource({
      getCaseBillingRiskAck: vi.fn().mockRejectedValue(new Error("fail")),
    });
    const hook = useRiskAckLog({ dataSource: ds });

    const result = await hook.getCaseBillingRiskAck("case-1");

    expect(result).toBeNull();
  });

  it("openModal clears previous error", () => {
    const ds = makeDataSource();
    const hook = useRiskAckLog({ dataSource: ds });

    hook.error.value = "previous error";
    hook.openModal("case-1");

    expect(hook.error.value).toBeNull();
  });

  it("submitting flag is true during acknowledge call", async () => {
    let resolve!: (v: BillingMutationResult) => void;
    const ds = makeDataSource({
      acknowledgeBillingRisk: vi.fn().mockReturnValue(
        new Promise<BillingMutationResult>((r) => {
          resolve = r;
        }),
      ),
    });
    const hook = useRiskAckLog({ dataSource: ds });

    const promise = hook.acknowledge("case-1", { reasonCode: "other" });
    expect(hook.submitting.value).toBe(true);

    resolve({ id: "case-1" });
    await promise;

    expect(hook.submitting.value).toBe(false);
  });
});
