import {
  RESIDENCE_REMINDER_DAYS,
  buildResidenceReminderDedupeKey,
} from "./Reminder";

describe("P0 reminder strategy (180/90/30 fixed days)", () => {
  it("RESIDENCE_REMINDER_DAYS is exactly [180, 90, 30]", () => {
    expect(RESIDENCE_REMINDER_DAYS).toEqual([180, 90, 30]);
    expect(RESIDENCE_REMINDER_DAYS).toHaveLength(3);
  });

  it("RESIDENCE_REMINDER_DAYS is readonly (frozen at compile time)", () => {
    const arr: readonly number[] = RESIDENCE_REMINDER_DAYS;
    expect(arr[0]).toBe(180);
    expect(arr[1]).toBe(90);
    expect(arr[2]).toBe(30);
  });
});

describe("buildResidenceReminderDedupeKey", () => {
  it("generates deterministic key for case + daysBefore", () => {
    const key = buildResidenceReminderDedupeKey("case-abc", 180);
    expect(key).toBe("residence_renewal:case-abc:180d");
  });

  it("produces unique keys for different daysBefore values", () => {
    const keys = RESIDENCE_REMINDER_DAYS.map((d) =>
      buildResidenceReminderDedupeKey("case-1", d),
    );
    const unique = new Set(keys);
    expect(unique.size).toBe(3);
  });

  it("produces unique keys for different cases", () => {
    const k1 = buildResidenceReminderDedupeKey("case-A", 90);
    const k2 = buildResidenceReminderDedupeKey("case-B", 90);
    expect(k1).not.toBe(k2);
  });

  it("key format matches expected pattern for all standard intervals", () => {
    for (const days of RESIDENCE_REMINDER_DAYS) {
      const key = buildResidenceReminderDedupeKey("c1", days);
      expect(key).toMatch(/^residence_renewal:c1:\d+d$/);
    }
  });
});
