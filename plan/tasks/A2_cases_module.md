# A2: Cases CRUD 模块

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | A2 |
| Phase | A — 补齐后台核心 CRUD |
| 前置依赖 | A1 (Customers) |
| 后续解锁 | A3 (DocumentItems)、A5 (Permissions) |
| 预估工时 | 1-1.5 天 |

## 目标

为 Case 核心对象提供完整 CRUD + 状态变更 API。创建 Case 时自动根据 template 生成 DocumentItem checklist。

## 范围

### 需要创建的文件

- `packages/server/src/modules/core/cases/cases.service.ts`
- `packages/server/src/modules/core/cases/cases.controller.ts`
- `packages/server/src/modules/core/cases/cases.service.test.ts`

### 不可修改的目录

- `packages/server/src/modules/core/model/`
- `packages/server/src/infra/db/migrations/`
- `packages/mobile/`

## 数据模型来源

`coreEntities.ts` → `Case` 类型

```ts
type Case = {
  id: CaseId;
  orgId: OrganizationId;
  customerId: CustomerId;
  caseTypeCode: string;
  status: CaseStatus;
  ownerUserId: UserId;
  openedAt: string;
  dueAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};
```

对应 DB 表：`cases`（见 `001_init.sql` L40-52）

## API 设计

| 方法 | 路径 | 角色要求 | 说明 |
|---|---|---|---|
| POST | `/cases` | staff+ | 创建案件（需传 customerId + caseTypeCode） |
| GET | `/cases/:id` | viewer+ | 查看单个案件 |
| GET | `/cases` | viewer+ | 列表查询（支持 status/ownerUserId/customerId 筛选 + 分页） |
| PATCH | `/cases/:id` | staff+ | 更新案件基本信息 |
| POST | `/cases/:id/transition` | staff+ | 状态变更（需校验状态流合法性） |
| DELETE | `/cases/:id` | manager+ | 软删除 |

## 实现规范

1. **Service 注入**：`Pool` + `TimelineService` + `TemplatesService`
2. **创建案件时**：
   - 查询 `TemplatesService` 获取 `document_checklist` template
   - 如 template 存在，自动插入对应 `document_items` 行
   - 如不存在，跳过（不报错）
3. **状态变更**：
   - 查询 `TemplatesService` 获取 `state_flow` template
   - 如 template 存在，校验 `from → to` 是否在 allowedTransitions 中
   - 如不存在 template，允许自由变更（legacy 模式）
4. 所有写操作写 Timeline（entityType: `"case"`）
5. DB 行映射参考 `mapJobRow` 模式

## 权限要求

- org_id 隔离（RLS）
- 角色约束见 API 设计表

## 测试要求

- mock `Pool` / `TimelineService` / `TemplatesService`
- 覆盖：create（有/无 template）、get、list（各种筛选）、update、transition（合法/非法）、softDelete
- 验证 create 时 document_items 自动生成
- 验证 transition 时 template 校验

## 是否涉及异步任务

否

## 注册到 AppModule

- controllers: `CasesController`
- providers: `CasesService`

## DoD

- [ ] 6 个 API 端点可调通
- [ ] 创建案件时自动生成 DocumentItem checklist（如有 template）
- [ ] 状态变更受 state_flow template 约束（如有 template）
- [ ] 所有写操作写 Timeline
- [ ] org_id 隔离
- [ ] 单测覆盖全部 service 方法
- [ ] `npm run guard` 通过

## 验证命令

```bash
cd packages/server
npx jest --testPathPattern=cases
npm run guard
```
