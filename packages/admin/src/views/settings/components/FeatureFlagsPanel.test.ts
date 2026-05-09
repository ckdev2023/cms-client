import { describe, it, expect, vi, beforeEach } from "vitest";
import { shallowMount } from "@vue/test-utils";
import { ref, computed } from "vue";
import FeatureFlagsPanel from "./FeatureFlagsPanel.vue";
import ToggleSwitch from "../../../shared/ui/ToggleSwitch.vue";
import Button from "../../../shared/ui/Button.vue";
import { i18n, setAppLocale } from "../../../i18n";
import type {
  UseFeatureFlagsPanelReturn,
  MergedFlagItem,
} from "../model/useFeatureFlagsPanel";

function createMockPanel(
  overrides: Partial<UseFeatureFlagsPanelReturn> = {},
): UseFeatureFlagsPanelReturn {
  return {
    loading: ref(false),
    saving: ref(false),
    error: ref(null),
    items: computed(() => []),
    load: vi.fn(),
    toggleFlag: vi.fn(),
    resetFlag: vi.fn(),
    ...overrides,
  };
}

const CATALOG_ROW_PRESENT: MergedFlagItem = {
  key: "bmv",
  catalogDefinition: {
    key: "bmv",
    labelKey: "settings.featureFlags.bmv.label",
    descriptionKey: "settings.featureFlags.bmv.description",
    recommendedDefaultEnabled: true,
  },
  serverRow: {
    id: "ff-1",
    orgId: "org-1",
    key: "bmv",
    enabled: true,
    payload: {},
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-05-01T00:00:00Z",
  },
  resolvedEnabled: true,
  rowStatus: "present",
};

const CATALOG_ROW_MISSING: MergedFlagItem = {
  key: "bmv",
  catalogDefinition: {
    key: "bmv",
    labelKey: "settings.featureFlags.bmv.label",
    descriptionKey: "settings.featureFlags.bmv.description",
    recommendedDefaultEnabled: true,
  },
  serverRow: null,
  resolvedEnabled: false,
  rowStatus: "missing",
};

const UNKNOWN_ROW: MergedFlagItem = {
  key: "experiment-x",
  catalogDefinition: null,
  serverRow: {
    id: "ff-2",
    orgId: "org-1",
    key: "experiment-x",
    enabled: false,
    payload: {},
    createdAt: "2026-04-01T00:00:00Z",
    updatedAt: "2026-04-15T00:00:00Z",
  },
  resolvedEnabled: false,
  rowStatus: "present",
};

function mountPanel(panel: UseFeatureFlagsPanelReturn) {
  return shallowMount(FeatureFlagsPanel, {
    props: { panel },
    global: { plugins: [i18n] },
  });
}

