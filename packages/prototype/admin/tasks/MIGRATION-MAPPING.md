# 任务与提醒页原型 → 生产代码迁移映射

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

原型 `data/tasks-config.js` 中的声明式配置和隐式类型，迁移为 `domain/task/` 下的纯 TypeScript 模块。

### 1.1 实体与值类型

| 原型来源 | 生产文件 | 导出 | 说明 |
|---------|---------|------|------|
| 表格行隐式结构（`sections/task-table.html` 的 8 列） | `domain/task/Task.ts` | `TaskSummary` | 列表用摘要：`id`, `taskName`, `caseId`, `caseLabel`, `group`, `owner`, `priority`, `deadline`, `status`, `source` |
| 弹窗表单隐式结构（`FORM_FIELDS` 序列化） | `domain/task/Task.ts` | `CreateTaskInput` | 新建任务入参：对应 `FORM_FIELDS` 的 key 集合 |
| 弹窗编辑态 | `domain/task/Task.ts` | `UpdateTaskInput` | 编辑任务入参：`Partial<CreateTaskInput> & { id: string }` |
| 任务详情面板数据 | `domain/task/Task.ts` | `TaskDetail` | `TaskSummary` 扩展：`description`, `auditLog[]` |
| 提醒日志条目 | `domain/task/Task.ts` | `ReminderLogEntry` | `sentAt`, `recipient`, `type`, `status`, `failReason`, `taskId` |
| 操作记录条目 | `domain/task/Task.ts` | `TaskAuditEntry` | `timestamp`, `action`, `actor`, `detail` |
| 取消原因（P0 枚举，P0-CONTRACT §7） | `domain/task/Task.ts` | `CancelReasonCode` | 5 项枚举联合类型 |

```typescript
// domain/task/Task.ts

export type TaskSummary = {
  id: string;
  taskName: string;
  caseId: string | null;
  caseLabel: string | null;
  group: GroupCode;
  owner: { id: string; name: string } | null;
  priority: TaskPriority;
  deadline: string;
  status: TaskStatus;
  source: TaskSource;
};

export type TaskDetail = TaskSummary & {
  description: string | null;
  auditLog: TaskAuditEntry[];
};

export type CreateTaskInput = {
  taskName: string;
  caseId?: string;
  group: GroupCode;
  owner: string;
  priority?: TaskPriority;
  deadline: string;
  description?: string;
  source?: TaskSource;
};

export type UpdateTaskInput = Partial<CreateTaskInput> & { id: string };

export type ReminderLogEntry = {
  id: string;
  sentAt: string;
  recipient: string;
  type: ReminderType;
  status: "sent" | "failed";
  failReason: string | null;
  taskId: string;
  taskName: string;
};

export type TaskAuditEntry = {
  timestamp: string;
  action: "created" | "assigned" | "completed" | "canceled" | "deadline-changed";
  actor: string;
  detail: string | null;
};

export type TaskStatus = "todo" | "doing" | "done" | "canceled";
export type TaskPriority = "high" | "medium" | "low";
export type TaskSource = "manual" | "template" | "reminder" | "validation-fail" | "correction" | "renewal";
export type CancelReasonCode = "duplicate" | "case-terminated" | "other-process" | "input-error" | "other";
export type ReminderType = "residence-expiry" | "supplement-deadline" | "submission-deadline" | "billing-node" | "follow-up";
export type GroupCode = "tokyo-1" | "tokyo-2" | "osaka";

export const STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  todo: ["doing", "done", "canceled"],
  doing: ["done", "todo", "canceled"],
  done: [],
  canceled: [],
};
```

### 1.2 仓库接口

| 原型来源 | 生产文件 | 导出 | 说明 |
|---------|---------|------|------|
| 表格数据（原型为静态 HTML 行） | `domain/task/TaskRepository.ts` | `TaskRepository` | 列表查询、CRUD、批量操作 |
| 提醒日志数据 | `domain/task/TaskRepository.ts` | `TaskRepository` | 含提醒日志查询 |

