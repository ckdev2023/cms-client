import { describe, expect, it } from "vitest";

import { createBillingRepositoryRuntime } from "./BillingRepositorySupport";

describe("createBillingRepositoryRuntime", () => {
  it("defaults apiPath to /api", () => {
    const runtime = createBillingRepositoryRuntime({
      getToken: () => "token",
    });

    expect(runtime.apiPath).toBe("/api");
  });
});
