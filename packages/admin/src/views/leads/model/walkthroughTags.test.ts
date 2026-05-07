import { describe, expect, it } from "vitest";
import { sanitizeWalkthroughTags } from "./walkthroughTags";

describe("sanitizeWalkthroughTags (admin)", () => {
  it("strips R<digit>- and R<digit>_ patterns case-insensitively", () => {
    expect(
      sanitizeWalkthroughTags(["R5-walk", "R5_walk", "r12-foo", "VIP"]),
    ).toEqual(["VIP"]);
  });
  it("strips test- / test_ / mcp- / mcp_ / tmp- / tmp_ patterns", () => {
    expect(
      sanitizeWalkthroughTags([
        "test-foo",
        "TEST_bar",
        "mcp-baz",
        "MCP_qux",
        "tmp-zee",
        "TMP_zee",
      ]),
    ).toEqual([]);
  });
  it("keeps real business tags resembling the patterns (Rapid / RC1- / R-no-digit)", () => {
    expect(
      sanitizeWalkthroughTags([
        "Rapid-development",
        "RC1-keep",
        "R-no-digit",
        "RR1-foo",
        "紹介",
      ]),
    ).toEqual([
      "Rapid-development",
      "RC1-keep",
      "R-no-digit",
      "RR1-foo",
      "紹介",
    ]);
  });
  it("preserves order and does not deduplicate", () => {
    expect(
      sanitizeWalkthroughTags(["VIP", "VIP", "R5-walk", "面談済"]),
    ).toEqual(["VIP", "VIP", "面談済"]);
  });
  it("returns empty array for an all-walkthrough input", () => {
    expect(sanitizeWalkthroughTags(["R5-walk", "test-x", "tmp-y"])).toEqual([]);
  });
});
