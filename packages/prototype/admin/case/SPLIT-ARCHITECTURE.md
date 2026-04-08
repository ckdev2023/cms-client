# 案件新建页原型拆分架构说明

> 本文档定义 `packages/prototype/admin/case/create.html` 的目录职责、边界和拆分顺序。
>
> P0 约束清单见 [P0-CONTRACT.md](./P0-CONTRACT.md)

---

## 1 当前目标

本次拆分目标不是重写整个案件模块，而是把“新增案件”落到 `case/` 目录内，并形成后续可继续扩展的原型工件：

- `create.html` 作为新增案件入口页
- `sections/` 保存页面结构边界
- `data/` 保存模板、客户、负责人等声明式演示配置
- `scripts/` 保存页面编排与 modal 行为
- `index.html` 作为列表页入口，跳转到 `create.html`

## 2 目标目录结构

```text
packages/prototype/admin/case/
├── create.html                         ← 新增案件入口
├── index.html                          ← 案件列表入口
├── P0-CONTRACT.md
├── SPLIT-ARCHITECTURE.md
├── MIGRATION-MAPPING.md
├── split-manifest.json
├── sections/
│   ├── create-header.html              ← 面包屑、标题、范围 chips
│   ├── create-stepper.html             ← 四步 stepper
│   ├── business-form.html              ← 模板、申请类型、Group、案件标题
│   ├── related-parties.html            ← 主申请人、关联人、资料模板、家族签/技人国说明
│   ├── assignment-review.html          ← 分派字段、自动动作、创建汇总
│   ├── customer-modal.html             ← 快速新建主申请人/关联人 modal
│   └── toast.html                      ← 创建反馈 toast
├── data/
│   ├── case-list.js                    ← 列表页示例数据
│   └── case-create-config.js           ← 新建页模板、客户、负责人、toast 配置
└── scripts/
    ├── case-page.js                    ← 列表页交互
    ├── case-create-page.js             ← stepper、模板切换、汇总、创建反馈
    └── case-create-modal.js            ← 快速新建客户/关联人 modal
```

## 3 模块职责定义

### 3.1 入口页

#### `create.html`

职责：

1. 引入 `shared/styles/*` 与 `shared/scripts/*`
2. 组装 `sections/*.html` 对应的页面边界
3. 提供页面专有样式，如 stepper、模板卡片、汇总卡片
4. 通过 `<script src>` 依次挂载 config、page、modal

#### `index.html`

职责：

1. 保留案件列表页
2. 把顶部入口从旧的 `case-create.html` 改为 `create.html`
3. 作为新增案件原型的回流入口

### 3.2 sections

| 文件 | 职责 | 对应契约 |
|------|------|---------|
| `create-header.html` | 标题、副标题、chips | §1 必保留区块 |
| `create-stepper.html` | 四步进度视觉层 | §1 必保留区块 |
| `business-form.html` | 模板选择、申请类型、Group、案件标题 | §2.1 |
| `related-parties.html` | 主申请人、关联人、资料模板、家族/工作场景 | §2.2, §3 |
| `assignment-review.html` | 负责人、期限、金额、自动动作、最终汇总 | §2.3, §5 |
| `customer-modal.html` | 快速新建客户/关联人 modal | §4 |
| `toast.html` | 创建反馈 toast | §7 |

### 3.3 data

#### `data/case-create-config.js`

集中声明：

- `groups`
- `owners`
- `customers`
- `templates`
- `defaultState`
- `toast`

边界规则：

- 只放声明式配置和静态示例数据
- 不出现 `querySelector`、`addEventListener`、DOM 写入

### 3.4 scripts

| 文件 | 职责 | 依赖 |
|------|------|------|
| `scripts/case-create-page.js` | stepper、模板切换、主申请人回填、资料模板渲染、汇总、创建反馈 | `data/case-create-config.js` |
| `scripts/case-create-modal.js` | modal 打开/关闭、字段校验、回填主申请人或关联人 | `scripts/case-create-page.js` 暴露的 `window.CaseCreatePageApi` |

## 4 Shared 与页面层边界

### 4.1 归入 shared 的能力

- `shared/styles/tokens.css`
- `shared/styles/components.css`
- `shared/styles/shell.css`
- `shared/scripts/mobile-nav.js`
- `shared/scripts/navigate.js`

### 4.2 留在 case/create 的能力

- 模板卡片文案与切换逻辑
- 家族签批量模式提示
- 资料模板分组与必交文案
- 快速新建主申请人 / 关联人的 modal 语义
- 创建案件汇总与成功反馈

