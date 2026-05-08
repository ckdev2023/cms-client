import { describe, expect, it } from "vitest";
import * as api from "./caseTitleFallback";

describe("shared/model/caseTitleFallback public API", () => {
  it("exports exactly buildFallbackName and isFallbackTitle", () => {
    expect(Object.keys(api).sort()).toEqual([
      "buildFallbackName",
      "isFallbackTitle",
    ]);
  });

  it("buildFallbackName is a function", () => {
    expect(typeof api.buildFallbackName).toBe("function");
  });

  it("isFallbackTitle is a function", () => {
    expect(typeof api.isFallbackTitle).toBe("function");
  });
});
