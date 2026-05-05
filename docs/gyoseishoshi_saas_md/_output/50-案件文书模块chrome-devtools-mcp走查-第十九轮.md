# 案件文书模块 chrome-devtools-mcp 走查（第十九轮 / R39 — R38 修复回归 + 新发现）

> 生成日期：2026-05-05
>
> 命题：在第十八轮（R38）之后，仓库陆续合入了 6 项修复（seed `file_url`、placeholder
> 文案对调、finalize/export 透传 `title`、server `language` 接通、docType i18n、
> writes refetch 粒度化）。本轮使用 chrome-devtools-mcp 在运行时**逐条回归 R38 缺陷**，并在
> 真实数据集上识别由这些修复**联动暴露**的次级缺陷。
>
> 工具：chrome-devtools-mcp（list_pages / navigate_page / take_snapshot / click / fill /
> evaluate_script / list_network_requests / get_network_request / take_screenshot /
> list_console_messages）
>
> 数据集：Local Demo Office（admin@local.test / Admin123!）；25 条种子案件，4 类 caseTypeCode：
> `biz_mgmt_cert_4m`（5） / `biz_mgmt_4m`（10） / `biz_mgmt`（6） / `family`（3）；
> 阶段覆盖 S1 / S2 / S4 / S7 / S8 / S9。document_templates 表 15 行（来自 R38 临时 seed
> 脚本残留，详见 R39-B）。

---

## 0. 总结

### 0.1 一句话结论

**R38 的 6 项修复在代码层面全部合入，但其中 3 条「修了等于没修」**：① `seedDocumentFile`
增加了 `file_url` 字段，但 SQL 把同一个 `$1` 同时用作 `uuid`（id 列）与 `text`（占位 URL
拼接），pg 类型推断失败，**整事务回滚 → seed 直接报错退出（R39-B）**；② finalize/export
controller 已透传 `title`，server timeline payload **确实**包含 `"title":"R39-MCP-TITLE-PROBE"`，
但 admin 侧 `CaseLogTab` 经由的 builder 是 **`CaseCommsTimelineBuilders.ts`**（只 emit
`{suffix}`），i18n 模板用的是 `{colonSuffix}` 占位符，UI 渲染仍是「文書確定」「文书定稿」
**冒号都没有**——"colonSuffix" 修复**只改了 dead code `CaseTimelineBuilders.ts`**（R39-C）；
③ server `language` 查询参数已接通，但 admin 总是把 vue-i18n 的 BCP-47 locale
（`zh-CN` / `ja-JP` / `en-US`）原样塞进 query，DB 里所有种子模板都是 `language='ja'`（无
region 后缀），**任何一种 UI 语言下「可用模板」section 都拉不到任何记录**——直接消失
（R39-A，按 i18n 的「真实语义」是 P0，但因为 R39-B 让 dev 本地装机本就拿不到模板，可视
作叠加 P1）。**R38-B（文案对调）/ R38-F（refetch 粒度化）/ R38-G（S9 forms tab readonly
打开）3 条扎实落地，是本轮唯一可记账的"赤字转盈余"。**

### 0.2 走查矩阵（4 个代表性案件 × 3 个 UI locale × 关键节点）

| 案件 | caseTypeCode | businessPhase | locale | 模板 section | 模板下拉 | 提交生成 → 定稿 | timeline 行 |
|---|---|---|---|---|---|---|---|
| **A** R23-AUDIT-TITLE-TEST<br/>`5d38aaac…` | biz_mgmt_cert_4m | S4 / REVIEWING | zh-CN | ❌ R39-A 整 section 不渲染 | ⚠ disabled "尚未配置可选模板" | n/a | n/a |
| **A** 同上 | 同上 | 同上 | ja-JP | ❌ R39-A | ⚠ disabled "テンプレート未設定 — 空の下書きが作成されます" | ✅ POST /generated-documents 201 → ✅ /finalize 201 | ❌ "文書確定" 无 suffix（R39-C） |
| **B** family S1<br/>`baf30979-3d31…` | family | S1 | ja-JP | ❌ R39-A | n/a | n/a | n/a |
| **C** Tani Family Stay<br/>`cafc4ec5…` | family | S9 / CLOSED_SUCCESS | ja-JP | ❌ "利用可能なテンプレートまたは生成記録がありません" | n/a（S9 readonly） | n/a | n/a |
| **D** 5d38aaac 直接 fetch | biz_mgmt_cert_4m | S4 | — | API contract 验证：`?language=ja` → 2 items；`?language=ja-JP / zh-CN / en-US / en / zh / ''(none)` 全为 0（除了 `(none)` = 2） | n/a | n/a | n/a |

✅ = pass / ⚠ = 与设计意图相符但用户感知差 / ❌ = 不可用 / n/a = 类型不适用

### 0.3 R39 缺陷分布

| 等级 | 数量 | 主要分布 |
|---|---|---|
| **P0** | 1 | R39-A（locale code 与 DB language 不匹配 → 模板 section 在所有 UI 语言下完全消失，唯一能看到的是 placeholder URL · P1 落地 chip） |
| **P1** | 2 | R39-B（seed pg 类型推断错误 → fresh dev 拿不到任何模板）/ R39-C（colonSuffix 改对了文件名，但生产链路用的是另一个 builder） |
| **P3** | 1 | R39-D（弹窗 dropdown 在 hasTemplates=false 时仍 disabled，用户「想留空也点不了」——但 modal 本身可以 submit 空模板） |
| **P4** | 1 | R39-E（路由 navigate 到不存在的 caseId 返回 400 而非 404，错误提示只显示「案件 xxx が見つかりません」） |

