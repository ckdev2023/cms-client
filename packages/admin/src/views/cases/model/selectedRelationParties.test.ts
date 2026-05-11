import { describe, expect, it } from "vitest";
import { mapSelectedRelationsToParties } from "./selectedRelationParties";

describe("mapSelectedRelationsToParties", () => {
  it("当映射结果仅为扶养者/保证人时，将首位联系人提升为配偶以满足家族批量建案申请人门禁", () => {
    const parties = mapSelectedRelationsToParties({
      relations: [
        {
          id: "rel-other",
          name: "未区分关系联系人",
          relationType: "other",
          phone: "090-0000-0001",
        },
      ],
      group: "tokyo-1",
      groupLabel: "东京一组",
    });
    expect(parties).toHaveLength(1);
    expect(parties[0]?.role).toBe("配偶");
  });

  it("已有申请人角色时不改写角色", () => {
    const parties = mapSelectedRelationsToParties({
      relations: [
        {
          id: "rel-ch",
          name: "子女甲",
          relationType: "child",
        },
      ],
      group: "tokyo-1",
      groupLabel: "东京一组",
    });
    expect(parties[0]?.role).toBe("子女");
  });
});
