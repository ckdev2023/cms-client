# 84 — 沟通记录 Tab 端到端流程走查（2026-05-09 第十三轮 / chrome-devtools-mcp）

> 日期：2026-05-09（第十三轮 / 沟通记录 Tab 聚焦）
>
> 走查对象：CASE-202605-0012 / id=`b891a765-ecf2-49e7-8d27-ce43b65a5859`（家族滞在 / dependent_visa）
>
> 截图目录：`tmp/walkthrough-2026-05-09-v13-comms/`
>
> 上游权威：
>
> - [83-MCP-docs-walkthrough-2026-05-09-v12.md](./83-MCP-docs-walkthrough-2026-05-09-v12.md)（V12 资料清单 i18n 一致性）
> - [82-MCP-docs-walkthrough-2026-05-09-v11.md](./82-MCP-docs-walkthrough-2026-05-09-v11.md)（V11 写后顶部卡 + Tab 计数器全局回流）
>
> 走查后端服务状态：server 3300 / admin 5173 / worker 在线。

---

## 0. 总结

第十二轮 V12 收敛了资料清单 Tab。本轮 V13 切到「**沟通记录** Tab（`CaseMessagesTab.vue`）」做端到端走查，发现 **1 条 P1** 问题并**已端到端修复并通过三语（zh-CN / ja-JP / en-US）回归**：

| ID | 现象 | 优先级 | 处理 |
|---|---|---|---|
| NEW-V13-1 | 沟通记录列表条目时间戳显示**原始 PostgreSQL 文本格式**（如 `2026-05-08 18:43:06.783546+00`），而非本地化格式（应为 `2026/05/09 03:43`、`05/09/2026, 03:43 AM` 等）。zh-CN / ja-JP / en-US 三语均受影响。 | **P1** | ✅ 已修：双层修复 — ① 后端 `timestamps.ts` 把 PG 文本字符串规范化到 ISO 8601；② 前端 `useCaseDetailModel` 增加 `displayLocale` 入参，与 `templateLanguage` 解耦；`CaseDetailView` 把 i18n locale 作为 `displayLocale` 透传。 |

沟通记录 Tab 的核心交互（撰写区发布 / 类型筛选 / 查看关联会话 / Tab 计数器写后回流 / 三语切换）端到端可用；本轮回归确认时间戳本地化、撰写发布写后回流、类型筛选过滤、Tab 计数器同步全部正常。

---

## 1. 本轮新发现与修复

### 1.1 NEW-V13-1 — 沟通记录时间戳裸露 PG 文本（P1）

