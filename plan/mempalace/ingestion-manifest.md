# MemPalace 首版 Ingestion Manifest（Markdown 草案）

## 1. 目标

把 `W01`、`W02`、`W03` 已冻结的来源优先级、允许采集范围和禁止采集边界收敛成一份可机械转换的 manifest，作为后续索引配置、采集脚本和只读检索策略的真源草案。

## 2. Phase 1 固定前提

| 字段 | 值 |
|---|---|
| `manifest_version` | `v0-draft` |
| `phase` | `phase1_internal_knowledge_only` |
| `default_policy` | `deny_by_default` |
| `enabled_scope` | `docs/gyoseishoshi_saas_md/P0/`、`docs/gyoseishoshi_saas_md/P1/`、`docs/事务所流程/` |
| `reserved_scope` | `docs/gyoseishoshi_saas_md/_output/`、`docs/gyoseishoshi_saas_md/_raw/` |
| `non_goals` | 不执行真实索引；不定义 room taxonomy；不处理部署与客户端接入 |

## 3. 全局执行规则

1. 只有命中 `source_entries` 中 `phase1_mode = enabled` 的条目，才允许进入首轮采集。
2. 任何内容即使命中白名单目录，只要触发 `blocked_content_rules`，都必须被拒绝或升级为待脱敏，不能继续进入索引。
3. 固定来源层级为 `L1 > L2 > L3`；固定采集动作优先级为 `C4-Hard-Block > C3-Desensitize-Candidate > C2-Scoped-Allow > C1-Direct-Allow`。
4. `_output` 与 `_raw` 在本草案中只保留“已定义、未启用”的预留位：允许先冻结权重差异，但一期不放行。
5. 同一文件若同时匹配多个条目，按“更具体路径优先、`enabled` 优先于 `disabled_reserved`、更高层级优先”的顺序归档。

## 4. Global Exclude Rules

以下规则可直接转成后续采集器的全局黑名单：

| 规则 ID | 匹配方式 | 动作 | 说明 |
|---|---|---|---|
| `exclude-outside-enabled-roots` | 任意文件不在 `P0/`、`P1/`、`docs/事务所流程/`、`_output/`、`_raw/` 五类根目录内 | `drop` | 一期只允许已冻结根目录进入候选集合 |
| `exclude-binary-and-office` | `**/*.xlsx`、`**/*.xls`、`**/*.docx`、`**/*.pdf`、`**/*.png`、`**/*.jpg`、`**/*.jpeg`、`**/*.gif`、`**/*.webp`、`**/*.zip`、`**/*.7z`、`**/*.tar`、`**/*.gz` | `drop` | 未审阅二进制与 Office 附件一期默认禁止 |
| `exclude-dump-export-log` | `**/*.csv`、`**/*.sql`、`**/*.dump`、`**/*.bak`、`**/*.log`、`**/*.jsonl` | `drop` | 导出、备份、日志与批量文本导出不进入一期 |
| `exclude-directory-package-allow` | 目录命中白名单但文件后缀未命中该条目 `include_ext` | `drop` | 禁止目录级整包放行 |

## 5. Blocked Content Rules

以下规则不是路径白名单，而是内容级红线；后续配置应在采集前执行分类检查：

| 规则 ID | 触发内容 | 分类结果 | 动作 |
|---|---|---|---|
| `block-real-identity` | 真实客户/潜在客户姓名、公司名、地址、电话、邮箱、证件号、案件编号等直接标识符 | `C4-Hard-Block` | `drop` |
| `block-formal-case-data` | 正式 `Lead/Customer/Case` 导出、状态流转、任务记录、提醒记录、资料目录 | `C4-Hard-Block` | `drop` |
| `block-document-and-visa-material` | 护照、在留卡、申请表、理由书、回执、签证结果等原始材料 | `C4-Hard-Block` | `drop` |
| `block-billing-and-payment` | 报价单、账单、发票、付款流水、银行信息、税务编号 | `C4-Hard-Block` | `drop` |
| `block-chat-meeting-export` | 聊天导出、邮件导出、会议转写，只要带真实客户或正式案件细节 | `C4-Hard-Block` | `drop` |
| `candidate-desensitized-teaching-sample` | 已改写但仍来自真实业务经验的教学样本、规则摘要、聚合统计、复盘摘要 | `C3-Desensitize-Candidate` | `hold_for_future_review` |

