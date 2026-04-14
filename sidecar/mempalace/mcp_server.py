"""
MemPalace MCP stdio 服务端 — 暴露只读检索与查询门禁工具。

启动方式:
  python -m mempalace.mcp_server

Cursor / Claude Code 客户端通过 stdio transport 连接本服务。
"""

from __future__ import annotations

import json
from pathlib import Path

import chromadb
from mcp.server.fastmcp import FastMCP

from mempalace.config import (
    CHROMA_COLLECTION,
    MANIFEST_PATH,
    resolve_paths,
)
from mempalace.grounding import (
    ground_query as _ground_query,
    prepare_grounded_answer as _prepare_grounded_answer,
    route_query as _route_query,
)
from mempalace.tools import (
    get_citation_context as _get_citation_context,
    get_document as _get_document,
    list_indexed_sources as _list_indexed_sources,
    search_knowledge as _search_knowledge,
)

_paths = resolve_paths()

mcp = FastMCP(
    "mempalace-readonly",
    instructions=(
        "MemPalace 只读知识检索服务。处理业务规则/范围/字段/状态/流程类问题时，"
        "必须先调用 prepare_grounded_answer 或至少先调用 ground_query；"
        "若返回 blocked，不得给出确定结论。"
    ),
)


def _client() -> chromadb.ClientAPI:
    """按 deployment-topology.md 约定的路径创建 PersistentClient。"""
    return chromadb.PersistentClient(path=str(_paths.chroma))


@mcp.tool()
def search_knowledge(
    query: str,
    n_results: int = 5,
    wing_filter: str | None = None,
    room_filter: str | None = None,
) -> str:
    """在已索引集合中执行语义检索，返回命中摘要、来源路径、来源层级、相关度。"""
    result = _search_knowledge(
        _client(),
        query,
        n_results=n_results,
        wing_filter=wing_filter,
        room_filter=room_filter,
    )
    return json.dumps(result.to_dict(), ensure_ascii=False)


@mcp.tool()
def get_document(
    source_path: str,
    section: str | None = None,
) -> str:
    """按 source_path 读取单个文档正文或指定 section 的全部 chunk。"""
    result = _get_document(_client(), source_path, section=section)
    return json.dumps(result.to_dict(), ensure_ascii=False)


@mcp.tool()
def get_citation_context(
    chunk_id: str,
    context_window: int = 1,
) -> str:
    """按 chunk_id 读取锚点 chunk 及前后相邻 chunk，构成引用上下文。"""
    result = _get_citation_context(
        _client(), chunk_id, context_window=context_window,
    )
    return json.dumps(result.to_dict(), ensure_ascii=False)


@mcp.tool()
def list_indexed_sources() -> str:
    """查看已纳入索引的来源白名单、来源层级、最后刷新时间与状态。"""
    result = _list_indexed_sources(
        _client(),
        MANIFEST_PATH,
        baselines_dir=_paths.baselines,
    )
    return json.dumps(result.to_dict(), ensure_ascii=False)


@mcp.tool()
def route_query(query: str) -> str:
    """根据问题意图输出推荐 wing / room / authority gate 路由。"""
    result = _route_query(query)
    return json.dumps(result.to_dict(), ensure_ascii=False)


@mcp.tool()
def ground_query(query: str, n_results: int = 5) -> str:
    """执行检索门禁；若缺少权威引用则返回 blocked。"""
    result = _ground_query(
        _client(),
        query,
        n_results=n_results,
        collection_name=CHROMA_COLLECTION,
    )
    return json.dumps(result.to_dict(), ensure_ascii=False)


@mcp.tool()
def prepare_grounded_answer(
    query: str,
    n_results: int = 5,
    context_window: int = 1,
) -> str:
    """业务问答首选入口：先做门禁，再返回最小引用上下文与回答规则。"""
    result = _prepare_grounded_answer(
        _client(),
        query,
        n_results=n_results,
        context_window=context_window,
        collection_name=CHROMA_COLLECTION,
    )
    return json.dumps(result.to_dict(), ensure_ascii=False)


@mcp.prompt()
def grounded_answer_protocol(query: str) -> str:
    """生成 MemPalace 业务问答协议，要求先过引用门禁再回答。"""
    return (
        f"你正在回答业务问题：{query}\n"
        "1. 先调用 prepare_grounded_answer(query)。\n"
        "2. 若 status=blocked，只能输出 suggested_reply，不得补充实现细节。\n"
        "3. 若 status=grounded，只能依据 citation_bundles 回答。\n"
        "4. 回答结构固定为：结论 / 依据 / 引用 / 缺失项。\n"
        "5. 若需要更大上下文，可继续调用 get_document，但不得绕过门禁。"
    )


def main() -> None:
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
