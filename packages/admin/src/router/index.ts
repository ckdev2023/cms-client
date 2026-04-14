import { createRouter, createWebHashHistory } from "vue-router";

const placeholderRoutes = [
  {
    path: "/tasks",
    name: "tasks",
    navKey: "tasks",
    groupKey: "business",
    titleKey: "shell.nav.items.tasks",
  },
  {
    path: "/settings",
    name: "settings",
    navKey: "settings",
    groupKey: "system",
    titleKey: "shell.nav.items.settings",
  },
] as const;

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      name: "dashboard",
      component: () => import("../views/DashboardView.vue"),
      meta: {
        navKey: "dashboard",
        groupKey: "workspace",
        titleKey: "shell.nav.items.dashboard",
      },
    },
    {
      path: "/foundation",
      name: "foundation",
      component: () => import("../views/HomeView.vue"),
      meta: { title: "Foundation" },
    },
    {
      path: "/customers",
      name: "customers",
      component: () => import("../views/customers/CustomerListView.vue"),
      meta: {
        navKey: "customers",
        groupKey: "business",
        titleKey: "shell.nav.items.customers",
      },
    },
    {
      path: "/customers/:id",
      name: "customer-detail",
      component: () => import("../views/customers/CustomerDetailView.vue"),
      meta: {
        navKey: "customers",
        groupKey: "business",
        titleKey: "shell.nav.items.customers",
      },
    },
    {
      path: "/leads",
      name: "leads",
      component: () => import("../views/leads/LeadsListView.vue"),
      meta: {
        navKey: "leads",
        groupKey: "business",
        titleKey: "shell.nav.items.leads",
      },
    },
    {
      path: "/leads/:id",
      name: "lead-detail",
      component: () => import("../views/leads/LeadDetailView.vue"),
      meta: {
        navKey: "leads",
        groupKey: "business",
        titleKey: "shell.nav.items.leads",
      },
    },
    {
      path: "/cases",
      name: "cases",
      component: () => import("../views/cases/CaseListView.vue"),
      meta: {
        navKey: "cases",
        groupKey: "business",
        titleKey: "shell.nav.items.cases",
      },
    },
    {
      path: "/cases/create",
      name: "case-create",
      component: () => import("../views/cases/CaseCreateView.vue"),
      meta: {
        navKey: "cases",
        groupKey: "business",
        titleKey: "shell.nav.items.cases",
      },
    },
    {
      path: "/cases/:id",
      name: "case-detail",
      component: () => import("../views/cases/CaseDetailView.vue"),
      meta: {
        navKey: "cases",
        groupKey: "business",
        titleKey: "shell.nav.items.cases",
      },
    },
    {
      path: "/billing",
      name: "billing",
      component: () => import("../views/billing/BillingListView.vue"),
      meta: {
        navKey: "billing",
        groupKey: "finance",
        titleKey: "shell.nav.items.billing",
      },
    },
    {
      path: "/documents",
      name: "documents",
      component: () => import("../views/documents/DocumentListView.vue"),
      meta: {
        navKey: "documents",
        groupKey: "content",
        titleKey: "shell.nav.items.documents",
      },
    },
    ...placeholderRoutes.map((route) => ({
      path: route.path,
      name: route.name,
      component: () => import("../views/SectionPlaceholderView.vue"),
      meta: {
        navKey: route.navKey,
        groupKey: route.groupKey,
        titleKey: route.titleKey,
      },
    })),
  ],
});