## 6. Source Entries

| `source_id` | `phase1_mode` | `authority_layer` | `classification` | `include_globs` | `include_ext` | `exclude_globs` | `refresh_policy` | `retrieval_weight` | `usage_rule` |
|---|---|---|---|---|---|---|---|---|---|
| `p0-core-md` | `enabled` | `L1` | `C1-Direct-Allow` | `docs/gyoseishoshi_saas_md/P0/*.md`、`docs/gyoseishoshi_saas_md/P0/**/*.md` | `.md` | `docs/gyoseishoshi_saas_md/P0/06-页面规格/*-需求门禁/artifacts/**`、`docs/gyoseishoshi_saas_md/P0/09-结构化总索引与交叉映射.md` | 文档合入后同日增量刷新；每周一次全量复扫 | `1.00` | `P0` 权威正文，可直接作为最终结论来源 |
| `p0-navigation-md` | `enabled` | `L1` | `C2-Scoped-Allow` | `docs/gyoseishoshi_saas_md/P0/09-结构化总索引与交叉映射.md` | `.md` | 无 | 文档变更后同日增量刷新 | `0.70` | 仅做导航与回链，不单独升格为规则源 |
| `p0-gate-artifacts` | `enabled` | `L1` | `C2-Scoped-Allow` | `docs/gyoseishoshi_saas_md/P0/06-页面规格/*-需求门禁/artifacts/**` | `.json`、`.md`、`.txt` | 无 | 工件重生成后立即增量刷新 | `0.75` | 仅作为 `P0` 正文的结构化补充，不覆盖正文口径 |
| `p1-core-md` | `enabled` | `L1` | `C1-Direct-Allow` | `docs/gyoseishoshi_saas_md/P1/*.md`、`docs/gyoseishoshi_saas_md/P1/**/*.md` | `.md` | `docs/gyoseishoshi_saas_md/P1/*需求门禁/artifacts/**` | 文档合入后同日增量刷新；每周一次全量复扫 | `0.98` | 只回答 `P1` 扩展问题，不可反向改写 `P0` 底座 |
| `p1-gate-artifacts` | `enabled` | `L1` | `C2-Scoped-Allow` | `docs/gyoseishoshi_saas_md/P1/*需求门禁/artifacts/**` | `.json`、`.md`、`.txt` | 无 | 工件重生成后立即增量刷新 | `0.74` | 仅作为 `P1` 正文的结构化补充 |
| `office-process-md` | `enabled` | `L1` | `C1-Direct-Allow` | `docs/事务所流程/*.md` | `.md` | `docs/事务所流程/*.scenarios/*.md` | 文档更新后同日增量刷新；每两周一次人工抽检 | `0.90` | 仅作为场景流程与资料输入参考；与 `P0/P1` 冲突时降级 |
| `office-process-scenarios` | `enabled` | `L1` | `C1-Direct-Allow` | `docs/事务所流程/*.scenarios/*.md` | `.md` | 无 | 场景文件更新后立即增量刷新 | `0.88` | 适合直接检索和回链，但不单独定义产品实现边界 |
| `office-process-config` | `enabled` | `L1` | `C2-Scoped-Allow` | `docs/事务所流程/*.config.json`、`docs/事务所流程/*.config.yaml` | `.json`、`.yaml` | 无 | 配置变更后立即增量刷新 | `0.68` | 只辅助解析与映射，不单独作为最终业务结论 |
| `compiled-output-buffer` | `disabled_reserved` | `L2` | `C2-Scoped-Allow` | `docs/gyoseishoshi_saas_md/_output/**/*.md` | `.md` | 无 | 预留：文档合入后同日增量刷新 | `0.60` | 一期默认不采；后续若启用，只可桥接或加速定位 `L1`，不得覆盖 `L1` |
| `raw-input-buffer` | `disabled_reserved` | `L3` | `C3-Desensitize-Candidate` | `docs/gyoseishoshi_saas_md/_raw/**/*.md` | `.md` | 无 | 预留：仅人工编译后处理，不做自动刷新 | `0.20` | 一期默认不采；后续若启用，也只能作为待编译线索，不能直接产出最终结论 |

## 7. `_output` / `_raw` 权重差异说明

`_output` 与 `_raw` 都不进入一期实际白名单，但必须提前冻结差异，避免后续“低层原始输入”和“已编译结论”被同权处理：

