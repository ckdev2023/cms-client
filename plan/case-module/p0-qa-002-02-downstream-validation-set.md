# P0 受影响下游验证集

> Task ID: `p0-qa-002-02-downstream-validation-set`
> 固化 `/api/cases`、customer related cases、documents/dashboard/shared panels 的受影响下游验证集。
> 当 cases 模块的 API 契约、adapter 字段、query contract 或深链协议发生变更时，必须回归以下验证集。

## 触发条件

以下任何变更都必须执行对应验证集：

| 变更类型 | 触发范围 |
|---------|---------|
| `/api/cases` response DTO 字段增删改 | 全部验证集 |
| `CaseAdapterMappers` list 字段映射变更 | VS-1、VS-2 |
| `CaseAdapterDetailAggregate` detail 字段映射变更 | VS-1、VS-3 |
| `query.ts` URL query contract 变更 | VS-1、VS-2、VS-3、VS-4 |
| `CaseAdapterReaders` search params 变更 | VS-1、VS-2 |
| case detail deep-link / tab query 变更 | VS-3、VS-4、VS-5 |
| `CaseRepository` 接口签名变更 | 全部验证集 |
| cases 路由路径变更 | VS-3、VS-4、VS-5 |

## VS-1: Cases 模块内部核心回归

变更 cases 模块自身时的基线回归，确保主链不回归。

### 测试文件

| 文件 | 验证重点 |
|------|---------|
| `cases/model/CaseAdapterReaders*.test.ts` | search params 序列化、路径构造 |
| `cases/model/CaseAdapterMappers*.test.ts` | list DTO → CaseListItem 字段映射 |
| `cases/model/CaseAdapterDetailAggregate*.test.ts` | detail aggregate 主链字段、空态、只读态 |
| `cases/model/CaseAdapterWriteBuilders*.test.ts` | write payload 序列化规则 |
| `cases/model/CaseAdapterMutationResults.test.ts` | mutation 结果映射 |
| `cases/model/CaseRepository*.test.ts` | repository 接线、错误分类 |
| `cases/model/CaseListContractIntegration.test.ts` | 跨层 pipeline 契约 |
| `cases/query*.test.ts` | URL query、tab schema、deep-link |

### 执行命令

```bash
npx vitest run src/views/cases/
```

## VS-2: Customer Related Cases 下游

customer 模块通过 `/api/cases?customerId=` 消费 cases list 契约。变更 list DTO、search params 或 adapter 映射时必须回归。

### 受影响源文件

| 文件 | 依赖的 cases 契约 |
|------|------------------|
| `customers/model/useCustomerCasesModel.ts` | `/api/cases?customerId=` 查询、`CaseListItem` 字段子集 |
| `customers/components/CustomerCasesTab.vue` | `useCustomerCasesModel` 返回值、案件列表渲染字段 |
| `customers/components/CustomerTableRow.vue` | cases 计数或链接 |
| `customers/CustomerDetailView.vue` | 关联案件 tab 渲染、建案入口 query |

### 测试文件

| 文件 | 验证重点 |
|------|---------|
| `customers/model/useCustomerCasesModel.test.ts` | 基础 composable 行为 |
| `customers/model/useCustomerCasesModel.focused.test.ts` | 过滤、排序、加载生命周期 |
| `customers/model/useCustomerCasesModel.query-contract.test.ts` | query 参数序列化与 cases 模块一致性 |
| `customers/model/useCustomerCasesModel.navigation-contract.test.ts` | 导航行为、路由跳转 |
| `customers/model/useCustomerCasesModel.customer-entry-regression.test.ts` | customer → case 入口回归 |
| `customers/model/CustomerCasesQueryContract.test.ts` | customer cases query 与 cases query 契约对齐 |
| `cases/model/CaseListSummaryDownstream.test.ts` | cases list 对 customer 下游的最小字段集保证 |

### 执行命令

```bash
npx vitest run src/views/customers/model/useCustomerCasesModel*.test.ts \
  src/views/customers/model/CustomerCasesQueryContract.test.ts \
  src/views/cases/model/CaseListSummaryDownstream.test.ts
```

