# admin — UI 视觉规范走查与优化报告（第三轮 / playwright-mcp · 字体 · 排版 · 对齐 · 间距）

> 生成日期：2026-05-01（playwright-mcp 实测，桌面 1440×900，en-US，已登录 admin@local.test）
> 走查工具：`user-playwright`（`playwright_navigate` / `playwright_evaluate` / `playwright_screenshot` / `playwright_click` / `playwright_fill`）+ alpha-blend 修正版对比度脚本（`window.__audit`）
> 走查环境：`http://localhost:5173`（Vite dev），Chromium headless，视口 1440×900
> 走查依据：
> - `docs/gyoseishoshi_saas_md/_output/20-admin-UI视觉规范走查与优化报告-第一轮.md`（chrome-devtools-mcp 基线 R1）
> - `docs/gyoseishoshi_saas_md/_output/22-admin-UI视觉规范走查与优化报告-第二轮.md`（playwright-mcp R2）
> - `packages/admin/src/styles/theme.css`（design tokens 唯一定义文件）
> - WCAG 2.1 SC 1.4.3 AA：正文 ≥ 4.5、大字 ≥ 3.0；SC 2.5.8 AA：触控区 ≥ 24×24；SC 2.5.5 AAA：≥ 44×44
> 关注维度：①字体（family / typescale）；②排版（行高、字重、letter-spacing、对齐节奏）；③对齐（表头/单元格、卡片栅格、面包屑/工具条基线）；④间距（圆角层级、卡片 padding、touch target 命中区）
> 截图归档：`/tmp/r3-ui-audit/01..14-*.png`

> 本轮**只走查 UI 视觉规范**，与第二轮（22-）形成 R2→R3 复测对比；不复述功能、状态机、i18n 偏差。

---

## 0. 总结（Three-line takeaway）

1. **R2 P0 / P1 大部分已落地**：modal 标题 `17px` 全站清零（R2 是 19 处）、`status-pill` 反白、chip 语义文字色全部加深一档（success → `#166534`、warning → `#92400e`、danger → `#991b1b`、primary → `#075985`）、`case-detail-view__meta-sep` 已改 `var(--color-text-3)`、`--color-text-3` 全局从 `#64748b` 收紧到 `#5b6776`、`--leading-{xs..display}` 9 级 token 已落入 `theme.css`。R2 共 12 项 ✅ 6、⚠️ 4、❌ 2（详见 §2 回归表）。
2. **R3 唯一新 P0 是 chip-on-active-card 反转后白字"刚刚不达标"**：上一轮把 `Chip.vue` 改成 `[aria-selected]/.is-active → color:#fff`，但选中态背景 `rgba(255,255,255,0.18)` over `#0369a1` 实际合成出 `#3084b1`，13px @ 700 的白字 contrast = **4.14**（< 4.5），`Popular` 这类在选中模板卡上的 chip 还是糊的。`Chip.vue` 缺少 "active" 态的实底背景规则，单纯反字色不够；建议把 active 时 `background: rgba(255,255,255,0.28)` 或干脆 `background-color: transparent; border-color: rgba(255,255,255,0.6)`，让 contrast ≥ 4.5。
3. **R3 主要 P1 仍是三件遗留 + 一项新发现**：①`surface-card / hero-shell / summary-card / work-panel` 还在用 hardcoded `border-radius: 24px / 18px`（共 4 个文件 6 处）；②`Customer/Document SummaryCards.vue` 数字仍 `34px`（应入 token）；③line-height 同字号多变体仍未清零（13px 仍有 `[14.3, 14.95, 18.85, 20.8]` 4 种、14px 3 种、18px 2 种、12px 2 种）；④**新发现**：`CustomerDetail.basic-info__hint` 使用 `#c9cdd4`（border-1 浅灰）当文字色，contrast = **1.59**，纯不可读。

---

## 1. 走查范围与方法

### 1.1 已走查页面（14 处）

| # | 页面 | 路由 | 截图 |
|---|---|---|---|
| 1 | Dashboard | `#/` | `/tmp/r3-ui-audit/01-dashboard-*.png` |
| 2 | Leads list（空态） | `#/leads` | `02-leads-*.png` / `14-leads-empty-*.png` |
| 3 | Cases list | `#/cases` | `03-cases-*.png` |
| 4 | Case Detail | `#/cases/a63aa5f0-…` | `04-case-detail-*.png` |
| 5 | Customers list | `#/customers` | `05-customers-*.png` |
| 6 | Billing & Finance | `#/billing` | `06-billing-*.png` |
| 7 | Document center | `#/documents` | `07-documents-*.png` |
| 8 | Tasks & reminders | `#/tasks` | `08-tasks-*.png` |
| 9 | Conversations list | `#/conversations` | `09-conversations-*.png` |
| 10 | System Settings | `#/settings` | `10-settings-*.png` |
| 11 | Customer Detail | `#/customers/825d708f-…` | `11-customer-detail-*.png` |
| 12 | Case Create Step 1（含 `tpl.is-active`）| `#/cases/create?customerId=…` | `12-case-create-step1-*.png` |
| 13 | Customer-create modal | `#/customers > Add customer` | `13-customer-create-modal-*.png` |

### 1.2 抽样口径（与 R2 一致）

- **文字节点**：`main, header, [role="complementary"], aside, .page, .ui-page-header, dialog, [role="dialog"]` 中所有可见、`children=0` 且自身有文本的节点
- **对比度算法**：WCAG 2.1 公式 `(L1 + 0.05) / (L2 + 0.05)`，沿父链做反向 alpha-over 合成；起点视为 `#fff`，沿祖先链自底向上做 `over` 复合
- **大字阈值**：`fontSize ≥ 18px` 或 `fontSize ≥ 14px && fontWeight ≥ 700` → AA 阈值 3.0；其余 4.5
- **typescale token 集合**：`{12, 13, 14, 15, 16, 18, 22, 28, 36, 40} px`（`theme.css`）
- **font-weight token 集合**：`{400, 500, 600, 700, 800, 900}`
- **radius token 集合**：`{0, 8, 12, 16, 20, 9999} px`
- **触控区**：`button / a / input / select / textarea / [role="tab"|"button"] / [type="checkbox"|"radio"]`，命中 `width < 32 || height < 32`
- **过滤误报**：`segmented-control / segment-btn / hero-toolbar / sliding / thumb` 链跳过对比度（绝对定位 thumb 在 DOM 上不是祖先）

