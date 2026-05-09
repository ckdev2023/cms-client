# RFC-080: 文書真实化渲染管线（D3 阶段）

- **状态**: Draft（待评审）
- **作者**: Agent（D3-rendering-pipeline）
- **日期**: 2026-05-09
- **前置依赖**:
  - [RFC-077: 真实文件生成（D2 阶段）](./77-rfc-real-file-generation-2026-05-08.md) — 队列 / handler / 状态机已落地
  - [78 — docs-forms 走查 v7](./78-MCP-docs-forms-walkthrough-2026-05-09-v7.md) — 暴露「占位渲染」「模板 seed 漂移」「无 worker / 无轮询」三组症状
  - [79 — docs-forms 走查 v9](./79-MCP-docs-forms-walkthrough-2026-05-09-v9.md) — 修复回归
- **作用**: 把 D2 占位 stub 替换为可投产的真实文書渲染管线，让用户拿到「内容非空白」的可下载文書
- **不包含**: PDF 直出（P2 另起 RFC）、事务所自定义模板上传（P2）、印影/落款 PNG 嵌入（P2）；申請書 PDF 自动填表（**P3 单独 RFC**，见 §11）

---

## 评审历史

| 版本 | 日期 | 评审/修订记录 | 来源 |
|---|---|---|---|
| v1 | 2026-05-09 | 初稿 | 本文 |
| v1.1 | 2026-05-09 | 行政書士实务对照评审 v1（22 条 / P0×8 + P1×9 + P2×5）；本版本已落地 P0/P1 修改 | [83 — 实务评审](./83-AUDIT-gyoseishoshi-practice-review-2026-05-09.md) |

---

## 0. 背景与症状

### 0.1 业务症状

`78 §NEW-V7-6` 与本次会话现场观察一致：

> 用户走「新建草稿 → 定稿 → 导出」全链路，导出后获得的 PDF/DOCX **内容空白，仅包含一行标题**。文书核心字段（申请人姓名、生年月日、雇主信息、扶養者关系、行政書士落款……）**全部缺失**，无法作为入管交付物使用。

行政書士行业容错极低，**「空白文書」= 上线即事故**。

### 0.2 代码现状（占位 stub）

`packages/server/src/modules/core/jobs/handlers/generatedDocExportHandler.ts:156-194`：

```ts
function renderDocument(_tenantDb, opts, signal): Buffer {
  if (opts.outputFormat === "pdf") return buildMinimalPdf(opts.title);
  return buildMinimalDocx(opts.title);
}
function buildMinimalDocx(title) {
  // 只塞了一行 <w:t>${title}</w:t>，没有读 templateId / 没有读案件数据
}
function buildMinimalPdf(title) {
  // 单页 ASCII fallback，非 ASCII 字符替换为 ?
}
```

`_tenantDb` 参数被忽略；`opts.templateId` 没有被读；`document_templates.content_body` / `variables_schema` 完全没用。

### 0.3 已经落地的 D2 部分（不在本 RFC 重复）

- 状态机：`generatedDocuments.helpers.ts:13-28` `draft → final → exporting → exported / export_failed`
- 队列：`worker.ts` 注册 `generated_doc_export_jobs`，`generatedDocExportHandler.handleGeneratedDocExportJob` 已实现幂等检查 + 上传 + 状态推进
- 入队触发：`generatedDocuments.controller.ts:343-396` `POST /:id/export` 立即返回 `exporting` + 入队
- 前端轮询：`useCaseFormsExportPolling.ts`（已落地，5s 间隔）
- 模板快照：`generated_documents.template_version_no` 已存（迁移 055）

**D3 = 把 `renderDocument` 的内部从 stub 替换为真实管线**，外加上下游配套（模板资产、变量上下文、缺失策略、可观测性）。

---

## 1. 总体架构（三层 + 兜底）

