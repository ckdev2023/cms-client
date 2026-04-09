# 案件详情页原型 -> 生产代码迁移映射

> 本文档定义 `packages/prototype/admin/case/detail.html` 中各 section、data、script 到真实代码的映射关系。
>
> 生产代码遵循仓库现有的四层架构：`domain -> data -> features/{model,ui} -> shared`。
> 现有锚点包括：
>
> - `packages/mobile/src/domain/case/Case.ts`
> - `packages/mobile/src/domain/case/CaseRepository.ts`
> - `packages/mobile/src/data/case/CaseApi.ts`
> - `packages/mobile/src/data/case/createCaseRepository.ts`
> - `packages/mobile/src/features/case/model/useCaseListViewModel.ts`
> - `packages/mobile/src/features/case/ui/CaseDetailScreen.tsx`（预留）

---

## 1 Domain 层映射

原型 `data/case-detail-config.js` 中的示例数据与配置，迁移为 `domain/case/` 下的纯 TypeScript 模块。

### 1.1 实体与值类型

| 原型来源 | 生产文件 | 导出 | 说明 |
|---------|---------|------|------|
| Header 区（案件标题/编号/阶段/负责人/管辖机构） | `domain/case/Case.ts` | `CaseDetail` | 扩展现有 `Case` 类型，覆盖详情展示所需字段 |
| 概览 summary card | `domain/case/Case.ts` | `CaseDetailSummary` | 阶段/截止日/完成率/财务状况 |
| 按提供方完成率 | `domain/case/Case.ts` | `ProviderProgress` | 每个提供方的已通过/总数 |
| 资料清单 Tab | `domain/case/DocumentRequirement.ts` | `DocumentRequirement` | 7 种状态、提供方、催办时间、waived 原因 |
| 校验报告 | `domain/case/ValidationRun.ts` | `ValidationRun`, `ValidationItem` | 硬性/软性分层、Gate 归属、修复建议、责任人 |
| 复核记录 | `domain/case/ReviewRecord.ts` | `ReviewRecord` | 复核人/时间/结论/驳回原因 |
| 提交包 | `domain/case/SubmissionPackage.ts` | `SubmissionPackage` | 日期/回执/锁定版本/补正关联 |
| 补正包 | `domain/case/SubmissionPackage.ts` | `CorrectionPackage` | 关联原提交包/对比 |
| 欠款风险确认 | `domain/case/RiskConfirmation.ts` | `RiskConfirmation` | 确认人/原因/凭证/时间 |
| 日志 | `domain/case/AuditLog.ts` | `AuditLogEntry` | 操作/审核/状态变更三分类 |
| 文书 | `domain/case/Document.ts` | `CaseDocument`, `DocumentVersion` | 模板/生成记录/版本/导出 |
| 任务 | `domain/task/Task.ts` | `Task` | 复用现有任务模型 |
| 期限 | `domain/case/CaseDeadline.ts` | `CaseDeadline` | 4 种期限类型 |
| 收费 | `domain/billing/BillingPlan.ts` | `BillingNode`, `PaymentRecord` | 节点/回款 |
| 沟通记录 | `domain/case/Communication.ts` | `CommunicationRecord` | 时间线/主题/摘要 |
| 样本场景 | N/A（测试 fixtures） | — | 原型样本转为测试 fixture |

### 1.2 仓库接口

| 原型来源 | 生产文件 | 导出 | 说明 |
|---------|---------|------|------|
| 详情页加载 | `domain/case/CaseRepository.ts` | `getCaseDetail(caseId)` | 返回 `CaseDetail` |
| 资料清单（含按提供方分组） | `domain/case/CaseRepository.ts` | `getDocumentRequirements(caseId)` | 返回分组列表 |
| 标记 waived | `domain/case/CaseRepository.ts` | `markDocumentWaived(requirementId, reason)` | 更新状态 + 审计 |
| 校验报告 | `domain/case/CaseRepository.ts` | `getLatestValidation(caseId)` | 返回 `ValidationRun` |
| 提交包列表 | `domain/case/CaseRepository.ts` | `getSubmissionPackages(caseId)` | 含补正包关联 |
| 风险确认 | `domain/case/CaseRepository.ts` | `submitRiskConfirmation(caseId, confirmation)` | 留痕 |
| 日志 | `domain/case/CaseRepository.ts` | `getAuditLogs(caseId, category?)` | 支持三分类筛选 |
| 推进阶段 | `domain/case/CaseRepository.ts` | `advanceStage(caseId)` | 触发 Gate |
| 归档 | `domain/case/CaseRepository.ts` | `archiveCase(caseId)` | S9 + 全量快照 |
| 登记回款 | `domain/billing/BillingRepository.ts` | `recordPayment(nodeId, amount)` | 写入 PaymentRecord |

---

## 2 Data 层映射

