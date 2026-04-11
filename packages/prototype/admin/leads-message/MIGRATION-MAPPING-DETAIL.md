# 咨询线索详情页原型 → 生产代码迁移映射

> 本文档定义 `packages/prototype/admin/leads-message/detail.html` 中各 section、data、script 到真实代码的映射关系。
>
> 生产代码遵循仓库现有的四层架构：`domain -> data -> features/{model,ui} -> shared`。
> 当前仓库中尚无 lead 相关的生产代码，本文列出的生产路径均为首次创建。
>
> 列表页映射见 [MIGRATION-MAPPING.md](./MIGRATION-MAPPING.md)。

---

## 1 Domain 层映射

原型 `data/leads-detail-config.js` 中的示例数据与配置，迁移为 `domain/lead/` 下的纯 TypeScript 模块。

### 1.1 实体与值类型

| 原型来源 | 生产文件 | 导出 | 说明 |
|---------|---------|------|------|
| Header 区（标题/编号/状态/负责人/Group） | `domain/lead/Lead.ts` | `LeadDetail` | 扩展 `LeadSummary` 覆盖详情展示所需字段 |
| 基础信息 Tab（8 字段） | `domain/lead/Lead.ts` | `LeadDetail` | 编号/姓名/电话/邮箱/来源/业务类型/Group/负责人/备注 |
| 跟进记录 Tab | `domain/lead/FollowUp.ts` | `FollowUpRecord` | 渠道/摘要/结论/下一步/跟进时间/一键转任务 |
| 渠道定义 | `domain/lead/leadConstants.ts` | `FollowUpChannel`, `CHANNEL_META` | 电话/邮件/面谈/IM 枚举 + 配色 |
| 新增跟进记录表单 | `domain/lead/FollowUp.ts` | `CreateFollowUpInput` | 渠道/摘要/结论/下一步/下次跟进时间 |
| 去重匹配面板 | `domain/lead/LeadDedupService.ts` | `DedupMatch`, `DedupResult` | 复用列表页去重类型 |
| 转化信息 | `domain/lead/LeadConversion.ts` | `LeadConversion` | 转化目标（Customer/Case）、时间、ID |
| 转客户入参 | `domain/lead/LeadConversion.ts` | `ConvertToCustomerInput` | Group 继承、改组原因 |
| 转案件入参 | `domain/lead/LeadConversion.ts` | `ConvertToCaseInput` | 案件类型、主申请人预填、负责人 |
| 变更日志 | `domain/lead/LeadAuditLog.ts` | `LeadAuditLogEntry` | 操作类型/变更前后值/操作人/时间 |
| 日志三分类 | `domain/lead/leadConstants.ts` | `LogCategory` | 状态变更/人员变更/Group 变更 |
| Header 按钮状态矩阵 | `domain/lead/leadConstants.ts` | `HEADER_BUTTON_MATRIX` | 各状态下按钮可见/禁用/高亮 |
| 样本场景 | N/A（测试 fixtures） | — | 原型样本转为测试 fixture |

### 1.2 仓库接口

| 原型来源 | 生产文件 | 导出 | 说明 |
|---------|---------|------|------|
| 详情页加载 | `domain/lead/LeadRepository.ts` | `getLeadDetail(leadId)` | 返回 `LeadDetail` |
| 跟进记录列表 | `domain/lead/LeadRepository.ts` | `getFollowUps(leadId)` | 返回 `FollowUpRecord[]` |
| 新增跟进记录 | `domain/lead/LeadRepository.ts` | `createFollowUp(leadId, input)` | 写入 + 审计 |
| 一键转任务 | `domain/lead/LeadRepository.ts` | `convertFollowUpToTask(followUpId)` | 创建任务 + 关联 |
| 去重匹配 | `domain/lead/LeadRepository.ts` | `checkDuplicate(phone?, email?)` | 复用列表页接口 |
| 转客户 | `domain/lead/LeadRepository.ts` | `convertToCustomer(leadId, input)` | 创建 Customer + 更新线索状态 |
| 转案件 | `domain/lead/LeadRepository.ts` | `convertToCase(leadId, input)` | 创建 Case + 更新线索状态 |
| 标记流失 | `domain/lead/LeadRepository.ts` | `markLost(leadId, reason?)` | 状态流转 + 审计 |
| 变更日志 | `domain/lead/LeadRepository.ts` | `getAuditLogs(leadId, category?)` | 支持三分类筛选 |
| 编辑基础信息 | `domain/lead/LeadRepository.ts` | `updateLead(leadId, input)` | 更新字段 + 审计 |

### 1.3 `REQ-P0-01` 转化冻结数据契约

> 目标：把“去重命中仅提示、不自动复用；继续创建需确认并留痕”的口径，直接冻结到转化输入与审计落点中。

