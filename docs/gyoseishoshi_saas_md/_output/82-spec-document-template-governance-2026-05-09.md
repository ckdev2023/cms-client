# SPEC-082: 文書模板治理规约

- **状态**: Draft（待评审）
- **作者**: Agent（D3-template-governance）
- **日期**: 2026-05-09
- **作用**: 定义文書模板的**生命周期 / 审核 / 灰度 / 覆盖率契约 / 退役**规则，作为 P1 阶段官方模板的运营手册
- **引用方**: [80 — D3 渲染管线 RFC](./80-rfc-document-rendering-pipeline-2026-05-09.md)、[81 — Context Schema v1](./81-spec-document-rendering-context-schema-v1-2026-05-09.md)
- **维护权限**: 平台运营 + 法务（详见 §6）
- **不包含**: 事务所自定义模板上传（P2 RFC）

---

## 评审历史

| 版本 | 日期 | 评审/修订记录 | 来源 |
|---|---|---|---|
| v1 | 2026-05-09 | 初稿 | 本文 |
| v1.1 | 2026-05-09 | 行政書士实务对照评审 v1（P0-2 / P0-7 / P1-1 / P1-4 / P1-5 / P1-8 / P1-9） | [83 — 实务评审](./83-AUDIT-gyoseishoshi-practice-review-2026-05-09.md) |

---

## 0. 设计原则

1. **平台先稳官方模板，再开放自定义**：P1 由平台运营维护 11 份官方模板（评审 P1-8 扩展）；P2 才允许事务所"另存为"+ 改名维护
2. **模板 = 内容资产**：和功能代码同等重要，走「草稿 → 审核 → 发布 → 灰度 → 全量 → 退役」生命周期
3. **schema 与模板同生同灭**：published 模板的 docx 占位 ⊆ 该模板 `variables_schema` 字段；CI contract test 校验
4. **版本快照不可变**：published 模板一经引用（`generated_documents.template_version_no` 快照），不再编辑该版本，要改就升 versionNo
5. **范围限定**：本规约仅治理 **docx 模板**；申請書 PDF AcroForm（**P3 单独 RFC**）、財務文書（請求書 / 領収書 — **P2 单独 RFC**）、翻訳証明書（**P2 单独 RFC**）、業務帳簿（**P3 评估**）不在本治理范围（评审 P0-1 / P1-3 / P1-6）
6. **法律责任分担**（评审 P0-7）：平台提供模板素材 + 法务复核；最终文書法律责任在事务所行政書士本人。详见 §10

---

## 1. 模板生命周期状态机

```
       ┌──────────┐    submit     ┌──────────┐    approve   ┌──────────┐
       │  draft   │  ──────────►  │  review  │  ─────────►  │published │
       └──────────┘               └──────────┘              └─────┬────┘
            ▲                          │  reject                  │
            │                          ▼                          │
            └────────── revise ────────┘                           │
                                                                  ▼
                                                           ┌────────────┐
                                                           │ deprecated │
                                                           └────────────┘
```

| 状态 | 含义 | 谁能改 | 可见性 |
|---|---|---|---|
| `draft` | 编辑中，未审核 | 运营 / 法务 | admin 模板管理页（运营角色） |
| `review` | 法务审核中 | 法务 read+sign-off | admin 模板管理页（运营 / 法务） |
| `published` | 已发布，可被新案件选用 | **不可修改** | 全部事务所 admin「生成文書」下拉 |
| `deprecated` | 已退役，不再可选用 | **不可修改** | 已选用的旧案件继续可见，admin 模板管理页加「已退役」徽章 |

### 1.1 数据库存储（迁移 061）

```sql
alter table document_templates
  add column if not exists publish_state text not null default 'draft',
  add column if not exists published_at timestamptz,
  add column if not exists published_by uuid references users(id),
  add column if not exists deprecated_at timestamptz,
  add column if not exists deprecated_reason text;

alter table document_templates
  add constraint document_templates_publish_state_chk
  check (publish_state in ('draft', 'review', 'published', 'deprecated'));

create index if not exists idx_document_templates_publish_state
  on document_templates(org_id, case_type, publish_state, active_flag);
```

### 1.2 与 `active_flag` 的关系

`active_flag` 沿用现有语义：「下拉里是否露出」。`publish_state` 是更精细的生命周期标识。

约束：`publish_state in ('draft', 'review', 'deprecated') ⇒ active_flag = false`（在 trigger / service 层强制）。

