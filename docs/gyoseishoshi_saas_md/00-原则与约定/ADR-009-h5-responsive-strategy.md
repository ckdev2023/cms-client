# ADR-009: Admin Web H5 响应式适配策略

| 属性     | 值                                                        |
| -------- | --------------------------------------------------------- |
| 状态     | 已采纳                                                    |
| 决策日期 | 2026-05-05                                                |
| 触发缺陷 | R-H5-1 走查 P0×4 / P1×5 / P2×4 / P3×3 / P4×2 + i18n×2   |
| 影响范围 | admin / styles / shared/ui / views / i18n                 |

## 背景

R-H5-1 走查（`docs/gyoseishoshi_saas_md/_output/54-H5响应式走查-第一轮.md`）在 iPhone 12（390×844）+ iPhone SE（375×667）两个 viewport 下覆盖 8 个核心页面，发现 18 条 H5 问题。所有核心路径在移动端均出现横向溢出（`scrollWidth - clientWidth ≥ 14 ~ 383px`），没有一个页面在 H5 下属于"可用"状态。

根因分析指向三个体系性缺失：

1. **CSS 共因** — `CaseDetailView.vue` 的 `display: grid` 隐式 `grid-template-columns: 1fr`，浏览器解析为 `minmax(auto, 1fr)`，子项 min-content ≥ 545px 时列宽固化，视口无关。
2. **无 mobile-first 断点体系** — 全仓 `@media` 散落使用 600/720/767/768/1023/1024/1279 等不一致阈值，核心 view 文件无 H5 断点。
3. **高频组件无 H5 收纳策略** — TopBar 5 个 action 永远全展示、数据表格无 stacked 卡片模式、PageHeader actions 不换行。

## 决策

### 决策 1：所有 view 以 mobile-first 为基线，桌面布局放进 `@media (min-width: var(--bp-lg))`

新增或修改的页面布局必须以单列、堆叠为默认，桌面多列布局通过 `min-width` 媒体查询追加。存量页面在后续重构中逐步迁移，不强制一次性改写。

### 决策 2：所有 `display: grid` + `fr` 必须写成 `minmax(0, fr)`，所有 grid/flex 子项默认 `min-width: 0`

裸 `1fr` 会被浏览器解析为 `minmax(auto, 1fr)`，`auto` 取子项 max-content 作为最小宽度，导致列宽固化、无视视口。

- 正确写法：`grid-template-columns: minmax(0, 1fr)`。
- grid/flex 子项如果包含不可收缩内容（表格、`flex-wrap: nowrap` 容器），必须加 `min-width: 0`。
- 守门：`h5-overflow.contract.test.ts` 扫描 `packages/admin/src/**/*.vue` 的 `<style>` 块，命中裸 `fr` 且不在白名单中即 fail。存量白名单在 S7 等后续 PR 逐步清零。

### 决策 3：跨页通用表格必须用 `<ResponsiveTable>` 而非裸 `<table>`

`packages/admin/src/shared/ui/ResponsiveTable.vue` 提供两种渲染模式：

- `≥ md`：渲染原始 `<table>`（通过默认 slot 透传）。
- `< md`：渲染 stacked 卡片（每行一卡，字段 `<dl>` 纵排），支持 `#mobile-card` slot 自定义卡片。

切换由 `window.matchMedia` 驱动，阈值跟随 `--bp-md`（768px）。

守门：`h5-overflow.contract.test.ts` 扫描 `<template>` 中的 `<table>` 标签，若前 500 字符内无 `<ResponsiveTable>` 或 `data-h5-mode` 属性即 fail。存量白名单在 S3 迁移后逐步清零。

### 决策 4：PR review checklist 必须包含「H5 viewport 走查通过」；contract test 守门

每个涉及 UI 改动的 PR 需在 CI 中通过 `h5-overflow.contract.test.ts`：

- 规则 1（grid）：新增的 `grid-template-columns` 声明不得包含裸 `fr`。
- 规则 2（table）：新增的 `<table>` 必须被 `<ResponsiveTable>` 或 `data-h5-mode` 容器包裹。

真正的 viewport 走查（`scrollWidth ≤ clientWidth + 2`）由 chrome-devtools-mcp 在 390×844 + 375×667 下运行，作为手动验收步骤。

### 决策 5：i18n 守门 — `aria-label / placeholder / title` 等 attribute 严禁含 CJK 硬编码

`i18n-key-consistency.test.ts` 已包含扫描规则：`packages/admin/src/**/*.vue` 的 `<template>` 中不允许 `aria-label="[含 CJK]"` 模式。所有 accessibility attribute 必须通过 `t()` 或 `:aria-label="t(...)"` 动态绑定。

## 断点体系

`packages/admin/src/styles/breakpoints.css` 定义 4 档全仓统一断点：

| Token      | 值     | 布局策略                              |
| ---------- | ------ | ------------------------------------- |
| `--bp-sm`  | 640px  | 1 列堆叠 / icon-only / bottom sheet  |
| `--bp-md`  | 768px  | 表格→卡片切换阈值 / 2 列初始          |
| `--bp-lg`  | 1024px | 桌面表格 / 3 列 / sidebar 常驻        |
| `--bp-xl`  | 1280px | 当前默认桌面布局（无变化）             |

约定：后续新增代码统一使用 768 / 1024 / 1280 阈值；存量 600/720/1023 等不一致阈值在后续重构中归一，由 PR review 守门。

## 适用范围

覆盖 `packages/admin/src/` 下所有 view、shared/ui 组件、shell 组件。不影响 `packages/prototype/`（已与生产解耦）、`packages/server/`。

## 关联文件

- 断点 token：`packages/admin/src/styles/breakpoints.css`
- 响应式表格组件：`packages/admin/src/shared/ui/ResponsiveTable.vue`
- 响应式表格行组件：`packages/admin/src/shared/ui/ResponsiveTableRow.vue`
- contract test（守门）：`packages/admin/src/static-checks/h5-overflow.contract.test.ts`
- i18n 一致性测试（CJK 扫描）：`packages/admin/src/i18n/i18n-key-consistency.test.ts`
- R-H5-1 走查报告：`docs/gyoseishoshi_saas_md/_output/54-H5响应式走查-第一轮.md`
- R-H5-2 走查报告：`docs/gyoseishoshi_saas_md/_output/55-H5响应式走查-第二轮.md`
- 修复计划：`.cursor/plans/h5_responsive_fix_plan_94634db4.plan.md`

## 后果

- 新增 grid 声明被 contract test 自动拦截裸 `fr` 写法。
- 新增 `<table>` 被 contract test 自动拦截未包裹 `<ResponsiveTable>` 的写法。
- H5 viewport 走查成为 UI PR 的常规验收步骤。
- 存量违规通过白名单管理，随后续 PR 逐步清零。
- i18n attribute 硬编码被静态扫描自动拦截。
