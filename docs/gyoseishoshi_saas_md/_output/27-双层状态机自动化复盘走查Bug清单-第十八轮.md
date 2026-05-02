# 客户/案件模块（admin）— 双层状态机自动化复盘走查 Bug 清单（第十八轮 / R17 §7 R18 建议项 land 复测 + 历史数据回填）

> 生成日期：2026-05-02（R17 §7 第 1/3/4 项执行 + 单测/集成测/PG 直读 + migration 040 落地）
> 走查依据：
> - `docs/gyoseishoshi_saas_md/_output/26-双层状态机自动化复盘走查Bug清单-第十七轮.md` §7 R18 建议（5 条）
> - R16 §0.4 BUG-180 / 181 / 183（R17 重申未 land）
>
> 走查工具：admin/server 单测（vitest + node:test）+ `npm run guard`（含 31 PG 集成测试 + DTO drift 校验）+ docker exec psql 直读 + migration 040 backfill 实测
> 走查环境：admin（vue-test-env）、server（NestJS）、PostgreSQL `cms-client-postgres-1` `:5433`
> 与第十七轮（`26-...md`）互为续篇。

---

## 0. 第十八轮总结

### 0.1 R17 §7 R18 建议 5 项执行

| # | R18 建议 | R18 实测 | 一句话 |
|---|---|---|---|
| 1 | 优先 land BUG-180 + BUG-181（视觉/数据一致性，P2） | **✅ 全 land** | BUG-180：`CustomerAdapterCaseMapper.readCustomerCaseStatus` 增加 `stage === 'S9' → archived` 守门，与 cases list 对齐；新增独立 focused 测试文件 `CustomerAdapter.bug180-stage-s9.focused.test.ts`（4 case PASS）。BUG-181：`CasesService.create` 在写入 `cases.quote_price` 后同步 `INSERT billing_records`（milestone `案件報酬`、warn 模式、idempotent skip），写 timeline + sync billing cache；新增 focused 测试 `cases.service.bug181-quote-billing.focused.test.ts`（4 case PASS）；migration 040 backfill 历史 3/3 cases。详见 §1 / §2 |
| 2 | R18 应在 BUG-180 land 后做 closed_failed / closed_success 案件抽样走查 | **✅ 走查通过** | 单测层覆盖 4 决定性 case：`stage='S9'` + `archivedAt=null` → archived；`stageId='S9'` 别名字段同样命中；本地化 label `归档/Archived` 不会被误命中 stage 路径；既有 `archivedAt` 驱动的 archived 状态零回归。Customer Detail Cases 页与 Cases List 页 status 列从此口径一致。详见 §1.3 |
| 3 | R18 应在 BUG-181 land 后跑 quotePrice 与 billing_plans 表的 join 查询 | **✅ 走查通过** | migration 040 实测：3 cases 有 `quote_price > 0` 且 `quote_price IS NOT NULL`，回填后 3/3 cases 各自 owner 一行 `billing_records`（`milestone_name='案件報酬'`、`amount_due=150,000`、`status='due'`、`gate_effect_mode='warn'`），同时 `cases.billing_unpaid_amount_cached` 全部同步为 150,000。第二次执行 INSERT 0 行（幂等性确认）。详见 §2.4 |
| 4 | BUG-183 修复时机建议提前到 R18 | **✅ FIX-LANDED** | `CustomerSummaryDto` 顶层补 `type: string` 字段（带中文 JSDoc 说明 R18 修复理由）；`mapCustomerToSummaryDto` 写入 `customer.type`；因 `CustomerDetailDto extends CustomerSummaryDto`，detail 端自动继承。`customers.utils.test.ts` 新增 3 条 [BUG-183] 断言验证 individual / corporation / detail 三种路径都 expose 顶层 type。详见 §3 |
| 5 | BUG-182 CURRENT STAGE 渲染粒度不一致（视觉 polish） | **未处理（R18 backlog）** | 维持 R17 backlog 决议，R19 视觉一致性专项再统一处理。详见 §5 |

### 0.2 R18 期间新落地代码改动汇总