## VS-3: Customer 建案联动下游

customer detail 中"一键建案 / 家族批量建案"跳转到 case create 的联动路径。变更 create query contract 或 customerId 处理时必须回归。

### 受影响源文件

| 文件 | 依赖的 cases 契约 |
|------|------------------|
| `customers/CustomerDetailView.vue` | 建案跳转 query |
| `customers/components/CustomerContactsTab.vue` | 家族批量建案入口 |
| `cases/model/useCreateCaseModel.ts` | `customerId` / family bulk source context |

### 测试文件

| 文件 | 验证重点 |
|------|---------|
| `customers/model/CustomerCreateCaseEntryContract.test.ts` | 建案入口 query 契约 |
| `customers/model/CustomerCreateCaseEntryRegression.test.ts` | customer → create 回归 |
| `cases/model/useCreateCaseModel.customer-defaults.test.ts` | customerId 默认值处理 |
| `cases/model/useCreateCaseModel.customer-entry-regression.test.ts` | customer 来源 create 回归 |
| `cases/query.family-entry-contract.test.ts` | family bulk query 契约 |

### 执行命令

```bash
npx vitest run src/views/customers/model/CustomerCreateCaseEntry*.test.ts \
  src/views/cases/model/useCreateCaseModel.customer*.test.ts \
  src/views/cases/query.family-entry-contract.test.ts
```

## VS-4: Documents 模块下游

documents 模块中引用 cases 路由或深链的组件。变更 cases 路由路径或 deep-link 协议时必须回归。

### 受影响源文件

| 文件 | 依赖的 cases 契约 |
|------|------------------|
| `documents/components/DocumentTableRow.vue` | 案件链接（指向 `/cases/:id`） |
| `documents/components/SharedExpiryRiskPanel.vue` | 案件关联展示、深链 |

### 测试文件

| 文件 | 验证重点 |
|------|---------|
| `cases/query.cross-module-link-contract.test.ts` | 跨模块链接契约 |
| `cases/query.cross-module-link-focused.test.ts` | 跨模块链接行为 |
| `cases/query.cross-module-regression.test.ts` | 跨模块链接回归 |

### 执行命令

```bash
npx vitest run src/views/cases/query.cross-module*.test.ts
```

## VS-5: Dashboard / Shared Panels 下游

dashboard 快速操作面板和共享面板引用 cases 路由或数据。变更 cases 路由路径或概要数据时必须回归。

### 受影响源文件

| 文件 | 依赖的 cases 契约 |
|------|------------------|
| `dashboard/QuickActionsPanel.vue` | 案件快速操作入口、路由链接 |

### 测试文件

| 文件 | 验证重点 |
|------|---------|
| `dashboard/QuickActionsPanel.test.ts` | 快速操作面板中案件入口链接 |
| `cases/query.deeplink-regression.test.ts` | 全站深链协议回归 |

### 执行命令

```bash
npx vitest run src/views/dashboard/QuickActionsPanel.test.ts \
  src/views/cases/query.deeplink-regression.test.ts
```

## 全量下游验证命令

当 cases API 契约或路由协议发生重大变更时，执行全量下游验证：

```bash
npx vitest run \
  src/views/cases/ \
  src/views/customers/model/useCustomerCasesModel*.test.ts \
  src/views/customers/model/CustomerCasesQueryContract.test.ts \
  src/views/customers/model/CustomerCreateCaseEntry*.test.ts \
  src/views/dashboard/QuickActionsPanel.test.ts
```

## 验证集维护规则

1. **只扩不缩**：新增 cases 下游消费者时，必须同步更新本文档，追加到对应 VS 或新建 VS。
2. **测试先行**：在受影响源文件列表中新增文件时，必须同时补充对应测试文件。
3. **触发条件同步**：变更 cases 公共接口签名时，必须更新顶部触发条件表。
4. **与 exit matrix 联动**：本文档定义"验什么"，`p0-qa-002-01-batch-exit-command-matrix.md` 定义"何时验"。
