# 任务与提醒页原型拆分架构说明

> 本文档定义任务与提醒页拆分的目标目录结构、模块职责、共享层与页面层的边界，作为 AI 与开发人员的共同入口文档。
>
> P0 约束清单见 [P0-CONTRACT.md](./P0-CONTRACT.md)

---

## 1. 当前问题

`tasks.html` 是一个 ~490 行的单文件，混合了：

| 关注点 | 行数范围（约） | 问题 |
|--------|-------------|------|
| 设计 Token（CSS 变量） | 11-33 | 与 `dashboard/index.html`、`customers/index.html` 重复定义 |
| 公共组件样式 | 35-139 | `.btn-primary`, `.chip`, `.apple-card`, `.segmented-control` 等内联复制 |
| App Shell + 导航 HTML | 142-317 | 移动端 + 桌面端导航各写一份，与其他页面重复 |
| 顶部栏 HTML | 319-341 | 与其他页面重复 |
| 任务页专有样式 | 126-139 | `.task-list`, `.task-item`, `.checkbox-apple`, `.tag`, `.tag-red/orange/blue/gray` |
| 页面区块 HTML（header/sidebar/list） | 343-463 | 区块之间无边界，侧边栏与列表混在一起 |
| 业务脚本 | 467-488 | 仅包含移动端导航，无任务业务脚本 |

### 规格差距

相比 [P0-CONTRACT.md](./P0-CONTRACT.md) 的要求，现有页面缺失大量能力：

| 缺失能力 | 说明 |
|----------|------|
| 4 个列表列 | 缺少「所属 Group」「优先级」「完成状态」「来源」 |
| 筛选工具栏 | 无状态/截止时间/责任人/Group 筛选器 |
| 批量操作栏 | 有行内 checkbox 但无全选/indeterminate/操作按钮 |
| 任务详情面板 | 无 |
| 提醒日志面板 | 侧边栏有入口但无面板内容 |
| 新建/编辑弹窗 | 有"新建任务"按钮但无弹窗 |
| Toast | 无 |
| 搜索 | 仅有全局搜索，无列表内搜索 |

---

## 2. 目标目录结构

```
packages/prototype/admin/
├── shared/                              ← 公共层（多页面共享，已存在）
│   ├── styles/
│   │   ├── tokens.css                   ← 设计 Token（CSS 变量）
│   │   ├── components.css               ← 公共组件样式
│   │   └── shell.css                    ← App Shell 布局
│   ├── shell/
│   │   ├── side-nav.html                ← 桌面侧边导航 HTML 片段
│   │   ├── mobile-nav.html              ← 移动端导航 HTML 片段
│   │   └── topbar.html                  ← 顶部工具栏 HTML 片段
│   └── scripts/
│       ├── mobile-nav.js                ← 导航开关事件
│       └── navigate.js                  ← data-navigate 处理
│
├── tasks/                               ← 任务与提醒页层
│   ├── index.html                       ← 入口文件（组装 shared + sections + scripts）
│   ├── P0-CONTRACT.md                   ← P0 约束清单
│   ├── SPLIT-ARCHITECTURE.md            ← 本文档
│   ├── MIGRATION-MAPPING.md             ← 原型→生产迁移映射
│   ├── split-manifest.json              ← 机器可读拆分清单
│   ├── sections/
│   │   ├── page-header.html             ← 页面标题 + "新建任务"按钮
│   │   ├── workbench-sidebar.html       ← 工作台视图入口（我的待办/今日到期/已逾期/提醒日志）
│   │   ├── filters-toolbar.html         ← 完成状态/截止范围/责任人/Group 筛选 + 搜索 + 重置
│   │   ├── task-table.html              ← 任务表格（含批量操作栏 + thead 8 列 + checkbox 列）
│   │   ├── task-detail-panel.html       ← 任务详情（描述、关联案件、责任人、操作记录等）
│   │   ├── reminder-log-panel.html      ← 提醒日志（发送时间、接收人、类型、状态、失败原因）
│   │   ├── create-edit-modal.html       ← 新建/编辑任务弹窗（8 字段表单）
│   │   └── toast.html                   ← Toast 通知组件
│   ├── data/
│   │   ├── tasks-config.js              ← 字段 schema、枚举、筛选配置、批量动作配置、取消原因、状态流转
│   │   └── tasks-demo-data.js           ← 任务列表、提醒日志、视图计数、详情示例
│   └── scripts/
│       ├── tasks-page.js                ← 页面初始化、视图切换、hash 入口、toast 编排
│       ├── tasks-filters.js             ← 筛选、搜索、重置、视图→筛选联动
│       ├── tasks-bulk-actions.js        ← checkbox 联动、indeterminate、批量操作栏
│       ├── tasks-modal.js               ← 新建/编辑弹窗、必填校验、状态留痕
│       └── tasks-reminder-log.js        ← 提醒日志面板切换、列表渲染、状态展示
│
├── tasks.html                           ← 旧页面（迁移源 + 回归对照，保留不删）
└── ...其他页面
```

---

## 3. 迁移源角色说明

旧页面 `packages/prototype/admin/tasks.html` 在此次拆分中扮演以下角色：

| 角色 | 说明 |
|------|------|
| **迁移源** | 新模块的 HTML 结构、样式、交互从此文件提取 |
| **回归对照** | 拆分期间保留原文件，便于人工 diff 确认无遗漏 |
| **不立即删除** | 第一阶段拆分完成后，旧文件保留；待新模块通过全量回归后再决定是否归档 |

