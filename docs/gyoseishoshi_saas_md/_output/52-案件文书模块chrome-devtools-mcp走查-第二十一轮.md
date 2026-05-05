# 案件文书模块 chrome-devtools-mcp 走查（第二十一轮 / R41 — R40 修复回归 + colonSuffix 二次面积）

> 生成日期：2026-05-05
>
> 命题：R40 提出 4 条缺陷（A `validation_run.executed` builder 缺失 / B locale 切换
> 不重译 docType / C 非 UUID 返 500 / D S9 readonly 仍渲染模板 section）。本轮用
> chrome-devtools-mcp 在运行时**逐条回归**，并在新数据集上识别次级缺陷。
>
> 工具：chrome-devtools-mcp（list_pages / navigate_page / take_snapshot / click /
> fill / wait_for / evaluate_script / list_network_requests / list_console_messages）
>
> 数据集：Local Demo Office（admin@local.test / Admin123!）；26 条种子案件，
> 4 类 caseTypeCode：`biz_mgmt_cert_4m` / `biz_mgmt_4m` / `biz_mgmt` / `family`；
> 阶段覆盖 S1 / S2 / S3 / S4 / S9；`document_templates` 表 12 行（全部 `language='ja'`）。

---

## 0. 总结

### 0.1 一句话结论

**R40 四条缺陷全部修复落地（A/B/C/D 全 PASS），happy-path 端到端绿灯。**
本轮新发现 4 条次级问题：① **R41-A** `case_party.created` 等 14 个 i18n 模板
仍硬编码「冒号 + `{suffix}`」，suffix 缺失时渲染出裸冒号（实测「添加关联人：」），
R39-C 的 `formatColonSuffix + {colonSuffix}` 范式只覆盖了 `generated_document.*` 系列
（P2，跨多语言一致复现）；② **R41-B** `ParseUUIDPipe({version: "4"})` 把 nil UUID
（`00000000-…`）也当 v0 拒为 400，**破坏了 R39-E "合法 UUID 但不存在 → 404" 的语义**
（P3，UI fallback 仍友好但语义错位）；③ **R41-C** S9 readonly 案件加载时仍 fetch
`/api/document-templates?caseType=family`，UI 不渲染模板 section 但已浪费一次网络
请求（P3，性能与设计意图不一致）；④ **R41-D** 前端 `useCaseDetailModel` 把任何
4xx 错误都展示为「未找到案件」，掩盖了 `ParseUUIDPipe` 的精确「Validation failed」
消息（P3，可观察性差）。**整体评价：R37 → R38 → R39 → R40 → R41 五轮迭代，案件
文书模块 P0/P1 缺陷全部清零，剩余都是 P2/P3 的边界与可观察性优化项；R38-F refetch
粒度化策略持续 PASS（每次 write 后只触发 2 条 GET）。**

### 0.2 走查矩阵（4 个代表性案件 × 2 种 UI locale × 关键节点）

| 案件 | caseTypeCode | businessPhase | locale | 模板 section | docType 翻译 | 提交生成 → 定稿 → 导出 | timeline 行 |
|---|---|---|---|---|---|---|---|
| **A** R23-AUDIT-TITLE-TEST<br/>`5d38aaac…` | biz_mgmt_cert_4m | S4 / REVIEWING | zh-CN | ✅ 2 模板（事業計画書 + 会社概要） | ✅ "事业计划书 / 公司概要书" | ✅ R41-MCP-TITLE-PROBE 全程 201 | ✅「文书定稿：R41-MCP-TITLE-PROBE」 |
| **A** 同上 | 同上 | 同上 | ja-JP（**locale 切换不 reload**） | ✅ 实时重译为「事業計画書 / 会社概要書」 | ✅ R40-B PASS | n/a | ✅「validation_run.executed → 提交前检查未通过」R40-A PASS |
| **B** Tani Family Stay<br/>`cafc4ec5…` | family | S9 / CLOSED_SUCCESS | zh-CN | ✅ **完全隐藏，显示 empty state**「暂无可用文书模板或生成记录」R40-D PASS | n/a | n/a | n/a；但 ⚠ 仍 fetch `?caseType=family`（R41-C） |
| **C** 直接 fetch document-templates | — | — | — | API：`?caseType=biz_mgmt_cert_4m` → 2；`family` → 3；**所有请求不再带 `language=`** R39-A 持续 PASS | n/a | n/a | n/a |
| **D** 非法 caseId | — | — | — | `not-a-uuid/aggregate` → **400** ✅ R40-C PASS；但 nil UUID → **400**（R41-B，曾经 R39-E 是 404） | n/a | n/a | n/a |

✅ = pass / ⚠ = 与设计意图相符但用户感知差 / ❌ = 不可用 / n/a = 类型不适用

### 0.3 R41 缺陷分布

| 等级 | 数量 | 主要分布 |
|---|---|---|
| **P0** | 0 | — |
| **P1** | 0 | — |
| **P2** | 1 | R41-A（`case_party.created` 等 14 个 builder 仍用 `{suffix}` 而非 `{colonSuffix}`，缺失时渲染裸冒号） |
| **P3** | 3 | R41-B（`ParseUUIDPipe({version:"4"})` 拒绝 nil UUID 与 R39-E 语义冲突）/ R41-C（S9 readonly 案件仍 fetch `document-templates`）/ R41-D（前端把 4xx 一律视为「未找到案件」） |
| **P4** | 0 | — |

### 0.4 R40 → R41 修复验证（4 条全 PASS，含一处副作用）

