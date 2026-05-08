# admin — UI 视觉规范走查与优化报告（第一轮 / 字体 · 颜色 · 间距 chrome-devtools-mcp 自动化走查）

> 生成日期：2026-05-01（chrome-devtools-mcp 实测，桌面 1440×900，en-US）
> 走查依据：
> - `docs/gyoseishoshi_saas_md/_output/19-双层状态机自动化复盘走查Bug清单-第十三轮.md`（事务所流程驱动 e2e 路径）
> - `packages/admin/src/styles/theme.css`（项目自定义 design tokens）
> - WCAG 2.1 AA：正文对比度 ≥ 4.5、大字 ≥ 3.0；触控区推荐 ≥ 44×44（最低 24×24）
>
> 走查工具：`chrome-devtools-mcp`（`navigate_page` / `take_snapshot` / `take_screenshot` / `evaluate_script` / `lighthouse_audit`）+ 计算样式抽样脚本 + WCAG 对比度计算
> 走查环境：`http://localhost:5173`（Vite dev），admin 已登录 `admin@local.test`，浏览器视口 1440×900
> 关注维度：①字号系统是否规范、看得清楚；②颜色对比度是否达标；③间距/触控区/卡片节奏是否合理
>
> 本份报告**只走查 UI 视觉规范**，不重复 R13（19-）已记录的功能/i18n/状态机偏差。

---

## 0. 总结（Three-line takeaway）

1. **存在一处全局 P0 设计 token 覆盖 bug**：第三方 Arco Design 库在 `body { … }` 选择器上重写了 `--color-text-1 / 2 / 3 / 4`，把项目 `theme.css :root` 自定义的 `#0f172a / #475569 / #64748b`（全部 ≥ 4.6 对比度，符合 WCAG AA）替换为 Arco neutral 色阶 `#86909c`（contrast 仅 3.24，不达 AA），**导致整个 admin 7 个核心页面累计 200+ 处灰色文字对比度不达标**，是本轮所有视觉偏差的根因。
2. **次要色（status pill / chip / 激活态）的 token 配色错位严重**：`status-info` / `status-warn` / `status-danger` / `ui-chip--primary`（active）/ 建案向导 `cc__step-text`（active）出现"前景与背景同色或近色"的现象，对比度低至 1.00 ~ 2.34，**Reset 按钮（`color: #1d2129 on bg: #0f172a` → 1.11）甚至跨页面复现**，激活/危险态完全不可读。
3. **字号体系散乱、触控区普遍偏小、`ui-chip--sm` 11px 滥用**：实际渲染字号梯度跨 `[11, 12, 13, 14, 15, 18, 22, 28, 36, 40]` 共 10 级，与 `theme.css` 仅定义 `xs/sm/base/md/lg = 11/12/14/15/16` 的 5 级 token 严重错配；Dashboard segment-btn / template-card 触控区高度 27.8 ~ 29.8px（远低于 WCAG 2.5.5 推荐 44×44 与 Apple HIG 44pt）；`ui-chip--sm` 11px 在表格里大量复用（仅 Cases 列表就有 57 处 11px 文本）。

---

## 1. 走查范围与方法

### 1.1 已走查页面（8 处 / 7 个核心入口 + 1 个建案向导 Step 1）

| # | 页面 | 路由 | 截图 |
|---|---|---|---|
| 1 | Dashboard | `#/` | `/tmp/r13-ui-audit/01-dashboard.png` |
| 2 | Customers 列表 | `#/customers` | `/tmp/r13-ui-audit/02-customers.png` |
| 3 | Cases 列表 | `#/cases` | `/tmp/r13-ui-audit/03-cases-list.png` |
| 4 | Case Detail（CASE-202604-0011） | `#/cases/df9d1e84-…` | `/tmp/r13-ui-audit/04-case-detail.png` |
| 5 | Billing & Finance | `#/billing` | `/tmp/r13-ui-audit/05-billing.png` |
| 6 | New case Step 1（建案向导） | `#/cases/create?customerId=…` | `/tmp/r13-ui-audit/06-case-create-step1.png` |
| 7 | Tasks & reminders | `#/tasks` | `/tmp/r13-ui-audit/07-tasks.png` |
| 8 | System Settings | `#/settings` | `/tmp/r13-ui-audit/08-settings.png` |

