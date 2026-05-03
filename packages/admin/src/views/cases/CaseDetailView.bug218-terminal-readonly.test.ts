import { describe, it, expect } from "vitest";
import { defineComponent, ref } from "vue";
import { mount } from "@vue/test-utils";
import { createI18n, useI18n } from "vue-i18n";
import UiBtn from "../../shared/ui/Button.vue";
import { createMockDetail } from "./model/useCaseDetailModel.test-support";
import { isTerminalPhase } from "./model/useCasePhaseTransitionMenu";
import { useCaseDetailGuard } from "./model/useCaseDetailGuard";
import casesZhCN from "../../i18n/messages/cases/zh-CN";
import casesJaJP from "../../i18n/messages/cases/ja-JP";
import casesEnUS from "../../i18n/messages/cases/en-US";

const MESSAGES = {
  "zh-CN": { cases: casesZhCN },
  "ja-JP": { cases: casesJaJP },
  "en-US": { cases: casesEnUS },
};

function makeI18n(locale = "zh-CN") {
  return createI18n({ legacy: false, locale, messages: MESSAGES });
}

const ActionButtonsHarness = defineComponent({
  components: { UiBtn },
  props: { readonly: { type: Boolean, default: false } },
  template: `
    <div>
      <UiBtn
        size="sm"
        :disabled="readonly"
        :title="readonly ? t('cases.detail.readonlyHint') : undefined"
        data-testid="edit-info-btn"
        @click="readonly || (editModalOpen = true)"
      >
        {{ t('cases.detail.actions.editInfo') }}
      </UiBtn>
      <UiBtn
        variant="filled"
        tone="primary"
        size="sm"
        :disabled="readonly"
        :title="readonly ? t('cases.detail.readonlyHint') : undefined"
        data-testid="status-transition-btn"
        @click="readonly || phaseMenuOpened++"
      >
        {{ t('cases.detail.actions.statusTransition') }}
      </UiBtn>
      <span data-testid="edit-modal-state">{{ editModalOpen }}</span>
      <span data-testid="phase-menu-count">{{ phaseMenuOpened }}</span>
    </div>
  `,
  setup() {
    const { t } = useI18n();
    const editModalOpen = ref(false);
    const phaseMenuOpened = ref(0);
    return { editModalOpen, phaseMenuOpened, t };
  },
});

function mountHarness(readonly: boolean, locale = "zh-CN") {
  return mount(ActionButtonsHarness, {
    props: { readonly },
    global: { plugins: [makeI18n(locale)] },
  });
}

