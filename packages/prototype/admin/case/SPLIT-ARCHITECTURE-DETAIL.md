# 案件详情页原型拆分架构说明

> 本文档定义 `packages/prototype/admin/case/detail.html` 的目录职责、边界和拆分顺序。
>
> P0 约束清单见 [P0-CONTRACT-DETAIL.md](./P0-CONTRACT-DETAIL.md)
>
> 缺口基线见 [SPEC-GAP-MATRIX-DETAIL.md](./SPEC-GAP-MATRIX-DETAIL.md)

---

## 1 当前目标

将旧 `packages/prototype/admin/case-detail.html` 迁入 `case/` 模块内，形成模块化详情原型：

- `detail.html` 作为案件详情入口页
- `sections/detail-*.html` 保存各 Tab 与全局区块的页面结构边界
- `data/case-detail-config.js` 保存示例数据、Tab 配置、样本场景
- `scripts/case-detail-page.js` 保存 Tab 切换、样本切换、只读控制、风险确认等行为
- 详情页专属文档不混入列表/新建页文档

## 2 目标目录结构

```text
packages/prototype/admin/case/
├── detail.html                                ← 案件详情入口
├── index.html                                 ← 案件列表入口（已有）
├── create.html                                ← 案件新建入口（已有）
├── P0-CONTRACT-DETAIL.md                      ← 详情页约束清单
├── SPLIT-ARCHITECTURE-DETAIL.md               ← 详情页拆分架构（本文）
├── MIGRATION-MAPPING-DETAIL.md                ← 详情页迁移映射
├── split-manifest-detail.json                 ← 详情页 manifest
├── SPEC-GAP-MATRIX-DETAIL.md                  ← T01 产出：缺口矩阵
├── sections/
│   ├── detail-header.html                     ← 面包屑、标题、状态、操作栏
│   ├── detail-tabs.html                       ← 10-Tab 横向导航
│   ├── detail-overview.html                   ← Tab 1 概览（4 卡 + 提供方完成率 + 时间线）
│   ├── detail-info.html                       ← Tab 2 基础信息
│   ├── detail-documents.html                  ← Tab 3 资料清单（按提供方分组 + waived）
│   ├── detail-messages.html                   ← Tab 4 沟通记录
│   ├── detail-forms.html                      ← Tab 5 文書
│   ├── detail-tasks.html                      ← Tab 6 任务
│   ├── detail-deadlines.html                  ← Tab 7 期限（4 种）
│   ├── detail-validation.html                 ← Tab 8 校验与提交（Gate + 补正 + 风险确认）
│   ├── detail-billing.html                    ← Tab 9 收费
│   ├── detail-log.html                        ← Tab 10 日志（三分类）
│   ├── detail-readonly-banner.html            ← S9 只读横幅
│   └── detail-risk-confirmation.html          ← 欠款风险确认弹窗
├── data/
│   ├── case-list.js                           ← 列表页数据（已有）
│   ├── case-create-config.js                  ← 新建页数据（已有）
│   └── case-detail-config.js                  ← 详情页示例数据与样本配置
└── scripts/
    ├── case-page.js                           ← 列表页脚本（已有）
    ├── case-create-page.js                    ← 新建页脚本（已有）
    ├── case-create-modal.js                   ← 新建页 modal（已有）
    └── case-detail-page.js                    ← 详情页行为脚本
```

## 3 模块职责定义

### 3.1 入口页

#### `detail.html`

职责：

1. 引入 `shared/styles/*` 与 `shared/scripts/*`
2. 保留详情页专有样式（Tab bar、summary card、progress bar 等）
3. 组装共享 shell（side-nav、topbar、mobile-nav）与详情页主体
4. 在 `<main>` 中按 section 顺序组织 header → readonly-banner → tabs → tab-panels
5. 通过 `<script src>` 依次挂载 config → page script → shared scripts

> P0 阶段仍维持可直接打开运行的 HTML；`sections/detail-*.html` 标注结构边界，不通过构建工具动态 include。

### 3.2 sections

| 文件 | 职责 | 对应契约 |
|------|------|---------|
| `detail-header.html` | 面包屑、案件标题、阶段 badge、负责人、管辖机构、操作按钮、样本切换 | §1, §3 |
| `detail-tabs.html` | 10-Tab 横向导航栏 | §2 |
| `detail-overview.html` | 4 张 summary card + 按提供方完成率 + 阻断/风险摘要 + 下一步动作 + 时间线 | §4 |
| `detail-info.html` | 案件类型、申请类型、申请对象、关联企业、风险标签 | §5 |
| `detail-documents.html` | 按提供方分组列表 + 状态 + 催办 + waived/expired + 标记操作 | §6 |
| `detail-messages.html` | 消息时间线 + 撰写区 + 类型筛选 | §7 |
| `detail-forms.html` | 文书模板列表 + 生成记录 + 版本 + 导出 | §8 |
| `detail-tasks.html` | 任务列表 + 新增入口 | §9 |
| `detail-deadlines.html` | 4 种期限项 | §10 |
| `detail-validation.html` | 校验报告（Gate 标注）+ 复核 + 提交包 + 补正包 + 风险确认 | §11 |
| `detail-billing.html` | 统计卡 + 收款节点 + 登记回款 | §12 |
| `detail-log.html` | 三分类日志 | §13 |
| `detail-readonly-banner.html` | S9 归档只读横幅 | §15 |
| `detail-risk-confirmation.html` | 欠款风险确认弹窗 | §15 |