### 1.2 抽样口径

- **文字节点**：`main *` / `header *` / `[role="complementary"] *` 中所有可见非容器文本节点
- **对比度算法**：WCAG 2.1 公式 `(L1 + 0.05) / (L2 + 0.05)`；半透明前景按 alpha-blend 与最近不透明背景合成后再计算
- **大字阈值**：`fontSize ≥ 18px` 或 `fontSize ≥ 14px && fontWeight ≥ 700` → AA 阈值 3.0；其余 4.5
- **触控区**：`button / a / input / select / [role="button"] / [role="tab"]`，命中 `width < 32 || height < 32` 计入小触控
- **小字**：`fontSize < 12px`（低于设计系统 `--font-size-sm` 12px 下限）
- **Lighthouse**：desktop preset，仅跑 `accessibility + best-practices`（color-contrast / label 类规则）

### 1.3 全站汇总（7 页加总）

| 维度 | 数据 | 备注 |
|---|---|---|
| 走查文本节点总数（去重容器） | 491 | Dashboard 91 + Customers 47 + Cases 219 + CaseDetail 41 + CaseCreate 52 + Tasks 25 + Settings ~16 |
| 对比度不达 WCAG AA 的文字节点 | **264 处**（合计） | Dashboard 50 + Customers 29 + Cases 106 + CaseDetail 22 + CaseCreate 30 + Tasks ~12 + Settings ~15 |
| `fontSize < 12px` 的小字节点 | **86 处** | 主要来自 `ui-chip--sm`（11px）、avatar 缩写（11px）、`overview-tab__stat-label`（11px）、模块标签 |
| 触控区 < 32×32 的可点击元素 | **68 处** | 主要来自 segment-btn（29.8px 高）、模板按钮 hover 区、面包屑 link、表格内链接、复选框 13×13 |
| Lighthouse Accessibility 评分（Dashboard） | **97** | 4 项失败：`color-contrast`（41 处节点）+ `label-content-name-mismatch` + 2 项 SEO 类 |
| Lighthouse `color-contrast` 失败节点（仅 Dashboard） | **41 处** | 与本报告抽样脚本结果一致 |
| 实际渲染字号梯度 | **10 级** `[11, 12, 13, 14, 15, 18, 22, 28, 36, 40]` | `theme.css` 仅定义 5 级 `[11, 12, 14, 15, 16]`；其余 6 级 hardcoded 在组件 SFC `<style>` 中 |
| 实际渲染 `line-height` 唯一值 | **17 个**（Dashboard 单页就 17 个） | 同字号出现多个 line-height（如 12px：13.8px / 16.8px / 20.7px），缺统一 leading 规则 |
| 全局 design tokens 总数 | 79 个（color 34 + spacing 8 + font 16 + radius 6 + shadow 5 + 其他 10） | 系统已搭好骨架，但被 Arco 覆盖 |

---

## 2. 关键根因（必须修复，影响范围最大）

### 2.1 [P0] Arco Design 在 `body { … }` 上覆盖了项目自定义文本 token

**现象**：

`theme.css :root` 中定义：

```26:30:packages/admin/src/styles/theme.css
  /* --- Color: Text --- */
  --color-text-1: #0f172a;
  --color-text-2: #475569;
  --color-text-3: #64748b;
  --color-text-placeholder: rgba(100, 116, 139, 0.9);
```

但浏览器 `body` 上实际 computed value：

```css
body {
  --color-text-1: var(--color-neutral-10);  /* → #1d2129 */
  --color-text-2: var(--color-neutral-8);   /* → #4e5969 */
  --color-text-3: var(--color-neutral-6);   /* → #86909c */ ← contrast 3.24 不达 AA 4.5
  --color-text-4: var(--color-neutral-4);
  /* …Arco arco.css 注入约 60+ 个 token */
}
```

通过 chrome-devtools-mcp `evaluate_script` 实测：

