# 00 Inbox（原始输入，Append-only）

> 这里用于收集原始材料与碎片信息：会议纪要、讨论结论、需求变更点、外部链接要点、待核实假设。
> 规则：只追加，不重写；任何内容都允许先放进来，后续再“编译”进权威文档。

---

## 追加格式（每条一段）

```text
- 时间：YYYY-MM-DD
  来源：{会议/IM/PRD/链接/口头}
  主题：{一句话}
  要点：
  - ...
  - ...
  需要编译到：
  - {建议目标文档名/章节}
  Owner：{负责人}
  状态：待编译 / 已编译 / 废弃
```

---

## 最新追加

- 时间：2026-05-09
  来源：D3 文档行政書士实务对照评审会话（user 指示「按行政書士市面正常流程评审 + 优化」）
  主题：80/81/82 三份 D3 文档系统性评审 + 直接落地修改（22 条评审 / P0×8 / P1×9 / P2×5）
  要点：
  - 评审基准：行政書士法 §1-2 §9 §10、行政書士法施行規則 §11（職印）、入管法、個人情報保護法、一般社団法人 日本行政書士会連合会 業務指針、入管局ガイドブック、申請取次行政書士業務マニュアル、同业 SaaS（freee 行政書士 / legalon / cloud-sign）实践参照
  - 评审维度（7 项）：業務範囲 / 文書類型 / 法規遵守 / 業務帳簿 / 入管実務 / PII 保護 / 責任分担
  - **P0 必改 8 条**（已落地）：
    - P0-1 申請書 PDF（入管定式）必須明確不在 D3 范围 → P3 单独 RFC（pdf-lib + AcroForm）
    - P0-2 委任状 = 每案必备，加入 common caseType 必备模板矩阵
    - P0-3 在留カード氏名・英文表記の欠落 → customer 字段族扩展 4 字段
    - P0-4 中国系客户 nationality 細分（CN/TW/HK/MO 4 区分）+ 漢字处理（日漢字統一）
    - P0-5 申請理由書叙述性内容 → 新增 narrative.* 字段族
    - P0-6 行政書士印影 = 法律要求（行政書士法施行規則 §11）
    - P0-7 模板法律责任分担 = 事務所行政書士本人最终责任 + ToS 第 X 条
    - P0-8 PII 字段级权限分类（HIGH/MEDIUM/LOW + can_view_high_pii）
  - **P1 强建议 9 条**（已落地）：
    - P1-1 客户確認 = 案件 phase（不是 generated_document state）— 流程图说明
    - P1-2 supporter.statusOfResidence 必填（applicableWhen 在日 supporter 时）
    - P1-3 翻訳証明 = P2 单独 RFC，doc_type 命名空间预留
    - P1-4 業務帳簿保管 2 年（行政書士法 §9）+ retention_policy 字段
    - P1-5 入管法令版本字段（references_law_version）
    - P1-6 報酬請求書 / 領収書 = P2 单独 RFC（インボイス制度対応）
    - P1-7 案件日期三者：作成日 / 申請日 / 提出日
    - P1-8 同意書 / 誓約書 / 念書 加入 common 必备模板矩阵
    - P1-9 会社設立 / 許認可 / 相続 = P2 caseType 扩展时各加 1 份代表模板
  - **P2 deferred 5 条**：印影 PNG 嵌入 / 多语种自动翻译 / 申請書 PDF AcroForm（P3）/ OCR + 翻訳証明 / 業務帳簿自動生成
  - **必备模板矩阵从 7 份扩到 11 份**：common 三件套（委任状 / 個人情報取扱同意書 / 申請内容真実性誓約書）+ caseType-specific 8 份
  - **审核维度扩到 8 项**：法律合规 / 文書格式 / **印影占位** / 占位完备 / schema 合理 / 三语兼容 / 政治敏感 / **条文版本追跡**
  - **Schema 章节重排**：81 §2 拆为 §2.1-2.7（氏名族 / 個人基本属性 / 国籍编码 / 在留情報 / 連絡先住所 / 委任関係 / applicableWhen 示例）；新增 §11 narrative / §14 PII 分级
  - **新文档 83**：完整评审记录 22 条 + 已落地修改清单 + deferred 区 + 评审会建议讨论顺序
  - **三份原文同步打 v1.1 评审标记**：80 §2.3 / §4.6 / §11；81 §2.1-2.7 / §3.2-3.3 / §4 / §11 / §14；82 §1.3 / §3.1 / §4.1 / §4.1.1 / §8.3 / §10
  需要编译到：
  - 03-业务规则与不变量.md（新增 4 条不变量：印影法律要求 / 業務帳簿保管 2 年 / PII 字段级权限 / 文書最终责任在事務所行政書士本人）
  - 04-核心流程与状态流转.md §文書生成（客户確認 phase + 修正循环 → 新 versionNo 模式）
  - 06-页面规格/案件详情-文书Tab.md（narrative 入力 UI / 缺 disclaimer 同意时 finalize 拒否）
  - 06-页面规格/系统设置-事務所基本情報.md（印影位置占位提示 / disclaimer 同意 UI）
  - 06-页面规格/系统设置-成员与角色管理.md（can_view_high_pii 角色权限）
  - 07-数据模型.md（generated_documents.narrative_payload + retention_policy；document_templates.references_law_version + default_retention_policy；users.can_view_high_pii；audit_logs.accessed_fields + disclaimer_acknowledged）
  - 利用規約 / ToS（第 X 条「文書テンプレート機能の利用」）
  - 99-文档维护与版本记录.md（新增「行政書士实务对照评审 v1」章节）
  Owner：研发 / 产品 / 法务（评审）
  状态：已落地修改 → 评审会通过后回灌权威文档