```typescript
// domain/task/TaskRepository.ts

import type {
  TaskSummary,
  TaskDetail,
  CreateTaskInput,
  UpdateTaskInput,
  ReminderLogEntry,
  TaskStatus,
  CancelReasonCode,
  GroupCode,
} from "./Task";

export type TaskListParams = {
  status?: TaskStatus;
  deadlineRange?: "today" | "overdue";
  owner?: string;
  group?: GroupCode;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type TaskListResult = {
  items: TaskSummary[];
  total: number;
};

export type TaskRepository = {
  listTasks(params: TaskListParams): Promise<TaskListResult>;
  getTask(taskId: string): Promise<TaskDetail>;
  createTask(input: CreateTaskInput): Promise<{ id: string }>;
  updateTask(input: UpdateTaskInput): Promise<void>;
  completeTask(taskId: string): Promise<void>;
  cancelTask(taskId: string, reasonCode: CancelReasonCode, reasonNote?: string): Promise<void>;
  bulkAssignOwner(taskIds: string[], ownerId: string): Promise<void>;
  bulkChangeDeadline(taskIds: string[], deadline: string): Promise<void>;
  bulkComplete(taskIds: string[]): Promise<void>;
  bulkCancel(taskIds: string[], reasonCode: CancelReasonCode, reasonNote?: string): Promise<void>;
  listReminderLogs(params?: { page?: number; pageSize?: number }): Promise<{
    items: ReminderLogEntry[];
    total: number;
  }>;
};
```

### 1.3 常量与配置

| 原型来源 (`tasks-config.js`) | 生产文件 | 导出 | 说明 |
|------|---------|------|------|
| `TASK_STATUS_OPTIONS` | `domain/task/taskConstants.ts` | `TASK_STATUSES` | `{ value, label }[]` |
| `TASK_PRIORITY_OPTIONS` | `domain/task/taskConstants.ts` | `TASK_PRIORITIES` | `{ value, label }[]` |
| `TASK_SOURCE_OPTIONS` | `domain/task/taskConstants.ts` | `TASK_SOURCES` | `{ value, label }[]` |
| `REMINDER_TYPE_OPTIONS` | `domain/task/taskConstants.ts` | `REMINDER_TYPES` | `{ value, label }[]` |
| `TABLE_COLUMNS` | `domain/task/taskConstants.ts` | `TASK_TABLE_COLUMNS` | 表格列定义 schema |
| `FILTERS` | `domain/task/taskConstants.ts` | `TASK_FILTERS` | 筛选器配置 schema |
| `FORM_FIELDS` | `domain/task/taskConstants.ts` | `CREATE_TASK_FORM_FIELDS` | 表单字段 schema |
| `CREATE_REQUIRED_IDS` | `domain/task/taskConstants.ts` | `CREATE_REQUIRED_FIELD_KEYS` | 创建必填字段 key 集合 |
| `BULK_ACTIONS` | `domain/task/taskConstants.ts` | `TASK_BULK_ACTIONS` | 批量操作定义 |
| `WORKBENCH_VIEWS` | `domain/task/taskConstants.ts` | `TASK_WORKBENCH_VIEWS` | 工作台视图配置 |
| `CANCEL_REASON_OPTIONS` | `domain/task/taskConstants.ts` | `CANCEL_REASONS` | `{ value: CancelReasonCode, label, requiresNote? }[]` |
| `STATUS_TRANSITIONS` | `domain/task/taskConstants.ts` | `STATUS_TRANSITIONS` | `Record<TaskStatus, TaskStatus[]>` |
| `TOAST` | `domain/task/taskConstants.ts` | `TASK_TOAST_PRESETS` | Toast 文案预设 |
| `SEARCH_PLACEHOLDER` | `domain/task/taskConstants.ts` | `TASK_SEARCH_PLACEHOLDER` | 搜索框 placeholder |

### 1.4 Domain 层文件清单

```
domain/task/
├── Task.ts                       ← 实体 & 值类型
├── TaskRepository.ts             ← 仓库接口（API + 提醒日志）
└── taskConstants.ts              ← 常量、列定义、筛选配置、表单 schema
```

---

## 2. Data 层映射

| 原型来源 | 生产文件 | 导出 | 说明 |
|---------|---------|------|------|
| 表格静态数据行（`tasks-demo-data.js`） | `data/task/TaskApi.ts` | `createTaskApi(deps)` | 调用 Server `/tasks` 端点 |
| 提醒日志静态数据行 | `data/task/TaskApi.ts` | 同上 | `/tasks/reminder-logs` 端点 |
| 组合 | `data/task/createTaskRepository.ts` | `createTaskRepository(deps)` | 实现 `TaskRepository` |

### Data 层文件清单

```
data/task/
├── TaskApi.ts                        ← createTaskApi({ httpClient, baseUrl, getToken })
└── createTaskRepository.ts           ← 实现 TaskRepository
```

