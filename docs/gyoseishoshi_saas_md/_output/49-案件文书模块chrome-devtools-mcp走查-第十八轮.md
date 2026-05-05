# 案件文书模块 chrome-devtools-mcp 走查（第十八轮 / R38 — R37 修复回归 + 新发现）

> 生成日期：2026-05-05
>
> 命题：在第十七轮（R37）之后，案件文书模块陆续合入了模板 wiring / status chip / 占位徽标 /
> timeline 翻译 / GD\_\* 错误码 i18n / 模板按钮 click handler 等一揽子修复。本轮使用
> chrome-devtools-mcp 在运行环境中**逐一回归 R37 缺陷**，并补充观测新引入或仍存在的次级问题。
>
> 工具：chrome-devtools-mcp（list_pages / navigate_page / take_snapshot / click / evaluate_script
> / list_network_requests / list_console_messages / take_screenshot）
>
> 数据集：Local Demo Office（admin@local.test / Admin123!）；23 条种子案件，4 类 caseTypeCode：
> `biz_mgmt_cert_4m`（4） / `biz_mgmt_4m`（10） / `biz_mgmt`（6） / `family`（3）；
> 阶段覆盖 REVIEWING / CONSULTING / WAITING_MATERIAL / CLOSED_SUCCESS / CLOSED_FAILED。

---

## 0. 总结

### 0.1 一句话结论

**R37 的 8 项核心缺陷在代码层面全部修复完毕，且本轮在 BMV / family 两类案件上验证均生效**：模板 wiring（R37-A）从 hook 接通到 view，「可用模板」section 真实拉取 `/api/document-templates?caseType=…`，模板行的「生成」按钮（R37-K）会把 templateId 预填进生成弹窗；状态 chip（R37-C）"草稿 / 已定稿 / 已导出" 跨三语正确渲染；meta 行（R37-B）补出 "已定稿：Local Admin · 14:53" 等审批留痕；占位徽标（R37-D）"占位 URL · P1 落地" 在 exported 行清晰显示；timeline 翻译（R37-E）"文书定稿：" / "文书导出：" 在 zh-CN 下不再露出 raw event key；finalize / export 双写 timeline（R37-F）已按 `skipTimelineWrite=true` 抑制，**新一轮**操作每次只产生 1 条事件；GD\_\* 7 个错误码（R37-J）三语 i18n 全部就位。**但回归过程中暴露了 6 项新的衍生缺陷，最关键的两条会让用户**「在初次启用文书模块时一条模板都看不到」：① `seedDevData` 因 `document_files.file_url` 不允许 NULL 而整事务回滚，导致 12 条种子模板从未落库；② finalize / export 控制器调用 `writeTimeline` 时未透传 `title`，使新写入的 timeline 显示成 "文书定稿：" / "文书导出："（冒号后面空空如也，对照 "文书生成：R23-AUDIT-TITLE-TEST" 的正确形态）；③ 弹窗 placeholder 文案语义反转，明明已有模板却显示 "暂无模板（走占位流程）"；④ 服务端 `language` 查询参数被 controller 静默丢弃（前端发了，后端不读，WHERE 不过滤）。R37-A 的 wiring 修好之后，"种子链路" 与 "传值链路" 上的小问题反而被放大暴露出来。**

### 0.2 走查矩阵（4 个代表性案件 × 7 个交互节点）

| 案件 | caseTypeCode | businessPhase | 文书 tab | 模板 section | 模板按钮 → 弹窗预填 | 提交生成 | 定稿 | 导出 | 占位徽标 |
|---|---|---|---|---|---|---|---|---|---|
| **A** R23-AUDIT-TITLE-TEST<br/>`5d38aaac…` | biz_mgmt_cert_4m | REVIEWING (S4) | ✅ | ✅ 2 模板 | ✅ R37-K 生效 | ✅ 201 | ✅ 201 | ✅ 201 | ✅ "占位 URL · P1 落地" |
| **B** R5 reminder probe<br/>`baf30979…` | family | CONSULTING | ✅ | ✅ 3 模板 | ✅ | ✅ 201（空模板） | n/a | n/a | n/a |
| **C** Tani Family Stay<br/>`cafc4ec5…` | family | CLOSED_SUCCESS (≈S9) | ⚠ R38-G tab 整 disabled（与 R37-H 同源） | n/a | n/a | n/a | n/a | n/a | n/a |
| **D** BUG-117 CLOSED_FAILED<br/>`3ede349e…` | biz_mgmt_4m | CLOSED_FAILED | n/a | n/a | n/a | server 400 `GD_CASE_S9_READONLY` ✅ | n/a | n/a | n/a |

