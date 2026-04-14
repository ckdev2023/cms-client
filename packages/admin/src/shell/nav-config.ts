import type { RouteLocationRaw } from "vue-router";

/** `NavIcon.vue` 支持的图标名称集合。 */
export type NavIconName =
  | "dashboard"
  | "message"
  | "users"
  | "file-text"
  | "clipboard"
  | "folder"
  | "edit"
  | "wallet"
  | "bar-chart"
  | "settings"
  | "search"
  | "menu"
  | "close";

interface NavItemBase {
  key: string;
  label: string;
  icon?: NavIconName;
  adminOnly?: boolean;
}

/** 通过 `RouterLink` 渲染的站内路由项。 */
export interface NavRouterItem extends NavItemBase {
  /** Vue Router 的目标地址。 */
  to: RouteLocationRaw;
  /** @internal 用于联合类型区分，路由项上始终不存在。 */
  href?: never;
  /** @internal 用于联合类型区分，路由项上始终不存在。 */
  external?: never;
  /** 可选的未读数或状态标签。 */
  badge?: string | number;
}

/** 通过普通 `<a>` 在新标签页打开的外链项。 */
export interface NavExternalItem extends NavItemBase {
  /** 绝对或相对链接地址。 */
  href: string;
  /** 必须为 `true`，用于联合类型区分。 */
  external: true;
  /** @internal 用于联合类型区分，外链项上始终不存在。 */
  to?: never;
  /** @internal 外链项不支持该字段。 */
  badge?: never;
}

/** 单个导航项，可以是站内路由或外部链接。 */
export type NavItem = NavRouterItem | NavExternalItem;

/** 带分组标题的一组导航项。 */
export interface NavGroup {
  /** 供 Vue `v-for` 使用的稳定标识。 */
  key: string;
  /** 侧边栏中展示的分组标题。 */
  title: string;
  /** 分组内按顺序渲染的导航项列表。 */
  items: NavItem[];
}

/**
 * 判断导航项是否为外部链接。
 *
 * @param item 当前要判断的导航项
 * @returns 当目标为外部链接时返回 `true`
 */
export function isExternalItem(item: NavItem): item is NavExternalItem {
  return item.external === true;
}

/**
 * 将所有分组拍平成单个导航项列表，便于统一查找。
 *
 * @returns 当前配置中的全部导航项
 */
export function allNavItems(): NavItem[] {
  return navGroups.flatMap((g) => g.items);
}

/**
 * 按管理员权限过滤导航分组，移除非管理员不可见的项并丢弃空分组。
 *
 * @param isAdmin 当前用户是否为管理员
 * @returns 过滤后的导航分组列表
 */
export function getVisibleNavGroups(isAdmin: boolean): NavGroup[] {
  if (isAdmin) return navGroups;

  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.adminOnly),
    }))
    .filter((group) => group.items.length > 0);
}

/**
 * 根据唯一键查找导航项。
 *
 * @param key 需要查找的导航项键值
 * @returns 匹配的导航项；未找到时返回 `undefined`
 */
export function findNavItem(key: string): NavItem | undefined {
  return allNavItems().find((item) => item.key === key);
}

export const brandTitle = "Gyosei OS";
export const brandChip = "事務所管理";

export const navGroups: NavGroup[] = [
  {
    key: "workspace",
    title: "工作台",
    items: [{ key: "dashboard", label: "仪表盘", to: "/", icon: "dashboard" }],
  },
  {
    key: "business",
    title: "业务",
    items: [
      { key: "leads", label: "咨询与会话", to: "/leads", icon: "message" },
      { key: "customers", label: "客户", to: "/customers", icon: "users" },
      { key: "cases", label: "案件", to: "/cases", icon: "file-text" },
      { key: "tasks", label: "任务与提醒", to: "/tasks", icon: "clipboard" },
    ],
  },
  {
    key: "content",
    title: "内容",
    items: [
      {
        key: "documents",
        label: "资料中心",
        to: "/documents",
        icon: "folder",
      },
    ],
  },
  {
    key: "finance",
    title: "财务",
    items: [
      { key: "billing", label: "收费与财务", to: "/billing", icon: "wallet" },
    ],
  },
  {
    key: "system",
    title: "系统",
    items: [
      {
        key: "settings",
        label: "系统设置",
        to: "/settings",
        icon: "settings",
        adminOnly: true,
      },
    ],
  },
];
