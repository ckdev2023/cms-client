<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import NavIcon from "./NavIcon.vue";
import { localeOptions, setAppLocale, type AppLocale } from "../i18n";

/**
 * 应用顶栏，负责导航入口、全局搜索与语言切换。
 */
defineProps<{
  userInitials?: string;
}>();

defineEmits<{
  toggleMenu: [];
}>();

const { locale, t } = useI18n();
const router = useRouter();

const currentLocale = computed<AppLocale>({
  get: () => locale.value as AppLocale,
  set: (value) => {
    setAppLocale(value);
  },
});

const globalSearchInputId = "topbar-global-search";
const localeSelectId = "topbar-locale-select";
</script>

<template>
  <header class="topbar" role="banner">
    <div class="topbar-inner">
      <button
        class="topbar-icon-btn topbar-menu-btn"
        type="button"
        :aria-label="t('shell.topbar.openNavigation')"
        @click="$emit('toggleMenu')"
      >
        <NavIcon name="menu" />
      </button>

      <div class="topbar-search" role="search">
        <NavIcon name="search" />
        <input
          :id="globalSearchInputId"
          name="globalSearch"
          type="search"
          :placeholder="t('shell.topbar.searchPlaceholder')"
          :aria-label="t('shell.topbar.globalSearch')"
        />
        <kbd class="topbar-search-kbd">⌘K</kbd>
      </div>

      <div class="topbar-actions">
        <slot v-if="$slots.actions" name="actions" />
        <template v-else>
          <select
            :id="localeSelectId"
            v-model="currentLocale"
            class="topbar-locale-select"
            name="locale"
            :aria-label="t('shell.topbar.localeLabel')"
          >
            <option
              v-for="option in localeOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
          <button
            class="topbar-action topbar-action--pill"
            type="button"
            @click="router.push('/leads?action=new')"
          >
            {{ t("shell.topbar.createLead") }}
          </button>
          <button
            class="topbar-action topbar-action--primary"
            type="button"
            disabled
            aria-disabled="true"
          >
            {{ t("shell.topbar.createCase") }}
          </button>
        </template>
      </div>

      <div class="topbar-avatar" :aria-label="userInitials ?? 'U'">
        {{ userInitials ?? "U" }}
      </div>
    </div>
  </header>
</template>
