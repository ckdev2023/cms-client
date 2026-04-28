// ── Test Ownership ──────────────────────────────────────────────
// Owner: case detail tab query schema (p0-fe-003-01).
// Covers: DEFAULT_CASE_DETAIL_TAB, isValidDetailTab, resolveDetailTab,
//   parse/serialize round-trip, fallback chain, and alignment with
//   CASE_DETAIL_NAV_PROTOCOL / CASE_DETAIL_TAB_KEYS.
// Does NOT test: deep-link builders (→ query.detail-deeplink.test),
//   list/create query (→ query.test), model composable (→ useCaseDetailModel.test).
// ────────────────────────────────────────────────────────────────

import type { LocationQuery } from "vue-router";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_CASE_DETAIL_TAB,
  isValidDetailTab,
  resolveDetailTab,
  parseCaseDetailQuery,
  buildCaseDetailQuery,
} from "./query";
import { CASE_DETAIL_TAB_KEYS } from "./constants";
import { CASE_DETAIL_NAV_PROTOCOL } from "./model/CaseAdapterTypes";

// ─── DEFAULT_CASE_DETAIL_TAB ────────────────────────────────────

describe("DEFAULT_CASE_DETAIL_TAB", () => {
  it("equals overview", () => {
    expect(DEFAULT_CASE_DETAIL_TAB).toBe("overview");
  });

  it("is a member of CASE_DETAIL_TAB_KEYS", () => {
    expect(CASE_DETAIL_TAB_KEYS).toContain(DEFAULT_CASE_DETAIL_TAB);
  });

  it("matches CASE_DETAIL_NAV_PROTOCOL.defaultTab", () => {
    expect(DEFAULT_CASE_DETAIL_TAB).toBe(CASE_DETAIL_NAV_PROTOCOL.defaultTab);
  });
});

// ─── isValidDetailTab ───────────────────────────────────────────

describe("isValidDetailTab", () => {
  it("returns true for every CASE_DETAIL_TAB_KEYS member", () => {
    for (const key of CASE_DETAIL_TAB_KEYS) {
      expect(isValidDetailTab(key)).toBe(true);
    }
  });

  it("returns false for non-member strings", () => {
    expect(isValidDetailTab("")).toBe(false);
    expect(isValidDetailTab("bogus")).toBe(false);
    expect(isValidDetailTab("S1")).toBe(false);
    expect(isValidDetailTab("Overview")).toBe(false);
    expect(isValidDetailTab("OVERVIEW")).toBe(false);
  });

  it("is case-sensitive", () => {
    expect(isValidDetailTab("overview")).toBe(true);
    expect(isValidDetailTab("Overview")).toBe(false);
    expect(isValidDetailTab("BILLING")).toBe(false);
  });
});

// ─── resolveDetailTab ───────────────────────────────────────────

describe("resolveDetailTab", () => {
  it("returns valid tab values unchanged", () => {
    for (const key of CASE_DETAIL_TAB_KEYS) {
      expect(resolveDetailTab(key)).toBe(key);
    }
  });

  it("falls back to DEFAULT_CASE_DETAIL_TAB for undefined", () => {
    expect(resolveDetailTab(undefined)).toBe(DEFAULT_CASE_DETAIL_TAB);
  });

  it("falls back to DEFAULT_CASE_DETAIL_TAB for null", () => {
    expect(resolveDetailTab(null)).toBe(DEFAULT_CASE_DETAIL_TAB);
  });

  it("falls back to DEFAULT_CASE_DETAIL_TAB for empty string", () => {
    expect(resolveDetailTab("")).toBe(DEFAULT_CASE_DETAIL_TAB);
  });

  it("falls back to DEFAULT_CASE_DETAIL_TAB for invalid string", () => {
    expect(resolveDetailTab("bogus")).toBe(DEFAULT_CASE_DETAIL_TAB);
    expect(resolveDetailTab("OVERVIEW")).toBe(DEFAULT_CASE_DETAIL_TAB);
    expect(resolveDetailTab("tab-overview")).toBe(DEFAULT_CASE_DETAIL_TAB);
    expect(resolveDetailTab(" overview")).toBe(DEFAULT_CASE_DETAIL_TAB);
    expect(resolveDetailTab("overview ")).toBe(DEFAULT_CASE_DETAIL_TAB);
  });

  it("does not coerce non-string types", () => {
    expect(resolveDetailTab(null)).toBe(DEFAULT_CASE_DETAIL_TAB);
    expect(resolveDetailTab(undefined)).toBe(DEFAULT_CASE_DETAIL_TAB);
  });
});

