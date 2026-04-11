# 系统设置页原型 → 生产代码迁移映射

> 本文档定义原型中每个 section、config、script 到未来生产代码的一一映射关系。
>
> 生产代码遵循仓库已有的四层架构（`domain` → `data` → `features/{model,ui}` → `shared/ui`），
> 参考 `packages/mobile/src/features/case/` 和 `packages/mobile/src/domain/case/` 的现有模式。
>
> **前提约束**
>
> - `domain` 层纯 TypeScript：类型、实体、接口、常量，不依赖 UI 框架。
> - `features` 层 `model/` 放 ViewModel Hook（`useXxxViewModel`），`ui/` 放页面组件。
> - `data` 层实现 `domain` 接口：`createXxxRepository` + `XxxApi`。
> - `shared/ui` 放跨功能复用组件；feature 不直接引用 `tamagui`。
> - feature 之间不互相依赖，跨 feature 通过 `domain` / `shared` 协作。

---

## 1. Domain 层映射

原型 `data/settings-config.js` 中的声明式配置和隐式类型，以及 [07-数据模型设计 §3.0–3.0B](../../../../docs/gyoseishoshi_saas_md/P0/07-数据模型设计.md) 中的实体定义，迁移为 `domain/settings/` 下的纯 TypeScript 模块。

### 1.1 实体与值类型

| 原型来源 | 生产文件 | 导出 | 说明 |
|---------|---------|------|------|
| Group 列表行隐式结构（`sections/group-list-panel.html` 的 5 列） | `domain/settings/Group.ts` | `GroupSummary` | 列表用摘要：`id`, `groupNo`, `name`, `activeFlag`, `createdAt`, `activeCaseCount`, `memberCount` |
| Group 详情面板数据 | `domain/settings/Group.ts` | `GroupDetail` | `GroupSummary` 扩展：`description`, `members[]`, `customerCount` |
| Group 创建入参 | `domain/settings/Group.ts` | `CreateGroupInput` | `name`, `description?` |
| Group 更新入参 | `domain/settings/Group.ts` | `UpdateGroupInput` | `id`, `name?`, `description?` |
| Group 成员（只读展示） | `domain/settings/Group.ts` | `GroupMember` | `userId`, `userName`, `roleName`, `isPrimaryGroup`, `joinedAt` |
| Group 关联统计 | `domain/settings/Group.ts` | `GroupStats` | `customerCount`, `activeCaseCount` |
| OrgSetting（可见性 + 根目录） | `domain/settings/OrgSetting.ts` | `OrgSetting` | 见下方定义 |
| OrgSetting 更新入参 | `domain/settings/OrgSetting.ts` | `UpdateOrgSettingInput` | 部分更新 |
| 用户与 Group 关系 | `domain/settings/UserGroupMembership.ts` | `UserGroupMembership` | `userId`, `groupId`, `isPrimaryGroup`, `activeFlag`, `joinedAt`, `leftAt?` |

```typescript
// domain/settings/Group.ts

export type GroupSummary = {
  id: string;
  groupNo: string | null;
  name: string;
  activeFlag: boolean;
  createdAt: string;
  activeCaseCount: number;
  memberCount: number;
};

export type GroupDetail = GroupSummary & {
  description: string | null;
  members: GroupMember[];
  customerCount: number;
};

export type GroupMember = {
  userId: string;
  userName: string;
  roleName: string;
  isPrimaryGroup: boolean;
  joinedAt: string;
};

export type GroupStats = {
  customerCount: number;
  activeCaseCount: number;
};

export type CreateGroupInput = {
  name: string;
  description?: string;
};

export type UpdateGroupInput = {
  id: string;
  name?: string;
  description?: string;
};
```

```typescript
// domain/settings/OrgSetting.ts

export type OrgSetting = {
  id: string;
  orgId: string;
  localFileRootLabel: string | null;
  localFileRootPath: string | null;
  allowCrossGroupCaseCreateFlag: boolean;
  allowPrincipalViewCrossGroupCollabCaseFlag: boolean;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type UpdateOrgSettingInput = Partial<
  Pick<
    OrgSetting,
    | "localFileRootLabel"
    | "localFileRootPath"
    | "allowCrossGroupCaseCreateFlag"
    | "allowPrincipalViewCrossGroupCollabCaseFlag"
  >
>;
```

```typescript
// domain/settings/UserGroupMembership.ts

export type UserGroupMembership = {
  id: string;
  userId: string;
  groupId: string;
  isPrimaryGroup: boolean;
  activeFlag: boolean;
  joinedAt: string;
  leftAt: string | null;
};
```

### 1.2 仓库接口

