# 案件文书模块 chrome-devtools-mcp 走查（第二十轮 / R40 — R39 修复回归 + 新发现）

> 生成日期：2026-05-05
>
> 命题：R39 提出 5 条缺陷（A locale 不匹配 / B seed pg 类型推断 / C colonSuffix
> 改在 dead code / D 模板下拉 disabled / E 不存在 caseId 返 400）。本轮用
> chrome-devtools-mcp 在运行时**逐条回归**，并在新数据集上识别次级缺陷。
>
> 工具：chrome-devtools-mcp（list_pages / navigate_page / take_snapshot / click /
> fill / wait_for / evaluate_script / list_network_requests / list_console_messages）
>
> 数据集：Local Demo Office（admin@local.test / Admin123!）；23 条种子案件，
> 4 类 caseTypeCode：`biz_mgmt_cert_4m` / `biz_mgmt_4m` / `biz_mgmt` / `family`；
> 阶段覆盖 S1 / S2 / S3 / S4 / S9。`document_templates` 表 12 行（`biz_mgmt_*` ×
> 2 + `family` × 3，全部 `language='ja'`，本轮 `npm run db:seed-dev` 跑通后落库）。

---

## 0. 总结

### 0.1 一句话结论

**R39 五条缺陷全部修复落地（A/B/C/D/E 全 PASS），happy-path 端到端绿灯。** 本轮新发现
4 条次级问题：① **R40-A** server 写 timeline 用 action `validation_run.executed`，但
admin 的 builder 字典只注册 `validation_run.{created,passed,failed}`，UI 在日志页
直接显示 raw key「validation_run.executed」（P2，跨多语言一致复现）；② **R40-B**
切换 UI locale 后已缓存的模板列表 docType 不会重译，必须刷新页面（P2，有数据但状态
错乱）；③ **R40-C** 把非合法 UUID 的 caseId 传给 `/aggregate` 返回 500 而不是 400
（P3，前端走 hash 路由不会触发，但 API 直发或外链分享会）；④ **R40-D** S9 已归档案件
仍渲染「可用模板」section（仅去掉「生成」按钮），与 banner「全字段只读」的语义有轻
度冲突（P4，设计建议）。**整体评价：R37 → R38 → R39 → R40 四轮迭代，案件文书模块
P0/P1 缺陷全部清零，剩下的都是 P2/P3/P4 体感优化项；R38-F refetch 粒度化策略持续
PASS（每次 write 后只触发 2 条 GET）。**

### 0.2 走查矩阵（4 个代表性案件 × 3 种 UI locale × 关键节点）

| 案件 | caseTypeCode | businessPhase | locale | 模板 section | 模板下拉 | 提交生成 → 定稿 → 导出 | timeline 行 |
|---|---|---|---|---|---|---|---|
| **A** R23-AUDIT-TITLE-TEST<br/>`5d38aaac…` | biz_mgmt_cert_4m | S4 / REVIEWING | ja-JP | ✅ 2 模板渲染（事業計画書 + 会社概要） | ✅ enabled，3 项 | ✅ R40-MCP-TITLE-PROBE 全程 201 | ✅「文書確定：R40-MCP-TITLE-PROBE」 |
| **A** 同上 | 同上 | 同上 | zh-CN（reload 后） | ✅ 模板渲染 | ✅ enabled | n/a（跑过 ja-JP） | ✅「文书定稿：R40-MCP-TITLE-PROBE」 |
| **A** 同上 | 同上 | 同上 | zh-CN（locale 切换不 reload） | ⚠ 渲染但 docType 仍是 ja「事業計画書」（R40-B） | ✅ enabled | n/a | n/a |
| **B** R5 stage probe<br/>`ea8b75b0…` | family | S4 / REVIEWING | zh-CN（首次加载） | ✅ 3 模板（在留資格… / 婚姻 / 扶養者…） | ✅ enabled | n/a | n/a |
| **C** Tani Family Stay<br/>`cafc4ec5…` | family | S9 / CLOSED_SUCCESS | zh-CN | ⚠ 渲染但无生成按钮（R40-D） | n/a（readonly） | n/a | n/a |
| **D** 直接 fetch document-templates | — | — | — | API：`?caseType=biz_mgmt_cert_4m` → 2；`family` → 3；`biz_mgmt_4m` → 2；`biz_mgmt` → 2；**所有请求不再带 `language=`** | n/a | n/a | n/a |
| **E** 不存在 caseId | — | — | — | `00000000-…/aggregate` → 404 ✅；`not-a-uuid/aggregate` → 500 ❌ R40-C | n/a | n/a | n/a |

✅ = pass / ⚠ = 与设计意图相符但用户感知差 / ❌ = 不可用 / n/a = 类型不适用

### 0.3 R40 缺陷分布