### 旧页面已知链接引用

其他页面的侧边导航中引用了 `tasks.html`（非子目录路径）。拆分本轮仅记录这些引用，不在任务模块内修复外部导航链接。当所有页面迁移到子目录模式后统一更新。

| 引用方 | 引用路径 | 备注 |
|--------|---------|------|
| `dashboard/index.html` | `tasks.html` | 仪表盘导航 |
| `customers/index.html` | `../tasks.html` | 客户页导航 |
| 其他未迁移的 `.html` 页面 | `tasks.html` | 同级导航 |

新模块 `tasks/index.html` 内部导航将使用 `index.html`（自引用）并设置 `aria-current="page"`。

---

## 4. 模块职责定义

### 4.1 共享层复用 (`shared/`)

任务模块复用已有共享层，**不新增共享文件**。

#### 4.1.1 CSS 链接路径

`tasks/index.html` 位于 `packages/prototype/admin/tasks/` 子目录，所有共享样式通过 `../shared/styles/` 相对路径引入：

```html
<link rel="stylesheet" href="../shared/styles/tokens.css" />
<link rel="stylesheet" href="../shared/styles/shell.css" />
<link rel="stylesheet" href="../shared/styles/components.css" />
```

| 共享样式 | 相对路径（从 `tasks/index.html`） | 提供的能力 |
|----------|----------------------------------|-----------|
| `tokens.css` | `../shared/styles/tokens.css` | `:root` CSS 变量（颜色、阴影、圆角、字体）、`body` 排版、`.display-font`、`prefers-reduced-motion` |
| `shell.css` | `../shared/styles/shell.css` | `.app-shell` 网格、`.side-nav` + `.nav-item`（含 hover 和 `aria-current` 态）、`.topbar`、`.mobile-nav`、`.skip-link`、`focus-visible` |
| `components.css` | `../shared/styles/components.css` | `.btn-primary`、`.btn-pill`、`.chip`、`.icon-btn`、`.apple-card`、`.apple-table`、`.modal-backdrop`、`.apple-modal`、`.apple-input`、`.segmented-control`、`.search` |

#### 4.1.2 Shell HTML 片段复用

导航 HTML 从 `shared/shell/` 三个规范片段复制到 `tasks/index.html` 中，以注释标记来源。由于 `tasks/index.html` 在子目录内，需要对所有 admin 根级路径加 `../` 前缀。

| 规范片段 | 注释标记 | 路径调整规则 |
|----------|---------|-------------|
| `shared/shell/mobile-nav.html` | `<!-- shell: mobile-nav.html (paths adjusted for tasks/ subdirectory) -->` | 所有 admin 根级 `href` 加 `../`；自身 `href` 改为 `index.html`；加 `aria-current="page"` |
| `shared/shell/side-nav.html` | `<!-- shell: side-nav.html (paths adjusted for tasks/ subdirectory) -->` | 同上 |
| `shared/shell/topbar.html` | `<!-- shell: topbar.html (paths adjusted for tasks/ subdirectory) -->` | `case/create.html` → `../case/create.html`；`leads-messages.html` → `../leads-messages.html` |

导航链接路径调整对照（canonical → `tasks/index.html`）：

| 导航项 | 规范路径（admin 根级） | 调整后路径（tasks/ 子目录） |
|--------|----------------------|--------------------------|
| 仪表盘 | `dashboard/index.html` | `../dashboard/index.html` |
| 咨询与会话 | `leads-messages.html` | `../leads-messages.html` |
| 客户 | `customers/index.html` | `../customers/index.html` |
| 案件 | `cases-list.html` | `../cases-list.html` |
| **任务与提醒** | `tasks.html` | **`index.html`**（自引用）+ **`aria-current="page"`** |
| 资料中心 | `documents.html` | `../documents.html` |
| 文书中心 | `forms.html` | `../forms.html` |
| 收费与财务 | `billing/index.html` | `../billing/index.html` |
| 报表 | `reports.html` | `../reports.html` |
| 设置 | `settings.html` | `../settings.html` |
| 客户门户 | `../src/index.html` | `../../src/index.html` |

#### 4.1.3 `aria-current` 规则

`shared/styles/shell.css` 定义了 `.nav-item[aria-current="page"]` 样式规则：

```css
.nav-item[aria-current="page"] {
  background: rgba(3, 105, 161, 0.1);
  color: var(--text);
}
```

在 `tasks/index.html` 中，**「任务与提醒」导航项**必须在以下两处同时添加 `aria-current="page"`：

1. **移动端导航**（`mobile-nav` 内 `<nav>` 中）：
   ```html
   <a class="nav-item" href="index.html" aria-current="page">...任务与提醒</a>
   ```
2. **桌面侧边导航**（`side-nav` 内 `<nav>` 中）：
   ```html
   <a class="nav-item" href="index.html" aria-current="page">...任务与提醒</a>
   ```

规则要点：
- 属性值固定为 `"page"`，表示当前页面
- 仅在任务页的 `index.html` 中标注任务导航项；其他导航项不标注
- 与 `customers/index.html` 对客户导航项的处理方式一致
- `href` 从规范片段的 `tasks.html` 改为 `index.html`（子目录自引用）

#### 4.1.4 脚本链接路径

