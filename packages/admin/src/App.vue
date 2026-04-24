<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from "vue";
import { RouterView, useRoute, useRouter } from "vue-router";
import {
  isAdminAuthenticated,
  useAdminSession,
} from "./auth/model/adminSession";
import { initOrgSettings } from "./shared/model/useOrgSettings";
import { SAMPLE_ORG_SETTINGS } from "./views/settings/fixtures";
import AppShell from "./shell/AppShell.vue";

/**
 * 后台应用根组件，按路由元信息在登录页与管理外壳之间切换布局。
 */
const route = useRoute();
const router = useRouter();
const { currentUser } = useAdminSession();
const usesBlankLayout = computed(() => route.meta.layout === "blank");
const userInitials = computed(() => currentUser.value?.initials ?? "AD");

let sessionCheckTimer: ReturnType<typeof window.setInterval> | null = null;

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

initOrgSettings({ initialStorageRoot: SAMPLE_ORG_SETTINGS.storageRoot });

watch(() => route.fullPath, redirectToLoginForExpiredSession, {
  immediate: true,
});

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
  <RouterView v-if="usesBlankLayout" />
  <AppShell v-else :user-initials="userInitials" />
</template>
