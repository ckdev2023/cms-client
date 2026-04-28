# P1 阶段尾汇总复核清单

> Task ID: `p1-qa-002-03-p1-phase-closeout-checklist`
> 本清单只做结果汇总与交叉复核，不替代各批门禁执行。
> 各批 / 各 PR 的门禁执行责任参见 `p0-qa-002-01-batch-exit-command-matrix.md`（Batch 4 / Batch 5 行）。

## 前置条件

- Batch 4（P1-A Step 1–14）和 Batch 5（P1-B Step 15–20）的所有 to-do 均已标记 `completed`
- P0 阶段尾已通过汇总复核（参见 `p0-qa-002-03-phase-closeout-checklist.md`）
- 每批的 `npm run fix` → `npm run guard` → 增量测试均已在各批退出时执行并通过
- 未完成的批次门禁不得在阶段尾补跑代替

## 一、门禁执行汇总

逐批确认门禁结果。若任何批次缺失门禁记录，必须返回该批补执行，不得跳过。

| Batch | `npm run fix` | `npm run guard` | 增量测试 | 执行人/日期 | 备注 |
|-------|:---:|:---:|:---:|---|---|
| Batch 4 P1-A Step 1–14 | [ ] | [ ] | [ ] | | |
| Batch 5 P1-B Step 15–20 | [ ] | [ ] | [ ] | | |

## 二、P1 退出条件复核

逐项确认 P1 退出条件是否达成。

### 2.1 Server 层 — P1-A（模板 / 问卷 / 子步骤 / 补正）

| # | 退出条件 | 达成 | 证据/备注 |
|---|---------|:---:|---|
| SA1 | 经营管理签 `CaseTemplate` 已创建，`workflow_steps_blueprint` / `extra_fields_schema` / `requirement_blueprint` 已填充 | [ ] | |
| SA2 | `DocumentRequirement.category=questionnaire` 问卷类资料项可进入 intake/document 主链 | [ ] | |
| SA3 | `survey_data`、`visa_plan`、`quote_price` 已结构化落地且可读写 | [ ] | |
| SA4 | 问卷回收 / 报价确认前不得签约建案成功的门禁已生效 | [ ] | |
| SA5 | `CaseWorkflowStep` 子步骤已落地（`WAITING_MATERIAL` ~ `APPROVED`），与 `Case.stage = S1-S9` 并行且不冲突 | [ ] | |
| SA6 | 补正循环使用 `supplement_count`，且补正提交通过 `related_submission_id` 形成链路 | [ ] | |
| SA7 | Gate-A / Gate-B / Gate-C 在 P1 模板中继续有效，不被子步骤覆盖 | [ ] | |

### 2.2 Server 层 — P1-B（收费 / COE / 返签 / 在留 / 提醒 / 结案）

| # | 退出条件 | 达成 | 证据/备注 |
|---|---------|:---:|---|
| SB1 | `final_payment` 节点已定义，`gate_trigger_step=COE_SENT` + `gate_effect_mode=block` 已配置 | [ ] | |
| SB2 | 尾款未结清时推进 `COE_SENT` 被服务端硬阻断 | [ ] | |
| SB3 | `COE_SENT → VISA_APPLYING → ENTRY_SUCCESS` 与 `COE_SENT → VISA_APPLYING → VISA_REJECTED` 两条返签路径均可跑通 | [ ] | |
| SB4 | 海外拒签收敛到失败结案分支 | [ ] | |
| SB5 | `ResidencePeriod` 模块已落地：`period_start / period_end / residence_years / card_number / entry_date` 可录入 | [ ] | |
| SB6 | `reminder_schedule_blueprint` 映射口径已冻结，180 / 90 / 30 天提醒可自动生成 | [ ] | |
| SB7 | 提醒创建失败时不得自动进入成功结案 | [ ] | |
| SB8 | 成功结案前置条件完整：入境成功 + 已录入在留期间 + 已生成续签提醒 | [ ] | |
| SB9 | 失败结案可记录 `close_reason`，所有异常路径最终收敛到成功或失败结案 | [ ] | |

### 2.3 Admin 层 — P1-A

| # | 退出条件 | 达成 | 证据/备注 |
|---|---------|:---:|---|
| AA1 | 经营管理签案件可从 admin 创建并生成专属资料清单 | [ ] | |
| AA2 | 问卷与报价数据可结构化保存并在 detail 展示 | [ ] | |
| AA3 | 业务子步骤（`CaseWorkflowStep`）与 `S1-S9` 并行显示且不混淆 | [ ] | |
| AA4 | 补正循环与提交包链路在 admin 可跑通，`supplement_count` 正确显示 | [ ] | |
| AA5 | BMV 真相源在 `customer` / `case` / `CaseTemplate` / `CaseWorkflowStep` 间无双写漂移 | [ ] | |

### 2.4 Admin 层 — P1-B

