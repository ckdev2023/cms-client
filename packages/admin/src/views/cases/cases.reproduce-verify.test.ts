/**
 * T-18-reproduce-verify — 前端常量 / 模板 / phase 可视回归验证。
 *
 * 验证修复后：
 *   (5a) SAMPLE_CREATE_TEMPLATES 至少 7 个模板（7 场景）
 *   (5b) 每个模板的 checklist 项数 ≥ 8
 *   (5c) BUSINESS_PHASES 前端与后端一致（20 个）
 *   (5d) 每个模板 section title / item label 包含 zh + en + ja
 */
import { describe, test, expect } from "vitest";
import { SAMPLE_CREATE_TEMPLATES } from "./fixtures-create";
import {
  BUSINESS_PHASES,
  getPhaseLabel,
  getPhaseI18nKey,
} from "./constantsBusinessPhase";

describe("(5a) BUG-065 fix: templates cover ≥ 7 scenarios", () => {
  test("SAMPLE_CREATE_TEMPLATES has at least 7 templates", () => {
    expect(SAMPLE_CREATE_TEMPLATES.length).toBeGreaterThanOrEqual(7);
  });

  const expectedIds = [
    "family",
    "work",
    "bmv",
    "biz_mgmt_cert_4m",
    "biz_mgmt_cert_1y",
    "biz_mgmt_renewal",
    "company_setup",
    "eng_humanities_intl_cert",
    "eng_humanities_intl_renewal",
    "intra_company_transfer",
  ];
  test.each(expectedIds)("template '%s' exists", (id) => {
    const found = SAMPLE_CREATE_TEMPLATES.find((t) => t.id === id);
    expect(found).toBeTruthy();
  });
});

describe("(5b) BUG-066 fix: scenario templates have ≥ 8 checklist items", () => {
  const scenarioTemplates = SAMPLE_CREATE_TEMPLATES.filter(
    (t) => t.id !== "bmv",
  );

  for (const tmpl of scenarioTemplates) {
    test(`template "${tmpl.id}" has ≥ 8 items across sections`, () => {
      const itemCount = tmpl.sections.reduce(
        (sum, sec) => sum + sec.items.length,
        0,
      );
      expect(itemCount).toBeGreaterThanOrEqual(8);
    });
  }

  test('parent "bmv" template exists as overview entry point', () => {
    const bmv = SAMPLE_CREATE_TEMPLATES.find((t) => t.id === "bmv");
    expect(bmv).toBeTruthy();
    expect(bmv!.sections.length).toBeGreaterThanOrEqual(1);
  });
});

describe("(5c) BUSINESS_PHASES frontend constants", () => {
  test("exactly 20 phases", () => {
    expect(BUSINESS_PHASES.length).toBe(20);
  });

  test("no duplicates", () => {
    const unique = new Set(BUSINESS_PHASES);
    expect(unique.size).toBe(BUSINESS_PHASES.length);
  });

  const requiredPhases = [
    "CONSULTING",
    "CONTRACTED",
    "WAITING_MATERIAL",
    "MATERIAL_PREPARING",
    "REVIEWING",
    "APPLYING",
    "UNDER_REVIEW",
    "NEED_SUPPLEMENT",
    "SUPPLEMENT_PROCESSING",
    "APPROVED",
    "REJECTED",
    "WAITING_PAYMENT",
    "COE_SENT",
    "VISA_APPLYING",
    "SUCCESS",
    "VISA_REJECTED",
    "RESIDENCE_PERIOD_RECORDED",
    "RENEWAL_REMINDER_SCHEDULED",
    "CLOSED_SUCCESS",
    "CLOSED_FAILED",
  ] as const;

  test.each(requiredPhases)("phase '%s' exists", (phase) => {
    expect(BUSINESS_PHASES).toContain(phase);
  });

  test("getPhaseLabel returns non-empty for all phases", () => {
    for (const phase of BUSINESS_PHASES) {
      const label = getPhaseLabel(phase);
      expect(label).toBeTruthy();
      expect(label).not.toBe(phase);
    }
  });

  test("getPhaseI18nKey returns non-empty for all phases", () => {
    for (const phase of BUSINESS_PHASES) {
      const key = getPhaseI18nKey(phase);
      expect(key).toBeTruthy();
      expect(key).toContain("cases.constants.phases.");
    }
  });
});

describe("(5d) template i18n completeness", () => {
  for (const tmpl of SAMPLE_CREATE_TEMPLATES) {
    test(`template "${tmpl.id}" label has zh, en, ja`, () => {
      expect(tmpl.label.zh).toBeTruthy();
      expect(tmpl.label.en).toBeTruthy();
      expect(tmpl.label.ja).toBeTruthy();
    });

    test(`template "${tmpl.id}" section titles have zh, en, ja`, () => {
      for (const section of tmpl.sections) {
        expect(section.title.zh).toBeTruthy();
        expect(section.title.en).toBeTruthy();
        expect(section.title.ja).toBeTruthy();
      }
    });

    test(`template "${tmpl.id}" item labels have zh, en, ja`, () => {
      for (const section of tmpl.sections) {
        for (const item of section.items) {
          expect(item.label.zh).toBeTruthy();
          expect(item.label.en).toBeTruthy();
          expect(item.label.ja).toBeTruthy();
        }
      }
    });
  }
});
