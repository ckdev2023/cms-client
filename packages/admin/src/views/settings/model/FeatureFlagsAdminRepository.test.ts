import { describe, it, expect, vi } from "vitest";

import type { FeatureFlagDefinition } from "./featureFlagCatalog";
import {
  createFeatureFlagsAdminRepository,
  adaptFeatureFlagRow,
  adaptFeatureFlagResolution,
  FeatureFlagsAdminRepositoryError,
} from "./FeatureFlagsAdminRepository";

function mockFetch(status: number, body: unknown): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  }) as unknown as typeof fetch;
}

function networkErrorFetch(): typeof fetch {
  return vi
    .fn()
    .mockRejectedValue(
      new TypeError("Failed to fetch"),
    ) as unknown as typeof fetch;
}

const FLAG_ROW = {
  id: "ff-1",
  orgId: "org-1",
  key: "bmv",
  enabled: true,
  payload: {},
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-05-01T00:00:00Z",
};

const BMV_DEFINITION: FeatureFlagDefinition = {
  key: "bmv",
  labelKey: "settings.featureFlags.bmv.label",
  descriptionKey: "settings.featureFlags.bmv.description",
  recommendedDefaultEnabled: true,
};

const getToken = () => "test-token";

describe("adaptFeatureFlagRow", () => {
  it("adapts a valid row DTO", () => {
    expect(adaptFeatureFlagRow(FLAG_ROW)).toEqual(FLAG_ROW);
  });

  it("returns null for non-object", () => {
    expect(adaptFeatureFlagRow(null)).toBeNull();
    expect(adaptFeatureFlagRow("str")).toBeNull();
    expect(adaptFeatureFlagRow(42)).toBeNull();
  });

  it("returns null when required fields are missing", () => {
    expect(adaptFeatureFlagRow({ id: "ff-1" })).toBeNull();
    expect(adaptFeatureFlagRow({ key: "bmv" })).toBeNull();
    expect(adaptFeatureFlagRow({ id: "ff-1", key: "bmv" })).toBeNull();
  });

  it("handles missing optional fields gracefully", () => {
    const result = adaptFeatureFlagRow({
      id: "ff-2",
      key: "test",
      enabled: false,
    });
    expect(result).toEqual({
      id: "ff-2",
      orgId: "",
      key: "test",
      enabled: false,
      payload: {},
      createdAt: "",
      updatedAt: "",
    });
  });
});

describe("adaptFeatureFlagResolution", () => {
  it("adapts an enabled resolution", () => {
    expect(
      adaptFeatureFlagResolution({ key: "bmv", enabled: true, used: true }),
    ).toEqual({ key: "bmv", enabled: true, used: true });
  });

  it("adapts a disabled resolution with reason=missing", () => {
    expect(
      adaptFeatureFlagResolution({
        key: "bmv",
        enabled: false,
        used: false,
        reason: "missing",
      }),
    ).toEqual({ key: "bmv", enabled: false, used: false, reason: "missing" });
  });

  it("adapts a disabled resolution with reason=disabled", () => {
    expect(
      adaptFeatureFlagResolution({
        key: "bmv",
        enabled: false,
        used: false,
        reason: "disabled",
      }),
    ).toEqual({ key: "bmv", enabled: false, used: false, reason: "disabled" });
  });

  it("returns null for non-object", () => {
    expect(adaptFeatureFlagResolution(null)).toBeNull();
  });

  it("returns null for invalid reason", () => {
    expect(
      adaptFeatureFlagResolution({
        key: "bmv",
        enabled: false,
        used: false,
        reason: "unknown",
      }),
    ).toBeNull();
  });
});

