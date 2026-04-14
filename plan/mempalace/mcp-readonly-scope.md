# MemPalace MCP 第一期只读工具范围

## 1. 目标

冻结 `MemPalace` 第一期对 MCP 客户端开放的最小工具面，确保只提供检索、路由、引用门禁增强能力，不提供任何内容写入、结构变更或运维控制能力。

## 2. 范围原则

- 第一期目标是“问得到、引得回、答得稳”，不是“写得进、改得动、管得住”。
- 只允许访问 `MemPalace` 已索引的白名单知识源，不允许通过 MCP 直接读取仓库任意文件或 sidecar 运行目录。
- 工具设计遵循最小开放面：先满足检索、路由、门禁与引用回链，再考虑运维和写入。
- 任何名称含 `create`、`add`、`update`、`append`、`delete`、`move`、`sync`、`ingest`、`reindex`、`restore` 的能力，默认不进入一期开放范围，除非后续任务单独放行。

## 3. 一期允许开放的工具

### 3.1 白名单

| 工具名 | 类型 | 一期状态 | 允许能力 | 风险控制理由 |
|---|---|---|---|---|
| `search_knowledge` | 检索 | 允许 | 在已建索引内按关键词或语义检索片段，返回命中摘要、来源路径、来源层级、相关度 | 满足主目标，且只读、可审计、暴露面最小 |
| `get_document` | 定位查看 | 允许 | 按已知 `source_id` / `document_id` 读取单个文档正文或指定 section | 用于把检索命中落到具体文档，不需要写权限 |
| `get_citation_context` | 引用补全 | 允许 | 读取某条命中前后相邻段落或 chunk，帮助客户端展示上下文 | 只补足引用上下文，避免为拿上下文而开放通用文件读取 |
| `list_indexed_sources` | 范围可见性 | 允许 | 查看当前已纳入索引的来源根、来源层级、最后刷新时间、状态 | 便于客户端自检只读范围是否符合 `W01/W02/W03`，不涉及数据写入 |
| `route_query` | 意图路由 | 允许 | 根据问题意图输出推荐 wing / room / authority gate 路由 | 帮客户端先分流到正确权威层，降低误检和脑补风险 |
| `ground_query` | 引用门禁 | 允许 | 对业务问题执行 authority gate；若缺少权威引用返回 `blocked` | 把“先查再答”从软约束升级为可执行门禁，仍然只读 |
| `prepare_grounded_answer` | 问答打包 | 允许 | 一次返回门禁结果、最小引用上下文、回答规则和建议回复 | 减少客户端串联调用复杂度，降低绕过门禁的概率 |

### 3.2 允许工具的统一约束

1. 只允许命中 `W02` 白名单来源；若请求对象不在白名单内，必须拒绝。
2. 即使内容已进入索引，只要命中 `W03` 红线或脱敏灰线，也必须拒绝返回。
3. 返回结果必须带最小来源信息：`source_path`、`source_layer`、`title/section`、`snippet`。
4. 不返回 sidecar 内部目录、运行日志、备份文件、原始配置文件内容。
5. 不提供“列出所有文件”“遍历目录”“按路径直接读文件”等通用读取能力。

## 4. 明确禁止开放的工具

### 4.1 写入与改写类

| 工具类别 | 典型工具名 | 一期状态 | 禁止原因 |
|---|---|---|---|
| 记忆内容写入 | `add_memory`、`create_memory`、`upsert_memory` | 禁止 | 会把未经审查的内容写入知识库，破坏“只读检索先行”边界 |
| 记忆内容修改 | `update_memory`、`patch_memory`、`move_memory` | 禁止 | 会改变已索引内容或归档位置，带来审计和回滚复杂度 |
| 记忆内容删除 | `delete_memory`、`purge_memory` | 禁止 | 删除操作不可逆，且会影响检索一致性与评估稳定性 |

### 4.2 diary / drawer 类

