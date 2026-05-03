import { describe, expect, it } from "vitest";
import {
  adaptCaseDetailAggregate,
  buildTeamFromDeepLink,
} from "./CaseAdapterDetailAggregate";

function buildAggregate(deepLink: Record<string, unknown> | null) {
  return {
    case: { id: "case-r01", stage: "S4" },
    deepLink,
    counts: null,
    billing: null,
    latestValidation: null,
    latestSubmission: null,
    latestReview: null,
    documentProgressByProvider: [],
  };
}

describe("buildTeamFromDeepLink (R27-R / T6.2)", () => {
  it("owner + assistant → 2 team members with correct i18n role keys", () => {
    const dl = {
      ownerDisplayName: "佐藤一郎",
      assistantDisplayName: "鈴木二郎",
      ownerUserId: "u-owner",
      assistantUserId: "u-asst",
      customerId: "c1",
      customerName: "Test",
      groupId: null,
      groupName: null,
    };
    const team = buildTeamFromDeepLink(dl);

    expect(team).toHaveLength(2);

    expect(team[0].name).toBe("佐藤一郎");
    expect(team[0].role).toBe("cases.detail.overview.sidebar.teamRoleOwner");
    expect(team[0].initials).toBe("佐藤");

    expect(team[1].name).toBe("鈴木二郎");
    expect(team[1].role).toBe(
      "cases.detail.overview.sidebar.teamRoleAssistant",
    );
    expect(team[1].initials).toBe("鈴木");
  });

  it("owner only (no assistant) → 1 team member", () => {
    const dl = {
      ownerDisplayName: "Local Admin",
      assistantDisplayName: null,
      ownerUserId: "u-owner",
      assistantUserId: null,
      customerId: "c1",
      customerName: "Test",
      groupId: null,
      groupName: null,
    };
    const team = buildTeamFromDeepLink(dl);

    expect(team).toHaveLength(1);
    expect(team[0].name).toBe("Local Admin");
    expect(team[0].initials).toBe("LA");
    expect(team[0].role).toBe("cases.detail.overview.sidebar.teamRoleOwner");
  });

  it("null deep link → empty team", () => {
    expect(buildTeamFromDeepLink(null)).toEqual([]);
  });

  it("empty ownerDisplayName → empty team", () => {
    const dl = {
      ownerDisplayName: "",
      assistantDisplayName: null,
      ownerUserId: "",
      assistantUserId: null,
      customerId: "c1",
      customerName: "Test",
      groupId: null,
      groupName: null,
    };
    expect(buildTeamFromDeepLink(dl)).toEqual([]);
  });

  it("multi-word western name derives correct initials", () => {
    const dl = {
      ownerDisplayName: "John Smith",
      assistantDisplayName: "Jane Marie Doe",
      ownerUserId: "u1",
      assistantUserId: "u2",
      customerId: "c1",
      customerName: "Test",
      groupId: null,
      groupName: null,
    };
    const team = buildTeamFromDeepLink(dl);
    expect(team[0].initials).toBe("JS");
    expect(team[1].initials).toBe("JD");
  });
});

describe("adaptCaseDetailAggregate team integration (R27-R)", () => {
  it("aggregate with owner+assistant → detail.team has 2 members", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({
        customerId: "cust-1",
        customerName: "山田太郎",
        groupId: null,
        groupName: null,
        ownerUserId: "user-1",
        ownerDisplayName: "佐藤一郎",
        assistantUserId: "user-2",
        assistantDisplayName: "鈴木二郎",
      }),
    )!;

    expect(result.detail.team).toHaveLength(2);
    expect(result.detail.team[0].name).toBe("佐藤一郎");
    expect(result.detail.team[1].name).toBe("鈴木二郎");
  });

  it("aggregate with null deepLink → detail.team is empty", () => {
    const result = adaptCaseDetailAggregate(buildAggregate(null))!;
    expect(result.detail.team).toEqual([]);
  });

  it("team members have non-empty gradient", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({
        customerId: "c1",
        customerName: "Test",
        groupId: null,
        groupName: null,
        ownerUserId: "u1",
        ownerDisplayName: "Owner",
        assistantUserId: "u2",
        assistantDisplayName: "Assistant",
      }),
    )!;

    for (const m of result.detail.team) {
      expect(m.gradient).toBeTruthy();
    }
  });
});
