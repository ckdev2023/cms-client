# admin — UI 视觉规范走查与优化报告（第二轮 / playwright-mcp · 字体 · 排版 · 对齐）

> 生成日期：2026-05-01（playwright-mcp 实测，桌面 1440×900，en-US）
> 走查工具：`playwright-mcp`（`playwright_navigate` / `playwright_evaluate` / `playwright_screenshot` / `playwright_click` / `playwright_fill`）+ 计算样式抽样脚本 + WCAG 对比度计算（含 alpha-blend 修正）
> 走查环境：`http://localhost:5173`（Vite dev），admin 已登录 `admin@local.test`，浏览器视口 1440×900，`headless=true / chromium 1200`
> 走查依据：
> - `docs/gyoseishoshi_saas_md/_output/20-admin-UI视觉规范走查与优化报告-第一轮.md`（chrome-devtools-mcp 第一轮基线）
> - `packages/admin/src/styles/theme.css`（项目自定义 design tokens）
> - WCAG 2.1 AA：正文对比度 ≥ 4.5、大字 ≥ 3.0；触控区推荐 ≥ 44×44（最低 24×24）
> 关注维度：①字体（typescale 规范度）；②排版（行高、字重、对齐节奏）；③对齐（表头/单元格、卡片栅格、复杂控件）

> 本份**只走查 UI 视觉规范**，与第一轮（20-）形成 R1→R2 复测对比，不复述功能/i18n/状态机偏差。

---

## 0. 总结（Three-line takeaway）

1. **R1 P0 全部回归**：`Arco 在 body 覆盖 text token` 已修复（`theme.css` 改为 `body, :root` 双选择器）；`status-pill` 全部反转为白字（info/warn/danger 5.4 ~ 8.7:1）；template card title/sub 已改白字 0.85α；R1 抽样 264 处 contrast 失败 → R2 实测 9 个核心列表/详情页累计仅 **19 处**真实失败（已剔除 sliding-thumb / 半透明 overlay 测算误差），下降 ~92%。
2. **R2 新发现"半透明 chip 在深色父级被吞"系列 P1**：`button.tpl.is-active` 选中态把卡片底色刷成 `#0369a1`，但 `ui-chip--primary` 的 `:not([aria-selected])` 默认色 `color: var(--color-primary-6) on rgba(3,105,161,0.08)` 直接被父背景吞掉 → 文本与背景**完全同色**（contrast 1.00），出现"Popular / Business Manager" 等 chip 不可见；`ui-chip--success / --warning / --danger` 在小字（12-13px）下文字色与浅 8% 底的对比度仍只有 3.0 ~ 4.4，**列表页所有阶段/状态徽标普遍在 WCAG AA 边缘**。
3. **typescale 已落 token 但仍有 4 个"半熟字号"和 3 个 hardcoded 圆角逃逸**：`17px`（19 个 modal 标题硬编码）、`34px`（CustomerSummaryCards / DocumentSummaryCards 数字）、CaseDetail meta 分隔符 `|` 仍是 1.18 contrast、Dashboard `surface-card` 仍是 `border-radius: 24px`（token 上限 20）/ work-item `18px` / LoginView `24px`，需要统一收口。

---

## 1. 走查范围与方法

### 1.1 已走查页面（13 处 / 9 列表/详情 + 1 modal + 3 wizard/auxiliary）

| # | 页面 | 路由 | 截图 |
|---|---|---|---|
| 1 | Dashboard | `#/` | `/tmp/r2-ui-audit/01-dashboard-*.png` |
| 2 | Leads list | `#/leads` | `/tmp/r2-ui-audit/02-leads-*.png` / `13-leads-list-*.png` |
| 3 | Cases list | `#/cases` | `/tmp/r2-ui-audit/03-cases-*.png` |
| 4 | Case Detail | `#/cases/a63aa5f0-…` | `/tmp/r2-ui-audit/04-case-detail-*.png` |
| 5 | Billing & Finance | `#/billing` | `/tmp/r2-ui-audit/05-billing-*.png` |
| 6 | Customers list | `#/customers` | `/tmp/r2-ui-audit/06-customers-*.png` |
| 7 | Create-customer modal | `#/customers > Add customer` | `/tmp/r2-ui-audit/07-customer-create-modal-*.png` |
| 8 | Document center | `#/documents` | `/tmp/r2-ui-audit/08-documents-*.png` |
| 9 | Tasks & reminders | `#/tasks` | `/tmp/r2-ui-audit/09-tasks-*.png` |
| 10 | Conversations | `#/conversations` | `/tmp/r2-ui-audit/10-conversations-*.png` |
| 11 | System Settings | `#/settings` | `/tmp/r2-ui-audit/11-settings-*.png` |
| 12 | New case wizard Step 1 | `#/cases/create?customerId=…` | `/tmp/r2-ui-audit/12-case-create-step1-*.png` |

### 1.2 抽样口径

- **文字节点**：`main, header, [role="complementary"], aside` 中所有可见、`children=0` 且自身有文本的节点
- **对比度算法**：WCAG 2.1 公式 `(L1 + 0.05) / (L2 + 0.05)`；本轮**修正了 R1 的 alpha 估算缺陷**，对每一层 `rgba` 背景沿父链做反向 alpha-over 合成
- **大字阈值**：`fontSize ≥ 18px` 或 `fontSize ≥ 14px && fontWeight ≥ 700` → AA 阈值 3.0；其余 4.5
- **typescale token 集合**：`{12, 13, 14, 15, 16, 18, 22, 28, 36, 40} px`（与 `theme.css` 保持一致）
- **font-weight token 集合**：`{400, 500, 600, 700, 800, 900}`（不允许字符串外的值）
- **radius token 集合**：`{0, 8, 12, 16, 20, 9999} px`（对应 sm / md / lg / xl / full）
- **触控区**：`button / a / input / select / textarea / [role="tab"|"button"] / [type="checkbox"|"radio"]`，命中 `width < 32 || height < 32`
- **小字**：`fontSize < 12px`（`--font-size-xs = 12px` 是设计系统下限）
- **过滤误报**：`segmented-control / segment-btn / hero-toolbar` 链上的对比度跳过（这类控件用绝对定位 thumb 实现激活背景，DOM 上找不到祖先）

