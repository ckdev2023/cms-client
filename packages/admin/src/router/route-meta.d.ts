import "vue-router";

declare module "vue-router" {
  interface RouteMeta {
    layout?: "shell" | "blank";
    requiresAuth?: boolean;
    requiresAdmin?: boolean;
    publicOnly?: boolean;
    navKey?: string;
    groupKey?: string;
    titleKey?: string;
    title?: string;
  }
}

export {};
