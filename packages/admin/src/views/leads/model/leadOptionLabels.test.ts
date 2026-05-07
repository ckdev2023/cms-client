import { afterEach, describe, expect, it } from "vitest";
import { i18n, setAppLocale, type AppLocale } from "../../../i18n";
import {
  resolveLeadBusinessTypeLabel,
  resolveLeadCreatedViaLabel,
  resolveLeadLanguageLabel,
  resolveLeadSourceLabel,
} from "./leadOptionLabels";

const originalLocale = i18n.global.locale.value as AppLocale;
const t = (key: string): string => i18n.global.t(key);

describe("leadOptionLabels", () => {
  afterEach(() => {
    setAppLocale(originalLocale);
  });

  describe("resolveLeadSourceLabel", () => {
    it("zh-CN 下识别已知枚举值", () => {
      setAppLocale("zh-CN");
      expect(resolveLeadSourceLabel("walkin", t)).toBe("来访");
      expect(resolveLeadSourceLabel("web", t)).toBe("网站表单");
      expect(resolveLeadSourceLabel("referral", t)).toBe("介绍");
      expect(resolveLeadSourceLabel("phone", t)).toBe("电话");
      expect(resolveLeadSourceLabel("other", t)).toBe("其他");
    });

    it("ja-JP 下切换到日文标签", () => {
      setAppLocale("ja-JP");
      expect(resolveLeadSourceLabel("walkin", t)).toBe("来所");
    });

    it("en-US 下切换到英文标签", () => {
      setAppLocale("en-US");
      expect(resolveLeadSourceLabel("walkin", t)).toBe("Walk-in");
    });

    it("空字符串返回空串", () => {
      setAppLocale("zh-CN");
      expect(resolveLeadSourceLabel("", t)).toBe("");
    });

    it("未识别的字面量原样返回（fixture 兼容）", () => {
      setAppLocale("zh-CN");
      expect(resolveLeadSourceLabel("介绍", t)).toBe("介绍");
      expect(resolveLeadSourceLabel("自定义来源", t)).toBe("自定义来源");
    });
  });

  describe("resolveLeadBusinessTypeLabel", () => {
    it("zh-CN 下识别 kebab-case 业务类型", () => {
      setAppLocale("zh-CN");
      expect(resolveLeadBusinessTypeLabel("highly-skilled", t)).toBe(
        "高度人才",
      );
      expect(resolveLeadBusinessTypeLabel("family-stay", t)).toBe("家族滞在");
      expect(resolveLeadBusinessTypeLabel("business-management-visa", t)).toBe(
        "经营管理",
      );
    });

    it("兼容旧值 business-manager → business-management-visa", () => {
      setAppLocale("zh-CN");
      expect(resolveLeadBusinessTypeLabel("business-manager", t)).toBe(
        "经营管理",
      );
    });

    it("未识别的字面量原样返回", () => {
      setAppLocale("zh-CN");
      expect(resolveLeadBusinessTypeLabel("家族滞在", t)).toBe("家族滞在");
    });

    it("空字符串返回空串", () => {
      setAppLocale("zh-CN");
      expect(resolveLeadBusinessTypeLabel("", t)).toBe("");
    });
  });

  describe("resolveLeadLanguageLabel", () => {
    it("zh-CN 下识别 ja/zh/en/vi", () => {
      setAppLocale("zh-CN");
      expect(resolveLeadLanguageLabel("ja", t)).toBe("日语");
      expect(resolveLeadLanguageLabel("zh", t)).toBe("中文");
      expect(resolveLeadLanguageLabel("en", t)).toBe("英语");
      expect(resolveLeadLanguageLabel("vi", t)).toBe("越南语");
    });

    it("未识别的字面量原样返回", () => {
      setAppLocale("zh-CN");
      expect(resolveLeadLanguageLabel("中文", t)).toBe("中文");
    });
  });

  describe("resolveLeadCreatedViaLabel", () => {
    it("zh-CN 下识别 admin/app_user/portal", () => {
      setAppLocale("zh-CN");
      expect(resolveLeadCreatedViaLabel("admin", t)).toBe("管理员后台");
      expect(resolveLeadCreatedViaLabel("app_user", t)).toBe("移动端");
      expect(resolveLeadCreatedViaLabel("portal", t)).toBe("客户门户");
    });

    it("ja-JP 下切换到日文", () => {
      setAppLocale("ja-JP");
      expect(resolveLeadCreatedViaLabel("admin", t)).toBe("管理画面");
    });

    it("en-US 下切换到英文", () => {
      setAppLocale("en-US");
      expect(resolveLeadCreatedViaLabel("admin", t)).toBe("Admin console");
    });

    it("未识别的值原样返回", () => {
      setAppLocale("zh-CN");
      expect(resolveLeadCreatedViaLabel("legacy_path", t)).toBe("legacy_path");
    });

    it("空字符串返回空串", () => {
      setAppLocale("zh-CN");
      expect(resolveLeadCreatedViaLabel("", t)).toBe("");
    });
  });
});