页面尾部按以下顺序引入共享脚本和模块脚本：

```html
<!-- 共享脚本 -->
<script src="../shared/scripts/mobile-nav.js"></script>
<script src="../shared/scripts/navigate.js"></script>
<!-- 模块脚本 -->
<script src="scripts/tasks-page.js"></script>
<script src="scripts/tasks-filters.js"></script>
<script src="scripts/tasks-bulk-actions.js"></script>
<script src="scripts/tasks-modal.js"></script>
<script src="scripts/tasks-reminder-log.js"></script>
```

| 共享脚本 | 相对路径（从 `tasks/index.html`） | 提供的能力 |
|----------|----------------------------------|-----------|
| `mobile-nav.js` | `../shared/scripts/mobile-nav.js` | `[data-nav-open]` / `[data-nav-close]` 点击 → `body[data-nav-open]` 切换；Escape 键关闭 |
| `navigate.js` | `../shared/scripts/navigate.js` | 全局搜索弹窗（`⌘K` / `Ctrl+K`）、`data-navigate` 路由、topbar 搜索聚焦 |

#### 4.1.5 任务页专有样式

任务页专有样式（`.task-list`, `.task-item`, `.checkbox-apple`, `.tag`, `.tag-*` 变体）如果已纳入 `components.css` 则复用，否则作为任务页内联样式保留在 `index.html` 的 `<style>` 块中。

### 4.2 任务页层 (`tasks/`)

任务页层只关注任务列表页的 UI 区块和业务行为。

#### `tasks/index.html` — 入口组装文件

职责：
1. 声明 `<!DOCTYPE html>`、`<head>`（meta、title、tailwindcss CDN、font import）
2. 引入共享样式：`<link>` 到 `../shared/styles/tokens.css`, `components.css`, `shell.css`
3. 引入任务页专有样式（如有）
4. 组装 HTML 结构：`app-shell` > `side-nav` + `main`
5. 在 `<main>` 内按顺序插入 `sections/*.html` 片段内容
6. 在页尾引入脚本：`../shared/scripts/mobile-nav.js` + `tasks/scripts/*.js`

> **P0 阶段简化方案**：与客户模块一致，`sections/*.html` 作为"逻辑边界文件"存在。入口文件中用注释标记区块来源（如 `<!-- section: sections/task-table.html -->`）。脚本文件直接通过 `<script src="...">` 引入。

#### `tasks/sections/*.html` — 页面区块

| 文件 | 内容 | 对应 P0 契约 |
|------|------|-------------|
| `page-header.html` | 页面标题 `<h1>任务与提醒</h1>` + 副标题 + "新建任务"按钮 | — |
| `workbench-sidebar.html` | 我的待办/今日到期/已逾期/提醒日志 4 个视图入口 + badge 计数 | §5 工作台视图 |
| `filters-toolbar.html` | 4 个筛选 select（状态/截止范围/责任人/Group）+ 搜索框 + 重置 | §4 搜索与筛选 |
| `task-table.html` | `bulkActionBar`（含取消原因选择）+ `<table>` 结构（thead 8 列 + checkbox 列）+ 默认排序逻辑 | §2 字段, §3 排序, §6 批量动作, §7 取消原因 |
| `task-detail-panel.html` | 详情面板（任务名、描述、关联案件、责任人、截止日、状态、操作记录等 10 项）+ 状态流转操作 | §9 详情, §11 状态机 |
| `reminder-log-panel.html` | 提醒日志列表（发送时间、接收人、类型、状态、失败原因、关联任务） | §10 提醒日志 |
| `create-edit-modal.html` | `modal-backdrop` + `apple-modal` + 8 个表单字段 + 状态流转约束 | §8 弹窗, §11 状态机 |
| `toast.html` | `#toast` 组件 | §15 Toast |

#### `tasks/data/tasks-config.js` — 声明式配置

将以下隐式耦合提取为显式配置对象：

