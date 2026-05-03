import { afterEach, describe, it, expect } from "vitest";
import {
  clearUserAliases,
  getActiveUserOptions,
  registerUserAliases,
  resolveUserLabel,
} from "./useOrgUserOptions";

const UUID_A = "ef21fdd2-1ffc-4a27-8b47-a640d6bd021c";
const UUID_B = "11111111-2222-3333-4444-555555555555";

afterEach(() => {
  clearUserAliases();
});

describe("resolveUserLabel", () => {
  it("returns displayName for registered UUID", () => {
    registerUserAliases([{ id: UUID_A, displayName: "Local Admin" }]);
    expect(resolveUserLabel(UUID_A)).toBe("Local Admin");
  });

  it('returns "—" for unregistered UUID', () => {
    expect(resolveUserLabel(UUID_A)).toBe("—");
  });

  it('returns "—" for empty string', () => {
    expect(resolveUserLabel("")).toBe("—");
  });

  it("returns non-UUID input as-is", () => {
    expect(resolveUserLabel("some-name")).toBe("some-name");
  });

  it("never exposes raw UUID", () => {
    expect(resolveUserLabel(UUID_A)).not.toBe(UUID_A);
    registerUserAliases([{ id: UUID_A, displayName: "Admin" }]);
    expect(resolveUserLabel(UUID_A)).not.toBe(UUID_A);
  });
});

describe("registerUserAliases", () => {
  it("registers multiple users", () => {
    registerUserAliases([
      { id: UUID_A, displayName: "Admin" },
      { id: UUID_B, displayName: "Staff" },
    ]);
    expect(resolveUserLabel(UUID_A)).toBe("Admin");
    expect(resolveUserLabel(UUID_B)).toBe("Staff");
  });

  it("overwrites previous alias for same id", () => {
    registerUserAliases([{ id: UUID_A, displayName: "Admin" }]);
    registerUserAliases([{ id: UUID_A, displayName: "Super Admin" }]);
    expect(resolveUserLabel(UUID_A)).toBe("Super Admin");
  });

  it("ignores entries with empty id or displayName", () => {
    registerUserAliases([
      { id: "", displayName: "Nobody" },
      { id: UUID_A, displayName: "" },
    ]);
    expect(resolveUserLabel(UUID_A)).toBe("—");
  });
});

describe("clearUserAliases", () => {
  it("resets all registered aliases", () => {
    registerUserAliases([{ id: UUID_A, displayName: "Admin" }]);
    expect(resolveUserLabel(UUID_A)).toBe("Admin");
    clearUserAliases();
    expect(resolveUserLabel(UUID_A)).toBe("—");
  });

  it("is idempotent on empty map", () => {
    clearUserAliases();
    expect(resolveUserLabel(UUID_A)).toBe("—");
  });
});

describe("getActiveUserOptions", () => {
  it("returns empty array when no users registered", () => {
    expect(getActiveUserOptions()).toEqual([]);
  });

  it("returns registered users as value/label pairs", () => {
    registerUserAliases([
      { id: UUID_A, displayName: "Admin" },
      { id: UUID_B, displayName: "Staff" },
    ]);
    const options = getActiveUserOptions();
    expect(options).toHaveLength(2);
    expect(options).toContainEqual({ value: UUID_A, label: "Admin" });
    expect(options).toContainEqual({ value: UUID_B, label: "Staff" });
  });

  it("reflects cleared aliases", () => {
    registerUserAliases([{ id: UUID_A, displayName: "Admin" }]);
    clearUserAliases();
    expect(getActiveUserOptions()).toEqual([]);
  });
});
