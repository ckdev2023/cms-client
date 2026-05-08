# 75 — 咨询 → 客户 → 案件 转化全链路走查（2026-05-08 第六轮 / chrome-devtools-mcp）

> 日期：2026-05-08（第六轮 / 转化链路 admin002 账号专项）
>
> 走查路径：登录（admin002@example.jp）→ `/leads` 列表（我的 / 全所） → **新建咨询** → 咨询详情（基础 / 转化 Tab） →
> **状态推进**（新咨询 → 跟进中 → 待签约 → 已签约） → **签约并开始建档**（一键创建客户 + 案件） →
> 客户详情（基础 / 关联案件） → 案件详情（概览 / 资料清单 / 任务 / 提交前检查 / 基础信息 / 日志） →
> 咨询日志回看 → 案件列表回看
>
> 登录账号：`admin002@example.jp` / `H9TCkLk5YWK1VOAi`（display_name=`admin003`，所属组：Local Default Group 之外无访问权限）
>
> 链路三件套（V6 现场创建）：
>
> - 线索 **LEAD-202605-0005** / id=`ca94a367-352b-4eb8-aed2-daea14335117`（R-FLOW-V6 走查申请人 / 技人国）
> - 客户 **CUS-202605-0003** / id=`fc6d0ae0-99ff-43b6-9df0-3c8fdae9fd2f`
> - 案件 **CASE-202605-0001** / id=`903dae0d-d604-4d15-b144-a6c83bad85ef`（caseType=`work`）
>
> 截图目录：`tmp/walkthrough-2026-05-08-v6/`（13 张）
>
> 上游权威：
>
> - [74-MCP-lead-customer-case-conversion-walkthrough-2026-05-08-v5.md](./74-MCP-lead-customer-case-conversion-walkthrough-2026-05-08-v5.md)（转化链路第五轮 — V5-1/2/3/4 + 70 NEW-1/2/4 + P0-2 来源）
> - [73-MCP-case-walkthrough-2026-05-08-v4.md](./73-MCP-case-walkthrough-2026-05-08-v4.md)（案件流程第四轮 — V3-1/2/3 来源）
> - [70-MCP-walkthrough-2026-05-08-v2.md](./70-MCP-walkthrough-2026-05-08-v2.md)（咨询/客户/案件全链路第二轮 — NEW-1/2/4 + P0-2 来源）

---

## 0. 总结

本轮**首次以 admin002 非超管账号**跑全链路 13 张截图；状态机推进、一键签约建档、双向转化日志、跨模块跳转均工作；UI 错误 0 条、Console 错误 0 条、所有 API 2xx/304 无 4xx/5xx。

- **链路自身工作**：4 步状态推进 + 一键转化为客户 + 案件，服务端毫秒内同步生成 CUS-202605-0003 + CASE-202605-0001；线索详情立刻刷新到「已创建案件」状态并露出「查看客户 / 查看案件」头部按钮。
- **回归 PASS（74 报告 V5-1/2/3/4 + 70/73 全部修复确认）**：
  - 转化对话框「所属组」locale 与 placeholder 同语种（V5-1/V5-3 PASS — 本轮 admin002 只能见到「Local Default Group」，但与 placeholder「留空则沿用线索所属组」zh-CN 同语种，无 ja-JP `東京一組` 漏出）
  - 案件侧「由线索 LEAD-202605-0005 转化而来」timeline 已按 V5-4 修复双向写入（案件「近期动态」+ 日志 Tab 头条均显示）
  - 客户摘要案件名称「R-FLOW-V6 走查申请人 · 工作签证」（70 NEW-1 PASS）
  - 客户关联案件「案件」列「打开案件 R-FLOW-V6 走查申请人 · 工作签证」（70 NEW-2 PASS）
  - 案件列表「检查」列 zh-CN「待检查」（70 NEW-4 PASS）
  - 提交前检查阻断条目明细（重新检查后产出 1 卡点 + 1 仅提示，标题/正文/补充说明均本地化）（70 P0-2 + 73 V3-1 PASS）
  - 案件基础信息关联主体角色「主申请人」（73 V3-2 PASS）
