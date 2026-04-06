# S4: Case 实体字段扩展

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | S4 |
| Phase | S — Server 地基补全 |
| 前置依赖 | S1（Company，因 company_id FK）、S16（Migration ✅） |
| 后续解锁 | S3（CaseParty）、S5（状态机）、S17（自动编号） |
| 预估工时 | 0.5 天 |

## 目标

扩展 Case 实体类型和 Service，支持 009 migration 新增的 15 个字段。对应产品文档 `06-数据模型设计 §3.4`。

## 新增字段（已在 009_core_entities.up.sql ALTER）

| 列名 | 类型 | 说明 |
|---|---|---|
| case_no | text | 案件编号（唯一，S17 自动生成） |
| case_name | text | 案件名称 |
| case_subtype | text | 案件子类型 |
| application_type | text | 申请类型 |
| company_id | uuid FK | 关联企业客户 |
| priority | text default 'normal' | 优先级 |
| risk_level | text default 'low' | 风险等级 |
| assistant_user_id | uuid FK | 辅助经办人 |
| source_channel | text | 来源渠道 |
| signed_at | timestamptz | 签约时间 |
| accepted_at | timestamptz | 受理时间 |
| submission_date | date | 提交日期 |
| result_date | date | 结果日期 |
| residence_expiry_date | date | 在留到期日 |
| archived_at | timestamptz | 归档时间 |

## 范围

### 需要修改的文件

- `packages/server/src/modules/core/model/coreEntities.ts` — 扩展 `Case` 类型
- `packages/server/src/modules/core/cases/cases.service.ts` — create/update/list 支持新字段
- `packages/server/src/modules/core/cases/cases.service.test.ts` — 更新现有 + 新增单测

## 类型扩展

```ts
export type Case = {
  // ... 已有字段 ...
  caseNo: string | null;
  caseName: string | null;
  caseSubtype: string | null;
  applicationType: string | null;
  companyId: CompanyId | null;
  priority: string;
  riskLevel: string;
  assistantUserId: UserId | null;
  sourceChannel: string | null;
  signedAt: string | null;
  acceptedAt: string | null;
  submissionDate: string | null;
  resultDate: string | null;
  residenceExpiryDate: string | null;
  archivedAt: string | null;
};
```

## 实现规范

1. `create` 接受新字段（均为可选）
2. `update` 支持 PATCH 新字段
3. `list` 新增过滤条件：priority, risk_level, company_id, status
4. `get` 返回包含新字段的完整对象
5. priority 枚举：low / normal / high / urgent
6. risk_level 枚举：low / medium / high
7. company_id 创建/更新时校验属于同 org（assertBelongsToOrg）

## 测试要求

- 现有 cases.service.test.ts 所有测试仍需通过
- 新增：create 带新字段验证
- 新增：update 新字段验证
- 新增：list 按 priority/company_id 过滤
- 新增：company_id 跨租户拒绝

## DoD

- [ ] Case 类型包含全部 15 个新字段
- [ ] CasesService create/update/list 支持新字段
- [ ] 现有测试 + 新增测试全部通过
- [ ] `npm run server:guard` 通过

## 验证命令

```bash
cd packages/server
npm run guard
```