| 项 | 内容 |
|---|---|
| 现象 | 案件 ▶ 沟通记录 Tab 中，每条记录右上角的时间戳显示为 PostgreSQL 内部文本格式：<br>`2026-05-08 18:43:06.783546+00`<br><br>预期为本地化日期时间（zh-CN：`2026/05/09 03:43`，ja-JP：`2026/05/09 03:43`，en-US：`05/09/2026, 03:43 AM`）。三语下都同样裸露原始字符串。 |
| 截图 | `01-initial-state.png`（修复前 zh-CN）<br>`02-en-locale-raw-timestamp.png`（修复前 en-US：同样裸时间戳）<br>`03-ja-locale-raw-timestamp.png`（修复前 ja-JP：同样裸时间戳）<br>`04-after-publish-zh.png`（修复前发布新记录验证写路径，新记录也是裸时间戳）<br>`05-after-fix-zh-locale.png`（修复后 zh-CN：`2026/05/09 03:43` / `2026/05/09 03:50`）<br>`06-after-fix-en-locale.png`（修复后 en-US：`05/09/2026, 03:43 AM` / `05/09/2026, 03:50 AM`）<br>`07-after-fix-ja-locale.png`（修复后 ja-JP：`2026/05/09 03:43` / `2026/05/09 03:50`） |
| 关键代码 | **后端**：<br>`packages/server/src/modules/core/model/timestamps.ts`（`toTimestampStringOrNull` / `requireTimestampString`）<br>`packages/server/src/modules/core/communication-logs/communicationLogs.shared.ts`（`mapCommunicationLogRecord`）<br><br>**前端**：<br>`packages/admin/src/views/cases/model/useCaseDetailModel.ts`（`UseCaseDetailModelDeps.displayLocale`）<br>`packages/admin/src/views/cases/CaseDetailView.vue`（`useCaseDetailModel(..., { displayLocale: locale })`） |
| 根因 | **双层失败**叠加导致裸文本透传到 UI：<br><br>① **后端 — Drizzle `mode: "string"` 透传 PG 文本**：<br>`packages/server/src/infra/db/drizzle/schema.ts` 中 `communication_logs.created_at` 用 `timestamp({ withTimezone: true, mode: "string" })`。Drizzle 在该模式下不做转换，pg 驱动返回的是 PostgreSQL 内部文本格式 `"2026-05-08 18:43:06.783546+00"`（空格分隔、微秒、不带冒号的 `+00` 时区）。`mapCommunicationLogRecord` 直接把字符串透传给 `createdAt`，跳过了为这种情况而存在的 `requireTimestampString` 守卫（守卫此前对 string 也是直通）。<br>对比：`/api/timeline` 走原生 SQL 经 pg 默认 parser 拿到 `Date` 对象，然后 `requireTimestampString(date)` → `toISOString()` 输出标准 ISO，所以 timeline 没问题。<br><br>② **前端 — `displayLocale` 与 `templateLanguage` 被绑定**：<br>`useCaseDetailModel` 既用 `templateLanguage` 当文档模板语言过滤器（流向 `listDocumentTemplates`），又把它当展示 locale（流向 `getMessages` / `getGeneratedDocuments` 的 `formatDateTime`）。R39-A 契约禁止把 i18n locale 作为 templateLanguage（避免 UI 切语就影响模板内容过滤），所以 `CaseDetailView` 里 `templateLanguage` 一直是 `undefined`，导致 `getMessages(caseId, undefined)` 进入 `resolveDisplayTime` 的「无 locale 回退分支」直接返回原始字符串。<br><br>两个失败叠加：即便前端拿到 ISO，没有 locale 也不会本地化；即便前端有 locale，后端给的 PG 文本也无法被 `Date.toLocaleString` 正确格式化（部分场景 V8 仍能 parse，但行为不稳定）。两层都得修。 |
| 修复 | **后端**：<br>① `toTimestampStringOrNull` 增加 string 输入分支：检测到非 ISO（无 `T` 分隔符）的字符串时，用 `new Date(s)` 解析后 `toISOString()`，否则透传。已 ISO 的字符串不动，`Date` 实例继续 `toISOString()`。<br>② `mapCommunicationLogRecord` 改为 `createdAt: requireTimestampString(row.createdAt, "created_at")`，`followUpDueAt: toTimestampStringOrNull(row.followUpDueAt)`，让 Drizzle 字符串路径也被规范化。<br><br>**前端**：<br>① `UseCaseDetailModelDeps` 新增 `displayLocale?: Ref<string>`（仅控制展示 locale，不参与内容过滤）。<br>② `createDetailLoader` 的 `locale` 改为 `deps.displayLocale ?? deps.templateLanguage`（`displayLocale` 优先，`templateLanguage` 保后向兼容）。<br>③ `CaseDetailView.vue` 把 `useI18n().locale` 作为 `displayLocale` 传入。<br>④ 更新 R39-A 契约测试 `CaseDetailView.template-language-decoupled.test.ts` 的静态扫描正则：原先「拒绝任何 `locale` token 出现」过紧，会误伤 `displayLocale: locale`；新规则只拒绝 `templateLanguage: locale` 与 shorthand `{ templateLanguage }`，明确「禁止把 i18n locale 当 templateLanguage 用」这一原始意图。 |
| 测试 | **新增 + 现有**：<br>① 后端：`packages/server/src/modules/core/model/timestamps.pgTextual.test.ts` — 7 用例覆盖 PG 文本 (`+00` / `+00:00`) → ISO、ISO passthrough、Date → ISO、null/undefined、不可解析字符串保留。<br>② 后端：`timestamps.bug135-regression.test.ts` 24 用例（mapCustomerRow / mapTaskRow / mapCompanyRow / mapContactPersonRow / mapCommunicationLogRow / GroupsService / FeatureFlagsService / ContactPersonsService / CompaniesService）全部回归通过。<br>③ 后端：`communicationLogs.service.test.ts` 13 用例全部通过（含 `mapCommunicationLogRow` Date / null / 字符串 与 Service create/list/get/update/followUps）。<br>④ 前端：新增 `useCaseDetailModel.displayLocale.test.ts` 4 用例 — 验证 `displayLocale` 仅流向 `getMessages` / `getGeneratedDocuments`，不流向 `listDocumentTemplates`；后向兼容 fallback 到 `templateLanguage`；同时指定时 `displayLocale` 优先。<br>⑤ 前端：现有 `CaseDetailView.template-language-decoupled.test.ts` R39-A 契约（含静态扫描）4 用例全部通过。<br>⑥ 前端：`useCaseDetailModel.wiring.test.ts` 26 用例全部通过（写后回流、Tab 计数器、消息/日志合并）。<br>⑦ 全量：`packages/server` `npm run test` 4214 通过 / 0 失败 / 11 skip。 |
| 落地说明 | 后端是「DB 层 mapper」级修复，影响面=所有走 Drizzle `mode:"string"` timestamp 列的 mapper（目前 communication-logs 直接受益；其他表若引入此模式自动得保护）。<br>前端是「detail page 编排」级修复，影响面=`CaseDetailView` 的消息时间戳 + 文书生成时间戳；其他详情页若有同样需求按相同模式接入即可。<br>`templateLanguage` 行为不变（继续仅控制 `listDocumentTemplates` 的 `language` 参数），不破坏 R39-A 契约。 |

