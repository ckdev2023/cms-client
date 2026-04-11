# 咨询线索详情页原型拆分架构说明

> 本文档定义 `packages/prototype/admin/leads-message/detail.html` 的目录职责、边界和拆分顺序。
>
> P0 约束清单见 [P0-CONTRACT-DETAIL.md](./P0-CONTRACT-DETAIL.md)
>
> 缺口基线见 [SPEC-GAP-MATRIX-DETAIL.md](./SPEC-GAP-MATRIX-DETAIL.md)

---

## 1 当前目标

旧 `leads-messages.html` 完全没有独立详情页（仅有右侧会话面板），需全新构建符合规格的详情页原型：

- `detail.html` 作为咨询线索详情入口页
- `sections/detail-*.html` 保存 Header、4 个 Tab、状态横幅的页面结构边界
- `data/leads-detail-config.js` 保存示例数据、Tab 配置、8 种样本场景
- `scripts/leads-detail-page.js` 保存 Tab 切换、跟进动作、转化动作、状态横幅、样本切换等行为
- 详情页专属文档不混入列表页文档

## 2 目标目录结构

```text
packages/prototype/admin/leads-message/
├── detail.html                                ← 详情页入口
├── index.html                                 ← 列表页入口（已有架构定义）
├── P0-CONTRACT-DETAIL.md                      ← 详情页约束清单
├── SPLIT-ARCHITECTURE-DETAIL.md               ← 详情页拆分架构（本文）
├── MIGRATION-MAPPING-DETAIL.md                ← 详情页迁移映射
├── split-manifest-detail.json                 ← 详情页 manifest
├── SPEC-GAP-MATRIX-DETAIL.md                  ← 详情页缺口矩阵
├── shell/
│   ├── mobile-nav.html                        ← 基于 shared shell 的本模块路径/当前页态适配
│   ├── side-nav.html                          ← 基于 shared shell 的本模块路径/当前页态适配
│   └── topbar-detail.html                     ← 详情页 topbar 片段（含“线索列表”返回入口）
├── sections/
│   ├── header.html                            ← 列表页 header（已有架构定义）
│   ├── filters.html                           ← 列表页筛选面板（已有架构定义）
│   ├── table.html                             ← 列表页表格（已有架构定义）
│   ├── create-modal.html                      ← 列表页新建弹窗（已有架构定义）
│   ├── toast.html                             ← 列表页 Toast（已有架构定义）
│   ├── detail-header.html                     ← 面包屑、标题、状态 badge、负责人、Group、操作按钮、样本切换
│   ├── detail-tabs.html                       ← 4-Tab 横向导航
│   ├── detail-info.html                       ← Tab 1 基础信息（8 字段结构化展示）
│   ├── detail-followups.html                  ← Tab 2 跟进记录（时间线 + 新增表单 + 一键转任务）
│   ├── detail-conversion.html                 ← Tab 3 转化信息（去重面板 + 转化入口 + 已转化卡片）
│   ├── detail-convert-modals.html             ← 转客户 / 转案件确认弹窗（demo-only）
│   ├── detail-toast.html                      ← 详情页 Toast（跟进/转化/状态变更反馈）
│   ├── detail-log.html                        ← Tab 4 日志（三分类筛选 + 变更时间线）
│   ├── detail-readonly-banner.html            ← 已流失态只读横幅
│   └── detail-warning-banner.html             ← 已签约未转化态 warning 横幅
├── styles/
│   └── detail.css                             ← 详情页专有样式
├── data/
│   ├── leads-config.js                        ← 列表页配置（已有架构定义）
│   └── leads-detail-config.js                 ← 详情页示例数据与样本配置
└── scripts/
    ├── leads-page.js                          ← 列表页脚本（已有架构定义）
    ├── leads-create-modal.js                  ← 列表页弹窗脚本（已有架构定义）
    └── leads-detail-page.js                   ← 详情页行为脚本
```

## 3 模块职责定义

### 3.1 入口页

#### `detail.html`

职责：

1. 引入 `shared/styles/*`、`styles/detail.css` 与 `shared/scripts/*`
2. 通过 `data-include-html` 组装本模块 `shell/*.html`
3. 在 `<main>` 中按 section 顺序装配：header → readonly-banner → warning-banner → tabs → tab-panels
4. 在 `<main>` 外继续装配 `detail-convert-modals.html` 与 `detail-toast.html`
5. 通过 `<script src>` 依次挂载 `shared/scripts/html-fragment-loader.js` → `data/leads-detail-config.js` → `scripts/leads-detail-page.js` → 共享脚本

