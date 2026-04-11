# 系统设置页原型拆分架构说明

> 本文档定义系统设置页拆分的目标目录结构、模块职责、共享层与页面层的边界，作为 AI 与开发人员的共同入口文档。
>
> P0 约束清单见 [P0-CONTRACT.md](./P0-CONTRACT.md)

---

## 1. 当前问题

`settings.html` 是一个 ~447 行的单文件，内容为"个人资料"表单，**与 P0 系统设置规格几乎无重叠**：

| 关注点 | 行数范围（约） | 问题 |
|--------|-------------|------|
| 设计 Token（CSS 变量） | 11-37 | 与 `shared/styles/tokens.css` 重复定义 |
| 公共组件样式 | 39-133 | `.btn-primary`, `.chip`, `.apple-card` 等内联复制 |
| App Shell + 导航 HTML | 146-321 | 移动端 + 桌面端导航各写一份，与其他页面重复 |
| 顶部栏 HTML | 323-345 | 与其他页面重复 |
| 设置页专有样式 | 135-143 | `.setting-item`（个人资料行样式，P0 不需要） |
| 页面区块 HTML（header/subnav/form） | 347-417 | 子导航和表单内容完全不符合 P0 规格 |
| 业务脚本 | 423-444 | 仅包含移动端导航，无设置业务脚本 |

### 规格差距

相比 [P0-CONTRACT.md](./P0-CONTRACT.md) 的要求，现有页面 **无任何 P0 必需区块**：

