<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { resolveLeadBmvBlockerI18nKey } from "../model/LeadBmvGateBinding";
import type { ServerBlocker } from "../model/LeadRepository";
import { buildLeadBmvCustomerIntakeHref } from "../model/leadBmvCustomerDeepLink";
import {
  persistLeadCaseCreateResume,
  type LeadCaseCreateResumePayload,
} from "../../../shared/navigation/sessionResumeKeys";

/**
 * BMV 建案门禁阻断列表渲染组件。
 *
 * 用于在 LeadConvertCaseDialog 内 inline 展示服务端 `CASE_BMV_GATE_BLOCKED`
 * 返回的 4 类阻断码（QUESTIONNAIRE_NOT_RETURNED / QUOTE_NOT_CONFIRMED /
 * NOT_SIGNED / INTAKE_NOT_READY），引导用户回到对应步骤补齐前置条件。
 *
 * - role="alert" + aria-live="assertive"：屏幕阅读器立即通告
 * - blocker 顺序与服务端响应一致；同义阻断会被 binding 自动去重
 */
const props = defineProps<{
  blockers: ServerBlocker[];
  /** 已关联客户；有值时为每条阻断渲染「去处理」深链。 */
  customerId?: string;
  /** 从线索转案件进入时在跳转前写入 session，便于客户页回到线索继续建档。 */
  resumeLeadCaseContext?: LeadCaseCreateResumePayload | null;
}>();

const { t } = useI18n();

const distinctBlockers = computed(() => {
  const seen = new Set<string>();
  const out: ServerBlocker[] = [];
  for (const b of props.blockers) {
    const code = b.code?.trim();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    out.push(b);
  }
  return out;
});

/**
 * 在跳转至客户详情 hash 前按需写入「回到线索继续转案件」上下文，并更新
 * `window.location.hash`。
 *
 * @param href - 以 `#` 开头的 hash 路由目标
 */
function navigateHashHref(href: string): void {
  if (props.resumeLeadCaseContext) {
    persistLeadCaseCreateResume(props.resumeLeadCaseContext);
  }
  window.location.hash = href.startsWith("#") ? href : `#${href}`;
}

/**
 * 按阻断码生成单条清单项对应的客户承接深链。
 *
 * @param code - 服务端阻断码
 * @returns hash 路由 href；无客户 ID 时返回 `#`
 */
function blockerHref(code: string): string {
  const cid = props.customerId?.trim();
  if (!cid) return "#";
  return buildLeadBmvCustomerIntakeHref(cid, code);
}

const defaultIntakeHref = computed(() => {
  const cid = props.customerId?.trim();
  if (!cid) return "";
  return buildLeadBmvCustomerIntakeHref(cid);
});
</script>

<template>
  <section
    v-if="distinctBlockers.length > 0"
    class="bmv-gate-blocker-list"
    role="alert"
    aria-live="assertive"
    data-testid="bmv-gate-blocker-list"
  >
    <h4 class="bmv-gate-blocker-list__title">
      {{ t("leads.errors.bmvGate.title") }}
    </h4>
    <p class="bmv-gate-blocker-list__desc">
      {{ t("leads.errors.bmvGate.description") }}
    </p>
    <ul class="bmv-gate-blocker-list__items">
      <li
        v-for="(blocker, idx) in distinctBlockers"
        :key="blocker.code + ':' + idx"
        class="bmv-gate-blocker-list__item"
      >
        <span class="bmv-gate-blocker-list__text">{{
          t(resolveLeadBmvBlockerI18nKey(blocker.code))
        }}</span>
        <a
          v-if="customerId?.trim()"
          class="bmv-gate-blocker-list__item-link"
          :href="blockerHref(blocker.code)"
          data-testid="bmv-gate-blocker-item-link"
          @click.prevent="navigateHashHref(blockerHref(blocker.code))"
        >
          {{ t("leads.errors.bmvGate.openSectionLink") }}
        </a>
      </li>
    </ul>
    <a
      v-if="defaultIntakeHref"
      class="bmv-gate-blocker-list__link"
      :href="defaultIntakeHref"
      data-testid="bmv-gate-recovery-link"
      @click.prevent="navigateHashHref(defaultIntakeHref)"
    >
      {{ t("leads.errors.bmvGate.gotoCustomerIntakeLink") }}
    </a>
  </section>
</template>

<style scoped>
.bmv-gate-blocker-list {
  border: 1px solid var(--color-warning-border, #f0b429);
  background: var(--color-warning-bg, #fffaf0);
  border-radius: var(--radius-md, 8px);
  padding: 12px 14px;
  display: grid;
  gap: 8px;
}

.bmv-gate-blocker-list__title {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-warning-text, #ad6800);
}

.bmv-gate-blocker-list__desc {
  margin: 0;
  font-size: var(--font-size-xs, 12px);
  color: var(--color-text-3);
}

.bmv-gate-blocker-list__items {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 6px;
  font-size: var(--font-size-sm);
  color: var(--color-text-1);
}

.bmv-gate-blocker-list__item {
  line-height: var(--leading-sm, 1.4);
  list-style: disc;
}

.bmv-gate-blocker-list__text {
  margin-right: 6px;
}

.bmv-gate-blocker-list__item-link {
  font-size: var(--font-size-xs, 12px);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary-6);
  text-decoration: none;
  white-space: nowrap;
}

.bmv-gate-blocker-list__item-link:hover {
  text-decoration: underline;
}

.bmv-gate-blocker-list__link {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary-6);
  text-decoration: none;
}

.bmv-gate-blocker-list__link:hover {
  text-decoration: underline;
}
</style>