| 工具类别 | 典型工具名 | 一期状态 | 禁止原因 |
|---|---|---|---|
| diary 写入 | `append_diary`、`create_diary_entry`、`update_diary_entry` | 禁止 | 任务要求明确不开放 diary 写能力，且 diary 容易混入未冻结结论 |
| drawer 结构新增/修改 | `add_drawer`、`create_drawer`、`rename_drawer`、`move_drawer` | 禁止 | 会改变知识空间结构，导致 taxonomy 与回链规则失稳 |
| drawer 删除 | `delete_drawer` | 禁止 | 删除结构会直接影响命名稳定性、引用路径和历史结果可复现性 |

### 4.3 索引与运维控制类

| 工具类别 | 典型工具名 | 一期状态 | 禁止原因 |
|---|---|---|---|
| 手动采集 / 导入 | `ingest_path`、`import_documents`、`sync_sources` | 禁止 | 会绕过 `W02/W03` 白名单与红线治理，把风险带入服务端 |
| 重建 / 重刷索引 | `reindex_all`、`refresh_index`、`rebuild_embeddings` | 禁止 | 属于 sidecar 运维操作，不应暴露给通用 MCP 客户端 |
| 数据清理 / 恢复 | `clear_index`、`restore_backup`、`rollback_index` | 禁止 | 影响持久化状态，误操作成本高，不属于一期客户端能力 |

### 4.4 通用文件系统读取类

| 工具类别 | 典型工具名 | 一期状态 | 禁止原因 |
|---|---|---|---|
| 通用目录浏览 | `list_dir`、`glob_sources` | 禁止 | 虽是只读，但会把白名单之外的仓库结构暴露给客户端 |
| 通用文件读取 | `read_file`、`read_path` | 禁止 | 会绕过索引层与脱敏边界，直接暴露原始文档或 sidecar 文件 |
| 运行态观测 | `read_logs`、`read_runtime_config` | 禁止 | 会泄露运维细节，且不属于检索增强主路径 |

## 5. 一期客户端可见性约定

提供给客户端接入任务的最小可见工具集固定为：

1. `search_knowledge`
2. `get_document`
3. `get_citation_context`
4. `list_indexed_sources`
5. `route_query`
6. `ground_query`
7. `prepare_grounded_answer`

其中 `prepare_grounded_answer` 是业务问答首选入口；`ground_query` 用于需要自定义检索编排的客户端。

除此之外，其余工具默认不可见。若未来需要新增工具，必须先补独立任务冻结：

1. 新工具的输入输出契约
2. 与 `W02/W03` 的边界关系
3. 回滚与误操作风险

## 6. 与现有规划的关系

- 与 `W01` 一致：检索结果必须保留来源层级，不允许把低层来源伪装成权威结论。
- 与 `W02` 一致：只对首批白名单来源生效。
- 与 `W03` 一致：即使技术上可读，也不能通过 MCP 放行真实客户、正式案件、日志、备份和未审阅附件。
- 与 `W07` 一致：客户端只能读索引结果，不直接接触 sidecar 的 `runtime/`、`data/`、`logs/`、`backups/`。
- 与 `W10` 的分工：本文冻结“能看到哪些工具”；`W10` 再写“客户端如何接入这些工具”。
- 与 `W08` 的分工：环境与版本策略后续补齐，但不会改变一期“只读不写”的能力边界。

## 7. 最小验收口径

满足以下条件即可视为一期 MCP 范围冻结完成：

1. 客户端只看到 7 个白名单工具。
2. 任一写入、删除、结构变更、索引控制工具都未暴露。
3. 任一通用文件系统读取工具都未暴露。
4. 客户端能够通过 `list_indexed_sources` 验证只读范围是否落在白名单内。
5. 客户端能够通过 `prepare_grounded_answer` 完成“路由 + 门禁 + 回链”的最小闭环。

## 8. 本文的直接依据

- `plan/tasks/MP-W09-mcp-readonly-scope.md`
- `plan/mempalace/source-priority.md`
- `plan/mempalace/allowed_sources.md`
- `plan/mempalace/blocked_sources.md`
- `plan/mempalace/deployment-topology.md`
- `plan/tasks/MP-W08-environment-strategy.md`
- `plan/tasks/MP-W10-mcp-client-setup.md`