| 原型来源 | 生产文件 | 导出 | 说明 |
|---------|---------|------|------|
| Group 列表（原型为静态 HTML 行） | `domain/settings/SettingsRepository.ts` | `SettingsRepository` | Group CRUD + 停用 + 列表查询 |
| OrgSetting 读写 | `domain/settings/SettingsRepository.ts` | `SettingsRepository` | 含可见性 + 根目录配置 |
| Group 成员列表 | `domain/settings/SettingsRepository.ts` | `SettingsRepository` | 含成员只读查询 |
| Group 关联统计 | `domain/settings/SettingsRepository.ts` | `SettingsRepository` | 含统计读模型查询 |

```typescript
// domain/settings/SettingsRepository.ts

import type {
  GroupSummary,
  GroupDetail,
  GroupStats,
  CreateGroupInput,
  UpdateGroupInput,
} from "./Group";
import type { OrgSetting, UpdateOrgSettingInput } from "./OrgSetting";

export type GroupListParams = {
  activeFlag?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type GroupListResult = {
  items: GroupSummary[];
  total: number;
};

export type SettingsRepository = {
  // Group CRUD
  listGroups(params: GroupListParams): Promise<GroupListResult>;
  getGroup(groupId: string): Promise<GroupDetail>;
  createGroup(input: CreateGroupInput): Promise<{ id: string }>;
  updateGroup(input: UpdateGroupInput): Promise<void>;
  disableGroup(groupId: string): Promise<void>;

  // Group statistics (read model)
  getGroupStats(groupId: string): Promise<GroupStats>;

  // OrgSetting
  getOrgSetting(): Promise<OrgSetting>;
  updateOrgSetting(input: UpdateOrgSettingInput): Promise<void>;
};
```

### 1.3 常量与配置

| 原型来源 (`settings-config.js`) | 生产文件 | 导出 | 说明 |
|------|---------|------|------|
| `SUBNAV_ITEMS` | `domain/settings/settingsConstants.ts` | `SETTINGS_SUBNAV_ITEMS` | 子导航配置 |
| `GROUP_STATUS_OPTIONS` | `domain/settings/settingsConstants.ts` | `GROUP_STATUSES` | `{ value, label }[]` |
| `GROUP_STATUS_LABEL_MAP` | `domain/settings/settingsConstants.ts` | `GROUP_STATUS_LABEL_MAP` | `Record<string, string>` |
| `GROUP_TABLE_COLUMNS` | `domain/settings/settingsConstants.ts` | `GROUP_TABLE_COLUMNS` | 列表列定义 schema |
| `MEMBER_TABLE_COLUMNS` | `domain/settings/settingsConstants.ts` | `MEMBER_TABLE_COLUMNS` | 成员列表列定义 |
| `VISIBILITY_CONFIG_ITEMS` | `domain/settings/settingsConstants.ts` | `VISIBILITY_CONFIG_ITEMS` | 可见性配置项定义 |
| `STORAGE_ROOT_FIELDS` | `domain/settings/settingsConstants.ts` | `STORAGE_ROOT_FIELDS` | 根目录表单字段定义 |
| `ROLE_VISIBILITY_MATRIX` | `domain/settings/settingsConstants.ts` | `ROLE_VISIBILITY_MATRIX` | P0 角色权限矩阵 |
| `PATH_STRATEGY_TEXT` | `domain/settings/settingsConstants.ts` | `PATH_STRATEGY_TEXT` | 路径策略说明文案 |
| `TOAST` | `domain/settings/settingsConstants.ts` | `SETTINGS_TOAST_PRESETS` | Toast 文案预设 |
| `PERMISSION_DENIED_TEXT` | `domain/settings/settingsConstants.ts` | `PERMISSION_DENIED_TEXT` | 权限不足提示文案 |
| `EMPTY_STATE_TEXT` | `domain/settings/settingsConstants.ts` | `EMPTY_STATE_TEXT` | 各空状态提示文案 |

### 1.4 Domain 层文件清单

```
domain/settings/
├── Group.ts                       ← 实体 & 值类型（GroupSummary, GroupDetail, GroupMember, GroupStats, CreateGroupInput, UpdateGroupInput）
├── OrgSetting.ts                  ← 事务所设置实体（OrgSetting, UpdateOrgSettingInput）
├── UserGroupMembership.ts         ← 用户与 Group 关系（P0 预留，成员只读查询在 GroupDetail.members 中承接）
├── SettingsRepository.ts          ← 仓库接口（Group CRUD + 统计 + OrgSetting）
└── settingsConstants.ts           ← 常量、列定义、配置项、Toast 预设
```

---

## 2. Data 层映射

