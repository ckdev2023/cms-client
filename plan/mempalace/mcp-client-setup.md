# MemPalace MCP 客户端接入说明

## 1. 目标

为 `Cursor` 与 `Claude Code` 提供第一个可重复执行的 `MemPalace` MCP 客户端接入说明，确保新窗口只暴露 `W09` 已冻结的只读/门禁工具，不改动业务仓库配置，也不要求客户端承担 sidecar 运维动作。

## 2. 适用范围

- 本文只负责客户端接入，不负责实现或修改 `MemPalace` MCP 服务端。
- 本文只覆盖第一期 7 个只读/门禁工具：`search_knowledge`、`get_document`、`get_citation_context`、`list_indexed_sources`、`route_query`、`ground_query`、`prepare_grounded_answer`。
- 本文默认 `MemPalace` sidecar 已由独立流程准备好启动命令或远程 URL。
- 本文默认优先使用用户级配置，不把客户端配置提交进 `cms-client` 仓库。

## 3. 共享前置条件

在配置任何客户端前，先确认以下前置条件成立：

1. `W09` 已冻结只读工具范围，且不开放 diary、drawer、memory 写入和索引控制工具。
2. `MemPalace` sidecar 与仓库隔离运行，不要求修改 `package.json`、`npm install` 或 `npm run guard`。
3. 操作者已确认 sidecar 虚拟环境可用。第一期启动命令由以下两部分组成：
   - `command`：sidecar 虚拟环境中的 Python 解释器，路径为 `<CMS_CLIENT_ROOT>/sidecar/.venv/bin/python`
   - `args`：`["-m", "mempalace.mcp_server"]`
   - 其中 `<CMS_CLIENT_ROOT>` 是 `cms-client` 仓库根目录的绝对路径，本机为 `/Users/ck/workplace/cms-client`
4. 服务端标识统一固定为：`mempalace-readonly`

说明：

- 第一期优先推荐 `stdio` 本地进程接入，符合 sidecar 独立运行边界。
- 若后续运维侧提供远程 MCP 地址，客户端也可以按各自支持能力改为 `url` 模式，但不改变只读工具白名单。
- MCP 服务端入口为 `sidecar/mempalace/mcp_server.py`，通过 `FastMCP` 以 stdio transport 运行，当前注册 7 个白名单工具。

## 4. 共享接入契约

### 4.1 固定 server id

客户端统一使用：

`mempalace-readonly`

这样做的目的是让后续验证、排障和多客户端说明使用同一标识，不必为不同客户端维护不同别名。

### 4.2 `stdio` 配置模板

```json
{
  "mcpServers": {
    "mempalace-readonly": {
      "type": "stdio",
      "command": "<CMS_CLIENT_ROOT>/sidecar/.venv/bin/python",
      "args": ["-m", "mempalace.mcp_server"],
      "env": {
        "PYTHONPATH": "<CMS_CLIENT_ROOT>/sidecar",
        "MEMPALACE_ROOT": "$HOME/.mempalace/cms-client",
        "MEMPALACE_REPO_ROOT": "<CMS_CLIENT_ROOT>"
      }
    }
  }
}
```

本机实际值（`<CMS_CLIENT_ROOT>` = `/Users/ck/workplace/cms-client`）：

```json
{
  "mempalace-readonly": {
    "type": "stdio",
    "command": "/Users/ck/workplace/cms-client/sidecar/.venv/bin/python",
    "args": ["-m", "mempalace.mcp_server"],
    "env": {
      "PYTHONPATH": "/Users/ck/workplace/cms-client/sidecar",
      "MEMPALACE_ROOT": "/Users/ck/.mempalace/cms-client",
      "MEMPALACE_REPO_ROOT": "/Users/ck/workplace/cms-client"
    }
  }
}
```

约束：

- `command` 必须指向 sidecar 虚拟环境内的 Python 解释器，不可使用系统 Python 或业务仓库的 Node 工具链。
- `args` 固定为 `["-m", "mempalace.mcp_server"]`。
- `env` 必须传入 `PYTHONPATH`（sidecar 包根目录）、`MEMPALACE_ROOT`（数据根）和 `MEMPALACE_REPO_ROOT`（仓库根）。
- 不在客户端配置中追加写入相关开关。
- 若必须传路径参数，只传 sidecar 自身所需参数，不传仓库任意目录读取参数。

### 4.3 远程 `url` 配置模板

仅当运维侧已提供远程 MCP 地址时使用（第一期暂无远程部署，此处仅保留模板供后续参考）：