✅ = pass / ⚠ = 本轮新发现缺陷 / n/a = 类型不适用

### 0.3 R38 缺陷分布

| 等级 | 数量 | 主要分布 |
|---|---|---|
| **P1** | 1 | R38-A 种子链路：`seedDocumentFile` 缺 `file_url` → 整事务回滚 → 12 条模板 0 落库 |
| **P2** | 2 | R38-C finalize/export timeline 缺 `title` 载荷 / R38-F 写后 refetch storm 持续 |
| **P3** | 2 | R38-B placeholder 文案语义反转 / R38-D 服务端 `language` 参数静默丢弃 |
| **P4** | 1 | R38-E 模板 meta 露出 raw docType 代码（user-unfriendly） |

R37 → R38 PASS 验证（共 8 项）：R37-A / R37-B / R37-C / R37-D / R37-E / R37-F / R37-J / R37-K **全部通过**。
R37-H（S9 forms tab disabled）保持原样，本轮以 R38-G 单独编号；视产品口径决定。

### 0.4 体系性问题（编译式沉淀）

1. **「Wiring 修好之后才能看见的下一层 bug」 — 多层依赖链路的回归方法**
   - R37-A wiring 接通，本轮立刻暴露 R38-A（种子）、R38-C（payload）、R38-B（文案）三条之前被「死代码 hook」掩盖的缺陷。
   - 教训：单测全绿 + 独立模块走查全绿 ≠ 端到端可用。新模块 P0 上线前必须有一次 "数据 → API → adapter → wiring → UI → timeline 留痕" 的全链路 mcp 走查。
   - 建议固化：每个新写入端点（POST/PATCH/DELETE）合入时，必须随附一条 chrome-devtools-mcp 走查 record。

2. **「Seed 是 P0 dev-loop 最脆弱的一环」**
   - R38-A 是教科书例子：迁移 009 把 `document_files.file_url` 标 NOT NULL，但 `seedDevData.ts:188 seedDocumentFile` 的 INSERT 没列这一列。
   - 整个 seed 是一个事务：BEGIN → seedCustomer → seedCases → seedDocumentItems → seedDocumentFile（FAIL）→ ROLLBACK → 后续 seedDocumentTemplates 永远不执行。
   - 体现规则：**不允许"半成功的 seed"**，但 ROLLBACK 之后从外部看 admin 页面就是 "templates 永远为空"。
   - 建议补 guard：`db:seed-dev` 出错时应当 print 红字 `[CRITICAL] seed rolled back at step <N>: ...`，并把这条 guard 加进 release runbook。

3. **「Timeline payload 是新 action 的隐形 contract」**
   - R37-E 加了 4 条 i18n 翻译：`generatedDocumentCreated/Updated/Finalized/Exported`，每条都用 `{suffix}` 占位符。
   - `pickSuffix(p, ["title","templateName"])` 期望 server 在 payload 里给一个能展示的字段。
   - 但 controller 在 finalize / export 调 `writeTimeline` 时只传 `caseId / generatedDocumentId / action`，**没有 title** → "文书定稿："（冒号后空白）。
   - 建议：把 `extra: { title: existing.title }` 作为 finalize / export 的强制 payload；`writeTimeline` 函数应在类型层面要求 builder 期望的字段（或者反过来：让 builder 容忍空 suffix，去掉冒号）。

4. **「i18n key 的语义和文案值必须分别 review」**
   - R38-B 是 R37-A2 修复的副作用：合入了两条 key（`templatePlaceholder` / `templateEmpty`），但**值赋反了**：
     - `templatePlaceholder`（hasTemplates=true 时显示）= "暂无模板（走占位流程）" ← 矛盾
     - `templateEmpty`（hasTemplates=false 时显示）= "尚未配置可选模板，将创建无模板草稿" ← 这才是 placeholder 文案
   - 体现：i18n 修复必须以「**用户实际看到什么**」 为准来 review 文案，不能光看 key 名字。