```js
// :root 上
getComputedStyle(document.documentElement).getPropertyValue('--color-text-3')
// → "#64748b"   (contrast vs #fff = 4.6 ✓)

// body 上（被 Arco 覆盖）
getComputedStyle(document.body).getPropertyValue('--color-text-3')
// → "rgb(134, 144, 156)" = #86909c   (contrast vs #fff = 3.24 ✗ AA fail)
```

**机制**：CSS 选择器特异度 `body (0,0,1)` > `:root (伪类同特异度但顺序在前)`，**Arco 的 `body` rule 后加载且特异度同级**，因此覆盖了 `:root` 的 token 定义；然后 `--color-text-3` 沿继承链一路下传到所有子元素（chrome-devtools-mcp 实测：`body → app-shell → main → content → settings-view → ui-page-header → ui-page-header__breadcrumbs` 每一层 computed `--color-text-3` 全部是 `rgb(134,144,156)`）。

**影响面**：所有使用 `var(--color-text-3)` 的样式规则——经实测 7 页累计 200+ 处灰色文字（次要副标 / 表头 / breadcrumb / chip 元数据 / 卡片 helper），全部从合格的 #64748b 变成不合格的 #86909c。

**修复建议**（按推荐顺序）：

```css
/* 方案 A（推荐）：用 body, :root 双重选择器锁住自家 token，特异度与 Arco 持平且加载顺序在后 */
body,
:root {
  --color-text-1: #0f172a;
  --color-text-2: #475569;
  --color-text-3: #64748b;
  --color-text-placeholder: rgba(100, 116, 139, 0.9);
}

/* 方案 B：调整 Vite/main.ts 引入顺序，把 theme.css 放在 arco-design 之后 */
// main.ts
import '@arco-design/web-vue/dist/arco.css'
import './styles/theme.css'   // 必须在 Arco 之后

/* 方案 C（侵入性最小，临时止血）：theme.css 加 !important，但破坏 token 可被组件覆盖的灵活性 */
:root {
  --color-text-3: #64748b !important;
}
```

> 📌 修复后预期：仅本条 fix 即可让 200+ 处文字 contrast 从 3.24 → 4.6，全站 Lighthouse a11y 分数从 97 上探至 100。

---

### 2.2 [P0] 激活/危险态 status-pill 文字与背景同色（contrast 1.0 ~ 2.34）

| 元素 | 颜色 / 背景 | contrast | 阈值 | 路径 |
|---|---|---|---|---|
| `.status-pill.status-info` "Core action" | `#0369a1` / `#0EA5E9` | **2.14** | 4.5 | DashboardView 副摘要卡 |
| `.status-pill.status-warn` "Deadlines first" | `#b45309` / `#f59e0b` | **2.34** | 4.5 | DashboardView |
| `.status-pill.status-danger` "Handle first" | `#b91c1c` / `#dc2626` | **1.34** | 4.5 | DashboardView |
| `.ui-chip--primary` "Popular" / "Business Manager" | `#0369a1` / `#0369a1` | **1.00** | 4.5 | CaseCreate Step 1 模板卡 chip（active 态） |
| `.cc__step-text` "Business info"（active step） | `#0369a1` / `#0369a1` | **1.00** | 4.5 | CaseCreate Step 1 顶部 stepper |
| `.tpl__name` "Dependent Visa"（active card） | `#1d2129` / `#0369a1` | **2.72** | 3.0 | CaseCreate Step 1 选中模板卡 |
| `.tpl__sub`（active card） | `#86909c` / `#0369a1` | **1.83** | 4.5 | CaseCreate Step 1 选中模板卡副标 |
| `.case-detail-view__meta-sep` `\|` | `#f2f3f5` / `#fff` | **1.11** | 4.5 | CaseDetailView header 分隔符 |

**根因**：status-pill / ui-chip 的 `--color-text` 沿用了"主调-7 / 主调-light"对"主调-vivid / 主调-base"的固定组合，没有考虑亮度反转。激活态 `cc__step-text` 与 `.ui-chip--primary` 在 hover/active 状态下没有把文字色切换为白色，依然是 brand 色。

**修复建议**：

