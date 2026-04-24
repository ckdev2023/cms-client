// ── Test Ownership ──────────────────────────────────────────────
// Owner: buildCaseListSearchParams core filter serialization —
//   scope / search / stage / owner / group / risk.
// Frozen by p0-fe-002b-02.
// Does NOT test: page/limit/customerId/view (→ CaseAdapterReaders.test),
//   contract freeze (→ CaseAdapterReaders.test), Vue Router query
//   (→ query.test), write payloads, or repository orchestration.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { buildCaseListSearchParams } from "./CaseAdapterReaders";
import {
  type CaseListParams,
  CASE_LIST_HTTP_FIELD_MAP,
} from "./CaseAdapterTypes";

// ─── Core Filter Serialization (p0-fe-002b-02) ─────────────────
// Focused tests for scope/search/stage/owner/group/risk:
// each filter's serialization to correct HTTP key, and omission
// of empty / undefined / null / whitespace-only values.

describe("core filter — scope", () => {
  it("serializes valid scope to HTTP key 'scope'", () => {
    const sp = buildCaseListSearchParams({ scope: "all" });
    expect(sp.get(CASE_LIST_HTTP_FIELD_MAP.scope)).toBe("all");
  });

  it("omits scope when empty string", () => {
    const sp = buildCaseListSearchParams({ scope: "" });
    expect(sp.has("scope")).toBe(false);
  });

  it("omits scope when undefined", () => {
    const sp = buildCaseListSearchParams({});
    expect(sp.has("scope")).toBe(false);
  });

  it("omits scope when null (defensive)", () => {
    const sp = buildCaseListSearchParams({
      scope: null as unknown as string,
    });
    expect(sp.has("scope")).toBe(false);
  });

  it("trims whitespace from scope", () => {
    const sp = buildCaseListSearchParams({ scope: " mine " });
    expect(sp.get("scope")).toBe("mine");
  });

  it("omits scope when whitespace-only", () => {
    const sp = buildCaseListSearchParams({ scope: "   " });
    expect(sp.has("scope")).toBe(false);
  });
});

describe("core filter — search", () => {
  it("serializes search to HTTP key 'search'", () => {
    const sp = buildCaseListSearchParams({ search: "技人国" });
    expect(sp.get(CASE_LIST_HTTP_FIELD_MAP.search)).toBe("技人国");
  });

  it("trims leading/trailing whitespace", () => {
    const sp = buildCaseListSearchParams({ search: "  東京  " });
    expect(sp.get("search")).toBe("東京");
  });

  it("omits search when empty string", () => {
    const sp = buildCaseListSearchParams({ search: "" });
    expect(sp.has("search")).toBe(false);
  });

  it("omits search when undefined", () => {
    const sp = buildCaseListSearchParams({});
    expect(sp.has("search")).toBe(false);
  });

  it("omits search when null (defensive)", () => {
    const sp = buildCaseListSearchParams({
      search: null as unknown as string,
    });
    expect(sp.has("search")).toBe(false);
  });

  it("omits search when whitespace-only", () => {
    const sp = buildCaseListSearchParams({ search: "   " });
    expect(sp.has("search")).toBe(false);
  });

  it("preserves internal whitespace", () => {
    const sp = buildCaseListSearchParams({ search: "田中 花子" });
    expect(sp.get("search")).toBe("田中 花子");
  });
});

describe("core filter — stage", () => {
  it("serializes stage to HTTP key 'stage'", () => {
    const sp = buildCaseListSearchParams({ stage: "S4" });
    expect(sp.get(CASE_LIST_HTTP_FIELD_MAP.stage)).toBe("S4");
  });

  it("serializes all valid stage IDs", () => {
    for (const s of ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9"]) {
      const sp = buildCaseListSearchParams({ stage: s });
      expect(sp.get("stage")).toBe(s);
    }
  });

  it("omits stage when empty string", () => {
    const sp = buildCaseListSearchParams({ stage: "" });
    expect(sp.has("stage")).toBe(false);
  });

  it("omits stage when undefined", () => {
    const sp = buildCaseListSearchParams({});
    expect(sp.has("stage")).toBe(false);
  });

  it("omits stage when null (defensive)", () => {
    const sp = buildCaseListSearchParams({
      stage: null as unknown as string,
    });
    expect(sp.has("stage")).toBe(false);
  });

  it("trims whitespace from stage", () => {
    const sp = buildCaseListSearchParams({ stage: " S3 " });
    expect(sp.get("stage")).toBe("S3");
  });
});