5. **「未消费的 query 参数是契约腐烂的早期信号」**
   - R38-D：前端 `buildCaseDocumentTemplatesUrl` 总是带上 `language` 参数，单测断言 URL 包含 `language=ja`；
     但 server controller 的 `ListQuery` 类型根本没声明 `language`，service `buildListWhere` 也没 WHERE 这一列。
   - 后果：admin 用任何 language 拿到的都是同一份 raw 列表 — 看不出来出错，但已经"哑"了。
   - 建议：**API contract 要在 server 侧加 schema 校验**（zod/io-ts/built-in 都行），任何未声明的 query 参数要么 reject 要么 strip + warn，避免「装作支持但其实丢弃」的伪装。

---

## 1. R37 修复回归（PASS 项）

### R37-A → R38 PASS：模板 wiring 全链路通畅

**网络回路**（首次进入 BMV 案件 forms tab）：

```
GET /api/cases/5d38aaac.../aggregate                         → 304
GET /api/document-items?caseId=5d38aaac...                   → 304
GET /api/generated-documents?caseId=5d38aaac...              → 304
GET /api/document-templates?caseType=biz_mgmt_cert_4m&language=zh-CN  → 200  ← R37-A 修复点
```

**UI 表现**：

```
可用模板
  事業計画書        business_plan · ja · v1   [ 生成 ]
  会社概要          company_overview · ja · v1 [ 生成 ]
已生成文书
  R23-AUDIT-TITLE-TEST  PDF · v1 · Local Admin · 2026/05/05 14:53
                        · 已导出：Local Admin · 14:53
                        [已导出] [占位 URL · P1 落地] [再次导出]
```

**契约测试**：`packages/admin/src/views/cases/CaseDetailView.wiring.contract.test.ts:307-347`
（`formTemplates` 必须挂载 + `enrichedDetail.forms.templates` 必须包含返回值）已落地。

### R37-B → R38 PASS：meta 行随状态刷新

| 时点 | meta 行 |
|---|---|
| 生成（draft） | `PDF · v1 · Local Admin · 2026/05/05 14:53` |
| 定稿（final） | `PDF · v1 · Local Admin · 2026/05/05 14:53 · 已定稿：Local Admin · 14:53` |
| 导出（exported） | `PDF · v1 · Local Admin · 2026/05/05 14:53 · 已导出：Local Admin · 14:53` |

模板：`cases.detail.forms.metaApprovedAt: "{action}：{name} · {time}"`

### R37-C → R38 PASS：状态 chip 渲染 + i18n

```198:204:packages/admin/src/views/cases/components/CaseFormsTab.vue
<Chip :tone="chipTone(doc)" size="micro">
  {{ t(`cases.detail.forms.status.${doc.backendStatus}`) }}
</Chip>
```

zh-CN：`草稿 / 已定稿 / 已导出` ｜ ja-JP：`下書き / 確定済み / 出力済み` ｜ en-US：`Draft / Finalized / Exported`

### R37-D → R38 PASS：占位徽标渲染

```196:204:packages/admin/src/views/cases/components/CaseFormsTab.vue
<Chip
  v-if="doc.backendStatus === 'exported' && doc.isPlaceholderFile"
  tone="neutral" size="micro"
  data-testid="placeholder-badge"
  :title="t('cases.detail.forms.placeholderBadge')"
>
  {{ t("cases.detail.forms.placeholderBadge") }}
</Chip>
```

UI 实测："占位 URL · P1 落地"，鼠标悬停同样文本。`<a download :href="doc.fileUrl">` 在 `isPlaceholderFile=false` 时才渲染。

### R37-E → R38 PASS：timeline 翻译完整

```text
LA  文书导出：           操作日志 · 文书 · 2026/05/05 14:53     ← 本轮新写入（仅 1 条）
LA  文书定稿：           操作日志 · 文书 · 2026/05/05 14:53     ← 本轮新写入（仅 1 条）
LA  文书生成：R23-AUDIT-TITLE-TEST  操作日志 · 文书 · 14:53
LA  文书导出：           操作日志 · 文书 · 2026/05/05 13:48     ← R37 时代旧条目
LA  文书更新：           操作日志 · 文书 · 13:48                ← R37 时代旧条目
LA  文书定稿：           操作日志 · 文书 · 13:47
LA  文书更新：           操作日志 · 文书 · 13:47
LA  文书生成：R23-AUDIT-TITLE-TEST  操作日志 · 文书 · 13:46
```