R38 → R39 PASS 验证（共 6 项目标 + 1 个连带）：

| R38 ID | R38 描述 | R39 验证 |
|---|---|---|
| R38-A | seedDocumentFile 缺 `file_url` | ⚠ 字段加了，**但引入新 SQL bug R39-B**（pg 类型推断），seed 仍然失败 |
| R38-B | placeholder 文案与 templateEmpty 赋反 | ✅ PASS — 三语 i18n 修正完毕 |
| R38-C | finalize/export 不透传 title | ✅ server 已修，但 **R39-C 让 UI 完全感知不到这个修复** |
| R38-D | server `language` 参数被丢弃 | ⚠ server 接通了，**但与 admin 发的 locale code 不匹配 → R39-A**（更严重） |
| R38-E | 模板 meta 露出 raw docType | ✅ adapter 增加 `translateDocType()` + 三语 docType 字典；可视化验证被 R39-A 阻塞 |
| R38-F | 写后 refetch storm（11 条） | ✅ PASS — 现在每次 write 只触发 2 条 GET（forms + timeline），实测 finalize / export / create 全场景一致 |
| R38-G | S9 forms tab disabled | ✅ PASS — S9 案件 forms tab 现在 enabled 且 selected，内容 fallback 到 "利用可能なテンプレートまたは生成記録がありません" |

### 0.4 体系性问题（编译式沉淀）

1. **「修复落点漂移」 — 类似命名的 builder 文件并存**

   - `CaseTimelineBuilders.ts`（242 行）：完整带 `colonSuffix` 的修复版本。
   - `CaseCommsTimelineBuilders.ts`（242 行）：被生产代码 `CaseCommsLogsAdapter.ts:354
     buildCaseTimelineMessageResult()` 真正使用。
   - 两者各自有 21 个 action builder，定义高度相似但互相不引用。
   - R37-E / R38-C 把 `colonSuffix` 加到了前者，i18n key 也升级成 `{colonSuffix}` 占位符；
     但后者只 emit `{suffix}`，导致 vue-i18n 用空字符串填 `{colonSuffix}` → "文書確定" 无冒
     号无 title。
   - 教训：**一个领域的 builder 不应有两份并存**。需要立刻评估：把 `CaseTimelineBuilders.ts`
     合并进 `CaseCommsTimelineBuilders.ts`（或反向），并在 lint 层加 "no-duplicate-action-key
     across files" 规则。

2. **「locale code 与 content language code 概念混用」**

   - admin vue-i18n 用 BCP-47 `<lang>-<region>`（`zh-CN` / `ja-JP` / `en-US`）。
   - DB `document_templates.language` 列存简写 `<lang>`（`ja`）。
   - 这两个不应直接画等号：**UI locale ≠ 模板内容语言**。
   - 行政书士在日本写日本表格，模板内容永远是日文，与用户 UI 语言无关。
   - 三种修复路径（按推荐度）：
     - **B** 默认丢弃 / 不传 `language`（让 server 返回所有），admin 自己按需筛选；
     - A 在 `useCaseFormTemplates` 中把 locale → content language 做归一化（`ja-JP` →
       `ja`，`zh-CN` → `zh`），并约定 server fallback 链（精确匹配 → 语言 base 匹配 → ja
       兜底）；
     - C 在 server 端做 BCP-47 解析 + fallback。
   - 体现规则：**新增 query 参数必须明确"这个值的命名空间是哪一种"**，并在 ADR 留痕。

3. **「seed 是 dev-loop 最脆弱的一环」（R38 已沉淀，本轮**再次**应验）**

   - R38-A 修复加了 `file_url`，但 SQL 写法把 `$1` 用作 `uuid` 与 `text` 两种语义，
     pg 类型推断失败 → 整事务回滚 → 后续 `seedDocumentTemplates` step 永远不执行。
   - 根因：`'placeholder://document-files/' || $1 || '.pdf'` 与 `id` 列的 `$1` 类型推
     断冲突。
   - 修复方向：用显式类型转换 `$1::text`，或把 placeholder URL 用单独的参数传入。
   - **`seedDevData.test.ts` 只检查 source 是否包含 `INSERT INTO document_files` 字符
     串，不真跑 SQL** → 这种 SQL-level bug 完全不可能在 unit test 阶段抓住。建议补一条
     `npm run db:seed-dev:smoke`（在 CI 里跑一次到 DB），或者把 sql 全部改成 prepared
     statement 显式指定 OID。

4. **「fix 验证不能只看代码 diff，必须在浏览器复跑全链路」**

   - R38 报告里说 R37-E 修了，本轮发现：服务器 payload 是对的（`title:
     "R39-MCP-TITLE-PROBE"`），客户端 i18n 模板也对了（`{colonSuffix}`），中间 builder 错
     位 → UI 完全没显示。
   - 单测全绿（CaseTimelineBuilders.test.ts 覆盖了 colonSuffix 行为），但生产链路根本不调
     用那条代码。
   - 教训：**有 mcp 的环境下，每次 P0 修复都应有一次 chrome-devtools-mcp 走查记录入库**。
     这条已经在 R38 §0.4 第 1 条里写过，本轮再次验证其必要性。

5. **「失败的 fix 比没 fix 更危险」**

   - R37 / R38 在文档里都标了 ✅，给项目维护者「已经妥了」的安全感。
   - 实际上 R39 发现 3 条修复"修了等于没修"——而当事人并不知道。
   - 建议：**修复 PR 必须附"如何手工复跑"的 5 步指引**（含 cli 截图或 mcp 步骤），review
     时即便不跑也能让 reviewer 在 30s 内自己复现。

---

