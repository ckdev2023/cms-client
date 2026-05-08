import { afterEach, describe, expect, it } from "vitest";
import { ref } from "vue";
import {
  clearGroupAliases,
  registerGroupAliases,
} from "../../../shared/model/useGroupOptions";
import {
  clearUserAliases,
  registerUserAliases,
} from "../../../shared/model/useOrgUserOptions";
import { useLeadCatalogOptions } from "./useLeadCatalogOptions";

const UUID_OWNER = "00000000-0000-4000-8000-000000000011";
const UUID_OWNER_B = "11111111-2222-3333-4444-555555555555";
const UUID_GROUP = "ef21fdd2-1ffc-4a27-8b47-a640d6bd021c";

afterEach(() => {
  clearUserAliases();
  clearGroupAliases();
});

describe("useLeadCatalogOptions (R2-A-1)", () => {
  it("returns empty options when no API aliases are registered", () => {
    const { apiOwnerOptions, apiGroupOptions } = useLeadCatalogOptions(
      ref("zh-CN"),
    );
    expect(apiOwnerOptions.value).toEqual([]);
    expect(apiGroupOptions.value).toEqual([]);
  });

  it("apiOwnerOptions returns API UUIDs as values, never catalog short codes", () => {
    registerUserAliases([
      { id: UUID_OWNER, displayName: "Local Admin" },
      { id: UUID_OWNER_B, displayName: "Staff" },
    ]);

    const { apiOwnerOptions } = useLeadCatalogOptions(ref("zh-CN"));
    const values = apiOwnerOptions.value.map((o) => o.value);
    expect(values).toContain(UUID_OWNER);
    expect(values).toContain(UUID_OWNER_B);
    expect(values).not.toContain("suzuki");
    expect(values).not.toContain("admin");
  });

  it("apiOwnerOptions exposes initials and avatarClass for UI rendering", () => {
    registerUserAliases([{ id: UUID_OWNER, displayName: "Local Admin" }]);
    const { apiOwnerOptions } = useLeadCatalogOptions(ref("zh-CN"));
    const opt = apiOwnerOptions.value[0];
    expect(opt?.label).toBe("Local Admin");
    expect(opt?.initials).toBe("LA");
    expect(typeof opt?.avatarClass).toBe("string");
    expect(opt?.avatarClass.length).toBeGreaterThan(0);
  });

  it("R2-B-3: apiGroupOptions returns API UUID as value", () => {
    registerGroupAliases([{ id: UUID_GROUP, name: "tokyo-1" }]);
    const { apiGroupOptions } = useLeadCatalogOptions(ref("zh-CN"));
    expect(apiGroupOptions.value[0]?.value).toBe(UUID_GROUP);
  });

  it("P2-13: apiGroupOptions label is localized when DB name matches catalog", () => {
    registerGroupAliases([{ id: UUID_GROUP, name: "tokyo-1" }]);
    const locale = ref("zh-CN");
    const { apiGroupOptions } = useLeadCatalogOptions(locale);
    expect(apiGroupOptions.value[0]?.label).toBe("东京一组");
    locale.value = "ja-JP";
    expect(apiGroupOptions.value[0]?.label).toBe("東京一組");
    locale.value = "en-US";
    expect(apiGroupOptions.value[0]?.label).toBe("Tokyo Team 1");
  });

  it("P2-13: apiGroupOptions preserves custom DB name when not in catalog", () => {
    registerGroupAliases([{ id: UUID_GROUP, name: "カスタム分組" }]);
    const { apiGroupOptions } = useLeadCatalogOptions(ref("zh-CN"));
    expect(apiGroupOptions.value[0]?.label).toBe("カスタム分組");
  });
});