四条 action 的 builder 在 `CaseTimelineBuilders.ts:177-192` 全部就位。

### R37-F → R38 PASS：双写 timeline 已抑制

新一轮（14:53）finalize / export 操作每次只写 1 条 timeline。
`generatedDocuments.controller.ts:235-248` 调 `update(..., { skipTimelineWrite: true })` + 单独写 `.finalized`，
`service.update()` 内部 `if (!options?.skipTimelineWrite)` 真正生效。

历史 13:47/13:48 的 4 条 `.updated` 是 R37 修复前的遗留数据 — 不影响新链路。

### R37-J → R38 PASS：GD_\* 错误码三语 i18n 完备

`CaseWriteErrorMapping.ts:66-72` 7 条 code 全部映射到 `cases.writeErrors.gd*` key；
zh-CN / ja-JP / en-US 文案就位。
直接 fetch 测试：

| 触发 | 服务器响应 | admin i18n key | 中文渲染 |
|---|---|---|---|
| POST 创建（caseId 是 S9 案件） | 400 `GD_CASE_S9_READONLY: …` | `gdCaseS9Readonly` | "案件已归档，无法修改生成文书。" |
| POST `/finalize` 已 exported | 400 `GD_INVALID_TRANSITION: …` | `gdInvalidTransition` | "此状态流转不允许（例如：已导出 → 草稿）。" |
| POST 创建 title="   " | 400 `GD_TITLE_REQUIRED: …` | `gdTitleRequired` | "文书标题为必填项。" |
| POST 创建 outputFormat=`xls` | 400 `GD_INVALID_OUTPUT_FORMAT: …` | `gdInvalidOutputFormat` | "不支持的输出格式。" |

### R37-K → R38 PASS：模板按钮 click handler

`CaseFormsTab.vue:134-141` 的 row 按钮 `@click="emit('open-generate-modal', tpl.id)"`，
`CaseDetailView.vue` 接住后传 `:initial-template-id="formGenInitialTemplateId"`，
modal 在 `watch(props.open)` 里 `localTemplateId.value = props.initialTemplateId ?? null`。

实测：点击模板行「事業計画書」的「生成」按钮 → 弹窗自动选中 `事業計画書`，
title 默认为案件名，outputFormat 默认 `pdf`。

---

## 2. R38 新发现缺陷

### R38-A · P1 · seed 失败导致 12 条文书模板从未落库

**现象**：

```text
$ npm run db:seed-dev
> tsx --env-file=.env src/scripts/seedDevData.ts
[seed-dev] failed: null value in column "file_url" of relation "document_files" violates not-null constraint
npm error code 1
```

后续探针：

```javascript
fetch('/api/document-templates').then(r => r.json())
// → { items: [] }     (整库 0 条)

fetch('/api/document-templates?caseType=family')
// → { items: [] }
fetch('/api/document-templates?caseType=biz_mgmt_cert_4m')
// → { items: [] }
```

**根因（代码）**：

迁移 009：

```99:99:packages/server/src/infra/db/migrations/009_core_entities.up.sql
file_url text not null,
```

`document_files` 表 `file_url` 标记为 NOT NULL。

`seedDevData.ts:188-201 seedDocumentFile` INSERT 列：

```text
id, org_id, requirement_id, file_name, file_type,
version_no, uploaded_by, review_status, storage_type,
relative_path, asset_id, expiry_date
                ↑ 缺 file_url
```

`seedDevData.ts:373-385 main()` 把 8 个 step 包成一个 transaction：

```text
BEGIN
  → seedCustomer
  → seedCases
  → seedDocumentItems
  → seedDocumentAsset
  → seedDocumentFile          ← FAIL
  → seedCrossCaseLink         ← skipped
  → seedDocumentChecklistTemplate ← skipped
  → seedDocumentTemplates     ← skipped
ROLLBACK
```

结果：customers / cases / document_items 等也被 ROLLBACK，但其他迁移和过去 seed 已经把 23 条案件、若干 doc items 写进去（多次运行的累积），所以 admin 仍然能看到 23 条案件 — 唯独 document_templates 因为是迁移 048 的新表、之前从未成功 seed 过，所以表里 0 行。

**等级**：P1 — 影响 dev/QA 全员，新装环境一进来发现「文书模块没东西看」。