| 等级 | 数量 | 主要分布 |
|---|---|---|
| **P0** | 0 | — |
| **P1** | 0 | — |
| **P2** | 2 | R40-A（`validation_run.executed` builder 缺失）/ R40-B（locale 切换不重译 docType） |
| **P3** | 1 | R40-C（非 UUID caseId 返回 500 应为 400） |
| **P4** | 1 | R40-D（S9 readonly 仍渲染模板 section，与「全字段只读」语义冲突） |

### 0.4 R39 → R40 修复验证（5 条全 PASS）

| R39 ID | R39 描述 | R40 验证 | 证据 |
|---|---|---|---|
| **R39-A** | locale code（zh-CN/ja-JP/en-US）与 DB language（ja）严格等值不匹配 → 模板 section 全语言不可见 | ✅ PASS | `useCaseFormTemplates` 默认不传 `language`，`buildCaseDocumentTemplatesUrl` 不再注入 query 参数；mcp 网络日志确认请求是 `GET /api/document-templates?caseType=biz_mgmt_cert_4m`（无 language）；UI 三案件均看到模板 list |
| **R39-B** | seed `documentFile` 的 SQL 用 `'placeholder://...' \|\| $1 \|\| '.pdf'` 与 `id` 列共用 `$1` → pg 类型推断失败 → 整事务回滚 | ✅ PASS | `npm run db:seed-dev` 输出 `[seed-dev] done — 3 cases, 6 doc items, 1 asset, 1 cross-case link, 1 document_checklist template, 12 document templates`；代码改成独立参数 `$6 = 'placeholder://document-files/${DOC_FILE_ID}.pdf'` |
| **R39-C** | `colonSuffix` 修复改在 dead code `CaseTimelineBuilders.ts`，生产链路用的 `CaseCommsTimelineBuilders.ts` 只 emit `suffix` → UI 全无 title 后缀 | ✅ PASS | 旧文件 `CaseTimelineBuilders.{ts,test.ts}` 已删除；`CaseCommsTimelineBuilders.ts` 4 条 `generated_document.*` builder 全部 emit `colonSuffix: formatColonSuffix(suffix)`；mcp 实测「文书定稿：R40-MCP-TITLE-PROBE」「文书生成：R40-MCP-TITLE-PROBE」「文书导出：R40-MCP-TITLE-PROBE」三条新事件**冒号 + title 完整渲染**；旧事件因当时 payload 无 title，仍是无后缀（符合预期，不算回归） |
| **R39-D** | 模板下拉在 hasTemplates=false 时整体 disabled，「想留空也点不了」 | ✅ PASS | `<select :disabled="props.submitting">` — 不再依赖 `hasTemplates`；新增独立 hint 行「未选择模板时将创建空白草稿」永久可见，hasTemplates=true/false 均显示；mcp 实测 modal 打开后 dropdown 可展开（"事業計画書"/"会社概要"两选项） |
| **R39-E** | navigate 到不存在的 caseId 返回 400，应为 404 | ✅ PASS | `cases.controller.getAggregate` 在 `aggregate === null` 时抛 `new NotFoundException("Case not found")`；mcp 实测合法 UUID 但案件不存在 → `404 {"message":"Case not found","error":"Not Found"}` ✅；UI fallback 「未找到案件 ... 返回案件列表」 |

### 0.5 体系性观察

1. **「不传 language」是务实路径，但需在文档约束「为何不传」** — R40-A 修复路径选了 R39
   报告里的 B 方案（admin 默认不传 `language`，让 server 返回所有），等于显式承认
   "BCP-47 locale ≠ 模板内容语言"。`useCaseFormTemplates` 与 `useCaseDetailModel`
   的 JSDoc 已加备注（"不可直接传入 vue-i18n 的 locale ref"），但还应补一条
   ADR：admin 端**永远不传** UI locale 作为 content language；如果将来 DB 同时支持
   `ja/en/zh` 模板，应改为 server 端基于 user 偏好或 BCP-47 base 做 fallback。
   **本轮已新增 `00-原则与约定/ADR-006-locale-vs-content-language.md`**（见 git_status），
   建议 review 时重点验证。

2. **「同领域 builder 双份并存」的反模式已彻底清理** — R39-C 修复同时删除了 `CaseTimelineBuilders.ts`
   与对应 test，这是 R39 §0.4 第 1 条沉淀的体系性问题的实施。本轮看到 git_status 还有
   `00-原则与约定/ADR-007-no-duplicate-action-builders.md`，建议把"同 action key 不允
   许跨文件重复 export"作为 lint 规则落地。

