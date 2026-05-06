import { describe, it, expect } from "vitest";
import { usePermission } from "./usePermission";
import { createPermissionsStore } from "../model/PermissionsStore";
import type { PermissionsRepository } from "../model/PermissionsRepository";

function createTestStore(permissions: string[] = []) {
  const repo: PermissionsRepository = {
    fetchMyPermissions: async () => ({
      permissions,
      role: "staff",
      userId: "u1",
    }),
  };
  const store = createPermissionsStore({ repository: repo });
  store._setForTest(permissions);
  return store;
}

describe("usePermission", () => {
  it("delegates has() to the store", () => {
    const store = createTestStore(["case.view", "case.edit"]);
    const { has } = usePermission({ store });

    expect(has("case.view")).toBe(true);
    expect(has("case.export")).toBe(false);
  });

  it("delegates hasAny() to the store", () => {
    const store = createTestStore(["case.view"]);
    const { hasAny } = usePermission({ store });

    expect(hasAny("case.view", "case.edit")).toBe(true);
    expect(hasAny("case.export", "case.audit")).toBe(false);
  });

  it("delegates hasAll() to the store", () => {
    const store = createTestStore(["case.view", "case.edit"]);
    const { hasAll } = usePermission({ store });

    expect(hasAll("case.view", "case.edit")).toBe(true);
    expect(hasAll("case.view", "case.export")).toBe(false);
  });

  it("can() returns a reactive computed", () => {
    const store = createTestStore(["case.view"]);
    const { can } = usePermission({ store });

    const canView = can("case.view");
    const canExport = can("case.export");

    expect(canView.value).toBe(true);
    expect(canExport.value).toBe(false);
  });

  it("loaded reflects the store state", () => {
    const store = createTestStore(["case.view"]);
    const { loaded } = usePermission({ store });

    expect(loaded.value).toBe(true);
  });
});
