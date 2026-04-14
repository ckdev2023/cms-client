# MemPalace Taxonomy Spec

## 1. 目标

冻结 `MemPalace` 第一层分类 `wing` 的命名、归属和边界规则，确保来源域稳定，给后续 `room` 设计和索引批次提供不冲突的上层骨架。

## 2. 设计原则

- `wing` 只表达大来源域，不表达字段、流程节点、页面或实现细节。
- 先按来源域归类，再在同一来源域内用 `room` 承载主题切分。
- 同一物理来源路径在同一时期只能归入一个 `wing`，禁止重复挂载。
- 命名使用稳定的 `kebab-case`，优先采用“业务域 + 层级/载体”的形式。
- 模糊材料优先按来源域归类，不按“看起来像哪个页面”或“未来可能怎么实现”归类。

## 3. 命名规则

### 3.1 命名格式

固定格式：

`<domain>-<layer-or-carrier>`

约束：

- 使用英文小写和短横线。
- 不直接使用具体文件名、页面名或脚本名。
- 不在 `wing` 中加入版本号、日期或临时阶段名。
- `wing` 名不得与后续 `room` 名重复。

### 3.2 归属判断顺序

新增来源进入 taxonomy 时，按以下顺序判断：

1. 先看物理来源根目录属于哪个来源域。
2. 再判断该来源是“权威业务定义”“场景资料”“原型载体”还是“工程规则”。
3. 若仍有歧义，保持在更上层的来源域 `wing`，不要提前下沉到 `room`。

## 4. 首批 Wing 集合

### 4.1 首批启用 Wing

这三类是第一批知识域骨架，也是后续首轮索引的主来源域。

| wing | 来源根目录 | 纳入边界 | 排除边界 | 说明 |
|---|---|---|---|---|
| `gyoseishoshi-p0` | `docs/gyoseishoshi_saas_md/P0/` | P0 范围、页面规格、数据模型、业务规则、不变量、索引与维护文档 | `P1/`、`_output/`、`_raw/`、原型目录、工程规则目录 | 对应首版权威定义层，优先级最高的业务产品基线 |
| `gyoseishoshi-p1` | `docs/gyoseishoshi_saas_md/P1/` | P1 扩展范围、扩展页面规格、扩展落地清单、P1 专属门禁产物 | `P0/`、`_output/`、`_raw/`、原型目录、工程规则目录 | 对应扩展层定义，只承接扩展，不改写 P0 底座 |
| `office-process` | `docs/事务所流程/` | 场景流程、资料清单、签证类型差异、实务准备材料、场景说明 | `P0/`、`P1/`、`_output/`、`_raw/`、原型目录、工程规则目录 | 对应事务所实务场景输入，适合作为场景资料来源域 |

### 4.2 保留但不在首批主索引内的 Wing

这两类需要边界清晰，但第一期不应抢占权威业务文档的位置。

| wing | 来源根目录 | 纳入边界 | 排除边界 | 第一阶段定位 |
|---|---|---|---|---|
| `admin-prototype` | `packages/prototype/admin/` | 高保真原型、拆分清单、迁移映射、原型壳层、原型脚本与样式 | `docs/gyoseishoshi_saas_md/`、`docs/事务所流程/`、工程规则目录 | 保留为参考型来源域，用于 UI 走查、原型对照和迁移参考，不替代业务规则 |
| `engineering-rules` | `AGENTS.md`、`.cursor/rules/` | 工程约束、AI 协作规则、项目守则、交付门禁 | 业务需求文档、事务所流程文档、原型目录 | 保留为工程治理来源域，用于回答“怎么做”而非“业务是什么” |

## 5. Wing 边界细则

### 5.1 `gyoseishoshi-p0`

纳入：

- `P0` 根目录下的范围、流程、规则、数据模型、信息架构和页面规格。
- `P0/06-页面规格/` 下的页面规格与其门禁产物。

排除：

