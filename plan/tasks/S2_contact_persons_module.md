# S2: ContactPerson 联系人/关联人模块

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | S2 |
| Phase | S — Server 地基补全 |
| 前置依赖 | S1（Company）、S15（TimelineEntityType） |
| 后续解锁 | S3（CaseParty） |
| 预估工时 | 0.5 天 |

## 目标

为联系人/关联人提供 CRUD API，可关联到 Company 或 Customer。对应产品文档 `06-数据模型设计 §3.3`。

## 数据库表

表 `contact_persons` 已在 `009_core_entities.up.sql` 创建，字段：
- id, org_id, company_id(nullable FK), customer_id(nullable FK)
- name, role_title, relation_type, phone, email, preferred_language
- created_at, updated_at

## 范围

### 需要创建的文件

- `packages/server/src/modules/core/contact-persons/contactPersons.service.ts`
- `packages/server/src/modules/core/contact-persons/contactPersons.controller.ts`
- `packages/server/src/modules/core/contact-persons/contactPersons.service.test.ts`

### 需要修改的文件

- `packages/server/src/modules/core/model/coreEntities.ts` — 新增 `ContactPerson` 类型

## 类型定义

```ts
type ContactPersonId = string;

export type ContactPerson = {
  id: ContactPersonId;
  orgId: OrganizationId;
  companyId: CompanyId | null;
  customerId: CustomerId | null;
  name: string;
  roleTitle: string | null;
  relationType: string | null;
  phone: string | null;
  email: string | null;
  preferredLanguage: string;
  createdAt: string;
  updatedAt: string;
};
```

## API 设计

| 方法 | 路径 | 角色要求 | 说明 |
|---|---|---|---|
| POST | `/contact-persons` | staff+ | 创建联系人 |
| GET | `/contact-persons/:id` | viewer+ | 查看单个 |
| GET | `/contact-persons` | viewer+ | 列表（`?companyId=&customerId=&page=1&limit=20`） |
| PATCH | `/contact-persons/:id` | staff+ | 更新 |
| DELETE | `/contact-persons/:id` | manager+ | 软删除（需校验无 case_parties 引用） |

## 实现规范

1. Service 注入 `Pool`，查询通过 `createTenantDb`
2. 写操作写 `TimelineService.write()`，entityType = `"contact_person"`
3. 列表支持按 companyId / customerId 过滤
4. 创建时校验 companyId 或 customerId 至少填一个
5. 软删除前校验 case_parties 表无引用

## 测试要求

- CRUD 全覆盖
- 按 companyId/customerId 过滤列表
- 创建时两个 FK 都为空抛错
- 删除级联保护
- 多租户隔离

## DoD

- [ ] 5 个 API 端点
- [ ] 分页列表 `{ items, total }`
- [ ] 写操作写 Timeline
- [ ] org_id 隔离
- [ ] 单测覆盖
- [ ] `npm run server:guard` 通过

## 验证命令

```bash
cd packages/server
npm run guard
```