| 缺失能力 | 说明 |
|----------|------|
| Group 管理列表（5 列） | 完全缺失 |
| Group 详情面板 | 完全缺失 |
| Group 新建/停用/重命名 | 完全缺失 |
| 可见性配置（2 项开关） | 完全缺失 |
| 本地资料根目录配置 | 完全缺失 |
| P0 子导航（3 项） | 现有 5 项子导航全部不属于 P0 |
| Toast | 完全缺失 |
| 权限矩阵标注 | 完全缺失 |

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
├── settings/                            ← 系统设置页层
│   ├── index.html                       ← 入口文件（组装 shared + sections + scripts）
│   ├── P0-CONTRACT.md                   ← P0 约束清单
│   ├── SPLIT-ARCHITECTURE.md            ← 本文档
│   ├── MIGRATION-MAPPING.md             ← 原型→生产迁移映射
│   ├── INVENTORY.md                     ← 迁移源盘点
│   ├── split-manifest.json              ← 机器可读拆分清单
│   ├── sections/
│   │   ├── page-header.html             ← 页面标题、副标题、主说明
│   │   ├── settings-subnav.html         ← 左侧设置导航（P0 范围 3 项）
│   │   ├── group-list-panel.html        ← Group 列表、状态筛选、空状态
│   │   ├── group-detail-meta.html       ← Group 详情元数据（名称、编号、状态）
│   │   ├── group-members-panel.html     ← Group 成员列表（P0 只读）
│   │   ├── group-stats-panel.html       ← 关联客户与案件统计
│   │   ├── visibility-config-panel.html ← 跨组建案与协作可见性配置
│   │   ├── storage-root-panel.html      ← 本地资料根目录配置与预览
│   │   ├── toast.html                   ← Toast 通知组件
│   │   ├── group-name-modal.html        ← 新建/重命名 Group 共用弹窗
│   │   └── group-disable-modal.html     ← 停用 Group 确认弹窗（含已引用 Group 警告）
│   ├── data/
│   │   ├── settings-config.js           ← 子导航配置、字段定义、Group 状态枚举、
│   │   │                                   权限提示、角色矩阵、路径策略说明、
│   │   │                                   toast preset、回归文案
│   │   └── settings-demo-data.js        ← 示例 Group、成员列表、统计数据、
│   │                                       OrgSetting 示例值、日志占位
│   ├── scripts/
│   │   ├── settings-page.js             ← 页面初始化、子导航切换、默认激活区块、toast 编排
│   │   ├── settings-group-list.js       ← 列表筛选、行选择、空状态切换
│   │   ├── settings-group-detail.js     ← 详情面板切换、元数据刷新
│   │   ├── settings-group-actions.js    ← 新建、重命名、停用确认
│   │   ├── settings-group-members.js    ← 成员列表渲染与空态处理
│   │   ├── settings-group-stats.js      ← 关联统计渲染
│   │   ├── settings-visibility.js       ← 两项开关联动与保存示例
│   │   └── settings-storage-root.js     ← 根目录表单、路径预览、保存示例
│   └── styles/                          ← 设置页专有样式（可选）
│       └── settings.css                 ← 仅当需要模块专有样式时创建
│
├── settings.html                        ← 旧页面（迁移源 + 回归对照，保留不删）
└── ...其他页面
```

---

## 3. 迁移源角色说明

旧页面 `packages/prototype/admin/settings.html` 在此次拆分中扮演以下角色：

| 角色 | 说明 |
|------|------|
| **迁移源** | 仅提供壳层结构参考（导航、topbar、app-shell），业务内容需全新构建 |
| **回归对照** | 拆分期间保留原文件，便于确认壳层迁移无遗漏 |
| **不立即删除** | 第一阶段拆分完成后，旧文件保留；待新模块通过全量回归后再决定是否归档 |

### 旧页面已知链接引用

其他页面的侧边导航中引用了 `settings.html`。拆分本轮仅记录这些引用，不在设置模块内修复外部导航链接。

| 引用方 | 引用路径 | 备注 |
|--------|---------|------|
| `shared/shell/side-nav.html` | `settings.html` | 需更新为 `settings/index.html`（配合文案改为「系统设置」） |
| `shared/shell/mobile-nav.html` | `settings.html` | 需同步更新 |
| `admin-prototype.html` | `settings.html` | 旧页面内联导航 |
| `customers/index.html` | `../settings.html` | 子目录导航 |
| `tasks/index.html` | `../settings.html` | 子目录导航 |
| `billing/index.html` | `../settings.html` | 子目录导航 |
| `documents/index.html` | `../settings.html` | 子目录导航 |
| 其他未迁移的 `.html` 页面 | `settings.html` | 同级导航 |

> **注意**：本次迁移需要同步更新 `shared/shell/side-nav.html` 和 `shared/shell/mobile-nav.html` 中的设置入口（路径 + 文案），因为这是所有已迁移页面的共享导航源。

新模块 `settings/index.html` 内部导航将使用 `index.html`（自引用）并设置 `aria-current="page"`。

---

## 4. 模块职责定义

### 4.1 共享层复用 (`shared/`)

设置模块复用已有共享层，**需更新共享导航文案**。

#### 4.1.1 CSS 链接路径

`settings/index.html` 位于 `packages/prototype/admin/settings/` 子目录，所有共享样式通过 `../shared/styles/` 相对路径引入：

```html
<link rel="stylesheet" href="../shared/styles/tokens.css" />
<link rel="stylesheet" href="../shared/styles/shell.css" />
<link rel="stylesheet" href="../shared/styles/components.css" />
```

| 共享样式 | 相对路径（从 `settings/index.html`） | 提供的能力 |
|----------|----------------------------------|-----------|
| `tokens.css` | `../shared/styles/tokens.css` | `:root` CSS 变量（颜色、阴影、圆角、字体）、`body` 排版、`.display-font`、`prefers-reduced-motion` |
| `shell.css` | `../shared/styles/shell.css` | `.app-shell` 网格、`.side-nav` + `.nav-item`（含 hover 和 `aria-current` 态）、`.topbar`、`.mobile-nav`、`.skip-link`、`focus-visible` |
| `components.css` | `../shared/styles/components.css` | `.btn-primary`、`.btn-pill`、`.chip`、`.icon-btn`、`.apple-card`、`.apple-table`、`.modal-backdrop`、`.apple-modal`、`.apple-input`、`.apple-label`、`.search` |

#### 4.1.2 Shell HTML 片段复用

导航 HTML 从 `shared/shell/` 三个规范片段复制到 `settings/index.html` 中，以注释标记来源。由于 `settings/index.html` 在子目录内，需要对所有 admin 根级路径加 `../` 前缀。

| 规范片段 | 注释标记 | 路径调整规则 |
|----------|---------|-------------|
| `shared/shell/mobile-nav.html` | `<!-- shell: mobile-nav.html (paths adjusted for settings/ subdirectory) -->` | 所有 admin 根级 `href` 加 `../`；自身 `href` 改为 `index.html`；加 `aria-current="page"` |
| `shared/shell/side-nav.html` | `<!-- shell: side-nav.html (paths adjusted for settings/ subdirectory) -->` | 同上 |
| `shared/shell/topbar.html` | `<!-- shell: topbar.html (paths adjusted for settings/ subdirectory) -->` | `case/create.html` → `../case/create.html`；`leads-messages.html` → `../leads-messages.html` |

导航链接路径调整对照（canonical → `settings/index.html`）：

| 导航项 | 规范路径（admin 根级） | 调整后路径（settings/ 子目录） |
|--------|----------------------|--------------------------|
| 仪表盘 | `admin-prototype.html` | `../admin-prototype.html` |
| 咨询与会话 | `leads-messages.html` | `../leads-messages.html` |
| 客户 | `customers/index.html` | `../customers/index.html` |
| 案件 | `cases-list.html` | `../cases-list.html` |
| 任务与提醒 | `tasks.html` | `../tasks.html` |
| 资料中心 | `documents/index.html` | `../documents/index.html` |
| 文书中心 | `forms.html` | `../forms.html` |
| 收费与财务 | `billing/index.html` | `../billing/index.html` |
| 报表 | `reports.html` | `../reports.html` |
| **系统设置** | `settings.html`（旧）/ `settings/index.html`（新） | **`index.html`**（自引用）+ **`aria-current="page"`** |
| 客户门户 | `../src/index.html` | `../../src/index.html` |

#### 4.1.3 `aria-current` 规则

`shared/styles/shell.css` 定义了 `.nav-item[aria-current="page"]` 样式规则：

```css
.nav-item[aria-current="page"] {
  background: rgba(3, 105, 161, 0.1);
  color: var(--text);
}
```

在 `settings/index.html` 中，**「系统设置」导航项**必须在以下两处同时添加 `aria-current="page"`：

1. **移动端导航**（`mobile-nav` 内 `<nav>` 中）：
   ```html
   <a class="nav-item" href="index.html" aria-current="page">...系统设置</a>
   ```
2. **桌面侧边导航**（`side-nav` 内 `<nav>` 中）：
   ```html
   <a class="nav-item" href="index.html" aria-current="page">...系统设置</a>
   ```

规则要点：
- 属性值固定为 `"page"`，表示当前页面
- 仅在设置页的 `index.html` 中标注设置导航项；其他导航项不标注
- `href` 从规范片段的 `settings.html` 改为 `index.html`（子目录自引用）
- 导航项文案从「设置」改为「系统设置」

#### 4.1.4 脚本链接路径

页面尾部按以下顺序引入共享脚本和模块脚本：

```html
<!-- 共享脚本 -->
<script src="../shared/scripts/mobile-nav.js"></script>
<script src="../shared/scripts/navigate.js"></script>
<!-- 模块脚本 -->
<script src="scripts/settings-page.js"></script>
<script src="scripts/settings-group-list.js"></script>
<script src="scripts/settings-group-detail.js"></script>
<script src="scripts/settings-group-actions.js"></script>
<script src="scripts/settings-group-members.js"></script>
<script src="scripts/settings-group-stats.js"></script>
<script src="scripts/settings-visibility.js"></script>
<script src="scripts/settings-storage-root.js"></script>
```

| 共享脚本 | 相对路径（从 `settings/index.html`） | 提供的能力 |
|----------|----------------------------------|-----------|
| `mobile-nav.js` | `../shared/scripts/mobile-nav.js` | `[data-nav-open]` / `[data-nav-close]` 点击 → `body[data-nav-open]` 切换；Escape 键关闭 |
| `navigate.js` | `../shared/scripts/navigate.js` | 全局搜索弹窗（`⌘K` / `Ctrl+K`）、`data-navigate` 路由、topbar 搜索聚焦 |

#### 4.1.5 导航文案更新

本次拆分需同步更新 `shared/shell/side-nav.html` 和 `shared/shell/mobile-nav.html` 中的设置导航项：

| 修改位置 | 修改内容 |
|---------|---------|
| `shared/shell/side-nav.html` L74 附近 | 文案「设置」→「系统设置」 |
| `shared/shell/mobile-nav.html` 对应位置 | 文案「设置」→「系统设置」 |

> **影响范围**：更新 shared shell 文案后，所有已引用 shared shell 的模块页面（`customers/`, `tasks/`, `billing/`, `documents/`, `dashboard/`）导航中的设置文案将自动变为「系统设置」。未迁移到 shared shell 的旧页面不受影响（它们使用内联导航）。

---

### 4.2 设置页层 (`settings/`)

设置页层只关注系统设置的 UI 区块和业务行为。

#### `settings/index.html` — 入口组装文件

职责：
1. 声明 `<!DOCTYPE html>`、`<head>`（meta、title、tailwindcss CDN、font import）
2. 引入共享样式：`<link>` 到 `../shared/styles/tokens.css`, `components.css`, `shell.css`
3. 引入设置页专有样式（如有）
4. 组装 HTML 结构：`app-shell` > `side-nav` + `main`
5. 在 `<main>` 内按顺序插入 `sections/*.html` 片段内容
6. 在页尾引入脚本：`../shared/scripts/mobile-nav.js` + `settings/scripts/*.js`

> **P0 阶段简化方案**：与其他模块一致，`sections/*.html` 作为"逻辑边界文件"存在。入口文件中用注释标记区块来源（如 `<!-- section: sections/group-list-panel.html -->`）。脚本文件直接通过 `<script src="...">` 引入。

#### `settings/sections/*.html` — 页面区块

| 文件 | 内容 | 对应 P0 契约 |
|------|------|-------------|
| `page-header.html` | 页面标题 `<h1>系统设置</h1>` + 副标题 + 管理员权限说明 | §1 |
| `settings-subnav.html` | 左侧设置子导航（Group 管理 / 可见性配置 / 本地资料根目录） | §1.3 |
| `group-list-panel.html` | Group 列表（5 列表格）+ 状态筛选 + 空状态 + "新建 Group"按钮 | §2 |
| `group-detail-meta.html` | Group 详情：名称（可编辑入口）、编号、状态 | §3 |
| `group-members-panel.html` | Group 成员列表（只读，姓名+角色） | §3.1 |
| `group-stats-panel.html` | 关联客户数与案件数统计 | §3.2 |
| `visibility-config-panel.html` | 2 项 toggle 开关 + 说明文案 + 保存按钮 | §5 |
| `storage-root-panel.html` | 根目录名称/路径表单 + 策略说明 + 预览 + 更新人/时间 + 保存按钮 | §6 |
| `toast.html` | `#toast` 组件 | §9 |
| `group-name-modal.html` | 新建/重命名 Group 共用弹窗（名称输入 + 创建/保存） | §4.2, §4.3 |
| `group-disable-modal.html` | 停用 Group 确认弹窗（影响说明 + 确认/取消） | §4.1 |

#### `settings/data/settings-config.js` — 声明式配置

将以下隐式耦合提取为显式配置对象：

```js
export const SUBNAV_ITEMS = [
  { id: 'group-management', label: 'Group 管理', default: true },
  { id: 'visibility-config', label: '可见性配置' },
  { id: 'storage-root', label: '本地资料根目录' },
];

export const GROUP_STATUS_OPTIONS = [
  { value: '', label: '状态：全部' },
  { value: 'active', label: '启用' },
  { value: 'disabled', label: '停用' },
];

export const GROUP_TABLE_COLUMNS = [
  { id: 'name', label: 'Group 名称', showAlways: true },
  { id: 'status', label: '状态', width: '100px' },
  { id: 'createdAt', label: '创建时间', width: '140px' },
  { id: 'activeCases', label: '活跃案件数', width: '110px', align: 'center' },
  { id: 'memberCount', label: '成员数', width: '80px', align: 'center' },
];

export const MEMBER_TABLE_COLUMNS = [
  { id: 'name', label: '姓名' },
  { id: 'role', label: '角色', width: '120px' },
];

export const ROLE_MATRIX = {
  admin: { visible: true, editable: true, label: '管理员' },
  lead: { visible: false, editable: false, label: '主办人' },
  assistant: { visible: false, editable: false, label: '助理' },
  sales: { visible: false, editable: false, label: '销售' },
  finance: { visible: false, editable: false, label: '财务' },
};

export const VISIBILITY_SWITCHES = [
  {
    id: 'cross-group-case-creation',
    label: '是否允许跨组建案',
    description: '启用后，非管理员也可为非本组客户创建案件。跨组建案须留痕（操作人、时间、原因）。',
  },
  {
    id: 'cross-group-collaboration-view',
    label: '是否允许负责人查看非本组协作案件',
    description: '启用后，被指定为协作者的负责人可查看非本组案件信息。',
  },
];

export const STORAGE_ROOT_FIELDS = [
  { id: 'rootName', label: '根目录名称', type: 'text', required: true, placeholder: '案件资料总盘' },
  { id: 'rootPath', label: '根目录路径 / 挂载点', type: 'text', required: true, placeholder: '\\\\server\\share 或 /mnt/docs' },
];

export const STORAGE_POLICY_TEXT = '系统仅保存 relative_path，禁止在业务对象中记录绝对路径。本地根目录在此处统一配置，业务模块自动拼接完整路径。';

export const STORAGE_PREVIEW_TEMPLATE = '{root}/{relative_path}';

export const TOAST = {
  createGroup:    { title: 'Group 已创建（示例）', desc: '已创建新团队，可继续配置成员' },
  disableGroup:   { title: 'Group 已停用（示例）', desc: '已停用该团队，新建客户/案件不可再选' },
  renameGroup:    { title: 'Group 已重命名（示例）', desc: '团队名称已更新' },
  saveVisibility: { title: '可见性配置已更新（示例）', desc: '全局配置已保存' },
  saveStorage:    { title: '根目录配置已更新（示例）', desc: '本地资料根目录已更新' },
};

export const STATUS_BADGE_MAP = {
  active:   { label: '启用', class: 'badge-green' },
  disabled: { label: '停用', class: 'badge-gray' },
};
```

#### `settings/data/settings-demo-data.js` — 演示数据

```js
export const DEMO_GROUPS = [
  {
    id: 'grp-001',
    name: '東京一組',
    status: 'active',
    createdAt: '2024-01-15',
    activeCases: 12,
    memberCount: 4,
    members: [
      { name: 'Admin', role: '管理員' },
      { name: '田中太郎', role: '主办人' },
      { name: '鈴木花子', role: '助理' },
      { name: '佐藤一郎', role: '助理' },
    ],
    relatedCustomers: 28,
    relatedCases: 35,
  },
  {
    id: 'grp-002',
    name: '東京二組',
    status: 'active',
    createdAt: '2024-03-01',
    activeCases: 8,
    memberCount: 3,
    members: [
      { name: 'Tom', role: '主办人' },
      { name: '高橋美咲', role: '助理' },
      { name: '山田健一', role: '销售' },
    ],
    relatedCustomers: 15,
    relatedCases: 20,
  },
  {
    id: 'grp-003',
    name: '大阪組',
    status: 'disabled',
    createdAt: '2024-02-10',
    activeCases: 0,
    memberCount: 2,
    members: [
      { name: '伊藤裕子', role: '主办人' },
      { name: '中村大輔', role: '助理' },
    ],
    relatedCustomers: 8,
    relatedCases: 10,
  },
];

export const DEMO_VISIBILITY_CONFIG = {
  'cross-group-case-creation': false,
  'cross-group-collaboration-view': false,
};

export const DEMO_STORAGE_ROOT = {
  rootName: '案件資料総盤',
  rootPath: '\\\\fileserver\\gyosei-docs',
  lastUpdatedBy: 'Admin',
  lastUpdatedAt: '2025-03-20 14:30',
};
```

#### `settings/scripts/*.js` — 行为模块

| 文件 | 职责 | 依赖 |
|------|------|------|
| `settings-page.js` | DOMContentLoaded 入口；子导航切换（区块显隐）；默认激活"Group 管理"；toast 编排 | config, group-list, group-detail, visibility, storage-root |
| `settings-group-list.js` | Group 列表状态筛选；行选择→打开详情；空状态切换 | config (GROUP_TABLE_COLUMNS, GROUP_STATUS_OPTIONS) |
| `settings-group-detail.js` | 详情面板开关；Group 元数据刷新（名称/编号/状态） | config |
| `settings-group-actions.js` | 新建 Group 表单；重命名内联编辑；停用确认弹窗 | config (TOAST), toast |
| `settings-group-members.js` | 成员列表渲染；空态处理（无成员时的占位） | config (MEMBER_TABLE_COLUMNS) |
| `settings-group-stats.js` | 关联客户/案件统计渲染 | — |
| `settings-visibility.js` | 两项 toggle 联动；保存按钮触发 toast | config (VISIBILITY_SWITCHES, TOAST) |
| `settings-storage-root.js` | 根目录表单校验；路径预览动态拼接；保存按钮触发 toast；未配置状态处理 | config (STORAGE_ROOT_FIELDS, STORAGE_PREVIEW_TEMPLATE, TOAST) |

跨模块通信使用挂载到约定命名空间（`window.__settingsPage`）的方式，避免模块之间直接互引 DOM ID。

---

## 5. 共享层与页面层边界规则

| 规则 | 说明 |
|------|------|
| **共享层不含业务逻辑** | `shared/` 下的文件不出现"Group"、"可见性"、"根目录"等业务概念 |
| **页面层不复制壳子** | `settings/index.html` 不再手写导航 HTML，引用 `shared/shell/` |
| **样式单一来源** | `.btn-primary`, `.chip`, `.apple-card` 等在 `shared/styles/` 定义一次；页面层只补充页面专有样式 |
| **Token 单一来源** | `:root` CSS 变量在 `shared/styles/tokens.css` 定义一次；页面层不重新声明 |
| **脚本按能力拆** | 每个 `.js` 文件对应一个独立能力（page / group-list / group-detail / group-actions / group-members / group-stats / visibility / storage-root） |
| **配置集中声明** | 子导航配置、字段定义、状态枚举、角色矩阵、开关配置、toast 文案在 `data/settings-config.js` 集中管理 |
| **演示数据独立** | 示例 Group、成员、统计、可见性、根目录在 `data/settings-demo-data.js`，不混入配置 |
| **data-\* 钩子优先** | 尽量用 `data-action="xxx"` 属性 + 事件代理，减少 `onclick` 内联处理器 |
| **section 注释边界** | 入口 HTML 中用 `<!-- section: sections/xxx.html -->` 注释标记区块起止 |

---

## 6. Group 成员列表边界声明

Group 成员列表在 P0 按**只读展示**处理：

| 能力 | P0 处理 | 说明 |
|------|---------|------|
| 展示成员姓名/角色 | ✅ 实现 | `group-members-panel.html` |
| 成员数显示 | ✅ 实现 | Group 列表第 5 列 |
| 添加成员 | ❌ 不实现 | 后置到 P1 |
| 移除成员 | ❌ 不实现 | 后置到 P1 |
| 成员角色变更 | ❌ 不实现 | 后置到 P1 |
| 成员数据来源 | demo 数据 | 生产环境从 `UserGroupMembership` 读取 |

若产品确认要支持成员维护，应另开新任务，不在本轮偷带进入。

---

## 7. 拆分步骤（推荐执行顺序）

### Step 1：搭建入口文件骨架
1. 创建 `settings/index.html`，引入 `shared/styles/*.css`
2. 从 `shared/shell/` 复制导航 HTML（路径调整为 `../`），设置系统设置项 `aria-current="page"`，文案改为「系统设置」
3. 搭建 `<main>` 骨架，预留 10 个 section 注释边界
4. **视觉回归**：页面壳子正常渲染

### Step 2：更新共享导航文案
1. 将 `shared/shell/side-nav.html` 中「设置」文案改为「系统设置」
2. 将 `shared/shell/mobile-nav.html` 中「设置」文案改为「系统设置」
3. **视觉回归**：所有已迁移页面的导航设置项显示为「系统设置」

### Step 3：实现静态区块
1. 新建 `sections/page-header.html` 与 `sections/settings-subnav.html`
2. 新建 Group 管理相关 section（list/detail-meta/members/stats）
3. 新建 `sections/visibility-config-panel.html`
4. 新建 `sections/storage-root-panel.html`
5. 新建 `sections/toast.html` + `sections/group-disable-modal.html`
6. **视觉回归**：所有区块可见，子导航 3 项完整

### Step 4：提取配置与演示数据
1. 创建 `data/settings-config.js`，提取所有枚举、列定义、开关配置、表单 schema、toast preset
2. 创建 `data/settings-demo-data.js`，提取示例 Group、成员、统计、配置
3. **视觉回归**：数据不变

### Step 5：拆分脚本
1. 创建 8 个脚本文件，按职责拆分
2. 入口文件 `<script>` 改为 `<script src="...">` 引用
3. **行为回归**：子导航切换、Group 列表筛选、详情面板、可见性开关、根目录预览、toast 全部可用

### Step 6：最终回归
1. 按 [P0-CONTRACT.md 拆分回归清单](./P0-CONTRACT.md#拆分回归清单) 逐项验证
2. 运行 `npm run fix` + `npm run guard`

---

## 8. 从原型 Section 到生产组件的映射表（前瞻）

此映射不在 P0 拆分范围内执行，仅作为后续迁移的参考。

**完整映射文档见 → [MIGRATION-MAPPING.md](./MIGRATION-MAPPING.md)**

以下为速查摘要，遵循仓库 `domain → data → features/{model,ui} → shared/ui` 四层架构：

| 原型 Section / Script | 生产组件 | 层级 |
|----------------------|---------|------|
| `sections/page-header.html` | `SettingsHeader` | features/settings/ui |
| `sections/settings-subnav.html` | `SettingsSubnav` | features/settings/ui |
| `sections/group-list-panel.html` | `GroupListPanel` | features/settings/ui |
| `sections/group-detail-meta.html` | `GroupDetailMeta` | features/settings/ui |
| `sections/group-members-panel.html` | `GroupMembersPanel` | features/settings/ui |
| `sections/group-stats-panel.html` | `GroupStatsPanel` | features/settings/ui |
| `sections/visibility-config-panel.html` | `VisibilityConfigPanel` | features/settings/ui |
| `sections/storage-root-panel.html` | `StorageRootPanel` | features/settings/ui |
| `sections/toast.html` | `Toast` | shared/ui |
| `sections/group-name-modal.html` | `GroupNameModal` | features/settings/ui |
| `sections/group-disable-modal.html` | `GroupDisableModal` | features/settings/ui |
| `scripts/settings-page.js` | `useSettingsViewModel` | features/settings/model |
| `scripts/settings-group-list.js` | `useGroupList` | features/settings/model |
| `scripts/settings-group-detail.js` | `useGroupDetail` | features/settings/model |
| `scripts/settings-group-actions.js` | `useGroupActions` | features/settings/model |
| `scripts/settings-group-members.js` | `useGroupMembers` | features/settings/model |
| `scripts/settings-group-stats.js` | `useGroupStats` | features/settings/model |
| `scripts/settings-visibility.js` | `useVisibilityConfig` | features/settings/model |
| `scripts/settings-storage-root.js` | `useStorageRoot` | features/settings/model |
| `data/settings-config.js` | `Group.ts` + `OrgSetting.ts` + `settingsConstants.ts` | domain/settings |
| `data/settings-demo-data.js` | — (demo-only, 不迁移) | — |
| — | `GroupRepository.ts` + `OrgSettingRepository.ts` | domain/settings |
| — | `GroupApi.ts` + `OrgSettingApi.ts` + `createGroupRepository.ts` + `createOrgSettingRepository.ts` | data/settings |
| — | `UserGroupMembership.ts` | domain/settings |
| — | `GroupStatsReadModel.ts` | domain/settings |
| `shared/styles/tokens.css` | Design tokens → Tamagui theme / CSS 变量 | infra |
| `shared/shell/*.html` | `AppShell` + `SideNav` + `TopBar` + `MobileNav` | shared/ui |
| `shared/scripts/mobile-nav.js` | `useMobileNav` | shared/hooks |
| `shared/scripts/navigate.js` | React Navigation（不需要独立 Hook） | — |

### 生产数据模型映射（前瞻）

| 原型概念 | 生产实体 | 说明 |
|---------|---------|------|
| Group 列表/详情 | `Group` | 团队实体 |
| Group 成员 | `UserGroupMembership` | 用户与 Group 的关联关系 |
| 可见性配置 | `OrgSetting` | 事务所级配置 |
| 根目录配置 | `OrgSetting` | 事务所级配置（同一实体不同字段） |
| Group 关联统计 | `GroupStatsReadModel` | 聚合读模型（客户数/案件数） |
