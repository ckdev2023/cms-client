# Server 端案件相关 P0 / P1 差距分析

> 基于 2026-04-16 对 `packages/server` 的静态审阅整理。
> 仅覆盖 `cases`、案件列表/详情、`dashboard` 聚合、权限边界、`Gate-A/B/C`、`ValidationRun`、`ReviewRecord`、`SubmissionPackage`、`ResidencePeriod` 与 `P0/P1` 边界。
> 本文是分析产出，不替代 `P0/03`、`P0/04`、`P0/06`、`P0/07` 与 `P1/01`、`P1/02` 的权威定义。

## 1. 结论

- **P0 结论**：当前 `packages/server` 还不能判断为满足 P0。主对象大体已存在，但阶段真相源、`Gate-B` 时机与口径、`Gate-C` 与 `S6 → S7` 的闭环、资料审核状态联动、仪表盘口径、权限边界仍有硬缺口。
- **P1 结论**：当前实现也不能判断为满足 P1。仓库里已有少量预埋字段和后置动作，但 `CaseWorkflowStep`、模板专属字段、模板驱动门禁、自动提醒链路尚未形成完整实现。
- **校正结论**：现有服务并非“只有表结构或空壳”。`S5 → S6` 已经依赖最新 `ValidationRun=passed`，启用复核时还要求最新 `ReviewRecord=approved`；`SubmissionPackage.create()` 也已经校验最新校验/复核上下文。真正的问题是 **时机错、范围窄、没有和案件阶段主链路完全闭环**。
- **边界结论**：当前代码同时存在两类问题：
  - P0 必须能力未闭环
  - 部分 P1 能力提前落地，但落地方式又没有对齐 P1 正式模型

## 2. 依据

### 2.1 权威范围

- `P0/06-页面规格/案件.md` 明确：案件模块主对象是 `Case`、`CaseParty`、`CaseStageHistory`、`ValidationRun`、`SubmissionPackage`、`BillingPlan`；P0 直接依赖 `S1-S9`、`Gate-A/B/C`、提交包锁定；P1 `CaseWorkflowStep` 在本页保持关闭。
- `P0/03-业务规则与不变量.md` 明确：P0 中双人复核默认关闭、收费阻断默认 `warn`，都属于“预留但默认关闭”的能力。
- `P0/04-核心流程与状态流转.md` 明确：服务端在“推进阶段 / 执行校验 / 生成提交包”时必须重新校验 Gate；关键资料版本、关键字段或文书变化后，必须拒绝直接生成提交包并要求重新校验；P0 不得通过伪造阶段值跳过 `ValidationRun` 或 `SubmissionPackage`。
- `P0/06-页面规格/仪表盘.md` 明确：P0 仪表盘是“列表视图 + 核心聚合卡片”，至少包含今日待办、即将到期案件、待补件案件、待提交案件、审理中案件、待回款案件、风险案件；看板/日历/高级报表属于 P1。
- `P0/07-数据模型设计.md` 与 `P0/08-术语表.md` 明确：P0 管理层真相源是 `Case.stage(S1-S9)`；`CaseWorkflowStep`、`ResidencePeriod`、`current_workflow_step`、`extra_fields` 属于 P1 预定义但默认不启用。
- `P1/01-经营管理签扩展范围与落地计划.md` 与 `P1/02-经营管理签技术落地清单.md` 明确：P1 需要通过 `CaseWorkflowStep`、`extra_fields_schema`、`workflow_steps_blueprint`、`survey_data`、`BillingPlan.gate_trigger_step`、`reminder_schedule_blueprint` 等正式机制扩展，而不是继续挤压 P0 主链路。

### 2.2 本次实现审阅的主要代码锚点

