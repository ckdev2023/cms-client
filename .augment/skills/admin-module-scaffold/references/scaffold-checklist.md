# 骨架创建检查清单

> 本文件是 `admin-module-scaffold` skill 的快速参考。

---

## 1. 创建前确认

| # | 检查项 | 说明 |
|---|--------|------|
| 1 | 模块名称已确定 | kebab-case，如 `leads-message`、`tasks`、`reports` |
| 2 | 中文标题已确定 | 如"咨询与会话""任务与提醒""报表" |
| 3 | shared 层已就绪 | `shared/styles/`（tokens.css + components.css + shell.css）和 `shared/shell/`（side-nav.html + mobile-nav.html + topbar.html）存在 |
| 4 | 页面规格是否已有 | 如果 `docs/gyoseishoshi_saas_md/P0/06-页面规格/{module}.md` 已存在，创建骨架时可预填章节 |

---

## 2. 文件创建清单

### 必须创建

| # | 文件 | 说明 |
|---|------|------|
| 1 | `{module}/index.html` | 入口文件，引用 shared 层 |
| 2 | `{module}/sections/page-header.html` | 页面标题区（可选内联到 index.html） |
| 3 | `{module}/scripts/{module}-page.js` | 页面初始化脚本 |
| 4 | `{module}/data/{module}-config.js` | 声明式配置 |
| 5 | `{module}/split-manifest.json` | 机器可读清单骨架 |
| 6 | `{module}/P0-CONTRACT.md` | P0 约束清单骨架 |
| 7 | `{module}/SPLIT-ARCHITECTURE.md` | 拆分架构骨架 |

### 可选创建

| # | 文件 | 何时创建 |
|---|------|---------|
| 8 | `{module}/MIGRATION-MAPPING.md` | 用户要求完整骨架 |
| 9 | `{module}/REGRESSION-GATE.md` | 用户要求完整骨架 |
| 10 | `{module}/INVENTORY.md` | 模块从旧单文件迁移时 |

---

## 3. index.html 模板要点

### Head 区域

```html
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{Module Title} — Gyosei OS</title>
<script src="https://cdn.tailwindcss.com"></script>
<link rel="stylesheet" href="../shared/styles/tokens.css">
<link rel="stylesheet" href="../shared/styles/components.css">
<link rel="stylesheet" href="../shared/styles/shell.css">
```

### Body 结构

```
body
├── a.skip-link
├── div.app-shell
│   ├── aside.side-nav         ← 从 shared/shell/side-nav.html 内联
│   ├── div.mobile-nav         ← 从 shared/shell/mobile-nav.html 内联
│   └── div.main-area
│       ├── header.topbar      ← 从 shared/shell/topbar.html 内联
│       └── main#main.main-content
│           ├── section: page-header
│           └── section: ... (按需)
├── script: shared/scripts/mobile-nav.js
├── script: shared/scripts/navigate.js
└── script: scripts/{module}-page.js
```

### aria-current 设置

在内联的 side-nav 中，找到对应本模块的 `<a class="nav-item">` 行，添加 `aria-current="page"`：

```html
<a class="nav-item" href="{module}/index.html" aria-current="page">
```

> 注意：由于 index.html 在 `{module}/` 子目录中，side-nav 的 href 需要以 `../` 为前缀，或保持原始路径（因为当前页面在子目录下，相对路径自动解析）。

---

## 4. 导航项添加

如果是全新页面（side-nav 中还没有对应项），需要在 `shared/shell/side-nav.html` 中添加导航项：

```html
<a class="nav-item" href="{module}/index.html">
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="..."></path>
  </svg>
  {Module Title}
</a>
```

放置位置根据模块分类：
- 工作台：仪表盘
- 业务：咨询与会话、客户、案件、任务与提醒
- 内容：资料中心、文书中心
- 财务：收费与财务
- 系统：设置

---

## 5. 脚本骨架

### {module}-page.js

```javascript
/**
 * {Module Title} — Page initialization
 */
document.addEventListener('DOMContentLoaded', () => {
  // TODO: page init logic
});
```

### {module}-config.js

```javascript
/**
 * {Module Title} — Declarative configuration
 */

// TODO: export table columns, filter options, form fields, etc.
```

---

## 6. 创建后验证

| # | 验证项 |
|---|--------|
| 1 | `index.html` 在浏览器中可打开，壳子（侧边栏 + 顶栏）正确渲染 |
| 2 | 侧边栏中当前模块高亮 |
| 3 | 移动端汉堡菜单可打开/关闭 |
| 4 | 页面标题正确显示 |
| 5 | 控制台无 JS 错误 |
| 6 | `split-manifest.json` 可被 JSON.parse |
