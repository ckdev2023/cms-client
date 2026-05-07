import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n, setAppLocale, type AppLocale } from "../../../i18n";
import { getLeadSamples } from "../fixtures";
import {
  clearUserAliases,
  registerUserAliases,
} from "../../../shared/model/useOrgUserOptions";
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

    it("超过 3 条时折叠为 +N，并把剩余标签暴露给悬浮 popover（aria-label 列出隐藏标签）", () => {
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
      expect(more.attributes("aria-label")).toBe("t-4, t-5");
      expect(more.attributes("role")).toBe("button");
      expect(more.attributes("tabindex")).toBe("0");
      wrapper.unmount();
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