// ─── parse → resolve round-trip ──────────────────────────────────

describe("parse → resolve round-trip", () => {
  it("valid tab survives parse → resolve", () => {
    for (const tab of CASE_DETAIL_TAB_KEYS) {
      const parsed = parseCaseDetailQuery({ tab });
      const resolved = resolveDetailTab(parsed.tab);
      expect(resolved).toBe(tab);
    }
  });

  it("invalid value → parse returns undefined → resolve returns default", () => {
    const parsed = parseCaseDetailQuery({ tab: "nope" });
    expect(parsed.tab).toBeUndefined();
    expect(resolveDetailTab(parsed.tab)).toBe(DEFAULT_CASE_DETAIL_TAB);
  });

  it("empty query → parse returns undefined → resolve returns default", () => {
    const parsed = parseCaseDetailQuery({});
    expect(parsed.tab).toBeUndefined();
    expect(resolveDetailTab(parsed.tab)).toBe(DEFAULT_CASE_DETAIL_TAB);
  });
});

// ─── serialize → parse round-trip ────────────────────────────────

describe("serialize → parse round-trip", () => {
  it("non-default tabs round-trip through build → parse", () => {
    const nonDefault = CASE_DETAIL_TAB_KEYS.filter(
      (t) => t !== DEFAULT_CASE_DETAIL_TAB,
    );
    for (const tab of nonDefault) {
      const query = buildCaseDetailQuery({ tab });
      const parsed = parseCaseDetailQuery(query as unknown as LocationQuery);
      expect(parsed.tab).toBe(tab);
    }
  });

  it("default tab serializes to omitted → parses back as undefined", () => {
    const query = buildCaseDetailQuery({ tab: DEFAULT_CASE_DETAIL_TAB });
    expect(query.tab).toBeUndefined();
    const parsed = parseCaseDetailQuery(query as unknown as LocationQuery);
    expect(parsed.tab).toBeUndefined();
    expect(resolveDetailTab(parsed.tab)).toBe(DEFAULT_CASE_DETAIL_TAB);
  });

  it("undefined tab serializes to omitted → parses back as undefined", () => {
    const query = buildCaseDetailQuery({});
    expect(query.tab).toBeUndefined();
    const parsed = parseCaseDetailQuery(query as unknown as LocationQuery);
    expect(parsed.tab).toBeUndefined();
  });
});

// ─── schema alignment ────────────────────────────────────────────

describe("tab query schema alignment", () => {
  it("CASE_DETAIL_TAB_KEYS has exactly 10 members", () => {
    expect(CASE_DETAIL_TAB_KEYS).toHaveLength(10);
  });

  it("includes all P0 contract tabs", () => {
    const p0Tabs = [
      "overview",
      "info",
      "documents",
      "forms",
      "tasks",
      "deadlines",
      "validation",
      "billing",
      "messages",
      "log",
    ];
    for (const tab of p0Tabs) {
      expect(CASE_DETAIL_TAB_KEYS).toContain(tab);
    }
  });

  it("buildCaseDetailQuery omits only DEFAULT_CASE_DETAIL_TAB from URL", () => {
    expect(
      buildCaseDetailQuery({ tab: DEFAULT_CASE_DETAIL_TAB }).tab,
    ).toBeUndefined();

    const nonDefault = CASE_DETAIL_TAB_KEYS.filter(
      (t) => t !== DEFAULT_CASE_DETAIL_TAB,
    );
    for (const tab of nonDefault) {
      expect(buildCaseDetailQuery({ tab }).tab).toBe(tab);
    }
  });
});