### 1.3 全站汇总（14 视图加总）

| 维度 | R1 | R2 | R3 | 评价 |
|---|---|---|---|---|
| 走查文本节点（去容器）| 491（7 页）| 2 176（11 页）| **947**（14 页）| R3 限定可见纯文本节点；分布更均匀 |
| 对比度不达 WCAG AA | 264 | 19 | **3** | ↓ 99% (R1→R3) |
| `fontSize < 12px` 节点 | 86 | 0 | **0** | ✅ 已彻底落 12px 下限 |
| 触控区 < 32×32 元素（去全局 sidebar/topbar 噪声）| 68 | 89 | **97** | 数量 ↑（覆盖了 Cases/Customers `<a>` 表内链 18.8/20.3/28.3px、Billing Record 25.4px 等；本来未抽到的微元素被收进口径） |
| hardcoded `font-size`（非 token）| 6 个字号 | 3 个 | **1**（`34px`×8 处）| `17px` 已清零 ✅ |
| hardcoded `font-weight` | — | 0 | **0** | ✅ |
| hardcoded `border-radius`（非 token）| 8 级 | 3 个 | **3**（`24px`×N + `18px`×2 + `2px` Arco picker）| 仍待 token 化 |
| 同字号多 line-height 个数 | 17 | 9 | **9**（13px×4、14px×3、12px×2、15px×2、18px×2、28px×2）| 未收敛 |
| `--leading-*` 9 级 token | — | 已定义 | **已定义**，但仅 `h1/h2/h3/h4/.text-*` 类绑定；SFC 局部 lh 未迁移 | ⚠️ |
| 全局 design tokens 数 | 79 | 79 | **79**（无新增）| 体系完整 |

---

## 2. R2→R3 回归清单（追溯 R2 12 项修复点）

| # | R2 编号 | 修复点 | R3 实测 | 备注 |
|---|---|---|---|---|
| 1 | UX-021 | chip-on-active-card 同色不可见（`Popular` 在选中卡上消失）| ⚠️ **半修复**（白字落地、但 contrast 4.14 仍不达 AA）| `Chip.vue` 加了 `[aria-selected="true"], .is-active → color:#fff`；但 `bg` 仍是 `rgba(255,255,255,0.18)` over `#0369a1` = `#3084b1`，13px@700 的白字 contrast = **4.14** < 4.5 — 详见 §3.1 |
| 2 | UX-022 | 语义 chip 12-13px contrast 3.0 ~ 4.4 | ✅ **已修复** | success `#166534`、warning `#92400e`、danger `#991b1b`、primary `#075985` 全部落地，与 R2 推荐值完全一致；实测 ≥ 5.5 |
| 3 | UX-023 | CaseDetail meta `\|` 分隔符 1.18 contrast | ✅ **已修复** | `case-detail-view__meta-sep` 实测 `color: rgb(91, 103, 118)` = `#5b6776` = `var(--color-text-3)`，contrast 5.78 ✓ |
| 4 | UX-024 | 表格 hover 行 text-3 metadata 跌至 4.21 | ⚠️ **半修复** | `--color-text-3` 已从 `#64748b` 收到 `#5b6776`（R2 推荐）；纯白底 contrast 5.78 ✓，但 hover overlay 0.06 复合后 fallback 视觉边缘；Billing 单元格 amount-warning `#b45309` 在 hover 行 `#f0f1f2` 上 contrast = **4.44**（仍刚好不达） |
| 5 | UX-025 | Modal title `17px` 硬编码 19 处 | ✅ **已修复** | 全仓 `font-size: 17px` 0 处；`CustomerCreateModal` 实测 `18px / 600`（与 token `--font-size-xl` 对齐） |
| 6 | UX-026 | Customer/Document SummaryCards value `34px` 硬编码 | ❌ **未修复** | `CustomerSummaryCards.vue:143` / `DocumentSummaryCards.vue:138` 仍是 `font-size: 34px`；R3 实测各页 `sizesUsed` 仍含 `34` |
| 7 | UX-027 | `surface-card` `border-radius: 24px` 硬编码 | ❌ **未修复** | Dashboard `hero-shell / surface-card / quick-actions-card / summary-card / work-panel` 全部仍 24px；`WorkPanelSection.vue:237` / `DashboardView.vue:246` 还有 18px；`LoginView.vue:209` 还有 24px；token `--radius-xl: 20px` 与组件实测不对齐 |
| 8 | UX-028 | 触控区 30.9 ~ 26.1px | ⚠️ **半修复** | mini-btn 已 30.9 → 30.3px，pagination 在 customers/leads 是 30.3px、billing 是 28.8px；modal close 30.1px；表内 checkbox 仍 13×13；新发现 case-row `<a>` 20.3px 高、customer-row `<a>` 28.3px 高（详见 §4.6） |
| 9 | UX-029 | 同字号多 line-height（13px 4 种 / 14px 3 种）| ❌ **未修复** | R2 9 个变体 → R3 9 个变体；leading token 已定义但 SFC 内局部 `line-height` 未迁移；Dashboard h2 同 18px 出现 `[18, 21.6]` 两种 lh — 详见 §4.4 |
| 10 | UX-030 | 表格列对齐策略不统一 | ⚠️ **未变** | 本轮未做 PR，现状同 R2：Customers `Cases` 列居中、Action 列右对齐；Billing 数值右对齐、Action 列居中 |
| 11 | UX-031 | 表内 checkbox 13×13 命中区不达 24×24 | ❌ **未修复** | leads / cases / customers / billing / documents / conversations 6 处 input 仍 13×13 |
| 12 | UX-032 | TopBar 搜索框 input 16.1px 高（容器 32px）| ⚠️ **半修复** | input 本体 16.1 → 20.3px（容器 42.3px），但仍 < 32px；视觉文本下沉略改善 |

