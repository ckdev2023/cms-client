<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import PageHeader from "../../shared/ui/PageHeader.vue";
import Button from "../../shared/ui/Button.vue";
import CaseTemplateCreateDialog from "./CaseTemplateCreateDialog.vue";
import { createCaseTemplatesRepository } from "./model/CaseTemplatesRepository";
import type {
  CaseTemplateCreateParams,
  CaseTemplateDetail,
} from "./model/CaseTemplatesRepository";
import { useCaseTemplatesListModel } from "./model/useCaseTemplatesListModel";
import { useCaseTemplateWriteModel } from "./model/useCaseTemplateWriteModel";
import { getCaseTypeI18nKey } from "../../shared/model/caseTypeI18n";
import { getDefaultPermissionsStore } from "../../shared/model/PermissionsStore";

/** 案件資料蓝图列表页 — 展示全量蓝图模板，支持按案件类型筛选、启停切换及新建模板。 */
const { t } = useI18n();

const repository = createCaseTemplatesRepository();
const permissionsStore = getDefaultPermissionsStore();
const includeInactive = ref(false);
const filterCaseType = ref("");

/** 与后端 POST/PATCH `case-templates` 一致：`settings.write`。 */
const canEditTemplates = computed(
  () => permissionsStore.loaded.value && permissionsStore.has("settings.write"),
);

/**
 * 组装当前列表查询参数。
 * @returns 查询参数对象
 */
function currentListParams() {
  return {
    includeInactive: includeInactive.value,
    caseType: filterCaseType.value || undefined,
  };
}

const listModel = useCaseTemplatesListModel({
  repository,
  params: { includeInactive: false },
});

const writeModel = useCaseTemplateWriteModel({
  repository,
  onSuccess: () => listModel.refresh(currentListParams()),
});

watch([includeInactive, filterCaseType], () => {
  listModel.refresh(currentListParams());
});

const displayItems = computed(() => {
  let items = listModel.items.value;
  if (filterCaseType.value) {
    items = items.filter((i) => i.caseType === filterCaseType.value);
  }
  return items;
});

// ── create dialog ─────────────────────────────────────
const showCreateDialog = ref(false);
const loadingSource = ref(false);
const sourceDetail = ref<CaseTemplateDetail | null>(null);

/** 打开新建模板对话框并重置复制来源状态。 */
function openCreateDialog() {
  writeModel.clearError();
  sourceDetail.value = null;
  loadingSource.value = false;
  showCreateDialog.value = true;
}

async function handleRequestSource(id: string) {
  loadingSource.value = true;
  sourceDetail.value = null;
  try {
    sourceDetail.value = await repository.get(id);
  } catch {
    sourceDetail.value = null;
  } finally {
    loadingSource.value = false;
  }
}

async function handleCreateSubmit(params: CaseTemplateCreateParams) {
  const ok = await writeModel.create(params);
  if (ok) showCreateDialog.value = false;
}

// ── toggle active ─────────────────────────────────────
const togglingId = ref<string | null>(null);

async function handleToggleActive(item: (typeof displayItems.value)[0]) {
  togglingId.value = item.id;
  await writeModel.toggleActive(item);
  togglingId.value = null;
}

/**
 * 格式化 ISO 日期字符串为本地化短日期。
 * @param iso ISO 日期字符串
 * @returns 本地化日期文本
 */
function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

/**
 * 将案件类型代码转为 i18n 标签，无匹配时回退为原始代码。
 * @param code 案件类型代码
 * @returns 翻译后的标签文本
 */
function caseTypeLabel(code: string): string {
  const key = getCaseTypeI18nKey(code);
  const translated = t(key);
  return translated !== key ? translated : code;
}

const BILLING_GATE_MODE_I18N_KEYS = ["warn", "block", "none"] as const;

/**
 * 收费闸口模式枚举值 → 与新建弹窗一致的 i18n 标签。
 * @param mode 后端/仓库返回的 billingGateMode
 * @returns 本地化后的闸口模式标签；未知值时原样返回 mode
 */
function billingGateLabel(mode: string): string {
  const raw = mode.trim().toLowerCase();
  const slug = raw === "off" ? "none" : raw;
  const key = `caseTemplates.createDialog.billingGateModes.${slug}`;
  if (
    !(BILLING_GATE_MODE_I18N_KEYS as readonly string[]).includes(slug) &&
    t(key) === key
  ) {
    return mode;
  }
  return t(key);
}
</script>

