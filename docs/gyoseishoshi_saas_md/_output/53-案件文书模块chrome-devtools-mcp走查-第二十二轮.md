# 案件文书模块 chrome-devtools-mcp 走查（第二十二轮 / R42 — R41 修复回归 + colonSuffix×suffixKey 联动 bug）

> 生成日期：2026-05-05
>
> 命题：R41 提出 4 条次级缺陷（A `case_party.created` 等 14 个 builder 硬编码冒号 /
> B `ParseUUIDPipe({version:"4"})` 拒 nil UUID / C S9 readonly 仍 fetch
> document-templates / D 4xx 一律映射为 notFound）。本轮用 chrome-devtools-mcp
> 在运行时**逐条回归**，并在 R41-A 范式推广后识别次级缺陷。
>
> 工具：chrome-devtools-mcp（list_pages / navigate_page / take_snapshot / click /
> fill / wait_for / evaluate_script / list_network_requests / list_console_messages）
>
> 数据集：Local Demo Office（admin@local.test / Admin123!）；约 27 条种子案件；
> 阶段覆盖 S2 / S4 / S9；本轮新增 R42-MCP-TITLE-PROBE（v4 finalize+export）。

---

## 0. 总结

### 0.1 一句话结论

**R41 四条次级缺陷全部修复落地（A/B/C/D 全 PASS），happy-path 端到端绿灯。**
本轮新发现 1 条次级问题：**R42-A** `colonSuffix`（builder 端 `formatColonSuffix(suffix)`
预计算）与 `suffixKey`（resolver 端 `t(suffixKey) → params.suffix` 二次翻译）
机制**不联动**，导致 `case.created` / `communication_log.created` 在 ja-JP /
en-US locale 下渲染**未翻译的 raw 值**（实测「案件作成：biz_mgmt_cert_4m」/
「連絡記録追加：internal_note」）。**R41-A 把范式推广到所有 14 个 builder
解决了「suffix 缺失渲染裸冒号」，但忽略了「suffix 是 i18n key 占位」的子集**
（P3，跨多语言一致复现）。**整体评价：R37 → R38 → R39 → R40 → R41 → R42
六轮迭代，案件文书模块 P0/P1/P2 缺陷全部清零，R42 唯一新缺陷是 R41-A 范式
推广时遗漏的边界 case；R38-F refetch 粒度化持续 PASS（每次 write 后只触发
2 条 GET）；console.error / warning：0 条。**

### 0.2 走查矩阵（4 个代表性入口 × 2 种 UI locale × 关键节点）

| 入口 | URL / API | locale | 关键节点 | R42 验证结果 |
|---|---|---|---|---|
| **A** R23-AUDIT-TITLE-TEST<br/>`5d38aaac…` | `/cases/5d38aaac…?tab=forms` | zh-CN → ja-JP | 模板 section / docType 翻译 / happy-path | ✅ R40-B locale 切换实时重译 / ✅ R41-A `関連人追加` 不再裸冒号 / ⚠️ **R42-A** `案件作成：biz_mgmt_cert_4m` raw 暴露 |
| **A** 同上 | `/cases/5d38aaac…?tab=log` | ja-JP | timeline 三条 R42 新事件 | ✅ 「書類生成 / 文書確定 / 文書エクスポート：R42-MCP-TITLE-PROBE」全部正确显示 |
| **B** Tani Family Stay<br/>`cafc4ec5…` | `/cases/cafc4ec5…?tab=forms` | zh-CN | S9 readonly fetch gate | ✅ **R41-C PASS** — 仅 11 条 case-related GET，**无 `document-templates` 请求**（相比 R41 减少 1 条） |
| **C** UUID matrix | `/api/cases/:id/aggregate` | n/a | 5 类 UUID + 1 路由空 | ✅ **R41-B PASS** — non-UUID 400 / nil UUID v0 → 404 / v1 → 404 / valid v4 不存在 → 404 / 真实存在 → 200 |
| **D** UI fallback | `/cases/not-a-uuid`<br/>`/cases/00000…` | zh-CN | 错误粒度文案 | ✅ **R41-D PASS** — 400 显示「案件 ID 格式错误：not-a-uuid」；404 显示「未找到案件 …」 |

✅ = pass / ⚠️ = 不阻断功能但有体感 / ❌ = 不可用 / n/a = 类型不适用

### 0.3 R42 缺陷分布

| 等级 | 数量 | 主要分布 |
|---|---|---|
| **P0** | 0 | — |
| **P1** | 0 | — |
| **P2** | 0 | — |
| **P3** | 1 | R42-A（`{colonSuffix}` 占位与 `suffixKey` 二次翻译机制不联动，`case.created` / `communication_log.created` 在 ja/en locale 下显示 raw caseTypeCode / channelType） |
| **P4** | 1 | R42-B（ja-JP `書類生成` vs `文書確定 / 文書エクスポート` 混用「書類」与「文書」，建议统一） |

