# SPEC-081: 文書生成上下文 Schema v1（RenderContext）

- **状态**: Draft（待评审）
- **作者**: Agent（D3-context-schema）
- **日期**: 2026-05-09
- **作用**: 定义文書生成时变量的**唯一权威字典**，作为模板（`document_templates.variables_schema`）与数据（`customers` / `cases` / `organizations` / `case_relations`）之间的**单一合同**
- **引用方**: [80 — D3 渲染管线 RFC](./80-rfc-document-rendering-pipeline-2026-05-09.md)、[82 — 模板治理](./82-spec-document-template-governance-2026-05-09.md)
- **维护权限**: 平台运营 + 法务季度复核（详见 §11）

---

## 评审历史

| 版本 | 日期 | 评审/修订记录 | 来源 |
|---|---|---|---|
| v1 | 2026-05-09 | 初稿 | 本文 |
| v1.1 | 2026-05-09 | 行政書士实务对照评审 v1（P0-3 / P0-4 / P0-5 / P0-8 / P1-2 / P1-7） | [83 — 实务评审](./83-AUDIT-gyoseishoshi-practice-review-2026-05-09.md) |

> **本规约 Schema v1 版本号 = `v1`（与文档版本独立）**。Schema 版本升级规则见 §11。

---

## 0. 设计原则

1. **逻辑路径**：以业务概念命名（`customer.fullName`），不直接引用物理列名（`customers.base_profile.name_full_kanji`）；mapper 在 worker 内做物理 → 逻辑的转换
2. **单一来源**：每个变量必须有**唯一物理来源**；禁止「`customer.fullName` 既可来自 customers.base_profile 也可来自 leads.name」这类多源歧义
3. **强类型**：每条目声明 `type`（`string` / `dateISO` / `number` / `enum<X>`），渲染前由 preflight 校验
4. **可降级**：`required: false` 的字段允许为空；模板用 `{{#if x}}...{{/if}}` 条件渲染；模板里出现的占位 ⊆ schema 声明
5. **本地化**：日期、姓名、地址等都提供本地化变体（`reiwaJP` / `westernYMD` / `kanji` / `kana`），模板按需引用，不在模板内做格式化逻辑
6. **稳定**：v1 字段加而不改；改名/语义变更 → 升 v2，不破坏 v1 模板
7. **不覆盖范围**（评审 P0-1）：本 Schema **不覆盖**入管申請書 PDF AcroForm 字段映射（属于 P3 RFC 单独命名空间），也不覆盖 OCR 抽取字段（P2）

---

## 1. 顶层结构

```ts
type RenderContext = {
  customer:    CustomerContext;       // 客户档案（必有）
  case:        CaseContext;           // 案件信息（必有）
  supporter?:  SupporterContext;      // 扶養者 / 雇主 / 役员（按 caseType 选）
  documents:   DocumentRefContext[];  // 资料项摘要（数组）
  org:         OrgContext;            // 事务所（必有）
  today:       TodayContext;          // 日期（必有）
};
```

---

## 2. `customer.*` — 客户档案

> ✏️ **评审 P0-3 修订**：扩展氏名字段族（漢字 / カナ / 英字 / 在留カード公式記載 / 通称名）。入管申請書類は氏名表記の整合性を厳しく審査するため**单一 fullName 不足够**。

> ✏️ **评审 P0-4 修订**：nationality 値域明確化，特殊处理中国大陸 / 台湾 / 香港 / マカオ 4 区分。

### 2.1 氏名字段族

| 路径 | 类型 | required | 说明 | 物理来源 |
|---|---|---|---|---|
| `customer.fullName` | string | ✅ | 漢字氏名 — 内部表示用（如「王 小明」） | `customers.base_profile.name_full_kanji` |
| `customer.fullNameKana` | string | ❌ | フリガナ（如「ワン シャオミン」） | `customers.base_profile.name_full_kana` |
| `customer.fullNameEn` | string | ✅（在留資格申请类） | **英字綴り — パスポート記載と完全一致**（如「WANG XIAOMING」） | `customers.base_profile.name_full_en` |
| `customer.fullNameOnResidenceCard` | string | ❌（在日時必填） | **在留カード公式記載**（漢字併記がある場合は「漢字（英字）」形式） | `customers.base_profile.name_on_residence_card` |
| `customer.fullNameAlt` | string | ❌ | 通称名（住民票登録の通称等） | `customers.base_profile.name_alt` |
| `customer.familyName` | string | ✅ | 姓（漢字） | `customers.base_profile.family_name` |
| `customer.givenName` | string | ✅ | 名（漢字） | `customers.base_profile.given_name` |
| `customer.familyNameRomaji` | string | ❌ | 姓（パスポート綴り単独） | 派生自 `fullNameEn` |
| `customer.givenNameRomaji` | string | ❌ | 名（パスポート綴り単独） | 派生自 `fullNameEn` |
| `customer.nameScript` | enum<japanese_kanji\|simplified_chinese\|traditional_chinese\|romaji_only> | ❌（派生） | 氏名の文字系統。日本入管文書 = 必ず `japanese_kanji` または `romaji_only`（簡繁体不可） | runtime 推断 |

