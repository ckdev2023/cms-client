# 68 — R-FLOW6-CUS 修复回归验证

> 日期: 2026-05-08
> 范围: 第六轮走查 R-FLOW6-CUS-A-1…A-6 共 6 条 P2 缺陷闭合
> Guard 结果: **全绿** — 558 test files passed, 8370 tests passed, 0 failed

---

## Epic A — sourceChannel 回读（R-FLOW6-CUS-A-1）

| 修复点 | 关键证据 | 测试 |
|--------|----------|------|
| A-1: `customers.dto-mappers.ts` 新增 `pickSourceType` 显式映射表（提取至 `customers.source-type.ts`） | PG `base_profile.sourceChannel='web'` 小写值通过 `SOURCE_CHANNEL_TO_TYPE` 映射为 `"WEB"` | `customers.dto-mappers.bug158.focused.test.ts` — 6 条映射用例全绿 |
| A-3: `useCustomerBasicInfoModel.ts` `snapshotFromCustomer` 防御性兜底 `.toUpperCase()` | 前线吃下极端场景（A-1 修通后为 dead code） | 由 A-2 测试覆盖主流程 |

### 映射表验证

- `web` → `WEB` ✓
- `referral` → `REFERRAL` ✓
- `ad` → `ADS`（避免 toUpperCase 假修复）✓
- `ads` → `ADS` ✓
- `walkin` → `null`（未知值不强转）✓
- legacy `sourceType="REFERRAL"` 优先于 `sourceChannel="web"` ✓

---

## Epic B — 所属分组 picker 不选中 + 头部 chip raw（R-FLOW6-CUS-A-2 + A-3）

| 修复点 | 关键证据 | 测试 |
|--------|----------|------|
| B-0: `useGroupOptions.ts` `resolveGroupLabel` alias 分支改为「DB name 命中 catalog → 走本地化；未命中 → DB name 权威」 | `tokyo-1`（DB name = catalog slug）→ zh-CN 返回「东京一组」; 自定义组名仍返回原值 | `useGroupOptions.test.ts` — `resolveGroupLabel_aliasNameMatchesCatalogSlug_returnsLocalizedLabel` + `resolveGroupLabel_aliasNameNotInCatalog_returnsRawDbName` |
| B-1: `CustomerBasicInfoTab.vue` option `:value="opt.value"` + select `:value="resolveGroupValue(...)"` | picker 选中态与 catalog slug 对齐 | `CustomerBasicInfoTab.test.ts` — `localizes furigana label and group select uses slug value in zh-CN` |
| B-2: `useCustomerBasicInfoModel.ts` `groupOptions` merge catalog + alias | picker 列表同时含 catalog 与 alias UUID 路径 | `useCustomerBasicInfoModel.test.ts` 覆盖 |
| B-4: `CustomerDetailHeader.test.ts` | chip 文本 = 本地化 label，非 raw slug | `resolvesAliasUuidToCatalogLabel` |

### 关联回归测试更新

B-0 行为变更导致原 R2-B-3 系列测试（"DB name is canonical/locale-invariant"）全部更新为新预期：

- `CaseCreateStep2.bug139.test.ts` — 3 条更新
- `CustomerTableRow.bug136.test.ts` — 4 条更新
- `BillingTable.bug140.test.ts` — 4 条更新
- `BillingTable.bug159-data.test.ts` — 2 条更新
- `useCustomerDropdownData.test.ts` — 2 条更新

---

## Epic C — 关联案件名称列（R-FLOW6-CUS-A-4）

| 修复点 | 关键证据 | 测试 |
|--------|----------|------|
| C-1: `CustomerAdapterCaseMapper.ts` name fallback 改为 `caseName → caseNumber → ""`（去掉 id 兜底） | PG `case_name=null` 时不再渲染 UUID | `CustomerAdapterCaseMapper.case-number.test.ts` — `usesCaseNumberWhenCaseNameMissing` + `returnsEmptyStringWhenBothMissing` |
| C-3: `CustomerCasesTab.vue` 模板双保险 `c.name \|\| c.caseNumber \|\| '—'` | 即使 mapper 漏网也不渲染空白 | `CustomerCasesTab.test.ts` — `rendersCaseNoWhenCaseNameMissing` |