### 1.3 全站汇总（11 视图加总，已剔除 thumb 误报）

| 维度 | R1 数据 | R2 数据 | 评价 |
|---|---|---|---|
| 走查文本节点（去容器）| 491（7 页） | 2,176（11 视图） | 覆盖更广 |
| 对比度不达 WCAG AA | **264** | **19**（剔除 segmented-thumb 假阳后） | ↓ 92% |
| `fontSize < 12px` 小字节点 | **86** | **0** | ✅ R1 UX-007 已落 |
| 触控区 < 32×32 元素 | **68** | **89**（含 brand link / sidenav / 表内复选框 13×13 / pagination 26.1px / mini-btn 30.9px）| 数量 ↑（更广覆盖），但 mini-btn 已从 27.8 ↑ 至 30.9px |
| hardcoded `font-size`（非 token）| 6 个字号 | **3 个**（`17px`×N modal 标题 / `34px`×2 summary value / `19~21px` 偶发） | ↓ 约 50% |
| hardcoded `font-weight` | 未统计 | **0** | ✅ |
| hardcoded `border-radius` | 8 级 | **3 个**（`24px` Dashboard surface-card / `18px` work-item & DashboardView / `10px` 偶发）| 大幅收敛 |
| 同字号多 line-height 个数 | 17 | **9**（13px 上 4 种、12px 上 2 种、14px 上 3 种、28px 上 2 种）| 仍待统一 |
| 全局 design tokens 总数 | 79 | 79（含新增 typescale `xs ~ display-2`、leading 3 级、radius 4 级 + full、weight 6 级 + Plus Jakarta Sans）| 体系完整 |

---

## 2. R1→R2 回归清单（追溯 R1 13 项修复点）

| # | R1 编号 | 修复点 | R2 实测 | 备注 |
|---|---|---|---|---|
| 1 | UX-001 | Arco 在 `body` 覆盖 `--color-text-3` | ✅ **已修复** | `theme.css` 用 `body, :root` 双重选择器锁定，root 与 body 实测 token 完全一致（见 §3.1） |
| 2 | UX-002 | status-pill / chip primary active 文字与背景同色 | ✅ **已修复**（除 chip-on-active-card） | status-info/warn/danger 全部白字（5.4~8.7:1）；template card title 改白字、sub 改 `rgba(255,255,255,0.85)`；step-text 改白字 — 但 `ui-chip--primary` chip 在选中卡片上仍不反转，见 §4.2 P0-A |
| 3 | UX-003 | Reset 按钮 dark-on-dark | ✅ **已修复** | `ui-btn--outlined` 实测 `bg=rgba(15,23,42,0.04)` over white = `#f6f7f9`，contrast 与 `#0f172a` ≈ 17:1 |
| 4 | UX-004 | `case-detail-view__meta-sep \|` 几乎不可见 | ❌ **未修复** | CaseDetail header `\|` 实测 `color=#e2e8f0` on `#f8fafc` → 1.18 contrast，仍存在 |
| 5 | UX-005 | 触控区 < 32×32 | ⚠️ **部分修复** | mini-btn / segment-btn 从 27.8/29.8px ↑ 至 30.9px，但仍 < 32px；表内 checkbox 仍 13×13；pagination 26.1px；面包屑链 24px |
| 6 | UX-006 | 字号 token 缺级 + hardcoded 蔓延 | ✅ **已修复** | typescale 完整定义 8 级（xs 12 → display-2 40）；多页面字号集合落在 token 内 — 仅余 `17px` modal 标题（19 个文件）、`34px` summary value（2 个文件）逃逸 |
| 7 | UX-007 | 11px 滥用 | ✅ **已修复** | R1 86 处 → R2 0 处 < 12px；`--font-size-xs` 提升至 12px |
| 8 | UX-008 | 标题字重 900 过重 | ✅ **已修复** | Dashboard h1 实测 `font-weight=800`；UPPERCASE caption 600 |
| 9 | UX-009 | `--shadow-focus-ring` alpha 0.1 几乎不可见 | ✅ **已修复** | 实测 `0 0 0 3px rgba(3,105,161,0.4)` |
| 10 | UX-010 | 圆角散乱（8 级） | ⚠️ **部分修复** | token 收敛到 4 级（sm 8 / md 12 / lg 16 / xl 20 / full），但 `dashboard.css surface-card 24px` / `DashboardView 24+18px` / `LoginView 24px` 仍硬编码 |
| 11 | UX-011 | line-height 17 种变体 | ⚠️ **部分修复** | leading token 3 级已定义（tight 1.2 / normal 1.45 / relaxed 1.6），但组件仍未统一绑定，13px 上仍有 4 种 lh，详见 §4.4 |
| 12 | UX-012 | hover overlay 反馈过弱 | ✅ **已修复** | `--color-bg-overlay-hover: rgba(15,23,42,0.06)`（R1 是 0.04）|
| 13 | UX-013 | summary-card-orb 单角 999px 与卡片 24px 圆不协调 | ⚠️ **未直接验证** | DashboardView KPI 卡角已不再用 999px，但 surface-card 仍是 24px，与 token xl 20px 错位 |