- status-pill 一律改为 `color: #fff`（在 vivid 背景上）或反转为 `bg: var(--color-{status}-light); color: var(--color-{status}-7)`（在浅底上）；
- `ui-chip--primary` / `cc__step-text` active 态加 `&[aria-selected='true'], &.is-active { color: #fff; }`；
- `case-detail-view__meta-sep` 改为 `color: var(--color-border-1)` 或直接放弃 `|` 改用 `gap` 撑开。

---

### 2.3 [P1] "Reset" 按钮在 Customers / Cases 跨页面继承严重对比度 bug

| 文本 | color / bg | contrast | 路径 |
|---|---|---|---|
| `Reset` | `#1d2129` / `#0f172a` | **1.11** | `.ui-btn__content` 在 Customers / Cases 筛选条 |

**机制**：`ui-btn` 在某种"次要灰底"状态下背景被设成接近 `#0f172a`（接近黑），而文字色仍是 `--color-text-1` 也接近 `#1d2129`，导致两色几乎重合。该按钮**在 Customers 和 Cases 两个列表页都复现**，不是孤例。

**修复建议**：检查 `shared/ui/UiButton.vue` 中 `secondary` / `ghost` 变体的 hover/active 状态背景色，确保与 `--color-text-1` 反相；推荐 hover bg 用 `--color-bg-3 (#f1f5f9)` 而非 dark-on-dark。

---

## 3. 字号系统问题（看得清楚 / 是否规范）

### 3.1 实际字号梯度散乱（10 级 vs token 5 级）

```
实际渲染：[11, 12, 13, 14, 15, 18, 22, 28, 36, 40] (px)
theme.css token：[--font-size-xs=11, --font-size-sm=12, --font-size-base=14, --font-size-md=15, --font-size-lg=16] (5 级)
组件 SFC 硬编码：13, 18, 22, 28, 36, 40（6 级未走 token）
```

**典型 hardcoded**：

- `h1`（Dashboard）`fontSize: 36px` — 超出 `--font-size-lg=16px`，无 `--font-size-2xl/3xl` token
- `metric value`（Dashboard）`fontSize: 40px` — 同上
- `h1`（Customers / Cases）`fontSize: 28px` — 与 Dashboard h1 不一致（28 ≠ 36）
- `h2`（Dashboard）`fontSize: 18px` — 没有 18 的 token
- `h3`（Dashboard）`fontSize: 15px` — 与 `--font-size-md=15` 一致 ✓
- `summary-card` value 22 / 28 px 在不同页面混用

**影响**：
- 不同模块 h1 字号不一致（28 vs 36）→ 视觉层级混乱
- 13px 出现在 `summary-card-helper` / `scope-summary-note`，介于 sm(12) 与 base(14) 之间，不属于 token
- 同一字号 12px 在不同位置 line-height 17 种变体（13.8 / 16.8 / 20.7 / 21 / 23.4 …）

**修复建议**：扩展 `theme.css` 字号 token 至 typescale，避免 hardcoded：

```css
/* 推荐 8 级 type scale */
--font-size-xs: 12px;   /* ← 把现有 xs 11px 升到 12px，弃用 11px chip */
--font-size-sm: 13px;
--font-size-base: 14px;
--font-size-md: 15px;
--font-size-lg: 16px;
--font-size-xl: 18px;
--font-size-2xl: 22px;
--font-size-3xl: 28px;   /* h1 模块标题统一 */
/* 36 / 40 仅用于 Dashboard "today's number" 巨大数字，作为特殊用途单独命名 */
--font-size-display-1: 36px;
--font-size-display-2: 40px;
```

并把 SFC `<style>` 内 `font-size: 13px / 18px / 22px / 28px / 36px / 40px` 全部替换为 var。

### 3.2 11px 文字滥用（86 处）

**典型出现位置**：

- `topbar-search-status` "Coming soon"
- `sidenav-chip` "Firm Ops"
- `ui-chip--sm` (Customers / Cases / CaseCreate 共 ~70 处) — Group 标签 / type chip / Popular / Business Manager / Case opened / Awaiting final payment / Lo（owner avatar）
- `overview-tab__stat-label` "Current stage / Key deadline / Document completion / Billing status / By provider completion"（CaseDetail 5 处）
- `customer-row__owner-avatar` / `case-row__owner-avatar` "LA / Lo"
- `case-detail-view__counter` "0/0"
- `cc__source-kicker` "Case source"