### 0.4 R41 → R42 修复验证（4 条全 PASS）

| R41 ID | R41 描述 | R42 验证 | 证据 |
|---|---|---|---|
| **R41-A** | 14 个 i18n key 硬编码`：{suffix}`，suffix 缺失渲染「添加关联人：」裸冒号 | ✅ PASS | `CaseCommsTimelineBuilders.ts` 全 14 处改为 `params: { suffix, colonSuffix: formatColonSuffix(suffix) }`；三语 i18n 全部把 `…：{suffix}` 改为 `…{colonSuffix}`；mcp 实测 BMV S4 log tab 第 25 行 `関連人追加`（uid=192_146）**无裸冒号** ✅ |
| **R41-B** | `ParseUUIDPipe({version:"4"})` 拒 nil UUID v0，破坏 R39-E 语义 | ✅ PASS | `cases.controller.ts:49` 改为 `new ParseUUIDPipe()`（去掉 version 限制）；mcp 实测 nil UUID `00000000-0000-0000-0000-000000000000` → **404 Case not found**（R41 时是 400）；v1 UUID `11111111-…` → **404**；非 UUID `not-a-uuid` 仍 400；R39-E "合法 UUID 不存在 → 404" 语义恢复 ✅ |
| **R41-C** | `useCaseDetailModel.createFormTemplatesSlice` 无视 readonly，S9 案件仍 fetch document-templates | ✅ PASS | 引入 `effectiveCaseType = computed(() => isReadonly.value ? "" : detail.value?.caseType ?? "")`；mcp 实测 S9 readonly Tani Family Stay reload `?tab=forms` 后**仅 11 条 case-related GET**，**无 `/api/document-templates` 请求**；相比 R41 时 12 条减少 1 条 ✅ |
| **R41-D** | fetch 失败一律设 `notFound = true`，UI 一律「未找到案件」掩盖 400/403/5xx | ✅ PASS | 新增 `useCaseDetailErrorStatus.ts`（`extractErrorStatus` + `deriveNotFoundReason`，输出 `badRequest`/`forbidden`/`notFound`/`serverError` 4 种分类）；`CaseDetailView.vue` 切换 i18n key `cases.detail.notFound.${reason}.message`；三语 i18n 补 `badRequest` / `forbidden` / `serverError` 三条文案；mcp 实测 `not-a-uuid` URL → **「案件 ID 格式错误：not-a-uuid」**（R41 是 raw "未找到案件"），nil UUID URL → **「未找到案件 ...」**（404 → notFound 分支）✅ |

### 0.5 体系性观察

1. **「colonSuffix 与 suffixKey 是两套机制，但缺失联动」** — R42-A 暴露的根因：
   - `formatColonSuffix(suffix)` 在 **builder 层**预计算，得到 `：biz_mgmt_cert_4m`
   - `resolveKeyParam(params, "suffixKey", "suffix", i18n)` 在 **resolver 层**
     做二次翻译，把 `params.suffix` 改成 `経営管理ビザ · 在留 4 ヶ月`
   - 但 **`params.colonSuffix` 不会被 resolver 重新计算**，i18n 模板
     `案件作成{colonSuffix}` 仍渲染 raw 值
   - 修复：在 `resolveKeyParam` 处理 `suffixKey` 后，**对应同步更新 `colonSuffix`**
     （或把 `colonSuffix` 整体移到 resolver 层，从 builder 层移除）。
   - 教训：**两个独立的"翻译/插值"机制不应交叉污染**；要么 builder 全权
     处理（含翻译），要么 resolver 全权处理（含格式化）。

2. **「ja-JP 翻译里「書類」vs「文書」用语不一致」** — R42-B：
   - `generatedDocumentCreated` = "書類生成{colonSuffix}"
   - `generatedDocumentUpdated` = "書類更新"
   - `generatedDocumentFinalized` = "文書確定{colonSuffix}"
   - `generatedDocumentExported` = "文書エクスポート{colonSuffix}"
   - 实务上「書類」偏向"行政提出物"、「文書」偏向"通用文档"。SaaS 内部
     「文書管理」tab 用「文書」，但 `created/updated` 又写成「書類」，
     用户体感不连贯。建议统一为「文書」（与 tab 名一致）。

3. **「`{colonSuffix}` 范式覆盖了空 case 但没覆盖 i18n key 子集」** —
   R41-A 推广 `{colonSuffix}` 解决了「suffix 缺失渲染裸冒号」，但
   `case.created` / `communication_log.created` 这类 builder emit
   `suffixKey`（不是 raw 字符串）的子集，需要先翻译 suffix 再格式化
   colonSuffix——R42-A 的根因就是这一步缺失。**所有"翻译型 suffix"的
   builder 都需要补这一步**：`case.created`、`communication_log.created`，
   以及未来任何 emit `suffixKey` 的新 builder。