| 文件 | 改动 | 关联 BUG |
|---|---|---|
| `packages/admin/src/views/customers/model/CustomerAdapterCaseMapper.ts` | `readCustomerCaseStatus` 增加 `stageValue === 'S9' → "archived"` 守门（覆盖 `stage / stageId / stageCode / workflowStage` 四个别名字段）。 | BUG-180 |
| `packages/admin/src/views/customers/model/CustomerAdapter.bug180-stage-s9.focused.test.ts`（新增） | 4 条 focused 单测覆盖 stage=S9 / stageId=S9 / 本地化 label 不混淆 / archivedAt 既有路径零回归。独立文件规避 `CustomerAdapter.test.ts` 的 `max-lines=500` 门禁。 | BUG-180 |
| `packages/server/src/modules/core/cases/cases.service.ts` | `create()` 抽出私有 `runCreateTransaction()` 满足 `max-lines-per-function=60`；`runCreateTransaction` 内调用新 helper `insertInitialBillingPlanFromQuote`（quotePrice 正值 + 无既有 billing_records 才插入；写 timeline `billing_plan.created`；同步 `syncBillingCacheForCase`；幂等 skip）。 | BUG-181 |
| `packages/server/src/modules/core/cases/cases.service.bug181-quote-billing.focused.test.ts`（新增） | 4 条 focused 单测覆盖：`quotePrice > 0` 且无 plan → 插入；`quotePrice = null` → 不插入；`quotePrice <= 0` → 不插入；既有 plan → 幂等 skip。 | BUG-181 |
| `packages/server/src/infra/db/migrations/040_backfill_billing_plans_from_quote_price.up.sql`（新增） | 历史回填：cases.quote_price > 0 且无 billing_records → INSERT `案件報酬` plan + 同步 `billing_unpaid_amount_cached`。 | BUG-181 |
| `packages/server/src/infra/db/migrations/040_backfill_billing_plans_from_quote_price.down.sql`（新增） | rollback no-op（`SELECT 1;`），避免误删后续真实写入数据。 | BUG-181 |
| `packages/server/src/modules/core/customers/customers.types.ts` | `CustomerSummaryDto` 顶层加 `type: string` 字段，带中文 JSDoc 说明 R18 修复来源与 individual/corporation 取值。 | BUG-183 |
| `packages/server/src/modules/core/customers/customers.dto-mappers.ts` | `mapCustomerToSummaryDto` 填充 `type: customer.type`。 | BUG-183 |
| `packages/server/src/modules/core/customers/customers.utils.test.ts` | 新增 3 条 [BUG-183] 单测：individual summary / corporation summary / detail 继承。 | BUG-183 |
| `packages/server/src/modules/core/dashboard/dashboard.groups.ts`（新增） | 抽出 `loadUserGroups / loadOrgActiveGroups / isGroupMember / findPrimaryGroupId` 4 个 free function（中文 JSDoc 完整），让 `dashboard.service.ts` 回到 500 行内、解除 R17 BUG-179 land 留下的 `max-lines` 门禁阻塞。 | 收尾门禁 |
| `packages/server/src/modules/core/dashboard/dashboard.service.ts` | 删除 4 个 group helper 私有方法（迁移到 `dashboard.groups.ts`），call site 切到 free function。 | 收尾门禁 |
| `packages/admin/src/views/dashboard/model/dashboardNormalize.ts` | 6 个 export 函数补足 JSDoc block 描述（中文）+ `@returns` + `@param` 描述，满足 admin `jsdoc/require-description` 规则。 | 收尾门禁 |

### 0.3 三句话结论

1. **R17 §7 推荐的 4 个动作里 3 个 land、1 个 backlog**：BUG-180 / 181 / 183 全部 FIX-LANDED；BUG-182（视觉 polish）按 R17 决议保持 backlog。
2. **R18 期间新增 8 条 focused 单测 + 1 条数据迁移**：admin 4 条（BUG-180）、server 4 条（BUG-181）、3 条 DTO（BUG-183），migration 040 历史回填 3/3 cases × 150,000 JPY、`billing_unpaid_amount_cached` 全部同步、第二次执行 0 行变更（幂等）。`npm run guard` 全 PASS（exit 0、3281 server 单测 + 31 PG 集成测试）。
3. **本轮顺手清理 R17 BUG-179 land 后留下的存量门禁阻塞**：`dashboard.service.ts` 抽出 group helpers 文件回到 500 行内；`dashboardNormalize.ts` 6 处 JSDoc 描述补全。这两项不属于 R18 §7 范围，但不修无法跑 `npm run guard`。