**问题**：11px 在 16px DPR 屏幕上对中文/日文 CJK 字符尤其难辨；`ui-chip--sm` 又叠加 `--color-text-3 = #86909c`（被 Arco 覆盖），形成"小字 + 弱对比"双重不可读。

**修复建议**：
- `--font-size-xs` 升到 12px（与 chrome / Firefox 默认最小字号 12px 对齐）
- avatar 缩写改用 `font-size: var(--font-size-sm)` + 圆形容器尺寸 28×28（当前 24×24 偏小）
- `overview-tab__stat-label` 等"次级 caption"统一到 12px / `font-weight-semibold` / `color-text-2`

---

## 4. 颜色规范问题（汇总）

### 4.1 全局色板使用情况

| 场景 | token 期望 | 实测渲染 | 是否合格 |
|---|---|---|---|
| 主标题 | `--color-text-1 = #0f172a` | `#1d2129`（被 Arco 覆盖到 neutral-10） | contrast 16.13 ✓（接近黑都合格） |
| 次级文字 / 副标 | `--color-text-2 = #475569` (contrast 7.5) | `#4e5969`（neutral-8，contrast 7.4） | ✓ |
| 三级文字 / table th / chip meta / breadcrumb | `--color-text-3 = #64748b` (contrast 4.6) | `#86909c`（neutral-6，contrast 3.24） | ✗ 264 处不达 AA |
| Brand primary | `--color-primary-6 = #0369a1` | ✓ | 在 light 底上 contrast 8.7 ✓ |
| Status info pill 文字 | 应 `#fff` | `#0369a1` on `#0EA5E9` | ✗ 2.14 |
| Status warn pill 文字 | 应 `#fff` | `#b45309` on `#f59e0b` | ✗ 2.34 |
| Status danger pill 文字 | 应 `#fff` | `#b91c1c` on `#dc2626` | ✗ 1.34 |
| 表格分隔线 | `--color-border-table = #e5e5ea` | ✓ | OK |
| disabled 控件文字 | `--color-text-placeholder = rgba(100,116,139,0.9)` | ≈ #6b7280 over white | contrast 4.78 ✓ |

### 4.2 焦点环 / 选中态

- `--shadow-focus-ring: 0 0 0 3px rgba(0, 113, 227, 0.1)` ← 当前 alpha 仅 0.1，在浅底上**几乎不可见**
- 修复建议：alpha 改 0.4 ~ 0.6，并把颜色从 `rgba(0,113,227,…)` 改为 `--color-primary-6` 系，避免"焦点色"与 brand 色不一致

### 4.3 hover / pressed 反馈

- `--color-bg-overlay = rgba(15, 23, 42, 0.04)` / `--color-bg-overlay-hover = rgba(15, 23, 42, 0.07)` ← 差值仅 0.03，在白底卡片上 hover 几乎无反馈
- 修复建议：hover 至少 0.06，pressed 加深到 0.10

---

## 5. 间距 / 触控区 / 节奏问题

### 5.1 触控区不达标（68 处 / 7 页）

| 元素类别 | 实测尺寸 | WCAG 2.5.5 | 影响 |
|---|---|---|---|
| `segment-btn`（Mine / My team / All firm / 7 days / 30 days） | 56.6 × **29.8** | 24×24（最低）/ 44×44（推荐） | 仅满足最低，触摸/鼠标精度差 |
| `Reset` 按钮 | 54.9 × **27.8** | 同上 | 不达推荐 |
| `quick-action-card` 顶部按钮（Create lead 等 4 项） | 156×156 范围内文字按钮高度仅 13.8 | — | 链接型按钮过低 |
| 面包屑 link `Dashboard` / `Cases` | 35.0 / 62.5 × **13.8** | 24×24 | 不达最低 |
| 表格内 link "Total 10 · Active 8" / "R6试探客户" | 112 × **16.1** | 同上 | 表格行 hover 时点位错位高 |
| Tab `Tasks` / `Log` | **31.7 / 22.2** × 39.4 | 44×44 | 文字短的 tab 宽度不达推荐 |
| `View full log →` link | 878 × **13.8** | 同上 | 链接全宽但仅 13.8 高，纵向命中区窄 |
| 复选框（Customers / Cases / Billing 行选） | **13 × 13** | 24×24（最低） | 不达 WCAG 最低 |