- **本轮新发现 NEW-V6-1（P1 — 疑似 V5-2 后端侧未完成）/ NEW-V6-3（P1）/ NEW-V6-2（P2）/ NEW-V6-4（P2）/ NEW-V6-5（P2）共 5 条**。
- **本轮无 P0 新增**。

---

## 1. 本轮新发现

### 1.1 P0 / 链路阻断

**无**。

### 1.2 P1

#### NEW-V6-1 线索「转化信息」Tab 案件卡片仍仅显示 caseNo（V5 §NEW-V5-2 后端侧未补齐）

| 项 | 内容 |
|---|------|
| 现象 | LEAD-202605-0005 转化结果卡片，**客户卡片正常**（标题「R-FLOW-V6 走查申请人」/ 副标题「CUS-202605-0003 · · 2026/05/08 18:08」），但**案件卡片**仍异常：标题与副标题**都是**「CASE-202605-0001」（caseNo），不显示真实案件标题「R-FLOW-V6 走查申请人 · 工作签证」 |
| 截图 | `05-conversion-result.png`、`15-lead-conversion-final.png` |
| 关键代码 | 后端：`packages/server/src/modules/core/leads/leads.admin.convert-case.ts`（创建后返回 payload）、`leads.admin.detail.ts`（GET 详情拼装 `convertedCase`）<br>前端：`packages/admin/src/views/leads/model/LeadConversionMapper.ts:adaptConvertedCaseDto`、`packages/admin/src/views/leads/components/LeadConvertedRecords.vue` |
| 根因（疑似） | V5 修复仅落在前端 mapper / template 层（`title || caseNo \|\| id` 回退链已 OK），但 **后端返回的 `convertedCase` 节点仍未带 `title`/`case_name` 字段**，前端 mapper 拿不到 title 只能回退到 caseNo；其它入口（`/api/cases?customerId=...&view=summary`、`/api/cases/:id/aggregate`）能正确返回 case_name，证明数据库里 title 是存在的 |
| 修复方案 | 1. `leads.admin.convert-case.ts` 在 `casesService.create` 之后构造响应 `convertedCase` 时加上 `title: created.case_name`；<br>2. `leads.admin.detail.ts` 拼装详情 `convertedCase` 时 `select cases.case_name` 并写入 `title` 字段；<br>3. 配套补 `packages/server/tests/integration-pg/leadsConvertCasePath.pg.test.ts`「convertCase 响应 convertedCase.title 必须等于 cases.case_name」+「getLeadDetail.convertedCase.title 等同」两条断言 |
| 优先级 | **P1**（视觉级，仅在线索「转化信息」Tab 这一入口受影响；其它入口均正常） |

#### NEW-V6-3 工作签证（caseType=`work`）案件无资料模板配置

| 项 | 内容 |
|---|------|
| 现象 | CASE-202605-0001 详情「资料清单」Tab 显示「**资料模板未配置 — 当前签证类型尚未配置资料模板，请联系管理员维护**」；TabName「资料清单 0/0」 |
| 网络追踪 | `GET /api/document-templates?caseType=work → 200`（响应空数组） |
| 截图 | `08-case-documents.png` |
| 关键代码 | `packages/server/src/scripts/seedDevData.ts`（`seedDocumentTemplates` / `seedCaseTemplates`）、`packages/server/src/modules/core/cases/cases.create.ts`（biz_type → case_type 的映射） |
| 根因（双重可能） | (a) **caseType 编码不一致**：LEAD `biz_type=engineer_humanities_intl_visa`（UI 标签「技人国」） → 转化时映射到 CASE `case_type=work`（UI 标签「工作签证」）。如果设计上 `case_type` 应该是 `engineer_humanities_intl_visa` 而非 `work`，那 `cases.create.ts` 的 biz_type 映射逻辑有 bug；<br>(b) **seed 缺失**：如果 `case_type=work` 是设计意图，那 `seedDocumentTemplates` 没有 seed 该 caseType 的模板（V5 报告中 `family_stay` 模板有 10 条；V6 `work` 0 条） |
| 影响 | 资料完成率永远 0%、资料 Tab 空状态、提交前检查中「至少生成一份文书」卡点是另一条规则路径（不依赖 document_items），但下游 ZIP 导出包资料部分会无内容 |
| 修复方案 | 先确定 (a) 还是 (b)：<br>- 若 (a)：`cases.create.ts` 改为 `case_type = lead.biz_type`（保持编码同源）；<br>- 若 (b)：`seedDevData.seedDocumentTemplates` 补 `caseType=work` 的最小可用模板集（参考 family_stay 10 条粒度）；<br>同时补 `seedDocumentTemplates.contract.test.ts` 断言「所有合法的 caseType 至少 seed N 条模板」防退步 |
| 优先级 | **P1**（admin002 用户默认开技人国案件就撞到，影响首次新用户体验） |