```
┌──────────────────────────────────────────────────────────────────────┐
│  L1  模板资产层（事务所/平台维护）                                   │
│  document_templates: { content_body | storage_key, variables_schema }│
│  ─────────────────────────────────────────────────────────────────── │
│  L2  变量上下文层（renderer 拼装的"渲染合同"）                       │
│  RenderContext = { customer, case, supporters, org, today }          │
│  按 variables_schema 校验 required 字段，缺失 → preflight failure    │
│  ─────────────────────────────────────────────────────────────────── │
│  L3  渲染管线（worker handler 内）                                   │
│  loadTemplate → buildContext → preflight → fillDocx → upload         │
│  ─────────────────────────────────────────────────────────────────── │
│  兜底  finalize-time preflight（导出前就拦下，而非导出后才空白）     │
└──────────────────────────────────────────────────────────────────────┘
```

> **治理总原则**：把 P0 阶段「文書空白」的责任前移到 finalize 时刻——用户在按「定稿」之前就被告知「3 项必填变量缺失，请先补客户档案 + 关系人信息」，而不是等到导出后才发现拿到空白。

---

## 2. L1 — 模板资产层

### 2.1 模板表（已存在，仅扩展用法）

迁移 `048_document_templates.up.sql:6-21`：

```sql
create table document_templates (
  id uuid primary key,
  org_id uuid not null,
  template_name text not null,
  case_type text not null,
  doc_type text not null,
  language text not null default 'ja',
  version_no int not null default 1,
  content_body text not null default '',         -- 现状：全空
  variables_schema jsonb not null default '{}',  -- 现状：全空
  active_flag boolean not null default true,
  ...
);
```

D3 决策：

| 字段 | D2 之前 | D3 起 |
|---|---|---|
| `content_body` | 空字符串 | 不再使用（文本模板不足以承载 docx 排版） |
| **新增** `template_storage_key` | — | 指向 storage 中的 `.docx` 模板原文件，key 规范：`document-templates/<orgId>/<id>/v<n>.docx` |
| **新增** `template_content_hash` | — | sha256，用于检测模板被外部改动 |
| `variables_schema` | `{}` | 必填，对照 [81 — Context Schema v1](./81-spec-document-rendering-context-schema-v1-2026-05-09.md) |

### 2.2 模板格式：DOCX with Handlebars-like placeholders

P1 仅支持 DOCX（决策 **B1=是**，参考 RFC-077 §2.2）。

模板内的占位语法（`docx-templates` 默认）：

```
申請人氏名: {{customer.fullNameKana}}（{{customer.fullName}}）
生年月日:   {{customer.dobJP}}
国籍:       {{customer.nationality}}

扶養者氏名: {{supporter.fullName}}
続柄:       {{supporter.relationToCustomer}}

事務所名:   {{org.officeName}}
行政書士:   {{org.gyoseishoshiName}}（登録番号 {{org.licenseNo}}）

作成日:     {{today.reiwaJP}}
{{#if hasRemarks}}
備考:       {{remarks}}
{{/if}}
```

变量引用必须在 `variables_schema.required` 或 `variables_schema.optional` 中声明（P0 契约：**模板里出现的占位 = schema 里声明的占位**，否则模板不能 publish）。

### 2.3 P1 官方模板覆盖（migration 053–054 已开口、D3 补内容）

