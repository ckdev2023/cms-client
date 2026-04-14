import { describe, expect, it } from "vitest";
import { isExternalItem, navGroups } from "../shell/nav-config";
import { router } from "./index";

describe("router", () => {
  it("registers every internal nav destination", () => {
    const internalItems = navGroups.flatMap((group) =>
      group.items.filter((item) => !isExternalItem(item)),
    );

    for (const item of internalItems) {
      const resolved = router.resolve(item.to);
      expect(
        resolved.matched.length,
        `missing route for ${String(item.to)}`,
      ).toBeGreaterThan(0);
    }
  });
});
