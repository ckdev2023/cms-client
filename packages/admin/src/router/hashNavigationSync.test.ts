import { describe, expect, it } from "vitest";
import {
  hashNavigationDesyncedFromRouter,
  hashRouterFullPathFromLocation,
} from "./hashNavigationSync";

describe("hashRouterFullPathFromLocation", () => {
  it("maps empty hash to root", () => {
    expect(hashRouterFullPathFromLocation({ hash: "" })).toBe("/");
  });

  it("maps #/ to root", () => {
    expect(hashRouterFullPathFromLocation({ hash: "#/" })).toBe("/");
  });

  it("strips leading hash for routes", () => {
    expect(hashRouterFullPathFromLocation({ hash: "#/cases" })).toBe("/cases");
  });

  it("preserves query in hash path", () => {
    expect(
      hashRouterFullPathFromLocation({ hash: "#/cases/create?step=2" }),
    ).toBe("/cases/create?step=2");
  });
});

describe("hashNavigationDesyncedFromRouter", () => {
  it("returns false when hash matches router fullPath", () => {
    expect(
      hashNavigationDesyncedFromRouter({ hash: "#/cases" }, "/cases"),
    ).toBe(false);
  });

  it("returns true when navigation aborted but hash already moved", () => {
    expect(hashNavigationDesyncedFromRouter({ hash: "#/cases" }, "/")).toBe(
      true,
    );
  });
});
