import { describe, it, expect, vi } from "vitest";
import {
  createPermissionsRepository,
  type MyPermissionsResponse,
} from "./PermissionsRepository";

function stubFetch(body: unknown, ok = true): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(body),
  } as Response);
}

describe("PermissionsRepository", () => {
  describe("fetchMyPermissions", () => {
    it("returns permissions from a valid response", async () => {
      const body: MyPermissionsResponse = {
        permissions: ["case.view", "case.edit"],
        role: "staff",
        userId: "u1",
      };
      const request = stubFetch(body);
      const repo = createPermissionsRepository({
        request,
        getToken: () => "tok",
        apiBase: "/api/users",
      });

      const result = await repo.fetchMyPermissions();

      expect(result).toEqual(body);
      expect(request).toHaveBeenCalledWith("/api/users/me/permissions", {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: "Bearer tok",
        },
      });
    });

    it("returns empty on non-ok response", async () => {
      const request = stubFetch({}, false);
      const repo = createPermissionsRepository({
        request,
        getToken: () => null,
      });

      const result = await repo.fetchMyPermissions();

      expect(result).toEqual({ permissions: [], role: "", userId: "" });
    });

    it("returns empty on invalid response body", async () => {
      const request = stubFetch("not-json-object");
      const repo = createPermissionsRepository({
        request,
        getToken: () => null,
      });

      const result = await repo.fetchMyPermissions();

      expect(result).toEqual({ permissions: [], role: "", userId: "" });
    });

    it("filters out non-string permissions", async () => {
      const request = stubFetch({
        permissions: ["case.view", 42, null, "case.edit"],
        role: "owner",
        userId: "u2",
      });
      const repo = createPermissionsRepository({
        request,
        getToken: () => null,
      });

      const result = await repo.fetchMyPermissions();

      expect(result.permissions).toEqual(["case.view", "case.edit"]);
    });

    it("omits Authorization header when token is null", async () => {
      const request = stubFetch({ permissions: [], role: "", userId: "" });
      const repo = createPermissionsRepository({
        request,
        getToken: () => null,
      });

      await repo.fetchMyPermissions();

      expect(request).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: { Accept: "application/json" },
        }),
      );
    });
  });
});