- `packages/server/src/modules/core/cases/cases.service.ts`
- `packages/server/src/modules/core/cases/cases.service.test.ts`
- `packages/server/src/modules/core/validation-runs/validationRuns.service.ts`
- `packages/server/src/modules/core/review-records/reviewRecords.service.ts`
- `packages/server/src/modules/core/review-records/reviewRecords.service.test.ts`
- `packages/server/src/modules/core/submission-packages/submissionPackages.service.ts`
- `packages/server/src/modules/core/submission-packages/submissionPackages.service.test.ts`
- `packages/server/src/modules/core/document-items/documentItems.service.ts`
- `packages/server/src/modules/core/document-items/documentItems.service.test.ts`
- `packages/server/src/modules/core/document-files/documentFiles.service.ts`
- `packages/server/src/modules/core/document-files/documentFiles.service.test.ts`
- `packages/server/src/modules/core/dashboard/dashboard.service.ts`
- `packages/server/src/modules/core/dashboard/dashboard.service.test.ts`
- `packages/server/src/modules/core/dashboard/dashboard.shared.ts`
- `packages/server/src/modules/core/auth/permissions.service.ts`
- `packages/server/src/modules/core/auth/permissions.service.test.ts`
- `packages/server/src/modules/core/residence-periods/residencePeriods.service.ts`
- `packages/server/src/modules/core/residence-periods/residencePeriods.service.test.ts`

## 3. 模块判断矩阵

| 模块 | P0 判断 | P1 判断 | 核心原因 |
|---|---|---|---|
| 案件主模型与阶段 | 不满足 | 不满足 | `status` / `stage` 真相源混用，`postApprovalStage` 以 P0 替代物承接部分 P1 子步骤 |
| Gate-A / Gate-B / Gate-C | 不满足 | 不满足 | `Gate-B` 触发时机与权威口径相反，`Gate-C` 有服务端约束但未与 `S6 → S7` 流转闭环 |
| Validation / Review / Submission | 部分满足但未闭环 | 不满足 | 已有 latest validation/review hard gate，但校验范围、阶段绑定、快照收口仍不完整 |
| 资料项 / 附件版本 | 部分满足 | 部分预埋 | 附件版本与提交包锁定方向正确，但资料状态闭环不完整 |
| Dashboard 聚合 | 不满足 | 不满足 | 只实现 4 张卡，少于 P0 口径；范围控制也未对齐 |
| 权限边界 | 不满足 | 不满足 | 资源级可见/可编辑约束没有稳定落在案件接口与仪表盘接口上 |
| ResidencePeriod / 提醒 | 越界且不完整 | 部分实现 | P0 不应自动批量提醒；P1 所需模板驱动提醒链路又未完成 |

## 4. 关键差距

### 4.1 P0-Blocker

#### A. `Gate-B / ValidationRun` 主链路是反的

- `cases.service.ts` 当前要求 `S4 → S5` 前必须已经存在 `validation_runs`。
- 但 `P0/04` 的权威口径是：`S4 → S5` 本身就是“进入校验”的动作，执行后生成 `ValidationRun`。
- `cases.service.test.ts` 也明确固化了这一现状：存在 “`S4→S5 requires a validation run`” 的测试，而不是“推进时创建校验”的测试。
- `validationRuns.service.ts` 现在的校验主体仍以 `generated_documents` 是否存在/定稿为主，没有形成 P0 所需的“资料、关键字段、文书、重校验触发条件”的完整口径。
- 结果：服务端既没有按 Gate-B 的正确时机生成校验记录，也没有守住 Gate-B 的最小校验范围。

#### B. `Gate-C / SubmissionPackage` 不是完整提交快照，且没有与 `S6 → S7` 完整闭环

- `submissionPackages.service.ts` 当前并非空壳：它已经要求提交包引用最新 `ValidationRun`，启用复核时还要求引用最新批准的 `ReviewRecord`，补正包还必须带 `relatedSubmissionId`。
- 但它仍只强制 `submittedAt`、`authorityName` 和调用方传入的 `items`，并没有由服务端自动收口“关键字段快照 + 文书版本 + 资料版本”的完整冻结对象。
- `cases.service.ts` 的阶段门禁只覆盖 `S3 → S4`、`S4 → S5`、`S5 → S6`，没有覆盖 `S6 → S7`。
- `cases.service.test.ts` 与 `submissionPackages.service.test.ts` 共同表明：`SubmissionPackage.create()` 可以推动到 `S7`，但单独调用案件流转仍没有被 `SubmissionPackage` 绑定拦住。
- 结果：当前并不是“完全没有 Gate-C”，而是 **提交包服务已有硬约束，但没有和案件阶段推进主链路完整闭环**。

#### C. 案件阶段真相源没有守住