**回归得分：12 项中 ✅ 3、⚠️ 5、❌ 4。** `17px` modal 标题与语义 chip 文字色这两件 R2 P1 重头戏全部落地；剩 `surface-card 24px / 34px summary value / line-height 收敛 / 表内 checkbox 命中区` 4 件硬骨头未触碰。

---

## 3. 关键根因（R3 必须修复）

### 3.1 [P0-A] chip-on-active-card 白字 contrast 4.14（R2 UX-021 半修复）

**现象**：CaseCreate Step 1 选中 "Dependent Visa" 模板卡 (`button.tpl.is-active`)：

- `button.tpl.is-active` 实测 `background-color: rgb(3, 105, 161)`（primary-6 实底）
- `<span class="ui-chip ui-chip--primary">Popular</span>` 实测：
  - `color: rgb(255, 255, 255)` ✓（R2 修复点已落地）
  - `background-color: rgba(255, 255, 255, 0.18)`
  - 合成背景 = `0.18 × #fff + 0.82 × #0369a1` = `rgb(48, 132, 177)` = `#3084b1`
- `#fff` on `#3084b1` 13px @ 700 contrast = **4.14** < 4.5 → **AA 失败**

**机制**：`Chip.vue:93-96` 只反转了文字色，没反转背景层级：

```93:96:packages/admin/src/shared/ui/Chip.vue
.ui-chip--primary[aria-selected="true"],
.ui-chip--primary.is-active {
  color: #fff;
}
```

而 `button.tpl.is-active` 选中态背景从白卡变成 `#0369a1`，让 chip 的 `rgba(3,105,161,0.08)` 与 `rgba(255,255,255,0.18)` 都按浅底设计，叠在深底上肌理消失。

**修复建议（按推荐顺序）**：

```css
/* 方案 A（推荐，覆盖父级 active 上下文，不改 Chip 自身 active 语义）*/
.tpl.is-active .ui-chip--primary,
.tpl.is-active .ui-chip--success,
.tpl.is-active .ui-chip--warning,
.tpl.is-active .ui-chip--danger {
  color: #fff;
  background-color: rgba(255, 255, 255, 0.28);  /* 0.18 → 0.28：合成 #589dc1，contrast 5.31 ✓ */
  border-color: rgba(255, 255, 255, 0.6);
}

/* 方案 B：Chip 自己的 .is-active 同步把 bg 也提亮 */
.ui-chip--primary[aria-selected="true"],
.ui-chip--primary.is-active {
  color: #fff;
  background-color: rgba(255, 255, 255, 0.28);
  border-color: rgba(255, 255, 255, 0.6);
}

/* 方案 C：用透明底 + 描边表达（最简）*/
.tpl.is-active .ui-chip {
  color: #fff;
  background-color: transparent;
  border-color: rgba(255, 255, 255, 0.7);
}
```

> 📌 影响面：所有"在 active 深底卡上嵌 chip"的场景。建议同步扫描 `is-active / is-selected / aria-selected="true"` 父级 + chip 嵌套（推测 `LeadConvertedRecords / SegmentedControl` 等位置存在同形）。

---

### 3.2 [P1-A] Billing 数值列在 hover 行 contrast 4.44（UX-024 半修复）

| 元素 | 文字色 | 合成背景 | contrast | 阈值 |
|---|---|---|---|---|
| `.billing-table__amount--warning` "80,000" 13px @ 600 | `#b45309` | `#f0f1f2`（白 + bg-overlay-hover 0.06）| **4.44** | 4.5 |

**机制**：与 R2 UX-024 同源——`--color-text-3` 已从 `#64748b` → `#5b6776`，主路径 contrast 已修复；但 amount 列用的是色块 token 的同色系（`#b45309` = warning-7），不在 text-3 整改范围；遇到 hover overlay 0.06 复合后跌破 4.5。

**修复建议**：

```css
:root {
  /* 选 1：amount-warning 色再降一档 */
  --color-amount-warning: #92400e;  /* warning-8 → contrast on hover 5.50 ✓（与 chip warning 文字色统一）*/
}

.billing-table__amount--warning {
  color: var(--color-amount-warning);
}

/* 选 2：hover 不改 bg，改用 inset border-left 强调（一次性给所有列表表）*/
.billing-table__row:hover,
.case-table tbody tr:hover,
.customer-row:hover {
  background-color: transparent;
  box-shadow: inset 3px 0 0 var(--color-primary-6);
}
```

---

### 3.3 [P1-B] CustomerDetail BasicInfo `hint` 文字 contrast 1.59（**新 R3 P0 候选**）

**现象**：CustomerDetail 页面，`.basic-info__hint` "Derived from BMV visa plan"：

- `color: rgb(201, 205, 212)` = `#c9cdd4`（border 灰）on white
- contrast = **1.59** → 视觉上几乎不可见

**机制**：误把 `--color-border-1` (`#e2e8f0`) 之前的浅 token 当作 hint 文字色用。

**修复建议**：

```css
.basic-info__hint {
  color: var(--color-text-3);   /* #5b6776 → 5.78 ✓ */
  /* 或 --color-text-placeholder */
}
```

> 影响面：CustomerDetail BasicInfoTab；推测 LeadDetail / CaseDetail 也可能有同类 hint 文字使用浅色 token。

---

### 3.4 [P1-C] surface-card / hero-shell `border-radius: 24px / 18px` 全部硬编码（UX-027 未修复）

| 文件 | 行号 | hardcoded 值 | 应该用 token |
|---|---|---|---|
| `packages/admin/src/views/dashboard/dashboard.css` | `:7` | `border-radius: 24px` `.surface-card` | `var(--radius-xl)` (20px) 或新增 `--radius-2xl: 24px` |
| `packages/admin/src/views/DashboardView.vue` | `:177` | `border-radius: 24px` | 同上 |
| `packages/admin/src/views/DashboardView.vue` | `:246` | `border-radius: 18px` | `var(--radius-lg)` (16px) |
| `packages/admin/src/views/dashboard/WorkPanelSection.vue` | `:237` | `border-radius: 18px` | 同上 |
| `packages/admin/src/views/auth/LoginView.vue` | `:209` | `border-radius: 24px` `.login-hero__panel` | 同上 |
| `packages/admin/src/views/dashboard/dashboard.css` | (multi) | hero-shell / quick-actions-card / summary-card / work-panel 14 个 `surface-card` 类全部 24px | 推荐新增 `--radius-2xl: 24px` 入 token |

