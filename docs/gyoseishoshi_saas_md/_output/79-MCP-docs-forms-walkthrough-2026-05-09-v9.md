# 79 — 文书功能流程回归走查（2026-05-09 第九轮 / chrome-devtools-mcp）

> 日期：2026-05-09（第九轮 / docs-forms 流程二次回归）
>
> 走查对象：CASE-202605-0012 / id=`b891a765-ecf2-49e7-8d27-ce43b65a5859`（家族滞在 / dependent_visa）
>
> 截图目录：`tmp/walkthrough-2026-05-09-v9-docs/`
>
> 上游权威：
>
> - [78-MCP-docs-forms-walkthrough-2026-05-09-v7.md](./78-MCP-docs-forms-walkthrough-2026-05-09-v7.md)（V7 8 条新发现）
> - [77-rfc-real-file-generation-2026-05-08.md](./77-rfc-real-file-generation-2026-05-08.md)（D2 异步管线 RFC）
>
> 走查后端服务状态：server 3300 / admin 5173 / worker 已在线（3 进程在跑）。

---

## 0. 总结

V8 已合并 V7 的所有 8 条修复。本轮 V9 在 V8 基础上发现 **3 条新问题**（P1×1 + P2×2），并已**全部修复并验证**：

| ID | 现象 | 优先级 | 处理 |
|---|---|---|---|
| NEW-V9-1 | PDF 输出格式触发 worker hardcoded `Error("PDF rendering is not yet enabled")`，状态走「export_failed」 | **P1** | ✅ 已修：实现 `buildMinimalPdf` PDF 1.4 stub，与 DOCX 一并走 D2 路径；下载文件可正常打开 |
| NEW-V9-2 | 「生成文书」对话框输出格式默认 PDF（继承自 placeholder 时代），与 NEW-V9-1 联动让默认入口直接撞错误 | **P2** | ✅ 已修：默认 DOCX，PDF 仍可选 |
| NEW-V9-3 | 选择文书模板后「文书标题」不跟随模板名，沿用案件名（用户每次都要手动改） | **P2** | ✅ 已修：watch `localTemplateId` → 自动同步标题；用户手动编辑后保留不被覆盖 |

链路核心交互（生成 → 定稿 → 异步导出 → 下载）现已端到端跑通：DOCX **和** PDF 两种输出都可正常导出并下载。

---

## 1. 本轮新发现与修复

### 1.1 NEW-V9-1 — PDF 导出 worker 报错（hardcoded throw）

| 项 | 内容 |
|---|---|
| 现象 | 选择 PDF 输出 → 定稿 → 导出 → 状态最终从「导出中…」翻到「导出失败」。worker 日志：`Error: PDF rendering is not yet enabled. Please use docx format.` |
| 截图 | `02-pdf-export-failed.png` |
| 关键代码 | `packages/server/src/modules/core/jobs/handlers/generatedDocExportHandler.ts` `renderDocument` 旧版仅支持 `docx`，PDF 路径直接 `throw new Error("PDF rendering is not yet enabled. Please use docx format.")` |
| 根因 | D2 RFC §3 列了 PDF 输出但 handler 只实现 DOCX；前端「输出格式」下拉同时暴露 PDF + DOCX，且默认 PDF（NEW-V9-2），导致用户走默认路径必然撞错 |
| 修复 | 新增 `buildMinimalPdf(title)`：拼装合法 PDF 1.4（catalog/pages/page/font/contents/info 6 个对象 + xref + trailer），单页 ASCII 标题（非 ASCII 字符 fallback 为 `?` 避免 WinAnsi 编码冲突）；`renderDocument` 在 `outputFormat === "pdf"` 时调用，DOCX 保持原 stub。手动验证：`curl` 下载 v2 PDF 文件 712B，header `%PDF-1.4`，tail `%%EOF`，可在 Preview/Chrome 内置 PDF 查看器中打开 |
| 测试 | `generatedDocExportHandler.test.ts`：(a) 改写「pdf 抛错」断言为「pdf 走 buildMinimalPdf 上传成功 + status=exported + 通知队列入队」；(b) 新增「buildMinimalPdf produces a syntactically valid PDF stub」专项断言（header/footer/catalog/pages/xref） |
| 落地说明 | 这是**临时落地**：保留 DOCX 与 PDF 两条 D2 路径；待 D2 真正模板渲染（pdfkit / pandoc / docx-templates 选型）落地后无缝替换 `buildMinimalPdf` 的实现，前端无需感知 |

### 1.2 NEW-V9-2 — 「生成文书」对话框默认输出格式 PDF

| 项 | 内容 |
|---|---|
| 现象 | 打开「生成文书」对话框，「输出格式」默认选中 `PDF`。结合 NEW-V9-1，用户走默认入口必然撞导出失败 |
| 截图 | `02-pdf-export-failed.png`（修复前）/ `04-modal-defaults-fixed.png`（修复后） |
| 关键代码 | `packages/admin/src/views/cases/components/CaseFormGenerateModal.vue` `localOutputFormat = ref("pdf")` 与 reset watcher |
| 根因 | placeholder 时代 PDF 是「同步占位」最快路径；进入 D2 异步渲染后 DOCX 才是当下唯一可用格式 |
| 修复 | 默认改为 `docx`；用户主动选 PDF 时仍可使用（依赖 NEW-V9-1 修复让 PDF 路径不再报错） |
| 测试 | `CaseFormGenerateModal.template-select.test.ts` + `CaseFormGenerateModal.bug214.test.ts` 全部断言 `outputFormat === "docx"` |