- `mapCaseRow()` 返回 `stage: row.stage ?? row.status`，但 `transition()` 只更新 `status`。
- `list()` 与大部分筛选又仍围绕 `status` 工作。
- 权威文档要求管理层唯一真相源是 `Case.stage(S1-S9)`，阶段不能退化成“显示字段”。
- 结果：阶段、Gate、仪表盘、统计、后续 P1 业务子步骤都会建立在不稳定的状态基础上。

### 4.2 P0-High

#### D. 资料审核闭环只做了一半

- `document-items.service.ts` 仍以 `pending` 为初始状态，而 P0 权威主路径是 `not_sent → waiting_upload → uploaded_reviewing → approved / revision_required / waived / expired`。
- `document-files.service.ts` 在审核文件时只更新 `document_files.review_status`，没有把资料项状态同步推进到 `approved` 或 `revision_required`。
- 结果：资料完成率、待补件、Gate-B 可通过性与实际审核状态之间存在偏差。

#### E. 案件接口与仪表盘接口的权限边界不稳

- `cases.controller.ts` 的 `get / list / transition / billing-risk-ack / post-approval-stage` 没有稳定执行资源级 `canAccessCase / canEditCase` 校验。
- `permissions.service.ts` 自身也只做“manager 或 owner/assistant”的简化判断，没有覆盖文档里“我的 / 本组 / 全所”的完整可见性边界；现有测试甚至允许已分配 `viewer` 编辑案件。
- `dashboard.controller.ts` 允许 `viewer` 直接请求 `scope=all`，而 `dashboard.shared.ts` / `dashboard.service.test.ts` 也印证了 `group` 目前会退化成 `all` 查询。
- 结果：接口层权限与页面规格里的范围切换规则没有对齐。

#### F. 仪表盘聚合明显少于 P0 口径

- `dashboard.shared.ts` 只定义了 `todayTasks / upcomingCases / pendingSubmissions / riskCases` 四张卡。
- `dashboard.service.ts` 也只围绕这四类计数和四块列表面板建模。
- 但 `P0/06-页面规格/仪表盘.md` 要求的还有 `待补件案件`、`审理中案件`、`待回款案件`。
- 当前“即将到期”还直接用 `cases.due_at`，并非文档定义的 `CaseDeadline` 口径。
- 需要注意的是：`riskCases` 已经部分纳入 `billing_unpaid_amount_cached > 0` 和 `validation failed`，因此问题不是“完全没有风险/回款口径”，而是 **没有按 P0 规格拆成明确卡片与来源模型**。

### 4.3 P1-Blocker / P1-High

#### G. P1 核心模型还没真正落地

- 代码库中几乎没有 `CaseWorkflowStep`、`current_workflow_step`、`workflow_steps_blueprint`、`extra_fields_schema`、`survey_data`、`gate_trigger_step`、`reminder_schedule_blueprint` 的正式服务端实现。
- `cases.service.ts` 里对 `postApprovalStage` 的注释也明确说明：这是 P1 正式实体启用前的过渡存储。
- 结果：当前无法判断为满足 P1，只能判断为“有少量预埋字段”。

#### H. 当前的 `postApprovalStage` 不是 P1 正式的业务子步骤层

- 现有值只覆盖 `waiting_final_payment / coe_sent / overseas_visa_applying / entry_success`。
- P1 文档要求的是一整套 `CaseWorkflowStep` 业务步骤，且必须与 `S1-S9` 并行而不互相污染。
- 当前实现本质上是在 P0 案件对象里塞了一个简化版后置状态字段，既不足以承接 P1，也会让 P0 边界变模糊。

#### I. `COE` 尾款门禁不是模板驱动实现

- `billingGuards.ts` 通过 `milestone_name like '%尾款%' / '%final%' / '%結果%'` 推断“尾款”。
- `cases.service.ts` 只在 `postApprovalStage = coe_sent` 时触发该判断。
- 但 P1 权威口径要求的是 `final_payment` 节点 + `BillingPlan.gate_trigger_step=COE_SENT` + `gate_effect_mode=block`。
- 结果：当前门禁更多是启发式规则，不是 P1 正式模型。

#### J. `ResidencePeriod` 同时踩了 P0 越界和 P1 未完成两类问题