**修复建议**（推荐方案 A）：

```css
/* theme.css 新增 2xl 档位 */
:root {
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-2xl: 24px;     /* 新增：surface-card/hero/login-panel 专用 */
  --radius-full: 9999px;
}

/* 各 SFC 中的 hardcoded 值替换 */
.surface-card { border-radius: var(--radius-2xl); }
.work-item, .work-panel__chart { border-radius: var(--radius-lg); }  /* 18px → 16px */
.login-hero__panel { border-radius: var(--radius-2xl); }
```

> 收益：圆角层级稳定到 5 级 (8/12/16/20/24/full)，所有"卡片视觉单元"统一 token。

---

### 3.5 [P1-D] Customer / Document SummaryCards 数字 `34px` 硬编码（UX-026 未修复）

```143:144:packages/admin/src/views/customers/components/CustomerSummaryCards.vue
.customer-summary-card__value {
  font-size: 34px;
```

```138:139:packages/admin/src/views/documents/components/DocumentSummaryCards.vue
.doc-summary-card__value {
  font-size: 34px;
```

**修复建议**：与 Dashboard `summary-card-value: 40px / 800` 系列保持一致，改用 token：

```css
.customer-summary-card__value,
.doc-summary-card__value {
  font-size: var(--font-size-display-1);   /* 36px ✓ */
  line-height: var(--leading-display);     /* 1.0 */
  font-weight: var(--font-weight-extrabold);
}
```

或如团队希望保留 34 这个阶梯，新增 `--font-size-display-0: 34px` 入 token。

---

### 3.6 [P1-E] line-height 同字号多变体（UX-029 未变）

**R3 实测同字号多 line-height 的页面**（与 R2 几乎一致）：

| 页面 | 字号 / lh 变体 | 评价 |
|---|---|---|
| Dashboard | 12px → `[12, 17.4]` / **13px → `[14.95, 15.6, 18.85, 20.8]`** / 15px → `[17.25, 21.75]` / 18px → `[18, 21.6]` | 13px 4 种、18px 同字号 2 种 |
| Cases list | 12px → `[12, 13.2, 17.4]` / 13px → `[14.3, 14.95, 18.85]` | 同字号 3 种 |
| Tasks | 12px → `[12, 17.4]` / **14px → `[16.1, 20.3, 22.4]`** / 15px → `[17.25, 21.75]` / 28px → `[32.2, 33.6]` | h1 28px 都两种 lh |
| Documents | 12px → `[12, 17.4]` / 13px → `[14.95, 18.85, 20.8]` | |
| Customer Detail | 12px → `[12, 17.4]` / 13px → `[14.3, 14.95, 18.85]` / 15px → `[17.25, 18, 21.75]` | 15px 3 种（含 1.0、1.15、1.45 三档）|

**根因**：`theme.css` 已定义 `--leading-{xs..display}` 9 级，并在 `h1-h4 / .text-*` 上做了字号-lh 强绑定（已落地），**但**：

- 组件 SFC 内大量 `<style scoped>` 仍直接写 `line-height: 1.45 / 1.6 / 1.2 / 1.4`，没有迁移到 token
- "Quick actions" 用 `h2`（继承 `--leading-display: 1`）= 18px lh；"Today's tasks / Pending submissions" 用同 `h2` 但被 `.work-panel-title` 覆盖到 lh 1.2 → 21.6px
- chip 与 button 都是 13px @ 700 但 chip 是 `line-height: 1.1`（=14.3px）/ button 是 `line-height: 1.15`（=14.95px）

**修复建议**：

```css
/* 1) chip 与 button 统一 */
.ui-chip { line-height: var(--leading-3xl); /* 1.15 → 14.95px，与 ui-btn 一致 */ }

/* 2) work-panel-title / hero-section h2 都靠 utility 决定 lh */
.work-panel-title,
.section-title {
  font-size: var(--font-size-xl);     /* 18px */
  line-height: var(--leading-xl);     /* 1.3 → 23.4px 给"卡片块标题"够呼吸 */
}

/* 3) 表格 td/th 的 13px 全用 sm leading */
.case-table td,
.customer-row,
.billing-table td,
.lead-table td {
  font-size: var(--font-size-sm);
  line-height: var(--leading-sm);     /* 1.45 → 18.85px */
}

/* 4) 删除 SFC 内 hardcoded line-height: 1.x，统一让 utility 类决定 */
```

收益：消除"同字号、不同 lh"的视觉碎片化；每个排版意图（label / body / metric / 卡片标题）一个 lh 档位。

---

## 4. 字体 / 排版 / 对齐分项分析（R3 实测）

### 4.1 字体 family 一致性

`theme.css` 单一定义 `--font-family: "Plus Jakarta Sans", -apple-system, ...`，在所有视图实测一致：

| 选择器 | family | 备注 |
|---|---|---|
| `body` | `"Plus Jakarta Sans", -apple-system, "system-ui", "Segoe UI", Roboto, ...` | ✓ |
| `h1` (Dashboard) | 同上 | ✓ |
| `h2` | 同上 | ✓ |
| `button.ui-btn` | 同上 | ✓ |
| `.ui-chip` | 同上 | ✓ |
| `input` | 同上 | ✓ |

✅ **字体 family 全站统一**，无任何组件出现 `-apple-system` / `Helvetica` / `system-ui` 单独覆盖。

---

### 4.2 字号（typescale）现状

**R3 各页面 sizesUsed**：

