# 78 — 资料清单 + 文书全链路走查（2026-05-09 第七轮 / chrome-devtools-mcp）

> 日期：2026-05-09（第七轮 / docs-forms 流程专项）
>
> 走查路径：CASE-202605-0012 详情 → **资料清单 Tab**（provider 进度 / row 交互 / 登记 / waive） →
> **文书 Tab**（已生成列表 / 新建草稿 / 定稿 / 异步导出） → 提交前检查回看 → 案件日志回看
>
> 登录账号：`admin@local.test`（Local Admin）
>
> 走查对象：
>
> - 案件 **CASE-202605-0012** / id=`b891a765-ecf2-49e7-8d27-ce43b65a5859`
> - case_type=`dependent_visa`（家族滞在 canonical），blueprint = family-stay（10 条资料）
> - 客户 **王小明-确认** / id=`8f10272d-1df1-458d-823b-31c20c678b4a`
> - 现场新建文书 **走查 v7 空白草稿**（DOCX, v2, generatedDocumentId=`6afafce4-2c63-408d-aa9a-2333a6c0a89b`）
>
> 截图目录：`tmp/walkthrough-2026-05-08-v7-docs-forms/`（10 张）
>
> 上游权威：
>
> - [75-MCP-lead-customer-case-conversion-walkthrough-2026-05-08-v6.md](./75-MCP-lead-customer-case-conversion-walkthrough-2026-05-08-v6.md)（第六轮转化全链路）
> - [77-rfc-real-file-generation-2026-05-08.md](./77-rfc-real-file-generation-2026-05-08.md)（D2 RFC — 真实文件生成异步化设计）
> - [76-AUDIT-caseType-codes-2026-05-08.md](./76-AUDIT-caseType-codes-2026-05-08.md)（V6 NEW-V6-3 caseType 编码审计）

---

## 0. 总结

本轮专项走查**资料清单 Tab 与文书 Tab**，发现 **8 条新问题**（P1×6 + P2×2，无 P0），主要集中在：

- **数据契约不一致**：前端进度卡 vs 分组列表来自不同字段（owner_side vs provided_by_role），seed/blueprint 没填 providedByRole 导致进度卡永远「未知 0/N」
- **前后端契约脱节**：waive 状态机前后端不一致（前端允许 uploaded_reviewing → waived，后端拒绝），用户点击后撞 400
- **占位文件退役不彻底**：`isPlaceholderFile` 字段从前端 cases 模块**全量删除**，但后端依然落库 `placeholder://` URL，「下载文件」直接 href 暴露用户
- **D2 异步导出半实施**：状态机 + handler + 队列注册已落地，但 dev `npm run dev` 不起 worker、前端无轮询，export 永远卡在「导出中…」
- **i18n 漏文案**：`generated_document.export_queued` timeline action 没翻译
- **dev seed 漂移**：seedDevDocTemplates.ts 已声明 `dependent_visa` 模板，但因 `ON CONFLICT (id) DO NOTHING` 老 dev DB 里实际为空 → 「生成文书」对话框永远只能选「无模板草稿」

链路核心交互（生成 → 定稿 → 导出）UI 流转**正确**，但**导出环节后台无人消费**。Console 只有一条 form-field A11y issue，无 JS 报错。

---

## 1. 本轮新发现

### 1.1 P0 / 链路阻断

**无**。

### 1.2 P1

#### NEW-V7-1 「按提供方完成率」进度卡永远显示「未知 N/N」