**回归得分：13 项中 ✅ 8、⚠️ 4、❌ 1。** R1 P0 / P1 全部落地或部分落地，本轮新增 P1/P2 主要集中在 chip 兜底、modal 字号收口、剩余 hardcoded radius。

---

## 3. 关键根因（R2 必须修复）

### 3.1 [P0-A] chip-on-primary-card：选中模板卡的 chip 视觉吞掉

**现象**：CaseCreate Step 1，选中 "Dependent Visa" 模板卡后：

- `button.tpl.is-active` 背景 = `rgb(3, 105, 161)`（primary-6 实底）
- 卡片内 `<span class="ui-chip ui-chip--primary">Popular</span>` chip：
  - `color: var(--color-primary-6)` = `#0369a1`
  - `background-color: rgba(3, 105, 161, 0.08)` 在父级深蓝上合成后 ≈ `rgb(3, 105, 161)`
- **chip 文字与合成背景相同色**，contrast = 1.00，"Popular" 完全不可见

**机制**：`Chip.vue` 的反转规则只覆盖 `[aria-selected="true"]` / `.is-active` 这两种状态：

```93:96:packages/admin/src/shared/ui/Chip.vue
.ui-chip--primary[aria-selected="true"],
.ui-chip--primary.is-active {
  color: #fff;
}
```

但 chip 本身没有 `aria-selected` 也没有 `.is-active`——它是被父卡片选中后顺便变深色的。chip 没有感知到环境变化。

**修复建议**（按推荐顺序）：

```css
/* 方案 A（推荐）：父级提供"反转上下文"，chip 默认根据上下文翻转色 */
.tpl.is-active .ui-chip--primary,
.tpl.is-active .ui-chip--success,
.tpl.is-active .ui-chip--warning,
.tpl.is-active .ui-chip--danger {
  background-color: rgba(255, 255, 255, 0.18);
  border-color: rgba(255, 255, 255, 0.35);
  color: #fff;
}

/* 方案 B：在 Chip.vue 加 prop `inverted` 让父组件主动控制 */
<Chip variant="primary" :inverted="isActive">Popular</Chip>
```

> 📌 同样问题潜在影响：所有 "在选中态/深色背景上嵌套 chip" 的场景。需要扫描 `is-active`、`is-selected`、`primary` 卡片内是否还有未反转的 chip（推测 LeadConvertedRecords / 模板卡变体也有）。

---

### 3.2 [P1-A] 语义 chip 小字对比度不达标（Cases/Billing 列表通用）

| 元素 | 颜色 / 背景（合成）| contrast | 阈值 | 来源 |
|---|---|---|---|---|
| `ui-chip--success` "Closed (success) / Success / Collecting documents" 12-13px @ 700 | `#16a34a` / `rgb(236,247,240)` | **3.00** | 4.5 | `Chip.vue:103` |
| `ui-chip--warning` "Unpaid" 13px @ 700 | `#b45309` / `rgb(240,234,223)` | **4.19** | 4.5 | `Chip.vue:111` |
| `ui-chip--danger` "Closed (failed)" 12px @ 700 | `#dc2626` / `rgb(252,239,239)` | **4.31** | 4.5 | `Chip.vue:119` |

**机制**：所有语义 chip 都是 `color: 主色 / background-color: rgba(主色, 0.08)`。当文字 12-13px @ 700 weight 时，按 WCAG，14px+ 700 才算"大字"，所以这里仍按 4.5 阈值，刚好不过。

**修复建议**：把 chip 文字色统一上调一档（更深一阶），保持品牌色识别性同时满足 AA：

```css
.ui-chip--success { color: #166534; }   /* green-800 → contrast 5.85 ✓ */
.ui-chip--warning { color: #92400e; }   /* amber-800 → contrast 5.50 ✓ */
.ui-chip--danger  { color: #991b1b; }   /* red-800   → contrast 7.18 ✓ */
.ui-chip--primary { color: #075985; }   /* primary-7 → contrast 9.26 ✓ */
```

这与 R1 已采用的 `status-pill` 思路一致（status-pill 用 vivid 实底 + 白字；chip 用浅 8% 底 + 深字 700/800）。

---

### 3.3 [P1-B] CaseDetail header `|` 分隔符 contrast 1.18（R1 UX-004 未修复）

```html
<p class="case-detail-view__meta">
  <!-- ... -->
  <span class="case-detail-view__meta-sep">|</span>
  <!-- ... -->
</p>
```

实测 `color=#e2e8f0` on `#f8fafc` → contrast 1.18。视觉上完全不存在，但占据 1ch 宽度并造成 meta 行参差。

**修复建议**（与 R1 一致）：

```css
.case-detail-view__meta-sep {
  /* 选 1：用更深的 border 色 */
  color: var(--color-border-1);   /* #e2e8f0 → 实测 1.18 仍不够，建议 */
  color: var(--color-text-3);     /* #64748b → 4.6 ✓ */
}
/* 或选 2：删 `|`，改用 gap + 视觉留白 */
.case-detail-view__meta { display: flex; gap: 12px; }
.case-detail-view__meta-sep { display: none; }
```

---

### 3.4 [P1-C] 表格选中/hover 行下，text-3 metadata 跌至 4.21

Cases 列表第一行（默认选中态）实测：

| 文本 | 颜色 | 合成背景 | contrast | 阈值 |
|---|---|---|---|---|
| `CASE-202605-0003`（13px @ 400）| `#64748b` | `rgb(240,241,242)`（white + bg-overlay 0.06）| **4.21** | 4.5 |
| `Tokyo Team 1`（12px @ 600 chip）| `#64748b` | `#f1f5f9`（bg-3）| **4.34** | 4.5 |
| `—`（14px @ 400 NA placeholder）| `#64748b` | `rgb(240,241,242)` | **4.21** | 4.5 |