- 时间：2026-05-09
  来源：D3 渲染管线设计会话（user feedback「文書都是空白的」+ AI 业务级分析）
  主题：文書真实化渲染管线 D3 阶段三层设计（L1 模板资产 / L2 变量上下文 / L3 渲染管线）+ 治理规约
  要点：
  - **症状定性**：D2 阶段 export 链路虽已通（队列 + handler + 状态机 + 前端轮询），但 `generatedDocExportHandler.ts:156-194` `renderDocument` 是占位 stub（`buildMinimalPdf` / `buildMinimalDocx` 只画一行标题），`templateId` / 案件 / 客户 / 事务所数据全部未读；所有用户、所有 caseType 拿到的都是空白文書 → 业务上等价于功能不可用。
  - **业务三层定位**（不是只解决渲染那一层）：
    - **L1 模板资产**：`document_templates.content_body` 默认空字符串（迁移 048）+ `variables_schema` 默认 `'{}'`，模板内容 + 变量字典都是空——P1 必须由平台运营预置 7–8 份官方 DOCX 模板（dependent_visa / work / business_manager 三个 canonical caseType 全覆盖），存 storage（`template_storage_key`），不再使用 `content_body`。
    - **L2 变量上下文**：定义「文書生成上下文 schema v1」作为模板与数据之间的单一合同（customer / case / supporter / documents / org / today 六大块），运行时由 mapper 从 customers.base_profile / cases.metadata / case_relations / organization_settings 抽取；缺 required 字段 → preflight 失败 → 拒绝定稿/拒绝渲染（业务硬规则：行政書士行业容错极低，不允许打 `——` 占位继续）。
    - **L3 渲染管线**：handler 内 `loadTemplate → buildContext → preflight → fillDocx (docx-templates) → upload`；`generated_documents` 新增 `export_failure_reason` + `fill_rate` 列；finalize 同步执行 preflight，失败前移到「按定稿之前」就报缺失字段，UX 大幅好转。
  - **关键业务决策（5 项）**：
    - B1 = P1 仅 DOCX，PDF 走 P2（行政書士工作流以 docx 为主，用户 Word 内自行另存 PDF）
    - B2 = preflight 缺失字段 → 拦截定稿（不允许 `——` 占位）
    - B3 = P1 不开放事务所自定义模板上传（先把官方 7–8 份打磨稳）
    - B4 = 资料附件不内嵌主文書（主文书 + 资料 ZIP 分开）
    - B5 = 模板生命周期 = 平台运营 + 法务季度复核
  - **可观测性**：`generated_documents.fill_rate`（填充率 = 实填字段数 / required+applicable optional 字段数）入库；运营看板 P50/P95，< 95% 告警；按 caseType / templateId 分组定位「哪份模板字段最常缺」。
  - **灰度与退役**：feature flag `GD_RENDER_PIPELINE_V3`；`document_templates.publish_state` 状态机（draft → review → published → deprecated）+ `rollout_org_ids` 控制；published 不可编辑，改内容必升 versionNo；deprecated 模板不可被新案件选用，但旧案件已快照的 versionNo 仍可重新渲染。
  - **CI 强制 contract test 三件**：(a) 必备模板矩阵覆盖率（每 canonical caseType 至少 N 份 published）；(b) 模板 docx 占位 ⊆ variables_schema 字段；(c) schema 字段 ⊆ Context Schema v1 字典定义。
  - **产出文档（已落地到 _output/）**：80（D3 RFC）/ 81（Context Schema v1）/ 82（模板治理规约）。
  - **不做范围明确**：PDF 直出 / 自定义模板 / 印影 PNG / 多语种 / 在线模板编辑器 → 全部 P2 单独 RFC。
  需要编译到：
  - 03-业务规则与不变量.md（新增「文書生成 preflight = 定稿门禁」不变量；新增「published 模板不可编辑」不变量）
  - 04-核心流程与状态流转.md §文書生成（draft → final 加 preflight gate；export 失败时 export_failure_reason）
  - 06-页面规格/案件详情-文书Tab.md（export_failed 行展开 missing 清单 + 跳转链接；finalize 模态框预览变量）
  - 06-页面规格/系统设置-事务所基本情報.md（首次使用 D3 必须补全 gyoseishoshi_name / license_no / office_address_jp / office_phone）
  - 07-数据模型.md（generated_documents 新增 export_failure_reason / fill_rate；document_templates 新增 template_storage_key / publish_state / rollout_org_ids）
  - 99-文档维护与版本记录.md（新增「文書 Context Schema 维护流程」章节，引用 81 / 82）
  Owner：研发 / 产品 / 法务（评审）
  状态：待编译 → 评审通过后回灌

