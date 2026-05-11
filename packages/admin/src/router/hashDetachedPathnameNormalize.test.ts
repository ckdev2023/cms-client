import { describe, expect, it } from "vitest";
import { resolveDetachedHashBasenameHref } from "./hashDetachedPathnameNormalize";

describe("resolveDetachedHashBasenameHref", () => {
  it("returns null when pathname is already the Vite root base", () => {
    expect(
      resolveDetachedHashBasenameHref(
        {
          origin: "http://127.0.0.1:5173",
          pathname: "/",
          hash: "#/cases",
          search: "",
        },
        "/",
      ),
    ).toBeNull();
  });

  it("strips a detached /login pathname when hash routes are used (root base)", () => {
    expect(
      resolveDetachedHashBasenameHref(
        {
          origin: "http://127.0.0.1:5173",
          pathname: "/login",
          hash: "#/cases",
          search: "?x=1",
        },
        "/",
      ),
    ).toBe("http://127.0.0.1:5173/?x=1#/cases");
  });

  it("fixes /cases SPA fallback leakage for root deployments", () => {
    expect(
      resolveDetachedHashBasenameHref(
        {
          origin: "http://127.0.0.1:5173",
          pathname: "/cases",
          hash: "#/cases",
          search: "",
        },
        "/",
      ),
    ).toBe("http://127.0.0.1:5173/#/cases");
  });

  it("rewrites to the Vite subdirectory base pathname when path leaked", () => {
    expect(
      resolveDetachedHashBasenameHref(
        {
          origin: "http://localhost",
          pathname: "/login",
          hash: "#/dash",
          search: "",
        },
        "/subdir/",
      ),
    ).toBe("http://localhost/subdir/#/dash");
  });

  it("skips rewriting for relative vite bases", () => {
    expect(
      resolveDetachedHashBasenameHref(
        {
          origin: "http://127.0.0.1",
          pathname: "/login",
          hash: "#/dash",
          search: "",
        },
        "./",
      ),
    ).toBeNull();
  });

  it("returns null without a hash-router style fragment", () => {
    expect(
      resolveDetachedHashBasenameHref(
        {
          origin: "http://127.0.0.1",
          pathname: "/login",
          hash: "",
          search: "",
        },
        "/",
      ),
    ).toBeNull();
  });
});
