# 74 — 咨询 → 客户 → 案件 转化全链路走查（2026-05-08 第五轮 / chrome-devtools-mcp）

> 日期：2026-05-08（第五轮 / 转化链路专项）
>
> 走查路径：仪表盘 → 咨询列表 → **新建咨询** → 咨询详情（基础 / 转化 Tab） →
> **状态推进**（新咨询 → 跟进中 → 待签约 → 已签约） → **签约并开始建档**（一键创建客户 + 案件） →
> 客户详情（基础 / 关联案件） → 案件详情（概览 / 资料清单 / 任务 / 提交前检查 / 基础信息 / 日志） →
> 咨询日志回看 → 案件列表回看
>
> 登录账号：`admin@local.test` / `Admin123!`（Local Demo Office）
>
> 链路三件套（V5 现场创建）：
>
> - 线索 **LEAD-202605-0010** / id=`fd3627bb-b5ea-454b-92a9-cd876c4d64d7`（R-FLOW-V5 走查申请人 / 家族滞在）
> - 客户 **CUS-202605-0015** / id=`ba90e062-dc56-4ea5-9f7e-e32090dc021c`
> - 案件 **CASE-202605-0011** / id=`8d8279a8-fd8e-4f1f-b58e-7f6d4d3fa6dd`
>
> 截图目录：`tmp/walkthrough-2026-05-08-v5/`（21 张）
>
> 上游权威：
>
> - [70-MCP-walkthrough-2026-05-08-v2.md](./70-MCP-walkthrough-2026-05-08-v2.md)（咨询/客户/案件全链路第二轮 — NEW-1/2/4 + P0-2 来源）
> - [73-MCP-case-walkthrough-2026-05-08-v4.md](./73-MCP-case-walkthrough-2026-05-08-v4.md)（案件流程第四轮 — V3-1/2/3 来源）
> - [P0/04-核心流程与状态流转.md §4.1 咨询转案件](../P0/04-核心流程与状态流转.md#41-咨询转案件)

---

## 0. 总结

本轮专项走查覆盖**咨询→客户→案件转化全链路 21 张截图**，重点验证 LEAD 状态机白名单、签约后一键建档、转化产物展示与跨模块跳转。

- **链路自身工作**：从 0 创建线索 → 4 步状态推进 → 一键转化为客户 + 案件 → 跨模块跳转回看，全程无报错；服务端在毫秒内同步生成 CUS-202605-0015 + CASE-202605-0011；线索详情立刻刷新到「已创建案件」状态并露出「查看客户 / 查看案件」头部按钮。
- **回归 PASS（70 报告 NEW-1/2/4 + P0-2 + 73 报告 V3-1/2 全部修复确认）**：
  - 客户摘要案件名称（`displayName · 家族滞在` 正确本地化，无 `dependent_visa` 原始 slug 泄漏）
  - 客户关联案件「案件」列（显示「R-FLOW-V5 走查申请人 · 家族滞在」，不再回退到 `case_no`）
  - 案件列表「检查」列（zh-CN 显示「待检查」，无原始英文 `pending`）
  - 提交前检查阻断条目明细（重新检查后产出 1 卡点 + 1 仅提示，标题/正文均本地化）
  - 案件基础信息关联主体角色（显示「主申请人」，不再泄漏 `cases.detail.info.relatedParties.rolePrimary` raw key）
- **本轮新发现 NEW-V5-1（P1）/ NEW-V5-2（P1）/ NEW-V5-4（P2）全部已修复**（均落地于本仓代码 + 单测 + integration-pg，详见 §1 各条 `修复落点`）。
- **NEW-V5-3（P2）随 NEW-V5-1 同步修复**。
- **70 §NEW-3 DATA-STALE 一并关闭（2026-05-08 同日）**：seed 自愈口径补齐（`seedCases` 改 `DO UPDATE`），CASE-DEV-002 在下一次 `npm run db:seed-dev` 后类型列自动收敛到「技人国（认定）」，详见 §1.4。
- **本轮无 P0 新增**。
- **修复回写**（2026-05-08 同日）：
  - **NEW-V5-1 / NEW-V5-3 已修复**：`LeadConvertCaseDialog.vue` 通过 `useI18n()` 取出 `locale` 并显式传给 `getActiveGroupAliasOptions(locale.value)`；新增 `LeadConvertCaseDialog.group-locale.test.ts` 三语回归（zh-CN→「东京一组」/ ja-JP→「東京一組」/ en-US→「Tokyo Team 1」），与同模块 `LeadConvertedRecords.vue:65, 112` 现有调用对齐。
  - **NEW-V5-4 已修复**：`leads.admin.convert-case.ts` 在创建案件后、写 lead_logs 之前向 `timeline_logs` 插入一条 `case.converted_from_lead`（`entityType=case`/`entityId=caseId`/`payload={leadId,leadNo,customerId}`），与 LEAD 侧 `lead.converted_case` 形成双向可追溯对；`CaseCommsTimelineBuilders.ts` 新增同名 builder（`leadRef = leadNo || leadId.slice(0,8)`），三语 i18n 落到 `cases.log.timeline.caseConvertedFromLead`（zh-CN「由线索 LEAD-XXX 转化而来」/ ja-JP「リード LEAD-XXX から転化」/ en-US「Converted from lead LEAD-XXX」）。回归覆盖：`CaseCommsTimelineBuilders.convertedFromLead.test.ts`（builder 单测 + adaptCaseLogDto 端到端）、`CaseCommsLogsAdapter.timeline-i18n-roundtrip.test.ts` 三语渲染、`leadsConvertCasePath.pg.test.ts` 新增「convertCase writes case.converted_from_lead timeline on case side」断言 timeline_logs 行写入。
  - **NEW-V5-2 已修复**：`types-detail.ts` 的 `ConvertedCase` 接口新增独立 `caseNo` 字段；`LeadConversionMapper.adaptConvertedCaseDto` 把 `title` 与 `caseNo` 拆开输出（`title: title \|\| caseNo`、`caseNo: caseNo`），消除「caseNo 反向覆盖 title」的优先级反转；`LeadConvertedRecords.vue` 案件卡片标题行改为 `title \|\| caseNo \|\| id`、副标题行改为 `caseNo \|\| id`，与客户卡片 `name`/`meta` 拆分一致。新增 4 条单测（mapper 2 + records 2）+ 修正 1 条既有 fixture，`leads` 包 612 用例全部 PASS。

---

## 1. 本轮新发现

### 1.1 P0 / 链路阻断

**无**。

### 1.2 P1

#### NEW-V5-1 「签约并开始建档」对话框组下拉显示日文 `東京一組`（zh-CN locale） — **FIXED（2026-05-08）**

| 项 | 内容 |
|---|------|
| 现象 | LEAD-202605-0010 转化对话框「所属组（可选）」下拉默认值与候选项均显示日文全角字符 `東京一組`，而当前 UI locale 为 zh-CN（其它位置均显示「东京一组」） |
| 截图 | `04-conversion-modal-signed.png` |
| 关键代码 | `packages/admin/src/views/leads/components/LeadConvertCaseDialog.vue` L46<br>`packages/admin/src/shared/model/useGroupOptions.ts` L228–241、L115–121 |
| 根因 | `LeadConvertCaseDialog.vue:46` 调用 `getActiveGroupAliasOptions()` 时**未传 locale**，落入 `normalizeGroupLocale` 的默认分支（`return "ja-JP"`，见 L120），导致返回的 label 永远是 `labels["ja-JP"]`（即「東京一組」），与当前 i18n 上下文脱钩 |
| 修复方案 | 与同模块 `LeadConvertedRecords.vue:65, 112` 的现有调用对齐：在 dialog 内 `useI18n()` 取出 `locale`，改为 `getActiveGroupAliasOptions(locale.value)`。或在 `useGroupOptions.ts:120` 把默认 locale 调成 `zh-CN`（更危险，可能破坏 ja-JP 测试快照） |
| 修复模块 | `admin/views/leads/components/LeadConvertCaseDialog.vue` |
| 单测建议 | 新增 `LeadConvertCaseDialog.group-locale.test.ts`：mount 时传入 zh-CN i18n，断言下拉 option label 为「东京一组」；同样覆盖 ja-JP / en-US 三语 |
| 优先级 | **P1**（功能可用但 UX 不一致；与同页面其它 zh-CN「东京一组」并列时降低信任） |
| 修复落地 | 2026-05-08 同日 — `LeadConvertCaseDialog.vue` 改为 `const { t, locale } = useI18n()` + `getActiveGroupAliasOptions(locale.value)`；新增 `LeadConvertCaseDialog.group-locale.test.ts`（3 用例 / 三语全部 PASS：zh-CN→「东京一组」、ja-JP→「東京一組」、en-US→「Tokyo Team 1」）。原有 `LeadConvertCaseDialog.test.ts`（17 用例）+ `LeadConvertCaseDialog.bmv-gate.test.ts`（6 用例）回归通过。 |

#### NEW-V5-2 线索转化结果卡片：案件标题落到 `case_no`，且与副标题重复 — **FIXED（2026-05-08）**

| 项 | 内容 |
|---|------|
| 现象 | 线索详情「转化信息」Tab「已生成记录」中，**客户卡片**正常（标题：客户名「R-FLOW-V5 走查申请人」/ 副标题：「CUS-202605-0015 · 东京一组 · 2026/05/08 17:22」），但**案件卡片**异常：标题与副标题**全都是**「CASE-202605-0011」（案件编号），不显示真实案件标题「R-FLOW-V5 走查申请人 · 家族滞在」 |
| 截图 | `15-lead-conversion-final.png`、`05-conversion-result.png` |
| 关键代码 | `packages/admin/src/views/leads/model/LeadConversionMapper.ts` L58–69（`adaptConvertedCaseDto`）<br>`packages/admin/src/views/leads/components/LeadConvertedRecords.vue` L101–109 |
| 根因（双重） | **(a) Mapper 优先级反转**：`LeadConversionMapper.ts:63` 写成 `title: readString(r, "caseNo") \|\| readString(r, "title")`，把 `caseNo` 排在 `title` 之前，导致只要 `caseNo` 存在就永远拿不到真实案件标题（与同文件 `adaptConvertedCustomerDto` 的 `name: displayName \|\| name` 优先级风格不一致）<br>**(b) 模板字段重复**：`LeadConvertedRecords.vue:102, 108` 两个 `<p>` 都使用同一表达式 `conversion.convertedCase!.title \|\| conversion.convertedCase!.id`，等于把同一字段渲染两次。应拆为 `name = caseTitle`、`meta = caseNo`（参考客户卡片 L56 vs L60 的两段拆分） |
| 修复方案 | 1. `LeadConversionMapper.ts:62-63` 调整为 `title: readString(r, "title") \|\| readString(r, "caseNo")`，并新增 `caseNo: readString(r, "caseNo")` 字段（同时更新 `ConvertedCase` 类型）<br>2. `LeadConvertedRecords.vue:102` 改为 `{{ conversion.convertedCase!.title \|\| conversion.convertedCase!.caseNo \|\| conversion.convertedCase!.id }}`<br>3. `L108` 改为 `{{ conversion.convertedCase!.caseNo \|\| conversion.convertedCase!.id }}`（与客户卡片对齐） |
| 修复模块 | `admin/views/leads/model/LeadConversionMapper.ts` + `admin/views/leads/components/LeadConvertedRecords.vue` + `types-detail.ts` 的 `ConvertedCase` 接口 |
| 单测建议 | 1. `LeadConversionMapper.conversion.test.ts` 增「title/caseNo 同时存在时优先 title」用例<br>2. `LeadConvertedRecords.test.ts` 增「title 命中时不再回退 caseNo / 显示 title 在第一行 + caseNo 在第二行」用例 |
| 优先级 | **P1**（视觉级；与 70 报告 NEW-1/NEW-2 同类问题，但落在 LEAD 转化 Tab 这条入口） |
| 修复落地 | 2026-05-08 同日 — (a) `types-detail.ts` `ConvertedCase` 接口新增 `caseNo?: string \| null`；(b) `LeadConversionMapper.adaptConvertedCaseDto` 改为 `title: readString(r, "title") \|\| caseNo`，并将 `caseNo: readString(r, "caseNo")` 单独输出；(c) `LeadConvertedRecords.vue` 案件卡片标题行改为 `title \|\| caseNo \|\| id`、副标题行改为 `caseNo \|\| id`，与客户卡片 `name`/`meta` 拆分对齐。<br>单测：`LeadAdapterMappers.conversion.test.ts` 新增「title 优先于 caseNo 且独立暴露 caseNo」+「title 缺失时回退 caseNo」共 2 用例；`LeadConvertedRecords.test.ts` 新增「title 在第一行、caseNo 在第二行无重复」+「title 缺失时第一行回退 caseNo」共 2 用例；同时把既有 `rendersCaseNoForCase` 测试 fixture 补齐 `caseNo` 字段以匹配新模型。`leads` 包 612 用例全部 PASS（含 `LeadAdapterMappers.conversion.test.ts` 16 用例 / `LeadConvertedRecords.test.ts` 10 用例）；`vue-tsc --noEmit` + `eslint` 涉及文件均 0 错。 |

### 1.3 P2 — 微小观察（不阻断）

#### NEW-V5-3 转化对话框「所属组」placeholder 与正常选项 locale 不一致 — **FIXED（随 NEW-V5-1）**

| 项 | 内容 |
|---|------|
| 现象 | placeholder「留空则沿用线索所属组」是 zh-CN（取自 i18n key），但下拉选项「東京一組」是 ja-JP（见 NEW-V5-1）；同一下拉内出现两套语言 |
| 截图 | `04-conversion-modal-signed.png` |
| 优先级 | P2（属于 NEW-V5-1 的衍生现象，修复后自动消失） |
| 处置 | 与 NEW-V5-1 合并修复 |
| 修复落地 | 2026-05-08 同日 — 随 NEW-V5-1 一并修复；`LeadConvertCaseDialog.group-locale.test.ts` zh-CN 用例间接锁定本现象不复发（option label 已与 placeholder 同语种）。 |

#### NEW-V5-4 案件日志缺「由 LEAD-XXX 转化而来」记录 — **已修复（2026-05-08 同日）**

| 项 | 内容 |
|---|------|
| 现象 | CASE-202605-0011 日志 Tab 仅有「案件创建：家族滞在」+「提交前检查未通过」两条，**没有指向源 LEAD-202605-0010 / CUS-202605-0015 的转化来源记录**。需要从客户、再从客户 → 线索三跳追溯（线索日志 Tab `15-lead-conversion-final.png` 仅记录在 LEAD 侧） |
| 截图 | `13-case-log.png` 对照 `14-lead-log.png` |
| 影响 | 风控审计回溯效率低；从案件视角无法看到转化路径全貌 |
| 建议 | 案件创建时若 `source.lead_id` 非空，操作日志额外写一条「由线索 LEAD-XXX 转化而来」+ `customerId / leadId` 引用（与 LEAD 侧的「已建案件：CASE-XXX」对称） |
| 优先级 | P2（信息可达；只是单向） |
| 修复 | 1. `packages/server/src/modules/core/leads/leads.admin.convert-case.ts` 在 `casesService.create` 之后、`writeAudit` 之前，对 `timeline_logs` 插入 `entity_type='case' / action='case.converted_from_lead' / payload={leadId, customerId, leadNo?}`（actor 为当前 ctx.userId）<br>2. `packages/admin/src/views/cases/model/CaseCommsTimelineBuilders.ts` 新增 `case.converted_from_lead` builder：`leadRef = leadNo \|\| leadId.slice(0,8)`，导出 i18n key `cases.log.timeline.caseConvertedFromLead`<br>3. `packages/admin/src/i18n/messages/cases/{zh-CN,ja-JP,en-US}.ts` 三语补 `caseConvertedFromLead` 文案（zh-CN「由线索 {leadRef} 转化而来」/ ja-JP「リード {leadRef} から転化」/ en-US「Converted from lead {leadRef}」） |
| 测试 | 1. `packages/admin/src/views/cases/model/CaseCommsTimelineBuilders.convertedFromLead.test.ts`：builder 在 `leadNo` 命中 / 仅 `leadId` 回退 / snake_case payload / 全空 / `resolveLogCategory` 落到 operation / `adaptCaseLogDto` 端到端共 6 个用例<br>2. `CaseCommsLogsAdapter.timeline-i18n-roundtrip.test.ts` 新增三语渲染回归 + `leadId` 8 位前缀回退（zh-CN）共 4 个用例<br>3. `packages/server/tests/integration-pg/leadsConvertCasePath.pg.test.ts` 新增「convertCase writes case.converted_from_lead timeline on case side」用例：调用 `convertCase` 后 `select * from timeline_logs where entity_type='case' and action='case.converted_from_lead'` 必须返回 1 行，且 `payload.leadId / customerId / leadNo` 三字段非空 |

### 1.4 数据陈旧（沿用） — **FIXED（2026-05-08 同日）**

- **CASE-DEV-002 类型列仍是「家族滞在」**：与 70/72/73 报告一致。**根因复盘**：`packages/server/src/scripts/seedDevData.ts` `seedCases` 的两段 INSERT 都使用 `ON CONFLICT (id) DO NOTHING`，历史 seed 写入的旧 `case_type_code` 永远不会被新 seed 覆盖，所以 70 §1.NEW-3 提议的「下次 `npm run seed` 由 seed 修复」根本不会触发。
- **修复**：把 `seedCases` 两段 INSERT 改为 `ON CONFLICT (id) DO UPDATE SET case_type_code = EXCLUDED.case_type_code, case_name = EXCLUDED.case_name`（与同模块 `template_releases` `seedDevData.ts:266-269` 及 `seedCaseTemplates.ts:67-73` 的自愈口径对齐）；只更新外显字段，**不重置** `status / stage / business_phase`，避免把开发者手动推进的状态冲掉。
- **测试**：
  1. `packages/server/src/scripts/seedDevData.cases-idempotent.test.ts`（新增 3 用例）：
     - 「`INSERT INTO cases` 必须 `DO UPDATE` 不得 `DO NOTHING`」（正则锁）
     - 「`DO UPDATE SET` 必须覆盖 `case_type_code` 与 `case_name`（CASE-DEV-002 自愈）」（运行时 SQL 断言）
     - 「`DO UPDATE SET` 不得重置 `status/stage/business_phase`（防止冲掉 dev-edited 状态）」
  2. `packages/admin/src/views/cases/model/seedDevData.case-type-code-i18n.contract.test.ts`：把抽取正则补上 trailing-comma 兼容（多行数组字面量），从仅覆盖 2 个 code（`business_manager_visa` / `family_stay`，CASE-DEV-002 长期被静默跳过——这正是当初 70 NEW-3 没被契约测试拦下的原因）扩展到 3 个 code，新增「extracts at least 3 distinct case_type_code」+「includes engineer_humanities_intl_visa (CASE-DEV-002)」共 2 用例 + 三语 i18n 解析对 `engineer_humanities_intl_visa` 的 3 用例（共 14 用例 PASS，原 9 用例）。
- **回归口径**：DATA-STALE 不再「等下一次 seed」就能修；本次提交后任何运行 `npm run db:seed-dev`（或 `db:seed-dev:smoke`）的 dev DB 即会把 CASE-DEV-002 的 `case_type_code` 自动收敛到 `engineer_humanities_intl_visa`，UI 类型列回到「技人国（认定）」（zh-CN）/「技人国（認定）」（ja-JP）/「Engineer/Specialist (CoE)」（en-US）。
- **70 NEW-3 回归**：本条修复直接关闭 70 报告 §1.NEW-3 的「P1 衍生」尾巴，70 NEW-3 本轮状态由 **DATA-STALE → FIXED**。

---

## 2. 上轮（70 / 73）问题回归

> 回归方法：UI 行为复测（chrome-devtools-mcp）+ adapter 输出抽查
> 回归日期：2026-05-08（第五轮）

| 上游问题 ID | 来源 | 上轮结论 | 本轮回归 | 备注 |
|---|---|---|---|---|
| 70 §1 P0-2 | 提交前检查仅见摘要无明细 | FIXED（仅前端 fallback）| **PASS** | CASE-202605-0011 重新检查后生成 1 卡点 + 1 仅提示，标题/正文/补充说明均本地化（`11-case-validation-after-recheck.png`）；后端 `validation_runs.report_payload` 已写入完整 `blocking[]`/`warnings[]` 详细对象 |
| 70 §NEW-1 | 客户摘要混入 `dependent_visa` raw slug | FIXED | **PASS** | CUS-202605-0015 案件摘要显示「R-FLOW-V5 走查申请人 · 家族滞在」（`06a-customer-basic.png`） |
| 70 §NEW-2 | 客户关联案件「案件」列只显 case_no | FIXED | **PASS** | CASE-202605-0011 列「案件」=「打开案件 R-FLOW-V5 走查申请人 · 家族滞在」（`06b-customer-cases.png`） |
| 70 §NEW-3 | CASE-DEV-002 类型与标题不自洽 | DATA-STALE | **FIXED** | seed 改为 `ON CONFLICT DO UPDATE` 自愈外显字段；详见 §1.4 |
| 70 §NEW-4 | 案件列表「检查」列原始英文 | FIXED | **PASS** | 全部 31 条 case 显示「待检查」/「已通过」/「未通过」（`16-cases-list.png`） |
| 73 §1.1 V3-1 | 提交前检查 info 区块 i18n | FIXED | **PASS** | CASE-202605-0011 验证 info 卡片显示「所有文书需定稿 / 所有生成的文书必须为定稿或已导出状态」（`11-case-validation-after-recheck.png`） |
| 73 §1.2 V3-2 | 关联主体角色 raw key | FIXED | **PASS** | CASE-202605-0011 关联主体显示「主申请人」（`12-case-info.png`） |
| 73 §1.3 V3-3 | 新建向导 step2 命名口径 | FIXED | 未复测 | 本轮通过「签约并开始建档」入口而非新建案件向导，跳过 |

---

## 3. 截图索引

| 编号 | 文件 | 内容 | 关联结论 |
|---|---|---|---|
| 01 | `01-leads-list.png` | 线索列表（zh-CN，10 → 11 条） | 起点 |
| 02 | `02-lead-create-dialog.png` | 新建线索对话框（空表） | — |
| 02b | `02b-lead-create-filled.png` | 新建线索（已填）| 「创建线索」按钮根据校验启用 |
| 03a | `03a-lead-detail-basic.png` | LEAD-202605-0010 详情 — 基础信息 | — |
| 03b | `03b-lead-detail-conversion-locked.png` | 转化 Tab — 「新咨询」状态下两按钮均 disabled | 状态白名单工作 |
| 03c | `03c-lead-status-modal.png` | 调整状态对话框 — 仅「跟进中」可选 | 状态白名单 |
| 03d | `03d-lead-detail-conversion-unlocked.png` | 已签约状态 — 头部 banner + 转化按钮均启用 | 解锁路径 |
| 04 | `04-conversion-modal-signed.png` | 签约并开始建档对话框 | **NEW-V5-1**（東京一組 ja-JP 漏出 zh-CN UI） |
| 05 | `05-conversion-result.png` | 转化成功 — 已生成记录卡片 + 头部「查看客户 / 查看案件」 | **NEW-V5-2**（案件标题为 case_no） |
| 06a | `06a-customer-basic.png` | CUS-202605-0015 详情 — 基础信息 + 案件摘要 | 70 NEW-1 PASS |
| 06b | `06b-customer-cases.png` | 客户关联案件 Tab | 70 NEW-2 PASS |
| 07 | `07-case-overview.png` | CASE-202605-0011 概览 | 关联客户卡片 PASS |
| 08 | `08-case-documents.png` | 资料清单 0/10（家族滞在模板自动展开） | 70 P0-1 PASS（前往「系统设置」链接） |
| 09 | `09-case-tasks.png` | 任务列表（自动生成「邀请客户上传基础资料」+「确认客户初次面谈」） | — |
| 10 | `10-case-validation-initial.png` | 提交前检查初始态（无运行）| 「校验通过，无阻断项」（待运行） |
| 11 | `11-case-validation-after-recheck.png` | 提交前检查 — 重新检查后 | **70 P0-2 PASS**（卡点 1 + 仅提示 1，full i18n） |
| 12 | `12-case-info.png` | 基础信息 — 关联主体「主申请人」 | **73 V3-2 PASS** |
| 13 | `13-case-log.png` | 案件日志 | **NEW-V5-4** 缺「由 LEAD-XXX 转化」记录 |
| 14 | `14-lead-log.png` | 线索日志 — 完整 6 条状态流 + 转化记录 | 审计完整 |
| 15 | `15-lead-conversion-final.png` | 线索转化 Tab 终态（已生成记录）| **NEW-V5-2**（同 `05`） |
| 16 | `16-cases-list.png` | 案件列表 — 31 条（CASE-202605-0011 在首位）| 70 NEW-4 PASS、CASE-DEV-002 DATA-STALE 持续 |

---

## 4. 不在本轮范围

- 线索 dedup（重复识别）路径：本轮线索的电话/邮箱独立，未触发 dedup 提示；保留首轮覆盖
- 「仅建立客户档案」分支（不带案件）：本轮走「签约并开始建档」一键路径
- 后段流程（COE 发送、海外贴签、回执登记）：与 73 报告范围一致
- ZIP 导出 / 双人复核 / 风险标签：明确「未上线」

---

## 5. 待回灌（file-back 候选）

> 与 `AGENTS.md` Karpathy 编译式沉淀闭环对齐。

### 5.1 P1 后续修复建议

- **NEW-V5-1 / NEW-V5-3 已修复**（2026-05-08 同日，见 §1.2 表格末行）：`LeadConvertCaseDialog.vue:46` 已改为 `getActiveGroupAliasOptions(locale.value)`；新增 `LeadConvertCaseDialog.group-locale.test.ts` 三语 PASS。后续仍建议 audit 全仓 `getActiveGroupAliasOptions()` 的其他无参调用点，统一注入 locale，避免同类回归。
- **NEW-V5-2 已修复**（2026-05-08 同日，见 §1.2 表格末行）：两个责任点均已落地——
  1. `LeadConversionMapper.adaptConvertedCaseDto`：`title` 与 `caseNo` 拆开输出（`title: title || caseNo`、`caseNo: caseNo`），并在 `ConvertedCase` 类型上新增 `caseNo` 字段。
  2. `LeadConvertedRecords.vue`：案件卡片标题行 `title || caseNo || id`、副标题行 `caseNo || id`，与客户卡片 `name`/`meta` 拆分一致。
  - 单测：`LeadAdapterMappers.conversion.test.ts` 新增 2 条 + 修正 1 条 `toEqual`；`LeadConvertedRecords.test.ts` 新增 2 条 + 修正 1 条 fixture；`leads` 包 612 用例全部 PASS。
  - 后续仍建议把「显示型 adapter 字段优先级一致性」沉淀到 §5.2 ESLint 规则候选，避免再次 mapper 反向覆盖。
- **NEW-V5-4 已修复**（2026-05-08 同日，见 §1.3 表格末行）：`leads.admin.convert-case.ts` 在创建案件后向 `timeline_logs` 写入 `case.converted_from_lead`，案件侧 timeline / 日志 Tab 直接显示「由线索 LEAD-XXX 转化而来」。前端 i18n key + builder + 单测 + integration-pg 写入断言均同步落地。后续仍建议把「跨实体转化必须双向留痕」沉淀到 §5.2 P0/04 数据契约。
- **70 §NEW-3 DATA-STALE 已修复**（2026-05-08 同日，见 §1.4）：`seedDevData.seedCases` 改 `DO UPDATE`，CASE-DEV-002 自愈；新增 `seedDevData.cases-idempotent.test.ts` 3 用例，并修正既有 `seedDevData.case-type-code-i18n.contract.test.ts` 抽取正则（多行数组+trailing comma 兼容），覆盖度由 2 个 code 扩展到 3 个 code（含 `engineer_humanities_intl_visa`）。

### 5.2 可入库口径建议（待回灌至 P0/04 + 数据契约）

- **「显示型 adapter 字段优先级必须与字段语义一致」**：同一 mapper 中 `name`、`title` 等显示字段的 fallback 链应保持一致风格（首选语义最完整字段，再回退到编号/UUID）。`LeadConversionMapper.adaptConvertedCustomerDto` 的 `name: displayName || name` 是正例；`adaptConvertedCaseDto` 的 `title: caseNo || title` 反例（NEW-V5-2 根因）。
- **「locale-aware 工具函数必须在 UI 层强制注入 locale」**：`useGroupOptions.ts` 的 `getActiveGroupAlias/Group*` 系列默认 locale 为 ja-JP（与 fixture 演示形态对齐），UI 层调用方必须显式传 `useI18n().locale.value`，不得使用无参调用（NEW-V5-1 根因）。建议为 ESLint 自定义规则加入 detection。
- **「跨实体转化必须在两侧都留可追溯日志」**：LEAD 侧已有「已建案件：CASE-XXX / 已转客户：CUS-XXX」记录；案件侧应对称写「由线索 LEAD-XXX 转化而来」（NEW-V5-4）。
- **「seed 脚本必须以 `DO UPDATE` 自愈外显字段（状态字段例外）」**：`ON CONFLICT (id) DO NOTHING` 让旧数据沉淀到 dev DB，无法被新 seed 覆盖（70 §NEW-3 拖延 4 轮就是这条规律的反例）。规约：`case_type_code / case_name / template_name / requirement_blueprint` 等"内容字段"应在 `DO UPDATE SET` 中显式覆盖；`status / stage / business_phase / created_at` 等"状态/审计字段"必须排除，避免冲掉 dev 手工推进的状态。

### 5.3 走查会话引用

- 本轮：[咨询客户案件转化全链路 chrome-devtools-mcp 第五轮](current-session)
- 第二轮全链路：[70-MCP-walkthrough-2026-05-08-v2.md](./70-MCP-walkthrough-2026-05-08-v2.md)
- 第四轮案件流程：[73-MCP-case-walkthrough-2026-05-08-v4.md](./73-MCP-case-walkthrough-2026-05-08-v4.md)
