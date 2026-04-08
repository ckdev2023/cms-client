# 客户页原型拆分架构说明

> 本文档定义客户页拆分的目标目录结构、模块职责、共享层与页面层的边界，作为 AI 与开发人员的共同入口文档。
>
> P0 约束清单见 [P0-CONTRACT.md](./P0-CONTRACT.md)

---

## 1. 当前问题

`customers/index.html` 是一个 ~1500 行的单文件，混合了：

| 关注点 | 行数范围（约） | 问题 |
|--------|-------------|------|
| 设计 Token（CSS 变量） | 11-37 | 与 `admin-prototype.html` 重复定义 |
| 公共组件样式 | 39-540 | `.btn-primary`, `.chip`, `.apple-card` 等在两页各写一份 |
| App Shell + 导航 HTML | 545-717 | 侧边导航在两页各复制一份 |
| 移动端导航 HTML | 545-633 | 仅客户页有，仪表盘缺失 |
| 顶部栏 HTML | 720-743 | 两页各写一份 |
| 页面区块 HTML（header/filters/table/modal/toast） | 745-1109 | 客户页特有，但区块之间无边界 |
| 客户页业务脚本 | 1111-1471 | modal、draft、bulk actions、page init 混在一个 `<script>` 中 |
| 移动端导航脚本 | 1473-1494 | 公共能力，应归入共享层 |

---

## 2. 目标目录结构

```
packages/prototype/admin/
├── shared/                          ← 公共层（多页面共享）
│   ├── styles/
│   │   └── tokens.css               ← 设计 Token（CSS 变量）
│   │   └── components.css            ← 公共组件样式（btn, chip, card, table, modal, badge, form...）
│   │   └── layout.css                ← App Shell 网格、侧边导航、顶部栏布局
│   ├── shell/
│   │   └── side-nav.html             ← 桌面侧边导航 HTML 片段
│   │   └── mobile-nav.html           ← 移动端导航 HTML 片段
│   │   └── topbar.html               ← 顶部工具栏 HTML 片段
│   └── scripts/
│       └── mobile-nav.js             ← data-nav-open / data-nav-close 事件处理
│
├── customers/                        ← 客户页层
│   ├── index.html                    ← 入口文件（组装 shared + sections + scripts）
│   ├── P0-CONTRACT.md                ← P0 拆分约束清单
│   ├── SPLIT-ARCHITECTURE.md         ← 本文档
│   ├── sections/
│   │   ├── header.html               ← 页面标题 + "添加客户"按钮
│   │   ├── filters.html              ← 数据范围切换 + 搜索 + 筛选下拉 + 重置
│   │   ├── table.html                ← 客户表格（含 bulk action bar + thead + tbody 模板）
│   │   ├── pagination.html           ← 分页控件
│   │   ├── create-modal.html         ← 新建客户弹窗
│   │   └── toast.html                ← Toast 通知组件
│   ├── data/
│   │   └── customer-config.js        ← 表格列定义、筛选项配置、Group label map、storage key
│   └── scripts/
│       ├── customer-page.js          ← 页面初始化、#new hash 入口、renderAllDrafts 入口
│       ├── customer-modal.js         ← 弹窗开关、表单校验、去重提示、创建/取消
│       ├── customer-drafts.js        ← 草稿 CRUD（localStorage）、草稿行渲染、"继续"恢复
│       └── customer-bulk-actions.js  ← 全选/单选联动、批量操作栏、指派/调组 apply
│
├── admin-prototype.html              ← 仪表盘（同样引用 shared/）
└── ...其他页面
```

---

## 3. 模块职责定义

### 3.1 共享层 (`shared/`)

共享层提供跨页面复用的视觉基础和壳子结构，**不包含任何业务逻辑**。

#### `shared/styles/tokens.css`
- `:root` 下的 CSS 自定义属性：颜色、阴影、圆角、字体
- 来源：合并 `admin-prototype.html` 和 `customers/index.html` 中的 `:root` 块
- 以 `admin-prototype.html` 的变量名为基准（`--apple-blue`, `--bg`, `--surface`, `--border` 等）
- 客户页中新增的别名（如 `--primary` → `--apple-blue`）保留为兼容映射