| 项 | 内容 |
|---|------|
| 现象 | 资料清单 Tab 顶部进度卡片显示「**未知 0/10**」一行；下方分组列表却正确分为「**主申请人 0/8**」+「**事务所内部 0/2**」=10。两份统计的总数一致，但进度卡的分组维度全部塌陷到「未知」。 |
| 截图 | `01-documents-list-initial.png` |
| 关键代码 | 后端 `cases.service.detail-queries.ts:180`（SQL `coalesce(provided_by_role, 'unknown') as provider_role`）<br>前端 `CaseAdapterDetailAggregate.ts:80 adaptProviderProgress`<br>蓝图 `__data__/caseTemplateBlueprints/{family-stay,work,business-manager-visa}.ts`（**3 个全部不写 `providedByRole`**） |
| 根因 | `RequirementBlueprintItem` 接口的 `providedByRole` 是可选字段，3 个 blueprint 都没填；从模板创建 document_items 时（`cases.template.repository.ts:80`）拿到 `undefined` 转写为 `null`；后端 `coalesce(provided_by_role, 'unknown')` 把 NULL 全归到 `'unknown'` 桶；进度卡仅 1 行「未知」。<br>同时分组列表用的是 `owner_side` 字段（`applicant`/`customer`/`office`），与 `provided_by_role` **不是同一字段**，两套数据维度并存。 |
| 影响 | 「按提供方完成率」卡片自上线起对**所有用户、所有案件**都是单行「未知」；与下方分组数据**视觉冲突**；用户怀疑模板/数据残缺。 |
| 修复方案 | 1. 补三个 blueprint 的 `providedByRole`：`applicant`→applicant, `customer`→supporter, `office`→office；<br>2. 同步补 `cases.template.repository.ts` 与 `cases.service.create-flow.ts` 测试用例「blueprint 的 providedByRole 必须落库到 `document_items.provided_by_role`」；<br>3. 加一条数据契约：「**`owner_side` 与 `provided_by_role` 不可同时存在但语义不同；进度卡应基于唯一来源**」——建议合并到 `owner_side` 单字段并将 SQL/前端 i18n 全切换 |
| 优先级 | **P1**（视觉级，但永久全用户复现） |

#### NEW-V7-2 「登记资料」对话框版本号永远显示「v2（系统自动递增）」

| 项 | 内容 |
|---|------|
| 现象 | 任意「待提交」资料行点击「登记资料」打开对话框，「版本号」字段显示 `v2（系统自动递增）`。即使该 doc_item 是首次登记。 |
| 截图 | `02-register-modal-residence-card.png` |
| 关键代码 | 前端 `useRegisterDocumentModel.ts:198` `version = (selectedDocItem.referenceCount ?? 0) + 1`<br>前端 `DocumentAdapter.ts:172` `referenceCount = row.referenceCount ?? 1`<br>后端：`document_items` 表**没有** `reference_count` / `referenceCount` 字段，API 永远不返回 |
| 根因 | 后端从未实现 `referenceCount`，前端 mapper 把缺省值兜底为 `1`（不是 `0`）；register modal 计算 `(1 ?? 0) + 1 = 2` 永远显示 v2。 |
| 影响 | 用户首次登记一份资料就看到「v2」，造成**已存在 v1 假象**；与列表里「待提交」状态自相矛盾。 |
| 修复方案 | 1. **保守修**：把 `DocumentAdapter.ts:172` 兜底从 `?? 1` 改为 `?? 0`，让 `version = 0+1 = 1` 与首次登记契合；<br>2. **彻底修**：后端 `document_items` 列表 API 派生 `referenceCount`（基于 `document_files` 关联表 count），与「跨案件引用 ×N」徽章（`DocumentTableRow.vue:103`）共用同一来源；<br>3. 补 `useRegisterDocumentModel.suggest.test.ts`「首次登记 versionLabel === 'v1（系统自动递增）'」断言 |
| 优先级 | **P1**（视觉级，全用户复现） |

#### NEW-V7-3 待审核状态行「标记无需提供」按钮可见，但后端 400 拒绝