| 原型来源 | 生产文件 | 导出 | 说明 |
|---------|---------|------|------|
| Group 列表静态数据（`settings-demo-data.js`） | `data/settings/SettingsApi.ts` | `createSettingsApi(deps)` | 调用 Server `/groups` + `/org-settings` 端点 |
| OrgSetting 静态数据 | `data/settings/SettingsApi.ts` | 同上 | `/org-settings` 端点 |
| Group 统计读模型 | `data/settings/SettingsApi.ts` | 同上 | `/groups/:id/stats` 端点 |
| 组合 | `data/settings/createSettingsRepository.ts` | `createSettingsRepository(deps)` | 实现 `SettingsRepository` |

### Data 层文件清单

```
data/settings/
├── SettingsApi.ts                     ← createSettingsApi({ httpClient, baseUrl, getToken })
└── createSettingsRepository.ts        ← 实现 SettingsRepository
```

### App Container 注册

在 `app/container/AppContainer.ts` 新增：

```typescript
settingsRepository: SettingsRepository;
```

---

## 3. Features 层映射（model → ViewModel Hooks）

### 3.1 ViewModel 总览

| 原型脚本 | 生产 Hook | 状态 / 职责 |
|---------|-----------|------------|
| `settings-page.js` | `useSettingsViewModel` | 页面级编排：子导航切换、面板显隐、toast、权限检查 |
| `settings-group-list.js` | `useGroupListViewModel` | 列表加载、筛选、行选中、空态 |
| `settings-group-detail.js` | `useGroupDetailViewModel` | 详情加载、元数据展示 |
| `settings-group-actions.js` | `useGroupActions` | 新建、重命名、停用确认弹窗 |
| `settings-group-members.js` | `useGroupMembers` | 成员列表加载（只读） |
| `settings-group-stats.js` | `useGroupStats` | 关联统计加载 |
| `settings-visibility.js` | `useVisibilityConfig` | 两项开关读写、保存 |
| `settings-storage-root.js` | `useStorageRootConfig` | 根目录字段读写、路径预览、保存、未配置态 |

### 3.2 映射详情

#### `settings-page.js` → `useSettingsViewModel`

```
原型函数/行为                       → Hook 暴露
─────────────────────────────────────────────────
DOMContentLoaded 初始化              → useEffect 首次加载
子导航 click                        → activePanel state
面板显隐切换                         → derived from activePanel
showToast(title, desc)              → toast state + show/dismiss
权限检查（管理员可见）                → isAdmin derived from user role
```

ViewState 定义：

```typescript
export type SettingsViewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready" }
  | { status: "permission-denied" }
  | { status: "error"; error: AppError };

export type SettingsPanel = "group-management" | "visibility-config" | "storage-root";
```

#### `settings-group-list.js` → `useGroupListViewModel`

```
原型函数                            → Hook 暴露
─────────────────────────────────────────────────
status filter change                → filterParams state
行选中                              → selectedGroupId state
空状态切换                           → isEmpty derived
列表加载                             → groups: GroupSummary[], total, isLoading
```

#### `settings-group-detail.js` → `useGroupDetailViewModel`

```
原型函数                            → Hook 暴露
─────────────────────────────────────────────────
load group detail                   → group: GroupDetail, isLoading
元数据展示                           → name, groupNo, activeFlag
```

#### `settings-group-actions.js` → `useGroupActions`

```
原型函数                            → Hook 暴露
─────────────────────────────────────────────────
create group                        → createGroup(input) → repository + toast
rename group                        → renameGroup(id, name) → repository + toast
disable group                       → disableGroup(id) → confirm modal → repository + toast
modal open/close                    → isDisableModalOpen, openDisableModal(group), closeDisableModal()
```

#### `settings-group-members.js` → `useGroupMembers`

```
原型函数                            → Hook 暴露
─────────────────────────────────────────────────
renderMemberList()                  → members: GroupMember[], isEmpty
```

#### `settings-group-stats.js` → `useGroupStats`

```
原型函数                            → Hook 暴露
─────────────────────────────────────────────────
renderStats()                       → stats: GroupStats, isLoading
```

#### `settings-visibility.js` → `useVisibilityConfig`

```
原型函数                            → Hook 暴露
─────────────────────────────────────────────────
toggle switch change                → allowCrossGroupCaseCreate, allowPrincipalViewCollab
save button click                   → saveVisibility() → repository + toast
load settings                       → isLoading, orgSetting
```

#### `settings-storage-root.js` → `useStorageRootConfig`

```
原型函数                            → Hook 暴露
─────────────────────────────────────────────────
form field change                   → rootLabel, rootPath (controlled state)
path preview                        → previewPath (derived: `{rootPath}/{relative_path}`)
未配置态                             → isConfigured (derived: rootPath !== null)
save button click                   → saveStorageRoot() → repository + toast
load settings                       → isLoading, orgSetting
```

