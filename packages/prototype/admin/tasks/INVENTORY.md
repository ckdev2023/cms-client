# 任务与提醒页现有原型盘点

> 盘点对象：[packages/prototype/admin/tasks.html](../tasks.html)（490 行，单文件原型）
>
> 目的：为后续拆分（SPLIT-ARCHITECTURE.md）提供精确的区块定位、交互清单、样式覆盖分析、链接审计与共享候选列表。

---

## 1. 行号区块总览

| 行号范围 | 关注点 | 说明 |
|----------|--------|------|
| 1–7 | `<head>` 基础 | DOCTYPE、meta、title、Tailwind CDN |
| 8–140 | 内联 `<style>` | 设计 Token + 壳层布局 + 公共组件 + 任务专有样式 |
| 142–143 | Skip Link | `<a href="#main">` |
| 145–233 | 移动端导航 HTML | 侧滑抽屉，包含完整导航项列表 |
| 235–317 | 桌面侧边导航 HTML | `<aside class="side-nav">`，包含完整导航项列表 |
| 319–341 | 顶部工具栏 HTML | 搜索框 + "新建咨询" + "新建案件" 按钮 + 用户头像 |
| 343–356 | **页面标题区** | `<h1>任务与提醒</h1>` + 副标题 + "新建任务"按钮 |
| 358–390 | **工作台侧边栏** | 4 个视图入口（我的待办 / 今日到期 / 已逾期 / 提醒日志）+ badge |
| 392–461 | **任务列表区** | segmented control + `apple-card` + 3 条 `task-item` |
| 467–488 | 内联 `<script>` | 移动端导航开关（IIFE） |

---

## 2. 内联样式拆解（L8–140）

### 2.1 设计 Token（L9–33）

声明于 `:root`，与 `shared/styles/tokens.css` 高度重复。

| 变量 | tasks.html 值 | shared/tokens.css | 差异 |
|------|-------------|-------------------|------|
| `--bg` | `#f8fafc` | `#f8fafc` | 一致 |
| `--surface` | `#ffffff` | `#ffffff` | 一致 |
| `--surface-2` | `#f1f5f9` | `#f1f5f9` | 一致 |
| `--border` | `#e2e8f0` | `#e2e8f0` | 一致 |
| `--text` | `#0f172a` | `#0f172a` | 一致 |
| `--muted` | `#475569` | `#475569` | 一致 |
| `--muted-2` | `#64748b` | `#64748b` | 一致 |
| `--primary` | `#0369a1` | `#0369a1` | 一致 |
| `--primary-hover` | `#075985` | `#075985` | 一致 |
| `--shadow` | 双层阴影 | 双层阴影 | 一致 |
| `--radius` | `14px` | `14px` | 一致 |
| `--apple-blue` ~ `--apple-shadow` | 别名映射 | 别名映射 | 一致 |
| `--success` | **缺失** | `#16a34a` | tasks.html 未声明 |
| `--warning` | **缺失** | `#f59e0b` | tasks.html 未声明 |
| `--danger` | **缺失** | `#dc2626` | tasks.html 未声明 |
| `--shadow-hover` | **缺失** | 有 | tasks.html 未声明 |
| `--apple-link` | **缺失** | `var(--primary)` | tasks.html 未声明 |

**结论**：tokens 完全可用 `shared/styles/tokens.css` 替代，无冲突。

### 2.2 壳层布局样式（L35–120）