- 时间：2026-05-07
  来源：R-SETTINGS-01 chrome-devtools-mcp 走查第一轮（系统设置 - 成员与角色管理）
  主题：成员管理 + 角色管理两 tab 列表初次加载即不可用（13 条缺陷 / 2 P0 / 2 P1 / 4 P2 / 5 P3）
  要点：
  - **R6-M-1 [P0]**：`GET /api/users` server 返回精简 DTO `{id, displayName, role, roleId, status}`，缺 `email/createdAt/disabledAt`；client `packages/admin/src/views/settings/model/UsersAdminRepository.ts:187` `adaptMemberItem` 强校验 `typeof v.email !== "string"` → return null，所有 6 条 seed 成员被过滤；UI 永远「暂无成员」，停用/启用/重置密码/变更角色/个性化权限五个行 action 全部不可达。修复方向：server list endpoint 与 detail 对齐返回完整 `UserListItemDto`（建议）或 client 放宽 email 为 optional（绕过 P0）。
  - **R6-R-1 [P0]**：`GET /api/admin/roles` server 返回 `{ items: [...] }` 包装，client `packages/admin/src/views/settings/model/RolesAdminRepository.ts:45` `doListRoles` 期望裸数组，`if (!Array.isArray(body)) throw new Error("Invalid roles list response")`；UI 永远显示红色 alert + 「暂无角色定义」，4 个系统角色 + 任何自定义角色都看不见，删除/编辑权限矩阵/复制角色三个行 action 全部不可达；`POST /api/admin/roles/:id/permissions` 写入成功但 UI 永远看不到结果。修复：client 兼容 `{ items }` 与裸数组两种形态。
  - **R6-R-2 [P1]**：编辑角色名称 `PATCH /admin/roles/:id` 200 → `rolesPage.selectedRole` 被 server payload 重新赋值 → `RoleDetailPanel.vue` 内 `watch(() => props.role)` 触发 → `localPermissions` 被 server permissions 重置，**用户在保存名称前手动勾的权限静默被丢弃**。修复：watcher 引入 `permissionsDirty` 标记跳过 server overwrite。
  - **R6-M-2 [P1]**：`packages/admin/src/views/settings/components/MemberCreateModal.vue:28` / `MemberRoleModal.vue:31` 都硬编码 `const ALL_ROLES = ["staff", "viewer", "manager", "owner"]`，无法分配自定义角色 → 打破角色管理存在的意义。修复：从 `useRolesPage().items` 注入 prop。
  - **R6-M-3 / R6-M-4 / R6-M-5 / R6-R-3 [P2 ×4]**：`MemberRoleModal.actorRole` prop 从未传入 → fallback owner、`@open-overrides` payload 没 `roleId` → 个性化权限抽屉「来自角色」列全空、`USER_DUPLICATE_EMAIL` / `ROLE_DUPLICATE_CODE` server 原始错误码直接渲染。
  - **R6-M-6 / R6-M-7 / R6-N-1 / R6-A-1 / R6-N-2 [P3 ×5]**：停用无 confirm dialog、创建失败后 form 仍 reset、子导航不写回 URL hash、复制角色 dialog aria-label 与 heading 不一致、Toast titleKey/descriptionKey 初始空字符串触发 8 条 i18n empty key warning。
  - 命题：两条 P0 都是「server DTO 与 client adapter 契约错位」——R6-M-1 是 list / detail DTO 形状不一致，R6-R-1 是 list / detail 包装方式不一致；与 R-CONSULT-05 R5-G-1 / R5-D-1 同病。建议下一轮 R-SETTINGS 修复时把 settings 模块 server `users.types.ts` / `rolesAdmin.types.ts` ↔ client `UsersAdminRepository.ts` / `RolesAdminRepository.ts` 字段映射提到 ts / zod 共享单一数据源，并补 contract test 显式覆盖 list / detail 两形状。
  需要编译到：
  - 06-页面规格/系统设置.md §3 / §4（实现状态対照表更新两条 P0 阻断点；列表视图当前不可用）
  - 03-业务规则与不变量.md §1.4（角色与权限模型：补「角色 dropdown 必须从角色列表派生，不得硬编码」约束）
  - R-SETTINGS-02 修复 PR 计划（拆 P0 → P1 → P2/P3 三批 PR）
  Owner：研发
  状态：待编译