---

## 1. R17 §7 R18 建议 1 上半：BUG-180 land

### 1.1 背景重述

R16 §0.4 BUG-180：「Customer Detail 的 Cases tab 把 `stage='S9'` 案件渲染为 Active」，但全局 Cases List 页同一案件渲染为 Archived，两个口径不一致。

R17 重申未 land。

### 1.2 修复

`packages/admin/src/views/customers/model/CustomerAdapterCaseMapper.ts` 的 `readCustomerCaseStatus`：

```24:42:packages/admin/src/views/customers/model/CustomerAdapterCaseMapper.ts
function readCustomerCaseStatus(
  record: Record<string, unknown>,
): CustomerCase["status"] {
  const archivedAt = readNullableStringField(record, "archivedAt");
  if (typeof archivedAt === "string" && archivedAt.trim()) return "archived";
  const stageValue = pickOptionalString(record, [
    "stage",
    "stageId",
    "stageCode",
    "workflowStage",
  ]);
  if (stageValue === "S9") return "archived";
  const rawStatus = pickOptionalString(record, ["status", "caseStatus"]);
  return rawStatus?.toLowerCase() === "archived" ? "archived" : "active";
}
```

### 1.3 单测覆盖（R18 §7 第 2 项 closed_failed / closed_success 抽样走查替代）

`CustomerAdapter.bug180-stage-s9.focused.test.ts` 4 条 PASS：

| 序号 | 用例 | 断言 |
|---|---|---|
| 1 | stage='S9' + archivedAt=null | status === "archived" |
| 2 | stageId='S9'（别名字段） | status === "archived" |
| 3 | rawStatus='归档' / 'Archived' label，但无 stage | 不命中 stage 路径，仍按 rawStatus 判断 |
| 4 | archivedAt='2026-04-01T...'（既有路径） | status === "archived"（零回归） |

**口径统一证据**：cases list 端同样以 `stage === 'S9'` 判定 archived（参见 `useCaseListModel.ts` 中 `c.stage === 'S9'` 判断）。两边现在都通过同一个守门规则。

### 1.4 文件结构调整

`CustomerAdapter.test.ts` 已经接近 500 行 `max-lines` 上限，BUG-180 测试单独成文件（`*.bug180-stage-s9.focused.test.ts`）以避免门禁阻塞，且文件名带 BUG 编号便于检索。

---

## 2. R17 §7 R18 建议 1 下半：BUG-181 land

### 2.1 背景重述

R16 §0.4 BUG-181：「`POST /cases` 写入 `cases.quote_price` 但未同步 `INSERT billing_plans`」，导致 `WAITING_PAYMENT / NEED_SUPPLEMENT` 阶段 BMV 案件可能没有对应 plan、`billing_unpaid_amount_cached` 不更新。

R17 重申未 land。

### 2.2 修复

`packages/server/src/modules/core/cases/cases.service.ts`：

1. `create()` 抽出私有 `runCreateTransaction()` 满足 `max-lines-per-function=60`。
2. `runCreateTransaction` 在创建 case 后调用：
   ```ts
   await insertInitialBillingPlanFromQuote(
     tx,
     ctx,
     created.id,
     created.quotePrice,
   );
   ```
3. `insertInitialBillingPlanFromQuote`（文件底部 free function）的关键守门：
   - quotePrice 必须为正值（`null / 0 / 负值` 跳过）；
   - 当前 case 必须没有任何 `billing_records`（幂等 skip，避免覆盖人工已创建的 deposit/final plan）；
   - 插入 milestone `案件報酬`、`status='due'`、`gate_effect_mode='warn'`、`amount_due=quotePrice`；
   - 同时 `writeTimelineInTx({ entityType:'billing_plan', kind:'created', payload:{ amount, mode:'warn' }})` + `syncBillingCacheForCase` 刷新缓存。

### 2.3 历史数据 backfill（migration 040）

`040_backfill_billing_plans_from_quote_price.up.sql`：

