"""
search_knowledge — mcp-readonly-scope.md §3.1 只读检索工具。

在已建索引内按关键词或语义检索片段，返回命中摘要、来源路径、来源层级、相关度。
返回结果必须带最小来源信息：source_path、source_layer、snippet（§3.2 第 3 条）。
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

import chromadb

from mempalace.config import CHROMA_COLLECTION, SidecarPaths

DEFAULT_N_RESULTS = 5
MAX_N_RESULTS = 20
SNIPPET_MAX_CHARS = 500


@dataclass(frozen=True)
class SearchHit:
    """单条检索命中（mcp-readonly-scope.md §3.2 最小来源信息）。"""

    source_path: str
    source_layer: str
    snippet: str
    score: float
    wing: str
    room: str
    title: str
    section_heading: str
    source_id: str
    chunk_id: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _truncate_snippet(text: str) -> str:
    if len(text) <= SNIPPET_MAX_CHARS:
        return text
    return text[:SNIPPET_MAX_CHARS] + "…"


def search_knowledge(
    paths: SidecarPaths,
    *,
    query: str,
    n_results: int = DEFAULT_N_RESULTS,
    where: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    """
    在 Chroma 索引中检索，返回命中列表。

    每条命中包含 source_path、source_layer (authority_layer)、snippet，
    以及 score、wing、room 等辅助字段。
    """
    n_results = max(1, min(n_results, MAX_N_RESULTS))

    client = chromadb.PersistentClient(path=str(paths.chroma))

    try:
        collection = client.get_collection(name=CHROMA_COLLECTION)
    except Exception:
        return []

    if collection.count() == 0:
        return []

    n_results = min(n_results, collection.count())

    query_params: dict[str, Any] = {
        "query_texts": [query],
        "n_results": n_results,
        "include": ["documents", "metadatas", "distances"],
    }
    if where:
        query_params["where"] = where

    results = collection.query(**query_params)

    hits: list[dict[str, Any]] = []
    documents = results.get("documents") or [[]]
    metadatas = results.get("metadatas") or [[]]
    distances = results.get("distances") or [[]]

    for doc, meta, dist in zip(
        documents[0], metadatas[0], distances[0]
    ):
        hit = SearchHit(
            source_path=meta.get("source_path", ""),
            source_layer=meta.get("authority_layer", ""),
            snippet=_truncate_snippet(doc or ""),
            score=round(1.0 - float(dist), 4) if dist is not None else 0.0,
            wing=meta.get("wing", ""),
            room=meta.get("room", ""),
            title=meta.get("title", ""),
            section_heading=meta.get("section_heading", ""),
            source_id=meta.get("source_id", ""),
            chunk_id=meta.get("chunk_id", ""),
        )
        hits.append(hit.to_dict())

    return hits
