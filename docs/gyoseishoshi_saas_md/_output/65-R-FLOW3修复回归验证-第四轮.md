# 咨询 → 客户 → 案件 全链路 R-FLOW3 修复回归验证（第四轮 / R-FLOW4）

> 生成日期：2026-05-07
>
> 命题：在 R-FLOW3（第三轮）报告中标注的 7 条 P1/P2/P3 缺陷
> （A-1 / A-2 / B-1 / B-2 / C-1 / D-1 / E-1）是否已经全部修复并落地。
>
> 本轮**不再走完整 chrome-devtools-mcp 端到端**，而是从 5 个交叉维度做
> 深度静态 + 单测 + 数据交叉验证，定论速度更快、信号更确定：
>
> 1. **静态代码核查**：直接读源码，比对 R-FLOW3 给出的「修复方向」。
> 2. **新增 test/script 文件清单**：列出 R-FLOW3 之后新增的守护文件，
>    判断它们与生产代码是否对齐。
> 3. **`tsc --noEmit` 类型门禁**：跑 `packages/server` 与 `packages/admin`
>    的类型检查，识别半成品破坏 build 的情况。
> 4. **关键单元测试运行**：跑 R-FLOW3 修复方向新建的 3 个守护测试
>    （`seedCaseTemplates.idempotent.test.ts` /
>    `LeadConvertedRecords.test.ts` /
>    `backfillCustomerOwnerFromLead.test.ts` /
>    `leads.admin.convert.service.validation.test.ts`），看红/绿状态。
> 5. **PG 直查**：复用 R-FLOW3 末态数据集，确认 `case_templates`、
>    `customers.base_profile`、`cases / document_items` 是否已被修复回正常态。
>
> 工具：`docker exec cms-client-postgres-1 psql` + `tsc --noEmit` +
> `node:test (tsx --test)` + `vitest run`。本轮**没有起 dev server 与
> chrome-devtools-mcp**，因为代码层与单测层已经能给出确定结论。
>
> 上游权威：
>
> - [P0/04-核心流程与状态流转.md §4.1 咨询转案件](../P0/04-核心流程与状态流转.md#41-咨询转案件)
> - [P0/04-核心流程与状态流转.md §4.2 资料收集与审核](../P0/04-核心流程与状态流转.md#42-资料收集与审核)
> - [62-咨询客户案件全链路chrome-devtools-mcp走查-第一轮.md](./62-咨询客户案件全链路chrome-devtools-mcp走查-第一轮.md)
> - [63-咨询客户案件全链路chrome-devtools-mcp走查-第二轮.md](./63-咨询客户案件全链路chrome-devtools-mcp走查-第二轮.md)
> - [64-咨询客户案件全链路chrome-devtools-mcp走查-第三轮.md](./64-咨询客户案件全链路chrome-devtools-mcp走查-第三轮.md)

---

## 0. 总结

### 0.1 一句话结论

**R-FLOW3 报告里 7 条 P1/P2/P3 全部仍是开（未修复）状态**，并且当前 main
分支已经把 `packages/server` 的 `tsc --noEmit` 推到红线 —— 也就是说现在
`npm run guard` 一定会挂在 server typecheck，整组改动暂时无法直接交付。

实测呈现的是**「补丁打到一半」状态**：

- ✅ 已经新增的：`seedCaseTemplates.idempotent.test.ts`、
  `LeadConvertedRecords.test.ts`、`backfillCustomerOwnerFromLead.ts/.test.ts`、
  `leads.admin.convert.service.validation.test.ts`、
  `__data__/caseTemplateBlueprints/business-manager-visa.ts`、
  `CustomerBmvIntakeCard.vue / .test.ts`、`useCustomerBmvIntakeCardModel.ts`、
  `LeadAdapterMappers.conversion.test.ts`、`useLeadDetailModel.tab-deep-link.test.ts`、
  `LeadDateHelpers.ts`。
- ❌ 完全没改 / 改不到位：`packages/server/src/modules/core/leads/leads.admin.convert.ts`
  （没加 `mapIntendedCaseTypeToCustomerVisaType`，没把 ownerUserId/groupId/
  visaType/sourceChannel 写入 `customers.base_profile`）；
  `packages/server/src/scripts/seedCaseTemplates.ts`（仍 2 行 seed，
  ON CONFLICT 仍只刷 blueprint）；
  `packages/admin/src/views/leads/components/LeadConvertedRecords.vue`
  （模板仍渲染 raw `id` 不带 customerNo fallback）；
  `packages/admin/src/views/leads/types-detail.ts`（`ConvertedCustomer` 接口
  里没有 `customerNo / displayName` 字段）；
  `packages/admin/src/views/customers/CustomerListView.vue`（owner picker
  仍 `getOwnerOptions(locale)` 不是 `getActiveUserOptions()`）；
  `packages/admin/src/i18n/messages/cases/{zh-CN,ja-JP,en-US}.ts`
  （`caseTypes` 字典里没有 `family_stay` 键）。

净效果：

> 1. **server `tsc --noEmit` RED**：`leads.admin.convert.service.validation.test.ts`
>    与 `backfillCustomerOwnerFromLead.ts` 都 import 了**未导出**的
>    `mapIntendedCaseTypeToCustomerVisaType`，2 条 TS2305。
> 2. **`seedCaseTemplates.idempotent.test.ts` 5 中失 2**：seed 仍 2 行、
>    ON CONFLICT 仍不刷 case_type，新测试与现状直接矛盾。
> 3. **`LeadConvertedRecords.test.ts` 3 中失 1**：模板仍 raw id，
>    customerNo 测试用例失败。
> 4. **PG 末态对照 R-FLOW3 没有任何变化**：
>    `case_templates` 仍 `family_stay/engineer_humanities_intl_visa/
>    business_manager_visa` 错位组合；R-FLOW-01/02/03 三个 customers
>    `base_profile.ownerUserId/groupId/visaType` 仍空；CASE-202605-0007
>    （work）/ 0008（dependent_visa）`document_items` 仍 0。

### 0.2 修复矩阵（R-FLOW3 → R-FLOW4）

| 编号 | 主题 | R-FLOW4 状态 | 关键证据 |
|------|------|--------------|----------|
| **R-FLOW3-A-1** [P1] | `seedCaseTemplates` ON CONFLICT 不刷新 case_type | ❌ **未修复 + 守护测试反向失败** | `seedCaseTemplates.ts:17-32` 仍 2 个 seed；`:58-60` ON CONFLICT 仍只刷 blueprint；`tsx --test` 5/2 失败；PG `case_type` 仍 `family_stay/engineer_humanities_intl_visa/business_manager_visa` 三行错位组合；`__data__/caseTemplateBlueprints/business-manager-visa.ts` 已建但**未被任何文件 import** |
| **R-FLOW3-A-2** [P1] | convert-customer 不写 ownerUserId / groupId / visaType / sourceChannel | ❌ **未修复 + 半成品破坏 server build** | `leads.admin.convert.ts:85-103` `createCustomerFromLead` 仍只写 phone/email；未 export `mapIntendedCaseTypeToCustomerVisaType`；`backfillCustomerOwnerFromLead.ts:16` 与 `leads.admin.convert.service.validation.test.ts:12` 都 import 了不存在的函数；`tsc --noEmit` 直接 2 个 TS2305；PG R-FLOW-01/02/03 三个客户 `base_profile.ownerUserId / groupId / visaType` 仍 NULL |
| **R-FLOW3-B-1** [P2] | `convertedCustomer` DTO 缺字段 / UI 渲染 `UUID · ·` | ❌ **未修复** | `LeadConvertedRecords.vue:48-67` 模板仍 `conversion.convertedCustomer!.id`，没有 customerNo fallback、没有 formatDateTime；`types-detail.ts:155-167` `ConvertedCustomer` 接口里没有 `customerNo / displayName`；`vitest run` 1/3 fail（`CUS-1` 替代了 `CUS-202605-0001`）；服务端 `LeadAdminController` mapper 同样未补 customerNo |
| **R-FLOW3-B-2** [P2] | 客户详情对 BMV 没有承接卡片 | ⚠️ **半修复（卡片存在但永不触发）** | `CustomerBmvIntakeCard.vue` ✅ 已建并接入 `CustomerBasicInfoTab.vue:128`；触发条件 `customerRequiresBmv()` 走 `customer.visaType === "business_manager"`，依赖 R-FLOW3-A-2 写入 visaType；A-2 没修 → 新转化客户 visaType 永远是 NULL → 卡片永不渲染。客户详情顶部仍只能看到 KPI、看不到 BMV 4 步骤 chip |
| **R-FLOW3-C-1** [P3] | cases 列表对 `family_stay` / `prepare` 老 fixture 仍 raw 渲染 | ❌ **未修复** | `cases/zh-CN.ts:914-939` `caseTypes` 字典里有 `family / dependent_visa / engineer_humanities_intl_visa / biz_mgmt_*`，**没有 `family_stay` 键**；`CaseTableRow.vue:65-72` `typeLabel` 通过 `getCaseTypeI18nKey` 命中失败 → 直接 fallback 到 raw code |
| **R-FLOW3-D-1** [P2] | customer 列表「负责人」picker 仍 7 个 fixture 名 | ❌ **未修复** | `CustomerListView.vue:11,45-47` 仍 `getOwnerOptions(locale).map(...)`；cases 列表 `CaseListView.vue:9,25-32` 已经走 `getActiveUserOptions()`，customers 端始终没切过来 |
| **R-FLOW3-E-1** [P3] | convert-customer 只写单边 name_jp 或 name_cn | ❌ **未修复** | `leads.admin.convert.ts:105-117` `deriveLocalizedNames` 仍按 lead.language 单边写入；PG 直查：R-FLOW-01 仅 `name_cn`，R-FLOW-02/03 仅 `name_jp`，三人 `name_jp` 与 `name_cn` 缺一个 |

### 0.3 优先级分布（与 R-FLOW3 一致，全部仍为 OPEN）

| 等级 | 个数 | 编号 |
|------|------|------|
| P1   | 2    | R-FLOW3-A-1 / R-FLOW3-A-2 |
| P2   | 3    | R-FLOW3-B-1 / R-FLOW3-B-2 / R-FLOW3-D-1 |
| P3   | 2    | R-FLOW3-C-1 / R-FLOW3-E-1 |

---

## 1. 五维交叉证据

### 1.1 维度 ①：`tsc --noEmit` 类型门禁

#### 1.1.1 server 包：RED

```text
$ cd packages/server && npx tsc --noEmit -p tsconfig.json

src/modules/core/leads/leads.admin.convert.service.validation.test.ts(12,10):
  error TS2305: Module '"./leads.admin.convert"' has no exported member
  'mapIntendedCaseTypeToCustomerVisaType'.

src/scripts/backfillCustomerOwnerFromLead.ts(16,10):
  error TS2305: Module '"../modules/core/leads/leads.admin.convert"' has no
  exported member 'mapIntendedCaseTypeToCustomerVisaType'.
```

→ 这两个 import 都是 R-FLOW3 之后新增的，但目标 `leads.admin.convert.ts`
里**没有这个 export**：

```36:36:packages/server/src/modules/core/leads/leads.admin.convert.ts
export async function convertCustomer(
```

```85:85:packages/server/src/modules/core/leads/leads.admin.convert.ts
async function createCustomerFromLead(
```

```105:117:packages/server/src/modules/core/leads/leads.admin.convert.ts
function deriveLocalizedNames(
  name: string | null,
  language: string | null,
): {
  zh?: string;
  ja?: string;
  en?: string;
  defaultLocale?: "zh" | "ja" | "en";
} {
  if (!name) return { defaultLocale: "zh" };
  const locale = language === "ja" ? "ja" : language === "en" ? "en" : "zh";
  return { [locale]: name, defaultLocale: locale };
}
```

整文件 117 行，只有 3 个函数，**没有** `mapIntendedCaseTypeToCustomerVisaType`。

#### 1.1.2 admin 包：GREEN

`vue-tsc --build` 通过；admin 端的修复都属于 *行为没改但接口/模板对得上*
的范畴（典型：`ConvertedCustomer` 接口里没有 `customerNo`，但
`LeadConvertedRecords.vue` 也没引用 `customerNo`，所以 typecheck 不报）。

### 1.2 维度 ②：新增守护测试运行结果

#### 1.2.1 `seedCaseTemplates.idempotent.test.ts`：5 / 2 RED

```text
▶ seedCaseTemplates idempotent upsert
  ✖ overwrites stale case_type and template_name on conflict
      actual:   'family_stay'
      expected: 'dependent_visa'
  ✖ all three templates are upserted
      2 !== 3
  ✔ running twice produces identical results
  ✔ SQL includes ON CONFLICT … DO UPDATE with key fields
  ✔ passes org_id as second parameter to every INSERT
ℹ tests 5  ℹ pass 3  ℹ fail 2
```

#### 1.2.2 `LeadConvertedRecords.test.ts`：3 / 1 RED

```text
 FAIL  src/views/leads/components/LeadConvertedRecords.test.ts
       > LeadConvertedRecords > renders customerNo in meta when present (B-2)

AssertionError: expected 'CUS-1 · Tokyo-1 · 2026-05-01T10:00:00Z'
                to contain 'CUS-202605-0001'

 Test Files  1 failed (1)
      Tests  1 failed | 2 passed (3)
```

#### 1.2.3 `backfillCustomerOwnerFromLead.test.ts`：直接挂在 import 阶段

```text
SyntaxError: The requested module '../modules/core/leads/leads.admin.convert'
does not provide an export named 'mapIntendedCaseTypeToCustomerVisaType'
ℹ tests 1  ℹ pass 0  ℹ fail 1
```

#### 1.2.4 `leads.admin.convert.service.validation.test.ts`：同样 import 挂

```text
SyntaxError: The requested module './leads.admin.convert' does not provide
an export named 'mapIntendedCaseTypeToCustomerVisaType'
ℹ tests 1  ℹ pass 0  ℹ fail 1
```

### 1.3 维度 ③：源码静态核查（关键差分）

#### 1.3.1 R-FLOW3-A-1 / `seedCaseTemplates.ts`

R-FLOW3 修复方向：`ON CONFLICT (id) DO UPDATE` 增加
`template_name / case_type / application_type / active_flag`，并把
seed 数组扩到 3 行（family-stay / work / business-manager-visa）。

实际现状：

```17:32:packages/server/src/scripts/seedCaseTemplates.ts
const CASE_TEMPLATE_SEEDS: CaseTemplateSeed[] = [
  {
    id: CASE_TEMPLATE_FAMILY_STAY_ID,
    templateName: "家族滞在ビザ標準テンプレート",
    caseType: "family_stay",
    applicationType: null,
    requirementBlueprint: FAMILY_STAY_REQUIREMENT_BLUEPRINT,
  },
  {
    id: CASE_TEMPLATE_WORK_ID,
    templateName: "技術・人文知識・国際業務ビザ標準テンプレート",
    caseType: "engineer_humanities_intl_visa",
    applicationType: null,
    requirementBlueprint: WORK_VISA_REQUIREMENT_BLUEPRINT,
  },
];
```

```52:69:packages/server/src/scripts/seedCaseTemplates.ts
    await client.query(
      `INSERT INTO case_templates (
         id, org_id, template_name, case_type, application_type,
         requirement_blueprint, active_flag
       )
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, true)
       ON CONFLICT (id) DO UPDATE SET
         requirement_blueprint = EXCLUDED.requirement_blueprint,
         updated_at = now()`,
```

→ seed 仍然是 2 行（`family_stay` / `engineer_humanities_intl_visa`），
ON CONFLICT 仍然只刷 `requirement_blueprint`。BMV blueprint 文件
`__data__/caseTemplateBlueprints/business-manager-visa.ts` 已建但**没有
任何文件 import**（grep `business-manager-visa` 仅命中自身定义）。

#### 1.3.2 R-FLOW3-A-2 / `leads.admin.convert.ts`

R-FLOW3 修复方向：`createCustomerFromLead` 写入 `ownerUserId / groupId /
sourceChannel / visaType` 到 `customers.base_profile`，并 export
`mapIntendedCaseTypeToCustomerVisaType`。

实际现状：

```85:103:packages/server/src/modules/core/leads/leads.admin.convert.ts
async function createCustomerFromLead(
  customersService: CustomersService,
  ctx: RequestContext,
  lead: Lead,
  input: LeadConvertCustomerInput,
): Promise<string> {
  const localizedNames =
    input.localizedNames ?? deriveLocalizedNames(lead.name, lead.language);
  const baseProfile: Record<string, unknown> = {};
  if (lead.phone) baseProfile.phone = lead.phone;
  if (lead.email) baseProfile.email = lead.email;

  const customer = await customersService.create(ctx, {
    type: "individual",
    baseProfile,
    localizedNames,
  });
  return customer.id;
}
```

→ 完全没改；既没写 `ownerUserId`，也没 export 函数。

#### 1.3.3 R-FLOW3-B-1 / `LeadConvertedRecords.vue` + `types-detail.ts`

```48:67:packages/admin/src/views/leads/components/LeadConvertedRecords.vue
        <div class="converted-record__info">
          <p class="converted-record__name">
            {{ conversion.convertedCustomer!.name }}
          </p>
          <p class="converted-record__meta">
            {{ conversion.convertedCustomer!.id }} ·
            {{
              resolveGroupLabel(
                conversion.convertedCustomer!.group,
                t("shared.group.disabledSuffix"),
              )
            }}
            ·
            {{ conversion.convertedCustomer!.convertedAt }}
          </p>
        </div>
```

```155:167:packages/admin/src/views/leads/types-detail.ts
export interface ConvertedCustomer {
  id: string;
  name: string;
  group: string;
  convertedAt: string;
  convertedBy: string;
}
```

→ 没有 `customerNo`、没有 `displayName`，模板也没 fallback。

#### 1.3.4 R-FLOW3-B-2 / 客户详情承接卡片触发条件

```45:50:packages/admin/src/views/customers/model/useCustomerCreateCaseGateModel.ts
export function customerRequiresBmv(customer: CustomerDetail): boolean {
  if (customer.visaType === "business_manager") return true;
  const profile = customer.bmvProfile;
  if (!profile) return false;
  return profile.questionnaireStatus !== "not_started";
}
```

```60:62:packages/admin/src/views/customers/components/CustomerBasicInfoTab.vue
const showBmvIntakeCard = computed(
  () => props.bmvEnabled === true && customerRequiresBmv(props.customer),
);
```

→ 卡片在；但触发链是
`lead.intendedCaseType=business-management-visa → convert-customer
→ customers.base_profile.visaType = "business_manager"`，第二步在 A-2
未修的情况下永远不会发生 → 客户详情顶部对所有新转化 BMV 客户**永远不显示
承接卡片**（只有手动改库或 fixture 走通的客户才能看到）。

#### 1.3.5 R-FLOW3-C-1 / cases i18n

```914:939:packages/admin/src/i18n/messages/cases/zh-CN.ts
    caseTypes: {
      family: "家族滞在",
      work: "工作签证",
      bmv: "经营管理签",
      biz_mgmt: "经营管理签",
      biz_mgmt_4m: "经营管理签 · 认定 4 个月",
      biz_mgmt_1y: "经营管理签 · 认定 1 年",
      biz_mgmt_cert_4m: "经营管理签 · 认定 4 个月",
      biz_mgmt_cert_1y: "经营管理签 · 认定 1 年",
      biz_mgmt_renewal: "经营管理签 · 更新",
      hum: "技人国（认定）",
      hum_renewal: "技人国（更新）",
      eng_humanities_intl_cert: "技人国（认定）",
      eng_humanities_intl_renewal: "技人国（更新）",
      intra_company: "企業内转勤",
      intra_company_transfer: "企業内转勤",
      company_setup: "公司设立",
      visa: "签证",
      "visa-change": "变更在留资格",
      "business-management": "经营管理",
      business_manager: "经营管理",
      business_manager_visa: "经营管理签",
      dependent_visa: "家族滞在",
      engineer_visa: "技人国（认定）",
      engineer_humanities_intl_visa: "技人国（认定）",
    },
```

→ 没有 `family_stay` 键；CASE-DEV-001/002 `case_type_code='family_stay'`
经过 `getCaseTypeI18nKey('family_stay')` 命中 `cases.constants.caseTypes.family_stay`
→ 翻译失败 → CaseTableRow `typeLabel.value === code` 直接落到 raw `family_stay`。

#### 1.3.6 R-FLOW3-D-1 / customers owner picker

```9:11:packages/admin/src/views/cases/CaseListView.vue
import { getActiveUserOptions } from "../../shared/model/useOrgUserOptions";
```

```25:32:packages/admin/src/views/cases/CaseListView.vue
const ownerOptions = computed<import("./types").CaseOwnerOption[]>(() =>
  getActiveUserOptions().map((u) => ({
    ...u,
    initials: u.label.slice(0, 2),
    avatarClass: "bg-gray-200",
    group: null,
  })),
);
```

```10:11:packages/admin/src/views/customers/CustomerListView.vue
import { getActiveGroupOptions } from "../../shared/model/useGroupOptions";
import { getOwnerOptions } from "../../shared/model/useOwnerOptions";
```

```45:47:packages/admin/src/views/customers/CustomerListView.vue
const ownerOptions = computed<SelectOption[]>(() =>
  getOwnerOptions(locale.value).map(({ value, label }) => ({ value, label })),
);
```

→ cases 列表已经切到 `getActiveUserOptions()`，customers 列表仍走
`getOwnerOptions(locale)`（fixture catalog，固定 7 人）。

#### 1.3.7 R-FLOW3-E-1 / 双轨姓名

```105:117:packages/server/src/modules/core/leads/leads.admin.convert.ts
function deriveLocalizedNames(
  name: string | null,
  language: string | null,
): {
  zh?: string;
  ja?: string;
  en?: string;
  defaultLocale?: "zh" | "ja" | "en";
} {
  if (!name) return { defaultLocale: "zh" };
  const locale = language === "ja" ? "ja" : language === "en" ? "en" : "zh";
  return { [locale]: name, defaultLocale: locale };
}
```

→ 仍然按 lead.language 选一个 locale，对应 `customers.base_profile`
里只会落 `name_zh` 或 `name_ja` 之一；R-FLOW3 期望的是
「同时写 name_jp 与 name_cn 双轨」，未实现。

### 1.4 维度 ④：PG 末态印证

#### 1.4.1 `case_templates`（R-FLOW3-A-1）

```sql
docker exec cms-client-postgres-1 psql -U cms -d cms -t -c "
  select case_type, template_name,
         jsonb_array_length(requirement_blueprint->'items')
  from case_templates
  order by case_type;"
```

返回：

```text
 business_manager_visa         | 経営管理ビザ標準テンプレート                 | 10
 engineer_humanities_intl_visa | 技術・人文知識・国際業務ビザ標準テンプレート | 11
 family_stay                   | 家族滞在ビザ標準テンプレート                 | 10
```

→ 与 R-FLOW3 末态完全一致：`family_stay`（应是 `dependent_visa`）/
`engineer_humanities_intl_visa`（应是 `work`）仍未刷新。

#### 1.4.2 R-FLOW 三个 customers 的 base_profile（A-2 / E-1）

```text
            customerNumber           |   name_jp   |   name_cn   | owner | gid | vt
-------------------------------------+-------------+-------------+-------+-----+-----
 CUS-202605-0010 (R-FLOW-01)         | (空)        | 王小红      | (空)  |(空) |(空)
 CUS-202605-0011 (R-FLOW-02)         | 田中花子    | (空)        | (空)  |(空) |(空)
 CUS-202605-0012 (R-FLOW-03 BMV)     | 佐藤一郎    | (空)        | (空)  |(空) |(空)
```

→ 三个客户共同：`ownerUserId / groupId / visaType` 全空（A-2）；
R-FLOW-01 缺 `name_jp`、R-FLOW-02/03 缺 `name_cn`（E-1）。

#### 1.4.3 R-FLOW 两个 cases 的 document_items（A-1 → 资料清单）

```text
 case_no          | case_type_code        | docs
------------------+-----------------------+------
 CASE-202605-0007 | work                  |    0   ❌（seed 是 engineer_humanities_intl_visa，miss）
 CASE-202605-0008 | dependent_visa        |    0   ❌（seed 是 family_stay，miss）
 CASE-202605-0006 | biz_mgmt_cert_4m      |    1   🟡（fixture）
 CASE-DEV-001     | family_stay           |    5   🟡（老 fixture，与 seed 字面同）
 CASE-DEV-002     | family_stay           |    1   🟡
 CASE-DEV-003     | business_manager_visa |    0
```

→ 印证 R-FLOW3-A-1 的判断：admin 创建 `work` / `dependent_visa` 案件时，
`findActiveCaseTemplateByCaseType` 仍然 miss，资料清单为 0。

### 1.5 维度 ⑤：新增文件清单（说明工作量与方向，但非交付）

R-FLOW3 之后**新增的文件**（git untracked）：

```text
packages/admin/src/views/leads/components/LeadBannerStrip.test.ts
packages/admin/src/views/leads/components/LeadConversionTab.test.ts
packages/admin/src/views/leads/components/LeadConvertedRecords.test.ts          ← B-1 守护，1/3 fail
packages/admin/src/views/leads/model/LeadAdapterMappers.conversion.test.ts
packages/admin/src/views/leads/model/LeadDateHelpers.ts
packages/admin/src/views/leads/model/useLeadDetailModel.tab-deep-link.test.ts
packages/admin/src/views/customers/components/CustomerBmvIntakeCard.vue          ← B-2 卡片，触发条件未达
packages/admin/src/views/customers/components/CustomerBmvIntakeCard.test.ts
packages/admin/src/views/customers/model/useCustomerBmvIntakeCardModel.ts
packages/admin/src/views/customers/model/useCustomerBmvIntakeCardModel.test.ts
packages/server/src/modules/core/customers/customers.query.detail-sql.smoke.test.ts
packages/server/src/modules/core/leads/leads.admin.controller.crud.test.ts
packages/server/src/modules/core/leads/leads.admin.convert.service.validation.test.ts ← A-2 守护，import 挂
packages/server/src/scripts/__data__/caseTemplateBlueprints/business-manager-visa.ts   ← 未被 import
packages/server/src/scripts/backfillCustomerOwnerFromLead.ts                   ← A-2 backfill，import 挂
packages/server/src/scripts/backfillCustomerOwnerFromLead.test.ts
packages/server/src/scripts/seedCaseTemplates.idempotent.test.ts               ← A-1 守护，5/2 fail
```

→ 守护测试 / backfill 脚本 / blueprint 数据基本到位，**生产代码改动**（即
应该让这些守护变绿的 source-side 改动）整体缺失。

---

## 2. 行动建议（按风险序）

| 顺序 | 编号 | 文件 | 关键动作 |
|------|------|------|----------|
| 1 | A-2 (源) | `packages/server/src/modules/core/leads/leads.admin.convert.ts` | 新增并 export `mapIntendedCaseTypeToCustomerVisaType(intended: string \| null): string \| null`；`createCustomerFromLead` 写入 `baseProfile.ownerUserId / groupId / sourceChannel / visaType`；deriveLocalizedNames 改为同时写 `name_jp` 与 `name_cn` 双轨 |
| 2 | A-2 (DTO) | `packages/server/src/modules/core/leads/leads.admin.types.ts` | `LeadConvertCustomerInput` 增 `localizedNames` 默认值与 visaType 透传；同步更新 `leads.admin.controller.ts` |
| 3 | A-1 (源) | `packages/server/src/scripts/seedCaseTemplates.ts` | seed 数组扩到 3 行（id 700→`dependent_visa` / 701→`work` / 702→`business_manager_visa`）；ON CONFLICT 增加 `template_name = EXCLUDED.template_name, case_type = EXCLUDED.case_type, application_type = EXCLUDED.application_type, active_flag = EXCLUDED.active_flag`；import 现有的 `business-manager-visa.ts` blueprint |
| 4 | A-1 (运维) | hotfix PR 描述 | 上线后强制跑 `npm run db:seed-dev` 把 PG `id=700/701` 行 case_type 升级到 `dependent_visa / work` |
| 5 | B-1 (DTO) | `packages/admin/src/views/leads/types-detail.ts` + `packages/server/src/modules/core/leads/leads.admin.controller.ts` | `ConvertedCustomer` 增 `customerNo / displayName?`；server mapper join `customers.base_profile->>'customerNumber' / name_jp / name_cn / displayName` 与 `customers.created_at` |
| 6 | B-1 (UI) | `packages/admin/src/views/leads/components/LeadConvertedRecords.vue` | 模板首选 `customerNo`，缺失再 fallback `id`；`convertedAt` 走 `formatDateTime(...)` |
| 7 | B-2 (触发) | `packages/admin/src/views/customers/model/useCustomerCreateCaseGateModel.ts` | `customerRequiresBmv` 同时识别 `business_manager` 与 `business_manager_visa`（避免依赖单一字面量） |
| 8 | C-1 (i18n) | `packages/admin/src/i18n/messages/cases/{zh-CN,ja-JP,en-US}.ts` | `caseTypes` 字典补 `family_stay` 别名，与现有 `family / dependent_visa` 同义 |
| 9 | D-1 (UI) | `packages/admin/src/views/customers/CustomerListView.vue` | `ownerOptions` 切换为 `getActiveUserOptions()`，与 cases 列表共用 helper |
| 10 | 收尾 | `npm run fix` + `npm run guard` | 必须全绿才能交付；其中 server typecheck 是当前最大阻塞点 |

---

## 3. 验证脚本（一键跑回归）

```bash
# 1. server 类型门禁
( cd packages/server && npx tsc --noEmit -p tsconfig.json )

# 2. R-FLOW3-A-1 idempotent seed 测试
( cd packages/server && ../../node_modules/.bin/tsx --test \
    src/scripts/seedCaseTemplates.idempotent.test.ts )

# 3. R-FLOW3-A-2 守护测试
( cd packages/server && ../../node_modules/.bin/tsx --test \
    src/scripts/backfillCustomerOwnerFromLead.test.ts )
( cd packages/server && ../../node_modules/.bin/tsx --test \
    src/modules/core/leads/leads.admin.convert.service.validation.test.ts )

# 4. R-FLOW3-B-1 守护测试
( cd packages/admin && ../../node_modules/.bin/vitest run \
    src/views/leads/components/LeadConvertedRecords.test.ts )

# 5. PG 末态比对
docker exec cms-client-postgres-1 psql -U cms -d cms -c "
  select case_type, template_name,
         jsonb_array_length(requirement_blueprint->'items')
  from case_templates order by case_type;"

docker exec cms-client-postgres-1 psql -U cms -d cms -c "
  select base_profile->>'customerNumber' as cno,
         base_profile->>'name_jp' as name_jp,
         base_profile->>'name_cn' as name_cn,
         base_profile->>'ownerUserId' as owner,
         base_profile->>'groupId' as gid,
         base_profile->>'visaType' as vt
  from customers
  where base_profile->>'customerNumber' like 'CUS-202605-001%'
  order by base_profile->>'customerNumber';"
```

修复完成的判断标准：

- `tsc --noEmit` 在 server / admin 两侧均 0 error；
- `seedCaseTemplates.idempotent.test.ts` 5/5 pass；
- `LeadConvertedRecords.test.ts` 3/3 pass；
- `backfillCustomerOwnerFromLead.test.ts` + `leads.admin.convert.service.validation.test.ts`
  能正常 import，全部 pass；
- 跑一次 `npm run db:seed-dev` 后，PG `case_templates` 出现
  `dependent_visa / work / business_manager_visa` 三行（不再是
  `family_stay / engineer_humanities_intl_visa / business_manager_visa`）；
- 重新跑一次 R-FLOW-04 / R-FLOW-05 lead 转化后，新 customer
  `base_profile.ownerUserId / groupId / visaType` 全部非空，且
  `name_jp` 与 `name_cn` 同时存在；
- `npm run fix` + `npm run guard` 整链路全绿。

---

## 4. 与 R-FLOW3 报告的差异点

R-FLOW3 在 §0.1 给出的**预期修复清单**，R-FLOW4 实测每条**都未交付**。
但是有一个进度：本轮发现已经新增了 7 个测试文件 + 1 个 backfill 脚本 +
1 个 BMV blueprint + 1 套 BmvIntakeCard 组件，说明**修复方向被正确理解**，
只是「源代码侧 + DTO 侧 + i18n 侧」的对应改动还没下笔。建议把这些
半成品当作 R-FLOW3 hotfix 的「测试规约 / 验收清单」直接驱动一次完整
PR——按 §2 行动建议的 1→10 顺序落地，可以让全部红灯一次性变绿。
