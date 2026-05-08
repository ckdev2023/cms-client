# AUDIT — caseTypeCode 编码全量分布（2026-05-08）

> 产出自 walkthrough-v6 fix plan Phase B-1。
> 本文档仅陈列事实分布，**不下业务结论**；canonical 决策待 mempalace 门禁通过后执行（Phase B-3）。

---

## 表 1：前端 `BUSINESS_TYPE_TO_CASE_TYPE_CODE` 映射

> 来源：`packages/admin/src/i18n/messages/_shared/businessTypes.ts`

| # | LEAD BusinessType (kebab) | → CASE caseTypeCode (snake) | leads i18n labelKey | zh-CN 标签 |
|---|---|---|---|---|
| 1 | `highly-skilled` | `highly_skilled` | `leads.options.businessType.highlySkilled` | 高度人才 |
| 2 | `work-visa` | `work` | `leads.options.businessType.workVisa` | 技人国 |
| 3 | `family-stay` | `dependent_visa` | `leads.options.businessType.familyStay` | 家族滞在 |
| 4 | `business-management-visa` | `business_manager_visa` | `leads.options.businessType.businessManagementVisa` | 经营管理 |
| 5 | `company-setup` | `company_setup` | `leads.options.businessType.companySetup` | 设立法人 |
| 6 | `permanent` | `permanent` | `leads.options.businessType.permanent` | 永住 |
| 7 | `other` | `other` | `leads.options.businessType.other` | 其他 |

LEGACY_BUSINESS_TYPE_ALIAS（旧值兼容）：

| 旧值 | → 规范 BusinessType |
|---|---|
| `business-manager` | `business-management-visa` |
| `family_stay` | `family-stay` |
| `work_visa` | `work-visa` |
| `highly_skilled` | `highly-skilled` |
| `company_setup` | `company-setup` |
| `business_management_visa` | `business-management-visa` |

---

## 表 2：后端 seed 文件 caseType 集合 + 命中状态

### 2-A：`seedDevDocTemplates.ts` — `DOC_TEMPLATE_SEEDS`

> 来源：`packages/server/src/scripts/seedDevDocTemplates.ts`

| # | caseType 值 | 语义分组 | 命中表 1 映射？ |
|---|---|---|---|
| 1 | `family_stay` | 家族滞在别名 | ✗（表 1 映射目标是 `dependent_visa`） |
| 2 | `family` | 家族滞在别名 | ✗ |
| 3 | `dependent_visa` | 家族滞在 canonical | ✓ #3 |
| 4 | `engineer_humanities_intl_visa` | 技人国 canonical | ✗（表 1 映射目标是 `work`） |
| 5 | `hum` | 技人国别名 | ✗ |
| 6 | `engineer_visa` | 技人国别名 | ✗ |
| 7 | `biz_mgmt` | BMV 别名 | ✗ |
| 8 | `biz_mgmt_4m` | BMV 子类（认定 4 月） | ✗ |
| 9 | `biz_mgmt_cert_4m` | BMV 子类（认定 4 月） | ✗ |

**缺失项**（表 1 的 7 个映射目标中未被覆盖的）：

| caseTypeCode | 状态 |
|---|---|
| `work` | ✗ 无 doc template |
| `highly_skilled` | ✗ 无 doc template |
| `company_setup` | ✗ 无 doc template |
| `permanent` | ✗ 无 doc template |
| `other` | ✗ 无 doc template |
| `business_manager_visa` | ✗ 无 doc template（有 `biz_mgmt*` 别名但不含 canonical 值） |

### 2-B：`seedCaseTemplates.ts` — `CASE_TEMPLATE_SEEDS`

> 来源：`packages/server/src/scripts/seedCaseTemplates.ts`

| # | caseType 值 | templateName | 命中表 1？ |
|---|---|---|---|
| 1 | `dependent_visa` | 家族滞在ビザ標準テンプレート | ✓ #3 |
| 2 | `work` | 技術・人文知識・国際業務ビザ標準テンプレート | ✓ #2 |
| 3 | `business_manager_visa` | 経営管理ビザ標準テンプレート | ✓ #4 |

**缺失项**：`highly_skilled`, `company_setup`, `permanent`, `other`

### 2-C：`seedDevData.ts` — 硬编码种子 cases

> 来源：`packages/server/src/scripts/seedDevData.ts`