> P0 阶段仍维持可直接打开运行的 HTML，但入口页改为运行时片段装配：`html-fragment-loader.js` 负责注入 `shell/*.html` 与 `sections/detail-*.html`。

### 3.2 sections

| 文件 | 职责 | 对应契约 |
|------|------|---------|
| `detail-header.html` | 面包屑（咨询线索 → {联系人姓名}）、线索标题、状态 badge、负责人、Group、样本切换 select、操作按钮组（编辑/调整状态/转客户/转案件/标记流失） | §1, §3 |
| `detail-tabs.html` | 4-Tab 横向导航栏（基础信息 / 跟进记录 / 转化信息 / 日志） | §2 |
| `detail-info.html` | 8 字段结构化展示：线索编号、姓名、电话/邮箱、来源/介绍人、意向业务类型、归属 Group、负责人、备注；编辑入口（demo-only） | §4 |
| `detail-followups.html` | 跟进时间线（渠道 chip + 摘要 + 结论 + 下一步 + 时间 + 一键转任务）+ 新增跟进记录表单 + 空态引导 | §5 |
| `detail-conversion.html` | 去重匹配面板（电话/邮箱 → Lead/Customer 摘要 + 人工确认）+ 转客户/转案件操作入口 + 已转化 Customer/Case 卡片 + 跳转链接 | §6 |
| `detail-convert-modals.html` | 转客户/转案件确认弹窗；保留 Group 继承、主申请人预填、确认/取消等 demo-only 结构 | §6 |
| `detail-toast.html` | 详情页操作反馈 toast（跟进录入 / 一键转任务 / 转化 / 状态变更） | §12 |
| `detail-log.html` | 三分类筛选（全部/状态变更/人员变更/Group 变更）+ 变更日志时间线（操作类型 chip + 变更前后值 + 操作人 + 时间） | §7 |
| `detail-readonly-banner.html` | 已流失态：浅灰底 `--surface-2` + 锁图标 + "该线索已标记为流失，仅供查阅"；不可关闭 | §8 |
| `detail-warning-banner.html` | 已签约未转化态：浅黄底 `rgba(245,158,11,0.1)` + 警告图标 + "请完成转化" + 行动按钮；不可关闭 | §8 |

### 3.3 data

#### `data/leads-detail-config.js`

集中声明：

- `tabDefinitions` — 4 个 Tab 的 ID、标签（基础信息 / 跟进记录 / 转化信息 / 日志）
- `samples` — 8 种样本场景的完整数据集：
  - `following` — 正常跟进态
  - `lost` — 已流失态
  - `signed` — 已签约未转化态
  - `converted-customer` — 已转客户态
  - `converted-case` — 已转案件态
  - `dedup-lead` — 去重命中 Lead
  - `dedup-customer` — 去重命中 Customer
  - `empty-followups` — 空跟进记录态
- `defaultSample` — 默认加载的样本 key（`following`）
- `statusDefinitions` — 6 种状态文案与配色映射
- `channelDefinitions` — 4 种跟进渠道文案与颜色（电话/邮件/面谈/IM）
- `logCategories` — 状态变更 / 人员变更 / Group 变更
- `headerButtonMatrix` — 各状态下操作按钮的可见/禁用/高亮状态
- `toasts` — 跟进录入 / 一键转任务 / 转化成功 / 状态变更 / 编辑信息 / 标记流失 预设文案

边界规则：

- 只放声明式配置和静态示例数据
- 不出现 `querySelector`、`addEventListener`、DOM 写入
- 每个 sample 是一个自包含对象，包含 header 数据、各 Tab 的示例数据、状态标记
- 暴露为 `window.LeadsDetailConfig`

### 3.4 scripts

#### `scripts/leads-detail-page.js`

职责：

- `DOMContentLoaded` 入口
- Tab 切换（active/inactive 样式 + panel 显示/隐藏）
- 样本切换（重新渲染所有 Tab 内容 + header + banner）
- Header 操作按钮状态矩阵应用（按当前样本状态控制按钮可见/禁用/高亮）
- 只读控制（已流失态时禁用字段、隐藏 CTA、显示 readonly banner）
- Warning 控制（已签约未转化态时显示 warning banner、高亮转化按钮）
- 跟进记录新增（demo-only 表单提交 → toast + DOM 追加）
- 一键转任务（demo-only → toast）
- 转客户/转案件弹窗（demo-only → toast + 样本切换演示）
- 标记流失（demo-only → toast + banner 显示）
- 日志分类筛选（segmented control 切换 → DOM 过滤）
- Toast 展示