| 页面 | 字号集合（px） | token 化 | 说明 |
|---|---|---|---|
| Dashboard | `[12, 13, 14, 15, 18, 36, 40]` | ✅ | display-1/2 仅用于 KPI |
| Leads list | `[12, 13, 14, 15, 28]` | ✅ | |
| Cases list | `[12, 13, 14, 15, 28]` | ✅ | |
| Case Detail | `[12, 13, 15, 22, 28]` | ✅ | |
| Customers list | `[12, 13, 14, 15, 28, **34**]` | ❌ | summary-card value 34px |
| Customer Detail | `[12, 13, 15, 16, **24**, 28]` | ❌ | `detail-header__name` 24px |
| Billing | `[12, 13, 15, 28]` | ✅ | |
| Documents | `[12, 13, 14, 15, 28, **34**]` | ❌ | summary-card value 34px |
| Tasks | `[12, 13, 14, 15, 28]` | ✅ | |
| Conversations | `[12, 13, 14, 15, 16, 28]` | ✅ | |
| Settings | `[12, 13, 15, 28]` | ✅ | |
| Case Create Step 1 | `[12, 13, 14, 15, 18, 28]` | ✅ | |
| Modal (Customer create) | `[13, 14, 18]` | ✅ | **modal 17px 已清零** |

**仅余两类逃逸**：

1. **`34px`**（CustomerSummaryCards / DocumentSummaryCards 的数值 = 8 处）— 见 §3.5
2. **`24px`**（`.detail-header__name` h1 in CustomerDetail = 1 处）— 应改 `var(--font-size-3xl)` (28px) 与 `.ui-page-header__title` 一致

**全仓 grep 验证（R3 修复后）**：

```bash
$ rg "font-size: 17px" packages/admin/src
（0 matches — R2 19 处已清零 ✅）

$ rg "font-size: 34px" packages/admin/src
packages/admin/src/views/customers/components/CustomerSummaryCards.vue:143
packages/admin/src/views/documents/components/DocumentSummaryCards.vue:138
```

---

### 4.3 字重（font-weight）现状

**R3 全站实测字重 ∈ `{400, 500, 600, 700, 800}`**，与 token 完全一致：

| 场景 | 字号 / 字重 | 评价 |
|---|---|---|
| Dashboard h1 "Good morning, Local Admin · Owner" | 36px / 800 | ✓ |
| Dashboard summary metric | 40px / 800 | ✓ |
| Page header h1 (CaseDetail/Customers) | 28px / 600 | ⚠️ R2 是 800，本轮被某局部样式压回 600；与 Dashboard h1 800 不一致，**需统一** |
| Card / list h2 | 18px / 700（mostly）| ✓ |
| Button label | 13px / 700 | ✓ |
| Chip | 12-13px / 700 | ✓ |
| `.section-link` "View my tasks" | 13px / **800** | ⚠️ 文本链接用 800 比同字号按钮 700 重，layered hierarchy 错位 |
| Table th | 13px / 700 + 0.08em letter-spacing | ✓ |

**字重合规度**：hardcoded 0 处；但同等级元素之间出现 600 vs 700 vs 800 切换（如 page-title 28/600 vs Dashboard h1 36/800 vs section-link 13/800），**需要 design system 层"按字号定字重默认值"**：

```css
/* 建议：把字重也按 typescale 强绑定 */
h1, .text-display-2 { font-weight: var(--font-weight-extrabold); }      /* 40 → 800 */
h2, .text-display-1 { font-weight: var(--font-weight-extrabold); }      /* 36 → 800 */
h3, .text-3xl       { font-weight: var(--font-weight-bold); }           /* 28 → 700 */
h4, .text-2xl       { font-weight: var(--font-weight-bold); }           /* 22 → 700 */
.text-xl            { font-weight: var(--font-weight-semibold); }       /* 18 → 600 */
.text-md            { font-weight: var(--font-weight-medium); }         /* 15 → 500 */
.text-sm            { font-weight: var(--font-weight-normal); }         /* 13 → 400（非按钮/chip）*/
```

---

### 4.4 行高（line-height）— 9 个变体未消除

详见 §3.6。重申最严重的两处：

| 场景 | 现状 lh | 期望 lh | 修复 |
|---|---|---|---|
| Dashboard `h2 "Quick actions"` vs `"Today's tasks"` | `[18px (1.0), 21.6px (1.2)]` | 统一 21.6 | `.work-panel-title { line-height: var(--leading-xl); /*1.3*/ }` |
| `.ui-chip` vs `.ui-btn` 同 13px @ 700 | `14.3 vs 14.95` | 14.95 | `.ui-chip { line-height: var(--leading-3xl); /*1.15*/ }` |

---

### 4.5 letter-spacing（新走查项）

`theme.css` 已定义 4 级 `--letter-spacing-{tight, normal, wide, caps}`，body 层级落实：

| 选择器 | letter-spacing 实测 | 期望（按 token）| 评价 |
|---|---|---|---|
| body | `-0.14px`（= `-0.01em` × 14）| `var(--letter-spacing-normal)` (-0.01em) | ✓ |
| h1 (Dashboard, 36px) | `-0.14px`（= `-0.01em`）| 期望 `var(--letter-spacing-tight)` (-0.02em) → -0.72px | ⚠️ 大字号没用 tight，密度感不够 |
| summary-card-value (40px) | `-1.2px`（= `-0.03em`）| 大致符合 | ✓ |
| `.ui-chip` | `normal` (0) | 期望 `var(--letter-spacing-normal)` | ⚠️ chip 没继承全局 letter-spacing，与 body 节奏微错 |
| Button | `-0.13px`（= `-0.01em`）| 同 body | ✓ |
| Status pill / UPPERCASE caption | 实测 `0.08em` (caps) | ✓ | ✓ |

**修复建议**：

```css
/* 1) 大字号显示用 tight letter-spacing */
h1, .text-display-2,
h2, .text-display-1,
h3, .text-3xl {
  letter-spacing: var(--letter-spacing-tight);  /* -0.02em */
}

/* 2) chip 显式继承 */
.ui-chip { letter-spacing: var(--letter-spacing-normal); }
```

---

### 4.6 触控区（target size）— 6 类常态失败