4. **「fix 验证不能只看 unit test 绿，必须有 chrome-devtools-mcp 走查记录」**
   持续验证 — R41 的 4 条修复都有配套 unit test（含
   `useCaseDetailErrorStatus.test.ts` / `useCaseDetailModel.readonlyTemplates.test.ts`
   / `useCaseDetailModel.notFoundReason.test.ts` / `CaseCommsTimelineBuilders.colonSuffix.test.ts`），
   但唯有 mcp 走查能看到 R42-A 的"raw caseTypeCode 在 ja-JP 下露出"
   这种 i18n 联动 bug——它的特点是：
   - 在 zh-CN 下不显眼（`案件创建：biz_mgmt_cert_4m` 用户能猜出意思）
   - 在 ja-JP 下才暴露（混杂英文 ID 与日文短语）
   - 在 en-US 下隐藏（`Case created: biz_mgmt_cert_4m` 全英文，反而不
     显眼）

---

## 1. R41 修复回归（PASS 项详证）

### R41-A → R42 ✅ PASS（colonSuffix 范式推广，14 个 builder 全部生效）

**修复实现**（关键 diff）：

```44:46:packages/admin/src/views/cases/model/CaseCommsTimelineBuilders.ts
function formatColonSuffix(suffix: string): string {
  return suffix ? `：${suffix}` : "";
}
```

14 个 builder 全部从 `params: { suffix }` 改为 `params: { suffix, colonSuffix: formatColonSuffix(suffix) }`：
`case.created` / `case.billing_risk_acknowledged` / `case.post_approval_stage_changed` /
`case.cross_group_created` / `communication_log.created` / `case_party.created` /
`document_item.created` / `document_file.created` / `task.created` /
`billing_record.created` / `payment_record.created` / `review_record.rejected` /
`reminder.created` / `residence_period.created`。

三语 i18n 14 条 key 全部把 `…：{suffix}` 改为 `…{colonSuffix}`。

**UI 实测**（chrome-devtools-mcp `take_snapshot`）：

```
log tab 第 25 行（2026/05/02 20:36，case_party.created，payload 无 partyName）：
  StaticText "LA"
  StaticText "関連人追加"          ← R41 时是 "関連人追加：" 裸冒号 ❌；R42 干净 ✅
  StaticText "操作ログ"
  StaticText "関連人"
  StaticText "2026/05/02 20:36"
```

```
log tab 第 1-3 行（R42 happy-path，2026/05/05 19:30）：
  "文書エクスポート：R42-MCP-TITLE-PROBE"
  "文書確定：R42-MCP-TITLE-PROBE"
  "書類生成：R42-MCP-TITLE-PROBE"
```

`generated_document.{created,finalized,exported}` 三条 builder + i18n 模板 +
传入 title suffix 全链路工作正确，`{colonSuffix}` 渲染 `：R42-MCP-TITLE-PROBE` ✅。

**配套测试**（本轮 git status `??`）：

- `packages/admin/src/views/cases/model/CaseCommsTimelineBuilders.colonSuffix.test.ts`
  覆盖 14 个 builder × 2 个分支（suffix 存在 / suffix 缺失），共约 28 个 case
- `packages/admin/src/i18n/i18n-key-consistency.test.ts` 新增检查：cases
  timeline i18n keys 不得包含 `：{suffix}` 模式（强制使用 `{colonSuffix}`）
- 沉淀 ADR：`docs/gyoseishoshi_saas_md/00-原则与约定/ADR-008-colonSuffix-pattern.md`

---

### R41-B → R42 ✅ PASS（`ParseUUIDPipe()` 不再限制 version，nil UUID 恢复 404 语义）

**修复实现**：

```49:49:packages/server/src/modules/core/cases/cases.controller.ts
const UuidParam = () => Param("id", new ParseUUIDPipe());
```

去掉 `{ version: "4" }`，接受任何合法 UUID 字符串（v0 nil / v1 / v3 / v4 / v5 全过）。

**API 实测**（chrome-devtools-mcp `evaluate_script` 矩阵）：