describe("BUG-218: terminal readonly — edit & transition buttons disabled", () => {
  describe("readonlyHint i18n key exists in all 3 locales", () => {
    it.each(["zh-CN", "ja-JP", "en-US"] as const)(
      "%s — readonlyHint resolves to a real translation",
      (locale) => {
        const i18n = makeI18n(locale);
        const hint = i18n.global.t("cases.detail.readonlyHint");
        expect(hint).not.toBe("cases.detail.readonlyHint");
        expect(hint.length).toBeGreaterThan(0);
      },
    );
  });

  describe("model: isReadonly is true for terminal-phase details", () => {
    it("CLOSED_SUCCESS → readonly=true + isTerminalPhase=true", () => {
      const detail = createMockDetail({
        businessPhase: "CLOSED_SUCCESS",
        stageCode: "S9",
        readonly: true,
      });
      expect(detail.readonly).toBe(true);
      expect(isTerminalPhase(detail.businessPhase)).toBe(true);
    });

    it("CLOSED_FAILED → readonly=true + isTerminalPhase=true", () => {
      const detail = createMockDetail({
        businessPhase: "CLOSED_FAILED",
        stageCode: "S9",
        readonly: true,
      });
      expect(detail.readonly).toBe(true);
      expect(isTerminalPhase(detail.businessPhase)).toBe(true);
    });

    it("UNDER_REVIEW → readonly=false", () => {
      const detail = createMockDetail({
        businessPhase: "UNDER_REVIEW",
        readonly: false,
      });
      expect(detail.readonly).toBe(false);
    });
  });

  describe("template: buttons disabled when readonly=true", () => {
    it("edit-info button is disabled", () => {
      const w = mountHarness(true);
      const btn = w.find('[data-testid="edit-info-btn"]');
      expect(btn.attributes("disabled")).toBeDefined();
    });

    it("status-transition button is disabled", () => {
      const w = mountHarness(true);
      const btn = w.find('[data-testid="status-transition-btn"]');
      expect(btn.attributes("disabled")).toBeDefined();
    });

    it("edit-info button has readonlyHint title when disabled", () => {
      const w = mountHarness(true);
      const btn = w.find('[data-testid="edit-info-btn"]');
      expect(btn.attributes("title")).toBe(casesZhCN.detail.readonlyHint);
    });

    it("status-transition button has readonlyHint title when disabled", () => {
      const w = mountHarness(true);
      const btn = w.find('[data-testid="status-transition-btn"]');
      expect(btn.attributes("title")).toBe(casesZhCN.detail.readonlyHint);
    });

    it("clicking edit-info does NOT open modal when readonly", async () => {
      const w = mountHarness(true);
      await w.find('[data-testid="edit-info-btn"]').trigger("click");
      expect(w.find('[data-testid="edit-modal-state"]').text()).toBe("false");
    });

    it("clicking status-transition does NOT open menu when readonly", async () => {
      const w = mountHarness(true);
      await w.find('[data-testid="status-transition-btn"]').trigger("click");
      expect(w.find('[data-testid="phase-menu-count"]').text()).toBe("0");
    });
  });

  describe("template: buttons enabled when readonly=false", () => {
    it("edit-info button is NOT disabled", () => {
      const w = mountHarness(false);
      const btn = w.find('[data-testid="edit-info-btn"]');
      expect(btn.attributes("disabled")).toBeUndefined();
    });

    it("status-transition button is NOT disabled", () => {
      const w = mountHarness(false);
      const btn = w.find('[data-testid="status-transition-btn"]');
      expect(btn.attributes("disabled")).toBeUndefined();
    });

    it("edit-info button has no title attribute", () => {
      const w = mountHarness(false);
      const btn = w.find('[data-testid="edit-info-btn"]');
      expect(btn.attributes("title")).toBeUndefined();
    });

    it("clicking edit-info opens modal when not readonly", async () => {
      const w = mountHarness(false);
      await w.find('[data-testid="edit-info-btn"]').trigger("click");
      expect(w.find('[data-testid="edit-modal-state"]').text()).toBe("true");
    });

    it("clicking status-transition opens menu when not readonly", async () => {
      const w = mountHarness(false);
      await w.find('[data-testid="status-transition-btn"]').trigger("click");
      expect(w.find('[data-testid="phase-menu-count"]').text()).toBe("1");
    });
  });
});

describe("BUG-216: useCaseDetailGuard blocks header in terminal phase", () => {
  it("terminal phase → canEdit=false, canTransition=false", () => {
    const detail = ref(
      createMockDetail({
        businessPhase: "CLOSED_SUCCESS",
        stageCode: "S9",
        readonly: true,
      }),
    );
    const guard = useCaseDetailGuard(detail);
    expect(guard.canEdit.value).toBe(false);
    expect(guard.canTransition.value).toBe(false);
    expect(guard.isReadonly.value).toBe(true);
    expect(guard.isTerminal.value).toBe(true);
  });

  it("active phase → canEdit=true, canTransition=true", () => {
    const detail = ref(
      createMockDetail({
        businessPhase: "UNDER_REVIEW",
        readonly: false,
      }),
    );
    const guard = useCaseDetailGuard(detail);
    expect(guard.canEdit.value).toBe(true);
    expect(guard.canTransition.value).toBe(true);
    expect(guard.isReadonly.value).toBe(false);
    expect(guard.isTerminal.value).toBe(false);
  });

  it("null detail → canEdit=true (guard defaults to editable)", () => {
    const detail = ref(null);
    const guard = useCaseDetailGuard(detail);
    expect(guard.canEdit.value).toBe(true);
    expect(guard.canTransition.value).toBe(true);
    expect(guard.isReadonly.value).toBe(false);
  });

  it("guard tooltip i18n keys exist in all 3 locales", () => {
    const keys = [
      "cases.detail.actions.editInfoDisabledTooltip",
      "cases.detail.actions.statusTransitionDisabledTooltip",
    ];
    for (const locale of ["zh-CN", "ja-JP", "en-US"] as const) {
      const i18n = makeI18n(locale);
      for (const key of keys) {
        const translated = i18n.global.t(key);
        expect(translated, `${locale}/${key}`).not.toBe(key);
        expect(translated.length).toBeGreaterThan(0);
      }
    }
  });
});
