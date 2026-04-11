---
name: admin-module-scaffold
description: >-
  Scaffold a new admin module with standard directory, index.html, sections,
  scripts, data, and doc placeholders. Use when bootstrapping a module skeleton.
---

# Admin Module Scaffold

## Purpose

为新的 admin 原型模块创建标准目录骨架和占位文件，确保每个模块从一开始就遵循统一的目录结构、文件命名和拆分约定。

产出：
1. 完整的模块目录结构（index.html + sections/ + scripts/ + data/）
2. 文档占位（P0-CONTRACT.md / SPLIT-ARCHITECTURE.md / MIGRATION-MAPPING.md 骨架）
3. 空 `split-manifest.json` 骨架
4. 入口 index.html（已接入 shared 层，可直接在浏览器中打开）

优先级：
1. 目录结构与金样本一致
2. 入口文件可直接运行（引用 shared 样式/壳子/脚本）
3. 文档骨架可立即开始填充

## Triggers

当用户请求符合以下任一条件时，触发此 skill：

- 用户要求在 `packages/prototype/admin/` 下创建一个新模块
- 用户要求为某个业务页面搭建原型骨架
- 用户要求初始化一个 admin 模块的标准目录
- 用户提到 scaffold / bootstrap / 脚手架 + admin 模块

示例请求：
- 帮我创建 leads-message 模块的骨架
- 为任务与提醒页面搭建原型目录
- 初始化 settings 模块，目录结构对齐 customers
- bootstrap 一个新的 admin 模块
- 给 reports 模块创建标准脚手架

## Required Inputs

执行前必须读取：

- `packages/prototype/admin/customers/SPLIT-ARCHITECTURE.md` — 金样本目录结构和模块职责定义
- `packages/prototype/admin/customers/split-manifest.json` — 金样本 manifest 结构
- `AGENTS.md` — 仓库分层和门禁规则

金样本（必读）：

- `packages/prototype/admin/customers/` — 客户模块（最完整的金样本）
- `packages/prototype/admin/billing/` — 收费模块（更复杂的金样本）

需要更多上下文时，再读取：

- `packages/prototype/admin/shared/` — 共享层文件列表（确认可引用的样式和壳子）
- `docs/gyoseishoshi_saas_md/P0/06-页面规格/{module}.md` — 目标模块的页面规格（如果已有）
- `packages/prototype/admin/shared/shell/side-nav.html` — 导航项列表（确认新模块的导航位置）

## Deliverables

除非用户明确要求轻量输出，否则至少产出：

1. 模块目录结构（含全部占位文件）
2. `index.html` — 可运行的入口文件
3. `P0-CONTRACT.md` — 骨架（待填充）
4. `SPLIT-ARCHITECTURE.md` — 骨架（待填充）
5. `split-manifest.json` — 空骨架

如果用户要求完整骨架，额外产出：

6. `MIGRATION-MAPPING.md` — 骨架（待填充）
7. `REGRESSION-GATE.md` — 骨架（待填充）

### 目标目录结构

```
packages/prototype/admin/{module}/
├── index.html                 ← 入口文件（接入 shared 层）
├── P0-CONTRACT.md             ← P0 约束清单骨架
├── SPLIT-ARCHITECTURE.md      ← 拆分架构骨架
├── MIGRATION-MAPPING.md       ← 生产映射骨架（可选）
├── REGRESSION-GATE.md         ← 回归门槛骨架（可选）
├── split-manifest.json        ← 机器可读清单骨架
├── sections/
│   ├── page-header.html       ← 页面标题区
│   └── {other-sections}.html  ← 按模块需要添加
├── scripts/
│   └── {module}-page.js       ← 页面初始化脚本
└── data/
    └── {module}-config.js     ← 声明式配置
```

### index.html 最小结构

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{Module Title} — Gyosei OS</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="../shared/styles/tokens.css">
  <link rel="stylesheet" href="../shared/styles/components.css">
  <link rel="stylesheet" href="../shared/styles/shell.css">
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <div class="app-shell">
    <!-- section: shared/shell/side-nav.html (set aria-current="page") -->
    <!-- section: shared/shell/mobile-nav.html -->
    <div class="main-area">
      <!-- section: shared/shell/topbar.html -->
      <main id="main" class="main-content">
        <!-- section: sections/page-header.html -->
        <!-- TODO: add page sections -->
      </main>
    </div>
  </div>
  <script src="../shared/scripts/mobile-nav.js"></script>
  <script src="../shared/scripts/navigate.js"></script>
  <script src="scripts/{module}-page.js"></script>
</body>
</html>
```

### split-manifest.json 骨架

```json
{
  "module": "{module}",
  "entryFile": "index.html",
  "sections": [],
  "dataFiles": [],
  "scripts": [],
  "sharedCandidates": [],
  "referenceDocs": [
    "P0-CONTRACT.md",
    "SPLIT-ARCHITECTURE.md"
  ],
  "productionMapping": {
    "domain": [],
    "data": [],
    "model": [],
    "ui": [],
    "shared": []
  },
  "regressionChecklist": []
}
```

### P0-CONTRACT.md 骨架

```markdown
# {Module Title} — P0 约束清单

> 本文档定义 {Module Title} 模块在 P0 阶段必须保留的交互、字段和行为约束。

---

## 1. 入口与导航

