import { describe, expect, it } from "vitest";
import {
  getOwnerOptions,
  resolveOwnerLabel,
  resolveOwnerOption,
  resolveOwnerValue,
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