### 1.3 模板生命周期 vs 案件文書ライフサイクル — 重要区别（评审 P1-1）

> 行政書士事務所の典型的な業務フロー：①受任 → ②資料収集 → ③**起案 (草稿)** → ④**客户確認**（修正循环 1-N 次）→ ⑤定稿 → ⑥**事務所内決裁** → ⑦印影付与 → ⑧客户最终签字 → ⑨提出
>
> このうち③〜⑨は **案件 phase** であり、**generated_document.status の責任範囲ではない**。

| 階層 | 状態管理対象 | 状態項目 | 文書 |
|---|---|---|---|
| **テンプレート** | `document_templates.publish_state` | draft / review / published / deprecated | 本规约 §1 |
| **個別生成文書** | `generated_documents.status` | draft / final / exporting / exported / export_failed | RFC-080 §0.3 |
| **案件 phase**（含「客户確認」「事務所内決裁」「提出」） | `cases.phase` 等 | S1〜S9（権威定義は 04 流程文档） | 本规约**範囲外** |

「客户確認による修正循环」は generated_documents の **新 versionNo を作成して draft から再開**するパターン；定稿済み（status=`final`）の文書は不可変、修正は新 record。これにより監査追跡（どの版を客户が確認したか）が明確化。

详见 [04 — 核心流程与状态流转](../04-核心流程与状态流转.md) §文書生成・提出（待回灌该章节扩展）。

---

## 2. 版本（versionNo）规则

### 2.1 同一模板"内容修改" = 升 versionNo

不允许编辑已 `published` 的版本。改内容只能：

1. 「另存为新版本」：复制当前 row → versionNo = max(existing) + 1, publish_state = `draft`
2. 走完审核 → `published`
3. 旧版本自动 `deprecated`（默认；可手工取消让 A/B 共存）

### 2.2 旧版本的存续

老案件已经 finalize / exporting / exported 时快照过 `template_version_no`，永远使用快照那个版本（即使已 deprecated）：

```ts
// renderer 加载逻辑
const tpl = await loadTemplate(
  tenantDb,
  templateId,
  templateVersionNoSnapshot,  // 不是 max(versionNo)
);
```

deprecated 版本仍能被加载，**只是不能被新案件选用**。这保证已生成文書的可重渲染（重新导出）行为完全一致。

### 2.3 默认版本选择

`POST /api/generated-documents`（新建草稿）时，未指定 `templateVersionNo` 默认取该模板的「最新 published 版本」（max versionNo where publish_state='published'）。

---

## 3. 审核流程（review gate）

### 3.1 审核维度

> ✏️ **评审 P0-6 / P1-5 修订**：扩展「印影位置占位」「条文版本」「中国系客户处理」三项审核维度。

法务在 `review` 状态需 sign-off 以下：

| 维度 | 检查项 |
|---|---|
| **法律合规** | 文案是否符合最新入管法 / 法务大臣告示；引用条文版本是否过期；`references_law_version` 字段是否更新 |
| **文書格式** | 入管推荐的格式（行間 / フォント / 余白）是否符合 |
| **印影占位**（评审 P0-6） | 模板末尾必须有「行政書士　{{org.gyoseishoshiName}}　印」+ 空白印影位置；委任状 / 契約書类必有依頼者押印 / 自署位置 |
| **占位完备** | 模板 docx 中所有 `{{path}}` 都在 `variables_schema` 中声明 |
| **schema 合理** | required 字段是否过严（导致 90% 案件无法定稿）/ 过松（导致空字段）|
| **三语兼容** | 即使 P1 仅日语，也要确认未来三语模板时占位结构兼容 |
| **政治敏感** | 国名、地名表述（如「中華人民共和国」/「臺灣」/「香港」）符合事務所方针；中国系客户漢字处理是否日漢字統一（簡繁体不混入入管文書）|
| **条文版本追跡**（评审 P1-5） | `document_templates.references_law_version` 必填；引用条文の改正日後 X 月以内なら警告 |

### 3.2 审核工件

每次 `draft → review → published` 必须留:

- **审核单**（Markdown，存 `document_template_review_logs` 新表）：检查清单 + 法务签字 + 时间戳
- **diff**：与上一 published 版本的 docx 文本 diff（用 `pandoc docx → markdown` 后 diff，存 review log）

### 3.3 审核 SLA

| 状态 | SLA |
|---|---|
| draft → review（运营提交后） | 法务在 5 个工作日内开始审 |
| review → published（开始审后） | 平均 3 个工作日 / 最长 10 个工作日 |
| 紧急修复（如条文变更） | 24 小时通道 |