| case_no | case_type_code | case_name |
|---|---|---|
| CASE-DEV-001 | `family_stay` | 家族滞在 — 田中太郎 |
| CASE-DEV-002 | `engineer_humanities_intl_visa` | 技人国 — 田中太郎 |
| CASE-DEV-003 | `business_manager_visa` | 経営管理（認定4M）— 田中太郎 |

---

## 表 3：i18n `cases.constants.caseTypes.*` 全 keys

> 来源：`packages/admin/src/i18n/messages/cases/{zh-CN,ja-JP,en-US}.ts`
> 三 locale 的 key 集合完全相同（已核实）。

| # | key | zh-CN | ja-JP | en-US | 命中表 1？ | 语义分组 |
|---|---|---|---|---|---|---|
| 1 | `family` | 家族滞在 | 家族滞在 | Dependent Visa | ✗ | 家族滞在别名 |
| 2 | `work` | 工作签证 | 就労ビザ | Work Visa | ✓ #2 | 技人国泛称 |
| 3 | `bmv` | 经营管理签 | 経営管理ビザ | Business Manager Visa | ✗ | BMV 别名 |
| 4 | `biz_mgmt` | 经营管理签 | 経営管理ビザ | Business Manager Visa | ✗ | BMV 别名 |
| 5 | `biz_mgmt_4m` | 经营管理签 · 认定 4 个月 | 経営管理ビザ · 在留 4 ヶ月 | BMV · CoE 4-month | ✗ | BMV 子类 |
| 6 | `biz_mgmt_1y` | 经营管理签 · 认定 1 年 | 経営管理ビザ · 在留 1 年 | BMV · CoE 1-year | ✗ | BMV 子类 |
| 7 | `biz_mgmt_cert_4m` | 经营管理签 · 认定 4 个月 | 経営管理ビザ · 在留 4 ヶ月 | BMV · CoE 4-month | ✗ | BMV 子类 |
| 8 | `biz_mgmt_cert_1y` | 经营管理签 · 认定 1 年 | 経営管理ビザ · 在留 1 年 | BMV · CoE 1-year | ✗ | BMV 子类 |
| 9 | `biz_mgmt_renewal` | 经营管理签 · 更新 | 経営管理ビザ · 更新 | BMV · Renewal | ✗ | BMV 子类 |
| 10 | `hum` | 技人国（认定） | 技人国（認定） | Engineer/Specialist (CoE) | ✗ | 技人国别名 |
| 11 | `hum_renewal` | 技人国（更新） | 技人国（更新） | Engineer/Specialist (Renewal) | ✗ | 技人国子类 |
| 12 | `eng_humanities_intl_cert` | 技人国（认定） | 技人国（認定） | Engineer/Specialist (CoE) | ✗ | 技人国别名 |
| 13 | `eng_humanities_intl_renewal` | 技人国（更新） | 技人国（更新） | Engineer/Specialist (Renewal) | ✗ | 技人国子类 |
| 14 | `intra_company` | 企業内转勤 | 企業内転勤 | Intra-Company Transfer | ✗ | 独立类别 |
| 15 | `intra_company_transfer` | 企業内转勤 | 企業内転勤 | Intra-Company Transfer | ✗ | 独立类别（别名） |
| 16 | `company_setup` | 公司设立 | 会社設立 | Company Establishment | ✓ #5 | 会社設立 |
| 17 | `visa` | 签证 | ビザ | Visa | ✗ | 泛用占位 |
| 18 | `visa-change` | 变更在留资格 | 在留資格変更 | Change of Status | ✗ | 独立类别 |
| 19 | `business-management` | 经营管理 | 経営管理 | Business Management | ✗ | BMV 别名（kebab） |
| 20 | `business_manager` | 经营管理 | 経営管理 | Business Manager | ✗ | BMV 别名 |
| 21 | `business_manager_visa` | 经营管理签 | 経営管理ビザ | Business Manager Visa | ✓ #4 | BMV canonical |
| 22 | `dependent_visa` | 家族滞在 | 家族滞在 | Dependent Visa | ✓ #3 | 家族滞在 canonical |
| 23 | `family_stay` | 家族滞在 | 家族滞在 | Family Stay | ✗ | 家族滞在别名 |
| 24 | `engineer_visa` | 技人国（认定） | 技人国（認定） | Engineer/Specialist (CoE) | ✗ | 技人国别名 |
| 25 | `engineer_humanities_intl_visa` | 技人国（认定） | 技人国（認定） | Engineer/Specialist (CoE) | ✗ | 技人国 canonical（长名） |