| 原型来源 | 生产文件 | 导出 | 说明 |
|---------|---------|------|------|
| `data/case-detail-config.js` 中的样本数据 | `data/case/CaseApi.ts` | `createCaseApi(deps)` | 详情、资料、校验、提交包等接口 |
| 样本切换 | N/A | — | 原型逻辑，生产由 API 返回真实数据 |
| 静态阶段/状态映射 | `domain/case/caseConstants.ts` | 枚举常量 | 状态文案、样式映射 |
| Tab 切换 | N/A | — | 生产由路由或 Tab 组件处理 |

### App Container

当前 `caseRepository` 已在 app container 中使用。详情页扩展的仓库方法继续在现有依赖注入链上扩充，无需新增 feature 到 feature 的直连。

---

## 3 Features 层映射（model）

### 3.1 `scripts/case-detail-page.js` -> `useCaseDetailViewModel`

原型当前把多个能力域集中在一个脚本中。生产实现优先落入 `features/case/model/useCaseDetailViewModel.ts`，必要时再抽辅助 hooks。

| 原型行为 | 生产 Hook 暴露 |
|---------|---------------|
| 页面首次加载 | `useEffect` 拉取详情 |
| Tab 切换 | `activeTab`, `setActiveTab()` |
| 样本切换 | N/A（生产无此概念） |
| Summary card 更新 | `summary` derived state |
| 按提供方完成率 | `providerProgress` derived state |
| 只读控制（S9） | `isReadonly` derived state |
| 校验报告 | `latestValidation` state |
| 提交包列表 | `submissionPackages` state |
| 风险确认弹窗 | `riskConfirmModalOpen`, `submitRiskConfirmation()` |
| 日志分类筛选 | `logCategory`, `setLogCategory()`, `filteredLogs` |
| 推进阶段 | `advanceStage()` |
| 归档 | `archiveCase()` |
| 标记 waived | `markWaived(requirementId, reason)` |
| 登记回款 | `recordPayment(nodeId, amount)` |
| toast | `toastState` 或 `useToast()` 组合 |

### 3.2 可选细拆方向

如 `useCaseDetailViewModel` 体积增长过快，可进一步拆：

- `useCaseDetailOverview` — 概览 summary、按提供方完成率
- `useCaseDocumentList` — 资料清单筛选、分组、waived 操作
- `useCaseValidation` — 校验报告、提交包、补正包
- `useCaseBilling` — 收费统计、登记回款
- `useCaseAuditLog` — 日志分类筛选

这些拆分都应由 `useCaseDetailViewModel` 编排，而不是让 UI 组件直接依赖 data 层。

---

## 4 Features 层映射（ui）

### 4.1 页面组件总览

| 原型 section | 生产组件 | 所在路径 | 说明 |
|-------------|---------|---------|------|
| `sections/detail-header.html` | `CaseDetailHeader` | `features/case/ui/` | 案件标题、阶段 badge、操作栏 |
| `sections/detail-tabs.html` | `CaseDetailTabs` | `features/case/ui/` | 10-Tab 导航 |
| `sections/detail-overview.html` | `CaseDetailOverview` | `features/case/ui/` | 4 卡 + 进度 + 摘要 + 时间线 |
| `sections/detail-info.html` | `CaseDetailInfo` | `features/case/ui/` | 基础信息表单 |
| `sections/detail-documents.html` | `CaseDetailDocuments` | `features/case/ui/` | 资料清单（分组 + waived） |
| `sections/detail-messages.html` | `CaseDetailMessages` | `features/case/ui/` | 沟通记录 |
| `sections/detail-forms.html` | `CaseDetailForms` | `features/case/ui/` | 文書 |
| `sections/detail-tasks.html` | `CaseDetailTasks` | `features/case/ui/` | 任务 |
| `sections/detail-deadlines.html` | `CaseDetailDeadlines` | `features/case/ui/` | 期限 |
| `sections/detail-validation.html` | `CaseDetailValidation` | `features/case/ui/` | 校验与提交 |
| `sections/detail-billing.html` | `CaseDetailBilling` | `features/case/ui/` | 收费 |
| `sections/detail-log.html` | `CaseDetailLog` | `features/case/ui/` | 日志 |
| `sections/detail-readonly-banner.html` | `CaseReadonlyBanner` | `features/case/ui/` | S9 横幅 |
| `sections/detail-risk-confirmation.html` | `RiskConfirmationModal` | `features/case/ui/` | 风险确认弹窗 |
| `detail.html` 整页组装 | `CaseDetailScreen` | `features/case/ui/CaseDetailScreen.tsx` | 页面入口 |

### 4.2 DOM 钩子到组件 Props 的对照

| 原型 DOM 钩子 | 组件 Props / 事件 |
|--------------|-------------------|
| `data-tab` | `CaseDetailTabs.onTabChange(tabId)` |
| `tab-{id}` | 各 Tab 组件的 `visible` prop |
| `caseSampleSelect` | N/A（生产无样本概念） |
| `readonlyBanner` | `CaseReadonlyBanner.visible` |
| `riskConfirmModal` | `RiskConfirmationModal.open`, `onConfirm`, `onCancel` |
| `providerProgress` | `CaseDetailOverview.providerProgress` + expand/collapse |
| `logCategoryFilter` | `CaseDetailLog.category`, `onCategoryChange()` |
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
| modal 壳（风险确认弹窗） | `shared/ui/Modal` | modal 基础壳复用，内容属于案件业务 |