---

## 4. 覆盖率契约（CI 强制）

### 4.1 P1 必备模板矩阵

> ✏️ **评审 P0-2 / P1-8 修订**：增加 `common`（跨 caseType 共通）三件套（委任状 / 個人情報取扱同意書 / 申請内容真実性誓約書）；总数从 7 份扩展到 **11 份**。

| caseType | 必备模板（doc_type） | 至少 N 份 published | 备注 |
|---|---|---|---|
| **`common`（跨 caseType 共通）** | `power_of_attorney`（委任状） | 1 | **每案必备** — 行政書士法 §1-2；依頼者本人押印 / 行政書士事務所控え保管 |
| `common` | `personal_info_consent`（個人情報取扱同意書） | 1 | 個人情報保護法対応 |
| `common` | `truth_oath`（申請内容真実性誓約書） | 1 | 申請者の事実陳述誓約 |
| `dependent_visa`（家族滞在） | `reason_statement`（申請理由書） | 1 | |
| `dependent_visa` | `guarantor_letter`（身元保証書） | 1 | 扶養者署名・押印必須 |
| `work`（技人国） | `reason_statement`（申請理由書） | 1 | |
| `work` | `employment_summary`（雇用契約書サマリ） | 1 | |
| `work` | `company_overview`（会社概要） | 1 | |
| `business_manager`（経営管理） | `reason_statement`（申請理由書） | 1 | |
| `business_manager` | `business_plan`（事業計画書） | 1 | |
| `business_manager` | `company_overview`（会社概要） | 1 | |

合计 P1 至少 **11 份** 官方模板需 published（common × 3 + caseType-specific × 8）。

#### 4.1.1 範囲外（評審 P0-1 / P1-3 / P1-6 / P1-9）

以下 doc_type は本治理範囲外・別 RFC で別途定義：

| doc_type 名前空間 | 範囲 | 移譲先 |
|---|---|---|
| `application_form_*` | 申請書（入管定式 PDF AcroForm） | **P3 単独 RFC**（pdf-lib + AcroForm 字段映射）|
| `translation_certificate_*` | 翻訳証明書（戸口本 / 出生 / 婚姻証明等） | **P2 単独 RFC**（OCR + 翻訳エンジン）|
| `invoice` / `receipt` / `business_report` | 報酬請求書 / 領収書 / 業務報告書 | **P2 単独 RFC**（インボイス制度対応）|
| `business_diary` | 業務帳簿 | **P3 評価**（行政書士法 §9 対応）|
| `company_setup_*` / `permit_*` / `inheritance_*` | 会社設立 / 許認可 / 相続関連 | **P2 caseType 拡張時に各 1 份代表模板** |

### 4.2 contract test

`packages/server/src/scripts/seedDevDocTemplates.contract.test.ts` 扩展：

```ts
test("each canonical caseType has all required published doc_types", async () => {
  for (const [caseType, requiredDocTypes] of REQUIRED_TEMPLATE_MATRIX) {
    for (const docType of requiredDocTypes) {
      const exists = await pool.query(
        `select 1 from document_templates
          where case_type = $1 and doc_type = $2
            and publish_state = 'published' and active_flag = true
          limit 1`,
        [caseType, docType],
      );
      expect(exists.rowCount, `caseType=${caseType} docType=${docType}`).toBe(1);
    }
  }
});
```

CI 跑 `npm run guard` 时此测试必须 green，否则阻断合并。

### 4.3 schema-template 一致性 contract

```ts
test("each published template's docx placeholders ⊆ variables_schema fields", async () => {
  const templates = await pool.query(
    `select id, version_no, template_storage_key, variables_schema
       from document_templates
      where publish_state = 'published'`,
  );
  for (const tpl of templates.rows) {
    const docxBuffer = await storage.download(tpl.template_storage_key);
    const placeholders = extractDocxPlaceholders(docxBuffer); // {{path}} 抽取
    const schemaPaths = new Set(
      Object.keys((tpl.variables_schema as VariablesSchema).fields ?? {}),
    );
    for (const p of placeholders) {
      expect(schemaPaths.has(p), `template=${tpl.id} placeholder=${p}`).toBe(true);
    }
  }
});
```

防止「模板里写了 `{{customer.passportExpiry}}`，但 schema 漏声明 → preflight 不会检查 → 缺值时模板渲染失败」。

### 4.4 schema 字段在 v1 字典内 contract