### App Container 注册

在 `app/container/AppContainer.ts` 新增：

```typescript
taskRepository: TaskRepository;
```

---

## 3. Features 层映射（model → ViewModel Hooks）

### 3.1 ViewModel 总览

| 原型脚本 | 生产 Hook | 状态 / 职责 |
|---------|-----------|------------|
| `tasks-page.js` | `useTaskListViewModel` | 页面级编排：加载列表、视图切换、toast、`#new` 入口 |
| `tasks-filters.js` | `useTaskFilters` | 筛选/搜索状态、workbench 视图→预置筛选联动、重置 |
| `tasks-bulk-actions.js` | `useTaskBulkActions` | 选中项集合、全选/反选/清除、批量操作执行 |
| `tasks-modal.js` | `useCreateEditTaskModal` | 弹窗开关、表单值管理、必填校验、创建/编辑提交 |
| `tasks-reminder-log.js` | `useReminderLog` | 提醒日志加载、分页、面板切换 |

### 3.2 映射详情

#### `tasks-page.js` → `useTaskListViewModel`

```
原型函数/行为                       → Hook 暴露
─────────────────────────────────────────────────
DOMContentLoaded 初始化              → useEffect 首次加载
showToast(title, desc)              → toast state + show/dismiss
workbench view click                → activeView state
#new hash → openModal               → 路由 query 参数检测
task row click → openDetail         → selectedTaskId state
segmented control 切换               → 不再需要（用工作台视图替代）
```

ViewState 定义：

```typescript
export type TaskListViewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; tasks: TaskSummary[]; total: number }
  | { status: "error"; error: AppError };
```

#### `tasks-filters.js` → `useTaskFilters`

```
原型函数                            → Hook 暴露
─────────────────────────────────────────────────
filter select change                → filterParams state
search input                        → search state + debounced change
reset filters button                → resetFilters()
workbench view → preset filter      → applyViewPreset(viewId)
```

#### `tasks-bulk-actions.js` → `useTaskBulkActions`

```
原型函数                            → Hook 暴露
─────────────────────────────────────────────────
getSelectableCheckboxes()           → selectableIds: string[]
updateBulkState()                   → selectedIds, isAllSelected, isIndeterminate, selectedCount
selectAll / deselectAll             → toggleSelectAll()
toggle single checkbox              → toggleSelect(taskId)
clear                               → clearSelection()
bulkAssign apply                    → assignOwner(ownerId) → repository + toast + clear
bulkDeadline apply                  → changeDeadline(date) → repository + toast + clear
bulkComplete                        → completeAll() → repository + toast + clear
bulkCancel                          → cancelAll(reason) → repository + toast + clear
bar visibility                      → showBulkBar (derived: selectedCount > 0)
```

#### `tasks-modal.js` → `useCreateEditTaskModal`

```
原型函数                            → Hook 暴露
─────────────────────────────────────────────────
openModal(mode) / closeModal()      → isOpen, mode ('create' | 'edit'), open(task?), close()
form field change                   → formValues (controlled state)
updateCreateEnabled()               → canSubmit (derived: taskName + group + owner + deadline)
handleCreate / handleUpdate         → submit() → repository.create/update + close + toast
source default                      → formValues.source defaults to 'manual'
```

#### `tasks-reminder-log.js` → `useReminderLog`

```
原型函数                            → Hook 暴露
─────────────────────────────────────────────────
switchToReminderLog()               → isLogPanelVisible, showLogPanel(), hideLogPanel()
renderLogList()                     → logs: ReminderLogEntry[], loadLogs()
log row click → task link           → navigateToTask(taskId) → UI 层处理
```

### 3.3 Model 层文件清单

```
features/task/model/
├── useTaskListViewModel.ts           ← 页面编排 Hook
├── useTaskFilters.ts                 ← 筛选 Hook
├── useTaskBulkActions.ts             ← 批量操作 Hook
├── useCreateEditTaskModal.ts         ← 弹窗 Hook
├── useReminderLog.ts                 ← 提醒日志 Hook
├── useTaskListViewModel.test.ts      ← 页面 ViewModel 测试
├── useTaskFilters.test.ts            ← 筛选测试
├── useTaskBulkActions.test.ts        ← 批量操作测试
├── useCreateEditTaskModal.test.ts    ← 弹窗测试
└── useReminderLog.test.ts            ← 提醒日志测试
```

---

## 4. Features 层映射（ui → 页面组件）