| 项 | 内容 |
|---|------|
| 现象 | `fs-supporter-employment` 行状态「待审核」(`uploaded_reviewing`)，UI 显示三个按钮「审核通过 / 退回补正 / 标记无需提供」。点击「标记无需提供」打开 `WaiveReasonModal`，填写原因 + 备注后点「确认标记」→ `POST /api/document-items/<id>/waive` → **400 Bad Request**：`{"message":"Cannot waive a document item with status 'uploaded_reviewing'"}` |
| 截图 | `03-waive-modal.png` |
| 关键代码 | 后端 `documentItems.service.ts:373` `WAIVE_ALLOWED_FROM_STATUSES` **不包含** `uploaded_reviewing`<br>前端 `DocumentDetailItemAdapter.ts:77` `canWaive: transitions.includes("waived")`<br>前端 `documents/constants.ts:97` `STATUS_TRANSITIONS.uploaded_reviewing = ["approved", "rejected", "waived"]`（含 `waived`） |
| 根因 | **前后端 waive 状态机契约不一致**：前端 `STATUS_TRANSITIONS` 允许 `uploaded_reviewing → waived`，后端拒绝该转移。前端按 `transitions.includes("waived")` 派生 `canWaive=true`，UI 显示按钮，但触发后端 400。 |
| 影响 | 用户对待审核资料想直接 waive 时撞死路；toast 显示后端原文（英文 `Cannot waive a document item with status 'uploaded_reviewing'`），不本地化；模态框不自动关闭、表单状态保留。 |
| 修复方案 | 二选一（建议先做 (a)）：<br>(a) **前端对齐后端**（保守）：`documents/constants.ts:97` 移除 `uploaded_reviewing` 转移到 `waived` 的合法性 → UI 自动隐藏按钮；<br>(b) **后端对齐前端**（激进，需产品确认）：`WAIVE_ALLOWED_FROM_STATUSES` 加入 `uploaded_reviewing`，业务上「已上传待审核中发现免提，应允许直接 waive 跳过审核」<br><br>修复后**必须**补一条端到端契约测试：「前端 `canWaive` ⇔ 后端 `WAIVE_ALLOWED_FROM_STATUSES`」，CI 跑前端单元测试时通过共享 fixture 验证。 |
| 优先级 | **P1**（用户路径阻断，UI 撒谎按钮） |

#### NEW-V7-4 占位文件退役不彻底：后端写 `placeholder://` URL，前端「下载文件」直接 href 暴露

| 项 | 内容 |
|---|------|
| 现象 | 已 exported 文书行（`PDF · v1 · 已导出`）显示「下载文件」链接，`<a href="placeholder://generated-documents/<id>.pdf">`。点击后浏览器尝试访问 `placeholder://...` 协议（无效协议，下载失败/Chrome 报 `ERR_INVALID_URL`）。 |
| 截图 | `04-forms-tab-initial.png` / `06-form-draft-created.png` |
| 关键代码 | 前端 `CaseFormsTab.vue:187`（`v-if="doc.backendStatus === 'exported' && doc.fileUrl"` — 仅判 status + fileUrl 非空，**不检测 `placeholder://`**）<br>前端 `CaseAdapterSupportSeams.ts:280-288`（adapter 仅读 `fileUrl`，**不再派生 `isPlaceholderFile`**）<br>后端 `generatedDocuments.service.ts` `update({ status: "exported", fileUrl: "placeholder://..." })`（D2 之前的占位写入路径） |
| 根因 | **退役半完成**：前端 `isPlaceholderFile` 字段全量删除（grep `isPlaceholderFile` 在 admin/cases 0 命中，与 RFC-077 §7.3 提到的「8 个文件清理清单」对照确认已删除）；但**后端仍在写 `placeholder://` URL**（D2 异步落地前的兜底）。导致前端失去保护，把无效 URL 直接暴露给用户。 |
| 影响 | 已导出文书的「下载文件」按钮**全用户、全案件**都是死链；旧记录无补救入口（不会触发 export 重做）。 |
| 修复方案 | 1. **立即修**：`CaseFormsTab.vue:187` 加上 `&& !doc.fileUrl.startsWith('placeholder://')` 守卫；占位记录显示「占位文件 · 待 D2 渲染落地」徽章 + 隐藏下载链接；<br>2. **D2 落地后**：按 RFC-077 §7.3 步骤跑历史数据清理 SQL `UPDATE generated_documents SET file_url = NULL WHERE file_url LIKE 'placeholder://%'`；<br>3. **回归契约**：`isPlaceholderFile` 退役清理顺序应该是「(a) 后端不再产生 → (b) 数据回填 NULL → (c) 前端删除字段」，本次违反顺序，应回退第三步直到 (a)/(b) 完成。 |
| 优先级 | **P1**（视觉链路阻断；核心业务流程「下载文书」直接破坏） |

#### NEW-V7-5 `dependent_visa` 没有可用文书模板，「生成文书」永远只能选「无模板草稿」

