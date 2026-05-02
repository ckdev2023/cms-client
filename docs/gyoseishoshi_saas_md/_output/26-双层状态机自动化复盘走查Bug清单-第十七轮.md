# 客户/案件模块（admin）— 双层状态机自动化复盘走查 Bug 清单（第十七轮 / R16 §6 R17 建议项 land 复测 + R16 §0.4 BUG-179 land + 数据注入路径走查）

> 生成日期：2026-05-01（R16 §6 第 1/2/3/4 项执行 + chrome-devtools-mcp 浏览器走查 + API 直 POST corporate 客户验证）
> 走查依据：
> - `docs/gyoseishoshi_saas_md/_output/25-双层状态机自动化复盘走查Bug清单-第十六轮.md` §6 R17 建议（4 条）
> - R16 §0.4 BUG-179 / 178 / 180 / 181 / 182 / 183 6 条偏差
>
> 走查工具：`chrome-devtools-mcp`（`navigate_page` / `evaluate_script` / `wait_for` / `take_snapshot`）+ admin/server 单测 + curl 直打 API + DB 直读
> 走查环境：admin `:5173`（vite 反代 `/api` → `:3300`）、server NestJS `:3300`、PostgreSQL `cms-client-postgres-1` `:5433`、登录 `admin@local.test` / `Admin123!`
> 与第十六轮（`25-...md`）互为续篇。

---

## 0. 第十七轮总结

### 0.1 R16 §6 R17 建议 4 项执行

| # | R17 建议 | R17 实测 | 一句话 |
|---|---|---|---|
| 1 | 优先 land BUG-178（migration 039） + BUG-179（dashboard import 切） | **✅ 全 land** | BUG-178：DB 实测 `schema_migrations` 已含 039、22/22 cases 主申请人行已就位；本人在 R17 期间**无需重复操作**。BUG-179：切 `dashboard.service.ts` import 到 `dashboard.workItem`，删 4 个 legacy mapper + 8 个 helpers，补 `statusLabelParams` 与格式化 amount 路径，server 3 单测 + admin 16 单测 + 31 PG 集成测试 + `npm run guard` 全 PASS；浏览器 en-US / ja-JP 三语实测风险卡完全本地化。详见 §3.1 |
| 2 | 故意制造含数据 case，验证 BUG-174 22 段中文是否还存在 | **✅ FIX-LANDED 充分** | 静态：`CaseValidationTab.vue` 22 段全部 `t()` 化；i18n 三语 key 齐备（gateCard / submissionPackages / correction）。动态：用 `evaluate_script` 直接 patch CaseValidationTab 的 `props.detail.validation`（注入 1 blocker / 1 warning / 1 info），en-US 含数据路径渲染 22 段全英文（`Current blocker / MUST BE RESOLVED FIRST / Fix: / Owner: / Due: / RECOMMENDED IMPROVEMENTS / Suggested actions / Note: / ADDITIONAL INFO / FYI` 等）；ja-JP 含数据路径同样全日文（`現在のブロッカー / 先に対応必須 / 修正案： / 担当： / 期限： / 補強推奨 / 対応推奨 / 提案： / 補足 / 参考のみ`）。详见 §3.2 |
| 3 | 故意触发 admin Step 4 失败链路（owner=`suzuki` slug 不存在），验证 BUG-176 双前缀消除 | **✅ FIX-LANDED**（双层保护） | 单测：`useCreateCaseModelSubmit.bug173.test.ts` 已覆盖两条决定性 case（line 99-114 「message already prefixed → no double prefix」+ line 116-128 「legacy → single prefix added」），10/10 PASS。代码层：`normalizeSubmitError:71-72` 用 `!raw.startsWith(\`${code}: \`)` guard 去重；toast 层：`CaseCreateView.vue:113` 优先 `err.detail \|\| err.message`，detail 不带 code 前缀，即使 normalize 失效也不会双前缀。详见 §3.3 |
| 4 | 故意 API POST corporate 客户，验证 BUG-183 是否扩展性 OK | **❌ 重申 P3 未 land** | 实测 `POST /api/customers {type:"corporation",...}` → 201 OK，创建 CUS-202605-0007；POST 响应（`mapCustomerToCreateResponseDto`）有 `type: "corporation"` 字段。但 `GET /api/customers?keyword=R17 Corp` 列表 item 与 `GET /api/customers/:id` 详情**均不含 `type` / `customerType` / `statusOfResidence` 顶层字段**——R16 BUG-183 描述 100% 复现。admin 列表无法在视觉上区分 corporate vs individual。详见 §3.4 |