### 4.3 明确不提升到 shared

- “家族滞在”“技人国”“CaseParty”“资料清单”等案件语义
- 主申请人 / 配偶 / 子女 / 雇主联系人等角色文案
- 跨组建案原因字段

## 5 拆分步骤

1. 复用 `shared` 样式与导航脚本，建立 `create.html`
2. 把页面结构拆到 `sections/`
3. 抽出 `data/case-create-config.js`
4. 把页面交互拆成 `case-create-page.js` 和 `case-create-modal.js`
5. 回写 `index.html`、`customers/index.html`、`admin-prototype.html` 的新建入口
6. 更新 `P0-CONTRACT.md`、`MIGRATION-MAPPING.md`、`split-manifest.json`

## 6 Demo-only 说明

以下逻辑只服务原型演示，必须保留标注：

- 创建案件不真实落库
- 资料模板勾选不驱动真实进度
- `#family-bulk` 只切换默认模式
- 快速新建客户仅回填到当前页面状态
# 案件页原型拆分架构说明

> 本文档定义 `packages/prototype/admin/case/` 的目标目录结构、模块职责、共享边界与拆分顺序，作为 AI 与开发人员的共同入口文档。
>
> P0 约束清单见 [P0-CONTRACT.md](./P0-CONTRACT.md)

---

## 1 当前问题

当前 `case/index.html` 已经引用了共享样式与共享脚本，但仍然存在以下耦合点：

| 关注点 | 位置 | 问题 |
|--------|------|------|
| 页面专有样式 | `<style>` 内联块 | summary card、status pill、progress、toolbar 样式与 HTML 入口耦合 |
| App shell HTML | `mobile-nav` / `side-nav` / `topbar` | 共享壳层仍在页面内重复展开，未像客户模块一样形成明确引用边界 |
| 页面区块 HTML | `<main>` 内的 5 个主要区块 | header、summary、filters、table、toast 没有独立 section 边界文件 |
| 列表数据 | `data/case-list.js` | 示例数据集中，但过滤器 schema、列定义、批量动作配置仍隐式散落在 HTML 与脚本中 |
| 页面脚本 | `scripts/case-page.js` | 筛选、统计、表格渲染、批量选择、批量动作、toast 全部混在一个 IIFE 中 |
| 分页 | 表格 footer | 当前仅静态展示，未单独标注为 demo-only 能力 |

---

## 2 目标目录结构

```
packages/prototype/admin/
├── shared/                              ← 公共层（多页面共享）
│   ├── styles/
│   │   ├── tokens.css
│   │   ├── components.css
│   │   └── shell.css
│   ├── shell/
│   │   ├── side-nav.html
│   │   ├── mobile-nav.html
│   │   └── topbar.html
│   └── scripts/
│       ├── mobile-nav.js
│       └── navigate.js
│
├── case/                                ← 案件页层
│   ├── index.html                       ← 入口文件（保留可运行版本）
│   ├── P0-CONTRACT.md
│   ├── SPLIT-ARCHITECTURE.md
│   ├── MIGRATION-MAPPING.md
│   ├── split-manifest.json
│   ├── sections/
│   │   ├── header.html                  ← 页面标题与顶部建案入口
│   │   ├── summary-cards.html           ← 4 张 summary card
│   │   ├── filters.html                 ← scope、搜索、筛选、重置
│   │   ├── table.html                   ← 批量栏、列表、分页 footer
│   │   └── toast.html                   ← 操作反馈 toast
│   ├── data/
│   │   └── case-list.js                 ← 示例负责人字典与示例案件列表
│   └── scripts/
│       └── case-page.js                 ← 页面初始化、过滤、统计、渲染、批量动作、toast
│
└── ...其他页面
```

---

## 3 模块职责定义

### 3.1 共享层 (`shared/`)

案件页继续复用共享层提供的视觉基础和壳子结构，`shared/` 中不引入案件业务语义。

#### `shared/styles/*.css`

- `tokens.css`：设计 token
- `components.css`：按钮、卡片、表格、表单等公共组件样式
- `shell.css`：桌面/移动壳层布局

#### `shared/shell/*.html`

- `side-nav.html`
- `mobile-nav.html`
- `topbar.html`

这些文件应作为统一壳层来源，案件页只负责标记“当前页高亮为案件”。

#### `shared/scripts/*.js`

- `mobile-nav.js`：导航开关
- `navigate.js`：`data-navigate` 的原型导航能力

