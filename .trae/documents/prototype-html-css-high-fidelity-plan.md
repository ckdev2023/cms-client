---
title: 高仿真原型开发计划
mode: plan
---

# 高仿真原型（网页结构+样式）开发计划

## 摘要

基于 Stitch 的首页分析结果，新增一个独立的 `packages/prototype` 工作区包，使用 **原生网页结构 + 样式（少量脚本仅做页面拼装与点击导航）** 实现“首页 + 主流程闭环”的高仿真原型。页面与样式不堆在单个文件中，按“页面 + 组件 + 设计变量”拆分为多文件结构，支持本地静态服务预览。

目标交付物：
- 高仿真页面：`工作台（首页）` + `案例详情` + `待办（列表/详情）` + `支付（确认）`
- 可点击导航：卡片/按钮/底部导航可跳转对应页面
- 统一设计系统：按 Stitch 设计主题落地为 CSS 设计变量（颜色/字体/圆角/间距/阴影/层级）

## 现状分析（基于仓库探索）

- 当前仓库是 npm workspaces：根目录 [package.json](file:///Users/ck/workplace/cms-client/package.json) 仅包含 `packages/*`，目前只有 `packages/mobile`。
- 门禁脚本 `npm run guard` 实际运行的是 `mobile:guard`，不会自动校验未来新增的 `prototype` 包，但新增包仍需确保不影响现有门禁与锁文件一致性。
- 现有业务工程是 RN + Tamagui + 分层约束；本次原型是独立的 Web 静态原型，不引入到 mobile 运行链路内。
- 已通过 Stitch MCP 获取到“应用首页”的页面元信息与截图（用于复刻布局与组件拆分思路）。

## Stitch 输入（权威来源）

### 项目（客户端布局方案 V1）

- 项目 ID：`10237826761360990819`
- 设计主题（关键约束）：
  - 颜色模式：浅色
  - 字体：标题=Manrope / 正文=Inter / 标签=Inter
  - 圆角：ROUND_EIGHT（以 12/24px 圆角为主）
  - 间距比例：`2`（更偏“留白足、段落分明”的版式）
  - 自定义主色：`#002366`
  - 命名色（用于 tokens 落地）：`primary=#00113a`、`primary_container=#002366`、`surface=#fbf8fe`、`surface_container_low=#f6f2f8`、`surface_container_lowest=#ffffff`、`on_surface=#1b1b1f`、`on_surface_variant=#444650`、`outline_variant=#c5c6d2`、`secondary=#006a6a`、`secondary_container=#90efef`、`error_container=#ffdad6`、`on_error_container=#93000a`、`tertiary_container=#002a4b`、`on_tertiary_container=#1c94f1`

### 页面（应用首页）

- 节点/页面 ID：`5201522c3e1943fa9f6509d90faae0f5`
- 设备：移动端，画布尺寸：`780 × 3392`（高为长页面拼接；关键组件以 390 宽为基准复刻）
- 截图（用于像素级对齐）：`projects/10237826761360990819/files/e01ca49ac30449c1a45360f6b75e0bd1`
- HTML 代码（结构参考，不直接粘贴，需组件化重构）：`projects/10237826761360990819/files/5a1affe7e318433db1f5bf5a25da1e9c`

### 设计说明（关键设计规则，落到 CSS 约束）

- 创意北极星：外交式编辑风（权威/克制/编辑式信息层级）
- 无边线规则：禁止用 1px 实线做分隔/容器边界；只允许用 surface 层级变化 + 间距实现分区
- 表面层级：
  - 基底：`surface`
  - 分区：`surface_container_low`
  - 交互：`surface_container_lowest`
- 玻璃与渐变：
  - 主按钮允许使用 `primary → primary_container` 的 135° 渐变作为“纹理”
  - 玻璃层：`surface_container_lowest` 约 70% 透明 + `24px` blur，用于浮动导航/菜单
- 排版：
  - 标题 Manrope（字距更紧 -2%）
  - 正文/标签 Inter
  - 禁用纯黑：正文 `on_surface`，次级文案 `on_surface_variant`
- 阴影与层级：
  - 浮层阴影建议：`0px 10px 30px rgba(27, 27, 31, 0.06)`（颜色来自 `on_surface` 的低透明度）
  - 幽灵边线回退：仅在输入类可访问性需要时使用 `outline_variant` 的 20% 透明度

## 决策与约束

- 不新增外部依赖（避免改动根 `package-lock.json`，同时降低门禁风险）。
- 采用内置 `http` 模块 + 少量模板预处理实现“组件引用”，避免浏览器直接 `file://` 打开时的跨文件限制。
- “高仿真”定义为：布局/间距/圆角/阴影/字体/颜色语义接近 Stitch；交互到“可点击导航 + 基本状态（选中/禁用）”；不做真实接口与真实支付。
- 组件拆分以“可复用 UI 块 + 页面编排”为边界，不把所有页面逻辑塞一个文件。

## 改动方案（文件级别）

### 1) 新增 workspace：`packages/prototype`

新增目录结构（核心思想：变量/组件/页面分层）：

- `packages/prototype/package.json`
  - `name: "prototype"`
  - `private: true`
  - scripts：
    - `dev`: 启动本地静态服务（含组件引用预处理）
    - `lint`/`typecheck`: 不强制（纯 HTML/CSS），如需可后续扩展

- `packages/prototype/scripts/dev.mjs`
  - 本地静态服务（默认端口 5175 或 3005）
  - 支持：
    - 解析 HTML 中的组件指令（例如 `<include src="/components/TopBar/TopBar.html"></include>`）
    - 返回带正确 `Content-Type` 的静态资源（css/js/svg/png）
    - 基础 404 页面

- `packages/prototype/src/styles/`
  - `tokens.css`：从 Stitch `designTheme.namedColors` 落地 CSS 变量（primary/background/surface/on_surface/outline_variant 等）
  - `typography.css`：字体引入（Manrope/Inter）+ 排版 scale（title/body/label）
  - `base.css`：normalize + 全局排版 + 背景/文字色 + a11y（focus-visible）
  - `elevation.css`：阴影与层级（符合“柔和、低对比”的投影规则）
  - `spacing.css`：间距比例（8px 基准或与 Stitch spacingScale 对齐）

- `packages/prototype/src/components/`（每个组件一个文件夹，至少包含 html+css；需要交互再加 js）
  - `AppShell/`：页面容器（固定宽度 390 视窗模拟 + 背景层级）
  - `TopBar/`：顶部标题与右侧图标区
  - `Chip/`：状态标签（passed/action required/in progress 等）
  - `Card/`：通用卡片（surface 层级 + 圆角 + padding）
  - `ActiveCaseCard/`：首页“当前案例/服务”卡（信息块 + 主 CTA + 次 CTA）
  - `TodoList/` + `TodoItem/`：待办区块与列表项
  - `PaymentCard/`：待付款金额强调卡（含说明文案位）
  - `BottomTabBar/`：底部 5-tab 导航（支持当前选中态）
  - `QuickActions/`：快捷入口网格（tile + icon + label）
  - `Icon/`：统一 SVG 图标用法（如果需要可做成 include 片段）

- `packages/prototype/src/pages/`
  - `home/`
    - `index.html`：页面编排（通过 include 引用组件）
    - `page.css`：只写本页布局编排（组件样式不写在这里）
    - `page.js`：只负责“导航绑定/示例数据注入（如需要）”
  - `case/`、`todos/`、`payment/`
    - 同样结构：`index.html` + `page.css` + `page.js`

- `packages/prototype/src/index.html`
  - 作为入口页，默认跳转到 `/pages/home/` 或渲染一个目录页（便于验收与导航）

### 2) 基于 Stitch 设计系统落地 CSS 设计变量

从 Stitch `designTheme` 落地（示例，不是最终代码）：
- 颜色：`--color-primary`, `--color-primary-container`, `--color-surface`, `--color-surface-container-low`, `--color-on-surface`, `--color-outline-variant`…
- 圆角：对应 `roundness: ROUND_EIGHT`，定义 `--radius-sm/md/lg/xl`
- 字体：标题使用 Manrope，正文/标签使用 Inter
- “无边线规则”：默认禁止 1px 实线分割；用 surface 层级与间距分隔（仅输入框在可访问性需要时使用低不透明度 outline）

### 3) 页面拆解与组件复用策略（以首页为例）

首页 `pages/home/index.html` 只做页面编排与组件引用：
- `TopBar`
- `ActiveCaseCard`
- `TodoList`（多个 `TodoItem`）
- `PaymentCard`
- `QuickActions`
- `BottomTabBar`

组件职责边界：
- 组件自身文件夹内维护结构（HTML）与视觉（CSS）
- 页面只负责“组件之间的间距/排列/区域标题”
- 交互只在需要处做最少脚本：点击跳转、底部导航选中态、示例数据渲染（不实现真实业务逻辑）

### 4) 主流程页面范围与信息要点（闭环）

按“首页+主流程闭环”落地页面与导航：
- 首页 → 点击“主按钮（下一步动作）” → 待办（材料/任务）
- 首页 → 点击“查看详情” → 案例详情（案例概览/进度/关键信息）
- 首页 → 点击“待付款金额”或“立即支付” → 支付（支付确认/成功态）
- 底部导航：至少保证 首页 / 案例 / 待办 / 支付 / 我的（“我的”可先做占位页面）

### 5) Stitch 对齐方法（复刻流程）

对每个目标页面：
- 通过 Stitch MCP 获取页面截图（用于视觉对齐）
- 若 Stitch 页面提供 HTML 代码，则用作结构参考，但以“组件化拆分”重构，不直接把整块 HTML 粘贴进单文件
- 将复刻差异记录为待办（例如：字号、间距、阴影、颜色对比、CTA 层级）

## 验收与自检

- 启动原型预览：
  - `npm --workspace prototype run dev`
  - 浏览器访问首页与各页面，验证：
    - 布局接近 Stitch（卡片层级、圆角、色值、字体）
    - 点击导航可用（按钮/列表项/底部导航）
    - 组件拆分清晰：页面不含大段重复结构；组件样式不堆在单一 css
- 运行仓库门禁：
  - `npm run guard` 确认 mobile 门禁不受影响（尤其是锁文件一致性与 secrets 扫描）

## 假设

- Stitch 提供的设计主题与首页截图为当前版本“权威样式来源”，原型以此为准。
- 原型仅用于视觉/交互评审，不包含真实网络请求与真实业务逻辑。