**数据契约要点**：

- `fullNameEn` 必须**与パスポート完全一致**（含大小写、空格、ハイフン）；不允许任意大小写转换
- 中国系客户漢字 = 日本漢字統一；模板在「氏名（漢字）」「氏名（英字）」并列输出，避免简繁体提交风险
- `fullNameOnResidenceCard` ≠ `fullName` 时（如有在留カード但本人申报漢字略有差异），以 `fullNameOnResidenceCard` 为准

### 2.2 个人基本属性

| 路径 | 类型 | required | 说明 | 物理来源 |
|---|---|---|---|---|
| `customer.dob` | dateISO | ✅ | 生年月日 ISO（YYYY-MM-DD） | `customers.base_profile.dob` |
| `customer.dobReiwaJP` | string | ❌（派生） | 「平成3年5月12日」格式 | runtime 派生 |
| `customer.dobWesternJP` | string | ❌（派生） | 「1991年5月12日」格式 | runtime 派生 |
| `customer.gender` | enum<male\|female\|other\|undisclosed> | ❌ | 性別 | `customers.base_profile.gender` |
| `customer.nationality` | string | ✅ | 国籍コード — 详见 §2.3 | `customers.base_profile.nationality` |
| `customer.nationalityJP` | string | ❌（派生） | 日本入管表記の国名 | runtime mapper |

### 2.3 国籍编码（评审 P0-4）

`customer.nationality` 値域：ISO 3166-1 alpha-2 + 入管特殊区分扩展

| code | 入管表記（`nationalityJP` 派生値） | 备注 |
|---|---|---|
| `CN` | 中華人民共和国 | 中国大陸 |
| `TW` | 台湾 | 入管書類は「台湾」（「中華民国」「中華人民共和国（台湾）」は使わない） |
| `HK` | 中華人民共和国（香港） | パスポート発行国は HKSAR |
| `MO` | 中華人民共和国（マカオ） | パスポート発行国は MSAR |
| `JP` | 日本国 | 日本国籍者（家族滞在の扶養者等） |
| `KR` | 大韓民国 | |
| `US` | アメリカ合衆国 | |
| ... | （ISO 3166-1 alpha-2 通常マッピング） | runtime nationalityMap.ts |

**重要**：`CN/TW/HK/MO` 四区分は**派生 nationalityJP 値が異なる**ため、共通化禁止。中国系客户案件时 mapper 必须严格依照客户档案登録値出力。

### 2.4 在留情報

| 路径 | 类型 | required | 说明 | 物理来源 |
|---|---|---|---|---|
| `customer.passportNo` | string | ✅（在留資格申请类） | パスポート番号 | `customers.base_profile.passport_no`（**PII 高敏 — 详见 §13**）|
| `customer.passportExpiry` | dateISO | ❌ | パスポート有効期限 | `customers.base_profile.passport_expiry` |
| `customer.residenceCardNo` | string | ❌（在日時必填） | 在留カード番号 | `customers.base_profile.residence_card_no`（**PII 高敏**）|
| `customer.statusOfResidence` | string | ❌ | 現在の在留資格（如「家族滞在」） | `customers.base_profile.status_of_residence` |
| `customer.residenceExpiry` | dateISO | ❌ | 在留期限 | `customers.base_profile.residence_expiry` |
| `customer.qualificationOnArrival` | string | ❌ | 初回来日時の在留資格（履歴表示用） | `customers.base_profile.qualification_on_arrival` |

### 2.5 連絡先・住所