3. **「server 写 timeline 的 action 字符串」与「admin builder 字典」缺乏契约** — R40-A
   的根因是 server `validationRuns.service.ts:209` 写 `action: "validation_run.executed"`，
   但 admin builder 字典只覆盖了`validation_run.{created,passed,failed}`。这种脱节在
   `case_party.deleted` / `document_item.deleted` / `case.deleted` 等冷门 action 上也
   可能潜伏。建议补一条 contract test：扫描 server 所有 `action: "..."` 字面量与 admin
   builder 字典的 key 集合，二者必须对齐（否则要么显式归到 fallback，要么补 builder + i18n）。

4. **「locale 切换缓存失效粒度」** — R40-B 暴露的问题是：模板列表的 `meta` 字段在 fetch
   时被 eager translate，缓存到 `templates.value`。后续 `vue-i18n.locale` 切换不会触发
   `useCaseFormTemplates.fetchTemplates()` re-run（它只 watch `caseType`、`language`），
   导致 docType 文案显示旧 locale 的翻译。两种修复：① 在 useCaseFormTemplates 加上对
   `translate` 的 watch（但 `translate` 是函数，需要用 vue-i18n 的 `locale` ref）；
   ② 改为 lazy translation：adapter 不预翻译，UI 渲染时调 `t()`。**推荐 ②**——保持数据
   层与 i18n 解耦，渲染层负责 locale 响应。

5. **「ParamPipe 缺失」的潜在面积** — R40-C 暴露 `getAggregate` 用 `@Param("id") id: string`
   未经 UUID 验证。NestJS 的 `ParseUUIDPipe` 一行就能挡住。建议全 controller 扫一遍 `:id`
   route，用 `ParseUUIDPipe` 统一校验，避免类似 500 漏到客户端。

---

## 1. R39 修复回归（PASS 项详证）

### R39-A → R40 ✅ PASS（locale 与 DB language 解耦）

**修复实现**（关键 diff）：

```85:94:packages/admin/src/views/cases/model/CaseAdapterDocumentTemplates.ts
export function buildCaseDocumentTemplatesUrl(
  casesApiPath: string,
  params: { caseType: string; language?: string },
): string {
  const base = `${deriveApiPrefix(casesApiPath)}/document-templates`;
  const qs = new URLSearchParams();
  qs.set("caseType", params.caseType);
  if (params.language) qs.set("language", params.language);
  return `${base}?${qs.toString()}`;
}
```

```100:105:packages/admin/src/views/cases/CaseDetailView.vue
} = useCaseDetailModel(caseId, {
  routeTab,
  translate: t,
  onTabChange: (tab) =>
    router.replace({ query: buildCaseDetailQuery({ tab }) }),
});
```

`useCaseDetailModel` 调用方**未传 `templateLanguage`** → `useCaseFormTemplates` 拿到
`undefined` → `buildCaseDocumentTemplatesUrl` 跳过 `qs.set("language", ...)` →
请求 URL 是 `?caseType=biz_mgmt_cert_4m`（不带 language）。

**API 实测**（mcp `evaluate_script` 直发）：

```javascript
// caseType 矩阵
{
  "biz_mgmt_cert_4m": ["事業計画書(ja)", "会社概要(ja)"],
  "biz_mgmt_4m":      ["事業計画書(ja)", "会社概要(ja)"],
  "biz_mgmt":         ["事業計画書(ja)", "会社概要(ja)"],
  "family":           ["在留資格認定証明書交付申請書(ja)", "婚姻証明書(ja)", "扶養者の住民票の写し(ja)"]
}
```

**UI 实测**：BMV S4 案件 forms tab 在 ja-JP 与 zh-CN（reload 后）均渲染「可用模板」
section，docType 按当前 locale 翻译（"事業計画書 / 会社概要書 / 申請書 / 補助資料"
↔ "事业计划书 / 公司概要书 / 申请书 / 辅助材料"）。

✅ **修复完成。同时记录新缺陷 R40-B：locale 切换不 reload 时 docType 不重译。**

---

### R39-B → R40 ✅ PASS（seed pg 类型推断）

**修复实现**：

```188:210:packages/server/src/scripts/seedDevData.ts
async function seedDocumentFile(client: PoolClient) {
  await client.query(
    `INSERT INTO document_files (
       id, org_id, requirement_id, file_name, file_type,
       version_no, uploaded_by, review_status, storage_type,
       relative_path, file_url, asset_id, expiry_date
     )
     VALUES ($1,$2,$3,'passport_scan.pdf','application/pdf',
             1,$4,'approved','local_server',
             '/dev-seed/passport_scan.pdf',
             $6,
             $5,'2027-03-31')
     ON CONFLICT (id) DO NOTHING`,
    [
      DOC_FILE_ID,
      SEED_ORG_ID,
      DOC_ITEM_APPROVED,
      SEED_USER_ID,
      DOC_ASSET_ID,
      `placeholder://document-files/${DOC_FILE_ID}.pdf`,
    ],
  );
}
```

`file_url` 从「字符串拼接 + 共用 $1」改为「独立参数 $6 + JS 端拼好」，pg 不再有
inconsistent type 推断的歧义。

**实测**：

```text
$ npm run db:seed-dev
[seed-dev] done — 3 cases, 6 doc items, 1 asset, 1 cross-case link,
                 1 document_checklist template, 12 document templates
