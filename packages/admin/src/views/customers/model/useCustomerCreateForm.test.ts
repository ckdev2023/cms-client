import { describe, it, expect } from "vitest";
import { useCustomerCreateForm } from "./useCustomerCreateForm";
import type { CustomerSummary } from "../types";

function customer(
  partial: Partial<CustomerSummary> & { id: string },
): CustomerSummary {
  return {
    displayName: "",
    legalName: "",
    furigana: "",
    customerNumber: "",
    phone: "",
    email: "",
    totalCases: 0,
    activeCases: 0,
    lastContactDate: null,
    lastContactChannel: null,
    owner: { initials: "", name: "" },
    referralSource: "",
    group: "",
    ...partial,
  };
}

const EXISTING = [
  customer({
    id: "1",
    displayName: "田中太郎",
    phone: "090-1234-5678",
    email: "tanaka@example.com",
  }),
  customer({
    id: "2",
    displayName: "佐藤花子",
    phone: "080-9999-0000",
    email: "sato@example.com",
  }),
];

function create(customers = EXISTING) {
  return useCustomerCreateForm({ existingCustomers: () => customers });
}

describe("useCustomerCreateForm", () => {
  it("initializes with empty fields", () => {
    const { fields } = create();
    expect(fields.legalName).toBe("");
    expect(fields.group).toBe("");
    expect(fields.phone).toBe("");
    expect(fields.email).toBe("");
    expect(fields.displayName).toBe("");
    expect(fields.nationality).toBe("");
  });

  it("canCreate is false when all fields are empty", () => {
    const { canCreate } = create();
    expect(canCreate.value).toBe(false);
  });

  it("canCreate is true with legalName + group + phone", () => {
    const { fields, canCreate } = create();
    fields.legalName = "Test";
    fields.group = "tokyo-1";
    fields.phone = "090-0000-0000";
    expect(canCreate.value).toBe(true);
  });

  it("canCreate is true with legalName + group + email", () => {
    const { fields, canCreate } = create();
    fields.legalName = "Test";
    fields.group = "tokyo-1";
    fields.email = "test@example.com";
    expect(canCreate.value).toBe(true);
  });

  it("canCreate is true with legalName + group + phone + email", () => {
    const { fields, canCreate } = create();
    fields.legalName = "Test";
    fields.group = "tokyo-1";
    fields.phone = "090";
    fields.email = "a@b.com";
    expect(canCreate.value).toBe(true);
  });

  it("canCreate is false without phone and email", () => {
    const { fields, canCreate } = create();
    fields.legalName = "Test";
    fields.group = "tokyo-1";
    expect(canCreate.value).toBe(false);
  });

  it("canCreate is false without legalName", () => {
    const { fields, canCreate } = create();
    fields.group = "tokyo-1";
    fields.phone = "090-0000-0000";
    expect(canCreate.value).toBe(false);
  });

  it("canCreate is false without group", () => {
    const { fields, canCreate } = create();
    fields.legalName = "Test";
    fields.phone = "090-0000-0000";
    expect(canCreate.value).toBe(false);
  });

  it("canCreate trims whitespace for legalName", () => {
    const { fields, canCreate } = create();
    fields.legalName = "   ";
    fields.group = "tokyo-1";
    fields.phone = "090";
    expect(canCreate.value).toBe(false);
  });

  it("canCreate trims whitespace for phone/email", () => {
    const { fields, canCreate } = create();
    fields.legalName = "Test";
    fields.group = "tokyo-1";
    fields.phone = "  ";
    fields.email = "  ";
    expect(canCreate.value).toBe(false);
  });

  it("showDedupe is false when phone and email are empty", () => {
    const { showDedupe } = create();
    expect(showDedupe.value).toBe(false);
  });

  it("dedupeMatches finds by phone (ignoring dashes)", () => {
    const { fields, dedupeMatches, showDedupe } = create();
    fields.phone = "09012345678";
    expect(dedupeMatches.value).toHaveLength(1);
    expect(dedupeMatches.value[0].id).toBe("1");
    expect(showDedupe.value).toBe(true);
  });

  it("dedupeMatches finds by exact email", () => {
    const { fields, dedupeMatches } = create();
    fields.email = "tanaka@example.com";
    expect(dedupeMatches.value).toHaveLength(1);
    expect(dedupeMatches.value[0].id).toBe("1");
  });

  it("dedupeMatches email comparison is case-insensitive", () => {
    const { fields, dedupeMatches } = create();
    fields.email = "TANAKA@EXAMPLE.COM";
    expect(dedupeMatches.value).toHaveLength(1);
  });

  it("dedupeMatches returns empty for non-matching data", () => {
    const { fields, dedupeMatches } = create();
    fields.phone = "000-0000-0001";
    expect(dedupeMatches.value).toHaveLength(0);
  });

  it("dedupeMatches can return multiple matches", () => {
    const { fields, dedupeMatches } = create([
      customer({ id: "a", phone: "090-1111-2222", email: "x@y.com" }),
      customer({ id: "b", phone: "090-1111-3333", email: "x@y.com" }),
    ]);
    fields.email = "x@y.com";
    expect(dedupeMatches.value).toHaveLength(2);
  });

  it("resetForm clears all fields", () => {
    const { fields, resetForm } = create();
    fields.legalName = "Test";
    fields.group = "tokyo-1";
    fields.phone = "090-0000";
    fields.email = "a@b.com";
    fields.nationality = "日本";
    fields.note = "memo";
    resetForm();
    expect(fields.legalName).toBe("");
    expect(fields.group).toBe("");
    expect(fields.phone).toBe("");
    expect(fields.email).toBe("");
    expect(fields.nationality).toBe("");
    expect(fields.note).toBe("");
  });

  it("canCreate updates reactively after resetForm", () => {
    const { fields, canCreate, resetForm } = create();
    fields.legalName = "Test";
    fields.group = "g1";
    fields.phone = "090";
    expect(canCreate.value).toBe(true);
    resetForm();
    expect(canCreate.value).toBe(false);
  });
});