```ts
test("each schema field is declared in Context Schema v1", async () => {
  const allowedPaths = loadContextSchemaV1Allowlist(); // SPEC-081 §2-§7 派生
  for (const tpl of allTemplates) {
    for (const path of Object.keys(tpl.variables_schema.fields ?? {})) {
      expect(allowedPaths.has(path), `template=${tpl.id} unknown path=${path}`).toBe(true);
    }
  }
});
```

防止模板私自引用未在 SPEC-081 中定义的字段。

---

## 5. 灰度发布

### 5.1 灰度目标

新模板（`draft` → `review` → `published`）灰度跑通 → 全量。

### 5.2 灰度机制

`document_templates.rollout_org_ids text[]`（迁移 062 计划新增，本 RFC 引用）：

| 配置 | 行为 |
|---|---|
| `null` | 全量（默认） |
| `[]` | 仅运营测试 org（admin@local.test）可见 |
| `[org-001, org-002]` | 仅这两个 org 可见 |

下拉过滤逻辑：

```ts
where (rollout_org_ids is null or $orgId = ANY(rollout_org_ids))
```

### 5.3 灰度路径

```
publish 后默认 rollout_org_ids = []（仅 internal）
  ↓ internal smoke 通过
追加 rollout_org_ids += [first 5 paying orgs]
  ↓ 1 sprint 监控（fill_rate / failure_reason 分布）
设 rollout_org_ids = null（全量）
```

---

## 6. 维护职责

| 角色 | 职责 |
|---|---|
| **平台运营** | 模板内容编辑（docx）、schema 编辑、提交审核、灰度推进、退役决策 |
| **法务** | 模板内容法律合规审核、签字、季度复核 |
| **研发** | renderer / mapper / contract test 维护、迁移 |
| **产品** | v1 → v2 schema 升级时机、模板矩阵扩展（如新 caseType） |
| **客服** | 收集事务所反馈（缺字段 / 文案歧义），汇总到运营 |

### 6.1 RACI 矩阵

| 任务 | R | A | C | I |
|---|---|---|---|---|
| 模板内容编辑 | 运营 | 运营 | 法务 | 研发 |
| 模板审核 | 法务 | 法务 | — | 运营 |
| schema 字段新增 | 产品 | 产品 | 运营 / 法务 / 研发 | — |
| 灰度推进 | 运营 | 运营 | 研发 | 法务 |
| 紧急修复 | 法务 + 运营 | 法务 | 研发 | — |

---

## 7. 退役流程

### 7.1 退役触发条件

任一发生：

- 入管法变化使条文过期
- 同一 `(caseType, doc_type)` 有更新版本 published（旧版自动 deprecated，§2.1）
- 长期 `fill_rate` < 80% / failure rate > 10%（运营评估后）

### 7.2 退役步骤

1. `publish_state = 'deprecated'`、`deprecated_at = now()`、`deprecated_reason = 'XXX'`
2. `active_flag = false`（下拉不再露出）
3. 已选用旧版本的案件**不受影响**（见 §2.2）
4. 30 天后清理：把 `template_storage_key` 文件移到 `archive/` 目录（不删除，便于审计）
5. 退役通告：通过 admin 系统设置 banner 通知所有事务所「模板 X 已退役，建议使用 Y 替代」

### 7.3 不可退役条件

- 该版本至少有 1 份 `generated_documents.template_id = X and template_version_no = N` 的记录正在 `exporting` 状态 → 等待完成

---

## 8. 文件存储与 backup

### 8.1 路径规范

```
storage/
├── document-templates/
│   └── <orgId>/
│       └── <templateId>/
│           ├── v1.docx
│           ├── v1.review.md       # 审核单
│           ├── v2.docx
│           ├── v2.review.md
│           └── archive/           # 退役 30 天后移入
│               └── v1.docx
```

### 8.2 backup 与回滚

- 每周全量备份 storage/document-templates/ 到对象存储（P1 用本地拷贝；P2 切 S3）
- 30 天保留期；带审计日志的删除

### 8.3 文書保管期限（评审 P1-4 / 行政書士法 §9）

> 行政書士法 §9 — 行政書士は業務帳簿を備え、業務に関する事項を記載しなければならない。**保存期間 2 年**。

`generated_documents` / `document_templates` に `retention_policy` カラム追加（迁移 064）：