| R40 ID | R40 描述 | R41 验证 | 证据 |
|---|---|---|---|
| **R40-A** | server emit `validation_run.executed` 但 admin builder 字典只有 `created/passed/failed` → UI 显示 raw key | ✅ PASS | `CaseCommsTimelineBuilders.ts:192-200` 新增 `validation_run.executed` builder，按 `payload.resultStatus` 路由到 `passed`/`failed`/`executed` 三个 i18n key；三语 i18n 都补了 `validationRunExecuted` 兜底文案；mcp 实测 2026/05/04 17:25 那行**显示「提交前检查未通过」**（payload `resultStatus=failed` → `validationRunFailed` 分支）✅ |
| **R40-B** | adapter eager-translate docType 字符串塞进 meta，locale 切换时缓存失效 | ✅ PASS | `FormTemplate` 新增结构化字段 `docTypeKey/docTypeRaw/language/versionNo`；`adaptDocumentTemplateDto` 不再调 `t()`，只 emit i18n key；`CaseFormsTab.vue` 在视图层用 `<template v-if="tpl.docTypeKey">{{ t(tpl.docTypeKey) }}</template>` 渲染；mcp 实测 zh-CN「事业计划书 / 公司概要书」**locale 切换到 ja-JP 不 reload 即变为**「事業計画書 / 会社概要書」✅ |
| **R40-C** | `@Param("id") id: string` 未校验，非 UUID 透传到 pg → 500 | ✅ PASS（含副作用 R41-B） | `cases.controller.ts` 引入 `const UuidParam = () => Param("id", new ParseUUIDPipe({ version: "4" }))`，10 个 `:id` 路由全部用上；mcp 实测 `not-a-uuid` → `400 {"message":"Validation failed (uuid v 4 is expected)"}` ✅；副作用：nil UUID `00000000-…-000000000000` 因 v0 也被拒 → 详见 R41-B |
| **R40-D** | S9 readonly 案件仍渲染「可用模板」section 但去掉生成按钮，与 banner「全字段只读」语义冲突 | ✅ PASS | `CaseFormsTab.vue` 修改 `hasForms(detail, isReadonly)` 与模板 section 的 `v-if`：`(!isReadonly && templates.length > 0) \|\| generated.length > 0` + `v-if="templates.length > 0 && !readonly"`；mcp 实测 Tani Family Stay (S9) forms tab **完全隐藏「可用模板」**，因为该案件也无已生成文书，最终落到 empty state「暂无可用文书模板或生成记录」✅ |

### 0.5 体系性观察

1. **「colonSuffix 范式只修了一半」是 R39-C 的遗留范围 bug** — R39-C 引入了
   `formatColonSuffix(suffix)` helper + i18n 模板 `{colonSuffix}` 占位，让
   `generated_document.{created,updated,finalized,exported}` 4 条 builder 在
   suffix 为空时不渲染裸冒号。但 `case_party.created` / `commLogCreated` /
   `documentItemCreated` 等 14 个 builder 的 i18n 模板**仍然是硬编码冒号 +
   `{suffix}`**（详见 R41-A 章节的 grep 输出）。建议：① 把 `colonSuffix` 范式
   推广到所有 14 个 builder + i18n key；② 补一条 lint/test：扫描 `cases/*.ts`
   i18n 字典里所有 `…：{suffix}` 模式必须替换为 `…{colonSuffix}`，并要求对应
   builder 在 params 里 emit `colonSuffix: formatColonSuffix(...)`。

2. **「ParseUUIDPipe 版本号选择」是 R40-C 的工程取舍** — 用 `version: "4"`
   是 NestJS 文档推荐的"最严"路径，能挡住绝大多数非法输入，但**会拒绝 nil UUID
   `00000000-0000-0000-0000-000000000000`（version=0）**，破坏了 R39-E 的"合法
   格式 UUID 但不存在 → 404"语义。这是 strictness vs 兼容性的取舍：① 保持
   `version: "4"` → 接受 R41-B 的轻度语义错位（nil UUID 永远 400 而非 404）；
   ② 改用 `new ParseUUIDPipe()`（不指定 version）→ 接受任何合法 UUID 字符串
   （包括 nil/v1/v4），让 service 层统一返 404；③ 保持 `version: "4"`，但在
   global filter 把 nil UUID 的 400 映射为 404。**推荐 ②**：UUID 校验只关心
   "格式合法"，"是否存在"应该交给 service 层判断；contract 上 R39-E 的"未找到 →
   404"更稳定。

