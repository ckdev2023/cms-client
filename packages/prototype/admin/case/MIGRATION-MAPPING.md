# 案件新建页原型 -> 生产代码迁移映射

> 本文档定义 `packages/prototype/admin/case/create.html` 中的 section、config、script 到未来生产代码的映射关系。

---

## 1 Domain 层映射

原型 `data/case-create-config.js` 中的声明式配置，迁移为 `domain/case/` 下的纯 TypeScript 模块。

| 原型来源 | 生产文件 | 导出 | 说明 |
|---------|---------|------|------|
| 模板定义 | `domain/case/caseTemplateConstants.ts` | `CASE_TEMPLATES` | 家族滞在 / 技人国模板、资料分组、默认动作 |
| 快速新建客户表单隐式结构 | `domain/case/CaseDraft.ts` | `CreateCaseCustomerInput` | 用于主申请人/关联人快速录入 |
| 建案表单隐式结构 | `domain/case/CaseDraft.ts` | `CreateCaseInput` | 模板、申请类型、Group、owner、dueDate、amount 等 |
| 家族批量模式 | `domain/case/CaseDraft.ts` | `FamilyBulkDraft` | 默认对象与关系绑定草稿 |

建议文件：

```text
domain/case/
├── CaseDraft.ts
├── CaseTemplateRepository.ts
└── caseTemplateConstants.ts
```

## 2 Data 层映射

| 原型来源 | 生产文件 | 导出 | 说明 |
|---------|---------|------|------|
| 静态模板 / 客户示例 | `data/case/CaseTemplateApi.ts` | `createCaseTemplateApi()` | 模板、可选客户、负责人来源改为真实接口 |
| 建案提交按钮 | `data/case/createCaseRepository.ts` | `createCaseRepository()` | 真实创建 Case、CaseParty、Checklist |
| 快速新建客户 modal | `data/customer/createCustomerRepository.ts` | 复用或扩展 | 原型中的快速新建最终落到客户仓库 |

### 2.1 `REQ-P0-01` Case 承接数据契约

> 目标：冻结从 Lead 转案件时，Case 侧如何承接刚创建的 Customer、主申请人与 Group。

| 主题 | 最小字段 / 约束 | 生产落点 |
|------|----------------|---------|
| 主申请人承接 | `primaryApplicantCustomerId` 默认取刚转化出的 `customerId` | `CreateCaseInput` |
| 来源链路 | `sourceLeadId`、`customerId` | `CreateCaseInput` / timeline payload |
| Group 继承 | `group` 默认取 `Customer.group` | 若改组则 `groupOverrideReason` 必填 |
| 快速新建客户去重 | 命中重复时仅提示，不自动复用；继续创建需二次确认并留痕 | `data/customer/createCustomerRepository.ts` + customer audit |
| 创建后留痕 | `case.created_from_lead_conversion`，并关联 `sourceLeadId`、`customerId` | `createCaseRepository()` timeline/audit |

- 对 AI 来说，建案链路的固定顺序应始终是：先确定 `customerId`，再创建 `Case`，不要反向推导主申请人。
- `CaseParty` 的主申请人记录应与 `primaryApplicantCustomerId` 保持同一来源，避免 UI 预填和数据落库不一致。

## 3 Model 层映射

| 原型脚本 | 生产 Hook | 职责 |
|---------|-----------|------|
| `scripts/case-create-page.js` | `features/case/model/useCreateCaseViewModel.ts` | 模板切换、stepper、可用态、汇总、提交 |
| `scripts/case-create-modal.js` | `features/case/model/useCasePartyPicker.ts` | 快速新建主申请人/关联人 modal |

推荐状态拆分：

```text
features/case/model/
├── useCreateCaseViewModel.ts
├── useCasePartyPicker.ts
├── useCreateCaseViewModel.test.ts
└── useCasePartyPicker.test.ts
```

## 4 UI 层映射

| 原型 section | 生产组件 | 所在层级 |
|-------------|---------|---------|
| `sections/create-header.html` | `CreateCaseHeader` | `features/case/ui` |
| `sections/create-stepper.html` | `CreateCaseStepper` | `features/case/ui` |
| `sections/business-form.html` | `CreateCaseBusinessForm` | `features/case/ui` |
| `sections/related-parties.html` | `CreateCasePartiesSection` | `features/case/ui` |
| `sections/assignment-review.html` | `CreateCaseAssignmentSection` + `CreateCaseReviewSection` | `features/case/ui` |
| `sections/customer-modal.html` | `CasePartyQuickCreateModal` | `features/case/ui` |
| `sections/toast.html` | `Toast` | `shared/ui` |
| `create.html` 整页组装 | `CreateCaseScreen` | `features/case/ui` |

## 5 Shared 层映射

| 原型来源 | 生产去向 | 说明 |
|---------|---------|------|
| `shared/styles/tokens.css` | 设计 token / theme | 颜色、圆角、阴影 |
| `shared/styles/components.css` | `shared/ui` 基础组件 | 按钮、输入框、card、toast、modal |
| `shared/styles/shell.css` | `AppShell` / `TopBar` / `SideNav` | 页面壳层 |
| `shared/scripts/mobile-nav.js` | `shared/hooks/useMobileNav.ts` | 移动端导航开关 |
| `shared/scripts/navigate.js` | 路由层 | 原型 `data-navigate` 在生产交给路由系统 |

## 6 迁移顺序建议

1. 先抽 `domain/case` 中的建案输入与模板常量
2. 再实现 `data/case` 的模板与创建仓库
3. 编写 `useCreateCaseViewModel`
4. 拆 `CreateCaseScreen` 与子组件
5. 最后把快速新建客户 modal 与真实客户仓库串起来

## 7 原型与生产差异

| 原型行为 | 生产变化 |
|---------|---------|
| `window.CaseCreateConfig` 全局配置 | 改为 TS 常量 + DI |
| `window.CaseCreatePageApi` 全局通信 | 改为 ViewModel state + props |
| 创建案件仅 banner/toast | 改为真实 `createCase()` 提交 |
| 资料模板 checkbox 静态展示 | 改为真实 checklist 草稿 |
| `#family-bulk` 仅切默认模板 | 改为真正的批量 Case 创建流程 |