describe("createFeatureFlagsAdminRepository", () => {
  describe("listFlags", () => {
    it("fetches all flags with auth header", async () => {
      const request = mockFetch(200, { flags: [FLAG_ROW] });
      const repo = createFeatureFlagsAdminRepository({
        request,
        getToken,
      });

      const result = await repo.listFlags();
      expect(result).toEqual([FLAG_ROW]);
      expect(request).toHaveBeenCalledWith(
        "/api/feature-flags",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        }),
      );
    });

    it("returns empty array when server returns empty flags", async () => {
      const request = mockFetch(200, { flags: [] });
      const repo = createFeatureFlagsAdminRepository({ request, getToken });

      const result = await repo.listFlags();
      expect(result).toEqual([]);
    });

    it("filters out malformed rows", async () => {
      const request = mockFetch(200, {
        flags: [FLAG_ROW, { invalid: true }, null],
      });
      const repo = createFeatureFlagsAdminRepository({ request, getToken });

      const result = await repo.listFlags();
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe("bmv");
    });

    it("throws on invalid response shape", async () => {
      const request = mockFetch(200, { data: [] });
      const repo = createFeatureFlagsAdminRepository({ request, getToken });

      await expect(repo.listFlags()).rejects.toThrow(
        FeatureFlagsAdminRepositoryError,
      );
    });

    it("throws with status on 401", async () => {
      const request = mockFetch(401, { message: "Unauthorized" });
      const repo = createFeatureFlagsAdminRepository({ request, getToken });

      await expect(repo.listFlags()).rejects.toSatisfy(
        (err: FeatureFlagsAdminRepositoryError) =>
          err instanceof FeatureFlagsAdminRepositoryError &&
          err.status === 401 &&
          err.message === "Unauthorized",
      );
    });

    it("throws with status on 403", async () => {
      const request = mockFetch(403, { message: "Forbidden" });
      const repo = createFeatureFlagsAdminRepository({ request, getToken });

      await expect(repo.listFlags()).rejects.toSatisfy(
        (err: FeatureFlagsAdminRepositoryError) =>
          err instanceof FeatureFlagsAdminRepositoryError &&
          err.status === 403 &&
          err.message === "Forbidden",
      );
    });

    it("throws on network error", async () => {
      const request = networkErrorFetch();
      const repo = createFeatureFlagsAdminRepository({ request, getToken });

      await expect(repo.listFlags()).rejects.toSatisfy(
        (err: FeatureFlagsAdminRepositoryError) =>
          err instanceof FeatureFlagsAdminRepositoryError &&
          err.status === undefined &&
          err.message === "Feature flag request failed",
      );
    });
  });

  describe("resolveFlag", () => {
    it("resolves a flag by key", async () => {
      const resolution = {
        key: "bmv",
        enabled: true,
        used: true,
      };
      const request = mockFetch(200, resolution);
      const repo = createFeatureFlagsAdminRepository({ request, getToken });

      const result = await repo.resolveFlag("bmv");
      expect(result).toEqual(resolution);
      expect(request).toHaveBeenCalledWith(
        "/api/feature-flags/resolve?key=bmv",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("resolves a missing flag as disabled", async () => {
      const resolution = {
        key: "unknown",
        enabled: false,
        used: false,
        reason: "missing",
      };
      const request = mockFetch(200, resolution);
      const repo = createFeatureFlagsAdminRepository({ request, getToken });

      const result = await repo.resolveFlag("unknown");
      expect(result).toEqual(resolution);
    });

    it("throws on invalid resolution shape", async () => {
      const request = mockFetch(200, { ok: true });
      const repo = createFeatureFlagsAdminRepository({ request, getToken });

      await expect(repo.resolveFlag("bmv")).rejects.toThrow(
        FeatureFlagsAdminRepositoryError,
      );
    });

    it("throws with status on 401", async () => {
      const request = mockFetch(401, { message: "Unauthorized" });
      const repo = createFeatureFlagsAdminRepository({ request, getToken });

      await expect(repo.resolveFlag("bmv")).rejects.toSatisfy(
        (err: FeatureFlagsAdminRepositoryError) =>
          err instanceof FeatureFlagsAdminRepositoryError && err.status === 401,
      );
    });

    it("throws on network error", async () => {
      const request = networkErrorFetch();
      const repo = createFeatureFlagsAdminRepository({ request, getToken });

      await expect(repo.resolveFlag("bmv")).rejects.toSatisfy(
        (err: FeatureFlagsAdminRepositoryError) =>
          err instanceof FeatureFlagsAdminRepositoryError &&
          err.status === undefined,
      );
    });
  });

  describe("upsertFlag", () => {
    it("sends POST with key and enabled", async () => {
      const request = mockFetch(200, FLAG_ROW);
      const repo = createFeatureFlagsAdminRepository({ request, getToken });

      const result = await repo.upsertFlag({ key: "bmv", enabled: true });
      expect(result).toEqual(FLAG_ROW);
      expect(request).toHaveBeenCalledWith(
        "/api/feature-flags",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: "Bearer test-token",
          }),
          body: JSON.stringify({ key: "bmv", enabled: true }),
        }),
      );
    });

    it("throws on invalid upsert response", async () => {
      const request = mockFetch(200, { ok: true });
      const repo = createFeatureFlagsAdminRepository({ request, getToken });

      await expect(
        repo.upsertFlag({ key: "bmv", enabled: false }),
      ).rejects.toThrow(FeatureFlagsAdminRepositoryError);
    });

    it("throws with status on 401", async () => {
      const request = mockFetch(401, { message: "Unauthorized" });
      const repo = createFeatureFlagsAdminRepository({ request, getToken });

      await expect(
        repo.upsertFlag({ key: "bmv", enabled: true }),
      ).rejects.toSatisfy(
        (err: FeatureFlagsAdminRepositoryError) =>
          err instanceof FeatureFlagsAdminRepositoryError && err.status === 401,
      );
    });

    it("throws with status on 403", async () => {
      const request = mockFetch(403, { message: "Forbidden" });
      const repo = createFeatureFlagsAdminRepository({ request, getToken });

      await expect(
        repo.upsertFlag({ key: "bmv", enabled: true }),
      ).rejects.toSatisfy(
        (err: FeatureFlagsAdminRepositoryError) =>
          err instanceof FeatureFlagsAdminRepositoryError &&
          err.status === 403 &&
          err.message === "Forbidden",
      );
    });

    it("throws on network error", async () => {
      const request = networkErrorFetch();
      const repo = createFeatureFlagsAdminRepository({ request, getToken });

      await expect(
        repo.upsertFlag({ key: "bmv", enabled: true }),
      ).rejects.toSatisfy(
        (err: FeatureFlagsAdminRepositoryError) =>
          err instanceof FeatureFlagsAdminRepositoryError &&
          err.status === undefined,
      );
    });

    it("throws with server message on 403 without message field", async () => {
      const request = mockFetch(403, { error: "not allowed" });
      const repo = createFeatureFlagsAdminRepository({ request, getToken });

      await expect(
        repo.upsertFlag({ key: "bmv", enabled: true }),
      ).rejects.toSatisfy(
        (err: FeatureFlagsAdminRepositoryError) =>
          err instanceof FeatureFlagsAdminRepositoryError &&
          err.status === 403 &&
          err.message === "Feature flag request failed with status 403",
      );
    });
  });

  describe("resetFlag", () => {
    it("upserts with the catalog recommendedDefaultEnabled value", async () => {
      const request = mockFetch(200, FLAG_ROW);
      const repo = createFeatureFlagsAdminRepository({ request, getToken });

      const result = await repo.resetFlag("bmv", BMV_DEFINITION);
      expect(result).toEqual(FLAG_ROW);
      expect(request).toHaveBeenCalledWith(
        "/api/feature-flags",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ key: "bmv", enabled: true }),
        }),
      );
    });

    it("upserts with enabled=false when catalog recommends false", async () => {
      const disabledDefinition: FeatureFlagDefinition = {
        ...BMV_DEFINITION,
        key: "new-feature",
        recommendedDefaultEnabled: false,
      };
      const disabledRow = { ...FLAG_ROW, key: "new-feature", enabled: false };
      const request = mockFetch(200, disabledRow);
      const repo = createFeatureFlagsAdminRepository({ request, getToken });

      const result = await repo.resetFlag("new-feature", disabledDefinition);
      expect(result.enabled).toBe(false);
      expect(request).toHaveBeenCalledWith(
        "/api/feature-flags",
        expect.objectContaining({
          body: JSON.stringify({ key: "new-feature", enabled: false }),
        }),
      );
    });
  });
});
