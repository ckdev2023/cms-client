<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import Button from "../../shared/ui/Button.vue";
import {
  validateBlueprintItems,
  createEmptyItem,
  REQUIREMENT_CATEGORIES,
  OWNER_SIDES,
  PROVIDED_BY_ROLES,
  type BlueprintWizardItem,
} from "./model/blueprintWizardModel";

/** 蓝图向导表格编辑器 — 可增删改条目、实时校验。 */
const props = defineProps<{
  items: BlueprintWizardItem[];
  prefilled: boolean;
}>();
const emit = defineEmits<{
  "update:items": [items: BlueprintWizardItem[]];
  "switch-to-json": [];
}>();
const { t } = useI18n();

const validationErrors = computed(() =>
  props.items.length > 0 ? validateBlueprintItems(props.items) : [],
);

/**
 * 判断指定行字段是否存在校验错误。
 * @param index 行索引
 * @param field 字段名
 * @returns 是否存在该校验错误
 */
function fieldHasError(index: number, field: string): boolean {
  return validationErrors.value.some(
    (e) => e.index === index && e.field === field,
  );
}

/** 追加一条空白蓝图条目并回写列表。 */
function handleAdd() {
  const nextSort =
    props.items.length > 0
      ? Math.max(...props.items.map((i) => i.sortOrder)) + 1
      : 1;
  emit("update:items", [...props.items, createEmptyItem(nextSort)]);
}

/**
 * 删除指定索引行并回写列表。
 * @param index 待删除行索引
 */
function handleRemove(index: number) {
  const next = [...props.items];
  next.splice(index, 1);
  emit("update:items", next);
}
</script>

<template>
  <div class="bp-wizard" data-testid="blueprint-wizard">
    <div
      v-if="items.length > 0"
      class="bp-wizard__table-wrap"
      data-h5-mode="scroll"
    >
      <table class="bp-wizard__table" data-testid="blueprint-table">
        <thead>
          <tr>
            <th>
              {{
                t(
                  "caseTemplates.createDialog.blueprintFields.checklistItemCode",
                )
              }}
            </th>
            <th>
              {{ t("caseTemplates.createDialog.blueprintFields.name") }}
            </th>
            <th>
              {{ t("caseTemplates.createDialog.blueprintFields.category") }}
            </th>
            <th>
              {{ t("caseTemplates.createDialog.blueprintFields.requiredFlag") }}
            </th>
            <th>
              {{ t("caseTemplates.createDialog.blueprintFields.ownerSide") }}
            </th>
            <th>
              {{ t("caseTemplates.createDialog.blueprintFields.sortOrder") }}
            </th>
            <th>
              {{ t("caseTemplates.createDialog.blueprintFields.description") }}
            </th>
            <th>
              {{
                t("caseTemplates.createDialog.blueprintFields.providedByRole")
              }}
            </th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(item, idx) in items"
            :key="idx"
            :data-testid="`blueprint-row-${idx}`"
          >
            <td>
              <input
                :id="`bp-wizard-code-${idx}`"
                v-model="item.checklistItemCode"
                type="text"
                class="bp-wizard__input"
                :name="`blueprint-item-${idx}-code`"
                :class="{
                  'bp-wizard__input--error': fieldHasError(
                    idx,
                    'checklistItemCode',
                  ),
                }"
                :placeholder="
                  t(
                    'caseTemplates.createDialog.blueprintFields.checklistItemCodePlaceholder',
                  )
                "
                :data-testid="`bp-code-${idx}`"
              />
            </td>
            <td>
              <input
                :id="`bp-wizard-name-${idx}`"
                v-model="item.name"
                type="text"
                class="bp-wizard__input"
                :name="`blueprint-item-${idx}-name`"
                :class="{
                  'bp-wizard__input--error': fieldHasError(idx, 'name'),
                }"
                :placeholder="
                  t(
                    'caseTemplates.createDialog.blueprintFields.namePlaceholder',
                  )
                "
                :data-testid="`bp-name-${idx}`"
              />
            </td>
            <td>
              <select
                :id="`bp-wizard-category-${idx}`"
                v-model="item.category"
                class="bp-wizard__input"
                :name="`blueprint-item-${idx}-category`"
                :data-testid="`bp-category-${idx}`"
              >
                <option
                  v-for="cat in REQUIREMENT_CATEGORIES"
                  :key="cat"
                  :value="cat"
                >
                  {{
                    t(`caseTemplates.createDialog.blueprintCategories.${cat}`)
                  }}
                </option>
              </select>
            </td>
            <td class="bp-wizard__cell-center">
              <input
                :id="`bp-wizard-required-${idx}`"
                v-model="item.requiredFlag"
                type="checkbox"
                :name="`blueprint-item-${idx}-required`"
                :data-testid="`bp-required-${idx}`"
              />
            </td>
            <td>
              <select
                :id="`bp-wizard-owner-${idx}`"
                v-model="item.ownerSide"
                class="bp-wizard__input"
                :name="`blueprint-item-${idx}-owner`"
                :data-testid="`bp-owner-${idx}`"
              >
                <option v-for="os in OWNER_SIDES" :key="os" :value="os">
                  {{
                    t(`caseTemplates.createDialog.blueprintOwnerSides.${os}`)
                  }}
                </option>
              </select>
            </td>
            <td>
              <input
                :id="`bp-wizard-sort-${idx}`"
                v-model.number="item.sortOrder"
                type="number"
                min="0"
                class="bp-wizard__input bp-wizard__input--sort"
                :name="`blueprint-item-${idx}-sort`"
                :data-testid="`bp-sort-${idx}`"
              />
            </td>
            <td>
              <input
                :id="`bp-wizard-desc-${idx}`"
                v-model="item.description"
                type="text"
                class="bp-wizard__input bp-wizard__input--desc"
                :name="`blueprint-item-${idx}-description`"
                :placeholder="
                  t(
                    'caseTemplates.createDialog.blueprintFields.descriptionPlaceholder',
                  )
                "
                :data-testid="`bp-desc-${idx}`"
              />
            </td>
            <td>
              <select
                :id="`bp-wizard-provided-${idx}`"
                v-model="item.providedByRole"
                class="bp-wizard__input"
                :name="`blueprint-item-${idx}-providedBy`"
                :data-testid="`bp-provided-${idx}`"
              >
                <option value="">—</option>
                <option
                  v-for="role in PROVIDED_BY_ROLES"
                  :key="role"
                  :value="role"
                >
                  {{
                    t(
                      `caseTemplates.createDialog.blueprintProvidedByRoles.${role}`,
                    )
                  }}
                </option>
              </select>
            </td>
            <td>
              <button
                type="button"
                class="bp-wizard__remove"
                :data-testid="`bp-remove-${idx}`"
                @click="handleRemove(idx)"
              >
                ✕
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="bp-wizard__actions">
      <Button
        variant="outlined"
        size="sm"
        html-type="button"
        data-testid="blueprint-add-item"
        @click="handleAdd"
      >
        {{ t("caseTemplates.createDialog.blueprintAddItem") }}
      </Button>
    </div>

    <button
      type="button"
      class="bp-wizard__toggle"
      data-testid="create-blueprint-toggle"
      @click="emit('switch-to-json')"
    >
      {{ t("caseTemplates.createDialog.blueprintAdvancedJsonToggle") }}
      <span class="bp-wizard__toggle-icon">▸</span>
    </button>

    <p v-if="prefilled && items.length > 0" class="bp-wizard__hint">
      {{ t("caseTemplates.createDialog.blueprintPrefilledHint") }}
    </p>
  </div>