| 类名 | tasks.html 行号 | shared 文件 | 差异 |
|------|-------------|-------------|------|
| `body` 字体/基础 | L35–50 | `tokens.css` L34–49 | 一致 |
| `.display-font` | L52 | `tokens.css` L60–63 | 一致（shared 多 `font-family: inherit`） |
| `.skip-link` | L54–66 | `shell.css` L1–15 | 一致 |
| `focus-visible` | L68–71 | `shell.css` L17–20 | 一致 |
| `.app-shell` | L73–76 | `shell.css` L22–31 | 一致 |
| `.side-nav` / `.side-nav-inner` | L78–79 | `shell.css` L33–45 | 一致 |
| `.brand` / `.brand-title` | L80–81 | `shell.css` L46–57 | 一致 |
| `.nav-group-title` | L83 | `shell.css` L59–66 | 一致 |
| `.nav-item` + hover + `aria-current` + svg | L84–87 | `shell.css` L67–92 | 一致（shared 拆为多行） |
| `.topbar` / `.topbar-inner` | L89–91 | `shell.css` L94–110 | 一致 |
| `.mobile-nav` 全家族 | L112–116 | `shell.css` L112–139 | 一致 |
| `prefers-reduced-motion` | L118–120 | `tokens.css` L65–71 | 一致 |

**结论**：壳层样式完全可用 `shared/styles/shell.css` 替代。

### 2.3 公共组件样式（L92–110）

| 类名 | tasks.html 行号 | shared 文件 | 差异 |
|------|-------------|-------------|------|
| `.icon-btn` | L92–94 | `components.css` L63–85 | 一致 |
| `.search` + input | L96–98 | `components.css` L114–144 | 一致（tasks.html 用 Tailwind class 设定 svg 尺寸，shared 用 `.search svg`） |
| `.btn-primary` | L100–102 | `components.css` L3–20 | 微差：tasks.html 硬编码 `border-radius: 14px`，shared 用 `var(--radius)` |
| `.btn-pill` | L104–106 | `components.css` L44–61 | 微差：tasks.html 多一行 `font-weight: 900` |
| `.chip` | L108 | `components.css` L89–101 | shared 多 `white-space: nowrap; line-height: 1.1` |
| `.apple-card` | L110 | `components.css` L105–110 | 一致 |
| `.segmented-control` / `.segment-btn` | L122–124 | `components.css` L148–172 | **显著差异** |

**Segmented Control 差异明细**：

| 属性 | tasks.html | shared/components.css |
|------|-----------|----------------------|
| 外层 `background-color` | `rgba(15, 23, 42, 0.05)` | `rgba(118, 118, 128, 0.12)` |
| 外层 `padding` | `3px` | `2px` |
| 外层 `border-radius` | `999px` (pill) | `8px` (rounded) |
| 外层 `border` | `1px solid rgba(226, 232, 240, 0.9)` | 无 |
| `.segment-btn` padding | `7px 12px` | `6px 14px` |
| `.segment-btn` font-weight | `900` | `500` |
| `.segment-btn` color | `var(--muted)` (default) | `var(--text)` (default) |
| `.segment-btn` border-radius | `999px` | `6px` |
| `.segment-btn.active` shadow | `0 1px 2px rgba(...)` | `0 3px 8px + 0 3px 1px ...` |

**结论**：segmented control 需要对齐到 shared 版本或在拆分时明确哪个为基准。其余公共组件可用 shared 替代，微差可忽略。

### 2.4 任务页专有样式（L126–139）

