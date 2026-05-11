import { describe, expect, it } from "vitest";
import { utcTodayIsoDateString } from "./dateTodayIsoUtc";

describe("utcTodayIsoDateString", () => {
  it("matches YYYY-MM-DD pattern", () => {
    expect(utcTodayIsoDateString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