```

事务跑到底，`document_templates` 12 行落库，`documentFile` step 也成功执行。
✅ **修复完成。**

---

### R39-C → R40 ✅ PASS（colonSuffix 落到生产 builder）

**修复实现**：

```198:225:packages/admin/src/views/cases/model/CaseCommsTimelineBuilders.ts
"generated_document.created": (p) => {
  const suffix = pickFirst(p, ["title", "templateName", "name"]);
  return {
    key: "cases.log.timeline.generatedDocumentCreated",
    params: { suffix, colonSuffix: formatColonSuffix(suffix) },
  };
},
"generated_document.updated": (p) => { ... colonSuffix: formatColonSuffix(suffix) ... },
"generated_document.finalized": (p) => { ... colonSuffix: formatColonSuffix(suffix) ... },
"generated_document.exported": (p) => { ... colonSuffix: formatColonSuffix(suffix) ... },
```

旧的 `CaseTimelineBuilders.ts` 与 `CaseTimelineBuilders.test.ts` 已 `git rm`（参见
git_status `D` 标记），双份 builder 反模式根除。

**UI 实测**（chrome-devtools-mcp 走 happy-path 之后查 ?tab=log）：

| 时间 | server payload action | UI 渲染（zh-CN） |
|---|---|---|
| 2026/05/05 17:55 | `generated_document.exported` payload `{title:"R40-MCP-TITLE-PROBE",...}` | **「文书导出：R40-MCP-TITLE-PROBE」** ✅ |
| 17:55 | `generated_document.finalized` 同 title | **「文书定稿：R40-MCP-TITLE-PROBE」** ✅ |
| 17:55 | `generated_document.created` 同 title | **「文书生成：R40-MCP-TITLE-PROBE」** ✅ |
| 16:15 | finalized R39-MCP-TITLE-PROBE | 「文书定稿：R39-MCP-TITLE-PROBE」 ✅ |
| 16:15 | created R39-MCP-TITLE-PROBE | 「文书生成：R39-MCP-TITLE-PROBE」 ✅ |
| 14:53 | 旧 finalized 无 title | 「文书定稿」（无后缀，符合预期：旧 payload 没 title 字段） |
| 13:48 | 旧 updated 无 title | 「文书更新」（无后缀） |

✅ **修复完成。**`colonSuffix` 在所有四种 generated_document.* action 上均生效；
旧事件由于 payload 没 title，无后缀符合 R39-C 修复方案的语义（`formatColonSuffix("")
→ ""`）。

---

### R39-D → R40 ✅ PASS（模板下拉 + optional hint）

**修复实现**：

```119:154:packages/admin/src/views/cases/components/CaseFormGenerateModal.vue
<select
  id="form-gen-templateId"
  name="templateId"
  class="form-gen-modal__select"
  :disabled="props.submitting"   <!-- 不再依赖 hasTemplates -->
  :value="localTemplateId ?? ''"
  ...
>
  <option value="">
    {{
      hasTemplates
        ? t("cases.detail.forms.generateModal.fields.templatePlaceholder")
        : t("cases.detail.forms.generateModal.fields.templateEmpty")
    }}
  </option>
  <option v-for="tpl in resolvedTemplates" :key="tpl.id" :value="tpl.id">
    {{ tpl.name }}
  </option>
</select>
<p class="form-gen-modal__hint" data-testid="form-gen-optional-hint">
  {{ t("cases.detail.forms.generateModal.fields.optionalHint") }}
</p>
```

新增独立 hint 行「未选择模板时将创建空白草稿」，hasTemplates=true/false 均渲染——
不再"假装"模板必填。

**UI 实测**（mcp snapshot）：

```
modal「生成文书」:
  combobox "文书模板 未选择模板时将创建空白草稿" expandable haspopup="menu"
    option "请选择模板（可留空创建空白草稿）" selected
    option "事業計画書"
    option "会社概要"
  StaticText "未选择模板时将创建空白草稿"     ← optional hint
  ...