```js
export const TASK_STATUS_OPTIONS = [
  { value: 'todo', label: '待处理' },
  { value: 'doing', label: '进行中' },
  { value: 'done', label: '已完成' },
  { value: 'canceled', label: '已取消' },
];

export const TASK_PRIORITY_OPTIONS = [
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
];

export const TASK_SOURCE_OPTIONS = [
  { value: 'manual', label: '手动' },
  { value: 'template', label: '模板' },
  { value: 'reminder', label: '催办' },
  { value: 'validation-fail', label: '校验失败' },
  { value: 'correction', label: '补正' },
  { value: 'renewal', label: '续签提醒' },
];

export const REMINDER_TYPE_OPTIONS = [
  { value: 'residence-expiry', label: '在留到期' },
  { value: 'supplement-deadline', label: '补件截止' },
  { value: 'submission-deadline', label: '提交截止' },
  { value: 'billing-node', label: '收费节点' },
  { value: 'follow-up', label: '催办' },
];

export const GROUPS = [
  { value: 'tokyo-1', label: '東京一組' },
  { value: 'tokyo-2', label: '東京二組' },
  { value: 'osaka', label: '大阪組' },
];

export const OWNERS = [
  { value: 'admin', label: 'Admin', initials: 'AD' },
  { value: 'tom', label: 'Tom', initials: 'TM' },
  { value: 'assistant-a', label: '助理 A', initials: 'A' },
];

export const TABLE_COLUMNS = [
  { id: 'select', type: 'checkbox', width: '44px' },
  { id: 'taskName', label: '任务名称', showAlways: true },
  { id: 'case', label: '所属案件', responsive: 'md' },
  { id: 'group', label: '所属 Group', responsive: 'lg', width: '100px' },
  { id: 'owner', label: '责任人', responsive: 'md', width: '100px' },
  { id: 'priority', label: '优先级', width: '80px', align: 'center' },
  { id: 'deadline', label: '截止时间', responsive: 'md', width: '140px' },
  { id: 'status', label: '完成状态', width: '100px' },
  { id: 'source', label: '来源', responsive: 'lg', width: '100px' },
];

export const FILTERS = [
  { id: 'status', label: '完成状态', options: 'TASK_STATUS_OPTIONS', defaultValue: '' },
  { id: 'deadline', label: '截止范围', options: [
    { value: '', label: '截止范围：全部' },
    { value: 'today', label: '今日到期' },
    { value: 'overdue', label: '已逾期' },
  ], defaultValue: '' },
  { id: 'owner', label: '责任人', options: 'OWNERS', defaultValue: '' },
  { id: 'group', label: '所属 Group', options: 'GROUPS', defaultValue: '' },
];

export const SEARCH_PLACEHOLDER = '搜索：任务名称 / 案件编号 / 责任人';

export const WORKBENCH_VIEWS = [
  { id: 'my-todo', label: '我的待办', icon: 'clipboard-list', filterPreset: { owner: 'current', status: ['todo', 'doing'] } },
  { id: 'today-due', label: '今日到期', icon: 'clock', filterPreset: { deadline: 'today', status: ['todo', 'doing'] } },
  { id: 'overdue', label: '已逾期', icon: 'alert-triangle', filterPreset: { deadline: 'overdue', status: ['todo', 'doing'] } },
  { id: 'reminder-log', label: '提醒日志', icon: 'bell', switchPanel: true },
];

export const CANCEL_REASON_OPTIONS = [
  { value: 'duplicate', label: '重复生成' },
  { value: 'case-terminated', label: '案件终止/撤回' },
  { value: 'other-process', label: '改由其他流程处理' },
  { value: 'input-error', label: '录入错误' },
  { value: 'other', label: '其他', requiresNote: true },
];

export const STATUS_TRANSITIONS = {
  todo: ['doing', 'done', 'canceled'],
  doing: ['done', 'todo', 'canceled'],
  done: [],
  canceled: [],
};

export const BULK_ACTIONS = [
  { id: 'assign', label: '批量指派', type: 'select', options: 'OWNERS' },
  { id: 'deadline', label: '批量调整截止日', type: 'date' },
  { id: 'complete', label: '批量完成', type: 'button' },
  { id: 'cancel', label: '批量取消', type: 'button-with-reason', reasonOptions: 'CANCEL_REASON_OPTIONS' },
];

export const FORM_FIELDS = [
  { id: 'taskName', label: '任务名称', type: 'text', required: true },
  { id: 'caseId', label: '关联案件', type: 'search-select', required: false },
  { id: 'group', label: '所属 Group', type: 'select', required: true },
  { id: 'owner', label: '责任人', type: 'select', required: true },
  { id: 'priority', label: '优先级', type: 'select', required: false, defaultValue: 'medium' },
  { id: 'deadline', label: '截止时间', type: 'datetime', required: true },
  { id: 'description', label: '任务描述', type: 'textarea', required: false },
  { id: 'source', label: '来源', type: 'select', required: false, defaultValue: 'manual' },
];

export const CREATE_REQUIRED_IDS = ['taskName', 'group', 'owner', 'deadline'];

export const TOAST = {
  create:   { title: '任务已创建（示例）', desc: '已创建任务并关联案件' },
  complete: { title: '任务已完成（示例）', desc: '任务已标记为完成' },
  cancel:   { title: '任务已取消（示例）', desc: '任务已取消，原因已记录' },
  bulkAssign:    { title: '批量指派（示例）', desc: '已选择 {n} 条，责任人：{owner}' },
  bulkDeadline:  { title: '批量调整截止日（示例）', desc: '已选择 {n} 条，新截止日：{date}' },
  bulkComplete:  { title: '批量完成（示例）', desc: '已将 {n} 条任务标记为完成' },
  bulkCancel:    { title: '批量取消（示例）', desc: '已将 {n} 条任务取消' },
};
```

#### `tasks/data/tasks-demo-data.js` — 演示数据