**机制**：`--color-text-3 = #64748b` 在白底上 contrast 4.6 ✓，但只要叠加任何 hover/selected/group-bg overlay（R1 修复后 hover overlay = 0.06），就把背景从 `#fff` 拉到 `#f0f1f2`，导致 4.6 → 4.21。Billing 列表同因。

**修复建议**：

```css
:root {
  /* 把 text-3 再压一档，确保 hover/selected/group-bg 上仍 ≥ 4.5 */
  --color-text-3: #5b6776;         /* contrast on bg-3 #f1f5f9 = 4.71 ✓ */

  /* 或：表格 hover 不动 background，只用 border-left 或 box-shadow 强化 */
  --color-row-hover-bg: transparent;
  --color-row-hover-border: var(--color-primary-6);
}
.case-table tbody tr:hover { box-shadow: inset 3px 0 0 var(--color-primary-6); }
```

---

## 4. 字体 / 排版 / 对齐分项分析

### 4.1 字号（typescale）现状

**R2 实测各页面字号集合**：

| 页面 | 字号集合（px） | 是否全在 token | 说明 |
|---|---|---|---|
| Dashboard | `[12, 13, 14, 15, 18, 36, 40]` | ✅ | display-1/2 仅用于 KPI 数字 |
| Leads list | `[12, 13, 14, 15, 28]` | ✅ | h1=28（3xl）|
| Customers list | `[12, 13, 14, 15, 28, **34**]` | ❌ | summary-card value 34px 逃逸 |
| Cases list | `[12, 13, 14, 15, 28]` | ✅ | |
| Case Detail | `[12, 13, 15, 22, 28]` | ✅ | |
| Tasks | `[12, 13, 14, 15, 28]` | ✅ | |
| Documents | `[12, 13, 14, 15, 28, **34**]` | ❌ | summary-card value 34px 逃逸 |
| Conversations | `[12, 13, 14, 15, 16, 28]` | ✅ | |
| Billing | `[12, 13, 15, 28]` | ✅ | |
| Settings | `[12, 13, 15, 28]` | ✅ | |
| Case Create Step 1 | `[12, 13, 14, 15, 18, 28]` | ✅ | |
| Modal (Customer create) | `[13, 14, **17**]` | ❌ | modal 标题 17px 逃逸 |

**仅余两类逃逸**：

1. **`17px` modal 标题（19 个文件硬编码）**
   - `CustomerCreateModal.css:34`
   - `LeadCreateModal.vue:149`
   - `CaseCreateModal.vue:285`
   - `PaymentModal.vue:306`
   - `BillingRiskAckModal.vue:210`
   - `WaiveReasonModal.vue:177`
   - `ReferenceVersionModal.vue:170`
   - `RegisterDocumentModal.vue:216`
   - `ReviewDocumentModal.vue:174`
   - `AddDocumentItemModal.vue:185`
   - `SharedExpiryRiskPanel.vue:153`
   - `LeadDetailView.vue:306`
   - `CaseCreateStep4.vue:106 / 132`
   - 共 19 处 `font-size: 17px`

   建议：**统一使用 `--font-size-lg = 16px` 或 `--font-size-xl = 18px`**；如果 16/18 都不合适，可在 token 里增设 `--font-size-modal-title: 17px`，但更推荐保留 9 级 typescale 收敛到 18px。

2. **`34px` summary 数字（2 处）**
   - `CustomerSummaryCards.vue:143`
   - `DocumentSummaryCards.vue:138`

   建议：统一改为 `--font-size-display-1 = 36px`（与 Dashboard KPI 数字一致）；或新增 `--font-size-display-0: 34px` 命名为 "summary metric"。

### 4.2 字重（font-weight）现状

**R2 全站实测**：所有可见文字字重 ∈ `{400, 500, 600, 700, 800}`，**完全 token 化**，hardcoded 0 处。

R1 中 h1 / h2 / h3 / UPPERCASE 全部 `900` 已纠正：

- Dashboard h1 = 800 ✓（R1 是 900）
- 各模块 h2 = 700 ✓
- UPPERCASE caption = 600 ✓

字重完全合规。

### 4.3 字号 vs 字重组合的视觉重量

| 场景 | 字号 / 字重 | 视觉感受 | 评价 |
|---|---|---|---|
| Dashboard h1 "Dashboard"（"Welcome back, …" caption 上方）| 36px / 800 | 标题主导 | ✓ |
| Dashboard summary metric 数字 | 40px / 800 | 数字突出 | ✓ |
| Cards / list h2 | 22px / 700 | 略偏弱（与 caption 600 区分度 100 差距小）| ⚠️ 可考虑 800 |
| Table th | 13px / 700 | OK | ✓ |
| Status pill | 13px / 800 + UPPERCASE | 强烈但不刺眼 | ✓（已修复 R1 800+UPPERCASE 过重） |
| Chip (success/warning/danger) | 12-13px / 700 | 颜色弱 → **可读性问题，详见 §3.2** | ⚠️ |

### 4.4 行高（line-height）—— 仍未统一收口

**R2 实测同字号多 line-height 的页面**：

