# 客户模块 P0 / P1 深度分析与开发计划

## 拆分执行文档导航

- 总索引：`plan/customer-module/00-index.md`
- 分阶段原子执行文档：`plan/customer-module/01-phase-0-contract-and-modeling.md` ~ `plan/customer-module/06-phase-5-validation-and-guard.md`

> 生成日期：2026-04-20
> 范围：`packages/server/src/modules/core/customers`、`packages/server/src/modules/core/contact-persons`、`packages/admin/src/views/customers`、`packages/prototype/admin/customers`
> 目标：判断客户模块当前前后端实现是否满足 P0 / P1 业务需求，并形成可执行的开发计划与原子任务清单。

---

## 1. 结论摘要

### 1.1 总体判断

1. **P0 后端：部分满足**
   - 已具备客户主档 CRUD、去重检查、批量改负责人、批量改分组、软删除、Timeline 留痕等基础能力。
   - 但仍缺少 **P0 端到端闭环所需的详情聚合、关系模型、按 Group 可见范围、与案件/沟通/日志的稳定接口契约**。

2. **P0 前端：部分满足，但当前是“高保真壳子 + mock 数据”**
   - 列表页、详情页、Tab 结构与交互骨架较完整。
   - 但生产 `admin` 端仍主要依赖 `fixtures.ts`，列表/详情/关联案件/关联人/沟通/日志均未接真实 API，`一键建案/批量建案` 也未真正接通。

3. **P0 端到端：当前不满足**
   - 原因不是页面缺失，而是 **前后端契约未接通、关系人与详情聚合能力不完整、权限口径与业务规格仍有偏差**。

4. **P1 生产实现：当前不满足**
   - 经营管理签签约前承接链路（问卷 / 报价 / 签约 / 转正式案件）已在 `prototype` 中形成高仿真演示。
   - 但 `admin` 正式前端未迁移，`server` 也未提供 `bmvProfile` 持久化与推进动作接口，因此 **生产链路尚未落地**。

5. **P1 原型演示：满足“演示需求”，不满足“生产需求”**
   - 当前原型明确是 demo-only，本地持久化，不包含真实后端、真实问卷引擎、真实合同流。

### 1.2 推荐落地策略

1. **先闭 P0，再落 P1**。
2. **P0 优先补“真实数据流”和“权限/关系/详情聚合”**，不要先做视觉层优化。
3. **P1 采用最小可生产方案**：先把 `bmvProfile` 作为客户详情上的受控扩展字段落地，再决定是否拆为独立 intake 实体。
4. **CustomerRelation 不建议直接拿 `contact_persons` 硬顶替**；需要先做建模决策，否则前后端会继续错位。

---

## 2. 判定依据

### 2.1 权威文档依据

- `docs/gyoseishoshi_saas_md/P0/06-页面规格/客户.md`
  - P0 要求：个人客户主数据、关联人关系、一键/批量建案、基础搜索、关联案件只读概览、Group/负责人治理。
- `docs/gyoseishoshi_saas_md/P0/07-数据模型设计.md`
  - P0 角色定义：`Customer`、`CustomerRelation`、`Case`。
- `docs/gyoseishoshi_saas_md/P1/04-页面规格-客户经营管理签签约前承接.md`
  - P1 要求：在客户详情页承接经营管理签的问卷、报价、签约、转案件门禁链路。

### 2.2 代码依据

- 后端：
  - `packages/server/src/modules/core/customers/customers.service.ts`
  - `packages/server/src/modules/core/customers/customers.controller.ts`
  - `packages/server/src/modules/core/customers/customers.query.ts`
  - `packages/server/src/modules/core/auth/permissions.service.ts`
  - `packages/server/src/modules/core/contact-persons/contactPersons.service.ts`
- 前端：admin
  - `packages/admin/src/views/customers/fixtures.ts`
  - `packages/admin/src/views/customers/CustomerListView.vue`
  - `packages/admin/src/views/customers/CustomerDetailView.vue`
  - `packages/admin/src/views/customers/model/*`
  - `packages/admin/src/views/customers/types.ts`