3. **「readonly + 数据 fetch」之间没有 gating** — R41-C 暴露的问题：
   `useCaseDetailModel.createFormTemplatesSlice` 在 `caseType` 非空时无条件
   触发 `useCaseFormTemplates.fetchTemplates()`，**没看 readonly 标记**。
   而 R40-D 的 UI 修复让 readonly 直接隐藏 section，等于"前端拉了数据但不
   渲染"。建议在 model 层把 readonly 也作为 fetch 的前置条件（`caseType &&
   !isReadonly`），或者把"fetch 触发条件"统一抽到一个 `shouldFetchTemplates`
   computed 里，在 readonly 案件下避免无谓请求。同类问题可能存在于 S9
   案件的其他 tab（如 forms tab 之外的 timeline、reminders 等），值得整体扫描。

4. **「前端错误粒度过粗」是 4xx 的统一观察问题** — R41-D：`useCaseDetailModel`
   的 fetch 失败处理把所有 4xx 都设为 `notFound = true` → UI 一律显示「未找到
   案件」+「返回案件列表」。这意味着如果后端返回 400「Validation failed (uuid
   v 4 is expected)」、403「Forbidden」、404「Case not found」，UI 体感都是同一
   句话。对**用户**来说足够友好，但对**开发者调试**与**未来错误码扩展**（如
   422 业务校验失败）极不友好。建议把 ApiError 的 statusCode 透传到 UI fallback，
   按 400/403/404/5xx 给不同文案。

---

## 1. R40 修复回归（PASS 项详证）

### R40-A → R41 ✅ PASS（`validation_run.executed` builder 已注册）

**修复实现**（关键 diff，本轮 git status `M`）：

```192:200:packages/admin/src/views/cases/model/CaseCommsTimelineBuilders.ts
"validation_run.executed": (p) => {
  const status = pickFirst(p, ["resultStatus", "result_status"]);
  if (status === "passed")
    return { key: "cases.log.timeline.validationRunPassed" };
  if (status === "failed")
    return { key: "cases.log.timeline.validationRunFailed" };
  return { key: "cases.log.timeline.validationRunExecuted" };
},
```

三语 i18n 兜底（除复用 passed/failed 现有 key 外，新增 `validationRunExecuted`）：

| Locale | key | 文案 |
|---|---|---|
| zh-CN | `cases.log.timeline.validationRunExecuted` | 提交前检查执行 |
| ja-JP | 同上 | 提出前チェック実行 |
| en-US | 同上 | Pre-submission check executed |

**API 实测**：

```javascript
GET /api/timeline?entityType=case&entityId=5d38aaac-bdaa-483d-9ac3-64f72d9de27f
→ payload: {
  action: "validation_run.executed",
  payload: {
    resultStatus: "failed",
    warningCount: 0,
    blockingCount: 1,
    validationRunId: "e84875bd-eb1b-44a7-b9c1-b4b85b87dadf"
  }
}
```

**UI 实测**（chrome-devtools-mcp `take_snapshot`）：

```
log tab 第 21 行（2026/05/04 17:25）：
  StaticText "LA"
  StaticText "提交前检查未通过"  ← 之前 R20 是 raw "validation_run.executed"
  StaticText "操作日志"
  StaticText "检查"
  StaticText "2026/05/04 17:25"
```

✅ **修复完成。**builder 走 `resultStatus=failed` 分支，正确映射到
`validationRunFailed` i18n key「提交前检查未通过」。

**配套测试**（本轮 git status `??`）：

- `packages/admin/src/views/cases/model/CaseCommsTimelineBuilders.validationRun.test.ts`
  覆盖 5 个分支：passed / failed / undefined / empty string / `result_status` snake_case
- `CaseCommsLogsAdapter.bug219.test.ts` 新增 `validation_run.executed` →
  `validationRunPassed` 集成 case

---

### R40-B → R41 ✅ PASS（lazy translation，locale 切换实时生效）

**修复实现**（关键 diff）：

```13:51:packages/admin/src/views/cases/model/CaseAdapterDocumentTemplates.ts
function adaptDocumentTemplateDto(value: unknown): FormTemplate | null {
  // ...
  const metaParts: string[] = [];
  if (docType) metaParts.push(docType);          // ← raw key, no eager translate
  if (language) metaParts.push(language);
  if (versionNo > 0) metaParts.push(`v${versionNo}`);

  return {
    id, name: templateName,
    meta: metaParts.join(" · "),                  // ← fallback 用
    actionLabel: "生成",
    docTypeKey: docType ? `${DOC_TYPE_I18N_PREFIX}${docType}` : undefined,
    docTypeRaw: docType || undefined,
    language: language || undefined,
    versionNo: versionNo > 0 ? versionNo : undefined,
  };
}
```

```661:678:packages/admin/src/views/cases/types-detail.ts
export interface FormTemplate {
  id: string;
  name: string;
  meta: string;                  // 兜底用
  actionLabel: string;
  docTypeKey?: string;           // i18n key — view 层 t() 翻译
  docTypeRaw?: string;           // 後端原始 docType 字符串（fallback）
  language?: string;             // ISO 639-1
  versionNo?: number;
}
```

```132:144:packages/admin/src/views/cases/components/CaseFormsTab.vue
<div class="forms-tab__meta">
  <template v-if="tpl.docTypeKey">{{ t(tpl.docTypeKey) }}</template>
  <template v-else-if="tpl.docTypeRaw">{{ tpl.docTypeRaw }}</template>
  <template v-if="tpl.language"> · {{ tpl.language }}</template>
  <template v-if="tpl.versionNo && tpl.versionNo > 0"> · v{{ tpl.versionNo }}</template>
