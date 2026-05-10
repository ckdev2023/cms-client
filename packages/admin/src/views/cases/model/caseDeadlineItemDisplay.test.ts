import { describe, expect, it } from "vitest";
import type { DeadlineItem } from "../types-detail";
import {
  deadlineItemBarColor,
  deadlineItemChipClass,
  deadlineItemDateClass,
  formatDeadlineItemDesc,
} from "./caseDeadlineItemDisplay";

function item(overrides: Partial<DeadlineItem>): DeadlineItem {
  return {
    id: "1",
    title: "cases.deadlines.types.case",
    desc: "",
    date: "2026-01-01",
    remaining: "",
    severity: "muted",
    ...overrides,
  };
}

describe("caseDeadlineItemDisplay", () => {
  it("deadlineItemBarColor maps known severities", () => {
    expect(deadlineItemBarColor(item({ severity: "danger" }))).toBe(
      "var(--color-danger)",
    );
    expect(deadlineItemBarColor(item({ severity: "warning" }))).toBe("#f59e0b");
    expect(deadlineItemBarColor(item({ severity: "primary" }))).toBe(
      "var(--color-primary-6)",
    );
    expect(deadlineItemBarColor(item({ severity: "muted" }))).toBe(
      "var(--color-border-2)",
    );
  });

  it("deadlineItemBarColor falls back for unknown severity", () => {
    expect(deadlineItemBarColor(item({ severity: "unknown" }))).toBe(
      "var(--color-border-2)",
    );
  });

  it("deadlineItemChipClass and deadlineItemDateClass use severity tokens", () => {
    expect(deadlineItemChipClass(item({ severity: "danger" }))).toBe(
      "deadlines-tab__remaining--danger",
    );
    expect(deadlineItemDateClass(item({ severity: "warning" }))).toBe(
      "deadlines-tab__date--warning",
    );
  });

  it("formatDeadlineItemDesc translates cases.* segments and keeps literals", () => {
    const t = (k: string) =>
      k === "cases.deadlines.sendStatus.pending" ? "待发送" : k;
    expect(
      formatDeadlineItemDesc(
        "客户备注 · cases.deadlines.sendStatus.pending",
        t,
      ),
    ).toBe("客户备注 · 待发送");
  });

  it("formatDeadlineItemDesc preserves empty and whitespace-only input", () => {
    const t = (k: string) => k;
    expect(formatDeadlineItemDesc("", t)).toBe("");
    expect(formatDeadlineItemDesc("   ", t)).toBe("   ");
  });
});
