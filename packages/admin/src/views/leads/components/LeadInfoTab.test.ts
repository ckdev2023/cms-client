import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n, setAppLocale, type AppLocale } from "../../../i18n";
import {
  clearUserAliases,
  registerUserAliases,
} from "../../../shared/model/useOrgUserOptions";
import type { LeadBasicInfo } from "../types";
import LeadInfoTab from "./LeadInfoTab.vue";

const originalLocale = i18n.global.locale.value as AppLocale;

const UUID_LOCAL_ADMIN = "00000000-0000-4000-8000-000000000011";
const UUID_UNKNOWN = "ef21fdd2-1ffc-4a27-8b47-a640d6bd021c";

function makeInfo(overrides: Partial<LeadBasicInfo> = {}): LeadBasicInfo {
  return {
    id: "LEAD-001",
    leadNo: "",
    name: "李华",
    phone: "080-1234-5678",
    email: "li@example.com",
    source: "介绍",
    createdVia: "",
    referrer: "",
    businessType: "家族滞在",
    group: "tokyo-1",
    owner: "",
    language: "中文",
    tags: [],
    note: "",
    ...overrides,
  };
}

describe("LeadInfoTab", () => {
  afterEach(() => {
    setAppLocale(originalLocale);
    clearUserAliases();
  });

  describe("H-9 owner UUID 详情基础信息渲染", () => {
    it("info.owner 已是合法标签 → 直接展示（catalog/字面量路径 BC）", () => {
      setAppLocale("zh-CN");
      const wrapper = mount(LeadInfoTab, {
        props: { info: makeInfo({ owner: "田中" }), readonly: false },
        global: { plugins: [i18n] },
      });
      expect(wrapper.text()).toContain("田中");
    });

    it("info.owner 为 raw UUID（adapter 回落）+ alias 已注册 → 渲染为 displayName，不裸出 UUID", () => {
      setAppLocale("zh-CN");
      registerUserAliases([
        { id: UUID_LOCAL_ADMIN, displayName: "Local Admin" },
      ]);
      const wrapper = mount(LeadInfoTab, {
        props: {
          info: makeInfo({ owner: UUID_LOCAL_ADMIN }),
          ownerId: UUID_LOCAL_ADMIN,
          readonly: false,
        },
        global: { plugins: [i18n] },
      });
      const text = wrapper.text();
      expect(text).toContain("Local Admin");
      expect(text).not.toContain(UUID_LOCAL_ADMIN);
    });

    it("info.owner 为空 + ownerId 为真实 UUID + alias 已注册 → 通过 ownerId 反解", () => {
      setAppLocale("zh-CN");
      registerUserAliases([
        { id: UUID_LOCAL_ADMIN, displayName: "Local Admin" },
      ]);
      const wrapper = mount(LeadInfoTab, {
        props: {
          info: makeInfo({ owner: "" }),
          ownerId: UUID_LOCAL_ADMIN,
          readonly: false,
        },
        global: { plugins: [i18n] },
      });
      expect(wrapper.text()).toContain("Local Admin");
    });

    it("info.owner 为 raw UUID + alias 未注册 → 显示『未知用户』而非 UUID", () => {
      setAppLocale("zh-CN");
      const wrapper = mount(LeadInfoTab, {
        props: {
          info: makeInfo({ owner: UUID_UNKNOWN }),
          ownerId: UUID_UNKNOWN,
          readonly: false,
        },
        global: { plugins: [i18n] },
      });
      const text = wrapper.text();
      expect(text).toContain("未知用户");
      expect(text).not.toContain(UUID_UNKNOWN);
    });

    it("info.owner 与 ownerId 都为空 → 显示『未分配』", () => {
      setAppLocale("zh-CN");
      const wrapper = mount(LeadInfoTab, {
        props: {
          info: makeInfo({ owner: "" }),
          ownerId: "",
          readonly: false,
        },
        global: { plugins: [i18n] },
      });
      expect(wrapper.text()).toContain("未分配");
    });

    it("ja-JP locale 下 unknown UUID → 显示『不明なユーザー』", () => {
      setAppLocale("ja-JP");
      const wrapper = mount(LeadInfoTab, {
        props: {
          info: makeInfo({ owner: UUID_UNKNOWN }),
          ownerId: UUID_UNKNOWN,
          readonly: false,
        },
        global: { plugins: [i18n] },
      });
      expect(wrapper.text()).toContain("不明なユーザー");
    });
  });

  describe("R4-A-2 leadNo display", () => {
    it("renders leadNo instead of UUID when leadNo is present", () => {
      setAppLocale("zh-CN");
      const wrapper = mount(LeadInfoTab, {
        props: {
          info: makeInfo({
            id: "720dc94b-df0f-4fb5-be18-a514a6cab776",
            leadNo: "LEAD-202605-0002",
          }),
          readonly: false,
        },
        global: { plugins: [i18n] },
      });
      const mono = wrapper.find(".info-tab__value--mono");
      expect(mono.text()).toContain("LEAD-202605-0002");
      expect(mono.text()).not.toContain("720dc94b");
      expect(mono.attributes("title")).toBe(
        "720dc94b-df0f-4fb5-be18-a514a6cab776",
      );
    });

    it("falls back to id when leadNo is empty", () => {
      setAppLocale("zh-CN");
      const wrapper = mount(LeadInfoTab, {
        props: {
          info: makeInfo({ id: "LEAD-001", leadNo: "" }),
          readonly: false,
        },
        global: { plugins: [i18n] },
      });
      const mono = wrapper.find(".info-tab__value--mono");
      expect(mono.text()).toContain("LEAD-001");
      expect(mono.attributes("title")).toBe("LEAD-001");
    });
  });

  describe("R5-A-3 tags chip rendering", () => {
    it("renders 6 tag chips when info.tags has 6 entries", () => {
      setAppLocale("zh-CN");
      const tags = ["vip", "优先", "已签约", "家族滞在", "介绍案件", "新規"];
      const wrapper = mount(LeadInfoTab, {
        props: { info: makeInfo({ tags }), readonly: false },
        global: { plugins: [i18n] },
      });
      const container = wrapper.find("[data-testid='lead-info-tags']");
      expect(container.exists()).toBe(true);
      const chips = container.findAll(".ui-chip");
      expect(chips.length).toBe(6);
      for (const tag of tags) {
        expect(container.text()).toContain(tag);
      }
    });

    it("renders dash when tags is empty", () => {
      setAppLocale("zh-CN");
      const wrapper = mount(LeadInfoTab, {
        props: { info: makeInfo({ tags: [] }), readonly: false },
        global: { plugins: [i18n] },
      });
      const container = wrapper.find("[data-testid='lead-info-tags']");
      expect(container.exists()).toBe(true);
      expect(container.text()).toBe("—");
      expect(container.findAll(".ui-chip").length).toBe(0);
    });
  });

  describe("R3-D-2 createdVia rendering", () => {
    it("renders createdVia with localized label when present (R4-A-3)", () => {
      setAppLocale("zh-CN");
      const wrapper = mount(LeadInfoTab, {
        props: {
          info: makeInfo({ source: "web", createdVia: "admin" }),
          readonly: false,
        },
        global: { plugins: [i18n] },
      });
      const via = wrapper.find("[data-testid='lead-info-created-via']");
      expect(via.exists()).toBe(true);
      expect(via.text()).toContain("创建路径：管理员后台");
      expect(via.attributes("title")).toBe("admin");
    });

    it("hides createdVia element when empty", () => {
      setAppLocale("zh-CN");
      const wrapper = mount(LeadInfoTab, {
        props: {
          info: makeInfo({ source: "web", createdVia: "" }),
          readonly: false,
        },
        global: { plugins: [i18n] },
      });
      expect(
        wrapper.find("[data-testid='lead-info-created-via']").exists(),
      ).toBe(false);
    });

    it("hides createdVia when it equals source (R4-A-3)", () => {
      setAppLocale("zh-CN");
      const wrapper = mount(LeadInfoTab, {
        props: {
          info: makeInfo({ source: "web", createdVia: "web" }),
          readonly: false,
        },
        global: { plugins: [i18n] },
      });
      expect(
        wrapper.find("[data-testid='lead-info-created-via']").exists(),
      ).toBe(false);
    });
  });

  describe("R4-B-1 enum value localization", () => {
    function findFieldValueText(
      wrapper: ReturnType<typeof mount>,
      labelText: string,
    ): string {
      const fields = wrapper.findAll(".info-tab__field");
      for (const field of fields) {
        const label = field.find(".info-tab__label");
        if (label.exists() && label.text() === labelText) {
          return field.find(".info-tab__value").text();
        }
      }
      return "";
    }

    it("zh-CN: source 枚举值 walkin 渲染为「来访」，不裸出英文 code", () => {
      setAppLocale("zh-CN");
      const wrapper = mount(LeadInfoTab, {
        props: {
          info: makeInfo({ source: "walkin", createdVia: "admin" }),
          readonly: false,
        },
        global: { plugins: [i18n] },
      });
      const sourceText = findFieldValueText(wrapper, "来源");
      expect(sourceText).toContain("来访");
      expect(sourceText).not.toMatch(/(^|\s)walkin(\s|$|（)/);
    });

    it("zh-CN: businessType 枚举值 highly-skilled 渲染为「高度人才」", () => {
      setAppLocale("zh-CN");
      const wrapper = mount(LeadInfoTab, {
        props: {
          info: makeInfo({ businessType: "highly-skilled" }),
          readonly: false,
        },
        global: { plugins: [i18n] },
      });
      const text = findFieldValueText(wrapper, "意向业务类型");
      expect(text).toBe("高度人才");
    });

    it("zh-CN: language 枚举值 zh 渲染为「中文」", () => {
      setAppLocale("zh-CN");
      const wrapper = mount(LeadInfoTab, {
        props: {
          info: makeInfo({ language: "zh" }),
          readonly: false,
        },
        global: { plugins: [i18n] },
      });
      expect(findFieldValueText(wrapper, "首选语言")).toBe("中文");
    });

    it("zh-CN: createdVia 枚举值 admin 渲染为「管理员后台」", () => {
      setAppLocale("zh-CN");
      const wrapper = mount(LeadInfoTab, {
        props: {
          info: makeInfo({ source: "web", createdVia: "admin" }),
          readonly: false,
        },
        global: { plugins: [i18n] },
      });
      const via = wrapper.find("[data-testid='lead-info-created-via']");
      expect(via.text()).toContain("管理员后台");
      expect(via.text()).not.toContain("：admin");
    });

    it("ja-JP: 枚举值同步切换到日文", () => {
      setAppLocale("ja-JP");
      const wrapper = mount(LeadInfoTab, {
        props: {
          info: makeInfo({
            source: "walkin",
            businessType: "highly-skilled",
            language: "zh",
            createdVia: "admin",
          }),
          readonly: false,
        },
        global: { plugins: [i18n] },
      });
      expect(wrapper.text()).toContain("来所");
      expect(wrapper.text()).toContain("高度専門職");
      expect(wrapper.text()).toContain("中国語");
      expect(wrapper.text()).toContain("管理画面");
    });

    it("en-US: 枚举值同步切换到英文", () => {
      setAppLocale("en-US");
      const wrapper = mount(LeadInfoTab, {
        props: {
          info: makeInfo({
            source: "walkin",
            businessType: "highly-skilled",
            language: "zh",
            createdVia: "admin",
          }),
          readonly: false,
        },
        global: { plugins: [i18n] },
      });
      expect(wrapper.text()).toContain("Walk-in");
      expect(wrapper.text()).toContain("Highly Skilled Professional");
      expect(wrapper.text()).toContain("Chinese");
      expect(wrapper.text()).toContain("Admin console");
    });

    it("未识别的 source/businessType 字面量保留原值（fixture 兼容）", () => {
      setAppLocale("zh-CN");
      const wrapper = mount(LeadInfoTab, {
        props: {
          info: makeInfo({
            source: "介绍",
            businessType: "家族滞在",
            language: "中文",
          }),
          readonly: false,
        },
        global: { plugins: [i18n] },
      });
      expect(wrapper.text()).toContain("介绍");
      expect(wrapper.text()).toContain("家族滞在");
      expect(wrapper.text()).toContain("中文");
    });
  });
});
