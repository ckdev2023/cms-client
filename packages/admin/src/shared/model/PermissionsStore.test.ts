import { describe, it, expect, vi } from "vitest";
import { createPermissionsStore } from "./PermissionsStore";
import type { PermissionsRepository } from "./PermissionsRepository";

function stubRepo(
  permissions: string[] = [],
  role = "staff",
): PermissionsRepository {
  return {
    fetchMyPermissions: vi.fn().mockResolvedValue({
      permissions,
      role,
      userId: "u1",
    }),
  };
}

describe("PermissionsStore", () => {
  describe("initial state", () => {
    it("starts unloaded with no permissions", () => {
      const store = createPermissionsStore({ repository: stubRepo() });

      expect(store.loaded.value).toBe(false);
      expect(store.loading.value).toBe(false);
      expect(store.permissions.value.size).toBe(0);
      expect(store.role.value).toBe("");
    });
  });

  describe("load()", () => {
    it("loads permissions from repository", async () => {
      const repo = stubRepo(["case.view", "case.edit"], "manager");
      const store = createPermissionsStore({ repository: repo });

      await store.load();

      expect(store.loaded.value).toBe(true);
      expect(store.has("case.view")).toBe(true);
      expect(store.has("case.edit")).toBe(true);
      expect(store.has("case.export")).toBe(false);
      expect(store.role.value).toBe("manager");
    });

    it("does not call repository concurrently", async () => {
      const repo = stubRepo(["case.view"]);
      const store = createPermissionsStore({ repository: repo });

      const p1 = store.load();
      const p2 = store.load();
      await Promise.all([p1, p2]);

      expect(repo.fetchMyPermissions).toHaveBeenCalledTimes(1);
    });

    it("sets loading=false even on error", async () => {
      const repo: PermissionsRepository = {
        fetchMyPermissions: vi
          .fn()
          .mockRejectedValue(new Error("network fail")),
      };
      const store = createPermissionsStore({ repository: repo });

      await expect(store.load()).rejects.toThrow("network fail");
      expect(store.loading.value).toBe(false);
    });
  });

  describe("has / hasAny / hasAll", () => {
    it("has() checks single permission", () => {
      const store = createPermissionsStore({ repository: stubRepo() });
      store._setForTest(["case.view", "case.edit"]);

      expect(store.has("case.view")).toBe(true);
      expect(store.has("case.export")).toBe(false);
    });

    it("hasAny() returns true if any code matches", () => {
      const store = createPermissionsStore({ repository: stubRepo() });
      store._setForTest(["case.view"]);

      expect(store.hasAny("case.view", "case.edit")).toBe(true);
      expect(store.hasAny("case.export", "case.audit")).toBe(false);
    });

    it("hasAll() returns true only if all codes match", () => {
      const store = createPermissionsStore({ repository: stubRepo() });
      store._setForTest(["case.view", "case.edit", "case.export"]);

      expect(store.hasAll("case.view", "case.edit")).toBe(true);
      expect(store.hasAll("case.view", "case.audit")).toBe(false);
    });
  });

  describe("reset()", () => {
    it("clears all state", async () => {
      const store = createPermissionsStore({
        repository: stubRepo(["case.view"]),
      });
      await store.load();
      expect(store.loaded.value).toBe(true);

      store.reset();

      expect(store.loaded.value).toBe(false);
      expect(store.permissions.value.size).toBe(0);
      expect(store.role.value).toBe("");
    });
  });

  describe("_setForTest()", () => {
    it("directly sets permissions and role", () => {
      const store = createPermissionsStore({ repository: stubRepo() });
      store._setForTest(["user.manage", "role.assign"], "owner");

      expect(store.has("user.manage")).toBe(true);
      expect(store.has("role.assign")).toBe(true);
      expect(store.role.value).toBe("owner");
      expect(store.loaded.value).toBe(true);
    });
  });
});