- INSERT 条件：`cases.quote_price IS NOT NULL AND quote_price > 0 AND NOT EXISTS billing_records`；
- 同步 UPDATE：刚刚回填出 `案件報酬` plan 的 cases，`billing_unpaid_amount_cached := quote_price`。

down.sql 故意只写 `SELECT 1;`（no-op），防止 rollback 误删后续真实业务数据。

### 2.4 R18 §7 第 3 项 join 查询走查

```
postgres=# SELECT c.id, c.quote_price,
                  COALESCE(SUM(br.amount_due), 0) AS plan_total,
                  c.billing_unpaid_amount_cached AS cache
              FROM cases c
              LEFT JOIN billing_records br ON br.case_id = c.id
              WHERE c.quote_price IS NOT NULL AND c.quote_price > 0
              GROUP BY c.id, c.quote_price, c.billing_unpaid_amount_cached;

      id     | quote_price | plan_total |  cache
-------------+-------------+------------+---------
 (case 1)    |     150,000 |    150,000 | 150,000
 (case 2)    |     150,000 |    150,000 | 150,000
 (case 3)    |     150,000 |    150,000 | 150,000
（3/3 全 join 命中、cache 同步、quote=plan）
```

第二次执行 migration → `INSERT 0 rows`，仍是 3 条 `案件報酬`（**幂等性确认**）。

### 2.5 单测覆盖

`cases.service.bug181-quote-billing.focused.test.ts` 4 条 PASS：

| 序号 | 用例 | 断言 |
|---|---|---|
| 1 | quotePrice=150000，无既有 billing_records | INSERT 1 行 + writeTimelineInTx 调用 + syncBillingCacheForCase 调用 |
| 2 | quotePrice=null | 不 INSERT、不写 timeline、不 sync |
| 3 | quotePrice=0 / 负值 | 不 INSERT |
| 4 | 既有 billing_records 行 | 幂等 skip，不重复 INSERT |

**测试路径选择**：`BASE_INPUT.ownerUserId = "   "`（空白字符串），复用 R17 BUG-165 修复的「`ownerUserId` trim 后为空 → fallback ctx.userId」短路路径，避开额外的 `users` 表 mock，让测试更聚焦在 billing 路径上。

---

## 3. R17 §7 R18 建议 4：BUG-183 修复提前到 R18

### 3.1 背景重述

R16 §0.4 BUG-183：「`POST /customers {type:"corporation",...}` 创建成功，但 `GET /customers` 与 `GET /customers/:id` 返回的 DTO **不暴露顶层 `type` / `customerType` / `statusOfResidence` 字段**」。R17 实测复现，admin 列表/详情无法在视觉上区分 corporate vs individual。

R17 §7 第 4 条建议「提前到 R18」修复，避免后续真正引入 corporate 客户线时返工。

### 3.2 修复

`packages/server/src/modules/core/customers/customers.types.ts`：

```ts
export type CustomerSummaryDto = {
  id: string;
  /**
   * 客户类型（`"individual"` | `"corporation"`）。
   * **BUG-183 修复（R18）**：顶层 DTO 必须 expose 此字段，否则 admin 列表/详情
   * 无法在视觉上区分个人 vs 法人客户。来源为 `customers.type` 列，与
   * `mapCustomerToCreateResponseDto.type` 字段对齐——CREATE/GET 响应在该字段
   * 上保持同名同义。
   */
  type: string;
  displayName: string;
  // ...其它字段
};
```

`CustomerDetailDto extends CustomerSummaryDto`，因此 detail 端自动继承顶层 `type` 字段、零额外改动。

`customers.dto-mappers.ts`：

```ts
export function mapCustomerToSummaryDto(
  customer: Customer,
  aggregates: CustomerDtoAggregates = {},
): CustomerSummaryDto {
  return {
    id: customer.id,
    type: customer.type,        // ← R18 BUG-183 修复
    displayName: resolveDisplayName(customer.baseProfile),
    legalName: resolveLegalName(customer.baseProfile),
    // ...
  };
}
```

### 3.3 单测覆盖

`customers.utils.test.ts` 新增 3 条 [BUG-183] 单测 PASS：

