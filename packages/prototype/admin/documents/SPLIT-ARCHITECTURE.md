# 资料中心页原型拆分架构说明

> 本文档定义资料中心页拆分的目标目录结构、模块职责、共享层与页面层的边界，作为 AI 与开发人员的共同入口文档。
>
> P0 约束清单见 [P0-CONTRACT.md](./P0-CONTRACT.md)
>
> 现有原型盘点见 [INVENTORY.md](./INVENTORY.md)

---

## 1. 当前问题

### 1.1 次级入口：documents.html

`documents.html` 是一个 ~1287 行的单文件，混合了：

| 关注点 | 行数范围（约） | 问题 |
|--------|-------------|------|
| 设计 Token（CSS 变量） | 11–34 | 与 `shared/styles/tokens.css` 重复定义 |
| 壳层布局样式 | 36–210 | 与 `shared/styles/shell.css` 重复 |
| 公共组件样式 | 210–400 | `.btn-primary`, `.chip`, `.apple-card`, `.apple-table`, `.segmented-control` 等内联复制；`.btn-primary` 重复定义两次 |
| App Shell + 导航 HTML | 656–828 | 移动端 + 桌面端导航各写一份，与其他页面重复 |
| 顶部栏 HTML | 831–854 | 与其他页面重复 |
| 资料中心专有样式 | 400–651 | `.icon-doc/pdf/img/folder`, `.sidebar`, `.grid-view`, `.view-toggle`, `.drop-zone` |
| 页面区块 HTML（header/sidebar/list/grid/modal） | 856–1210 | 区块之间无边界 |
| 业务脚本 | 1212–1282 | 仅包含视图切换和上传弹窗开关 + 移动端导航 |

### 1.2 主入口：案件详情资料清单 Tab

案件详情 `case/detail.html` 的 `#tab-documents` 区块（L1107–L1222）包含：

| 关注点 | 说明 |
|--------|------|
| 资料清单 header | 标题 + 进度条 + 完成数 + 按钮 |
| 按提供方分组的资料项列表 | 4 个分组，静态 HTML |
| 数据驱动渲染 | `case-detail-page.js` 的 `applyDocumentItems()` |
| 配置 | `case-detail-config.js` 的 `DETAIL_SAMPLES[].documents` |

### 1.3 规格差距汇总

相比 [P0-CONTRACT.md](./P0-CONTRACT.md) 的要求，两个入口缺失大量能力：