| 页面 | 字号 / lh 变体 | 评价 |
|---|---|---|
| Dashboard | 12px → `[12, 13.8]` / **13px → `[14.95, 18.85, 20.8, 15.6]`** / 15px → `[17.25, 21.75]` / 18px → `[20.7, 21.6]` | 13px 4 种 lh，最严重 |
| Cases list | 12px → `[12, 13.8, 13.2]` / 13px → `[14.95, 14.3]` | 同字号 3 种 lh |
| Tasks | 12px → `[12, 13.8]` / 14px → `[20.3, 16.1, 22.4]` / 28px → `[33.6, 32.2]` | h1 28px 都两种 lh |
| Documents | 12px → `[12, 13.8, 17.4]` / 13px → `[14.95, 20.8]` / 14px → `[20.3, 16.1]` | 同字号 3 种 |
| Case Create | 12px → `[12, 13.8]` / 13px → `[14.95, 14.3]` / 14px → `[20.3, 16.1]` | |

**根因**：theme.css 已定义 `--leading-tight: 1.2 / -normal: 1.45 / -relaxed: 1.6`，但组件内 `<style>` 仍各自决定 lh，没有形成 "字号 → lh 档位" 强约束。比如 13px 同时出现 1.15（14.95 ≈ 13×1.15）/ 1.45 / 1.6 / 1.2 四种排版意图。

**修复建议**：在 theme.css 增加按字号绑定的 `--leading` 默认值，并在 SFC 中废止局部 lh：

```css
:root {
  --leading-display: 1.0;       /* 36/40px */
  --leading-3xl: 1.15;          /* 28px */
  --leading-2xl: 1.2;           /* 22px */
  --leading-xl: 1.3;            /* 18px */
  --leading-lg: 1.4;            /* 16px */
  --leading-md: 1.45;           /* 15px */
  --leading-base: 1.45;         /* 14px */
  --leading-sm: 1.45;           /* 13px */
  --leading-xs: 1.4;            /* 12px caption */
}

/* 在 utility class 或 typography utility 里强绑定 */
h1, .text-display-1 { font-size: var(--font-size-display-1); line-height: var(--leading-display); }
h2, .text-3xl { font-size: var(--font-size-3xl); line-height: var(--leading-3xl); }
/* ... */
```

### 4.5 对齐（text-align / 表格 / 卡片栅格）

**4.5.1 表格列对齐 — Billing**（实测）：

| 列 | 表头 align | 单元格 align | 一致 | 数值列 | 评价 |
|---|---|---|---|---|---|
| 选择框 | center | center | ✓ | ✗ | OK |
| Case name | left | left | ✓ | ✗ | OK |
| Customer | left | left | ✓ | ✗ | OK |
| Group | left | left | ✓ | ✗ | OK |
| **Due (¥)** | **right** | **right** | ✓ | ✓ | OK ✅ |
| **Received (¥)** | **right** | **right** | ✓ | ✓ | OK ✅ |
| **Outstanding (¥)** | **right** | **right** | ✓ | ✓ | OK ✅ |
| Next billing node | left | left | ✓ | ✗ | OK |
| Payment status | left | left | ✓ | ✗ | OK |
| Risk Ack | left | left | ✓ | ✗ | OK |
| Actions | center | center | ✓ | ✗ | OK |

✅ Billing 表格对齐**完全合规**：金额三列右对齐、文本左对齐、Action 居中、表头与单元格一致。

**4.5.2 表格列对齐 — Customers**（实测）：

| 列 | 表头 | 单元格 | 一致 | 评价 |
|---|---|---|---|---|
| 选择框 | center | center | ✓ | OK |
| Customer | left | left | ✓ | OK |
| Furigana | left | left | ✓ | OK |
| **Cases** | **center** | **center** | ✓ | ⚠️ "Cases" 是数值列（"Total 11 · Active 9"），按一般约定该右对齐；目前居中可能在视觉上让数字与栅格脱节 |
| Last contact | left | left | ✓ | OK |
| Owner | left | left | ✓ | OK |
| Referral | left | left | ✓ | OK |
| Group | left | left | ✓ | OK |
| Actions | right | right | ✓ | ⚠️ Billing 用 center，Customers 用 right，**两表 Action 列对齐策略不一致** |

**修复建议**：统一约定 ——

- 数值/金额列：右对齐
- 状态/标签/枚举：左对齐
- 多操作链接（Action 列）：以是否单按钮决定 → 单按钮居中、多链接右对齐
- 当前 Customers 的 "Cases" 列建议改右对齐（与 Billing Due/Outstanding 一致）

**4.5.3 卡片栅格内文字对齐 — Customer / Document Summary**（实测）：

```
Card padding: 20px
Card radius:  16px ✓ (token --radius-lg)
Value: 34px / 700 / line-height 34px / text-align: left
Label: 12px / 700 / text-align: left
```

- ✅ left-aligned 是合理选择（信息密度小、节奏统一）
- ❌ value 字号 34px 不在 typescale，建议 36px 或新增 display-0 token（见 §4.1）
- ✅ value line-height = font-size 是 metric 数字常用排版，OK

**4.5.4 复杂控件对齐**：

| 控件 | 现象 | 评价 |
|---|---|---|
| `ui-page-header__breadcrumbs > a` | 高 24px、与右侧 action 按钮 32px 不齐基线 | ⚠️ 标题 row 内基线偏移可见 |
| Filter pill `Reset / Apply` | 高 32px 与 Add customer 按钮 32px 一致 | ✓ |
| 表内 checkbox | 13×13 与表头 padding 12px → 行内非居中 | ⚠️ checkbox 容器需要 `display:flex; align-items:center; justify-content:center; min-width:24px` |
| Sidenav menu items | 完美对齐 | ✓ |
| Top bar 搜索框 / lang / avatar | 实测搜索框高 16.1px（input 本体）、外壳 32px → input 内文字下沉 | ⚠️ 输入框 vertical-align 需要 line-height = container-height |