#### `shared/styles/components.css`
- 按钮：`.btn-primary`, `.btn-secondary`, `.btn-pill`
- 标签/徽章：`.chip`, `.badge`, `.badge-gray`, `.badge-blue`
- 卡片：`.apple-card`
- 表格：`.apple-table` 及其 `th`/`td` 规则
- 弹窗：`.modal-backdrop`, `.apple-modal`
- 表单：`.apple-input`, `.apple-label`, `.search-input`
- 图标按钮：`.icon-btn`, `.table-icon-btn`
- 分段控制：`.segmented-control`, `.segment-btn`
- 其他：`.skip-link`, `.link-apple`, `.display-font`, `focus-visible` 全局规则

#### `shared/styles/layout.css`
- `.app-shell` 网格（含 `@media (min-width: 1024px)` 双列布局）
- `.side-nav`, `.side-nav-inner`, `.brand`, `.brand-title`
- `.nav-group-title`, `.nav-item`（含 hover / `aria-current` 态）
- `.topbar`, `.topbar-inner`, `.search`
- `.mobile-nav`, `.mobile-nav-backdrop`, `.mobile-nav-panel`（含 `body[data-nav-open]` 切换）
- `prefers-reduced-motion` 全局降级

#### `shared/shell/*.html`
- 纯 HTML 片段，不包含 `<style>` 或 `<script>`
- 导航项列表在此定义一次，每个页面引用同一份
- 当前页高亮通过入口文件中设置 `aria-current="page"` 实现

#### `shared/scripts/mobile-nav.js`
- 监听 `[data-nav-open]` / `[data-nav-close]` 点击事件
- 切换 `document.body.setAttribute('data-nav-open', ...)`
- 监听 `Escape` 键关闭导航
- 无外部依赖，无业务逻辑

---

### 3.2 客户页层 (`customers/`)

客户页层只关注客户列表页的 UI 区块和业务行为。

#### `customers/index.html` — 入口组装文件

职责：
1. 声明 `<!DOCTYPE html>`、`<head>`（meta、title、tailwindcss CDN、font import）
2. 引入共享样式：`<link>` 到 `shared/styles/tokens.css`, `components.css`, `layout.css`
3. 引入客户页专有样式（如有）
4. 组装 HTML 结构：`app-shell` > `side-nav` + `main`
5. 在 `<main>` 内按顺序插入 `sections/*.html` 片段内容
6. 在页尾引入脚本：`shared/scripts/mobile-nav.js` + `customers/scripts/*.js`

> **P0 阶段简化方案**：由于当前原型不使用构建工具，HTML 片段不能用 `<include>` 等机制自动注入。因此实际拆分时，`sections/*.html` 作为"逻辑边界文件"存在——入口文件中用注释标记区块来源即可（如 `<!-- section: filters.html -->`）。脚本文件则直接通过 `<script src="...">` 引入。

#### `customers/sections/*.html` — 页面区块

| 文件 | 内容 | 对应 P0 契约 |
|------|------|-------------|
| `header.html` | 页面标题 `<h1>客户</h1>` + 副标题 + "添加客户"按钮 | — |
| `filters.html` | segmented control + 搜索框 + 3 个筛选 select + 重置按钮 | §2 筛选 |
| `table.html` | `bulkActionBar` + `<table>` 结构（thead 7 列 + checkbox 列 + 操作列） | §1 字段, §3 批量 |
| `pagination.html` | 分页信息 + 上/下一页按钮 | — |
| `create-modal.html` | `modal-backdrop` + `apple-modal` + 11 个表单字段 + `dedupeHint` | §4 弹窗 |
| `toast.html` | `#toast` 组件 | §6 Demo 能力 |

#### `customers/data/customer-config.js` — 声明式配置

将以下隐式耦合提取为显式配置对象：

