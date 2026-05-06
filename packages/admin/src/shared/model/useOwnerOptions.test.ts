import { afterEach, describe, expect, it } from "vitest";
import {
  getOwnerOptions,
  resolveOwnerDisplayLabel,
  resolveOwnerDisplayOption,
  resolveOwnerLabel,
  resolveOwnerOption,
  resolveOwnerValue,
  toApiOwnerOption,
  withCurrentUserOwnerOption,
} from "./useOwnerOptions";
import { clearUserAliases, registerUserAliases } from "./useOrgUserOptions";

describe("getOwnerOptions", () => {
  it("returns localized owner labels for zh-CN", () => {
    expect(getOwnerOptions("zh-CN").slice(0, 3)).toEqual([
      {
        value: "suzuki",
        label: "铃木",
        initials: "S",
        avatarClass: "bg-sky-100 text-sky-700",
      },
      {
        value: "tanaka",
        label: "田中",
        initials: "T",
        avatarClass: "bg-emerald-100 text-emerald-700",
      },
      {
        value: "li",
        label: "李",
        initials: "L",
        avatarClass: "bg-violet-100 text-violet-700",
      },
    ]);
  });
});

describe("resolveOwnerOption", () => {
  it("resolves stable ids to locale-aware labels", () => {
    expect(resolveOwnerOption("suzuki", "ja-JP")?.label).toBe("鈴木");
    expect(resolveOwnerOption("suzuki", "en-US")?.label).toBe("Suzuki");
  });
});

describe("resolveOwnerLabel", () => {
  it("normalizes known labels across locales", () => {
    expect(resolveOwnerLabel("高橋健太", "zh-CN")).toBe("高桥健太");
    expect(resolveOwnerLabel("Shota Yamada", "ja-JP")).toBe("山田翔太");
  });
});

describe("resolveOwnerValue", () => {
  it("normalizes localized labels back to stable ids", () => {
    expect(resolveOwnerValue("鈴木")).toBe("suzuki");
    expect(resolveOwnerValue("Suzuki")).toBe("suzuki");
    expect(resolveOwnerValue("高桥健太")).toBe("takahashi-k");
  });

  it("returns null for unknown values", () => {
    expect(resolveOwnerValue("unknown-owner")).toBeNull();
  });
});

describe("withCurrentUserOwnerOption (BUG-150)", () => {
  it("prepends the logged-in user when not represented in the catalog", () => {
    const base = getOwnerOptions("zh-CN");
    const merged = withCurrentUserOwnerOption(base, {
      name: "Local Admin",
      email: "admin@local.test",
      initials: "LA",
    });

    expect(merged).toHaveLength(base.length + 1);
    expect(merged[0]).toEqual({
      value: "admin@local.test",
      label: "Local Admin",
      initials: "LA",
      avatarClass: "bg-slate-100 text-slate-700",
    });
    expect(merged.slice(1)).toEqual(base);
  });

  it("returns the original list when current user is null/undefined", () => {
    const base = getOwnerOptions("en-US");
    expect(withCurrentUserOwnerOption(base, null)).toEqual(base);
    expect(withCurrentUserOwnerOption(base, undefined)).toEqual(base);
  });

  it("returns the original list when current user name is empty", () => {
    const base = getOwnerOptions("en-US");
    expect(withCurrentUserOwnerOption(base, { name: "" })).toEqual(base);
    expect(withCurrentUserOwnerOption(base, { name: "   " })).toEqual(base);
  });

  it("does not duplicate when the logged-in user matches a catalog entry by label", () => {
    const base = getOwnerOptions("ja-JP");
    const merged = withCurrentUserOwnerOption(base, {
      name: "鈴木",
      email: "suzuki@example.com",
    });
    expect(merged).toEqual(base);
  });

  it("does not duplicate when the logged-in user matches a catalog entry by stable id", () => {
    const base = getOwnerOptions("zh-CN");
    const merged = withCurrentUserOwnerOption(base, {
      name: "suzuki",
      email: "suzuki@example.com",
    });
    expect(merged).toEqual(base);
  });

  it("falls back to a synthesized value when the user has no email", () => {
    const base = getOwnerOptions("zh-CN");
    const merged = withCurrentUserOwnerOption(base, { name: "Local Admin" });

    expect(merged).toHaveLength(base.length + 1);
    expect(merged[0]?.value).toBe("current-user:Local Admin");
    expect(merged[0]?.label).toBe("Local Admin");
    expect(merged[0]?.initials).toBe("LA");
  });

  it("derives initials from the name when not provided", () => {
    const base = getOwnerOptions("en-US");
    const merged = withCurrentUserOwnerOption(base, {
      name: "Akari Suzuki Jr",
      email: "akari@example.com",
    });
    expect(merged[0]?.initials).toBe("AS");
  });

  it("uppercases short single-word names for initials when not provided", () => {
    const base = getOwnerOptions("en-US");
    const merged = withCurrentUserOwnerOption(base, {
      name: "okada",
    });
    expect(merged[0]?.value).toBe("current-user:okada");
    expect(merged[0]?.initials).toBe("OK");
  });
});