### 关联回归测试更新

- `CaseListSummaryDownstream.test.ts` — `removing a minimum field...degrades gracefully` 预期从 `"case-degrade"` 改为 `""`
- `CustomerAdapter.test.ts` — case-002 name 预期从 `"case-002"` 改为 `""`
- `useCustomerCasesModel.focused.test.ts` — fallback 预期从 id 改为 `""`

---

## Epic D — backfill 漏字段（R-FLOW6-CUS-A-5）

| 修复点 | 关键证据 | 测试 |
|--------|----------|------|
| D-1: `backfillCustomerOwnerFromLead.ts` 新增 `sourceChannel` / `name_jp` / `name_cn` 回填逻辑 + `?? "unknown"` 兜底 | `buildPatch` 复杂度从 15 降至 ≤12（提取 `resolveVisaPatch` + `resolveNamePatches`） | `backfillCustomerOwnerFromLead.test.ts` — 11 条全绿 |
| D-3: PG smoke | `insertLead` helper 已增 `sourceChannel` / `name` 形参 | `backfillCustomerOwnerFromLead.smoke.test.ts` |

---

## Epic E — 存量 case document_items 重建（R-FLOW6-CUS-A-6）

| 修复点 | 关键证据 | 测试 |
|--------|----------|------|
| E-1: `backfillCaseDocumentItems.ts` 新建脚本 | 走 `parseRequirementBlueprint` + 逐条 INSERT，DRY_RUN=1 模式对齐 | `backfillCaseDocumentItems.test.ts` — 7 条全绿 |
| E-3: PG smoke | seed case + template → applyBackfill → doc_count 验证 | `backfillCaseDocumentItems.smoke.test.ts` |

---

## Guard 输出摘要

```
npm run fix   → exit 0 (format + lint:fix 全绿)
npm run guard → exit 0

Admin:
  Test Files  558 passed | 3 skipped (561)
  Tests       8370 passed | 24 skipped (8394)

Server (node:test via guard):
  36 tests pass (backfillCustomerOwnerFromLead + backfillCaseDocumentItems + dto-mappers)
```

---

## 修复文件清单

### 新增
- `packages/server/src/modules/core/customers/customers.source-type.ts` — pickSourceType 提取

### 修改（逻辑）
- `packages/server/src/modules/core/customers/customers.dto-mappers.ts` — A-1 pickSourceType 外提 + 行数 ≤500
- `packages/server/src/scripts/backfillCustomerOwnerFromLead.ts` — D-1 字段扩展 + 复杂度修复
- `packages/server/src/scripts/backfillCaseDocumentItems.ts` — E-1 JSDoc 补全
- `packages/admin/src/shared/model/useGroupOptions.ts` — B-0 alias 本地化
- `packages/admin/src/views/customers/components/CustomerBasicInfoTab.vue` — B-1 picker value
- `packages/admin/src/views/customers/model/useCustomerBasicInfoModel.ts` — B-2 + A-3
- `packages/admin/src/views/customers/components/CustomerCasesTab.vue` — C-3 模板兜底
- `packages/admin/src/views/customers/model/CustomerAdapterCaseMapper.ts` — C-1 fallback

### 修改（测试更新）
- `packages/server/src/scripts/backfillCustomerOwnerFromLead.test.ts` — D-2 + lint fix
- `packages/admin/src/views/cases/components/CaseCreateStep2.bug139.test.ts`
- `packages/admin/src/views/cases/model/CaseListSummaryDownstream.test.ts`
- `packages/admin/src/views/cases/model/useCustomerDropdownData.test.ts`
- `packages/admin/src/views/customers/model/CustomerAdapter.test.ts`
- `packages/admin/src/views/customers/model/useCustomerCasesModel.focused.test.ts`
- `packages/admin/src/views/customers/components/CustomerTableRow.bug136.test.ts`
- `packages/admin/src/views/billing/components/BillingTable.bug159-data.test.ts`
- `packages/admin/src/views/billing/components/BillingTable.bug140.test.ts`
- `packages/admin/src/views/customers/components/CustomerBasicInfoTab.test.ts`