```js
export const STORAGE_KEY = 'gyosei_os_customer_drafts_v1';

export const GROUP_LABEL_MAP = {
  'tokyo-1': '東京一組',
  'tokyo-2': '東京二組',
  osaka: '大阪組',
};

export const TABLE_COLUMNS = [
  { id: 'select', type: 'checkbox', width: '44px' },
  { id: 'customer', label: '客户', showAlways: true },
  { id: 'kana', label: 'フリガナ', responsive: 'md' },
  { id: 'activeCases', label: '活跃案件', width: '80px', align: 'center' },
  { id: 'lastContact', label: '最近联系', responsive: 'md', width: '120px' },
  { id: 'owner', label: '负责人', responsive: 'md', width: '100px' },
  { id: 'referrer', label: '介绍人/来源', responsive: 'lg', width: '110px' },
  { id: 'group', label: '所属分组', responsive: 'lg', width: '100px' },
  { id: 'actions', label: '操作', align: 'right', width: '60px' },
];

export const FILTER_OPTIONS = {
  group: [
    { value: '', label: '所属分组：全部' },
    { value: 'tokyo-1', label: '东京一组' },
    { value: 'tokyo-2', label: '东京二组' },
    { value: 'osaka', label: '大阪组' },
  ],
  owner: [
    { value: '', label: '负责人：全部' },
    { value: 'admin', label: 'Admin' },
    { value: 'tom', label: 'Tom' },
    { value: 'assistant-a', label: '助理 A' },
  ],
  activeCases: [
    { value: '', label: '活跃案件：全部' },
    { value: 'yes', label: '有活跃案件' },
    { value: 'no', label: '无活跃案件' },
  ],
};

export const CREATE_FORM_FIELDS = [
  { id: 'quickDisplayName', label: '识别名（对内显示）', type: 'text', required: false },
  { id: 'quickGroup', label: '所属 Group', type: 'select', required: true },
  { id: 'quickLegalName', label: '姓名（法定）', type: 'text', required: true },
  { id: 'quickKana', label: '假名（片假名）', type: 'text', required: false },
  { id: 'quickGender', label: '性別', type: 'select', required: false },
  { id: 'quickBirthDate', label: '生年月日', type: 'date', required: false },
  { id: 'quickPhone', label: '电话', type: 'tel', required: 'conditional' },
  { id: 'quickEmail', label: '邮箱', type: 'email', required: 'conditional' },
  { id: 'quickReferrer', label: '来源 / 介绍人', type: 'text', required: false },
  { id: 'quickNote', label: '备注', type: 'text', required: false },
];
```

#### `customers/scripts/*.js` — 行为模块

| 文件 | 职责 | 依赖 |
|------|------|------|
| `customer-page.js` | DOMContentLoaded 入口；检查 `#new` hash → 打开弹窗；调用 `renderAllDrafts()`；注册 segmented control 切换 | modal, drafts |
| `customer-modal.js` | `openModal()` / `closeModal()`；`updateCreateEnabled()`（必填校验）；`updateDedupeHint()`；`handleCreate()`；`serializeState()` / `applyState()` | config (字段 ID), toast |
| `customer-drafts.js` | `getDrafts()` / `setDrafts()` / `upsertDraft()` / `removeDraft()`；`renderDraftRow()` / `renderAllDrafts()`；"继续"按钮事件代理 | config (STORAGE_KEY, GROUP_LABEL_MAP) |
| `customer-bulk-actions.js` | `getSelectableCustomerCheckboxes()`；`updateBulkState()`；`selectAllCustomers` change；`bulkClearBtn` click；`bulkAssignApplyBtn` / `bulkGroupApplyBtn` apply | toast |

跨模块通信使用简单函数导出/导入（ES module）或挂载到约定的命名空间（`window.__customerPage`），避免模块之间直接互引 DOM ID。

---

## 4. 共享层与页面层边界规则

| 规则 | 说明 |
|------|------|
| **共享层不含业务逻辑** | `shared/` 下的文件不出现"客户"、"案件"、"草稿"等业务概念 |
| **页面层不复制壳子** | `customers/index.html` 不再手写导航 HTML，引用 `shared/shell/` |
| **样式单一来源** | `.btn-primary`, `.chip` 等在 `shared/styles/` 定义一次；页面层只补充页面专有样式 |
| **Token 单一来源** | `:root` CSS 变量在 `shared/styles/tokens.css` 定义一次；页面层不重新声明 |
| **脚本按能力拆** | 每个 `.js` 文件对应一个独立能力（modal / drafts / bulk-actions / page-init） |
| **配置集中声明** | 字段 ID、storage key、group label map 在 `data/customer-config.js` 集中管理 |
| **data-* 钩子优先** | 尽量用 `data-action="xxx"` 属性 + 事件代理，减少 `onclick` 内联处理器 |
| **section 注释边界** | 入口 HTML 中用 `<!-- section: xxx.html -->` 注释标记区块起止 |