- 任何 `P1` 扩展文档，即使主题与 P0 页面同名。
- `_output` 中对 P0 的二次整理结论。
- 原型 HTML、原型拆分文档和工程规则。

### 5.2 `gyoseishoshi-p1`

纳入：

- P1 扩展范围说明、技术落地清单、扩展页面规格、扩展门禁产物。

排除：

- P0 共享底座定义，即使 P1 文档中引用了它。
- 原型目录中为 P1 页面服务的 UI 结构和脚本。

### 5.3 `office-process`

纳入：

- 场景 README、签证类型场景文件、资料清单、场景化业务输入材料。

排除：

- 产品范围和共享业务规则。
- 工程实现约束。

### 5.4 `admin-prototype`

纳入：

- 原型页面、拆分后的 section/script/data 结构。
- `INVENTORY`、`SPLIT-ARCHITECTURE`、`MIGRATION-MAPPING`、`P0-CONTRACT` 等原型附属设计工件。

排除：

- 已冻结到 `P0/P1` 的权威业务规则。
- 任何真实业务数据或运行数据目录。

### 5.5 `engineering-rules`

纳入：

- 仓库级工程规范、AI 协作规则、交付守则、上下文使用约束。

排除：

- 用户业务需求、产品页面规格、事务所流程。
- Sidecar 运行数据、日志、备份等运维产物。

## 6. 易混来源的归类规则

| 易混来源 | 归入哪个 wing | 原因 |
|---|---|---|
| `docs/gyoseishoshi_saas_md/P0/06-页面规格/*-需求门禁/artifacts/` | `gyoseishoshi-p0` | 它们仍是 P0 页面规格的附属权威材料，不单独开 wing |
| `docs/gyoseishoshi_saas_md/P1/03-经营管理签高仿真原型需求门禁/artifacts/` | `gyoseishoshi-p1` | 虽与原型有关，但物理来源和治理归属仍属于 P1 扩展域 |
| `packages/prototype/admin/*/MIGRATION-MAPPING.md` | `admin-prototype` | 它是原型到生产的桥接说明，不是权威业务定义 |
| `AGENTS.md` 与 `.cursor/rules/*.mdc` | `engineering-rules` | 它们约束工程与协作方式，不承载业务真相 |

## 7. Room 设计原则

- `room` 只表达可长期复用的主题焦点，不表达来源根目录。
- `room` 是 `wing` 内的第二层主题切分；同一个 `room` 名可以出现在多个 `wing` 下，但语义必须保持一致。
- `room` 命名继续使用稳定的 `kebab-case`，优先采用“主题名词”而非文件名、页面名或阶段编号。
- `room` 需要足够稳定，能够跨文档迭代沿用；临时专题、单次评审或单一页面不单独升格为 `room`。
- 若一个主题既能在 `P0/P1` 中找到权威定义，又能在 `docs/事务所流程/` 中找到场景材料，优先复用同名 `room`，通过 tunnel 连接而不是发明新房间。

## 8. Room 命名规则

### 8.1 命名格式

固定格式：

`<theme>`

约束：

- 使用英文小写和短横线。
- 不直接使用具体文件名、页面名、模板名或步骤码。
- 不与任何 `wing` 重名。
- 不把 `P0`、`P1`、`office` 等来源信息塞进 `room` 名，来源归属由 `wing` 表达。

### 8.2 归类判断顺序

新增主题进入 taxonomy 时，按以下顺序判断：

1. 先判断该内容回答的是“状态/流转”“字段/实体归属”“门禁/校验”“专属业务扩展”还是“场景资料/提交材料”。
2. 再判断该主题是否可跨多个来源域稳定复用；若可以，优先复用已有 `room`。
3. 若同一内容同时触及多个主题，以“最终想让检索聚焦回答什么问题”为准，挂入主 `room`，其他主题通过 tunnel 连接。
4. 若仍无法稳定归类，保持在 `wing` 层，不要为了完整性硬拆新 `room`。

## 9. 首批 Room 集合

### 9.1 核心启用 Room

