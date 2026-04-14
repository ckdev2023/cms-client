import { describe, expect, it } from "vitest";
import {
  DEFAULT_PANEL,
  GROUP_STATUS_BADGE,
  GROUP_STATUS_OPTIONS,
  GROUP_TABLE_COLUMNS,
  MEMBER_TABLE_COLUMNS,
  ROLE_CHIP_VARIANT,
  ROLE_VISIBILITY_MATRIX,
  SAMPLE_GROUP_DETAILS,
  SAMPLE_GROUP_MEMBERS,
  SAMPLE_GROUP_STATS,
  SAMPLE_GROUPS,
  SAMPLE_ORG_SETTINGS,
  SAMPLE_ORG_SETTINGS_UNCONFIGURED,
  SETTINGS_SUBNAV_ITEMS,
  SETTINGS_TOAST_PRESETS,
  STORAGE_ROOT_FIELDS,
  VISIBILITY_CONFIG_ITEMS,
} from "./fixtures";

describe("settings/fixtures", () => {
  describe("sub-navigation", () => {
    it("has exactly 3 P0 panels", () => {
      expect(SETTINGS_SUBNAV_ITEMS).toHaveLength(3);
    });

    it("default panel is group-management", () => {
      expect(DEFAULT_PANEL).toBe("group-management");
      const defaultItem = SETTINGS_SUBNAV_ITEMS.find(
        (item) => item.defaultActive,
      );
      expect(defaultItem?.id).toBe(DEFAULT_PANEL);
    });
  });

  describe("group table columns", () => {
    it("has 5 columns matching P0-CONTRACT §2.1", () => {
      expect(GROUP_TABLE_COLUMNS).toHaveLength(5);
      const keys = GROUP_TABLE_COLUMNS.map((c) => c.key);
      expect(keys).toEqual([
        "name",
        "status",
        "createdAt",
        "activeCaseCount",
        "memberCount",
      ]);
    });

    it("each column has a labelKey", () => {
      for (const col of GROUP_TABLE_COLUMNS) {
        expect(col.labelKey).toBeTruthy();
      }
    });
  });

  describe("member table columns", () => {
    it("has 3 columns matching P0-CONTRACT §3.2", () => {
      expect(MEMBER_TABLE_COLUMNS).toHaveLength(3);
      const keys = MEMBER_TABLE_COLUMNS.map((c) => c.key);
      expect(keys).toEqual(["name", "role", "joinedAt"]);
    });
  });

  describe("group status", () => {
    it("status options include empty-value (all) plus active and disabled", () => {
      expect(GROUP_STATUS_OPTIONS).toHaveLength(3);
      const values = GROUP_STATUS_OPTIONS.map((o) => o.value);
      expect(values).toContain("");
      expect(values).toContain("active");
      expect(values).toContain("disabled");
    });

    it("badge config covers both statuses", () => {
      expect(GROUP_STATUS_BADGE.active.variant).toBe("green");
      expect(GROUP_STATUS_BADGE.disabled.variant).toBe("gray");
    });
  });

  describe("SAMPLE_GROUPS", () => {
    it("provides 3 groups matching prototype demo data", () => {
      expect(SAMPLE_GROUPS).toHaveLength(3);
    });

    it("each group has required fields", () => {
      for (const g of SAMPLE_GROUPS) {
        expect(g.id).toBeTruthy();
        expect(g.name).toBeTruthy();
        expect(["active", "disabled"]).toContain(g.status);
        expect(g.createdAt).toBeTruthy();
        expect(typeof g.activeCaseCount).toBe("number");
        expect(typeof g.memberCount).toBe("number");
      }
    });

    it("contains at least one disabled group for filter testing", () => {
      const disabled = SAMPLE_GROUPS.filter((g) => g.status === "disabled");
      expect(disabled.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("cross-reference integrity", () => {
    const groupIds = SAMPLE_GROUPS.map((g) => g.id);

    it("SAMPLE_GROUP_DETAILS covers all sample groups", () => {
      for (const id of groupIds) {
        expect(SAMPLE_GROUP_DETAILS[id]).toBeDefined();
      }
    });

    it("SAMPLE_GROUP_MEMBERS covers all sample groups", () => {
      for (const id of groupIds) {
        expect(SAMPLE_GROUP_MEMBERS[id]).toBeDefined();
      }
    });

    it("SAMPLE_GROUP_STATS covers all sample groups", () => {
      for (const id of groupIds) {
        expect(SAMPLE_GROUP_STATS[id]).toBeDefined();
      }
    });

    it("detail memberCount matches actual members array length", () => {
      for (const id of groupIds) {
        const detail = SAMPLE_GROUP_DETAILS[id]!;
        expect(detail.members).toHaveLength(detail.memberCount);
      }
    });

    it("detail customerCount matches stats customerCount", () => {
      for (const id of groupIds) {
        const detail = SAMPLE_GROUP_DETAILS[id]!;
        const stats = SAMPLE_GROUP_STATS[id]!;
        expect(detail.customerCount).toBe(stats.customerCount);
      }
    });
  });

  describe("role chip variants", () => {
    it("covers all roles that appear in sample members", () => {
      const allRoles = new Set(
        Object.values(SAMPLE_GROUP_MEMBERS).flatMap((members) =>
          members.map((m) => m.role),
        ),
      );
      for (const role of allRoles) {
        expect(ROLE_CHIP_VARIANT[role]).toBeTruthy();
      }
    });
  });

  describe("visibility config", () => {
    it("has exactly 2 config items per P0-CONTRACT §5", () => {
      expect(VISIBILITY_CONFIG_ITEMS).toHaveLength(2);
    });

    it("each item has label and description keys", () => {
      for (const item of VISIBILITY_CONFIG_ITEMS) {
        expect(item.labelKey).toBeTruthy();
        expect(item.descriptionKey).toBeTruthy();
      }
    });
  });

  describe("storage root fields", () => {
    it("has 2 required fields per P0-CONTRACT §6", () => {
      expect(STORAGE_ROOT_FIELDS).toHaveLength(2);
      for (const field of STORAGE_ROOT_FIELDS) {
        expect(field.required).toBe(true);
      }
    });
  });

  describe("org settings samples", () => {
    it("configured sample has non-null storage root", () => {
      expect(SAMPLE_ORG_SETTINGS.storageRoot.rootPath).toBeTruthy();
      expect(SAMPLE_ORG_SETTINGS.storageRoot.rootLabel).toBeTruthy();
      expect(SAMPLE_ORG_SETTINGS.storageRoot.updatedBy).toBeTruthy();
      expect(SAMPLE_ORG_SETTINGS.storageRoot.updatedAt).toBeTruthy();
    });

    it("unconfigured sample has null storage root fields", () => {
      expect(SAMPLE_ORG_SETTINGS_UNCONFIGURED.storageRoot.rootPath).toBeNull();
      expect(SAMPLE_ORG_SETTINGS_UNCONFIGURED.storageRoot.rootLabel).toBeNull();
      expect(SAMPLE_ORG_SETTINGS_UNCONFIGURED.storageRoot.updatedBy).toBeNull();
      expect(SAMPLE_ORG_SETTINGS_UNCONFIGURED.storageRoot.updatedAt).toBeNull();
    });
  });

  describe("role visibility matrix", () => {
    it("only admin role is visible and editable", () => {
      const visible = ROLE_VISIBILITY_MATRIX.filter((r) => r.visible);
      expect(visible).toHaveLength(1);
      expect(visible[0]!.role).toBe("管理員");
      expect(visible[0]!.editable).toBe(true);
    });
  });

  describe("toast presets", () => {
    it("has all 5 P0 scenarios", () => {
      const keys = Object.keys(SETTINGS_TOAST_PRESETS);
      expect(keys).toHaveLength(5);
      expect(keys).toEqual(
        expect.arrayContaining([
          "groupCreated",
          "groupRenamed",
          "groupDisabled",
          "visibilityUpdated",
          "storageRootUpdated",
        ]),
      );
    });

    it("each preset has title and description keys", () => {
      for (const preset of Object.values(SETTINGS_TOAST_PRESETS)) {
        expect(preset.titleKey).toBeTruthy();
        expect(preset.descriptionKey).toBeTruthy();
      }
    });
  });
});
