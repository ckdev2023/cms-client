import { describe, expect, it } from "vitest";
import { mapSettingsError } from "./settingsErrorMessages";

describe("mapSettingsError", () => {
  it.each([
    ["USER_DUPLICATE_EMAIL", "settings.errors.userDuplicateEmail"],
    ["ROLE_DUPLICATE_CODE", "settings.errors.roleDuplicateCode"],
    [
      "INSUFFICIENT_ROLE_AUTHORITY",
      "settings.errors.insufficientRoleAuthority",
    ],
    ["USER_LAST_OWNER", "settings.errors.userLastOwner"],
    ["ROLE_IS_SYSTEM", "settings.errors.roleIsSystem"],
    ["ROLE_HAS_MEMBERS", "settings.errors.roleHasMembers"],
  ])("maps %s → %s", (code, expected) => {
    expect(mapSettingsError(code)).toBe(expected);
  });

  it("returns fallback key for unknown message", () => {
    expect(mapSettingsError("Something unexpected")).toBe(
      "settings.errors.unknown",
    );
  });

  it("returns fallback key for empty string", () => {
    expect(mapSettingsError("")).toBe("settings.errors.unknown");
  });
});