---

- 时间：2026-05-07
  来源：R-CONSULT-05 chrome-devtools-mcp 走查第五轮
  主题：R5 新发现 4 条阻断/严重缺陷（2 P1 + 2 P2）
  要点：
  - **R5-G-1 [P1]**：`packages/server/src/modules/core/conversations/conversations.admin.types.ts:47,50` 的 `CONV_LIST_JOIN_COLS` / `CONV_LIST_JOINS` 引用 `lm.sender_role`，但 PG `messages` 表实际列为 `sender_type`。`GET /admin/conversations` 列表 + `?leadId=` 同时 500，阻断会话列表 + lead 详情会话 Tab。修复：rename SQL 列 + 类型字段 + 1 条 e2e 单测覆盖真实 SQL。
  - **R5-D-1 [P1]**：`packages/admin/src/views/conversations/model/ConversationAdapterMappers.ts:175,179` `mapMessage` 读 `content/translatedContent`，server 返回 `originalText/translatedTextJa|Zh|En`。所有 message bubble 正文为空（仅显示「翻译中…」），即使 R4-D-1 把 messages 写到 state 也视觉等于没修。修复：mapper 改读 server 字段 + 按 `preferredLanguage` 选 translated 字段 + 单测。
  - **R5-D-2 [P2]**：lead 详情 → 「签约并开始建档」点击 → client `useLeadDetailModel.convertCase` auto-chain 在 `convert-customer 400 already converted` 时把错误冒泡为通用 toast，而非识别为 *预期分支* 跳过、继续 `convert-case`。结果 4 条 BMV blockers 的 `code: CASE_BMV_GATE_BLOCKED` 始终到不了 dialog。修复：server `convertCustomer` 加 `code: CUSTOMER_ALREADY_CONVERTED`；client auto-chain skip already-converted；`LeadConvertCaseDialog` 渲染 `BmvGateBlockerList`。
  - **R5-E-1 [P2]**：reassign / convert-case dialog / leads 列表批量操作工具栏三处 owner picker 都 fallback 到 `[currentOwner]` 单元素列表（dropdown 仅 1 个选项 `Local Admin`），与同页面 lead 列表筛选 dropdown 显示 7 人不一致。三处统一未走 `useOwnerOptions`。修复：三处统一切换到 `useOwnerOptions()` + 三条单测。与 R4-D-3 同源扩面。
  - 另：R5-A-1 / R5-A-2 / R5-A-3 / R5-A-4 / R5-F-1（5 条 P3，体感 / 审计层）见 60-咨询模块chrome-devtools-mcp走查-第五轮.md §1。
  - 命题：R5 暴露的两条 P1 都是「契约 *已*修复但又在新地方错位」——R5-G-1 是 R3-E-1 修复（新加 join）写错列名，R5-D-1 是 R4-D-2 修复（写侧字段统一）但读侧 mapper 没跟上。建议下一轮 R-CONSULT-06 起把 server `messages.admin.types.ts` ↔ client `views/conversations/types.ts` 字段映射提到 ts / zod 共享单一数据源，杜绝复发。
  需要编译到：
  - 06-页面规格/咨询线索.md §3 / §4（实现状态対照表 owner picker 入口与 BMV gate dialog）
  - 06-页面规格/咨询会话.md（暂无独立文件，会话规格散落在咨询线索与 03/04 中；建议 R-CONSULT-06 时补独立 spec）
  - 03-业务规则与不变量.md §3.6（会话操作可审计：补 message_sent timeline 落地）
  Owner：研发
  状态：待编译