| 项 | 内容 |
|---|------|
| 现象 | 「生成文书」对话框「文书模板」下拉只显示 `尚未配置可选模板，将创建无模板草稿`；GET `/api/document-templates?caseType=dependent_visa` → 200 `{items:[]}`。<br>但 `seedDevDocTemplates.ts:110-121` 明确声明了 2 条 `dependent_visa` 模板（DOC_TPL_FAMILY_STAY_3「申請理由書」+ DOC_TPL_DEPENDENT_VISA_2「身元保証書」）。 |
| 截图 | `05-form-generate-modal.png` |
| 关键代码 | `seedDevDocTemplates.ts:195-205` `INSERT ... ON CONFLICT (id) DO NOTHING`<br>实际 DB（GET `/api/document-templates` 全量）返回 25 条，**0 条为 `dependent_visa`**；旧 alias `family_stay`（3 条）/ `family`（3 条）都还在 |
| 根因 | `ON CONFLICT (id) DO NOTHING` 让老 dev DB（5 月初 seed 过的）保留旧记录（alias `family_stay` / `family`），新加的 `dependent_visa` canonical 因为 id 没冲突也没新插入（2 条新 id 不在 DB 中），猜测是 seed 历史走过 alias 路径或 id 错位。<br>无论根因哪条：**结果是 case_type=`dependent_visa` 的所有案件「生成文书」入口可用模板=0**。 |
| 影响 | admin002 / 任何用「家族滞在」转化的案件都拿不到模板；用户必须选「无模板草稿」走全空白文档；上线后 prod 若没正确 seed 也会暴露同一现象。 |
| 修复方案 | 1. **dev 数据**：`seedDevDocTemplates.ts` 把 `ON CONFLICT (id) DO NOTHING` 改为 `ON CONFLICT (id) DO UPDATE SET ...`（或 `ON CONFLICT (org_id, case_type, doc_type, language) DO UPDATE`）让老 DB 重跑 seed 能补；现有用户运行 `npm run db:seed-dev` 即可恢复；<br>2. **契约测试**：`seedDevDocTemplates.contract.test.ts` 加断言「`BUSINESS_TYPE_TO_CASE_TYPE_CODE` 中所有 canonical case_type 都至少 seed N>=1 条文书模板」；<br>3. **降级提示**：「文书模板」下拉为空时，提示文案优化为「该签证类型暂未配置文书模板，请联系管理员维护，或选择无模板草稿继续」（当前文案隐含「永远只能选无模板」） |
| 优先级 | **P1**（dev/seed 维度，admin 默认 demo 体验直接破坏） |

#### NEW-V7-6 D2 异步导出 dev 环境无 worker，export 永远卡在「导出中…」

| 项 | 内容 |
|---|------|
| 现象 | 新建草稿「走查 v7 空白草稿」(DOCX) → 定稿 → 导出 → 状态变为「导出中…」并保持 60s+ 不变。检查后端：`status="exporting", fileUrl=null`；timeline 写入 `generated_document.export_queued`；但**没有** `generated_document.exported` 后续。 |
| 截图 | `07-form-exporting-stuck.png` / `09-case-log-export-queued-i18n-leak.png` |
| 关键代码 | RFC-077 §1.2 设计：controller.export → enqueue + status=exporting → worker 处理 → status=exported<br>`packages/server/package.json:7,10` `"dev": "tsx watch src/main.ts"` / `"worker:dev": "node --import tsx src/worker.ts"`（**两个独立 script**）<br>`packages/server/src/worker.ts:52-58` REGISTERED_QUEUES 已包含 `generated_doc_export_jobs` (handler 已实现 `generatedDocExportHandler.ts`)<br>`useCaseFormsTab.ts` / 全 admin **无任何**「exporting 状态轮询」代码（grep `polling` 0 命中） |
| 根因 | **D2 异步导出半实施**：(a) 后端 controller / service / 状态机 / handler / 队列注册已就绪；(b) 但 `npm run dev` 不会启动 worker；(c) 即使启动 worker，前端没有 RFC-077 §8 的 5s 间隔轮询；(d) 没有「导出中超过 X 分钟自动重置/提示」兜底。 |
| 影响 | 1. dev 环境单纯跑 `npm run dev` → 用户的所有 export 操作永久挂起，提交前检查「所有文书需定稿」永远卡点；<br>2. prod 环境如果 worker 故障/Redis 断连，用户也会出现同样症状但无任何反馈；<br>3. 与之前「placeholder 同步立即 exported」相比，UX 退化（旧版至少能看到「下载链接」即使是占位）。 |
| 修复方案 | 1. **dev 启动**：`packages/server/package.json` 加 `"dev:full": "concurrently 'npm:dev' 'npm:worker:dev'"` 或在根目录 `package.json` 用 `npm run dev -w packages/server & npm run worker:dev -w packages/server`，文档化 README/AGENTS.md「跑文书导出需要 worker」；<br>2. **前端轮询（RFC-077 §8）**：`useCaseFormsTab.ts` watchEffect 检测 `forms.generated.some(d => d.backendStatus === 'exporting')` → 5s 轮询 GET `/api/generated-documents?caseId=...` → MAX_POLLS=60 后兜底显示「导出超时，请联系管理员或重试」；<br>3. **后端兜底**：`generated_doc_export_jobs` 队列入队时同步写一条 PG `jobs` 行（已有 `claimNextJob` 机制），即使 Redis 断 PG 也能 retry；或「exporting 状态超过 5min 自动 → export_failed」用 cron 兜底。 |
| 优先级 | **P1**（D2 落地的最后一公里 — 新功能从「不工作」变成「永久不响应」） |

