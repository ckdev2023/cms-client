import { createRouter, createWebHashHistory, type RouteMeta } from "vue-router";
import { isAdminAuthenticated, isAdminRole } from "../auth/model/adminSession";
import { resolveAdminAuthGuard } from "./authGuard";

const placeholderRoutes = [
  {
    path: "/tasks",
    name: "tasks",
    navKey: "tasks",
    groupKey: "business",
    titleKey: "shell.nav.items.tasks",
  },
] as const;

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
      path: "/cases",
      name: "cases",
      component: () => import("../views/cases/CaseListView.vue"),
      meta: withShellMeta({
        navKey: "cases",
        groupKey: "business",
        titleKey: "shell.nav.items.cases",
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
      path: "/settings",
      name: "settings",
      component: () => import("../views/settings/SettingsView.vue"),
      meta: withShellMeta({
        navKey: "settings",
        groupKey: "system",
        titleKey: "shell.nav.items.settings",
        requiresAdmin: true,
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

router.beforeEach((to) =>
  resolveAdminAuthGuard(to, isAdminAuthenticated(), isAdminRole()),
);