```javascript
GET /api/cases/not-a-uuid/aggregate
→ 400 {"message":"Validation failed (uuid is expected)","error":"Bad Request"} ✅

GET /api/cases/12345/aggregate
→ 400 {"message":"Validation failed (uuid is expected)","error":"Bad Request"} ✅

GET /api/cases/00000000-0000-0000-0000-000000000000/aggregate  ← nil UUID v0
→ 404 {"message":"Case not found","error":"Not Found"} ✅  R41-B 副作用消除

GET /api/cases/11111111-1111-1111-1111-111111111111/aggregate  ← v1 UUID
→ 404 {"message":"Case not found","error":"Not Found"} ✅  新增覆盖

GET /api/cases/5d38aaac-0000-4000-8000-000000000000/aggregate  ← 合法 v4 但不存在
→ 404 {"message":"Case not found","error":"Not Found"} ✅  R39-E 语义保持

GET /api/cases/00000000-4000-a000-000000000012/aggregate  ← 真实存在
→ 200 OK ✅
```

✅ **R41-B 完整修复**。R39-E"合法 UUID 不存在 → 404"语义恢复，`ParseUUIDPipe()`
只校验"格式合法"，service 层负责"是否存在"，职责清晰。

**配套测试**（本轮 git status `M`）：

- `packages/server/src/modules/core/cases/cases.controller.uuidPipe.test.ts`
  改写覆盖：①plain string → 400 ②numeric → 400 ③nil UUID → 通过 pipe 进
  service ④v1 UUID → 通过 pipe ⑤valid v4 → 通过 pipe ⑥service 返 null → 404

---

### R41-C → R42 ✅ PASS（readonly 短路 fetch，省掉 document-templates 请求）

**修复实现**：

```325:347:packages/admin/src/views/cases/model/useCaseDetailModel.ts
function createFormTemplatesSlice(
  repo: CaseRepository,
  detail: Ref<CaseDetail | null>,
  isReadonly: Ref<boolean>,
  templateLanguage?: Ref<string>,
) {
  const effectiveCaseType = computed(() =>
    isReadonly.value ? "" : (detail.value?.caseType ?? ""),
  );
  const { templates: formTemplates } = useCaseFormTemplates({
    repo,
    caseType: effectiveCaseType,  // ← readonly 时 ""，fetchTemplates short-circuit
    language: templateLanguage,
  });
  // ...
}
```

`useCaseFormTemplates` 内部 `watch(() => deps.caseType.value, fetchTemplates)`
在 caseType="" 时不触发 fetch（已有的内部 guard）。

**网络回路实测**（chrome-devtools-mcp `list_network_requests`，进入
Tani Family Stay `cafc4ec5…?tab=forms` reload 后）：

```
reqid=44492 GET /api/cases/cafc4ec5.../aggregate                  [304]
reqid=44493 GET /api/document-items?caseId=cafc4ec5...            [304]
reqid=44494 GET /api/generated-documents?caseId=cafc4ec5...       [304]
reqid=44495 GET /api/validation-runs?caseId=cafc4ec5...           [304]
reqid=44496 GET /api/cases/cafc4ec5.../billing-tab-aggregate      [304]
reqid=44497 GET /api/submission-packages?caseId=cafc4ec5...       [304]
reqid=44498 GET /api/review-records?caseId=cafc4ec5...            [304]
reqid=44499 GET /api/communication-logs?caseId=cafc4ec5...        [304]
reqid=44500 GET /api/timeline?entityType=case&entityId=cafc4ec5...[304]
reqid=44501 GET /api/tasks?caseId=cafc4ec5...                     [304]
reqid=44502 GET /api/reminders?caseId=cafc4ec5...                 [304]
（结束。无 /api/document-templates?caseType=family 请求）
```

✅ **R41-C 完整修复**。S9 readonly 案件 `forms` tab 加载时少发 1 条
GET（document-templates），同时 R40-D 的 UI hide section 设计意图
在数据层得到对齐——前端不渲染就不拉。

**配套测试**（本轮 git status `??`）：

- `packages/admin/src/views/cases/model/useCaseDetailModel.readonlyTemplates.test.ts`
  覆盖 `effectiveCaseType` 在 `isReadonly=true/false` 下的取值，以及
  `useCaseFormTemplates` 是否触发 fetch

---

### R41-D → R42 ✅ PASS（4xx 错误码精细化为 4 种 fallback 文案）

**修复实现**（新建 helper）：

```51:61:packages/admin/src/views/cases/model/useCaseDetailErrorStatus.ts
export function deriveNotFoundReason(
  loading: boolean,
  hasDetail: boolean,
  errorStatus: number | null,
): NotFoundReason {
  if (loading || hasDetail) return null;
  if (errorStatus === 400 || errorStatus === 422) return "badRequest";
  if (errorStatus === 403) return "forbidden";
  if (errorStatus != null && errorStatus >= 500) return "serverError";
  return "notFound";
}
```

`useCaseDetailModel.createDetailLoader` 在 catch 块写入 `errorStatus`：
`input.errorStatus.value = extractErrorStatus(e)`。

`CaseDetailView.vue` 把 i18n key 改为动态：