| `retention_policy` 値 | 含义 | 保存期間 | 対象 |
|---|---|---|---|
| `2y` | 業務帳簿類 | 2 年 | 業務報告書 / 領収書 / 受任記録 |
| `5y` | 法人関連文書 | 5 年 | 会社設立関連 / 法人税関連 / 契約書 |
| `7y` | 民事訴訟時効対応 | 7 年 | 高額契約 / 紛争可能性のある業務 |
| `indefinite` | 永続保存 | 無期限 | 委任状原本 / 公証文書 / 戸籍関連 |

保管期限後の処理：

- **不削除**、`storage/archive/<orgId>/<year>/` ディレクトリへ移動
- 案件再開時 / 監査対応時に再アクセス可
- 完全削除前要件：(a) `retention_policy` 期限超過 (b) 顧客同意 (c) 監査・紛争完了 — 三点全部成立必要

```sql
-- migration 064 计划
alter table generated_documents
  add column if not exists retention_policy text not null default '2y'
  check (retention_policy in ('2y', '5y', '7y', 'indefinite'));

alter table document_templates
  add column if not exists default_retention_policy text not null default '2y';
```

---

## 9. P0 阶段不做的事

| 项 | 理由 / 后续路径 |
|---|---|
| 模板在线编辑器（web docx editor） | 复杂度高，运营在 Word 里改更顺；P2 评估 |
| 事务所自定义模板上传 | schema 漂移风险；P2 加「模板 lint」+「schema 编辑器」 |
| 模板 A/B 测试 | 灰度机制可手动 A/B（rollout_org_ids 控制），不做自动分流；P2 数据驱动 |
| 多语种自动翻译 | 行政書士提交对象是日本入管，主交付物日语；P2 |
| 印影 PNG 嵌入 | 涉及印鑑証明合规；P2 RFC |
| 文書水印 / 浮水印 | 合规要求未明确；不做 |

---

## 10. 法律免責 / 責任分担（评审 P0-7）

> **法律根拠**：行政書士法 §1-2（行政書士の作成書類は本人責任）、行政書士法 §10（守秘義務）、民法 §709（過失責任）。

### 10.1 役割と責任

| 主体 | 責任範囲 | 限界 |
|---|---|---|
| **平台（CMS Client）** | (a) 模板素材の整備 + (b) 法务季度复核（§3）+ (c) `references_law_version` 追跡（§3.1） | **テンプレート提供範囲**。最终文書の正確性・適法性は事務所行政書士本人責任 |
| **事務所（行政書士本人）** | (a) 模板使用前の自行確認 + (b) 個別案件への適合性判断 + (c) 最终文書の署名・押印・提出責任（行政書士法 §1-2） | 平台模板の不備・条文古化等で被害が発生した場合、平台に対する求償は「重大な過失」程度に限定 |
| **法務（平台側）** | 季度复核時の合理性審査 | **特定案件の個別審査責任を負わない** |

### 10.2 admin UX 要件

- **首次使用 D3 渲染功能时**，admin 必须勾选「**我理解平台模板仅作参考素材，最终文書の法律責任は本所行政書士本人が負う**」を表示
- 同意ログ → `audit_logs.disclaimer_acknowledged: { userId, orgId, version, acknowledgedAt }`
- 同意未記録の状態では、`POST /api/generated-documents/:id/finalize` を 422 で拒否（`disclaimer_required`）

### 10.3 ToS / 利用規約 への組み込み

平台 ToS の第 X 条「文書テンプレート機能の利用」节に下記を明記：

> 第 X 条 文書テンプレート機能の利用について
>
> 1. 当社（プラットフォーム提供者）は、行政書士事務所での業務効率化のために、入管申請等に係る各種文書テンプレートを参考情報として提供します。
> 2. **当該テンプレートは法律意見書ではなく**、また当社による特定案件への助言を構成するものではありません。
> 3. テンプレート使用により作成される文書の正確性・適法性・適合性については、各行政書士事務所の有資格行政書士が**自己の判断と責任で確認し、署名・押印・提出**するものとします。
> 4. 当社は、入管法等関連法令の改正状況を随時追跡し、テンプレートの適時更新に努めますが、改正の即時反映を保証するものではありません。
> 5. テンプレートに起因する事務所の損害について、当社の故意または重大な過失による場合を除き、責任を負いません。
> 6. 各事務所は、テンプレートを使用する前に、自己の責任において最新の法令・運用ガイドラインとの整合性を確認するものとします。

### 10.4 模板内法律免責文言

P1 必备模板各份の冒頭に以下のフッター（小字）を組み込む（運営側が編集する際の標準テンプレート要件）：

