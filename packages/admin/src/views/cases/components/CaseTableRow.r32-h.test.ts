import { describe, it, expect } from "vitest";
import zhCN from "../../../i18n/messages/cases/zh-CN";
import enUS from "../../../i18n/messages/cases/en-US";
import jaJP from "../../../i18n/messages/cases/ja-JP";

const BMV_KEYS = [
  "bmv",
  "biz_mgmt",
  "biz_mgmt_4m",
  "biz_mgmt_1y",
  "biz_mgmt_cert_4m",
  "biz_mgmt_cert_1y",
  "biz_mgmt_renewal",
  "business_manager_visa",
] as const;

describe("R32-H: BMV caseType label prefix unification", () => {
  describe("zh-CN: all BMV types start with 「经营管理签」", () => {
    const caseTypes = zhCN.constants.caseTypes;

    it.each(BMV_KEYS)("%s → starts with 经营管理签", (key) => {
      const label = caseTypes[key as keyof typeof caseTypes];
      expect(label).toBeDefined();
      expect(label).toMatch(/^经营管理签/);
    });
  });

  describe("en-US: all BMV sub-types use 「BMV · …」 separator", () => {
    const caseTypes = enUS.constants.caseTypes;
    const SUB_TYPE_KEYS = [
      "biz_mgmt_4m",
      "biz_mgmt_1y",
      "biz_mgmt_cert_4m",
      "biz_mgmt_cert_1y",
      "biz_mgmt_renewal",
    ] as const;

    it.each(SUB_TYPE_KEYS)("%s → uses BMV · separator", (key) => {
      const label = caseTypes[key as keyof typeof caseTypes];
      expect(label).toMatch(/^BMV · /);
    });
  });

  describe("ja-JP: all BMV sub-types start with 「経営管理ビザ · …」", () => {
    const caseTypes = jaJP.constants.caseTypes;
    const SUB_TYPE_KEYS = [
      "biz_mgmt_4m",
      "biz_mgmt_1y",
      "biz_mgmt_cert_4m",
      "biz_mgmt_cert_1y",
      "biz_mgmt_renewal",
    ] as const;

    it.each(SUB_TYPE_KEYS)("%s → starts with 経営管理ビザ ·", (key) => {
      const label = caseTypes[key as keyof typeof caseTypes];
      expect(label).toMatch(/^経営管理ビザ · /);
    });
  });

  describe("cross-locale: no parenthesized BMV sub-type labels remain", () => {
    it("zh-CN BMV keys contain no parenthesized pattern", () => {
      const caseTypes = zhCN.constants.caseTypes;
      for (const key of BMV_KEYS) {
        const label = caseTypes[key as keyof typeof caseTypes];
        expect(label).not.toMatch(/[（(]/);
      }
    });

    it("en-US BMV keys contain no parenthesized pattern", () => {
      const caseTypes = enUS.constants.caseTypes;
      for (const key of BMV_KEYS) {
        const label = caseTypes[key as keyof typeof caseTypes];
        expect(label).not.toMatch(/[（(]/);
      }
    });

    it("ja-JP BMV keys contain no parenthesized pattern", () => {
      const caseTypes = jaJP.constants.caseTypes;
      for (const key of BMV_KEYS) {
        const label = caseTypes[key as keyof typeof caseTypes];
        expect(label).not.toMatch(/[（(]/);
      }
    });
  });
});
