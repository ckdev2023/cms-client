# P0 阶段尾汇总复核清单

> Task ID: `p0-qa-002-03-phase-closeout-checklist`
> 本清单只做结果汇总与交叉复核，不替代各批门禁执行。
> 各批 / 各 PR 的门禁执行责任参见 `p0-qa-002-01-batch-exit-command-matrix.md`。

## 前置条件

- Batch 0 ~ Batch 3 的所有 to-do 均已标记 `completed`
- 每批的 `npm run fix` → `npm run guard` → 增量测试均已在各批退出时执行并通过
- 未完成的批次门禁不得在阶段尾补跑代替

## 一、门禁执行汇总

逐批确认门禁结果。若任何批次缺失门禁记录，必须返回该批补执行，不得跳过。

| Batch | `npm run fix` | `npm run guard` | 增量测试 | 执行人/日期 | 备注 |
|-------|:---:|:---:|:---:|---|---|
| Batch 0 基线冻结 | N/A | N/A | N/A | | 无代码改动 |
| Batch 1 P0 server 主链 | [ ] | [ ] | [ ] | | |
| Batch 2 P0 admin 主链 | [ ] | [ ] | [ ] | | |
| Batch 3 P0 跨模块收口 | [ ] | [ ] | [ ] | | |

## 二、P0 退出条件复核

逐项确认 P0 退出条件是否达成。

### 2.1 Server 层

| # | 退出条件 | 达成 | 证据/备注 |
|---|---------|:---:|---|
| S1 | `Case.stage = S1-S9` 与 Gate-A/B/C 在服务端可被统一验证 | [ ] | |
| S2 | 权限矩阵 `role + group + owner/collaborator + action` 已落地 | [ ] | |
| S3 | `cases`/`case-parties`/`validation-runs`/`review-records`/`submission-packages` 全部补上资源级鉴权 | [ ] | |
| S4 | Gate 责任边界正确：Gate-A (S3→S4)、Gate-B (生成 ValidationRun)、S5→S6 (读取 passed ValidationRun)、Gate-C (生成 SubmissionPackage) | [ ] | |
| S5 | case detail aggregate DTO 已冻结且可引用 | [ ] | |
| S6 | detail 10 tab 所需配套模块读写契约稳定 | [ ] | |
| S7 | `Case.group` 快照、migration、backfill 已完成 | [ ] | |
| S8 | server 相关测试通过 | [ ] | |

### 2.2 Admin 层

| # | 退出条件 | 达成 | 证据/备注 |
|---|---------|:---:|---|
| A1 | `CaseListView` / `useCaseListModel` 已切到真实分页与筛选 | [ ] | |
| A2 | `CaseDetailView` / `useCaseDetailModel` 已接 overview/info/read-only 主链 | [ ] | |
| A3 | `CaseCreateView` / `useCreateCaseModel` 已接真实 create case | [ ] | |
| A4 | detail `tab` deep-link 与跨模块链接协议稳定 | [ ] | |
| A5 | `customerId` 回链字段正确 | [ ] | |
| A6 | admin 不再依赖 fixture/mock 作为运行时数据源 | [ ] | |
| A7 | cases admin 相关测试通过 | [ ] | |

### 2.3 跨模块层

| # | 退出条件 | 达成 | 证据/备注 |
|---|---------|:---:|---|
| X1 | customer detail 关联案件 tab 已接真实 `/api/cases?customerId=` | [ ] | |
| X2 | customer 一键建案 / 家族批量建案入口接真 | [ ] | |
| X3 | documents 模块指向 cases 的深链统一 | [ ] | |
| X4 | dashboard QuickActionsPanel 指向 cases 的入口统一 | [ ] | |
| X5 | shared panels 指向 cases 的链接协议一致 | [ ] | |
| X6 | 下游验证集全量通过（参见 `p0-qa-002-02-downstream-validation-set.md`） | [ ] | |

## 三、最终全量门禁

阶段尾最后执行一次全量门禁，仅作为交叉复核，不替代各批已执行的门禁。

```bash
npm run fix
npm run guard
```

| 项目 | 结果 | 执行人/日期 | 备注 |
|------|:---:|---|---|
| `npm run fix` | [ ] | | |
| `npm run guard` (mobile) | [ ] | | |
| `npm run guard` (admin) | [ ] | | |
| `npm run guard` (server) | [ ] | | |
| 全量下游验证（VS-1 ~ VS-5） | [ ] | | |

## 四、遗留风险登记

如有已知遗留风险，必须在此登记并标注影响范围和处置计划。

| # | 风险描述 | 影响范围 | 处置计划 | 责任人 |
|---|---------|---------|---------|-------|
| 1 | | | | |

## 五、P0 → P1 交接确认

P0 关闭前确认以下事项，确保 P1 可在稳定底座上启动。

| # | 确认项 | 状态 | 备注 |
|---|-------|:---:|---|
| H1 | P0 的 `Case.stage = S1-S9` 管理层状态机不因 P1 改动而变更 | [ ] | |
| H2 | P0 的 Gate-A/B/C 逻辑在 P1 中继续有效 | [ ] | |
| H3 | BMV 真相源已冻结，P1 可安全消费 | [ ] | |
| H4 | adapter/builder/repository 基座稳定，P1 可扩展不必修改 P0 热点文件 | [ ] | |
| H5 | 下游验证集已固化，P1 变更可按同一标准回归 | [ ] | |

## 使用说明

1. **时机**：P0 全部批次完成后，由负责人逐项填写本清单。
2. **性质**：汇总复核。若发现某项不达标，必须返回对应批次修复，不在阶段尾补做。
3. **存档**：填写完毕后，将本文件连同各批门禁记录一并归档。
4. **关联文件**：
   - 批次退出命令矩阵：`p0-qa-002-01-batch-exit-command-matrix.md`
   - 下游验证集定义：`p0-qa-002-02-downstream-validation-set.md`
   - 测试归属矩阵：`packages/admin/src/views/cases/TEST-OWNERSHIP.md`