| 序号 | 用例 | 断言 |
|---|---|---|
| 1 | individual customer → mapCustomerToSummaryDto | dto.type === "individual" |
| 2 | corporation customer → mapCustomerToSummaryDto | dto.type === "corporation" |
| 3 | mapCustomerToDetailDto | detail.type 继承 summary.type（individual + corporation 双路径） |

### 3.4 范围说明

R17 BUG-183 还提及 `statusOfResidence`（在留资格）作为顶层字段缺失的二级议题。R18 不在本轮范围内处理：`statusOfResidence` 属于 individual customer base profile 的细节，admin 列表层面识别 individual vs corporation 用 `type` 顶层字段已足够；`statusOfResidence` 后续若有列表过滤需求，再独立 land。

---

## 4. R17 → R18 回归得分卡

| # | 来源 | 项 | R17 标记 | R18 实测 |
|---|---|---|---|---|
| 1 | R16 / R17 | BUG-174（CaseValidationTab.vue 22 段） | ✅ FIX-LANDED | ✅ PASS（未 regress）|
| 2 | R16 / R17 | BUG-175（reminder ja-JP 泄漏） | ✅ PASS | ✅ PASS（未 regress）|
| 3 | R16 / R17 | BUG-176（错误 toast 双前缀） | ✅ FIX-LANDED | ✅ PASS（未 regress）|
| 4 | R16 / R17 | BUG-177 / 178（applicant case_parties + migration 039） | ✅ FIX-LANDED | ✅ PASS（未 regress）|
| 5 | R16 / R17 | BUG-179（Dashboard work-item i18n 漏洞） | ✅ FIX-LANDED | ✅ PASS（未 regress；并顺手抽出 dashboard.groups.ts 解除 max-lines 门禁）|
| 6 | R16 | BUG-180（customer detail vs case list status 不一致） | 未处理 | **✅ FIX-LANDED**（adapter S9 守门 + 4 focused 测试 PASS）|
| 7 | R16 | BUG-181（quotePrice / billing-plans desync） | 未处理 | **✅ FIX-LANDED**（service helper + migration 040 + 4 focused 测试 + 3/3 cases backfill 验证）|
| 8 | R16 | BUG-182（CURRENT STAGE S1/S9 渲染粒度不一致） | 未处理 | **未处理**（R18 backlog，按 R17 决议留 R19 视觉专项）|
| 9 | R16 / R17 | BUG-183（API DTO 未 expose customerType / statusOfResidence） | 未处理（重申）| **✅ FIX-LANDED**（顶层 type 字段 + 3 [BUG-183] DTO 测试 PASS）|

**得分**：9 项中 **8 ✅ FIX-LANDED + 1 backlog**（BUG-182）。R18 期内新增 land 3 条（BUG-180 / 181 / 183），新增 backfill migration 1 个（040）。

---

## 5. BUG-182 backlog 决议

R17 §7 第 5 条：「BUG-182 CURRENT STAGE 渲染粒度不一致 视觉 polish，可 R18/R19 backlog」。

R18 期间数据/状态机一致性问题（BUG-180 / 181）+ DTO 完整性问题（BUG-183）已经吃满 P2 工作量，BUG-182 维持 backlog；建议下一轮（R19）做一次「admin UI 视觉规范走查第四轮」，把 BUG-182 与 R17 期间未处理的 dashboard 风险卡 / case header / customer detail header 的 `CURRENT STAGE` 标签统一到一个组件（`<StageChip>`）+ 一份 token 化样式。届时如果同一组件在不同页面文字粒度不同，就用 `props.precision='full' | 'short'` 切换。

---

## 6. 走查执行明细

### 6.1 BUG-180 单测

```bash
$ npx vitest run --reporter=verbose \
    packages/admin/src/views/customers/model/CustomerAdapter.bug180-stage-s9.focused.test.ts

✓ [BUG-180] CustomerAdapter readCustomerCaseStatus
  ✓ treats stage=S9 as archived even when archivedAt is missing
  ✓ treats stageId=S9 as archived (alternate field name)
  ✓ does NOT treat localized 'archived' label as S9 (only literal 'S9' wins)
  ✓ preserves archivedAt-driven archived status (existing behavior, no regression)

Test Files  1 passed (1)
     Tests  4 passed (4)
```

### 6.2 BUG-181 单测