### 1.3 P2 — 微小观察（不阻断）

#### NEW-V6-2 同一签证概念三套 i18n label

| 项 | 内容 |
|---|------|
| 现象 | 同一签证概念在三个表面各显示不同标签：<br>- LEAD 业务类型下拉/列表/详情：**「技人国」**（短）<br>- CUSTOMER 签证类型：**「技术·人文知识·国际业务」**（全名）<br>- CASE 类型/标题/案件列表「类型」列：**「工作签证」**（泛化） |
| 截图 | `03a-lead-detail-basic.png` vs `06a-customer-basic.png` vs `07-case-overview.png` vs `12-case-info.png` vs `16-cases-list.png` |
| 关键代码 | `packages/admin/src/i18n/messages/{leads,customers,cases}/zh-CN.ts` 三处独立的 visa label 字典 |
| 影响 | 同一客户跨三个模块跟踪时怀疑是否同一签证；筛选/搜索字符串不一致；i18n 文案审计成本高 |
| 修复方案 | 归一到 `packages/admin/src/shared/i18n/visa-types.ts` 单一 catalog，UI 以「主标签 / 备注」二元结构展示（主：技人国，备注：技术·人文知识·国际业务）；3 个模块的 i18n 都引用该 catalog |
| 优先级 | **P2**（视觉/可读性级；功能不受影响） |

#### NEW-V6-4 admin002 用户的「写入分组」与「筛选分组」候选不一致（属 RBAC，仅文案/UI 提示）

| 项 | 内容 |
|---|------|
| 现象 | 同一 admin002 账号，**写入下拉**（LEAD 新建对话框、转化对话框「所属组」）只显示「Local Default Group」；**筛选/搜索下拉**（LEAD 列表「所属分组」、CASES 列表「全部分组」、CUSTOMER 编辑表单分组下拉）显示「东京一组 / 东京二组」（admin002 不属于这两组） |
| 截图 | `02-lead-create-dialog.png`、`04-conversion-modal-signed.png`、`01b-leads-list-all.png` |
| 关键代码 | `packages/admin/src/shared/model/useGroupOptions.ts`（`getActiveGroupAliasOptions` / 全所 groups） |
| 行为评估 | **行为正确**（写入只能在用户所属组；筛选可见全所是 admin 视角）；属于 RBAC 设计预期，但用户感知会混乱 |
| 修复方案 | 1. 在「写入下拉」上方加微提示「（仅显示你所属的分组）」；2. `useGroupOptions` 引入 `mode: 'filter' \| 'write'` 参数将差异显式化 |
| 优先级 | **P2**（可读性级；行为本身正确） |

#### NEW-V6-5 客户头部「分组」label 后无值且无 `—` 占位

| 项 | 内容 |
|---|------|
| 现象 | CUS-202605-0003 详情页顶部 `编号 / 分组 / 负责人 / 最近联系` 四列布局；「分组」label 之后**直接接到「负责人」label**（无 `—` 占位也无空白容器视觉），导致 4 列变 3 列错位 |
| 截图 | `06a-customer-basic.png` |
| 关键代码 | `packages/admin/src/views/customers/components/CustomerDetailHeader.vue`（或类似） |
| 修复方案 | 与同模块其它无值字段一致，缺值时回退到 `—` |
| 优先级 | **P2**（视觉级） |