```870:874:packages/admin/src/views/cases/CaseDetailView.vue
{{
  t(`cases.detail.notFound.${notFoundReason ?? "notFound"}.message`, {
    id: caseId,
  })
}}
```

三语 i18n 补 4 条文案（zh-CN 示例）：

```341:347:packages/admin/src/i18n/messages/cases/zh-CN.ts
notFound: {
  notFound:    { message: "未找到案件 {id}" },
  badRequest:  { message: "案件 ID 格式错误：{id}" },
  forbidden:   { message: "无权访问该案件 {id}" },
  serverError: { message: "服务暂时不可用，请稍后重试" },
  backLink:    "返回案件列表",
},
```

**UI 实测**（chrome-devtools-mcp 走 4 个 URL）：

| URL | API status | UI fallback 文案 | i18n key |
|---|---|---|---|
| `/cases/not-a-uuid` | 400 | **「案件 ID 格式错误：not-a-uuid」** | `notFound.badRequest.message` ✅ |
| `/cases/12345` | 400 | 同上 | 同上 ✅ |
| `/cases/00000000-…-000000000000` | 404 | 「未找到案件 00000000-…-000000000000」 | `notFound.notFound.message` ✅ |
| `/cases/5d38aaac-0000-4000-8000-000000000000` | 404 | 「未找到案件 5d38aaac-…」 | 同上 ✅ |

✅ **R41-D 完整修复**。前端能区分"ID 格式错误"vs"案件不存在"，i18n key
分类清晰，未来加 `forbidden` / `serverError` 不需要再改 view 层逻辑。

**配套测试**（本轮 git status `??`）：

- `packages/admin/src/views/cases/model/useCaseDetailErrorStatus.test.ts`
  覆盖 `extractErrorStatus`（带 status / 不带 status / 非对象错误） +
  `deriveNotFoundReason`（loading=true / hasDetail=true / errorStatus=400/403/404/422/500）
- `packages/admin/src/views/cases/model/useCaseDetailModel.notFoundReason.test.ts`
  覆盖 model 层 `notFoundReason` computed 在 loading/error 状态下的反应式行为

---

## 2. R42 新发现缺陷

### R42-A · P3 · `{colonSuffix}` 与 `suffixKey` 二次翻译机制不联动

**现象**（chrome-devtools-mcp `take_snapshot`，BMV S4 ?tab=log，ja-JP locale）：

```
log tab 末两行（最早记录）：
  StaticText "LA"
  StaticText "連絡記録追加：internal_note"   ← 应为「連絡記録追加：内部メモ」
  StaticText "操作ログ"
  StaticText "連絡記録"
  StaticText "2026/05/04 12:53"
  ...
  StaticText "LA"
  StaticText "案件作成：biz_mgmt_cert_4m"    ← 应为「案件作成：経営管理ビザ · 在留 4 ヶ月」
  StaticText "操作ログ"
  StaticText "案件"
  StaticText "2026/05/02 20:36"
```

**根因（数据 + 代码 trace）**：

server payload 实测：

```javascript
{ action: "communication_log.created", payload: { channelType: "internal_note", ... } }
{ action: "case.created",              payload: { caseTypeCode: "biz_mgmt_cert_4m", ... } }
```

builder 同时 emit `suffix`（raw 值）+ `colonSuffix`（raw 值格式化）+ `suffixKey`（i18n key）：

```127:139:packages/admin/src/views/cases/model/CaseCommsTimelineBuilders.ts
"communication_log.created": (p) => {
  const rawChannel = pickFirst(p, ["channelType", "channel_type"]);
  return {
    key: "cases.log.timeline.commLogCreated",
    params: {
      suffix: rawChannel,                                     // ← "internal_note"
      colonSuffix: formatColonSuffix(rawChannel),              // ← "：internal_note" raw
      suffixKey: rawChannel
        ? (COMM_LOG_CHANNEL_I18N[rawChannel] ?? "...")
        : "",                                                  // ← "cases.detail.messages.types.internal_note"
    },
  };
},
```

resolver 二次翻译 `suffix` 但**不更新 `colonSuffix`**：

```59:68:packages/admin/src/views/cases/model/CaseTimelineTextResolver.ts
export function resolveTimelineParams(raw, i18n) {
  const params = { ...(raw ?? {}) };
  resolveKeyParam(params, "fromPhaseKey", "from", i18n);
  resolveKeyParam(params, "toPhaseKey", "to", i18n);
  resolveKeyParam(params, "suffixKey", "suffix", i18n);  // ← 只更新 suffix
  return params;                                          // ← colonSuffix 保留 raw 值
}
```

i18n 模板使用 `{colonSuffix}`（raw），不使用 `{suffix}`：

