# 收费与财务页现有原型盘点

> 盘点对象：[packages/prototype/admin/billing.html](../billing.html)（803 行，单文件原型）
>
> 目的：为后续拆分（SPLIT-ARCHITECTURE.md）提供精确的区块定位、交互清单、样式覆盖分析、链接审计、P1 泄漏项识别与共享候选列表。

---

## 1. 行号区块总览

| 行号范围 | 关注点 | 说明 |
|----------|--------|------|
| 1–7 | `<head>` 基础 | DOCTYPE、meta、title、Tailwind CDN |
| 8–376 | 内联 `<style>` | 设计 Token + 壳层布局 + 公共组件 + 财务页专有样式 |
| 378–379 | Skip Link | `<a href="#main">` |
| 381–469 | 移动端导航 HTML | 侧滑抽屉，包含完整导航项列表 |
| 471–553 | 桌面侧边导航 HTML | `<aside class="side-nav">`，包含完整导航项列表 |
| 555–583 | 顶部工具栏 HTML | 搜索框 + "新建咨询" + "新建案件" 按钮 + 用户头像 |
| 585–603 | **页面标题区** | `<h1>收费与财务</h1>` + 副标题 + "导出报表" + "登记回款" |
| 605–633 | **财务摘要卡** | 4 张统计卡：本月新增应收 / 已回款 / 总未收 / 逾期欠款 |
| 635–656 | **控制栏** | segmented control（3 段） + 案件搜索 + 状态筛选下拉 |
| 658–774 | **案件收费列表** | `apple-card` + `apple-table`，4 条 demo 行 |
| 780–801 | 内联 `<script>` | 移动端导航开关（IIFE） |

---

## 2. 内联样式拆解（L8–376）

### 2.1 设计 Token（L11–26）

声明于 `:root`，与 `shared/styles/tokens.css` 比对：

| 变量 | billing.html 值 | shared/tokens.css | 差异 |
|------|---------------|-------------------|------|
| `--bg` | `#f8fafc` | `#f8fafc` | 一致 |
| `--surface` | `#ffffff` | `#ffffff` | 一致 |
| `--surface-2` | `#f1f5f9` | `#f1f5f9` | 一致 |
| `--border` | `#e2e8f0` | `#e2e8f0` | 一致 |
| `--text` | `#0f172a` | `#0f172a` | 一致 |
| `--muted` | `#475569` | `#475569` | 一致 |
| `--muted-2` | `#64748b` | `#64748b` | 一致 |
| `--primary` | `#0369a1` | `#0369a1` | 一致 |
| `--primary-hover` | `#075985` | `#075985` | 一致 |
| `--success` | `#16a34a` | `#16a34a` | 一致 |
| `--warning` | `#f59e0b` | `#f59e0b` | 一致 |
| `--danger` | `#dc2626` | `#dc2626` | 一致 |
| `--shadow` | 双层阴影 | 双层阴影 | 一致 |
| `--radius` | `14px` | `14px` | 一致 |
| `--shadow-hover` | **缺失** | 有 | billing.html 未声明 |
| `--apple-blue` ~ `--apple-shadow` | **缺失** | 别名映射 | billing.html 未声明 |

**结论**：tokens 完全可用 `shared/styles/tokens.css` 替代，无冲突。

### 2.2 壳层布局样式（L52–96, L143–159, L340–367）

| 类名 | billing.html 行号 | shared 文件 | 差异 |
|------|---------------|-------------|------|
| `.skip-link` | L52–66 | `shell.css` L1–15 | 一致 |
| `focus-visible` | L68–71 | `shell.css` L17–20 | 一致 |
| `.app-shell` | L73–82 | `shell.css` L22–31 | 一致 |
| `.side-nav` / `.side-nav-inner` | L84–96 | `shell.css` L33–45 | 一致 |
| `.brand` / `.brand-title` | L97–108 | `shell.css` L46–57 | 一致 |
| `.nav-group-title` | L110–117 | `shell.css` L59–66 | 一致 |
| `.nav-item` + hover + `aria-current` + svg | L118–141 | `shell.css` L67–92 | 一致 |
| `.topbar` / `.topbar-inner` | L143–159 | `shell.css` L94–110 | ⚠️ `max-width` 差异 |
| `.mobile-nav` 全家族 | L340–367 | `shell.css` L112–139 | 一致 |
| `prefers-reduced-motion` | L369–375 | `tokens.css` L65–71 | 一致 |
| `body` 字体/基础 | L28–43 | `tokens.css` L34–49 | 一致 |

**Topbar `max-width` 差异明细**：

| 属性 | billing.html | shared/shell.css |
|------|-------------|------------------|
| `.topbar-inner max-width` | `1120px` | `1280px` |

**结论**：壳层样式除 topbar `max-width` 微差外，可完全替换为 `shared/styles/shell.css`。迁移后统一使用 shared 的 `1280px`。

### 2.3 公共组件样式（L161–285）

| 类名 | billing.html 行号 | shared 文件 | 差异 |
|------|---------------|-------------|------|
| `.icon-btn` | L161–180 | `components.css` L63–85 | 一致 |
| `.search` + input | L182–206 | `components.css` L114–144 | 一致 |
| `.btn-primary` | L208–223 | `components.css` L3–20 | 微差：billing 硬编码 `border-radius: 14px`，shared 用 `var(--radius)`（值相同） |
| `.btn-secondary` | L225–240 | `components.css` L22–42 | 微差：billing 用 `var(--surface)` + `var(--border)`，shared 用 `rgba()` 写法 |
| `.chip` | L242–252 | `components.css` L89–101 | 微差：shared 多 `white-space: nowrap; line-height: 1.1` |
| `.apple-card` | L254–261 | `components.css` L105–110 | 差异：billing 多 `transition`、`overflow: hidden` |
| `.apple-table` | L263–285 | `components.css` L186–216 | **显著差异** |