| 路径 | 类型 | required | 说明 | 物理来源 |
|---|---|---|---|---|
| `customer.addressJP` | string | ❌（在日時必填） | 日本国内住所 | `customers.base_profile.address_jp` |
| `customer.addressOverseas` | string | ❌ | 海外住所 | `customers.base_profile.address_overseas` |
| `customer.phone` | string | ❌ | 連絡電話 | `customers.contacts[].value` (type=phone) |
| `customer.email` | string | ❌ | 連絡メール | `customers.contacts[].value` (type=email) |

### 2.6 委任関係（評審 P0-2）

| 路径 | 类型 | required | 说明 | 物理来源 |
|---|---|---|---|---|
| `customer.sealRegistrationOrSignature` | enum<seal\|signature> | ❌ | 委任状の押印方式（個人実印 / 自署） | `customers.base_profile.signature_type` |
| `customer.sealRegistrationCertNo` | string | ❌ | 印鑑登録証明書番号（実印使用時） | `customers.base_profile.seal_cert_no`（PII 中敏）|

### 2.7 `applicableWhen` 示例

`customer.passportNo` 仅对在留資格申请类（`case.caseType in [dependent_visa, work, business_manager, ...]`）必填；纯文书生成（如「会社設立同意書」）不要求。schema 在模板侧声明：

```jsonc
"customer.passportNo": {
  "required": true,
  "applicableWhen": "case.caseType != 'company_setup' && case.caseType != 'common'"
}
```

---

## 3. `case.*` — 案件信息

> ✏️ **评审 P1-7 修订**：行政書士实务的「文書作成日 / 申請日 / 提出日」是三个不同语义日期。今 `today.*` 仅作渲染时点兜底。

### 3.1 基本信息

| 路径 | 类型 | required | 说明 | 物理来源 |
|---|---|---|---|---|
| `case.id` | uuid | ✅ | 案件 ID | `cases.id` |
| `case.caseNo` | string | ✅ | 案件编号 `CASE-YYYYMM-NNNN` | `cases.case_no` |
| `case.title` | string | ✅ | 案件标题（用户可编辑） | `cases.title` |
| `case.caseType` | enum<canonical> | ✅ | canonical caseType 编码（`common` / `dependent_visa` / `work` / `business_manager`...） | `cases.case_type_code` |
| `case.caseTypeJP` | string | ❌（派生） | 「家族滞在」/「技術・人文知識・国際業務」 | runtime mapper |
| `case.applicationKind` | enum<new\|change\|renew\|permanent> | ❌ | 申請区分（新規 / 変更 / 更新 / 永住） | `cases.metadata.application_kind` |
| `case.applicationKindJP` | string | ❌（派生） | 「新規」/「在留期間更新」/「在留資格変更」/「永住」 | runtime |
| `case.intendedStatusOfResidence` | string | ❌ | 申請する在留資格（与 caseType 对应的入管枚举） | `cases.metadata.intended_status_of_residence` |
| `case.openedAt` | dateISO | ✅ | 立案日 | `cases.opened_at` |
| `case.dueAt` | dateISO | ❌ | 提交期限 | `cases.due_at` |
| `case.ownerName` | string | ✅ | 主办行政書士姓名（事务所内员工名） | `users.name` (cases.owner_user_id) |

### 3.2 案件日期三者（评审 P1-7）

| 路径 | 类型 | required | 说明 | 物理来源 |
|---|---|---|---|---|
| `case.documentCreationDate` | dateISO | ❌ | **作成日** — 文書作成した日（明示なければ today.iso） | `generated_documents.created_at` |
| `case.applicationDate` | dateISO | ❌ | **申請日** — 入管に申請する予定日 | `cases.metadata.application_date` |
| `case.submissionDate` | dateISO | ❌ | **提出日** — 実際に提出した日 | `cases.metadata.submission_date` |

各模板按需引用：

- 申請理由書 → `documentCreationDate` 或 `today.westernJP`
- 委任状 → `documentCreationDate`（依頼者と行政書士が捺印した日）
- 提出後の業務報告書 → `submissionDate`

### 3.3 委任関係（评审 P0-2）

| 路径 | 类型 | required | 说明 | 物理来源 |
|---|---|---|---|---|
| `case.delegationScope` | string | ❌（委任状必填） | 委任範囲（如「在留資格認定証明書交付申請に関する一切の件」） | `cases.metadata.delegation_scope` |
| `case.delegationStartDate` | dateISO | ❌（委任状必填） | 委任開始日 | `cases.metadata.delegation_start_date` |
| `case.delegationEndDate` | dateISO | ❌ | 委任終了日（明示なければ案件 closed 時） | `cases.metadata.delegation_end_date` |

