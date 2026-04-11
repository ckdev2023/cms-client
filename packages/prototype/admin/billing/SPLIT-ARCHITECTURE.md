# 收费与财务页原型拆分架构说明

> 本文档定义收费与财务页拆分的目标目录结构、模块职责、共享层与页面层的边界，作为 AI 与开发人员的共同入口文档。
>
> P0 约束清单见 [P0-CONTRACT.md](./P0-CONTRACT.md)

---

## 1. 当前问题

`billing.html` 是一个 ~803 行的单文件，混合了：

| 关注点 | 行数范围（约） | 问题 |
|--------|-------------|------|
| 设计 Token（CSS 变量） | 11–26 | 与 `shared/styles/tokens.css` 重复定义 |
| 壳层布局样式 | 52–159, 340–375 | 与 `shared/styles/shell.css` 重复 |
| 公共组件样式 | 161–338 | `.btn-primary`, `.chip`, `.apple-card`, `.apple-table`, `.segmented-control` 等内联复制 |
| App Shell + 导航 HTML | 381–553 | 移动端 + 桌面端导航各写一份，与其他页面重复 |
| 顶部栏 HTML | 555–583 | 与其他页面重复 |
| 财务页专有样式 | 45–50, 287–317 | `.text-hero`, `.tag` 家族 |
| 页面区块 HTML（header/cards/table） | 585–774 | 区块之间无边界 |
| 业务脚本 | 780–801 | 仅包含移动端导航，无财务业务脚本 |

### 规格差距

相比 [P0-CONTRACT.md](./P0-CONTRACT.md) 的要求，现有页面缺失大量能力：