**Apple Table 差异明细**：

| 属性 | billing.html | shared/components.css |
|------|-------------|----------------------|
| `th` font-weight | `900` | `700` |
| `th` letter-spacing | `0.06em` | `0.02em` |
| `th` padding | `12px 16px` | `10px 14px` |
| `th` border-color | `var(--border)` | `#e5e5ea` |
| `td` padding | `16px` | `14px 14px` |
| `td` border-color | `rgba(226, 232, 240, 0.7)` | `#f2f2f7` |
| `tr:hover td` background | `rgba(2, 6, 23, 0.01)` | `#fbfbfd` |

**结论**：`.btn-primary`、`.btn-secondary`、`.chip` 微差可忽略，直接用 shared 替代。`.apple-card` 的 `transition` / `overflow` 可保留在模块层。`.apple-table` 差异较大，迁移后应统一使用 shared 版本。

### 2.4 Segmented Control 差异（L319–338）

| 属性 | billing.html | shared/components.css |
|------|-------------|----------------------|
| 外层 `background` | `rgba(15, 23, 42, 0.04)` | `rgba(118, 118, 128, 0.12)` |
| 外层 `padding` | `2px` | `2px` |
| 外层 `border-radius` | `12px` | `8px` |
| 外层 `border` | `1px solid rgba(226, 232, 240, 0.9)` | 无 |
| 按钮选择器 | `button` (原生) | `.segment-btn` (class) |
| 按钮 padding | `6px 14px` | `6px 14px` |
| 按钮 font-weight | `900` | `500` |
| 按钮 color | `var(--muted)` (default) | `var(--text)` (default) |
| 按钮 border-radius | `10px` | `6px` |
| `.active` shadow | `0 3px 8px rgba(2, 6, 23, 0.1)` | `0 3px 8px + 0 3px 1px ...` |

**结论**：segmented control 需要对齐到 shared 版本。billing 使用原生 `button` 选择器而非 `.segment-btn`，迁移时需统一。

### 2.5 财务页专有样式

