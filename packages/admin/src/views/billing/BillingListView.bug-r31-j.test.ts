import { describe, it, expect, vi } from "vitest";
import { ref, nextTick } from "vue";
import { useBillingDeepLink } from "./model/useBillingDeepLink";

function createDeps(initialCase = "", initialBillingPlan = "") {
  const caseQuery = ref(initialCase);
  const billingPlanQuery = ref(initialBillingPlan);
  const search = ref("");
  const openPaymentModal =
    vi.fn<(caseId: string, billingPlanId?: string) => void>();
  const clearQuery = vi.fn();
  return { caseQuery, billingPlanQuery, search, openPaymentModal, clearQuery };
}

describe("useBillingDeepLink — R31-J deep link from case detail to billing", () => {
  it("consumes route.query.case on mount: writes search + opens modal + clears query", () => {
    const deps = createDeps("CASE-202604-0018");
    const { consumed } = useBillingDeepLink(deps);

    expect(consumed.value).toBe(true);
    expect(deps.search.value).toBe("CASE-202604-0018");
    expect(deps.openPaymentModal).toHaveBeenCalledWith("CASE-202604-0018");
    expect(deps.clearQuery).toHaveBeenCalledOnce();
  });

  it("does nothing when caseQuery is empty on mount", () => {
    const deps = createDeps("");
    const { consumed } = useBillingDeepLink(deps);

    expect(consumed.value).toBe(false);
    expect(deps.search.value).toBe("");
    expect(deps.openPaymentModal).not.toHaveBeenCalled();
    expect(deps.clearQuery).not.toHaveBeenCalled();
  });

  it("reacts to late-arriving caseQuery (e.g. async route resolution)", async () => {
    const deps = createDeps("");
    const { consumed } = useBillingDeepLink(deps);
    expect(consumed.value).toBe(false);

    deps.caseQuery.value = "CASE-202605-0006";
    await nextTick();

    expect(consumed.value).toBe(true);
    expect(deps.search.value).toBe("CASE-202605-0006");
    expect(deps.openPaymentModal).toHaveBeenCalledWith("CASE-202605-0006");
    expect(deps.clearQuery).toHaveBeenCalledOnce();
  });

  it("once-only: does not re-trigger after consumed even if caseQuery changes", async () => {
    const deps = createDeps("CASE-001");
    useBillingDeepLink(deps);

    deps.caseQuery.value = "CASE-002";
    await nextTick();

    expect(deps.openPaymentModal).toHaveBeenCalledTimes(1);
    expect(deps.openPaymentModal).toHaveBeenCalledWith("CASE-001");
  });

  it("once-only: clearQuery setting caseQuery to empty does not re-trigger", async () => {
    const deps = createDeps("CASE-001");
    deps.clearQuery.mockImplementation(() => {
      deps.caseQuery.value = "";
    });
    useBillingDeepLink(deps);

    await nextTick();

    expect(deps.openPaymentModal).toHaveBeenCalledTimes(1);
  });

  it("preserves existing search value when no deep link", () => {
    const deps = createDeps("");
    deps.search.value = "existing search";
    useBillingDeepLink(deps);

    expect(deps.search.value).toBe("existing search");
  });

  it("overwrites existing search when deep link is present", () => {
    const deps = createDeps("CASE-DL-001");
    deps.search.value = "existing search";
    useBillingDeepLink(deps);

    expect(deps.search.value).toBe("CASE-DL-001");
  });

  it("forwards billingPlanQuery to openPaymentModal when present", () => {
    const deps = createDeps("CASE-202605-0001", "bp-plan-99");
    useBillingDeepLink(deps);

    expect(deps.openPaymentModal).toHaveBeenCalledWith(
      "CASE-202605-0001",
      "bp-plan-99",
    );
  });
});
