# ADR-006: UI Locale 与 Content Language 必须分离

| 属性     | 值                          |
| -------- | --------------------------- |
| 状态     | 已采纳                      |
| 决策日期 | 2026-05-05                  |
| 触发缺陷 | R39-A（P0）                 |
| 影响范围 | admin / server / DB schema  |

## 背景

系统同时存在两种"语言"概念：

1. **UI Locale** — 用户界面显示语言，BCP-47 格式（`zh-CN` / `ja-JP` / `en-US`），由 vue-i18n 管理。
2. **Content Language** — 持久化内容的语言标识，ISO 639-1 alpha-2 格式（`ja` / `zh` / `en`），存储在 `document_templates.language` 等 DB 字段中。

R39-A 缺陷的根因是 `CaseDetailView` 将 vue-i18n 的 `locale` ref（`zh-CN`）直接作为 `language` 参数传递给模板查询接口，导致 DB 中存储为 `ja` 的模板永远无法被 `zh-CN` 匹配到。

## 决策

### 规则 1：admin 前端 — 不把 UI locale 当 content language 使用

- 调用后端 API 时，`language` 参数只能传 ISO 639-1 alpha-2 值（`ja` / `zh` / `en`），或留空（由后端默认处理）。
- vue-i18n 的 `locale` ref 禁止直接绑定到任何向后端发出请求的 `language` 参数上。
- `useCaseDetailModel` 中的参数已重命名为 `templateLanguage`，JSDoc 明确标注"content language base，不是 UI locale"。
- 未来若需要"按内容语言筛选"功能，由业务层显式提供 alpha-2 值，不从 vue-i18n locale 隐式派生。

### 规则 2：server 端 — BCP-47 fallback 防御层

- `documentTemplates.service.ts` 的 `normalizeLanguageFilter` 函数在查询时自动将 `xx-YY` 格式归一化为 `xx`。
- 这是一道防御层，确保即使有调用方误传 BCP-47 locale，查询仍能命中正确记录。
- DB 写入侧不做自动归一化：写入 `language` 必须由调用方保证为 alpha-2 格式。

### 规则 3：DB schema — language 字段存储 ISO 639-1 alpha-2

- `document_templates.language` 列存储 2 字符的语言基码（`ja` / `zh` / `en`）。
- seed 脚本和 migration 中写入的 language 值必须是 alpha-2 格式。
- 未来若需支持方言级别区分（如 `zh-Hans` vs `zh-Hant`），需另建 ADR 扩展。

## 对照表

| 场景               | 正确值   | 错误值    | 说明                                  |
| ------------------ | -------- | --------- | ------------------------------------- |
| DB 存储            | `ja`     | `ja-JP`   | 列定义为 alpha-2                      |
| API query param    | `ja`     | `ja-JP`   | server 有 fallback 但不应依赖         |
| API query 省略     | *(空)*   | `zh-CN`   | 不传 = 不过滤，返回全部可用模板       |
| vue-i18n locale    | `ja-JP`  | —         | 仅用于 UI 翻译，不传给后端            |
| seed 脚本写入      | `ja`     | `ja-JP`   | 直接写入 DB 必须用 alpha-2            |

## 后果

- 前端查询模板时不再因 locale 不匹配而返回空列表。
- server 端防御层消除了 locale 格式误传导致的静默失败。
- 开发者在新增涉及 `language` 字段的 API 时，需遵循本 ADR 的 alpha-2 约定。
