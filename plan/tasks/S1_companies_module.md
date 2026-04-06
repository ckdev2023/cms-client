# S1: Company 企业客户模块

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | S1 |
| Phase | S — Server 地基补全 |
| 前置依赖 | S16（Migration 已完成 ✅）、S15（TimelineEntityType 扩展） |
| 后续解锁 | S2（ContactPerson）、S3（CaseParty）、S4（Case 字段扩展） |
| 预估工时 | 0.5 天 |

## 目标

为企业客户（Company）提供完整 CRUD API，与个人客户（Customer）分离管理。对应产品文档 `06-数据模型设计 §3.2`。

## 数据库表

表 `companies` 已在 `009_core_entities.up.sql` 中创建，字段：
- id, org_id, company_no, company_name, corporate_number, established_date
- capital_amount, address, business_scope, employee_count, fiscal_year_end
- website, contact_phone, contact_email, owner_user_id, created_at, updated_at

RLS 策略已在 `010_core_entities_rls.up.sql` 中配置。

## 范围

### 需要创建的文件

- `packages/server/src/modules/core/companies/companies.service.ts`
- `packages/server/src/modules/core/companies/companies.controller.ts`
- `packages/server/src/modules/core/companies/companies.service.test.ts`

### 需要修改的文件

- `packages/server/src/modules/core/model/coreEntities.ts` — 新增 `Company` 类型 + `CompanyId`

### 不可修改

- `packages/server/src/infra/db/migrations/` — 表结构已就绪

## 类型定义

在 `coreEntities.ts` 中新增：

```ts
type CompanyId = string;

export type Company = {
  id: CompanyId;
  orgId: OrganizationId;
  companyNo: string | null;
  companyName: string;
  corporateNumber: string | null;
  establishedDate: string | null;
  capitalAmount: number | null;
  address: string | null;
  businessScope: string | null;
  employeeCount: number | null;
  fiscalYearEnd: string | null;
  website: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  ownerUserId: UserId | null;
  createdAt: string;
  updatedAt: string;
};
```

## API 设计

| 方法 | 路径 | 角色要求 | 说明 |
|---|---|---|---|
| POST | `/companies` | staff+ | 创建企业客户 |
| GET | `/companies/:id` | viewer+ | 查看单个 |
| GET | `/companies` | viewer+ | 列表（`?page=1&limit=20&keyword=`） |
| PATCH | `/companies/:id` | staff+ | 更新 |
| DELETE | `/companies/:id` | manager+ | 软删除（需校验无关联 cases） |

## 实现规范

1. Service 注入 `Pool`，查询通过 `createTenantDb(pool, ctx.orgId, ctx.userId)`
2. Controller 从 `req.requestContext` 取 `RequestContext`
3. 角色校验用 `@RequireRoles()` 装饰器
4. 写操作调用 `TimelineService.write()`，entityType = `"company"`
5. 软删除前校验 cases 表无 `company_id` 引用
6. Update 记录 `{ before, after }` payload

## 测试要求

- create / get / list / update / softDelete 全覆盖
- 多租户隔离验证（createTenantDb SQL 层）
- 删除级联保护（模拟名下有 case 时抛 BadRequestException）
- Timeline payload 完整性
- DTO 校验（companyName 必填、类型错误被拒绝）

## DoD

- [ ] 5 个 API 端点，DTO 强校验
- [ ] 分页列表 `{ items, total }`
- [ ] 写操作写 Timeline（entityType = company）
- [ ] 查询通过 TenantDb（org_id 隔离）
- [ ] 角色校验正确
- [ ] 单测覆盖核心场景
- [ ] `npm run server:guard` 通过

## 验证命令

```bash
cd packages/server
npm run guard
```