**观察**：

- 表 1 的 7 个映射目标中，仅 4 个出现在 i18n keys（`work`, `company_setup`, `business_manager_visa`, `dependent_visa`）。
- `highly_skilled`, `permanent`, `other` 无 i18n entry。
- 存在大量历史别名（`biz_mgmt*`, `hum*`, `eng_humanities_intl_*`, `family`, `family_stay` 等）和独立类别（`intra_company*`, `visa-change`, `visa`）。
- `work` 在 i18n 中标签为"工作签证 / 就労ビザ / Work Visa"，但表 1 中 `work-visa` 映射目标为 `work`，而 `engineer_humanities_intl_visa` 有独立 i18n entry 标签为"技人国"——两者的业务粒度关系不明确。

---

## 表 4：仓库内 `case_type_code` / `caseTypeCode` 字面量出现位置

> 方法：全仓库 grep `case_type_code\s*[:=]\s*["']` 及 `caseTypeCode\s*[:=]\s*["']`（排除 `dist/`）

### 4-A：生产代码

| 文件 | 值 | 备注 |
|---|---|---|
| `cases.template-bmv.ts` | `business_manager_visa`（`BMV_CASE_TYPE`） | canonical 常量 |
| `bmvTemplateConfig.ts` | `business_manager_visa`（`BMV_CASE_TYPE_CODE`） | canonical 常量（重复定义） |
| `cases.types-residence-closeout.ts` | `business_manager_visa`（局部常量） | BMV 判定 |
| `cases.types-failure-closeout.ts` | `business_manager_visa`（局部常量） | BMV 判定 |
| `cases.service.phase-effects.ts` | 引用 `BMV_CASE_TYPE` | — |
| `customers.bmv-d3.ts` | 引用 `BMV_CASE_TYPE` | SQL 中插值 |
| `customers.bmv.ts` | 引用 `BMV_CASE_TYPE` | — |
| `customers.bmv-transition-helpers.ts` | 引用 `BMV_CASE_TYPE` | — |
| `cases.service.write-helpers.ts:validateCaseEnums` | **不校验 caseTypeCode** | caseTypeCode 为自由文本 |
| `038_backfill_customer_bmv_profile.up.sql` | `'business_manager_visa'`, `LIKE 'biz_mgmt%'` | 迁移脚本 |

### 4-B：Test fixtures（server — 仅 `src/`，排除 `dist/`）

| 字面量 | 出现文件数 | 代表文件 |
|---|---|---|
| `"visa"` | ~15 | cases.service.test.ts, cases.controller.test.ts, auth/permissions.service.test.ts 等 |
| `"business_manager_visa"` | ~20 | cases.pre-sign-gate.focused.test.ts, customers.bmv-d3.ts, leads.admin.convert-case.controller.test.ts 等 |
| `"family_stay"` | ~5 | cases.success-closeout-gate.focused.test.ts, cases.regression-p1-reminder-closeout.test.ts 等 |
| `"general"` | ~4 | cases.bug063-stage-tighten.focused.test.ts, leadsConvertCasePath.pg.test.ts 等 |
| `"immigration"` | ~3 | exportJobHandler.test.ts, portal/leads/leads.service.test.ts |
| `"work_permit"` | 1 | cases.service.test.ts（update 返回值） |
| `"biz_mgmt_4m"` | 1 | cases.service.bug160-create-error-mapping.focused.test.ts |
| `"biz_mgmt_cert_4m"` | 2 | CaseTimelineTextResolver.test.ts, CaseCommsTimelineBuilders.colonSuffix.test.ts |
| `"bmv"` | 2 | leads.admin.query.summary.test.ts, remindersListPath.pg.test.ts |
| `"work"` | ~8 | seedCaseTemplates.ts, leads.admin.query.summary.test.ts, CustomerAdapterCaseMapper 等 |
| `"dependent_visa"` | ~6 | seedCaseTemplates.ts, leads.admin.query.summary.test.ts, LeadAdapterMappers 等 |
| `"family"` | 3 | CustomerAdapterCaseMapper 等 |
| `"tech_humanities"` | 1 | cases.types-bmv-gate.test.ts |
| `"work_visa"` | 1 | leads.admin.query.summary.test.ts |
| `"business_manager"` | 2 | CaseRepository.comms-log.test.ts, CaseAdapterDetailAggregate 等 |
| `"business-management"` | 2 | p1-downstream-validation-set.test.ts, CustomerAdapterCaseMapper 等 |
| `"general_visa"` | 3 | CaseAdapterDetailAggregate.bmv-failure-path.test.ts 等 |
| `"visa-change"` | 3 | CustomerAdapter.bug180-stage-s9.focused.test.ts, CustomerRepository.test.ts |
| `"visa-renew"` | 1 | CustomerAdapter.bug180-stage-s9.focused.test.ts |
| `"work_visa_renewal"` | 2 | fixtures-detail.ts |
| `"family_stay"` (fixture) | 2 | fixtures-detail.ts |
| `"specific_skills"` | 1 | fixtures-detail.ts |
| `"highly_skilled"` | 1 | fixtures-detail.ts |