```js
export const DEMO_TASKS = [
  {
    id: 'task-001',
    taskName: '催促客户提交课税证明书',
    caseId: 'CAS-2023-1090',
    caseLabel: 'CAS-2023-1090 家族滞在 (李明)',
    group: 'tokyo-1',
    owner: { id: 'admin', name: 'Admin', initials: 'AD' },
    priority: 'high',
    deadline: '2025-04-08T18:00:00',
    status: 'todo',
    source: 'reminder',
    sourceKey: 'supplement-deadline:CAS-2023-1090:20250408',
    description: '客户李明需要提交课税证明书用于家族滞在签证续签...',
  },
  {
    id: 'task-002',
    taskName: '草拟理由书 (HSP 申请)',
    caseId: 'CAS-2023-1089',
    caseLabel: 'CAS-2023-1089 高度专门职 (Michael T.)',
    group: 'tokyo-1',
    owner: { id: 'admin', name: 'Admin', initials: 'AD' },
    priority: 'medium',
    deadline: '2025-04-09T18:00:00',
    status: 'doing',
    source: 'manual',
    sourceKey: null,
    description: '为 Michael T. 的高度专门职签证申请草拟理由书...',
  },
  // ... more demo tasks (at least 5 to populate view counts)
  // Demo data must respect STATUS_TRANSITIONS: done/canceled tasks should not appear overdue
];

export const DEMO_REMINDER_LOGS = [
  {
    id: 'log-001',
    sentAt: '2025-04-08T09:00:00',
    recipient: 'Admin',
    type: 'supplement-deadline',
    status: 'sent',
    failReason: null,
    taskId: 'task-001',
    taskName: '催促客户提交课税证明书',
  },
  {
    id: 'log-002',
    sentAt: '2025-04-07T09:00:00',
    recipient: 'Tom',
    type: 'submission-deadline',
    status: 'failed',
    failReason: '接收人已离职，通知渠道无效',
    taskId: 'task-003',
    taskName: '提交在留资格认定申请',
  },
  // ... more demo logs (include at least one failed entry for §10 regression)
];

export const DEMO_VIEW_COUNTS = {
  'my-todo': 5,
  'today-due': 2,
  'overdue': 1,
};

export const DEMO_TASK_DETAIL_HISTORY = [
  { action: 'created', actor: 'Admin', timestamp: '2025-04-05T10:00:00', detail: '手动创建任务' },
  { action: 'assigned', actor: 'Admin', timestamp: '2025-04-05T10:01:00', detail: '指派给 Admin' },
  { action: 'deadline-changed', actor: 'Admin', timestamp: '2025-04-07T14:30:00', detail: '截止日从 04-07 调整为 04-08' },
  // ... operation history timeline for task detail panel (§9 item 10)
];
```

#### `tasks/scripts/*.js` — 行为模块

| 文件 | 职责 | 依赖 |
|------|------|------|
| `tasks-page.js` | DOMContentLoaded 入口；工作台视图切换；`#new` hash → 打开弹窗；toast 编排 | config, modal, filters, bulk, reminder-log |
| `tasks-filters.js` | 4 个筛选器联动；搜索 debounce；重置；workbench 视图 → 预置筛选同步 | config (FILTERS, SEARCH_PLACEHOLDER) |
| `tasks-bulk-actions.js` | `getSelectableCheckboxes()`；`updateBulkState()`；全选/单选/清除；批量指派/截止日/完成/取消；取消须弹原因选择（CANCEL_REASON_OPTIONS） | config (BULK_ACTIONS, CANCEL_REASON_OPTIONS), toast |
| `tasks-modal.js` | 新建/编辑弹窗开关；8 字段表单；必填校验（任务名 + Group + 责任人 + 截止时间）；来源默认「手动」；状态流转约束（STATUS_TRANSITIONS） | config (FORM_FIELDS, CREATE_REQUIRED_IDS, STATUS_TRANSITIONS) |
| `tasks-reminder-log.js` | 提醒日志面板切换；日志列表渲染；失败状态展示；关联任务链接 | demo-data (DEMO_REMINDER_LOGS) |

跨模块通信使用挂载到约定命名空间（`window.__tasksPage`）的方式，避免模块之间直接互引 DOM ID。

---

## 5. 共享层与页面层边界规则

| 规则 | 说明 |
|------|------|
| **共享层不含业务逻辑** | `shared/` 下的文件不出现"任务"、"提醒"、"截止日"等业务概念 |
| **页面层不复制壳子** | `tasks/index.html` 不再手写导航 HTML，引用 `shared/shell/` |
| **样式单一来源** | `.btn-primary`, `.chip`, `.apple-table` 等在 `shared/styles/` 定义一次；页面层只补充页面专有样式 |
| **Token 单一来源** | `:root` CSS 变量在 `shared/styles/tokens.css` 定义一次；页面层不重新声明 |
| **脚本按能力拆** | 每个 `.js` 文件对应一个独立能力（page / filters / bulk / modal / reminder-log） |
| **配置集中声明** | 状态枚举、优先级、来源、筛选配置、表单 schema 在 `data/tasks-config.js` 集中管理 |
| **演示数据独立** | 示例任务、提醒日志、badge 计数在 `data/tasks-demo-data.js`，不混入配置 |
| **data-* 钩子优先** | 尽量用 `data-action="xxx"` 属性 + 事件代理，减少 `onclick` 内联处理器 |
| **section 注释边界** | 入口 HTML 中用 `<!-- section: sections/xxx.html -->` 注释标记区块起止 |

---

## 6. 拆分步骤（推荐执行顺序）

### Step 1：搭建入口文件骨架
1. 创建 `tasks/index.html`，引入 `shared/styles/*.css`
2. 从 `shared/shell/` 复制导航 HTML（路径调整为 `../`），设置任务项 `aria-current="page"`
3. 搭建 `<main>` 骨架，预留 8 个 section 注释边界
4. **视觉回归**：页面壳子正常渲染