| 来源 | `phase1_mode` | `retrieval_weight` | 解释 |
|---|---|---|---|
| `docs/gyoseishoshi_saas_md/_output/` | `disabled_reserved` | `0.60` | 代表已整理结论层，未来若启用，可做桥接与定位，但始终低于 `L1` |
| `docs/gyoseishoshi_saas_md/_raw/` | `disabled_reserved` | `0.20` | 代表原始输入层，即使未来启用，也只能做线索提示，不能和 `_output` 同权 |

固定关系：`L1 enabled sources > _output reserved weight > _raw reserved weight`。

## 8. 最小转换约定

后续若把本文转成机器配置，至少保留以下字段：

- `source_id`
- `phase1_mode`
- `authority_layer`
- `classification`
- `include_globs`
- `include_ext`
- `exclude_globs`
- `refresh_policy`
- `retrieval_weight`
- `usage_rule`

若后续配置系统不支持内容级检查，必须保留 `blocked_content_rules` 的等价预处理步骤；不允许只迁移路径白名单而忽略内容红线。

## 8.1 manifest.json 字段映射说明

机器可执行版已生成为 `plan/mempalace/manifest.json`，以下是 Markdown 各节到 JSON 顶层键的映射关系：

| Markdown 节 | JSON 键 | 转换说明 |
|---|---|---|
| §2 Phase 1 固定前提 | `manifest_version`、`phase`、`default_policy`、`enabled_scope`、`reserved_scope` | 表格行直接映射为顶层标量或数组 |
| §2 层级定义（隐含） | `authority_layers` | L1/L2/L3 定义提取为结构化对象 |
| §5 + data_classification.md | `classifications`、`classification_priority` | C1-C4 定义提取为对象 + 优先级数组 |
| §3 全局执行规则 | `global_execution_rules[]` | 五条执行规则映射为字符串数组 |
| §4 Global Exclude Rules | `global_exclude_rules[]` | 每行对应一个对象；`匹配方式` 拆分为 `match_type` + `roots` 或 `patterns` |
| §5 Blocked Content Rules | `blocked_content_rules[]` | 每行对应一个对象；`触发内容` 映射为 `trigger` 字符串 |
| §6 Source Entries | `source_entries[]` | 每行对应一个对象；`refresh_policy` 从自由文本收敛为枚举字符串 |
| §7 权重差异 | `weight_invariants[]` | 权重不变式抽取为字符串数组 |
| §3 + 多条目冲突 | `conflict_resolution.multi_match_order[]` | 冲突裁决顺序收敛为有序数组 |
| §9 直接依据 | `provenance.derived_from[]` | 路径列表映射为字符串数组 |

新增字段：

| JSON 字段 | 来源 | 说明 |
|---|---|---|
| `source_entries[].wing` | `taxonomy-spec.md` | 关联 taxonomy 中的 wing 归属；`disabled_reserved` 条目设为 `null` |
| `provenance.created` | 生成时间 | 记录 JSON 文件生成日期 |

刷新策略枚举映射：

| Markdown 自由文本 | JSON `refresh_policy` 枚举值 |
|---|---|
| "文档合入后同日增量刷新 + 每周全量复扫" | `"incremental_on_merge_plus_weekly_full"` |
| "文档变更后同日增量刷新" | `"incremental_on_merge"` |
| "工件重生成后立即增量刷新" | `"incremental_on_regeneration"` |
| "场景文件更新后立即增量刷新" | `"incremental_on_change"` |
| "文档合入后同日增量刷新 + 每两周人工抽检" | `"incremental_on_merge_plus_biweekly_audit"` |
| "预留：文档合入后同日增量刷新" | `"reserved_incremental_on_merge"` |
| "仅人工编译后处理，不做自动刷新" | `"reserved_manual_only"` |

## 9. 本 Manifest 的直接依据

- `plan/mempalace/source-priority.md`
- `plan/mempalace/allowed_sources.md`
- `plan/mempalace/blocked_sources.md`
- `plan/mempalace/data_classification.md`
- `docs/gyoseishoshi_saas_md/P0/99-文档维护与版本记录.md`
- `docs/gyoseishoshi_saas_md/P1/01-经营管理签扩展范围与落地计划.md`
- `docs/事务所流程/在留資格別必要情報一覧Ver2.scenarios/README.md`