```json
{
  "mcpServers": {
    "mempalace-readonly": {
      "url": "http://<REMOTE_HOST>:<PORT>/mcp",
      "headers": {}
    }
  }
}
```

约束：

- 远程模式也必须仍然只暴露 `W09` 白名单工具。
- 不因为远程化而追加日志、目录浏览、重建索引等运维能力。

## 5. Cursor 接入

### 5.1 推荐入口

优先顺序：

1. `Cursor Settings > Features > MCP` 图形界面
2. `~/.cursor/mcp.json`
3. `agent mcp add ...` CLI

第 1 种最直观；第 2 种最适合复制模板；第 3 种适合终端化操作。

### 5.2 方式 A：通过设置界面添加

1. 打开 `Cursor Settings > Features > MCP`
2. 选择 `Add New MCP Server`
3. Transport 选择 `stdio`
4. 名称填写 `mempalace-readonly`
5. Command 填写 `/Users/ck/workplace/cms-client/sidecar/.venv/bin/python`
6. Args 填写 `-m mempalace.mcp_server`
7. Environment Variables 添加 `PYTHONPATH=/Users/ck/workplace/cms-client/sidecar`、`MEMPALACE_ROOT=/Users/ck/.mempalace/cms-client`、`MEMPALACE_REPO_ROOT=/Users/ck/workplace/cms-client`
7. 保存后确认该 server 处于可连接状态

### 5.3 方式 B：写入 `~/.cursor/mcp.json`

将第 4 节的模板写入用户级文件：

`~/.cursor/mcp.json`

已写入 `~/.cursor/mcp.json`（追加到现有配置中）：

```json
{
  "mcpServers": {
    "mempalace-readonly": {
      "type": "stdio",
      "command": "/Users/ck/workplace/cms-client/sidecar/.venv/bin/python",
      "args": ["-m", "mempalace.mcp_server"],
      "env": {
        "PYTHONPATH": "/Users/ck/workplace/cms-client/sidecar",
        "MEMPALACE_ROOT": "/Users/ck/.mempalace/cms-client",
        "MEMPALACE_REPO_ROOT": "/Users/ck/workplace/cms-client"
      }
    }
  }
}
```

注意：

- 本任务不要求写项目级 MCP 配置到仓库内。
- 若本机已有其他 MCP server，只追加 `mempalace-readonly` 节点，不覆盖现有配置。

### 5.4 方式 C：使用 CLI 添加

若已安装支持 MCP 的 Cursor CLI，可使用：

```bash
agent mcp add mempalace-readonly -- /Users/ck/workplace/cms-client/sidecar/.venv/bin/python -m mempalace.mcp_server
```

如果是远程地址模式，优先改用图形界面或 `mcp.json`，避免在本文里扩展 CLI 细节。

### 5.5 Cursor 最小验证

完成接入后，按顺序执行：

1. 运行 `agent mcp list`，确认存在 `mempalace-readonly`
2. 运行 `agent mcp list-tools mempalace-readonly`
3. 核对白名单工具只包含：
   - `search_knowledge`
   - `get_document`
   - `get_citation_context`
   - `list_indexed_sources`
   - `route_query`
   - `ground_query`
   - `prepare_grounded_answer`
4. 在 Cursor 对话里先调用 `prepare_grounded_answer("P0 页面规格 客户")`
5. 若返回 `status=grounded`，检查 `citation_bundles` 与 `answer_rules`
6. 若返回 `status=blocked`，检查 `suggested_reply` 是否提示缺少权威引用
7. 仅在需要更大上下文时，再调用 `get_document` 或 `get_citation_context`

若 `agent mcp list-tools` 出现任何写入类工具，视为不符合一期接入边界。

## 6. Claude Code 接入

### 6.1 推荐入口

优先顺序：

1. `claude mcp add --scope user ...`
2. `~/.claude.json`
3. 项目级 `.mcp.json` 仅在需要团队共享时使用

第一期默认推荐 `user` scope，原因如下：

- 不改动业务仓库
- 不把本地试接入配置带入 git
- 更符合“新窗口独立完成只读接入”的目标

### 6.2 方式 A：CLI 添加用户级 server

本地 `stdio` 模式：

```bash
claude mcp add --scope user mempalace-readonly \
  -e PYTHONPATH=/Users/ck/workplace/cms-client/sidecar \
  -e MEMPALACE_ROOT=/Users/ck/.mempalace/cms-client \
  -e MEMPALACE_REPO_ROOT=/Users/ck/workplace/cms-client \
  -- /Users/ck/workplace/cms-client/sidecar/.venv/bin/python -m mempalace.mcp_server
```

如果后续确实需要共享到项目级，再单独改为：

