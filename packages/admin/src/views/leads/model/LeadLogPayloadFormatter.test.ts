import { describe, expect, it } from "vitest";

import { formatLeadLogPayload } from "./LeadLogPayloadFormatter";

describe("formatLeadLogPayload — server logType coverage (H-5)", () => {
  it("status_change → status category with localized labels", () => {
    const view = formatLeadLogPayload({
      logType: "status_change",
      payload: { from: "new", to: "following" },
    });
    expect(view.category).toBe("status");
    expect(view.fromValue).toBe("新咨询");
    expect(view.toValue).toBe("跟进中");
    expect(view.chipClass).toContain("sky");
  });

  it("status_change with missing from falls back to '—'", () => {
    const view = formatLeadLogPayload({
      logType: "status_change",
      payload: { to: "following" },
    });
    expect(view.fromValue).toBe("—");
    expect(view.toValue).toBe("跟进中");
  });

  it("field_change with ownerUserId diff → owner category", () => {
    const view = formatLeadLogPayload({
      logType: "field_change",
      payload: {
        ownerUserId: { from: "user-a", to: "user-b" },
      },
    });
    expect(view.category).toBe("owner");
    expect(view.fromValue).toBe("user-a");
    expect(view.toValue).toBe("user-b");
    expect(view.chipClass).toContain("emerald");
  });

  it("field_change with groupId diff → group category", () => {
    const view = formatLeadLogPayload({
      logType: "field_change",
      payload: {
        groupId: { from: "g1", to: "g2" },
      },
    });
    expect(view.category).toBe("group");
    expect(view.fromValue).toBe("g1");
    expect(view.toValue).toBe("g2");
    expect(view.chipClass).toContain("violet");
  });

  it("field_change with both owner and group → owner takes priority", () => {
    const view = formatLeadLogPayload({
      logType: "field_change",
      payload: {
        ownerUserId: { from: "u1", to: "u2" },
        groupId: { from: "g1", to: "g2" },
      },
    });
    expect(view.category).toBe("owner");
    expect(view.fromValue).toBe("u1");
    expect(view.toValue).toBe("u2");
  });

  it("field_change with non-owner/group fields → info category", () => {
    const view = formatLeadLogPayload({
      logType: "field_change",
      payload: {
        name: { from: "Old", to: "New" },
      },
    });
    expect(view.category).toBe("info");
    expect(view.fromValue).toBe("Old");
    expect(view.toValue).toBe("New");
  });

  it("field_change with empty payload → info category, '—' values", () => {
    const view = formatLeadLogPayload({
      logType: "field_change",
      payload: {},
    });
    expect(view.category).toBe("info");
    expect(view.fromValue).toBe("—");
    expect(view.toValue).toBe("—");
  });

  it("created log → status category, to='新咨询'", () => {
    const view = formatLeadLogPayload({
      logType: "created",
      payload: { name: "Test", phone: "0900" },
    });
    expect(view.category).toBe("status");
    expect(view.fromValue).toBe("—");
    expect(view.toValue).toBe("新咨询");
  });

  it("converted_customer → status category with customerId in toValue", () => {
    const view = formatLeadLogPayload({
      logType: "converted_customer",
      payload: { customerId: "cus-1" },
    });
    expect(view.category).toBe("status");
    expect(view.fromValue).toBe("已签约");
    expect(view.toValue).toBe("cus-1");
  });

  it("converted_case → status category with caseId in toValue", () => {
    const view = formatLeadLogPayload({
      logType: "converted_case",
      payload: { caseId: "case-1", caseTypeCode: "bmv" },
    });
    expect(view.category).toBe("status");
    expect(view.fromValue).toBe("已签约");
    expect(view.toValue).toBe("case-1");
  });

  it("owner_assigned (bulk) → owner category", () => {
    const view = formatLeadLogPayload({
      logType: "owner_assigned",
      payload: { ownerUserId: "user-x" },
    });
    expect(view.category).toBe("owner");
    expect(view.fromValue).toBe("—");
    expect(view.toValue).toBe("user-x");
  });

  it("followup_added → info category with channel as toValue", () => {
    const view = formatLeadLogPayload({
      logType: "followup_added",
      payload: { channel: "phone" },
    });
    expect(view.category).toBe("info");
    expect(view.toValue).toBe("phone");
  });

  it("tags_updated → info category with comma-joined tags", () => {
    const view = formatLeadLogPayload({
      logType: "tags_updated",
      payload: { tags: ["vip", "japanese"] },
    });
    expect(view.category).toBe("info");
    expect(view.toValue).toBe("vip, japanese");
  });

  it("tags_updated with empty array → info category with '—'", () => {
    const view = formatLeadLogPayload({
      logType: "tags_updated",
      payload: { tags: [] },
    });
    expect(view.toValue).toBe("—");
  });

  it("exported → info category with empty values", () => {
    const view = formatLeadLogPayload({
      logType: "exported",
      payload: {},
    });
    expect(view.category).toBe("info");
    expect(view.fromValue).toBe("—");
    expect(view.toValue).toBe("—");
  });

  it("unknown server logType falls back to info category", () => {
    const view = formatLeadLogPayload({
      logType: "totally_unknown_type",
      payload: { foo: "bar" },
    });
    expect(view.category).toBe("info");
    expect(view.fromValue).toBe("—");
    expect(view.toValue).toBe("—");
  });

  it("legacy fixture types (status / owner / group / info) pass through with empty diff", () => {
    for (const t of ["status", "owner", "group", "info"] as const) {
      const view = formatLeadLogPayload({ logType: t, payload: {} });
      expect(view.category).toBe(t);
      expect(view.fromValue).toBe("");
      expect(view.toValue).toBe("");
    }
  });
});
