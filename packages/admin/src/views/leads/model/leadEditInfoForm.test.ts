import { describe, expect, it } from "vitest";
import {
  buildLeadEditInfoDiff,
  leadEditInfoSnapshot,
} from "./leadEditInfoForm";
import type { LeadDetail } from "../types";

function makeLead(intendedCaseType: string): LeadDetail {
  return {
    id: "LEAD-1",
    name: "山田太郎",
    status: "following",
    ownerId: "00000000-0000-4000-8000-000000000011",
    ownerLabel: "Local Admin",
    ownerInitials: "LA",
    ownerAvatarClass: "bg-sky-100 text-sky-700",
    groupId: null,
    groupLabel: null,
    intendedCaseType,
    banner: null,
    buttons: "normal",
    readonly: false,
    conversationId: null,
    info: {
      id: "LEAD-1",
      leadNo: "",
      name: "山田太郎",
      phone: "",
      email: "",
      source: "web",
      createdVia: "admin",
      referrer: "",
      businessType: intendedCaseType,
      group: "",
      owner: "Local Admin",
      language: "ja",
      note: "",
    },
    followups: [],
    conversion: {
      dedupResult: null,
      convertedCustomer: null,
      convertedCase: null,
      conversions: [],
    },
    log: [],
  };
}

describe("leadEditInfoSnapshot · businessType normalization", () => {
  it("keeps canonical kebab-case intendedCaseType (family-stay) intact", () => {
    const snap = leadEditInfoSnapshot(makeLead("family-stay"));
    expect(snap.businessType).toBe("family-stay");
  });

  it("normalizes legacy snake_case intendedCaseType (family_stay) to canonical (family-stay)", () => {
    const snap = leadEditInfoSnapshot(makeLead("family_stay"));
    expect(snap.businessType).toBe("family-stay");
  });

  it("normalizes legacy alias business-manager to canonical business-management-visa", () => {
    const snap = leadEditInfoSnapshot(makeLead("business-manager"));
    expect(snap.businessType).toBe("business-management-visa");
  });

  it("treats empty intendedCaseType as empty string (no false positives)", () => {
    const snap = leadEditInfoSnapshot(makeLead(""));
    expect(snap.businessType).toBe("");
  });

  it("falls back to original code when normalization fails (preserve legacy data)", () => {
    const snap = leadEditInfoSnapshot(makeLead("unknown-future-code"));
    expect(snap.businessType).toBe("unknown-future-code");
  });
});

describe("buildLeadEditInfoDiff · regression with normalized businessType", () => {
  it("does NOT emit businessType diff when server value (snake_case) was already normalized to current select value", () => {
    // 模拟：server 返回 family_stay，snapshot 投影后变成 family-stay；
    // 用户没有改任何字段就点了保存 → 不应触发 businessType: family-stay 的 patch。
    const initial = leadEditInfoSnapshot(makeLead("family_stay"));
    const diff = buildLeadEditInfoDiff({ ...initial }, initial);
    expect(diff.businessType).toBeUndefined();
  });

  it("emits businessType diff when user actually changes the value", () => {
    const initial = leadEditInfoSnapshot(makeLead("family_stay"));
    const diff = buildLeadEditInfoDiff(
      { ...initial, businessType: "permanent" },
      initial,
    );
    expect(diff.businessType).toBe("permanent");
  });
});
