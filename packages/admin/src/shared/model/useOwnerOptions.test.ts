import { describe, expect, it } from "vitest";
import {
  getOwnerOptions,
  resolveOwnerLabel,
  resolveOwnerOption,
  resolveOwnerValue,
  withCurrentUserOwnerOption,
} from "./useOwnerOptions";

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