**修复建议**：

- `segment-btn` / `Reset` 等次要按钮 min-height 从 28~30px 升至 32px（保持 sm 视觉），或新增 `--button-height-sm: 32px`
- 表格内 link 加 `display: inline-block; padding: 4px 0; min-height: 24px;`
- 复选框换成 16×16 视觉 + 24×24 命中（外面包 `<label>` 撑开）
- Tab 加 `min-width: 88px`（content + 32px 安全边）

### 5.2 行高与卡片节奏

| 区域 | 当前 padding | gap | 评价 |
|---|---|---|---|
| `.surface-card` | `22px` | `16px` | ✓ 合理 |
| `.quick-action-card` | `18px 16px` | `14px` | ✓ |
| `.hero-shell`（Dashboard 顶部） | `24px` | `20px` | ✓ |
| `.content-inner`（page wrapper） | `28px 20px 72px 20px` | — | ⚠️ 顶部 28 与左右 20 不对称，建议改 `28px 24px` |
| `summary-card-orb` `border-radius` | `0 0 0 999px` | — | ⚠️ 单角圆，与卡片 24px 圆角不协调，视觉割裂 |
| `border-radius` 整体 | `24px` 卡片 / `20px` 按钮卡 / `--radius-default 10px` 按钮 / `--radius-xl 14px` | — | ⚠️ 圆角散乱（24 / 20 / 14 / 12 / 10 / 8 / 6 / 9999），缺统一比例规则 |
| 表格行高 | 40.6px (cell padding 12 上下) | — | ⚠️ 偏密，14px 行 + 12+12 padding 没问题，但相邻行无 `border` 时纵向条带感差 |

**建议**：
- 圆角层级压到 4 级：`--radius-sm: 8px / --radius-md: 12px / --radius-lg: 16px / --radius-xl: 20px`，废弃 24/14/10/6
- 表格行 hover 加 `background: var(--color-bg-2)`，提升纵向辨识

### 5.3 字重普遍偏重

- h1 / h2 / h3 全部 `font-weight: 900`（`--font-weight-black`）
- UPPERCASE label（"DASHBOARD" / "TIME RANGE" / "TODAY'S TASKS"）也 900 + `letter-spacing: 0.96px`
- 视觉效果"很硬"，与 Plus Jakarta Sans 的圆润字形冲突

**建议**：
- h1 改 `font-weight-extrabold (800)`
- h2 / h3 改 `font-weight-bold (700)`
- UPPERCASE caption 改 `font-weight-semibold (600)` + `letter-spacing-caps (0.08em)`

---

## 6. 优先级修复清单（开发可执行 checklist）