describe("core filter — owner", () => {
  it("serializes owner to HTTP key 'ownerUserId'", () => {
    const sp = buildCaseListSearchParams({ owner: "user-001" });
    expect(sp.get(CASE_LIST_HTTP_FIELD_MAP.owner)).toBe("user-001");
    expect(sp.get("ownerUserId")).toBe("user-001");
  });

  it("omits owner when empty string", () => {
    const sp = buildCaseListSearchParams({ owner: "" });
    expect(sp.has("ownerUserId")).toBe(false);
  });

  it("omits owner when undefined", () => {
    const sp = buildCaseListSearchParams({});
    expect(sp.has("ownerUserId")).toBe(false);
  });

  it("omits owner when null (defensive)", () => {
    const sp = buildCaseListSearchParams({
      owner: null as unknown as string,
    });
    expect(sp.has("ownerUserId")).toBe(false);
  });

  it("trims whitespace from owner", () => {
    const sp = buildCaseListSearchParams({ owner: " suzuki " });
    expect(sp.get("ownerUserId")).toBe("suzuki");
  });

  it("omits owner when whitespace-only", () => {
    const sp = buildCaseListSearchParams({ owner: "   " });
    expect(sp.has("ownerUserId")).toBe(false);
  });
});

describe("core filter — group", () => {
  it("serializes group to HTTP key 'groupId'", () => {
    const sp = buildCaseListSearchParams({ group: "tokyo-1" });
    expect(sp.get(CASE_LIST_HTTP_FIELD_MAP.group)).toBe("tokyo-1");
    expect(sp.get("groupId")).toBe("tokyo-1");
  });

  it("omits group when empty string", () => {
    const sp = buildCaseListSearchParams({ group: "" });
    expect(sp.has("groupId")).toBe(false);
  });

  it("omits group when undefined", () => {
    const sp = buildCaseListSearchParams({});
    expect(sp.has("groupId")).toBe(false);
  });

  it("omits group when null (defensive)", () => {
    const sp = buildCaseListSearchParams({
      group: null as unknown as string,
    });
    expect(sp.has("groupId")).toBe(false);
  });

  it("trims whitespace from group", () => {
    const sp = buildCaseListSearchParams({ group: " osaka " });
    expect(sp.get("groupId")).toBe("osaka");
  });

  it("omits group when whitespace-only", () => {
    const sp = buildCaseListSearchParams({ group: "   " });
    expect(sp.has("groupId")).toBe(false);
  });
});

describe("core filter — risk", () => {
  it("serializes risk to HTTP key 'riskLevel'", () => {
    const sp = buildCaseListSearchParams({ risk: "critical" });
    expect(sp.get(CASE_LIST_HTTP_FIELD_MAP.risk)).toBe("critical");
    expect(sp.get("riskLevel")).toBe("critical");
  });

  it("omits risk when empty string", () => {
    const sp = buildCaseListSearchParams({ risk: "" });
    expect(sp.has("riskLevel")).toBe(false);
  });

  it("omits risk when undefined", () => {
    const sp = buildCaseListSearchParams({});
    expect(sp.has("riskLevel")).toBe(false);
  });

  it("omits risk when null (defensive)", () => {
    const sp = buildCaseListSearchParams({
      risk: null as unknown as string,
    });
    expect(sp.has("riskLevel")).toBe(false);
  });

  it("trims whitespace from risk", () => {
    const sp = buildCaseListSearchParams({ risk: " attention " });
    expect(sp.get("riskLevel")).toBe("attention");
  });

  it("omits risk when whitespace-only", () => {
    const sp = buildCaseListSearchParams({ risk: "   " });
    expect(sp.has("riskLevel")).toBe(false);
  });
});

describe("core filters — combined omission", () => {
  it("all core filters empty → only view=summary in output", () => {
    const sp = buildCaseListSearchParams({
      scope: "",
      search: "",
      stage: "",
      owner: "",
      group: "",
      risk: "",
    });
    const keys = Array.from(sp.keys());
    expect(keys).toEqual(["view"]);
  });

  it("all core filters undefined → only view=summary in output", () => {
    const sp = buildCaseListSearchParams({});
    const keys = Array.from(sp.keys());
    expect(keys).toEqual(["view"]);
  });

  it("all core filters whitespace-only → only view=summary in output", () => {
    const sp = buildCaseListSearchParams({
      scope: "  ",
      search: "  ",
      stage: "  ",
      owner: "  ",
      group: "  ",
      risk: "  ",
    });
    const keys = Array.from(sp.keys());
    expect(keys).toEqual(["view"]);
  });

  it("all core filters null (defensive) → only view=summary in output", () => {
    const sp = buildCaseListSearchParams({
      scope: null,
      search: null,
      stage: null,
      owner: null,
      group: null,
      risk: null,
    } as unknown as CaseListParams);
    const keys = Array.from(sp.keys());
    expect(keys).toEqual(["view"]);
  });

  it("mixed populated and empty filters serialize only populated ones", () => {
    const sp = buildCaseListSearchParams({
      scope: "group",
      search: "",
      stage: "S5",
      owner: "",
      group: "tokyo-2",
      risk: "",
    });
    expect(sp.get("scope")).toBe("group");
    expect(sp.get("stage")).toBe("S5");
    expect(sp.get("groupId")).toBe("tokyo-2");
    expect(sp.has("search")).toBe(false);
    expect(sp.has("ownerUserId")).toBe(false);
    expect(sp.has("riskLevel")).toBe(false);
  });
});
