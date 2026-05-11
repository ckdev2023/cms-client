import { describe, expect, it, vi } from "vitest";
import { ref, nextTick } from "vue";
import type { LocationQuery } from "vue-router";
import { watchLeadDetailInvalidTabQuery } from "./leadDetailQueryTabSanitize";

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
  await nextTick();
}

describe("watchLeadDetailInvalidTabQuery", () => {
  it("invokes replaceQuery to drop invalid tab", async () => {
    const routeQuery = ref<LocationQuery>({
      tab: "bogus",
      keep: "x",
    });
    const replaceQuery = vi.fn((patch: Record<string, string | undefined>) => {
      const next = { ...routeQuery.value };
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined) delete next[k];
        else next[k] = v;
      }
      routeQuery.value = next;
    });
    watchLeadDetailInvalidTabQuery(routeQuery, replaceQuery);
    await flush();
    expect(replaceQuery).toHaveBeenCalledWith({ tab: undefined });
    expect(routeQuery.value.tab).toBeUndefined();
    expect(routeQuery.value.keep).toBe("x");
  });

  it("normalizes invalid tab to conversion when resumeConvert=1", async () => {
    const routeQuery = ref<LocationQuery>({
      tab: "bogus",
      resumeConvert: "1",
    });
    const replaceQuery = vi.fn((patch: Record<string, string | undefined>) => {
      const next = { ...routeQuery.value };
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined) delete next[k];
        else next[k] = v;
      }
      routeQuery.value = next;
    });
    watchLeadDetailInvalidTabQuery(routeQuery, replaceQuery);
    await flush();
    expect(replaceQuery).toHaveBeenCalledWith({ tab: "conversion" });
    expect(routeQuery.value.tab).toBe("conversion");
  });
});