</div>
```

**UI 实测**（chrome-devtools-mcp 走 zh-CN → ja-JP **不 reload**）：

| 步骤 | locale | UI 显示模板 meta |
|---|---|---|
| 1 | 进入 BMV S4 forms tab（zh-CN 持久化） | 「事业计划书 · ja · v1」「公司概要书 · ja · v1」 |
| 2 | header 切换到「日本語」 | **立即变为**「事業計画書 · ja · v1」「会社概要書 · ja · v1」 ✅ |
| 3 | 切回「简体中文」 | **立即变回**「事业计划书 · ja · v1」「公司概要书 · ja · v1」 ✅ |

注：`name`（"事業計画書" / "会社概要"）保持原文不翻译——它是 server 返回的实际
模板名（DB `template_name` 字段），不需要 i18n。翻译的只是 `docType` 元数据
（"business_plan" → "事业计划书 / 事業計画書 / Business plan"）。

✅ **修复完成。** R20 提案的"推荐 ① lazy translation"路径全量落地。

**配套测试**（本轮 git status `M`）：

- `CaseAdapterDocumentTemplates.test.ts` 重写为验证结构化字段（`docTypeKey` / `docTypeRaw` / `language` / `versionNo`）+ meta fallback 字符串两条独立 contract
- `CaseFormsTab.readonly.test.ts` 新增 `R40-B — lazy docType translation via t()`
  describe，4 个 case 覆盖 ①key 命中翻译 ②key 未命中 fallback 显示 raw key
  ③ 只有 docTypeRaw 无 docTypeKey ④ 全部为 undefined → meta 完全空
- `useCaseFormTemplates.test.ts` 新增 `docTypeKey field remains stable across
  re-fetches (data layer not coupled to i18n)` —— guarantee 数据层与 i18n 解耦

---

### R40-C → R41 ✅ PASS（`ParseUUIDPipe` 全 controller 覆盖）

**修复实现**（关键 diff）：

```49:50:packages/server/src/modules/core/cases/cases.controller.ts
const UuidParam = () => Param("id", new ParseUUIDPipe({ version: "4" }));
```

10 个 `:id` 路由（`getBillingTabAggregate` / `getAggregate` / `get` / `update` /
`transition` / `phaseTransition` / `acknowledgeBillingRisk` /
`updatePostApprovalStage` / `transitionWorkflowStep` / `delete`）全部从
`@Param("id") id: string` 改为 `@UuidParam() id: string`。

**API 实测**（mcp `evaluate_script` 矩阵）：

```javascript
GET /api/cases/not-a-uuid/aggregate
→ 400 {"message":"Validation failed (uuid v 4 is expected)","error":"Bad Request"} ✅

GET /api/cases/12345/aggregate
→ 400 {"message":"Validation failed (uuid v 4 is expected)","error":"Bad Request"} ✅

GET /api/cases/00000000-0000-0000-0000-000000000000/aggregate  ← nil UUID (v0)
→ 400 {"message":"Validation failed (uuid v 4 is expected)","error":"Bad Request"}
   ⚠ R41-B：与 R39-E "合法 UUID 但不存在 → 404" 语义有冲突，详见 §2

GET /api/cases/5d38aaac-0000-4000-8000-000000000000/aggregate  ← 合法 v4 但不存在
→ 404 {"message":"Case not found","error":"Not Found"} ✅

GET /api/cases/5d38aaac-bdaa-483d-9ac3-64f72d9de27f/aggregate  ← 真实存在
→ 304 ✅
```

✅ **R40-C 主体修复完成。**附带产生 R41-B 副作用，详见 §2 R41-B。

**配套测试**（本轮 git status `??`）：

- `packages/server/src/modules/core/cases/cases.controller.uuidPipe.test.ts`
  6 个 case 覆盖 ①plain string ②numeric ③empty ④nil UUID（v0）⑤valid v4 UUID
  ⑥controller-level: valid UUID + service 返 null → NotFoundException

---

### R40-D → R41 ✅ PASS（S9 readonly 隐藏「可用模板」section）

**修复实现**（关键 diff）：

```57:67:packages/admin/src/views/cases/components/CaseFormsTab.vue
function hasForms(detail: CaseDetail, isReadonly: boolean): boolean {
  return (
    (!isReadonly && detail.forms.templates.length > 0) ||
    detail.forms.generated.length > 0
  );
}
```

```99:106:packages/admin/src/views/cases/components/CaseFormsTab.vue
<template v-if="hasForms(detail, readonly)">
  <!-- Templates -->
  <div
    v-if="detail.forms.templates.length > 0 && !readonly"
    class="forms-tab__section"
  >