## 1. R38 修复回归（PASS / FAIL 项）

### R38-A → R39 ⚠ STILL FAILING（升级为 R39-B）

**修复点**：`packages/server/src/scripts/seedDevData.ts:188-203` 的 `seedDocumentFile`
INSERT 增加 `file_url` 列，写值 `'placeholder://document-files/' || $1 || '.pdf'`。

**问题**：

```text
$ npm run db:seed-dev
> tsx --env-file=.env src/scripts/seedDevData.ts

[seed-dev] failed: [CRITICAL] seed rolled back at step "documentFile":
  inconsistent types deduced for parameter $1
npm error code 1
```

`$1` 同时被解释为 `uuid`（id 列）和 `text`（拼接占位 URL），pg 不允许同一参数双类型。
`main()` 的 step 列表 `documentFile → crossCaseLink → documentChecklistTemplate →
documentTemplates`，**前者 fail 后整 transaction ROLLBACK，document_templates
永远不会落库**。

**为何走查仍能看到 templates**：DB 现存 15 行 `document_templates` 来自 R38 临时
脚本 `seedDocumentTemplatesOnly.ts`（已在 R38 后被删除）残留的数据。新人 `git pull
&& npm run db:seed-dev` 拿到的将是 0 行模板表。

**修复方向**：

```sql
-- 方案 A：显式类型转换
'placeholder://document-files/' || $1::text || '.pdf'

-- 方案 B：用独立参数传 URL
INSERT INTO document_files (..., file_url, ...) VALUES (..., $6, ...)
-- 然后在 params 数组里：[..., `placeholder://document-files/${DOC_FILE_ID}.pdf`, ...]
```

**附带建议**：`seedDevData.test.ts` 只是字符串扫描，根本无法 catch SQL 类型错误；
应该补一个 `db:seed-dev:smoke` CI job（用临时 schema 或事务 + ROLLBACK 收尾），把 R39-B
此类问题挡在合入前。

详见 §2 R39-B 新缺陷。

---

### R38-B → R39 ✅ PASS（placeholder 文案对调）

**验证点**：`packages/admin/src/i18n/messages/cases/zh-CN.ts:608-609`、`ja-JP.ts:629-630`、
`en-US.ts:632-634` 三语 i18n 文案值已对齐：

```text
templatePlaceholder: "请选择模板（可留空创建空白草稿）"  / "テンプレートを選択（空欄で空の下書きを作成）" / "Select a template (leave empty to create a blank draft)"
templateEmpty:       "尚未配置可选模板，将创建无模板草稿" / "テンプレート未設定 — 空の下書きが作成されます" / "No templates configured — a blank draft will be created"
```

**实测**：因 R39-A 让 hasTemplates 永远为 false，弹窗显示的永远是 `templateEmpty`
分支文案"テンプレート未設定 — 空の下書きが作成されます"（语义正确）。`templatePlaceholder`
分支虽然没机会被渲染，但**值本身是对的**——本项目修复完成，仅展示路径暂时被 R39-A 屏蔽。

---

### R38-C → R39 ⚠ HALF-FIXED（升级为 R39-C）

**server 侧修复**：`generatedDocuments.controller.ts:243-248` (finalize) 与 280-286
(export) 已透传 `extra: { title: existing.title }`。

**API 实测**（POST /generated-documents/edd6fa95-…/finalize 之后查 timeline）：

```json
{
  "id": "b4caaba7-65a7-45f7-a00e-05503100146f",
  "action": "generated_document.finalized",
  "payload": {
    "title": "R39-MCP-TITLE-PROBE",
    "generatedDocumentId": "edd6fa95-4480-4e4d-adde-2828d50ff125"
  },
  "createdAt": "2026-05-05T07:15:45.068Z"
}
```

**title 字段正确写入了 payload。** ✅

**UI 实测**（同案件 ?tab=log）：

```text
LA 文書確定                操作ログ・文書・2026/05/05 16:15  ← R39-MCP-TITLE-PROBE 的 finalize
LA 書類生成                操作ログ・文書・2026/05/05 16:15  ← 对应 created
LA 文書エクスポート        操作ログ・文書・2026/05/05 16:12  ← R23 export
LA 文書エクスポート        操作ログ・文書・2026/05/05 14:53
LA 文書確定                操作ログ・文書・2026/05/05 14:53
```

**全部都没有 title 后缀** — 期望应该是「文書確定：R39-MCP-TITLE-PROBE」、「書類生成：
R39-MCP-TITLE-PROBE」。

**根因**：详见 §2 R39-C — `colonSuffix` fix 改在了 `CaseTimelineBuilders.ts`，但
真正运行的是 `CaseCommsTimelineBuilders.ts`（生产 adapter `CaseCommsLogsAdapter.ts:354`
import 的是后者）。

---

### R38-D → R39 ⚠ HALF-FIXED（升级为 R39-A）

**server 侧修复**：

```44:48:packages/server/src/modules/core/document-templates/documentTemplates.controller.ts
type ListQuery = {
  caseType?: unknown;
  language?: unknown;       ← 新增
  includeInactive?: unknown;
};
```

```225:243:packages/server/src/modules/core/document-templates/documentTemplates.service.ts
function buildListWhere(orgId: string, input: { caseType?: string; language?: string; ... }) {
  ...
  if (input.language) {
    params.push(input.language);
    where.push(`language = $${String(params.length)}`);   ← 新增 WHERE
  }
  ...
}
```

✅ server 端 `language` 已正确接通。

**API 实测**（admin token 直接 fetch）：

```javascript
const tests = ['ja','ja-JP','ja-jp','JA','en','en-US','zh','zh-CN','xx',''];
// 结果（caseType=biz_mgmt_cert_4m）：
{
  "ja":     2,    // ✅ 唯一能拿到模板的 query
  "ja-JP":  0,    // ❌ admin 实际发的就是这个
  "ja-jp":  0,
  "JA":     0,
  "en":     0,
  "en-US":  0,    // ❌ admin EN 用户发的
  "zh":     0,
  "zh-CN":  0,    // ❌ admin ZH 用户（默认）发的
  "xx":     0,
  "(none)": 2     // ✅ 不带 language 也能拿到
}
```

**结论**：admin 把 `vue-i18n.locale.value`（`zh-CN` / `ja-JP` / `en-US`）原样塞进 query
（`buildCaseDocumentTemplatesUrl`），DB 模板 `language` 全是 `'ja'`（BCP-47 base
language code），strict 等值匹配永远失败。

**结果**：在所有三种 UI 语言下，「可用模板」section（`v-if="detail.forms.templates.length
> 0"`）从不渲染，**用户只能走"空模板生成草稿"路径**。

