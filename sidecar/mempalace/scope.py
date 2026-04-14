"""
MCP 一期只读工具边界守卫 — mcp-readonly-scope.md §3–§4 的运行时实现。

职责：
  1. 冻结允许开放的 7 个只读/门禁工具名。
  2. 冻结明确禁止的工具名关键词。
  3. 提供 validate_tool_request() 在运行时拒绝越界调用。
  4. 提供 get_allowed_tools() 供 MCP 注册层获取安全工具列表。
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

ALLOWED_TOOLS: frozenset[str] = frozenset({
    "search_knowledge",
    "get_document",
    "get_citation_context",
    "list_indexed_sources",
    "route_query",
    "ground_query",
    "prepare_grounded_answer",
})

BLOCKED_KEYWORDS: frozenset[str] = frozenset({
    "create", "add", "update", "append", "delete", "move",
    "sync", "ingest", "reindex", "restore",
    "upsert", "patch", "purge",
    "write", "rebuild", "refresh_index", "clear",
    "rollback",
    "read_file", "read_path", "read_logs", "read_runtime_config",
    "list_dir", "glob_sources",
    "diary", "drawer",
})


@dataclass(frozen=True)
class ScopeCheckResult:
    """工具边界检查结果。"""

    allowed: bool
    tool_name: str
    reason: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "allowed": self.allowed,
            "tool_name": self.tool_name,
            "reason": self.reason,
        }


def validate_tool_request(tool_name: str) -> ScopeCheckResult:
    """
    检查请求的工具名是否在一期只读白名单内。

    规则（按优先级）：
      1. 在 ALLOWED_TOOLS 内 → 放行
      2. 名称完全匹配或包含 BLOCKED_KEYWORDS → 拒绝并说明原因
      3. 不在白名单内的未知工具 → 默认拒绝
    """
    if tool_name in ALLOWED_TOOLS:
        return ScopeCheckResult(
            allowed=True,
            tool_name=tool_name,
            reason="一期只读白名单工具",
        )

    lower = tool_name.lower()
    for keyword in BLOCKED_KEYWORDS:
        if keyword in lower:
            return ScopeCheckResult(
                allowed=False,
                tool_name=tool_name,
                reason=f"包含禁止关键词 '{keyword}'，属于 mcp-readonly-scope.md §4 明确禁止范围",
            )

    return ScopeCheckResult(
        allowed=False,
        tool_name=tool_name,
        reason="不在一期只读白名单中，默认拒绝（mcp-readonly-scope.md §2）",
    )


def get_allowed_tools() -> list[str]:
    """返回一期允许开放的工具名列表（排序后），用于 MCP 注册层。"""
    return sorted(ALLOWED_TOOLS)