以下样式 **不存在于 shared/**，属于任务模块专有或潜在共享候选：

| 类名 | 行号 | 说明 | 共享候选？ |
|------|------|------|-----------|
| `.task-list` | L126 | 无列表样式 `<ul>` | 模块专有 |
| `.task-item` | L127–129 | flex 布局 + 分割线 + hover 背景 | 模块专有 |
| `.checkbox-apple` | L131–133 | 圆形 checkbox + 勾选动画 | ⚠️ 可共享（案件等页面也需要类似 checkbox） |
| `.tag` | L135 | 基础 tag（pill shape） | ⚠️ 可共享（其他页面也用 tag） |
| `.tag-red` | L136 | 逾期语义 | ⚠️ 可共享 |
| `.tag-orange` | L137 | 今日到期语义 | ⚠️ 可共享 |
| `.tag-blue` | L138 | 即将到期语义 | ⚠️ 可共享 |
| `.tag-gray` | L139 | 默认/中性语义 | ⚠️ 可共享 |

---

## 3. HTML 区块详情

### 3.1 移动端导航（L145–233）

与 `shared/shell/mobile-nav.html` 内容 **结构一致**，但存在以下路径差异：

| 导航项 | tasks.html 中的 href | shared 中的 href |
|--------|---------------------|-----------------|
| 客户 | `customers.html` | `customers/index.html` |
| 任务与提醒 | `tasks.html`（有 `aria-current="page"`） | `tasks.html`（无 `aria-current`） |

### 3.2 桌面侧边导航（L236–317）

与 `shared/shell/side-nav.html` 内容 **结构一致**，路径差异同上。

### 3.3 顶部工具栏（L320–341）

与 `shared/shell/topbar.html` **结构一致**，差异：

| 元素 | tasks.html | shared/topbar.html |
|------|-----------|-------------------|
| 搜索 placeholder | `搜索：客户 / 案件 / 资料 / 文书...` | 相同 |
| "新建案件" href | `case-create.html` | `case/create.html` |
| search svg class | 使用 Tailwind `w-[18px] h-[18px] text-[var(--muted-2)]` | 使用 `w-[18px] ...`（相同） |

**路径问题**：`case-create.html` 是旧路径，shared 已更新为 `case/create.html`。

### 3.4 页面标题区（L343–356）

```
┌─────────────────────────────────────────────┐
│ 任务与提醒                        [+ 新建任务] │
│ 管理个人代办事项，查看案件期限…                 │
└─────────────────────────────────────────────┘
```

- `<h1>` 使用 `text-3xl display-font font-semibold`
- 副标题: `text-sm text-gray-500`（使用 Tailwind 灰色而非 token）
- "新建任务" 使用 `.btn-primary` + SVG plus 图标
- **无 JS 行为绑定**（按钮无 `onclick`，无 `id`，无 `data-action`）

### 3.5 工作台侧边栏（L358–390）

4 个视图入口，全部使用 `href="#"`（非功能性导航）：

| # | 视图名称 | badge 颜色 | 计数 | 活跃态 |
|---|---------|-----------|------|--------|
| 1 | 我的待办 | 蓝色 `bg-[#e5f1ff]` | 5 | **当前选中**（白底、阴影、蓝色文字） |
| 2 | 今日到期 | 橙色 `bg-orange-100` | 2 | 未选中 |
| 3 | 已逾期任务 | 红色 `bg-red-100` | 1 | 未选中 |
| 4 | 自动提醒日志 | 无 badge | — | 未选中，`mt-4` 视觉分隔 |

- 使用内联 Tailwind 类而非共享 CSS 类
- badge 计数为 **硬编码静态值**
- SVG 图标内联在 HTML 中
- **无 JS 行为**：点击不切换视图，不联动筛选

### 3.6 任务列表区（L392–461）

#### Segmented Control（L394–397）

| 段 | 文本 | 状态 |
|----|------|------|
| 1 | 未完成 | `active` |
| 2 | 已完成 | 默认 |

- **无 JS 行为**：点击不切换，无事件监听

#### 任务卡片列表（L399–460）

`<ul class="task-list">` 包含 3 条 `<li class="task-item">`：

| # | Tag | 任务标题 | 关联案件 | 截止文本 | 责任人 |
|---|-----|---------|---------|---------|--------|
| 1 | `tag-red` "逾期 1 天" | 催促客户提交课税证明书 | CAS-2023-1090 家族滞在 (李明) | 截止: 昨天 18:00 | 我 |
| 2 | `tag-orange` "今日到期" | 草拟理由书 (HSP 申请) | CAS-2023-1089 高度专门职 (Michael T.) | 截止: 今天 18:00 | 我 |
| 3 | `tag-blue` "本周到期" | 准备在留资格认定证明书申请材料 | CAS-2023-1102 经营管理签证 (王先生) | 截止: 周五 15:00 | 我 |

每条任务的 DOM 结构：

```
li.task-item
├── input[type=checkbox].checkbox-apple
├── div.flex-grow
│   ├── div (标题行)
│   │   ├── span.tag.tag-{color} (到期标签)
│   │   └── h3 (任务标题)
│   └── div (副信息行)
│       ├── svg (文件夹图标)
│       ├── a[href="case/detail.html"] (案件链接)
│       ├── span "|" (分隔符)
│       └── span (截止时间)
└── div.ml-4
    └── div (圆形头像 "我")
```

- 案件链接：3 条均指向 `case/detail.html`，使用 `#0071e3`（Apple Blue 硬编码色值，非 `var(--primary)`）
- 头像使用 `bg-[#0071e3]` 硬编码蓝色
- **Checkbox 无 JS 行为**：无全选、无 indeterminate、无选中计数

---

## 4. 交互行为清单

| # | 交互 | 实现方式 | 行号 | 功能状态 |
|---|------|---------|------|---------|
| 1 | 移动端导航开关 | IIFE 监听 `data-nav-open` / `data-nav-close` + Escape | L467–488 | ✅ 功能正常 |
| 2 | 任务 checkbox 勾选 | 原生 `<input type="checkbox">` | L403,423,443 | ⚠️ 仅视觉，无 JS 联动 |
| 3 | Segmented control 切换 | 仅 CSS class `.active` 静态标记 | L394–397 | ❌ 无 JS，不可交互 |
| 4 | 侧边栏视图切换 | `href="#"` 链接 | L362–388 | ❌ 无 JS，点击不生效 |
| 5 | 新建任务按钮 | 无事件绑定 | L351–354 | ❌ 无 JS，点击不生效 |
| 6 | 案件链接跳转 | `<a href="case/detail.html">` | L411,431,451 | ✅ 静态导航 |
| 7 | 全局搜索 | 无 JS（未引入 `navigate.js`） | L328–334 | ❌ 无搜索功能 |
| 8 | Topbar "新建咨询" | `onclick → window.location.href` | L336 | ✅ 导航到 leads-messages.html |
| 9 | Topbar "新建案件" | `onclick → window.location.href` | L337 | ✅ 导航到 case-create.html |

**总结**：仅移动端导航和 topbar 按钮/案件链接有实际交互。任务页核心功能（视图切换、筛选、批量操作、新建弹窗）全部缺失。

---

## 5. 脚本依赖

| 脚本 | 来源 | 引入方式 | 说明 |
|------|------|---------|------|
| 移动端导航 IIFE | 内联 `<script>` L467–488 | 直接嵌入 | 与 `shared/scripts/mobile-nav.js` 完全一致 |
| `shared/scripts/navigate.js` | **未引入** | — | 全局搜索弹窗、`⌘K` 快捷键、`data-navigate` 均不可用 |

---

## 6. 出站链接审计（tasks.html → 其他页面）

### 6.1 导航链接（侧边栏 + 移动端各出现一次）

| 目标页面 | tasks.html 中的 href | 最新正确路径 | 需修复？ |
|----------|---------------------|-------------|---------|
| 仪表盘 | `admin-prototype.html` | `admin-prototype.html`（或 `dashboard/index.html`） | ⚠️ 视情况 |
| 咨询与会话 | `leads-messages.html` | `leads-messages.html`（或 `leads-message/index.html`） | ⚠️ 视情况 |
| 客户 | `customers.html` | `customers/index.html` | **是** |
| 案件 | `cases-list.html` | `cases-list.html`（或 `case/index.html`） | ⚠️ 视情况 |
| 任务与提醒 | `tasks.html`（self） | `tasks/index.html`（迁移后） | **是** |
| 资料中心 | `documents.html` | `documents.html` | 无需 |
| 文书中心 | `forms.html` | `forms.html` | 无需 |
| 收费与财务 | `billing.html` | `billing.html` | 无需 |
| 报表 | `reports.html` | `reports.html` | 无需 |
| 设置 | `settings.html` | `settings.html` | 无需 |
| 客户门户 | `../src/index.html` | `../src/index.html` | 无需 |

### 6.2 内容链接

| 目标 | tasks.html 中的 href | 最新正确路径 | 需修复？ |
|------|---------------------|-------------|---------|
| 案件详情（任务行 ×3） | `case/detail.html` | `case/detail.html` | 无需（但迁移到 `tasks/` 后需加 `../`） |
| 新建咨询（topbar） | `leads-messages.html` | `leads-messages.html` | 无需（迁移后需加 `../`） |
| 新建案件（topbar） | `case-create.html` | `case/create.html` | **是** |

### 6.3 迁移后路径影响

当 `tasks.html` 迁移为 `tasks/index.html` 后，所有 admin 根级相对路径需要加 `../` 前缀，但使用 shared shell 后，导航链接由共享片段统一管理，仅内容区链接（案件详情等）需要关注。

---

## 7. 入站链接审计（其他页面 → tasks.html）

以下页面通过导航项链接到 `tasks.html`：

| 来源页面 | 链接路径 |
|----------|---------|
| `shared/shell/side-nav.html` | `tasks.html` |
| `shared/shell/mobile-nav.html` | `tasks.html` |
| `admin-prototype.html` | `tasks.html`（内联导航） |
| `dashboard/index.html` | `tasks.html`（内联导航） |
| `cases-list.html` | `tasks.html`（内联导航） |
| `case-detail.html` | `tasks.html`（内联导航） |
| `case-create.html` | `tasks.html`（内联导航） |
| `case/detail.html` | `tasks.html`（内联导航） |
| `case/create.html` | `tasks.html`（内联导航） |
| `case/index.html` | `tasks.html`（内联导航） |
| `customers/index.html` | `tasks.html`（内联导航） |
| `leads-messages.html` | `tasks.html`（内联导航） |
| `leads-message/index.html` | `tasks.html`（内联导航） |
| `leads-message/detail.html` | `tasks.html`（内联导航） |
| `documents.html` | `tasks.html`（内联导航） |
| `forms.html` | `tasks.html`（内联导航） |
| `billing.html` | `tasks.html`（内联导航） |
| `reports.html` | `tasks.html`（内联导航） |
| `settings.html` | `tasks.html`（内联导航） |

> **迁移影响**：已迁移到 shared shell 的页面（如 `customers/index.html`、`dashboard/index.html`）引用 `shared/shell/side-nav.html`，只需更新一处。仍在使用内联导航的旧页面需要逐个更新。本轮仅记录，不立即修复旧页面中的链接。

---

## 8. 共享候选汇总

### 8.1 可直接替换为 shared 的内容

| 当前内容 | 目标共享文件 | 置信度 |
|----------|------------|--------|
| `:root` CSS Token（L11–33） | `shared/styles/tokens.css` | ✅ 无冲突 |
| `body` 字体 + 基础样式（L35–50） | `shared/styles/tokens.css` | ✅ 无冲突 |
| `.display-font`（L52） | `shared/styles/tokens.css` | ✅ 无冲突 |
| `prefers-reduced-motion`（L118–120） | `shared/styles/tokens.css` | ✅ 无冲突 |
| `.skip-link` + `focus-visible`（L54–71） | `shared/styles/shell.css` | ✅ 无冲突 |
| `.app-shell` 网格（L73–76） | `shared/styles/shell.css` | ✅ 无冲突 |
| `.side-nav` 全家族（L78–87） | `shared/styles/shell.css` | ✅ 无冲突 |
| `.topbar` 全家族（L89–91） | `shared/styles/shell.css` | ✅ 无冲突 |
| `.mobile-nav` 全家族（L112–116） | `shared/styles/shell.css` | ✅ 无冲突 |
| `.icon-btn`（L92–94） | `shared/styles/components.css` | ✅ 无冲突 |
| `.search`（L96–98） | `shared/styles/components.css` | ✅ 无冲突 |
| `.btn-primary`（L100–102） | `shared/styles/components.css` | ✅ 微差可忽略 |
| `.btn-pill`（L104–106） | `shared/styles/components.css` | ✅ 微差可忽略 |
| `.chip`（L108） | `shared/styles/components.css` | ✅ 微差可忽略 |
| `.apple-card`（L110） | `shared/styles/components.css` | ✅ 无冲突 |
| 桌面侧边导航 HTML（L236–317） | `shared/shell/side-nav.html` | ✅ 内容一致 |
| 移动端导航 HTML（L145–233） | `shared/shell/mobile-nav.html` | ✅ 内容一致 |
| 顶部工具栏 HTML（L320–341） | `shared/shell/topbar.html` | ✅ 内容一致 |
| 移动端导航 JS（L467–488） | `shared/scripts/mobile-nav.js` | ✅ 完全一致 |

### 8.2 需对齐后替换

| 当前内容 | 目标 | 差异说明 |
|----------|------|---------|
| `.segmented-control` / `.segment-btn`（L122–124） | `shared/styles/components.css` | pill 形 vs. rounded 形；字重 900 vs. 500。需确认基准版本，然后统一 |

### 8.3 任务模块专有（保留在 tasks/ 层）

| 类名 | 说明 | 备注 |
|------|------|------|
| `.task-list` | 任务列表容器 | 模块专有 |
| `.task-item` | 任务行样式 | 模块专有 |

### 8.4 潜在新增共享候选

| 类名 | 当前位置 | 共享理由 |
|------|---------|---------|
| `.checkbox-apple` | tasks.html L131–133 | 案件详情任务 Tab 等也需要勾选框；建议提升到 `shared/styles/components.css` |
| `.tag` / `.tag-red` / `.tag-orange` / `.tag-blue` / `.tag-gray` | tasks.html L135–139 | 案件列表、仪表盘等也需要语义标签；建议提升到 `shared/styles/components.css` |

---

## 9. 与 P0 规格的差距汇总

对照 [P0-CONTRACT.md](./P0-CONTRACT.md) 和 [任务与提醒.md](../../../../docs/gyoseishoshi_saas_md/P0/06-页面规格/任务与提醒.md)：

| 规格要求 | 原型现状 | 差距等级 |
|----------|---------|---------|
| 8 列字段（名称、案件、Group、责任人、优先级、截止、状态、来源） | 仅有 4 列：名称、案件、截止、责任人 | 🔴 缺 4 列 |
| 4 个筛选器（状态、截止范围、责任人、Group）+ 搜索 + 重置 | 无筛选栏 | 🔴 完全缺失 |
| 批量操作（指派、调截止日、完成、取消） | checkbox 有但无 JS 联动，无操作栏 | 🔴 完全缺失 |
| 新建/编辑任务弹窗（8 字段、必填校验、`#new` 入口） | "新建任务"按钮无事件绑定 | 🔴 完全缺失 |
| 任务详情面板（10 项信息 + 操作记录时间线） | 无详情面板 | 🔴 完全缺失 |
| 提醒日志面板（6 列 + 失败原因） | 侧边栏入口有，内容无 | 🔴 完全缺失 |
| 工作台视图切换联动筛选 | 侧边栏 4 入口有，点击不生效 | 🟡 结构在、行为缺 |
| Segmented control（未完成/已完成）联动 | 静态标记，无 JS | 🟡 结构在、行为缺 |
| 逾期标红 | `tag-red` 已实现 | ✅ 保留 |
| 今日到期标橙 | `tag-orange` 已实现 | ✅ 保留 |
| 空状态（暂无待办引导） | 未实现（3 条硬编码数据） | 🟡 需补占位 |
| Toast 7 场景 | 无 toast 组件 | 🔴 完全缺失 |
| 分页 | 无分页控件 | 🔴 完全缺失 |
| `navigate.js` 全局搜索 | 未引入 | 🟡 需补引入 |

---

## 10. "本周到期" 标签处理说明

现有原型第 3 条任务使用 `tag-blue` 标记"本周到期"。P0 规格明确 **不做「本周到期」视图**（后置至 P1），但允许作为列表行内的到期语义标签保留。

拆分时：
- 保留 `tag-blue` "本周到期" 作为行内展示标签
- 不将其升级为侧边栏视图入口或筛选项
- 在 `tasks-config.js` 的到期 tag 配置中标注为"行内标签，非视图"