### 4-C：Seed / Script 代码

| 文件 | 值 |
|---|---|
| `seedDevData.ts` | `family_stay`, `engineer_humanities_intl_visa`, `business_manager_visa` |
| `seedDevDocTemplates.ts` | `family_stay`, `family`, `dependent_visa`, `engineer_humanities_intl_visa`, `hum`, `engineer_visa`, `biz_mgmt`, `biz_mgmt_4m`, `biz_mgmt_cert_4m` |
| `seedCaseTemplates.ts` | `dependent_visa`, `work`, `business_manager_visa` |
| `backfillCaseDocumentItems.ts` | 动态读取 `case_type_code`（不含字面量） |

---

## 表 5：候选 canonical caseTypeCode 集合

> **仅列候选，不下结论。** 最终 canonical 集合待 mempalace 业务口径确认。

### 方法论

从表 1 的 `BUSINESS_TYPE_TO_CASE_TYPE_CODE` 映射目标集出发（这是 LEAD → CASE 的唯一权威路径），列出 7 个候选值及其在各数据源中的覆盖状态。

| # | 候选 canonical code | 语义 | 表 1 映射 | seedDocTemplates | seedCaseTemplates | i18n | server 生产代码 | 别名链 |
|---|---|---|---|---|---|---|---|---|
| 1 | `highly_skilled` | 高度专门职 | ✓ | ✗ | ✗ | ✗ | ✗ | — |
| 2 | `work` | 技人国（泛称） | ✓ | ✗ | ✓ | ✓ | ✗ | `hum`, `engineer_visa`, `engineer_humanities_intl_visa`, `eng_humanities_intl_cert`, `tech_humanities` |
| 3 | `dependent_visa` | 家族滞在 | ✓ | ✓ | ✓ | ✓ | ✗ | `family`, `family_stay` |
| 4 | `business_manager_visa` | 经营管理签 | ✓ | ✗（仅 `biz_mgmt*`） | ✓ | ✓ | ✓（BMV_CASE_TYPE） | `bmv`, `biz_mgmt`, `biz_mgmt_4m`, `biz_mgmt_1y`, `biz_mgmt_cert_4m`, `biz_mgmt_cert_1y`, `biz_mgmt_renewal`, `business_manager`, `business-management` |
| 5 | `company_setup` | 会社設立 | ✓ | ✗ | ✗ | ✓ | ✗ | — |
| 6 | `permanent` | 永住 | ✓ | ✗ | ✗ | ✗ | ✗ | — |
| 7 | `other` | その他 | ✓ | ✗ | ✗ | ✗ | ✗ | — |

### 待决问题（Phase B-3 scope）

1. **`work` vs `engineer_humanities_intl_visa`**：表 1 映射目标为 `work`，但 seedDevData 种子用 `engineer_humanities_intl_visa`；i18n 中 `work = "工作签证"` 与 `engineer_humanities_intl_visa = "技人国"` 并存。这是粒度差异（`work` 是泛类，`engineer_humanities_intl_visa` 是具体在留资格）还是历史别名？
2. **BMV 子类是否为独立 canonical**：`biz_mgmt_4m` / `biz_mgmt_cert_4m` / `biz_mgmt_renewal` 等是否应作为 `business_manager_visa` 的子类保留，还是归一为单一 canonical？当前 `isBmvCaseTypeCode()` 通过前缀匹配兜底。
3. **`validateCaseEnums` 是否需要增加 caseTypeCode 校验**：当前 caseTypeCode 为自由文本，后端不校验合法性。是否在 canonical 确定后加入枚举校验？
4. **i18n 中的独立类别**（`intra_company*`, `visa-change`, `visa`）是否需要加入 canonical 集合？
5. **`highly_skilled` / `permanent` / `other` 的 seed 覆盖**：这三个 canonical 候选在所有 seed 文件中均无条目，是否需要补最小占位？

