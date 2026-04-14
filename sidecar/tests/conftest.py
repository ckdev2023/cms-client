"""测试环境缺失 chromadb 时注入最小 fake 实现。"""

from __future__ import annotations

import re
import sys
import types
from types import SimpleNamespace


try:
    import chromadb  # type: ignore  # noqa: F401
except ModuleNotFoundError:
    _DB: dict[str, dict[str, dict[str, dict[str, object]]]] = {}

    def _tokens(text: str) -> set[str]:
        return set(re.findall(r"[A-Za-z0-9]+|[\u4e00-\u9fff]", text.lower()))

    def _score(query: str, doc: str) -> float:
        q = _tokens(query)
        d = _tokens(doc)
        if not q or not d:
            return 0.0
        return len(q & d) / len(q)

    def _match(meta: dict[str, object], where: dict[str, object] | None) -> bool:
        if not where:
            return True
        if "$and" in where:
            return all(_match(meta, cond) for cond in where["$and"])
        for key, cond in where.items():
            expected = cond.get("$eq") if isinstance(cond, dict) and "$eq" in cond else cond
            if meta.get(key) != expected:
                return False
        return True

    class FakeCollection:
        def __init__(self, store: dict[str, dict[str, object]], name: str):
            self._store = store
            self.name = name

        def add(self, ids, documents=None, metadatas=None, **_kwargs):
            self.upsert(ids=ids, documents=documents, metadatas=metadatas)

        def upsert(self, ids, documents=None, metadatas=None, **_kwargs):
            documents = documents or [""] * len(ids)
            metadatas = metadatas or [{} for _ in ids]
            for cid, doc, meta in zip(ids, documents, metadatas):
                self._store[cid] = {"id": cid, "document": doc, "metadata": dict(meta or {})}

        def count(self) -> int:
            return len(self._store)

        def get(self, ids=None, where=None, include=None):
            include = include or []
            wanted = set(ids if isinstance(ids, list) else ([ids] if ids else []))
            rows = []
            for cid, row in self._store.items():
                if wanted and cid not in wanted:
                    continue
                if not _match(row["metadata"], where):
                    continue
                rows.append(row)
            rows.sort(key=lambda r: (r["metadata"].get("chunk_index", 0), r["id"]))
            result = {"ids": [r["id"] for r in rows]}
            if "documents" in include:
                result["documents"] = [r["document"] for r in rows]
            if "metadatas" in include:
                result["metadatas"] = [r["metadata"] for r in rows]
            return result

        def query(self, query_texts, n_results, include=None, where=None, **_kwargs):
            include = include or []
            query = query_texts[0] if query_texts else ""
            rows = []
            for row in self._store.values():
                if not _match(row["metadata"], where):
                    continue
                s = _score(query, str(row["document"]))
                rows.append((s, row))
            rows.sort(key=lambda item: item[0], reverse=True)
            rows = rows[:n_results]
            result = {"ids": [[row["id"] for _, row in rows]]}
            if "documents" in include:
                result["documents"] = [[row["document"] for _, row in rows]]
            if "metadatas" in include:
                result["metadatas"] = [[row["metadata"] for _, row in rows]]
            if "distances" in include:
                result["distances"] = [[max(0.0, 1.0 - score) for score, _ in rows]]
            return result

    class FakeClient:
        def __init__(self, path: str):
            self._collections = _DB.setdefault(path, {})

        def get_or_create_collection(self, name: str):
            store = self._collections.setdefault(name, {})
            return FakeCollection(store, name)

        def get_collection(self, name: str):
            if name not in self._collections:
                raise KeyError(name)
            return FakeCollection(self._collections[name], name)

        def create_collection(self, name: str):
            if name in self._collections:
                raise ValueError(name)
            self._collections[name] = {}
            return FakeCollection(self._collections[name], name)

        def delete_collection(self, name: str):
            self._collections.pop(name, None)

        def list_collections(self):
            return [SimpleNamespace(name=name) for name in self._collections]

        def reset(self):
            self._collections.clear()

        def close(self):
            return None

        def clear_system_cache(self):
            return None

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

    fake = types.ModuleType("chromadb")
    fake.__version__ = "0.0-test"
    fake.PersistentClient = lambda path=None, **_kwargs: FakeClient(str(path or "memory"))
    fake.ClientAPI = FakeClient
    fake.Collection = FakeCollection
    sys.modules["chromadb"] = fake