```bash
claude mcp add --scope project mempalace-readonly \
  -e PYTHONPATH=/Users/ck/workplace/cms-client/sidecar \
  -e MEMPALACE_ROOT=/Users/ck/.mempalace/cms-client \
  -e MEMPALACE_REPO_ROOT=/Users/ck/workplace/cms-client \
  -- /Users/ck/workplace/cms-client/sidecar/.venv/bin/python -m mempalace.mcp_server
```

但第一期默认不要这样做，因为会生成仓库级 `.mcp.json`。

### 6.3 方式 B：写入配置文件

Claude Code 的配置存储规则如下：

- 用户级 / 本地级：`~/.claude.json`
- 项目级共享：仓库根 `.mcp.json`

第一期推荐只写用户级配置，模板如下：

```json
{
  "mcpServers": {
    "mempalace-readonly": {
      "command": "/Users/ck/workplace/cms-client/sidecar/.venv/bin/python",
      "args": ["-m", "mempalace.mcp_server"],
      "env": {
        "PYTHONPATH": "/Users/ck/workplace/cms-client/sidecar",
        "MEMPALACE_ROOT": "/Users/ck/.mempalace/cms-client",
        "MEMPALACE_REPO_ROOT": "/Users/ck/workplace/cms-client"
      }
    }
  }
}
```

若后续需要项目级共享，才把同结构写入仓库根 `.mcp.json`；本任务默认不这样做。

### 6.4 Claude Code 最小验证

完成接入后，按顺序执行：

1. 运行 `claude mcp list`，确认存在 `mempalace-readonly`
2. 运行 `claude mcp get mempalace-readonly`，确认命令或配置已生效
3. 进入交互会话后执行 `/mcp`，确认 server 状态正常
4. 在会话中先调用 `prepare_grounded_answer`
5. 确认业务问题会返回 `grounded` 或 `blocked` 之一，而不是裸检索结果
6. 仅在需要更大上下文时，再调用 `get_document` 或 `get_citation_context`

若 `/mcp` 中未看到该 server，优先检查：

- `command` 路径是否正确
- `args` 是否完整
- sidecar 是否能独立启动

## 7. 首次接入后的统一验证脚本

无论是 `Cursor` 还是 `Claude Code`，都使用同一组最小验证问题：

1. 调用 `list_indexed_sources`
   - 预期：能看到已索引来源根、来源层级、最后刷新时间
2. 调用 `prepare_grounded_answer`
   - 示例检索词：`P0 页面规格 客户`
   - 预期：返回 `status`、`route`、`citation_bundles`、`answer_rules`
3. 调用 `ground_query`
   - 预期：能独立返回 `grounded` / `blocked` 门禁判断
4. 针对其中一条引用调用 `get_citation_context`
   - 预期：能看到相邻上下文，而不是只有孤立片段
5. 必要时调用 `get_document`
   - 预期：能定位到单个文档或 section
6. 反向检查工具边界
   - 预期：客户端看不到 `add_memory`、`delete_memory`、`append_diary`、`reindex_all`、`read_file`

若第 1-5 步成功但第 6 步失败，说明连接成功但工具开放面超出 `W09`，仍视为接入不合格。

## 8. 故障定位顺序

接入失败时按以下顺序排查：

1. 先确认客户端已加载 `mempalace-readonly` 配置
2. 再确认 sidecar 启动命令或 URL 本身可用
3. 再确认工具清单是否只剩 7 个白名单工具
4. 最后才检查是否需要调整客户端作用域或配置文件位置

不要在客户端侧为了解决连接问题而临时开放写入工具或通用文件读取工具。

## 9. 本文与其他任务的分工

- `W07`：定义 sidecar 与仓库的隔离拓扑
- `W08`：定义 sidecar 的环境与版本策略
- `W09`：冻结第一期只读工具范围
- `W10`：说明客户端如何接入这些只读工具
- `W15`：后续再处理运维 runbook，不在本文展开

## 10. 直接依据

- `plan/tasks/MP-W10-mcp-client-setup.md`
- `plan/mempalace/mcp-readonly-scope.md`
- `plan/mempalace/deployment-topology.md`
- `plan/mempalace/environment-strategy.md`
- `plan/mempalace/allowed_sources.md`
- `plan/mempalace/blocked_sources.md`
- Cursor MCP 当前公开文档：`Settings > Features > MCP`、`~/.cursor/mcp.json`、`agent mcp add/list/list-tools`
- Claude Code MCP 当前公开文档：`claude mcp add/list/get`、`/mcp`、`~/.claude.json`、项目级 `.mcp.json`
