import { describe, expect, it } from "vitest";

import {
  adaptGroupSummary,
  adaptGroupDetail,
  adaptDetailAsSummary,
  adaptDisableResult,
} from "./GroupsRepository";

const DETAIL_DTO = {
  id: "g-1",
  name: "Team Alpha",
  activeFlag: true,
  createdAt: "2026-04-01T00:00:00.000Z",
  groupNo: "GRP-001",
  description: "Main team",
  members: [
    { userName: "Tanaka", userRole: "manager", joinedAt: "2026-04-01" },
  ],
  references: { customerCount: 7, caseCount: 3 },
};

describe("adaptGroupSummary", () => {
  it("returns null for non-object values", () => {
    expect(adaptGroupSummary(null)).toBeNull();
    expect(adaptGroupSummary("str")).toBeNull();
    expect(adaptGroupSummary(42)).toBeNull();
    expect(adaptGroupSummary([])).toBeNull();
  });

  it("returns null when required fields missing", () => {
    expect(adaptGroupSummary({ id: "1" })).toBeNull();
    expect(adaptGroupSummary({ name: "A" })).toBeNull();
  });

  it("adapts activeFlag=true to status=active", () => {
    expect(
      adaptGroupSummary({
        id: "g-1",
        name: "Alpha",
        activeFlag: true,
        createdAt: "2026-01-01",
        activeCaseCount: 3,
        memberCount: 5,
      }),
    ).toEqual({
      id: "g-1",
      name: "Alpha",
      status: "active",
      createdAt: "2026-01-01",
      activeCaseCount: 3,
      memberCount: 5,
    });
  });

  it("maps groupNo when present and non-empty", () => {
    const result = adaptGroupSummary({
      id: "g-1",
      name: "Alpha",
      groupNo: "GRP-001",
      activeFlag: true,
    });
    expect(result).toMatchObject({ groupNo: "GRP-001" });
  });

  it("omits groupNo when null or empty string", () => {
    expect(
      adaptGroupSummary({ id: "g-1", name: "A", groupNo: null }),
    ).not.toHaveProperty("groupNo");
    expect(
      adaptGroupSummary({ id: "g-1", name: "A", groupNo: "" }),
    ).not.toHaveProperty("groupNo");
  });

  it("adapts activeFlag=false to status=disabled", () => {
    expect(
      adaptGroupSummary({ id: "g-2", name: "Beta", activeFlag: false }),
    ).toMatchObject({ status: "disabled" });
  });

  it("prefers explicit status field over activeFlag", () => {
    expect(
      adaptGroupSummary({
        id: "x",
        name: "X",
        status: "disabled",
        activeFlag: true,
      }),
    ).toMatchObject({ status: "disabled" });
  });

  it("defaults numeric fields to 0", () => {
    expect(adaptGroupSummary({ id: "x", name: "X" })).toMatchObject({
      activeCaseCount: 0,
      memberCount: 0,
      createdAt: "",
      status: "disabled",
    });
  });
});

describe("adaptGroupDetail", () => {
  it("returns null for non-object", () => {
    expect(adaptGroupDetail(null)).toBeNull();
    expect(adaptGroupDetail("str")).toBeNull();
  });

  it("returns null when required fields missing", () => {
    expect(adaptGroupDetail({ id: "1" })).toBeNull();
  });

  it("adapts valid detail DTO with references", () => {
    expect(adaptGroupDetail(DETAIL_DTO)).toEqual({
      id: "g-1",
      name: "Team Alpha",
      status: "active",
      createdAt: "2026-04-01T00:00:00.000Z",
      activeCaseCount: 3,
      memberCount: 1,
      groupNo: "GRP-001",
      description: "Main team",
      members: [{ name: "Tanaka", role: "manager", joinedAt: "2026-04-01" }],
      customerCount: 7,
    });
  });

  it("falls back to direct fields when references missing", () => {
    const dto = {
      id: "g-1",
      name: "X",
      status: "active",
      activeCaseCount: 5,
      memberCount: 3,
      customerCount: 2,
    };
    expect(adaptGroupDetail(dto)).toMatchObject({
      activeCaseCount: 5,
      customerCount: 2,
    });
  });
});

describe("adaptDetailAsSummary", () => {
  it("returns null for non-object", () => {
    expect(adaptDetailAsSummary(null)).toBeNull();
  });

  it("adapts detail DTO to summary shape (includes groupNo)", () => {
    expect(adaptDetailAsSummary(DETAIL_DTO)).toEqual({
      id: "g-1",
      name: "Team Alpha",
      groupNo: "GRP-001",
      status: "active",
      createdAt: "2026-04-01T00:00:00.000Z",
      activeCaseCount: 3,
      memberCount: 1,
    });
  });
});

describe("adaptDisableResult", () => {
  it("returns null for non-object", () => {
    expect(adaptDisableResult(null)).toBeNull();
  });

  it("returns null when references missing", () => {
    expect(adaptDisableResult({ id: "g-1" })).toBeNull();
  });

  it("adapts from references field", () => {
    expect(adaptDisableResult(DETAIL_DTO)).toEqual({
      stats: { customerCount: 7, activeCaseCount: 3 },
    });
  });
});