```1097:1097:packages/admin/src/i18n/messages/cases/ja-JP.ts
commLogCreated: "連絡記録追加{colonSuffix}",
```

最终：`suffix = "内部メモ"`（已翻译），但 `colonSuffix = "：internal_note"`（builder 端预计算的 raw）→
渲染 `連絡記録追加：internal_note`。

**面积扫描**（emit `suffixKey` 的 builder 子集）：

| builder | 受影响场景 | locale 下表现 |
|---|---|---|
| `case.created` | 所有案件创建日志 | ja-JP/en-US 显示 `案件作成：biz_mgmt_cert_4m` / `Case created: biz_mgmt_cert_4m` |
| `communication_log.created` | 所有沟通记录创建（含 internal_note / phone / meeting / email 等） | ja-JP 显示 `連絡記録追加：phone` / `連絡記録追加：internal_note` 等 raw key |

zh-CN 下问题同样存在（`案件创建：biz_mgmt_cert_4m`、`沟通记录追加：internal_note`），
只是中文语境对英文 ID 略有"代码感"耐受度。

**等级**：P3 — 不阻断功能，但 i18n 翻译不彻底，跨多语言一致复现；属于
R41-A `{colonSuffix}` 范式推广时的"边界 case 遗漏"——R41-A 解决了
"suffix 缺失渲染裸冒号"，没解决"suffix 是 i18n key 占位"。

**修复方向**（按推荐度）：

1. **推荐**：让 resolver 在翻译 `suffix` 后**同步重算 `colonSuffix`**：

   ```ts
   // CaseTimelineTextResolver.ts
   function formatColonSuffix(s: string): string { return s ? `：${s}` : ""; }
   export function resolveTimelineParams(raw, i18n) {
     const params = { ...(raw ?? {}) };
     resolveKeyParam(params, "fromPhaseKey", "from", i18n);
     resolveKeyParam(params, "toPhaseKey", "to", i18n);
     resolveKeyParam(params, "suffixKey", "suffix", i18n);
     // ✨ 新增：suffix 翻译后重算 colonSuffix
     if (typeof params.suffix === "string") {
       params.colonSuffix = formatColonSuffix(params.suffix);
     }
     return params;
   }
   ```
   builder 端可以保留对 `colonSuffix` 的预计算（作为不带 `suffixKey` 时的 fallback）。

2. **替代**：把 `formatColonSuffix` 整体从 builder 移到 resolver 层；builder
   只 emit `suffix` / `suffixKey`，由 resolver 统一计算 `colonSuffix`。改动
   面积大但职责更清晰。

3. **测试**：补一条 contract test：`resolveTimelineParams` 处理 `suffixKey`
   时，必须同步更新 `colonSuffix`；测两种 locale × 两种 builder（case.created /
   communication_log.created）。

---

### R42-B · P4 · ja-JP `書類` vs `文書` 用语不一致

**现象**（chrome-devtools-mcp `take_snapshot` ja-JP，timeline）：

```
"書類生成：R42-MCP-TITLE-PROBE"          ← generated_document.created
"文書確定：R42-MCP-TITLE-PROBE"          ← generated_document.finalized
"文書エクスポート：R42-MCP-TITLE-PROBE"  ← generated_document.exported
"書類更新"                               ← generated_document.updated
```

| 事件 | ja-JP 用语 | 中文用语 | 英文用语 |
|---|---|---|---|
| created | **書類**生成 | 文书生成 | Document generated |
| updated | **書類**更新 | 文书更新 | Document updated |
| finalized | **文書**確定 | 文书定稿 | Document finalized |
| exported | **文書**エクスポート | 文书导出 | Document exported |

而 forms tab 的 heading 是「**文書**管理」，按钮是「**文書**を生成」。
created/updated 用「書類」与之不一致。

**等级**：P4 — 不阻断功能，仅是翻译用语统一性问题。日本行政法务实践中
「書類」偏向"行政提出物 / 申请书类"，「文書」偏向"通用文档"；SaaS 内部
统一为「文書」与 tab/button 一致更稳妥。

**修复方向**：把 `ja-JP.ts` 的 `generatedDocumentCreated` 与
`generatedDocumentUpdated` 改为「文書生成」「文書更新」。

---

## 3. Happy-path 网络回路（R42 实测）