- 时间：2026-04-10
  来源：仓库变更
  主题：启用编译式知识库入口（raw/output）
  要点：
  - 新增原始输入入口：`docs/gyoseishoshi_saas_md/_raw/00-inbox.md`（只追加）
  - 新增产出归档入口：`docs/gyoseishoshi_saas_md/_output/00-outputs.md`（可回灌）
  - 将编译式工作流写入文档维护规范，作为长期维护机制
  需要编译到：
  - 99-文档维护与版本记录.md（编译式知识库工作流段落）
  - README.md（维护约定：增加 raw/output 入口）
  Owner：产品/研发
  状态：已编译

- 时间：2026-04-10
  来源：仓库变更
  主题：建立跨编辑器统一入口 AGENTS.md
  要点：
  - 新增仓库根目录 `AGENTS.md`，作为 Trae/Cursor/Augment 的统一指令入口
  - 固化门禁命令与架构边界，降低规则分叉
  需要编译到：
  - README.md（AI 协作者路径：增加 AGENTS.md 说明）
  Owner：产品/研发
  状态：已编译

- 时间：2026-04-10
  来源：待补充
  主题：P0 真实业务 Top3（用于下一轮编译）
  要点：
  - 条目 1：
  - 条目 2：
  - 条目 3：
  需要编译到：
  - 03-业务规则与不变量.md（如涉及冻结口径/对象边界/校验门槛）
  - 04-核心流程与状态流转.md（如涉及阶段/状态转移/Gate）
  - 06-页面规格/（如涉及字段/交互/列表与批量）
  - 07-数据模型设计.md（如涉及实体/字段/枚举）
  - 08-术语表.md（如涉及新概念/同义词收敛）
  Owner：产品
  状态：待编译

- 时间：2026-04-11
  来源：PO 讨论 / 策略评审
  主题：P0 优化为“需求编译流水线”最小闭环
  要点：
  - 原始 PRD 不再直接作为执行输入，必须先经过结构化抽取、歧义消解、边界冻结
  - P0 最小中间产物收敛为 `requirements.ir`、`ambiguities`、`boundary`、`traceability`
  - 三条硬门禁：高优先级歧义未关闭不得开工；没有 `out_of_scope` 不得冻结；没有 traceability 不算完成
  - `09-结构化总索引与交叉映射` 需承担 `REQ-P0-*` 需求 ID 与回写主表角色
  需要编译到：
  - P0/README.md（P0 需求编译流水线与治理升级）
  - P0/09-结构化总索引与交叉映射.md（需求 ID / traceability 主表）
  - P0/99-文档维护与版本记录.md（硬门禁与最小中间产物模板）
  Owner：产品/研发
  状态：已编译

- 时间：2026-04-11
  来源：P0 权威文档试跑 / REQ-P0-01
  主题：REQ-P0-01 咨询转化——首条需求编译样例
  要点：
  - 目标：从 `Lead` 创建 `Customer` 与首个 `Case`，默认继承 Group，并保证去重提示可见
  - 权威来源：P0/02 §2.1、§2.2、§2.3、§5.2；P0/03 §2.1、§2.2、§2.6；P0/04 §4.1；P0/06「咨询线索 / 客户 / 案件」；P0/07「Lead / Customer / Case / Group」
  - 当前需要显式编译的问题：去重命中后是“复用已有 Customer/Case”还是“允许继续新建”；转化入口是一步完成还是分步完成
  - 本次试跑先聚焦单 Lead → 单 Customer → 首个 Case，不覆盖批量建案、客户合并、自动分配
  需要编译到：
  - _output/00-outputs.md（`requirements.ir / ambiguities / boundary / traceability` 样例）
  Owner：产品/研发
  状态：已编译

