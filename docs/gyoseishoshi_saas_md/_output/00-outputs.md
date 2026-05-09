# 00 Outputs（可回灌产出）

> 这里存放通过研究/问答/评审整理出来的“可复用结论”。当结论稳定后，应回灌到对应权威文档，避免长期停留在本文件。

---

## 追加格式（每条一段）

```text
- 时间：YYYY-MM-DD
  问题：{提出的问题}
  结论（TL;DR）：{一句话}
  关键依据：
  - {指向 docs 内的权威文档/章节，或 raw 条目}
  影响面：
  - {模块/页面/接口/流程}
  回灌计划：
  - 目标文档：{文件名}
    位置：{章节}
    Owner：{负责人}
    状态：待回灌 / 已回灌 / 不回灌（原因）
```

---

## 最新产出

- 时间：2026-05-09（D3 文档行政書士实务对照评审 v1 + 80/81/82 三份文档同步修订）
  问题：80/81/82 三份 D3 设计文档由 AI 初稿，**未对照行政書士市面正常流程**审核；存在范围漏失（如缺委任状 / 翻訳証明）、字段漏失（如缺英字氏名 / 国籍細分）、合规漏洞（印影法律要求 / PII 字段级权限 / 法律责任分担）等系统性问题。如何按行政書士業界実務（行政書士法 + 入管法 + 個人情報保護法 + 申請取次行政書士業務）做完整对照评审？
  结论（TL;DR）：完成 22 条评审条目（**P0×8 + P1×9 + P2×5**），P0/P1 共 17 条已直接回填到 80/81/82 三份文档（章节扩展、字段表新增、矩阵扩展、状态机说明、新增 §10 法律免責）；P2 5 条明确写入 deferred 区。**关键修正**：① 申請書 PDF 自動填表明确为 **P3 单独 RFC**（不在 D3 范围）；② 必备模板矩阵 7 份扩展到 **11 份**（含 common 三件套：委任状 / 個人情報取扱同意書 / 申請内容真実性誓約書）；③ customer 字段族扩展 4 字段（fullNameEn / fullNameOnResidenceCard / fullNameAlt / nameScript）+ nationality 細分（CN/TW/HK/MO 4 区分）；④ 新增 narrative.* 字段族（applicationReason / familyBackground / businessPlan / additionalRemarks），admin 起案后 free text 入力；⑤ 新增 PII 字段级权限分类（HIGH/MEDIUM/LOW 三级 + can_view_high_pii 控制 + 访问审计）；⑥ 印影法律要求明确（行政書士法施行規則 §11）+ admin UX 提示自行盖印；⑦ 法律责任分担明确（平台 = 模板素材；事務所行政書士本人 = 最终文書责任）+ ToS 第 X 条 + admin 同意 UI；⑧ 保管期限分级（業務帳簿 2 年 / 法人 5 年 / 訴訟時効 7 年 / 永続）。
  关键依据：
  - docs/gyoseishoshi_saas_md/_output/83-AUDIT-gyoseishoshi-practice-review-2026-05-09.md（22 条评审完整记录 + 落地章节清单）
  - 行政書士法（昭和 26 年法律第 4 号）§1-2 / §9 / §10
  - 行政書士法施行規則 §11（職印）
  - 出入国管理及び難民認定法（2024-04-01 改正反映）
  - 個人情報保護法 §3
  - 一般社団法人 日本行政書士会連合会 業務指針
  - 入管局 在留資格申請手続きガイドブック（2024-06-15）
  影响面：
  - 80 RFC：评审历史章节 + §2.3 模板矩阵扩展 + §4.6 印影法律要求 + §11 不做范围扩展（5 项 P2/P3 明确化）
  - 81 Context Schema：评审历史 + §2 customer 拆分 §2.1-2.7（氏名族扩展 + 国籍细分 + 在留情報 + 委任関係）+ §3.2 案件日期三者 + §4 supporter.statusOfResidence 必填 + 新增 §11 narrative + 新增 §14 PII 分级（章节顺序整理 §11-§16）
  - 82 模板治理：评审历史 + §0.5 范围限定 + §1.3 客户確認 phase 说明 + §3.1 审核维度扩 3 项（印影占位 / 政治敏感 / 条文版本）+ §4.1 必备矩阵从 7 扩到 11（含 common 三件套）+ §4.1.1 範囲外明确化 + §8.3 retention_policy + 新增 §10 法律免責 / 責任分担 + §11 评审清单扩到 14 项 + §12 实施清单扩到 15 项
  - 评审会议建议讨论顺序：(a) P0-1 ~ P0-3（范围 / 委任状 / 在留カード氏名）→ (b) P0-7 ~ P0-8（法律责任 / PII 权限）→ (c) P0-4 ~ P0-6（中国系处理 / narrative / 印影）→ (d) P1 批量批准 → (e) P2 5 项明确不做
  - Deferred（不本轮落地）：印影 PNG 嵌入 / 多语种自动翻译 / 申請書 PDF AcroForm（P3）/ OCR + 翻訳証明 / 業務帳簿自動生成
  回灌计划：
  - 目标文档：docs/gyoseishoshi_saas_md/_output/80-rfc-document-rendering-pipeline-2026-05-09.md
    位置：评审历史 / §2.3 / §4.6 / §11
    Owner：研发 / 法务（评审）
    状态：已回填（评审标记：v1.1）
  - 目标文档：docs/gyoseishoshi_saas_md/_output/81-spec-document-rendering-context-schema-v1-2026-05-09.md
    位置：评审历史 / §2.1-2.7 / §3.2-3.3 / §4 / §11 / §14
    Owner：研发 / 产品
    状态：已回填（评审标记：v1.1）
  - 目标文档：docs/gyoseishoshi_saas_md/_output/82-spec-document-template-governance-2026-05-09.md
    位置：评审历史 / §1.3 / §3.1 / §4.1 / §4.1.1 / §8.3 / §10 / §11 / §12
    Owner：研发 / 法务 / 产品
    状态：已回填（评审标记：v1.1）
  - 目标文档：03-业务规则与不变量.md
    位置：新增「行政書士印影は法律要求（行政書士法施行規則 §11）」「業務帳簿保管 2 年（行政書士法 §9）」「PII 字段级权限分类」「文書最终责任 = 事務所行政書士本人」四条不变量
    Owner：研发 / 产品 / 法务
    状态：待评审通过后回灌
  - 目标文档：04-核心流程与状态流转.md §文書生成
    位置：补充「客户確認」phase 说明 + 修正循环 → 新 versionNo 模式
    Owner：研发
    状态：待回灌
  - 目标文档：99-文档维护与版本记录.md
    位置：新增「文書 Context Schema / 模板治理 行政書士实务对照评审流程」章节
    Owner：产品 / 法务
    状态：待回灌

- 时间：2026-05-09（D3 文書真实化渲染管线设计 — RFC + 上下文 Schema + 模板治理三件落地）
  问题：D2 阶段 export 链路虽已通（队列 + handler + 状态机 + 前端轮询），但 `generatedDocExportHandler.ts:156-194` 的 `renderDocument` 是占位 stub（`buildMinimalPdf` / `buildMinimalDocx` 只画一行标题，模板/案件/客户/事务所数据全部不读），所有用户、所有 caseType 拿到的都是空白文書。如何系统性把"空白文書"这一业务问题闭环？
  结论（TL;DR）：拆三层（L1 模板资产 / L2 变量上下文 / L3 渲染管线）+ 一个前移兜底（finalize-time preflight），同步落地三份文档作为评审输入与运营手册。关键决策：① P1 仅 DOCX，PDF 走 P2（B1=是）；② preflight 缺 required 字段 → 拦截定稿（B2=拦截，不允许 `——` 占位）；③ P1 不开放事务所自定义模板上传，平台运营预置 7–8 份官方模板（B3=否）；④ 资料附件不内嵌主文書，主文书 + 资料 ZIP 分开（B4=否）；⑤ 模板生命周期 = 平台运营 + 法务季度复核（B5=是）。新增 `generated_documents.{export_failure_reason, fill_rate}` + `document_templates.{template_storage_key, publish_state, rollout_org_ids}` 列；CI 强制三件契约测试（必备模板矩阵覆盖率 / 模板占位 ⊆ schema / schema 字段 ⊆ Context Schema v1 字典）。
  关键依据：
  - docs/gyoseishoshi_saas_md/_output/80-rfc-document-rendering-pipeline-2026-05-09.md（D3 渲染管线 RFC，覆盖 L1/L2/L3 + 灰度 + 回退 + 实施清单 M1–M15）
  - docs/gyoseishoshi_saas_md/_output/81-spec-document-rendering-context-schema-v1-2026-05-09.md（变量上下文 Schema v1 权威字典：customer / case / supporter / documents / org / today 六大块 + applicableWhen DSL + 派生字段 + fixHint i18n 约定）
  - docs/gyoseishoshi_saas_md/_output/82-spec-document-template-governance-2026-05-09.md（模板生命周期状态机 / 审核 SLA / 覆盖率契约 / 灰度机制 / 退役流程 / RACI）
  - docs/gyoseishoshi_saas_md/_output/77-rfc-real-file-generation-2026-05-08.md（前置：D2 队列 / 状态机 / handler 框架）
  - docs/gyoseishoshi_saas_md/_output/78-MCP-docs-forms-walkthrough-2026-05-09-v7.md §NEW-V7-5 / §NEW-V7-6（症状暴露：模板 seed 漂移 + worker / 轮询缺失）
  - packages/server/src/modules/core/jobs/handlers/generatedDocExportHandler.ts:156-194（占位 stub）
  - packages/server/src/modules/core/generated-documents/generatedDocuments.helpers.ts:13-28（D2 状态机）
  - packages/server/src/infra/db/migrations/048_document_templates.up.sql:6-21（模板表）
  影响面：
  - server 渲染管线：handler 改造（loadTemplate → buildContext → preflight → fillDocx → upload）+ 新增 renderer 子模块（mapCustomer / mapCase / mapSupporter / mapOrg / makeToday / preflight / fillDocx）+ 引入 `docx-templates` 依赖（RFC-077 §2.4 已批准）
  - server 数据库：3 个迁移（059 reason+fill_rate / 060 template_storage_key / 061 publish_state） + 1 个备选（062 rollout_org_ids）
  - server 端点：finalize 新增 422 + missing payload；export 失败时填 export_failure_reason；新增 GET `/api/document-templates/:id/preview-context-schema`
  - admin 前端：CaseFormsTab.vue 渲染 missing 清单 + 跳转链接；CaseFormFinalizeModal 预览变量；i18n 三语 fixHint 文案；timeline builder 扩展 export_failed reason
  - admin 模板管理（运营/法务角色）：草稿编辑 / 提交审核 / 灰度推进 UI（M5）
  - dev seed：seedDevDocTemplates 扩展 publish_state + 上传 7–8 份官方 docx 到 storage；contract test 三件全开
  - 兼容老记录：D2 阶段产出的 `status=exported, file_url=NULL` 占位记录不主动 backfill，前端展示「⚠️ 旧版生成，建议重新导出」+ 提供「重新导出」入口
  - 不做范围：PDF 直出 / 自定义模板上传 / 印影 PNG / 多语种自动翻译 / 在线模板编辑器（全部 P2 单独 RFC）
  回灌计划：
  - 目标文档：03-业务规则与不变量.md
    位置：新增「文書生成 preflight = 定稿门禁」「published 模板不可编辑」两条不变量
    Owner：研发 / 产品
    状态：待评审通过后回灌
  - 目标文档：04-核心流程与状态流转.md
    位置：§文書生成 — draft → final 加 preflight gate；export 失败时 export_failure_reason 分支
    Owner：研发
    状态：待回灌
  - 目标文档：06-页面规格/案件详情-文书Tab.md
    位置：export_failed 行展开 missing 清单 + 跳转链接；finalize 模态框预览变量
    Owner：研发 / 设计
    状态：待回灌
  - 目标文档：06-页面规格/系统设置-事务所基本情報.md
    位置：首次使用 D3 必须补全 4 项（gyoseishoshi_name / license_no / office_address_jp / office_phone）
    Owner：研发
    状态：待回灌
  - 目标文档：07-数据模型.md
    位置：generated_documents（+ export_failure_reason / fill_rate）；document_templates（+ template_storage_key / publish_state / rollout_org_ids）
    Owner：研发
    状态：待回灌
  - 目标文档：99-文档维护与版本记录.md
    位置：新增「文書 Context Schema 维护流程」章节，引用 81 / 82
    Owner：产品 / 法务
    状态：待回灌

- 时间：2026-05-08（chrome-devtools-mcp 第五轮 / 咨询 → 客户 → 案件 转化链路专项）
  问题：在 70 报告（V2）+ 73 报告（V4）已修复 7 项 P1（NEW-1/2/4 + V3-1/2/3 + P0-2 后端明细）后，
  以 admin 身份从 0 创建一个新线索 LEAD-202605-0010，按白名单状态机推进
  `新咨询→跟进中→待签约→已签约`，再触发「签约并开始建档」一键转化为
  CUS-202605-0015 + CASE-202605-0011，覆盖整条转化链路与所有产物的
  跨模块跳转 / 详情 Tab / 日志回看。
  结论（TL;DR）：链路自身工作正常（毫秒级同步生成客户+案件、状态机白名单生效、
  跨模块跳转无错），70/73 报告 7 项回归全部 PASS；本轮新发现 **P1 × 2**：
  **NEW-V5-1**「签约并开始建档」对话框组下拉显示日文 `東京一組`（zh-CN UI 漏出 ja-JP
  默认 locale，根因 `LeadConvertCaseDialog.vue:46` 调 `getActiveGroupAliasOptions()`
  无参，落入 `useGroupOptions.ts:120` 默认 `return "ja-JP"` 分支）；
  **NEW-V5-2** 线索转化结果卡片案件标题落到 `case_no` 且与副标题重复，根因
  双重：(a) `LeadConversionMapper.ts:63` 字段优先级反转 `caseNo || title` 应改为
  `title || caseNo`；(b) `LeadConvertedRecords.vue:102, 108` 两个 `<p>` 用同一表达式
  导致 caseNo 重复渲染，应拆为 name=title / meta=caseNo（与客户卡片 L56/L60 对齐）。
  另有 P2 × 2：NEW-V5-3（V5-1 衍生 placeholder 与选项 locale 混杂）/ NEW-V5-4（案件日志
  缺「由 LEAD-XXX 转化而来」反向记录，仅 LEAD 侧记录单向）。无新增 P0。
  关键依据：
  - docs/gyoseishoshi_saas_md/_output/74-MCP-lead-customer-case-conversion-walkthrough-2026-05-08-v5.md（本轮完整报告）
  - packages/admin/src/views/leads/components/LeadConvertCaseDialog.vue:46（V5-1 调用点缺 locale）
  - packages/admin/src/shared/model/useGroupOptions.ts:115-121, 228-241（V5-1 默认 locale 兜底为 ja-JP）
  - packages/admin/src/views/leads/model/LeadConversionMapper.ts:58-69（V5-2 字段优先级反转）
  - packages/admin/src/views/leads/components/LeadConvertedRecords.vue:101-109（V5-2 模板字段重复）
  - tmp/walkthrough-2026-05-08-v5/04-conversion-modal-signed.png、15-lead-conversion-final.png（V5-1/V5-2 现场）
  影响面：
  - 主功能：LEAD 转化对话框 / LEAD 转化 Tab「已生成记录」面板（仅显示层）
  - 衍生：所有 `getActiveGroupAliasOptions()` 无参调用点（建议全仓 audit）
  回灌计划：
  - 目标文档：P0/04-核心流程与状态流转.md
    位置：§4.1 咨询转案件（衍生：「跨实体转化必须在两侧都留可追溯日志」）
    Owner：admin 模块（LEAD/CUSTOMER/CASE 视图）
    状态：NEW-V5-1 / NEW-V5-2 / NEW-V5-3 / NEW-V5-4 已于 **2026-05-08 同日修复合入**（见 74 报告 §1.2 / §1.3 / §5.1 「修复落地」行）；同日追加修复 **70 §NEW-3 DATA-STALE**——`seedDevData.seedCases` 两段 INSERT 由 `ON CONFLICT (id) DO NOTHING` 改为 `DO UPDATE SET case_type_code/case_name`（`status/stage/business_phase` 不重置），CASE-DEV-002 在下一次 `npm run db:seed-dev` 后自动收敛到「技人国（认定）」（详见 74 报告 §1.4）。下一步把「显示型 adapter 字段优先级必须与字段语义一致」+「locale-aware 工具函数必须在 UI 层强制注入 locale」+「seed 必须以 DO UPDATE 自愈外显字段（`status/stage/business_phase` 例外）」三条入库口径回灌到 P0/04 + ESLint 规则候选。

- 时间：2026-05-07（R-FLOW2 chrome-devtools-mcp 走查第二轮 / 咨询 → 客户 → 案件 全链路）
  问题：在 R-FLOW（第一轮）所有 P1 修复（adapter 拆分、case_templates seed、
  CustomerCreateCaseGate 解耦 BMV、LeadLogPayloadFormatter 转化分支）已落库后，
  以 admin 身份再跑一遍 `new → following → pending_sign → signed →
  convert-customer → convert-case` 全链路，特意切到「家族滞在」（caseTypeCode =
  `dependent_visa`），覆盖与第一轮 work-visa 不同的业务路径。
  结论（TL;DR）：R-FLOW（第一轮）报的 D-1 / D-2 / H-1 / C-1 / G-2（cases
  列表口径）已经真的修好（PG ↔ UI 完全对齐、convert 后 UI 立即刷新到
  `convertedCase`、日志 Tab 新增「转化」分类与正确文案、cases 列表 owner
  picker 切到真用户）；但本轮同时把第一轮没提到的两条 P0/P1 推到红线：**P0 1 条**
  （**R-FLOW2-A-1** R-FLOW-G-1 的 SQL 修复在 `customers.query.ts` 把
  `ca.case_type_label` 写进 `buildCaseNamesExpr`，但 `cases` 表根本没有这一列，
  PG 解析期就报 `column "case_type_label" does not exist`，
  `/api/customers`、`/api/customers/:id` 全 500，整个客户模块在 admin UI
  不可访问）/ **P1 3 条**（**R-FLOW2-B-1** case_templates 与 admin caseTypeCode
  口径错配——`family-stay → dependent_visa`、`work-visa → work` 与 seed
  里的 `family_stay` / `engineer_humanities_intl_visa` 完全不重合，模板查询
  永远 miss，document_items 仍 0/0；**R-FLOW2-C-1** `HEADER_BUTTON_PRESETS.signedNotConverted`
  把 `convertCase` 设为 `"hidden"`，导致 banner / 顶部 header / 转化 Tab
  三处「签约并开始建档」入口同时失效，与 banner 文案「下一步请直接开始建档」
  自相矛盾；**R-FLOW2-D-1** customer 列表 500 被前端静默吞掉，UI 显示「我的
  客户 0 位」但 PG 实际 21 条）/ **P2 3 条**（R-FLOW2-E-1 dedup 把 lead
  自己识别为「可能重复」/ R-FLOW2-E-2 lead 详情 `?tab=log` 不被 active
  tab 还原 / R-FLOW2-F-1 转化 Tab 在 `convertedCase` 状态下没切「已建案件」
  view）/ **P3 2 条**（R-FLOW2-G-1 leads 列表对 `family_stay` 旧数据仍 snake-case /
  R-FLOW2-G-2 转化日志 link 显示 UUID 前缀而非 case_no/customer_no）。
  关键依据：
  - docs/gyoseishoshi_saas_md/_output/63-咨询客户案件全链路chrome-devtools-mcp走查-第二轮.md（本轮完整报告）
  - packages/server/src/modules/core/customers/customers.query.ts:97-113（`buildCaseNamesExpr` 引用不存在的 `ca.case_type_label`）
  - packages/admin/src/i18n/messages/_shared/businessTypes.ts:69（`BUSINESS_TYPE_TO_CASE_TYPE_CODE` 与 seed `case_templates.case_type` 不重合）
  - packages/server/src/scripts/seedCaseTemplates.ts（seed 用 `family_stay` / `engineer_humanities_intl_visa`）
  - packages/admin/src/views/leads/types-detail.ts:364-370（`signedNotConverted.convertCase = "hidden"`）
  - packages/admin/src/views/leads/components/LeadBannerStrip.vue:18-22（banner 仅 `enabled \|\| highlighted` 才渲染按钮）
  - PG 直查：`select case_type_code from cases where case_no='CASE-202605-0008'` → `dependent_visa`，`select count(*) from document_items where case_id=...` → 0
  - reqid 2479 GET /api/customers/0577eb14... → 500（generic Internal server error）
  影响面：
  - admin 客户模块：列表 / 详情 全 500，无法继续作业
  - lead → customer → case 主链路：family-stay 路径下「一键签约并建档」CTA 全失，必须先点「仅建客户档案」+ 通过 dedup 弹窗 +「签约并开始建档」 三步
  - 资料清单：所有新建 case 仍然 0/0，Gate-A（S3 → S4）触发条件永远满足不了
  - 与 P0/04-核心流程 §4.1 / §4.2、P0/06-页面规格/客户.md §3 / §4 直接冲突
  回灌计划：
  - 目标文档：docs/gyoseishoshi_saas_md/P0/04-核心流程与状态流转.md
    位置：§4.1 「咨询转案件」末尾增加「门禁与按钮预设映射表（signed/convertedCustomer/convertedCase）」
    Owner：行政书士 SaaS 主链路 lead-customer-case
    状态：待回灌
  - 目标文档：docs/gyoseishoshi_saas_md/_output/ADR-case-templates-as-checklist-ssot.md
    位置：「caseTypeCode ↔ case_templates.case_type 口径」章节
    Owner：cases 模块
    状态：待回灌（建议同 PR 加 alias 字段并补 migration）

- 时间：2026-05-07（R-SETTINGS-01 chrome-devtools-mcp 走查第一轮 / 系统设置 - 成员与角色管理）
  问题：用 chrome-devtools-mcp 端到端走查 admin 端「系统设置」页
  下「成员管理」与「角色管理」两个 tab 的所有可达流程，覆盖列表
  加载 / 创建 / 编辑 / 角色变更 / 重置密码 / 停用启用 / 个性化权限
  抽屉 / 角色 CRUD / 权限矩阵保存 / i18n / a11y / URL 同步。
  结论（TL;DR）：两 tab 在「初次加载 / 刷新」之后均处于完全
  空列表状态——成员表「暂无成员」、角色表「Invalid roles list response」+
  「暂无角色定义」，settings 模块列表视图实质不可用。共 13 条
  缺陷：**P0 2 条**（R6-M-1 `GET /api/users` server 返回精简 DTO
  缺 `email`，client `adaptMemberItem` 强校验 email 把所有现有成员过滤
  → 永远「暂无成员」；R6-R-1 `GET /api/admin/roles` server 返回
  `{ items: [...] }` 包装对象，client `doListRoles` 期望裸数组 →
  解析失败 + 列表永远空，且行 action 入口不可达 → 编辑/复制/删除
  全部阻塞）/ **P1 2 条**（R6-R-2 编辑角色名称后 watcher 用 server
  payload 覆盖本地未保存权限勾选，静默丢数据；R6-M-2 `MemberCreateModal` /
  `MemberRoleModal` dropdown 硬编码 4 个系统角色，无法分配自定义角色 →
  打破角色管理存在的意义）/ **P2 4 条**（R6-M-3 `actorRole` 永远
  fallback owner、R6-M-4 个性化权限抽屉 `roleId=undefined` 来自角色列
  全空、R6-M-5 / R6-R-3 重复 email / role code 错误码原文显示）/
  **P3 5 条**（R6-M-6 停用无确认 / R6-M-7 失败后表单 reset / R6-N-1
  子导航不写回 URL / R6-A-1 复制角色 dialog aria-label 不一致 /
  R6-N-2 8 条 i18n empty key warning）。两条 P0 同源——client adapter
  与 server payload 字段契约错位，与 R-CONSULT-05 R5-G-1 / R5-D-1
  同病：缺统一契约 fixture + shared types。
  关键依据：
  - docs/gyoseishoshi_saas_md/_output/61-成员与角色管理chrome-devtools-mcp走查-第一轮.md（本轮完整报告）
  - packages/admin/src/views/settings/model/UsersAdminRepository.ts:187（adapter 强校验 `typeof v.email !== "string"`）
  - packages/admin/src/views/settings/model/RolesAdminRepository.ts:45（`if (!Array.isArray(body)) throw new Error("Invalid roles list response")`）
  - packages/server/src/modules/core/users/users.controller.ts（list endpoint 返回 `{id, displayName, role, roleId, status}` 精简 DTO）
  - packages/server/src/modules/core/auth/rolesAdmin.controller.ts（list endpoint 返回 `{ items: RoleListItemDto[] }` 包装）
  - packages/admin/src/views/settings/components/RoleDetailPanel.vue（`watch(() => props.role)` 用 server permissions 覆盖 localPermissions）
  - packages/admin/src/views/settings/components/MemberCreateModal.vue:28 / MemberRoleModal.vue:31（`const ALL_ROLES = ["staff", "viewer", "manager", "owner"]` 硬编码）
  - packages/admin/src/views/settings/SettingsView.vue（`@open-overrides="(payload) => memberOverrides.openDrawer(payload)"`，payload 没有 `roleId`）
  - chrome-devtools-mcp 实测 `GET /api/users` 200 但 client UI 列表 0 条；`GET /api/admin/roles` 200 但 UI 显示「Invalid roles list response」+ EmptyState
  影响面：
  - **成员管理列表实质不可用**：admin 看不到 6 名 seed 成员（含
    自己），停用/启用/重置密码/变更角色/个性化权限五个行 action
    全部不可达；只有刚创建的新成员能在乐观渲染窗口短暂可见，刷新
    即消失
  - **角色管理列表实质不可用**：4 个系统角色 + 任何自定义角色都
    看不见，删除/编辑权限矩阵/复制角色三个行 action 全部不可达；
    `POST /api/admin/roles/:id/permissions` 写入成功但 UI 永远
    看不到结果
  - **R6-M-2 与 R6-R-1 形成 dependency**：即使 R6-R-1 修了，
    R6-M-2 不修，自定义角色仍进不了 `MemberCreateModal` /
    `MemberRoleModal` dropdown
  - **R6-M-1 / R6-R-1 暴露的两条 P0 都是「server DTO 与 client adapter
    契约错位」**——R6-M-1 是 list / detail DTO 形状不一致，R6-R-1
    是 list / detail 包装方式不一致；说明 settings 模块 client / server
    字段映射层缺一个统一的契约 fixture + shared types（与 R5-G-1 /
    R5-D-1 同源）
  回灌计划：
  - 目标文档：docs/gyoseishoshi_saas_md/_output/61-成员与角色管理chrome-devtools-mcp走查-第一轮.md
    位置：本轮完整报告（独立文件）
    Owner：研发
    状态：已生成（2026-05-07）
  - 目标文档：docs/gyoseishoshi_saas_md/_raw/00-inbox.md
    位置：追加 R6-M-1 / R6-R-1 / R6-R-2 / R6-M-2 四条作为下一轮
    R-SETTINGS 修复单
    Owner：研发
    状态：待回灌