| 主题 | 最小字段 / 约束 | 生产落点 |
|------|----------------|---------|
| 去重结果快照 | `matchType`（`lead` / `customer`）、`matchedEntityId`、`matchedGroup` | `DedupResult` |
| 默认处置 | `strategy = warn_and_continue`；`systemAction = no_auto_reuse` | `LeadDedupService` / ViewModel derived state |
| 继续创建确认 | `confirmedBy`、`confirmedAt`、`continueReason` | `ConvertToCustomerInput.dedupOverride` |
| 转客户承接 | `sourceLeadId`、`group = lead.group`；如改组则 `groupOverrideReason` 必填 | `ConvertToCustomerInput` |
| 转案件承接 | `sourceLeadId`、`customerId`、`primaryApplicantCustomerId = customerId`、`group = customer.group` | `ConvertToCaseInput` |
| 留痕事件 | `lead.convert.customer`、`lead.convert.customer.duplicate_override`、`lead.convert.case` | `LeadAuditLogEntry` + timeline/audit infra |

- `convertToCustomer()` 仅在人工确认后创建新 Customer，不自动合并、也不自动复用已有 Customer。
- `convertToCase()` 的前置条件是：已确定本次转化使用的 `customerId`；若来自刚转化的 Customer，则直接承接该 ID。

建议文件扩展：

```text
domain/lead/
├── Lead.ts                    ← 扩展 LeadDetail
├── LeadRepository.ts          ← 扩展详情相关方法
├── FollowUp.ts                ← FollowUpRecord, CreateFollowUpInput
├── LeadConversion.ts          ← LeadConversion, ConvertToCustomerInput, ConvertToCaseInput
├── LeadAuditLog.ts            ← LeadAuditLogEntry
├── LeadDedupService.ts        ← 复用
├── LeadStatusMachine.ts       ← 状态流转规则（可选）
└── leadConstants.ts           ← 扩展 FollowUpChannel, LogCategory, HEADER_BUTTON_MATRIX
```

---

## 2 Data 层映射

| 原型来源 | 生产文件 | 导出 | 说明 |
|---------|---------|------|------|
| `data/leads-detail-config.js` 中的样本数据 | `data/lead/LeadApi.ts` | `createLeadApi(deps)` | 详情、跟进、转化、日志等接口 |
| 样本切换 | N/A | — | 原型逻辑，生产由 API 返回真实数据 |
| 静态状态/渠道映射 | `domain/lead/leadConstants.ts` | 枚举常量 | 状态文案、渠道配色 |
| Tab 切换 | N/A | — | 生产由路由或 Tab 组件处理 |

### App Container

`leadRepository` 沿用列表页注入的同一实例。详情页扩展的仓库方法继续在现有依赖注入链上扩充，无需新增 feature 到 feature 的直连。转客户需调用 `customerRepository`，转案件需调用 `caseRepository`，均通过 app container 获取。

---

## 3 Features 层映射（model）

### 3.1 `scripts/leads-detail-page.js` → `useLeadDetailViewModel`

原型当前把多个能力域集中在一个脚本中。生产实现优先落入 `features/lead/model/useLeadDetailViewModel.ts`，必要时再抽辅助 hooks。

| 原型行为 | 生产 Hook 暴露 |
|---------|---------------|
| 页面首次加载 | `useEffect` 拉取详情 |
| Tab 切换 | `activeTab`, `setActiveTab()` |
| 样本切换 | N/A（生产无此概念） |
| Header 按钮状态矩阵 | `headerButtons` derived state |
| 只读控制（已流失态） | `isReadonly` derived state |
| Warning 控制（已签约未转化态） | `showWarningBanner` derived state |
| 基础信息展示 | `leadDetail` state |
| 编辑基础信息 | `updateLead()` |
| 跟进记录列表 | `followUps` state |
| 新增跟进记录 | `createFollowUp(input)` |
| 一键转任务 | `convertToTask(followUpId)` |
| 去重匹配 | `dedupResult` state |
| 转客户 | `convertToCustomer(input)` |
| 转案件 | `convertToCase(input)` |
| 标记流失 | `markLost()` |
| 日志列表 | `auditLogs` state |
| 日志分类筛选 | `logCategory`, `setLogCategory()`, `filteredLogs` |
| toast | `toastState` 或 `useToast()` 组合 |

### 3.2 可选细拆方向

如 `useLeadDetailViewModel` 体积增长过快，可进一步拆：

- `useLeadFollowups` — 跟进记录列表、新增、一键转任务
- `useLeadConversion` — 去重匹配、转客户、转案件、转化后展示
- `useLeadLog` — 日志列表、分类筛选

