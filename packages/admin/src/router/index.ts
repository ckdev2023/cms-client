import { createRouter, createWebHashHistory, type RouteMeta } from "vue-router";
import { isAdminAuthenticated, isAdminRole } from "../auth/model/adminSession";
import { getDefaultPermissionsStore } from "../shared/model/PermissionsStore";
import { resolveAdminAuthGuard } from "./authGuard";
import { resolveDetachedHashBasenameHref } from "./hashDetachedPathnameNormalize";
import { hashNavigationDesyncedFromRouter } from "./hashNavigationSync";

const placeholderRoutes: ReadonlyArray<{
  path: string;
  name: string;
  navKey: string;
  groupKey: string;
  titleKey: string;
}> = [];

function withShellMeta(meta: RouteMeta): RouteMeta {
  return {
    requiresAuth: true,
    layout: "shell" as const,
    ...meta,
  };
}

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/login",
      name: "login",
      component: () => import("../views/auth/LoginView.vue"),
      meta: {
        layout: "blank",
        publicOnly: true,
        titleKey: "auth.login.metaTitle",
      },
    },
    {
      path: "/",
      name: "dashboard",
      component: () => import("../views/DashboardView.vue"),
      meta: withShellMeta({
        navKey: "dashboard",
        groupKey: "workspace",
        titleKey: "shell.nav.items.dashboard",
      }),
    },
    {
      path: "/foundation",
      name: "foundation",
      component: () => import("../views/HomeView.vue"),
      meta: withShellMeta({ title: "Foundation" }),
    },
    {
      path: "/customers",
      name: "customers",
      component: () => import("../views/customers/CustomerListView.vue"),
      meta: withShellMeta({
        navKey: "customers",
        groupKey: "business",
        titleKey: "shell.nav.items.customers",
        requiredPermission: "customer.view",
      }),
    },
    {
      path: "/customers/:id",
      name: "customer-detail",
      component: () => import("../views/customers/CustomerDetailView.vue"),
      meta: withShellMeta({
        navKey: "customers",
        groupKey: "business",
        titleKey: "shell.nav.items.customers",
        requiredPermission: "customer.view",
      }),
    },
    {
      path: "/leads",
      name: "leads",
      component: () => import("../views/leads/LeadsListView.vue"),
      meta: withShellMeta({
        navKey: "leads",
        groupKey: "business",
        titleKey: "shell.nav.items.leads",
      }),
    },
    {
      path: "/leads/:id",
      name: "lead-detail",
      component: () => import("../views/leads/LeadDetailView.vue"),
      meta: withShellMeta({
        navKey: "leads",
        groupKey: "business",
        titleKey: "shell.nav.items.leads",
      }),
    },
    {
      path: "/conversations",
      name: "conversations",
      component: () =>
        import("../views/conversations/ConversationsListView.vue"),
      meta: withShellMeta({
        navKey: "conversations",
        groupKey: "business",
        titleKey: "shell.nav.items.conversations",
        requiresStaff: true,
      }),
    },
    {
      path: "/conversations/:id",
      name: "conversation-detail",
      component: () =>
        import("../views/conversations/ConversationDetailView.vue"),
      meta: withShellMeta({
        navKey: "conversations",
        groupKey: "business",
        titleKey: "shell.nav.items.conversations",
        requiresStaff: true,
      }),
    },
    {
      path: "/cases",
      name: "cases",
      component: () => import("../views/cases/CaseListView.vue"),
      meta: withShellMeta({
        navKey: "cases",
        groupKey: "business",
        titleKey: "shell.nav.items.cases",
        requiredPermission: "case.view",
      }),
    },
    {
      path: "/cases/create",
      name: "case-create",
      component: () => import("../views/cases/CaseCreateView.vue"),
      meta: withShellMeta({
        navKey: "cases",
        groupKey: "business",
        titleKey: "shell.nav.items.cases",
        requiredPermission: "case.create",
      }),
    },
    {
      path: "/cases/:id",
      name: "case-detail",
      component: () => import("../views/cases/CaseDetailView.vue"),
      meta: withShellMeta({
        navKey: "cases",
        groupKey: "business",
        titleKey: "shell.nav.items.cases",
        requiredPermission: "case.view",
      }),
    },
    {
      path: "/billing",
      name: "billing",
      component: () => import("../views/billing/BillingListView.vue"),
      meta: withShellMeta({
        navKey: "billing",
        groupKey: "finance",
        titleKey: "shell.nav.items.billing",
      }),
    },
    {
      path: "/documents",
      name: "documents",
      component: () => import("../views/documents/DocumentListView.vue"),
      meta: withShellMeta({
        navKey: "documents",
        groupKey: "content",
        titleKey: "shell.nav.items.documents",
      }),
    },
    {
      path: "/tasks",
      name: "tasks",
      component: () => import("../views/tasks/TaskListView.vue"),
      meta: withShellMeta({
        navKey: "tasks",
        groupKey: "business",
        titleKey: "shell.nav.items.tasks",
      }),
    },
    {
      path: "/case-templates",
      name: "case-templates",
      component: () =>
        import("../views/case-templates/CaseTemplatesListView.vue"),
      meta: withShellMeta({
        navKey: "caseTemplates",
        groupKey: "system",
        titleKey: "shell.nav.items.caseTemplates",
        requiredPermission: "case.view",
      }),
    },
    {
      path: "/settings",
      name: "settings",
      component: () => import("../views/settings/SettingsView.vue"),
      meta: withShellMeta({
        navKey: "settings",
        groupKey: "system",
        titleKey: "shell.nav.items.settings",
        requiresAdmin: true,
        requiredPermission: "settings.write",
      }),
    },
    ...placeholderRoutes.map((route) => ({
      path: route.path,
      name: route.name,
      component: () => import("../views/SectionPlaceholderView.vue"),
      meta: withShellMeta({
        navKey: route.navKey,
        groupKey: route.groupKey,
        titleKey: route.titleKey,
      }),
    })),
  ],
});

router.beforeEach((to) => {
  const store = getDefaultPermissionsStore();
  const hasPermission = store.loaded.value
    ? (code: string) => store.has(code)
    : undefined;
  return resolveAdminAuthGuard(
    to,
    isAdminAuthenticated(),
    isAdminRole(),
    hasPermission,
  );
});

router.onError((error) => {
  // eslint-disable-next-line no-console -- 路由懒加载失败需在控制台保留原始错误便于排查
  console.error(error);
  const current = router.currentRoute.value;
  if (
    typeof window !== "undefined" &&
    hashNavigationDesyncedFromRouter(window.location, current.fullPath)
  ) {
    void router.replace(current.fullPath).catch(() => undefined);
  }
});

router.afterEach(() => {
  if (typeof window.history.replaceState !== "function") {
    return;
  }
  const nextHref = resolveDetachedHashBasenameHref(
    window.location,
    import.meta.env.BASE_URL,
  );
  if (nextHref && nextHref !== window.location.href) {
    window.history.replaceState(window.history.state, "", nextHref);
  }
});