| room | 主题定义 | 主要回答的问题 | 优先挂载 wing | 可复用 wing |
|---|---|---|---|---|
| `state-machine` | 各类对象状态、阶段、步骤及其合法流转 | 当前对象有哪些状态？如何推进或回退？ | `gyoseishoshi-p0` | `gyoseishoshi-p1` |
| `field-ownership` | 实体、字段、关系、快照与字段归属边界 | 某字段属于谁？在哪个实体维护？哪些字段是快照或冗余？ | `gyoseishoshi-p0` | `gyoseishoshi-p1` |
| `workflow-gates` | Gate、阻断条件、软提示、服务端前置校验与重新校验触发 | 某动作为什么可做/不可做？阻断条件和留痕要求是什么？ | `gyoseishoshi-p0` | `gyoseishoshi-p1` |
| `biz-mgmt` | 经营管理签专属步骤、字段、收费门禁、在留期间与提醒链路 | 经管签有哪些 P1 专属扩展？与 P0 底座如何分层？ | `gyoseishoshi-p1` | `office-process` |
| `scenario-materials` | 场景化资料清单、签证类型差异、案件材料准备 | 某签证/场景需要哪些资料？资料差异在哪里？ | `office-process` | `gyoseishoshi-p1` |
| `submission-audit` | 提交包锁定、补正链路、审计事件、敏感动作留痕 | 哪些动作必须锁定快照或留痕？补正与提交如何追溯？ | `gyoseishoshi-p0` | `gyoseishoshi-p1` |

### 9.2 每个 Room 的最小归类示例

| room | 示例来源 | 归类原因 |
|---|---|---|
| `state-machine` | `P0/03` 的 `Case.stage = S1-S9`、资料项状态、文书状态 | 它们定义对象状态枚举与合法流转，是典型状态机主题 |
| `state-machine` | `P1/01` 的 `CaseWorkflowStep` 如 `UNDER_REVIEW`、`COE_SENT`、`ENTRY_SUCCESS` | 它们是 P1 业务层状态/步骤，和 P0 管理层阶段形成双层状态模型 |
| `field-ownership` | `P0/07` 中 `Customer`、`Case`、`CaseParty`、`SubmissionPackage` 的字段边界 | 它回答“字段放在哪里、谁拥有、谁只是引用或快照” |
| `field-ownership` | `P1/01` 与 `P0/07` 中 `extra_fields_schema`、`survey_data`、`ResidencePeriod` | 它们属于模板专属字段或新增实体归属问题，而不是流程问题 |
| `workflow-gates` | `P0/03` 的 Gate-A/B/C、硬阻断与软提示、重新校验触发条件 | 它们定义推进动作的门槛与失败原因 |
| `workflow-gates` | `P1/01` 的 `COE_SENT` 前尾款必须结清、`P1/02` 的 billing guard 落地要求 | 它是 P1 对通用 Gate 的专属加严，不是独立状态机 |
| `biz-mgmt` | `P1/01` 的 Step 1-20 拆分、模块 M1-M9、P1-A/P1-B 顺序 | 它们共同回答经营管理签扩展如何完整落地 |
| `biz-mgmt` | `docs/事务所流程/*.scenarios/biz-mgmt-*.md` | 它们提供经营管理签场景资料输入，可作为同主题 tunnel 的场景端锚点 |
| `scenario-materials` | `docs/事务所流程/在留資格別必要情報一覧Ver2.scenarios/*.md` | 它们按案件场景组织资料需求，是稳定的“材料准备”主题 |
| `submission-audit` | `P0/03`、`P0/04`、`P0/07` 中的 `SubmissionPackage`、补正提交包、审计事件 | 它们共同回答“提交快照如何锁定、补正如何追溯、敏感动作如何留痕” |

## 10. 跨 Wing 复用与 Tunnel 规则

### 10.1 基本规则

