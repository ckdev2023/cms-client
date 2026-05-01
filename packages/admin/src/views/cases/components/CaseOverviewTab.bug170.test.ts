// ── Test Ownership ──────────────────────────────────────────────
// Owner: BUG-170 — CaseOverviewTab 概览客户回链区的 group 名称必须经
//   `resolveGroupLabel` 解析为本地化标签，禁止直接透传后端 slug（如 `tokyo-1`）。
// Locks: 复刻视图侧 `resolvedGroupName = resolveGroupLabel(detail.groupName, undefined, locale)`
//   合约，覆盖 catalog 已知 slug / UUID / null 三种场景 × zh-CN / en-US / ja-JP。
// Does NOT test: 真实 mount `CaseOverviewTab.vue`；`CaseCustomerBackLink.vue` 本身渲染逻辑。
// Rationale: R14 走查发现 group 栏显示原始 slug `tokyo-1` 而非 `Tokyo Team 1`（EN）
//   / `東京一組`（JA）/ `东京一组`（ZH），原因是模板直传 `detail.groupName`
//   未经 `resolveGroupLabel` 解析。
// ────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { resolveGroupLabel } from "../../../shared/model/groupOptions";

type Locale = "zh-CN" | "ja-JP" | "en-US";

function resolveForLocale(
  groupName: string | undefined | null,
  locale: Locale,
): string | undefined {
  if (!groupName) return undefined;
  return resolveGroupLabel(groupName, undefined, locale);
}

describe("CaseOverviewTab BUG-170 — group name 走 resolveGroupLabel", () => {
  describe("catalog 已知 slug 按 locale 解析为本地化标签", () => {
    const EXPECTED: Record<Locale, Record<string, string>> = {
      "zh-CN": {
        "tokyo-1": "东京一组",
        "tokyo-2": "东京二组",
        osaka: "大阪组（已停用）",
      },
      "en-US": {
        "tokyo-1": "Tokyo Team 1",
        "tokyo-2": "Tokyo Team 2",
        osaka: "Osaka Team（已停用）",
      },
      "ja-JP": {
        "tokyo-1": "東京一組",
        "tokyo-2": "東京二組",
        osaka: "大阪組（已停用）",
      },
    };

    for (const locale of ["zh-CN", "en-US", "ja-JP"] as const) {
      for (const [slug, expected] of Object.entries(EXPECTED[locale])) {
        it(`${locale} × "${slug}" → "${expected}"`, () => {
          expect(resolveForLocale(slug, locale)).toBe(expected);
        });
      }
    }
  });

  describe("slug 不得直接透传为 group 显示名", () => {
    for (const locale of ["zh-CN", "en-US", "ja-JP"] as const) {
      it(`${locale}: "tokyo-1" 解析结果 ≠ "tokyo-1"`, () => {
        expect(resolveForLocale("tokyo-1", locale)).not.toBe("tokyo-1");
      });
    }
  });

  describe("null / undefined groupName → undefined（不渲染 group chip）", () => {
    it("null → undefined", () => {
      expect(resolveForLocale(null, "en-US")).toBeUndefined();
    });
    it("undefined → undefined", () => {
      expect(resolveForLocale(undefined, "ja-JP")).toBeUndefined();
    });
  });

  describe("未知 UUID 输入 → 返回占位符 '—'", () => {
    const uuid = "e00ea5d2-210a-4f65-a205-5d4e0da4cc7d";
    for (const locale of ["zh-CN", "en-US", "ja-JP"] as const) {
      it(`${locale}: UUID → "—"`, () => {
        expect(resolveForLocale(uuid, locale)).toBe("—");
      });
    }
  });

  describe("未知非 UUID 值原样返回（graceful fallback）", () => {
    it("arbitrary string passes through", () => {
      expect(resolveForLocale("unknown-team", "en-US")).toBe("unknown-team");
    });
  });
});
