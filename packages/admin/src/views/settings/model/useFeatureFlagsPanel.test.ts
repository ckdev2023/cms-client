import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";
import type {
  FeatureFlagsAdminRepository,
  FeatureFlagRow,
  FeatureFlagResolution,
} from "./FeatureFlagsAdminRepository";
import { FeatureFlagsAdminRepositoryError } from "./FeatureFlagsAdminRepository";
import { useFeatureFlagsPanel } from "./useFeatureFlagsPanel";
import type { ToastState } from "./settingsControllers";

const BMV_ROW: FeatureFlagRow = {
  id: "ff-1",
  orgId: "org-1",
  key: "bmv",
  enabled: true,
  payload: {},
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-05-01T00:00:00Z",
};

const UNKNOWN_ROW: FeatureFlagRow = {
  id: "ff-2",
  orgId: "org-1",
  key: "experiment-x",
  enabled: false,
  payload: {},
  createdAt: "2026-04-01T00:00:00Z",
  updatedAt: "2026-04-15T00:00:00Z",
};

const BMV_MISSING_RESOLUTION: FeatureFlagResolution = {
  key: "bmv",
  enabled: false,
  used: false,
  reason: "missing",
};

function createMockRepo(
  overrides: Partial<FeatureFlagsAdminRepository> = {},
): FeatureFlagsAdminRepository {
  return {
    listFlags: vi.fn().mockResolvedValue([]),
    resolveFlag: vi.fn().mockResolvedValue(BMV_MISSING_RESOLUTION),
    upsertFlag: vi.fn().mockResolvedValue(BMV_ROW),
    resetFlag: vi.fn().mockResolvedValue(BMV_ROW),
    ...overrides,
  };
}

function createMockToast(): ToastState {
  return {
    visible: ref(false),
    titleKey: ref(""),
    descriptionKey: ref(""),
    show: vi.fn(),
    hide: vi.fn(),
  };
}

