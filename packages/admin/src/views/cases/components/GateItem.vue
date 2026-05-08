<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";
import type { GateItem } from "../types-detail";

/**
 * 提交前检查的单条门禁项渲染组件，blocking / warnings / info 三类共用。
 */
defineProps<{
  item: GateItem;
  readonly?: boolean;
  showAssigneeMeta?: boolean;
  showFix?: boolean;
  wrapNoteAsSuggestion?: boolean;
}>();

const emit = defineEmits<{
  (e: "navigate", tab: string): void;
}>();

const { t } = useI18n();
</script>

<template>
  <div v-if="showAssigneeMeta" class="vt__item-row">
    <div class="vt__item-main">
      <div class="vt__item-title">
        {{
          item.titleKey ? t(item.titleKey, item.titleParams ?? {}) : item.title
        }}
      </div>
      <div v-if="showFix && item.fix" class="vt__item-desc">
        {{
          t("cases.detail.validation.tab.gateCard.fixSuggestion", {
            fix: item.fix,
          })
        }}
      </div>
      <div v-if="item.noteKey || item.note" class="vt__item-desc">
        {{ item.noteKey ? t(item.noteKey, item.noteParams ?? {}) : item.note }}
      </div>
    </div>
    <Button
      v-if="item.actionLabel && item.actionTab"
      size="sm"
      pill
      @click="emit('navigate', item.actionTab!)"
    >
      {{ item.actionLabel }}
    </Button>
  </div>
  <template v-else>
    <div class="vt__item-title">
      {{
        item.titleKey ? t(item.titleKey, item.titleParams ?? {}) : item.title
      }}
    </div>
    <div v-if="item.noteKey || item.note" class="vt__item-desc">
      {{
        item.noteKey
          ? t(item.noteKey, item.noteParams ?? {})
          : wrapNoteAsSuggestion
            ? t("cases.detail.validation.tab.gateCard.suggestion", {
                note: item.note,
              })
            : item.note
      }}
    </div>
  </template>
  <div
    v-if="showAssigneeMeta && (item.assignee || item.deadline)"
    class="vt__item-meta"
  >
    <span v-if="item.assignee">{{
      t("cases.detail.validation.tab.gateCard.assignee", {
        name: item.assignee,
      })
    }}</span>
    <span v-if="item.deadline">{{
      t("cases.detail.validation.tab.gateCard.deadline", {
        date: item.deadline,
      })
    }}</span>
  </div>
</template>
