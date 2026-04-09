# 咨询线索列表页原型拆分架构说明

> 本文档定义 `packages/prototype/admin/leads-message/` 列表页的目录职责、边界和拆分顺序。
>
> P0 约束清单见 [P0-CONTRACT.md](./P0-CONTRACT.md)
>
> 缺口基线见 [SPEC-GAP-MATRIX.md](./SPEC-GAP-MATRIX.md)

---

## 1 当前问题

旧 `leads-messages.html` 是一个 ~1050 行的单文件，采用"左侧线索卡片列表 + 右侧会话面板"的 IM 风格布局。
规格文档要求"列表页 + 独立详情页"的标准 CRUD 架构，信息架构整体不匹配。

| 关注点 | 旧页位置 | 问题 |
|--------|---------|------|
| 设计 Token（CSS 变量） | `:root` 块 | 与共享层 `shared/styles/tokens.css` 重复定义 |
| 公共组件样式 | `<style>` 内联块 | `.btn-primary`, `.chip`, `.apple-card` 等在多页重复 |
| App Shell + 导航 HTML | `<body>` 开头 | 侧边导航、Topbar、移动端导航重复展开 |
| 线索列表 HTML | 左侧面板 | 卡片式单列列表，无表格、无批量选择 |
| 会话面板 HTML | 右侧面板 | Chat bubble 布局，新页不再使用 |
| 新建咨询弹窗 HTML | `#newLeadModal` | 字段不完整（缺介绍人、去重面板） |
| 页面脚本 | `<script>` 内联 | 弹窗、Toast、Tab 切换、对话渲染全部混在一个块中 |

---

## 2 目标目录结构

```text
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
├── leads-message/                       ← 咨询线索模块
│   ├── index.html                       ← 列表页入口（组装 shared + sections + scripts）
│   ├── detail.html                      ← 详情页入口（独立文档集管理）
│   ├── P0-CONTRACT.md
│   ├── P0-CONTRACT-DETAIL.md
│   ├── SPEC-GAP-MATRIX.md
│   ├── SPEC-GAP-MATRIX-DETAIL.md
│   ├── SPLIT-ARCHITECTURE.md            ← 本文档
│   ├── SPLIT-ARCHITECTURE-DETAIL.md
│   ├── MIGRATION-MAPPING.md
│   ├── MIGRATION-MAPPING-DETAIL.md
│   ├── split-manifest.json
│   ├── split-manifest-detail.json
│   ├── sections/
│   │   ├── header.html                  ← 页面标题 + 副标题 + "新建线索"主按钮
│   │   ├── filters.html                 ← 状态/负责人/Group/业务类型/跟进时间范围/搜索/重置
│   │   ├── table.html                   ← 11 列表格 + 批量选择 + 批量动作工具栏 + 空状态
│   │   ├── create-modal.html            ← 新建线索弹窗 + 去重提示面板
│   │   └── toast.html                   ← Toast 反馈区
│   ├── data/
│   │   ├── leads-config.js              ← 列表页：状态枚举、列定义、筛选项、批量动作、表单 schema、去重样例、Toast preset
│   │   └── leads-detail-config.js       ← 详情页：Tab 定义、时间线/转化/日志/横幅样例、样本切换配置
│   └── scripts/
│       ├── leads-page.js                ← 列表页：初始化、筛选、批量条、hash 入口、toast
│       ├── leads-create-modal.js        ← 弹窗：开关、必填校验、去重提示、创建反馈
│       └── leads-detail-page.js         ← 详情页：Tab 切换、跟进动作、转化动作、状态横幅、样本切换
│
└── ...其他页面
```

---

## 3 模块职责定义

### 3.1 共享层 (`shared/`)

咨询线索页继续复用共享层提供的视觉基础和壳子结构，`shared/` 中不引入线索业务语义。

#### `shared/styles/*.css`

- `tokens.css`：设计 Token（`:root` CSS 变量）
- `components.css`：按钮、卡片、表格、表单、Badge、Chip、Modal 等公共组件样式
- `shell.css`：桌面/移动壳层布局（`.app-shell`、侧边导航、Topbar、移动导航）

#### `shared/shell/*.html`

- `side-nav.html`
- `mobile-nav.html`
- `topbar.html`

统一壳层来源，线索页只负责标记"当前页高亮为咨询线索"（`aria-current="page"`）。

#### `shared/scripts/*.js`

- `mobile-nav.js`：导航开关（`data-nav-open/close`）
- `navigate.js`：`data-navigate` 的原型导航能力

### 3.2 咨询线索列表页层 (`leads-message/`)

列表页层只关注线索列表特有的区块、示例数据和列表行为。

#### `leads-message/index.html` — 入口组装文件

职责：

1. 声明 `<!DOCTYPE html>`、`<head>`（meta、title、tailwindcss CDN、font import）
2. 引入共享样式：`<link>` 到 `shared/styles/tokens.css`, `components.css`, `shell.css`
3. 引入列表页专有样式（状态 Badge、筛选面板、批量动作栏、表格行高亮/淡化、去重面板、空状态）
4. 组装 HTML 结构：`app-shell` > `side-nav` + `main`
5. 在 `<main>` 内按顺序插入 `sections/*.html` 片段内容
6. 在页尾引入脚本：`shared/scripts/mobile-nav.js` + `shared/scripts/navigate.js` + `data/leads-config.js` + `scripts/leads-page.js` + `scripts/leads-create-modal.js`