- 原型：
  - `packages/prototype/admin/customers/scripts/customer-detail-basic.js`
  - `packages/prototype/admin/customers/scripts/customer-detail-relations.js`
  - `packages/prototype/admin/customers/sections/detail-content.html`

---

## 3. 当前实现盘点

### 3.1 Server 端现状

#### 已有能力

1. `CustomersService` 已实现：
   - `create / get / list / update / softDelete`
   - `checkDuplicates`
   - `bulkAssignOwner`
   - `bulkChangeGroup`
2. `CustomersController` 已暴露对应端点：
   - `POST /customers`
   - `GET /customers`
   - `POST /customers/check-duplicates`
   - `POST /customers/bulk-assign-owner`
   - `POST /customers/bulk-change-group`
   - `GET /customers/:id`
   - `PATCH /customers/:id`
   - `DELETE /customers/:id`
3. 查询层已支持：
   - 关键字搜索（姓名 / 假名 / 电话 / 邮箱）
   - 分组 / 负责人 / 活跃案件筛选
   - 去重比对（name / phone / email）
4. 已有单测：
   - `customers.service.test.ts`
   - `customers.controller.test.ts`

#### 缺口

1. `GET /customers` 与 `GET /customers/:id` 返回的仍是 **通用 Customer 实体**，不是页面直接可用的列表/详情 DTO。
2. **未提供客户详情所需聚合信息**：
   - 累计案件数 / 活跃案件数 / 已归档案件数
   - 关联案件名称摘要
   - 最近建案时间
   - 沟通记录 / 操作日志聚合
3. **权限口径未完整对齐 P0**：
   - `PermissionsService.canAccessCustomer` 当前仅支持 `manager` 或“本人是 owner/collaborator”。
   - P0 文档要求可见性同时受 **角色 × Group × 负责人/协作者** 约束。
4. `scope=group` 当前没有真正独立语义。
   - `buildCustomerListWhere()` 中 `appendScopeWhere()` 对 `mine` 与 `group` 没有区分，都会收敛为 owner/collaborator 范围。
5. **CustomerRelation 缺失**。
   - 文档定义的是 `from_customer_id / to_customer_id` 的客户间关系。
   - 现有后端只有 `contact_persons`，更接近联系人档案，不等价于 P0 的 `CustomerRelation`。
6. 未提供 P1 的 `bmvProfile` 持久化与推进动作接口。

### 3.2 Admin 端现状

#### 已有能力

1. 已有完整页面骨架：
   - 客户列表页
   - 客户详情页
   - 基础信息 / 关联案件 / 关联人 / 沟通记录 / 操作日志 Tab
2. 已有前端 model 拆分，方便替换数据源：
   - `useCustomerListModel`
   - `useCustomerDetailModel`
   - `useCustomerCasesModel`
   - `useCustomerContactsModel`
3. 已有局部单测，主要覆盖本地 model 与 fixture 行为。

#### 缺口

1. **数据源仍是 fixture**。
   - `CustomerListView.vue` 直接使用 `SAMPLE_CUSTOMERS`。
   - `useCustomerDetailModel` 直接读取 `SAMPLE_CUSTOMER_DETAILS`。
   - 关联案件 / 关联人 / 沟通 / 日志 Tab 都直接读取 fixture。
2. **没有 customer repository / api client / DTO adapter**。
3. **页面动作未接真实后端**：
   - 建档
   - 去重提示
   - 批量改负责人
   - 批量改分组
   - 详情保存
4. **`一键建案 / 批量建案` 仍未真正接通业务链路**。
   - 详情页 Header 中相关事件仍为占位实现。
5. `types.ts` 中 `CustomerDetail / CustomerSummary / CustomerRelation` 为页面理想结构，和 server 当前返回结构尚未建立稳定映射关系。
6. 正式前端尚未迁移 P1 承接卡片与门禁逻辑。

### 3.3 Prototype 端现状（P1 参考实现）

1. 已有 `bmvProfile` 演示模型：
   - `questionnaireStatus`
   - `quoteStatus`
   - `signStatus`
   - `intakeStatus`
   - `sourceLeadId / visaPlan / quoteAmount / nextStep`
2. 已实现问卷 → 报价 → 签约 → 开放建案的前端门禁链路。
3. 已实现动作后的本地沟通记录与日志沉淀。