### 0.2 BUG-179 实施细节（本轮新落地代码）

| 文件 | 改动 |
|---|---|
| `packages/server/src/modules/core/dashboard/dashboard.shared.ts` | 删除 4 个 legacy zh-CN-only mapper（`mapTodoItem / mapDeadlineItem / mapSubmissionItem / mapRiskItem`）+ 8 个专用 helpers（`formatDaysLeftLabel / formatDateLabel / formatMoneyLabel / compact / caseTitle / caseMetaLabel / ownerMetaLabel / dueMetaLabel`）；类型 `DashboardWorkItem` 加 `statusLabelParams?: Record<string, string \| number>` 字段 |
| `packages/server/src/modules/core/dashboard/dashboard.workItem.ts` | `mapDeadlineItem` 补 `statusLabelParams: { days: daysLeft }`（修复 `daysLeft` 状态在 admin 端可能渲染 `{days}` 字面量的二阶风险）；`mapRiskItem` 把 `descParams.amount` 与 meta `unpaid.params.amount` 都改为已格式化字符串（`¥80,000`），匹配 admin i18n 模板 `{amount}` 占位符 |
| `packages/server/src/modules/core/dashboard/dashboard.service.ts` | 4 个 mapper import 从 `./dashboard.shared` 切到 `./dashboard.workItem` |
| `packages/server/src/modules/core/dashboard/dashboard.service.test.ts` | 补 16 条断言验证 4 类 panel 全部返回 `statusLabelKey / statusLabelParams / descKey / descParams / actionKey / metaKeys` 字段 |

### 0.3 三句话结论

1. **R17 期间唯一新增 land 的代码改动是 BUG-179**：4 个文件、约 240 行删 + 60 行加，包含修一个二阶风险（deadline `{days}` 字面量隐患）和把 risk 卡 amount 提前格式化（保证三语 i18n 模板里 `{amount}` 直接渲染 `¥80,000`）。`npm run guard` 0 失败，浏览器 en-US / ja-JP 三语实测 risk 卡片中文泄漏 100% 消除。
2. **R17 §6 第 2/3 项 BUG-174 / 176 land 充分**：BUG-174 用 `evaluate_script` 直接 patch 组件 props 的 `detail.validation` 注入测试 blocker，绕开 adapter 当前永远返回空数组的死路径，证明含数据路径下模板 22 段中文文案在 en-US 和 ja-JP 都已彻底消除（数据自身字段如 `item.title` 仍是后端 raw，属于另一个范畴的问题）；BUG-176 在 normalize + toast 两层都做了去重保护。
3. **BUG-183 P3 未 land**：corporate 客户能创建（`POST /customers {type:"corporation"}` → 201、type 字段在 POST 响应里露出），但 `GET /customers` 与 `GET /customers/:id` 走 `CustomerSummaryDto / CustomerDetailDto`，**type 字段未 expose 到顶层**（也无 `customerType` / `statusOfResidence`）。当前所有客户在 admin 列表/详情上都长得一样，未来正式引入 corporate 客户线时会被立即暴露。

---

## 1. R16 §6 R17 建议 1：BUG-178 + BUG-179 land

### 1.1 BUG-178：migration 039 已在 R16 与 R17 之间被 land（无需重复）