> **P0 阶段简化方案**：由于当前原型不使用构建工具，`sections/*.html` 作为"逻辑边界文件"存在——入口文件中用注释标记区块来源即可（如 `<!-- section: filters.html -->`）。脚本文件则通过 `<script src="...">` 引入。

#### `leads-message/sections/*.html` — 页面区块

| 文件 | 内容 | 对应 P0 契约 |
|------|------|-------------|
| `header.html` | 页面标题"咨询线索" + 副标题 + `新建线索` 主按钮 | §1 |
| `filters.html` | 状态 select + 负责人 select + Group select + 业务类型 select + 日期范围 + 搜索 + 重置 | §3 |
| `table.html` | 批量动作工具栏 + 11 列 `<table>` 结构（thead + tbody）+ 空状态 | §2, §4 |
| `create-modal.html` | `modal-backdrop` + `apple-modal` + 12 个表单字段 + 去重提示面板 | §5 |
| `toast.html` | `#toast` 反馈组件 | §6, §11 |

#### `leads-message/data/leads-config.js` — 声明式配置

集中声明：

- `LEAD_STATUSES` — 6 种状态枚举 + 配色映射（`new`/`following`/`pending_sign`/`signed`/`lost`/`signed-unconverted`）
- `TABLE_COLUMNS` — 11 列定义（id、label、width、align、responsive）
- `FILTER_OPTIONS` — 状态 / 负责人 / Group / 业务类型 筛选选项
- `BATCH_ACTIONS` — 批量指派负责人 / 批量调整跟进时间 / 批量标记状态 定义
- `CREATE_FORM_FIELDS` — 新建弹窗 12 字段 schema（含条件必填、条件显示）
- `DEDUP_SAMPLES` — 去重提示样例（电话命中 Lead / 邮箱命中 Customer）
- `DEMO_LEADS` — 至少 8 行示例数据，覆盖全部 6 状态 + 已签约未转化 + 重复命中
- `TOAST_PRESETS` — 创建成功 / 校验失败 / 批量操作 / 去重命中 / 转化成功 预设文案

边界规则：

- 只放声明式配置和静态示例数据
- 不出现 `querySelector`、`addEventListener`、DOM 写入
- 暴露为 `window.LeadsConfig`

#### `leads-message/scripts/*.js` — 行为模块

| 文件 | 职责 | 依赖 |
|------|------|------|
| `leads-page.js` | `DOMContentLoaded` 入口；`#new` hash 检测 → 打开弹窗；筛选状态管理 + DOM 过滤；批量选择联动（全选/单选/indeterminate）；批量动作 apply + toast；表格行渲染；行点击跳转 `detail.html?id=xxx` | `data/leads-config.js`, `leads-create-modal.js` |
| `leads-create-modal.js` | `openModal()` / `closeModal()`；必填校验（姓名 + 电话/邮箱至少一项）；来源="介绍"时显示介绍人字段；去重提示（电话/邮箱匹配 → 预设样例）；`handleCreate()` → toast + DOM 追加行 | `data/leads-config.js` |

跨模块通信使用挂载到约定命名空间（`window.__leadsPage`）的方式，避免模块之间直接互引 DOM ID。

---

## 4 共享层与页面层边界规则

| 规则 | 说明 |
|------|------|
| **共享层不含线索业务逻辑** | `shared/` 下的文件不出现"线索""跟进""去重""转化"等业务概念 |
| **页面层不复制壳子** | `leads-message/index.html` 不再手写导航 HTML，引用 `shared/shell/` |
| **样式单一来源** | `.btn-primary`, `.chip`, `.apple-table` 等在 `shared/styles/` 定义一次；页面层只补充专有样式 |
| **Token 单一来源** | `:root` CSS 变量在 `shared/styles/tokens.css` 定义一次；页面层不重新声明 |
| **脚本按能力拆** | 每个 `.js` 文件对应一个独立能力（page-init / modal / detail-page） |
| **配置集中声明** | 状态枚举、列定义、筛选项、表单 schema、去重样例、toast preset 在 `data/leads-config.js` 集中管理 |
| **data-* 钩子优先** | 尽量用 `data-action="xxx"` 属性 + 事件代理，减少 `onclick` 内联处理器 |
| **section 注释边界** | 入口 HTML 中用 `<!-- section: xxx.html -->` 注释标记区块起止 |

---

## 5 拆分步骤（推荐执行顺序）

### Step 1：建立配置文件

1. 创建 `data/leads-config.js`，声明全部列表页配置
2. 包含 8 行示例数据，覆盖全部演示场景
3. 暴露为 `window.LeadsConfig`

### Step 2：搭建列表页入口

1. 创建 `index.html`，引入 shared 样式与导航
2. 在 `<main>` 中预留 5 个 section 结构位
3. 标注 `aria-current="page"` 指向"咨询线索"