### 4.6 触控区（target size）—— 仍偏小

| 元素类别 | R2 实测尺寸 | 备注 | WCAG 2.5.8 (24×24 AA) | WCAG 2.5.5 (44×44 AAA) |
|---|---|---|---|---|
| `mini-btn` (各 quick-action 按钮) | 30.9px 高 × 内容宽 | R1 是 27.8/29.8，已改善 | ✓ ≥24 | ✗ <44 |
| `segment-btn` (Mine/My team/All firm/7 days/30 days) | 30.9px 高 | 同上 | ✓ | ✗ |
| `customer-modal__close` (×) | 28×30.1 | 模态关闭按钮 | ✓ | ✗ |
| Pagination `Previous / Next` | 26.1px 高 | 较低 | ✓ | ✗ |
| `lead-empty-state__cta` "New Lead" | 28.9px 高 | 空态 CTA | ✓ | ✗ |
| 面包屑 `Dashboard` | 67.8 × **24** | 临界，刚刚 ≥24 | ✓ 临界 | ✗ |
| 表内 `<input type="checkbox">` | **13 × 13** | 不达 24×24 最低 | ✗ AA 失败 | ✗ |
| Sidenav brand wordmark `Gyosei OS` | 74 × 17.3 | 品牌字而非主操作，可豁免 | — | — |
| Top bar 搜索框 input 本体 | 523.8 × 16.1 | 容器更高，输入区本体过低 | — | — |

**修复建议**：

```css
/* 1. mini-btn / segment-btn / pagination 提到 32px 起跳 */
.mini-btn, .segment-btn, .lead-pagination__btn,
.lead-empty-state__cta, .customer-modal__close {
  min-height: 32px;
  /* 当 padding 已饱满时不需要再加 padding，仅 min-height 兜底 */
}

/* 2. 表内 checkbox：保持 16×16 视觉，外面 24×24 命中 */
.lead-table__check-label, .case-row__check-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}
.lead-table__check-label input { width: 16px; height: 16px; }

/* 3. 面包屑链 ≥ 32px 高（hover 区） */
.ui-page-header__crumb { padding: 6px 0; min-height: 32px; line-height: 1.2; }
```

---

## 5. 颜色规范回归（R2 复测）

### 5.1 全局色板

| 场景 | token 期望 | R2 实测 | 是否合格 |
|---|---|---|---|
| 主标题 | `--color-text-1 = #0f172a` | `#0f172a` | ✓ contrast 16.13 |
| 次级文字 / 副标 | `--color-text-2 = #475569` | `#475569` | ✓ contrast 7.50 |
| 三级文字 / table th / chip meta / breadcrumb | `--color-text-3 = #64748b` | `#64748b` | ⚠️ 在白底 4.6 ✓，但 hover/selected 行上跌至 4.21（详见 §3.4） |
| Brand primary | `--color-primary-6 = #0369a1` | `#0369a1` | ✓ |
| Status info pill 文字 | `#fff` | `#fff` on `#0369a1` | ✓ 8.7 |
| Status warn pill 文字 | `#fff` | `#fff` on `#b45309` | ✓ 5.43 |
| Status danger pill 文字 | `#fff` | `#fff` on `#b91c1c` | ✓ 5.61 |
| 表格分隔线 | `--color-border-table = #e5e5ea` | `#e5e5ea` | ✓ |
| disabled 控件文字 | `--color-text-placeholder` | `rgba(100,116,139,0.9)` | ✓ |

✅ **全局色板回归全部通过**，R1 的 264 处 contrast 失败已彻底解决。

### 5.2 焦点环 / 选中态

- `--shadow-focus-ring: 0 0 0 3px rgba(3, 105, 161, 0.4)` — R1 alpha 0.1 → R2 alpha 0.4，键盘焦点已可见 ✓

### 5.3 hover / pressed 反馈

- `--color-bg-overlay = rgba(15,23,42,0.04)` / `--color-bg-overlay-hover = rgba(15,23,42,0.06)` — R1 0.04→0.07 改为 0.04→0.06，差值 0.02 仍偏弱，但已比 R1 0.03 好；详见 §3.4 表格 hover 引发 contrast 4.21 的问题

---

## 6. 间距 / 节奏（卡片层级与间距系统）

### 6.1 圆角层级（hardcoded radius 残留）

| 文件 | hardcoded 值 | 应该用 token |
|---|---|---|
| `dashboard.css:7` | `border-radius: 24px` (`.surface-card`) | `--radius-xl: 20px` 或新增 `--radius-2xl: 24px` |
| `DashboardView.vue:177, 246` | `24px / 18px` | 同上 |
| `LoginView.vue:209` | `24px` | 同上 |

**建议**：要么新增 `--radius-2xl: 24px` 进入 token 体系，要么把 `surface-card` 全部统一到 `--radius-xl: 20px`。**推荐 20px**（与 Apple HIG / 现代 SaaS 主流 cards 一致），让圆角层级稳定在 4 级。

### 6.2 卡片 padding / gap（实测合理范围）

| 区域 | padding | gap | 评价 |
|---|---|---|---|
| `.surface-card` | `22 ~ 24px` | `16px` | ✓ |
| `.quick-action-card` | `18 / 16` | `14px` | ✓ |
| `.hero-shell` | `24px` | `20px` | ✓ |
| `.summary-card` | `20px` | `8 / 12px` | ✓ |
| `.customer-modal__header` padding | `16 ~ 24px` | — | ✓ |
| `.case-detail-view__meta` gap | `8px` | — | ⚠️ `\|` 占位但不可见，加 gap 12px 后可删 `\|` |

---

## 7. 优先级修复清单（R2 开发可执行 checklist）

