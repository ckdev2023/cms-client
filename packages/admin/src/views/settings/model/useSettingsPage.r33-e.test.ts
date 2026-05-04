import { describe, it, expect, vi } from "vitest";
import { ref } from "vue";
import { useSettingsPage, type UseSettingsPageDeps } from "./useSettingsPage";
import {
  SAMPLE_GROUPS,
  SAMPLE_GROUP_DETAILS,
  SAMPLE_GROUP_STATS,
  SAMPLE_ORG_SETTINGS,
} from "../fixtures";

function createDeps(
  overrides?: Partial<UseSettingsPageDeps>,
): UseSettingsPageDeps {
  return {
    initialGroups: [...SAMPLE_GROUPS],
    groupDetails: { ...SAMPLE_GROUP_DETAILS },
    groupStats: { ...SAMPLE_GROUP_STATS },
    orgSettings: structuredClone(SAMPLE_ORG_SETTINGS),
    isAdmin: ref(true),
    toastDuration: 100,
    setTimeoutFn: vi.fn((fn: TimerHandler) => {
      if (typeof fn === "function") fn();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    }) as unknown as typeof setTimeout,
    clearTimeoutFn: vi.fn(),
    ...overrides,
  };
}

describe("useSettingsPage — routeTab deep-link (R33-E)", () => {
  it("routeTab='storage-root' → activePanel is storage-root", () => {
    const s = useSettingsPage(
      createDeps({ routeTab: ref<string | undefined>("storage-root") }),
    );
    expect(s.activePanel.value).toBe("storage-root");
  });

  it("routeTab=undefined → activePanel falls back to group-management", () => {
    const s = useSettingsPage(
      createDeps({ routeTab: ref<string | undefined>(undefined) }),
    );
    expect(s.activePanel.value).toBe("group-management");
  });

  it("routeTab with invalid value → activePanel falls back to group-management", () => {
    const s = useSettingsPage(
      createDeps({ routeTab: ref<string | undefined>("invalid-xxx") }),
    );
    expect(s.activePanel.value).toBe("group-management");
  });

  it("routeTab='visibility-config' → activePanel is visibility-config", () => {
    const s = useSettingsPage(
      createDeps({ routeTab: ref<string | undefined>("visibility-config") }),
    );
    expect(s.activePanel.value).toBe("visibility-config");
  });

  it("activePanel follows routeTab changes", () => {
    const routeTab = ref<string | undefined>(undefined);
    const s = useSettingsPage(createDeps({ routeTab }));
    expect(s.activePanel.value).toBe("group-management");

    routeTab.value = "storage-root";
    expect(s.activePanel.value).toBe("storage-root");

    routeTab.value = "visibility-config";
    expect(s.activePanel.value).toBe("visibility-config");

    routeTab.value = "bad-value";
    expect(s.activePanel.value).toBe("group-management");

    routeTab.value = undefined;
    expect(s.activePanel.value).toBe("group-management");
  });

  it("no routeTab provided → defaults to group-management (backward compat)", () => {
    const s = useSettingsPage(createDeps());
    expect(s.activePanel.value).toBe("group-management");
  });
});
