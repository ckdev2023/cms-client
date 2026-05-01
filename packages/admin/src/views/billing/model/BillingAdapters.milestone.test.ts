import { describe, expect, it, vi } from "vitest";

import { resolveMilestoneLabel } from "./BillingAdapters";

describe("resolveMilestoneLabel", () => {
  function makeTFn(locale: "zh" | "en" | "ja") {
    const catalog: Record<string, Record<string, string>> = {
      zh: {
        "billing.milestone.down_payment": "着手金",
        "billing.milestone.final_payment": "尾款",
        "billing.milestone.balance": "残金",
        "billing.milestone.interim_payment": "中间金",
        "billing.milestone.installment": "分期付款",
      },
      en: {
        "billing.milestone.down_payment": "Down payment",
        "billing.milestone.final_payment": "Final payment",
        "billing.milestone.balance": "Balance",
        "billing.milestone.interim_payment": "Interim payment",
        "billing.milestone.installment": "Installment",
      },
      ja: {
        "billing.milestone.down_payment": "着手金",
        "billing.milestone.final_payment": "残金",
        "billing.milestone.balance": "残額",
        "billing.milestone.interim_payment": "中間金",
        "billing.milestone.installment": "分割払い",
      },
    };
    return (key: string) => catalog[locale][key] ?? key;
  }

  it("maps '尾款' → 'Final payment' (en-US)", () => {
    expect(resolveMilestoneLabel("尾款", makeTFn("en"))).toBe("Final payment");
  });

  it("maps '尾款' → '残金' (ja-JP)", () => {
    expect(resolveMilestoneLabel("尾款", makeTFn("ja"))).toBe("残金");
  });

  it("maps '尾款' → '尾款' (zh-CN)", () => {
    expect(resolveMilestoneLabel("尾款", makeTFn("zh"))).toBe("尾款");
  });

  it("maps '着手金' → 'Down payment' (en-US)", () => {
    expect(resolveMilestoneLabel("着手金", makeTFn("en"))).toBe("Down payment");
  });

  it("maps '残金' → 'Balance' (en-US)", () => {
    expect(resolveMilestoneLabel("残金", makeTFn("en"))).toBe("Balance");
  });

  it("maps '中間金' (traditional) → 'Interim payment' (en-US)", () => {
    expect(resolveMilestoneLabel("中間金", makeTFn("en"))).toBe(
      "Interim payment",
    );
  });

  it("maps '中间金' (simplified) → 'Interim payment' (en-US)", () => {
    expect(resolveMilestoneLabel("中间金", makeTFn("en"))).toBe(
      "Interim payment",
    );
  });

  it("maps '分割払い' → 'Installment' (en-US)", () => {
    expect(resolveMilestoneLabel("分割払い", makeTFn("en"))).toBe(
      "Installment",
    );
  });

  it("maps '分期付款' → 'Installment' (en-US)", () => {
    expect(resolveMilestoneLabel("分期付款", makeTFn("en"))).toBe(
      "Installment",
    );
  });

  it("returns raw value and warns for unknown name", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = resolveMilestoneLabel("カスタム名称", makeTFn("en"));
    expect(result).toBe("カスタム名称");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("カスタム名称"),
    );
    warnSpy.mockRestore();
  });

  it("returns '—' as-is without warning", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(resolveMilestoneLabel("—", makeTFn("en"))).toBe("—");
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("returns empty string as-is without warning", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(resolveMilestoneLabel("", makeTFn("en"))).toBe("");
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