- `residencePeriods.service.ts` 现在创建/更新即自动生成 `180 / 90 / 30` 提醒。
- 但 P0 权威口径是：P0 以手动提醒为主，自动批量提醒是 P1。
- 与此同时，当前实现又没有看到 `reminder_schedule_blueprint` 驱动、提醒失败阻止成功结案等 P1 正式收敛要求。
- 结果：这部分既不符合 P0 边界，也还不能证明符合 P1。

## 5. 可以确认的已对齐部分

- `cases.service.ts` 已经对 `S5 → S6` 增加硬门禁：要求最新 `ValidationRun=passed`，且在启用复核模板时要求最新 `ReviewRecord=approved`。
- `review-records.service.ts` 与 `submission-packages.service.ts` 已有“必须引用最新校验/复核记录”的服务端约束，这说明链路并非只有表结构。
- `submissionPackages.service.ts` 已支持补正包与原提交包的 `relatedSubmissionId` 关联，并在创建后推动案件进入 `S7`。
- `document-files.service.ts` 已支持“本地归档路径登记”与“提交包锁定后不可删除”的方向，这与 P0 资料版本不可覆盖、提交包锁定的约束是一致的。
- `dashboard.service.ts` 的 `riskCases` 已部分纳入欠款与校验失败口径，说明“风险聚合”不是从零开始。
- `residence_periods` 相关表、服务、测试已存在，说明 P1 的在留期间能力不是从零开始。

## 6. 整改清单矩阵（规则项 → 服务/API → 测试）

### 6.1 P0 优先整改

| 优先级 | 规则项 | 主要服务 / API | 必补测试 | 验收要点 |
|---|---|---|---|---|
| P0-Blocker | `Case.stage` 成为唯一真相源 | `cases.service.ts`、`cases.controller.ts`、`dashboard.service.ts`、相关查询映射 | 扩 `cases.service.test.ts`：`stage/status` 一致性、流转写入、列表筛选；补阶段历史回归测试 | `transition/list/get/dashboard` 不再以 `status` 充当业务阶段真相 |
| P0-Blocker | 修正 `Gate-B` 触发时机为 `S4 → S5` 进入校验 | `cases.service.ts`、`validationRuns.service.ts`、如需显式入口则同步 `validationRuns.controller.ts` | 扩 `cases.service.test.ts`、`validationRuns.service.test.ts`：`S4→S5` 生成 `ValidationRun`、重复进入幂等/冲突 | 推进到 `S5` 时生成并绑定最新校验，不再要求“事先已有校验” |
| P0-Blocker | 扩充 `ValidationRun` 校验口径 | `validationRuns.service.ts`、相关 `document_items / case_parties / generated_documents` 查询 | 扩 `validationRuns.service.test.ts`：缺主申请人、缺关键字段、必交资料未批、关键文书未定稿、关键对象变更后旧校验失效 | 校验结果覆盖 P0 最小集合，不再只围绕 `generated_documents` |
| P0-Blocker | 把 `Gate-C` 绑定到 `S6 → S7` 主链路 | `cases.service.ts`、`submissionPackages.service.ts`、必要时 `cases.controller.ts` | 扩 `cases.service.test.ts`、`submissionPackages.service.test.ts`：无提交包不得进 `S7`、经创建提交包后才能进 `S7` | 不能通过伪造阶段值绕过提交包创建 |
| P0-High | 补齐 `SubmissionPackage` 服务端快照收口 | `submissionPackages.service.ts` | 扩 `submissionPackages.service.test.ts`：关键字段快照、资料版本、文书版本自动收集；缺关键冻结对象时失败 | 提交包是服务端可追溯快照，而不是调用方自由拼装 |
| P0-High | 打通资料项状态与文件审核联动 | `documentItems.service.ts`、`documentFiles.service.ts` | 扩 `documentItems.service.test.ts`、`documentFiles.service.test.ts`：文件审核后资料项自动进 `approved/revision_required` | 资料状态、待补件、Gate-B 口径一致 |
| P0-High | 收紧案件与仪表盘资源级权限 | `permissions.service.ts`、`cases.controller.ts`、`dashboard.controller.ts`，必要时下沉到 service 兜底 | 扩 `permissions.service.test.ts`、补 `cases.controller.test.ts` / `dashboard.controller.test.ts`：`mine/group/all`、viewer 只读、跨资源拒绝 | 接口层与资源级边界对齐，不再依赖页面侧约束 |
| P0-High | 补齐仪表盘 P0 卡片与截止口径 | `dashboard.shared.ts`、`dashboard.service.ts` | 扩 `dashboard.service.test.ts`：待补件、审理中、待回款、`CaseDeadline` 口径、group 范围 | 仪表盘至少覆盖 P0 要求卡片，`group` 不再退化成 `all` |