describe("useFeatureFlagsPanel", () => {
  let toast: ToastState;

  beforeEach(() => {
    toast = createMockToast();
  });

  describe("load", () => {
    it("loads flags and merges with catalog", async () => {
      const repo = createMockRepo({
        listFlags: vi.fn().mockResolvedValue([BMV_ROW]),
      });
      const panel = useFeatureFlagsPanel({ repository: repo, toast });

      await panel.load();

      expect(panel.loading.value).toBe(false);
      expect(panel.error.value).toBeNull();
      expect(panel.items.value).toHaveLength(1);
      expect(panel.items.value[0].key).toBe("bmv");
      expect(panel.items.value[0].resolvedEnabled).toBe(true);
      expect(panel.items.value[0].rowStatus).toBe("present");
      expect(panel.items.value[0].catalogDefinition).not.toBeNull();
    });

    it("catalog flag with missing server row → resolves via resolveFlag", async () => {
      const repo = createMockRepo({
        listFlags: vi.fn().mockResolvedValue([]),
        resolveFlag: vi.fn().mockResolvedValue(BMV_MISSING_RESOLUTION),
      });
      const panel = useFeatureFlagsPanel({ repository: repo, toast });

      await panel.load();

      expect(repo.resolveFlag).toHaveBeenCalledWith("bmv");
      expect(panel.items.value).toHaveLength(1);
      expect(panel.items.value[0].key).toBe("bmv");
      expect(panel.items.value[0].resolvedEnabled).toBe(false);
      expect(panel.items.value[0].rowStatus).toBe("missing");
    });

    it("unknown server flag (not in catalog) appears in items", async () => {
      const repo = createMockRepo({
        listFlags: vi.fn().mockResolvedValue([BMV_ROW, UNKNOWN_ROW]),
      });
      const panel = useFeatureFlagsPanel({ repository: repo, toast });

      await panel.load();

      expect(panel.items.value).toHaveLength(2);
      const unknown = panel.items.value.find((i) => i.key === "experiment-x");
      expect(unknown).toBeDefined();
      expect(unknown!.catalogDefinition).toBeNull();
      expect(unknown!.resolvedEnabled).toBe(false);
      expect(unknown!.rowStatus).toBe("present");
    });

    it("sets error on load failure", async () => {
      const repo = createMockRepo({
        listFlags: vi
          .fn()
          .mockRejectedValue(new FeatureFlagsAdminRepositoryError("fail", 500)),
      });
      const panel = useFeatureFlagsPanel({ repository: repo, toast });

      await panel.load();

      expect(panel.error.value).toBe("load_failed");
      expect(panel.loading.value).toBe(false);
    });

    it("catalog items come before unknown flags", async () => {
      const repo = createMockRepo({
        listFlags: vi.fn().mockResolvedValue([UNKNOWN_ROW, BMV_ROW]),
      });
      const panel = useFeatureFlagsPanel({ repository: repo, toast });

      await panel.load();

      expect(panel.items.value[0].key).toBe("bmv");
      expect(panel.items.value[1].key).toBe("experiment-x");
    });
  });

  describe("toggleFlag", () => {
    it("toggles enabled→disabled and shows success toast", async () => {
      const toggledRow = { ...BMV_ROW, enabled: false };
      const repo = createMockRepo({
        listFlags: vi.fn().mockResolvedValue([BMV_ROW]),
        upsertFlag: vi.fn().mockResolvedValue(toggledRow),
      });
      const panel = useFeatureFlagsPanel({ repository: repo, toast });
      await panel.load();

      await panel.toggleFlag("bmv");

      expect(repo.upsertFlag).toHaveBeenCalledWith({
        key: "bmv",
        enabled: false,
      });
      expect(panel.items.value[0].resolvedEnabled).toBe(false);
      expect(toast.show).toHaveBeenCalledWith("featureFlagUpdated");
    });

    it("toggles disabled→enabled", async () => {
      const disabledRow = { ...BMV_ROW, enabled: false };
      const enabledRow = { ...BMV_ROW, enabled: true };
      const repo = createMockRepo({
        listFlags: vi.fn().mockResolvedValue([disabledRow]),
        upsertFlag: vi.fn().mockResolvedValue(enabledRow),
      });
      const panel = useFeatureFlagsPanel({ repository: repo, toast });
      await panel.load();

      await panel.toggleFlag("bmv");

      expect(repo.upsertFlag).toHaveBeenCalledWith({
        key: "bmv",
        enabled: true,
      });
      expect(panel.items.value[0].resolvedEnabled).toBe(true);
    });

    it("shows failure toast on toggle error", async () => {
      const repo = createMockRepo({
        listFlags: vi.fn().mockResolvedValue([BMV_ROW]),
        upsertFlag: vi
          .fn()
          .mockRejectedValue(
            new FeatureFlagsAdminRepositoryError("Forbidden", 403),
          ),
      });
      const panel = useFeatureFlagsPanel({ repository: repo, toast });
      await panel.load();

      await panel.toggleFlag("bmv");

      expect(toast.show).toHaveBeenCalledWith("featureFlagFailed");
      expect(panel.items.value[0].resolvedEnabled).toBe(true);
    });

    it("can toggle unknown (non-catalog) flags", async () => {
      const toggledRow = { ...UNKNOWN_ROW, enabled: true };
      const repo = createMockRepo({
        listFlags: vi.fn().mockResolvedValue([UNKNOWN_ROW]),
        upsertFlag: vi.fn().mockResolvedValue(toggledRow),
      });
      const panel = useFeatureFlagsPanel({ repository: repo, toast });
      await panel.load();

      await panel.toggleFlag("experiment-x");

      expect(repo.upsertFlag).toHaveBeenCalledWith({
        key: "experiment-x",
        enabled: true,
      });
      expect(toast.show).toHaveBeenCalledWith("featureFlagUpdated");
    });

    it("creates server row for missing catalog flag on toggle", async () => {
      const newRow = { ...BMV_ROW, enabled: true };
      const repo = createMockRepo({
        listFlags: vi.fn().mockResolvedValue([]),
        resolveFlag: vi.fn().mockResolvedValue(BMV_MISSING_RESOLUTION),
        upsertFlag: vi.fn().mockResolvedValue(newRow),
      });
      const panel = useFeatureFlagsPanel({ repository: repo, toast });
      await panel.load();
      expect(panel.items.value[0].rowStatus).toBe("missing");

      await panel.toggleFlag("bmv");

      expect(repo.upsertFlag).toHaveBeenCalledWith({
        key: "bmv",
        enabled: true,
      });
      expect(panel.items.value[0].rowStatus).toBe("present");
      expect(panel.items.value[0].resolvedEnabled).toBe(true);
    });

    it("no-ops for unknown key", async () => {
      const repo = createMockRepo({
        listFlags: vi.fn().mockResolvedValue([BMV_ROW]),
      });
      const panel = useFeatureFlagsPanel({ repository: repo, toast });
      await panel.load();

      await panel.toggleFlag("nonexistent");

      expect(repo.upsertFlag).not.toHaveBeenCalled();
    });
  });

  describe("resetFlag", () => {
    it("resets to catalog recommended default and shows toast", async () => {
      const disabledRow = { ...BMV_ROW, enabled: false };
      const resetRow = { ...BMV_ROW, enabled: true };
      const repo = createMockRepo({
        listFlags: vi.fn().mockResolvedValue([disabledRow]),
        resetFlag: vi.fn().mockResolvedValue(resetRow),
      });
      const panel = useFeatureFlagsPanel({ repository: repo, toast });
      await panel.load();

      await panel.resetFlag("bmv");

      expect(repo.resetFlag).toHaveBeenCalledWith(
        "bmv",
        expect.objectContaining({ recommendedDefaultEnabled: true }),
      );
      expect(panel.items.value[0].resolvedEnabled).toBe(true);
      expect(toast.show).toHaveBeenCalledWith("featureFlagUpdated");
    });

    it("shows failure toast on reset error", async () => {
      const repo = createMockRepo({
        listFlags: vi.fn().mockResolvedValue([BMV_ROW]),
        resetFlag: vi
          .fn()
          .mockRejectedValue(new FeatureFlagsAdminRepositoryError("fail", 500)),
      });
      const panel = useFeatureFlagsPanel({ repository: repo, toast });
      await panel.load();

      await panel.resetFlag("bmv");

      expect(toast.show).toHaveBeenCalledWith("featureFlagFailed");
    });

    it("no-ops for unknown flag (no catalog definition)", async () => {
      const repo = createMockRepo({
        listFlags: vi.fn().mockResolvedValue([UNKNOWN_ROW]),
      });
      const panel = useFeatureFlagsPanel({ repository: repo, toast });
      await panel.load();

      await panel.resetFlag("experiment-x");

      expect(repo.resetFlag).not.toHaveBeenCalled();
    });
  });
});
