import { describe, expect, it } from "vitest";
import { computed, ref, nextTick } from "vue";
import type { LocationQuery } from "vue-router";
import { createLeadDetailActiveTab } from "./leadDetailActiveTab";

describe("createLeadDetailActiveTab", () => {
  it("syncs active tab when route query tab changes", async () => {
    const rq = ref<LocationQuery>({ tab: "info" });
    const activeTab = createLeadDetailActiveTab(rq);
    expect(activeTab.value).toBe("info");
    rq.value = { tab: "followups" };
    await nextTick();
    expect(activeTab.value).toBe("followups");
  });

  it("ignores invalid tab values in the URL", async () => {
    const rq = ref<LocationQuery>({ tab: "info" });
    const activeTab = createLeadDetailActiveTab(rq);
    rq.value = { tab: "not-a-real-tab" };
    await nextTick();
    expect(activeTab.value).toBe("info");
  });

  it("works with computed route query", async () => {
    const inner = ref<LocationQuery>({ tab: "conversion" });
    const rq = computed(() => inner.value);
    const activeTab = createLeadDetailActiveTab(rq);
    expect(activeTab.value).toBe("conversion");
  });
});