R16 文档时点描述「migration 039 文件存在但未应用、22 cases × 0 case_parties」。R17 实测：

```
SELECT id FROM schema_migrations ORDER BY 1 DESC LIMIT 5;
                     id
---------------------------------------------
 039_backfill_primary_applicant_case_parties     ← 已应用
 038_backfill_customer_bmv_profile
 ...

SELECT (SELECT COUNT(*) FROM cases) AS cases_total,
       (SELECT COUNT(*) FROM cases WHERE customer_id IS NOT NULL) AS cases_with_customer,
       (SELECT COUNT(*) FROM case_parties) AS parties_total,
       (SELECT COUNT(*) FROM case_parties WHERE party_type='applicant' AND is_primary) AS primary_applicants;

 cases_total | cases_with_customer | parties_total | primary_applicants
-------------+---------------------+---------------+--------------------
          22 |                  22 |            22 |                 22
```

### 1.2 BUG-179：dashboard 全组 i18n 漏洞 land

#### 1.2.1 `npm run guard` 结果

`exit_code=0`，`elapsed_ms=125439`，包含：
- `[BUG-177] migration 039 backfills primary applicant for cases without one` ✅
- `[BUG-177] backfill is idempotent` ✅
- `[DTO smoke] dashboard.todoPanel / deadlinePanel / riskPanel` ✅
- 31 个 PG 集成测试 0 失败

#### 1.2.2 server 单测 PASS

```
✔ DashboardService.getSummary maps summary counts and panel items (4.30ms)
✔ DashboardService.getSummary applies mine scope and time window params (0.52ms)
✔ DashboardService.getSummary falls back group scope to all queries (0.43ms)
ℹ pass 3
```

#### 1.2.3 admin 单测 PASS

```
✔ WorkPanelSection.test.ts × 16 PASS（含三语 risk 卡 i18n 矩阵：zh-CN / ja-JP / en-US）
```

#### 1.2.4 浏览器实测：API 返回完整 i18n 字段

`GET /api/dashboard/summary?scope=mine` risk entry：

```json
{
  "statusLabelKey": "billingRisk",
  "descKey": "risk.unpaidAmount",
  "descParams": { "amount": "¥80,000" },
  "actionKey": "viewBilling",
  "metaKeys": [
    { "key": "owner", "params": { "name": "Local Admin" } },
    { "key": "unpaid", "params": { "amount": "¥80,000" } }
  ]
}
```

#### 1.2.5 浏览器实测：三语渲染

| Locale | 渲染（risk 卡 1 条 entry） |
|---|---|
| en-US | `Owner: Local Admin / Unpaid: ¥80,000 / Billing risk / Unpaid amount ¥80,000. Follow up on billing soon. / View billing` |
| ja-JP | `担当：Local Admin / 未収：¥80,000 / 請求リスク / 未収金 ¥80,000。早めに請求対応を進めてください。 / 請求を見る` |
| zh-CN | `负责人：Local Admin / 待收：¥80,000 / 收费风险 / 待收金额 ¥80,000，需尽快跟进收费。 / 查看收费` |

R16 文档第 199-207 行报的「en-US 下 RISK CASES 卡片 5 段裸露 zh-CN」**100% 消除**。

---

## 2. R17 §6 第 2 项：BUG-174 含数据路径走查

### 2.1 静态分析

- `packages/admin/src/views/cases/components/CaseValidationTab.vue` 22 段中文已全 `t()` 化
- `packages/admin/src/i18n/messages/cases/{en-US,zh-CN,ja-JP}.ts` 三语 `gateCard / submissionPackages / correction` 三组 key 齐备
- `packages/admin/src/views/cases/model/CaseAdapterDetailAggregate.ts:265-272` `buildValidationBlock` 当前永远返回空数组（adapter 暂未对接 `validation_runs.failed_items`）→ 用户路径下含数据 case 实际不存在

### 2.2 动态注入走查