---

## 2. 沟通记录 Tab 端到端流程回归

| 路径 | 表现 | 备注 |
|---|---|---|
| 进入 Tab，加载 1 条历史记录 | ✅ 渲染头像 / 作者 / 类型 chip / **本地化时间戳** / 内容 | NEW-V13-1 修复后回归通过 |
| 撰写区发布「内部记录」 | ✅ 发布成功 → POST `/api/communication-logs` 201 → GET `/api/communication-logs?caseId=...` 200 → 列表新增 → Tab 计数器 1 → 2 | 写后回流路径与 V11 一致 |
| 撰写区清空 | ✅ 发布成功后 textarea 清空、按钮回灰 | 符合 spec |
| 类型下拉切换 | ✅ 内部记录 / 客户可见记录 / 电话记录 / 线下会议 4 项可选；自动邮件不可选（系统级） | spec 一致；对应 SYSTEM_ONLY_CHANNEL_TYPES |
| 类型筛选 radio | ✅ 选中「电话记录」后列表正确隐藏所有 internal_note；选中「所有记录」恢复显示 | 客户端过滤，无 API 调用 |
| 跳到关联会话 | ✅ 链接指向 `/conversations?caseId=...` | 无回归 |
| 三语切换（zh-CN / en-US / ja-JP） | ✅ 标签 + 时间戳格式均正确：<br>zh-CN `2026/05/09 03:43`<br>en-US `05/09/2026, 03:43 AM`<br>ja-JP `2026/05/09 03:43` | 修复后端到端验证 |
| 切语后已加载消息时间戳更新 | ⚠️ 已知非阻塞 — 切语不触发重新拉 messages，已加载消息保留切语前 locale 的格式；刷新页面后正确（参 §5.1） | 非 P0/P1，下文 §5.1 给出后续优化方向 |

---

## 3. V12 / V11 / V10 / V9 / V7 已修问题回归

| 来源 | ID | 修复方向 | V13 回归结果 |
|---|---|---|---|
| V12 | NEW-V12-1 provider 角色 i18n 口径分裂 | `cases.detail.providers.*` 三语对齐到 `documents.providers.*` | ✅ 沟通记录 Tab 不涉及 provider 标签，未触发 |
| V11 | NEW-V11-1 写后顶部卡 + Tab 计数器 stale | `useCaseDocumentsTab.onWriteSuccess` + `refresh` 事件 | ✅ 沟通记录写后 Tab 计数器即时回流（1 → 2），与文档 Tab 同模式 |
| V10 | NEW-V10-1/2 资料分组归一与顺序 | `provided_by_role` + `PROVIDER_GROUP_ORDER` | ✅ 不涉及 |
| V9 | NEW-V9-1 PDF 导出硬抛 | `buildMinimalPdf` PDF 1.4 stub | ✅ 不涉及 |
| V7 | NEW-V7-1/7 进度卡 + 完成度文案 | blueprint + i18n | ✅ 不涉及 |