### 1.3 P2 — 微小观察（不阻断）

#### NEW-V7-7 「资料登记清单」分组完成度文案口径分裂

| 项 | 内容 |
|---|------|
| 现象 | 顶部全局进度：`0 / 10 完成（0%）`<br>分组进度：`主申请人 0 / 8 完成` / `事务所内部 0 / 2 完成`<br>`fs-supporter-employment` 是「待审核」状态，但**不计入** 完成数（即等于「未通过审核 = 未完成」）。从用户视角看：「已经登记了 1 份等审核中的资料，怎么进度还是 0/8？」 |
| 截图 | `01-documents-list-initial.png` |
| 关键代码 | 完成度计算：后端 SQL `count(*) filter (where status in ('approved', 'waived')) as done`（`cases.service.detail-queries.ts:182`）|
| 评估 | 业务上「审核通过/免提」才算齐全是合理口径，但 UI 文案「0 / 10 完成」+「待审核」chip 同时出现时，**用户感知混乱**。 |
| 修复方案 | 文案优化：「**0 / 10 已通过审核**（10 项 · 1 项待审核 · 9 项待提交）」一类的多维度展示；或在分组下方加微注「待审核 / 已退回的资料不计入完成数」 |
| 优先级 | **P2**（可读性级；行为本身正确） |

#### NEW-V7-8 案件日志中 `generated_document.export_queued` timeline action 未本地化

| 项 | 内容 |
|---|------|
| 现象 | 日志 Tab 中 export → 状态变化产生的 timeline 行：「**generated_document.export_queued**」原始 key 直接漏出，与上下文「文书定稿：走查 v7 空白草稿」「文书生成：…」「文书导出：…」其它中文文案对比突兀。 |
| 截图 | `09-case-log-export-queued-i18n-leak.png` |
| 关键代码 | `CaseCommsTimelineBuilders.ts:299` 只处理 `generated_document.exported`，**没注册** `generated_document.export_queued`<br>RFC-077 §1.2 引入的新 timeline action |
| 修复方案 | 1. `CaseCommsTimelineBuilders.ts` 加 `generated_document.export_queued` builder：「文书排队导出：{title}」（zh-CN）/「Document export queued: {title}」（en-US）/「文書のエクスポートをキュー登録：{title}」（ja-JP）；<br>2. 同时补 `generated_document.export_failed` 防止 D2 落地后再漏一次；<br>3. 沉淀规约「新增 timeline action 必须同时补 i18n + builder + builder test」到 P0/04 数据契约 |
| 优先级 | **P2**（视觉级，仅日志 Tab） |

### 1.4 数据/seed 观察（不计入新发现）