DOM 钩子（关键 ID / data 属性）：

| 钩子 | 用途 |
|------|------|
| `data-tab` | Tab 导航链接 |
| `tab-{id}` | Tab 面板容器（`tab-info`/`tab-followups`/`tab-conversion`/`tab-log`） |
| `leadSampleSelect` | 样本切换 select |
| `readonlyBanner` | 已流失态只读横幅 |
| `warningBanner` | 已签约未转化态 warning 横幅 |
| `followupTimeline` | 跟进记录时间线容器 |
| `followupForm` | 新增跟进记录表单 |
| `conversionPanel` | 转化信息面板容器 |
| `dedupPanel` | 去重匹配结果面板 |
| `logCategoryFilter` | 日志三分类筛选 |
| `toast` / `toastTitle` / `toastDesc` | Toast 容器 |

依赖：

- `data/leads-detail-config.js`（`window.LeadsDetailConfig`）
- `shared/scripts/mobile-nav.js`
- `shared/scripts/navigate.js`

---

## 4 共享层与页面层边界

### 4.1 归入 shared 的能力

- `shared/styles/tokens.css`
- `shared/styles/components.css`
- `shared/styles/shell.css`
- `shared/scripts/mobile-nav.js`
- `shared/scripts/navigate.js`

### 4.2 留在 leads-message/detail 的能力

- Tab bar 样式与切换逻辑
- 4 个 Tab 的内容结构
- 样本切换与数据绑定
- Header 操作按钮状态矩阵
- 跟进记录时间线与录入表单
- 渠道 Chip 文案与颜色
- 去重匹配面板
- 转化操作入口与确认弹窗
- 已转化卡片与跳转入口
- 只读/Warning 横幅控制
- 日志三分类切换
- 一键转任务动作

### 4.3 明确不提升到 shared

- "线索""跟进""去重""转化""转客户""转案件"等咨询线索业务语义
- 线索 6 状态文案与配色映射
- 跟进渠道（电话/邮件/面谈/IM）文案与颜色
- 去重匹配逻辑（电话/邮箱预设规则）
- 转化链路 Group 继承规则
- 日志三分类定义（状态变更/人员变更/Group 变更）

---

## 5 拆分步骤（推荐执行顺序）

### Step 1：建立配置文件

1. 创建 `data/leads-detail-config.js`
2. 声明 4 个 Tab 定义、8 种样本场景、状态/渠道/日志映射
3. 暴露为 `window.LeadsDetailConfig`

### Step 2：搭建入口壳层

1. 创建 `detail.html` 骨架
2. 引入 shared 样式、`styles/detail.css` 与片段加载器
3. 在 `<main>` 中预留 header、readonly-banner、warning-banner、tabs、tab-panels 的 `data-include-html` 结构位
4. 标注 `aria-current="page"` 指向"咨询线索"

### Step 3：拆分页面区块

1. 将各 Tab 内容拆到对应 `sections/detail-*.html`
2. 按规格补齐缺口（跟进时间线、去重面板、转化弹窗、日志时间线、空态引导）
3. 新增 `detail-readonly-banner.html`、`detail-warning-banner.html`、`detail-convert-modals.html` 和 `detail-toast.html`
4. 保持入口文件完整可运行

### Step 4：实现行为脚本

1. 创建 `scripts/leads-detail-page.js`
2. 实现 Tab 切换、样本切换、Header 按钮状态矩阵
3. 实现跟进录入（demo-only）、一键转任务、转化弹窗、标记流失
4. 实现只读/Warning 控制、日志分类筛选
5. 保持 `data/` 只存声明式配置

### Step 5：统一入口

1. 确认 `index.html` 的表格行跳转指向 `detail.html?id=xxx`
2. 确认 `detail.html` 面包屑"咨询线索"指向 `index.html`
3. 确认转化后 Customer/Case 跳转指向 `../customers/index.html` 和 `../case/detail.html`

### Step 6：回归与文档

