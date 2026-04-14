#!/usr/bin/env python3
"""
首轮验收试跑 — acceptance-queries.md 28 条问题的真实检索测试。

对每条 AQ 执行 search_knowledge，记录命中、来源层级、snippet 摘要，
输出结构化 JSON 报告供人工判定。

用法:
  python scripts/acceptance_run.py > ../artifacts/mempalace/acceptance-run-report.json
"""

from __future__ import annotations

import json
import os
import sys
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

os.environ.setdefault("MEMPALACE_ROOT", str(Path.home() / ".mempalace" / "cms-client"))
os.environ.setdefault(
    "MEMPALACE_REPO_ROOT",
    str(Path(__file__).resolve().parent.parent.parent),
)

from mempalace.config import MANIFEST_PATH, SidecarPaths, resolve_paths
from mempalace.tools import (
    search_knowledge,
    get_document,
    get_citation_context,
    list_indexed_sources,
)

import chromadb

QUERIES: list[dict[str, str]] = [
    # --- 来源追溯类 (AQ-S01 ~ AQ-S08) ---
    {
        "id": "AQ-S01",
        "category": "来源追溯",
        "query": "P0 案件主阶段 S1-S9 唯一权威定义 来源优先级",
        "focus": "state-machine + 来源优先级",
        "success_signal": "明确以 P0 为首要来源，指出 _output 只能桥接、不能覆盖",
    },
    {
        "id": "AQ-S02",
        "category": "来源追溯",
        "query": "经营管理签 CaseWorkflowStep 来源位置 不能改写 S1-S9",
        "focus": "biz-mgmt 与 state-machine 分层",
        "success_signal": "同时回链 P1 与 P0，说明 P1 扩展、P0 底座",
    },
    {
        "id": "AQ-S03",
        "category": "来源追溯",
        "query": "经营管理签资料要求 事务所流程 P1 冲突 裁决顺序",
        "focus": "scenario-materials + 裁决顺序",
        "success_signal": "先用事务所流程回答资料场景，再说明何时回链到 P1 落地位置",
    },
    {
        "id": "AQ-S04",
        "category": "来源追溯",
        "query": "_output 状态机整理结论 P0 冻结规则 来源优先级",
        "focus": "_output 降级规则",
        "success_signal": "明确回答以 P0 为准，并把 _output 作为桥接来源",
    },
    {
        "id": "AQ-S05",
        "category": "来源追溯",
        "query": "P0 门禁工件 P0 正文 同时命中 最终规则解释 主次关系",
        "focus": "正文与工件的主次关系",
        "success_signal": "指出正文优先、工件只做结构化补充",
    },
    {
        "id": "AQ-S06",
        "category": "来源追溯",
        "query": "经营管理签认定 1年 需要哪些资料 wing room 归类",
        "focus": "office-process + scenario-materials 归类",
        "success_signal": "能回答 office-process/scenario-materials，并解释不是 P0 规则题",
    },
    {
        "id": "AQ-S07",
        "category": "来源追溯",
        "query": "发 COE 前阻断 P1 还是 P0 通用 Gate 专属 Gate",
        "focus": "通用 Gate 与专属 Gate 的裁决顺序",
        "success_signal": "明确这是 P1 专属验收问题，但仍需回链 P0 通用 Gate 底座",
    },
    {
        "id": "AQ-S08",
        "category": "来源追溯",
        "query": "结论只在 _raw 找到 L1 没有冻结定义 系统怎样回答",
        "focus": "_raw 只能作为线索",
        "success_signal": "明确输出待编译/待确认，不能伪装成既定规则",
    },
    # --- 规则解释类 (AQ-R01 ~ AQ-R12) ---
    {
        "id": "AQ-R01",
        "category": "规则解释",
        "query": "补正流程 案件主阶段 保持 S7 不回退 未提交 SubmissionPackage",
        "focus": "state-machine + submission-audit",
        "success_signal": "明确提到补正属于已提交案件中的新循环，并指出要生成新的 SubmissionPackage",
    },
    {
        "id": "AQ-R02",
        "category": "规则解释",
        "query": "Gate-A Gate-B Gate-C 触发时点 通过后产生结果",
        "focus": "workflow-gates",
        "success_signal": "能给出三个 Gate 的触发点和通过后动作",
    },
    {
        "id": "AQ-R03",
        "category": "规则解释",
        "query": "P0 欠款 风险提示 不默认阻断提交 收费策略",
        "focus": "P0 收费策略",
        "success_signal": "明确引用 P0 的 warn 口径，并说明阻断不是首版统一规则",
    },
    {
        "id": "AQ-R04",
        "category": "规则解释",
        "query": "经营管理签 COE_SENT 尾款未结清 硬阻断 BillingPlan gate_trigger_step",
        "focus": "P1 专属收费门禁",
        "success_signal": "能指出 BillingPlan.gate_trigger_step=COE_SENT 和 gate_effect_mode=block",
    },
    {
        "id": "AQ-R05",
        "category": "规则解释",
        "query": "source_type visa_type quote_amount 属于哪个对象 Lead Case 字段归属",
        "focus": "field-ownership",
        "success_signal": "能给出 Lead / Case 的正确归属，并明确常见错挂项",
    },
    {
        "id": "AQ-R06",
        "category": "规则解释",
        "query": "Case.group 案件归属快照 不跟随 Customer.group 实时变化",
        "focus": "归属继承链与审计要求",
        "success_signal": "明确默认继承 + 后续变更不回写历史案件 + 转组要留痕",
    },
    {
        "id": "AQ-R07",
        "category": "规则解释",
        "query": "资料项 附件版本 两层 不覆盖上传 资料模型不可变",
        "focus": "资料模型不可变规则",
        "success_signal": "能说明资料项是要求、附件是版本；新版本追加，不覆盖历史",
    },
    {
        "id": "AQ-R08",
        "category": "规则解释",
        "query": "提交后 不能覆盖旧提交 新建提交包 SubmissionPackage 锁定 快照",
        "focus": "submission-audit",
        "success_signal": "明确指出提交包锁定具体版本与字段快照，补正必须生成新包",
    },
    {
        "id": "AQ-R09",
        "category": "规则解释",
        "query": "waived 资料项 完成率分母剔除 记录原因 操作人",
        "focus": "资料项治理规则",
        "success_signal": "同时解释完成率口径与审计口径",
    },
    {
        "id": "AQ-R10",
        "category": "规则解释",
        "query": "正式提交 服务端重新校验 不能只信页面当前状态",
        "focus": "服务端重校验口径",
        "success_signal": "明确提到关键资料/字段/文书变更后必须重新校验",
    },
    {
        "id": "AQ-R11",
        "category": "规则解释",
        "query": "P0 不引入 Company 实体 工作类案件 雇主信息 Case.employer_* 字段",
        "focus": "P0 范围与字段承载边界",
        "success_signal": "能把 P0 建模策略和字段落点一起讲清楚",
    },
    {
        "id": "AQ-R12",
        "category": "规则解释",
        "query": "经营管理签 在留期间 续签提醒 P1 扩展 P0 默认链路 ResidencePeriod",
        "focus": "biz-mgmt + P0/P1 边界",
        "success_signal": "明确指出 P0 手动 Reminder 兜底、P1 才启用 ResidencePeriod + reminder_schedule_blueprint",
    },
    # --- 历史决策类 (AQ-H01 ~ AQ-H08) ---
    {
        "id": "AQ-H01",
        "category": "历史决策",
        "query": "P0 状态机口径已冻结 权威文档 编译产出 确认位置",
        "focus": "_output 到 L1 的回灌链",
        "success_signal": "同时给出 _output 条目和对应 P0/03、P0/04 权威落点",
    },
    {
        "id": "AQ-H02",
        "category": "历史决策",
        "query": "字段归属错挂 纠正 高风险字段 source_type visa_type 收费缓存",
        "focus": "字段纠偏历史",
        "success_signal": "至少说出 source_type、visa_type、收费缓存字段的纠偏结果和权威落点",
    },
    {
        "id": "AQ-H03",
        "category": "历史决策",
        "query": "四层资料模型 SubmissionPackage 不可覆盖 分析结论 回灌 权威文档",
        "focus": "文档编译与回灌能力",
        "success_signal": "能指出 _output 结论与 P0/03、P0/07 的对应关系",
    },
    {
        "id": "AQ-H04",
        "category": "历史决策",
        "query": "_output 不能长期充当最终权威来源 规则 仓库明确写过",
        "focus": "L2 的角色边界",
        "success_signal": "明确指出 _output 是可回灌结论层，稳定后应回灌到 L1",
    },
    {
        "id": "AQ-H05",
        "category": "历史决策",
        "query": "经营管理签 P1-A P1-B 分两阶段实施 决策依据 Step 1-14 15-20",
        "focus": "P1 历史规划收敛",
        "success_signal": "能说明 Step 1-14 先跑主链路，Step 15-20 后补收费/在留期间/提醒",
    },
    {
        "id": "AQ-H06",
        "category": "历史决策",
        "query": "补正不是独立主状态 权威规则 流程剧本 后续分析 冻结来源",
        "focus": "历史冻结来源辨别",
        "success_signal": "能区分最终权威落点与补充分析来源",
    },
    {
        "id": "AQ-H07",
        "category": "历史决策",
        "query": "经营管理签 成功结案前 录入在留期间 生成续签提醒 口径来源",
        "focus": "P1 成功结案前置条件",
        "success_signal": "明确指出来自 P1 扩展，不可误说成 P0 通用规则",
    },
    {
        "id": "AQ-H08",
        "category": "历史决策",
        "query": "首轮索引 先跑 L1 再考虑 _output _raw 顺序 治理理由",
        "focus": "索引基线与来源治理联动",
        "success_signal": "能把来源优先级、批次放行和低层来源降级规则串起来说明",
    },
]