- tunnel 连接的是“同一主题在不同来源域中的互补证据”，不是“任意两个看起来相关的文件”。
- 只有当两个来源在同一 `room` 下回答的是同一类问题时，才允许建立 tunnel。
- tunnel 不改变来源优先级；`wing` 决定来源域，`room` 决定主题，权威裁决仍遵守 `P0/P1/事务所流程 > _output > _raw`。
- 低层来源通过 tunnel 只能补充上下文、样例或场景材料，不能反向覆盖高层来源的冻结结论。

### 10.2 推荐 Tunnel 模式

| tunnel | 连接意图 | 使用口径 |
|---|---|---|
| `gyoseishoshi-p0/state-machine -> gyoseishoshi-p1/state-machine` | 从 P0 管理层阶段追到 P1 业务子步骤 | 先用 P0 确认 `S1-S9`，再用 P1 补充经管签专属步骤，不可让 P1 改写 P0 主阶段 |
| `gyoseishoshi-p0/field-ownership -> gyoseishoshi-p1/field-ownership` | 从 P0 通用实体追到 P1 扩展字段/实体 | 先看 P0 基础对象，再看 P1 如何以 `extra_fields`、`ResidencePeriod` 扩展 |
| `gyoseishoshi-p0/workflow-gates -> gyoseishoshi-p1/workflow-gates` | 在通用 Gate 上叠加专属门禁 | 先确认 Gate-A/B/C 通用规则，再补 `COE_SENT` 之类的经管签专属守卫 |
| `gyoseishoshi-p1/biz-mgmt -> office-process/biz-mgmt` | 从产品扩展定义追到经营管理签场景材料 | 先用 P1 确认系统承接口径，再用事务所流程补充场景输入和材料差异 |
| `office-process/scenario-materials -> gyoseishoshi-p1/biz-mgmt` | 从场景资料反查系统落地位置 | 先识别资料与场景差异，再回链到 P1 的模板、问卷、提醒或收费门禁设计 |

### 10.3 禁止的 Tunnel 用法

- 不允许从 `office-process` 的场景材料直接 tunnel 到 `gyoseishoshi-p0/state-machine` 并据此改写 `S1-S9`。
- 不允许把 `biz-mgmt` 作为“万能房间”吸收所有经管签相关字段、状态、资料和收费问题；应优先回到 `state-machine`、`field-ownership`、`workflow-gates` 等更稳定主题。
- 不允许因为两个文件都提到“收费”就跨 room 乱连；只有当问题是“是否构成门禁”时才进入 `workflow-gates`。

## 11. 与后续 Manifest / Retrieval 的接口

- `wing` 负责回答“资料来自哪个大域”。
- `room` 负责回答“这个大域里该聚焦哪个稳定主题”。
- 首轮检索至少要能稳定命中 `state-machine`、`field-ownership`、`workflow-gates`、`biz-mgmt` 四类 room。
- 同一文档可被切分进多个 `room`，但必须有一个主 `room`；次主题通过 tunnel 或交叉引用表达。

## 12. 最小执行约束

在后续 manifest、索引和回答协议中，必须遵守以下约束：

1. 一个来源根目录只能挂到一个 `wing`。
2. 首轮业务检索优先围绕 `gyoseishoshi-p0`、`gyoseishoshi-p1`、`office-process`。
3. `admin-prototype` 只能作为参考来源域，不能覆盖业务权威域。
4. `engineering-rules` 只能回答工程治理问题，不能被混用为业务事实来源。

## 13. 当前结论

- 第一层 `wing` 采用来源域优先，而不是页面或实现优先。
- 首批稳定骨架为：`gyoseishoshi-p0`、`gyoseishoshi-p1`、`office-process`。
- `admin-prototype` 与 `engineering-rules` 保持独立边界，防止原型或工程规则污染业务权威来源。
- 第二层 `room` 采用稳定主题优先，而不是文件名或页面名优先。
- 首批核心 `room` 至少固定为：`state-machine`、`field-ownership`、`workflow-gates`、`biz-mgmt`。
- tunnel 只用于连接同主题的跨 `wing` 证据链，不改变来源层级与权威裁决顺序。