详见 §2 R39-A。

---

### R38-E → R39 ✅ PASS（docType i18n 映射）

**验证点**：

```14:24:packages/admin/src/views/cases/model/CaseAdapterDocumentTemplates.ts
const DOC_TYPE_I18N_PREFIX = "cases.detail.forms.docType.";

function translateDocType(docType: string, t?: (key: string) => string): string {
  if (!t) return docType;
  const key = `${DOC_TYPE_I18N_PREFIX}${docType}`;
  const translated = t(key);
  return translated !== key ? translated : docType;
}
```

i18n key 完整：

```text
zh-CN: cases.detail.forms.docType.{business_plan, company_overview, supporting_document, application_form}
       = "事业计划书 / 公司概要书 / 辅助材料 / 申请书"
ja-JP: ".../docType.business_plan" = "事業計画書"
       ".../docType.company_overview" = "会社概要書"
       ".../docType.supporting_document" = "補助資料"
       ".../docType.application_form" = "申請書"
en-US: 同名英文翻译
```

**可视化验证**：因 R39-A 让 templates 列表整段不渲染，无法在 UI 看到 meta 行；但代码与
i18n key 完整、契约测试存在，**本项目修复完成**，仅展示路径被 R39-A 阻塞。

---

### R38-F → R39 ✅ PASS（refetch storm 治理）

**验证点**：`packages/admin/src/views/cases/model/useCaseDetailWriteActions.ts:316/327/338`
三处 form action 都改用 `TAGS_FORMS = { 'forms', 'logEntries' }` 而不是 `TAGS_DETAIL`；
`useCaseDetailModel.ts:193-208 loadTabData` 按 tag 过滤 fetch entries，只调相关 endpoint。

**实测**（chrome-devtools-mcp network log）：

| POST | 201 | 后续 GET 数 | 304 数 | 200 数 |
|---|---|---|---|---|
| `POST /api/generated-documents` | 1 | **2** | 0 | 2（forms / timeline） |
| `POST .../finalize` | 1 | **2** | 0 | 2 |
| `POST .../export` | 1 | **2** | 1 | 1 |

vs. R38 报告的 11 GET（aggregate / document-items / generated-documents /
validation-runs / billing / submission-packages / review-records / communication-logs
/ timeline / tasks / reminders）。

**收益**：R/T 从 ~11×40ms = 440ms 降到 ~2×40ms = 80ms，UX 抖动消失。
**注**：本次新发现 finalize / export 触发的 generated-documents GET 经常是 200 而不是
304，因为状态确实变了（draft → final → exported）；这是符合 ETag 语义的健康表现。

---

### R38-G → R39 ✅ PASS（S9 forms tab readonly 打开）

**验证点**：S9 案件 `cafc4ec5-1020-4423-8a50-ce036789aa1d` (Tani Family Stay,
CLOSED_SUCCESS) 的 tabs 状态：

```javascript
[
  { txt: "概要",        selected: false, disabled: false },
  { txt: "提出前チェック", selected: false, disabled: true  },  // disabled
  { txt: "必要書類 0/0", selected: false, disabled: false },
  { txt: "タスク",       selected: false, disabled: true  },
  { txt: "基本情報",     selected: false, disabled: true  },
  { txt: "文書",         selected: true,  disabled: false },  // ← 现在 enabled 且 default selected
  { txt: "期限",         selected: false, disabled: true  },
  { txt: "請求",         selected: false, disabled: true  },
  { txt: "連絡記録",     selected: false, disabled: true  },
  { txt: "ログ",         selected: false, disabled: false }
]
```

forms tab 内容：

```
文書管理
  利用可能なテンプレートまたは生成記録がありません
```

✅ S9 状态下 forms tab 现在 enabled，渲染 readonly content + empty state（因 R39-A
templates 拉不到 + 该案件本身没有生成文书）。

---

## 2. R39 新发现缺陷

### R39-A · P0 · locale code 与 DB language 不匹配，模板 section 全语言下完全不可见

**现象**（chrome-devtools-mcp 实测）：

| UI locale | API URL | 服务端返回 | 「可用模板」section | 用户体感 |
|---|---|---|---|---|
| zh-CN | `?caseType=biz_mgmt_cert_4m&language=zh-CN` | `{"items":[]}` | 不渲染（v-if 失败） | "新建文书"按钮在，但选模板下拉 disabled，文案「尚未配置可选模板」 |
| ja-JP | `?caseType=biz_mgmt_cert_4m&language=ja-JP` | `{"items":[]}` | 不渲染 | 同上（日文） |
| en-US | `?caseType=biz_mgmt_cert_4m&language=en-US` | `{"items":[]}` | 不渲染 | 同上（英文） |

