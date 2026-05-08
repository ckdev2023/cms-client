import { afterEach, describe, it, expect } from "vitest";
import {
  clearGroupAliases,
  getGroupOptions,
  registerGroupAliases,
} from "./useGroupOptions";

describe("getGroupOptions(mode)", () => {
  const FAKE_UUID = "ef21fdd2-1ffc-4a27-8b47-a640d6bd021c";

  afterEach(() => {
    clearGroupAliases();
  });

  describe("filter mode", () => {
    it("returns all catalog entries including disabled", () => {
      const options = getGroupOptions("filter");
      expect(options.length).toBe(3);
      expect(options.map((o) => o.value)).toEqual([
        "tokyo-1",
        "tokyo-2",
        "osaka",
      ]);
    });

    it("localizes labels based on locale", () => {
      const zhOptions = getGroupOptions("filter", "zh-CN");
      expect(zhOptions).toEqual([
        { value: "tokyo-1", label: "东京一组" },
        { value: "tokyo-2", label: "东京二组" },
        { value: "osaka", label: "大阪组" },
      ]);

      const enOptions = getGroupOptions("filter", "en-US");
      expect(enOptions).toEqual([
        { value: "tokyo-1", label: "Tokyo Team 1" },
        { value: "tokyo-2", label: "Tokyo Team 2" },
        { value: "osaka", label: "Osaka Team" },
      ]);
    });

    it("defaults to ja-JP when no locale specified", () => {
      const options = getGroupOptions("filter");
      expect(options[0]?.label).toBe("東京一組");
    });
  });

  describe("write mode", () => {
    it("returns empty array when no alias registered", () => {
      expect(getGroupOptions("write")).toEqual([]);
    });

    it("returns registered aliases with UUID as value", () => {
      registerGroupAliases([{ id: FAKE_UUID, name: "tokyo-1" }]);
      const options = getGroupOptions("write", "zh-CN");
      expect(options).toHaveLength(1);
      expect(options[0]?.value).toBe(FAKE_UUID);
      expect(options[0]?.label).toBe("东京一组");
    });

    it("excludes disabled aliases", () => {
      const otherUuid = "11111111-2222-3333-4444-555555555555";
      registerGroupAliases([
        { id: FAKE_UUID, name: "tokyo-1" },
        { id: otherUuid, name: "osaka" },
      ]);
      const options = getGroupOptions("write", "ja-JP");
      expect(options).toHaveLength(1);
      expect(options[0]?.value).toBe(FAKE_UUID);
    });
  });

  describe("mode dispatch differences", () => {
    it("filter and write return different result sets", () => {
      registerGroupAliases([{ id: FAKE_UUID, name: "tokyo-1" }]);
      const filterOpts = getGroupOptions("filter", "ja-JP");
      const writeOpts = getGroupOptions("write", "ja-JP");

      expect(filterOpts.length).toBeGreaterThan(writeOpts.length);
      expect(filterOpts.map((o) => o.value)).toContain("osaka");
      expect(writeOpts.map((o) => o.value)).not.toContain("osaka");
      expect(writeOpts[0]?.value).toBe(FAKE_UUID);
      expect(filterOpts[0]?.value).toBe("tokyo-1");
    });

    it("filter uses catalog short codes, write uses UUIDs", () => {
      registerGroupAliases([{ id: FAKE_UUID, name: "tokyo-1" }]);
      const filterOpts = getGroupOptions("filter");
      const writeOpts = getGroupOptions("write");

      for (const opt of filterOpts) {
        expect(opt.value).not.toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        );
      }
      for (const opt of writeOpts) {
        expect(opt.value).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        );
      }
    });
  });
});
