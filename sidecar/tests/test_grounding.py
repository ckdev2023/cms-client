"""grounding 测试 — 查询路由、优先级与引用门禁。"""

from __future__ import annotations

from unittest.mock import patch

from mempalace.grounding import ground_query, prepare_grounded_answer, route_query
from mempalace.tools import CitationContext, DocumentChunk, SearchHit, SearchResult


def _hit(
    *,
    chunk_id: str,
    source_id: str,
    source_layer: str,
    wing: str,
    room: str,
    score: float,
    retrieval_weight: float,
    snippet: str = "snippet",
) -> SearchHit:
    return SearchHit(
        source_path=f"docs/{source_id}/{chunk_id}.md",
        source_layer=source_layer,
        snippet=snippet,
        chunk_id=chunk_id,
        title="title",
        section_heading="section",
        wing=wing,
        room=room,
        score=score,
        source_id=source_id,
        classification="C1-Direct-Allow",
        retrieval_weight=retrieval_weight,
    )


def test_route_query_for_biz_mgmt_prefers_p1_and_requires_authority():
    route = route_query("经营管理签 Step 1 属于 P1 的实现范围吗")

    assert route.intent == "biz-mgmt"
    assert route.preferred_wings[0] == "gyoseishoshi-p1"
    assert ["p1-core-md"] in route.required_authority_groups
    assert route.requires_product_anchor is True


def test_route_query_for_scenario_implementation_requires_dual_anchor():
    route = route_query("在留资格资料清单删除后产品里如何实现")

    assert route.intent == "scenario-materials"
    assert ["office-process-md", "office-process-scenarios"] in route.required_authority_groups
    assert ["p0-core-md", "p1-core-md"] in route.required_authority_groups


def test_ground_query_blocks_when_product_anchor_missing():
    scenario_hit = _hit(
        chunk_id="office-1",
        source_id="office-process-scenarios",
        source_layer="L1",
        wing="office-process",
        room="scenario-materials",
        score=0.99,
        retrieval_weight=0.88,
    )

    with patch("mempalace.grounding.search_knowledge") as mock_search:
        mock_search.return_value = SearchResult(query="q", hits=[scenario_hit], total=1)
        result = ground_query(client=object(), query="资料清单删除后产品里怎么实现")

    assert result.status == "blocked"
    assert ["p0-core-md", "p1-core-md"] in result.missing_authority_groups
    assert result.citations[0].source_id == "office-process-scenarios"


def test_ground_query_accepts_when_required_authority_groups_are_met():
    p1_hit = _hit(
        chunk_id="p1-1",
        source_id="p1-core-md",
        source_layer="L1",
        wing="gyoseishoshi-p1",
        room="biz-mgmt",
        score=0.90,
        retrieval_weight=0.98,
        snippet="P1 biz mgmt rule",
    )
    office_hit = _hit(
        chunk_id="office-1",
        source_id="office-process-md",
        source_layer="L1",
        wing="office-process",
        room="scenario-materials",
        score=0.86,
        retrieval_weight=0.90,
        snippet="office process",
    )

    with patch("mempalace.grounding.search_knowledge") as mock_search:
        mock_search.return_value = SearchResult(
            query="q",
            hits=[office_hit, p1_hit],
            total=2,
        )
        result = ground_query(client=object(), query="经营管理签资料清单如何落地到 P1")

    assert result.status == "grounded"
    assert result.citations[0].source_id == "office-process-md"
    assert {c.source_id for c in result.citations} >= {"office-process-md", "p1-core-md"}


def test_ground_query_reranks_required_authority_over_semantic_only_hit():
    nav_hit = _hit(
        chunk_id="nav-1",
        source_id="p0-navigation-md",
        source_layer="L1",
        wing="gyoseishoshi-p0",
        room="state-machine",
        score=0.99,
        retrieval_weight=0.70,
        snippet="导航文档",
    )
    core_hit = _hit(
        chunk_id="core-1",
        source_id="p0-core-md",
        source_layer="L1",
        wing="gyoseishoshi-p0",
        room="state-machine",
        score=0.82,
        retrieval_weight=1.0,
        snippet="权威正文",
    )

    with patch("mempalace.grounding.search_knowledge") as mock_search:
        mock_search.return_value = SearchResult(
            query="q",
            hits=[nav_hit, core_hit],
            total=2,
        )
        result = ground_query(client=object(), query="P0 状态阶段规则")

    assert result.status == "grounded"
    assert result.citations[0].source_id == "p0-core-md"


def test_prepare_grounded_answer_includes_citation_contexts():
    p1_hit = _hit(
        chunk_id="p1-1",
        source_id="p1-core-md",
        source_layer="L1",
        wing="gyoseishoshi-p1",
        room="biz-mgmt",
        score=0.90,
        retrieval_weight=0.98,
    )
    context = CitationContext(
        anchor_chunk_id="p1-1",
        source_path="docs/p1-core-md/p1-1.md",
        chunks=[
            DocumentChunk(
                chunk_id="p1-1",
                source_path="docs/p1-core-md/p1-1.md",
                source_layer="L1",
                title="title",
                section_heading="section",
                text="权威正文",
                chunk_index=0,
                total_chunks=1,
            )
        ],
    )

    with patch("mempalace.grounding.search_knowledge") as mock_search:
        with patch("mempalace.grounding.get_citation_context", return_value=context):
            mock_search.return_value = SearchResult(query="q", hits=[p1_hit], total=1)
            result = prepare_grounded_answer(client=object(), query="经营管理签 P1 范围")

    assert result.status == "grounded"
    assert result.citation_bundles[0].citation.source_id == "p1-core-md"
    assert result.citation_bundles[0].context.anchor_chunk_id == "p1-1"
    assert any("缺失项" in rule for rule in result.answer_rules)
    assert "根据当前已找到的权威引用" in result.suggested_reply
    assert "引用：" in result.suggested_reply
    assert "缺失项：" in result.suggested_reply
    assert "docs/p1-core-md/p1-1.md#section" in result.suggested_reply


def test_prepare_grounded_answer_returns_blocked_reply_template():
    scenario_hit = _hit(
        chunk_id="office-1",
        source_id="office-process-scenarios",
        source_layer="L1",
        wing="office-process",
        room="scenario-materials",
        score=0.99,
        retrieval_weight=0.88,
    )
    context = CitationContext(
        anchor_chunk_id="office-1",
        source_path="docs/office-process-scenarios/office-1.md",
        chunks=[],
    )

    with patch("mempalace.grounding.search_knowledge") as mock_search:
        with patch("mempalace.grounding.get_citation_context", return_value=context):
            mock_search.return_value = SearchResult(query="q", hits=[scenario_hit], total=1)
            result = prepare_grounded_answer(client=object(), query="资料清单删除后产品里怎么实现")

    assert result.status == "blocked"
    assert ["p0-core-md", "p1-core-md"] in result.missing_authority_groups
    assert "结论：这类问题我现在还不能直接下确定结论。" in result.suggested_reply
    assert "不能把现有片段当成最终规范" in result.suggested_reply
    assert "引用：" in result.suggested_reply
    assert "缺失项：" in result.suggested_reply
    assert "- p0-core-md / p1-core-md" in result.suggested_reply
    assert result.citation_bundles[0].citation.source_id == "office-process-scenarios"