### 6.2 P1 正式化整改

| 优先级 | 规则项 | 主要服务 / API | 必补测试 | 验收要点 |
|---|---|---|---|---|
| P1-Blocker | 落地 `CaseWorkflowStep` 正式模型 | 新增/扩 workflow step 相关 `domain/data/service/controller`，并调整 `cases` 聚合出口 | 新增 workflow step 对应 `*.service.test.ts` / `*.controller.test.ts` | P1 子步骤与 `S1-S9` 并行存在，不再塞进 `postApprovalStage` |
| P1-High | 用正式模型替代 `postApprovalStage` 过渡字段 | `cases.service.ts`、相关 DTO / mapper / query | 扩 `cases.service.test.ts`：P0 阶段与 P1 子步骤互不污染 | P0 阶段保持稳定，P1 业务流另起模型 |
| P1-High | 将 `COE` 尾款门禁改为模板驱动 | `billingGuards.ts`、`cases.service.ts`、模板配置解析链路 | 扩相关 service test：`gate_trigger_step`、`gate_effect_mode`、已结清/未结清分支 | 规则由模板配置驱动，而不是 `like '%尾款%'` 启发式判断 |
| P1-High | 将 `ResidencePeriod` 提醒迁移为 blueprint 驱动 | `residencePeriods.service.ts`、提醒调度相关模块 | 扩 `residencePeriods.service.test.ts`：blueprint 生成、失败处理、与 P0 手动提醒边界 | 去掉 P0 越界的固定 `180/90/30` 自动计划，改成 P1 正式机制 |

## 7. 推荐实施顺序

1. **先修 `Case.stage` 真相源**，否则 Gate、Dashboard、统计和后续 P1 扩展都会建立在不稳定状态上。
2. **再修 `Gate-B` 时机 + `ValidationRun` 校验范围**，把“进入校验”与“校验内容”同时拉回权威口径。
3. **然后把 `Gate-C` 绑进 `S6 → S7` 主链路**，确保无法跳过 `SubmissionPackage`。
4. **再补 `SubmissionPackage` 自动快照收口**，把“latest validation/review”升级成完整提交快照。
5. **之后处理资料状态联动、权限边界、Dashboard 卡片与范围**，完成 P0 外露能力闭环。
6. **最后隔离并正式化 P1**，把 `postApprovalStage`、`COE` 门禁、提醒链路迁回 P1 模型。

## 8. 缺失项

- 本文仅基于服务端代码、测试与权威文档做静态审阅，没有执行运行态联调。
- 本文没有覆盖 `packages/admin`、`packages/mobile` 或原型端是否已经用前端逻辑兜底这些缺口。
- 本文虽已补充“规则项 → 服务/API → 测试”矩阵，但还没有下钻到每个 SQL / DTO / controller contract 的逐项实现设计。

## 9. 引用

- `docs/gyoseishoshi_saas_md/P0/03-业务规则与不变量.md`
- `docs/gyoseishoshi_saas_md/P0/04-核心流程与状态流转.md`
- `docs/gyoseishoshi_saas_md/P0/06-页面规格/案件.md`
- `docs/gyoseishoshi_saas_md/P0/06-页面规格/仪表盘.md`
- `docs/gyoseishoshi_saas_md/P0/07-数据模型设计.md`
- `docs/gyoseishoshi_saas_md/P0/08-术语表.md`
- `docs/gyoseishoshi_saas_md/P1/01-经营管理签扩展范围与落地计划.md`
- `docs/gyoseishoshi_saas_md/P1/02-经营管理签技术落地清单.md`
- `plan/server-p0-p1-remediation-plan.md`