**修复方向**：

1. 短期（必须）：`seedDocumentFile` 的 INSERT 增加 `file_url`，可写占位 URL `'placeholder://document-files/<id>.pdf'` 与 `generated_documents` export 的占位语义对齐。
2. 中期：`db:seed-dev` 失败时不能只 print `[seed-dev] failed:`，应该列出失败的 step 名（"failed at seedDocumentFile, prior steps rolled back"）。
3. 中期：把 `db:seed-dev` 的成功条件加进 `npm run guard` 或 release-readiness gate。

**验证**：本轮临时写了一个 `packages/server/src/scripts/seedDocumentTemplatesOnly.ts`（只 seed templates），跑完后立即可见模板列表 200 OK，证明 R37-A wiring 在数据存在时立刻 work。

---

### R38-B · P3 · 弹窗模板 placeholder 文案与 key 语义反转

**现象**：

modal 打开后 dropdown 选项（家族滞在案件，3 个真实模板）：

```
[ 暂无模板（走占位流程）        ] ← 默认（value="")
  在留資格認定証明書交付申請書
  婚姻証明書
  扶養者の住民票の写し
```

明明有 3 个模板可选，第一个选项却写「暂无模板」，用户被误导：「是不是模板还没出来？」

**根因（代码）**：

```119:139:packages/admin/src/views/cases/components/CaseFormGenerateModal.vue
<select :disabled="!hasTemplates || props.submitting" :value="localTemplateId ?? ''">
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
```

`hasTemplates=true` 时显示 `templatePlaceholder`。但当前 zh-CN 文案值：

```608:609:packages/admin/src/i18n/messages/cases/zh-CN.ts
templatePlaceholder: "暂无模板（走占位流程）",
templateEmpty: "尚未配置可选模板，将创建无模板草稿",
```

`templatePlaceholder` 的**值**是 templateEmpty 应该说的话；
`templateEmpty` 的值才是 placeholder 应该说的话（"创建无模板草稿"）。

ja-JP / en-US 同款。

**等级**：P3

**修复方向**：

把两个 key 的文案对调，或者改成：

```typescript
templatePlaceholder: "请选择模板（可留空创建空白草稿）",
templateEmpty: "尚未配置可选模板，将创建无模板草稿",
```

zh-CN / ja-JP / en-US 三语同步。

---

### R38-C · P2 · finalize / export 写 timeline 时未透传 `title`，UI 显示 "文书定稿：" 空尾巴

**现象（截图证据）**：

R23-AUDIT-TITLE-TEST 案件 `?tab=log`：

```
LA  文书导出：             操作日志 · 文书 · 2026/05/05 14:53     ← 冒号后空白
LA  文书定稿：             操作日志 · 文书 · 2026/05/05 14:53     ← 冒号后空白
LA  文书生成：R23-AUDIT-TITLE-TEST  操作日志 · 文书 · 14:53        ← 正常
```

`generatedDocumentFinalized` / `generatedDocumentExported` 在 zh-CN 翻译为 "文书定稿：{suffix}" / "文书导出：{suffix}"，
但 `{suffix}` 永远是空字符串。

**根因（代码）**：

```243:248:packages/server/src/modules/core/generated-documents/generatedDocuments.controller.ts
await this.generatedDocumentsService.writeTimeline(ctx, {
  caseId: existing.caseId,
  generatedDocumentId: id,
  action: "generated_document.finalized",
  // ❌ 没有 extra: { title }
});
```

```280:285:packages/server/src/modules/core/generated-documents/generatedDocuments.controller.ts
await this.generatedDocumentsService.writeTimeline(ctx, {
  caseId: existing.caseId,
  generatedDocumentId: id,
  action: "generated_document.exported",
  extra: { fileUrl: placeholderFileUrl },  // ✅ 但仍然没有 title
});
```

而 admin builder 期待 `title`：

```185:191:packages/admin/src/views/cases/model/CaseTimelineBuilders.ts
"generated_document.finalized": (p) => ({
  key: "cases.log.timeline.generatedDocumentFinalized",
  params: { suffix: pickSuffix(p, ["title", "templateName"]) },
}),
"generated_document.exported": (p) => ({
  key: "cases.log.timeline.generatedDocumentExported",
  params: { suffix: pickSuffix(p, ["title", "templateName"]) },
}),
```