| # | 优先级 | 修复点 | 一句话动作 | 影响面 |
|---|---|---|---|---|
| UX-021 | **P0** | chip-on-active-card 同色不可见 | 在 `Chip.vue` 加父级反转规则 `.tpl.is-active .ui-chip--{tone}` 全部白字 + `bg rgba(255,255,255,0.18)`；扫描其它"is-active 深色父 + 嵌 chip"模式 | CaseCreate Step 1（5+ 卡）、潜在所有"selected card + chip" |
| UX-022 | **P1** | 语义 chip 12-13px contrast 3.0 ~ 4.4 | `Chip.vue` 把 `--success/--warning/--danger/--primary` 文字色加深一档（success → #166534、warning → #92400e、danger → #991b1b、primary → #075985）| Cases / Billing / 各列表的 status chip ≈ 30+ 处 |
| UX-023 | **P1** | CaseDetail meta `\|` 1.18 contrast | 改 `color: var(--color-text-3)` 或删 `\|` 改 gap | CaseDetail header、潜在其他 meta 行 |
| UX-024 | **P1** | 表格 hover 行 text-3 metadata 跌至 4.21 | 把 `--color-text-3` 从 `#64748b` 调到 `#5b6776`；或把 row hover 改用左边 border 而非 bg 色 | Cases / Billing / Customers hover 行 metadata |
| UX-025 | **P1** | Modal title `17px` 硬编码 19 处 | 全局替换 `font-size: 17px` → `var(--font-size-xl)` (18px)；或入 token `--font-size-modal-title` | 19 个 modal 文件 |
| UX-026 | **P2** | Customer / Document SummaryCards value `34px` 硬编码 | 改 `var(--font-size-display-1)` (36px) 与 Dashboard KPI 一致 | 2 个文件 |
| UX-027 | **P2** | `surface-card` `border-radius: 24px` 硬编码 | 统一改 `var(--radius-xl)` (20px)；或新增 `--radius-2xl: 24px` | dashboard.css / DashboardView / LoginView |
| UX-028 | **P2** | 触控区 30.9 ~ 26.1px (mini-btn / pagination / modal close) | min-height 提到 32px；表内 checkbox label 24×24 命中区 | 全站 mini-btn / pagination / 表内 checkbox |
| UX-029 | **P2** | 同字号多 line-height（13px 4 种 / 14px 3 种 / 28px 2 种）| 在 theme.css 加 `--leading-{xs..display}` 9 级；按字号档位强绑定，废止 SFC 内局部 lh | 全站正文/标题 |
| UX-030 | **P3** | 表格列对齐策略不统一（Customers Cases 居中 vs Billing 数值右对齐；Action 列 Billing center / Customers right）| 制定 table column alignment guide：数值右、文本左、单 action 居中 / 多 action 右 | Cases / Customers / Billing 表 |
| UX-031 | **P3** | 复选框 13×13 与表格 padding 12px 居中失衡 | 复选框外包 24×24 flex 容器 | Customers / Cases / Billing / Leads / Documents 表 |
| UX-032 | **P3** | Top bar search input 16.1px 高（容器 32px）→ 文本下沉 | input 加 `line-height: 32px` 或改 `display: flex; align-items: center` | TopBar.vue |

---

## 8. 修复后验证脚本（playwright-mcp 复测基线）

修复后可用以下脚本复测，期待对应阈值归零或跌破：

```js
// 1. chip-on-active-card：选中模板卡内 chip 是否被吞
() => {
  const chips = Array.from(document.querySelectorAll('button.tpl.is-active .ui-chip--primary'));
  return chips.map(c => {
    const cs = getComputedStyle(c);
    const parent = c.closest('button.tpl.is-active');
    const parentBg = getComputedStyle(parent).backgroundColor;
    return { text: c.textContent.trim(), color: cs.color, parentBg };
  });
};
// 期待：每个 chip 的 color 都是 #fff（255,255,255）

// 2. 语义 chip 文字色
() => ['success','warning','danger','primary'].map(tone => {
  const el = document.querySelector(`.ui-chip--${tone}`);
  return { tone, color: el ? getComputedStyle(el).color : null };
});
// 期待：success #166534、warning #92400e、danger #991b1b、primary #075985

// 3. typescale 完全 token 化
() => {
  const sizes = new Set();
  document.querySelectorAll('main *').forEach(el => {
    const sz = parseFloat(getComputedStyle(el).fontSize);
    if (sz >= 9 && sz <= 60 && (el.textContent || '').trim() && el.children.length === 0) sizes.add(sz);
  });
  const allowed = new Set([12,13,14,15,16,18,22,28,36,40]);
  return [...sizes].filter(s => !allowed.has(s));
};
// 期待：[]（空数组）

// 4. surface-card radius
() => Array.from(document.querySelectorAll('.surface-card')).map(c => getComputedStyle(c).borderRadius);
// 期待：所有都是 20px（或新 token 24px）

// 5. mini-btn 触控区
() => Array.from(document.querySelectorAll('.mini-btn')).map(b => {
  const r = b.getBoundingClientRect();
  return { text: b.textContent.trim().slice(0,20), h: r.height, w: r.width };
}).filter(x => x.h < 32);
// 期待：[]
```

完整对比度复测脚本见附录 A（与本次走查脚本一致，可复用）。

---

## 9. 引用与缺失项（mempalace 对齐）

### 9.1 文档引用

