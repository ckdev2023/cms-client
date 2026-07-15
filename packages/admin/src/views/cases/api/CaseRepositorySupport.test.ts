import { describe, expect, it } from "vitest";

import { createRuntime } from "./CaseRepositorySupport";

describe("createRuntime", () => {
  it("defaults apiPath to /api/cases", () => {
    const runtime = createRuntime({
      getToken: () => "token",
    });

    expect(runtime.apiPath).toBe("/api/cases");
  });
});