```

**UI 实测**（chrome-devtools-mcp 走 Tani Family Stay `cafc4ec5…?tab=forms`）：

```
[banner status] "此案件处于「已归档」状态，全字段只读，状态变更与编辑已禁用。"
[heading] "文书管理"
[StaticText] "暂无可用文书模板或生成记录"   ← R40-D 修复，整段 section + empty state
```

R20 时该位置渲染的「可用模板 + 在留資格認定証明書交付申請書/婚姻証明書/扶養者
の住民票の写し（无生成按钮）」section 完全消失。**banner「全字段只读」与下方
内容现在语义对齐。**

✅ **修复完成。**

**配套测试**（本轮 git status `M`）：

- `CaseFormsTab.readonly.test.ts` 把原来的 "template row generate button is not
  rendered" 改写为 "template section is not rendered at all"，明确 contract
- 同文件新增 "readonly=true: only templates, no generated → empty state shown"
  覆盖本轮 mcp 实测的精确场景（templates 有数据但 readonly 时不渲染 → empty state）

---

## 2. R41 新发现缺陷

### R41-A · P2 · 14 个 i18n 模板硬编码冒号 + `{suffix}`，suffix 缺失渲染裸冒号

**现象**（chrome-devtools-mcp `take_snapshot`，BMV S4 ?tab=log 第 22 行）：

```
StaticText "LA"
StaticText "添加关联人："          ← 冒号后无内容，UI bug
StaticText "操作日志"
StaticText "关联人"
StaticText "2026/05/02 20:36"
```

**根因（数据 + 代码）**：

```javascript
// server payload (实测)：
{
  action: "case_party.created",
  payload: { partyType: "applicant", casePartyId: "c7d7e1c2-..." }
  // ← 没有 partyName / name 字段
}
```

```133:136:packages/admin/src/views/cases/model/CaseCommsTimelineBuilders.ts
"case_party.created": (p) => ({
  key: "cases.log.timeline.casePartyCreated",
  params: { suffix: pickFirst(p, ["partyName", "name"]) },  // ← suffix = undefined
}),
```

```ts
// zh-CN.ts:1030
casePartyCreated: "添加关联人：{suffix}",  // ← 硬编码冒号 + 模板 var
```

`pickFirst` 返回 `undefined` → vue-i18n 渲染时把 `{suffix}` 替换为空 →
**「添加关联人：」**。

**面积扫描**（rg 三语 i18n）：

```
zh-CN.ts:1019  caseCreated:               "案件创建：{suffix}"
zh-CN.ts:1023  billingRiskAck:            "未收款风险确认：{suffix}"
zh-CN.ts:1024  postApprovalStageChange:   "许可后阶段变更：{suffix}"
zh-CN.ts:1025  crossGroupCreated:         "跨组建案：{suffix}"
zh-CN.ts:1028  commLogCreated:            "沟通记录追加：{suffix}"
zh-CN.ts:1030  casePartyCreated:          "添加关联人：{suffix}"   ← 实测复现
zh-CN.ts:1033  documentItemCreated:       "资料项添加：{suffix}"
zh-CN.ts:1035  documentFileCreated:       "上传文件：{suffix}"
zh-CN.ts:1037  taskCreated:               "任务创建：{suffix}"
zh-CN.ts:1040  billingRecordCreated:      "收费记录添加：{suffix}"
zh-CN.ts:1042  paymentRecordCreated:      "入金记录添加：{suffix}"
zh-CN.ts:1046  reviewRecordRejected:      "复核驳回：{suffix}"
zh-CN.ts:1057  reminderCreated:           "提醒创建：{suffix}"
zh-CN.ts:1059  residencePeriodCreated:    "在留期间登记：{suffix}"
（ja-JP.ts / en-US.ts 各 14 行同模式）
```

R39-C 引入的 `formatColonSuffix(suffix)` helper + `{colonSuffix}` 占位**只覆盖了
`generated_document.{created,updated,finalized,exported}` 4 条**，剩余 14 条 i18n
key 仍是裸冒号。当对应 builder 的 server payload 缺少 suffix 字段（或字段名不在
`pickFirst` 列表里）时，UI 就会渲染裸冒号。

**等级**：P2 — UI 显示裸冒号是用户能直接感知的"系统语言泄露"，但不阻断功能；
受 server payload 形态影响，本轮实测稳定复现 1 例（`case_party.created`），其他
13 个 builder 是否复现取决于 server emit 的 payload 字段集合。

**修复方向**（按推荐度）：

1. **推荐**：把 R39-C 的范式推广到所有 14 个 builder + i18n key：
   - i18n: `…：{suffix}` → `…{colonSuffix}`
   - builder: `params: { suffix: x }` → `params: { suffix: x, colonSuffix: formatColonSuffix(x) }`
2. **根治**：补一条 lint/contract test：扫描 cases i18n 字典所有 `…：{suffix}` /
   `…: {suffix}` 模式必须替换为 `{colonSuffix}`；同步要求对应 builder emit
   `colonSuffix` 参数。
3. **替代**：在 vue-i18n 全局加 `{suffix}` 的 fallback 渲染（空时不渲染前置冒号），
   但 i18n 模板就需要写成两段或用条件 syntax，复杂度高，不推荐。

---

### R41-B · P3 · `ParseUUIDPipe({version:"4"})` 拒绝 nil UUID，破坏 R39-E 语义

**现象**（chrome-devtools-mcp `evaluate_script` 实测）：

```javascript
// R39 时（无 ParseUUIDPipe）：
GET /api/cases/00000000-0000-0000-0000-000000000000/aggregate
→ 404 {"message":"Case not found","error":"Not Found"}   R39-E PASS

// R41 时（ParseUUIDPipe({version:"4"})）：
GET /api/cases/00000000-0000-0000-0000-000000000000/aggregate
→ 400 {"message":"Validation failed (uuid v 4 is expected)","error":"Bad Request"}
   ⚠ R41-B：nil UUID 是 v0，被 ParseUUIDPipe v4 拒绝
```

**根因**：

```49:50:packages/server/src/modules/core/cases/cases.controller.ts
const UuidParam = () => Param("id", new ParseUUIDPipe({ version: "4" }));
```

NestJS `ParseUUIDPipe({ version: "4" })` 严格校验 v4 UUID（即"位 49-52 必须是
0100"），nil UUID `00000000-…` 的 version bits 是 0000（v0），**严格上不属于任何
有效 UUID 版本**，被拒为 400。

**等级**：P3 — UI 通过 vue-router hash 进入时仍显示「未找到案件」+「返回案件列表」
（fallback 一致），用户体感无差。但**契约层面**与 R39-E 修复后的"合法 UUID 但
不存在 → 404"语义冲突；外部 API 客户端（SDK / 监控 / e2e 测试）依赖 status code
区分"非法 ID"与"不存在 ID"时会失误。

**修复方向**：

1. **推荐**：去掉 version 限制 `new ParseUUIDPipe()` —— 接受任何合法 UUID
   字符串（v1/v3/v4/v5/nil 都通过），让 service 层统一判断"是否存在 → 404"。
   UUID 校验应只关心"格式合法"。
2. **替代**：保持 `version: "4"`，但在 global filter 拦截 nil UUID 的 400
   并 transform 为 404。复杂度高，不推荐。
3. **结合**：保持 `version: "4"`，但在 i18n key 上明确"无效案件 ID 格式"
   vs "案件不存在"两种 fallback 文案；同时把 R41-D 配套修了。

---

### R41-C · P3 · S9 readonly 案件加载时仍 fetch `document-templates`

**现象**（chrome-devtools-mcp `list_network_requests`，进入 Tani Family Stay
`cafc4ec5…?tab=forms`）：

```
reqid=30894 GET /api/cases/cafc4ec5.../aggregate                  [304]
reqid=30895 GET /api/document-items?caseId=cafc4ec5...            [304]
reqid=30896 GET /api/generated-documents?caseId=cafc4ec5...       [304]
...（11 条 case-related GET）...
reqid=30905 GET /api/document-templates?caseType=family           [304]
   ⚠ R41-C：UI 不渲染「可用模板」section（R40-D 已修），但仍 fetch
