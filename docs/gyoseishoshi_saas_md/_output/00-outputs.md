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
  - docs/事务所流程/在留資格別必要情報一覧Ver2.scenarios/biz-mgmt-renewal.md §适用说明（mempalace prepare_grounded_answer 引用）
  - docs/事务所流程/在留資格別必要情報一覧Ver2.中文规范版资料清单.md §执行重点（mempalace 引用）
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
  结论（TL;DR）：MemPalace 4 项查询全部 `status=grounded`；20 状态来源于 `docs/事务所流程/事务所流程.master.json` → `workflow.states`（权威源为 `新规经营管理签申请全套流程Markdown文档.md`）；7 场景资料矩阵来源于 `在留資格別必要情報一覧Ver2.ai-optimized.md` 结构化摘要；CLOSED_SUCCESS 前置条件来源于 P1/01 §M9 + 流程文档业务规则§在留期间记录规则 + §提醒失败兜底规则；`stageToPhaseDefault` 映射是本计划新增的架构决策（§3），P0/P1 权威文档中只定义了 S1-S9 管理层与 CaseWorkflowStep 业务层的双层模型（07 §1 + 08 §双层状态模型），尚无显式 stage→businessPhase 映射表——需要本轮实装时一并固化。

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
  - MemPalace `P1/01-经营管理签扩展范围与落地计划.md` §0 结构化速查（grounded chunk ac28cbaf）

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
  - MemPalace grounded chunk 864f990c（ai-optimized.md §结构化摘要）

  ### C. CLOSED_SUCCESS 前置条件

  进入 `CLOSED_SUCCESS` 必须同时满足以下条件：

  1. **入境成功**：案件已通过 `VISA_APPLYING → SUCCESS` 路径确认客户入境。
  2. **已录入在留期间**：`ResidencePeriod` 记录已创建（`residence_period_start_date` / `residence_period_end_date` / `residence_years` / `entry_date`），案件处于 `RESIDENCE_PERIOD_RECORDED`。
  3. **已生成续签提醒**：系统已自动创建 180 / 90 / 30 天到期提醒任务，案件处于 `RENEWAL_REMINDER_SCHEDULED`。
  4. **提醒创建失败时禁止自动结案**：若提醒任务创建失败，案件不得自动进入 `CLOSED_SUCCESS`，应进入人工待处理队列或异常状态。

  进入 `CLOSED_FAILED` 必须填写 `closeReason`；允许进入的前置状态为 `REJECTED` 或 `VISA_REJECTED`。

  引用来源：
  - `docs/gyoseishoshi_saas_md/P1/01-经营管理签扩展范围与落地计划.md` → §M9 结案与异常兜底（grounded chunk 8e51f019）
  - `docs/事务所流程/新规经营管理签申请全套流程Markdown文档.md` → §在留期间记录规则（grounded chunk c71b2055）
  - `docs/事务所流程/新规经营管理签申请全套流程Markdown文档.md` → §提醒失败兜底规则（grounded chunk f8e26ece）
  - `docs/事务所流程/新规经营管理签申请全套流程Markdown文档.md` → §到期提醒规则（grounded chunk 9d223783）
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
  - `docs/gyoseishoshi_saas_md/P0/08-术语表.md` → §Stage（案件阶段）（grounded chunk 33fd3a93）
  - `docs/gyoseishoshi_saas_md/P0/07-数据模型设计.md` → §双层状态模型（grounded chunk d3f25952）
  - `docs/gyoseishoshi_saas_md/P0/08-术语表.md` → §P0 必须理解的 7 个概念（grounded chunk e0a04d91）
  - `docs/gyoseishoshi_saas_md/P0/08-术语表.md` → §双层状态模型（P1 可扩展性核心设计）（grounded chunk 249530ae）
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
  - MemPalace 检索：`prepare_grounded_answer("失败结案路径下的退款规则")` + `prepare_grounded_answer("案件拒签失败后退款流程...")` + `search_knowledge("退款 refund 收费 billing 结案 失败 拒签")` 三次查询均未命中任何退款相关内容
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