### 1.4 数据/seed 观察（不计入新发现）

- **`admin002@example.jp` 用户的 display_name 实为「admin003」**：顶部「AD admin003 (admin002@example.jp)」，但负责人下拉中的 `admin002` 选项指向另一位 staff_user。日志/审计落库的 actor 显示为 `admin003`，跟下拉值与登录邮箱前缀都不一致。
  - **不算 bug**，是 `seedDevData` 里 staff users 的 display_name ↔ email 映射错位（可能历史原因导致）。
  - **影响**：审计日志可读性差；「负责人=admin002」筛选与「我登录的 admin002@example.jp」结果不一致（本轮 `/cases?scope=mine` 返回 0 条但 `scope=all` 返回 1 条 case 就是这个原因）。
  - **建议**：`seedDevData.ts` 补一条断言「`staff_users.display_name` 应与 `email` 前缀一致」，或显式在文档里说明这是 demo 故意制造的「身份/邮箱错位」用例。

---

## 2. 上轮（74 / 73 / 70）问题回归

> 回归方法：UI 行为复测（chrome-devtools-mcp）+ 网络抓包
> 回归日期：2026-05-08（第六轮）

| 上游问题 ID | 来源 | 上轮结论 | 本轮回归 | 备注 |
|---|---|---|---|---|
| 70 §1 P0-2 | 提交前检查仅见摘要无明细 | FIXED | **PASS** | CASE-202605-0001 重新检查后生成 1 卡点 + 1 仅提示，标题/正文/补充说明均本地化（`11-case-validation-after-recheck.png`） |
| 70 §NEW-1 | 客户摘要混入 raw slug | FIXED | **PASS** | CUS-202605-0003 案件摘要显示「R-FLOW-V6 走查申请人 · 工作签证」（`06a-customer-basic.png`） |
| 70 §NEW-2 | 客户关联案件「案件」列只显 case_no | FIXED | **PASS** | CASE-202605-0001 列「案件」=「打开案件 R-FLOW-V6 走查申请人 · 工作签证」（`06b-customer-cases.png`） |
| 70 §NEW-3 | CASE-DEV-002 类型与标题不自洽 | FIXED（V5）| 未复测 | 本轮全部使用现场创建数据，未涉及 CASE-DEV-002 |
| 70 §NEW-4 | 案件列表「检查」列原始英文 | FIXED | **PASS** | 显示「待检查」（`16-cases-list.png`） |
| 73 §1.1 V3-1 | 提交前检查 info 区块 i18n | FIXED | **PASS** | CASE-202605-0001 验证 info 卡片显示「所有文书需定稿 / 所有生成的文书必须为定稿或已导出状态」（`11-case-validation-after-recheck.png`） |
| 73 §1.2 V3-2 | 关联主体角色 raw key | FIXED | **PASS** | CASE-202605-0001 关联主体显示「主申请人」（`12-case-info.png`） |
| 73 §1.3 V3-3 | 新建向导 step2 命名口径 | FIXED | 未复测 | 本轮通过「签约并开始建档」入口，跳过 |
| 74 §NEW-V5-1 | 转化对话框组下拉 ja-JP 漏出 | FIXED | **PASS** | admin002 用户的「Local Default Group」与 placeholder 同 zh-CN，无日文漏出（`04-conversion-modal-signed.png`） |
| 74 §NEW-V5-2 | 案件标题落到 case_no 且重复 | FIXED（前端） | **后端补漏（NEW-V6-1）** | 前端 mapper/template 已 OK，后端响应仍未带 `title`，UI 表现等同未修复；详见 §1.2 NEW-V6-1 |
| 74 §NEW-V5-3 | placeholder 与候选 locale 不一致 | FIXED（随 V5-1） | **PASS** | 同 V5-1 |
| 74 §NEW-V5-4 | 案件日志缺转化来源记录 | FIXED | **PASS** | CASE-202605-0001 「近期动态」头条 + 日志 Tab 第一条均显示「由线索 LEAD-202605-0005 转化而来」（`07-case-overview.png`、`13-case-log.png`） |