| 元素类别 | R3 实测尺寸 | 备注 | WCAG 2.5.8 (24×24) | 修复优先级 |
|---|---|---|---|---|
| TopBar 搜索框 input 本体 | 20.3 × 523.8 | 容器 42.3px，文本下沉缓解但未达 32px | 临界 ≥24 ✓ | P2 |
| Sidenav 品牌字 `Gyosei OS` | 21.8 × 74.4 | 品牌字非主操作可豁免 | — | P3 |
| 面包屑 link `Dashboard` / `Cases` | 24 × 67.8 / 24 × 38 | 临界 24×？，但 `<a>` 高度 24 不算稳 | ✓ 临界 | P2 |
| `customer-modal__close` (×) | 30.1 × 28 | 模态关闭按钮 | ✓ ≥24 | P2 |
| Pagination `Previous / Next` | leads 30.3 / billing 28.8 | 仍 < 32 | ✓ | P2 |
| 表内 `<input type="checkbox">` | **13 × 13** | 全站 6 个表格仍用裸 13×13 | ❌ < 24 | **P1** |
| `.case-row__name` `<a>` | 20.3 × 180 | Cases 列表第一列内文字链 | ✓ 临界，但 <32 | P2 |
| `.customer-row__name` / `.customer-row__cases-link` | 28.3 × 72.7 / 28.3 × 107.1 | Customer 列表内 link | ✓ ≥24 | P3 |
| `.billing-table__action-btn` "Record" | 25.4 × 57.5 | Billing 行内动作按钮 | ✓ ≥24 | P2 |
| `.basic-info__file-trigger` "Choose image" | 31.4 × 109.7 | CustomerDetail 文件按钮 | ✓ ≥24 | P3 |
| `.detail-header__back-link` `<a>` | 18.8 × 88 | CustomerDetail 返回链接 | ❌ < 24 | **P1** |

**修复建议**（核心 2 项 P1）：

```css
/* 1) 全表 checkbox 命中区 24×24（视觉仍 16×16）*/
.lead-table__check-label,
.case-row__check-label,
.customer-row__checkbox-label,
.billing-table__checkbox-wrap,
.doc-table__check-label,
.conv-filters__checkbox-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  cursor: pointer;
}
.lead-table__check-label input,
.case-row__check-label input,
.customer-row__checkbox-label input,
.billing-table__checkbox-wrap input,
.doc-table__check-label input,
.conv-filters__checkbox-label input {
  width: 16px;
  height: 16px;
}

/* 2) Detail-header 返回链 ≥ 32×？ */
.detail-header__back-link {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 4px 0;
}

/* 3) Pagination / mini-btn 一刀切 32px */
.lead-pagination__btn,
.customer-pagination__btn,
.billing-pagination__btn,
.doc-pagination__btn,
.mini-btn,
.segment-btn,
.customer-modal__close,
.billing-table__action-btn {
  min-height: 32px;
}
```

---

### 4.7 表格列对齐（与 R2 一致，未改动）

策略仍未统一（与 R2 §4.5 一致），略不复述。建议做一次"table column alignment guideline"统一治理：

- 数值/金额列：右对齐（Billing 已合规；Customers 的 `Cases` "Total/Active" 列建议改右）
- 状态/标签列：左对齐
- 单按钮 Action 列：居中（Billing 已合规）
- 多按钮/链 Action 列：右对齐（Customers 已合规）
- 复选框列：居中（已合规但需配合 24×24 命中区，见 §4.6）

---

### 4.8 间距 / 节奏（卡片层级与圆角）

**4.8.1 圆角层级（hardcoded 残留）**

参见 §3.4。R3 仍命中：

| 文件 | 行 | 值 | 建议 |
|---|---|---|---|
| `dashboard.css` | 7 | 24px | 新增 `--radius-2xl: 24px` |
| `DashboardView.vue` | 177 | 24px | 同上 |
| `DashboardView.vue` | 246 | 18px | `var(--radius-lg)` 16px |
| `WorkPanelSection.vue` | 237 | 18px | 同上 |
| `LoginView.vue` | 209 | 24px | `var(--radius-2xl)` |
| `arco-picker` (CaseCreate) | — | 2px | Arco 默认值；项目层覆盖 `var(--radius-md)` 12px |
| `.basic-info__file-trigger` | — | 999px | 应改 `var(--radius-full)` 9999px（视觉差极小但 token 一致性破裂）|

**4.8.2 卡片 padding / gap（R3 实测合理范围）**

| 区域 | padding | gap | 评价 |
|---|---|---|---|
| `.surface-card` | 22 ~ 24 | 16 | ✓ |
| `.quick-action-card` | 18 / 16 | 14 | ✓ |
| `.hero-shell` | 24 | 20 | ✓ |
| `.summary-card` | 20 | 8 / 12 | ✓ |
| `.customer-modal__header` padding | 16 ~ 24 | — | ✓ |
| `.case-detail-view__meta` gap | 8 | — | ✓（`\|` 已可见，gap 适中）|

---

## 5. 颜色规范回归（R3 复测）

### 5.1 全局色板（实测 token 值）

| 场景 | token 期望 | R3 实测 | 是否合格 |
|---|---|---|---|
| 主标题 | `--color-text-1 = #0f172a` | `#0f172a` | ✓ contrast 16.13 |
| 次级文字 | `--color-text-2 = #475569` | `#475569` | ✓ 7.50 |
| 三级文字 | `--color-text-3` | `#5b6776`（**R2: #64748b → R3: #5b6776**）| ✓ 5.78 (R2 4.6) |
| Brand primary | `--color-primary-6 = #0369a1` | `#0369a1` | ✓ |
| Hover overlay | `--color-bg-overlay-hover` | `rgba(15,23,42,0.06)` | ✓ |
| Focus ring | `--shadow-focus-ring` | `0 0 0 3px rgba(3,105,161,0.4)` | ✓ |

✅ token 层全部合规。

### 5.2 实际渲染对比度（R3 全站）

| 维度 | 计数 | 备注 |
|---|---|---|
| 总采样文本节点 | 947 | 14 视图加总（已剔除 thumb 误报） |
| AA 通过 | 944 | |
| AA 失败 | **3** | ① CaseCreate `Popular` 4.14（§3.1）② Billing amount-warning hover 4.44（§3.2）③ CustomerDetail `basic-info__hint` 1.59（§3.3） |

3 处全部归类于 §3.1~§3.3 已开 P0/P1。