describe("FeatureFlagsPanel", () => {
  beforeEach(() => {
    setAppLocale("en-US");
  });

  it("calls load on mount", () => {
    const panel = createMockPanel();
    mountPanel(panel);
    expect(panel.load).toHaveBeenCalled();
  });

  it("shows skeleton while loading", () => {
    const panel = createMockPanel({ loading: ref(true) });
    const wrapper = mountPanel(panel);
    expect(wrapper.findAll(".ff-panel__skeleton-card")).toHaveLength(2);
    expect(wrapper.findAll(".ff-panel__card")).toHaveLength(0);
  });

  it("shows error when load fails", () => {
    const panel = createMockPanel({ error: ref("load_failed") });
    const wrapper = mountPanel(panel);
    expect(wrapper.find(".ff-panel__error").exists()).toBe(true);
  });

  describe("catalog flag with server row present", () => {
    it("renders card with toggle and reset button", () => {
      const items = ref([CATALOG_ROW_PRESENT]);
      const panel = createMockPanel({
        items: computed(() => items.value),
      });
      const wrapper = mountPanel(panel);

      const cards = wrapper.findAll(".ff-panel__card");
      expect(cards).toHaveLength(1);
      expect(cards[0].find(".ff-panel__card-label").text()).toContain("BMV");
      expect(cards[0].findComponent(ToggleSwitch).exists()).toBe(true);
      expect(cards[0].findComponent(ToggleSwitch).props("modelValue")).toBe(
        true,
      );
      expect(cards[0].findComponent(Button).exists()).toBe(true);
    });

    it("shows enabled status badge", () => {
      const items = ref([CATALOG_ROW_PRESENT]);
      const panel = createMockPanel({
        items: computed(() => items.value),
      });
      const wrapper = mountPanel(panel);
      const badge = wrapper.find(".ff-panel__status-badge--enabled");
      expect(badge.exists()).toBe(true);
    });

    it("does not show row-missing notice", () => {
      const items = ref([CATALOG_ROW_PRESENT]);
      const panel = createMockPanel({
        items: computed(() => items.value),
      });
      const wrapper = mountPanel(panel);
      expect(wrapper.find(".ff-panel__row-missing").exists()).toBe(false);
    });

    it("does not show unknown warning", () => {
      const items = ref([CATALOG_ROW_PRESENT]);
      const panel = createMockPanel({
        items: computed(() => items.value),
      });
      const wrapper = mountPanel(panel);
      expect(wrapper.find(".ff-panel__unknown-warning").exists()).toBe(false);
    });

    it("shows recommended default hint", () => {
      const items = ref([CATALOG_ROW_PRESENT]);
      const panel = createMockPanel({
        items: computed(() => items.value),
      });
      const wrapper = mountPanel(panel);
      expect(wrapper.find(".ff-panel__recommend").exists()).toBe(true);
    });
  });

  describe("catalog flag with server row missing", () => {
    it("renders card with disabled status", () => {
      const items = ref([CATALOG_ROW_MISSING]);
      const panel = createMockPanel({
        items: computed(() => items.value),
      });
      const wrapper = mountPanel(panel);

      const badge = wrapper.find(".ff-panel__status-badge--disabled");
      expect(badge.exists()).toBe(true);
    });

    it("shows row-missing notice", () => {
      const items = ref([CATALOG_ROW_MISSING]);
      const panel = createMockPanel({
        items: computed(() => items.value),
      });
      const wrapper = mountPanel(panel);
      expect(wrapper.find(".ff-panel__row-missing").exists()).toBe(true);
    });

    it("has reset button available", () => {
      const items = ref([CATALOG_ROW_MISSING]);
      const panel = createMockPanel({
        items: computed(() => items.value),
      });
      const wrapper = mountPanel(panel);
      expect(wrapper.findComponent(Button).exists()).toBe(true);
    });
  });

  describe("unknown flag (not in catalog)", () => {
    it("renders card with unknown warning", () => {
      const items = ref([UNKNOWN_ROW]);
      const panel = createMockPanel({
        items: computed(() => items.value),
      });
      const wrapper = mountPanel(panel);

      expect(wrapper.find(".ff-panel__unknown-warning").exists()).toBe(true);
      expect(wrapper.find(".ff-panel__card--unknown").exists()).toBe(true);
    });

    it("has toggle available", () => {
      const items = ref([UNKNOWN_ROW]);
      const panel = createMockPanel({
        items: computed(() => items.value),
      });
      const wrapper = mountPanel(panel);
      expect(wrapper.findComponent(ToggleSwitch).exists()).toBe(true);
    });

    it("does not have reset button", () => {
      const items = ref([UNKNOWN_ROW]);
      const panel = createMockPanel({
        items: computed(() => items.value),
      });
      const wrapper = mountPanel(panel);
      expect(wrapper.findComponent(Button).exists()).toBe(false);
    });

    it("does not show recommended default hint", () => {
      const items = ref([UNKNOWN_ROW]);
      const panel = createMockPanel({
        items: computed(() => items.value),
      });
      const wrapper = mountPanel(panel);
      expect(wrapper.find(".ff-panel__recommend").exists()).toBe(false);
    });
  });

  describe("mixed catalog + unknown flags", () => {
    it("renders all items", () => {
      const items = ref([CATALOG_ROW_PRESENT, UNKNOWN_ROW]);
      const panel = createMockPanel({
        items: computed(() => items.value),
      });
      const wrapper = mountPanel(panel);
      expect(wrapper.findAll(".ff-panel__card")).toHaveLength(2);
    });
  });

  describe("interactions", () => {
    it("toggle emits panel.toggleFlag with correct key", async () => {
      const items = ref([CATALOG_ROW_PRESENT]);
      const panel = createMockPanel({
        items: computed(() => items.value),
      });
      const wrapper = mountPanel(panel);

      wrapper.findComponent(ToggleSwitch).vm.$emit("update:modelValue", false);
      await wrapper.vm.$nextTick();

      expect(panel.toggleFlag).toHaveBeenCalledWith("bmv");
    });

    it("reset button click calls panel.resetFlag with correct key", async () => {
      const items = ref([CATALOG_ROW_PRESENT]);
      const panel = createMockPanel({
        items: computed(() => items.value),
      });
      const wrapper = mountPanel(panel);

      await wrapper.findComponent(Button).trigger("click");

      expect(panel.resetFlag).toHaveBeenCalledWith("bmv");
    });

    it("toggle on unknown flag calls panel.toggleFlag", async () => {
      const items = ref([UNKNOWN_ROW]);
      const panel = createMockPanel({
        items: computed(() => items.value),
      });
      const wrapper = mountPanel(panel);

      wrapper.findComponent(ToggleSwitch).vm.$emit("update:modelValue", true);
      await wrapper.vm.$nextTick();

      expect(panel.toggleFlag).toHaveBeenCalledWith("experiment-x");
    });

    it("disables toggle and reset button while saving", () => {
      const items = ref([CATALOG_ROW_PRESENT]);
      const panel = createMockPanel({
        items: computed(() => items.value),
        saving: ref(true),
      });
      const wrapper = mountPanel(panel);

      expect(wrapper.findComponent(ToggleSwitch).props("disabled")).toBe(true);
      expect(wrapper.findComponent(Button).props("disabled")).toBe(true);
    });
  });
});
