"""mcp_server 测试 — 暴露 route / ground 工具。"""

from __future__ import annotations

import importlib
import json
import sys
import types
from unittest.mock import patch


def _load_module():
    class FakeFastMCP:
        def __init__(self, *_args, **_kwargs):
            pass

        def tool(self):
            return lambda fn: fn

        def prompt(self):
            return lambda fn: fn

        def run(self, **_kwargs):
            return None

    mcp_mod = types.ModuleType("mcp")
    server_mod = types.ModuleType("mcp.server")
    fastmcp_mod = types.ModuleType("mcp.server.fastmcp")
    fastmcp_mod.FastMCP = FakeFastMCP

    with patch.dict(
        sys.modules,
        {
            "mcp": mcp_mod,
            "mcp.server": server_mod,
            "mcp.server.fastmcp": fastmcp_mod,
        },
    ):
        sys.modules.pop("mempalace.mcp_server", None)
        return importlib.import_module("mempalace.mcp_server")


def test_route_query_tool_returns_json():
    mod = _load_module()

    output = json.loads(mod.route_query("经营管理签 P1 范围"))

    assert output["intent"] == "biz-mgmt"
    assert output["preferred_wings"][0] == "gyoseishoshi-p1"


def test_ground_query_tool_returns_grounding_payload():
    mod = _load_module()

    fake_result = {
        "query": "P0 状态",
        "status": "blocked",
        "reason": "缺少权威引用",
        "route": {"intent": "state-machine"},
        "citations": [],
        "fallback_hits": [],
        "missing_authority_groups": [["p0-core-md"]],
    }

    with patch.object(mod, "_ground_query") as mock_ground:
        mock_ground.return_value.to_dict.return_value = fake_result
        output = json.loads(mod.ground_query("P0 状态"))

    assert output["status"] == "blocked"
    mock_ground.assert_called_once()


def test_prepare_grounded_answer_tool_returns_packet():
    mod = _load_module()

    fake_result = {
        "query": "P1 范围",
        "status": "grounded",
        "reason": "ok",
        "route": {"intent": "biz-mgmt"},
        "citation_bundles": [],
        "fallback_hits": [],
        "missing_authority_groups": [],
        "answer_rules": ["回答正文至少包含：结论、依据、引用、缺失项 四部分。"],
        "suggested_reply": "结论：{...}\n依据：\n- ...\n引用：\n- ...\n缺失项：{无}",
    }

    with patch.object(mod, "_prepare_grounded_answer") as mock_prepare:
        mock_prepare.return_value.to_dict.return_value = fake_result
        output = json.loads(mod.prepare_grounded_answer("P1 范围"))

    assert output["status"] == "grounded"
    assert "缺失项" in output["suggested_reply"]
    mock_prepare.assert_called_once()


def test_grounded_answer_protocol_prompt_mentions_prepare_and_blocked():
    mod = _load_module()

    prompt = mod.grounded_answer_protocol("P0 状态")

    assert "prepare_grounded_answer" in prompt
    assert "status=blocked" in prompt
    assert "缺失项" in prompt