**API 契约对照（同 token 直接 fetch）**：

```javascript
// caseType=biz_mgmt_cert_4m
{
  "ja":     2,    // ✅ 唯一能拿到模板的 language 值
  "ja-JP":  0,    // ❌ admin zh-CN/ja-JP/en-US locale 全都因此返回 0
  "ja-jp":  0,
  "en":     0,
  "en-US":  0,
  "zh":     0,
  "zh-CN":  0,
  "xx":     0,
  "(none)": 2     // ✅ 不带 language 也行
}
```

**根因（代码）**：

```50:130:packages/admin/src/views/cases/CaseDetailView.vue
const { t, locale } = useI18n();
...
useCaseDetailModel(caseId, {
  ...
  locale,       // ← Ref<'zh-CN' | 'ja-JP' | 'en-US'>
  ...
});
```

```40:43:packages/admin/src/views/cases/model/useCaseFormTemplates.ts
const result = await deps.repo.listDocumentTemplates({
  caseType: ct,
  language: deps.language?.value,    // ← UI locale 原样传入
  ...
});
```

```85:94:packages/admin/src/views/cases/model/CaseAdapterDocumentTemplates.ts
export function buildCaseDocumentTemplatesUrl(
  casesApiPath: string,
  params: { caseType: string; language?: string },
): string {
  const base = `${deriveApiPrefix(casesApiPath)}/document-templates`;
  const qs = new URLSearchParams();
  qs.set("caseType", params.caseType);
  if (params.language) qs.set("language", params.language);   // ← `zh-CN` / `ja-JP` / `en-US`
  return `${base}?${qs.toString()}`;
}
```

```125:139:packages/server/src/modules/core/document-templates/documentTemplates.service.ts
// service.list / buildListWhere 严格等值
if (input.language) {
  params.push(input.language);
  where.push(`language = $${String(params.length)}`);  // language = 'zh-CN' → 0 行
}
```

DB 全部种子模板：

```text
template_name | case_type        | doc_type            | language | version_no
事業計画書    | biz_mgmt_cert_4m | business_plan       | ja       | 1
会社概要      | biz_mgmt_cert_4m | company_overview    | ja       | 1
（其余 13 行同样 language='ja'）
```

**等级**：P0 — admin "文书生成" 在 UI 任一语言下都拉不到任何可选模板，必须强制走"无
模板草稿"。这条直接破坏了 R37-A wiring 修复的全部价值。

**修复方向**（按推荐度）：

1. **B（强烈推荐）** — admin 默认不传 `language`（让 server 返回全语言），让用户自己挑：
   ```typescript
   // 在 CaseAdapterDocumentTemplates.ts 中：
   if (params.language) qs.set("language", params.language);
   //  → 改成：调用方需要按 case 类型 / 用户偏好显式传，而不是默认 = locale
   ```
2. **A** — 在 `useCaseFormTemplates` 把 locale BCP-47 → 语言 base 归一化：
   ```typescript
   const normLang = (deps.language?.value ?? "").split("-")[0] || undefined;
   // 'zh-CN' → 'zh', 'ja-JP' → 'ja', 'en-US' → 'en'
   ```
   （目前 DB 只有 ja，zh / en 仍返回空，但语义正确，不会"装作支持"）
3. C — server fallback：精确匹配为空 → 退到语言 base 匹配 → 退到 ja 兜底；admin 可继续
   传 BCP-47。

**建议同步**：在 ADR 留痕：admin 任何 query 参数都要明确"这个值的命名空间是什么（locale
code? content language? user-preferred? case stored locale?）"，避免再发生同名冲突。

---

### R39-B · P1 · seed `documentFile` step pg 类型推断失败 → 整事务回滚 → templates 永远不落库

**现象**：

```text
$ npm run db:seed-dev
> tsx --env-file=.env src/scripts/seedDevData.ts

[seed-dev] failed: [CRITICAL] seed rolled back at step "documentFile":
  inconsistent types deduced for parameter $1
npm error Lifecycle script `db:seed-dev` failed with error:
npm error code 1
```

**根因（代码）**：

```188:203:packages/server/src/scripts/seedDevData.ts
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
             'placeholder://document-files/' || $1 || '.pdf',     // ← $1 在这里被当 text
             $5,'2027-03-31')
     ON CONFLICT (id) DO NOTHING`,
    [DOC_FILE_ID, SEED_ORG_ID, DOC_ITEM_APPROVED, SEED_USER_ID, DOC_ASSET_ID],
  );
}
```

`$1` 在 `id` 列被推断为 `uuid`，在 `'placeholder://document-files/' || $1 || '.pdf'`
中被推断为 `text`，pg 协议要求一个参数只能有一个 OID → "inconsistent types deduced
for parameter $1"。

**主链路影响**：`main()` step 列表（顺序敏感）：

```text
BEGIN
  → customer
  → cases
  → documentItems
  → documentAsset
  → documentFile          ← FAIL（R39-B）
  → crossCaseLink         ← 不执行
  → documentChecklistTemplate ← 不执行
  → documentTemplates     ← 不执行
ROLLBACK
```

**当前为何能看到 templates**：DB 现存 15 行 `document_templates` 来自 R38 临时
`seedDocumentTemplatesOnly.ts`（已被删除）落下的数据。任何新人 `npm run
db:seed-dev` 都拿不到 templates。

**等级**：P1 — 阻塞 dev/QA 一切关于 documents tab 的本地验证。

**修复方向**：

```sql
-- 方案 A（最小改动）：显式 cast
'placeholder://document-files/' || $1::text || '.pdf'

