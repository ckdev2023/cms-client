# 11. i18n 跨语言契约对账（B-009）

> 范围：admin workspace 当前持有的 i18n 契约测试，与 server → admin 的 code-to-key 边界。
> 数据来源：`packages/admin/src/i18n/`、`packages/admin/src/views/*/i18n-contract.test.ts`、`packages/admin/src/views/cases/components/CaseBillingTab.bug186.test.ts`、`packages/server/src/modules/core/cases/cases.service.ts:3371-3407`。
> 标注：**[H]** High / **[M]** Medium / **[L]** Low confidence。

## 1. 语言矩阵

- 语言：**zh-CN / en-US / ja-JP**（`packages/admin/src/i18n/locale.ts:3` `SUPPORTED_LOCALES`）。 **[H]**
- 默认 fallback：`DEFAULT_LOCALE`（`fallbackLocale` 设于 `i18n/index.ts`）。 **[H]**
- mobile workspace：`find packages/mobile/src -path "*i18n*"` 无命中 → mobile 暂未采用相同的 i18n 契约 → OQ-47。 **[M]**

## 2. Message bundle 结构

> `packages/admin/src/i18n/messages/<group>/<locale>.ts` + `messages/<locale>.ts` 顶层聚合。

| 分组 | 文件数 (3 locale) | 备注 |
|------|-----|------|
| `billing` / `cases` / `conversations` / `dashboard-work-item` / `documents` / `leads` / `settings` / `shell-search` / `tasks` / `work-items` | 各 3 文件 | 标准 group |
| `customers` | 5 文件 | 多出 `en-US-list.ts` / `ja-JP-list.ts`（zh-CN 单文件含 list）→ 命名不对称 → OQ-48 |

顶层 `messages/<locale>.ts` `import` 这些子分组并组装为 `shell.* / customers.* / billing.* / ...`。 **[H]**

## 3. 契约测试文件矩阵

> 共 **6** 个 i18n 测试文件，均位于 admin。

| 文件 | describe 块数 | 范围 |
|------|-------------|------|
| `i18n/i18n-no-untranslated-group.test.ts` | 1（含 zh + ja 2 it） | 正则 `/\bGroup\b/` 扫描 zh-CN / ja-JP 全部叶子值 |
| `views/billing/i18n-contract.test.ts` | 2 | 跨语言键平价 + 7 组必需键（35 行键字面） |
| `views/customers/i18n-contract.test.ts` | 5 | 平价 + basicInfo.fields(29) + logsTab(22) + caseSummary(6) + tabs(5) + bmvIntake(11) |
| `views/conversations/i18n-contract.test.ts` | 2 | 平价 + 4 组必需键（messages.kind/visibility, list.status, errors） |
| `views/leads/i18n-contract.test.ts` | 2 | 平价 + STATUS(6) / DETAIL_TAB(5) / LOG_TAB(5) |
| `views/settings/i18n-contract.test.ts` | 2 | 平价 + SUBNAV(4) / GROUP_COLUMN(5) / VISIBILITY(5) |

**未覆盖的 group**：`cases` / `dashboard-work-item` / `documents` / `shell-search` / `tasks` / `work-items`（无 `i18n-contract.test.ts`） → OQ-49。 **[H]**

## 4. 契约模式（共 3 种）

### 4.1 跨语言键平价（cross-locale key parity）**[H]**

```ts
function collectLeafKeys(obj, prefix = ""): string[] { /* DFS, sorted */ }
expect(zhKeys).toEqual(enKeys);
expect(jaKeys).toEqual(enKeys);
```

- 实现完全重复在 5 个文件（每文件本地拷贝 `collectLeafKeys`），未抽到共享 helper → OQ-50。 **[M]**
- 比较口径：**en-US 为基准**；任何 zh / ja 多/少键都失败。 **[H]**
- 不检查值的语言正确性（不区分"译文与英文相同"）。 **[H]**

### 4.2 必需键白名单（required-key resolution）**[H]**

```ts
function resolveKey(obj, path: string): unknown { /* dot path traversal */ }
for (const key of WHITE_LIST) {
  const value = resolveKey(locale.messages, key);
  expect(value).toBeTruthy();          // or expect(missing).toEqual([])
  expect(typeof value).toBe("string"); // billing & conversations only
}
```

