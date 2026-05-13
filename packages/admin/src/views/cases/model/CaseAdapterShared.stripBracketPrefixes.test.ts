import { describe, expect, it } from "vitest";
import { stripBracketPrefixesForInitials } from "./CaseAdapterShared";

describe("stripBracketPrefixesForInitials", () => {
  it("strips a single leading [tag] prefix", () => {
    expect(stripBracketPrefixesForInitials("[E2E]大阪")).toBe("大阪");
  });

  it("strips multiple stacked [tag] prefixes", () => {
    expect(stripBracketPrefixesForInitials("[E2E][foo]名称")).toBe("名称");
  });

  it("returns trimmed original when nothing remains after strip", () => {
    expect(stripBracketPrefixesForInitials("[x]")).toBe("[x]");
  });

  it("leaves names without brackets unchanged", () => {
    expect(stripBracketPrefixesForInitials("山田太郎")).toBe("山田太郎");
  });
});
