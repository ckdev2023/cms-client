import { describe, it, expect } from "vitest";
import { isValidEmail, isValidPhone } from "./contactValidators";

describe("isValidEmail", () => {
  it("accepts standard email", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
  });

  it("accepts email with subdomain", () => {
    expect(isValidEmail("admin@mail.example.co.jp")).toBe(true);
  });

  it("accepts email with plus addressing", () => {
    expect(isValidEmail("user+tag@example.com")).toBe(true);
  });

  it("trims whitespace before validating", () => {
    expect(isValidEmail("  user@example.com  ")).toBe(true);
  });

  it("rejects missing @", () => {
    expect(isValidEmail("userexample.com")).toBe(false);
  });

  it("rejects missing domain", () => {
    expect(isValidEmail("user@")).toBe(false);
  });

  it("rejects missing local part", () => {
    expect(isValidEmail("@example.com")).toBe(false);
  });

  it("rejects spaces in address", () => {
    expect(isValidEmail("user @example.com")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidEmail("")).toBe(false);
  });

  it("rejects domain without dot", () => {
    expect(isValidEmail("user@localhost")).toBe(false);
  });
});

describe("isValidPhone", () => {
  it("accepts Japanese mobile with dashes", () => {
    expect(isValidPhone("090-1234-5678")).toBe(true);
  });

  it("accepts Japanese mobile without dashes", () => {
    expect(isValidPhone("09012345678")).toBe(true);
  });

  it("accepts landline with dashes", () => {
    expect(isValidPhone("03-1234-5678")).toBe(true);
  });

  it("accepts +81 prefix", () => {
    expect(isValidPhone("+81-90-1234-5678")).toBe(true);
  });

  it("accepts +81 without dash", () => {
    expect(isValidPhone("+819012345678")).toBe(true);
  });

  it("accepts number with spaces", () => {
    expect(isValidPhone("090 1234 5678")).toBe(true);
  });

  it("trims whitespace before validating", () => {
    expect(isValidPhone("  090-1234-5678  ")).toBe(true);
  });

  it("rejects too short number", () => {
    expect(isValidPhone("090-12")).toBe(false);
  });

  it("rejects alphabetic characters", () => {
    expect(isValidPhone("090-ABCD-5678")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidPhone("")).toBe(false);
  });

  it("rejects number starting with dash", () => {
    expect(isValidPhone("-90-1234-5678")).toBe(false);
  });

  it("rejects number ending with dash", () => {
    expect(isValidPhone("090-1234-5678-")).toBe(false);
  });
});