```

✅ **修复完成。**

---

### R39-E → R40 ✅ PASS（404 vs 400）

**修复实现**：

```258:278:packages/server/src/modules/core/cases/cases.controller.ts
@RequireRoles("viewer")
@Get(":id/aggregate")
async getAggregate(@Req() req: HttpRequest, @Param("id") id: string) {
  const ctx = req.requestContext;
  if (!ctx) throw new UnauthorizedException("Missing request context");

  const aggregate = await this.casesService.getDetailAggregate(ctx, id);
  if (!aggregate) throw new NotFoundException("Case not found");

  if (!this.permissionsService.canViewCase(...)) {
    throw new ForbiddenException("...");
  }
  return aggregate;
}
```

**API 实测**：

```javascript
GET /api/cases/00000000-0000-0000-0000-000000000000/aggregate
→ 404 {"message":"Case not found","error":"Not Found","statusCode":404} ✅
```

**UI fallback**：「未找到案件 00000000-0000-0000-0000-000000000000 [返回案件列表]」
（zh-CN 文案语义清晰）。

✅ **修复完成。**新发现关联缺陷 R40-C：非 UUID 字符串仍走到 service 层 → pg uuid 转换
失败 → 500，详见 §2 R40-C。

---

## 2. R40 新发现缺陷

### R40-A · P2 · `validation_run.executed` builder 未注册，timeline 显示 raw key

**现象**（chrome-devtools-mcp 实测，BMV S4 ?tab=log 两个 locale 均复现）：

| locale | 第 21 行 timeline 渲染 |
|---|---|
| ja-JP | `validation_run.executed`（raw 字符串，无 i18n） |
| zh-CN | `validation_run.executed`（同上） |

**根因（代码）**：

server 写 timeline 用 action `validation_run.executed`：

```207:213:packages/server/src/modules/core/validation-runs/validationRuns.service.ts
await timelineWriter.append({
  orgId: ctx.orgId,
  entityType: "case",
  entityId: created.caseId,
  action: "validation_run.executed",
  payload: { validationRunId: created.id, ... },
});
```

admin builder 字典只注册了 `created/passed/failed`：

```183:191:packages/admin/src/views/cases/model/CaseCommsTimelineBuilders.ts
"validation_run.created": () => ({ key: "cases.log.timeline.validationRunCreated" }),
"validation_run.passed":  () => ({ key: "cases.log.timeline.validationRunPassed" }),
"validation_run.failed":  () => ({ key: "cases.log.timeline.validationRunFailed" }),
// ❌ 缺 validation_run.executed
```

builder fallback 路径：

```256:262:packages/admin/src/views/cases/model/CaseCommsTimelineBuilders.ts
if (builder) return builder(payload);
return {
  key: `cases.log.timeline.${action.replace(/\./g, "_")}`,
  params: { fallback: action },
};
```

→ key = `cases.log.timeline.validation_run_executed`（i18n 字典也没有）→ vue-i18n
最终回落到 `params.fallback` 即原 action 字符串。

**等级**：P2 — UI 显示 raw key 是用户能直接感知到的"系统语言泄露"，但不阻断功能；
影响所有 zh/ja/en 三语用户在「日志」tab 看到这条事件。

**修复方向**：

1. **建议（最小改动）**：在 `CaseCommsTimelineBuilders.ts` 加 `validation_run.executed`
   builder（语义可用 `payload.passed === true ? passed : failed` 二选一，或者中性
   "提交前检查执行"）；同步在三语 i18n 文件加 key。
2. **根治**：补 contract test —— 扫描 server `**/*.{ts}` 中所有 `action: "<event>"`
   字面量，与 admin `TIMELINE_MESSAGE_BUILDERS` 字典 key 集合做差集比对，差集非空即
   fail。同时把 i18n 字典也纳入校验（builder 注册 key → i18n 字典必有对应 key）。

---

### R40-B · P2 · 切换 UI locale 后已缓存的模板 docType 不会重译

**现象**（chrome-devtools-mcp 实测，复现路径）：

| 步骤 | locale | UI 显示模板 meta |
|---|---|---|
| 1 | 初始 ja-JP，进入 BMV S4 forms tab | 「事業計画書 · ja · v1」（docType "business_plan" → ja "事業計画書"） |
| 2 | header 切换到「简体中文」 | 「事業計画書 · ja · v1」（**没变！** 仍是 ja 翻译） |
| 3 | 浏览器 reload（zh-CN locale 持久化） | 「事业计划书 · ja · v1」（终于翻译为中文） |

注：第 2 步同时验证了 page 其他文案（"文书管理"/"可用模板"/"已生成文书"/tab 名）**全部
正确响应 locale 切换**——只有模板 list 的 meta 字段例外。

**根因（代码）**：

```40:54:packages/admin/src/views/cases/model/useCaseFormTemplates.ts
async function fetchTemplates(): Promise<void> {
  const ct = deps.caseType.value;
  if (!ct) { templates.value = []; return; }
  ...
  const result = await deps.repo.listDocumentTemplates({
    caseType: ct,
    language: deps.language?.value,
    translate: deps.translate,         ← 函数引用，仅在 fetch 时调一次
  });
  templates.value = result;            ← 缓存 eager-translated meta
}

watch(() => deps.caseType.value, () => void fetchTemplates(), { immediate: true });
if (deps.language) {
  watch(() => deps.language!.value, () => void fetchTemplates());
}
// ❌ 没有 watch translate / locale
```

adapter 在 fetch 阶段就把 docType 翻译成字符串塞进 `meta`：

```26:51:packages/admin/src/views/cases/model/CaseAdapterDocumentTemplates.ts
function adaptDocumentTemplateDto(value, t?) {
  ...
  const metaParts: string[] = [];
  if (docType) metaParts.push(translateDocType(docType, t));   ← eager translate
  if (language) metaParts.push(language);
  if (versionNo > 0) metaParts.push(`v${versionNo}`);
  return { id, name: templateName, meta: metaParts.join(" · "), ... };
}
```

→ locale 变了但 `caseType` 没变 → `fetchTemplates` 不重跑 → cached meta 仍是旧 locale
的翻译字符串。

**等级**：P2 — 用户能感知（数据"对了一半"），但 reload 立刻恢复正常，不阻断功能。

**修复方向**：

1. **推荐**：lazy translation —— `FormTemplate.meta` 字段拆为结构化数据
   `{ docType: string, language: string, versionNo: number }`，UI 渲染时再调 `t()`。
   一劳永逸支持 locale 响应。
2. **快速**：在 `useCaseFormTemplates` 中接受一个 `locale: Ref<string>` 依赖并 watch
   它，locale 变化触发 `fetchTemplates`。但这会在每次切语言时多打一次 GET，性能略差，
   且没真正解决"数据层耦合 i18n"的问题。
3. **架构层**：在 ADR 沉淀「数据 adapter 不应 eager translate；i18n 是渲染层职责」。

---

### R40-C · P3 · 非 UUID caseId 传给 `/aggregate` 返回 500 应为 400

**现象**（chrome-devtools-mcp `evaluate_script` 实测）：

```javascript
GET /api/cases/00000000-0000-0000-0000-000000000000/aggregate
→ 404 {"message":"Case not found","error":"Not Found","statusCode":404} ✅ R39-E PASS

GET /api/cases/not-a-uuid/aggregate
→ 500 {"statusCode":500,"message":"Internal server error"} ❌ R40-C
```

**根因（代码）**：

```258:264:packages/server/src/modules/core/cases/cases.controller.ts
@Get(":id/aggregate")
async getAggregate(@Req() req: HttpRequest, @Param("id") id: string) {  ← @Param string
  ...
  const aggregate = await this.casesService.getDetailAggregate(ctx, id);
  ...
}
```

`@Param("id") id: string` 不做格式校验。当 `id = "not-a-uuid"` 透传到 service 的
SQL `WHERE id = $1::uuid` 时，pg 抛 `invalid input syntax for type uuid`，被框架
转为 500。

**等级**：P3 — 前端 vue-router 路由参数都是从案件列表 / hash 链接来的，正常导航不会
触发；但若用户从外链/书签拷贝错误 URL、或测试/客户端 SDK 误传，会拿到不友好的 500。

**修复方向**：

```typescript
import { ParseUUIDPipe } from "@nestjs/common";

@Get(":id/aggregate")
async getAggregate(
  @Req() req: HttpRequest,
  @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
) {
  ...
}
```

→ 非 UUID 输入自动 400 `{"message":"Validation failed (uuid is expected)","error":
"Bad Request","statusCode":400}`。

**配套建议**：用 ripgrep 扫一遍所有 controller `@Param("id") id: string`，统一加
`ParseUUIDPipe`，避免类似 500 漏到客户端。

---

### R40-D · P4 · S9 已归档案件仍渲染「可用模板」section（但无生成按钮）

**现象**（chrome-devtools-mcp 实测，案件 `cafc4ec5…` Tani Family Stay,
`businessPhase=CLOSED_SUCCESS`）：

```text
[banner] 此案件处于「已归档」状态，全字段只读，状态变更与编辑已禁用。
[heading] 文书管理
  ・可用模板             ← 仍然渲染
    在留資格認定証明書交付申請書
      申请书 · ja · v1
      （无「生成」按钮）  ← R38-G readonly 处理
    婚姻証明書
      辅助材料 · ja · v1
    扶養者の住民票の写し
      辅助材料 · ja · v1
  ・已生成文书           ← 该案件没生成过文书 → empty
```

**评估**：

- 与 R39 §0.4 第 3 条记录的预期不一致：R39 时此处显示「利用可能なテンプレートまたは
  生成記録がありません」（empty state），是因为当时 R39-A 让 templates 永远拉不到。
- R40-A（修了 R39-A）让 templates 能拉到了，自然 templates section 渲染。但**S9 readonly
  下展示「可用模板」却没有生成按钮**——视觉上像「这里能用却点不了」。
- 与 banner「全字段只读」语义有轻度冲突。

**等级**：P4 — 设计建议，不阻断功能。

**修复方向**（按推荐度）：

1. **推荐**：S9 readonly 下完全隐藏「可用模板」section（detail.readonly === true 时
   不渲染该 section），只保留「已生成文书」（历史归档）。
2. 或：保留模板 list 但加灰度+ "归档案件不可生成新文书" 文案 chip。
3. 或：保持现状但在 forms tab 顶部加一行 "本案件已归档，下方仅展示历史模板列表。"

---

## 3. Happy-path 网络回路（R40 实测）

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
| 16 | 点「生成文书」→ 选「事業計画書」+ title=R40-MCP-TITLE-PROBE → 提交 | POST | `/api/generated-documents` | **201** |
| 17 | refetch（R38-F PASS） | GET | `/api/generated-documents?caseId=:id` | 200 |
| 18 | refetch | GET | `/api/timeline?...` | 200 |
| 19 | 点「定稿」 | POST | `/api/generated-documents/66c53ca0-…/finalize` | **201** |
| 20 | refetch | GET | `/api/generated-documents?caseId=:id` | 200 |
| 21 | refetch | GET | `/api/timeline?...` | 200 |
| 22 | 点「导出」 | POST | `/api/generated-documents/66c53ca0-…/export` | **201** |
| 23 | refetch | GET | `/api/generated-documents?caseId=:id` | 200 |
| 24 | refetch | GET | `/api/timeline?...` | 200 |

**Console**：0 console error / warning ✅（仅 1 条 vite HMR debug 日志，与本走查无关）

**R38-F refetch 粒度化持续 PASS**：每次 write 后只触发 2 条 GET（generated-documents +
timeline），无 R37 时代的 11 GET refetch storm。

---

## 4. 截图

本轮使用 `take_snapshot` 的结构化抓取替代图片（accessibility tree 完整可读，比 PNG
更适合 review）。如需可视化校对，可在 chrome-devtools-mcp 控制的浏览器里手动截图：

| 验证场景 | URL | 关键 element |
|---|---|---|
| BMV S4 forms tab + 模板 section | `/cases/5d38aaac…?tab=forms` | `StaticText "可用模板"` + 2 模板 row + 2「生成」按钮 |
| 「生成文书」modal | 同上点「生成文书」 | dropdown enabled，3 options + optional hint |
| 日志 tab + colonSuffix | `/cases/5d38aaac…?tab=log` | "文书定稿：R40-MCP-TITLE-PROBE" + "validation_run.executed" |
| family case 模板 + zh docType | `/cases/ea8b75b0…?tab=forms` | "申请书 · ja · v1" / "辅助材料 · ja · v1" |
| S9 readonly | `/cases/cafc4ec5…?tab=forms` | banner "已归档" + 模板 list（无生成按钮）|
| 404 案件 | `/cases/00000000-…?tab=forms` | "未找到案件 ... [返回案件列表]" |

---

## 5. 后续建议（按优先级）

1. **P2 → R40-A** 在 `CaseCommsTimelineBuilders.ts` 注册 `validation_run.executed`
   builder + 三语 i18n key；同时补 contract test 防止 server action 与 admin builder
   字典再次脱节。
2. **P2 → R40-B** 把 `FormTemplate.meta` 拆为结构化数据，UI 渲染层调 `t()`；或在
   `useCaseFormTemplates` 接受 locale ref 并触发 re-fetch。前者更优，后者简单。
3. **P3 → R40-C** `cases.controller` 的 `:id` 参数加 `ParseUUIDPipe`；扫一遍其他
   controller 的 `:id` 路由统一处理。
4. **P4 → R40-D** S9 readonly 下隐藏「可用模板」section（或保留但加一行 readonly
   说明），与 banner 「全字段只读」语义对齐。
5. **沉淀**：本轮的 R40-A / R40-B 都属于"renderer 与 source-of-truth 不同步"，可在
   `ADR-007-no-duplicate-action-builders.md` 上叠一条 ADR-008 草稿：「server emit 的
   每个 action 字符串必须有 admin builder + i18n key 三方对齐；contract test 守门」。

---

## 6. R37 → R38 → R39 → R40 修复链路总览

| ID | R37 起点 | R38 修复 | R39 验证 | R40 验证 |
|---|---|---|---|---|
| Wiring | wiring 断 | ✅ hook 接通 | ✅ 仍 OK，但 R39-A 让 templates 拿到 0 | ✅ R40 templates 拉到 ja 全集 |
| Seed file_url | n/a | ⚠ 加 file_url 但 SQL bug | ❌ R39-B 整事务回滚 | ✅ R40 用独立 $6 参数，seed 跑通 |
| Placeholder 文案 | "暂无模板..."模糊 | ✅ 文案对调 | ✅ PASS | ✅ 持续 PASS |
| finalize/export title | 无 | ✅ controller 加 `extra: { title }` | ⚠ server 对了但 R39-C UI 看不到 | ✅ R40 colonSuffix 在 UI 完整渲染 |
| server language | 静默丢弃 | ✅ ListQuery 加字段 | ⚠ 接通但 admin 发的 locale 不匹配 | ✅ R40 admin 不传 language；ADR-006 沉淀决策 |
| docType i18n | raw 露出 | ✅ adapter `translateDocType` | ✅ 代码对，可视化被 R39-A 阻塞 | ✅ ja/zh/en 三语 docType 翻译 OK；R40-B locale 切换时缓存失效 P2 |
| Refetch storm | 11 GET / write | ✅ TAGS_FORMS 粒度化 | ✅ PASS（实测 2 GET / write） | ✅ 持续 PASS |
| S9 forms tab | disabled | （未在 R38 修） | ✅ enabled + readonly + empty state | ✅ enabled + readonly；R40-D 模板 section 显示但无按钮 P4 |
| Timeline raw key | 显示原 key | ✅ i18n 加 4 条 + builder | ⚠ R39-C 改在 dead code | ✅ colonSuffix 落到生产 builder；R40-A `validation_run.executed` raw key P2 |
| GD\_\* 错误码 | 无映射 | ✅ writeErrors 三语 | ✅ 持续 PASS | ✅ 持续 PASS |
| 404 vs 400 | n/a | n/a | ❌ R39-E 返 400 | ✅ aggregate 抛 NotFoundException → 404；R40-C 非 UUID 仍 500 P3 |

---

## 附录 · 走查环境与凭证

- Vite dev server: `http://localhost:5173`（PID 60474 监听 [::1]:5173）
- NestJS server: `PORT=3300`（PID 957 监听 *:3300）
- PostgreSQL: docker `cms-client-postgres-1`（5433 → 5432）
- 账号：`admin@local.test` / `Admin123!` (Local Demo Office)
- Browser: chrome-devtools-mcp 控制 Chromium（已经登录）
- 走查总用时：约 15 分钟，发起 30+ 条 HTTP 请求
- DB 当前 row 数：`document_templates` = 12（biz_mgmt_* × 2 + family × 3 + 其他历史
  种子数据），全部 `language='ja'`；`generated_documents` 含本轮新增 R40-MCP-TITLE-PROBE
- console.error / warning：0 条 ✅
- 一次性文件操作：本轮**未引入临时 seed 脚本**；为复跑 R39-B 仅运行 `npm run db:seed-dev`
  确认 done

---

## 7. 体系性沉淀（编译式入库候选 — 待回灌到权威文档）

本轮新发现的 4 条问题指向 3 条体系性原则，建议入库到
`docs/gyoseishoshi_saas_md/00-原则与约定/` 下：

1. **「server timeline action 与 admin builder 字典必须双向对齐」（R40-A）** —
   server 写 `validation_run.executed` 但 admin 只识别 `created/passed/failed`，
   UI 直接显示 raw key。建议：① 补 contract test：扫描 server 所有 `action: "..."` 与
   admin TIMELINE_MESSAGE_BUILDERS 字典 key 集合做差集；② builder 字典中显式声明
   "未识别 action 不应到达用户"；③ i18n 字典也纳入校验（builder key → i18n key 必有）。

2. **「数据 adapter 不应 eager translate；i18n 是渲染层职责」（R40-B）** — adapter
   把 docType 翻译成字符串塞进 meta 字段，导致 locale 切换时缓存失效。建议在 ADR 沉淀：
   data layer 永远返回结构化数据（含 i18n key），renderer 在渲染时调 `t()`。这条同样
   适用 chip 文案、状态徽标等任何 lookup 表。

3. **「controller `:id` 参数必须经 ParseUUIDPipe」（R40-C）** — 缺校验时非 UUID
   字符串透传到 SQL → pg 抛 invalid input syntax → 500。建议补一条 lint 规则或 review
   checklist：所有 controller `@Param("id") id: string` 必须加 `ParseUUIDPipe`（除非
   显式 opt-out 并注明理由）。

4. **「fix 验证不能只看 unit test 绿，必须有 chrome-devtools-mcp 走查记录」（R37/R38/
   R39/R40 共同教训）** — 本轮再次验证：R39 5 条修复在代码 diff 上看都对，但只有
   chrome-devtools-mcp 走查能发现 R40-A（builder 字典缺 action）、R40-B（locale 切换
   缓存失效）这种"上下游接口不同步"问题。建议把"P0/P1 修复 PR 必须附 chrome-devtools-mcp
   复跑日志（≤5 步）"写入 PR review checklist。