---

## 3. 截图索引

| 编号 | 文件 | 内容 | 关联结论 |
|---|---|---|---|
| 01 | `01-leads-list-my.png` | 线索列表（admin002「我的」）— 0 条 | 起点 |
| 01b | `01b-leads-list-all.png` | 线索列表（admin002「全所」）— 4 条已有 | NEW-V6-4 admin002 在写入/筛选下拉差异的对照样本 |
| 02 | `02-lead-create-dialog.png` | 新建线索对话框（空表）| 「所属分组」只见 Local Default Group（NEW-V6-4） |
| 02b | `02b-lead-create-filled.png` | 新建线索（已填）| 「创建线索」按钮根据校验启用 |
| 03a | `03a-lead-detail-basic.png` | LEAD-202605-0005 详情 — 基础信息 | 「意向业务类型」=「技人国」（NEW-V6-2 i18n 多套对照点 1） |
| 03b | `03b-lead-detail-conversion-locked.png` | 转化 Tab — 「新咨询」状态下两按钮均 disabled | 状态白名单工作 |
| 03c | `03c-lead-status-modal.png` | 调整状态对话框 — 仅「跟进中」可选 | 状态白名单 |
| 03d | `03d-lead-detail-conversion-unlocked.png` | 已签约状态 — 头部 banner + 转化按钮均启用 | 解锁路径 |
| 04 | `04-conversion-modal-signed.png` | 签约并开始建档对话框 | **74 NEW-V5-1/3 PASS**（候选 zh-CN 同 placeholder）；NEW-V6-4 admin002 写入只见 1 个组 |
| 05 | `05-conversion-result.png` | 转化成功 — 已生成记录卡片 + 头部「查看客户 / 查看案件」 | **NEW-V6-1**（案件卡片标题为 caseNo） |
| 06a | `06a-customer-basic.png` | CUS-202605-0003 详情 — 基础信息 + 案件摘要 | 70 NEW-1 PASS；NEW-V6-2 「技术·人文知识·国际业务」对照点 2；NEW-V6-5 头部分组无 `—` 占位 |
| 06b | `06b-customer-cases.png` | 客户关联案件 Tab | 70 NEW-2 PASS；NEW-V6-2 「工作签证」对照点 3 |
| 07 | `07-case-overview.png` | CASE-202605-0001 概览 | 「近期动态」头条「由线索 LEAD-202605-0005 转化而来」（74 V5-4 PASS）；NEW-V6-2 case 标题「· 工作签证」 |
| 08 | `08-case-documents.png` | 资料清单 0/0（空状态）| **NEW-V6-3**（caseType=work 模板未 seed） |
| 09 | `09-case-tasks.png` | 任务列表（自动生成「邀请客户上传基础资料」+「确认客户初次面谈」）| — |
| 11 | `11-case-validation-after-recheck.png` | 提交前检查 — 重新检查后 | **70 P0-2 + 73 V3-1 PASS**（卡点 1 + 仅提示 1，full i18n） |
| 12 | `12-case-info.png` | 基础信息 — 关联主体「主申请人」 | **73 V3-2 PASS** |
| 13 | `13-case-log.png` | 案件日志 | **74 V5-4 PASS**（首条「由线索 LEAD-202605-0005 转化而来」） |
| 14 | `14-lead-log.png` | 线索日志 — 完整 6 条状态流 + 转化记录 | 审计完整；actor 显示 `admin003`（§1.4 数据观察对照点） |
| 15 | `15-lead-conversion-final.png` | 线索转化 Tab 终态（已生成记录）| **NEW-V6-1**（同 `05`） |
| 16 | `16-cases-list.png` | 案件列表「全所」— 1 条 | 70 NEW-4 PASS；NEW-V6-2 案件「类型」列「工作签证」对照点 |

---

## 4. 不在本轮范围