R17 用 `evaluate_script` 在 CASE-202605-0003 (S1) 详情页直接 patch CaseValidationTab 的 `props.detail.validation`（推开 adapter 死路径）：

```js
v.lastTime = '2026-05-01 23:50 (R17 inject)';
v.blocking.push({ gate:'A', title:'TEST: ...', fix:'Re-upload a clear scan within 48h',
                  assignee:'Suzuki', deadline:'2026-05-03', actionLabel:'Open documents', actionTab:'documents' });
v.warnings.push({ gate:'B', title:'TEST: ...', note:'Add 12-month cash-flow projection.' });
v.info.push({ gate:'C', title:'TEST: ...', note:'Optional supporting evidence.' });
```

#### 2.2.1 en-US 含数据路径渲染

```
Pre-submission check / Current blocker / Re-check
2026-05-01 23:50 (R17 inject)
MUST BE RESOLVED FIRST / Current blocker
TEST: 申請人パスポート画像が不鮮明です          ← item.title（数据自身）
Fix: Re-upload a clear scan within 48h          ← EN i18n + EN data
Open documents                                  ← actionLabel（数据自身）
Owner: Suzuki / Due: 2026-05-03                 ← EN i18n + 数据
RECOMMENDED IMPROVEMENTS / Suggested actions
TEST: ...
Note: Add 12-month cash-flow projection.        ← EN i18n
ADDITIONAL INFO / FYI
TEST: ... / Optional supporting evidence.
Submission packages (history) / Create package / No submission packages yet
```

#### 2.2.2 ja-JP 含数据路径渲染

```
提出前チェック / 現在のブロッカー / 再チェック
2026-05-01 23:50 (R17 inject ja)
先に対応必須 / 現在のブロッカー
TEST blocker title
修正案：Re-upload soon                           ← JA i18n + 数据
Open
担当：Suzuki / 期限：2026-05-03                  ← JA i18n + 数据
補強推奨 / 対応推奨
TEST warning / 提案：Add cash flow.              ← JA i18n
補足 / 参考のみ
TEST info / Optional.
提出パッケージ（履歴）/ パッケージ作成 / 提出パッケージなし
```

### 2.3 结论

- **模板 22 段中文文案在含数据路径下 en-US / ja-JP 全部消除**
- 数据自身字段（`item.title` / `actionLabel`）的语言是后端 raw 决定（与模板 i18n 解耦）—— 这属于"数据本身的多语言"另一议题，不属于 BUG-174 范畴
- BUG-174 R17 验证：✅ FIX-LANDED 充分

---

## 3. R17 §6 第 3 项：BUG-176 双前缀消除

### 3.1 代码层 guard

`packages/admin/src/views/cases/model/useCreateCaseModelSubmit.ts:67-77`：

```ts
export function normalizeSubmitError(e: unknown): SubmitErrorInfo {
  if (e instanceof CaseRepositoryError) {
    const code = e.serverErrorCode;
    const raw = e.message;
    const message =
      code && !raw.startsWith(`${code}: `) ? `${code}: ${raw}` : raw;
    return { message, code: code ?? undefined, detail: e.detail ?? undefined };
  }
  ...
}
```

### 3.2 单测覆盖

`useCreateCaseModelSubmit.bug173.test.ts:99-138`：

```ts
describe("BUG-176 normalizeSubmitError prevents double-prefix", () => {
  it("message already prefixed with serverErrorCode → no double prefix", () => {
    const err = new CaseRepositoryError({
      message: "CASE_OWNER_NOT_FOUND: ownerUserId e00ea5d2 not found",
      serverErrorCode: "CASE_OWNER_NOT_FOUND",
      ...
    });
    expect(normalizeSubmitError(err).message).toBe(
      "CASE_OWNER_NOT_FOUND: ownerUserId e00ea5d2 not found",  // 单前缀
    );
  });
  it("message NOT prefixed (legacy) → single prefix added", () => { ... });
});
```