> ※ 本文書は CMS Client（プラットフォーム）の参考テンプレートを基に、〇〇行政書士事務所の有資格行政書士〇〇〇〇が個別案件に応じて作成・確認したものです。最終的な文書の正確性・適法性は本所が責任を持って確認しております。

---

## 11. 评审清单

请逐项确认或反对：

- [ ] **Q1**：P1 仅平台运营维护官方模板（决策 B3=否） — 不开放自上传
- [ ] **Q2**：模板生命周期 `draft / review / published / deprecated` — 状态机 §1
- [ ] **Q3**：published 模板不可编辑，改内容必升 versionNo — §2.1
- [ ] **Q4**：审核需法务 sign-off + 留审核单（含印影占位 / 条文版本 / 中国系处理） — §3
- [ ] **Q5**：CI 强制覆盖率 contract（**11 份必备**，含 common 三件套） — §4.1
- [ ] **Q6**：CI 强制 schema-template 一致性 contract — §4.3
- [ ] **Q7**：CI 强制 schema 字段 ⊆ Context Schema v1 字典 — §4.4
- [ ] **Q8**：rollout_org_ids 控制灰度 — §5
- [ ] **Q9**：退役 30 天后归档（不删除） — §7.2
- [ ] **Q10**：法务季度复核 schema + 模板 + **条文版本** — §6 / §3
- [ ] **Q11**：客户確認 = 案件 phase（不在本规约范围） — §1.3
- [ ] **Q12**：法律免責 / 責任分担明確化 + ToS 第 X 条 + admin 同意 UI — §10
- [ ] **Q13**：保管期限按 retention_policy 区分（業務帳簿 2 年 / 法人 5 年 / 訴訟時効 7 年 / 永続） — §8.3
- [ ] **Q14**：範囲外明確化（申請書 PDF / 翻訳証明 / 財務文書 / 業務帳簿 / 会社設立等） — §0 / §4.1.1

---

## 12. 实施清单（M-tag，不在本 RFC 实施）

| # | 变更 | 文件 |
|---|---|---|
| M1 | 迁移 061（publish_state） | `migrations/061_*.up.sql` |
| M2 | 迁移 062（rollout_org_ids） | `migrations/062_*.up.sql` |
| M3 | 迁移 063（模板审核日志表） | `migrations/063_*.up.sql` |
| M4 | 迁移 064（retention_policy + references_law_version） | `migrations/064_*.up.sql` |
| M5 | service 层 publish_state 状态机校验 | `documentTemplates.service.ts` |
| M6 | admin 模板管理页（运营/法务角色） | `views/settings/templates/` |
| M7 | seedDevDocTemplates 扩展 publish_state + **common 三件套**（评审 P0-2） | `seedDevDocTemplates.ts` |
| M8 | contract test §4.1–§4.4（**11 份矩阵**） | `seedDevDocTemplates.contract.test.ts` 等 |
| M9 | rollout 过滤 SQL | `documentTemplates.queries.ts` |
| M10 | 退役 banner UI | admin shell |
| M11 | 备份脚本（含 retention_policy 归档） | `scripts/backupTemplates.ts` |
| M12 | **disclaimer 同意 UI + audit log**（评审 P0-7） | admin shell + `auditLogs.service.ts` |
| M13 | **ToS 第 X 条 + 法律免責文言**（评审 P0-7） | 利用規約ページ + admin shell |
| M14 | **印影位置占位审核** lint 工具（评审 P0-6） | `scripts/lintTemplate.ts` |
| M15 | **条文版本追跡**（references_law_version 季度报告） | 法務运营手册 |

---

## 13. 引用

- [80-rfc-document-rendering-pipeline-2026-05-09.md](./80-rfc-document-rendering-pipeline-2026-05-09.md) — 渲染管线 RFC（消费方）
- [81-spec-document-rendering-context-schema-v1-2026-05-09.md](./81-spec-document-rendering-context-schema-v1-2026-05-09.md) — Context Schema v1（schema 字段定义来源）
- [78-MCP-docs-forms-walkthrough-2026-05-09-v7.md](./78-MCP-docs-forms-walkthrough-2026-05-09-v7.md) — NEW-V7-5（模板 seed 漂移）
- `packages/server/src/infra/db/migrations/048_document_templates.up.sql` — 模板表
- `packages/server/src/scripts/seedDevDocTemplates.ts` — 现有 seed
- `packages/server/src/scripts/seedDevDocTemplates.contract.test.ts` — 现有契约测试