---

- 时间：2026-05-07（R-CONSULT-05 chrome-devtools-mcp 走查第五轮）
  问题：R4 系列前端修复 6 条已落地（R4-A-1 列表 tags chip 列与过滤 /
  R4-A-2 详情线索编号 / R4-A-3 来源字段拆分 / R4-D-2 发送字段名对齐 /
  R4-E-2 所属组 dropdown / R4-F-1 dedup 排除自身），R3-F-1 / R3-F-2
  bulk-tags 端到端闭环已走通。需要做一轮端到端 chrome-devtools-mcp
  走查：① 验证 R4 已修条目实际 UI 行为是否仍通；② 验证 R4-D-1
  messages 拉取 + R4-D-2 send 修复后会话主路径是否真正可读可写；
  ③ 验证 R4-B-1 lead 详情会话 Tab 是否真渲染该 lead 的会话列表；
  ④ 验证 R3-F-1 / R3-F-2 bulk-tags toast + chip + audit 是否端到端闭环。
  结论（TL;DR）：R4 已修 6 条 admin UI 全部回归通过；R3-F-2 端到端
  闭环（PG 持久化 + audit + 列表 refetch + chip 折叠 popover）真正
  走通；但本轮新发现 9 条缺陷：P0 0 条 / **P1 2 条**（R5-G-1
  conversations.admin.types.ts `lm.sender_role` 列名错（实际列
  `sender_type`），导致 `GET /admin/conversations` 整体 500，同时阻断
  会话列表页 + lead 详情会话 Tab；R5-D-1 ConversationAdapterMappers
  `mapMessage` 读 `content/translatedContent`，server payload 字段是
  `originalText/translatedTextJa|Zh|En`，导致所有 message bubble 正文
  永远为空、仅显示「翻译中…」hint）/ **P2 2 条**（R5-D-2 convert
  auto-chain 在 already-converted customer 时把错误冒泡为通用 toast，
  没识别为预期分支跳过 → BMV gate 4 条 blockers 始终到不了 dialog；
  R5-E-1 reassign / convert-case / bulk-assign 三处 owner picker 都
  fallback 到 `[currentOwner]` 单元素列表，没用 `useOwnerOptions`，
  与 R4-D-3 同源扩面）/ **P3 5 条**（R5-A-1 tags 筛选不写回 URL hash /
  R5-A-2 chip 折叠 button 无 aria-label / R5-A-3 lead 详情基础信息
  Tab 不渲染 tags / R5-A-4 bulk-tags 成功无 toast 反馈 / R5-F-1
  message send 未落 timeline_logs 审计）。
  关键依据：
  - docs/gyoseishoshi_saas_md/_output/60-咨询模块chrome-devtools-mcp走查-第五轮.md（本轮完整报告）
  - packages/server/src/modules/core/conversations/conversations.admin.types.ts:47,50（`CONV_LIST_JOIN_COLS` / `CONV_LIST_JOINS` 引用 `lm.sender_role`，PG 列名为 `sender_type`）
  - packages/admin/src/views/conversations/model/ConversationAdapterMappers.ts:175,179（`mapMessage` 读 `content/translatedContent`，server 返回 `originalText/translatedTextJa|Zh|En`）
  - packages/admin/src/views/leads/model/useLeadDetailModel.ts（convertCase auto-chain 未识别 already-converted skip 分支）
  - packages/admin/src/views/conversations/components/ConversationOwnerPickerDialog.vue / packages/admin/src/views/leads/components/LeadConvertCaseDialog.vue / 列表批量操作 owner picker（三处统一未走 `useOwnerOptions`）
  - PG: `select tags from leads where id='8a7b2cf3...'` → `{R5-walk}`；`select tags from leads where id='00000000-0000-4000-b000-000000000010'` → `{R5-walk,朋友,测试,面談済,VIP,優先}`（R3-F-2 端到端闭环证据）
  - PG: `select original_text, sender_role from messages limit 1;` → `ERROR: column "sender_role" does not exist. HINT: Perhaps you meant to reference the column "messages.sender_type".`（R5-G-1 直接证据）
  - chrome-devtools-mcp 实测 `GET /admin/conversations` × 多形态 500（无论 `?leadId=...` 还是 `?scope=mine`）
  - chrome-devtools-mcp 实测 `POST /messages 201`（R4-D-2 已修），但 mount 后 6 条 bubble 正文全部为空（R5-D-1）
  - chrome-devtools-mcp 实测 reassign / convert-case dialog dropdown 选项数 = 1，列表筛选 dropdown 选项数 = 7（R5-E-1 共同退化）
  - timeline_logs：conversation.{assigned/closed/reassigned/reopened} 计数齐全，**无 conversation.message_sent**（R5-F-1）
  影响面：
  - **会话主路径再次阻断**：R5-G-1 让会话列表整体 500（含 lead 详情会话 Tab，把 R4-B-1 修复方向 2 拉回 R4 之前的体感）；R5-D-1 让 R4-D-1 已修的 messages 拉取在视觉上等于没修；admin 端会话功能整体不可用，与 R4 时差不多
  - **owner 指派路径全面退化**：R5-E-1 让 reassign / convert-case / bulk-assign 三处都只能指派给当前用户自己，业务管理流程实质阻塞（主办人 admin 无法把会话 / 案件 / 批量 lead 指派给团队其他成员）
  - **convert-case happy-path 永远失败**：R5-D-2 让所有 signed + has-customer lead 在 UI 上点「签约并开始建档」都失败（实际上 server BMV gate 已结构化返回 4 条 blockers，client 无法识别 already-converted skip 分支，错误冒泡为通用 toast）
  - **R5 暴露的两条 P1 都是「契约已修复但又在新地方错位」**——R5-G-1 是新加 join 写错列名，R5-D-1 是写侧字段统一了但读侧 mapper 没跟上；说明会话模块在 client / server 的字段映射层缺一个统一的契约 fixture + shared types
  回灌计划：
  - 目标文档：docs/gyoseishoshi_saas_md/_output/60-咨询模块chrome-devtools-mcp走查-第五轮.md
    位置：本轮完整报告（独立文件）
    Owner：研发
    状态：已生成（2026-05-07）
  - 目标文档：docs/gyoseishoshi_saas_md/_raw/00-inbox.md
    位置：追加 R5-G-1 / R5-D-1 / R5-E-1 / R5-D-2 四条作为下一轮修复单
    Owner：研发
    状态：待回灌
  - 目标文档：R-CONSULT-05 修复 PR 计划
    位置：建议拆 4 个 PR：(1) R5-G-1 + R5-D-1 + R5-F-1 一起解锁会话主路径；(2) R5-E-1 三处 owner picker 共同 fix；(3) R5-D-2 + R4-F-2 + R5-A-3 conversion + projection 补全；(4) R5-A-1 + R5-A-2 + R5-A-4 leads list UX 收尾
    Owner：研发
    状态：待排期
  - 目标文档：下一轮 R-CONSULT-06 命题
    位置：把 server `messages.admin.types.ts` 与 client `views/conversations/types.ts` 字段映射提到共享 ts/zod 单一数据源，杜绝 R5-G-1 / R5-D-1 这类「契约新错位」复发
    Owner：研发
    状态：待排期

- 时间：2026-05-06（R-CONSULT-04 chrome-devtools-mcp 走查第四轮）
  问题：R3 系列修复 7 条服务端 + 前端契约对齐已落地（见 outputs.md
  R3-A-1 / R3-D-2 / R3-E-1 / R3-E-2 / R3-E-3 / R3-E-5 / R3-F-2 等条目），
  在途修复（R3-C-2 convert-case auto-chain / R3-D-1 dedup-confirm
  reactive / bulk-tags 持久化）已有单测。需要做一轮端到端 chrome-devtools
  -mcp 走查：① 验证 R3 已修条目实际 UI 行为是否仍通；② 抓取
  R3 阶段未触达或浅触达的会话 / 转化主路径阻断点；③ 校验 P0 spec
  与 admin 实际行为之间是否存在新 drift。
  结论（TL;DR）：R3 已修 7 条 admin UI / API 全部回归通过；R3 在途
  修复服务端契约已对齐，前端测试覆盖；本轮新发现 11 条缺陷：
  P0 0 条 / **P1 3 条**（R4-A-1 列表 tags 列与过滤未实现、
  R4-D-1 会话详情消息时间线根本未拉取、R4-D-2 发送字段名错位）/
  **P2 4 条**（R4-B-1 lead 详情会话 Tab 永远空 / R4-C-1
  lastMessagePreview 永远空串 / R4-E-1 convert-case dialog ownerUserId
  偶发缺失 + 通用 toast / R4-F-2 customers.name 永为 null）/
  **P3 4 条**（R4-A-2 编号字段歧义 / R4-A-3 来源字段重复渲染 /
  R4-D-3 owner picker 选项少 / R4-E-2 convert-case 所属组用 UUID textbox）。
  关键依据：
  - docs/gyoseishoshi_saas_md/_output/59-咨询模块chrome-devtools-mcp走查-第四轮.md（本轮完整报告）
  - packages/admin/src/views/conversations/model/useConversationDetailModel.ts:128（messages 永远来自 adapter 的 `[]`，getMessages 结果未写回 state）
  - packages/admin/src/views/conversations/model/ConversationAdapterMappers.ts:297,304（adaptConversationDetailAggregate 写死 `messages: []`）
  - packages/admin/src/views/conversations/model/useConversationDetailModel.ts:158（sendMessage 透传 `{content}`）
  - packages/server/src/modules/core/conversations/messages.admin.controller.ts:136-139（server 期望 `originalLanguage` + `originalText`）
  - packages/server/src/modules/core/conversations/conversations.admin.service.ts:396（`lastMessagePreview: ""` 写死）
  - docs/gyoseishoshi_saas_md/P0/06-页面规格/咨询线索.md §2.1 / §2.2（spec 写 tags chip + tags 过滤，admin UI 缺失）
  - PG: `select tags from leads where id='8a7b…'` → `{R4-walk,R4-tag-2}`（R3-F-2 服务端落地证据）
  - chrome-devtools-mcp 实测 `.conv-detail__messages` 子节点数 = 0（R4-D-1）
  - chrome-devtools-mcp 实测 `POST /messages` 400 `originalLanguage is required`（R4-D-2）
  影响面：
  - **会话主路径阻断**：admin 在会话详情页既看不到历史消息（R4-D-1）也无法发送新消息（R4-D-2）；R3-E-2 / R3-E-3 / R3-E-5 修复让"页面不崩"，但读写两端都无法走通
  - **咨询列表 spec drift**：tags 服务端契约（migration 053 + bulk + filter + audit）全部落地，但 admin 列表 UI 缺 chip 列与 tags 筛选入口（R4-A-1）
  - **咨询详情 spec drift**：lead 详情第 3 个 Tab「会话」永远空态（R4-B-1），spec §3 未明确该 Tab 但 UI 存在
  - **转化路径**：convert-case dialog 偶发 ownerUserId race（R4-E-1），BMV gate 4 条 blockers 已在 server 返回但 UI 未渲染到 dialog
  回灌计划：
  - 目标文档：docs/gyoseishoshi_saas_md/_output/59-咨询模块chrome-devtools-mcp走查-第四轮.md
    位置：本轮完整报告（独立文件）
    Owner：研发
    状态：已生成（2026-05-06）
  - 目标文档：docs/gyoseishoshi_saas_md/_raw/00-inbox.md
    位置：追加 R4-D-1 / R4-D-2 / R4-A-1 三条 P1 + 1 条 spec drift（lead 详情 Tab 排布）
    Owner：研发
    状态：待回灌
  - 目标文档：docs/gyoseishoshi_saas_md/P0/06-页面规格/咨询线索.md
    位置：§3「Tab 排布」补一行『Tab 3: 会话（聚合该 lead 的会话列表）』；实现状态対照表 §2.1 / §2.2 行从 ✅ 调整为「⚠️ 服务端已落地，UI tags chip / 过滤待补」
    Owner：研发
    状态：待回灌（与 R4-A-1 + R4-B-1 修复 PR 一并）
  - 目标文档：R-CONSULT-04 修复 PR 计划
    位置：建议拆 3 个 PR：(1) R4-D-1 + R4-D-2 解锁会话主路径；(2) R4-A-1 admin tags UI 落地；(3) R4-B-1 + R4-C-1 + R4-F-2 conversations & customers projection 补全
    Owner：研发
    状态：待排期

- 时间：2026-05-06（R-CONSULT-03 Batch F — R3-G-1 followups 契约 + controller UUID 化 audit）
  问题：R3-G-1 走查发现 `GET /admin/leads/:id/followups` 返回裸数组 `LeadFollowup[]`，与全站列表 `{items, total}` 契约不一致；同时需对 leads / conversations / cases / customers / billing 各 controller 做 UUID 化全量 audit，确认 `optStr` → `optUuid` 迁移无残留。
  结论（TL;DR）：**R3-G-1**：followups / logs 两个子接口均返回裸数组，与全站 `{items, total}` 契约不一致。本轮不改（避免破坏现有消费方），留待下一个 endpoint 契约拉通 PR 统一处理——届时需同步更新前端 adapter 与测试。**UUID audit**：截至 2026-05-06，全部 controller 的 UUID 类参数（`ownerUserId` / `groupId` / `customerId` / `caseId` / `leadId` / `appUserId`）已迁移到 `optUuid`，无遗留 `optStr` 风险。audit 详情：(1) `leads.admin.controller.ts` — `ownerUserId` / `groupId` / `customerId` 已全部 `optUuid`（R3-A-1 + R2-A-1 修复）；(2) `conversations.admin.controller.ts` — `ownerUserId` / `leadId` / `customerId` / `caseId` / `appUserId` 已全部 `optUuid`；(3) `cases` / `customers` / `billing` controllers — 无 `optStr` 用于 UUID 字段；(4) `messages.admin.controller.ts` — `optStr` 仅用于 `kind` / `visibleScope`（非 UUID），无残留。
  关键依据：
  - packages/server/src/modules/core/leads/leads.admin.controller.ts:326（followups 端点，裸数组返回）
  - packages/server/src/modules/core/leads/leads.admin.service.ts:303-313（`listFollowups` 返回 `LeadFollowup[]`）
  - packages/server/src/modules/core/leads/leads.admin.service.ts:321-328（`listLogs` 返回 `LeadLog[]`）
  - packages/server/src/modules/core/leads/leads.admin.service.ts:115（`list` 对比：返回 `{items, total}`）
  - packages/server/src/modules/core/leads/leads.admin.controller.ts:142-143,165-166,219,266-267（`optUuid` 已覆盖全部 UUID 字段）
  - packages/server/src/modules/core/conversations/conversations.admin.controller.ts:104-108,143（`optUuid` 已覆盖全部 UUID 字段）
  - .cursor/plans/consult-r3-fix-plan_277736d4.plan.md §八 Batch F（来源计划）
  影响面：
  - `GET /admin/leads/:id/followups` 返回裸数组，前端 adapter 当前直接消费数组，若后续改 `{items, total}` 需同步更新
  - `GET /admin/leads/:id/logs` 同上
  - UUID audit 确认无遗留——后续可建立 lint 规则禁止对 `*UserId` / `*GroupId` / `*CustomerId` / `*CaseId` / `*LeadId` 使用 `optStr`
  回灌计划：
  - 目标文档：docs/gyoseishoshi_saas_md/_raw/00-inbox.md
    位置：最新追加（R3-G-1 + UUID audit backlog）
    Owner：研发
    状态：已回灌（2026-05-06）
  - 目标文档：endpoint 契约拉通 PR（backlog）
    位置：followups / logs 裸数组 → `{items, total}`
    Owner：研发
    状态：待排期（下一轮专门 PR，与 R3-A-1 / R2-D-1 / R2-D-2 一脉相承）

- 时间：2026-05-06（R-CONSULT-03 决策 R3-F-2 / R3-F-1 — tags 持久化方案锁定）
  问题：R3 走查 R3-F-2 发现 `bulkTags` 批量打标签操作无持久化——标签仅存在于前端内存，刷新即丢失，列表无 chip 渲染，无法按标签过滤。如何最小改动落地 tags 持久化？
  结论（TL;DR）：R-CONSULT-03 决策锁定 R3-F-2 持久化方案——新增 `leads.tags text[]` 列（NOT NULL DEFAULT '{}'），GIN 索引；写入语义为合并去重（`array(select distinct unnest(tags || $new::text[]))`），不覆盖已有标签；列表过滤使用 `tags && $tags::text[]`（交集匹配，任一命中）；`LeadSummary` 响应新增 `tags: string[]` 字段，前端渲染为 chip 横排（超出缩略）；每次 bulkTags 写入产生 `audit_log(tags_updated)`。R3-F-1（bulk-tags UI 反馈）同步落地：toast 提示 + 列表自动 refetch。
  关键依据：
  - packages/server/src/infra/db/migrations/053_leads_tags.up.sql（`ALTER TABLE leads ADD COLUMN tags text[] NOT NULL DEFAULT '{}'` + GIN 索引）
  - packages/server/src/infra/db/migrations/053_leads_tags.down.sql（回退脚本）
  - packages/server/src/modules/core/leads/leads.admin.bulk.ts（bulkTags 合并去重写入 + audit_log）
  - packages/server/src/modules/core/leads/leads.admin.query.ts（pushTagsFilter: `tags && $tags::text[]` 交集匹配）
  - packages/server/src/modules/core/leads/leads.admin.controller.ts（list 输入加 `tags` 参数）
  - packages/server/src/modules/core/leads/leads.admin.bulk.tags.test.ts（持久化 + 合并去重测试）
  - packages/server/src/modules/core/leads/leads.admin.controller.tags.test.ts（list tags 过滤测试）
  - packages/admin/src/views/leads/model/LeadAdapterMappers.ts（adaptLeadListItemDto 读 tags 数组）
  - .cursor/plans/consult-r3-fix-plan_277736d4.plan.md §七 Batch E（执行计划）
  影响面：
  - server leads 表新增 `tags text[]` 列 + GIN 索引（migration 053）
  - server `GET /admin/leads` list 响应新增 `tags: string[]`，支持 `?tags=tag1&tags=tag2` 过滤
  - server `POST /admin/leads/bulk/tags` 持久化至 DB，合并去重，审计日志
  - admin 列表页 tags chip 横排渲染
  - admin 列表页 tags 筛选条件
  - P0 页面规格 §2.1 / §2.2 / §2.3 同步更新
  回灌计划：
  - 目标文档：docs/gyoseishoshi_saas_md/P0/06-页面规格/咨询线索.md
    位置：§2.1 列表字段（+tags chip）、§2.2 默认筛选（+tags）、§2.3 批量动作（+tags 数据契约）、实现状态対照表（§2.1/§2.2/§2.3 行更新）
    Owner：研发
    状态：已回灌（2026-05-06）
  - 目标文档：docs/gyoseishoshi_saas_md/_output/00-outputs.md
    位置：最新产出（本条）
    Owner：研发
    状态：已回灌（2026-05-06）

- 时间：2026-05-05（ADR-009 + R-H5-2 走查）
  问题：S1~S7 H5 响应式修复后，是否达到 R-H5-1 走查的 P0 修复目标？需要沉淀什么决策？
  结论（TL;DR）：ADR-009 已沉淀 5 条决策（mobile-first 基线 / minmax(0, fr) / ResponsiveTable / contract test 守门 / i18n attribute 禁 CJK 硬编码）。R-H5-2 复跑走查：18 条中 14 条 FIXED、4 条 IMPROVED/OPEN（S7 残留）、1 条 OPEN（settings 双列布局）。横向溢出 = 0 的页面从 0/10 升至 7/10，console warning 从 16 条降至 0，CJK 硬编码 aria-label 从 2 处降至 0。
  关键依据：
  - docs/gyoseishoshi_saas_md/00-原则与约定/ADR-009-h5-responsive-strategy.md（5 条决策）
  - docs/gyoseishoshi_saas_md/_output/55-H5响应式走查-第二轮.md（R-H5-2 完整报告）
  - docs/gyoseishoshi_saas_md/_output/54-H5响应式走查-第一轮.md（R-H5-1 基线）
  - packages/admin/src/static-checks/h5-overflow.contract.test.ts（grid + table 守门）
  - packages/admin/src/styles/breakpoints.css（4 档断点 token）
  - packages/admin/src/shared/ui/ResponsiveTable.vue（桌面 table / 移动 stacked 卡片）
  - .cursor/plans/h5_responsive_fix_plan_94634db4.plan.md（S1~S8 执行计划）
  影响面：
  - admin 全站 H5 适配：7/10 核心页面 0 溢出
  - admin styles：4 档断点 token 体系
  - admin shared/ui：ResponsiveTable 共享组件
  - admin i18n：aria-label CJK 扫描规则 + html lang 跟随 locale
  - 工程守门：h5-overflow.contract.test.ts（grid 裸 fr + table 裸 table）
  回灌计划：
  - 目标文档：docs/gyoseishoshi_saas_md/00-原则与约定/ADR-009-h5-responsive-strategy.md
    位置：全文（新建）
    Owner：研发
    状态：已回灌（2026-05-05）

- 时间：2026-05-02（R25 chrome-devtools-mcp 案件详情深度审计 第四轮）
  问题：用户 R25 任务"使用 chrome-devtools-mcp 走查案件详情里面的所有 UI 问题和业务逻辑"——聚焦 admin `/cases/:id` 详情页，覆盖头部、10 个 tab、3 个 modal、状态流转 popover 与三语 i18n 一致性，找 R22/R23/R24 都没看到的纯详情页内部缺陷。
  结论（TL;DR）：R25 共发现 14 条新 bug（P1 6 / P2 4 / P3 4），主要分布于：① **4 个死按钮**（BUG-214 文書 tab "生成文書"、BUG-215 期限 tab "添加期限"、BUG-217 沟通记录 tab "记录留痕"、BUG-218 任务 tab "新增任务" 跳转死循环）；② **3 处 i18n 拼写/漏译**（BUG-212 `common.comingSoon` 实际不存在应为 `shell.comingSoon` 4 处按钮 hover 暴露 raw key、BUG-221 ja-JP 字典 `cases.constants.logCategories.all = "全部"` 漏译应为"すべて"、BUG-214/215 整组件 hardcode 中日文混杂）；③ **2 处工程数据泄漏到业务用户**（BUG-213 基础信息 tab "案件编号" 显示 UUID 不是 `CASE-...`，"案件类型" / "申请类型" 显示原始 enum `biz_mgmt_cert_4m` / `certification` 没走已存在的 `cases.constants.caseTypes.*` / `applicationTypes.*` 字典；BUG-219/220 日志 tab `case_party.created` event_type / `案件创建：biz_mgmt_cert_4m` 直显未 i18n）；④ **1 处终态权限失守**（BUG-216 终态案件 header "编辑信息" / "状态流转" 按钮无 `:disabled="isReadonly"` 守门，点 "状态流转" 弹空 popover、点 "编辑信息" 弹完全可编辑 modal——与页面 readonly banner 矛盾）；⑤ **3 处 UX 文案 / 空状态**（BUG-222 概览侧边栏 "案件团队" / "近期动态" 空数据时无 placeholder 文案、BUG-223 "已归档（已归档）" 重复文案、BUG-224 编辑 modal 仅 3 字段）；⑥ **1 处业务一致性**（BUG-225 phase=WAITING_PAYMENT 的 case 允许 billing_records 为空，"等待尾款"语义被掏空）。同轮还回归确认 R24 BUG-208（admin↔server PHASE_TRANSITIONS）✅ 已 LANDED + R24 BUG-211（ja-JP "校験"→"検証"）✅ 已 LANDED；BUG-191/192/199/205 R23 LANDED 项 R25 仍 PASS。整轮 0 个 5xx / 0 console error。R25 走查教训：4 个死按钮归纳为"UI 入口先行、handler 没接"模式，2 个 i18n 拼写错误归纳为"i18n key 静态检查缺失"，建议加 lint：① 禁 `<button>` 不带 @click/:disabled；② 三语字典 key 集合一致性 + 静态 t() 调用检查；③ `.vue` template 禁汉字硬编码；④ 抽 `useCaseDetailGuard` composable 统一 readonly/terminal 守门。
  关键依据：
  - docs/gyoseishoshi_saas_md/_output/35-案件详情chrome-devtools-mcp深度审计-第四轮.md（R25 完整报告，含 8 节、§0.2 BUG-212~225 完整表）
  - docs/gyoseishoshi_saas_md/_output/audit-cases-mcp-r4/（13 张取证截屏，覆盖 BUG-212~225）
  - packages/admin/src/views/cases/components/CaseValidationTab.vue L83-86 / L243-246（BUG-212 `:title="t('common.comingSoon')"` 拼错位置）
  - packages/admin/src/views/cases/components/CaseValidationSupport.vue L49-52 / L144-147（BUG-212 同样问题）
  - packages/admin/src/views/cases/components/CaseInfoTab.vue L71/L84/L98（BUG-213 字段值未走 i18n）
  - packages/admin/src/i18n/messages/cases/ja-JP.ts L727 / L729 / L80-84（caseTypes / applicationTypes 字典已存在，view 未调用）
  - packages/admin/src/views/cases/components/CaseFormsTab.vue 整个文件（BUG-214 缺 useI18n + 7 处硬编码 + 0 个 @click）
  - packages/admin/src/views/cases/components/CaseDeadlinesTab.vue L70/L85/L123-126/L134/L148/L150/L177（BUG-215 中日文混杂 + 0 个 @click）
  - packages/admin/src/views/cases/components/CaseMessagesTab.vue L104-106（BUG-217 publish 按钮无 @click）
  - packages/admin/src/views/cases/components/CaseTasksTab.vue L59 / L132 emit + CaseDetailView.vue 路由实现（BUG-218 跳转 /tasks 死循环）
  - packages/admin/src/views/cases/CaseDetailView.vue L273（编辑信息）/ L309-313（状态流转）/ L353-355（readonly banner）（BUG-216 + BUG-223）
  - packages/admin/src/views/cases/components/CaseLogTab.vue L106 + ja-JP/en-US/zh-CN.ts logCategories（BUG-219/220/221）
  - packages/admin/src/views/cases/model/businessPhaseTransitions.ts（R24 BUG-208 LANDED 证据，admin 副本与 server 完全对齐）
  影响面：
  - 案件详情页 4 个核心写操作按钮（生成文書 / 添加期限 / 记录留痕 / 新增任务）UI 入口完全失效 —— 沟通记录 / 期限管理 / 文書生成 / 任务创建 这 4 类 P0 业务功能在 admin UI 上不可用 —— BUG-214/215/217/218 P1
  - 终态案件权限失守：用户可能误改归档案件 —— BUG-216 P1
  - 多处 i18n key 错误 / 漏翻 / 字段值未本地化 —— BUG-212/213/214/215/219/220/221 跨 P1~P2
  - admin/server 两类 enum（caseType / applicationType）字典已建好但 view 没调用 —— BUG-213 修复成本极低
  - "WAITING_PAYMENT 必须有 billing 记录" 业务约束在 server 缺失 —— BUG-225 P3
  - **测试方法学层面**：14 条 bug 中 11 条是单元测试无法覆盖（死按钮无 emit / i18n 字典拼写错误 / 整组件未 useI18n / readonly 守门散布），需补 lint 规则 + render-snapshot 三语对比 + composable 守门 contract test
  回灌计划：
  - 目标文档：docs/gyoseishoshi_saas_md/_raw/00-inbox.md
    位置：追加 R25 BUG-212~225 列表 + 4 个工程债务模式
    Owner：研发 / QA
    状态：待回灌（建议在下次 sprint planning 提 BUG-212 / BUG-213 / BUG-216 / BUG-217 / BUG-218 五条 P1 优先排期，配套加 i18n key 静态检查 lint）