### 3.2 案件页层 (`case/`)

案件页层只关注案件列表特有的区块、示例数据和列表行为。

#### `case/index.html` — 入口组装文件

职责：

1. 声明文档、引入共享样式
2. 保留案件页专有的样式块
3. 组装共享 shell 与页面主体
4. 在 `<main>` 中按 section 顺序组织页面
5. 在页尾引入 `data/case-list.js`、`scripts/case-page.js`、共享脚本

> P0 阶段仍维持可直接打开运行的 HTML；`sections/*.html` 用于标注文档和逻辑边界，不通过构建工具动态 include。

#### `case/sections/*.html` — 页面区块

| 文件 | 内容 | 对应 P0 契约 |
|------|------|-------------|
| `header.html` | 页面标题、副标题、顶部建案入口 | §1.1, §4 |
| `summary-cards.html` | 4 张 summary card | §1.2 |
| `filters.html` | scope、筛选器、搜索、重置 | §2 |
| `table.html` | 批量栏、表格、分页摘要/按钮 | §1.3, §3 |
| `toast.html` | Toast 通知组件 | §7 |

#### `case/data/case-list.js` — 示例数据

当前职责：

- `owners`：负责人展示信息
- `cases`：案件列表示例数据

当前缺口：

- 筛选器定义、列定义、批量动作定义仍是隐式结构
- 后续若继续细化，可再抽 `case-config.js` 作为声明式配置文件

#### `case/scripts/case-page.js` — 页面编排脚本

当前职责：

- `DOMContentLoaded` 入口
- scope / 搜索 / 筛选 state
- summary card 统计
- 表格行渲染
- 批量选择与 `selectAllCases`
- 批量负责人 / 协作者 / 截止日 / 任务动作
- toast 展示

当前缺口：

- 单文件承载多个能力域
- HTML、数据与行为之间仍有较多 DOM ID 耦合

---

## 4 共享层与页面层边界规则

| 规则 | 说明 |
|------|------|
| **共享层不含案件业务逻辑** | `shared/` 下文件不出现阶段、校验、风险、截止日等案件语义 |
| **页面层不复制壳子** | `case/index.html` 只保留页面入口职责，不把 shell 当成案件业务的一部分 |
| **section 只标识结构边界** | `sections/*.html` 不放 `<script>` |
| **示例数据集中声明** | `owners` 与 `cases` 继续放在 `data/` |
| **脚本暂以列表编排为主** | 当前保持单脚本可运行；未来如继续细拆，优先分为 filters / table / bulk-actions |
| **demo-only 必须标注** | 静态数据、静态分页、toast 示例文案、固定统计日期都要显式标注 |

---

## 5 拆分步骤（推荐执行顺序）

### Step 1：确认共享层引用

1. 保持 `shared/styles/*` 与 `shared/scripts/*` 作为唯一公共来源
2. 在入口文件内为 shell 区块补充注释边界
3. 确认 `aria-current="page"` 指向案件导航项

### Step 2：标注页面区块

1. 在 `index.html` 的 `<main>` 中标记 section 起止注释
2. 将各区块同步到 `sections/*.html`
3. 保持入口文件仍然完整可运行

### Step 3：补齐拆分文档

1. 写 `P0-CONTRACT.md`
2. 写 `SPLIT-ARCHITECTURE.md`
3. 写 `MIGRATION-MAPPING.md`
4. 写 `split-manifest.json`

### Step 4：最终回归

1. 按 [P0-CONTRACT.md](./P0-CONTRACT.md) 的回归清单逐项确认
2. 运行 `npm run fix`
3. 运行 `npm run guard`

---

## 6 从原型 Section 到生产组件的映射表（前瞻）

完整映射见 [MIGRATION-MAPPING.md](./MIGRATION-MAPPING.md)。这里保留速查摘要：

| 原型 Section / 文件 | 生产去向 |
|--------------------|---------|
| `sections/header.html` | `features/case/ui/CaseListHeader` |
| `sections/summary-cards.html` | `features/case/ui/CaseListSummaryCards` |
| `sections/filters.html` | `features/case/ui/CaseListFilters` |
| `sections/table.html` | `features/case/ui/CaseTable` + `CaseBulkActionBar` |
| `sections/toast.html` | `shared/ui/Toast` |
| `data/case-list.js` | `domain/case/Case.ts` + `data/case/CaseApi.ts` |
| `scripts/case-page.js` | `features/case/model/useCaseListViewModel`（并可按需拆分子 hooks） |