describe("toApiOwnerOption (R2-A-1)", () => {
  const UUID_A = "00000000-0000-4000-8000-000000000011";
  const UUID_B = "ef21fdd2-1ffc-4a27-8b47-a640d6bd021c";

  it("uses API UUID as value (not catalog short code)", () => {
    const opt = toApiOwnerOption({ id: UUID_A, displayName: "Local Admin" });
    expect(opt.value).toBe(UUID_A);
    expect(opt.value).not.toBe("suzuki");
    expect(opt.value).not.toBe("admin");
  });

  it("uses displayName as label", () => {
    expect(
      toApiOwnerOption({ id: UUID_A, displayName: "Local Admin" }).label,
    ).toBe("Local Admin");
  });

  it("derives initials from multi-word displayName", () => {
    expect(
      toApiOwnerOption({ id: UUID_A, displayName: "Local Admin" }).initials,
    ).toBe("LA");
    expect(
      toApiOwnerOption({ id: UUID_B, displayName: "Akari Suzuki Jr" }).initials,
    ).toBe("AS");
  });

  it("uppercases short single-word name for initials", () => {
    expect(
      toApiOwnerOption({ id: UUID_A, displayName: "okada" }).initials,
    ).toBe("OK");
  });

  it("falls back to id when displayName is empty", () => {
    expect(toApiOwnerOption({ id: UUID_A, displayName: "" }).label).toBe(
      UUID_A,
    );
  });

  it("avatarClass is deterministic per id", () => {
    const a1 = toApiOwnerOption({ id: UUID_A, displayName: "Admin" });
    const a2 = toApiOwnerOption({ id: UUID_A, displayName: "Different Name" });
    expect(a1.avatarClass).toBe(a2.avatarClass);
  });

  it("returns a non-empty avatarClass even for unknown id", () => {
    const opt = toApiOwnerOption({ id: UUID_B, displayName: "Staff" });
    expect(typeof opt.avatarClass).toBe("string");
    expect(opt.avatarClass.length).toBeGreaterThan(0);
  });
});

describe("resolveOwnerDisplayLabel (H-9)", () => {
  const UUID_LOCAL_ADMIN = "00000000-0000-4000-8000-000000000011";
  const UUID_UNKNOWN = "ef21fdd2-1ffc-4a27-8b47-a640d6bd021c";
  const NIL_UUID = "00000000-0000-0000-0000-000000000000";
  const FALLBACKS = { unassigned: "未分配", unknown: "未知用户" };

  afterEach(() => {
    clearUserAliases();
  });

  it("returns unassigned for empty / null / undefined input", () => {
    expect(resolveOwnerDisplayLabel("", FALLBACKS)).toBe("未分配");
    expect(resolveOwnerDisplayLabel(null, FALLBACKS)).toBe("未分配");
    expect(resolveOwnerDisplayLabel(undefined, FALLBACKS)).toBe("未分配");
    expect(resolveOwnerDisplayLabel("   ", FALLBACKS)).toBe("未分配");
  });

  it("returns unassigned for the nil UUID sentinel", () => {
    expect(resolveOwnerDisplayLabel(NIL_UUID, FALLBACKS)).toBe("未分配");
    expect(resolveOwnerDisplayLabel(NIL_UUID.toUpperCase(), FALLBACKS)).toBe(
      "未分配",
    );
  });

  it("resolves catalog short codes / labels with locale", () => {
    expect(resolveOwnerDisplayLabel("suzuki", FALLBACKS, "ja-JP")).toBe("鈴木");
    expect(resolveOwnerDisplayLabel("suzuki", FALLBACKS, "en-US")).toBe(
      "Suzuki",
    );
    expect(resolveOwnerDisplayLabel("田中", FALLBACKS, "zh-CN")).toBe("田中");
  });

  it("falls back to /api/users alias when catalog misses", () => {
    registerUserAliases([{ id: UUID_LOCAL_ADMIN, displayName: "Local Admin" }]);
    expect(resolveOwnerDisplayLabel(UUID_LOCAL_ADMIN, FALLBACKS, "zh-CN")).toBe(
      "Local Admin",
    );
  });

  it("returns unknown placeholder for UUID with no alias and no catalog match", () => {
    expect(resolveOwnerDisplayLabel(UUID_UNKNOWN, FALLBACKS, "zh-CN")).toBe(
      "未知用户",
    );
  });

  it("never leaks raw UUID to the UI when alias map is empty (H-9 regression)", () => {
    const result = resolveOwnerDisplayLabel(
      UUID_LOCAL_ADMIN,
      FALLBACKS,
      "zh-CN",
    );
    expect(result).not.toContain("00000000");
    expect(result).not.toMatch(/[0-9a-f]{8}-/);
  });

  it("returns plain string as-is when not catalog-known and not UUID-shaped", () => {
    expect(resolveOwnerDisplayLabel("Mystery Person", FALLBACKS)).toBe(
      "Mystery Person",
    );
  });
});