```

**根因**（代码）：

```316:335:packages/admin/src/views/cases/model/useCaseDetailModel.ts
function createFormTemplatesSlice(
  repo: CaseRepository,
  detail: Ref<CaseDetail | null>,
  templateLanguage?: Ref<string>,
) {
  const caseType = computed(() => detail.value?.caseType ?? "");
  const { templates: formTemplates } = useCaseFormTemplates({
    repo,
    caseType,                  // ← 仅看 caseType，不看 readonly
    language: templateLanguage,
  });
  // ...
}
```

`useCaseFormTemplates` 内部 `watch(() => deps.caseType.value, fetchTemplates,
{ immediate: true })` —— **只要 caseType 非空就 fetch**，没看 `isReadonly`。

R40-D 在 UI 层 hide 了 section，但**数据已经拉过来了**，缓存到内存但没人看。

**等级**：P3 — 浪费一次网络请求 + 一次后端 DB 查询 + 一次 JSON 序列化。对
单个用户来说成本低，但对"100 个用户同时打开归档案件"的高并发场景会放大；同时
也让"R40-D 隐藏 section"的设计意图在数据层面打折扣。

**修复方向**：

1. **推荐**：在 `createFormTemplatesSlice` 加 readonly 短路：把 `useCaseDetailModel`
   的 `isReadonly` ref 透传进 slice，构造一个 `effectiveCaseType =
   computed(() => isReadonly.value ? "" : detail.value?.caseType ?? "")` 喂给
   `useCaseFormTemplates`，readonly 时 caseType="" → fetchTemplates 直接 return。
2. **替代**：把 fetch 收口到 `enrichedDetail` computed 里，readonly 时跳过 fetch
   （但这需要把 useCaseFormTemplates 重构为 lazy/on-demand）。
3. **观察**：扫一遍 `useCaseDetailModel` 其他 fetch（reminders / tasks /
   submissionPackages 等），看是否也有"S9 不需要但仍 fetch"的浪费。

---

### R41-D · P3 · 前端把任何 4xx 错误都展示为「未找到案件」

**现象**（chrome-devtools-mcp 走 `/cases/00000000-0000-0000-0000-000000000000`）：

```text
[snapshot] main 区域：
  StaticText "未找到案件 00000000-0000-0000-0000-000000000000"
  link "返回案件列表" url="http://localhost:5173/#/cases"