---

## 5. 拆分步骤（推荐执行顺序）

### Step 1：抽取共享样式
1. 对比 `admin-prototype.html` 和 `customers/index.html` 的 `<style>` 块
2. 创建 `shared/styles/tokens.css`，合并 `:root` 变量
3. 创建 `shared/styles/components.css`，合并公共组件样式
4. 创建 `shared/styles/layout.css`，合并壳子布局样式
5. 两个页面的 `<style>` 替换为 `<link>` 引用
6. **视觉回归**：两个页面外观不变

### Step 2：抽取共享 Shell HTML
1. 从 `customers/index.html` 提取 `side-nav`、`mobile-nav`、`topbar` 为 `shared/shell/*.html`
2. 入口文件中用注释标记引用位置
3. 提取 mobile-nav 脚本为 `shared/scripts/mobile-nav.js`
4. **视觉回归**：导航和顶部栏功能不变

### Step 3：拆分客户页区块
1. 在 `customers/index.html` 的 `<main>` 中用注释标记 6 个 section 边界
2. 将每个 section 的 HTML 同步到 `sections/*.html`（保持入口文件完整可运行）
3. **视觉回归**：页面内容不变

### Step 4：拆分客户页脚本
1. 创建 `data/customer-config.js`，提取常量和配置
2. 创建 4 个脚本文件，将 `<script>` 中的函数按职责拆分
3. 入口文件 `<script>` 改为 `<script src="...">` 引用
4. **行为回归**：所有交互不变

### Step 5：最终回归
1. 按 [P0-CONTRACT.md §9 回归检查项](./P0-CONTRACT.md#9-回归验收检查项) 逐项验证
2. 运行 `npm run fix` + `npm run guard`

---

## 6. 从原型 Section 到生产组件的映射表（前瞻）

此映射不在 P0 拆分范围内执行，仅作为后续迁移的参考。

**完整映射文档见 → [MIGRATION-MAPPING.md](./MIGRATION-MAPPING.md)**

以下为速查摘要，遵循仓库 `domain → data → features/{model,ui} → shared/ui` 四层架构：

| 原型 Section | 生产组件 | 层级 |
|-------------|---------|------|
| `sections/header.html` | `CustomerListHeader` | features/customer/ui |
| `sections/filters.html` | `CustomerListFilters` | features/customer/ui |
| `sections/table.html` | `CustomerTable` + `CustomerBulkActionBar` | features/customer/ui |
| `sections/pagination.html` | `Pagination` | shared/ui |
| `sections/create-modal.html` | `CreateCustomerModal` | features/customer/ui |
| `sections/toast.html` | `Toast` | shared/ui |
| `scripts/customer-page.js` | `useCustomerListViewModel` | features/customer/model |
| `scripts/customer-modal.js` | `useCreateCustomerModal` | features/customer/model |
| `scripts/customer-drafts.js` | `useCustomerDrafts` | features/customer/model |
| `scripts/customer-bulk-actions.js` | `useCustomerBulkActions` | features/customer/model |
| `data/customer-config.js` | `Customer.ts` + `customerConstants.ts` | domain/customer |
| — | `CustomerRepository.ts` + `CustomerDraftRepository.ts` | domain/customer |
| — | `CustomerApi.ts` + `createCustomerRepository.ts` | data/customer |
| `shared/styles/tokens.css` | Design tokens → Tamagui theme / CSS 变量 | infra |
| `shared/shell/*.html` | `AppShell` + `SideNav` + `TopBar` + `MobileNav` | shared/ui |
| `shared/scripts/mobile-nav.js` | `useMobileNav` | shared/hooks |
| `shared/scripts/navigate.js` | React Navigation（不需要独立 Hook） | — |