### 3.3 Model 层文件清单

```
features/settings/model/
├── useSettingsViewModel.ts              ← 页面编排 Hook
├── useGroupListViewModel.ts             ← Group 列表 Hook
├── useGroupDetailViewModel.ts           ← Group 详情 Hook
├── useGroupActions.ts                   ← Group 动作 Hook（新建/重命名/停用）
├── useGroupMembers.ts                   ← Group 成员 Hook（只读）
├── useGroupStats.ts                     ← Group 统计 Hook
├── useVisibilityConfig.ts               ← 可见性配置 Hook
├── useStorageRootConfig.ts              ← 根目录配置 Hook
├── useSettingsViewModel.test.ts         ← 页面 ViewModel 测试
├── useGroupListViewModel.test.ts        ← 列表测试
├── useGroupActions.test.ts              ← 动作测试
├── useVisibilityConfig.test.ts          ← 可见性配置测试
└── useStorageRootConfig.test.ts         ← 根目录配置测试
```

---

## 4. Features 层映射（ui → 页面组件）

### 4.1 页面组件总览

| 原型 section | 生产组件 | 所在路径 | Props（核心） |
|-------------|---------|---------|--------------|
| `sections/page-header.html` | `SettingsPageHeader` | `features/settings/ui/` | — |
| `sections/settings-subnav.html` | `SettingsSubNav` | `features/settings/ui/` | `activePanel`, `onPanelChange` |
| `sections/group-list-panel.html` | `GroupListPanel` | `features/settings/ui/` | `groups`, `selectedId`, `filter`, `onFilterChange`, `onSelectGroup`, `onCreateGroup` |
| `sections/group-detail-meta.html` | `GroupDetailMeta` | `features/settings/ui/` | `group`, `onRename`, `onDisable` |
| `sections/group-members-panel.html` | `GroupMembersPanel` | `features/settings/ui/` | `members`, `isEmpty` |
| `sections/group-stats-panel.html` | `GroupStatsPanel` | `features/settings/ui/` | `stats` |
| `sections/group-disable-modal.html` | `GroupDisableModal` | `features/settings/ui/` | `isOpen`, `groupName`, `onConfirm`, `onCancel` |
| `sections/visibility-config-panel.html` | `VisibilityConfigPanel` | `features/settings/ui/` | `allowCrossGroup`, `allowPrincipalView`, `onToggle`, `onSave` |
| `sections/storage-root-panel.html` | `StorageRootPanel` | `features/settings/ui/` | `rootLabel`, `rootPath`, `previewPath`, `updatedBy`, `updatedAt`, `isConfigured`, `onChange`, `onSave` |
| `sections/toast.html` | `Toast` | `shared/ui/` | `title`, `description`, `visible`, `onDismiss` |
| 整页组装（`index.html`） | `SettingsScreen` | `features/settings/ui/` | 入口组件：组合上述子组件 + ViewModel Hooks |

### 4.2 原型 HTML 属性 → 组件 Props 对照

```
原型 DOM 钩子                        → 组件 Props / 事件
─────────────────────────────────────────────────────────
[data-subnav-id] click              → SettingsSubNav.onPanelChange(panelId)
select[data-filter=group-status]    → GroupListPanel.onFilterChange(activeFlag)
data-action="create-group" click    → GroupListPanel.onCreateGroup()
group row click                     → GroupListPanel.onSelectGroup(groupId)
#detailEditNameBtn click            → GroupDetailMeta.onRename()
#detailDisableBtn click             → GroupDetailMeta.onDisable()
#disableModalConfirmBtn click       → GroupDisableModal.onConfirm()
#disableModalCancelBtn click        → GroupDisableModal.onCancel()
#toggleCrossGroupCase change        → VisibilityConfigPanel.onToggle("crossGroup", value)
#togglePrincipalViewCollab change   → VisibilityConfigPanel.onToggle("principalView", value)
data-action="save-visibility"       → VisibilityConfigPanel.onSave()
#storageRootLabel input             → StorageRootPanel.onChange("label", value)
#storageRootPath input              → StorageRootPanel.onChange("path", value)
data-action="save-storage-root"     → StorageRootPanel.onSave()
#toast show                         → Toast.visible + title + description
```

### 4.3 UI 层文件清单