| # | 退出条件 | 达成 | 证据/备注 |
|---|---------|:---:|---|
| AB1 | 尾款未结清时 COE 发送按钮被禁用或阻断，阻断原因可展示 | [ ] | |
| AB2 | 海外返签成功 / 失败两条路径在 detail 可展示并操作 | [ ] | |
| AB3 | 入境成功后可从 detail 录入 `ResidencePeriod` | [ ] | |
| AB4 | 录入在留期间后可展示 180 / 90 / 30 天续签提醒 | [ ] | |
| AB5 | 成功 / 失败结案前置条件在 UI 可展示（checklist 或 banner） | [ ] | |
| AB6 | 提醒创建失败时 UI 不展示成功结案入口 | [ ] | |

### 2.5 P1 产品验收条件（AC-001 ~ AC-011）

逐项对照 `docs/gyoseishoshi_saas_md/P1/03-经营管理签高仿真原型需求门禁/artifacts/acceptance_checklist.json` 中的验收项。

| # | 验收描述 | 达成 | 证据/备注 |
|---|---------|:---:|---|
| AC-001 | 可从咨询入口创建经营管理签线索 | [ ] | |
| AC-002 | 可发送问卷、回收问卷，并形成 `quote_price` 与 `visa_plan` | [ ] | |
| AC-003 | 签约后可转化为案件并生成经营管理签资料清单，签约前不应呈现建案成功态 | [ ] | |
| AC-004 | 案件详情可并行展示 P0 管理阶段与经营管理签业务子步骤 | [ ] | |
| AC-005 | 可演示资料提交、审核退回、文书制作、Gate 校验、提交入管全过程 | [ ] | |
| AC-006 | 可演示补正循环，并显示 `supplement_count` | [ ] | |
| AC-007 | 收尾款与发送 COE 的门禁生效，尾款未结清时发送 COE 被阻断 | [ ] | |
| AC-008 | `COE_SENT → VISA_APPLYING → ENTRY_SUCCESS` 与 `→ VISA_REJECTED` 两条路径可演示 | [ ] | |
| AC-009 | `ENTRY_SUCCESS` 后可录入在留期间全部字段 | [ ] | |
| AC-010 | 录入在留期间后可展示 180/90/30 天提醒；提醒创建失败时不得进入 `CLOSED_SUCCESS` | [ ] | |
| AC-011 | 全流程使用 mock 或本地状态，不触发真实网络请求或通知 | [ ] | |

## 三、P1 关键回归测试汇总

### 3.1 Server 端 P1 回归

| 测试文件 | 覆盖领域 | 通过 |
|---------|---------|:---:|
| `cases/cases.regression-p1-questionnaire-supplement.test.ts` | 问卷 / 补正链路 | [ ] |
| `cases/cases.regression-p1-coe-visa-residence.test.ts` | COE / 返签 / 在留期间 | [ ] |
| `cases/cases.regression-p1-reminder-closeout.test.ts` | 提醒 / 结案收敛 | [ ] |
| `cases/cases.success-closeout-gate.focused.test.ts` | 成功结案前置条件 | [ ] |
| `cases/cases.closeout-rules.focused.test.ts` | 结案规则 | [ ] |
| `cases/cases.types-failure-closeout.test.ts` | 失败结案类型 | [ ] |
| `cases/cases.types-residence-closeout.test.ts` | 在留期间结案类型 | [ ] |
| `residence-periods/residencePeriods.service.test.ts` | 在留期间 CRUD | [ ] |
| `residence-periods/residencePeriods.focused.test.ts` | 在留期间核心行为 | [ ] |
| `residence-periods/residencePeriods.reminder-blueprint.focused.test.ts` | 提醒蓝图映射 | [ ] |
| `residence-periods/reminderBlueprintContract.test.ts` | 提醒蓝图契约 | [ ] |
| `residence-periods/residencePeriods.reminder-blueprint.test.ts` | 提醒蓝图基线 | [ ] |

### 3.2 Admin 端 P1 回归