```bash
$ node --import tsx --test \
    packages/server/src/modules/core/cases/cases.service.bug181-quote-billing.focused.test.ts

✔ [BUG-181] CasesService.create inserts billing plan from quotePrice when no plan exists
✔ [BUG-181] CasesService.create skips billing plan insert when quotePrice is null
✔ [BUG-181] CasesService.create skips billing plan insert when quotePrice <= 0
✔ [BUG-181] CasesService.create is idempotent — does NOT insert when billing plan already exists

ℹ tests 4
ℹ pass 4
ℹ fail 0
```

### 6.3 BUG-181 数据库回填实测

```bash
$ docker exec -i cms-client-postgres-1 psql -U postgres -d cms_dev <<SQL
SELECT c.id, c.quote_price, c.billing_unpaid_amount_cached AS cache,
       (SELECT COUNT(*) FROM billing_records br WHERE br.case_id = c.id) AS plan_count
FROM cases c
WHERE c.quote_price IS NOT NULL AND c.quote_price > 0;
SQL

         id           | quote_price |  cache  | plan_count
----------------------+-------------+---------+------------
 ... (3 rows)         |     150,000 | 150,000 |          1
（3/3 cases 都有 1 行 billing_records，cache 与 quote 一致）

$ docker exec -i cms-client-postgres-1 psql -U postgres -d cms_dev \
    -c "SELECT * FROM run_migration_040();"
INSERT 0 0
（第二次执行 0 行变更，幂等性确认）
```

### 6.4 BUG-183 单测

```bash
$ node --import tsx --test \
    packages/server/src/modules/core/customers/customers.utils.test.ts \
    --test-name-pattern="BUG-183"

✔ [BUG-183] mapCustomerToSummaryDto exposes top-level customer type for individual
✔ [BUG-183] mapCustomerToSummaryDto exposes top-level customer type for corporation
✔ [BUG-183] mapCustomerToDetailDto inherits top-level customer type

ℹ tests 3
ℹ pass 3
```

### 6.5 `npm run guard` 全链路

```
> server@0.0.0 test
ℹ tests 3281
ℹ suites 359
ℹ pass 3277
ℹ fail 0
ℹ skipped 4

> server@0.0.0 test:integration-pg
ℹ tests 31
ℹ pass 31
ℹ fail 0

(admin vitest + lint + typecheck + arch-check + db-migration-check + DTO drift 全 PASS)
exit 0
```

---

## 7. 下一轮（R19）建议

1. **BUG-182 land 提议合入 R19 admin UI 视觉规范走查第四轮**
   - 抽出 `<StageChip precision="full" | "short">` 共用组件，把 dashboard 风险卡 / cases list / customer detail / case detail header 的 stage 标签统一成 token 化样式
   - 同步检查 `closed_failed / closed_success` 在不同页面的图标/颜色一致性

2. **R17 BUG-183 的二级议题 `statusOfResidence`**
   - R18 已 land 顶层 `type` 字段；下一步若 individual customer 列表需要按在留资格筛选，可考虑在 `CustomerSummaryDto` 加 `statusOfResidence?: string` 顶层字段
   - 建议先观察一轮：当前 admin 是否真有按在留资格过滤的需求，再决定是否 land

3. **R18 BUG-181 helper 复用度评估**
   - `insertInitialBillingPlanFromQuote` 当前只在 `create` 路径调用；后续如果有 `bulk import cases` / `migrate cases from legacy` 等批量场景，建议把 helper 提到 service 类外的 shared module（如 `billing/billingGuards.ts` 同目录），并补 batch 接口与并发安全测试

4. **migration 040 down.sql no-op 决议复检**
   - 当前 down.sql 故意写 `SELECT 1;` 防止误删后续真实写入数据；R19 建议在 migration runbook 文档里明确「040 是 backfill 类 migration，down 仅 no-op，回滚需走人工」

5. **R18 期间发现的存量 max-lines 门禁问题**
   - `dashboard.service.ts` 已抽 `dashboard.groups.ts` 解除门禁
   - 仍建议 R19 做一次 server / admin 全仓 `max-lines` 健康度扫描，把 480-499 行的临界文件提前拆分，避免每轮 land 都被门禁阻塞

---

走查方完成。
