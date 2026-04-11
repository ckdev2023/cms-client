# 仪表盘原型拆分架构说明

> 本文档定义 `packages/prototype/admin/dashboard/` 的目录职责、共享边界与拆分顺序。
>
> P0 约束清单见 [P0-CONTRACT.md](./P0-CONTRACT.md)

---

## 1 目标

本次不是继续把仪表盘留在单一 `admin-prototype.html` 中，而是把 P0 仪表盘拆成可持续维护的原型模块：

- `index.html` 作为可运行入口
- `sections/` 显式标注页面区块边界
- `data/` 放静态聚合数据、动作文案与可见性说明
- `scripts/` 放页面编排与示例反馈逻辑
- `P0-CONTRACT.md` / `MIGRATION-MAPPING.md` / `split-manifest.json` 固化验收与迁移基线

## 2 目标目录结构

```text
packages/prototype/admin/dashboard/
├── index.html
├── P0-CONTRACT.md
├── SPLIT-ARCHITECTURE.md
├── MIGRATION-MAPPING.md
├── split-manifest.json
├── styles/
│   └── dashboard.css
├── sections/
│   ├── header.html
│   ├── filters.html
│   ├── summary-cards.html
│   ├── worklists.html
│   ├── visibility-notes.html
│   └── toast.html
├── data/
│   └── dashboard-config.js
└── scripts/
    └── dashboard-page.js
```

## 3 模块职责

### 3.1 `index.html`

职责：

1. 引入 `shared/styles/*` 与 `shared/scripts/*`
2. 引入 `styles/dashboard.css` 承载页面专有样式
3. 组装 `header / filters / summary-cards / worklists / visibility-notes / toast`
4. 通过 `<script src>` 引入 `data/dashboard-config.js` 和 `scripts/dashboard-page.js`

### 3.2 `sections/*.html`

| 文件 | 职责 | 对应契约 |
|------|------|---------|
| `header.html` | 标题、副标题、P0 说明 chips | §1 |
| `filters.html` | 聚合范围切换、时间窗口切换、关键动作 | §2, §4 |
| `summary-cards.html` | 7 张核心卡片的结构边界 | §1 |
| `worklists.html` | 6 个核心列表区块 | §3 |
| `visibility-notes.html` | 权限、边界、demo-only 说明 | §5, §6, §7 |
| `toast.html` | 示例反馈 toast | §4, §7 |

### 3.3 `styles/dashboard.css`

集中承载仪表盘页面专有样式：

- hero header
- 快捷动作区
- 7 张 summary card
- 6 个 work panel
- 空状态、骨架屏、toast

边界规则：

- 只放仪表盘模块专有样式
- 不回写 `shared/styles/*` 已存在的 token、shell、通用组件样式

### 3.4 `data/dashboard-config.js`

集中声明：

- `defaultScope`
- `defaultWindow`
- `scopeLabels`
- `scopeSummary`
- `visibilityNotes`
- `metrics`
- `lists`
- `toasts`

边界规则：

- 只放声明式数据和文案
- 不放 DOM 查询、事件绑定或页面编排
- 所有示例数据明确属于 demo-only

### 3.5 `scripts/dashboard-page.js`

职责：

- 初始化 scope / window 状态
- 渲染卡片计数与 helper 文案
- 渲染 6 个列表区块
- 在范围 / 窗口切换时先展示骨架屏，再刷新内容
- 统一处理 toast 反馈

## 4 Shared 与页面层边界

### 4.1 归入 shared 的能力

- `packages/prototype/admin/shared/styles/tokens.css`
- `packages/prototype/admin/shared/styles/components.css`
- `packages/prototype/admin/shared/styles/shell.css`
- `packages/prototype/admin/shared/scripts/mobile-nav.js`
- `packages/prototype/admin/shared/scripts/navigate.js`

### 4.2 留在 dashboard 模块的能力

- 聚合卡片语义
- 视角切换说明
- 到期窗口切换
- 风险 / 回款 / 待提交列表内容
- 仪表盘专有骨架屏与 toast 文案

### 4.3 不提升到 shared 的内容

- “今日待办”“待回款”“风险案件”等业务概念
- 收费节点、Gate 通过、补正临期等业务判断文案
- 管理员视角与财务关注说明

## 5 拆分顺序

1. 建立 `dashboard/` 目录与入口页
2. 复用共享样式和导航壳层
3. 抽取 `dashboard-config.js` 承载聚合数据
4. 用 `dashboard-page.js` 实现刷新、骨架屏和 toast
5. 回写 `P0-CONTRACT.md`、`MIGRATION-MAPPING.md`、`split-manifest.json`

## 6 Demo-only 说明

以下行为仅服务原型演示：

- 所有统计卡片与列表数据
- 范围切换与窗口切换后的刷新结果
- 一键创建跟进 / 批量完成 / 登记回款等动作反馈
- 骨架屏加载态