#### 但其性质仍是原型

- 仅本地持久化
- 未接真实 API
- 未形成生产可复用的类型与契约

---

## 4. P0 / P1 满足度矩阵

| 能力 | 目标版本 | 当前状态 | 判定 | 主要依据 / 缺口 |
|---|---|---|---|---|
| 客户主档 CRUD | P0 | Server 已有；Admin 未接 API | 部分满足 | 后端能做，前端未形成真实闭环 |
| 基础搜索（姓名/假名/电话/邮箱） | P0 | Server 已支持；Admin 仅本地过滤 | 部分满足 | 真实搜索未从页面打到后端 |
| 去重提示 | P0 | Server 已支持；Admin 未接真实接口 | 部分满足 | `check-duplicates` 已有，但建档流程未接通 |
| 批量改负责人 | P0 | Server 已支持；Admin UI 未接通 | 部分满足 | 端点存在，前端动作仍停留在壳层 |
| 批量改分组 | P0 | Server 已支持；Admin UI 未接通 | 部分满足 | 同上 |
| 详情聚合（案件总量/活跃/归档/摘要） | P0 | Admin 有 mock；Server 无稳定聚合 DTO | 不满足 | 页面依赖 fixture，服务端未输出页面所需聚合结构 |
| 关联案件只读概览 | P0 | Admin 有 mock；Server 未接入 | 部分满足 | 视觉可用，真实数据流未闭环 |
| 一键建案 / 批量建案 | P0 | UI 有入口；正式链路未接通 | 不满足 | 当前仍是占位行为 |
| CustomerRelation 关系维护 | P0 | 原型 / 前端有概念；Server 缺少同构模型 | 不满足 | 文档要求 CustomerRelation，现有 `contact_persons` 不能直接等价 |
| 沟通记录 / 操作日志 | P0 | Admin 有 mock；Server 无客户详情聚合接口 | 不满足 | 页面存在但未接真实来源 |
| 访问控制（角色 × Group × owner/collaborator） | P0 | 后端仅实现部分 | 不满足 | `scope=group` 与 Group 可见规则未真正落地 |
| 经营管理签承接卡片 | P1 | 仅 prototype 有 | 不满足 | admin 正式端未迁移 |
| 问卷 / 报价 / 签约推进动作 | P1 | 仅 prototype 本地演示 | 不满足 | server 未提供动作接口 |
| 签约前建案门禁 | P1 | prototype 已演示；admin/server 未落地 | 不满足 | 生产环境无法保证门禁 |
| P1 动作后的沟通/日志留痕 | P1 | prototype 本地有；生产无 | 不满足 | 缺真实存储与查询 |

---

## 5. 关键问题与根因

### 5.1 最大问题不是“页面少”，而是“契约没闭环”

当前客户模块最核心的问题不是缺页面，而是：

1. **Server 返回的是通用实体，Admin 需要的是页面 DTO**。
2. **Admin 的页面结构已经按业务规格长出来了，但没有真实 repository / api / adapter 去接它。**
3. **原型里的 P1 逻辑停留在 demo 资产，尚未转成生产模型。**

### 5.2 Customer 与 CustomerDetail 的契约鸿沟

前端当前需要的数据包括：

- `customerNumber`
- `displayName / legalName / furigana`
- `owner.name / owner.initials`
- `group`
- `totalCases / activeCases / archivedCases`
- `caseNames`
- `lastContactDate / lastContactChannel`

而 server 当前 `Customer` 核心实体只有：

- `id / orgId / type / baseProfile / contacts / createdAt / updatedAt`

这意味着必须补一个 **DTO / mapper / assembler 层**，否则正式前端永远只能依赖 fixture。

### 5.3 Group 权限与列表 scope 存在业务偏差

P0 规格要求：

- 管理员：全所客户
- 主办人：本组 + 负责客户
- 助理：本组客户
- 可见性受角色 × Group × owner/collaborator 共同影响

当前实现问题：

1. `canAccessCustomer()` 不看 Group。
2. `scope=group` 没有真正按 Group 过滤。
3. 这会导致“可见范围”和“列表筛选范围”都与规格不完全一致。

