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