| 测试文件 | 覆盖领域 | 通过 |
|---------|---------|:---:|
| `cases/model/p1-qa-step-mapping-adapter.focused.test.ts` | P1 adapter 隔离（尾款/补正/提醒） | [ ] |
| `cases/model/p1-qa-button-guard-matrix.focused.test.ts` | P1 按钮守卫矩阵 | [ ] |
| `cases/model/p1-qa-write-actions-error-mapping.focused.test.ts` | P1 写操作 + 错误映射 | [ ] |
| `cases/model/useCaseDetailCloseout.focused.test.ts` | 结案 composable 行为 | [ ] |
| `cases/constantsBmvSteps.focused.test.ts` | BMV 子步骤常量 | [ ] |
| `cases/model/CaseAdapterDetailAggregate.bmv-contract.test.ts` | BMV 契约 | [ ] |
| `cases/model/CaseAdapterDetailAggregate.bmv-failure-path.test.ts` | BMV 失败路径 | [ ] |
| `cases/model/CaseAdapterDetailAggregate.final-payment-gate.test.ts` | 尾款门禁 | [ ] |
| `cases/model/CaseAdapterDetailAggregate.survey-quote.test.ts` | 问卷报价 | [ ] |
| `cases/model/CaseAdapterDetailAggregate.residence-reminder.test.ts` | 在留期间 / 提醒 | [ ] |
| `cases/model/useCaseDetailWriteActions.coe-residence-reminder.focused.test.ts` | COE / 在留 / 提醒写操作 | [ ] |
| `cases/model/useCaseDetailWriteActions.exception-paths.focused.test.ts` | 异常路径写操作 | [ ] |
| `cases/model/useCaseDetailWriteActions.survey-quote.focused.test.ts` | 问卷报价写操作 | [ ] |

## 四、最终全量门禁

阶段尾最后执行一次全量门禁，仅作为交叉复核，不替代各批已执行的门禁。

```bash
npm run fix
npm run guard
```

| 项目 | 结果 | 执行人/日期 | 备注 |
|------|:---:|---|---|
| `npm run fix` | [ ] | | |
| `npm run guard` (admin) | [ ] | | |
| `npm run guard` (server) | [ ] | | |
| 全量下游验证（VS-1 ~ VS-5） | [ ] | | |
| P1 server 回归全量 | [ ] | `npm --workspace server run test` |
| P1 admin 回归全量 | [ ] | `npx vitest run src/views/cases/` |

## 五、遗留风险登记

如有已知遗留风险，必须在此登记并标注影响范围和处置计划。

| # | 风险描述 | 影响范围 | 处置计划 | 责任人 |
|---|---------|---------|---------|-------|
| 1 | | | | |

## 六、P0 底座完整性复核

P1 完成后确认 P0 底座未被破坏。

| # | 确认项 | 状态 | 备注 |
|---|-------|:---:|---|
| P01 | `Case.stage = S1-S9` 管理层状态机未被 P1 改动污染 | [ ] | |
| P02 | Gate-A / Gate-B / Gate-C 顺序与职责边界不变 | [ ] | |
| P03 | P0 的权限矩阵（`role + group + owner/collaborator + action`）未被绕过 | [ ] | |
| P04 | P0 admin list / detail / create 主链未因 P1 扩展回归 | [ ] | |
| P05 | customer / documents / dashboard 跨模块深链协议未被破坏 | [ ] | |
| P06 | 下游验证集（VS-1 ~ VS-5）在 P1 变更后仍全量通过 | [ ] | |

## 七、P1 → 后续阶段交接确认

P1 关闭前确认以下事项，确保后续模板扩展可在稳定底座上启动。

| # | 确认项 | 状态 | 备注 |
|---|-------|:---:|---|
| H1 | P1 的 `CaseWorkflowStep` 机制可被其他签证类型模板复用 | [ ] | |
| H2 | `extra_fields_schema` / `workflow_steps_blueprint` / `requirement_blueprint` 扩展模式已固化 | [ ] | |
| H3 | `ResidencePeriod` + `reminder_schedule_blueprint` 对其他签证类型可复用 | [ ] | |
| H4 | `gate_trigger_step` + `gate_effect_mode` 机制可被其他收费门禁配置复用 | [ ] | |
| H5 | P1 测试归属已并入 `TEST-OWNERSHIP.md`，后续扩展可按同一标准回归 | [ ] | |
| H6 | 产品验收清单（AC-001 ~ AC-011）已全部通过并存档 | [ ] | |

## 使用说明

1. **时机**：Batch 4 + Batch 5 全部完成后，由负责人逐项填写本清单。
2. **性质**：汇总复核。若发现某项不达标，必须返回对应批次修复，不在阶段尾补做。
3. **存档**：填写完毕后，将本文件连同各批门禁记录一并归档。
4. **关联文件**：
   - 批次退出命令矩阵：`p0-qa-002-01-batch-exit-command-matrix.md`（Batch 4 / Batch 5 行）
   - 下游验证集定义：`p0-qa-002-02-downstream-validation-set.md`
   - P0 阶段尾复核：`p0-qa-002-03-phase-closeout-checklist.md`
   - 测试归属矩阵：`packages/admin/src/views/cases/TEST-OWNERSHIP.md`
   - P1 产品验收清单：`docs/gyoseishoshi_saas_md/P1/03-经营管理签高仿真原型需求门禁/artifacts/acceptance_checklist.json`
   - P1 扩展范围文档：`docs/gyoseishoshi_saas_md/P1/01-经营管理签扩展范围与落地计划.md`
   - P1 技术落地清单：`docs/gyoseishoshi_saas_md/P1/02-经营管理签技术落地清单.md`
