import { describe, expect, it } from "vitest";
import enUS from "../../i18n/messages/en-US";
import jaJP from "../../i18n/messages/ja-JP";
import zhCN from "../../i18n/messages/zh-CN";

describe("dashboard scope i18n", () => {
  it("keeps scope tab labels aligned with accepted backend scopes", () => {
    expect(enUS.dashboard.scope).toEqual({
      mine: "Mine",
      group: "My group",
      all: "All firm",
    });
    expect(zhCN.dashboard.scope).toEqual({
      mine: "我的",
      group: "本组",
      all: "全所",
    });
    expect(jaJP.dashboard.scope).toEqual({
      mine: "自分",
      group: "所属組",
      all: "事務所全体",
    });
  });

  it("uses group wording in english scope summaries", () => {
    expect(enUS.dashboard.scopeSummary.group).toContain("group");
    expect(enUS.dashboard.scopeSummary.group).not.toContain("team");
  });
});