### 4.1 页面组件总览

| 原型 section | 生产组件 | 所在路径 | Props（核心） |
|-------------|---------|---------|--------------|
| `sections/page-header.html` | `TaskListHeader` | `features/task/ui/` | `onCreateTask` |
| `sections/workbench-sidebar.html` | `TaskWorkbenchSidebar` | `features/task/ui/` | `activeView`, `viewCounts`, `onViewChange` |
| `sections/filters-toolbar.html` | `TaskListFilters` | `features/task/ui/` | `filters`, `search`, `onFilterChange`, `onSearchChange`, `onReset` |
| `sections/task-table.html` | `TaskTable` | `features/task/ui/` | `tasks`, `selectedIds`, `onToggleSelect`, `onRowClick`, `columns` |
| `sections/task-table.html` 内 bulk bar | `TaskBulkActionBar` | `features/task/ui/` | `selectedCount`, `onClear`, `onAssign`, `onChangeDeadline`, `onComplete`, `onCancel`, `isAllSelected`, `isIndeterminate`, `onToggleSelectAll` |
| `sections/task-detail-panel.html` | `TaskDetailPanel` | `features/task/ui/` | `task`, `onClose`, `onEdit`, `onComplete`, `onCancel` |
| `sections/reminder-log-panel.html` | `ReminderLogPanel` | `features/task/ui/` | `logs`, `onNavigateToTask`, `onClose` |
| `sections/create-edit-modal.html` | `CreateEditTaskModal` | `features/task/ui/` | `isOpen`, `mode`, `formValues`, `canSubmit`, `onFieldChange`, `onSubmit`, `onClose` |
| `sections/toast.html` (Toast) | `Toast` | `shared/ui/` | `title`, `description`, `visible`, `onDismiss` |
| `sections/toast.html` (CancelReasonDialog) | `CancelReasonDialog` | `features/task/ui/` | `isOpen`, `reasonCode`, `reasonNote`, `onReasonChange`, `onNoteChange`, `onConfirm`, `onCancel` |
| 整页组装（`index.html`） | `TaskListScreen` | `features/task/ui/` | 入口组件：组合上述子组件 + ViewModel Hooks |

### 4.2 原型 HTML 属性 → 组件 Props 对照

```
原型 DOM 钩子                        → 组件 Props / 事件
─────────────────────────────────────────────────────────
.btn-primary[新建任务] click         → TaskListHeader.onCreateTask
[data-view-id] click                → TaskWorkbenchSidebar.onViewChange(viewId)
select[筛选] change                  → TaskListFilters.onFilterChange(key, value)
.search-input input                  → TaskListFilters.onSearchChange(text)
data-action="reset-filters" click    → TaskListFilters.onReset()
#selectAllTasks change               → TaskBulkActionBar.onToggleSelectAll()
data-task-select change              → TaskTable.onToggleSelect(id)
task row click                       → TaskTable.onRowClick(taskId)
#bulkClearBtn click                  → TaskBulkActionBar.onClear()
#bulkAssignSelect + apply            → TaskBulkActionBar.onAssign(ownerId)
#bulkDeadlineInput + apply           → TaskBulkActionBar.onChangeDeadline(date)
#bulkCompleteBtn click               → TaskBulkActionBar.onComplete()
#bulkCancelBtn click + reason        → TaskBulkActionBar.onCancel(reason)
detail panel close                   → TaskDetailPanel.onClose()
reminder log close                   → ReminderLogPanel.onClose()
modal open/close                     → CreateEditTaskModal.isOpen
modal field change                   → CreateEditTaskModal.onFieldChange(key, value)
modal submit                         → CreateEditTaskModal.onSubmit()
modal cancel                         → CreateEditTaskModal.onClose()
#toast show                          → Toast.visible + title + description
#cancelReasonDialog open/confirm     → CancelReasonDialog.isOpen + onConfirm + onCancel
```

### 4.3 UI 层文件清单