- 时间：2026-05-02（R24 chrome-devtools-mcp 案件全流程深度审计 第三轮）
  问题：用户 R24 任务"chrome-devtools-mcp 测试案件的所有的流程"——在 R22 / R23 已覆盖的主链路之外，深挖回退分支（NEED_SUPPLEMENT/SUPPLEMENT_PROCESSING）、终态归档路径、admin↔server 协议同步、a11y、i18n、历史 backfill。R24 是否能找到 R22 / R23 没看见的新缺陷？
  结论（TL;DR）：R24 共发现 1 P0 + 1 P1 + 1 P2 + 3 P3 共 6 条新 bug，并**证伪了 R23 BUG-200 ✅ PASS**。① **BUG-208 (P0)**：admin `useCasePhaseTransitionMenu.ts: PHASE_TRANSITIONS` 与 server `businessPhase.ts: PHASE_TRANSITIONS` 失同步——12 个非终态 phase 中 11 个 admin 缺 `CLOSED_FAILED` 出边，R22 BUG-200 中途撤案路径在 admin UI 上 100% 不可触发；用 API PoC `POST /api/cases/.../phase-transition {toPhase:'CLOSED_FAILED', ...}` 直接证明 server 接受、UI 死路；② **BUG-207 (P1)**：phase→stage backfill 缺失——R22 BUG-191 修复仅走新流转 SQL 路径，未补迁移回填，dev DB 中 9 条历史 case 含 R22 自己创建的 CASE-202605-0003 仍存在 `(stage, businessPhase)` 错位（如 `(S1, WAITING_PAYMENT)` 期望 S7、`(S1, SUCCESS)` 期望 S8）；③ **BUG-209 (P2)**：phase 流转失败时 server 错误码（`CASE_POST_APPROVAL_BILLING_BLOCKED`）直接渲染到 UI，未 i18n；④ **BUG-206 (P3)**：a11y form 字段 `id/name` 缺失 R23 修复范围不完整，列表 / Customers / Documents / Leads / Settings 多处仍违规（DevTools console 持续报 issue）；⑤ **BUG-210 (P3)**：Leads 0 条时分页文案显示 `1 - 0 条`；⑥ **BUG-211 (P3)**：日语 i18n `校験実行` 与同页 `検証...` 用字不一致。R22/R23 LANDED 项 R24 仍 PASS，仅 BUG-194 仍 CONDITIONAL（dev DB 模板种子未补）。整轮 0 个 5xx / 0 console error。R24 走查产出"测试盲区教训"：R23 把 BUG-200 标 ✅ PASS 是基于"代码审查 + 单测 PASS"——但 8 个 admin 单测都直接给 popover 注入 `availableTargets=['CLOSED_FAILED']`，绕过了 `useCasePhaseTransitionMenu` 的 `getAvailablePhaseTargets()` 真实查询，无法发现 admin 副本失同步；建议后续抽公共 `businessPhase` 模块给前后端共享，从结构上消除"两套副本"。
  关键依据：
  - docs/gyoseishoshi_saas_md/_output/34-案件全流程chrome-devtools-mcp深度审计-第三轮.md（R24 完整报告，含 §1.1 完整对比表 18 个 phase 的 admin↔server 差异）
  - docs/gyoseishoshi_saas_md/_output/audit-cases-mcp-r3/（7 张取证截屏，覆盖 BUG-206/207/208/209）
  - packages/admin/src/views/cases/model/useCasePhaseTransitionMenu.ts L8-29（admin 副本，11 个 phase 缺 CLOSED_FAILED）
  - packages/server/src/modules/core/cases/businessPhase.ts L55-78（server 权威 PHASE_TRANSITIONS）
  - packages/server/src/modules/core/cases/businessPhase.ts L112-134（PHASE_TO_STAGE_DEFAULT，BUG-207 期望映射）
  - packages/admin/src/views/cases/components/PhaseTransitionPopover.vue L259-266（BUG-209 error banner 渲染位置）
  - 走查 PoC：CASE-202604-0007 phase=CONSULTING → POST `{toPhase:'CLOSED_FAILED', closeReason:'R24 audit', resultOutcome:'failure'}` → 201 + stage→S9，admin UI popover 始终不显示该选项
  影响面：
  - 案件全生命周期 admin UI 中途撤案路径（11 个非终态 phase 均不可达 CLOSED_FAILED）—— BUG-208 P0
  - 案件列表 / 详情 header / Customer Detail 案件列表的 stage label 显示一致性 —— BUG-207 P1（9 条脏数据）
  - 案件详情 phase 流转 popover 错误提示 —— BUG-209 P2
  - admin 全站 form 控件 a11y 合规 —— BUG-206 P3（多页面）
  - 列表页空状态文案、日语字形统一 —— BUG-210 / 211 P3
  - **测试方法学层面**：单元测试无法覆盖"admin↔server 协议一致性"这类约束，需补端到端断言或共享 source-of-truth 模块
  回灌计划：
  - 目标文档：docs/gyoseishoshi_saas_md/_output/32-案件全流程chrome-devtools-mcp深度审计-第一轮.md（R22）
    位置：§8 Land 状态表 BUG-200 行 + §8.2 R23 回归走查结果
    Owner：研发 / QA
    状态：待回灌（建议把 BUG-200 R23 ✅ PASS 改为 ⚠️ FALSIFIED，并指向 R24 BUG-208；R24 报告本身已自洽）
  - 目标文档：docs/gyoseishoshi_saas_md/_output/33-案件全流程chrome-devtools-mcp深度审计-第二轮.md（R23）
    位置：§0.2 表 BUG-200 行 + §1 BUG-200 详情 + §4 遗留与建议
    Owner：研发 / QA
    状态：待回灌（建议把 R23 BUG-200 ✅ PASS 标记为 ⚠️ FALSIFIED-BY-R24，并交叉链接到 BUG-208）

- 时间：2026-05-02（BUG-189 FIX-LANDED）
  问题：[BUG-189] R20 走查新发现 P3——admin sidebar 站点标识 chip 在 zh-CN locale 下显示繁体 / 日文写法 `事務所管理`，应该使用简体 `事务所管理`（"務"→"务"）。en-US 此位置为 `Firm Ops`、ja-JP 为 `事務所管理`（与简体不同字形）。如何修复使三语 chip 各自符合本地化字形？
  结论（TL;DR）：BUG-189 ✅ FIX-LANDED。① `packages/admin/src/i18n/messages/zh-CN.ts` 把 `shell.nav.brandChip` 从 `"事務所管理"` 改为简体 `"事务所管理"`；② ja-JP 保持 `事務所管理`（日文字形）、en-US 保持 `Firm Ops` 不动；③ `packages/admin/src/shell/SideNav.test.ts` 原先 `expect(text).toBe(brandChip)`（静态导入）耦合到 nav-config 静态值，现拆分为：`renders the brand chip` 走 `zhCN.shell.nav.brandChip`；新增 `[BUG-189] zh-CN brand chip uses simplified characters (no traditional 務)`、`[BUG-189] ja-JP / en-US brand chip remain in their own scripts` 两条 locale-aware 断言（共 +2 case，共计 45 tests pass）；④ `packages/admin/src/shell/nav-config.ts` 静态 `brandChip` 常量保留 `事務所管理`（仅作为历史 marker，不在 SideNav.vue 渲染路径上）；⑤ chrome-devtools-mcp 走查 R20 已完成 zh-CN / ja-JP / en-US 三语 sidebar 验收。
  关键依据：
  - packages/admin/src/i18n/messages/zh-CN.ts（`shell.nav.brandChip = "事务所管理"`）
  - packages/admin/src/shell/SideNav.test.ts（locale-aware 断言 + BUG-189 regression）
  - packages/admin/src/shell/SideNav.vue（`{{ t("shell.nav.brandChip") }}`，渲染路径未变）
  - docs/gyoseishoshi_saas_md/_output/29-双层状态机自动化复盘走查Bug清单-第二十轮.md §7 BUG-189（原始发现）
  影响面：
  - admin sidebar 顶部 chip：zh-CN `事务所管理`、ja-JP `事務所管理`、en-US `Firm Ops`
  - 不影响 ja-JP / en-US 显示；不影响其它使用 i18n 的页面
  回灌计划：
  - 目标文档：docs/gyoseishoshi_saas_md/_output/29-双层状态机自动化复盘走查Bug清单-第二十轮.md
    位置：§0.2 BUG-189 行 + §7 详情 + §10 R21 建议第 1 项
    Owner：研发
    状态：待回灌（建议将 §0.2、§7、§10 BUG-189 相关行标为 ✅ FIX-LANDED）

- 时间：2026-05-02（BUG-188 关闭决议 / 不在仓库范围）
  问题：[BUG-188] R19 P3——Customer 创建弹窗 Date of birth picker 在 en-US / ja-JP 下显示残串：spinbutton label `年 年 / 月 月 / 日 日`、button `显示日期选择器`，以及 file input 默认 placeholder `未选择任何文件`。R19 reported 为 i18n 漏洞。R20 走查时是否仍属于 app bug？
  结论（TL;DR）：BUG-188 ✅ 关闭，**不属于 app bug**。R20 走查代码层定位：`packages/admin/src/views/customers/components/AddCustomerDialog.vue` 使用的是浏览器原生 `<input type="date">` / `<input type="file">`，没有第三方 picker 库劫持。`年/月/日` spinbutton label、`显示日期选择器` button label、`未选择任何文件` 都来自 Chrome 浏览器内核自身（跟随 `chrome.exe --lang=...` / 系统 locale，不受应用 i18n 控制）。结论：要彻底解决得换成自研 picker 或 vendor lib（成本远高于 P3 收益），R20 起 BUG-188 不再列入 bug 清单，避免后续走查反复重发现。如果将来产品提出强约束三语字形一致，再开自研 picker 议题，单独评估。
  关键依据：
  - packages/admin/src/views/customers/components/AddCustomerDialog.vue（原生 `<input type="date">` / `<input type="file">`，无第三方 picker）
  - docs/gyoseishoshi_saas_md/_output/28-双层状态机自动化复盘走查Bug清单-第十九轮.md §6 BUG-188（原始发现）
  - docs/gyoseishoshi_saas_md/_output/29-双层状态机自动化复盘走查Bug清单-第二十轮.md §6 R20 重新认定（非 app bug）
  影响面：
  - 不改代码；仅在文档侧标记关闭，避免后续轮次走查反复发现
  回灌计划：
  - 目标文档：docs/gyoseishoshi_saas_md/_output/28-双层状态机自动化复盘走查Bug清单-第十九轮.md
    位置：§0.2 BUG-188 行 + §6 详情
    Owner：研发
    状态：待回灌（建议将 §0.2、§6 BUG-188 行标为 🟡 关闭 / 非 app bug）

- 时间：2026-05-02（BUG-186 FIX-LANDED）
  问题：[BUG-186] R19 新发现 P1——Case Detail Billing tab 在 en-US / zh-CN 下 TYPE 列显示日文硬编码 `案件報酬`、STATUS 列显示日文 `応収`。R18 BUG-181 fix 的 `insertInitialBillingPlanFromQuote` 写入 `milestone_name='案件報酬'` + `status='due'` 时缺 i18n 化。如何修复使 admin Billing tab 在三语下各自显示对应本地化？
  结论（TL;DR）：BUG-186 ✅ FIX-LANDED。按 R19 §2.3 A 方案（数据层固化为 i18n code）+ 渲染层兜底一并落地：① server `cases.service.ts` 把 `INITIAL_QUOTE_BILLING_MILESTONE` 从 `"案件報酬"` 改为稳定 i18n code `"case_fee"`（仍避开 deposit/final 关键词），后续新建案件 `billing_records.milestone_name = 'case_fee'`；② 新增 migration `041_rename_case_fee_milestone` 把存量 `案件報酬` 行回填为 `case_fee`，向下迁移提供反向回退；③ admin `BILLING_STATUSES` / `BillingStatusKey` 扩 `due` / `overdue`，对齐 server 原始 status 取值；④ admin 抽出 `billingMilestoneI18n.ts`（`resolveMilestoneI18nKey`），同时兼容新 code `case_fee` 与遗留 CJK 文案（`案件報酬` / `着手金` / `尾款` 等）反向映射到 `billing.milestone.<code>` 字典键；⑤ `CaseBillingTab.vue` TYPE 列通过 `paymentType(row)` 走 `t(row.typeI18nKey)`（未命中 fallback raw），STATUS 列已有 `getBillingStatusI18nKey` 链路复用，`STATUS_TONE` 扩 `due` / `overdue` chip 色调；⑥ i18n 资源三语补齐 `cases.constants.billingStatuses.due/overdue` + `billing.milestone.case_fee`；⑦ 新增 `CaseBillingTab.bug186.test.ts`（adapter + 三语渲染 + fallback 共 10 case），更新 `bug181` focused 断言、`constants.test`、`i18n-regression`、`casesI18n.focused`。`npm run fix` + `npm run guard` 全绿。
  关键依据：
  - packages/server/src/modules/core/cases/cases.service.ts（INITIAL_QUOTE_BILLING_MILESTONE = "case_fee"）
  - packages/server/src/infra/db/migrations/041_rename_case_fee_milestone.up.sql / .down.sql
  - packages/server/src/modules/core/cases/cases.service.bug181-quote-billing.focused.test.ts（断言更新为 `case_fee`）
  - packages/admin/src/views/cases/model/billingMilestoneI18n.ts（新抽文件）
  - packages/admin/src/views/cases/model/CaseAdapterValidationBilling.ts（populate typeI18nKey）
  - packages/admin/src/views/cases/types-detail.ts（PaymentRow.typeI18nKey）
  - packages/admin/src/views/cases/types.ts（BillingStatusKey 扩 due/overdue）
  - packages/admin/src/views/cases/constants.ts（BILLING_STATUSES 扩 due/overdue）
  - packages/admin/src/views/cases/components/CaseBillingTab.vue（paymentType + STATUS_TONE 扩）
  - packages/admin/src/views/cases/components/CaseBillingTab.bug186.test.ts（新增）
  - packages/admin/src/i18n/messages/cases/{en-US,zh-CN,ja-JP}.ts（billingStatuses.due/overdue）
  - packages/admin/src/i18n/messages/billing/{en-US,zh-CN,ja-JP}.ts（milestone.case_fee）
  - packages/admin/src/views/billing/model/BillingAdapters.ts（MILESTONE_NAME_TO_CODE 扩 case_fee / 案件報酬 / 案件报酬）
  - docs/gyoseishoshi_saas_md/_output/28-双层状态机自动化复盘走查Bug清单-第十九轮.md §2 BUG-186（原始发现）
  影响面：
  - admin Case Detail Billing tab：`TYPE = Case fee / 案件报酬 / 案件報酬`、`STATUS = Outstanding / 应收 / 応収`（en/zh/ja）
  - admin Billing 模块列表（`views/billing/`）：milestone 解析同时识别新 code 与遗留 CJK 文案
  - server billing_records.milestone_name：新建案写 `case_fee`，migration 041 回填存量 `案件報酬` → `case_fee`
  - billingGuards.isDepositMilestone / isFinalPaymentMilestone：`case_fee` 不会触发（保持语义不变）
  回灌计划：
  - 目标文档：docs/gyoseishoshi_saas_md/_output/28-双层状态机自动化复盘走查Bug清单-第十九轮.md
    位置：§0.2 BUG-186 行 + §2 BUG-186 详情 + §9 R20 建议第 2 项
    Owner：研发
    状态：待回灌（建议将 §0.2、§2、§9 BUG-186 相关行标为 ✅ FIX-LANDED）

- 时间：2026-04-30（BUG-158 FIX-LANDED）
  问题：[BUG-158] R13 P0 阻塞——BMV 建案前置门禁数据缺失（`customers.base_profile.bmvProfile` 全 null），admin UI 完全无法建 BMV 经管签新案。如何修复使 BMV 客户详情页有承接入口、建案向导前置门禁可通过？
  结论（TL;DR）：BUG-158 ✅ FIX-LANDED。4 处关键改动：① server `normalizeCustomerBmvProfile` 在 `base_profile.bmvProfile` 为空时返回 `createDefaultCustomerBmvProfile()`（`intakeStatus: "not_started"`），使 `/api/customers` list/detail 始终下发非 null 的 `bmvProfile`；② admin `buildCustomerBmvIntakeCardViewModel` 在 profile 为 null 时返回 `not_started` 占位视图，不再 `return null`，BMV 承接卡片挂入 `CustomerDetailView` 主路径；③ 新增 `038_backfill_customer_bmv_profile.up.sql` 迁移为已有 BMV 案件的客户倒推四前提满足；④ `CaseCreateView.vue` 顶部 banner 增加"前往客户详情完成承接 →"恢复链路。`npm run fix` + `npm run guard` 全绿。
  关键依据：
  - packages/server/src/modules/core/customers/customers.dto-mappers.ts（normalizeCustomerBmvProfile 默认工厂）
  - packages/server/src/infra/db/migrations/038_backfill_customer_bmv_profile.up.sql（历史 BMV 客户 bmvProfile 回填）
  - packages/admin/src/views/customers/model/useCustomerBmvIntakeCardModel.ts（空态占位视图）
  - packages/admin/src/views/customers/components/CustomerBmvIntakeCard.vue（承接卡片组件）
  - packages/admin/src/views/customers/CustomerDetailView.vue（挂载承接卡片）
  - packages/admin/src/views/cases/CaseCreateView.vue（恢复链路 banner）
  - packages/admin/src/views/cases/model/useCreateCasePreSignGate.ts:80-110（四前提门禁判定）
  - docs/gyoseishoshi_saas_md/_output/19-双层状态机自动化复盘走查Bug清单-第十三轮.md §1 BUG-158（原始发现 + FIX-LANDED 标注）
  影响面：
  - admin 客户详情页（BMV 候选客户现在可见承接卡片 + 发送问卷 CTA）
  - admin 建案向导（BMV 模板前置门禁链路恢复：承接卡片 → 问卷/报价/签约三步 → 门禁通过 → 下一步 enabled）
  - server `/api/customers` list/detail（bmvProfile 字段始终非 null）
  - server BMV verb endpoints（questionnaire/send、quote/generate、sign/record 三个端点已挂入）
  回灌计划：
  - 目标文档：docs/gyoseishoshi_saas_md/_output/19-双层状态机自动化复盘走查Bug清单-第十三轮.md
    位置：§0.3 BUG-158 行 + §0.4 P0 行 + §1 BUG-158 详情 + §4 待立项
    Owner：研发
    状态：已回灌（2026-04-30，BUG-158 标 ✅ FIX-LANDED）