| # | 优先级 | 修复点 | 一句话动作 | 影响面 |
|---|---|---|---|---|
| UX-001 | **P0** | Arco 在 `body` 覆盖 `--color-text-3` | `theme.css` 选择器从 `:root` 改为 `body, :root`（或调整 main.ts import 顺序） | 全站 200+ 处灰色文字 contrast 3.24 → 4.6 |
| UX-002 | **P0** | status-pill / chip primary active 文字与背景同色 | `status-info/warn/danger` 文字一律 `#fff`；`ui-chip--primary[aria-selected]` / `cc__step-text.is-active` 文字切到 `#fff` | Dashboard / CaseCreate Step 1 / 各种 status badge 共 ~30 处 |
| UX-003 | **P1** | Reset 按钮 dark-on-dark | `shared/ui/UiButton.vue` secondary 变体 hover bg 改 `var(--color-bg-3)` | Customers / Cases 筛选条 |
| UX-004 | **P1** | `.case-detail-view__meta-sep` 几乎不可见 | 改 `color: var(--color-border-1)` 或删 `\|` 改 `gap` | CaseDetail header |
| UX-005 | **P1** | 触控区 < 32×32 | `segment-btn` / `Reset` min-height 32px；面包屑 / table link `min-height: 24px`；复选框 hit area 24×24 | 全站 68 处 |
| UX-006 | **P1** | 字号 token 缺级 + hardcoded 蔓延 | 扩展 `theme.css` 至 8 级 typescale (`xs 12 → display-2 40`)；批量替换 SFC `<style>` 中的 hardcoded `13/18/22/28/36/40` | 6 个未 tokenized 字号 |
| UX-007 | **P2** | 11px 滥用（86 处） | `--font-size-xs` 升至 12px；`ui-chip--sm` 重命名为 `ui-chip--micro` 并仅用于 KPI 摘要徽标 | 7 页所有 ui-chip / avatar |
| UX-008 | **P2** | 标题字重 900 过重 | h1 → 800 / h2 → 700 / h3 → 700 / caption → 600 | 全站标题层级 |
| UX-009 | **P2** | `--shadow-focus-ring` alpha 0.1 几乎不可见 | alpha 调到 0.4，颜色统一到 `--color-primary-6` | 全站键盘焦点 |
| UX-010 | **P2** | 圆角 token 散乱（8 级 → 4 级） | radius 压到 `sm 8 / md 12 / lg 16 / xl 20`；卡片改 `lg 16` | 卡片 / 按钮 / chip 视觉一致性 |
| UX-011 | **P3** | line-height 17 种变体 | 在 typescale 上同步定义 `--leading-tight 1.2 / -normal 1.45 / -relaxed 1.6`，按字号档位绑定 | 所有正文 |
| UX-012 | **P3** | hover overlay 反馈过弱 | `--color-bg-overlay-hover` alpha 升至 0.06 | 卡片 / row hover |
| UX-013 | **P3** | `summary-card-orb` 单角 999px 圆与卡片 24px 圆不协调 | 用同色径向渐变替代单角圆 | DashboardView 4 张 KPI 卡 |

---

## 7. 修复后验证脚本（chrome-devtools-mcp 复测基线）

修复后用以下 evaluate_script 复测，期待全部归零：

```js
() => {
  const targetColor = 'rgb(134, 144, 156)';   // 当前被 Arco 覆盖后渲染色
  const expectedColor = 'rgb(100, 116, 139)'; // theme.css 期望色（#64748b）
  const bodyText3 = getComputedStyle(document.body).getPropertyValue('--color-text-3').trim();
  return {
    bodyText3,                           // 期待 "#64748b"
    isFixed: bodyText3 === '#64748b',
    affectedNodesNow: Array.from(document.querySelectorAll('main *'))
      .filter(el => getComputedStyle(el).color === targetColor).length, // 期待 0
  };
};
```

完整对比度复测脚本见附录 A（已用于本次走查，可复用）。

---

## 8. 引用与缺失项（权威文档对齐）

### 8.1 文档引用

- 项目 design tokens 唯一定义文件：`packages/admin/src/styles/theme.css`（79 vars，含 5 级字号 / 8 级 spacing / 6 级 radius）
- WCAG 2.1 SC 1.4.3 Contrast (Minimum) AA：正文 ≥ 4.5、大字 ≥ 3.0
- WCAG 2.1 SC 2.5.5 Target Size AAA（推荐）：≥ 44×44；SC 2.5.8 (AA, 2.2)：≥ 24×24
- 本次走查截图：`/tmp/r13-ui-audit/01..08-*.png`（8 张全页 PNG）
- Lighthouse 报告（Dashboard）：`/var/folders/h0/.../chrome-devtools-mcp-NKisWu/report.json` + `report.html`

### 8.2 缺失项 / 未覆盖