- 线索 dedup（重复识别）路径：本轮电话/邮箱独立，dedup API 返回未命中；保留首轮覆盖
- 「仅建立客户档案」分支（不带案件）：本轮走「签约并开始建档」一键路径
- 后段流程（COE 发送、海外贴签、回执登记）：与 73/74 报告范围一致
- ZIP 导出 / 双人复核 / 风险标签：明确「未上线」
- 70 §NEW-3 CASE-DEV-002 数据：本轮使用现场创建数据，未涉及

---

## 5. 待回灌（file-back 候选）

> 与 `AGENTS.md` Karpathy 编译式沉淀闭环对齐。

### 5.1 P1 后续修复建议（待 Compile）

- **NEW-V6-1 后端 `convertedCase.title` 漏字段**：V5 NEW-V5-2 仅修了前端 mapper / template 半边，必须在 `leads.admin.convert-case.ts` + `leads.admin.detail.ts` 的响应拼装上补 `title: cases.case_name`，并加 integration-pg 断言「响应 payload `convertedCase.title` 与库里 `cases.case_name` 一致」。建议把这条沉淀为 **「跨实体派生字段必须在产生方+消费方双向断言」** 的契约规约。
- **NEW-V6-3 caseType 映射 / 模板 seed**：根因二选一（biz_type→case_type 映射 vs document_templates seed），先做 audit 才能定修复点。建议把「LEAD biz_type ↔ CASE case_type ↔ CUSTOMER visa_type 三个 code 必须可单向回查」沉淀到 P0/04 数据契约。

### 5.2 可入库口径建议（待回灌至 P0/04 + 数据契约）

- **「跨实体派生字段必须在产生方+消费方双向断言」**：V5 NEW-V5-2 教训——前端有 fallback 链不等于全栈修复；mapper 的 fallback 把后端缺漏伪装成视觉退化。后端响应拼装时若涉及跨实体派生字段（如 `convertedCase.title` 来自 `cases.case_name`），必须在 integration-pg 测试里断言**实际写入 payload 的字段值**而非只断言「不报错」。
- **「同一业务概念应在 i18n catalog 中单一来源」**：NEW-V6-2 三套 visa label 是 i18n 字典分散在 leads/customers/cases 三个模块的反例。建议把跨模块的业务概念（visa_type、case_type、biz_type、stage、status、role）统一放到 `shared/i18n` 单 catalog，feature 层只引用 key 不再独立维护文案。
- **「seed 必须覆盖业务上所有合法的枚举值」**：NEW-V6-3 的根因 (b) 假设——document_templates seed 漏掉 `case_type=work` 让首次走查直接撞空。建议补 contract 测试断言「合法 case_type 集合 ⊆ document_templates 中已 seed 的 case_type 集合」。
- **「写入下拉 vs 筛选下拉应使用不同的 group/role/owner 候选源」**：NEW-V6-4 揭示 `useGroupOptions` 等 helper 同时被两类场景调用但语义不同。规约：所有候选源 helper 必须显式 `mode: 'filter' | 'write'`，UI 调用方按场景传参；ESLint 自定义规则可探测无 `mode` 调用。
- **「demo seed 中的 display_name ↔ email 错位需明确文档化」**：§1.4 数据观察的「admin002@example.jp 显示为 admin003」混淆审计与筛选。要么补对齐口径，要么在 `seedDevData.ts` 文件头明确说明这是故意制造的边界测试用例。

### 5.3 走查会话引用

- 本轮：[咨询客户案件转化全链路 chrome-devtools-mcp 第六轮](current-session)
- 第五轮：[74-MCP-lead-customer-case-conversion-walkthrough-2026-05-08-v5.md](./74-MCP-lead-customer-case-conversion-walkthrough-2026-05-08-v5.md)
- 第四轮案件流程：[73-MCP-case-walkthrough-2026-05-08-v4.md](./73-MCP-case-walkthrough-2026-05-08-v4.md)
- 第二轮全链路：[70-MCP-walkthrough-2026-05-08-v2.md](./70-MCP-walkthrough-2026-05-08-v2.md)