---

## 4. `supporter.*` — 扶養者 / 雇主 / 役员（条件可选）

`supporter` 字段语义随 `case.caseType` 不同而不同。**变量名不变，业务含义按 caseType 解读**——这是为了让模板的占位语法保持简洁（不需要 `{{#if dependent}}supporter1{{else}}employer{{/if}}`）。

| caseType | supporter 含义 |
|---|---|
| `dependent_visa`（家族滞在） | 扶養者（夫/妻/親） |
| `work`（技人国） | 雇主公司代表 + 雇主公司（合并入字段） |
| `business_manager`（経営管理） | 共同経営者 / 投資者代表 |
| 其他 | undefined |

### 4.1 字段表

> ✏️ **评审 P1-2 修订**：在日扶養者の `statusOfResidence` 必填，applicableWhen=「supporter 存在 + supporter 在日」；家族滞在許可審査で扶養者の在留資格・在留期限は核心審査項目。

| 路径 | 类型 | required | 说明 |
|---|---|---|---|
| `supporter.fullName` | string | ✅（applicable 时） | 姓名（漢字） |
| `supporter.fullNameKana` | string | ❌ | フリガナ |
| `supporter.fullNameEn` | string | ❌（外国籍 supporter 必填） | 英字綴り |
| `supporter.relationToCustomer` | enum<spouse\|parent\|child\|employer\|partner\|other> | ✅（applicable 时） | 与客户关系 |
| `supporter.relationToCustomerJP` | string | ❌（派生） | 「夫」/「妻」/「父」/「母」/「雇用者」 |
| `supporter.dob` | dateISO | ❌ | 生年月日 |
| `supporter.nationality` | string | ❌ | 国籍（详见 §2.3） |
| `supporter.statusOfResidence` | string | **✅** （applicableWhen 在日 supporter 时） | **在留資格 — 家族滞在審査の核心**（如「永住者」「日本人配偶者等」「経営・管理」「技術・人文知識・国際業務」） |
| `supporter.residenceExpiry` | dateISO | **✅** （applicableWhen 在日 + 永住以外） | 在留期限 |
| `supporter.addressJP` | string | ❌（在日支援者必填） | 日本国内住所 |
| `supporter.phone` | string | ❌ | 連絡電話 |
| `supporter.email` | string | ❌ | 連絡メール |
| `supporter.employer.companyName` | string | ❌（雇主时必填） | 勤務先（雇主时为本人公司） |
| `supporter.employer.position` | string | ❌ | 職位 |
| `supporter.employer.annualIncomeJpy` | number | ❌ | 年収（円） |
| `supporter.employer.companyAddressJP` | string | ❌（雇主时必填） | 勤務先住所 |
| `supporter.employer.companyRegistrationNo` | string | ❌（経営管理类必填） | 法人番号 |

### 4.2 多 supporter

P1 仅支持 1 个 supporter（覆盖 90% 场景：家族滞在的扶養者就 1 个，技人国的雇主就 1 家）。多 supporter 的场景（如「父 + 母 双扶養者」）走「申請理由書」自由文本兜底，P2 RFC 决策是否扩展为数组。

物理来源：`case_relations` 表（`role_code in [spouse, parent, employer, partner]`），mapper 选 `is_primary=true` 那条。

---

## 5. `documents.*` — 资料项摘要（数组）

每条对应 `document_items`（资料登记清单）的一项。模板里典型用 `{{#each documents}}...{{/each}}` 渲染附件清单。

| 路径 | 类型 | 说明 | 物理来源 |
|---|---|---|---|
| `documents[].name` | string | 资料名称（如「在留カード（写し）」） | `document_items.checklist_item_name` |
| `documents[].nameJP` | string | 同上日语别名 | `document_items.checklist_item_name_ja`（如有） |
| `documents[].providedByRoleJP` | string | 「主申請人」/「事務所内部」/「扶養者提供」 | `document_items.provided_by_role` 派生 |
| `documents[].status` | enum<待提交\|已上传待审核\|已通过\|已退回\|無需提供> | 状态 | `document_items.status` 派生（i18n） |
| `documents[].submittedAt` | dateISO | 上传日 | `document_files.uploaded_at`（取最新） |
| `documents[].pageCount` | number? | 页数（如能识别） | `document_files.page_count` |

