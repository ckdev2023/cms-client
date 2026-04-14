"""查询路由与引用门禁。"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any

import chromadb

from mempalace.config import CHROMA_COLLECTION
from mempalace.taxonomy import classify_room
from mempalace.tools import (
    CitationContext,
    SearchHit,
    SearchResult,
    get_citation_context,
    search_knowledge,
)

_IMPLEMENTATION_TERMS = (
    "实现", "落地", "范围", "p0", "p1", "字段", "实体", "状态", "阶段", "门禁",
    "校验", "规则", "删除", "停用", "归档", "增删改查", "crud", "页面",
)
_SCENARIO_TERMS = (
    "资料", "材料", "清单", "场景", "在留資格", "在留资格", "签证类型",
)
_BIZ_MGMT_TERMS = ("经营管理签", "经管签", "biz-mgmt", "step ")
_PRODUCT_SOURCE_IDS = ("p0-core-md", "p1-core-md")
@dataclass(frozen=True)
class QueryRoute:
    query: str
    intent: str
    preferred_wings: list[str]
    preferred_rooms: list[str]
    required_authority_groups: list[list[str]]
    requires_product_anchor: bool
    notes: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
@dataclass(frozen=True)
class RankedCitation:
    chunk_id: str
    source_path: str
    source_layer: str
    source_id: str
    wing: str
    room: str
    classification: str
    retrieval_weight: float
    semantic_score: float
    rank_score: float
    section_heading: str
    snippet: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
@dataclass(frozen=True)
class GroundingResult:
    query: str
    status: str
    reason: str
    route: QueryRoute
    citations: list[RankedCitation] = field(default_factory=list)
    fallback_hits: list[RankedCitation] = field(default_factory=list)
    missing_authority_groups: list[list[str]] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "query": self.query,
            "status": self.status,
            "reason": self.reason,
            "route": self.route.to_dict(),
            "citations": [c.to_dict() for c in self.citations],
            "fallback_hits": [h.to_dict() for h in self.fallback_hits],
            "missing_authority_groups": self.missing_authority_groups,
        }
@dataclass(frozen=True)
class CitationBundle:
    citation: RankedCitation
    context: CitationContext

    def to_dict(self) -> dict[str, Any]:
        return {
            "citation": self.citation.to_dict(),
            "context": self.context.to_dict(),
        }
@dataclass(frozen=True)
class PreparedAnswer:
    query: str
    status: str
    reason: str
    route: QueryRoute
    citation_bundles: list[CitationBundle] = field(default_factory=list)
    fallback_hits: list[RankedCitation] = field(default_factory=list)
    missing_authority_groups: list[list[str]] = field(default_factory=list)
    answer_rules: list[str] = field(default_factory=list)
    suggested_reply: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "query": self.query,
            "status": self.status,
            "reason": self.reason,
            "route": self.route.to_dict(),
            "citation_bundles": [bundle.to_dict() for bundle in self.citation_bundles],
            "fallback_hits": [hit.to_dict() for hit in self.fallback_hits],
            "missing_authority_groups": self.missing_authority_groups,
            "answer_rules": self.answer_rules,
            "suggested_reply": self.suggested_reply,
        }
def route_query(query: str) -> QueryRoute:
    lowered = query.lower()
    requires_product_anchor = _contains_any(lowered, _IMPLEMENTATION_TERMS)
    explicit_p0 = "p0" in lowered
    explicit_p1 = "p1" in lowered
    has_scenario = _contains_any(lowered, _SCENARIO_TERMS)
    has_biz_mgmt = _contains_any(lowered, _BIZ_MGMT_TERMS)

    preferred_wings = _preferred_wings(
        explicit_p0=explicit_p0,
        explicit_p1=explicit_p1,
        has_scenario=has_scenario,
        has_biz_mgmt=has_biz_mgmt,
    )
    preferred_room = _preferred_room(query, preferred_wings, has_scenario, has_biz_mgmt)

    intent = preferred_room or ("biz-mgmt" if has_biz_mgmt else "general")
    product_group = _product_group(explicit_p0=explicit_p0, explicit_p1=explicit_p1)
    required_groups = _required_groups(
        intent=intent,
        has_scenario=has_scenario,
        has_biz_mgmt=has_biz_mgmt,
        requires_product_anchor=requires_product_anchor,
        product_group=product_group,
    )

    notes: list[str] = []
    if requires_product_anchor:
        notes.append("命中实现/范围类问题，必须至少引用一份 P0/P1 权威正文。")
    if has_scenario and requires_product_anchor:
        notes.append("资料场景与产品落地边界需要双锚点：事务所流程 + P0/P1。")
    if has_biz_mgmt:
        notes.append("经营管理签问题优先查 P1，再参考事务所流程，不可反向改写 P0。")

    return QueryRoute(
        query=query,
        intent=intent,
        preferred_wings=preferred_wings,
        preferred_rooms=[preferred_room] if preferred_room else [],
        required_authority_groups=required_groups,
        requires_product_anchor=requires_product_anchor,
        notes=notes,
    )


def ground_query(
    client: chromadb.ClientAPI,
    query: str,
    *,
    n_results: int = 5,
    collection_name: str = CHROMA_COLLECTION,
) -> GroundingResult:
    route = route_query(query)
    hits = _collect_hits(
        client,
        query,
        route,
        n_results=n_results,
        collection_name=collection_name,
    )
    ranked = _rank_hits(hits, route)
    missing_groups = _missing_authority_groups(ranked, route.required_authority_groups)

    if not ranked:
        return GroundingResult(
            query=query,
            status="blocked",
            reason="未检索到任何候选片段，禁止直接给出业务结论。",
            route=route,
            missing_authority_groups=route.required_authority_groups,
        )

    if missing_groups:
        return GroundingResult(
            query=query,
            status="blocked",
            reason="检索到了相关片段，但缺少满足门禁的权威引用。",
            route=route,
            citations=_select_citations(ranked, route, strict=False),
            fallback_hits=ranked[: min(5, len(ranked))],
            missing_authority_groups=missing_groups,
        )

    return GroundingResult(
        query=query,
        status="grounded",
        reason="已命中满足门禁的权威引用，可基于 citations 生成回答。",
        route=route,
        citations=_select_citations(ranked, route, strict=True),
        fallback_hits=ranked[: min(5, len(ranked))],
    )

def prepare_grounded_answer(
    client: chromadb.ClientAPI,
    query: str,
    *,
    n_results: int = 5,
    context_window: int = 1,
    collection_name: str = CHROMA_COLLECTION,
) -> PreparedAnswer:
    grounding = ground_query(
        client,
        query,
        n_results=n_results,
        collection_name=collection_name,
    )
    citation_bundles = _build_citation_bundles(
        client,
        grounding,
        context_window=context_window,
        collection_name=collection_name,
    )
    return PreparedAnswer(
        query=query,
        status=grounding.status,
        reason=grounding.reason,
        route=grounding.route,
        citation_bundles=citation_bundles,
        fallback_hits=grounding.fallback_hits,
        missing_authority_groups=grounding.missing_authority_groups,
        answer_rules=_answer_rules(grounding.status),
        suggested_reply=_suggested_reply(grounding),
    )

def _contains_any(text: str, terms: tuple[str, ...]) -> bool:
    return any(term in text for term in terms)

def _build_citation_bundles(
    client: chromadb.ClientAPI,
    grounding: GroundingResult,
    *,
    context_window: int,
    collection_name: str,
) -> list[CitationBundle]:
    selected = grounding.citations or grounding.fallback_hits[: min(2, len(grounding.fallback_hits))]
    bundles: list[CitationBundle] = []
    seen_chunk_ids: set[str] = set()
    for citation in selected:
        if citation.chunk_id in seen_chunk_ids:
            continue
        seen_chunk_ids.add(citation.chunk_id)
        context = get_citation_context(
            client,
            citation.chunk_id,
            context_window=context_window,
            collection_name=collection_name,
        )
        bundles.append(CitationBundle(citation=citation, context=context))
    return bundles

def _answer_rules(status: str) -> list[str]:
    if status != "grounded":
        return [
            "不得给出确定性的业务实现/范围/规则结论。",
            "必须明确说明未找到满足门禁的权威引用。",
            "若返回了缺失 authority groups，需原样说明缺少哪些权威来源。",
            "回答模板固定为：结论 / 依据 / 引用 / 缺失项。",
        ]
    return [
        "回答必须显式基于 citation_bundles 中的引用，不得跳过门禁结果自行发挥。",
        "回答正文至少包含：结论、依据、引用、缺失项 四部分。",
        "每条确定性结论都应能回链到 source_path 与 section_heading。",
        "超出引用覆盖范围的内容必须明确标记为未定义/待确认。",
    ]

def _suggested_reply(result: GroundingResult) -> str:
    if result.status == "grounded":
        refs = "\n".join(
            f"- {citation.source_path}#{citation.section_heading}"
            for citation in result.citations[:3]
        ) or "- 无可用引用"
        return (
            "结论：根据当前已找到的权威引用，可先回答为：{只填写能被引用直接支持的结论。}\n"
            "依据：\n"
            "- 以下内容仅根据已通过门禁的权威引用整理。\n"
            "- 引用没有覆盖到的边界，请直接写“未定义 / 待确认”。\n"
            f"引用：\n{refs}\n"
            "缺失项：{如当前引用已覆盖完整，写“无”；如仍有边界未覆盖，写“待确认：具体问题”。}"
        )
    missing = "\n".join(
        f"- {' / '.join(group)}" for group in result.missing_authority_groups
    ) or "- 无可用权威来源"
    refs = "\n".join(
        f"- {citation.source_path}#{citation.section_heading}"
        for citation in result.citations[:2]
    ) or "- 当前无可引用片段"
    return (
        "结论：这类问题我现在还不能直接下确定结论。\n"
        f"依据：\n- {result.reason}\n- 目前还没找到满足门禁要求的权威引用，因此不能把现有片段当成最终规范。\n"
        f"引用：\n{refs}\n"
        f"缺失项：\n{missing}"
    )


def _product_group(*, explicit_p0: bool, explicit_p1: bool) -> list[str]:
    if explicit_p0 and not explicit_p1:
        return ["p0-core-md"]
    if explicit_p1 and not explicit_p0:
        return ["p1-core-md"]
    return list(_PRODUCT_SOURCE_IDS)


def _preferred_wings(
    *,
    explicit_p0: bool,
    explicit_p1: bool,
    has_scenario: bool,
    has_biz_mgmt: bool,
) -> list[str]:
    wings: list[str] = []
    if explicit_p0:
        wings.append("gyoseishoshi-p0")
    if explicit_p1 or has_biz_mgmt:
        wings.append("gyoseishoshi-p1")
    if has_scenario:
        wings.append("office-process")
    if not wings:
        if has_biz_mgmt:
            wings = ["gyoseishoshi-p1", "office-process", "gyoseishoshi-p0"]
        elif has_scenario:
            wings = ["office-process", "gyoseishoshi-p1", "gyoseishoshi-p0"]
        else:
            wings = ["gyoseishoshi-p0", "gyoseishoshi-p1", "office-process"]
    return list(dict.fromkeys(wings))


def _preferred_room(
    query: str,
    preferred_wings: list[str],
    has_scenario: bool,
    has_biz_mgmt: bool,
) -> str | None:
    if has_scenario:
        return "scenario-materials"
    if has_biz_mgmt:
        return "biz-mgmt"
    for wing in preferred_wings:
        room = classify_room(
            wing=wing,
            source_path="adhoc/query",
            title=query,
            section_heading=query,
            text=query,
        )
        if room:
            return room
    return None


def _required_groups(
    *,
    intent: str,
    has_scenario: bool,
    has_biz_mgmt: bool,
    requires_product_anchor: bool,
    product_group: list[str],
) -> list[list[str]]:
    groups: list[list[str]] = []
    if has_scenario:
        groups.append(["office-process-md", "office-process-scenarios"])
    elif has_biz_mgmt and not requires_product_anchor:
        groups.append(["p1-core-md", "office-process-md", "office-process-scenarios"])

    if intent in {
        "state-machine",
        "field-ownership",
        "workflow-gates",
        "submission-audit",
        "biz-mgmt",
        "general",
    } or requires_product_anchor:
        groups.append(product_group)

    return groups or [product_group]


def _collect_hits(
    client: chromadb.ClientAPI,
    query: str,
    route: QueryRoute,
    *,
    n_results: int,
    collection_name: str,
) -> list[SearchHit]:
    dedup: dict[str, SearchHit] = {}
    phases = _search_phases(route)
    for wing_filter, room_filter in phases:
        result = search_knowledge(
            client,
            query,
            n_results=n_results,
            wing_filter=wing_filter,
            room_filter=room_filter,
            collection_name=collection_name,
        )
        for hit in result.hits:
            dedup.setdefault(hit.chunk_id, hit)
    return list(dedup.values())


def _search_phases(route: QueryRoute) -> list[tuple[str | None, str | None]]:
    phases: list[tuple[str | None, str | None]] = []
    for wing in route.preferred_wings:
        for room in route.preferred_rooms:
            phases.append((wing, room))
    for wing in route.preferred_wings:
        phases.append((wing, None))
    for room in route.preferred_rooms:
        phases.append((None, room))
    phases.append((None, None))
    return list(dict.fromkeys(phases))


def _rank_hits(hits: list[SearchHit], route: QueryRoute) -> list[RankedCitation]:
    ranked: list[RankedCitation] = []
    for hit in hits:
        wing_boost = _ordered_boost(hit.wing, route.preferred_wings, step=0.04)
        room_boost = 0.08 if hit.room in route.preferred_rooms else 0.0
        source_boost = 0.12 if any(
            hit.source_id in group for group in route.required_authority_groups
        ) else 0.0
        layer_boost = {"L1": 0.12, "L2": 0.05, "L3": 0.0}.get(hit.source_layer, 0.0)
        rank_score = (
            (hit.score * 0.55)
            + (hit.retrieval_weight * 0.25)
            + wing_boost
            + room_boost
            + source_boost
            + layer_boost
        )
        ranked.append(
            RankedCitation(
                chunk_id=hit.chunk_id,
                source_path=hit.source_path,
                source_layer=hit.source_layer,
                source_id=hit.source_id,
                wing=hit.wing,
                room=hit.room,
                classification=hit.classification,
                retrieval_weight=hit.retrieval_weight,
                semantic_score=hit.score,
                rank_score=round(rank_score, 4),
                section_heading=hit.section_heading,
                snippet=hit.snippet,
            )
        )
    ranked.sort(key=lambda item: item.rank_score, reverse=True)
    return ranked


def _ordered_boost(value: str, ordered_values: list[str], *, step: float) -> float:
    if value not in ordered_values:
        return 0.0
    return step * (len(ordered_values) - ordered_values.index(value))


def _missing_authority_groups(
    hits: list[RankedCitation],
    required_groups: list[list[str]],
) -> list[list[str]]:
    available = {hit.source_id for hit in hits if hit.source_layer == "L1"}
    return [group for group in required_groups if not any(sid in available for sid in group)]


def _select_citations(
    ranked: list[RankedCitation],
    route: QueryRoute,
    *,
    strict: bool,
) -> list[RankedCitation]:
    citations: list[RankedCitation] = []
    for group in route.required_authority_groups:
        for hit in ranked:
            if hit.source_id in group and hit not in citations:
                citations.append(hit)
                break

    if not strict:
        return citations[: min(3, len(citations))]

    for hit in ranked:
        if len(citations) >= 3:
            break
        if hit not in citations:
            citations.append(hit)
    return citations[: min(3, len(citations))]