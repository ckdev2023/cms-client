# ADR-008: cases timeline i18n 必须使用 `{colonSuffix}` 范式

| 属性     | 值                                                  |
| -------- | --------------------------------------------------- |
| 状态     | 已采纳                                              |
| 决策日期 | 2026-05-05                                          |
| 触发缺陷 | R39-C（P1）、R41-A（P2）、R42-A（P3）              |
| 影响范围 | admin / i18n / model 层 timeline builders            |

## 背景

`cases.log.timeline.*` 段的 i18n 模板中，部分条目将冒号硬编码在翻译文案里（如 `添加关联人：{suffix}`），而另一部分使用 builder 动态生成的 `{colonSuffix}`。两种方式并存导致：

1. suffix 为空时，模板仍渲染出尾随的冒号（如「添加关联人：」），R39-C 首次修复了 `generated_document.*` 4 条 builder。
2. R41-A 走查发现其余 14 条 builder 仍在硬编码冒号，属于同类遗漏。

根因：i18n 模板无法感知 suffix 是否为空，而冒号的有无应由数据驱动决定——这一职责属于 builder，不属于 i18n 模板。

## 决策

### 规则 1：禁止在 `cases.log.timeline.*` i18n 模板中硬编码冒号 + 模板变量

所有形如 `…：{suffix}` / `…: {suffix}` / `…:{suffix}` 的模式均被禁止。正确写法为 `…{colonSuffix}`。

### 规则 2：builder 必须同时 emit `suffix` 和 `colonSuffix`

`CaseCommsTimelineBuilders.ts` 中的每个 builder，若 emit 了 `suffix`，就必须同时 emit `colonSuffix: formatColonSuffix(suffix)`。`formatColonSuffix` 在 suffix 非空时返回 `：${suffix}`，为空时返回 `""`。

### 规则 3：contract test 守门

`i18n-key-consistency.test.ts` 中已包含 contract test：扫描三语字典 `cases.log.timeline.*` 段的所有 value，命中 `/[：:]\s?\{suffix\}/` 即 fail。新增 timeline action key 时自动被该测试守门。

### 规则 4：resolver 处理 `suffixKey` 后必须重算 `colonSuffix`

- builder 可以同时 emit `suffix` / `colonSuffix` / `suffixKey`（兼容现有预计算 fallback）。
- resolver（`CaseTimelineTextResolver.ts`）处理 `suffixKey` → `suffix` 翻译后，**必须**用翻译后的 `suffix` 重新计算 `colonSuffix = formatColonSuffix(translatedSuffix)`。
- i18n 模板**只能**使用 `{colonSuffix}`，禁止直接使用 `{suffix}` 渲染可见文本。
- 当 `suffixKey` 对应的 i18n key 不存在（`te() === false`）时，保留 builder 预计算的 `colonSuffix` 作为 fallback。

## 修复历史

| 轮次  | 范围                                                | 修复数量 |
| ----- | --------------------------------------------------- | -------- |
| R39-C | `generated_document.{created,updated,finalized,exported}` | 4 条     |
| R41-A | 其余 14 条 builder 全面推广                         | 14 条    |
| R42-A | resolver 端重算 `colonSuffix`（修复翻译后仍渲染 raw 值） | 1 处     |

## 适用范围

限 `cases.log.timeline.*` 段。其他模块（如 customers / documents）若有类似的冒号 + suffix 需求，可参照本范式，但不强制。

## 关联文件

- builder 实现：`packages/admin/src/views/cases/model/CaseCommsTimelineBuilders.ts`（`formatColonSuffix` helper）
- resolver 实现：`packages/admin/src/views/cases/model/CaseTimelineTextResolver.ts`（规则 4 落地）
- colonSuffix 专项测试：`packages/admin/src/views/cases/model/CaseCommsTimelineBuilders.colonSuffix.test.ts`
- resolver 契约测试：`packages/admin/src/views/cases/model/CaseTimelineTextResolver.test.ts`
- contract test（守门）：`packages/admin/src/i18n/i18n-key-consistency.test.ts`

## 后果

- timeline suffix 为空时不再渲染多余冒号。
- 新增 timeline action key 时，contract test 自动拦截硬编码冒号写法。
- 开发者只需关注 builder 中的 suffix 提取逻辑，i18n 模板保持简洁。