### 5.1 派生：`hasDocs` / `docsCount`

为模板条件渲染方便：

| 路径 | 派生 |
|---|---|
| `hasDocs` | `documents.length > 0` |
| `docsCount` | `documents.length` |
| `docsCountByStatus.approved` | `documents.filter(d => d.status === '已通过').length` |

---

## 6. `org.*` — 事务所信息

| 路径 | 类型 | required | 说明 | 物理来源 |
|---|---|---|---|---|
| `org.officeName` | string | ✅ | 事務所名（「○○行政書士事務所」） | `organizations.name` |
| `org.officeNameKana` | string | ❌ | フリガナ | `organizations.settings.office_name_kana` |
| `org.gyoseishoshiName` | string | ✅ | 行政書士姓名 | `organization_settings.gyoseishoshi_name` |
| `org.licenseNo` | string | ✅ | 行政書士登録番号 | `organization_settings.license_no` |
| `org.affiliateOrg` | string | ❌ | 所属（都道府県行政書士会） | `organization_settings.affiliate_org` |
| `org.officeAddressJP` | string | ✅ | 事務所住所 | `organization_settings.office_address_jp` |
| `org.officePhone` | string | ✅ | 事務所電話 | `organization_settings.office_phone` |
| `org.officeEmail` | string | ❌ | 事務所メール | `organization_settings.office_email` |
| `org.officeFax` | string | ❌ | FAX 番号 | `organization_settings.office_fax` |
| `org.sealImageUrl` | string | ❌（P2） | 印影 PNG URL | P2 |

### 6.1 P1 注意 — 行政書士印影は法律要求（评审 P0-6）

**行政書士法施行規則 §11**：行政書士は業務上作成する書類に職印を押印しなければならない。

P1 实施约束：

- 不嵌入印影 PNG 图片；模板只渲染**文字版落款**（事務所名 + 行政書士姓名 + 登録番号 + 住所 + 電話）+ 末尾「行政書士　{{org.gyoseishoshiName}}　印」+ 空白印影位置占位
- export 完成 toast 提示「请在 docx 内自行加盖职印 / 自署后提交」
- P2 RFC 加印鑑証明書管理 + 印影 PNG 嵌入

事务所首次使用 D3 渲染功能时，必须先在「系统设置 → 事務所基本情報」补全 `gyoseishoshiName` / `licenseNo` / `officeAddressJP` / `officePhone` 四项；否则任何模板的 finalize 都会被 preflight 拦下。

---

## 7. `today.*` — 日期上下文

| 路径 | 类型 | 说明 |
|---|---|---|
| `today.iso` | dateISO | 渲染时的 ISO 日期（YYYY-MM-DD，JST 时区） |
| `today.westernJP` | string | 「2026年5月9日」 |
| `today.reiwaJP` | string | 「令和8年5月9日」 |
| `today.year` | number | 2026 |
| `today.month` | number | 5 |
| `today.day` | number | 9 |
| `today.weekdayJP` | string | 「金曜日」 |

> 渲染时间戳以 worker 处理任务的瞬时为准（不是 finalize 时刻）。这是为了避免「finalize 跨日导致 today 字段早一天」的歧义。

---

## 8. JSON Schema 形态（`document_templates.variables_schema`）

每个模板的 `variables_schema` jsonb 列存储该模板**实际使用的变量子集**，结构：

```jsonc
{
  "version": "v1",
  "fields": {
    "customer.fullName":        { "required": true, "type": "string" },
    "customer.fullNameKana":    { "required": false, "type": "string" },
    "customer.dobReiwaJP":      { "required": true, "type": "string" },
    "customer.nationality":     { "required": true, "type": "string" },
    "customer.passportNo":      { "required": true, "type": "string" },

    "case.caseTypeJP":          { "required": true, "type": "string" },
    "case.applicationKindJP":   { "required": true, "type": "string" },

    "supporter.fullName":       {
      "required": true,
      "type": "string",
      "applicableWhen": "case.caseType == 'dependent_visa' || case.caseType == 'work'"
    },
    "supporter.relationToCustomerJP": {
      "required": true,
      "type": "string",
      "applicableWhen": "case.caseType == 'dependent_visa'"
    },

    "org.officeName":           { "required": true, "type": "string" },
    "org.gyoseishoshiName":     { "required": true, "type": "string" },
    "org.licenseNo":            { "required": true, "type": "string" },
    "org.officeAddressJP":      { "required": true, "type": "string" },
    "org.officePhone":          { "required": true, "type": "string" },

    "today.reiwaJP":            { "required": true, "type": "string" }
  }
}
```