```
features/settings/ui/
├── SettingsScreen.tsx                   ← 页面入口（组装所有子组件 + Hooks）
├── SettingsPageHeader.tsx               ← 页面标题
├── SettingsSubNav.tsx                   ← 子导航（3 项）
├── GroupListPanel.tsx                   ← Group 列表（5 列 + 筛选 + 空态）
├── GroupDetailMeta.tsx                  ← Group 详情元数据
├── GroupMembersPanel.tsx                ← Group 成员列表（只读）
├── GroupStatsPanel.tsx                  ← Group 关联统计
├── GroupDisableModal.tsx                ← 停用确认弹窗
├── VisibilityConfigPanel.tsx            ← 可见性配置
└── StorageRootPanel.tsx                 ← 根目录配置
```

---

## 5. Shared 层映射

### 5.1 共享 UI 组件

| 原型来源 | 生产组件 | 所在路径 | 说明 |
|---------|---------|---------|------|
| `sections/toast.html` | `Toast` | `shared/ui/Toast.tsx` | 全局 Toast（客户模块已定义，复用） |
| `shared/shell/side-nav.html` | `SideNav` | `shared/ui/SideNav.tsx` | 桌面侧边导航 |
| `shared/shell/topbar.html` | `TopBar` | `shared/ui/TopBar.tsx` | 顶部工具栏 |
| `shared/shell/mobile-nav.html` | `MobileNav` | `shared/ui/MobileNav.tsx` | 移动端抽屉导航 |
| `shared/shell/*.html` 组合 | `AppShell` | `shared/ui/AppShell.tsx` | 页面壳子 |

### 5.2 共享 Hook

| 原型来源 | 生产 Hook | 所在路径 | 说明 |
|---------|-----------|---------|------|
| `shared/scripts/mobile-nav.js` | `useMobileNav` | `shared/hooks/useMobileNav.ts` | `isOpen`, `open()`, `close()`, Escape 键 |
| `shared/scripts/navigate.js` | 不需要 | — | React Navigation 取代 |

### 5.3 共享样式

| 原型来源 | 生产去向 | 说明 |
|---------|---------|------|
| `shared/styles/tokens.css` | Design tokens → Tamagui theme config 或 `:root` CSS 变量 | 颜色、间距、圆角、字体 |
| `shared/styles/shell.css` | `AppShell`/`SideNav`/`TopBar`/`MobileNav` 内部样式 | 布局网格、导航动画 |
| `shared/styles/components.css` | 各 `shared/ui` 组件内部样式 | 按钮、卡片、表格、弹窗、表单、badge |

---

## 6. 完整文件树总览

```
packages/mobile/src/
│
├── domain/settings/
│   ├── Group.ts                         ← 实体 & 值类型（Group 摘要/详情/成员/统计/输入）
│   ├── OrgSetting.ts                    ← 事务所设置实体（可见性 + 根目录）
│   ├── UserGroupMembership.ts           ← 用户-Group 关系（P0 成员只读查询）
│   ├── SettingsRepository.ts            ← 仓库接口（Group CRUD + 统计 + OrgSetting）
│   └── settingsConstants.ts             ← 列定义 / 配置项 / 角色矩阵 / Toast 预设
│
├── data/settings/
│   ├── SettingsApi.ts                   ← HTTP 端点调用
│   └── createSettingsRepository.ts      ← 实现 SettingsRepository
│
├── features/settings/
│   ├── model/
│   │   ├── useSettingsViewModel.ts
│   │   ├── useGroupListViewModel.ts
│   │   ├── useGroupDetailViewModel.ts
│   │   ├── useGroupActions.ts
│   │   ├── useGroupMembers.ts
│   │   ├── useGroupStats.ts
│   │   ├── useVisibilityConfig.ts
│   │   ├── useStorageRootConfig.ts
│   │   └── *.test.ts
│   └── ui/
│       ├── SettingsScreen.tsx           ← 页面入口
│       ├── SettingsPageHeader.tsx
│       ├── SettingsSubNav.tsx
│       ├── GroupListPanel.tsx
│       ├── GroupDetailMeta.tsx
│       ├── GroupMembersPanel.tsx
│       ├── GroupStatsPanel.tsx
│       ├── GroupDisableModal.tsx
│       ├── VisibilityConfigPanel.tsx
│       └── StorageRootPanel.tsx
│
├── shared/
│   ├── ui/
│   │   ├── Toast.tsx                    ← 复用（客户模块已定义）
│   │   ├── AppShell.tsx                 ← 复用
│   │   ├── SideNav.tsx                  ← 复用
│   │   ├── TopBar.tsx                   ← 复用
│   │   └── MobileNav.tsx               ← 复用
│   └── hooks/
│       └── useMobileNav.ts             ← 复用
│
└── app/container/
    └── AppContainer.ts                  ← 新增 settingsRepository
```

---

## 7. 跨模块依赖说明

