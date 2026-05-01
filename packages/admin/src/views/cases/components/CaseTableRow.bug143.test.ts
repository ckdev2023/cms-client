import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseTableRow from "./CaseTableRow.vue";
import type { CaseListItem } from "../types";

/**
 * BUG-143 回归测试：
 * 案件列表「类型」列应基于 `cases.constants.caseTypes.<code>` i18n 解析，
 * 不应在三语下直显 server enum identifier（`biz_mgmt_4m` / `biz_mgmt` / `family` 等）。
 *
 * 覆盖 9 种 server `case_type_code` × 3 个 locale = 27 条断言。
 */

const TYPE_LABELS = {
  "zh-CN": {
    biz_mgmt: "经营管理签",
    biz_mgmt_4m: "经营管理（认定4个月）",
    biz_mgmt_1y: "经营管理（认定1年）",
    biz_mgmt_renewal: "经营管理（更新）",
    company_setup: "公司设立",
    hum: "技人国（认定）",
    hum_renewal: "技人国（更新）",
    family: "家族滞在",
    intra_company: "企業内转勤",
    business_manager_visa: "经营管理签",
    dependent_visa: "家族滞在",
    engineer_visa: "技人国（认定）",
    engineer_humanities_intl_visa: "技人国（认定）",
  },
  "en-US": {
    biz_mgmt: "Business Manager Visa",
    biz_mgmt_4m: "BMV (CoE 4-month)",
    biz_mgmt_1y: "BMV (CoE 1-year)",
    biz_mgmt_renewal: "BMV (Renewal)",
    company_setup: "Company Establishment",
    hum: "Engineer/Specialist (CoE)",
    hum_renewal: "Engineer/Specialist (Renewal)",
    family: "Dependent Visa",
    intra_company: "Intra-Company Transfer",
    business_manager_visa: "Business Manager Visa",
    dependent_visa: "Dependent Visa",
    engineer_visa: "Engineer/Specialist (CoE)",
    engineer_humanities_intl_visa: "Engineer/Specialist (CoE)",
  },
  "ja-JP": {
    biz_mgmt: "経営管理ビザ",
    biz_mgmt_4m: "経営管理（認定4ヶ月）",
    biz_mgmt_1y: "経営管理（認定1年）",
    biz_mgmt_renewal: "経営管理（更新）",
    company_setup: "会社設立",
    hum: "技人国（認定）",
    hum_renewal: "技人国（更新）",
    family: "家族滞在",
    intra_company: "企業内転勤",
    business_manager_visa: "経営管理ビザ",
    dependent_visa: "家族滞在",
    engineer_visa: "技人国（認定）",
    engineer_humanities_intl_visa: "技人国（認定）",
  },
} as const;

type Locale = keyof typeof TYPE_LABELS;
type TypeCode = keyof (typeof TYPE_LABELS)["zh-CN"];

const LOCALES: Locale[] = ["zh-CN", "en-US", "ja-JP"];
const TYPE_CODES = Object.keys(TYPE_LABELS["zh-CN"]) as TypeCode[];

const BASE_MESSAGES = {
  cases: {
    list: {
      ownerUnassigned: "—",
      riskLabels: { normal: "", attention: "", critical: "" },
      actions: { viewDetail: "" },
    },
    constants: {
      stages: { S2: "S2" },
      phases: { WAITING_MATERIAL: "WAITING_MATERIAL" },
      bmvSteps: {},
    },
  },
};

function makeMessages(locale: Locale) {
  return {
    [locale]: {
      ...BASE_MESSAGES,
      cases: {
        ...BASE_MESSAGES.cases,
        constants: {
          ...BASE_MESSAGES.cases.constants,
          caseTypes: TYPE_LABELS[locale],
        },
      },
    },
  };
}

function makeI18n(locale: Locale) {
  return createI18n({
    legacy: false,
    locale,
    fallbackLocale: locale,
    messages: makeMessages(locale),
  });
}

function baseItem(type: string): CaseListItem {
  return {
    id: "uuid-bug143",
    name: "Case BUG-143",
    type,
    applicant: "Tanaka",
    groupId: "tokyo-1",
    groupLabel: "東京一組",
    stageId: "S2",
    stageLabel: "S2",
    ownerId: "suzuki",
    completionPercent: 0,
    completionLabel: "",
    validationStatus: "pending",
    validationLabel: "",
    blockerCount: 0,
    unpaidAmount: 0,
    updatedAtLabel: "",
    dueDate: "",
    dueDateLabel: "",
    riskStatus: "normal",
    riskLabel: "",
    visibleScopes: ["all"],
    businessPhase: "WAITING_MATERIAL",
  };
}

function mountRow(type: string, locale: Locale) {
  return mount(CaseTableRow, {
    props: { item: baseItem(type) },
    global: {
      plugins: [makeI18n(locale)],
      stubs: { Chip: { template: "<span><slot /></span>", props: ["tone"] } },
    },
  });
}

describe("CaseTableRow — BUG-143 type column i18n", () => {
  for (const locale of LOCALES) {
    for (const code of TYPE_CODES) {
      const expected = TYPE_LABELS[locale][code];
      it(`renders ${code} as "${expected}" in ${locale}`, () => {
        const w = mountRow(code, locale);
        const cell = w.findAll("td")[3];
        expect(cell.text()).toBe(expected);
        expect(cell.text()).not.toBe(code);
      });
    }
  }

  it("falls back to raw code when key missing in catalog", () => {
    const w = mountRow("unknown_legacy_code", "zh-CN");
    const cell = w.findAll("td")[3];
    expect(cell.text()).toBe("unknown_legacy_code");
  });

  it("renders em-dash placeholder when type is empty", () => {
    const w = mountRow("", "zh-CN");
    const cell = w.findAll("td")[3];
    expect(cell.text()).toBe("—");
  });

  describe("BUG-172 en-US Title Case consistency", () => {
    const TITLE_CASE_RE =
      /^[A-Z][a-z]+(-[A-Z][a-z]+)*(\s[A-Z][a-z]+(-[A-Z][a-z]+)*)*(\s\(.+\))?$/;
    const ABBREVIATED_CODES = new Set([
      "biz_mgmt_4m",
      "biz_mgmt_1y",
      "biz_mgmt_cert_4m",
      "biz_mgmt_cert_1y",
      "biz_mgmt_renewal",
      "hum",
      "hum_renewal",
      "eng_humanities_intl_cert",
      "eng_humanities_intl_renewal",
      "engineer_visa",
      "engineer_humanities_intl_visa",
    ]);

    const enLabels = TYPE_LABELS["en-US"];
    for (const [code, label] of Object.entries(enLabels)) {
      if (ABBREVIATED_CODES.has(code)) continue;
      it(`en-US "${code}" label "${label}" follows Title Case`, () => {
        expect(label).toMatch(TITLE_CASE_RE);
      });
    }
  });
});
