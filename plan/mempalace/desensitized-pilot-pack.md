# MemPalace 小批量 C3 脱敏样本试点包

## 1. 目标

在 `Conditional Go` 复判通过、首轮稳定观察期完成后，为下一阶段"小批量脱敏样本试点"准备候选样本清单、人工复核流程和放行闸门。本文件本身不提供自动放行资格，只定义"准备就绪"的标准。

## 2. 前置条件（全部满足才可启动本包）

| 序号 | 条件 | 验证方式 | 当前状态 |
|------|------|---------|---------|
| PRE-1 | Go/No-Go 复判结论为 `Conditional Go` 或 `Go` | `go-no-go-review.md` §2.1 | `Conditional Go`（2026-04-12） |
| PRE-2 | 首轮稳定观察期（≥1 周）已完成，无 R1–R3 级故障 | `go-no-go-review.md` §7.3 | **待观察** |
| PRE-3 | L1 索引基线正常运行，健康检查通过 | `runbook.md` §12 健康检查 | 已就绪 |
| PRE-4 | 评估报告红线零违规 | `eval-report.md` §12 | 零违规（2026-04-12） |

不变量：PRE-2 未满足时，本包只能处于"准备中"状态，不得进入实际采集或索引。

## 3. 候选样本类型

以下候选类型来自 `blocked_sources.md` §4 和 `data_classification.md` §2 的 `C3-Desensitize-Candidate` 定义：

| 候选类型 ID | 候选类型 | 来源描述 | 脱敏难度 | 优先级 |
|------------|---------|---------|---------|-------|
| CT-01 | 教学案例样本 | 从真实案例改写为不可回推的教学案例，覆盖经营管理签申请/变更/续签典型场景 | 高 | P1 |
| CT-02 | 规则摘要 | 从正式材料中提炼的规则、例外和流程结论（不保留原文、原表格、原编号） | 中 | P0 |
| CT-03 | 聚合统计/模式总结 | 保留区间、比例、趋势，不保留单案粒度或可回推的小样本量数据 | 低 | P1 |
| CT-04 | 脱敏问答/复盘摘要 | 改写为"问题→结论→依据"格式，移除客户身份、案件编号、费用与时点细节 | 中 | P2 |

### 3.1 首批试点范围（最多 5 个样本）

首批试点仅从 CT-02（规则摘要）中选取最多 5 个样本，原因：

1. 规则摘要的脱敏难度最低，改写后不可逆性最容易验证。
2. 规则摘要与现有 L1 索引内容最接近，可直接对照验证检索质量变化。
3. 首批样本量控制在 5 个以内，便于逐条人工复核。

CT-01/CT-03/CT-04 留待首批试点完成并评估后再逐步引入。

## 4. 候选样本选取标准

每个 C3 候选样本必须同时满足 `data_classification.md` §4 的五项最小放行条件：

| 条件 ID | 条件描述 | 验证要点 |
|---------|---------|---------|
| MC-1 | 内容已改写为不可回推真实客户或真实案件 | 复核人逐段确认：无真实客户名、公司名、案件编号、具体申请场景可拼接出真实案件 |
| MC-2 | 直接标识符与可拼接线索均已删除或泛化 | 对照 `blocked_sources.md` §5 的五项最小脱敏原则，逐条检查 |
| MC-3 | 不附带原始截图、扫描件、表格、路径、编号或对照表 | 确认样本为纯文本，无嵌入图片、无文件路径引用、无原始编号 |
| MC-4 | 有人工复核记录，且复核人明确确认"不可逆、不可回推" | 复核记录存档于 `artifacts/mempalace/c3-review-log.json`，签名字段不为空 |
| MC-5 | 已获得后续任务单独放行 | 本包准备就绪 + 前置条件全部满足 + 复核通过 = 具备放行资格 |

## 5. 人工复核流程

### 5.1 角色

| 角色 | 职责 |
|------|------|
| 样本准备人 | 对原始内容执行脱敏改写，产出候选样本文本 |
| 复核人 | 独立审阅候选样本，逐条验证 MC-1 ~ MC-4，出具复核结论 |
| 放行审批人 | 确认前置条件 + 复核结论均通过后，在 review log 中签署放行 |