### 5.4 关系人模型不一致

当前存在三套相近但不等价的概念：

1. **文档口径**：`CustomerRelation`（客户 ↔ 客户 关系映射）
2. **前端口径**：`CustomerRelation`（关系类型 + 电话/邮箱 + tags + note）
3. **后端现状**：`contact_persons`（联系人档案，挂在 customer/company 下）

如果不先定这一层，后续“关联人展示”“为关联人批量建案”“家族签聚合”都会继续出现前后端错位。

### 5.5 P1 缺的是“生产化迁移”，不是“原型设计”

P1 经营管理签签约前承接的页面结构和状态机在 prototype 中已经很清楚，缺的不是设计，而是：

1. 持久化位置
2. server 动作接口
3. admin 正式页面迁移
4. 与建案入口的门禁联动
5. 测试与验收口径

---

## 6. 推荐实施方案

### 6.1 P0 推荐方案

1. **不先大改 customers 表结构**。
   - 先在 server 增加 DTO 组装层，把 `base_profile + cases + timeline + contact_persons` 聚合成页面所需结构。
2. **优先补齐列表与详情真实接口**。
3. **修正 Group 权限与 scope 逻辑**。
4. **关系模型先做决策再开发**。

### 6.2 P1 推荐方案

1. **第一阶段采用最小可生产实现**：将 `bmvProfile` 作为客户详情的受控扩展字段落在客户侧（推荐先放入 `base_profile.bmvProfile`）。
2. 所有动作通过 server 写入 Timeline / Communication Log。
3. `admin` 从 prototype 迁移卡片与门禁逻辑，但禁止继续使用 localStorage 作为真值来源。
4. 若后续问卷、合同、报价需要独立生命周期，再拆独立实体。

---

## 7. 分阶段开发计划

### Phase 0：契约冻结与建模决策

**目标**：先统一“客户模块真实要返回什么、关系人到底怎么建模”。

**产出**：

1. 客户列表 DTO
2. 客户详情 DTO
3. 关系模型决策（`customer_relations` vs 复用 `contact_persons`）
4. P1 `bmvProfile` 字段口径与状态枚举

**原因**：这一阶段不做完，后面前后端会反复返工。

### Phase 1：补齐 Server 侧 P0 真闭环

**目标**：让 server 成为客户列表/详情/关系/权限的真实来源。

**产出**：

1. 列表与详情聚合查询
2. Group 可见范围修正
3. 关系接口
4. 关联案件/沟通/日志查询接口
5. 单测补齐

### Phase 2：Admin 接入 P0 真实数据流

**目标**：从 fixture 切换到 repository + api。

**产出**：

1. 客户 repository / api 层
2. 列表真实搜索、分页、批量动作
3. 详情真实读取与保存
4. 去重提示接通
5. 一键建案 / 批量建案接通 cases 创建页

### Phase 3：补齐 P0 关系与跨模块联动

**目标**：完成关联人、家族签批量建案、客户详情聚合能力。

**产出**：

1. 关系 Tab 真数据
2. 家族签/关联人批量建案入口
3. 客户详情摘要与案件详情跳转稳定联动

### Phase 4：P1 经营管理签生产化

**目标**：把 prototype 中的承接流迁移到正式前后端。

**产出**：

1. `bmvProfile` 持久化
2. 问卷 / 报价 / 签约推进动作
3. 签约前建案门禁
4. 沟通记录 / 操作日志留痕
5. Admin 承接卡片

### Phase 5：测试、门禁、灰度验收

**目标**：保证改造后模块能稳定进入主线。

**产出**：

1. server / admin 单测补齐
2. 关键联调用例通过
3. `npm run fix`
4. `npm run guard`

---

## 8. 原子任务拆分

### A. 契约与建模