### 3.3 data

#### `data/case-detail-config.js`

集中声明：

- `tabDefinitions` — 10 个 Tab 的 ID、标签、默认排序
- `samples` — 6 种样本场景的完整数据集（work / family / gate-failed / debt-submit / correction / archived）
- `defaultSample` — 默认加载的样本 key
- `stageDefinitions` — S1–S9 阶段文案与样式映射
- `validationStatuses` — passed / failed / pending 文案与图标
- `documentStatuses` — 7 种资料项状态文案与 badge 样式
- `billingStatuses` — 应收 / 部分回款 / 已回款 / 欠款
- `logCategories` — 操作日志 / 审核日志 / 状态变更日志
- `toasts` — 各操作的反馈文案

边界规则：

- 只放声明式配置和静态示例数据
- 不出现 `querySelector`、`addEventListener`、DOM 写入
- 每个 sample 是一个自包含对象，包含 header、各 Tab 的示例数据、状态标记

### 3.4 scripts

#### `scripts/case-detail-page.js`

职责：

- `DOMContentLoaded` 入口
- Tab 切换（active/inactive 样式 + panel 显示/隐藏）
- 样本切换（重新渲染所有 Tab 内容）
- 概览 summary card 更新
- 按提供方完成率折叠/展开
- 只读控制（S9 时禁用字段、隐藏 CTA、显示 readonly banner）
- 风险确认弹窗打开/关闭
- toast 展示
- 日志分类筛选

DOM 钩子（关键 ID / data 属性）：

| 钩子 | 用途 |
|------|------|
| `data-tab` | Tab 导航链接 |
| `tab-{id}` | Tab 面板容器 |
| `caseSampleSelect` | 样本切换 select |
| `readonlyBanner` | S9 只读横幅 |
| `riskConfirmModal` | 欠款风险确认弹窗 |
| `providerProgress` | 按提供方完成率折叠区域 |
| `logCategoryFilter` | 日志三分类筛选 |
| `toast` / `toastTitle` / `toastDesc` | Toast 容器 |

依赖：

- `data/case-detail-config.js`（`window.CaseDetailConfig`）
- `shared/scripts/mobile-nav.js`
- `shared/scripts/navigate.js`

## 4 共享层与页面层边界

### 4.1 归入 shared 的能力

- `shared/styles/tokens.css`
- `shared/styles/components.css`
- `shared/styles/shell.css`
- `shared/scripts/mobile-nav.js`
- `shared/scripts/navigate.js`

### 4.2 留在 case/detail 的能力

- Tab bar 样式与切换逻辑
- 10 个 Tab 的内容结构
- 样本切换与数据绑定
- 按提供方完成率展开
- 只读态控制
- 风险确认弹窗
- 补正包对比入口
- Gate 标注与校验报告
- 日志三分类切换

### 4.3 明确不提升到 shared

- "Gate-A/B/C""补正包""waived""提交包锁定"等案件详情语义
- 案件阶段 S1–S9 文案与样式映射
- 校验结果 passed/failed/pending 的详情页展示逻辑
- 按提供方分组的资料清单结构

## 5 拆分步骤（推荐执行顺序）

### Step 1：搭建入口壳层（T03）

1. 基于 `create.html` 和旧 `case-detail.html` 建立 `detail.html` 骨架
2. 引入 shared 样式与导航，对齐 DESIGN.md token、topbar、侧边栏
3. 在 `<main>` 中预留 header、readonly-banner、tabs、tab-panels 的结构位

### Step 2：拆分页面区块（T04）

1. 将旧页的各 Tab 内容拆到对应 `sections/detail-*.html`
2. 按规格补齐缺口（按提供方分组、waived、补正包、风险确认等）
3. 新增 `detail-readonly-banner.html` 和 `detail-risk-confirmation.html`
4. 保持入口文件完整可运行

### Step 3：抽离数据配置（T05）

1. 将旧页内联数据、Tab 配置、样本场景收敛到 `data/case-detail-config.js`
2. 新增 gate-failed、debt-submit、correction、archived 样本
3. 暴露为 `window.CaseDetailConfig`

### Step 4：实现行为脚本（T06）

1. 将旧页 `<script>` 中的 Tab 切换、样本切换逻辑迁到 `scripts/case-detail-page.js`
2. 新增只读控制、风险确认弹窗、日志分类、按提供方展开等行为
3. 保持 `data/` 只存声明式配置

### Step 5：统一入口（T07 + T08）

1. 更新 `case/scripts/case-page.js` 的详情跳转
2. 更新 `case/index.html`、`create.html` 的回流入口
3. 更新 `admin-prototype.html`、`billing.html`、`tasks.html`、`documents.html` 的旧链接

### Step 6：回归与文档（T09）

1. 按 P0-CONTRACT-DETAIL.md 回归清单逐项确认
2. 运行 `npm run fix` 和 `npm run guard`

## 6 Demo-only 说明

以下逻辑只服务原型演示，必须保留标注：

- 样本切换仅切换前端内存数据，不走路由
- Tab 切换仅 DOM 显示/隐藏
- 校验/提交包/复核均为静态展示
- 风险确认弹窗不真实落库
- 只读态通过 CSS 实现，非真实权限
- 归档/登记回款/标记 waived 仅改变 UI 状态
- 按提供方完成率为静态分组数据
