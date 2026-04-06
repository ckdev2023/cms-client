# S16: 统一 Migration 文件（新增实体建表）

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | S16 |
| Phase | S — Server 地基补全 |
| 前置依赖 | 无 |
| 后续解锁 | S1-S15（全部新模块依赖这些表） |
| 预估工时 | 0.3 天 |
| 状态 | ✅ 已完成 |

## 目标

为产品文档定义的全部新实体创建数据库表 + 索引 + RLS 策略。

## 已创建文件

| 文件 | 内容 |
|---|---|
| `009_core_entities.up.sql` | 9 张新表 + cases ALTER 15 列 + 索引（223 行） |
| `009_core_entities.down.sql` | 回滚：按依赖反序 DROP + ALTER DROP COLUMN（50 行） |
| `010_core_entities_rls.up.sql` | 9 张表 RLS enable + force + org_isolation policy（67 行） |
| `010_core_entities_rls.down.sql` | 回滚：DROP policy + disable RLS（28 行） |

## 新增的 9 张表

1. **companies** — 企业客户（文档 §3.2）
2. **contact_persons** — 联系人/关联人（§3.3）
3. **case_parties** — 案件关联人（§3.5）
4. **document_files** — 资料文件/多版本（§3.7）
5. **communication_logs** — 沟通记录（§3.8）
6. **tasks** — 任务（§3.9）
7. **generated_documents** — 生成文书（§3.11）
8. **billing_records** — 收费计划（§3.13）
9. **payment_records** — 回款记录（§3.14）

## Cases ALTER 新增列

case_no, case_name, case_subtype, application_type, company_id,
priority, risk_level, assistant_user_id, source_channel,
signed_at, accepted_at, submission_date, result_date,
residence_expiry_date, archived_at

## 验证结果

- `npm run server:guard` — 351/351 tests pass ✅
- `db:migrations:check` — ok ✅
- lint / typecheck / arch:check — 全部通过 ✅

## QA 审查结果

| 检查项 | 结果 |
|---|---|
| 命名一致性 snake_case | ✅ |
| org_id NOT NULL + FK | ✅ |
| RLS enable + force + policy | ✅ |
| 回滚依赖反序 | ✅ |
| 幂等 IF NOT EXISTS | ✅ |
| FK 引用链正确 | ✅ |
| 无敏感信息 | ✅ |
