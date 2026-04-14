import type {
  GroupColumnDef,
  GroupDetail,
  GroupMember,
  GroupStats,
  GroupStatus,
  OrgSettings,
  GroupSummary,
  RoleVisibilityEntry,
  SelectOption,
  SettingsSubNavItem,
  SettingsToastKey,
  SettingsToastPreset,
  StatusBadgeConfig,
  StorageRootFieldDef,
  VisibilityConfigItem,
} from "./types";

// ---------------------------------------------------------------------------
// Sub-navigation (P0: 3 panels)
// ---------------------------------------------------------------------------

export const SETTINGS_SUBNAV_ITEMS: SettingsSubNavItem[] = [
  {
    id: "group-management",
    labelKey: "settings.subnav.groupManagement",
    defaultActive: true,
  },
  { id: "visibility-config", labelKey: "settings.subnav.visibilityConfig" },
  { id: "storage-root", labelKey: "settings.subnav.storageRoot" },
];

export const DEFAULT_PANEL = "group-management" as const;

// ---------------------------------------------------------------------------
// Group status
// ---------------------------------------------------------------------------

export const GROUP_STATUS_OPTIONS: SelectOption[] = [
  { value: "", label: "settings.group.filter.all" },
  { value: "active", label: "settings.group.filter.active" },
  { value: "disabled", label: "settings.group.filter.disabled" },
];

export const GROUP_STATUS_BADGE: Record<GroupStatus, StatusBadgeConfig> = {
  active: { label: "settings.group.status.active", variant: "green" },
  disabled: { label: "settings.group.status.disabled", variant: "gray" },
};

// ---------------------------------------------------------------------------
// Group list columns (P0-CONTRACT §2.1: 5 columns)
// ---------------------------------------------------------------------------

export const GROUP_TABLE_COLUMNS: GroupColumnDef[] = [
  { key: "name", labelKey: "settings.group.columns.name" },
  {
    key: "status",
    labelKey: "settings.group.columns.status",
    width: "100px",
  },
  {
    key: "createdAt",
    labelKey: "settings.group.columns.createdAt",
    width: "140px",
  },
  {
    key: "activeCaseCount",
    labelKey: "settings.group.columns.activeCases",
    width: "110px",
    align: "center",
  },
  {
    key: "memberCount",
    labelKey: "settings.group.columns.members",
    width: "80px",
    align: "center",
  },
];

// ---------------------------------------------------------------------------
// Member table columns (P0-CONTRACT §3.2: 3 columns, read-only)
// ---------------------------------------------------------------------------

export const MEMBER_TABLE_COLUMNS: GroupColumnDef[] = [
  { key: "name", labelKey: "settings.group.memberColumns.name" },
  {
    key: "role",
    labelKey: "settings.group.memberColumns.role",
    width: "100px",
  },
  {
    key: "joinedAt",
    labelKey: "settings.group.memberColumns.joinedAt",
    width: "120px",
  },
];

// ---------------------------------------------------------------------------
// Visibility config items (P0-CONTRACT §5)
// ---------------------------------------------------------------------------

export const VISIBILITY_CONFIG_ITEMS: VisibilityConfigItem[] = [
  {
    id: "crossGroupCase",
    labelKey: "settings.visibility.crossGroupCase.label",
    descriptionKey: "settings.visibility.crossGroupCase.description",
  },
  {
    id: "crossGroupView",
    labelKey: "settings.visibility.crossGroupView.label",
    descriptionKey: "settings.visibility.crossGroupView.description",
  },
];

// ---------------------------------------------------------------------------
// Storage root fields (P0-CONTRACT §6)
// ---------------------------------------------------------------------------

export const STORAGE_ROOT_FIELDS: StorageRootFieldDef[] = [
  {
    key: "rootLabel",
    labelKey: "settings.storageRoot.fields.rootLabel.label",
    required: true,
    placeholderKey: "settings.storageRoot.fields.rootLabel.placeholder",
  },
  {
    key: "rootPath",
    labelKey: "settings.storageRoot.fields.rootPath.label",
    required: true,
    placeholderKey: "settings.storageRoot.fields.rootPath.placeholder",
    hintKey: "settings.storageRoot.fields.rootPath.hint",
  },
];

export const PATH_STRATEGY_TEXT_KEY = "settings.storageRoot.pathStrategy";

// ---------------------------------------------------------------------------
// Role visibility matrix (P0-CONTRACT §8)
// ---------------------------------------------------------------------------

export const ROLE_VISIBILITY_MATRIX: RoleVisibilityEntry[] = [
  { role: "管理員", visible: true, editable: true },
  { role: "主办人", visible: false, editable: false },
  { role: "助理", visible: false, editable: false },
  { role: "销售", visible: false, editable: false },
  { role: "財務", visible: false, editable: false },
];

// ---------------------------------------------------------------------------
// Role chip variants (prototype ROLE_CHIP_STYLES → semantic color keys)
// ---------------------------------------------------------------------------

export const ROLE_CHIP_VARIANT: Record<string, string> = {
  管理員: "blue",
  主办人: "purple",
  助理: "gray",
  销售: "amber",
  財務: "green",
};

// ---------------------------------------------------------------------------
// Toast presets (P0-CONTRACT §9: 5 scenarios)
// ---------------------------------------------------------------------------

export const TOAST_DURATION_MS = 2400;

export const SETTINGS_TOAST_PRESETS: Record<
  SettingsToastKey,
  SettingsToastPreset
