# manifest.json 字段映射说明

本文记录 `manifest.json` 各字段与 `ingestion-manifest.md` 原文的对应关系，以便审阅和后续维护时快速定位来源。

## 顶层字段

| JSON 字段 | 原文位置 | 转换说明 |
|---|---|---|
| `manifest_version` | §2 "Fixed Premises" 表 `v0-draft` | 从 `v0-draft` 升级为 `v0.1.0`，标记已机器化 |
| `phase` | §2 `phase` 行 | 原样保留 |
| `default_policy` | §2 `default_policy` 行 | 原样保留 |
| `enabled_scope` | §2 `enabled_scope` 行 | 拆为字符串数组 |
| `reserved_scope` | §2 `reserved_scope` 行 | 拆为字符串数组 |

## authority_layers

| JSON 字段 | 原文位置 |
|---|---|
| `L1` / `L2` / `L3` | `source-priority.md` §2 三层优先级表 |

## classifications

| JSON 字段 | 原文位置 |
|---|---|
| `C1-Direct-Allow` ~ `C4-Hard-Block` | `data_classification.md` §2 分类表 |
| `classification_priority` | `ingestion-manifest.md` §3 规则 3："C4 > C3 > C2 > C1" |

## global_execution_rules

| JSON 索引 | 原文位置 |
|---|---|
| `[0]`~`[4]` | `ingestion-manifest.md` §3 规则 1-5，逐条对应 |

## global_exclude_rules

| `rule_id` | 原文位置 |
|---|---|
| `exclude-outside-enabled-roots` | `ingestion-manifest.md` §4 表第 1 行 |
| `exclude-binary-and-office` | §4 表第 2 行 |
| `exclude-dump-export-log` | §4 表第 3 行 |
| `exclude-directory-package-allow` | §4 表第 4 行 |

## blocked_content_rules

| `rule_id` | 原文位置 |
|---|---|
| `block-real-identity` | `ingestion-manifest.md` §5 表第 1 行；`blocked_sources.md` §3 表第 1 行 |
| `block-formal-case-data` | §5 表第 2 行 |
| `block-document-and-visa-material` | §5 表第 3 行 |
| `block-billing-and-payment` | §5 表第 4 行 |
| `block-chat-meeting-export` | §5 表第 5 行 |
| `candidate-desensitized-teaching-sample` | §5 表第 6 行；`blocked_sources.md` §4 脱敏候选表 |

## source_entries

| `source_id` | 原文位置 | 新增字段 |
|---|---|---|
| `p0-core-md` | `ingestion-manifest.md` §6 表第 1 行 | `wing` 来自 `taxonomy-spec.md` §4.1 |
| `p0-navigation-md` | §6 表第 2 行 | 同上 |
| `p0-gate-artifacts` | §6 表第 3 行 | 同上 |
| `p1-core-md` | §6 表第 4 行 | `wing` 来自 `taxonomy-spec.md` §4.1 |
| `p1-gate-artifacts` | §6 表第 5 行 | 同上 |
| `office-process-md` | §6 表第 6 行 | `wing` 来自 `taxonomy-spec.md` §4.1 |
| `office-process-scenarios` | §6 表第 7 行 | 同上 |
| `office-process-config` | §6 表第 8 行 | 同上 |
| `compiled-output-buffer` | §6 表第 9 行 | `wing: null`（一期未启用，不归入首批 wing） |
| `raw-input-buffer` | §6 表第 10 行 | 同上 |

### source_entries 各字段说明

| JSON 字段 | 原文列名 | 转换说明 |
|---|---|---|
| `source_id` | `source_id` | 原样保留 |
| `phase1_mode` | `phase1_mode` | 原样保留：`enabled` / `disabled_reserved` |
| `authority_layer` | `authority_layer` | 原样保留：`L1` / `L2` / `L3` |
| `classification` | `classification` | 原样保留：`C1-Direct-Allow` ~ `C4-Hard-Block` |
| `include_globs` | `include_globs` | 中文顿号分隔 → JSON 字符串数组 |
| `include_ext` | `include_ext` | 逗号分隔 → JSON 字符串数组 |
| `exclude_globs` | `exclude_globs` | "无" → 空数组 `[]` |
| `refresh_policy` | `refresh_policy` | 自然语言描述 → `kebab-case` 枚举标识符 |
| `retrieval_weight` | `retrieval_weight` | 原样保留 `0.00`~`1.00` |
| `usage_rule` | `usage_rule` | 原样保留自然语言 |
| `wing` | 新增 | 从 `taxonomy-spec.md` §4.1 首批 Wing 映射 |

### refresh_policy 枚举

| 值 | 原文描述 |
|---|---|
| `incremental_on_merge_plus_weekly_full` | 文档合入后同日增量刷新；每周一次全量复扫 |
| `incremental_on_merge` | 文档变更后同日增量刷新 |
| `incremental_on_regeneration` | 工件重生成后立即增量刷新 |
| `incremental_on_merge_plus_biweekly_audit` | 文档更新后同日增量刷新；每两周一次人工抽检 |
| `incremental_on_change` | 文件更新后立即增量刷新 |
| `reserved_incremental_on_merge` | 预留：文档合入后同日增量刷新 |
| `reserved_manual_only` | 预留：仅人工编译后处理，不做自动刷新 |

## weight_invariants / conflict_resolution

| JSON 字段 | 原文位置 |
|---|---|
| `weight_invariants` | `ingestion-manifest.md` §7 + §3 规则 3 |
| `conflict_resolution.multi_match_order` | `ingestion-manifest.md` §3 规则 5 |

## provenance

| JSON 字段 | 说明 |
|---|---|
| `derived_from` | 列出本 JSON 直接依赖的 Markdown 真源文档 |
| `created` | 首次机器化转换日期 |
| `note` | 指向本映射说明文件 |