-- 方案 B（更清晰）：占位 URL 用独立参数
INSERT INTO document_files (..., file_url, ...) VALUES (..., $6, ...);
-- params: [DOC_FILE_ID, ..., `placeholder://document-files/${DOC_FILE_ID}.pdf`]

-- 方案 C：在 INSERT 之外用 trigger / DEFAULT
ALTER TABLE document_files
  ALTER COLUMN file_url SET DEFAULT 'placeholder://document-files/' || gen_random_uuid()::text || '.pdf';
-- 然后 seed 不再 SET file_url
```

**配套建议**：

1. `seedDevData.test.ts` 仅做字符串扫描，无法 catch SQL bug。补一个 `npm run
   db:seed-dev:smoke`（用临时 schema 或 BEGIN + ROLLBACK 包裹整 seed），加进 CI / `npm
   run guard`。
2. 把 `db:seed-dev` 写进 `release/README.md` 的 "fresh-install verify" runbook，要求
   release 出包前必须人肉跑一遍。

---

### R39-C · P1/P2 · timeline `colonSuffix` 修复改在了 dead code 文件，UI 仍然渲染空冒号

**现象**（chrome-devtools-mcp 实测）：

| 时间 | server payload | UI 渲染 |
|---|---|---|
| 16:15:45 | `{"action":"generated_document.finalized","payload":{"title":"R39-MCP-TITLE-PROBE",...}}` | "LA 文書確定 操作ログ・文書・2026/05/05 16:15" ← **冒号都没有，title 完全没出现** |
| 16:15:27 | `{"action":"generated_document.created","payload":{"title":"R39-MCP-TITLE-PROBE","versionNo":2,...}}` | "LA 書類生成 操作ログ・文書・2026/05/05 16:15" |
| 16:12:39 | `{"action":"generated_document.exported","payload":{"title":"R23-AUDIT-TITLE-TEST",...}}` | "LA 文書エクスポート 操作ログ・文書・2026/05/05 16:12" |

`server.payload.title` 是对的；i18n 模板用的是 `{colonSuffix}`：

```1105:1108:packages/admin/src/i18n/messages/cases/ja-JP.ts
generatedDocumentCreated: "書類生成{colonSuffix}",
generatedDocumentUpdated: "書類更新{colonSuffix}",
generatedDocumentFinalized: "文書確定{colonSuffix}",
generatedDocumentExported: "文書エクスポート{colonSuffix}",
```

**根因（代码）**：仓库里有两份 builder，定义高度相似但**只有一份被生产链路使用**：

```text
packages/admin/src/views/cases/model/
├── CaseTimelineBuilders.ts        ← 含 R37-E / R38-C 修复（colonSuffix）
│   - 只被 CaseTimelineBuilders.test.ts import
│   - 实际是 dead code
│
└── CaseCommsTimelineBuilders.ts   ← 生产代码使用
    - 被 CaseCommsLogsAdapter.ts:354 buildCaseTimelineMessageResult() import
    - 只 emit suffix，没有 colonSuffix
```

```202:208:packages/admin/src/views/cases/model/CaseCommsTimelineBuilders.ts
"generated_document.exported": (p) => ({
  key: "cases.log.timeline.generatedDocumentExported",
  params: { suffix: pickFirst(p, ["title", "name"]) },   // ← 只有 suffix
}),
```

```202:208:packages/admin/src/views/cases/model/CaseTimelineBuilders.ts
"generated_document.exported": (p) => ({
  key: "cases.log.timeline.generatedDocumentExported",
  params: {
    suffix: pickSuffix(p, ["title", "templateName"]),
    colonSuffix: formatColonSuffix(pickSuffix(p, ["title", "templateName"])),  // ← 修复在这里
  },
}),
```

vue-i18n 用 `{colonSuffix}` 找 params，找不到 → 空字符串 → "文書確定" 后无任何字符。

**等级**：P1 — admin "操作日志" tab 的核心可读性彻底失效（看不出哪条 finalize 对应哪份
文档）；P2 偏 P1，因为可以用 timestamps + 旁边的 "已生成文书" section row 间接对照，
但用户体验显著退化，且 R37-E / R38-C 两轮修复**给 reviewer 的安全感是错觉**。

**修复方向**：

1. **快速**：把 `CaseCommsTimelineBuilders.ts` 的四条 generated_document.\* builder
   全部加上 `colonSuffix: formatColonSuffix(suffix)`（沿用 `CaseTimelineBuilders.ts` 里
   的 `formatColonSuffix` helper）。
2. **根治**：把两份 builder 合并成一份（推荐保留 `CaseCommsTimelineBuilders.ts`，把
   `CaseTimelineBuilders.ts` 里多余的修复合进来后删掉前者）。
3. **防回归**：lint 规则——禁止两个 file 同时 export 同名 action key。
4. **测试**：补一个 e2e/integration test：post finalize → 拉 timeline → 用 vue-i18n
   `t()` 渲染，断言渲染结果包含 `title`（不止是断言 builder 输出，要测最终字符串）。

---

### R39-D · P3 · 模板下拉在 hasTemplates=false 时整体 disabled，用户「想留空也点不了」

**现象**（chrome-devtools-mcp 实测，因 R39-A 触发）：

```text
书類生成 modal:
  テンプレート [ disabled, value="テンプレート未設定 — 空の下書きが作成されます" ]
                ↓ dropdown 完全不能展开 / 选择
  書類タイトル [R23-AUDIT-TITLE-TEST]
  出力形式     [PDF]
  [キャンセル] [生成]
