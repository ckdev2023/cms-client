import { describe, it, expect } from "vitest";
import { formatJpyAmount } from "./formatCurrency";

describe("formatJpyAmount", () => {
  it("returns empty string for null/undefined/empty", () => {
    expect(formatJpyAmount(null)).toBe("");
    expect(formatJpyAmount(undefined)).toBe("");
    expect(formatJpyAmount("")).toBe("");
    expect(formatJpyAmount("   ")).toBe("");
  });

  it("returns empty string for non-numeric strings", () => {
    expect(formatJpyAmount("abc")).toBe("");
    expect(formatJpyAmount("¥¥¥")).toBe("");
  });

  it("returns empty string for non-finite numbers", () => {
    expect(formatJpyAmount(Number.NaN)).toBe("");
    expect(formatJpyAmount(Number.POSITIVE_INFINITY)).toBe("");
    expect(formatJpyAmount(Number.NEGATIVE_INFINITY)).toBe("");
  });

  it("formats raw integer string with ¥ prefix and ja-JP thousands separator", () => {
    expect(formatJpyAmount("180000")).toBe("¥180,000");
    expect(formatJpyAmount("1234567")).toBe("¥1,234,567");
  });

  it("strips existing thousands separators from input string", () => {
    expect(formatJpyAmount("180,000")).toBe("¥180,000");
    expect(formatJpyAmount("1,234,567")).toBe("¥1,234,567");
  });

  it("formats numeric input with ¥ prefix and thousands separator", () => {
    expect(formatJpyAmount(180000)).toBe("¥180,000");
    expect(formatJpyAmount(0)).toBe("¥0");
    expect(formatJpyAmount(-50000)).toBe("¥-50,000");
  });

  it("preserves decimals when present", () => {
    expect(formatJpyAmount("1234.5")).toBe("¥1,234.5");
    expect(formatJpyAmount(1234.56)).toBe("¥1,234.56");
  });
});
