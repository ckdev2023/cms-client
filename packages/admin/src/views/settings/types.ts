/**
 *
 */
export type SettingsPanel =
  | "group-management"
  | "visibility-config"
  | "storage-root";

/**
 *
 */
export type GroupStatus = "active" | "disabled";

/**
 *
 */
export type GroupStatusFilter = "" | GroupStatus;

// ---------------------------------------------------------------------------
// Group
// ---------------------------------------------------------------------------

/**
 *
 */
export interface GroupSummary {
  /**
   *
   */
  id: string;
  /**
   *
   */
  name: string;
  /**
   *
   */
  status: GroupStatus;
  /**
   *
   */
  createdAt: string;
  /**
   *
   */
  activeCaseCount: number;
  /**
   *
   */
  memberCount: number;
}

/**
 *
 */
export interface GroupDetail extends GroupSummary {
  /**
   *
   */
  groupNo: string;
  /**
   *
   */
  description: string | null;
  /**
   *
   */
  members: GroupMember[];
  /**
   *
   */
  customerCount: number;
}

/**
 *
 */
export interface GroupMember {
  /**
   *
   */
  name: string;
  /**
   *
   */
  role: string;
  /**
   *
   */
  joinedAt: string;
}

/**
 *
 */
export interface GroupStats {
  /**
   *
   */
  customerCount: number;
  /**
   *
   */
  activeCaseCount: number;
}

// ---------------------------------------------------------------------------
// Org settings (visibility + storage root)
// ---------------------------------------------------------------------------

/**
 *
 */
export interface OrgSettings {
  /**
   *
   */
  visibility: {
    /**
     *
     */
    allowCrossGroupCaseCreate: boolean;
    /**
     *
     */
    allowPrincipalViewCrossGroupCollab: boolean;
  };
  /**
   *
   */
  storageRoot: {
    /**
     *
     */
    rootLabel: string | null;
    /**
     *
     */
    rootPath: string | null;
    /**
     *
     */
    updatedBy: string | null;
    /**
     *
     */
    updatedAt: string | null;
  };
}

// ---------------------------------------------------------------------------
// UI config / schema
// ---------------------------------------------------------------------------

/**
 *
 */
export interface SettingsSubNavItem {
  /**
   *
   */
  id: SettingsPanel;
  /**
   *
   */
  labelKey: string;
  /**
   *
   */
  defaultActive?: boolean;
}

/**
 *
 */
export interface GroupColumnDef {
  /**
   *
   */
  key: string;
  /**
   *
   */
  labelKey: string;
  /**
   *
   */
  width?: string;
  /**
   *
   */
  align?: "left" | "center" | "right";
}

/**
 *
 */
export interface VisibilityConfigItem {
  /**
   *
   */
  id: string;
  /**
   *
   */
  labelKey: string;
  /**
   *
   */
  descriptionKey: string;
}

/**
 *
 */
export interface StorageRootFieldDef {
  /**
   *
   */
  key: string;
  /**
   *
   */
  labelKey: string;
  /**
   *
   */
  required: boolean;
  /**
   *
   */
  placeholderKey?: string;
  /**
   *
   */
  hintKey?: string;
}

/**
 *
 */
export interface RoleVisibilityEntry {
  /**
   *
   */
  role: string;
  /**
   *
   */
  visible: boolean;
  /**
   *
   */
  editable: boolean;
}

/**
 *
 */
export interface StatusBadgeConfig {
  /**
   *
   */
  label: string;
  /**
   *
   */
  variant: "green" | "gray";
}

/**
 *
 */
export interface SelectOption {
  /**
   *
   */
  value: string;
  /**
   *
   */
  label: string;
}

// ---------------------------------------------------------------------------
// Toast presets (P0-CONTRACT §9)
// ---------------------------------------------------------------------------

/**
 * 系统设置页 5 种 toast 场景的键。
 */
export type SettingsToastKey =
  | "groupCreated"
  | "groupRenamed"
  | "groupDisabled"
  | "visibilityUpdated"
  | "storageRootUpdated";

/**
 *
 */
export interface SettingsToastPreset {
  /**
   *
   */
  titleKey: string;
  /**
   *
   */
  descriptionKey: string;
}