<template>
  <div class="ct-list-view">
    <PageHeader
      :title="t('caseTemplates.title')"
      :subtitle="t('caseTemplates.subtitle')"
      :breadcrumbs="[
        { label: t('shell.nav.items.dashboard'), href: '#/' },
        { label: t('shell.nav.groups.system') },
        { label: t('caseTemplates.breadcrumb') },
      ]"
    />

    <div
      v-if="listModel.errorCode.value"
      class="ct-list-view__alert ct-list-view__alert--danger"
      role="alert"
      data-testid="list-error-banner"
    >
      <div class="ct-list-view__alert-row">
        <p class="ct-list-view__alert-title">
          {{
            listModel.errorCode.value === "unauthorized"
              ? t("caseTemplates.state.unauthorized")
              : t("caseTemplates.state.requestFailed")
          }}
        </p>
        <Button
          v-if="listModel.errorCode.value !== 'unauthorized'"
          variant="outlined"
          size="sm"
          data-testid="list-retry-button"
          @click="listModel.refresh(currentListParams())"
        >
          {{ t("caseTemplates.state.retry") }}
        </Button>
      </div>
    </div>

    <!-- write feedback (toggle / inline errors shown outside dialog) -->
    <div
      v-if="writeModel.errorCode.value && !showCreateDialog"
      class="ct-list-view__alert ct-list-view__alert--danger"
      role="alert"
      data-testid="write-error-banner"
    >
      <div class="ct-list-view__alert-row">
        <p class="ct-list-view__alert-title">
          {{
            writeModel.errorCode.value === "unauthorized"
              ? t("caseTemplates.writeState.unauthorized")
              : writeModel.errorCode.value === "validation"
                ? t("caseTemplates.writeState.validation")
                : t("caseTemplates.writeState.requestFailed")
          }}
        </p>
        <Button variant="ghost" size="sm" @click="writeModel.clearError()">
          ✕
        </Button>
      </div>
    </div>

    <div class="ct-list-view__toolbar">
      <div class="ct-list-view__filters">
        <select
          id="filter-case-type"
          v-model="filterCaseType"
          class="ct-list-view__filter-select"
          data-testid="filter-case-type"
        >
          <option value="">
            {{ t("caseTemplates.filters.caseTypeAll") }}
          </option>
          <option
            v-for="ct in listModel.caseTypeOptions.value"
            :key="ct"
            :value="ct"
          >
            {{ caseTypeLabel(ct) }}
          </option>
        </select>

        <label class="ct-list-view__filter-checkbox">
          <input
            id="filter-include-inactive"
            v-model="includeInactive"
            type="checkbox"
            data-testid="filter-include-inactive"
          />
          {{ t("caseTemplates.filters.includeInactive") }}
        </label>
      </div>

      <Button
        v-if="canEditTemplates"
        variant="filled"
        tone="primary"
        size="sm"
        html-type="button"
        data-testid="create-template-button"
        @click="openCreateDialog"
      >
        {{ t("caseTemplates.actions.create") }}
      </Button>
    </div>

    <div class="ct-list-view__table-card">
      <div
        v-if="listModel.loading.value"
        class="ct-list-view__loading-bar"
        role="status"
        data-testid="list-loading"
      >
        <div class="ct-list-view__loading-bar-inner" />
      </div>

      <div
        v-if="displayItems.length === 0 && !listModel.loading.value"
        class="ct-list-view__empty"
      >
        <p class="ct-list-view__empty-title">
          {{ t("caseTemplates.empty.title") }}
        </p>
        <p class="ct-list-view__empty-desc">
          {{ t("caseTemplates.empty.description") }}
        </p>
      </div>

      <div v-else data-h5-mode="scroll">
        <table class="ct-list-view__table" data-testid="case-templates-table">
          <thead>
            <tr>
              <th>{{ t("caseTemplates.columns.templateName") }}</th>
              <th>{{ t("caseTemplates.columns.caseType") }}</th>
              <th>{{ t("caseTemplates.columns.applicationType") }}</th>
              <th class="ct-list-view__col-number">
                {{ t("caseTemplates.columns.blueprintItems") }}
              </th>
              <th>{{ t("caseTemplates.columns.reviewRequired") }}</th>
              <th>{{ t("caseTemplates.columns.billingGate") }}</th>
              <th>{{ t("caseTemplates.columns.active") }}</th>
              <th>{{ t("caseTemplates.columns.updatedAt") }}</th>
              <th class="ct-list-view__col-actions" />
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in displayItems"
              :key="item.id"
              class="ct-list-view__row"
              :data-testid="`template-row-${item.id}`"
            >
              <td class="ct-list-view__cell-name">
                {{ item.templateName }}
              </td>
              <td>
                <span class="ct-list-view__chip">
                  {{ caseTypeLabel(item.caseType) }}
                </span>
              </td>
              <td>
                {{
                  item.applicationType ||
                  t("caseTemplates.applicationType.none")
                }}
              </td>
              <td class="ct-list-view__col-number">
                <span
                  :class="[
                    'ct-list-view__badge',
                    item.blueprintItemCount === 0
                      ? 'ct-list-view__badge--empty'
                      : '',
                  ]"
                >
                  {{ item.blueprintItemCount }}
                </span>
              </td>
              <td>
                {{
                  item.reviewRequiredFlag
                    ? t("caseTemplates.reviewFlag.yes")
                    : t("caseTemplates.reviewFlag.no")
                }}
              </td>
              <td>
                <span class="ct-list-view__chip ct-list-view__chip--subtle">
                  {{ billingGateLabel(item.billingGateMode) }}
                </span>
              </td>
              <td>
                <span
                  :class="[
                    'ct-list-view__status',
                    item.activeFlag
                      ? 'ct-list-view__status--active'
                      : 'ct-list-view__status--inactive',
                  ]"
                >
                  {{
                    item.activeFlag
                      ? t("caseTemplates.status.active")
                      : t("caseTemplates.status.inactive")
                  }}
                </span>
              </td>
              <td class="ct-list-view__cell-date">
                {{ formatDate(item.updatedAt) }}
              </td>
              <td class="ct-list-view__cell-actions">
                <Button
                  v-if="canEditTemplates"
                  variant="ghost"
                  size="sm"
                  html-type="button"
                  :loading="togglingId === item.id"
                  :data-testid="`toggle-active-${item.id}`"
                  @click="handleToggleActive(item)"
                >
                  {{
                    item.activeFlag
                      ? t("caseTemplates.actions.deactivate")
                      : t("caseTemplates.actions.activate")
                  }}
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <CaseTemplateCreateDialog
      v-if="showCreateDialog"
      :saving="writeModel.saving.value"
      :error-code="writeModel.errorCode.value"
      :case-type-options="listModel.caseTypeOptions.value"
      :source-templates="listModel.items.value"
      :loading-source="loadingSource"
      :source-detail="sourceDetail"
      @submit="handleCreateSubmit"
      @cancel="showCreateDialog = false"
      @request-source="handleRequestSource"
    />
  </div>
