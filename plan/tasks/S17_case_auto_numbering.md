# S17: Case 自动编号生成

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | S17 |
| Phase | S — Server 地基补全 |
| 前置依赖 | S4（Case 字段扩展，case_no 列已就绪） |
| 后续解锁 | 无 |
| 预估工时 | 0.3 天 |

## 目标

在创建案件时自动生成唯一 case_no 编号。对应产品文档 `03-MVP §2.2`。

## 编号规则设计

格式：`{ORG_PREFIX}-{YYYYMM}-{SEQ}`

示例：`GS-202604-0001`

- ORG_PREFIX：从 organizations.settings.case_prefix 获取，默认 "CASE"
- YYYYMM：案件创建年月
- SEQ：该 org 该月的序号，4 位补零

## 范围

### 需要修改的文件

- `packages/server/src/modules/core/cases/cases.service.ts` — create 方法中生成 case_no
- `packages/server/src/modules/core/cases/cases.service.test.ts` — 新增编号测试

## 实现规范

1. 在 `create` 方法中，insert 前计算 case_no：
   ```sql
   SELECT count(*) + 1 AS seq
   FROM cases
   WHERE org_id = $1 AND case_no LIKE $2
   ```
   其中 $2 = `{prefix}-{YYYYMM}-%`
2. 使用 `String(seq).padStart(4, '0')` 补零
3. 唯一索引 `uq_cases_org_case_no` 已在 009 migration 中创建
4. 若 insert 遇到唯一冲突（并发），重试一次
5. case_no 创建后不可修改（update 时忽略 case_no 字段）

## 并发安全

- 依赖 DB 唯一索引做兜底
- 乐观重试：若 INSERT 冲突，重新 count + 1 再试一次
- 极端并发场景（同月大量并发创建）可考虑后续改为 DB sequence

## 测试要求

- 正常生成编号格式正确
- 同月第二个案件 seq=0002
- case_no 不可通过 update 修改
- 并发冲突重试成功

## DoD

- [ ] create 自动生成 case_no
- [ ] 格式 `{PREFIX}-{YYYYMM}-{SEQ}`
- [ ] 唯一约束兜底
- [ ] update 忽略 case_no
- [ ] 单测覆盖
- [ ] `npm run server:guard` 通过

## 验证命令

```bash
cd packages/server
npm run guard
```