```

**根因（代码）**：

```119:130:packages/admin/src/views/cases/components/CaseFormGenerateModal.vue
<select
  id="form-gen-templateId"
  ...
  :disabled="!hasTemplates || props.submitting"   // ← hasTemplates=false 整 disabled
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
  ...
```

**评估**：

- 如果用户**确实**想"留空创建草稿"，只需点"生成"按钮——POST `/api/generated-documents`
  body 里 `templateId: null` 是合法的（已实测 201 OK）。
- 但因为 dropdown 整 disabled，UI 给人的视觉是"这个表单不能用"——而实际上 title +
  outputFormat 仍可填写、submit 仍能成功。
- 这是**功能与视觉表述不一致**，会让用户犹豫"我能不能点'生成'按钮"。

**等级**：P3 — 不阻塞功能，仅影响交互可信度。R39-A 修好后，hasTemplates=true 占主导，
本问题影响范围会缩小到"案件类型确实没模板"的边缘情况。

**修复方向**：

```vue
<!-- A：只在 hasTemplates=true 时 disable submit 期间的下拉，否则保持可见但显示"无可选" -->
<select :disabled="props.submitting" :value="localTemplateId ?? ''">
  <option value="">
    {{ hasTemplates ? t('templatePlaceholder') : t('templateEmpty') }}
  </option>
  <option v-for="tpl in resolvedTemplates" :key="tpl.id" :value="tpl.id">
    {{ tpl.name }}
  </option>
</select>

<!-- B：显示 placeholder 文案，但加一行小字"留空也可，将创建无模板草稿" -->
<p class="form-gen-modal__hint">
  {{ t('cases.detail.forms.generateModal.fields.optionalHint') }}
</p>
```

---

### R39-E · P4 · navigate 到不存在的 caseId 返回 400 而不是 404

**现象**（chrome-devtools-mcp 走查中无意触发）：

```text
GET /api/cases/baf30979-1d7e-4cb4-a82d-13b7a99add80/aggregate → 400
（该 caseId 是 R38 报告里写的，但 seed 重跑后 caseId UUID 已变）
```

UI fallback：「案件 baf30979-1d7e-4cb4-a82d-13b7a99add80 が見つかりません [案件一覧に
戻る]」。

**问题**：

- 严格语义上「未找到」应返回 404，400 表示"请求格式不合法"——这个 caseId 是合法 UUID。
- 当前的"案件 xxx が見つかりません"提示是 admin 在 400 时也这么显示，所以**用户体感
  没问题**，但 server / proxy / log 监控会把这种"链接失效"误归类为"客户端错误"。

**根因**：未验证（本次走查未深入），可能是 cases controller 的 ParamPipe
对"valid UUID 但 row 不存在"统一抛 BadRequest 而不是 NotFound。

**等级**：P4 — 不影响 UI 体验，仅监控指标语义偏差。

**修复方向**：在 cases controller `getAggregate` 里把"row 不存在"的分支单独抛 `new
NotFoundException(...)`，或加一个 GD\_\* 风格的错误码（`CASE_NOT_FOUND`）。

---

## 3. Happy-path 网络回路（R39 实测）

| # | 时点 | Method | URL | 状态 |
|---|---|---|---|---|
| 1 | 进入 BMV S4 forms tab (zh-CN) | GET | `/api/cases/:id/aggregate` | 200 |
| 2 | 同上 | GET | `/api/document-items?caseId=:id` | 304 |
| 3 | 同上 | GET | `/api/generated-documents?caseId=:id` | 304 |
| 4 | 同上 | GET | `/api/document-templates?caseType=biz_mgmt_cert_4m&language=zh-CN` | 304 → `{"items":[]}` ❌ R39-A |
| 5 | 切换 ja-JP locale | GET | `/api/document-templates?caseType=biz_mgmt_cert_4m&language=ja-JP` | 200 → `{"items":[]}` ❌ R39-A |
| 6 | 点「文書を生成」（无模板可选） | (无网络) | (modal 打开，dropdown disabled) | — |
| 7 | 改 title 为 R39-MCP-TITLE-PROBE，提交 | POST | `/api/generated-documents` | 201 → `status:"draft", versionNo:2, fileUrl:null` |
| 8 | refetch（R38-F PASS） | GET | `/api/generated-documents?caseId=:id` | 200 |
| 9 | refetch | GET | `/api/timeline?entityType=case&entityId=:id` | 200 |
| 10 | 点「確定」 | POST | `/api/generated-documents/:id/finalize` | 201 → `status:"final", approvedBy/At` |
| 11 | refetch | GET | `/api/generated-documents?caseId=:id` | 200 |
| 12 | refetch | GET | `/api/timeline?...` | 200 → payload `title="R39-MCP-TITLE-PROBE"` ✅ R38-C server PASS |
| 13 | 切换 tab=log，看 timeline | (无网络) | UI 渲染："LA 文書確定 操作ログ・文書・…" ❌ R39-C 无 title |
| 14 | 点「再エクスポート」(R23 旧文档) | POST | `/api/generated-documents/0d710bce-…/export` | 201 |
| 15 | refetch ×2 | GET | generated-documents + timeline | 304 + 200 |

**Console**：0 console error / warning ✅

---

## 4. 截图

| 文件 | 描述 |
|---|---|
| `/tmp/r39-templates-section-empty-zh.png` | BMV S4 forms tab — zh-CN 下「可用模板」section 整段不渲染（R39-A） |
| `/tmp/r39-bmv-templates-section-missing-ja-jp.png` | 同案件 ja-JP locale — 同样不渲染（证明跨 locale 一致性失败） |
| `/tmp/r39-log-tab-empty-suffix-ja.png` | tab=log — "文書エクスポート / 文書確定 / 書類生成" 全部无冒号无 title（R39-C） |
| `/tmp/r39-log-empty-suffix-after-fresh-finalize.png` | 本轮新 finalize（16:15）的 R39-MCP-TITLE-PROBE 仍显示 "文書確定" 空尾巴 — 证明 server 已修但 UI 链路阻塞 |

---

## 5. 后续建议（按优先级）

1. **P0 → R39-A** locale → language 归一化，admin `useCaseFormTemplates` 把
   `vue-i18n.locale` 转成 BCP-47 base（`ja-JP` → `ja`），或直接默认不传 `language`。
   修完之后整段 templates section 立刻可见，R37-A wiring 才真正"长在用户面前"。
2. **P1 → R39-C** 把 `CaseCommsTimelineBuilders.ts` 的 4 条 generated_document.\* builder
   补上 `colonSuffix`，或合并两份 builder 到一份。补 e2e test：finalize → render → assert
   contains title。
3. **P1 → R39-B** seed `documentFile` 的 SQL 用 `$1::text` 显式 cast；新增 `db:seed-dev:smoke`
   CI；写进 release runbook。
4. **P3 → R39-D** 模板下拉在 hasTemplates=false 时仍允许"打开看一眼"，或在下方加文案
   "留空也可，将创建无模板草稿"。
5. **P4 → R39-E** caseId 不存在时返回 404 + 标准错误码（如 `CASE_NOT_FOUND`），便于监控
   分类。

---

## 6. R37 → R38 → R39 修复链路总览

| ID | R37 起点 | R38 修复 | R39 验证 |
|---|---|---|---|
| Wiring | wiring 断 | ✅ hook 接通 | ✅ wiring 仍 OK，但 R39-A 让 templates 拿到 0 |
| Seed file_url | n/a | ⚠ 加了 `file_url`，但 SQL 写法引入 R39-B | ❌ seed 整事务回滚 |
| Placeholder 文案 | "暂无模板..." 模糊 | ✅ 文案对调 | ✅ PASS |
| finalize/export title | 无 | ✅ controller 加 `extra: { title }` | ⚠ server 对了，但 R39-C 让 UI 看不到 |
| server language | 静默丢弃 | ✅ ListQuery 加字段、service WHERE | ⚠ 接通了但 admin 发的 locale 与 DB 不匹配 → R39-A |
| docType i18n | raw 露出 | ✅ adapter `translateDocType` + 三语字典 | ✅ 代码对，可视化被 R39-A 阻塞 |
| Refetch storm | 11 GET / write | ✅ TAGS_FORMS 粒度化 | ✅ PASS（实测 2 GET / write） |
| S9 forms tab | disabled | （未在 R38 修） | ✅ R39 新发现已 enabled + readonly |
| Timeline raw event key | 显示原 key | ✅ i18n 加 4 条 + builder | ⚠ builder 改在 dead code 文件 → R39-C |
| GD\_\* 错误码 | 无映射 | ✅ writeErrors 三语 | ✅ 持续 PASS（本轮未单独探，但 R38 验证基础上无变化） |

---

## 附录 · 走查环境与凭证

- Vite dev server: `http://localhost:5173`
- NestJS server: `PORT=3300`
- PostgreSQL: docker `cms-client-postgres-1` (5433 → 5432)
- 账号：`admin@local.test` / `Admin123!` (Local Demo Office)
- Browser: chrome-devtools-mcp 控制 Chromium
- 走查总用时：约 30 分钟，发起 ~60 条 HTTP 请求（含 happy-path 22 + locale 矩阵探针 10 +
  跨案件切换 ~20 + 初次加载 ~8）