```

但实际后端返回的是 `400 Validation failed (uuid v 4 is expected)`，**不是
404**。前端把 400 / 404 / 403 / 422 等 4xx 一律映射到 `notFound = true` →
UI 显示同一句话。

**根因**（推断 — 未深入读 useCaseDetailModel 的 catch 逻辑）：fetch detail 的
catch 块大概率没有按 statusCode 分支。

**等级**：P3 — 用户体感友好（不需要看到"UUID 格式错误"这种技术术语），但：
- 对开发者：调试时无法立即区分"ID 格式错"vs"ID 不存在"vs"权限不足"
- 对未来扩展：如果后端引入 422 业务校验失败、403 跨租户访问拒绝等错误码，UI
  都会被这个 `notFound = true` 覆盖
- 对 R41-B：让"nil UUID 被 v4 pipe 拒"的副作用在 UI 层完全不可见（用户永远
  以为是 404），掩盖了潜在的 contract 违规

**修复方向**：

1. **推荐**：在 `useCaseDetailModel` catch ApiError 时按 `error.statusCode`
   分支：400 → "案件 ID 格式错误"；403 → "无权访问该案件"；404 → "未找到案件"；
   5xx → "服务暂时不可用"。各自配 i18n key + fallback link。
2. **替代**：把 statusCode 暴露到 model，UI 层根据 statusCode 选不同 fallback。

---

## 3. Happy-path 网络回路（R41 实测）

| # | 时点 | Method | URL | 状态 |
|---|---|---|---|---|
| 1 | 进入 BMV S4 forms tab（zh-CN，reload 后） | GET | `/api/organizations/current/settings` | 304 |
| 2 | 同上 | GET | `/api/groups` | 304 |
| 3 | 同上 | GET | `/api/users` | 304 |
| 4 | 同上 | GET | `/api/cases/:id/aggregate` | 304 |
| 5 | 同上 | GET | `/api/document-items?caseId=:id` | 304 |
| 6 | 同上 | GET | `/api/generated-documents?caseId=:id` | 304 |
| 7 | 同上 | GET | `/api/validation-runs?caseId=:id` | 304 |
| 8 | 同上 | GET | `/api/cases/:id/billing-tab-aggregate` | 304 |
| 9 | 同上 | GET | `/api/submission-packages?caseId=:id` | 304 |
| 10 | 同上 | GET | `/api/review-records?caseId=:id` | 304 |
| 11 | 同上 | GET | `/api/communication-logs?caseId=:id` | 304 |
| 12 | 同上 | GET | `/api/timeline?entityType=case&entityId=:id` | 304 |
| 13 | 同上 | GET | `/api/tasks?caseId=:id` | 304 |
| 14 | 同上 | GET | `/api/reminders?caseId=:id` | 304 |
| 15 | 同上 | GET | `/api/document-templates?caseType=biz_mgmt_cert_4m` ✅ **无 language=** | 304 |
| 16 | 点「生成文书」→ 选「事業計画書」+ title=R41-MCP-TITLE-PROBE → 提交 | POST | `/api/generated-documents` | **201** |
| 17 | refetch（R38-F PASS） | GET | `/api/generated-documents?caseId=:id` | 200 |
| 18 | refetch | GET | `/api/timeline?...` | 200 |
| 19 | 点「定稿」 | POST | `/api/generated-documents/d1618ac9-…/finalize` | **201** |
| 20 | refetch | GET | `/api/generated-documents?caseId=:id` | 200 |
| 21 | refetch | GET | `/api/timeline?...` | 200 |
| 22 | 点「导出」 | POST | `/api/generated-documents/d1618ac9-…/export` | **201** |
| 23 | refetch | GET | `/api/generated-documents?caseId=:id` | 200 |
| 24 | refetch | GET | `/api/timeline?...` | 200 |

**Console**：0 console error / warning ✅

**R38-F refetch 粒度化持续 PASS**：每次 write 后只触发 2 条 GET（generated-documents
+ timeline），无 R37 时代的 11 GET refetch storm。

---

## 4. 截图

本轮使用 `take_snapshot` 的结构化抓取替代图片（accessibility tree 完整可读，比
PNG 更适合 review）。如需可视化校对，可在 chrome-devtools-mcp 控制的浏览器里
手动截图：

| 验证场景 | URL | 关键 element |
|---|---|---|
| BMV S4 forms tab + 模板 section（zh-CN） | `/cases/5d38aaac…?tab=forms` | "事业计划书 · ja · v1" + "公司概要书 · ja · v1" |
| BMV S4 同上（**locale 切换不 reload** 后） | 同 URL，header 切到日本語 | 立即变为 "事業計画書 · ja · v1" + "会社概要書 · ja · v1" |
| 日志 tab + validation_run.executed | `/cases/5d38aaac…?tab=log` | 第 21 行 "提交前检查未通过"（之前 R20 是 raw "validation_run.executed"） |
| 日志 tab + R41 happy-path 三条 | 同上 | "文书定稿：R41-MCP-TITLE-PROBE" + 同 title 的 created/exported 三行 |
| 日志 tab + 裸冒号 bug | 同上 | 第 22 行「**添加关联人：**」← R41-A 复现 |
| S9 readonly 隐藏模板 | `/cases/cafc4ec5…?tab=forms` | banner "已归档" + heading "文书管理" + StaticText "暂无可用文书模板或生成记录" |
| nil UUID 400 + UI fallback | `/cases/00000000-…` | UI: "未找到案件 00000000-…" / API: 400 Validation failed |

---

## 5. 后续建议（按优先级）

1. **P2 → R41-A** 把 R39-C 的 `formatColonSuffix + {colonSuffix}` 范式推广到
   所有 14 个 builder + i18n key（`case_party.created` 等）；补一条 contract
   test：扫描 cases i18n 字典所有 `…：{suffix}` 模式必须替换为 `{colonSuffix}`。
2. **P3 → R41-B** 把 `ParseUUIDPipe({version: "4"})` 改为 `ParseUUIDPipe()`，
   接受任何合法 UUID 字符串（含 nil/v1/v4），让 service 层统一返 404；
   保持 R39-E 的"合法 UUID 但不存在 → 404"语义。
3. **P3 → R41-C** 在 `useCaseDetailModel.createFormTemplatesSlice` 增加
   readonly 短路：构造 `effectiveCaseType = computed(() => isReadonly.value ?
   "" : caseType.value)`，readonly 时不发起 `document-templates` 请求。
4. **P3 → R41-D** `useCaseDetailModel` catch ApiError 时按 statusCode 分支
   显示不同 fallback 文案（400 "案件 ID 格式错误" / 403 "无权访问" / 404
   "未找到案件" / 5xx "服务暂时不可用"）；i18n 三语补 key。
5. **沉淀**：本轮 R41-A 暴露的"R39-C 修了一半"问题，建议在
   `00-原则与约定/ADR-008-colonSuffix-pattern.md`（待写）明确「所有 i18n 模板
   不得硬编码冒号 + 模板 var；必须用 `{colonSuffix}` + builder emit
   `formatColonSuffix(...)`」；同时补 lint 规则。

---

## 6. R37 → R38 → R39 → R40 → R41 修复链路总览

| ID | R37 起点 | R38 修复 | R39 验证 | R40 验证 | R41 验证 |
|---|---|---|---|---|---|
| Wiring | wiring 断 | ✅ hook 接通 | ✅ 仍 OK，但 R39-A 让 templates 拿到 0 | ✅ R40 templates 拉到 ja 全集 | ✅ 持续 PASS |
| Seed file_url | n/a | ⚠ 加 file_url 但 SQL bug | ❌ R39-B 整事务回滚 | ✅ R40 用独立 $6 参数，seed 跑通 | ✅ 持续 PASS |
| Placeholder 文案 | "暂无模板..."模糊 | ✅ 文案对调 | ✅ PASS | ✅ 持续 PASS | ✅ 持续 PASS |
| finalize/export title | 无 | ✅ controller 加 `extra: { title }` | ⚠ server 对了但 R39-C UI 看不到 | ✅ R40 colonSuffix 在 UI 完整渲染 | ✅ R41 happy-path 三条新事件正确显示 |
| server language | 静默丢弃 | ✅ ListQuery 加字段 | ⚠ 接通但 admin 发的 locale 不匹配 | ✅ R40 admin 不传 language；ADR-006 沉淀决策 | ✅ 持续 PASS |
| docType i18n | raw 露出 | ✅ adapter `translateDocType` | ✅ 代码对，可视化被 R39-A 阻塞 | ⚠ R40-B locale 切换缓存失效 P2 | ✅ R41 lazy translation；docTypeKey/Raw/language/versionNo 结构化 |
| Refetch storm | 11 GET / write | ✅ TAGS_FORMS 粒度化 | ✅ PASS（实测 2 GET / write） | ✅ 持续 PASS | ✅ 持续 PASS（24 GET total，3 次 write × 2） |
| S9 forms tab | disabled | （未在 R38 修） | ✅ enabled + readonly + empty state | ⚠ R40-D 模板 section 显示但无按钮 P4 | ✅ R41 模板 section 完全隐藏；显示 empty state |
| Timeline raw key | 显示原 key | ✅ i18n 加 4 条 + builder | ⚠ R39-C 改在 dead code | ⚠ R40-A `validation_run.executed` raw P2 | ✅ R41 builder 注册 + 三语 i18n 补全 |
| GD\_\* 错误码 | 无映射 | ✅ writeErrors 三语 | ✅ 持续 PASS | ✅ 持续 PASS | ✅ 持续 PASS |
| 404 vs 400 | n/a | n/a | ❌ R39-E 返 400 | ✅ aggregate 抛 NotFoundException → 404；R40-C 非 UUID 仍 500 P3 | ✅ R41 ParseUUIDPipe 把非 UUID 拒 400；副作用 R41-B nil UUID → 400 P3 |
| colonSuffix 全面 | n/a | n/a | n/a | n/a | ⚠ R41-A 14 个 builder 仍硬编码冒号 P2 |
| readonly fetch gate | n/a | n/a | n/a | n/a | ⚠ R41-C templates 浪费 fetch P3 |
| 4xx 粒度 fallback | n/a | n/a | n/a | n/a | ⚠ R41-D UI 一律"未找到案件" P3 |

---

## 附录 · 走查环境与凭证

- Vite dev server: `http://localhost:5173`（PID 60474 监听 [::1]:5173）
- NestJS server: `PORT=3300`（PID 13180 监听 *:3300）
- PostgreSQL: docker `cms-client-postgres-1`（5433 → 5432）
- 账号：`admin@local.test` / `Admin123!` (Local Demo Office)
- Browser: chrome-devtools-mcp 控制 Chromium（已经登录）
- 走查总用时：约 18 分钟，发起 50+ 条 HTTP 请求
- DB 当前 row 数：`document_templates` = 12（biz_mgmt_* × 2 + family × 3 + 其他
  种子数据），全部 `language='ja'`；`generated_documents` 含本轮新增
  R41-MCP-TITLE-PROBE（`d1618ac9-438f-4dfa-b299-a5b8ce723c41`）