### 7.1 根目录未配置 → 案件/资料中心门槛

| 依赖方 | 影响 | 处理方式 |
|--------|------|---------|
| 案件详情 → 资料 Tab → "登记资料（本地归档）" | 根目录未配置时入口禁用，显示提示 | 案件模块自行读取 `OrgSetting.localFileRootPath` 判断 |
| 资料中心 → "登记资料（本地归档）" | 同上 | 资料中心模块自行检查 |
| 资料中心 → 资料路径显示 | 根目录未配置时 `{root}/{relative_path}` 无法拼接完整路径 | 展示 `relative_path` 并附提示"根目录未配置" |

#### 7.1.1 禁用规则详细约定

**判定条件**：`OrgSetting.localFileRootPath` 为 `null`、空字符串或纯空白时，视为"未配置"。

**案件模块影响**：

| 入口 | 未配置时行为 | 提示文案 |
|------|------------|---------|
| 案件详情 → 资料 Tab → "登记资料（本地归档）"按钮 | 按钮置灰（`disabled`） | tooltip / 行内提示："本地资料根目录尚未配置，请联系管理员在「系统设置 → 本地资料根目录」中完成配置" |
| 案件详情 → 资料 Tab → 已有本地资料行的路径列 | 仅显示 `relative_path`，不拼接完整路径 | 路径列追加灰色标注："(根目录未配置)" |

**资料中心模块影响**：

| 入口 | 未配置时行为 | 提示文案 |
|------|------------|---------|
| 资料中心 → "登记资料（本地归档）"按钮 | 按钮置灰 | 同案件模块提示文案 |
| 资料中心 → 已有资料行的完整路径预览 | 仅显示 `relative_path` | 路径列追加灰色标注 |

**生产代码检查点**：

- 案件模块 `useDocumentTabViewModel` 在 mount 时读取 `OrgSetting.localFileRootPath`，derive `isStorageRootConfigured`。
- 资料中心 `useDocumentsViewModel` 同理。
- 两处均不直接依赖 `features/settings/`，而是通过 `domain/settings/OrgSetting.ts` 类型 + `SettingsRepository.getOrgSetting()` 接口读取。
- 当管理员在系统设置中配置根目录后，案件/资料中心下次加载时自动解除禁用，无需额外通知机制（非实时，基于 API 请求刷新）。

#### 7.1.2 原型中的对应实现

| 原型页面 | DOM 标识 | 行为 |
|---------|---------|------|
| `settings/index.html` | `#storageNotConfiguredHint` | 设置页内的未配置警告，提示管理员配置根目录 |
| `case/detail.html` | 资料 Tab 登记按钮 | （P0 原型暂未实现禁用联动，登记为跨模块回归项） |
| `documents/index.html` | 登记资料按钮 | （P0 原型暂未实现禁用联动，登记为跨模块回归项） |

### 7.2 跨组动作审计 → 客户/案件/线索流程域

| 场景 | 归属模块 | 说明 |
|------|---------|------|
| 跨组建案 | 案件模块 | 建案时检查 `OrgSetting.allowCrossGroupCaseCreateFlag`；如允许，需记录原因 + 操作人 + 时间 |
| 转组 | 客户模块 | 客户 Group 变更需留痕（操作人、时间、旧组、新组、变更原因）；不回写历史案件 |
| 线索转化改组 | 线索模块 | 线索转化为客户时，若改变归属 Group，需记录改组原因 |

> **边界声明**：`settings` 页只负责管理 `OrgSetting` 中的可见性开关值。以上跨组动作的原因采集与审计留痕**不在 settings 模块实现**，必须作为独立跨模块任务登记。

#### 7.2.1 审计字段约定

跨组动作审计记录应至少包含以下字段（由各归属模块实现）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `actionType` | `string` | `cross_group_case_create` / `group_transfer` / `lead_convert_group_change` |
| `actorId` | `string` | 操作人 ID |
| `actorName` | `string` | 操作人名称（快照） |
| `performedAt` | `ISO 8601` | 操作时间 |
| `sourceGroupId` | `string` | 原 Group（可为 `null`，如新建客户直接跨组建案） |
| `targetGroupId` | `string` | 目标 Group |
| `reason` | `string` | 操作人填写的变更原因（必填） |
| `relatedEntityType` | `string` | `case` / `customer` / `lead` |
| `relatedEntityId` | `string` | 关联的案件/客户/线索 ID |

#### 7.2.2 settings 模块与审计链的分工

