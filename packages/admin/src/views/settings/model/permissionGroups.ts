/**
 *
 */
export interface PermissionGroupItem {
  /**
   *
   */
  code: string;
  /**
   *
   */
  labelKey: string;
}

/**
 *
 */
export interface PermissionGroup {
  /**
   *
   */
  resource: string;
  /**
   *
   */
  labelKey: string;
  /**
   *
   */
  items: PermissionGroupItem[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    resource: "case",
    labelKey: "settings.roles.permissionGroup.case",
    items: [
      { code: "case.view", labelKey: "settings.roles.permission.caseView" },
      { code: "case.edit", labelKey: "settings.roles.permission.caseEdit" },
      {
        code: "case.export",
        labelKey: "settings.roles.permission.caseExport",
      },
      { code: "case.audit", labelKey: "settings.roles.permission.caseAudit" },
      {
        code: "case.create",
        labelKey: "settings.roles.permission.caseCreate",
      },
      {
        code: "case.finalize",
        labelKey: "settings.roles.permission.caseFinalize",
      },
    ],
  },
  {
    resource: "customer",
    labelKey: "settings.roles.permissionGroup.customer",
    items: [
      {
        code: "customer.view",
        labelKey: "settings.roles.permission.customerView",
      },
      {
        code: "customer.edit",
        labelKey: "settings.roles.permission.customerEdit",
      },
    ],
  },
  {
    resource: "group",
    labelKey: "settings.roles.permissionGroup.group",
    items: [
      { code: "group.view", labelKey: "settings.roles.permission.groupView" },
      {
        code: "group.manage",
        labelKey: "settings.roles.permission.groupManage",
      },
    ],
  },
  {
    resource: "user",
    labelKey: "settings.roles.permissionGroup.user",
    items: [
      { code: "user.view", labelKey: "settings.roles.permission.userView" },
      {
        code: "user.manage",
        labelKey: "settings.roles.permission.userManage",
      },
      {
        code: "role.assign",
        labelKey: "settings.roles.permission.roleAssign",
      },
      {
        code: "permission.override",
        labelKey: "settings.roles.permission.permissionOverride",
      },
    ],
  },
  {
    resource: "settings",
    labelKey: "settings.roles.permissionGroup.settings",
    items: [
      {
        code: "settings.write",
        labelKey: "settings.roles.permission.settingsWrite",
      },
    ],
  },
];
