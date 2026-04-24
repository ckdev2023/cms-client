# Phase 1：Server 侧 P0 真闭环

## 阶段目标

- 让 server 成为客户列表、详情、权限、关系和详情聚合的真实来源。
- 为 Admin 去 fixture 化提供稳定接口与 DTO。

## 前置条件

- `CM-001 ~ CM-005` 已完成并评审通过

## 原子任务

| ID | 原子任务 | 主要改动点 | 依赖 |
|---|---|---|---|
| `SV-001` | 为客户列表新增页面 DTO 组装层 | `customers.service` / query / dto assembler | `CM-001` |
| `SV-002` | 为客户详情新增聚合 DTO 组装层 | 详情查询、案件统计、摘要拼装 | `CM-002` |
| `SV-003` | 修正 `scope=group` 查询语义 | `customers.query.ts` | `CM-001` |
| `SV-004` | 扩展 Group 可见规则 | `permissions.service.ts` | `SV-003` |
| `SV-005` | 统一 `group / owner` 读写口径 | service / mapper / input validation | `CM-005` |
| `SV-006` | 补客户详情关联案件查询接口 | customers/cases 聚合查询 | `CM-002` |
| `SV-007` | 补客户详情沟通记录查询接口 | communication/timeline 读取 | `CM-002` |
| `SV-008` | 补客户详情操作日志查询接口 | timeline / audit 读取 | `CM-002` |
| `SV-009` | 落地关系模型查询接口 | relation service / controller | `CM-003` |
| `SV-010` | 落地关系新增/编辑接口 | relation commands | `SV-009` |
| `SV-011` | 为关系变更补留痕 | timeline/audit | `SV-010` |
| `SV-012` | 为以上改造补单测 | service/controller tests | `SV-001 ~ SV-011` |

## 建议实施顺序

1. 先完成 `SV-001 ~ SV-005`
2. 再完成 `SV-006 ~ SV-008`
3. 然后完成 `SV-009 ~ SV-011`
4. 最后统一做 `SV-012`

## 重点文件

- `packages/server/src/modules/core/customers/customers.service.ts`
- `packages/server/src/modules/core/customers/customers.controller.ts`
- `packages/server/src/modules/core/customers/customers.query.ts`
- `packages/server/src/modules/core/auth/permissions.service.ts`
- 与 relations / timeline / communication 相关模块

## 阶段验收

- 列表与详情接口可直接供 `admin customers` 页面消费
- `scope=mine / group / all` 语义清晰且可测
- 详情页所需案件、沟通、日志、关系数据均有真实接口
- 测试覆盖核心 service/controller 分支

## 风险提示

- 若直接在 controller 拼 DTO，后续扩展 P1 会难以维护
- 若 permissions 仍只看 owner/collaborator，会与 P0 Group 规格继续偏差