- 仅 `billing` / `conversations` 额外断言 `typeof value === "string"`；其余视图仅断 truthy → 有失误空间允许 boolean / 数字混入而仅断 truthy 不会失败。 **[M]** → OQ-51。
- 白名单**手写**于测试内（const xxx_KEYS = [...]）；与 messages 字典之间无单一真相源。 **[H]**

### 4.3 文案级正则回归（"no bare English Group"）**[H]**

`i18n-no-untranslated-group.test.ts` 用 `/\bGroup\b/` 扫 zh-CN / ja-JP **叶子值**，禁出现独立英文 "Group"。
- 仅一种历史回归（与 `customers.basicInfo.fields.group` / `subnav.groupManagement` 命名相关）。 **[H]**
- 没有同类规则覆盖其他英文残留（如 "Customer" / "Lead"）。 **[M]** → OQ-52。

## 5. server → admin 的 code-to-key 边界 **[H]**

> 关键发现：服务端**不**返回本地化文案；只返回稳定的 i18n code，admin 在 adapter 层映射为 i18n key。

- `cases.service.ts:3382` `INITIAL_QUOTE_BILLING_MILESTONE = "case_fee"` → DB 写 `milestone_name='case_fee'`。
- admin `resolveMilestoneI18nKey("case_fee") → "billing.milestone.case_fee"`（见 `CaseBillingTab.bug186.test.ts:78-100`）。
- adapter 同时兼容**遗留中/日字面量**（`案件報酬` / `着手金` / `尾款`）→ 同一 key，由 migration 041 回填 → 单元测试守护映射表完整。 **[H]**
- 类似 code-to-key 边界存在于：`cases.types.ts:11`、`cases.types-generated-docs.ts:101`、`documents.types.ts:22`、`groups.types.ts:4`、`dashboard.shared.ts:15`（"admin adapter 映射为 i18n key" 注释）。 **[H]**
- **风险**：server 错误码 → admin i18n key 的映射关系**仅以注释 + 个别 bug fix test 守护**，没有像 view 级别的 `i18n-contract.test.ts` 那样系统化白名单 → OQ-53。 **[H]**

## 6. 覆盖矩阵汇总

| 维度 | 覆盖 | 缺口 |
|------|------|------|
| admin 12 group × 3 locale 键平价 | 5 group（billing/customers/conversations/leads/settings） | 7 group 未覆盖 → OQ-49 |
| admin 必需键白名单 | 5 view × 多组（共 ~159 keys 显式） | 其余 view 无 |
| admin "无英文 Group" 文案回归 | zh-CN + ja-JP 全 messages | 其他英文残留无类似守护 → OQ-52 |
| mobile i18n 契约 | 0 | 整个 workspace 无 → OQ-47 |
| server 错误码 → admin i18n key 映射 | 部分 bug fix focused tests（如 BUG-186） | 无系统化白名单 → OQ-53 |
| 译文质量 / 占位符一致性 | 0 | 不检查 ICU 占位符 / `{n}` 数量一致性 → OQ-54 |

## 7. 风险 / 待决问题

- **R1** 5 个文件内有重复 `collectLeafKeys` / `resolveKey` 助手，未抽 helper → 改动易漂移。 **[M]** → OQ-50。
- **R2** 必需键白名单手写于测试 → 字典新增 key 不会自动加入白名单；删 key 才会被发现。 **[M]** → OQ-51。
- **R3** server 写"稳定 i18n code"→ admin 映射 i18n key 的契约**仅靠 BUG-186 等点状测试**护住；无三语全表对账。 **[H]** → OQ-53。
- **R4** 7 个 message group 无键平价测试（cases / dashboard-work-item / documents / shell-search / tasks / work-items + customers list 子集），添加新 key 时不会被守护。 **[H]** → OQ-49。
- **R5** mobile 完全无 i18n 设施（locale.ts / messages 目录均缺）→ portal 客户端是否单语言？ **[M]** → OQ-47。
- **R6** ICU 占位符 / 复数化一致性未守护；译文与基准只比键不比模式 → 数字字符串可能错位。 **[M]** → OQ-54。

## 8. 新增 OQ

OQ-47..54（详见 `06-open-questions.md`）。
