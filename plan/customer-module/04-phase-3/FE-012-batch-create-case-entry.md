# FE-012：接通批量建案入口

## 目标

- 打通“关系场景 / 家族签场景”进入案件新建页的批量建案入口。
- 让案件新建页能识别批量模式，并尽量带入关联客户上下文。

## 依赖

- `FE-008` 已接通真实 relations 数据与回写。
- `FE-011` 已冻结单客户建案入口的 query / source context 口径。

## 当前现状

- `packages/admin/src/views/customers/CustomerDetailView.vue` 中 `@batch-create-case` 仍是空实现。
- `packages/admin/src/views/customers/components/CustomerContactsTab.vue` 已有批量建案按钮，但仍禁用。
- `packages/admin/src/views/cases/query.ts` 当前只识别 `customerId` + `#family-bulk`，尚未承接 relations 选中结果。
- `packages/admin/src/views/cases/model/useCreateCaseModel.ts` 已支持 `familyBulkMode` 与 `additionalParties`，但默认仍主要依赖 fixture 场景注入。

## 重点文件

- `packages/admin/src/views/customers/CustomerDetailView.vue`
- `packages/admin/src/views/customers/components/CustomerContactsTab.vue`
- `packages/admin/src/views/cases/query.ts`
- `packages/admin/src/views/cases/types-create.ts`
- `packages/admin/src/views/cases/model/useCreateCaseModel.ts`
- `packages/admin/src/views/cases/CaseCreateView.vue`

## 建议实施步骤

1. 先冻结批量建案来源上下文契约：至少明确 `customerId`、`familyBulkMode`，并决定是否扩展 selected relation IDs / related customer IDs。
2. 接通详情页头部批量建案入口，先保证可进入 family bulk 场景。
3. 接通 relations tab 的批量建案按钮，将当前选择的关联人上下文透传给创建页。
4. 在 create model 中消费批量上下文，优先复用真实关系数据而不是前端 fixture。
5. 为 query 解析、context seed、family bulk 初始数据补单测。

## 完成标准

- 从客户详情可进入批量建案场景，并带有 `familyBulkMode` 标记。
- 从 relations tab 选择关联人后，进入创建页可看到对应上下文被带入。
- 批量模式下 primary customer / additional parties 的来源口径清晰，不再完全依赖 fixture。

## 风险提示

- 若不先冻结批量上下文契约，`query.ts`、`types-create.ts`、`useCreateCaseModel.ts` 会各自长出一套参数。
- 若继续让 family bulk 只依赖 fixture seed，真实关系数据接通后仍要二次返工。