- 时间：2026-04-30（R13）
  问题：以"事务所流程 20 状态机 + 7 场景资料矩阵 + R12 §1 BUG-133~156 24 条"为锚再走一遍 admin e2e，R12 land 项是否真的全部到位？哪些 R12 ❌ FAIL 项目实测已 land 但文档未更新？是否还有新的 P0 阻塞？
  结论（TL;DR）：R12 §1 24 条修复整体大幅 land 到位（20/24 ✅ PASS，含 R12 标 ❌ 但实测已 land 的 6 条「文档遗漏」=BUG-133/138/139/143/144/152），但**事务所流程 Step 5 建案启动出现新的 P0 阻塞 BUG-158**：所有客户 `base_profile.bmvProfile = null`，前端门禁始终 4 条 blocker（问卷/报价/签约/承接），admin UI 不可建出新的 BMV 经营管理签案件；同时新增 7 条偏差（BUG-157~164：sidebar Tasks 入口缺漏 / 建案 group_id 不持久化 / POST /api/cases 500 / 顶部 customerId raw UUID / CoE 缩写与全称语义重复 / Reminder log raw UUID / customer dto-mapper 不对称）。R12 文档对 BUG-133/138/139/143/144/152 的 ❌ FAIL 结论需回灌为 ✅ FIXED。**更新**：BUG-158 已于同日 ✅ FIX-LANDED（见上条）。
  关键依据：
  - docs/gyoseishoshi_saas_md/_output/19-双层状态机自动化复盘走查Bug清单-第十三轮.md（本轮全文）
  - docs/gyoseishoshi_saas_md/_output/18-双层状态机自动化复盘走查Bug清单-第十二轮.md §1 BUG-133~156（24 条原始定义）
  - docs/事务所流程/在留資格別必要情報一覧Ver2.scenarios/biz-mgmt-renewal.md §适用说明
  - docs/事务所流程/在留資格別必要情報一覧Ver2.中文规范版资料清单.md §执行重点
  - packages/admin/src/views/cases/model/useCreateCasePreSignGate.ts:80-110（BUG-158 root：四前提门禁判定）
  - packages/admin/src/views/cases/model/useCustomerDropdownData.ts:144-150（BMV 状态读取路径，server 永远下发 null）
  - packages/admin/src/shell/nav-config.ts:137-139（BUG-157 root：Tasks nav 注释与实际不一致）
  - packages/admin/src/views/cases/model/useCreateCaseModelActions.ts joinTemplateAndType（BUG-162 root：缩写未识别）
  影响面：
  - admin 案件建案向导（BUG-158 P0 / BUG-159 / BUG-161 / BUG-162）—— BMV 模板建案完全阻塞 + 数据持久化分裂 + UX UUID 暴露
  - admin 任务与提醒（BUG-157 / BUG-163）—— sidebar 入口缺漏 + reminder log raw UUID
  - server cases 创建路径（BUG-160）—— unhandled exception 让前端拿不到结构化错误
  - server customers DTO 契约（BUG-164）—— POST/GET 字段位置不对称
  - admin 客户新建（BUG-137 仍卡 birthday=""）—— R12 ❌ FAIL 继承
  - R12 文档结论（BUG-133/138/139/143/144/152）—— 实测已 land 但 R12 §1 仍标 ❌ FAIL，需回灌
  回灌计划：
  - 目标文档：docs/gyoseishoshi_saas_md/_output/19-双层状态机自动化复盘走查Bug清单-第十三轮.md
    位置：§0.3 BUG-158 行 + §0.4 P0 行 + §1 BUG-158 详情 + §4 待立项
    Owner：研发
    状态：已回灌（2026-04-30，BUG-158 ✅ FIX-LANDED 标注已写入 R13 文档）
  - 目标文档：docs/gyoseishoshi_saas_md/_output/18-双层状态机自动化复盘走查Bug清单-第十二轮.md
    位置：§0.1 R11 §1 四条 bug 验收表 + §1 BUG-133/138/139/143/144/152 各条头部
    Owner：研发
    状态：待回灌（在 R12 文档头部增 "R13 实测确认 ✅ FIXED 项" 摘要；逐条把 ❌ FAIL 改为 R13 实测 ✅ FIXED + 引 R13 §2.1 证据）
  - 目标文档：docs/gyoseishoshi_saas_md/P0/06-页面规格/案件.md
    位置：§建案前置条件、§字段持久化、§i18n & a11y 约束
    Owner：研发 + 产品
    状态：待回灌（把"BMV 四前提门禁字段必须有写入入口 + customer.bmvProfile 必须 server 显式下发"作为页面规格红线；BUG-159 group_id 继承默认值规则纳入数据契约）——**BUG-158 server 侧"必须显式下发"已 land，页面规格红线仍需回灌**
  - 目标文档：packages/admin/.eslintrc / 守门 lint
    位置：i18n 静态规则 + sidebar nav smoke
    Owner：研发
    状态：待回灌（admin shell smoke 测试加 sidebar Tasks 入口断言；lint 禁止 views/** 渲染 cases\.|customers\.|leads\. 前缀 raw key）
  - 目标文档：packages/server cases.service.ts
    位置：create 路径
    Owner：研发
    状态：待回灌（强制 try/catch + BadRequestException；group_id 缺省时从 customer.base_profile.group 继承；返回体字段位置与 list/detail 对齐）

- 时间：2026-04-30（R12）
  问题：以"事务所流程 20 状态机 + 7 场景资料矩阵"为锚再走一遍 admin e2e，R11 §1 BUG-133~136 是否已 land？哪些 R4 / R11 闭环结论被回退？
  结论（TL;DR）：R11 §1 修了 1.5/4：BUG-135 server 时间戳契约 ✅ land；BUG-136 group UUID 直显只覆盖 `views/customers`，case 建案向导（Step 2 客户下拉 / 选中卡 / Step 3 inherited group）+ 收费列表 row group cell 仍直显 UUID；BUG-133 / BUG-134 与 R11 描述完全相符，仍未 land。同时 R4 闭环 4 条全部回退：BUG-086 → `/#/tasks` 退回 placeholder（P0 BUG-142）；BUG-088 → `customerNumber=UUID`；BUG-089 → 客户列表 owner 列空白；BUG-093 → `CustomerCreateModal` 仍并存 legacy + 新介绍人字段且测试 `describe.skip`。本轮抓出 20 条新增偏差（P0×1 / P1×9 / P2×6 / P3×4），加上 R11 §1 仍未 land 的 BUG-133 / BUG-134 与 BUG-136 增量遗漏，事务所流程 Step 1-20 在 admin UI 端目前不可端到端走通。
  关键依据：
  - docs/gyoseishoshi_saas_md/_output/18-双层状态机自动化复盘走查Bug清单-第十二轮.md（本轮全文）
  - docs/gyoseishoshi_saas_md/_output/17-双层状态机自动化复盘走查Bug清单-第十一轮.md §1 BUG-133~136
  - docs/gyoseishoshi_saas_md/_output/10-事务所流程驱动走查Bug清单-第四轮.md §0.4（R4 闭环对照）
  - packages/admin/src/views/cases/model/useCustomerDropdownData.ts:117-134（BUG-139 root：groupLabel 直透 raw UUID）
  - packages/admin/src/views/customers/components/CustomerCreateModal.vue:310-415（BUG-141 root：legacy referrer 未删 + referrerName 无 v-if）
  - packages/admin/src/views/customers/components/CustomerCreateModal.bug093.test.ts:46（describe.skip 关闭回归契约）
  - packages/admin/src/views/customers/model/CustomerAdapterShared.ts:183-200（BUG-137 root：empty birthday 透传 ''）
  影响面：
  - admin 客户新建（BUG-137 / 141 / 147 / 148）—— 表单 i18n、字段去重、性能、a11y 全部退化
  - admin 案件建案向导（BUG-139 / 144 / 149 / 150 / 151 / 152）—— Step 1-4 各踩 1+ 处
  - admin 案件列表 / 详情 / 收费（BUG-133 / 134 / 138 / 140 / 143 / 153）—— i18n + alias map 链路系统性遗漏
  - admin 任务与提醒页（BUG-142 P0）—— Step 19-20 续签提醒链路再次切断
  - server 客户编号生成（BUG-145）—— 默认创建路径不走 numbering helper
  - admin 客户列表 / 详情 owner 字段（BUG-146 / 154）—— BUG-089 修复路径回退
  回灌计划：
  - 目标文档：docs/gyoseishoshi_saas_md/P0/06-页面规格/案件.md / 客户.md / 收费.md
    位置：§字段、§i18n & a11y 约束、§数据契约
    Owner：研发
    状态：待回灌（把"raw 字段透传 → 必须 i18n / 必须走 alias map"纳入页面规格红线；把"R4 闭环回退"作为 PR-level 守门项）
  - 目标文档：packages/admin/.eslintrc / 守门 lint
    位置：i18n 静态规则 + describe.skip 黑名单
    Owner：研发
    状态：待回灌（lint 禁止 `views/**` 渲染 `^cases\.|^customers\.|^leads\.` 前缀的 raw key；禁止 `bug\d+` 测试文件含 `describe.skip`）
  - 目标文档：packages/server 守门 lint
    位置：customers.controller create 路径
    Owner：研发
    状态：待回灌（lint 强制 `customers/*.controller.ts` create 路径调用 `createCustomerWithNumbering`）

- 时间：2026-04-30
  问题：R9 BUG-130（adapter 漏写 caseNo 致 BUG-128 半 land 回归）是否已 land，且 admin 还有哪些可低成本自动化抓出的 UI/i18n/a11y 偏差？
  结论（TL;DR）：R9 BUG-130 修复链路三处全到位（adapter `buildDetailHeader.caseNo: resolveCaseNo(...)` + `case-no.focused.test.ts` `describe.skip → describe`，6 用例全 active），UI 端面包屑显示 `CASE-202604-0011`、与 BUG-116 / 127 / 129 一并 ✅ PASS；同时 chrome-devtools-mcp 在同一详情页扫出 2 条新偏差：BUG-131 `PageHeader.vue:50-59` 把所有无 href 的中间 crumb 都标 `aria-current="page"`（违反 ARIA 1.2 唯一性，影响 9 个 view），BUG-132 `CaseDetailView.vue:169 / 332` 直接插 raw `detail.stage`（非 i18n），切 EN/JA 后 stage Chip 仍出现 `刚开始办案`（同行 phaseLabel 已正确 i18n）。三轮 BUG-128 → 130 → 131/132 同根：单组件单测全 PASS，但缺跨组件契约 / 跨语言 e2e。
  关键依据：
  - docs/gyoseishoshi_saas_md/_output/16-双层状态机自动化复盘走查Bug清单-第十轮.md（本轮全文）
  - packages/admin/src/views/cases/model/CaseAdapterDetailAggregate.ts:241-275（R9 修复 land 点）
  - packages/admin/src/shared/ui/PageHeader.vue:50-59（BUG-131 根因）
  - packages/admin/src/views/cases/CaseDetailView.vue:160-172, 330-333（BUG-132 根因）
  影响面：
  - admin 详情页面包屑（BUG-130 ✅ / BUG-131 ❌ / BUG-132 ❌）
  - admin 8+ 个用 `<PageHeader>` 的 view（BUG-131 全部命中）
  - admin EN/JA 用户进案件详情时的 stage 标签视觉一致性（BUG-132）
  回灌计划：
  - 目标文档：docs/gyoseishoshi_saas_md/P0/06-页面规格/案件详情.md
    位置：§面包屑 / §头部 Chip / §i18n & a11y 约束
    Owner：研发
    状态：待回灌（把 BUG-131 a11y 唯一性约束、BUG-132 i18n stage 标签约束补成「禁止 raw 字段插值」红线）
  - 目标文档：packages/admin/.eslintrc / 守门 lint
    位置：a11y / i18n 静态规则
    Owner：研发
    状态：待回灌（建议引入 axe-core a11y 检查 + 自定义 lint 禁止 `{{ detail.stage }}` 之类 raw 枚举插值）

- 时间：2026-04-28
  问题：以 `docs/事务所流程/` 的经管签 20 状态机 + 7 场景资料矩阵为基线，admin 当前是否能跑完一遍真实端到端流程？
  结论（TL;DR）：跑不通。admin 状态机仍停在 S1-S9 操作层（业务 20 状态完全缺位）、`POST /api/cases/:id/transition` 不强制顺序（可一步从 S2 跳 S9 归档）、真实新建 case 的 `/aggregate` 全部 500 → 详情页直接「Case not found」、建案模板只有 3 个 zh-CN 硬编码（家族/技人国/经管）且预览资料 9 项 vs 规范 18-25 项、`POST /api/residence-periods` 写入后 `reminderCreated:false` 且日期偏 1 天、Document Center 仍仅展示 fixture A2026-001/002/003。本轮共抓出 21 条新增 Bug（P0×8 / P1×9 / P2×4），全部聚焦在「业务规范 → admin 实现」的覆盖缺口而非 round 1/2 的 fixture/i18n。
  关键依据：
  - docs/gyoseishoshi_saas_md/_output/09-事务所流程驱动走查Bug清单.md（本轮全文）
  - docs/事务所流程/新规经营管理签申请全套流程Markdown文档.md（业务 20 状态机基线）
  - docs/事务所流程/在留資格別必要情報一覧Ver2.中文规范版资料清单.md（7 场景资料矩阵）
  影响面：
  - admin 案件状态机（缺 NEED_SUPPLEMENT / APPROVED / COE_SENT / VISA_APPLYING / SUCCESS / CLOSED_SUCCESS / CLOSED_FAILED 等 14 个业务节点）
  - admin 建案向导模板（缺 company_setup、intra_company_transfer 两个独立模板；4 类经管场景同模板）
  - server `/api/cases/:id/aggregate`（任意新建 case 500）
  - server `/api/residence-periods`（提醒未自动派生 + 日期偏移 1 天）
  - server `/api/cases/:id/transition`（无顺序守卫）
  回灌计划：
  - 目标文档：docs/gyoseishoshi_saas_md/P0/03-业务规则与不变量.md
    位置：§3.0F 状态机冻结声明 / §3.1A 阶段允许转移矩阵
    Owner：研发
    状态：待回灌（需要把 20 状态业务模型与 S1-S9 操作模型的映射加进 §3.0F；§3.1A 需要补"禁止跨多阶段跳跃 + 归档前必须经过 S8"硬规则）
  - 目标文档：docs/gyoseishoshi_saas_md/P0/04-核心流程与状态流转.md
    位置：§1 主流程 + §6 补资料 + §7 异常结案
    Owner：研发
    状态：待回灌（需要按业务规范把 Step 13-20 的状态转移路径补到 §1.4 / §7）
  - 目标文档：docs/gyoseishoshi_saas_md/P0/06-页面规格/案件详情.md
    位置：在留期间记录 + 续签提醒 section
    Owner：产品
    状态：待回灌（明确「未生成提醒任务不得 CLOSED_SUCCESS」的页面侧表达）

- 时间：2026-04-10
  问题：如何在 P0 阶段把 Karpathy 的“编译式知识库”落地到本仓库，并保证跨编辑器（Trae/Cursor/Augment）一致？
  结论（TL;DR）：以仓库根目录 `AGENTS.md` 作为跨编辑器唯一指令入口；在 `docs/gyoseishoshi_saas_md/` 下新增 `_raw/00-inbox.md` 与 `_output/00-outputs.md`，形成 raw → compile → file-back → lint 的最小闭环，并把入口挂到 README/00-开始这里/99 中，确保可发现与可维护。
  关键依据：
  - docs/gyoseishoshi_saas_md/99-文档维护与版本记录.md（编译式知识库工作流）
  - docs/gyoseishoshi_saas_md/README.md（入口与维护约定）
  - docs/gyoseishoshi_saas_md/00-开始这里.md（常见问题跳转表）
  影响面：
  - 文档体系维护方式（新增 raw/output 入口与编译工作流）
  - AI 协作者默认行为（统一遵守 AGENTS.md）
  回灌计划：
  - 目标文档：docs/gyoseishoshi_saas_md/README.md
    位置：原始输入与产出归档（编译式沉淀入口）
    Owner：产品/研发
    状态：已回灌
  - 目标文档：docs/gyoseishoshi_saas_md/99-文档维护与版本记录.md
    位置：编译式知识库工作流（raw → compile → file-back → lint）
    Owner：产品/研发
    状态：已回灌

- 时间：2026-04-10
  问题：本周的 lint（矛盾/过期/缺口）要输出什么，怎么驱动下一轮编译？
  结论（TL;DR）：每周只输出三张可执行清单：矛盾（需收敛权威源）、过期（需降级/替代入口）、缺口（需新增权威定义）；P0 阶段优先用“缺口清单”驱动 Top3 编译。
  关键依据：
  - docs/gyoseishoshi_saas_md/99-文档维护与版本记录.md（周度维护 Lint）
  影响面：
  - 文档维护节奏与质量控制
  回灌计划：
  - 目标文档：docs/gyoseishoshi_saas_md/99-文档维护与版本记录.md
    位置：周度维护（Lint）
    Owner：产品/研发
    状态：已回灌
  本周清单：
  - 矛盾：暂无（待真实业务内容进入后再扫描）
  - 过期：暂无（新增机制落地日）
  - 缺口：
    - 需要从项目真实讨论/PRD/会议纪要中抽取 Top3，编译进权威文档（03/04/06/07/08）

- 时间：2026-04-11
  问题：P0 状态机口径是否完整？S1-S9 允许转移、post_approval_stage 流转、补正循环在 S7 内的阶段关系、异常结案路径是否有唯一权威定义？
  结论（TL;DR）：P0 状态机主框架（S1-S9 + post_approval_stage + 补正循环）在 03/04 中已有良好基础，但缺少完整转移矩阵（允许的回退、禁止的跳转、异常结案路径、补正场景 Gate 执行与阶段的关系）。已在 03 §3.1A 补入"案件阶段允许转移（P0 冻结）"矩阵（正向/回退/补正/异常/禁止），在 03 §3.8 补入 post_approval_stage 单向推进规则，在 04 §6 补入补正场景 Gate-阶段关系说明。
  关键依据：
  - docs/gyoseishoshi_saas_md/P0/03-业务规则与不变量.md §3.0F、§3.1、§3.8、§15.4
  - docs/gyoseishoshi_saas_md/P0/04-核心流程与状态流转.md §1.2、§1.4、§6
  - 分析.md（输入材料，状态机对比表）
  影响面：
  - 案件详情原型（阶段推进/回退逻辑）
  - Server Case 模块（stage 状态机实现）
  - Client domain Case 实体（stage / post_approval_stage 枚举与转移规则）
  回灌计划：
  - 目标文档：P0/03-业务规则与不变量.md
    位置：§3.1A 案件阶段允许转移（新增）；§3.8 强规则第 5 条（补充 post_approval_stage 单向性）
    Owner：产品/研发
    状态：已回灌
  - 目标文档：P0/04-核心流程与状态流转.md
    位置：§6 补正操作剧本（补正场景 Gate-阶段关系说明）；§6 异常结案（转移路径明确化）
    Owner：产品/研发
    状态：已回灌

- 时间：2026-04-11
  问题：P0 状态机是否在权威文档中有唯一且完整的表述？外部流程文档的扁平状态表是否存在引入口径漂移的风险？
  结论（TL;DR）：状态机口径已冻结——P0 案件状态由 `Case.stage (S1–S9)` + `Case.post_approval_stage`（仅 `coe_overseas` 案件在 S8 后启用）两层组成；补正不是独立主阶段（案件保持 S7）；事件（在留期间登记、提醒生成）不是状态。已在 03 §3.0F 中完成 10 条冻结规则。
  关键依据：
  - docs/gyoseishoshi_saas_md/P0/03-业务规则与不变量.md §3.0F, §3.1, §3.8
  - docs/gyoseishoshi_saas_md/P0/04-核心流程与状态流转.md §1.2, §6, §7
  - 分析.md §一（状态机对比）
  影响面：
  - 原型案件详情配置（stage-actions / runtime）
  - 服务端 Case schema 与阶段推进逻辑
  - 客户端 domain/case 实体枚举
  回灌计划：
  - 目标文档：docs/gyoseishoshi_saas_md/P0/03-业务规则与不变量.md
    位置：§3.0F 状态机冻结声明（已有）+ 新增 8/9/10 条
    Owner：研发
    状态：已回灌

- 时间：2026-04-11
  问题：Lead、Customer、Survey、Case 之间的字段归属是否明确？外部流程文档中是否存在字段错挂（如 `source_type` 挂在 Customer 而非 Lead）？
  结论（TL;DR）：字段归属已冻结——P0 权威文档中字段归属正确，但外部流程文档存在 7 项常见错挂（source_type/visa_type 挂 Customer、reminder_scheduled 布尔位、deposit_paid 非缓存等），已在 03 §2.7 中冻结纠正表和承接链规则。
  关键依据：
  - docs/gyoseishoshi_saas_md/P0/03-业务规则与不变量.md §2.7（新增）
  - docs/gyoseishoshi_saas_md/P0/07-数据模型设计.md §3.1–§3.5
  - 分析.md §二（数据模型对比 2.1–2.3）
  影响面：
  - 原型案件详情配置中 Customer/Case/Lead 字段展示
  - 服务端 schema 字段分配
  - 客户端 domain 实体定义
  回灌计划：
  - 目标文档：docs/gyoseishoshi_saas_md/P0/03-业务规则与不变量.md
    位置：§2.7 字段归属冻结声明（新增）
    Owner：研发
    状态：已回灌

- 时间：2026-04-11
  问题：资料四层模型（DocumentRequirement → DocumentAsset → DocumentFileVersion → DocumentRequirementFileRef）和 SubmissionPackage 不可覆盖规则是否在权威文档中完整表达？原型和生产端各自的最小遵守要求是什么？
  结论（TL;DR）：四层模型和提交包不可变规则已冻结——不变量定义在 03 §2.4F（已有 7 条），实现端最小遵守要求在 03 §2.8（新增）中分别为原型和生产端列出 4 项具体要求。核心：版本不可覆盖、仅存 relative_path、复用不复制、共享过期联动、提交包锁定后不可改。
  关键依据：
  - docs/gyoseishoshi_saas_md/P0/03-业务规则与不变量.md §2.3, §2.4, §2.4F, §2.8（新增）
  - docs/gyoseishoshi_saas_md/P0/07-数据模型设计.md §3.9–§3.10A, §3.18–§3.19
  - 分析.md §三（完全缺失的核心实体）
  影响面：
  - 原型 case-detail-config.js 资料数据结构
  - 原型 documents-config.js 状态枚举
  - 服务端 schema（DocumentFileVersion 不可更新约束、SubmissionPackageItem 创建逻辑）
  - 客户端 domain/documents 实体与仓储接口
  回灌计划：
  - 目标文档：docs/gyoseishoshi_saas_md/P0/03-业务规则与不变量.md
    位置：§2.8 资料模型与提交包——实现端最小遵守要求（新增）
    Owner：研发
    状态：已回灌

- 时间：2026-04-11
  问题：[doc-freeze-state-machine] P0 主状态机（S1-S9 + post_approval_stage + 补正循环）的口径是否在权威文档中表达完整、无歧义？
  结论（TL;DR）：P0 状态机口径已完整冻结，无需修改。外部流程文档的 18 个扁平状态不得用于实现——唯一权威为 `Case.stage(S1-S9)` + `Case.post_approval_stage` 的两层模型。
  关键依据：
  - P0/03 §3.1：S1-S9 主阶段枚举与说明（含 S7 补正循环、S8 经营管理签扩展）
  - P0/03 §3.8：post_approval_stage 子阶段枚举（none/waiting_final_payment/coe_sent/overseas_visa_applying/entry_success/overseas_visa_rejected）及流转规则
  - P0/03 §15.4：补资料循环强规则——案件保持 S7，每次补件创建 `submission_kind=supplement` 的新 SubmissionPackage
  - P0/03 §4.1-4.3：Gate-A/B/C 校验门槛的硬性阻断与软性提示明细
  - P0/04 §1.2：阶段进入条件与典型动作表
  - P0/04 §1.4：Gate 触发点与通过后动作
  - P0/04 §6：补正操作剧本（P0 冻结口径）
  冻结事项：
  - 补正不是独立主状态；流程文档的 `NEED_SUPPLEMENT` / `SUPPLEMENT_PROCESSING` 在 P0 中不存在
  - `RESIDENCE_PERIOD_RECORDED` 和 `RENEWAL_REMINDER_SCHEDULED` 是事件而非状态，由 `ResidencePeriod` 记录和 `Reminder` 记录驱动
  - `post_approval_stage` 仅在 `application_flow_type=coe_overseas` 且 `stage=S8` 时激活
  - Gate-C 通过 + SubmissionPackage 已生成是进入 S7 的必要条件；回执/凭证可后补
  - 经营管理签成功结案必须完成在留期间登记才能进入 S9
  影响面：
  - prototype/admin/case：stage-actions、runtime、config 中的阶段枚举必须对齐 S1-S9
  - prototype/admin/case：补正场景不得回退主阶段，需展示为 S7 内的新提交包
  - server/modules/core/cases：持久化 stage 枚举与 post_approval_stage 枚举
  - mobile/domain/case：Case 实体的 stage/post_approval_stage 枚举
  回灌计划：
  - 目标文档：P0/03-业务规则与不变量.md
    位置：§3.0F 状态机冻结声明
    Owner：产品/研发
    状态：已回灌（2026-04-11 扩充冻结声明：新增第 4 条 post_approval_stage 枚举值冻结、第 5 条咨询阶段不属于案件状态、第 1 条补充 supplement_count_cached 说明、第 2 条补充外部流程文档状态名）
  - 目标文档：P0/04-核心流程与状态流转.md
    位置：§1.2 + §1.4 + §6
    Owner：产品/研发
    状态：已验证完整，已有交叉引用指向 03 §3.0F

- 时间：2026-04-11
  问题：[doc-freeze-entity-ownership] Lead、Customer、Survey、Case 的字段归属是否在 P0/07 中定义清晰？是否存在字段错挂？
  结论（TL;DR）：P0/07 的字段归属已正确定义。外部流程文档的 3 处字段错挂已在 P0 数据模型中修正：`source_type` 归 Lead、`visa_type` 归 Case.case_type、收费布尔位为 Case 上的缓存字段（真相源为 BillingPlan）。另修正 07 §3.8 CaseTemplate 描述：模板数量从"2 类"更正为"3 类"。
  关键依据：
  - P0/07 §3.1 Lead：`source_type` 属于 Lead（`REFERRAL/WEB/ADS/OTHER`），不属于 Customer
  - P0/07 §3.2 Customer：无 `visa_type` 字段——签证类型由 `Case.case_type` 承接
  - P0/07 §3.1 Lead + §3.5 Case：`quote_amount` 在 Lead 上，转化时继承为 `Case.quote_price`；`visa_plan` 同理
  - P0/07 §3.5 Case：`deposit_paid_cached` / `final_payment_paid_cached` 明确标注为"缓存"，由 BillingPlan 状态同步写入
  - P0/07 §3.5 Case：`supplement_count_cached` 为缓存值，从 SubmissionPackage 统计
  - P0/07 §3.1A Survey：通过 `lead_id` 或 `customer_id` 关联（必填其一），`case_id` 为可选补充关联
  - P0/03 §2.1：CaseParty ≠ CustomerRelation（CaseParty 用于门槛校验，CustomerRelation 仅用于检索跳转）
  冻结事项：
  - Lead → Customer → Case 是正式承接链；`source_type`、`quote_amount`、`visa_plan` 在 Lead 层产生，转化时继承到 Customer/Case
  - Customer 不持有 `visa_type`（无此字段）、不持有 `source_type`（归 Lead）
  - Case 上的 `deposit_paid_cached` / `final_payment_paid_cached` / `supplement_count_cached` 均为缓存字段，真相源分别为 BillingPlan 和 SubmissionPackage
  - Survey 可同时关联 Lead 和 Case（case_id 可选），但不替代 Lead 的早期跟进角色
  - CaseTemplate 预置 3 类（家族滞在、技人国、经营管理签），07 §3.8 已修正
  影响面：
  - prototype/admin/case/data：case-detail-config 中 Customer 展示不应出现 source_type/visa_type
  - server/infra/db/drizzle/schema：确保 source_type 在 leads 表、case_type 在 cases 表
  - mobile/domain/case/Case.ts：缓存字段标注 `_cached` 后缀，不作为业务判断的直接输入
  回灌计划：
  - 目标文档：P0/07-数据模型设计.md
    位置：§3.8 CaseTemplate
    Owner：研发
    状态：已回灌（模板数量 2→3 已修正）
  - 目标文档：P0/07-数据模型设计.md
    位置：§1「字段归属冻结声明」（新增）
    Owner：产品/研发
    状态：已回灌（2026-04-11 新增字段归属冻结声明表，列出 14 项字段正确归属与常见错误归属，覆盖 source_type/visa_type/quote_price/location/缓存字段/reminder_scheduled/Survey 关联/application_flow_type/post_approval_stage/COE 字段族/group_id/org_id）

- 时间：2026-04-11
  问题：[doc-freeze-documents-model] 资料四层模型（DocumentRequirement → DocumentAsset → DocumentFileVersion → DocumentRequirementFileRef）与 SubmissionPackage 不可覆盖规则是否在权威文档中定义完整？
  结论（TL;DR）：四层模型和 SubmissionPackage 锁定规则在 P0 权威文档中已完整定义。原型中的状态 key 简化（`pending` 合并 `not_sent/waiting_upload`，`rejected` 对应 `revision_required`）已在 P0-CONTRACT §6.4 有映射表。
  关键依据：
  - P0/03 §2.3：资料项与附件版本分离的四层模型定义
  - P0/03 §2.4：提交包锁定与不可覆盖强规则（P0 最关键的不可变规则之一）
  - P0/03 §7：资料项治理（完成率口径、waived 治理、模板策略、标记要求、共享版本过期联动）
  - P0/03 §13：提交动作 7 条强规则
  - P0/07 §3.9-§3.10A：四层模型实体字段定义
  - P0/07 §3.18-§3.19：SubmissionPackage + SubmissionPackageItem 字段定义
  - P0/04 §5：提交前校验与提交流程步骤
  - P0/04 §6：补正操作剧本——补正提交包 `submission_kind=supplement`，通过 `related_submission_id` 关联原包
  - P0-CONTRACT-DETAIL.md §6：案件详情资料清单 Tab 约束
  - P0-CONTRACT.md §6.4：原型与 P0 状态 key 映射表
  冻结事项：
  - 每次登记资料生成新 DocumentFileVersion，不覆盖历史版本
  - SubmissionPackage 锁定后不允许覆盖式替换引用；后续补正必须通过"新版本+新提交包"完成
  - P0 默认不存 SaaS 文件本体；"上传"实质是"登记版本"（storage=local_server, relative_path）
  - waived 资料项从完成率分母剔除，但必须记录原因码+操作人+时间
  - 共享版本过期时，所有当前引用它的资料项同步转为 expired，相关 Gate-B/C 通过记录失效
  - 引用规则：item_code 一致 + 提供方兼容 + 版本未过期 + 审核状态 approved
  - 原型状态 key 简化已有映射：`pending` → `not_sent/waiting_upload`，`rejected` → `revision_required`
  影响面：
  - prototype/admin/documents：documents-config.js 中 status key 需通过映射函数对齐 P0 key
  - prototype/admin/case：case-detail-documents 中的资料状态需与 documents-config 一致
  - server/modules/core：DocumentRequirement/DocumentAsset/DocumentFileVersion/DocumentRequirementFileRef CRUD 及 SubmissionPackage 生成逻辑
  - mobile/domain/documents：DocumentRepository 接口需反映四层模型
  回灌计划：
  - 目标文档：P0/03-业务规则与不变量.md
    位置：§2.4F「资料模型与提交包冻结声明」（新增）
    Owner：产品/研发
    状态：已回灌（2026-04-11 新增 §2.4F 冻结声明，明确四层模型不可降级、DocumentFileVersion 不可变、relative_path 唯一路径口径、SubmissionPackage 锁定规则、Gate-C 前置条件、补正包关联原包、版本过期联动强规则，共 7 条）
  - 目标文档：P0/07-数据模型设计.md
    位置：§3.9-§3.10A + §3.18-§3.19
    Owner：产品/研发
    状态：已验证完整，无需修改

- 时间：2026-04-11
  问题：[doc-freeze-billing-reminder] BillingPlan / PaymentRecord 收费真相源、尾款守卫（COE 发送前校验）、180/90/30 提醒策略的口径是否在权威文档中定义完整？
  结论（TL;DR）：收费真相源和提醒策略在 P0 权威文档中已完整定义。`deposit_paid_cached` / `final_payment_paid_cached` 是 Case 上的缓存字段，真相源为 BillingPlan 节点状态。提醒天数固定为 180/90/30，不可配置（配置化后置 P1）。
  关键依据：
  - P0/03 §6：收费与欠款策略（P0 不支持 block 模式、欠款以风险提示为主、风险确认留痕、回款归集口径、回款更正不删除）
  - P0/03 §6.1：回款归集口径——多未结清节点时必须显式选择归集节点
  - P0/03 §6.2：回款更正（作废/冲正，不删除）——record_status ∈ {valid, voided, reversed}
  - P0/03 §11.1：在留到期三档提醒 180/90/30 天，预置不可修改；去重 key = case_id + reminder_type + days_before
  - P0/03 §11.2：COE 有效期提醒（30/7 天），post_approval_stage 在 coe_sent/overseas_visa_applying 时触发
  - P0/03 §15.2：COE 发送前尾款守卫——以 BillingPlan 结果后节点状态为准，`final_payment_paid_cached` 仅做快速判断
  - P0/07 §3.20：BillingPlan（milestone_name/amount_due/status/gate_effect_mode）+ PaymentRecord（amount_received/record_status/void_reason_code）完整字段定义
  - P0/07 §3.21：Reminder/Notification 实体字段定义（含 dedupe_key、send_status、retry_count）
  - P0/04 §7 Step 2：确认尾款并发送 COE 的流程步骤
  - P0/04 §8：收费流程最小闭环
  冻结事项：
  - BillingPlan.status ∈ {due, partial, paid, overdue} 是收费状态的唯一真相源
  - Case.deposit_paid_cached / Case.final_payment_paid_cached 是布尔缓存，由 BillingPlan 状态同步写入，不得作为业务判断的唯一输入
  - COE 发送守卫：先查 final_payment_paid_cached（快速判断），最终以 BillingPlan 结果后节点状态为准；未结清时 warn 模式（风险确认留痕后可继续）
  - PaymentRecord 不允许物理删除；作废/冲正通过 record_status 标记，并必须记录原因码
  - 提醒天数 P0 固定为 180/90/30 天，不支持事务所自定义
  - 提醒生成失败时阻断归档，进入人工待处理队列
  - COE 有效期到期后仍在 overseas_visa_applying 时必须生成异常提醒任务
  影响面：
  - prototype/admin/billing：收费 Tab 需以 BillingPlan 节点表格为主展示，避免用布尔位展示收费状态
  - prototype/admin/case：校验与提交 Tab 的欠款风险确认需引用 BillingPlan 状态
  - prototype/admin/tasks：提醒任务需展示 180/90/30 固定天数
  - server/modules/core/billing：BillingPlan + PaymentRecord CRUD 及缓存同步逻辑
  - server/modules/core/reminders：提醒调度、去重、失败处理
  - mobile/domain/case：Case 实体缓存字段的展示需标注"来源于 BillingPlan"
  回灌计划：
  - 目标文档：P0/03-业务规则与不变量.md
    位置：§6.3F「收费与提醒事实来源冻结声明」（新增）
    Owner：产品/研发
    状态：已回灌（2026-04-11 新增 §6.3F 冻结声明，明确 BillingPlan+PaymentRecord 为唯一事实来源、缓存字段同步规则、P0 不支持 block 模式、COE 发送尾款守卫、回款不可物理删除、提醒天数 180/90/30 固定、提醒通过 Reminder 记录追踪、提醒失败阻断归档、COE 有效期提醒强规则、提醒去重口径，共 10 条）
  - 目标文档：P0/07-数据模型设计.md
    位置：§3.20 + §3.21
    Owner：产品/研发
    状态：已验证完整，无需修改

- 时间：2026-04-11
  问题：[doc-backfill-authority] 分析.md 的结论是否已完整回灌到 P0 权威文档？分析稿是否可以停止充当事实来源？
  结论（TL;DR）：4 个主题领域的分析结论已全部回灌到 P0 权威文档（03 + 07），形成 4 个冻结声明块。分析.md 可降级为"历史参考素材"，不再作为任何实现决策的事实来源。
  关键依据：
  - 本文件上述 4 条 doc-freeze-* 回灌记录
  影响面：
  - 分析.md 角色变更：从"活跃分析稿"降级为"历史输入参考"，后续不再更新
  - P0 权威文档（03/07）新增 4 个冻结声明块，成为状态机、字段归属、资料模型、收费提醒的唯一口径
  回灌完成清单：
  - P0/03 §3.0F：状态机冻结声明（扩充至 7 条）→ 已回灌
  - P0/03 §2.4F：资料模型与提交包冻结声明（新增 7 条）→ 已回灌
  - P0/03 §6.3F：收费与提醒事实来源冻结声明（新增 10 条）→ 已回灌
  - P0/07 §1「字段归属冻结声明」：字段归属表（新增 14 项）→ 已回灌
  后续建议：
  - 分析.md 文件头部应标注"本文为历史分析输入，权威结论已回灌到 P0/03 和 P0/07 的冻结声明中"
  - prototype 对齐、server 落地、client domain 接入阶段应引用冻结声明块，不引用分析.md

- 时间：2026-04-11
  问题：[doc-freeze-state-machine + doc-freeze-entity-ownership 增量校准] 本轮 session 中对 P0 状态机冻结声明、补正循环表述、字段归属冻结声明做了哪些增量改动？
  结论（TL;DR）：本轮增量：(1) P0/03 §3.0F 状态机冻结声明确认完整（10 条），含 S7 补正循环、post_approval_stage 单向性、外部扁平状态不落库等；(2) P0/03 §3.1 S7 说明补充"补正期间保持 S7，不回退至未提交阶段"；(3) 修复 §3.8 重复编号问题（校验结果状态重编为 §3.9）；(4) P0/03 §15.4 补正规则增加 Gate-B→Gate-C 重新经过的完整步骤及 related_submission_id 关联说明；(5) P0/04 §1.2、§6 增加到 §3.0F 的交叉引用；(6) P0/04 §6 补正剧本增加"不存在独立补正主阶段"措辞及 supplement_count 来源说明；(7) P0/07 Case.stage 表增加 §3.0F 引用和 S7 补正不回退说明；(8) P0/03 §2.7 与 P0/07 字段归属冻结声明之间增加双向交叉引用；(9) P0/03 §7.3 模板数量从"2 类"修正为"3 类"（含经营管理签），同步修正 08-术语表。
  关键依据：
  - docs/gyoseishoshi_saas_md/P0/03-业务规则与不变量.md §3.0F, §3.1, §3.9, §15.4, §2.7, §7.3
  - docs/gyoseishoshi_saas_md/P0/04-核心流程与状态流转.md §1.2, §6
  - docs/gyoseishoshi_saas_md/P0/07-数据模型设计.md §字段归属冻结声明, Case.stage 表
  - docs/gyoseishoshi_saas_md/P0/08-术语表.md（材料字典 P0 约束）
  影响面：
  - 权威文档内交叉引用更完善，减少口径漂移风险
  - §3.8 → §3.9 重编号消除了编号歧义
  - 模板数量统一为 3 类（经营管理签正式纳入）
  回灌计划：
  - 所有改动已直接写入权威文档，无额外待回灌项

- 时间：2026-04-11
  问题：P0 如果不让 AI 直接“读 PRD 然后开干”，应如何按“结构化抽取 → 歧义消解 → 边界冻结 → 任务化执行 → 校验回写”优化？
  结论（TL;DR）：P0 已升级为“需求编译流水线”最小闭环——raw 输入不可直接执行；执行前必须先形成 `requirements.ir / ambiguities / boundary`；`09 §7` 统一承担 `REQ-P0-*` 需求 ID 与 traceability 主表；没有 `out_of_scope` 不得冻结，没有 traceability 不算完成。
  关键依据：
  - docs/gyoseishoshi_saas_md/P0/README.md（P0 需求编译流水线与治理规则 R-7 / R-8）
  - docs/gyoseishoshi_saas_md/P0/09-结构化总索引与交叉映射.md（执行强门禁 + `REQ-P0-*` 需求 ID 矩阵）
  - docs/gyoseishoshi_saas_md/P0/99-文档维护与版本记录.md（G-8 / G-9 / G-10 + 最小中间产物模板）
  影响面：
  - AI / 新成员读取路径：从“直接读 PRD”切换为“先编译、后执行”
  - P0 执行门禁：高优先级歧义、越界实现、无证据完成将被显式拦截
  - 回写机制：需求、任务、实现、测试之间形成统一编号和追踪入口
  回灌计划：
  - 目标文档：docs/gyoseishoshi_saas_md/P0/README.md
    位置：核心治理规则 + P0 需求编译流水线（最小闭环）
    Owner：产品/研发
    状态：已回灌
  - 目标文档：docs/gyoseishoshi_saas_md/P0/09-结构化总索引与交叉映射.md
    位置：§1.3 / §1.4 / §7
    Owner：产品/研发
    状态：已回灌
  - 目标文档：docs/gyoseishoshi_saas_md/P0/99-文档维护与版本记录.md
    位置：G-8 / G-9 / G-10、需求编译流水线、最小中间产物模板、固定检查表
    Owner：产品/研发
    状态：已回灌

- 时间：2026-04-11
  问题：如何把 `REQ-P0-01 咨询转化` 跑成第一条真实需求编译样例？
  结论（TL;DR）：已完成 `REQ-P0-01` 的最小编译——目标、规则、边界、验收和待确认项已结构化；当前可进入任务设计，但若要进入真实实现，需先关闭“去重命中后如何处置”这一条 `P0` 级歧义。
  关键依据：
  - docs/gyoseishoshi_saas_md/P0/09-结构化总索引与交叉映射.md §7（`REQ-P0-01`）
  - docs/gyoseishoshi_saas_md/P0/02-版本范围与优先级.md §2.1、§2.2、§2.3、§5.2
  - docs/gyoseishoshi_saas_md/P0/03-业务规则与不变量.md §2.1、§2.2、§2.6、§5、§10、§12
  - docs/gyoseishoshi_saas_md/P0/04-核心流程与状态流转.md §4.1
  - docs/gyoseishoshi_saas_md/P0/06-页面规格/咨询线索.md、客户.md、案件.md
  - docs/gyoseishoshi_saas_md/P0/07-数据模型设计.md §3.0、§3.1、§3.2、§3.5
  requirements.ir（最小样例）：

  | id | type | statement | source | priority | status |
  |---|---|---|---|---|---|
  | `REQ-P0-01-IR-01` | `OBJECTIVE` | 已签约线索可转化为正式客户，并创建首个案件形成主链路入口。 | 02 §2.1-§2.3、09 §7 | P0 | frozen |
  | `REQ-P0-01-IR-02` | `RULE` | 转化时必须提供去重提示；匹配优先级为电话/邮箱优先，其次姓名+生日（或证件号）；不得物理覆盖删除。 | 03 §2.6、06/咨询线索 §3-§5 | P0 | frozen |
  | `REQ-P0-01-IR-03` | `RULE` | `Lead.group → Customer.group → Case.group` 默认继承；若转化或建案时改组，必须记录原因、操作人和时间。 | 03 §2.2、03 §12、06/咨询线索 §4、06/案件 §4 | P0 | frozen |
  | `REQ-P0-01-IR-04` | `RULE` | 首个 `Case` 创建后进入 `S1`，并自动生成资料清单与初始任务。 | 04 §2、04 §4.1、06/案件 §4 | P0 | frozen |
  | `REQ-P0-01-IR-05` | `CONSTRAINT` | 本次样例以“单 Lead → 单 Customer → 首个 Case”为最小执行单元，不把家族签批量建案当作首条试跑前置条件。 | 06/客户 §1、06/案件「附：家族签批量建案向导」 | P1 | frozen |
  | `REQ-P0-01-IR-06` | `OUT_OF_SCOPE` | 不做客户合并、企业客户主数据、自动分配、漏斗报表、批量导入导出、客户门户。 | 06/咨询线索 §P0 明确不做、06/客户 §P0 明确不做、03 §14 | P0 | frozen |
  | `REQ-P0-01-IR-07` | `OPEN_QUESTION` | 去重命中后，默认动作是“复用已有 Customer/Case”还是“允许继续新建但强提示”？ | 02 §5.2、03 §2.6、06/咨询线索 §5、06/客户 §5 | P0 | open |
  | `REQ-P0-01-IR-08` | `OPEN_QUESTION` | 页面交互是否要求一步完成“转客户+转案件”，还是允许分步完成但必须最终可追踪到同一 Lead？ | 06/咨询线索 §4、04 §4.1 | P1 | open |

  ambiguities（试跑暴露）：

  | id | question | severity | owner | status | 说明 |
  |---|---|---|---|---|---|
  | `AMB-REQ-P0-01-01` | 去重命中已有 `Customer` 时，是否允许继续新建客户，还是必须复用已有客户并只创建首个/新增案件？ | P0 | 产品 | open | 该项直接影响转化主路径、数据重复和验收口径；未关闭前不建议进入真实实现 |
  | `AMB-REQ-P0-01-02` | 转化入口是一键完成还是“先转客户、再转案件”的两步流？ | P1 | 产品/设计 | open | 不阻断本次编译，但会影响页面按钮设计、回填和测试场景 |

  boundary（冻结边界）：

  | 字段 | 内容 |
  |---|---|
  | `goal` | 建立 P0 最小咨询转化闭环：从 `Lead` 生成 `Customer` 与首个 `Case`，并保持 Group 归属、去重提示和留痕一致 |
  | `in_scope` | 线索录入与签约状态推进；电话/邮箱优先去重提示；从线索创建个人客户；从线索或客户创建首个案件；`converted_customer_id / converted_case_id` 回填；`Case` 进入 `S1`；自动生成资料清单与初始任务；改组/跨组动作留痕 |
  | `out_of_scope` | 客户物理合并；企业客户主数据；自动分配；销售漏斗分析；批量导入导出；客户门户；把家族签批量建案作为首条样例的必经路径 |
  | `acceptance` | 能从 `Lead` 创建 `Customer` 与首个 `Case`；Group 继承正确；去重提示可见；`Case` 创建后处于 `S1` 且已有资料清单/初始任务；跨组改动有原因与审计留痕 |
  | `frozen_on` | 2026-04-11 |
  | `status` | partially_frozen（受 `AMB-REQ-P0-01-01` 影响，尚未具备真实实现开工条件） |

  traceability（样例骨架）：

  | requirement_id | task_id | code_ref | test_ref | status | 说明 |
  |---|---|---|---|---|---|
  | `REQ-P0-01` | `TASK-REQ-P0-01-01` | 待实现 | 待实现 | ready_for_planning | 线索 → 客户转化、去重提示、回填 `converted_customer_id` |
  | `REQ-P0-01` | `TASK-REQ-P0-01-02` | 待实现 | 待实现 | ready_for_planning | 客户/线索 → 首个案件创建、`Case.group` 继承、`S1` 初始化 |
  | `REQ-P0-01` | `TASK-REQ-P0-01-03` | 待实现 | 待实现 | blocked_by_ambiguity | 去重命中处置策略、是否复用已有 Customer/Case 的最终口径 |

  影响面：
  - 需求编译流水线已从“规则定义”进入“真实样例”阶段
  - `REQ-P0-01` 已具备任务拆解基础，但当前被 1 条 `P0` 级歧义显式拦截，证明门禁开始生效
  - 后续同类需求可沿用同一格式继续编译，避免回到“读完文档靠记忆执行”
  下一步建议：
  - 先关闭 `AMB-REQ-P0-01-01`（去重命中后处置口径）
  - 关闭后，把 `TASK-REQ-P0-01-01/02` 进一步细化为页面、接口、测试三个执行子任务

- 时间：2026-04-11
  问题：P0 继续优化时，应该围绕什么目标收敛，才能真正帮助 AI 准确落地现有原型交互和数据设计？
  结论（TL;DR）：后续 P0 优化不再继续扩写抽象治理文档，而是明确收敛到两类执行载体：`P0-CONTRACT*` 作为交互契约，`MIGRATION-MAPPING*` 作为数据契约。`requirements.ir / ambiguities / boundary` 仍保留，但在已有原型场景下优先嵌入这两类现成文档中。
  关键依据：
  - packages/prototype/admin/leads-message/P0-CONTRACT.md（咨询线索列表与新建交互基线）
  - packages/prototype/admin/customers/P0-CONTRACT.md（客户列表/新建交互基线）
  - packages/prototype/admin/case/P0-CONTRACT.md、P0-CONTRACT-DETAIL.md（案件新建/详情交互基线）
  - packages/prototype/admin/leads-message/MIGRATION-MAPPING.md、customers/MIGRATION-MAPPING.md、case/MIGRATION-MAPPING.md（原型 → domain/data/model/ui 映射）
  - docs/gyoseishoshi_saas_md/P0/07-数据模型设计.md（实体与字段权威定义）
  影响面：
  - PRD 优化目标从“更完整的治理抽象”收敛为“更准确的交互契约 + 数据契约”
  - AI 在已有原型页面上，必须继续把冻结需求回写为页面动作、状态、字段、反馈和数据落点，而不能停在抽象 requirement 层
  - 后续工作重点将转向 `REQ-P0-01` 的跨页转化交互和字段映射冻结，而不是新增更多独立模板
  下一步建议：
  - 先关闭 `AMB-REQ-P0-01-01`，冻结去重命中后的默认处置策略
  - 然后直接回写 `咨询线索 / 客户 / 案件` 三个原型页的 `P0-CONTRACT*` 与对应 `MIGRATION-MAPPING*`

- 时间：2026-04-11
  问题：如果最终目标是让 AI 基于优化后的 PRD，准确落地现有原型交互和数据设计，那么现在最该补的最小输入是什么？
  结论（TL;DR）：最该补的不是新模板，而是“原型锚点层”。即每条主需求除了 `requirements.ir` 外，还必须明确绑定 `页面原型文件 + P0-CONTRACT* + MIGRATION-MAPPING* + 固定执行顺序`。这样 AI 的输入会从“抽象 PRD”收敛为“冻结需求 + 现有原型契约”。
  已冻结样例（`REQ-P0-01`）：
  - Lead 起点：`packages/prototype/admin/leads-message/detail.html` + `P0-CONTRACT-DETAIL.md` + `MIGRATION-MAPPING-DETAIL.md`
  - Customer 承接：`packages/prototype/admin/customers/P0-CONTRACT.md` + `MIGRATION-MAPPING.md`
  - Case 承接：`packages/prototype/admin/case/create.html` + `P0-CONTRACT.md` + `MIGRATION-MAPPING.md`
  - 固定顺序：Lead 转化 Tab 去重提示 → 转客户 → 转首个案件 → 回填跳转入口
  影响面：
  - 后续优化目标从“补更多文档”收敛为“让 AI 能直接找到该改哪页、按什么顺序实现、字段落到哪里”
  - `REQ-P0-01` 现在已具备原型级输入，不需要再靠人二次解释
  - 后续每条需求只需要补同样的原型锚点，不需要继续扩模板
  下一步建议：
  - 只做 1 件事：关闭 `AMB-REQ-P0-01-01`
  - 关闭后，把去重命中默认处置策略直接回写到上述 3 份原型契约文件中，不再新增新文档

- 时间：2026-04-11
  问题：如何基于当前原型可点击页面，生成经管签人工走查测试脚本？
  结论（TL;DR）：已生成原型可走版逐步测试脚本（`_output/03-原型可走版逐步测试脚本.md`），覆盖 18 个场景（含主成功路径 S1→S9 全阶段推进、Gate 阻断、欠款风险确认、补正循环、COE 风险确认、海外拒签、入管拒签、提醒失败兜底、已归档只读、线索流失态、签约未转化警告），每步细化到页面入口、点击元素、输入示例、预期 toast/badge/状态变化。
  关键依据：
  - docs/gyoseishoshi_saas_md/_output/01-经管签流程拆解与可测节点映射.md
  - docs/gyoseishoshi_saas_md/_output/02-原型页面可点击动作映射.md
  - packages/prototype/admin/case/data/case-detail-config.js（样本数据与阶段配置）
  - packages/prototype/admin/case/scripts/case-detail-stage-actions*.js（阶段推进与 toast）
  - packages/prototype/admin/leads-message/（线索模块原型）
  - packages/prototype/admin/customers/（客户模块原型）
  影响面：
  - 人工走查：提供可逐步执行的测试手册
  - 缺口识别：标明跨模块断点走法和原型 UI 缺口
  回灌计划：
  - 目标文档：docs/gyoseishoshi_saas_md/_output/03-原型可走版逐步测试脚本.md
    位置：独立产出文件
    Owner：QA/研发
    状态：已产出

- 时间：2026-04-12
  问题：Foundation 骨架完成后，8 个原型模块（dashboard / customers / leads-message / case / tasks / billing / documents / settings）应按什么顺序迁移到 packages/admin？
  结论（TL;DR）：推荐顺序 ① dashboard → ② customers → ③ leads → ④ case → ⑤ tasks → ⑥ billing → ⑦ documents → ⑧ settings（或 settings 作为平行轨道在 ②③ 阶段同步推进）。Dashboard 最轻量、最适合验证壳层；customers 定义标准 CRUD 列表范式；后续模块按交互复杂度和跨模块依赖递增排列。详见 `docs/gyoseishoshi_saas_md/_output/04-试点页面迁移顺序建议.md`。
  关键依据：
  - 8 个模块的 split-manifest.json（sections / scripts / dataFiles 数量对比）
  - packages/admin/src/shell/ 及 shared/ui/ 当前 foundation 基线
  - admin-shell-foundation 计划 Phase 5 §20
  影响面：
  - packages/admin 下新增 features/*/ui 组件
  - packages/admin/src/router/index.ts 路由扩展
  - shared/ui 需追加的通用组件（Table / Pagination / Modal / SegmentedControl / Toast / Stepper）
  回灌计划：
  - 目标文档：docs/gyoseishoshi_saas_md/_output/04-试点页面迁移顺序建议.md
    位置：独立产出文件
    Owner：研发
    状态：已产出