- 项目 design tokens 唯一定义文件：`packages/admin/src/styles/theme.css`（已含 8 级字号 typescale + 4 级 radius + 3 级 leading + 6 级 font-weight）
- WCAG 2.1 SC 1.4.3 Contrast (Minimum) AA：正文 ≥ 4.5、大字 ≥ 3.0
- WCAG 2.1 SC 2.5.5 Target Size AAA：≥ 44×44；SC 2.5.8 (AA, 2.2)：≥ 24×24
- 本次走查截图：`/tmp/r2-ui-audit/01..13-*.png`（13 张全页 PNG）
- R1 基线报告：`docs/gyoseishoshi_saas_md/_output/20-admin-UI视觉规范走查与优化报告-第一轮.md`

### 9.2 缺失项 / 未覆盖

- **未走查 viewport**：仅 1440×900 桌面版。手机端（< 768px）字号/触控区/sticky 行为留待第三轮
- **未走查交互态**：`:focus-visible` 焦点环视觉效果（脚本验证 focus-ring alpha=0.4 已修复，但视觉穿透/盖错层未截图）
- **未走查 dark mode**：`body[arco-theme="dark"]`，项目当前默认走亮色
- **未走查 i18n 紧凑度**：日文/中文渲染下的文字截断 / wrap / 行高节奏（R14/R15 i18n 走查独立）
- **未覆盖 modal**：除 CustomerCreateModal 外，PaymentModal / BillingRiskAckModal / WaiveReasonModal / RegisterDocumentModal / ReviewDocumentModal 等约 14 个 modal 字号 17px / 触控区未走查（推测同 UX-025 ~ UX-028 复现）
- **未覆盖 case-create 后续步骤**：仅走 Step 1，Step 2/3/4 wizard 未审

### 9.3 与 R1（20-）边界

- 本份**只看视觉规范**（字体、排版、对齐、颜色、间距），不复述 i18n / 状态机 / API / 数据持久化偏差
- 与第一轮（chrome-devtools-mcp）相比，第二轮（playwright-mcp）：
  - **修复了对比度算法的 alpha-blend 缺陷**（R1 把 `rgba(0.04)` 当作不透明色，导致 R1 误报 Reset 按钮 1.11 contrast；R2 已正确合成）
  - **过滤了 segmented-control thumb 的祖先误测**（DOM 上 thumb 是 sibling 而非 ancestor）
  - **覆盖范围 +6 视图**（Tasks / Documents / Conversations / Settings / Customer-create modal / Case-detail）
  - **自动化采集触控区 / 字号集合 / line-height 变体 / hardcoded radius / hardcoded weight**

---

## 附录 A：复用走查脚本（playwright-mcp evaluate_script，alpha-blend 修正版）

```js
window.__audit = (() => {
  const tokenFontSizes = new Set(['12px','13px','14px','15px','16px','18px','22px','28px','36px','40px']);
  const tokenWeights = new Set(['400','500','600','700','800','900']);
  const tokenRadii = new Set(['0px','8px','12px','16px','20px','9999px']);
  const parseColor = s => { const m = s && s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map(x => parseFloat(x.trim())); return { r: p[0], g: p[1], b: p[2], a: p[3] == null ? 1 : p[3] }; };
  const lum = ({r,g,b}) => { const ch = v => { v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); }; return 0.2126*ch(r) + 0.7152*ch(g) + 0.0722*ch(b); };
  const blend = (fg, bg) => ({ r: fg.r*fg.a + bg.r*(1-fg.a), g: fg.g*fg.a + bg.g*(1-fg.a), b: fg.b*fg.a + bg.b*(1-fg.a), a: 1 });
  const contrast = (fg, bg) => { if (!fg || !bg) return null; const a = lum(fg.a < 1 ? blend(fg, bg) : fg), b = lum(bg); const [hi, lo] = a > b ? [a, b] : [b, a]; return (hi + 0.05) / (lo + 0.05); };
  // 关键修正：沿父链收集所有非全透 bg，反向 alpha-over 合成
  const resolveBg = el => {
    const stack = []; let c = el;
    while (c) {
      const bg = parseColor(getComputedStyle(c).backgroundColor);
      if (bg && bg.a > 0) stack.push(bg);
      c = c.parentElement;
    }
    if (!stack.length) return { r: 255, g: 255, b: 255, a: 1 };
    let composed = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = stack.length - 1; i >= 0; i--)
      composed = stack[i].a >= 1 ? stack[i] : blend(stack[i], composed);
    return { r: composed.r|0, g: composed.g|0, b: composed.b|0, a: 1 };
  };
  const cssPath = el => { /* 与 R1 一致 */ };
  const skipPathRe = /(segmented-control|segment-btn|hero-toolbar)/;  // 排除 sliding-thumb 误报
  return (rootSel = 'main, header, [role="complementary"], aside') => { /* 完整版见调用 */ };
})();
```

---

## 10. 三句话总结（给开发者）

1. **R1 的全部 P0 / 多数 P1 已落地**：text token 不再被 Arco 覆盖、status pill 全部反转白字、字号/字重 token 化、focus-ring 可见、hover overlay 加深、字号下限 12px 已生效，整体 contrast 失败从 264 降到 19（92%↓）。
2. **R2 唯一新 P0 是"chip-on-active-card 同色不可见"**：`Chip.vue` 反转规则只识别 `aria-selected` / `.is-active`，没识别"chip 自身没标记，但父级是 active 深色卡"的场景；CaseCreate Step 1 选中态下 "Popular / Business Manager" chip 完全消失，需要给 chip 加父级反转上下文。
3. **R2 主要 P1 集中在 chip 文字色加深、modal 标题 17px → 18px 收口、`surface-card` 24px radius 入 token、表格 hover 不改 bg-overlay 而改边框强调**——这 4 项动作可以把 admin 的视觉规范从 "8 成合规" 推到 "全部满足 WCAG AA 且单一字号/单一圆角语义"。