```
features/task/ui/
├── TaskListScreen.tsx                ← 页面入口（组装所有子组件 + Hooks）
├── TaskListHeader.tsx                ← 标题 + 新建任务按钮
├── TaskWorkbenchSidebar.tsx          ← 工作台视图侧边栏
├── TaskListFilters.tsx               ← 筛选 + 搜索 + 重置
├── TaskTable.tsx                     ← 任务表格
├── TaskBulkActionBar.tsx             ← 批量操作栏
├── TaskDetailPanel.tsx               ← 任务详情面板
├── ReminderLogPanel.tsx              ← 提醒日志面板
├── CreateEditTaskModal.tsx           ← 新建/编辑任务弹窗
└── CancelReasonDialog.tsx           ← 取消原因确认弹窗（从 toast.html 拆出）
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
├── domain/task/
│   ├── Task.ts                         ← 实体 & 值类型
│   ├── TaskRepository.ts               ← 仓库接口（任务 CRUD + 提醒日志）
│   └── taskConstants.ts                ← 列定义 / 筛选配置 / 表单 schema / Toast 预设
│
├── data/task/
│   ├── TaskApi.ts                      ← HTTP 端点调用
│   └── createTaskRepository.ts         ← 实现 TaskRepository
│
├── features/task/
│   ├── model/
│   │   ├── useTaskListViewModel.ts
│   │   ├── useTaskFilters.ts
│   │   ├── useTaskBulkActions.ts
│   │   ├── useCreateEditTaskModal.ts
│   │   ├── useReminderLog.ts
│   │   └── *.test.ts
│   └── ui/
│       ├── TaskListScreen.tsx          ← 页面入口
│       ├── TaskListHeader.tsx
│       ├── TaskWorkbenchSidebar.tsx
│       ├── TaskListFilters.tsx
│       ├── TaskTable.tsx
│       ├── TaskBulkActionBar.tsx
│       ├── TaskDetailPanel.tsx
│       ├── ReminderLogPanel.tsx
│       ├── CreateEditTaskModal.tsx
│       └── CancelReasonDialog.tsx
│
├── shared/
│   ├── ui/
│   │   ├── Toast.tsx                   ← 复用（客户模块已定义）
│   │   ├── AppShell.tsx                ← 复用
│   │   ├── SideNav.tsx                 ← 复用
│   │   ├── TopBar.tsx                  ← 复用
│   │   └── MobileNav.tsx              ← 复用
│   └── hooks/
│       └── useMobileNav.ts            ← 复用
│
└── app/container/
    └── AppContainer.ts                 ← 新增 taskRepository
```

---

## 7. 迁移顺序建议

| 阶段 | 范围 | 前置条件 |
|------|------|---------|
| **M1** | `domain/task/` 全部文件 | 无（纯类型，可独立提交） |
| **M2** | `data/task/` + AppContainer 注册 | M1 + Server 端 Task API 就绪 |
| **M3** | `features/task/model/` 五个 Hook + 测试 | M1 + M2 |
| **M4** | `features/task/ui/` 全部页面组件 | M3 + shared/ui 已就绪（客户模块应已提供） |
| **M5** | 路由注册 + 集成测试 | M4 |

---

## 8. 原型 → 生产差异备忘

| 原型行为 | 生产变化 | 原因 |
|---------|---------|------|
| `window.__tasksPage` 全局命名空间 | ES module `import` + DI container | 消除全局状态 |
| `onclick` / `data-action` 事件 | React 事件 prop（`onPress`, `onChange`） | 框架层事件系统 |
| DOM ID 耦合（`#bulkActionBar`, `#toast`） | Props 驱动 + state 控制可见性 | 声明式 UI |
| CSS class 切换（`.show`, `data-view-active`） | State 驱动 + 动画库 | 响应式状态管理 |
| `#new` URL hash 打开弹窗 | 路由参数（`navigation.navigate('TaskList', { openCreate: true })`） | 路由框架标准做法 |
| 筛选/搜索 DOM 操作 | Hook 中完整实现筛选、搜索、debounce | 原型遗留缺口 |
| 静态 3 条示例数据 | API 动态数据 + 空状态处理 | 真实数据源 |
| 提醒日志硬编码 | API 动态日志 + 分页 | 真实数据源 |
| 视图计数 badge 硬编码 | API 聚合查询或 viewModel 派生 | 真实数据源 |
| 详情面板操作记录硬编码 | API auditLog 端点 | 真实审计日志 |
| 批量取消无原因输入 | 弹出确认对话框 + 原因枚举 select + 备注 textarea | 规格要求须填原因（5 项枚举 + 备注） |
| 状态流转无约束 | `STATUS_TRANSITIONS` 限制合法流转 + 不可回退 done/canceled | P0-CONTRACT §11 状态机 |
| 无逾期判定逻辑 | Hook 中根据截止时间 + 租户时区 + 状态∈{todo,doing} 计算逾期 | P0-CONTRACT §11.3 |
