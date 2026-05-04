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
      groupNotMember:
        "You are not a member of any group and cannot view group data",
    });
    expect(zhCN.dashboard.scope).toEqual({
      mine: "我的",
      group: "本组",
      all: "全所",
      groupNotMember: "您未加入任何分组，无法查看本组数据",
    });
    expect(jaJP.dashboard.scope).toEqual({
      mine: "自分",
      group: "所属組",
      all: "事務所全体",
      groupNotMember:
        "どのグループにも所属していないため、グループデータを表示できません",
    });
  });

  it("uses group wording in english scope summaries", () => {
    expect(enUS.dashboard.scopeSummary.group).toContain("group");
    expect(enUS.dashboard.scopeSummary.group).not.toContain("team");
  });
});
