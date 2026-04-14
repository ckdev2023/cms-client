import { createRouter, createWebHashHistory } from "vue-router";

const placeholderRoutes = [
  {
    path: "/cases",
    name: "cases",
    navKey: "cases",
    groupKey: "business",
    titleKey: "shell.nav.items.cases",
  },
  {
    path: "/tasks",
    name: "tasks",
    navKey: "tasks",
    groupKey: "business",
    titleKey: "shell.nav.items.tasks",
  },
  {
    path: "/documents",
    name: "documents",
    navKey: "documents",
    groupKey: "content",
    titleKey: "shell.nav.items.documents",
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
      path: "/billing",
      name: "billing",
      component: () => import("../views/billing/BillingListView.vue"),
      meta: {
        navKey: "billing",
        groupKey: "finance",
        titleKey: "shell.nav.items.billing",
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