- 时间：2026-05-02
  来源：R22 案件全流程审计 BUG-200
  主题：是否引入「任意中间相位 → CLOSED_FAILED」中途撤案路径
  要点：
  - 当前 PHASE_TRANSITIONS 仅允许 REJECTED → CLOSED_FAILED 和 VISA_REJECTED → CLOSED_FAILED
  - 审计发现：实际业务中客户可能在任意非终态阶段主动撤案（如 WAITING_MATERIAL、MATERIAL_PREPARING、REVIEWING 等）
  - 需 PM 确认：是否为所有非终态 phase 增加 → CLOSED_FAILED 出边；若是，是否需要额外 guard（如撤案原因必填、关联账单处理规则）
  - 变更影响：PHASE_TRANSITIONS 表、前端 PhaseTransitionPopover 可选目标列表、stage 同步逻辑
  需要编译到：
  - 04-核心流程与状态流转.md（phase 转换图扩展）
  - 03-业务规则与不变量.md（撤案 guard 规则）
  Owner：PM
  状态：待决策

  ---
  **PM 决策 Gate（BUG-200 — 中途撤案路径）**
  以下 3 项全部答复后方可开始编码，请在各项 `[ ]` 处标记选择。

  **Q1. 出边范围：是否为所有非终态 phase 增加 → CLOSED_FAILED？**
  - [x] 是（推荐）——为以下 11 个非终态 phase 各追加 `CLOSED_FAILED` 出边：
    `CONSULTING / CONTRACTED / WAITING_MATERIAL / MATERIAL_PREPARING / REVIEWING / APPLYING / UNDER_REVIEW / NEED_SUPPLEMENT / SUPPLEMENT_PROCESSING / WAITING_PAYMENT / COE_SENT`
    （不含成功链路 phase：`APPROVED / SUCCESS / RESIDENCE_PERIOD_RECORDED / RENEWAL_REMINDER_SCHEDULED`；
     `REJECTED / VISA_REJECTED` 已有 → CLOSED_FAILED）
  - [ ] 否——仅保留现状（REJECTED / VISA_REJECTED → CLOSED_FAILED）
  - [ ] 其它（请说明）：

  **Q2. 撤案原因：是否枚举化预设？**
  - [x] 是（推荐）——预设 4 项 reason code + 自由文本兜底：
    | code | 中文 | 日文 | 英文 |
    |---|---|---|---|
    | `MID_CASE_WITHDRAWAL` | 中途撤案 | 途中撤回 | Mid-case withdrawal |
    | `CLIENT_LOST_CONTACT` | 客户失联 | 連絡不通 | Client lost contact |
    | `SWITCHED_TO_OTHER_FIRM` | 改委托其他事务所 | 他事務所へ変更 | Switched to other firm |
    | `OTHER` | 其它（需填写文本） | その他（要入力） | Other (text required) |
  - [ ] 否——仅自由文本，不做枚举
  - [ ] 其它（请说明）：

  **Q3. 账单 guard：中途撤案是否需要前置账单门禁？**
  - [x] 否、跳过（推荐）——`assertCoeSendBillingGate` 仅约束 `COE_SENT` 正常结案路径，
    中途撤案属于异常终止，不再追加额外账单门禁
  - [ ] 是——撤案前必须确认账单已结清（请说明具体规则）：
  - [ ] 其它（请说明）：

  > 默认选项已用 `[x]` 标记。如 PM 同意推荐方案，确认即可；如有调整请修改标记并补充说明。
  > 三项全部确认后，将此条目状态改为 `已决策`，随后启动 BUG-200 编码。

- 时间：2026-05-06
  来源：chrome-devtools-mcp 走查 R-CONSULT-01
  主题：咨询模块（leads + conversations）首轮端到端走查——12 条缺陷 + 5 条新发现遗漏
  要点：
  - **走查结论**：模块状态 = 走查无法通过基本 happy-path。UI shell 已完成但 server 关键写入接口缺失。
  - **P0 缺陷 ×3**：
    - B-1：`POST /admin/leads` 404 — server 缺 create handler，新建线索全链路阻断
    - B-1'：`POST /admin/leads/:id/convert` 404 — 转客户/转案件不可用
    - E-1：conversation `assignOwner` 硬编码 `"current-user"` 字面量，指派负责人永远失败
  - **P1 缺陷 ×1**：
    - E-2：conversation 详情错误状态展示 raw i18n key（6 条错误链路 `conversations.errors.*` 裸渲染）
  - **P2 缺陷 ×3**：
    - C-1 / D-1：server 路由缺 `ParseUUIDPipe`，非法 UUID 直接 500（leads + conversations 跨模块同源）
    - B-4：`LeadToast` 缺 `role="alert"` + `aria-live="polite"`
  - **P3 缺陷 ×4**：
    - B-2 / B-3：邮箱/电话无客户端格式校验
    - E-3：conversation detail null 时头部按钮仍渲染
    - G-1：客户端 dedup `phone.includes(input)` 部分匹配易误判
  - **P4 缺陷 ×1**：
    - G-2：`<input>` 缺 `autocomplete` 属性
  - **5 条新发现遗漏**（走查中额外识别）：
    1. `lead_no` 编号自动生成机制缺失（server create 不含 `LEAD-YYYYMM-NNNN`）
    2. `assigned_org_id` + RLS 自读约束（`org_id` 与 `assigned_org_id` 必须同写 `ctx.orgId`，否则 RLS 屏蔽自读）
    3. 业务类型映射 `intendedCaseType`（kebab-case）→ `caseTypeCode`（snake_case）需经 `mapBusinessTypeToCaseTypeCode`
    4. `AdminUser.id` 持久化缺失（conversation owner picker 默认值需真实 UUID）
    5. convert 拆两步对齐 spec §4（admin 端拆 `convert-customer` / `convert-case`，portal 暂保留一步；需 ADR 记录分歧）
  - **决策记录**：admin convert 拆两步 vs portal convert 保留一步 → [ADR-admin-convert-split.md](../_output/ADR-admin-convert-split.md)
  - **RBAC 细化**：spec §4 规定"转客户/转案件 = 主办人、助理"，当前实现沿用 `@RequireRoles("staff")` 含销售，留为单独 ticket 跟进
  需要编译到：
  - P0/06-页面规格/咨询线索.md（実施状態対照表更新——已完成）
  - _output/ADR-admin-convert-split.md（已新建）
  - 03-业务规则与不变量.md（RBAC 细化粒度，待独立 ticket）
  Owner：研发
  状态：已编译