- 时间：2026-04-16
  问题：当前 `packages/server` 中案件相关实现是否满足 `P0/P1`，并应如何形成可复用的分析归档？
  结论（TL;DR）：已整理独立分析文档 `docs/gyoseishoshi_saas_md/_output/05-server端案件相关P0-P1差距分析.md`。结论是：当前 server 端还不能判断为满足 P0，也不能判断为满足 P1；问题集中在 `Gate-B / Gate-C` 闭环、`status/stage` 真相源、资料审核闭环、仪表盘口径、权限边界，以及 P1 正式模型尚未落地。
  关键依据：
  - docs/gyoseishoshi_saas_md/P0/03-业务规则与不变量.md
  - docs/gyoseishoshi_saas_md/P0/04-核心流程与状态流转.md
  - docs/gyoseishoshi_saas_md/P0/06-页面规格/案件.md
  - docs/gyoseishoshi_saas_md/P0/06-页面规格/仪表盘.md
  - docs/gyoseishoshi_saas_md/P0/07-数据模型设计.md
  - docs/gyoseishoshi_saas_md/P0/08-术语表.md
  - docs/gyoseishoshi_saas_md/P1/01-经营管理签扩展范围与落地计划.md
  - docs/gyoseishoshi_saas_md/P1/02-经营管理签技术落地清单.md
  - plan/server-p0-p1-remediation-plan.md
  影响面：
  - `packages/server/src/modules/core/cases`
  - `packages/server/src/modules/core/dashboard`
  - `packages/server/src/modules/core/validation-runs`
  - `packages/server/src/modules/core/review-records`
  - `packages/server/src/modules/core/submission-packages`
  - `packages/server/src/modules/core/document-items`
  - `packages/server/src/modules/core/document-files`
  - `packages/server/src/modules/core/residence-periods`
  回灌计划：
  - 目标文档：docs/gyoseishoshi_saas_md/_output/05-server端案件相关P0-P1差距分析.md
    位置：独立产出文件
    Owner：研发
    状态：已产出
  - 目标文档：plan/server-p0-p1-remediation-plan.md
    位置：后续整改排序与验收矩阵
    Owner：研发
    状态：待回灌