| ID | 原子任务 | 依赖 | 产出 / 验收 |
|---|---|---|---|
| CM-001 | 整理 P0 客户列表字段契约 | 无 | 产出列表 DTO 字段清单 |
| CM-002 | 整理 P0 客户详情字段契约 | CM-001 | 产出详情 DTO 字段清单 |
| CM-003 | 决策 CustomerRelation 的服务端模型 | 无 | 明确新增 `customer_relations` 或复用 `contact_persons` 的最终方案 |
| CM-004 | 冻结 P1 `bmvProfile` 字段与状态枚举 | 无 | 明确 `questionnaireStatus / quoteStatus / signStatus / intakeStatus` |
| CM-005 | 定义 admin ↔ server 的 customer mapper 规则 | CM-001, CM-002, CM-004 | 输出字段映射与空值口径 |

### B. Server - P0 核心能力

| ID | 原子任务 | 依赖 | 产出 / 验收 |
|---|---|---|---|
| SV-001 | 为客户列表新增页面 DTO 组装层 | CM-001 | 列表返回可直接渲染页面所需字段 |
| SV-002 | 为客户详情新增聚合 DTO 组装层 | CM-002 | 详情返回案件计数、摘要、最近建案等字段 |
| SV-003 | 修正 `scope=group` 查询语义 | CM-001 | group scope 与 mine/all 真正区分 |
| SV-004 | 扩展 `PermissionsService` 的 Group 可见规则 | SV-003 | 可见性符合 P0 规格 |
| SV-005 | 统一 `group / owner` 字段读取与写入口径 | CM-005 | 列表筛选、批量操作、详情显示口径一致 |
| SV-006 | 补客户详情下的关联案件查询接口 | CM-002 | 详情 Tab 可获取真实案件列表 |
| SV-007 | 补客户详情下的沟通记录查询接口 | CM-002 | comms Tab 可获取真实数据 |
| SV-008 | 补客户详情下的操作日志查询接口 | CM-002 | log Tab 可获取真实数据 |
| SV-009 | 落地关系模型的查询接口 | CM-003 | relations Tab 可获取真实数据 |
| SV-010 | 落地关系模型的新增 / 编辑接口 | SV-009 | 可新增/维护关联关系 |
| SV-011 | 为关联人/关系变更补 Timeline 留痕 | SV-010 | 关系变更可审计 |
| SV-012 | 为列表/详情/权限改造补 server 单测 | SV-001~SV-011 | 相关 service/controller tests 通过 |

### C. Admin - P0 真实数据接入

| ID | 原子任务 | 依赖 | 产出 / 验收 |
|---|---|---|---|
| FE-001 | 新建 customers API / repository 层 | CM-005, SV-001, SV-002 | 页面不再直接依赖 fixture |
| FE-002 | 将客户列表切到真实接口 | FE-001 | 列表支持真实分页/搜索/筛选 |
| FE-003 | 将客户详情切到真实接口 | FE-001 | 详情页可读取真实数据 |
| FE-004 | 接通建档提交与去重检查 | FE-001 | 建档前可调用 `check-duplicates` |
| FE-005 | 接通批量改负责人 | FE-001 | 列表批量操作成功回写 UI |
| FE-006 | 接通批量改分组 | FE-001 | 列表批量操作成功回写 UI |
| FE-007 | 将关联案件 Tab 切到真实数据 | FE-003, SV-006 | 详情案件列表真实可用 |
| FE-008 | 将关联人 Tab 切到真实数据 | FE-003, SV-009, SV-010 | 关系 Tab 可查可改 |
| FE-009 | 将沟通记录 / 日志 Tab 切到真实数据 | FE-003, SV-007, SV-008 | 两个 Tab 去 fixture 化 |
| FE-010 | 接通详情页保存动作 | FE-003 | 基础信息编辑可真实保存 |
| FE-011 | 接通一键建案入口 | FE-003 | 从客户详情跳转 case create 并带 customerId |
| FE-012 | 接通批量建案入口 | FE-008 | 家族签/关联人场景可带入建案向导 |
| FE-013 | 为 list/detail/model 接入补单测 | FE-001~FE-012 | 无真实网络请求，全部 mock |

### D. P1 经营管理签生产化