---

## 6 完整文件树总览（建议形态）

```
packages/mobile/src/
├── domain/case/
│   ├── Case.ts                        ← CaseDetail, CaseDetailSummary, ProviderProgress
│   ├── CaseRepository.ts             ← getCaseDetail, getDocumentRequirements, ...
│   ├── DocumentRequirement.ts        ← 资料项实体与 7 种状态
│   ├── ValidationRun.ts              ← 校验报告与 Gate 归属
│   ├── ReviewRecord.ts               ← 复核记录
│   ├── SubmissionPackage.ts          ← 提交包与补正包
│   ├── RiskConfirmation.ts           ← 欠款风险确认
│   ├── AuditLog.ts                   ← 审计日志三分类
│   ├── CaseDeadline.ts              ← 4 种期限
│   ├── Communication.ts             ← 沟通记录
│   └── caseConstants.ts             ← 阶段枚举、状态映射
├── domain/billing/
│   ├── BillingPlan.ts               ← 收费节点
│   └── BillingRepository.ts         ← recordPayment
├── data/case/
│   ├── CaseApi.ts                    ← 扩展详情相关 API
│   └── createCaseRepository.ts       ← 扩展详情相关方法
├── features/case/
│   ├── model/
│   │   ├── useCaseDetailViewModel.ts
│   │   ├── useCaseDetailOverview.ts     ← 可选拆分
│   │   ├── useCaseDocumentList.ts       ← 可选拆分
│   │   ├── useCaseValidation.ts         ← 可选拆分
│   │   ├── useCaseBilling.ts            ← 可选拆分
│   │   └── useCaseAuditLog.ts           ← 可选拆分
│   └── ui/
│       ├── CaseDetailScreen.tsx
│       ├── CaseDetailHeader.tsx
│       ├── CaseDetailTabs.tsx
│       ├── CaseDetailOverview.tsx
│       ├── CaseDetailInfo.tsx
│       ├── CaseDetailDocuments.tsx
│       ├── CaseDetailMessages.tsx
│       ├── CaseDetailForms.tsx
│       ├── CaseDetailTasks.tsx
│       ├── CaseDetailDeadlines.tsx
│       ├── CaseDetailValidation.tsx
│       ├── CaseDetailBilling.tsx
│       ├── CaseDetailLog.tsx
│       ├── CaseReadonlyBanner.tsx
│       └── RiskConfirmationModal.tsx
└── shared/
    ├── ui/
    │   ├── AppShell.tsx
    │   ├── Toast.tsx
    │   └── Modal.tsx
    └── hooks/
        └── useMobileNav.ts
```

---

## 7 迁移顺序建议

| 阶段 | 范围 | 前置条件 |
|------|------|---------|
| M1 | 扩展 `domain/case` 的详情实体：`CaseDetail`、`DocumentRequirement`、`ValidationRun`、`SubmissionPackage`、`AuditLog`、`CaseDeadline` | 无 |
| M2 | 扩展 `CaseApi` / `createCaseRepository` 支持详情查询、资料清单、校验、提交包 | M1 |
| M3 | 实现 `useCaseDetailViewModel` 管理 Tab、summary、只读、校验、风险确认 | M1 + M2 |
| M4 | 从 `CaseDetailScreen` 拆出各 Tab 子组件 | M3 |
| M5 | 接入补正包对比、风险确认弹窗、归档流程等深度能力 | M4 |
| M6 | 扩展 `BillingRepository` 支持收费详情与登记回款 | M1 |

---

## 8 原型 -> 生产差异备忘

| 原型行为 | 生产变化 | 原因 |
|---------|---------|------|
| `window.CaseDetailConfig` 全局配置 | TS 常量 + DI | 类型安全与可测试 |
| 样本切换 select | 路由参数 `caseId` 查询真实数据 | 替代硬编码样本 |
| Tab 切换 DOM 显示/隐藏 | Tab 组件 + 懒加载 | 性能与路由联动 |
| S9 只读 CSS disabled | 权限 + 状态驱动的字段禁用 | 真实权限控制 |
| 风险确认弹窗 demo-only | 真实 `submitRiskConfirmation()` | 落库 + 审计 |
| 日志三分类筛选 | 服务端分类查询 | 真实日志数据 |
| 按提供方完成率静态数据 | 服务端聚合计算 | 真实统计 |
| 归档按钮 demo-only | 真实 `archiveCase()` + S9 快照 | 不可逆操作 |
| 标记 waived demo-only | 真实 `markDocumentWaived()` + 审计 | 留痕要求 |
| 登记回款 demo-only | 真实 `recordPayment()` | 财务操作 |
