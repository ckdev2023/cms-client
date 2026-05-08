# 69 — 咨询 → 客户 → 案件 全链路走查（2026-05-08）

> 日期：2026-05-08
>
> 走查路径：仪表盘 → 咨询列表 → 新建咨询 → 咨询详情（基础 / 转化）→
> 已签约咨询 → 客户列表 → 客户详情（基础 / 关联案件）→
> 案件列表 → 案件详情（概览 / 资料清单 / 提交前检查 / 收费）→ 新建案件
>
> 登录账号：admin@local.test / Admin123!（Local Demo Office）
>
> 链路 ID 三件套：
>
> - 线索 **LEAD-202605-0009**（R-FLOW-05 山田太郎 / family_stay / 已创建案件）
> - 客户 **CUS-202605-0014**（R-FLOW-05 山田太郎）
> - 案件 **CASE-202605-0010**（家族滞在）
>
> 截图目录：`tmp/walkthrough-2026-05-08/`
>
> 上游权威：
>
> - [P0/04-核心流程与状态流转.md §4.1 咨询转案件](../P0/04-核心流程与状态流转.md#41-咨询转案件)
> - [P0/04-核心流程与状态流转.md §4.2 资料收集与审核](../P0/04-核心流程与状态流转.md#42-资料收集与审核)
> - [66-咨询客户案件全链路chrome-devtools-mcp走查-第五轮.md](./66-咨询客户案件全链路chrome-devtools-mcp走查-第五轮.md)
> - [68-R-FLOW6-CUS修复回归验证.md](./68-R-FLOW6-CUS修复回归验证.md)

---

## 0. 总结

本轮走查覆盖 LEAD → CUSTOMER → CASE 全链路 16 张截图、15 条问题。
其中 **P0 × 2** 阻断主链路（资料清单整列 disabled、提交前检查无阻断明细），
**P1 × 9** 影响数据可用性与导航一致性，**P2 × 4** 为 i18n / 显示一致性扫光。

---

## 1. 问题清单

### P0 — 链路阻断

#### P0-1 案件「资料清单」`登记资料` 整列 disabled

| 项 | 内容 |
|---|------|
| 现象 | 案件 CASE-202605-0010 的资料清单 Tab 中，「登记资料」按钮和「引用既有版本」均可见，但当组织未配置存储根路径（`storageRootConfigured=false`）时，所有行操作按钮 disabled，**无 tooltip 说明原因、无引导跳转** |
| 截图 | `05b-case-documents.png` |
| 关键文件 | `packages/admin/src/views/cases/components/CaseDocumentRow.vue` L232–247；`packages/admin/src/shared/model/useOrgSettings.ts` L52–58 |
| 修复模块 | `cases/components` — CaseDocumentRow + CaseDocumentsTab |

#### P0-2 「提交前检查」有阻断摘要无阻断明细

| 项 | 内容 |
|---|------|
| 现象 | 提交前检查 Tab 显示「1 項阻断未処理」摘要，但阻断列表区域只有一行合成项（标题 + 引用报告），**无具体阻断条目明细**；警告区有 noteKey 渲染但阻断区没有 |
| 截图 | `05c-case-validation.png` |
| 关键文件 | `packages/admin/src/views/cases/model/CaseAdapterValidationBilling.ts` L173–206；`packages/admin/src/views/cases/components/CaseValidationTab.vue` L127–173 |
| 修复模块 | `cases/model` — CaseAdapterValidationBilling + `cases/components` — CaseValidationTab |

---

### P1 — 数据契约 / 导航 / 显示修复

#### P1-3 Lead 转化信息 Tab 内联按钮无响应

| 项 | 内容 |
|---|------|
| 现象 | LEAD-202605-0009 转化信息 Tab 的「已生成记录」区域，「查看客户」「查看案件」两颗按钮可渲染，**点击无任何响应**（未绑定 `@click`/emit） |
| 截图 | `03b-lead-detail-conversion.png` |
| 关键文件 | `packages/admin/src/views/leads/components/LeadConvertedRecords.vue` L72–119；`packages/admin/src/views/leads/model/useLeadHeaderNavigation.ts` L33–48 |
| 修复模块 | `leads/components` — LeadConvertedRecords + LeadConversionTab + LeadDetailView |

#### P1-4 案件列表「检查未通过」统计与详情不一致

| 项 | 内容 |
|---|------|
| 现象 | 案件列表页 KPI 卡片和行内的 `validationLabel` / `blockerCount` 为恒空或恒 0，列表摘要与案件详情提交前检查 Tab 的实际阻断数不一致 |
| 截图 | `05-cases-list.png` |
| 关键文件 | `packages/admin/src/views/cases/model/CaseAdapterMappers.ts` L44–67, L109–147 |
| 修复模块 | `cases/model` — CaseAdapterMappers |

#### P1-5 CASE-DEV-002 标题与类型不符

| 项 | 内容 |
|---|------|
| 现象 | 案件列表中 CASE-DEV-002 标题为「技人国 — 田中太郎」，但类型列显示「家族滞在」，title 与 `case_type_code` 不自洽 |
| 截图 | `05-cases-list.png` |
| 关键文件 | `packages/server/src/scripts/seedDevData.ts` L62–77 |
| 修复模块 | `server/scripts` — seedDevData |

#### P1-6 案件「关联主体」永空

| 项 | 内容 |
|---|------|
| 现象 | CASE-202605-0010 概览页的「关联主体」区域始终为空，即便案件已关联客户 R-FLOW-05 山田太郎；adapter 使用 EMPTY_LISTS 占位 |
| 截图 | `05a-case-overview.png` |
| 关键文件 | `packages/admin/src/views/cases/model/CaseAdapterDetailContracts.ts` L355–361；`packages/admin/src/views/cases/model/CaseAdapterDetailAggregateP1.ts` L146–149 |
| 修复模块 | `cases/model` — CaseAdapterDetailAggregateP1 |

#### P1-7 客户「签证类型」说明文案对非经管客户也显示

| 项 | 内容 |
|---|------|
| 现象 | 客户 CUS-202605-0014 签证类型为「家族滞在」，但下方仍显示「从经营管理签方案自动获取」说明文案；该文案应仅对经管签客户可见 |
| 截图 | `04a-customer-basic.png` |
| 关键文件 | `packages/admin/src/views/customers/components/CustomerBasicInfoTab.vue` L60, L387–400 |
| 修复模块 | `customers/components` — CustomerBasicInfoTab |

#### P1-8 客户详情面包屑漏姓名

| 项 | 内容 |
|---|------|
| 现象 | 客户详情页面包屑显示「客户 / 客户详情」，**当前 segment 未展示客户姓名**（应为 "R-FLOW-05 山田太郎"），与咨询详情面包屑行为不一致 |
| 截图 | `04a-customer-basic.png`、`04b-customer-cases.png` |
| 关键文件 | `packages/admin/src/views/customers/components/CustomerDetailHeader.vue` L60–83 |
| 修复模块 | `customers/components` — CustomerDetailHeader |

#### P1-9 客户摘要「案件名称」只显示编号

| 项 | 内容 |
|---|------|
| 现象 | 客户详情摘要条的「案件名称」字段显示 `CASE-202605-0010`（即 case_no），而非案件标题（如「R-FLOW-05 山田太郎 · 家族滞在」） |
| 截图 | `04a-customer-basic.png` |
| 关键文件 | `packages/admin/src/views/customers/components/CustomerCaseSummaryStrip.vue` L17–20；`packages/admin/src/views/customers/model/CustomerAdapterMappers.ts` L251–252 |
| 修复模块 | `customers/model` — CustomerAdapterMappers + `customers/components` — CustomerCaseSummaryStrip；`server` — customers.query.ts |

#### P1-10 客户「关联案件」Tab 案件列只显示编号

| 项 | 内容 |
|---|------|
| 现象 | 客户关联案件 Tab 表格中「案件」列渲染值为 `CASE-202605-0010`（case_no），后端 `name` 字段为空导致 fallback 到编号 |
| 截图 | `04b-customer-cases.png` |
| 关键文件 | `packages/admin/src/views/customers/components/CustomerCasesTab.vue` L203–215；`packages/admin/src/views/customers/model/CustomerAdapterCaseMapper.ts` L13–14, L91–96 |
| 修复模块 | `customers/model` — CustomerAdapterCaseMapper；`server` — customers.query.ts |

#### P1-14 已签约 Lead CTA 文案歧义

| 项 | 内容 |
|---|------|
| 现象 | LEAD-202605-0007（已签约状态 / R-FLOW-03 佐藤一郎）header 显示 CTA「签约并开始建档」，但该 Lead 已签约且已建客户；转化 Tab 只有客户记录、无案件记录，CTA 文案与实际语境不匹配 |
| 截图 | `03c-lead-detail-signed.png`、`03d-lead-signed-conversion.png` |
| 关键文件 | `packages/admin/src/views/leads/components/LeadBannerStrip.vue` L68–75 |
| 修复模块 | `leads/components` — LeadBannerStrip |

#### P1-15 客户详情重复「开始办案」按钮 + Cases Tab 无 hint

| 项 | 内容 |
|---|------|
| 现象 | 客户关联案件 Tab 内有一颗独立的「开始办案」按钮（disabled 占位），与 header 区域的「开始办案」重复；Tab 内按钮既不可用也无 tooltip 说明 |
| 截图 | `04b-customer-cases.png` |
| 关键文件 | `packages/admin/src/views/customers/components/CustomerCasesTab.vue` L137–143 |
| 修复模块 | `customers/components` — CustomerCasesTab |

---

### P2 — i18n / 一致性

#### P2-11 Lead 列表业务类型 / 来源直接显示英文 slug

| 项 | 内容 |
|---|------|
| 现象 | 咨询列表「业务类型」列显示 `family_stay`、`business-management-visa`、`work-visa` 等原始 slug，未经过 i18n resolver 转换为中文（如「家族滞在」「经营管理」「工作签证」） |
| 截图 | `02-leads-list.png` |
| 关键文件 | `packages/admin/src/views/leads/components/LeadTableRow.vue` L174–178；`packages/admin/src/views/leads/model/leadOptionLabels.ts` L17–46；`packages/admin/src/views/leads/model/LeadAdapterMappers.ts` L176–184 |
| 修复模块 | `leads/components` — LeadTableRow + `leads/model` — LeadAdapterMappers |

#### P2-12 案件列表 stage `prepare` 显示 raw key + CASE-DEV-* 缺 DEV 徽标

| 项 | 内容 |
|---|------|
| 现象 | 案件列表中 CASE-DEV-001 / CASE-DEV-002 / CASE-DEV-003 的阶段列显示原始 key `prepare`，未走 i18n mapping（应为「准备中」）；DEV 数据混在正式列表中无视觉区分 |
| 截图 | `05-cases-list.png` |
| 关键文件 | `packages/admin/src/views/cases/components/CaseTableRow.vue` L60–62 |
| 修复模块 | `cases/components` — CaseTableRow（i18n map 补 `prepare` key + DEV badge） |

#### P2-13 新建咨询「所属分组」只显示 raw key

| 项 | 内容 |
|---|------|
| 现象 | 新建咨询弹窗中「所属分组」下拉选项显示原始 slug（如 `tokyo-1`），未经过 `resolveGroupLabel` 本地化为「东京一组」等 |
| 截图 | `02b-lead-create-dialog.png` |
| 关键文件 | `packages/admin/src/views/leads/components/LeadCreateModalBody.vue` L223–229；`packages/admin/src/views/leads/model/useLeadCatalogOptions.ts` |
| 修复模块 | `leads/model` — useLeadCatalogOptions |

---

## 2. 截图索引

| 编号 | 文件 | 内容 | 关联问题 |
|------|------|------|----------|
| 01 | `01-dashboard.png` | 仪表盘（快捷动作、KPI、待办、风险案件） | 走查起点 |
| 02 | `02-leads-list.png` | 咨询线索列表 | P2-11 |
| 02b | `02b-lead-create-dialog.png` | 新建咨询线索弹窗 | P2-13 |
| 03a | `03a-lead-detail-basic.png` | 咨询详情 — 基础信息 Tab（LEAD-202605-0009） | 走查上下文 |
| 03b | `03b-lead-detail-conversion.png` | 咨询详情 — 转化信息 Tab（已创建案件状态） | P1-3 |
| 03c | `03c-lead-detail-signed.png` | 咨询详情 — 基础信息（已签约 / LEAD-202605-0007） | P1-14 |
| 03d | `03d-lead-signed-conversion.png` | 咨询详情 — 转化信息（已签约，仅客户记录） | P1-3, P1-14 |
| 04 | `04-customers-list.png` | 客户列表 | 走查上下文 |
| 04a | `04a-customer-basic.png` | 客户详情 — 基础信息（CUS-202605-0014） | P1-7, P1-8, P1-9 |
| 04b | `04b-customer-cases.png` | 客户详情 — 关联案件 Tab | P1-10, P1-15 |
| 05 | `05-cases-list.png` | 案件列表 | P1-4, P1-5, P2-12 |
| 05a | `05a-case-overview.png` | 案件详情 — 概览（CASE-202605-0010） | P1-6 |
| 05b | `05b-case-documents.png` | 案件详情 — 资料清单 Tab | P0-1 |
| 05c | `05c-case-validation.png` | 案件详情 — 提交前检查 Tab | P0-2 |
| 05d | `05d-case-billing.png` | 案件详情 — 收费 Tab | 走查上下文 |
| 06 | `06-case-create.png` | 新建案件（开始办案步骤 1） | 走查上下文 |

---

## 3. 不在本轮范围

- ZIP 导出按钮（已明确"功能尚未上线"）
- 双人复核（已明确"事务所未启用"）
- COE / 海外贴签后段流程（当前案件未到该阶段）
- 风险标签（将在后续版本上线）

---

## 4. 待回灌

> 以下区域用于后续 ADR / 口径沉淀，与 AGENTS.md 的 file-back 闭环对齐。

### 4.1 可入库口径

- [x] 「主申请人天然为关联主体」— 案件创建后自动注入客户为第一条 RelatedParty（P1-6 修复确认済 2026-05-08）
- [x] 「storageRoot 未配置时的 UX 引导规范」— disabled 按钮必须附带 tooltip + 跳转链接（P0-1 修复确认済 2026-05-08）
- [x] 「客户摘要/列表 case 名称优先级」— caseTitle > caseName > caseNumber > ""（P1-9/P1-10 修复确认済 2026-05-08）

### 4.2 回归验证区

> 修复 PR 合并後、コードベースの静的検証（`npm run fix` + `npm run guard` 全通過）と
> ソースレベルの逐条コードレビューで各問題の修正を確認。
>
> 検証日：2026-05-08 / 検証方法：guard 全通過 + explore subagent ソースレビュー

| 問題 ID | 状態 | 検証日 | 備考 |
|---------|------|--------|------|
| P0-1 | FIXED | 2026-05-08 | CaseDocumentRow に tooltip（設定跳転リンク付き）追加、CaseDocumentsTab にバナー追加 |
| P0-2 | FIXED | 2026-05-08 | 阻断リスト noteKey/noteParams レンダリング追加、adaptGateItemDto に不完全フィールド fallback |
| P1-3 | FIXED | 2026-05-08 | LeadConvertedRecords → emit viewCustomer/viewCase、LeadDetailView でナビゲーション接続 |
| P1-4 | FIXED | 2026-05-08 | validationLabel/blockerCount を resolveValidationLabel/extractBlockerCount から導出 |
| P1-5 | FIXED | 2026-05-08 | seedDevData CASE-DEV-002 の case_type_code を engineer_specialist_intl_services に変更 |
| P1-6 | FIXED | 2026-05-08 | buildRelatedPartiesFromDeepLink で顧客を主申請人として自動注入 |
| P1-7 | FIXED | 2026-05-08 | visaTypeCode で business_manager/business-management を判定、bmvProfile 有無だけでは表示しない |
| P1-8 | FIXED | 2026-05-08 | パンくずに customer.displayName を優先表示 |
| P1-9 | FIXED | 2026-05-08 | サーバー caseTitle フィールド追加、フロント caseTitles 優先チェーン |
| P1-10 | FIXED | 2026-05-08 | CustomerAdapterCaseMapper の CUSTOMER_CASE_NAME_FIELDS に caseTitle 優先追加 |
| P1-14 | FIXED | 2026-05-08 | signed 状態で startCaseFromSigned i18n key に切替 |
| P1-15 | FIXED | 2026-05-08 | CustomerCasesTab 内の重複「開始辦案」ボタン削除 |
| P2-11 | FIXED | 2026-05-08 | LeadTableRow で resolveBusinessTypeLabel/resolveSourceLabel 使用、mapping 拡充 |
| P2-12 | FIXED | 2026-05-08 | prepare → cases.businessPhase.prepare i18n マッピング追加、DEV badge チップ追加 |
| P2-13 | FIXED | 2026-05-08 | useLeadCatalogOptions で resolveGroupLabel によるロケール対応 |

### 4.3 guard 実行結果

```
npm run fix  → exit 0（format + lint:fix 全通過）
npm run guard → exit 0
  ├─ lint:i18n       PASS
  ├─ lint:a11y       PASS（2 件 baseline 既知）
  ├─ mobile:guard    PASS（15 suites / 134 tests）
  ├─ admin:guard     PASS（563 suites / 8467 tests / typecheck / build）
  └─ server:guard    PASS（lint / typecheck / arch:check / migrations / tests）
```