| # | 时点 | Method | URL | 状态 |
|---|---|---|---|---|
| 1 | 进入 BMV S4 forms tab（ja-JP，reload 后） | GET | `/api/cases/:id/aggregate` | 200 |
| 2-11 | 同上，10 条 tab 数据并发 | GET | `/api/{document-items,generated-documents,validation-runs,billing-tab-aggregate,submission-packages,review-records,communication-logs,timeline,tasks,reminders}?caseId=:id` | 304 |
| 12 | 同上 | GET | `/api/document-templates?caseType=biz_mgmt_cert_4m` ✅ **无 language=** | 304 |
| 13 | 点「生成」→ 选事業計画書 + title=R42-MCP-TITLE-PROBE → 提交 | POST | `/api/generated-documents` | **201** |
| 14 | refetch（R38-F PASS） | GET | `/api/generated-documents?caseId=:id` | 200 |
| 15 | refetch | GET | `/api/timeline?...` | 200 |
| 16 | 点「確定」 | POST | `/api/generated-documents/:gdId/finalize` | **201** |
| 17 | refetch | GET | `/api/generated-documents?caseId=:id` | 200 |
| 18 | refetch | GET | `/api/timeline?...` | 200 |
| 19 | 点「エクスポート」 | POST | `/api/generated-documents/:gdId/export` | **201** |
| 20 | refetch | GET | `/api/generated-documents?caseId=:id` | 200 |
| 21 | refetch | GET | `/api/timeline?...` | 200 |

**Console**：0 console error / warning ✅

**R38-F refetch 粒度化持续 PASS**：每次 write 后只触发 2 条 GET（generated-documents
+ timeline），无 R37 时代的 11 GET refetch storm。

**R41-C readonly fetch gate 副作用**：`document-templates` 仅在非 readonly
案件 + caseType 非空时 fetch；S9 readonly 路径完全跳过。

---

## 4. UUID 矩阵实测（R41-B 回归）

| # | UUID | 类型 | API status | UI fallback |
|---|---|---|---|---|
| 1 | `not-a-uuid` | 非 UUID 字符串 | 400 Validation failed | 「案件 ID 格式错误：not-a-uuid」（badRequest） |
| 2 | `12345` | 数字 | 400 Validation failed | 同上 |
| 3 | `00000000-0000-0000-0000-000000000000` | nil UUID v0 | **404 Case not found** ✅ | 「未找到案件 00000000-…」（notFound） |
| 4 | `11111111-1111-1111-1111-111111111111` | v1 UUID | 404 Case not found | 同上 |
| 5 | `5d38aaac-0000-4000-8000-000000000000` | 合法 v4 但不存在 | 404 Case not found | 同上 |
| 6 | `00000000-0000-4000-a000-000000000012` | 真实存在 | 200 OK | 正常渲染 |

R41-B 副作用消除：`#3` nil UUID 在 R41 时返 400（被 ParseUUIDPipe v4 拒绝），
R42 恢复 404 语义。R39-E "合法 UUID 不存在 → 404" 契约稳定。

---

## 5. 后续建议（按优先级）

1. **P3 → R42-A** 在 `CaseTimelineTextResolver.resolveTimelineParams` 中处理
   `suffixKey` 后**同步重算 `colonSuffix`**：`params.colonSuffix =
   formatColonSuffix(params.suffix)`；补 contract test 守门"resolver 处理
   suffixKey 后 colonSuffix 必须随之更新"。
2. **P4 → R42-B** 把 ja-JP `generatedDocumentCreated` / `generatedDocumentUpdated`
   从「書類」改为「文書」，与 forms tab heading 「文書管理」+ button「文書を生成」
   保持一致。
3. **沉淀**：本轮 R42-A 暴露的"两套机制不联动"问题，建议在
   `ADR-008-colonSuffix-pattern.md` 补充「`{colonSuffix}` 与 `suffixKey` 联动
   语义」一节，明确：
   - builder 可以同时 emit `suffix` / `colonSuffix` / `suffixKey`
   - resolver **必须**处理 `suffixKey` → `suffix`，并**必须**重新计算
     `colonSuffix = formatColonSuffix(translatedSuffix)`
   - i18n 模板**只能**使用 `{colonSuffix}`，不得使用 `{suffix}`
4. **沉淀**：把"resolver 必须重算依赖参数"作为一条原则补到 ADR 里——任何
   "二次翻译 + 派生格式化"的场景都要补全派生链；不应该让 builder 与 resolver
   各管一段。

---

## 6. R37 → R38 → R39 → R40 → R41 → R42 修复链路总览

