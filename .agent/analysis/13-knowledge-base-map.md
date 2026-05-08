# 13. 业务规范"权威源"地图（B-014）

> 生成阶段：B-014。来源：`docs/`、`AGENTS.md`、`.augment/rules/*.mdc`、各 README。仅文档结构与权威边界梳理，不涉代码。

## 1. 三层来源矩阵（High）

| 类别 | 路径 | 性质 | 权威 |
|------|------|------|------|
| **工程门禁规则** | `AGENTS.md`（45 行）| Agent 级行为门禁（`npm run guard` / 架构边界 / "只做用户要求" / 知识库工作方式）| 工程行为最高优先 |
| **工程门禁规则·路由** | `.augment/rules/core-operating-rule.mdc`（同名也存在 `.cursor/rules/`、`.trae/rules/`）| 任务路由 + 交付门禁 + 架构 + 编码规范 | 与 AGENTS.md 互补，覆盖 IDE 多端 |
| **业务规范主体** | `docs/gyoseishoshi_saas_md/`（行政書士 SaaS）| 四层文档体系：入口 / 术语 / 规范正文 / 维护 | **业务最高权威** |
| **业务规范·扩展** | `docs/gyoseishoshi_saas_md/P0/`、`P1/` | 按版本范围分级的规范正文 + 页面规格 | 版本化权威（P0=已落地，P1=扩展计划）|
| **流程结构化数据** | `docs/事务所流程/`（含 master.json）| 状态机 / 在留资格资料矩阵 / 经营管理签流程；`.master.json` 是 RAG-friendly 结构化版本 | 业务流程 + 资料的结构化真相源 |
| **沉淀闭环** | `_raw/00-inbox.md`（append-only）+ `_output/00-outputs.md`（产出归档）| Karpathy 编译式知识沉淀 | 临时材料 → 权威文档的中转站 |
| **审计 / 走查产物** | `_output/01..35-*.md`（已编号 35+ 文档）| 多轮 bug 走查清单、UI 视觉规范、案件全流程 chrome-devtools-mcp 审计 | 历史快照，非权威，仅供回灌参考 |
| **agent 技能** | `.augment/skills/`、`.agents/skills/` | 技能定义（含 `nestjs-best-practices/AGENTS.md`）| 工具行为指南 |

## 2. `docs/gyoseishoshi_saas_md/` 四层结构（High）

文档体系按"为什么 → 做哪版 → 不变量 → 流程 → 页面 → 数据 → 术语"分层：

| 层级 | 编号 | 文档 | 职责 | 变更频率 |
|------|------|------|------|------|
| 入口 | 00 | `00-开始这里.md` | 30 分钟上手路径 + 角色阅读顺序 | 极低 |
| 入口 | 02 | `02-产品全景图.md` | 业务全流程一页串联 | 低 |
| 入口 | — | `README.md` | 导航 + 维护规则 | 中 |
| 规范正文 | 01 | `01-产品定位与业务概述.md` | 定位 / 用户 / 痛点 / 非目标 | 极低 |
| 规范正文 | 02 | `02-版本范围与优先级.md` | P0/P1/P2 范围 + 验收标准 | 每版本 |
| 规范正文 | **03** | **`03-业务规则与不变量.md`** | **冻结口径 / 不变量 / 状态机 / 校验门槛分层（硬阻断/软提示）/ 审计事件** | 低（变更需评审）|
| 规范正文 | 04 | `04-核心流程与状态流转.md` | 阶段 S1–S9 + Gate-A/B/C + 状态转移 | 中 |
| 规范正文 | 05 | `05-信息架构与页面地图.md` | 全局导航 + 全局交互原则 | 中 |
| 规范正文 | **06** | **`06-页面规格/`** 目录（11 个 .md）| 各模块字段/Tab/交互（仪表盘/任务与提醒/咨询线索/客户/收费与财务/文书中心/案件/系统设置/资料中心 + 4 个"需求门禁"子目录）| 高（按模块增量）|
| 规范正文 | 07 | `07-数据模型设计.md` | 实体 / 字段 / 关系 / 约束 / 枚举 | 中 |
| 术语 | 08 | `08-术语表.md` | Group / Customer / CaseParty / SubmissionPackage 等集中定义 | 低 |
| 索引 | 09 | `09-结构化总索引与交叉映射.md` | 跨文档交叉引用图 | 中 |
| 维护 | 99 | `99-文档维护与版本记录.md` | 文档结构变更日志 + 模板规范 | 中 |

**核心原则**：① 一处定义，多处引用；② 按层分工（不跨层双写）；③ 术语统一（08 为准）；④ 页面只写界面（不写规则全文）；⑤ 数据只写结构（不写策略全文）。

**单一最强权威源**：`03-业务规则与不变量.md` — 在依赖图中被 04 / 06 / 07 / 08 全部引用，对其变更需评估下游全部文档。

## 3. P0 / P1 双版本分层（High）

```
docs/gyoseishoshi_saas_md/
  P0/
    00-开始这里.md, 01..05, 06-页面规格/(11 文件), 07, 08, 09, 99 README
  P1/
    01-经营管理签扩展范围与落地计划.md
    02-经营管理签技术落地清单.md
    03-经营管理签高仿真原型需求门禁/
    04-页面规格-客户经营管理签签约前承接.md
```