这些拆分都应由 `useLeadDetailViewModel` 编排，而不是让 UI 组件直接依赖 data 层。

---

## 4 Features 层映射（ui）

### 4.1 页面组件总览

| 原型 section | 生产组件 | 所在路径 | 说明 |
|-------------|---------|---------|------|
| `sections/detail-header.html` | `LeadDetailHeader` | `features/lead/ui/` | 面包屑、标题、状态 badge、操作按钮组 |
| `sections/detail-tabs.html` | `LeadDetailTabs` | `features/lead/ui/` | 4-Tab 导航 |
| `sections/detail-info.html` | `LeadInfoTab` | `features/lead/ui/` | 基础信息 8 字段 + 编辑入口 |
| `sections/detail-followups.html` | `LeadFollowupsTab` + `FollowupTimeline` + `FollowupForm` | `features/lead/ui/` | 跟进时间线 + 新增表单 + 一键转任务 |
| `sections/detail-conversion.html` | `LeadConversionTab` + `DedupPanel` + `ConversionCard` | `features/lead/ui/` | 去重面板 + 转化入口 + 已转化展示 |
| `sections/detail-convert-modals.html` | `ConversionModal` | `features/lead/ui/` | 转客户 / 转案件确认弹窗 |
| `sections/detail-toast.html` | `Toast` | `shared/ui/` | 跟进/转化/状态变更反馈 |
| `sections/detail-log.html` | `LeadLogTab` + `LogTimeline` | `features/lead/ui/` | 三分类筛选 + 变更时间线 |
| `sections/detail-readonly-banner.html` | `ReadonlyBanner` | `shared/ui/`（可泛化） | 已流失态横幅 |
| `sections/detail-warning-banner.html` | `WarningBanner` | `shared/ui/`（可泛化） | 已签约未转化态横幅 |
| `detail.html` 整页组装 | `LeadDetailScreen` | `features/lead/ui/LeadDetailScreen.tsx` | 页面入口 |

### 4.2 DOM 钩子到组件 Props 的对照

| 原型 DOM 钩子 | 组件 Props / 事件 |
|--------------|-------------------|
| `data-tab` | `LeadDetailTabs.onTabChange(tabId)` |
| `tab-{id}` | 各 Tab 组件的 `visible` prop |
| `leadSampleSelect` | N/A（生产无样本概念） |
| `readonlyBanner` | `ReadonlyBanner.visible` |
| `warningBanner` | `WarningBanner.visible`, `onAction` |
| `followupTimeline` | `FollowupTimeline.items` |
| `followupForm` | `FollowupForm.onSubmit(input)` |
| `conversionPanel` | `LeadConversionTab.conversions` |
| `dedupPanel` | `DedupPanel.match`, `onContinue`, `onView` |
| `logCategoryFilter` | `LeadLogTab.category`, `onCategoryChange()` |
| `toastTitle` / `toastDesc` | `Toast.title` / `Toast.description` |

---

## 5 Shared 层映射

| 原型来源 | 生产去向 | 说明 |
|---------|---------|------|
| `shared/styles/tokens.css` | shared theme / design tokens | 已是统一 token 来源 |
| `shared/styles/components.css` | shared UI components | 按钮、卡片、表格、modal、toast |
| `shared/styles/shell.css` | `AppShell` / 导航壳层样式 | 已被多页复用 |
| `shared/scripts/mobile-nav.js` | `shared/hooks/useMobileNav.ts` | 生产中应由状态驱动 |
| `shared/scripts/navigate.js` | 导航框架 | React Navigation 或现有导航层替代 |
| toast HTML | `shared/ui/Toast` | 可在多模块复用 |
| modal 壳（转化弹窗） | `shared/ui/Modal` | modal 基础壳复用，内容属于线索业务 |
| readonly banner | `shared/ui/ReadonlyBanner` | 可泛化为通用只读横幅（案件 S9 归档也需要） |
| warning banner | `shared/ui/WarningBanner` | 可泛化为通用 warning 横幅 |

---

## 6 完整文件树总览（建议形态）