@dataclass
class HitRecord:
    chunk_id: str
    source_path: str
    source_layer: str
    wing: str
    room: str
    score: float
    snippet_preview: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class QueryResult:
    query_id: str
    category: str
    focus: str
    success_signal: str
    search_query: str
    hit_count: int
    hits: list[HitRecord]
    layers_seen: list[str]
    wings_seen: list[str]
    rooms_seen: list[str]
    has_l1_hit: bool
    top_hit_source_path: str
    top_hit_score: float

    def to_dict(self) -> dict[str, Any]:
        return {
            "query_id": self.query_id,
            "category": self.category,
            "focus": self.focus,
            "success_signal": self.success_signal,
            "search_query": self.search_query,
            "hit_count": self.hit_count,
            "hits": [h.to_dict() for h in self.hits],
            "layers_seen": self.layers_seen,
            "wings_seen": self.wings_seen,
            "rooms_seen": self.rooms_seen,
            "has_l1_hit": self.has_l1_hit,
            "top_hit_source_path": self.top_hit_source_path,
            "top_hit_score": self.top_hit_score,
        }


def run_single_query(
    client: chromadb.ClientAPI, q: dict[str, str]
) -> QueryResult:
    result = search_knowledge(client, q["query"], n_results=10)
    hits: list[HitRecord] = []
    layers: set[str] = set()
    wings: set[str] = set()
    rooms: set[str] = set()

    for h in result.hits:
        rec = HitRecord(
            chunk_id=h.chunk_id,
            source_path=h.source_path,
            source_layer=h.source_layer,
            wing=h.wing,
            room=h.room,
            score=h.score,
            snippet_preview=h.snippet[:200],
        )
        hits.append(rec)
        if h.source_layer:
            layers.add(h.source_layer)
        if h.wing:
            wings.add(h.wing)
        if h.room:
            rooms.add(h.room)

    return QueryResult(
        query_id=q["id"],
        category=q["category"],
        focus=q["focus"],
        success_signal=q["success_signal"],
        search_query=q["query"],
        hit_count=result.total,
        hits=hits,
        layers_seen=sorted(layers),
        wings_seen=sorted(wings),
        rooms_seen=sorted(rooms),
        has_l1_hit="L1" in layers,
        top_hit_source_path=hits[0].source_path if hits else "",
        top_hit_score=hits[0].score if hits else 0.0,
    )


def main() -> None:
    paths = resolve_paths()
    client = chromadb.PersistentClient(path=str(paths.chroma))

    sources_result = list_indexed_sources(client, MANIFEST_PATH, paths.baselines)

    results: list[dict[str, Any]] = []
    summary = {"total": len(QUERIES), "has_l1": 0, "no_l1": 0, "by_category": {}}

    for q in QUERIES:
        qr = run_single_query(client, q)
        results.append(qr.to_dict())

        cat = q["category"]
        if cat not in summary["by_category"]:
            summary["by_category"][cat] = {"total": 0, "has_l1": 0}
        summary["by_category"][cat]["total"] += 1

        if qr.has_l1_hit:
            summary["has_l1"] += 1
            summary["by_category"][cat]["has_l1"] += 1
        else:
            summary["no_l1"] += 1

    report = {
        "report_type": "acceptance_queries_first_run",
        "run_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "manifest_version": sources_result.manifest_version,
        "total_indexed_sources": sources_result.total_sources,
        "summary": summary,
        "results": results,
    }

    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