`pickSuffix` 找 `title` / `templateName` 都找不到 → 返回空 string。

`generated_document.created` 之所以正常，是因为 `service.create()` 写 timeline 时 payload 包含了 title（细节走查没确认到，但行为对得上）。

**等级**：P2 — 日志可读性核心场景被打破。

**修复方向**：

```typescript
// finalize
await this.generatedDocumentsService.writeTimeline(ctx, {
  caseId: existing.caseId,
  generatedDocumentId: id,
  action: "generated_document.finalized",
  extra: { title: existing.title },
});

// export
await this.generatedDocumentsService.writeTimeline(ctx, {
  caseId: existing.caseId,
  generatedDocumentId: id,
  action: "generated_document.exported",
  extra: { title: existing.title, fileUrl: placeholderFileUrl },
});
```

附带修：admin builder 应在 suffix 为空时**不渲染冒号**；`pickSuffix` 返回 "" 时让 builder 改输出 `cases.log.timeline.generatedDocumentFinalizedNoTitle`（无 suffix 版本）。两层并行更稳。

---

### R38-D · P3 · 服务端 `language` 查询参数被静默丢弃

**现象**：

```javascript
fetch('/api/document-templates?caseType=biz_mgmt_cert_4m&language=zh-CN').then(r=>r.json())
// → 2 items, language: "ja"  (并未按 zh-CN 过滤)

fetch('/api/document-templates?caseType=biz_mgmt_cert_4m&language=ja').then(r=>r.json())
// → 同样 2 items

fetch('/api/document-templates?caseType=biz_mgmt_cert_4m&language=fr-XX').then(r=>r.json())
// → 同样 2 items（即使是不存在的 locale 也不报错）
```

**根因（代码）**：

```44:47:packages/server/src/modules/core/document-templates/documentTemplates.controller.ts
type ListQuery = {
  caseType?: unknown;
  includeInactive?: unknown;
};
```

`ListQuery` 没声明 `language`，controller 没读，service `buildListWhere`（line 225-242）也没 WHERE language。

而 admin 在 `buildCaseDocumentTemplatesUrl` 总是会拼上 `language` query string：

```68:77:packages/admin/src/views/cases/model/CaseAdapterDocumentTemplates.ts
const qs = new URLSearchParams();
qs.set("caseType", params.caseType);
if (params.language) qs.set("language", params.language);
return `${base}?${qs.toString()}`;
```

**等级**：P3 — 现阶段所有种子模板都是 `language='ja'`，肉眼不出错；P0 之后如果 i18n 模板入库就会撞车。

**修复方向**：

二选一：

A. **接通**（推荐）：`ListQuery` 增加 `language?: unknown`；service 增加 `if (input.language) where.push(\`language = $\${...}\`)`。
B. **明确丢弃**：把 frontend `buildCaseDocumentTemplatesUrl` 的 `language` 参数移除，等真正落地多语言模板时再加。

无论选哪条，建议同步在 server 加一个 strict-query schema 中间件，杜绝以后类似伪装。

---

### R38-E · P4 · 模板 meta 行露出 raw `docType` 代码

**现象**：

```
事業計画書    business_plan · ja · v1
会社概要      company_overview · ja · v1
婚姻証明書    supporting_document · ja · v1
```

`business_plan / company_overview / supporting_document / application_form` 是数据库 `doc_type` 字段，未 i18n 过的内部代码。普通用户看不出含义。

**根因**：

```25:28:packages/admin/src/views/cases/model/CaseAdapterDocumentTemplates.ts
const metaParts: string[] = [];
if (docType) metaParts.push(docType);   // 直接 push 原文
if (language) metaParts.push(language);
if (versionNo > 0) metaParts.push(`v${versionNo}`);
```

**等级**：P4

**修复方向**：

- 短期：i18n key 映射，`cases.detail.forms.docType.business_plan = "事业计划书"` 之类；找不到时 fallback 原值。
- 中期：把 `docType` 的「展示名」直接放到 server side（数据库新增 `display_name` 字段或在 service map 一次），减少前端的 i18n 维护成本。

---

### R38-F · P2 · 写后 refetch storm 持续未优化（与 R37 §2 同源观察）

**现象（network log 实测）**：