</template>

<style scoped>
/* prettier-ignore */
.bp-wizard { display: flex; flex-direction: column; gap: 8px; }
/* prettier-ignore */
.bp-wizard__table-wrap { overflow-x: auto; border: 1px solid var(--color-border-1, #e5e7eb); border-radius: var(--radius-md, 6px); }
/* prettier-ignore */
.bp-wizard__table { width: 100%; border-collapse: collapse; font-size: var(--font-size-xs, 12px); }
/* prettier-ignore */
.bp-wizard__table thead { background: var(--color-bg-2, #f9fafb); }
/* prettier-ignore */
.bp-wizard__table th { padding: 6px 8px; text-align: left; font-weight: var(--font-weight-semibold, 600); color: var(--color-text-3); white-space: nowrap; border-bottom: 1px solid var(--color-border-1, #e5e7eb); }
/* prettier-ignore */
.bp-wizard__table td { padding: 4px 6px; border-bottom: 1px solid var(--color-border-1, #e5e7eb); vertical-align: middle; }
/* prettier-ignore */
.bp-wizard__table tr:last-child td { border-bottom: none; }
/* prettier-ignore */
.bp-wizard__input { width: 100%; min-width: 80px; padding: 4px 6px; border: 1px solid var(--color-border-1, #e5e7eb); border-radius: var(--radius-sm, 4px); font-size: var(--font-size-xs, 12px); background: var(--color-bg-1, #fff); color: var(--color-text-1); font-family: inherit; }
/* prettier-ignore */
.bp-wizard__input:focus { outline: 2px solid var(--color-primary-outline, #3b82f6); outline-offset: -1px; }
/* prettier-ignore */
.bp-wizard__input--error { border-color: var(--color-danger-border, #fca5a5); background: var(--color-danger-bg, #fef2f2); }
/* prettier-ignore */
.bp-wizard__input--sort { width: 56px; min-width: 56px; text-align: center; }
/* prettier-ignore */
.bp-wizard__input--desc { min-width: 120px; }
/* prettier-ignore */
.bp-wizard__cell-center { text-align: center; }
/* prettier-ignore */
.bp-wizard__remove { all: unset; cursor: pointer; padding: 2px 6px; border-radius: var(--radius-sm, 4px); color: var(--color-text-3); font-size: var(--font-size-xs, 12px); }
/* prettier-ignore */
.bp-wizard__remove:hover { background: var(--color-danger-bg, #fef2f2); color: var(--color-danger-text, #dc2626); }
/* prettier-ignore */
.bp-wizard__actions { display: flex; gap: 8px; }
/* prettier-ignore */
.bp-wizard__toggle { all: unset; display: inline-flex; align-items: center; gap: 6px; font-size: var(--font-size-sm, 14px); font-weight: var(--font-weight-medium, 500); color: var(--color-text-2); cursor: pointer; user-select: none; }
/* prettier-ignore */
.bp-wizard__toggle-icon { font-size: var(--font-size-xs, 12px); color: var(--color-text-3); }
/* prettier-ignore */
.bp-wizard__hint { margin: 2px 0 0; font-size: var(--font-size-xs, 12px); color: var(--color-text-3); }
</style>
