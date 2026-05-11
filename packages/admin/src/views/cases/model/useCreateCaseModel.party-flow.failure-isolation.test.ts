// Owner: p0-fe-008-03 — single-mode party failure isolation (split from party-flow.test).

import { afterEach, describe, expect, it, vi } from "vitest";
import { useCreateCaseModel } from "./useCreateCaseModel";
import {
  trackingRepo,
  deps,
  ready,
} from "./useCreateCaseModel.party-flow.test-support";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("single mode party failure isolation (p0-fe-008-03)", () => {
  it("primary party failure → warning, case succeeds", async () => {
    let n = 0;
    const r = trackingRepo();
    r.partySpy.mockImplementation(async () => {
      if (++n === 1) throw new Error("primary party failed");
      return { id: "ok" };
    });
    const m = ready(useCreateCaseModel(deps({ repo: r.repo })));
    const result = await m.submit();
    expect(result).not.toBeNull();
    expect(m.submitError.value).toBeNull();
    expect(m.partyWarnings.value.length).toBe(1);
    expect(m.partyWarnings.value[0]).toContain("Primary party");
  });

  it("related party failure → warning with party name", async () => {
    let n = 0;
    const r = trackingRepo();
    r.partySpy.mockImplementation(async () => {
      if (++n === 2) throw new Error("related fail");
      return { id: "ok" };
    });
    const m = ready(useCreateCaseModel(deps({ repo: r.repo })));
    m.addRelatedParty({
      customerId: "r1",
      name: "PartyX",
      role: "配偶",
      contact: "",
      note: "",
    });
    const result = await m.submit();
    expect(result).not.toBeNull();
    expect(m.partyWarnings.value.length).toBe(1);
    expect(m.partyWarnings.value[0]).toContain("PartyX");
  });

  it("all party failures → warnings only, case result preserved", async () => {
    const r = trackingRepo();
    r.partySpy.mockRejectedValue(new Error("all fail"));
    const m = ready(useCreateCaseModel(deps({ repo: r.repo })));
    m.addRelatedParty({
      customerId: "r1",
      name: "A",
      role: "配偶",
      contact: "",
      note: "",
    });
    m.addRelatedParty({
      customerId: "r2",
      name: "B",
      role: "子女",
      contact: "",
      note: "",
    });
    const result = await m.submit();
    expect(result).not.toBeNull();
    expect(m.submitResult.value?.id).toBe("CASE-PT-1");
    expect(m.submitError.value).toBeNull();
    expect(m.partyWarnings.value.length).toBe(3);
  });
});
