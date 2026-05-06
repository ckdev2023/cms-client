import { describe, expect, it } from "vitest";
import { resolveAdminAuthGuard } from "./authGuard";

describe("resolveAdminAuthGuard", () => {
  it("allows public routes for signed-out users", () => {
    expect(
      resolveAdminAuthGuard(
        {
          fullPath: "/login",
          meta: { publicOnly: true },
          query: {},
        },
        false,
      ),
    ).toBe(true);
  });

  it("redirects signed-out users visiting protected routes to login", () => {
    expect(
      resolveAdminAuthGuard(
        {
          fullPath: "/customers",
          meta: { requiresAuth: true },
          query: {},
        },
        false,
      ),
    ).toEqual({
      name: "login",
      query: { redirect: "/customers" },
    });
  });

  it("redirects signed-in users away from login to the requested page", () => {
    expect(
      resolveAdminAuthGuard(
        {
          fullPath: "/login",
          meta: { publicOnly: true },
          query: { redirect: "/cases" },
        },
        true,
      ),
    ).toBe("/cases");
  });

  it("falls back to dashboard when the redirect target is unsafe", () => {
    expect(
      resolveAdminAuthGuard(
        {
          fullPath: "/login",
          meta: { publicOnly: true },
          query: { redirect: "//evil.example.com" },
        },
        true,
      ),
    ).toBe("/");
  });

  it("allows admin users to access requiresAdmin routes", () => {
    expect(
      resolveAdminAuthGuard(
        {
          fullPath: "/settings",
          meta: { requiresAuth: true, requiresAdmin: true },
          query: {},
        },
        true,
        true,
      ),
    ).toBe(true);
  });

  it("redirects non-admin users away from requiresAdmin routes to dashboard", () => {
    expect(
      resolveAdminAuthGuard(
        {
          fullPath: "/settings",
          meta: { requiresAuth: true, requiresAdmin: true },
          query: {},
        },
        true,
        false,
      ),
    ).toEqual({ name: "dashboard" });
  });

  it("redirects unauthenticated users from requiresAdmin routes to login", () => {
    expect(
      resolveAdminAuthGuard(
        {
          fullPath: "/settings",
          meta: { requiresAuth: true, requiresAdmin: true },
          query: {},
        },
        false,
        false,
      ),
    ).toEqual({
      name: "login",
      query: { redirect: "/settings" },
    });
  });

  it("allows access when requiredPermission is satisfied", () => {
    expect(
      resolveAdminAuthGuard(
        {
          fullPath: "/cases",
          meta: { requiresAuth: true, requiredPermission: "case.view" },
          query: {},
        },
        true,
        false,
        (code) => code === "case.view",
      ),
    ).toBe(true);
  });

  it("redirects to dashboard when requiredPermission is not satisfied", () => {
    expect(
      resolveAdminAuthGuard(
        {
          fullPath: "/cases",
          meta: { requiresAuth: true, requiredPermission: "case.view" },
          query: {},
        },
        true,
        false,
        () => false,
      ),
    ).toEqual({ name: "dashboard" });
  });

  it("skips permission check when hasPermission is not provided", () => {
    expect(
      resolveAdminAuthGuard(
        {
          fullPath: "/cases",
          meta: { requiresAuth: true, requiredPermission: "case.view" },
          query: {},
        },
        true,
        false,
      ),
    ).toBe(true);
  });

  it("skips permission check when route has no requiredPermission", () => {
    expect(
      resolveAdminAuthGuard(
        {
          fullPath: "/dashboard",
          meta: { requiresAuth: true },
          query: {},
        },
        true,
        false,
        () => false,
      ),
    ).toBe(true);
  });
});