- 时间：2026-05-06
  来源：chrome-devtools-mcp 走查 R-CONSULT-02
  主题：咨询模块第二轮 happy-path 走查——12 条新缺陷 + R-CONSULT-01 8 条修复回归
  要点：
  - **R-CONSULT-01 修复回归**：B-1 / B-1' / B-2 / B-3 / C-1 / D-1 / E-1 / E-2 / E-3 全部 ✅；B-4 / G-1 待回归
  - **R-CONSULT-02 P0 缺陷 ×2**：
    - **R2-A-1**：前端 `useOwnerOptions` / `useGroupOptions` 用静态 fixture 短码（`suzuki` / `tokyo-1`），与 server UUID 期望不对齐，`POST /admin/leads` 与 `bulk/assign` 全部 500；同根因导致详情/列表 owner 反解失败
    - **R2-B-5**：`POST /admin/leads/:id/convert-case` 400（BMV 闸口结构化错误 `CASE_BMV_GATE_BLOCKED` + 4 条 `blockers[]`）被前端 dialog 静默吞噬，仅 console warn，UI 完全无感知
  - **R-CONSULT-02 P1 缺陷 ×3**：
    - **R2-B-4**：`LeadDetailView.vue:94-96` 头部 3 按钮（编辑信息 / 调整状态 / 标记流失）handler 全部 `() => {}`，UI 完全失效
    - **R2-B-6**：lead 已转客户后头部「查看客户」按钮仍 emit `convert-customer`，重新打开 LeadConvertCustomerDialog（dedup 兜底但易误操作）
    - **R2-A-1 在 bulk 路径**：bulk-assign 同样 500
  - **R-CONSULT-02 P2 缺陷 ×4**：
    - **R2-D-1**：`conversations.admin.controller.ts:143` `assign` body 仍用 `optStr` 而非 `optUuid`（E-1 同源风险未补完）
    - **R2-D-2**：`messages.admin.controller.ts:104` `conversationId` / `messageId` 缺 `ParseUUIDPipe`，非法 UUID → 500（reqid=693 实测）
    - **H-6**：转客户/转案件成功后 `useLeadDetailModel` 不主动 `fetchDetail()`，UI 状态滞后必须 reload
    - **H-10**：admin 端无 conversation seed 工具，e2e 走查 send/assign/close/reopen 被阻断
  - **R-CONSULT-02 P3 缺陷 ×5**：
    - **R2-B-1 / H-9**：列表/详情 owner 字段显示 raw UUID 或 "?"（同 R2-A-1 根因，详情显示 `00000000-…000011`，列表显示 "?"）
    - **R2-B-2**：详情头部「编号」字段显示 lead.id（UUID）而非 leadNo（`LEAD-202605-0002`）
    - **R2-B-3**：`所属组` 显示 fixture catalog 标签 `東京一組` 与 DB `name="tokyo-1"` 不一致
    - **H-4**：跟进/日志时间显示原始 ISO `2026-05-06T10:24:53.330Z` 未 localize（list 已 localized，showcase 内部不一致）
    - **H-5**：日志条目仅显示 `logType + 时间`，缺 actor / payload diff
  - **核心体系性观察**：
    1. **fixture catalog vs API 数据双轨制**——`LeadConvertCaseDialog` 已对接 `/api/users` 真实数据（仅展示 1 条 Local Admin），但 `LeadCreateModalBody` / `LeadBulkActionBar` / `LeadDetailView` 仍走 fixture catalog 7 条短码，是当前模块写入侧最大的不一致
    2. **server-side 错误结构化已落地**（CASE_BMV_GATE_BLOCKED + blockers[]）但**前端无对应渲染组件**，需要补 `BMVGateBlockerListPanel`
    3. **R-CONSULT-01 的 ParseUUIDPipe 修复未完全推广**——messages 子接口被遗漏
  - **R-CONSULT-03 入门门禁**（5 条）：R2-A-1 / R2-B-4 / R2-B-5 / R2-B-6 / H-10
  需要编译到：
  - P0/06-页面规格/咨询线索.md §"实施状态対照表" 增加 R-CONSULT-02 实测列
  - 04-核心流程与状态流转.md §"BMV 闸口" 增加前端 `BMVGateBlockerList` 渲染约束
  - _output/57-咨询模块chrome-devtools-mcp走查-第二轮.md（已新建）
  Owner：研发
  状态：待编译