- 时间：2026-04-28
  问题：[billing-phase0-decisions] 账单模块 P0+P1 前后端接入计划 §1.1 的 D1–D10 设计锁定决议是否已全部钉死？
  结论（TL;DR）：D1–D10 全部锁定。reverse 采用"原地翻状态"方案（D1），复用 voided_* 四列承载 voided/reversed 两态（D10）；overdueAmount 走实时 SQL 聚合、不依赖人工标 overdue 状态（D2）；q 搜索范围冻结为 5 列（D3）；bulk-collect 新增 task_type='collection'（D4）+ fingerprint 必须含 task_type='collection'（D5）；no-assignee 仅取 owner_user_id（D6）；权限走 CasesService.assertCanEditCase（D7）；aggregate recentPayments 上限 50 条（D8）；gateEffectMode=block P0 仅后端解锁、UI 不暴露（D9）。
  关键依据：
  - packages/server/src/modules/core/cases/cases.types-billing.ts（CasePaymentRecordDto 第 187–207 行已有 voidReasonCode/voidReasonNote/voidedBy/voidedAt/reversedFromPaymentRecordId 字段定义）
  - packages/server/src/modules/core/billing/paymentRecords.service.ts（PAYMENT_RECORD_COLS 第 78 行含 record_status/void_reason_code/void_reason_note/voided_by/voided_at/reversed_from_payment_record_id）
  - packages/server/src/modules/core/billing/billingGuards.ts（syncBillingCacheForCase 签名 (tx: TenantDbTx, caseId: string)，第 22 行）
  - packages/server/src/modules/core/tasks/tasks.service.ts（VALID_TASK_TYPES 第 80–86 行 = general/document_follow_up/client_contact/submission/review，当前不含 collection）
  - packages/server/src/modules/core/cases/cases.types-billing.ts（CaseBillingTimelineAction 第 418–424 行，当前不含 payment_record.reversed / case.collection_task_created）
  - packages/server/src/infra/db/migrations/018_billing_gate_block.up.sql（gate_effect_mode CHECK 已放开 off|warn|block）
  - packages/server/src/modules/core/cases/cases.controller.ts（assertCanEditCase 为 private，第 428–445 行）
  影响面：
  - packages/server/src/modules/core/billing/*（reverse 端点、summary 端点、collections 端点新增）
  - packages/server/src/modules/core/cases/cases.types-billing.ts（契约扩展：timeline action、gateEffectMode=block、扩展字段）
  - packages/server/src/modules/core/cases/cases.service.ts（assertCanEditCase 提升为 public）
  - packages/server/src/modules/core/tasks/tasks.service.ts（VALID_TASK_TYPES 追加 collection）
  - packages/admin/src/views/billing/*（前端列表、流水、批量催款、风险确认全部对接真实 API）
  - packages/admin/src/shared/api/repositoryRuntime.ts（新建，消除 feature 间直接依赖）

  §1.1 Phase 0 决议表（D1–D10）锁定全文：

  | ID | 决定项 | 锁定方案 |
  |---|---|---|
  | D1 | reverse 数据语义 | **方案 A：原地翻状态。** `reverseInTx` 把原 `payment_records.record_status='valid'` 直接 UPDATE 为 `'reversed'`，不新增行、不出现负数金额。冲正字段填 `void_reason_code/note`，`reversed_at`/`reversed_by` 走既有 `voided_at`/`voided_by` 列复用（语义按 status 区分）；`reversed_from_payment_record_id` 在"复制原行后再翻"场景才用，本方案无需。`recalculateBillingStatus` 不变（仍只看 `valid`）。 |
  | D2 | overdueAmount 实时口径 | `select sum(br.amount_due - paid) where br.due_date < now() and br.status in ('due','partial','overdue') and br.org_id = $1` 的 `paid` 子聚合按 `record_status='valid'`。**不依赖 status='overdue' 是否被人工标过**。BillingPlan.status 由后续 cron（不在本计划）补落地。 |
  | D3 | q 模糊搜索字段范围 | `cases.case_no` / `cases.case_name` / `customers.name`（join）/ `billing_records.milestone_name` / `payment_records.note`（仅 payment 列表用）。所有列加 `lower(...) like '%' \|\| lower($q) \|\| '%'`。 |
  | D4 | bulk-collect task_type | `task_type='collection'`（新增枚举值）。同时扩 `VALID_TASK_TYPES`，给 `task.created` payload 加 `kind:'collection'`。 |
  | D5 | duplicate-task fingerprint | `tasks` 表查 `task_type='collection' AND source_type='billing_plan' AND source_id=billingPlanId AND status in ('pending','in_progress')`；命中即 skip。**必须含 `task_type='collection'`**，避免与同 plan 来源的 follow-up 任务冲突。 |
  | D6 | no-assignee 兜底 | P0 简化：仅取 `cases.owner_user_id`。缺失即 skip `no-assignee`。Group 默认负责人列在 `groups` 表暂未建，不在本计划新增。 |
  | D7 | no-permission 判定 | `BillingCollectionsController` 加 `@RequireRoles('staff')` 粗粒度准入；`BillingCollectionsService` 注入 `CasesService`，对每个 caseId 调 `casesService.assertCanEditCase(ctx, id)`，无写权限或 case 不存在即 skip `no-permission`。不复用 `CasesController.assertCanEditCase`（private，跨模块不可见）；先在 §2.0.2 把同名 helper 提升到 `CasesService` 公开方法。 |
  | D8 | recentPayments 条数 | aggregate 端点固定返回最近 50 条（按 `received_at desc`，含 voided/reversed 用于审计展示）；超过 50 条时前端切到 PaymentRecords list 端点分页（不在 aggregate 路径继续翻）。 |
  | D9 | gateEffectMode=block 暴露范围 | P0 仅服务端解锁；契约 `CaseBillingPlanCreateInput.gateEffectMode` 联合追加 `block`，但 admin UI 不暴露 block 选项，留给 P1 COE 流程。DB CHECK 已在 `018_billing_gate_block` 放开，无需新增迁移。 |
  | D10 | reverse 字段复用语义 | 方案 A 复用 `void_reason_code` / `void_reason_note` / `voided_by` / `voided_at` 列承载 voided/reversed 两态。`CasePaymentRecordDto.voidedBy` / `voidedByDisplayName` / `voidedAt` 在 `recordStatus='reversed'` 时表示 reverse 操作人/时间；契约 JSDoc 必须补此说明，前端 PaymentLogTable 按 `recordStatus` 分支渲染（voided=红/reversed=橙）。不新增独立的 `reversedAt`/`reversedBy` 列。 |

  代码现状验证（快照 2026-04-28）：
  - `CaseBillingTimelineAction`（cases.types-billing.ts:418–424）当前 **不含** `payment_record.reversed` / `case.collection_task_created` → Phase 1 §2.0.3 追加
  - `VALID_TASK_TYPES`（tasks.service.ts:80–86）当前 = `general/document_follow_up/client_contact/submission/review`，**不含 `collection`** → Phase 1 §2.7 追加
  - `PAYMENT_RECORD_COLS`（paymentRecords.service.ts:78）已含 `record_status/void_reason_code/void_reason_note/voided_by/voided_at/reversed_from_payment_record_id` → D1/D10 所需列已就绪
  - `syncBillingCacheForCase`（billingGuards.ts:22）签名 `(tx: TenantDbTx, caseId: string)` → 事务内调用，无 ctx 参数
  - `assertCanEditCase`（cases.controller.ts:428–445）为 **private** → D7 要求先提升到 CasesService
  - `018_billing_gate_block.up.sql` 已将 `gate_effect_mode` CHECK 放开为 `off|warn|block` → D9 无需新迁移

  回灌计划：
  - 目标文档：billing-module-integration plan §1.1
    位置：Phase 0 设计锁定决议表
    Owner：研发
    状态：已锁定（2026-04-28，D1–D10 全部签字）

- 时间：2026-04-28
  问题：[T-20-fileback] 《P0+P1 事务所流程驱动 Bug 修复（修订版）》17 项 Bug 修复完成回灌——本轮已修什么、留了什么给 P2、下一轮入口在哪
  结论（TL;DR）：P0 BUG-062~069（8 个）+ P1 BUG-070~078（9 个）全部修复完毕，`npm run guard` 全绿。核心改动：引入 `cases.business_phase` 双层状态机（20 状态枚举 + 转换图 + gate 条件），落地 7 场景资料模板（内嵌多语言 label），修复 `/aggregate` 500、续签提醒未派生与日期偏 1 天、客户字段缺失，以及 9 项 UI 本地化与字段展示问题。P2（BUG-079~082）及 Document Center 接真实 API、列表 phase 筛选 UI、checklist item i18n 字典迁移留下一轮。
  关键依据：
  - docs/gyoseishoshi_saas_md/_output/09-事务所流程驱动走查Bug清单.md（本轮走查全文，BUG-062~082）
  - docs/gyoseishoshi_saas_md/_output/10-双层状态机映射.md（本轮新增，固化映射表 + 转换图 + gate 条件）
  - packages/server/src/modules/core/cases/businessPhase.ts（phase 枚举 + 转换图 + assertPhaseTransition + stageToPhaseDefault 实现）
  - .cursor/plans/p0+p1_事务所流程驱动_bug_修复（修订版）_1c92a793.plan.md（执行计划）

  本轮已修 Bug 清单：

  | BUG ID | 优先级 | 摘要 | 修复要点 |
  |---|---|---|---|
  | BUG-062 | P0 | 案件状态机仅 S1-S9，与业务 20 状态脱节 | 新增 `cases.business_phase` NOT NULL 列（20 枚举值），保留 S1-S9 操作层 + 新增 businessPhase 业务层，迁移按 stageToPhaseDefault 回填 |
  | BUG-063 | P0 | transition 不强制顺序，可 S1→S9 跳跃 | `DEFAULT_CASE_TRANSITIONS` 收紧（移除 S1~S6→S9），S9 仅允许从 S8 进入；新增 `POST /:id/phase-transition` 端点 + assertPhaseTransition 强守卫 |
  | BUG-064 | P0 | `/aggregate` 任何新建 case 都 500 | `getDetailAggregate` 改 `Promise.allSettled` 兜底，子查询失败仍返回 200 + 部分数据 + logger.error |
  | BUG-065 | P0 | 建案向导只有 3 模板（家族/技人国/经营管理） | 扩展为 7 场景模板（biz_mgmt_cert_4m/1y/renewal、company_setup、eng_humanities_intl_cert/renewal、intra_company_transfer），item label 用 `{ zh, en, ja }` 内嵌 |
  | BUG-066 | P0 | 资料清单只有 8-9 项 vs 规范 18-25 项 | 7 场景模板各按业务规范填充完整 checklist（18~31 项不等） |
  | BUG-067 | P0 | `POST /residence-periods` 后 reminderCreated:false | 修复 `syncExpiryReminders` SAVEPOINT catch，确保 180/90/30 天提醒任务自动派生 |
  | BUG-068 | P0 | 日期字段被偏移 1 天（时区 bug） | SQL 查询对 date 列 cast 为 text（`valid_from::text`），绕过 pg 驱动的 Date 解析 |
  | BUG-069 | P0 | 客户实体缺 location/source_type/visa_type | baseProfile zod 加 location/sourceType/visaType/referrerName；前端详情页 + 表单 4 字段；BMV visaType 由 visaPlan 派生 |
  | BUG-070 | P1 | 案件列表 Stage 列展示原始 S1 码 | CaseTableRow 4 列重构，Stage 走 i18n + phase badge |
  | BUG-071 | P1 | Owner 列展示 UUID | Owner UUID 解析回退 + 用户名展示 |
  | BUG-072 | P1 | Risk 列展示 low vs 筛选选项 Normal | riskLevel 走 i18n 映射（low→Normal/medium→Needs attention/high→High risk） |
  | BUG-073 | P1 | Case 列 UUID 当主标识，caseNo 不可见 | Case 列优先展示 caseNo，UUID 仅 dev tooltip |
  | BUG-074 | P1 | 活动日志 Time 列首字母 T 被截 | 后端 timeline `String(Date)` 改 `.toISOString()`；前端 formatDateTime 改 `Intl.DateTimeFormat` + locale |
  | BUG-075 | P1 | 客户 Last created 展示原始 ISO | 接 formatDateTime(locale) |
  | BUG-076 | P1 | Cases tab Updated/Type/Owner 列原样字段 | Updated 接 formatDateTime(locale)；Type 接 caseTypeLabel i18n；Owner 同 BUG-071 修复 |
  | BUG-077 | P1 | 建案向导客户下拉混入 fixture | 客户下拉切真实 API，fixture 移除；失败态改重试按钮 |
  | BUG-078 | P1 | Checklist 章节标题/模板说明写死中文 | i18n 字典三语补 cases.create.* / sections.* / applicationTypes.* |

  留 P2（下一轮）：

  | 项目 | 说明 |
  |---|---|
  | BUG-079 | Document Center 新建的真实 case 不出现，仅展示 fixture |
  | BUG-080 | 客户详情 URL `?tab=communications` 与实际 key `comms` 不一致 |
  | BUG-081 | `/#/cases?stage=S8` URL query 不被列表筛选器消费 |
  | BUG-082 | 客户 Avatar 按钮 locale 问题 |
  | Document Center 接真实 API | 从 fixture 切到 `/api/document-items` 真实数据 |
  | 列表 phase 筛选 UI | 后端已支持 `?phase=` 查询参数，前端筛选器待实现 |
  | checklist item i18n 迁移 | 当前 item label 用 `{ zh, en, ja }` 内嵌多语言，后续迁到 i18n 字典或 `/api/case-templates` |
  | 客户列表按 location/sourceType 过滤 | 字段已入库，筛选 UI 待实现 |

  影响面：
  - packages/server/src/modules/core/cases/*（双层状态机、phase-transition 端点、aggregate 兜底、transition 收紧）
  - packages/server/src/modules/core/residence-periods/*（提醒自动派生、日期时区修复）
  - packages/server/src/modules/core/customers/*（baseProfile 字段扩展）
  - packages/server/src/infra/db/drizzle/schema.ts（business_phase 列）
  - packages/admin/src/views/cases/*（7 模板、CaseTableRow 4 列重构、phase badge、客户下拉切 API）
  - packages/admin/src/views/customers/*（4 字段、formatDateTime、活动日志 i18n）
  - packages/admin/src/i18n/messages/*（cases/customers/leads/conversations/settings 三语同步）
  回灌计划：
  - 目标文档：docs/gyoseishoshi_saas_md/_output/10-双层状态机映射.md
    位置：独立产出文件（新建）
    Owner：研发
    状态：已产出（2026-04-28）
  - 目标文档：docs/gyoseishoshi_saas_md/P0/03-业务规则与不变量.md
    位置：§3.0F 状态机冻结声明（追加 businessPhase 20 状态 + stageToPhaseDefault 映射表）
    Owner：研发
    状态：待回灌（下一轮优先）
  - 目标文档：docs/gyoseishoshi_saas_md/P0/07-数据模型设计.md
    位置：§双层状态模型（追加 business_phase 字段定义与迁移回填规则）
    Owner：研发
    状态：待回灌（下一轮优先）

- 时间：2026-04-28
  问题：[T-00-ground] 双层状态机实装前的业务规则 ground——20 状态枚举、7 场景资料矩阵、CLOSED_SUCCESS 前置条件、stageToPhaseDefault 映射
  结论（TL;DR）：本轮 4 项关键 ground 全部命中权威文档；20 状态来源于 `docs/事务所流程/事务所流程.master.json` → `workflow.states`（权威源为 `新规经营管理签申请全套流程Markdown文档.md`）；7 场景资料矩阵来源于 `在留資格別必要情報一覧Ver2.ai-optimized.md` 结构化摘要；CLOSED_SUCCESS 前置条件来源于 P1/01 §M9 + 流程文档业务规则§在留期间记录规则 + §提醒失败兜底规则；`stageToPhaseDefault` 映射是本计划新增的架构决策（§3），P0/P1 权威文档中只定义了 S1-S9 管理层与 CaseWorkflowStep 业务层的双层模型（07 §1 + 08 §双层状态模型），尚无显式 stage→businessPhase 映射表——需要本轮实装时一并固化。

  关键依据：

  ### A. 业务状态机 20 状态完整枚举

  | # | ID | 中文名称 | 所属 phase | 终态 |
  |---|---|---|---|---|
  | 1 | `CONSULTING` | 咨询阶段 | consultation | 否 |
  | 2 | `CONTRACTED` | 已签约 | consultation | 否 |
  | 3 | `WAITING_MATERIAL` | 等待客户提交资料 | contract_post_processing | 否 |
  | 4 | `MATERIAL_PREPARING` | 内部制作资料中 | contract_post_processing | 否 |
  | 5 | `REVIEWING` | 内部/客户确认中 | contract_post_processing | 否 |
  | 6 | `APPLYING` | 已提交入管 | contract_post_processing | 否 |
  | 7 | `UNDER_REVIEW` | 入管审查中 | immigration_review | 否 |
  | 8 | `NEED_SUPPLEMENT` | 入管要求补资料 | immigration_review | 否 |
  | 9 | `SUPPLEMENT_PROCESSING` | 补资料处理中 | immigration_review | 否 |
  | 10 | `APPROVED` | 下签（COE） | immigration_review | 否 |
  | 11 | `REJECTED` | 入管拒签 | immigration_review | 否 |
  | 12 | `WAITING_PAYMENT` | 待收尾款 | post_approval | 否 |
  | 13 | `COE_SENT` | 已发送 COE | post_approval | 否 |
  | 14 | `VISA_APPLYING` | 客户海外返签中 | post_approval | 否 |
  | 15 | `SUCCESS` | 客户已成功入境 | post_approval | 否 |
  | 16 | `VISA_REJECTED` | 海外返签拒签 | post_approval | 否 |
  | 17 | `RESIDENCE_PERIOD_RECORDED` | 已记录新在留有效期间 | residence_management | 否 |
  | 18 | `RENEWAL_REMINDER_SCHEDULED` | 已设置到期提醒 | residence_management | 否 |
  | 19 | `CLOSED_SUCCESS` | 成功结案 | residence_management | **是** |
  | 20 | `CLOSED_FAILED` | 失败结案 | immigration_review | **是** |

  引用来源：
  - `docs/事务所流程/事务所流程.master.json` → `workflow.states`（20 条）
  - `docs/事务所流程/新规经营管理签申请全套流程Markdown文档.md` → §状态说明（State Definition）
  - `docs/gyoseishoshi_saas_md/P1/01-经营管理签扩展范围与落地计划.md` §0 结构化速查

  ### B. 7 场景资料矩阵

  | scenario_id | 中文名称 | 日文来源名 | 必需项（source_rows 计） | 条件必需项（source_rows 计） | 合计列出 |
  |---|---|---|---:|---:|---:|
  | `biz_mgmt_cert_4m` | 经营管理签认定 4 个月 | 経営管理 / 認定4か月 | 18 | 4 | 22 |
  | `company_setup` | 公司设立资料包 | 会社設立 | 7 | 2 | 9 |
  | `biz_mgmt_cert_1y` | 经营管理签认定 1 年 | 経営管理 / 認定1年 | 27 | 4 | 31 |
  | `biz_mgmt_renewal` | 经营管理签续签 | 経営管理 / 期間更新 | 12 | 2 | 14 |
  | `eng_humanities_intl_cert` | 技人国认定 | 技人国 / 認定 | 21 | 5 | 26 |
  | `eng_humanities_intl_renewal` | 技人国续签 | 技人国 / 期間更新 | 13 | 2 | 15 |
  | `intra_company_transfer` | 企业内转勤 | 企業内 / 転勤 | 11 | 2 | 13 |

  去重后全矩阵共 51 个唯一 document key；全场景共通硬必需项仅 `passport_copy`。

  引用来源：
  - `docs/事务所流程/在留資格別必要情報一覧Ver2.ai-optimized.md` → §结构化摘要
  - `docs/事务所流程/在留資格別必要情報一覧Ver2.中文规范版资料清单.md` → §场景一览
  - `docs/事务所流程/事务所流程.master.json` → `documents_matrix.scenarios`

  ### C. CLOSED_SUCCESS 前置条件

  进入 `CLOSED_SUCCESS` 必须同时满足以下条件：

  1. **入境成功**：案件已通过 `VISA_APPLYING → SUCCESS` 路径确认客户入境。
  2. **已录入在留期间**：`ResidencePeriod` 记录已创建（`residence_period_start_date` / `residence_period_end_date` / `residence_years` / `entry_date`），案件处于 `RESIDENCE_PERIOD_RECORDED`。
  3. **已生成续签提醒**：系统已自动创建 180 / 90 / 30 天到期提醒任务，案件处于 `RENEWAL_REMINDER_SCHEDULED`。
  4. **提醒创建失败时禁止自动结案**：若提醒任务创建失败，案件不得自动进入 `CLOSED_SUCCESS`，应进入人工待处理队列或异常状态。

  进入 `CLOSED_FAILED` 必须填写 `closeReason`；允许进入的前置状态为 `REJECTED` 或 `VISA_REJECTED`。

  引用来源：
  - `docs/gyoseishoshi_saas_md/P1/01-经营管理签扩展范围与落地计划.md` → §M9 结案与异常兜底
  - `docs/事务所流程/新规经营管理签申请全套流程Markdown文档.md` → §在留期间记录规则
  - `docs/事务所流程/新规经营管理签申请全套流程Markdown文档.md` → §提醒失败兜底规则
  - `docs/事务所流程/新规经营管理签申请全套流程Markdown文档.md` → §到期提醒规则
  - `docs/事务所流程/事务所流程.master.json` → `workflow.flow_paths.exception_paths`

  ### D. stageToPhaseDefault 映射（本轮架构决策）

  P0 权威文档中 `Stage (S1-S9)` 是管理协作层，`CaseWorkflowStep` 是业务层（P1 启用）。本计划新增 `cases.business_phase` 字段（NOT NULL），用于承载 20 个业务状态。以下是迁移回填时使用的默认映射：

  | Stage | Stage 说明 | 默认 businessPhase | 映射理由 |
  |---|---|---|---|
  | S1 | 已建档 | `CONSULTING` | 案件刚建档，处于咨询→签约前 |
  | S2 | 资料收集中 | `WAITING_MATERIAL` | 签约后向客户收集资料 |
  | S3 | 资料审核中 | `MATERIAL_PREPARING` | 内部审核 / 制作资料阶段 |
  | S4 | 文书制作中 | `REVIEWING` | 行政书士处理 + 确认流程 |
  | S5 | 待校验 | `REVIEWING` | 最终确认、校验阶段，业务语义同 REVIEWING |
  | S6 | 待提交 | `APPLYING` | 准备提交入管 |
  | S7 | 已提交审理中 | `UNDER_REVIEW` | 已提交入管、审查中 |
  | S8 | 已出结果 | `APPROVED` | 默认走 happy path；REJECTED 由显式 transition 覆盖 |
  | S9 | 已归档 | `CLOSED_SUCCESS` | 默认走成功结案；CLOSED_FAILED 由 closeReason 路径覆盖 |

  备注：
  - 该映射仅用于旧数据迁移回填，新建 case 在 service 层根据实际动作写入精确的 phase。
  - `S4/S5 → REVIEWING`：S4 文书制作和 S5 待校验在业务维度都属于"内部确认中"语义范畴。
  - `S8 → APPROVED`：S8 已出结果可能是 APPROVED 或 REJECTED，但旧数据未记录具体结果，默认取 happy path。
  - `S9 → CLOSED_SUCCESS`：旧归档案件默认视为成功结案；若实际为失败结案，后续需人工或脚本修正。

  引用来源：
  - `docs/gyoseishoshi_saas_md/P0/08-术语表.md` → §Stage（案件阶段）
  - `docs/gyoseishoshi_saas_md/P0/07-数据模型设计.md` → §双层状态模型
  - `docs/gyoseishoshi_saas_md/P0/08-术语表.md` → §P0 必须理解的 7 个概念
  - `docs/gyoseishoshi_saas_md/P0/08-术语表.md` → §双层状态模型（P1 可扩展性核心设计）
  - `docs/事务所流程/事务所流程.master.json` → `workflow.states` + `workflow.transitions`（20 状态转换图）

  ### E. 业务规则转换图（允许的 phase 转换）

  ```text
  CONSULTING → CONTRACTED
  CONTRACTED → WAITING_MATERIAL
  WAITING_MATERIAL → MATERIAL_PREPARING
  MATERIAL_PREPARING → WAITING_MATERIAL (内部补资料回退)
  MATERIAL_PREPARING → REVIEWING
  REVIEWING → APPLYING
  APPLYING → UNDER_REVIEW
  UNDER_REVIEW → APPROVED | REJECTED | NEED_SUPPLEMENT
  NEED_SUPPLEMENT → SUPPLEMENT_PROCESSING
  SUPPLEMENT_PROCESSING → UNDER_REVIEW (补资料循环)
  APPROVED → WAITING_PAYMENT
  WAITING_PAYMENT → COE_SENT (guard: 尾款收讫)
  COE_SENT → VISA_APPLYING
  VISA_APPLYING → SUCCESS | VISA_REJECTED
  REJECTED → CLOSED_FAILED
  VISA_REJECTED → CLOSED_FAILED
  SUCCESS → RESIDENCE_PERIOD_RECORDED
  RESIDENCE_PERIOD_RECORDED → RENEWAL_REMINDER_SCHEDULED
  RENEWAL_REMINDER_SCHEDULED → CLOSED_SUCCESS (guard: 提醒任务创建成功)
  ```

  引用来源：
  - `docs/事务所流程/事务所流程.master.json` → `workflow.transitions`（22 条转换边）
  - `docs/事务所流程/新规经营管理签申请全套流程Markdown文档.md` → §流程节点定义 Step 5-20

  影响面：
  - `packages/server/src/modules/core/cases/businessPhase.ts`（新增）：phase 枚举 + 转换图 + 默认映射 + assertPhaseTransition
  - `packages/server/src/infra/db/drizzle/schema.ts`：`cases` 表加 `business_phase text NOT NULL`
  - `packages/server/src/modules/core/cases/cases.service.ts`：create/transition 同步推进 phase
  - `packages/admin/src/views/cases/constants.ts`：`BUSINESS_PHASES` 枚举 + `getPhaseLabel`
  - `packages/admin/src/views/cases/fixtures-create.ts`：7 场景模板内嵌多语言 label
  - i18n 字典（cases / customers）三套语言同步补 phase 相关键
  回灌计划：
  - 目标文档：docs/gyoseishoshi_saas_md/P0/03-业务规则与不变量.md
    位置：§3.0F 状态机冻结声明（追加"业务 phase 维度 20 状态 + stageToPhaseDefault 映射表"）
    Owner：研发
    状态：待回灌（本轮实装完成后回灌）
  - 目标文档：docs/gyoseishoshi_saas_md/P0/07-数据模型设计.md
    位置：§双层状态模型（追加"business_phase 字段定义与迁移回填规则"）
    Owner：研发
    状态：待回灌（本轮实装完成后回灌）

- 时间：2026-04-30
  问题：[F2-doc-backfill] 资料中心 P0 闭环 + P1 四层模型实装后的关键决策回填——transition→waived 路径关闭、ALLOWED_TRANSITIONS 矩阵扩展、asset 去重策略、waive 专用端点 5 类原因码
  结论（TL;DR）：本轮资料中心 P0 闭环 + P1 四层模型实装，产生 5 项需回灌到权威文档的关键架构/产品决策：(1) waive 操作从 transition 矩阵剥离，改走专用端点 `POST /document-items/:id/waive`，transition 端点显式拒绝 `toStatus='waived'`；(2) `DOCUMENT_ITEM_ALLOWED_TRANSITIONS` 矩阵扩展两条边：`pending→uploaded_reviewing`（行政书士直接登记后待审核）、`revision_required→uploaded_reviewing`（退回后重新提交）；(3) `document_assets` 去重策略按 `(org_id, material_code, owner_subject_type, owner_customer_id)` 唯一索引 + `ON CONFLICT DO NOTHING`，**不使用** `hash_value`（因 hash 在 `document_files` 表而非 `document_assets` 表）；(4) waive 端点 5 类原因码（`visa_type_exempt` / `guarantor_family_exempt` / `equivalent_in_other_case` / `immigration_confirmed_exempt` / `other`），`other` 时 `note` 必填；(5) 登记资料与引用既有版本均在事务内联动推进资料项状态到 `uploaded_reviewing`，S9 已归档案件统一返回 `CASE_S9_READONLY`。
  关键依据：
  - packages/server/src/modules/core/documents.types.ts §DOCUMENT_ITEM_ALLOWED_TRANSITIONS（扩展矩阵）+ §WAIVE_REASON_CODES（5 码）+ §WAIVE_ALLOWED_FROM_STATUSES（5 状态白名单）
  - packages/server/src/modules/core/document-items/documentItems.controller.ts（waive 端点 + transition→waived reject）
  - packages/server/src/modules/core/document-files/documentFiles.service.ts（upload 状态联动，同事务）
  - packages/server/src/modules/core/document-requirement-file-refs/documentRequirementFileRefs.service.ts（link 状态联动）
  - packages/server/src/modules/core/document-assets/documentAssets.shared.ts §buildUpsertAssetSql（ON CONFLICT DO NOTHING 去重）
  - packages/server/src/infra/db/migrations/036_document_assets_uniqueness.up.sql（partial unique index：customer_owned + employer_owned）
  - packages/admin/src/views/documents/model/useDocumentBulkActions.ts（Promise.allSettled 错误聚合）
  - packages/admin/src/shared/ui/Toast.vue + packages/admin/src/shared/model/useToast.ts（替换 window.alert）
  影响面：
  - packages/server/src/modules/core/document-items/*（waive 端点、transition→waived 关闭、list 扩展 ownerSide/statusIn/expired）
  - packages/server/src/modules/core/document-files/*（upload 状态联动 + asset upsert）
  - packages/server/src/modules/core/document-assets/*（新增 controller + service，asset 去重 + 共享过期风险）
  - packages/server/src/modules/core/document-requirement-file-refs/*（新增 controller + service，link 状态联动 + unlink 提交包守卫）
  - packages/admin/src/views/documents/*（跨案件列表接 API、写操作接 API、toast 替换 alert、ReferenceVersionModal + SharedExpiryRiskPanel 接真实数据）
  - packages/admin/src/views/cases/components/CaseDocumentsTab.vue（资料清单 Tab 接 model + 完成率读后端）
  - docs/gyoseishoshi_saas_md/P0/06-页面规格/资料中心.md（§2.3 批量 waive 走专用端点、§4 waive 行更新、§4.1 登记状态联动 + §4.2 引用状态联动、§6 waive 路径说明）
  回灌计划：
  - 目标文档：docs/gyoseishoshi_saas_md/P0/06-页面规格/资料中心.md
    位置：§2.3 批量动作（waive 走专用端点）、§4 关键动作表（waive 行扩展 5 码 + 专用端点）、§4.1 登记资料（状态联动 + S9 守卫）、新增 §4.2 引用既有版本（P1 跨案件复用，含状态联动 + 撤销守卫）、§6 权限与可见性（waive 路径说明 + S9 统一守卫）
    Owner：研发
    状态：已回灌（2026-04-30）
  - 目标文档：docs/gyoseishoshi_saas_md/P0/03-业务规则与不变量.md
    位置：§3.2 资料项状态（ALLOWED_TRANSITIONS 扩展两条边）、§7.2 waived 治理（waive 走专用端点 + 5 码）
    Owner：研发
    状态：待回灌（下一轮；本轮仅回灌页面规格层）

---

## T-00b-recon 前置勘察报告

日期：2026-04-28

### (1) drizzle-kit 与日期库

- **drizzle-kit**: devDependencies `"drizzle-kit": "^0.31.10"` ✅
- **drizzle-orm**: dependencies `"drizzle-orm": "^0.45.2"` ✅
- **drizzle.config.ts**: schema 指向 `./src/infra/db/drizzle/schema.ts`，输出目录 `./drizzle`
- **日期库**: 无 `date-fns`、`date-fns-tz`、`dayjs`、`luxon`、`moment` — 全仓零日期依赖
- **现有日期处理**: `toDateOnlyString` 在 `residencePeriods.service.ts` 中手写（`.slice(0, 10)` / `.toISOString().slice(0, 10)`），timeline 用 `String(r.created_at)`
- **结论**: 不引入新日期库；BUG-068 时区修正用零依赖方案（详见 §4 下方）

### (2) Migration 文件位置与命令

- 目录: `packages/server/src/infra/db/migrations/`
- 命名约定: `NNN_name.up.sql` + `NNN_name.down.sql`（NNN 三位数字）
- 当前最大编号: **031** (`031_billing_admin_indexes`)
- 下一可用编号: **032**
- 运行器: `packages/server/src/infra/db/runMigrations.ts`（自建，非 drizzle-kit migrate）
  - `npm run db:migrate` — 应用全部待执行迁移
  - `npm run db:rollback [--steps N]` — 回滚最后 N 条（默认 1）
  - `npm run db:migrations:check` — 校验 up/down 配对完整性（guard 门禁包含）
  - `npm run db:drizzle:check` — 校验 drizzle schema 与实际迁移一致性
- 新增 `business_phase` 列应创建 `032_business_phase.up.sql` + `032_business_phase.down.sql`
- drizzle schema (`schema.ts`) 需同步加 `businessPhase: text("business_phase").notNull()`

### (3) visaPlan ↔ visaType 映射决策

数据分布:

| 字段 | 位置 | 用途 |
|---|---|---|
| `CustomerBmvProfile.visaPlan` | `customers.base_profile` JSONB → `bmvProfile.visaPlan` | BMV 承接时选定的签证方案（如 `new_1year`） |
| `cases.visa_plan` | `cases` 表 SQL 列 | BMV 建案时由 `bmvProfile.visaPlan` 写入 |
| `ResidencePeriod.visaType` | `residence_periods.visa_type` | 在留资格类型（审批后记录） |
| `baseProfile.visaType`（新） | 计划新增至 `customers.base_profile` | 非 BMV 客户的签证类型 |

**决策**:
- **BMV 客户**: `visaType` 由 `bmvProfile.visaPlan` 派生 → `cases.visa_plan` → 审批后写入 `residence_periods.visa_type`。不在 `baseProfile` 重复存储。
- **非 BMV 客户**: 新增 `baseProfile.visaType` 字段作为唯一来源，建案/记录在留资格时引用此值。
- **读取路径**: 前端通过 `CustomerDetailDto` 暴露一个统一的 `visaType` 计算字段：若 `bmvProfile` 存在则取 `bmvProfile.visaPlan`，否则取 `baseProfile.visaType`。
- **无双源风险**: BMV 客户不写 `baseProfile.visaType`，非 BMV 客户不写 `bmvProfile.visaPlan`，两条路径互斥。

### (4) BUG-074 活动日志截断时间戳 — 组件定位与根因

**组件路径**: `packages/admin/src/views/customers/components/CustomerLogsTab.vue`

**截图复现**: Time 列显示 `ue Apr 28 2026 13:40:12 GMT+0900 (Japan Standard Time)` — 首字母 "T" 被吃掉。

**数据链路**:
1. 后端 `timeline.service.ts` 用原生 `pg` 查询 `timeline_logs.created_at`（`timestamptz`）
2. `pg` 驱动把 `timestamptz` 解析为 JavaScript `Date` 对象
3. `mapRow` 中执行 `createdAt: String(r.created_at)` — `String(Date)` 产出 `"Tue Apr 28 2026 13:40:12 GMT+0900 (Japan Standard Time)"`（非 ISO）
4. 前端 adapter `pickOptionalString` 原样透传
5. `CustomerLogsTab.vue` 的 `formatDateTime(iso)` 执行 `iso.replace("T", " ")` — 替换了 "Tue" 的首字母 "T" → `" ue Apr 28 ..."`
6. CSS `width: 180px` + `white-space: nowrap` 导致超长字符串左截

**修复方案**:
- 后端: `timeline.service.ts` 中改为 `createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at)`，确保输出 ISO 格式
- 前端: `CustomerLogsTab.vue` 的 `formatDateTime` 改为 `Intl.DateTimeFormat` + locale，或至少做安全的 ISO→可读转换
- CSS: `--time` 列宽可放宽到 220px 以容纳 locale 格式化后的时间

### BUG-068 时区问题补充说明

`toDateOnlyString` 在 `residencePeriods.service.ts` 中的行为:
- 对 `string` 输入: `.slice(0, 10)` — 安全，因为 drizzle schema 已配 `date("valid_from", { mode: "string" })`
- 对 `Date` 输入: `.toISOString().slice(0, 10)` — 此路径在使用 drizzle query builder 时不会触发（`mode: "string"` 确保返回 string）
- 但 `residence_periods` 的 CRUD 使用**原生 pg 查询**（非 drizzle query builder），`pg` 驱动对 `date` 列返回 JavaScript `Date` 对象
- `Date.toISOString()` 在 UTC 输出 → 若原值为 `2026-04-28`（JST），`new Date("2026-04-28")` 在 JST 服务器上被解析为 `2026-04-27T15:00:00.000Z`，`.toISOString().slice(0, 10)` 变成 `2026-04-27` — **日期偏移一天**
- **修复**: 在 SQL 查询中对 `date` 列 cast 为 text（`valid_from::text`），使 pg 驱动直接返回 `YYYY-MM-DD` 字符串，完全绕过 `Date` 解析

- 时间：2026-04-29
  问题：[BUG-121] 失败结案（CLOSED_FAILED）路径下是否存在退款规则？系统是否自动退款 / 部分退款？金额计算逻辑？用户操作流？数据模型预案？
  结论（TL;DR）：P0/P1 权威文档中 **完全未定义** 失败结案退款规则。BillingPlan 状态枚举只覆盖正向收费流（due / partial / paid / overdue），无 refunded / cancelled 状态；PaymentRecord 仅记录收到的付款，无退款记录概念；收费页面规格的「关键动作」仅含登记回款 / 上传凭证 / 创建催款任务 / 欠款风险确认，无退款动作；「P0 明确不做」列表中亦未将退款列为 P1 延后项。退款 SOP 属于 **权威文档缺口**，需产品/业务/会计三方输入后才能排技术 PR。
  关键依据：
  - docs/gyoseishoshi_saas_md/P0/07-数据模型设计.md §3.20 BillingPlan / PaymentRecord——BillingPlan.status ∈ {due, partial, paid, overdue}，PaymentRecord 仅含 amount_received / record_status(valid/voided/reversed)，无退款金额或退款类型字段
  - docs/gyoseishoshi_saas_md/P0/08-术语表.md §BillingPlan / §PaymentRecord——定义中无退款相关条目
  - docs/gyoseishoshi_saas_md/P0/06-页面规格/收费与财务.md §4 关键动作——4 项动作均为正向收费流，无退款入口
  - docs/gyoseishoshi_saas_md/P0/06-页面规格/收费与财务.md §P0 明确不做——6 项延后功能无一涉及退款
  - docs/gyoseishoshi_saas_md/P0/03-业务规则与不变量.md §6 收费与欠款策略——仅定义欠款 warn 模式、风险确认留痕、回款归集口径、回款更正（voided/reversed），未涉及退款场景
  - 仓库内权威文档全文检索（关键词覆盖：「失败结案路径下的退款规则」「案件拒签失败后退款流程」「退款 / refund / 收费 / billing / 结案 / 失败 / 拒签」）均未命中任何退款相关内容
  影响面：
  - CLOSED_FAILED phase transition 后的财务收尾流：当前 phase 推到 CLOSED_FAILED 后 billing 状态无变化，未结清节点保持 due/overdue
  - BillingPlan 状态枚举：可能需追加 refunded / partially_refunded / cancelled 等状态
  - PaymentRecord 数据模型：可能需追加 kind 字段（payment / refund）或独立 RefundRecord 实体
  - 收费页面规格：需追加退款操作入口与退款记录展示
  - 案件详情页/仪表盘：CLOSED_FAILED 案件的财务摘要展示逻辑

  待业务侧确认的 3 个开放问题：

  | # | 问题 | 影响 | 建议Owner |
  |---|---|---|---|
  | Q1 | 拒签/失败结案时，是否系统级自动触发退款？还是由事务所手动发起退款？ | 决定是否需要 phase-transition 联动自动退款逻辑 vs 纯手动操作 | 产品 + 业务 |
  | Q2 | 退款金额按什么规则计算？全额退款 / 按 milestone 阶段比例退 / 按已服务工时扣除？是否存在不退款的场景（如已完成部分阶段工作）？ | 决定退款金额计算逻辑的复杂度与数据模型 | 业务 + 会计 |
  | Q3 | 退款记录的数据模型：是在 PaymentRecord 上追加 kind=refund + 负数金额？还是新增独立的 RefundRecord 实体？是否需要关联退款凭证（银行转账截图等）？ | 决定数据模型扩展方案 | 产品 + 研发 |

  回灌计划：
  - 目标文档：docs/gyoseishoshi_saas_md/P0/03-业务规则与不变量.md
    位置：§6 收费与欠款策略（需追加「失败结案退款规则」小节）
    Owner：产品/业务/会计
    状态：待输入（Q1-Q3 关闭后回灌）
  - 目标文档：docs/gyoseishoshi_saas_md/P0/07-数据模型设计.md
    位置：§3.20 BillingPlan / PaymentRecord（需追加退款相关字段或实体）
    Owner：研发
    状态：待输入（依赖 Q3 决议）
  - 目标文档：docs/gyoseishoshi_saas_md/P0/06-页面规格/收费与财务.md
    位置：§4 关键动作（需追加退款操作）
    Owner：产品/设计
    状态：待输入（依赖 Q1-Q2 决议）

- 时间：2026-04-30
  问题：[R8 P1 修复回灌] 双层状态机自动化复盘走查第八轮 4 条 P1 Bug（BUG-116/127/128/129）修复结论 + R7 §3 复现脚本修订
  结论（TL;DR）：R8 走查发现的 4 条 P1（BUG-116 tab 别名缺失 + BUG-127/128/129 三条 R5 回归）全部 land。修复口径：server 端抽出 `toTimestampStringOrNull` 共享 helper 堵住 `String(Date)` 根因，admin 端恢复 `ownerDisplayName` 透传 / `formatCaseIdentity` 面包屑调用 / `formatEntryTime` UI 兜底 / `CASE_DETAIL_TAB_ALIASES` 别名映射，并在每个修复点新增或恢复防回归测试。R7 §3 复现脚本 5 处文档漂移（脚本名 / 字段名 / 端点路径 / CSS 类名 / 函数位点）同步修订。
  关键依据：
  - docs/gyoseishoshi_saas_md/_output/14-双层状态机自动化复盘走查Bug清单-第八轮.md（§1 BUG-116/127/128/129 + §2 复现脚本修订）
  - docs/gyoseishoshi_saas_md/_output/13-双层状态机自动化复盘走查Bug清单-第七轮.md（§1 BUG-105 行注脚 → R8 修复）
  - .cursor/plans/r8_双层状态机_p1_修复_47078c80.plan.md（执行计划）

  ### 4 条 P1 修复结论

  | BUG ID | 优先级 | 摘要 | 修复要点 | 防回归测试 |
  |---|---|---|---|---|
  | BUG-116 | P1 | `?tab=timeline` 深链回退 Overview 而非 Log | `constants.ts` 新增 `CASE_DETAIL_TAB_ALIASES = { timeline: 'log' }`；`query.ts` `resolveDetailTab` 先做 alias 命中再走白名单；出口仅产出规范 key（读时容错、写时规范） | `query.cross-module-regression.test.ts`：`resolveDetailTab("timeline") === "log"`、大小写敏感、白名单不退化 |
  | BUG-127 | P1 | 案件列表 owner 列 19/19 行「未指派」，API 已返回 `ownerDisplayName` | `types.ts` `CaseListItem` 追加 `ownerDisplayName?: string`；`CaseAdapterMappers.ts` 双路兼容读取；`CaseTableRow.vue` 优先用后端展示名，缺失时回退 fixture | `CaseTableRow.test.ts`：后端 ownerDisplayName 优先 / 空白视作缺失 / fixture 兜底 / 中英文双语保持原样，共 5 个用例 |
  | BUG-128 | P1 | 案件详情面包屑显示原始 UUID `#df9d1e84-…` | `CaseDetailView.vue:163` 改用 `formatCaseIdentity(detail.caseNo, detail.id)`；`caseNo` 优先，缺失回退 `id` | `CaseDetailView.breadcrumb.test.ts`：caseNo 存在 / caseNo 空白 / caseNo 缺失三路 |
  | BUG-129 | P1 | `/api/timeline` `String(Date)` 序列化，UI 时间戳退化为 `Date.toString()` 长串 | server: `model/timestamps.ts` 抽 `toTimestampStringOrNull` / `requireTimestampString` helper，`timeline.service.ts` + `templates.service.ts` 全部替换 `String(r.created_at)`；admin: `CaseLogTab.vue:128` 恢复 `formatEntryTime` UI 兜底 | `timeline.service.test.ts` + `templates.service.test.ts`：Date→ISO / string→原样 / null→抛错；`CaseLogTab.bug129-regression.test.ts`：`Date.toString()` 格式输入 → 本地化短串输出 |

  ### R7 §3 复现脚本修订（5 处文档漂移）

  | # | R7 原文 | R8 修订 | 修订理由 |
  |---|---|---|---|
  | 1 | `npm run db:migrations:check:db` | `npm run db:migrations:check` | 脚本已合并，原名报 `Missing script` |
  | 2 | 列表行字段 `phase` | `businessPhase` | 字段已改名；query 参数 `?phase=` 仍兼容 |
  | 3 | `/api/cases/:id/timeline` | `/api/timeline?entityType=case&entityId=:id` | 端点路径已变更 |
  | 4 | CSS 类 `case-row__stage-meta` | `case-row__workflow-step` | 类名已重构 |
  | 5 | `CaseLogTab.vue:59-63 formatEntryTime` | 函数已下沉到 `CaseCommsLogsAdapter`，模板用 `entry.time` | 行号/函数名/调用位点都变了，职责仍在 |

  影响面：
  - packages/server/src/modules/core/model/timestamps.ts（新增共享 helper）
  - packages/server/src/modules/core/timeline/timeline.service.ts（BUG-129 server 根因修复）
  - packages/server/src/modules/core/templates/templates.service.ts（BUG-129 同模式扩展修复）
  - packages/admin/src/views/cases/constants.ts（BUG-116 别名表）
  - packages/admin/src/views/cases/query.ts（BUG-116 resolveDetailTab 别名逻辑）
  - packages/admin/src/views/cases/types.ts（BUG-127 ownerDisplayName 字段）
  - packages/admin/src/views/cases/model/CaseAdapterMappers.ts（BUG-127 适配层透传）
  - packages/admin/src/views/cases/components/CaseTableRow.vue（BUG-127 视图层）
  - packages/admin/src/views/cases/CaseDetailView.vue（BUG-128 面包屑）
  - packages/admin/src/views/cases/components/CaseLogTab.vue（BUG-129 admin 兜底）
  回灌计划：
  - 目标文档：docs/gyoseishoshi_saas_md/_output/14-双层状态机自动化复盘走查Bug清单-第八轮.md
    位置：§1 BUG-116/127/128/129 + §2 复现脚本修订 + §4 待立项清单
    Owner：研发
    状态：已回灌（2026-04-30，各条标注「✅ R8 已 land」）
  - 目标文档：docs/gyoseishoshi_saas_md/_output/13-双层状态机自动化复盘走查Bug清单-第七轮.md
    位置：§1 BUG-105 行
    Owner：研发
    状态：已回灌（2026-04-30，保留 ❌ 原判 + 追加注脚指向 R8 BUG-116 修复）

- 时间：2026-04-29
  问题：[BUG-115] 无 case 历史客户的 `base_profile` 缺 `ownerUserId / groupId`，如何回填？是否需要手动补录入口？
  结论（TL;DR）：`034_customer_backfill_profile` 迁移仅能回填有 case 的客户（以最早 case 的 `owner_user_id / group_id` 为源），无 case 的历史客户因无数据来源，设计上无法自动回填——这是预期行为而非 bug。当前 admin UI 已具备手动补录能力（`CustomerBasicInfoTab.vue` 的 group / owner 字段在编辑模式下可修改，通过 `PATCH /api/customers/:id` 持久化），因此无需新建独立的"补全档案"入口。遗留问题：① 无 case 历史客户在列表页展示"无负责人 / 无分组"缺乏引导性提示；② 产品侧需明确是否为此类客户维护"已知缺失"白名单或在列表页增加筛选/批量补录能力。
  关键依据：
  - packages/server/src/infra/db/migrations/034_customer_backfill_profile.up.sql（迁移逻辑：JOIN cases 取最早 case 的 owner_user_id / group_id 写入 customers.base_profile）
  - packages/server/src/modules/core/customers/customers.controller.ts:382-396（PATCH /:id 端点已支持 baseProfile 整体更新）
  - packages/admin/src/views/customers/components/CustomerBasicInfoTab.vue:252-288（group / owner 字段已渲染为可编辑 <select>）
  - packages/admin/src/views/customers/model/useCustomerBasicInfoModel.ts:271-298（save 流程已完整：startEditing → 修改 snapshot → save → PATCH API → refreshCustomer）
  - docs/gyoseishoshi_saas_md/_output/12-双层状态机自动化复盘走查Bug清单-第六轮.md §BUG-115（原始发现：历史 4 条 customer ownerUserId / groupId 全空）
  - docs/gyoseishoshi_saas_md/_output/13-第六轮§7下一轮覆盖走查Bug清单-第七轮.md §0.3（R7 验证：034 已应用并对有 case 客户回填成功；无 case 历史客户仍空）
  - docs/gyoseishoshi_saas_md/P0/02-版本范围与优先级.md §2.12（归属继承链：Lead.group → Customer.group → Case.group）
  - docs/gyoseishoshi_saas_md/P0/03-业务规则与不变量.md §2.2（Case.group 是案件归属快照；Customer.group 后续变更不回写覆盖历史案件）

  现状分析：

  | 维度 | 现状 | 结论 |
  |---|---|---|
  | 自动回填覆盖范围 | `034_customer_backfill_profile` 已覆盖所有有 case 的历史客户 | ✅ 设计完整 |
  | 无 case 客户的 owner/group 来源 | 无数据来源（无 case → 无 owner_user_id / group_id 可推） | ⚠️ 预期行为 |
  | 手动补录 API | `PATCH /api/customers/:id` body `{ baseProfile: { ownerUserId, groupId } }` | ✅ 已可用 |
  | 手动补录 UI | `CustomerBasicInfoTab.vue` 编辑模式下 group / owner 下拉已可修改 | ✅ 已可用 |
  | 列表页缺失提示 | 列表页展示"无负责人 / 无分组"但无引导用户去详情页补录的 CTA | ⚠️ 待产品决策 |
  | 批量补录 | 无批量更新 owner / group 的 UI 或 API | ⚠️ 待产品决策 |

  待产品侧明确的问题（建议单工单跟踪）：

  | ID | 问题 | 影响面 | 建议 |
  |---|---|---|---|
  | Q-115-1 | 无 case 历史客户在列表页是否需要视觉提示（如"档案不完整"标签）引导补录？ | admin 客户列表 UI | 低优先级；当前数量少（4 条），可人工逐一打开详情页编辑 |
  | Q-115-2 | 是否需要维护"已知缺失客户"白名单（标记哪些客户预期无 owner/group）？ | 数据治理策略 | 建议暂不做；当客户量增长后再考虑 |
  | Q-115-3 | 是否需要在客户列表增加"缺 owner/group"筛选条件或批量补录能力？ | admin 客户列表筛选 + 批量操作 | P2 以后；当前 4 条手动补录成本极低 |

  影响面：
  - packages/admin/src/views/customers/（列表页展示、详情页手动编辑）
  - packages/server/src/infra/db/migrations/（034 backfill 迁移已完成）
  - 数据治理策略（无 case 客户的 profile 完整性）
  回灌计划：
  - 目标文档：无需回灌到权威文档（BUG-115 是数据治理层面的跟踪项，不涉及业务规则变更）
    位置：—
    Owner：产品/研发
    状态：不回灌（Q-115-1/2/3 决议后若有新规则再回灌）

- 时间：2026-05-01（BUG-166 FIX-LANDED）
  问题：[BUG-166][P2][BE] R14 §1 — `cases.service.ts#wrapCreateError` 仅识别 PG `23503/23505/23514` 三个约束码，漏掉客户输入类的 `22P02`（invalid_text_representation，含 UUID 解析失败）等错误，导致 admin 提交脏数据（如 `ownerUserId="suzuki"`）时落到 500 路径，破坏 server 错误契约。如何把客户输入类 PG 错误统一收口到 400？
  结论（TL;DR）：BUG-166 ✅ FIX-LANDED。`PG_KNOWN_CONSTRAINTS` 数组下沉为类静态只读 map `PG_CLIENT_ERROR_REASONS`，覆盖 7 个客户输入类 SQLSTATE：`23503/23505/23514/23502`（integrity constraint）+ `22P02/22008/22007`（data exception）。命中即映射为 400 `CASE_CREATE_FAILED`，detail 同时携带 `source/constraint/pgCode/pgMessage`（新增 `pgMessage` 让前端 / 集成方拿到 PG 原始报错文本，便于 BUG-173 后续在 toast 暴露 actionable detail）。message suffix 由原本的 if-ladder 改为 map 查表，覆盖三种新错误类型时不必再扩三元表达式。`bug160-create-error-mapping.focused.test.ts` 扩展 3 个用例（f/g/h 分别覆盖 22P02 / 23502 / 22008），全 8 用例 PASS。
  关键依据：
  - packages/server/src/modules/core/cases/cases.service.ts#PG_CLIENT_ERROR_REASONS（新增静态 SQLSTATE 表，含 7 条客户输入类错误码）
  - packages/server/src/modules/core/cases/cases.service.ts#wrapCreateError（map 查表 + detail.pgMessage 透传）
  - packages/server/src/modules/core/cases/cases.service.bug160-create-error-mapping.focused.test.ts（扩展 BUG-166(f/g/h) 三个用例，覆盖 22P02 uuid 解析失败 / 23502 not null / 22008 datetime overflow，全 8 用例 PASS）
  - docs/gyoseishoshi_saas_md/_output/20-双层状态机自动化复盘走查Bug清单-第十四轮.md §1 BUG-166（原始发现 + 修复方向 + 测试补强建议）
  - docs/gyoseishoshi_saas_md/_output/19-双层状态机自动化复盘走查Bug清单-第十三轮.md §1 BUG-160（同源 fix；R13 仅覆盖 23xxx 三种约束）
  影响面：
  - server `POST /api/cases` 错误契约：UUID 字面量错误（如 admin 提交 catalog slug `suzuki`）现在返 400 而非 500
  - server 错误 detail 结构新增 `pgMessage` 字段（向后兼容，不影响既有 detail.source/constraint/pgCode 消费方）
  - 间接收益：BUG-165（owner UUID 未解析）即便走老路径触发 PG 22P02，也会回到 400 而非 500；BUG-173（toast 无 actionable detail）拿到 detail.pgMessage 后可在前端展示
  - 不影响 BMV 门禁拦截路径（CASE_BMV_GATE_BLOCKED 仍走专属 BadRequest）
  - 不影响业务 HttpException 透传路径（GROUP_NOT_FOUND / OWNER_NOT_FOUND 仍走原通道）
  回灌计划：
  - 目标文档：docs/gyoseishoshi_saas_md/_output/20-双层状态机自动化复盘走查Bug清单-第十四轮.md
    位置：§0.3 BUG-166 行 + §0.4 P2 计数 + §1 BUG-166 详情
    Owner：研发
    状态：已回灌（2026-05-01，BUG-166 标 ✅ FIX-LANDED）

- 时间：2026-05-01（BUG-167~173 全部 FIX-LANDED 批量收口）
  问题：R14 §1 BUG-167~173 共 7 条新增偏差（含 2×P0 + 3×P2 + 2×P3），涉及 admin case detail 三 tab i18n 缺漏（BUG-167/168/169）、建案向导失败 toast 无 actionable detail（BUG-173）、Overview group raw slug（BUG-170）、Reminder dedupe key UUID 直显（BUG-171）、案件列表 Type 列大小写不统一（BUG-172）。
  结论（TL;DR）：7 条全部 ✅ FIX-LANDED（2026-05-01），连同之前已 land 的 BUG-165/166，R14 本轮 9 条新增偏差全部闭环。Guard 全绿：admin 3242 PASS / server integration 28 PASS / 0 FAIL。
  关键依据（commit 清单）：
  - `de68cdf` fix(admin/cases): BUG-167 i18n CaseBillingTab billing labels
  - `c52ced9` fix(admin/cases): BUG-168 i18n CaseValidationSupport pre-submission check tab
  - `dd10526` fix(admin/cases): BUG-169 i18n CaseDocumentsTab empty state + section labels
  - `5c07d65` fix(admin/cases): BUG-170 overview group slug 走 resolveGroupLabel 本地化
  - `1eaf3dd` fix(admin/tasks): BUG-171 mask UUID in reminderMeta dedupeKey display
  - `1adc5b0` fix(admin/cases): BUG-172 caseTypes catalog v1 visa code aliases + en-US Title Case
  - `db99e2c` fix(admin/cases): BUG-173 server detail 透传到建案失败 toast 与 inline error chip
  影响面：
  - admin i18n：三语 catalog 新增约 50 个 key（cases.detail.billing.* / validation.* / documents.*）
  - admin 建案向导：submitError 类型从 string → 结构体 {message, code?, detail?}，影响约 12 处断言（已全部更新）
  - admin CaseOverviewTab：group slug 走 resolveGroupLabel 本地化
  - admin taskWorkbenchViewHelpers：dedupeKey UUID 短哈希化
  - admin cases i18n catalog：v1 visa code 别名补齐 + en-US Title Case 统一
  - admin repositoryRuntime：RepositoryError 新增 detail 字段
  回灌计划：
  - 目标文档：docs/gyoseishoshi_saas_md/_output/20-双层状态机自动化复盘走查Bug清单-第十四轮.md
    位置：§0.3 表（每条行标 ✅ FIX-LANDED）+ §0.4 总计偏差数（全 9 条已闭环）+ §1 各 BUG 段尾部（FIX-LANDED 实测块）+ §4 待立项（全部标 ✅，仅留后续清理项）
    Owner：研发
    状态：已回灌（2026-05-01）

- **2026-05-02 Dashboard Group 全闭环**：后端 `GET /api/dashboard/groups`（viewer 级）+ `scope=group` groupId 透传 + 前端动态 groupOptions 接入完成；`npm run fix && npm run guard` 全通过。计划文档：`dashboard_group_full_loop_c7dcfe19.plan.md`

- 时间：2026-05-02（R22 案件全流程 chrome-devtools-mcp 深度审计 — 15 条 Bug 批量修复 LANDED）
  问题：R22 以 chrome-devtools-mcp 真浏览器深度审计案件全生命周期（创建→受理→阶段切换→任务联动→计费→归档/失败），发现 2 P0 + 4 P1 + 4 P2 + 5 P3 = 15 条 Bug。如何批量修复并确保守门全绿？
  结论（TL;DR）：15/15 条全部 ✅ LANDED（含 R22-B 批 BUG-200 中途撤案路径），`npm run fix` + `npm run guard` 全绿。核心修复：① P0 BUG-191 双层状态机 phase→stage 同步——`executePhaseTransitionUpdate` SQL 扩展 `PHASE_TO_STAGE_DEFAULT` 映射，6 条非终态 phase 的 stage 跟随推进；② P0 BUG-192 PhaseTransitionPopover 选中状态泄漏——watch menuOpen reset selectedPhase/closeReason/validationError；③ P1 BUG-193 案件列表 search 参数——服务端 `ListCasesQuery` 新增 search 字段 + `buildCaseListFilterPrefixed` ILIKE 匹配 case_name/case_no + 全局搜索模块新增；④ P1 BUG-194/195 自动生成资料清单/初始任务——`runCreateTransaction` 末尾调用 resolveChecklistItems + insertInitialTasks；⑤ P1 BUG-196 Billing/Tasks Tab dead button——defineEmits + CaseDetailView 接住事件；⑥ P2 BUG-197/198/199 alert→toast + disabled+tooltip + PhaseTransitionPopover currentPhase 对照；⑦ P2 BUG-200 中途撤案——PHASE_TRANSITIONS 全非终态→CLOSED_FAILED + MANUAL_CANCEL_REASON_CODES 4 码 + PhaseTransitionPopover 预设 chips + 3 server tests + 8 admin tests；⑧ P3 BUG-201/202/203/204/205 titleDirty flag + stage 非法值 toast + Local Admin 跨组豁免 + PaymentModal max + form-field a11y id/name。
  关键依据：
  - docs/gyoseishoshi_saas_md/_output/32-案件全流程chrome-devtools-mcp深度审计-第一轮.md（原始审计清单 + §8 Land 状态表）
  - packages/server/src/modules/core/cases/cases.service.ts（BUG-191 executePhaseTransitionUpdate + BUG-193 buildCaseListFilterPrefixed + BUG-194 resolveChecklistItems + BUG-195 insertInitialTasks）
  - packages/server/src/modules/core/cases/businessPhase.ts（BUG-191 PHASE_TO_STAGE_DEFAULT + BUG-200 PHASE_TRANSITIONS 全非终态→CLOSED_FAILED + MANUAL_CANCEL_REASON_CODES）
  - packages/admin/src/views/cases/components/PhaseTransitionPopover.vue（BUG-192 watch reset + BUG-199 currentPhase 对照 + BUG-200 cancelReasonPresets chips）
  - packages/admin/src/views/cases/components/CaseBillingTab.vue（BUG-196 defineEmits）
  - packages/admin/src/views/cases/components/CaseTasksTab.vue（BUG-196 defineEmits）
  - packages/admin/src/views/cases/CaseDetailView.vue（BUG-196 事件接收 + BUG-197 alert→toast）
  - packages/admin/src/views/cases/model/useCreateCaseModel.ts（BUG-201 titleDirty + BUG-203 Local Admin 豁免）
  - packages/admin/src/views/cases/model/useCaseListModel.ts（BUG-202 isValidStageId + toast）
  - packages/admin/src/views/billing/components/PaymentModal.vue（BUG-204 max + BUG-205 id/name）
  影响面：
  - server 案件状态机：phase→stage 同步闭环，6 条非终态 phase 的 stage 正确跟随
  - server 案件搜索：search 参数前后端协议对齐，ILIKE 匹配 case_name/case_no
  - server 案件创建：自动生成资料清单 + 初始任务，建案自动化主路径恢复
  - admin 案件详情页：Billing/Tasks Tab 按钮可交互、Export ZIP 用 toast、Validation Tab 按钮 disabled+tooltip
  - admin PhaseTransitionPopover：无 stale-submit 风险、当前→目标对照
  - admin 建案向导：Step1 标题 dirty flag 保护、Local Admin 跨组豁免、stage 非法值友好 toast
  - admin PaymentModal：金额 max 正确、form-field a11y 补齐
  回灌计划：
  - 目标文档：docs/gyoseishoshi_saas_md/_output/32-案件全流程chrome-devtools-mcp深度审计-第一轮.md
    位置：§8 Land 状态表（新增）
    Owner：研发
    状态：已回灌（2026-05-02）
  - 目标文档：docs/gyoseishoshi_saas_md/P0/03-业务规则与不变量.md
    位置：§3.0F 状态机冻结声明（追加 PHASE_TO_STAGE_DEFAULT 映射表 + phase→stage 同步规则）
    Owner：研发
    状态：待回灌（下一轮优先）
  - 目标文档：docs/gyoseishoshi_saas_md/_raw/00-inbox.md
    位置：BUG-200 PM 决策项
    Owner：产品
    状态：已落地（PM 拍板"是"，BUG-200 ✅ LANDED）

- 时间：2026-05-02（BUG-200 FIX-LANDED — R22-B 批中途撤案路径）
  问题：[BUG-200] R22 P2——案件中途撤案路径缺失。`PHASE_TRANSITIONS` 仅允许 REJECTED / VISA_REJECTED → CLOSED_FAILED，不支持任意非终态 phase 走中途撤案。行政书士业务现实是客户中途撤案/失联/改委托是高频场景。
  结论（TL;DR）：BUG-200 ✅ FIX-LANDED。PM 拍板"是"后实施 4 处改动：① `businessPhase.ts` `PHASE_TRANSITIONS` 给 12 个非终态 phase（CONSULTING~VISA_APPLYING，不含 APPROVED 以后的成功链路）追加 `CLOSED_FAILED` 出边；新增 `MANUAL_CANCEL_REASON_CODES = ["MID_CASE_WITHDRAWAL","CLIENT_LOST_CONTACT","SWITCHED_TO_OTHER_FIRM","OTHER"]`；② `PhaseTransitionPopover.vue` 在 `needsCloseReason` 块新增 4 个 preset chips，chip 点击写入 `closeReason.value`；选 OTHER 时要求文本输入非空；watch menuOpen 时 reset selectedPreset；③ i18n `{zh-CN,ja-JP,en-US}/cases.ts` 追加 `cancelReasonPresets` 4 码三语翻译；④ `cases.service.ts` `assertCloseReasonForFailedPhase` 已有基建（R22 原 REJECTED/VISA_REJECTED 路径），新增的 12 条出边自动命中。测试：`cases.bug200-mid-cancel.focused.test.ts`（3 tests：缺 closeReason → 400 / 带 closeReason → stage=S9,phase=CLOSED_FAILED,result_outcome='failure' / timeline payload 正确）+ `PhaseTransitionPopover.bug200.test.ts`（8 tests：4 preset 各自 payload / OTHER 空文本阻拦 / OTHER 自由文本 / 切换 preset / 选 preset 清 validation error / 非 CLOSED_FAILED 不含 closeReason）。Guard 全绿。
  关键依据：
  - packages/server/src/modules/core/cases/businessPhase.ts（PHASE_TRANSITIONS 12 条非终态→CLOSED_FAILED + MANUAL_CANCEL_REASON_CODES 4 码）
  - packages/server/src/modules/core/cases/cases.service.ts（assertCloseReasonForFailedPhase 门禁）
  - packages/server/src/modules/core/cases/cases.bug200-mid-cancel.focused.test.ts（3 tests）
  - packages/admin/src/views/cases/components/PhaseTransitionPopover.vue（cancelReasonPresets chips + selectedPreset + watch reset）
  - packages/admin/src/views/cases/components/PhaseTransitionPopover.bug200.test.ts（8 tests）
  - packages/admin/src/i18n/messages/cases/{zh-CN,ja-JP,en-US}.ts（cancelReasonPresets 三语）
  - docs/gyoseishoshi_saas_md/_output/32-案件全流程chrome-devtools-mcp深度审计-第一轮.md §8 BUG-200（✅ LANDED）
  影响面：
  - server 案件状态机：全非终态 phase 可走 → CLOSED_FAILED（带 closeReason 必填门禁）
  - admin PhaseTransitionPopover：CLOSED_FAILED 选中后显示预设撤案原因 chips + OTHER 自由文本
  - admin i18n：三语 cancelReasonPresets 4 码
  - 不影响成功链路（APPROVED → WAITING_PAYMENT → COE_SENT → ...）：成功链路不追加 CLOSED_FAILED 出边
  回灌计划：
  - 目标文档：docs/gyoseishoshi_saas_md/_output/32-案件全流程chrome-devtools-mcp深度审计-第一轮.md
    位置：§8 BUG-200 行（📌 DEFERRED → ✅ LANDED）+ §8.1 统计（15/15）+ §8.2 R23 结果（含 BUG-200）
    Owner：研发
    状态：已回灌（2026-05-02）
  - 目标文档：docs/gyoseishoshi_saas_md/_output/33-案件全流程chrome-devtools-mcp深度审计-第二轮.md
    位置：§0.2 BUG-200 行追加（✅ PASS）+ §0.3 统计更新（14 PASS / 0 DEFERRED）+ §1 BUG-200 走查详情追加 + §4 遗留建议更新
    Owner：研发
    状态：已回灌（2026-05-02）

- 时间：2026-05-02（R24 案件全流程 chrome-devtools-mcp 深度审计第三轮 — 7 条 Bug 批量修复 LANDED）
  问题：R24 以 chrome-devtools-mcp 真浏览器深度审计发现 1 P0 + 1 P1 + 1 P2 + 3 P3 共 6 条新 Bug（含证伪 R23 BUG-200 ✅ PASS），另有 BUG-194 dev DB 模板种子补齐。如何批量修复并确保守门全绿？
  结论（TL;DR）：7/7 条全部 ✅ LANDED。核心修复：① **P0 BUG-208** admin↔server `PHASE_TRANSITIONS` 失同步——三层防御：抽 admin SSoT 文件 `businessPhaseTransitions.ts` 逐字镜像 server 表（含 11 条 CLOSED_FAILED 出边）、跨包一致性测试 `businessPhase.admin-consistency.test.ts`（`expect(admin).toEqual(server)` 深度比较）、popover 单测真实化（驱动 `useCasePhaseTransitionMenu` 真实查询 transition map，不再注入 `availableTargets`）+ 全 phase 矩阵断言 `useCasePhaseTransitionMenu.transitions.test.ts`；② **P1 BUG-207** phase→stage 历史脏数据回填——migration `042_phase_stage_consistency_backfill` 按 `PHASE_TO_STAGE_DEFAULT` 全量一致性回填 + focused test 9 条脏数据归位 + 幂等断言；③ **P2 BUG-209** phase 流转 server error code 三语 i18n——`extractErrorCode` + `t()` fallback + 9 错误码三语 key + 单测覆盖；④ **P3 BUG-206** 多页 form 字段补 `id/name`——Cases/Customers/Documents/Leads/Settings 6 类页面一次性补齐 + a11y audit test；⑤ **P3 BUG-210** Leads 空列表分页文案——`total===0` 分支 + 三语 empty key + 单测；⑥ **P3 BUG-211** 日语 `校験` → `検証` 4 处替换统一；⑦ **BUG-194** dev DB seed 补经営管理認定 4 個月 `document_checklist` 模板。
  关键依据：
  - docs/gyoseishoshi_saas_md/_output/34-案件全流程chrome-devtools-mcp深度审計-第三轮.md（R24 完整审计报告 §7 落库建议）
  - packages/admin/src/views/cases/model/businessPhaseTransitions.ts（BUG-208 admin SSoT，镜像 server PHASE_TRANSITIONS）
  - packages/server/src/modules/core/cases/businessPhase.admin-consistency.test.ts（BUG-208 跨包一致性守门）
  - packages/admin/src/views/cases/model/useCasePhaseTransitionMenu.transitions.test.ts（BUG-208 全 phase 矩阵断言）
  - packages/admin/src/views/cases/components/PhaseTransitionPopover.bug200.test.ts（BUG-208 popover 单测真实化）
  - packages/server/src/infra/db/migrations/042_phase_stage_consistency_backfill.up.sql（BUG-207 回填 migration）
  - packages/server/src/modules/core/cases/cases.bug207-phase-stage-backfill.focused.test.ts（BUG-207 focused test）
  - packages/admin/src/views/cases/model/useCasePhaseTransitionMenu.error-i18n.test.ts（BUG-209 错误码 i18n 测试）
  - packages/admin/src/views/cases/components/PhaseTransitionPopover.vue（BUG-209 i18n template）
  - packages/admin/src/i18n/messages/cases/{zh-CN,en-US,ja-JP}.ts（BUG-209 error i18n + BUG-211 校験→検証）
  - packages/admin/src/views/__a11y__/form-field-id-name.audit.test.ts（BUG-206 a11y audit）
  - packages/admin/src/views/leads/components/LeadPagination.vue（BUG-210）
  - packages/admin/src/views/leads/components/LeadPagination.bug210.test.ts（BUG-210 单测）
  - packages/server/src/scripts/seedDevData.ts（BUG-194 dev DB seed 模板补齐）
  影响面：
  - server 案件状态机：admin↔server PHASE_TRANSITIONS 一致性有跨包测试守门，任一边 drift 即 red
  - server 案件 DB：历史 9 条 phase→stage 脏数据通过 migration 042 回填归位
  - admin PhaseTransitionPopover：11 个非终态 phase 均可在 UI 上触发 → CLOSED_FAILED（R22 BUG-200 中途撤案路径真正可用）
  - admin phase 流转 error：error banner 显示三语本地化文案而非 raw ALL_CAPS server code
  - admin 全站 a11y：Cases/Customers/Documents/Leads/Settings 全部 form 控件补齐 `id`/`name`
  - admin Leads 分页：0 条时显示"暂无数据"
  - admin ja-JP：`校験` 统一为 `検証`
  - dev DB seed：经営管理認定 4 個月 `document_checklist` 模板已补，BUG-194 从 CONDITIONAL 升级为 LANDED
  回灌计划：
  - 目标文档：docs/gyoseishoshi_saas_md/_output/34-案件全流程chrome-devtools-mcp深度審計-第三轮.md
    位置：§7 落库建议每条尾部（追加 ✅ LANDED 标记）
    Owner：研发
    状态：已回灌（2026-05-02）

- 时间：2026-05-07（R-FLOW-01 咨询→客户→案件全链路第一轮走查修复计划 — 4 PR 批量修复规划）
  问题：R-FLOW-01 以 chrome-devtools-mcp 端到端走查发现 8 条缺陷（D-1/D-2/B-1/E-1/C-1/F-1/G-1/G-2/A-1/H-1），覆盖 convert 链 UI 死结、case_templates 未消费、BMV 门禁错扩、案件名称缺失、owner picker 硬编码、列表与日志不一致。如何系统性修复并保证 P0 主链路端到端可作业？
  结论（TL;DR）：拆 4 个 PR 分批修复，PR1+PR2 联合解锁主链路。关键决策：① `case_templates.requirement_blueprint` 设为建案资料清单唯一真源（ADR 已记录），旧 `template_versions` 仅作 BMV 兼容回退、下一迭代清理；② convert adapt 新增专用 `adaptLeadConvertCustomerResult` / `adaptLeadConvertCaseResult`，解除 `adaptLeadMutationResult` 对嵌套响应的误判；③ BMV 门禁解耦——仅 `visaType=business_manager` 或 `questionnaireStatus !== not_started` 的客户才受 BMV 闸口约束；④ owner picker 从静态 `OWNER_CATALOG` 切换到 `getActiveUserOptions()`。
  关键依据：
  - docs/gyoseishoshi_saas_md/_output/62-咨询客户案件全链路chrome-devtools-mcp走查-第一轮.md（R-FLOW-01 完整走查报告）
  - docs/gyoseishoshi_saas_md/_output/ADR-case-templates-as-checklist-ssot.md（case_templates 替代 template_versions 决策）
  - .cursor/plans/咨询客户案件全链路-第一轮修复_091853f3.plan.md（4 PR 分批修复计划）
  - packages/server/src/modules/core/cases/cases.template.repository.ts（case_templates 查询仓储）
  - packages/server/src/scripts/seedCaseTemplates.ts（family-stay + work 种子）
  - packages/admin/src/views/leads/model/LeadAdapterConvertMappers.ts（convert 专用 adapter）
  - packages/admin/src/views/cases/model/useCaseDocumentsTab.ts（viewState 四态）
  影响面：
  - PR1：convert 链 UI 死结修复——D-1 嵌套响应适配 / D-2 失败后刷新兜底 / B-1 banner 按钮状态同源
  - PR2：case_templates 作为资料清单真源——建案展开 document_items 从 requirement_blueprint 读取 + 资料 Tab 噪声分级为 4 态
  - PR3：客户详情 BMV 门禁解耦 / 案件名称 fallback / owner picker 真用户
  - PR4：leads 列表 source 字段 i18n 对齐 / 日志 conversion 分类 + 链接渲染
  - BMV 旧路径完全保留，下一迭代再迁移
  回灌计划：
  - 目标文档：docs/gyoseishoshi_saas_md/_output/62-咨询客户案件全链路chrome-devtools-mcp走查-第一轮.md
    位置：尾部追加「修复状态」章节（4 PR 各标注 LANDED / IN_PROGRESS）
    Owner：研发
    状态：待回灌（PR 合并后逐条标记）

- 时间：2026-05-08（案件走查 V4 §5.2 P2-UX 双项优化 — 概览时间线同日同事件折叠 + lastTime 精度统一）
  问题：V4 走查发现两项 P2 UX 问题：① 案件概览「近期动态」同日同类条目密度过高（同事件多次触发全量渲染）；② 提交前检查时间戳仅显示日期，同日多 run 无法区分。如何降低信息噪声并统一时间精度？
  结论（TL;DR）：合并为一个 PR「时间相关 UX 微调」。核心改动：① **NEW-V4-1** `CaseCommsLogsAdapter.buildOverviewTimelineFromLog` 新增同日同 text 同 track 桶合并逻辑——桶 key = `day|text|track|stableStringify(textParams)`，合并后附 `mergedCount` / `mergedEarliestIso` / `mergedLatestIso`；view 层 `CaseOverviewTimeline.vue` 在 chip 区渲染「× N 次（最早 HH:mm · 最近 HH:mm）」；② **NEW-V4-2** `CaseAdapterValidationBilling` 新增 `lastTimeIso` 字段透出原始 ISO，view 层 `CaseValidationTab.vue` 用 `formatDateTime(lastTimeIso, locale)` 渲染完整时分，缺失时回退 `lastTime` 原文；③ 新增 `formatTimeOnly` 小工具（`Intl.DateTimeFormat` 输出 `HH:mm`）；④ 三语 i18n key `cases.detail.overview.timeline.mergedSummary`。
  关键依据：
  - docs/gyoseishoshi_saas_md/_output/73-MCP-case-walkthrough-2026-05-08-v4.md §2.2（NEW-V4-1 / NEW-V4-2 原始发现）
  - packages/admin/src/views/cases/model/CaseCommsLogsAdapter.ts（桶合并逻辑）
  - packages/admin/src/views/cases/model/CaseAdapterValidationBilling.ts（lastTimeIso 字段）
  - packages/admin/src/views/cases/model/CaseAdapterDetailAggregate.ts（lastTimeIso 透出）
  - packages/admin/src/views/cases/types-detail.ts（TimelineEntry + ValidationData 类型扩展）
  - packages/admin/src/shared/model/formatTimeOnly.ts（HH:mm 格式化工具）
  - packages/admin/src/views/cases/components/CaseOverviewTimeline.vue（merged-chip 渲染）
  - packages/admin/src/views/cases/components/CaseValidationTab.vue（lastTimeIso 优先渲染）
  - packages/admin/src/i18n/messages/cases/{zh-CN,ja-JP,en-US}.ts（mergedSummary 三语 key）
  影响面：
  - 案件概览「近期动态」：同日同类事件合并展示，降低信息密度；单条不受影响
  - 提交前检查 Tab：时间戳从 YYYY/MM/DD 升级为 YYYY/MM/DD HH:mm，同日多 run 可区分
  - TimelineEntry 类型扩展为可选字段，向后兼容旧 view 路径
  - lastTimeIso 缺失时自动回退 lastTime 原文，不会出现空白
  回灌计划：
  - 目标文档：docs/gyoseishoshi_saas_md/_output/73-MCP-case-walkthrough-2026-05-08-v4.md
    位置：§5.2 已标注 → CLOSED
    Owner：研发
    状态：已回灌（2026-05-08）

- 时间：2026-05-08（walkthrough-v6 Phase B-3 — caseTypeCode canonical 决策显式延期）
  问题：LEAD intendedCaseType ↔ CASE caseTypeCode ↔ CUSTOMER visaType 三字段的 canonical 集合与映射关系未有权威业务口径定义；i18n 中 `work` 与 `engineer_humanities_intl_visa` 的语义粒度关系不明；历史别名（`biz_mgmt*`、`hum*`、`family_stay` 等）是否需要迁移尚未决定。
  结论（TL;DR）：**本轮显式延期（BLOCKED on mempalace）。** 理由：字段归属、枚举集合属业务范围，依 core-operating-rule §Task Routing 必须先走 mempalace 门禁获取权威口径，门禁不可用时不得输出确定性代码变更。已完成 B-1 audit（76-AUDIT 文档）和 B-2 seed 补漏（contract test 守护），B-3 canonical 决策 / i18n 对齐 / 历史数据迁移留 TODO。
  关键依据：
  - docs/gyoseishoshi_saas_md/_output/76-AUDIT-caseType-codes-2026-05-08.md（全量分布审计 + TODO 区块）
  - .cursor/rules/core-operating-rule.mdc §Task Routing（门禁规则）
  - packages/admin/src/i18n/messages/_shared/businessTypes.ts（BUSINESS_TYPE_TO_CASE_TYPE_CODE 映射）
  - packages/server/src/scripts/seedDevDocTemplates.contract.test.ts（B-2 contract test 守护）
  影响面：
  - 不改 i18n label / 不合并 caseTypeCode code / 不调整 BUSINESS_TYPE_TO_CASE_TYPE_CODE
  - B-2 contract test 已确保新增 LEAD 业务类型时立即报错防止再次遗漏
  - mempalace 恢复后执行 76-AUDIT TODO 区块 7 项待决事宜
  回灌计划：
  - 目标文档：docs/gyoseishoshi_saas_md/_output/76-AUDIT-caseType-codes-2026-05-08.md
    位置：末尾 TODO 区块
    Owner：研发
    状态：待 mempalace 恢复后回灌