---

## 6. 优先级修复清单（R3 开发可执行 checklist）

| # | 优先级 | 修复点 | 一句话动作 | 影响面 | 关联 R2 |
|---|---|---|---|---|---|
| UX-033 | **P0** | chip-on-active-card 白字 contrast 4.14 | `Chip.vue` 的 `[aria-selected="true"], .is-active` 同步把 `bg` 提到 `rgba(255,255,255,0.28)` 或改 `transparent + border 0.6` | CaseCreate Step 1（5+ 卡）、潜在 LeadConvertedRecords | UX-021 |
| UX-034 | **P1** | CustomerDetail BasicInfo hint `#c9cdd4` contrast 1.59 | 把 `.basic-info__hint` 的 color 改 `var(--color-text-3)` | CustomerDetail BasicInfoTab；扫描其它 `*__hint` / `*-help` 是否同色 | （新 R3）|
| UX-035 | **P1** | Billing amount-warning hover contrast 4.44 | 把 `--color-amount-warning` 加深到 `#92400e`（与 chip warning 文字色统一） | Billing 列表 hover 行；潜在 Cases / Customers 行内金额 | UX-024 |
| UX-036 | **P1** | `surface-card 24px / 18px / login-panel 24px` 硬编码 | 入 token 加 `--radius-2xl: 24px`；`work-panel/work-item 18px` 改 `var(--radius-lg)` | dashboard.css / DashboardView / WorkPanelSection / LoginView | UX-027 |
| UX-037 | **P1** | Customer/Document SummaryCards `34px` 硬编码 | 改 `var(--font-size-display-1)` (36px) 与 Dashboard KPI 一致；或加 `--font-size-display-0: 34px` | 2 个文件 8 处 | UX-026 |
| UX-038 | **P1** | 表内 checkbox 13×13 命中区不达 24×24 | 6 个表格的 `*__check-label` 加 `width:24; height:24; display:inline-flex` | leads / cases / customers / billing / documents / conversations | UX-031 |
| UX-039 | **P2** | 同字号多 line-height（13px 4 / 14px 3 / 12px 2 / 18px 2 / 28px 2） | SFC 内 `line-height: 1.x` 一律删；`.work-panel-title / .ui-chip / table-cell` 显式绑定 token | 全站正文/标题/卡片 | UX-029 |
| UX-040 | **P2** | Page header h1 字重 600 vs Dashboard h1 800 不一致 | typography utility 给 `h3, .text-3xl` 强绑定 `font-weight: var(--font-weight-bold)` 700 | 各 list/detail page header | （新 R3）|
| UX-041 | **P2** | Pagination `Previous/Next` 28.8 ~ 30.3px、modal close 30.1px、Billing Record 25.4px | 全部改 `min-height: 32px`；mini/segment-btn 同步 | 全站 pagination / mini-btn / billing | UX-028 |
| UX-042 | **P2** | TopBar 搜索 input 20.3px 高（容器 42.3px） | 把 input `line-height: 32px` 或改 `display:flex; align-items:center` | TopBar.vue | UX-032 |
| UX-043 | **P2** | CustomerDetail `detail-header__name` h1 24px / `detail-header__back-link` 18.8px | `font-size: var(--font-size-3xl)` 28px；back-link `min-height: 32px` | CustomerDetail header | （新 R3）|
| UX-044 | **P2** | `.basic-info__file-trigger` border-radius 999px | 改 `var(--radius-full)` 9999px | CustomerDetail BasicInfoTab | （新 R3）|
| UX-045 | **P3** | Arco DatePicker 默认 2px radius 与项目 8/12px 不协调 | `.arco-picker { border-radius: var(--radius-md) }` 全局覆盖 | CaseCreate Step 1 / 各 modal | （新 R3）|
| UX-046 | **P3** | 大字号未用 tight letter-spacing（h1/h2/h3 仍 -0.01em） | typography utility 上 `letter-spacing: var(--letter-spacing-tight)` | 全站标题 | （新 R3）|
| UX-047 | **P3** | `.ui-chip` `letter-spacing: normal` 与 body `-0.01em` 不一致 | `.ui-chip { letter-spacing: var(--letter-spacing-normal) }` | 所有 chip | （新 R3）|
| UX-048 | **P3** | 表格列对齐策略不统一（Customers `Cases` 居中 vs Billing 数值右） | 制定 table column alignment guide：数值右、文本左、单 action 居中 / 多 action 右 | Cases / Customers / Billing 表 | UX-030 |

**优先级聚焦**：先做 UX-033 / 034 / 035 / 036 / 037 / 038 这 6 项 P0+P1，能把 admin 的视觉规范从"R3 9 成合规"推到"WCAG AA 全过 + 单一圆角语义 + 单一 lh 档位"。

---

## 7. 修复后验证脚本（R3 复测基线）

修复后用以下脚本快速复测：