</template>

<style scoped>
/* prettier-ignore */
.ct-list-view { display: grid; gap: 24px; }
/* prettier-ignore */
.ct-list-view__alert { padding: 16px; border-radius: var(--radius-lg); border: 1px solid; }
/* prettier-ignore */
.ct-list-view__alert--danger { border-color: var(--color-danger-border, #fecaca); background: var(--color-danger-bg, #fef2f2); }
/* prettier-ignore */
.ct-list-view__alert--danger .ct-list-view__alert-title { color: var(--color-danger-text); }
/* prettier-ignore */
.ct-list-view__alert-title { margin: 0; font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); }
/* prettier-ignore */
.ct-list-view__alert-row { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
/* prettier-ignore */
.ct-list-view__toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
/* prettier-ignore */
.ct-list-view__filters { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
/* prettier-ignore */
.ct-list-view__filter-select { padding: 6px 12px; border: 1px solid var(--color-border-1); border-radius: var(--radius-md); font-size: var(--font-size-sm); background: var(--color-bg-1); color: var(--color-text-1); min-width: 180px; }
/* prettier-ignore */
.ct-list-view__filter-checkbox { display: flex; align-items: center; gap: 6px; font-size: var(--font-size-sm); color: var(--color-text-2); cursor: pointer; user-select: none; }
/* prettier-ignore */
.ct-list-view__table-card { position: relative; background: var(--color-bg-1); border: 1px solid var(--color-border-1); border-radius: var(--radius-xl); box-shadow: var(--shadow-1); overflow: hidden; }
/* prettier-ignore */
.ct-list-view__loading-bar { position: absolute; top: 0; left: 0; right: 0; height: 3px; overflow: hidden; z-index: 1; background: var(--color-primary-bg, #eff6ff); }
/* prettier-ignore */
.ct-list-view__loading-bar-inner { width: 40%; height: 100%; background: var(--color-primary, #3b82f6); border-radius: var(--radius-sm); animation: ct-list-loading 1.2s ease-in-out infinite; }
/* prettier-ignore */
@keyframes ct-list-loading { 0% { transform: translateX(-100%); } 100% { transform: translateX(350%); } }
/* prettier-ignore */
.ct-list-view__empty { padding: 48px 24px; text-align: center; }
/* prettier-ignore */
.ct-list-view__empty-title { margin: 0; font-size: var(--font-size-base); font-weight: var(--font-weight-semibold); color: var(--color-text-2); }
/* prettier-ignore */
.ct-list-view__empty-desc { margin: 8px 0 0; font-size: var(--font-size-sm); color: var(--color-text-3); max-width: 480px; margin-inline: auto; }
/* prettier-ignore */
.ct-list-view__table { width: 100%; border-collapse: collapse; font-size: var(--font-size-sm); }
/* prettier-ignore */
.ct-list-view__table thead { background: var(--color-bg-2, #f9fafb); border-bottom: 1px solid var(--color-border-1); }
/* prettier-ignore */
.ct-list-view__table th { padding: 10px 16px; text-align: left; font-weight: var(--font-weight-semibold); color: var(--color-text-3); font-size: var(--font-size-xs); text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; }
/* prettier-ignore */
.ct-list-view__table td { padding: 12px 16px; color: var(--color-text-1); border-bottom: 1px solid var(--color-border-1); vertical-align: middle; }
/* prettier-ignore */
.ct-list-view__row:last-child td { border-bottom: none; }
/* prettier-ignore */
.ct-list-view__row:hover { background: var(--color-bg-2, #f9fafb); }
/* prettier-ignore */
.ct-list-view__cell-name { font-weight: var(--font-weight-medium); }
/* prettier-ignore */
.ct-list-view__cell-date { white-space: nowrap; color: var(--color-text-3); }
/* prettier-ignore */
.ct-list-view__cell-actions, .ct-list-view__col-actions { white-space: nowrap; }
/* prettier-ignore */
.ct-list-view__cell-actions { text-align: right; }
/* prettier-ignore */
.ct-list-view__col-actions { width: 1%; }
/* prettier-ignore */
.ct-list-view__col-number { text-align: center; }
/* prettier-ignore */
.ct-list-view__chip { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: var(--radius-full, 9999px); font-size: var(--font-size-xs); font-weight: var(--font-weight-medium); background: var(--color-primary-bg, #eff6ff); color: var(--color-primary-text, #1d4ed8); }
/* prettier-ignore */
.ct-list-view__chip--subtle { background: var(--color-bg-2, #f3f4f6); color: var(--color-text-2); }
/* prettier-ignore */
.ct-list-view__badge { display: inline-flex; align-items: center; justify-content: center; min-width: 28px; padding: 2px 8px; border-radius: var(--radius-full, 9999px); font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); background: var(--color-primary-bg, #eff6ff); color: var(--color-primary-text, #1d4ed8); }
/* prettier-ignore */
.ct-list-view__badge--empty { background: var(--color-warning-bg, #fffbeb); color: var(--color-warning-text, #92400e); }
/* prettier-ignore */
.ct-list-view__status { display: inline-flex; align-items: center; gap: 6px; font-size: var(--font-size-xs); font-weight: var(--font-weight-medium); }
/* prettier-ignore */
.ct-list-view__status::before { content: ""; width: 6px; height: 6px; border-radius: 50%; }
/* prettier-ignore */
.ct-list-view__status--active { color: var(--color-success-text, #166534); }
/* prettier-ignore */
.ct-list-view__status--active::before { background: var(--color-success, #22c55e); }
/* prettier-ignore */
.ct-list-view__status--inactive { color: var(--color-text-3); }
/* prettier-ignore */
.ct-list-view__status--inactive::before { background: var(--color-text-4, #d1d5db); }
/* prettier-ignore */
@media (max-width: 767px) { .ct-list-view__table { font-size: var(--font-size-xs); } .ct-list-view__table th, .ct-list-view__table td { padding: 8px 10px; } }
</style>
