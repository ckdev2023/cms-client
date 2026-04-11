---
name: shared-shell-extractor
description: >-
  Extract repeated shell, navigation, styles, and scripts into shared/. Use when
  deduplicating CSS tokens, component styles, or shell HTML across prototype pages.
---

# Shared Shell Extractor

## Purpose

把原型页面中重复的壳层（导航、顶栏）、设计 Token、组件样式和共享脚本提取到 `shared/` 目录，确保跨页面的视觉和行为一致性，消除复制粘贴。

产出：
1. `shared/styles/` 下的统一样式文件（tokens.css / components.css / shell.css）
2. `shared/shell/` 下的 HTML 片段（side-nav / mobile-nav / topbar）
3. `shared/scripts/` 下的公共脚本（mobile-nav.js / navigate.js）
4. 源页面的 `<style>` 和 shell HTML 替换为对 shared 的引用

优先级：
1. CSS Token 单一来源（`:root` 变量不重复定义）
2. 壳子 HTML 单一来源（导航只维护一份）
3. 公共组件样式单一来源（`.btn-primary`、`.chip` 等不重复）
4. 视觉回归——提取后所有页面外观不变

## Triggers

当用户请求符合以下任一条件时，触发此 skill：

- 用户要求把重复样式/导航/脚本提取到 shared 目录
- 用户要求消除原型页面之间的 CSS 变量 / 组件样式 / 壳子 HTML 重复
- 用户要求创建或更新 `shared/styles/` 或 `shared/shell/` 下的文件
- 用户发现多个页面的导航 HTML 不同步，要求统一

示例请求：
- 帮我把 customers 和 dashboard 的 CSS 变量合并到 shared/styles/tokens.css
- 把侧边导航提取为 shared/shell/side-nav.html
- customers 页面的壳子跟 dashboard 不一样了，帮我统一
- 新加了一个导航项，帮我同步到所有页面
- 把 mobile-nav 脚本提取为公共脚本

## Required Inputs

执行前必须读取：

- `packages/prototype/admin/shared/` — 当前 shared 目录的全部文件（确认已有内容）
- `packages/prototype/admin/customers/SPLIT-ARCHITECTURE.md` — §2 目标目录结构 + §3.1 共享层职责定义（权威参考）

金样本（必读）：

- `packages/prototype/admin/shared/styles/tokens.css` — 现有 Token 定义
- `packages/prototype/admin/shared/styles/components.css` — 现有组件样式
- `packages/prototype/admin/shared/styles/shell.css` — 现有壳子布局样式
- `packages/prototype/admin/shared/shell/side-nav.html` — 现有桌面侧边导航
- `packages/prototype/admin/shared/shell/mobile-nav.html` — 现有移动端导航
- `packages/prototype/admin/shared/shell/topbar.html` — 现有顶部栏
- `packages/prototype/admin/shared/scripts/mobile-nav.js` — 现有移动导航脚本

需要更多上下文时，再读取：

- 源页面的 `<style>` 块 — 识别与 shared 重复或冲突的样式
- 源页面的 shell HTML 区域 — 比对与 shared 版本的差异
- `AGENTS.md` — 仓库分层规则

## Deliverables

除非用户明确要求轻量输出，否则至少产出：

1. **shared 层文件更新**（新增或修改）— 样式 / shell HTML / 脚本
2. **源页面简化**（移除冗余）— `<style>` 替换为 `<link>`，shell HTML 替换为注释引用或内联 shared 版本
3. **差异报告**（文本）— 列出从源页面提取了什么、shared 中新增或修改了什么

### shared 目录标准结构

```
packages/prototype/admin/shared/
├── styles/
│   ├── tokens.css        ← :root CSS 变量（颜色、阴影、圆角、字体）
│   ├── components.css    ← 公共组件样式（btn, chip, card, table, modal, badge, form）
│   └── shell.css         ← App Shell 布局（网格、侧边栏、顶栏、移动导航）
├── shell/
│   ├── side-nav.html     ← 桌面侧边导航 HTML 片段
│   ├── mobile-nav.html   ← 移动端导航 HTML 片段
│   └── topbar.html       ← 顶部工具栏 HTML 片段
└── scripts/
    ├── mobile-nav.js     ← data-nav-open / data-nav-close 事件处理
    └── navigate.js       ← 页面跳转辅助
```

### tokens.css 分类结构

| 分类 | 变量前缀示例 | 说明 |
|------|-------------|------|
| 颜色 | `--bg`, `--surface`, `--border`, `--text`, `--muted` | 语义化颜色 |
| 品牌色 | `--apple-blue`, `--primary` | 主题色及其别名 |
| 阴影 | `--shadow`, `--shadow-lg` | 统一阴影 |
| 圆角 | `--radius`, `--radius-lg` | 统一圆角 |
| 字体 | 系统字体栈 | 在 `body` 选择器中定义 |

### shell HTML 片段规范

- 纯 HTML 片段，不包含 `<style>` 或 `<script>`
- 路径相对于 `packages/prototype/admin/`
- 子目录中的页面引用时需调整 `../` 前缀
- 当前页高亮通过在源页面中设置 `aria-current="page"` 实现

## Workflow