- 时间：2026-05-07
  来源：R-FLOW-01 修复计划 / ADR-case-templates-as-checklist-ssot
  主题：BMV `template_versions` 路径在下一迭代清理的待办
  要点：
  - 当前 PR2 将 `case_templates.requirement_blueprint` 设为建案资料清单唯一真源
  - BMV（经营管理签）仍经由 `TemplatesService.resolve(kind="document_checklist", key="business_manager_visa")` 读取 `template_versions` / `template_releases` 表
  - 下一迭代需要：为 BMV 写入 `case_templates` 行（`case_type = "business_manager"`），验证等价后切换
  - 切换验证通过后删除 `template_versions` 中 `kind=document_checklist / key=business_manager_visa` 行
  - `TemplatesService.resolve` 保留但标记 deprecated；全站不再新增消费方
  - 关联 ADR：[ADR-case-templates-as-checklist-ssot.md](../_output/ADR-case-templates-as-checklist-ssot.md) §BMV 兼容性窗口
  需要编译到：
  - 04-核心流程与状态流转.md §4.2（BMV 资料模板路径标注 deprecated 预告）
  - 07-数据模型设计.md `template_versions` 表注释（标注仅 BMV 残留使用，计划清理）
  Owner：研发
  状态：待编译

- 时间：2026-05-06
  来源：R-CONSULT-03 走查 Batch F backlog
  主题：R3-G-1 followups 响应契约裸数组 + controller UUID 化 audit
  要点：
  - **R3-G-1**：`GET /admin/leads/:id/followups` 返回裸数组 `LeadFollowup[]`，与全站列表接口 `{items, total}` 契约不一致。同源问题还包括 `GET /admin/leads/:id/logs`（返回 `LeadLog[]`）。本轮不改（避免破坏现有前端消费方），留待下一个 endpoint 契约拉通 PR 统一处理。
  - **UUID 化 audit**：扫描 `packages/server/src/modules/core/` 下所有 controller，确认所有 `*UserId / *GroupId / *CustomerId / *CaseId / *LeadId` 类 UUID 参数是否已从 `optStr` 迁移到 `optUuid`。
    - ✅ `leads.admin.controller.ts`：`ownerUserId` / `groupId` / `customerId` 已全部 `optUuid`（R3-A-1 / R2-A-1 已修复）
    - ✅ `conversations.admin.controller.ts`：`ownerUserId` / `leadId` / `customerId` / `caseId` / `appUserId` 已全部 `optUuid`
    - ✅ `cases` controllers：无 `optStr` 用于 UUID 字段
    - ✅ `customers` controllers：无 `optStr` 用于 UUID 字段
    - ✅ `billing` controllers：无 `optStr` 用于 UUID 字段
    - ✅ `messages.admin.controller.ts`：`optStr` 仅用于 `kind` / `visibleScope`（非 UUID），无残留
    - **结论**：截至 2026-05-06，全部 controller 的 UUID 类参数已迁移到 `optUuid`，无遗留风险。
  需要编译到：
  - P0 backlog（endpoint 契约拉通 PR：followups / logs 裸数组→ `{items, total}`）
  - 本条 audit 结论可用于后续 UUID 守门 lint 规则设计
  Owner：研发
  状态：已编译（audit 已完成，R3-G-1 修复留下一轮）

---

- **2026-05-09 — 同一统计概念必须有单一来源 (T4/NEW-V7-1)**
  走查发现进度卡「未知 N/N」显示，根因：blueprint 的 `providedByRole` 未填，落库后 `provided_by_role=NULL`，分组查询 coalesce 为 `unknown`。
  解决：在 `RequirementBlueprintItem` 类型新增 `providedByRole?: ProvidedByRole`（值域 applicant | supporter | office），三个种子蓝图全量补齐；前端 `adaptProviderProgress` 过滤 `unknown/unspecified + total=0` 的桶。
  教训：同一概念（资料提供者角色）的分组维度和显示维度必须有单一来源字段，不能依赖 coalesce 兜底。
  Owner：研发
  状态：已实施