| 缺失能力 | 影响入口 | 说明 |
|----------|---------|------|
| 4 个列表列（提供方/截止日/催办时间/relative_path） | 次级 | 列结构需重建 |
| 2 个筛选器（状态/提供方）+ 重置 | 次级 | 仅有案件类型下拉 |
| 批量操作栏 | 次级 | 完全缺失 |
| 摘要卡（4 张） | 次级 | 完全缺失 |
| 登记资料弹窗（relative_path 录入） | 两者 | 旧上传弹窗需替换 |
| 审核通过/退回补正动作 | 两者 | 完全缺失 |
| 引用既有版本弹窗 | 主 | 完全缺失 |
| 附件版本列表 | 主 | 仅 meta 文本 |
| 引用来源标记 | 主 | 完全缺失 |
| 审核记录展示 | 主 | 完全缺失 |
| 催办记录时间线 | 主 | 完全缺失 |
| Toast 通知 | 两者 | 完全缺失 |
| waived 原因弹窗（枚举 + 文本） | 两者 | 主入口仅有简单 toast |
| navigate.js 全局搜索 | 次级 | 未引入 |

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
├── documents/                           ← 资料中心页层
│   ├── index.html                       ← 次级入口（跨案件资料中心列表页）
│   ├── P0-CONTRACT.md                   ← P0 约束清单
│   ├── SPLIT-ARCHITECTURE.md            ← 本文档
│   ├── INVENTORY.md                     ← 迁移源盘点（已完成）
│   ├── MIGRATION-MAPPING.md             ← 原型→生产迁移映射
│   ├── REGRESSION-GATE.md               ← 场景维度回归验收门槛
│   ├── split-manifest.json              ← 机器可读拆分清单
│   ├── sections/
│   │   ├── page-header.html             ← 页面标题 + "登记资料"按钮
│   │   ├── summary-cards.html           ← 待审核/缺件/已过期/共享版本风险 4 张摘要卡
│   │   ├── filters-toolbar.html         ← 状态/所属案件/提供方 筛选 + 搜索 + 重置
│   │   ├── documents-table.html         ← 资料列表（含批量操作栏 + thead 7 列 + checkbox 列）
│   │   ├── register-document-modal.html ← 登记资料（本地归档）弹窗（5 字段 + relative_path 校验）
│   │   ├── review-actions-panel.html    ← 审核通过确认 + 退回补正弹窗（原因必填）
│   │   ├── waive-modal.html             ← 标记无需提供弹窗（原因码 select + 文本）
│   │   ├── reference-version-modal.html ← 引用既有版本弹窗（候选列表）
│   │   └── toast.html                   ← Toast 通知组件
│   ├── data/
│   │   ├── documents-config.js          ← 状态枚举、列定义、筛选配置、waived 原因、提供方枚举
│   │   └── documents-demo-data.js       ← 资料列表行、版本记录、审核记录、催办记录示例
│   └── scripts/
│       ├── documents-page.js            ← 页面初始化、toast 编排、排序
│       ├── documents-filters.js         ← 搜索/筛选/重置
│       ├── documents-bulk-actions.js    ← 批量催办/审核/waived
│       ├── documents-register-modal.js  ← 登记资料弹窗、relative_path 校验
│       └── documents-review.js          ← 审核通过/退回/waived/引用操作
│
├── case/                                ← 案件模块（已存在，本次仅扩展）
│   ├── detail.html                      ← 案件详情（资料清单 Tab 区块需扩展）
│   ├── sections/
│   │   └── detail-documents.html        ← 资料清单 section 边界文件（已存在）
│   ├── data/
│   │   └── case-detail-config.js        ← DETAIL_SAMPLES 中 documents 数据需扩展
│   └── scripts/
│       └── case-detail-page.js          ← applyDocumentItems() 需扩展
│
├── documents.html                       ← 旧页面（迁移源 + 回归对照，保留不删）
└── ...其他页面
```

---

## 3. 双入口分工说明

资料中心功能横跨两个页面，各自承担不同职责：

| 维度 | 次级入口（`documents/index.html`） | 主入口（`case/detail.html` 资料清单 Tab） |
|------|----------------------------------|-----------------------------------------|
| **定位** | 跨案件资料视图，快速定位缺件/待审核/过期 | 案件内资料清单管理，承载主要操作 |
| **展示方式** | 扁平列表（7 列），不分组 | 按提供方分组列表（4 组） |
| **操作范围** | 批量催办、批量审核、批量 waived | 逐项审核、登记、引用、waived、催办 |
| **数据源** | 跨案件汇总 demo 数据（`documents-demo-data.js`） | 案件维度 demo 数据（`case-detail-config.js`） |
| **共享配置** | `documents-config.js`（状态枚举、waived 原因等） | `documents-config.js`（可复用相同枚举） |

### 3.1 跨模块数据共享策略

| 共享内容 | 权威来源 | 消费方 |
|----------|---------|--------|
| 状态枚举（6 种） | `documents/data/documents-config.js` | documents/index.html + case/detail.html |
| 提供方枚举（4 种） | `documents/data/documents-config.js` | documents/index.html + case/detail.html |
| Waived 原因码（5 种） | `documents/data/documents-config.js` | documents/ waive-modal + case/ waive 操作 |
| Toast 预设文案（11 种） | `documents/data/documents-config.js` | documents/ toast + case/ toast |

**P0 阶段策略**：`case/detail.html` 通过 `<script src="../documents/data/documents-config.js">` 引入共享配置。案件详情的 documents 数据样本仍保留在 `case-detail-config.js` 中（案件维度，含更多案件上下文字段）。

---

## 4. 迁移源角色说明

旧页面 `packages/prototype/admin/documents.html` 在此次拆分中扮演以下角色：

| 角色 | 说明 |
|------|------|
| **迁移源** | 新模块的壳层结构、部分样式从此文件提取 |
| **回归对照** | 拆分期间保留原文件，便于人工 diff 确认无遗漏 |
| **不立即删除** | 第一阶段拆分完成后，旧文件保留；待新模块通过全量回归后再决定是否归档 |

### 旧页面已知链接引用

其他页面的侧边导航中引用了 `documents.html`（非子目录路径）。拆分本轮仅记录这些引用，不在资料模块内修复外部导航链接。当所有页面迁移到子目录模式后统一更新。

| 引用方 | 引用路径 | 备注 |
|--------|---------|------|
| `shared/shell/side-nav.html` | `documents.html` | 共享导航片段 |
| `shared/shell/mobile-nav.html` | `documents.html` | 共享移动端导航 |
| `admin-prototype.html` | `documents.html` | 仪表盘导航 |
| `dashboard/index.html` | `../documents.html` | 子目录导航 |
| `customers/index.html` | `../documents.html` | 子目录导航 |
| `case/detail.html` | `../documents.html` | 资料清单 Tab "登记资料"按钮 |
| `tasks/index.html` | `../documents.html` | 子目录导航 |
| `billing/index.html` | `../documents.html` | 子目录导航 |
| 其他未迁移的 `.html` 页面 | `documents.html` | 同级导航 |

完整入站链接清单见 [INVENTORY.md §8](./INVENTORY.md#8-入站链接审计其他页面--documentshtml)。

新模块 `documents/index.html` 内部导航将使用 `index.html`（自引用）并设置 `aria-current="page"`。

---

## 5. 模块职责定义

### 5.1 共享层复用 (`shared/`)

资料模块复用已有共享层，**不新增共享文件**。

#### 5.1.1 CSS 链接路径

`documents/index.html` 位于 `packages/prototype/admin/documents/` 子目录，所有共享样式通过 `../shared/styles/` 相对路径引入：

```html
<link rel="stylesheet" href="../shared/styles/tokens.css" />
<link rel="stylesheet" href="../shared/styles/shell.css" />
<link rel="stylesheet" href="../shared/styles/components.css" />
```

| 共享样式 | 相对路径（从 `documents/index.html`） | 提供的能力 |
|----------|--------------------------------------|-----------|
| `tokens.css` | `../shared/styles/tokens.css` | `:root` CSS 变量（颜色、阴影、圆角、字体）、`body` 排版、`.display-font`、`prefers-reduced-motion` |
| `shell.css` | `../shared/styles/shell.css` | `.app-shell` 网格、`.side-nav` + `.nav-item`（含 hover 和 `aria-current` 态）、`.topbar`、`.mobile-nav`、`.skip-link`、`focus-visible` |
| `components.css` | `../shared/styles/components.css` | `.btn-primary`、`.btn-secondary`、`.btn-pill`、`.chip`、`.icon-btn`、`.apple-card`、`.apple-table`、`.modal-backdrop`、`.apple-modal`、`.apple-input`、`.segmented-control`、`.search`、`.status-badge`、`.progress-track` / `.progress-fill` |

#### 5.1.2 Shell HTML 片段复用

导航 HTML 从 `shared/shell/` 三个规范片段复制到 `documents/index.html` 中，以注释标记来源。由于 `documents/index.html` 在子目录内，需要对所有 admin 根级路径加 `../` 前缀。

| 规范片段 | 注释标记 | 路径调整规则 |
|----------|---------|-------------|
| `shared/shell/mobile-nav.html` | `<!-- shell: mobile-nav.html (paths adjusted for documents/ subdirectory) -->` | 所有 admin 根级 `href` 加 `../`；自身 `href` 改为 `index.html`；加 `aria-current="page"` |
| `shared/shell/side-nav.html` | `<!-- shell: side-nav.html (paths adjusted for documents/ subdirectory) -->` | 同上 |
| `shared/shell/topbar.html` | `<!-- shell: topbar.html (paths adjusted for documents/ subdirectory) -->` | `case/create.html` → `../case/create.html`；`leads-messages.html` → `../leads-messages.html` |

导航链接路径调整对照（canonical → `documents/index.html`）：

| 导航项 | 规范路径（admin 根级） | 调整后路径（documents/ 子目录） |
|--------|----------------------|-----------------------------|
| 仪表盘 | `admin-prototype.html` | `../admin-prototype.html` |
| 咨询与会话 | `leads-messages.html` | `../leads-messages.html` |
| 客户 | `customers/index.html` | `../customers/index.html` |
| 案件 | `cases-list.html` | `../cases-list.html` |
| 任务与提醒 | `tasks.html` | `../tasks.html` |
| **资料中心** | `documents.html` | **`index.html`**（自引用）+ **`aria-current="page"`** |
| 文书中心 | `forms.html` | `../forms.html` |
| 收费与财务 | `billing/index.html` | `../billing/index.html` |
| 报表 | `reports.html` | `../reports.html` |
| 设置 | `settings.html` | `../settings.html` |
| 客户门户 | `../src/index.html` | `../../src/index.html` |

#### 5.1.3 `aria-current` 规则

`shared/styles/shell.css` 定义了 `.nav-item[aria-current="page"]` 样式规则：

```css
.nav-item[aria-current="page"] {
  background: rgba(3, 105, 161, 0.1);
  color: var(--text);
}
```

在 `documents/index.html` 中，**「资料中心」导航项**必须在以下两处同时添加 `aria-current="page"`：

1. **移动端导航**（`mobile-nav` 内 `<nav>` 中）：
   ```html
   <a class="nav-item" href="index.html" aria-current="page">...资料中心</a>
   ```
2. **桌面侧边导航**（`side-nav` 内 `<nav>` 中）：
   ```html
   <a class="nav-item" href="index.html" aria-current="page">...资料中心</a>
   ```

规则要点：
- 属性值固定为 `"page"`，表示当前页面
- 仅在资料中心的 `index.html` 中标注资料中心导航项；其他导航项不标注
- 与 `customers/index.html`、`tasks/index.html`、`billing/index.html` 对同名导航项的处理方式一致
- `href` 从规范片段的 `documents.html` 改为 `index.html`（子目录自引用）

#### 5.1.4 脚本链接路径

页面尾部按以下顺序引入共享脚本和模块脚本：

```html
<!-- 共享脚本 -->
<script src="../shared/scripts/mobile-nav.js"></script>
<script src="../shared/scripts/navigate.js"></script>
<!-- 模块配置 + 数据 -->
<script src="data/documents-config.js"></script>
<script src="data/documents-demo-data.js"></script>
<!-- 模块脚本 -->
<script src="scripts/documents-page.js"></script>
<script src="scripts/documents-filters.js"></script>
<script src="scripts/documents-bulk-actions.js"></script>
<script src="scripts/documents-register-modal.js"></script>
<script src="scripts/documents-review.js"></script>
```

| 共享脚本 | 相对路径（从 `documents/index.html`） | 提供的能力 |
|----------|--------------------------------------|-----------|
| `mobile-nav.js` | `../shared/scripts/mobile-nav.js` | `[data-nav-open]` / `[data-nav-close]` 点击 → `body[data-nav-open]` 切换；Escape 键关闭 |
| `navigate.js` | `../shared/scripts/navigate.js` | 全局搜索弹窗（`⌘K` / `Ctrl+K`）、`data-navigate` 路由、topbar 搜索聚焦 |

#### 5.1.5 资料中心专有样式

资料中心专有样式如果已纳入 `components.css` 则复用，否则作为资料页内联样式保留在 `index.html` 的 `<style>` 块中：

| 样式 | 处理方式 |
|------|---------|
| `.icon-doc/pdf/img/folder` | 保留在 `index.html` 内联（文件类型着色，模块专有） |
| 逾期行红色高亮 `bg-[rgba(220,38,38,0.04)]` | 通过 Tailwind 内联实现，保留在 section |
| waived 行删除线 `line-through` + `text-[var(--muted)]` | 通过 Tailwind 内联实现，保留在 section |
| `relative_path` 等宽字体 `font-mono text-[12px]` | 通过 Tailwind 内联实现，保留在 section |

**P1 泄漏项已移除的样式**：

| 移除样式 | 原因 |
|----------|------|
| `.grid-view` / `.grid-item` 家族 | P0 不做网格视图（可选保留为 demo-only） |
| `.view-toggle` | P0 不做视图切换 |
| `.sidebar` / `.sidebar-item` | P0 不做文件夹树导航 |
| `.drop-zone` | P0 不做文件上传 |

### 5.2 资料中心页层 (`documents/`)

资料中心页层只关注跨案件资料列表页的 UI 区块和业务行为。

#### `documents/index.html` — 入口组装文件

职责：
1. 声明 `<!DOCTYPE html>`、`<head>`（meta、title、tailwindcss CDN、font import）
2. 引入共享样式：`<link>` 到 `../shared/styles/tokens.css`, `components.css`, `shell.css`
3. 引入资料中心专有样式（如有）
4. 组装 HTML 结构：`app-shell` > `side-nav` + `main`
5. 在 `<main>` 内按顺序插入 `sections/*.html` 片段内容
6. 在页尾引入脚本：`../shared/scripts/mobile-nav.js` + `documents/scripts/*.js`

> **P0 阶段简化方案**：与客户模块、任务模块、财务模块一致，`sections/*.html` 作为"逻辑边界文件"存在。入口文件中用注释标记区块来源（如 `<!-- section: sections/documents-table.html -->`）。脚本文件直接通过 `<script src="...">` 引入。

#### `documents/sections/*.html` — 页面区块

| 文件 | 内容 | 对应 P0 契约 |
|------|------|-------------|
| `page-header.html` | 页面标题 `<h1>资料中心</h1>` + 副标题 + "登记资料"按钮 | — |
| `summary-cards.html` | 4 张摘要卡（待审核/缺件/已过期/共享版本风险） | §5 摘要卡 |
| `filters-toolbar.html` | 3 个筛选 select（状态/案件/提供方）+ 搜索框 + 重置 | §4 搜索与筛选 |
| `documents-table.html` | `bulkActionBar` + `<table>` 结构（thead 7 列 + checkbox 列）+ 默认排序逻辑 | §2 字段, §3 排序, §8 批量动作 |
| `register-document-modal.html` | `modal-backdrop` + `apple-modal` + 5 个表单字段 + `relative_path` 校验提示 | §7.1 登记资料弹窗 |
| `review-actions-panel.html` | 审核通过确认 + 退回补正弹窗（原因 textarea 必填） | §7.2 审核 |
| `waive-modal.html` | `modal-backdrop` + 原因码 select（5 项）+ 原因文本 textarea + 确认 | §7.3 waived |
| `reference-version-modal.html` | `modal-backdrop` + 候选版本列表（案件号、资料项名、版本号、审核状态、过期日） | §7.4 引用既有版本 |
| `toast.html` | `#toast` 组件 | §11 Toast |

#### `documents/data/documents-config.js` — 声明式配置

将以下隐式耦合提取为显式配置对象：

```js
var DocumentsConfig = (function () {

  var DOCUMENT_STATUS_OPTIONS = [
    { value: 'pending', label: '待提交', badge: 'badge-orange' },
    { value: 'uploaded_reviewing', label: '已提交待审核', badge: 'badge-blue' },
    { value: 'approved', label: '通过', badge: 'badge-green' },
    { value: 'rejected', label: '退回补正', badge: 'badge-red' },
    { value: 'expired', label: '过期', badge: 'badge-red' },
    { value: 'waived', label: '无需提供', badge: 'badge-gray' },
  ];

  var PROVIDER_OPTIONS = [
    { value: 'main_applicant', label: '主申请人' },
    { value: 'guarantor', label: '扶養者/保証人' },
    { value: 'employer', label: '受入机関/企業担当' },
    { value: 'office', label: '事務所内部' },
  ];

  var WAIVE_REASON_OPTIONS = [
    { value: 'guarantor-exempt', label: '保証人免除' },
    { value: 'case-type-not-required', label: '案件类型不要求' },
    { value: 'equivalent-exists', label: '客户已有等价材料' },
    { value: 'officer-judgment', label: '主办人判断无需' },
    { value: 'other', label: '其他', requiresNote: true },
  ];

  var STATUS_TRANSITIONS = {
    pending: ['uploaded_reviewing', 'waived'],
    uploaded_reviewing: ['approved', 'rejected'],
    approved: ['expired'],
    rejected: ['uploaded_reviewing', 'waived'],
    expired: ['uploaded_reviewing', 'waived'],
    waived: ['pending'],
  };

  var TABLE_COLUMNS = [
    { id: 'select', type: 'checkbox', width: '44px' },
    { id: 'docName', label: '资料项名称', showAlways: true },
    { id: 'case', label: '所属案件', responsive: 'md' },
    { id: 'provider', label: '提供方', responsive: 'lg', width: '120px' },
    { id: 'status', label: '状态', width: '110px' },
    { id: 'deadline', label: '截止日', responsive: 'md', width: '120px' },
    { id: 'lastReminder', label: '最近催办', responsive: 'lg', width: '130px' },
    { id: 'relativePath', label: '本地归档路径', responsive: 'lg', width: '200px' },
  ];

  var FILTERS = [
    { id: 'status', label: '状态', options: 'DOCUMENT_STATUS_OPTIONS', defaultValue: '' },
    { id: 'case', label: '所属案件', options: 'CASES', defaultValue: '' },
    { id: 'provider', label: '提供方', options: 'PROVIDER_OPTIONS', defaultValue: '' },
  ];

  var SEARCH_PLACEHOLDER = '搜索：资料名称 / 案件编号 / 案件名称';

  var BULK_ACTIONS = [
    { id: 'bulkRemind', label: '批量催办', type: 'button' },
    { id: 'bulkApprove', label: '批量审核通过', type: 'button' },
    { id: 'bulkWaive', label: '批量标记无需提供', type: 'button-with-reason', reasonOptions: 'WAIVE_REASON_OPTIONS' },
  ];

  var REGISTER_FORM_FIELDS = [
    { id: 'caseId', label: '关联案件', type: 'search-select', required: true },
    { id: 'docItemId', label: '关联资料项', type: 'select', required: true },
    { id: 'relativePath', label: '本地归档路径 (relative_path)', type: 'text', required: true },
    { id: 'fileName', label: '文件名/描述', type: 'text', required: true },
    { id: 'version', label: '版本号', type: 'readonly', note: '系统自动递增' },
  ];

  var REGISTER_REQUIRED_IDS = ['caseId', 'docItemId', 'relativePath', 'fileName'];

  var RELATIVE_PATH_RULES = {
    forbiddenPatterns: ['..', '~'],
    forbiddenLeadingChars: ['~'],
    allowedSeparator: '/',
    suggestedFormat: '{case_no}/{provider}/{doc_item_name}/{yyyymmdd}_{filename}',
    example: 'A2026-001/main_applicant/passport/20260409_passport.pdf',
  };

  var TOAST = {
    register:       { title: '资料已登记（示例）', desc: '已登记 {docName} 到 {caseName}' },
    approve:        { title: '审核已通过（示例）', desc: '{docName} 已标记为审核通过' },
    reject:         { title: '已退回（示例）', desc: '{docName} 已退回，原因已记录' },
    waive:          { title: '已标记无需提供（示例）', desc: '{docName} 已标记为无需提供' },
    remind:         { title: '催办已发送（示例）', desc: '已对 {docName} 发送催办' },
    reference:      { title: '版本已引用（示例）', desc: '已引用 {sourceCase}/{sourceDoc} v{N}' },
    addItem:        { title: '资料项已新增（示例）', desc: '已在 {caseName} 新增资料项' },
    bulkRemind:     { title: '批量催办（示例）', desc: '已对 {n} 项资料发送催办' },
    bulkApprove:    { title: '批量审核（示例）', desc: '已将 {n} 项资料标记为通过' },
    bulkWaive:      { title: '批量标记（示例）', desc: '已将 {n} 项资料标记为无需提供' },
    copyPath:       { title: '已复制（示例）', desc: '路径已复制到剪贴板' },
  };

  var P0_NOT_IN_SCOPE = [
    'full-cross-case-center',
    'reuse-management-ui',
    'advanced-filters',
    'file-upload',
    'file-preview',
    'folder-tree',
    'template-management',
    'grid-view',
    'tag-management',
    'batch-export',
  ];

  return {
    DOCUMENT_STATUS_OPTIONS: DOCUMENT_STATUS_OPTIONS,
    PROVIDER_OPTIONS: PROVIDER_OPTIONS,
    WAIVE_REASON_OPTIONS: WAIVE_REASON_OPTIONS,
    STATUS_TRANSITIONS: STATUS_TRANSITIONS,
    TABLE_COLUMNS: TABLE_COLUMNS,
    FILTERS: FILTERS,
    SEARCH_PLACEHOLDER: SEARCH_PLACEHOLDER,
    BULK_ACTIONS: BULK_ACTIONS,
    REGISTER_FORM_FIELDS: REGISTER_FORM_FIELDS,
    REGISTER_REQUIRED_IDS: REGISTER_REQUIRED_IDS,
    RELATIVE_PATH_RULES: RELATIVE_PATH_RULES,
    TOAST: TOAST,
    P0_NOT_IN_SCOPE: P0_NOT_IN_SCOPE,
  };
})();
```

#### `documents/data/documents-demo-data.js` — 演示数据

```js
var DocumentsDemoData = (function () {

  var DEMO_DOCUMENT_ROWS = [
    {
      id: 'doc-001',
      docName: '护照复印件',
      caseNo: 'CAS-2026-0181',
      caseLabel: 'CAS-2026-0181 高度人才 (Michael T.)',
      provider: 'main_applicant',
      status: 'uploaded_reviewing',
      deadline: '2026-04-15',
      lastReminder: null,
      relativePath: 'A2026-0181/main_applicant/passport/20260408_passport.pdf',
      versions: [
        { version: 2, fileName: 'passport_v2.pdf', registeredAt: '2026-04-08', registeredBy: 'Admin', source: 'self' },
        { version: 1, fileName: 'passport_v1.pdf', registeredAt: '2026-04-01', registeredBy: 'Admin', source: 'self' },
      ],
    },
    {
      id: 'doc-002',
      docName: '在留カード（表裏）',
      caseNo: 'CAS-2026-0181',
      caseLabel: 'CAS-2026-0181 高度人才 (Michael T.)',
      provider: 'main_applicant',
      status: 'approved',
      deadline: '2026-04-10',
      lastReminder: null,
      relativePath: 'A2026-0181/main_applicant/residence_card/20260405_card.pdf',
      versions: [
        { version: 1, fileName: 'residence_card.pdf', registeredAt: '2026-04-05', registeredBy: 'Admin', source: 'self' },
      ],
    },
    {
      id: 'doc-003',
      docName: '課税証明書',
      caseNo: 'CAS-2026-0156',
      caseLabel: 'CAS-2026-0156 家族滞在 (李明)',
      provider: 'main_applicant',
      status: 'expired',
      deadline: '2026-04-03',
      lastReminder: '2026-04-03',
      relativePath: null,
      versions: [],
      isExpired: true,
    },
    {
      id: 'doc-004',
      docName: '履歴書',
      caseNo: 'CAS-2026-0204',
      caseLabel: 'CAS-2026-0204 就労签证 (陈某)',
      provider: 'main_applicant',
      status: 'pending',
      deadline: '2026-04-20',
      lastReminder: '2026-04-05',
      relativePath: null,
      versions: [],
    },
    {
      id: 'doc-005',
      docName: '身元保証書',
      caseNo: 'CAS-2026-0156',
      caseLabel: 'CAS-2026-0156 家族滞在 (李明)',
      provider: 'guarantor',
      status: 'rejected',
      deadline: '2026-04-12',
      lastReminder: '2026-04-06',
      relativePath: 'A2026-0156/guarantor/guarantee/20260404_guarantee.pdf',
      versions: [
        { version: 1, fileName: 'guarantee.pdf', registeredAt: '2026-04-04', registeredBy: 'Suzuki', source: 'self' },
      ],
      rejectionReason: '签名处缺失日期',
    },
    {
      id: 'doc-006',
      docName: '課税証明書（保証人）',
      caseNo: 'CAS-2026-0156',
      caseLabel: 'CAS-2026-0156 家族滞在 (李明)',
      provider: 'guarantor',
      status: 'waived',
      deadline: null,
      lastReminder: null,
      relativePath: null,
      versions: [],
      waiveReason: '保証人免除',
      waivedBy: 'Suzuki',
      waivedAt: '2026-04-03',
    },
  ];

  var DEMO_SUMMARY = {
    reviewing: 1,
    missing: 1,
    expired: 1,
    sharedExpiredRisk: 0,
  };

  var DEMO_REVIEW_RECORDS = [
    { docId: 'doc-002', action: 'approved', actor: 'Admin', timestamp: '2026-04-06T10:00:00', note: '' },
    { docId: 'doc-005', action: 'rejected', actor: 'Suzuki', timestamp: '2026-04-05T14:00:00', note: '签名处缺失日期' },
  ];

  var DEMO_REMINDER_RECORDS = [
    { docId: 'doc-004', sentAt: '2026-04-05T09:00:00', sentBy: 'Admin', method: 'in-app' },
    { docId: 'doc-003', sentAt: '2026-04-03T09:00:00', sentBy: 'Admin', method: 'in-app' },
    { docId: 'doc-005', sentAt: '2026-04-06T10:30:00', sentBy: 'Suzuki', method: 'in-app' },
  ];

  var DEMO_REFERENCE_CANDIDATES = [
    {
      sourceCase: 'CAS-2026-0181',
      sourceDocName: '課税証明書',
      version: 1,
      status: 'approved',
      expiryDate: '2027-03-31',
      registeredAt: '2026-03-15',
    },
  ];

  return {
    DEMO_DOCUMENT_ROWS: DEMO_DOCUMENT_ROWS,
    DEMO_SUMMARY: DEMO_SUMMARY,
    DEMO_REVIEW_RECORDS: DEMO_REVIEW_RECORDS,
    DEMO_REMINDER_RECORDS: DEMO_REMINDER_RECORDS,
    DEMO_REFERENCE_CANDIDATES: DEMO_REFERENCE_CANDIDATES,
  };
})();
```

#### `documents/scripts/*.js` — 行为模块

| 文件 | 职责 | 依赖 |
|------|------|------|
| `documents-page.js` | DOMContentLoaded 入口；toast 编排；默认排序 | config, filters, bulk, register-modal, review |
| `documents-filters.js` | 3 个筛选器联动；搜索 debounce；重置 | config (FILTERS, SEARCH_PLACEHOLDER) |
| `documents-bulk-actions.js` | `getSelectableCheckboxes()`；`updateBulkState()`；全选/单选/清除；批量催办/审核/waived | config (BULK_ACTIONS, WAIVE_REASON_OPTIONS), toast |
| `documents-register-modal.js` | 登记资料弹窗开关；5 字段表单；`relative_path` 校验（禁止 `..`/`~`/空白控制字符） | config (REGISTER_FORM_FIELDS, REGISTER_REQUIRED_IDS, RELATIVE_PATH_RULES) |
| `documents-review.js` | 审核通过/退回补正操作；waive 弹窗；引用版本弹窗；催办操作 | config (WAIVE_REASON_OPTIONS, STATUS_TRANSITIONS) |

跨模块通信使用挂载到约定命名空间（`window.__documentsPage`）的方式，避免模块之间直接互引 DOM ID。

### 5.3 案件详情资料清单 Tab 扩展（`case/` 模块）

案件详情资料清单 Tab 是资料管理的**主入口**。本次拆分需要在案件模块内扩展以下内容：

| 扩展点 | 文件 | 变更内容 |
|--------|------|---------|
| 附件版本列表展开 | `case/detail.html` (#tab-documents) | 每项资料增加展开/折叠，显示版本列表 |
| 引用来源标记 | `case/detail.html` (#tab-documents) | 版本列表中标记"引用自：XXX" |
| 审核记录展示 | `case/detail.html` (#tab-documents) | 每项资料展开区域显示审核记录 |
| 催办记录时间线 | `case/detail.html` (#tab-documents) | 每项资料展开区域显示催办记录 |
| 审核通过/退回动作 | `case/scripts/case-detail-page.js` | 新增 `data-action="approve"` / `data-action="reject"` 事件代理 |
| 引用版本动作 | `case/scripts/case-detail-page.js` | 新增 `data-action="reference"` 事件代理 |
| waived 原因弹窗 | `case/detail.html` | 替换简单 toast 为原因码弹窗（引用 `documents-config.js` 的 WAIVE_REASON_OPTIONS） |
| 登记资料弹窗 | `case/detail.html` | 替换旧"登记资料"按钮的 `data-navigate` 为弹窗 |
| 多案件引用数展示 | `case/detail.html` (#tab-documents) | 版本列表中显示"被 N 个案件引用" |
| 过期影响提示 | `case/detail.html` (#tab-documents) | 被多案引用且过期的版本显示影响范围 |
| demo 数据扩展 | `case/data/case-detail-config.js` | `documents[].items[]` 增加 `versions`、`reviewRecords`、`reminderRecords` 字段 |

> **注意**：案件详情的资料 Tab 扩展与 `documents/` 模块拆分是**并行但独立的**两条工作线。资料模块的 `documents-config.js` 提供共享枚举配置，案件模块通过 `<script src>` 引入。

---

## 6. 共享层与页面层边界规则

| 规则 | 说明 |
|------|------|
| **共享层不含业务逻辑** | `shared/` 下的文件不出现"资料"、"审核"、"催办"等业务概念 |
| **页面层不复制壳子** | `documents/index.html` 不再手写导航 HTML，引用 `shared/shell/` |
| **样式单一来源** | `.btn-primary`, `.chip`, `.apple-table` 等在 `shared/styles/` 定义一次；页面层只补充页面专有样式 |
| **Token 单一来源** | `:root` CSS 变量在 `shared/styles/tokens.css` 定义一次；页面层不重新声明 |
| **脚本按能力拆** | 每个 `.js` 文件对应一个独立能力（page / filters / bulk / register-modal / review） |
| **配置集中声明** | 状态枚举、列定义、筛选配置、表单 schema、waived 原因在 `data/documents-config.js` 集中管理 |
| **演示数据独立** | 示例资料行、版本记录、审核记录在 `data/documents-demo-data.js`，不混入配置 |
| **data-* 钩子优先** | 尽量用 `data-action="xxx"` 属性 + 事件代理，减少 `onclick` 内联处理器 |
| **section 注释边界** | 入口 HTML 中用 `<!-- section: sections/xxx.html -->` 注释标记区块起止 |
| **跨模块配置引用** | 案件模块通过 `<script src>` 引入 `documents-config.js`，不复制枚举 |

---

## 7. 拆分步骤（推荐执行顺序）

### Step 1：搭建入口文件骨架
1. 创建 `documents/index.html`，引入 `shared/styles/*.css`
2. 从 `shared/shell/` 复制导航 HTML（路径调整为 `../`），设置资料中心项 `aria-current="page"`
3. 搭建 `<main>` 骨架，预留 9 个 section 注释边界
4. **视觉回归**：页面壳子正常渲染

### Step 2：迁移现有区块并去除 P1 泄漏
1. 将 `documents.html` 的 page-header 迁移到 `sections/page-header.html`，移除"案件模板生成"按钮（P1）、将"上传文件"按钮替换为"登记资料"
2. 新建 `sections/summary-cards.html`（现有页面缺失，需全新构建——4 张摘要卡）
3. 新建 `sections/filters-toolbar.html`，补齐状态和提供方筛选；segmented control 移除"资料模板"段（P1 泄漏）
4. 将资料列表重构为 `sections/documents-table.html`，从 6 列改为 7 列，移除旧"类型/完成率"列，新增提供方/截止日/催办时间/relative_path 列；添加 checkbox 列和批量操作栏
5. **视觉回归**：7 列完整、摘要卡/筛选/列表区块存在、P1 项已移除、左侧文件夹侧边栏已移除

### Step 3：补齐缺失区块
1. 新建 `sections/register-document-modal.html`（登记资料弹窗，替换旧上传弹窗）
2. 新建 `sections/review-actions-panel.html`（审核通过 + 退回补正）
3. 新建 `sections/waive-modal.html`（waived 原因弹窗）
4. 新建 `sections/reference-version-modal.html`（引用版本弹窗）
5. 新建 `sections/toast.html`
6. **视觉回归**：弹窗/面板/toast 区块存在

### Step 4：提取配置与演示数据
1. 创建 `data/documents-config.js`，提取所有枚举、列定义、筛选配置、表单 schema、waived 原因
2. 创建 `data/documents-demo-data.js`，提取示例资料行、版本记录、审核记录、催办记录、引用候选
3. **视觉回归**：数据不变

### Step 5：拆分脚本
1. 创建 5 个脚本文件，按职责拆分
2. 入口文件 `<script>` 改为 `<script src="...">` 引用
3. **行为回归**：筛选、批量操作、弹窗（登记/审核/waived/引用）、toast、复制路径 全部可用

### Step 6：案件详情资料 Tab 扩展
1. 在 `case/detail.html` 的 `#tab-documents` 区块中增加版本列表展开/折叠结构
2. 补充引用来源标记、审核记录、催办记录展示区域
3. 替换"登记资料"按钮的 `data-navigate` 为弹窗触发
4. 替换简单 waived toast 为原因码弹窗
5. 新增审核通过/退回/引用版本的行内动作按钮
6. 扩展 `case-detail-config.js` 的 demo 数据
7. 扩展 `case-detail-page.js` 的渲染逻辑
8. **视觉回归**：版本列表、审核记录、催办时间线可见；弹窗交互可用

### Step 7：最终回归
1. 按 [P0-CONTRACT.md 拆分回归清单](./P0-CONTRACT.md#拆分回归清单) 逐项验证
2. 运行 `npm run fix` + `npm run guard`

---

## 8. 从原型 Section 到生产组件的映射表（前瞻）

此映射不在 P0 拆分范围内执行，仅作为后续迁移的参考。

**完整映射文档见 → [MIGRATION-MAPPING.md](./MIGRATION-MAPPING.md)**

以下为速查摘要，遵循仓库 `domain → data → features/{model,ui} → shared/ui` 四层架构：

| 原型 Section | 生产组件 | 层级 |
|-------------|---------|------|
| `sections/page-header.html` | `DocumentListHeader` | features/document/ui |
| `sections/summary-cards.html` | `DocumentSummaryCards` | features/document/ui |
| `sections/filters-toolbar.html` | `DocumentListFilters` | features/document/ui |
| `sections/documents-table.html` | `DocumentTable` + `DocumentBulkActionBar` | features/document/ui |
| `sections/register-document-modal.html` | `RegisterDocumentModal` | features/document/ui |
| `sections/review-actions-panel.html` | `ReviewActionsPanel` | features/document/ui |
| `sections/waive-modal.html` | `WaiveReasonModal` | features/document/ui |
| `sections/reference-version-modal.html` | `ReferenceVersionModal` | features/document/ui |
| `sections/toast.html` | `Toast` | shared/ui |
| `scripts/documents-page.js` | `useDocumentListViewModel` | features/document/model |
| `scripts/documents-filters.js` | `useDocumentFilters` | features/document/model |
| `scripts/documents-bulk-actions.js` | `useDocumentBulkActions` | features/document/model |
| `scripts/documents-register-modal.js` | `useRegisterDocumentModal` | features/document/model |
| `scripts/documents-review.js` | `useDocumentReview` | features/document/model |
| `data/documents-config.js` | `DocumentItem.ts` + `documentConstants.ts` | domain/document |
| `data/documents-demo-data.js` | — (demo-only, 不迁移) | — |
| `case/sections/detail-documents.html` (扩展) | `CaseDetailDocuments` | features/case/ui |
| `case/scripts/case-detail-page.js` (扩展) | `useCaseDetailViewModel` | features/case/model |