### 8.1 字段定义类型

```ts
type FieldDef = {
  required: boolean;
  type: "string" | "dateISO" | "number" | "enum";
  enum?: string[];                 // type=enum 时
  applicableWhen?: string;         // 简化 DSL（==、!=、&&、||）
  fixHintKey?: string;             // 缺失时的 i18n 提示 key
  description?: string;            // 文档化用（运营维护）
};
```

### 8.2 `applicableWhen` DSL（最小集）

仅支持以下原语，禁止其他：

```ebnf
expr     = orExpr ;
orExpr   = andExpr { "||" andExpr } ;
andExpr  = cmp { "&&" cmp } ;
cmp      = ident op literal | ident op ident ;
op       = "==" | "!=" ;
ident    = ?: a-zA-Z_.0-9 ;
literal  = "'" any "'"
         | "true" | "false"
         | number ;
```

> 不引入 jsonata、cel、handlebars 等 DSL；自实现 < 50 行。

### 8.3 字段路径里的转义

变量名不允许含 `.` / `[` / `]`（保留给路径分隔与数组索引）。如新增字段名含特殊符号，上 v2 schema 时讨论。

---

## 9. 缺失策略与提示文案

### 9.1 决策（与 RFC-080 §3.3 一致）

```
preflight 失败 → status=export_failed + missing 清单 → finalize 阶段就提示
```

不允许「打 `——` 占位继续渲染」。

### 9.2 fixHintKey 命名约定

`cases.detail.forms.preflight.fix.<flatPath>`

例：

| missing 路径 | i18n key |
|---|---|
| `customer.passportNo` | `cases.detail.forms.preflight.fix.customer_passportNo` |
| `org.licenseNo` | `cases.detail.forms.preflight.fix.org_licenseNo` |
| `supporter.fullName` | `cases.detail.forms.preflight.fix.supporter_fullName` |

文案三语模板（zh-CN / ja-JP / en-US）：

```ts
{
  "cases.detail.forms.preflight.fix.customer_passportNo": {
    "zh-CN": "请到「客户档案」补充护照号",
    "ja-JP": "「お客様情報」でパスポート番号を入力してください",
    "en-US": "Please fill in passport number in customer profile"
  }
}
```

每条 fixHint 同时声明跳转目标（admin 路由 + 字段聚焦 hash），由前端 `CaseFormsTab.vue` 的 missing 清单组件解析。

### 9.3 跳转目标约定

| 路径前缀 | 跳转目标 |
|---|---|
| `customer.*` | `/customers/<id>?focus=<fieldName>` |
| `case.*` | `/cases/<id>?focus=<fieldName>` |
| `supporter.*` | `/cases/<id>/relations?focus=<fieldName>` |
| `org.*` | `/settings/organization?focus=<fieldName>` |
| `documents.*` | `/cases/<id>?tab=documents` |

---

## 10. 派生字段（runtime mapper）

某些字段不是数据库直存，而是 mapper 派生：

| 派生字段 | 派生逻辑 |
|---|---|
| `customer.dobReiwaJP` | `formatReiwa(customer.dob)` |
| `customer.dobWesternJP` | `${y}年${m}月${d}日` |
| `customer.nationalityJP` | ISO alpha-2 → 日语国名映射表（`shared/nationalityMap.ts`） |
| `case.caseTypeJP` | 反查 `BUSINESS_TYPE_TO_CASE_TYPE_CODE` |
| `case.applicationKindJP` | 枚举映射（`new` → 「新規」） |
| `today.*` | `new Date()` JST 派生 |
| `documents[].providedByRoleJP` | `provided_by_role` → 「主申請人 / 事務所内部 / 扶養者提供」 |
| `documents[].status`（i18n） | `status` → 「待提交 / 已上传待审核 / …」 |

派生字段统一在 `renderer/derive/*.ts` 实现，单测覆盖。

---

## 11. `narrative.*` — 叙述性字段族（评审 P0-5）

> 申請理由書、陳述書、業務報告書等叙述性文書の核心 — **申請内容の個別事情説明**。
>
> P1 不开放事务所自定义字段，但 narrative 是行政書士起案后**人工再编辑入口**：渲染前に admin UI で free text 入力 → render context に注入 → 模板内 `{{narrative.applicationReason}}` 等で参照。

