import { describe, expect, it, vi } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";
import { installHashHistoryBrowserSync } from "./hashHistoryBrowserSync";

describe("installHashHistoryBrowserSync", () => {
  it("resyncs router after replaceState changes hash without hashchange", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/", name: "home", component: { template: "<div/>" } },
        {
          path: "/documents",
          name: "documents",
          component: { template: "<div/>" },
        },
        { path: "/leads", name: "leads", component: { template: "<div/>" } },
      ],
    });

    await router.push("/documents");
    await router.isReady();

    installHashHistoryBrowserSync(router);

    history.replaceState(history.state, "", "#/leads");

    await vi.waitFor(() => {
      expect(router.currentRoute.value.path).toBe("/leads");
    });
  });
});