### Step 3：拆分页面区块

1. 将 `index.html` 的 `<main>` 中 5 个区块同步到 `sections/*.html`
2. 入口文件中用注释标记 section 来源
3. 保持入口文件完整可运行

### Step 4：实现行为脚本

1. 创建 `scripts/leads-page.js`：页面初始化、筛选、批量操作、行跳转
2. 创建 `scripts/leads-create-modal.js`：弹窗行为、校验、去重
3. 入口文件 `<script>` 改为 `<script src="...">` 引用

### Step 5：最终回归

1. 按 [P0-CONTRACT.md](./P0-CONTRACT.md) 回归清单逐项验证
2. 运行 `npm run fix` + `npm run guard`

---

## 6 集成顺序与文件依赖图

```
                     ┌──────────────────────────┐
                     │  shared/styles/*.css      │
                     │  shared/shell/*.html      │
                     │  shared/scripts/*.js      │
                     └───────────┬──────────────┘
                                 │ (引用)
                     ┌───────────▼──────────────┐
                     │  data/leads-config.js     │ ← 必须最先完成
                     └───────────┬──────────────┘
                                 │ (window.LeadsConfig)
             ┌───────────────────┼───────────────────┐
             │                   │                   │
    ┌────────▼───────┐  ┌───────▼────────┐  ┌───────▼──────────┐
    │ leads-page.js  │  │leads-create-   │  │ sections/*.html  │
    │ (筛选/批量/    │  │ modal.js       │  │ (结构边界)       │
    │  行渲染/入口)  │  │ (弹窗/校验/   │  │                  │
    └────────┬───────┘  │  去重/创建)    │  └────────┬─────────┘
             │          └───────┬────────┘           │
             └──────────────────┼────────────────────┘
                                │ (组装)
                     ┌──────────▼──────────────┐
                     │  index.html             │ ← 最后集成
                     └─────────────────────────┘
```

依赖解析顺序：

1. `shared/*` — 已就绪，无需修改
2. `data/leads-config.js` — 无外部依赖，可独立开发
3. `sections/*.html` — 依赖 shared 样式类名和 config 中的 DOM ID 约定
4. `scripts/leads-create-modal.js` — 依赖 `leads-config.js`
5. `scripts/leads-page.js` — 依赖 `leads-config.js` + `leads-create-modal.js`
6. `index.html` — 组装上述所有，最后集成

---

## 7 详情页子模块

详情页（`detail.html`）的拆分架构、约束与映射已独立管理：

- [SPLIT-ARCHITECTURE-DETAIL.md](./SPLIT-ARCHITECTURE-DETAIL.md)
- [P0-CONTRACT-DETAIL.md](./P0-CONTRACT-DETAIL.md)
- [MIGRATION-MAPPING-DETAIL.md](./MIGRATION-MAPPING-DETAIL.md)
- [split-manifest-detail.json](./split-manifest-detail.json)
- [SPEC-GAP-MATRIX-DETAIL.md](./SPEC-GAP-MATRIX-DETAIL.md)

---

## 8 Demo-only 说明

以下逻辑只服务原型演示，必须保留标注：

- 表格数据由静态 JS 配置驱动，非真实 API
- 筛选为前端 DOM 过滤，非服务端查询
- 批量动作 apply 仅触发 toast，不真实写入
- 去重提示按预设规则命中，非真实数据库匹配
- 新建线索仅在前端 DOM 追加行，刷新即失
- 行点击跳转到 `detail.html?id=demo`
- Toast 2.2s 自动消失，无持久化
- 空状态需手动清空数据触发

---

## 9 从原型 Section 到生产组件的映射表（前瞻）

完整映射见 [MIGRATION-MAPPING.md](./MIGRATION-MAPPING.md)。这里保留速查摘要：

| 原型 Section / 文件 | 生产去向 | 层级 |
|--------------------|---------|------|
| `sections/header.html` | `LeadListHeader` | features/lead/ui |
| `sections/filters.html` | `LeadListFilters` | features/lead/ui |
| `sections/table.html` | `LeadTable` + `LeadBulkActionBar` | features/lead/ui |
| `sections/create-modal.html` | `CreateLeadModal` | features/lead/ui |
| `sections/toast.html` | `Toast` | shared/ui |
| `scripts/leads-page.js` | `useLeadListViewModel` | features/lead/model |
| `scripts/leads-create-modal.js` | `useCreateLeadModal` + `useLeadDedup` | features/lead/model |
| `data/leads-config.js` | `Lead.ts` + `leadConstants.ts` | domain/lead |
| — | `LeadRepository.ts` | domain/lead |
| — | `LeadApi.ts` + `createLeadRepository.ts` | data/lead |
| `shared/styles/tokens.css` | Design tokens → Tamagui theme / CSS 变量 | infra |
| `shared/shell/*.html` | `AppShell` + `SideNav` + `TopBar` + `MobileNav` | shared/ui |
| `shared/scripts/mobile-nav.js` | `useMobileNav` | shared/hooks |
| `shared/scripts/navigate.js` | React Navigation（不需要独立 Hook） | — |