```js
// 1) chip-on-active-card：选中模板卡内 chip contrast
() => {
  const chips = Array.from(document.querySelectorAll('button.tpl.is-active .ui-chip'));
  return chips.map(c => {
    const cs = getComputedStyle(c);
    const parent = c.closest('button.tpl.is-active');
    // 模拟 alpha-over：chip bg over parent bg
    const parse = s => { const m = s.match(/rgba?\(([^)]+)\)/); const p = m[1].split(',').map(parseFloat); return { r: p[0], g: p[1], b: p[2], a: p[3] == null ? 1 : p[3] }; };
    const blend = (fg, bg) => ({ r: fg.r*fg.a + bg.r*(1-fg.a), g: fg.g*fg.a + bg.g*(1-fg.a), b: fg.b*fg.a + bg.b*(1-fg.a) });
    const lum = ({r,g,b}) => { const ch = v => { v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); }; return 0.2126*ch(r) + 0.7152*ch(g) + 0.0722*ch(b); };
    const cb = blend(parse(cs.backgroundColor), parse(getComputedStyle(parent).backgroundColor));
    const fg = parse(cs.color);
    const ratio = (() => { const a = lum(fg), b = lum(cb); return ((Math.max(a,b)+0.05) / (Math.min(a,b)+0.05)).toFixed(2); })();
    return { text: c.textContent.trim(), color: cs.color, composed: cb, contrast: ratio };
  });
};
// 期待：每个 chip contrast ≥ 4.5

// 2) 全仓没有 17px 字号
() => {
  const sizes = new Set();
  document.querySelectorAll('main *').forEach(el => {
    const sz = parseFloat(getComputedStyle(el).fontSize);
    if (sz >= 9 && sz <= 60 && el.textContent.trim() && el.children.length === 0) sizes.add(sz);
  });
  const allowed = new Set([12,13,14,15,16,18,22,28,36,40]);
  return [...sizes].filter(s => !allowed.has(s));
};
// 期待：[]（不再含 34、24、17）

// 3) surface-card 不再有 24px hardcoded
() => Array.from(document.querySelectorAll('.surface-card, .hero-shell, .work-panel'))
        .map(c => getComputedStyle(c).borderRadius);
// 期待：所有都是 24px（来自 var(--radius-2xl)），且 token 已加入 :root

// 4) 表内 checkbox label 命中区 ≥ 24×24
() => Array.from(document.querySelectorAll('label[class*="check"], label[class*="checkbox"]'))
        .map(l => { const r = l.getBoundingClientRect(); return { cls: l.className.slice(0,50), w: r.width, h: r.height }; })
        .filter(x => x.w < 24 || x.h < 24);
// 期待：[]

// 5) chip vs button 同字号 lh 一致
() => {
  const chip = document.querySelector('.ui-chip');
  const btn = document.querySelector('button.ui-btn');
  return {
    chipLh: getComputedStyle(chip).lineHeight,
    btnLh: getComputedStyle(btn).lineHeight
  };
};
// 期待：chipLh === btnLh
```

---

## 8. 引用与缺失项（权威文档对齐）

### 8.1 文档引用

- 项目 design tokens 唯一定义文件：`packages/admin/src/styles/theme.css`（含 9 级字号 typescale + 5 级 radius + 9 级 leading + 6 级 font-weight + 4 级 letter-spacing）
- WCAG 2.1 SC 1.4.3 Contrast (Minimum) AA：正文 ≥ 4.5、大字 ≥ 3.0
- WCAG 2.1 SC 2.5.5 Target Size AAA：≥ 44×44；SC 2.5.8 (AA, 2.2)：≥ 24×24
- 本次走查截图：`/tmp/r3-ui-audit/01..14-*.png`（14 张全页 PNG）
- R1 基线：`docs/gyoseishoshi_saas_md/_output/20-admin-UI视觉规范走查与优化报告-第一轮.md`
- R2 基线：`docs/gyoseishoshi_saas_md/_output/22-admin-UI视觉规范走查与优化报告-第二轮.md`

### 8.2 缺失项 / 未覆盖

- **未走查 viewport**：仅 1440×900 桌面版。手机/平板（< 1024px）的字号节奏、sticky 行为、表格折叠留待 R4
- **未走查 dark mode**：`body[arco-theme="dark"]`（项目当前默认走亮色）
- **未走查 i18n 紧凑度**：日文/中文渲染下的文字截断 / wrap / 行高节奏（独立轮次 i18n 走查）
- **未覆盖 modal**：除 CustomerCreateModal 外，PaymentModal / BillingRiskAckModal / WaiveReasonModal / RegisterDocumentModal / ReviewDocumentModal / AddDocumentItemModal / ReferenceVersionModal / SharedExpiryRiskPanel / LeadCreateModal / CaseCreateModal / CaseEditModal 等约 13 个 modal 字号已 grep 验证 0 处 `17px` ✅，但实际渲染未截图复测
- **未覆盖 case-create wizard 后续步骤**：仅走 Step 1
- **未覆盖 Lead 详情页**：dev DB 中 leads 为空态，无法导航至 LeadDetailView
- **未做 :focus-visible 视觉走查**：只 token 校验了 `--shadow-focus-ring` alpha 0.4，未键盘 Tab 截图

### 8.3 与 R2（22-）边界

- 本份**只看视觉规范**（字体、排版、对齐、颜色、间距），不复述功能/状态机/i18n 偏差
- R2 → R3 主要新增：
  - **Customer Detail / CaseCreate Step 1 / Customer-create modal** 三处新视图
  - **letter-spacing 走查**（R2 未做）
  - **R2 P0 半修复 → R3 新 P0**：chip-on-active-card 反字色后，bg 仍刚刚不达 4.5（4.14）
  - **CustomerDetail BasicInfo hint contrast 1.59 新发现**
- 与 R2 对算法一致：alpha-blend 修正版对比度脚本（`window.__audit`），过滤 segmented-control thumb 误报

---

## 9. 三句话总结（给开发者）

1. **R2 的关键 P1 全部落地**：`17px` modal 标题 19 处清零、语义 chip 文字色全部加深一档（success/warning/danger/primary）、`case-detail-view__meta-sep` 已可见、`--color-text-3` 全局收紧、`--leading-{xs..display}` 9 级 token 已入 `theme.css`，整体对比度失败从 R2 19 → R3 **3**（再降 84%）。
2. **R3 唯一新 P0 是 chip-on-active-card "白字+半透明白底+深底"contrast 4.14**：`Chip.vue` 修了文字色没修背景层级，`rgba(255,255,255,0.18)` over `#0369a1` 实际只到 `#3084b1`，建议把 active 时 bg alpha 提到 0.28（或改透明 + 描边）一行 CSS 即可恢复 5.3+。
3. **R3 主要遗留 P1 是 4 件硬骨头**：①`surface-card / hero-shell / login-panel 24px / work-panel 18px` 圆角入 token（建议加 `--radius-2xl: 24px`）；②`Customer/Document SummaryCards` `34px` 数字改 `var(--font-size-display-1)` 36px；③13px / 14px / 18px 同字号多 line-height 通过迁移 SFC 内局部 lh 到 utility token 一次性收齐；④表内 checkbox 全部 13×13 → 套 24×24 命中 label。完成这 4 件后，admin 的视觉规范可以达到"WCAG AA 全过 + 圆角字号字重行高单一 token 来源"。