### 11.1 字段表

| 路径 | 类型 | required | 说明 |
|---|---|---|---|
| `narrative.applicationReason` | string | ❌ | **申請理由 free text** — 申請理由書の核心。書き慣れた行政書士が docx で書き換える代わりに、admin UI で先入力 |
| `narrative.familyBackground` | string | ❌ | 家族構成 / 関係性叙述（家族滞在 / 結婚ビザ） |
| `narrative.businessPlan` | string | ❌ | 事業計画 / 経営方針叙述（経営管理） |
| `narrative.employmentBackground` | string | ❌ | 職務経歴・職務内容叙述（技人国） |
| `narrative.additionalRemarks` | string | ❌ | 補足事項 / 備考 |

### 11.2 入力 UI 要件

- admin `CaseFormFinalizeModal`（finalize 前）に narrative 入力フィールドを表示
- 各 fields は**多行 textarea**（80 文字 × 30 行程度の上限）
- 入力済み内容は `generated_documents.narrative_payload` jsonb に保存（renderer 加载時に context へ注入）
- 入力ガイダンス：「個別事情を 50-200 字で具体的に」（i18n key: `cases.detail.forms.narrative.guidance`）

### 11.3 渲染时の使い方（模板側）

```
申請理由：
{{#if narrative.applicationReason}}
{{narrative.applicationReason}}
{{else}}
（記入なし）
{{/if}}
```

`narrative.*` は全て **optional**（preflight で blocking しない）；ただし「申請理由書」类模板の `variables_schema` で `narrative.applicationReason: required: true` を宣言すれば、それは preflight 必填化される。

### 11.4 マイグレーション

```sql
-- 064 migration（D3 と同期）
alter table generated_documents
  add column if not exists narrative_payload jsonb not null default '{}'::jsonb;
```

---

## 12. 维护流程

### 11.1 谁能改

- **运营**：可改 fixHint 文案（i18n 三语）
- **法务**：可对 schema 字段提出新增/弃用提案
- **研发**：实现 mapper / 派生 / 校验
- **产品**：拍板 v1 → v2 升级时机

### 11.2 v1 → v2 升级条件

任一发生即升 v2：

- 已存在字段语义变更
- 字段重命名
- `applicableWhen` 默认行为变更
- 缺失策略变化（拦截 → 占位）

升 v2 时：

- 旧 `variables_schema.version: "v1"` 模板继续工作（renderer 兼容 1 个 sprint）
- 新模板必须 `version: "v2"`
- 退役 v1 时：发邮件通知所有事务所 + admin 看板提示，1 个月后下线

### 11.3 季度复核清单

每季度运营 + 法务复核以下：

- [ ] 入管要求是否变化（如新增「健康保険証」必填）
- [ ] schema 中是否有 6 个月以上未被任何模板引用的字段（候选弃用）
- [ ] missing 报表 Top10 字段是否提示 mapper 缺源（部分 customer 的 passport_no 总是空）
- [ ] 三语 fixHint 是否仍准确

---

## 13. 单测覆盖（最小集）

| 单测 | 覆盖 |
|---|---|
| `mapCustomer.test.ts` | 各字段映射 / 缺失字段返回 undefined（不抛） |
| `mapCase.test.ts` | caseType 反查 / applicationKind 派生 |
| `mapSupporter.test.ts` | 各 caseType 下 supporter 含义切换 |
| `mapOrg.test.ts` | organization_settings 缺失时降级 |
| `derive.dobReiwaJP.test.ts` | 平成 / 令和 / 昭和 边界 |
| `derive.nationalityJP.test.ts` | 主流国家映射 + 缺失时回退 ISO |
| `applicableWhen.dsl.test.ts` | DSL parse + eval 边界 |
| `preflight.test.ts` | required + applicableWhen + 嵌套路径 |
| `schema.contract.test.ts` | 全局：每个 published 模板的 schema 字段 ⊆ 本规约定义 |

---

## 14. PII 字段级权限分类（评审 P0-8）

> **法律根拠**：個人情報保護法 §3（必要最小限の取扱）+ 行政書士法 §10（守秘義務）。行政書士事務所内 staff 区分（owner / 主任行政書士 / 補助者 / 一般事務員）に対する PII アクセス制御要求。

### 15.1 分级定义