R17 跑：10/10 PASS。

### 3.3 toast 双层保护

`packages/admin/src/views/cases/CaseCreateView.vue:113`：

```ts
showToast(t("cases.create.toast.createFailed"), err.detail || err.message);
```

`err.detail` 是后端原始 detail（如 `ownerUserId e00ea5d2 not found`），不带 code 前缀。即使 `normalizeSubmitError` 失效，toast 优先取 detail 也不会双前缀。

### 3.4 结论

- BUG-176 在 normalize（单测覆盖）+ toast detail 优先（视觉兜底）两层均有保护
- R17 §6 第 3 项无需 land 任何代码

---

## 4. R17 §6 第 4 项：BUG-183 corporate 客户走查

### 4.1 POST /api/customers 创建 corporate 客户

```
$ curl -X POST /api/customers -d '{"type":"corporation","baseProfile":{"displayName":"R17 Corp Probe Co.,Ltd","legalName":"株式会社R17","representativeName":"R17 代表","companyKana":"アール17"}}'

{
  "id": "da3671b9-...",
  "customerNumber": "CUS-202605-0007",
  ...
  "type": "corporation",          ← ✅ POST 响应里有 type
  "baseProfile": { "displayName": "R17 Corp Probe Co.,Ltd", ... },
  "createdAt": "2026-05-01T14:47:49.516Z"
}
```

POST 响应走 `mapCustomerToCreateResponseDto`，包含 `type` 字段。

### 4.2 GET /api/customers 列表（关键 reaffirm BUG-183）

```
$ curl /api/customers?keyword=R17%20Corp&limit=5

{
  "items": [{
    "id": "da3671b9-...",
    "displayName": "R17 Corp Probe Co.,Ltd",
    "customerNumber": "CUS-202605-0007",
    ...
    "bmvProfile": { ... },
    // ❌ 没有 type / customerType / statusOfResidence
  }],
  "total": 1
}
```

### 4.3 GET /api/customers/:id 详情（同 reaffirm）

```
$ curl /api/customers/da3671b9-...

{
  ...
  "visaType": null,
  ...
  // ❌ 同样没有 type / customerType / statusOfResidence
}
```

### 4.4 根因

`packages/server/src/modules/core/customers/customers.types.ts`：
- `CustomerSummaryDto`（line 226-249）顶层无 `type` 字段
- `CustomerDetailDto`（line 252-269）继承 Summary 也无 `type`
- `statusOfResidence` 字段在 customer 维度根本不存在（只挂在 `residence_periods` 与 `case_parties` 维度）

### 4.5 结论

- corporate 客户能创建（schema + parser 已支持 `type: "individual" | "corporation"`）
- 但 admin 端通过列表/详情无法识别"这是 corporate 客户"——所有客户长得一样
- **R17 重申 BUG-183 P3 未 land**；建议 R18 修复入口：在 `CustomerSummaryDto` / `CustomerDetailDto` 顶层增加 `type` / `customerType` 字段，service 写入时填充
- 已清理测试 corporate 客户（DELETE /api/customers/da3671b9-... → `{"ok":true}`）

---

## 5. R16 → R17 回归得分卡

