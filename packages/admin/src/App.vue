<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { RouterView, useRoute, useRouter } from "vue-router";
import { getArcoLocale, type AppLocale } from "./i18n";
import {
  getAdminAccessToken,
  isAdminAuthenticated,
  useAdminSession,
} from "./auth/model/adminSession";
import { createOrgSettingsRepository } from "./views/settings/model/OrgSettingsRepository";
import { createGroupsRepository } from "./views/settings/model/GroupsRepository";
import { initOrgSettings } from "./shared/model/useOrgSettings";
import {
  clearGroupAliases,
  registerGroupAliases,
} from "./shared/model/useGroupOptions";
import AppShell from "./shell/AppShell.vue";
import Toast from "./shared/ui/Toast.vue";
import { initToast } from "./shared/model/useToast";
import { initSearchRepository } from "./shared/model/useSearchRepository";

/**
 * 后台应用根组件，按路由元信息在登录页与管理外壳之间切换布局。
 */
const route = useRoute();
const router = useRouter();
const { locale } = useI18n();
const { currentUser, isAuthenticated } = useAdminSession();
const usesBlankLayout = computed(() => route.meta.layout === "blank");
const userName = computed(() => currentUser.value?.name ?? "Local Admin");
const userEmail = computed(
  () => currentUser.value?.email ?? "admin@local.test",
);
const userInitials = computed(() => currentUser.value?.initials ?? "AD");
const arcoLocale = computed(() => getArcoLocale(locale.value as AppLocale));
initToast();
initSearchRepository({ getToken: getAdminAccessToken });
const orgSettings = initOrgSettings({
  initialStorageRoot: { rootLabel: null, rootPath: null },
});
const orgSettingsRepository = createOrgSettingsRepository();
const groupsRepository = createGroupsRepository();

let sessionCheckTimer: number | null = null;

/**
 * 当前受保护页面检测到登录态失效时，跳回登录页并保留原目标地址。
 */
function redirectToLoginForExpiredSession(): void {
  if (!route.meta.requiresAuth || route.name === "login") return;
  if (isAdminAuthenticated()) return;

  void router.replace({
    name: "login",
    query: { redirect: route.fullPath, reason: "expired" },
  });
}

/**
 * 页面重新变为可见时，立即同步一次后台登录态，避免使用过期 token。
 */
function handleVisibilityChange(): void {
  if (document.visibilityState === "visible") {
    redirectToLoginForExpiredSession();
  }
}

async function refreshOrgSettings(): Promise<void> {
  if (!isAuthenticated.value) {
    orgSettings.storageRoot.value = { rootLabel: null, rootPath: null };
    return;
  }

  try {
    const settings = await orgSettingsRepository.getOrgSettings();
    orgSettings.storageRoot.value = {
      rootLabel: settings.storageRoot.rootLabel,
      rootPath: settings.storageRoot.rootPath,
    };
  } catch {
    orgSettings.storageRoot.value = { rootLabel: null, rootPath: null };
  }
}

async function refreshGroupAliases(): Promise<void> {
  if (!isAuthenticated.value) {
    clearGroupAliases();
    return;
  }
  try {
    const groups = await groupsRepository.listGroups();
    registerGroupAliases(
      groups.map((group) => ({ id: group.id, name: group.name })),
    );
  } catch {
    // 拉取失败时保持已注册别名不变；resolveGroupLabel 会回落到占位符 "—"。
  }
}

watch(() => route.fullPath, redirectToLoginForExpiredSession, {
  immediate: true,
});

watch(
  () => isAuthenticated.value,
  (authenticated) => {
    if (!authenticated) {
      orgSettings.storageRoot.value = { rootLabel: null, rootPath: null };
      clearGroupAliases();
      return;
    }
    void refreshOrgSettings();
    void refreshGroupAliases();
  },
  { immediate: true },
);

onMounted(() => {
  window.addEventListener("focus", redirectToLoginForExpiredSession);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  sessionCheckTimer = window.setInterval(
    redirectToLoginForExpiredSession,
    30000,
  );
});

onBeforeUnmount(() => {
  window.removeEventListener("focus", redirectToLoginForExpiredSession);
  document.removeEventListener("visibilitychange", handleVisibilityChange);
  if (sessionCheckTimer !== null) {
    window.clearInterval(sessionCheckTimer);
  }
});
</script>

<template>
  <a-config-provider :locale="arcoLocale">
    <RouterView v-if="usesBlankLayout" />
    <AppShell
      v-else
      :user-email="userEmail"
      :user-initials="userInitials"
      :user-name="userName"
    />
    <Toast />
  </a-config-provider>
</template>
