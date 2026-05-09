import { ref, computed, type Ref, type ComputedRef } from "vue";
import type {
  FeatureFlagsAdminRepository,
  FeatureFlagRow,
  FeatureFlagResolution,
} from "./FeatureFlagsAdminRepository";
import type { FeatureFlagDefinition } from "./featureFlagCatalog";
import { FEATURE_FLAG_CATALOG } from "./featureFlagCatalog";
import type { ToastState } from "./settingsControllers";

/**
 *
 */
export type FlagRowStatus = "present" | "missing";

/**
 *
 */
export interface MergedFlagItem {
  /**
   *
   */
  key: string;
  /**
   *
   */
  catalogDefinition: FeatureFlagDefinition | null;
  /**
   *
   */
  serverRow: FeatureFlagRow | null;
  /**
   *
   */
  resolvedEnabled: boolean;
  /**
   *
   */
  rowStatus: FlagRowStatus;
}

/**
 *
 */
export interface UseFeatureFlagsPanelInput {
  /**
   *
   */
  repository: FeatureFlagsAdminRepository;
  /**
   *
   */
  toast: ToastState;
}

/**
 *
 */
export interface UseFeatureFlagsPanelReturn {
  /**
   *
   */
  loading: Ref<boolean>;
  /**
   *
   */
  saving: Ref<boolean>;
  /**
   *
   */
  error: Ref<string | null>;
  /**
   *
   */
  items: ComputedRef<MergedFlagItem[]>;
  /**
   *
   */
  load: () => Promise<void>;
  /**
   *
   */
  toggleFlag: (key: string) => Promise<void>;
  /**
   *
   */
  resetFlag: (key: string) => Promise<void>;
}

function buildMergedItems(
  serverRows: Ref<FeatureFlagRow[]>,
  resolutions: Ref<Record<string, FeatureFlagResolution>>,
): ComputedRef<MergedFlagItem[]> {
  return computed<MergedFlagItem[]>(() => {
    const result: MergedFlagItem[] = [];
    const seenKeys = new Set<string>();

    for (const def of FEATURE_FLAG_CATALOG) {
      seenKeys.add(def.key);
      const row = serverRows.value.find((r) => r.key === def.key) ?? null;
      const resolution = resolutions.value[def.key];
      const resolvedEnabled = row
        ? row.enabled
        : resolution
          ? resolution.enabled
          : false;

      result.push({
        key: def.key,
        catalogDefinition: def,
        serverRow: row,
        resolvedEnabled,
        rowStatus: row ? "present" : "missing",
      });
    }

    for (const row of serverRows.value) {
      if (seenKeys.has(row.key)) continue;
      result.push({
        key: row.key,
        catalogDefinition: null,
        serverRow: row,
        resolvedEnabled: row.enabled,
        rowStatus: "present",
      });
    }
    return result;
  });
}

async function loadFlags(
  repository: FeatureFlagsAdminRepository,
  serverRows: Ref<FeatureFlagRow[]>,
  resolutions: Ref<Record<string, FeatureFlagResolution>>,
  loading: Ref<boolean>,
  error: Ref<string | null>,
): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    serverRows.value = await repository.listFlags();

    const missingKeys = FEATURE_FLAG_CATALOG.filter(
      (def) => !serverRows.value.some((r) => r.key === def.key),
    ).map((def) => def.key);

    const settled = await Promise.allSettled(
      missingKeys.map((key) => repository.resolveFlag(key)),
    );

    const newResolutions: Record<string, FeatureFlagResolution> = {};
    for (const result of settled) {
      if (result.status === "fulfilled") {
        newResolutions[result.value.key] = result.value;
      }
    }
    resolutions.value = newResolutions;
  } catch {
    error.value = "load_failed";
  } finally {
    loading.value = false;
  }
}

interface PanelState {
  serverRows: Ref<FeatureFlagRow[]>;
  resolutions: Ref<Record<string, FeatureFlagResolution>>;
  saving: Ref<boolean>;
}

async function applyUpsert(
  state: PanelState,
  toast: ToastState,
  upsert: () => Promise<FeatureFlagRow>,
): Promise<void> {
  state.saving.value = true;
  try {
    const updatedRow = await upsert();
    state.serverRows.value = updateOrInsertRow(
      state.serverRows.value,
      updatedRow,
    );
    delete state.resolutions.value[updatedRow.key];
    toast.show("featureFlagUpdated");
  } catch {
    toast.show("featureFlagFailed");
  } finally {
    state.saving.value = false;
  }
}

/**
 * Feature flag 管理面板的状态与操作 Composable。
 *
 * @param input - 仓库与 toast 依赖注入
 * @returns 面板状态与操作方法
 */
export function useFeatureFlagsPanel(
  input: UseFeatureFlagsPanelInput,
): UseFeatureFlagsPanelReturn {
  const { repository, toast } = input;

  const loading = ref(false);
  const saving = ref(false);
  const error = ref<string | null>(null);
  const serverRows = ref<FeatureFlagRow[]>([]);
  const resolutions = ref<Record<string, FeatureFlagResolution>>({});
  const state: PanelState = { serverRows, resolutions, saving };

  const items = buildMergedItems(serverRows, resolutions);

  return {
    loading,
    saving,
    error,
    items,
    load: () => loadFlags(repository, serverRows, resolutions, loading, error),
    toggleFlag(key: string) {
      const item = items.value.find((i) => i.key === key);
      if (!item) return Promise.resolve();
      return applyUpsert(state, toast, () =>
        repository.upsertFlag({ key, enabled: !item.resolvedEnabled }),
      );
    },
    resetFlag(key: string) {
      const item = items.value.find((i) => i.key === key);
      if (!item?.catalogDefinition) return Promise.resolve();
      return applyUpsert(state, toast, () =>
        repository.resetFlag(key, item.catalogDefinition!),
      );
    },
  };
}

function updateOrInsertRow(
  rows: FeatureFlagRow[],
  updated: FeatureFlagRow,
): FeatureFlagRow[] {
  const idx = rows.findIndex((r) => r.key === updated.key);
  if (idx >= 0) {
    const next = [...rows];
    next[idx] = updated;
    return next;
  }
  return [...rows, updated];
}