| 缺失能力 | 说明 |
|----------|------|
| 1 个列表列 | 缺少「所属 Group」 |
| 2 个筛选器 | 缺少 Group、负责人筛选 |
| 分段视图切换 | segmented control 有但无 JS；含 P1 泄漏"发票管理" |
| 批量催款操作 | 无 checkbox、无操作栏、无三段式结果 |
| 登记回款弹窗 | "登记回款"按钮有但无弹窗 |
| 回款流水列表 | segmented 第 2 段无对应内容 |
| 收费计划面板 | 无 |
| 欠款风险确认面板 | 无 |
| Toast | 无 |

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
├── billing/                             ← 收费与财务页层
│   ├── index.html                       ← 入口文件（组装 shared + sections + scripts）
│   ├── P0-CONTRACT.md                   ← P0 约束清单
│   ├── SPLIT-ARCHITECTURE.md            ← 本文档
│   ├── MIGRATION-MAPPING.md             ← 原型→生产迁移映射
│   ├── INVENTORY.md                     ← 迁移源盘点（已完成）
│   ├── split-manifest.json              ← 机器可读拆分清单
│   ├── sections/
│   │   ├── page-header.html             ← 页面标题 + "登记回款"按钮
│   │   ├── summary-cards.html           ← 应收/已收/未收/逾期 4 张摘要卡
│   │   ├── filters-toolbar.html         ← 回款状态/Group/负责人 筛选 + 搜索 + 重置
│   │   ├── billing-table.html           ← 案件收费列表（含批量操作栏 + 8 列 + checkbox 列）
│   │   ├── payment-log-table.html       ← 回款流水列表（日期、案件、金额、节点、状态、备注）
│   │   ├── billing-plan-panel.html      ← 收费计划/下一节点摘要（案件维度展开面板）
│   │   ├── payment-modal.html           ← 登记回款弹窗（5 字段 + BillingPlan 归集）
│   │   ├── risk-ack-panel.html          ← 欠款风险确认留痕摘要
│   │   └── collection-result-toast.html ← Toast 通知 + 批量催款三段式结果
│   ├── data/
│   │   ├── billing-config.js            ← 状态枚举、列定义、筛选配置、批量动作、表单字段、toast preset
│   │   └── billing-demo-data.js         ← 案件收费行、回款流水、催款结果、风险确认示例
│   └── scripts/
│       ├── billing-page.js              ← 页面初始化、分段视图切换、入口联动、toast 编排
│       ├── billing-filters.js           ← 搜索/筛选/排序/重置
│       ├── billing-bulk-actions.js      ← 批量催款、结果统计、跳过原因提示
│       ├── billing-payment-modal.js     ← 回款登记、BillingPlan 归集、金额提示、凭证补传
│       └── billing-risk-log.js          ← 欠款风险确认展示
│
├── billing.html                         ← 旧页面（迁移源 + 回归对照，保留不删）
└── ...其他页面
```

---

## 3. 迁移源角色说明

旧页面 `packages/prototype/admin/billing.html` 在此次拆分中扮演以下角色：

| 角色 | 说明 |
|------|------|
| **迁移源** | 新模块的 HTML 结构、样式、交互从此文件提取 |
| **回归对照** | 拆分期间保留原文件，便于人工 diff 确认无遗漏 |
| **不立即删除** | 第一阶段拆分完成后，旧文件保留；待新模块通过全量回归后再决定是否归档 |

### 旧页面已知链接引用

其他页面的侧边导航中引用了 `billing.html`（非子目录路径）。拆分本轮仅记录这些引用，不在财务模块内修复外部导航链接。当所有页面迁移到子目录模式后统一更新。

| 引用方 | 引用路径 | 备注 |
|--------|---------|------|
| `shared/shell/side-nav.html` | `billing.html` | 共享导航片段 |
| `shared/shell/mobile-nav.html` | `billing.html` | 共享移动端导航 |
| `admin-prototype.html` | `billing.html` | 仪表盘导航 + 内容区"进入财务"链接 |
| `dashboard/index.html` | `../billing.html` | 子目录导航 |
| `customers/index.html` | `../billing.html` | 子目录导航 |
| `customers/detail.html` | `../billing.html` | 子目录导航 |
| `tasks/index.html` | `../billing.html` | 子目录导航 |
| 其他未迁移的 `.html` 页面 | `billing.html` | 同级导航 |

完整入站链接清单见 [INVENTORY.md §8](./INVENTORY.md#8-入站链接审计其他页面--billinghtml)。
兼容策略决策记录见 [INVENTORY.md §12](./INVENTORY.md#12-旧入口兼容策略决策记录)。

新模块 `billing/index.html` 内部导航将使用 `index.html`（自引用）并设置 `aria-current="page"`。

---

## 4. 模块职责定义

### 4.1 共享层复用 (`shared/`)

财务模块复用已有共享层，**不新增共享文件**。

#### 4.1.1 CSS 链接路径

`billing/index.html` 位于 `packages/prototype/admin/billing/` 子目录，所有共享样式通过 `../shared/styles/` 相对路径引入：

```html
<link rel="stylesheet" href="../shared/styles/tokens.css" />
<link rel="stylesheet" href="../shared/styles/shell.css" />
<link rel="stylesheet" href="../shared/styles/components.css" />
```

| 共享样式 | 相对路径（从 `billing/index.html`） | 提供的能力 |
|----------|----------------------------------|-----------|
| `tokens.css` | `../shared/styles/tokens.css` | `:root` CSS 变量（颜色、阴影、圆角、字体）、`body` 排版、`.display-font`、`prefers-reduced-motion` |
| `shell.css` | `../shared/styles/shell.css` | `.app-shell` 网格、`.side-nav` + `.nav-item`（含 hover 和 `aria-current` 态）、`.topbar`、`.mobile-nav`、`.skip-link`、`focus-visible` |
| `components.css` | `../shared/styles/components.css` | `.btn-primary`、`.btn-secondary`、`.btn-pill`、`.chip`、`.icon-btn`、`.apple-card`、`.apple-table`、`.modal-backdrop`、`.apple-modal`、`.apple-input`、`.segmented-control`、`.search` |

#### 4.1.2 Shell HTML 片段复用

导航 HTML 从 `shared/shell/` 三个规范片段复制到 `billing/index.html` 中，以注释标记来源。由于 `billing/index.html` 在子目录内，需要对所有 admin 根级路径加 `../` 前缀。

| 规范片段 | 注释标记 | 路径调整规则 |
|----------|---------|-------------|
| `shared/shell/mobile-nav.html` | `<!-- shell: mobile-nav.html (paths adjusted for billing/ subdirectory) -->` | 所有 admin 根级 `href` 加 `../`；自身 `href` 改为 `index.html`；加 `aria-current="page"` |
| `shared/shell/side-nav.html` | `<!-- shell: side-nav.html (paths adjusted for billing/ subdirectory) -->` | 同上 |
| `shared/shell/topbar.html` | `<!-- shell: topbar.html (paths adjusted for billing/ subdirectory) -->` | `case/create.html` → `../case/create.html`；`leads-messages.html` → `../leads-messages.html` |

导航链接路径调整对照（canonical → `billing/index.html`）：

| 导航项 | 规范路径（admin 根级） | 调整后路径（billing/ 子目录） |
|--------|----------------------|--------------------------|
| 仪表盘 | `admin-prototype.html` | `../admin-prototype.html` |
| 咨询与会话 | `leads-messages.html` | `../leads-messages.html` |
| 客户 | `customers/index.html` | `../customers/index.html` |
| 案件 | `cases-list.html` | `../cases-list.html` |
| 任务与提醒 | `tasks.html` | `../tasks.html` |
| 资料中心 | `documents.html` | `../documents.html` |
| 文书中心 | `forms.html` | `../forms.html` |
| **收费与财务** | `billing.html` | **`index.html`**（自引用）+ **`aria-current="page"`** |
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

在 `billing/index.html` 中，**「收费与财务」导航项**必须在以下两处同时添加 `aria-current="page"`：

1. **移动端导航**（`mobile-nav` 内 `<nav>` 中）：
   ```html
   <a class="nav-item" href="index.html" aria-current="page">...收费与财务</a>
   ```
2. **桌面侧边导航**（`side-nav` 内 `<nav>` 中）：
   ```html
   <a class="nav-item" href="index.html" aria-current="page">...收费与财务</a>
   ```

规则要点：
- 属性值固定为 `"page"`，表示当前页面
- 仅在财务页的 `index.html` 中标注财务导航项；其他导航项不标注
- 与 `customers/index.html`、`tasks/index.html` 对同名导航项的处理方式一致
- `href` 从规范片段的 `billing.html` 改为 `index.html`（子目录自引用）

#### 4.1.4 脚本链接路径

页面尾部按以下顺序引入共享脚本和模块脚本：

```html
<!-- 共享脚本 -->
<script src="../shared/scripts/mobile-nav.js"></script>
<script src="../shared/scripts/navigate.js"></script>
<!-- 模块脚本 -->
<script src="scripts/billing-page.js"></script>
<script src="scripts/billing-filters.js"></script>
<script src="scripts/billing-bulk-actions.js"></script>
<script src="scripts/billing-payment-modal.js"></script>
<script src="scripts/billing-risk-log.js"></script>
```

| 共享脚本 | 相对路径（从 `billing/index.html`） | 提供的能力 |
|----------|----------------------------------|-----------|
| `mobile-nav.js` | `../shared/scripts/mobile-nav.js` | `[data-nav-open]` / `[data-nav-close]` 点击 → `body[data-nav-open]` 切换；Escape 键关闭 |
| `navigate.js` | `../shared/scripts/navigate.js` | 全局搜索弹窗（`⌘K` / `Ctrl+K`）、`data-navigate` 路由、topbar 搜索聚焦 |

#### 4.1.5 财务页专有样式

财务页专有样式如果已纳入 `components.css` 则复用，否则作为财务页内联样式保留在 `index.html` 的 `<style>` 块中：

| 样式 | 处理方式 |
|------|---------|
| `.text-hero` | 保留在 `index.html` 内联（仪表盘等页面如需要再提升到 shared） |
| `.tag` / `.tag-*` 家族 | 若 `components.css` 已包含则复用；否则保留内联 |
| 逾期行红色高亮 `bg-[rgba(220,38,38,0.04)]` | 通过 Tailwind 内联实现，保留在 section |

### 4.2 财务页层 (`billing/`)

财务页层只关注收费列表页的 UI 区块和业务行为。

#### `billing/index.html` — 入口组装文件

职责：
1. 声明 `<!DOCTYPE html>`、`<head>`（meta、title、tailwindcss CDN、font import）
2. 引入共享样式：`<link>` 到 `../shared/styles/tokens.css`, `components.css`, `shell.css`
3. 引入财务页专有样式（如有）
4. 组装 HTML 结构：`app-shell` > `side-nav` + `main`
5. 在 `<main>` 内按顺序插入 `sections/*.html` 片段内容
6. 在页尾引入脚本：`../shared/scripts/mobile-nav.js` + `billing/scripts/*.js`

> **P0 阶段简化方案**：与客户模块、任务模块一致，`sections/*.html` 作为"逻辑边界文件"存在。入口文件中用注释标记区块来源（如 `<!-- section: sections/billing-table.html -->`）。脚本文件直接通过 `<script src="...">` 引入。

#### `billing/sections/*.html` — 页面区块

| 文件 | 内容 | 对应 P0 契约 |
|------|------|-------------|
| `page-header.html` | 页面标题 `<h1>收费与财务</h1>` + 副标题 + "登记回款"按钮 | — |
| `summary-cards.html` | 4 张摘要卡（应收/已收/未收/逾期） | §5 摘要卡 |
| `filters-toolbar.html` | 3 个筛选 select（状态/Group/负责人）+ 搜索框 + segmented control + 重置 | §4 搜索与筛选, §6 分段视图 |
| `billing-table.html` | `bulkActionBar`（含跳过原因展示）+ `<table>` 结构（thead 8 列 + checkbox 列）+ 默认排序逻辑 | §2 字段, §3 排序, §7 批量动作 |
| `payment-log-table.html` | 回款流水表格（6 列）+ 作废/冲正状态标识 | §9 回款流水 |
| `billing-plan-panel.html` | 收费节点列表、下一收款节点摘要、空状态引导、结清标识 | §10 收费计划面板 |
| `payment-modal.html` | `modal-backdrop` + `apple-modal` + 5 个表单字段 + BillingPlan 归集选择器 + 金额提示 | §8 登记回款弹窗 |
| `risk-ack-panel.html` | 风险确认留痕记录（确认人、时间、原因、金额） | §11 欠款风险确认 |
| `collection-result-toast.html` | `#toast` 组件 + 批量催款三段式结果区 | §16 Toast |

#### `billing/data/billing-config.js` — 声明式配置

将以下隐式耦合提取为显式配置对象：

```js
var BillingConfig = (function () {

  var BILLING_STATUS_OPTIONS = [
    { value: 'paid', label: '已结清', badge: 'tag-green' },
    { value: 'partial', label: '部分回款', badge: 'tag-blue' },
    { value: 'due', label: '未回款', badge: 'tag-orange' },
    { value: 'overdue', label: '逾期', badge: 'tag-red' },
  ];

  var PAYMENT_RECORD_STATUS = [
    { value: 'valid', label: '有效' },
    { value: 'voided', label: '已作废' },
    { value: 'reversed', label: '已冲正' },
  ];

  var BILLING_PLAN_STATUS = [
    { value: 'due', label: '应收' },
    { value: 'partial', label: '部分回款' },
    { value: 'paid', label: '已结清' },
    { value: 'overdue', label: '逾期' },
  ];

  var GROUPS = [
    { value: 'tokyo-1', label: '東京一組' },
    { value: 'tokyo-2', label: '東京二組' },
    { value: 'osaka', label: '大阪組' },
  ];

  var OWNERS = [
    { value: 'admin', label: 'Admin', initials: 'AD' },
    { value: 'suzuki', label: 'Suzuki', initials: 'SZ' },
    { value: 'tanaka', label: 'Tanaka', initials: 'TN' },
  ];

  var TABLE_COLUMNS = [
    { id: 'select', type: 'checkbox', width: '44px' },
    { id: 'caseName', label: '案件名称', showAlways: true },
    { id: 'client', label: '客户', responsive: 'md' },
    { id: 'group', label: '所属 Group', responsive: 'lg', width: '100px' },
    { id: 'amountDue', label: '应收(¥)', width: '100px', align: 'right' },
    { id: 'amountReceived', label: '已收(¥)', width: '100px', align: 'right' },
    { id: 'amountOutstanding', label: '未收(¥)', width: '100px', align: 'right' },
    { id: 'nextNode', label: '下一收款节点', responsive: 'md', width: '160px' },
    { id: 'status', label: '回款状态', width: '100px' },
  ];

  var PAYMENT_LOG_COLUMNS = [
    { id: 'date', label: '回款日期', width: '120px' },
    { id: 'case', label: '案件' },
    { id: 'amount', label: '金额', width: '120px', align: 'right' },
    { id: 'node', label: '关联节点', width: '140px' },
    { id: 'recordStatus', label: '状态', width: '100px' },
    { id: 'note', label: '备注' },
  ];

  var FILTERS = [
    { id: 'status', label: '回款状态', options: 'BILLING_STATUS_OPTIONS', defaultValue: '' },
    { id: 'group', label: '所属 Group', options: 'GROUPS', defaultValue: '' },
    { id: 'owner', label: '负责人', options: 'OWNERS', defaultValue: '' },
  ];

  var SEARCH_PLACEHOLDER = '搜索：案件名称 / 客户名称 / 案件编号';

  var SEGMENTED_VIEWS = [
    { id: 'billing-list', label: '案件收费列表' },
    { id: 'payment-log', label: '回款流水记录' },
  ];

  var BULK_ACTIONS = [
    { id: 'createCollection', label: '批量生成催款任务', type: 'button' },
  ];

  var COLLECTION_SKIP_REASONS = [
    { value: 'no-permission', label: '无权限' },
    { value: 'duplicate-task', label: '已存在未完成催款任务（同案同节点同逾期周期）' },
    { value: 'not-overdue', label: '不满足逾期条件（节点已结清或到期日未到）' },
    { value: 'no-assignee', label: '无可用负责人（案件负责人缺失且 Group 未配置默认负责人）' },
    { value: 'system-error', label: '创建失败（系统错误/并发冲突）' },
  ];

  var PAYMENT_FORM_FIELDS = [
    { id: 'amount', label: '金额', type: 'number', required: true },
    { id: 'date', label: '日期', type: 'date', required: true },
    { id: 'billingPlanId', label: '关联收费节点', type: 'select', required: 'conditional' },
    { id: 'receipt', label: '付款凭证', type: 'file', required: false },
    { id: 'note', label: '备注', type: 'textarea', required: false },
  ];

  var PAYMENT_REQUIRED_IDS = ['amount', 'date'];

  var TOAST = {
    paymentLogged:    { title: '回款已登记（示例）', desc: '{amount} 已记录到收费节点' },
    receiptUploaded:  { title: '凭证已上传（示例）', desc: '付款凭证已关联到回款记录' },
    collectionSingle: { title: '催款任务已创建（示例）', desc: '已为 {case} 创建催款跟进任务' },
    collectionBulk:   { title: '批量催款（示例）', desc: '成功 {s} 条 · 跳过 {k} 条 · 失败 {f} 条' },
    paymentVoided:    { title: '回款已作废（示例）', desc: '原记录已标记作废，原因已记录' },
    riskConfirmed:    { title: '风险确认已留痕（示例）', desc: '欠款继续提交已记录确认人与原因' },
  };

  var P0_NOT_IN_SCOPE = [
    'invoice-management',
    'financial-reports',
    'auto-reconciliation',
    'batch-export',
    'client-portal-reminder',
  ];

  return {
    BILLING_STATUS_OPTIONS: BILLING_STATUS_OPTIONS,
    PAYMENT_RECORD_STATUS: PAYMENT_RECORD_STATUS,
    BILLING_PLAN_STATUS: BILLING_PLAN_STATUS,
    GROUPS: GROUPS,
    OWNERS: OWNERS,
    TABLE_COLUMNS: TABLE_COLUMNS,
    PAYMENT_LOG_COLUMNS: PAYMENT_LOG_COLUMNS,
    FILTERS: FILTERS,
    SEARCH_PLACEHOLDER: SEARCH_PLACEHOLDER,
    SEGMENTED_VIEWS: SEGMENTED_VIEWS,
    BULK_ACTIONS: BULK_ACTIONS,
    COLLECTION_SKIP_REASONS: COLLECTION_SKIP_REASONS,
    PAYMENT_FORM_FIELDS: PAYMENT_FORM_FIELDS,
    PAYMENT_REQUIRED_IDS: PAYMENT_REQUIRED_IDS,
    TOAST: TOAST,
    P0_NOT_IN_SCOPE: P0_NOT_IN_SCOPE,
  };
})();
```

#### `billing/data/billing-demo-data.js` — 演示数据

```js
var BillingDemoData = (function () {

  var DEMO_BILLING_ROWS = [
    {
      id: 'bill-001',
      caseName: '高度人才 (HSP) 申請',
      caseNo: 'CAS-2026-0181',
      client: { name: 'Michael T.', type: '個人' },
      group: 'tokyo-1',
      amountDue: 350000,
      amountReceived: 175000,
      amountOutstanding: 175000,
      status: 'partial',
      nextNode: { name: '尾款 (50%)', dueDate: '申請獲批後 7 天內' },
    },
    {
      id: 'bill-002',
      caseName: '經營管理簽證 新規',
      caseNo: 'CAS-2026-0191',
      client: { name: 'Global Tech KK', type: '企業' },
      group: 'tokyo-1',
      amountDue: 500000,
      amountReceived: 0,
      amountOutstanding: 500000,
      status: 'overdue',
      nextNode: { name: '首付款 (100%)', dueDate: '已逾期 5 天 (2026-04-04)' },
    },
    {
      id: 'bill-003',
      caseName: '家族滯在簽證 續簽',
      caseNo: 'CAS-2026-0156',
      client: { name: 'Sarah W.', type: '個人' },
      group: 'tokyo-2',
      amountDue: 80000,
      amountReceived: 80000,
      amountOutstanding: 0,
      status: 'paid',
      nextNode: null,
    },
    {
      id: 'bill-004',
      caseName: '就勞簽證 變更',
      caseNo: 'CAS-2026-0204',
      client: { name: 'Li M.', type: '個人' },
      group: 'osaka',
      amountDue: 120000,
      amountReceived: 0,
      amountOutstanding: 120000,
      status: 'due',
      nextNode: { name: '全款 (100%)', dueDate: '資料收集齊後 3 天內' },
    },
  ];

  var DEMO_PAYMENT_LOGS = [
    {
      id: 'pay-001',
      date: '2026/04/01',
      caseNo: 'CAS-2026-0181',
      caseName: '高度人才 (HSP) 申請',
      amount: 175000,
      node: '著手金 (50%)',
      recordStatus: 'valid',
      note: '',
    },
    {
      id: 'pay-002',
      date: '2026/03/25',
      caseNo: 'CAS-2026-0156',
      caseName: '家族滯在簽證 續簽',
      amount: 80000,
      node: '全款 (100%)',
      recordStatus: 'valid',
      note: '',
    },
  ];

  var DEMO_SUMMARY = {
    totalDue: 1050000,
    totalReceived: 255000,
    totalOutstanding: 795000,
    overdueAmount: 500000,
    overdueCount: 1,
  };

  var DEMO_BILLING_PLAN = {
    caseNo: 'CAS-2026-0181',
    nodes: [
      { name: '著手金 (50%)', amount: 175000, dueDate: '2026/04/01', status: 'paid' },
      { name: '尾款 (50%)', amount: 175000, dueDate: '申請獲批後 7 天內', status: 'due' },
    ],
  };

  var DEMO_RISK_RECORD = {
    confirmedBy: 'Manager',
    confirmedAt: '2026/04/08 09:00',
    reasonCode: '客戶承諾本週內付清',
    reasonNote: '因期限緊迫優先提交',
    amount: 120000,
    caseNo: 'CAS-2026-0204',
  };

  var DEMO_COLLECTION_RESULT = {
    success: 1,
    skipped: 1,
    failed: 0,
    details: [
      { caseNo: 'CAS-2026-0191', result: 'success', taskId: 'TSK-0099' },
      { caseNo: 'CAS-2026-0204', result: 'skipped', reason: 'not-overdue' },
    ],
  };

  return {
    DEMO_BILLING_ROWS: DEMO_BILLING_ROWS,
    DEMO_PAYMENT_LOGS: DEMO_PAYMENT_LOGS,
    DEMO_SUMMARY: DEMO_SUMMARY,
    DEMO_BILLING_PLAN: DEMO_BILLING_PLAN,
    DEMO_RISK_RECORD: DEMO_RISK_RECORD,
    DEMO_COLLECTION_RESULT: DEMO_COLLECTION_RESULT,
  };
})();
```

#### `billing/scripts/*.js` — 行为模块

| 文件 | 职责 | 依赖 |
|------|------|------|
| `billing-page.js` | DOMContentLoaded 入口；分段视图切换；toast 编排 | config, filters, bulk, modal, risk-log |
| `billing-filters.js` | 3 个筛选器联动；搜索 debounce；重置 | config (FILTERS, SEARCH_PLACEHOLDER) |
| `billing-bulk-actions.js` | `getSelectableCheckboxes()`；`updateBulkState()`；全选/单选/清除；批量催款；三段式结果展示 | config (BULK_ACTIONS, COLLECTION_SKIP_REASONS), toast |
| `billing-payment-modal.js` | 登记回款弹窗开关；5 字段表单；BillingPlan 归集选择器；金额校验提示 | config (PAYMENT_FORM_FIELDS, PAYMENT_REQUIRED_IDS) |
| `billing-risk-log.js` | 风险确认面板展示；留痕记录渲染 | demo-data (DEMO_RISK_RECORD) |

跨模块通信使用挂载到约定命名空间（`window.__billingPage`）的方式，避免模块之间直接互引 DOM ID。

---

## 5. 共享层与页面层边界规则

| 规则 | 说明 |
|------|------|
| **共享层不含业务逻辑** | `shared/` 下的文件不出现"收费"、"回款"、"催款"等业务概念 |
| **页面层不复制壳子** | `billing/index.html` 不再手写导航 HTML，引用 `shared/shell/` |
| **样式单一来源** | `.btn-primary`, `.chip`, `.apple-table` 等在 `shared/styles/` 定义一次；页面层只补充页面专有样式 |
| **Token 单一来源** | `:root` CSS 变量在 `shared/styles/tokens.css` 定义一次；页面层不重新声明 |
| **脚本按能力拆** | 每个 `.js` 文件对应一个独立能力（page / filters / bulk / modal / risk-log） |
| **配置集中声明** | 状态枚举、列定义、筛选配置、表单 schema 在 `data/billing-config.js` 集中管理 |
| **演示数据独立** | 示例案件收费行、回款流水、催款结果在 `data/billing-demo-data.js`，不混入配置 |
| **data-* 钩子优先** | 尽量用 `data-action="xxx"` 属性 + 事件代理，减少 `onclick` 内联处理器 |
| **section 注释边界** | 入口 HTML 中用 `<!-- section: sections/xxx.html -->` 注释标记区块起止 |

---

## 6. 拆分步骤（推荐执行顺序）

### Step 1：搭建入口文件骨架
1. 创建 `billing/index.html`，引入 `shared/styles/*.css`
2. 从 `shared/shell/` 复制导航 HTML（路径调整为 `../`），设置财务项 `aria-current="page"`
3. 搭建 `<main>` 骨架，预留 9 个 section 注释边界
4. **视觉回归**：页面壳子正常渲染

### Step 2：迁移现有区块并去除 P1 泄漏
1. 将 `billing.html` 的 page-header 迁移到 `sections/page-header.html`，移除"导出报表"按钮（P1 泄漏）
2. 将摘要卡迁移到 `sections/summary-cards.html`，金额维度从"本月"改为"全局"并标注 demo-only
3. 新建 `sections/filters-toolbar.html`，补齐 Group 和负责人筛选；segmented control 移除"发票管理"段（P1 泄漏）
4. 将案件收费列表重构为 `sections/billing-table.html`，补齐 Group 列，添加 checkbox 列和批量操作栏
5. **视觉回归**：8 列完整、摘要卡/筛选/列表区块存在、P1 项已移除

### Step 3：补齐缺失区块
1. 新建 `sections/payment-log-table.html`（现有页面缺失，需全新构建）
2. 新建 `sections/billing-plan-panel.html`（现有页面缺失）
3. 新建 `sections/payment-modal.html`（现有页面缺失）
4. 新建 `sections/risk-ack-panel.html`（现有页面缺失）
5. 新建 `sections/collection-result-toast.html`
6. **视觉回归**：分段切换可见回款流水、收费计划面板、弹窗、风险面板区块存在

### Step 4：提取配置与演示数据
1. 创建 `data/billing-config.js`，提取所有枚举、列定义、筛选配置、表单 schema
2. 创建 `data/billing-demo-data.js`，提取示例收费行、回款记录、催款结果、风险确认
3. **视觉回归**：数据不变

### Step 5：拆分脚本
1. 创建 5 个脚本文件，按职责拆分
2. 入口文件 `<script>` 改为 `<script src="...">` 引用
3. **行为回归**：视图切换、筛选、批量操作、弹窗、toast 全部可用

### Step 6：最终回归
1. 按 [P0-CONTRACT.md 拆分回归清单](./P0-CONTRACT.md#拆分回归清单) 逐项验证
2. 运行 `npm run fix` + `npm run guard`

---

## 7. 从原型 Section 到生产组件的映射表（前瞻）

此映射不在 P0 拆分范围内执行，仅作为后续迁移的参考。

**完整映射文档见 → [MIGRATION-MAPPING.md](./MIGRATION-MAPPING.md)**

以下为速查摘要，遵循仓库 `domain → data → features/{model,ui} → shared/ui` 四层架构：

| 原型 Section | 生产组件 | 层级 |
|-------------|---------|------|
| `sections/page-header.html` | `BillingListHeader` | features/billing/ui |
| `sections/summary-cards.html` | `BillingSummaryCards` | features/billing/ui |
| `sections/filters-toolbar.html` | `BillingListFilters` | features/billing/ui |
| `sections/billing-table.html` | `BillingTable` + `BillingBulkActionBar` | features/billing/ui |
| `sections/payment-log-table.html` | `PaymentLogTable` | features/billing/ui |
| `sections/billing-plan-panel.html` | `BillingPlanPanel` | features/billing/ui |
| `sections/payment-modal.html` | `PaymentModal` | features/billing/ui |
| `sections/risk-ack-panel.html` | `RiskAckPanel` | features/billing/ui |
| `sections/collection-result-toast.html` | `Toast` | shared/ui |
| `scripts/billing-page.js` | `useBillingListViewModel` | features/billing/model |
| `scripts/billing-filters.js` | `useBillingFilters` | features/billing/model |
| `scripts/billing-bulk-actions.js` | `useBillingBulkActions` | features/billing/model |
| `scripts/billing-payment-modal.js` | `usePaymentModal` | features/billing/model |
| `scripts/billing-risk-log.js` | `useRiskLog` | features/billing/model |
| `data/billing-config.js` | `Billing.ts` + `billingConstants.ts` | domain/billing |
| `data/billing-demo-data.js` | — (demo-only, 不迁移) | — |