| 职责 | 归属 | 说明 |
|------|------|------|
| 维护 `allowCrossGroupCaseCreateFlag` 开关 | settings | 系统设置页可见性配置面板 |
| 维护 `allowPrincipalViewCrossGroupCollabCaseFlag` 开关 | settings | 系统设置页可见性配置面板 |
| 检查开关值并决定是否允许跨组操作 | 各业务模块 | 建案/转组/线索转化时自行读取 `OrgSetting` |
| 采集变更原因 | 各业务模块 | 弹窗/表单采集，settings 不参与 |
| 写入审计记录 | 各业务模块 | 写入 `audit_log` 表或领域事件，settings 不参与 |
| 读取/展示审计记录 | 各业务模块详情页 | 案件/客户详情的操作日志 Tab |

### 7.3 Group 实体被其他模块引用

| 引用方 | 引用字段 | 说明 |
|--------|---------|------|
| `Customer.group_id` | 客户归属 Group | `domain/customer/Customer.ts` 引用 `GroupCode` 或 `groupId` |
| `Case.group_id` | 案件归属 Group | 继承自客户，建案时快照 |
| `Lead.group_id` | 线索归属 Group | 转化时继承至 Customer |

生产代码中，`Group` 实体定义在 `domain/settings/` 下，其他模块通过 `groupId: string` 引用，不直接依赖 `domain/settings/Group.ts` 的完整类型。跨模块 Group 名称展示通过 shared 的 `GroupLabelMap` 或 API 端点解析。

### 7.4 停用 Group → 其他模块选择列表门槛

| 依赖方 | 影响 | 处理方式 |
|--------|------|---------|
| 客户新建/编辑 → Group 选择下拉 | 停用 Group 不出现在可选列表中 | 客户模块查询 Group 列表时传 `activeFlag=true` |
| 案件新建 → Group 选择 | 同上 | 案件模块自行过滤 |
| 客户/案件详情 → 已关联的停用 Group | 仍显示名称 + "(已停用)" 标记 | 详情读取 `GroupDetail` 含 `activeFlag`，展示层加灰色标注 |