- **dev 时区跨日**：本轮走查时是 JST 23:30 → 凌晨，`generated_at` 落库 UTC `15:06:24Z` 对应 JST `2026/05/09 00:06`，UI 显示「2026/05/09」与新建当下日期对齐——**不是 bug**，是日期格式化基于 JST 时区正常的跨日表现，但 demo 现场容易让人困惑「为什么明天的日期出来了」。
- **`fs-supporter-employment`「待审核」状态遗留**：是上一个 dev seed 留下的中间态记录（不是本轮造成的）。这条数据的存在反而暴露了 NEW-V7-3 的 bug，是个有用的边界测试用例。

---

## 2. 上轮（75 / 76 / 77）问题回归

| 上游问题 ID | 来源 | 上轮结论 | 本轮回归 | 备注 |
|---|---|---|---|---|
| 75 §NEW-V6-3 | `caseType=work` 资料模板未 seed | 待修 | **未复测** | 本轮使用 `dependent_visa`（家族滞在）案件；blueprint 资料模板存在（10 条）。`work` caseType 下的 document_items blueprint 仍未 seed，需另外创建 work 案件验证。**建议下一轮专项**。 |
| 75 §NEW-V6-1 | 线索「转化信息」案件卡片仍只显 caseNo | 待修（后端） | **未复测** | 本轮无转化场景，未触达。 |
| 75 §NEW-V6-2 | 同一签证概念三套 i18n label | 待修 | **未复测** | 本轮观察到「家族滞在」（顶部标题）/「家族滞在」（分组列表上下文）一致，但未跨 leads/customers/cases 模块对照。 |
| 76 audit | `BUSINESS_TYPE_TO_CASE_TYPE_CODE` 编码不一致 | 待修 | **本轮 NEW-V7-5 验证：** `dependent_visa` canonical 模板 seed 漂移确实是该审计提到的问题，是 76 audit 推论的具象暴露 |
| 77 RFC | 真实文件生成异步管线 | Draft 评审 | **本轮 NEW-V7-6 验证：** D2 已部分落地（状态机 + handler），但 dev 启动 + 前端轮询尚未实施 |

---

## 3. 截图索引

| 编号 | 文件 | 内容 | 关联结论 |
|---|---|---|---|
| 00 | `00-case-validation-start.png` | 起点：CASE-202605-0012 提交前检查 Tab，2 条仅提示无卡点 | — |
| 01 | `01-documents-list-initial.png` | 资料清单 Tab — 顶部「未知 0/10」+ 下方「主申请人 0/8 + 事务所内部 0/2」 | **NEW-V7-1**（双统计来源不一致）/ NEW-V7-7（完成度文案口径） |
| 02 | `02-register-modal-residence-card.png` | 「登记资料」对话框 — 版本号显示「v2（系统自动递增）」 | **NEW-V7-2**（首次登记永远 v2） |
| 03 | `03-waive-modal.png` | 「标记为无需提供」对话框 — 待审核行可见、可填写、可提交，但提交 400 | **NEW-V7-3**（前后端 waive 状态机不一致） |
| 04 | `04-forms-tab-initial.png` | 文书 Tab 起点 — 1 条已导出 PDF v1，「下载文件」href 是 `placeholder://...` | **NEW-V7-4**（占位 URL 暴露） |
| 05 | `05-form-generate-modal.png` | 「生成文书」对话框 — 模板下拉「尚未配置可选模板」 | **NEW-V7-5**（dependent_visa 模板 seed 漂移） |
| 06 | `06-form-draft-created.png` | 新建草稿「走查 v7 空白草稿」 DOCX v2 草稿状态 | 流程正常 |
| 07 | `07-form-exporting-stuck.png` | 定稿 → 导出后状态卡在「导出中…」 | **NEW-V7-6**（D2 worker 未启 / 无前端轮询） |
| 08 | `08-validation-after-recheck.png` | 提交前检查：「所有文书需定稿」卡点 1，因 exporting 算非 finalized | RFC-077 §4.2 验证规则正确，但 NEW-V7-6 让用户永远过不去 |
| 09 | `09-case-log-export-queued-i18n-leak.png` | 案件日志 — 「generated_document.export_queued」原始 key 漏出 | **NEW-V7-8**（i18n 缺字典） |

---

## 4. 不在本轮范围