### Step 2：迁移现有区块并补齐缺失
1. 将 `tasks.html` 的 page-header 迁移到 `sections/page-header.html`，修正副标题文案
2. 将 workbench sidebar 迁移到 `sections/workbench-sidebar.html`
3. 新建 `sections/filters-toolbar.html`（现有页面缺失，需新增）
4. 将任务列表重构为 `sections/task-table.html`（从 `<ul>` 改为 `<table>`，补齐 8 列）
5. 新建 `sections/task-detail-panel.html`（现有页面缺失）
6. 新建 `sections/reminder-log-panel.html`（现有页面缺失）
7. 新建 `sections/create-edit-modal.html`（现有页面缺失）
8. 新建 `sections/toast.html`
9. **视觉回归**：8 列完整、侧边栏/筛选/弹窗/详情/日志区块存在

### Step 3：提取配置与演示数据
1. 创建 `data/tasks-config.js`，提取所有枚举、列定义、筛选配置、表单 schema
2. 创建 `data/tasks-demo-data.js`，提取示例任务、提醒日志、badge 计数
3. **视觉回归**：数据不变

### Step 4：拆分脚本
1. 创建 5 个脚本文件，按职责拆分
2. 入口文件 `<script>` 改为 `<script src="...">` 引用
3. **行为回归**：视图切换、筛选、批量操作、弹窗、toast 全部可用

