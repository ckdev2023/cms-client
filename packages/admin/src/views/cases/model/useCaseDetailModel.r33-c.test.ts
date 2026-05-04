import { describe, expect, it } from "vitest";
import casesZhCN from "../../../i18n/messages/cases/zh-CN";
import casesEnUS from "../../../i18n/messages/cases/en-US";
import casesJaJP from "../../../i18n/messages/cases/ja-JP";

function interpolate(
  template: string,
  params: Record<string, unknown>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? ""));
}

const LOCALES = [
  { name: "zh-CN", messages: casesZhCN },
  { name: "en-US", messages: casesEnUS },
  { name: "ja-JP", messages: casesJaJP },
] as const;

const COUNTER_KEYS = ["blocking", "pending"] as const;

describe("R33-C — tab counter badge spacing across locales", () => {
  it.each(LOCALES.map((l) => [l.name, l] as const))(
    "%s: blocking/pending counters have a space before the number",
    (_, locale) => {
      for (const key of COUNTER_KEYS) {
        const template = locale.messages.constants.tabCounters[key];
        const rendered = interpolate(template, { count: 3 });
        expect(rendered).toMatch(/\s\d+$/);
      }
    },
  );

  it.each(LOCALES.map((l) => [l.name, l] as const))(
    "%s: blocking counter with count=2 renders space before number",
    (_, locale) => {
      const rendered = interpolate(
        locale.messages.constants.tabCounters.blocking,
        { count: 2 },
      );
      expect(rendered).toMatch(/\s2$/);
      expect(rendered).not.toMatch(/[^\s]2$/);
    },
  );

  it.each(LOCALES.map((l) => [l.name, l] as const))(
    "%s: pending counter with count=1 renders space before number",
    (_, locale) => {
      const rendered = interpolate(
        locale.messages.constants.tabCounters.pending,
        { count: 1 },
      );
      expect(rendered).toMatch(/\s1$/);
      expect(rendered).not.toMatch(/[^\s]1$/);
    },
  );

  it("{count} placeholder present in all locale counter templates", () => {
    for (const locale of LOCALES) {
      for (const key of COUNTER_KEYS) {
        expect(locale.messages.constants.tabCounters[key]).toContain(
          " {count}",
        );
      }
    }
  });
});