| POST | 201 | 后续 GET 数 | 304 数 | 200 数 |
|---|---|---|---|---|
| `POST /api/generated-documents` | 1 | 11 | 9 | 2 |
| `POST .../finalize` | 1 | 11 | 9 | 2 |
| `POST .../export` | 1 | 11 | 9 | 2 |

每次写入触发 `aggregate / document-items / generated-documents / validation-runs / billing-tab-aggregate / submission-packages / review-records / communication-logs / timeline / tasks / reminders` **整组 refetch**。

实际只有 generated-documents 和 timeline 数据变了，其他 9 条 GET 都是 304（无变更），但每条都付 RTT。

定稿 / 导出场景的 generated-documents response body 也是 ~700 bytes，**相对每次至少 8-10 个 304 round-trip**，UX 有可感知抖动（status chip 在 50ms 后才换色）。

**等级**：P2

**修复方向**：

参考 R37 末段建议：在 `useCaseDetailWriteActions` 区分写入类型：

```typescript
type WriteAction = "comm" | "task" | "reminder" | "form" | "stage" | …;
const REFETCH_MAP: Record<WriteAction, ('aggregate' | 'forms' | 'timeline' | …)[]> = {
  form: ['forms', 'timeline'],
  comm: ['comm', 'timeline'],
  ...
};
```

`onSuccess` 只 refetch 相关的 1-3 个 endpoint，而不是全套。

---

### R38-G · P4 · S9 案件 forms tab 仍 disabled（R37-H 持续）

**现象**：

```javascript
// CASE-202604-0001 Tani Family Stay (CLOSED_SUCCESS)
tabs.forms.disabled === true
```

URL 强行带 `?tab=forms` → 路由自动 fallback 到 `?tab=log`。

server-side gate 同时存在并 work（R38-D 矩阵的 D 行 — `GD_CASE_S9_READONLY` 阻止任何写入），所以即便 expose 只读 forms tab 也是安全的。

**等级**：P4 — 与 R34/R37-H 同源，**视产品口径决定是否要让用户在 S9 状态下看到历史已生成文书**（可能性：legal review 上需要回查档案）。

**修复方向**：

- 选项 A：保持 disabled（当前），在 archive 节点用一次性导出 ZIP 生成只读快照。
- 选项 B：让 forms / documents tab 在 S9 时 enabled 但 readonly（CaseFormsTab 已支持 `readonly` prop）。

---

## 3. Happy-path 网络回路（R38 实测）

| # | 时点 | Method | URL | 状态 |
|---|---|---|---|---|
| 1 | 进入 forms tab | GET | `/api/cases/:id/aggregate` | 304 |
| 2 | 同上 | GET | `/api/document-items?caseId=:id` | 304 |
| 3 | 同上 | GET | `/api/generated-documents?caseId=:id` | 304 |
| 4 | **同上 — R37-A 修复点** | GET | `/api/document-templates?caseType=biz_mgmt_cert_4m&language=zh-CN` | 200 |
| 5 | 点 row 模板「生成」 | (无网络) | (modal 打开 + initialTemplateId 预填) | — |
| 6 | 提交生成 | POST | `/api/generated-documents` | 201 → `status:"draft", versionNo:1, fileUrl:null` |
| 7 | refetch ×11（R38-F） | … | … | 9×304 + 2×200 |
| 8 | 点「定稿」 | POST | `/api/generated-documents/:id/finalize` | 201 → `status:"final", approvedBy, approvedAt` |
| 9 | refetch ×11 | … | … | 同上 |
| 10 | 点「导出」 | POST | `/api/generated-documents/:id/export` | 201 → `status:"exported", fileUrl:"placeholder://generated-documents/<id>.pdf"` |
| 11 | refetch ×11 | … | … | 同上 |

**Console**：5 条 400 error 来自手工触发的 `GD_*` 探针；happy-path 全程 0 console error ✅

---

## 4. 截图