> = {
  groupCreated: {
    titleKey: "settings.toast.groupCreated.title",
    descriptionKey: "settings.toast.groupCreated.description",
  },
  groupRenamed: {
    titleKey: "settings.toast.groupRenamed.title",
    descriptionKey: "settings.toast.groupRenamed.description",
  },
  groupDisabled: {
    titleKey: "settings.toast.groupDisabled.title",
    descriptionKey: "settings.toast.groupDisabled.description",
  },
  visibilityUpdated: {
    titleKey: "settings.toast.visibilityUpdated.title",
    descriptionKey: "settings.toast.visibilityUpdated.description",
  },
  storageRootUpdated: {
    titleKey: "settings.toast.storageRootUpdated.title",
    descriptionKey: "settings.toast.storageRootUpdated.description",
  },
};

// ---------------------------------------------------------------------------
// Sample groups
// ---------------------------------------------------------------------------

export const SAMPLE_GROUPS: GroupSummary[] = [
  {
    id: "tokyo-1",
    name: "東京一組",
    status: "active",
    createdAt: "2024-01-15",
    activeCaseCount: 12,
    memberCount: 4,
  },
  {
    id: "tokyo-2",
    name: "東京二組",
    status: "active",
    createdAt: "2024-03-01",
    activeCaseCount: 8,
    memberCount: 3,
  },
  {
    id: "osaka",
    name: "大阪組",
    status: "disabled",
    createdAt: "2024-02-10",
    activeCaseCount: 0,
    memberCount: 2,
  },
];

// ---------------------------------------------------------------------------
// Sample group members (keyed by group ID)
// ---------------------------------------------------------------------------

export const SAMPLE_GROUP_MEMBERS: Record<string, GroupMember[]> = {
  "tokyo-1": [
    { name: "Admin", role: "管理員", joinedAt: "2024-01-15" },
    { name: "田中太郎", role: "主办人", joinedAt: "2024-01-20" },
    { name: "鈴木花子", role: "助理", joinedAt: "2024-02-01" },
    { name: "佐藤一郎", role: "助理", joinedAt: "2024-03-15" },
  ],
  "tokyo-2": [
    { name: "Tom", role: "主办人", joinedAt: "2024-03-01" },
    { name: "高橋美咲", role: "助理", joinedAt: "2024-03-10" },
    { name: "山田健一", role: "销售", joinedAt: "2024-04-01" },
  ],
  osaka: [
    { name: "伊藤裕子", role: "主办人", joinedAt: "2024-02-10" },
    { name: "中村大輔", role: "助理", joinedAt: "2024-02-15" },
  ],
};

// ---------------------------------------------------------------------------
// Sample group stats (keyed by group ID)
// ---------------------------------------------------------------------------

export const SAMPLE_GROUP_STATS: Record<string, GroupStats> = {
  "tokyo-1": { customerCount: 28, activeCaseCount: 35 },
  "tokyo-2": { customerCount: 15, activeCaseCount: 20 },
  osaka: { customerCount: 8, activeCaseCount: 10 },
};

// ---------------------------------------------------------------------------
// Sample group details (keyed by group ID)
// ---------------------------------------------------------------------------

export const SAMPLE_GROUP_DETAILS: Record<string, GroupDetail> = {
  "tokyo-1": {
    id: "tokyo-1",
    name: "東京一組",
    status: "active",
    createdAt: "2024-01-15",
    activeCaseCount: 12,
    memberCount: 4,
    groupNo: "GRP-001",
    description: null,
    members: SAMPLE_GROUP_MEMBERS["tokyo-1"]!,
    customerCount: 28,
  },
  "tokyo-2": {
    id: "tokyo-2",
    name: "東京二組",
    status: "active",
    createdAt: "2024-03-01",
    activeCaseCount: 8,
    memberCount: 3,
    groupNo: "GRP-002",
    description: null,
    members: SAMPLE_GROUP_MEMBERS["tokyo-2"]!,
    customerCount: 15,
  },
  osaka: {
    id: "osaka",
    name: "大阪組",
    status: "disabled",
    createdAt: "2024-02-10",
    activeCaseCount: 0,
    memberCount: 2,
    groupNo: "GRP-003",
    description: null,
    members: SAMPLE_GROUP_MEMBERS["osaka"]!,
    customerCount: 8,
  },
};

// ---------------------------------------------------------------------------
// Sample org settings
// ---------------------------------------------------------------------------

export const SAMPLE_ORG_SETTINGS: OrgSettings = {
  visibility: {
    allowCrossGroupCaseCreate: false,
    allowPrincipalViewCrossGroupCollab: false,
  },
  storageRoot: {
    rootLabel: "案件資料総盤",
    rootPath: "\\\\fileserver\\gyosei-docs",
    updatedBy: "Admin",
    updatedAt: "2025-03-20 14:30",
  },
};

// ---------------------------------------------------------------------------
// Sample org settings — unconfigured storage root (P0-CONTRACT §7 state 4)
// ---------------------------------------------------------------------------

export const SAMPLE_ORG_SETTINGS_UNCONFIGURED: OrgSettings = {
  visibility: {
    allowCrossGroupCaseCreate: false,
    allowPrincipalViewCrossGroupCollab: false,
  },
  storageRoot: {
    rootLabel: null,
    rootPath: null,
    updatedBy: null,
    updatedAt: null,
  },
};