1. 按 [P0-CONTRACT-DETAIL.md](./P0-CONTRACT-DETAIL.md) 回归清单逐项确认
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
                     │  data/leads-detail-       │ ← 必须最先完成
                     │  config.js                │
                     └───────────┬──────────────┘
                                 │ (window.LeadsDetailConfig)
             ┌───────────────────┼───────────────────┐
             │                   │                   │
    ┌────────▼───────┐  ┌───────▼────────┐  ┌───────▼──────────┐
    │ leads-detail-  │  │ sections/      │  │ (列表页已完成    │
    │ page.js        │  │ detail-*.html  │  │  index.html 的   │
    │ (Tab/样本/     │  │ + convert-     │  │  行跳转入口)     │
    │  跟进/转化/    │  │ modals         │  │                  │
    │  日志/banner)  │  │                │  │                  │
    └────────┬───────┘  └───────┬────────┘  └────────┬─────────┘
             │                  │                     │
             └──────────────────┼─────────────────────┘
                                │ (组装)
                     ┌──────────▼──────────────┐
                     │  detail.html            │ ← 最后集成
                     └─────────────────────────┘
```

依赖解析顺序：

1. `shared/*` — 已就绪，无需修改
2. `data/leads-detail-config.js` — 无外部依赖，可独立开发
3. `sections/detail-*.html` — 依赖 shared 样式类名和 config 中的 DOM ID 约定
4. `scripts/leads-detail-page.js` — 依赖 `leads-detail-config.js`
5. `detail.html` — 组装上述所有，最后集成
6. `index.html` → `detail.html` 跳转 — 列表页完成后统一入口

---

## 7 与列表页的接口约定

详情页与列表页通过以下接口关联：

| 接口点 | 方向 | 约定 |
|--------|------|------|
| 行点击跳转 | `index.html` → `detail.html` | URL 格式：`detail.html?id={leadId}`；`leadId` 对应 `leads-config.js` 中的样例 ID |
| 面包屑返回 | `detail.html` → `index.html` | `<a href="index.html">咨询线索</a>` |
| 状态枚举 | 共享 | 列表页 `leads-config.js` 和详情页 `leads-detail-config.js` 使用相同的状态 key 和配色 |
| 样本切换 | 详情页独立 | 详情页通过 select 切换 8 种场景，不依赖 URL query 中的 id 查找真实数据 |
| 转化跳转 | `detail.html` → 外部模块 | Customer：`../customers/index.html`；Case：`../case/detail.html` |

---

## 8 Demo-only 说明

以下逻辑只服务原型演示，必须保留标注：

- 样本切换仅切换前端内存数据，不走路由
- Tab 切换仅 DOM 显示/隐藏
- 跟进录入 demo-only 表单，不真实落库；提交后 toast + DOM 追加
- 一键转任务 demo-only 按钮，toast "已创建任务"，不真实创建
- 转客户/转案件 demo-only 弹窗 + toast，不真实创建 Customer/Case
- 去重匹配按 `data/leads-detail-config.js` 预设样例展示，非真实匹配
- 状态变更通过样本切换展示不同状态，非真实状态机流转
- 编辑信息 demo-only 按钮，toast 提示，不真实修改
- 只读态通过 CSS `pointer-events:none` / `opacity` 演示，非真实权限
- 日志数据静态 JS 配置驱动，非真实审计日志
- 跳转入口为 demo 链接（`../customers/index.html`、`../case/detail.html`）

---

## 9 从原型 Section 到生产组件的映射表（前瞻）

完整映射见 [MIGRATION-MAPPING-DETAIL.md](./MIGRATION-MAPPING-DETAIL.md)。这里保留速查摘要：

| 原型 Section / 文件 | 生产去向 | 层级 |
|--------------------|---------|------|
| `sections/detail-header.html` | `LeadDetailHeader` | features/lead/ui |
| `sections/detail-tabs.html` | `LeadDetailTabs` | features/lead/ui |
| `sections/detail-info.html` | `LeadInfoTab` | features/lead/ui |
| `sections/detail-followups.html` | `LeadFollowupsTab` + `FollowupTimeline` + `FollowupForm` | features/lead/ui |
| `sections/detail-conversion.html` | `LeadConversionTab` + `DedupPanel` + `ConversionCard` | features/lead/ui |
| `sections/detail-log.html` | `LeadLogTab` + `LogTimeline` | features/lead/ui |
| `sections/detail-readonly-banner.html` | `ReadonlyBanner` | shared/ui (可泛化) |
| `sections/detail-warning-banner.html` | `WarningBanner` | shared/ui (可泛化) |
| `data/leads-detail-config.js` | `Lead.ts` + `leadDetailConstants.ts` + `LeadSample.ts` | domain/lead |
| `scripts/leads-detail-page.js` | `useLeadDetailViewModel` + `useLeadFollowups` + `useLeadConversion` + `useLeadLog` | features/lead/model |
| — | `LeadConversionService.ts` | domain/lead |
| — | `LeadDedupService.ts` | domain/lead |
| — | `LeadStatusMachine.ts` | domain/lead |