| Tier | 含义 | 默认可见角色 | 访问审计 |
|---|---|---|---|
| **高敏（HIGH）** | パスポート / 在留カード / 印鑑登録 / 戸籍関連 — 流出時の被害が重大 | `owner`、`gyoseishoshi_principal`（主任行政書士） | 必須（每次访问入 audit_log） |
| **中敏（MEDIUM）** | 生年月日 / 国籍 / 住所 / 連絡先 / 配偶者・家族情報 / 雇用情報 | 上記 + `gyoseishoshi_helper`（補助者）、`staff`（事務員） | 渲染产物时入 audit_log（不每次访问） |
| **低敏（LOW）** | 姓名（漢字） / 案件番号 / 案件タイプ / 事務所情報 / 日付 | 全 staff | 不审计（聚合统计可） |

### 15.2 字段分级表

| 字段路径 | 分级 |
|---|---|
| `customer.passportNo` / `customer.passportExpiry` | **HIGH** |
| `customer.residenceCardNo` / `customer.residenceExpiry` | **HIGH** |
| `customer.sealRegistrationCertNo` | **HIGH** |
| `customer.familyName` / `customer.givenName` / `customer.fullName*` | **LOW**（姓名そのものは低敏 — 業務必須） |
| `customer.dob` / `customer.dobReiwaJP` | **MEDIUM** |
| `customer.nationality` / `customer.gender` | **MEDIUM** |
| `customer.statusOfResidence` / `customer.qualificationOnArrival` | **MEDIUM** |
| `customer.addressJP` / `customer.addressOverseas` | **MEDIUM** |
| `customer.phone` / `customer.email` | **MEDIUM** |
| `supporter.passportNo` / `supporter.residenceCardNo`（将来） | **HIGH** |
| `supporter.statusOfResidence` / `supporter.dob` / `supporter.addressJP` | **MEDIUM** |
| `supporter.fullName*` / `supporter.relationToCustomer` | **LOW** |
| `case.*` 全部 | **LOW** |
| `org.*` 全部 | **LOW** |
| `today.*` 全部 | **LOW** |
| `narrative.*` 全部 | **MEDIUM**（個別事情含むため） |

### 15.3 实施约束

- `users.role` 已存在；新增 `users.can_view_high_pii: boolean`（默认 `false`，仅 owner / 主任行政書士 = `true`）
- renderer 在 `buildRenderContext` 中按 `ctx.user.can_view_high_pii` 决定是否填入 HIGH 字段
- HIGH 缺失时 preflight 抛 `pii_access_denied`，UI 提示「該当文書には高敏 PII フィールドが含まれます。所属の行政書士本人または主任行政書士による起案が必要です」
- audit_logs 拡展 `accessed_fields: text[]`（HIGH / MEDIUM 訪問時に記録）

### 15.4 例外

- 法令調査・監査対応：行政書士会 / 法務局 / 入管局からの正式調査要求時、`override_reason` 必須記入で一時的に HIGH を可視化（audit_logs に詳細記録）

---

## 15. 与既有代码的对应关系

| 本规约字段 | 现有代码位置 |
|---|---|
| `customer.*` 映射器 | 计划在 `packages/server/src/modules/core/generated-documents/renderer/mapCustomer.ts`（新增） |
| `case.caseTypeJP` 反查 | 复用 `packages/admin/src/i18n/messages/_shared/businessTypes.ts` 的 `BUSINESS_TYPE_TO_CASE_TYPE_CODE`（共享到 server） |
| `org.*` 映射器 | 新增 `mapOrg.ts`，从 `organizations` + `organization_settings`（迁移 010 / 011 引入） |
| `supporter.*` 映射器 | 新增 `mapSupporter.ts`，从 `case_relations` + `customers`（关联人） |
| `today.*` | `makeToday.ts`（JST 派生） |

---

## 16. 引用

- [80-rfc-document-rendering-pipeline-2026-05-09.md](./80-rfc-document-rendering-pipeline-2026-05-09.md) — 渲染管线 RFC（消费方）
- [82-spec-document-template-governance-2026-05-09.md](./82-spec-document-template-governance-2026-05-09.md) — 模板治理（schema 审核流程）
- `packages/server/src/infra/db/migrations/001_init.sql:30-52` — `customers` / `cases` 物理表
- `packages/server/src/infra/db/migrations/048_document_templates.up.sql:14-15` — `content_body` / `variables_schema` 列
- `packages/admin/src/i18n/messages/_shared/businessTypes.ts` — caseType 编码反查映射