> ✏️ **评审 P0-2 / P0-7 / P1-8 修订**：增加 `common`（跨 caseType 共通）类模板；含「委任状」「同意書」「誓約書」等行政書士实务每案必备的 docx。详细矩阵以 [82 §4.1](./82-spec-document-template-governance-2026-05-09.md#41-p1-必备模板矩阵) 为准。

| caseType | 必备 doc_type | 数量 | 备注 |
|---|---|---|---|
| `common`（跨 caseType 共通） | `power_of_attorney`（委任状）/ `personal_info_consent`（個人情報取扱同意書）/ `truth_oath`（申請内容真実性誓約書） | 3 | **每案必备**；行政書士法 §1-2 / 個人情報保護法対応 |
| `dependent_visa`（家族滞在） | `reason_statement`（申請理由書）/ `guarantor_letter`（身元保証書） | 2 | 扶養者の在留資格・続柄が核心 |
| `work`（技人国） | `reason_statement` / `employment_summary`（雇用契約書サマリ）/ `company_overview`（会社概要） | 3 | 雇主企業情報重要 |
| `business_manager`（経営管理） | `reason_statement` / `business_plan`（事業計画書）/ `company_overview` | 3 | 事業計画 + 投資額が審査ポイント |

P1 范围内 **3 个 canonical caseType + common = 4 类 × 合计 11 份官方模板**。详细治理见 [82 — 模板治理规约](./82-spec-document-template-governance-2026-05-09.md)。

> **⚠️ 注意**：以下文書类型**不在 D3 范围**：
>
> - **申請書（入管定式 PDF 表格）** — 在留資格認定証明書交付申請書、変更許可申請書等。入管局发布的定式 PDF 表格强制使用，不能用 docx 模板替代。**P3 单独 RFC**（pdf-lib + AcroForm 字段映射）。
> - **報酬請求書 / 領収書 / 業務報告書** — 行政書士事務所财务文書，涉及インボイス制度（消費税適格請求書）合规。**P2 单独 RFC**。
> - **翻訳証明書** — 戸口本 / 出生証明書 / 婚姻証明書等の日本語訳 + 訳者証明。涉及 OCR + 人工翻訳 + 訳者署名嵌入。**P2 单独 RFC**。
> - **会社設立 / 許認可（建設業 / 古物商 / 産廃 / 飲食店）/ 相続関係手続き** — P2 阶段扩展 caseType 时各加 1 份代表模板。

### 2.4 模板存储与下载

- **存储**：`StorageAdapter`（与 generated_documents 同一适配器），key `document-templates/<orgId>/<id>/v<n>.docx`
- **加载**：worker handler 启动时按 `templateId + templateVersionNoSnapshot` 拉文件到内存（< 1MB / 模板，可全内存处理）
- **缓存**：进程内 LRU，key = `${templateId}:${versionNo}`，TTL 5min（避免 Redis/PG 反复打）

### 2.5 兼容老记录

D2 之前生成的 `generated_documents` 记录有两种状态：

1. `file_url LIKE 'placeholder://%'` — 迁移 056 已清空为 NULL
2. `file_url IS NULL`（占位 stub 上传的空 docx）— D3 不主动重渲染，前端展示「⚠️ 占位文件，请重新导出」徽章 + 重做入口

不做 backfill 渲染（避免风险），让用户主动触发重渲染（业务上更安全）。

---

## 3. L2 — 变量上下文层（核心契约）

### 3.1 RenderContext 类型（TS）

详见 [81 — Context Schema v1](./81-spec-document-rendering-context-schema-v1-2026-05-09.md) 完整字段表。

简略形态：

```ts
type RenderContext = {
  customer: CustomerContext;       // 客户档案：姓名/生年月日/国籍/护照/在留资格/在留期间/地址
  case:     CaseContext;           // 案件：caseNo/caseType/applicationKind/visaType
  supporter?: SupporterContext;    // 扶養者/雇主/役员（按 caseType 选填）
  documents: DocumentRefContext[]; // 资料项摘要（不含文件本身）
  org:      OrgContext;            // 事务所：名称/行政書士姓名/登録番号/地址
  today:    TodayContext;          // 日期：ISO / reiwaJP / westernJP
};
```

### 3.2 上下文构建（renderer.ts，新增）

```ts
async function buildRenderContext(
  tenantDb: TenantDb,
  payload: GeneratedDocExportJobPayload,
): Promise<RenderContext> {
  const [caseRow, customerRow, orgRow, supporterRow, docItems] =
    await Promise.all([
      loadCase(tenantDb, payload.caseId),
      loadCustomerOfCase(tenantDb, payload.caseId),
      loadOrg(tenantDb, payload.orgId),
      loadSupporterOfCase(tenantDb, payload.caseId), // 可能 null
      loadDocumentItemsOfCase(tenantDb, payload.caseId),
    ]);
  return {
    customer: mapCustomer(customerRow),
    case: mapCase(caseRow),
    supporter: supporterRow ? mapSupporter(supporterRow) : undefined,
    documents: docItems.map(mapDocumentRef),
    org: mapOrg(orgRow),
    today: makeToday(new Date()),
  };
}
```

**职责单一原则**：context builder 只读 + 只 map，不做业务校验。校验放到 §3.3 preflight。

### 3.3 Preflight：缺失策略（决策 B2）

业务硬规则：**缺 required 字段 → 拒绝渲染**（不允许打 `——` 占位继续）。

```ts
function preflight(
  ctx: RenderContext,
  schema: VariablesSchema,
): PreflightResult {
  const missing: MissingField[] = [];
  for (const [path, def] of Object.entries(schema)) {
    const value = readPath(ctx, path);
    const applicable = def.applicableWhen
      ? evalCondition(def.applicableWhen, ctx)
      : true;
    if (applicable && def.required && isBlank(value)) {
      missing.push({ path, fixHintI18nKey: def.fixHintKey });
    }
  }
  return missing.length === 0 ? { ok: true } : { ok: false, missing };
}
```

返回 `missing` 时，handler 把 `generated_documents.status` 推到 `export_failed`，并在 timeline 写：

```
generated_document.export_failed
  payload: { reason: "context_preflight", missing: [{path, fixHintI18nKey}, ...] }
```

前端 `CaseFormsTab.vue` 在 `export_failed` 行展开「缺失明细」+ 跳转链接（如「客户档案 → 补护照号」）。

### 3.4 Finalize-time preflight（前移拦截）

仅 worker 时刻 preflight 不够——用户已经按了「定稿 + 导出」才发现失败，UX 倒回去成本高。

D3 同步在 `generatedDocuments.controller.ts:294-330` `finalize()` 内调用 **同一 preflight 函数**：

| 时刻 | 行为 | UX |
|---|---|---|
| Finalize | preflight 失败 → 返回 422 + missing 列表 | 模态框直接显示缺失清单 + 跳转链接 |
| Finalize | preflight 通过 → 状态推到 `final` | 正常 |
| Export | 再跑一次 preflight（防 finalize 后客户档案被改） | 失败则 `export_failed` |

复用同一函数 = **不可能 finalize 通过但 export 失败**，除非中途改了客户/案件数据。

### 3.5 可选字段：`applicableWhen`

某些字段只对特定 caseType 适用：

```jsonc
{
  "supporter.fullName": {
    "required": true,
    "applicableWhen": "case.caseType == 'dependent_visa' || case.caseType == 'work'"
  }
}
```

`applicableWhen` 用最小 DSL（只支持 `==` / `!=` / `&&` / `||` / 字面量）。不引入 jsonata / cel 等大依赖。

---

## 4. L3 — 渲染管线（worker handler 改造）

### 4.1 改造范围（仅 `generatedDocExportHandler.ts`）

```ts
// before（D2 stub）
function renderDocument(_tenantDb, opts, signal): Buffer {
  return opts.outputFormat === "pdf"
    ? buildMinimalPdf(opts.title)
    : buildMinimalDocx(opts.title);
}

// after（D3）
async function renderDocument(
  tenantDb: TenantDb,
  payload: GeneratedDocExportJobPayload,
  signal: AbortSignal,
): Promise<RenderOutcome> {
  if (signal.aborted) throw new Error("Export job timed out");

  // PDF 路径：P1 不支持
  if (payload.outputFormat === "pdf") {
    return { kind: "failed", reason: "pdf_not_supported_p1" };
  }

  // 1. 加载模板（template_storage_key + version_no_snapshot）
  if (!payload.templateId) {
    return { kind: "failed", reason: "no_template_for_d3" };
    // 「无模板草稿」P1 不支持真实渲染（D2 占位也只能给空白，行为一致）
  }
  const tpl = await loadTemplate(
    tenantDb,
    payload.templateId,
    payload.templateVersionNo,
  );
  if (!tpl) return { kind: "failed", reason: "template_not_found" };

  // 2. 构建上下文
  const ctx = await buildRenderContext(tenantDb, payload);

  // 3. preflight（理论上 finalize 已过，这里防中途改数据）
  const pf = preflight(ctx, tpl.variablesSchema);
  if (!pf.ok) return { kind: "failed", reason: "context_preflight", missing: pf.missing };

  // 4. 模板填充（docx-templates）
  const buffer = await fillDocxTemplate(tpl.docxBuffer, ctx, signal);

  // 5. 计算填充率（可观测性）
  const fillRate = computeFillRate(ctx, tpl.variablesSchema);

  return { kind: "ok", buffer, fillRate };
}
```

`handleGeneratedDocExportJob` 主路径：

```ts
const outcome = await renderDocument(tenantDb, payload, signal);
if (outcome.kind === "failed") {
  await markExportFailedWithReason(tenantDb, payload, outcome);
  return;
}
await storageAdapter.upload(storageKey, outcome.buffer, contentType);
await tenantDb.query(
  `update generated_documents set
     status = 'exported',
     file_url = $3,
     fill_rate = $4,
     updated_at = now()
   where id = $1 and org_id = $2`,
  [generatedDocumentId, orgId, storageKey, outcome.fillRate],
);
```

### 4.2 docx-templates 集成

依赖（**RFC-077 §2.4 已批准引入**）：

```json
"dependencies": {
  "docx-templates": "^4.x"
}
```

调用：

```ts
import { createReport } from "docx-templates";

async function fillDocxTemplate(
  templateBuffer: Buffer,
  ctx: RenderContext,
  signal: AbortSignal,
): Promise<Buffer> {
  const out = await createReport({
    template: templateBuffer,
    data: ctx as unknown as Record<string, unknown>,
    cmdDelimiter: ["{{", "}}"],
    failFast: true,
    rejectNullish: false, // 缺失已在 preflight 拦截，这里宽松
    additionalJsContext: {
      formatReiwaDate: (iso: string) => formatReiwa(iso),
      formatJpName: (kana: string, kanji: string) => `${kanji}（${kana}）`,
    },
  });
  if (signal.aborted) throw new Error("Export job timed out");
  return Buffer.from(out);
}
```

### 4.3 失败原因细化

`generated_documents.export_failure_reason`（新列）：

| reason | 含义 | UX |
|---|---|---|
| `pdf_not_supported_p1` | P1 不渲染 PDF | 提示「请改用 DOCX」 |
| `no_template_for_d3` | 选了"无模板草稿" | 提示「请选择官方模板，或等 P2 自定义模板」 |
| `template_not_found` | 模板被删/版本错 | 提示「模板已下架，请选择新版本」 |
| `context_preflight` | 必填字段缺失 | 展开 missing 清单 + 跳转链接 |
| `template_render_error` | docx-templates 抛异常 | 提示「模板语法异常，请联系运营」+ 上报 |
| `timeout` | > JOB_TIMEOUT_MS（120s） | 提示「渲染超时，请重试」 |
| `storage_upload_failed` | 上传失败 | 提示「存储异常，请重试」 |

新增 migration：`059_generated_documents_export_failure_reason.up.sql`

```sql
alter table generated_documents
  add column if not exists export_failure_reason text,
  add column if not exists fill_rate numeric(5, 2);
```

### 4.4 软超时（沿用 RFC-077 §6.2）

`AbortController` 已在 D2 落地，D3 内部所有耗时点（`createReport` / storage upload）都接收 signal。

### 4.5 字体与排版

- DOCX 模板里嵌入的字体（MS Mincho / Yu Gothic 等）由 Word 渲染时本地解析，**服务端不需要字体**
- 不做服务端 PDF 转换（P2），所以无 LibreOffice/wkhtmltopdf 依赖
- 用户在 Word/Pages 打开 docx 自行另存 PDF（行政書士行业惯例）

### 4.6 行政書士印影法律要求（评审 P0-6）

> ✏️ **行政書士法施行規則 §11**：行政書士は業務上作成する書類に職印を押印しなければならない。

P1 实施约束：

- **模板末尾必须留印影位置**：模板 docx 末尾段落形如「行政書士　{{org.gyoseishoshiName}}　印」+ 空白印影占位（约 30mm × 30mm 表格 cell）
- **不在 P1 内嵌印影 PNG**（避免印影管理 / 印鑑証明 / 法务复杂度），但模板审核 §3.1 必查「末尾印影位置占位」
- **admin UX 提示**：export 完成 toast「请在 docx 内自行加盖职印 / 自署后提交」
- **P2 RFC 扩展**：印鑑証明書管理 + 印影 PNG 嵌入

**契約書 / 委任状 / 報告書**等出具給依頼者の文書：除行政書士印影外，依頼者の押印 / 自署位置同样必须留位（在 schema 中通过 `customer.sealRegistrationOrSignature` 表达，详见 [81 §2](./81-spec-document-rendering-context-schema-v1-2026-05-09.md)）。

---

## 5. 数据库迁移

| migration | 作用 |
|---|---|
| `059_generated_documents_export_failure_reason.up.sql` | 新增 `export_failure_reason text`、`fill_rate numeric` |
| `060_document_templates_storage_key.up.sql` | 新增 `template_storage_key text`、`template_content_hash text`；旧 `content_body` 保留兼容（不读） |
| `061_document_templates_publish_state.up.sql` | 新增 `publish_state text default 'draft'`（draft/published/deprecated），见 [82 — 模板治理](./82-spec-document-template-governance-2026-05-09.md) |

每个 `*.up.sql` 必带 `*.down.sql`。

---

## 6. API 变更

| 端点 | 变更 |
|---|---|
| `POST /api/generated-documents/:id/finalize` | **新增 422 响应**，body = `{ code: "GD_PREFLIGHT_FAILED", missing: [...] }` |
| `POST /api/generated-documents/:id/export` | 行为不变，但 preflight 失败时 status 推 `export_failed` 并填 `export_failure_reason` |
| `GET /api/generated-documents/:id` | 响应新增 `exportFailureReason?: string`、`fillRate?: number` |
| `GET /api/document-templates/:id/preview-context-schema` | **新增**：返回该模板的 `variables_schema` 字典，前端用于 finalize-time 展示「字段映射预览」 |

不破坏既有契约，仅增量。

---

## 7. 前端变更

### 7.1 i18n

- `cases.detail.forms.exportFailureReason.{pdf_not_supported_p1, no_template_for_d3, template_not_found, context_preflight, template_render_error, timeout, storage_upload_failed}` × zh-CN / ja-JP / en-US
- `cases.detail.forms.preflightMissing.{customer_fullName, customer_dob, customer_passportNo, ...}` 字段级 fixHint 文案

### 7.2 组件改动

- `CaseFormsTab.vue`：`export_failed` 行展开 missing 清单 + 跳转链接（按 `path` 跳到客户/案件/事务所对应页面 + 字段聚焦）
- `useCaseFormsExportPolling.ts`：拉到 `export_failed` 时同时拉 `exportFailureReason` + `missing`
- `CaseFormFinalizeModal.vue`（新增或扩展）：finalize 前展示「即将填充的变量预览」+「缺失字段警告」，让用户可以在按 Finalize 前自查

### 7.3 timeline builder

`CaseCommsTimelineBuilders.ts` 新增/扩展：

- `generated_document.export_failed`（已存在 builder）追加 `reason` + `missingCount` 文案
- 新增 builder：缺失字段类的 timeline 用「文書导出阻断：{title}（缺 N 项必填）」

---

## 8. 测试策略

### 8.1 单测

| 单测 | 覆盖 |
|---|---|
| `renderer.buildRenderContext.test.ts` | 各 caseType 的 context map（含 supporter null / 多 supporter） |
| `renderer.preflight.test.ts` | required / optional / applicableWhen / 嵌套路径 |
| `renderer.preflight.applicableWhen-dsl.test.ts` | DSL 边界（`==` / `!=` / `&&` / `||`） |
| `renderer.fillDocx.fixture.test.ts` | 用 fixture 模板 + fixture context → 对比输出 docx XML 关键字段（不强制 binary 一致） |
| `generatedDocExportHandler.d3.test.ts` | renderDocument 各 reason 分支 |
| `generatedDocuments.controller.finalize-preflight.test.ts` | finalize 422 响应 + missing payload |

### 8.2 契约测试

- `documentTemplate.publishedTemplate.contract.test.ts`：每个 published 模板必须满足「模板 docx 中所有 `{{path}}` ⊆ variables_schema」（防模板和 schema 漂移）
- `seedDevDocTemplates.contract.test.ts` 扩展：每个 canonical caseType 至少 1 份 `publish_state='published'` 模板（沿 78 §5.2 推进）

### 8.3 集成测试

- `tests/integration-pg/generatedDocExport.d3.pg.test.ts`：完整链路 finalize → export → handler → upload → status=exported；用 in-memory `StorageAdapter`

---

## 9. 可观测性

### 9.1 填充率指标

`generated_documents.fill_rate`（`numeric(5,2)`）= 填充字段数 / required + applicable optional 字段数 × 100。

运营看板：

- 7 日滚动 P50 / P95 / P10
- 按 caseType / templateId 分组，定位「哪份模板的字段最常缺」
- < 95% 时告警（业务上理论上接近 100%，因为 preflight 失败的不会落 exported）

### 9.2 失败原因分布

按 `export_failure_reason` 周聚合，定位运营痛点（如 `template_render_error` 突增 → 某次模板更新有语法错）。

### 9.3 timeline 沉淀

每次 `export_failed` 都写 timeline 一行，便于客服回溯。

---

## 10. 灰度与回退

### 10.1 上线步骤

1. **D3.0**：迁移 059–061 上 prod；模板表 `publish_state` 默认 `draft`
2. **D3.1**：上传 P1 官方模板 7–8 份到 storage（`template_storage_key`）+ schema 入库；publish_state → `published`
3. **D3.2**：renderer.ts 上线（先 dev，再 staging，再 prod 灰度 10% org）
4. **D3.3**：finalize-time preflight 上线（contract.finalize-preflight.test 通过后开闸）
5. **D3.4**：全量 + 退役占位 stub 代码

### 10.2 回退路径

- D3.2 / D3.3 任一阶段灰度失败 → 关闭 feature flag `GD_RENDER_PIPELINE_V3`，handler 回退到 D2 stub（保留 stub 代码 1 个 sprint）
- 模板单独 deprecate：`publish_state='deprecated'`，不影响其他模板

### 10.3 已 exported 的「假成品」处理

D2 阶段产出过若干 `status=exported, file_url=NULL`（占位 stub 上传后被迁移 056 清空）的记录。处理方式：

- 不主动 backfill 重渲染（避免风险）
- 前端显示「⚠️ 该文書由旧版生成，建议重新导出」+ 提供「重新导出」入口
- 后端 `POST /:id/re-export`：复制现记录为新版本（versionNo + 1），重新走 D3 管线

---

## 11. 不做的事（明确边界）

> ✏️ **评审 P0-1 / P1-3 / P1-6 / P1-9 修订**：扩展不做范围 + 明确各项归属阶段（P2 / P3）。

| 项 | 不做的阶段 | 理由 |
|---|---|---|
| **申請書 PDF 自动填表** | **P3 单独 RFC** | 入管局定式 PDF（在留資格認定証明書交付申請書 / 変更許可申請書 / 更新許可申請書 / 永住許可申請書）强制使用样式，不能 docx 替代；需 pdf-lib + AcroForm 字段映射，独立技术栈 |
| PDF 直出（docx → PDF 服务端转换） | **P2** | 行政書士行业 90% 工作流是 docx；引入 LibreOffice/wkhtmltopdf 增加 300-400MB 镜像、字体配置、子进程崩溃风险 |
| 事务所自定义模板上传 | **P2** | schema 漂移风险高，先把官方 11 份打磨稳；P2 加「模板编辑器 + schema linter」 |
| **翻訳証明書**（戸口本 / 出生 / 婚姻証明書 → 日本語訳） | **P2 单独 RFC** | 中国系客户高频需求（事務所収入の 15-25%）；涉及 OCR + 翻訳エンジン + 訳者署名嵌入 |
| **報酬請求書 / 領収書 / 業務報告書** | **P2 单独 RFC** | インボイス制度（2023.10〜消費税適格請求書）合规复杂；行政書士事務所财务工作流；同业 SaaS（freee 行政書士）已支援 |
| **業務帳簿自动生成** | **P3 评估** | 行政書士法 §9 業務帳簿对都道府県行政書士会報告；P1 走人工导出兜底 |
| 印影/落款 PNG 嵌入 | **P2** | 涉及印鑑証明 / 合规审核；P1 文字版「行政書士 印」+ 自行盖印兜底 |
| 多语种模板（zh / en） | **P2** | 行政書士提交对象是日本入管，主交付物是日语；中英对照仅在「申請理由書」实务有需求 |
| **会社設立 / 許認可（建設業 / 古物商 / 産廃 / 飲食店等）/ 相続手続き** | **P2 caseType 扩展** | 行政書士業務範囲に該当するが、P1 は在留資格 3 caseType 集中；P2 阶段各扩 1 份代表模板 |
| 在线模板预览编辑器（web docx editor） | **P2 评估** | 用户在 Word 里改模板更顺，价值不明 |

---

## 12. 评审清单

请逐项确认或反对：

- [ ] **Q1**：D3 仅 DOCX，PDF 走 P2（决策 B1=是）
- [ ] **Q2**：preflight 失败 → 拒绝定稿/拒绝渲染（决策 B2=拦截）
- [ ] **Q3**：P1 不开放事务所自上传模板（决策 B3=否）
- [ ] **Q4**：资料附件不内嵌主文書（决策 B4=否）
- [ ] **Q5**：模板生命周期 = 平台运营 + 法务季度复核（决策 B5=是）
- [ ] **Q6**：模板存 storage（`template_storage_key`），不再使用 `content_body`
- [ ] **Q7**：variables_schema 与模板 docx 通过 contract test 对齐
- [ ] **Q8**：finalize-time 与 export-time 复用同一 preflight 函数
- [ ] **Q9**：feature flag `GD_RENDER_PIPELINE_V3` 控制灰度
- [ ] **Q10**：fill_rate 列入库，运营看板 < 95% 告警

---

## 13. 实施清单（M-tag，不在本 RFC 实施）

| # | 变更 | 文件 |
|---|---|---|
| M1 | 迁移 059（reason + fill_rate） | `migrations/059_*.up.sql` |
| M2 | 迁移 060（template storage_key） | `migrations/060_*.up.sql` |
| M3 | 迁移 061（template publish_state） | `migrations/061_*.up.sql` |
| M4 | renderer.ts（buildContext / preflight / fillDocx） | `modules/core/generated-documents/renderer/*` |
| M5 | handler 改造 | `jobs/handlers/generatedDocExportHandler.ts` |
| M6 | finalize 422 + preflight | `generatedDocuments.controller.ts` |
| M7 | preview-context-schema 端点 | 新增 controller 方法 |
| M8 | i18n 三语 + fixHint | `i18n/messages/cases/{zh,ja,en}.ts` |
| M9 | CaseFormsTab missing 清单 + 跳转 | `CaseFormsTab.vue` |
| M10 | finalize 模态框预览 | `CaseFormFinalizeModal.vue`（新增或扩展） |
| M11 | docx-templates 依赖引入 | `package.json` |
| M12 | 7–8 份官方模板上传 + schema | `seedDevDocTemplates.ts` + storage |
| M13 | 单测 / 契约 / 集成 | 见 §8 |
| M14 | feature flag + 灰度 | env / config |
| M15 | timeline builder + i18n | `CaseCommsTimelineBuilders.ts` |

---

## 14. 引用

- [77-rfc-real-file-generation-2026-05-08.md](./77-rfc-real-file-generation-2026-05-08.md) — D2 队列 / 状态机 / handler 框架
- [78-MCP-docs-forms-walkthrough-2026-05-09-v7.md](./78-MCP-docs-forms-walkthrough-2026-05-09-v7.md) — 症状暴露
- [79-MCP-docs-forms-walkthrough-2026-05-09-v9.md](./79-MCP-docs-forms-walkthrough-2026-05-09-v9.md) — D2 落地回归
- [81-spec-document-rendering-context-schema-v1-2026-05-09.md](./81-spec-document-rendering-context-schema-v1-2026-05-09.md) — Context Schema v1
- [82-spec-document-template-governance-2026-05-09.md](./82-spec-document-template-governance-2026-05-09.md) — 模板治理
- `packages/server/src/modules/core/jobs/handlers/generatedDocExportHandler.ts:156-194` — 占位 stub
- `packages/server/src/modules/core/generated-documents/generatedDocuments.helpers.ts:13-28` — 状态机
- `packages/server/src/infra/db/migrations/048_document_templates.up.sql:6-21` — 模板表
- `packages/server/src/scripts/seedDevDocTemplates.ts` — 模板 seed