- DB 当前 row 数（`document_templates` = 15，全部 `language='ja'`；`generated_documents`
  = 4，含本轮新增 R39-MCP-TITLE-PROBE）
- 一次性文件操作：本轮**未引入临时 seed 脚本**；为复跑 R39-B 仅尝试 `npm run db:seed-dev`
  并观察 stderr。
- console.error / warning：0 条 ✅

---

## 7. 体系性沉淀（编译式入库候选 — 待回灌到权威文档）

这几条本轮通过实证确认，建议入库到 `docs/gyoseishoshi_saas_md/00-原则与约定/` 下：

1. **「BCP-47 locale 与 content language 是两个命名空间」** — 任何持久化字段叫 `language`
   时，必须明确：是 user UI locale（`zh-CN`）、还是 content language base（`ja`）、还是
   case stored locale。混用必定撞车。
2. **「同领域 builder 不允许双份并存」** — 当 `XxxTimelineBuilders.ts` 与
   `XxxCommsTimelineBuilders.ts` 同时存在时，必有一份是 dead code，且修复者大概率会改错
   文件。需要架构师在 P0 落地前合并到一份。
3. **「seed 出错必须红字打日志且阻塞 commit」** — `[CRITICAL] seed rolled back at step
   "<X>"` 格式已经落地（R38-A 修复时加），但 dev 现在仍可以 ignore 这条 stderr 继续干活。
   建议 `db:seed-dev` 出错时退出码非 0（已经是了）+ 把 `db:seed-dev:smoke` 接进 `npm run
   guard` 链。
4. **「fix 验证不能只看 unit test 绿，必须有 chrome-devtools-mcp 走查记录」** — 这是 R37
   / R38 / R39 三轮共同教训。尤其是涉及 server payload + admin builder + i18n 三层 round-trip
   的修复，单测覆盖一整段都绿，但生产链路仍可能在中间任意一层断掉。建议把 chrome-devtools-mcp
   走查脚本化（每条 P0 修复 PR 必须附 5 步以内的复跑指南）。
