import { describe, expect, it } from "vitest";
import {
  extractErrorStatus,
  deriveNotFoundReason,
} from "./useCaseDetailErrorStatus";

describe("extractErrorStatus", () => {
  it("extracts status from RepositoryError-like objects", () => {
    expect(extractErrorStatus({ status: 400, message: "bad" })).toBe(400);
    expect(extractErrorStatus({ status: 500 })).toBe(500);
  });

  it("returns null for plain Error without status", () => {
    expect(extractErrorStatus(new Error("fail"))).toBeNull();
  });

  it("returns null for non-objects", () => {
    expect(extractErrorStatus("raw string")).toBeNull();
    expect(extractErrorStatus(null)).toBeNull();
    expect(extractErrorStatus(undefined)).toBeNull();
    expect(extractErrorStatus(42)).toBeNull();
  });

  it("returns null when status is undefined", () => {
    expect(extractErrorStatus({ status: undefined })).toBeNull();
  });
});

describe("deriveNotFoundReason", () => {
  it("returns null while loading", () => {
    expect(deriveNotFoundReason(true, false, 404)).toBeNull();
  });

  it("returns null when detail exists", () => {
    expect(deriveNotFoundReason(false, true, null)).toBeNull();
  });

  it("400 → badRequest", () => {
    expect(deriveNotFoundReason(false, false, 400)).toBe("badRequest");
  });

  it("422 → badRequest", () => {
    expect(deriveNotFoundReason(false, false, 422)).toBe("badRequest");
  });

  it("403 → forbidden", () => {
    expect(deriveNotFoundReason(false, false, 403)).toBe("forbidden");
  });

  it("500 → serverError", () => {
    expect(deriveNotFoundReason(false, false, 500)).toBe("serverError");
  });

  it("502 → serverError", () => {
    expect(deriveNotFoundReason(false, false, 502)).toBe("serverError");
  });

  it("null status → notFound", () => {
    expect(deriveNotFoundReason(false, false, null)).toBe("notFound");
  });

  it("404 status → notFound (not a special case)", () => {
    expect(deriveNotFoundReason(false, false, 404)).toBe("notFound");
  });
});