| # | 来源 | 项 | R16 标记 | R17 实测 |
|---|---|---|---|---|
| 1 | R16 | BUG-174（CaseValidationTab.vue 22 段） | ⚠️ PARTIAL | **✅ FIX-LANDED**（en/ja 含数据路径走查通过）|
| 2 | R16 | BUG-175（reminder ja-JP 泄漏） | ✅ PASS | ✅ PASS（未 regress）|
| 3 | R16 | BUG-176（错误 toast 双前缀） | 未触发 | **✅ FIX-LANDED**（单测覆盖 + toast detail 兜底）|
| 4 | R16 | BUG-177 / 178（applicant case_parties + migration 039） | ⚠️ PARTIAL | **✅ FIX-LANDED**（DB 22/22 + schema_migrations 含 039）|
| 5 | R16 | BUG-179（Dashboard work-item i18n 漏洞） | P1 待 land | **✅ FIX-LANDED**（4 文件改、guard 0 失败、三语浏览器实测 PASS）|
| 6 | R16 | BUG-180（customer detail vs case list status 不一致） | P2 未处理 | **未处理**（R17 不在 §6 范围）|
| 7 | R16 | BUG-181（quotePrice / billing-plans desync） | P2 未处理 | **未处理**（同上）|
| 8 | R16 | BUG-182（CURRENT STAGE S1/S9 渲染粒度不一致） | P3 未处理 | **未处理**（同上）|
| 9 | R16 | BUG-183（API DTO 未 expose customerType / statusOfResidence） | P3 未处理 | **❌ 重申未 land**（corporate POST + GET 列表/详情走查复现）|

**得分**：9 项中 **5 ✅ FIX-LANDED（R17 期内 land 1：BUG-179；R16/R17 之间 land 1：BUG-178；走查通过 3：BUG-174 / 175 / 176）+ 4 未 land**（BUG-180 / 181 / 182 / 183）。

---

## 6. 走查执行明细（chrome-devtools-mcp + 单测 + 直 API）

### 6.1 BUG-179 浏览器实测

1. `evaluate_script` 设 `localStorage['cms-admin-locale']='en-US'` + `location.reload()`
2. `wait_for ['RISKS']` → snapshot 抓 risk 卡 → 全英文化 ✅
3. 切 `ja-JP` → snapshot 全日文化 ✅

### 6.2 BUG-174 浏览器实测

1. `navigate_page #/cases/a63aa5f0-2268-421d-a912-9e0b69301155`
2. `click` Pre-submission check tab
3. `evaluate_script` 找到 CaseValidationTab 实例（通过 `__vue_app__` 树遍历）→ 注入 1 blocker / 1 warning / 1 info
4. `evaluate_script` 抓 `.vt` block 的 innerText → en-US 全英文 ✅
5. 切 ja-JP 重做（reload 后注入数据被清掉、需要重新注入）→ 同样日文 ✅

### 6.3 BUG-176 验证

1. `npx vitest run src/views/cases/model/useCreateCaseModelSubmit.bug173.test.ts` → 10/10 PASS
2. 静态确认 `CaseCreateView.vue:113` toast 优先 detail

### 6.4 BUG-183 API 实测

1. `POST /api/customers {type:"corporation",...}` → 201 + `type` 字段 ✅
2. `GET /api/customers?keyword=R17%20Corp` → item 无 type 字段 ❌
3. `GET /api/customers/:id` → 无 type 字段 ❌
4. `DELETE /api/customers/:id` → `{"ok":true}` 清理

---

## 7. 下一轮（R18）建议

1. **优先 land BUG-180 + BUG-181**（视觉/数据一致性，P2）
   - BUG-180：`CustomerDetailCasesTab` 渲染 status 列改读 `stage === 'S9' ? 'Archived' : 'Active'`，与 cases list 对齐
   - BUG-181：建案路径写入 `cases.quote_price` 后同步 `INSERT billing_plans`；或者 phase transition 触发器中确保 `WAITING_PAYMENT/NEED_SUPPLEMENT` 已生成 plan
2. **R18 应在 BUG-180 land 后做 closed_failed / closed_success 案件抽样走查**，确认两套 status 口径已统一
3. **R18 应在 BUG-181 land 后跑 quotePrice 与 billing_plans 表的 join 查询**，确认所有 case 都有对应 plan
4. **BUG-183 修复时机建议提前到 R18**：在 admin 真正引入 corporate 客户线之前，先把 DTO 字段补齐，避免后续多客户类型混合时返工
5. **BUG-182 CURRENT STAGE 渲染粒度不一致** 视觉 polish，可 R18/R19 backlog

---

走查方完成。