### mempalace 查询模板

当 mempalace 恢复可用时，执行以下查询以获取业务口径：

```
prepare_grounded_answer({
  query: "行政书士 SaaS 中：
    1) LEAD intendedCaseType 的合法集合与含义；
    2) CASE caseTypeCode 的 canonical 集合；
    3) 两者 1:N 还是 N:1 映射；
    4) 'work' 与 'engineer_humanities_intl_visa' 是别名还是粒度差异？
    5) biz_mgmt_4m / biz_mgmt_cert_4m / biz_mgmt_renewal 是否为独立类型？"
})
```

---

## 附录：BMV 常量定义重复观察

后端存在两处独立的 BMV caseTypeCode 常量定义：

| 文件 | 常量名 | 值 |
|---|---|---|
| `cases.template-bmv.ts` | `BMV_CASE_TYPE` | `"business_manager_visa"` |
| `bmvTemplateConfig.ts` | `BMV_CASE_TYPE_CODE` | `"business_manager_visa"` |
| `cases.types-residence-closeout.ts` | `BMV_CASE_TYPE_CODE`（局部） | `"business_manager_visa"` |
| `cases.types-failure-closeout.ts` | `BMV_CASE_TYPE_CODE`（局部） | `"business_manager_visa"` |

已有 contract test 保证 `BMV_CASE_TYPE === BMV_CASE_TYPE_CODE`（见 `cases.template-foundation.focused.test.ts`、`cases.regression-p1-questionnaire-supplement.contracts.test.ts`），但局部常量未纳入断言。

---

## TODO — Phase B-3 显式延期（2026-05-08）

> **状态：BLOCKED** — mempalace MCP server errored；业务范围/字段归属决策必须先走 mempalace 门禁。
>
> 依据：[core-operating-rule.mdc](.cursor/rules/core-operating-rule.mdc) §Task Routing —— 涉及行政书士 SaaS 字段归属、状态机、P0/P1 边界时，以 `docs/gyoseishoshi_saas_md/` 内的权威文档为准；缺少权威引用时不得输出确定性结论。

### 待执行事项（mempalace 恢复后）

1. **确定 canonical caseTypeCode 集合** — 明确 7 个候选值（表 5）中哪些为生产 canonical；是否新增或合并。
2. **`work` vs `engineer_humanities_intl_visa` 定性** — 是别名（alias → 应合并）还是粒度差异（泛类 vs 具体在留资格 → 应保留两者并定义层级）。
3. **i18n label 统一** — canonical 确定后，三 locale `cases.constants.caseTypes.*` 只保留 canonical keys + 明确的 alias fallback；删除无引用 keys。
4. **历史 `case_type_code` 数据迁移** — 如 canonical 合并别名（例如 `family_stay` → `dependent_visa`），需生成 migration SQL 回刷历史行；评估是否同步更新 test fixtures。
5. **LEAD `intendedCaseType` 映射复审** — `work-visa → work` 若定性为应映射到 `engineer_humanities_intl_visa`，需更新 `BUSINESS_TYPE_TO_CASE_TYPE_CODE`。
6. **`validateCaseEnums` 是否启用 caseTypeCode 枚举校验** — canonical 确定后可选。
7. **BMV 子类处理** — `biz_mgmt_4m` 等是否归一为 `business_manager_visa` + metadata field，还是保留为独立 code。

### 本轮交付约束

- **不改** i18n label 映射
- **不合并** caseTypeCode code（不做 alias → canonical migration）
- **不调整** `BUSINESS_TYPE_TO_CASE_TYPE_CODE` 映射
- 已做：seed 补漏（B-2）仅补 canonical 值的 doc template 占位，不改变已有别名 seed 的行为

### 恢复操作

用户在 Cursor Settings → MCP 恢复 mempalace 后：

1. 执行上方「mempalace 查询模板」获取业务口径
2. 将结论回填本节 + `docs/gyoseishoshi_saas_md/_output/00-outputs.md`
3. 执行待执行事项 1-7
4. 删除本 TODO 区块或标记 DONE