> **不变量**：已被客户/案件引用的 Group 不可物理删除，只能停用。停用后新建对象不可选择，已关联对象不受影响（[03-业务规则 §12](../../../../docs/gyoseishoshi_saas_md/P0/03-业务规则与不变量.md#12-group-治理)）。

### 7.5 跨模块外部依赖任务登记

以下任务**不在 settings 模块范围内实现**，但由 settings 模块规格触发或关联。各归属模块须在自身迭代中认领并实现。此登记表作为上线前的跨模块完整性检查清单。

| 任务 ID | 任务名称 | 归属模块 | 前置条件 | 验收标准 | 状态 |
|---------|---------|---------|---------|---------|------|
| `XMOD-SET-001` | 跨组建案原因采集与审计留痕 | 案件（case） | settings 可见性开关已上线 | 跨组建案时弹出原因输入，审计记录含 §7.2.1 全部字段 | 待认领 |
| `XMOD-SET-002` | 客户转组原因采集与审计留痕 | 客户（customers） | Group 实体与 Customer.group_id 已上线 | 转组时弹出原因输入，审计记录含 §7.2.1 全部字段 | 待认领 |
| `XMOD-SET-003` | 线索转化改组原因采集与审计留痕 | 线索（leads-message） | 线索转化流程与 Group 选择已上线 | 改组时弹出原因输入，审计记录含 §7.2.1 全部字段 | 待认领 |
| `XMOD-SET-004` | 根目录未配置 → 案件资料 Tab 本地归档入口禁用 | 案件（case） | settings 根目录配置 API 已上线 | 根目录未配置时按钮禁用 + 提示，详见 §7.1.1 | 待认领 |
| `XMOD-SET-005` | 根目录未配置 → 资料中心本地归档入口禁用 | 资料中心（documents） | settings 根目录配置 API 已上线 | 同 XMOD-SET-004 | 待认领 |
| `XMOD-SET-006` | Group 停用 → 业务模块 Group 下拉排除 | 案件 / 客户 / 线索 | Group CRUD API 已上线 | 下拉选择器排除 `activeFlag=false`，详见 §7.4 | 待认领 |

> **管理约定**：settings 模块 P0 上线时，以上任务至少应处于"已认领"状态。若任一任务未被认领，视为上线风险项，须在发版审查中显式标注。
>
> 详细回归门槛见 [REGRESSION-GATE.md](./REGRESSION-GATE.md)。

### 7.5 外部依赖任务登记

以下任务与 `settings` 模块有数据依赖，但实现职责属于其他模块，不在 `settings` 页面合并实现。各任务已在 `split-manifest.json` 的 `crossModuleDependencies` 字段中正式注册。

#### TASK-EXT-01: 跨组建案/转组/线索转化改组的原因采集与审计留痕

| 属性 | 值 |
|------|------|
| **任务 ID** | `cross-group-audit-trail` |
| **归属模块** | 案件（`case`）、客户（`customer`）、线索（`leads-message`） |
| **触发条件** | 用户执行跨组建案、客户转组、线索转化改组操作 |
| **对 settings 的读依赖** | `OrgSetting.allowCrossGroupCaseCreateFlag`、`OrgSetting.allowPrincipalViewCrossGroupCollabCaseFlag` |
| **实现要求** | 弹窗/表单采集变更原因（必填）→ 写入审计记录 → 在详情页操作日志 Tab 展示 |
| **settings 不实现** | 原因采集 UI、审计写入、审计展示 |
| **P0 优先级** | 是（跨组留痕属于业务规则 [03 §12](../../../../docs/gyoseishoshi_saas_md/P0/03-业务规则与不变量.md#12-group-治理) 要求） |

审计记录字段（最小集）：`actionType`、`actorId`、`actorName`、`performedAt`、`sourceGroupId`、`targetGroupId`、`reason`、`relatedEntityType`、`relatedEntityId`。详见 §7.2.1。

#### TASK-EXT-02: 根目录未配置 → 案件/资料中心入口禁用

| 属性 | 值 |
|------|------|
| **任务 ID** | `storage-root-cross-module-gate` |
| **归属模块** | 案件（`case`）、资料中心（`documents`） |
| **触发条件** | 页面加载时检查 `OrgSetting.localFileRootPath` |
| **对 settings 的读依赖** | `OrgSetting.localFileRootPath` |
| **实现要求** | `localFileRootPath` 为空时，"登记资料（本地归档）"按钮置灰 + 显示提示 |
| **settings 不实现** | 按钮禁用逻辑、提示 UI |
| **P0 优先级** | 是（防止业务人员用绝对路径替代，[03 §1.1](../../../../docs/gyoseishoshi_saas_md/P0/03-业务规则与不变量.md#11-冻结口径)） |

详见 §7.1.1 禁用规则详细约定。

#### TASK-EXT-03: 停用 Group 不出现在选择列表

| 属性 | 值 |
|------|------|
| **任务 ID** | `disabled-group-selection-gate` |
| **归属模块** | 案件（`case`）、客户（`customer`） |
| **触发条件** | 新建/编辑客户、新建案件时的 Group 选择下拉加载 |
| **对 settings 的读依赖** | `Group.activeFlag` |
| **实现要求** | 查询 Group 列表时传 `activeFlag=true`，停用 Group 不出现在可选列表 |
| **settings 不实现** | 选择列表过滤逻辑 |
| **P0 优先级** | 是（[03 §12](../../../../docs/gyoseishoshi_saas_md/P0/03-业务规则与不变量.md#12-group-治理)：停用 Group 不可被新对象选择） |

---

## 8. 迁移顺序建议

| 阶段 | 范围 | 前置条件 |
|------|------|---------|
| **M1** | `domain/settings/` 全部文件 | 无（纯类型，可独立提交） |
| **M2** | `data/settings/` + AppContainer 注册 | M1 + Server 端 Settings API 就绪 |
| **M3** | `features/settings/model/` 八个 Hook + 测试 | M1 + M2 |
| **M4** | `features/settings/ui/` 全部页面组件 | M3 + shared/ui 已就绪 |
| **M5** | 路由注册 + 集成测试 + 权限守卫 | M4 |

---

## 9. 原型 → 生产差异备忘

| 原型行为 | 生产变化 | 原因 |
|---------|---------|------|
| 子导航用 CSS class 切换 | State 驱动 + `activePanel` 状态 | 声明式 UI |
| Group 列表硬编码 HTML 行 | API 动态数据 + 空状态处理 | 真实数据源 |
| 成员列表硬编码 | API 动态数据 + GroupDetail.members | 真实数据源 |
| 统计数字硬编码 | API 聚合查询或 GroupStats 端点 | 真实数据源 |
| 可见性开关静态 toggle | State 驱动 + API 读写 | 真实持久化 |
| 根目录路径预览字符串拼接 | Hook 中 derived state | 响应式计算 |
| toast 标注「示例」 | 真实后端操作后反馈 | 生产行为 |
| 无权限控制 | 路由守卫 + `useSettingsViewModel` 权限检查 | P0 仅管理员可见 |
| `window.__settingsPage` 全局命名空间 | ES module import + DI container | 消除全局状态 |
| `onclick` / `data-action` 事件 | React 事件 prop（`onPress`, `onChange`） | 框架层事件系统 |
| DOM ID 耦合 | Props 驱动 + state 控制可见性 | 声明式 UI |