1. 确认提取目标：用户指定了具体源页面，还是全局扫描。
2. 读取 `shared/` 目录下所有文件，建立当前 shared 基线。
3. 读取 `customers/SPLIT-ARCHITECTURE.md` §3.1，确认共享层职责定义。
4. 识别提取候选：
   - **Token 提取**：对比源页面 `:root` 与 `tokens.css`，找出新增/冲突变量
   - **组件样式提取**：对比源页面组件类名与 `components.css`，找出重复定义
   - **Shell HTML 提取**：对比源页面 side-nav / mobile-nav / topbar 与 `shared/shell/`，找出差异
   - **脚本提取**：对比源页面 `<script>` 中的通用逻辑与 `shared/scripts/`
   - **模块专属 CSS 文件**：若模块有独立 `.css` 文件（如 `documents.css`），扫描其中可共享的定义（通用组件类名、Token 重复声明），与 shared 对比后决定提取或保留
5. 制定合并策略：
   - 变量名冲突 → 以 shared 中已有定义为基准，源页面的别名保留为兼容映射
   - 样式定义冲突 → 以更完整的版本为基准，记录差异
   - Shell HTML 差异 → 以 `shared/shell/` 版本为基准，源页面差异项合入或标注
6. 执行提取：
   - 更新 `shared/styles/*.css`（新增变量/类名）
   - 更新 `shared/shell/*.html`（新增导航项等）
   - 更新 `shared/scripts/*.js`（如有新增公共逻辑）
7. 简化源页面：
   - 移除与 shared 重复的 `<style>` 内容，替换为 `<link rel="stylesheet" href="../shared/styles/...">`
   - 移除与 shared 重复的 shell HTML，替换为 shared 版本（内联并设置 `aria-current`）
   - 移除与 shared 重复的 `<script>` 逻辑，替换为 `<script src="../shared/scripts/...">`
8. 输出差异报告：列出提取了什么、shared 中改了什么、源页面中删了什么。
9. 视觉回归验证：
   - 源页面外观不变（壳子、颜色、按钮、表格、弹窗）
   - 其他已引用 shared 的页面外观不变
   - 移动端导航功能不变
   - 控制台无新增 JS 错误或 404

## Rules

- shared 层不包含任何业务逻辑——不出现"客户""案件""线索"等业务概念。（来源：customers/SPLIT-ARCHITECTURE.md §4）
- CSS 变量单一来源：`:root` 变量只在 `tokens.css` 中定义一次，页面层不重新声明。
- 组件样式单一来源：`.btn-primary`、`.chip` 等在 `components.css` 定义一次，页面层只补充页面专有样式。
- Shell HTML 单一来源：导航项列表在 `side-nav.html` 定义一次，页面层只设置 `aria-current`。
- 提取变量名冲突时，以 shared 中已有名称为准——不创造新的变量名别名体系。
- `shared/shell/*.html` 为纯 HTML 片段，不含 `<style>` 或 `<script>`。
- `shared/scripts/` 下的脚本无外部依赖、无业务逻辑。
- 提取后必须做视觉回归——所有页面外观和交互不变。
- 新增共享组件样式前，先检查 `components.css` 中是否已有类似类名——避免重复。

## Anti-Patterns

- 把业务组件样式（如 `.customer-table-special`）放入 `components.css` → shared 层不应包含业务概念
- 合并变量时创造全新命名体系（把 `--apple-blue` 改名为 `--brand-primary`）→ 变量重命名波及所有页面，风险大
- 提取后不验证视觉回归 → 样式优先级变化导致按钮消失、颜色偏移等问题不被发现
- 只提取一个页面的 shell，不同步其他页面 → 导航不一致，部分页面高亮错误
- 把页面专有样式（只有一个页面用到的）也提取到 shared → shared 膨胀，职责模糊
- 在 shared/shell/*.html 中放 `<script>` 或 `<style>` 标签 → 违反纯 HTML 片段约束
- 忘记处理子目录页面的相对路径前缀（`../`）→ 样式/脚本 404

## References

- [extraction-rules.md](references/extraction-rules.md) — 提取判断规则（属于 shared 还是页面层）
- `packages/prototype/admin/customers/SPLIT-ARCHITECTURE.md` §3.1 — 共享层职责权威定义
- `packages/prototype/admin/shared/` — 当前 shared 层实现
- [example-walkthrough.md](references/example-walkthrough.md) — billing 模块 shell 提取逐步演练
- [SKILL-PROTOCOL.md](../_meta/SKILL-PROTOCOL.md) — 本 skill 遵循的统一协议

## Completion

完成后逐项确认：

1. `shared/styles/tokens.css` 包含所有跨页面的 CSS 变量，无重复
2. `shared/styles/components.css` 包含所有跨页面的组件样式，无重复
3. `shared/styles/shell.css` 包含 App Shell 布局样式
4. `shared/shell/side-nav.html` 导航项列表完整，与当前页面一致
5. `shared/shell/mobile-nav.html` 和 `shared/shell/topbar.html` 存在
6. `shared/scripts/mobile-nav.js` 功能正常
7. 源页面的 `<style>` 中不再包含与 shared 重复的定义
8. 源页面的 shell HTML 使用 shared 版本（内联 + `aria-current`）
9. 所有页面外观和交互不变（视觉回归通过）
10. 子目录页面的相对路径正确（`../shared/...`）

仓库门禁（适用于产生代码改动的 skill）：

1. 运行 `npm run fix`
2. 运行 `npm run guard`
3. 新增/修改逻辑已补单测（覆盖 model / domain / data）
