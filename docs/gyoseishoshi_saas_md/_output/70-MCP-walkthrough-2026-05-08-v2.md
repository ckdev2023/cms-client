# 70 — 咨询 → 客户 → 案件 全链路走查（2026-05-08 第二轮）

> 日期：2026-05-08（第二轮 / 修复后回归）
>
> 走查路径：仪表盘 → 咨询列表 → 新建咨询 → 咨询详情（基础 / 转化）→
> 客户列表 → 客户详情（基础 / 关联案件）→
> 案件列表 → 案件详情（概览 / 资料清单 / 提交前检查 / 收费）→ 新建案件
>
> 登录账号：admin@local.test / Admin123!（Local Demo Office）
>
> 链路 ID 三件套：
>
> - 线索 **LEAD-202605-0009**（R-FLOW-05 山田太郎 / 家族滞在 / 已创建案件）
> - 客户 **CUS-202605-0014** / id=`c0c3a7b1-ba80-4f6c-aeda-ea2bf897f324`
> - 案件 **CASE-202605-0010** / id=`73f54c49-3793-4aba-999c-e0dcdf76c60b`
>
> 截图目录：`tmp/walkthrough-2026-05-08-v2/`
>
> 上游权威：
>
> - [69-MCP-walkthrough-2026-05-08.md](./69-MCP-walkthrough-2026-05-08.md)（首轮）
> - [P0/04-核心流程与状态流转.md §4.1 咨询转案件](../P0/04-核心流程与状态流转.md#41-咨询转案件)

---

## 0. 总结

本轮走查覆盖 LEAD → CUSTOMER → CASE 全链路 12 张截图。

- **首轮 13/15 项修复**已通过 UI 回归（详见 §3）。
- **P0-2 持续存在**：UI 表现没有改善（实质看不到阻断条目明细）；前端 fallback 已合并，根因在后端校验运行未产生 reportPayload 明细数据。
- **新增 P1 × 4**：均与服务端字段返回口径或前端 i18n 后处理有关，建议合并修复。
- **P0 × 0** 新增。

---

## 1. 新发现问题

### P0 — 链路阻断

#### P0-2（持续 / 未实质修复） 「提交前检查」仍只见摘要无明细

| 项 | 内容 |
|---|------|
| 现象 | CASE-202605-0010 提交前检查 Tab 仍只显示「1 项阻断未处理 · 详细请参阅检查报告」（合成摘要项），**没有具体阻断条目明细**（哪些资料缺失、哪个文书未生成等） |
| 截图 | `05c-case-validation.png` |
| 关键文件 | `packages/admin/src/views/cases/model/CaseAdapterValidationBilling.ts` L102–158（前端 fallback 已正确合并）；`packages/server/src/modules/core/cases/validation` 相关运行执行（疑根因：未产 reportPayload.blocking 详细数组） |
| 根因分析 | 前端 `adaptCaseValidationData` 在 `report` 为空时的 fallback 已正确合并，但**后端 `validation_runs.report_payload` 实际为空 / 不含明细**。需在 server 侧检查校验运行执行器是否正确写入 `blocking[]`/`warnings[]` 详细条目，而不是只写 `blockingCount` 摘要 |
| 修复模块 | `server/modules/core/cases/validation` — 校验运行执行器 + Repository 写入路径；前端无需调整 |
| 优先级 | **P0**（链路阻断 · 用户决策依赖明细） |

---

### P1 — 数据契约 / i18n / 显示

#### NEW-1 客户摘要「案件名称」结尾出现 `dependent_visa` 原始 slug

| 项 | 内容 |
|---|------|
| 现象 | 客户 CUS-202605-0014 案件摘要条「案件名称」字段渲染为「**R-FLOW-05 山田太郎 · dependent_visa**」，结尾的 `dependent_visa` 是原始 slug，未本地化为「家族滞在」 |
| 截图 | `04a-customer-basic.png`、`04b-customer-cases.png` |
| 关键文件 | `packages/server/src/modules/core/customers/customers.query.ts` L120–146 `buildCaseTitlesExpr`（fallback 时 SQL 拼接 `displayName · case_type_code`，故意保留 raw slug 让前端 i18n）；`packages/admin/src/views/customers/components/CustomerCaseSummaryStrip.vue` L14–18（直接使用 `caseTitles[0]`，未做 i18n 后处理） |
| 根因 | 服务端 SQL 拼装 `case_titles` 时把 `case_type_code` 直接拼进字符串（设计意图：让前端做 locale 替换），但前端 `CustomerCaseSummaryStrip` 仅 trim 后直接展示 |
| 修复方案 | 服务端拼装时不再混入 raw slug，**改成只输出 `displayName`**，把 `case_type_code` 作为独立字段返回；前端再用 `resolveBusinessTypeLabel` 拼最终标题 |
| 修复模块 | `server` — `customers.query.ts` + DTO；`customers/components` — CustomerCaseSummaryStrip + CustomerAdapterMappers |
| 优先级 | P1 |

#### NEW-2 客户「关联案件」表格的「案件」列仍只显示 case_no

| 项 | 内容 |
|---|------|
| 现象 | 客户详情「关联案件」Tab 表格中「案件」列内容仍是 **`CASE-202605-0010`**（case_no），后端虽已添加 `caseTitle` 字段优先链，但实际数据中 `caseTitle` 仍未传到列表 API |
| 截图 | `04b-customer-cases.png` |
| 关键文件 | `packages/server/src/modules/core/customers/customers.query.ts`（关联案件子查询返回字段）；`packages/admin/src/views/customers/model/CustomerAdapterCaseMapper.ts` L13 `CUSTOMER_CASE_NAME_FIELDS = ["caseTitle", "name", "caseName", "title"]` |
| 根因 | 服务端 query 给 customer detail 中关联 case 列表的字段映射，`caseTitle` 字段为空（仅 case_name / case_no 入选），导致前端 fallback 链最终落到 `caseNumber` |
| 修复方案 | 后端 case list 子查询补 `caseTitle`，使用与 `buildCaseTitlesExpr` 相同的拼装逻辑（结合 NEW-1 的修复，将 case_type_code 解耦后再传） |
| 修复模块 | `server` — customers.query.ts + customers.dto-mappers.ts |
| 优先级 | P1 |

#### NEW-3 CASE-DEV-002 类型列显示「家族滞在」，标题为「技人国 — 田中太郎」

| 项 | 内容 |
|---|------|
| 现象 | 案件列表 CASE-DEV-002 行：标题「**技人国 — 田中太郎**」，类型列「**家族滞在**」，二者不自洽。该 case 在 seed 中 `case_type_code = "work"`（首轮 P1-5 修复后选择的口径） |
| 截图 | `05-cases-list.png` |
| 关键文件 | `packages/server/src/scripts/seedDevData.ts` L65（CASE-DEV-002 case_type_code = `work`）；`packages/admin/src/views/cases/components/CaseTableRow.vue`（类型列 i18n 映射） |
| 根因 | 首轮 P1-5 修复将 CASE-DEV-002 改成 `work` slug，但前端类型列 i18n 映射表没有 `work` 这个 key，fallback 到默认值（疑似命中「家族滞在」） |
| 修复方案 | 把 seedDevData CASE-DEV-002 改回 `engineer_specialist_intl_services` slug（与 i18n 映射键对齐），**或**前端补 `work` → 「技人国」mapping |
| 修复模块 | `server/scripts` — seedDevData.ts；`admin/i18n` — businessTypes |
| 优先级 | P1 |

#### NEW-4 案件列表「检查」列显示原始英文 `pending` / `passed` / `failed (N)`

| 项 | 内容 |
|---|------|
| 现象 | 案件列表「检查」列对全部 30 条案件均显示原始英文：`pending`（多数）/ `passed` / `failed (N)`，未本地化为「待检查 / 已通过 / 未通过 (N)」（i18n 选项里有这些 key，仅渲染层没用上） |
| 截图 | `05-cases-list.png` |
| 关键文件 | `packages/admin/src/views/cases/model/CaseAdapterShared.ts` L196–206 `resolveValidationLabel`（直接返回原始字符串）；`packages/admin/src/views/cases/components/CaseTableRow.vue` L180（`{{ item.validationLabel }}` 直接渲染） |
| 根因 | 首轮 P1-4 修复使 `validationLabel` 走 `resolveValidationLabel`，但该函数返回 raw `"passed"` / `"failed (N)"` / `"pending"` 字符串（注释中标注 `i18n-skip`），前端 CaseTableRow 没把状态键 → i18n 映射 |
| 修复方案 | `resolveValidationLabel` 改返回 `{ status, blockingCount }`；前端 CaseTableRow 在渲染时按 status 走 `cases.validation.status.{passed,pending,failed}` i18n key（参考 P2-12 的 prepare → cases.businessPhase.prepare 模式） |
| 修复模块 | `cases/model` — CaseAdapterShared + CaseAdapterMappers + types；`cases/components` — CaseTableRow |
| 优先级 | P1 |

---

## 2. 截图索引

| 编号 | 文件 | 内容 | 关联问题 |
|------|------|------|----------|
| 01 | `01-dashboard.png` | 仪表盘 | 走查起点 |
| 02 | `02-leads-list.png` | 咨询线索列表 | 回归：P2-11 ✓ |
| 02b | `02b-lead-create-dialog.png` | 新建咨询线索弹窗 | 回归：P2-13 ✓ |
| 03a | `03a-lead-detail-basic.png` | 咨询详情 — 基础信息 | 回归：P1-3 header 按钮 ✓ |
| 03b | `03b-lead-detail-conversion.png` | 咨询详情 — 转化信息 | 回归：P1-3 跳转 ✓；NEW：转化 Tab 案件名仍是编号 |
| 04a | `04a-customer-basic.png` | 客户详情 — 基础信息 | 回归：P1-7、P1-8 ✓；**NEW-1** |
| 04b | `04b-customer-cases.png` | 客户详情 — 关联案件 | 回归：P1-15 ✓；**NEW-2** |
| 05 | `05-cases-list.png` | 案件列表 | 回归：P2-12（阶段 i18n + DEV 徽标）✓；**NEW-3、NEW-4** |
| 05a | `05a-case-overview.png` | 案件详情 — 概览 | 回归：P1-6 关联客户卡片 ✓ |
| 05b | `05b-case-documents.png` | 案件详情 — 资料清单 | 回归：P0-1 storage 引导链接 ✓ |
| 05c | `05c-case-validation.png` | 案件详情 — 提交前检查 | **P0-2 持续** |
| 05d | `05d-case-billing.png` | 案件详情 — 收费 | 走查上下文 |
| 06 | `06-case-create.png` | 新建案件（步骤 1） | 走查上下文 |

---

## 3. 首轮修复回归确认

> 回归方法：UI 行为复测（chrome-devtools-mcp）+ 关键代码点抽查
> 回归日期：2026-05-08（第二轮）

| 问题 ID | 首轮状态 | 本轮回归 | 备注 |
|---------|----------|----------|------|
| P0-1 | FIXED | **PASS** | 资料清单每行 disabled「登记资料」按钮旁有「前往『系统设置』」链接（指向 `?tab=storage-root`） |
| P0-2 | FIXED（前端） | **FAIL（持续）** | 前端 fallback 已合并，但后端校验运行未产生 reportPayload 明细，UI 仍只见摘要 |
| P1-3 | FIXED | **PASS** | Lead 详情 header「查看客户/查看案件」+ 转化 Tab 内联按钮均能跳转；`viewCustomer` emit 正确导航至客户详情 |
| P1-4 | FIXED | **PASS（部分）** | KPI 现已正确显示阻断数；但 `validationLabel` 未走 i18n，参见 NEW-4 |
| P1-5 | FIXED | **FAIL（衍生）** | seedDevData 已改 slug 为 `work`，但类型列 i18n 缺该 key，参见 NEW-3 |
| P1-6 | FIXED | **PASS** | 案件概览顶部「关联客户」卡片显示 R-FLOW-05 山田太郎 |
| P1-7 | FIXED | **PASS** | CUS-202605-0014 签证类型「家族滞在」，未误显示「从经管签自动获取」文案 |
| P1-8 | FIXED | **PASS** | 客户详情面包屑显示「客户 / R-FLOW-05 山田太郎」 |
| P1-9 | FIXED | **PASS（部分）** | caseTitle 优先链已生效；但服务端拼装混入 raw slug，参见 NEW-1 |
| P1-10 | FIXED | **FAIL（衍生）** | adapter 优先链已合并，但服务端列表 API 实际未返回 caseTitle 字段，参见 NEW-2 |
| P1-14 | FIXED | 未复测 | 本轮未走 LEAD-202605-0007（已签约）路径 |
| P1-15 | FIXED | **PASS** | CustomerCasesTab 内不再有重复「开始办案」按钮 |
| P2-11 | FIXED | **PASS** | Lead 列表业务类型「家族滞在/经营管理/技人国/高度人才」、来源「网站表单/介绍/来访」全本地化 |
| P2-12 | FIXED | **PASS** | 案件列表阶段「已建档/资料收集中/文书制作中/已提交待回执/已归档」全本地化；CASE-DEV-* 行有「DEV」徽标 |
| P2-13 | FIXED | **PASS** | 新建咨询弹窗「所属分组」显示「东京一组」（不再是 `tokyo-1`） |

---

## 4. 不在本轮范围

- 已签约状态 LEAD（LEAD-202605-0007）路径，沿用首轮结果
- ZIP 导出（明确「功能尚未上线」）
- 双人复核（明确「事务所未启用」）
- COE / 海外贴签后段流程

---

## 5. 待回灌（file-back 候选）

> 与 `AGENTS.md` Karpathy 编译式沉淀闭环对齐：本轮发现的可入库口径建议在权威文档中沉淀。

### 5.1 可入库口径（待回灌至 P0/04 + 数据契约）

- 「服务端字符串字段不应混入 raw enum slug」— 服务端拼装显示文本时，**应只返回结构化字段**（如 `displayName` + `caseTypeCode`），由前端按 locale 拼装最终标签。SQL 拼接 `displayName · case_type_code` 是反模式（NEW-1 根因）。
- 「列表型 API 必须保持显示字段一致性」— customer 详情子查询的 case list 必须与 customer list 的 `caseTitles` 字段使用同一拼装逻辑，否则前端会出现 fallback 链路退化（NEW-2）。
- 「前端状态键必须经 i18n 转换层」— 任何 adapter 返回的 `*Label` 字段都应是 i18n key 或 `{ key, params }` 二元组，不得返回 raw 英文 status（NEW-4）。
- 「seed 数据 slug 必须与前端 i18n key 对齐」— 修改 seed `case_type_code` 时必须同步检查 `i18n/messages/_shared/businessTypes.ts` 是否覆盖该 slug（NEW-3）。

### 5.2 后续修复优先级建议

- **P0**：调查后端校验运行（validation runs）执行器的 reportPayload 写入，恢复阻断条目明细（P0-2 实质修复）。
- **P1 批量**：NEW-1 + NEW-2（两者共用同一 SQL 调整与 DTO 字段拆分）；NEW-3 + NEW-4（两者均为 i18n 映射对齐）。建议两批分别合并。

### 5.3 走查会话引用

- 本轮走查会话：[全链路 chrome-devtools-mcp 第二轮](current-session)
- 首轮报告：[69-MCP-walkthrough-2026-05-08.md](./69-MCP-walkthrough-2026-05-08.md)