约束：样本准备人和复核人不得为同一人。

### 5.2 流程步骤

```text
S1. 样本准备人选取原始内容并执行脱敏改写
    → 产出候选样本 Markdown 文本
    → 在 c3-review-log.json 中创建记录（status: "pending_review"）

S2. 复核人独立审阅候选样本
    → 逐条检查 MC-1 ~ MC-4
    → 在 c3-review-log.json 中填写各条件的 pass/fail 及审阅备注
    → 设置 reviewer_verdict: "pass" | "fail" | "conditional"

S3. 若 reviewer_verdict = "fail"
    → 样本准备人根据 failure_notes 重新改写
    → 回到 S2 重新复核

S4. 若 reviewer_verdict = "pass" 或 "conditional"
    → 放行审批人确认前置条件（PRE-1 ~ PRE-4）全部满足
    → 在 c3-review-log.json 中签署 approver_decision: "approved" | "rejected"
    → status 更新为 "approved" 或 "rejected"

S5. 已 approved 的样本进入待索引队列
    → 按 ingestion-manifest.md 的扩展条目配置采集
    → 采集后执行增量索引并记录到 baselines/
```

### 5.3 复核检查清单

复核人在审阅每个样本时，必须逐项确认以下检查点：

| 检查项 | 对应条件 | 检查方法 |
|--------|---------|---------|
| 无真实姓名 | MC-1, MC-2 | 全文搜索人名模式 |
| 无真实公司名 | MC-1, MC-2 | 全文搜索公司名模式 |
| 无证件号 | MC-2 | 搜索数字模式（护照号、在留卡号格式） |
| 无联系方式 | MC-2 | 搜索电话/邮箱/地址模式 |
| 无精确日期 | MC-2 | 搜索日期模式，确认已泛化为"某年""某月"或区间 |
| 无具体金额 | MC-2 | 搜索货币/数字模式，确认已泛化为区间或比例 |
| 无原始附件 | MC-3 | 确认无图片嵌入、无文件路径引用 |
| 无对照表/映射表 | MC-3 | 确认无可逆映射信息 |
| 无可拼接线索 | MC-1, MC-2 | 综合判断：国家+签证类型+时间+金额组合是否可回推 |
| 整体不可逆判定 | MC-4 | 复核人签署"不可逆、不可回推"确认 |

## 6. 复核记录格式

复核记录存储于 `artifacts/mempalace/c3-review-log.json`，格式定义如下：

```json
{
  "log_version": "1.0.0",
  "pilot_pack_ref": "plan/mempalace/desensitized-pilot-pack.md",
  "reviews": [
    {
      "sample_id": "C3-SAMPLE-001",
      "candidate_type": "CT-02",
      "title": "样本标题/摘要",
      "source_description": "原始内容来源描述（不含真实标识符）",
      "sample_path": "artifacts/mempalace/c3-samples/C3-SAMPLE-001.md",
      "prepared_by": "准备人标识",
      "prepared_at": "2026-04-XX",
      "status": "pending_review",
      "checks": {
        "mc1_no_real_identity": null,
        "mc2_no_direct_identifiers": null,
        "mc2_no_joinable_clues": null,
        "mc3_no_original_attachments": null,
        "mc3_no_lookup_tables": null,
        "mc4_reviewer_confirmation": null
      },
      "reviewer": null,
      "reviewed_at": null,
      "reviewer_verdict": null,
      "reviewer_notes": null,
      "approver": null,
      "approved_at": null,
      "approver_decision": null,
      "approver_notes": null
    }
  ]
}
```

### 6.1 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `sample_id` | string | 唯一标识，格式 `C3-SAMPLE-NNN` |
| `candidate_type` | string | 对应 §3 候选类型 ID |
| `sample_path` | string | 脱敏后样本文件的仓库内相对路径 |
| `status` | enum | `pending_review` → `under_review` → `approved` / `rejected` / `needs_rework` |
| `checks.*` | boolean \| null | 每项检查 `true`=通过 / `false`=未通过 / `null`=未检查 |
| `reviewer_verdict` | enum \| null | `pass` / `fail` / `conditional` |
| `approver_decision` | enum \| null | `approved` / `rejected` |

