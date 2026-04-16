# Server P0 / P1 修复实施计划

## 1. 目标

基于当前 `packages/server` 审查结果，先把服务端拉回 **P0 可闭环、P1 不越界** 的状态，再决定是否继续补齐 P1 能力。原则：

1. 先修会导致主链路断裂的问题
2. 先对齐 P0 权威文档，再保留 P1 预留
3. 每个逻辑修复必须配对应单测
4. 收尾固定执行：`npm run fix` → `npm run guard`

## 2. 修复优先级

### P0-Blocker（必须先修）

1. 打通 `ValidationRun / ReviewRecord / SubmissionPackage` 真闭环
2. 重写 Gate-A / Gate-B / Gate-C 的职责边界
3. 补上 Gate-C 的“提交最小信息”硬校验
4. 让 `document_files` 真正支持 P0 要求的本地归档登记

### P0-High（紧随其后）

5. 建立“重新校验触发条件”机制，避免复用旧校验结果
6. 清理 `status / stage / postApprovalStage` 的真值边界

### P1-Boundary（延后处理）

7. 隔离 P1 的自动提醒、post-approval 子步骤、block 收费门禁
8. 保留字段/开关，但避免默认污染 P0 主链路

## 3. 工作流与改动点

### 工作流 A：补齐 Validation / Review 主链

**目标**：让 `S4 → S5 → S6 → S7` 变成真实可执行链路，而不是依赖库里先有数据。

**改动点**：
- 新增 `ValidationRuns` 的 service/controller：执行校验、生成 `validation_runs`
- 新增 `ReviewRecords` 的 service/controller：登记复核通过/驳回
- `CasesService.transition` 只做阶段门禁，不再假设校验记录已天然存在
- `SubmissionPackagesService.create` 继续引用“最新有效校验”，但引用来源必须能通过 API 产生
- `AppModule` 注册新模块

**涉及文件（修改）**：
- `packages/server/src/app.module.ts`
- `packages/server/src/modules/core/cases/cases.service.ts`
- `packages/server/src/modules/core/submission-packages/submissionPackages.service.ts`
- `packages/server/src/infra/db/drizzle/schema.ts`（仅当类型映射缺失时）

**涉及文件（新增）**：
- `packages/server/src/modules/core/validation-runs/validationRuns.controller.ts`
- `packages/server/src/modules/core/validation-runs/validationRuns.service.ts`
- `packages/server/src/modules/core/review-records/reviewRecords.controller.ts`
- `packages/server/src/modules/core/review-records/reviewRecords.service.ts`
- 对应测试文件各 1~2 个

### 工作流 B：重构 Gate-A / Gate-B / Gate-C

**目标**：和 P0 文档对齐，避免“前面卡太死、后面放太松”。

**改动点**：
- Gate-A：只校验“进入文书”的最低门槛，不再等同于全部必交资料已齐
- Gate-B：校验关键文书已定稿、必交资料齐备且通过、关键字段必填完成，并生成 `ValidationRun`
- `S5 → S6`：校验最新 `ValidationRun=passed`，若启用复核则要求最新 `ReviewRecord=approved`
- Gate-C：仅在“正式提交 / 生成提交包”时校验提交信息最小集与欠款风险确认

**涉及文件（修改）**：
- `packages/server/src/modules/core/cases/cases.service.ts`
- `packages/server/src/modules/core/submission-packages/submissionPackages.service.ts`
- `packages/server/src/modules/core/cases/cases.controller.ts`（若需新增显式执行校验入口）

**建议新增测试**：
- `cases.service.s4-validation.test.ts`
- `cases.service.test.ts`
- `submissionPackages.service.test.ts`
- `cases.controller.test.ts`

### 工作流 C：补上 Gate-C 提交最小信息校验

**目标**：禁止生成“已提交但缺关键留痕”的提交包。

**最小必填建议**：
- `submittedAt`
- `authorityName`
- `acceptanceNo` 或 `receipt*`（按最终业务口径二选一/并存）