---

## 4. 截图索引

| # | 文件 | 内容 |
|---|---|---|
| 01 | `01-initial-state.png` | 沟通记录 Tab 起点（修复前 zh-CN，时间戳裸 `2026-05-08 18:43:06.783546+00`） |
| 02 | `02-en-locale-raw-timestamp.png` | 修复前 en-US：同样的裸 PG 文本时间戳 |
| 03 | `03-ja-locale-raw-timestamp.png` | 修复前 ja-JP：同样的裸 PG 文本时间戳 |
| 04 | `04-after-publish-zh.png` | 修复前发布新记录回归（写路径 + Tab 计数器 1 → 2 都对，但新记录的时间戳同样裸） |
| 05 | `05-after-fix-zh-locale.png` | 修复后 zh-CN：`2026/05/09 03:43` / `2026/05/09 03:50` |
| 06 | `06-after-fix-en-locale.png` | 修复后 en-US：`05/09/2026, 03:43 AM` / `05/09/2026, 03:50 AM` |
| 07 | `07-after-fix-ja-locale.png` | 修复后 ja-JP：`2026/05/09 03:43` / `2026/05/09 03:50` |

---

## 5. 待回灌（file-back 候选）

### 5.1 「展示 locale 与 fetch 时机解耦」契约（后续优化方向）

V13 修复确认了 `displayLocale` 与 `templateLanguage` 必须分离。但仍存在一个**非阻塞 UX 缺口**：

- 当前实现：`getMessages(caseId, locale)` 在拉数据时把 ISO 时间戳格式化成本地化字符串写入 `MessageItem.time`，此后切换 i18n locale 不会重新拉取。
- 已加载的消息会保留切语前的格式，刷新页面才能看到新 locale 的时间戳。

更稳健的方向（**未在本轮落地**，留作 P1 后续）：

- 在 `MessageItem` 上保留 ISO 时间戳（`timeIso`，已存在），让视图层 `<template>` 在渲染时调用 `formatDateTime(msg.timeIso, currentLocale)` 计算 `time`，让 i18n locale 切换天然 reactive。
- 同步收敛 `getGeneratedDocuments` 的 `generatedAt` 同样模式。
- 收敛后可移除 `getMessages(caseId, locale)` 的 locale 参数，让 fetch / 展示彻底解耦。

### 5.2 「Drizzle `mode:"string"` 配 ISO 契约」哨兵

V13 之后，Drizzle `mode:"string"` 列经过 mapper 都必须走 `requireTimestampString` / `toTimestampStringOrNull`。这是个**永久哨兵**：

- 任何 mapper 函数（`map*Row` / `map*Record`）的 `createdAt` / `updatedAt` / `*At` 字段必须用这两个 helper，不得直接 `row.foo` 透传。
- helper 现在自动把 PG 文本字符串规范化到 ISO 8601；任何回退到「直通 string」的修改都必须显式说明并补哨兵测试。
- `timestamps.pgTextual.test.ts` 是哨兵；`timestamps.bug135-regression.test.ts` 是上游契约。

### 5.3 走查会话引用

- 本轮：[沟通记录 Tab 走查 chrome-devtools-mcp 第十三轮](current-session)
- V12 第十二轮：[83-MCP-docs-walkthrough-2026-05-09-v12.md](./83-MCP-docs-walkthrough-2026-05-09-v12.md)
- V11 第十一轮：[82-MCP-docs-walkthrough-2026-05-09-v11.md](./82-MCP-docs-walkthrough-2026-05-09-v11.md)
- V10 第十轮：[81-MCP-docs-walkthrough-2026-05-09-v10.md](./81-MCP-docs-walkthrough-2026-05-09-v10.md)
- V9 第九轮：[79-MCP-docs-forms-walkthrough-2026-05-09-v9.md](./79-MCP-docs-forms-walkthrough-2026-05-09-v9.md)