describe("resolveOwnerDisplayOption (H-9)", () => {
  const UUID_LOCAL_ADMIN = "00000000-0000-4000-8000-000000000011";
  const UUID_UNKNOWN = "ef21fdd2-1ffc-4a27-8b47-a640d6bd021c";
  const NIL_UUID = "00000000-0000-0000-0000-000000000000";
  const FALLBACKS = { unassigned: "未分配", unknown: "未知用户" };

  afterEach(() => {
    clearUserAliases();
  });

  it("returns unassigned with neutral avatar for empty input", () => {
    const opt = resolveOwnerDisplayOption("", "zh-CN", FALLBACKS);
    expect(opt.label).toBe("未分配");
    expect(opt.initials).toBe("—");
    expect(opt.avatarClass).toContain("bg-slate");
  });

  it("returns unassigned for the nil UUID", () => {
    const opt = resolveOwnerDisplayOption(NIL_UUID, "zh-CN", FALLBACKS);
    expect(opt.label).toBe("未分配");
    expect(opt.initials).toBe("—");
  });

  it("resolves catalog short code to localized option (no longer shows ?)", () => {
    const opt = resolveOwnerDisplayOption("suzuki", "ja-JP", FALLBACKS);
    expect(opt.label).toBe("鈴木");
    expect(opt.initials).toBe("S");
    expect(opt.avatarClass).toContain("bg-sky");
  });

  it("resolves real UUID via /api/users alias to displayName + derived initials", () => {
    registerUserAliases([{ id: UUID_LOCAL_ADMIN, displayName: "Local Admin" }]);
    const opt = resolveOwnerDisplayOption(UUID_LOCAL_ADMIN, "zh-CN", FALLBACKS);
    expect(opt.label).toBe("Local Admin");
    expect(opt.initials).toBe("LA");
    expect(opt.value).toBe(UUID_LOCAL_ADMIN);
  });

  it("returns unknown placeholder (not '?') for UUID with no resolution", () => {
    const opt = resolveOwnerDisplayOption(UUID_UNKNOWN, "zh-CN", FALLBACKS);
    expect(opt.label).toBe("未知用户");
    expect(opt.initials).toBe("—");
    expect(opt.label).not.toContain(UUID_UNKNOWN);
  });

  it("does not leak raw UUID into label / initials (H-9 regression)", () => {
    const opt = resolveOwnerDisplayOption(UUID_LOCAL_ADMIN, "zh-CN", FALLBACKS);
    expect(opt.label).not.toMatch(/[0-9a-f]{8}-/);
    expect(opt.initials).not.toBe("?");
  });

  it("reactively switches from unknown to alias label after registerUserAliases", () => {
    const before = resolveOwnerDisplayOption(
      UUID_LOCAL_ADMIN,
      "zh-CN",
      FALLBACKS,
    );
    expect(before.label).toBe("未知用户");

    registerUserAliases([{ id: UUID_LOCAL_ADMIN, displayName: "Local Admin" }]);

    const after = resolveOwnerDisplayOption(
      UUID_LOCAL_ADMIN,
      "zh-CN",
      FALLBACKS,
    );
    expect(after.label).toBe("Local Admin");
  });
});
