<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { logoutAdmin } from "../auth/model/adminSession";
import NavIcon from "./NavIcon.vue";
import { localeOptions, setAppLocale, type AppLocale } from "../i18n";
import { getDefaultPermissionsStore } from "../shared/model/PermissionsStore";
import { buildCaseCreateRoute } from "../views/cases/query";

/**
 * 应用顶栏，负责导航入口、全局搜索与语言切换。
 */
const props = withDefaults(
  defineProps<{
    userEmail?: string;
    userInitials?: string;
    userName?: string;
  }>(),
  {
    userEmail: "admin@local.test",
    userName: "Local Admin",
  },
);

defineEmits<{
  toggleMenu: [];
  openSearchPalette: [];
}>();

const { locale, t } = useI18n();
const router = useRouter();

const currentLocale = computed<AppLocale>({
  get: () => locale.value as AppLocale,
  set: (value) => {
    setAppLocale(value);
  },
});

const permStore = getDefaultPermissionsStore();
const canCreateCase = computed(() => permStore.has("case.create"));

const localeSelectId = "topbar-locale-select";
const accountPanelId = "topbar-account-panel";
const isAccountPanelOpen = ref(false);

/**
 * 根据用户名生成头像缩写，优先取前两个单词首字母。
 *
 * @param name 用户显示名称
 * @returns 双字母头像缩写；兜底返回 `LA`
 */
function buildAvatarInitials(name: string): string {
  const segments = name.trim().split(/\s+/).filter(Boolean);
  if (segments.length >= 2) {
    return segments
      .map((segment) => segment[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 2);
  }

  const compact = name.replace(/\s+/g, "").slice(0, 2).toUpperCase();
  return compact || "LA";
}

const resolvedUserInitials = computed(
  () => props.userInitials?.trim() || buildAvatarInitials(props.userName),
);
const accountSummary = computed(
  () => `${resolvedUserInitials.value} ${props.userName} (${props.userEmail})`,
);

/**
 * 清理本地后台登录态，并跳回登录页显示退出提示。
 */
function handleLogout(): void {
  isAccountPanelOpen.value = false;
  logoutAdmin();
  void router.push({ name: "login", query: { reason: "loggedOut" } });
}

/**
 * 打开案件新建页，保持与案件列表等入口一致的路由构造方式。
 */
function handleCreateCase(): void {
  void router.push(buildCaseCreateRoute({}));
}

/**
 * 切换账户信息面板显隐。
 */
function toggleAccountPanel(): void {
  isAccountPanelOpen.value = !isAccountPanelOpen.value;
}
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
        <button
          type="button"
          class="topbar-search-trigger"
          aria-controls="global-search-palette"
          aria-haspopup="dialog"
          @click="$emit('openSearchPalette')"
          @keydown.enter.prevent="$emit('openSearchPalette')"
        >
          <NavIcon name="search" />
          <span class="topbar-search-placeholder">{{
            t("shell.topbar.searchPlaceholder")
          }}</span>
          <kbd class="topbar-search-kbd">⌘K</kbd>
        </button>
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
            v-if="canCreateCase"
            class="topbar-action topbar-action--primary"
            type="button"
            @click="handleCreateCase"
          >
            {{ t("shell.topbar.createCase") }}
          </button>
          <button
            class="topbar-action topbar-action--logout"
            type="button"
            @click="handleLogout"
          >
            {{ t("shell.topbar.logout") }}
          </button>
        </template>
      </div>

      <div class="topbar-account">
        <button
          class="topbar-avatar topbar-avatar--button"
          type="button"
          :aria-controls="accountPanelId"
          :aria-expanded="isAccountPanelOpen"
          :aria-label="accountSummary"
          aria-haspopup="dialog"
          :title="accountSummary"
          @click="toggleAccountPanel"
        >
          {{ resolvedUserInitials }}
        </button>
        <div
          v-if="isAccountPanelOpen"
          :id="accountPanelId"
          class="topbar-account-panel"
          role="dialog"
          :aria-label="accountSummary"
          @keydown.esc="isAccountPanelOpen = false"
        >
          <p class="topbar-account-name">{{ props.userName }}</p>
          <p class="topbar-account-email">{{ props.userEmail }}</p>
          <div class="topbar-account-actions">
            <button
              class="topbar-account-action"
              type="button"
              @click="
                router.push('/leads?action=new');
                isAccountPanelOpen = false;
              "
            >
              {{ t("shell.topbar.createLead") }}
            </button>
            <button
              class="topbar-account-action"
              type="button"
              @click="handleLogout"
            >
              {{ t("shell.topbar.logout") }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