| ID | R37 起点 | R38 修复 | R39 验证 | R40 验证 | R41 验证 | R42 验证 |
|---|---|---|---|---|---|---|
| Wiring | 断 | ✅ | ✅ | ✅ | ✅ | ✅ |
| Seed file_url | n/a | ⚠ SQL bug | ❌ | ✅ | ✅ | ✅ |
| Placeholder 文案 | 模糊 | ✅ | ✅ | ✅ | ✅ | ✅ |
| finalize/export title | 无 | ✅ | ⚠ UI 看不到 | ✅ | ✅ | ✅ |
| server language | 静默丢弃 | ✅ | ⚠ 不匹配 | ✅ | ✅ | ✅ |
| docType i18n | raw | ✅ | ✅ | ⚠ 缓存失效 P2 | ✅ | ✅ |
| Refetch storm | 11 GET | ✅ | ✅ | ✅ | ✅ | ✅（21 GET total，3 writes × 2） |
| S9 forms tab | disabled | n/a | ✅ enabled | ⚠ section 显示 P4 | ✅ section 隐藏 | ✅ + 不再 fetch templates |
| Timeline raw key | raw | ✅ | ⚠ dead code | ⚠ raw P2 | ✅ builder 注册 | ✅ 持续 PASS |
| GD\_\* 错误码 | 无映射 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 404 vs 400 | n/a | n/a | ❌ 400 | ⚠ R40-C 仍 500 P3 | ✅ ParseUUIDPipe v4，但 nil UUID 副作用 P3 | ✅ ParseUUIDPipe()，nil UUID 恢复 404 |
| colonSuffix 范式 | n/a | n/a | n/a | n/a | ⚠ 14 个 builder 硬编码 P2 | ✅ 全 14 个 builder 转用 `{colonSuffix}` |
| readonly fetch gate | n/a | n/a | n/a | n/a | ⚠ templates 浪费 P3 | ✅ effectiveCaseType 短路 |
| 4xx 粒度 fallback | n/a | n/a | n/a | n/a | ⚠ 一律"未找到"P3 | ✅ 4 种 reason 分类 |
| **colonSuffix×suffixKey 联动** | n/a | n/a | n/a | n/a | n/a | ⚠ R42-A resolver 不重算 colonSuffix P3 |
| **ja-JP 用语一致性** | n/a | n/a | n/a | n/a | n/a | ⚠ R42-B 書類 vs 文書 P4 |

---

## 附录 · 走查环境与凭证

- Vite dev server: `http://localhost:5173`（PID 60474 监听 [::1]:5173）
- NestJS server: `PORT=3300`（PID 69385 监听 *:3300）
- PostgreSQL: docker `cms-client-postgres-1`（5433 → 5432）
- 账号：`admin@local.test` / `Admin123!` (Local Demo Office)
- Browser: chrome-devtools-mcp 控制 Chromium（已经登录，session token JWT 有效）
- 走查总用时：约 14 分钟，发起 60+ 条 HTTP 请求
- DB 当前 row 数：本轮新增 R42-MCP-TITLE-PROBE
  （`generated_document_id=7477182d-3436-436d-bd15-374d950d9087`，v4 finalized + exported）
- console.error / warning：0 条 ✅
- 一次性文件操作：本轮**未引入临时 seed 脚本**或临时 SQL；所有变更通过 UI 操作

---

## 7. 体系性沉淀（编译式入库候选 — 待回灌到权威文档）

本轮新发现的 2 条问题与 4 条 R41 PASS 修复指向 1 条新原则与 2 条加固原则：

1. **「resolver 处理派生参数时必须重算依赖项」（R42-A 新原则）** —
   `CaseTimelineTextResolver` 二次翻译 `suffix` 后，依赖 `suffix` 计算的
   `colonSuffix` 必须同步重算。建议在 `ADR-008-colonSuffix-pattern.md`
   补充一节「派生参数链路完整性约束」，明确：
   - builder 端可以预计算 `colonSuffix`（作为无 `suffixKey` 时的兜底）
   - resolver 端处理 `suffixKey` 后必须 `params.colonSuffix = formatColonSuffix(params.suffix)`
   - i18n 模板**只能用** `{colonSuffix}`，禁止使用 `{suffix}` 直插

2. **「`{colonSuffix}` 范式覆盖三类 case，必须全部测试」（R41-A 加固）** —
   ① suffix 是 raw 字符串（如 partyName） ② suffix 是空（render 空）
   ③ suffix 是 i18n key 占位（需 resolver 翻译后重算）。本轮 R42-A 暴露的
   就是 ③ 这一类，建议在 `CaseCommsTimelineBuilders.colonSuffix.test.ts`
   补一组覆盖 ③ 的 case。

3. **「fix 验证不能只看 unit test 绿，必须有 chrome-devtools-mcp 走查记录」
   （R37/R38/R39/R40/R41/R42 共同教训）** —— 本轮再次验证：R41 4 条修复 +
   配套 ~7 个新测试文件全绿，但只有 chrome-devtools-mcp 走查能发现 R42-A
   （colonSuffix 与 suffixKey 不联动）这种"修复局部但留下间接副作用"的
   i18n 链路 bug。**建议把"P0/P1 修复 PR 必须附 chrome-devtools-mcp
   复跑日志（≤5 步）+ 同类问题面积扫描"写入 PR review checklist。**