| 文件 | 描述 |
|---|---|
| `/tmp/r38-A1-bmv-forms-tab-templates.png` | BMV S4 案件 — 「可用模板」section 显示 2 模板 + 已导出占位徽标（R37-A/D 修复落地） |
| `/tmp/r38-A2-family-modal-open.png` | 家族案件生成弹窗 — dropdown 显示 3 模板 + R38-B 文案问题（"暂无模板（走占位流程）" 第一项与现实矛盾） |
| `/tmp/r38-A3-bmv-forms-after-flow.png` | 走完 generate/finalize/export 三态后 forms tab — 双 row 显示 "已定稿"、"已导出" chip + "占位 URL" 徽标 |
| `/tmp/r38-A4-bmv-timeline-empty-suffix.png` | timeline 实测 — "文书定稿：" / "文书导出：" 冒号后空白（R38-C） |
| `/tmp/r38-S9-forms-tab-disabled.png` | CLOSED_SUCCESS 案件 — forms tab disabled，只有概览/日志可点（R38-G） |

---

## 5. 后续建议（按优先级）

1. **P1 → R38-A 修复 seed**（一行加 `file_url` + 红字日志），解锁 dev/QA 全员模板可见
2. **P2 → R38-C finalize/export 透传 title**（controller 一行 `extra: { title: existing.title }`），让日志 "文书定稿：xxx" 完整可读
3. **P2 → R38-F refetch storm 优化**（写后只刷 forms + timeline），让交互反馈延迟感消失
4. **P3 → R38-B 文案对调** + R38-D server side 接通 `language` 参数
5. **P4 → R38-E docType i18n 映射** / R38-G S9 forms tab readonly view（视产品口径）

---

## 附录 · 走查环境与凭证

- Vite dev server: `http://localhost:5173`
- NestJS server: `PORT=3300`
- 账号：`admin@local.test` / `Admin123!` (Local Demo Office)
- Browser: chrome-devtools-mcp 控制 Chromium
- 走查总用时：约 35 分钟，发起 ~135 条 HTTP 请求（含 happy-path 33 + 探针 5 + 跨案件切换 ~50 + 初次加载 ~47），happy-path 0 console error。
- 一次性临时 seed 脚本：`packages/server/src/scripts/seedDocumentTemplatesOnly.ts`（用于绕过 R38-A 不阻断走查 — 该脚本仅作 R38 走查工具，**生产/CI 不应使用，建议合并 R38-A 修复后删除**）。

---

## 6. R37 → R38 fix verification table（一目了然）

| ID | R37 描述 | 修复点（代码） | R38 验证 |
|---|---|---|---|
| R37-A | 模板 wiring 断开 | `useCaseDetailModel.createFormTemplatesSlice` + `CaseDetailView.vue:746,831` + 契约测试 307-347 | ✅ PASS — 网络回路有 GET，UI 渲染 templates section |
| R37-A1 | dev seed 漏跑 | n/a（仍存在；本轮升级为 R38-A，根因不同） | ⚠ STILL FAIL — `seedDocumentFile` `file_url` 致整事务回滚 |
| R37-A2 | "暂无模板（走占位流程）" 文案模糊 | i18n `templatePlaceholder` / `templateEmpty` 二元化 | ⚠ PARTIALLY — key 拆好但**文案值赋反**（R38-B） |
| R37-B | 已生成 row meta 不刷新 | `metaApprovedAt` 模板 + adapter 写入 approvedBy/approvedAt | ✅ PASS |
| R37-C | statusLabel 不渲染 + 硬编码日文 | `CaseFormsTab.vue:191-193` Chip + i18n `forms.status.*` | ✅ PASS |
| R37-D | 占位 fileUrl 不可见 | `isPlaceholderFile` flag + `placeholderBadge` chip + 真实 download link | ✅ PASS |
| R37-E | timeline raw event key | `CaseTimelineBuilders.ts:177-192` 4 条 builder + 三语 i18n | ✅ PASS（但 R38-C 暴露 suffix 缺失） |
| R37-F | finalize/export 写两条 timeline | `service.update({ skipTimelineWrite })` 选项 | ✅ PASS（仅新操作 1 条） |
| R37-G | `.created` 翻译已 OK | n/a | ✅ 持续 PASS |
| R37-H | S9 forms tab disabled | n/a（设计选择） | ⚠ unchanged — 升级为 R38-G，按产品口径处理 |
| R37-I | server-side gate OK | n/a | ✅ 持续 PASS |
| R37-J | `GD_*` 错误码未映射 | `CaseWriteErrorMapping.ts:66-72` + 三语 i18n `gd*` keys | ✅ PASS |
| R37-K | 模板按钮无 click handler | `CaseFormsTab.vue:138 @click="emit('open-generate-modal', tpl.id)"` + modal `:initial-template-id` | ✅ PASS |