## 7. 索引扩展配置

已 approved 的 C3 样本在进入索引时，需要在 `ingestion-manifest.md` 的 Source Entries 中新增条目：

| 字段 | 预设值 |
|------|-------|
| `source_id` | `c3-pilot-samples` |
| `phase1_mode` | `disabled_reserved`（获得放行后切换为 `enabled`） |
| `authority_layer` | `L1`（经脱敏和复核后的规则摘要等同于权威定义） |
| `classification` | `C3-Desensitize-Candidate`（放行前）→ `C2-Scoped-Allow`（放行后） |
| `include_globs` | `artifacts/mempalace/c3-samples/*.md` |
| `include_ext` | `.md` |
| `refresh_policy` | `manual_only` |
| `retrieval_weight` | `0.75` |
| `usage_rule` | 仅作为已脱敏规则摘要，不得超越 L1 正文口径 |

不变量：在所有前置条件满足且样本全部通过复核前，`phase1_mode` 保持 `disabled_reserved`。

## 8. 放行闸门

### 8.1 样本级放行

单个样本放行条件（全部满足才可标记 `approved`）：

1. MC-1 ~ MC-4 全部 `true`
2. `reviewer_verdict` = `pass`
3. `approver_decision` = `approved`

### 8.2 批次级放行

整批试点放行条件（全部满足才可将 `c3-pilot-samples` 切换为 `enabled`）：

1. PRE-1 ~ PRE-4 全部满足
2. 首轮稳定观察期已完成（≥1 周无 R1–R3 故障）
3. 本批所有样本均为 `approved` 状态
4. 本文件经审阅确认，无遗漏或矛盾

### 8.3 回退条件

出现以下任一情况，立即暂停试点并回退：

1. 任何已索引 C3 样本被发现仍可回推到真实客户或真实案件
2. C3 样本的检索结果出现 `go-no-go-review.md` §9 中的红线违规
3. C3 样本被错误地升格为 L1 权威正文、覆盖了 P0/P1 口径
4. 复核记录被篡改或缺失

## 9. 试点评估标准

首批 C3 样本索引后，需按以下维度评估效果：

| 评估维度 | 评估方法 | 最低通过线 |
|---------|---------|-----------|
| 检索质量 | 针对 C3 样本内容设计 3~5 条专项查询，验证命中率 | 至少 60% 有效命中 |
| 来源标注 | 确认检索结果正确标注为 C3 来源，不伪装为 C1/C2 | 100% 合规 |
| 无干扰 | 确认 C3 样本不干扰已有 L1 查询的 top-3 排序 | 现有必过题结果不退化 |
| 脱敏持久性 | 复查已索引 chunk 中无泄露的标识符或可拼接线索 | 零泄露 |

## 10. 与其他治理文档的关系

| 文档 | 关系 |
|------|------|
| `data_classification.md` | §4 五项最小放行条件是本包的硬门槛 |
| `blocked_sources.md` | §4 候选类型定义 + §5 最小脱敏原则是改写和复核的基准 |
| `go-no-go-review.md` | §3 第 1 项脱敏样本门槛 + §7.3 观察期要求是前置条件 |
| `ingestion-manifest.md` | §6 Source Entries 需新增 `c3-pilot-samples` 条目 |
| `source-priority.md` | C3 放行后的来源优先级遵守 L1 > L2 > L3 |
| `answer-protocol.md` | C3 样本的检索结果展示须遵守回答协议 |

## 11. 直接依据

- `plan/mempalace/data_classification.md`
- `plan/mempalace/blocked_sources.md`
- `plan/mempalace/go-no-go-review.md`
- `plan/mempalace/ingestion-manifest.md`
- `plan/mempalace/source-priority.md`
- `plan/mempalace/allowed_sources.md`
- `artifacts/mempalace/eval-report.md`