以下样式 **不存在于 shared/**，属于财务模块专有或潜在共享候选：

| 类名 | 行号 | 说明 | 共享候选？ |
|------|------|------|-----------|
| `.text-hero` | L45–50 | 大标题（34px, 800 weight） | ⚠️ 可共享（仪表盘等页面也可能使用类似大标题） |
| `.tag` | L287–297 | 基础 tag（pill shape） | ⚠️ 可共享（tasks.html 也有相同定义） |
| `.tag-green` | L298–302 | 已结清语义 | ⚠️ 可共享 |
| `.tag-blue` | L303–307 | 部分回款语义 | ⚠️ 可共享 |
| `.tag-orange` | L308–312 | 待付款/逾期预警语义 | ⚠️ 可共享 |
| `.tag-red` | L313–317 | 欠款逾期语义 | ⚠️ 可共享 |

**`.tag` 家族与 tasks.html 对比**：billing.html 和 tasks.html 均定义了 `.tag` / `.tag-green` / `.tag-blue` / `.tag-orange` / `.tag-red`，样式几乎一致。建议提升到 `shared/styles/components.css`。

---

## 3. HTML 区块详情

### 3.1 移动端导航（L381–469）

与 `shared/shell/mobile-nav.html` 内容 **结构一致**，但存在路径差异：

| 导航项 | billing.html 中的 href | shared 中的 href |
|--------|----------------------|-----------------|
| 客户 | `customers.html` | `customers/index.html` |
| 案件 | `cases-list.html` | `case/index.html` |
| 任务与提醒 | `tasks.html` | `tasks/index.html` |
| 收费与财务 | `billing.html`（有 `aria-current="page"`） | `billing.html`（无 `aria-current`） |

### 3.2 桌面侧边导航（L471–553）

与 `shared/shell/side-nav.html` 内容 **结构一致**，路径差异同上。

### 3.3 顶部工具栏（L555–583）

与 `shared/shell/topbar.html` **结构一致**，差异：

| 元素 | billing.html | shared/topbar.html |
|------|-------------|-------------------|
| "新建咨询" href | `leads-messages.html` | 相同 |
| "新建案件" href | `case-create.html` | `case/create.html` |
| topbar max-width | `1120px` (内联 CSS) | `1280px` (shared CSS) |

**路径问题**：`case-create.html` 是旧路径，shared 已更新为 `case/create.html`。

### 3.4 页面标题区（L585–603）

```
┌───────────────────────────────────────────────────────┐
│ 收费与财务                    [导出报表] [+ 登记回款]   │
│ 管理案件费用、收款节点及回款记录                        │
└───────────────────────────────────────────────────────┘
```

- `<h1>` 使用 `.text-hero`（34px, 800 weight）
- 副标题: `text-[15px] text-[var(--muted)] font-semibold`
- "导出报表" 使用 `.btn-secondary` + SVG 下载图标 → **🔴 P1 泄漏项**
- "登记回款" 使用 `.btn-primary` + SVG plus 图标
- **两个按钮均无 JS 行为绑定**（无 `onclick`、无 `id`、无 `data-action`）

### 3.5 财务摘要卡（L605–633）

4 张 `.apple-card`，网格布局 `grid-cols-1 md:grid-cols-4`：

| # | 卡片标题 | 演示金额 | 辅助信息 | 特殊样式 |
|---|---------|---------|---------|---------|
| 1 | 本月新增应收 (JPY) | ¥ 2,450,000 | 较上月增长 12%（绿色箭头） | 标准卡片 |
| 2 | 本月已回款 (JPY) | ¥ 1,850,000 | 包含预付款和尾款 | 标准卡片 |
| 3 | 总未收金额 (JPY) | ¥ 3,200,000 | 分布在 24 个活跃案件中 | 金额使用 `var(--primary)` 颜色 |
| 4 | 逾期欠款 (JPY) | ¥ 450,000 | 3 笔逾期款项，需催收（含 ⚠️ SVG） | 红色边框 + 红色背景 |

- 所有金额为 **硬编码静态值**
- 增长百分比为 **硬编码静态值**
- **无 JS 行为**：点击卡片不联动筛选

**与 P0 规格对比**：

| 摘要卡 | P0 规格对应 | 口径备注 |
|--------|-----------|---------|
| 本月新增应收 | §5.1 应收金额 | 规格未要求"本月"维度；P0 摘要卡应展示全局维度的应收/已收/未收/逾期 |
| 本月已回款 | §5.1 已收金额 | 同上——"本月"是统计维度，非 P0 必需 |
| 总未收金额 | §5.1 未收金额 | 对齐——展示全部案件总未收 |
| 逾期欠款 | §5.2 逾期状态 | 对齐——展示逾期总金额 |

### 3.6 控制栏（L635–656）

#### Segmented Control（L637–641）

| 段 | 文本 | 状态 |
|----|------|------|
| 1 | 案件收费列表 | `active` |
| 2 | 回款流水记录 | 默认 |
| 3 | 发票管理 | 默认 → **🔴 P1 泄漏项** |

- **"发票管理"** 按 P0 规格 §P0明确不做：发票管理后置至 P1。迁移时应移除此 tab，仅保留"案件收费列表"和"回款流水记录"。
- **无 JS 行为**：点击不切换视图

#### 搜索与筛选（L643–655）

- 案件搜索输入框：`placeholder="搜索案件或客户..."`，Tailwind 样式（非 shared `.search-input`）
- 状态下拉筛选：`<select>` 包含 5 个选项

| # | 选项文本 | P0 规格对应 |
|---|---------|-----------|
| 1 | 所有回款状态 | 默认全部 |
| 2 | 部分回款 | §5.2 partial |
| 3 | 已确认待付款 | ⚠️ 不对齐——规格为"未回款"（unpaid） |
| 4 | 已结清 | §5.2 paid |
| 5 | 有逾期 | §5.2 overdue |

**P0 规格要求但缺失的筛选器**：

| 缺失筛选 | P0 规格位置 |
|----------|-----------|
| Group | §2.3 |
| 负责人 | §2.3 |

### 3.7 案件收费列表（L658–774）

`<table class="apple-table">` 包含 4 条 demo 行：

#### 表头列（8 列）

| # | 列名 | 宽度 | 对齐 |
|---|------|------|------|
| 1 | 案件信息 | 3/12 | left |
| 2 | 客户 | 2/12 | left |
| 3 | 总额(¥) | 1/12 | right |
| 4 | 已收(¥) | 1/12 | right |
| 5 | 未收(¥) | 1/12 | right |
| 6 | 状态 | 1/12 | left |
| 7 | 下一收款节点 | 2/12 | left |
| 8 | 操作 | 1/12 | right |

**与 P0 规格 §2.1 列定义对比**：

| P0 规格字段 | 列表现状 | 差距 |
|------------|---------|------|
| 案件名称 | ✅ "案件信息" 列含案件名 + 编号 | 对齐 |
| 客户名称 | ✅ "客户" 列含名称 + 类型 | 对齐 |
| Group | ❌ 缺失 | 🔴 需新增 |
| 应收金额 | ✅ "总额(¥)" | 对齐（建议列名改为"应收"） |
| 已收金额 | ✅ "已收(¥)" | 对齐 |
| 未收金额 | ✅ "未收(¥)" | 对齐 |
| 下一收款节点 | ✅ "下一收款节点" 列 | 对齐 |
| 回款状态 | ✅ "状态" 列 | 对齐（但枚举不一致，见下） |

#### Demo 数据行

| # | 案件名 | 编号 | 客户 | 总额 | 已收 | 未收 | 状态 tag | 下一节点 | 操作 | 行背景 |
|---|-------|------|------|------|------|------|---------|---------|------|-------|
| 1 | 高度人才 (HSP) 申请 | CAS-2023-1089 | Michael T. / 个人 | 350,000 | 175,000 | 175,000 | `tag-blue` 部分回款 | 尾款 (50%) · 申请获批后 7天内 | 详情 | 标准 |
| 2 | 经营管理签证 新规 | CAS-2023-1102 | Global Tech KK / 企业 | 500,000 | 0 | 500,000 | `tag-red` 欠款逾期 | 首付款 (100%) · 已逾期 5 天 | 催收 | `rgba(220,38,38,0.04)` 红色高亮 |
| 3 | 家族滞在签证 续签 | CAS-2023-0945 | Sarah W. / 个人 | 80,000 | 80,000 | 0 | `tag-green` 已结清 | - | 详情 | 标准 |
| 4 | 就劳签证 变更 | CAS-2023-1150 | Li M. / 个人 | 120,000 | 0 | 120,000 | `tag-orange` 已确认待付款 | 全款 (100%) · 资料收集齐后 3天内 | 详情 | 标准 |

- 案件链接：4 条均指向 `case/detail.html`
- 操作列仅有文字按钮（"详情" / "催收"），**无 JS 行为**
- 逾期行使用红色背景高亮——与 P0 规格 §2.2 逾期展示 对齐

#### 状态枚举对齐分析

| billing.html 状态 | P0 规格 §5.2 | case-detail-config.js `BILLING_STATUS` | 数据模型 §3.20 `BillingPlan.status` | 对齐度 |
|-------------------|-------------|---------------------------------------|-------------------------------------|--------|
| 部分回款 | 部分回款 | `partial: '部分回款'` | `partial` | ✅ 一致 |
| 欠款逾期 | 逾期 | `arrears: '欠款'` | `overdue` | ⚠️ 命名差异——billing.html 用"欠款逾期"，规格用"逾期"，case-detail 用"欠款"，数据模型用 `overdue` |
| 已结清 | 已结清 | `paid: '已结清'` | `paid` | ✅ 一致 |
| 已确认待付款 | 未回款 | `unpaid: '应收'` | `due` | ⚠️ 三方命名不一致——billing.html"已确认待付款" vs 规格"未回款" vs case-detail"应收" vs 数据模型 `due` |
| — | — | `waived: '免除'` | — | 规格无此状态；case-detail 有 |

**结论**：状态枚举需在 `billing-config.js` 中统一定义，以 P0 规格 §5.2 + 数据模型 §3.20 为权威，并与 case-detail-config.js `BILLING_STATUS` 对齐。

---

## 4. 交互行为清单

| # | 交互 | 实现方式 | 行号 | 功能状态 |
|---|------|---------|------|---------|
| 1 | 移动端导航开关 | IIFE 监听 `data-nav-open` / `data-nav-close` + Escape | L780–801 | ✅ 功能正常 |
| 2 | Topbar "新建咨询" | `onclick → window.location.href` | L572 | ✅ 导航到 leads-messages.html |
| 3 | Topbar "新建案件" | `onclick → window.location.href` | L575 | ✅ 导航到 case-create.html（旧路径） |
| 4 | 案件链接跳转（×4） | `<a href="case/detail.html">` | L677,702,727,752 | ✅ 静态导航 |
| 5 | "导出报表" 按钮 | 无事件绑定 | L594–597 | ❌ 无 JS + **P1 泄漏** |
| 6 | "登记回款" 按钮 | 无事件绑定 | L598–601 | ❌ 无 JS |
| 7 | Segmented control 切换 | 仅 CSS class `.active` 静态标记 | L637–641 | ❌ 无 JS |
| 8 | 搜索输入框 | 原生 `<input>` | L645 | ❌ 无 JS |
| 9 | 状态筛选下拉 | 原生 `<select>` | L648–654 | ❌ 无 JS |
| 10 | "详情" 按钮（×3） | 无事件绑定 | L695,745,769 | ❌ 无 JS |
| 11 | "催收" 按钮（×1） | 无事件绑定 | L721 | ❌ 无 JS |
| 12 | 全局搜索 | 无 JS（未引入 `navigate.js`） | L564–569 | ❌ 无搜索功能 |

**总结**：仅移动端导航、topbar 按钮和案件链接有实际交互。财务页核心功能（视图切换、筛选、批量操作、登记回款弹窗）全部缺失。

---

## 5. 脚本依赖

| 脚本 | 来源 | 引入方式 | 说明 |
|------|------|---------|------|
| 移动端导航 IIFE | 内联 `<script>` L780–801 | 直接嵌入 | 与 `shared/scripts/mobile-nav.js` 完全一致 |
| `shared/scripts/navigate.js` | **未引入** | — | 全局搜索弹窗、`⌘K` 快捷键、`data-navigate` 均不可用 |

---

## 6. P1 泄漏项识别

以下内容出现在 billing.html 中，但按 P0 规格 §P0明确不做 应后置至 P1：

| # | 泄漏项 | 行号 | P0 规格判定 | 处理建议 |
|---|-------|------|-----------|---------|
| 1 | "导出报表" 按钮 | L594–597 | §P0明确不做："批量导出收费报表 → P1" | **移除**或标注为 `[P1]` 并禁用 |
| 2 | "发票管理" segmented tab | L640 | §P0明确不做："发票管理（开票/发票状态）→ P1" | **移除**该 tab 段 |

---

## 7. 出站链接审计（billing.html → 其他页面）

### 7.1 导航链接（侧边栏 + 移动端各出现一次）

| 目标页面 | billing.html 中的 href | 最新正确路径 | 需修复？ |
|----------|----------------------|-------------|---------|
| 仪表盘 | `dashboard/index.html` | `dashboard/index.html` | ⚠️ 视情况 |
| 咨询与会话 | `leads-messages.html` | `leads-message/index.html` | ⚠️ 视情况 |
| 客户 | `customers.html` | `customers/index.html` | **是** |
| 案件 | `cases-list.html` | `case/index.html` | **是** |
| 任务与提醒 | `tasks.html` | `tasks/index.html` | **是** |
| 收费与财务 | `billing.html`（self, `aria-current="page"`） | `billing/index.html`（迁移后） | **是** |
| 资料中心 | `documents.html` | `documents.html` | 无需 |
| 文书中心 | `forms.html` | `forms.html` | 无需 |
| 报表 | `reports.html` | `reports.html` | 无需 |
| 设置 | `settings.html` | `settings.html` | 无需 |
| 客户门户 | `../src/index.html` | `../src/index.html` | 无需 |

### 7.2 内容链接

| 目标 | billing.html 中的 href | 最新正确路径 | 需修复？ |
|------|----------------------|-------------|---------|
| 案件详情（行 ×4） | `case/detail.html` | `case/detail.html` | 无需（迁移到 `billing/` 后需加 `../`） |
| 新建咨询（topbar） | `leads-messages.html` | `leads-messages.html` | 无需（迁移后需加 `../`） |
| 新建案件（topbar） | `case-create.html` | `case/create.html` | **是** |

### 7.3 迁移后路径影响

当 `billing.html` 迁移为 `billing/index.html` 后，所有 admin 根级相对路径需要加 `../` 前缀。使用 shared shell 后，导航链接由共享片段统一管理，仅内容区链接（案件详情等）需要关注。

---

## 8. 入站链接审计（其他页面 → billing.html）

以下页面通过导航项链接到 `billing.html`：

| 来源页面 | 链接路径 |
|----------|---------|
| `shared/shell/side-nav.html` | `billing.html` |
| `shared/shell/mobile-nav.html` | `billing.html` |
| `dashboard/index.html` | `billing.html`（内联导航） |
| `dashboard/index.html` | `billing.html`（内联导航） |
| `cases-list.html` | `billing.html`（内联导航） |
| `case/index.html` | `billing.html`（内联导航） |
| `case/detail.html` | `billing.html`（内联导航） |
| `case/create.html` | `billing.html`（内联导航） |
| `customers/index.html` | `billing.html`（内联导航） |
| `customers/detail.html` | `billing.html`（内联导航） |
| `tasks.html` | `billing.html`（内联导航） |
| `tasks/index.html` | `billing.html`（内联导航） |
| `leads-messages.html` | `billing.html`（内联导航） |
| `leads-message/index.html` | `billing.html`（内联导航） |
| `leads-message/detail.html` | `billing.html`（内联导航） |
| `documents.html` | `billing.html`（内联导航） |
| `forms.html` | `billing.html`（内联导航） |
| `reports.html` | `billing.html`（内联导航） |
| `settings.html` | `billing.html`（内联导航） |
| `case-detail.html` | `billing.html`（内联导航） |
| `case-create.html` | `billing.html`（内联导航） |

> **迁移影响**：已迁移到 shared shell 的页面（如 `customers/index.html`、`dashboard/index.html`、`tasks/index.html`）引用 `shared/shell/side-nav.html`，只需更新一处。仍在使用内联导航的旧页面需要逐个更新。本轮仅记录，不立即修复旧页面中的链接。

---

## 9. 共享候选汇总

### 9.1 可直接替换为 shared 的内容

| 当前内容 | 目标共享文件 | 置信度 |
|----------|------------|--------|
| `:root` CSS Token（L11–26） | `shared/styles/tokens.css` | ✅ 无冲突 |
| `body` 字体 + 基础样式（L28–43） | `shared/styles/tokens.css` | ✅ 无冲突 |
| `prefers-reduced-motion`（L369–375） | `shared/styles/tokens.css` | ✅ 无冲突 |
| `.skip-link` + `focus-visible`（L52–71） | `shared/styles/shell.css` | ✅ 无冲突 |
| `.app-shell` 网格（L73–82） | `shared/styles/shell.css` | ✅ 无冲突 |
| `.side-nav` 全家族（L84–141） | `shared/styles/shell.css` | ✅ 无冲突 |
| `.topbar` 全家族（L143–159） | `shared/styles/shell.css` | ✅ `max-width` 微差，统一用 shared |
| `.mobile-nav` 全家族（L340–367） | `shared/styles/shell.css` | ✅ 无冲突 |
| `.icon-btn`（L161–180） | `shared/styles/components.css` | ✅ 无冲突 |
| `.search`（L182–206） | `shared/styles/components.css` | ✅ 无冲突 |
| `.btn-primary`（L208–223） | `shared/styles/components.css` | ✅ 微差可忽略 |
| `.btn-secondary`（L225–240） | `shared/styles/components.css` | ✅ 微差可忽略 |
| `.chip`（L242–252） | `shared/styles/components.css` | ✅ 微差可忽略 |
| 桌面侧边导航 HTML（L471–553） | `shared/shell/side-nav.html` | ✅ 内容一致 |
| 移动端导航 HTML（L381–469） | `shared/shell/mobile-nav.html` | ✅ 内容一致 |
| 顶部工具栏 HTML（L555–583） | `shared/shell/topbar.html` | ✅ 内容一致 |
| 移动端导航 JS（L780–801） | `shared/scripts/mobile-nav.js` | ✅ 完全一致 |

### 9.2 需对齐后替换

| 当前内容 | 目标 | 差异说明 |
|----------|------|---------|
| `.segmented-control`（L319–338） | `shared/styles/components.css` | pill 形 vs. rounded 形；`button` vs `.segment-btn`；字重 900 vs. 500。需确认基准版本，然后统一 |
| `.apple-table`（L263–285） | `shared/styles/components.css` | `th` 字重/间距/内边距差异；`td` 内边距/边框色差异。迁移后统一用 shared 版本 |
| `.apple-card`（L254–261） | `shared/styles/components.css` | billing 版多 `transition` + `overflow: hidden`。`transition` 移到模块层或提议合并到 shared |

### 9.3 财务模块专有（保留在 billing/ 层）

| 样式 / 结构 | 说明 | 备注 |
|------------|------|------|
| `.text-hero` | 大标题字号 | 若其他页面也需要，再提升到 shared |
| 摘要卡红色变体 | 逾期欠款卡的红色边框/背景 | 通过 Tailwind 内联实现，保留在 section |
| 逾期行红色高亮 | `bg-[rgba(220,38,38,0.04)]` | 财务列表专有语义 |

### 9.4 潜在新增共享候选

| 类名 | 当前位置 | 共享理由 |
|------|---------|---------|
| `.tag` / `.tag-green` / `.tag-blue` / `.tag-orange` / `.tag-red` | billing.html L287–317；tasks.html 中也有近似定义 | 案件列表、仪表盘、任务、财务均需要语义标签；建议提升到 `shared/styles/components.css` |

---

## 10. 与 P0 规格的差距汇总

对照 [收费与财务.md](../../../../docs/gyoseishoshi_saas_md/P0/06-页面规格/收费与财务.md)：

| 规格要求 | 原型现状 | 差距等级 |
|----------|---------|---------|
| 8 列字段（名称、客户、Group、应收、已收、未收、下一节点、状态） | 有 7 列，缺 Group | 🟡 缺 1 列 |
| 3 个筛选器（状态、Group、负责人）+ 搜索 | 仅有状态下拉 + 搜索 | 🔴 缺 2 个筛选 |
| 默认排序：逾期置顶 → 未收降序 → 到期日升序 | 无排序逻辑（静态行） | 🟡 需在 config 中声明 |
| 批量动作：批量生成催款任务 + 三段式结果 + 跳过原因 | 无批量操作 | 🔴 完全缺失 |
| 收费计划面板（节点列表、配置入口、变更留痕） | 无 | 🔴 完全缺失 |
| 回款记录（金额、日期、凭证、关联 BillingPlan） | 无 | 🔴 完全缺失 |
| 财务备注（内部备注区域） | 无 | 🟡 缺失 |
| 登记回款弹窗（5 字段 + BillingPlan 归集 + 金额校验） | "登记回款"按钮有但无弹窗 | 🔴 完全缺失 |
| 回款更正（作废/冲正 + 留痕） | 无 | 🔴 完全缺失 |
| 催款任务生成规则 + 去重策略 | 无 | 🔴 完全缺失 |
| 欠款风险确认留痕 | 无 | 🔴 完全缺失 |
| 分段视图切换（案件收费列表 / 回款流水） | segmented control 有但无 JS | 🟡 结构在、行为缺 |
| 空状态（无收费计划提示） | 无 | 🟡 需补占位 |
| Toast 反馈（登记回款/催款/风险确认等） | 无 toast 组件 | 🔴 完全缺失 |
| 权限可见性（管理员/财务/主办人/助理） | 无权限逻辑 | 🟡 需在 config 中声明 |
| `navigate.js` 全局搜索 | 未引入 | 🟡 需补引入 |

---

## 11. 跨模块口径一致性

### 11.1 案件详情收费 Tab

`case-detail-config.js` 中 `BILLING_STATUS` 定义了 5 个状态（paid / partial / unpaid / arrears / waived），与 billing.html 的 4 个状态 tag、P0 规格 §5.2 的 4 个状态、数据模型的 4 个枚举值存在命名不一致（详见 §3.7 状态枚举对齐分析）。

`DETAIL_SAMPLES` 中每个案件场景都携带 `billing` 数据（total / received / outstanding + payments），与 billing.html demo 数据的金额口径一致（应收 - 已收 = 未收），但案件编号和日期不重叠。

### 11.2 仪表盘待回款卡片

`dashboard-config.js` 中 `pendingBilling` 卡片为待回款入口，action 文案为"登记回款" / "上传凭证"。billing.html 的主按钮"登记回款"与之一致。迁移后需确保仪表盘的"登记回款"链接能正确跳转到 `billing/index.html`。

### 11.3 催款任务与任务模块

P0 规格 §6 定义了催款任务生成规则和去重策略（`case_id + billing_plan_id + overdue_cycle_start`），但当前 billing.html 完全没有催款任务交互。tasks 模块（`tasks/index.html`）也未包含催款来源的任务样例。迁移时需在 `billing-demo-data.js` 中补充催款任务结果示例，并在 `tasks-demo-data.js` 中补充来源为"催款"的任务条目。

---

## 12. 旧入口兼容策略（决策记录）

### 12.1 决策

**采用「两阶段重定向迁移」策略：共享壳层前置更新 + 重定向桩兜底。**

| 项目 | 决策 |
|------|------|
| 策略名称 | 两阶段重定向迁移 |
| `billing.html` 处置 | Phase 1 保留原内容不动；Phase 2（任务 7）替换为前向重定向桩 |
| `billing/index.html` 处置 | Phase 1 为反向重定向占位（→ `../billing.html`）；Phase 2 替换为模块骨架 |
| shared shell 更新 | ✅ Phase 1 已完成——指向 `billing/index.html` |
| 非 shared shell 内联导航 | 不修改——由 `billing.html` 存在 / 重定向兜底 |
| 全仓批量链接清理 | Phase 3（可选），待全部模块迁移后统一执行 |

对比三种候选方案的选型理由：

| 方案 | 优点 | 缺点 | 选型 |
|------|------|------|------|
| A. 保留旧文件不动，不更新任何链接（tasks 模式） | 零风险 | 共享壳层长期指向旧路径，新旧不统一 | ❌ |
| B. 一次性批量替换全仓 `billing.html` → `billing/index.html` | 链接一步到位 | 涉及 20+ 文件、易遗漏、回滚困难 | ❌ |
| **C. 重定向桩 + 共享壳层前置更新** | 仅改 3 个文件即可零断链；分阶段可控 | Phase 1→2 之间存在 1 次重定向跳转 | ✅ |

### 12.2 两阶段执行计划

#### Phase 1：共享壳层前置更新（✅ 已完成）

| # | 变更 | 文件 | 旧值 | 新值 | 状态 |
|---|------|------|------|------|------|
| 1 | 创建反向重定向占位 | `billing/index.html` | 不存在 | `<meta http-equiv="refresh" content="0;url=../billing.html">` | ✅ |
| 2 | 更新桌面导航 | `shared/shell/side-nav.html` | `href="billing.html"` | `href="billing/index.html"` | ✅ |
| 3 | 更新移动导航 | `shared/shell/mobile-nav.html` | `href="billing.html"` | `href="billing/index.html"` | ✅ |

Phase 1 后的链路状态：

```
shared shell 页面 ──→ billing/index.html ──(redirect)──→ ../billing.html ──→ 原始内容
内联导航页面    ──→ billing.html ──→ 原始内容（直达）
子目录内联页面  ──→ ../billing.html ──→ 原始内容（直达）
```

#### Phase 2：模块骨架落地（任务 7 执行时同步完成）

| # | 变更 | 文件 | 旧值 | 新值 |
|---|------|------|------|------|
| 1 | 替换为模块骨架 | `billing/index.html` | 反向重定向占位 | 完整的模块化页面（shared 壳层 + sections + scripts） |
| 2 | 替换为前向重定向 | `billing.html` | 原始 803 行单文件 | `<meta http-equiv="refresh" content="0;url=billing/index.html">` |

Phase 2 后的链路状态：

```
shared shell 页面 ──→ billing/index.html ──→ 模块化内容（直达）
内联导航页面    ──→ billing.html ──(redirect)──→ billing/index.html ──→ 模块化内容
子目录内联页面  ──→ ../billing.html ──(redirect)──→ billing/index.html ──→ 模块化内容
```

#### Phase 3：全仓内联链接清理（可选）

当所有模块均迁移到子目录后，统一扫描全仓内联导航，将 `billing.html` / `../billing.html` 替换为 `billing/index.html` / `../billing/index.html`。此阶段可选——重定向桩在原型场景下无性能影响。

### 12.3 Phase 2 重定向桩模板

任务 7 执行时，将 `billing.html` 替换为以下内容：

```html
<!DOCTYPE html>
<!--
  billing.html — Legacy entry redirect

  This file preserves backward compatibility for the ~20 pages that link to
  billing.html via inline navigation.  The canonical billing module now lives
  at billing/index.html.

  Do NOT add content here.  Edit billing/index.html instead.
-->
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0;url=billing/index.html">
  <title>收费与财务 - Gyosei OS</title>
</head>
<body>
  <p>正在跳转到<a href="billing/index.html">收费与财务</a>…</p>
</body>
</html>
```

### 12.4 分层影响评估

#### Tier 1 — 共享壳层（✅ 已更新）

| 文件 | 旧 href | 新 href | 状态 |
|------|---------|---------|------|
| `shared/shell/side-nav.html` L61 | `billing.html` | `billing/index.html` | ✅ 已完成 |
| `shared/shell/mobile-nav.html` L68 | `billing.html` | `billing/index.html` | ✅ 已完成 |

受益页面（引用 shared shell 规范片段的子目录页面，导航路径自动从 `../billing.html` 变为 `../billing/index.html`）：`customers/index.html`、`customers/detail.html`、`dashboard/index.html`、`tasks/index.html`、`case/index.html`、`case/create.html`、`case/detail.html`、`leads-message/index.html`、`leads-message/detail.html`。

> **注意**：上述 9 个页面当前的内联导航仍然是 `../billing.html`（从 shared shell 旧版复制而来），不会自动更新。但 `../billing.html` 在 Phase 1 直达原始内容，在 Phase 2 通过重定向到达新页面——两个阶段均不断链。当这些页面下次从 shared shell 复制更新导航时，会自动获得新路径。

#### Tier 2 — 跨模块业务入口（需逐一验证文案与路径）

| 入口 | 所在文件 | 当前路径 | 备注 |
|------|---------|---------|------|
| 仪表盘「待回款案件」卡片 | `dashboard/index.html` | `../billing.html`（内联链接） | 文案"登记回款"/"查看详情"需与财务页主按钮对齐 |
| 仪表盘「进入财务」 | `dashboard/index.html` L842 | `billing.html` | 工作台网格入口 |
| 案件详情「收费」Tab | `case/detail.html` | Tab 内联，不跳转财务列表 | Tab 内的"登记回款""上传凭证""创建催款任务"文案需与财务页一致 |
| 任务列表催款任务 | `tasks/index.html` | 无直链（P0 催款任务尚未实现） | 未来催款任务行应可跳转到财务页对应案件收费 |

> **文案一致性要求**：Tier 2 入口中的动作文案（"登记回款"/"上传凭证"/"创建催款任务"）必须与 P0 规格 §4 关键动作表保持一致。本轮仅记录差异，不修改其他模块文件。

#### Tier 3 — 旧内联导航页面（由重定向桩兜底）

以下页面仍使用内联导航（非 shared shell），链接到 `billing.html`：

| 来源页面 | 链接路径 | Phase 1 | Phase 2 |
|----------|---------|---------|---------|
| `dashboard/index.html`（导航 ×2 + 内容 ×1） | `billing.html` | 直达原始内容 | 重定向到 `billing/index.html` |
| `tasks.html` | `billing.html` | 直达 | 重定向 |
| `leads-messages.html` | `billing.html` | 直达 | 重定向 |
| `cases-list.html` | `billing.html` | 直达 | 重定向 |
| `documents.html` | `billing.html` | 直达 | 重定向 |
| `forms.html` | `billing.html` | 直达 | 重定向 |
| `reports.html` | `billing.html` | 直达 | 重定向 |
| `settings.html` | `billing.html` | 直达 | 重定向 |
| `case-detail.html` | `billing.html` | 直达 | 重定向 |
| `case-create.html` | `billing.html` | 直达 | 重定向 |
| `customers copy.html` | `billing.html` | 直达 | 重定向 |

子目录页面（内联导航路径为 `../billing.html`，兼容机制相同）：

`dashboard/index.html`、`customers/index.html`、`customers/detail.html`、`case/index.html`、`case/detail.html`、`case/create.html`、`tasks/index.html`、`leads-message/index.html`、`leads-message/detail.html`

#### 内容区链接（非导航）

| 来源 | 链接路径 | 说明 |
|------|---------|------|
| `dashboard/index.html` L842 | `billing.html` | "进入财务" 卡片链接 |
| `src/pages/admin/_parts/admin-prototype/WorkbenchGrid.html` | `billing.html` | 组件模板内 |
| `src/pages/admin/_parts/dashboard/QuickActions.html` | `billing.html` | 快捷操作卡片 |
| `src/components/Admin/SideNav.html` | `billing.html` | 组件模板导航 |
| `src/components/Admin/MobileNav.html` | `billing.html` | 组件模板导航 |

### 12.5 新模块导航路径规则

`billing/index.html` 位于子目录内，导航路径调整规则与 `tasks/index.html` 一致：

| 导航项 | 规范路径（admin 根级） | 调整后路径（billing/ 子目录） |
|--------|----------------------|--------------------------|
| 仪表盘 | `dashboard/index.html` | `../dashboard/index.html` |
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

内容区链接（案件详情等）：`case/detail.html` → `../case/detail.html`。

### 12.6 `aria-current` 规则

在 `billing/index.html` 中，**「收费与财务」导航项**必须在以下两处同时添加 `aria-current="page"`：

1. **移动端导航**（`mobile-nav` 内 `<nav>` 中）：
   ```html
   <a class="nav-item" href="index.html" aria-current="page">...收费与财务</a>
   ```
2. **桌面侧边导航**（`side-nav` 内 `<nav>` 中）：
   ```html
   <a class="nav-item" href="index.html" aria-current="page">...收费与财务</a>
   ```

样式由 `shared/styles/shell.css` 中 `.nav-item[aria-current="page"]` 驱动。

### 12.7 后续执行清单

| # | 步骤 | 前置条件 | 产出 | 状态 |
|---|------|---------|------|------|
| 1 | 创建 `billing/index.html` 反向重定向占位 | — | shared shell 链接不断 | ✅ 已完成 |
| 2 | 更新 shared shell → `billing/index.html` | 步骤 1 | Tier 1 指向新路径 | ✅ 已完成 |
| 3 | 任务 7：替换 `billing/index.html` 为模块骨架 | 步骤 2 + P0-CONTRACT | 可访问的模块化入口 | 待执行 |
| 4 | 任务 7：替换 `billing.html` 为前向重定向桩（§12.3 模板） | 步骤 3 | Tier 3 全部经重定向到达新页面 | 待执行 |
| 5 | 验证 §12.8 验证清单全部通过 | 步骤 4 | Phase 2 回归通过 | 待执行 |
| 6 | 核对 Tier 2 跨模块入口文案与路径 | 新模块核心区块就绪 | 文案一致性确认 | 待执行 |
| 7 | Phase 3：批量更新 Tier 3 内联链接（可选） | 所有模块迁移完毕 | 全仓统一、消除重定向 | 可选 |

### 12.8 Phase 2 验证清单

在任务 7 完成后（`billing/index.html` 为模块骨架 + `billing.html` 为前向重定向桩），执行以下验证：

| # | 验证项 | 预期结果 |
|---|--------|---------|
| 1 | 直接访问 `billing.html` | 即时跳转到 `billing/index.html`，无闪白 |
| 2 | 直接访问 `billing/index.html` | 显示模块化财务页面，无重定向 |
| 3 | 从 `dashboard/index.html` 导航栏点击"收费与财务" | 到达 `billing/index.html`（经 `billing.html` 重定向） |
| 4 | 从 `dashboard/index.html` 内容区"进入财务"点击 | 到达 `billing/index.html`（经 `billing.html` 重定向） |
| 5 | 从 `dashboard/index.html` 导航栏点击"收费与财务" | 到达 `billing/index.html`（经 `../billing.html` 重定向） |
| 6 | 从 `customers/index.html` 导航栏点击"收费与财务" | 到达 `billing/index.html`（经 `../billing.html` 重定向） |
| 7 | 从 `case/detail.html` 导航栏点击"收费与财务" | 到达 `billing/index.html`（经 `../billing.html` 重定向） |
| 8 | 从 `tasks/index.html` 导航栏点击"收费与财务" | 到达 `billing/index.html`（经 `../billing.html` 重定向） |
| 9 | `billing/index.html` 导航栏"收费与财务"高亮 | 有蓝色背景高亮（`aria-current="page"`） |
| 10 | `billing/index.html` 导航栏其他项路径正确 | 点击"仪表盘"/"客户"/"案件"等跳转正确页面 |
| 11 | 浏览器后退按钮 | 从财务页后退回到来源页，不卡在重定向页 |

---

## 13. 迁移风险与特别注意

| 风险项 | 说明 | 缓解措施 |
|--------|------|---------|
| 状态枚举不一致 | billing.html / case-detail-config / P0 规格 / 数据模型四方命名不统一 | 在 `billing-config.js` 中建立统一 enum，以规格 §5.2 + 数据模型 §3.20 为权威 |
| "发票管理" P1 泄漏 | segmented control 第 3 段直接出现在页面中 | 迁移时移除或 `[P1]` 标注 + `aria-disabled` |
| "导出报表" P1 泄漏 | header 主按钮之一 | 迁移时移除或降级为 disabled 辅助按钮 |
| 摘要卡"本月"维度 | P0 规格未要求"本月"维度 | 迁移时改为全局维度（总应收/总已收/总未收/逾期），"本月"留作 demo-only 标注 |
| 回款流水完全缺失 | segmented control 第 2 段"回款流水记录"无对应内容 | 需新建 `payment-log-table` section |
| 收费计划面板缺失 | P0 核心区块之一 | 需新建 `billing-plan-panel` section |
| 批量催款完全缺失 | P0 §2.4 唯一批量动作 | 需新建 `billing-bulk-actions` script + toast 反馈 |
