import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n, setAppLocale, type AppLocale } from "../../../i18n";
import { getLeadSamples } from "../fixtures";
import {
  clearUserAliases,
  registerUserAliases,
} from "../../../shared/model/useOrgUserOptions";
import {
  clearGroupAliases,
  registerGroupAliases,
} from "../../../shared/model/useGroupOptions";
import type { LeadSummary } from "../types";
import LeadTableRow from "./LeadTableRow.vue";

const originalLocale = i18n.global.locale.value as AppLocale;

const UUID_LOCAL_ADMIN = "00000000-0000-4000-8000-000000000011";
const UUID_UNKNOWN = "ef21fdd2-1ffc-4a27-8b47-a640d6bd021c";
const NIL_UUID = "00000000-0000-0000-0000-000000000000";

function makeLead(overrides: Partial<LeadSummary>): LeadSummary {
  return {
    ...getLeadSamples("zh-CN")[0]!,
    ...overrides,
  };
}

describe("LeadTableRow", () => {
  afterEach(() => {
    setAppLocale(originalLocale);
    clearUserAliases();
    clearGroupAliases();
  });

  it("renders localized fallback follow-up note and relative time in ja-JP", () => {
    setAppLocale("ja-JP");

    const wrapper = mount(LeadTableRow, {
      props: {
        lead: getLeadSamples("ja-JP")[0],
      },
      global: {
        plugins: [i18n],
      },
    });

    expect(wrapper.text()).toContain("電話で意向と在留資格を確認");
    expect(wrapper.text()).toContain("今日 15:30");
    expect(wrapper.text()).toContain("鈴木");
    expect(wrapper.text()).not.toContain("电话确认意向与签证类别");
    expect(wrapper.text()).not.toContain("今天 15:30");
    expect(wrapper.text()).not.toContain("铃木");
  });

  it("lead.ownerLabel='Local Admin' renders directly without alias registration", () => {
    setAppLocale("zh-CN");
    const wrapper = mount(LeadTableRow, {
      props: {
        lead: makeLead({ ownerLabel: "Local Admin", ownerId: UUID_UNKNOWN }),
      },
      global: { plugins: [i18n] },
    });
    expect(wrapper.text()).toContain("Local Admin");
    expect(wrapper.text()).toContain("LA");
    expect(wrapper.text()).not.toContain("未知用户");
  });

  it("same tag in two rows produces the same chip tone class", () => {
    setAppLocale("zh-CN");
    const tag = "VIP";
    const wrapper1 = mount(LeadTableRow, {
      props: {
        lead: makeLead({ id: "ROW-1", tags: [tag] }),
      },
      global: { plugins: [i18n] },
    });
    const wrapper2 = mount(LeadTableRow, {
      props: {
        lead: makeLead({ id: "ROW-2", tags: [tag] }),
      },
      global: { plugins: [i18n] },
    });
    const chips1 = wrapper1.findAllComponents({ name: "Chip" });
    const chips2 = wrapper2.findAllComponents({ name: "Chip" });
    const tagChip1 = chips1.find((c) => c.text() === tag);
    const tagChip2 = chips2.find((c) => c.text() === tag);
    expect(tagChip1).toBeTruthy();
    expect(tagChip2).toBeTruthy();
    expect(tagChip1!.props("tone")).toBe(tagChip2!.props("tone"));
  });

  describe("R2-B-2 行下方编号优先展示 leadNo（缺失回退 id）", () => {
    it("lead.leadNo 存在时显示 leadNo 而非 UUID", () => {
      setAppLocale("zh-CN");
      const wrapper = mount(LeadTableRow, {
        props: {
          lead: makeLead({
            id: "a82d2e67-e7dc-44f6-a297-0a2cfd0922f6",
            leadNo: "LEAD-202605-0002",
          }),
        },
        global: { plugins: [i18n] },
      });
      const meta = wrapper.find(".lead-row__meta");
      expect(meta.text()).toBe("LEAD-202605-0002");
      expect(meta.attributes("title")).toBe(
        "a82d2e67-e7dc-44f6-a297-0a2cfd0922f6",
      );
      expect(wrapper.text()).not.toContain(
        "a82d2e67-e7dc-44f6-a297-0a2cfd0922f6",
      );
    });

    it("lead.leadNo 为 null 时回退展示 lead.id（兼容 fixture / legacy）", () => {
      setAppLocale("zh-CN");
      const wrapper = mount(LeadTableRow, {
        props: {
          lead: makeLead({ id: "LEAD-2026-0099", leadNo: null }),
        },
        global: { plugins: [i18n] },
      });
      expect(wrapper.find(".lead-row__meta").text()).toBe("LEAD-2026-0099");
    });

    it("lead.leadNo 为空字符串时也回退展示 lead.id", () => {
      setAppLocale("zh-CN");
      const wrapper = mount(LeadTableRow, {
        props: {
          lead: makeLead({ id: "LEAD-2026-0100", leadNo: "" }),
        },
        global: { plugins: [i18n] },
      });
      expect(wrapper.find(".lead-row__meta").text()).toBe("LEAD-2026-0100");
    });
  });

  describe("R4-A-1 标签视觉契约（variant=tag + 截断 + tooltip）", () => {
    it("用户自定义标签使用 variant=tag 走中性外观，避免与 status 撞色", () => {
      setAppLocale("zh-CN");
      const wrapper = mount(LeadTableRow, {
        props: {
          lead: makeLead({ id: "ROW-V", tags: ["R4-walk", "R4-tag-2"] }),
        },
        global: { plugins: [i18n] },
      });
      const tagChips = wrapper
        .findAllComponents({ name: "Chip" })
        .filter((c) => /^R4-/.test(c.text()));
      expect(tagChips.length).toBe(2);
      for (const chip of tagChips) {
        expect(chip.props("variant")).toBe("tag");
        expect(chip.props("size")).toBe("micro");
      }
    });

    it("非 neutral tone 的标签会渲染色点，neutral 不渲染", () => {
      setAppLocale("zh-CN");
      const wrapper = mount(LeadTableRow, {
        props: {
          lead: makeLead({ id: "ROW-D", tags: ["VIP", "已签约"] }),
        },
        global: { plugins: [i18n] },
      });
      const tagChips = wrapper
        .findAllComponents({ name: "Chip" })
        .filter((c) => c.text() === "VIP" || c.text() === "已签约");
      for (const chip of tagChips) {
        expect(chip.props("dot")).toBe(true);
      }
    });

    it("超过 3 条时折叠为 +N，role=button + tabindex=0", () => {
      setAppLocale("zh-CN");
      const wrapper = mount(LeadTableRow, {
        props: {
          lead: makeLead({
            id: "ROW-O",
            tags: ["t-1", "t-2", "t-3", "t-4", "t-5"],
          }),
        },
        global: { plugins: [i18n] },
        attachTo: document.body,
      });
      const more = wrapper.find(".lead-row__tags-more");
      expect(more.exists()).toBe(true);
      expect(more.text()).toContain("+2");
      expect(more.attributes("role")).toBe("button");
      expect(more.attributes("tabindex")).toBe("0");
      wrapper.unmount();
    });

    it("aria-label 使用 tagsRest i18n key（zh-CN / en-US / ja-JP）", () => {
      const localeExpected: [AppLocale, string][] = [
        ["zh-CN", "其余 2 个标签"],
        ["en-US", "+2 more tags"],
        ["ja-JP", "残り 2 件のタグ"],
      ];
      for (const [locale, expected] of localeExpected) {
        setAppLocale(locale);
        const wrapper = mount(LeadTableRow, {
          props: {
            lead: makeLead({
              id: `ROW-ARIA-${locale}`,
              tags: ["t-1", "t-2", "t-3", "t-4", "t-5"],
            }),
          },
          global: { plugins: [i18n] },
          attachTo: document.body,
        });
        const more = wrapper.find(".lead-row__tags-more");
        expect(more.attributes("aria-label")).toBe(expected);
        wrapper.unmount();
      }
    });

    it("hover +N 时通过 Teleport 渲染 popover，列出全部隐藏标签", async () => {
      setAppLocale("zh-CN");
      const wrapper = mount(LeadTableRow, {
        props: {
          lead: makeLead({
            id: "ROW-P",
            tags: ["t-1", "t-2", "t-3", "t-4", "t-5"],
          }),
        },
        global: { plugins: [i18n] },
        attachTo: document.body,
      });
      const more = wrapper.find(".lead-row__tags-more");
      await more.trigger("mouseenter");

      const popover = document.querySelector(".lead-row__tags-popover");
      expect(popover).not.toBeNull();
      const text = popover?.textContent ?? "";
      expect(text).toContain("t-4");
      expect(text).toContain("t-5");

      await more.trigger("mouseleave");
      expect(document.querySelector(".lead-row__tags-popover")).toBeNull();
      wrapper.unmount();
    });

    it("每个标签 chip 带 title 属性，便于截断时悬浮看全名", () => {
      setAppLocale("zh-CN");
      const longTag = "very-long-tag-that-should-be-truncated-visually";
      const wrapper = mount(LeadTableRow, {
        props: {
          lead: makeLead({ id: "ROW-L", tags: [longTag] }),
        },
        global: { plugins: [i18n] },
      });
      const chip = wrapper
        .findAllComponents({ name: "Chip" })
        .find((c) => c.text() === longTag);
      expect(chip).toBeTruthy();
      expect(chip!.attributes("title")).toBe(longTag);
    });
  });

  describe("W-1 leads 列表组列本地化（B-0 路径扩散）", () => {
    it("server JOIN 返回 catalog slug『tokyo-1』时按 zh-CN 渲染为『东京一组』", () => {
      setAppLocale("zh-CN");
      const wrapper = mount(LeadTableRow, {
        props: {
          lead: makeLead({ groupLabel: "tokyo-1", groupId: "tokyo-1" }),
        },
        global: { plugins: [i18n] },
      });
      const groupChip = wrapper.findAll(".lead-row__group .ui-chip").at(0);
      expect(groupChip).toBeTruthy();
      expect(groupChip!.text()).toBe("东京一组");
      expect(wrapper.text()).not.toContain("tokyo-1");
    });

    it("server JOIN 返回 catalog slug『tokyo-1』时按 en-US 渲染为『Tokyo Team 1』", () => {
      setAppLocale("en-US");
      const wrapper = mount(LeadTableRow, {
        props: {
          lead: makeLead({ groupLabel: "tokyo-1", groupId: "tokyo-1" }),
        },
        global: { plugins: [i18n] },
      });
      expect(wrapper.find(".lead-row__group .ui-chip").text()).toBe(
        "Tokyo Team 1",
      );
    });

    it("groupLabel 为空但 groupId 命中 catalog → 按 locale 本地化（不裸出 slug）", () => {
      setAppLocale("zh-CN");
      const wrapper = mount(LeadTableRow, {
        props: {
          lead: makeLead({ groupLabel: null, groupId: "tokyo-2" }),
        },
        global: { plugins: [i18n] },
      });
      expect(wrapper.find(".lead-row__group .ui-chip").text()).toBe("东京二组");
    });

    it("groupLabel 与 groupId 都为空 → 显示『—』而非空 chip", () => {
      setAppLocale("zh-CN");
      const wrapper = mount(LeadTableRow, {
        props: {
          lead: makeLead({ groupLabel: null, groupId: "" }),
        },
        global: { plugins: [i18n] },
      });
      expect(wrapper.find(".lead-row__group .ui-chip").text()).toBe("—");
    });

    it("groupId 为 UUID 且 alias 已注册 catalog slug → 按 locale 本地化", () => {
      setAppLocale("zh-CN");
      const UUID_GROUP = "ef21fdd2-1ffc-4a27-8b47-a640d6bd021c";
      registerGroupAliases([{ id: UUID_GROUP, name: "tokyo-1" }]);
      const wrapper = mount(LeadTableRow, {
        props: {
          lead: makeLead({ groupLabel: null, groupId: UUID_GROUP }),
        },
        global: { plugins: [i18n] },
      });
      expect(wrapper.find(".lead-row__group .ui-chip").text()).toBe("东京一组");
      expect(wrapper.text()).not.toContain(UUID_GROUP);
    });

    it("自定义组名（不在 catalog）原样保留，不被 locale 影响", () => {
      setAppLocale("zh-CN");
      const wrapper = mount(LeadTableRow, {
        props: {
          lead: makeLead({ groupLabel: "営業一課", groupId: "tokyo-1" }),
        },
        global: { plugins: [i18n] },
      });
      expect(wrapper.find(".lead-row__group .ui-chip").text()).toBe("営業一課");
    });
  });

  describe("P2-11 businessTypeLabel / sourceLabel 本地化（不再裸出英文 slug）", () => {
    it("businessTypeLabel 为 raw slug 'family-stay' 时渲染为本地化标签", () => {
      setAppLocale("zh-CN");
      const wrapper = mount(LeadTableRow, {
        props: {
          lead: makeLead({
            businessTypeLabel: "family-stay",
            sourceLabel: "referral",
          }),
        },
        global: { plugins: [i18n] },
      });
      expect(wrapper.text()).toContain("家族滞在");
      expect(wrapper.text()).not.toContain("family-stay");
      expect(wrapper.text()).toContain("介绍");
      expect(wrapper.text()).not.toContain("referral");
    });

    it("businessTypeLabel 为 underscore variant 'family_stay' 时仍可解析", () => {
      setAppLocale("zh-CN");
      const wrapper = mount(LeadTableRow, {
        props: {
          lead: makeLead({
            businessTypeLabel: "family_stay",
            sourceLabel: "web",
          }),
        },
        global: { plugins: [i18n] },
      });
      expect(wrapper.text()).toContain("家族滞在");
      expect(wrapper.text()).not.toContain("family_stay");
      expect(wrapper.text()).toContain("网站表单");
      expect(wrapper.text()).not.toContain("web");
    });

    it("businessTypeLabel 已是本地化文案时原样透传", () => {
      setAppLocale("zh-CN");
      const wrapper = mount(LeadTableRow, {
        props: {
          lead: makeLead({
            businessTypeLabel: "技人国",
            sourceLabel: "介绍",
          }),
        },
        global: { plugins: [i18n] },
      });
      expect(wrapper.text()).toContain("技人国");
      expect(wrapper.text()).toContain("介绍");
    });

    it("en-US locale 下 slug 'work-visa' 渲染为 English label", () => {
      setAppLocale("en-US");
      const wrapper = mount(LeadTableRow, {
        props: {
          lead: makeLead({
            businessTypeLabel: "work-visa",
            sourceLabel: "walkin",
          }),
        },
        global: { plugins: [i18n] },
      });
      expect(wrapper.text()).not.toContain("work-visa");
      expect(wrapper.text()).not.toContain("walkin");
    });

    it("sourceLabel 为空时不渲染分隔符 ·", () => {
      setAppLocale("zh-CN");
      const wrapper = mount(LeadTableRow, {
        props: {
          lead: makeLead({
            businessTypeLabel: "family-stay",
            sourceLabel: "",
          }),
        },
        global: { plugins: [i18n] },
      });
      const bizInfo = wrapper.find(".lead-row__biz-info");
      expect(bizInfo.find(".lead-row__dot").exists()).toBe(false);
    });
  });

  describe("H-9 owner UUID 列表渲染（不再展示 raw UUID 或 ?）", () => {
    it("ownerId 是 catalog 短码 → 仍然走 catalog 本地化路径（BC）", () => {
      setAppLocale("zh-CN");
      const wrapper = mount(LeadTableRow, {
        props: { lead: makeLead({ ownerId: "suzuki" }) },
        global: { plugins: [i18n] },
      });
      expect(wrapper.text()).toContain("铃木");
      expect(wrapper.text()).not.toContain("?");
    });

    it("ownerId 是真实 UUID 且已注册别名 → 显示 displayName + 派生 initials", () => {
      setAppLocale("zh-CN");
      registerUserAliases([
        { id: UUID_LOCAL_ADMIN, displayName: "Local Admin" },
      ]);
      const wrapper = mount(LeadTableRow, {
        props: { lead: makeLead({ ownerId: UUID_LOCAL_ADMIN }) },
        global: { plugins: [i18n] },
      });
      expect(wrapper.text()).toContain("Local Admin");
      expect(wrapper.text()).toContain("LA");
      expect(wrapper.text()).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/);
      expect(wrapper.text()).not.toContain("?");
    });

    it("ownerId 是真实 UUID 但 alias 未注册 → 显示『未知用户』而非裸 UUID 或 ?", () => {
      setAppLocale("zh-CN");
      const wrapper = mount(LeadTableRow, {
        props: { lead: makeLead({ ownerId: UUID_UNKNOWN }) },
        global: { plugins: [i18n] },
      });
      expect(wrapper.text()).toContain("未知用户");
      expect(wrapper.text()).not.toContain(UUID_UNKNOWN);
      expect(wrapper.text()).not.toContain("?");
    });

    it("ownerId 是 nil UUID → 显示『未分配』", () => {
      setAppLocale("zh-CN");
      const wrapper = mount(LeadTableRow, {
        props: { lead: makeLead({ ownerId: NIL_UUID }) },
        global: { plugins: [i18n] },
      });
      expect(wrapper.text()).toContain("未分配");
      expect(wrapper.text()).not.toContain("?");
    });

    it("en-US locale 下 unknown UUID → 显示『Unknown user』", () => {
      setAppLocale("en-US");
      const wrapper = mount(LeadTableRow, {
        props: { lead: makeLead({ ownerId: UUID_UNKNOWN }) },
        global: { plugins: [i18n] },
      });
      expect(wrapper.text()).toContain("Unknown user");
    });
  });
});
