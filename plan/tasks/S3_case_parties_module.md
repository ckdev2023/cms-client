# S3: CaseParty 案件关联人模块

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | S3 |
| Phase | S — Server 地基补全 |
| 前置依赖 | S2（ContactPerson）、S4（Case 字段扩展） |
| 后续解锁 | 无 |
| 预估工时 | 0.3 天 |

## 目标

为案件关联人（配偶/子女/担保人/企业联系人等）提供 CRUD，绑定到具体案件。对应产品文档 `06-数据模型设计 §3.5`。

## 数据库表

表 `case_parties` 已在 `009_core_entities.up.sql` 创建，字段：
- id, org_id, case_id(FK cases), party_type
- customer_id(nullable FK), contact_person_id(nullable FK)
- relation_to_case, is_primary, created_at, updated_at

## 范围

### 需要创建的文件

- `packages/server/src/modules/core/case-parties/caseParties.service.ts`
- `packages/server/src/modules/core/case-parties/caseParties.controller.ts`
- `packages/server/src/modules/core/case-parties/caseParties.service.test.ts`

### 需要修改的文件

- `packages/server/src/modules/core/model/coreEntities.ts` — 新增 `CaseParty` 类型

## 类型定义

```ts
type CasePartyId = string;

export type CaseParty = {
  id: CasePartyId;
  orgId: OrganizationId;
  caseId: CaseId;
  partyType: string;
  customerId: CustomerId | null;
  contactPersonId: ContactPersonId | null;
  relationToCase: string | null;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
};
```

## API 设计

| 方法 | 路径 | 角色要求 | 说明 |
|---|---|---|---|
| POST | `/case-parties` | staff+ | 添加关联人到案件 |
| GET | `/case-parties` | viewer+ | 按 caseId 列表 |
| PATCH | `/case-parties/:id` | staff+ | 更新 |
| DELETE | `/case-parties/:id` | staff+ | 硬删除（中间表性质） |

## 实现规范

1. 创建时校验 caseId 存在且属于同 org
2. customer_id 或 contact_person_id 至少填一个
3. party_type 枚举：spouse / child / guarantor / representative / other
4. 同一 case 只允许一个 is_primary = true 的同类 party_type
5. 写操作写 Timeline（entityType = `"case_party"`，同时写到 case 的 timeline）

## 测试要求

- CRUD 全覆盖
- caseId 跨租户拒绝
- is_primary 唯一约束
- party_type 校验

## DoD

- [ ] 4 个 API 端点
- [ ] org_id 隔离
- [ ] 写操作写 Timeline
- [ ] 单测覆盖
- [ ] `npm run server:guard` 通过

## 验证命令

```bash
cd packages/server
npm run guard
```