<!-- TODO: 定义入口路径、导航位置、返回规则 -->

## 2. 字段与列定义

<!-- TODO: 列出列表/表格的字段定义 -->

## 3. 操作与交互

<!-- TODO: 列出单条操作和批量操作 -->

## 4. 状态与异常态

<!-- TODO: 列出所有状态场景的规格要求 -->

## 5. Demo 能力标注

<!-- TODO: 标注仅为 demo 的功能 -->
```

## Workflow

1. 确认模块名称（kebab-case）和中文标题。
2. 读取金样本 `customers/SPLIT-ARCHITECTURE.md`，掌握标准目录结构。
3. 读取 `shared/` 目录文件列表，确认可引用的样式和壳子文件。
4. 读取 `shared/shell/side-nav.html`，确认新模块是否需要添加导航项。
5. 创建模块根目录 `packages/prototype/admin/{module}/`。
6. 创建 `index.html`：
   - 引用 shared 样式（tokens.css / components.css / shell.css）
   - 内联 shared shell HTML（side-nav / mobile-nav / topbar），设置 `aria-current="page"`
   - 创建 `<main>` 结构和 page-header section 注释
   - 引用 shared 脚本 + 模块脚本
7. 创建 `sections/page-header.html`（页面标题 + 主操作按钮占位）。
8. 创建 `scripts/{module}-page.js`（DOMContentLoaded 入口骨架）。
9. 创建 `data/{module}-config.js`（空配置导出骨架）。
10. 创建 `split-manifest.json`（空骨架，填入模块名和已创建的文件）。
11. 创建 `P0-CONTRACT.md` 骨架。
12. 创建 `SPLIT-ARCHITECTURE.md` 骨架。
13. 如果用户要求完整骨架，额外创建 `MIGRATION-MAPPING.md` 和 `REGRESSION-GATE.md` 骨架。
14. 如果需要在 side-nav 中添加导航项，更新 `shared/shell/side-nav.html`。
15. 在浏览器中打开 `index.html` 验证可运行（或至少确认 HTML 结构完整无断裂）。

## Rules

- 模块目录名使用 kebab-case，与 `split-manifest.json` 的 `module` 值一致。
- `index.html` 必须引用 `shared/styles/` 和 `shared/shell/` —— 不复制壳子代码到模块内。
- `sections/*.html` 只放 HTML 结构，不放 `<script>` 或 `<style>`。
- `scripts/*.js` 按能力拆分，一个文件只负责一种行为域。
- `data/*.js` 放声明式配置，不放 DOM 编排逻辑。
- `shared/` 层不出现业务模块名（"客户""案件""线索"等）。（来源：AGENTS.md）
- 所有文件命名使用 kebab-case。
- 骨架文件中的 TODO 标记使用 `<!-- TODO: ... -->` 或 `<!-- TODO: ... -->`，供后续填充。
- 不在骨架中预写业务逻辑——骨架只提供结构和占位。

## Anti-Patterns

- 从金样本直接复制业务内容（客户表格、客户弹窗）到新模块 → 应只复制结构，替换为新模块语义
- 在 index.html 中重新定义 CSS 变量或组件样式 → 应引用 shared/styles/
- 在 index.html 中手写导航 HTML 而不引用 shared/shell/ → 导航不同步，后续维护翻倍
- 创建了目录但没有可运行的 index.html → 骨架不可预览，无法验证结构正确
- 把所有脚本写在 index.html 的 `<script>` 标签内 → 违反"脚本按能力拆分"原则
- 骨架文件中预填业务逻辑占位代码 → 混淆骨架和实现，后续需要删除再写
- 忘记在 side-nav 中添加新模块的导航项 → 页面无法从侧边栏导航访问

## References

- [scaffold-checklist.md](references/scaffold-checklist.md) — 骨架创建检查清单
- `packages/prototype/admin/customers/SPLIT-ARCHITECTURE.md` — 金样本目录结构
- `packages/prototype/admin/customers/split-manifest.json` — 金样本 manifest
- `packages/prototype/admin/billing/` — 复杂模块金样本
- `packages/prototype/admin/shared/` — 共享层文件索引
- [example-walkthrough.md](references/example-walkthrough.md) — billing 模块骨架搭建演练（含 customers 对比）
- [SKILL-PROTOCOL.md](../_meta/SKILL-PROTOCOL.md) — 本 skill 遵循的统一协议

## Completion

完成后逐项确认：

1. 模块目录结构完整（index.html + sections/ + scripts/ + data/）
2. `index.html` 可在浏览器中打开，共享壳子正确渲染
3. `index.html` 引用了 shared 样式和 shared shell（非复制）
4. `side-nav.html` 中新模块的导航项已添加（如果是全新页面）
5. `aria-current="page"` 在 index.html 中正确设置
6. `split-manifest.json` 骨架存在，`module` 值与目录名一致
7. `P0-CONTRACT.md` 骨架存在，章节结构完整
8. `SPLIT-ARCHITECTURE.md` 骨架存在
9. 所有文件使用 kebab-case 命名
10. 骨架中无业务逻辑代码（只有结构和 TODO 占位）

仓库门禁（适用于产生代码改动的 skill）：

1. 运行 `npm run fix`
2. 运行 `npm run guard`
3. 新增/修改逻辑已补单测（覆盖 model / domain / data）