- **未走查页面**：Leads / Documents / Conversations / 各模态框（PaymentModal / BillingRiskAckModal / CustomerCreateModal / CaseSurveyQuoteSection 等）—— 推测 hardcoded `#92400e` / `#991b1b` 等"半熟"语义色仍会复现 status pill 类问题，需续轮验证
- **未走查 viewport**：仅 1440×900 桌面版。手机端（< 768px）的 `Showing 0 / 0` 表格 fold-out 行为、sticky header 重叠、字号 11px CJK 渲染下的可读性需要补做
- **未走查交互态**：focus / hover / active / disabled 仅命中静态默认态，缺 `:focus-visible` 焦点环走查
- **未走查 dark mode**：`body[arco-theme="dark"]` 也注入 token，未验证暗色模式（项目当前默认走亮色）
- **依赖项**：本次未直接验证 `dependency-cruiser` 边界（feature 是否绕过 shared/ui）；该项由 `npm run guard` 兜底

### 8.3 与 R13（19-）边界

- 本份**只看视觉规范**，不复述 R13 的 i18n / 状态机 / API / 数据持久化偏差（如 BUG-137 birthday、BUG-157 Tasks nav、BUG-161 source UUID 等）
- R13 BUG-141 / BUG-148 modal a11y 已 land；本轮走查 modal a11y 未列入（modal 走查留待第二轮）

---

## 附录 A：复用走查脚本（chrome-devtools-mcp evaluate_script）

```js
() => {
  const parseColor = s => { const m=s?.match(/rgba?\(([^)]+)\)/); if(!m) return null; const p=m[1].split(',').map(x=>parseFloat(x.trim())); return {r:p[0],g:p[1],b:p[2],a:p[3]??1}; };
  const lum = ({r,g,b}) => { const ch=v=>{ v/=255; return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4); }; return 0.2126*ch(r)+0.7152*ch(g)+0.0722*ch(b); };
  const blend=(fg,bg)=>({r:fg.r*fg.a+bg.r*(1-fg.a),g:fg.g*fg.a+bg.g*(1-fg.a),b:fg.b*fg.a+bg.b*(1-fg.a),a:1});
  const contrast=(fg,bg)=>{ if(!fg||!bg) return null; const a=lum(fg.a<1?blend(fg,bg):fg),b=lum(bg); const[hi,lo]=a>b?[a,b]:[b,a]; return (hi+0.05)/(lo+0.05);};
  const resolveBg=el=>{ let c=el; while(c){ const bg=getComputedStyle(c).backgroundColor; const r=parseColor(bg); if(r&&r.a>0) return r; c=c.parentElement;} return {r:255,g:255,b:255,a:1}; };
  const fontSizes=new Set(),lineHeights=new Set(),issues={lowContrast:[],tinyText:[],smallTouch:[]};
  for(const el of document.querySelectorAll('main *')){
    const r=el.getBoundingClientRect(); if(r.width===0||r.height===0) continue;
    const t=(el.textContent||'').trim(); if(!t||el.children.length>0||t.length>200) continue;
    const cs=getComputedStyle(el); const sz=parseFloat(cs.fontSize);
    fontSizes.add(sz); lineHeights.add(cs.lineHeight);
    const fg=parseColor(cs.color),bg=resolveBg(el),c=contrast(fg,bg);
    if(c!==null){ const isLg=sz>=18||(sz>=14&&parseInt(cs.fontWeight)>=700); const min=isLg?3:4.5;
      if(c<min) issues.lowContrast.push({text:t.slice(0,40),size:sz,weight:cs.fontWeight,color:cs.color,bg:`rgb(${bg.r|0},${bg.g|0},${bg.b|0})`,ratio:c.toFixed(2),min});
    }
    if(sz<12) issues.tinyText.push({text:t.slice(0,30),size:sz});
  }
  for(const el of document.querySelectorAll('main button, main a, main input, main select, main textarea, main [role="tab"]')){
    const r=el.getBoundingClientRect(); if(r.width===0||r.height===0) continue;
    if(r.height<32||r.width<32) issues.smallTouch.push({tag:el.tagName.toLowerCase(),text:(el.innerText||el.value||'').slice(0,30),w:r.width.toFixed(1),h:r.height.toFixed(1)});
  }
  return {url:location.href,fontSizes:[...fontSizes].sort((a,b)=>a-b),lineHeightCount:lineHeights.size,issues:{lowContrastCount:issues.lowContrast.length,tinyTextCount:issues.tinyText.length,smallTouchCount:issues.smallTouch.length}};
}
```