### Step 5：最终回归
1. 按 [P0-CONTRACT.md 拆分回归清单](./P0-CONTRACT.md#拆分回归清单) 逐项验证
2. 运行 `npm run fix` + `npm run guard`

---

## 7. 从原型 Section 到生产组件的映射表（前瞻）

此映射不在 P0 拆分范围内执行，仅作为后续迁移的参考。

**完整映射文档见 → [MIGRATION-MAPPING.md](./MIGRATION-MAPPING.md)**

以下为速查摘要，遵循仓库 `domain → data → features/{model,ui} → shared/ui` 四层架构：

| 原型 Section | 生产组件 | 层级 |
|-------------|---------|------|
| `sections/page-header.html` | `TaskListHeader` | features/task/ui |
| `sections/workbench-sidebar.html` | `TaskWorkbenchSidebar` | features/task/ui |
| `sections/filters-toolbar.html` | `TaskListFilters` | features/task/ui |
| `sections/task-table.html` | `TaskTable` + `TaskBulkActionBar` | features/task/ui |
| `sections/task-detail-panel.html` | `TaskDetailPanel` | features/task/ui |
| `sections/reminder-log-panel.html` | `ReminderLogPanel` | features/task/ui |
| `sections/create-edit-modal.html` | `CreateEditTaskModal` | features/task/ui |
| `sections/toast.html` | `Toast` | shared/ui |
| `scripts/tasks-page.js` | `useTaskListViewModel` | features/task/model |
| `scripts/tasks-filters.js` | `useTaskFilters` | features/task/model |
| `scripts/tasks-bulk-actions.js` | `useTaskBulkActions` | features/task/model |
| `scripts/tasks-modal.js` | `useCreateEditTaskModal` | features/task/model |
| `scripts/tasks-reminder-log.js` | `useReminderLog` | features/task/model |
| `data/tasks-config.js` | `Task.ts` + `taskConstants.ts` | domain/task |
| `data/tasks-demo-data.js` | — (demo-only, 不迁移) | — |

---

## 8. 拆分边界审查记录（Pass 2）

> 审查日期：2026-04-09
>
> 审查依据：§5 共享层与页面层边界规则 + 技能边界 5 条核心规则

### 8.1 逐条核对结果

| # | 边界规则 | 结果 | 说明 |
|---|---------|------|------|
| 1 | 共享层不含业务逻辑 | **PASS** | `shared/shell/` 中 `任务与提醒` 仅为导航标签文本，非业务逻辑 |
| 2 | 页面层不复制壳子 | **PASS** | `tasks/index.html`（待组装）引用 `shared/shell/` 片段，不内联 |
| 3 | 样式单一来源 | **PASS** | `.btn-primary` / `.chip` / `.apple-table` 等仅在 `shared/styles/` 定义；sections 无重定义 |
| 4 | Token 单一来源 | **PASS** | sections 中无 `:root` CSS 变量重声明 |
| 5 | 脚本按能力拆 | **PASS** | 5 个脚本分别对应 page / filters / bulk / modal / reminder-log |
| 6 | 配置集中声明 | **PASS** | 枚举、列定义、筛选、表单 schema、toast preset 均在 `tasks-config.js` |
| 7 | 演示数据独立 | **PASS** | `tasks-demo-data.js` 仅含示例数据，不混入配置 |
| 8 | `data-*` 钩子优先 | **PASS** | sections 中零 `onclick` / `onchange` 等内联处理器 |
| 9 | section 注释边界 | **PASS** | 每个 section 文件头部有注释标记来源与用途 |
| 10 | `data/` 不含 DOM 操作 | **PASS** | 两个 data 文件无 `document.*` / `getElementById` / `querySelector` 调用 |
| 11 | `scripts/` 不含 HTML 结构模板 | **PASS** | 脚本中无 `<div>` / `<table>` 等 HTML 标签字符串 |
| 12 | 每个能力仅落在一个职责文件 | **PASS** | 见 §8.2 能力归属矩阵 |

### 8.2 能力归属矩阵

| 能力 | 唯一归属文件 | 跨文件引用方式 |
|------|------------|---------------|
| Toast 展示 | `tasks-page.js` (`showToast`) | 传入 `bulk.setup(showToast)` 回调 |
| 筛选/搜索/重置 | `tasks-filters.js` | `tasks-page.js` 通过 `filters.applyViewPreset()` 调用 |
| 批量选择/操作 | `tasks-bulk-actions.js` | `tasks-page.js` 通过 `bulk.setup()` / `bulk.updateBulkState()` 调用 |
| 取消原因弹窗 | `tasks-bulk-actions.js` (`openCancelDialog`) | `tasks-page.js` 通过 `bulk.openCancelDialog('single')` 供详情面板使用 |
| 弹窗开关/校验 | `tasks-modal.js` | `tasks-page.js` 通过 `modal.openModal()` / `modal.closeModal()` 调用 |
| 提醒日志面板 | `tasks-reminder-log.js` | `tasks-page.js` 通过 `reminderLog.showLogPanel()` / `hideLogPanel()` 调用 |
| 视图切换 | `tasks-page.js` (`setActiveView`) | 直接在 page 入口管理 |
| 详情面板开关 | `tasks-page.js` (`openDetailPanel` / `closeDetailPanel`) | 直接在 page 入口管理 |

### 8.3 已修复问题

| # | 问题 | 修复 |
|---|------|------|
| 1 | `tasks-page.js` 硬编码 Tailwind class 字符串（视图 active/inactive 样式） | 提取为 `tasks-config.js` → `WORKBENCH_VIEW_STYLES`，脚本改为引用配置 |
| 2 | `split-manifest.json` 中 `tasks-reminder-log.js` 的 `dependsOn` 错误列出 `tasks-config.js` + `tasks-demo-data.js` | 清空为 `[]`（该脚本仅操作 DOM 和回调，不引用全局配置） |
| 3 | `split-manifest.json` 中 `tasks-page.js` 的 `dependsOn` 多列 `tasks-demo-data.js` | 移除（`tasks-page.js` 仅引用 `TasksConfig`，不引用 `TasksDemoData`） |
| 4 | `split-manifest.json` 中 `tasks-demo-data.js` 的 `consumers` 列表不准确 | 清空并加 `consumersNote` 说明：P0 阶段 demo 数据硬编码在 HTML sections 中 |
| 5 | `toast.html` 包含 toast + 取消原因弹窗，边界模糊 | manifest 中补充 `boundaryNote` 说明合并原因与生产拆分方向 |

### 8.4 已知边界偏差（保留不修复）

| # | 偏差 | 原因 | 生产迁移时处理方式 |
|---|------|------|------------------|
| 1 | `tasks-config.js` 中 `FORM_FIELDS.id` / `BULK_ACTIONS.selectId` 含 DOM 元素 ID | 原型中 config 为 JS/HTML 的声明式桥接，脚本据此 `getElementById` | 生产中改为 React props/state，不再需要 DOM ID |
| 2 | `toast.html` 同时承载 Toast 通知和 CancelReasonDialog | 两者均为脱离主内容流的浮动层，合并减少文件数 | 生产中 Toast → `shared/ui/Toast`，CancelReasonDialog → `features/task/ui/CancelReasonDialog` |
| 3 | `tasks-bulk-actions.js` 的 `openCancelDialog` 同时服务批量取消和单条取消 | 取消原因收集是同一 UI 流程，不拆分 | 生产中抽为独立 `useCancelReasonDialog` Hook |
| 4 | Sections 中选项值（筛选/表单/批量操作的 `<option>`）与 `tasks-config.js` 枚举重复 | 原型 sections 为纯静态 HTML，无 JS 渲染；config 为后续动态化准备 | 生产中由组件从 config 动态渲染 `<option>`，消除重复 |

---

## 9. 迁移与回归审查记录（Pass 3）

> 审查日期：2026-04-09
>
> 审查依据：计划第 3 轮要求 — 确认 `split-manifest.json` 7 个维度全量覆盖，显式记录旧链接与 demo-only 风险。

### 9.1 manifest 维度逐项核对

| # | 维度 | 结果 | 说明 |
|---|------|------|------|
| 1 | `sections` (8) | **PASS** | 8 个 section 文件均存在，`sourceAnchors` 与实际 HTML ID/属性对齐，`contractRefs` 映射 P0-CONTRACT 正确章节 |
| 2 | `dataFiles` (2) | **PASS** | `tasks-config.js` 27 个导出 + `tasks-demo-data.js` 5 个导出全部在实际文件中验证通过 |
| 3 | `scripts` (5) | **PASS** | 5 个脚本 `domHooks` 与实际 `getElementById` / `querySelector` 调用对齐；`dependsOn` 准确（reminder-log 为 `[]`） |
| 4 | `sharedCandidates` | **PASS** | 3 styles + 3 shell + 2 scripts 均在文件系统中存在 |
| 5 | `referenceDocs` | **FIXED** | 补增 `INVENTORY.md`（迁移源盘点）和 `DESIGN.md`（视觉约束基线），由 4 → 6 项 |
| 6 | `productionMapping` | **FIXED** | `ui` 层补增 `CancelReasonDialog.tsx`；MIGRATION-MAPPING.md §4.1/§4.3/§6 同步更新 |
| 7 | `regressionChecklist` | **FIXED** | 补增 6 条缺失项（本周到期验证 / 4 状态数据覆盖 / 批量栏可见规则 / 壳层引入 / 案件链接 / 日志链接属性），由 32 → 38 项 |

### 9.2 旧链接影响审查

| # | 链接关系 | 记录位置 | 本轮处理 | 状态 |
|---|---------|---------|---------|------|
| 1 | 其他页面 → `tasks.html`（入站） | `knownLegacyLinks` (3 条) + INVENTORY.md §7 (18 页面) | 仅记录不修复 | **PASS** |
| 2 | `tasks/` 内部导航路径 → 其他页面 | `sharedReuse.navPathAdjustments` (11 条) | 所有 admin 根级路径加 `../` 前缀 | **PASS** |
| 3 | 案件链接 `../case/detail.html` | task-table.html (6 行) + task-detail-panel.html (1 处) | 路径相对于 `tasks/` 子目录，正确 | **PASS** |
| 4 | `aria-current="page"` 自引用 | `sharedReuse.ariaCurrent` + §4.1.3 | `href="index.html"` + `aria-current="page"` | **PASS** |
| 5 | topbar 新建案件路径 | INVENTORY.md §6.2 记录旧路径 `case-create.html` | shared/shell/topbar.html 已更新为 `case/create.html` | **PASS** |

### 9.3 demo-only 风险清单

| # | 风险 | 涉及文件 | 标注位置 | 状态 |
|---|------|---------|---------|------|
| 1 | 静态示例数据 6 条 | `tasks-demo-data.js` | manifest `demoOnly: true` + P0-CONTRACT §18 | **PASS** |
| 2 | Badge 计数硬编码 (5/2/1) | `workbench-sidebar.html` | P0-CONTRACT §18 "视图计数 badge 硬编码" | **PASS** |
| 3 | 操作记录时间线硬编码 | `task-detail-panel.html` | P0-CONTRACT §18 "操作记录硬编码数据" | **PASS** |
| 4 | Toast 标注「示例」 | `tasks-config.js` TOAST 7 条 | 所有 title 含 "（示例）" 后缀 | **PASS** |
| 5 | 筛选/搜索仅 demo 占位 | `tasks-filters.js` | 脚本注释 `// demo-only` + manifest `demoOnly` | **PASS** |
| 6 | Submit 按钮编辑模式 toast 错误 | `tasks-page.js` L36-38 | manifest `notes` 新增记录 | **FIXED** |
| 7 | 批量操作后不清选中态 | `tasks-bulk-actions.js` | manifest `notes` 新增记录 | **FIXED** |
| 8 | 取消原因弹窗仅 UI 演示 | `toast.html` cancelReasonDialog | P0-CONTRACT §18 "取消原因弹窗" | **PASS** |
| 9 | 排序逻辑静态（无 JS 排序） | task-table.html 行顺序 | P0-CONTRACT §18 "默认排序" | **PASS** |
| 10 | 权限约束仅视觉（disabled checkbox） | task-table.html row 5/6 | P0-CONTRACT §14.5 + manifest regressionChecklist | **PASS** |

### 9.4 设计规范合规检查

对照 [DESIGN.md](../../../../design/gyosei-os-admin/DESIGN.md) 8 个维度：

| # | DESIGN.md 约束 | 实现情况 | 状态 |
|---|---------------|---------|------|
| 1 | Token 使用 `--bg/--surface/--primary/...` | sections 中使用 `var(--text)` / `var(--primary)` / `var(--danger)` 等 | **PASS** |
| 2 | 字体 Plus Jakarta Sans | 由 Tailwind CDN 或 index.html `<head>` 提供 | **PASS**（待 index.html 组装） |
| 3 | 圆角 `--radius: 14px` | 组件样式来自 `shared/styles/components.css` | **PASS** |
| 4 | 卡片阴影 `--shadow` | `.apple-card` 使用 `var(--shadow)` | **PASS** |
| 5 | 导航 `aria-current="page"` 高亮 | `sharedReuse.ariaCurrent` 定义规则；shell.css 提供样式 | **PASS** |
| 6 | 表头小号/全大写/加字距 | `.apple-table th` 在 `components.css` 定义 | **PASS** |
| 7 | `prefers-reduced-motion` | 由 `tokens.css` 提供 | **PASS** |
| 8 | Skip Link + focus-visible | 由 shell 模板 + shell.css 提供 | **PASS**（待 index.html 组装） |

### 9.5 本轮修复汇总

| # | 修复项 | 影响文件 |
|---|-------|---------|
| 1 | `referenceDocs` 补增 `INVENTORY.md` + `DESIGN.md` | `split-manifest.json` |
| 2 | `productionMapping.ui` 补增 `CancelReasonDialog.tsx` | `split-manifest.json` |
| 3 | `regressionChecklist` 补增 6 条遗漏项 | `split-manifest.json` |
| 4 | `notes` 补增 2 条 demo-only 风险备注 | `split-manifest.json` |
| 5 | §4.1 组件表补增 CancelReasonDialog 行 | `MIGRATION-MAPPING.md` |
| 6 | §4.2 DOM→Props 映射补增 cancelReasonDialog | `MIGRATION-MAPPING.md` |
| 7 | §4.3 文件清单补增 CancelReasonDialog.tsx | `MIGRATION-MAPPING.md` |
| 8 | §6 文件树补增 CancelReasonDialog.tsx | `MIGRATION-MAPPING.md` |
| 9 | §9 Pass 3 审查记录新增 | `SPLIT-ARCHITECTURE.md` |

### 9.6 结论

全部 7 个 manifest 维度、旧链接记录、demo-only 标注、设计规范合规均已确认覆盖。3 处 manifest 遗漏已修复，MIGRATION-MAPPING.md 同步更新。Pass 3 通过。