| ID | 原子任务 | 依赖 | 产出 / 验收 |
|---|---|---|---|
| P1-001 | 在 server 增加 `bmvProfile` 持久化口径 | CM-004 | 客户详情可返回可选 `bmvProfile` |
| P1-002 | 增加发送问卷动作接口 | P1-001 | 可推进 `questionnaireStatus` |
| P1-003 | 增加生成报价动作接口 | P1-001 | 可推进 `quoteStatus` |
| P1-004 | 增加确认签约动作接口 | P1-001 | 可推进 `signStatus` 并开放建案 |
| P1-005 | 为 P1 三个动作补沟通记录 / 日志留痕 | P1-002, P1-003, P1-004 | 动作后可审计 |
| P1-006 | 将 prototype 承接卡片迁移到 admin 正式详情页 | FE-003, P1-001 | 基础信息 Tab 中显示 P1 卡片 |
| P1-007 | 将问卷 / 报价 / 签约按钮接真实接口 | P1-002, P1-003, P1-004, P1-006 | 页面可真实推进状态 |
| P1-008 | 在 admin 建案入口接入签约门禁 | P1-004, FE-011, FE-012 | 未签约不可建案 |
| P1-009 | 为 P1 model / server 动作补测试 | P1-001~P1-008 | P1 关键状态流转可回归 |

### E. 收尾与验证

| ID | 原子任务 | 依赖 | 产出 / 验收 |
|---|---|---|---|
| QA-001 | 跑 customers/contact-persons 相关 server 单测 | SV-012 | 目标测试通过 |
| QA-002 | 跑 admin customers 相关单测 | FE-013, P1-009 | 目标测试通过 |
| QA-003 | 运行 `npm run fix` | 所有改动完成 | 仓库格式与静态问题修正 |
| QA-004 | 运行 `npm run guard` | QA-003 | 门禁通过，方可视为完成 |

---

## 9. 推荐执行顺序

1. `CM-001 ~ CM-005`：先冻结契约与建模
2. `SV-001 ~ SV-005`：先补列表 / 详情 / 权限主干
3. `FE-001 ~ FE-006`：尽快让列表页与建档页摆脱 fixture
4. `SV-006 ~ SV-011` + `FE-007 ~ FE-012`：补齐详情各 Tab 与建案联动
5. `P1-001 ~ P1-009`：最后做经营管理签承接流生产化
6. `QA-001 ~ QA-004`：统一收尾

---

## 10. 里程碑验收口径

### M1：P0 列表真实可用

- 客户列表可从真实接口加载
- 搜索 / 分组 / 负责人 / 活跃案件筛选可用
- 批量改负责人 / 改分组可用
- 去重检查可从建档流程触发

### M2：P0 详情真实可用

- 客户详情不再依赖 fixture
- 顶部摘要、关联案件、关联人、沟通记录、操作日志都可真实展示
- 一键建案 / 批量建案可正常跳转并带上客户上下文
- Group 可见性与详情权限符合规格

### M3：P1 最小生产闭环

- 经营管理签客户详情可显示承接卡片
- 问卷 / 报价 / 签约动作可真实推进
- 未签约不可建案，已签约可转正式案件
- 动作后可在沟通记录 / 操作日志看到留痕

---

## 11. 风险与待确认项

1. **CustomerRelation 建模决策是当前最大 blocker**。
   - 如果继续把前端 `CustomerRelation` 和后端 `contact_persons` 混用，后续家族签与批量建案会持续返工。

2. **客户编号 `customerNumber` 的真值来源需确认**。
   - 当前前端视为必备显示字段，但 server 核心实体未显式建模。

3. **沟通记录与日志的真值来源需统一**。
   - 若已有通用 communication/timeline 能力，应复用而不是再造一套客户私有日志。

4. **P1 `bmvProfile` 是否长期驻留在 `Customer.baseProfile`，还是后续拆独立实体，需要明确演进边界**。

5. **Case 创建页的接参方式需要同步**。
   - 客户详情页的一键建案 / 批量建案，要和 `packages/admin/src/views/cases` 的建案入口口径一致。

---

## 12. 最终判断

### P0 判断

- **后端：部分满足**
- **前端：部分满足**
- **整体端到端：不满足**

> 主要短板不是 CRUD，而是“页面真实数据闭环、关系模型、权限口径、详情聚合接口”尚未完成。

### P1 判断

- **原型：满足演示**
- **生产：不满足**

> 主要短板不是设计，而是“prototype 尚未生产化迁移到 admin + server”。
