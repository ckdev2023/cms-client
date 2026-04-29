import assert from "node:assert/strict";
import test, { describe } from "node:test";

import {
  mapResidencePeriodRow,
  toDateOnlyString,
} from "./residencePeriods.service";

function makeResidencePeriodRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "00000000-0000-4000-8000-000000000030",
    org_id: "00000000-0000-4000-8000-000000000000",
    case_id: "00000000-0000-4000-8000-000000000010",
    customer_id: "00000000-0000-4000-8000-000000000020",
    visa_type: "business_manager",
    status_of_residence: "経営・管理",
    period_years: 1,
    period_label: "1年",
    valid_from: "2026-01-01",
    valid_until: "2027-01-01",
    card_number: "AB1234567CD",
    is_current: true,
    entry_date: "2026-01-15",
    reminder_created: false,
    notes: null,
    created_by: "00000000-0000-4000-8000-000000000001",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

void describe("toDateOnlyString", () => {
  void test("returns first 10 chars of an ISO date string", () => {
    assert.equal(toDateOnlyString("2026-04-28"), "2026-04-28");
  });

  void test("returns first 10 chars of a datetime string", () => {
    assert.equal(toDateOnlyString("2026-04-28T15:30:00+09:00"), "2026-04-28");
  });

  void test("extracts correct date from Date at local midnight", () => {
    assert.equal(toDateOnlyString(new Date(2026, 3, 28)), "2026-04-28");
  });

  void test("extracts correct date from Date at UTC midnight", () => {
    const utcMidnight = new Date("2026-04-28T00:00:00.000Z");
    const expected = `2026-${String(utcMidnight.getMonth() + 1).padStart(2, "0")}-${String(utcMidnight.getDate()).padStart(2, "0")}`;
    assert.equal(toDateOnlyString(utcMidnight), expected);
  });

  void test("handles padding, boundaries, and invalid inputs", () => {
    assert.equal(toDateOnlyString(new Date(2026, 0, 1)), "2026-01-01");
    assert.equal(toDateOnlyString(new Date(2026, 11, 31)), "2026-12-31");
    assert.throws(() => toDateOnlyString(12345), /Invalid date value/);
    assert.throws(() => toDateOnlyString(null), /Invalid date value/);
    assert.throws(() => toDateOnlyString(undefined), /Invalid date value/);
  });
});

void describe("mapResidencePeriodRow with Date objects (BUG-068 round-trip)", () => {
  void test("correctly maps Date objects in valid_from / valid_until / entry_date", () => {
    const mapped = mapResidencePeriodRow(
      makeResidencePeriodRow({
        valid_from: new Date(2026, 3, 1),
        valid_until: new Date(2027, 2, 31),
        entry_date: new Date(2026, 3, 15),
      }),
    );
    assert.equal(mapped.validFrom, "2026-04-01");
    assert.equal(mapped.validUntil, "2027-03-31");
    assert.equal(mapped.entryDate, "2026-04-15");
  });

  void test("string dates pass through unchanged", () => {
    const mapped = mapResidencePeriodRow(
      makeResidencePeriodRow({
        valid_from: "2026-04-01",
        valid_until: "2027-03-31",
        entry_date: "2026-04-15",
      }),
    );
    assert.equal(mapped.validFrom, "2026-04-01");
    assert.equal(mapped.validUntil, "2027-03-31");
    assert.equal(mapped.entryDate, "2026-04-15");
  });
});