- 单条资料行的「引用既有版本」「催办」「审核通过 / 退回补正」三个按钮路径未走（路径已可见但本轮未点击触发）
- 「手动添加」资料项 / `manual:<uuid>` checklistItemCode 路径
- 文书 Tab 的「再次导出」（旧 placeholder PDF）路径未点击触发（可能与 NEW-V7-4 / NEW-V7-6 重叠）
- ZIP 导出 / 双人复核 / 风险标签：明确「未上线」
- 与 75 NEW-V6-3 对应的 `work` caseType 资料模板 seed 复测（建议下一轮专项 work 案件）

---

## 5. 待回灌（file-back 候选）

> 与 `AGENTS.md` Karpathy 编译式沉淀闭环对齐。

### 5.1 P1 后续修复优先级建议

1. **NEW-V7-4（occlusal 链路阻断）** — 加一行 `placeholder://` 防御立即修，避免下载死链上线；
2. **NEW-V7-6（D2 异步导出最后一公里）** — 与 RFC-077 §8/§9 联动，dev script + 前端轮询同步落地；
3. **NEW-V7-3（前后端契约不一致）** — 用前端对齐后端的保守路径快速修；
4. **NEW-V7-1 + NEW-V7-2** — 数据维度合并 + 兜底值修；
5. **NEW-V7-5** — dev seed 重跑 / 契约断言。

### 5.2 可入库口径建议（待回灌至 P0/04 + 数据契约）

- **「同一统计概念必须有单一来源」**：NEW-V7-1 显示 `provider_progress`（基于 `provided_by_role`）和 `documentGroups`（基于 `owner_side`）两份并存且语义混淆。规约：UI 上能并列展示的两组数字，必须说明它们是「**同一总数 + 不同分组维度**」还是「**不同总数因为口径不同**」；不允许暧昧并存。
- **「mapper 兜底值要遵循『缺省语义』而非『安全语义』」**：NEW-V7-2 把 `referenceCount ?? 1` 当成「至少 1 引用」是把后端缺省字段误解为「最少 1」；正确兜底应该是 `?? 0`（零引用 → 第一次登记）。规约：mapper 缺省值必须基于「字段未存在 = 业务上的零」而非「保守兜底」。
- **「前端 STATUS_TRANSITIONS 与后端 *_ALLOWED_FROM_STATUSES 必须对照测试」**：NEW-V7-3 暴露的契约脱节。建议两端共享一份 `*.contract.json`（或 codegen），任一端修改触发对方测试 fail。
- **「字段退役顺序：先停止生产 → 数据回填 NULL → 再删除消费方逻辑」**：NEW-V7-4 是反例（先删除前端 `isPlaceholderFile` 派生 + 模板渲染防御，但后端还在生产 `placeholder://` URL）。规约写入 P0/04 退役流程。
- **「dev seed `ON CONFLICT DO NOTHING` 是数据漂移温床」**：NEW-V7-5。建议 seed 脚本默认 `DO UPDATE SET`，并在文件头说明「dev 数据 = 当前 codebase 的可重现状态」。
- **「异步操作必须有 UI 兜底反馈」**：NEW-V7-6。规约：任何 `*ing` 中间态状态都必须有「轮询 + 超时兜底 + 重试入口」三件套；否则不允许从同步态切换为异步。
- **「新增 timeline action 必须三件齐」**：NEW-V7-8。规约：新增 timeline action 同步补 (a) `CaseCommsTimelineBuilders.ts` builder + (b) zh-CN/ja-JP/en-US i18n + (c) builder test。CI lint 自定义规则可探测。

### 5.3 走查会话引用

- 本轮：[资料清单与文书走查 chrome-devtools-mcp 第七轮](current-session)
- 第六轮转化全链路：[75-MCP-lead-customer-case-conversion-walkthrough-2026-05-08-v6.md](./75-MCP-lead-customer-case-conversion-walkthrough-2026-05-08-v6.md)
- D2 异步导出 RFC：[77-rfc-real-file-generation-2026-05-08.md](./77-rfc-real-file-generation-2026-05-08.md)
- caseType 编码审计：[76-AUDIT-caseType-codes-2026-05-08.md](./76-AUDIT-caseType-codes-2026-05-08.md)
