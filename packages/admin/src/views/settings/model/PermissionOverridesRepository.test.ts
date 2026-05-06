import { describe, it, expect, vi } from "vitest";
import {
  createPermissionOverridesRepository,
  adaptOverrideItem,
  PermissionOverridesRepositoryError,
} from "./PermissionOverridesRepository";

function mockFetch(status: number, body: unknown): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  }) as unknown as typeof fetch;
}

describe("adaptOverrideItem", () => {
  it("adapts valid override DTO", () => {
    const dto = {
      userId: "u1",
      permission: "case.export",
      effect: "deny",
      reason: "temp restriction",
      grantedBy: "admin1",
      grantedAt: "2025-01-01T00:00:00Z",
      expiresAt: "2025-06-01T00:00:00Z",
    };
    expect(adaptOverrideItem(dto)).toEqual(dto);
  });

  it("returns null for non-object", () => {
    expect(adaptOverrideItem(null)).toBeNull();
    expect(adaptOverrideItem("str")).toBeNull();
  });

  it("returns null when effect is invalid", () => {
    expect(
      adaptOverrideItem({ permission: "case.view", effect: "invalid" }),
    ).toBeNull();
  });

  it("handles missing optional fields gracefully", () => {
    const result = adaptOverrideItem({
      permission: "case.view",
      effect: "grant",
    });
    expect(result).toEqual({
      userId: "",
      permission: "case.view",
      effect: "grant",
      reason: null,
      grantedBy: "",
      grantedAt: "",
      expiresAt: null,
    });
  });
});

describe("createPermissionOverridesRepository", () => {
  const getToken = () => "test-token";

  describe("listOverrides", () => {
    it("fetches overrides for a user", async () => {
      const items = [
        {
          userId: "u1",
          permission: "case.export",
          effect: "deny",
          reason: "restricted",
          grantedBy: "admin",
          grantedAt: "2025-01-01T00:00:00Z",
          expiresAt: null,
        },
      ];
      const request = mockFetch(200, { items });
      const repo = createPermissionOverridesRepository({
        request,
        getToken,
        apiBase: "/api/admin/users",
      });

      const result = await repo.listOverrides("u1");
      expect(result).toHaveLength(1);
      expect(result[0].permission).toBe("case.export");
      expect(request).toHaveBeenCalledWith(
        "/api/admin/users/u1/permission-overrides",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("throws on invalid response shape", async () => {
      const request = mockFetch(200, { invalid: true });
      const repo = createPermissionOverridesRepository({ request, getToken });

      await expect(repo.listOverrides("u1")).rejects.toThrow(
        PermissionOverridesRepositoryError,
      );
    });

    it("throws on HTTP error with message", async () => {
      const request = mockFetch(403, { message: "Forbidden" });
      const repo = createPermissionOverridesRepository({ request, getToken });

      await expect(repo.listOverrides("u1")).rejects.toThrow("Forbidden");
    });
  });

  describe("setOverrides", () => {
    it("sends PUT with overrides array", async () => {
      const items = [
        {
          userId: "u1",
          permission: "case.export",
          effect: "deny",
          reason: "restricted for now",
          grantedBy: "admin",
          grantedAt: "2025-01-01T00:00:00Z",
          expiresAt: null,
        },
      ];
      const request = mockFetch(200, { items });
      const repo = createPermissionOverridesRepository({
        request,
        getToken,
        apiBase: "/api/admin/users",
      });

      const overrides = [
        {
          permission: "case.export",
          effect: "deny" as const,
          reason: "restricted for now",
        },
      ];
      const result = await repo.setOverrides("u1", overrides);
      expect(result).toHaveLength(1);
      expect(request).toHaveBeenCalledWith(
        "/api/admin/users/u1/permission-overrides",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ overrides }),
        }),
      );
    });
  });

  describe("deleteOverride", () => {
    it("sends DELETE for specific permission", async () => {
      const request = mockFetch(200, { ok: true });
      const repo = createPermissionOverridesRepository({
        request,
        getToken,
        apiBase: "/api/admin/users",
      });

      await repo.deleteOverride("u1", "case.export");
      expect(request).toHaveBeenCalledWith(
        "/api/admin/users/u1/permission-overrides/case.export",
        expect.objectContaining({ method: "DELETE" }),
      );
    });

    it("throws on network error", async () => {
      const request = vi
        .fn()
        .mockRejectedValue(new Error("Network")) as unknown as typeof fetch;
      const repo = createPermissionOverridesRepository({ request, getToken });

      await expect(repo.deleteOverride("u1", "case.export")).rejects.toThrow(
        "Request failed",
      );
    });
  });
});