→ P0 是**已落地的完整规范集**（13+ 文档）；P1 仅 4 个增量文档，聚焦"经营管理签"业务扩展（与 `docs/事务所流程/新规经营管理签申请全套流程*` 配对）。

## 4. `docs/事务所流程/` —— 流程主结构（High）

| 文件 | 性质 |
|------|------|
| **`事务所流程.master.json`** | 流程总主结构（schema_version 1.0；2026-04-28 生成；含中日双语 `language_policy`）|
| `新规经营管理签申请全套流程Markdown文档.md` / `.docx` | BUSINESS_MANAGER COE 完整状态机 + 字段 + 业务规则 |
| `在留資格別必要情報一覧Ver2.{xlsx,ai-optimized.md,中文规范版资料清单.md,config.json,config.yaml}` | 在留资格 × 资料项矩阵（多视图：原表 / AI 优化 / 中文执行版 / 配置）|
| `在留資格別必要情報一覧Ver2.scenarios/` | 场景拆解目录 |

→ master.json `sources` 字段显式声明 3 个数据源（workflow_md / documents_md_optimized / documents_md_zh）；该 JSON 是**RAG / 向量化检索 / 规则引擎 / 表单向导**的入口（自身声明）。

## 5. `_raw` ↔ `_output` 沉淀闭环（High）

- **`_raw/00-inbox.md`**：append-only 原材料入口（会议纪要 / 讨论 / 链接要点）。
- **`_output/00-outputs.md`** + 35+ 编号文档：编译产出 + 审计快照（双层状态机走查 21 轮 + admin UI 视觉规范 3 轮 + 案件全流程 mcp 审计 4 轮 + 收费催款 1 轮）。
- AGENTS.md 第 30–34 行规定的工作方式：Ingest（追加进 `_raw`）→ Compile（顶 3 项编译为权威页面）→ File-back（产出回灌 `_output`）→ Lint（每周查矛盾/过期）。
- **观察**：`_output` 中 35+ 走查文档与 35 个 admin/server bug ID 命名族（B-010 §4）**有时间相关性但无结构对账**——bug ID 的回归测试与走查清单分别按 admin/server 工程节奏 vs 业务走查轮次维护，未发现自动桥接。 → 见 OQ-62。

## 6. 与代码层的关联点（High，从 server 代码反推）

| 业务文档 | 代码侧落点 |
|----------|-----------|
| 03 业务规则与不变量（状态机 / 不变量）| `cases.service.ts` 状态机 + `bmv` 模块 + `Stage` 枚举（B-001）|
| 04 状态流转（S1–S9 + Gate-A/B/C）| server `*.regression-p1-coe-visa-residence*` 系列（B-010）+ admin cases 簇 focused 测试 |
| 06 页面规格 / 案件.md | admin `views/cases/{model,components}` 175 测试簇（B-010）|
| 07 数据模型 | `infra/db/drizzle/schema.ts` + 17 张迁移内表（B-004）|
| 08 术语表（Group/CaseParty/SubmissionPackage）| `groups.types.ts` / `caseParties.service.ts` / `submissionPackages.service.ts` |

## 7. 工程行为规范（AGENTS.md + core-operating-rule.mdc）（High）

`AGENTS.md`（45 行）核心约束：
- 门禁：`npm run guard` 必须通过；收尾 `npm run fix` → `npm run guard`；只用 npm；测试不发真实网络。
- 架构：feature → model；domain 纯 TS；data 实现 domain；feature 不依赖 data/infra/tamagui；domain/data 不依赖 shared/ui。
- 范围：只做用户明确要求；不主动创建文档/总结。
- 知识库：见 §5 沉淀闭环。

`.augment/rules/core-operating-rule.mdc`（多端镜像于 `.cursor/`、`.trae/`）扩展：
- **任务路由**：业务问答以 `docs/gyoseishoshi_saas_md/` 内权威文档为准；缺少权威引用时不得输出确定性结论。
- **第三方库**：写代码前先查 Context7（当前版本官方推荐）。
- **架构 / 交付门禁** 与 AGENTS.md 一致 + 强调单文件 ≤ 500 行（B-011 验证 13 admin + 5 server 违例）。

→ 业务问答的"权威 ground"路径是仓库内 `docs/gyoseishoshi_saas_md/` 的四层文档体系（03 业务规则与不变量 / 04 流程 / 06 页面规格 / 07 数据模型 / 08 术语 等）。

## 8. 关键缺口

- **OQ-62**：`_output/` 走查清单与 admin/server bug ID 命名族（B-010 §4）无结构对账 → 业务走查 → 工程修复 → 测试回归的链路不可机械追踪。
- **OQ-64**：`docs/事务所流程/事务所流程.master.json`（2026-04-28）声明的 `sources` 与 `gyoseishoshi_saas_md/` 内的 03-04-07 是否双向同步？流程定义存在两处 → 漂移风险。

## 9. 置信度

| 项 | 置信度 |
|----|--------|
| 四层结构 / P0-P1 分层 / 流程 master.json 内容 | High（直读）|
| AGENTS.md / core-operating-rule.mdc 内容 | High（直读）|
| 业务文档 ↔ 代码层关联点 | High（已跨 B-001..B-010 累积证据）|
| 双源同步状态（`docs/gyoseishoshi_saas_md/` ↔ `docs/事务所流程/`）| Low（无对账文件）|
