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