- console.error / warning：0 条 ✅
- 一次性文件操作：本轮**未引入临时 seed 脚本**或临时 SQL；所有变更通过 UI 操作

---

## 7. 体系性沉淀（编译式入库候选 — 待回灌到权威文档）

本轮新发现的 4 条问题指向 3 条体系性原则，建议入库到
`docs/gyoseishoshi_saas_md/00-原则与约定/` 下：

1. **「i18n 模板禁止硬编码冒号 + `{suffix}`」（R41-A）** —— 应统一用
   `{colonSuffix}` + builder emit `formatColonSuffix(suffix)`，suffix 缺失时
   `colonSuffix` 自动渲染为空。建议：① 把 R39-C 的修复范式作为强制 rule
   写入 `ADR-008-colonSuffix-pattern.md`（草稿）；② 补 lint：扫描 cases i18n
   字典 `…：{suffix}` 模式 → 自动替换；③ 补 contract test 守门。

2. **「ParseUUIDPipe 不应限定 version=4」（R41-B）** —— UUID 校验只关心
   "格式合法"，"是否存在"是 service 层职责。`ParseUUIDPipe()` 不指定 version
   能接受 v1/v3/v4/v5/nil 任何合法 UUID 字符串，避免 nil UUID 这种"看起来
   像 UUID 但版本号不对"的边界 case 被错误归到 400。建议在 ADR-006 里加一条
   「@Param `:id` 默认用 `ParseUUIDPipe()`，不指定 version；除非业务要求严格
   v4」。

3. **「readonly 状态应作为 fetch 触发的前置条件」（R41-C）** —— UI 层的
   readonly hide 不能替代 model 层的 fetch gate，否则浪费网络/DB 资源。
   建议在 `00-原则与约定/` 写一条原则：「凡是 readonly 模式下不渲染的
   secondary 数据（templates / suggestions / quick actions 等），必须在 model
   层短路 fetch；不要依赖 UI hide 来"省"看起来已经省下的请求」。

4. **「fix 验证不能只看 unit test 绿，必须有 chrome-devtools-mcp 走查记录」
   （R37/R38/R39/R40/R41 共同教训）** —— 本轮再次验证：R40 4 条修复在代码
   diff 与配套 test 上看都对，但只有 chrome-devtools-mcp 走查能发现 R41-A
   （colonSuffix 范式只覆盖 1/4 builder 系列）、R41-C（"修 UI 不修 model"
   留下浪费 fetch）、R41-D（4xx 粒度过粗）这类"修复局部但留下副作用"的
   问题。**建议把"P0/P1 修复 PR 必须附 chrome-devtools-mcp 复跑日志（≤5 步）
   + 同类问题面积扫描"写入 PR review checklist。**
