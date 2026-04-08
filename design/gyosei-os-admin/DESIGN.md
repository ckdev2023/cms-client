# Design System: Gyosei OS Admin Prototype

## 0. 范围与来源

本规范从原型页面抽取，作为“后台管理端（事务所后台）”的视觉与交互基线：

- 原型目录：[/packages/prototype/admin](file:///Users/ck/workplace/cms-client/packages/prototype/admin)
- 页面入口：[admin-prototype.html](file:///Users/ck/workplace/cms-client/packages/prototype/admin/admin-prototype.html)

原型以 Tailwind CDN + 页面内联 CSS 为主，核心设计意图体现在 `:root` 设计 token、组件类（如 `.btn-primary/.apple-card/.nav-item`）与交互状态（hover/active/focus）上。

## 1. 视觉主题

整体风格偏“Apple-like”后台：浅色高留白、柔和阴影、圆角卡片、玻璃拟态（半透明 + blur）的顶部导航。视觉重心放在内容与任务推进上，强调“下一步动作可点、可追踪”。

关键特征：

- 浅灰背景 + 白色卡片作为主要层级结构
- 强对比正文（深色）+ 次级/辅助信息（灰蓝）分层清晰
- 单一主色（蓝）作为主 CTA 与交互高亮
- 轻量阴影与微位移动效塑造“可点击”感

## 2. 颜色（Token 与语义）

多数页面采用同一套 token（`--bg/--surface/--primary/...`），个别页面（如案件详情 Tabs/按钮）直接使用接近 Apple 官网的固定色值（见“变体”）。

### 基础 Token（通用）

| Token | 色值 | 角色/使用场景 |
|------|------|---------------|
| `--bg` | `#f8fafc` | 页面背景（整体底色） |
| `--surface` | `#ffffff` | 卡片/面板表面、输入容器背景 |
| `--surface-2` | `#f1f5f9` | 次级表面（hover 背景、轻强调区域） |
| `--border` | `#e2e8f0` | 分割线、边框、卡片描边 |
| `--text` | `#0f172a` | 主正文/标题文本 |
| `--muted` | `#475569` | 次要文本（描述、表格正文） |
| `--muted-2` | `#64748b` | 辅助文本（提示、占位、分组标题） |
| `--primary` | `#0369a1` | 主色（主按钮、链接、高亮） |
| `--primary-hover` | `#075985` | 主色 hover |
| `--success` | `#16a34a` | 成功/已完成/正常状态（徽标、提示） |
| `--warning` | `#f59e0b` | 警告/临期/待处理（徽标、提示） |
| `--danger` | `#dc2626` | 风险/逾期/错误（徽标、提示） |

### 变体（局部固定色值）

- 案件详情页 Tabs/按钮常见固定色：`#1d1d1f`（深灰正文）、`#86868b`（次级）、`#0071e3`（Apple Blue CTA）、`#005bb5`（CTA hover）
- 仪表盘状态点：`#34c759`（绿）、`#ff9500`（橙）、`#ff3b30`（红）

约束建议：

- 大面积面使用 `--bg/--surface`，交互强调尽量集中在 `--primary`
- `--success/--warning/--danger` 仅用于状态语义，不作为主视觉配色

## 3. 字体与排版

### 字体族

主字体为 `Plus Jakarta Sans`，配合系统字体回退：

- `"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`

全局文本带轻微负字距：`letter-spacing: -0.01em`，提升紧凑与“精致感”。

### 层级（原型中出现频率最高）

| 角色 | 样式 | 用途 |
|------|------|------|
| Hero 标题 | 34px / 800 / lh 1.12 / tracking -0.02em | 页面主标题/关键问候语 |
| 卡片标题 | 16px / 800 / lh 1.25 | 卡片区块标题（如“快捷动作”） |
| 导航项 | 14px / 800 | 左侧导航、可点击列表项 |
| 搜索输入 | 14px / 600 | 全局搜索与筛选输入 |
| 辅助说明 | 13–15px / 600 | 次级说明、提示语 |
| 分组标题 | 11–12px / 900 / uppercase / tracking 0.06–0.08em | 导航/表格列名的“信息架构”提示 |

## 4. 圆角、阴影与层级

### 圆角

- 全局圆角 token：`--radius: 14px`
- 常用局部圆角：
  - 导航项/图标按钮：12px
  - Chip/Pill：999px（胶囊形）

### 阴影

- 卡片阴影：`0 1px 2px rgba(15, 23, 42, 0.06), 0 10px 28px rgba(15, 23, 42, 0.08)`
- 主按钮投影：`0 8px 18px rgba(3, 105, 161, 0.22)`
- hover 提升：卡片可切换到更强阴影并轻微上移（`translateY(-1px)`）

## 5. 布局与响应式

### App Shell

- 默认单列；在 `min-width: 1024px` 时切为两列：
  - Sidebar：280px 固定宽
  - Content：自适应

### 顶部栏（Topbar）

- `position: sticky; top: 0; z-index: 40`
- 半透明背景 + blur：`rgba(248, 250, 252, 0.92)` + `backdrop-filter: blur(10px)`
- 内容宽度：`max-width: 1280px`，左右内边距常见 14px/16px

### 内容区容器

- 常见为 `max-w-7xl`（Tailwind）+ 响应式内边距：`px-4 md:px-8`

### 移动端导航

部分页面实现抽屉式导航：

- 遮罩：`rgba(2, 6, 23, 0.56)`
- 面板宽：`min(320px, 88vw)`，从左侧滑入
- 通过 `body[data-nav-open="true"]` 控制展示

## 6. 组件规范（结构与状态）

### 导航（Side Nav）

- 分组标题：小号、全大写、加字距，承担信息架构引导
- 导航项默认：`color: var(--muted)`
- hover：背景切 `--surface-2`，文字切 `--text`
- 当前页：`aria-current="page"`，背景 `rgba(3, 105, 161, 0.1)`，文字 `--text`

### 搜索（全局）

- 容器：白底、1px 边框、圆角 14px、轻微顶部高光（`box-shadow: 0 1px 0 ...`）
- 输入：无边框、透明背景，placeholder 使用 `--muted-2` 同系颜色降低干扰

### 按钮

- Primary（主 CTA）：蓝底白字、圆角 14px、hover 切深蓝、active 下压 1px
- Secondary/Pill（次级）：浅底（透明黑 4–7%）、1px 边框；不与主 CTA 抢权重
- Icon Button：38×38，圆角 12px；hover 背景切 `--surface-2`

### Chip / Segmented Control

- Chip：胶囊形，边框轻描边，适合过滤器/角色视图切换
- Segmented：外层浅灰底，active 项为白底 + 阴影（强调“当前范围”）

### 卡片（Card）

- 白底 + 1px 边框 + 阴影为基础承载面
- hover：加深阴影并轻微上移（用于列表卡、快捷动作、摘要模块）

### 表格（Table）

- 表头：小号、全大写、加字距，信息密度更高但易扫读
- 行分割：淡边框（减少噪音）
- 可选 hover 行底色（部分页面启用），强化可点击性与行聚焦

## 7. 交互与可访问性

- 跳转到主要内容：页面提供 Skip Link（键盘用户快速越过导航）
- 焦点可见：`focus-visible` 使用 2px 蓝色描边（`rgba(3, 105, 161, 0.35)`）+ `outline-offset: 2px`
- 动效节制：颜色/背景 160ms，位移 120ms；支持 `prefers-reduced-motion: reduce` 关闭动画与平滑滚动

## 8. 页面清单（原型覆盖）

- 仪表盘：[admin-prototype.html](file:///Users/ck/workplace/cms-client/packages/prototype/admin/admin-prototype.html)
- 咨询与会话：[leads-messages.html](file:///Users/ck/workplace/cms-client/packages/prototype/admin/leads-messages.html)
- 客户：[customers.html](file:///Users/ck/workplace/cms-client/packages/prototype/admin/customers.html)
- 案件列表：[cases-list.html](file:///Users/ck/workplace/cms-client/packages/prototype/admin/cases-list.html)
- 案件详情：[case-detail.html](file:///Users/ck/workplace/cms-client/packages/prototype/admin/case-detail.html)
- 新建案件：[case-create.html](file:///Users/ck/workplace/cms-client/packages/prototype/admin/case-create.html)
- 任务与提醒：[tasks.html](file:///Users/ck/workplace/cms-client/packages/prototype/admin/tasks.html)
- 资料中心：[documents.html](file:///Users/ck/workplace/cms-client/packages/prototype/admin/documents.html)
- 文书中心：[forms.html](file:///Users/ck/workplace/cms-client/packages/prototype/admin/forms.html)
- 收费与财务：[billing.html](file:///Users/ck/workplace/cms-client/packages/prototype/admin/billing.html)
- 报表：[reports.html](file:///Users/ck/workplace/cms-client/packages/prototype/admin/reports.html)
- 设置：[settings.html](file:///Users/ck/workplace/cms-client/packages/prototype/admin/settings.html)
