"""
scope 测试 — 验证 MCP 仅暴露 7 个只读/门禁工具，拒绝所有写入/运维/文件系统类能力。

测试依据：mcp-readonly-scope.md §3（白名单）和 §4（黑名单）。
"""

from __future__ import annotations

import pytest

from mempalace.scope import (
    ALLOWED_TOOLS,
    BLOCKED_KEYWORDS,
    get_allowed_tools,
    validate_tool_request,
)


class TestAllowedToolsWhitelist:
    """§3 白名单：精确 7 个只读/门禁工具。"""

    def test_exactly_seven_tools(self):
        assert len(ALLOWED_TOOLS) == 7

    def test_contains_search_knowledge(self):
        assert "search_knowledge" in ALLOWED_TOOLS

    def test_contains_get_document(self):
        assert "get_document" in ALLOWED_TOOLS

    def test_contains_get_citation_context(self):
        assert "get_citation_context" in ALLOWED_TOOLS

    def test_contains_list_indexed_sources(self):
        assert "list_indexed_sources" in ALLOWED_TOOLS

    def test_contains_route_query(self):
        assert "route_query" in ALLOWED_TOOLS

    def test_contains_ground_query(self):
        assert "ground_query" in ALLOWED_TOOLS

    def test_contains_prepare_grounded_answer(self):
        assert "prepare_grounded_answer" in ALLOWED_TOOLS

    def test_frozen(self):
        assert isinstance(ALLOWED_TOOLS, frozenset)


class TestGetAllowedTools:
    def test_returns_sorted_list(self):
        tools = get_allowed_tools()
        assert tools == sorted(tools)
        assert len(tools) == 7

    def test_matches_allowed_set(self):
        assert set(get_allowed_tools()) == ALLOWED_TOOLS


class TestValidateAllowedTools:
    """白名单内的工具必须放行。"""

    @pytest.mark.parametrize("tool", sorted(ALLOWED_TOOLS))
    def test_allowed_tool_passes(self, tool: str):
        result = validate_tool_request(tool)
        assert result.allowed is True
        assert result.tool_name == tool


class TestValidateWriteTools:
    """§4.1 写入与改写类必须拒绝。"""

    @pytest.mark.parametrize("tool", [
        "add_memory",
        "create_memory",
        "upsert_memory",
        "update_memory",
        "patch_memory",
        "move_memory",
        "delete_memory",
        "purge_memory",
    ])
    def test_memory_write_blocked(self, tool: str):
        result = validate_tool_request(tool)
        assert result.allowed is False

    @pytest.mark.parametrize("tool", [
        "append_diary",
        "create_diary_entry",
        "update_diary_entry",
    ])
    def test_diary_write_blocked(self, tool: str):
        result = validate_tool_request(tool)
        assert result.allowed is False

    @pytest.mark.parametrize("tool", [
        "add_drawer",
        "create_drawer",
        "rename_drawer",
        "move_drawer",
        "delete_drawer",
    ])
    def test_drawer_ops_blocked(self, tool: str):
        result = validate_tool_request(tool)
        assert result.allowed is False


class TestValidateIndexOpsTools:
    """§4.3 索引与运维控制类必须拒绝。"""

    @pytest.mark.parametrize("tool", [
        "ingest_path",
        "import_documents",
        "sync_sources",
        "reindex_all",
        "refresh_index",
        "rebuild_embeddings",
        "clear_index",
        "restore_backup",
        "rollback_index",
    ])
    def test_index_ops_blocked(self, tool: str):
        result = validate_tool_request(tool)
        assert result.allowed is False


class TestValidateFilesystemTools:
    """§4.4 通用文件系统读取类必须拒绝。"""

    @pytest.mark.parametrize("tool", [
        "list_dir",
        "glob_sources",
        "read_file",
        "read_path",
        "read_logs",
        "read_runtime_config",
    ])
    def test_filesystem_blocked(self, tool: str):
        result = validate_tool_request(tool)
        assert result.allowed is False


class TestValidateUnknownTools:
    """不在白名单中的未知工具默认拒绝。"""

    @pytest.mark.parametrize("tool", [
        "some_random_tool",
        "execute_query",
        "run_migration",
        "export_data",
        "send_notification",
    ])
    def test_unknown_tool_rejected(self, tool: str):
        result = validate_tool_request(tool)
        assert result.allowed is False
        assert "不在一期只读白名单中" in result.reason


class TestScopeCheckResultShape:
    def test_allowed_result_has_fields(self):
        result = validate_tool_request("search_knowledge")
        assert result.allowed is True
        assert result.tool_name == "search_knowledge"
        assert result.reason != ""

    def test_blocked_result_has_fields(self):
        result = validate_tool_request("reindex_all")
        assert result.allowed is False
        assert result.tool_name == "reindex_all"
        assert result.reason != ""

    def test_to_dict(self):
        result = validate_tool_request("read_file")
        d = result.to_dict()
        assert d["allowed"] is False
        assert d["tool_name"] == "read_file"
        assert "reason" in d


class TestBlockedKeywordsCoverage:
    """确保 BLOCKED_KEYWORDS 集合本身覆盖了 mcp-readonly-scope.md §2 提到的所有关键词。"""

    @pytest.mark.parametrize("keyword", [
        "create", "add", "update", "append", "delete", "move",
        "sync", "ingest", "reindex", "restore",
    ])
    def test_scope_md_section2_keywords_present(self, keyword: str):
        assert keyword in BLOCKED_KEYWORDS

    def test_read_file_in_blocked(self):
        assert "read_file" in BLOCKED_KEYWORDS

    def test_write_in_blocked(self):
        assert "write" in BLOCKED_KEYWORDS
