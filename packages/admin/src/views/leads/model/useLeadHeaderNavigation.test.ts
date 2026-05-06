import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { LEAD_DETAIL_SAMPLES } from "../fixtures-detail";
import { useLeadHeaderNavigation } from "./useLeadHeaderNavigation";
import type { LeadDetail } from "../types";

interface FakeRouter {
  push: ReturnType<typeof vi.fn>;
}

function makeFakeRouter(): FakeRouter {
  return { push: vi.fn().mockResolvedValue(undefined) };
}

describe("useLeadHeaderNavigation (R2-B-6)", () => {
  describe("handleViewCustomer", () => {
    it("跳转到 customer-detail 路由（基于 lead.conversion.convertedCustomer.id）", () => {
      const lead = ref<LeadDetail | null>(
        LEAD_DETAIL_SAMPLES["converted-customer"],
      );
      const router = makeFakeRouter();
      const { handleViewCustomer } = useLeadHeaderNavigation({ lead, router });

      handleViewCustomer();

      expect(router.push).toHaveBeenCalledTimes(1);
      expect(router.push).toHaveBeenCalledWith({
        name: "customer-detail",
        params: { id: "CUS-2026-0195" },
      });
    });

    it("lead 为 null 时不跳转（loading / not-found 防御）", () => {
      const lead = ref<LeadDetail | null>(null);
      const router = makeFakeRouter();
      const { handleViewCustomer } = useLeadHeaderNavigation({ lead, router });

      handleViewCustomer();

      expect(router.push).not.toHaveBeenCalled();
    });

    it("convertedCustomer 为 null 时不跳转", () => {
      const lead = ref<LeadDetail | null>(LEAD_DETAIL_SAMPLES.following);
      const router = makeFakeRouter();
      const { handleViewCustomer } = useLeadHeaderNavigation({ lead, router });

      handleViewCustomer();

      expect(router.push).not.toHaveBeenCalled();
    });
  });

  describe("handleViewCase", () => {
    it("跳转到 case-detail 路由（基于 lead.conversion.convertedCase.id）", () => {
      const lead = ref<LeadDetail | null>(
        LEAD_DETAIL_SAMPLES["converted-case"],
      );
      const router = makeFakeRouter();
      const { handleViewCase } = useLeadHeaderNavigation({ lead, router });

      handleViewCase();

      expect(router.push).toHaveBeenCalledTimes(1);
      expect(router.push).toHaveBeenCalledWith({
        name: "case-detail",
        params: { id: "CAS-2026-0210" },
      });
    });

    it("lead 为 null 时不跳转", () => {
      const lead = ref<LeadDetail | null>(null);
      const router = makeFakeRouter();
      const { handleViewCase } = useLeadHeaderNavigation({ lead, router });

      handleViewCase();

      expect(router.push).not.toHaveBeenCalled();
    });

    it("convertedCase 为 null 时不跳转（仅转 customer 但未转 case 的中间态）", () => {
      const lead = ref<LeadDetail | null>(
        LEAD_DETAIL_SAMPLES["converted-customer"],
      );
      const router = makeFakeRouter();
      const { handleViewCase } = useLeadHeaderNavigation({ lead, router });

      handleViewCase();

      expect(router.push).not.toHaveBeenCalled();
    });
  });

  it("两个跳转互不影响（converted-case 状态下分别触发两次 push）", () => {
    const lead = ref<LeadDetail | null>(LEAD_DETAIL_SAMPLES["converted-case"]);
    const router = makeFakeRouter();
    const { handleViewCustomer, handleViewCase } = useLeadHeaderNavigation({
      lead,
      router,
    });

    handleViewCustomer();
    handleViewCase();

    expect(router.push).toHaveBeenCalledTimes(2);
    expect(router.push).toHaveBeenNthCalledWith(1, {
      name: "customer-detail",
      params: { id: "CUS-2026-0195" },
    });
    expect(router.push).toHaveBeenNthCalledWith(2, {
      name: "case-detail",
      params: { id: "CAS-2026-0210" },
    });
  });
});