```text
packages/mobile/src/
├── domain/lead/
│   ├── Lead.ts                        ← LeadDetail（扩展 LeadSummary）
│   ├── LeadRepository.ts             ← getLeadDetail, getFollowUps, convertToCustomer, ...
│   ├── FollowUp.ts                   ← FollowUpRecord, CreateFollowUpInput
│   ├── LeadConversion.ts             ← LeadConversion, ConvertToCustomerInput, ConvertToCaseInput
│   ├── LeadAuditLog.ts               ← LeadAuditLogEntry
│   ├── LeadDedupService.ts           ← DedupMatch, DedupResult
│   ├── LeadStatusMachine.ts          ← 状态流转规则（可选）
│   └── leadConstants.ts              ← LeadStatus, FollowUpChannel, LogCategory, HEADER_BUTTON_MATRIX
├── data/lead/
│   ├── LeadApi.ts                     ← 扩展详情、跟进、转化、日志 API
│   └── createLeadRepository.ts        ← 扩展详情相关方法
├── features/lead/
│   ├── model/
│   │   ├── useLeadDetailViewModel.ts
│   │   ├── useLeadFollowups.ts          ← 可选拆分
│   │   ├── useLeadConversion.ts         ← 可选拆分
│   │   └── useLeadLog.ts               ← 可选拆分
│   └── ui/
│       ├── LeadDetailScreen.tsx
│       ├── LeadDetailHeader.tsx
│       ├── LeadDetailTabs.tsx
│       ├── LeadInfoTab.tsx
│       ├── LeadFollowupsTab.tsx
│       ├── FollowupTimeline.tsx
│       ├── FollowupForm.tsx
│       ├── LeadConversionTab.tsx
│       ├── DedupPanel.tsx
│       ├── ConversionCard.tsx
│       ├── ConversionModal.tsx
│       ├── LeadLogTab.tsx
│       └── LogTimeline.tsx
└── shared/
    ├── ui/
    │   ├── AppShell.tsx
    │   ├── Toast.tsx
    │   ├── Modal.tsx
    │   ├── ReadonlyBanner.tsx             ← 可泛化
    │   └── WarningBanner.tsx              ← 可泛化
    └── hooks/
        └── useMobileNav.ts
```

---

## 7 迁移顺序建议

| 阶段 | 范围 | 前置条件 |
|------|------|---------|
| M1 | 扩展 `domain/lead/` 详情实体：`LeadDetail`、`FollowUp`、`LeadConversion`、`LeadAuditLog` | 列表页 M1 |
| M2 | 扩展 `LeadApi` / `createLeadRepository` 支持详情、跟进、转化、日志 | M1 |
| M3 | 实现 `useLeadDetailViewModel` 管理 Tab、Header 状态矩阵、只读/Warning 控制 | M1 + M2 |
| M4 | 从 `LeadDetailScreen` 拆出 4 个 Tab 子组件 + header + banners | M3 |
| M5 | 接入真实转化链路（`customerRepository.create` + `caseRepository.create`） | M4 |
| M6 | 接入真实去重服务与审计日志 | M5 |

---

## 8 原型 → 生产差异备忘

| 原型行为 | 生产变化 | 原因 |
|---------|---------|------|
| `window.LeadsDetailConfig` 全局配置 | TS 常量 + DI | 类型安全与可测试 |
| 样本切换 select | 路由参数 `leadId` 查询真实数据 | 替代硬编码样本 |
| Tab 切换 DOM 显示/隐藏 | Tab 组件 + 懒加载 | 性能与路由联动 |
| 已流失只读 CSS disabled | 权限 + 状态驱动的字段禁用 | 真实权限控制 |
| 跟进录入 demo-only 表单 | 真实 `createFollowUp()` | 落库 + 审计 |
| 一键转任务 demo-only | 真实 `convertFollowUpToTask()` | 创建任务 + 关联 |
| 转客户/转案件 demo-only 弹窗 | 真实 `convertToCustomer()` / `convertToCase()` | 落库 + 状态流转 |
| 去重按预设样例展示 | 服务端匹配 | 真实数据库匹配 |
| 日志静态 JS 配置 | 服务端审计日志 | 真实审计 |
| 状态变更通过样本切换 | 真实状态机流转 | `LeadStatusMachine` |
| 编辑信息 demo-only toast | 真实 `updateLead()` | 落库 + 审计 |
| 标记流失 demo-only banner | 真实 `markLost()` | 状态流转 + 不可逆 |

---

## 9 旧入口与主导航风险（Deferred）

| 风险项 | 当前状态 | 缓解措施 |
|--------|---------|---------|
| 旧 `leads-messages.html` 与新模块并存 | 旧页面无独立详情页（仅右侧会话面板） | 本轮不改旧入口；后续导航统一任务处理重定向/下线 |
| 主导航（侧边栏/Topbar）未统一改为新路径 | 其他页面的侧边栏仍指向 `leads-messages.html` | 新模块自身导航正确；全局统一后续处理 |
| 旧页面 chat 布局与新详情页时间线布局差异大 | 旧页右侧 chat bubble → 新页 Tab 2 跟进时间线 | SPLIT-ARCHITECTURE-DETAIL.md 中已记录对照关系 |
| 转化链路无真实数据写入 | demo-only 弹窗 + toast | 通过样本切换独立展示"已转化"场景 |
| 跟进记录与任务系统未真实联通 | demo-only 一键转任务 | toast + 文案说明 demo-only |
