import { describe, it, expect } from "vitest";
import { useLeadCreateForm } from "./useLeadCreateForm";
import type { LeadSummary } from "../types";

function lead(partial: Partial<LeadSummary> & { id: string }): LeadSummary {
  return {
    name: "",
    phone: "",
    email: "",
    businessType: "",
    businessTypeLabel: "",
    source: "",
    sourceLabel: "",
    referrer: "",
    status: "new",
    ownerId: "",
    groupId: "",
    nextAction: "",
    nextFollowUp: "",
    nextFollowUpLabel: "",
    updatedAt: "",
    updatedAtLabel: "",
    convertedCustomerId: null,
    convertedCaseId: null,
    dedupHint: null,
    rowHighlight: null,
    ...partial,
  };
}

const EXISTING = [
  lead({
    id: "1",
    name: "田中太郎",
    phone: "090-1234-5678",
    email: "tanaka@example.com",
  }),
  lead({
    id: "2",
    name: "佐藤花子",
    phone: "080-9999-0000",
    email: "sato@example.com",
  }),
];

function create(leads = EXISTING) {
  return useLeadCreateForm({ existingLeads: () => leads });
}

describe("useLeadCreateForm", () => {
  it("initializes with empty fields", () => {
    const { fields } = create();
    expect(fields.name).toBe("");
    expect(fields.phone).toBe("");
    expect(fields.email).toBe("");
    expect(fields.source).toBe("");
    expect(fields.businessType).toBe("");
    expect(fields.note).toBe("");
  });

  it("canCreate is false when all fields are empty", () => {
    const { canCreate } = create();
    expect(canCreate.value).toBe(false);
  });

  it("canCreate is true with name + phone", () => {
    const { fields, canCreate } = create();
    fields.name = "Test";
    fields.phone = "090-0000-0000";
    expect(canCreate.value).toBe(true);
  });

  it("canCreate is true with name + email", () => {
    const { fields, canCreate } = create();
    fields.name = "Test";
    fields.email = "test@example.com";
    expect(canCreate.value).toBe(true);
  });

  it("canCreate is true with name + phone + email", () => {
    const { fields, canCreate } = create();
    fields.name = "Test";
    fields.phone = "090";
    fields.email = "a@b.com";
    expect(canCreate.value).toBe(true);
  });

  it("canCreate is false without phone and email", () => {
    const { fields, canCreate } = create();
    fields.name = "Test";
    expect(canCreate.value).toBe(false);
  });

  it("canCreate is false without name", () => {
    const { fields, canCreate } = create();
    fields.phone = "090-0000-0000";
    expect(canCreate.value).toBe(false);
  });

  it("canCreate trims whitespace for name", () => {
    const { fields, canCreate } = create();
    fields.name = "   ";
    fields.phone = "090";
    expect(canCreate.value).toBe(false);
  });

  it("canCreate trims whitespace for phone/email", () => {
    const { fields, canCreate } = create();
    fields.name = "Test";
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
      lead({ id: "a", phone: "090-1111-2222", email: "x@y.com" }),
      lead({ id: "b", phone: "090-1111-3333", email: "x@y.com" }),
    ]);
    fields.email = "x@y.com";
    expect(dedupeMatches.value).toHaveLength(2);
  });

  it("resetForm clears all fields", () => {
    const { fields, resetForm } = create();
    fields.name = "Test";
    fields.phone = "090-0000";
    fields.email = "a@b.com";
    fields.source = "web";
    fields.businessType = "work-visa";
    fields.note = "memo";
    resetForm();
    expect(fields.name).toBe("");
    expect(fields.phone).toBe("");
    expect(fields.email).toBe("");
    expect(fields.source).toBe("");
    expect(fields.businessType).toBe("");
    expect(fields.note).toBe("");
  });

  it("canCreate updates reactively after resetForm", () => {
    const { fields, canCreate, resetForm } = create();
    fields.name = "Test";
    fields.phone = "090";
    expect(canCreate.value).toBe(true);
    resetForm();
    expect(canCreate.value).toBe(false);
  });
});