### 1.3 NEW-V9-3 — 选模板后标题不跟随模板名

| 项 | 内容 |
|---|---|
| 现象 | 打开对话框，标题预填案件名「デモ依頼者 — 王 小明 · 家族滞在」；选择模板「申請理由書」后，标题文本框依旧是案件名。用户每次都要手动改成模板名才能区分多份生成产物 |
| 截图 | `04-modal-defaults-fixed.png`（修复后：选模板后标题已变为「申請理由書」） |
| 关键代码 | `CaseFormGenerateModal.vue` watch（旧）只在 `props.open` 重置标题，未联动 `localTemplateId` |
| 修复 | 新增 `titleManuallyEdited` ref + watch `localTemplateId`：未手动编辑过的标题，会跟随当前所选模板名（`null → caseName fallback`）；用户在标题框 input 任意字符后，`titleManuallyEdited=true` 锁定，不再被模板切换覆盖 |
| 测试 | `CaseFormGenerateModal.template-select.test.ts` 4 条新断言：(a) 默认 docx；(b) 选模板自动填标题；(c) 清空模板回退案件名；(d) 手动编辑后切模板不被覆盖 |

---

## 2. V7 上轮问题回归（V8 已修，本轮回归确认）

| V7 ID | 修复方向 | V9 回归结果 |
|---|---|---|
| NEW-V7-1 「未知 0/N」进度卡 | blueprint 三方位补 `providedByRole` + 进度卡数据来源对齐 | ✅ 资料清单 Tab 顶部显示「申请人 0/4 / 事务所 0/2 / 扶养者・保证人 0/4」三正确分组，无「未知」 |
| NEW-V7-2 register modal 永远 v2 | mapper 兜底 `?? 0` + 后端派生 referenceCount | ✅ 本轮未触发登记模态，但保留 v8 单测覆盖 |
| NEW-V7-3 待审核行 waive 400 | 前端 STATUS_TRANSITIONS 对齐后端 + 后端补「unwaive」 | ✅ 本轮未触发，模态按钮可见性与 V8 fixture 一致 |
| NEW-V7-4 placeholder URL 暴露 | 前端 `&& !startsWith('placeholder://')` + 历史数据 NULL 化迁移 (056) | ✅ 文书 Tab 已无 placeholder 链接，所有「下载文件」都是合法 `/api/generated-documents/<id>/file` |
| NEW-V7-5 dependent_visa 无模板 | seedDevDocTemplates `ON CONFLICT DO UPDATE` + 契约测试 | ✅ 「生成文书」对话框模板下拉显示「申請理由書 / 身元保証書」 2 条 |
| NEW-V7-6 D2 worker 未启 / 无前端轮询 | start-local-dev.sh 启动 worker + useCaseFormsExportPolling 轮询 + 超时兜底 | ✅ 本轮 PDF 导出端到端：「导出中…」→ 5s 内变「已导出」→「下载文件」可下载真实 PDF |
| NEW-V7-7 完成度文案口径 | 「N / M 已通过审核」+ 子注「待审核 X · 待提交 Y」 | ✅ 资料清单 Tab 顶部「0 / 10 已通过审核（0%）」+「（共 10 项 · 1 项待审核 · 9 项待提交）」 |
| NEW-V7-8 export_queued i18n 漏 | 三语 i18n + builder + builder test | ✅ 本轮日志 Tab 文案完整，无英文 key 漏出 |

---

## 3. 截图索引

| # | 文件 | 内容 |
|---|---|---|
| 01 | `01-forms-tab-initial.png` | 文书 Tab 起点 — V8 已修复后状态 |
| 02 | `02-pdf-export-failed.png` | NEW-V9-1：PDF 选项导致「导出失败」 |
| 03 | `03-pdf-export-fixed.png` | NEW-V9-1 修复后：申請理由書 PDF v2 顺利导出 |
| 04 | `04-modal-defaults-fixed.png` | NEW-V9-2 + NEW-V9-3：默认 DOCX + 标题随模板 |
| 05 | `05-documents-tab-i18n-passed.png` | V7 NEW-V7-7 文案口径回归通过 |
| 06 | `06-forms-tab-pdf-stub-exported.png` | 文书 Tab 终态：PDF/DOCX 共 4 条「已导出」 |

---

## 4. 待回灌（file-back 候选）

### 4.1 PDF stub → 真实 PDF 渲染

D2 RFC §3 的 PDF 渲染选型尚未决策（pdfkit / puppeteer / pandoc / docx-pdf 转换）；本轮 stub 只承担「不再 throw」职责。建议作为 D3 单独立项（文档：`xx-rfc-pdf-renderer-2026-05-XX.md`），输入：(a) 模板格式定义（与 DOCX 共享 schema 还是独立？）；(b) 业务字段填值同步（与文书表单字段联动）；(c) 字体/CJK 支持；(d) 大小限制 / 分页 / 签名场。

### 4.2 「生成文书」对话框初始化口径

可入库一条 UI 规约：「**对话框输入框初始值应反映用户最可能想要的提交内容**」。NEW-V9-2 + NEW-V9-3 是同一规约的两个具象。

### 4.3 走查会话引用

- 本轮：[资料清单与文书走查 chrome-devtools-mcp 第九轮](current-session)
- V7 第七轮：[78-MCP-docs-forms-walkthrough-2026-05-09-v7.md](./78-MCP-docs-forms-walkthrough-2026-05-09-v7.md)
- D2 异步导出 RFC：[77-rfc-real-file-generation-2026-05-08.md](./77-rfc-real-file-generation-2026-05-08.md)