**涉及文件（修改）**：
- `packages/server/src/modules/core/submission-packages/submissionPackages.controller.ts`
- `packages/server/src/modules/core/submission-packages/submissionPackages.service.ts`
- `packages/server/src/modules/core/submission-packages/submissionPackages.service.test.ts`

### 工作流 D：落实 P0 本地归档登记模型

**目标**：让 `document_files` 真正符合“本地归档登记为主”的 P0 口径。

**改动点**：
- `DocumentFile` 实体补齐 `storageType / relativePath / capturedByType / capturedById / capturedAt`
- `DocumentFilesService` 支持“登记本地归档版本”而不强依赖二进制上传
- `DocumentFilesController` 增加/调整入参，支持录入本地相对路径
- 明确 `fileUrl` 与 `relativePath` 的职责；P0 默认走 `local_server + relative_path`

**涉及文件（修改）**：
- `packages/server/src/modules/core/model/coreEntities.ts`
- `packages/server/src/modules/core/document-files/documentFiles.service.ts`
- `packages/server/src/modules/core/document-files/documentFiles.controller.ts`
- `packages/server/src/modules/core/document-files/documentFiles.service.test.ts`
- `packages/server/src/modules/core/document-files/documentFiles.controller.test.ts`

### 工作流 E：重新校验触发条件

**目标**：关键资料/字段/文书变化后，旧校验结果不能继续直接用于提交。

**改动点**：
- 在 `document-files` / `document-items` / `case-parties` / `generated-documents` / 关键 case 字段变更后，标记校验失效或要求重新执行校验
- `SubmissionPackagesService` 只接受最新仍有效的 `ValidationRun`

**优先涉及文件（修改）**：
- `packages/server/src/modules/core/document-files/documentFiles.service.ts`
- `packages/server/src/modules/core/document-items/documentItems.service.ts`
- `packages/server/src/modules/core/case-parties/caseParties.service.ts`
- `packages/server/src/modules/core/cases/cases.service.ts`
- `packages/server/src/modules/core/submission-packages/submissionPackages.service.ts`

### 工作流 F：隔离 P1 提前落地逻辑

**目标**：保留预留，不默认干扰 P0。

**改动点**：
- `ResidencePeriodsService` 的自动生成提醒能力降级为 P1 开关或停用
- `post-approval-stage` 入口避免作为 P0 主链路必经路径
- `billingGuards` 中 `block` 模式不得作为 P0 默认行为

**涉及文件（修改）**：
- `packages/server/src/modules/core/residence-periods/residencePeriods.service.ts`
- `packages/server/src/modules/core/cases/cases.service.ts`
- `packages/server/src/modules/core/cases/cases.controller.ts`
- `packages/server/src/modules/core/billing/billingGuards.ts`
- 对应测试文件

## 4. 推荐实施顺序

1. 工作流 A：先打通校验/复核/提交主链
2. 工作流 B + C：再校正 Gate 规则和提交最小信息
3. 工作流 D：补 P0 本地归档登记
4. 工作流 E：补重新校验机制
5. 工作流 F：隔离 P1 提前落地逻辑

## 5. 验收清单

- `S4 → S5` 能生成 `ValidationRun`
- `S5 → S6` 严格依赖最新 `ValidationRun=passed`
- 启用复核时，`S5 → S6` 依赖最新 `ReviewRecord=approved`
- `S6 → S7` 只能通过生成 `SubmissionPackage` 完成
- 提交包缺少提交最小信息时必须失败
- 欠款风险在 P0 为 `warn + 风险确认留痕`，不是统一 `block`
- `document_files` 能登记 `local_server + relative_path`
- 关键对象变化后，旧校验结果不能继续直接复用

## 6. 执行命令

```bash
npm run fix
npm run guard
```

## 7. 备注

本计划先以 **P0 纠偏** 为主，不建议在修复过程中顺手扩展新的 P1 功能。P1 相关代码优先做“隔离/降级/受开关控制”，而不是继续外扩。
