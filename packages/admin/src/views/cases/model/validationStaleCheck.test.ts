import { describe, expect, it } from "vitest";
import { isValidationStale } from "./validationStaleCheck";
import type { ValidationData } from "../types-detail";

function makeValidation(
  overrides: Partial<ValidationData> = {},
): ValidationData {
  return {
    lastTime: "",
    lastTimeIso: "",
    blocking: [],
    warnings: [],
    info: [],
    passed: [],
    ...overrides,
  };
}

describe("isValidationStale", () => {
  it("returns false when dataMaxUpdatedAt is undefined", () => {
    expect(
      isValidationStale(
        makeValidation({ lastTimeIso: "2026-05-01T10:00:00.000Z" }),
      ),
    ).toBe(false);
  });

  it("returns false when lastTimeIso is empty", () => {
    expect(
      isValidationStale(
        makeValidation({ dataMaxUpdatedAt: "2026-05-01T10:00:00.000Z" }),
      ),
    ).toBe(false);
  });

  it("returns false when both are empty", () => {
    expect(isValidationStale(makeValidation())).toBe(false);
  });

  it("returns true when data is updated significantly after the last run", () => {
    expect(
      isValidationStale(
        makeValidation({
          lastTimeIso: "2026-05-01T10:00:00.000Z",
          dataMaxUpdatedAt: "2026-05-01T10:01:00.000Z",
        }),
      ),
    ).toBe(true);
  });

  it("returns false when data update is within threshold", () => {
    expect(
      isValidationStale(
        makeValidation({
          lastTimeIso: "2026-05-01T10:00:00.000Z",
          dataMaxUpdatedAt: "2026-05-01T10:00:03.000Z",
        }),
      ),
    ).toBe(false);
  });

  it("returns false when run is newer than data", () => {
    expect(
      isValidationStale(
        makeValidation({
          lastTimeIso: "2026-05-01T10:05:00.000Z",
          dataMaxUpdatedAt: "2026-05-01T10:00:00.000Z",
        }),
      ),
    ).toBe(false);
  });

  it("returns false when either timestamp is invalid", () => {
    expect(
      isValidationStale(
        makeValidation({
          lastTimeIso: "invalid",
          dataMaxUpdatedAt: "2026-05-01T10:00:00.000Z",
        }),
      ),
    ).toBe(false);

    expect(
      isValidationStale(
        makeValidation({
          lastTimeIso: "2026-05-01T10:00:00.000Z",
          dataMaxUpdatedAt: "invalid",
        }),
      ),
    ).toBe(false);
  });

  it("returns true exactly at threshold boundary + 1ms", () => {
    expect(
      isValidationStale(
        makeValidation({
          lastTimeIso: "2026-05-01T10:00:00.000Z",
          dataMaxUpdatedAt: "2026-05-01T10:00:05.001Z",
        }),
      ),
    ).toBe(true);
  });

  it("returns false exactly at threshold boundary", () => {
    expect(
      isValidationStale(
        makeValidation({
          lastTimeIso: "2026-05-01T10:00:00.000Z",
          dataMaxUpdatedAt: "2026-05-01T10:00:05.000Z",
        }),
      ),
    ).toBe(false);
  });
});
